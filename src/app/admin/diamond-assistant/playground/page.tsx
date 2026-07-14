'use client'

/**
 * Diamond Assistant — Playground (FASE 3)
 *
 * Panel para PROBAR un agente IA chateando con él directamente (sin WhatsApp).
 * Selecciona un agente, escribe mensajes y observa su respuesta + las acciones
 * que ejecutaría (enviar PDF/enlace/media, escalar a un humano).
 *
 * El historial vive en estado local y se manda completo en cada request para
 * que el agente tenga contexto de la conversación.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent, ReactNode } from 'react'
import Link from 'next/link'
import {
  MessagesSquare,
  Send,
  RotateCcw,
  Bot,
  User,
  AlertTriangle,
  KeyRound,
  Loader2,
  Sparkles,
  Plus,
  Cpu,
  ShieldAlert,
} from 'lucide-react'
import { PageHeader, cardStyle, BRAND, BORDER, MUTED } from '../_ui'

// ── Tipos ──────────────────────────────────────────────────────────
interface Agent {
  id: string
  name: string
  model: string
  isActive: boolean
  hasOpenaiKey: boolean
}

/** Acción que el agente ejecutaría (tool-call resuelto por el motor). */
interface AgentAction {
  tool: string
  args?: Record<string, unknown> | null
  result?: unknown
}

/** Resultado de un turno del agente (AgentTurnResult del motor). */
interface TurnResult {
  text: string
  actions?: AgentAction[]
  escalated?: boolean
}

interface ChatMessage {
  role: 'user' | 'bot'
  content: string
  actions?: AgentAction[]
  escalated?: boolean
}

// ── Estilos on-brand ───────────────────────────────────────────────
const inputStyle: CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 12,
  background: '#F8FAFC',
  border: `1px solid ${BORDER}`,
  fontSize: 13.5,
  color: '#111827',
  outline: 'none',
}

const DANGER = '#DC2626'

// ── Helpers de presentación de acciones ────────────────────────────
function str(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() ? v.trim() : undefined
}

function describeAction(action: AgentAction): { icon: string; label: string; danger: boolean } {
  const a = action.args ?? {}
  const r = (action.result ?? {}) as Record<string, unknown>
  // Mejor detalle disponible: título del recurso, caption, url o motivo.
  const detail =
    str(r.title) ?? str(a.title) ?? str(a.caption) ?? str(a.url) ?? str(a.reason)
  const withDetail = (base: string) => (detail ? `${base}: ${detail}` : base)

  switch (action.tool) {
    case 'send_pdf':
      return { icon: '📎', label: withDetail('Enviaría PDF'), danger: false }
    case 'send_link':
      return { icon: '🔗', label: withDetail('Enviaría enlace'), danger: false }
    case 'send_video':
      return { icon: '🎬', label: withDetail('Enviaría video'), danger: false }
    case 'send_image':
      return { icon: '🖼️', label: withDetail('Enviaría imagen'), danger: false }
    case 'send_audio':
      return { icon: '🎧', label: withDetail('Enviaría audio'), danger: false }
    case 'escalate_to_human':
      return { icon: '🚨', label: withDetail('Escalaría a un humano'), danger: true }
    default:
      return { icon: '⚙️', label: withDetail(action.tool || 'Acción'), danger: false }
  }
}

