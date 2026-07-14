'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import Link from 'next/link'
import {
  Settings,
  QrCode,
  Loader2,
  AlertTriangle,
  ShieldAlert,
  Power,
  PlugZap,
  Unplug,
  Smartphone,
  CheckCircle2,
  RefreshCw,
  KeyRound,
  ExternalLink,
  Cloud,
  Webhook,
  Copy,
  Check,
  Users,
} from 'lucide-react'
import { PageHeader, cardStyle, BRAND, BORDER, MUTED } from '../_ui'

// ── Tipos ──────────────────────────────────────────────────────────
type Provider = 'BAILEYS' | 'YCLOUD' | 'META'

interface Agent {
  id: string
  name: string
  isActive: boolean
  provider: Provider
  hasProviderKey: boolean
  providerSender: string | null
  webhookToken: string | null
}

/** Fila cruda tal como llega del endpoint /agents. */
interface AgentApiRow {
  id: string
  name: string
  isActive: boolean
  provider?: Provider
  hasProviderKey?: boolean
  providerSender?: string | null
  webhookToken?: string | null
}

const PROVIDER_LABEL: Record<Provider, string> = {
  BAILEYS: 'Baileys (QR)',
  YCLOUD: 'YCloud',
  META: 'Meta · WhatsApp Cloud API',
}

type ConnStatus = 'disconnected' | 'connecting' | 'qr_ready' | 'connected'
interface ConnState {
  status: ConnStatus
  qrBase64?: string
  phone?: string
}

const STATUS_META: Record<ConnStatus, { label: string; color: string; tint: string }> = {
  disconnected: { label: 'Desconectado', color: '#9CA3AF', tint: '#F0F3F7' },
  connecting: { label: 'Conectando…', color: '#D97706', tint: 'rgba(217,119,6,0.10)' },
  qr_ready: { label: 'Escanea el QR', color: '#233B8F', tint: 'rgba(35,59,143,0.10)' },
  connected: { label: 'Conectado', color: '#16A34A', tint: 'rgba(22,163,74,0.10)' },
}

const inputStyle: CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 12,
  background: '#F8FAFC',
  border: `1px solid ${BORDER}`,
  fontSize: 13.5,
  color: '#111827',
  outline: 'none',
  cursor: 'pointer',
}
const labelStyle: CSSProperties = {
  display: 'block',
  fontSize: 10.5,
  fontWeight: 800,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: '#9CA3AF',
  marginBottom: 6,
}

/** Normaliza el QR a un data URL usable por <img>. */
function qrToSrc(qr?: string): string | null {
  if (!qr) return null
  return qr.startsWith('data:') ? qr : `data:image/png;base64,${qr}`
}

