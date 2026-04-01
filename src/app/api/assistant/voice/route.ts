import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import OpenAI from 'openai'

/**
 * POST: Flujo completo de voz en una sola llamada
 * Recibe audio → transcribe → genera respuesta IA → genera TTS → devuelve todo junto
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

    console.log(`[Voice] Audio recibido: ${audioFile.name}, size: ${audioFile.size}, type: ${audioFile.type}`)

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })

    // 1. Transcribir audio (Whisper)
    // Whisper necesita un File con extensión reconocida
    const arrayBuf = await audioFile.arrayBuffer()
    const buffer = Buffer.from(arrayBuf)
    const ext = audioFile.name?.split('.').pop() || 'webm'
    const whisperFile = new File([buffer], `audio.${ext}`, { type: audioFile.type || 'audio/webm' })

    const transcription = await openai.audio.transcriptions.create({
      model: 'whisper-1',
      file: whisperFile,
      language: 'es',
    })

    console.log(`[Voice] Transcripción: "${transcription.text}"`)

    const userText = transcription.text
    if (!userText?.trim()) {
      return NextResponse.json({ error: 'No se pudo transcribir el audio' }, { status: 400 })
    }

    // 2. Obtener contexto del usuario (simplificado para velocidad)
    const serviceClient = await createServiceRoleClient()
    const { data: profile } = await serviceClient
      .from('profiles')
      .select('full_name, role')
      .eq('id', user.id)
      .single()

    // Historial reciente (últimos 6 para velocidad)
    let history: Array<{ role: string; content: string }> = []
    try {
      const { data } = await serviceClient
        .from('assistant_messages')
        .select('role, content')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(6)
      if (data) history = data.reverse()
    } catch { /* tabla no existe */ }

    // 3. Generar respuesta IA (GPT-4o-mini, max_tokens reducido para rapidez)
    const systemPrompt = `Eres el asistente IA de Agente de Ventas. Responde en español, ultra breve y directo. Máximo 100 caracteres. Como un mensaje corto de WhatsApp. El usuario se llama ${profile?.full_name || 'Usuario'}.`

    const messages: OpenAI.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
    ]
    for (const msg of history) {
      messages.push({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content,
      })
    }
    messages.push({ role: 'user', content: userText })

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.7,
      max_tokens: 100,
    })

    const reply = completion.choices[0]?.message?.content || 'No pude procesar tu pregunta.'

    // 4. Generar TTS en paralelo con guardar historial
    const [speechRes] = await Promise.all([
      openai.audio.speech.create({
        model: 'tts-1',
        voice: 'nova',
        input: reply,
        speed: 1.15,
      }),
      // Guardar historial en paralelo
      (async () => {
        try {
          await serviceClient.from('assistant_messages').insert([
            { user_id: user.id, role: 'user', content: userText },
            { user_id: user.id, role: 'assistant', content: reply },
          ])
        } catch { /* silent */ }
      })(),
    ])

    const audioBuffer = Buffer.from(await speechRes.arrayBuffer())

    // Devolver todo: texto transcrito, respuesta, y audio en base64
    return NextResponse.json({
      transcription: userText,
      reply,
      audio: audioBuffer.toString('base64'),
    })
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error)
    console.error('Error en POST /api/assistant/voice:', errMsg)
    return NextResponse.json(
      { error: 'Error procesando voz', detail: errMsg },
      { status: 500 }
    )
  }
}
