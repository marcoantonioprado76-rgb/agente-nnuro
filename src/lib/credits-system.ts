/**
 * Sistema de créditos AI basado en ledger.
 *
 * Modelo de datos:
 *   - profiles.included_credits_balance      → créditos del plan mensual (se resetean al recargar)
 *   - profiles.additional_credits_balance    → créditos comprados como paquetes (no expiran o expiran por fecha)
 *   - credit_movements                       → ledger inmutable con cada recarga/consumo/ajuste
 *
 * Reglas:
 *   - El consumo descuenta PRIMERO de included, después de additional.
 *   - Nunca se permite balance negativo.
 *   - Cada movimiento puede llevar idempotency_key para evitar doble descuento.
 *   - Conversión USD ↔ créditos: configurable por plan vía credit_usd_conversion_rate (default 100 = 1 USD).
 *
 * Compatibilidad backward:
 *   - profiles.ai_credits_usd legacy se mantiene intacto. Las funciones nuevas no lo tocan.
 *     Una fase futura puede hacer un backfill que convierta ese balance al ledger.
 */

import { randomUUID } from 'crypto'
import { createServiceRoleClient } from '@/lib/supabase/server'

type Service = Awaited<ReturnType<typeof createServiceRoleClient>>

export type MovementType =
  | 'recharge_included'
  | 'recharge_additional'
  | 'consumption'
  | 'adjustment_admin'
  | 'expiration'
  | 'refund'
  | 'migration'

export interface CreditsBalance {
  included: number
  additional: number
  total: number
  usedCurrentCycle: number
  lastRechargeDate: string | null
  nextRechargeDate: string | null
}

export interface ConsumeOpts {
  conversationId?: string
  agentId?: string
  aiUsageLogId?: string
  /** Clave única para idempotencia. Si se repite, no descuenta de nuevo. */
  idempotencyKey?: string
  description?: string
  source?: string
}

export interface ConsumeResult {
  ok: boolean
  /** créditos efectivamente descontados (0 si idempotente o no había balance) */
  consumed: number
  /** balance restante total después del consumo */
  balanceAfter: number
  /** desglose del consumo: cuánto salió de included vs additional */
  fromIncluded: number
  fromAdditional: number
  /** true si el saldo total quedó en 0 (agotado) */
  exhausted: boolean
  /** true si la operación fue ignorada por idempotencia */
  alreadyProcessed: boolean
  error?: string
}

// ============================================================
// LECTURA
// ============================================================

export async function getCreditsBalance(
  service: Service,
  userId: string
): Promise<CreditsBalance> {
  const { data } = await service
    .from('profiles')
    .select('included_credits_balance, additional_credits_balance, credits_used_current_cycle, last_credit_recharge_date, next_credit_recharge_date')
    .eq('id', userId)
    .single()

  const included = Number(data?.included_credits_balance ?? 0)
  const additional = Number(data?.additional_credits_balance ?? 0)
  return {
    included,
    additional,
    total: included + additional,
    usedCurrentCycle: Number(data?.credits_used_current_cycle ?? 0),
    lastRechargeDate: data?.last_credit_recharge_date ?? null,
    nextRechargeDate: data?.next_credit_recharge_date ?? null,
  }
}

// ============================================================
// CONVERSIÓN USD ↔ CRÉDITOS
// ============================================================

/** Default conversion: $1 USD = 100 créditos */
export const DEFAULT_USD_TO_CREDITS = 100

export function usdToCredits(usd: number, rate: number = DEFAULT_USD_TO_CREDITS): number {
  return Math.ceil(usd * rate)
}

export function creditsToUsd(credits: number, rate: number = DEFAULT_USD_TO_CREDITS): number {
  return credits / rate
}

/**
 * Devuelve la conversion rate del plan activo del usuario, o el default
 * si no tiene plan o el plan no tiene rate configurado.
 */
export async function getUserConversionRate(
  service: Service,
  userId: string
): Promise<number> {
  const { data: sub } = await service
    .from('subscriptions')
    .select('plan_id, status, approval_status')
    .eq('user_id', userId)
    .eq('status', 'active')
    .eq('approval_status', 'approved')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!sub?.plan_id) return DEFAULT_USD_TO_CREDITS

  const { data: plan } = await service
    .from('plans')
    .select('credit_usd_conversion_rate')
    .eq('id', sub.plan_id)
    .single()

  const rate = Number(plan?.credit_usd_conversion_rate ?? 0)
  return rate > 0 ? rate : DEFAULT_USD_TO_CREDITS
}

// ============================================================
// CONSUMO (descuenta créditos)
// ============================================================

/**
 * Descuenta créditos del balance del usuario.
 *   - Primero del included_credits_balance
 *   - Luego del additional_credits_balance
 *   - No permite balance negativo
 *   - Si se pasa idempotencyKey y ya existe un movement con esa key, retorna alreadyProcessed=true sin descontar
 *
 * Retorna ConsumeResult con detalle del descuento.
 */
