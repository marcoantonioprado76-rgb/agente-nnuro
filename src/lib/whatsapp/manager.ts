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
import { generateBotResponse } from './ai-engine'

// ═══ CONFIG ═══
const SESSIONS_DIR = process.env.WHATSAPP_SESSIONS_DIR || '/var/data/baileys-sessions'
const MAX_RETRIES = 15
const RECONNECT_DELAY = 5_000
const MESSAGE_BUFFER_MS = 15_000
const baileysLogger = pino({ level: 'silent' })

// ═══ TYPES ═══
interface BaileysConnection {
  socket: WASocket | null
  status: 'disconnected' | 'connecting' | 'qr_ready' | 'connected'
  qrCode: string | null
  phoneNumber: string | null
  retryCount: number
}

interface BufferedMessage {
  content: string
  type: 'text' | 'audio' | 'image' | 'location' | 'video' | 'document'
  timestamp: number
}

// ═══ SINGLETON ═══
const globalForWa = globalThis as typeof globalThis & {
  waManager: WhatsAppManager | undefined
  waManagerRestored: boolean
}

// ═══ HELPERS: Audio Transcription & Image Analysis ═══

async function transcribeAudio(audioBuffer: Buffer, mimeType: string, apiKey: string): Promise<string> {
  try {
    const baseMime = mimeType.split(';')[0].trim()
    const mimeToExt: Record<string, string> = {
      'audio/ogg': 'ogg', 'audio/mpeg': 'mp3', 'audio/mp4': 'm4a',
      'audio/x-m4a': 'm4a', 'audio/wav': 'wav', 'audio/webm': 'webm',
      'audio/flac': 'flac', 'audio/aac': 'm4a', 'audio/amr': 'amr',
    }
    const ext = mimeToExt[baseMime] || 'ogg'

    const blob = new Blob([new Uint8Array(audioBuffer)], { type: baseMime })
    const form = new FormData()
    form.append('file', blob, `audio.${ext}`)
    form.append('model', 'whisper-1')
    form.append('language', 'es')

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 60000)
    let res: Response
    try {
      res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}` },
        body: form,
        signal: controller.signal,
      })
    } finally {
      clearTimeout(timeout)
    }

    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      console.error(`[WA] Whisper API error: ${res.status} ${errText.substring(0, 200)}`)
      return ''
    }
    const data = await res.json()
    return (data.text as string) || ''
  } catch (err) {
    console.error('[WA] Whisper transcription error:', err)
    return ''
  }
}

async function analyzeImage(base64DataUrl: string, apiKey: string): Promise<string> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30000)
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analiza esta imagen. Describe qué aparece, objetos, texto visible y contexto. Si hay texto, transcríbelo. Responde en español, máximo 3 frases.`,
            },
            { type: 'image_url', image_url: { url: base64DataUrl, detail: 'high' } },
          ],
        }],
        max_tokens: 500,
      }),
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      console.error(`[WA] Vision API error: ${res.status} ${errText.substring(0, 200)}`)
      return ''
    }
    const data = await res.json()
    return (data.choices?.[0]?.message?.content as string) || ''
  } catch (err) {
    console.error('[WA] Vision analysis error:', err)
    return ''
  } finally {
    clearTimeout(timeout)
  }
}

// ═══ HELPERS: DB ═══

async function getBot(botId: string) {
  const supabase = await createServiceRoleClient()
  const { data } = await supabase.from('bots').select('*').eq('id', botId).single()
  return data
}

