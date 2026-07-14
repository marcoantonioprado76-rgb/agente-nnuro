import { AdPlatform } from '@prisma/client'
import { IAdsAdapter, AdAccount, CampaignDraftPayload, PublishResult, MetricRow } from '../types'

const TIKTOK_API_BASE = 'https://business-api.tiktok.com/open_api'
const API_VERSION = 'v1.3'

// GeoNames-based location IDs used by TikTok for country targeting
const COUNTRY_TO_TIKTOK_ID: Record<string, number> = {
    US: 6252001, CA: 6251999, MX: 3996063, CO: 3686110, AR: 3865483,
    PE: 3932488, CL: 3895114, VE: 3625428, EC: 3658394, BO: 3923057,
    PY: 3437598, UY: 3439705, CR: 3624060, PA: 3703430, GT: 3595528,
    HN: 3608932, SV: 3585968, NI: 3617476, DO: 3508796, CU: 3562981,
    PR: 4566966, BR: 3469034, ES: 2510769, PT: 2264397, GB: 2635167,
    DE: 2921044, FR: 3017382, IT: 3175395, NL: 2750405, AU: 2077456,
    JP: 1861060, KR: 1835841, IN: 1269750, CN: 1814991, SG: 1880251,
}

export class TikTokAdapter implements IAdsAdapter {
    platform = AdPlatform.TIKTOK

    private appId = process.env.TIKTOK_APP_ID
    private clientSecret = process.env.TIKTOK_CLIENT_SECRET
    private redirectUri = process.env.TIKTOK_REDIRECT_URI

