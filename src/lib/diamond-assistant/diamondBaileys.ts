/**
 * Diamond Assistant — Motor de WhatsApp AISLADO (FASE 5)
 *
 * Este módulo es una CLONA del patrón de conexión de `src/lib/baileys-manager.ts`
 * (makeWASocket + useMultiFileAuthState + fetchLatestBaileysVersion + QR +
 * reconexión), pero COMPLETAMENTE SEPARADO:
 *   - Tiene su PROPIO `Map` de conexiones (nunca comparte con los bots en vivo).
 *   - Guarda la sesión en su PROPIA carpeta: <BASE>/diamond/<agentId>.
 *   - La clave del `Map` es el `agentId` (no el botId).
 *
 * De esta forma jamás interfiere con `baileys-manager` (bots de venta / reto90d),
 * que siguen corriendo en vivo con sus propias conexiones y su propia carpeta.
 *
 * API pública (consumida por otras capas del asistente):
 *   getDiamondStatus / connectDiamond / disconnectDiamond
 *   sendDiamondText / sendDiamondMedia / listDiamondGroups
 */

import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  type WASocket,
  type proto,
  type AnyMessageContent,
} from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import path from 'path'
import fs from 'fs'
import { toDataURL } from 'qrcode'
import { prisma } from '@/lib/prisma'

// ── Tipos ────────────────────────────────────────────────────────────────────

export type DiamondStatus = 'disconnected' | 'connecting' | 'qr_ready' | 'connected'

/** Asset mínimo que sabe enviar `sendDiamondMedia`. */
export interface DiamondMediaInput {
  type: string
  url?: string | null
  linkUrl?: string | null
  textContent?: string | null
  title?: string
  /**
   * Pie de foto/video (lo que se MANDA junto a la imagen). Si se define (incluso
   * como cadena vacía) MANDA sobre `title`: `''` = SIN pie. Si queda `undefined`,
   * se usa `title` (compatibilidad con el flujo del agente).
   */
  caption?: string
}

interface DiamondConnection {
  status: DiamondStatus
  qrBase64?: string
  phone?: string
  sock?: WASocket
  agentId: string
  /** Agenda: jid → nombre conocido (contactos sincronizados + pushNames vistos). */
  contacts: Map<string, string>
}

// ── Store en memoria (global para sobrevivir el HMR de Next.js) ───────────────
declare global {
  // eslint-disable-next-line no-var
  var __diamond_baileys_connections: Map<string, DiamondConnection> | undefined
}

const connections: Map<string, DiamondConnection> =
  global.__diamond_baileys_connections ?? (global.__diamond_baileys_connections = new Map())

// Misma BASE que baileys-manager, pero en su propia sub-carpeta 'diamond'.
// Así las sesiones del motor Diamond nunca colisionan con las de los bots vivos.
const SESSIONS_BASE = process.env.BAILEYS_SESSIONS_DIR || path.join(process.cwd(), 'baileys-sessions')
const DIAMOND_SESSIONS_DIR = path.join(SESSIONS_BASE, 'diamond')

function sessionDirFor(agentId: string): string {
  return path.join(DIAMOND_SESSIONS_DIR, agentId)
}

// eslint-disable-next-line @typescript-eslint/no-var-requires
const silentPino = () => require('pino')({ level: 'silent' })

/** Normaliza cualquier destino a un JID válido de WhatsApp. */
function normalizeJid(jidOrPhone: string): string {
  if (jidOrPhone.includes('@')) return jidOrPhone
  const digits = jidOrPhone.replace(/[^\d]/g, '')
  return `${digits}@s.whatsapp.net`
}

/** Devuelve el socket SOLO si la conexión existe y está realmente `connected`. */
function getConnectedSock(agentId: string): WASocket | null {
  const conn = connections.get(agentId)
  if (!conn?.sock || conn.status !== 'connected') return null
  return conn.sock
}

// ── API pública ───────────────────────────────────────────────────────────────

export function getDiamondStatus(agentId: string): {
  status: DiamondStatus
  qrBase64?: string
  phone?: string
} {
  const conn = connections.get(agentId)
  if (!conn) return { status: 'disconnected' }
  return { status: conn.status, qrBase64: conn.qrBase64, phone: conn.phone }
}

