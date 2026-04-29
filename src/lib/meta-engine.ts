/**
 * MetaBotEngine – procesa eventos de Facebook Messenger.
 * Migrado a Prisma (antes usaba Supabase JS).
 */

import { prisma } from './prisma'
import { decrypt } from './crypto'
import { transcribeAudio, analyzeImage, chatWithUsage, ChatMessage, BotJsonResponse } from './openai'
import { sendMetaText, sendMetaImage, sendMetaVideo, markMetaAsRead } from './meta'
import { buildSystemPrompt, detectIdentifiedProduct, enforceCharLimits, extractSentUrls } from './bot-engine'
import { createUserNotification } from './notifications'
import { resolveOpenAIKey, logAiUsage } from './ai-credits'

const BUFFER_DELAY_MS      = 15_000
const MAX_HISTORY_MESSAGES = 6
const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms))

interface NormalizedMeta {
  msgId: string; senderId: string; userName: string
  type: 'text' | 'audio' | 'image'; text?: string; audioUrl?: string; imageUrl?: string
}

function normalizeMetaEvent(event: Record<string, unknown>): NormalizedMeta | null {
  try {
    const sender   = event.sender  as Record<string, unknown>
    const msg      = event.message as Record<string, unknown>
    const senderId = (sender?.id ?? '') as string
    if (!senderId || !msg) return null
    const msgId = (msg.mid ?? '') as string
    if (msg.text && !msg.attachments) return { msgId, senderId, userName: '', type: 'text', text: msg.text as string }
    const attachments = (msg.attachments as Array<Record<string, unknown>>) ?? []
    const att = attachments[0]
    if (!att) return { msgId, senderId, userName: '', type: 'text', text: '' }
    const payload = (att.payload as Record<string, unknown>) ?? {}
    const url     = (payload.url ?? '') as string
    const attType = att.type as string
    if (attType === 'audio') return { msgId, senderId, userName: '', type: 'audio', audioUrl: url }
    if (attType === 'image' || attType === 'video') return { msgId, senderId, userName: '', type: 'image', imageUrl: url }
    return { msgId, senderId, userName: '', type: 'text', text: `[Adjunto: ${attType}]` }
  } catch { return null }
}

function normalizeProducts(rawProducts: Array<Record<string, unknown>>): Array<Record<string, unknown>> {
  return rawProducts.map(p => {
    const images       = (p.product_images as Array<Record<string, unknown>> | null) ?? []
    const testimonials = (p.product_testimonials as Array<Record<string, unknown>> | null) ?? []
    return {
      id: p.id, name: p.name, category: p.category,
      benefits: p.benefits, usage: p.usage_instructions, warnings: p.warnings,
      priceUnit: p.price_unit, pricePromo2: p.price_promo_x2, priceSuper6: p.price_super_x6,
      currency: p.currency || 'USD', firstMessage: p.first_message, firstMessageAudioUrl: p.first_message_audio_url,
      shippingInfo: p.shipping_info, coverage: p.coverage,
      hooks: Array.isArray(p.hooks) ? p.hooks : [], active: p.is_active,
      imageMainUrls: images.filter(i => ['product','main','gallery'].includes(i.image_type as string))
        .sort((a, b) => ((a.sort_order as number)||0) - ((b.sort_order as number)||0)).map(i => i.url),
      productVideoUrls: images.filter(i => i.image_type === 'video').map(i => i.url),
      testimonialsVideoUrls: testimonials.map(t => ({ url: t.url, label: (t.description as string)||'', type: t.type === 'video' ? 'video' : 'image' })),
    }
  })
}

