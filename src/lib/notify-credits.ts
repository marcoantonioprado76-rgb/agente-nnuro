import { prisma } from './prisma'
import { createNotification } from './notifications'
import { sendCreditsExhaustedEmail } from './email'

const NOTIFICATION_TITLE = '⚠️ Sin saldo de créditos AI'
const COOLDOWN_HOURS = 12

/**
 * Notifica al dueño del bot que sus créditos AI se agotaron.
 * Envía notificación in-app, push web y email — con cooldown de 12h
 * por usuario para no spamear cuando los workers reintentan.
 */
export async function notifyCreditsExhausted(userId: string, botName: string): Promise<void> {
  try {
    const cutoff = new Date(Date.now() - COOLDOWN_HOURS * 60 * 60 * 1000)
    const recent = await prisma.notification.findFirst({
      where: { userId, title: NOTIFICATION_TITLE, createdAt: { gte: cutoff } },
      select: { id: true },
    })
    if (recent) return

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, fullName: true },
    })
    if (!user) return

    const body = `Tu bot "${botName}" no pudo responder porque se agotaron tus créditos AI. Recarga créditos para reactivar tus bots.`

    await createNotification(userId, NOTIFICATION_TITLE, body, '/dashboard/wallet').catch(() => {})
    await sendCreditsExhaustedEmail(user.email, user.fullName, botName).catch(() => {})
  } catch (err) {
    console.error('[NOTIFY_CREDITS] error:', err)
  }
}