export async function connectDiamond(
  agentId: string,
  opts: { forceFresh?: boolean } = {},
): Promise<void> {
  const existing = connections.get(agentId)
  // Ya conectado → no tocar nunca.
  if (existing?.status === 'connected') return
  // Intento en curso (sin forceFresh) → no duplicar.
  if (!opts.forceFresh && (existing?.status === 'connecting' || existing?.status === 'qr_ready')) return

  const sessionDir = sessionDirFor(agentId)

  // forceFresh = el usuario pidió un QR nuevo. Matar cualquier socket atascado y
  // BORRAR la sesión del disco (Baileys solo emite QR si NO hay credenciales).
  if (opts.forceFresh) {
    if (existing?.sock) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      try { (existing.sock as any).end?.(undefined) } catch { /* noop */ }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      try { (existing.sock as any).ws?.close?.() } catch { /* noop */ }
    }
    connections.delete(agentId)
    try { if (fs.existsSync(sessionDir)) fs.rmSync(sessionDir, { recursive: true, force: true }) } catch { /* noop */ }
  }

  if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir, { recursive: true })

  const conn: DiamondConnection = { status: 'connecting', agentId, contacts: new Map() }
  connections.set(agentId, conn)

  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { state, saveCreds } = await useMultiFileAuthState(sessionDir)

    let version: [number, number, number]
    try {
      const result = await fetchLatestBaileysVersion()
      version = result.version as [number, number, number]
    } catch {
      version = [2, 3000, 1015901307]
    }

    const sock = makeWASocket({
      version,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, silentPino()),
      },
      logger: silentPino(),
      browser: ['Ubuntu', 'Chrome', '120.0.0'],
      syncFullHistory: false,
      markOnlineOnConnect: false,
      keepAliveIntervalMs: 30_000,
      connectTimeoutMs: 60_000,
      retryRequestDelayMs: 2_000,
    })

    conn.sock = sock
    sock.ev.on('creds.update', saveCreds)

    // Agenda de nombres: WhatsApp sincroniza los contactos y pushNames conocidos al
    // vincular el dispositivo. Los guardamos para poder saludar por NOMBRE a quien
    // entra a un grupo (si es un contacto conocido), SIN esperar a que escriba.
    const rememberContact = (jid?: string | null, name?: string | null) => {
      const j = (jid ?? '').trim()
      const n = (name ?? '').trim()
      if (j && n) conn.contacts.set(j, n)
    }
    type ContactRow = { id?: string | null; name?: string | null; notify?: string | null; verifiedName?: string | null }
    const rememberRows = (rows: ContactRow[] = []) => {
      for (const c of rows) rememberContact(c.id, c.name || c.notify || c.verifiedName)
    }
    sock.ev.on('contacts.upsert', (rows) => rememberRows(rows as ContactRow[]))
    sock.ev.on('contacts.update', (rows) => rememberRows(rows as ContactRow[]))
    sock.ev.on('messaging-history.set', ({ contacts }) => rememberRows((contacts ?? []) as ContactRow[]))

    sock.ev.on('connection.update', async update => {
      const { connection, qr } = update
      if (qr) {
        try { conn.qrBase64 = await toDataURL(qr) } catch { /* noop */ }
        conn.status = 'qr_ready'
      }
      if (connection === 'open') {
        conn.status = 'connected'
        conn.qrBase64 = undefined
        conn.phone = sock.user?.id?.split(':')[0] ?? ''
      }
      if (connection === 'close') {
        const statusCode = new Boom(update.lastDisconnect?.error)?.output?.statusCode
        conn.status = 'disconnected'
        connections.delete(agentId)
        console.log(`[DIAMOND] Conexión cerrada agente ${agentId} — statusCode=${statusCode}`)

        // SOLO borramos la sesión en un logout REAL (401). Cualquier otra causa
        // (reemplazo de conexión, caída de red, etc.) NO borra las credenciales:
        // intentamos reconectar, así no hay que re-escanear el QR por algo temporal.
        if (statusCode === DisconnectReason.loggedOut) {
          try { if (fs.existsSync(sessionDir)) fs.rmSync(sessionDir, { recursive: true, force: true }) } catch { /* noop */ }
          console.log(`[DIAMOND] Agente ${agentId} DESLOGUEADO por WhatsApp (401) — sesión borrada, hay que re-escanear el QR`)
        } else {
          // Reconectar: más espaciado si fue "conexión reemplazada" (440), solo si sigue activo.
          const delayMs = statusCode === DisconnectReason.connectionReplaced ? 30_000 : 5000
          setTimeout(async () => {
            try {
              const agent = await prisma.assistantAgent.findUnique({
                where: { id: agentId },
                select: { isActive: true },
              })
              if (!agent || !agent.isActive) {
                console.log(`[DIAMOND] Agente ${agentId} inactivo/eliminado — no se reconecta`)
                return
              }
              connectDiamond(agentId).catch(err =>
                console.error(`[DIAMOND] reconexión fallida agentId=${agentId}:`, err),
              )
            } catch (err) {
              console.error(`[DIAMOND] error verificando isActive antes de reconectar (${agentId}):`, err)
            }
          }, delayMs)
        }
      }
    })

    // Mensajes entrantes → IA. Todo envuelto en try/catch: NUNCA lanzar al handler.
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return
      for (const msg of messages) {
        if (msg.key?.fromMe) continue
        if (msg.key?.remoteJid === 'status@broadcast') continue
        // Recordar el nombre de perfil (pushName) del remitente para la agenda.
        const senderJid = msg.key?.participant || msg.key?.remoteJid
        if (senderJid && !senderJid.endsWith('@g.us') && msg.pushName) {
          rememberContact(senderJid, msg.pushName)
        }
        // En GRUPOS: guardar al remitente en Contactos con su número REAL (al escribir,
        // el mapeo LID↔número ya está disponible, así se resuelve bien).
        if (msg.key?.remoteJid?.endsWith('@g.us') && msg.key?.participant) {
          try {
            const { upsertGroupContact } = await import('./welcome')
            await upsertGroupContact(agentId, msg.key.participant, msg.key.remoteJid)
          } catch { /* noop */ }
        }
        try {
          const { handleDiamondInbound } = await import('./diamondInbound')
          await handleDiamondInbound(agentId, msg)
        } catch (err) {
          console.error(`[DIAMOND] inbound error agentId=${agentId}:`, err)
        }
      }
    })

    // Nuevos miembros de grupo → bienvenida. try/catch por participante.
    sock.ev.on('group-participants.update', async update => {
      if (update.action !== 'add') return
      const groupJid = update.id
      const partIds = (update.participants ?? []).map((p): string => (typeof p === 'string' ? p : (p as { id?: string })?.id ?? ''))
      console.log(`[DIAMOND] Nuevos miembros en grupo ${groupJid}: ${partIds.filter(Boolean).join(', ')}`)
      const selfPhone = (sock.user?.id ?? '').split('@')[0].split(':')[0].replace(/[^\d]/g, '')
      let idx = 0
      for (const participant of update.participants ?? []) {
        // `participants` es GroupParticipant[] (extiende Contact): el JID está en `.id`.
        const participantJid = typeof participant === 'string' ? participant : participant?.id
        if (!participantJid) continue
        // No procesar al propio bot cuando lo agregan al grupo.
        const pPhone = participantJid.split('@')[0].split(':')[0].replace(/[^\d]/g, '')
        if (pPhone && pPhone === selfPhone) continue
        const i = idx++

        // 1) Alta en Contactos (inmediata, pasiva).
        import('./welcome')
          .then(m => m.upsertGroupContact(agentId, participantJid, groupJid))
          .catch(err => console.error(`[DIAMOND] contacto error grupo=${groupJid}:`, err))

        // 2) Bienvenida al GRUPO: 5s DESPUÉS de agregarlo (más humano, no instantáneo).
        //    Pequeño escalonado por persona si entran varios de golpe.
        setTimeout(() => {
          import('./welcome')
            .then(m => m.handleGroupWelcome(agentId, groupJid, participantJid))
            .catch(err => console.error(`[DIAMOND] welcome grupo error grupo=${groupJid}:`, err))
        }, 5000 + i * 3000)

        // 3) Bienvenida al PRIVADO (solo si el grupo la tiene habilitada): más tarde y
        //    con más pausa entre personas (anti-baneo del 1:1).
        setTimeout(() => {
          import('./welcome')
            .then(m => m.handlePrivateWelcome(agentId, participantJid, groupJid))
            .catch(err => console.error(`[DIAMOND] welcome privado error grupo=${groupJid}:`, err))
        }, 12000 + i * 6000)
      }
    })
  } catch (err) {
    console.error(`[DIAMOND] Error al iniciar conexión para agente ${agentId}:`, err)
    connections.delete(agentId)
  }
}

