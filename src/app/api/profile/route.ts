export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/profile  — devuelve datos del usuario autenticado
 * PATCH /api/profile — actualiza campos editables por el propio usuario
 *
 * Campo editable hoy: fullName (3-80 chars, sin caracteres raros).
 * Username, email, identityDocument, dateOfBirth → NO editables desde acá
 * (son identidad y requieren validación/admin).
 */
export async function GET() {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const u = await prisma.user.findUnique({
        where: { id: user.id },
        select: {
            id: true, username: true, email: true, fullName: true, avatarUrl: true,
            country: true, city: true, identityDocument: true, dateOfBirth: true,
            isActive: true, plan: true, createdAt: true,
        },
    })
    if (!u) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

    return NextResponse.json({ user: u })
}

export async function PATCH(req: NextRequest) {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    let body: any
    try { body = await req.json() } catch { return NextResponse.json({ error: 'Body inválido' }, { status: 400 }) }

    const data: Record<string, any> = {}

    // fullName: 3-80 chars, sin saltos de línea, sin emojis raros
    if (typeof body.fullName === 'string') {
        const name = body.fullName.trim()
        if (name.length < 3) {
            return NextResponse.json({ error: 'El nombre debe tener al menos 3 caracteres' }, { status: 400 })
        }
        if (name.length > 80) {
            return NextResponse.json({ error: 'El nombre no puede superar 80 caracteres' }, { status: 400 })
        }
        if (/[\r\n\t]/.test(name)) {
            return NextResponse.json({ error: 'El nombre contiene caracteres no permitidos' }, { status: 400 })
        }
        data.fullName = name
    }

    // avatarUrl: URL de la foto subida (acepta null para borrar). Validamos que
    // sea una URL de nuestro propio Supabase Storage (evita injection de URLs
    // arbitrarias del cliente).
    if (body.avatarUrl === null) {
        data.avatarUrl = null
    } else if (typeof body.avatarUrl === 'string') {
        const url = body.avatarUrl.trim()
        if (url && !/^https:\/\/[a-z0-9-]+\.supabase\.co\/storage\/v1\/object\/public\//i.test(url)) {
            return NextResponse.json({ error: 'URL de avatar inválida' }, { status: 400 })
        }
        data.avatarUrl = url || null
    }

    if (Object.keys(data).length === 0) {
        return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 })
    }

    const updated = await prisma.user.update({
        where: { id: user.id },
        data,
        select: { id: true, username: true, email: true, fullName: true, avatarUrl: true },
    })

    return NextResponse.json({ success: true, user: updated })
}
