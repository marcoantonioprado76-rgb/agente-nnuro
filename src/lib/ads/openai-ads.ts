/**
 * OpenAI integration for the Ads AI System.
 * Uses native fetch (no SDK) with the user's own API key.
 */

export interface BusinessBriefData {
    name: string
    industry: string
    description: string
    valueProposition: string
    painPoints: string[]
    interests: string[]
    brandVoice: string
    brandColors: string[]
    visualStyle: string[]
    primaryObjective: string
    mainCTA: string
    targetLocations: string[]
    keyMessages: string[]
    personalityTraits: string[]
    contentThemes: string[]
    engagementLevel: string
    // ── Núcleo nuevo (orientado a generar anuncios por beneficio) ──
    category?: string            // id de la categoría elegida (ver ad-categories.ts)
    offerType?: string           // producto físico / inmueble / servicio / digital / alimento…
    benefits?: string[]          // beneficios concretos (qué gana el cliente)
    transformation?: string      // el antes (problema) → el después (resultado)
    targetCustomer?: string      // edad, género, contexto → quién aparece en la foto
    targetAgeMin?: number        // edad mínima del cliente ideal (segmentación)
    targetAgeMax?: number        // edad máxima del cliente ideal (segmentación)
    targetGender?: string        // 'all' | 'male' | 'female' (segmentación)
    positioning?: string         // premium / medio / económico
    emotion?: string             // emoción a transmitir
    adConcepts?: string[]        // conceptos visuales del rubro (aérea, antes/después, etc.)
    restrictions?: string        // qué NO mostrar
    categoryData?: Record<string, string> // campos propios del rubro
    targetCountries?: string[]   // países detectados (nombres) → el frontend los mapea a ISO
    targetCities?: string[]      // ciudades/departamentos detectados (nombres) → se resuelven en Meta
}

export interface AdCopyData {
    slotIndex: number
    primaryText: string
    headline: string
    description: string
    hook: string
    hashtags?: string   // space-separated winning hashtags e.g. "#FitnessMotivation #GymLife"
}

const OPENAI_BASE = 'https://api.openai.com/v1'

// Modelo de generación/edición de imágenes. gpt-image-2 (abr 2026): mejor edición
// y alta fidelidad con imagen de referencia → mantiene el producto mucho más fiel.
const IMAGE_MODEL = 'gpt-image-2'

/** Validates a user's OpenAI API key with a lightweight model call */
export async function validateApiKey(apiKey: string): Promise<boolean> {
    try {
        const res = await fetch(`${OPENAI_BASE}/models`, {
            headers: { Authorization: `Bearer ${apiKey}` },
            signal: AbortSignal.timeout(10_000), // si OpenAI se cuelga, no bloquear el guardado
        })
        return res.ok
    } catch {
        return false
    }
}

/** Transcribes audio using OpenAI Whisper-1 */
export async function transcribeAudio(
    audioBuffer: Buffer,
    fileName: string,
    apiKey: string,
    onUsage?: (durationSec: number) => void,
): Promise<string> {
    const formData = new FormData()
    const blob = new Blob([audioBuffer.buffer as ArrayBuffer], { type: 'audio/webm' })
    formData.append('file', blob, fileName)
    formData.append('model', 'whisper-1')
    formData.append('language', 'es')
    // verbose_json incluye 'duration' (segundos) para medir el costo por minuto
    if (onUsage) formData.append('response_format', 'verbose_json')

    const res = await fetch(`${OPENAI_BASE}/audio/transcriptions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}` },
        body: formData
    })

    if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error?.message || `Whisper error ${res.status}`)
    }

    const data = await res.json()
    if (onUsage) {
        try { onUsage(Number(data.duration) || 0) } catch { /* no romper por la medición */ }
    }
    return data.text as string
}

/** Generates a structured BusinessBrief from free text. La IA DETECTA la categoría
 *  del negocio de la lista `categories` (fallback a 'otro' si ninguna calza). */
