/**
 * TTS de voz para los agentes — ElevenLabs / Fish → nota de voz OGG/Opus
 * (formato nativo de WhatsApp, sin ffmpeg). Server-only (usa la API key de la plataforma).
 *
 * DISEÑO A PRUEBA DE FALLOS: cualquier problema (sin key, error de red, voz inválida)
 * devuelve null y el agente simplemente NO manda voz → el texto se envía igual. La voz
 * nunca debe romper el flujo de mensajes existente.
 */

import { resolveVoice, BOT_VOICES } from './voices'

const ELEVEN_BASE = 'https://api.elevenlabs.io/v1'
const ELEVEN_MODEL = process.env.ELEVENLABS_MODEL || 'eleven_multilingual_v2'
const FISH_BASE = 'https://api.fish.audio/v1'
const FISH_MODEL = process.env.FISH_MODEL || 's1'
// Límite de caracteres por nota de voz — controla costo y duración. Moderado: las
// respuestas deben ser CORTAS (lo maneja el prompt); esto es solo un tope de seguridad
// que corta en una oración completa (no a mitad de palabra).
const MAX_TTS_CHARS = Number(process.env.MAX_TTS_CHARS) || 1000

// Voseo argentino → tuteo (boliviano) SOLO para lo que se LOCUTA. Que diga "quieres",
// no "querés"; "tú", no "vos". No toca el texto escrito que manda el bot.
// El \b final de JS no funciona tras vocal acentuada (á/é/í), así que usamos un
// lookahead que excluye letras (incl. acentuadas) para cerrar la palabra.
const F = '(?![a-záéíóúñ])'
const VOSEO_TO_TUTEO: Array<[RegExp, string]> = [
  [new RegExp('\\bquerés' + F, 'gi'), 'quieres'], [new RegExp('\\btenés' + F, 'gi'), 'tienes'],
  [new RegExp('\\bpodés' + F, 'gi'), 'puedes'],   [new RegExp('\\bsabés' + F, 'gi'), 'sabes'],
  [new RegExp('\\bhacés' + F, 'gi'), 'haces'],    [new RegExp('\\bvenís' + F, 'gi'), 'vienes'],
  [new RegExp('\\bdecís' + F, 'gi'), 'dices'],    [new RegExp('\\bsos' + F, 'gi'), 'eres'],
  [new RegExp('\\bvos' + F, 'gi'), 'tú'],         [new RegExp('\\bmirá' + F, 'gi'), 'mira'],
  [new RegExp('\\bfijate' + F, 'gi'), 'fíjate'],  [new RegExp('\\bcontame' + F, 'gi'), 'cuéntame'],
  [new RegExp('\\bdecime' + F, 'gi'), 'dime'],    [new RegExp('\\bmandame' + F, 'gi'), 'mándame'],
  [new RegExp('\\bescribime' + F, 'gi'), 'escríbeme'], [new RegExp('\\bllevate' + F, 'gi'), 'llévate'],
  [new RegExp('\\baprovechá' + F, 'gi'), 'aprovecha'], [new RegExp('\\belegí' + F, 'gi'), 'elige'],
  [new RegExp('\\bavisame' + F, 'gi'), 'avísame'],     [new RegExp('\\bllevás' + F, 'gi'), 'llevas'],
]

/**
 * Recorta el texto para la voz SIN cortar a mitad de palabra/oración: si pasa el
 * límite, corta en el último punto/!/? (o espacio) antes del máximo. Así el audio
 * termina en una idea completa en vez de cortarse en seco.
 */
function truncateForSpeech(t: string, max: number): string {
  if (t.length <= max) return t
  const head = t.slice(0, max)
  const lastSentence = Math.max(head.lastIndexOf('. '), head.lastIndexOf('! '), head.lastIndexOf('? '), head.lastIndexOf('\n'))
  if (lastSentence > max * 0.5) return head.slice(0, lastSentence + 1).trim()
  const lastSpace = head.lastIndexOf(' ')
  return (lastSpace > max * 0.5 ? head.slice(0, lastSpace) : head).trim()
}

