/**
 * TTS de voz para los bots — ElevenLabs → nota de voz OGG/Opus (formato nativo de
 * WhatsApp, sin ffmpeg). Server-only (usa la API key de la plataforma).
 *
 * DISEÑO A PRUEBA DE FALLOS: cualquier problema (sin key, error de red, voz inválida)
 * devuelve null y el motor simplemente NO manda voz → el texto se envía igual. La voz
 * nunca debe romper el flujo de mensajes existente.
 */

import { resolveVoice } from './voices'

const ELEVEN_BASE = 'https://api.elevenlabs.io/v1'
const ELEVEN_MODEL = process.env.ELEVENLABS_MODEL || 'eleven_multilingual_v2'
const FISH_BASE = 'https://api.fish.audio/v1'
const FISH_MODEL = process.env.FISH_MODEL || 's1'
// Límite de caracteres por nota de voz — controla costo y duración.
const MAX_TTS_CHARS = 700

/** Limpia el texto para que se escuche natural (sin markdown, sin emojis, sin URLs). */
export function cleanForSpeech(text: string): string {
  return (text || '')
    .replace(/https?:\/\/\S+/g, '')                                   // URLs
    .replace(/[*_`#>~|]/g, '')                                        // markdown
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}️]/gu, '') // emojis
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, MAX_TTS_CHARS)
}

/** ¿Está configurada la voz a nivel plataforma? (ElevenLabs o Fish Audio) */
export function ttsConfigured(): boolean {
  return !!process.env.ELEVENLABS_API_KEY || !!process.env.FISH_API_KEY
}

/**
 * Fish Audio TTS — alternativa más barata a ElevenLabs.
 * `format`: 'opus' (OGG/Opus para WhatsApp) o 'mp3' (preview en navegador).
 * Devuelve null si falla (nunca lanza) → el bot cae a texto.
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
      body: JSON.stringify({ text: clean, reference_id: referenceId, format }),
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
  const timeout = setTimeout(() => controller.abort(), 30_000)
  try {
    const res = await fetch(
      `${ELEVEN_BASE}/text-to-speech/${voice.id}?output_format=opus_48000_64`,
      {
        method: 'POST',
        headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({ text: clean, model_id: ELEVEN_MODEL }),
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
        body: JSON.stringify({ text: clean, model_id: ELEVEN_MODEL }),
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
 * Necesario para los canales que envían audio por URL (YCloud / WhatsApp Cloud / Meta).
 * @returns URL pública o null si falla (nunca lanza).
 */
export async function uploadVoiceNote(buffer: Buffer, tenantId: string): Promise<string | null> {
  try {
    const { createServiceRoleClient } = await import('./supabase/server')
    const service = await createServiceRoleClient()
    const fileName = `${tenantId || 'bot'}/voice/${Date.now()}-${Math.floor(performance.now())}.ogg`
    const { error } = await service.storage
      .from('media')
      .upload(fileName, buffer, { contentType: 'audio/ogg', upsert: false })
    if (error) {
      console.error('[TTS] error subiendo voz:', error.message)
      return null
    }
    const { data } = service.storage.from('media').getPublicUrl(fileName)
    return data.publicUrl || null
  } catch (err) {
    console.error('[TTS] excepción subiendo voz:', err instanceof Error ? err.message : err)
    return null
  }
}
