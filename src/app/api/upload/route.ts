export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'


const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'video/3gpp': '3gp',
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/wav': 'wav',
  'audio/ogg': 'ogg',
  'audio/aac': 'aac',
  'audio/x-m4a': 'm4a',
  'audio/mp4': 'm4a',
}

export async function POST(request: Request) {
  try {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) return NextResponse.json({ error: 'No se subió ningún archivo' }, { status: 400 })

    const ext = ALLOWED_TYPES[file.type]
    if (!ext) return NextResponse.json({ error: 'Tipo de archivo no permitido' }, { status: 400 })

    const isVideo = file.type.startsWith('video/')
    const isAudio = file.type.startsWith('audio/')

    // Subcarpeta opcional (ej. el builder de landing sube con folder='landing' → ${userId}/landing/...
    // para poder limpiar solo esos archivos al borrar la página). Sanitizada; default sin subcarpeta.
    const rawFolder = (formData.get('folder') as string | null)?.replace(/[^a-z0-9_-]/gi, '') || ''
    const prefix = rawFolder ? `${user.id}/${rawFolder}` : `${user.id}`
    const fileName = `${prefix}/${randomUUID()}.${ext}`
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const { error } = await supabaseAdmin.storage
      .from('uploads')
      .upload(fileName, buffer, {
        contentType: file.type,
        cacheControl: '31536000',
        upsert: false,
      })

    if (error) {
      console.error('[SUPABASE STORAGE ERROR]', error)
      return NextResponse.json({ error: error.message || 'Error al subir archivo' }, { status: 500 })
    }

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('uploads')
      .getPublicUrl(fileName)

    return NextResponse.json({ url: publicUrl })
  } catch (err: any) {
    console.error('[POST /api/upload]', err)
    return NextResponse.json({ error: err?.message || 'Error al subir archivo' }, { status: 500 })
  }
}
