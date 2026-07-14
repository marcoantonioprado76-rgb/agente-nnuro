export const dynamic = 'force-dynamic'
export const maxDuration = 120 // 2 minutes — needed for video upload + Meta processing wait
import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/ads/encryption'
import { AdapterFactory } from '@/lib/ads/factory'
import { supabaseAdmin } from '@/lib/supabase'
import { generateAudienceInterests, filterAudienceInterests } from '@/lib/ads/openai-ads'
import { MetaAdapter } from '@/lib/ads/adapters/meta'
import { resolveAdsKey, logAiUsage } from '@/lib/ai-credits'

const BUCKET = 'ad-creatives'

const ENC_KEY = process.env.ADS_ENCRYPTION_KEY
if (!ENC_KEY) throw new Error('ADS_ENCRYPTION_KEY env var is not set')

export async function POST(req: Request, { params }: { params: { id: string } }) {
    // Read optional overrides from request body (advantageAudience, advantageCreative, adFormat, bidStrategy, bidCapAmount, minRoasTarget)
    let bodyOverrides: any = {}
    try { bodyOverrides = await req.clone().json() } catch { /* no body is fine */ }
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const campaign = await (prisma as any).adCampaignV2.findFirst({
        where: { id: params.id, userId: user.id },
        include: {
            brief: true,
            strategy: true,
            connectedAccount: {
                include: { integration: { include: { token: true } } }
            },
            creatives: { orderBy: { slotIndex: 'asc' } }
        }
    })

    if (!campaign) return NextResponse.json({ error: 'Campaña no encontrada' }, { status: 404 })

    // Fusionar los campos nuevos del brief (ai_data) → la segmentación de intereses
    // usa benefits, targetCustomer, offerType, category. Con guarda (no rompe si faltan).
    if (campaign.brief?.id) {
        try {
            const rows: any[] = await prisma.$queryRawUnsafe(
                'SELECT category, ai_data FROM business_briefs WHERE id = $1::uuid LIMIT 1', campaign.brief.id,
            )
            if (rows?.[0]) {
                if (rows[0].category) campaign.brief.category = rows[0].category
                let ai = rows[0].ai_data
                if (typeof ai === 'string') { try { ai = JSON.parse(ai) } catch { ai = null } }
                if (ai && typeof ai === 'object' && !Array.isArray(ai)) Object.assign(campaign.brief, ai)
            }
        } catch (e) { console.warn('[Publish] ai_data:', e instanceof Error ? e.message : e) }
    }

    // All field validations BEFORE acquiring the lock so we never leave status stuck in PUBLISHING
    if (!campaign.connectedAccount) {
        return NextResponse.json({ error: 'Selecciona una cuenta publicitaria primero' }, { status: 400 })
    }
    if (!campaign.connectedAccount.integration?.token) {
        return NextResponse.json({ error: 'Reconecta tu cuenta de Meta/TikTok/Google' }, { status: 400 })
    }

    // Validate required fields per destination (foto de la campaña; respaldo a estrategia)
    const dest = campaign.destination ?? campaign.strategy?.destination
    // All Meta campaigns require a Facebook page to create ad creatives
    if (campaign.platform === 'META' && !campaign.pageId) {
        return NextResponse.json({ error: 'Selecciona una Página de Facebook. Es obligatoria para todos los anuncios de Meta.' }, { status: 400 })
    }
    if (dest === 'whatsapp' && !campaign.whatsappNumber) {
        return NextResponse.json({ error: 'Selecciona un número de WhatsApp Business para esta campaña' }, { status: 400 })
    }
    if (['website'].includes(dest) && !campaign.destinationUrl) {
        return NextResponse.json({ error: 'Ingresa la URL de destino para esta campaña' }, { status: 400 })
    }
    if (!campaign.dailyBudgetUSD || campaign.dailyBudgetUSD <= 0) {
        return NextResponse.json({ error: 'El presupuesto diario debe ser mayor a 0' }, { status: 400 })
    }
    // Ubicación obligatoria: sin ella Meta targetea Estados Unidos por defecto (gasta mal).
    if (!Array.isArray(campaign.locations) || campaign.locations.length === 0) {
        return NextResponse.json({ error: 'Seleccioná dónde vendés (país o ciudades) antes de publicar. Lo podés ajustar en la campaña.' }, { status: 400 })
    }

    // Atomic lock: only transition to PUBLISHING if current status is DRAFT, FAILED, PUBLISHED o READY.
    // REAPER: también re-reclama una campaña COLGADA en PUBLISHING hace más de 5 minutos
    // (si el proceso murió a mitad y quedó trabada) → así el usuario puede reintentar.
    // updateMany returns count=0 if another concurrent request already claimed it.
    const STALE_PUBLISHING = new Date(Date.now() - 5 * 60 * 1000)
    const locked = await (prisma as any).adCampaignV2.updateMany({
        where: {
            id: params.id, userId: user.id,
            OR: [
                { status: { in: ['DRAFT', 'FAILED', 'PUBLISHED', 'READY'] } },
                { status: 'PUBLISHING', updatedAt: { lt: STALE_PUBLISHING } },
            ],
        },
        data: { status: 'PUBLISHING' }
    })
    if (locked.count === 0) {
        const current = await (prisma as any).adCampaignV2.findUnique({ where: { id: params.id }, select: { status: true } })
        if (current?.status === 'PUBLISHING') return NextResponse.json({ error: 'Esta campaña ya está siendo publicada. Espera unos segundos e intenta de nuevo.' }, { status: 400 })
        return NextResponse.json({ error: `No se puede publicar la campaña (estado: ${current?.status || 'desconocido'}). Recarga la página e intenta de nuevo.` }, { status: 400 })
    }

    try {
        const adapter = AdapterFactory.getAdapter(campaign.platform)

        let accessToken: string
        try {
            accessToken = decrypt(campaign.connectedAccount.integration.token.accessTokenEncrypted, ENC_KEY!)
        } catch (e: any) {
            console.error('[Publish] Token decryption failed:', e?.message)
            throw new Error('No se pudo leer el token de acceso. Reconecta tu cuenta desde Integraciones.')
        }

        // Instagram Direct requiere una cuenta de Instagram conectada a la Página → validar antes.
        if (campaign.platform === 'META' && dest === 'instagram' && campaign.pageId) {
            const igId = await (adapter as MetaAdapter).getPageInstagramId(accessToken, campaign.pageId)
            if (!igId) {
                throw new Error('Conectá una cuenta de Instagram a tu Página de Facebook para publicar anuncios de Instagram. Ve a Configuración de la Página → Cuentas vinculadas → Instagram.')
            }
        }

        // FIX: Map all strategy objectives to correct Meta OUTCOME_* values
        const objectiveMap: Record<string, string> = {
            conversions: 'OUTCOME_SALES',
            leads: 'OUTCOME_LEADS',
            traffic: 'OUTCOME_TRAFFIC',
            awareness: 'OUTCOME_AWARENESS',
            engagement: 'OUTCOME_ENGAGEMENT',
            app_promotion: 'OUTCOME_APP_PROMOTION',
        }
        const metaObjective = objectiveMap[campaign.objective ?? campaign.strategy?.objective] || 'OUTCOME_TRAFFIC'

        // Parse locations: "CO" → país, "city:KEY:Name" → ciudad, "region:KEY:Name" → departamento, "cc:CO:Name" → legacy (país)
        const countries: string[] = []
        const cities: { key: string; radius: number; distance_unit: string }[] = []
        const regions: { key: string }[] = []
        for (const loc of campaign.locations as string[]) {
            if (loc.startsWith('city:')) {
                const key = loc.split(':')[1]
                if (key) cities.push({ key, radius: 25, distance_unit: 'kilometer' })
            } else if (loc.startsWith('region:')) {
                // Departamento/región — segmenta de verdad
                const key = loc.split(':')[1]
                if (key) regions.push({ key })
            } else if (loc.startsWith('cc:')) {
                // Format legacy: "cc:CO:Bogotá" — colapsa al país
                const countryCode = loc.split(':')[1]
                if (countryCode?.length === 2 && !countries.includes(countryCode.toUpperCase())) {
                    countries.push(countryCode.toUpperCase())
                }
            } else if (loc.length === 2) {
                countries.push(loc.toUpperCase())
            }
        }
        const geoLocations = (countries.length > 0 || cities.length > 0 || regions.length > 0)
            ? {
                ...(countries.length > 0 ? { countries } : {}),
                ...(regions.length > 0 ? { regions } : {}),
                ...(cities.length > 0 ? { cities } : {})
            }
            : undefined

        // FIX: pass all creative copies so the adapter creates one ad per variation
        // Only include mediaUrl if it's a real HTTP URL (never blob:// or null)
        const isValidUrl = (url: string | null) => {
            if (!url) return false
            try { const u = new URL(url); return u.protocol === 'http:' || u.protocol === 'https:' } catch { return false }
        }
        const creativeCopies = campaign.creatives
            .filter((c: any) => c.primaryText)
            .map((c: any) => ({
                primaryText: c.primaryText || '',
                headline: c.headline || '',
                description: c.description || '',
                imageUrl: isValidUrl(c.mediaUrl) ? c.mediaUrl : undefined,
                // Video pre-subido a Meta — va junto al imageUrl del MISMO creative (alineado)
                ...(c.metaVideoId ? { metaVideoId: c.metaVideoId } : {}),
                ...(c.metaMediaStatus ? { metaMediaStatus: c.metaMediaStatus } : {}),
            }))

        const messengerDestination = dest === 'whatsapp'
            ? 'WHATSAPP' as const
            : dest === 'messenger'
                ? 'MESSENGER' as const
                : dest === 'instagram'
                    ? 'INSTAGRAM' as const
                    : undefined

        // ── AI Audience Segmentation (Meta only) ──────────────────────────────
        // Generate interest keywords from the brief with OpenAI, then resolve
        // each keyword to a real Meta interest ID via the Targeting Search API.
        let audienceInterests: Array<{ id: string; name: string }> = []
        if (campaign.platform === 'META') {
            let audienceError = 'No se pudieron generar intereses de audiencia. Verifica tu API Key de OpenAI en Configuración → IA.'
            try {
                // Key personal del usuario o créditos globales del admin
                const resolvedKey = await resolveAdsKey(user.id)
                if (!resolvedKey) {
                    audienceError = 'Configura tu API Key de OpenAI en Configuración → IA (o activá créditos de IA) para publicar campañas de Meta con segmentación de audiencia.'
                } else {
                    const oaiKey = resolvedKey.key
                    const oaiCfg = await (prisma as any).openAIConfig.findUnique({ where: { userId: user.id }, select: { model: true } })
                    const genModel = 'gpt-5.1' // intereses con gpt-5.1 (estilo Andromeda)
                    const filterModel = oaiCfg?.model || 'gpt-4o-mini'
                    const meterAudience = (model: string) => (p: number, c: number) => {
                        if (resolvedKey.isGlobal) logAiUsage({ userId: resolvedKey.userId, service: 'ads-audience', model, promptTokens: p, completionTokens: c }).catch(() => {})
                    }
                    const keywords = await generateAudienceInterests(campaign.brief, oaiKey, genModel, meterAudience(genModel))
                    console.log(`[Publish] AI generated ${keywords.length} interest keywords:`, keywords.join(', '))

                    const metaAdapter = adapter as MetaAdapter
                    const resolvedAll = await Promise.allSettled(
                        keywords.map(kw => metaAdapter.searchTargetingInterests(accessToken, kw))
                    )
                    // Flatten fulfilled results only, deduplicate by id, cap at 10
                    const seen = new Set<string>()
                    for (const result of resolvedAll) {
                        if (result.status !== 'fulfilled') continue
                        for (const interest of result.value) {
                            if (!seen.has(interest.id)) {
                                seen.add(interest.id)
                                audienceInterests.push(interest)
                            }
                        }
                    }
                    // Deduplicate by id, cap candidates before filtering
                    audienceInterests = audienceInterests.slice(0, 40)
                    console.log(`[Publish] Resolved ${audienceInterests.length} raw Meta interest candidates`)

                    // AI filtering step — remove irrelevant results (e.g. "Acne Studios" for skincare)
                    audienceInterests = await filterAudienceInterests(campaign.brief, audienceInterests, oaiKey, filterModel, meterAudience(filterModel))
                    audienceInterests = audienceInterests.slice(0, 15)
                    console.log(`[Publish] After AI filter: ${audienceInterests.length} Meta interests:`, audienceInterests.map(i => i.name).join(', '))
                    if (audienceInterests.length === 0) {
                        audienceError = 'Meta no encontró intereses reales para las keywords generadas por IA. Intenta enriquecer el Brief de tu negocio con más detalles.'
                    }
                }
            } catch (e: any) {
                console.error('[Publish] Audience interest generation failed:', e)
                audienceError = e?.message || audienceError
            }

            if (audienceInterests.length === 0) {
                // No interests found — proceed with broad targeting (Meta Advantage+)
                // The adapter simply omits flexible_spec which is valid for all objectives
                console.warn('[Publish] No audience interests resolved — publishing with broad targeting:', audienceError)
            }
        }

        // Edad/género del brief (clamp a los límites de Meta: 18-65). Si no hay → undefined (amplio).
        const briefSeg = campaign.brief as any
        const segAgeMin = briefSeg.targetAgeMin ? Math.max(18, Math.min(65, Number(briefSeg.targetAgeMin))) : undefined
        const segAgeMaxRaw = briefSeg.targetAgeMax ? Math.max(18, Math.min(65, Number(briefSeg.targetAgeMax))) : undefined
        // Asegurar age_max >= age_min
        const segAgeMax = (segAgeMin && segAgeMaxRaw && segAgeMaxRaw < segAgeMin) ? segAgeMin : segAgeMaxRaw
        const segGender = briefSeg.targetGender === 'male' ? 'MALE' : briefSeg.targetGender === 'female' ? 'FEMALE' : undefined

        const result = await adapter.publishFromDraft(
            accessToken,
            campaign.connectedAccount.providerAccountId,
            {
                name: campaign.name,
                objective: metaObjective,
                budgetType: 'DAILY',
                budgetAmount: campaign.dailyBudgetUSD,
                geoLocations,
                // Edad y género del cliente ideal del brief (segmentación real, no 18-65 fijo)
                ...(segAgeMin ? { ageMin: segAgeMin } : {}),
                ...(segAgeMax ? { ageMax: segAgeMax } : {}),
                ...(segGender ? { gender: segGender } : {}),
                // Fallback single-copy fields (used if copies array is empty)
                primaryText: campaign.creatives[0]?.primaryText || campaign.brief?.description || campaign.brief?.name || 'Descubrí nuestro producto',
                headline: campaign.creatives[0]?.headline || campaign.brief?.name || '',
                description: campaign.creatives[0]?.description || campaign.brief?.valueProposition || '',
                cta: (() => {
                    // Map brief CTA text → Meta CTA enum
                    const ctaMap: Record<string, string> = {
                        'Comprar ahora': 'SHOP_NOW',
                        'Comprar': 'SHOP_NOW',
                        'Ordenar ahora': 'ORDER_NOW',
                        'Registrarse': 'SIGN_UP',
                        'Suscribirse': 'SUBSCRIBE',
                        'Descargar': 'DOWNLOAD',
                        'Obtener oferta': 'GET_OFFER',
                        'Solicitar cotización': 'GET_QUOTE',
                        'Contactar': 'CONTACT_US',
                        'Enviar mensaje': 'SEND_MESSAGE',
                        'Más información': 'LEARN_MORE',
                        'Ver más': 'LEARN_MORE',
                        'Aplicar ahora': 'APPLY_NOW',
                    }
                    const briefCta = campaign.brief.mainCTA as string | undefined
                    if (briefCta && ctaMap[briefCta]) return ctaMap[briefCta]
                    // Objective-based fallback
                    const obj = (campaign.objective ?? campaign.strategy?.objective) as string
                    const dest = (campaign.destination ?? campaign.strategy?.destination) as string
                    if (dest === 'whatsapp' || dest === 'messenger' || dest === 'instagram') return 'SEND_MESSAGE'
                    if (obj === 'leads') return 'SIGN_UP'
                    if (obj === 'conversions') return 'SHOP_NOW'
                    if (obj === 'engagement') return 'LEARN_MORE'
                    return 'LEARN_MORE'
                })(),
                providerPageId: campaign.pageId || undefined,
                providerWhatsAppNumber: campaign.whatsappNumber || undefined,
                welcomeMessage: campaign.welcomeMessage || undefined,
                pixelId: campaign.pixelId || undefined,
                destinationUrl: campaign.destinationUrl || undefined,
                messengerDestination,
                // Multi-copy: creates one ad per variation
                copies: creativeCopies.length > 0 ? creativeCopies : undefined,
                assets: campaign.creatives
                    .filter((c: any) => isValidUrl(c.mediaUrl))
                    .map((c: any) => ({
                        type: (c.mediaType?.toUpperCase() || 'IMAGE') as 'IMAGE' | 'VIDEO',
                        storageUrl: c.mediaUrl!,
                        // Video pre-subido a Meta al cargar el archivo → publicar sin esperar
                        ...(c.metaVideoId ? { metaVideoId: c.metaVideoId } : {}),
                        ...(c.metaMediaStatus ? { metaMediaStatus: c.metaMediaStatus } : {}),
                    })),
                // AI audience interests (Meta only — resolved from brief via OpenAI + Meta Targeting Search)
                ...(audienceInterests.length > 0 ? { audienceInterests } : {}),
                // Pass advantageType so Google adapter knows Search/Display/PMax
                ...(campaign.platform === 'GOOGLE_ADS' ? { advantageType: campaign.strategy?.advantageType } : {}),
                // Advantage+ Audience — INTELIGENTE: ON por defecto (Andromeda premia audiencia amplia
                // que la IA expande). El usuario lo puede desactivar desde la UI.
                advantageAudience: bodyOverrides.advantageAudience !== undefined ? Boolean(bodyOverrides.advantageAudience) : true,
                // Advantage+ Creative — auto-enhances creatives via degrees_of_freedom_spec
                ...(bodyOverrides.advantageCreative !== undefined ? { advantageCreative: Boolean(bodyOverrides.advantageCreative) } : {}),
                // Ad format — single (default) or carousel (child_attachments)
                ...(bodyOverrides.adFormat ? { adFormat: bodyOverrides.adFormat } : {}),
                // Bid strategy overrides — from UI
                ...(bodyOverrides.bidStrategy ? { bidStrategy: bodyOverrides.bidStrategy } : {}),
                ...(bodyOverrides.bidCapAmount ? { bidCapAmount: Number(bodyOverrides.bidCapAmount) } : {}),
                ...(bodyOverrides.minRoasTarget ? { minRoasTarget: Number(bodyOverrides.minRoasTarget) } : {})
            } as any
        )

        await (prisma as any).adCampaignV2.update({
            where: { id: params.id },
            data: {
                status: 'PUBLISHED',
                providerCampaignId: result.providerCampaignId,
                providerGroupId: result.providerGroupId || null,
                providerAdId: result.providerAdId || null,
                publishedAt: new Date()
            }
        })

        // Delete uploaded media from Supabase Storage after successful publish
        const storageUrlMarker = `/object/public/${BUCKET}/`
        const storagePaths = campaign.creatives
            .filter((c: any) => c.mediaUrl?.includes(storageUrlMarker))
            .map((c: any) => {
                const idx = c.mediaUrl.indexOf(storageUrlMarker)
                // Strip query params (e.g. ?t=123) so path is clean
                const rawPath = c.mediaUrl.slice(idx + storageUrlMarker.length)
                return rawPath.split('?')[0]
            })
            .filter(Boolean)

        if (storagePaths.length > 0) {
            try {
                const { error: removeErr } = await supabaseAdmin.storage.from(BUCKET).remove(storagePaths)
                if (removeErr) console.warn('[PublishCampaign] Storage remove partial error:', removeErr.message)
                else console.log(`[PublishCampaign] Deleted ${storagePaths.length} file(s) from storage`)
                await (prisma as any).adCreative.updateMany({
                    where: { campaignId: params.id },
                    data: { mediaUrl: null }
                })
            } catch (e) {
                console.warn('[PublishCampaign] Storage cleanup failed (non-fatal):', e)
            }
        }

        return NextResponse.json({ success: true, result })
    } catch (err: any) {
        console.error('[PublishCampaign]', err)

        // Make Meta errors more actionable
        let userMessage = err.message || 'Error al publicar la campaña'
        const msg = userMessage.toLowerCase()
        if (msg.includes('whatsapp') && msg.includes('personal')) {
            userMessage = 'Tu página tiene un WhatsApp personal vinculado. Para anuncios de WhatsApp necesitas una cuenta de WhatsApp Business. Ve a Configuración de la Página → WhatsApp y vincula tu número de WhatsApp Business.'
        } else if (msg.includes('whatsapp') && msg.includes('business')) {
            userMessage = 'Conecta una cuenta de WhatsApp Business a tu Página de Facebook antes de publicar este anuncio. Ve a Configuración de la Página → WhatsApp.'
        } else if (msg.includes('método de pago') || msg.includes('payment')) {
            userMessage = 'Tu cuenta publicitaria no tiene un método de pago válido. Agrega un método de pago en el Administrador de Anuncios de Meta.'
        } else if (msg.includes('permiso') || msg.includes('permission') || msg.includes('autorización')) {
            userMessage = 'Sin permisos suficientes. Reconecta tu cuenta de Meta desde la sección de Integraciones.'
        }

        await (prisma as any).adCampaignV2.update({
            where: { id: params.id },
            data: {
                status: 'FAILED',
                failureReason: userMessage
            }
        })

        return NextResponse.json({ error: userMessage }, { status: 500 })
    }
}
