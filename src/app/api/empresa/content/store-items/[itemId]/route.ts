export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getOrgAdmin, unauthorizedOrg } from '@/lib/org-auth'

/** PATCH /api/empresa/content/store-items/[itemId] — edita un producto de SU empresa */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { itemId: string } }
) {
  try {
    const auth = await getOrgAdmin()
    if (!auth) return unauthorizedOrg()

    // Ownership: el producto debe pertenecer a SU empresa
    const existing = await prisma.storeItem.findUnique({
      where: { id: params.itemId },
      select: { organizationId: true },
    })
    if (!existing || existing.organizationId !== auth.organizationId) {
      return unauthorizedOrg()
    }

    const body = await req.json()

    const data: any = {}
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
    return NextResponse.json({
      item: {
        ...item,
        price: Number(item.price),
        memberPrice: item.memberPrice != null ? Number(item.memberPrice) : null,
        pv: Number(item.pv),
      },
    })
  } catch (err) {
    console.error('[PATCH /api/empresa/content/store-items/[itemId]]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

/** DELETE /api/empresa/content/store-items/[itemId] — borra un producto de SU empresa */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { itemId: string } }
) {
  try {
    const auth = await getOrgAdmin()
    if (!auth) return unauthorizedOrg()

    // Ownership: el producto debe pertenecer a SU empresa
    const existing = await prisma.storeItem.findUnique({
      where: { id: params.itemId },
      select: { organizationId: true },
    })
    if (!existing || existing.organizationId !== auth.organizationId) {
      return unauthorizedOrg()
    }

    // No borrar un producto que ya tiene pedidos asociados
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
    console.error('[DELETE /api/empresa/content/store-items/[itemId]]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
