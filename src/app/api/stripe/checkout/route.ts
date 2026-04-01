import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'
import { getPaymentMethodsSettings } from '@/lib/settings'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    // 1. Verify authenticated user
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { plan_id } = body

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

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: plan.currency.toLowerCase(),
            product_data: {
              name: `Plan ${plan.name} - Agente de Ventas`,
              description: `Suscripción mensual al plan ${plan.name}`,
            },
            unit_amount: Math.round(plan.price * 100),
          },
          quantity: 1,
        },
      ],
      metadata: {
        user_id: user.id,
        plan_id: plan.id,
        plan_name: plan.name,
        tenant_id: profile?.tenant_id || '',
        stripe_customer_id: customerId,
      },
      success_url: `${appUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/pricing`,
      expires_at: Math.floor(Date.now() / 1000) + 1800,
    })

    // 7. Create pending subscription record
    const { data: subscription, error: subError } = await service
      .from('subscriptions')
      .insert({
        user_id: user.id,
        plan_id: plan.id,
        status: 'pending',
        approval_status: 'pending_review',
        payment_provider: 'stripe',
        payment_id: session.id,
        stripe_customer_id: customerId,
        stripe_checkout_session_id: session.id,
      })
      .select()
      .single()

    if (subError) {
      console.error('[Stripe Checkout] Error creating subscription:', subError)
      return NextResponse.json({ error: 'Error al crear suscripción' }, { status: 500 })
    }

    // 8. Create pending payment record
    if (subscription) {
      await service.from('payments').insert({
        user_id: user.id,
        subscription_id: subscription.id,
        amount: plan.price,
        currency: plan.currency,
        payment_method: 'stripe',
        payment_status: 'pending',
        transaction_id: session.id,
        stripe_checkout_session_id: session.id,
        stripe_customer_id: customerId,
      })
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
