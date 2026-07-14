export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const integrations = await prisma.adIntegration.findMany({
        where: { userId: user.id },
        include: {
            connectedAccount: true,
            token: { select: { expiresAt: true, rotatedAt: true } }
        }
    })

    return NextResponse.json({ integrations })
}
