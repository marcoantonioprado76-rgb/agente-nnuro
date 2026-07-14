/**
 * Diamond Assistant — Recepción con IA (FASE 5)
 *
 * `handleDiamondInbound(agentId, msg)` procesa CADA mensaje entrante que el motor
 * aislado (`diamondBaileys`) recibe y que NO es `fromMe`:
 *   1) Gates de seguridad (agente activo, grupo habilitado, horario permitido).
 *   2) Carga contexto (conocimiento + reglas + biblioteca + memoria reciente).
 *   3) Corre un turno del agente (`runAgentTurn`) y envía la respuesta + medios.
 *   4) Persiste memoria y logs.
 *
 * ROBUSTEZ: TODO va dentro de try/catch. Esta función NUNCA lanza hacia el
 * handler de Baileys (el motor ya la envuelve, pero aquí reforzamos).
 */

import { downloadMediaMessage } from '@whiskeysockets/baileys'
import type { proto } from '@whiskeysockets/baileys'
import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/crypto'
import { runAgentTurn, type AgentTurnInput } from './agentEngine'
import { sendDiamondText, sendDiamondMedia, markDiamondRead, sendDiamondVoice } from './diamondBaileys'
import { splitBubbles } from './sendVia'

const sleepMs = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

/** Envía la respuesta en 2–3 burbujas (mensajes separados) por Baileys. */
async function sendDiamondBubbles(agentId: string, jid: string, text: string): Promise<void> {
  const bubbles = splitBubbles(text, 3)
  for (let i = 0; i < bubbles.length; i++) {
    await sendDiamondText(agentId, jid, bubbles[i])
    if (i < bubbles.length - 1) await sleepMs(Math.floor(Math.random() * 800) + 900)
  }
}
import { buildVoiceReply, transcribeWithRetry, stripEmotionTags } from './voice'

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Extrae el número (sin sufijo @...) de un jid/participant. */
function phoneFromJid(jid: string): string {
  return jid.split('@')[0].split(':')[0].replace(/[^\d]/g, '')
}

/** Extrae texto plano + flags de imagen/audio de un mensaje de Baileys. */
function extractContent(msg: proto.IWebMessageInfo): { text: string; hasImage: boolean; hasAudio: boolean } {
  const m = msg.message
  if (!m) return { text: '', hasImage: false, hasAudio: false }
  const hasImage = !!m.imageMessage
  const hasAudio = !!m.audioMessage
  const text =
    m.conversation ||
    m.extendedTextMessage?.text ||
    m.imageMessage?.caption ||
    m.videoMessage?.caption ||
    ''
  return { text: text.trim(), hasImage, hasAudio }
}

/**
 * ¿Estamos dentro del horario permitido?
 * Formato flexible de `allowedHours` (JSON): { start:"HH:MM", end:"HH:MM", days?:number[] }
 * donde days usa 0=domingo .. 6=sábado. Soporta ventanas nocturnas (start > end).
 *
 * FAIL-OPEN: si no hay config o es ilegible, se PERMITE (para no silenciar al
 * agente por una config malformada).
 */
export function isWithinAllowedHours(allowedHours: unknown, timezone: string): boolean {
  if (!allowedHours || typeof allowedHours !== 'object') return true
  const cfg = allowedHours as Record<string, unknown>

  // Si explícitamente está deshabilitado el filtro → sin restricción.
  if (cfg.enabled === false) return true

  const start = typeof cfg.start === 'string' ? cfg.start : ''
  const end = typeof cfg.end === 'string' ? cfg.end : ''
  const toMinutes = (hhmm: string): number | null => {
    const match = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim())
    if (!match) return null
    const h = Number(match[1])
    const mi = Number(match[2])
    if (h < 0 || h > 23 || mi < 0 || mi > 59) return null
    return h * 60 + mi
  }
  const startMin = toMinutes(start)
  const endMin = toMinutes(end)
  // Sin ventana válida → no filtramos (fail-open).
  if (startMin === null || endMin === null) return true

  const tz = timezone || 'America/La_Paz'
  const now = new Date()

  // Día de la semana (0..6) en la zona del agente, si days está definido.
  const days = Array.isArray(cfg.days)
    ? (cfg.days as unknown[]).map(Number).filter(n => Number.isInteger(n))
    : null
  if (days && days.length > 0) {
    const weekdayMap: Record<string, number> = {
      Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
    }
    try {
      const wd = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short' }).format(now)
      const dayNum = weekdayMap[wd]
      if (dayNum !== undefined && !days.includes(dayNum)) return false
    } catch { /* zona inválida → ignorar filtro de días */ }
  }

  // Hora:minuto actuales en la zona del agente.
  let curMin: number
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
    }).formatToParts(now)
    const map: Record<string, string> = {}
    for (const p of parts) if (p.type !== 'literal') map[p.type] = p.value
    const h = map.hour === '24' ? 0 : Number(map.hour)
    curMin = h * 60 + Number(map.minute)
  } catch {
    return true // zona inválida → no filtramos
  }

  if (startMin === endMin) return true // ventana de 24h
  if (startMin < endMin) return curMin >= startMin && curMin < endMin
  // Ventana nocturna (p. ej. 22:00 → 06:00).
  return curMin >= startMin || curMin < endMin
}

