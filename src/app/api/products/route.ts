export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { getPlanLimits, PLAN_NAMES, type UserPlan } from '@/lib/plan-limits'
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

/** GET /api/products — catálogo completo del usuario */
export async function GET() {
  const auth = getAuth()
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const products = await prisma.product.findMany({
    where: { userId: auth.userId },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json({ products })
}

/** POST /api/products — crea producto en el catálogo del usuario */
export async function POST(request: NextRequest) {
 try {
  const auth = getAuth()
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  // Plan limit check (plan base + productos extra otorgados por admin)
  const user = await prisma.user.findUnique({ where: { id: auth.userId }, select: { plan: true, extraProducts: true } })
  const plan = (user?.plan ?? 'NONE') as UserPlan
  const extraProducts = user?.extraProducts ?? 0
  const limits = getPlanLimits(plan)

  if (limits.productsPerUser === 0 && extraProducts === 0) {
    return NextResponse.json({
      error: 'Necesitas un plan activo para crear productos.',
      limitReached: true,
      plan,
    }, { status: 403 })
  }

  if (limits.productsPerUser !== Infinity) {
    const effectiveLimit = limits.productsPerUser + extraProducts
    const productCount = await prisma.product.count({ where: { userId: auth.userId } })
    if (productCount >= effectiveLimit) {
      return NextResponse.json({
        error: `Tu ${PLAN_NAMES[plan]} permite hasta ${effectiveLimit} producto(s). Actualiza al Pack Pro para agregar más.`,
        limitReached: true,
        plan,
      }, { status: 403 })
    }
  }

  const body = await request.json() as Record<string, unknown>
  const name = (body.name as string)?.trim()
  if (!name) return NextResponse.json({ error: 'El nombre del producto es requerido' }, { status: 400 })

  const imageMainUrls = parseJsonArray(body.imageMainUrls)
  const productVideoUrls = parseJsonArray(body.productVideoUrls)
  const testimonialsVideoUrls = parseJsonArray(body.testimonialsVideoUrls)
  const hooks = parseJsonArray(body.hooks)
  const tags = parseJsonArray(body.tags)

  const active = body.active !== false
  if (active && imageMainUrls.length === 0) {
    return NextResponse.json(
      { error: 'Un producto activo debe tener al menos 1 imagen principal' },
      { status: 400 },
    )
  }

    const product = await prisma.product.create({
      data: {
        userId: auth.userId,
        name,
        category: (body.category as string) || null,
        benefits: (body.benefits as string) || null,
        usage: (body.usage as string) || null,
        warnings: (body.warnings as string) || null,
        priceUnit: (body.priceUnit !== undefined && body.priceUnit !== null && body.priceUnit !== '') ? Number(body.priceUnit) : null,
        pricePromo2: (body.pricePromo2 !== undefined && body.pricePromo2 !== null && body.pricePromo2 !== '') ? Number(body.pricePromo2) : null,
        priceSuper6: (body.priceSuper6 !== undefined && body.priceSuper6 !== null && body.priceSuper6 !== '') ? Number(body.priceSuper6) : null,
        currency: (body.currency as string) || 'USD',
        welcomeMessage: (body.welcomeMessage as string) || null,
        firstMessage: (body.firstMessage as string) || null,
        hooks: hooks as Prisma.InputJsonValue,
        imageMainUrls: imageMainUrls as Prisma.InputJsonValue,
        imagePriceUnitUrl: (body.imagePriceUnitUrl as string) || null,
        imagePricePromoUrl: (body.imagePricePromoUrl as string) || null,
        imagePriceSuperUrl: (body.imagePriceSuperUrl as string) || null,
        productVideoUrls: productVideoUrls as Prisma.InputJsonValue,
        testimonialsVideoUrls: testimonialsVideoUrls as Prisma.InputJsonValue,
        followUpMediaUrl: (body.followUpMediaUrl as string) || null,
        followUpMediaType: (body.followUpMediaType as string) || null,
        followUpMedia: sanitizeFollowUpMedia(body.followUpMedia) as Prisma.InputJsonValue,
        shippingInfo: (body.shippingInfo as string) || null,
        coverage: (body.coverage as string) || null,
        tags: tags as Prisma.InputJsonValue,
        active,
      },
    })
    return NextResponse.json({ product }, { status: 201 })
  } catch (err: unknown) {
    console.error('[PRODUCTS] Error creating product:', err)
    const message = err instanceof Error ? err.message : 'Error al crear el producto'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
