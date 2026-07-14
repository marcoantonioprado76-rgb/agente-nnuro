export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { randomUUID } from 'crypto'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

function getAuth() {
  const token = cookies().get('auth_token')?.value
  return token ? verifyToken(token) : null
}
async function isAdmin(auth: ReturnType<typeof getAuth>) {
  if (!auth) return false
  const u = await prisma.user.findUnique({ where: { id: auth.userId }, select: { isAdmin: true } })
  return u?.isAdmin === true
}

const EXT: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp',
  'application/zip': 'zip',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-powerpoint': 'ppt',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
}

// POST → sube un archivo de recurso de lección al bucket público "uploads". SOLO admin.
export async function POST(req: Request) {
  const auth = getAuth()
  if (!await isAdmin(auth)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const form = await req.formData()
  const file = form.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No se subió ningún archivo' }, { status: 400 })

  const ext = EXT[file.type] || (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 5)
  const path = `course-resources/${randomUUID()}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const { error } = await supabaseAdmin.storage.from('uploads').upload(path, buffer, { contentType: file.type || 'application/octet-stream', cacheControl: '31536000', upsert: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: { publicUrl } } = supabaseAdmin.storage.from('uploads').getPublicUrl(path)
  return NextResponse.json({ url: publicUrl, name: file.name })
}
