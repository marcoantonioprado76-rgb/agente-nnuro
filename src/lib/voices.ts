/**
 * Catálogo de voces para las notas de voz de los bots (ElevenLabs).
 *
 * SIN secretos — este módulo lo importan tanto el cliente (selector en la UI)
 * como el servidor (motor TTS). La API key vive solo en el servidor (tts.ts).
 *
 * Los voice_id corresponden a voces nativas en español YA guardadas en la
 * cuenta de ElevenLabs de la plataforma.
 */

export interface BotVoice {
  id: string
  name: string
  desc: string
  gender: 'female' | 'male'
  provider?: 'elevenlabs' | 'fish' // por defecto elevenlabs
}

export const BOT_VOICES: BotVoice[] = [
  { id: 'OvtO9gsCwLixPcLCwlEK', name: 'Paola',     desc: 'Argentina · segura · anuncios',      gender: 'female' },
  { id: 'z24CeWYH9yhrPKMBKU69', name: 'Carolina',  desc: 'Latina · profesional · formal',      gender: 'female' },
  { id: 'VP1iqtlANFWQMax9Iw8M', name: 'Kizzy',     desc: 'Latina · cálida · cercana',          gender: 'female' },
  { id: 'M8loDRgNKB2tSjz2DSyo', name: 'Fran',      desc: 'Latino · joven · profesional',       gender: 'male'   },
  { id: '2lXqHPvvYzPdMCli0szc', name: 'Cruz',      desc: 'Latino · casual · conversacional',   gender: 'male'   },
  { id: 'UxEeTOXgTgyv54iyYaa5', name: 'Alexander', desc: 'Colombiano · seguro · cierre',       gender: 'male'   },
  { id: 'd5d68ca3fef749038fb1a9bc9f32b9e2', name: 'Jarvis', desc: 'Fish Audio · voz clonada (más barata)', gender: 'male', provider: 'fish' },
]

export const DEFAULT_VOICE_ID = 'M8loDRgNKB2tSjz2DSyo' // Fran

/** Modos: cuándo responde con voz el bot. */
export type VoiceMode = 'off' | 'audio_in' | 'always'
export const VOICE_MODES: Array<{ id: VoiceMode; label: string; desc: string }> = [
  { id: 'off',      label: 'Desactivada',           desc: 'El bot responde solo con texto (como hoy).' },
  { id: 'audio_in', label: 'Solo si mandan audio',  desc: 'Si el cliente envía una nota de voz, el bot responde con voz. Recomendado.' },
  { id: 'always',   label: 'Siempre con voz',       desc: 'El bot responde siempre con nota de voz además del texto.' },
]

/** Devuelve una voz válida del catálogo a partir de un id (o la voz por defecto). */
export function resolveVoice(id?: string | null): BotVoice {
  return BOT_VOICES.find(v => v.id === id) ?? BOT_VOICES.find(v => v.id === DEFAULT_VOICE_ID) ?? BOT_VOICES[0]
}