export default function DiamondAssistantConfiguracion() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [agentId, setAgentId] = useState<string>('')
  const [loadingAgents, setLoadingAgents] = useState(true)
  const [agentsError, setAgentsError] = useState<string | null>(null)

  const [conn, setConn] = useState<ConnState | null>(null)
  const [connError, setConnError] = useState<string | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)

  const [togglingActive, setTogglingActive] = useState(false)

  // Origin del navegador para construir la URL del webhook (evita hydration mismatch en SSR).
  const [origin, setOrigin] = useState<string>('')
  useEffect(() => {
    if (typeof window !== 'undefined') setOrigin(window.location.origin)
  }, [])

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const selectedAgent = agents.find((a) => a.id === agentId) ?? null
  const provider: Provider = selectedAgent?.provider ?? 'BAILEYS'
  const isBaileys = provider === 'BAILEYS'

  // ── Cargar agentes ───────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoadingAgents(true)
      setAgentsError(null)
      try {
        const res = await fetch('/api/admin/diamond-assistant/agents')
        const data = await res.json().catch(() => ({}))
        if (!res.ok || !data.ok) {
          if (!cancelled) setAgentsError(data.error ?? 'No se pudieron cargar los agentes.')
          return
        }
        if (cancelled) return
        const list: Agent[] = (data.data ?? []).map((a: AgentApiRow) => ({
          id: a.id,
          name: a.name,
          isActive: a.isActive,
          provider: a.provider ?? 'BAILEYS',
          hasProviderKey: !!a.hasProviderKey,
          providerSender: a.providerSender ?? null,
          webhookToken: a.webhookToken ?? null,
        }))
        setAgents(list)
        setAgentId((prev) => prev || list[0]?.id || '')
      } catch {
        if (!cancelled) setAgentsError('Error de conexión al cargar los agentes.')
      } finally {
        if (!cancelled) setLoadingAgents(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // ── Estado de conexión ───────────────────────────────────────────
  const refreshStatus = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/admin/diamond-assistant/connection?agentId=${encodeURIComponent(id)}`)
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.ok) {
        setConnError(data.error ?? 'No se pudo obtener el estado.')
        return
      }
      setConnError(null)
      setConn(data.data as ConnState)
    } catch {
      setConnError('Error de conexión al consultar el estado.')
    }
  }, [])

  // Al cambiar de agente: reset + consultar estado.
  // CUALQUIER proveedor puede tener una sesión Baileys por agentId (se usa para grupos),
  // así que consultamos el endpoint siempre (no solo para Baileys).
  useEffect(() => {
    if (!agentId) {
      setConn(null)
      return
    }
    setConn(null)
    setConnError(null)
    refreshStatus(agentId)
  }, [agentId, refreshStatus])

  // Polling cada 2s mientras la sesión está en curso (connecting / qr_ready).
  // Aplica a todos los proveedores: la sesión QR de grupos existe por agentId.
  useEffect(() => {
    const pending = conn?.status === 'connecting' || conn?.status === 'qr_ready'
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
    if (agentId && pending) {
      pollRef.current = setInterval(() => refreshStatus(agentId), 2000)
    }
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    }
  }, [conn?.status, agentId, refreshStatus])

  // ── Acciones ─────────────────────────────────────────────────────
  async function handleConnect() {
    if (!agentId) return
    setConnecting(true)
    setConnError(null)
    try {
      const res = await fetch('/api/admin/diamond-assistant/connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId, forceFresh: true }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.ok) {
        setConnError(data.error ?? 'No se pudo iniciar la conexión.')
        return
      }
      setConn(data.data as ConnState)
    } catch {
      setConnError('Error de conexión al iniciar el QR.')
    } finally {
      setConnecting(false)
    }
  }

  async function handleDisconnect() {
    if (!agentId) return
    setDisconnecting(true)
    setConnError(null)
    try {
      const res = await fetch('/api/admin/diamond-assistant/connection', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.ok) {
        setConnError(data.error ?? 'No se pudo desconectar.')
        return
      }
      setConn(data.data as ConnState)
    } catch {
      setConnError('Error de conexión al desconectar.')
    } finally {
      setDisconnecting(false)
    }
  }

  async function toggleActive() {
    if (!selectedAgent) return
    const next = !selectedAgent.isActive
    setTogglingActive(true)
    try {
      const res = await fetch(`/api/admin/diamond-assistant/agents/${selectedAgent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: next }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.ok) {
        alert(data.error ?? 'No se pudo cambiar el estado del agente.')
        return
      }
      setAgents((prev) => prev.map((a) => (a.id === selectedAgent.id ? { ...a, isActive: next } : a)))
    } catch {
      alert('Error de conexión al activar el agente.')
    } finally {
      setTogglingActive(false)
    }
  }

  return (
    <div>
      <PageHeader
        icon={Settings}
        title="Configuración"
        description="Conecta el número de WhatsApp del agente y actívalo para que responda"
      />

      {/* Selector de agente */}
      <div style={{ ...cardStyle, marginBottom: 16 }}>
        <label style={labelStyle}>Agente</label>
        {loadingAgents ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: MUTED, fontSize: 13 }}>
            <Loader2 size={15} className="animate-spin" /> Cargando agentes…
          </div>
        ) : agentsError ? (
          <ErrorBox message={agentsError} />
        ) : agents.length === 0 ? (
          <p style={{ fontSize: 13, color: MUTED, margin: 0 }}>
            Aún no hay agentes. Crea uno en la sección <strong>Agentes IA</strong>.
          </p>
        ) : (
          <select value={agentId} onChange={(e) => setAgentId(e.target.value)} style={inputStyle}>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
                {a.isActive ? ' · activo' : ' · inactivo'}
              </option>
            ))}
          </select>
        )}
      </div>

      {agentId && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
          {/* ── Tarjeta(s) según proveedor ───────────────────────────── */}
          {isBaileys ? (
            /* BAILEYS: la conexión por QR es su conexión principal. */
            <QrConnectionCard
              title="Conexión de WhatsApp"
              subtitle="Vincula el número escaneando el QR"
              conn={conn}
              connError={connError}
              connecting={connecting}
              disconnecting={disconnecting}
              agentId={agentId}
              onConnect={handleConnect}
              onDisconnect={handleDisconnect}
              onRefresh={refreshStatus}
            />
          ) : (
            /* YCLOUD/META: estado del proveedor (1:1) + webhook + QR dedicado para grupos. */
            <>
              <ProviderConnectionCard
                provider={provider}
                hasProviderKey={selectedAgent?.hasProviderKey ?? false}
                providerSender={selectedAgent?.providerSender ?? null}
              />

              <WebhookCards
                provider={provider}
                origin={origin}
                agentId={agentId}
                webhookToken={selectedAgent?.webhookToken ?? null}
              />

              <QrConnectionCard
                title="Conexión para grupos (WhatsApp por QR)"
                subtitle="Opcional · solo para grupos"
                note="Opcional. Conectá un WhatsApp DEDICADO por QR para que el agente participe en grupos (IA + bienvenida en grupos). Tus mensajes 1:1 siguen por YCloud."
                conn={conn}
                connError={connError}
                connecting={connecting}
                disconnecting={disconnecting}
                agentId={agentId}
                onConnect={handleConnect}
                onDisconnect={handleDisconnect}
                onRefresh={refreshStatus}
              />
            </>
          )}

          {/* ── Tarjeta ACTIVAR AGENTE ───────────────────────────────── */}
          <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  flexShrink: 0,
                  background: selectedAgent?.isActive ? 'rgba(22,163,74,0.12)' : '#F0F3F7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Power size={19} style={{ color: selectedAgent?.isActive ? '#16A34A' : '#9CA3AF' }} />
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <p style={{ fontSize: 15, fontWeight: 800, margin: 0 }}>Activar agente</p>
                <p style={{ fontSize: 11.5, color: MUTED, margin: 0 }}>Interruptor maestro de respuestas</p>
              </div>
            </div>

            {/* Toggle grande */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 14,
                padding: '16px 16px',
                borderRadius: 14,
                background: selectedAgent?.isActive ? 'rgba(22,163,74,0.06)' : '#F8FAFC',
                border: `1px solid ${selectedAgent?.isActive ? 'rgba(22,163,74,0.20)' : BORDER}`,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 800, margin: 0 }}>
                  {selectedAgent?.isActive ? 'Agente ACTIVADO' : 'Agente desactivado'}
                </p>
                <p style={{ fontSize: 12, color: MUTED, margin: '3px 0 0', lineHeight: 1.45 }}>
                  {selectedAgent?.isActive
                    ? 'El agente responde de verdad por WhatsApp.'
                    : 'Mientras esté apagado, no envía ni responde mensajes.'}
                </p>
              </div>
              <button
                onClick={toggleActive}
                disabled={togglingActive || !selectedAgent}
                aria-label="Activar o desactivar el agente"
                style={{
                  position: 'relative',
                  width: 60,
                  height: 32,
                  borderRadius: 999,
                  border: 'none',
                  cursor: togglingActive ? 'default' : 'pointer',
                  flexShrink: 0,
                  background: selectedAgent?.isActive ? '#16A34A' : '#D1D5DB',
                  transition: 'background 0.15s',
                  opacity: togglingActive ? 0.7 : 1,
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    top: 4,
                    left: selectedAgent?.isActive ? 32 : 4,
                    width: 24,
                    height: 24,
                    borderRadius: 999,
                    background: '#fff',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
                    transition: 'left 0.15s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {togglingActive ? (
                    <Loader2 size={13} className="animate-spin" style={{ color: '#6B7280' }} />
                  ) : null}
                </span>
              </button>
            </div>

            {/* Aviso: activado = responde de verdad */}
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 9,
                padding: '11px 13px',
                borderRadius: 12,
                background: 'rgba(217,119,6,0.06)',
                border: '1px solid rgba(217,119,6,0.20)',
              }}
            >
              <AlertTriangle size={15} style={{ color: '#D97706', flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: 12, color: '#92400E', margin: 0, lineHeight: 1.5 }}>
                Con esto <strong>ACTIVADO</strong>, el agente responde de verdad por WhatsApp a las personas y grupos.
                Actívalo solo cuando estés seguro.
              </p>
            </div>

            {/* Aviso de seguridad: número dedicado */}
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 9,
                padding: '11px 13px',
                borderRadius: 12,
                background: 'rgba(220,38,38,0.05)',
                border: '1px solid rgba(220,38,38,0.18)',
              }}
            >
              <ShieldAlert size={15} style={{ color: '#DC2626', flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: 12, color: '#B91C1C', margin: 0, lineHeight: 1.5 }}>
                Usa un número <strong>DEDICADO</strong> para el agente. <strong>No</strong> conectes el número del
                Reto ni tu WhatsApp personal: el bot responde automáticamente y podría escribir en tu nombre.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Auxiliares ─────────────────────────────────────────────────────
