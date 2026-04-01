/**
 * Motor de IA interno para el WhatsApp Manager.
 * Genera respuestas sin pasar por el endpoint HTTP (no requiere auth de usuario).
 *
 * REGLA: El System Prompt del usuario es la UNICA fuente de verdad.
 * Este archivo solo provee: datos de sesion, productos y formato JSON minimo.
 * NO inyecta reglas, limites de caracteres, ni instrucciones de venta.
 */
import OpenAI from 'openai'
import { createServiceRoleClient } from '@/lib/supabase/server'

/** Modelos GPT válidos que soporta el sistema */
const VALID_GPT_MODELS = new Set([
  'gpt-5.1', 'gpt-4.1', 'gpt-4.1-mini', 'gpt-4.1-nano', 'gpt-4o', 'gpt-4o-mini',
])
const DEFAULT_MODEL = 'gpt-5.1'

export interface AIResponse {
  message1: string
  message2: string | null
  message3: string | null
  photos_message1: string[] | null
  report: string | null
  context_memory: string | null
  /** Datos estructurados del pedido cuando hay una venta confirmada */
  order_data: {
    product_id: string
    product_name: string
    quantity: number
    total_amount: number
    currency: string
    shipping_address: string | null
    customer_name: string | null
    customer_phone: string | null
  } | null
  /** Tiempos opcionales controlados desde el prompt (en segundos). Si null, usa defaults del sistema. */
  timing: {
    delay_read: number | null       // segundos antes de marcar como leido
    delay_typing: number | null     // segundos antes de empezar a escribir
    typing_duration: number | null  // segundos simulando escritura
    delay_between: number | null    // segundos entre mensajes
    show_online: boolean | null     // mostrar como en linea
  } | null
}

interface ConversationMessage {
  sender: string
  content: string
}

interface ProductImage {
  url: string
  image_type: string
  is_primary: boolean
  sort_order: number
}

interface ProductTestimonial {
  type: string
  url: string
  content: string
  description: string
}

/**
 * Genera una respuesta de IA para un bot dado un mensaje (o mensajes agrupados).
 * Carga TODA la configuracion del bot y productos desde la base de datos.
 */
