/**
 * Baileys Manager — Singleton que gestiona múltiples conexiones WhatsApp Web.
 * Una conexión por botId. Sesión guardada en disco + backup en Supabase.
 *
 * Basado en la arquitectura de METO APP, adaptado de Prisma a Supabase.
 */

import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  WASocket,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  downloadMediaMessage,
  WAMessage,
} from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import path from 'path'
import fs from 'fs'
import QRCode from 'qrcode'
import pino from 'pino'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { transcribeAudio, analyzeImage, chat } from '@/lib/openai'
import {
  buildSystemPrompt,
  detectIdentifiedProduct,
  enforceCharLimits,
  extractSentUrls,
  parseChatHistory,
} from './ai-engine'

// ── Config ──────────────────────────────────────────────────────────────────────

const SESSIONS_DIR = process.env.WHATSAPP_SESSIONS_DIR || '/var/data/baileys-sessions'
const MAX_RETRIES = 15
const RECONNECT_DELAY = 5_000
const BUFFER_DELAY_MS = 15_000
const MAX_HISTORY = 10
const baileysLogger = pino({ level: 'silent' })
const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms))

// ── Types ──────────────────────────────────────────────────────────────────────

interface BaileysConnection {
  socket: WASocket | null
  status: 'disconnected' | 'connecting' | 'qr_ready' | 'connected'
  qrCode: string | null
  phoneNumber: string | null
  retryCount: number
}

interface BufferedMsg {
  content: string
  type: string
  timestamp: number
}

// ── Singleton ──────────────────────────────────────────────────────────────────

const globalForWa = globalThis as typeof globalThis & {
  waManager: WhatsAppManager | undefined
}

// ── Helpers: DB ────────────────────────────────────────────────────────────────

async function getBot(botId: string) {
  const supabase = await createServiceRoleClient()
  const { data } = await supabase.from('bots').select('*, bot_prompts(*)').eq('id', botId).single()
  return data
}

async function findOrCreateContact(phone: string, pushName: string, tenantId: string, botId: string) {
  const supabase = await createServiceRoleClient()
  const { data: existing } = await supabase
    .from('contacts')
    .select('*')
    .eq('phone', phone)
    .eq('bot_id', botId)
    .maybeSingle()

  if (existing) {
    if (pushName && pushName !== existing.push_name) {
      await supabase.from('contacts').update({ push_name: pushName }).eq('id', existing.id)
    }
    return existing
  }

  const { data: created } = await supabase
    .from('contacts')
    .insert({ phone, push_name: pushName, name: pushName || phone, tenant_id: tenantId, bot_id: botId })
    .select()
    .single()
  return created
}

async function findOrCreateConversation(botId: string, contactId: string) {
  const supabase = await createServiceRoleClient()
  const { data: existing } = await supabase
    .from('conversations')
    .select('*')
    .eq('bot_id', botId)
    .eq('contact_id', contactId)
    .in('status', ['active', 'paused', 'closed', 'pending_followup'])
    .order('created_at', { ascending: false })
    .maybeSingle()

  if (existing) return existing

  const { data: created } = await supabase
    .from('conversations')
    .insert({ bot_id: botId, contact_id: contactId, status: 'active' })
    .select()
    .single()
  return created
}

async function saveMessage(conversationId: string, sender: 'bot' | 'client', type: string, content: string) {
  const supabase = await createServiceRoleClient()
  await supabase.from('messages').insert({
    conversation_id: conversationId,
    sender,
    type,
    content,
  })
  await supabase
    .from('conversations')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', conversationId)
}

// ── Helpers: Credentials Backup ────────────────────────────────────────────────

async function backupCredentialsToDb(botId: string): Promise<void> {
  const sessionDir = path.join(SESSIONS_DIR, botId)
  if (!fs.existsSync(sessionDir)) return
  try {
    const files: Record<string, string> = {}
    for (const entry of fs.readdirSync(sessionDir)) {
      const filePath = path.join(sessionDir, entry)
      if (fs.statSync(filePath).isFile() && entry.endsWith('.json')) {
        files[entry] = fs.readFileSync(filePath, 'utf-8')
      }
    }
    if (Object.keys(files).length === 0) return
    const supabase = await createServiceRoleClient()
    await supabase.from('whatsapp_sessions').update({ credentials_backup: files }).eq('bot_id', botId)
    console.log(`[BAILEYS] Credentials backed up for bot ${botId}`)
  } catch (err) {
    console.error(`[BAILEYS] Backup error for ${botId}:`, err)
  }
}