function ErrorBox({ message }: { message: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 8,
        background: 'rgba(220,38,38,0.06)',
        border: '1px solid rgba(220,38,38,0.2)',
        borderRadius: 12,
        padding: '10px 12px',
      }}
    >
      <AlertTriangle size={14} style={{ color: '#DC2626', flexShrink: 0, marginTop: 1 }} />
      <p style={{ fontSize: 12, color: '#DC2626', margin: 0, lineHeight: 1.4 }}>{message}</p>
    </div>
  )
}

/**
 * Tarjeta de conexión por QR (Baileys). Reutilizable para cualquier proveedor:
 *  - BAILEYS: es la conexión principal del agente.
 *  - YCLOUD/META: es una conexión DEDICADA solo para grupos (los 1:1 siguen por el proveedor).
 *
 * Toda la lógica (estado `conn`, polling y acciones connect/disconnect/refresh) vive en el
 * componente padre y se pasa por props para no duplicarla.
 */
function QrConnectionCard({
  title,
  subtitle,
  note,
  conn,
  connError,
  connecting,
  disconnecting,
  agentId,
  onConnect,
  onDisconnect,
  onRefresh,
}: {
  title: string
  subtitle: string
  note?: string
  conn: ConnState | null
  connError: string | null
  connecting: boolean
  disconnecting: boolean
  agentId: string
  onConnect: () => void
  onDisconnect: () => void
  onRefresh: (id: string) => void
}) {
  const status = conn?.status ?? 'disconnected'
  const meta = STATUS_META[status]
  const qrSrc = qrToSrc(conn?.qrBase64)
  const isConnected = status === 'connected'
  const busy = connecting || disconnecting

  return (
    <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
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
          <QrCode size={19} className="text-white" />
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{ fontSize: 15, fontWeight: 800, margin: 0 }}>{title}</p>
          <p style={{ fontSize: 11.5, color: MUTED, margin: 0 }}>{subtitle}</p>
        </div>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 10.5,
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            padding: '4px 10px',
            borderRadius: 999,
            color: meta.color,
            background: meta.tint,
          }}
        >
          <span style={{ width: 7, height: 7, borderRadius: 999, background: meta.color }} />
          {meta.label}
        </span>
      </div>

      {/* Nota orientada a grupos (solo YCloud/Meta) */}
      {note && (
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 9,
            padding: '11px 13px',
            borderRadius: 12,
            background: 'rgba(35,59,143,0.05)',
            border: '1px solid rgba(35,59,143,0.18)',
          }}
        >
          <Users size={15} style={{ color: '#233B8F', flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 12, color: '#1E3A8A', margin: 0, lineHeight: 1.5 }}>{note}</p>
        </div>
      )}

      {connError && <ErrorBox message={connError} />}

      {/* Cuerpo según estado */}
      {isConnected ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '16px 14px',
            borderRadius: 14,
            background: 'rgba(22,163,74,0.06)',
            border: '1px solid rgba(22,163,74,0.20)',
          }}
        >
          <CheckCircle2 size={26} style={{ color: '#16A34A', flexShrink: 0 }} />
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 13.5, fontWeight: 800, margin: 0 }}>Número vinculado</p>
            <p style={{ fontSize: 13, color: '#15803D', margin: '2px 0 0', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Smartphone size={13} />
              {conn?.phone ? conn.phone : 'Sesión activa'}
            </p>
          </div>
        </div>
      ) : qrSrc ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <div style={{ padding: 12, borderRadius: 16, background: '#fff', border: `1px solid ${BORDER}`, boxShadow: '0 6px 18px rgba(17,24,39,0.08)' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrSrc} alt="Código QR de WhatsApp" width={220} height={220} style={{ display: 'block', width: 220, height: 220, imageRendering: 'pixelated' }} />
          </div>
          <p style={{ fontSize: 12, color: MUTED, margin: 0, textAlign: 'center', lineHeight: 1.5, maxWidth: 260 }}>
            Abre WhatsApp → <strong>Dispositivos vinculados</strong> → <strong>Vincular un dispositivo</strong> y escanea este código.
          </p>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: '#D97706', fontWeight: 700 }}>
            <Loader2 size={13} className="animate-spin" /> Esperando el escaneo…
          </span>
        </div>
      ) : status === 'connecting' ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '28px 0' }}>
          <Loader2 size={26} className="animate-spin" style={{ color: '#D97706' }} />
          <p style={{ fontSize: 13, color: MUTED, margin: 0 }}>Preparando la sesión y generando el QR…</p>
        </div>
      ) : (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
            padding: '24px 16px',
            textAlign: 'center',
            borderRadius: 14,
            background: '#F8FAFC',
            border: `1px dashed ${BORDER}`,
          }}
        >
          <QrCode size={30} style={{ color: '#B0B7C3' }} />
          <p style={{ fontSize: 13, color: MUTED, margin: 0, lineHeight: 1.5 }}>
            El número no está conectado. Pulsa <strong>Conectar</strong> para generar el código QR.
          </p>
        </div>
      )}

      {/* Botones */}
      <div style={{ display: 'flex', gap: 8 }}>
        {isConnected ? (
          <button onClick={onDisconnect} disabled={busy} style={dangerBtnStyle(busy)}>
            {disconnecting ? <Loader2 size={15} className="animate-spin" /> : <Unplug size={15} />}
            Desconectar
          </button>
        ) : (
          <button onClick={onConnect} disabled={busy} style={primaryBtnStyle(busy)}>
            {connecting ? <Loader2 size={15} className="animate-spin" /> : <PlugZap size={15} />}
            {status === 'disconnected' ? 'Conectar' : 'Reintentar QR'}
          </button>
        )}
        <button
          onClick={() => onRefresh(agentId)}
          disabled={busy}
          title="Actualizar estado"
          style={{
            padding: '11px 13px',
            borderRadius: 12,
            background: '#F4F6FA',
            border: `1px solid ${BORDER}`,
            cursor: busy ? 'default' : 'pointer',
            opacity: busy ? 0.6 : 1,
          }}
        >
          <RefreshCw size={15} style={{ color: '#233B8F' }} />
        </button>
      </div>
    </div>
  )
}

