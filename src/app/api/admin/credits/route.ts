export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser, unauthorizedAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'

// GET — list users with their credit balances
export async function GET(req: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  const { searchParams } = new URL(req.url)
  const search = searchParams.get('q') ?? ''

  const users = await prisma.user.findMany({
    where: search
      ? {
          OR: [
            { fullName: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { username: { contains: search, mode: 'insensitive' } },
          ],
        }
      : undefined,
    select: {
      id: true,
      fullName: true,
      username: true,
      email: true,
      aiCredits: true,
      aiBalanceUsd: true,
      preferOwnKey: true,
      plan: true,
      isActive: true,
    },
    orderBy: { fullName: 'asc' },
    take: 50,
  })

  return NextResponse.json({
    users: users.map(u => ({ ...u, aiBalanceUsd: Number(u.aiBalanceUsd) })),
  })
}

// POST — assign / adjust credits for a user
// Acepta dos formatos:
//   { userId, credits: number, mode: 'set'|'add'|'subtract' }       → opera sobre aiCredits (legacy)
//   { userId, usd: number,     mode: 'set'|'add'|'subtract' }       → opera sobre aiBalanceUsd
export async function POST(req: Request) {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  const body = await req.json()
  const { userId, mode = 'set' } = body
  if (!userId) return NextResponse.json({ error: 'userId requerido' }, { status: 400 })

  const useUsd = typeof body.usd === 'number'
  const amount = useUsd ? body.usd : body.credits

  if (typeof amount !== 'number' || amount < 0 || !Number.isFinite(amount)) {
    return NextResponse.json({ error: 'Monto inválido (debe ser ≥0)' }, { status: 400 })
  }

  if (useUsd) {
    // Operar sobre aiBalanceUsd en transacción para evitar race
    const updated = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId}::uuid FOR UPDATE`
      const cur = await tx.user.findUnique({ where: { id: userId }, select: { aiBalanceUsd: true } })
      const current = cur?.aiBalanceUsd ? Number(cur.aiBalanceUsd) : 0
      let next: number
      if (mode === 'add') next = current + amount
      else if (mode === 'subtract') next = Math.max(0, current - amount)
      else next = amount
      // Redondeo a 4 decimales (la columna es Decimal(10,4))
      next = Math.round(next * 10000) / 10000

      const u = await tx.user.update({
        where: { id: userId },
        data: { aiBalanceUsd: next.toString() } as any,
        select: { id: true, fullName: true, aiBalanceUsd: true, aiCredits: true },
      })

      // Audit log + entry en historial de uso (para visibilidad del usuario)
      const delta = next - current
      if (delta !== 0) {
        await (tx as any).aIUsageLog.create({
          data: {
            userId,
            model: 'admin_adjustment',
            reason: mode === 'add' ? 'admin.add_usd' : mode === 'subtract' ? 'admin.subtract_usd' : 'admin.set_usd',
            costUsd: -delta,   // negativo = entrada, positivo = salida (consistente con el resto de logs)
            metadata: { adminId: admin.id, previousUsd: current, newUsd: next },
          },
        })
        await tx.auditLog.create({
          data: {
            userId,
            actorUserId: admin.id,
            action: 'AI_BALANCE_ADJUSTED',
            entityType: 'User',
            entityId: userId,
            payload: { mode, requested: amount, previousUsd: current, newUsd: next },
          },
        })
      }

      return u
    })

    return NextResponse.json({
      success: true,
      user: { ...updated, aiBalanceUsd: Number(updated.aiBalanceUsd) },
    })
  }

  // Legacy: operar sobre aiCredits (Int)
  let data: { aiCredits: number }
  if (mode === 'add') {
    const current = await prisma.user.findUnique({ where: { id: userId }, select: { aiCredits: true } })
    data = { aiCredits: (current?.aiCredits ?? 0) + amount }
  } else if (mode === 'subtract') {
    const current = await prisma.user.findUnique({ where: { id: userId }, select: { aiCredits: true } })
    data = { aiCredits: Math.max(0, (current?.aiCredits ?? 0) - amount) }
  } else {
    data = { aiCredits: amount }
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data,
    select: { id: true, fullName: true, aiCredits: true },
  })

  return NextResponse.json({ success: true, user: updated })
}
