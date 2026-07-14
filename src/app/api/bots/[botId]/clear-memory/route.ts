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

/**
 * DELETE /api/bots/[botId]/clear-memory
 * Elimina todas las conversaciones del bot (messages, botState en cascada).
 */
export async function DELETE(
    _request: NextRequest,
    { params }: { params: { botId: string } },
) {
    const auth = getAuth()
    if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    // Verificar que el bot pertenece al usuario
    const bot = await prisma.bot.findFirst({
        where: { id: params.botId, userId: auth.userId },
    })
    if (!bot) return NextResponse.json({ error: 'Bot no encontrado' }, { status: 404 })

    // Eliminar todas las conversaciones (messages y botState se eliminan en cascada)
    const { count } = await prisma.conversation.deleteMany({
        where: { botId: params.botId },
    })

    return NextResponse.json({ ok: true, conversationsDeleted: count })
}
