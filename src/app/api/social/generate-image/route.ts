export const dynamic = 'force-dynamic'
export const maxDuration = 300 // gpt-image-2 con varias fotos puede tardar; damos margen
import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { resolveOpenAIKey, logImageUsage } from '@/lib/ai-credits'
import { editAdImageWithReference, analyzeProductImageForAd } from '@/lib/ads/openai-ads'
import { supabaseAdmin } from '@/lib/supabase'

const OPENAI_BASE = 'https://api.openai.com/v1'
const IMAGE_MODEL = 'gpt-image-2'
const BUCKET = 'social-media'

// Estilos que puede elegir el usuario → descriptor para el modelo.
const STYLE_MAP: Record<string, string> = {
    natural: 'natural, auténtico, foto real, luz natural suave',
    elegante: 'elegante, premium, sofisticado, minimal, luz cinematográfica suave',
    colorido: 'vibrante, colorido, alegre, energético, paleta de colores viva',
    minimalista: 'minimalista, limpio, mucho espacio en blanco, composición simple',
    calido: 'cálido, acogedor, tonos dorados de atardecer, ambiente emotivo',
}

// Ángulos de CONTENIDO de valor (equivalente a los ángulos publicitarios de Meta Ads,
// pero para contenido orgánico). Rotan para dar variedad ("otra versión").
const CONTENT_ANGLES = [
    'un TIP o consejo útil mostrado de forma visual y clara',
    'un mensaje de MOTIVACIÓN / inspiración auténtico',
    'un momento REAL / detrás de escena, humano y cercano',
    'una escena LIFESTYLE cotidiana con la que la audiencia se identifica',
]

// feed = cuadrado (post normal); story = vertical (historia/reel).
function toSize(format?: string): '1024x1024' | '1024x1536' {
    return format === 'story' ? '1024x1536' : '1024x1024'
}

/**
 * ENVOLTORIO DE CONTENIDO DE VALOR — la "estructura parecida" a la de Meta Ads, pero
 * para SUBIR CONTENIDO a las páginas (no publicidad). Se rellena con el Perfil de
 * Contenido de la página + un ángulo de contenido. Sin IA (plantilla), igual que Ads.
 */
function buildContentImagePrompt(opts: { profile?: any; topic?: string; angle?: string; styleDesc: string; hasReference: boolean }): string {
    const p = opts.profile
    const pagina = (p?.pageName || '').trim() || 'la página'
    const temas = p && Array.isArray(p.contentThemes) ? p.contentThemes.filter(Boolean) : []
    const tema = (opts.topic || '').trim()
        || (temas.length ? temas[Math.floor(Math.random() * temas.length)] : '')
        || 'contenido de valor auténtico'
    const tono = p && Array.isArray(p.tone) && p.tone.length ? p.tone.slice(0, 3).join(', ') : ''
    const audiencia = (p?.audience || '').trim()
    const colores = p && Array.isArray(p.brandColors) && p.brandColors.length ? p.brandColors.slice(0, 3).join(', ') : ''
    const estiloVis = p && Array.isArray(p.visualStyle) && p.visualStyle.length ? p.visualStyle.slice(0, 3).join(', ') : ''
    const estilo = [estiloVis, colores].filter(Boolean).join(', ') || opts.styleDesc
    const angle = (opts.angle || '').trim()

    return [
        `Foto de CONTENIDO de valor para las redes de "${pagina}", natural, atractiva y auténtica (contenido orgánico para publicar en la página, NO es publicidad, NO es un anuncio de venta).`,
        `Tema del post: ${tema}.`,
        angle ? `Enfoque del contenido: ${angle}.` : '',
        audiencia ? `Pensado para: ${audiencia}.` : '',
        tono ? `Tono: ${tono}.` : '',
        estilo ? `Estilo visual: ${estilo}.` : '',
        opts.hasReference ? 'Integrá de forma natural la imagen subida como parte de la escena.' : '',
        'Un solo diseño (nunca collage ni varias fotos), composición cuidada, luz natural, alta calidad, foto realista, sin texto de venta ni precios, sin marcas de agua.',
    ].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim()
}

