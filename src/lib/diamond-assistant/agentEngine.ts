/**
 * Diamond Assistant — Agent Engine (FASE 3: EL CEREBRO)
 *
 * El "corazón" del AGENTE IA, ya conectado a OpenAI con function-calling:
 *   1) buildAgentSystemPrompt(): arma el system prompt combinando personalidad,
 *      base de conocimiento, biblioteca de recursos y reglas de seguridad.
 *   2) AGENT_TOOLS: definición JSON-schema de las 6 herramientas que el modelo
 *      puede invocar (send_pdf, send_link, send_video, send_image, send_audio,
 *      escalate_to_human).
 *   3) executeTool(): en MODO PLAYGROUND no envía nada por WhatsApp; resuelve el
 *      recurso pedido y devuelve una descripción legible de lo que HARÍA.
 *   4) runAgentTurn(): un turno completo del agente contra OpenAI (2 llamadas si
 *      hay tool_calls) con el contrato fijo que consume el resto del sistema.
 *
 * El envío real por WhatsApp vive en `mediaSender.ts` y se cablea en la Fase 5;
 * el playground NUNCA lo usa.
 */

import {
  openaiChat,
  type AssistantMessage,
  type ChatMessage,
} from './openaiChat'

// ---------------------------------------------------------------------------
// Contrato público (consumido por rutas/UI del playground)
// ---------------------------------------------------------------------------

export type AgentTurnInput = {
  agent: {
    id: string
    name: string
    personalityPrompt: string
    model: string
    temperature: number
    openaiKey: string
  }
  knowledge: { title: string; content: string; category: string | null }[]
  rules: { description: string; type: 'FORBID' | 'ESCALATE' | 'REQUIRE_APPROVAL' }[]
  media: {
    id: string
    type: string
    title: string
    url: string | null
    linkUrl: string | null
    textContent: string | null
    tags?: unknown
  }[]
  history: { role: 'user' | 'bot'; content: string }[]
  /** Nombre de la persona (de su perfil de WhatsApp), para saludar por su nombre. */
  contactName?: string
  /** Nota de contexto para este turno (ej. "es su primer mensaje → dale la bienvenida"). */
  contextNote?: string
  /**
   * Permite que el turno devuelva texto VACÍO = "no hace falta responder".
   * Se usa en GRUPOS: si el mensaje no es una pregunta, el modelo devuelve vacío y
   * el agente NO escribe nada. Sin este flag se aplicaría el texto de relleno
   * ("De acuerdo."), que hacía que contestara cualquier saludo o aplauso.
   */
  allowEmpty?: boolean
  userMessage: string
}

/** Una acción que el agente decidió tomar en el turno (tool ejecutada). */
export type AgentAction = { tool: string; args: Record<string, unknown>; result: string }

/** Resultado de un turno del agente. */
export type AgentTurnResult = { text: string; actions: AgentAction[]; escalated: boolean }

// Atajos de tipo derivados del contrato (para no repetir formas).
type PromptKnowledge = AgentTurnInput['knowledge']
type PromptRules = AgentTurnInput['rules']
type PromptMedia = AgentTurnInput['media']
type MediaItem = PromptMedia[number]

const DEFAULT_MODEL = 'gpt-4o'
const TURN_TIMEOUT_MS = 60000 // 60s: los modelos gpt-5.x razonan y tardan un poco más

/** Texto de degradación cuando OpenAI no responde o la key es inválida. */
const FALLBACK_TEXT =
  'No pude generar la respuesta ahora (revisá la API key de OpenAI del agente).'

// ---------------------------------------------------------------------------
// 1) System prompt
// ---------------------------------------------------------------------------

