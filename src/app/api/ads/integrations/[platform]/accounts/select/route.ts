export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { AdPlatform } from '@prisma/client'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
    req: Request,
    { params }: { params: { platform: string } }
) {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { providerAccountId, displayName, currency, timezone } = await req.json()
    const platform = params.platform.toUpperCase() as AdPlatform

    const integration = await prisma.adIntegration.findUnique({
        where: { userId_platform: { userId: user.id, platform } }
    })

    if (!integration) {
        return NextResponse.json({ error: 'Integration not found' }, { status: 404 })
    }

    const connectedAccount = await prisma.adConnectedAccount.upsert({
        where: { integrationId: integration.id },
        create: {
            integrationId: integration.id,
            providerAccountId,
            displayName,
            currency,
            timezone,
            isDefault: true
        },
        update: {
            providerAccountId,
            displayName,
            currency,
            timezone,
            isDefault: true
        }
    })

    return NextResponse.json({ success: true, connectedAccount })
}
