import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getServerSession } from '@/lib/auth'
import sharp from 'sharp'

const ALLOWED_BUCKETS = ['store-products', 'store-qr', 'product-images', 'product-testimonials', 'avatars', 'payment-proofs', 'store-covers', 'store-favicons']
const MAX_IMAGE_DIMENSION = 1080
const IMAGE_QUALITY = 80
const MAX_VIDEO_SIZE_MB = 50

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    const session = await getServerSession()
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const user = { id: session.sub }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const bucket = (formData.get('bucket') as string | null) ?? 'media'

    if (!file) {
      return NextResponse.json({ error: 'No se proporcionó archivo' }, { status: 400 })
    }

    if (!bucket || !ALLOWED_BUCKETS.includes(bucket)) {
      // Allow 'media' as default bucket for bot product uploads
      if (bucket !== 'media') return NextResponse.json({ error: 'Bucket no válido' }, { status: 400 })
    }

    const isImage = file.type.startsWith('image/')
    const isVideo = file.type.startsWith('video/')
    if (!isImage && !isVideo) {
      return NextResponse.json({ error: 'Solo se permiten archivos de imagen o video' }, { status: 400 })
    }

    const originalSize = file.size
    let finalBuffer: Buffer
    let finalContentType: string
    let finalExt: string

    if (isImage) {
      // ══════════════════════════════════════
      // OPTIMIZACIÓN DE IMÁGENES CON SHARP
      // ══════════════════════════════════════
      const rawBuffer = Buffer.from(await file.arrayBuffer())

      // Obtener metadata para log
      const metadata = await sharp(rawBuffer).metadata()
      const originalW = metadata.width || 0
      const originalH = metadata.height || 0

      // Redimensionar a max 1080px y convertir a webp
      finalBuffer = await sharp(rawBuffer)
        .resize(MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION, {
          fit: 'inside',        // Mantiene aspect ratio
          withoutEnlargement: true, // No agranda imágenes pequeñas
        })
        .webp({ quality: IMAGE_QUALITY })
        .toBuffer()

      finalContentType = 'image/webp'
      finalExt = 'webp'

      const newMetadata = await sharp(finalBuffer).metadata()
      const savings = ((1 - finalBuffer.length / rawBuffer.length) * 100).toFixed(1)

      console.log(`[Upload] 🖼️ Imagen optimizada: ${originalW}x${originalH} → ${newMetadata.width}x${newMetadata.height}, ${formatBytes(rawBuffer.length)} → ${formatBytes(finalBuffer.length)} (-${savings}%), formato: webp`)

    } else {
      // ══════════════════════════════════════
      // VIDEOS: validar tamaño, subir directo
      // ══════════════════════════════════════
      if (file.size > MAX_VIDEO_SIZE_MB * 1024 * 1024) {
        return NextResponse.json(
          { error: `Video demasiado grande. Máximo ${MAX_VIDEO_SIZE_MB}MB.` },
          { status: 400 }
        )
      }

      finalBuffer = Buffer.from(await file.arrayBuffer())
      finalContentType = file.type
      finalExt = file.name.split('.').pop()?.toLowerCase() || 'mp4'

      console.log(`[Upload] 🎬 Video: ${formatBytes(finalBuffer.length)}, tipo: ${file.type}`)
    }

    // ══════════════════════════════════════
    // SUBIR A SUPABASE STORAGE
    // ══════════════════════════════════════
    const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${finalExt}`
    const service = await createServiceRoleClient()

    const { error: uploadError } = await service.storage
      .from(bucket)
      .upload(fileName, finalBuffer, {
        contentType: finalContentType,
        upsert: false,
      })

    if (uploadError) {
      console.error('[Upload] ❌ Error Supabase:', uploadError)
      return NextResponse.json({ error: 'Error al subir archivo' }, { status: 500 })
    }

    const { data: urlData } = service.storage.from(bucket).getPublicUrl(fileName)
    const elapsed = Date.now() - startTime

    console.log(`[Upload] ✅ Subido: bucket=${bucket}, ${formatBytes(originalSize)} → ${formatBytes(finalBuffer.length)}, tiempo=${elapsed}ms, url=${urlData.publicUrl.substring(0, 80)}...`)

    return NextResponse.json({
      url: urlData.publicUrl,
      optimized: isImage,
      originalSize,
      finalSize: finalBuffer.length,
    })
  } catch (error) {
    console.error('[Upload] ❌ Error:', error)
    return NextResponse.json({ error: 'Error interno al procesar archivo' }, { status: 500 })
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)}MB`
}
