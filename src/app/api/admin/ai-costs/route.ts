export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser, unauthorizedAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import { DEFAULT_MODEL_COST_USD, invalidateCostCache } from '@/lib/ai-credits'

/**
 * GET /api/admin/ai-costs  — devuelve los costos efectivos por modelo (defaults + overrides admin).
 * PUT /api/admin/ai-costs  — guarda overrides del admin como JSON en AppSetting('ai_model_cost_usd').
 *
 * Sólo se permiten números >= 0 y modelos conocidos en DEFAULT_MODEL_COST_USD.
 */
export async function GET() {
    const admin = await getAdminUser()
    if (!admin) return unauthorizedAdmin()

    const setting = await (prisma as any).appSetting.findUnique({
        where: { key: 'ai_model_cost_usd' },
        select: { value: true, updatedAt: true },
    })

    let overrides: Record<string, number> = {}
    if (setting?.value) {
        try {
            const parsed = JSON.parse(setting.value)
            if (parsed && typeof parsed === 'object') overrides = parsed
        } catch { /* ignore */ }
    }

    return NextResponse.json({
        defaults: DEFAULT_MODEL_COST_USD,
        overrides,
        effective: { ...DEFAULT_MODEL_COST_USD, ...overrides },
        updatedAt: setting?.updatedAt ?? null,
    })
}

export async function PUT(req: NextRequest) {
    const admin = await getAdminUser()
    if (!admin) return unauthorizedAdmin()

    let body: any
    try { body = await req.json() } catch { return NextResponse.json({ error: 'Body inválido' }, { status: 400 }) }

    const costs = body?.costs
    if (!costs || typeof costs !== 'object') {
        return NextResponse.json({ error: 'Se esperaba { costs: { modelo: numero, ... } }' }, { status: 400 })
    }

    // Validar: cada valor debe ser un número >= 0 y la key debe estar en defaults
    const validKeys = new Set(Object.keys(DEFAULT_MODEL_COST_USD))
    const clean: Record<string, number> = {}
    for (const [key, raw] of Object.entries(costs)) {
        if (!validKeys.has(key)) continue   // ignora keys desconocidas
        const num = Number(raw)
        if (!Number.isFinite(num) || num < 0) continue
        // Redondeo a 4 decimales
        clean[key] = Math.round(num * 10000) / 10000
    }

    await (prisma as any).appSetting.upsert({
        where: { key: 'ai_model_cost_usd' },
        create: { key: 'ai_model_cost_usd', value: JSON.stringify(clean) },
        update: { value: JSON.stringify(clean) },
    })

    invalidateCostCache()

    await prisma.auditLog.create({
        data: {
            userId: admin.id,
            actorUserId: admin.id,
            action: 'AI_COSTS_UPDATED',
            entityType: 'AppSetting',
            entityId: 'ai_model_cost_usd',
            payload: { overrides: clean },
        },
    })

    return NextResponse.json({
        success: true,
        overrides: clean,
        effective: { ...DEFAULT_MODEL_COST_USD, ...clean },
    })
}
