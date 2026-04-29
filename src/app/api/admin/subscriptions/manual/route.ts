import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/audit'

export const dynamic = 'force-dynamic'

// POST: Activar suscripción manual para un usuario
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    if (session.role !== 'admin') return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })

    const body = await request.json()
    const { user_id, plan_id } = body

    if (!user_id || !plan_id) {
      return NextResponse.json({ error: 'user_id y plan_id son requeridos' }, { status: 400 })
    }

    const service = await createServiceRoleClient()

    // Verificar que el usuario existe
    const { data: targetProfile } = await service
      .from('profiles')
      .select('id, email, full_name')
      .eq('id', user_id)
      .single()

    if (!targetProfile) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    // Verificar que el plan existe
    const { data: plan } = await service
      .from('plans')
      .select('id, name, price, currency')
      .eq('id', plan_id)
      .single()

    if (!plan) {
      return NextResponse.json({ error: 'Plan no encontrado' }, { status: 404 })
    }

    const now = new Date()
    const endDate = new Date(now)
    endDate.setDate(endDate.getDate() + 30)

    // Primero crear la nueva suscripción
    const { data: subscription, error: subError } = await service
      .from('subscriptions')
      .insert({
        user_id,
        plan_id,
        status: 'active',
        approval_status: 'approved',
        payment_provider: 'manual',
        start_date: now.toISOString(),
        end_date: endDate.toISOString(),
        approved_by: session.sub,
        approved_at: now.toISOString(),
        admin_notes: `Activación manual por administrador`,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      })
      .select()
      .single()

    if (subError) {
      console.error('Error creando suscripción manual:', subError)
      return NextResponse.json({ error: 'Error al crear suscripción' }, { status: 500 })
    }

    // Solo cancelar las anteriores DESPUÉS de que la nueva se creó exitosamente
    await service
      .from('subscriptions')
      .update({
        status: 'cancelled',
        approval_status: 'rejected',
        cancelled_at: now.toISOString(),
        cancelled_by: session.sub,
        updated_at: now.toISOString(),
      })
      .eq('user_id', user_id)
      .in('status', ['active', 'pending'])
      .neq('id', subscription.id)

    // Crear registro de pago manual
    await service.from('payments').insert({
      user_id,
      subscription_id: subscription.id,
      amount: 0,
      currency: plan.currency || 'USD',
      payment_method: 'manual',
      payment_status: 'completed',
      notes: `Activación manual - ${plan.name}`,
      admin_notes: `Aprobado manualmente por admin`,
      reviewed_by: session.sub,
      reviewed_at: now.toISOString(),
      created_at: now.toISOString(),
    })

    // Auditoría
    await logAudit({
      userId: session.sub,
      tenantId: session.tenant_id ?? undefined,
      action: 'crear_suscripcion',
      entityType: 'suscripcion',
      entityId: subscription.id,
      details: {
        type: 'manual',
        target_user: user_id,
        target_email: targetProfile.email,
        plan_name: plan.name,
        start_date: now.toISOString(),
        end_date: endDate.toISOString(),
      },
    })

    return NextResponse.json({
      message: 'Suscripción activada manualmente',
      subscription,
      start_date: now.toISOString(),
      end_date: endDate.toISOString(),
      plan_name: plan.name,
    })
  } catch (error) {
    console.error('Error en POST /api/admin/subscriptions/manual:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
