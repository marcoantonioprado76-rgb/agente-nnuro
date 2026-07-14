export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/ads/encryption'
import { AdapterFactory } from '@/lib/ads/factory'

const ENC_KEY = process.env.ADS_ENCRYPTION_KEY
if (!ENC_KEY) throw new Error('ADS_ENCRYPTION_KEY env var is not set')

export async function GET(req: Request) {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const campaignId = searchParams.get('campaignId')
    const daysParam = searchParams.get('days') || '7'
    const days = Math.min(Math.max(parseInt(daysParam) || 7, 1), 90)

    const to = new Date()
    const from = new Date()
    from.setDate(from.getDate() - days)

    const campaigns = await (prisma as any).adCampaignV2.findMany({
        where: {
            userId: user.id,
            status: { in: ['PUBLISHED', 'PAUSED'] },
            providerCampaignId: { not: null },
            ...(campaignId ? { id: campaignId } : {})
        },
        include: {
            connectedAccount: {
                include: { integration: { include: { token: true } } }
            }
        }
    })

    if (campaigns.length === 0) {
        return NextResponse.json({ rows: [], totals: [], campaigns: [] })
    }

    const byAccount = new Map<string, any[]>()
    for (const c of campaigns) {
        if (!c.connectedAccount?.integration?.token) continue
        const key = c.connectedAccount.providerAccountId
        if (!byAccount.has(key)) byAccount.set(key, [])
        byAccount.get(key)!.push(c)
    }

    // Cuentas en PARALELO (antes era secuencial → lento con varias cuentas) y con
    // timeout por cuenta: si la API de Meta se cuelga, esa cuenta devuelve [] y no traba todo.
    const withTimeout = <T,>(p: Promise<T>, ms: number, fallback: T): Promise<T> =>
        Promise.race([p, new Promise<T>(res => setTimeout(() => res(fallback), ms))])

    const perAccount = await Promise.all(Array.from(byAccount).map(async ([adAccountId, group]) => {
        const rep = group[0]
        const out: any[] = []
        try {
            const accessToken = decrypt(rep.connectedAccount.integration.token.accessTokenEncrypted, ENC_KEY!)
            const adapter = AdapterFactory.getAdapter(rep.platform)
            const rows = await withTimeout(adapter.fetchDailyMetrics(accessToken, adAccountId, from, to), 20_000, [] as any[])

            const campaignIdSet = new Set(group.map((c: any) => c.providerCampaignId))
            const campaignMap: Record<string, any> = Object.fromEntries(group.map((c: any) => [c.providerCampaignId, c]))

            for (const row of rows) {
                if (!campaignIdSet.has(row.providerCampaignId)) continue
                const camp = campaignMap[row.providerCampaignId]
                const lc = row.linkClicks ?? row.clicks
                out.push({
                    ...row,
                    date: row.date instanceof Date ? row.date.toISOString().split('T')[0] : row.date,
                    campaignId: camp?.id,
                    campaignName: camp?.name,
                    ctr: row.impressions > 0 ? ((lc / row.impressions) * 100).toFixed(2) : '0.00',
                    cpc: lc > 0 ? (row.spend / lc).toFixed(2) : '0.00',
                    cpm: row.impressions > 0 ? ((row.spend / row.impressions) * 1000).toFixed(2) : '0.00',
                    cpa: row.conversions > 0 ? (row.spend / row.conversions).toFixed(2) : null,
                    cpConversation: row.conversations > 0 ? (row.spend / row.conversations).toFixed(2) : null,
                })
            }
        } catch (err: any) {
            console.error('[Metrics] Error for account', adAccountId, err.message)
        }
        return out
    }))
    const allRows: any[] = perAccount.flat()

    const ZERO_TOTALS = {
        spend: 0, impressions: 0, clicks: 0, linkClicks: 0, reach: 0,
        conversions: 0, purchases: 0, leads: 0, addToCart: 0, viewContent: 0,
        initiateCheckout: 0, conversations: 0, messagingReplies: 0,
        postEngagement: 0, videoViews: 0, landingPageViews: 0,
    }

    const totalsMap = new Map<string, any>()
    for (const row of allRows) {
        const key = row.campaignId
        if (!totalsMap.has(key)) {
            totalsMap.set(key, { campaignId: row.campaignId, campaignName: row.campaignName, ...ZERO_TOTALS })
        }
        const t = totalsMap.get(key)!
        t.spend              += row.spend
        t.impressions        += row.impressions
        t.clicks             += row.clicks
        t.linkClicks         += (row.linkClicks         ?? row.clicks)
        t.reach              += (row.reach              ?? 0)
        t.conversions        += (row.conversions        ?? 0)
        t.purchases          += (row.purchases          ?? 0)
        t.leads              += (row.leads              ?? 0)
        t.addToCart          += (row.addToCart          ?? 0)
        t.viewContent        += (row.viewContent        ?? 0)
        t.initiateCheckout   += (row.initiateCheckout   ?? 0)
        t.conversations      += (row.conversations      ?? 0)
        t.messagingReplies   += (row.messagingReplies   ?? 0)
        t.postEngagement     += (row.postEngagement     ?? 0)
        t.videoViews         += (row.videoViews         ?? 0)
        t.landingPageViews   += (row.landingPageViews   ?? 0)
    }

    const totals = Array.from(totalsMap.values()).map(t => ({
        ...t,
        spend: t.spend.toFixed(2),
        ctr:  t.impressions > 0 ? ((t.linkClicks / t.impressions) * 100).toFixed(2) : '0.00',
        cpc:  t.linkClicks  > 0 ? (t.spend / t.linkClicks).toFixed(2)               : '0.00',
        cpm:  t.impressions > 0 ? ((t.spend / t.impressions) * 1000).toFixed(2)     : '0.00',
        cpa:  t.conversions > 0 ? (t.spend / t.conversions).toFixed(2)              : null,
        cpConversation: t.conversations > 0 ? (t.spend / t.conversations).toFixed(2) : null,
    }))

    // Only surface campaigns that actually had a valid token (others have no data)
    const campaignsWithToken = campaigns.filter((c: any) => c.connectedAccount?.integration?.token)
    return NextResponse.json({
        rows: allRows.sort((a, b) => (a.date > b.date ? -1 : 1)),
        totals,
        campaigns: campaignsWithToken.map((c: any) => ({ id: c.id, name: c.name, status: c.status }))
    })
}
