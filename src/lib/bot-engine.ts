/**
 * BotEngine – lógica central de procesamiento para bots de WhatsApp (YCloud).
 * Migrado a Prisma (antes usaba Supabase JS).
 *
 * Buffer: acumula mensajes 15 s → el último procesado activa la respuesta.
 */

import { prisma } from './prisma'
import { decrypt } from './crypto'
import { transcribeAudio, analyzeImage, chatWithUsage, ChatMessage, BotJsonResponse } from './openai'
import { markAsRead, sendText, sendImage, sendVideo } from './ycloud'
import { createUserNotification } from './notifications'
import { resolveOpenAIKey, logAiUsage } from './ai-credits'

const BUFFER_DELAY_MS = 15_000
const MAX_HISTORY_MESSAGES = 6
const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms))

// ─── Payload normalization ────────────────────────────────────────────────────

interface NormalizedMessage {
  msgId: string
  userPhone: string
  userName: string
  type: 'text' | 'audio' | 'image' | 'location'
  text?: string
  audioUrl?: string
  imageUrl?: string
  locationLat?: number
  locationLon?: number
}

function normalizePayload(payload: Record<string, unknown>): NormalizedMessage | null {
  try {
    const msg =
      payload.whatsappInboundMessage ??
      (payload.data as Record<string, unknown>)?.message ??
      payload.message ??
      payload

    const m = msg as Record<string, unknown>
    const msgId = (m.wamid ?? m.id ?? m.messageId ?? '') as string
    const userPhone = (m.from ?? '') as string
    const profile = (m.customerProfile ?? m.contact ?? {}) as Record<string, unknown>
    let userName = ((profile.name ?? profile.displayName ?? '') as string) || ''
    if (userName && /^\d+$/.test(userName.replace(/[+\s-]/g, ''))) userName = ''
    const type = (m.type ?? 'text') as string

    if (!userPhone) return null

    if (type === 'text') {
      const textObj = m.text as Record<string, unknown> | undefined
      return { msgId, userPhone, userName, type: 'text', text: (textObj?.body ?? m.body ?? '') as string }
    }
    if (type === 'audio' || type === 'voice') {
      const a = (m.audio ?? m.voice ?? {}) as Record<string, unknown>
      return { msgId, userPhone, userName, type: 'audio', audioUrl: (a.link ?? a.url ?? a.id ?? '') as string }
    }
    if (type === 'image') {
      const img = (m.image ?? {}) as Record<string, unknown>
      return { msgId, userPhone, userName, type: 'image', imageUrl: (img.link ?? img.url ?? img.id ?? '') as string }
    }
    if (type === 'location') {
      const loc = (m.location ?? {}) as Record<string, unknown>
      return {
        msgId, userPhone, userName, type: 'location',
        locationLat: (loc.latitude ?? loc.lat) as number,
        locationLon: (loc.longitude ?? loc.lon ?? loc.lng) as number,
        text: `${loc.name || ''} ${loc.address || ''}`.trim(),
      }
    }
    if (type === 'system' || type === 'notification' || type === 'action') return null
    const unknownText = (m.body ?? m.text ?? '') as string
    if (!unknownText.trim()) return null
    return { msgId, userPhone, userName, type: 'text', text: unknownText }
  } catch { return null }
}

// ─── Prompt helpers ───────────────────────────────────────────────────────────

export function extractSentUrls(messages: Array<{ role: string; content: string }>): string[] {
  const urls: string[] = []
  for (const m of messages) {
    if (m.role !== 'assistant') continue
    try {
      const p = JSON.parse(m.content) as Record<string, unknown>
      const fotos = Array.isArray(p.fotos_mensaje1) ? p.fotos_mensaje1 as string[] : []
      const videos = Array.isArray(p.videos_mensaje1) ? p.videos_mensaje1 as string[] : []
      urls.push(...fotos, ...videos)
    } catch { /* no JSON */ }
  }
  return Array.from(new Set(urls.filter(u => typeof u === 'string' && u.startsWith('http'))))
}

