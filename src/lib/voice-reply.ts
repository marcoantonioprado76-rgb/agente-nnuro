/**
 * Lógica compartida de "responder con voz" para los 4 canales (YCloud, Baileys,
 * WhatsApp Cloud, Meta). Mantiene el comportamiento idéntico en todos.
 *
 * Reglas de modo (bot.voice_mode):
 *   - 'off'      → nunca (por defecto; los bots actuales no cambian).
 *   - 'audio_in' → solo si el cliente mandó una nota de voz (modo espejo).
 *   - 'always'   → siempre.
 */

export interface VoiceConfig {
  voice_enabled?: boolean | null
  voice_id?: string | null
  voice_mode?: string | null
}

export interface VoiceResponseLike {
  mensaje1?: string
  mensaje2?: string
  mensaje3?: string
}

/** ¿Debe este bot responder con nota de voz en este turno? */
export function shouldSpeak(bot: VoiceConfig, customerSentAudio: boolean): boolean {
  if (!bot?.voice_enabled) return false
  const mode = (bot.voice_mode as string) || 'off'
  if (mode === 'always') return true
  if (mode === 'audio_in') return customerSentAudio
  return false
}

/** Construye el texto a locutar a partir de la respuesta del bot. */
export function voiceTextFromResponse(r: VoiceResponseLike): string {
  return [r.mensaje1, r.mensaje2, r.mensaje3]
    .map(s => (s || '').trim())
    .filter(Boolean)
    .join('. ')
}