    private async apiRequest<T>(
        method: 'GET' | 'POST',
        endpoint: string,
        accessToken: string,
        body?: any,
        params?: Record<string, any>
    ): Promise<T> {
        const url = new URL(`${TIKTOK_API_BASE}/${API_VERSION}${endpoint}`)
        if (params) {
            Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)))
        }

        const res = await fetch(url.toString(), {
            method,
            headers: {
                'Access-Token': accessToken,
                'Content-Type': 'application/json',
            },
            ...(body ? { body: JSON.stringify(body) } : {})
        })

        if (!res.ok) {
            const text = await res.text().catch(() => '')
            throw new Error(`TikTok API HTTP ${res.status}: ${text}`)
        }

        const json = await res.json()
        if (json.code !== 0) {
            throw new Error(json.message || `TikTok API error code: ${json.code}`)
        }
        return json.data as T
    }

    getAuthUrl(state?: string): string {
        if (!this.appId || !this.redirectUri) {
            throw new Error('TikTok App configuration (App ID, Redirect URI) is missing in environment variables.')
        }
        const params = new URLSearchParams({
            app_id: this.appId,
            redirect_uri: this.redirectUri,
            state: state || '',
            scope: JSON.stringify(['ads.management', 'ads.stats'])
        })
        return `https://business-api.tiktok.com/portal/auth?${params.toString()}`
    }

    async exchangeCodeForToken(code: string): Promise<any> {
        if (!this.appId || !this.clientSecret) {
            throw new Error('TikTok App configuration (App ID, Client Secret) is missing.')
        }

        const res = await fetch(`${TIKTOK_API_BASE}/${API_VERSION}/oauth2/access_token/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                app_id: this.appId,
                secret: this.clientSecret,
                auth_code: code
            })
        })

        const json = await res.json()
        if (json.code !== 0) throw new Error(json.message || 'Failed to exchange TikTok auth code')

        const data = json.data
        return {
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
            expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined,
            tokenType: 'Bearer',
            scopes: data.scope ? data.scope.split(',') : ['ads.management', 'ads.stats']
        }
    }

    async refreshToken(refreshToken: string): Promise<any> {
        if (!this.appId || !this.clientSecret) {
            throw new Error('TikTok App configuration is missing.')
        }

        const res = await fetch(`${TIKTOK_API_BASE}/${API_VERSION}/oauth2/refresh_token/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                app_id: this.appId,
                secret: this.clientSecret,
                refresh_token: refreshToken
            })
        })

        const json = await res.json()
        if (json.code !== 0) throw new Error(json.message || 'Failed to refresh TikTok token')

        return {
            accessToken: json.data.access_token,
            refreshToken: json.data.refresh_token,
            expiresAt: json.data.expires_in ? new Date(Date.now() + json.data.expires_in * 1000) : undefined
        }
    }

    async listAdAccounts(accessToken: string): Promise<AdAccount[]> {
        if (!this.appId || !this.clientSecret) {
            throw new Error('TikTok App configuration is missing.')
        }

        const res = await fetch(
            `${TIKTOK_API_BASE}/${API_VERSION}/oauth2/advertiser/get/?app_id=${this.appId}&secret=${this.clientSecret}`,
            { headers: { 'Access-Token': accessToken } }
        )

        const json = await res.json()
        if (json.code !== 0) throw new Error(json.message || 'Failed to list TikTok ad accounts')

        return (json.data?.list || []).map((acc: any) => ({
            providerAccountId: String(acc.advertiser_id),
            displayName: acc.advertiser_name || `Account ${acc.advertiser_id}`,
            currency: acc.currency || 'USD',
            timezone: acc.timezone || 'UTC'
        }))
    }

    async listPages(accessToken: string): Promise<any[]> {
        return []
    }

    async listPixels(accessToken: string, adAccountId: string): Promise<any[]> {
        try {
            const data = await this.apiRequest<any>('GET', '/pixel/list/', accessToken, undefined, {
                advertiser_id: adAccountId,
                page: 1,
                page_size: 20
            })
            return (data.pixels || []).map((p: any) => ({
                id: String(p.pixel_id),
                name: p.name || `Pixel ${p.pixel_id}`
            }))
        } catch { return [] }
    }

    async listPagePosts(accessToken: string, pageId: string): Promise<any[]> {
        return []
    }

    async searchLocations(accessToken: string, query: string, type?: string): Promise<any[]> {
        try {
            const data = await this.apiRequest<any>('GET', '/targeting/search/', accessToken, undefined, {
                scene: 'LOCATION',
                keyword: query
            })
            return (data.list || []).map((item: any) => ({
                key: item.id,
                name: item.full_name || item.name,
                type: item.level,
                countryCode: item.country_code
            }))
        } catch { return [] }
    }

    async publishFromDraft(accessToken: string, adAccountId: string, draft: CampaignDraftPayload): Promise<PublishResult> {
        console.log(`[TikTok] Starting publication for: ${draft.name}`)

        // Map OUTCOME_* objectives to TikTok objective types
        const objectiveMap: Record<string, string> = {
            'OUTCOME_TRAFFIC': 'TRAFFIC',
            'OUTCOME_AWARENESS': 'REACH',
            'OUTCOME_ENGAGEMENT': 'ENGAGEMENT',
            'OUTCOME_LEADS': 'LEAD_GENERATION',
            'OUTCOME_SALES': 'CONVERSIONS',
        }
        const objective = objectiveMap[draft.objective || 'OUTCOME_TRAFFIC'] || 'TRAFFIC'
        const budgetMode = draft.budgetType === 'LIFETIME' ? 'BUDGET_MODE_TOTAL' : 'BUDGET_MODE_DAY'

        // Map optimization goal per objective
        const optimizationGoalMap: Record<string, string> = {
            'TRAFFIC': 'CLICK',
            'REACH': 'REACH',
            'ENGAGEMENT': 'ENGAGED_VIEW',
            'LEAD_GENERATION': 'LEAD',
            'CONVERSIONS': 'CONVERT',
        }
        const optimizationGoal = optimizationGoalMap[objective] || 'CLICK'

        // billing_event must align with optimization_goal
        const billingEventMap: Record<string, string> = {
            'CLICK': 'CPC',
            'REACH': 'CPM',
            'ENGAGED_VIEW': 'OCPM',
            'LEAD': 'CPC',
            'CONVERT': 'OCPM',
        }
        const billingEvent = billingEventMap[optimizationGoal] || 'OCPM'

        // Convert ISO country codes → TikTok GeoNames location IDs
        const locationIds: number[] = []
        if (draft.geoLocations?.countries?.length) {
            for (const code of draft.geoLocations.countries) {
                const id = COUNTRY_TO_TIKTOK_ID[code.toUpperCase()]
                if (id) locationIds.push(id)
            }
        }

        // 1. Create Campaign
        const campaignData = await this.apiRequest<any>('POST', '/campaign/create/', accessToken, {
            advertiser_id: adAccountId,
            campaign_name: draft.name,
            objective_type: objective,
            budget_mode: budgetMode,
            budget: draft.budgetAmount,
            operation_status: 'DISABLE'
        })
        const campaignId = String(campaignData.campaign_id)

        // 2. Create Ad Group
        const now = Math.floor(Date.now() / 1000)
        const adGroupPayload: any = {
            advertiser_id: adAccountId,
            campaign_id: campaignId,
            adgroup_name: `${draft.name} — Ad Group`,
            placement_type: 'PLACEMENT_TYPE_AUTOMATIC',
            budget_mode: budgetMode,
            budget: draft.budgetAmount,
            schedule_type: 'SCHEDULE_START_END',
            schedule_start_time: now,
            schedule_end_time: now + 30 * 24 * 60 * 60,
            optimization_goal: optimizationGoal,
            billing_event: billingEvent,
            targeting: {
                age: this.mapAgeRange(draft.ageMin || 18, draft.ageMax || 55),
                gender: draft.gender === 'MALE' ? 'GENDER_MALE'
                    : draft.gender === 'FEMALE' ? 'GENDER_FEMALE'
                    : 'GENDER_UNLIMITED',
                ...(locationIds.length > 0 ? { location_ids: locationIds } : {})
            },
            operation_status: 'DISABLE'
        }

        // For website destination, set landing page URL
        if (draft.destinationUrl) {
            adGroupPayload.optimization_event = objective === 'CONVERSIONS' ? 'PURCHASE' : undefined
        }

        const adGroupData = await this.apiRequest<any>('POST', '/adgroup/create/', accessToken, adGroupPayload)
        const adGroupId = String(adGroupData.adgroup_id)

        // 3. Create Ads — one per copy variation
        const copies = draft.copies?.length
            ? draft.copies
            : [{ primaryText: draft.primaryText, headline: draft.headline, imageUrl: draft.assets?.[0]?.storageUrl }]

        // Build creatives array for batch ad creation.
        // NOTE: TikTok requires video assets to be pre-uploaded via TikTok Business Manager
        // and referenced by their platform video_id. Supabase URLs cannot be used directly.
        // Campaigns are created with text copy only; videos are added in TikTok Ads Manager.
        const creativesBatch = copies.map((copy, i) => {
            const adText = (copy.primaryText || draft.primaryText || copy.headline || draft.name || '').slice(0, 150)

            const creative: any = {
                ad_name: `${draft.name} — Ad ${i + 1}`,
                ad_format: 'SINGLE_VIDEO',
                ad_text: adText,
                call_to_action: this.mapCTA(objective, draft.destinationUrl),
            }

            // Landing page URL for website-destination campaigns
            if (draft.destinationUrl) {
                creative.landing_page_url = draft.destinationUrl
            }

            return creative
        })

        const adData = await this.apiRequest<any>('POST', '/ad/create/', accessToken, {
            advertiser_id: adAccountId,
            adgroup_id: adGroupId,
            creatives: creativesBatch,
            operation_status: 'DISABLE'
        })

        const firstAdId = String(adData.ad_ids?.[0] || '')

        return {
            providerCampaignId: campaignId,
            providerGroupId: adGroupId,
            providerAdId: firstAdId
        }
    }

    async pauseCampaign(accessToken: string, adAccountId: string, providerCampaignId: string): Promise<boolean> {
        try {
            await this.apiRequest('POST', '/campaign/status/update/', accessToken, {
                advertiser_id: adAccountId,
                campaign_ids: [providerCampaignId],
                operation_status: 'DISABLE'
            })
            return true
        } catch { return false }
    }

    async resumeCampaign(accessToken: string, adAccountId: string, providerCampaignId: string): Promise<boolean> {
        try {
            await this.apiRequest('POST', '/campaign/status/update/', accessToken, {
                advertiser_id: adAccountId,
                campaign_ids: [providerCampaignId],
                operation_status: 'ENABLE'
            })
            return true
        } catch { return false }
    }

    async fetchDailyMetrics(accessToken: string, adAccountId: string, from: Date, to: Date): Promise<MetricRow[]> {
        try {
            const data = await this.apiRequest<any>('POST', '/report/integrated/get/', accessToken, {
                advertiser_id: adAccountId,
                report_type: 'BASIC',
                dimensions: ['campaign_id', 'stat_time_day'],
                metrics: ['spend', 'impressions', 'clicks', 'conversion'],
                start_date: from.toISOString().split('T')[0],
                end_date: to.toISOString().split('T')[0],
                page: 1,
                page_size: 100
            })

            return (data.list || []).map((row: any) => ({
                providerCampaignId: String(row.dimensions?.campaign_id),
                date: new Date(row.dimensions?.stat_time_day),
                spend: parseFloat(row.metrics?.spend || 0),
                impressions: parseInt(row.metrics?.impressions || 0),
                clicks: parseInt(row.metrics?.clicks || 0),
                conversions: parseInt(row.metrics?.conversion || 0)
            }))
        } catch { return [] }
    }

    private mapAgeRange(min: number, max: number): string[] {
        const ranges: string[] = []
        if (min <= 17) ranges.push('AGE_13_17')
        if (min <= 24 && max >= 18) ranges.push('AGE_18_24')
        if (min <= 34 && max >= 25) ranges.push('AGE_25_34')
        if (min <= 44 && max >= 35) ranges.push('AGE_35_44')
        if (min <= 54 && max >= 45) ranges.push('AGE_45_54')
        if (max >= 55) ranges.push('AGE_55_100')
        return ranges.length > 0 ? ranges : ['AGE_18_24', 'AGE_25_34']
    }

    private mapCTA(objective: string, destinationUrl?: string): string {
        if (!destinationUrl) return 'WATCH_MORE'
        const ctaMap: Record<string, string> = {
            'CONVERSIONS': 'SHOP_NOW',
            'LEAD_GENERATION': 'SIGN_UP',
            'TRAFFIC': 'LEARN_MORE',
            'REACH': 'LEARN_MORE',
            'ENGAGEMENT': 'FOLLOW',
        }
        return ctaMap[objective] || 'LEARN_MORE'
    }
}