export function buildSystemPrompt(
  bot: { name: string; system_prompt_template: string | null; max_chars_msg1: number | null; max_chars_msg2: number | null; max_chars_msg3: number | null },
  products: Array<Record<string, unknown>>,
  userName?: string | null,
  userPhone?: string | null,
  identifiedProductIds?: string[],
  sentUrls?: string[],
  welcomeSent?: boolean,
): string {
  const isNumeric = userName && /^\d+$/.test(userName.replace(/[+\s-]/g, ''))
  const nameToUse = (userName && !isNumeric) ? userName : 'cliente'

  const currencySymbols: Record<string, string> = {
    USD: '$', EUR: '€', BOB: 'Bs.', PEN: 'S/', COP: '$', ARS: '$', MXN: '$', CLP: '$',
  }

  const productBlock = products.map(p => {
    const currency = (p.currency as string | undefined) ?? 'USD'
    const sym = currencySymbols[currency] ?? currency

    if (identifiedProductIds?.length && !identifiedProductIds.includes(p.id as string)) {
      return [
        `### PRODUCTO: ${p.name}`,
        p.priceUnit   ? `- Precio unitario: ${sym}${p.priceUnit}` : '',
        p.pricePromo2 ? `- Precio promo ×2: ${sym}${p.pricePromo2}` : '',
        p.priceSuper6 ? `- Precio súper ×6: ${sym}${p.priceSuper6}` : '',
      ].filter(Boolean).join('\n')
    }

    const allImgs = Array.isArray(p.imageMainUrls) ? p.imageMainUrls as string[] : []
    const mainImgs = allImgs.slice(0, 3)
    const moreImgs = allImgs.slice(3, 8)
    const hooks = Array.isArray(p.hooks) ? p.hooks as string[] : []
    const rawTestis = Array.isArray(p.testimonialsVideoUrls) ? p.testimonialsVideoUrls : []
    const testimonialsImages = (rawTestis as Array<unknown>).map(item => {
      if (typeof item === 'object' && item !== null) {
        const obj = item as { url: string; label?: string; type?: string }
        if (obj.type === 'video') return null
        if (obj.url?.startsWith('http')) return { url: obj.url, label: obj.label || '' }
      }
      if (typeof item === 'string' && item.startsWith('http')) return { url: item, label: '' }
      return null
    }).filter((t): t is { url: string; label: string } => t !== null)

    const testimonialsVideos = (rawTestis as Array<unknown>).map(item => {
      if (typeof item === 'object' && item !== null) {
        const obj = item as { url: string; label?: string; type?: string }
        if (obj.type === 'video' && obj.url?.startsWith('http')) return { url: obj.url, label: obj.label || '' }
      }
      return null
    }).filter((t): t is { url: string; label: string } => t !== null)

    const rawProductVideos = Array.isArray((p as Record<string, unknown>).productVideoUrls)
      ? (p as Record<string, unknown>).productVideoUrls as string[] : []

    return [
      `### PRODUCTO: ${p.name}`,
      p.category    ? `Categoría: ${p.category}` : '',
      p.benefits    ? `Beneficios: ${p.benefits}` : '',
      p.usage       ? `Uso: ${p.usage}` : '',
      p.warnings    ? `Advertencias: ${p.warnings}` : '',
      !welcomeSent  ? `Primer mensaje: "${p.firstMessage || ''}"` : '',
      !welcomeSent  ? `Imágenes principales (enviar 1): ${JSON.stringify(mainImgs)}` : '',
      `Precios: unitario=${sym}${p.priceUnit ?? '—'} | ×2=${sym}${p.pricePromo2 ?? '—'} | ×6=${sym}${p.priceSuper6 ?? '—'}`,
      `Más fotos: ${JSON.stringify(moreImgs)}`,
      rawProductVideos.length > 0 ? `Videos producto: ${JSON.stringify(rawProductVideos)}` : '',
      `Fotos testimonios: ${JSON.stringify(testimonialsImages)}`,
      testimonialsVideos.length > 0 ? `Videos testimonios: ${JSON.stringify(testimonialsVideos)}` : '',
      (p as Record<string, unknown>).firstMessageAudioUrl ? `Audio PTT: ${(p as Record<string, unknown>).firstMessageAudioUrl}` : '',
      p.shippingInfo ? `Envío: ${p.shippingInfo}` : '',
      p.coverage     ? `Cobertura: ${p.coverage}` : '',
      hooks.length > 0 ? `Gatillos: ${hooks.join(', ')}` : '',
    ].filter(Boolean).join('\n')
  }).join('\n\n')

  const maxM1 = bot.max_chars_msg1 && bot.max_chars_msg1 > 0 ? bot.max_chars_msg1 : null
  const maxM2 = bot.max_chars_msg2 && bot.max_chars_msg2 > 0 ? bot.max_chars_msg2 : null
  const maxM3 = bot.max_chars_msg3 && bot.max_chars_msg3 > 0 ? bot.max_chars_msg3 : null
  const customPrompt = bot.system_prompt_template?.trim()

  const sentUrlsBlock = sentUrls && sentUrls.length > 0 ? `\n\n---\n\n# 🚫 URLs YA ENVIADAS\n\n${sentUrls.map(u => `- ${u}`).join('\n')}` : ''

  if (customPrompt) {
    const charLimits = (maxM1 || maxM2 || maxM3) ? `\n\n---\n\n# 📏 LÍMITES\n\n- mensaje1: ${!welcomeSent ? 'SIN LÍMITE — primer mensaje completo' : maxM1 ? `máx. ${maxM1} chars` : 'sin límite'}\n- mensaje2: ${maxM2 ? `máx. ${maxM2} chars` : 'sin límite'}\n- mensaje3: ${maxM3 ? `máx. ${maxM3} chars` : 'sin límite'}` : ''
    return `# 👤 CLIENTE\n\n- Nombre: ${nameToUse}\n- Teléfono: ${userPhone?.replace(/^\+/, '') ?? 'desconocido'}\n- Primer mensaje: ${welcomeSent ? 'YA ENVIADO' : 'AÚN NO enviado'}\n\n---\n\n${customPrompt}${charLimits}${sentUrlsBlock}\n\n---\n\n# 🧩 CATÁLOGO\n\n${productBlock}\n\n---\n\n# 📦 FORMATO DE SALIDA\n\nResponde SIEMPRE con JSON exacto:\n\n\`\`\`json\n{\n  "mensaje1": "texto",\n  "mensaje2": "",\n  "mensaje3": "",\n  "fotos_mensaje1": [],\n  "videos_mensaje1": [],\n  "audio_url": "",\n  "reporte": ""\n}\n\`\`\``.trim()
  }

  return `# 👤 CLIENTE\n\n- Nombre: ${nameToUse}\n- Teléfono: ${userPhone?.replace(/^\+/, '') ?? 'desconocido'}\n- Primer mensaje: ${welcomeSent ? 'YA ENVIADO' : 'AÚN NO enviado'}\n\n---\n\n# 🎯 IDENTIDAD\n\nEres ${bot.name}, vendedor profesional de WhatsApp. Amable, directo y humano.\n\n---\n\n# 🧩 CATÁLOGO\n\n${productBlock}${sentUrlsBlock}\n\n---\n\n# 📦 FORMATO DE SALIDA\n\n\`\`\`json\n{\n  "mensaje1": "texto",\n  "mensaje2": "",\n  "mensaje3": "",\n  "fotos_mensaje1": [],\n  "videos_mensaje1": [],\n  "audio_url": "",\n  "reporte": ""\n}\n\`\`\``.trim()
}

