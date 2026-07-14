export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { computeNextRun, startBroadcastScheduler } from '@/lib/broadcast-worker'

startBroadcastScheduler()

/**
 * Configura el remarketing recurrente de una campaña.
 * Body: { recurring: boolean, days?: number[] (0-6), time?: "HH:mm", imageId?: string|null }
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const campaign = await (prisma as any).broadcastCampaign.findFirst({
        where: { id: params.id, userId: user.id },
        select: { id: true },
    })
    if (!campaign) return NextResponse.json({ error: 'Campaña no encontrada' }, { status: 404 })

    const body = await req.json().catch(() => ({}))
    const recurring = !!body.recurring

    if (!recurring) {
        await (prisma as any).broadcastCampaign.update({
            where: { id: params.id },
            data: { recurring: false, nextRunAt: null },
        })
        return NextResponse.json({ ok: true, recurring: false })
    }

    const days: number[] = Array.isArray(body.days)
        ? body.days.filter((n: any) => Number.isInteger(n) && n >= 0 && n <= 6)
        : []
    const time: string | null = typeof body.time === 'string' && /^\d{1,2}:\d{2}$/.test(body.time) ? body.time : null
    if (!days.length || !time) {
        return NextResponse.json({ error: 'Elegí al menos un día y una hora' }, { status: 400 })
    }

    const daysCSV = Array.from(new Set(days)).sort().join(',')
    const next = computeNextRun(daysCSV, time, new Date())

    await (prisma as any).broadcastCampaign.update({
        where: { id: params.id },
        data: {
            recurring: true,
            recurrenceDays: daysCSV,
            recurrenceTime: time,
            recurrenceImageId: body.imageId || null,
            nextRunAt: next,
        },
    })

    return NextResponse.json({ ok: true, recurring: true, nextRunAt: next })
}
