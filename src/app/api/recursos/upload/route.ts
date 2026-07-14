export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'
import { isRecursosAdmin } from '@/lib/recursos'

// Subida de imágenes (flyers base / thumbnails / portadas) y PDFs (presentaciones/libros).
// SOLO ADMIN. Reusa el bucket "uploads" (el mismo de toda la app), subcarpeta "recursos/".
const ALLOWED: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
}

export async function POST(request: Request) {
  try {
    const user = await getAuthUser()
    if (!isRecursosAdmin(user)) {
      return NextResponse.json({ error: 'Acceso denegado. Solo administradores.' }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No se subió ningún archivo' }, { status: 400 })

    const ext = ALLOWED[file.type]
    if (!ext) return NextResponse.json({ error: 'Tipo de archivo no permitido (JPG, PNG, WEBP o PDF)' }, { status: 400 })

    const fileName = `recursos/${(user as any).id}/${randomUUID()}.${ext}`
    const buffer = Buffer.from(await file.arrayBuffer())

    const { error } = await supabaseAdmin.storage
      .from('uploads')
      .upload(fileName, buffer, { contentType: file.type, cacheControl: '31536000', upsert: false })

    if (error) {
      console.error('[recursos/upload] SUPABASE ERROR', error)
      return NextResponse.json({ error: error.message || 'Error al subir archivo' }, { status: 500 })
    }

    const { data: { publicUrl } } = supabaseAdmin.storage.from('uploads').getPublicUrl(fileName)
    return NextResponse.json({ url: publicUrl })
  } catch (err: any) {
    console.error('[POST /api/recursos/upload]', err)
    return NextResponse.json({ error: err?.message || 'Error al subir archivo' }, { status: 500 })
  }
}