/**
 * Construye el system prompt del agente combinando:
 *   - PERSONALIDAD (`agent.personalityPrompt`) como identidad/tono base.
 *   - BASE DE CONOCIMIENTO activa como "Información que conoces".
 *   - BIBLIOTECA DE RECURSOS disponibles (para poder enviarlos vía tools).
 *   - REGLAS DE SEGURIDAD: FORBID (prohibiciones estrictas), ESCALATE (cuándo
 *     derivar a un humano con escalate_to_human) y REQUIRE_APPROVAL (nota).
 *
 * Nota: `knowledge` ya viene filtrado por el llamador con SOLO los items
 * activos. `media` se agrega como 4º parámetro para poder listar la biblioteca
 * (el modelo necesita conocer ids/títulos válidos y no inventar recursos).
 */
export function buildAgentSystemPrompt(
  agent: { name: string; personalityPrompt: string },
  knowledge: PromptKnowledge = [],
  rules: PromptRules = [],
  media: PromptMedia = [],
  contactName?: string,
  contextNote?: string,
): string {
  const parts: string[] = []

  // --- Personalidad / identidad ---
  parts.push('# IDENTIDAD Y PERSONALIDAD')
  parts.push(`Eres "${agent.name}" y conversás por WhatsApp con las personas del equipo.`)
  parts.push(
    'Hablá SIEMPRE de forma cercana, cálida, TIERNA, dulce y MUY HUMANA, como una persona real del ' +
      'equipo que quiere de verdad a su gente. Esa ternura y calidez es tu sello: la mostrás con ' +
      'TODAS las personas que te escriban, sin excepción, tengan el humor que tengan. Usá un toque ' +
      'de humor amable y liviano cuando encaje (sin forzarlo ni perder profesionalismo) para sonar ' +
      'natural y agradable. NUNCA digas que sos un bot, una IA ni un "asistente virtual". No uses ' +
      'encabezados ni etiquetas tipo "RESPUESTA:" — respondé natural, como en un chat normal. ' +
      'Si la persona te habla por AUDIO, podés contestarle por voz — NUNCA digas que no podés ' +
      'enviar audios ni notas de voz; simplemente respondé con naturalidad.',
  )
  parts.push(
    '# EMPATÍA Y TERNURA (SIEMPRE, CON TODOS)\n' +
      '- Antes de responder, CAPTÁ cómo se siente la persona (dudas, miedo, entusiasmo, cansancio, frustración) ' +
      'y respondé desde ahí, con corazón.\n' +
      '- VALIDÁ lo que siente ("te entiendo", "qué lindo que preguntes esto", "tranqui, lo vemos juntos") antes de dar la info.\n' +
      '- Si alguien está dudando, desanimado o molesto, respondé con MÁS paciencia y dulzura, nunca cortante ni fría.\n' +
      '- Tratá a cada persona como si fuera importante y especial. Que sienta cariño real, cercanía y apoyo en cada mensaje.\n' +
      '- Aunque tengas que decir un "no" o dar una mala noticia, decilo con suavidad y amor.',
  )
  parts.push(
    'MUY IMPORTANTE — SÉ BREVE: respondé CORTO y SOLO lo necesario, como en un chat real. ' +
      'Nada de mensajes largos ni explicaciones de más, ni en texto ni en audio. ' +
      'Si alcanza con 1 o 2 frases, usá 1 o 2 frases. Dá la información justa que te piden; ' +
      'si la persona necesita más detalle, te lo va a pedir y ahí se lo das. ' +
      'Evitá repetir lo que ya dijiste o dar rodeos.',
  )
  parts.push(
    'FORMATO EN BURBUJAS: estructurá tu respuesta en 2 o 3 partes CORTAS, separadas por una ' +
      'LÍNEA EN BLANCO entre cada una (así se mandan como burbujas separadas, no un bloque largo). ' +
      'La PRIMERA parte que sea una frase MUY corta (un enganche, saludo breve o lo más importante en 1 línea); ' +
      'las siguientes completan con el detalle, también cortas. ' +
      'Si vas a responder por voz, esa primera frase corta irá como texto y el resto como nota de voz — ' +
      'así que hacé que la primera línea funcione sola como apertura.',
  )
  const nombreContacto = contactName?.trim()
  if (nombreContacto) {
    parts.push(
      `La persona con la que estás hablando se llama ${nombreContacto}. ` +
        'Usá su nombre de forma natural al saludar o responder (sin abusar).',
    )
  }
  const personality = agent.personalityPrompt?.trim()
  if (personality) parts.push(personality)

  const nota = contextNote?.trim()
  if (nota) {
    parts.push(`\n# CONTEXTO DE ESTE MENSAJE\n${nota}`)
  }

  // --- Base de conocimiento ("Información que conoces") ---
  if (knowledge.length > 0) {
    parts.push('\n# INFORMACIÓN QUE CONOCES')
    parts.push(
      'Responde basándote en esta información. No inventes datos que no estén aquí:',
    )
    for (const item of knowledge) {
      const cat = item.category ? ` [${item.category}]` : ''
      parts.push(`\n## ${item.title}${cat}\n${item.content}`)
    }
  }

  // --- Biblioteca de recursos ---
  if (media.length > 0) {
    parts.push('\n# BIBLIOTECA DE RECURSOS DISPONIBLES')
    parts.push(
      'Estos son los ÚNICOS recursos que puedes enviar. NUNCA inventes ni ' +
        'ofrezcas recursos que no estén en esta lista:',
    )
    for (const m of media) {
      const tags = Array.isArray(m.tags) ? (m.tags as unknown[]).map((t) => String(t)).filter(Boolean) : []
      const tagStr = tags.length ? ` [${tags.join(', ')}]` : ''
      parts.push(`- (${m.type}) «${m.title}»${tagStr} — assetId: ${m.id}`)
    }
    parts.push(
      '\nCuando el usuario pida INFORMACIÓN, el catálogo, la lista de precios, la ' +
        'presentación, los requisitos, el plan, etc., ENVIÁ el RECURSO REAL con su ' +
        'herramienta (send_pdf para PDFs, send_image para imágenes, send_video para ' +
        'videos, send_audio para audios), indicando el `assetId` (preferido) o el ' +
        '`assetTitle`. NO te limites a describirlo ni a mandar un enlace: mandá el archivo. ' +
        'Podés enviar VARIOS recursos si aplica (p. ej. varias listas de precios). ' +
        'Usá send_link (un enlace) SOLO cuando pidan ACCESO a una plataforma (oficina ' +
        'virtual, sistema, registro) — nunca uses un enlace para reemplazar un PDF o imagen ' +
        'que ya existe como archivo. Si el recurso pedido no está en la lista, decilo con ' +
        'claridad en lugar de inventarlo.',
    )
    parts.push(
      '\nTESTIMONIOS: cuando el cliente pida testimonios, pruebas, resultados, ' +
        'experiencias o casos de éxito de otras personas, ENVIÁ los recursos etiquetados ' +
        'con «testimonio» (con send_image o send_video según el tipo). Si pide sobre un ' +
        'PRODUCTO, mandá los que además tengan la etiqueta «producto»; si pide sobre el ' +
        'NEGOCIO, las ganancias o la oportunidad, mandá los que tengan «negocio». Enviá de ' +
        '1 a 3 testimonios (los más relevantes), nunca todos de una. Si no hay testimonios ' +
        'de lo que piden, decilo con amabilidad.',
    )
  } else {
    parts.push(
      '\n# BIBLIOTECA DE RECURSOS\nNo hay recursos disponibles para enviar. No ' +
        'ofrezcas PDFs, enlaces, videos, imágenes ni audios.',
    )
  }

  // --- Reglas de seguridad ---
  const forbid = rules.filter((r) => r.type === 'FORBID')
  const escalate = rules.filter((r) => r.type === 'ESCALATE')
  const requireApproval = rules.filter((r) => r.type === 'REQUIRE_APPROVAL')

  if (forbid.length + escalate.length + requireApproval.length > 0) {
    parts.push('\n# REGLAS DE SEGURIDAD (OBLIGATORIAS)')

    if (forbid.length > 0) {
      parts.push('\nProhibiciones estrictas (NUNCA las incumplas):')
      for (const r of forbid) parts.push(`- ${r.description}`)
    }

    if (escalate.length > 0) {
      parts.push(
        '\nCuándo derivar a un humano (usa la herramienta escalate_to_human):',
      )
      for (const r of escalate) parts.push(`- ${r.description}`)
    }

    if (requireApproval.length > 0) {
      parts.push(
        '\nRequieren aprobación de un humano antes de proceder (avísalo, no ' +
          'actúes por tu cuenta):',
      )
      for (const r of requireApproval) parts.push(`- ${r.description}`)
    }
  }

  parts.push(
    '\nSi un caso es importante o sensible, o si una regla lo indica, usa la ' +
      'herramienta escalate_to_human en lugar de improvisar.',
  )

  // Recordatorio FINAL (lo último que lee el modelo = lo que más respeta). Refuerza el
  // estilo en CADA turno para que no se olvide de ser breve y usar burbujas.
  parts.push(
    '\n# RECORDÁ SIEMPRE (aplica en CADA mensaje, no solo al inicio):\n' +
      '1) SÉ TIERNA, DULCE y EMPÁTICA con TODOS — es tu sello. Que sientan cariño y cercanía real en cada mensaje.\n' +
      '2) Respondé CORTO — solo lo necesario. Nunca mandes textos largos ni des rodeos.\n' +
      '3) Partí tu respuesta en 2 o 3 burbujas cortas, separadas por una LÍNEA EN BLANCO entre cada una.\n' +
      '4) La PRIMERA burbuja es una frase MUY corta (un enganche o lo más importante en 1 línea); las demás completan breve.\n' +
      '5) Si respondés por voz: esa primera frase corta va como texto y el detalle como nota de voz corta (menos de ~30s).\n' +
      '6) No repitas lo que ya dijiste antes en la charla.',
  )

  return parts.join('\n')
}