function pickAngle(): string {
    return CONTENT_ANGLES[Math.floor(Math.random() * CONTENT_ANGLES.length)]
}

/**
 * ENVOLTORIO "MARCA PERSONAL" — para perfiles de PERSONA (no producto): la persona de las
 * fotos es la protagonista, atmósfera profesional estilo agencia, mensaje de valor. Deja
 * espacio limpio para el texto y NO pide texto en la imagen (gpt-image-2 lo escribe mal).
 */
function buildPersonalBrandImagePrompt(opts: { profile?: any; topic?: string; styleDesc: string; hasReference: boolean }): string {
    const p = opts.profile
    const temas = p && Array.isArray(p.contentThemes) ? p.contentThemes.filter(Boolean) : []
    const tema = (opts.topic || '').trim() || (temas.length ? temas[Math.floor(Math.random() * temas.length)] : '') || 'un mensaje de valor'
    const tono = p && Array.isArray(p.tone) && p.tone.length ? p.tone.slice(0, 3).join(', ') : ''
    const colores = p && Array.isArray(p.brandColors) && p.brandColors.length ? p.brandColors.slice(0, 3).join(', ') : ''
    const estiloVis = p && Array.isArray(p.visualStyle) && p.visualStyle.length ? p.visualStyle.slice(0, 3).join(', ') : ''
    const estilo = [estiloVis, colores].filter(Boolean).join(', ')

    return [
        `Post profesional de MARCA PERSONAL para redes sociales, estilo agencia premium (creativo de marca personal de alto nivel).`,
        opts.hasReference
            ? `La PERSONA de las fotos subidas es la PROTAGONISTA: mantené su cara, peinado, barba y apariencia lo más fieles posible, en pose segura y profesional.`
            : `Una persona profesional y segura como protagonista.`,
        `Fondo moderno y cinematográfico: profundidad, luz de estudio dramática, brillos suaves (glow), paneles/tarjetas de interfaz translúcidos flotando alrededor, líneas de energía y partículas sutiles.`,
        estilo ? `Paleta y estilo de marca: ${estilo}.` : 'Paleta elegante, sofisticada y profesional.',
        tono ? `Sensación: ${tono}.` : '',
        `Dejá ESPACIO LIMPIO (arriba o a un costado) para poner un titular después. NO escribas NINGÚN texto en la imagen.`,
        `Idea del contenido: ${tema}.`,
        `Foto realista de alta calidad, composición cuidada, un solo diseño (no collage), sin texto, sin marcas de agua.`,
    ].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim()
}

/**
 * Edita con VARIAS fotos de referencia (distintos ángulos) → gpt-image-2 las combina para
 * reconstruir el sujeto con más precisión. Manda todas como image[] a /images/edits.
 */
