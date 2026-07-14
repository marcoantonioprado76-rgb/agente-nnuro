export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

/**
 * POST /api/b/[slug]/lead — captura PÚBLICA de un lead desde el formulario de una
 * página del Constructor Visual. Rate-limit por IP para evitar spam.
 * Además: si el dueño tiene un bot de WhatsApp (Baileys) conectado, el bot le escribe
 * automáticamente al prospecto (prospección automática). YCloud/Cloud no puede iniciar
 * conversación con un número frío (regla de 24h de Meta), por eso solo aplica a Baileys.
 */
export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  const ip = getClientIp(req)
  const rl = rateLimit(`builder-lead:${ip}`, { windowSec: 10 * 60, max: 15 })
  if (!rl.allowed) return NextResponse.json({ error: 'Demasiados envíos. Esperá unos minutos.' }, { status: 429 })

  const page = await (prisma as any).builderPage.findUnique({
    where: { slug: params.slug }, select: { id: true, userId: true, published: true },
  })
  if (!page || !page.published) return NextResponse.json({ error: 'Página no encontrada' }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const name = body?.name ? String(body.name).trim().slice(0, 120) : null
  const phone = body?.phone ? String(body.phone).trim().slice(0, 40) : null
  const email = body?.email ? String(body.email).trim().slice(0, 160) : null
  // Campos extra del form: acotar a máx 20 claves y valores string ≤500 chars (evita bloat/DoS de BD).
  let data: Record<string, string> | null = null
  if (body?.data && typeof body.data === 'object' && !Array.isArray(body.data)) {
    data = {}
    for (const [k, v] of Object.entries(body.data).slice(0, 20)) {
      data[String(k).slice(0, 60)] = String(v ?? '').slice(0, 500)
    }
  }

  if (!name && !phone && !email) {
    return NextResponse.json({ error: 'Completá al menos un dato' }, { status: 400 })
  }

  await (prisma as any).builderLead.create({
    data: { builderPageId: page.id, name, phone, email, data },
  })

  // Prospección automática: el bot Baileys del dueño le escribe al prospecto (best-effort).
  // Cap POR DUEÑO (además del rate-limit por IP) para que no se abuse como amplificador de spam
  // rotando IPs y enviando WhatsApp a números arbitrarios desde la línea del dueño.
  if (phone && String(phone).replace(/\D/g, '').length >= 8) {
    const ownerRl = rateLimit(`builder-autogreet:${page.userId}`, { windowSec: 60 * 60, max: 20 })
    if (ownerRl.allowed) {
      autoGreetLead(page.userId, name, phone).catch(err => console.error('[BUILDER-LEAD] auto-greet:', err))
    }
  }

  return NextResponse.json({ success: true })
}

/** Envía un primer mensaje al prospecto desde el primer bot Baileys ACTIVO y CONECTADO del dueño. */
async function autoGreetLead(ownerId: string, name: string | null, phone: string): Promise<boolean> {
  try {
    const { BaileysManager } = await import('@/lib/baileys-manager')
    const bots = await prisma.bot.findMany({
      where: { userId: ownerId, type: 'BAILEYS', status: 'ACTIVE' },
      select: { id: true }, orderBy: { createdAt: 'desc' },
    })
    const first = name ? name.split(' ')[0] : ''
    const msg = `¡Hola${first ? ' ' + first : ''}! 👋 Gracias por dejar tus datos. Soy tu asesor 🤖. ¿Querés que te cuente cómo podemos ayudarte? Respondé por acá y arrancamos 😊`
    for (const bot of bots) {
      const st = BaileysManager.getStatus(bot.id)
      if (st?.status === 'connected') {
        const ok = await BaileysManager.sendText(bot.id, phone, msg)
        if (ok) { console.log(`[BUILDER-LEAD] Bot ${bot.id} escribió al prospecto ${phone}`); return true }
      }
    }
    return false
  } catch (e) {
    console.error('[BUILDER-LEAD] autoGreet error:', e)
    return false
  }
}
