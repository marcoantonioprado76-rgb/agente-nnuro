export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

function getAuth() {
  const token = cookies().get('auth_token')?.value
  if (!token) return null
  return verifyToken(token)
}

async function requireAdmin() {
  const auth = getAuth()
  if (!auth) return false
  const user = await prisma.user.findUnique({ where: { id: auth.userId }, select: { isAdmin: true } })
  return user?.isAdmin === true
}

const VALID_STATUSES = ['PENDING', 'PENDING_VERIFICATION', 'APPROVED', 'REJECTED', 'SHIPPED', 'DELIVERED']

/** GET /api/admin/store/orders?status=X */
export async function GET(req: NextRequest) {
  try {
    if (!await requireAdmin()) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')

    const where: any = {}
    if (status && VALID_STATUSES.includes(status)) where.status = status

    const orders = await prisma.storeOrder.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, username: true, fullName: true, email: true } },
        items: {
          include: {
            item: { select: { id: true, title: true, images: true, category: true } },
          },
        },
      },
    })

    const data = orders.map(o => ({
      ...o,
      totalPrice: Number(o.totalPrice),
      totalPv: Number(o.totalPv),
      items: o.items.map(i => ({
        ...i,
        priceSnapshot: Number(i.priceSnapshot),
        pvSnapshot: Number(i.pvSnapshot),
      })),
    }))

    return NextResponse.json({ orders: data })
  } catch (err) {
    console.error('[GET /api/admin/store/orders]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
