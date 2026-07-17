export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'

const MIN_WITHDRAWAL = 10

/**
 * Retiros con modelo "reserva al solicitar": el saldo retirable ES el
 * ai_balance_usd. Al crear una solicitud se descuenta de inmediato (para que no
 * se pueda gastar dos veces dentro de NÜRO). Si el admin rechaza, se reintegra.
 */
export async function GET() {
  try {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const [u, withdrawals, paidAgg] = await Promise.all([
      prisma.user.findUnique({ where: { id: user.id }, select: { aiBalanceUsd: true } }),
      prisma.withdrawalRequest.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' } }),
      prisma.withdrawalRequest.aggregate({ where: { userId: user.id, status: 'PAID' }, _sum: { amount: true } }),
    ])

    const available = Number(u?.aiBalanceUsd ?? 0)
    return NextResponse.json({
      balance: { available, totalPaid: Number(paidAgg._sum.amount ?? 0), min: MIN_WITHDRAWAL },
      withdrawals: withdrawals.map(w => ({ ...w, amount: Number(w.amount) })),
    })
  } catch (err) {
    console.error('[GET /api/withdrawals]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const rl = rateLimit(`withdrawal:${user.id}`, RATE_LIMITS.withdrawal)
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Demasiadas solicitudes de retiro. Espera un momento.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
      )
    }

    const { amount, walletAddress, walletQrUrl } = await request.json()
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      return NextResponse.json({ error: 'Monto inválido' }, { status: 400 })
    }
    const amountNum = parseFloat(Number(amount).toFixed(2))
    if (amountNum < MIN_WITHDRAWAL) {
      return NextResponse.json({ error: `El retiro mínimo es $${MIN_WITHDRAWAL.toFixed(2)}` }, { status: 400 })
    }
    if (!walletAddress && !walletQrUrl) {
      return NextResponse.json({ error: 'Ingresa tu dirección de wallet o sube un QR de cobro' }, { status: 400 })
    }

    const withdrawal = await prisma.$transaction(async (tx) => {
      // Lock del saldo del usuario para evitar doble gasto simultáneo.
      const rows = await tx.$queryRaw<Array<{ bal: string }>>`
        SELECT ai_balance_usd::text AS bal FROM users WHERE id = ${user.id}::uuid FOR UPDATE
      `
      const balance = parseFloat(rows[0]?.bal ?? '0')
      if (amountNum > balance) throw new Error(`INSUFFICIENT_BALANCE:${balance.toFixed(2)}`)

      // Reservar: descontar del saldo YA (se reintegra si se rechaza).
      await tx.$executeRaw`UPDATE users SET ai_balance_usd = ai_balance_usd - ${amountNum} WHERE id = ${user.id}::uuid`

      const created = await tx.withdrawalRequest.create({
        data: { userId: user.id, amount: amountNum, walletAddress: walletAddress ?? null, walletQrUrl: walletQrUrl ?? null, status: 'PENDING' },
      })
      await tx.auditLog.create({
        data: { userId: user.id, actorUserId: user.id, action: 'WITHDRAWAL_REQUESTED', entityType: 'WithdrawalRequest', entityId: created.id, payload: { amount: amountNum, balanceBefore: balance } },
      })
      return created
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 10000, timeout: 20000 })

    return NextResponse.json({ success: true, withdrawal: { ...withdrawal, amount: Number(withdrawal.amount) } })
  } catch (err: any) {
    if (err?.message?.startsWith('INSUFFICIENT_BALANCE:')) {
      return NextResponse.json({ error: `Saldo insuficiente. Disponible: $${err.message.split(':')[1]}` }, { status: 400 })
    }
    if (err?.code === 'P2034') {
      return NextResponse.json({ error: 'Conflicto de transacción. Intenta de nuevo.' }, { status: 409 })
    }
    console.error('[POST /api/withdrawals]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
