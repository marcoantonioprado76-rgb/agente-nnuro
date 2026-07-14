export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

function getAuth() {
  const cookieStore = cookies()
  const token = cookieStore.get('auth_token')?.value
  if (!token) return null
  return verifyToken(token)
}

/** GET /api/clipping/accounts — list connected accounts */
export async function GET() {
  try {
    const auth = getAuth()
    if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const accounts = await prisma.clippingAccount.findMany({
      where: { userId: auth.userId },
      select: {
        id: true,
        platform: true,
        displayName: true,
        providerAccountId: true,
        status: true,
        expiresAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ accounts })
  } catch (err) {
    console.error('[GET /api/clipping/accounts]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

/** DELETE /api/clipping/accounts — disconnect an account */
export async function DELETE(request: NextRequest) {
  try {
    const auth = getAuth()
    if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { platform } = await request.json()
    if (!platform) return NextResponse.json({ error: 'Platform requerido' }, { status: 400 })

    await prisma.clippingAccount.deleteMany({
      where: { userId: auth.userId, platform },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[DELETE /api/clipping/accounts]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
