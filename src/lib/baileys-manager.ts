/**
 * BaileysManager — gestiona conexiones WhatsApp Web con Baileys.
 * Migrado a Prisma (antes usaba Supabase JS).
 */

import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  WASocket,
  proto,
  downloadMediaMessage,
} from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import path from 'path'
import fs from 'fs'
import { toDataURL } from 'qrcode'
import { prisma } from './prisma'
import { chatWithUsage, BotJsonResponse } from './openai'
import { resolveOpenAIKey, logAiUsage } from './ai-credits'
import { buildSystemPrompt, detectIdentifiedProduct, enforceCharLimits, extractSentUrls } from './bot-engine'
import { createUserNotification } from './notifications'

export type BaileysStatus = 'disconnected' | 'connecting' | 'qr_ready' | 'connected'

interface BaileysConnection {
  status: BaileysStatus
  qrBase64?: string
  phone?: string
  sock?: WASocket
  botId: string
  botName: string
  reportPhone: string
  lastError?: string
}

declare global {
  // eslint-disable-next-line no-var
  var __baileys_connections: Map<string, BaileysConnection> | undefined
}

const connections: Map<string, BaileysConnection> =
  global.__baileys_connections ?? (global.__baileys_connections = new Map())

const SESSIONS_DIR = process.env.WHATSAPP_SESSIONS_DIR || process.env.BAILEYS_SESSIONS_DIR || path.join(process.cwd(), 'baileys-sessions')
const MAX_HISTORY  = 10
const BUFFER_DELAY = 15_000
const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms))

// ── Normalize products ──────────────────────────────────────────────────────

function normalizeProducts(rawProducts: Array<Record<string, unknown>>): Array<Record<string, unknown>> {
  return rawProducts.map(p => {
    const images       = (p.product_images as Array<Record<string, unknown>> | null) ?? []
    const testimonials = (p.product_testimonials as Array<Record<string, unknown>> | null) ?? []
    return {
      id: p.id, name: p.name, category: p.category,
      benefits: p.benefits, usage: p.usage_instructions, warnings: p.warnings,
      priceUnit: p.price_unit, pricePromo2: p.price_promo_x2, priceSuper6: p.price_super_x6,
      currency: p.currency || 'USD', firstMessage: p.first_message, firstMessageAudioUrl: p.first_message_audio_url,
      shippingInfo: p.shipping_info, coverage: p.coverage, hooks: Array.isArray(p.hooks) ? p.hooks : [], active: p.is_active,
      imageMainUrls: images
        .filter(i => ['product', 'main', 'gallery'].includes(i.image_type as string))
        .sort((a, b) => ((a.sort_order as number) || 0) - ((b.sort_order as number) || 0))
        .map(i => i.url),
      productVideoUrls: images.filter(i => i.image_type === 'video').map(i => i.url),
      testimonialsVideoUrls: testimonials.map(t => ({
        url: t.url, label: (t.description as string) || '', type: t.type === 'video' ? 'video' : 'image',
      })),
    }
  })
}

// ── Message handler ─────────────────────────────────────────────────────────