// ─── Buffer helper ────────────────────────────────────────────────────────────

interface BufferedMsg { id: string; type: string; content: string; created_at: string }

function combineBufferedMessages(messages: BufferedMsg[]): string {
  return [...messages]
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .map(m => {
      switch (m.type) {
        case 'audio':    return `🎙️ (audio transcrito): ${m.content}`
        case 'image':    return `📷 (imagen analizada): ${m.content}`
        case 'location': return `📍 (ubicación): ${m.content}`
        default:         return `📝 (texto): ${m.content}`
      }
    }).join('\n')
}

// ─── Char limits enforcer ─────────────────────────────────────────────────────

export function enforceCharLimits(
  response: { mensaje1?: string; mensaje2?: string; mensaje3?: string },
  bot: { max_chars_msg1: number | null; max_chars_msg2: number | null; max_chars_msg3: number | null },
): void {
  const m1 = bot.max_chars_msg1 && bot.max_chars_msg1 > 0 ? bot.max_chars_msg1 : null
  const m2 = bot.max_chars_msg2 && bot.max_chars_msg2 > 0 ? bot.max_chars_msg2 : null
  const m3 = bot.max_chars_msg3 && bot.max_chars_msg3 > 0 ? bot.max_chars_msg3 : null
  if (m1 && response.mensaje1 && response.mensaje1.length > m1) response.mensaje1 = response.mensaje1.slice(0, m1)
  if (m2 && response.mensaje2 && response.mensaje2.length > m2) response.mensaje2 = response.mensaje2.slice(0, m2)
  if (m3 && response.mensaje3 && response.mensaje3.length > m3) response.mensaje3 = response.mensaje3.slice(0, m3)
}

