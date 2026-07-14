export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'

export async function GET() {
  try {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const [committedAgg, withdrawals] = await Promise.all([
      prisma.withdrawalRequest.aggregate({
        where: { userId: user.id, status: { in: ['PAID', 'APPROVED', 'PENDING'] } },
        _sum: { amount: true },
      }),
      prisma.withdrawalRequest.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
      }),
    ])

    const totalEarned = 0
    const totalCommitted = Number(committedAgg._sum.amount ?? 0)
    const available = Math.max(0, totalEarned - totalCommitted)

    return NextResponse.json({
      balance: { totalEarned, available },
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

    // Rate limit: 5 solicitudes por hora por usuario
    const rl = rateLimit(`withdrawal:${user.id}`, RATE_LIMITS.withdrawal)
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Demasiadas solicitudes de retiro. Espera un momento.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
      )
    }

    const body = await request.json()
    const { amount, walletAddress, walletQrUrl } = body

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      return NextResponse.json({ error: 'Monto inválido' }, { status: 400 })
    }
    const amountNum = parseFloat(Number(amount).toFixed(2))
    if (amountNum < 10) {
      return NextResponse.json({ error: 'El retiro mínimo es $10.00' }, { status: 400 })
    }
    if (!walletAddress && !walletQrUrl) {
      return NextResponse.json({ error: 'Debes ingresar tu dirección de wallet o subir un QR' }, { status: 400 })
    }

    // SERIALIZABLE garantiza que dos requests simultáneos no puedan ambos pasar
    // el check de saldo y crear dos withdrawals que superen el balance.
    const withdrawal = await prisma.$transaction(async (tx) => {
      // FOR UPDATE en las comisiones y retiros del usuario — row-level lock
      const [committedAgg] = await Promise.all([
        tx.$queryRaw<Array<{ total: string }>>`
          SELECT COALESCE(SUM(amount), 0)::text AS total
          FROM withdrawal_requests
          WHERE user_id = ${user.id}::uuid
            AND status IN ('PENDING', 'APPROVED', 'PAID')
          FOR UPDATE
        `,
      ])

      const totalEarned = 0
      const totalCommitted = parseFloat(committedAgg[0]?.total ?? '0')
      const available = Math.max(0, totalEarned - totalCommitted)

      if (amountNum > available) {
        throw new Error(`INSUFFICIENT_BALANCE:${available.toFixed(2)}`)
      }

      const created = await tx.withdrawalRequest.create({
        data: {
          userId: user.id,
          amount: amountNum,
          walletAddress: walletAddress ?? null,
          walletQrUrl: walletQrUrl ?? null,
          status: 'PENDING',
        },
      })

      // Audit log
      await tx.auditLog.create({
        data: {
          userId: user.id,
          actorUserId: user.id,
          action: 'WITHDRAWAL_REQUESTED',
          entityType: 'WithdrawalRequest',
          entityId: created.id,
          payload: { amount: amountNum, available },
        },
      })

      return created
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    })

    return NextResponse.json({
      success: true,
      withdrawal: { ...withdrawal, amount: Number(withdrawal.amount) },
    })
  } catch (err: any) {
    if (err?.message?.startsWith('INSUFFICIENT_BALANCE:')) {
      const available = err.message.split(':')[1]
      return NextResponse.json({ error: `Saldo insuficiente. Disponible: $${available}` }, { status: 400 })
    }
    // Serializable transaction conflict — retry desde el cliente
    if (err?.code === 'P2034') {
      return NextResponse.json(
        { error: 'Conflicto de transacción. Por favor intenta de nuevo.' },
        { status: 409 }
      )
    }
    console.error('[POST /api/withdrawals]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
