import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/audit'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession()
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { data: profile } = await db.from('profiles').select('role, tenant_id').eq('id', session.sub).single()
    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    const body = await request.json()
    const { action, admin_notes } = body

    const service = await createServiceRoleClient()

    // Obtener el pago para saber a qué suscripción pertenece
    const { data: payment } = await service.from('payments').select('subscription_id').eq('id', id).single()

    if (action === 'approve') {
      await service.from('payments').update({
        payment_status: 'completed',
        admin_notes: admin_notes || null,
        reviewed_by: session.sub,
        reviewed_at: new Date().toISOString(),
      }).eq('id', id)

      // Activar la suscripción vinculada al pago
      if (payment?.subscription_id) {
        const endDate = new Date()
        endDate.setDate(endDate.getDate() + 30)
        await service.from('subscriptions').update({
          status: 'active',
          approval_status: 'approved',
          approved_by: session.sub,
          approved_at: new Date().toISOString(),
          start_date: new Date().toISOString(),
          end_date: endDate.toISOString(),
          updated_at: new Date().toISOString(),
        })
          .eq('id', payment.subscription_id)
          .in('status', ['pending', 'rejected', 'expired'])
      }

      await logAudit({
        userId: session.sub,
        tenantId: profile.tenant_id,
        action: 'aprobar_pago',
        entityType: 'pago',
        entityId: id,
        details: { admin_notes, subscription_id: payment?.subscription_id },
      })
    } else if (action === 'reject') {
      await service.from('payments').update({
        payment_status: 'failed',
        admin_notes: admin_notes || null,
        reviewed_by: session.sub,
        reviewed_at: new Date().toISOString(),
      }).eq('id', id)

      // Marcar la suscripción como rechazada
      if (payment?.subscription_id) {
        await service.from('subscriptions').update({
          status: 'rejected',
          approval_status: 'rejected',
          updated_at: new Date().toISOString(),
        })
          .eq('id', payment.subscription_id)
          .eq('status', 'pending')
      }

      await logAudit({
        userId: session.sub,
        tenantId: profile.tenant_id,
        action: 'rechazar_pago',
        entityType: 'pago',
        entityId: id,
        details: { admin_notes, subscription_id: payment?.subscription_id },
      })
    } else {
      return NextResponse.json({ error: 'Acción no válida' }, { status: 400 })
    }

    return NextResponse.json({ message: 'Pago actualizado' })
  } catch (error) {
    console.error('Error en PATCH /api/admin/payments/[id]:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
