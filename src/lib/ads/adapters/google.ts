import { AdPlatform } from '@prisma/client'
import { IAdsAdapter, AdAccount, CampaignDraftPayload, PublishResult, MetricRow } from '../types'

const GOOGLE_API_BASE = 'https://googleads.googleapis.com/v18'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'

// Google Ads geo target constant IDs for countries (canonical resource IDs)
const COUNTRY_TO_GOOGLE_GEO_ID: Record<string, number> = {
    US: 2840, CA: 2124, MX: 2484, CO: 2170, AR: 2032,
    PE: 2604, CL: 2152, VE: 2862, EC: 2218, BO: 2068,
    PY: 2600, UY: 2858, CR: 2049, PA: 2591, GT: 2321,
    HN: 2340, SV: 2222, NI: 2557, DO: 2214, CU: 2192,
    PR: 2630, BR: 2076, ES: 2724, PT: 2620, GB: 2826,
    DE: 2276, FR: 2250, IT: 2380, NL: 2528, AU: 2036,
    JP: 2392, KR: 2410, IN: 2356, SG: 2702,
}

export class GoogleAdsAdapter implements IAdsAdapter {
    platform = AdPlatform.GOOGLE_ADS

    private clientId = process.env.GOOGLE_CLIENT_ID
    private clientSecret = process.env.GOOGLE_CLIENT_SECRET
    private developerToken = process.env.GOOGLE_DEVELOPER_TOKEN
    private redirectUri = process.env.GOOGLE_REDIRECT_URI

    private headers(accessToken: string, loginCustomerId?: string): Record<string, string> {
        const h: Record<string, string> = {
            Authorization: `Bearer ${accessToken}`,
            'developer-token': this.developerToken!,
            'Content-Type': 'application/json',
        }
        if (loginCustomerId) h['login-customer-id'] = loginCustomerId
        return h
    }

    private cid(adAccountId: string): string {
        return adAccountId.replace(/-/g, '')
    }

    getAuthUrl(state?: string): string {
        const params = new URLSearchParams({
            client_id: this.clientId!,
            redirect_uri: this.redirectUri!,
            scope: 'https://www.googleapis.com/auth/adwords',
            response_type: 'code',
            access_type: 'offline',
            prompt: 'consent',
            ...(state ? { state } : {})
        })
        return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
    }

