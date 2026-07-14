import { AdPlatform } from '@prisma/client'
import { IAdsAdapter, AdAccount, CampaignDraftPayload, PublishResult, MetricRow } from '../types'
import { AdsHttpClient } from '../http-client'

export class MetaAdapter implements IAdsAdapter {
    platform = AdPlatform.META
    private api = new AdsHttpClient('https://graph.facebook.com')
    private apiVersion = 'v25.0'

    private appId = process.env.META_APP_ID
    private appSecret = process.env.META_APP_SECRET
    private redirectUri = process.env.META_REDIRECT_URI

    getAuthUrl(state?: string): string {
        if (!this.appId || !this.appSecret || !this.redirectUri) {
            throw new Error('Meta App configuration (ID, Secret, Redirect URI) is missing in environment variables.')
        }
        const scopes = [
            'ads_management',
            'ads_read',
            'business_management',
            'pages_show_list',
            'pages_read_engagement',
            'pages_manage_ads',
            'pages_manage_metadata',
            'public_profile',
            'whatsapp_business_management',
            'instagram_basic'
        ]
        const params = new URLSearchParams({
            client_id: this.appId!,
            redirect_uri: this.redirectUri!,
            scope: scopes.join(','),
            response_type: 'code',
            ...(state ? { state } : {})
        })
        return `https://www.facebook.com/${this.apiVersion}/dialog/oauth?${params.toString()}`
    }

    async exchangeCodeForToken(code: string): Promise<any> {
        if (!this.appId || !this.appSecret || !this.redirectUri) {
            throw new Error('Meta App configuration (ID, Secret, Redirect URI) is missing.')
        }

        const data = await this.api.get<any>(`/${this.apiVersion}/oauth/access_token`, {
            params: {
                client_id: this.appId,
                client_secret: this.appSecret,
                redirect_uri: this.redirectUri,
                code: code
            }
        })

        // Meta tokens can be exchanged for long-lived ones
        const longLived = await this.api.get<any>(`/${this.apiVersion}/oauth/access_token`, {
            params: {
                grant_type: 'fb_exchange_token',
                client_id: this.appId,
                client_secret: this.appSecret,
                fb_exchange_token: data.access_token
            }
        })

        return {
            accessToken: longLived.access_token,
            expiresAt: longLived.expires_in ? new Date(Date.now() + longLived.expires_in * 1000) : undefined,
            tokenType: longLived.token_type || 'bearer'
        }
    }

    async refreshToken(refreshToken: string): Promise<any> {
        // Meta doesn't use standard refresh tokens; long-lived tokens last 60 days
        // Re-exchange is needed if expired.
        throw new Error('Meta tokens must be re-obtained via OAuth after 60 days.')
    }

    async listAdAccounts(accessToken: string): Promise<AdAccount[]> {
        const data = await this.api.get<any>(`/${this.apiVersion}/me/adaccounts`, {
            params: {
                access_token: accessToken,
                fields: 'id,name,currency,timezone_name'
            }
        })

        return (data.data || []).map((acc: any) => ({
            providerAccountId: acc.id,
            displayName: acc.name,
            currency: acc.currency,
            timezone: acc.timezone_name
        }))
    }

    /** Business Managers (administrador comercial) a los que pertenece el usuario. Best-effort. */
    async listBusinesses(accessToken: string): Promise<Array<{ id: string; name: string }>> {
        try {
            const data = await this.api.get<any>(`/${this.apiVersion}/me/businesses`, {
                params: { access_token: accessToken, fields: 'id,name' },
            })
            return (data.data || []).map((b: any) => ({ id: String(b.id), name: String(b.name || b.id) }))
        } catch {
            return [] // sin permiso business_management → simplemente no se muestra
        }
    }

    /** Devuelve el id de la cuenta de Instagram conectada a la página, o null si no hay. */
    async getPageInstagramId(accessToken: string, pageId: string): Promise<string | null> {
        try {
            const data = await this.api.get<any>(`/${this.apiVersion}/${pageId}`, {
                params: { access_token: accessToken, fields: 'connected_instagram_account{id}' }
            })
            return data?.connected_instagram_account?.id || null
        } catch {
            return null
        }
    }

