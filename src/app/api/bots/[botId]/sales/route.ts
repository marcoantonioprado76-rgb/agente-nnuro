export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
    req: NextRequest,
    { params }: { params: { botId: string } }
) {
    const cookieStore = await cookies()
    const token = cookieStore.get('auth_token')?.value
    if (!token) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const user = verifyToken(token)
    if (!user) return NextResponse.json({ error: 'Token inválido' }, { status: 401 })

    const { botId } = params

    // Verificar que el bot pertenece al usuario
    const bot = await prisma.bot.findFirst({
        where: { id: botId, userId: user.userId },
        include: { assignedProducts: { include: { product: { select: { id: true, active: true } } } } }
    })
    if (!bot) return NextResponse.json({ error: 'Bot no encontrado' }, { status: 404 })

    // Obtener todas las conversaciones vendidas
    // Buscamos TODOS los mensajes del asistente para no perder el reporte en hilos largos
    const soldConversations = await prisma.conversation.findMany({
        where: { botId, sold: true },
        orderBy: { soldAt: 'desc' },
        include: {
            messages: {
                where: { role: 'assistant' },
                orderBy: { createdAt: 'desc' },
                // Quitamos el take: 20 para buscar en todo el historial
            }
        }
    })

    // Procesar las ventas extrayendo el campo `reporte`
    const sales = soldConversations.map(conv => {
        // 1. Prioridad: Usar el nuevo campo orderReport persistente
        let reporte = (conv as any).orderReport || ''

        // 2. Fallback: Si no tiene orderReport (ventas antiguas), buscar en mensajes
        if (!reporte) {
            for (const msg of conv.messages) {
                try {
                    const parsed = JSON.parse(msg.content)
                    if (parsed.reporte && parsed.reporte.trim()) {
                        reporte = parsed.reporte
                        break
                    }
                } catch { }
            }
        }

        // 3. Fallback extremo: usar último mensaje del asistente
        if (!reporte && conv.messages.length > 0) {
            const lastMsg = conv.messages[0].content
            try {
                const parsed = JSON.parse(lastMsg)
                reporte = [parsed.mensaje1, parsed.mensaje2, parsed.mensaje3].filter(Boolean).join('\n')
            } catch {
                reporte = lastMsg
            }
        }

        return {
            id: conv.id,
            userPhone: conv.userPhone,
            userName: conv.userName || null,
            reporte: reporte || 'Sin detalles extra (confirmado manualmente)',
            soldAt: conv.soldAt,
            createdAt: conv.createdAt,
        }
    })

    // Estadísticas
    const totalSales = sales.length
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const salesToday = sales.filter(s => s.soldAt && new Date(s.soldAt) >= today).length
    const thisWeek = new Date(today)
    thisWeek.setDate(thisWeek.getDate() - 7)
    const salesThisWeek = sales.filter(s => s.soldAt && new Date(s.soldAt) >= thisWeek).length

    const totalProducts = bot.assignedProducts.length
    const activeProducts = bot.assignedProducts.filter(bp => bp.product.active).length

    return NextResponse.json({
        stats: {
            totalSales,
            salesToday,
            salesThisWeek,
            totalProducts,
            activeProducts,
        },
        sales,
    })
}
