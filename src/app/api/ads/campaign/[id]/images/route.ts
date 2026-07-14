export const dynamic = 'force-dynamic'
export const maxDuration = 180 // vision (20s) + parallel direction+overlay (15s) + gpt-image-2 premium (90s) = ~125s
import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/ads/encryption'
import { generateAdImage, editAdImageWithReference, analyzeProductImageForAd, generateCreativeDirection, generateTextOverlay, generateCleanAdImagePrompt, type ImageQuality, type ImageSize } from '@/lib/ads/openai-ads'
import { supabaseAdmin } from '@/lib/supabase'
import { resolveAdsKey, logImageUsage } from '@/lib/ai-credits'

const ENC_KEY = process.env.ADS_ENCRYPTION_KEY || ''
const BUCKET = 'ad-creatives'

// Tamaños que ACEPTA gpt-image-2 (1024x1792/1792x1024 son de DALL·E 3 y dan error).
const VALID_SIZES: ImageSize[] = ['1024x1024', '1024x1536', '1536x1024']
const VALID_QUALITIES: ImageQuality[] = ['fast', 'standard', 'premium']

function toEditSize(size: string): ImageSize {
    return VALID_SIZES.includes(size as ImageSize) ? (size as ImageSize) : '1024x1024'
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Key propia (Configuración → IA) o la global del sistema si hay saldo
    const resolvedKey = await resolveAdsKey(user.id)
    if (!resolvedKey) {
        return NextResponse.json({ error: 'Configura tu OpenAI API Key en Configuración → IA, o compra créditos de IA.' }, { status: 400 })
    }
    const apiKey = resolvedKey.key

    const campaign = await (prisma as any).adCampaignV2.findFirst({
        where: { id: params.id, userId: user.id },
        include: { brief: true, strategy: true }
    })
    if (!campaign) return NextResponse.json({ error: 'Campaña no encontrada' }, { status: 404 })

    const body = await req.json()
    const {
        slotIndex = 0,
        creativeId,
        customPrompt,
        quality = 'standard',
        size = '1024x1024',
        referenceImageUrl,
        freePrompt = false, // modo "prompt libre": manda el prompt TAL CUAL a gpt-image-2
    } = body

    // La foto del producto es OBLIGATORIA: todas las imágenes se generan a partir
    // de ella (se mantiene el producto idéntico y solo cambia la escena del brief).
    if (!referenceImageUrl || typeof referenceImageUrl !== 'string' || !referenceImageUrl.startsWith('http')) {
        return NextResponse.json({ error: 'Subí una foto de tu producto: es obligatoria para generar la imagen.' }, { status: 400 })
    }

    const brief = {
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
    }

    try {
        let imageUrl: string

        // ── MODO PROMPT LIBRE (como el generador admin) ──
        // El prompt (escrito o auto-generado por gpt-5.1 según la estrategia) se manda
        // TAL CUAL a gpt-image-2 con la foto del producto. Sin pipeline ni envoltorio.
        if (freePrompt && referenceImageUrl && referenceImageUrl.startsWith('http')) {
            let cleanPrompt = (customPrompt && customPrompt.trim()) ? customPrompt.trim() : ''
            if (!cleanPrompt) {
                cleanPrompt = await generateCleanAdImagePrompt({
                    brief: brief as any,
                    objective: (campaign.objective ?? campaign.strategy?.objective) || 'conversions',
                    slotIndex,
                    apiKey,
                    model: 'gpt-5.1',
                })
            }
            if (!cleanPrompt) cleanPrompt = `Professional single advertising photo of the product as the hero, centered, photorealistic, cinematic 4k, premium ${brief.industry} scene, no collage, minimal or no text.`

            // Mapear calidad → gpt-image. Default 'low' para que sea RÁPIDO (varias en paralelo).
            const gptQuality: 'low' | 'medium' | 'high' = quality === 'premium' ? 'high' : quality === 'standard' ? 'medium' : 'low'
            const imgBuffer = await editAdImageWithReference({
                imageUrl: referenceImageUrl,
                prompt: cleanPrompt,
                apiKey,
                size: toEditSize(size),
                quality: gptQuality,
            })
            const path = `ads/${user.id}/${params.id}/slot-${slotIndex}-free-${Date.now()}.png`
            const { error: uploadErr } = await supabaseAdmin.storage.from(BUCKET).upload(path, imgBuffer, { contentType: 'image/png', upsert: true })
            if (uploadErr) throw new Error(uploadErr.message)
            imageUrl = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl

            if (creativeId) {
                await (prisma as any).adCreative.update({ where: { id: creativeId }, data: { mediaUrl: imageUrl, mediaType: 'image', aiGenerated: true } })
            }
            if (resolvedKey.isGlobal) {
                logImageUsage({ userId: user.id, service: 'ads-image', count: 1, quality: VALID_QUALITIES.includes(quality) ? quality : 'standard', size: VALID_SIZES.includes(size) ? size : '1024x1024' }).catch(() => {})
            }
            return NextResponse.json({ imageUrl, prompt: cleanPrompt })
        }

        if (referenceImageUrl && typeof referenceImageUrl === 'string' && referenceImageUrl.startsWith('http')) {
            const colors = ((brief.brandColors as string[]) || []).slice(0, 3).join(', ') || 'clean neutral tones'
            const style = ((brief.visualStyle as string[]) || []).slice(0, 3).join(', ') || 'modern, professional'
            const value = brief.valueProposition?.substring(0, 120) || ''
            const keyMessages = (brief.keyMessages as string[]) || []
            const keyMsg = keyMessages[slotIndex] || keyMessages[0] || ''

            // Step 1: analyze the product photo and generate creative direction + text overlay in parallel
            const [productDescription, creativeSceneRaw, textOverlayRaw] = await Promise.allSettled([
                analyzeProductImageForAd({ imageUrl: referenceImageUrl, apiKey }),
                generateCreativeDirection({ brief, productDescription: '', slotIndex, apiKey }),
                generateTextOverlay({
                    brief, slotIndex,
                    objective: (campaign.objective ?? campaign.strategy?.objective) || 'conversions',
                    destination: (campaign.destination ?? campaign.strategy?.destination) || 'website',
                    apiKey,
                }),
            ])

            const productDesc = productDescription.status === 'fulfilled' ? productDescription.value : ''
            let creativeScene = creativeSceneRaw.status === 'fulfilled' ? creativeSceneRaw.value : ''
            let textOverlay = textOverlayRaw.status === 'fulfilled' ? textOverlayRaw.value : ''

            if (!creativeScene) {
                creativeScene = `the product as the absolute hero, placed in a stunning ${brief.industry} scene — cinematic lighting, ${colors} color palette, ${style} aesthetic`
            }
            if (!textOverlay) {
                textOverlay = `a single bold 3D text overlay that reads "${(keyMsg || value).substring(0, 20)}" in a prominent position`
            }

            // FIDELIDAD DEL PRODUCTO PRIMERO + enmarcar como "reemplazar solo el fondo".
            // gpt-image-1 regenera toda la imagen; si la escena domina, redibuja el producto.
            // Por eso lideramos con la instrucción de mantenerlo idéntico y lo tratamos como
            // un recorte real pegado en la escena.
            const productFidelity = `CRITICAL — PRESERVE THE PRODUCT: keep the product from the reference image EXACTLY as it is${productDesc ? ` (${productDesc.substring(0, 180)})` : ''}. Identical shape, packaging, label, logo, text, colors and proportions. Do NOT redraw, restyle, recolor, replace, crop out or duplicate the product. Treat it as a real photographed cut-out placed unchanged into the new scene.`

            const scene = (customPrompt && customPrompt.trim()) ? customPrompt.trim() : creativeScene

            // La escena describe SOLO el entorno alrededor del producto (no el producto en sí).
            const prompt = `${productFidelity} Replace ONLY the background and the environment around the product with: ${scene}. ${textOverlay ? `Add ${textOverlay}. ` : ''}Color palette ${colors}, ${style} aesthetic. Photorealistic professional advertising photo, cohesive lighting and shadows so the product looks naturally placed, high quality, no watermarks. Keep a SINGLE product exactly as given.`

            const imgBuffer = await editAdImageWithReference({
                imageUrl: referenceImageUrl,
                prompt,
                apiKey,
                size: toEditSize(size),
            })

            // Upload the result to Supabase Storage
            const path = `ads/${user.id}/${params.id}/slot-${slotIndex}-edit-${Date.now()}.png`
            const { error: uploadErr } = await supabaseAdmin.storage
                .from(BUCKET)
                .upload(path, imgBuffer, { contentType: 'image/png', upsert: true })
            if (uploadErr) throw new Error(uploadErr.message)

            const { data: urlData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path)
            imageUrl = urlData.publicUrl
        } else {
            // No reference image → use gpt-image-2 to generate from scratch
            const imgBuffer = await generateAdImage({
                brief,
                mediaType: campaign.mediaType ?? campaign.strategy?.mediaType,
                slotIndex,
                apiKey,
                customPrompt: customPrompt || undefined,
                quality: VALID_QUALITIES.includes(quality) ? quality : 'standard',
                size: VALID_SIZES.includes(size) ? size : '1024x1024',
            })
            const path = `ads/${user.id}/${params.id}/slot-${slotIndex}-gen-${Date.now()}.png`
            const { error: uploadErr } = await supabaseAdmin.storage
                .from(BUCKET)
                .upload(path, imgBuffer, { contentType: 'image/png', upsert: true })
            if (uploadErr) throw new Error(uploadErr.message)
            const { data: urlData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path)
            imageUrl = urlData.publicUrl
        }

        // Persist to DB if creativeId given
        if (creativeId) {
            await (prisma as any).adCreative.update({
                where: { id: creativeId },
                data: { mediaUrl: imageUrl, mediaType: 'image', aiGenerated: true }
            })
        }

        // Descontar saldo si se usó la key global
        if (resolvedKey.isGlobal) {
            logImageUsage({
                userId: user.id, service: 'ads-image', count: 1,
                quality: VALID_QUALITIES.includes(quality) ? quality : 'standard',
                size: VALID_SIZES.includes(size) ? size : '1024x1024',
            }).catch(() => {})
        }

        return NextResponse.json({ imageUrl })
    } catch (err: any) {
        console.error('[GenerateImage]', err)
        return NextResponse.json({ error: err.message || 'Error al generar la imagen' }, { status: 500 })
    }
}
