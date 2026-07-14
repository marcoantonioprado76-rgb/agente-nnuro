export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { getPlanLimits, PLAN_NAMES, type UserPlan } from '@/lib/plan-limits'

function getAuth() {
  const token = cookies().get('auth_token')?.value
  if (!token) return null
  return verifyToken(token)
}

/**
 * POST /api/stores/[storeId]/clone
 * Body: { type: 'NETWORK_MARKETING' | 'GENERAL_BUSINESS' }
 *
 * Crea una copia de la tienda para el MISMO usuario con un tipo distinto.
 * La tienda original no se modifica.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { storeId: string } }
) {
  const auth = getAuth()
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  try {
    const { type: newType } = await req.json()
    if (!['NETWORK_MARKETING', 'GENERAL_BUSINESS'].includes(newType)) {
      return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 })
    }

    const source = await prisma.store.findFirst({
      where: { id: params.storeId, userId: auth.userId },
      include: { products: true },
    })
    if (!source) {
      return NextResponse.json({ error: 'Tienda no encontrada' }, { status: 404 })
    }

    // Límite de tiendas por plan (clonar también cuenta)
    const planUser = await prisma.user.findUnique({ where: { id: auth.userId }, select: { plan: true } })
    const plan = (planUser?.plan ?? 'NONE') as UserPlan
    const limits = getPlanLimits(plan)
    if (limits.stores !== Infinity) {
      const storeCount = await prisma.store.count({ where: { userId: auth.userId } })
      if (storeCount >= limits.stores) {
        return NextResponse.json({
          error: `Tu ${PLAN_NAMES[plan]} permite hasta ${limits.stores} tienda(s). Actualiza tu plan para crear más.`,
          limitReached: true,
          plan,
        }, { status: 403 })
      }
    }

    // Generar slug único para la copia
    const suffix = newType === 'GENERAL_BUSINESS' ? 'negocio' : 'nm'
    const baseSlug = `${source.slug}-${suffix}`
    let slug = baseSlug
    let attempt = 0
    while (await prisma.store.findUnique({ where: { slug } })) {
      attempt++
      slug = `${baseSlug}-${attempt}`
    }

    // Nombre descriptivo para la copia
    const typeSuffix = newType === 'GENERAL_BUSINESS' ? ' (Mi Negocio)' : ' (Network Marketing)'
    const newName = source.name.endsWith(typeSuffix) ? source.name : source.name + typeSuffix

    const cloned = await prisma.store.create({
      data: {
        userId: auth.userId,
        name: newName,
        slug,
        type: newType as any,
        whatsappNumber: source.whatsappNumber,
        paymentQrUrl: source.paymentQrUrl,
        description: source.description,
        logoUrl: source.logoUrl,
        bannerUrl: source.bannerUrl,
        themeConfig: source.themeConfig as unknown as any,
        active: false,
      } as any,
    })

    for (const p of source.products) {
      await prisma.storeProduct.create({
        data: {
          storeId: cloned.id,
          name: p.name,
          description: p.description ?? '',
          category: p.category ?? 'General',
          price: Number(p.price),
          currency: p.currency,
          points: p.points != null ? Number(p.points) : 0,
          stock: p.stock,
          images: Array.isArray(p.images) ? p.images : JSON.parse(JSON.stringify(p.images)),
          active: p.active,
          pricePromo: (p as any).pricePromo ?? null,
        } as any,
      })
    }

    return NextResponse.json({ ok: true, store: cloned })
  } catch (err) {
    console.error('[CLONE_STORE]', err)
    return NextResponse.json({ error: 'Error al clonar la tienda' }, { status: 500 })
  }
}