export async function generateBotResponse(
  botId: string,
  contactPhone: string,
  message: string,
  conversationId: string,
  contactName: string = ''
): Promise<AIResponse | null> {
  try {
    const supabase = await createServiceRoleClient()

    // 1. CARGAR BOT + PROMPTS
    console.log(`[AI Engine] Cargando bot ${botId}...`)
    const { data: bot, error: botError } = await supabase
      .from('bots')
      .select('*, bot_prompts(*)')
      .eq('id', botId)
      .single()

    if (botError || !bot) {
      console.error(`[AI Engine] Bot ${botId} no encontrado:`, botError)
      return null
    }

    if (!bot.is_active) {
      console.log(`[AI Engine] Bot ${botId} inactivo`)
      return null
    }

    console.log(`[AI Engine] Bot: "${bot.name}", modelo: ${bot.gpt_model || 'gpt-4o'}`)

    // 2. API KEY
    const apiKey = bot.openai_api_key || process.env.OPENAI_API_KEY
    if (!apiKey) {
      console.error(`[AI Engine] Sin API Key`)
      return null
    }

    // 3. PRODUCTOS
    const { data: products } = await supabase
      .from('products')
      .select('*, product_images(*), product_testimonials(*)')
      .eq('bot_id', botId)
      .eq('is_active', true)

    console.log(`[AI Engine] Productos: ${products?.length || 0}`)

    // 4. BOT PROMPTS
    const botPrompt = bot.bot_prompts
    if (!botPrompt) {
      console.error(`[AI Engine] Bot ${botId} sin bot_prompts`)
      return null
    }

    // 5. MEMORIA DE CONTEXTO
    const { data: conversation } = await supabase
      .from('conversations')
      .select('product_interest')
      .eq('id', conversationId)
      .single()

    const savedMemory = conversation?.product_interest || null
    console.log(`[AI Engine] Memoria: ${savedMemory ? savedMemory.length + ' chars' : 'vacia'}`)

    // 6. PRODUCTOS CONTEXTO
    const productsContext = buildProductsContext(products || [])

    // 7. HISTORIAL
    const { data: history } = await supabase
      .from('messages')
      .select('sender, content')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(40)

    const botMessages = (history || []).filter((m: ConversationMessage) => m.sender === 'bot')
    const isFirstInteraction = botMessages.length === 0
    const sentUrls = botMessages
      .map((m: ConversationMessage) => m.content)
      .join(' ')
      .match(/https?:\/\/[^\s,)"]+/g) || []

    console.log(`[AI Engine] Historial: ${history?.length || 0} msgs, primera_interaccion=${isFirstInteraction}, urls_enviadas=${sentUrls.length}`)

    // 8. CONSTRUIR SYSTEM PROMPT
    const systemPrompt = buildSystemPrompt(
      botPrompt, productsContext, contactPhone, bot.report_phone,
      isFirstInteraction, sentUrls, savedMemory, contactName
    )

    // 9. MENSAJES PARA OPENAI
    const messages: OpenAI.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
    ]

    if (history && history.length > 0) {
      for (const msg of history as ConversationMessage[]) {
        messages.push({
          role: msg.sender === 'bot' ? 'assistant' : 'user',
          content: msg.content,
        })
      }
    }

    messages.push({ role: 'user', content: message })

    // 10. LLAMAR A OPENAI
    const openai = new OpenAI({ apiKey })
    const rawModel = bot.gpt_model || DEFAULT_MODEL
    const selectedModel = VALID_GPT_MODELS.has(rawModel) ? rawModel : DEFAULT_MODEL
    if (rawModel !== selectedModel) {
      console.warn(`[AI Engine] ⚠️ Modelo inválido "${rawModel}" en DB, usando fallback "${selectedModel}"`)
    }
    const useJsonMode = botPrompt.strict_json_output === true

    console.log(`[AI Engine] OpenAI: modelo=${selectedModel}, json_mode=${useJsonMode}, msgs=${messages.length}`)

    const completionParams: OpenAI.ChatCompletionCreateParamsNonStreaming = {
      model: selectedModel,
      messages,
      temperature: 0.7,
      max_completion_tokens: 800,
    }

    if (useJsonMode) {
      completionParams.response_format = { type: 'json_object' }
    }

    let completion: OpenAI.ChatCompletion | null = null
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        completion = await openai.chat.completions.create(completionParams)
        break
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err)
        const isNetworkError = errMsg.includes('fetch failed') || errMsg.includes('ENOTFOUND') || errMsg.includes('ETIMEDOUT') || errMsg.includes('Connection error')
        if (isNetworkError && attempt < 3) {
          console.log(`[AI Engine] Red error (${attempt}/3): ${errMsg}. Retry 2s...`)
          await new Promise(r => setTimeout(r, 2000))
          continue
        }
        throw err
      }
    }

    const responseContent = completion?.choices[0]?.message?.content
    if (!responseContent) {
      console.error(`[AI Engine] Sin respuesta de OpenAI`)
      return null
    }

    console.log(`[AI Engine] Respuesta: ${responseContent.length} chars`)
    console.log(`[AI Engine] Cruda: ${responseContent.substring(0, 500)}${responseContent.length > 500 ? '...' : ''}`)

    // 11. PARSEAR RESPUESTA (sin truncar — el System Prompt controla todo)
    return parseAIResponse(responseContent)
  } catch (err) {
    console.error(`[AI Engine] Error:`, err)
    return null
  }
}

/**
 * Construye el contexto de productos.
 * Solo datos, sin instrucciones de uso (eso lo define el System Prompt).
 */