export function disconnectDiamond(agentId: string): void {
  const conn = connections.get(agentId)
  if (conn?.sock) {
    // logout cierra la sesión del lado de WhatsApp; si falla, igual limpiamos local.
    conn.sock.logout().catch(() => { /* noop */ })
  }
  connections.delete(agentId)
  const sessionDir = sessionDirFor(agentId)
  try { if (fs.existsSync(sessionDir)) fs.rmSync(sessionDir, { recursive: true, force: true }) } catch { /* noop */ }
}

/** Marca un mensaje entrante como leído (doble tilde azul). */
export async function markDiamondRead(agentId: string, key: proto.IMessageKey): Promise<void> {
  const sock = getConnectedSock(agentId)
  if (!sock) return
  try { await sock.readMessages([key]) } catch { /* noop */ }
}

/** Envía una NOTA DE VOZ (ptt) por Baileys. `false` si no está conectado o falla. */
export async function sendDiamondVoice(agentId: string, jidOrPhone: string, url: string): Promise<boolean> {
  const sock = getConnectedSock(agentId)
  if (!sock || !url) return false
  try {
    await sock.sendMessage(normalizeJid(jidOrPhone), {
      audio: { url },
      ptt: true,
      mimetype: 'audio/ogg; codecs=opus',
    })
    return true
  } catch (err) {
    console.error(`[DIAMOND] sendDiamondVoice error agentId=${agentId}:`, err)
    return false
  }
}