async function findOrCreateContact(phone: string, pushName: string, tenantId: string, botId: string) {
  const supabase = await createServiceRoleClient()
  const { data: existing, error: findError } = await supabase
    .from('contacts')
    .select('*')
    .eq('phone', phone)
    .eq('bot_id', botId)
    .maybeSingle()

  if (findError) {
    console.error(`[WA] Error finding contact:`, findError.message)
  }

  if (existing) {
    if (pushName && pushName !== existing.push_name) {
      await supabase.from('contacts').update({ push_name: pushName }).eq('id', existing.id)
    }
    return existing
  }

  const { data: created, error: createError } = await supabase
    .from('contacts')
    .insert({ phone, push_name: pushName, name: pushName || phone, tenant_id: tenantId, bot_id: botId })
    .select()
    .single()

  if (createError) {
    console.error(`[WA] Error creating contact:`, createError.message, `phone=${phone} bot=${botId}`)
  }
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

async function saveMessage(conversationId: string, sender: 'bot' | 'client', type: string, content: string, metadata?: object) {
  const supabase = await createServiceRoleClient()
  await supabase.from('messages').insert({
    conversation_id: conversationId,
    sender,
    type,
    content,
    metadata: metadata || null,
  })
  await supabase
    .from('conversations')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', conversationId)
}

// ═══ HELPERS: Credentials Backup ═══

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
    console.log(`[WA] Credentials backed up for bot ${botId}`)
  } catch (err) {
    console.error(`[WA] Backup error for ${botId}:`, err)
  }
}

async function restoreCredentialsFromDb(botId: string): Promise<boolean> {
  const sessionDir = path.join(SESSIONS_DIR, botId)
  try {
    const supabase = await createServiceRoleClient()
    const { data } = await supabase
      .from('whatsapp_sessions')
      .select('credentials_backup')
      .eq('bot_id', botId)
      .maybeSingle()

    if (!data?.credentials_backup || typeof data.credentials_backup !== 'object') return false
    const files = data.credentials_backup as Record<string, string>
    if (!files['creds.json']) return false

    fs.mkdirSync(sessionDir, { recursive: true })
    for (const [name, content] of Object.entries(files)) {
      fs.writeFileSync(path.join(sessionDir, name), content, 'utf-8')
    }
    console.log(`[WA] Credentials restored from DB for bot ${botId}`)
    return true
  } catch (err) {
    console.error(`[WA] Restore error for ${botId}:`, err)
    return false
  }
}

// ═══ UTILITY ═══

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function phoneFromJid(jid: string): string {
  return jid.replace(/@.*$/, '')
}

// ═══ CLASS ═══

class WhatsAppManager {
  private connections = new Map<string, BaileysConnection>()
  private messageBuffers = new Map<string, BufferedMessage[]>()
  private processingKeys = new Set<string>()
  private processedMessageIds = new Set<string>()

