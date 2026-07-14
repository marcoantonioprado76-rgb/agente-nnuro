export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { generateToken, verifyToken } from '@/lib/auth'

const COOKIE = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 60 * 60 * 24 * 7,
  path: '/',
}

/** POST /api/admin/stop-impersonating — vuelve a la sesión del admin que impersonó. */
export async function POST() {
  const token = cookies().get('auth_token')?.value
  const payload = token ? verifyToken(token) : null
  if (!payload?.imp) {
    return NextResponse.json({ error: 'No estás impersonando a nadie.' }, { status: 400 })
  }

  const admin = await prisma.user.findUnique({
    where: { id: payload.imp },
    select: { id: true, username: true, email: true, isAdmin: true },
  })
  if (!admin || !admin.isAdmin) {
    return NextResponse.json({ error: 'Sesión de admin no válida.' }, { status: 403 })
  }

  const adminToken = generateToken({ userId: admin.id, username: admin.username, email: admin.email })

  const res = NextResponse.json({ success: true })
  res.cookies.set('auth_token', adminToken, COOKIE)
  res.cookies.set('imp_active', '', { ...COOKIE, httpOnly: false, maxAge: 0 })
  return res
}
