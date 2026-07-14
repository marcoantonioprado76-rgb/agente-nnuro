export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser, unauthorizedAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase'
import crypto from 'crypto'
import { handleRouteError } from '../_shared'

const EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

// POST → sube una imagen de referencia de tarea al bucket público "uploads". SOLO admin.
export async function POST(req: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  try {
    const form = await req.formData()
    const file = form.get('file')

    if (!(file instanceof File) || !file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Solo imágenes' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    if (buffer.byteLength > 8 * 1024 * 1024) {
      return NextResponse.json({ error: 'La imagen supera el límite de 8MB' }, { status: 400 })
    }

    const ext = EXT[file.type] ?? 'jpg'
    const path = `reto90d/tasks/${crypto.randomUUID()}.${ext}`

    const { error } = await supabaseAdmin.storage
      .from('uploads')
      .upload(path, buffer, { contentType: file.type, upsert: false })
    // No filtramos el detalle interno del proveedor de almacenamiento al cliente.
    if (error) {
      console.error('[reto90d/upload] storage error:', error)
      return NextResponse.json({ error: 'No se pudo subir la imagen.' }, { status: 500 })
    }

    const { data } = supabaseAdmin.storage.from('uploads').getPublicUrl(path)
    return NextResponse.json({ url: data.publicUrl })
  } catch (err) {
    return handleRouteError(err, 'upload POST')
  }
}
