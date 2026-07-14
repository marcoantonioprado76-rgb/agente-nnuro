export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser, unauthorizedAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  const body = await req.json()
  const { name, category, benefits, usage, warnings, priceUnit, pricePromo2, priceSuper6,
    currency, welcomeMessage, firstMessage, shippingInfo, coverage, active,
    hooks, imageMainUrls, imagePriceUnitUrl, imagePricePromoUrl, imagePriceSuperUrl,
    productVideoUrls, testimonialsVideoUrls, tags } = body

  const product = await prisma.product.findUnique({ where: { id: params.id } })
  if (!product) return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 })

  const updated = await prisma.product.update({
    where: { id: params.id },
    data: {
      ...(name !== undefined ? { name: String(name).trim() } : {}),
      ...(category !== undefined ? { category: category || null } : {}),
      ...(benefits !== undefined ? { benefits: benefits || null } : {}),
      ...(usage !== undefined ? { usage: usage || null } : {}),
      ...(warnings !== undefined ? { warnings: warnings || null } : {}),
      ...(priceUnit !== undefined ? { priceUnit: priceUnit ? parseFloat(priceUnit) : null } : {}),
      ...(pricePromo2 !== undefined ? { pricePromo2: pricePromo2 ? parseFloat(pricePromo2) : null } : {}),
      ...(priceSuper6 !== undefined ? { priceSuper6: priceSuper6 ? parseFloat(priceSuper6) : null } : {}),
      ...(currency !== undefined ? { currency: String(currency) } : {}),
      ...(welcomeMessage !== undefined ? { welcomeMessage: welcomeMessage || null } : {}),
      ...(firstMessage !== undefined ? { firstMessage: firstMessage || null } : {}),
      ...(shippingInfo !== undefined ? { shippingInfo: shippingInfo || null } : {}),
      ...(coverage !== undefined ? { coverage: coverage || null } : {}),
      ...(active !== undefined ? { active: Boolean(active) } : {}),
      ...(hooks !== undefined ? { hooks } : {}),
      ...(imageMainUrls !== undefined ? { imageMainUrls } : {}),
      ...(imagePriceUnitUrl !== undefined ? { imagePriceUnitUrl: imagePriceUnitUrl || null } : {}),
      ...(imagePricePromoUrl !== undefined ? { imagePricePromoUrl: imagePricePromoUrl || null } : {}),
      ...(imagePriceSuperUrl !== undefined ? { imagePriceSuperUrl: imagePriceSuperUrl || null } : {}),
      ...(productVideoUrls !== undefined ? { productVideoUrls } : {}),
      ...(testimonialsVideoUrls !== undefined ? { testimonialsVideoUrls } : {}),
      ...(tags !== undefined ? { tags } : {}),
    },
    include: { user: { select: { username: true, fullName: true } } },
  })

  return NextResponse.json({ ok: true, product: updated })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  const product = await prisma.product.findUnique({ where: { id: params.id } })
  if (!product) return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 })

  await prisma.product.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