async function restoreCredentialsFromDb(botId: string): Promise<boolean> {
  const sessionDir = path.join(SESSIONS_DIR, botId)
  try {
    const supabase = await createServiceRoleClient()
    const { data } = await supabase
      .from('whatsapp_sessions')
      .select('credentials_backup, status')
      .eq('bot_id', botId)
      .maybeSingle()

    // CRÍTICO: solo restaurar si el último estado en DB fue 'connected'.
    // Si el bot está disconnected/qr_ready/otro, las creds pueden ser stale
    // y Baileys se colgaría intentando usarlas (nunca emite QR).
    if (data?.status !== 'connected') {
      console.log(`[BAILEYS] Skip restore for ${botId}: last DB status="${data?.status ?? 'none'}" (no prior connected session)`)
      return false
    }

    if (!data?.credentials_backup || typeof data.credentials_backup !== 'object') return false
    const files = data.credentials_backup as Record<string, string>
    if (!files['creds.json']) return false

    fs.mkdirSync(sessionDir, { recursive: true })
    for (const [name, content] of Object.entries(files)) {
      fs.writeFileSync(path.join(sessionDir, name), content, 'utf-8')
    }
    console.log(`[BAILEYS] Credentials restored from DB for bot ${botId}`)
    return true
  } catch (err) {
    console.error(`[BAILEYS] Restore error for ${botId}:`, err)
    return false
  }
}

/** Limpia la sesión local si existe (fuerza QR nuevo) */
function cleanLocalSession(botId: string): void {
  const sessionDir = path.join(SESSIONS_DIR, botId)
  if (fs.existsSync(sessionDir)) {
    try {
      fs.rmSync(sessionDir, { recursive: true, force: true })
      console.log(`[BAILEYS] Local session cleaned for ${botId}`)
    } catch (err) {
      console.error(`[BAILEYS] Error cleaning session for ${botId}:`, err)
    }
  }
}

// ── Utility ────────────────────────────────────────────────────────────────────

function phoneFromJid(jid: string): string {
  return jid.replace(/@.*$/, '')
}

// ── WhatsApp Manager Class ─────────────────────────────────────────────────────

class WhatsAppManager {
  private connections = new Map<string, BaileysConnection>()
  private messageBuffers = new Map<string, BufferedMsg[]>()
  private processingKeys = new Set<string>()
  private processedMessageIds = new Set<string>()

  // ── Connect ──
  async connect(botId: string): Promise<{ status: string; qrCode?: string; phone?: string }> {
    const existing = this.connections.get(botId)
    if (existing?.status === 'connected') {
      return { status: 'connected', phone: existing.phoneNumber || undefined }
    }

    // Kill any existing socket
    if (existing?.socket) {
      try { (existing.socket.ev as any).removeAllListeners(); (existing.socket as any).end() } catch { /* ignore */ }
      existing.socket = null
    }

    // Consultar último estado en DB ANTES de modificar nada
    const supabase = await createServiceRoleClient()
    const { data: dbSession } = await supabase
      .from('whatsapp_sessions')
      .select('status')
      .eq('bot_id', botId)
      .maybeSingle()

    const wasConnected = dbSession?.status === 'connected'

    // Si NO estaba conectado previamente → limpiar sesión local stale.
    // Esto garantiza que Baileys emita QR nuevo (no intentará usar creds viejas que cuelgan).
    if (!wasConnected) {
      cleanLocalSession(botId)
    }

    // Update DB status
    await supabase.from('whatsapp_sessions').upsert(
      { bot_id: botId, status: 'connecting', qr_code: null },
      { onConflict: 'bot_id' }
    )

    const conn: BaileysConnection = {
      socket: null,
      status: 'connecting',
      qrCode: null,
      phoneNumber: null,
      retryCount: 0,
    }
    this.connections.set(botId, conn)

    // Solo restaurar creds si el estado previo era 'connected' (creds válidas)
    const sessionDir = path.join(SESSIONS_DIR, botId)
    if (wasConnected && !fs.existsSync(path.join(sessionDir, 'creds.json'))) {
      await restoreCredentialsFromDb(botId)
    }
    fs.mkdirSync(sessionDir, { recursive: true })

    await this.createSocket(botId)

    // Esperar QR o conexión (hasta 45s — Baileys puede tardar en el primer handshake)
    for (let i = 0; i < 45; i++) {
      await sleep(1000)
      const c = this.connections.get(botId)
      if (!c) break
      if (c.status === 'connected') return { status: 'connected', phone: c.phoneNumber || undefined }
      if (c.status === 'qr_ready' && c.qrCode) return { status: 'qr_ready', qrCode: c.qrCode }
    }

    // Timeout sin QR ni conexión → limpiar sesión stale para el próximo intento
    const final = this.connections.get(botId)
    if (final && final.status !== 'connected' && final.status !== 'qr_ready') {
      console.warn(`[BAILEYS] Bot ${botId} timeout (45s) sin QR ni conexión — limpiando sesión stale`)
      try { (final.socket as any)?.ev?.removeAllListeners?.(); (final.socket as any)?.end?.() } catch { /* ignore */ }
      this.connections.delete(botId)
      cleanLocalSession(botId)
      await supabase.from('whatsapp_sessions').upsert(
        { bot_id: botId, status: 'disconnected', qr_code: null, credentials_backup: null },
        { onConflict: 'bot_id' }
      )
    }

    return { status: final?.status || 'disconnected', qrCode: final?.qrCode || undefined }
  }

