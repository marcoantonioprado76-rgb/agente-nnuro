/**
 * Diamond Assistant — "Modo Dueño": ejecutores de acciones + confirmación.
 *
 * Acá vive TODO lo que el cerebro admin (ownerEngine) puede EJECUTAR de verdad:
 *   - Biblioteca (Fase 1): guardar recurso enviado, guardar enlace/texto, listar,
 *     editar descripción, borrar.
 *   - Sistema de APROBACIÓN determinista: las acciones delicadas no se ejecutan al
 *     toque; se guardan en `diamond_owner_actions` (PENDING) con un resumen, y se
 *     ejecutan recién cuando el dueño responde "aprobado" (executePending).
 *
 * TODO ejecutor devuelve un texto legible para el dueño (éxito o error claro) y
 * NUNCA lanza hacia afuera: ante error, informa qué pasó (no finge que lo hizo).
 */

import { randomUUID } from 'crypto'
import { DiamondMediaType, DiamondCampaignStatus, Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { supabaseAdmin } from '@/lib/supabase'
import { listDiamondGroups, sendCombinedToGroup, getDiamondStatus } from './diamondBaileys'
import { resolveCampaignRecipients } from './campaignSender'

// ── Media adjunta que el dueño mandó por WhatsApp ────────────────────────────────
export type OwnerInboundMedia = {
  kind: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'PDF'
  url: string
  mimeType: string
  filename?: string
  caption?: string
}

// ── Límites de entrega de WhatsApp (mismos que la subida por panel) ──────────────
const MAX_BYTES: Record<string, number> = {
  IMAGE: 5 * 1024 * 1024,
  AUDIO: 16 * 1024 * 1024,
  PDF: 100 * 1024 * 1024,
  VIDEO: 16 * 1024 * 1024,
}
const TYPE_LABEL: Record<string, string> = { IMAGE: 'La imagen', VIDEO: 'El video', AUDIO: 'El audio', PDF: 'El PDF' }

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif',
  'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov', 'video/3gpp': '3gp',
  'audio/mpeg': 'mp3', 'audio/mp4': 'm4a', 'audio/ogg': 'ogg', 'audio/wav': 'wav', 'audio/amr': 'amr',
  'application/pdf': 'pdf',
}

const BUCKET = 'uploads'

// ─────────────────────────────────────────────────────────────────────────────────
// APROBACIÓN — detección de "sí/no" y almacén de acciones pendientes
// ─────────────────────────────────────────────────────────────────────────────────

/** Rango de tildes/diacríticos combinantes (U+0300–U+036F). */
const DIACRITICS = new RegExp('[\\u0300-\\u036f]', 'g')