function buildProductsContext(products: Record<string, unknown>[]): string {
  if (!products || products.length === 0) return 'No hay productos configurados.'

  return products.map((p) => {
    const imgs = (p.product_images as ProductImage[]) || []
    const testimonials = (p.product_testimonials as ProductTestimonial[]) || []

    const productImgs = imgs.filter(i => i.image_type === 'product')
    const offerImgs = imgs.filter(i => i.image_type === 'offer')

    const textTestimonials = testimonials.filter(t => t.type === 'text')
    const imageTestimonials = testimonials.filter(t => t.type === 'image')
    const videoTestimonials = testimonials.filter(t => t.type === 'video')

    let ctx = `═══ PRODUCTO: ${p.name} (ID: ${p.id}) ═══`
    if (p.first_message) ctx += `\n\n--- PRIMER MENSAJE DEL PRODUCTO (ENVIAR EXACTO EN PRIMERA INTERACCION) ---\n${p.first_message}`
    if (p.category) ctx += `\nCategoria: ${p.category}`
    ctx += `\nDescripcion: ${p.description}`
    ctx += `\nBeneficios: ${p.benefits}`
    if (p.usage_instructions) ctx += `\nModo de uso: ${p.usage_instructions}`
    if (p.warnings) ctx += `\nAdvertencias: ${p.warnings}`
    if (p.hooks && (p.hooks as string[]).length > 0) ctx += `\nKeywords/Hooks: ${(p.hooks as string[]).join(', ')}`

    ctx += `\n\n--- PRECIOS ---`
    ctx += `\nMoneda: ${p.currency || 'BOB'}`
    ctx += `\nPrecio unitario: ${p.currency} ${p.price_unit}`
    if (p.offer_price) ctx += `\nPrecio de oferta: ${p.currency} ${p.offer_price}`
    if (p.price_promo_x2) ctx += `\nPrecio promo x2: ${p.currency} ${p.price_promo_x2}`
    if (p.price_super_x6) ctx += `\nPrecio super x6: ${p.currency} ${p.price_super_x6}`

    ctx += `\n\n--- ENVIO ---`
    ctx += `\nInfo envio: ${p.shipping_info || 'No especificado'}`
    ctx += `\nCobertura: ${p.coverage || 'No especificada'}`
    if (p.sell_zones) ctx += `\nZonas de venta: ${p.sell_zones}`
    if (p.delivery_zones) ctx += `\nZonas de entrega: ${p.delivery_zones}`

    if (productImgs.length > 0) {
      ctx += `\n\n--- FOTOS DEL PRODUCTO ---`
      productImgs.forEach((img, i) => { ctx += `\n  [Foto ${i + 1}]: ${img.url}` })
    }

    if (offerImgs.length > 0) {
      ctx += `\n\n--- IMAGENES DE OFERTA ---`
      offerImgs.forEach((img, i) => { ctx += `\n  [Oferta ${i + 1}]: ${img.url}` })
    }

    if (imageTestimonials.length > 0) {
      ctx += `\n\n--- FOTOS DE TESTIMONIOS ---`
      imageTestimonials.forEach((t, i) => {
        ctx += `\n  [Testimonio foto ${i + 1}]: ${t.url}`
        if (t.description) ctx += ` - ${t.description}`
      })
    }

    if (textTestimonials.length > 0) {
      ctx += `\n\n--- TESTIMONIOS DE TEXTO ---`
      textTestimonials.forEach((t, i) => {
        ctx += `\n  [Testimonio ${i + 1}]: "${t.content}"`
        if (t.description) ctx += ` - ${t.description}`
      })
    }

    if (videoTestimonials.length > 0) {
      ctx += `\n\n--- VIDEOS ---`
      videoTestimonials.forEach((t, i) => {
        ctx += `\n  [Video ${i + 1}]: ${t.url}`
        if (t.description) ctx += ` - ${t.description}`
      })
    }

    console.log(`[AI Engine] Producto "${p.name}": ${p.currency} ${p.price_unit}, imgs=${imgs.length}, testimonios=${testimonials.length}`)

    return ctx
  }).join('\n\n')
}

