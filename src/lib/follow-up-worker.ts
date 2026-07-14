import { prisma } from './prisma'
import { chatWithUsage, FOLLOWUP_MODEL } from './openai'
import { sendText, sendImage, sendVideo } from './ycloud'
import { DEFAULT_FOLLOWUP_PROMPT } from './followupPrompt'
import { decrypt } from './crypto'
import { BaileysManager } from './baileys-manager'
import { notifyCreditsExhausted } from './notify-credits'
import {
    resolveOpenAIKey,
    chargeForChatUsage,
} from './ai-credits'

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms))

// Si el envío falla (bot Baileys desconectado, etc.), reprogramamos el followUp2
// al menos 1 hora más adelante en lugar de dejarlo `<= now` (lo que generaría
// loop de procesamiento cada 60s con cobros consecutivos).
const FAILED_SEND_RETRY_MIN = 60

/**
 * Procesa los seguimientos automáticos pendientes (15 min y 3 días).
 * Se puede llamar desde un cron job o un intervalo.
 */
export async function processFollowUps() {
    const now = new Date()

    // 1. Buscar seguimientos de 15 minutos pendientes
    const followUps1 = await prisma.conversation.findMany({
        where: {
            sold: false,
            botDisabled: false,
            followUp1At: { lte: now },
            followUp1Sent: false,
            bot: {
                status: 'ACTIVE',
                // Saltear conversaciones cuyo dueño tiene followups desactivados.
                // NULL en la columna = activado (default histórico).
                user: { OR: [{ followupsEnabled: null }, { followupsEnabled: true }] },
            },
        },
        include: {
            bot: { include: { secret: true } },
            messages: { orderBy: { createdAt: 'desc' }, take: 10 },
            botState: { select: { selectedProductId: true } },
        }
    })

    // 2. Buscar seguimientos de 3 días pendientes
    const followUps2 = await prisma.conversation.findMany({
        where: {
            sold: false,
            botDisabled: false,
            followUp2At: { lte: now },
            followUp2Sent: false,
            bot: {
                status: 'ACTIVE',
                // Saltear conversaciones cuyo dueño tiene followups desactivados.
                // NULL en la columna = activado (default histórico).
                user: { OR: [{ followupsEnabled: null }, { followupsEnabled: true }] },
            },
        },
        include: {
            bot: { include: { secret: true } },
            messages: { orderBy: { createdAt: 'desc' }, take: 10 },
            botState: { select: { selectedProductId: true } },
        }
    })

    console.log(`[WORKER] Iniciando proceso de seguimientos. Pendientes: 15m=${followUps1.length}, 3d=${followUps2.length}`)

    for (const conv of followUps1) await executeFollowUp(conv, 1)
    for (const conv of followUps2) await executeFollowUp(conv, 2)
}

/**
 * Reprograma `followUp2At` a `delayMinutes` minutos en el futuro y deja
 * `followUp2Sent = false` para que el worker lo vuelva a procesar después.
 * Se usa tanto cuando el envío fue exitoso (reprograma con delay normal) como
 * cuando falló (delay corto de 1h para reintentar sin loop).
 */
async function rescheduleFollowUp2(conversationId: string, delayMinutes: number) {
    const nextRun = new Date(Date.now() + delayMinutes * 60 * 1000)
    await prisma.conversation.update({
        where: { id: conversationId },
        data: { followUp2At: nextRun, followUp2Sent: false },
    })
    return nextRun
}

