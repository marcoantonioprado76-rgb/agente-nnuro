export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { viewerOrgId } from '@/lib/org-content'

/** GET /api/store/items/[itemId] — detalle del item */
export async function GET(
  req: NextRequest,
  { params }: { params: { itemId: string } }
) {
  try {
    const item = await prisma.storeItem.findUnique({
      where: { id: params.itemId },
    })

    if (!item || !item.active) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 })
    }

    let isMember = false
    // Aislamiento por empresa: sin sesión el que mira es de plataforma (NULL)
    let oid: string | null = null
    try {
      const user = await getAuthUser()
      if (user) {
        oid = await viewerOrgId(user.id)
        const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { plan: true, isActive: true } })
        isMember = !!(dbUser && dbUser.plan !== 'NONE' && dbUser.isActive)
      }
    } catch { /* not logged in */ }

    // El item debe pertenecer a la empresa del que mira
    if (((item as any).organizationId ?? null) !== oid) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 })
    }

    const effectivePrice = isMember && item.memberPrice != null ? Number(item.memberPrice) : Number(item.price)

    return NextResponse.json({
      item: { ...item, price: effectivePrice, pv: undefined, memberPrice: undefined },
    })
  } catch (err) {
    console.error('[GET /api/store/items/[itemId]]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