export async function generateBusinessBrief(
    text: string,
    apiKey: string,
    model = 'gpt-5.1',
    onUsage?: (p: number, c: number) => void,
    categories?: { id: string; label: string; extraFields: { key: string; label: string }[] }[],
): Promise<BusinessBriefData> {
    const systemPrompt = `Eres un experto en marketing digital, copywriting y estrategia de marca. Analizas la descripción de un negocio y extraes información estructurada para crear ANUNCIOS de alto rendimiento orientados a VENDER, según su rubro. Respondes ÚNICAMENTE con un JSON válido, sin markdown, sin texto adicional.`

    const validIds = (categories || []).map(c => c.id)
    const catBlock = categories && categories.length ? `
DETECTÁ LA CATEGORÍA del negocio según el texto. Elegí la más adecuada de esta lista (el campo "category" debe ser el ID EXACTO). Si ninguna calza, usá "otro".
${categories.map(c => `- ${c.id} (${c.label}) → campos propios para categoryData: ${c.extraFields.map(f => f.key).join(', ')}`).join('\n')}
Para "categoryData" completá los campos propios de la categoría que elegiste (las claves de arriba), con datos del negocio.` : ''

    const userPrompt = `Analiza el siguiente texto sobre un negocio y extrae la información de marketing. Si no se menciona algún campo, inferilo inteligentemente del contexto del negocio y su rubro.
${catBlock}

TEXTO DEL NEGOCIO:
"""
${text}
"""

Devuelve EXACTAMENTE este JSON (todos los campos obligatorios, en español):
{
  "category": "el ID EXACTO de la categoría detectada (de la lista de arriba; 'otro' si ninguna calza)",
  "name": "nombre del negocio",
  "industry": "industria",
  "description": "descripción completa en 2-3 oraciones",
  "offerType": "qué vende: producto físico / inmueble / servicio / producto digital / alimento / curso / experiencia (elegí el más preciso)",
  "valueProposition": "propuesta de valor única en 1-2 oraciones",
  "benefits": ["beneficio concreto que gana el cliente 1", "beneficio 2", "beneficio 3", "beneficio 4"],
  "painPoints": ["problema que resuelve 1", "problema 2", "problema 3", "problema 4"],
  "transformation": "el ANTES (problema) → el DESPUÉS (resultado) que logra el cliente, en 1 frase",
  "targetCustomer": "cliente ideal: edad aprox, género, contexto (para saber quién aparece en la foto)",
  "targetAgeMin": 25,
  "targetAgeMax": 55,
  "targetGender": "all | male | female (según el cliente ideal; 'all' si es mixto)",
  "positioning": "premium / medio / económico (según el negocio)",
  "emotion": "emoción principal a transmitir (ej: deseo, alivio, confianza, estatus, seguridad)",
  "adConcepts": ["concepto visual del anuncio 1 (adaptado a ESTE negocio)", "concepto 2", "concepto 3", "concepto 4"],
  "categoryData": { "campo del rubro": "valor según el negocio" },
  "interests": ["interés del cliente 1", "interés 2", "interés 3", "interés 4"],
  "brandVoice": "tono de comunicación",
  "brandColors": ["#hex1", "#hex2", "#hex3"],
  "visualStyle": ["estilo visual 1", "estilo 2", "estilo 3"],
  "primaryObjective": "conversion",
  "mainCTA": "llamada a la acción (ej: Comprar ahora, Solicitar info)",
  "targetCountries": ["nombre del país donde vende, ej: Bolivia (si menciona varios, todos)"],
  "targetCities": ["ciudad o departamento mencionado, ej: Cochabamba, Santa Cruz, Tarija (vacío si no menciona ninguno)"],
  "targetLocations": ["país o ciudad principal"],
  "keyMessages": ["mensaje clave 1", "mensaje clave 2", "mensaje clave 3"],
  "personalityTraits": ["rasgo de marca 1", "rasgo 2", "rasgo 3"],
  "contentThemes": ["tema 1", "tema 2", "tema 3"],
  "engagementLevel": "alto"
}`

    const res = await fetch(`${OPENAI_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            // gpt-5.1 razona antes de responder → SIN max_tokens (limitarlo lo deja vacío)
            // y sin temperature (los modelos de razonamiento usan la default).
            response_format: { type: 'json_object' }
        })
    })

    if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error?.message || `OpenAI error ${res.status}`)
    }

    const data = await res.json()
    const content = data.choices?.[0]?.message?.content
    if (!content) throw new Error('OpenAI no devolvió contenido')
    onUsage?.(data.usage?.prompt_tokens ?? 0, data.usage?.completion_tokens ?? 0)

    let parsed: BusinessBriefData
    try {
        parsed = JSON.parse(content) as BusinessBriefData
    } catch {
        throw new Error('Error al parsear el brief generado por IA')
    }
    // Robustez: la categoría detectada debe ser un ID válido; si no, cae a 'otro'.
    if (validIds.length) {
        parsed.category = validIds.includes(parsed.category as string) ? parsed.category : 'otro'
    }
    return parsed
}

/** Generates N ad copies based on brief + strategy using GPT-4o */
export async function generateAdCopies(params: {
    brief: BusinessBriefData
    strategyName: string
    platform: string
    objective: string
    destination: string
    mediaType: string
    count: number
    apiKey: string
    model?: string
    onUsage?: (p: number, c: number) => void
}): Promise<AdCopyData[]> {
    const { brief, strategyName, platform, objective, destination, mediaType, count, apiKey, model = 'gpt-4o', onUsage } = params

    const platformLimits: Record<string, { primaryText: number; headline: number; description: number }> = {
        META: { primaryText: 500, headline: 40, description: 30 },
        TIKTOK: { primaryText: 300, headline: 50, description: 80 },
        GOOGLE_ADS: { primaryText: 90, headline: 30, description: 90 }
    }

    const limits = platformLimits[platform] || platformLimits['META']

    const destinationMap: Record<string, string> = {
        instagram: 'Instagram (feed y stories)',
        whatsapp: 'WhatsApp Business',
        website: 'Sitio web / tienda online',
        messenger: 'Facebook Messenger',
        tiktok: 'TikTok'
    }

    const hashtagInstructions = platform === 'GOOGLE_ADS'
        ? '- hashtags: "" (Google Ads no usa hashtags)'
        : platform === 'TIKTOK'
            ? `- hashtags: string con 8-12 hashtags TikTok ganadores (mezcla: 2-3 trending masivos + 4-5 nicho del negocio + 1-2 de acción). Formato: "#Tag1 #Tag2 #Tag3"`
            : `- hashtags: string con 5-8 hashtags Instagram/Facebook ganadores (mezcla: 2 masivos populares + 3-4 de nicho específico del negocio + 1 de acción). Formato: "#Tag1 #Tag2 #Tag3"`

    const systemPrompt = `Eres Alex Hormozi mezclado con Gary Vaynerchuk — el mejor copywriter de publicidad digital en español del mundo. Tienes 15 años de experiencia lanzando campañas de millones de dólares en META, TikTok y Google para marcas latinoamericanas. Conoces los patrones psicológicos que hacen que las personas detengan el scroll, lean y compren.

Tu copy SIEMPRE:
✓ Para el scroll en los primeros 3 segundos (hook brutalmente directo)
✓ Activa una emoción fuerte: aspiración, miedo a perder, FOMO, curiosidad
✓ Habla el idioma del cliente ideal (no jerga corporativa)
✓ Tiene prueba social o autoridad implícita
✓ Crea urgencia REAL sin sonar falso
✓ Usa emojis estratégicamente para romper el texto y llamar atención
✓ Termina con CTA irresistible

Respondes ÚNICAMENTE con JSON válido. NUNCA texto fuera del JSON.`

    const platformGuide = platform === 'TIKTOK'
        ? 'Para TikTok: copy muy corto, energético, con lenguaje Gen-Z/Millennial, emojis frecuentes, sentido de inmediatez. Hook = pregunta o afirmación provocadora.'
        : platform === 'GOOGLE_ADS'
            ? 'Para Google Ads: copy basado en intención de búsqueda, beneficios claros, palabras clave del negocio, sin emojis excesivos.'
            : 'Para META/Instagram: copy conversacional y aspiracional. Hook emocional en la primera línea. Usa emojis para separar párrafos y llamar atención. Mezcla beneficios racionales y emocionales.'

    const userPrompt = `Crea exactamente ${count} variaciones PREMIUM de anuncios para ${platform} que generen ventas reales.

═══ NEGOCIO ═══
Nombre: ${brief.name}
Industria: ${brief.industry}
Descripción: ${brief.description}
Propuesta de valor ÚNICA: ${brief.valueProposition}
Puntos de dolor del cliente: ${(brief.painPoints || []).join(' | ')}
Voz de marca: ${brief.brandVoice}
Mensajes clave: ${(brief.keyMessages || []).join(' | ')}
CTA principal: ${brief.mainCTA}
Intereses de la audiencia: ${brief.interests?.join(', ')}
${Array.isArray((brief as any).benefits) && (brief as any).benefits.length ? `Beneficios concretos: ${(brief as any).benefits.join(' | ')}` : ''}
${(brief as any).targetCustomer ? `Cliente ideal: ${(brief as any).targetCustomer}` : ''}
${(brief as any).transformation ? `Transformación (antes→después): ${(brief as any).transformation}` : ''}

═══ ESTRATEGIA ═══
Nombre: ${strategyName}
Plataforma: ${platform}
Objetivo: ${objective}
Destino: ${destinationMap[destination] || destination}
Tipo de creativo: ${mediaType}

${platformGuide}

═══ LÍMITES ESTRICTOS ═══
Primary Text: máx ${limits.primaryText} caracteres
Headline: máx ${limits.headline} caracteres
Description: máx ${limits.description} caracteres

═══ FRAMEWORKS A ROTAR (uno por variación) ═══
Var 1: PAS — Pain → Agitate → Solution (agita el dolor antes de ofrecer la solución)
Var 2: AIDA — Attention → Interest → Desire → Action (clásico pero devastador)
Var 3: Social Proof — Empieza con resultado de un cliente real/hipotético
Var 4: Curiosity Gap — Pregunta o afirmación que OBLIGA a seguir leyendo
Var 5+: Fear of Missing Out — Lo que pierden si no actúan HOY

═══ HOOKS POR RUBRO (Andromeda — adaptá el hook al nicho) ═══
Cada variación debe usar un ÁNGULO de hook DISTINTO (diversidad = más rendimiento). Adaptá el estilo de hook al rubro${(brief as any).category ? ` (categoría: ${(brief as any).category})` : ''}:
- Nutrición/suplementos/fitness → RESULTADO concreto ("subí 12 kg en 90 días", "ojos descansados en 1 semana") o CLAIM de autoridad/contrarian.
- Inmuebles/terrenos → OPORTUNIDAD e inversión ("el m² sube cada mes", "tu patrimonio empieza acá").
- Salud/belleza/estética → ANTES/DESPUÉS + miedo a perder el momento ideal.
- Servicios profesionales/B2B → resultado de negocio + autoridad.
- Comida/restaurante → ANTOJO + urgencia ("recién salido del horno", "solo hoy").
- Moda/joyería → identidad/estatus + deseo.
Usá los BENEFICIOS concretos del negocio en los hooks. Que cada hook sea creíble y específico (no genérico).

═══ REGLAS DE ORO ═══
1. Hook (primera oración) = 90% del éxito. Hazlo IMPOSIBLE de ignorar
2. Emojis: usarlos para guiar la lectura (✅ ⚡ 🔥 💡 👇 etc.), no decorar
3. Párrafos cortos: máx 2-3 líneas cada uno
4. Urgencia real: plazo, cantidad limitada, o consecuencia de no actuar
5. Siempre termina con: "${brief.mainCTA}"
6. Varía completamente el ángulo entre variaciones — NO repitas la misma idea
7. Habla de "tú/tu" (tuteo directo al lector)

${hashtagInstructions}

═══ FORMATO DE RESPUESTA ═══
Devuelve EXACTAMENTE este JSON:
{
  "copies": [
    {
      "slotIndex": 0,
      "hook": "primera oración del copy — el hook solo",
      "primaryText": "copy completo con emojis y párrafos...",
      "headline": "titular de hasta ${limits.headline} chars",
      "description": "descripción breve de hasta ${limits.description} chars",
      "hashtags": "#Tag1 #Tag2 #Tag3"
    }
  ]
}
Genera EXACTAMENTE ${count} objetos (slotIndex del 0 al ${count - 1}).`

    const res = await fetch(`${OPENAI_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            temperature: 0.8,
            max_completion_tokens: 4000,
            response_format: { type: 'json_object' }
        })
    })

    if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error?.message || `OpenAI error ${res.status}`)
    }

    const data = await res.json()
    const content = data.choices?.[0]?.message?.content
    if (!content) throw new Error('OpenAI no devolvió contenido')
    onUsage?.(data.usage?.prompt_tokens ?? 0, data.usage?.completion_tokens ?? 0)

    try {
        const parsed = JSON.parse(content)
        let copies: AdCopyData[]
        if (Array.isArray(parsed)) {
            copies = parsed
        } else {
            // Find the first array value in the object (handles: copies, ads, anuncios, variaciones, etc.)
            const arrayVal = Object.values(parsed).find(v => Array.isArray(v))
            if (!arrayVal) throw new Error('La respuesta de OpenAI no contiene un array de copies')
            copies = arrayVal as AdCopyData[]
        }
        return copies.slice(0, count)
    } catch (e: any) {
        throw new Error(e.message || 'Error al parsear los copies generados por IA')
    }
}