/** Limpia el texto para que se escuche natural (sin markdown/emojis/URLs, moneda y tuteo). */
export function cleanForSpeech(text: string): string {
  let t = (text || '')
    .replace(/https?:\/\/\S+/g, '')                                   // URLs
    .replace(/[*_`#>~|]/g, '')                                        // markdown
    .replace(/[\uD83C-\uDBFF][\uDC00-\uDFFF]/g, '')                   // emojis (pares surrogate)
    .replace(/[☀-➿←-⇿⬀-⯿️]/g, '')  // símbolos BMP + variation selector
    .replace(/\bBs\b\.?\s*/g, 'bolivianos ')                          // "Bs"/"Bs." → "bolivianos"
  for (const [re, rep] of VOSEO_TO_TUTEO) t = t.replace(re, rep)
  return truncateForSpeech(t.replace(/\s{2,}/g, ' ').trim(), MAX_TTS_CHARS)
}

/** ¿Está configurada la voz a nivel plataforma? (ElevenLabs o Fish Audio) */
export function ttsConfigured(): boolean {
  return !!process.env.ELEVENLABS_API_KEY || !!process.env.FISH_API_KEY
}

/**
 * Fish Audio TTS — alternativa más barata a ElevenLabs.
 * `format`: 'opus' (OGG/Opus para WhatsApp) o 'mp3' (preview en navegador).
 * Devuelve null si falla (nunca lanza) → el agente cae a texto.
 */
async function synthesizeFish(text: string, referenceId: string, format: 'opus' | 'mp3'): Promise<Buffer | null> {
  const apiKey = process.env.FISH_API_KEY
  if (!apiKey) return null
  const clean = cleanForSpeech(text)
  if (!clean) return null

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30_000)
  try {
    const res = await fetch(`${FISH_BASE}/tts`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', model: FISH_MODEL },
      signal: controller.signal,
      body: JSON.stringify({
        text: clean,
        reference_id: referenceId,
        format,
        latency: 'normal',                 // mejor calidad que 'balanced' (default)
        normalize: true,                   // normaliza números/siglas → menos errores
        prosody: { speed: 1.0, volume: 0 },
        temperature: 0.5,                  // más bajo = más fiel al texto, menos "inventos"
        top_p: 0.7,
      }),
    })
    if (!res.ok) {
      console.error(`[TTS Fish] ${res.status}: ${(await res.text()).slice(0, 200)}`)
      return null
    }
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.length < 64) return null
    // Para WhatsApp el opus debe venir en contenedor OGG ("OggS"). Si no, se omite.
    if (format === 'opus' && buf.toString('ascii', 0, 4) !== 'OggS') {
      console.error('[TTS Fish] el opus no vino como OGG/Opus, se omite la voz')
      return null
    }
    return buf
  } catch (err) {
    console.error('[TTS Fish] error:', err instanceof Error ? err.message : err)
    return null
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Genera una nota de voz a partir de texto.
 * @returns Buffer OGG/Opus listo para WhatsApp, o null si no se pudo (nunca lanza).
 */
export async function synthesizeVoiceNote(text: string, voiceId?: string | null): Promise<Buffer | null> {
  const voice = resolveVoice(voiceId)
  if (voice.provider === 'fish') return synthesizeFish(text, voice.id, 'opus')

  const apiKey = process.env.ELEVENLABS_API_KEY
  if (!apiKey) return null
  const clean = cleanForSpeech(text)
  if (!clean) return null

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 45_000) // más margen para textos largos
  try {
    const res = await fetch(
      `${ELEVEN_BASE}/text-to-speech/${voice.id}?output_format=opus_48000_64`,
      {
        method: 'POST',
        headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({ text: clean, model_id: voice.model || ELEVEN_MODEL, ...(voice.settings ? { voice_settings: voice.settings } : {}) }),
      },
    )
    if (!res.ok) {
      console.error(`[TTS] ElevenLabs ${res.status}: ${(await res.text()).slice(0, 200)}`)
      return null
    }
    const buf = Buffer.from(await res.arrayBuffer())
    // Validar que sea OGG (magic bytes "OggS") antes de confiar en él.
    if (buf.length < 64 || buf.toString('ascii', 0, 4) !== 'OggS') {
      console.error('[TTS] respuesta no es OGG/Opus, se omite la voz')
      return null
    }
    return buf
  } catch (err) {
    console.error('[TTS] error generando voz:', err instanceof Error ? err.message : err)
    return null
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * TTS "crudo": voz por ID directo (no del catálogo) y con una API key dada.
 * Usado por el módulo Reto 90D para respetar la key y la voz elegidas en el panel.
 * @returns Buffer OGG/Opus o null (nunca lanza).
 */
export async function synthesizeElevenRaw(
  text: string,
  voiceId: string,
  apiKey: string,
): Promise<Buffer | null> {
  if (!apiKey || !voiceId) return null
  const clean = cleanForSpeech(text)
  if (!clean) return null

  // Si el voiceId está en el catálogo (clones Lia/Camila, etc.), usamos SU modelo
  // (p.ej. eleven_v3) y sus voice_settings para que suene fiel. Si no, modelo global.
  const known = BOT_VOICES.find((v) => v.id === voiceId)
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30_000)
  try {
    const res = await fetch(
      `${ELEVEN_BASE}/text-to-speech/${voiceId}?output_format=opus_48000_64`,
      {
        method: 'POST',
        headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          text: clean,
          model_id: known?.model || ELEVEN_MODEL,
          ...(known?.settings ? { voice_settings: known.settings } : {}),
        }),
      },
    )
    if (!res.ok) {
      console.error(`[TTS/reto] ElevenLabs ${res.status}: ${(await res.text()).slice(0, 200)}`)
      return null
    }
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.length < 64 || buf.toString('ascii', 0, 4) !== 'OggS') {
      console.error('[TTS/reto] respuesta no es OGG/Opus, se omite la voz')
      return null
    }
    return buf
  } catch (err) {
    console.error('[TTS/reto] error generando voz:', err instanceof Error ? err.message : err)
    return null
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Muestra MP3 para REPRODUCIR EN EL NAVEGADOR (preview de voces).
 * Safari no reproduce OGG/Opus, así que el preview usa MP3 (universal). Las notas
 * de voz reales a WhatsApp siguen en OGG/Opus vía synthesizeVoiceNote().
 * @returns Buffer MP3 o null si no se pudo (nunca lanza).
 */
export async function synthesizePreviewMp3(text: string, voiceId?: string | null): Promise<Buffer | null> {
  const voice = resolveVoice(voiceId)
  if (voice.provider === 'fish') return synthesizeFish(text, voice.id, 'mp3')

  const apiKey = process.env.ELEVENLABS_API_KEY
  if (!apiKey) return null
  const clean = cleanForSpeech(text)
  if (!clean) return null

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30_000)
  try {
    const res = await fetch(
      `${ELEVEN_BASE}/text-to-speech/${voice.id}?output_format=mp3_44100_128`,
      {
        method: 'POST',
        headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({ text: clean, model_id: voice.model || ELEVEN_MODEL, ...(voice.settings ? { voice_settings: voice.settings } : {}) }),
      },
    )
    if (!res.ok) {
      console.error(`[TTS preview] ElevenLabs ${res.status}: ${(await res.text()).slice(0, 200)}`)
      return null
    }
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.length < 64) return null
    return buf
  } catch (err) {
    console.error('[TTS preview] error:', err instanceof Error ? err.message : err)
    return null
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Sube la nota de voz a Supabase Storage y devuelve la URL pública.
 * Necesario para los canales que envían audio por URL (YCloud / Meta).
 * @returns URL pública o null si falla (nunca lanza).
 */
export async function uploadVoiceNote(buffer: Buffer, tenantId: string): Promise<string | null> {
  try {
    const { supabaseAdmin } = await import('./supabase')
    const fileName = `${tenantId || 'bot'}/voice/${Date.now()}-${Math.floor(Math.random() * 1e6)}.ogg`
    const { error } = await supabaseAdmin.storage
      .from('uploads')
      .upload(fileName, buffer, { contentType: 'audio/ogg', upsert: false })
    if (error) {
      console.error('[TTS] error subiendo voz:', error.message)
      return null
    }
    const { data } = supabaseAdmin.storage.from('uploads').getPublicUrl(fileName)
    return data.publicUrl || null
  } catch (err) {
    console.error('[TTS] excepción subiendo voz:', err instanceof Error ? err.message : err)
    return null
  }
}
