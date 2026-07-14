export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getOrgAdmin, unauthorizedOrg } from '@/lib/org-auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/empresa/purchases
 * El admin de empresa lista las solicitudes de comprobante de SU organización.
 */
export async function GET() {
  try {
    const ctx = await getOrgAdmin()
    if (!ctx) return unauthorizedOrg()
    const { organizationId } = ctx

    const rows = await prisma.packPurchaseRequest.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        user: { select: { username: true, fullName: true, email: true } },
      },
    })

    const requests = rows.map((r) => ({
      id: r.id,
      plan: r.plan,
      price: Number(r.price),
      paymentProofUrl: r.paymentProofUrl,
      paymentMethod: r.paymentMethod,
      status: r.status,
      notes: r.notes,
      createdAt: r.createdAt,
      user: {
        username: r.user.username,
        fullName: r.user.fullName,
        email: r.user.email,
      },
    }))

    return NextResponse.json({ requests })
  } catch (err) {
    console.error('[GET /api/empresa/purchases]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