/** Item de la biblioteca cargado para resolver acciones del agente. */
type MediaRow = AgentTurnInput['media'][number]

/** Resuelve el asset de una acción del agente (por assetId y luego por título). */
function resolveMediaAsset(args: Record<string, unknown>, media: MediaRow[]): MediaRow | null {
  const readArg = (k: string): string => {
    const v = args[k]
    return typeof v === 'string' ? v.trim() : ''
  }
  const assetId = readArg('assetId')
  const assetTitle = readArg('assetTitle')

  if (assetId) {
    const byId = media.find(m => m.id === assetId)
    if (byId) return byId
  }
  const matchByTitle = (needle: string): MediaRow | null => {
    const lower = needle.toLowerCase()
    const exact = media.find(m => m.title.toLowerCase() === lower)
    if (exact) return exact
    const partial = media.find(m => {
      const t = m.title.toLowerCase()
      return t.includes(lower) || lower.includes(t)
    })
    return partial ?? null
  }
  if (assetTitle) {
    const hit = matchByTitle(assetTitle)
    if (hit) return hit
  }
  if (assetId) {
    const hit = matchByTitle(assetId)
    if (hit) return hit
  }
  return null
}

// ── Respuesta DIFERIDA en grupos ─────────────────────────────────────────────
// Cuando alguien escribe en un grupo, el agente NO responde al instante: espera
// GROUP_ANSWER_DELAY_MS y, si NADIE del grupo respondió mientras tanto, contesta
// con la información (breve). Máximo GROUP_MAX_ANSWERS por persona/hora para no
// generar una conversación larga.
const GROUP_ANSWER_DELAY_MS = 120_000 // 120 segundos
const GROUP_MAX_ANSWERS = 2

// Secuencia por grupo (en memoria): si llega un mensaje más nuevo que el que
// programó la revisión, significa que alguien más habló → no respondemos.
const groupSeq = new Map<string, number>()

// ── BUFFER de mensajes directos (1:1) ────────────────────────────────────────
// Si el contacto manda varios mensajitos seguidos, NO respondemos a cada uno:
// esperamos DIRECT_BUFFER_MS de silencio, juntamos todo y respondemos UNA vez.
const DIRECT_BUFFER_MS = 8000 // 8s sin nuevos mensajes → procesar
type DirectBufferEntry = {
  texts: string[]
  audio: boolean
  timer: NodeJS.Timeout
  run: (combined: string, audio: boolean) => Promise<void>
}
const directBuffer = new Map<string, DirectBufferEntry>()

// ── Handler principal ──────────────────────────────────────────────────────────

