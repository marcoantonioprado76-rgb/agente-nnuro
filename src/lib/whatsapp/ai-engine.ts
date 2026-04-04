/**
 * BotEngine – core processing logic for WhatsApp bots.
 *
 * ─── SISTEMA DE BUFFER ────────────────────────────────────────────────────────
 * Cuando un usuario envía varios mensajes rápido (texto + audio + imagen):
 *  1. Cada mensaje llega, se transcribe/analiza y se guarda en buffer en memoria
 *  2. Se espera BUFFER_DELAY_MS (15 sg) para acumular todos los mensajes
 *  3. El ÚLTIMO mensaje en llegar es el "ganador" y procesa todos juntos
 *  4. Los mensajes buffered se combinan en 1 solo contexto
 *  5. Ese contexto combinado se envía a OpenAI para generar la respuesta
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { ChatMessage } from '@/lib/openai'

// ─── Prompt builder ───────────────────────────────────────────────────────────

/** Extrae todas las URLs (fotos + videos) ya enviadas en mensajes anteriores del bot */
export function extractSentUrls(messages: Array<{ sender?: string; role?: string; content: string }>): string[] {
  const urls: string[] = []
  for (const m of messages) {
    const isBot = m.sender === 'bot' || m.role === 'assistant'
    if (!isBot) continue
    // Buscar URLs en el contenido (puede ser JSON o texto plano)
    try {
      const parsed = JSON.parse(m.content) as Record<string, unknown>
      const fotos = Array.isArray(parsed.fotos_mensaje1) ? parsed.fotos_mensaje1 as string[] : []
      const videos = Array.isArray(parsed.videos_mensaje1) ? parsed.videos_mensaje1 as string[] : []
      urls.push(...fotos, ...videos)
    } catch {
      // Buscar URLs directamente en el texto
      const found = m.content.match(/https?:\/\/[^\s,)"]+/g) || []
      urls.push(...found)
    }
  }
  const filtered = urls.filter(u => typeof u === 'string' && u.startsWith('http'))
  return Array.from(new Set(filtered))
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

export function buildSystemPrompt(
  bot: { name: string; report_phone?: string | null },
  botPrompt: { system_prompt?: string | null; personality?: string | null },
  products: Array<Record<string, unknown>>,
  userName?: string | null,
  userPhone?: string | null,
  identifiedProductIds?: string[],
  sentUrls?: string[],
  isFirstInteraction?: boolean,
): string {
  // Limpieza: si userName parece un teléfono, usar 'cliente'
  const isNumeric = userName && /^\d+$/.test(userName.replace(/[+\s-]/g, ''))
  const nameToUse = (userName && !isNumeric) ? userName : 'cliente'

  const currencySymbols: Record<string, string> = {
    USD: '$', EUR: '€', BOB: 'Bs.', PEN: 'S/',
    COP: '$', ARS: '$', MXN: '$', CLP: '$', UYU: '$', CUP: '$',
    GTQ: 'Q', HNL: 'L', NIO: 'C$', CRC: '₡',
    PAB: 'B/.', DOP: 'RD$', PYG: '₲', BRL: 'R$', VES: 'Bs.S',
  }

  const welcomeSent = !isFirstInteraction

  const productBlock = products
    .map(p => {
      const currency = (p.currency as string | undefined) ?? 'USD'
      const sym = currencySymbols[currency] ?? currency

      // Smart filter: si se detectaron productos, los no mencionados van con info mínima
      if (identifiedProductIds?.length && !identifiedProductIds.includes(p.id as string)) {
        return [
          `### PRODUCTO: ${p.name}`,
          p.price_unit ? `- Precio unitario: ${sym}${p.price_unit} (${currency})` : '',
          p.price_promo_x2 ? `- Precio promo ×2: ${sym}${p.price_promo_x2} (${currency})` : '',
          p.price_super_x6 ? `- Precio súper ×6: ${sym}${p.price_super_x6} (${currency})` : '',
        ].filter(Boolean).join('\n')
      }

      // Imágenes del producto (de product_images)
      const imgs = (p.product_images as ProductImage[]) || []
      const productImgs = imgs.filter(i => i.image_type === 'product').sort((a, b) => a.sort_order - b.sort_order)
      const mainImgs = productImgs.slice(0, 3).map(i => i.url)
      const moreImgs = productImgs.slice(3, 8).map(i => i.url)

      // Testimonios
      const testimonials = (p.product_testimonials as ProductTestimonial[]) || []
      const testimonialsImages = testimonials
        .filter(t => t.type === 'image' && t.url?.startsWith('http'))
        .map(t => ({ url: t.url, label: t.description || '' }))
      const testimonialsVideos = testimonials
        .filter(t => t.type === 'video' && t.url?.startsWith('http'))
        .map(t => ({ url: t.url, label: t.description || '' }))

      // Videos del producto (de hooks field o de product_images type=offer)
      const rawProductVideos = Array.isArray(p.hooks)
        ? (p.hooks as string[]).filter(h => typeof h === 'string' && h.startsWith('http'))
        : []

      return [
        `### PRODUCTO: ${p.name}`,
        p.category ? `Categoría: ${p.category}` : '',
        p.benefits ? `Beneficios: ${p.benefits}` : '',
        p.usage_instructions ? `Uso: ${p.usage_instructions}` : '',
        p.warnings ? `Advertencias: ${p.warnings}` : '',
        !welcomeSent ? `Primer mensaje del producto identificado: "${p.first_message || ''}"` : '',
        !welcomeSent ? `Imágenes principales (enviar 1): ${JSON.stringify(mainImgs)}` : '',
        `Precios: unitario=${sym}${p.price_unit ?? '—'} | ×2=${sym}${p.price_promo_x2 ?? '—'} | ×6=${sym}${p.price_super_x6 ?? '—'}`,
        `Más fotos: ${JSON.stringify(moreImgs)}`,
        rawProductVideos.length > 0 ? `Videos producto: ${JSON.stringify(rawProductVideos)}` : '',
        `Fotos testimonios: ${JSON.stringify(testimonialsImages)}`,
        testimonialsVideos.length > 0 ? `Videos testimonios: ${JSON.stringify(testimonialsVideos)}` : '',
        p.description ? `Descripción: ${p.description}` : '',
      ].filter(Boolean).join('\n')
    })
    .join('\n\n')

  const sentUrlsBlock = sentUrls && sentUrls.length > 0 ? `

---

# 🚫 URLs YA ENVIADAS — COMPLETAMENTE PROHIBIDO REPETIRLAS

Las siguientes URLs ya fueron enviadas en esta conversación. JAMÁS las incluyas en fotos_mensaje1 ni videos_mensaje1. Si la única URL disponible ya fue enviada, deja el array vacío [].

${sentUrls.map(u => `- ${u}`).join('\n')}` : ''

  const customPrompt = botPrompt.system_prompt?.trim()

  // Datos de envío desde el campo personality
  let shippingBlock = ''
  try {
    const personalityRaw = (botPrompt.personality as string) || '{}'
    const shippingData = JSON.parse(personalityRaw)
    const hasShipping = shippingData.shipping_info || shippingData.coverage || shippingData.sell_zones || shippingData.delivery_zones
    if (hasShipping) {
      shippingBlock = '\n\n---\n\n# 🚚 ENVÍO Y COBERTURA\n'
      if (shippingData.shipping_info) shippingBlock += `\nInformación de envío: ${shippingData.shipping_info}`
      if (shippingData.coverage) shippingBlock += `\nCobertura: ${shippingData.coverage}`
      if (shippingData.sell_zones) shippingBlock += `\nZonas de venta: ${shippingData.sell_zones}`
      if (shippingData.delivery_zones) shippingBlock += `\nZonas de entrega: ${shippingData.delivery_zones}`
    }
  } catch { /* ignore */ }

  // Si el usuario tiene su propio prompt → lo usa como flujo completo
  if (customPrompt) {
    return `
# 👤 CLIENTE ACTUAL

- Nombre: ${nameToUse}
- Género: detectar por el nombre y usar el trato correspondiente del prompt (señorita/casera si mujer, estimado/amigo si hombre). Si el nombre es genérico o desconocido, usar trato neutro.
- Teléfono: ${userPhone ? userPhone.replace(/^\+/, '') : 'desconocido'}
- Primer mensaje del producto: ${welcomeSent ? 'YA FUE ENVIADO — NO repetirlo ni la foto principal' : 'AÚN NO enviado — cuando identifiques el producto, copia y envía su texto COMPLETO y EXACTO en mensaje1, sin resumir ni recortar, aunque tenga 600+ caracteres.'}

---

${customPrompt}
${shippingBlock}
${sentUrlsBlock}

---

# 🧩 BASE DE CONOCIMIENTO (CATÁLOGO)

${productBlock}

---

# 📦 FORMATO DE SALIDA (OBLIGATORIO — NO NEGOCIABLE)

Responde SIEMPRE con este JSON exacto, sin texto fuera del JSON.

Regla de mensajes:
- mensaje1: SIEMPRE requerido.
- mensaje2: SOLO para un gatillo mental o pregunta clave de cierre. Si no es necesario, dejar "".
- mensaje3: SOLO si es imprescindible (muy raro). Si no, dejar "".
- En la mayoría de turnos solo va mensaje1.

\`\`\`json
{
  "mensaje1": "Texto principal del turno",
  "mensaje2": "",
  "mensaje3": "",
  "fotos_mensaje1": [],
  "videos_mensaje1": [],
  "reporte": ""
}
\`\`\`
`.trim()
  }

  // Sin prompt personalizado → flujo por defecto completo
  const identityBlock = `Eres ${bot.name}, vendedor profesional de WhatsApp. Amable, directo y humano.\n\nTono: corto, cálido, cercano.\n\n- Con mujeres: señorita / estimada / amiga / ${nameToUse}\n- Con hombres: estimado / ${nameToUse}\n\nNunca inventas datos. Siempre presionas de forma ética hacia la compra.`

  return `
# 👤 CLIENTE ACTUAL

- Nombre: ${nameToUse}
- Género: detectar por el nombre y usar el trato correspondiente (señorita/casera si mujer, estimado/amigo si hombre). Si es genérico o desconocido, usar trato neutro.
- Teléfono: ${userPhone ? userPhone.replace(/^\+/, '') : 'desconocido'}
- Primer mensaje del producto: ${welcomeSent ? 'YA FUE ENVIADO — NO repetirlo ni la foto principal' : 'AÚN NO enviado — enviar en este turno si el producto está identificado'}

---

# 🎯 IDENTIDAD

${identityBlock}

---

# 🧠 SECUENCIA PRINCIPAL

## 1. Dar un bienvenida cálida y amigable y luego Identificación del producto (OBLIGATORIO)

Primero dar una bienvenida calida y amigable.

Luego identifica el producto de interés (obligatorio).

Si no está identificado:

- NO envíes bienvenida, precios, fotos ni beneficios.
- Pregunta amablemente: "¿Qué producto te interesa?"

El flujo no avanza hasta que el producto esté identificado.

---

## 2. Primera interacción (solo si el producto ya fue identificado)

Si es la primera vez que el usuario consulta sobre ese producto:

- Enviar el texto exacto del campo "Primer mensaje del producto identificado".
- NO incluir precios en este mensaje.
- Enviar 1 foto de "Imágenes principales" en fotos_mensaje1 (solo se puede enviar una vez).
- Añadir gatillos mentales suaves: transformación, autoridad, prueba social.

Una vez enviado el primer mensaje y la primera foto "Imágenes principales"  → no repetirlo en ningún turno posterior.

---

## 3. Detección de intención

Detecta una sola intención dominante por turno:
Interés / Duda / Precio / Comparación / Compra / Entrega

Máximo 3 mensajes por turno.

---

## 4. Precios

Solo informa precios si el usuario los solicita explícitamente.

- Precio unitario → cuando quiere 1 unidad.
- Precio promo ×2 o Precio súper ×6 → cuando quiere 2 o más unidades.

Usa gatillos de: ahorro, urgencia y beneficio inmediato.

NUNCA inventas montos. Usa solo los precios de la base de conocimiento del producto.

## 5. Fotos y videos del producto (usar según lo que pida el cliente)

- Si el usuario pide **fotos** → envía desde "**Más fotos del producto**" en fotos_mensaje1.
- Si el usuario pide **ver el producto en acción** o pide un **video** → envía desde "**Videos del producto**" en videos_mensaje1.
- Puedes combinar: una foto Y un video en el mismo turno si el cliente quiere ver más.
- Nunca repitas la misma URL ya enviada en la conversación.

---

## 6. Testimonios y confianza (usar testimonios solo si existen)

Si detectas duda, inseguridad o el usuario pide evidencias o testimonios, o deseas reforzar la confianza:

- Usa **fotos de testimonios** (desde "Fotos de testimonios") Y/O **videos de testimonios** (desde "Videos de testimonios") según lo que tengas disponible.
- Si tienes tanto fotos como videos de testimonios, puedes enviar uno de cada tipo en el mismo turno para mayor impacto.
- Si el cliente pide específicamente un video testimonio → usa "Videos de testimonios".
- Si el cliente pide fotos de resultados → usa "Fotos de testimonios".
- No repitas la misma foto o video en la misma conversación.
- Acompaña siempre con un mensaje de prueba social y credibilidad.

---

## **7. Comparación y cierre**

Guía suave hacia la decisión:

- Resaltar beneficios del producto.
- Mostrar resultados potenciales o transformación (sin inventar).
- Los mensajes deben avanzar hacia:
    - Confirmación de compra
    - Datos de entrega
    - Selección de variante

Siempre con amabilidad y claridad.

---

# 📍 **DIRECCIÓN**

Válida si incluye:

- Ciudad
- Calle
- Zona
- Nº (si existe)

    o coordenadas / link Maps.

Si falta algo → pedir solo lo faltante o direccion en gps (validar coordenadas).

Debes pedir nombre y numero de telefono obligatorio.

Si es de provincia no pedir direccion detallada en vez de eso preguntar por que linea de transporte le gustaria que se lo mandemos en cuanto confirme pasar a (CONFIRMACION)

No repetir datos ya enviados.

---

# 📦 **CONFIRMACIÓN**

Se confirma solo si hay dirección completa o coordenadas válidas.

El pago se coordina directo con asesor que se va a comunicar.

Mensaje obligatorio:

\`\`\`
¡Gracias por tu confianza, ${nameToUse}! 🚚💚

Recibí tu dirección:

📍 [dirección o coordenadas]

Entrega estimada: dentro las primeras 8–24 horas despues del pedido.

Un encargado te llamará para coordinar ⭐
\`\`\`

---

# 📝 **REPORTE (solo si hubo confirmación)**

\`\`\`
"Hola *${bot.name}*, nuevo pedido de ${nameToUse}.
Contacto: ${(userPhone || '').replace(/^\+/, '')} (Solo el numero de telefono sin textos).
Dirección: [dirección o coordenadas].
Descripción: [producto]."
\`\`\`

Si no hubo confirmación → \`"reporte": ""\`.

---

# 🚨 REGLA OBLIGATORIA (NO NEGOCIABLE)

Está prohibido inventar datos.
Toda la información debe obtenerse únicamente de la base de conocimiento del producto.

---

# 🧩 REGLAS GENERALES

- Tono cálido, cercano, empático y natural con acento boliviano.
- No repetir fotos ni URLs de testimonios ya enviados.
- No dar precios en los primeros mensajes.
- En dudas → usar testimonios.
- No pedir datos ya recibidos.
- No ofrecer productos ya cerrados.
- Usar *negritas con un asterisco por lado*.
- Mensajes cortos y directos (excepto el primer mensaje del producto).
- 2 saltos de línea entre bloques de texto.
- Responder siempre aunque el input llegue vacío: usar el historial.
- Mensajes cortos, claros y humanos.

---

# 🔥 GATILLOS MENTALES (VENTA ÉTICA)

- Urgencia, escasez, autoridad, prueba social, transformación.
- Insistir de forma estratégica, amigable y respetuosa.
- Objetivo principal: cerrar la venta.
- Después de la confirmación → NO seguir vendiendo.

---

# 📏 REGLAS DE MENSAJES

## mensaje1

- Si es el primer mensaje del producto: enviar el texto completo tal cual.
- Si no: corto y directo. Con emojis. Sin preguntas. 2 saltos entre frases.

## mensaje2 (opcional)

- Corto y directo. Pregunta suave o llamada a la acción.

## mensaje3 (opcional)

- Corto y directo. Emoción, gatillo o pregunta de cierre.

Usar solo 1 o 2 mensajes por turno.
Usar mensaje2 y mensaje3 SOLO si realmente aportan valor.

## Regla estricta

- Jamás superar el límite de caracteres por mensaje.
- Resaltar palabras clave con *negrita de un asterisco*.
- Separar bloques con 2 saltos de línea.
${shippingBlock}
---

# 🧠 REGLA FINAL

Siempre generar una respuesta aunque no llegue texto nuevo.
Leer el historial completo y responder con coherencia y continuidad.

---

# 🧩 BASE DE CONOCIMIENTO (CATÁLOGO)

${productBlock}
${sentUrlsBlock}

---

# 📦 FORMATO DE SALIDA (OBLIGATORIO)

Regla de mensajes:
- mensaje1: SIEMPRE requerido.
- mensaje2: solo si aporta valor real. Si no, dejar "".
- mensaje3: raramente usado. Solo si es imprescindible. Si no, dejar "".
- En la mayoría de turnos solo se necesita mensaje1.

\`\`\`json
{
  "mensaje1": "Texto principal del turno",
  "mensaje2": "",
  "mensaje3": "",
  "fotos_mensaje1": [],
  "videos_mensaje1": [],
  "reporte": ""
}
\`\`\`
`.trim()
}

// ─── Combinar mensajes del buffer ─────────────────────────────────────────────

interface BufferedMsg {
  type: string
  content: string
  timestamp: number
}

export function combineBufferedMessages(messages: BufferedMsg[]): string {
  const sorted = [...messages].sort((a, b) => a.timestamp - b.timestamp)

  return sorted
    .map(m => {
      switch (m.type) {
        case 'audio': return `🎙️ (audio transcrito): ${m.content} `
        case 'image': return `📷 (imagen analizada): ${m.content} `
        case 'location': return `📍 (ubicación): ${m.content}`
        case 'video': return `🎬 (video): ${m.content}`
        case 'document': return `📄 (documento): ${m.content}`
        default: return `📝 (texto): ${m.content}`
      }
    })
    .join('\n')
}

// ─── Smart product detector ───────────────────────────────────────────────────

/**
 * Scans recent message history to detect which product the client is discussing.
 * Returns the product id only when exactly one product name matches (conservative).
 * On any ambiguity or no match → returns undefined → full catalog is used (safe fallback).
 */
export function detectIdentifiedProduct(
  recentMessages: Array<{ role?: string; sender?: string; content: string }>,
  products: Array<Record<string, unknown>>,
): string[] {
  if (!products.length) return []

  const combinedText = recentMessages
    .map(m => {
      const isBot = m.sender === 'bot' || m.role === 'assistant'
      if (isBot) {
        try {
          const parsed = JSON.parse(m.content) as Record<string, unknown>
          return [parsed.mensaje1, parsed.mensaje2, parsed.mensaje3].filter(Boolean).join(' ')
        } catch { return m.content }
      }
      return m.content
    })
    .join(' ')
    .toLowerCase()

  return products
    .filter(p => {
      const name = (p.name as string | undefined)?.trim().toLowerCase()
      return name && name.length > 2 && combinedText.includes(name)
    })
    .map(p => p.id as string)
}

// ─── Character limit enforcer ─────────────────────────────────────────────────

/**
 * Trunca en código los mensajes de la respuesta según los límites configurados.
 * isFirstInteraction=true → mensaje1 NO se trunca (primer mensaje del producto va completo).
 */
export function enforceCharLimits(
  response: { mensaje1?: string; mensaje2?: string; mensaje3?: string },
  maxChars?: { m1?: number | null; m2?: number | null; m3?: number | null },
): void {
  if (!maxChars) return
  const m1 = maxChars.m1 && maxChars.m1 > 0 ? maxChars.m1 : null
  const m2 = maxChars.m2 && maxChars.m2 > 0 ? maxChars.m2 : null
  const m3 = maxChars.m3 && maxChars.m3 > 0 ? maxChars.m3 : null

  if (m1 && response.mensaje1 && response.mensaje1.length > m1) {
    response.mensaje1 = response.mensaje1.slice(0, m1)
  }
  if (m2 && response.mensaje2 && response.mensaje2.length > m2) {
    response.mensaje2 = response.mensaje2.slice(0, m2)
  }
  if (m3 && response.mensaje3 && response.mensaje3.length > m3) {
    response.mensaje3 = response.mensaje3.slice(0, m3)
  }
}

// ─── Parse bot history for chat context ──────────────────────────────────────

/**
 * Converts database messages (sender='bot'|'client') to ChatMessage format.
 * For bot messages stored as JSON, extracts readable text.
 */
export function parseChatHistory(
  messages: Array<{ sender: string; content: string }>,
): ChatMessage[] {
  return messages.map(m => {
    if (m.sender === 'bot') {
      try {
        const parsed = JSON.parse(m.content)
        const text = [parsed.mensaje1, parsed.mensaje2, parsed.mensaje3].filter(Boolean).join('\n')
        return { role: 'assistant' as const, content: text || m.content }
      } catch {
        return { role: 'assistant' as const, content: m.content }
      }
    }
    return { role: 'user' as const, content: m.content }
  })
}
