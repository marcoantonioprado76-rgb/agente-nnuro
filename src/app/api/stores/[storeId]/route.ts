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

/** PATCH /api/stores/[storeId] – update a store */
export async function PATCH(
    request: NextRequest,
    { params }: { params: { storeId: string } }
) {
    try {
        const auth = getAuth()
        if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

        const { storeId } = params
        const body = await request.json()

        // Verificar propiedad
        const existing = await prisma.store.findUnique({
            where: { id: storeId }
        })

        if (!existing || existing.userId !== auth.userId) {
            return NextResponse.json({ error: 'Tienda no encontrada' }, { status: 404 })
        }

        const updateData: any = {}
        if (body.name !== undefined) updateData.name = body.name
        if (body.slug !== undefined) updateData.slug = body.slug.toLowerCase().trim()
        if (body.description !== undefined) updateData.description = body.description
        if (body.type !== undefined) updateData.type = body.type
        if (body.botId !== undefined) updateData.botId = body.botId
        if (body.active !== undefined) updateData.active = body.active
        if (body.whatsappNumber !== undefined) updateData.whatsappNumber = body.whatsappNumber
        if (body.themeConfig !== undefined) updateData.themeConfig = body.themeConfig
        if (body.logoUrl !== undefined) updateData.logoUrl = body.logoUrl
        if (body.bannerUrl !== undefined) updateData.bannerUrl = body.bannerUrl
        if (body.paymentQrUrl !== undefined) updateData.paymentQrUrl = body.paymentQrUrl

        const updated = await prisma.store.update({
            where: { id: storeId },
            data: updateData
        })

        return NextResponse.json({ store: updated })
    } catch (err: any) {
        console.error('[PATCH /api/stores] Error detallado:', err)
        return NextResponse.json({ error: 'Error al actualizar la tienda' }, { status: 500 })
    }
}

/** DELETE /api/stores/[storeId] – delete a store */
export async function DELETE(
    request: NextRequest,
    { params }: { params: { storeId: string } }
) {
    try {
        const auth = getAuth()
        if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

        const { storeId } = params

        // Verificar propiedad
        const existing = await prisma.store.findUnique({
            where: { id: storeId }
        })

        if (!existing || existing.userId !== auth.userId) {
            return NextResponse.json({ error: 'Tienda no encontrada' }, { status: 404 })
        }

        await prisma.store.delete({
            where: { id: storeId }
        })

        return NextResponse.json({ success: true })
    } catch (err) {
        console.error('[DELETE /api/stores]', err)
        return NextResponse.json({ error: 'Error al eliminar la tienda' }, { status: 500 })
    }
}
