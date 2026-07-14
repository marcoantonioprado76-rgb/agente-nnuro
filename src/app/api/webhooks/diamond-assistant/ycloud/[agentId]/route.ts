/**
 * Diamond Assistant — Webhook entrante de YCloud (por agente IA)
 *
 * Ruta: POST /api/webhooks/diamond-assistant/ycloud/[agentId]?token=WEBHOOK_TOKEN
 *
 * YCloud entrega aquí los mensajes de WhatsApp dirigidos al número del agente.
 * Espeja el patrón del webhook de venta (`/webhooks/ycloud/whatsapp/[botId]`):
 *   - Valida `?token=` contra `agent.webhookToken`.
 *   - Responde 200 SIEMPRE (silencioso) para que YCloud no reintente.
 *   - Procesa el turno del agente de forma ASÍNCRONA (tras responder 200).
 *
 * El envío de la respuesta viaja por `sendVia` (agnóstico de proveedor), así que
 * aunque este webhook es específico de YCloud, reutiliza el mismo motor y medios.
 */
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/crypto'
import { runAgentTurn, type AgentTurnInput } from '@/lib/diamond-assistant/agentEngine'
import { sendAgentText, sendAgentMedia, splitBubbles } from '@/lib/diamond-assistant/sendVia'
import { buildVoiceReply, transcribeWithRetry, stripEmotionTags } from '@/lib/diamond-assistant/voice'
import { markAsRead } from '@/lib/ycloud'
import { isOwnerPhone } from '@/lib/diamond-assistant/ownerConfig'
import { handleOwnerInbound } from '@/lib/diamond-assistant/ownerInbound'
import type { OwnerInboundMedia } from '@/lib/diamond-assistant/ownerActions'

// ── Constantes de timing (humano) ────────────────────────────────────────────────
const READ_DELAY_MS = 5000   // marcar como leído (✓✓ azul) a los 5s
const REPLY_DELAY_MS = 5500  // recién responder a los 5.5s (después del visto)
const DIRECT_BUFFER_MS = 8000 // BUFFER: esperar 8s de silencio y responder UNA vez a todo lo que escribió

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

// ── Tipos internos ──────────────────────────────────────────────────────────────

type MediaRow = AgentTurnInput['media'][number]

// Un "pedazo" entrante: texto, URL de nota de voz y/o archivo adjunto (imagen/
// video/documento). El buffer acumula varios. `media` se usa en el Modo Dueño.
type InboundPiece = { text: string; audioUrl: string; media?: OwnerInboundMedia | null }

// BUFFER 1:1 por contacto (persiste entre requests: el server de Next es de larga
// vida). Junta los mensajitos seguidos del mismo cliente y responde UNA sola vez.
type YcloudBufEntry = {
  pieces: InboundPiece[]
  timer: NodeJS.Timeout
  agent: WebhookAgent
  from: string
  contactName?: string
  receivedAt: number
}
const inboundBuffer = new Map<string, YcloudBufEntry>()

interface WebhookAgent {
  id: string
  name: string
  personalityPrompt: string
  model: string
  temperature: number
  provider: string
  providerApiKeyEnc: string | null
  providerSender: string | null
  openaiKeyEnc: string | null
  organizationId: string | null
  isActive: boolean
  webhookToken: string | null
  voiceEnabled: boolean
  voiceMode: string
  voiceId: string | null
}

// ── Parsing del payload YCloud v2 ────────────────────────────────────────────────

/**
 * Extrae `{ from, text }` de un `whatsappInboundMessage`.
 * Texto plano en type=text; en type=image se marca `[imagen]` (con caption si hay).
 * Devuelve `null` si no hay remitente o no hay texto procesable.
 */
