export const dynamic = 'force-dynamic'
export const maxDuration = 60
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { supabaseAdmin } from '@/lib/supabase'
import { decrypt } from '@/lib/ads/encryption'
import { MetaAdapter } from '@/lib/ads/adapters/meta'

const BUCKET = 'ad-creatives'

export async function POST(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const user = await getAuthUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const campaignId = params.id

        const campaign = await (prisma as any).adCampaignV2.findFirst({
            where: { id: campaignId, userId: user.id },
            include: {
                connectedAccount: { include: { integration: { include: { token: true } } } }
            }
        })
        if (!campaign) return NextResponse.json({ error: 'Campaña no encontrada' }, { status: 404 })

        let formData: FormData
        try {
            formData = await req.formData()
        } catch (e: any) {
            console.error('[Upload] formData parse error:', e?.message)
            return NextResponse.json({ error: `Error al leer el archivo: ${e?.message}` }, { status: 400 })
        }

        const file = formData.get('file') as File | null
        const slotIndex = parseInt(formData.get('slotIndex') as string || '0')
        const creativeId = formData.get('creativeId') as string | null

        if (!file) return NextResponse.json({ error: 'No se recibió ningún archivo' }, { status: 400 })

        console.log(`[Upload] file: ${file.name}, type: ${file.type}, size: ${(file.size / 1024 / 1024).toFixed(2)}MB`)

        // Validate env vars (storage en S3 vía shim: requiere región + prefijo de buckets)
        if (!process.env.AWS_REGION || !process.env.S3_BUCKET_PREFIX) {
            return NextResponse.json({ error: 'Almacenamiento (S3) no configurado en .env' }, { status: 500 })
        }

        // Ensure bucket exists — create silently if missing
        const { error: listErr } = await supabaseAdmin.storage.listBuckets()
        if (listErr) {
            console.warn('[Upload] listBuckets failed, attempting upload anyway:', listErr.message)
        } else {
            const { data: buckets } = await supabaseAdmin.storage.listBuckets()
            const exists = buckets?.some(b => b.name === BUCKET)
            if (!exists) {
                console.log('[Upload] Bucket not found, creating...')
                const { error: createErr } = await supabaseAdmin.storage.createBucket(BUCKET, {
                    public: true,
                    fileSizeLimit: 52428800, // 50MB
                    allowedMimeTypes: ['image/*', 'video/*']
                })
                if (createErr) {
                    console.error('[Upload] createBucket error:', createErr.message)
                    // Don't fail — bucket might already exist in a race, try upload anyway
                }
            }
        }

        // Convert file to buffer
        let buffer: Buffer
        try {
            buffer = Buffer.from(await file.arrayBuffer())
        } catch (e: any) {
            console.error('[Upload] arrayBuffer error:', e?.message)
            return NextResponse.json({ error: `No se pudo leer el archivo: ${e?.message}` }, { status: 400 })
        }

        const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
        const path = `ads/${user.id}/${campaignId}/slot-${slotIndex}-${Date.now()}.${ext}`

        console.log(`[Upload] Uploading to Supabase path: ${path}`)

        const { error: uploadError } = await supabaseAdmin.storage
            .from(BUCKET)
            .upload(path, buffer, {
                contentType: file.type || 'application/octet-stream',
                upsert: true
            })

        if (uploadError) {
            console.error('[Upload] Supabase upload error:', uploadError.message, uploadError)
            return NextResponse.json({
                error: `Error al subir a Supabase: ${uploadError.message}`
            }, { status: 500 })
        }

        const { data: urlData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path)
        const publicUrl = urlData.publicUrl
        console.log('[Upload] Success, public URL:', publicUrl)

        const mType = file.type.startsWith('video') ? 'video' : 'image'
        // Nuevo archivo → resetear cualquier pre-subida anterior a Meta (quedó obsoleta)
        const resetMeta = { metaVideoId: null, metaImageHash: null, metaThumbnailUrl: null, metaMediaStatus: null }

        let savedCreativeId: string | null = creativeId || null

        if (creativeId) {
            await (prisma as any).adCreative.update({
                where: { id: creativeId },
                data: { mediaUrl: publicUrl, mediaType: mType, ...resetMeta }
            })
        } else {
            const existing = await (prisma as any).adCreative.findFirst({
                where: { campaignId, slotIndex }
            })
            if (existing) {
                savedCreativeId = existing.id
                await (prisma as any).adCreative.update({
                    where: { id: existing.id },
                    data: { mediaUrl: publicUrl, mediaType: mType, ...resetMeta }
                })
            } else {
                const created = await (prisma as any).adCreative.create({
                    data: {
                        campaignId,
                        slotIndex,
                        primaryText: '',
                        headline: '',
                        mediaUrl: publicUrl,
                        mediaType: mType,
                        aiGenerated: false,
                        isApproved: false
                    }
                })
                savedCreativeId = created.id
            }
        }

        // ── Pre-subir el VIDEO a Meta YA (al cargar), para que al publicar esté listo ──
        // La llamada a /advideos devuelve el video_id al instante; Meta procesa en background.
        // Es best-effort: si falla, no rompe la subida (al publicar se sube como fallback).
        let metaMediaStatus: string | undefined
        if (mType === 'video' && savedCreativeId && campaign.platform === 'META') {
            try {
                const acc = campaign.connectedAccount
                const enc = acc?.integration?.token?.accessTokenEncrypted
                const encKey = process.env.ADS_ENCRYPTION_KEY
                if (acc?.providerAccountId && enc && encKey) {
                    const token = decrypt(enc, encKey)
                    const videoId = await new MetaAdapter().uploadVideoByUrl(token, acc.providerAccountId, publicUrl)
                    await (prisma as any).adCreative.update({
                        where: { id: savedCreativeId },
                        data: { metaVideoId: videoId, metaMediaStatus: 'processing' }
                    })
                    metaMediaStatus = 'processing'
                    console.log(`[Upload] Video pre-subido a Meta: ${videoId} (procesando en background)`)
                }
            } catch (e: any) {
                console.warn('[Upload] Pre-subida a Meta falló (no fatal):', e?.message)
            }
        }

        return NextResponse.json({ mediaUrl: publicUrl, creativeId: savedCreativeId, metaMediaStatus })

    } catch (err: any) {
        console.error('[Upload] Unhandled error:', err)
        return NextResponse.json({
            error: err.message || 'Error interno al subir archivo'
        }, { status: 500 })
    }
}