  // ── Create Baileys Socket ──
  private async createSocket(botId: string): Promise<void> {
    const sessionDir = path.join(SESSIONS_DIR, botId)
    fs.mkdirSync(sessionDir, { recursive: true })

    const { state, saveCreds } = await useMultiFileAuthState(sessionDir)
    const { version } = await fetchLatestBaileysVersion()

    const socket = makeWASocket({
      version,
      auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, baileysLogger) },
      logger: baileysLogger,
      printQRInTerminal: false,
      generateHighQualityLinkPreview: false,
      browser: ['Ubuntu', 'Chrome', '120.0.0'],
      syncFullHistory: false,
      markOnlineOnConnect: false,
    })

    const conn = this.connections.get(botId)!
    conn.socket = socket

    // ── Connection Update ──
    socket.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update

      if (qr) {
        try {
          const qrDataUrl = await QRCode.toDataURL(qr)
          conn.status = 'qr_ready'
          conn.qrCode = qrDataUrl
          const supabase = await createServiceRoleClient()
          await supabase.from('whatsapp_sessions').upsert(
            { bot_id: botId, status: 'qr_ready', qr_code: qrDataUrl },
            { onConflict: 'bot_id' }
          )
        } catch { /* ignore QR errors */ }
      }

      if (connection === 'open') {
        const phoneNumber = socket.user?.id ? phoneFromJid(socket.user.id) : null
        conn.status = 'connected'
        conn.phoneNumber = phoneNumber
        conn.qrCode = null
        conn.retryCount = 0
        console.log(`[BAILEYS] Bot ${botId} connected as ${phoneNumber}`)

        const supabase = await createServiceRoleClient()
        await supabase.from('whatsapp_sessions').upsert(
          { bot_id: botId, status: 'connected', phone_number: phoneNumber, qr_code: null },
          { onConflict: 'bot_id' }
        )
        backupCredentialsToDb(botId).catch(() => {})
      }

      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode
        const isLoggedOut = statusCode === DisconnectReason.loggedOut
        const isReplaced = statusCode === DisconnectReason.connectionReplaced

        console.log(`[BAILEYS] Bot ${botId} disconnected. Code: ${statusCode}, loggedOut: ${isLoggedOut}`)

        if (isLoggedOut) {
          conn.status = 'disconnected'
          conn.socket = null
          conn.phoneNumber = null
          conn.qrCode = null
          const sessionDir2 = path.join(SESSIONS_DIR, botId)
          if (fs.existsSync(sessionDir2)) {
            fs.rmSync(sessionDir2, { recursive: true, force: true })
          }
          this.connections.delete(botId)
          console.log(`[BAILEYS] Bot ${botId} logged out — session cleaned`)
          const supabase = await createServiceRoleClient()
          await supabase.from('whatsapp_sessions').upsert(
            { bot_id: botId, status: 'disconnected', phone_number: null, qr_code: null, credentials_backup: null },
            { onConflict: 'bot_id' }
          )
        } else if (isReplaced) {
          console.log(`[BAILEYS] Bot ${botId} connection replaced (440), stopping.`)
          conn.status = 'disconnected'
          conn.socket = null
          this.connections.delete(botId)
        } else if (conn.retryCount < MAX_RETRIES) {
          conn.retryCount++
          conn.status = 'connecting'
          conn.socket = null
          console.log(`[BAILEYS] Bot ${botId} reconnecting (attempt ${conn.retryCount}/${MAX_RETRIES})...`)
          setTimeout(() => this.createSocket(botId).catch(console.error), RECONNECT_DELAY)
        } else {
          conn.status = 'disconnected'
          conn.socket = null
          this.connections.delete(botId)
          console.log(`[BAILEYS] Bot ${botId} max retries reached`)
          const supabase = await createServiceRoleClient()
          await supabase.from('whatsapp_sessions').upsert(
            { bot_id: botId, status: 'disconnected' },
            { onConflict: 'bot_id' }
          )
        }
      }
    })

    // ── Creds Update ──
    socket.ev.on('creds.update', async () => {
      await saveCreds()
      backupCredentialsToDb(botId).catch(() => {})
    })

    // ── Messages ──
    socket.ev.on('messages.upsert', async ({ messages: msgs, type }) => {
      if (type !== 'notify') return
      for (const msg of msgs) {
        this.handleMessage(botId, msg, socket).catch(err =>
          console.error(`[BAILEYS] Error procesando mensaje botId=${botId}:`, err)
        )
      }
    })
  }

  // ── Handle Incoming Message ──────────────────────────────────────────────────

  private async handleMessage(botId: string, msg: WAMessage, sock: WASocket): Promise<void> {
    if (!msg.key?.remoteJid) return
    const jid = msg.key.remoteJid

    // Ignorar mensajes propios, grupos y status
    if (msg.key.fromMe || jid === 'status@broadcast' || jid.endsWith('@g.us') || jid.endsWith('@newsletter')) return

    // Ignorar mensajes viejos (>60s) que llegan en reconexión
    const msgTimestamp = msg.messageTimestamp
    if (msgTimestamp) {
      const msgTime = typeof msgTimestamp === 'number' ? msgTimestamp : Number(msgTimestamp)
      const now = Math.floor(Date.now() / 1000)
      if (now - msgTime > 60) return
    }

    const msgContent = msg.message
    if (!msgContent) return

    // Deduplicación por ID de mensaje
    if (msg.key.id) {
      if (this.processedMessageIds.has(msg.key.id)) return
      this.processedMessageIds.add(msg.key.id)
      if (this.processedMessageIds.size > 5000) {
        const allValues = [...this.processedMessageIds]
        for (let i = 0; i < 1000; i++) this.processedMessageIds.delete(allValues[i])
      }
    }

    // Verificar que el bot siga activo en BD
    const bot = await getBot(botId)
    if (!bot || !bot.is_active) {
      console.log(`[BAILEYS] Bot ${botId} inactivo, ignorando mensaje`)
      return
    }

    const apiKey = bot.openai_api_key || process.env.OPENAI_API_KEY
    if (!apiKey) {
      console.warn(`[BAILEYS] Bot ${botId} sin API key de OpenAI`)
      return
    }

    const userPhone = phoneFromJid(jid)
    let userName = msg.pushName || ''
    if (userName && /^\d+$/.test(userName.replace(/[+\s-]/g, ''))) {
      userName = ''
    }

    console.log(`[BAILEYS] Mensaje de ${userName || userPhone} (jid: ${jid})`)

    // ── Extraer contenido del mensaje ──
    let content = ''
    let msgType: string = 'text'

    if (msgContent.conversation || msgContent.extendedTextMessage?.text) {
      content = msgContent.conversation || msgContent.extendedTextMessage?.text || ''
      msgType = 'text'
    } else if (msgContent.audioMessage) {
      msgType = 'audio'
      try {
        const buffer = await downloadMediaMessage(msg, 'buffer', {}) as Buffer
        const blob = new Blob([new Uint8Array(buffer)], { type: 'audio/ogg' })
        content = await transcribeAudio(blob, apiKey)
        if (!content) content = '[Audio recibido - no se pudo transcribir]'
      } catch {
        content = '[Audio recibido - no se pudo transcribir]'
      }
    } else if (msgContent.imageMessage) {
      msgType = 'image'
      try {
        const buffer = await downloadMediaMessage(msg, 'buffer', {}) as Buffer
        const b64 = buffer.toString('base64')
        const dataUrl = `data:image/jpeg;base64,${b64}`
        const analysis = await analyzeImage(dataUrl, apiKey)
        content = `[Imagen recibida] ${analysis} ${msgContent.imageMessage.caption ? `| Pie de foto: ${msgContent.imageMessage.caption}` : ''}`
      } catch {
        content = msgContent.imageMessage.caption || '[Imagen recibida - error al analizar]'
      }
    } else if (msgContent.locationMessage || (msgContent as any)?.liveLocationMessage) {
      msgType = 'location'
      const loc = msgContent.locationMessage || (msgContent as any).liveLocationMessage
      const lat = loc.degreesLatitude
      const lon = loc.degreesLongitude
      const name = loc.name || ''
      const address = loc.address || ''
      content = `📍 Ubicación recibida: ${name} ${address}`.trim()
      if (lat && lon) content += ` | https://maps.google.com/?q=${lat},${lon}`
    } else if (msgContent.videoMessage) {
      msgType = 'video'
      const caption = msgContent.videoMessage?.caption || ''
      content = `[Video enviado${caption ? `: "${caption}"` : ''}]`
    } else if (msgContent.documentMessage) {
      msgType = 'document'
      const fileName = msgContent.documentMessage?.fileName || 'documento'
      content = `[Documento enviado: ${fileName}]`
    } else {
      return
    }

    if (!content.trim()) return

    // ── DB: Contact, Conversation ──
    const contact = await findOrCreateContact(userPhone, userName, bot.tenant_id, botId)
    if (!contact) { console.error(`[BAILEYS] Failed to find/create contact for ${userPhone}`); return }
    const conversation = await findOrCreateConversation(botId, contact.id)
    if (!conversation) { console.error(`[BAILEYS] Failed to find/create conversation`); return }

    // Si la conversación está cerrada (vendido) o pausada → no responder
    if (conversation.status === 'paused' || conversation.status === 'closed') {
      console.log(`[BAILEYS] Conversación ${conversation.id} es ${conversation.status} — ignorando`)
      return
    }

    // Reset followup si el cliente responde
    if (conversation.status === 'pending_followup') {
      const supabase = await createServiceRoleClient()
      await supabase.from('conversations').update({
        status: 'active',
        followup_count: 0,
        last_followup_at: null,
      }).eq('id', conversation.id)
    }

    // Marcar como leído
    if (msg.key) {
      await sock.readMessages([msg.key]).catch(err =>
        console.error('[BAILEYS] Error al marcar como leído:', err)
      )
    }

    // Guardar mensaje entrante
    await saveMessage(conversation.id, 'client', msgType, content)

    const resolvedUserName = userName || contact.name || contact.push_name || ''

    // ── BUFFER ──
    const bufferKey = `${botId}:${userPhone}`
    const now = Date.now()

    if (!this.messageBuffers.has(bufferKey)) {
      this.messageBuffers.set(bufferKey, [])
    }
    this.messageBuffers.get(bufferKey)!.push({ content, type: msgType, timestamp: now })

    console.log(`[BAILEYS] Buffer: mensaje guardado (${msgType}) para ${userPhone}, esperando ${BUFFER_DELAY_MS / 1000}s...`)

    await sleep(BUFFER_DELAY_MS)

    // Check if newer messages arrived
    const currentBuffer = this.messageBuffers.get(bufferKey)
    if (!currentBuffer || currentBuffer.length === 0) return
    const latestTimestamp = Math.max(...currentBuffer.map(m => m.timestamp))
    if (now < latestTimestamp) return

    // Prevent duplicate processing
    if (this.processingKeys.has(bufferKey)) return
    this.processingKeys.add(bufferKey)

    try {
      // Grab all buffered messages and clear buffer
      const buffered = [...currentBuffer]
      this.messageBuffers.delete(bufferKey)

      console.log(`[BAILEYS] Buffer: procesando ${buffered.length} mensaje(s) combinados para ${userPhone}`)

      // Re-check conversation status + product_interest (equivale a welcomeSent de METO)
      const freshSupabase = await createServiceRoleClient()
      const { data: freshConv } = await freshSupabase
        .from('conversations')
        .select('status, product_interest')
        .eq('id', conversation.id)
        .single()

      if (freshConv?.status === 'paused' || freshConv?.status === 'closed') {
        console.log(`[BAILEYS] Conversación ${conversation.id} cambió a ${freshConv.status} durante buffer — no responder`)
        return
      }

      // Cargar historial reciente
      const { data: recentMessages } = await freshSupabase
        .from('messages')
        .select('sender, content')
        .eq('conversation_id', conversation.id)
        .order('created_at', { ascending: false })
        .limit(MAX_HISTORY)

      const history = (recentMessages || []).reverse()
      const chatHistory = parseChatHistory(history)

      // Cargar productos activos del bot con imágenes y testimonios
      const { data: botProducts } = await freshSupabase
        .from('products')
        .select('*, product_images(*), product_testimonials(*)')
        .eq('bot_id', botId)
        .eq('is_active', true)

      const products = (botProducts || []) as Array<Record<string, unknown>>

      // Detectar productos mencionados
      const identifiedProductIds = detectIdentifiedProduct(history, products)
      if (identifiedProductIds.length) {
        const names = identifiedProductIds.map(id => products.find(p => p.id === id)?.name).join(', ')
        console.log(`[BAILEYS] Smart filter: productos="${names}" — otros en modo minimal`)
      }

      // Extraer URLs ya enviadas
      const { data: allBotMessages } = await freshSupabase
        .from('messages')
        .select('sender, content')
        .eq('conversation_id', conversation.id)
        .eq('sender', 'bot')
        .order('created_at', { ascending: true })

      const sentUrls = extractSentUrls(allBotMessages || [])
      if (sentUrls.length) {
        console.log(`[BAILEYS] URLs ya enviadas (${sentUrls.length}) extraídas`)
      }

      // welcomeSent: equivale al botState.welcomeSent de METO
      // product_interest != null significa que ya se envió el primer mensaje del producto
      const welcomeSent = !!freshConv?.product_interest

      // Bot prompts
      const botPrompt = bot.bot_prompts || { system_prompt: null, personality: null }

      // Construir system prompt (isFirstInteraction = !welcomeSent, como METO)
      const systemPrompt = buildSystemPrompt(
        bot,
        botPrompt,
        products,
        resolvedUserName,
        userPhone,
        identifiedProductIds,
        sentUrls,
        !welcomeSent,
      )

      // Llamar a OpenAI
      let response: Awaited<ReturnType<typeof chat>>
      try {
        response = await chat(systemPrompt, chatHistory, apiKey, bot.gpt_model || 'gpt-4o')
      } catch (aiErr: any) {
        console.error(`[BAILEYS] OpenAI error para ${userPhone}:`, aiErr.message)
        const isQuotaError = aiErr.message?.includes('insufficient_quota') || aiErr.message?.includes('429')
        if (isQuotaError) {
          // Sin saldo → desactivar bot automáticamente
          const pauseDb = await createServiceRoleClient()
          await pauseDb.from('bots').update({ is_active: false }).eq('id', botId)
          // Notificar al dueño
          try {
            const { data: profile } = await pauseDb.from('profiles').select('id').eq('tenant_id', bot.tenant_id).limit(1).single()
            if (profile) {
              await pauseDb.from('user_notifications').insert({
                user_id: profile.id, type: 'bot_pausado',
                title: '⚠️ Bot pausado — Sin saldo en OpenAI',
                message: `El bot "${bot.name}" fue pausado automáticamente porque tu API key de OpenAI no tiene saldo. Recarga créditos y reactívalo manualmente.`,
                link: `/bots/${botId}`,
              })
            }
          } catch { /* silent */ }
          console.warn(`[BAILEYS] Bot ${botId} PAUSADO automáticamente por quota insuficiente`)
        } else {
          // Otro error transitorio → respaldo
          await sock.sendMessage(jid, { text: '¡Hola! Recibí tu mensaje, en un momento te atiendo 😊' }).catch(() => {})
        }
        return
      }

      // Aplicar límites de caracteres (como METO enforceCharLimits)
      enforceCharLimits(response)

      // Filtro de seguridad: eliminar URLs repetidas
      if (sentUrls.length) {
        const sentSet = new Set(sentUrls)
        response.fotos_mensaje1 = (response.fotos_mensaje1 ?? []).filter((u: string) => !sentSet.has(u))
        response.videos_mensaje1 = (response.videos_mensaje1 ?? []).filter((u: string) => !sentSet.has(u))
      }

      // ── Enviar respuestas ──
      const sendMsg = async (text: string) => {
        await sock.sendPresenceUpdate('composing', jid)
        await sleep(Math.floor(Math.random() * 1000) + 1000)
        await sock.sendMessage(jid, { text })
        await saveMessage(conversation.id, 'bot', 'text', text)
      }

      if (response.mensaje1) await sendMsg(response.mensaje1)

      for (const photoUrl of response.fotos_mensaje1) {
        if (photoUrl.startsWith('https://')) {
          await sock.sendPresenceUpdate('composing', jid)
          await sleep(500)
          try {
            await Promise.race([
              sock.sendMessage(jid, { image: { url: photoUrl } }),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Image timeout')), 30000)),
            ])
            await saveMessage(conversation.id, 'bot', 'image', photoUrl)
          } catch (err) {
            console.error(`[BAILEYS] Error sending photo:`, err)
          }
        }
      }

      const videosToSend: string[] = Array.isArray(response.videos_mensaje1)
        ? (response.videos_mensaje1 as unknown[]).filter((v): v is string => typeof v === 'string' && v.startsWith('https://'))
        : []
      for (const videoUrl of videosToSend) {
        await sock.sendPresenceUpdate('composing', jid)
        await sleep(800)
        try {
          await Promise.race([
            sock.sendMessage(jid, { video: { url: videoUrl } }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Video timeout')), 30000)),
          ])
          await saveMessage(conversation.id, 'bot', 'video', videoUrl)
        } catch (err) {
          console.error(`[BAILEYS] Error sending video:`, err)
        }
      }

      if (response.mensaje2) await sendMsg(response.mensaje2)
      if (response.mensaje3) await sendMsg(response.mensaje3)

      // ── Reporte (venta confirmada) ──
      const supabaseUpdate = await createServiceRoleClient()

      if (response.reporte && bot.report_phone) {
        const reportJid = `${bot.report_phone.replace(/^\+/, '').replace(/\s/g, '')}@s.whatsapp.net`
        await sock.sendMessage(reportJid, { text: response.reporte }).catch(() => {})

        // Marcar como sold (closed)
        await supabaseUpdate.from('conversations').update({
          status: 'closed',
          last_bot_message_at: new Date().toISOString(),
          last_message_at: new Date().toISOString(),
        }).eq('id', conversation.id)

        // Notificación al dueño del bot
        try {
          const { data: ownerProfile } = await supabaseUpdate.from('profiles').select('id').eq('tenant_id', bot.tenant_id).limit(1).single()
          if (ownerProfile) {
            await supabaseUpdate.from('user_notifications').insert({
              user_id: ownerProfile.id, type: 'venta_confirmada',
              title: `🤖 Nueva venta — ${bot.name}`,
              message: response.reporte.slice(0, 150),
              link: '/sales',
            })
          }
        } catch { /* silent */ }

        // Etiquetar conversación
        try {
          const labelJid = jid.endsWith('@lid') ? `${userPhone.replace(/\D/g, "")}@s.whatsapp.net` : jid
          await (sock as any).addChatLabel(labelJid, '4')
        } catch { /* silent */ }

        console.log(`[BAILEYS] Conversación ${conversation.id} finalizada (Reporte generado)`)
      } else {
        // Sin venta → programar seguimientos (pending_followup)
        const { data: currentConv } = await supabaseUpdate
          .from('conversations')
          .select('status')
          .eq('id', conversation.id)
          .single()

        const updateData: Record<string, unknown> = {
          last_bot_message_at: new Date().toISOString(),
          last_message_at: new Date().toISOString(),
        }

        if (currentConv?.status !== 'paused' && currentConv?.status !== 'closed') {
          updateData.status = 'pending_followup'
          updateData.followup_count = 0
          updateData.last_followup_at = null
        }

        await supabaseUpdate.from('conversations').update(updateData).eq('id', conversation.id)
      }

      // Actualizar product_interest (equivale a botState.welcomeSent de METO)
      // Solo marcar cuando el producto fue identificado Y se envió mensaje1
      if (!welcomeSent && response.mensaje1 && identifiedProductIds.length > 0) {
        const productNames = identifiedProductIds
          .map(id => products.find(p => p.id === id)?.name)
          .filter(Boolean)
          .join(', ')
        await supabaseUpdate.from('conversations').update({
          product_interest: productNames || 'identified',
        }).eq('id', conversation.id)
        console.log(`[BAILEYS] welcomeSent=true → product_interest="${productNames}"`)
      }

      console.log(`[BAILEYS] ✓ Respuesta enviada para bot=${botId} phone=${userPhone} (${buffered.length} msgs procesados)`)

    } catch (err) {
      console.error(`[BAILEYS] Error processing buffered messages for ${bufferKey}:`, err)
    } finally {
      this.processingKeys.delete(bufferKey)
    }
  }

  // ── Disconnect ──
  async disconnect(botId: string): Promise<void> {
    const conn = this.connections.get(botId)
    if (conn?.socket) {
      try { await conn.socket.logout() } catch { /* ignore */ }
      try { (conn.socket as any).end() } catch { /* ignore */ }
    }

    const sessionDir = path.join(SESSIONS_DIR, botId)
    if (fs.existsSync(sessionDir)) {
      fs.rmSync(sessionDir, { recursive: true, force: true })
    }

    this.connections.delete(botId)

    const supabase = await createServiceRoleClient()
    await supabase.from('whatsapp_sessions').upsert(
      { bot_id: botId, status: 'disconnected', phone_number: null, qr_code: null, credentials_backup: null },
      { onConflict: 'bot_id' }
    )
    console.log(`[BAILEYS] Bot ${botId} disconnected and session cleaned`)
  }

  // ── Send Message ──
  async sendMessage(botId: string, phoneOrJid: string, text: string): Promise<boolean> {
    const conn = this.connections.get(botId)
    if (!conn?.socket || conn.status !== 'connected') return false
    try {
      const jid = phoneOrJid.includes('@') ? phoneOrJid : `${phoneOrJid}@s.whatsapp.net`
      await conn.socket.sendPresenceUpdate('composing', jid)
      await sleep(Math.floor(Math.random() * 1000) + 1000)
      await Promise.race([
        conn.socket.sendMessage(jid, { text }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Send timeout')), 15000)),
      ])
      return true
    } catch (err) {
      console.error('[BAILEYS] sendMessage error:', err)
      return false
    }
  }

  // ── Send Image ──
  async sendImage(botId: string, phoneOrJid: string, imageUrl: string): Promise<boolean> {
    const conn = this.connections.get(botId)
    if (!conn?.socket || conn.status !== 'connected') return false
    try {
      const jid = phoneOrJid.includes('@') ? phoneOrJid : `${phoneOrJid}@s.whatsapp.net`
      await Promise.race([
        conn.socket.sendMessage(jid, { image: { url: imageUrl } }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Send timeout')), 30000)),
      ])
      return true
    } catch (err) {
      console.error('[BAILEYS] sendImage error:', err)
      return false
    }
  }

  // ── Send Video ──
  async sendVideo(botId: string, phoneOrJid: string, videoUrl: string): Promise<boolean> {
    const conn = this.connections.get(botId)
    if (!conn?.socket || conn.status !== 'connected') return false
    try {
      const jid = phoneOrJid.includes('@') ? phoneOrJid : `${phoneOrJid}@s.whatsapp.net`
      await Promise.race([
        conn.socket.sendMessage(jid, { video: { url: videoUrl } }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Send timeout')), 30000)),
      ])
      return true
    } catch (err) {
      console.error('[BAILEYS] sendVideo error:', err)
      return false
    }
  }

  // ── Restore Connected Sessions ──
  async restoreConnectedSessions(): Promise<void> {
    console.log('[BAILEYS] Restoring connected sessions...')
    try {
      const supabase = await createServiceRoleClient()
      const { data: sessions } = await supabase
        .from('whatsapp_sessions')
        .select('bot_id, status')
        .eq('status', 'connected')

      if (!sessions || sessions.length === 0) {
        console.log('[BAILEYS] No sessions to restore')
        return
      }

      for (const session of sessions) {
        const existing = this.connections.get(session.bot_id)
        if (existing?.status === 'connected') {
          console.log(`[BAILEYS] Bot ${session.bot_id} already connected, skipping`)
          continue
        }

        console.log(`[BAILEYS] Restoring session for bot ${session.bot_id}...`)
        try {
          await this.connect(session.bot_id)
        } catch (err) {
          console.error(`[BAILEYS] Failed to restore bot ${session.bot_id}:`, err)
        }
      }
      console.log(`[BAILEYS] Restore completed`)
    } catch (err) {
      console.error('[BAILEYS] Error restoring sessions:', err)
    }
  }

  // ── Get Session State ──
  getSessionState(botId: string): { status: string; qrCode?: string; phone?: string } {
    const conn = this.connections.get(botId)
    if (!conn) return { status: 'disconnected' }
    return {
      status: conn.status,
      qrCode: conn.qrCode || undefined,
      phone: conn.phoneNumber || undefined,
    }
  }

  // ── Diagnose ──
  diagnose(): object {
    const connections: Record<string, { status: string; phone: string | null; retryCount: number }> = {}
    for (const [botId, conn] of this.connections) {
      connections[botId] = {
        status: conn.status,
        phone: conn.phoneNumber,
        retryCount: conn.retryCount,
      }
    }
    return {
      totalConnections: this.connections.size,
      activeBuffers: this.messageBuffers.size,
      processing: this.processingKeys.size,
      connections,
    }
  }
}

// ═══ EXPORTS ═══

export function getWhatsAppManager(): WhatsAppManager {
  if (!globalForWa.waManager) {
    globalForWa.waManager = new WhatsAppManager()
  }
  return globalForWa.waManager
}

export async function initWhatsAppManager(): Promise<WhatsAppManager> {
  const manager = getWhatsAppManager()
  await manager.restoreConnectedSessions()
  return manager
}
