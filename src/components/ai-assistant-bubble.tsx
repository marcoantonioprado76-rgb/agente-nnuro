'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { X, Send, Loader2, Sparkles, Mic, MicOff, Volume2, VolumeX } from 'lucide-react'
import Image from 'next/image'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

const WELCOME_MESSAGE = '¡Hola! 👋 Soy tu asistente inteligente. Puedo ayudarte a configurar tu bot, conectar WhatsApp, crear productos y mucho más. ¿En qué puedo ayudarte?'

const QUICK_ACTIONS = [
  '¿Cómo configuro mi bot?',
  '¿Cómo conecto WhatsApp?',
  '¿Cómo creo un producto?',
  '¿Cómo funciona la suscripción?',
]

export function AIAssistantBubble() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: WELCOME_MESSAGE },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [historyLoaded, setHistoryLoaded] = useState(false)

  // Voice state
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [playingAudioIdx, setPlayingAudioIdx] = useState<number | null>(null)
  const [isSpeaking, setIsSpeaking] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const currentAudioRef = useRef<HTMLAudioElement | null>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [isOpen])

  // Escuchar evento del sidebar
  useEffect(() => {
    const handler = () => setIsOpen(prev => !prev)
    window.addEventListener('toggle-ai-assistant', handler)
    return () => window.removeEventListener('toggle-ai-assistant', handler)
  }, [])

  // Cargar historial persistente al abrir por primera vez
  useEffect(() => {
    if (isOpen && !historyLoaded) {
      loadHistory()
    }
  }, [isOpen, historyLoaded])

  const loadHistory = async () => {
    try {
      const res = await fetch('/api/assistant')
      if (res.ok) {
        const data = await res.json()
        if (data.history && data.history.length > 0) {
          setMessages([
            { role: 'assistant', content: WELCOME_MESSAGE },
            ...data.history,
          ])
        }
      }
    } catch { /* silent */ }
    setHistoryLoaded(true)
  }

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return

    const userMessage: ChatMessage = { role: 'user', content: text.trim() }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text.trim(),
          history: messages,
        }),
      })

      const data = await res.json()
      if (res.ok) {
        setMessages(prev => [
          ...prev,
          { role: 'assistant', content: data.reply },
        ])
      } else {
        const detail = data?.detail || data?.error || 'Error desconocido'
        console.error('[Asistente] Error:', detail)
        setMessages(prev => [
          ...prev,
          { role: 'assistant', content: `⚠️ Error: ${detail}` },
        ])
      }
    } catch {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Error de conexión. Verifica tu internet.' },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(input)
  }

  // ===================== VOICE =====================

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

      // Detectar formato soportado
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : MediaRecorder.isTypeSupported('audio/mp4')
            ? 'audio/mp4'
            : ''

      const options = mimeType ? { mimeType } : undefined
      const mediaRecorder = new MediaRecorder(stream, options)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        const ext = mimeType.includes('mp4') ? 'mp4' : 'webm'
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType })
        await transcribeAndSend(audioBlob, ext)
      }

      mediaRecorder.start(250) // chunks cada 250ms para respuesta más rápida
      setIsRecording(true)
    } catch (err) {
      console.error('Error accediendo al micrófono:', err)
      setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ No se pudo acceder al micrófono. Verifica los permisos del navegador.' }])
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  const transcribeAndSend = async (audioBlob: Blob, ext: string = 'webm') => {
    setIsTranscribing(true)
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('audio', audioBlob, `recording.${ext}`)

      // Endpoint unificado: transcribe + IA + TTS en una sola llamada
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 30000) // 30s timeout

      const res = await fetch('/api/assistant/voice', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      })
      clearTimeout(timeout)

      const data = await res.json()

      if (res.ok) {
        // Mostrar texto del usuario transcrito
        if (data.transcription) {
          setMessages(prev => [...prev, { role: 'user', content: data.transcription }])
        }

        // Mostrar respuesta de texto inmediatamente
        if (data.reply) {
          setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
        }

        // Reproducir audio de respuesta automáticamente
        if (data.audio) {
          try {
            const audioBytes = Uint8Array.from(atob(data.audio), c => c.charCodeAt(0))
            const blob = new Blob([audioBytes], { type: 'audio/mpeg' })
            const url = URL.createObjectURL(blob)
            const audio = new Audio(url)
            currentAudioRef.current = audio
            setIsSpeaking(true)

            audio.onended = () => {
              setIsSpeaking(false)
              URL.revokeObjectURL(url)
              currentAudioRef.current = null
            }
            audio.onerror = () => {
              setIsSpeaking(false)
              URL.revokeObjectURL(url)
              currentAudioRef.current = null
            }
            await audio.play()
          } catch {
            setIsSpeaking(false)
          }
        }
      } else {
        const detail = data?.detail || data?.error || 'Error desconocido'
        setMessages(prev => [...prev, { role: 'assistant', content: `⚠️ Error: ${detail}` }])
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ La respuesta tardó demasiado. Intenta de nuevo.' }])
      } else {
        console.error('Error en flujo de voz:', err)
        setMessages(prev => [...prev, { role: 'assistant', content: 'Error de conexión.' }])
      }
    } finally {
      setIsTranscribing(false)
      setLoading(false)
    }
  }

  const playAudio = async (text: string, idx: number) => {
    // Si ya está reproduciendo este, parar
    if (playingAudioIdx === idx) {
      currentAudioRef.current?.pause()
      currentAudioRef.current = null
      setPlayingAudioIdx(null)
      setIsSpeaking(false)
      return
    }

    // Parar audio anterior si existe
    if (currentAudioRef.current) {
      currentAudioRef.current.pause()
      currentAudioRef.current = null
    }

    setPlayingAudioIdx(idx)
    setIsSpeaking(true)

    try {
      const res = await fetch('/api/assistant/speech', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })

      if (res.ok) {
        const audioBlob = await res.blob()
        const audioUrl = URL.createObjectURL(audioBlob)
        const audio = new Audio(audioUrl)
        currentAudioRef.current = audio

        audio.onended = () => {
          setPlayingAudioIdx(null)
          setIsSpeaking(false)
          URL.revokeObjectURL(audioUrl)
          currentAudioRef.current = null
        }

        audio.onerror = () => {
          setPlayingAudioIdx(null)
          setIsSpeaking(false)
          URL.revokeObjectURL(audioUrl)
          currentAudioRef.current = null
        }

        await audio.play()
      }
    } catch {
      setPlayingAudioIdx(null)
      setIsSpeaking(false)
    }
  }

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause()
        currentAudioRef.current = null
      }
    }
  }, [])

  return (
    <div
      className={`fixed bottom-20 lg:bottom-6 left-3 right-3 lg:left-[270px] lg:right-auto z-[60] lg:w-[390px] max-h-[70vh] lg:max-h-[580px] flex flex-col rounded-2xl border border-purple-500/20 bg-[oklch(0.11_0.02_270)] shadow-2xl shadow-purple-900/30 transition-all duration-300 ${
        isOpen
          ? 'opacity-100 translate-y-0 scale-100'
          : 'opacity-0 translate-y-4 scale-95 pointer-events-none'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-purple-500/15 bg-gradient-to-r from-purple-900/30 via-blue-900/20 to-cyan-900/20 rounded-t-2xl">
        <div className="flex items-center gap-3">
          <div className="relative w-9 h-9 rounded-full overflow-hidden ring-2 ring-purple-500/30">
            <Image
              src="/images/ai-bubble.png"
              alt="Asistente IA"
              fill
              className="object-cover"
              sizes="36px"
            />
            <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/20 to-transparent" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-1.5">
              Asistente IA
              <Sparkles className="h-3.5 w-3.5 text-purple-400" />
            </h3>
            <p className="text-[10px] text-purple-300/70">
              {isSpeaking ? 'Hablando...' : isRecording ? 'Escuchando...' : 'Texto y voz'}
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[300px] max-h-[400px]">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[85%] group relative`}>
              <div
                className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-br-md'
                    : 'bg-[oklch(0.16_0.025_270)] text-gray-200 border border-purple-500/10 rounded-bl-md'
                }`}
              >
                {msg.content}
              </div>
              {/* Botón de reproducir audio en mensajes del asistente */}
              {msg.role === 'assistant' && i > 0 && (
                <button
                  onClick={() => playAudio(msg.content, i)}
                  className="absolute -right-1 -bottom-1 p-1 rounded-full bg-[oklch(0.14_0.02_270)] border border-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-purple-500/20"
                  title={playingAudioIdx === i ? 'Detener' : 'Escuchar'}
                >
                  {playingAudioIdx === i ? (
                    <VolumeX className="h-3 w-3 text-purple-400" />
                  ) : (
                    <Volume2 className="h-3 w-3 text-purple-400" />
                  )}
                </button>
              )}
            </div>
          </div>
        ))}

        {(loading || isTranscribing) && (
          <div className="flex justify-start">
            <div className="bg-[oklch(0.16_0.025_270)] border border-purple-500/10 px-4 py-3 rounded-2xl rounded-bl-md">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                {isTranscribing && (
                  <span className="text-[10px] text-purple-300/60 ml-1">Transcribiendo...</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        {messages.length === 1 && !loading && (
          <div className="space-y-2 pt-2">
            <p className="text-[11px] text-muted-foreground/60 uppercase tracking-wider font-medium">Preguntas frecuentes</p>
            {QUICK_ACTIONS.map((action, i) => (
              <button
                key={i}
                onClick={() => sendMessage(action)}
                className="w-full text-left px-3 py-2 rounded-xl bg-purple-500/5 border border-purple-500/10 text-sm text-purple-300 hover:bg-purple-500/15 hover:border-purple-500/25 transition-all duration-200"
              >
                {action}
              </button>
            ))}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-purple-500/10">
        <div className="flex items-center gap-2 bg-[oklch(0.14_0.02_270)] rounded-xl px-3 py-1.5 border border-purple-500/10 focus-within:border-purple-500/30 transition-colors">
          {/* Micrófono */}
          <button
            type="button"
            onClick={isRecording ? stopRecording : startRecording}
            disabled={loading || isTranscribing}
            className={`p-1.5 rounded-lg transition-all ${
              isRecording
                ? 'bg-red-500/20 text-red-400 animate-pulse'
                : 'text-muted-foreground/60 hover:text-purple-400 hover:bg-purple-500/10'
            } disabled:opacity-30`}
            title={isRecording ? 'Detener grabación' : 'Grabar audio'}
          >
            {isRecording ? (
              <MicOff className="h-4 w-4" />
            ) : (
              <Mic className="h-4 w-4" />
            )}
          </button>

          {/* Input de texto */}
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isRecording ? 'Grabando...' : 'Escribe o habla...'}
            disabled={loading || isRecording || isTranscribing}
            className="flex-1 bg-transparent text-sm text-white placeholder:text-muted-foreground/50 outline-none py-1.5"
          />

          {/* Enviar */}
          <button
            type="submit"
            disabled={!input.trim() || loading || isRecording}
            className="p-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 text-white disabled:opacity-30 hover:from-purple-500 hover:to-blue-500 transition-all"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Recording indicator */}
        {isRecording && (
          <div className="flex items-center justify-center gap-2 mt-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-[11px] text-red-400">Grabando... toca el micrófono para enviar</span>
          </div>
        )}
      </form>
    </div>
  )
}
