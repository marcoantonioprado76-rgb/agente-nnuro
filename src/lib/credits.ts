import type Stripe from 'stripe'
import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/audit'
import { createUserNotification } from '@/lib/notifications'
import { sendCreditsPurchaseEmail } from '@/lib/email'

type Service = Awaited<ReturnType<typeof createServiceRoleClient>>

/**
 * Activa una compra de créditos AI:
 *   1. Marca credit_purchases como completed (idempotente).
 *   2. Suma amount_usd al profiles.ai_credits_usd del usuario.
 *   3. Audit log + notificación in-app + email.
 *
 * Se usa desde 2 lugares:
 *   - webhook checkout.session.completed (cuando metadata.purpose === 'credits')
 *   - verify endpoint como fallback (cuando billing/wallet llama tras pagar)
 *
 * Idempotente: si ya está completed, devuelve { activated: false, alreadyDone: true }.
 */
export async function activateCreditPurchase(
  service: Service,
  session: Stripe.Checkout.Session,
  trigger: 'webhook' | 'verify'
): Promise<{ activated: boolean; alreadyDone: boolean; purchase?: { id: string; amount_usd: number }; newBalance?: number; error?: string }> {
  const userId = session.metadata?.user_id
  const amountStr = session.metadata?.amount_usd
  const tenantId = session.metadata?.tenant_id
  const stripeCustomerId = (session.customer as string) || null

  if (!userId || !amountStr) {
    return { activated: false, alreadyDone: false, error: 'missing user_id o amount_usd en metadata' }
  }
  const amount = Number(amountStr)
  if (!Number.isFinite(amount) || amount <= 0) {
    return { activated: false, alreadyDone: false, error: 'amount inválido' }
  }
  if (session.payment_status !== 'paid') {
    return { activated: false, alreadyDone: false, error: `payment_status: ${session.payment_status}` }
  }

  // Idempotencia: si ya está completed, no procesar de nuevo
  const { data: existing } = await service
    .from('credit_purchases')
    .select('id, status, amount_usd')
    .eq('stripe_checkout_session_id', session.id)
    .maybeSingle()

  if (existing?.status === 'completed') {
    return { activated: false, alreadyDone: true, purchase: { id: existing.id, amount_usd: Number(existing.amount_usd) } }
  }

  const nowIso = new Date().toISOString()

  // Marcar la compra como completed
  const { data: purchase, error: purchaseErr } = await service
    .from('credit_purchases')
    .update({
      status: 'completed',
      stripe_customer_id: stripeCustomerId,
      stripe_payment_intent_id: (session.payment_intent as string) || null,
      completed_at: nowIso,
      updated_at: nowIso,
    })
    .eq('stripe_checkout_session_id', session.id)
    .select('id, amount_usd')
    .single()

  if (purchaseErr || !purchase) {
    return { activated: false, alreadyDone: false, error: `update credit_purchases: ${purchaseErr?.message || 'unknown'}` }
  }

  // Sumar al balance del usuario
  const { data: profile } = await service
    .from('profiles')
    .select('ai_credits_usd, email, full_name')
    .eq('id', userId)
    .single()

  const currentBalance = Number(profile?.ai_credits_usd ?? 0)
  const newBalance = currentBalance + Number(purchase.amount_usd)

  await service
    .from('profiles')
    .update({ ai_credits_usd: newBalance, updated_at: nowIso })
    .eq('id', userId)

  // Audit
  await logAudit({
    userId,
    tenantId: tenantId || undefined,
    action: 'credits_compra_exitosa',
    entityType: 'pago',
    entityId: purchase.id,
    details: {
      amount_usd: Number(purchase.amount_usd),
      previous_balance: currentBalance,
      new_balance: newBalance,
      stripe_session_id: session.id,
      activated_by: trigger,
    },
  })

  // Notificación in-app
  createUserNotification({
    userId,
    type: 'creditos_recargados',
    title: `+$${Number(purchase.amount_usd).toFixed(2)} en créditos`,
    message: `Tu saldo es ahora $${newBalance.toFixed(2)} USD.`,
    link: '/wallet',
  }).catch(() => {})

  // Email (no-bloqueante)
  if (profile?.email) {
    sendCreditsPurchaseEmail(
      profile.email,
      profile.full_name || 'Usuario',
      Number(purchase.amount_usd),
      newBalance
    ).catch(() => {})
  }

  console.log(`[Credits] +$${purchase.amount_usd} → balance $${newBalance} (user ${userId}, trigger: ${trigger})`)

  return {
    activated: true,
    alreadyDone: false,
    purchase: { id: purchase.id, amount_usd: Number(purchase.amount_usd) },
    newBalance,
  }
}

/**
 * Helper para devolver la respuesta JSON correcta desde el endpoint verify.
 */
export async function verifyCreditsPurchase(
  service: Service,
  session: Stripe.Checkout.Session,
  expectedUserId: string
): Promise<NextResponse> {
  if (session.metadata?.user_id !== expectedUserId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const result = await activateCreditPurchase(service, session, 'verify')

  if (result.error) {
    console.error('[Credits verify] error:', result.error)
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  if (result.alreadyDone) {
    return NextResponse.json({
      status: 'already_active',
      purpose: 'credits',
      purchase: result.purchase,
    })
  }

  return NextResponse.json({
    status: 'activated',
    purpose: 'credits',
    purchase: result.purchase,
    new_balance: result.newBalance,
  })
}
