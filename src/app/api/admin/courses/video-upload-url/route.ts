export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { randomUUID } from 'crypto'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

const BUCKET = 'course-videos'

function getAuth() {
  const token = cookies().get('auth_token')?.value
  return token ? verifyToken(token) : null
}
async function isAdmin(auth: ReturnType<typeof getAuth>) {
  if (!auth) return false
  const u = await prisma.user.findUnique({ where: { id: auth.userId }, select: { isAdmin: true } })
  return u?.isAdmin === true
}

// POST → devuelve una URL firmada para subir un video directo a Supabase (sin pasar por el server).
export async function POST(req: Request) {
  const auth = getAuth()
  if (!await isAdmin(auth)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  let filename = 'video.mp4'
  try { const b = await req.json(); if (b?.filename) filename = String(b.filename) } catch {}
  const ext = (filename.split('.').pop() || 'mp4').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 5) || 'mp4'
  const path = `${randomUUID()}.${ext}`

  const { data, error } = await supabaseAdmin.storage.from(BUCKET).createSignedUploadUrl(path)
  if (error || !data) {
    console.error('[video-upload-url]', error)
    return NextResponse.json({ error: error?.message || 'No se pudo preparar la subida' }, { status: 500 })
  }
  return NextResponse.json({ signedUrl: data.signedUrl, path: data.path })
}
