export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { Prisma } from '@prisma/client'

function getAuth() {
  const token = cookies().get('auth_token')?.value
  if (!token) return null
  return verifyToken(token)
}

function parseJsonArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return value.split('\n').map(s => s.trim()).filter(Boolean)
    }
  }
  return []
}

/** Normaliza la lista de media de seguimiento a [{ url, type, text? }] limpio. */
function sanitizeFollowUpMedia(value: unknown): Array<{ url: string; type: string; text?: string }> {
  const arr = Array.isArray(value) ? value : []
  const out: Array<{ url: string; type: string; text?: string }> = []
  for (const it of arr) {
    if (it && typeof it === 'object') {
      const url = (it as { url?: unknown }).url
      const type = (it as { type?: unknown }).type
      const text = (it as { text?: unknown }).text
      if (typeof url === 'string' && url.trim()) {
        const entry: { url: string; type: string; text?: string } = {
          url: url.trim(),
          type: type === 'video' ? 'video' : 'image',
        }
        if (typeof text === 'string' && text.trim()) entry.text = text.trim()
        out.push(entry)
      }
    }
    if (out.length >= 12) break
  }
  return out
}

/** PATCH /api/products/[productId] */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { productId: string } },
) {
  const auth = getAuth()
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const product = await prisma.product.findFirst({
    where: { id: params.productId, userId: auth.userId },
  })
  if (!product) return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 })

  const body = await request.json() as Record<string, unknown>

  const imageMainUrls = body.imageMainUrls !== undefined ? parseJsonArray(body.imageMainUrls) : undefined
  const productVideoUrls = body.productVideoUrls !== undefined ? parseJsonArray(body.productVideoUrls) : undefined
  const testimonialsVideoUrls = body.testimonialsVideoUrls !== undefined ? parseJsonArray(body.testimonialsVideoUrls) : undefined
  const hooks = body.hooks !== undefined ? parseJsonArray(body.hooks) : undefined
  const tags = body.tags !== undefined ? parseJsonArray(body.tags) : undefined

  const active = typeof body.active === 'boolean' ? body.active : undefined
  if (active === true && imageMainUrls !== undefined && imageMainUrls.length === 0) {
    return NextResponse.json(
      { error: 'Un producto activo debe tener al menos 1 imagen principal' },
      { status: 400 },
    )
  }

  const updated = await prisma.product.update({
    where: { id: params.productId },
    data: {
      ...(typeof body.name === 'string' ? { name: body.name.trim() } : {}),
      ...(typeof body.category === 'string' ? { category: body.category || null } : {}),
      ...(typeof body.benefits === 'string' ? { benefits: body.benefits || null } : {}),
      ...(typeof body.usage === 'string' ? { usage: body.usage || null } : {}),
      ...(typeof body.warnings === 'string' ? { warnings: body.warnings || null } : {}),
      ...(body.priceUnit !== undefined ? { priceUnit: (body.priceUnit !== null && body.priceUnit !== '') ? Number(body.priceUnit) : null } : {}),
      ...(body.pricePromo2 !== undefined ? { pricePromo2: (body.pricePromo2 !== null && body.pricePromo2 !== '') ? Number(body.pricePromo2) : null } : {}),
      ...(body.priceSuper6 !== undefined ? { priceSuper6: (body.priceSuper6 !== null && body.priceSuper6 !== '') ? Number(body.priceSuper6) : null } : {}),
      ...(typeof body.currency === 'string' ? { currency: body.currency } : {}),
      ...(typeof body.welcomeMessage === 'string' ? { welcomeMessage: body.welcomeMessage || null } : {}),
      ...(typeof body.firstMessage === 'string' ? { firstMessage: body.firstMessage || null } : {}),
      ...(hooks !== undefined ? { hooks: hooks as Prisma.InputJsonValue } : {}),
      ...(imageMainUrls !== undefined ? { imageMainUrls: imageMainUrls as Prisma.InputJsonValue } : {}),
      ...(typeof body.imagePriceUnitUrl === 'string' ? { imagePriceUnitUrl: body.imagePriceUnitUrl || null } : {}),
      ...(typeof body.imagePricePromoUrl === 'string' ? { imagePricePromoUrl: body.imagePricePromoUrl || null } : {}),
      ...(typeof body.imagePriceSuperUrl === 'string' ? { imagePriceSuperUrl: body.imagePriceSuperUrl || null } : {}),
      ...(productVideoUrls !== undefined ? { productVideoUrls: productVideoUrls as Prisma.InputJsonValue } : {}),
      ...(testimonialsVideoUrls !== undefined ? { testimonialsVideoUrls: testimonialsVideoUrls as Prisma.InputJsonValue } : {}),
      ...(body.followUpMediaUrl !== undefined ? { followUpMediaUrl: (body.followUpMediaUrl as string) || null } : {}),
      ...(body.followUpMediaType !== undefined ? { followUpMediaType: (body.followUpMediaType as string) || null } : {}),
      ...(body.followUpMedia !== undefined ? { followUpMedia: sanitizeFollowUpMedia(body.followUpMedia) as Prisma.InputJsonValue } : {}),
      ...(typeof body.shippingInfo === 'string' ? { shippingInfo: body.shippingInfo || null } : {}),
      ...(typeof body.coverage === 'string' ? { coverage: body.coverage || null } : {}),
      ...(tags !== undefined ? { tags: tags as Prisma.InputJsonValue } : {}),
      ...(active !== undefined ? { active } : {}),
    },
  })

  return NextResponse.json({ product: updated })
}

/** DELETE /api/products/[productId] — elimina del catálogo (y de todos los bots por CASCADE) */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { productId: string } },
) {
  const auth = getAuth()
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const product = await prisma.product.findFirst({
    where: { id: params.productId, userId: auth.userId },
  })
  if (!product) return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 })

  await prisma.product.delete({ where: { id: params.productId } })

  return NextResponse.json({ ok: true })
}
