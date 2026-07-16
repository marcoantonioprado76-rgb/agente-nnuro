'use client'

import { useCallback, useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import {
  LayoutDashboard,
  Bot,
  Contact as ContactIcon,
  Users2,
  Megaphone,
  MessageCircle,
  AlertTriangle,
  Activity,
  Loader2,
  RefreshCw,
  ArrowUpRight,
  ArrowDownLeft,
  Inbox,
} from 'lucide-react'
import { PageHeader, MetricCard, cardStyle, ACCENTS, DANGER, BORDER, TEXT, MUTED } from './_ui'

// ── Tipos del payload del dashboard ────────────────────────────────
type MsgStatus = 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED' | 'ERROR'
type CampaignStatus =
  | 'DRAFT' | 'PENDING_APPROVAL' | 'SCHEDULED' | 'SENDING' | 'SENT' | 'FAILED' | 'CANCELLED'

interface RecentLog {
  id: string
  contactPhone: string
  direction: string // IN | OUT
  messageType: string
  content: string | null
  status: MsgStatus
  error: string | null
  campaignId: string | null
  agentId: string | null
  createdAt: string
}

interface DashboardData {
  agents: { total: number; active: number }
  groups: { total: number }
  contacts: { total: number; optIn: number }
  campaigns: { total: number; byStatus: Record<CampaignStatus, number> }
  messagesSent: number
  errors: number
  recent: RecentLog[]
}

// ── Estilos / mapas ────────────────────────────────────────────────
const MSG_STATUS_STYLE: Record<MsgStatus, { label: string; color: string; bg: string; border: string }> = {
  SENT: { label: 'Enviado', color: '#16A34A', bg: 'rgba(22,163,74,0.10)', border: 'rgba(22,163,74,0.25)' },
  DELIVERED: { label: 'Entregado', color: '#233B8F', bg: 'rgba(35,59,143,0.10)', border: 'rgba(35,59,143,0.25)' },
  FAILED: { label: 'Fallido', color: '#DC2626', bg: 'rgba(220,38,38,0.10)', border: 'rgba(220,38,38,0.25)' },
  ERROR: { label: 'Error', color: '#DC2626', bg: 'rgba(220,38,38,0.10)', border: 'rgba(220,38,38,0.25)' },
  PENDING: { label: 'Pendiente', color: '#6B7280', bg: 'rgba(107,114,128,0.10)', border: 'rgba(107,114,128,0.22)' },
}

const CAMPAIGN_STATUS_STYLE: Record<CampaignStatus, { label: string; color: string }> = {
  DRAFT: { label: 'Borrador', color: '#6B7280' },
  PENDING_APPROVAL: { label: 'Por aprobar', color: '#147e95' },
  SCHEDULED: { label: 'Programada', color: '#233B8F' },
  SENDING: { label: 'Enviando', color: '#1fb8bb' },
  SENT: { label: 'Enviada', color: '#16A34A' },
  FAILED: { label: 'Fallida', color: '#DC2626' },
  CANCELLED: { label: 'Cancelada', color: '#9CA3AF' },
}

const CAMPAIGN_STATUS_ORDER: CampaignStatus[] = [
  'DRAFT', 'PENDING_APPROVAL', 'SCHEDULED', 'SENDING', 'SENT', 'FAILED', 'CANCELLED',
]

const MSG_TYPE_LABEL: Record<string, string> = {
  IMAGE: 'Imagen', VIDEO: 'Video', AUDIO: 'Audio', PDF: 'PDF', LINK: 'Enlace', TEXT: 'Texto',
}

const sectionTitle: CSSProperties = {
  fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em',
  color: MUTED, margin: '0 0 12px',
}

function fmtDateTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default function DiamondAssistantDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDashboard = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/diamond-assistant/dashboard')
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.ok) {
        setError(json?.error ?? 'No se pudieron cargar las métricas.')
        setData(null)
        return
      }
      setData(json.data as DashboardData)
    } catch {
      setError('Error de conexión al cargar las métricas.')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDashboard()
  }, [fetchDashboard])

  return (
    <div className="font-ui" style={{ color: TEXT }}>
      <PageHeader
        icon={LayoutDashboard}
        title="Dashboard"
        description="Vista general del centro de comunicación Diamond Assistant"
        action={
          <button
            onClick={fetchDashboard}
            disabled={loading}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 14px',
              borderRadius: 10, fontSize: 12.5, fontWeight: 700, color: TEXT, background: '#F4F6FA',
              border: `1px solid ${BORDER}`, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            Actualizar
          </button>
        }
      />

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '90px 0' }}>
          <Loader2 size={24} className="animate-spin" style={{ color: '#147e95' }} />
        </div>
      ) : error ? (
        <div style={{ ...cardStyle, textAlign: 'center', padding: '48px 16px' }}>
          <AlertTriangle size={26} style={{ color: '#DC2626', margin: '0 auto 10px' }} />
          <p style={{ fontSize: 13, color: '#DC2626', fontWeight: 700, margin: 0 }}>{error}</p>
          <button
            onClick={fetchDashboard}
            style={{ marginTop: 12, padding: '7px 14px', borderRadius: 9, fontSize: 12, fontWeight: 700, color: TEXT, background: '#F4F6FA', border: `1px solid ${BORDER}`, cursor: 'pointer' }}
          >
            Reintentar
          </button>
        </div>
      ) : data ? (
        <>
          {/* ── Métricas ─────────────────────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 14, marginBottom: 20 }}>
            <MetricCard icon={Bot} label={`Agentes · ${data.agents.active} activos`} value={data.agents.total} accent={ACCENTS[2]} />
            <MetricCard icon={ContactIcon} label={`Contactos · ${data.contacts.optIn} opt-in`} value={data.contacts.total} accent={ACCENTS[0]} />
            <MetricCard icon={Users2} label="Grupos" value={data.groups.total} accent={ACCENTS[2]} />
            <MetricCard icon={Megaphone} label="Campañas" value={data.campaigns.total} accent={ACCENTS[1]} />
            <MetricCard icon={MessageCircle} label="Mensajes enviados" value={data.messagesSent} accent={ACCENTS[3]} />
            <MetricCard icon={AlertTriangle} label="Errores" value={data.errors} accent={DANGER} />
          </div>

          {/* ── Campañas por estado + Actividad reciente ─────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 }}>
            {/* Campañas por estado */}
            <div style={cardStyle}>
              <p style={sectionTitle}>Campañas por estado</p>
              {data.campaigns.total === 0 ? (
                <p style={{ fontSize: 13, color: MUTED, margin: 0 }}>Aún no hay campañas registradas.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                  {CAMPAIGN_STATUS_ORDER.map((s) => {
                    const count = data.campaigns.byStatus[s] ?? 0
                    const meta = CAMPAIGN_STATUS_STYLE[s]
                    const pct = data.campaigns.total > 0 ? Math.round((count / data.campaigns.total) * 100) : 0
                    return (
                      <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: meta.color, flexShrink: 0 }} />
                        <span style={{ fontSize: 12.5, fontWeight: 600, color: count > 0 ? TEXT : '#9CA3AF', flex: '0 0 120px' }}>{meta.label}</span>
                        <div style={{ flex: 1, height: 6, borderRadius: 999, background: '#F0F3F7', overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', borderRadius: 999, background: meta.color, opacity: count > 0 ? 0.85 : 0 }} />
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 800, color: count > 0 ? TEXT : '#9CA3AF', minWidth: 24, textAlign: 'right' }}>{count}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Actividad reciente */}
            <div style={cardStyle}>
              <p style={{ ...sectionTitle, display: 'flex', alignItems: 'center', gap: 7 }}>
                <Activity size={13} style={{ color: '#147e95' }} /> Actividad reciente
              </p>
              {data.recent.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '28px 8px' }}>
                  <Inbox size={22} style={{ color: '#9CA3AF', margin: '0 auto 8px' }} />
                  <p style={{ fontSize: 12.5, color: MUTED, margin: 0 }}>Todavía no hay mensajes registrados.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {data.recent.map((log, i) => {
                    const st = MSG_STATUS_STYLE[log.status]
                    const isOut = log.direction === 'OUT'
                    return (
                      <div
                        key={log.id}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0',
                          borderBottom: i < data.recent.length - 1 ? `1px solid ${BORDER}` : 'none',
                        }}
                      >
                        <div style={{ width: 28, height: 28, borderRadius: 8, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: isOut ? 'rgba(35,59,143,0.10)' : 'rgba(0,229,208,0.10)' }}>
                          {isOut ? <ArrowUpRight size={14} style={{ color: '#233B8F' }} /> : <ArrowDownLeft size={14} style={{ color: '#147e95' }} />}
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <p style={{ fontSize: 12.5, fontWeight: 700, margin: 0, fontFamily: 'ui-monospace, monospace', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{log.contactPhone}</p>
                          <p style={{ fontSize: 11.5, color: MUTED, margin: '1px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {log.content?.trim() || MSG_TYPE_LABEL[log.messageType] || log.messageType}
                          </p>
                        </div>
                        <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 999, color: st.color, background: st.bg, border: `1px solid ${st.border}`, whiteSpace: 'nowrap', flexShrink: 0 }}>
                          {st.label}
                        </span>
                        <span style={{ fontSize: 11, color: '#9CA3AF', whiteSpace: 'nowrap', flexShrink: 0 }}>{fmtDateTime(log.createdAt)}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}