export interface SuggestedStrategy {
    name: string
    description: string
    reason: string
    platform: 'META' | 'TIKTOK' | 'GOOGLE_ADS'
    objective: string
    destination: string
    mediaType: string
    mediaCount: number
    minBudgetUSD: number
    advantageType: string
}

/** Generates AI-personalized strategy suggestions based on a business brief */
/**
 * Genera UN prompt de imagen LIMPIO (estilo "prompt libre" que funciona bien) a
 * partir del brief + la estrategia + el slot. Lo escribe gpt-5.1. El prompt se
 * envía DESPUÉS tal cual a gpt-image-2 (con la foto del producto), sin envoltorios.
 * Devuelve el texto del prompt (o '' si falla → el caller usa fallback).
 */
export async function generateCleanAdImagePrompt(params: {
    brief: BusinessBriefData & { brandColors?: string[]; visualStyle?: string[] }
    objective?: string
    slotIndex: number
    apiKey: string
    model?: string
}): Promise<string> {
    const { brief, objective, slotIndex, apiKey, model = 'gpt-5.1' } = params
    const colors = Array.isArray(brief.brandColors) ? brief.brandColors.slice(0, 3).join(', ') : 'premium brand colors'
    const style = Array.isArray(brief.visualStyle) ? brief.visualStyle.slice(0, 3).join(', ') : 'modern, premium, cinematic'

    // Ángulos limpios (sin badges ni texto recargado) — rotan por slot para dar variedad.
    const angles = [
        'a clean premium HERO product shot — the product perfectly centered as the absolute protagonist',
        'a lifestyle scene where a real, attractive person genuinely benefits from / enjoys the product, aspirational mood',
        'an aspirational RESULT scene that conveys the transformation/benefit, emotionally powerful',
        'a dramatic high-impact close-up of the product with energetic, scroll-stopping atmosphere',
    ]
    const angle = angles[slotIndex % angles.length]

    const system = `You write ONE single image-generation prompt (in English) for the model gpt-image-2 to create ONE professional advertising photo.
STRICT RULES:
- ONE single ad design. NEVER a collage, grid, contact sheet or multiple panels.
- The product is the hero: centered, sharp, photorealistic, cinematic, 4k commercial quality.
- Use the given brand colors and visual style for the background/scene.
- Keep TEXT MINIMAL: at most ONE very short headline (3-5 words) OR no text at all. NEVER ask for badges, price tables, paragraphs, star ratings, "antes/después", stickers or lots of words — the image model renders text badly.
- Clean, elegant, high-converting. No watermarks.
Return ONLY the prompt text — no quotes, no explanations, no markdown.`

    const user = `Business: ${brief.name} (${brief.industry}).
Value: ${(brief.valueProposition || '').substring(0, 140)}
Key message: ${(Array.isArray(brief.keyMessages) ? (brief.keyMessages[slotIndex] || brief.keyMessages[0] || '') : '').substring(0, 80)}
Brand colors: ${colors}. Visual style: ${style}. Campaign objective: ${objective || 'conversions'}.
Create the prompt for ${angle}.`

    try {
        const res = await fetch(`${OPENAI_BASE}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
            body: JSON.stringify({
                model,
                messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
                // Sin max_completion_tokens: gpt-5.1 razona antes de responder; limitarlo lo dejaba vacío.
            }),
        })
        if (!res.ok) {
            const err = await res.json().catch(() => ({}))
            console.error('[cleanImagePrompt] OpenAI', res.status, err?.error?.message)
            return ''
        }
        const data = await res.json()
        const out = (data.choices?.[0]?.message?.content || '').trim().replace(/^["'`]|["'`]$/g, '')
        if (!out) console.error('[cleanImagePrompt] vacío. finish_reason:', data.choices?.[0]?.finish_reason)
        return out
    } catch (e) {
        console.error('[cleanImagePrompt] error:', e instanceof Error ? e.message : e)
        return ''
    }
}

/**
 * Genera N prompts de imagen LIMPIOS en UNA sola llamada a gpt-5.1 (eficiente).
 * N = cantidad de imágenes que eligió el usuario (creatives.length). Cada prompt
 * un ángulo distinto. Devuelve un array de strings de largo `count`.
 */
export async function generateCleanAdImagePrompts(params: {
    brief: BusinessBriefData & { brandColors?: string[]; visualStyle?: string[] }
    objective?: string
    count: number
    apiKey: string
    model?: string
}): Promise<string[]> {
    const { brief, objective, apiKey, model = 'gpt-5.1' } = params
    const count = Math.max(1, Math.min(30, Math.floor(params.count || 1)))
    const colors = Array.isArray(brief.brandColors) ? brief.brandColors.slice(0, 3).join(', ') : 'premium brand colors'
    const style = Array.isArray(brief.visualStyle) ? brief.visualStyle.slice(0, 3).join(', ') : 'modern, premium, cinematic'
    const keyMsgs = Array.isArray(brief.keyMessages) ? brief.keyMessages.slice(0, 6).join(' | ') : ''

    const system = `You write image-generation prompts (in English) for the model gpt-image-2 to create professional advertising photos. You will produce EXACTLY ${count} prompts, each for a DIFFERENT ad angle (hero shot, lifestyle, result/transformation, dramatic close-up, etc.).
STRICT RULES for every prompt:
- ONE single ad design each. NEVER a collage, grid or multiple panels.
- The product is the hero: centered, sharp, photorealistic, cinematic, 4k commercial quality.
- Use the given brand colors and visual style for the background/scene.
- Keep TEXT MINIMAL: at most ONE very short headline (3-5 words) or no text. NEVER ask for badges, price tables, paragraphs, star ratings, "antes/después", stickers or many words — the image model renders text badly.
- Clean, elegant, high-converting, no watermarks.
Return ONLY a JSON object: {"prompts": ["...", "...", ...]} with EXACTLY ${count} strings, no explanations.`

    const user = `Business: ${brief.name} (${brief.industry}).
Value proposition: ${(brief.valueProposition || '').substring(0, 160)}
Key messages: ${keyMsgs.substring(0, 220)}
Brand colors: ${colors}. Visual style: ${style}. Campaign objective: ${objective || 'conversions'}.
Generate ${count} diverse prompts.`

    try {
        const res = await fetch(`${OPENAI_BASE}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
            body: JSON.stringify({
                model,
                messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
                // Sin max_completion_tokens: gpt-5.1 razona antes de responder; limitarlo lo dejaba vacío.
                response_format: { type: 'json_object' },
            }),
        })
        if (!res.ok) {
            const err = await res.json().catch(() => ({}))
            console.error('[cleanImagePrompts] OpenAI', res.status, err?.error?.message)
            return []
        }
        const data = await res.json()
        const content = data.choices?.[0]?.message?.content || ''
        if (!content) { console.error('[cleanImagePrompts] vacío. finish_reason:', data.choices?.[0]?.finish_reason); return [] }
        const parsed = JSON.parse(content)
        const arr: string[] = Array.isArray(parsed) ? parsed : (parsed.prompts ?? Object.values(parsed).find((v: unknown) => Array.isArray(v)) ?? [])
        const out = arr.filter(p => typeof p === 'string' && p.trim()).slice(0, count).map(p => p.trim())
        console.log(`[cleanImagePrompts] gpt-5.1 generó ${out.length}/${count} prompts`)
        return out
    } catch (e) {
        console.error('[cleanImagePrompts] error:', e instanceof Error ? e.message : e)
        return []
    }
}

/**
 * Escribe UN prompt COMPLETO en ESPAÑOL para gpt-image-2 que genera una imagen para
 * un ANUNCIO de Meta Ads que vende el producto del negocio — atractivo y según el
 * brief + la estrategia. Va al campo de prompt (libre), el usuario lo puede editar.
 * Lo escribe gpt-5.1. Devuelve el texto (o '' si falla).
 */
export async function generateAdImagePrompt(params: {
    brief: BusinessBriefData & { brandColors?: string[]; visualStyle?: string[] }
    objective?: string
    apiKey: string
    model?: string
    concepts?: string[]          // conceptos visuales del rubro (librería de la categoría)
    preferredConcept?: string    // forzar un concepto puntual (rotación por slot)
    strategy?: { name?: string; description?: string; objective?: string }
}): Promise<string> {
    const { brief, objective, apiKey, model = 'gpt-5.1', strategy, preferredConcept } = params
    const b = brief as any
    const colors = Array.isArray(brief.brandColors) ? brief.brandColors.slice(0, 3).join(', ') : ''
    const benefits = Array.isArray(b.benefits) && b.benefits.length ? b.benefits.join(' | ') : (Array.isArray(brief.keyMessages) ? brief.keyMessages.slice(0, 3).join(' | ') : '')
    const positioning = b.positioning || ''
    const emotion = b.emotion || ''
    const strategyAngle = strategy?.name || strategy?.description || ''

    const system = `Escribís UN prompt CORTO en español (1 o 2 frases, máximo ~45 palabras) para gpt-image-2: la imagen de un ANUNCIO que VENDE.
- El usuario SUBE la foto del producto, así que NO describas el producto: enfocate en la ESCENA que RESALTA LOS BENEFICIOS.
- Usá PERSONAS solo si al negocio le suma (alguien disfrutando el resultado/beneficio).
- Atractivo y limpio, sin texto, sin marcas de agua.
Devolvé SOLO el prompt, corto y directo.`

    const user = `Anuncio de ${brief.name} (${brief.industry}).
Beneficios a resaltar: ${benefits || 'el beneficio principal'}
${positioning ? `Estilo: ${positioning}.` : ''} ${emotion ? `Emoción: ${emotion}.` : ''} ${colors ? `Colores: ${colors}.` : ''}
${strategyAngle ? `Ángulo: ${strategyAngle}.` : ''}${preferredConcept ? ` Idea: ${preferredConcept}.` : ''}
Objetivo: ${strategy?.objective || objective || 'vender'}.
Escribí el prompt CORTO que resalte los beneficios.`

    try {
        const res = await fetch(`${OPENAI_BASE}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
            body: JSON.stringify({
                model,
                messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
                // Sin max_completion_tokens: gpt-5.1 razona antes de responder; limitarlo lo dejaba vacío.
            }),
        })
        if (!res.ok) {
            const err = await res.json().catch(() => ({}))
            console.error('[adImagePrompt] OpenAI', res.status, err?.error?.message)
            return ''
        }
        const data = await res.json()
        const out = (data.choices?.[0]?.message?.content || '').trim().replace(/^["'`]|["'`]$/g, '')
        if (!out) console.error('[adImagePrompt] vacío. finish_reason:', data.choices?.[0]?.finish_reason)
        return out
    } catch (e) {
        console.error('[adImagePrompt] error:', e instanceof Error ? e.message : e)
        return ''
    }
}

export async function generateStrategySuggestions(
    brief: BusinessBriefData,
    apiKey: string,
    model = 'gpt-4o',
    platform?: string,
    objective?: string,
    destination?: string,
    mediaType?: string,
    onUsage?: (p: number, c: number) => void,
): Promise<SuggestedStrategy[]> {
    const systemPrompt = `Eres un experto en publicidad digital con 15 años de experiencia en Meta Ads, TikTok Ads y Google Ads. Tu especialidad es analizar negocios y recomendar exactamente qué tipo de campaña publicitaria les funcionará mejor. Respondes ÚNICAMENTE con JSON válido.`

    const platformRules: Record<string, string> = {
        META: `PLATAFORMA: Solo META (Facebook & Instagram).
- Todos los valores de "platform" deben ser "META"
- Destinos disponibles: whatsapp, instagram, website, messenger
- minBudgetUSD: elige entre 4-30 USD según la escala recomendada para ESTE negocio
- advantageType: "advantage" para Meta Advantage+ (recomendado para la mayoría), "smart_segmentation" para segmentación manual por intereses
- Objetivos válidos: conversions, leads, traffic, awareness, engagement
- REGLA ABSOLUTA: NUNCA uses "app_promotion"
- REGLA ABSOLUTA: "engagement" SOLO con destino whatsapp, messenger o instagram (NUNCA website)
- REGLA ABSOLUTA: "traffic" y "awareness" SOLO con destino website o instagram

ELIGE libremente las combinaciones objetivo+destino que mejor encajen con este negocio específico.
Piensa: ¿dónde compran sus clientes? ¿WhatsApp es su canal principal o tienen tienda web? ¿El negocio vive de leads o de ventas directas?
No uses siempre las mismas combinaciones — analiza el negocio y decide cuáles tienen más sentido para ÉL.`,
        TIKTOK: `PLATAFORMA: Solo TIKTOK.
- Todos los valores de "platform" deben ser "TIKTOK"
- Destinos disponibles: tiktok, website
- minBudgetUSD: entre 5-25 USD según la escala recomendada
- advantageType: "custom"
- Enfoca estrategias en contenido visual corto, viral y entretenido
- Elige los objetivos que mejor encajen con este negocio en TikTok`,
        GOOGLE_ADS: `PLATAFORMA: Solo GOOGLE_ADS.
- Todos los valores de "platform" deben ser "GOOGLE_ADS"
- Destinos disponibles: website
- minBudgetUSD: entre 8-40 USD según la escala recomendada
- advantageType: "custom"
- Enfoca estrategias en búsqueda por intención: usa palabras clave que los clientes de ESTE negocio realmente buscan en Google`,
    }

    const platformInstruction = platform && platformRules[platform]
        ? platformRules[platform]
        : `PLATAFORMAS: Varía entre META, TIKTOK y GOOGLE_ADS según lo que mejor se adapte al negocio.
- META mínimo 4 USD, TikTok mínimo 5 USD, Google mínimo 8 USD`

    // If user pre-selected a specific ad type, generate focused strategies for that type
    const focusedMode = !!(objective || destination || mediaType)
    const focusInstruction = focusedMode
        ? `El usuario ya eligió el tipo de anuncio que quiere:${objective ? `\n- Objetivo: ${objective}` : ''}${destination ? `\n- Destino: ${destination}` : ''}${mediaType ? `\n- Tipo de creativo: ${mediaType}` : ''}\n\nGenera EXACTAMENTE 4 estrategias enfocadas en esta combinación, con diferentes ángulos (distintos presupuestos, tamaños de audiencia, enfoques creativos, o variaciones del mismo objetivo). NO generes estrategias con otros objetivos o destinos distintos a los elegidos.`
        : 'Genera entre 6 y 8 estrategias diversas con diferentes objetivos y destinos para cubrir todos los ángulos del negocio.'

    // Campos NUEVOS del brief (si vienen) → para estrategias alineadas al rubro y posicionamiento.
    const b = brief as any
    const extraLines = [
        b.category && `Categoría: ${b.category}`,
        b.offerType && `Tipo de oferta: ${b.offerType}`,
        Array.isArray(b.benefits) && b.benefits.length ? `Beneficios (qué gana el cliente): ${b.benefits.join(' | ')}` : '',
        b.transformation && `Transformación (antes→después): ${b.transformation}`,
        b.positioning && `Posicionamiento: ${b.positioning}`,
        b.targetCustomer && `Cliente ideal: ${b.targetCustomer}`,
        b.emotion && `Emoción a transmitir: ${b.emotion}`,
        b.categoryData && typeof b.categoryData === 'object' && Object.keys(b.categoryData).length
            ? `Datos del rubro: ${Object.entries(b.categoryData).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join(', ')}` : '',
        Array.isArray(b.adConcepts) && b.adConcepts.length ? `Conceptos visuales sugeridos: ${b.adConcepts.join(' · ')}` : '',
    ].filter(Boolean).join('\n')

    const userPrompt = `Eres un consultor experto en publicidad digital. Analiza este negocio en profundidad y diseña estrategias de campaña ESPECÍFICAS para él — no estrategias genéricas.

${focusInstruction}

═══ NEGOCIO ═══
Nombre: ${brief.name}
Industria: ${brief.industry}
Descripción: ${brief.description}
Propuesta de valor única: ${brief.valueProposition}
Puntos de dolor que resuelve: ${brief.painPoints?.join(' | ')}
Audiencia (intereses): ${brief.interests?.join(', ')}
Voz de marca: ${brief.brandVoice}
CTA principal: ${brief.mainCTA}
Mensajes clave: ${brief.keyMessages?.join(' | ')}
Temas de contenido: ${brief.contentThemes?.join(', ')}
Personalidad de marca: ${brief.personalityTraits?.join(', ')}
Objetivo principal del negocio: ${brief.primaryObjective}
Ubicaciones objetivo: ${brief.targetLocations?.join(', ')}
${extraLines ? `\n═══ DATOS CLAVE DEL BRIEF (USALOS) ═══\n${extraLines}\n` : ''}
${extraLines ? `═══ CÓMO USAR ESTOS DATOS ═══
- Tipo de oferta / categoría → elegí destino y objetivo coherentes: inmueble/terreno → leads o WhatsApp (venta consultiva); producto físico/e-commerce → conversions a web o WhatsApp; servicio/profesional → leads; comida → engagement/WhatsApp o tráfico; software/curso → leads o tráfico a landing.
- Posicionamiento → ajustá presupuesto y volumen: "premium" → presupuesto algo mayor y menos anuncios más cuidados; "económico" → más volumen con presupuesto ajustado; "medio" → equilibrio.
- Beneficios y transformación → el "reason" y la descripción deben citar el BENEFICIO o la transformación REAL (no genérico).
- Cliente ideal y emoción → reflejá la audiencia y el tono emocional en el enfoque de cada estrategia.
` : ''}
═══ INSTRUCCIONES DE PERSONALIZACIÓN ═══
Antes de generar, responde internamente estas preguntas sobre el negocio:
1. ¿Sus clientes compran por impulso o necesitan convencimiento? → define el objetivo
2. ¿El canal de venta principal es WhatsApp, web, o redes? → define el destino
3. ¿Es un negocio visual (moda, comida, fitness) o informativo (servicios, consultoría)? → define mediaType
4. ¿Qué presupuesto tiene sentido para esta industria y tamaño?
5. ¿Qué hace ÚNICO a este negocio y cómo se traduce en un anuncio diferente?

Cada estrategia debe tener:
- Un nombre que MENCIONE el negocio o su industria (no nombres genéricos como "Campaña de Conversiones")
- Una descripción que explique exactamente cómo esa estrategia aprovecha lo único de ESTE negocio
- Un "reason" que cite datos específicos del negocio (máx 130 caracteres)

═══ REGLAS TÉCNICAS ═══
1. No repitas la misma combinación objetivo+destino más de una vez
2. mediaCount: 5 para test inicial, 10 para escala, 20 para campaña grande — elige según presupuesto y madurez
3. El nombre máx 55 chars — debe ser específico al negocio
4. "app_promotion" solo si el negocio tiene app móvil (si no la menciona, no la uses)

GUÍA DE OBJETIVOS:
- conversions → compras, pagos, registros con pago directo
- leads → formularios, contactos, solicitudes de info
- traffic → visitas a sitio web, blog, landing
- awareness → reconocimiento de marca, alcance masivo
- engagement → mensajes, comentarios, interacción directa

═══ META ANDROMEDA — MEJORES PRÁCTICAS (Meta 2026) ═══
El motor Andromeda de Meta premia el VOLUMEN y la DIVERSIDAD de creatividades por encima de la micro-segmentación. Al diseñar estrategias para META aplicá esto:
- Preferí audiencias AMPLIAS con Advantage+ (usa advantageType: "advantage") salvo que el negocio claramente pida lo contrario. Evitá fragmentar en micro-audiencias por demografía.
- Cada estrategia debe apuntar a creatividades con ÁNGULOS DISTINTOS entre sí (problema/solución, prueba social, romper objeciones, lifestyle, oferta/urgencia) — no variaciones casi iguales. Reflejá ese enfoque de "ideas diferentes para personas diferentes" en la descripción.
- Más creatividades diversas ayudan a Andromeda: usá mediaCount 5 para test, 10 para escalar, 20 para campaña grande.
- Mantené la estructura simple (pocos ad sets) para que el aprendizaje se concentre.

${platformInstruction}

Devuelve EXACTAMENTE este JSON (${focusedMode ? 'exactamente 4 estrategias' : 'entre 6 y 8 estrategias'}):
{
  "strategies": [
    {
      "name": "nombre profesional y atractivo",
      "description": "descripción clara de 1-2 oraciones de cómo funciona la estrategia",
      "reason": "por qué funciona específicamente para este negocio",
      "platform": "META",
      "objective": "conversions",
      "destination": "whatsapp",
      "mediaType": "image",
      "mediaCount": 10,
      "minBudgetUSD": 4,
      "advantageType": "advantage"
    }
  ]
}

${platform === 'META' ? 'Plataforma única: META' : platform === 'TIKTOK' ? 'Plataforma única: TIKTOK' : platform === 'GOOGLE_ADS' ? 'Plataforma única: GOOGLE_ADS' : 'Plataformas válidas: META, TIKTOK, GOOGLE_ADS'}
${platform === 'META' ? 'Objetivos válidos para META: conversions, leads, traffic, awareness, engagement (NO app_promotion)' : platform === 'TIKTOK' ? 'Objetivos válidos para TIKTOK: conversions, leads, traffic, awareness, engagement' : platform === 'GOOGLE_ADS' ? 'Objetivos válidos para GOOGLE_ADS: conversions, leads, traffic, awareness' : 'Objetivos válidos: conversions, leads, traffic, awareness, engagement, app_promotion'}
${platform === 'META' ? 'Destinos válidos para META: instagram, whatsapp, website, messenger' : platform === 'TIKTOK' ? 'Destinos válidos para TIKTOK: tiktok, website' : platform === 'GOOGLE_ADS' ? 'Destinos válidos para GOOGLE_ADS: website' : 'Destinos válidos: instagram, whatsapp, website, messenger, tiktok'}`

    const res = await fetch(`${OPENAI_BASE}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
            model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            // Sin temperature ni max_completion_tokens: gpt-5.1 razona y rechaza/limita esos params
            // (mismo motivo que en el brief). gpt-4o igual funciona sin ellos.
            response_format: { type: 'json_object' }
        })
    })

    if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error?.message || `OpenAI error ${res.status}`)
    }

    const data = await res.json()
    const content = data.choices?.[0]?.message?.content
    if (!content) throw new Error('La IA no devolvió contenido para las estrategias. Probá de nuevo.')
    onUsage?.(data.usage?.prompt_tokens ?? 0, data.usage?.completion_tokens ?? 0)

    let parsed: any
    try {
        parsed = JSON.parse(content)
    } catch {
        throw new Error('La IA devolvió un formato inválido para las estrategias. Probá de nuevo.')
    }
    const strategies = Array.isArray(parsed)
        ? parsed
        : (parsed.strategies ?? Object.values(parsed).find((v: any) => Array.isArray(v)) ?? [])
    return (strategies as SuggestedStrategy[]).slice(0, focusedMode ? 4 : 8)
}

/**
 * Generates 8-12 Meta-compatible interest keyword strings from a business brief.
 * These keyword strings are then resolved to real Meta interest IDs via the Targeting Search API.
 */
export async function generateAudienceInterests(
    brief: BusinessBriefData,
    apiKey: string,
    model = 'gpt-5.1',
    onUsage?: (promptTokens: number, completionTokens: number) => void,
): Promise<string[]> {
    const b = brief as any
    const prompt = `You are a senior Meta Ads strategist who follows Meta's 2026 "Andromeda" best practices: prefer BROAD, high-signal audiences that Meta's AI can optimize, NOT hyper-narrow micro-targeting. Generate search terms that map to REAL, EXISTING interests in Meta's Targeting Search API and represent this business's ideal customer identity, lifestyle, needs and aspirations.

BUSINESS:
- Name: ${brief.name}
- Industry / category: ${brief.industry}${b.category ? ` (${b.category})` : ''}
- What it sells (offerType): ${b.offerType || ''}
- Description: ${brief.description}
- Value proposition: ${brief.valueProposition || ''}
- Benefits (what the customer gains): ${(b.benefits || []).join(', ')}
- IDEAL CUSTOMER: ${b.targetCustomer || ''}
- Customer interests: ${(brief.interests || []).join(', ')}
- Pain points: ${(brief.painPoints || []).join(', ')}
- Objective: ${brief.primaryObjective || ''}

ANDROMEDA APPROACH (very important):
- Favor BROAD but RELEVANT interests (category, lifestyle, identity, aspirations) — Meta's AI expands from there. Avoid hyper-niche or tiny interests.
- Mix four angles: (1) the product/category itself, (2) the customer's lifestyle & identity, (3) related activities/brands, (4) adjacent aspirations or needs.
- Quality over quantity: every term must map to a REAL, sizeable Meta interest.

RULES:
1. Write terms in ENGLISH exactly as they appear in Meta Ads Manager.
2. Specific to THIS business — never generic single words like "health" or "beauty".
3. NEVER ambiguous brand-collision terms (e.g. never "acne" alone — matches "Acne Studios").
4. Include the category hint in parentheses when possible, e.g. "Skin care (cosmetics)".
5. Match the IDEAL CUSTOMER (age/identity) when choosing lifestyle interests.
6. Generate EXACTLY 15 strong terms.

Return ONLY valid JSON: {"interests": ["term1", "term2", ...]}`

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 60_000) // gpt-5.1 razona → margen
    let res: Response
    try {
        res = await fetch(`${OPENAI_BASE}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
            body: JSON.stringify({
                model,
                messages: [{ role: 'user', content: prompt }],
                // Sin temperature ni max_completion_tokens: gpt-5.1 los rechaza/vacía (mismo criterio que el brief).
                response_format: { type: 'json_object' }
            }),
            signal: controller.signal,
        })
    } catch (e: any) {
        if (e?.name === 'AbortError') throw new Error('OpenAI tardó demasiado (>60s) al generar intereses de audiencia. Inténtalo de nuevo.')
        throw new Error(`Error de red al contactar OpenAI: ${e?.message || e}`)
    } finally {
        clearTimeout(timeout)
    }
    if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        const msg = err?.error?.message || `OpenAI respondió con error ${res.status}`
        throw new Error(`OpenAI: ${msg}`)
    }
    const data = await res.json()
    if (onUsage) {
        try { onUsage(data.usage?.prompt_tokens ?? 0, data.usage?.completion_tokens ?? 0) } catch { /* no romper por la medición */ }
    }
    const content = data.choices?.[0]?.message?.content
    if (!content) throw new Error('OpenAI no devolvió contenido al generar intereses de audiencia')
    let parsed: any
    try { parsed = JSON.parse(content) } catch { throw new Error('OpenAI devolvió un formato inválido al generar intereses de audiencia') }
    const arr = Array.isArray(parsed)
        ? parsed
        : (parsed.interests ?? Object.values(parsed).find((v: any) => Array.isArray(v)) ?? [])
    const keywords = (arr as unknown[]).filter((s): s is string => typeof s === 'string').slice(0, 20)
    if (keywords.length === 0) throw new Error('OpenAI no generó ningún interés de audiencia válido')
    return keywords
}

