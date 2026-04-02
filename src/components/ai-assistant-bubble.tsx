'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { X, Send, Loader2, Sparkles } from 'lucide-react'
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

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

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

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    sendMessage(input)
  }

  return (
    <div
      className={`fixed z-[60] flex flex-col rounded-2xl border border-purple-500/20 bg-[oklch(0.11_0.02_270)] shadow-2xl shadow-purple-900/30 transition-all duration-300 bottom-20 left-3 right-3 max-h-[75vh] lg:bottom-6 lg:right-6 lg:left-auto lg:w-[400px] lg:max-h-[600px] ${
        isOpen
          ? 'opacity-100 translate-y-0 scale-100'
          : 'opacity-0 translate-y-4 scale-95 pointer-events-none'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-purple-500/15 bg-gradient-to-r from-purple-900/30 via-indigo-900/20 to-cyan-900/20 rounded-t-2xl">
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
            <p className="text-[10px] text-purple-300/70">En línea</p>
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
            <div className="max-w-[85%]">
              <div
                className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-br-md'
                    : 'bg-[oklch(0.16_0.025_270)] text-gray-200 border border-purple-500/10 rounded-bl-md'
                }`}
              >
                {msg.content}
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-[oklch(0.16_0.025_270)] border border-purple-500/10 px-4 py-3 rounded-2xl rounded-bl-md">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
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
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escribe tu pregunta..."
            disabled={loading}
            className="flex-1 bg-transparent text-sm text-white placeholder:text-muted-foreground/50 outline-none py-1.5"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="p-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 text-white disabled:opacity-30 hover:from-purple-500 hover:to-indigo-500 transition-all"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
