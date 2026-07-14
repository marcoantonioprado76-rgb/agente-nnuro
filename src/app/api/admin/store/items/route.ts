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

/** GET /api/admin/store/items */
export async function GET(req: NextRequest) {
  try {
    if (!await requireAdmin()) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

    const items = await prisma.storeItem.findMany({ orderBy: { createdAt: 'desc' } })
    return NextResponse.json({
      items: items.map(i => ({ ...i, price: Number(i.price), memberPrice: i.memberPrice != null ? Number(i.memberPrice) : null, pv: Number(i.pv) })),
    })
  } catch (err) {
    console.error('[GET /api/admin/store/items]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

/** POST /api/admin/store/items */
export async function POST(req: NextRequest) {
  try {
    if (!await requireAdmin()) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

    const body = await req.json()
    const { title, description, category, price, memberPrice, pv, stock, images, variants, active, organizationId } = body

    if (!title || !description || price == null || memberPrice == null || memberPrice === '') {
      return NextResponse.json({ error: 'title, description, price y memberPrice son requeridos' }, { status: 400 })
    }

    const org = await validateOrganizationId(organizationId)
    if (!org.ok) return NextResponse.json({ error: org.error }, { status: 400 })

    const item = await prisma.storeItem.create({
      data: {
        title: title.trim(),
        description: description.trim(),
        category: (category ?? 'General').trim(),
        price: parseFloat(price),
        memberPrice: memberPrice != null && memberPrice !== '' ? parseFloat(memberPrice) : null,
        pv: parseFloat(pv ?? 0),
        stock: parseInt(stock ?? 0),
        images: Array.isArray(images) ? images : [],
        variants: Array.isArray(variants) ? variants : [],
        active: active !== false,
        organizationId: org.skip ? null : org.value,
      },
    })

    return NextResponse.json({ item: { ...item, price: Number(item.price), memberPrice: item.memberPrice != null ? Number(item.memberPrice) : null, pv: Number(item.pv) } }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/admin/store/items]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