export async function handleDiamondInbound(
  agentId: string,
  msg: proto.IWebMessageInfo,
): Promise<void> {
  try {
    const remoteJid = msg.key?.remoteJid
    if (!remoteJid) return
    if (msg.key?.fromMe) return
    if (remoteJid === 'status@broadcast') return

    const isGroup = remoteJid.endsWith('@g.us')

    // Contenido: texto + flags imagen/audio. El audio se transcribe más abajo.
    const { text, hasImage, hasAudio } = extractContent(msg)
    let userMessage = text
    if (hasImage) userMessage = (userMessage ? `${userMessage}\n` : '') + '[El usuario envió una imagen]'
    if (!userMessage.trim() && !hasAudio) return

    // El teléfono del remitente (en grupo: el participante; en directo: el chat).
    const senderJid = isGroup ? (msg.key?.participant ?? '') : remoteJid
    const contactPhone = phoneFromJid(senderJid || remoteJid)
    // JID de RESPUESTA: el chat (grupo o directo).
    const replyJid = remoteJid

    // 1) Agente + GATE global isActive.
    const agent = await prisma.assistantAgent.findUnique({
      where: { id: agentId },
      select: {
        id: true,
        name: true,
        personalityPrompt: true,
        model: true,
        temperature: true,
        openaiKeyEnc: true,
        provider: true,
        isActive: true,
        organizationId: true,
        timezone: true,
        allowedHours: true,
        voiceEnabled: true,
        voiceMode: true,
        voiceId: true,
      },
    })
    if (!agent) return
    if (!agent.isActive) {
      console.log(`[DIAMOND] Agente ${agentId} inactivo — mensaje ignorado`)
      return
    }

    // Con proveedor oficial (YCLOUD/META), la conexión Baileys es SOLO para grupos:
    // los mensajes 1:1 ya los contesta YCloud. Ignorar los directos evita respuesta DOBLE
    // cuando el mismo número está en YCloud y en Baileys.
    if (!isGroup && agent.provider !== 'BAILEYS') {
      return
    }

    // 2) Gates de grupo.
    if (isGroup) {
      const group = await prisma.assistantGroup.findUnique({
        where: { agentId_groupJid: { agentId, groupJid: remoteJid } },
        select: { aiEnabled: true, automationEnabled: true, allowedHours: true },
      })
      if (!group) return // grupo no gestionado → NO responder
      if (!group.aiEnabled || !group.automationEnabled) return
      // Horario: el del grupo si lo define, si no el del agente.
      const hours = group.allowedHours ?? agent.allowedHours
      if (!isWithinAllowedHours(hours, agent.timezone)) return
    } else {
      // Chat directo: respetar horario del agente.
      if (!isWithinAllowedHours(agent.allowedHours, agent.timezone)) return
    }

    // Marcar como LEÍDO (✓✓ azul) 5 segundos después de recibir.
    const readKey = msg.key
    if (readKey) setTimeout(() => { markDiamondRead(agentId, readKey) }, 5000)

    // 3) API key (necesaria para transcribir audio y para responder).
    let openaiKey = ''
    if (agent.openaiKeyEnc) {
      try { openaiKey = decrypt(agent.openaiKeyEnc) } catch { openaiKey = '' }
    }
    if (!openaiKey.trim()) {
      console.warn(`[DIAMOND] Agente ${agentId} sin OpenAI key usable — no responde`)
      return
    }

    // Transcribir la NOTA DE VOZ (si el usuario mandó audio) → texto para el agente.
    let customerSentAudio = false
    if (hasAudio) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const buffer = await downloadMediaMessage(msg as any, 'buffer', {})
        const mime = msg.message?.audioMessage?.mimetype || 'audio/ogg'
        const blob = new Blob([new Uint8Array(buffer as Buffer)], { type: mime })
        const transcript = await transcribeWithRetry(blob, openaiKey)
        if (transcript) {
          userMessage = (userMessage ? `${userMessage}\n` : '') + transcript
          customerSentAudio = true
        }
      } catch (err) {
        console.error(`[DIAMOND] transcripción de audio error agentId=${agentId}:`, err)
      }
    }
    if (!userMessage.trim()) {
      // Audio no entendido → en 1:1 respondemos amable; en grupo lo dejamos pasar.
      if (hasAudio && !isGroup) {
        await sendDiamondText(agentId, replyJid, 'Perdón, no pude escuchar bien tu audio 🙈 ¿me lo escribís?')
      }
      return
    }

    // ── GRUPOS: respuesta DIFERIDA (no responder al instante) ─────────────────
    // Guardamos el mensaje y, si en 120s NADIE del grupo respondió, el agente
    // contesta con la info necesaria (breve, solo información, máx. 2 por persona).
    if (isGroup) {
      const key = `${agentId}:${remoteJid}`
      const seq = (groupSeq.get(key) ?? 0) + 1
      groupSeq.set(key, seq)
      const contactName = (msg.pushName ?? '').trim() || undefined
      // Guardar el mensaje del usuario (contexto para la respuesta diferida).
      prisma.assistantMemory
        .create({ data: { agentId, contactPhone, role: 'user', content: userMessage } })
        .catch(err => console.error(`[DIAMOND] error guardando memoria grupo agentId=${agentId}:`, err))
      // Programar la revisión a los 120s.
      setTimeout(() => {
        answerGroupIfUnanswered(agentId, remoteJid, contactPhone, userMessage, contactName, seq, customerSentAudio)
          .catch(err => console.error(`[DIAMOND] answerGroupIfUnanswered error agentId=${agentId}:`, err))
      }, GROUP_ANSWER_DELAY_MS)
      return
    }

    // 4) Procesa el turno directo con el texto YA combinado por el buffer.
    const processDirectTurn = async (finalUserMessage: string, audioFlag: boolean): Promise<void> => {
      // Contexto: conocimiento + reglas + biblioteca + memoria reciente.
      const [knowledge, rules, media, memoryRows] = await Promise.all([
        prisma.knowledgeItem.findMany({
          where: { agentId, isActive: true },
          select: { title: true, content: true, category: true },
          orderBy: { createdAt: 'asc' },
        }),
        prisma.safetyRule.findMany({
          where: { agentId, isActive: true },
          select: { description: true, type: true },
          orderBy: { createdAt: 'asc' },
        }),
        prisma.mediaAsset.findMany({
          select: { id: true, type: true, title: true, url: true, linkUrl: true, textContent: true, tags: true },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.assistantMemory.findMany({
          where: { agentId, contactPhone },
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: { role: true, content: true },
        }),
      ])

      // Memoria: más reciente primero → invertir a orden cronológico.
      const history = memoryRows
        .reverse()
        .map(m => ({ role: (m.role === 'bot' ? 'bot' : 'user') as 'user' | 'bot', content: m.content }))

      // 5) Turno del agente.
      const input: AgentTurnInput = {
        agent: {
          id: agent.id,
          name: agent.name,
          personalityPrompt: agent.personalityPrompt,
          model: agent.model,
          temperature: agent.temperature,
          openaiKey,
        },
        knowledge,
        rules,
        media,
        history,
        // Nombre del perfil de WhatsApp del remitente → el agente lo saluda por su nombre.
        contactName: (msg.pushName ?? '').trim() || undefined,
        // Si es su PRIMER mensaje (sin memoria previa) → bienvenida cálida por su nombre.
        contextNote: memoryRows.length === 0
          ? 'Es la PRIMERA vez que esta persona te escribe. Dale una bienvenida cálida, breve y personal usando su NOMBRE, y luego respondé su mensaje con naturalidad.'
          : undefined,
        userMessage: finalUserMessage,
      }

      const result = await runAgentTurn(input)

      // 6) Responder: en NOTA DE VOZ si corresponde (usuario mandó audio, o modo
      //    "siempre"); si no se puede generar la voz, cae a texto.
      let voiceSent = false
      if (result.text?.trim()) {
        const voiceUrl = await buildVoiceReply(agent, result.text, audioFlag, agent.id)
        if (voiceUrl) voiceSent = await sendDiamondVoice(agentId, replyJid, voiceUrl)
        if (!voiceSent) await sendDiamondBubbles(agentId, replyJid, stripEmotionTags(result.text))
      }

      // 7) Enviar cada medio pedido por las acciones (tools send_*).
      for (const action of result.actions) {
        if (action.tool === 'escalate_to_human') continue
        const asset = resolveMediaAsset(action.args, media)
        if (!asset) continue
        await sendDiamondMedia(agentId, replyJid, {
          type: asset.type,
          url: asset.url,
          linkUrl: asset.linkUrl,
          textContent: asset.textContent,
          title: asset.title,
        })
      }

      // 8) Escalamiento: por ahora solo se loguea (no hay adminPhone confiable).
      if (result.escalated) {
        console.log(`[DIAMOND] Escalamiento a humano — agente=${agentId} contacto=${contactPhone}`)
      }

      // 9) Persistir memoria + logs. Cada bloque protegido por su try/catch.
      try {
        await prisma.assistantMemory.createMany({
          data: [
            { agentId, contactPhone, role: 'user', content: finalUserMessage },
            ...(result.text?.trim() ? [{ agentId, contactPhone, role: 'bot', content: stripEmotionTags(result.text) }] : []),
          ],
        })
      } catch (err) {
        console.error(`[DIAMOND] error guardando memoria agentId=${agentId}:`, err)
      }

      try {
        await prisma.assistantMessageLog.createMany({
          data: [
            {
              organizationId: agent.organizationId,
              agentId,
              contactPhone,
              direction: 'IN',
              messageType: 'TEXT' as const,
              content: finalUserMessage,
              status: 'SENT' as const,
            },
            ...(result.text?.trim()
              ? [{
                  organizationId: agent.organizationId,
                  agentId,
                  contactPhone,
                  direction: 'OUT',
                  messageType: 'TEXT' as const,
                  content: stripEmotionTags(result.text),
                  status: 'SENT' as const,
                }]
              : []),
          ],
        })
      } catch (err) {
        console.error(`[DIAMOND] error guardando logs agentId=${agentId}:`, err)
      }
    }

    // ── BUFFER 1:1 ── Acumular este mensaje y (re)programar el envío. Cada
    // mensaje nuevo del mismo contacto reinicia el temporizador y usa el turno
    // más reciente (agent/key frescos). Al descansar DIRECT_BUFFER_MS, responde
    // UNA sola vez con todo lo que escribió junto.
    const bufKey = `${agentId}:${remoteJid}`
    const prev = directBuffer.get(bufKey)
    if (prev) clearTimeout(prev.timer)
    const entry: DirectBufferEntry = prev ?? { texts: [], audio: false, timer: null as unknown as NodeJS.Timeout, run: processDirectTurn }
    entry.texts.push(userMessage)
    entry.audio = entry.audio || customerSentAudio
    entry.run = processDirectTurn
    entry.timer = setTimeout(() => {
      directBuffer.delete(bufKey)
      entry.run(entry.texts.join('\n'), entry.audio)
        .catch(err => console.error(`[DIAMOND] processDirectTurn error agentId=${agentId}:`, err))
    }, DIRECT_BUFFER_MS)
    directBuffer.set(bufKey, entry)
  } catch (err) {
    // Blindaje final: nunca lanzar hacia el motor de Baileys.
    console.error(`[DIAMOND] handleDiamondInbound error agentId=${agentId}:`, err)
  }
}