export default function DiamondAssistantPlayground() {
  // Agentes
  const [agents, setAgents] = useState<Agent[]>([])
  const [loadingAgents, setLoadingAgents] = useState(true)
  const [agentsError, setAgentsError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string>('')

  // Chat
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [chatError, setChatError] = useState<string | null>(null)

  const scrollRef = useRef<HTMLDivElement | null>(null)

  const selectedAgent = agents.find((a) => a.id === selectedId) ?? null

  // ── Cargar agentes ───────────────────────────────────────────────
  const fetchAgents = useCallback(async () => {
    setLoadingAgents(true)
    setAgentsError(null)
    try {
      const res = await fetch('/api/admin/diamond-assistant/agents')
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.ok) {
        setAgentsError(data.error ?? 'No se pudieron cargar los agentes.')
        setAgents([])
        return
      }
      const list: Agent[] = data.data ?? []
      setAgents(list)
      // Auto-selección del primero disponible.
      setSelectedId((prev) => (prev && list.some((a) => a.id === prev) ? prev : list[0]?.id ?? ''))
    } catch {
      setAgentsError('Error de conexión al cargar los agentes.')
      setAgents([])
    } finally {
      setLoadingAgents(false)
    }
  }, [])

  useEffect(() => {
    fetchAgents()
  }, [fetchAgents])

  // Auto-scroll al último mensaje / indicador de "escribiendo".
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, sending])

  function resetChat() {
    setMessages([])
    setChatError(null)
    setInput('')
  }

  function onSelectAgent(id: string) {
    if (id === selectedId) return
    setSelectedId(id)
    resetChat()
  }

  // ── Enviar mensaje ───────────────────────────────────────────────
  async function send() {
    const text = input.trim()
    if (!text || sending || !selectedAgent) return
    if (!selectedAgent.hasOpenaiKey) return

    // Historial = turnos previos (el mensaje nuevo va aparte como userMessage).
    const history = messages.map((m) => ({ role: m.role, content: m.content }))

    setMessages((prev) => [...prev, { role: 'user', content: text }])
    setInput('')
    setSending(true)
    setChatError(null)

    try {
      const res = await fetch(`/api/admin/diamond-assistant/agents/${selectedAgent.id}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.ok) {
        setChatError(data.error ?? 'No se pudo generar la respuesta del agente.')
        return
      }
      const result: TurnResult = data.data ?? { text: '' }
      setMessages((prev) => [
        ...prev,
        {
          role: 'bot',
          content: result.text || '(sin respuesta)',
          actions: result.actions ?? [],
          escalated: !!result.escalated,
        },
      ])
    } catch {
      setChatError('Error de conexión al enviar el mensaje.')
    } finally {
      setSending(false)
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  const canChat = !!selectedAgent && selectedAgent.hasOpenaiKey
  const noKey = !!selectedAgent && !selectedAgent.hasOpenaiKey

  return (
    <div>
      <PageHeader
        icon={MessagesSquare}
        title="Playground"
        description="Chatea con tu agente IA para probarlo en vivo, sin WhatsApp"
        action={
          messages.length > 0 ? (
            <button onClick={resetChat} style={ghostBtnStyle}>
              <RotateCcw size={14} /> Reiniciar chat
            </button>
          ) : undefined
        }
      />

      {/* ── Estados de carga / error / vacío de agentes ───────────────── */}
      {loadingAgents ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '64px 0' }}>
          <Loader2 size={24} className="animate-spin" style={{ color: '#B735B8' }} />
        </div>
      ) : agentsError ? (
        <ErrorBlock message={agentsError} />
      ) : agents.length === 0 ? (
        <EmptyAgents />
      ) : (
        <>
          {/* ── Selector de agente ──────────────────────────────────────── */}
          <div style={{ ...cardStyle, marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  flexShrink: 0,
                  background: BRAND,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 8px 18px rgba(183,53,184,0.22)',
                }}
              >
                <Bot size={19} className="text-white" />
              </div>

              <div style={{ flex: 1, minWidth: 200 }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: 10.5,
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: '#9CA3AF',
                    marginBottom: 6,
                  }}
                >
                  Agente a probar
                </label>
                <select
                  value={selectedId}
                  onChange={(e) => onSelectAgent(e.target.value)}
                  style={{ ...inputStyle, cursor: 'pointer', maxWidth: 360 }}
                >
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                      {a.isActive ? '' : ' (inactivo)'}
                    </option>
                  ))}
                </select>
              </div>

              {selectedAgent && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <Chip icon={<Cpu size={12} />} label={selectedAgent.model} color="#233B8F" tint="rgba(35,59,143,0.08)" />
                  {selectedAgent.hasOpenaiKey ? (
                    <Chip icon={<KeyRound size={12} />} label="API key" color="#16A34A" tint="rgba(22,163,74,0.10)" />
                  ) : (
                    <Chip icon={<KeyRound size={12} />} label="Sin API key" color="#B45309" tint="rgba(217,119,6,0.12)" />
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── Aviso: agente sin API key ────────────────────────────────── */}
          {noKey && (
            <div
              style={{
                ...cardStyle,
                display: 'flex',
                alignItems: 'flex-start',
                gap: 11,
                marginBottom: 14,
                background: 'rgba(217,119,6,0.05)',
                borderColor: 'rgba(217,119,6,0.28)',
              }}
            >
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  flexShrink: 0,
                  background: 'rgba(217,119,6,0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <KeyRound size={16} style={{ color: '#B45309' }} />
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 13.5, fontWeight: 800, margin: 0, color: '#92400E' }}>
                  Este agente aún no tiene API key de OpenAI
                </p>
                <p style={{ fontSize: 12.5, color: '#B45309', margin: '4px 0 0', lineHeight: 1.5 }}>
                  Configúrala en{' '}
                  <Link href="/admin/diamond-assistant/agentes" style={{ color: '#92400E', fontWeight: 700 }}>
                    Agentes
                  </Link>{' '}
                  (editar el agente) para poder probarlo aquí en el Playground.
                </p>
              </div>
            </div>
          )}

          {/* ── Ventana de chat ─────────────────────────────────────────── */}
          <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
            {/* Mensajes */}
            <div
              ref={scrollRef}
              style={{
                height: 460,
                overflowY: 'auto',
                padding: 18,
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                background: 'linear-gradient(180deg, rgba(255,45,149,0.03), rgba(35,59,143,0.02))',
              }}
            >
              {messages.length === 0 && !sending ? (
                <div
                  style={{
                    margin: 'auto',
                    textAlign: 'center',
                    maxWidth: 380,
                    padding: 24,
                  }}
                >
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 15,
                      margin: '0 auto 12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'rgba(183,53,184,0.10)',
                    }}
                  >
                    <Sparkles size={24} style={{ color: '#B735B8' }} />
                  </div>
                  <p style={{ fontSize: 14.5, fontWeight: 800, margin: 0 }}>
                    Empieza la conversación
                  </p>
                  <p style={{ fontSize: 12.5, color: MUTED, margin: '6px 0 0', lineHeight: 1.55 }}>
                    Escribe un mensaje como si fueras un cliente y observa cómo responde
                    {selectedAgent ? ` ${selectedAgent.name}` : ' el agente'}, junto con las acciones que ejecutaría.
                  </p>
                </div>
              ) : (
                messages.map((m, i) => <Bubble key={i} message={m} />)
              )}

              {/* Indicador "escribiendo…" */}
              {sending && <TypingBubble />}
            </div>

            {/* Error de chat */}
            {chatError && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 8,
                  padding: '10px 16px',
                  background: 'rgba(220,38,38,0.06)',
                  borderTop: '1px solid rgba(220,38,38,0.2)',
                }}
              >
                <AlertTriangle size={14} style={{ color: DANGER, flexShrink: 0, marginTop: 1 }} />
                <p style={{ fontSize: 12.5, color: DANGER, margin: 0, lineHeight: 1.45 }}>{chatError}</p>
              </div>
            )}

            {/* Barra de entrada */}
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                gap: 10,
                padding: 14,
                borderTop: `1px solid ${BORDER}`,
                background: '#fff',
              }}
            >
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                disabled={!canChat || sending}
                placeholder={
                  canChat
                    ? 'Escribe un mensaje… (Enter para enviar, Shift+Enter para salto de línea)'
                    : 'Selecciona un agente con API key para chatear'
                }
                rows={1}
                style={{
                  ...inputStyle,
                  resize: 'none',
                  maxHeight: 120,
                  lineHeight: 1.5,
                  fontFamily: 'inherit',
                  opacity: canChat ? 1 : 0.6,
                }}
              />
              <button
                onClick={send}
                disabled={!canChat || sending || !input.trim()}
                title="Enviar"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 7,
                  padding: '11px 16px',
                  borderRadius: 12,
                  fontSize: 13.5,
                  fontWeight: 800,
                  color: '#fff',
                  background: BRAND,
                  border: 'none',
                  cursor: !canChat || sending || !input.trim() ? 'not-allowed' : 'pointer',
                  opacity: !canChat || sending || !input.trim() ? 0.5 : 1,
                  boxShadow: '0 8px 20px rgba(183,53,184,0.24)',
                  flexShrink: 0,
                }}
              >
                {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                Enviar
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ── Burbuja de mensaje ─────────────────────────────────────────────
function Bubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user'
  const actions = message.actions ?? []

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isUser ? 'flex-end' : 'flex-start',
        gap: 6,
      }}
    >
      <div style={{ display: 'flex', gap: 8, maxWidth: '82%', flexDirection: isUser ? 'row-reverse' : 'row' }}>
        {/* Avatar */}
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: 10,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: isUser ? '#EEF1F6' : BRAND,
          }}
        >
          {isUser ? <User size={15} style={{ color: '#6B7280' }} /> : <Bot size={15} className="text-white" />}
        </div>

        {/* Contenido */}
        <div
          style={{
            padding: '10px 13px',
            borderRadius: 14,
            fontSize: 13.5,
            lineHeight: 1.55,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            color: isUser ? '#fff' : '#111827',
            background: isUser ? BRAND : '#fff',
            border: isUser
              ? 'none'
              : message.escalated
                ? '1px solid rgba(220,38,38,0.35)'
                : `1px solid ${BORDER}`,
            boxShadow: isUser ? '0 8px 20px rgba(183,53,184,0.20)' : '0 1px 3px rgba(17,24,39,0.05)',
            borderTopRightRadius: isUser ? 4 : 14,
            borderTopLeftRadius: isUser ? 14 : 4,
          }}
        >
          {message.content}
        </div>
      </div>

      {/* Chips de acciones (solo bot) */}
      {!isUser && (actions.length > 0 || message.escalated) && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, paddingLeft: 38, maxWidth: '82%' }}>
          {message.escalated && actions.every((a) => a.tool !== 'escalate_to_human') && (
            <ActionChip icon="🚨" label="Escalaría a un humano" danger />
          )}
          {actions.map((a, i) => {
            const d = describeAction(a)
            return <ActionChip key={i} icon={d.icon} label={d.label} danger={d.danger} />
          })}
        </div>
      )}
    </div>
  )
}

// ── Chip de acción ─────────────────────────────────────────────────
function ActionChip({ icon, label, danger = false }: { icon: string; label: string; danger?: boolean }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 11.5,
        fontWeight: 700,
        padding: '5px 10px',
        borderRadius: 999,
        color: danger ? '#B91C1C' : '#233B8F',
        background: danger ? 'rgba(220,38,38,0.10)' : 'rgba(35,59,143,0.08)',
        border: danger ? '1px solid rgba(220,38,38,0.25)' : '1px solid rgba(35,59,143,0.15)',
      }}
    >
      <span aria-hidden style={{ fontSize: 13 }}>{icon}</span>
      {label}
    </span>
  )
}

// ── Burbuja "escribiendo…" ─────────────────────────────────────────
function TypingBubble() {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <div
        style={{
          width: 30,
          height: 30,
          borderRadius: 10,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: BRAND,
        }}
      >
        <Bot size={15} className="text-white" />
      </div>
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '11px 14px',
          borderRadius: 14,
          borderTopLeftRadius: 4,
          background: '#fff',
          border: `1px solid ${BORDER}`,
          boxShadow: '0 1px 3px rgba(17,24,39,0.05)',
        }}
      >
        <span style={{ display: 'inline-flex', gap: 4 }}>
          {[0, 1, 2].map((n) => (
            <span
              key={n}
              className="animate-bounce"
              style={{
                width: 6,
                height: 6,
                borderRadius: 999,
                background: '#B735B8',
                animationDelay: `${n * 0.15}s`,
              }}
            />
          ))}
        </span>
        <span style={{ fontSize: 12, color: MUTED }}>escribiendo…</span>
      </div>
    </div>
  )
}

// ── Chip informativo del selector ──────────────────────────────────
function Chip({
  icon,
  label,
  color,
  tint,
}: {
  icon: ReactNode
  label: string
  color: string
  tint: string
}) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        fontSize: 11,
        fontWeight: 700,
        padding: '4px 9px',
        borderRadius: 999,
        color,
        background: tint,
      }}
    >
      {icon}
      {label}
    </span>
  )
}

// ── Bloque de error genérico ───────────────────────────────────────
function ErrorBlock({ message }: { message: string }) {
  return (
    <div
      style={{
        ...cardStyle,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        borderColor: 'rgba(220,38,38,0.25)',
        background: 'rgba(220,38,38,0.04)',
      }}
    >
      <AlertTriangle size={16} style={{ color: DANGER }} />
      <p style={{ fontSize: 13, color: DANGER, margin: 0 }}>{message}</p>
    </div>
  )
}

// ── Estado vacío: sin agentes ──────────────────────────────────────
function EmptyAgents() {
  return (
    <div style={{ ...cardStyle, textAlign: 'center', padding: '48px 24px' }}>
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 16,
          margin: '0 auto 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(183,53,184,0.10)',
        }}
      >
        <ShieldAlert size={26} style={{ color: '#B735B8' }} />
      </div>
      <p style={{ fontSize: 15, fontWeight: 800, margin: 0 }}>Todavía no hay agentes para probar</p>
      <p style={{ fontSize: 13, color: MUTED, margin: '6px 0 16px', lineHeight: 1.55 }}>
        Crea tu primer agente IA y dale una personalidad; luego vuelve aquí para chatear con él.
      </p>
      <Link
        href="/admin/diamond-assistant/agentes"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 7,
          padding: '9px 18px',
          borderRadius: 10,
          fontSize: 13,
          fontWeight: 800,
          color: '#fff',
          background: BRAND,
          textDecoration: 'none',
          boxShadow: '0 8px 20px rgba(183,53,184,0.24)',
        }}
      >
        <Plus size={15} /> Crear agente
      </Link>
    </div>
  )
}

// ── Botón fantasma (reiniciar) ─────────────────────────────────────
const ghostBtnStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 7,
  padding: '9px 14px',
  borderRadius: 10,
  fontSize: 13,
  fontWeight: 700,
  color: '#6B7280',
  background: '#F4F6FA',
  border: `1px solid ${BORDER}`,
  cursor: 'pointer',
}
