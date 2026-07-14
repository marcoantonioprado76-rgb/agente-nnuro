// ─────────────────────────────────────────────────────────────────────────────
// Reto 90D — Memoria de conversación del bot con cada participante.
// Guarda y recupera el hilo para que el bot "recuerde" (p.ej. responder
// "¿qué tarea me falta?" con contexto).
// ─────────────────────────────────────────────────────────────────────────────
import { prisma } from '@/lib/prisma'

export type RetoRole = 'user' | 'bot'
export type RetoChatMessage = { role: RetoRole; content: string }

/** Guarda un mensaje (best-effort: nunca lanza para no tumbar el flujo del bot). */
export async function saveRetoMessage(
  challengeId: string,
  phone: string,
  role: RetoRole,
  content: string,
): Promise<void> {
  const text = (content || '').trim()
  if (!text) return
  try {
    await prisma.retoMessage.create({
      data: { challengeId, phone, role, content: text.slice(0, 4000) },
    })
  } catch (err) {
    console.error('[reto90d/conversation] saveRetoMessage failed:', err)
  }
}

/**
 * Teléfonos que YA le escribieron al bot (tienen al menos un mensaje entrante).
 * BAN-SAFE: solo a estos se les puede enviar WhatsApp proactivo (recordatorios,
 * reportes), porque iniciaron la conversación. A los demás, nunca escribimos primero.
 */
export async function getOptedInPhones(challengeId: string): Promise<Set<string>> {
  try {
    const rows = await prisma.retoMessage.findMany({
      where: { challengeId, role: 'user' },
      select: { phone: true },
      distinct: ['phone'],
    })
    return new Set(rows.map((r) => r.phone))
  } catch (err) {
    console.error('[reto90d/conversation] getOptedInPhones failed:', err)
    return new Set()
  }
}

/** Últimos N mensajes (orden cronológico ascendente) del participante. */
export async function getRecentMessages(
  challengeId: string,
  phone: string,
  limit = 12,
): Promise<RetoChatMessage[]> {
  try {
    const rows = await prisma.retoMessage.findMany({
      where: { challengeId, phone },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: { role: true, content: true },
    })
    return rows.reverse().map((r) => ({ role: r.role as RetoRole, content: r.content }))
  } catch (err) {
    console.error('[reto90d/conversation] getRecentMessages failed:', err)
    return []
  }
}