/**
 * Tarjeta de estado para proveedores basados en credenciales (YCloud / Meta).
 * No usa QR ni polling: la credencial se carga al crear/editar el agente.
 */
function ProviderConnectionCard({
  provider,
  hasProviderKey,
  providerSender,
}: {
  provider: Provider
  hasProviderKey: boolean
  providerSender: string | null
}) {
  const label = PROVIDER_LABEL[provider]
  const ok = hasProviderKey

  return (
    <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Cabecera */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
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
          <Cloud size={19} className="text-white" />
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{ fontSize: 15, fontWeight: 800, margin: 0 }}>Conexión de WhatsApp</p>
          <p style={{ fontSize: 11.5, color: MUTED, margin: 0 }}>Proveedor por credenciales · {label}</p>
        </div>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 10.5,
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            padding: '4px 10px',
            borderRadius: 999,
            color: ok ? '#16A34A' : '#D97706',
            background: ok ? 'rgba(22,163,74,0.10)' : 'rgba(217,119,6,0.10)',
          }}
        >
          <span style={{ width: 7, height: 7, borderRadius: 999, background: ok ? '#16A34A' : '#D97706' }} />
          {ok ? 'Configurado' : 'Pendiente'}
        </span>
      </div>

      {/* Estado de la credencial */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '16px 14px',
          borderRadius: 14,
          background: ok ? 'rgba(22,163,74,0.06)' : 'rgba(217,119,6,0.06)',
          border: `1px solid ${ok ? 'rgba(22,163,74,0.20)' : 'rgba(217,119,6,0.22)'}`,
        }}
      >
        {ok ? (
          <CheckCircle2 size={26} style={{ color: '#16A34A', flexShrink: 0 }} />
        ) : (
          <AlertTriangle size={26} style={{ color: '#D97706', flexShrink: 0 }} />
        )}
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: 13.5, fontWeight: 800, margin: 0, color: ok ? '#15803D' : '#92400E' }}>
            {ok ? '✓ Credencial configurada' : '✗ Falta cargar la credencial'}
          </p>
          <p style={{ fontSize: 12.5, color: ok ? '#15803D' : '#92400E', margin: '2px 0 0', lineHeight: 1.45 }}>
            {ok
              ? `${label} está listo para enviar y recibir mensajes.`
              : `Sin la credencial de ${label}, el agente no puede responder.`}
          </p>
        </div>
      </div>

      {/* Remitente / número / ID del proveedor (si existe) */}
      {providerSender && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '11px 13px',
            borderRadius: 12,
            background: '#F8FAFC',
            border: `1px solid ${BORDER}`,
          }}
        >
          <KeyRound size={15} style={{ color: '#233B8F', flexShrink: 0 }} />
          <div style={{ minWidth: 0 }}>
            <p style={{ ...labelStyle, marginBottom: 2 }}>Remitente del proveedor</p>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#111827', margin: 0, wordBreak: 'break-all' }}>
              {providerSender}
            </p>
          </div>
        </div>
      )}

      {/* Aviso: dónde se cargan las credenciales */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 9,
          padding: '11px 13px',
          borderRadius: 12,
          background: 'rgba(35,59,143,0.05)',
          border: '1px solid rgba(35,59,143,0.18)',
        }}
      >
        <Smartphone size={15} style={{ color: '#233B8F', flexShrink: 0, marginTop: 1 }} />
        <p style={{ fontSize: 12, color: '#1E3A8A', margin: 0, lineHeight: 1.5 }}>
          Las credenciales de <strong>{label}</strong> se cargan al crear/editar el agente en la pestaña{' '}
          <Link
            href="/admin/diamond-assistant/agentes"
            style={{ color: '#233B8F', fontWeight: 800, textDecoration: 'underline', display: 'inline-flex', alignItems: 'center', gap: 3 }}
          >
            Agentes
            <ExternalLink size={12} />
          </Link>
          .
        </p>
      </div>
    </div>
  )
}