async function editWithReferences(imageUrls: string[], prompt: string, apiKey: string, size: string, quality: string): Promise<Buffer> {
    const form = new FormData()
    let added = 0
    for (let i = 0; i < imageUrls.length; i++) {
        const r = await fetch(imageUrls[i]).catch(() => null)
        if (!r || !r.ok) continue
        const buf = Buffer.from(await r.arrayBuffer())
        const ct = r.headers.get('content-type') || 'image/png'
        form.append('image[]', new Blob([buf], { type: ct }), `ref-${i}.png`)
        added++
    }
    if (added === 0) throw new Error('No se pudo descargar ninguna foto de referencia')
    form.append('prompt', prompt)
    form.append('model', IMAGE_MODEL)
    form.append('size', size)
    form.append('quality', quality)
    form.append('n', '1')

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 240_000)
    let res: Response
    try {
        res = await fetch(`${OPENAI_BASE}/images/edits`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${apiKey}` },
            body: form,
            signal: controller.signal,
        })
    } catch (e: any) {
        if (e?.name === 'AbortError') throw new Error('La generación tardó demasiado. Intentá de nuevo.')
        throw e
    } finally {
        clearTimeout(timeout)
    }
    if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error?.message || `gpt-image-2 error ${res.status}`)
    }
    const data = await res.json()
    const b64 = data.data?.[0]?.b64_json
    if (!b64) throw new Error('gpt-image-2 no devolvió una imagen')
    return Buffer.from(b64, 'base64')
}

/** Genera una imagen desde cero con gpt-image-2 a partir del prompt. Devuelve un Buffer PNG. */
async function generateImage(apiKey: string, prompt: string, size: string): Promise<Buffer> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 240_000)
    let res: Response
    try {
        res = await fetch(`${OPENAI_BASE}/images/generations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
            body: JSON.stringify({ model: IMAGE_MODEL, prompt, n: 1, size, quality: 'medium', output_format: 'png' }),
            signal: controller.signal,
        })
    } catch (e: any) {
        if (e?.name === 'AbortError') throw new Error('La generación tardó demasiado. Intentá de nuevo.')
        throw e
    } finally {
        clearTimeout(timeout)
    }
    if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error?.message || `gpt-image-2 error ${res.status}`)
    }
    const data = await res.json()
    const b64 = data.data?.[0]?.b64_json
    if (!b64) throw new Error('gpt-image-2 no devolvió una imagen')
    return Buffer.from(b64, 'base64')
}

