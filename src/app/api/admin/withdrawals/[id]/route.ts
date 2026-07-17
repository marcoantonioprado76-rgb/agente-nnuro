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
    // Rechazar reintegra el saldo reservado al solicitar (solo si no estaba ya
    // rechazado/pagado, para no reintegrar dos veces).
    if (withdrawal.status === 'REJECTED' || withdrawal.status === 'PAID') {
      return NextResponse.json({ error: 'Esta solicitud ya fue procesada.' }, { status: 400 })
    }
    await prisma.$transaction(async (tx) => {
      await tx.withdrawalRequest.update({
        where: { id: params.id },
        data: { status: 'REJECTED', notes: notes ?? null, reviewedBy: admin.id, reviewedAt: new Date() },
      })
      await tx.$executeRaw`UPDATE users SET ai_balance_usd = ai_balance_usd + ${Number(withdrawal.amount)} WHERE id = ${withdrawal.userId}::uuid`
      await tx.auditLog.create({
        data: { userId: withdrawal.userId, actorUserId: admin.id, action: 'WITHDRAWAL_REJECTED', entityType: 'WithdrawalRequest', entityId: params.id, payload: { refunded: Number(withdrawal.amount) } },
      })
    })
  } else {
    return NextResponse.json({ error: 'Acción inválida' }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