/**
 * Resuelve un JID al NÚMERO de teléfono real (solo dígitos). Si el JID es un LID
 * (`@lid`, identificador interno/privado de WhatsApp), intenta traducirlo con el
 * mapeo LID↔número de Baileys. Devuelve null si no se puede resolver (p. ej. el
 * LID todavía no está sincronizado, o WhatsApp oculta el número).
 */
export async function resolvePhoneNumber(
  agentId: string,
  jid: string,
  groupJid?: string,
): Promise<string | null> {
  if (!jid) return null
  const onlyDigits = (s: string) => s.split('@')[0].split(':')[0].replace(/[^\d]/g, '')

  if (jid.endsWith('@s.whatsapp.net') || jid.endsWith('@c.us')) {
    const d = onlyDigits(jid)
    return d.length >= 7 ? d : null
  }

  if (jid.endsWith('@lid')) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sock = connections.get(agentId)?.sock as any
    if (!sock) return null

    // 1) Mapeo LID↔número en memoria (rápido).
    try {
      const pn: unknown = await sock.signalRepository?.lidMapping?.getPNForLID?.(jid)
      if (typeof pn === 'string') {
        const d = onlyDigits(pn)
        if (d.length >= 7) return d
      }
    } catch { /* seguimos con el fallback */ }

    // 2) Datos del grupo: cada participante trae `phoneNumber` (número real).
    if (groupJid) {
      try {
        const meta = await sock.groupMetadata(groupJid)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const part = (meta?.participants ?? []).find((p: any) => p?.id === jid || p?.lid === jid)
        const pn = part?.phoneNumber
        if (typeof pn === 'string') {
          const d = onlyDigits(pn)
          if (d.length >= 7) return d
        }
      } catch { /* no se pudo obtener metadata */ }
    }
    return null
  }

  const d = onlyDigits(jid)
  return d.length >= 7 ? d : null
}

/**
 * Nombre conocido de un contacto (de la agenda sincronizada o de un pushName ya
 * visto), o null si no lo tenemos. Prueba el jid exacto y también por número.
 */
export function getDiamondContactName(agentId: string, jid: string): string | null {
  const conn = connections.get(agentId)
  if (!conn?.contacts) return null
  const direct = conn.contacts.get(jid)?.trim()
  if (direct) return direct
  const digits = jid.replace(/[^\d]/g, '')
  if (digits) {
    const byNumber = conn.contacts.get(`${digits}@s.whatsapp.net`)?.trim()
    if (byNumber) return byNumber
  }
  return null
}

/**
 * Importa a Contactos TODOS los miembros actuales de un grupo (o de todos los
 * grupos gestionables si no se pasa `groupJid`), usando su NÚMERO REAL
 * (`phoneNumber` de los datos del grupo). Idempotente: no duplica y completa el
 * nombre si faltaba. Devuelve un resumen.
 */
