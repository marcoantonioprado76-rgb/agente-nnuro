import { createServiceRoleClient } from '@/lib/supabase/server'

/**
 * Create a notification for a regular user (stored in user_notifications)
 */
export async function createUserNotification(params: {
  userId: string
  type: string
  title: string
  message: string
  link?: string
  metadata?: Record<string, unknown>
}) {
  try {
    const service = await createServiceRoleClient()
    await service.from('user_notifications').insert({
      user_id: params.userId,
      type: params.type,
      title: params.title,
      message: params.message,
      link: params.link || null,
      metadata: params.metadata || {},
    })
  } catch (error) {
    console.error('Error creating user notification:', error)
  }
}

/**
 * Create a notification for admin users (stored in admin_notifications)
 */
export async function createAdminNotification(params: {
  type: string
  title: string
  message: string
  relatedUserId?: string
  metadata?: Record<string, unknown>
}) {
  try {
    const service = await createServiceRoleClient()
    await service.from('admin_notifications').insert({
      type: params.type,
      title: params.title,
      message: params.message,
      target_role: 'admin',
      related_user_id: params.relatedUserId || null,
      metadata: params.metadata || {},
    })
  } catch (error) {
    console.error('Error creating admin notification:', error)
  }
}
