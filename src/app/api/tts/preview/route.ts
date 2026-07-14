export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { BOT_VOICES } from '@/lib/voices'
import { synthesizePreviewMp3, ttsConfigured } from '@/lib/tts'

const SAMPLE = '¡Hola! Qué gusto saludarte. Justo hoy tenemos una promoción especial. ¿Quieres que te cuente los detalles?'

/** GET /api/tts/preview?voice=<voiceId> → muestra de audio (MP3) de esa voz. */
export async function GET(request: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  if (!ttsConfigured()) return NextResponse.json({ error: 'Voz no configurada en el servidor' }, { status: 503 })

  const voiceId = request.nextUrl.searchParams.get('voice') || ''
  if (!BOT_VOICES.some(v => v.id === voiceId)) {
    return NextResponse.json({ error: 'Voz no válida' }, { status: 400 })
  }

  const mp3 = await synthesizePreviewMp3(SAMPLE, voiceId)
  if (!mp3) return NextResponse.json({ error: 'No se pudo generar la muestra' }, { status: 502 })

  return new NextResponse(new Uint8Array(mp3), {
    status: 200,
    headers: {
      'Content-Type': 'audio/mpeg',
      'Content-Length': String(mp3.length),
      'Cache-Control': 'private, max-age=86400',
    },
  })
}