/** Enmascara el token: primeros 8 + •••••• + últimos 4. */
function maskToken(token: string): string {
  if (token.length <= 12) return '••••••'
  return `${token.slice(0, 8)}••••••${token.slice(-4)}`
}

const codeBoxStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
  background: '#0F1424',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 12,
  padding: '11px 13px',
  color: '#E5E9F0',
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  fontSize: 12,
  lineHeight: 1.5,
  wordBreak: 'break-all',
  boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.35)',
}

/** Botón COPIAR reutilizable: usa el portapapeles y muestra “Copiado ✓” 2s. */
function CopyButton({ value, disabled }: { value: string; disabled?: boolean }) {
  const [copied, setCopied] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  async function handleCopy() {
    if (disabled || !value) return
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => setCopied(false), 2000)
    } catch {
      // Si el navegador bloquea el portapapeles, no rompemos la UI.
    }
  }

  const off = disabled || !value
  return (
    <button
      onClick={handleCopy}
      disabled={off}
      aria-label="Copiar"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 7,
        padding: '10px 14px',
        borderRadius: 12,
        fontSize: 12.5,
        fontWeight: 800,
        whiteSpace: 'nowrap',
        color: copied ? '#16A34A' : '#fff',
        background: copied ? 'rgba(22,163,74,0.12)' : BRAND,
        border: copied ? '1px solid rgba(22,163,74,0.30)' : 'none',
        cursor: off ? 'default' : 'pointer',
        opacity: off ? 0.5 : 1,
        boxShadow: copied ? 'none' : '0 6px 16px rgba(183,53,184,0.22)',
        transition: 'background 0.15s, color 0.15s',
      }}
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
      {copied ? 'Copiado ✓' : 'Copiar'}
    </button>
  )
}