/**
 * Construye el system prompt.
 *
 * REGLA: El System Prompt del usuario es la UNICA fuente de verdad.
 * El dynamicContext solo agrega DATOS FACTUALES que el prompt no puede saber:
 * - Datos de sesion (telefono, nombre, genero)
 * - Estado (primera interaccion, URLs enviadas)
 * - Memoria persistente
 * - Catalogo de productos
 * - Campo "contexto" para memoria (unica adicion al formato JSON del usuario)
 *
 * NO agrega: limites de caracteres, reglas de mensajes, instrucciones de venta,
 * ni nada que el System Prompt ya defina.
 */
function buildSystemPrompt(
  botPrompt: Record<string, unknown>,
  productsContext: string,
  contactPhone: string,
  reportPhone: string | null,
  isFirstInteraction: boolean,
  sentUrls: string[],
  savedMemory: string | null,
  contactName: string = ''
): string {
  const systemPromptBase = (botPrompt.system_prompt as string) || 'Eres un asistente de ventas profesional.'

  // Detectar genero del contacto por nombre (dato factual, no regla)
  const nameForDetection = contactName.trim().split(/\s+/)[0]?.toLowerCase() || ''
  const femaleNames = ['maria', 'ana', 'carmen', 'rosa', 'patricia', 'luz', 'elena', 'claudia', 'martha', 'marta', 'laura', 'andrea', 'gabriela', 'daniela', 'alejandra', 'fernanda', 'valentina', 'isabella', 'sofia', 'camila', 'natalia', 'paola', 'carolina', 'diana', 'cecilia', 'silvia', 'susana', 'monica', 'veronica', 'jessica', 'lorena', 'rocio', 'adriana', 'lucia', 'julia', 'gloria', 'sandra', 'norma', 'teresa', 'cristina', 'margarita', 'elizabeth', 'beatriz', 'alicia', 'irma', 'leticia', 'juana', 'yolanda', 'angela', 'karen', 'karina', 'mariana', 'viviana', 'wendy', 'pamela', 'lidia', 'dora', 'miriam', 'ruth', 'esther', 'ester', 'nelly', 'neli', 'jenny', 'gaby', 'paty', 'lupe', 'magaly', 'magali', 'maribel', 'flor', 'pilar', 'sonia', 'mirtha']
  const maleNames = ['jose', 'juan', 'carlos', 'luis', 'pedro', 'miguel', 'jorge', 'roberto', 'fernando', 'ricardo', 'daniel', 'francisco', 'mario', 'david', 'oscar', 'marco', 'marcos', 'hugo', 'pablo', 'raul', 'rafael', 'diego', 'sergio', 'arturo', 'gustavo', 'alejandro', 'andres', 'antonio', 'gabriel', 'hector', 'ivan', 'jaime', 'javier', 'leonardo', 'manuel', 'martin', 'nelson', 'ramon', 'santiago', 'victor', 'willy', 'freddy', 'percy', 'rolando', 'edwin', 'erwin', 'gonzalo', 'alvaro', 'boris', 'christian', 'cristian', 'edu', 'enrique', 'fabian', 'felipe', 'gerardo', 'ismael', 'jhon', 'john', 'julio']

  let detectedGender: 'female' | 'male' | 'unknown' = 'unknown'
  if (nameForDetection) {
    if (femaleNames.includes(nameForDetection)) detectedGender = 'female'
    else if (maleNames.includes(nameForDetection)) detectedGender = 'male'
    else if (nameForDetection.endsWith('a') && !nameForDetection.endsWith('ba') && !nameForDetection.endsWith('ca')) detectedGender = 'female'
    else if (nameForDetection.endsWith('o') || nameForDetection.endsWith('os')) detectedGender = 'male'
  }

  const genderLabel = detectedGender === 'female' ? 'mujer' : detectedGender === 'male' ? 'hombre' : 'no identificado'
  console.log(`[AI Engine] Contacto: "${contactName}", genero: ${genderLabel}`)

  // ═══════════════════════════════════════
  // DATOS FACTUALES SOLAMENTE — sin reglas
  // ═══════════════════════════════════════
  let dynamicContext = `

═══ DATOS DE ESTA SESION ═══
Telefono del cliente: ${contactPhone}
Nombre del cliente: ${contactName || 'No disponible'}
Genero detectado: ${genderLabel}`

  if (reportPhone) {
    dynamicContext += `
Numero para reportes de venta: ${reportPhone}`
  }

  dynamicContext += `
Primera interaccion: ${isFirstInteraction ? 'SI' : 'NO'}`

  if (sentUrls.length > 0) {
    dynamicContext += `
URLs ya enviadas (no repetir):
${sentUrls.map(u => `- ${u}`).join('\n')}`
  }

  if (savedMemory) {
    dynamicContext += `

═══ MEMORIA DEL CLIENTE ═══
${savedMemory}`
  }

  dynamicContext += `

═══ CATALOGO DE PRODUCTOS ═══
${productsContext}`

  // Campo "contexto" para memoria persistente entre turnos
  dynamicContext += `

═══ MEMORIA ENTRE TURNOS ═══
Agrega en tu respuesta JSON un campo llamado "contexto" con un resumen breve del estado actual de la conversacion (nombre del cliente, producto, etapa, que se dijo, que falta). No se envia al cliente — es memoria interna del sistema.`

  // Informar sobre timing opcional
  dynamicContext += `

═══ TIMING (OPCIONAL) ═══
Si tu prompt define tiempos de respuesta, agrega un campo "timing" en tu JSON con estos subcampos (en segundos):
- delay_read: segundos antes de marcar como leido (default: 10)
- delay_typing: segundos antes de empezar a escribir (default: 5-10)
- typing_duration: segundos simulando escritura (default: 5-8)
- delay_between: segundos entre mensajes multiples (default: 3-5)
- show_online: true/false para mostrar como en linea (default: true)
Si no incluyes "timing", se usan los defaults del sistema.`

  // Informar sobre registro de venta automatico
  dynamicContext += `

═══ REGISTRO DE VENTA (OBLIGATORIO CON REPORTE) ═══
Cuando generes un "reporte" de venta confirmada, SIEMPRE incluye tambien un campo "pedido" en tu JSON con estos datos:
- product_id: el ID del producto vendido (esta en el catalogo arriba)
- producto: nombre del producto
- cantidad: numero de unidades (default: 1)
- monto_total: precio total en numero (sin simbolo de moneda)
- moneda: codigo de moneda (ej: "BOB", "USD")
- direccion: direccion de envio del cliente (o null si no se tiene)
- nombre_cliente: nombre del cliente
- telefono_cliente: numero de telefono del cliente (si lo menciono en la conversacion, ej: "78515950")
Esto registra la venta automaticamente en el sistema. Sin este campo, la venta NO queda registrada.`

  // Refuerzo final de limites de caracteres (el modelo tiende a ignorarlos)
  dynamicContext += `

═══ RECORDATORIO CRITICO ═══
RESPETA ESTRICTAMENTE los limites de caracteres definidos en tu prompt.
Los mensajes de WhatsApp deben ser CORTOS. Si tu prompt dice maximo 78 caracteres, NO generes mas de 78.
Escribe frases cortas y directas como en un chat real. NUNCA parrafos largos.
Si necesitas dar mucha info, dividela en mensaje1, mensaje2 y mensaje3 (todos cortos).

═══ REGLA ANTI-REPETICION (MUY IMPORTANTE) ═══
Lee el historial COMPLETO antes de responder. NUNCA repitas una pregunta que ya fue respondida.
Si el cliente ya confirmo un dato (nombre, telefono, direccion, cantidad), NO lo vuelvas a preguntar.
Si ya tienes TODOS los datos necesarios (producto, cantidad, direccion, nombre, telefono), pasa DIRECTAMENTE a la CONFIRMACION y genera el REPORTE.
Repetir la misma pregunta es un error grave — el cliente se frustra y pierde confianza.`

  return systemPromptBase + dynamicContext
}

