export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getAdminUser, unauthorizedAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import { BaileysManager } from '@/lib/baileys-manager'

// GET → grupos de WhatsApp donde participa el número del reto (para elegir el
// grupo de reportes sin copiar el JID a mano). Requiere el número conectado.
export async function GET() {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  const bot = await prisma.bot.findFirst({ where: { isReto: true }, select: { id: true } })
  if (!bot) return NextResponse.json({ groups: [], connected: false })

  const st = BaileysManager.getStatus(bot.id)
  if (st.status !== 'connected') return NextResponse.json({ groups: [], connected: false })

  const groups = await BaileysManager.listGroups(bot.id)
  // Orden alfabético por nombre para que sea fácil de encontrar.
  groups.sort((a, b) => a.subject.localeCompare(b.subject))
  return NextResponse.json({ groups, connected: true })
}