async function handleMessage(conn: BaileysConnection, msg: proto.IWebMessageInfo) {
  const sock = conn.sock!
  if (!msg.key?.remoteJid) return
  const jid = msg.key.remoteJid
  if (msg.key.fromMe || jid === 'status@broadcast' || jid.endsWith('@g.us')) return

  const botStatus = await (prisma as any).bot.findUnique({
    where: { id: conn.botId },
    select: { status: true, tenant_id: true, ai_model: true, system_prompt_template: true, max_chars_msg1: true, max_chars_msg2: true, max_chars_msg3: true, follow_up1_delay: true, follow_up2_delay: true },
  })
  if (!botStatus || botStatus.status !== 'ACTIVE') return

  if (msg.key.id) {
    const exists = await (prisma as any).message.findFirst({ where: { message_id: msg.key.id }, select: { id: true } })
    if (exists) return
  }

  const resolvedKey = await resolveOpenAIKey(conn.botId)
  if (!resolvedKey) return
  const openaiKey  = resolvedKey.key
  const userPhone  = jid.replace('@s.whatsapp.net', '')
  let userName     = msg.pushName || ''
  if (userName && /^\d+$/.test(userName.replace(/[+\s-]/g, ''))) userName = ''

  let content = '', msgType: 'text' | 'audio' | 'image' | 'location' = 'text'
  const mc = msg.message
  if (mc?.conversation) { content = mc.conversation; msgType = 'text' }
  else if (mc?.extendedTextMessage?.text) { content = mc.extendedTextMessage.text; msgType = 'text' }
  else if (mc?.audioMessage) {
    msgType = 'audio'
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const buf = await downloadMediaMessage(msg as any, 'buffer', {})
      const { transcribeAudio } = await import('@/lib/openai')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      content = await transcribeAudio(new Blob([buf as any], { type: 'audio/ogg' }), openaiKey)
    } catch { content = '[Audio no transcribible]' }
  } else if (mc?.imageMessage) {
    msgType = 'image'
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const buf = await downloadMediaMessage(msg as any, 'buffer', {})
      const { analyzeImage } = await import('@/lib/openai')
      const b64 = (buf as Buffer).toString('base64')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      content = `[Imagen] ${await (analyzeImage as any)(`data:image/jpeg;base64,${b64}`, openaiKey)}`
    } catch { content = mc.imageMessage.caption || '[Imagen]' }
  } else if (mc?.locationMessage) {
    msgType = 'location'
    const loc = mc.locationMessage
    content = `📍 Ubicación: https://maps.google.com/?q=${loc.degreesLatitude},${loc.degreesLongitude}`
  } else return
  if (!content.trim()) return

  const existingConv = await (prisma as any).conversation.findFirst({
    where: { bot_id: conn.botId, user_phone: userPhone },
    select: { id: true, updated_at: true, user_name: true, sold: true, bot_disabled: true },
  })
  if (existingConv?.sold || existingConv?.bot_disabled) return

  await sock.readMessages([msg.key]).catch(() => {})

  let conversationId: string, welcomeSent = false, resolvedUserName = ''

  if (existingConv) {
    await (prisma as any).conversation.update({
      where: { id: existingConv.id },
      data: { user_name: userName || existingConv.user_name || undefined, follow_up1_at: null, follow_up1_sent: false, follow_up2_at: null, follow_up2_sent: false },
    })
    conversationId    = existingConv.id
    resolvedUserName  = userName || existingConv.user_name || ''
    const bs = await (prisma as any).botState.findUnique({ where: { conversation_id: conversationId }, select: { welcome_sent: true } })
    welcomeSent = bs?.welcome_sent ?? false
  } else {
    const nc = await (prisma as any).conversation.create({
      data: { bot_id: conn.botId, user_phone: userPhone, user_name: userName || '' },
      select: { id: true },
    })
    conversationId   = nc.id
    resolvedUserName = userName
    await (prisma as any).botState.create({ data: { conversation_id: conversationId, welcome_sent: false } })
  }

  const arrivedAt = new Date()
  await (prisma as any).message.create({
    data: { conversation_id: conversationId, role: 'user', type: msgType, content, buffered: true, message_id: msg.key.id || null },
  })
  await sleep(BUFFER_DELAY)

  const freshConv = await (prisma as any).conversation.findUnique({ where: { id: conversationId }, select: { updated_at: true } })
  if (freshConv && new Date(freshConv.updated_at) > arrivedAt) return

  const buffered = await (prisma as any).message.findMany({
    where: { conversation_id: conversationId, role: 'user', buffered: true },
    orderBy: { created_at: 'asc' },
    select: { id: true, type: true, content: true },
  })
  if (!buffered?.length) return

  const combinedText = buffered.map((m: { type: string; content: string }) => {
    if (m.type === 'audio') return `🎙️ (audio): ${m.content}`
    if (m.type === 'image') return `📷 (imagen): ${m.content}`
    return `📝 (texto): ${m.content}`
  }).join('\n')

  await (prisma as any).message.deleteMany({ where: { conversation_id: conversationId, role: 'user', buffered: true } })
  await (prisma as any).message.create({ data: { conversation_id: conversationId, role: 'user', type: 'text', content: combinedText, buffered: false } })

  const recentRaw = await (prisma as any).message.findMany({
    where: { conversation_id: conversationId, buffered: false },
    orderBy: { created_at: 'desc' },
    take: MAX_HISTORY,
    select: { role: true, content: true },
  })
  const recentMessages = (recentRaw ?? []).reverse()
  const chatHistory = recentMessages.map((m: { role: string; content: string }) => {
    if (m.role === 'assistant') {
      try { const p = JSON.parse(m.content); return { role: 'assistant' as const, content: [p.mensaje1, p.mensaje2, p.mensaje3].filter(Boolean).join('\n') || m.content } }
      catch { return { role: 'assistant' as const, content: m.content } }
    }
    return { role: m.role as 'user', content: m.content }
  })

  const rawProds = await (prisma as any).product.findMany({
    where: { bot_id: conn.botId, is_active: true },
    include: { product_images: true, product_testimonials: true },
  })
  const products    = normalizeProducts(rawProds ?? [])
  const identifiedIds = detectIdentifiedProduct(recentMessages, products)

  const allAsst = await (prisma as any).message.findMany({
    where: { conversation_id: conversationId, role: 'assistant', buffered: false },
    orderBy: { created_at: 'asc' },
    select: { role: true, content: true },
  })
  const sentUrls   = extractSentUrls(allAsst ?? [])
  const systemPrompt = buildSystemPrompt(botStatus as never, products, resolvedUserName, userPhone, identifiedIds, sentUrls, welcomeSent)

  let response: BotJsonResponse
  try {
    const aiModel  = (botStatus.ai_model as string) || 'gpt-4o-mini'
    const aiResult = await chatWithUsage(systemPrompt, chatHistory, openaiKey, aiModel)
    response       = aiResult.response
    if (resolvedKey.isGlobal) {
      logAiUsage({ userId: resolvedKey.userId, service: 'baileys', model: aiModel, promptTokens: aiResult.promptTokens, completionTokens: aiResult.completionTokens }).catch(() => {})
    }
  } catch (err: unknown) {
    const m = err instanceof Error ? err.message : ''
    if (m.includes('insufficient_quota') || m.includes('429')) {
      await (prisma as any).bot.update({ where: { id: conn.botId }, data: { status: 'PAUSED' } })
      createUserNotification({ userId: botStatus.tenant_id, type: 'bot_paused', title: '⚠️ Bot pausado — Sin saldo OpenAI', message: `El bot "${conn.botName}" fue pausado por falta de saldo.`, link: '/bots' }).catch(() => {})
    } else {
      await sock.sendMessage(jid, { text: '¡Hola! Recibí tu mensaje, en un momento te atiendo 😊' }).catch(() => {})
    }
    return
  }

  enforceCharLimits(response, botStatus as never)
  if (sentUrls.length) {
    const s = new Set(sentUrls)
    response.fotos_mensaje1   = (response.fotos_mensaje1 ?? []).filter(u => !s.has(u))
    response.videos_mensaje1  = (response.videos_mensaje1 ?? []).filter(u => !s.has(u))
  }

  const sendText = async (text: string) => {
    await sock.sendPresenceUpdate('composing', jid)
    await sleep(Math.floor(Math.random() * 1000) + 800)
    await sock.sendMessage(jid, { text })
  }

  if (response.mensaje1) await sendText(response.mensaje1)
  for (const url of response.fotos_mensaje1 ?? []) {
    if (url.startsWith('https://')) { await sock.sendMessage(jid, { image: { url } }).catch(() => {}); await sleep(500) }
  }
  for (const url of (response.videos_mensaje1 ?? []) as string[]) {
    if (url.startsWith('https://')) { await sock.sendMessage(jid, { video: { url } }).catch(() => {}); await sleep(800) }
  }
  if (response.audio_url?.startsWith('https://')) {
    const ext  = response.audio_url.split('?')[0].split('.').pop()?.toLowerCase() || 'ogg'
    const mime: Record<string, string> = { ogg: 'audio/ogg; codecs=opus', oga: 'audio/ogg; codecs=opus', mp3: 'audio/mpeg', wav: 'audio/wav', webm: 'audio/webm' }
    await sock.sendMessage(jid, { audio: { url: response.audio_url }, mimetype: mime[ext] || 'audio/ogg; codecs=opus', ptt: true }).catch(() => {})
  }
  if (response.mensaje2) await sendText(response.mensaje2)
  if (response.mensaje3) await sendText(response.mensaje3)

  if (response.reporte && conn.reportPhone) {
    const rJid = `${conn.reportPhone.replace(/^\+/, '').replace(/\D/g, '')}@s.whatsapp.net`
    await sock.sendMessage(rJid, { text: response.reporte }).catch(() => {})
    await (prisma as any).conversation.update({ where: { id: conversationId }, data: { sold: true, sold_at: new Date() } })
    createUserNotification({ userId: botStatus.tenant_id, type: 'new_sale', title: `🤖 Nueva venta — ${conn.botName}`, message: response.reporte.slice(0, 120), link: '/bots' }).catch(() => {})
  } else {
    const now = new Date()
    await (prisma as any).conversation.update({
      where: { id: conversationId },
      data: {
        follow_up1_at:   new Date(now.getTime() + ((botStatus.follow_up1_delay as number) || 15) * 60_000),
        follow_up1_sent: false,
        follow_up2_at:   new Date(now.getTime() + ((botStatus.follow_up2_delay as number) || 4320) * 60_000),
        follow_up2_sent: false,
      },
    })
  }

  await (prisma as any).message.create({
    data: { conversation_id: conversationId, role: 'assistant', type: 'text', content: JSON.stringify(response), buffered: false },
  })

  if (!welcomeSent && response.mensaje1 && identifiedIds.length > 0) {
    await (prisma as any).botState.upsert({
      where:  { conversation_id: conversationId },
      create: { conversation_id: conversationId, welcome_sent: true, welcome_sent_at: new Date() },
      update: { welcome_sent: true, welcome_sent_at: new Date() },
    })
  }
  if (response.reporte) {
    await (prisma as any).botState.upsert({
      where:  { conversation_id: conversationId },
      create: { conversation_id: conversationId, last_intent: 'confirmation', welcome_sent: false },
      update: { last_intent: 'confirmation' },
    })
  }
}