/**
 * Filters a list of Meta interest candidates (resolved from Meta's Targeting Search API)
 * down to only the ones genuinely relevant to the business.
 * This prevents irrelevant results like "Acne Studios (clothing)" appearing for a skincare brand.
 */
export async function filterAudienceInterests(
    brief: BusinessBriefData,
    candidates: Array<{ id: string; name: string }>,
    apiKey: string,
    model = 'gpt-4o-mini',
    onUsage?: (promptTokens: number, completionTokens: number) => void,
): Promise<Array<{ id: string; name: string }>> {
    if (candidates.length === 0) return []

    const candidateList = candidates.map((c, i) => `${i + 1}. "${c.name}"`).join('\n')

    const prompt = `You are a Meta Ads targeting expert. A business wants to run ads and Meta's API returned these interest candidates.

BUSINESS:
- Name: ${brief.name}
- Industry: ${brief.industry}
- Description: ${brief.description}
- Value proposition: ${brief.valueProposition || ''}
- Target audience interests: ${(brief.interests || []).join(', ')}

INTEREST CANDIDATES FROM META:
${candidateList}

YOUR TASK:
Select ONLY the interests that are genuinely relevant to this business and its target customers.
REJECT interests that are:
- Clothing/fashion brands when selling non-fashion products (e.g. "Acne Studios" for skincare)
- Food/drink interests for non-food businesses
- Completely unrelated industries
- Generic psychology terms for physical products
- Any interest where the name suggests a completely different industry

Return the numbers of the RELEVANT interests only.
Return ONLY valid JSON: {"relevant": [1, 4, 7, ...]} (list of numbers)`

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10_000)
    try {
        const res = await fetch(`${OPENAI_BASE}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
            body: JSON.stringify({
                model,
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.1,
                max_completion_tokens: 200,
                response_format: { type: 'json_object' }
            }),
            signal: controller.signal,
        })
        if (!res.ok) return candidates // fallback: return all if filtering fails
        const data = await res.json()
        if (onUsage) {
            try { onUsage(data.usage?.prompt_tokens ?? 0, data.usage?.completion_tokens ?? 0) } catch { /* no romper por la medición */ }
        }
        const content = data.choices?.[0]?.message?.content
        if (!content) return candidates
        const parsed = JSON.parse(content)
        const relevantIndices: number[] = parsed.relevant ?? []
        const filtered = relevantIndices
            .map(i => candidates[i - 1])
            .filter(Boolean)
        return filtered.length > 0 ? filtered : candidates
    } catch {
        return candidates // fallback: return all if filtering fails
    } finally {
        clearTimeout(timeout)
    }
}

/**
 * Generates 3 creative suggestions for a specific ad field (headline, primaryText, description)
 * based on the business brief and current slot content.
 */
export async function generateFieldSuggestions(params: {
    brief: BusinessBriefData
    field: 'primaryText' | 'headline' | 'description' | 'whatsappGreeting' | 'quickReply'
    slotIndex: number
    platform: string
    destination: string
    currentContent?: string
    apiKey: string
    model?: string
    onUsage?: (p: number, c: number) => void
}): Promise<string[]> {
    const { brief, field, slotIndex, platform, destination, currentContent, apiKey, model = 'gpt-4o', onUsage } = params

    const limits: Record<string, number> = {
        primaryText: platform === 'GOOGLE_ADS' ? 90 : platform === 'TIKTOK' ? 300 : 500,
        headline: platform === 'GOOGLE_ADS' ? 30 : platform === 'TIKTOK' ? 50 : 40,
        description: platform === 'GOOGLE_ADS' ? 90 : 30,
        whatsappGreeting: 180,
        quickReply: 50,
    }

    const fieldDescriptions: Record<string, string> = {
        primaryText: `Texto principal del anuncio (el cuerpo del copy, con emojis y párrafos cortos). Máx ${limits.primaryText} caracteres.`,
        headline: `Titular llamativo y directo (aparece bajo la imagen). Máx ${limits.headline} caracteres. Sin emojis.`,
        description: `Descripción breve complementaria al titular. Máx ${limits.description} caracteres.`,
        whatsappGreeting: `Saludo cálido y breve para iniciar el chat de WhatsApp Business. Máx 180 caracteres. Incluye un emoji. Invita al cliente a responder.`,
        quickReply: `Texto MUY corto para un botón de respuesta rápida de WhatsApp. Máx 50 caracteres, sin emojis. Ej: "Quiero más información", "Ver precios".`,
    }

    const destMap: Record<string, string> = {
        whatsapp: 'WhatsApp Business', website: 'sitio web', instagram: 'Instagram', messenger: 'Messenger'
    }

    // Chat de WhatsApp (saludo / botón de respuesta rápida) — prompt dedicado
    if (field === 'whatsappGreeting' || field === 'quickReply') {
        const chatPrompt = `Eres experto en mensajes de WhatsApp Business en español. Genera 3 variaciones DISTINTAS.

NEGOCIO: ${brief.name} (${brief.industry})
PROPUESTA DE VALOR: ${brief.valueProposition}
VOZ DE MARCA: ${brief.brandVoice}
CTA: ${brief.mainCTA}
${currentContent ? `VERSIÓN ACTUAL: "${currentContent}"` : ''}

CAMPO A GENERAR: ${fieldDescriptions[field]}

Devuelve ÚNICAMENTE este JSON:
{"suggestions": ["opción 1", "opción 2", "opción 3"]}`

        const cRes = await fetch(`${OPENAI_BASE}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
            body: JSON.stringify({
                model,
                messages: [{ role: 'user', content: chatPrompt }],
                temperature: 0.9,
                max_completion_tokens: 600,
                response_format: { type: 'json_object' }
            })
        })
        if (!cRes.ok) {
            const err = await cRes.json().catch(() => ({}))
            throw new Error(err?.error?.message || `OpenAI error ${cRes.status}`)
        }
        const cData = await cRes.json()
        const cContent = cData.choices?.[0]?.message?.content
        if (!cContent) throw new Error('OpenAI no devolvió contenido')
        onUsage?.(cData.usage?.prompt_tokens ?? 0, cData.usage?.completion_tokens ?? 0)
        const cParsed = JSON.parse(cContent)
        const cSuggestions = Array.isArray(cParsed) ? cParsed : (cParsed.suggestions ?? Object.values(cParsed).find((v: any) => Array.isArray(v)) ?? [])
        return (cSuggestions as string[]).slice(0, 3)
    }

    const prompt = `Eres el mejor copywriter de publicidad digital en español. Genera 3 variaciones DISTINTAS de "${field}" para un anuncio de ${platform}.

NEGOCIO: ${brief.name} (${brief.industry})
PROPUESTA DE VALOR: ${brief.valueProposition}
PUNTOS DE DOLOR: ${brief.painPoints.slice(0, 3).join(', ')}
VOZ DE MARCA: ${brief.brandVoice}
CTA: ${brief.mainCTA}
DESTINO: ${destMap[destination] || destination}
ANUNCIO #${slotIndex + 1}
${currentContent ? `VERSIÓN ACTUAL: "${currentContent}"` : ''}

CAMPO A GENERAR: ${fieldDescriptions[field]}

REGLAS:
1. Cada variación debe ser completamente diferente en ángulo (emocional, racional, urgencia)
2. Todas deben ser irresistibles y específicas al negocio
3. Habla directamente al cliente ("tú/tu")
${field === 'primaryText' ? '4. Usa emojis estratégicamente (✅ ⚡ 🔥 👇 etc.)\n5. Párrafos cortos de máx 2-3 líneas' : '4. Sin emojis en titular/descripción'}

Devuelve ÚNICAMENTE este JSON:
{"suggestions": ["opción 1", "opción 2", "opción 3"]}`

    const res = await fetch(`${OPENAI_BASE}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.9,
            max_completion_tokens: 1200,
            response_format: { type: 'json_object' }
        })
    })

    if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error?.message || `OpenAI error ${res.status}`)
    }

    const data = await res.json()
    const content = data.choices?.[0]?.message?.content
    if (!content) throw new Error('OpenAI no devolvió contenido')
    onUsage?.(data.usage?.prompt_tokens ?? 0, data.usage?.completion_tokens ?? 0)
    const parsed = JSON.parse(content)
    const suggestions = Array.isArray(parsed) ? parsed : (parsed.suggestions ?? Object.values(parsed).find((v: any) => Array.isArray(v)) ?? [])
    return (suggestions as string[]).slice(0, 3)
}

export type ImageQuality = 'fast' | 'standard' | 'premium'
// gpt-image-2 admite resoluciones flexibles; soportamos 1:1, 2:3/3:2 y 9:16/16:9.
export type ImageSize = '1024x1024' | '1024x1536' | '1536x1024' | '1024x1792' | '1792x1024'

/** Generates an ad image using gpt-image-2 based on brief. Returns a PNG Buffer. */
export async function generateAdImage(params: {
    brief: BusinessBriefData
    mediaType: string
    slotIndex: number
    apiKey: string
    customPrompt?: string
    quality?: ImageQuality
    size?: ImageSize
}): Promise<Buffer> {
    const { brief, mediaType, slotIndex, apiKey, customPrompt, quality = 'standard', size = '1024x1024' } = params

    const colorStr = (brief.brandColors || []).slice(0, 2).join(' and ') || 'neutral tones'
    const styleStr = (brief.visualStyle || []).slice(0, 3).join(', ') || 'modern, professional'
    const valueProposition = brief.valueProposition?.substring(0, 100) || ''
    const keyMessages = brief.keyMessages || []
    const keyMessage = (keyMessages[slotIndex] || keyMessages[0] || '').substring(0, 100)

    let prompt: string
    if (customPrompt) {
        prompt = customPrompt
    } else {
        const industry = brief.industry?.toLowerCase() || ''
        const name = brief.name || 'brand'
        const value = (brief.valueProposition || '').substring(0, 60)
        const msg = (keyMessage || valueProposition).substring(0, 25)

        const concepts = [
            `ultra realistic advertising poster, confident attractive person holding the ${name} product with genuine excitement and emotion, dramatic ${colorStr} volumetric god rays lighting, glowing light particles and bokeh in background, product in sharp foreground focus, cinematic depth of field, professional commercial photography, 4k hyper detailed, with a bold 3D embossed text badge reading "${msg}" top-right corner glowing neon outline`,
            `high-end social media ad for ${name}, dramatic before-and-after transformation split scene, person on right side glowing with confidence and results showing the transformation, bold visual contrast between sides, ${colorStr} color palette, cinematic lighting with rim light on faces, ultra realistic 4k, gold ribbon badge bottom-center reading "${msg}" with star icons`,
            `luxury ${industry} advertising campaign, product as absolute hero floating in foreground crystal sharp, stunning atmospheric environment behind it with cinematic bokeh blur, moody dramatic lighting, smoke and light streak particles, depth of field, magazine cover quality, ${colorStr} color scheme, 4k hyper detailed commercial photography, bold diagonal banner top-right "${msg}"`,
            `powerful lifestyle brand ad, aspirational ${industry} scene with beautiful people living the result "${value}", golden hour warm cinematic light, ${colorStr} color grading, emotional mood, professional ad agency quality, ultra realistic 4k, circular testimonial badge bottom-left with 5 stars and text "${msg}"`,
        ]

        prompt = `${concepts[slotIndex % concepts.length]}, ${styleStr}, no watermarks, social media high conversion ad, ultra realistic`
    }

    // gpt-image-2 quality mapping: fast→low, standard→medium, premium→high
    const gptQuality = quality === 'premium' ? 'high' : quality === 'fast' ? 'low' : 'medium'

    const res = await fetch(`${OPENAI_BASE}/images/generations`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: IMAGE_MODEL,
            prompt,
            n: 1,
            size,
            quality: gptQuality,
            output_format: 'png',
        })
    })

    if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error?.message || `gpt-image-2 error ${res.status}`)
    }

    const data = await res.json()
    const b64 = data.data?.[0]?.b64_json
    if (!b64) throw new Error('gpt-image-2 no devolvió una imagen')
    return Buffer.from(b64, 'base64')
}

/**
 * Edits/improves an existing image using gpt-image-2.
 * Returns a Buffer (PNG) so the caller can upload to storage.
 */
export async function editAdImageWithReference(params: {
    imageUrl: string
    prompt: string
    apiKey: string
    size?: ImageSize
    quality?: 'low' | 'medium' | 'high'
}): Promise<Buffer> {
    const { imageUrl, prompt, apiKey, size = '1024x1024', quality = 'medium' } = params

    // Download the reference image
    const imgRes = await fetch(imageUrl)
    if (!imgRes.ok) throw new Error('No se pudo descargar la imagen de referencia')
    const imgBuffer = Buffer.from(await imgRes.arrayBuffer())
    const contentType = imgRes.headers.get('content-type') || 'image/png'

    // Build multipart form data
    const form = new FormData()
    const blob = new Blob([imgBuffer], { type: contentType })
    form.append('image', blob, 'reference.png')
    form.append('prompt', prompt)
    form.append('model', IMAGE_MODEL)
    form.append('size', size)
    form.append('quality', quality) // low = rápido; high = lento (~90s)
    form.append('n', '1')

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 150_000)

    let res: Response
    try {
        res = await fetch(`${OPENAI_BASE}/images/edits`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${apiKey}` },
            body: form,
            signal: controller.signal,
        })
    } catch (e: any) {
        if (e?.name === 'AbortError') throw new Error('La generación de imagen tardó demasiado. Intenta de nuevo.')
        throw e
    } finally {
        clearTimeout(timeout)
    }

    if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error?.message || `gpt-image-2 error ${res.status}`)
    }

    const data = await res.json()
    const b64 = data.data?.[0]?.b64_json
    if (!b64) throw new Error('gpt-image-2 no devolvió imagen')
    return Buffer.from(b64, 'base64')
}

