import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/audit'

export const dynamic = 'force-dynamic'

// GET: Obtener bot con todos sus datos relacionados
export async function GET(
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

    // Obtener bot con datos relacionados
    const { data: bot, error } = await service
      .from('bots')
      .select(`
        *,
        bot_prompts(*),
        followup_settings(*),
        whatsapp_sessions(*),
        products(*)
      `)
      .eq('id', id)
      .single()

    if (error || !bot) {
      return NextResponse.json({ error: 'Bot no encontrado' }, { status: 404 })
    }

    // Obtener perfil del propietario a través del tenant
    const { data: ownerProfile } = await service
      .from('profiles')
      .select('id, email, full_name, role')
      .eq('tenant_id', bot.tenant_id)
      .limit(1)
      .single()

    return NextResponse.json({ ...bot, owner: ownerProfile })
  } catch (error) {
    console.error('Error en GET /api/admin/bots/[id]:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// PATCH: Editar bot (actualizar campos, activar/desactivar/pausar)
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
    const { action, name, description, is_active, ...rest } = body
    const service = await createServiceRoleClient()

    const updateData: Record<string, unknown> = {}

    // Manejar acciones especiales
    if (action === 'activate') {
      updateData.is_active = true
    } else if (action === 'deactivate') {
      updateData.is_active = false
    } else if (action === 'pause') {
      updateData.is_active = false
      updateData.paused_at = new Date().toISOString()
      updateData.paused_by = user.id
    } else {
      // Campos individuales
      if (name !== undefined) updateData.name = name
      if (description !== undefined) updateData.description = description
      if (is_active !== undefined) updateData.is_active = is_active
      // Incluir otros campos válidos del body
      const allowedFields = ['system_prompt', 'model', 'temperature', 'max_tokens']
      for (const field of allowedFields) {
        if (rest[field] !== undefined) updateData[field] = rest[field]
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No hay campos para actualizar' }, { status: 400 })
    }

    const { data: updated, error } = await service
      .from('bots')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Error al actualizar bot' }, { status: 500 })
    }

    // Determinar acción de auditoría
    let auditAction: string = 'editar_bot'
    if (action === 'activate') auditAction = 'activar_bot'
    if (action === 'deactivate') auditAction = 'desactivar_bot'
    if (action === 'pause') auditAction = 'pausar_bot'

    await logAudit({
      userId: user.id,
      tenantId: adminProfile.tenant_id,
      action: auditAction as import('@/lib/audit').AuditAction,
      entityType: 'bot',
      entityId: id,
      details: updateData,
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error en PATCH /api/admin/bots/[id]:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// DELETE: Eliminar bot
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

    // Obtener info del bot antes de eliminar
    const { data: botInfo } = await service
      .from('bots')
      .select('name, tenant_id')
      .eq('id', id)
      .single()

    if (!botInfo) {
      return NextResponse.json({ error: 'Bot no encontrado' }, { status: 404 })
    }

    const { error } = await service
      .from('bots')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: 'Error al eliminar bot' }, { status: 500 })
    }

    await logAudit({
      userId: user.id,
      tenantId: adminProfile.tenant_id,
      action: 'eliminar_bot' as import('@/lib/audit').AuditAction,
      entityType: 'bot',
      entityId: id,
      details: { name: botInfo.name, tenant_id: botInfo.tenant_id },
    })

    return NextResponse.json({ message: 'Bot eliminado' })
  } catch (error) {
    console.error('Error en DELETE /api/admin/bots/[id]:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
