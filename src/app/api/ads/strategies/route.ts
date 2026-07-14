export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const platform = searchParams.get('platform')
    const destination = searchParams.get('destination')
    const mediaType = searchParams.get('mediaType')
    const objective = searchParams.get('objective')
    const briefId = searchParams.get('briefId')

    const savedOnly = searchParams.get('savedOnly') === 'true'

    const where: any = {
        isActive: true,
        userId: user.id,
        isGlobal: false,
    }

    if (savedOnly) where.savedByUser = true
    if (briefId) where.briefId = briefId
    if (platform && platform !== 'ALL') where.platform = platform
    if (destination && destination !== 'ALL') where.destination = destination
    if (mediaType && mediaType !== 'ALL') where.mediaType = mediaType
    if (objective && objective !== 'ALL') where.objective = objective

    const strategies = await (prisma as any).adStrategy.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }]
    })

    return NextResponse.json({ strategies })
}
