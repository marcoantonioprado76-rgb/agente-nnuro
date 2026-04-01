import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import OpenAI from 'openai'

/**
 * POST: Transcribir audio a texto (Speech-to-Text) con Whisper
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const formData = await request.formData()
    const audioFile = formData.get('audio') as File

    if (!audioFile) {
      return NextResponse.json({ error: 'Audio requerido' }, { status: 400 })
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })

    const transcription = await openai.audio.transcriptions.create({
      model: 'whisper-1',
      file: audioFile,
      language: 'es',
    })

    return NextResponse.json({ text: transcription.text })
  } catch (error) {
    console.error('Error en STT /api/assistant/speech:', error)
    return NextResponse.json(
      { error: 'Error al transcribir audio' },
      { status: 500 }
    )
  }
}

/**
 * PUT: Convertir texto a voz (Text-to-Speech)
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { text } = await request.json()

    if (!text) {
      return NextResponse.json({ error: 'Texto requerido' }, { status: 400 })
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })

    const speech = await openai.audio.speech.create({
      model: 'tts-1',
      voice: 'nova',
      input: text,
      speed: 1.15,
    })

    // Devolver el audio como stream
    const audioBuffer = Buffer.from(await speech.arrayBuffer())

    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.length.toString(),
      },
    })
  } catch (error) {
    console.error('Error en TTS /api/assistant/speech:', error)
    return NextResponse.json(
      { error: 'Error al generar audio' },
      { status: 500 }
    )
  }
}
