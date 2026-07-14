export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'

const PACK_CONFIG: Record<string, { price: number; label: string }> = {
  BASIC: { price: 49,  label: 'Pack Básico' },
  PRO:   { price: 99,  label: 'Pack Pro' },
  ELITE: { price: 199, label: 'Pack Elite' },
}
const PLAN_RANK: Record<string, number> = { NONE: 0, BASIC: 1, PRO: 2, ELITE: 3 }

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const rl = rateLimit(`activate-plan:${user.id}`, RATE_LIMITS.activatePlan)
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Demasiados intentos de activación. Intenta en una hora.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
      )
    }

    const body = await request.json()
    const plan = (body.plan as string)?.toUpperCase()

    if (!plan || !PACK_CONFIG[plan]) {
      return NextResponse.json({ error: 'Plan inválido' }, { status: 400 })
    }

    const config = PACK_CONFIG[plan]

    const result = await prisma.$transaction(async (tx) => {
      const currentUser = await tx.$queryRaw<Array<{
        plan: string
        plan_expires_at: Date | null
        full_name: string
      }>>`
        SELECT plan::text, plan_expires_at, full_name
        FROM users WHERE id = ${user.id}::uuid
        FOR UPDATE
      `
      if (!currentUser[0]) throw new Error('USER_NOT_FOUND')

      const currentRank = PLAN_RANK[currentUser[0].plan ?? 'NONE'] ?? 0
      const newRank = PLAN_RANK[plan] ?? 0
      const isRenewal = newRank === currentRank && currentRank > 0

      if (newRank < currentRank || newRank === 0) {
        throw new Error('PLAN_NOT_UPGRADE')
      }

      const approvedRequest = await tx.packPurchaseRequest.findFirst({
        where: { userId: user.id, plan: plan as any, status: 'APPROVED' },
        orderBy: { reviewedAt: 'desc' },
      })

      if (!approvedRequest) {
        throw new Error('NO_APPROVED_PAYMENT')
      }

      // Marcar el purchase request como PAID
      await tx.packPurchaseRequest.update({
        where: { id: approvedRequest.id },
        data: { status: 'PAID' },
      })

      // Activar o renovar el plan
      if (isRenewal) {
        await tx.$executeRaw`
          UPDATE users
          SET is_active = true,
              plan_expires_at = GREATEST(COALESCE(plan_expires_at, NOW()), NOW()) + INTERVAL '30 days'
          WHERE id = ${user.id}::uuid
        `
      } else {
        await tx.$executeRaw`
          UPDATE users
          SET plan = ${plan}::"UserPlan",
              plan_expires_at = NOW() + INTERVAL '30 days',
              is_active = true
          WHERE id = ${user.id}::uuid
        `
      }

      // Reactivar bots y stores que el cron de expire-plans hubiera pausado por
      // vencimiento. Sin esto, los bots quedan PAUSED después de renovar y dejan
      // de responder mensajes (handleMessage ignora bots no-ACTIVE).
      await tx.$executeRaw`
        UPDATE bots
        SET status = 'ACTIVE'::"BotStatus"
        WHERE user_id = ${user.id}::uuid AND status = 'PAUSED'
      `
      await tx.$executeRaw`
        UPDATE stores
        SET active = true
        WHERE user_id = ${user.id}::uuid AND active = false
      `

      await tx.auditLog.create({
        data: {
          userId: user.id,
          actorUserId: user.id,
          action: 'PLAN_ACTIVATED',
          entityType: 'PackPurchaseRequest',
          entityId: approvedRequest.id,
          payload: { plan, price: config.price },
        },
      })

      return { plan, config }
    })

    return NextResponse.json({
      success: true,
      plan: result.plan,
      message: `¡${result.config.label} activado correctamente!`,
    })
  } catch (err: any) {
    if (err.message === 'NO_APPROVED_PAYMENT') {
      return NextResponse.json({
        error: 'No tienes un pago aprobado para este plan. Espera la aprobación del administrador.',
      }, { status: 403 })
    }
    if (err.message === 'PLAN_NOT_UPGRADE') {
      return NextResponse.json({ error: 'No puedes bajar de plan ni activar un plan inválido.' }, { status: 400 })
    }
    if (err.message === 'ALREADY_PROCESSED') {
      return NextResponse.json({ error: 'Este plan ya fue activado.' }, { status: 409 })
    }
    if (err.message === 'USER_NOT_FOUND') {
      return NextResponse.json({ error: 'Usuario no encontrado.' }, { status: 404 })
    }
    console.error('[POST /api/activate-plan]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    return NextResponse.json({
      currentPlan: (user as any).plan ?? 'NONE',
      sponsorshipBonuses: [],
    })
  } catch (err) {
    console.error('[GET /api/activate-plan]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