// ─── Product detector ─────────────────────────────────────────────────────────

export function detectIdentifiedProduct(
  recentMessages: Array<{ role: string; content: string }>,
  products: Array<Record<string, unknown>>,
): string[] {
  if (!products.length) return []
  const combinedText = recentMessages.map(m => {
    if (m.role === 'assistant') {
      try {
        const p = JSON.parse(m.content) as Record<string, unknown>
        return [p.mensaje1, p.mensaje2, p.mensaje3].filter(Boolean).join(' ')
      } catch { return m.content }
    }
    return m.content
  }).join(' ').toLowerCase()

  return products.filter(p => {
    const name = (p.name as string | undefined)?.trim().toLowerCase()
    return name && name.length > 2 && combinedText.includes(name)
  }).map(p => p.id as string)
}

// ─── Normalize products from Supabase format to engine format ─────────────────

function normalizeProducts(rawProducts: Array<Record<string, unknown>>): Array<Record<string, unknown>> {
  return rawProducts.map(p => {
    const images = (p.product_images as Array<Record<string, unknown>> | null) ?? []
    const testimonials = (p.product_testimonials as Array<Record<string, unknown>> | null) ?? []

    const imageMainUrls = images
      .filter(img => img.image_type === 'product' || img.image_type === 'main' || img.image_type === 'gallery')
      .sort((a, b) => ((a.sort_order as number) || 0) - ((b.sort_order as number) || 0))
      .map(img => img.url as string)

    const productVideoUrls = images
      .filter(img => img.image_type === 'video')
      .map(img => img.url as string)

    const testimonialsVideoUrls = testimonials.map(t => ({
      url: t.url as string,
      label: (t.description as string) || (t.content as string) || '',
      type: t.type === 'video' ? 'video' : 'image',
    }))

    return {
      id:                    p.id,
      name:                  p.name,
      category:              p.category,
      benefits:              p.benefits,
      usage:                 p.usage_instructions,
      warnings:              p.warnings,
      priceUnit:             p.price_unit,
      pricePromo2:           p.price_promo_x2,
      priceSuper6:           p.price_super_x6,
      currency:              p.currency || 'USD',
      firstMessage:          p.first_message,
      firstMessageAudioUrl:  p.first_message_audio_url,
      shippingInfo:          p.shipping_info,
      coverage:              p.coverage,
      hooks:                 Array.isArray(p.hooks) ? p.hooks : [],
      active:                p.is_active,
      imageMainUrls,
      productVideoUrls,
      testimonialsVideoUrls,
    }
  })
}

// ─── Main engine ──────────────────────────────────────────────────────────────

