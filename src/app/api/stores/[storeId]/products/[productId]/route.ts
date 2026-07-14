export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

function getAuth() {
    const cookieStore = cookies()
    const token = cookieStore.get('auth_token')?.value
    if (!token) return null
    return verifyToken(token)
}

/** PATCH /api/stores/[storeId]/products/[productId] – update a product */
export async function PATCH(
    request: NextRequest,
    { params }: { params: { storeId: string; productId: string } }
) {
    try {
        const auth = getAuth()
        if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

        const { storeId, productId } = params
        const body = await request.json()

        // Verificar propiedad de la tienda
        const store = await prisma.store.findUnique({
            where: { id: storeId }
        })

        if (!store || store.userId !== auth.userId) {
            return NextResponse.json({ error: 'Tienda no encontrada' }, { status: 404 })
        }

        // Verificar que el producto pertenezca a ESTA tienda (anti-IDOR)
        const existingProduct = await prisma.storeProduct.findUnique({
            where: { id: productId },
            select: { storeId: true, price: true },
        })
        if (!existingProduct || existingProduct.storeId !== storeId) {
            return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 })
        }

        // Validar valores numéricos provistos (no negativos; promo <= precio)
        const priceNum = body.price !== undefined ? Number(body.price) : undefined
        const stockNum = body.stock !== undefined ? Number(body.stock) : undefined
        const pointsNum = body.points !== undefined ? Number(body.points) : undefined
        let promoNum: number | null | undefined = undefined
        if (body.pricePromo !== undefined) {
            promoNum = (body.pricePromo !== '' && body.pricePromo !== null) ? Number(body.pricePromo) : null
        }
        if (priceNum !== undefined && (!Number.isFinite(priceNum) || priceNum < 0)) {
            return NextResponse.json({ error: 'El precio debe ser mayor o igual a 0' }, { status: 400 })
        }
        if (stockNum !== undefined && (!Number.isFinite(stockNum) || stockNum < 0)) {
            return NextResponse.json({ error: 'El stock no puede ser negativo' }, { status: 400 })
        }
        if (pointsNum !== undefined && (!Number.isFinite(pointsNum) || pointsNum < 0)) {
            return NextResponse.json({ error: 'Los puntos no pueden ser negativos' }, { status: 400 })
        }
        if (typeof promoNum === 'number') {
            const ref = priceNum !== undefined ? priceNum : Number(existingProduct.price)
            if (!Number.isFinite(promoNum) || promoNum < 0 || promoNum > ref) {
                return NextResponse.json({ error: 'El precio promocional debe ser mayor o igual a 0 y no superar al precio normal' }, { status: 400 })
            }
        }

        const updateData: any = {
            name: body.name,
            description: body.description,
            category: body.category,
            price: priceNum,
            currency: body.currency,
            points: pointsNum,
            stock: stockNum,
            images: body.images !== undefined
                ? (Array.isArray(body.images) ? body.images.filter((u: any) => typeof u === 'string' && /^https?:\/\//i.test(u)).slice(0, 12) : [])
                : undefined,
            active: body.active,
        }

        if (promoNum !== undefined) {
            updateData.pricePromo = promoNum
        }

        let updated
        try {
            updated = await prisma.storeProduct.update({ where: { id: productId }, data: updateData })
        } catch (err: any) {
            // If price_promo column doesn't exist yet (migration pending), retry without it
            if (updateData.pricePromo !== undefined && (err?.message?.includes('price_promo') || err?.code === 'P2022')) {
                delete updateData.pricePromo
                updated = await prisma.storeProduct.update({ where: { id: productId }, data: updateData })
            } else {
                throw err
            }
        }

        return NextResponse.json({ product: updated })
    } catch (err) {
        console.error('[PATCH /api/stores/products]', err)
        return NextResponse.json({ error: 'Error al actualizar producto' }, { status: 500 })
    }
}

/** DELETE /api/stores/[storeId]/products/[productId] – delete a product */
export async function DELETE(
    request: NextRequest,
    { params }: { params: { storeId: string; productId: string } }
) {
    try {
        const auth = getAuth()
        if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

        const { storeId, productId } = params

        // Verificar propiedad de la tienda
        const store = await prisma.store.findUnique({
            where: { id: storeId }
        })

        if (!store || store.userId !== auth.userId) {
            return NextResponse.json({ error: 'Tienda no encontrada' }, { status: 404 })
        }

        // deleteMany con storeId → solo borra si el producto es de ESTA tienda (anti-IDOR)
        const result = await prisma.storeProduct.deleteMany({
            where: { id: productId, storeId }
        })
        if (result.count === 0) {
            return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 })
        }

        return NextResponse.json({ success: true })
    } catch (err) {
        console.error('[DELETE /api/stores/products]', err)
        return NextResponse.json({ error: 'Error al eliminar producto' }, { status: 500 })
    }
}
