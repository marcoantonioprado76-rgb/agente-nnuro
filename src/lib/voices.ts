/**
 * Catálogo de voces para las notas de voz de los agentes (ElevenLabs / Fish).
 *
 * SIN secretos — lo importan tanto el cliente (selector en la UI) como el
 * servidor (motor TTS). La API key vive solo en el servidor (tts.ts).
 */

export interface VoiceSettings {
  stability?: number          // 0-1 · más alto = más calmada/estable; más bajo = más expresiva
  similarity_boost?: number   // 0-1 · fidelidad al clon
  style?: number              // 0-1 · 0 = natural/sin exagerar (evita que "grite")
  use_speaker_boost?: boolean // true sube presencia/volumen; false = más suave
}

export interface BotVoice {
  id: string
  name: string
  desc: string
  gender: 'female' | 'male'
  provider?: 'elevenlabs' | 'fish' // por defecto elevenlabs
  settings?: VoiceSettings         // ajustes ElevenLabs por voz (opcional)
  model?: string                   // modelo ElevenLabs por voz (ej. 'eleven_v3'); si no, el global
  emotionTags?: boolean            // true = soporta etiquetas [warmly]/[giggles]/… (eleven_v3)
}

export const BOT_VOICES: BotVoice[] = [
  // Voz clonada de CAMILA (cuenta de Marco). Modelo eleven_v3 → soporta etiquetas de
  // emoción ([warmly], [giggles], [laughs]…) que suenan de verdad: cariñosa, tierna, con humor.
  { id: 'yCHgEdoyyuQMakRh0PfN', name: 'Camila (clon)', desc: 'Cariñosa · tierna · con humor · v3', gender: 'female',
    model: 'eleven_v3', emotionTags: true,
    settings: { stability: 0.35, similarity_boost: 0.85, style: 0.6, use_speaker_boost: true } },
  // Voz clonada de Lia (cuenta de Marco). eleven_v3 → cariñosa/expresiva con emociones.
  { id: 'tALU97U5aukqPWkdORZU', name: 'Lia (clon)', desc: 'Cariñosa · tierna · con humor · v3', gender: 'female',
    model: 'eleven_v3', emotionTags: true,
    settings: { stability: 0.35, similarity_boost: 0.85, style: 0.6, use_speaker_boost: true } },
  { id: 'OvtO9gsCwLixPcLCwlEK', name: 'Paola',     desc: 'Argentina · segura · anuncios',      gender: 'female' },
  { id: 'z24CeWYH9yhrPKMBKU69', name: 'Carolina',  desc: 'Latina · profesional · formal',      gender: 'female' },
  // Kizzy (voz de CAMILA): ajustada para sonar más HUMANA, tierna y cálida — menos
  // robótica. stability baja = más natural/expresiva; style leve = calidez; boost = presencia.
  { id: 'VP1iqtlANFWQMax9Iw8M', name: 'Kizzy',     desc: 'Latina · cálida · tierna · cercana',  gender: 'female',
    settings: { stability: 0.40, similarity_boost: 0.80, style: 0.15, use_speaker_boost: true } },
  { id: 'M8loDRgNKB2tSjz2DSyo', name: 'Fran',      desc: 'Latino · joven · profesional',       gender: 'male'   },
  { id: '2lXqHPvvYzPdMCli0szc', name: 'Cruz',      desc: 'Latino · casual · conversacional',   gender: 'male'   },
  { id: 'UxEeTOXgTgyv54iyYaa5', name: 'Alexander', desc: 'Colombiano · seguro · cierre',       gender: 'male'   },
  // Clones propios de Marco en ElevenLabs (más fieles/claros que los de Fish, que
  // distorsionaban el acento boliviano y se entendían mal).
  { id: 'yisXnwAIqCXby8Q47Qf5', name: 'Orlando', desc: 'Boliviano · natural · cercano',  gender: 'male',
    settings: { stability: 0.55, similarity_boost: 0.70, style: 0.0, use_speaker_boost: false } },
  { id: 'L9WYNUNoPao3KaRfPpgN', name: 'Yecenia', desc: 'Boliviana · cálida · suave',     gender: 'female',
    settings: { stability: 0.6, similarity_boost: 0.70, style: 0.0, use_speaker_boost: false } },
]

export const DEFAULT_VOICE_ID = 'M8loDRgNKB2tSjz2DSyo' // Fran

/** Modos: cuándo responde con voz el agente. */
export type VoiceMode = 'off' | 'audio_in' | 'always'
export const VOICE_MODES: Array<{ id: VoiceMode; label: string; desc: string }> = [
  { id: 'off',      label: 'Desactivada',           desc: 'El agente responde solo con texto (como hoy).' },
  { id: 'audio_in', label: 'Solo si mandan audio',  desc: 'Si el cliente envía una nota de voz, el agente responde con voz. Recomendado.' },
  { id: 'always',   label: 'Siempre con voz',       desc: 'El agente responde siempre con nota de voz.' },
]

/** Devuelve una voz válida del catálogo a partir de un id (o la voz por defecto). */
export function resolveVoice(id?: string | null): BotVoice {
  return BOT_VOICES.find(v => v.id === id) ?? BOT_VOICES.find(v => v.id === DEFAULT_VOICE_ID) ?? BOT_VOICES[0]
}
