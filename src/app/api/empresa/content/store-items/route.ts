export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getOrgAdmin, unauthorizedOrg } from '@/lib/org-auth'

/** GET /api/empresa/content/store-items — productos de SU empresa */
export async function GET() {
  try {
    const auth = await getOrgAdmin()
    if (!auth) return unauthorizedOrg()

    const items = await prisma.storeItem.findMany({
      where: { organizationId: auth.organizationId },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({
      items: items.map(i => ({
        ...i,
        price: Number(i.price),
        memberPrice: i.memberPrice != null ? Number(i.memberPrice) : null,
        pv: Number(i.pv),
      })),
    })
  } catch (err) {
    console.error('[GET /api/empresa/content/store-items]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

/** POST /api/empresa/content/store-items — crea un producto etiquetado a SU empresa */
export async function POST(req: NextRequest) {
  try {
    const auth = await getOrgAdmin()
    if (!auth) return unauthorizedOrg()

    const body = await req.json()
    const { title, description, category, price, memberPrice, pv, stock, images, variants, active } = body

    if (!title || !description || price == null || memberPrice == null || memberPrice === '') {
      return NextResponse.json({ error: 'title, description, price y memberPrice son requeridos' }, { status: 400 })
    }

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
        organizationId: auth.organizationId,
      },
    })

    return NextResponse.json({
      item: {
        ...item,
        price: Number(item.price),
        memberPrice: item.memberPrice != null ? Number(item.memberPrice) : null,
        pv: Number(item.pv),
      },
    }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/empresa/content/store-items]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
