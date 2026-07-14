/**
 * Lógica compartida de "responder con voz" para los canales del agente (Baileys,
 * YCloud, Meta). Mantiene el comportamiento idéntico en todos.
 *
 * Reglas de modo (bot.voiceMode):
 *   - 'off'      → nunca (por defecto; los agentes actuales no cambian).
 *   - 'audio_in' → solo si el cliente mandó una nota de voz (modo espejo).
 *   - 'always'   → siempre.
 */

export interface VoiceConfig {
  voiceEnabled?: boolean | null
  voiceId?: string | null
  voiceMode?: string | null
}

export interface VoiceResponseLike {
  mensaje1?: string
  mensaje2?: string
  mensaje3?: string
  mensaje4?: string
}

/** ¿Debe este agente responder con nota de voz en este turno? */
export function shouldSpeak(bot: VoiceConfig, customerSentAudio: boolean): boolean {
  if (!bot?.voiceEnabled) return false
  const mode = (bot.voiceMode as string) || 'off'
  if (mode === 'always') return true
  if (mode === 'audio_in') return customerSentAudio
  return false
}

/** Construye el texto a locutar a partir de la respuesta del agente. */
export function voiceTextFromResponse(r: VoiceResponseLike): string {
  return [r.mensaje1, r.mensaje2, r.mensaje3, r.mensaje4]
    .map(s => (s || '').trim())
    .filter(Boolean)
    .join('. ')
}
