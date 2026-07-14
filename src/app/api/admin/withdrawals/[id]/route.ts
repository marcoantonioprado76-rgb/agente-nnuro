export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser, unauthorizedAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  const body = await request.json()
  const { action, proofUrl, notes } = body
  // action: 'approve' | 'mark_paid' | 'reject'

  const withdrawal = await prisma.withdrawalRequest.findUnique({
    where: { id: params.id },
  })

  if (!withdrawal) {
    return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 })
  }

  if (action === 'approve') {
    await prisma.withdrawalRequest.update({
      where: { id: params.id },
      data: {
        status: 'APPROVED',
        notes: notes ?? null,
        reviewedBy: admin.id,
        reviewedAt: new Date(),
      },
    })
  } else if (action === 'mark_paid') {
    await prisma.withdrawalRequest.update({
      where: { id: params.id },
      data: {
        status: 'PAID',
        proofUrl: proofUrl ?? null,
        paidAt: new Date(),
        reviewedBy: admin.id,
        reviewedAt: new Date(),
      },
    })
  } else if (action === 'reject') {
    await prisma.withdrawalRequest.update({
      where: { id: params.id },
      data: {
        status: 'REJECTED',
        notes: notes ?? null,
        reviewedBy: admin.id,
        reviewedAt: new Date(),
      },
    })
  } else {
    return NextResponse.json({ error: 'Acción inválida' }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
