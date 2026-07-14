export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase'
import { prisma } from '@/lib/prisma'

// Subida PÚBLICA del comprobante de pago por parte del cliente de la tienda
// (anónimo). Se limita a imágenes y a un tamaño máximo, y se exige que la
// tienda (slug) exista y esté activa para evitar subidas sueltas.
const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
}
const MAX_BYTES = 6 * 1024 * 1024 // 6 MB

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const slug = ((formData.get('slug') as string) || '').trim()

    if (!file) return NextResponse.json({ error: 'No se subió ningún archivo' }, { status: 400 })

    const ext = ALLOWED_TYPES[file.type]
    if (!ext) return NextResponse.json({ error: 'Solo se permiten imágenes (JPG, PNG o WEBP).' }, { status: 400 })
    if (file.size > MAX_BYTES) return NextResponse.json({ error: 'La imagen es muy pesada (máximo 6 MB).' }, { status: 400 })

    // La tienda debe existir y estar activa.
    const store = await (prisma as any).store.findFirst({
      where: { slug, active: true },
      select: { id: true },
    })
    if (!store) return NextResponse.json({ error: 'Tienda no válida.' }, { status: 404 })

    const fileName = `receipts/${store.id}/${randomUUID()}.${ext}`
    const buffer = Buffer.from(await file.arrayBuffer())

    const { error } = await supabaseAdmin.storage
      .from('uploads')
      .upload(fileName, buffer, {
        contentType: file.type,
        cacheControl: '31536000',
        upsert: false,
      })

    if (error) {
      console.error('[STORE RECEIPT UPLOAD]', error)
      return NextResponse.json({ error: 'No se pudo subir el comprobante.' }, { status: 500 })
    }

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('uploads')
      .getPublicUrl(fileName)

    return NextResponse.json({ url: publicUrl })
  } catch (err: any) {
    console.error('[POST /api/store-receipt]', err)
    return NextResponse.json({ error: 'No se pudo subir el comprobante.' }, { status: 500 })
  }
}
