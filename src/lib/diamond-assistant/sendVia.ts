/**
 * Diamond Assistant — Envío agnóstico de proveedor (FASE YCloud)
 *
 * `sendAgentText` / `sendAgentMedia` envían la respuesta del agente IA sin que el
 * llamador tenga que saber por qué canal viaja:
 *
 *   - BAILEYS → motor aislado `diamondBaileys` (WhatsApp Web con QR).
 *   - YCLOUD  → API oficial de YCloud (`@/lib/ycloud`), con el token del agente
 *               descifrado y `from = agent.providerSender`.
 *   - META    → todavía no implementado: devuelve `false` sin romper.
 *
 * TODO envío está blindado: ante cualquier error/credencial faltante devuelve
 * `false` (nunca lanza), para que el webhook siga respondiendo 200.
 */

import { decrypt } from '@/lib/crypto'
import { sendDiamondText, sendDiamondMedia } from './diamondBaileys'
import { sendText, sendImage, sendVideo, sendAudio, sendDocument, sendTemplate } from '@/lib/ycloud'

// ── Tipos públicos ─────────────────────────────────────────────────────────────

/** Campos mínimos del agente que necesita el enrutado de envío. */
export interface SendViaAgent {
  id: string
  provider: string // 'BAILEYS' | 'YCLOUD' | 'META'
  providerApiKeyEnc: string | null
  providerSender: string | null
}

/** Recurso a enviar (subconjunto de MediaAsset). */
export interface SendViaAsset {
  type: string // IMAGE | VIDEO | AUDIO | PDF | LINK | TEXT
  url?: string | null
  linkUrl?: string | null
  textContent?: string | null
  title?: string
  caption?: string | null // descripción que se MANDA con la imagen/video (el title es interno)
}

// ── Helpers ─────────────────────────────────────────────────────────────────────

/** Solo dígitos (E.164 sin '+') a partir de un teléfono cualquiera. */
function digits(phone: string): string {
  return (phone ?? '').replace(/\D/g, '')
}

/** JID de WhatsApp para el motor Baileys. */
function jidFor(phone: string): string {
  return `${digits(phone)}@s.whatsapp.net`
}

/**
 * Credenciales YCloud del agente: `from` (sender) + `apiKey` descifrada.
 * Devuelve `null` si falta el sender o la key (o si no se puede descifrar).
 */
function ycloudCreds(agent: SendViaAgent): { from: string; apiKey: string } | null {
  const from = (agent.providerSender ?? '').trim()
  if (!from || !agent.providerApiKeyEnc) return null
  let apiKey = ''
  try {
    apiKey = decrypt(agent.providerApiKeyEnc)
  } catch {
    apiKey = ''
  }
  apiKey = apiKey.trim()
  if (!apiKey) return null
  return { from, apiKey }
}

/**
 * Cuerpo de texto para recursos que YCloud no puede mandar como media aquí
 * (PDF / LINK / TEXT): combina título + texto + enlace en un solo mensaje.
 */
function textBodyFor(asset: SendViaAsset): string {
  const type = (asset.type || '').toUpperCase()
  const title = (asset.title ?? '').trim()
  const text = (asset.textContent ?? '').trim()
  const link = (asset.linkUrl ?? asset.url ?? '').trim()

  if (type === 'TEXT') return text || title

  const parts: string[] = []
  if (title) parts.push(title)
  if (text) parts.push(text)
  if (link) parts.push(link)
  return parts.join('\n').trim()
}

// ── API pública ─────────────────────────────────────────────────────────────────

/**
 * Parte un texto en 2–3 "burbujas" de WhatsApp (mensajes separados) usando las
 * líneas en blanco como separador. Si no hay separadores, devuelve el texto
 * entero (una sola burbuja). Nunca deja más de `max` burbujas (une el resto).
 */
export function splitBubbles(text: string, max = 3): string[] {
  const t = (text ?? '').trim()
  if (!t) return []
  let parts = t.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean)
  if (parts.length <= 1) return [t]
  if (parts.length > max) {
    const head = parts.slice(0, max - 1)
    const tail = parts.slice(max - 1).join('\n\n')
    parts = [...head, tail]
  }
  return parts
}