function parseInbound(payload: unknown): { from: string; text: string; msgId: string; ycloudId: string; name: string; audioUrl: string; media: OwnerInboundMedia | null } | null {
  try {
    if (!payload || typeof payload !== 'object') return null
    const msg = (payload as Record<string, unknown>).whatsappInboundMessage
    if (!msg || typeof msg !== 'object') return null
    const m = msg as Record<string, unknown>

    const from = String(m.from ?? '').trim()
    if (!from) return null
    // ID del mensaje de WhatsApp (para deduplicar entregas repetidas de YCloud).
    const msgId = String(m.wamid ?? m.id ?? m.messageId ?? '').trim()
    // ID INTERNO de YCloud (recurso inboundMessage) → es el que necesita markAsRead.
    const ycloudId = String(m.id ?? m.wamid ?? m.messageId ?? '').trim()
    // Nombre del perfil del remitente (si YCloud lo envía) → saludar por su nombre.
    const profile = (m.customerProfile ?? {}) as Record<string, unknown>
    const name = String(profile.name ?? m.profileName ?? '').trim()

    const type = String(m.type ?? 'text')
    let text = ''
    let audioUrl = ''
    let media: OwnerInboundMedia | null = null
    if (type === 'image') {
      const img = (m.image ?? {}) as Record<string, unknown>
      const caption = String(img.caption ?? '').trim()
      const link = String(img.link ?? img.url ?? '').trim()
      const mimeType = String(img.mimeType ?? img.type ?? 'image/jpeg')
      text = caption // el caption es el texto/instrucción; el marcador [imagen] se agrega aparte
      if (link) media = { kind: 'IMAGE', url: link, mimeType, caption }
    } else if (type === 'video') {
      const vid = (m.video ?? {}) as Record<string, unknown>
      const caption = String(vid.caption ?? '').trim()
      const link = String(vid.link ?? vid.url ?? '').trim()
      const mimeType = String(vid.mimeType ?? vid.type ?? 'video/mp4')
      text = caption
      if (link) media = { kind: 'VIDEO', url: link, mimeType, caption }
    } else if (type === 'document') {
      const doc = (m.document ?? {}) as Record<string, unknown>
      const caption = String(doc.caption ?? '').trim()
      const link = String(doc.link ?? doc.url ?? '').trim()
      const filename = String(doc.filename ?? doc.name ?? '').trim()
      const mimeType = String(doc.mimeType ?? doc.type ?? 'application/pdf')
      text = caption
      if (link) media = { kind: 'PDF', url: link, mimeType, filename, caption }
    } else if (type === 'audio' || type === 'voice') {
      // Nota de voz: guardamos la URL para transcribirla luego (Whisper).
      const audio = (m.audio ?? m.voice ?? {}) as Record<string, unknown>
      audioUrl = String(audio.link ?? audio.url ?? audio.id ?? '').trim()
    } else {
      const textObj = (m.text ?? {}) as Record<string, unknown>
      text = String(textObj.body ?? '').trim()
    }

    if (!text && !audioUrl && !media) return null
    return { from, text, msgId, ycloudId, name, audioUrl, media }
  } catch {
    return null
  }
}

// ── Resolución de recursos para las acciones del agente ──────────────────────────

