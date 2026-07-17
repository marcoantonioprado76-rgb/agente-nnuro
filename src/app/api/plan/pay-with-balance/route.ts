export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getPlanCredits } from '@/lib/plan-config'
import { reactivateUserAssetsAfterPlanRenewal } from '@/lib/plan-lifecycle'
import { getPeriodPricing, normalizeMonths } from '@/lib/plan-pricing'

const PLAN_RANK: Record<string, number> = { NONE: 0, BASIC: 1, PRO: 2, ELITE: 3 }

/**
 * Pagar (activar/renovar) el plan usando el SALDO interno del usuario, con
 * período de facturación (1/3/12 meses). Instantáneo, sin aprobación de admin.
 * NO paga comisión de referido (evita bucle de saldo).
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const body = await request.json()
    const plan = String(body.plan || '').toUpperCase()
    const months = normalizeMonths(body.months ?? 1)
    if (!['BASIC', 'PRO', 'ELITE'].includes(plan)) {
      return NextResponse.json({ error: 'Plan inválido' }, { status: 400 })
    }

    // Precio del período (mensual = base; renovación mensual = PRICE_RENEWAL)
    const pricing = await getPeriodPricing(prisma, plan, months)
    const renewalSetting = await prisma.appSetting.findUnique({ where: { key: 'PRICE_RENEWAL' } })
    const renewalPrice = renewalSetting ? parseFloat(renewalSetting.value) : 19

    const result = await prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<Array<{ plan: string; bal: string }>>`
        SELECT plan::text AS plan, ai_balance_usd::text AS bal FROM users WHERE id = ${user.id}::uuid FOR UPDATE
      `
      const currentPlan = rows[0]?.plan ?? 'NONE'
      const balance = parseFloat(rows[0]?.bal ?? '0')
      const currentRank = PLAN_RANK[currentPlan] ?? 0
      const newRank = PLAN_RANK[plan] ?? 0
      if (newRank < currentRank) throw new Error('PLAN_DOWNGRADE')

      const isRenewal = newRank === currentRank && currentRank > 0
      // Renovación mensual = precio de renovación fijo; lo demás = precio del período.
      const price = (months === 1 && isRenewal) ? renewalPrice : pricing.price
      if (!(price > 0)) throw new Error('PRICE_NOT_SET')
      if (balance < price) throw new Error(`INSUFFICIENT_BALANCE:${balance.toFixed(2)}`)

      // 1. Descontar del saldo
      await tx.$executeRaw`UPDATE users SET ai_balance_usd = ai_balance_usd - ${price} WHERE id = ${user.id}::uuid`

      // 2. Activar/renovar con la duración del período (meses × 30 días)
      const days = pricing.days
      if (isRenewal) {
        await tx.$executeRaw`
          UPDATE users SET is_active = true,
            plan_expires_at = GREATEST(COALESCE(plan_expires_at, NOW()), NOW()) + (${days} || ' days')::interval
          WHERE id = ${user.id}::uuid`
      } else {
        await tx.$executeRaw`
          UPDATE users SET plan = ${plan}::"UserPlan", is_active = true,
            plan_expires_at = NOW() + (${days} || ' days')::interval
          WHERE id = ${user.id}::uuid`
      }

      // 3. Créditos IA proporcionales al período (beneficio)
      const credits = (await getPlanCredits(plan, tx)) * months
      if (credits > 0) {
        await tx.$executeRaw`UPDATE users SET ai_balance_usd = ai_balance_usd + ${credits} WHERE id = ${user.id}::uuid`
      }

      await reactivateUserAssetsAfterPlanRenewal(user.id, tx)

      await tx.packPurchaseRequest.create({
        data: {
          userId: user.id, plan: plan as any, price, billingMonths: months, paymentMethod: 'MANUAL',
          status: 'APPROVED', reviewedAt: new Date(), notes: `Pagado con saldo interno (${months} mes/es)`,
        },
      })
      await tx.auditLog.create({
        data: {
          userId: user.id, actorUserId: user.id, action: 'PLAN_PAID_WITH_BALANCE',
          entityType: 'User', entityId: user.id, payload: { plan, price, months, credits },
        },
      })

      return { plan, price, months, isRenewal }
    }, { maxWait: 10000, timeout: 20000 })

    return NextResponse.json({ success: true, ...result })
  } catch (err: any) {
    if (err?.message?.startsWith('INSUFFICIENT_BALANCE:')) {
      return NextResponse.json({ error: `Saldo insuficiente. Disponible: $${err.message.split(':')[1]}` }, { status: 400 })
    }
    if (err?.message === 'PLAN_DOWNGRADE') return NextResponse.json({ error: 'No puedes bajar de plan.' }, { status: 400 })
    if (err?.message === 'PRICE_NOT_SET') return NextResponse.json({ error: 'Precio no configurado.' }, { status: 400 })
    console.error('[POST /api/plan/pay-with-balance]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
