/**
 * Notification system: in-app (DB) + Web Push.
 * Called by bot-engine and meta-engine when a sale is confirmed.
 */

import { prisma } from './prisma'
import webpush from 'web-push'

/**
 * Creates an in-app notification and sends Web Push to all active
 * subscriptions of the user.
 */
export async function createNotification(
  userId: string,
  title: string,
  body: string,
  link?: string,
): Promise<void> {
  try {
    // 1. Save in DB (in-app bell)
    await prisma.notification.create({
      data: { userId, title, body, link: link ?? null },
    })

    // 2. Send Web Push (only if VAPID is configured)
    const vapidEmail = process.env.VAPID_EMAIL
    const vapidPublicKey = process.env.VAPID_PUBLIC_KEY
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY
    if (!vapidEmail || !vapidPublicKey || !vapidPrivateKey) {
      console.warn('[PUSH] VAPID env vars not set — skipping web push')
      return
    }
    webpush.setVapidDetails(
      vapidEmail.startsWith('mailto:') ? vapidEmail : `mailto:${vapidEmail}`,
      vapidPublicKey,
      vapidPrivateKey,
    )

    const subs = await prisma.pushSubscription.findMany({ where: { userId } })
    if (!subs.length) return

    const payload = JSON.stringify({ title, body, link: link ?? '/dashboard/services/whatsapp' })

    // Collect expired subscription IDs then delete in bulk (avoids concurrent deletes)
    const expiredIds: string[] = []

    await Promise.allSettled(
      subs.map(async (sub: { id: string; endpoint: string; p256dh: string; auth: string }) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload,
          )
        } catch (err: unknown) {
          const statusCode = (err as Record<string, unknown>)?.statusCode
          if (statusCode === 410 || statusCode === 404) {
            expiredIds.push(sub.id)
          } else {
            console.error('[PUSH] Send error:', err)
          }
        }
      }),
    )

    if (expiredIds.length > 0) {
      await prisma.pushSubscription
        .deleteMany({ where: { id: { in: expiredIds } } })
        .catch((e: unknown) => console.warn('[PUSH] Failed to delete expired subscriptions:', e))
    }
  } catch (err) {
    console.error('[NOTIFICATIONS] createNotification error:', err)
  }
}