/**
 * Uses GPT-4o Vision to describe a product image in detail.
 * The description is used to build a product-preserving edit prompt for gpt-image-2.
 */
export async function analyzeProductImageForAd(params: {
    imageUrl: string
    apiKey: string
}): Promise<string> {
    const { imageUrl, apiKey } = params

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 20_000)

    let res: Response
    try {
        res = await fetch(`${OPENAI_BASE}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4o',
                max_completion_tokens: 400,
                messages: [
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'image_url',
                                image_url: { url: imageUrl, detail: 'high' }
                            },
                            {
                                type: 'text',
                                text: `Describe this product in precise detail for use in an AI image generation prompt. I need to faithfully reproduce this exact product in a new advertising image.

Describe:
1. Product type and category (bottle, bag, box, tube, etc.)
2. Exact shape and proportions
3. All colors present (background, text areas, accents)
4. Any visible brand name, product name, or logo text on the packaging
5. Key visual design elements (patterns, icons, graphics on packaging)
6. Materials and finish (glossy, matte, transparent, metallic, etc.)
7. Size impression (small pocket-sized, medium bottle, large bag, etc.)

Be very specific. This description will be used to recreate the product visually. 4-5 sentences.`
                            }
                        ]
                    }
                ]
            }),
            signal: controller.signal,
        })
    } catch (e: any) {
        if (e?.name === 'AbortError') throw new Error('Vision analysis timed out')
        throw e
    } finally {
        clearTimeout(timeout)
    }

    if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error?.message || `Vision analysis error ${res.status}`)
    }

    const visionData = await res.json()
    return visionData.choices?.[0]?.message?.content?.trim() || ''
}

/**
 * Uses GPT to generate a specific ad creative direction for ANY type of business.
 * Returns a scene description tailored to the exact product/industry.
 * slotIndex 0-3 produces 4 different creative concepts for variety.
 */
export async function generateCreativeDirection(params: {
    brief: BusinessBriefData
    productDescription: string
    slotIndex: number
    apiKey: string
}): Promise<string> {
    const { brief, productDescription, slotIndex, apiKey } = params

    const conceptTypes = [
        'product hero shot in foreground with dramatic environment and people in background',
        'person using or transformed by the product — before/after or peak result moment',
        'aspirational lifestyle scene — person living the result the brand promises',
        'dramatic power/luxury scene — product center stage with cinematic VFX and atmosphere',
    ]
    const concept = conceptTypes[slotIndex % conceptTypes.length]

    const prompt = `You are a world-class advertising creative director and prompt engineer. You write ultra-detailed image generation prompts that produce breathtaking, high-converting social media ads.

BRAND INFO:
- Brand: ${brief.name} | Industry: ${brief.industry}
- Product: ${brief.description}
- Value proposition: ${brief.valueProposition || ''}
- Key message: ${brief.keyMessages?.[slotIndex] || brief.keyMessages?.[0] || ''}
- Brand colors: ${brief.brandColors?.join(', ') || 'not specified'}
- Visual style: ${brief.visualStyle?.join(', ') || 'modern, cinematic'}
- Target audience: ${(brief.interests || []).join(', ')}
- Pain points solved: ${(brief.painPoints || []).slice(0, 2).join(', ')}

${productDescription ? `PRODUCT IN SCENE (keep 100% faithful — same packaging, colors, shape, label): ${productDescription}` : ''}

CREATIVE CONCEPT: ${concept}

REFERENCE EXAMPLES (study the level of detail and adapt for this brand):
- Supplements/male performance: "Ultra realistic advertising poster, black and red color scheme, intense flames surrounding the scene, passionate couple silhouette in the background slightly blurred, dramatic cinematic lighting, high contrast shadows, glowing red and orange highlights, heat aura effect, product packaging in foreground sharp focus, depth of field, smoke and fire particles, luxury branding style, bold composition with space for large text, 4k hyper detailed"
- Fitness/energy: "Futuristic fitness poster, muscular athletic man standing confidently, glowing green energy aura surrounding his body, electric particles and light streaks, sci-fi neon environment, dark background with green and blue lighting, powerful pose clenched fists, high detail muscles, cinematic lighting, volumetric light beams, energy waves flowing around, product packaging in foreground floating slightly with glow, ultra realistic 4k"
- Business/MLM/events: "Luxury business event poster, two professional speakers in elegant formal suits, confident expressions, modern stage presence, futuristic blue neon background with digital lines and light effects, glowing circular tech design behind them, cinematic lighting, soft rim light on faces, metallic silver 3D typography in foreground, glossy reflections, depth of field, ultra realistic 4k"
- Automotive: "High-end car advertising banner, red luxury SUV in foreground clean reflections glossy paint, happy couple in background enjoying outdoor lifestyle, sunset lighting warm tones, mountains and nature, professional commercial photography style, financial concept freedom and success, sharp focus on car, depth of field blur on background, ultra realistic 4k"
- Skincare/beauty: "Ultra realistic beauty ad, radiant latina woman touching her glowing porcelain skin, close-up face shot, golden hour warm light, botanical serum drops floating and splashing in slow motion around her, lush green bokeh background, high-end commercial photography, skin texture visible, luxury spa atmosphere, cinematic depth of field, 4k hyper detailed"
- Food/restaurant: "Ultra realistic food advertisement, steaming gourmet burger in extreme close-up sharp focus, melting cheese dripping in slow motion, fire grill flames in background bokeh, dramatic dark moody kitchen lighting, smoke particles, golden hour color grading, Michelin star restaurant style, 4k commercial food photography"

YOUR TASK:
Write a SINGLE complete image generation prompt for ${brief.name}. It must:
1. Name the specific type of person or character in the scene (their appearance, emotion, pose)
2. Describe the environment in detail (location, background, atmosphere, colors)
3. Specify all visual effects (fire, particles, neon glow, energy aura, light beams, smoke, bokeh)
4. Describe product placement (foreground, sharp focus, depth of field behind it)
5. Include technical photography terms (cinematic lighting, depth of field, volumetric light, 4k, ultra realistic, hyper detailed, rim light, color grading)
6. End with the marketing angle (high conversion, social media ad, space for text if needed)

Write it as ONE continuous string of descriptive phrases separated by commas — exactly like the reference examples. 80-120 words. Do not use bullet points. Return only the prompt, nothing else.`

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 25_000)
    try {
        const res = await fetch(`${OPENAI_BASE}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
            body: JSON.stringify({
                model: 'gpt-4o',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.85,
                max_completion_tokens: 600,
            }),
            signal: controller.signal,
        })
        if (!res.ok) return ''
        const data = await res.json()
        return data.choices?.[0]?.message?.content?.trim() || ''
    } catch {
        return ''
    } finally {
        clearTimeout(timeout)
    }
}

