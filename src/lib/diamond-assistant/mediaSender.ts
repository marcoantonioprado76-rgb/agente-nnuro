/**
 * Diamond Assistant — Media Sender (envío real por WhatsApp — FASE 5 cableada)
 *
 * Firmas para enviar cada tipo de contenido por WhatsApp (texto/imagen/video/
 * audio/pdf/link). El envío REAL usa el MOTOR AISLADO del asistente:
 *   - BAILEYS  -> `diamondBaileys` (WhatsApp Web, conexiones y sesión PROPIAS,
 *                 separadas de los bots en vivo de `baileys-manager`).
 *   - YCLOUD   -> API oficial de YCloud (pendiente, sigue como stub).
 *
 * WIRING: para enviar de verdad hay que pasar `opts.agentId` (qué agente/conexión
 * usa el motor). Sin `agentId`, la función se comporta como STUB (`{ ok: true }`),
 * conservando el comportamiento previo de quienes aún no envían por WhatsApp
 * (p. ej. el flujo de campañas). El PLAYGROUND del agente NUNCA usa estas
 * funciones (allí no se envía nada; `agentEngine.executeTool` solo describe).
 *
 * NOTA: `diamondInbound`/`welcome` (recepción + bienvenida) llaman DIRECTO a
 * `diamondBaileys`; estas funciones son wrappers de conveniencia con firma estable.
 */

import type { MediaAsset, WhatsAppEngine } from './types'
import { sendDiamondText, sendDiamondMedia } from './diamondBaileys'

/** Resultado uniforme de cualquier envío. */
export interface SendResult {
  ok: boolean
  /** ID del mensaje devuelto por el motor (a futuro). */
  externalId?: string
  /** Motor usado en el envío. */
  engine?: WhatsAppEngine
  /** Detalle legible (éxito o causa de error). */
  detail?: string
}

/** Destinatario: número E.164 sin "+" (jid base de WhatsApp). */
export type Recipient = string

/** Opciones comunes de envío. */
export interface SendOptions {
  /** Motor a usar; por defecto se resolverá según configuración a futuro. */
  engine?: WhatsAppEngine
  /** Caption/pie que acompaña a los medios. */
  caption?: string
  /**
   * Agente/conexión del motor Diamond a usar para el envío REAL por WhatsApp.
   * Si se omite, la función se comporta como STUB (compatibilidad hacia atrás).
   */
  agentId?: string
}

// ---------------------------------------------------------------------------
// Stubs de envío por tipo
// ---------------------------------------------------------------------------

/** Resultado STUB uniforme cuando no se pasa `agentId` (sin envío real). */
function stub(fn: string): SendResult {
  return { ok: true, detail: `stub:${fn} (sin agentId — no se envía por WhatsApp)` }
}

/**
 * Envía un mensaje de texto. Con `opts.agentId` envía real vía diamondBaileys.
 */
export async function sendText(
  to: Recipient,
  text: string,
  opts: SendOptions = {},
): Promise<SendResult> {
  if (!opts.agentId) return stub('sendText')
  const ok = await sendDiamondText(opts.agentId, to, text)
  return { ok, engine: 'BAILEYS', detail: ok ? 'sendText ok' : 'sendText: no conectado o error' }
}

/**
 * Envía una imagen (con caption opcional). El caption viaja como `title`.
 */
export async function sendImage(
  to: Recipient,
  imageUrl: string,
  opts: SendOptions = {},
): Promise<SendResult> {
  if (!opts.agentId) return stub('sendImage')
  const ok = await sendDiamondMedia(opts.agentId, to, { type: 'IMAGE', url: imageUrl, title: opts.caption })
  return { ok, engine: 'BAILEYS', detail: ok ? 'sendImage ok' : 'sendImage: no conectado o error' }
}

/**
 * Envía un video (con caption opcional). El caption viaja como `title`.
 */
export async function sendVideo(
  to: Recipient,
  videoUrl: string,
  opts: SendOptions = {},
): Promise<SendResult> {
  if (!opts.agentId) return stub('sendVideo')
  const ok = await sendDiamondMedia(opts.agentId, to, { type: 'VIDEO', url: videoUrl, title: opts.caption })
  return { ok, engine: 'BAILEYS', detail: ok ? 'sendVideo ok' : 'sendVideo: no conectado o error' }
}

/**
 * Envía un audio / nota de voz.
 */
export async function sendAudio(
  to: Recipient,
  audioUrl: string,
  opts: SendOptions = {},
): Promise<SendResult> {
  if (!opts.agentId) return stub('sendAudio')
  const ok = await sendDiamondMedia(opts.agentId, to, { type: 'AUDIO', url: audioUrl })
  return { ok, engine: 'BAILEYS', detail: ok ? 'sendAudio ok' : 'sendAudio: no conectado o error' }
}

/**
 * Envía un documento PDF (filename derivado del caption si se da).
 */
export async function sendPdf(
  to: Recipient,
  pdfUrl: string,
  opts: SendOptions = {},
): Promise<SendResult> {
  if (!opts.agentId) return stub('sendPdf')
  const ok = await sendDiamondMedia(opts.agentId, to, { type: 'PDF', url: pdfUrl, title: opts.caption })
  return { ok, engine: 'BAILEYS', detail: ok ? 'sendPdf ok' : 'sendPdf: no conectado o error' }
}

/**
 * Envía un link como texto (el caption, si existe, lo antecede).
 */
export async function sendLink(
  to: Recipient,
  url: string,
  opts: SendOptions = {},
): Promise<SendResult> {
  if (!opts.agentId) return stub('sendLink')
  const ok = await sendDiamondMedia(opts.agentId, to, { type: 'LINK', linkUrl: url, textContent: opts.caption })
  return { ok, engine: 'BAILEYS', detail: ok ? 'sendLink ok' : 'sendLink: no conectado o error' }
}

/**
 * Despachador genérico: recibe un MediaAsset y llama a la función correcta según
 * su `type`. Con `opts.agentId` envía real vía diamondBaileys; sin él, es STUB.
 */
export async function sendMediaAsset(
  to: Recipient,
  asset: MediaAsset,
  opts: SendOptions = {},
): Promise<SendResult> {
  const options: SendOptions = { caption: asset.caption, ...opts }
  switch (asset.type) {
    case 'IMAGE':
      return sendImage(to, asset.url ?? '', options)
    case 'VIDEO':
      return sendVideo(to, asset.url ?? '', options)
    case 'AUDIO':
      return sendAudio(to, asset.url ?? '', options)
    case 'PDF':
      return sendPdf(to, asset.url ?? '', options)
    case 'LINK':
      return sendLink(to, asset.url ?? '', options)
    case 'TEXT':
      return sendText(to, asset.content ?? asset.caption ?? '', options)
    default:
      // Exhaustividad: si se agrega un MediaType nuevo, TS obligará a tratarlo.
      return { ok: false, detail: `stub:sendMediaAsset tipo no soportado` }
  }
}
