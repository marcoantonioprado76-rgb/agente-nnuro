export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/ads/encryption'
import { generateFieldSuggestions } from '@/lib/ads/openai-ads'
import { resolveAdsKey, logAiUsage } from '@/lib/ai-credits'

const ENC_KEY = process.env.ADS_ENCRYPTION_KEY || ''

export async function POST(req: Request, { params }: { params: { id: string } }) {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const oaiConfig = await (prisma as any).openAIConfig.findUnique({ where: { userId: user.id } })
    const resolvedKey = await resolveAdsKey(user.id)
    if (!resolvedKey) {
        return NextResponse.json({ error: 'Configura tu OpenAI API Key en Configuración → IA, o compra créditos de IA.' }, { status: 400 })
    }
    const apiKey = resolvedKey.key
    const aiModel = oaiConfig?.model || 'gpt-4o'

    const campaign = await (prisma as any).adCampaignV2.findFirst({
        where: { id: params.id, userId: user.id },
        include: { brief: true, strategy: true }
    })
    if (!campaign) return NextResponse.json({ error: 'Campaña no encontrada' }, { status: 404 })

    const body = await req.json()
    const { field, slotIndex = 0, currentContent = '' } = body

    if (!['primaryText', 'headline', 'description', 'whatsappGreeting', 'quickReply'].includes(field)) {
        return NextResponse.json({ error: 'Campo inválido' }, { status: 400 })
    }

    try {
        const suggestions = await generateFieldSuggestions({
            brief: {
                name: campaign.brief.name,
                industry: campaign.brief.industry,
                description: campaign.brief.description,
                valueProposition: campaign.brief.valueProposition,
                painPoints: campaign.brief.painPoints,
                interests: campaign.brief.interests,
                brandVoice: campaign.brief.brandVoice,
                brandColors: campaign.brief.brandColors,
                visualStyle: campaign.brief.visualStyle,
                primaryObjective: campaign.brief.primaryObjective,
                mainCTA: campaign.brief.mainCTA,
                targetLocations: campaign.brief.targetLocations,
                keyMessages: campaign.brief.keyMessages,
                personalityTraits: campaign.brief.personalityTraits,
                contentThemes: campaign.brief.contentThemes,
                engagementLevel: campaign.brief.engagementLevel || 'medio'
            },
            field,
            slotIndex,
            platform: campaign.platform,
            destination: campaign.destination ?? campaign.strategy?.destination,
            currentContent,
            apiKey,
            model: aiModel,
            onUsage: (p, c) => { if (resolvedKey.isGlobal) logAiUsage({ userId: user.id, service: 'ads-field', model: aiModel, promptTokens: p, completionTokens: c }).catch(() => {}) },
        })

        return NextResponse.json({ suggestions })
    } catch (err: any) {
        console.error('[SuggestField]', err)
        return NextResponse.json({ error: err.message || 'Error al generar sugerencias' }, { status: 500 })
    }
}