export async function importGroupMembers(
  agentId: string,
  groupJid?: string,
): Promise<{ groups: number; added: number; skipped: number }> {
  const sock = getConnectedSock(agentId)
  if (!sock) return { groups: 0, added: 0, skipped: 0 }

  const selfPhone = (sock.user?.id ?? '').split('@')[0].split(':')[0].replace(/[^\d]/g, '')

  let targets: string[] = []
  if (groupJid) {
    targets = [groupJid]
  } else {
    try {
      const groups = await listDiamondGroups(agentId)
      targets = groups.map(g => g.id)
    } catch { targets = [] }
  }

  let added = 0
  let skipped = 0
  let groupsDone = 0

  for (const gj of targets) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const meta: any = await sock.groupMetadata(gj)
      const subject: string | undefined = meta?.subject
      for (const p of meta?.participants ?? []) {
        const raw: string =
          p?.phoneNumber || (typeof p?.id === 'string' && p.id.endsWith('@s.whatsapp.net') ? p.id : '')
        const phone = String(raw).split('@')[0].split(':')[0].replace(/[^\d]/g, '')
        if (!phone || phone.length < 7 || phone === selfPhone) { skipped++; continue }
        const name = String(p?.notify || p?.name || p?.verifiedName || '').trim() || null
        try {
          const existing = await prisma.contact.findFirst({
            where: { organizationId: null, phone },
            select: { id: true, name: true },
          })
          if (existing) {
            if (name && !existing.name) {
              await prisma.contact.update({ where: { id: existing.id }, data: { name } })
            }
            continue
          }
          await prisma.contact.create({
            data: {
              organizationId: null,
              name,
              phone,
              status: 'ACTIVE',
              optIn: true,
              optInAt: new Date(),
              notes: subject ? `Miembro del grupo: ${subject}` : 'Miembro de un grupo',
            },
          })
          added++
        } catch { skipped++ }
      }
      groupsDone++
    } catch (err) {
      console.error(`[DIAMOND] importGroupMembers error grupo=${gj}:`, err)
    }
  }

  console.log(`[DIAMOND] Import miembros: ${groupsDone} grupo(s), ${added} agregados, ${skipped} omitidos`)
  return { groups: groupsDone, added, skipped }
}

/**
 * Reconecta las sesiones Diamond ya autenticadas (guardadas en disco). Se llama
 * al ARRANCAR (para revivir tras un reinicio/deploy) y en un health-check
 * periódico. Solo reconecta carpetas con `creds.json` (sesión escaneada), así
 * NUNCA abre un QR sin que nadie lo mire. `onlyDown` → solo las que están caídas.
 * Devuelve cuántas disparó a reconectar.
 */
export async function reconnectSavedDiamondSessions(onlyDown = false): Promise<number> {
  try {
    if (!fs.existsSync(DIAMOND_SESSIONS_DIR)) return 0
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    const entries = fs
      .readdirSync(DIAMOND_SESSIONS_DIR, { withFileTypes: true })
      .filter((e) => e.isDirectory() && UUID_RE.test(e.name))
    let n = 0
    for (const e of entries) {
      const agentId = e.name
      if (!fs.existsSync(path.join(DIAMOND_SESSIONS_DIR, agentId, 'creds.json'))) continue
      if (onlyDown) {
        const st = getDiamondStatus(agentId)
        if (st.status === 'connected' || st.status === 'connecting' || st.status === 'qr_ready') continue
      }
      connectDiamond(agentId).catch((err) =>
        console.error(`[DIAMOND] reconexión falló agentId=${agentId}:`, err),
      )
      n++
    }
    return n
  } catch (err) {
    console.error('[DIAMOND] reconnectSavedDiamondSessions error:', err)
    return 0
  }
}

export async function sendDiamondText(agentId: string, jid: string, text: string): Promise<boolean> {
  const sock = getConnectedSock(agentId)
  if (!sock) return false
  const body = (text ?? '').trim()
  if (!body) return false
  try {
    await sock.sendMessage(normalizeJid(jid), { text: body })
    return true
  } catch (err) {
    console.error(`[DIAMOND] sendDiamondText error agentId=${agentId}:`, err)
    return false
  }
}