/**
 * Revisa, 120s después de una consulta en un grupo, si NADIE respondió. Si el
 * último mensaje del grupo sigue siendo esa consulta (nadie habló después) y el
 * agente no superó el máximo de respuestas, contesta con la información necesaria
 * de forma BREVE (solo dar info, sin abrir conversación). Nunca lanza.
 */
async function answerGroupIfUnanswered(
  agentId: string,
  groupJid: string,
  contactPhone: string,
  userMessage: string,
  contactName: string | undefined,
  seq: number,
  customerSentAudio: boolean,
): Promise<void> {
  try {
    const key = `${agentId}:${groupJid}`
    // ¿Llegó un mensaje más nuevo? → alguien más habló → NO respondemos.
    if (groupSeq.get(key) !== seq) return

    // Cap anti-conversación: máximo GROUP_MAX_ANSWERS respuestas del bot a esta
    // persona en la última hora.
    const since = new Date(Date.now() - 60 * 60 * 1000)
    const botCount = await prisma.assistantMemory.count({
      where: { agentId, contactPhone, role: 'bot', createdAt: { gte: since } },
    })
    if (botCount >= GROUP_MAX_ANSWERS) return

    // Re-verificar agente + grupo + horario (pudieron cambiar en 120s).
    const agent = await prisma.assistantAgent.findUnique({
      where: { id: agentId },
      select: {
        id: true, name: true, personalityPrompt: true, model: true, temperature: true,
        openaiKeyEnc: true, isActive: true, organizationId: true, timezone: true, allowedHours: true,
        voiceEnabled: true, voiceMode: true, voiceId: true,
      },
    })
    if (!agent || !agent.isActive) return

    const group = await prisma.assistantGroup.findUnique({
      where: { agentId_groupJid: { agentId, groupJid } },
      select: { aiEnabled: true, automationEnabled: true, allowedHours: true },
    })
    if (!group || !group.aiEnabled || !group.automationEnabled) return
    if (!isWithinAllowedHours(group.allowedHours ?? agent.allowedHours, agent.timezone)) return

    let openaiKey = ''
    if (agent.openaiKeyEnc) {
      try { openaiKey = decrypt(agent.openaiKeyEnc) } catch { openaiKey = '' }
    }
    if (!openaiKey.trim()) return

    // Contexto (conocimiento + reglas + biblioteca + memoria reciente de la persona).
    const [knowledge, rules, media, memoryRows] = await Promise.all([
      prisma.knowledgeItem.findMany({
        where: { agentId, isActive: true },
        select: { title: true, content: true, category: true },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.safetyRule.findMany({
        where: { agentId, isActive: true },
        select: { description: true, type: true },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.mediaAsset.findMany({
        select: { id: true, type: true, title: true, url: true, linkUrl: true, textContent: true, tags: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.assistantMemory.findMany({
        where: { agentId, contactPhone },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { role: true, content: true },
      }),
    ])
    const history = memoryRows
      .reverse()
      .map(m => ({ role: (m.role === 'bot' ? 'bot' : 'user') as 'user' | 'bot', content: m.content }))

    const input: AgentTurnInput = {
      agent: {
        id: agent.id,
        name: agent.name,
        personalityPrompt: agent.personalityPrompt,
        model: agent.model,
        temperature: agent.temperature,
        openaiKey,
      },
      knowledge,
      rules,
      media,
      history,
      contactName,
      contextNote:
        'Estás en un GRUPO de WhatsApp. Tu ÚNICA función acá es responder DUDAS o PREGUNTAS concretas (sobre el ' +
        'negocio, el producto, cómo hacer algo, etc.). Alguien escribió y NADIE del equipo respondió en ~2 minutos.\n' +
        'REGLA ESTRICTA: respondé SOLO si el último mensaje es claramente una PREGUNTA o consulta que necesita ' +
        'información. En CUALQUIER otro caso devolvé EXACTAMENTE una cadena VACÍA y NO escribas absolutamente nada. ' +
        'Ejemplos donde NO debés responder (cadena vacía): un saludo ("hola", "buenas"), un "gracias", una ' +
        'felicitación o bienvenida, aplausos o emojis (👏🙌🔥💎), una reacción, un festejo, un comentario suelto, ' +
        'o una imagen/audio/sticker sin una pregunta.\n' +
        'Cuando SÍ respondas, sé BREVE y claro: solo la información necesaria, sin abrir conversación, sin ' +
        'preguntar de vuelta y sin saludos largos.',
      // En GRUPOS el vacío es una respuesta válida: significa "no hace falta contestar".
      // Sin esto, el motor rellenaba con "De acuerdo." y CAMILA contestaba cualquier cosa.
      allowEmpty: true,
      userMessage,
    }

    const result = await runAgentTurn(input)
    // Nada que decir Y nada que mandar → el agente decidió no responder (no era pregunta).
    if (!result.text?.trim() && result.actions.length === 0) return

    // Responder en NOTA DE VOZ si corresponde; si no, texto. (Solo si HAY texto: si
    // viene vacío pero hay acciones, se mandan los recursos sin escribir nada.)
    if (result.text?.trim()) {
      let voiceSent = false
      const voiceUrl = await buildVoiceReply(agent, result.text, customerSentAudio, agent.id)
      if (voiceUrl) voiceSent = await sendDiamondVoice(agentId, groupJid, voiceUrl)
      if (!voiceSent) await sendDiamondBubbles(agentId, groupJid, stripEmotionTags(result.text))
    }

    // Medios que el agente haya pedido (send_pdf/link/video/…).
    for (const action of result.actions) {
      if (action.tool === 'escalate_to_human') continue
      const asset = resolveMediaAsset(action.args, media)
      if (!asset) continue
      await sendDiamondMedia(agentId, groupJid, {
        type: asset.type,
        url: asset.url,
        linkUrl: asset.linkUrl,
        textContent: asset.textContent,
        title: asset.title,
      })
    }

    // Guardar la respuesta del bot (memoria + log OUT).
    try {
      await prisma.assistantMemory.create({ data: { agentId, contactPhone, role: 'bot', content: stripEmotionTags(result.text) } })
    } catch { /* noop */ }
    try {
      await prisma.assistantMessageLog.create({
        data: {
          organizationId: agent.organizationId,
          agentId,
          contactPhone,
          direction: 'OUT',
          messageType: 'TEXT' as const,
          content: stripEmotionTags(result.text),
          status: 'SENT' as const,
        },
      })
    } catch { /* noop */ }

    console.log(`[DIAMOND] Respuesta a grupo sin respuesta humana — grupo=${groupJid} contacto=${contactPhone}`)
  } catch (err) {
    console.error(`[DIAMOND] answerGroupIfUnanswered error agentId=${agentId} grupo=${groupJid}:`, err)
  }
}
