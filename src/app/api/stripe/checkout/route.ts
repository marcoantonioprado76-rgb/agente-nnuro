import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import Stripe from 'stripe'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getServerSession } from '@/lib/auth'
import { stripe, StripeNotConfiguredError } from '@/lib/stripe'
import { getPaymentMethodsSettings } from '@/lib/settings'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    // 1. Verify authenticated user — app uses custom JWT, not Supabase auth
    const auth = await getServerSession()
    if (!auth) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    const user = { id: auth.sub, email: auth.email }

    const body = await request.json()
    const { plan_id } = body
    const billingPeriod: 'monthly' | 'quarterly' | 'annual' =
      ['monthly', 'quarterly', 'annual'].includes(body?.billing_period)
        ? body.billing_period
        : 'monthly'

    if (!plan_id) {
      return NextResponse.json({ error: 'plan_id es requerido' }, { status: 400 })
    }

    // Verify Stripe payment method is enabled
    const paymentSettings = await getPaymentMethodsSettings()
    if (!paymentSettings.stripe) {
      return NextResponse.json({ error: 'El pago con Stripe no está disponible en este momento' }, { status: 503 })
    }

    const service = await createServiceRoleClient()

    // 2. Validate plan exists and is active
    const { data: plan } = await service
      .from('plans')
      .select('*')
      .eq('id', plan_id)
      .eq('is_active', true)
      .single()

    if (!plan) {
      return NextResponse.json({ error: 'Plan no encontrado o inactivo' }, { status: 404 })
    }

    // 2.1 Validate plan fields critical for Stripe — evita TypeErrors silenciosos
    // Selecciona el precio según billing_period (fallback al precio mensual / price legacy)
    const periodPriceRaw =
      billingPeriod === 'annual'    ? (plan.annual_price ?? null) :
      billingPeriod === 'quarterly' ? (plan.quarterly_price ?? null) :
                                       (plan.monthly_price ?? plan.price ?? null)

    if (periodPriceRaw == null) {
      console.error('[Stripe Checkout] Plan sin precio para periodo:', { plan_id, billingPeriod })
      return NextResponse.json(
        { error: `El plan no tiene precio configurado para ${billingPeriod}` },
        { status: 400 }
      )
    }
    const planPrice = typeof periodPriceRaw === 'number' ? periodPriceRaw : Number(periodPriceRaw)
    const planCurrency = (plan.currency || '').toString().trim()
    if (!Number.isFinite(planPrice) || planPrice <= 0) {
      console.error('[Stripe Checkout] Plan con precio inválido:', { plan_id, price: periodPriceRaw, billingPeriod })
      return NextResponse.json({ error: 'El plan tiene un precio inválido' }, { status: 400 })
    }
    if (!planCurrency || planCurrency.length !== 3) {
      console.error('[Stripe Checkout] Plan con moneda inválida:', { plan_id, currency: plan.currency })
      return NextResponse.json({ error: 'El plan tiene una moneda inválida' }, { status: 400 })
    }
    // Stripe requiere unit_amount >= 50 centavos en USD (equivalente en otras monedas)
    const unitAmount = Math.round(planPrice * 100)
    if (unitAmount < 50) {
      console.error('[Stripe Checkout] Monto demasiado bajo para Stripe:', { unitAmount })
      return NextResponse.json({ error: 'El monto mínimo para procesar es 0.50' }, { status: 400 })
    }

    // 3. Check existing subscriptions
    const { data: existingSub } = await service
      .from('subscriptions')
      .select('id, status, approval_status, stripe_customer_id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    // Block only if there's an active subscription; cancel pending ones to allow retry
    if (existingSub) {
      const isActive = existingSub.status === 'active' && existingSub.approval_status === 'approved'

      if (isActive) {
        return NextResponse.json(
          { error: 'Ya tienes una suscripción activa' },
          { status: 409 }
        )
      }

      // Cancel any pending subscription so the user can retry with another method/plan
      if (existingSub.status === 'pending') {
        await service
          .from('subscriptions')
          .update({ status: 'cancelled', admin_notes: 'Cancelado automáticamente al reintentar pago', updated_at: new Date().toISOString() })
          .eq('id', existingSub.id)

        await service
          .from('payments')
          .update({ payment_status: 'failed' })
          .eq('subscription_id', existingSub.id)
          .eq('payment_status', 'pending')
      }
      // Expired, cancelled, rejected → allow renewal
    }

    // 4. Get user profile for metadata
    const { data: profile } = await service
      .from('profiles')
      .select('full_name, email, tenant_id')
      .eq('id', user.id)
      .single()

    // 5. Reuse existing Stripe customer or create new one
    let customerId = existingSub?.stripe_customer_id || null
    let session: Stripe.Checkout.Session

    try {
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: profile?.email || user.email || '',
          name: profile?.full_name || '',
          metadata: {
            supabase_user_id: user.id,
            tenant_id: profile?.tenant_id || '',
          },
        })
        customerId = customer.id
      }

      // 6. Create Stripe Checkout session
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

      session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'payment',
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: planCurrency.toLowerCase(),
              product_data: {
                name: `Plan ${plan.name} - ${billingPeriod === 'annual' ? '1 año' : billingPeriod === 'quarterly' ? '3 meses' : 'mensual'}`,
                description: `Plan ${plan.name} (${billingPeriod}) — Agente de Ventas NÜRO`,
              },
              unit_amount: unitAmount,
            },
            quantity: 1,
          },
        ],
        metadata: {
          user_id: user.id,
          plan_id: plan.id,
          plan_name: plan.name,
          billing_period: billingPeriod,
          tenant_id: profile?.tenant_id || '',
          stripe_customer_id: customerId,
        },
        success_url: `${appUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl}/pricing`,
        expires_at: Math.floor(Date.now() / 1000) + 1800,
      })
    } catch (stripeErr) {
      // Casos específicos: env faltante, API key inválida, moneda no soportada, etc.
      if (stripeErr instanceof StripeNotConfiguredError) {
        console.error('[Stripe Checkout] STRIPE_SECRET_KEY no configurada en el servidor')
        return NextResponse.json(
          { error: 'El pago con Stripe no está configurado en el servidor' },
          { status: 503 }
        )
      }
      if (stripeErr instanceof Stripe.errors.StripeError) {
        console.error('[Stripe Checkout] Error de Stripe:', {
          type: stripeErr.type,
          code: stripeErr.code,
          message: stripeErr.message,
          param: stripeErr.param,
        })
        return NextResponse.json(
          { error: `Stripe: ${stripeErr.message}` },
          { status: 502 }
        )
      }
      throw stripeErr
    }

    // 7. Create pending subscription record
    const nowIso = new Date().toISOString()
    const { data: subscription, error: subError } = await service
      .from('subscriptions')
      .insert({
        id: randomUUID(),
        user_id: user.id,
        plan_id: plan.id,
        status: 'pending',
        approval_status: 'pending_review',
        payment_provider: 'stripe',
        payment_id: session.id,
        stripe_customer_id: customerId,
        stripe_checkout_session_id: session.id,
        billing_period: billingPeriod,
        price_paid: planPrice,
        created_at: nowIso,
        updated_at: nowIso,
      })
      .select()
      .single()

    if (subError) {
      console.error('[Stripe Checkout] Error creating subscription:', {
        message: subError.message,
        code: subError.code,
        details: subError.details,
        hint: subError.hint,
        user_id: user.id,
        plan_id: plan.id,
      })
      return NextResponse.json(
        { error: `Error al crear suscripción: ${subError.message || 'sin detalle'}` },
        { status: 500 }
      )
    }

    // 8. Create pending payment record (payments table no tiene updated_at)
    if (subscription) {
      const { error: payError } = await service.from('payments').insert({
        id: randomUUID(),
        user_id: user.id,
        subscription_id: subscription.id,
        amount: planPrice,
        currency: planCurrency,
        payment_method: 'stripe',
        payment_status: 'pending',
        transaction_id: session.id,
        stripe_checkout_session_id: session.id,
        stripe_customer_id: customerId,
        created_at: nowIso,
      })
      if (payError) {
        // No bloqueante — la suscripción ya está creada, pero loggeamos para detectar el problema
        console.error('[Stripe Checkout] Error creating payment record (non-blocking):', {
          message: payError.message,
          code: payError.code,
          details: payError.details,
          hint: payError.hint,
          subscription_id: subscription.id,
        })
      }
    }

    return NextResponse.json({
      url: session.url,
      session_id: session.id,
    })
  } catch (error) {
    console.error('[Stripe Checkout] Error:', error)
    return NextResponse.json(
      { error: 'Error al crear sesión de pago' },
      { status: 500 }
    )
  }
}
