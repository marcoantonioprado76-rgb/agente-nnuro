export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser, unauthorizedAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')

  const requests = await prisma.packPurchaseRequest.findMany({
    where: status ? { status: status as any } : {},
    include: {
      user: {
        select: { username: true, fullName: true, email: true, country: true },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  return NextResponse.json({
    // price: Decimal → number, blockNumber: BigInt → string (no serializable nativamente a JSON)
    requests: requests.map(r => ({
      ...r,
      price: Number(r.price),
      blockNumber: r.blockNumber?.toString() ?? null,
    })),
  })
}
