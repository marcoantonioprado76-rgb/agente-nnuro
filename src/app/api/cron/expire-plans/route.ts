export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/cron/expire-plans
 *
 * Desactiva planes vencidos: plan → NONE, bots → PAUSED, stores → inactive.
 * Debe llamarse vía Vercel Cron cada hora (vercel.json):
 *
 * {
 *   "crons": [{ "path": "/api/cron/expire-plans", "schedule": "0 * * * *" }]
 * }
 *
 * Autenticado con CRON_SECRET para que no sea llamable públicamente.
 */
export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-cron-secret') ?? request.headers.get('authorization')?.replace('Bearer ', '')

  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const now = new Date()

    // Buscar usuarios con plan vencido
    const expiredUsers = await prisma.$queryRaw<Array<{ id: string; plan: string }>>`
      SELECT id::text, plan::text
      FROM users
      WHERE plan != 'NONE'
        AND plan_expires_at IS NOT NULL
        AND plan_expires_at < ${now}
    `

    if (expiredUsers.length === 0) {
      return NextResponse.json({ ok: true, processed: 0 })
    }

    const userIds = expiredUsers.map(u => u.id)

    // Un solo batch de updates — no N transacciones individuales
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        UPDATE users
        SET plan = 'NONE'::"UserPlan", plan_expires_at = NULL
        WHERE id = ANY(${userIds}::uuid[])
      `
      await tx.$executeRaw`
        UPDATE bots
        SET status = 'PAUSED'::"BotStatus"
        WHERE user_id = ANY(${userIds}::uuid[])
      `
      await tx.$executeRaw`
        UPDATE stores SET active = false
        WHERE user_id = ANY(${userIds}::uuid[])
      `

      // Audit logs en batch
      for (const u of expiredUsers) {
        await tx.auditLog.create({
          data: {
            userId: u.id,
            action: 'PLAN_EXPIRED',
            entityType: 'User',
            entityId: u.id,
            payload: { previousPlan: u.plan, expiredAt: now.toISOString() },
          },
        })
      }
    })

    return NextResponse.json({ ok: true, processed: expiredUsers.length })
  } catch (err) {
    console.error('[cron/expire-plans]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
