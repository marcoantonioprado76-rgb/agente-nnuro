export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser, unauthorizedAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import { DEFAULT_TOKEN_PRICING, invalidateCostCache, type TokenPricing } from '@/lib/ai-credits'

/**
 * GET /api/admin/token-pricing  — devuelve las tarifas efectivas por modelo
 *                                 (defaults + overrides admin).
 * PUT /api/admin/token-pricing  — guarda overrides como JSON en AppSetting(
 *                                 'ai_model_token_pricing').
 *
 * Estructura del body PUT:
 *   { pricing: { 'gpt-4o': { input: 2.5, output: 10 }, ... } }
 *
 * Tarifas en USD por 1M tokens. Solo se aceptan números >= 0.
 */
export async function GET() {
    const admin = await getAdminUser()
    if (!admin) return unauthorizedAdmin()

    const setting = await (prisma as any).appSetting.findUnique({
        where: { key: 'ai_model_token_pricing' },
        select: { value: true, updatedAt: true },
    })

    let overrides: Record<string, TokenPricing> = {}
    if (setting?.value) {
        try {
            const parsed = JSON.parse(setting.value)
            if (parsed && typeof parsed === 'object') overrides = parsed
        } catch { /* ignore */ }
    }

    return NextResponse.json({
        defaults: DEFAULT_TOKEN_PRICING,
        overrides,
        effective: { ...DEFAULT_TOKEN_PRICING, ...overrides },
        updatedAt: setting?.updatedAt ?? null,
    })
}

export async function PUT(req: NextRequest) {
    const admin = await getAdminUser()
    if (!admin) return unauthorizedAdmin()

    let body: any
    try { body = await req.json() } catch { return NextResponse.json({ error: 'Body inválido' }, { status: 400 }) }

    const pricing = body?.pricing
    if (!pricing || typeof pricing !== 'object') {
        return NextResponse.json({ error: 'Se esperaba { pricing: { modelo: { input, output }, ... } }' }, { status: 400 })
    }

    // Validar y normalizar
    const validKeys = new Set(Object.keys(DEFAULT_TOKEN_PRICING))
    const clean: Record<string, TokenPricing> = {}
    for (const [key, raw] of Object.entries(pricing)) {
        if (!validKeys.has(key)) continue  // ignora keys desconocidas
        if (!raw || typeof raw !== 'object') continue
        const r = raw as any
        const input = Number(r.input)
        const output = Number(r.output)
        if (!Number.isFinite(input) || input < 0 || !Number.isFinite(output) || output < 0) continue
        clean[key] = {
            input: Math.round(input * 10000) / 10000,
            output: Math.round(output * 10000) / 10000,
        }
    }

    await (prisma as any).appSetting.upsert({
        where: { key: 'ai_model_token_pricing' },
        create: { key: 'ai_model_token_pricing', value: JSON.stringify(clean) },
        update: { value: JSON.stringify(clean) },
    })

    invalidateCostCache()

    await prisma.auditLog.create({
        data: {
            userId: admin.id,
            actorUserId: admin.id,
            action: 'AI_TOKEN_PRICING_UPDATED',
            entityType: 'AppSetting',
            entityId: 'ai_model_token_pricing',
            payload: { overrides: clean } as any,
        },
    })

    return NextResponse.json({
        success: true,
        overrides: clean,
        effective: { ...DEFAULT_TOKEN_PRICING, ...clean },
    })
}
