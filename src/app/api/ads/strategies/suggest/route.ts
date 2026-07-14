export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/ads/encryption'

const ENC_KEY = process.env.ADS_ENCRYPTION_KEY
if (!ENC_KEY) throw new Error('ADS_ENCRYPTION_KEY env var is not set')

import { generateStrategySuggestions } from '@/lib/ads/openai-ads'
import { resolveAdsKey, logAiUsage } from '@/lib/ai-credits'

export async function POST(req: NextRequest) {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    try {
        const body = await req.json()
        const { briefId, platform, objective, destination, mediaType } = body
        if (!briefId) return NextResponse.json({ error: 'briefId requerido' }, { status: 400 })

        // Fetch brief
        const brief = await (prisma as any).businessBrief.findFirst({
            where: { id: briefId, userId: user.id }
        })
        if (!brief) return NextResponse.json({ error: 'Brief no encontrado' }, { status: 404 })

        // Leer los campos NUEVOS (category + ai_data) con SQL crudo y fusionarlos al brief,
        // así la estrategia usa TODO el brief (benefits, positioning, transformation, etc.).
        // Con guarda: si las columnas aún no existen, sigue con el brief viejo.
        try {
            const rows: any[] = await prisma.$queryRawUnsafe(
                'SELECT category, ai_data FROM business_briefs WHERE id = $1::uuid LIMIT 1', briefId,
            )
            if (rows?.[0]) {
                if (rows[0].category) brief.category = rows[0].category
                let ai = rows[0].ai_data
                if (typeof ai === 'string') { try { ai = JSON.parse(ai) } catch { ai = null } }
                if (ai && typeof ai === 'object' && !Array.isArray(ai)) Object.assign(brief, ai)
            }
        } catch (e) {
            console.warn('[suggest] no se pudo leer ai_data:', e instanceof Error ? e.message : e)
        }

        // Key propia (Configuración → IA) o la global del sistema si hay saldo
        const openaiConfig = await (prisma as any).openAIConfig.findUnique({ where: { userId: user.id } })
        const resolvedKey = await resolveAdsKey(user.id)
        if (!resolvedKey) {
            return NextResponse.json({ error: 'Configura tu API key de OpenAI en Configuración → IA, o compra créditos de IA.' }, { status: 400 })
        }
        const apiKey = resolvedKey.key
        const aiModel = openaiConfig?.model || 'gpt-5.1'

        // Generate AI suggestions using the configured model
        const suggestions = await generateStrategySuggestions(
            brief, apiKey, aiModel, platform, objective, destination, mediaType,
            (p, c) => { if (resolvedKey.isGlobal) logAiUsage({ userId: user.id, service: 'ads-strategies', model: aiModel, promptTokens: p, completionTokens: c }).catch(() => {}) },
        )

        // Delete old AI suggestions that are NOT referenced by any campaign AND not saved by user
        const usedStrategyIds = (await (prisma as any).adCampaignV2.findMany({
            where: { userId: user.id },
            select: { strategyId: true }
        })).map((c: any) => c.strategyId).filter(Boolean)

        await (prisma as any).adStrategy.deleteMany({
            where: {
                userId: user.id,
                briefId,
                isGlobal: false,
                savedByUser: false,
                ...(usedStrategyIds.length > 0 ? { id: { notIn: usedStrategyIds } } : {})
            }
        })

        // Enforce platform + valid destinations — override any AI hallucination
        const validPlatforms = ['META', 'TIKTOK', 'GOOGLE_ADS']
        const validDestinations: Record<string, string[]> = {
            META: ['whatsapp', 'instagram', 'website', 'messenger'],
            TIKTOK: ['tiktok', 'website'],
            GOOGLE_ADS: ['website'],
        }
        // Valid objectives per platform
        const validObjectives: Record<string, string[]> = {
            META: ['conversions', 'leads', 'traffic', 'awareness', 'engagement'],
            TIKTOK: ['conversions', 'leads', 'traffic', 'awareness', 'engagement'],
            GOOGLE_ADS: ['conversions', 'leads', 'traffic', 'awareness'],
        }
        // For META: engagement is only valid with messaging destinations
        const filteredSuggestions = platform && validPlatforms.includes(platform)
            ? suggestions
                .filter(s => !validObjectives[platform] || validObjectives[platform].includes(s.objective))
                .map(s => {
                    const allowedDests = validDestinations[platform]
                    let destination = allowedDests.includes(s.destination) ? s.destination : allowedDests[0]
                    // META: engagement requires messaging destination
                    if (platform === 'META' && s.objective === 'engagement' && !['whatsapp', 'messenger', 'instagram'].includes(destination)) {
                        destination = 'whatsapp'
                    }
                    // META: non-engagement objectives with messaging destination stay (adapter handles it as OUTCOME_ENGAGEMENT)
                    return { ...s, platform: platform as 'META' | 'TIKTOK' | 'GOOGLE_ADS', destination }
                })
            : suggestions

        // Save each suggestion to DB (so they have IDs for the existing campaign flow)
        const saved = []
        for (let i = 0; i < filteredSuggestions.length; i++) {
            const s = filteredSuggestions[i]
            const created = await (prisma as any).adStrategy.create({
                data: {
                    name: s.name,
                    // Encode reason inside description with separator — parsed on frontend
                    description: `${s.description}||REASON:${s.reason}`,
                    platform: s.platform,
                    objective: s.objective,
                    destination: s.destination,
                    mediaType: s.mediaType,
                    mediaCount: s.mediaCount,
                    minBudgetUSD: s.minBudgetUSD,
                    advantageType: s.advantageType,
                    isGlobal: false,
                    userId: user.id,
                    briefId,
                    sortOrder: i,
                    isActive: true,
                }
            })
            saved.push({ ...created, description: s.description, reason: s.reason })
        }

        return NextResponse.json({ strategies: saved })
    } catch (err: any) {
        console.error('[StrategySuggest]', err)
        const message = err?.message || 'Error al generar estrategias con IA'
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
