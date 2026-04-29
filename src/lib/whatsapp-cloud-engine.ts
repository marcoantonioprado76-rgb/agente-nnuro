/**
 * WhatsAppCloudEngine – procesa mensajes de WhatsApp Business Cloud API (Meta oficial).
 * Migrado a Prisma (antes usaba Supabase JS).
 */

import { prisma } from './prisma'
import { decrypt } from './crypto'
import { transcribeAudio, analyzeImage, chatWithUsage, ChatMessage, BotJsonResponse } from './openai'
import { sendWaText, sendWaImage, sendWaVideo, markWaAsRead } from './whatsapp-cloud'
import { buildSystemPrompt, detectIdentifiedProduct, enforceCharLimits, extractSentUrls } from './bot-engine'
import { createUserNotification } from './notifications'
import { resolveOpenAIKey, logAiUsage } from './ai-credits'

const BUFFER_DELAY_MS   = 15_000
const MAX_HISTORY_MESSAGES = 6
const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms))

function normalizeProducts(rawProducts: Array<Record<string, unknown>>): Array<Record<string, unknown>> {
  return rawProducts.map(p => {
    const images       = (p.product_images as Array<Record<string, unknown>> | null) ?? []
    const testimonials = (p.product_testimonials as Array<Record<string, unknown>> | null) ?? []
    return {
      id: p.id, name: p.name, category: p.category,
      benefits: p.benefits, usage: p.usage_instructions, warnings: p.warnings,
      priceUnit: p.price_unit, pricePromo2: p.price_promo_x2, priceSuper6: p.price_super_x6,
      currency: p.currency || 'USD', firstMessage: p.first_message,
      firstMessageAudioUrl: p.first_message_audio_url,
      shippingInfo: p.shipping_info, coverage: p.coverage,
      hooks: Array.isArray(p.hooks) ? p.hooks : [], active: p.is_active,
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

async function fetchWaMediaUrl(mediaId: string, token: string): Promise<string | null> {
  try {
    const res = await fetch(`https://graph.facebook.com/v20.0/${mediaId}`, { headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) return null
    const data = await res.json() as { url?: string }
    return data.url ?? null
  } catch { return null }
}

export class WhatsAppCloudEngine {
  static async handleMessage(
    botId: string,
    msg: Record<string, unknown>,
    contacts: Array<Record<string, unknown>>,
  ): Promise<void> {
    const bot = await (prisma as any).bot.findFirst({
      where: { id: botId },
      include: { bot_secrets: true },
    })
    if (!bot || bot.status !== 'ACTIVE' || !bot.bot_secrets) return

    const secret = bot.bot_secrets
    if (!secret.meta_page_token_enc || !secret.meta_phone_number_id) {
      console.warn(`[WA_CLOUD] Bot ${botId} sin token o phoneId`); return
    }

    const waToken     = decrypt(secret.meta_page_token_enc as string)
    const phoneId     = secret.meta_phone_number_id as string
    const reportPhone = secret.report_phone as string

    const resolvedKey = await resolveOpenAIKey(botId)
    if (!resolvedKey) return
    const openaiKey = resolvedKey.key

    const msgId    = (msg.id ?? '') as string
    const userPhone = (msg.from ?? '') as string
    const msgType  = (msg.type ?? 'text') as string
    const contact  = contacts.find(c => (c.wa_id as string) === userPhone) as Record<string, unknown> | undefined
    const userName = (((contact?.profile as Record<string, unknown>)?.name) ?? '') as string
    if (!userPhone) return

    if (msgId) {
      const exists = await (prisma as any).message.findFirst({ where: { message_id: msgId }, select: { id: true } })
      if (exists) return
    }

    const existingConv = await (prisma as any).conversation.findFirst({
      where: { bot_id: botId, user_phone: userPhone },
      select: { id: true, updated_at: true, user_name: true, sold: true, bot_disabled: true },
    })
    if (existingConv?.sold || existingConv?.bot_disabled) return

    if (msgId) markWaAsRead(msgId, phoneId, waToken).catch(() => {})

    let userText = '', resolvedType: 'text' | 'audio' | 'image' = 'text'
    try {
      if (msgType === 'text') {
        userText = ((msg.text as Record<string, unknown>)?.body ?? '') as string; resolvedType = 'text'
      } else if (msgType === 'audio' || msgType === 'voice') {
        resolvedType = 'audio'
        const audioId = ((msg.audio ?? msg.voice ?? {}) as Record<string, unknown>).id as string
        if (audioId) {
          const mediaUrl = await fetchWaMediaUrl(audioId, waToken)
          userText = mediaUrl ? await transcribeAudio(mediaUrl, openaiKey) : '[Audio sin URL]'
        }
      } else if (msgType === 'image') {
        resolvedType = 'image'
        const imgId = ((msg.image ?? {}) as Record<string, unknown>).id as string
        if (imgId) {
          const imgUrl = await fetchWaMediaUrl(imgId, waToken)
          userText = imgUrl ? `[Imagen] ${await analyzeImage(imgUrl, openaiKey)}` : '[Imagen]'
        }
      } else if (msgType === 'location') {
        const loc = msg.location as Record<string, unknown> | undefined
        userText = `📍 Ubicación: https://maps.google.com/?q=${loc?.latitude},${loc?.longitude}`
        resolvedType = 'text'
      }
    } catch { userText = '[Mensaje]' }
    if (!userText.trim()) return

    let conversationId: string, welcomeSent = false, resolvedUserName = ''

    if (existingConv) {
      await (prisma as any).conversation.update({
        where: { id: existingConv.id },
        data: { user_name: userName || existingConv.user_name || undefined, follow_up1_at: null, follow_up1_sent: false, follow_up2_at: null, follow_up2_sent: false },
      })
      conversationId   = existingConv.id
      resolvedUserName = userName || existingConv.user_name || ''
      const bs = await (prisma as any).botState.findUnique({ where: { conversation_id: conversationId }, select: { welcome_sent: true } })
      welcomeSent = bs?.welcome_sent ?? false
    } else {
      const nc = await (prisma as any).conversation.create({
        data: { bot_id: botId, user_phone: userPhone, user_name: userName || '' },
        select: { id: true },
      })
      conversationId   = nc.id
      resolvedUserName = userName
      await (prisma as any).botState.create({ data: { conversation_id: conversationId, welcome_sent: false } })
    }

    const arrivedAt = new Date()
    await (prisma as any).message.create({ data: { conversation_id: conversationId, role: 'user', type: resolvedType, content: userText, buffered: true, message_id: msgId || null } })

    await sleep(BUFFER_DELAY_MS)

    const freshConv = await (prisma as any).conversation.findUnique({ where: { id: conversationId }, select: { updated_at: true } })
    if (freshConv && new Date(freshConv.updated_at) > arrivedAt) return

    const bufferedMsgs = await (prisma as any).message.findMany({
      where: { conversation_id: conversationId, role: 'user', buffered: true },
      orderBy: { created_at: 'asc' },
      select: { id: true, type: true, content: true },
    })
    if (!bufferedMsgs?.length) return

    const combinedText = bufferedMsgs.map((m: { type: string; content: string }) => {
      if (m.type === 'audio') return `🎙️ (audio): ${m.content}`
      if (m.type === 'image') return `📷 (imagen): ${m.content}`
      return `📝 (texto): ${m.content}`
    }).join('\n')

    await (prisma as any).message.deleteMany({ where: { conversation_id: conversationId, role: 'user', buffered: true } })
    await (prisma as any).message.create({ data: { conversation_id: conversationId, role: 'user', type: 'text', content: combinedText, buffered: false } })

    const recentRaw = await (prisma as any).message.findMany({
      where: { conversation_id: conversationId, buffered: false },
      orderBy: { created_at: 'desc' },
      take: MAX_HISTORY_MESSAGES,
      select: { role: true, content: true },
    })
    const recentMessages = (recentRaw ?? []).reverse()
    const chatHistory: ChatMessage[] = recentMessages.map((m: { role: string; content: string }) => {
      if (m.role === 'assistant') {
        try { const p = JSON.parse(m.content); return { role: 'assistant' as const, content: [p.mensaje1, p.mensaje2, p.mensaje3].filter(Boolean).join('\n') || m.content } }
        catch { return { role: 'assistant' as const, content: m.content } }
      }
      return { role: m.role as 'user', content: m.content }
    })

    const rawProds = await (prisma as any).product.findMany({
      where: { bot_id: botId, is_active: true },
      include: { product_images: true, product_testimonials: true },
    })
    const products            = normalizeProducts(rawProds ?? [])
    const identifiedProductIds = detectIdentifiedProduct(recentMessages, products)

    const allAsst = await (prisma as any).message.findMany({
      where: { conversation_id: conversationId, role: 'assistant', buffered: false },
      orderBy: { created_at: 'asc' },
      select: { role: true, content: true },
    })
    const sentUrls     = extractSentUrls(allAsst ?? [])
    const systemPrompt = buildSystemPrompt(bot, products, resolvedUserName, userPhone, identifiedProductIds, sentUrls, welcomeSent)

    let response: BotJsonResponse
    try {
      const aiModel  = (bot.ai_model as string) || 'gpt-4o-mini'
      const aiResult = await chatWithUsage(systemPrompt, chatHistory, openaiKey, aiModel)
      response       = aiResult.response
      if (resolvedKey.isGlobal) logAiUsage({ userId: resolvedKey.userId, service: 'wa-cloud-engine', model: aiModel, promptTokens: aiResult.promptTokens, completionTokens: aiResult.completionTokens }).catch(() => {})
    } catch {
      await sendWaText(userPhone.replace(/^\+/, ''), '¡Hola! Recibí tu mensaje, en un momento te atiendo 😊', phoneId, waToken).catch(() => {})
      return
    }

    enforceCharLimits(response, bot)
    const toPhone = userPhone.replace(/^\+/, '').replace(/\s/g, '')

    if (response.mensaje1) { await sendWaText(toPhone, response.mensaje1, phoneId, waToken).catch(() => {}); await sleep(800) }
    for (const url of response.fotos_mensaje1 ?? []) { if (url.startsWith('https://')) { await sendWaImage(toPhone, url, phoneId, waToken).catch(() => {}); await sleep(600) } }
    for (const url of (response.videos_mensaje1 ?? []) as string[]) { if (url.startsWith('https://')) { await sendWaVideo(toPhone, url, phoneId, waToken).catch(() => {}); await sleep(1000) } }
    if (response.mensaje2) { await sendWaText(toPhone, response.mensaje2, phoneId, waToken).catch(() => {}); await sleep(800) }
    if (response.mensaje3) await sendWaText(toPhone, response.mensaje3, phoneId, waToken).catch(() => {})

    if (response.reporte && reportPhone) {
      const rPhone = reportPhone.replace(/^\+/, '').replace(/\s/g, '')
      await sendWaText(rPhone, response.reporte, phoneId, waToken).catch(() => {})
      await (prisma as any).conversation.update({ where: { id: conversationId }, data: { sold: true, sold_at: new Date() } })
      createUserNotification({ userId: bot.tenant_id, type: 'new_sale', title: `🤖 Nueva venta — ${bot.name}`, message: response.reporte.slice(0, 120), link: '/bots' }).catch(() => {})
    } else {
      const now = new Date()
      await (prisma as any).conversation.update({
        where: { id: conversationId },
        data: {
          follow_up1_at:   new Date(now.getTime() + ((bot.follow_up1_delay as number) || 15) * 60_000),
          follow_up1_sent: false,
          follow_up2_at:   new Date(now.getTime() + ((bot.follow_up2_delay as number) || 4320) * 60_000),
          follow_up2_sent: false,
        },
      })
    }

    await (prisma as any).message.create({ data: { conversation_id: conversationId, role: 'assistant', type: 'text', content: JSON.stringify(response), buffered: false } })

    if (!welcomeSent && response.mensaje1 && identifiedProductIds.length > 0) {
      await (prisma as any).botState.upsert({ where: { conversation_id: conversationId }, create: { conversation_id: conversationId, welcome_sent: true, welcome_sent_at: new Date() }, update: { welcome_sent: true, welcome_sent_at: new Date() } })
    }
    if (response.reporte) {
      await (prisma as any).botState.upsert({ where: { conversation_id: conversationId }, create: { conversation_id: conversationId, last_intent: 'confirmation', welcome_sent: false }, update: { last_intent: 'confirmation' } })
    }
  }
}
