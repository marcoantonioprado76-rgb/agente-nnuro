import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import Stripe from 'stripe'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { requireActiveSubscription } from '@/lib/subscription-guard'
import { stripe, StripeNotConfiguredError } from '@/lib/stripe'

export const dynamic = 'force-dynamic'

const MIN_USD = 5
const MAX_USD = 500

/**
 * POST /api/credits/checkout
 * Crea una Stripe Checkout Session para comprar créditos AI.
 * Requiere suscripción activa.
 *
 * Body: { amount_usd: number }   // 5–500
 * Devuelve: { url, session_id }
 */
export async function POST(request: NextRequest) {
  try {
    // Solo usuarios con suscripción activa pueden comprar créditos
    const guard = await requireActiveSubscription()
    if (!guard.ok) return guard.response
    const user = guard.session

    const body = await request.json().catch(() => ({}))
    const amount = Number(body?.amount_usd)

    if (!Number.isFinite(amount) || amount < MIN_USD || amount > MAX_USD) {
      return NextResponse.json(
        { error: `El monto debe estar entre $${MIN_USD} y $${MAX_USD} USD` },
        { status: 400 }
      )
    }

    const service = await createServiceRoleClient()

    // Anti-spam: cap de 5 compras pending por usuario
    const { count: pendingCount } = await service
      .from('credit_purchases')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.sub)
      .eq('status', 'pending')

    if ((pendingCount ?? 0) >= 5) {
      return NextResponse.json(
        { error: 'Tienes demasiadas compras pendientes. Espera a que se procesen.' },
        { status: 429 }
      )
    }

    // Obtener perfil para customer Stripe y email
    const { data: profile } = await service
      .from('profiles')
      .select('email, full_name, tenant_id')
      .eq('id', user.sub)
      .single()

    // Reusar customer Stripe si ya existe (de suscripciones anteriores)
    const { data: prevSub } = await service
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.sub)
      .not('stripe_customer_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    let customerId = prevSub?.stripe_customer_id ?? null
    let session: Stripe.Checkout.Session

    try {
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: profile?.email || user.email || '',
          name: profile?.full_name || '',
          metadata: {
            supabase_user_id: user.sub,
            tenant_id: profile?.tenant_id || '',
          },
        })
        customerId = customer.id
      }

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

      session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'payment',
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: `Créditos AI · $${amount.toFixed(2)} USD`,
                description: 'Saldo para uso de IA en tu cuenta NÜRO',
              },
              unit_amount: Math.round(amount * 100),
            },
            quantity: 1,
          },
        ],
        metadata: {
          purpose: 'credits',
          user_id: user.sub,
          amount_usd: amount.toString(),
          tenant_id: profile?.tenant_id || '',
        },
        success_url: `${appUrl}/wallet?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl}/wallet?cancelled=1`,
        expires_at: Math.floor(Date.now() / 1000) + 1800,
      })
    } catch (stripeErr) {
      if (stripeErr instanceof StripeNotConfiguredError) {
        console.error('[Credits Checkout] STRIPE_SECRET_KEY no configurada')
        return NextResponse.json(
          { error: 'El pago con Stripe no está configurado' },
          { status: 503 }
        )
      }
      if (stripeErr instanceof Stripe.errors.StripeError) {
        console.error('[Credits Checkout] Error de Stripe:', {
          type: stripeErr.type,
          code: stripeErr.code,
          message: stripeErr.message,
        })
        return NextResponse.json(
          { error: `Stripe: ${stripeErr.message}` },
          { status: 502 }
        )
      }
      throw stripeErr
    }

    // Crear registro pending de la compra
    const nowIso = new Date().toISOString()
    const { error: insErr } = await service.from('credit_purchases').insert({
      id: randomUUID(),
      user_id: user.sub,
      amount_usd: amount,
      status: 'pending',
      stripe_checkout_session_id: session.id,
      stripe_customer_id: customerId,
      created_at: nowIso,
      updated_at: nowIso,
    })

    if (insErr) {
      console.error('[Credits Checkout] Error insertando credit_purchases:', {
        message: insErr.message,
        code: insErr.code,
        details: insErr.details,
        hint: insErr.hint,
      })
      return NextResponse.json(
        { error: `Error al registrar compra: ${insErr.message || 'sin detalle'}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ url: session.url, session_id: session.id })
  } catch (error) {
    console.error('[Credits Checkout] Error:', error)
    return NextResponse.json({ error: 'Error al crear sesión de pago' }, { status: 500 })
  }
}
