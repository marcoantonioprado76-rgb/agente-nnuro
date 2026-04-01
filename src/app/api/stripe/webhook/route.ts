import { NextRequest, NextResponse } from 'next/server'
import { verifyWebhookSignature, calculateEndDate } from '@/lib/stripe'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/audit'
import { createUserNotification } from '@/lib/notifications'
import { sendPlanPurchaseEmail } from '@/lib/email'
import type Stripe from 'stripe'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  let event: Stripe.Event

  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
      console.error('[Stripe Webhook] Missing stripe-signature header')
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
    }

    event = verifyWebhookSignature(body, signature)
  } catch (err) {
    console.error('[Stripe Webhook] Signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const service = await createServiceRoleClient()

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        await handleCheckoutCompleted(service, event.data.object as Stripe.Checkout.Session)
        break
      }

      case 'checkout.session.expired': {
        await handleCheckoutExpired(service, event.data.object as Stripe.Checkout.Session)
        break
      }

      default:
        console.log(`[Stripe Webhook] Evento no manejado: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error(`[Stripe Webhook] Error procesando ${event.type}:`, error)
    return NextResponse.json({ error: 'Webhook processing error' }, { status: 500 })
  }
}

// ============================================================
// HANDLERS
// ============================================================

async function handleCheckoutCompleted(
  service: Awaited<ReturnType<typeof createServiceRoleClient>>,
  session: Stripe.Checkout.Session
) {
  const userId = session.metadata?.user_id
  const planId = session.metadata?.plan_id
  const planName = session.metadata?.plan_name
  const tenantId = session.metadata?.tenant_id
  const stripeCustomerId = session.metadata?.stripe_customer_id || (session.customer as string)

  if (!userId || !planId) {
    console.error('[Stripe Webhook] checkout.session.completed sin user_id o plan_id en metadata')
    return
  }

  if (session.payment_status !== 'paid') {
    console.log('[Stripe Webhook] Checkout completed but payment_status is not paid:', session.payment_status)
    return
  }

  // Prevent duplicate processing
  const { data: existingActive } = await service
    .from('subscriptions')
    .select('id')
    .eq('payment_id', session.id)
    .eq('status', 'active')
    .single()

  if (existingActive) {
    console.log('[Stripe Webhook] Pago ya procesado para session:', session.id)
    return
  }

  // Calculate 1 calendar month subscription
  const now = new Date()
  const endDate = calculateEndDate(now)

  // 1. Activate subscription
  const { data: subscription, error: subError } = await service
    .from('subscriptions')
    .update({
      status: 'active',
      approval_status: 'approved',
      start_date: now.toISOString(),
      end_date: endDate.toISOString(),
      approved_at: now.toISOString(),
      stripe_customer_id: stripeCustomerId,
      stripe_checkout_session_id: session.id,
      admin_notes: `Activado automaticamente por Stripe. Vence: ${endDate.toLocaleDateString('es-MX')}`,
      updated_at: now.toISOString(),
    })
    .eq('payment_id', session.id)
    .eq('user_id', userId)
    .select()
    .single()

  if (subError || !subscription) {
    console.error('[Stripe Webhook] No se encontró suscripción para session:', session.id, subError)
    return
  }

  // 2. Update payment record
  await service
    .from('payments')
    .update({
      payment_status: 'completed',
      transaction_id: (session.payment_intent as string) || session.id,
      stripe_payment_intent_id: (session.payment_intent as string) || null,
      stripe_customer_id: stripeCustomerId,
      reviewed_at: now.toISOString(),
      admin_notes: `Pago verificado por Stripe. Suscripción activa hasta ${endDate.toLocaleDateString('es-MX')}`,
    })
    .eq('transaction_id', session.id)
    .eq('user_id', userId)

  // 3. Notification & Audit
  const { data: profile } = await service
    .from('profiles')
    .select('full_name, email')
    .eq('id', userId)
    .single()

  const { data: plan } = await service
    .from('plans')
    .select('name, price, currency')
    .eq('id', planId)
    .single()

  try {
    await service.from('admin_notifications').insert({
      type: 'pago_exitoso',
      title: 'Nuevo pago recibido via Stripe',
      message: `${profile?.full_name || 'Usuario'} (${profile?.email || ''}) pagó ${plan?.name || planName || 'Plan'} - $${plan?.price || 0} ${plan?.currency || 'USD'}. Activo hasta ${endDate.toLocaleDateString('es-MX')}`,
      target_user_id: userId,
      related_entity_type: 'subscription',
      related_entity_id: subscription.id,
    })
  } catch { /* non-critical */ }

  // User notification: subscription activated
  createUserNotification({
    userId,
    type: 'suscripcion_activada',
    title: `Plan ${plan?.name || planName || ''} activado`,
    message: `Tu suscripción está activa hasta el ${endDate.toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}. ¡Disfruta todas las funciones!`,
    link: '/subscription',
  }).catch(() => {})

  // Plan purchase email
  if (profile?.email) {
    sendPlanPurchaseEmail(
      profile.email,
      profile.full_name || 'Usuario',
      plan?.name || planName || 'Plan',
      endDate,
      plan?.price || (session.amount_total ? session.amount_total / 100 : 0),
      plan?.currency || 'USD'
    ).catch(() => {})
  }

  await logAudit({
    userId,
    tenantId: tenantId || undefined,
    action: 'pago_stripe_exitoso',
    entityType: 'pago',
    entityId: subscription.id,
    details: {
      plan_name: planName,
      amount: session.amount_total ? session.amount_total / 100 : 0,
      start_date: now.toISOString(),
      end_date: endDate.toISOString(),
      stripe_session_id: session.id,
      payment_intent: session.payment_intent,
    },
  })

  await logAudit({
    userId,
    tenantId: tenantId || undefined,
    action: 'suscripcion_activada',
    entityType: 'suscripcion',
    entityId: subscription.id,
    details: {
      plan_name: planName,
      start_date: now.toISOString(),
      end_date: endDate.toISOString(),
      activated_by: 'stripe_webhook',
    },
  })

  console.log(`[Stripe Webhook] Suscripción activada: usuario ${userId}, plan ${planName}, vence ${endDate.toISOString()}`)
}

async function handleCheckoutExpired(
  service: Awaited<ReturnType<typeof createServiceRoleClient>>,
  session: Stripe.Checkout.Session
) {
  const userId = session.metadata?.user_id
  const tenantId = session.metadata?.tenant_id

  if (!userId) return

  await service
    .from('subscriptions')
    .update({
      status: 'cancelled',
      approval_status: 'rejected',
      admin_notes: 'Sesión de pago expirada',
      updated_at: new Date().toISOString(),
    })
    .eq('payment_id', session.id)
    .eq('user_id', userId)
    .eq('status', 'pending')

  await service
    .from('payments')
    .update({ payment_status: 'failed' })
    .eq('transaction_id', session.id)
    .eq('user_id', userId)
    .eq('payment_status', 'pending')

  await logAudit({
    userId,
    tenantId: tenantId || undefined,
    action: 'checkout_expirado',
    entityType: 'pago',
    details: { stripe_session_id: session.id },
  })

  console.log(`[Stripe Webhook] Checkout expirado para usuario ${userId}`)
}
