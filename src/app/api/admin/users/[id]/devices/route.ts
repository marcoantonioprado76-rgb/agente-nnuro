export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAdminUser, unauthorizedAdmin } from '@/lib/admin-auth'

// GET /api/admin/users/[id]/devices — list trusted devices for a user
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  try {
    const devices = await prisma.trustedDevice.findMany({
      where: { userId: params.id },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ devices })
  } catch (err) {
    console.error('[DEVICES] GET error:', err)
    return NextResponse.json({ error: 'Error al obtener dispositivos' }, { status: 500 })
  }
}

// DELETE /api/admin/users/[id]/devices — desvincular device(s) for a user
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  try {
    const body = await request.json().catch(() => ({}))
    const { deviceId } = body as { deviceId?: string }

    if (deviceId) {
      await prisma.trustedDevice.deleteMany({
        where: { userId: params.id, deviceId },
      })
    } else {
      await prisma.trustedDevice.deleteMany({ where: { userId: params.id } })
    }

    return NextResponse.json({ message: 'Dispositivo desvinculado' })
  } catch (err) {
    console.error('[DEVICES] DELETE error:', err)
    return NextResponse.json({ error: 'Error al desvincular dispositivo' }, { status: 500 })
  }
}