// ---------------------------------------------------------------------------
// 2) Definición de herramientas (function-calling de OpenAI)
// ---------------------------------------------------------------------------

/** Nombres de las tools disponibles para el agente. */
export type AgentToolName =
  | 'send_pdf'
  | 'send_link'
  | 'send_video'
  | 'send_image'
  | 'send_audio'
  | 'escalate_to_human'

/** Forma de una tool compatible con el campo `tools` de OpenAI. */
export interface AgentTool {
  type: 'function'
  function: {
    name: AgentToolName
    description: string
    parameters: {
      type: 'object'
      properties: Record<string, unknown>
      required?: string[]
      additionalProperties?: boolean
    }
  }
}

/** Fábrica de las 5 tools `send_*` (todas comparten parámetros assetId/assetTitle). */
function makeSendTool(name: Exclude<AgentToolName, 'escalate_to_human'>, humanType: string): AgentTool {
  return {
    type: 'function',
    function: {
      name,
      description:
        `Envía ${humanType} de la biblioteca al contacto. Indica el recurso por ` +
        '`assetId` (preferido) o por `assetTitle`. Úsala solo con recursos que ' +
        'existan en la biblioteca provista.',
      parameters: {
        type: 'object',
        properties: {
          assetId: {
            type: 'string',
            description: 'ID exacto del recurso en la biblioteca (preferido).',
          },
          assetTitle: {
            type: 'string',
            description: 'Título del recurso, si no conoces su assetId.',
          },
        },
        required: [],
        additionalProperties: false,
      },
    },
  }
}