/**
 * Busca un valor en el JSON parseado probando multiples keys posibles.
 * Retorna el primer valor que encuentre (truthy) o el fallback.
 */
function findKey(obj: Record<string, unknown>, keys: string[], fallback: unknown = ''): unknown {
  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null && obj[key] !== '') return obj[key]
  }
  return fallback
}

/**
 * Normaliza cualquier valor a un array de URLs (strings que empiezan con http).
 */
function normalizePhotos(value: unknown): string[] | null {
  if (!value) return null
  if (typeof value === 'string' && value.trim().startsWith('http')) return [value.trim()]
  if (Array.isArray(value)) {
    const urls = value.filter((v): v is string => typeof v === 'string' && v.trim().startsWith('http'))
    return urls.length > 0 ? urls : null
  }
  return null
}

/**
 * Extrae valores de timing de la respuesta JSON de la IA.
 * Busca campos con multiples nombres posibles (español/inglés).
 * Los valores se esperan en SEGUNDOS. Retorna null si no hay timing.
 */
function extractTiming(parsed: Record<string, unknown>): AIResponse['timing'] {
  // Buscar un objeto "timing" anidado primero
  const timingObj = findKey(parsed, [
    'timing', 'tiempos', 'delays', 'configuracion_tiempo', 'time_config',
  ], null) as Record<string, unknown> | null

  // Fuente: el objeto timing anidado, o el JSON raiz
  const src = (timingObj && typeof timingObj === 'object') ? timingObj : parsed

  const delayRead = findKey(src, [
    'delay_read', 'delay_lectura', 'tiempo_lectura', 'read_delay',
    'espera_lectura', 'antes_de_leer', 'demora_lectura',
  ], null)

  const delayTyping = findKey(src, [
    'delay_typing', 'delay_escritura', 'tiempo_antes_escribir', 'typing_delay',
    'espera_escritura', 'antes_de_escribir', 'demora_escritura',
  ], null)

  const typingDuration = findKey(src, [
    'typing_duration', 'duracion_escritura', 'tiempo_escribiendo', 'writing_duration',
    'duracion_typing', 'escribiendo', 'writing_time',
  ], null)

  const delayBetween = findKey(src, [
    'delay_between', 'delay_entre_mensajes', 'tiempo_entre_mensajes', 'between_delay',
    'espera_entre_mensajes', 'pausa_entre_mensajes', 'demora_entre',
  ], null)

  const showOnline = findKey(src, [
    'show_online', 'mostrar_en_linea', 'en_linea', 'online', 'available',
    'mostrar_online', 'visible',
  ], null)

  // Si no hay ningun campo de timing, retornar null
  if (delayRead === null && delayTyping === null && typingDuration === null && delayBetween === null && showOnline === null) {
    return null
  }

  const toSeconds = (v: unknown): number | null => {
    if (v === null || v === undefined || v === '') return null
    const n = Number(v)
    return isNaN(n) ? null : n
  }

  const toBool = (v: unknown): boolean | null => {
    if (v === null || v === undefined || v === '') return null
    if (typeof v === 'boolean') return v
    if (typeof v === 'string') return v.toLowerCase() === 'true' || v === 'si' || v === 'sí' || v === '1'
    if (typeof v === 'number') return v !== 0
    return null
  }

  return {
    delay_read: toSeconds(delayRead),
    delay_typing: toSeconds(delayTyping),
    typing_duration: toSeconds(typingDuration),
    delay_between: toSeconds(delayBetween),
    show_online: toBool(showOnline),
  }
}

