export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createServiceRoleClient } from '@/lib/supabase/server'

type Ctx = { params: { id: string } }

export async function POST(request: NextRequest, { params }: Ctx) {
  const session = await getServerSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const product = await (prisma as any).product.findFirst({
    where: { id: params.id, tenant_id: session.sub },
    select: { id: true },
  })
  if (!product) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No se proporcionó archivo' }, { status: 400 })
  if (!file.type.startsWith('audio/')) return NextResponse.json({ error: 'Solo archivos de audio' }, { status: 400 })
  if (file.size > 20 * 1024 * 1024) return NextResponse.json({ error: 'Audio demasiado grande (máx. 20 MB)' }, { status: 400 })

  const ext      = file.name.split('.').pop()?.toLowerCase() || 'webm'
  const fileName = `${session.sub}/${Date.now()}-audio.${ext}`
  const service  = await createServiceRoleClient()
  const buffer   = Buffer.from(await file.arrayBuffer())

  const { error: uploadError } = await service.storage.from('media').upload(fileName, buffer, { contentType: file.type, upsert: false })
  if (uploadError) return NextResponse.json({ error: 'Error al subir audio' }, { status: 500 })

  const { data: urlData } = service.storage.from('media').getPublicUrl(fileName)
  await (prisma as any).product.update({ where: { id: params.id }, data: { first_message_audio_url: urlData.publicUrl } })

  return NextResponse.json({ audioUrl: urlData.publicUrl })
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const session = await getServerSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const product = await (prisma as any).product.findFirst({
    where: { id: params.id, tenant_id: session.sub },
    select: { id: true },
  })
  if (!product) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  await (prisma as any).product.update({ where: { id: params.id }, data: { first_message_audio_url: null } })
  return NextResponse.json({ ok: true })
}
