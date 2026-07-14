export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser, unauthorizedAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'

/** GET /api/admin/credit-purchases — lista solicitudes de compra de créditos AI */
export async function GET(req: NextRequest) {
    const admin = await getAdminUser()
    if (!admin) return unauthorizedAdmin()

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') // PENDING | APPROVED | REJECTED | null = todos
    const search = searchParams.get('q') ?? ''

    const where: any = {}
    if (status && ['PENDING', 'PENDING_VERIFICATION', 'APPROVED', 'REJECTED'].includes(status)) where.status = status
    if (search) {
        where.user = {
            OR: [
                { fullName: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { username: { contains: search, mode: 'insensitive' } },
            ],
        }
    }

    const purchases = await (prisma as any).creditPurchaseRequest.findMany({
        where,
        orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
        take: 100,
        select: {
            id: true,
            amountUsd: true,
            paymentMethod: true,
            paymentProofUrl: true,
            txHash: true,
            status: true,
            notes: true,
            createdAt: true,
            reviewedAt: true,
            user: {
                select: {
                    id: true,
                    fullName: true,
                    email: true,
                    username: true,
                    aiBalanceUsd: true,
                },
            },
        },
    })

    return NextResponse.json({
        purchases: purchases.map((p: any) => ({
            ...p,
            amountUsd: Number(p.amountUsd),
            user: { ...p.user, aiBalanceUsd: Number(p.user.aiBalanceUsd) },
        })),
    })
}
