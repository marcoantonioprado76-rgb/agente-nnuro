/**
 * Broadcast Worker — envía mensajes masivos de WhatsApp por Baileys
 * con delay configurable entre contactos e imagen opcional.
 * Versión simplificada: solo Baileys, solo texto + imagen.
 */

import { prisma } from '@/lib/prisma'
import { BaileysManager } from '@/lib/baileys-manager'
import { decrypt as decryptAds } from '@/lib/ads/encryption'
import { resolveOpenAIKey, chargeForChatUsage } from '@/lib/ai-credits'

const ADS_ENC_KEY = process.env.ADS_ENCRYPTION_KEY || ''

const OPENAI_BASE = 'https://api.openai.com/v1'

async function generateUniqueMessage(
    prompt: string,
    apiKey: string,
    botRules?: string | null,
    messageExample?: string | null,
): Promise<{ text: string; promptTokens: number; completionTokens: number }> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)

    const systemContent = [
        botRules?.trim() ? `REGLAS Y PERSONALIDAD DEL BOT:\n${botRules.trim()}` : null,
        `Eres un experto en ventas por WhatsApp. Genera mensajes cortos, cálidos y únicos.
REGLAS:
- NUNCA uses el nombre del contacto, el mensaje debe ser genérico
- Incluir emojis estratégicamente
- NUNCA generar el mismo mensaje dos veces`,
        messageExample?.trim()
            ? `EJEMPLAR DE REFERENCIA (seguí este estilo exacto, pero con contenido diferente):\n"${messageExample.trim()}"`
            : null,
    ].filter(Boolean).join('\n\n')

    const userContent = messageExample?.trim()
        ? `Genera un mensaje de WhatsApp único para este tema: "${prompt}". Seguí el estilo del ejemplar pero con contenido completamente diferente. Solo el mensaje, sin comillas ni explicaciones.`
        : `Genera un mensaje de WhatsApp único basado en: "${prompt}". Sin nombres propios. Solo el mensaje, sin comillas ni explicaciones.`

    try {
        const res = await fetch(`${OPENAI_BASE}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
            signal: controller.signal,
            body: JSON.stringify({
                model: 'gpt-4o',
                messages: [
                    { role: 'system', content: systemContent },
                    { role: 'user', content: userContent },
                ],
                temperature: 1.0,
                max_tokens: 200,
            }),
        })
        if (!res.ok) throw new Error(`OpenAI error: ${res.status}`)
        const data = await res.json()
        return {
            text: data.choices?.[0]?.message?.content?.trim() || prompt,
            promptTokens: data.usage?.prompt_tokens ?? 0,
            completionTokens: data.usage?.completion_tokens ?? 0,
        }
    } finally {
        clearTimeout(timeout)
    }
}

async function getOpenAIKey(userId: string): Promise<string> {
    const oaiConfig = await (prisma as any).openAIConfig.findUnique({ where: { userId } })
    if (oaiConfig?.isValid && oaiConfig.apiKeyEnc) {
        try { return decryptAds(oaiConfig.apiKeyEnc, ADS_ENC_KEY) } catch {}
    }
    // Fallback 1: global key from AppSetting
    const setting = await (prisma as any).appSetting.findUnique({ where: { key: 'openai_global_key' } })
    if (setting?.value) {
        try { return decryptAds(setting.value, ADS_ENC_KEY) } catch {}
    }
    // Fallback 2: AdminConfig.openaiKeyEnc (legacy del panel /admin/ai-credits)
    const adminCfg = await (prisma as any).adminConfig.findUnique({ where: { id: 'global' } })
    if (adminCfg?.openaiKeyEnc) {
        try { return decryptAds(adminCfg.openaiKeyEnc, ADS_ENC_KEY) } catch {}
    }
    return ''
}

function delayMs(value: number, unit: string): number {
    if (unit === 'minutes') return value * 60 * 1000
    return value * 1000
}

// Jitter anti-ban: aleatoriza el delay ±40% para que el envío no tenga un
// patrón fijo (cada 30s exactos) que WhatsApp pueda detectar.
function jitter(baseMs: number): number {
    const factor = 0.6 + Math.random() * 0.8 // 0.6 .. 1.4
    return Math.round(baseMs * factor)
}

// Tope de envíos por día por campaña (anti-ban). Al alcanzarlo la campaña se
// pausa; continúa al reanudarla (o el día siguiente con recurrencia).
const DAILY_CAP = 300

function startOfToday(): Date {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
}

// Próxima fecha de envío recurrente. daysCSV = días 0-6 (0=domingo) en hora
// Bolivia (UTC-4), hhmm = "HH:mm". Devuelve el próximo instante UTC > from.
const BOLIVIA_OFFSET = 4 * 60 * 60 * 1000
export function computeNextRun(daysCSV: string | null, hhmm: string | null, from: Date): Date | null {
    if (!daysCSV || !hhmm) return null
    const days = daysCSV.split(',').map(s => parseInt(s.trim(), 10)).filter(n => n >= 0 && n <= 6)
    if (!days.length) return null
    const [h, m] = hhmm.split(':').map(n => parseInt(n, 10))
    if (isNaN(h) || isNaN(m)) return null
    for (let i = 0; i < 8; i++) {
        const bNow = new Date(from.getTime() - BOLIVIA_OFFSET)
        const cand = new Date(Date.UTC(bNow.getUTCFullYear(), bNow.getUTCMonth(), bNow.getUTCDate() + i, h, m, 0, 0))
        const candUtc = new Date(cand.getTime() + BOLIVIA_OFFSET)
        if (days.includes(cand.getUTCDay()) && candUtc.getTime() > from.getTime()) return candUtc
    }
    return null
}

// Guard de concurrencia: campañas que se están ejecutando AHORA en este proceso.
// Evita doble envío si la misma campaña la disparan a la vez el scheduler, el
// reanude de arranque y/o un /execute manual.
const _running = new Set<string>()

export async function executeBroadcast(campaignId: string) {
    if (_running.has(campaignId)) {
        console.warn(`[BROADCAST] Campaña ${campaignId} ya en ejecución en este proceso, omitiendo`)
        return
    }
    _running.add(campaignId)
    try {
        await _runBroadcast(campaignId)
    } finally {
        _running.delete(campaignId)
    }
}

async function _runBroadcast(campaignId: string) {
    const campaign = await (prisma as any).broadcastCampaign.findUnique({
        where: { id: campaignId },
        include: {
            images: { orderBy: { order: 'asc' } },
            contacts: { where: { status: 'PENDING', optedOut: false }, orderBy: { createdAt: 'asc' } },
            bot: { select: { systemPromptTemplate: true } },
        },
    })

    if (!campaign || campaign.status === 'COMPLETED' || campaign.status === 'FAILED') return

    await (prisma as any).broadcastCampaign.update({
        where: { id: campaignId },
        data: { status: 'RUNNING', startedAt: new Date() },
    })

    // Key inicial (sin cobro) sólo para reconectar Baileys si hace falta.
    // El cobro real ocurre antes de cada generateUniqueMessage dentro del loop.
    const reconnectKey = await getOpenAIKey(campaign.userId)

    // Auto-reconnect Baileys si hay sesión en disco pero no en memoria
    const currentStatus = BaileysManager.getStatus(campaign.botId)
    if (currentStatus.status !== 'connected') {
        await BaileysManager.connect(campaign.botId, campaign.name, reconnectKey, '')
        for (let i = 0; i < 20; i++) {
            await new Promise(r => setTimeout(r, 1000))
            if (BaileysManager.getStatus(campaign.botId).status === 'connected') break
        }
    }
    if (BaileysManager.getStatus(campaign.botId).status !== 'connected') {
        await (prisma as any).broadcastCampaign.update({ where: { id: campaignId }, data: { status: 'FAILED' } })
        console.error(`[BROADCAST] Bot ${campaign.botId} no conectado. Campaña ${campaignId} marcada como FAILED.`)
        return
    }

    const images: any[] = campaign.images || []
    let imageIndex: number = campaign.imageIndex || 0
    const delayBetween = delayMs(campaign.delayValue, campaign.delayUnit)

    // Imagen fija para este envío (recurrencia con imagen elegida). Si está,
    // se manda LA MISMA a todos (sin rotar). Si no, se rota como siempre.
    const fixedImage = campaign.recurrenceImageId
        ? images.find((im: any) => im.id === campaign.recurrenceImageId) || null
        : null

    // Tope diario anti-ban: cuántos ya se enviaron hoy en esta campaña.
    let sentToday = await (prisma as any).broadcastLog.count({
        where: { campaignId, status: 'SENT', sentAt: { gte: startOfToday() } },
    })

    for (const contact of campaign.contacts) {
        // Verificar si la campaña fue pausada/cancelada
        const fresh = await (prisma as any).broadcastCampaign.findUnique({
            where: { id: campaignId },
            select: { status: true },
        })
        if (fresh?.status === 'PAUSED' || fresh?.status === 'FAILED') break

        // Verificar que el contacto sigue en PENDING
        const stillExists = await (prisma as any).broadcastContact.findUnique({
            where: { id: contact.id },
            select: { id: true, status: true },
        })
        if (!stillExists || stillExists.status !== 'PENDING') continue

        // Tope diario anti-ban: si se alcanzó, pausar (continúa al reanudar / próximo día)
        if (sentToday >= DAILY_CAP) {
            await (prisma as any).broadcastCampaign.update({
                where: { id: campaignId }, data: { status: 'PAUSED' },
            })
            console.warn(`[BROADCAST] Tope diario (${DAILY_CAP}) alcanzado en campaña ${campaignId}. Pausada.`)
            break
        }

        try {
            const conn = BaileysManager.getStatus(campaign.botId)
            if (conn.status !== 'connected') {
                await (prisma as any).broadcastContact.update({
                    where: { id: contact.id },
                    data: { status: 'FAILED', error: 'Bot desconectado', sentAt: new Date() },
                })
                await (prisma as any).broadcastCampaign.update({
                    where: { id: campaignId },
                    data: { failedCount: { increment: 1 } },
                })
                continue
            }

            // Resolver key (NO cobra — el cobro va por tokens reales después)
            const resolved = await resolveOpenAIKey(campaign.userId)

            let generated: string
            if (resolved.ok) {
                try {
                    const result = await generateUniqueMessage(
                        campaign.prompt, resolved.key,
                        campaign.bot?.systemPromptTemplate,
                        campaign.messageExample,
                    )
                    generated = result.text
                    // Cobrar tokens reales solo si admin key
                    if (resolved.source === 'admin') {
                        chargeForChatUsage(campaign.userId, 'gpt-4o', result.promptTokens, result.completionTokens, 'broadcast.message', { campaignId, contactId: contact.id })
                            .catch(e => console.error('[BROADCAST] charge error:', e))
                    }
                } catch (e) {
                    // Fallback al prompt fijo si la llamada falla. Sin pre-cobro no hay refund.
                    console.warn(`[BROADCAST] AI falló para ${contact.phone}, usando prompt fijo:`, (e as any)?.message)
                    generated = campaign.messageExample?.trim() || campaign.prompt?.trim() || ''
                }
            } else {
                // Sin saldo o sin key → enviar el prompt fijo en lugar de IA personalizada
                if (resolved.error === 'NO_CREDITS') {
                    console.warn(`[BROADCAST] Sin saldo IA para usuario ${campaign.userId} — enviando prompt fijo`)
                }
                generated = campaign.messageExample?.trim() || campaign.prompt?.trim() || ''
            }

            // Con imagen fija no se rota; sin ella, se rota como siempre
            const nextIndex = (!fixedImage && images.length > 0) ? (imageIndex + 1) % images.length : imageIndex
            let logImageUrl: string | null = null

            // Enviar imagen: la fija (recurrencia) o la rotativa
            const imgToSend = fixedImage || (images.length > 0 ? images[imageIndex % images.length] : null)
            if (imgToSend) {
                logImageUrl = imgToSend.url
                await BaileysManager.sendImage(campaign.botId, contact.phone, imgToSend.url).catch(() => {})
                await new Promise(r => setTimeout(r, 1500))
            }

            // Enviar texto con pie de baja (opt-out — reduce reportes de spam)
            const finalText = `${generated}\n\n_Respondé *BAJA* para no recibir más mensajes._`
            const sent = await BaileysManager.sendText(campaign.botId, contact.phone, finalText)
            if (!sent) throw new Error('sendText retornó false')

            await (prisma as any).broadcastContact.update({
                where: { id: contact.id },
                data: { status: 'SENT', sentAt: new Date() },
            })
            await (prisma as any).broadcastLog.create({
                data: {
                    campaignId,
                    phone: contact.phone,
                    name: contact.name || null,
                    message: generated,
                    imageUrl: logImageUrl,
                    status: 'SENT',
                },
            })
            await (prisma as any).broadcastCampaign.update({
                where: { id: campaignId },
                data: { sentCount: { increment: 1 }, imageIndex: nextIndex },
            })
            imageIndex = nextIndex
            sentToday++
        } catch (err: any) {
            await (prisma as any).broadcastContact.update({
                where: { id: contact.id },
                data: { status: 'FAILED', error: err.message || 'Error desconocido', sentAt: new Date() },
            })
            await (prisma as any).broadcastLog.create({
                data: {
                    campaignId,
                    phone: contact.phone,
                    name: contact.name || null,
                    message: '',
                    status: 'FAILED',
                    error: err.message || 'Error desconocido',
                },
            })
            await (prisma as any).broadcastCampaign.update({
                where: { id: campaignId },
                data: { failedCount: { increment: 1 } },
            })
        }

        await new Promise(r => setTimeout(r, jitter(delayBetween)))
    }

    const finalCampaign = await (prisma as any).broadcastCampaign.findUnique({
        where: { id: campaignId },
        select: { status: true },
    })
    if (finalCampaign?.status === 'RUNNING') {
        await (prisma as any).broadcastCampaign.update({
            where: { id: campaignId },
            data: { status: 'COMPLETED', completedAt: new Date() },
        })
    }
}

// Dispara las campañas RECURRENTES cuyo próximo envío ya llegó: resetea la
// lista (sin tocar los dados de baja) y la reejecuta, y agenda la siguiente.
export async function runRecurringDue() {
    const now = new Date()
    const due = await (prisma as any).broadcastCampaign.findMany({
        where: { recurring: true, nextRunAt: { lte: now }, status: { not: 'RUNNING' } },
        select: { id: true, recurrenceDays: true, recurrenceTime: true },
    })
    for (const c of due) {
        try {
            // Reutiliza la MISMA lista: todo a PENDING menos los dados de baja
            await (prisma as any).broadcastContact.updateMany({
                where: { campaignId: c.id, optedOut: false },
                data: { status: 'PENDING', error: null, sentAt: null },
            })
            // Agenda la próxima ocurrencia ya (evita re-disparo); si no hay, corta la recurrencia
            const next = computeNextRun(c.recurrenceDays, c.recurrenceTime, now)
            await (prisma as any).broadcastCampaign.update({
                where: { id: c.id },
                data: {
                    status: 'DRAFT', sentCount: 0, failedCount: 0, completedAt: null,
                    nextRunAt: next, recurring: !!next,
                },
            })
            executeBroadcast(c.id).catch(err =>
                console.error(`[BROADCAST] Error en recurrente ${c.id}:`, err),
            )
        } catch (e) {
            console.error(`[BROADCAST] runRecurringDue error en ${c.id}:`, e)
        }
    }
}

// Scheduler — revisa cada minuto campañas programadas y recurrentes
declare global { var __broadcast_scheduler_started: boolean | undefined }

export function startBroadcastScheduler() {
    if (global.__broadcast_scheduler_started) return
    global.__broadcast_scheduler_started = true

    setInterval(async () => {
        try {
            const due = await (prisma as any).broadcastCampaign.findMany({
                where: { status: 'SCHEDULED', scheduledAt: { lte: new Date() } },
                select: { id: true },
            })
            for (const c of due) {
                executeBroadcast(c.id).catch(err =>
                    console.error(`[BROADCAST] Error ejecutando campaña ${c.id}:`, err)
                )
            }
            await runRecurringDue()
        } catch (err) {
            console.error('[BROADCAST] Scheduler error:', err)
        }
    }, 60 * 1000)
}
