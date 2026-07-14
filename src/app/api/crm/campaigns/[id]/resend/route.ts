export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { executeBroadcast, startBroadcastScheduler } from '@/lib/broadcast-worker'

startBroadcastScheduler()

/**
 * Reenvía la campaña a TODA su lista de contactos sin crear una campaña nueva
 * ni re-importar. Resetea los contactos a PENDING y los contadores en cero,
 * y vuelve a ejecutar. (Respeta los contactos dados de baja — opt-out — cuando
 * exista esa marca.)
 */
export async function POST(_req: Request, { params }: { params: { id: string } }) {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const campaign = await (prisma as any).broadcastCampaign.findFirst({
        where: { id: params.id, userId: user.id },
        include: { _count: { select: { contacts: true } } },
    })
    if (!campaign) return NextResponse.json({ error: 'Campaña no encontrada' }, { status: 404 })
    if (campaign.status === 'RUNNING') return NextResponse.json({ error: 'La campaña ya está en ejecución' }, { status: 400 })
    if (campaign._count.contacts === 0) return NextResponse.json({ error: 'Esta campaña no tiene contactos para reenviar' }, { status: 400 })

    // Reset: toda la lista vuelve a PENDING + contadores en cero (reutiliza la misma lista)
    await (prisma as any).broadcastContact.updateMany({
        where: { campaignId: params.id },
        data: { status: 'PENDING', error: null, sentAt: null },
    })
    await (prisma as any).broadcastCampaign.update({
        where: { id: params.id },
        data: { status: 'DRAFT', sentCount: 0, failedCount: 0, completedAt: null, imageIndex: 0 },
    })

    executeBroadcast(params.id).catch(err =>
        console.error(`[BROADCAST] Error reenviando campaña ${params.id}:`, err),
    )

    return NextResponse.json({ ok: true, message: 'Reenvío iniciado a toda la lista' })
}
