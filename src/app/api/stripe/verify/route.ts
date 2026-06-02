import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getServerSession } from '@/lib/auth'
import { stripe, calculateEndDate, StripeNotConfiguredError } from '@/lib/stripe'
import { logAudit } from '@/lib/audit'
import { verifyCreditsPurchase } from '@/lib/credits'

export const dynamic = 'force-dynamic'

/**
 * POST /api/stripe/verify
 * Verifies a Stripe checkout session and activates the subscription.
 * Fallback for when the webhook doesn't arrive (e.g. localhost).
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await getServerSession()
    if (!auth) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    const user = { id: auth.sub, email: auth.email }

    const { session_id } = await request.json()
    if (!session_id) {
      return NextResponse.json({ error: 'session_id es requerido' }, { status: 400 })
    }

    const service = await createServiceRoleClient()

    // 2. Verify with Stripe
    let session: Stripe.Checkout.Session
    try {
      session = await stripe.checkout.sessions.retrieve(session_id)
    } catch (stripeErr) {
      if (stripeErr instanceof StripeNotConfiguredError) {
        console.error('[Stripe Verify] STRIPE_SECRET_KEY no configurada en el servidor')
        return NextResponse.json(
          { error: 'El pago con Stripe no está configurado en el servidor' },
          { status: 503 }
        )
      }
      if (stripeErr instanceof Stripe.errors.StripeError) {
        console.error('[Stripe Verify] Error de Stripe:', {
          type: stripeErr.type,
          code: stripeErr.code,
          message: stripeErr.message,
        })
        // Si la sesión no existe en Stripe, 404 explícito; cualquier otro error → 502
        const status = stripeErr.code === 'resource_missing' ? 404 : 502
        return NextResponse.json(
          { error: status === 404 ? 'Sesión de Stripe no encontrada' : `Stripe: ${stripeErr.message}` },
          { status }
        )
      }
      console.error('[Stripe Verify] Error inesperado al retrieve session:', stripeErr)
      return NextResponse.json({ error: 'Error al verificar sesión' }, { status: 500 })
    }

    if (session.metadata?.user_id !== user.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    if (session.payment_status !== 'paid') {
      return NextResponse.json({
        status: 'not_paid',
        payment_status: session.payment_status,
      })
    }

    // 2.5 Branch por purpose: 'credits' usa flujo de créditos AI
    if (session.metadata?.purpose === 'credits') {
      return await verifyCreditsPurchase(service, session, user.id)
    }

    // 2.6 Para subscriptions: check si ya está activa (idempotencia)
    const { data: existingSub } = await service
      .from('subscriptions')
      .select('id, status, approval_status')
      .eq('payment_id', session_id)
      .eq('user_id', user.id)
      .single()

    if (existingSub?.status === 'active' && existingSub?.approval_status === 'approved') {
      return NextResponse.json({ status: 'already_active', subscription: existingSub })
    }

    // 3. Payment confirmed — activate with 1 calendar month
    const now = new Date()
    const endDate = calculateEndDate(now)

    const planId = session.metadata?.plan_id
    const planName = session.metadata?.plan_name
    const tenantId = session.metadata?.tenant_id
    const stripeCustomerId = session.metadata?.stripe_customer_id || (session.customer as string)

    const { data: subscription, error: subError } = await service
      .from('subscriptions')
      .update({
        status: 'active',
        approval_status: 'approved',
        start_date: now.toISOString(),
        end_date: endDate.toISOString(),
        approved_at: now.toISOString(),
        stripe_customer_id: stripeCustomerId,
        stripe_checkout_session_id: session_id,
        admin_notes: `Activado por verificacion directa con Stripe. Vence: ${endDate.toLocaleDateString('es-MX')}`,
        updated_at: now.toISOString(),
      })
      .eq('payment_id', session_id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (subError || !subscription) {
      console.error('[Stripe Verify] Error activating subscription:', subError)
      return NextResponse.json({ error: 'Error al activar suscripcion' }, { status: 500 })
    }

    // 4. Update payment record
    await service
      .from('payments')
      .update({
        payment_status: 'completed',
        transaction_id: (session.payment_intent as string) || session.id,
        stripe_payment_intent_id: (session.payment_intent as string) || null,
        stripe_customer_id: stripeCustomerId,
        reviewed_at: now.toISOString(),
        admin_notes: `Pago verificado con Stripe. Activo hasta ${endDate.toLocaleDateString('es-MX')}`,
      })
      .eq('transaction_id', session_id)
      .eq('user_id', user.id)

    // 5. Notification
    const { data: profile } = await service
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .single()

    const { data: plan } = await service
      .from('plans')
      .select('name, price, currency')
      .eq('id', planId || '')
      .single()

    try {
      await service.from('admin_notifications').insert({
        type: 'pago_exitoso',
        title: 'Nuevo pago recibido via Stripe',
        message: `${profile?.full_name || 'Usuario'} (${profile?.email || ''}) pagó ${plan?.name || planName || 'Plan'} - $${plan?.price || 0} ${plan?.currency || 'USD'}. Activo hasta ${endDate.toLocaleDateString('es-MX')}`,
        target_user_id: user.id,
        related_entity_type: 'subscription',
        related_entity_id: subscription.id,
      })
    } catch { /* non-critical */ }

    // 6. Audit
    await logAudit({
      userId: user.id,
      tenantId: tenantId || undefined,
      action: 'pago_stripe_verificado',
      entityType: 'pago',
      entityId: subscription.id,
      details: {
        plan_name: planName,
        amount: session.amount_total ? session.amount_total / 100 : 0,
        start_date: now.toISOString(),
        end_date: endDate.toISOString(),
        stripe_session_id: session.id,
        method: 'direct_verify',
      },
    })

    console.log(`[Stripe Verify] Suscripción activada: usuario ${user.id}, vence ${endDate.toISOString()}`)

    return NextResponse.json({
      status: 'activated',
      subscription,
    })
  } catch (error) {
    console.error('[Stripe Verify] Error:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