export async function consumeCredits(
  service: Service,
  userId: string,
  amount: number,
  opts: ConsumeOpts = {}
): Promise<ConsumeResult> {
  if (!Number.isFinite(amount) || amount <= 0) {
    return {
      ok: false, consumed: 0, balanceAfter: 0, fromIncluded: 0,
      fromAdditional: 0, exhausted: false, alreadyProcessed: false,
      error: `amount inválido: ${amount}`,
    }
  }

  // Idempotencia: si ya existe un movement con esa key, no procesar
  if (opts.idempotencyKey) {
    const { data: existing } = await service
      .from('credit_movements')
      .select('id, balance_after')
      .eq('idempotency_key', opts.idempotencyKey)
      .maybeSingle()

    if (existing) {
      return {
        ok: true, consumed: 0, balanceAfter: Number(existing.balance_after),
        fromIncluded: 0, fromAdditional: 0, exhausted: false,
        alreadyProcessed: true,
      }
    }
  }

  const { data: profile } = await service
    .from('profiles')
    .select('included_credits_balance, additional_credits_balance, credits_used_current_cycle')
    .eq('id', userId)
    .single()

  const included = Math.max(0, Number(profile?.included_credits_balance ?? 0))
  const additional = Math.max(0, Number(profile?.additional_credits_balance ?? 0))
  const balanceBefore = included + additional
  const usedBefore = Number(profile?.credits_used_current_cycle ?? 0)

  // Calcular descuento: primero included, después additional
  const fromIncluded = Math.min(included, amount)
  const remaining = amount - fromIncluded
  const fromAdditional = Math.min(additional, remaining)
  const totalConsumed = fromIncluded + fromAdditional

  const newIncluded = included - fromIncluded
  const newAdditional = additional - fromAdditional
  const balanceAfter = newIncluded + newAdditional

  if (totalConsumed === 0) {
    // No había balance — registrar intento como consumption con amount 0 para auditoría
    return {
      ok: true, consumed: 0, balanceAfter,
      fromIncluded: 0, fromAdditional: 0,
      exhausted: true, alreadyProcessed: false,
    }
  }

  const nowIso = new Date().toISOString()

  // Actualizar balance + acumulado de uso
  const { error: updErr } = await service
    .from('profiles')
    .update({
      included_credits_balance: newIncluded,
      additional_credits_balance: newAdditional,
      credits_used_current_cycle: usedBefore + totalConsumed,
      updated_at: nowIso,
    })
    .eq('id', userId)

  if (updErr) {
    console.error('[consumeCredits] update error:', updErr)
    return {
      ok: false, consumed: 0, balanceAfter: balanceBefore,
      fromIncluded: 0, fromAdditional: 0, exhausted: false,
      alreadyProcessed: false, error: updErr.message,
    }
  }

  // Registrar movimiento en el ledger
  await service.from('credit_movements').insert({
    id: randomUUID(),
    user_id: userId,
    movement_type: 'consumption',
    amount: -totalConsumed,
    balance_before: balanceBefore,
    balance_after: balanceAfter,
    source: opts.source ?? 'ai_usage',
    related_conversation_id: opts.conversationId ?? null,
    related_agent_id: opts.agentId ?? null,
    related_ai_usage_log_id: opts.aiUsageLogId ?? null,
    idempotency_key: opts.idempotencyKey ?? null,
    description: opts.description ?? `Consumo IA: ${totalConsumed} créditos`,
    created_at: nowIso,
  })

  return {
    ok: true,
    consumed: totalConsumed,
    balanceAfter,
    fromIncluded,
    fromAdditional,
    exhausted: balanceAfter === 0,
    alreadyProcessed: false,
  }
}

// ============================================================
// RECARGAS
// ============================================================

export interface RechargeIncludedOpts {
  /** Si true, suma a los included existentes. Si false (default), reemplaza. */
  accumulate?: boolean
  subscriptionId?: string
  description?: string
  source?: string
  /** Clave única — útil para "no recargar dos veces este mes" */
  idempotencyKey?: string
}

/**
 * Recarga el balance de créditos incluidos del plan.
 *
 * Si opts.accumulate = false (default): REEMPLAZA el balance included.
 *   (los créditos sin usar del ciclo anterior se PIERDEN)
 *
 * Si opts.accumulate = true: SUMA al balance included existente.
 *
 * Resetea credits_used_current_cycle a 0 (nuevo ciclo).
 */
