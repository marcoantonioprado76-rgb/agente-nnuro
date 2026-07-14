export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getAdminUser, unauthorizedAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import { BaileysManager } from '@/lib/baileys-manager'
import { generateSecureToken } from '@/lib/crypto'
import { invalidateRetoConfigCache } from '@/lib/whatsapp/reto90dSender'
import { handleRouteError } from '../_shared'

// Conexión del NÚMERO del Reto 90D — dedicada y APARTE de los bots de venta.
// El bot del reto es un Bot con isReto=true (excluido del panel/límites de bots),
// se conecta por su propio QR desde aquí y nunca se mezcla con los bots normales.

/** Bot dedicado del reto (o null). */
async function getRetoBot() {
  return prisma.bot.findFirst({
    where: { isReto: true },
    select: { id: true, name: true, baileysPhone: true },
    orderBy: { createdAt: 'asc' },
  })
}

/** GET → estado de la conexión del número del reto (+ QR si está esperando escaneo). */
export async function GET() {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  const bot = await getRetoBot()
  if (!bot) return NextResponse.json({ bot: null, status: { status: 'disconnected' } })

  const st = BaileysManager.getStatus(bot.id) as { status: string; qrBase64?: string; phone?: string }
  return NextResponse.json({
    bot,
    status: { ...st, phone: st.phone ?? bot.baileysPhone ?? undefined },
  })
}

/** POST → crea el bot del reto si no existe, lo enlaza en la config y genera un QR fresco. */
export async function POST() {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()
  const adminId = (admin as any).id as string

  try {
    let bot = await prisma.bot.findFirst({ where: { isReto: true }, orderBy: { createdAt: 'asc' } })
    if (!bot) {
      bot = await prisma.bot.create({
        data: {
          userId: adminId,
          name: 'Reto 90D',
          type: 'BAILEYS',
          status: 'ACTIVE',
          webhookToken: generateSecureToken(32),
          isReto: true,
        },
      })
      // Secret mínimo (vacío): el reto no usa la key del bot, pero el reconector
      // del arranque (instrumentation) sólo revive bots que tienen secret.
      await prisma.botSecret.create({
        data: {
          botId: bot.id,
          ycloudApiKeyEnc: '',
          openaiApiKeyEnc: '',
          whatsappInstanceNumber: '',
          reportPhone: '',
        },
      })
    } else if (bot.status !== 'ACTIVE') {
      await prisma.bot.update({ where: { id: bot.id }, data: { status: 'ACTIVE' } })
    }

    // Enlazar el bot al reto en la configuración (upsert de la única fila de config).
    const cfg = await prisma.whatsAppConfig.findFirst()
    if (cfg) {
      if (cfg.botId !== bot.id) await prisma.whatsAppConfig.update({ where: { id: cfg.id }, data: { botId: bot.id } })
    } else {
      await prisma.whatsAppConfig.create({ data: { botId: bot.id } })
    }
    invalidateRetoConfigCache()

    // Conectar en background con QR fresco (borra sesión vieja para garantizar QR).
    BaileysManager.connect(bot.id, bot.name, '', '', { forceFresh: true })
      .catch((err) => console.error('[reto90d/connection] connect error:', err))

    return NextResponse.json({ ok: true, botId: bot.id })
  } catch (err) {
    return handleRouteError(err, 'connection POST')
  }
}

/** DELETE → desconecta (cierra sesión) el número del reto. */
export async function DELETE() {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  const bot = await getRetoBot()
  if (bot) BaileysManager.disconnect(bot.id)
  return NextResponse.json({ ok: true })
}
