export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { getPlanLimits, PLAN_NAMES, type UserPlan } from '@/lib/plan-limits'

/** Filtra el array de imágenes a solo URLs http(s) válidas, con tope de cantidad. */
function sanitizeImages(images: unknown): string[] {
    if (!Array.isArray(images)) return []
    return images.filter((u): u is string => typeof u === 'string' && /^https?:\/\//i.test(u)).slice(0, 12)
}

function getAuth() {
    const cookieStore = cookies()
    const token = cookieStore.get('auth_token')?.value
    if (!token) return null
    return verifyToken(token)
}

/** GET /api/stores/[storeId]/products – list all products for a store */
export async function GET(
    request: NextRequest,
    { params }: { params: { storeId: string } }
) {
    try {
        const auth = getAuth()
        if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

        const { storeId } = params

        // Verificar propiedad
        const store = await prisma.store.findUnique({
            where: { id: storeId }
        })

        if (!store || store.userId !== auth.userId) {
            return NextResponse.json({ error: 'Tienda no encontrada' }, { status: 404 })
        }

        const products = await prisma.storeProduct.findMany({
            where: { storeId },
            orderBy: { createdAt: 'desc' },
        })

        return NextResponse.json({ products })
    } catch (err) {
        console.error('[GET /api/stores/products]', err)
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }
}

/** POST /api/stores/[storeId]/products – create a new product */
export async function POST(
    request: NextRequest,
    { params }: { params: { storeId: string } }
) {
    try {
        const auth = getAuth()
        if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

        const { storeId } = params
        const body = await request.json()
        const { name, description, price, pricePromo, stock, images, active, category, points, currency } = body

        if (!name || price === undefined) {
            return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 })
        }

        // Verificar propiedad
        const store = await prisma.store.findUnique({
            where: { id: storeId }
        })

        if (!store || store.userId !== auth.userId) {
            return NextResponse.json({ error: 'Tienda no encontrada' }, { status: 404 })
        }

        // Validar valores numéricos (no negativos; promo <= precio)
        const priceNum = Number(price)
        const stockNum = stock !== undefined ? Number(stock) : 0
        const pointsNum = points !== undefined ? Number(points) : 0
        const promoNum = (pricePromo !== undefined && pricePromo !== '' && pricePromo !== null) ? Number(pricePromo) : undefined
        if (!Number.isFinite(priceNum) || priceNum < 0) {
            return NextResponse.json({ error: 'El precio debe ser un número mayor o igual a 0' }, { status: 400 })
        }
        if (!Number.isFinite(stockNum) || stockNum < 0) {
            return NextResponse.json({ error: 'El stock no puede ser negativo' }, { status: 400 })
        }
        if (!Number.isFinite(pointsNum) || pointsNum < 0) {
            return NextResponse.json({ error: 'Los puntos no pueden ser negativos' }, { status: 400 })
        }
        if (promoNum !== undefined && (!Number.isFinite(promoNum) || promoNum < 0 || promoNum > priceNum)) {
            return NextResponse.json({ error: 'El precio promocional debe ser mayor o igual a 0 y no superar al precio normal' }, { status: 400 })
        }

        // Límite de productos por plan (suma de productos de TODAS las tiendas del usuario)
        const planUser = await prisma.user.findUnique({ where: { id: auth.userId }, select: { plan: true } })
        const plan = (planUser?.plan ?? 'NONE') as UserPlan
        const limits = getPlanLimits(plan)
        const productCount = await prisma.storeProduct.count({ where: { store: { userId: auth.userId } } })
        if (productCount >= limits.productsPerUser) {
            return NextResponse.json({
                error: `Tu ${PLAN_NAMES[plan]} permite hasta ${limits.productsPerUser} producto(s). Actualiza tu plan para agregar más.`,
                limitReached: true,
                plan,
            }, { status: 403 })
        }

        const productData: any = {
            storeId,
            name,
            description: description || '',
            category: category || 'General',
            price: priceNum,
            currency: currency || 'USD',
            points: pointsNum,
            stock: stockNum,
            images: sanitizeImages(images),
            active: active !== undefined ? active : true,
        }

        if (promoNum !== undefined) {
            productData.pricePromo = promoNum
        }

        let product
        try {
            product = await prisma.storeProduct.create({ data: productData })
        } catch (err: any) {
            // If price_promo column doesn't exist yet (migration pending), retry without it
            if (productData.pricePromo !== undefined && (err?.message?.includes('price_promo') || err?.code === 'P2022')) {
                delete productData.pricePromo
                product = await prisma.storeProduct.create({ data: productData })
            } else {
                throw err
            }
        }

        return NextResponse.json({ product }, { status: 201 })
    } catch (err) {
        console.error('[POST /api/stores/products]', err)
        return NextResponse.json({ error: 'Error al crear producto' }, { status: 500 })
    }
}
