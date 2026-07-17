export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getPlanCredits } from '@/lib/plan-config'
import { reactivateUserAssetsAfterPlanRenewal } from '@/lib/plan-lifecycle'

const PLAN_RANK: Record<string, number> = { NONE: 0, BASIC: 1, PRO: 2, ELITE: 3 }
const DEFAULT_PRICES: Record<string, number> = { BASIC: 49, PRO: 99, ELITE: 199 }

/**
 * Pagar (activar/renovar) el plan usando el SALDO interno del usuario
 * (ai_balance_usd, que incluye lo ganado por referidos). Instantáneo, sin
 * aprobación de admin, porque el dinero ya está dentro de NÜRO.
 *
 * NOTA: NO paga comisión de referido al referidor — para no crear un bucle
 * donde el saldo de referidos se auto-multiplique. La comisión solo se paga
 * sobre pagos externos reales (aprobación de admin).
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const body = await request.json()
    const plan = String(body.plan || '').toUpperCase()
    if (!['BASIC', 'PRO', 'ELITE'].includes(plan)) {
      return NextResponse.json({ error: 'Plan inválido' }, { status: 400 })
    }

    // Precios de config (mismo criterio que el checkout): renovación fija vs nuevo.
    const [renewalSetting, baseSetting] = await Promise.all([
      prisma.appSetting.findUnique({ where: { key: 'PRICE_RENEWAL' } }),
      prisma.appSetting.findUnique({ where: { key: `PRICE_${plan}` } }),
    ])
    const renewalPrice = renewalSetting ? parseFloat(renewalSetting.value) : 19
    const basePrice = baseSetting ? parseFloat(baseSetting.value) : (DEFAULT_PRICES[plan] ?? 0)

    const result = await prisma.$transaction(async (tx) => {
      // Lock del usuario: plan actual + saldo
      const rows = await tx.$queryRaw<Array<{ plan: string; bal: string }>>`
        SELECT plan::text AS plan, ai_balance_usd::text AS bal FROM users WHERE id = ${user.id}::uuid FOR UPDATE
      `
      const currentPlan = rows[0]?.plan ?? 'NONE'
      const balance = parseFloat(rows[0]?.bal ?? '0')
      const currentRank = PLAN_RANK[currentPlan] ?? 0
      const newRank = PLAN_RANK[plan] ?? 0

      if (newRank < currentRank) throw new Error('PLAN_DOWNGRADE')

      const isRenewal = newRank === currentRank && currentRank > 0
      const price = isRenewal ? renewalPrice : basePrice
      if (!(price > 0)) throw new Error('PRICE_NOT_SET')
      if (balance < price) throw new Error(`INSUFFICIENT_BALANCE:${balance.toFixed(2)}`)

      // 1. Descontar el precio del saldo
      await tx.$executeRaw`UPDATE users SET ai_balance_usd = ai_balance_usd - ${price} WHERE id = ${user.id}::uuid`

      // 2. Activar o renovar el plan
      if (isRenewal) {
        await tx.$executeRaw`
          UPDATE users SET is_active = true,
            plan_expires_at = GREATEST(COALESCE(plan_expires_at, NOW()), NOW()) + INTERVAL '30 days'
          WHERE id = ${user.id}::uuid`
      } else {
        await tx.$executeRaw`
          UPDATE users SET plan = ${plan}::"UserPlan", is_active = true,
            plan_expires_at = NOW() + INTERVAL '30 days'
          WHERE id = ${user.id}::uuid`
      }

      // 3. Créditos IA incluidos en el plan
      const credits = await getPlanCredits(plan, tx)
      if (credits > 0) {
        await tx.$executeRaw`UPDATE users SET ai_balance_usd = ai_balance_usd + ${credits} WHERE id = ${user.id}::uuid`
      }

      // 4. Reactivar assets pausados por vencimiento previo
      await reactivateUserAssetsAfterPlanRenewal(user.id, tx)

      // 5. Registro de compra (historial) + audit
      await tx.packPurchaseRequest.create({
        data: {
          userId: user.id, plan: plan as any, price, paymentMethod: 'MANUAL',
          status: 'APPROVED', reviewedAt: new Date(), notes: 'Pagado con saldo interno',
        },
      })
      await tx.auditLog.create({
        data: {
          userId: user.id, actorUserId: user.id, action: 'PLAN_PAID_WITH_BALANCE',
          entityType: 'User', entityId: user.id, payload: { plan, price, credits },
        },
      })

      return { plan, price, isRenewal }
    }, { maxWait: 10000, timeout: 20000 })

    return NextResponse.json({ success: true, ...result })
  } catch (err: any) {
    if (err?.message?.startsWith('INSUFFICIENT_BALANCE:')) {
      return NextResponse.json({ error: `Saldo insuficiente. Disponible: $${err.message.split(':')[1]}` }, { status: 400 })
    }
    if (err?.message === 'PLAN_DOWNGRADE') {
      return NextResponse.json({ error: 'No puedes bajar de plan.' }, { status: 400 })
    }
    if (err?.message === 'PRICE_NOT_SET') {
      return NextResponse.json({ error: 'Precio no configurado.' }, { status: 400 })
    }
    console.error('[POST /api/plan/pay-with-balance]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
