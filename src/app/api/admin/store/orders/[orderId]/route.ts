export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { sendOrderConfirmedEmail } from '@/lib/email'

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

/** PATCH /api/admin/store/orders/[orderId]
 * body: { action: 'approve'|'reject'|'ship'|'deliver', notes? }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    if (!await requireAdmin()) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

    const { action, notes } = await req.json()
    if (!['approve', 'reject', 'ship', 'deliver'].includes(action)) {
      return NextResponse.json({ error: 'action inválido' }, { status: 400 })
    }

    const statusMap: Record<string, string> = {
      approve: 'APPROVED',
      reject: 'REJECTED',
      ship: 'SHIPPED',
      deliver: 'DELIVERED',
    }
    const newStatus = statusMap[action]

    const order = await prisma.storeOrder.findUnique({
      where: { id: params.orderId },
      include: {
        items: { include: { item: { select: { title: true } } } },
        user: { select: { email: true, fullName: true } },
      },
    })
    if (!order) return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 })

    await prisma.$transaction(async (tx) => {
      // Re-fetch status inside transaction to prevent double-approval race
      const current = await tx.storeOrder.findUnique({ where: { id: params.orderId }, select: { status: true } })
      if (!current) throw new Error('Pedido no encontrado')

      await tx.storeOrder.update({
        where: { id: params.orderId },
        data: { status: newStatus as any, notes: notes || null },
      })

      // Al aprobar: descontar stock (solo si aún no estaba aprobado)
      if (action === 'approve' && current.status !== 'APPROVED') {
        for (const oi of order.items) {
          await tx.storeItem.update({
            where: { id: oi.itemId },
            data: { stock: { decrement: oi.quantity } },
          })
        }
      }
    })

    // Enviar email de confirmación al aprobar
    if (action === 'approve' && order.status !== 'APPROVED') {
      sendOrderConfirmedEmail(order.user.email, order.user.fullName, {
        id: order.id,
        totalPrice: Number(order.totalPrice),
        recipientName: order.recipientName,
        address: order.address,
        city: order.city,
        state: order.state,
        country: order.country,
        zipCode: order.zipCode,
        createdAt: order.createdAt,
        txHash: order.txHash,
        items: order.items.map(oi => ({
          title: oi.item.title,
          quantity: oi.quantity,
          priceSnapshot: Number(oi.priceSnapshot),
          selectedVariants: oi.selectedVariants as Record<string, string>,
        })),
      }).catch(e => console.error('[email] store order confirmed:', e))
    }

    return NextResponse.json({ ok: true, status: newStatus })
  } catch (err) {
    console.error('[PATCH /api/admin/store/orders/[orderId]]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
