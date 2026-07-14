/**
 * Diamond Assistant — Respuesta con VOZ (nota de voz).
 *
 * Reutiliza el kit existente de los bots de venta:
 *   - `shouldSpeak` (modos off | audio_in | always)  → @/lib/voice-reply
 *   - `synthesizeVoiceNote` (ElevenLabs → OGG/Opus)   → @/lib/tts
 *   - `uploadVoiceNote` (sube a S3, devuelve URL)      → @/lib/tts
 *
 * `buildVoiceReply` decide si toca hablar y, si sí, genera + sube la nota de voz
 * y devuelve su URL (o null). El envío por el canal (Baileys/YCloud) lo hace el
 * llamador. NUNCA lanza.
 */

import { spawn } from 'node:child_process'
import { shouldSpeak, type VoiceConfig } from '@/lib/voice-reply'
import { synthesizeVoiceNote, uploadVoiceNote, cleanForSpeech } from '@/lib/tts'

export type { VoiceConfig }

/**
 * Re-codifica el OGG a formato de NOTA DE VOZ de WhatsApp: Opus MONO en modo
 * `application=voip`. WhatsApp renderiza como nota de voz (micrófono + ondas) solo
 * el Opus "voip"; el de ElevenLabs viene como "audio" (música) → se ve como archivo.
 * Si ffmpeg falla, devuelve el original (nunca rompe).
 */
function reencodeAsVoiceNote(input: Buffer): Promise<Buffer> {
  return new Promise((resolve) => {
    try {
      const ff = spawn(
        'ffmpeg',
        ['-hide_banner', '-loglevel', 'error', '-i', 'pipe:0',
          '-c:a', 'libopus', '-ac', '1', '-ar', '48000', '-b:a', '32k', '-application', 'voip',
          '-f', 'ogg', 'pipe:1'],
        { stdio: ['pipe', 'pipe', 'ignore'] },
      )
      const chunks: Buffer[] = []
      ff.stdout.on('data', (c: Buffer) => chunks.push(c))
      ff.on('error', () => resolve(input))
      ff.on('close', (code) => {
        const out = Buffer.concat(chunks)
        resolve(code === 0 && out.length > 64 && out.toString('ascii', 0, 4) === 'OggS' ? out : input)
      })
      ff.stdin.on('error', () => { /* noop */ })
      ff.stdin.write(input)
      ff.stdin.end()
    } catch {
      resolve(input)
    }
  })
}

/**
 * Quita las etiquetas de emoción del modelo eleven_v3 ([warmly], [giggles], [laughs]…)
 * del texto. Se usan SOLO para generar la voz (ahí suenan); en el mensaje de TEXTO no
 * deben aparecer. Seguro para agentes que no usan etiquetas (no hay nada que quitar).
 */
export function stripEmotionTags(text: string): string {
  return (text || '').replace(/\[[a-zA-Z]{2,20}\]/g, '').replace(/[ \t]{2,}/g, ' ').replace(/ +\n/g, '\n').trim()
}

/**
 * Transcribe un audio (URL de YCloud o Blob de Baileys) con REINTENTOS. Whisper a
 * veces devuelve 503/errores temporales; reintentamos con espera creciente.
 * Devuelve el texto transcrito, o '' si no se pudo (nunca lanza).
 */
export async function transcribeWithRetry(
  source: string | Blob,
  apiKey: string,
  attempts = 3,
): Promise<string> {
  const { transcribeAudio } = await import('@/lib/openai')
  let lastErr: unknown
  for (let i = 0; i < attempts; i++) {
    try {
      const t = ((await transcribeAudio(source, apiKey)) || '').trim()
      if (t) return t
    } catch (err) {
      lastErr = err
      console.warn(`[DIAMOND voice] transcripción intento ${i + 1}/${attempts}:`, (err as { message?: string })?.message)
    }
    if (i < attempts - 1) await new Promise((r) => setTimeout(r, 900 * (i + 1)))
  }
  if (lastErr) console.error('[DIAMOND voice] transcripción falló tras reintentos:', (lastErr as { message?: string })?.message)
  return ''
}

/**
 * Si corresponde responder con voz (según config del agente y si el cliente
 * mandó audio), genera y sube la nota de voz. Devuelve la URL pública o null.
 */
export async function buildVoiceReply(
  cfg: VoiceConfig,
  text: string,
  customerSentAudio: boolean,
  tenantId: string,
): Promise<string | null> {
  try {
    const speak = shouldSpeak(cfg, customerSentAudio)
    console.log(
      `[DIAMOND voice] decisión=${speak} (enabled=${cfg.voiceEnabled}, modo=${cfg.voiceMode}, cliente_mandó_audio=${customerSentAudio})`,
    )
    if (!speak) return null
    const clean = cleanForSpeech(text || '')
    if (!clean.trim()) return null
    const ogg = await synthesizeVoiceNote(clean, cfg.voiceId)
    if (!ogg) {
      console.warn('[DIAMOND voice] synthesizeVoiceNote devolvió null (revisar ElevenLabs).')
      return null
    }
    // Se envía el OGG/Opus original de ElevenLabs (así se reproduce bien por YCloud).
    const url = await uploadVoiceNote(ogg, tenantId)
    if (!url) {
      console.warn('[DIAMOND voice] uploadVoiceNote devolvió null (revisar S3).')
      return null
    }
    console.log(`[DIAMOND voice] 🎙️ nota de voz lista (${ogg.length} bytes): ${url}`)
    return url
  } catch (err) {
    console.error('[DIAMOND voice] buildVoiceReply error:', err)
    return null
  }
}
