/**
 * Diamond Assistant — Cliente HTTP mínimo de OpenAI (chat/completions).
 *
 * Envuelve la llamada a `POST /v1/chat/completions` con function-calling. Sigue
 * EXACTAMENTE el mismo patrón HTTP que `src/lib/ai/classifyTaskEvidence.ts`:
 *   - `fetch` directo (sin SDK) al endpoint chat/completions.
 *   - Headers `Content-Type` + `Authorization: Bearer <key>`.
 *   - Timeout con `AbortController` (por defecto 30s).
 *   - Si la respuesta no es 2xx, lanza un Error con el status + cuerpo.
 *
 * Esta función SÍ lanza en caso de error/timeout/key inválida. Quien la usa
 * (agentEngine.runAgentTurn) es el responsable de capturar y degradar con
 * elegancia (no propagar la excepción al llamador final).
 */

const OPENAI_CHAT_URL = 'https://api.openai.com/v1/chat/completions'

/** Llamada a función emitida por el modelo (function-calling). */
export type OpenAIToolCall = {
  id: string
  type: 'function'
  function: {
    name: string
    /** Argumentos como STRING JSON (hay que parsearlos). */
    arguments: string
  }
}

/**
 * Mensaje del chat en el formato de OpenAI. Es una unión discriminada por
 * `role` para poder construir la conversación (incluyendo los mensajes de
 * herramienta `tool` que devuelven el resultado de cada tool_call).
 */
export type ChatMessage =
  | { role: 'system'; content: string }
  | { role: 'user'; content: string }
  | { role: 'assistant'; content: string | null; tool_calls?: OpenAIToolCall[] }
  | { role: 'tool'; tool_call_id: string; content: string }

/** Definición de herramienta en el formato `tools` de chat/completions. */
export type ChatCompletionTool = {
  type: 'function'
  function: {
    name: string
    description?: string
    /** JSON-schema de los parámetros (se serializa tal cual en el body). */
    parameters?: unknown
  }
}

/** Mensaje del asistente devuelto por el modelo. */
export type AssistantMessage = {
  role: 'assistant'
  content: string | null
  tool_calls?: OpenAIToolCall[]
}

export type OpenAIChatParams = {
  /** API key del agente (o de entorno). Obligatoria. */
  apiKey: string
  /** Modelo, p. ej. "gpt-4o". */
  model: string
  messages: ChatMessage[]
  /** Temperatura de generación (0..2). */
  temperature?: number
  /** Herramientas disponibles (function-calling). */
  tools?: ChatCompletionTool[]
  /** Estrategia de uso de tools. */
  toolChoice?: 'auto' | 'none'
  /** Timeout en ms (por defecto 30000). */
  timeoutMs?: number
  /** Límite de tokens de salida (opcional). */
  maxTokens?: number
}

/**
 * Ejecuta una llamada a chat/completions y devuelve el mensaje del asistente
 * (con `content` y/o `tool_calls`). Lanza si hay error de red, HTTP o timeout.
 */
export async function openaiChat(params: OpenAIChatParams): Promise<AssistantMessage> {
  const {
    apiKey,
    model,
    messages,
    temperature,
    tools,
    toolChoice,
    timeoutMs = 30000,
    maxTokens,
  } = params

  if (!apiKey || !apiKey.trim()) {
    throw new Error('Falta la API Key de OpenAI del agente.')
  }

  // Los modelos gpt-5.x razonan y RECHAZAN `temperature` custom; además usan
  // `max_completion_tokens` en vez de `max_tokens`. Los detectamos por el prefijo.
  const isReasoning = /^gpt-5/.test(model)

  const body: Record<string, unknown> = { model, messages }
  if (typeof temperature === 'number' && !isReasoning) body.temperature = temperature
  if (typeof maxTokens === 'number') {
    if (isReasoning) body.max_completion_tokens = maxTokens
    else body.max_tokens = maxTokens
  }
  if (tools && tools.length > 0) {
    body.tools = tools
    body.tool_choice = toolChoice ?? 'auto'
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(OPENAI_CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`OpenAI chat error ${res.status}: ${err}`)
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: AssistantMessage }>
    }
    const message = data.choices?.[0]?.message
    if (!message) {
      throw new Error('OpenAI no devolvió ningún mensaje.')
    }

    return {
      role: 'assistant',
      content: message.content ?? null,
      tool_calls: message.tool_calls,
    }
  } finally {
    clearTimeout(timeout)
  }
}
