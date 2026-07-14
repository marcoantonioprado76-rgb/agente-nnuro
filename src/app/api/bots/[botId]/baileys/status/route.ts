export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { BaileysManager } from '@/lib/baileys-manager'

function getAuth() {
    const token = cookies().get('auth_token')?.value
    if (!token) return null
    return verifyToken(token)
}

/** GET /api/bots/[botId]/baileys/status — devuelve estado actual y QR en base64 */
export async function GET(
    _req: NextRequest,
    { params }: { params: { botId: string } },
) {
    const auth = getAuth()
    if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const bot = await prisma.bot.findFirst({
        where: { id: params.botId, userId: auth.userId },
        select: { id: true, baileysPhone: true },
    })
    if (!bot) return NextResponse.json({ error: 'Bot no encontrado' }, { status: 404 })

    const status = BaileysManager.getStatus(params.botId)

    return NextResponse.json({
        ...status,
        // Si está conectado, complementar con el número guardado en DB
        phone: status.phone ?? bot.baileysPhone ?? undefined,
    })
}

/** DELETE /api/bots/[botId]/baileys/status — desconecta y borra sesión */
export async function DELETE(
    _req: NextRequest,
    { params }: { params: { botId: string } },
) {
    const auth = getAuth()
    if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const bot = await prisma.bot.findFirst({
        where: { id: params.botId, userId: auth.userId },
    })
    if (!bot) return NextResponse.json({ error: 'Bot no encontrado' }, { status: 404 })

    BaileysManager.disconnect(params.botId)

    return NextResponse.json({ ok: true })
}