    async listPages(accessToken: string): Promise<any[]> {
        const data = await this.api.get<any>(`/${this.apiVersion}/me/accounts`, {
            params: {
                access_token: accessToken,
                fields: 'id,name,access_token,category,connected_instagram_account{id,username,profile_picture_url}'
            }
        })

        const pages = await Promise.all((data.data || []).map(async (page: any) => {
            const pageToken = page.access_token || accessToken
            let whatsappNumber: string | null = null
            let whatsappNumbers: string[] = []

            try {
                // v21.0 with page token — tries whatsapp_number + whatsapp_accounts edge
                const wpRes = await this.api.get<any>(`/v21.0/${page.id}`, {
                    params: {
                        access_token: pageToken,
                        fields: 'whatsapp_number,whatsapp_accounts{phone_number,default_whatsapp_number}'
                    }
                })
                console.log(`[listPages] Page "${page.name}" — whatsapp:`, wpRes.whatsapp_number || 'none')
                whatsappNumber = wpRes.whatsapp_number || null
                const waAccounts = wpRes.whatsapp_accounts?.data || []
                if (waAccounts.length > 0) {
                    whatsappNumbers = waAccounts.map((a: any) => a.phone_number || a.default_whatsapp_number).filter(Boolean)
                    if (!whatsappNumber) whatsappNumber = whatsappNumbers[0] || null
                }
            } catch (e) { console.log(`[listPages] Page "${page.name}" error:`, e) }

            return {
                id: page.id,
                name: page.name,
                category: page.category,
                whatsappNumber,
                whatsappNumbers,
                instagramId: page.connected_instagram_account?.id || null,
                instagramUsername: page.connected_instagram_account?.username || null,
            }
        }))

        return pages
    }

    async listPixels(accessToken: string, adAccountId: string): Promise<any[]> {
        const data = await this.api.get<any>(`/${this.apiVersion}/${adAccountId}/adspixels`, {
            params: {
                access_token: accessToken,
                fields: 'id,name'
            }
        })

        return (data.data || []).map((p: any) => ({
            id: p.id,
            name: p.name
        }))
    }

    async listPagePosts(accessToken: string, pageId: string): Promise<any[]> {
        const data = await this.api.get<any>(`/${this.apiVersion}/${pageId}/published_posts`, {
            params: {
                access_token: accessToken,
                fields: 'id,message,created_time,full_picture,permalink_url'
            }
        })

        return (data.data || []).map((post: any) => ({
            id: post.id,
            message: post.message,
            picture: post.full_picture,
            url: post.permalink_url,
            createdAt: post.created_time
        }))
    }