export async function rechargeIncludedCredits(
  service: Service,
  userId: string,
  amount: number,
  opts: RechargeIncludedOpts = {}
): Promise<{ ok: boolean; balanceAfter: number; error?: string; alreadyProcessed?: boolean }> {
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, balanceAfter: 0, error: 'amount inválido' }
  }

  // Idempotencia
  if (opts.idempotencyKey) {
    const { data: existing } = await service
      .from('credit_movements')
      .select('id, balance_after')
      .eq('idempotency_key', opts.idempotencyKey)
      .maybeSingle()
    if (existing) {
      return { ok: true, balanceAfter: Number(existing.balance_after), alreadyProcessed: true }
    }
  }

  const { data: profile } = await service
    .from('profiles')
    .select('included_credits_balance, additional_credits_balance, accumulate_unused_credits')
    .eq('id', userId)
    .single()

  const includedBefore = Math.max(0, Number(profile?.included_credits_balance ?? 0))
  const additional = Math.max(0, Number(profile?.additional_credits_balance ?? 0))
  const balanceBefore = includedBefore + additional

  const accumulate = opts.accumulate ?? Boolean(profile?.accumulate_unused_credits)
  const newIncluded = accumulate ? includedBefore + amount : amount
  const balanceAfter = newIncluded + additional

  const nowIso = new Date().toISOString()

  const { error: updErr } = await service
    .from('profiles')
    .update({
      included_credits_balance: newIncluded,
      credits_used_current_cycle: 0,
      last_credit_recharge_date: nowIso,
      updated_at: nowIso,
    })
    .eq('id', userId)

  if (updErr) {
    console.error('[rechargeIncludedCredits] update error:', updErr)
    return { ok: false, balanceAfter: balanceBefore, error: updErr.message }
  }

  await service.from('credit_movements').insert({
    id: randomUUID(),
    user_id: userId,
    movement_type: 'recharge_included',
    amount,
    balance_before: balanceBefore,
    balance_after: balanceAfter,
    source: opts.source ?? 'plan_monthly',
    related_subscription_id: opts.subscriptionId ?? null,
    idempotency_key: opts.idempotencyKey ?? null,
    description: opts.description ?? `Recarga mensual del plan: ${amount} créditos`,
    created_at: nowIso,
  })

  return { ok: true, balanceAfter }
}

/**
 * Suma créditos al balance adicional (compra de paquete o ajuste).
 */
export async function rechargeAdditionalCredits(
  service: Service,
  userId: string,
  amount: number,
  opts: {
    packageId?: string
    description?: string
    source?: string
    idempotencyKey?: string
    movementType?: 'recharge_additional' | 'adjustment_admin' | 'refund'
  } = {}
): Promise<{ ok: boolean; balanceAfter: number; error?: string; alreadyProcessed?: boolean }> {
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, balanceAfter: 0, error: 'amount inválido' }
  }

  if (opts.idempotencyKey) {
    const { data: existing } = await service
      .from('credit_movements')
      .select('id, balance_after')
      .eq('idempotency_key', opts.idempotencyKey)
      .maybeSingle()
    if (existing) {
      return { ok: true, balanceAfter: Number(existing.balance_after), alreadyProcessed: true }
    }
  }

  const { data: profile } = await service
    .from('profiles')
    .select('included_credits_balance, additional_credits_balance')
    .eq('id', userId)
    .single()

  const included = Math.max(0, Number(profile?.included_credits_balance ?? 0))
  const additionalBefore = Math.max(0, Number(profile?.additional_credits_balance ?? 0))
  const balanceBefore = included + additionalBefore
  const newAdditional = additionalBefore + amount
  const balanceAfter = included + newAdditional

  const nowIso = new Date().toISOString()

  const { error: updErr } = await service
    .from('profiles')
    .update({
      additional_credits_balance: newAdditional,
      updated_at: nowIso,
    })
    .eq('id', userId)

  if (updErr) {
    console.error('[rechargeAdditionalCredits] update error:', updErr)
    return { ok: false, balanceAfter: balanceBefore, error: updErr.message }
  }

  await service.from('credit_movements').insert({
    id: randomUUID(),
    user_id: userId,
    movement_type: opts.movementType ?? 'recharge_additional',
    amount,
    balance_before: balanceBefore,
    balance_after: balanceAfter,
    source: opts.source ?? 'package_purchase',
    related_package_id: opts.packageId ?? null,
    idempotency_key: opts.idempotencyKey ?? null,
    description: opts.description ?? `Recarga adicional: +${amount} créditos`,
    created_at: nowIso,
  })

  return { ok: true, balanceAfter }
}

// ============================================================
// ALERTAS (porcentaje de consumo del ciclo)
// ============================================================

export type AlertLevel = 'none' | 'warn70' | 'warn90' | 'exhausted'

/** Calcula el nivel de alerta según el % consumido del balance INCLUIDO del ciclo. */
export function calculateAlertLevel(includedAtStartOfCycle: number, usedCurrentCycle: number): AlertLevel {
  if (includedAtStartOfCycle <= 0) return 'none'
  const pct = usedCurrentCycle / includedAtStartOfCycle
  if (pct >= 1.0) return 'exhausted'
  if (pct >= 0.9) return 'warn90'
  if (pct >= 0.7) return 'warn70'
  return 'none'
}

export const ALERT_MESSAGES: Record<Exclude<AlertLevel, 'none'>, string> = {
  warn70: 'Ya utilizaste el 70% de tus créditos de IA del mes. Tu agente continúa funcionando normalmente, pero te recomendamos revisar tu consumo.',
  warn90: 'Tu saldo de créditos de IA está por agotarse. Compra créditos adicionales o mejora tu plan para continuar atendiendo clientes sin interrupciones.',
  exhausted: 'Tus créditos de IA se agotaron temporalmente. Los mensajes de tus clientes continúan registrándose, pero tu agente necesita créditos adicionales para responder automáticamente.',
}
