export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { AdsService } from '@/lib/ads/service'

export async function POST(
    req: Request,
    { params }: { params: { id: string } }
) {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const draft = await prisma.adDraft.findUnique({
        where: { id: params.id, userId: user.id }
    })

    if (!draft) return NextResponse.json({ error: 'Draft not found' }, { status: 404 })

    // In a real pro system, we would just queue a job.
    // For this MVP implementation, we'll trigger the service directly
    // but wrap it so the UI doesn't hang indefinitely if the API is slow.

    try {
        await AdsService.enqueuePublishJob(params.id, user.id)

        await prisma.adDraft.update({
            where: { id: params.id },
            data: { status: 'PUBLISHING' }
        })

        return NextResponse.json({ success: true, message: 'Publishing job queued' })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