/** Resuelve el asset de una acción (por assetId y luego por título). */
function resolveMediaAsset(args: Record<string, unknown>, media: MediaRow[]): MediaRow | null {
  const readArg = (k: string): string => {
    const v = args[k]
    return typeof v === 'string' ? v.trim() : ''
  }
  const assetId = readArg('assetId')
  const assetTitle = readArg('assetTitle')

  if (assetId) {
    const byId = media.find((m) => m.id === assetId)
    if (byId) return byId
  }
  const matchByTitle = (needle: string): MediaRow | null => {
    const lower = needle.toLowerCase()
    const exact = media.find((m) => m.title.toLowerCase() === lower)
    if (exact) return exact
    const partial = media.find((m) => {
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

// ── Procesamiento asíncrono del turno ────────────────────────────────────────────

/**
 * Ejecuta el turno completo del agente y persiste memoria + logs.
 * TODO va dentro de try/catch: nunca lanza (se llama en segundo plano).
 */
async function processInbound(
  agent: WebhookAgent,
  from: string,
  pieces: InboundPiece[],
  contactName?: string,
  receivedAt?: number,
): Promise<void> {
  const contactPhone = from.replace(/\D/g, '') || from

  try {
    // 1) OpenAI key del agente.
    let openaiKey = ''
    if (agent.openaiKeyEnc) {
      try {
        openaiKey = decrypt(agent.openaiKeyEnc)
      } catch {
        openaiKey = ''
      }
    }
    if (!openaiKey.trim()) {
      console.warn(`[DIAMOND YCloud] Agente ${agent.id} sin OpenAI key usable — no responde`)
      return
    }

    // 1.5) BUFFER: combinar todos los mensajitos del cliente en UN solo texto.
    //      Las notas de voz se transcriben (Whisper) y se agregan al texto.
    //      Los archivos adjuntos (imagen/video/documento) se juntan en `attachedMedia`.
    let customerSentAudio = false
    const parts: string[] = []
    const attachedMedia: OwnerInboundMedia[] = []
    for (const p of pieces) {
      if (p.text && p.text.trim()) parts.push(p.text.trim())
      if (p.audioUrl) {
        const t = await transcribeWithRetry(p.audioUrl, openaiKey)
        if (t) { parts.push(t); customerSentAudio = true }
      }
      if (p.media) attachedMedia.push(p.media)
    }

    // ── MODO DUEÑO ────────────────────────────────────────────────────────────────
    // Si escribe el DUEÑO, su mensaje va al CEREBRO ADMIN (programar, subir recursos,
    // editar el cerebro, etc.), NO a la atención normal. Nadie más entra acá.
    if (isOwnerPhone(from)) {
      await handleOwnerInbound({
        agent, // WebhookAgent es compatible con OwnerInboundAgent (id/name/model/provider/voz…)
        openaiKey,
        from,
        message: parts.join('\n').trim(),
        attachedMedia,
        sentAudio: customerSentAudio, // si mandó nota de voz, le contestamos también en audio
      })
      return
    }

    // NO dueño: reconstruimos el marcador [imagen] (compat) para que CAMILA sepa que
    // adjuntaron una imagen aunque venga sin texto.
    for (const md of attachedMedia) {
      if (md.kind === 'IMAGE') parts.push('[imagen]')
    }
    const finalMessage = parts.join('\n')
    if (!finalMessage.trim()) {
      // No se pudo entender (audio inentendible, etc.) → respuesta amable en vez
      // de dejarlo "solo en visto".
      if (pieces.some(p => p.audioUrl)) {
        try {
          if (typeof receivedAt === 'number') {
            const el = Date.now() - receivedAt
            if (el < REPLY_DELAY_MS) await sleep(REPLY_DELAY_MS - el)
          }
          await sendAgentText(agent, from, 'Perdón, no pude escuchar bien tu audio 🙈 ¿Me lo podés escribir, porfa?')
        } catch { /* noop */ }
      }
      return
    }

    // 2) Contexto: conocimiento + reglas + biblioteca + memoria reciente.
    const [knowledge, rules, media, memoryRows] = await Promise.all([
      prisma.knowledgeItem.findMany({
        where: { agentId: agent.id, isActive: true },
        select: { title: true, content: true, category: true },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.safetyRule.findMany({
        where: { agentId: agent.id, isActive: true },
        select: { description: true, type: true },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.mediaAsset.findMany({
        select: { id: true, type: true, title: true, caption: true, url: true, linkUrl: true, textContent: true, tags: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.assistantMemory.findMany({
        where: { agentId: agent.id, contactPhone },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { role: true, content: true },
      }),
    ])

    // Memoria: más reciente primero → invertir a orden cronológico.
    const history = memoryRows
      .reverse()
      .map((m) => ({ role: (m.role === 'bot' ? 'bot' : 'user') as 'user' | 'bot', content: m.content }))

    // 3) Turno del agente.
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
      // Primer mensaje (sin memoria previa) → bienvenida cálida por su nombre.
      contextNote: memoryRows.length === 0
        ? 'Es la PRIMERA vez que esta persona te escribe. Dale una bienvenida cálida, breve y personal usando su NOMBRE, y luego respondé su mensaje con naturalidad.'
        : undefined,
      userMessage: finalMessage,
    }

    const result = await runAgentTurn(input)

    // 3.5) Esperar hasta el segundo 5.5 desde que llegó el mensaje, para que la
    //      respuesta salga DESPUÉS del visto (que se marca a los 5s). Más humano.
    if (typeof receivedAt === 'number') {
      const elapsed = Date.now() - receivedAt
      if (elapsed < REPLY_DELAY_MS) await sleep(REPLY_DELAY_MS - elapsed)
    }

    // 4) Responder: en NOTA DE VOZ si corresponde (el cliente mandó audio, o modo
    //    "siempre"); si no se puede generar la voz, cae a texto.
    if (result.text?.trim()) {
      const clean = stripEmotionTags(result.text)
      const bubbles = splitBubbles(clean, 3) // 2–3 burbujas cortas (nunca un bloque largo)
      const bubblePause = () => sleep(Math.floor(Math.random() * 800) + 900) // pausa humana entre burbujas

      // La parte que iría por AUDIO: si hay 2+ burbujas, todo MENOS la primera; si hay 1, esa.
      const speakPart = bubbles.length >= 2 ? bubbles.slice(1).join('\n\n') : (bubbles[0] || clean)
      // buildVoiceReply devuelve URL solo si toca hablar (cliente mandó audio o modo siempre); si no, null.
      const voiceUrl = await buildVoiceReply(agent, speakPart, customerSentAudio, agent.id)

      if (voiceUrl) {
        // MODO AUDIO → 1ra burbuja como TEXTO corto (si hay 2+), y el resto como NOTA DE VOZ.
        if (bubbles.length >= 2) {
          await sendAgentText(agent, from, bubbles[0])
          await bubblePause()
        }
        const audioOk = await sendAgentMedia(agent, from, { type: 'AUDIO', url: voiceUrl })
        if (!audioOk) {
          // Si no se pudo el audio, mandamos ese contenido como texto (nada se pierde).
          const rest = bubbles.length >= 2 ? bubbles.slice(1) : bubbles
          for (let i = 0; i < rest.length; i++) {
            await sendAgentText(agent, from, rest[i])
            if (i < rest.length - 1) await bubblePause()
          }
        }
      } else {
        // MODO TEXTO → todas las burbujas como texto separado.
        for (let i = 0; i < bubbles.length; i++) {
          await sendAgentText(agent, from, bubbles[i])
          if (i < bubbles.length - 1) await bubblePause()
        }
      }
    }

    // 5) Enviar cada medio pedido por las acciones (tools send_*).
    if (result.actions.length > 0) {
      console.log(`[DIAMOND YCloud] acciones del agente: ${result.actions.map((a) => a.tool).join(', ')}`)
    }
    for (const action of result.actions) {
      if (action.tool === 'escalate_to_human') continue
      const asset = resolveMediaAsset(action.args, media)
      if (!asset) {
        console.warn(`[DIAMOND YCloud] recurso NO resuelto para ${action.tool}: ${JSON.stringify(action.args)}`)
        continue
      }
      const okMedia = await sendAgentMedia(agent, from, {
        type: asset.type,
        url: asset.url,
        linkUrl: asset.linkUrl,
        textContent: asset.textContent,
        title: asset.title,
        caption: (asset as { caption?: string | null }).caption ?? null,
      })
      console.log(`[DIAMOND YCloud] recurso "${asset.title}" (${asset.type}) enviado=${okMedia}`)
    }

    // 6) Escalamiento: por ahora solo se loguea.
    if (result.escalated) {
      console.log(`[DIAMOND YCloud] Escalamiento a humano — agente=${agent.id} contacto=${contactPhone}`)
    }

    // 7) Persistir memoria (user/bot). Protegido por su propio try/catch.
    try {
      await prisma.assistantMemory.createMany({
        data: [
          { agentId: agent.id, contactPhone, role: 'user', content: finalMessage },
          ...(result.text?.trim()
            ? [{ agentId: agent.id, contactPhone, role: 'bot', content: stripEmotionTags(result.text) }]
            : []),
        ],
      })
    } catch (err) {
      console.error(`[DIAMOND YCloud] error guardando memoria agentId=${agent.id}:`, err)
    }

    // 8) Persistir log OUT (el IN ya se creó como "reclamo" de dedup en el POST).
    try {
      if (result.text?.trim()) {
        await prisma.assistantMessageLog.create({
          data: {
            organizationId: agent.organizationId,
            agentId: agent.id,
            contactPhone,
            direction: 'OUT',
            messageType: 'TEXT',
            content: result.text,
            status: 'SENT',
          },
        })
      }
    } catch (err) {
      console.error(`[DIAMOND YCloud] error guardando log OUT agentId=${agent.id}:`, err)
    }
  } catch (err) {
    console.error(`[DIAMOND YCloud] processInbound error agentId=${agent.id}:`, err)
  }
}

// ── Handlers HTTP ─────────────────────────────────────────────────────────────────

/**
 * POST — mensaje entrante de YCloud. Responde 200 SIEMPRE (silencioso) y procesa
 * el turno del agente en segundo plano.
 */
export async function POST(request: NextRequest, { params }: { params: { agentId: string } }) {
  const { agentId } = params
  const receivedAt = Date.now() // momento en que llegó → base para el visto (5s) y la respuesta (5.5s)

  try {
    const token = request.nextUrl.searchParams.get('token')

    const agent = await prisma.assistantAgent.findUnique({
      where: { id: agentId },
      select: {
        id: true,
        name: true,
        personalityPrompt: true,
        model: true,
        temperature: true,
        provider: true,
        providerApiKeyEnc: true,
        providerSender: true,
        openaiKeyEnc: true,
        organizationId: true,
        isActive: true,
        webhookToken: true,
        voiceEnabled: true,
        voiceMode: true,
        voiceId: true,
      },
    })

    // Agente inexistente o token inválido → 200 silencioso.
    if (!agent || token !== agent.webhookToken) {
      return NextResponse.json({ ok: true })
    }

    // Inactivo o canal distinto de YCloud → 200 silencioso.
    if (!agent.isActive || agent.provider !== 'YCLOUD') {
      return NextResponse.json({ ok: true })
    }

    const payload = await request.json().catch(() => null)
    const parsed = parseInbound(payload)
    if (!parsed) {
      return NextResponse.json({ ok: true })
    }

    // DEDUP: YCloud puede entregar el mismo mensaje más de una vez. Reclamamos el
    // mensaje creando el log de entrada (IN) con providerMsgId ÚNICO; si ya existe
    // (P2002) → ya lo procesamos → respondemos 200 y NO volvemos a contestar.
    const contactPhone = parsed.from.replace(/\D/g, '') || parsed.from
    try {
      await prisma.assistantMessageLog.create({
        data: {
          organizationId: agent.organizationId,
          agentId: agent.id,
          contactPhone,
          direction: 'IN',
          messageType: 'TEXT',
          content: parsed.text || '[nota de voz]',
          status: 'SENT',
          providerMsgId: parsed.msgId || null,
        },
      })
    } catch (err) {
      if ((err as { code?: string })?.code === 'P2002') {
        return NextResponse.json({ ok: true }) // mensaje repetido → ya respondido, no duplicar
      }
      console.error(`[DIAMOND YCloud] error al registrar entrada agentId=${agentId}:`, err)
    }

    // Marcar como LEÍDO (✓✓ azul) 5 segundos después de recibir.
    console.log(`[DIAMOND YCloud] inbound from=${parsed.from} tipo=${parsed.audioUrl ? 'AUDIO' : 'texto'} ycloudId=${parsed.ycloudId}`)
    if (parsed.ycloudId && agent.providerApiKeyEnc) {
      let readApiKey = ''
      try { readApiKey = decrypt(agent.providerApiKeyEnc) } catch { readApiKey = '' }
      if (readApiKey) {
        const readId = parsed.ycloudId
        setTimeout(() => {
          markAsRead(readId, readApiKey)
            .then(() => console.log(`[DIAMOND YCloud] ✓✓ marcado como leído id=${readId}`))
            .catch((e) =>
              console.error(`[DIAMOND YCloud] markAsRead falló id=${readId}:`, (e as { message?: string })?.message),
            )
        }, READ_DELAY_MS)
      } else {
        console.warn(`[DIAMOND YCloud] markAsRead saltado: no se pudo descifrar la API key`)
      }
    } else {
      console.warn(`[DIAMOND YCloud] markAsRead saltado: ycloudId="${parsed.ycloudId}" apiKey=${!!agent.providerApiKeyEnc}`)
    }

    // BUFFER: en vez de responder a cada mensajito, acumulamos y (re)programamos.
    // Cada mensaje nuevo del mismo contacto reinicia el temporizador; al descansar
    // DIRECT_BUFFER_MS respondemos UNA sola vez con todo lo que escribió junto.
    // (Respondemos 200 YA; el trabajo va en segundo plano.)
    const bufKey = `${agent.id}:${contactPhone}`
    const prevB = inboundBuffer.get(bufKey)
    if (prevB) clearTimeout(prevB.timer)
    const entryB: YcloudBufEntry = prevB ?? {
      pieces: [], timer: null as unknown as NodeJS.Timeout, agent, from: parsed.from,
      contactName: parsed.name || undefined, receivedAt,
    }
    entryB.pieces.push({ text: parsed.text || '', audioUrl: parsed.audioUrl || '', media: parsed.media })
    entryB.agent = agent
    entryB.from = parsed.from
    if (parsed.name) entryB.contactName = parsed.name
    entryB.timer = setTimeout(() => {
      inboundBuffer.delete(bufKey)
      processInbound(entryB.agent, entryB.from, entryB.pieces, entryB.contactName, entryB.receivedAt).catch((err) => {
        console.error(`[DIAMOND YCloud] processInbound rechazado agentId=${agentId}:`, err)
      })
    }, DIRECT_BUFFER_MS)
    inboundBuffer.set(bufKey, entryB)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error(`[DIAMOND YCloud] error no controlado agentId=${agentId}:`, err)
    return NextResponse.json({ ok: true }) // Siempre 200.
  }
}

/**
 * GET — verificación de webhook. Si viene `?challenge=`, se devuelve en texto
 * plano (como el webhook de venta); si no, `{ ok: true }`.
 */
export async function GET(request: NextRequest) {
  const challenge = request.nextUrl.searchParams.get('challenge')
  if (challenge) {
    return new Response(challenge, { status: 200, headers: { 'Content-Type': 'text/plain' } })
  }
  return NextResponse.json({ ok: true })
}
