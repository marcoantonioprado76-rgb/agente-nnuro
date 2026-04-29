export const dynamic = 'force-dynamic'
export const maxDuration = 120

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createServiceRoleClient } from '@/lib/supabase/server'

const BUCKET = 'template-media'

const ALLOWED: Record<string, string> = {
  'image/jpeg':      'IMAGE',
  'image/jpg':       'IMAGE',
  'image/png':       'IMAGE',
  'image/webp':      'IMAGE',
  'video/mp4':       'VIDEO',
  'video/quicktime': 'VIDEO',
  'video/3gpp':      'VIDEO',
  'application/pdf': 'DOCUMENT',
}

const MAX_SIZE: Record<string, number> = {
  IMAGE:    500 * 1024 * 1024,
  VIDEO:    500 * 1024 * 1024,
  DOCUMENT: 500 * 1024 * 1024,
}

export async function POST(req: NextRequest, { params }: { params: { botId: string } }) {
  const session = await getServerSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const bot = await (prisma as any).bot.findFirst({
    where: { id: params.botId, tenant_id: session.sub },
    select: { id: true },
  })
  if (!bot) return NextResponse.json({ error: 'Bot no encontrado' }, { status: 404 })

  const formData  = await req.formData()
  const file      = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'Archivo requerido' }, { status: 400 })

  const mediaType = ALLOWED[file.type]
  if (!mediaType) return NextResponse.json({ error: 'Tipo no permitido. Imágenes: JPG, PNG, WEBP · Video: MP4 · Documento: PDF' }, { status: 400 })
  if (file.size > MAX_SIZE[mediaType]) return NextResponse.json({ error: `Excede límite de ${MAX_SIZE[mediaType] / 1024 / 1024} MB` }, { status: 400 })

  const buffer = Buffer.from(await file.arrayBuffer())
  const ext    = file.name.split('.').pop()?.toLowerCase() || file.type.split('/')[1]
  const path   = `${session.sub}/${params.botId}/${Date.now()}.${ext}`

  const service = await createServiceRoleClient()
  let { error: uploadErr } = await service.storage.from(BUCKET).upload(path, buffer, { contentType: file.type, upsert: false })

  if (uploadErr) {
    await service.storage.createBucket(BUCKET, { public: true }).catch(() => {})
    const retry = await service.storage.from(BUCKET).upload(path, buffer, { contentType: file.type, upsert: false })
    if (retry.error) return NextResponse.json({ error: retry.error.message }, { status: 500 })
  }

  const { data: urlData } = service.storage.from(BUCKET).getPublicUrl(path)
  return NextResponse.json({ url: urlData.publicUrl, type: mediaType })
}