export class BotEngine {
  static async handleWebhook(botId: string, payload: Record<string, unknown>): Promise<void> {

    // 1. Cargar bot con credenciales
    const bot = await (prisma as any).bot.findFirst({
      where: { id: botId },
      include: { bot_secrets: true },
    })
    if (!bot || bot.status !== 'ACTIVE' || !bot.bot_secrets) {
      console.warn(`[BOT] Bot ${botId} no activo o sin credenciales`)
      return
    }
    const secret = bot.bot_secrets

    // 2. Normalizar payload
    const norm = normalizePayload(payload)
    if (!norm) { console.warn(`[BOT] No se pudo normalizar payload`); return }

    const { msgId, userPhone, userName, type } = norm
    console.log(`[BOT] Mensaje de ${userPhone} | Nombre: "${userName || '(sin nombre)'}" | Tipo: ${type}`)

    // 3. Deduplicación por messageId
    if (msgId) {
      const exists = await (prisma as any).message.findFirst({ where: { message_id: msgId }, select: { id: true } })
      if (exists) { console.log(`[BOT] Mensaje duplicado ${msgId}`); return }
    }

    if (!secret.ycloud_api_key_enc) { console.warn(`[BOT] Sin API key de YCloud`); return }
    const apiKey = decrypt(secret.ycloud_api_key_enc as string)

    const resolvedKey = await resolveOpenAIKey(botId)
    if (!resolvedKey) { console.warn(`[BOT] Sin key de OpenAI`); return }
    const openaiKey = resolvedKey.key

    const from        = secret.whatsapp_instance_number as string
    const reportPhone = secret.report_phone as string
    const toPhone     = userPhone.replace(/^\+/, '').replace(/\s/g, '')

    // Verificar si ya compró o bot desactivado
    const existingConv = await (prisma as any).conversation.findFirst({
      where: { bot_id: botId, user_phone: userPhone },
      select: { id: true, updated_at: true, user_name: true, sold: true, bot_disabled: true },
    })

    if (existingConv?.sold) { console.log(`[BOT] ${userPhone} ya compró`); return }
    if (existingConv?.bot_disabled) { console.log(`[BOT] Bot desactivado para ${userPhone}`); return }

    // 4. Marcar como leído
    if (msgId) markAsRead(msgId, apiKey).catch(() => {})

    // 5. Procesar media
    let userText = ''
    let resolvedType: 'text' | 'audio' | 'image' | 'location' = 'text'
    try {
      if (type === 'text') {
        userText = norm.text || ''; resolvedType = 'text'
      } else if (type === 'audio') {
        resolvedType = 'audio'
        userText = norm.audioUrl ? await transcribeAudio(norm.audioUrl, openaiKey) : '[Audio sin URL]'
      } else if (type === 'image') {
        resolvedType = 'image'
        userText = norm.imageUrl ? `[Imagen] ${await analyzeImage(norm.imageUrl, openaiKey)}` : '[Imagen sin URL]'
      } else if (type === 'location') {
        resolvedType = 'location'
        userText = `📍 ${norm.text || ''}`.trim()
        if (norm.locationLat && norm.locationLon) userText += ` | https://maps.google.com/?q=${norm.locationLat},${norm.locationLon}`
      }
    } catch (err) {
      console.error(`[BOT] Error procesando media:`, err)
      userText = '[Error procesando media]'
    }
    if (!userText.trim()) { console.warn(`[BOT] Texto vacío`); return }

    // 6. Upsert conversación
    let conversationId: string
    let welcomeSent = false
    let resolvedUserName: string

    if (existingConv) {
      await (prisma as any).conversation.update({
        where: { id: existingConv.id },
        data: { user_name: norm.userName || existingConv.user_name || undefined, follow_up1_at: null, follow_up1_sent: false, follow_up2_at: null, follow_up2_sent: false },
      })
      conversationId   = existingConv.id
      resolvedUserName = norm.userName || existingConv.user_name || ''
      const bs = await (prisma as any).botState.findUnique({ where: { conversation_id: conversationId }, select: { welcome_sent: true } })
      welcomeSent = bs?.welcome_sent ?? false
    } else {
      const newConv = await (prisma as any).conversation.create({
        data: { bot_id: botId, user_phone: userPhone, user_name: norm.userName || '' },
        select: { id: true },
      })
      conversationId   = newConv.id
      resolvedUserName = norm.userName || ''
      await (prisma as any).botState.create({ data: { conversation_id: conversationId, welcome_sent: false } })
    }

    const arrivedAt = new Date()

    // 7. Guardar en buffer
    await (prisma as any).message.create({
      data: { conversation_id: conversationId, role: 'user', type: resolvedType, content: userText, buffered: true, message_id: msgId || null },
    })
    console.log(`[BOT] Buffer: guardado (${resolvedType}) para ${userPhone}, esperando ${BUFFER_DELAY_MS / 1000}s...`)

    await sleep(BUFFER_DELAY_MS)

    const freshConv = await (prisma as any).conversation.findUnique({ where: { id: conversationId }, select: { updated_at: true } })
    if (freshConv && new Date(freshConv.updated_at) > arrivedAt) {
      console.log(`[BOT] Buffer: cedido al más reciente`); return
    }

    // 8. Cargar + combinar buffer
    const bufferedMsgs = await (prisma as any).message.findMany({
      where: { conversation_id: conversationId, role: 'user', buffered: true },
      orderBy: { created_at: 'asc' },
      select: { id: true, type: true, content: true, created_at: true },
    })
    if (!bufferedMsgs?.length) { console.warn(`[BOT] Buffer vacío`); return }
    console.log(`[BOT] Procesando ${bufferedMsgs.length} mensaje(s) para ${userPhone}`)

    const combinedUserText = combineBufferedMessages(bufferedMsgs as BufferedMsg[])
    await (prisma as any).message.deleteMany({ where: { conversation_id: conversationId, role: 'user', buffered: true } })
    await (prisma as any).message.create({ data: { conversation_id: conversationId, role: 'user', type: 'text', content: combinedUserText, buffered: false } })

    // 11. Historial reciente
    const recentRaw = await (prisma as any).message.findMany({
      where: { conversation_id: conversationId, buffered: false },
      orderBy: { created_at: 'desc' },
      take: MAX_HISTORY_MESSAGES,
      select: { role: true, content: true },
    })
    const recentMessages = (recentRaw ?? []).reverse()
    const chatHistory: ChatMessage[] = recentMessages.map((m: { role: string; content: string }) => {
      if (m.role === 'assistant') {
        try { const p = JSON.parse(m.content) as Record<string, unknown>; return { role: 'assistant' as const, content: [p.mensaje1, p.mensaje2, p.mensaje3].filter(Boolean).join('\n') || m.content } }
        catch { return { role: 'assistant' as const, content: m.content } }
      }
      return { role: m.role as 'user', content: m.content }
    })

    // 12. Cargar productos
    const rawProducts = await (prisma as any).product.findMany({
      where: { bot_id: botId, is_active: true },
      include: { product_images: true, product_testimonials: true },
    })
    const products            = normalizeProducts(rawProducts ?? [])
    const identifiedProductIds = detectIdentifiedProduct(recentMessages, products)

    // 13. URLs ya enviadas
    const allAssistantMsgs = await (prisma as any).message.findMany({
      where: { conversation_id: conversationId, role: 'assistant', buffered: false },
      orderBy: { created_at: 'asc' },
      select: { role: true, content: true },
    })
    const sentUrls = extractSentUrls(allAssistantMsgs ?? [])

    // 14. OpenAI
    const systemPrompt = buildSystemPrompt(bot, products, resolvedUserName, userPhone, identifiedProductIds, sentUrls, welcomeSent)
    let response: BotJsonResponse
    try {
      const aiModel  = (bot.ai_model as string) || 'gpt-4o-mini'
      const aiResult = await chatWithUsage(systemPrompt, chatHistory, openaiKey, aiModel)
      response       = aiResult.response
      if (resolvedKey.isGlobal) logAiUsage({ userId: resolvedKey.userId, service: 'bot-engine', model: aiModel, promptTokens: aiResult.promptTokens, completionTokens: aiResult.completionTokens }).catch(() => {})
    } catch (aiErr: unknown) {
      const msg = aiErr instanceof Error ? aiErr.message : ''
      console.error(`[BOT] OpenAI error:`, msg)
      if (msg.includes('insufficient_quota') || msg.includes('429')) {
        await (prisma as any).bot.update({ where: { id: botId }, data: { status: 'PAUSED' } })
        createUserNotification({ userId: bot.tenant_id, type: 'bot_paused', title: '⚠️ Bot pausado — Sin saldo en OpenAI', message: `El bot "${bot.name}" fue pausado porque tu API key no tiene saldo.`, link: '/bots' }).catch(() => {})
      } else {
        await sendText(from, toPhone, '¡Hola! Recibí tu mensaje, en un momento te atiendo 😊', apiKey).catch(() => {})
      }
      return
    }

    enforceCharLimits(response, bot)
    if (sentUrls.length) {
      const sentSet = new Set(sentUrls)
      response.fotos_mensaje1   = (response.fotos_mensaje1 ?? []).filter((u: string) => !sentSet.has(u))
      response.videos_mensaje1  = (response.videos_mensaje1 ?? []).filter((u: string) => !sentSet.has(u))
    }

    // 16. Enviar
    console.log(`[BOT] Enviando → from=${from} to=${toPhone}`)
    if (response.mensaje1) { await sendText(from, toPhone, response.mensaje1, apiKey).catch(e => console.error('[BOT] sendText m1:', e.message)); await sleep(Math.floor(Math.random() * 1000) + 1000) }
    for (const url of response.fotos_mensaje1 ?? []) { if (url.startsWith('https://')) { await sendImage(from, toPhone, url, apiKey).catch(e => console.error('[BOT] sendImage:', e.message)); await sleep(800) } }
    const videos = Array.isArray(response.videos_mensaje1) ? (response.videos_mensaje1 as unknown[]).filter((v): v is string => typeof v === 'string' && v.startsWith('https://')) : []
    for (const url of videos) { await sendVideo(from, toPhone, url, '', apiKey).catch(e => console.error('[BOT] sendVideo:', e.message)); await sleep(1200) }
    if (response.mensaje2) { await sendText(from, toPhone, response.mensaje2, apiKey).catch(e => console.error('[BOT] sendText m2:', e.message)); await sleep(Math.floor(Math.random() * 1000) + 1000) }
    if (response.mensaje3) { await sendText(from, toPhone, response.mensaje3, apiKey).catch(e => console.error('[BOT] sendText m3:', e.message)) }

    if (response.reporte && reportPhone) {
      await sendText(from, reportPhone.replace(/^\+/, ''), response.reporte, apiKey).catch(e => console.error('[BOT] sendReport:', e.message))
      await (prisma as any).conversation.update({ where: { id: conversationId }, data: { sold: true, sold_at: new Date() } })
      createUserNotification({ userId: bot.tenant_id, type: 'new_sale', title: `🤖 Nueva venta — ${bot.name}`, message: response.reporte.slice(0, 120), link: '/bots' }).catch(() => {})
      console.log(`[BOT] Venta confirmada para ${userPhone}`)
    } else {
      const now = new Date()
      await (prisma as any).conversation.update({
        where: { id: conversationId },
        data: { follow_up1_at: new Date(now.getTime() + ((bot.follow_up1_delay as number) || 15) * 60_000), follow_up1_sent: false, follow_up2_at: new Date(now.getTime() + ((bot.follow_up2_delay as number) || 4320) * 60_000), follow_up2_sent: false },
      })
    }

    // 17. Guardar respuesta asistente
    await (prisma as any).message.create({ data: { conversation_id: conversationId, role: 'assistant', type: 'text', content: JSON.stringify(response), buffered: false } })

    // 18. Actualizar bot state
    if (!welcomeSent && response.mensaje1 && identifiedProductIds.length > 0) {
      await (prisma as any).botState.upsert({ where: { conversation_id: conversationId }, create: { conversation_id: conversationId, welcome_sent: true, welcome_sent_at: new Date() }, update: { welcome_sent: true, welcome_sent_at: new Date() } })
    }
    if (response.reporte) {
      await (prisma as any).botState.upsert({ where: { conversation_id: conversationId }, create: { conversation_id: conversationId, last_intent: 'confirmation', welcome_sent: false }, update: { last_intent: 'confirmation' } })
    }

    console.log(`[BOT] ✓ Respuesta enviada bot=${botId} phone=${userPhone} (${bufferedMsgs.length} msgs)`)
  }
}
