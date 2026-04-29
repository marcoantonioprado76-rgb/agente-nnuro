import { prisma } from '@/lib/prisma'

export async function createUserNotification(params: {
  userId: string
  type: string
  title: string
  message: string
  link?: string
  metadata?: Record<string, unknown>
}) {
  try {
    await (prisma as any).userNotification.create({
      data: {
        user_id:  params.userId,
        type:     params.type,
        title:    params.title,
        message:  params.message,
        link:     params.link || null,
        metadata: params.metadata || {},
      },
    })
  } catch (error) {
    console.error('Error creating user notification:', error)
  }
}

export async function createAdminNotification(params: {
  type: string
  title: string
  message: string
  relatedUserId?: string
  metadata?: Record<string, unknown>
}) {
  try {
    await (prisma as any).adminNotification.create({
      data: {
        type:              params.type,
        title:             params.title,
        message:           params.message,
        target_user_id:    params.relatedUserId || null,
        related_user_id:   params.relatedUserId || null,
      },
    })
  } catch (error) {
    console.error('Error creating admin notification:', error)
  }
}
