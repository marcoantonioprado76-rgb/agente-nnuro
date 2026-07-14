export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { transcribeAudio } from '@/lib/ads/openai-ads'
import { resolveAdsKey, logWhisperUsage } from '@/lib/ai-credits'

export async function POST(req: Request) {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Key personal del usuario o créditos globales del admin
    const resolvedKey = await resolveAdsKey(user.id)
    if (!resolvedKey) {
        return NextResponse.json({ error: 'Configura tu OpenAI API Key en Configuración → IA, o activa créditos de IA.' }, { status: 400 })
    }
    const apiKey = resolvedKey.key

    // Parse multipart form
    const formData = await req.formData()
    const file = formData.get('audio') as File | null
    if (!file) return NextResponse.json({ error: 'No se recibió audio' }, { status: 400 })

    const maxSize = 25 * 1024 * 1024 // 25MB (OpenAI Whisper limit)
    if (file.size > maxSize) {
        return NextResponse.json({ error: 'El audio supera el límite de 25MB' }, { status: 400 })
    }

    try {
        const buffer = Buffer.from(await file.arrayBuffer())
        const text = await transcribeAudio(buffer, file.name || 'audio.webm', apiKey, (dur) => {
            if (resolvedKey.isGlobal) logWhisperUsage({ userId: resolvedKey.userId, service: 'ads-brief', durationSec: dur }).catch(() => {})
        })

        if (!text || text.trim().length < 10) {
            return NextResponse.json({ error: 'No se pudo transcribir el audio. Asegúrate de hablar claramente.' }, { status: 422 })
        }

        return NextResponse.json({ text: text.trim() })
    } catch (err: any) {
        console.error('[Transcribe]', err)
        return NextResponse.json({ error: err.message || 'Error al transcribir el audio' }, { status: 500 })
    }
}