/**
 * Extrae datos estructurados del pedido cuando hay una venta confirmada.
 * Busca un objeto "pedido"/"order" en el JSON de respuesta.
 */
function extractOrderData(parsed: Record<string, unknown>): AIResponse['order_data'] {
  const orderObj = findKey(parsed, [
    'pedido', 'order', 'orden', 'venta', 'sale', 'order_data', 'datos_pedido',
  ], null) as Record<string, unknown> | null

  if (!orderObj || typeof orderObj !== 'object') return null

  const productId = findKey(orderObj, [
    'product_id', 'producto_id', 'id_producto',
  ], null)

  const productName = findKey(orderObj, [
    'producto', 'product', 'product_name', 'nombre_producto',
  ], null)

  const quantity = findKey(orderObj, [
    'cantidad', 'quantity', 'qty', 'unidades',
  ], 1)

  const totalAmount = findKey(orderObj, [
    'monto_total', 'total_amount', 'total', 'precio', 'price', 'monto',
  ], null)

  const currency = findKey(orderObj, [
    'moneda', 'currency', 'divisa',
  ], 'BOB')

  const address = findKey(orderObj, [
    'direccion', 'address', 'shipping_address', 'direccion_envio',
  ], null)

  const customerName = findKey(orderObj, [
    'nombre_cliente', 'customer_name', 'cliente', 'nombre',
  ], null)

  const customerPhone = findKey(orderObj, [
    'telefono_cliente', 'customer_phone', 'telefono', 'phone', 'celular',
  ], null)

  // Necesitamos al menos product_id y monto para registrar la venta
  if (!productId || (totalAmount == null)) {
    console.log(`[AI Engine] Pedido incompleto: product_id=${productId}, total=${totalAmount}`)
    return null
  }

  const result = {
    product_id: String(productId),
    product_name: productName ? String(productName) : '',
    quantity: Number(quantity) || 1,
    total_amount: Number(totalAmount) || 0,
    currency: String(currency) || 'BOB',
    shipping_address: address ? String(address) : null,
    customer_name: customerName ? String(customerName) : null,
    customer_phone: customerPhone ? String(customerPhone) : null,
  }

  console.log(`[AI Engine] 🛒 Pedido detectado: ${result.product_name} x${result.quantity} = ${result.currency} ${result.total_amount}`)
  return result
}

