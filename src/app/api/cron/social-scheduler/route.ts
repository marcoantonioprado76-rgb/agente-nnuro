export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { processScheduledSocialPosts } from '@/lib/social/scheduler-worker'

export async function GET(req: Request) {
    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    try {
        const processed = await processScheduledSocialPosts()
        return NextResponse.json({ processed })
    } catch (err: any) {
        console.error('[SocialScheduler]', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