export async function sendDiamondMedia(
  agentId: string,
  jid: string,
  asset: DiamondMediaInput,
): Promise<boolean> {
  const sock = getConnectedSock(agentId)
  if (!sock) return false

  const to = normalizeJid(jid)
  const type = (asset.type || '').toUpperCase()
  const url = asset.url ?? undefined
  const link = asset.linkUrl ?? asset.url ?? undefined
  const title = asset.title?.trim() || ''
  // Pie de foto/video: si `caption` viene definido (aunque sea ''), manda; si no, cae a `title`.
  const caption = (asset.caption !== undefined ? asset.caption : title).trim()

  let content: AnyMessageContent | null = null

  switch (type) {
    case 'IMAGE':
      if (url) content = { image: { url }, ...(caption ? { caption } : {}) }
      break
    case 'VIDEO':
      if (url) content = { video: { url }, ...(caption ? { caption } : {}) }
      break
    case 'AUDIO':
      if (url) content = { audio: { url }, mimetype: 'audio/mp4' }
      break
    case 'PDF':
      if (url) {
        content = {
          document: { url },
          fileName: title ? (title.toLowerCase().endsWith('.pdf') ? title : `${title}.pdf`) : 'documento.pdf',
          mimetype: 'application/pdf',
        }
      }
      break
    case 'LINK': {
      const parts: string[] = []
      if (asset.textContent?.trim()) parts.push(asset.textContent.trim())
      if (link) parts.push(link)
      const body = parts.join('\n').trim()
      if (body) content = { text: body }
      break
    }
    case 'TEXT': {
      const body = (asset.textContent ?? title).trim()
      if (body) content = { text: body }
      break
    }
    default:
      content = null
  }

  if (!content) {
    console.warn(`[DIAMOND] sendDiamondMedia: asset no enviable (type=${asset.type}) agentId=${agentId}`)
    return false
  }

  try {
    await sock.sendMessage(to, content)
    return true
  } catch (err) {
    console.error(`[DIAMOND] sendDiamondMedia error agentId=${agentId} type=${type}:`, err)
    return false
  }
}

/** Recurso a enviar combinado (subconjunto de MediaAsset). */
export interface GroupSendAsset {
  type: string
  url?: string | null
  linkUrl?: string | null
  textContent?: string | null
  title?: string
  caption?: string | null
}

/**
 * Envía a un grupo COMBINANDO el texto con la PRIMERA imagen/video en UN solo
 * mensaje: la imagen/video va PRIMERO y el texto viaja como PIE de foto ("los dos
 * en uno"). El resto de recursos va después. Si no hay imagen/video, manda el
 * texto y luego los adjuntos. Cada envío está protegido (si uno falla, sigue).
 *
 * Es el MISMO criterio que la bienvenida: nunca separa una imagen de su texto.
 */
export async function sendCombinedToGroup(
  agentId: string,
  jid: string,
  body: string,
  assets: GroupSendAsset[],
  throttleMs = 1200,
): Promise<void> {
  const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))
  const text = (body ?? '').trim()

  const isVisual = (t: string) => {
    const u = (t || '').toUpperCase()
    return u === 'IMAGE' || u === 'VIDEO'
  }
  const carrierIdx = assets.findIndex((a) => isVisual(a.type))

  const sendOne = async (a: GroupSendAsset, caption: string) => {
    try {
      await sendDiamondMedia(agentId, jid, {
        type: a.type, url: a.url, linkUrl: a.linkUrl, textContent: a.textContent,
        title: a.title, caption,
      })
    } catch (err) {
      console.error(`[DIAMOND] sendCombinedToGroup media error agentId=${agentId}:`, err)
    }
  }

  // Sin imagen/video: texto y luego adjuntos (pdf/audio/enlace) con su propia descripción.
  if (carrierIdx < 0) {
    if (text) {
      try { await sendDiamondText(agentId, jid, text) } catch (err) { console.error('[DIAMOND] sendCombinedToGroup text error:', err) }
    }
    for (const a of assets) {
      await sleep(throttleMs)
      await sendOne(a, (a.caption ?? '').trim())
    }
    return
  }

  // Con imagen/video: la portadora PRIMERO con el texto (o su propia descripción) como pie.
  const carrier = assets[carrierIdx]
  await sendOne(carrier, text || (carrier.caption ?? '').trim())
  for (let i = 0; i < assets.length; i++) {
    if (i === carrierIdx) continue
    await sleep(throttleMs)
    await sendOne(assets[i], (assets[i].caption ?? '').trim())
  }
}

export async function listDiamondGroups(
  agentId: string,
): Promise<{ id: string; subject: string; size?: number }[]> {
  const sock = getConnectedSock(agentId)
  if (!sock) return []
  try {
    const groups = await sock.groupFetchAllParticipating()
    return Object.values(groups || {}).map(g => ({
      id: g.id,
      subject: g.subject || g.id,
      size: g.size ?? g.participants?.length,
    }))
  } catch (err) {
    console.error(`[DIAMOND] listDiamondGroups error agentId=${agentId}:`, err)
    return []
  }
}

/** Reexport del tipo de mensaje de Baileys para consumidores internos. */
export type DiamondInboundMessage = proto.IWebMessageInfo