/**
 * AGENT_TOOLS — catálogo de las 6 herramientas listo para pasar a OpenAI en el
 * campo `tools`. Las `send_*` reciben `assetId`/`assetTitle`; escalate recibe
 * `reason`. El destinatario NO lo decide el modelo (se resuelve del contexto).
 */
export const AGENT_TOOLS: AgentTool[] = [
  makeSendTool('send_pdf', 'un documento PDF (catálogo, propuesta, guía)'),
  makeSendTool('send_link', 'un enlace o URL (pago, agenda, web, formulario)'),
  makeSendTool('send_video', 'un video (demo, testimonio, tutorial)'),
  makeSendTool('send_image', 'una imagen (foto de producto, flyer, captura)'),
  makeSendTool('send_audio', 'un audio o nota de voz'),
  {
    type: 'function',
    function: {
      name: 'escalate_to_human',
      description:
        'Deriva la conversación a un humano cuando no puedes o no debes ' +
        'continuar (petición fuera de alcance, cliente molesto, regla de ' +
        'seguridad, caso sensible o que requiere aprobación).',
      parameters: {
        type: 'object',
        properties: {
          reason: {
            type: 'string',
            description: 'Motivo breve y claro del escalamiento a un humano.',
          },
        },
        required: ['reason'],
        additionalProperties: false,
      },
    },
  },
]