/**
 * Adjunta (best-effort) la imagen/video de seguimiento del producto que el
 * cliente estaba consultando. Es OPCIONAL: si el producto no tiene media
 * cargada, o no se pudo identificar el producto, simplemente no envía nada.
 * Nunca lanza: un fallo de media no debe romper el seguimiento de texto.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function sendProductFollowUpMedia(conv: any, bot: any) {
    try {
        const productId = conv.botState?.selectedProductId
        if (!productId) return

        const product = await prisma.product.findUnique({
            where: { id: productId },
            select: { followUpMedia: true, followUpMediaUrl: true, followUpMediaType: true },
        })

        // Lista de medias [{ url, type, text }]. Fallback a la media única legacy.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let items: Array<{ url: string; type?: string; text?: string }> = Array.isArray((product as any)?.followUpMedia)
            ? (product as any).followUpMedia.filter((m: any) => m && typeof m.url === 'string' && m.url)
            : []
        if (items.length === 0 && product?.followUpMediaUrl) {
            items = [{ url: product.followUpMediaUrl, type: product.followUpMediaType || 'image' }]
        }
        if (items.length === 0) return

        // REGLA: cada seguimiento manda MÁXIMO 1 imagen + 1 video, y NUNCA repite
        // una ya enviada a esta conversación. Se cargan varias solo para rotar.
        const alreadySent: string[] = Array.isArray(conv.sentFollowUpMedia)
            ? (conv.sentFollowUpMedia as string[]).filter(u => typeof u === 'string')
            : []
        const sentSet = new Set(alreadySent)
        const firstImage = items.find(it => it.type !== 'video' && !sentSet.has(it.url))
        const firstVideo = items.find(it => it.type === 'video' && !sentSet.has(it.url))
        const toSend = [firstImage, firstVideo].filter(Boolean) as Array<{ url: string; type?: string; text?: string }>
        if (toSend.length === 0) return  // ya se enviaron todas → no repetir

        const userPhone: string = conv.userPhone

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const conn = bot.type === 'BAILEYS' ? (global as any).__baileys_connections?.get(bot.id) : null
        if (bot.type === 'BAILEYS' && !conn?.sock) return
        const jid = userPhone.includes('@') ? userPhone : `${userPhone.replace(/\D/g, '')}@s.whatsapp.net`
        const apiKey = bot.type === 'BAILEYS' ? '' : decrypt(bot.secret.ycloudApiKeyEnc)
        const from = bot.type === 'BAILEYS' ? '' : bot.secret.whatsappInstanceNumber
        const to = userPhone.replace(/\D/g, '')

        const sentNow: string[] = []
        for (const it of toSend) {
            const isVideo = it.type === 'video'
            const caption = (it.text || '').trim()
            try {
                await sleep(Math.floor(Math.random() * 700) + 600) // respiro entre cada envío
                if (bot.type === 'BAILEYS') {
                    const payload = isVideo ? { video: { url: it.url } } : { image: { url: it.url } }
                    await conn.sock.sendMessage(jid, caption ? { ...payload, caption } : payload)
                } else if (isVideo) {
                    await sendVideo(from, to, it.url, caption, apiKey)
                } else {
                    await sendImage(from, to, it.url, apiKey, caption)
                }
                sentNow.push(it.url)
            } catch (oneErr) {
                console.warn(`[WORKER] Falló una media de seguimiento para ${userPhone}:`, (oneErr as Error).message)
            }
        }

        // Registrar las enviadas para no repetirlas en próximos seguimientos.
        if (sentNow.length) {
            await prisma.conversation.update({
                where: { id: conv.id },
                data: { sentFollowUpMedia: [...alreadySent, ...sentNow] },
            }).catch(() => {})
        }
        console.log(`[WORKER] ${sentNow.length} media(s) de seguimiento enviada(s) a ${userPhone} (rotación sin repetir)`)
    } catch (mediaErr) {
        console.warn(`[WORKER] No se pudo enviar la media de seguimiento:`, (mediaErr as Error).message)
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function executeFollowUp(conv: any, type: 1 | 2) {
    const { bot, userPhone, userName, messages, id: conversationId } = conv

    console.log(`[WORKER] Ejecutando seguimiento ${type} para ${userPhone} (${userName})`)

    try {
        if (!bot.secret) {
            console.warn(`[WORKER] Bot ${bot.id} sin credenciales, omitiendo seguimiento`)
            // Si era followUp2, evitar que vuelva inmediatamente
            if (type === 2) await rescheduleFollowUp2(conversationId, FAILED_SEND_RETRY_MIN)
            return
        }

        // ── PRE-CHECK A: si el bot Baileys no está conectado, NO procesar.
        //    Esto evita el bug histórico de cobrar saldo + llamar OpenAI + intentar
        //    enviar y fallar, repitiéndose cada 60s (loop de cobros).
        if (bot.type === 'BAILEYS') {
            const status = BaileysManager.getStatus(bot.id)
            if (status.status !== 'connected') {
                console.warn(`[WORKER] Bot ${bot.id} no conectado (${status.status}), reprogramando seguimiento ${type}`)
                if (type === 2) await rescheduleFollowUp2(conversationId, FAILED_SEND_RETRY_MIN)
                // followUp1 NO se reprograma porque solo se intenta UNA vez por diseño:
                // se queda con followUp1Sent=false y el siguiente tick lo reintenta.
                // Para evitar loop también acá, marcarlo como "intentado" (lo perdimos).
                else {
                    await prisma.conversation.update({
                        where: { id: conversationId },
                        data: { followUp1At: new Date(Date.now() + FAILED_SEND_RETRY_MIN * 60 * 1000) },
                    })
                }
                return
            }
        }

        // ── PRE-CHECK B: resolver key. Si no hay key propia y no hay saldo, saltear
        //    sin cobrar nada. Notificar al dueño UNA vez por sesión.
        let openaiKey: string | null = null
        let keySource: 'own' | 'admin' = 'own'
        try {
            openaiKey = decrypt(bot.secret.openaiApiKeyEnc)
        } catch {
            openaiKey = null
        }
        if (!openaiKey && bot.userId) {
            const resolved = await resolveOpenAIKey(bot.userId)
            if (resolved.ok) {
                openaiKey = resolved.key
                keySource = resolved.source
            } else {
                if (resolved.error === 'NO_CREDITS') {
                    notifyCreditsExhausted(bot.userId, bot.name).catch(() => {})
                }
                console.warn(`[WORKER] Bot ${bot.id} sin key (${resolved.error}). Seguimiento ${type} pausado.`)
                if (type === 2) await rescheduleFollowUp2(conversationId, FAILED_SEND_RETRY_MIN * 6)  // 6h
                return
            }
        }

        // ── CLAIM ATÓMICO ────────────────────────────────────────────────────
        // Marca esta ventana de seguimiento como "tomada" ANTES de la llamada a
        // OpenAI y el envío (que tardan varios segundos). Sin esto, los ticks del
        // worker se solapan (setInterval no espera al anterior) y/o varias
        // instancias procesan la MISMA conversación a la vez → el cliente recibe
        // N saludos repetidos. updateMany condicional = solo UN proceso gana.
        if (type === 1) {
            const claim = await prisma.conversation.updateMany({
                where: { id: conversationId, followUp1Sent: false },
                data: { followUp1Sent: true },
            })
            if (claim.count === 0) {
                console.log(`[WORKER] Seguimiento 1 de ${userPhone} ya tomado por otro proceso, omitiendo`)
                return
            }
        } else {
            // type 2: mover followUp2At al delay normal de inmediato (optimista),
            // así otro tick concurrente ya no lo ve como vencido.
            const nextRun = new Date(Date.now() + (bot.followUp2Delay || 4320) * 60 * 1000)
            const claim = await prisma.conversation.updateMany({
                where: { id: conversationId, followUp2Sent: false, followUp2At: { lte: new Date() } },
                data: { followUp2At: nextRun },
            })
            if (claim.count === 0) {
                console.log(`[WORKER] Seguimiento 2 de ${userPhone} ya tomado por otro proceso, omitiendo`)
                return
            }
        }

        // Decodificar JSON de mensajes del asistente
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const history = messages.reverse().map((m: any) => {
            if (m.role === 'assistant') {
                try {
                    const parsed = JSON.parse(m.content)
                    const text = [parsed.mensaje1, parsed.mensaje2, parsed.mensaje3, parsed.mensaje4].filter(Boolean).join('\n')
                    return { role: 'assistant' as const, content: text || m.content }
                } catch {
                    return { role: 'assistant' as const, content: m.content }
                }
            }
            return { role: m.role as 'user' | 'assistant', content: m.content }
        })

        const delayMinutes = type === 1 ? bot.followUp1Delay : bot.followUp2Delay
        const delayText = delayMinutes >= 1440 ? `${Math.floor(delayMinutes / 1440)} días` : `${delayMinutes} minutos`

        // Instrucciones para redactar el seguimiento. Si el dueño no cargó un
        // prompt propio, usamos el prompt de seguimiento POR DEFECTO (estilo de
        // reconexión mejorado), NUNCA un saludo genérico.
        const ownerInstructions = (bot.followUpPrompt || '').trim() || DEFAULT_FOLLOWUP_PROMPT
        const ownerBlock = `\nINSTRUCCIONES DEL NEGOCIO (máxima prioridad, respétalas siempre):\n${ownerInstructions}\n`

        const systemPrompt = `Actúa como el asistente de ventas de "${bot.name}".
El cliente ${userName || 'interesado'} (${userPhone}) escribió hace ${delayText}, pero la conversación quedó inconclusa y no se concretó el pedido. Tu trabajo es RECONECTAR sobre eso que hablaron, no empezar de cero.
${ownerBlock}
Historial reciente:
${history.map((h: any) => `${h.role}: ${h.content.slice(0, 100)}`).join('\n')}

Genera un mensaje breve, cercano, cálido y muy humano en español para retomar la conversación de manera natural.

OBJETIVO:
Reconectar de forma amable retomando lo que quedó pendiente (el producto o duda que tenía), generar confianza y abrir espacio para que responda.

REGLAS IMPORTANTES:
1. Usa un tono natural, como si escribieras a alguien conocido.
2. Evita lenguaje robótico, formal o corporativo.
3. PROHIBIDO usar saludos/preguntas genéricas de asistente como "¿en qué puedo ayudarte?", "¿cómo estás?", "¿cómo te va?" o "¿en qué te puedo servir?". Eso suena a bot y NO reconecta.
4. Enganchá con lo puntual de la conversación (el producto que consultó, su duda o el beneficio), no con un saludo vacío.
5. No menciones que es un seguimiento ni que eres una IA. No repitas saludos ya usados en el historial.
6. Máximo 2 frases. Entre 40 y 90 caracteres.
7. Debe sentirse genuino, cálido y amigable.

IMPORTANTE: Responde únicamente en formato JSON con este schema exacto:
{
  "mensaje1": "mensaje aquí"
}`

        const FALLBACKS_1 = [
            "¡Hola! ¿Sigues por ahí? Cualquier duda dime y te ayudo 😊",
            "Hola de nuevo, ¿pudiste revisar lo que te pasé? Quedo atento.",
            "¿Cómo vas? Me cuentas si seguimos con el pedido 🙌",
        ]
        const FALLBACKS_2 = [
            "¡Hola! Pasaba a saludar y ver si necesitas algo más 🙌",
            "Hola, ¿pudiste decidirte? Aún tengo el producto disponible.",
            "¿Qué tal? Cualquier consulta aquí estoy para ayudarte 😊",
        ]
        const fallbackPool = type === 1 ? FALLBACKS_1 : FALLBACKS_2
        const fallback = fallbackPool[Math.floor(Math.random() * fallbackPool.length)]

        let messageText: string = fallback
        if (openaiKey) {
            try {
                const result = await chatWithUsage(systemPrompt, [], openaiKey, FOLLOWUP_MODEL)
                messageText = result.response.mensaje1 || fallback
                // Cobrar tokens reales solo si usamos admin key
                if (keySource === 'admin' && bot.userId) {
                    chargeForChatUsage(bot.userId, FOLLOWUP_MODEL, result.promptTokens, result.completionTokens, 'bot.followup', { botId: bot.id, type })
                        .catch(e => console.error('[WORKER] chargeForChatUsage error:', e))
                }
            } catch (aiErr) {
                const errMsg = (aiErr as Error).message || ''
                console.warn(`[WORKER] OpenAI falló para seguimiento ${type} de ${userPhone}, usando fallback:`, errMsg.slice(0, 120))
                // Solo notificar si es saldo agotado de la cuenta OpenAI del bot
                const isQuotaExhausted =
                    errMsg.includes('insufficient_quota') ||
                    errMsg.includes('exceeded your current quota') ||
                    errMsg.includes('billing_hard_limit_reached')
                if (isQuotaExhausted && bot.userId) {
                    notifyCreditsExhausted(bot.userId, bot.name).catch(() => {})
                }
            }
        }

        // ── Enviar según el tipo de bot
        let sent = false
        if (bot.type === 'BAILEYS') {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const conn = (global as any).__baileys_connections?.get(bot.id)
            if (conn?.sock) {
                const jid = userPhone.includes('@') ? userPhone : `${userPhone.replace(/\D/g, '')}@s.whatsapp.net`
                try {
                    await conn.sock.sendPresenceUpdate('composing', jid)
                    await sleep(Math.floor(Math.random() * 1000) + 1000) // 1-2s
                    await conn.sock.sendMessage(jid, { text: messageText })
                    sent = true
                } catch (sendErr) {
                    console.warn(`[WORKER] sendMessage Baileys falló para ${userPhone}:`, (sendErr as Error).message)
                }
            }
        } else {
            // YCloud
            try {
                const apiKey = decrypt(bot.secret.ycloudApiKeyEnc)
                const from = bot.secret.whatsappInstanceNumber
                const to = userPhone.replace(/\D/g, '')
                await sendText(from, to, messageText, apiKey)
                sent = true
            } catch (sendErr) {
                console.warn(`[WORKER] sendText YCloud falló para ${userPhone}:`, (sendErr as Error).message)
            }
        }

        if (sent) {
            // El estado ya quedó marcado/reprogramado por el CLAIM atómico de arriba
            // (type 1 → followUp1Sent=true; type 2 → followUp2At movido al delay normal).
            if (type === 2) {
                console.log(`[WORKER] Seguimiento recurrente (3d) enviado y reprogramado para ${userPhone}`)
            }

            // Adjuntar la imagen/video de seguimiento del producto consultado (opcional).
            await sendProductFollowUpMedia(conv, bot)

            // Guardar el mensaje enviado en el historial
            await prisma.message.create({
                data: {
                    conversationId,
                    role: 'assistant',
                    type: 'text',
                    content: JSON.stringify({ mensaje1: messageText, mensaje2: '', mensaje3: '', fotos_mensaje1: [], reporte: '' }),
                },
            })

            console.log(`[WORKER] Seguimiento ${type} enviado con éxito a ${userPhone}`)
        } else {
            // No se pudo enviar. El CLAIM ya evitó el loop de cada 60s:
            //   type 1 → quedó followUp1Sent=true (one-shot, perdimos la ventana).
            //   type 2 → estaba movido al delay normal; lo acercamos a 1h para reintentar.
            console.warn(`[WORKER] No se pudo enviar seguimiento ${type} a ${userPhone} (bot desconectado o error).`)
            if (type === 2) {
                await rescheduleFollowUp2(conversationId, FAILED_SEND_RETRY_MIN)
            }
        }

    } catch (err) {
        console.error(`[WORKER] Error en seguimiento ${type} para ${userPhone}:`, err)
        // Salvavidas: si algo crashea ANTES de reprogramar, igual reprogramamos
        // para que esta conversación no quede atrapada en el loop de procesamiento.
        if (type === 2) {
            await rescheduleFollowUp2(conversationId, FAILED_SEND_RETRY_MIN).catch(() => {})
        }
    }
}