    /** Searches Meta's Targeting API for a keyword and returns the best matching interest */
    async searchTargetingInterests(accessToken: string, query: string): Promise<Array<{ id: string; name: string }>> {
        try {
            // Strip category hints like "(cosmetics)" before searching — Meta's search works better with clean terms
            const cleanQuery = query.replace(/\s*\([^)]*\)/g, '').trim()
            const data = await this.api.get<any>(`/${this.apiVersion}/search`, {
                params: { type: 'adinterest', q: cleanQuery, access_token: accessToken, limit: '5' }
            })
            // Return top 5 candidates — caller will validate relevance
            return (data.data || []).slice(0, 5).map((i: any) => ({ id: String(i.id), name: String(i.name) }))
        } catch {
            return []
        }
    }

    // Builds the page_welcome_message object for Click-to-WhatsApp ads.
    // Must go INSIDE link_data (not top-level creative).
    // Format per official Meta docs: https://developers.facebook.com/docs/marketing-api/ctwa
    // welcomeMessage stored format: "greeting||QA:autofill" or just "greeting"
    private buildPageWelcomeMessage(raw: string | null | undefined): object | undefined {
        if (!raw) return undefined
        const parts = raw.split('||QA:')
        const greeting = parts[0]?.trim() || ''
        const autofill = parts[1]?.trim() || ''
        if (!greeting && !autofill) return undefined

        return {
            type: 'VISUAL_EDITOR',
            version: 2,
            landing_screen_type: 'welcome_message',
            media_type: 'text',
            text_format: {
                customer_action_type: 'autofill_message',
                message: {
                    text: greeting || '¡Hola! ¿Cómo podemos ayudarte?',
                    autofill_message: {
                        content: autofill || '¡Hola! Quiero más información.'
                    }
                }
            }
        }
    }

    /**
     * Sube un video a Meta por URL y devuelve el video_id de inmediato.
     * Meta descarga y procesa (transcodifica) en background — NO espera aquí.
     * Se usa al CARGAR el archivo para que al publicar ya esté procesado.
     */
    async uploadVideoByUrl(accessToken: string, adAccountId: string, fileUrl: string): Promise<string> {
        const res = await this.api.post<any>(`/${this.apiVersion}/${adAccountId}/advideos`, {
            file_url: fileUrl,
            access_token: accessToken,
        })
        if (!res?.id) throw new Error('Meta no devolvió un video_id al subir el video')
        return res.id
    }

    /** Consulta el estado de procesamiento de un video en Meta (+ thumbnail si está listo). */
    async getVideoStatus(accessToken: string, videoId: string): Promise<{ status: string; thumbnailUrl?: string }> {
        const res = await this.api.get<any>(`/${this.apiVersion}/${videoId}`, {
            params: { fields: 'status,picture', access_token: accessToken },
        })
        return { status: res?.status?.video_status || 'unknown', thumbnailUrl: res?.picture }
    }

    async publishFromDraft(accessToken: string, adAccountId: string, draft: CampaignDraftPayload): Promise<PublishResult> {
        console.log(`[Meta] Starting publication for: ${draft.name}`)

        // Validate required fields early — Meta rejects empty strings as invalid parameters
        if (!draft.providerPageId) {
            throw new Error('Se requiere una Página de Facebook para publicar en Meta. Selecciónala en la configuración de la campaña.')
        }

        const messagingDest = draft.messengerDestination
        const isMessagingAd = messagingDest === 'WHATSAPP' || messagingDest === 'MESSENGER' || messagingDest === 'INSTAGRAM'

        // Messaging campaigns (click-to-WhatsApp/Messenger/Instagram) MUST use OUTCOME_ENGAGEMENT.
        // Using OUTCOME_LEADS + QUALITY_LEAD with a messaging destination causes "incompatible objective" error.
        let baseObjective = draft.objective || 'OUTCOME_TRAFFIC'
        // Ventas/Conversiones SIN píxel no es una combinación válida en Meta (rechaza el ad set).
        // Caemos a tráfico (clics) para que el anuncio se publique igual. Con píxel sí optimiza por compras.
        if (baseObjective === 'OUTCOME_SALES' && !draft.pixelId) {
            console.warn('[Meta] OUTCOME_SALES sin píxel → se publica como OUTCOME_TRAFFIC (clics). Agregá un píxel para optimizar por compras.')
            baseObjective = 'OUTCOME_TRAFFIC'
        }
        // App promotion no está soportado (no recolectamos app/store) → tráfico, así no falla.
        if (baseObjective === 'OUTCOME_APP_PROMOTION') {
            console.warn('[Meta] OUTCOME_APP_PROMOTION no soportado → se publica como OUTCOME_TRAFFIC.')
            baseObjective = 'OUTCOME_TRAFFIC'
        }
        const effectiveObjective = isMessagingAd ? 'OUTCOME_ENGAGEMENT' : baseObjective

        // 1. Create Campaign
        const campaign = await this.api.post<any>(`/${this.apiVersion}/${adAccountId}/campaigns`, {
            name: draft.name,
            objective: effectiveObjective,
            status: 'ACTIVE',
            special_ad_categories: [],
            // Required when using ad set level budget (not campaign budget optimization)
            is_adset_budget_sharing_enabled: false,
            access_token: accessToken
        })
        const campaignId = campaign.id

        // 2. Create Ad Set — optimization_goal MUST be compatible with effectiveObjective
        let optimizationGoal = 'REACH'
        const billingEvent = 'IMPRESSIONS'
        let destinationType: string | undefined = undefined
        let promotedObject: any = undefined

        if (isMessagingAd) {
            // OUTCOME_ENGAGEMENT + CONVERSATIONS: the only valid combo for WhatsApp/Messenger/Instagram ads
            optimizationGoal = 'CONVERSATIONS'
            if (messagingDest === 'WHATSAPP') destinationType = 'WHATSAPP'
            else if (messagingDest === 'MESSENGER') destinationType = 'MESSENGER_INBOX'
            else destinationType = 'INSTAGRAM_DIRECT'
            if (draft.providerPageId) {
                promotedObject = {
                    page_id: draft.providerPageId,
                    // Specify which WhatsApp number receives messages (if Page has multiple)
                    ...(messagingDest === 'WHATSAPP' && draft.providerWhatsAppNumber
                        ? { whatsapp_phone_number: draft.providerWhatsAppNumber }
                        : {})
                }
            }
        } else if (effectiveObjective === 'OUTCOME_LEADS') {
            // Website leads without lead forms → use LINK_CLICKS + WEBSITE
            optimizationGoal = 'LINK_CLICKS'
            destinationType = 'WEBSITE'
            if (draft.providerPageId) promotedObject = { page_id: draft.providerPageId }
        } else if (effectiveObjective === 'OUTCOME_SALES') {
            optimizationGoal = draft.pixelId ? 'OFFSITE_CONVERSIONS' : 'LINK_CLICKS'
            destinationType = 'WEBSITE'
            if (draft.pixelId) {
                promotedObject = { pixel_id: draft.pixelId, custom_event_type: 'PURCHASE' }
            } else if (draft.providerPageId) {
                promotedObject = { page_id: draft.providerPageId }
            }
        } else if (effectiveObjective === 'OUTCOME_TRAFFIC') {
            optimizationGoal = 'LINK_CLICKS'
            destinationType = 'WEBSITE'
        } else if (effectiveObjective === 'OUTCOME_AWARENESS') {
            optimizationGoal = 'REACH'
            // No destination_type for awareness
        } else if (effectiveObjective === 'OUTCOME_ENGAGEMENT') {
            // Non-messaging engagement (e.g. engagement + instagram placement)
            // Meta requires ENGAGED_USERS optimization for non-messaging engagement objective
            optimizationGoal = 'ENGAGED_USERS'
            // No destination_type needed — Meta delivers to all placements
        }

        // Targeting
        const targeting: any = {
            age_min: draft.ageMin || 18,
            age_max: draft.ageMax || 65,
        }
        if (draft.gender === 'MALE') targeting.genders = [1]
        else if (draft.gender === 'FEMALE') targeting.genders = [2]

        // AI-generated audience interests → flexible_spec
        if (draft.audienceInterests && draft.audienceInterests.length > 0) {
            targeting.flexible_spec = [{ interests: draft.audienceInterests.map(i => ({ id: i.id, name: i.name })) }]
            console.log(`[Meta] Applying ${draft.audienceInterests.length} audience interests:`, draft.audienceInterests.map(i => i.name).join(', '))
        }

        if (draft.geoLocations) {
            targeting.geo_locations = {}
            if (draft.geoLocations.countries?.length) targeting.geo_locations.countries = draft.geoLocations.countries
            if (draft.geoLocations.regions?.length) targeting.geo_locations.regions = draft.geoLocations.regions.map(r => ({ key: r.key }))
            if (draft.geoLocations.cities?.length) targeting.geo_locations.cities = draft.geoLocations.cities.map(c => ({ key: c.key, radius: c.radius, distance_unit: c.distance_unit }))
            if (draft.geoLocations.custom_locations?.length) targeting.geo_locations.custom_locations = draft.geoLocations.custom_locations
            // Ensure at least one geo is set
            if (!targeting.geo_locations.countries && !targeting.geo_locations.regions && !targeting.geo_locations.cities && !targeting.geo_locations.custom_locations) {
                targeting.geo_locations = { countries: ['US'] }
            }
        } else {
            targeting.geo_locations = { countries: ['US'] }
        }

        // Advantage+ Audience — Meta expands beyond defined targeting if it finds better results
        if (draft.advantageAudience) {
            targeting.targeting_automation = { advantage_audience: 1 }
            // Con Advantage+ audience, Meta NO permite age_max < 65 como límite duro
            // (la edad menor solo se acepta como "sugerencia"). Forzamos 65 para evitar
            // el error 1870189 ("la edad máxima no se puede establecer en menos de 65").
            targeting.age_max = 65
        }

        // Bid strategy
        let metaBidStrategy = 'LOWEST_COST_WITHOUT_CAP'
        const adSetExtra: any = {}
        if (draft.bidStrategy === 'cost_cap' && draft.bidCapAmount && draft.bidCapAmount > 0) {
            metaBidStrategy = 'COST_CAP'
            adSetExtra.bid_amount = Math.round(draft.bidCapAmount * 100) // cents
        } else if (draft.bidStrategy === 'min_roas' && draft.minRoasTarget && draft.minRoasTarget > 0) {
            metaBidStrategy = 'LOWEST_COST_WITH_MIN_ROAS'
            adSetExtra.roas_average_floor = Math.round(draft.minRoasTarget * 100) // e.g. 200 = 2.0x ROAS
        }

        const adSetPayload: any = {
            name: `${draft.name} — Ad Set`,
            campaign_id: campaignId,
            billing_event: billingEvent,
            optimization_goal: optimizationGoal,
            bid_strategy: metaBidStrategy,
            // FIX: Math.round ensures integer cents (Meta rejects floats)
            daily_budget: Math.round(draft.budgetAmount * 100),
            targeting,
            status: 'ACTIVE',
            access_token: accessToken,
            ...adSetExtra
        }
        if (destinationType) adSetPayload.destination_type = destinationType
        if (promotedObject) adSetPayload.promoted_object = promotedObject

        // Bug #1 fix: if adset creation fails, delete the orphaned campaign in Meta
        let adSetId!: string
        try {
            const adSet = await this.api.post<any>(`/${this.apiVersion}/${adAccountId}/adsets`, adSetPayload)
            adSetId = adSet.id
        } catch (err) {
            // Rollback: delete the campaign we just created so it doesn't stay orphaned in Meta
            try {
                await this.api.post<any>(`/${this.apiVersion}/${campaignId}`, {
                    status: 'DELETED',
                    access_token: accessToken
                })
                console.log(`[Meta] Rolled back orphaned campaign ${campaignId}`)
            } catch (rollbackErr) {
                console.error(`[Meta] Rollback failed for campaign ${campaignId}:`, rollbackErr)
            }
            throw err
        }

        // 3 & 4. Create Creatives + Ads (one per copy variation, or one carousel ad)
        // Bug #7 fix: errors on individual ads are caught — publish succeeds if at least 1 ad is created
        const isWhatsApp = messagingDest === 'WHATSAPP'
        const isMessenger = messagingDest === 'MESSENGER'
        const isInstagram = messagingDest === 'INSTAGRAM'
        const copies = draft.copies?.length
            ? draft.copies
            : [{ primaryText: draft.primaryText, headline: draft.headline, description: draft.description, imageUrl: draft.assets?.[0]?.storageUrl, metaVideoId: draft.assets?.[0]?.metaVideoId }]

        let firstAdId: string | undefined
        let adsCreated = 0
        const adErrors: string[] = []

        // El carousel SOLO soporta imágenes. Si hay algún video, caemos a anuncios
        // individuales (single) para no mandar un video como si fuera imagen (roto).
        const hasVideo = copies.some((c: any) => c.metaVideoId)
            || (draft.assets || []).some((a: any) => a.type === 'VIDEO' || a.metaVideoId)
        if (draft.adFormat === 'carousel' && hasVideo) {
            console.warn('[Meta] Carousel con video no soportado → se publica como anuncios individuales (single).')
        }

        // ── CAROUSEL FORMAT ────────────────────────────────────────────────────
        if (draft.adFormat === 'carousel' && !isMessagingAd && !hasVideo) {
            try {
                const pageFallbackUrl = `https://www.facebook.com/${draft.providerPageId}`
                const cardUrl = draft.destinationUrl || pageFallbackUrl

                // Meta requires minimum 2 cards in a carousel.
                // If only 1 copy/creative exists, duplicate it so the carousel is valid.
                const carouselCopies = copies.length >= 2 ? copies : [...copies, ...copies].slice(0, 2)

                const childAttachments = carouselCopies.map((copy, idx) => {
                    const imageUrl = copy.imageUrl || draft.assets?.[idx]?.storageUrl || draft.assets?.[0]?.storageUrl
                    return {
                        link: cardUrl,
                        ...(imageUrl ? { picture: imageUrl } : {}),
                        name: copy.headline || draft.headline || '',
                        description: copy.description || draft.description || '',
                        call_to_action: { type: draft.cta || 'LEARN_MORE', value: { link: cardUrl } }
                    }
                })

                const carouselLinkData: any = {
                    link: cardUrl,
                    message: carouselCopies[0]?.primaryText || draft.primaryText || '',
                    child_attachments: childAttachments,
                    multi_share_optimized: true,
                    multi_share_end_card: false
                }

                const carouselCreativePayload: any = {
                    name: `${draft.name} — Carousel`,
                    object_story_spec: {
                        page_id: draft.providerPageId,
                        link_data: carouselLinkData
                    },
                    access_token: accessToken
                }
                if (draft.advantageCreative) {
                    carouselCreativePayload.degrees_of_freedom_spec = {
                        creative_features_spec: {
                            standard_enhancements: { enroll_status: 'OPT_IN' }
                        }
                    }
                }

                const carouselCreative = await this.api.post<any>(`/${this.apiVersion}/${adAccountId}/adcreatives`, carouselCreativePayload)
                const carouselAdPayload: any = {
                    name: `${draft.name} — Carousel Ad`,
                    adset_id: adSetId,
                    creative: { creative_id: carouselCreative.id },
                    status: 'ACTIVE',
                    access_token: accessToken
                }
                if (draft.pixelId) {
                    carouselAdPayload.tracking_specs = [{ 'action.type': 'offsite_conversion', 'fb_pixel': [draft.pixelId] }]
                }
                const carouselAd = await this.api.post<any>(`/${this.apiVersion}/${adAccountId}/ads`, carouselAdPayload)
                firstAdId = carouselAd.id
                adsCreated = 1
            } catch (err: any) {
                adErrors.push(err?.message || String(err))
            }

            if (adsCreated === 0) {
                throw new Error(`No se pudo crear el anuncio carrusel — ${adErrors[0] || 'error desconocido'}`)
            }

            return {
                providerCampaignId: campaignId,
                providerGroupId: adSetId,
                providerAdId: firstAdId
            }
        }

        // ── SINGLE FORMAT (default) ────────────────────────────────────────────
        for (let i = 0; i < copies.length; i++) {
            try {
                const copy = copies[i]
                const assetUrl = copy.imageUrl || draft.assets?.[i]?.storageUrl || draft.assets?.[0]?.storageUrl
                const isVideo = /\.(mp4|mov|avi|mkv|webm|m4v)(\?|$)/i.test(assetUrl || '')

                let creativePayload: any

                if (i === 0 && draft.providerPostId) {
                    creativePayload = {
                        name: `${draft.name} — Post`,
                        object_story_id: draft.providerPostId,
                        access_token: accessToken
                    }
                } else if (isVideo && assetUrl) {
                    // Usar el video PRE-SUBIDO (subido a Meta al cargar el archivo) si está disponible:
                    // evita re-subir y esperar el procesamiento al publicar → publicación casi instantánea.
                    // El metaVideoId va en el copy (alineado con imageUrl del mismo creative); assets es fallback.
                    let metaVideoId: string | undefined = copy.metaVideoId || draft.assets?.[i]?.metaVideoId
                    if (metaVideoId) {
                        console.log(`[Meta] Usando video pre-subido ${metaVideoId} para ad ${i + 1} (sin re-subir)`)
                    } else {
                        // Fallback: no se pre-subió → subir ahora (flujo anterior)
                        console.log(`[Meta] Uploading video to Meta for ad ${i + 1}:`, assetUrl)
                        const videoUpload = await this.api.post<any>(`/${this.apiVersion}/${adAccountId}/advideos`, {
                            file_url: assetUrl,
                            access_token: accessToken
                        })
                        metaVideoId = videoUpload.id
                        if (!metaVideoId) throw new Error('Meta no devolvió un video_id al subir el video')
                    }

                    // Poll until video is ready (Meta processes async — max 90s).
                    // Chequea ANTES de dormir: si se pre-subió y ya está listo → sale al instante.
                    console.log(`[Meta] Waiting for video ${metaVideoId} to be ready...`)
                    const deadline = Date.now() + 90_000
                    let firstCheck = true
                    while (Date.now() < deadline) {
                        if (!firstCheck) await new Promise(r => setTimeout(r, 4000))
                        firstCheck = false
                        const statusRes = await this.api.get<any>(`/${this.apiVersion}/${metaVideoId}`, {
                            params: { fields: 'status', access_token: accessToken }
                        })
                        const vs = statusRes?.status?.video_status
                        console.log(`[Meta] Video ${metaVideoId} status: ${vs}`)
                        if (vs === 'ready') break
                        if (vs === 'error') throw new Error('Meta reportó un error procesando el video. Verifica que el archivo de video sea válido (MP4, H.264, máx 4GB).')
                    }
                    if (Date.now() >= deadline) throw new Error('El video tardó demasiado en procesarse en Meta. Intenta con un archivo más pequeño.')

                    // Obtener thumbnail auto-generado por Meta (requerido en video_data)
                    const thumbRes = await this.api.get<any>(`/${this.apiVersion}/${metaVideoId}`, {
                        params: { fields: 'picture', access_token: accessToken }
                    })
                    const thumbnailUrl: string | undefined = thumbRes?.picture

                    const pageFallbackUrl = `https://www.facebook.com/${draft.providerPageId}`
                    const videoData: any = {
                        video_id: metaVideoId,
                        message: copy.primaryText || draft.primaryText || '',
                        ...(thumbnailUrl ? { image_url: thumbnailUrl } : {}),
                    }
                    if (copy.headline || draft.headline) videoData.title = copy.headline || draft.headline

                    if (isWhatsApp) {
                        videoData.call_to_action = {
                            type: 'WHATSAPP_MESSAGE',
                            value: { app_destination: 'WHATSAPP' }
                        }
                        // For video, page_welcome_message goes inside video_data
                        const welcomeMsg = this.buildPageWelcomeMessage(draft.welcomeMessage)
                        if (welcomeMsg) videoData.page_welcome_message = welcomeMsg
                    } else if (isMessenger) {
                        videoData.call_to_action = { type: 'MESSAGE_PAGE', value: { app_destination: 'MESSENGER' } }
                    } else if (isInstagram) {
                        videoData.call_to_action = { type: 'INSTAGRAM_MESSAGE', value: { app_destination: 'INSTAGRAM_DIRECT' } }
                    } else {
                        const destUrl = draft.destinationUrl || pageFallbackUrl
                        videoData.call_to_action = { type: draft.cta || 'LEARN_MORE', value: { link: destUrl } }
                    }

                    creativePayload = {
                        name: `${draft.name} — Creative ${i + 1}`,
                        object_story_spec: {
                            page_id: draft.providerPageId,
                            video_data: videoData
                        },
                        access_token: accessToken
                    }
                } else {
                    // Image ad flow
                    const linkData: any = {
                        message: copy.primaryText || draft.primaryText || ''
                    }
                    if (copy.headline || draft.headline) linkData.name = copy.headline || draft.headline
                    if (copy.description || draft.description) linkData.description = copy.description || draft.description
                    if (assetUrl) linkData.picture = assetUrl

                    const pageFallbackUrl = `https://www.facebook.com/${draft.providerPageId}`

                    if (isWhatsApp) {
                        // Official Meta docs: link must be https://api.whatsapp.com/send for WhatsApp ads
                        linkData.link = 'https://api.whatsapp.com/send'
                        linkData.call_to_action = {
                            type: 'WHATSAPP_MESSAGE',
                            value: { app_destination: 'WHATSAPP' }
                        }
                        // page_welcome_message goes INSIDE link_data (not top-level creative)
                        const welcomeMsg = this.buildPageWelcomeMessage(draft.welcomeMessage)
                        if (welcomeMsg) linkData.page_welcome_message = welcomeMsg
                    } else if (isMessenger) {
                        linkData.link = pageFallbackUrl
                        linkData.call_to_action = { type: 'MESSAGE_PAGE', value: { app_destination: 'MESSENGER' } }
                    } else if (isInstagram) {
                        linkData.link = pageFallbackUrl
                        linkData.call_to_action = { type: 'INSTAGRAM_MESSAGE', value: { app_destination: 'INSTAGRAM_DIRECT' } }
                    } else {
                        const destUrl = draft.destinationUrl || pageFallbackUrl
                        linkData.link = destUrl
                        linkData.call_to_action = { type: draft.cta || 'LEARN_MORE', value: { link: destUrl } }
                    }

                    creativePayload = {
                        name: `${draft.name} — Creative ${i + 1}`,
                        object_story_spec: {
                            page_id: draft.providerPageId,
                            link_data: linkData
                        },
                        access_token: accessToken
                    }
                }

                // Advantage+ Creative — Meta auto-enhances creatives (only for image/non-messaging ads)
                if (draft.advantageCreative && !isMessagingAd && !draft.providerPostId) {
                    creativePayload.degrees_of_freedom_spec = {
                        creative_features_spec: {
                            standard_enhancements: { enroll_status: 'OPT_IN' }
                        }
                    }
                }

                const creative = await this.api.post<any>(`/${this.apiVersion}/${adAccountId}/adcreatives`, creativePayload)

                const adPayload: any = {
                    name: `${draft.name} — Ad ${i + 1}`,
                    adset_id: adSetId,
                    creative: { creative_id: creative.id },
                    status: 'ACTIVE',
                    access_token: accessToken
                }
                if (draft.pixelId) {
                    adPayload.tracking_specs = [{ 'action.type': 'offsite_conversion', 'fb_pixel': [draft.pixelId] }]
                }

                const ad = await this.api.post<any>(`/${this.apiVersion}/${adAccountId}/ads`, adPayload)
                if (!firstAdId) firstAdId = ad.id
                adsCreated++
            } catch (adErr: any) {
                const msg = adErr?.message || adErr?.error?.message || String(adErr)
                console.error(`[Meta] Failed to create ad ${i + 1}/${copies.length}:`, adErr)
                adErrors.push(`Variación ${i + 1}: ${msg}`)
                // Continue — try remaining copies
            }
        }

        if (adsCreated === 0) {
            const detail = adErrors.length > 0 ? ` — ${adErrors[0]}` : ''
            throw new Error(`No se pudo crear ningún anuncio${detail}`)
        }

        return {
            providerCampaignId: campaignId,
            providerGroupId: adSetId,
            providerAdId: firstAdId
        }
    }

    async pauseCampaign(accessToken: string, adAccountId: string, providerCampaignId: string): Promise<boolean> {
        const res = await this.api.post<any>(`/${this.apiVersion}/${providerCampaignId}`, {
            status: 'PAUSED',
            access_token: accessToken
        })
        if (res.success === false) throw new Error('Meta no pudo pausar la campaña. Verifica que la campaña exista y tengas permisos.')
        return true
    }

    async resumeCampaign(accessToken: string, adAccountId: string, providerCampaignId: string): Promise<boolean> {
        const res = await this.api.post<any>(`/${this.apiVersion}/${providerCampaignId}`, {
            status: 'ACTIVE',
            access_token: accessToken
        })
        if (res.success === false) throw new Error('Meta no pudo reanudar la campaña. Verifica que la campaña exista y tengas permisos.')
        return true
    }

    async deleteCampaign(accessToken: string, adAccountId: string, providerCampaignId: string): Promise<boolean> {
        // En Meta, poner la campaña en estado DELETED la elimina.
        const res = await this.api.post<any>(`/${this.apiVersion}/${providerCampaignId}`, {
            status: 'DELETED',
            access_token: accessToken
        })
        if (res.success === false) throw new Error('Meta no pudo eliminar la campaña. Verifica que exista y tengas permisos.')
        return true
    }

    async fetchDailyMetrics(accessToken: string, adAccountId: string, from: Date, to: Date): Promise<MetricRow[]> {
        // Use yesterday as upper bound — Meta insights for today are usually incomplete
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)
        const untilDate = to > yesterday ? yesterday : to

        const data = await this.api.get<any>(`/${this.apiVersion}/${adAccountId}/insights`, {
            params: {
                time_range: JSON.stringify({
                    since: from.toISOString().split('T')[0],
                    until: untilDate.toISOString().split('T')[0]
                }),
                fields: [
                    'campaign_id',
                    'spend',
                    'impressions',
                    'clicks',
                    'inline_link_clicks',
                    'reach',
                    'frequency',
                    'actions',
                    'video_thruplay_watched_actions',
                    'date_start',
                ].join(','),
                level: 'campaign',
                time_increment: '1',
                access_token: accessToken
            }
        })

        return (data.data || []).map((row: any) => {
            const actions: Array<{ action_type: string; value: string }> = row.actions || []

            const getAction = (...types: string[]) =>
                actions.filter(a => types.includes(a.action_type))
                       .reduce((sum, a) => sum + (parseInt(a.value) || 0), 0)

            const purchases     = getAction('offsite_conversion.fb_pixel_purchase', 'purchase')
            const leads         = getAction('offsite_conversion.fb_pixel_lead', 'lead')
            const addToCart     = getAction('offsite_conversion.fb_pixel_add_to_cart')
            const viewContent   = getAction('offsite_conversion.fb_pixel_view_content')
            const initiateCheckout = getAction('offsite_conversion.fb_pixel_initiate_checkout')

            // WhatsApp + Messenger conversations
            const conversations = getAction(
                'onsite_conversion.messaging_conversation_started_7d',
                'onsite_conversion.messaging_conversation_started_1d',
            )
            const messagingReplies = getAction('onsite_conversion.messaging_first_reply')

            // Post engagement: likes, comments, shares, reactions
            const postEngagement = getAction(
                'post_engagement',
                'post_reaction',
                'comment',
                'like',
                'post',
            )

            // Landing page views (tracked after link click)
            const landingPageViews = getAction('landing_page_view')

            // Video 3-second views
            const videoThruplay = (row.video_thruplay_watched_actions || []) as Array<{ action_type: string; value: string }>
            const videoViews = getAction('video_view') +
                videoThruplay.reduce((sum: number, a: { value: string }) => sum + (parseInt(a.value) || 0), 0)

            const impressions = parseInt(row.impressions) || 0
            const reach       = parseInt(row.reach) || 0

            return {
                providerCampaignId: row.campaign_id,
                date: new Date(row.date_start),
                spend: parseFloat(row.spend) || 0,
                impressions,
                clicks: parseInt(row.clicks) || 0,
                linkClicks: parseInt(row.inline_link_clicks) || 0,
                reach,
                frequency: reach > 0 ? parseFloat((impressions / reach).toFixed(2)) : 0,
                conversions: purchases + leads,
                purchases,
                leads,
                addToCart,
                viewContent,
                initiateCheckout,
                conversations,
                messagingReplies,
                postEngagement,
                videoViews,
                landingPageViews,
            }
        })
    }

    async searchLocations(accessToken: string, query: string, type: string = 'adgeolocation'): Promise<any[]> {
        const data = await this.api.get<any>(`/${this.apiVersion}/search`, {
            params: {
                type: type,
                q: query,
                // Solo regiones/departamentos (no ciudades): en Bolivia = los 9 departamentos,
                // en México/Argentina = estados, etc. Es el nivel que segmenta bien en Meta.
                location_types: JSON.stringify(['region']),
                access_token: accessToken
            }
        })

        return (data.data || []).map((item: any) => ({
            key: item.key,
            name: item.name,
            type: item.type,
            countryCode: item.country_code,
            countryName: item.country_name,
            region: item.region
        }))
    }
}
