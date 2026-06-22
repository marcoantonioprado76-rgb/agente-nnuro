export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'
import { BOT_VOICES } from '@/lib/voices'
import { synthesizeVoiceNote, ttsConfigured } from '@/lib/tts'

const SAMPLE = '¡Hola! Qué gusto saludarte. Justo hoy tenemos una promoción especial. ¿Quieres que te cuente los detalles?'

/** GET /api/tts/preview?voice=<voiceId> → muestra de audio (OGG) de esa voz. */
export async function GET(request: NextRequest) {
  const session = await getServerSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  if (!ttsConfigured()) return NextResponse.json({ error: 'Voz no configurada en el servidor' }, { status: 503 })

  const voiceId = request.nextUrl.searchParams.get('voice') || ''
  if (!BOT_VOICES.some(v => v.id === voiceId)) {
    return NextResponse.json({ error: 'Voz no válida' }, { status: 400 })
  }

  const ogg = await synthesizeVoiceNote(SAMPLE, voiceId)
  if (!ogg) return NextResponse.json({ error: 'No se pudo generar la muestra' }, { status: 502 })

  return new NextResponse(new Uint8Array(ogg), {
    status: 200,
    headers: {
      'Content-Type': 'audio/ogg',
      'Content-Length': String(ogg.length),
      'Cache-Control': 'private, max-age=86400',
    },
  })
}
