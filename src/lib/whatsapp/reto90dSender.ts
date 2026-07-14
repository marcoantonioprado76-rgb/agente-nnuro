// ─────────────────────────────────────────────────────────────────────────────
// Reto 90D — Adaptador de envío por WhatsApp (Baileys)
// Envía mensajes usando el bot Baileys DEDICADO del reto (WhatsAppConfig.botId).
// No toca los bots normales: sólo resuelve el bot del reto desde la config.
// ─────────────────────────────────────────────────────────────────────────────
import { prisma } from '@/lib/prisma'
import { BaileysManager } from '@/lib/baileys-manager'
import { decrypt } from '@/lib/crypto'
import { normalizePhone } from '@/lib/reto90d/memberService'

type ConfigCache = {
  botId: string | null
  groupId: string | null
  adminPhone: string | null
  botInstructions: string | null
  welcomeMessage: string | null
  openaiApiKeyEnc: string | null
  elevenLabsApiKeyEnc: string | null
  voiceId: string | null
  at: number
}
let cache: ConfigCache | null = null
const CACHE_MS = 30_000

/** Lee la config activa del reto (cacheada 30s para no golpear la BD en cada mensaje). */
async function getConfig(): Promise<ConfigCache> {
  const now = Date.now()
  if (cache && now - cache.at < CACHE_MS) return cache
  try {
    const cfg = await prisma.whatsAppConfig.findFirst({
      where: { isActive: true },
      select: { botId: true, groupId: true, adminPhone: true, botInstructions: true, welcomeMessage: true, openaiApiKeyEnc: true, elevenLabsApiKeyEnc: true, voiceId: true },
      orderBy: { updatedAt: 'desc' },
    })
    cache = {
      botId: cfg?.botId ?? null,
      groupId: cfg?.groupId ?? null,
      adminPhone: cfg?.adminPhone ?? null,
      botInstructions: cfg?.botInstructions ?? null,
      welcomeMessage: cfg?.welcomeMessage ?? null,
      openaiApiKeyEnc: cfg?.openaiApiKeyEnc ?? null,
      elevenLabsApiKeyEnc: cfg?.elevenLabsApiKeyEnc ?? null,
      voiceId: cfg?.voiceId ?? null,
      at: now,
    }
  } catch (err) {
    console.error('[reto90d/sender] getConfig failed:', err)
    // No dejamos que un fallo de BD tumbe el flujo del bot: devolvemos cache viejo o vacío.
    cache = cache ?? { botId: null, groupId: null, adminPhone: null, botInstructions: null, welcomeMessage: null, openaiApiKeyEnc: null, elevenLabsApiKeyEnc: null, voiceId: null, at: now }
  }
  return cache
}

/** Voz del reto: key de ElevenLabs (panel o entorno) + voiceId elegido. */
export async function getRetoVoice(): Promise<{ apiKey: string | null; voiceId: string | null }> {
  const cfg = await getConfig()
  let apiKey: string | null = null
  if (cfg.elevenLabsApiKeyEnc) {
    try { apiKey = decrypt(cfg.elevenLabsApiKeyEnc) || null } catch { apiKey = null }
  }
  if (!apiKey) apiKey = process.env.ELEVENLABS_API_KEY || null
  return { apiKey, voiceId: cfg.voiceId }
}

/** Instrucciones/system-prompt del bot (tono, trato y contexto del plan) o null. */
export async function getRetoInstructions(): Promise<string | null> {
  return (await getConfig()).botInstructions
}

/** Plantilla de bienvenida configurada (o null → se usa la de por defecto). */
export async function getWelcomeTemplate(): Promise<string | null> {
  return (await getConfig()).welcomeMessage
}

/** Key de OpenAI efectiva: la configurada en el panel (cifrada) o, si no, la de entorno. */
export async function getEffectiveOpenAIKey(): Promise<string | null> {
  const enc = (await getConfig()).openaiApiKeyEnc
  if (enc) {
    try {
      const key = decrypt(enc)
      if (key) return key
    } catch (err) {
      console.error('[reto90d/sender] decrypt openai key failed:', err)
    }
  }
  return process.env.OPENAI_API_KEY || null
}

/** Invalida el cache (útil tras guardar la configuración en el panel). */
export function invalidateRetoConfigCache() {
  cache = null
}

/** ID del bot Baileys dedicado al reto (o null si no está configurado). */
export async function getRetoBotId(): Promise<string | null> {
  return (await getConfig()).botId
}

/** Número de WhatsApp del reto (baileysPhone del bot) para armar enlaces wa.me. */
export async function getRetoWaNumber(): Promise<string | null> {
  const botId = await getRetoBotId()
  if (!botId) return null
  try {
    const bot = await prisma.bot.findUnique({ where: { id: botId }, select: { baileysPhone: true } })
    return bot?.baileysPhone ?? null
  } catch {
    return null
  }
}

/** true si `botId` es el bot dedicado del reto. Nunca lanza. */
export async function isReto90dBot(botId: string): Promise<boolean> {
  try {
    const id = await getRetoBotId()
    return !!id && id === botId
  } catch {
    return false
  }
}

/** Envía un texto a un teléfono individual usando el bot del reto. */
export async function sendToPhone(phone: string, text: string): Promise<boolean> {
  const botId = await getRetoBotId()
  if (!botId) {
    console.warn('[reto90d/sender] sin botId configurado, no se envía a', phone)
    return false
  }
  return BaileysManager.sendText(botId, normalizePhone(phone), text)
}

/**
 * Envía un mensaje del COACH en VOZ si hay voz configurada (ElevenLabs + voiceId
 * del panel); si no hay voz o la síntesis falla, cae a TEXTO. Se usa para los
 * mensajes proactivos "de peso" (reenganche, graduación, resúmenes). Best-effort.
 */
export async function sendCoachVoiceOrText(phone: string, text: string): Promise<boolean> {
  const botId = await getRetoBotId()
  if (!botId) {
    console.warn('[reto90d/sender] sin botId configurado, no se envía a', phone)
    return false
  }
  const to = normalizePhone(phone)
  try {
    const { apiKey, voiceId } = await getRetoVoice()
    if (apiKey && voiceId) {
      const { synthesizeElevenRaw } = await import('@/lib/tts')
      const ogg = await synthesizeElevenRaw(text, voiceId, apiKey)
      if (ogg && (await BaileysManager.sendAudio(botId, to, ogg))) return true
    }
  } catch (err) {
    console.error('[reto90d/sender] voz proactiva falló, cae a texto:', err)
  }
  return BaileysManager.sendText(botId, to, text)
}

/** Envía un texto al admin configurado (adminPhone). */
export async function sendToAdmin(text: string): Promise<boolean> {
  const cfg = await getConfig()
  if (!cfg.botId || !cfg.adminPhone) return false
  return BaileysManager.sendText(cfg.botId, normalizePhone(cfg.adminPhone), text)
}

/** Envía un texto al grupo de WhatsApp del reto (JID ...@g.us). */
export async function sendToGroup(text: string): Promise<boolean> {
  const cfg = await getConfig()
  if (!cfg.botId || !cfg.groupId) return false
  return BaileysManager.sendToJid(cfg.botId, cfg.groupId, text)
}