// ── Public API ──────────────────────────────────────────────────────────────

export const BaileysManager = {
  getStatus(botId: string) {
    const conn = connections.get(botId)
    if (!conn) return { status: 'disconnected' as BaileysStatus }
    return { status: conn.status, qrBase64: conn.qrBase64, phone: conn.phone, lastError: conn.lastError }
  },

  disconnect(botId: string) {
    const conn = connections.get(botId)
    if (conn?.sock) { try { conn.sock.end(undefined) } catch { /* ignore */ } }
    connections.delete(botId)
    const sessionDir = path.join(SESSIONS_DIR, botId)
    if (fs.existsSync(sessionDir)) fs.rmSync(sessionDir, { recursive: true, force: true })
  },

  async sendText(botId: string, toPhone: string, text: string): Promise<boolean> {
    const conn = connections.get(botId)
    if (!conn?.sock || conn.status !== 'connected') return false
    const jid = `${toPhone.replace(/^\+/, '').replace(/\D/g, '')}@s.whatsapp.net`
    try { await conn.sock.sendMessage(jid, { text }); return true } catch { return false }
  },

  async sendImage(botId: string, toPhone: string, imageUrl: string): Promise<boolean> {
    const conn = connections.get(botId)
    if (!conn?.sock || conn.status !== 'connected') return false
    const jid = `${toPhone.replace(/^\+/, '').replace(/\D/g, '')}@s.whatsapp.net`
    try { await conn.sock.sendMessage(jid, { image: { url: imageUrl } }); return true } catch { return false }
  },

  async connect(botId: string, botName: string, _openaiKey: string, reportPhone: string) {
    const existing = connections.get(botId)
    if (existing?.status === 'connected' || existing?.status === 'connecting') return

    // Register connection FIRST so status polling shows 'connecting' immediately
    const conn: BaileysConnection = { status: 'connecting', botId, botName, reportPhone }
    connections.set(botId, conn)

    try {
      // Resolve session directory with fallback in case primary path is not writable
      let sessionDir = path.join(SESSIONS_DIR, botId)
      try {
        fs.mkdirSync(sessionDir, { recursive: true })
      } catch {
        sessionDir = path.join(process.cwd(), 'baileys-sessions', botId)
        fs.mkdirSync(sessionDir, { recursive: true })
        console.warn(`[BAILEYS] Primary sessions dir not writable, using fallback: ${sessionDir}`)
      }

      const { state, saveCreds } = await useMultiFileAuthState(sessionDir)

      // Fetch latest WA version with fallback to avoid network failures blocking QR
      let version: [number, number, number]
      try {
        const result = await fetchLatestBaileysVersion()
        version = result.version
      } catch {
        version = [2, 3000, 1015901307]
        console.warn('[BAILEYS] fetchLatestBaileysVersion failed, using fallback version')
      }

      // Build a silent logger without requiring pino as a direct dependency
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let logger: any
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        logger = require('pino')({ level: 'silent' })
      } catch {
        const noop = () => {}
        logger = { level: 'silent', trace: noop, debug: noop, info: noop, warn: noop, error: noop, fatal: noop, child: () => logger }
      }

      const sock = makeWASocket({
        version,
        auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, logger) },
        logger,
        browser: ['Ubuntu', 'Chrome', '120.0.0'],
        syncFullHistory: false,
        markOnlineOnConnect: false,
      })
      conn.sock = sock
      sock.ev.on('creds.update', saveCreds)
      sock.ev.on('connection.update', async update => {
        const { connection, qr } = update
        if (qr) {
          conn.qrBase64 = await toDataURL(qr)
          conn.status = 'qr_ready'
          conn.lastError = undefined
          console.log(`[BAILEYS] QR ready for bot ${botId}`)
        }
        if (connection === 'open') {
          conn.status = 'connected'
          conn.lastError = undefined
          const phone = sock.user?.id?.split(':')[0] ?? ''
          conn.phone  = phone
          console.log(`[BAILEYS] Connected for bot ${botId}, phone: ${phone}`)
          await (prisma as any).bot.update({ where: { id: botId }, data: { baileys_phone: phone } }).catch(() => {})
        }
        if (connection === 'close') {
          const code = new Boom(update.lastDisconnect?.error)?.output?.statusCode
          const reason = update.lastDisconnect?.error?.message || 'unknown'
          console.log(`[BAILEYS] Connection closed for bot ${botId}, code: ${code}, reason: ${reason}`)
          conn.status = 'disconnected'
          connections.delete(botId)
          const isLoggedOut = code === DisconnectReason.loggedOut || code === DisconnectReason.connectionReplaced
          if (isLoggedOut) {
            if (fs.existsSync(sessionDir)) fs.rmSync(sessionDir, { recursive: true, force: true })
            await (prisma as any).bot.update({ where: { id: botId }, data: { baileys_phone: null } }).catch(() => {})
          } else {
            setTimeout(() => BaileysManager.connect(botId, botName, '', reportPhone), 5000)
          }
        }
      })
      sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return
        for (const msg of messages) handleMessage(conn, msg).catch(e => console.error('[BAILEYS] Error:', e))
      })
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err)
      console.error('[BAILEYS] connect error:', errMsg)
      conn.status = 'disconnected'
      conn.lastError = errMsg
      // Keep in map briefly so UI can read the error, then remove
      setTimeout(() => {
        if (connections.get(botId)?.status === 'disconnected') connections.delete(botId)
      }, 8000)
    }
  },
}
