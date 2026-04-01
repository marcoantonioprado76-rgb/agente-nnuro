import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/audit'

export const dynamic = 'force-dynamic'

// PATCH: Editar producto
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('role, tenant_id')
      .eq('id', user.id)
      .single()

    if (adminProfile?.role !== 'admin') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    const body = await request.json()
    const { name, description, price_unit, is_active } = body
    const service = await createServiceRoleClient()

    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (price_unit !== undefined) updateData.price_unit = price_unit
    if (is_active !== undefined) updateData.is_active = is_active

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No hay campos para actualizar' }, { status: 400 })
    }

    const { data: updated, error } = await service
      .from('products')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Error al actualizar producto' }, { status: 500 })
    }

    await logAudit({
      userId: user.id,
      tenantId: adminProfile.tenant_id,
      action: 'editar_producto' as import('@/lib/audit').AuditAction,
      entityType: 'producto',
      entityId: id,
      details: updateData,
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error en PATCH /api/admin/products/[id]:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// DELETE: Eliminar producto
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('role, tenant_id')
      .eq('id', user.id)
      .single()

    if (adminProfile?.role !== 'admin') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    const service = await createServiceRoleClient()

    const { error } = await service
      .from('products')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: 'Error al eliminar producto' }, { status: 500 })
    }

    await logAudit({
      userId: user.id,
      tenantId: adminProfile.tenant_id,
      action: 'eliminar_producto' as import('@/lib/audit').AuditAction,
      entityType: 'producto',
      entityId: id,
      details: {},
    })

    return NextResponse.json({ message: 'Producto eliminado' })
  } catch (error) {
    console.error('Error en DELETE /api/admin/products/[id]:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
