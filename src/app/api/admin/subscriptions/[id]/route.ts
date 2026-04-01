import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/audit'

export const dynamic = 'force-dynamic'

// PATCH: Gestionar suscripción (aprobar, rechazar, suspender, reactivar, cancelar, extender, cambiar plan)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: subId } = await params
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { data: adminProfile } = await supabase.from('profiles').select('role, tenant_id').eq('id', user.id).single()
    if (adminProfile?.role !== 'admin') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    const body = await request.json()
    const { action, admin_notes, new_plan_id, extend_days } = body

    const service = await createServiceRoleClient()

    // Obtener suscripción actual
    const { data: sub } = await service.from('subscriptions').select('*, plan:plan_id(name)').eq('id', subId).single()
    if (!sub) {
      return NextResponse.json({ error: 'Suscripción no encontrada' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}
    let auditAction = ''
    const auditDetails: Record<string, unknown> = { action, target_user: sub.user_id, plan: sub.plan?.name }

    switch (action) {
      case 'approve': {
        updateData.status = 'active'
        updateData.approval_status = 'approved'
        updateData.approved_by = user.id
        updateData.approved_at = new Date().toISOString()
        updateData.start_date = new Date().toISOString()
        const endDate = new Date()
        endDate.setDate(endDate.getDate() + 30)
        updateData.end_date = endDate.toISOString()
        auditAction = 'approve_subscription'

        await service
          .from('payments')
          .update({ payment_status: 'completed', reviewed_by: user.id, reviewed_at: new Date().toISOString() })
          .eq('subscription_id', subId)
          .eq('payment_status', 'pending')
        break
      }

      case 'reject':
        updateData.status = 'rejected'
        updateData.approval_status = 'rejected'
        auditAction = 'reject_subscription'

        await service
          .from('payments')
          .update({ payment_status: 'failed', reviewed_by: user.id, reviewed_at: new Date().toISOString() })
          .eq('subscription_id', subId)
          .eq('payment_status', 'pending')
        break

      case 'suspend':
        updateData.status = 'suspended'
        updateData.approval_status = 'suspended'
        auditAction = 'suspend_subscription'
        break

      case 'reactivate': {
        updateData.status = 'active'
        updateData.approval_status = 'approved'
        // Si no tiene end_date o ya expiró, dar 30 días desde hoy
        const currentEnd = sub.end_date ? new Date(sub.end_date) : null
        if (!currentEnd || currentEnd < new Date()) {
          updateData.start_date = new Date().toISOString()
          const newEnd = new Date()
          newEnd.setDate(newEnd.getDate() + 30)
          updateData.end_date = newEnd.toISOString()
        }
        auditAction = 'reactivate_subscription'
        break
      }

      case 'cancel':
        updateData.status = 'cancelled'
        updateData.approval_status = 'rejected'
        updateData.cancelled_at = new Date().toISOString()
        updateData.cancelled_by = user.id
        auditAction = 'cancel_subscription'
        break

      case 'extend': {
        const days = parseInt(extend_days) || 30
        const currentEndDate = sub.end_date ? new Date(sub.end_date) : new Date()
        const baseDate = currentEndDate > new Date() ? currentEndDate : new Date()
        baseDate.setDate(baseDate.getDate() + days)
        updateData.end_date = baseDate.toISOString()
        updateData.extended_at = new Date().toISOString()
        updateData.extended_by = user.id
        if (sub.status !== 'active') {
          updateData.status = 'active'
          updateData.approval_status = 'approved'
        }
        auditAction = 'extend_subscription'
        auditDetails.days = days
        auditDetails.new_end_date = updateData.end_date
        break
      }

      case 'change_plan': {
        if (!new_plan_id) {
          return NextResponse.json({ error: 'plan_id requerido' }, { status: 400 })
        }
        const { data: newPlan } = await service.from('plans').select('name').eq('id', new_plan_id).single()
        if (!newPlan) {
          return NextResponse.json({ error: 'Plan no encontrado' }, { status: 404 })
        }
        updateData.previous_plan_id = sub.plan_id
        updateData.plan_id = new_plan_id
        updateData.plan_changed_at = new Date().toISOString()
        auditAction = 'change_plan'
        auditDetails.old_plan = sub.plan?.name
        auditDetails.new_plan = newPlan.name
        break
      }

      default:
        return NextResponse.json({ error: 'Acción no válida' }, { status: 400 })
    }

    if (admin_notes !== undefined) {
      updateData.admin_notes = admin_notes
    }
    updateData.updated_at = new Date().toISOString()

    const { data: updated, error } = await service
      .from('subscriptions')
      .update(updateData)
      .eq('id', subId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 })
    }

    await logAudit({
      userId: user.id,
      tenantId: adminProfile.tenant_id,
      action: auditAction as import('@/lib/audit').AuditAction,
      entityType: 'suscripcion',
      entityId: subId,
      details: auditDetails,
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error en PATCH /api/admin/subscriptions/[id]:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