/** Normaliza para comparar: minúsculas, sin tildes, sin signos. */
function norm(s: string): string {
  return (s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(DIACRITICS, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const AFFIRM = /^(aprobado|aprobada|aprueba|apruebo|si|dale|ok|okay|oka|confirmo|confirmado|confirma|hazlo|hacelo|hacela|listo|adelante|correcto|va|vale|de acuerdo|perfecto|procede|proceda|mandalo|mandala|mandale|envialo|enviala|si por favor|sip|sipi|obvio|claro)\b/
const NEGATE = /^(no|cancela|cancelar|mejor no|olvidalo|olvidala|olvida|dejalo|dejala|para|parar|detener|stop|nel|nop|negativo)\b/

export function isAffirmation(text: string): boolean {
  return AFFIRM.test(norm(text))
}
export function isNegation(text: string): boolean {
  return NEGATE.test(norm(text))
}

/** Tipo de acción que requiere aprobación del dueño antes de ejecutarse. */
export type PendingActionType =
  | 'SCHEDULE_POST'
  | 'SEND_NOW'
  | 'LAUNCH_CAMPAIGN'
  | 'PAUSE_CAMPAIGN'
  | 'CANCEL_SCHEDULED'
  | 'DELETE_KNOWLEDGE'
  | 'DELETE_MEDIA'

/** La acción pendiente más reciente del dueño (o null). Solo PENDING. */
export async function getPendingAction(agentId: string, ownerPhone: string) {
  return prisma.diamondOwnerAction.findFirst({
    where: { agentId, ownerPhone, status: 'PENDING' },
    orderBy: { createdAt: 'desc' },
  })
}

/** Crea una acción pendiente (para aprobar). Cancela cualquier otra pendiente antes. */
export async function createPendingAction(
  agentId: string,
  ownerPhone: string,
  actionType: PendingActionType,
  payload: Record<string, unknown>,
  summary: string,
): Promise<void> {
  await prisma.diamondOwnerAction.updateMany({
    where: { agentId, ownerPhone, status: 'PENDING' },
    data: { status: 'CANCELLED' },
  })
  await prisma.diamondOwnerAction.create({
    data: { agentId, ownerPhone, actionType, payload: payload as Prisma.InputJsonValue, summary },
  })
}

/** Marca una pendiente como resuelta (DONE/CANCELLED/EXPIRED). */
export async function resolvePending(id: string, status: 'DONE' | 'CANCELLED' | 'EXPIRED'): Promise<void> {
  await prisma.diamondOwnerAction.update({ where: { id }, data: { status } }).catch(() => {})
}

// ─────────────────────────────────────────────────────────────────────────────────
// BIBLIOTECA (Fase 1)
// ─────────────────────────────────────────────────────────────────────────────────

/** Sube un buffer a S3 (mismo mecanismo que el panel) y devuelve la URL pública. */
async function uploadToStorage(buffer: Buffer, mediaType: string, ext: string, contentType: string): Promise<string | null> {
  const path = `diamond/media/${mediaType.toLowerCase()}/${randomUUID()}.${ext}`
  const { error } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: contentType || 'application/octet-stream', cacheControl: '31536000', upsert: false })
  if (error) {
    console.error('[OWNER] storage upload error:', error)
    return null
  }
  const { data } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}

/**
 * Guarda en la biblioteca el ARCHIVO que el dueño acaba de mandar por WhatsApp.
 * Descarga la URL de YCloud, la sube a S3 y crea el MediaAsset. `caption` = lo que
 * se manda con el recurso; `title` = interno (para buscarlo). Devuelve texto legible.
 */
export async function saveResourceFromMedia(
  media: OwnerInboundMedia,
  opts: { title?: string; description?: string; tags?: string[]; createdBy?: string | null },
): Promise<{ ok: boolean; text: string; assetId?: string }> {
  try {
    const type = media.kind // IMAGE | VIDEO | AUDIO | PDF
    const label = TYPE_LABEL[type] ?? 'El archivo'

    // 1) Descargar de YCloud (URL pública temporal, sin auth).
    const res = await fetch(media.url)
    if (!res.ok) return { ok: false, text: `No pude descargar ${label.toLowerCase()} que me mandaste (error ${res.status}). Probá de nuevo.` }
    const buffer = Buffer.from(await res.arrayBuffer())

    // 2) Validar tamaño contra el límite de WhatsApp (si no, no se podría reenviar).
    const max = MAX_BYTES[type] ?? 16 * 1024 * 1024
    if (buffer.byteLength > max) {
      const mb = Math.round(max / 1024 / 1024)
      const got = (buffer.byteLength / 1024 / 1024).toFixed(1)
      return { ok: false, text: `${label} pesa ${got}MB y supera el límite de ${mb}MB de WhatsApp, así que no lo podría reenviar. Comprimilo y mandámelo de nuevo.` }
    }

    // 3) Subir a S3.
    const mime = (res.headers.get('content-type') || media.mimeType || '').split(';')[0].trim()
    const ext = EXT_BY_MIME[mime] || (media.filename?.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 5) || 'bin'
    const url = await uploadToStorage(buffer, type, ext, mime)
    if (!url) return { ok: false, text: 'No pude guardar el archivo en el almacenamiento. Probá de nuevo en un rato.' }

    // 4) Crear el recurso en la biblioteca.
    const title = (opts.title || media.filename?.replace(/\.[^.]+$/, '') || `${type} ${new Date().toISOString().slice(0, 10)}`).slice(0, 90)
    const caption = (opts.description || media.caption || '').trim() || null
    const tags = (opts.tags ?? []).map((t) => String(t).trim()).filter(Boolean).slice(0, 30)

    const asset = await prisma.mediaAsset.create({
      data: {
        type: type as DiamondMediaType,
        title,
        caption,
        tags: tags as Prisma.InputJsonValue,
        createdBy: opts.createdBy ?? null,
        url,
        mimeType: mime || null,
        sizeBytes: buffer.byteLength,
      },
    })
    const kindWord = type === 'IMAGE' ? 'imagen' : type === 'VIDEO' ? 'video' : type === 'AUDIO' ? 'audio' : 'documento'
    return { ok: true, assetId: asset.id, text: `Listo ✅ Guardé el ${kindWord} «${title}» en la biblioteca${caption ? ` con la descripción: "${caption}"` : ''}.` }
  } catch (err) {
    console.error('[OWNER] saveResourceFromMedia error:', err)
    return { ok: false, text: 'Hubo un error al guardar el recurso. No quedó guardado; probá de nuevo.' }
  }
}

/** Guarda un ENLACE en la biblioteca. */
export async function saveLinkResource(opts: { title: string; linkUrl: string; tags?: string[]; createdBy?: string | null }): Promise<{ ok: boolean; text: string }> {
  try {
    const linkUrl = (opts.linkUrl || '').trim()
    if (!/^https?:\/\//i.test(linkUrl)) return { ok: false, text: 'Ese enlace no es válido (tiene que empezar con http:// o https://).' }
    const title = (opts.title || 'Enlace').slice(0, 90)
    await prisma.mediaAsset.create({
      data: { type: DiamondMediaType.LINK, title, tags: (opts.tags ?? []) as Prisma.InputJsonValue, createdBy: opts.createdBy ?? null, linkUrl },
    })
    return { ok: true, text: `Listo ✅ Guardé el enlace «${title}» en la biblioteca.` }
  } catch (err) {
    console.error('[OWNER] saveLinkResource error:', err)
    return { ok: false, text: 'No pude guardar el enlace. Probá de nuevo.' }
  }
}

/** Guarda un TEXTO en la biblioteca. */
export async function saveTextResource(opts: { title: string; content: string; tags?: string[]; createdBy?: string | null }): Promise<{ ok: boolean; text: string }> {
  try {
    const content = (opts.content || '').trim()
    if (!content) return { ok: false, text: 'No me diste el texto a guardar.' }
    const title = (opts.title || 'Texto').slice(0, 90)
    await prisma.mediaAsset.create({
      data: { type: DiamondMediaType.TEXT, title, tags: (opts.tags ?? []) as Prisma.InputJsonValue, createdBy: opts.createdBy ?? null, textContent: content },
    })
    return { ok: true, text: `Listo ✅ Guardé el texto «${title}» en la biblioteca.` }
  } catch (err) {
    console.error('[OWNER] saveTextResource error:', err)
    return { ok: false, text: 'No pude guardar el texto. Probá de nuevo.' }
  }
}

/** Lista breve de la biblioteca (para consultar o para que el modelo tenga contexto). */
export async function listLibrary(query?: string, limit = 40): Promise<Array<{ id: string; type: string; title: string; caption: string | null }>> {
  const rows = await prisma.mediaAsset.findMany({
    where: query?.trim()
      ? { OR: [{ title: { contains: query.trim(), mode: 'insensitive' } }, { caption: { contains: query.trim(), mode: 'insensitive' } }] }
      : {},
    select: { id: true, type: true, title: true, caption: true },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
  return rows
}

/** Busca UN recurso por id exacto o por título (exacto, luego parcial). */
export async function findAsset(ref: string): Promise<{ id: string; type: string; title: string } | null> {
  const r = (ref ?? '').trim()
  if (!r) return null
  const byId = await prisma.mediaAsset.findUnique({ where: { id: r }, select: { id: true, type: true, title: true } }).catch(() => null)
  if (byId) return byId
  const exact = await prisma.mediaAsset.findFirst({ where: { title: { equals: r, mode: 'insensitive' } }, select: { id: true, type: true, title: true } })
  if (exact) return exact
  return prisma.mediaAsset.findFirst({ where: { title: { contains: r, mode: 'insensitive' } }, select: { id: true, type: true, title: true }, orderBy: { createdAt: 'desc' } })
}

/** Edita título/descripción/etiquetas de un recurso existente. */
export async function updateLibraryAsset(ref: string, patch: { title?: string; description?: string; tags?: string[] }): Promise<{ ok: boolean; text: string }> {
  try {
    const asset = await findAsset(ref)
    if (!asset) return { ok: false, text: `No encontré ningún recurso que se llame «${ref}» en la biblioteca.` }
    const data: Prisma.MediaAssetUpdateInput = {}
    if (patch.title !== undefined) data.title = patch.title.slice(0, 90)
    if (patch.description !== undefined) data.caption = patch.description.trim() || null
    if (patch.tags !== undefined) data.tags = patch.tags as Prisma.InputJsonValue
    await prisma.mediaAsset.update({ where: { id: asset.id }, data })
    return { ok: true, text: `Listo ✅ Actualicé el recurso «${asset.title}».` }
  } catch (err) {
    console.error('[OWNER] updateLibraryAsset error:', err)
    return { ok: false, text: 'No pude actualizar el recurso. Probá de nuevo.' }
  }
}

/** Borra un recurso de la biblioteca (por id, ya resuelto en la aprobación). */
export async function deleteLibraryAssetById(id: string): Promise<{ ok: boolean; text: string }> {
  try {
    const asset = await prisma.mediaAsset.findUnique({ where: { id }, select: { id: true, title: true } })
    if (!asset) return { ok: false, text: 'Ese recurso ya no existe.' }
    await prisma.mediaAsset.delete({ where: { id } })
    return { ok: true, text: `Listo ✅ Borré el recurso «${asset.title}» de la biblioteca.` }
  } catch (err) {
    console.error('[OWNER] deleteLibraryAssetById error:', err)
    return { ok: false, text: 'No pude borrar el recurso. Probá de nuevo.' }
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// CEREBRO / CONOCIMIENTO (Fase 2)
// ─────────────────────────────────────────────────────────────────────────────────

/** Agrega un ítem a la base de conocimiento del agente (lo que CAMILA "sabe"). */
export async function addKnowledge(agentId: string, opts: { title: string; content: string; category?: string }): Promise<{ ok: boolean; text: string }> {
  try {
    const title = (opts.title || '').trim()
    const content = (opts.content || '').trim()
    if (!content) return { ok: false, text: 'No me diste el dato a aprender.' }
    await prisma.knowledgeItem.create({
      data: { agentId, title: title || content.slice(0, 60), content, category: (opts.category || '').trim() || null, isActive: true },
    })
    return { ok: true, text: `Listo ✅ Lo agregué a mi conocimiento. Ya lo voy a usar cuando alguien pregunte.` }
  } catch (err) {
    console.error('[OWNER] addKnowledge error:', err)
    return { ok: false, text: 'No pude guardar ese conocimiento. Probá de nuevo.' }
  }
}

/** Busca UN ítem de conocimiento por id o por título/contenido (parcial). */
export async function findKnowledge(agentId: string, ref: string): Promise<{ id: string; title: string; content: string } | null> {
  const r = (ref ?? '').trim()
  if (!r) return null
  const byId = await prisma.knowledgeItem.findFirst({ where: { id: r, agentId }, select: { id: true, title: true, content: true } }).catch(() => null)
  if (byId) return byId
  const exact = await prisma.knowledgeItem.findFirst({ where: { agentId, title: { equals: r, mode: 'insensitive' } }, select: { id: true, title: true, content: true } })
  if (exact) return exact
  return prisma.knowledgeItem.findFirst({
    where: { agentId, OR: [{ title: { contains: r, mode: 'insensitive' } }, { content: { contains: r, mode: 'insensitive' } }] },
    select: { id: true, title: true, content: true },
    orderBy: { createdAt: 'desc' },
  })
}

/** Edita/corrige un ítem de conocimiento existente. */
export async function updateKnowledge(agentId: string, ref: string, patch: { title?: string; content?: string; category?: string }): Promise<{ ok: boolean; text: string }> {
  try {
    const item = await findKnowledge(agentId, ref)
    if (!item) return { ok: false, text: `No encontré nada en mi conocimiento sobre «${ref}».` }
    const data: Prisma.KnowledgeItemUpdateInput = {}
    if (patch.title !== undefined) data.title = patch.title.trim()
    if (patch.content !== undefined) data.content = patch.content.trim()
    if (patch.category !== undefined) data.category = patch.category.trim() || null
    await prisma.knowledgeItem.update({ where: { id: item.id }, data })
    return { ok: true, text: `Listo ✅ Corregí lo que sabía sobre «${item.title}».` }
  } catch (err) {
    console.error('[OWNER] updateKnowledge error:', err)
    return { ok: false, text: 'No pude corregir ese conocimiento. Probá de nuevo.' }
  }
}

/** Lista/busca ítems de conocimiento (para consultar qué sabe). */
export async function listKnowledge(agentId: string, query?: string, limit = 40): Promise<Array<{ id: string; title: string; content: string }>> {
  return prisma.knowledgeItem.findMany({
    where: {
      agentId,
      isActive: true,
      ...(query?.trim() ? { OR: [{ title: { contains: query.trim(), mode: 'insensitive' } }, { content: { contains: query.trim(), mode: 'insensitive' } }] } : {}),
    },
    select: { id: true, title: true, content: true },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
}

/** Borra un ítem de conocimiento (por id, ya resuelto en la aprobación). */
export async function deleteKnowledgeById(id: string): Promise<{ ok: boolean; text: string }> {
  try {
    const item = await prisma.knowledgeItem.findUnique({ where: { id }, select: { id: true, title: true } })
    if (!item) return { ok: false, text: 'Ese conocimiento ya no existe.' }
    await prisma.knowledgeItem.delete({ where: { id } })
    return { ok: true, text: `Listo ✅ Borré de mi conocimiento «${item.title}».` }
  } catch (err) {
    console.error('[OWNER] deleteKnowledgeById error:', err)
    return { ok: false, text: 'No pude borrar ese conocimiento. Probá de nuevo.' }
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// GRUPOS + FECHAS (Fase 3)
// ─────────────────────────────────────────────────────────────────────────────────

const DEFAULT_TZ = 'America/La_Paz' // Bolivia (UTC-4, sin horario de verano)

/** Zona horaria del agente (o Bolivia por defecto). */
export async function getAgentTimezone(agentId: string): Promise<string> {
  const a = await prisma.assistantAgent.findUnique({ where: { id: agentId }, select: { timezone: true } }).catch(() => null)
  return a?.timezone || DEFAULT_TZ
}

/** Offset (ms) de una zona respecto a UTC en un instante dado. */
function tzOffsetMs(date: Date, tz: string): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
  const map: Record<string, string> = {}
  for (const p of dtf.formatToParts(date)) map[p.type] = p.value
  const asUTC = Date.UTC(+map.year, +map.month - 1, +map.day, +map.hour, +map.minute, +map.second)
  return asUTC - date.getTime()
}

/**
 * Convierte una hora de PARED en una zona (ej. "2026-07-15 08:00" en Bolivia) al
 * instante UTC correcto. Devuelve null si el string no es válido.
 */
export function wallClockToUtc(local: string, tz = DEFAULT_TZ): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec((local ?? '').trim())
  if (!m) return null
  const [, y, mo, d, h, mi] = m.map(Number) as unknown as number[]
  const guess = new Date(Date.UTC(y, mo - 1, d, h, mi))
  if (isNaN(guess.getTime())) return null
  return new Date(guess.getTime() - tzOffsetMs(guess, tz))
}

/** Fecha/hora legible en la zona del agente (ej. "mar 15/07 08:00"). */
export function formatLocal(date: Date, tz = DEFAULT_TZ): string {
  try {
    return new Intl.DateTimeFormat('es-BO', {
      timeZone: tz, weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
    }).format(date)
  } catch {
    return date.toISOString()
  }
}

/** "Ahora" en la zona, formato "YYYY-MM-DD HH:MM (día)" para orientar al modelo. */
export function nowLocalText(tz = DEFAULT_TZ): string {
  const now = new Date()
  const parts: Record<string, string> = {}
  for (const p of new Intl.DateTimeFormat('en-CA', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'long', hour12: false,
  }).formatToParts(now)) parts[p.type] = p.value
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute} (${parts.weekday})`
}

/** Lista de grupos donde CAMILA puede publicar (subject + jid), vía Baileys. */
export async function listGroups(agentId: string): Promise<Array<{ jid: string; subject: string }>> {
  try {
    const groups = await listDiamondGroups(agentId)
    return groups.map((g) => ({ jid: g.id, subject: g.subject || '' })).filter((g) => g.jid)
  } catch (err) {
    console.error('[OWNER] listGroups error:', err)
    return []
  }
}

/** Resuelve un grupo por nombre (subject) o jid. Usa la sesión viva y, si falla, la BD. */
export async function resolveGroup(agentId: string, ref: string): Promise<{ jid: string; subject: string } | null> {
  const r = (ref ?? '').trim().toLowerCase()
  if (!r) return null
  const groups = await listGroups(agentId)
  if (groups.length) {
    const exact = groups.find((g) => g.subject.toLowerCase() === r || g.jid === ref)
    if (exact) return exact
    const partial = groups.find((g) => g.subject.toLowerCase().includes(r) || r.includes(g.subject.toLowerCase()))
    if (partial) return partial
  }
  // Fallback: nombre guardado en la BD.
  const row = await prisma.assistantGroup.findFirst({
    where: { agentId, name: { contains: ref, mode: 'insensitive' } },
    select: { groupJid: true, name: true },
  })
  if (row) return { jid: row.groupJid, subject: row.name ?? ref }
  return null
}

/** Resuelve varias referencias de recursos (títulos) a ids de la biblioteca. */
export async function resolveMediaRefs(refs: string[]): Promise<string[]> {
  const ids: string[] = []
  for (const ref of refs) {
    const a = await findAsset(ref)
    if (a) ids.push(a.id)
  }
  return ids
}

/** Crea la publicación programada (ya con datos resueltos). */
export async function createScheduledPost(payload: {
  agentId: string
  groupJid: string
  groupName: string
  body: string
  mediaAssetIds: string[]
  scheduledAtISO: string
  repeat: string
  weekdays: number[]
  alsoToPrivate: boolean
  createdBy?: string | null
}): Promise<{ ok: boolean; text: string }> {
  try {
    const when = new Date(payload.scheduledAtISO)
    if (isNaN(when.getTime())) return { ok: false, text: 'La fecha/hora no era válida. Repetímela por favor.' }
    const tz = await getAgentTimezone(payload.agentId)
    await prisma.assistantScheduledPost.create({
      data: {
        agentId: payload.agentId,
        groupJid: payload.groupJid,
        groupName: payload.groupName,
        body: payload.body || null,
        mediaAssetIds: payload.mediaAssetIds,
        scheduledAt: when,
        repeat: payload.repeat || 'NONE',
        weekdays: payload.weekdays ?? [],
        alsoToPrivate: !!payload.alsoToPrivate,
        createdBy: payload.createdBy ?? null,
        status: 'PENDING',
      },
    })
    const rep = payload.repeat && payload.repeat !== 'NONE' ? ` (se repite: ${payload.repeat})` : ''
    return { ok: true, text: `Listo ✅ Programé la publicación para *${payload.groupName}* el ${formatLocal(when, tz)}${rep}.` }
  } catch (err) {
    console.error('[OWNER] createScheduledPost error:', err)
    return { ok: false, text: 'No pude programar la publicación. Probá de nuevo.' }
  }
}

/** Envía AHORA mismo al grupo (texto + adjuntos). Requiere sesión de grupos conectada. */
export async function sendGroupNow(payload: {
  agentId: string
  groupJid: string
  groupName: string
  body: string
  mediaAssetIds: string[]
}): Promise<{ ok: boolean; text: string }> {
  try {
    if (getDiamondStatus(payload.agentId).status !== 'connected') {
      return { ok: false, text: 'No pude enviar: mi conexión con los grupos no está activa en este momento. Probá en un rato.' }
    }
    // Envío COMBINADO: imagen/video con el texto como pie (los dos en uno).
    const assets = payload.mediaAssetIds.length > 0
      ? await prisma.mediaAsset.findMany({
          where: { id: { in: payload.mediaAssetIds } },
          select: { id: true, type: true, url: true, linkUrl: true, textContent: true, title: true, caption: true },
        })
      : []
    const byId = new Map(assets.map((a) => [a.id, a]))
    const ordered = payload.mediaAssetIds.map((id) => byId.get(id)).filter(Boolean) as typeof assets
    await sendCombinedToGroup(payload.agentId, payload.groupJid, (payload.body ?? '').trim(), ordered, 1200)
    return { ok: true, text: `Listo ✅ Mandé el mensaje a *${payload.groupName}* ahora mismo.` }
  } catch (err) {
    console.error('[OWNER] sendGroupNow error:', err)
    return { ok: false, text: 'Hubo un error al enviar al grupo. Puede que no haya salido; revisá el grupo.' }
  }
}

/**
 * Lista las publicaciones PENDIENTES del agente. Filtros opcionales:
 *   - `dayLocal` ("YYYY-MM-DD", hora de Bolivia): SOLO las de ESE día.
 *   - `fromLocal`/`toLocal`: rango de días [desde 00:00, hasta 00:00 del día siguiente).
 * Sin filtros: todas las pendientes.
 */
export async function listScheduledPosts(
  agentId: string,
  opts?: { dayLocal?: string; fromLocal?: string; toLocal?: string; tz?: string; limit?: number },
): Promise<Array<{ id: string; groupName: string | null; body: string | null; scheduledAt: Date; repeat: string }>> {
  const tz = opts?.tz ?? DEFAULT_TZ
  const where: Prisma.AssistantScheduledPostWhereInput = { agentId, status: 'PENDING' }

  if (opts?.dayLocal) {
    const start = wallClockToUtc(`${opts.dayLocal} 00:00`, tz)
    if (start) where.scheduledAt = { gte: start, lt: new Date(start.getTime() + 86_400_000) }
  } else if (opts?.fromLocal || opts?.toLocal) {
    const range: { gte?: Date; lt?: Date } = {}
    if (opts.fromLocal) { const s = wallClockToUtc(`${opts.fromLocal} 00:00`, tz); if (s) range.gte = s }
    if (opts.toLocal) { const e = wallClockToUtc(`${opts.toLocal} 00:00`, tz); if (e) range.lt = new Date(e.getTime() + 86_400_000) }
    if (range.gte || range.lt) where.scheduledAt = range
  }

  return prisma.assistantScheduledPost.findMany({
    where,
    select: { id: true, groupName: true, body: true, scheduledAt: true, repeat: true },
    orderBy: { scheduledAt: 'asc' },
    take: opts?.limit ?? 50,
  })
}

/** Extrae una hora "HH:MM" de un texto ("02:53", "8am", "8 pm") para desambiguar. */
function extractTimeToken(s: string): string | null {
  let m = /\b(\d{1,2}):(\d{2})\b/.exec(s)
  if (m) return `${m[1].padStart(2, '0')}:${m[2]}`
  m = /\b(\d{1,2})\s*(a\.?\s?m|p\.?\s?m|am|pm)\b/i.exec(s)
  if (m) {
    let h = parseInt(m[1], 10) % 12
    if (/p/i.test(m[2])) h += 12
    return `${String(h).padStart(2, '0')}:00`
  }
  return null
}

/**
 * Busca UNA publicación PENDIENTE que coincida con la referencia del dueño (grupo
 * y/o hora). Devuelve la coincidencia SOLO si es inequívoca; si hay varias o
 * ninguna, devuelve null (el llamador entonces lista o avisa). NUNCA elige una al
 * azar (eso causaba cancelar la publicación equivocada).
 */
export async function findScheduledPost(agentId: string, ref: string, tz = DEFAULT_TZ): Promise<{ id: string; groupName: string | null; body: string | null; scheduledAt: Date } | null> {
  const r = (ref ?? '').trim().toLowerCase()
  const posts = await prisma.assistantScheduledPost.findMany({
    where: { agentId, status: 'PENDING' },
    select: { id: true, groupName: true, body: true, scheduledAt: true },
    orderBy: { scheduledAt: 'asc' },
    take: 50,
  })
  if (posts.length === 0) return null
  if (!r) return posts.length === 1 ? posts[0] : null // vacío + varias → ambiguo

  const byId = posts.find((p) => p.id === ref || p.id.startsWith(ref))
  if (byId) return byId

  // Candidatas por nombre de grupo (en cualquier dirección) o por texto del cuerpo.
  let cands = posts.filter((p) => {
    const g = (p.groupName ?? '').toLowerCase()
    return g && (g.includes(r) || r.includes(g))
  })
  if (cands.length === 0) cands = posts.filter((p) => (p.body ?? '').toLowerCase().includes(r) && r.length >= 3)
  if (cands.length === 0) return null
  if (cands.length === 1) return cands[0]

  // Varias candidatas → desambiguar por la HORA mencionada.
  const tm = extractTimeToken(r)
  if (tm) {
    const timed = cands.filter((p) => formatLocal(p.scheduledAt, tz).includes(tm))
    if (timed.length === 1) return timed[0]
  }
  return null // sigue ambiguo → que el llamador liste y pregunte
}

/** Busca una publicación en CUALQUIER estado (para avisar si ya se envió / ya se canceló). */
export async function findAnyScheduledPost(agentId: string, ref: string, tz = DEFAULT_TZ): Promise<{ groupName: string | null; status: string; scheduledAt: Date } | null> {
  const r = (ref ?? '').trim().toLowerCase()
  if (!r) return null
  const posts = await prisma.assistantScheduledPost.findMany({
    where: { agentId },
    select: { groupName: true, status: true, scheduledAt: true, body: true },
    orderBy: { createdAt: 'desc' },
    take: 60,
  })
  const tm = extractTimeToken(r)
  const match = posts.find((p) => {
    const g = (p.groupName ?? '').toLowerCase()
    const groupOk = g && (g.includes(r) || r.includes(g))
    const bodyOk = (p.body ?? '').toLowerCase().includes(r) && r.length >= 3
    const timeOk = !tm || formatLocal(p.scheduledAt, tz).includes(tm)
    return (groupOk || bodyOk) && timeOk
  })
  return match ? { groupName: match.groupName, status: match.status, scheduledAt: match.scheduledAt } : null
}

/** Cancela una publicación programada por id. */
export async function cancelScheduledById(id: string): Promise<{ ok: boolean; text: string }> {
  try {
    const post = await prisma.assistantScheduledPost.findUnique({ where: { id }, select: { id: true, groupName: true, status: true } })
    if (!post || post.status !== 'PENDING') return { ok: false, text: 'Esa publicación ya no está programada.' }
    await prisma.assistantScheduledPost.update({ where: { id }, data: { status: 'CANCELLED' } })
    return { ok: true, text: `Listo ✅ Cancelé la publicación programada de *${post.groupName ?? 'ese grupo'}*.` }
  } catch (err) {
    console.error('[OWNER] cancelScheduledById error:', err)
    return { ok: false, text: 'No pude cancelar la publicación. Probá de nuevo.' }
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// CAMPAÑAS / DIFUSIÓN (Fase 4)
// ─────────────────────────────────────────────────────────────────────────────────

const CAMPAIGN_STATUS_ES: Record<string, string> = {
  DRAFT: 'borrador', PENDING_APPROVAL: 'pendiente de aprobar', SCHEDULED: 'programada/lista',
  SENDING: 'enviando', SENT: 'enviada', FAILED: 'fallida', CANCELLED: 'cancelada/pausada',
}

/** Lista las campañas del agente con su estado. */
export async function listCampaigns(agentId: string, limit = 30): Promise<Array<{ id: string; name: string; status: string; sentCount: number; totalTargets: number }>> {
  return prisma.assistantCampaign.findMany({
    where: { agentId },
    select: { id: true, name: true, status: true, sentCount: true, totalTargets: true },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
}

/** Busca UNA campaña por id o por nombre (exacto, luego parcial). */
export async function findCampaign(agentId: string, ref: string): Promise<{ id: string; name: string; status: DiamondCampaignStatus; messageBody: string; targetType: string; targetJson: unknown } | null> {
  const r = (ref ?? '').trim()
  if (!r) return null
  const byId = await prisma.assistantCampaign.findFirst({ where: { id: r, agentId }, select: { id: true, name: true, status: true, messageBody: true, targetType: true, targetJson: true } }).catch(() => null)
  if (byId) return byId
  const exact = await prisma.assistantCampaign.findFirst({ where: { agentId, name: { equals: r, mode: 'insensitive' } }, select: { id: true, name: true, status: true, messageBody: true, targetType: true, targetJson: true } })
  if (exact) return exact
  return prisma.assistantCampaign.findFirst({ where: { agentId, name: { contains: r, mode: 'insensitive' } }, select: { id: true, name: true, status: true, messageBody: true, targetType: true, targetJson: true }, orderBy: { createdAt: 'desc' } })
}

/** Cuenta a cuántas personas llegaría la campaña (según su audiencia). */
export async function countCampaignAudience(targetType: string, targetJson: unknown): Promise<number> {
  try {
    const rec = await resolveCampaignRecipients(targetType, targetJson)
    return rec.length
  } catch {
    return 0
  }
}

/** Lanza una campaña YA (la deja lista para que el worker la envíe en < 1 min). */
export async function launchCampaignById(id: string, approvedBy?: string | null): Promise<{ ok: boolean; text: string }> {
  try {
    const c = await prisma.assistantCampaign.findUnique({ where: { id }, select: { id: true, name: true, status: true } })
    if (!c) return { ok: false, text: 'No encontré esa campaña.' }
    if (c.status === DiamondCampaignStatus.SENDING) return { ok: false, text: `La campaña «${c.name}» ya se está enviando en este momento.` }
    const now = new Date()
    await prisma.assistantCampaign.update({
      where: { id },
      data: { status: DiamondCampaignStatus.SCHEDULED, scheduledAt: now, approvedAt: now, approvedBy: approvedBy ?? null },
    })
    return { ok: true, text: `Listo ✅ Lancé la campaña «${c.name}». Va a empezar a enviarse en menos de un minuto.` }
  } catch (err) {
    console.error('[OWNER] launchCampaignById error:', err)
    return { ok: false, text: 'No pude lanzar la campaña. Probá de nuevo.' }
  }
}

/** Pausa/cancela una campaña que todavía no terminó. */
export async function pauseCampaign(agentId: string, ref: string): Promise<{ ok: boolean; text: string }> {
  try {
    const c = await findCampaign(agentId, ref)
    if (!c) return { ok: false, text: `No encontré la campaña «${ref}».` }
    if (c.status === DiamondCampaignStatus.SENT) return { ok: false, text: `La campaña «${c.name}» ya se envió, no hay nada que pausar.` }
    if (c.status === DiamondCampaignStatus.CANCELLED) return { ok: false, text: `La campaña «${c.name}» ya estaba pausada.` }
    await prisma.assistantCampaign.update({ where: { id: c.id }, data: { status: DiamondCampaignStatus.CANCELLED } })
    return { ok: true, text: `Listo ✅ Pausé la campaña «${c.name}». No se va a enviar hasta que la vuelvas a lanzar.` }
  } catch (err) {
    console.error('[OWNER] pauseCampaign error:', err)
    return { ok: false, text: 'No pude pausar la campaña. Probá de nuevo.' }
  }
}

/** Texto legible del estado de una campaña. */
export function campaignStatusEs(status: string): string {
  return CAMPAIGN_STATUS_ES[status] ?? status
}

// ─────────────────────────────────────────────────────────────────────────────────
// CONFIGURAR A CAMILA (Fase 5)
// ─────────────────────────────────────────────────────────────────────────────────

const TONE_MARKER = '# AJUSTE DE TONO (indicado por el dueño)'

/** Ajusta el TONO/personalidad de CAMILA (afecta cómo le habla a la gente). */
export async function adjustTone(agentId: string, instruction: string): Promise<{ ok: boolean; text: string }> {
  try {
    const ins = (instruction ?? '').trim()
    if (!ins) return { ok: false, text: '¿Cómo querés que ajuste mi forma de hablar? Decímelo (ej. "más formal", "más cálida").' }
    const a = await prisma.assistantAgent.findUnique({ where: { id: agentId }, select: { personalityPrompt: true } })
    let p = a?.personalityPrompt ?? ''
    const idx = p.indexOf(TONE_MARKER)
    if (idx >= 0) p = p.slice(0, idx).trimEnd() // reemplaza el ajuste anterior
    p = `${p.trimEnd()}\n\n${TONE_MARKER}\n${ins}`.trim()
    await prisma.assistantAgent.update({ where: { id: agentId }, data: { personalityPrompt: p } })
    return { ok: true, text: 'Listo ✅ Ajusté mi tono. Desde ahora voy a hablar así con la gente.' }
  } catch (err) {
    console.error('[OWNER] adjustTone error:', err)
    return { ok: false, text: 'No pude ajustar mi tono. Probá de nuevo.' }
  }
}

/** Cambia el modo de voz: off (solo texto) | audio_in (audio si le mandan audio) | always (siempre audio). */
export async function setVoiceMode(agentId: string, mode: string): Promise<{ ok: boolean; text: string }> {
  try {
    const m = ['off', 'audio_in', 'always'].includes(mode) ? mode : ''
    if (!m) return { ok: false, text: 'Decime cómo: "sin audios", "solo cuando me manden audio" o "siempre en audio".' }
    await prisma.assistantAgent.update({ where: { id: agentId }, data: { voiceMode: m, voiceEnabled: m !== 'off' } })
    const label = m === 'always' ? 'siempre con nota de voz' : m === 'audio_in' ? 'con audio solo cuando me manden audio' : 'solo con texto (sin audios)'
    return { ok: true, text: `Listo ✅ Desde ahora voy a responder ${label}.` }
  } catch (err) {
    console.error('[OWNER] setVoiceMode error:', err)
    return { ok: false, text: 'No pude cambiar el modo de voz. Probá de nuevo.' }
  }
}

/** Activa/desactiva la bienvenida de un grupo. */
export async function toggleWelcome(agentId: string, groupRef: string, on: boolean): Promise<{ ok: boolean; text: string }> {
  try {
    const g = await resolveGroup(agentId, groupRef)
    if (!g) return { ok: false, text: `No encontré el grupo «${groupRef}».` }
    await prisma.assistantGroup.upsert({
      where: { agentId_groupJid: { agentId, groupJid: g.jid } },
      update: { welcomeEnabled: on },
      create: { agentId, groupJid: g.jid, name: g.subject, welcomeEnabled: on },
    })
    return { ok: true, text: `Listo ✅ ${on ? 'Activé' : 'Desactivé'} la bienvenida en «${g.subject}».` }
  } catch (err) {
    console.error('[OWNER] toggleWelcome error:', err)
    return { ok: false, text: 'No pude cambiar la bienvenida. Probá de nuevo.' }
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// REPORTES (Fase 6)
// ─────────────────────────────────────────────────────────────────────────────────

/** Inicio del día de HOY (en la zona) expresado en UTC. */
function startOfTodayUtc(tz: string): Date {
  const parts: Record<string, string> = {}
  for (const p of new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date())) parts[p.type] = p.value
  return wallClockToUtc(`${parts.year}-${parts.month}-${parts.day} 00:00`, tz) ?? new Date()
}

/** Reporte de actividad del día: mensajes, contactos nuevos, próximas programaciones. */
export async function activityReport(agentId: string): Promise<string> {
  try {
    const tz = await getAgentTimezone(agentId)
    const start = startOfTodayUtc(tz)
    const [msgsIn, msgsOut, newContacts, pendingPosts, activeCampaigns, nextPost] = await Promise.all([
      prisma.assistantMessageLog.count({ where: { agentId, direction: 'IN', createdAt: { gte: start } } }),
      prisma.assistantMessageLog.count({ where: { agentId, direction: 'OUT', createdAt: { gte: start } } }),
      prisma.contact.count({ where: { organizationId: null, createdAt: { gte: start } } }),
      prisma.assistantScheduledPost.count({ where: { agentId, status: 'PENDING' } }),
      prisma.assistantCampaign.count({ where: { agentId, status: { in: [DiamondCampaignStatus.SENDING, DiamondCampaignStatus.SCHEDULED] } } }),
      prisma.assistantScheduledPost.findFirst({ where: { agentId, status: 'PENDING' }, orderBy: { scheduledAt: 'asc' }, select: { groupName: true, scheduledAt: true } }),
    ])
    const lines = [
      '📊 *Resumen de hoy*',
      `• Mensajes recibidos: ${msgsIn}`,
      `• Respuestas enviadas: ${msgsOut}`,
      `• Contactos nuevos: ${newContacts}`,
      `• Publicaciones programadas pendientes: ${pendingPosts}`,
      `• Campañas activas: ${activeCampaigns}`,
    ]
    if (nextPost) lines.push(`• Próxima publicación: ${nextPost.groupName ?? 'grupo'} — ${formatLocal(nextPost.scheduledAt, tz)}`)
    return lines.join('\n')
  } catch (err) {
    console.error('[OWNER] activityReport error:', err)
    return 'No pude armar el reporte ahora. Probá de nuevo en un momento.'
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// EJECUCIÓN de una acción pendiente (tras el "aprobado")
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Ejecuta la acción que estaba pendiente de aprobación. Devuelve el texto para el
 * dueño. Se apoya SOLO en el `payload` guardado (no en el modelo), así la ejecución
 * es determinista. Cada `actionType` se resuelve con su ejecutor.
 */
export async function executePending(action: { actionType: string; payload: unknown }): Promise<string> {
  const p = (action.payload ?? {}) as Record<string, unknown>
  switch (action.actionType) {
    case 'DELETE_MEDIA': {
      const id = String(p.id ?? '')
      const r = await deleteLibraryAssetById(id)
      return r.text
    }
    case 'DELETE_KNOWLEDGE': {
      const id = String(p.id ?? '')
      const r = await deleteKnowledgeById(id)
      return r.text
    }
    case 'SCHEDULE_POST': {
      const r = await createScheduledPost({
        agentId: String(p.agentId ?? ''),
        groupJid: String(p.groupJid ?? ''),
        groupName: String(p.groupName ?? ''),
        body: String(p.body ?? ''),
        mediaAssetIds: Array.isArray(p.mediaAssetIds) ? (p.mediaAssetIds as string[]) : [],
        scheduledAtISO: String(p.scheduledAtISO ?? ''),
        repeat: String(p.repeat ?? 'NONE'),
        weekdays: Array.isArray(p.weekdays) ? (p.weekdays as number[]) : [],
        alsoToPrivate: !!p.alsoToPrivate,
        createdBy: (p.createdBy as string | null) ?? null,
      })
      return r.text
    }
    case 'SEND_NOW': {
      const r = await sendGroupNow({
        agentId: String(p.agentId ?? ''),
        groupJid: String(p.groupJid ?? ''),
        groupName: String(p.groupName ?? ''),
        body: String(p.body ?? ''),
        mediaAssetIds: Array.isArray(p.mediaAssetIds) ? (p.mediaAssetIds as string[]) : [],
      })
      return r.text
    }
    case 'CANCEL_SCHEDULED': {
      const r = await cancelScheduledById(String(p.id ?? ''))
      return r.text
    }
    case 'LAUNCH_CAMPAIGN': {
      const r = await launchCampaignById(String(p.id ?? ''), (p.approvedBy as string | null) ?? null)
      return r.text
    }
    default:
      return 'No pude ejecutar esa acción (tipo desconocido).'
  }
}
