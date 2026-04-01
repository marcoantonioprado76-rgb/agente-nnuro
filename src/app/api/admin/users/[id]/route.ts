import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/audit'

export const dynamic = 'force-dynamic'

// PATCH: Editar usuario (cambiar rol, activar/suspender)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: targetId } = await params
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
    const { role, is_active, full_name, email, action: userAction } = body
    const service = await createServiceRoleClient()

    const updateData: Record<string, unknown> = {}
    const now = new Date().toISOString()

    // Acciones especiales
    if (userAction === 'block') {
      updateData.is_active = false
      updateData.blocked_at = now
      updateData.blocked_by = user.id
      updateData.suspended_at = now
      updateData.suspended_by = user.id
    } else if (userAction === 'suspend') {
      updateData.is_active = false
      updateData.suspended_at = now
      updateData.suspended_by = user.id
    } else if (userAction === 'reactivate') {
      updateData.is_active = true
      updateData.suspended_at = null
      updateData.suspended_by = null
      updateData.blocked_at = null
      updateData.blocked_by = null
    } else {
      // Campos individuales
      if (role !== undefined) updateData.role = role
      if (is_active !== undefined) {
        updateData.is_active = is_active
        if (is_active === false) {
          updateData.suspended_at = now
          updateData.suspended_by = user.id
        } else {
          updateData.suspended_at = null
          updateData.suspended_by = null
          updateData.blocked_at = null
          updateData.blocked_by = null
        }
      }
      if (full_name !== undefined) updateData.full_name = full_name
    }

    if (Object.keys(updateData).length === 0 && !email) {
      return NextResponse.json({ error: 'No hay campos para actualizar' }, { status: 400 })
    }

    // Actualizar email en auth si se proporcionó
    if (email) {
      const { error: emailError } = await service.auth.admin.updateUserById(targetId, { email })
      if (emailError) {
        return NextResponse.json({ error: 'Error al actualizar email: ' + emailError.message }, { status: 400 })
      }
      updateData.email = email
    }

    updateData.updated_at = now

    const { data: updated, error } = await service
      .from('profiles')
      .update(updateData)
      .eq('id', targetId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Error al actualizar usuario' }, { status: 500 })
    }

    // Determinar acción de auditoría
    let action: string = 'editar_usuario'
    if (role !== undefined) action = 'cambiar_rol'
    if (userAction === 'block') action = 'bloquear_usuario'
    else if (userAction === 'suspend') action = 'suspender_usuario'
    else if (userAction === 'reactivate') action = 'activar_usuario'
    else if (is_active === false) action = 'suspender_usuario'
    else if (is_active === true) action = 'activar_usuario'
    if (email) action = 'editar_email_usuario'

    await logAudit({
      userId: user.id,
      tenantId: adminProfile.tenant_id,
      action: action as import('@/lib/audit').AuditAction,
      entityType: 'usuario',
      entityId: targetId,
      details: { ...updateData, userAction },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error en PATCH /api/admin/users/[id]:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// DELETE: Eliminar usuario
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: targetId } = await params
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    if (user.id === targetId) {
      return NextResponse.json({ error: 'No puedes eliminar tu propia cuenta' }, { status: 400 })
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

    // Obtener info del usuario antes de eliminar
    const { data: targetProfile } = await service
      .from('profiles')
      .select('email, full_name, tenant_id')
      .eq('id', targetId)
      .single()

    // Eliminar tenant del usuario (cascade borra bots, stores, products, etc.)
    if (targetProfile?.tenant_id) {
      await service.from('tenants').delete().eq('id', targetProfile.tenant_id)
    }

    // Eliminar de auth (cascade eliminará el perfil)
    const { error } = await service.auth.admin.deleteUser(targetId)
    if (error) {
      return NextResponse.json({ error: 'Error al eliminar usuario' }, { status: 500 })
    }

    await logAudit({
      userId: user.id,
      tenantId: adminProfile.tenant_id,
      action: 'eliminar_usuario',
      entityType: 'usuario',
      entityId: targetId,
      details: { email: targetProfile?.email, name: targetProfile?.full_name },
    })

    return NextResponse.json({ message: 'Usuario eliminado' })
  } catch (error) {
    console.error('Error en DELETE /api/admin/users/[id]:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
