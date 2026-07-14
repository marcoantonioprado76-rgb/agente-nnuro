export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { AdsService } from '@/lib/ads/service'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const { draftId } = await req.json()
        if (!draftId) return NextResponse.json({ error: 'Missing draftId' }, { status: 400 })

        // Check ownership
        const draft = await prisma.adDraft.findUnique({
            where: { id: draftId }
        })

        if (!draft || draft.userId !== user.id) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 })
        }

        // Enqueue job or publish immediately (using service)
        // For "Real" feel, we try to publish and catch errors
        try {
            const result = await AdsService.publishCampaign(draftId)
            return NextResponse.json({ success: true, result })
        } catch (pubErr: any) {
            console.error('[PublishAPI] Immediate publish failed, check logs:', pubErr)
            // If it failed but it's just a sync issue, we can still say it's "Processing"
            // but for now, let's return the real error to the user
            return NextResponse.json({ error: pubErr.message }, { status: 500 })
        }
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
