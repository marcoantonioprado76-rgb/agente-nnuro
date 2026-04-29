import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/audit'
import { getPaymentMethodsSettings } from '@/lib/settings'

export const dynamic = 'force-dynamic'

// GET: Obtener suscripción actual del usuario
export async function GET() {
  try {
    const session = await getServerSession()
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const service = await createServiceRoleClient()
    const { data: subscription } = await service
      .from('subscriptions')
      .select('*, plan:plan_id(*)')
      .eq('user_id', session.sub)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    return NextResponse.json(subscription || null)
  } catch {
    return NextResponse.json(null)
  }
}

// POST: Crear suscripción (usuario elige plan y registra pago)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const body = await request.json()
    const { plan_id, payment_method, transaction_id, payment_proof_url } = body

    if (!plan_id) {
      return NextResponse.json({ error: 'plan_id es requerido' }, { status: 400 })
    }

    // Verificar que el método de pago por transferencia está habilitado
    const paymentSettings = await getPaymentMethodsSettings()
    if (!paymentSettings.transfer) {
      return NextResponse.json({ error: 'El pago por transferencia no está disponible en este momento' }, { status: 503 })
    }

    const service = await createServiceRoleClient()

    // Verificar que el plan existe
    const { data: plan } = await service.from('plans').select('*').eq('id', plan_id).single()
    if (!plan) {
      return NextResponse.json({ error: 'Plan no encontrado' }, { status: 404 })
    }

    // Verificar que no tenga suscripción activa
    const { data: existing } = await service
      .from('subscriptions')
      .select('id, status, approval_status')
      .eq('user_id', session.sub)
      .in('status', ['active', 'pending'])
      .limit(1)
      .single()

    if (existing) {
      const isActive = existing.status === 'active' && existing.approval_status === 'approved'

      if (isActive) {
        return NextResponse.json({ error: 'Ya tienes una suscripción activa' }, { status: 409 })
      }

      // Cancel pending subscription to allow retry with another method/plan
      if (existing.status === 'pending') {
        await service
          .from('subscriptions')
          .update({ status: 'cancelled', admin_notes: 'Cancelado automáticamente al reintentar pago', updated_at: new Date().toISOString() })
          .eq('id', existing.id)

        await service
          .from('payments')
          .update({ payment_status: 'failed' })
          .eq('subscription_id', existing.id)
          .eq('payment_status', 'pending')
      }
    }

    // Crear suscripción en estado pending + pending_review
    const { data: subscription, error: subError } = await service
      .from('subscriptions')
      .insert({
        user_id: session.sub,
        plan_id,
        status: 'pending',
        approval_status: 'pending_review',
      })
      .select()
      .single()

    if (subError || !subscription) {
      return NextResponse.json({ error: 'Error al crear suscripción' }, { status: 500 })
    }

    // Registrar pago
    await service.from('payments').insert({
      user_id: session.sub,
      subscription_id: subscription.id,
      amount: plan.price,
      currency: plan.currency,
      payment_method: payment_method || 'manual',
      payment_status: 'pending',
      transaction_id: transaction_id || null,
      payment_proof_url: payment_proof_url || null,
    })

    // Obtener tenant_id para auditoría
    const { data: profile } = await service.from('profiles').select('tenant_id').eq('id', session.sub).single()

    await logAudit({
      userId: session.sub,
      tenantId: profile?.tenant_id,
      action: 'crear_suscripcion',
      entityType: 'suscripcion',
      entityId: subscription.id,
      details: { plan: plan.name, price: plan.price, payment_method },
    })

    return NextResponse.json({ message: 'Suscripción registrada. Pendiente de aprobación.', subscription }, { status: 201 })
  } catch (error) {
    console.error('Error en POST /api/subscriptions:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