export async function POST(req: Request) {
    try {
        const user = await getAuthUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { topic, style, format, referenceImageUrl, referenceImageUrls, customPrompt, promptOnly, profileId, mode, quality } = await req.json()
        const isPersona = mode === 'personal' || mode === 'persona'
        // Calidad elegida por el usuario: alta (mejor, más lento) o rápida (más veloz, sin distorsión).
        const gptQuality: 'high' | 'medium' = quality === 'rapida' ? 'medium' : 'high'
        const topicStr = typeof topic === 'string' ? topic.trim() : ''
        const customStr = typeof customPrompt === 'string' ? customPrompt.trim() : ''

        // Fotos de referencia (varios ángulos). Acepta array nuevo o la única vieja (compat).
        const refUrls: string[] = Array.isArray(referenceImageUrls)
            ? referenceImageUrls.filter((u: any) => typeof u === 'string' && u.startsWith('http')).slice(0, 5)
            : (typeof referenceImageUrl === 'string' && referenceImageUrl.startsWith('http') ? [referenceImageUrl] : [])

        // PERFIL DE CONTENIDO de la página (equivalente del brief, pero para contenido).
        let profile = null
        if (profileId) {
            profile = await (prisma as any).socialContentProfile.findFirst({
                where: { id: profileId, userId: user.id, isActive: true },
            })
        }
        if (!profile) {
            profile = await (prisma as any).socialContentProfile.findFirst({
                where: { userId: user.id, isActive: true },
                orderBy: { updatedAt: 'desc' },
            })
        }

        if (!topicStr && !customStr && !profile) {
            return NextResponse.json({
                error: 'Creá el Perfil de Contenido de tu página (arriba en el Publicador) o escribí un tema para la imagen.',
                code: 'NO_PROFILE',
            }, { status: 400 })
        }

        const hasReference = refUrls.length > 0
        const styleDesc = STYLE_MAP[style as string] || STYLE_MAP.natural

        // ── Modo A: SOLO armar el prompt (estructura) — gratis e instantáneo ──
        if (promptOnly) {
            const prompt = isPersona
                ? buildPersonalBrandImagePrompt({ profile, topic: topicStr, styleDesc, hasReference })
                : buildContentImagePrompt({ profile, topic: topicStr, angle: pickAngle(), styleDesc, hasReference })
            return NextResponse.json({ prompt, profileName: profile?.pageName || null })
        }

        // ── Modo B: generar la imagen (acá sí se necesita la key para gpt-image-2) ──
        const resolved = await resolveOpenAIKey(user.id)
        if (!resolved.ok) {
            if (resolved.error === 'NO_CREDITS') {
                return NextResponse.json({
                    error: 'Sin saldo de IA. Comprá saldo o configurá tu propia API Key.',
                    code: 'NO_CREDITS', balanceUsd: resolved.balanceUsd,
                }, { status: 402 })
            }
            return NextResponse.json({
                error: 'No hay API Key disponible. Configurá la tuya en Configuración → IA o pedile al admin que active la global.',
                code: resolved.error,
            }, { status: 400 })
        }
        const apiKey = resolved.key
        const isGlobal = resolved.source === 'admin'
        const size = toSize(format)

        // Si el usuario editó/tiene un prompt, se usa TAL CUAL; si no, se arma con la estructura.
        const usedCustom = !!customStr
        const finalPrompt = customStr || (isPersona
            ? buildPersonalBrandImagePrompt({ profile, topic: topicStr, styleDesc, hasReference })
            : buildContentImagePrompt({ profile, topic: topicStr, angle: pickAngle(), styleDesc, hasReference }))

        let imgBuffer: Buffer
        if (hasReference) {
            // Con referencia(s): se mantiene el sujeto real y se lo integra en la escena de contenido.
            const multi = refUrls.length > 1
            const multiHint = multi ? ` Te paso ${refUrls.length} fotos del MISMO sujeto en distintos ángulos: usalas para reconstruirlo con precisión (misma forma, etiqueta, colores y proporciones).` : ''
            let editPrompt: string
            if (usedCustom) {
                editPrompt = `Usá la(s) imagen(es) subida(s) como base y mantené el sujeto principal fiel (misma forma, colores, logo y texto).${multiHint} Integralo y ambientalo en esta escena de contenido: ${finalPrompt}. Foto realista, luz natural coherente, alta calidad, sin marcas de agua.`
            } else {
                const productDesc = await analyzeProductImageForAd({ imageUrl: refUrls[0], apiKey }).catch(() => '')
                const fidelity = `IMPORTANTE — MANTENÉ EL SUJETO: conservá el sujeto de la(s) imagen(es) subida(s) EXACTAMENTE igual${productDesc ? ` (${productDesc.substring(0, 180)})` : ''}: misma forma, colores, texto, logo y proporciones. No lo redibujes, recolorees, reemplaces ni dupliques. Tratalo como un recorte real pegado sin cambios en la escena.${multiHint}`
                editPrompt = `${fidelity} Cambiá SOLO el fondo y el entorno alrededor por: ${finalPrompt}`
            }
            // Con foto de referencia usamos calidad ALTA → mejor fidelidad de cara/producto.
            imgBuffer = multi
                ? await editWithReferences(refUrls, editPrompt, apiKey, size, gptQuality)
                : await editAdImageWithReference({ imageUrl: refUrls[0], prompt: editPrompt, apiKey, size, quality: gptQuality })
        } else {
            imgBuffer = await generateImage(apiKey, finalPrompt, size)
        }

        // Subir a S3 (mismo bucket que la subida manual del Publicador).
        const buckets = await supabaseAdmin.storage.listBuckets()
        if (!buckets.data?.some(b => b.name === BUCKET)) {
            await supabaseAdmin.storage.createBucket(BUCKET, { public: true })
        }
        const path = `posts/${user.id}/ai-${Date.now()}.png`
        const { error: uploadErr } = await supabaseAdmin.storage.from(BUCKET).upload(path, imgBuffer, { contentType: 'image/png', upsert: true })
        if (uploadErr) throw new Error(uploadErr.message)
        const mediaUrl = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl

        // Cobrar la imagen si se usó la key global.
        if (isGlobal) {
            logImageUsage({ userId: user.id, service: 'social-image', count: 1, quality: 'standard', size }).catch(() => {})
        }

        return NextResponse.json({ mediaUrl, mediaType: 'image', prompt: finalPrompt, profileName: profile?.pageName || null })
    } catch (err: any) {
        console.error('[SocialImage]', err)
        return NextResponse.json({ error: err.message || 'Error al generar la imagen' }, { status: 500 })
    }
}
