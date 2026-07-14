export const dynamic = 'force-dynamic'
export const maxDuration = 120 // gpt-5.1 razona antes de responder → puede tardar más
import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/ads/encryption'
import { generateBusinessBrief } from '@/lib/ads/openai-ads'
import { AD_CATEGORIES } from '@/lib/ads/ad-categories'
import { resolveAdsKey, logAiUsage } from '@/lib/ai-credits'

const ENC_KEY = process.env.ADS_ENCRYPTION_KEY
if (!ENC_KEY) throw new Error('ADS_ENCRYPTION_KEY env var is not set')

export async function POST(req: Request) {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const oaiConfig = await (prisma as any).openAIConfig.findUnique({ where: { userId: user.id } })
        const resolvedKey = await resolveAdsKey(user.id)
        if (!resolvedKey) {
            return NextResponse.json({ error: 'Configura tu OpenAI API Key en Configuración → IA, o compra créditos de IA.' }, { status: 400 })
        }
        const apiKey = resolvedKey.key
        const aiModel = 'gpt-5.1' // el brief se genera con gpt-5.1 (sin límite de tokens)
        void oaiConfig

        const { text } = await req.json()
        if (!text || text.trim().length < 20) {
            return NextResponse.json({ error: 'Describe tu negocio con al menos 20 caracteres' }, { status: 400 })
        }

        // La IA DETECTA la categoría de la lista completa (fallback robusto a 'otro').
        const brief = await generateBusinessBrief(text.trim(), apiKey, aiModel,
            (p, c) => { if (resolvedKey.isGlobal) logAiUsage({ userId: user.id, service: 'ads-brief', model: aiModel, promptTokens: p, completionTokens: c }).catch(() => {}) },
            AD_CATEGORIES.map(c => ({ id: c.id, label: c.label, extraFields: c.extraFields })))
        return NextResponse.json({ brief })
    } catch (err: any) {
        console.error('[GenerateBrief]', err)
        return NextResponse.json({ error: err.message || 'Error al generar el brief' }, { status: 500 })
    }
}
