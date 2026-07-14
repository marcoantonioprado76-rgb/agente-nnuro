export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { validateOrganizationId } from '@/lib/org-content'

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

/** PATCH /api/admin/store/items/[itemId] */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { itemId: string } }
) {
  try {
    if (!await requireAdmin()) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

    const body = await req.json()

    const org = await validateOrganizationId(body.organizationId)
    if (!org.ok) return NextResponse.json({ error: org.error }, { status: 400 })

    const data: any = {}

    if (!org.skip) data.organizationId = org.value
    if (body.title != null) data.title = body.title.trim()
    if (body.description != null) data.description = body.description.trim()
    if (body.category != null) data.category = body.category.trim()
    if (body.price != null) data.price = parseFloat(body.price)
    if ('memberPrice' in body) data.memberPrice = body.memberPrice != null && body.memberPrice !== '' ? parseFloat(body.memberPrice) : null
    if (body.pv != null) data.pv = parseFloat(body.pv)
    if (body.stock != null) data.stock = parseInt(body.stock)
    if (body.images != null) data.images = Array.isArray(body.images) ? body.images : []
    if (body.variants != null) data.variants = Array.isArray(body.variants) ? body.variants : []
    if (body.active != null) data.active = body.active

    const item = await prisma.storeItem.update({ where: { id: params.itemId }, data })
    return NextResponse.json({ item: { ...item, price: Number(item.price), memberPrice: item.memberPrice != null ? Number(item.memberPrice) : null, pv: Number(item.pv) } })
  } catch (err) {
    console.error('[PATCH /api/admin/store/items/[itemId]]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

/** DELETE /api/admin/store/items/[itemId] */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { itemId: string } }
) {
  try {
    if (!await requireAdmin()) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

    // Check if item has orders — cannot delete if so
    const hasOrders = await prisma.storeOrderItem.findFirst({ where: { itemId: params.itemId } })
    if (hasOrders) {
      return NextResponse.json(
        { error: 'No puedes eliminar un producto que tiene pedidos asociados. Desactívalo en su lugar.' },
        { status: 409 }
      )
    }

    await prisma.storeItem.delete({ where: { id: params.itemId } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[DELETE /api/admin/store/items/[itemId]]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
