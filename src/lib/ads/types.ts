import { AdPlatform, BudgetType, DraftStatus, RemoteStatus } from '@prisma/client'

export interface AdAccount {
    providerAccountId: string
    displayName: string
    currency: string
    timezone: string
}

export interface MetricRow {
    date: Date
    providerCampaignId: string
    spend: number
    impressions: number
    clicks: number           // all clicks (engagement)
    linkClicks: number       // inline_link_clicks — real link clicks only
    reach: number
    frequency?: number       // impressions / reach
    conversions: number      // purchases + leads (pixel)
    leads: number            // pixel leads only
    purchases: number        // pixel purchases only
    addToCart: number        // add to cart events
    viewContent: number      // view content events
    initiateCheckout: number // initiate checkout events
    conversations: number    // WhatsApp + Messenger conversations started
    messagingReplies: number // first replies in messaging
    postEngagement: number   // likes + comments + shares + reactions
    videoViews: number       // 3-second video views
    landingPageViews: number // landing page views (after click)
    ctr?: number
    cpc?: number
    cpa?: number
    roas?: number
}

export interface CampaignDraftPayload {
    name: string
    objective?: string
    budgetType: BudgetType
    budgetAmount: number
    geoLocations?: {
        countries?: string[]
        regions?: Array<{ key: string; name: string }>
        cities?: Array<{ key: string; name: string; radius?: number; distance_unit?: string }>
        custom_locations?: Array<{ lat: number; lng: number; radius: number; distance_unit: string; name?: string }>
    }
    ageMin?: number
    ageMax?: number
    gender?: string
    placementsJson?: any
    destinationUrl?: string
    messengerDestination?: 'WHATSAPP' | 'MESSENGER' | 'INSTAGRAM'
    utmJson?: any
    primaryText?: string
    headline?: string
    description?: string
    cta?: string
    providerPageId?: string
    providerWhatsAppNumber?: string
    pixelId?: string
    welcomeMessage?: string
    providerPostId?: string
    assets?: Array<{
        type: 'IMAGE' | 'VIDEO'
        storageUrl: string
        metaVideoId?: string       // video pre-subido a Meta (publicar sin esperar)
        metaMediaStatus?: string   // processing | ready | error
    }>
    copies?: Array<{
        primaryText?: string
        headline?: string
        description?: string
        imageUrl?: string
        metaVideoId?: string       // video pre-subido a Meta, alineado con imageUrl
        metaMediaStatus?: string   // processing | ready | error
    }>
    // AI-generated audience interests resolved to Meta IDs
    audienceInterests?: Array<{ id: string; name: string }>
    // Advantage+ Audience — Meta expands beyond defined targeting automatically
    advantageAudience?: boolean
    // Advantage+ Creative — Meta auto-enhances creatives (image touchups, templates, etc.)
    advantageCreative?: boolean
    // Ad format: single image/video per ad, or carousel (child_attachments)
    adFormat?: 'single' | 'carousel'
    // Bid strategy: auto = LOWEST_COST_WITHOUT_CAP (default), cost_cap, min_roas
    bidStrategy?: 'auto' | 'cost_cap' | 'min_roas'
    bidCapAmount?: number   // USD — used when bidStrategy = 'cost_cap'
    minRoasTarget?: number  // e.g. 2.0 = 200% ROAS — used when bidStrategy = 'min_roas'
}

export interface PublishResult {
    providerCampaignId: string
    providerGroupId?: string
    providerAdId?: string
}

export interface IAdsAdapter {
    platform: AdPlatform

    getAuthUrl(state?: string): string
    exchangeCodeForToken(code: string): Promise<{
        accessToken: string
        refreshToken?: string
        expiresAt?: Date
        tokenType?: string
        scopes?: string[]
    }>

    refreshToken(refreshToken: string): Promise<{
        accessToken: string
        refreshToken?: string
        expiresAt?: Date
    }>

    listAdAccounts(accessToken: string): Promise<AdAccount[]>
    listPages(accessToken: string): Promise<any[]>
    listPixels(accessToken: string, adAccountId: string): Promise<any[]>
    listPagePosts(accessToken: string, pageId: string): Promise<any[]>
    searchLocations(accessToken: string, query: string, type?: string): Promise<any[]>

    publishFromDraft(accessToken: string, adAccountId: string, draft: CampaignDraftPayload): Promise<PublishResult>

    pauseCampaign(accessToken: string, adAccountId: string, providerCampaignId: string): Promise<boolean>
    resumeCampaign(accessToken: string, adAccountId: string, providerCampaignId: string): Promise<boolean>
    deleteCampaign?(accessToken: string, adAccountId: string, providerCampaignId: string): Promise<boolean>

    fetchDailyMetrics(accessToken: string, adAccountId: string, from: Date, to: Date): Promise<MetricRow[]>
}
