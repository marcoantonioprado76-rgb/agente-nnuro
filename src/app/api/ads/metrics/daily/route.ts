export const dynamic = 'force-dynamic'
/**
 * GET /api/ads/metrics/daily
 * Returns daily breakdown for published campaigns (Meta Graph API).
 * Query params:
 *   campaignIds=id1,id2  — filter by DB campaign IDs (optional, defaults to all published)
 *   period=7d|14d|30d   — date range (default: 30d)
 */
import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/ads/encryption'
import { AdPlatform } from '@prisma/client'

const ENCRYPTION_KEY = process.env.ADS_ENCRYPTION_KEY!
const META_API = 'https://graph.facebook.com/v22.0'

const PERIOD_MAP: Record<string, string> = {
    '7d':  'last_7d',
    '14d': 'last_14d',
    '30d': 'last_30d',
}

export async function GET(req: Request) {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const campaignIdsParam = searchParams.get('campaignIds')
    const period = searchParams.get('period') || '30d'
    const datePreset = PERIOD_MAP[period] || 'last_30d'

    const where: any = {
        userId: user.id,
        status: 'PUBLISHED',
        providerCampaignId: { not: null }
    }
    if (campaignIdsParam) {
        const ids = campaignIdsParam.split(',').filter(Boolean)
        if (ids.length > 0) where.id = { in: ids }
    }

    const campaigns = await (prisma as any).adCampaignV2.findMany({
        where,
        select: { id: true, name: true, platform: true, providerCampaignId: true }
    })

    if (campaigns.length === 0) return NextResponse.json({ daily: [], campaigns: [] })

    const metaCampaigns = campaigns.filter((c: any) => c.platform === AdPlatform.META)
    if (metaCampaigns.length === 0) return NextResponse.json({ daily: [], campaigns: [] })

    const integration = await prisma.adIntegration.findUnique({
        where: { userId_platform: { userId: user.id, platform: AdPlatform.META } },
        include: { token: true }
    })
    if (!integration?.token?.accessTokenEncrypted) {
        return NextResponse.json({ daily: [], campaigns: [] })
    }

    const accessToken = decrypt(integration.token.accessTokenEncrypted, ENCRYPTION_KEY)

    // Aggregate daily data across all campaigns
    const dayMap: Record<string, { date: string; impressions: number; clicks: number; spend: number; reach: number; conversations: number }> = {}

    await Promise.allSettled(metaCampaigns.map(async (c: any) => {
        const fields = 'impressions,clicks,spend,reach,actions'
        const url = `${META_API}/${c.providerCampaignId}/insights?fields=${fields}&date_preset=${datePreset}&time_increment=1&access_token=${accessToken}`
        const res = await fetch(url, { signal: AbortSignal.timeout(10_000) })
        const data = await res.json()
        if (!res.ok || data.error || !data.data) return

        for (const row of data.data) {
            const date: string = row.date_start
            if (!dayMap[date]) {
                dayMap[date] = { date, impressions: 0, clicks: 0, spend: 0, reach: 0, conversations: 0 }
            }
            dayMap[date].impressions += parseInt(row.impressions || '0')
            dayMap[date].clicks     += parseInt(row.clicks || '0')
            dayMap[date].spend      += parseFloat(row.spend || '0')
            dayMap[date].reach      += parseInt(row.reach || '0')

            // Count WhatsApp conversations started
            const convoAction = (row.actions || []).find((a: any) =>
                a.action_type === 'onsite_conversion.messaging_conversation_started_7d' ||
                a.action_type === 'onsite_conversion.messaging_first_reply' ||
                a.action_type === 'onsite_conversion.total_messaging_connection'
            )
            if (convoAction) dayMap[date].conversations += parseInt(convoAction.value || '0')
        }
    }))

    // Sort by date asc
    const daily = Object.values(dayMap).sort((a, b) => a.date.localeCompare(b.date))

    // Round spend to 2 decimals
    for (const d of daily) d.spend = Math.round(d.spend * 100) / 100

    // Always return ALL published campaigns for the selector UI, regardless of filter
    const allCampaigns = await (prisma as any).adCampaignV2.findMany({
        where: { userId: user.id, status: 'PUBLISHED', providerCampaignId: { not: null } },
        select: { id: true, name: true }
    })

    return NextResponse.json({
        daily,
        campaigns: allCampaigns.map((c: any) => ({ id: c.id, name: c.name }))
    })
}
