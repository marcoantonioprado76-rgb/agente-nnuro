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

    if (action === 'approve') {
      await service.from('payments').update({
        payment_status: 'completed',
        admin_notes: admin_notes || null,
        reviewed_by: session.sub,
        reviewed_at: new Date().toISOString(),
      }).eq('id', id)

      await logAudit({
        userId: session.sub,
        tenantId: profile.tenant_id,
        action: 'aprobar_pago',
        entityType: 'pago',
        entityId: id,
        details: { admin_notes },
      })
    } else if (action === 'reject') {
      await service.from('payments').update({
        payment_status: 'failed',
        admin_notes: admin_notes || null,
        reviewed_by: session.sub,
        reviewed_at: new Date().toISOString(),
      }).eq('id', id)

      await logAudit({
        userId: session.sub,
        tenantId: profile.tenant_id,
        action: 'rechazar_pago',
        entityType: 'pago',
        entityId: id,
        details: { admin_notes },
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