    async exchangeCodeForToken(code: string): Promise<any> {
        const res = await fetch(GOOGLE_TOKEN_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code,
                client_id: this.clientId!,
                client_secret: this.clientSecret!,
                redirect_uri: this.redirectUri!,
                grant_type: 'authorization_code',
            }),
        })
        if (!res.ok) throw new Error(`Google token exchange failed: ${await res.text()}`)
        const data = await res.json()
        return {
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
            expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined,
            tokenType: data.token_type || 'Bearer',
        }
    }

    async refreshToken(refreshTokenValue: string): Promise<any> {
        const res = await fetch(GOOGLE_TOKEN_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                refresh_token: refreshTokenValue,
                client_id: this.clientId!,
                client_secret: this.clientSecret!,
                grant_type: 'refresh_token',
            }),
        })
        if (!res.ok) throw new Error(`Google token refresh failed: ${await res.text()}`)
        const data = await res.json()
        return {
            accessToken: data.access_token,
            expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined,
        }
    }

    async listAdAccounts(accessToken: string): Promise<AdAccount[]> {
        const res = await fetch(`${GOOGLE_API_BASE}/customers:listAccessibleCustomers`, {
            headers: this.headers(accessToken),
        })
        if (!res.ok) throw new Error(`Google Ads listAdAccounts failed: ${await res.text()}`)
        const data = await res.json()
        const resourceNames: string[] = data.resourceNames || []

        const accounts = await Promise.all(
            resourceNames.slice(0, 20).map(async (resourceName: string) => {
                const customerId = resourceName.split('/')[1]
                try {
                    const detailRes = await fetch(`${GOOGLE_API_BASE}/${resourceName}`, {
                        headers: this.headers(accessToken, customerId),
                    })
                    if (!detailRes.ok) return null
                    const detail = await detailRes.json()
                    return {
                        providerAccountId: customerId,
                        displayName: detail.descriptiveName || customerId,
                        currency: detail.currencyCode || 'USD',
                        timezone: detail.timeZone || 'UTC',
                    }
                } catch {
                    return null
                }
            })
        )
        return accounts.filter(Boolean) as AdAccount[]
    }

    async listPages(accessToken: string): Promise<any[]> { return [] }
    async listPixels(accessToken: string, adAccountId: string): Promise<any[]> { return [] }
    async listPagePosts(accessToken: string, pageId: string): Promise<any[]> { return [] }

    async publishFromDraft(accessToken: string, adAccountId: string, draft: CampaignDraftPayload): Promise<PublishResult> {
        // advantageType drives the channel type:
        //   'advantage'          → Performance Max
        //   'smart_segmentation' → Display
        //   'custom'             → Search (RSA)
        const channelType = (draft as any).advantageType === 'advantage'
            ? 'PERFORMANCE_MAX'
            : (draft as any).advantageType === 'smart_segmentation'
                ? 'DISPLAY'
                : 'SEARCH'

        if (channelType === 'PERFORMANCE_MAX') {
            return this.publishPMax(accessToken, adAccountId, draft)
        } else if (channelType === 'DISPLAY') {
            return this.publishDisplay(accessToken, adAccountId, draft)
        } else {
            return this.publishSearch(accessToken, adAccountId, draft)
        }
    }

    // ── SEARCH CAMPAIGN ──────────────────────────────────────────────
    private async publishSearch(accessToken: string, adAccountId: string, draft: CampaignDraftPayload): Promise<PublishResult> {
        console.log(`[Google] Search campaign: ${draft.name}`)
        const cid = this.cid(adAccountId)
        const headers = this.headers(accessToken, cid)
        const base = `${GOOGLE_API_BASE}/customers/${cid}`

        const biddingStrategy = draft.objective === 'OUTCOME_LEADS' || draft.objective === 'OUTCOME_SALES'
            ? 'MAXIMIZE_CONVERSIONS'
            : 'MAXIMIZE_CLICKS'

        // 1. Budget
        const budgetRes = await fetch(`${base}/campaignBudgets:mutate`, {
            method: 'POST', headers,
            body: JSON.stringify({ operations: [{ create: {
                name: `${draft.name} — Budget`,
                amountMicros: String(Math.round(draft.budgetAmount * 1_000_000)),
                deliveryMethod: 'STANDARD',
            }}] })
        })
        if (!budgetRes.ok) throw new Error(`Google Search budget: ${await budgetRes.text()}`)
        const budgetName = (await budgetRes.json()).results?.[0]?.resourceName
        if (!budgetName) throw new Error('Google Search: no se creó el presupuesto')

        // 2. Campaign
        const campaignRes = await fetch(`${base}/campaigns:mutate`, {
            method: 'POST', headers,
            body: JSON.stringify({ operations: [{ create: {
                name: draft.name,
                status: 'PAUSED',
                advertisingChannelType: 'SEARCH',
                campaignBudget: budgetName,
                networkSettings: { targetGoogleSearch: true, targetSearchNetwork: true, targetContentNetwork: false },
                biddingStrategyType: biddingStrategy,
            }}] })
        })
        if (!campaignRes.ok) throw new Error(`Google Search campaign: ${await campaignRes.text()}`)
        const campaignName = (await campaignRes.json()).results?.[0]?.resourceName
        if (!campaignName) throw new Error('Google Search: no se creó la campaña')
        const campaignId = campaignName.split('/').pop()!

        // 3. Geo targeting (non-fatal)
        await this.addGeoCriteria(accessToken, cid, campaignName, draft.geoLocations?.countries)

        // 4. Ad Group
        const adGroupRes = await fetch(`${base}/adGroups:mutate`, {
            method: 'POST', headers,
            body: JSON.stringify({ operations: [{ create: {
                name: `${draft.name} — Ad Group`,
                campaign: campaignName,
                status: 'ENABLED',
                type: 'SEARCH_STANDARD',
            }}] })
        })
        if (!adGroupRes.ok) throw new Error(`Google Search ad group: ${await adGroupRes.text()}`)
        const adGroupName = (await adGroupRes.json()).results?.[0]?.resourceName
        if (!adGroupName) throw new Error('Google Search: no se creó el ad group')
        const adGroupId = adGroupName.split('/').pop()

        // 5. Validate URL before creating ads
        if (!draft.destinationUrl) throw new Error('URL de destino requerida para campañas de Google')

        // 6. Create one RSA per copy variation
        const copies = draft.copies?.length
            ? draft.copies
            : [{ primaryText: draft.primaryText, headline: draft.headline, description: draft.description }]

        const adOperations = copies.map((copy, i) => {
            const headlines = this.buildHeadlines([copy.headline, copy.primaryText, draft.headline, draft.name])
            const descriptions = this.buildDescriptions([copy.description, copy.primaryText, draft.description])
            return {
                create: {
                    adGroup: adGroupName,
                    status: 'ENABLED',
                    ad: {
                        name: `${draft.name} — Ad ${i + 1}`,
                        responsiveSearchAd: { headlines, descriptions },
                        finalUrls: [draft.destinationUrl],
                    }
                }
            }
        })

        const adsRes = await fetch(`${base}/adGroupAds:mutate`, {
            method: 'POST', headers,
            body: JSON.stringify({ operations: adOperations })
        })
        if (!adsRes.ok) throw new Error(`Google Search ads: ${await adsRes.text()}`)
        const firstAdId = (await adsRes.json()).results?.[0]?.resourceName?.split('/').pop()

        return { providerCampaignId: campaignId, providerGroupId: adGroupId, providerAdId: firstAdId }
    }

    // ── DISPLAY CAMPAIGN ─────────────────────────────────────────────
    private async publishDisplay(accessToken: string, adAccountId: string, draft: CampaignDraftPayload): Promise<PublishResult> {
        console.log(`[Google] Display campaign: ${draft.name}`)
        const cid = this.cid(adAccountId)
        const headers = this.headers(accessToken, cid)
        const base = `${GOOGLE_API_BASE}/customers/${cid}`

        // 1. Budget
        const budgetRes = await fetch(`${base}/campaignBudgets:mutate`, {
            method: 'POST', headers,
            body: JSON.stringify({ operations: [{ create: {
                name: `${draft.name} — Budget`,
                amountMicros: String(Math.round(draft.budgetAmount * 1_000_000)),
                deliveryMethod: 'STANDARD',
            }}] })
        })
        if (!budgetRes.ok) throw new Error(`Google Display budget: ${await budgetRes.text()}`)
        const budgetName = (await budgetRes.json()).results?.[0]?.resourceName
        if (!budgetName) throw new Error('Google Display: no se creó el presupuesto')

        // Display bidding: MAXIMIZE_CONVERSIONS works without requiring a manual target CPA
        const displayBidding = (draft.objective === 'OUTCOME_SALES' || draft.objective === 'OUTCOME_LEADS')
            ? 'MAXIMIZE_CONVERSIONS'
            : 'MAXIMIZE_CLICKS'

        // 2. Campaign
        const campaignRes = await fetch(`${base}/campaigns:mutate`, {
            method: 'POST', headers,
            body: JSON.stringify({ operations: [{ create: {
                name: draft.name,
                status: 'PAUSED',
                advertisingChannelType: 'DISPLAY',
                campaignBudget: budgetName,
                biddingStrategyType: displayBidding,
            }}] })
        })
        if (!campaignRes.ok) throw new Error(`Google Display campaign: ${await campaignRes.text()}`)
        const campaignName = (await campaignRes.json()).results?.[0]?.resourceName
        if (!campaignName) throw new Error('Google Display: no se creó la campaña')
        const campaignId = campaignName.split('/').pop()!

        // 3. Geo targeting (non-fatal)
        await this.addGeoCriteria(accessToken, cid, campaignName, draft.geoLocations?.countries)

        // 4. Ad Group
        const adGroupRes = await fetch(`${base}/adGroups:mutate`, {
            method: 'POST', headers,
            body: JSON.stringify({ operations: [{ create: {
                name: `${draft.name} — Ad Group`,
                campaign: campaignName,
                status: 'ENABLED',
                type: 'DISPLAY_STANDARD',
            }}] })
        })
        if (!adGroupRes.ok) throw new Error(`Google Display ad group: ${await adGroupRes.text()}`)
        const adGroupName = (await adGroupRes.json()).results?.[0]?.resourceName
        if (!adGroupName) throw new Error('Google Display: no se creó el ad group')
        const adGroupId = adGroupName.split('/').pop()

        // 5. Validate URL
        if (!draft.destinationUrl) throw new Error('URL de destino requerida para campañas de Google Display')

        // 6. Responsive Display Ads — text only; images added in Ads Manager
        const copies = draft.copies?.length
            ? draft.copies
            : [{ primaryText: draft.primaryText, headline: draft.headline, description: draft.description }]

        const adOperations = copies.slice(0, 5).map((copy, i) => {
            const shortHeadline = (copy.headline || draft.headline || draft.name || '').slice(0, 30)
            const longHeadline = (copy.primaryText || draft.primaryText || copy.headline || draft.name || '').slice(0, 90)
            const description = (copy.description || copy.primaryText || draft.description || '').slice(0, 90)
            const businessName = (draft.name || '').slice(0, 25)
            return {
                create: {
                    adGroup: adGroupName,
                    status: 'ENABLED',
                    ad: {
                        name: `${draft.name} — Ad ${i + 1}`,
                        responsiveDisplayAd: {
                            headlines: [{ text: shortHeadline }],
                            longHeadline: { text: longHeadline },
                            descriptions: [{ text: description }],
                            businessName,
                            finalUrls: [draft.destinationUrl],
                        }
                    }
                }
            }
        })

        const adsRes = await fetch(`${base}/adGroupAds:mutate`, {
            method: 'POST', headers,
            body: JSON.stringify({ operations: adOperations })
        })
        if (!adsRes.ok) throw new Error(`Google Display ads: ${await adsRes.text()}`)
        const firstAdId = (await adsRes.json()).results?.[0]?.resourceName?.split('/').pop()

        return { providerCampaignId: campaignId, providerGroupId: adGroupId, providerAdId: firstAdId }
    }

    // ── PERFORMANCE MAX CAMPAIGN ─────────────────────────────────────
    private async publishPMax(accessToken: string, adAccountId: string, draft: CampaignDraftPayload): Promise<PublishResult> {
        console.log(`[Google] Performance Max campaign: ${draft.name}`)
        const cid = this.cid(adAccountId)
        const headers = this.headers(accessToken, cid)
        const base = `${GOOGLE_API_BASE}/customers/${cid}`

        // 1. Budget
        const budgetRes = await fetch(`${base}/campaignBudgets:mutate`, {
            method: 'POST', headers,
            body: JSON.stringify({ operations: [{ create: {
                name: `${draft.name} — Budget`,
                amountMicros: String(Math.round(draft.budgetAmount * 1_000_000)),
                deliveryMethod: 'STANDARD',
                explicitlyShared: false,
            }}] })
        })
        if (!budgetRes.ok) throw new Error(`Google PMax budget: ${await budgetRes.text()}`)
        const budgetName = (await budgetRes.json()).results?.[0]?.resourceName
        if (!budgetName) throw new Error('Google PMax: no se creó el presupuesto')

        if (!draft.destinationUrl) throw new Error('URL de destino requerida para campañas de Performance Max')

        // 2. PMax Campaign
        const campaignRes = await fetch(`${base}/campaigns:mutate`, {
            method: 'POST', headers,
            body: JSON.stringify({ operations: [{ create: {
                name: draft.name,
                status: 'PAUSED',
                advertisingChannelType: 'PERFORMANCE_MAX',
                campaignBudget: budgetName,
                biddingStrategyType: 'MAXIMIZE_CONVERSIONS',
            }}] })
        })
        if (!campaignRes.ok) throw new Error(`Google PMax campaign: ${await campaignRes.text()}`)
        const campaignName = (await campaignRes.json()).results?.[0]?.resourceName
        if (!campaignName) throw new Error('Google PMax: no se creó la campaña')
        const campaignId = campaignName.split('/').pop()!

        // 3. Geo targeting
        await this.addGeoCriteria(accessToken, cid, campaignName, draft.geoLocations?.countries)

        // 4. Asset Group (PMax requires at least one asset group)
        const copies = draft.copies?.length
            ? draft.copies
            : [{ primaryText: draft.primaryText, headline: draft.headline, description: draft.description }]

        const headlines = this.buildHeadlines(
            copies.slice(0, 5).map(c => c.headline || c.primaryText).concat([draft.headline, draft.name])
        ).slice(0, 5)

        const descriptions = this.buildDescriptions(
            copies.slice(0, 5).map(c => c.description || c.primaryText).concat([draft.description])
        ).slice(0, 5)

        const assetGroupRes = await fetch(`${base}/assetGroups:mutate`, {
            method: 'POST', headers,
            body: JSON.stringify({ operations: [{ create: {
                name: `${draft.name} — Asset Group`,
                campaign: campaignName,
                status: 'ENABLED',
                finalUrls: [draft.destinationUrl],
                headlines,
                longHeadlines: [{ text: (draft.primaryText || draft.name || '').slice(0, 90) }],
                descriptions,
                businessName: (draft.name || '').slice(0, 25),
            }}] })
        })
        // PMax asset group errors are non-fatal (assets can be added in Ads Manager)
        const assetGroupId = assetGroupRes.ok
            ? (await assetGroupRes.json()).results?.[0]?.resourceName?.split('/').pop()
            : undefined

        return { providerCampaignId: campaignId || '', providerGroupId: assetGroupId, providerAdId: undefined }
    }

    // ── Shared helpers ───────────────────────────────────────────────

    /** Add country geo targets to a campaign */
    private async addGeoCriteria(
        accessToken: string,
        cid: string,
        campaignResourceName: string | undefined,
        countries: string[] | undefined
    ): Promise<void> {
        if (!campaignResourceName || !countries?.length) return
        const headers = this.headers(accessToken, cid)
        const base = `${GOOGLE_API_BASE}/customers/${cid}`

        const geoIds = countries
            .map(code => COUNTRY_TO_GOOGLE_GEO_ID[code.toUpperCase()])
            .filter(Boolean)

        if (geoIds.length === 0) return

        const operations = geoIds.map(geoId => ({
            create: {
                campaign: campaignResourceName,
                location: { geoTargetConstant: `geoTargetConstants/${geoId}` }
            }
        }))

        await fetch(`${base}/campaignCriteria:mutate`, {
            method: 'POST', headers,
            body: JSON.stringify({ operations })
        }).catch(() => { /* non-fatal: geo can be added in Ads Manager */ })
    }

    /** Build RSA headlines array (3–15 items, max 30 chars each) */
    private buildHeadlines(sources: (string | undefined | null)[]): Array<{ text: string }> {
        const seen = new Set<string>()
        const result: Array<{ text: string }> = []
        for (const s of sources) {
            if (!s) continue
            const text = s.slice(0, 30)
            if (!seen.has(text)) { seen.add(text); result.push({ text }) }
            if (result.length >= 15) break
        }
        // Ensure minimum 3
        while (result.length < 3) result.push({ text: result[0]?.text || 'Conoce más' })
        return result
    }

    /** Build RSA descriptions array (2–4 items, max 90 chars each) */
    private buildDescriptions(sources: (string | undefined | null)[]): Array<{ text: string }> {
        const seen = new Set<string>()
        const result: Array<{ text: string }> = []
        for (const s of sources) {
            if (!s) continue
            const text = s.slice(0, 90)
            if (!seen.has(text)) { seen.add(text); result.push({ text }) }
            if (result.length >= 4) break
        }
        while (result.length < 2) result.push({ text: result[0]?.text || 'Haz clic para saber más' })
        return result
    }

    async pauseCampaign(accessToken: string, adAccountId: string, providerCampaignId: string): Promise<boolean> {
        const cid = this.cid(adAccountId)
        const res = await fetch(`${GOOGLE_API_BASE}/customers/${cid}/campaigns:mutate`, {
            method: 'POST',
            headers: this.headers(accessToken, cid),
            body: JSON.stringify({ operations: [{ update: {
                resourceName: `customers/${cid}/campaigns/${providerCampaignId}`,
                status: 'PAUSED',
            }, updateMask: 'status' }] })
        })
        return res.ok
    }

    async resumeCampaign(accessToken: string, adAccountId: string, providerCampaignId: string): Promise<boolean> {
        const cid = this.cid(adAccountId)
        const res = await fetch(`${GOOGLE_API_BASE}/customers/${cid}/campaigns:mutate`, {
            method: 'POST',
            headers: this.headers(accessToken, cid),
            body: JSON.stringify({ operations: [{ update: {
                resourceName: `customers/${cid}/campaigns/${providerCampaignId}`,
                status: 'ENABLED',
            }, updateMask: 'status' }] })
        })
        return res.ok
    }

    async fetchDailyMetrics(accessToken: string, adAccountId: string, from: Date, to: Date): Promise<MetricRow[]> {
        const cid = this.cid(adAccountId)
        const fromStr = from.toISOString().split('T')[0]
        const toStr = to.toISOString().split('T')[0]

        const res = await fetch(`${GOOGLE_API_BASE}/customers/${cid}/googleAds:search`, {
            method: 'POST',
            headers: this.headers(accessToken, cid),
            body: JSON.stringify({ query: `
                SELECT campaign.id, segments.date,
                    metrics.cost_micros, metrics.impressions,
                    metrics.clicks, metrics.conversions
                FROM campaign
                WHERE segments.date BETWEEN '${fromStr}' AND '${toStr}'
                AND campaign.status != 'REMOVED'
            ` })
        })
        if (!res.ok) return []
        const data = await res.json()

        return (data.results || []).map((row: any) => ({
            providerCampaignId: row.campaign?.id?.toString() || '',
            date: new Date(row.segments?.date || fromStr),
            spend: Math.round((parseInt(row.metrics?.costMicros || '0') / 1_000_000) * 100) / 100,
            impressions: parseInt(row.metrics?.impressions || '0'),
            clicks: parseInt(row.metrics?.clicks || '0'),
            conversions: Math.round(parseFloat(row.metrics?.conversions || '0')),
        }))
    }

    async searchLocations(accessToken: string, query: string): Promise<any[]> {
        const res = await fetch(`${GOOGLE_API_BASE}/geoTargetConstants:suggest`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'developer-token': this.developerToken!,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ locale: 'es', searchTerm: query })
        })
        if (!res.ok) return []
        const data = await res.json()
        return (data.geoTargetConstantSuggestions || []).map((s: any) => ({
            key: s.geoTargetConstant?.resourceName,
            name: s.geoTargetConstant?.name,
            type: s.geoTargetConstant?.targetType,
            countryCode: s.geoTargetConstant?.countryCode,
            countryName: s.geoTargetConstant?.name,
        }))
    }
}
