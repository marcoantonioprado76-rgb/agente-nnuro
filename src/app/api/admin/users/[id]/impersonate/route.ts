export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getAdminUser, unauthorizedAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import { generateToken } from '@/lib/auth'

const COOKIE = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 60 * 60 * 24 * 7,
  path: '/',
}

/** POST /api/admin/users/[id]/impersonate — el admin entra como ese usuario.
 *  Emite un token del usuario con el claim `imp` (id del admin) para poder volver. */
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  const adminId = (admin as { id: string }).id
  if (adminId === params.id) {
    return NextResponse.json({ error: 'No puedes impersonarte a ti mismo.' }, { status: 400 })
  }

  const target = await prisma.user.findUnique({
    where: { id: params.id },
    select: { id: true, username: true, email: true },
  })
  if (!target) return NextResponse.json({ error: 'Usuario no encontrado.' }, { status: 404 })

  const token = generateToken({
    userId: target.id,
    username: target.username,
    email: target.email,
    imp: adminId,
  })

  await prisma.auditLog.create({
    data: {
      userId: target.id,
      actorUserId: adminId,
      action: 'IMPERSONATE_START',
      entityType: 'User',
      entityId: target.id,
      payload: { adminId },
    },
  }).catch(() => {})

  const res = NextResponse.json({ success: true })
  // Sesión = usuario objetivo
  res.cookies.set('auth_token', token, COOKIE)
  // Cookie legible por el cliente para mostrar el banner "estás viendo como…"
  res.cookies.set('imp_active', target.username, { ...COOKIE, httpOnly: false })
  return res
}
