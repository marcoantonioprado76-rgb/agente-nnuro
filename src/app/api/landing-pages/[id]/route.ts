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

/** GET /api/landing-pages/[id] – get single page details */
export async function GET(
    _request: NextRequest,
    { params }: { params: { id: string } }
) {
    const auth = getAuth()
    if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    try {
        const page = await prisma.landingPage.findFirst({
            where: { id: params.id, userId: auth.userId },
            include: {
                leads: {
                    orderBy: { createdAt: 'desc' },
                    take: 50
                }
            }
        })

        if (!page) return NextResponse.json({ error: 'Página no encontrada' }, { status: 404 })

        return NextResponse.json({ page })
    } catch (error) {
        console.error('Error fetching landing page:', error)
        return NextResponse.json({ error: 'Error al obtener la página' }, { status: 500 })
    }
}

/** PUT /api/landing-pages/[id] – update page config, content or styles */
export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const auth = getAuth()
    if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    try {
        const body = await request.json()
        const { name, slug, templateId, sections, globalStyles, active } = body

        // Verify ownership
        const existing = await prisma.landingPage.findFirst({
            where: { id: params.id, userId: auth.userId }
        })
        if (!existing) return NextResponse.json({ error: 'Página no encontrada' }, { status: 404 })

        // If slug is changing, check uniqueness
        if (slug && slug !== existing.slug) {
            const slugTaken = await prisma.landingPage.findUnique({ where: { slug } })
            if (slugTaken) return NextResponse.json({ error: 'El slug ya está en uso' }, { status: 400 })
        }

        const updated = await prisma.landingPage.update({
            where: { id: params.id },
            data: {
                ...(name && { name }),
                ...(slug && { slug }),
                ...(templateId && { templateId }),
                ...(sections && { sections }),
                ...(globalStyles && { globalStyles }),
                ...(typeof active === 'boolean' && { active })
            }
        })

        return NextResponse.json({ page: updated })
    } catch (error) {
        console.error('Error updating landing page:', error)
        return NextResponse.json({ error: 'Error al actualizar la página' }, { status: 500 })
    }
}

/** DELETE /api/landing-pages/[id] – remove landing page */
export async function DELETE(
    _request: NextRequest,
    { params }: { params: { id: string } }
) {
    const auth = getAuth()
    if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    try {
        const existing = await prisma.landingPage.findFirst({
            where: { id: params.id, userId: auth.userId }
        })
        if (!existing) return NextResponse.json({ error: 'Página no encontrada' }, { status: 404 })

        await prisma.landingPage.delete({
            where: { id: params.id }
        })

        return NextResponse.json({ ok: true })
    } catch (error) {
        console.error('Error deleting landing page:', error)
        return NextResponse.json({ error: 'Error al eliminar la página' }, { status: 500 })
    }
}