/**
 * Parsea la respuesta de OpenAI.
 *
 * Parser FLEXIBLE: busca campos por multiples nombres posibles.
 * NO trunca ni modifica los mensajes. El System Prompt controla todo.
 * Si el prompt cambia los nombres de los campos, el parser se adapta.
 */
function parseAIResponse(responseContent: string): AIResponse {
  try {
    let jsonStr = responseContent.trim()

    // Extraer JSON de markdown code blocks si viene envuelto
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim()
    }

    const parsed = JSON.parse(jsonStr)

    // Buscar mensajes con nombres flexibles (español, ingles, variantes)
    const msg1 = String(findKey(parsed, [
      'mensaje1', 'message1', 'msg1', 'respuesta1', 'texto1', 'mensaje_1', 'message_1',
      'mensaje', 'message', 'respuesta', 'texto', 'reply',
    ], ''))

    const msg2 = String(findKey(parsed, [
      'mensaje2', 'message2', 'msg2', 'respuesta2', 'texto2', 'mensaje_2', 'message_2',
    ], ''))

    const msg3 = String(findKey(parsed, [
      'mensaje3', 'message3', 'msg3', 'respuesta3', 'texto3', 'mensaje_3', 'message_3',
    ], ''))

    // Buscar fotos con nombres flexibles
    const photosRaw = findKey(parsed, [
      'fotos_mensaje1', 'photos_message1', 'fotos', 'photos', 'imagenes', 'images',
      'fotos_mensaje', 'foto', 'photo', 'media', 'adjuntos', 'attachments',
    ], null)

    // Buscar reporte
    const report = String(findKey(parsed, [
      'reporte', 'report', 'informe', 'notificacion', 'alerta',
    ], ''))

    // Buscar contexto/memoria
    const contextMemory = findKey(parsed, [
      'contexto', 'context', 'context_memory', 'memoria', 'memory', 'resumen', 'summary',
    ], null)

    // Extraer timing si el prompt lo define
    const timing = extractTiming(parsed)

    // Extraer datos de pedido si hay reporte de venta
    const orderData = extractOrderData(parsed)

    // Si no hay ningun mensaje, usar respuesta cruda como texto
    if (!msg1 && !msg2 && !msg3) {
      console.log(`[AI Engine] JSON sin mensajes reconocidos, usando respuesta como texto`)
      return {
        message1: responseContent,
        message2: null,
        message3: null,
        photos_message1: null,
        report: null,
        context_memory: contextMemory ? String(contextMemory) : null,
        order_data: orderData,
        timing,
      }
    }

    const result: AIResponse = {
      message1: msg1 || msg2 || msg3,
      message2: (msg1 ? msg2 : msg3) || null,
      message3: (msg1 && msg2 ? msg3 : null) || null,
      photos_message1: normalizePhotos(photosRaw),
      report: report || null,
      context_memory: contextMemory ? String(contextMemory) : null,
      order_data: orderData,
      timing,
    }

    // Diagnostico
    console.log(`[AI Engine] RESPUESTA:`)
    console.log(`[AI Engine]   msg1 (${result.message1.length}ch): "${result.message1.substring(0, 120)}${result.message1.length > 120 ? '...' : ''}"`)
    if (result.message2) console.log(`[AI Engine]   msg2 (${result.message2.length}ch): "${result.message2.substring(0, 120)}"`)
    if (result.message3) console.log(`[AI Engine]   msg3 (${result.message3.length}ch): "${result.message3.substring(0, 120)}"`)
    if (result.photos_message1) console.log(`[AI Engine]   fotos: ${result.photos_message1.length} → ${result.photos_message1.map(u => u.substring(0, 60)).join(', ')}`)
    if (result.report) console.log(`[AI Engine]   reporte: ${result.report.substring(0, 100)}`)
    if (result.order_data) console.log(`[AI Engine]   pedido: ${result.order_data.product_name} x${result.order_data.quantity} = ${result.order_data.currency} ${result.order_data.total_amount}`)
    if (result.context_memory) console.log(`[AI Engine]   memoria: ${result.context_memory.substring(0, 200)}`)
    if (result.timing) console.log(`[AI Engine]   timing: read=${result.timing.delay_read}s, typing=${result.timing.delay_typing}s, dur=${result.timing.typing_duration}s, between=${result.timing.delay_between}s, online=${result.timing.show_online}`)

    return result
  } catch {
    console.log(`[AI Engine] Respuesta no es JSON, enviando como texto plano`)
    return {
      message1: responseContent,
      message2: null,
      message3: null,
      photos_message1: null,
      report: null,
      context_memory: null,
      order_data: null,
      timing: null,
    }
  }
}

/**
 * Transcribe audio usando OpenAI Whisper.
 */
export async function transcribeAudio(
  audioBuffer: Buffer,
  mimeType: string = 'audio/ogg'
): Promise<string | null> {
  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })

    const extMap: Record<string, string> = {
      'audio/ogg': 'ogg',
      'audio/mpeg': 'mp3',
      'audio/mp4': 'mp4',
      'audio/wav': 'wav',
      'audio/webm': 'webm',
      'audio/ogg; codecs=opus': 'ogg',
    }
    const ext = extMap[mimeType] || 'ogg'

    const file = new File([audioBuffer as unknown as BlobPart], `audio.${ext}`, { type: mimeType })

    const transcription = await openai.audio.transcriptions.create({
      model: 'whisper-1',
      file,
      language: 'es',
    })

    console.log(`[AI Engine] Audio transcrito: "${transcription.text}"`)
    return transcription.text || null
  } catch (err) {
    console.error(`[AI Engine] Error transcribiendo audio:`, err)
    return null
  }
}
