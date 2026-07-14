export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { contentOrgWhere } from '@/lib/org-content'

/** GET /api/store/items?category=X — lista items activos */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const category = searchParams.get('category')

    const where: any = { active: true }
    if (category && category !== 'Todas') where.category = category

    // Determine if current user is an active member
    let isMember = false
    // Aislamiento por empresa: por defecto (sin sesión) solo contenido global (NULL)
    let orgWhere: { organizationId: string | null } = { organizationId: null }
    try {
      const user = await getAuthUser()
      if (user) {
        orgWhere = await contentOrgWhere(user.id)
        const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { plan: true, isActive: true } })
        isMember = !!(dbUser && dbUser.plan !== 'NONE' && dbUser.isActive)
      }
    } catch { /* not logged in */ }

    Object.assign(where, orgWhere)

    const items = await prisma.storeItem.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    // Return effective price — memberPrice for active members, price for everyone else
    const data = items.map(i => ({
      ...i,
      price: isMember && i.memberPrice != null ? Number(i.memberPrice) : Number(i.price),
      pv: undefined,
      memberPrice: undefined, // never expose raw prices to client
    }))

    // Categorías únicas para los filtros
    const allItems = await prisma.storeItem.findMany({
      where: { ...orgWhere, active: true },
      select: { category: true },
      distinct: ['category'],
      orderBy: { category: 'asc' },
    })
    const categories = allItems.map(i => i.category)

    return NextResponse.json({ items: data, categories })
  } catch (err) {
    console.error('[GET /api/store/items]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
