export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { getPlanLimits, PLAN_NAMES, type UserPlan } from '@/lib/plan-limits'

function getAuth() {
    const cookieStore = cookies()
    const token = cookieStore.get('auth_token')?.value
    if (!token) return null
    return verifyToken(token)
}

/** GET /api/stores – list all stores for the authenticated user */
export async function GET() {
    try {
        const auth = getAuth()
        if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

        const stores = await prisma.store.findMany({
            where: { userId: auth.userId },
            include: {
                bot: {
                    select: { name: true }
                },
                _count: {
                    select: { products: true }
                }
            },
            orderBy: { createdAt: 'desc' },
        })

        return NextResponse.json({ stores })
    } catch (err) {
        console.error('[GET /api/stores]', err)
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }
}

/** POST /api/stores – create a new store */
export async function POST(request: NextRequest) {
    try {
        const auth = getAuth()
        if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

        const body = await request.json()
        const { name, slug, type, botId, description } = body

        if (!name || !slug || !type) {
            return NextResponse.json({ error: 'Faltan campos obligatorios (nombre, slug, tipo)' }, { status: 400 })
        }

        // Plan limit check (plan base + tiendas extra otorgadas por admin)
        const user = await prisma.user.findUnique({ where: { id: auth.userId }, select: { plan: true, extraStores: true } })
        const plan = (user?.plan ?? 'NONE') as UserPlan
        const extraStores = user?.extraStores ?? 0
        const limits = getPlanLimits(plan)

        if (limits.stores === 0 && extraStores === 0) {
            return NextResponse.json({
                error: 'Necesitas un plan activo para crear tiendas.',
                limitReached: true,
                plan,
            }, { status: 403 })
        }

        if (limits.stores !== Infinity) {
            const effectiveLimit = limits.stores + extraStores
            const storeCount = await prisma.store.count({ where: { userId: auth.userId } })
            if (storeCount >= effectiveLimit) {
                return NextResponse.json({
                    error: `Tu ${PLAN_NAMES[plan]} permite hasta ${effectiveLimit} tienda(s). Actualiza al Pack Pro para crear más.`,
                    limitReached: true,
                    plan,
                }, { status: 403 })
            }
        }

        // Verificar si el slug ya existe
        const exists = await prisma.store.findUnique({ where: { slug } })
        if (exists) {
            return NextResponse.json({ error: 'El nombre de usuario/slug de la tienda ya está en uso' }, { status: 400 })
        }

        let store
        try {
            store = await prisma.store.create({
                data: {
                    userId: auth.userId,
                    botId: botId || null,
                    name,
                    slug: slug.toLowerCase().trim(),
                    type: type as any,
                    whatsappNumber: body.whatsappNumber || null,
                    paymentQrUrl: body.paymentQrUrl || null,
                    bannerUrl: body.bannerUrl || null,
                    themeConfig: (body.themeConfig && typeof body.themeConfig === 'object') ? body.themeConfig : undefined,
                    description: description || '',
                }
            })
        } catch (e: any) {
            // Carrera de slug único: dos requests pasan el check y chocan en el @unique
            if (e?.code === 'P2002') {
                return NextResponse.json({ error: 'El nombre de usuario/slug de la tienda ya está en uso' }, { status: 409 })
            }
            throw e
        }

        return NextResponse.json({ store }, { status: 201 })
    } catch (err: any) {
        console.error('[POST /api/stores] Error completo:', err)
        return NextResponse.json({ error: 'Error al crear la tienda' }, { status: 500 })
    }
}
