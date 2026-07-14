export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/ads/encryption'

const ENCRYPTION_KEY = process.env.ADS_ENCRYPTION_KEY || ''
const META_API = 'https://graph.facebook.com/v21.0'

async function metaGet(path: string, token: string, params: Record<string, string> = {}) {
    const url = new URL(`${META_API}${path}`)
    url.searchParams.set('access_token', token)
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
    const res = await fetch(url.toString())
    return res.json()
}

export async function GET() {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const integration = await prisma.adIntegration.findUnique({
        where: { userId_platform: { userId: user.id, platform: 'META' } },
        include: { token: true }
    })

    if (!integration?.token) {
        return NextResponse.json({ error: 'Meta no conectado' }, { status: 400 })
    }

    const accessToken = decrypt(integration.token.accessTokenEncrypted, ENCRYPTION_KEY)
    const phoneNumbers: { id: string; displayPhone: string; name: string; status: string }[] = []
    const seenIds = new Set<string>()

    async function fetchPhonesForWaba(wabaId: string, wabaName: string) {
        const data = await metaGet(`/${wabaId}/phone_numbers`, accessToken, {
            fields: 'id,display_phone_number,verified_name,status'
        })
        console.log(`[WA-Numbers] Phones for WABA ${wabaId}:`, JSON.stringify(data?.data))
        for (const phone of (data.data || [])) {
            if (phone.display_phone_number && !seenIds.has(phone.id)) {
                seenIds.add(phone.id)
                phoneNumbers.push({
                    id: phone.id,
                    displayPhone: phone.display_phone_number,
                    name: phone.verified_name || wabaName || '',
                    status: phone.status || 'UNKNOWN'
                })
            }
        }
    }

    try {
        // Approach 1: direct /me/whatsapp_business_accounts
        const directWabas = await metaGet('/me/whatsapp_business_accounts', accessToken, { fields: 'id,name' })
        console.log(`[WA-Numbers] direct WABAs:`, JSON.stringify(directWabas?.data?.map((w: any) => w.id)))
        for (const waba of (directWabas.data || [])) {
            await fetchPhonesForWaba(waba.id, waba.name)
        }
    } catch (e) { console.warn('[WA-Numbers] direct WABAs failed', e) }

    if (phoneNumbers.length === 0) {
        try {
            // Approach 2: through businesses → owned + client WABAs
            const bizData = await metaGet('/me/businesses', accessToken, { fields: 'id,name' })
            console.log(`[WA-Numbers] businesses:`, JSON.stringify(bizData?.data?.map((b: any) => b.id)))

            for (const biz of (bizData.data || [])) {
                for (const edge of ['owned_whatsapp_business_accounts', 'client_whatsapp_business_accounts']) {
                    const wabaData = await metaGet(`/${biz.id}/${edge}`, accessToken, { fields: 'id,name' })
                    console.log(`[WA-Numbers] ${edge} for biz ${biz.id}:`, JSON.stringify(wabaData?.data?.map((w: any) => w.id)))
                    for (const waba of (wabaData.data || [])) {
                        await fetchPhonesForWaba(waba.id, waba.name)
                    }
                }
            }
        } catch (e) { console.warn('[WA-Numbers] biz approach failed', e) }
    }

    console.log(`[WA-Numbers] Total phone numbers found: ${phoneNumbers.length}`)
    return NextResponse.json({ phoneNumbers })
}
