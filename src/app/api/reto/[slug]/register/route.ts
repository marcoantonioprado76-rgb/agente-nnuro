export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { enrollMember, normalizePhone } from '@/lib/reto90d/memberService'
import { sendWelcome } from '@/lib/reto90d/welcomeService'
import { getRetoWaNumber } from '@/lib/whatsapp/reto90dSender'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

// PÚBLICO: auto-registro de un participante en el reto (link compartible).
const schema = z.object({
  fullName: z.string().min(2, 'Nombre muy corto').max(120),
  phone: z.string().min(6, 'Celular inválido').max(30),
  email: z.string().email('Correo inválido').max(160).optional().or(z.literal('')),
  country: z.string().max(80).optional().or(z.literal('')),
  city: z.string().max(80).optional().or(z.literal('')),
})

// Límites del registro público (sliding window en memoria):
//  - por IP: máx 5 registros por hora (evita abuso/scripts).
//  - por teléfono: máx 3 intentos por hora (evita spam sobre un mismo número).
const IP_LIMIT = { windowSec: 60 * 60, max: 5 }
const PHONE_LIMIT = { windowSec: 60 * 60, max: 3 }

function tooMany() {
  return NextResponse.json(
    { error: 'Demasiados intentos. Intenta de nuevo más tarde.' },
    { status: 429 },
  )
}

export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  // 1) Rate-limit por IP ANTES de tocar la base (protege ante scripts).
  const ip = getClientIp(req)
  // Si no llega la IP (proxy sin X-Forwarded-For), NO metemos a todos en el mismo
  // balde 'unknown' — bloquearía TODOS los registros. El límite por teléfono igual protege.
  if (ip !== 'unknown' && !rateLimit(`reto:register:ip:${ip}`, IP_LIMIT).allowed) return tooMany()

  const ch = await prisma.challenge.findUnique({
    where: { publicSlug: params.slug },
    select: { id: true, name: true, registrationOpen: true, isActive: true },
  })
  if (!ch) return NextResponse.json({ error: 'Reto no encontrado.' }, { status: 404 })
  if (!ch.registrationOpen || !ch.isActive) {
    return NextResponse.json({ error: 'El registro está cerrado por ahora.' }, { status: 403 })
  }

  const parsed = schema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? 'Revisa los datos (nombre y celular son obligatorios).'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
  const d = parsed.data
  const fullName = d.fullName.trim()
  const phone = d.phone.trim()
  const normalizedPhone = normalizePhone(phone)
  if (!normalizedPhone) {
    return NextResponse.json({ error: 'Celular inválido.' }, { status: 400 })
  }

  // 2) Rate-limit por teléfono normalizado (por reto).
  if (!rateLimit(`reto:register:phone:${ch.id}:${normalizedPhone}`, PHONE_LIMIT).allowed) {
    return tooMany()
  }

  try {
    // ¿Ya existía? (para mandar bienvenida solo la primera vez)
    const existing = await prisma.challengeMember.findFirst({
      where: { challengeId: ch.id, phone: normalizedPhone },
      select: { id: true },
    })

    // `fromPublic: true` → enrollMember no debe sobrescribir datos ni reactivar
    // bajas desde el registro público (lo maneja memberService).
    await enrollMember(ch.id, {
      fullName,
      phone,
      email: d.email?.trim() || null,
      country: d.country?.trim() || null,
      city: d.city?.trim() || null,
      fromPublic: true,
    })

    // Bienvenida automática (best-effort, no bloquea la respuesta) solo si es nuevo.
    if (!existing) {
      void sendWelcome(ch.id, ch.name, phone, fullName, d.email?.trim() || null).catch(() => {})
    }

    // ONBOARDING BAN-SAFE: el bot NO puede escribir primero. Devolvemos un enlace
    // wa.me con un texto listo para que el participante ESCRIBA él al número del reto
    // (así entra al bot). Vale para TODOS, tengan correo o no → cierra la fuga de
    // los que se registran sin email y nunca recibían nada.
    let waLink: string | null = null
    try {
      const waNumber = await getRetoWaNumber()
      const digits = (waNumber || '').replace(/\D/g, '')
      if (digits) {
        const waText = `Hola, soy ${fullName.split(/\s+/)[0] || fullName} y me registré al reto ${ch.name}. ¡Quiero empezar! 🚀`
        waLink = `https://wa.me/${digits}?text=${encodeURIComponent(waText)}`
      }
    } catch { /* si no hay número, la página muestra el mensaje sin botón */ }

    return NextResponse.json({ ok: true, waLink })
  } catch (err) {
    // Nunca filtramos el detalle interno al cliente.
    console.error('[reto/register]', err)
    return NextResponse.json({ error: 'No se pudo completar el registro.' }, { status: 500 })
  }
}
