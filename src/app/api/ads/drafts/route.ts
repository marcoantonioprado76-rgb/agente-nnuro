export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { AdPlatform } from '@prisma/client'

export async function GET(req: Request) {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const drafts = await prisma.adDraft.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        include: { connectedAccount: true }
    })

    return NextResponse.json({ drafts })
}

export async function POST(req: Request) {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const {
        platform, name, objective, connectedAccountId,
        providerPageId, providerWhatsAppNumber, pixelId, welcomeMessage,
        budgetAmount, budgetType, primaryText, headline, destinationUrl,
        assetType, assetUrl
    } = body

    const draft = await (prisma.adDraft as any).create({
        data: {
            userId: user.id,
            platform: platform as AdPlatform,
            name,
            objective,
            connectedAccountId,
            providerPageId,
            providerWhatsAppNumber,
            pixelId,
            welcomeMessage,
            budgetAmount: parseFloat(budgetAmount || '0'),
            budgetType,
            primaryText,
            headline,
            destinationUrl,
            status: 'DRAFT',
            assets: assetUrl ? {
                create: {
                    userId: user.id,
                    type: assetType as any,
                    storageUrl: assetUrl,
                }
            } : undefined
        }
    })

    return NextResponse.json({ draft })
}
