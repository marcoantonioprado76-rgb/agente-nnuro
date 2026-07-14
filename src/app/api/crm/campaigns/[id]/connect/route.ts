export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { BaileysManager } from '@/lib/baileys-manager'
import { decrypt as decryptAds } from '@/lib/ads/encryption'

const ADS_ENC_KEY = process.env.ADS_ENCRYPTION_KEY || ''

async function getOpenAIKey(userId: string): Promise<string> {
    const oaiConfig = await (prisma as any).openAIConfig.findUnique({ where: { userId } })
    if (oaiConfig?.isValid && oaiConfig.apiKeyEnc) {
        try { return decryptAds(oaiConfig.apiKeyEnc, ADS_ENC_KEY) } catch {}
    }
    // Fallback 1: AppSetting('openai_global_key')
    const setting = await (prisma as any).appSetting.findUnique({ where: { key: 'openai_global_key' } })
    if (setting?.value) {
        try { return decryptAds(setting.value, ADS_ENC_KEY) } catch {}
    }
    // Fallback 2: AdminConfig.openaiKeyEnc (legacy del panel /admin/ai-credits)
    const adminCfg = await (prisma as any).adminConfig.findUnique({ where: { id: 'global' } })
    if (adminCfg?.openaiKeyEnc) {
        try { return decryptAds(adminCfg.openaiKeyEnc, ADS_ENC_KEY) } catch {}
    }
    return ''
}

/** GET — devuelve el estado de conexión del bot asignado a la campaña */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const campaign = await (prisma as any).broadcastCampaign.findFirst({
        where: { id: params.id, userId: user.id },
        select: { botId: true, bot: { select: { baileysPhone: true } } },
    })
    if (!campaign) return NextResponse.json({ error: 'Campaña no encontrada' }, { status: 404 })
    if (!campaign.botId) return NextResponse.json({ status: 'disconnected' })

    const status = BaileysManager.getStatus(campaign.botId)
    return NextResponse.json({
        status: status.status,
        qrBase64: status.qrBase64 ?? null,
        phone: status.phone ?? campaign.bot?.baileysPhone ?? null,
    })
}

/** POST — inicia la conexión Baileys del bot asignado a la campaña */
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const campaign = await (prisma as any).broadcastCampaign.findFirst({
        where: { id: params.id, userId: user.id },
        select: { botId: true, bot: { select: { id: true, name: true } } },
    })
    if (!campaign) return NextResponse.json({ error: 'Campaña no encontrada' }, { status: 404 })
    if (!campaign.botId) return NextResponse.json({ error: 'No hay bot asignado a esta campaña' }, { status: 400 })

    const openaiKey = await getOpenAIKey(user.id)

    BaileysManager.connect(
        campaign.botId,
        campaign.bot?.name ?? 'CRM Bot',
        openaiKey,
        '',
    ).catch(err => console.error('[CRM CONNECT]', err))

    return NextResponse.json({ ok: true })
}

/** PATCH — asigna un bot a la campaña y devuelve su estado actual */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { botId } = await req.json()
    if (!botId) return NextResponse.json({ error: 'botId requerido' }, { status: 400 })

    const campaign = await (prisma as any).broadcastCampaign.findFirst({
        where: { id: params.id, userId: user.id },
    })
    if (!campaign) return NextResponse.json({ error: 'Campaña no encontrada' }, { status: 404 })

    const bot = await prisma.bot.findFirst({
        where: { id: botId, userId: user.id, type: 'BAILEYS' },
        select: { id: true, name: true, baileysPhone: true },
    })
    if (!bot) return NextResponse.json({ error: 'Bot no encontrado' }, { status: 404 })

    await (prisma as any).broadcastCampaign.update({
        where: { id: params.id },
        data: { botId },
    })

    const status = BaileysManager.getStatus(botId)
    return NextResponse.json({
        status: status.status,
        qrBase64: status.qrBase64 ?? null,
        phone: status.phone ?? bot.baileysPhone ?? null,
    })
}