export class MetaBotEngine {
  static async handleEvent(botId: string, event: Record<string, unknown>): Promise<void> {
    const bot = await (prisma as any).bot.findFirst({ where: { id: botId }, include: { bot_secrets: true } })
    if (!bot || bot.status !== 'ACTIVE' || !bot.bot_secrets) return
    const secret = bot.bot_secrets
    if (!secret.meta_page_token_enc) { console.warn(`[META] Bot ${botId} sin Page Token`); return }
    const pageToken  = decrypt(secret.meta_page_token_enc as string)
    const resolvedKey = await resolveOpenAIKey(botId)
    if (!resolvedKey) return
    const openaiKey = resolvedKey.key
    const norm = normalizeMetaEvent(event)
    if (!norm) return
    const { msgId, senderId, type } = norm

    if (msgId) {
      const exists = await (prisma as any).message.findFirst({ where: { message_id: msgId }, select: { id: true } })
      if (exists) return
    }

    const existingConv = await (prisma as any).conversation.findFirst({
      where: { bot_id: botId, user_phone: senderId },
      select: { id: true, updated_at: true, user_name: true, sold: true, bot_disabled: true },
    })
    if (existingConv?.sold || existingConv?.bot_disabled) return
    markMetaAsRead(senderId, pageToken).catch(() => {})

    let userText = '', resolvedType: 'text' | 'audio' | 'image' = 'text'
    try {
      if (type === 'text')       { userText = norm.text || ''; resolvedType = 'text' }
      else if (type === 'audio' && norm.audioUrl) { resolvedType = 'audio'; userText = await transcribeAudio(norm.audioUrl, openaiKey) }
      else if (type === 'image' && norm.imageUrl) { resolvedType = 'image'; userText = `[Imagen] ${await analyzeImage(norm.imageUrl, openaiKey)}` }
    } catch { userText = norm.text || '[Mensaje]' }
    if (!userText.trim()) return

    let conversationId: string, welcomeSent = false, resolvedUserName = ''
    if (existingConv) {
      await (prisma as any).conversation.update({ where: { id: existingConv.id }, data: { follow_up1_at: null, follow_up1_sent: false, follow_up2_at: null, follow_up2_sent: false } })
      conversationId   = existingConv.id
      resolvedUserName = existingConv.user_name || ''
      const bs = await (prisma as any).botState.findUnique({ where: { conversation_id: conversationId }, select: { welcome_sent: true } })
      welcomeSent = bs?.welcome_sent ?? false
    } else {
      const nc = await (prisma as any).conversation.create({ data: { bot_id: botId, user_phone: senderId, user_name: '' }, select: { id: true } })
      conversationId = nc.id
      await (prisma as any).botState.create({ data: { conversation_id: conversationId, welcome_sent: false } })
    }

    const arrivedAt = new Date()
    await (prisma as any).message.create({ data: { conversation_id: conversationId, role: 'user', type: resolvedType, content: userText, buffered: true, message_id: msgId || null } })
    await sleep(BUFFER_DELAY_MS)

    const freshConv = await (prisma as any).conversation.findUnique({ where: { id: conversationId }, select: { updated_at: true } })
    if (freshConv && new Date(freshConv.updated_at) > arrivedAt) return

    const bufferedMsgs = await (prisma as any).message.findMany({ where: { conversation_id: conversationId, role: 'user', buffered: true }, orderBy: { created_at: 'asc' }, select: { type: true, content: true } })
    if (!bufferedMsgs?.length) return

    const combinedText = bufferedMsgs.map((m: { type: string; content: string }) => {
      if (m.type === 'audio') return `🎙️ (audio): ${m.content}`
      if (m.type === 'image') return `📷 (imagen): ${m.content}`
      return `📝 (texto): ${m.content}`
    }).join('\n')

    await (prisma as any).message.deleteMany({ where: { conversation_id: conversationId, role: 'user', buffered: true } })
    await (prisma as any).message.create({ data: { conversation_id: conversationId, role: 'user', type: 'text', content: combinedText, buffered: false } })

    const recentRaw = await (prisma as any).message.findMany({ where: { conversation_id: conversationId, buffered: false }, orderBy: { created_at: 'desc' }, take: MAX_HISTORY_MESSAGES, select: { role: true, content: true } })
    const recentMessages = (recentRaw ?? []).reverse()
    const chatHistory: ChatMessage[] = recentMessages.map((m: { role: string; content: string }) => {
      if (m.role === 'assistant') { try { const p = JSON.parse(m.content); return { role: 'assistant' as const, content: [p.mensaje1, p.mensaje2, p.mensaje3].filter(Boolean).join('\n') || m.content } } catch { return { role: 'assistant' as const, content: m.content } } }
      return { role: m.role as 'user', content: m.content }
    })

    const rawProds = await (prisma as any).product.findMany({ where: { bot_id: botId, is_active: true }, include: { product_images: true, product_testimonials: true } })
    const products            = normalizeProducts(rawProds ?? [])
    const identifiedProductIds = detectIdentifiedProduct(recentMessages, products)
    const allAsst  = await (prisma as any).message.findMany({ where: { conversation_id: conversationId, role: 'assistant', buffered: false }, orderBy: { created_at: 'asc' }, select: { role: true, content: true } })
    const sentUrls = extractSentUrls(allAsst ?? [])
    const systemPrompt = buildSystemPrompt(bot, products, resolvedUserName, senderId, identifiedProductIds, sentUrls, welcomeSent)

    let response: BotJsonResponse
    try {
      const aiModel  = (bot.ai_model as string) || 'gpt-4o-mini'
      const aiResult = await chatWithUsage(systemPrompt, chatHistory, openaiKey, aiModel)
      response       = aiResult.response
      if (resolvedKey.isGlobal) logAiUsage({ userId: resolvedKey.userId, service: 'meta-engine', model: aiModel, promptTokens: aiResult.promptTokens, completionTokens: aiResult.completionTokens }).catch(() => {})
    } catch { await sendMetaText(senderId, '¡Hola! Recibí tu mensaje, en un momento te atiendo 😊', pageToken).catch(() => {}); return }

    enforceCharLimits(response, bot)
    if (sentUrls.length) { const s = new Set(sentUrls); response.fotos_mensaje1 = (response.fotos_mensaje1 ?? []).filter(u => !s.has(u)); response.videos_mensaje1 = (response.videos_mensaje1 ?? []).filter(u => !s.has(u)) }

    if (response.mensaje1) { await sendMetaText(senderId, response.mensaje1, pageToken).catch(() => {}); await sleep(800) }
    for (const url of response.fotos_mensaje1 ?? []) { if (url.startsWith('https://')) { await sendMetaImage(senderId, url, pageToken).catch(() => {}); await sleep(600) } }
    for (const url of (response.videos_mensaje1 ?? []) as string[]) { if (url.startsWith('https://')) { await sendMetaVideo(senderId, url, pageToken).catch(() => {}); await sleep(1000) } }
    if (response.mensaje2) { await sendMetaText(senderId, response.mensaje2, pageToken).catch(() => {}); await sleep(800) }
    if (response.mensaje3) await sendMetaText(senderId, response.mensaje3, pageToken).catch(() => {})

    if (response.reporte) {
      await (prisma as any).conversation.update({ where: { id: conversationId }, data: { sold: true, sold_at: new Date() } })
      createUserNotification({ userId: bot.tenant_id, type: 'new_sale', title: `🤖 Nueva venta — ${bot.name}`, message: response.reporte.slice(0, 120), link: '/bots' }).catch(() => {})
    } else {
      const now = new Date()
      await (prisma as any).conversation.update({ where: { id: conversationId }, data: { follow_up1_at: new Date(now.getTime() + ((bot.follow_up1_delay as number)||15)*60_000), follow_up1_sent: false, follow_up2_at: new Date(now.getTime() + ((bot.follow_up2_delay as number)||4320)*60_000), follow_up2_sent: false } })
    }

    await (prisma as any).message.create({ data: { conversation_id: conversationId, role: 'assistant', type: 'text', content: JSON.stringify(response), buffered: false } })
    if (!welcomeSent && response.mensaje1 && identifiedProductIds.length > 0) await (prisma as any).botState.upsert({ where: { conversation_id: conversationId }, create: { conversation_id: conversationId, welcome_sent: true, welcome_sent_at: new Date() }, update: { welcome_sent: true, welcome_sent_at: new Date() } })
    if (response.reporte) await (prisma as any).botState.upsert({ where: { conversation_id: conversationId }, create: { conversation_id: conversationId, last_intent: 'confirmation', welcome_sent: false }, update: { last_intent: 'confirmation' } })
  }
}