/**
 * Generates a specific, attractive text overlay description for an ad image.
 * Adapts to any industry/product based on the brief and strategy.
 * Each slot gets a different angle (testimonial, price, CTA, before/after, etc.)
 */
export async function generateTextOverlay(params: {
    brief: BusinessBriefData
    slotIndex: number
    objective: string
    destination: string
    apiKey: string
}): Promise<string> {
    const { brief, slotIndex, objective, destination, apiKey } = params

    const keyMsg = (brief.keyMessages || [])[slotIndex] || (brief.keyMessages || [])[0] || brief.valueProposition || ''
    const cta = brief.mainCTA || 'Contáctanos'

    const conceptTypes = [
        'key message headline + CTA button',
        'before/after or result/testimonial badge',
        'price offer or promotional badge + urgency',
        'trust elements: star rating, guarantee badge, or social proof number',
    ]
    const concept = conceptTypes[slotIndex % conceptTypes.length]

    const prompt = `You are a world-class ad creative director. Write the text/graphic overlay description that will be embedded inside an advertising image prompt for gpt-image-2.

Brand: ${brief.name} | Industry: ${brief.industry} | Value: ${brief.valueProposition || ''} | Key message: ${keyMsg} | CTA: ${cta} | Brand colors: ${(brief.brandColors || []).join(', ') || 'not specified'} | Ad goal: ${objective}

Overlay concept for this slot: ${concept}

Study these high-converting overlay styles and adapt for this brand:
- Before/after skincare: bold split-screen label "ANTES | DESPUÉS" in white 3D font with glowing gold border, positioned center-bottom, real result text "Piel radiante en 7 días" below in script font
- Supplement transformation: explosive energy badge top-right, star burst shape in brand red, bold white caps "PIERDE 10KG", micro text "Resultados reales" with ⭐⭐⭐⭐⭐ stars below
- MLM income claim: gold metallic ribbon top-left corner, "Gana $800/mes" in embossed black serif, shimmer shine effect across the ribbon, small "Únete gratis" pill button below
- Testimonial badge: circular photo badge bottom-left with a generic smiling face silhouette, white rounded card behind it, "★★★★★ — Me cambió la vida" in dark italic font, person name below
- Urgency/offer: diagonal red banner top-right corner "¡OFERTA HOY!" in bold white, price crossed out "antes $99" small, "AHORA $49" large and bright below
- Trust/social proof: horizontal bar bottom of image, semi-transparent dark background, white text "+5.000 clientes satisfechos • Envío gratis • Garantía 30 días" with small icons
- Fitness results: before photo (blurred silhouette) left side, after photo (athletic person) right side, bold arrow between them, "8 SEMANAS" in 3D block letters center

Rules:
- Text in the overlay must be SHORT (4-6 words max per line)
- Describe: exact position, shape of badge/frame, font style, colors, effects (glow, shadow, shine, gradient), icons or emojis
- Make it feel real and conversion-focused — like you see on top-performing Meta Ads

Write as a phrase that continues naturally inside an image prompt (it will be appended after the scene description). Example format: "with a bold gold ribbon badge in the top-right corner reading 'RESULTADOS REALES' in white embossed capitals, star icons below, shimmer glow effect". Return only this phrase, 2-3 sentences max.`

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 12_000)
    try {
        const res = await fetch(`${OPENAI_BASE}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.8,
                max_completion_tokens: 250,
            }),
            signal: controller.signal,
        })
        if (!res.ok) return ''
        const data = await res.json()
        return data.choices?.[0]?.message?.content?.trim() || ''
    } catch {
        return ''
    } finally {
        clearTimeout(timeout)
    }
}