  // ── Connect ──
  async connect(botId: string): Promise<{ status: string; qrCode?: string; phone?: string }> {
    const existing = this.connections.get(botId)
    if (existing?.status === 'connected') {
      return { status: 'connected', phone: existing.phoneNumber || undefined }
    }

    // Kill any existing socket before creating a new one
    if (existing?.socket) {
      try { (existing.socket.ev as any).removeAllListeners(); (existing.socket as any).end() } catch { /* ignore */ }
      existing.socket = null
    }

    // Update DB status
    const supabase = await createServiceRoleClient()
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

    // For fresh connections, clean old session to force new QR
    const sessionDir = path.join(SESSIONS_DIR, botId)
    if (!existing) {
      // First connection attempt — try restoring from DB
      if (!fs.existsSync(path.join(sessionDir, 'creds.json'))) {
        await restoreCredentialsFromDb(botId)
      }
    }
    fs.mkdirSync(sessionDir, { recursive: true })

    await this.createSocket(botId)

    // Wait for QR or connection (up to 30s)
    for (let i = 0; i < 30; i++) {
      await sleep(1000)
      const c = this.connections.get(botId)
      if (!c) break
      if (c.status === 'connected') return { status: 'connected', phone: c.phoneNumber || undefined }
      if (c.status === 'qr_ready' && c.qrCode) return { status: 'qr_ready', qrCode: c.qrCode }
    }

    const final = this.connections.get(botId)
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
        console.log(`[WA] Bot ${botId} connected as ${phoneNumber}`)

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

        console.log(`[WA] Bot ${botId} disconnected. Code: ${statusCode}, loggedOut: ${isLoggedOut}`)

        if (isLoggedOut) {
          // WhatsApp closed session — clean everything, needs new QR
          conn.status = 'disconnected'
          conn.socket = null
          conn.phoneNumber = null
          conn.qrCode = null
          const sessionDir2 = path.join(SESSIONS_DIR, botId)
          if (fs.existsSync(sessionDir2)) {
            fs.rmSync(sessionDir2, { recursive: true, force: true })
          }
          console.log(`[WA] Bot ${botId} logged out — session cleaned, needs new QR`)
          const supabase = await createServiceRoleClient()
          await supabase.from('whatsapp_sessions').upsert(
            { bot_id: botId, status: 'disconnected', phone_number: null, qr_code: null, credentials_backup: null },
            { onConflict: 'bot_id' }
          )
        } else if (isReplaced) {
          // Connection replaced — stop reconnecting to avoid loop
          console.log(`[WA] Bot ${botId} connection replaced (440), stopping. User must reconnect manually.`)
          conn.status = 'disconnected'
          conn.socket = null
        } else if (conn.retryCount < MAX_RETRIES) {
          // Reconnect
          conn.retryCount++
          conn.status = 'connecting'
          conn.socket = null
          console.log(`[WA] Bot ${botId} reconnecting (attempt ${conn.retryCount}/${MAX_RETRIES})...`)
          setTimeout(() => this.createSocket(botId).catch(console.error), RECONNECT_DELAY)
        } else {
          conn.status = 'disconnected'
          conn.socket = null
          console.log(`[WA] Bot ${botId} max retries reached`)
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
        this.handleIncomingMessage(botId, msg, socket).catch(err => {
          console.error(`[WA] Error handling message for bot ${botId}:`, err)
        })
      }
    })
  }

  // ── Handle Incoming Message ──
  private async handleIncomingMessage(botId: string, msg: WAMessage, socket: WASocket): Promise<void> {
    // Ignore own messages, groups, status broadcast
    if (msg.key.fromMe) return

    // Ignore old messages (older than 60 seconds) — these arrive on reconnect
    const msgTimestamp = msg.messageTimestamp
    if (msgTimestamp) {
      const msgTime = typeof msgTimestamp === 'number' ? msgTimestamp : Number(msgTimestamp)
      const now = Math.floor(Date.now() / 1000)
      if (now - msgTime > 60) return
    }
    const jid = msg.key.remoteJid
    if (!jid || jid === 'status@broadcast' || jid.endsWith('@g.us') || jid.endsWith('@newsletter')) return

    const message = msg.message
    if (!message) return

    // Deduplication by message ID
    if (msg.key.id) {
      if (this.processedMessageIds.has(msg.key.id)) return
      this.processedMessageIds.add(msg.key.id)
      // Keep set from growing forever (max 5000 for scale)
      if (this.processedMessageIds.size > 5000) {
        const iter = this.processedMessageIds.values()
        for (let i = 0; i < 1000; i++) iter.next()
        // Delete oldest 1000 entries
        const toDelete: string[] = []
        const allValues = [...this.processedMessageIds]
        for (let i = 0; i < 1000; i++) toDelete.push(allValues[i])
        toDelete.forEach(id => this.processedMessageIds.delete(id))
      }
    }

    const phone = phoneFromJid(jid)
    let pushName = msg.pushName || ''
    // Filter numeric-only names (fallback to phone number)
    if (pushName && /^\d+$/.test(pushName.replace(/[+\s-]/g, ''))) {
      pushName = ''
    }
    console.log(`[WA] Message from ${pushName || phone} (jid: ${jid})`)

    // Get bot info
    const bot = await getBot(botId)
    if (!bot) { console.log(`[WA] Bot ${botId} not found`); return }
    if (!bot.is_active) { console.log(`[WA] Bot ${botId} inactive, ignoring`); return }
    const apiKey = bot.openai_api_key || process.env.OPENAI_API_KEY
    if (!apiKey) { console.error(`[WA] Bot ${botId} no API key`); return }

    // ── Extract content ──
    let content = ''
    let msgType: BufferedMessage['type'] = 'text'

    if (message.conversation || message.extendedTextMessage?.text) {
      content = message.conversation || message.extendedTextMessage?.text || ''
      msgType = 'text'
    } else if (message.audioMessage) {
      msgType = 'audio'
      try {
        const buffer = await downloadMediaMessage(msg, 'buffer', {}) as Buffer
        const mime = message.audioMessage.mimetype || 'audio/ogg'
        const transcription = await transcribeAudio(buffer, mime, apiKey)
        if (transcription && transcription.trim().length > 0) {
          content = `[Audio transcrito]: ${transcription}`
        } else {
          content = '[El cliente envió un audio pero no se pudo transcribir]'
        }
      } catch (err) {
        console.error('[WA] Audio download error:', err)
        content = '[El cliente envió un audio pero no se pudo procesar]'
      }
    } else if (message.imageMessage) {
      msgType = 'image'
      try {
        const buffer = await downloadMediaMessage(msg, 'buffer', {}) as Buffer
        const mime = message.imageMessage.mimetype || 'image/jpeg'
        const base64 = `data:${mime};base64,${buffer.toString('base64')}`
        const description = await analyzeImage(base64, apiKey)
        const caption = message.imageMessage.caption || ''
        if (description && !description.includes('[Imagen no procesada]')) {
          content = `[Imagen enviada${caption ? `: "${caption}"` : ''}. Descripción: ${description}]`
        } else {
          content = caption ? `[Imagen enviada con texto: "${caption}"]` : '[El cliente envió una imagen]'
        }
      } catch (err) {
        console.error('[WA] Image download error:', err)
        const caption = message.imageMessage?.caption || ''
        content = caption ? `[Imagen enviada con texto: "${caption}"]` : '[El cliente envió una imagen]'
      }
    } else if (message.locationMessage || (message as Record<string, unknown>).liveLocationMessage) {
      msgType = 'location'
      const loc = message.locationMessage || (message as Record<string, unknown>).liveLocationMessage as Record<string, unknown>
      const lat = (loc as Record<string, unknown>).degreesLatitude
      const lng = (loc as Record<string, unknown>).degreesLongitude
      const name = ((loc as Record<string, unknown>).name || '') as string
      const address = ((loc as Record<string, unknown>).address || '') as string
      content = `📍 Ubicación recibida: ${name} ${address}`.trim()
      if (lat && lng) content += ` | https://maps.google.com/?q=${lat},${lng}`
    } else if (message.videoMessage) {
      msgType = 'video'
      const caption = message.videoMessage?.caption || ''
      content = `[Video enviado${caption ? `: "${caption}"` : ''}]`
    } else if (message.documentMessage) {
      msgType = 'document'
      const fileName = message.documentMessage?.fileName || 'documento'
      content = `[Documento enviado: ${fileName}]`
    } else {
      // Unsupported message type
      return
    }

    if (!content.trim()) {
      console.log(`[WA] Empty content after extraction, skipping`)
      return
    }
    console.log(`[WA] Content extracted (${msgType}): ${content.substring(0, 100)}...`)

    // ── DB: Contact, Conversation, Save message ──
    const contact = await findOrCreateContact(phone, pushName, bot.tenant_id, botId)
    if (!contact) { console.error(`[WA] Failed to find/create contact for ${phone}`); return }
    const conversation = await findOrCreateConversation(botId, contact.id)
    if (!conversation) { console.error(`[WA] Failed to find/create conversation`); return }
    console.log(`[WA] Contact: ${contact.id}, Conversation: ${conversation.id}, Status: ${conversation.status}`)

    // If conversation is paused or closed (sold), don't read, don't save, don't respond
    if (conversation.status === 'paused' || conversation.status === 'closed') {
      console.log(`[WA] Conversation ${conversation.id} is ${conversation.status} — ignoring completely`)
      return
    }

    // Save incoming message
    await saveMessage(conversation.id, 'client', msgType, content)

    // Reset followup when client responds (prevents followup during conversation)
    if (conversation.status === 'pending_followup') {
      const resetDb = await createServiceRoleClient()
      await resetDb.from('conversations').update({
        status: 'active',
        followup_count: 0,
        last_followup_at: null,
      }).eq('id', conversation.id)
    }

    // Mark message as read (blue ticks)
    if (msg.key) {
      try {
        await socket.readMessages([msg.key])
      } catch (err) {
        console.error('[WA] Error marking as read:', err)
      }
    }


    // ── Buffer messages ──
    const bufferKey = `${botId}:${phone}`
    const now = Date.now()

    if (!this.messageBuffers.has(bufferKey)) {
      this.messageBuffers.set(bufferKey, [])
    }
    this.messageBuffers.get(bufferKey)!.push({ content, type: msgType, timestamp: now })

    // Wait 15 seconds (buffer window)
    await sleep(MESSAGE_BUFFER_MS)

    // Check if newer messages arrived — if so, this is not the latest, skip
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

      // Combine messages
      const combinedMessage = buffered.map(m => {
        switch (m.type) {
          case 'audio': return `🎙️ (audio transcrito): ${m.content}`
          case 'image': return `📷 (imagen recibida): ${m.content}`
          case 'location': return `📍 (ubicación): ${m.content}`
          case 'video': return `🎬 (video): ${m.content}`
          case 'document': return `📄 (documento): ${m.content}`
          default: return m.content
        }
      }).join('\n')
      const contactName = contact.name || contact.push_name || phone

      // Re-check conversation status (may have been paused/closed during buffer wait)
      const freshSupabase = await createServiceRoleClient()
      const { data: freshConv } = await freshSupabase
        .from('conversations')
        .select('status')
        .eq('id', conversation.id)
        .single()

      if (freshConv?.status === 'paused' || freshConv?.status === 'closed') {
        console.log(`[WA] Conversation ${conversation.id} was ${freshConv.status} during buffer — not responding`)
        return
      }

      // ── Generate AI Response ──
      console.log(`[WA] Generating response for bot ${botId}, phone ${phone}`)
      let aiResponse
      try {
        aiResponse = await generateBotResponse(botId, phone, combinedMessage, conversation.id, contactName)
      } catch (aiErr: unknown) {
        const errMsg = aiErr instanceof Error ? aiErr.message : String(aiErr)
        console.error(`[WA] AI error for bot ${botId}:`, errMsg)

        // Auto-pause bot on quota/billing/invalid key errors
        const isFatalError = errMsg.includes('insufficient_quota')
          || errMsg.includes('429')
          || errMsg.includes('billing')
          || errMsg.includes('404')
          || errMsg.includes('invalid_api_key')
          || errMsg.includes('401')
          || errMsg.includes('Incorrect API key')
          || errMsg.includes('exceeded')
        if (isFatalError) {
          const pauseDb = await createServiceRoleClient()
          await pauseDb.from('bots').update({ is_active: false }).eq('id', botId)

          // Determine notification message
          let notifTitle = 'Bot desactivado — Error de API Key'
          let notifMsg = `El bot "${bot.name}" fue desactivado automáticamente.`
          if (errMsg.includes('insufficient_quota') || errMsg.includes('exceeded') || errMsg.includes('429') || errMsg.includes('billing')) {
            notifTitle = 'Bot desactivado — Sin saldo en OpenAI'
            notifMsg = `El bot "${bot.name}" fue desactivado porque tu API key de OpenAI no tiene saldo. Recarga créditos y reactívalo.`
          } else if (errMsg.includes('404') || errMsg.includes('invalid_api_key') || errMsg.includes('401') || errMsg.includes('Incorrect API key')) {
            notifTitle = 'Bot desactivado — API Key inválida'
            notifMsg = `El bot "${bot.name}" fue desactivado porque la API key de OpenAI es inválida o fue eliminada. Configura una nueva API key.`
          }

          // Notify bot owner
          try {
            const { data: profile } = await pauseDb.from('profiles').select('id').eq('tenant_id', bot.tenant_id).limit(1).single()
            if (profile) {
              await pauseDb.from('user_notifications').insert({
                user_id: profile.id, type: 'bot_pausado',
                title: notifTitle,
                message: notifMsg,
                link: `/bots/${botId}`,
              })
            }
          } catch { /* silent */ }
          console.warn(`[WA] Bot ${botId} AUTO-DISABLED: ${errMsg.substring(0, 100)}`)
        } else {
          // Non-fatal AI error — stay silent, don't send fallback
          console.error(`[WA] AI error no fatal, no se envía nada al cliente`)
        }
        return
      }

      if (!aiResponse) {
        // AI returned null after all retries — stay silent
        console.log(`[WA] No AI response for bot ${botId}, silencio`)
        return
      }

      // ── Filter already-sent URLs to prevent repeats ──
      const sentUrlsDb = await createServiceRoleClient()
      const { data: botMsgs } = await sentUrlsDb
        .from('messages')
        .select('content, type')
        .eq('conversation_id', conversation.id)
        .eq('sender', 'bot')
        .in('type', ['image', 'video'])
      const sentUrls = new Set((botMsgs || []).map(m => m.content).filter(u => u?.startsWith('http')))

      if (aiResponse.photos_message1) {
        aiResponse.photos_message1 = aiResponse.photos_message1.filter(u => !sentUrls.has(u))
      }

      // ── Helper: send text with typing ──
      const sendMsg = async (text: string) => {
        try { await socket.presenceSubscribe(jid) } catch { /* silent */ }
        try { await socket.sendPresenceUpdate('composing', jid) } catch { /* silent */ }
        await sleep(Math.floor(Math.random() * 1000) + 1000)
        await Promise.race([
          socket.sendMessage(jid, { text }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Send timeout')), 15000)),
        ])
        await saveMessage(conversation.id, 'bot', 'text', text)
      }

      // ── Send in METO order: mensaje1 → fotos → videos → mensaje2 → mensaje3 ──
      if (aiResponse.message1) await sendMsg(aiResponse.message1)

      // Photos after message1
      if (aiResponse.photos_message1 && aiResponse.photos_message1.length > 0) {
        for (const photoUrl of aiResponse.photos_message1) {
          if (!photoUrl.startsWith('http')) continue
          try {
            try { await socket.sendPresenceUpdate('composing', jid) } catch { /* silent */ }
            await sleep(500)
            await Promise.race([
              socket.sendMessage(jid, { image: { url: photoUrl } }),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Image timeout')), 30000)),
            ])
            await saveMessage(conversation.id, 'bot', 'image', photoUrl)
          } catch (err) {
            console.error(`[WA] Error sending photo:`, err)
          }
        }
      }

      // Videos after photos
      const videos: string[] = (aiResponse.videos_message1 || []).filter(v => v.startsWith('http') && !sentUrls.has(v))
      for (const videoUrl of videos) {
        try {
          try { await socket.sendPresenceUpdate('composing', jid) } catch { /* silent */ }
          await sleep(800)
          await Promise.race([
            socket.sendMessage(jid, { video: { url: videoUrl } }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Video timeout')), 30000)),
          ])
          await saveMessage(conversation.id, 'bot', 'video', videoUrl)
        } catch (err) {
          console.error(`[WA] Error sending video:`, err)
        }
      }

      // mensaje2 and mensaje3 after media
      if (aiResponse.message2) await sendMsg(aiResponse.message2)
      if (aiResponse.message3) await sendMsg(aiResponse.message3)

      // ── Save AI memory (context) ──
      if (aiResponse.context_memory) {
        const memDb = await createServiceRoleClient()
        await memDb.from('conversations').update({
          product_interest: aiResponse.context_memory,
        }).eq('id', conversation.id)
      }

      // ── Send report if present (sale confirmed) ──
      const supabaseUpdate = await createServiceRoleClient()

      if (aiResponse.report && bot.report_phone) {
        // Sale confirmed — send report to seller and close conversation
        try {
          const reportJid = `${bot.report_phone.replace(/^\+/, '').replace(/\s/g, '')}@s.whatsapp.net`
          await socket.sendMessage(reportJid, { text: aiResponse.report })
          console.log(`[WA] Sale report sent to ${bot.report_phone}`)
        } catch (err) {
          console.error(`[WA] Error sending report:`, err)
        }

        // Close conversation — bot stops responding to this client
        await supabaseUpdate.from('conversations').update({
          status: 'closed',
          last_bot_message_at: new Date().toISOString(),
          last_message_at: new Date().toISOString(),
        }).eq('id', conversation.id)

        // Notify bot owner about the sale
        try {
          const { data: ownerProfile } = await supabaseUpdate.from('profiles').select('id').eq('tenant_id', bot.tenant_id).limit(1).single()
          if (ownerProfile) {
            await supabaseUpdate.from('user_notifications').insert({
              user_id: ownerProfile.id, type: 'venta_confirmada',
              title: `Nueva venta — ${bot.name}`,
              message: aiResponse.report?.slice(0, 150) || 'Venta confirmada',
              link: '/sales',
            })
          }
        } catch { /* silent */ }

        console.log(`[WA] Conversation ${conversation.id} closed (sale confirmed)`)
      } else {
        // No sale — update timestamps and set pending_followup only if still active
        const { data: currentConv } = await supabaseUpdate
          .from('conversations')
          .select('status')
          .eq('id', conversation.id)
          .single()

        const updateData: Record<string, unknown> = {
          last_bot_message_at: new Date().toISOString(),
          last_message_at: new Date().toISOString(),
        }

        // Only change status if not paused or closed
        if (currentConv?.status !== 'paused' && currentConv?.status !== 'closed') {
          updateData.status = 'pending_followup'
          updateData.followup_count = 0
          updateData.last_followup_at = null
        }

        await supabaseUpdate.from('conversations').update(updateData).eq('id', conversation.id)
      }
    } catch (err) {
      console.error(`[WA] Error processing buffered messages for ${bufferKey}:`, err)
    } finally {
      this.processingKeys.delete(bufferKey)
    }
  }

  // ── Disconnect ──
  async disconnect(botId: string): Promise<void> {
    const conn = this.connections.get(botId)
    if (conn?.socket) {
      try {
        await conn.socket.logout()
      } catch { /* ignore */ }
      try {
        (conn.socket as any).end()
      } catch { /* ignore */ }
    }

    // Clean session files
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
    console.log(`[WA] Bot ${botId} disconnected and session cleaned`)
  }

  // ── Send Message (with 15s timeout) ──
  async sendMessage(botId: string, phoneOrJid: string, text: string): Promise<boolean> {
    const conn = this.connections.get(botId)
    if (!conn?.socket || conn.status !== 'connected') return false
    try {
      const jid = phoneOrJid.includes('@') ? phoneOrJid : `${phoneOrJid}@s.whatsapp.net`
      await Promise.race([
        conn.socket.sendMessage(jid, { text }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Send timeout')), 15000)),
      ])
      return true
    } catch (err) {
      console.error(`[WA] sendMessage error:`, err)
      return false
    }
  }

  // ── Send Image (with 30s timeout) ──
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
      console.error(`[WA] sendImage error:`, err)
      return false
    }
  }

  // ── Restore Connected Sessions ──
  async restoreConnectedSessions(): Promise<void> {
    console.log('[WA] Restoring connected sessions...')
    try {
      const supabase = await createServiceRoleClient()
      const { data: sessions } = await supabase
        .from('whatsapp_sessions')
        .select('bot_id, status')
        .eq('status', 'connected')

      if (!sessions || sessions.length === 0) {
        console.log('[WA] No sessions to restore')
        return
      }

      for (const session of sessions) {
        // Skip if already connected in memory
        const existing = this.connections.get(session.bot_id)
        if (existing?.status === 'connected') {
          console.log(`[WA] Bot ${session.bot_id} already connected, skipping`)
          continue
        }

        console.log(`[WA] Restoring session for bot ${session.bot_id}...`)
        try {
          await this.connect(session.bot_id)
        } catch (err) {
          console.error(`[WA] Failed to restore bot ${session.bot_id}:`, err)
        }
      }
      console.log(`[WA] Restore completed`)
    } catch (err) {
      console.error('[WA] Error restoring sessions:', err)
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