// ---------------------------------------------------------------------------
// 3) Ejecutor de herramientas (MODO PLAYGROUND: sin envío real)
// ---------------------------------------------------------------------------

/** Etiqueta legible por tipo de tool `send_*`. */
const SEND_TOOL_LABELS: Record<string, string> = {
  send_pdf: 'PDF',
  send_link: 'enlace',
  send_video: 'video',
  send_image: 'imagen',
  send_audio: 'audio',
}

/** Lee un string "limpio" de los args del modelo (o cadena vacía). */
function readArg(args: Record<string, unknown>, key: string): string {
  const v = args[key]
  return typeof v === 'string' ? v.trim() : ''
}

/**
 * Resuelve un recurso de `media` a partir de los args del modelo:
 *   1) por `assetId` exacto,
 *   2) por `assetTitle` exacto (case-insensitive) y luego por coincidencia
 *      parcial (contiene / contenido en),
 *   3) como último recurso, tratando `assetId` como si fuera un título.
 */
function resolveAsset(args: Record<string, unknown>, media: PromptMedia): MediaItem | null {
  const assetId = readArg(args, 'assetId')
  const assetTitle = readArg(args, 'assetTitle')

  if (assetId) {
    const byId = media.find((m) => m.id === assetId)
    if (byId) return byId
  }

  const matchByTitle = (needle: string): MediaItem | null => {
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
  // A veces el modelo pone el título dentro de assetId.
  if (assetId) {
    const hit = matchByTitle(assetId)
    if (hit) return hit
  }
  return null
}

/**
 * Ejecuta una herramienta en MODO PLAYGROUND: NO envía nada por WhatsApp.
 * Devuelve una descripción legible de lo que el agente HARÍA y si corresponde
 * un escalamiento a humano.
 */
export function executeTool(
  name: string,
  args: Record<string, unknown>,
  media: PromptMedia,
): { result: string; escalated: boolean } {
  if (name === 'escalate_to_human') {
    const reason = readArg(args, 'reason') || 'sin motivo especificado'
    return { result: `Escalaría a un humano: ${reason}`, escalated: true }
  }

  const label = SEND_TOOL_LABELS[name]
  if (!label) {
    return { result: `Herramienta desconocida: ${name}`, escalated: false }
  }

  const asset = resolveAsset(args, media)
  if (!asset) {
    const ref = readArg(args, 'assetTitle') || readArg(args, 'assetId')
    return {
      result:
        `No encontré ese ${label} en la biblioteca` +
        (ref ? ` («${ref}»)` : '') +
        ', así que no enviaría nada.',
      escalated: false,
    }
  }

  return { result: `Enviaría el ${label}: «${asset.title}»`, escalated: false }
}

// ---------------------------------------------------------------------------
// 4) Turno del agente
// ---------------------------------------------------------------------------

/** Parsea de forma segura el string JSON de argumentos de un tool_call. */
function parseToolArgs(raw: string | undefined): Record<string, unknown> {
  if (!raw) return {}
  try {
    const parsed: unknown = JSON.parse(raw)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {}
  } catch {
    return {}
  }
}

/**
 * Ejecuta un turno del agente contra OpenAI con function-calling.
 *
 * Flujo:
 *   1) Arma [system, ...history (bot→assistant), {user, userMessage}].
 *   2) 1ª llamada a OpenAI (model/temperature del agente, tools=AGENT_TOOLS,
 *      tool_choice:'auto').
 *   3) Si hay tool_calls: por cada uno resuelve el recurso en `input.media`,
 *      ejecuta en MODO PLAYGROUND (sin enviar nada), acumula las acciones y
 *      marca `escalated` si se usó escalate_to_human. Luego hace una 2ª llamada
 *      con los resultados de las tools para obtener el texto final natural.
 *   4) Si no hay tool_calls: devuelve el texto directo.
 *
 * ROBUSTEZ: si OpenAI falla o la key es inválida, NO lanza; devuelve el texto
 * de degradación (`FALLBACK_TEXT`). Timeout mediante AbortController.
 */
export async function runAgentTurn(input: AgentTurnInput): Promise<AgentTurnResult> {
  try {
    const systemPrompt = buildAgentSystemPrompt(
      { name: input.agent.name, personalityPrompt: input.agent.personalityPrompt },
      input.knowledge,
      input.rules,
      input.media,
      input.contactName,
      input.contextNote,
    )

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...input.history.map((h): ChatMessage =>
        h.role === 'bot'
          ? { role: 'assistant', content: h.content }
          : { role: 'user', content: h.content },
      ),
      { role: 'user', content: input.userMessage },
    ]

    const model = input.agent.model?.trim() || DEFAULT_MODEL

    // --- 1ª llamada: puede devolver texto y/o tool_calls ---
    const first: AssistantMessage = await openaiChat({
      apiKey: input.agent.openaiKey,
      model,
      messages,
      temperature: input.agent.temperature,
      tools: AGENT_TOOLS,
      toolChoice: 'auto',
      timeoutMs: TURN_TIMEOUT_MS,
    })

    const toolCalls = first.tool_calls ?? []

    // Sin herramientas: respuesta directa.
    // Si `allowEmpty` (grupos), un texto vacío significa "NO hace falta responder" y
    // se respeta tal cual; si no, se usa un relleno para no dejar al usuario sin nada.
    if (toolCalls.length === 0) {
      const direct = (first.content ?? '').trim()
      return {
        text: direct || (input.allowEmpty ? '' : 'De acuerdo.'),
        actions: [],
        escalated: false,
      }
    }

    // --- Con herramientas: ejecutar (playground) y recolectar acciones ---
    const actions: AgentAction[] = []
    let escalated = false

    // Se agrega el mensaje del asistente con los tool_calls al historial.
    messages.push({ role: 'assistant', content: first.content, tool_calls: toolCalls })

    for (const call of toolCalls) {
      const args = parseToolArgs(call.function.arguments)
      const { result, escalated: didEscalate } = executeTool(
        call.function.name,
        args,
        input.media,
      )
      if (didEscalate) escalated = true
      actions.push({ tool: call.function.name, args, result })
      messages.push({ role: 'tool', tool_call_id: call.id, content: result })
    }

    // --- 2ª llamada: texto final natural a partir de los resultados ---
    let finalText = ''
    try {
      const second = await openaiChat({
        apiKey: input.agent.openaiKey,
        model,
        messages,
        temperature: input.agent.temperature,
        timeoutMs: TURN_TIMEOUT_MS,
      })
      finalText = (second.content ?? '').trim()
    } catch {
      // Si la 2ª llamada falla, ya tenemos las acciones: combinamos sus
      // resultados como texto de respaldo en lugar de perder el turno.
      finalText = ''
    }

    if (!finalText) {
      finalText = actions.map((a) => a.result).join(' ').trim()
    }

    // Con `allowEmpty` no forzamos relleno: si no hay texto, igual quedan las acciones
    // (p. ej. mandar un PDF) y el llamador decide qué hacer.
    return { text: finalText || (input.allowEmpty ? '' : 'Listo.'), actions, escalated }
  } catch {
    // OpenAI falló / key inválida / timeout → degradación controlada.
    return { text: FALLBACK_TEXT, actions: [], escalated: false }
  }
}