/** Envía un texto al contacto por el canal del agente. `false` ante cualquier error. */
export async function sendAgentText(
  agent: SendViaAgent,
  toPhone: string,
  text: string,
): Promise<boolean> {
  const body = (text ?? '').trim()
  if (!body) return false

  try {
    if (agent.provider === 'BAILEYS') {
      return await sendDiamondText(agent.id, jidFor(toPhone), body)
    }

    if (agent.provider === 'YCLOUD') {
      const creds = ycloudCreds(agent)
      if (!creds) return false
      await sendText(creds.from, digits(toPhone), body, creds.apiKey)
      return true
    }

    // META u otros → no implementado (no rompe).
    return false
  } catch (err) {
    console.error(`[diamond sendVia] sendAgentText error agentId=${agent.id}:`, err)
    return false
  }
}

/**
 * Envía una PLANTILLA aprobada de WhatsApp (para escribir fuera de las 24h).
 * Solo YCloud (Baileys/Meta no aplican). `false` ante cualquier error.
 */
export async function sendAgentTemplate(
  agent: SendViaAgent,
  toPhone: string,
  templateName: string,
  languageCode: string,
  bodyParams: Array<{ name?: string; text: string }> = [],
): Promise<boolean> {
  if (!templateName) return false
  try {
    if (agent.provider === 'YCLOUD') {
      const creds = ycloudCreds(agent)
      if (!creds) return false
      await sendTemplate(creds.from, digits(toPhone), creds.apiKey, templateName, languageCode || 'es_ES', bodyParams)
      return true
    }
    // Baileys/Meta no soportan plantilla aprobada de WhatsApp.
    return false
  } catch (err) {
    console.error(`[diamond sendVia] sendAgentTemplate error agentId=${agent.id}:`, err)
    return false
  }
}

/** Envía un recurso (imagen/video/audio/pdf/link/texto). `false` ante cualquier error. */
export async function sendAgentMedia(
  agent: SendViaAgent,
  toPhone: string,
  asset: SendViaAsset,
): Promise<boolean> {
  try {
    if (agent.provider === 'BAILEYS') {
      return await sendDiamondMedia(agent.id, jidFor(toPhone), {
        type: asset.type,
        url: asset.url,
        linkUrl: asset.linkUrl,
        textContent: asset.textContent,
        title: (asset.caption ?? '').trim() || asset.title, // la descripción va como caption
      })
    }

    if (agent.provider === 'YCLOUD') {
      const creds = ycloudCreds(agent)
      if (!creds) return false
      const { from, apiKey } = creds
      const to = digits(toPhone)
      const type = (asset.type || '').toUpperCase()
      const url = (asset.url ?? '').trim()
      // La DESCRIPCIÓN (caption) es lo que se manda; el título es solo interno.
      const caption = (asset.caption ?? '').trim()

      switch (type) {
        case 'IMAGE':
          if (!url) return false
          await sendImage(from, to, url, apiKey, caption)
          return true
        case 'VIDEO':
          if (!url) return false
          await sendVideo(from, to, url, caption, apiKey)
          return true
        case 'AUDIO':
          if (!url) return false
          await sendAudio(from, to, url, apiKey)
          return true
        case 'PDF': {
          // PDF → documento REAL (archivo adjunto), no un link de texto.
          if (!url) {
            const body = textBodyFor(asset)
            if (!body) return false
            await sendText(from, to, body, apiKey)
            return true
          }
          const rawTitle = (asset.title ?? 'documento').trim() || 'documento'
          const filename = /\.pdf$/i.test(rawTitle) ? rawTitle : `${rawTitle}.pdf`
          await sendDocument(from, to, url, filename, '', apiKey)
          return true
        }
        default: {
          // LINK / TEXT → van como texto (un enlace es un enlace).
          const body = textBodyFor(asset)
          if (!body) return false
          await sendText(from, to, body, apiKey)
          return true
        }
      }
    }

    // META u otros → no implementado (no rompe).
    return false
  } catch (err) {
    console.error(`[diamond sendVia] sendAgentMedia error agentId=${agent.id}:`, err)
    return false
  }
}
