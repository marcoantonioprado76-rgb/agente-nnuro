import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { rechargeIncludedCredits } from '@/lib/credits-system'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Cron: recarga mensual de créditos para suscripciones activas.
 *
 * Cómo funciona:
 *   - Busca subscriptions con status=active, approval_status=approved,
 *     end_date > now (no vencidas) y next_credit_recharge_date <= now.
 *   - Para cada una, recarga los créditos del plan, aplica accumulate
 *     según profiles.accumulate_unused_credits, y avanza
 *     next_credit_recharge_date +1 mes.
 *   - Es idempotente vía idempotency_key que combina subscription_id + mes/año
 *     (si el cron corre múltiples veces el mismo día, no recarga dos veces).
 *
 * Autorización:
 *   - Requiere header "x-cron-secret" igual a process.env.CRON_SECRET, o
 *     en su defecto algún proveedor de cron específico (Vercel cron incluye
 *     "user-agent: vercel-cron/1.0" — opcional).
 */
export async function POST(request: NextRequest) {
  return run(request)
}

export async function GET(request: NextRequest) {
  return run(request)
}

async function run(request: NextRequest): Promise<NextResponse> {
  // Autorización del cron
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const headerSecret = request.headers.get('x-cron-secret')
    if (headerSecret !== cronSecret) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
  }

  const service = await createServiceRoleClient()
  const nowIso = new Date().toISOString()

  // Buscar subscriptions que les toca recargar
  const { data: subs, error: subErr } = await service
    .from('subscriptions')
    .select('id, user_id, plan_id, billing_period, next_credit_recharge_date, end_date')
    .eq('status', 'active')
    .eq('approval_status', 'approved')
    .lte('next_credit_recharge_date', nowIso)
    .gt('end_date', nowIso)
    .limit(500)

  if (subErr) {
    console.error('[cron/recharge-credits] error listando subs:', subErr)
    return NextResponse.json({ error: 'Error consultando suscripciones' }, { status: 500 })
  }

  const stats = { totalEvaluated: subs?.length ?? 0, recharged: 0, skipped: 0, errors: 0 }

  for (const sub of subs ?? []) {
    try {
      const { data: plan } = await service
        .from('plans')
        .select('included_monthly_ai_credits, name')
        .eq('id', sub.plan_id)
        .single()

      const credits = Number(plan?.included_monthly_ai_credits ?? 0)
      if (credits <= 0) {
        stats.skipped++
        continue
      }

      // idempotency: subscription + año-mes de la fecha de recarga
      const targetDate = new Date(sub.next_credit_recharge_date!)
      const yearMonth = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}`
      const idemKey = `monthly_recharge:${sub.id}:${yearMonth}`

      const result = await rechargeIncludedCredits(service, sub.user_id, credits, {
        subscriptionId: sub.id,
        source: 'cron_monthly_recharge',
        description: `Recarga mensual automática del plan ${plan?.name || ''}: ${credits} créditos`,
        idempotencyKey: idemKey,
      })

      if (result.alreadyProcessed) {
        stats.skipped++
      } else if (result.ok) {
        stats.recharged++
      } else {
        stats.errors++
        console.error('[cron/recharge-credits] recharge falló:', sub.id, result.error)
        continue
      }

      // Avanzar próxima fecha de recarga +1 mes
      const next = new Date(targetDate)
      next.setMonth(next.getMonth() + 1)

      await service
        .from('subscriptions')
        .update({ next_credit_recharge_date: next.toISOString(), updated_at: nowIso })
        .eq('id', sub.id)

      await service
        .from('profiles')
        .update({ next_credit_recharge_date: next.toISOString(), updated_at: nowIso })
        .eq('id', sub.user_id)
    } catch (e) {
      stats.errors++
      console.error('[cron/recharge-credits] excepción en sub', sub.id, e)
    }
  }

  console.log('[cron/recharge-credits] ejecutado:', stats)
  return NextResponse.json({ ok: true, ...stats })
}
