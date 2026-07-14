export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser, unauthorizedAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  try {
    const body = await req.json()
    const { userId, ...productData } = body
    if (!userId) return NextResponse.json({ error: 'userId requerido' }, { status: 400 })
    if (!productData.name?.trim()) return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 })

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, plan: true } })
    if (!user) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })

    const product = await prisma.product.create({
      data: {
        userId,
        name: productData.name.trim(),
        category: productData.category || null,
        benefits: productData.benefits || null,
        usage: productData.usage || null,
        warnings: productData.warnings || null,
        priceUnit: productData.priceUnit ?? null,
        pricePromo2: productData.pricePromo2 ?? null,
        priceSuper6: productData.priceSuper6 ?? null,
        currency: productData.currency || 'USD',
        welcomeMessage: productData.welcomeMessage || null,
        firstMessage: productData.firstMessage || null,
        hooks: productData.hooks ?? [],
        imageMainUrls: productData.imageMainUrls ?? [],
        imagePriceUnitUrl: productData.imagePriceUnitUrl || null,
        imagePricePromoUrl: productData.imagePricePromoUrl || null,
        imagePriceSuperUrl: productData.imagePriceSuperUrl || null,
        productVideoUrls: productData.productVideoUrls ?? [],
        testimonialsVideoUrls: productData.testimonialsVideoUrls ?? [],
        shippingInfo: productData.shippingInfo || null,
        coverage: productData.coverage || null,
        tags: productData.tags ?? [],
        active: productData.active ?? true,
      },
    })

    return NextResponse.json({ product })
  } catch (err) {
    console.error('[POST /api/admin/products]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim() || ''
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const limit = 20
  const skip = (page - 1) * limit

  const where: any = {}
  if (q) {
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { category: { contains: q, mode: 'insensitive' } },
      { user: { fullName: { contains: q, mode: 'insensitive' } } },
      { user: { username: { contains: q, mode: 'insensitive' } } },
    ]
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, username: true, fullName: true } },
        bots: { include: { bot: { select: { id: true, name: true } } } },
      },
    }),
    prisma.product.count({ where }),
  ])

  return NextResponse.json({
    products: products.map(p => ({
      ...p,
      priceUnit: p.priceUnit ? Number(p.priceUnit) : null,
      pricePromo2: p.pricePromo2 ? Number(p.pricePromo2) : null,
      priceSuper6: p.priceSuper6 ? Number(p.priceSuper6) : null,
    })),
    total,
    totalPages: Math.ceil(total / limit),
    page,
  })
}
