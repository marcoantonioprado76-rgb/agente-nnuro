import { createServiceRoleClient } from '@/lib/supabase/server'

export type AuditAction =
  | 'usuario_registrado'
  | 'login'
  | 'logout'
  | 'crear_bot'
  | 'editar_bot'
  | 'eliminar_bot'
  | 'activar_bot'
  | 'desactivar_bot'
  | 'crear_producto'
  | 'editar_producto'
  | 'eliminar_producto'
  | 'limpiar_memoria'
  | 'cambiar_rol'
  | 'suspender_usuario'
  | 'activar_usuario'
  | 'bloquear_usuario'
  | 'eliminar_usuario'
  | 'editar_usuario'
  | 'editar_email_usuario'
  | 'editar_perfil'
  | 'cambiar_configuracion'
  | 'crear_usuario_manual'
  | 'crear_suscripcion'
  | 'aprobar_pago'
  | 'rechazar_pago'
  | 'pago_stripe_exitoso'
  | 'pago_stripe_fallido'
  | 'suscripcion_activada'
  | 'checkout_expirado'
  | 'pago_stripe_verificado'
  | 'suscripcion_vencida'
  | 'suscripcion_renovada'

export type AuditEntityType =
  | 'usuario'
  | 'bot'
  | 'producto'
  | 'configuracion'
  | 'conversacion'
  | 'lead'
  | 'pedido'
  | 'suscripcion'
  | 'pago'

interface AuditLogParams {
  userId?: string
  tenantId?: string
  action: AuditAction
  entityType?: AuditEntityType
  entityId?: string
  details?: Record<string, unknown>
  ipAddress?: string
}

export async function logAudit(params: AuditLogParams): Promise<void> {
  try {
    const supabase = await createServiceRoleClient()
    await supabase.from('audit_logs').insert({
      user_id: params.userId || null,
      tenant_id: params.tenantId || null,
      action: params.action,
      entity_type: params.entityType || null,
      entity_id: params.entityId || null,
      details: params.details || {},
      ip_address: params.ipAddress || null,
    })
  } catch (err) {
    console.error('[Audit] Error al registrar acción:', err)
  }
}