/**
 * Dos tarjetas para proveedores por webhook (YCloud / Meta):
 *  1) URL del Webhook completa (para pegar en el panel de YCloud).
 *  2) Webhook Token secreto (enmascarado, ya incluido en la URL).
 */
function WebhookCards({
  provider,
  origin,
  agentId,
  webhookToken,
}: {
  provider: Provider
  origin: string
  agentId: string
  webhookToken: string | null
}) {
  const label = PROVIDER_LABEL[provider]
  const hasToken = !!webhookToken
  const fullUrl =
    origin && webhookToken
      ? `${origin}/api/webhooks/diamond-assistant/ycloud/${agentId}?token=${webhookToken}`
      : ''

  return (
    <>
      {/* ── Tarjeta URL DEL WEBHOOK ─────────────────────────────────── */}
      <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
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
            <Webhook size={19} className="text-white" />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{ fontSize: 15, fontWeight: 800, margin: 0 }}>URL del Webhook</p>
            <p style={{ fontSize: 11.5, color: MUTED, margin: 0 }}>Mensajes entrantes · {label}</p>
          </div>
        </div>

        <p style={{ fontSize: 12.5, color: '#374151', margin: 0, lineHeight: 1.5 }}>
          Configura esta URL en tu panel de YCloud como <strong>Webhook URL</strong> para mensajes entrantes.
        </p>

        {!origin ? (
          <div style={codeBoxStyle}>Cargando URL…</div>
        ) : !hasToken ? (
          <ErrorBox message="El token del webhook aún no está disponible (generando…). Recarga la página en unos segundos." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={codeBoxStyle}>{fullUrl}</div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <CopyButton value={fullUrl} />
            </div>
          </div>
        )}
      </div>

      {/* ── Tarjeta WEBHOOK TOKEN (secreto) ─────────────────────────── */}
      <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
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
            <KeyRound size={19} className="text-white" />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{ fontSize: 15, fontWeight: 800, margin: 0 }}>Webhook Token (secreto)</p>
            <p style={{ fontSize: 11.5, color: MUTED, margin: 0 }}>Valida el origen del webhook</p>
          </div>
        </div>

        <p style={{ fontSize: 12.5, color: '#374151', margin: 0, lineHeight: 1.5 }}>
          Este token valida que el webhook viene de YCloud. Ya está incluido en la URL de arriba.
        </p>

        {!webhookToken ? (
          <ErrorBox message="Generando token… Recarga la página en unos segundos." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={codeBoxStyle}>{maskToken(webhookToken)}</div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <CopyButton value={webhookToken} />
            </div>
          </div>
        )}
      </div>
    </>
  )
}

function primaryBtnStyle(busy: boolean): CSSProperties {
  return {
    flex: 1,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: '11px 16px',
    borderRadius: 12,
    fontSize: 13.5,
    fontWeight: 800,
    color: '#fff',
    background: BRAND,
    border: 'none',
    cursor: busy ? 'default' : 'pointer',
    opacity: busy ? 0.6 : 1,
    boxShadow: '0 8px 20px rgba(183,53,184,0.24)',
  }
}

function dangerBtnStyle(busy: boolean): CSSProperties {
  return {
    flex: 1,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: '11px 16px',
    borderRadius: 12,
    fontSize: 13.5,
    fontWeight: 800,
    color: '#fff',
    background: '#DC2626',
    border: 'none',
    cursor: busy ? 'default' : 'pointer',
    opacity: busy ? 0.6 : 1,
  }
}
