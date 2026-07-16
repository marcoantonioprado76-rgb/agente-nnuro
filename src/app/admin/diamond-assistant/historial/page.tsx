'use client'

import { useCallback, useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import {
  History,
  Loader2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  ArrowDownLeft,
  Inbox,
} from 'lucide-react'
import { PageHeader, BRAND, BORDER, TEXT, MUTED } from '../_ui'

// ── Tipos ──────────────────────────────────────────────────────────
type MsgStatus = 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED' | 'ERROR'

interface LogRow {
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

// ── Mapas de presentación ──────────────────────────────────────────
const STATUS_STYLE: Record<MsgStatus, { label: string; color: string; bg: string; border: string }> = {
  SENT: { label: 'Enviado', color: '#16A34A', bg: 'rgba(22,163,74,0.10)', border: 'rgba(22,163,74,0.25)' },
  DELIVERED: { label: 'Entregado', color: '#233B8F', bg: 'rgba(35,59,143,0.10)', border: 'rgba(35,59,143,0.25)' },
  FAILED: { label: 'Fallido', color: '#DC2626', bg: 'rgba(220,38,38,0.10)', border: 'rgba(220,38,38,0.25)' },
  ERROR: { label: 'Error', color: '#DC2626', bg: 'rgba(220,38,38,0.10)', border: 'rgba(220,38,38,0.25)' },
  PENDING: { label: 'Pendiente', color: '#6B7280', bg: 'rgba(107,114,128,0.10)', border: 'rgba(107,114,128,0.22)' },
}

const MSG_TYPE_LABEL: Record<string, string> = {
  IMAGE: 'Imagen', VIDEO: 'Video', AUDIO: 'Audio', PDF: 'PDF', LINK: 'Enlace', TEXT: 'Texto',
}

const STATUS_CHIPS: Array<{ value: '' | MsgStatus; label: string }> = [
  { value: '', label: 'Todos' },
  { value: 'SENT', label: 'Enviados' },
  { value: 'DELIVERED', label: 'Entregados' },
  { value: 'PENDING', label: 'Pendientes' },
  { value: 'FAILED', label: 'Fallidos' },
  { value: 'ERROR', label: 'Errores' },
]

const thStyle: CSSProperties = {
  textAlign: 'left', padding: '11px 14px', fontSize: 10, fontWeight: 800,
  textTransform: 'uppercase', letterSpacing: '0.08em', color: MUTED, whiteSpace: 'nowrap',
}

const tdStyle: CSSProperties = {
  padding: '11px 14px', fontSize: 13, color: TEXT, verticalAlign: 'middle',
}

function fmtDateTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('es', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function DiamondAssistantHistorial() {
  const [logs, setLogs] = useState<LogRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [statusFilter, setStatusFilter] = useState<'' | MsgStatus>('')

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ page: String(page) })
      if (statusFilter) params.set('status', statusFilter)
      const res = await fetch(`/api/admin/diamond-assistant/logs?${params}`)
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.ok) {
        setError(json?.error ?? 'No se pudo cargar el historial.')
        setLogs([])
        return
      }
      setLogs(json.logs ?? [])
      setTotal(json.total ?? 0)
      setTotalPages(json.pages ?? 1)
    } catch {
      setError('Error de conexión al cargar el historial.')
      setLogs([])
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  return (
    <div className="font-ui" style={{ color: TEXT }}>
      <PageHeader
        icon={History}
        title="Historial"
        description="Registro de mensajes enviados y recibidos por el centro de comunicación"
      />

      {/* ── Filtro por estado (chips) ───────────────────────────────── */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        {STATUS_CHIPS.map((chip) => {
          const active = statusFilter === chip.value
          return (
            <button
              key={chip.value || 'all'}
              onClick={() => { setStatusFilter(chip.value); setPage(1) }}
              style={{
                padding: '7px 14px', borderRadius: 999, fontSize: 12.5, fontWeight: 700,
                cursor: 'pointer', transition: 'all 0.15s',
                color: active ? '#fff' : MUTED,
                background: active ? BRAND : '#F4F6FA',
                border: active ? '1px solid transparent' : `1px solid ${BORDER}`,
                boxShadow: active ? '0 6px 16px rgba(0,229,208,0.22)' : 'none',
              }}
            >
              {chip.label}
            </button>
          )
        })}
      </div>

      {/* ── Tabla ───────────────────────────────────────────────────── */}
      <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 3px rgba(17,24,39,0.04)' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '64px 0' }}>
            <Loader2 size={22} className="animate-spin" style={{ color: '#147e95' }} />
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '56px 16px' }}>
            <AlertTriangle size={26} style={{ color: '#DC2626', margin: '0 auto 10px' }} />
            <p style={{ fontSize: 13, color: '#DC2626', fontWeight: 700, margin: 0 }}>{error}</p>
            <button
              onClick={fetchLogs}
              style={{ marginTop: 12, padding: '7px 14px', borderRadius: 9, fontSize: 12, fontWeight: 700, color: TEXT, background: '#F4F6FA', border: `1px solid ${BORDER}`, cursor: 'pointer' }}
            >
              Reintentar
            </button>
          </div>
        ) : logs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '56px 16px' }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(0,229,208,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <Inbox size={24} style={{ color: '#147e95' }} />
            </div>
            <p style={{ fontSize: 14, fontWeight: 800, margin: 0 }}>
              {statusFilter ? 'Sin resultados' : 'Aún no hay mensajes'}
            </p>
            <p style={{ fontSize: 12.5, color: MUTED, margin: '4px 0 0' }}>
              {statusFilter
                ? 'No hay mensajes con ese estado. Prueba con otro filtro.'
                : 'Cuando el centro envíe o reciba mensajes, aparecerán aquí.'}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}`, background: '#FBFCFE' }}>
                  <th style={thStyle}>Fecha</th>
                  <th style={thStyle}>Teléfono</th>
                  <th style={thStyle}>Tipo</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Dirección</th>
                  <th style={thStyle}>Estado</th>
                  <th style={thStyle}>Error</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const st = STATUS_STYLE[log.status]
                  const isOut = log.direction === 'OUT'
                  return (
                    <tr key={log.id} style={{ borderBottom: `1px solid ${BORDER}` }}>
                      <td style={{ ...tdStyle, color: MUTED, whiteSpace: 'nowrap' }}>{fmtDateTime(log.createdAt)}</td>
                      <td style={{ ...tdStyle, fontFamily: 'ui-monospace, monospace', fontSize: 12.5, whiteSpace: 'nowrap' }}>{log.contactPhone}</td>
                      <td style={tdStyle}>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 999, color: '#147e95', background: 'rgba(0,229,208,0.10)', border: '1px solid rgba(0,229,208,0.20)', whiteSpace: 'nowrap' }}>
                          {MSG_TYPE_LABEL[log.messageType] ?? log.messageType}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        <span
                          title={isOut ? 'Saliente' : 'Entrante'}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 700, color: isOut ? '#233B8F' : '#147e95' }}
                        >
                          {isOut ? <ArrowUpRight size={14} /> : <ArrowDownLeft size={14} />}
                          {isOut ? 'OUT' : 'IN'}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 999, color: st.color, background: st.bg, border: `1px solid ${st.border}`, whiteSpace: 'nowrap' }}>
                          {st.label}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, maxWidth: 280 }}>
                        {log.error ? (
                          <span style={{ display: 'inline-flex', alignItems: 'flex-start', gap: 5, fontSize: 12, color: '#DC2626' }}>
                            <AlertTriangle size={12} style={{ flexShrink: 0, marginTop: 2 }} />
                            <span style={{ lineHeight: 1.4 }}>{log.error}</span>
                          </span>
                        ) : (
                          <span style={{ color: '#9CA3AF' }}>—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Pie: total + paginación ─────────────────────────────────── */}
      {!loading && !error && logs.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginTop: 14 }}>
          <p style={{ fontSize: 12, color: MUTED, margin: 0 }}>
            {total} mensaje{total === 1 ? '' : 's'} en total
          </p>
          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{ padding: 8, borderRadius: 9, background: '#F4F6FA', border: `1px solid ${BORDER}`, cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.4 : 1, display: 'flex' }}
              >
                <ChevronLeft size={15} />
              </button>
              <span style={{ fontSize: 12, color: MUTED }}>Página {page} de {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                style={{ padding: 8, borderRadius: 9, background: '#F4F6FA', border: `1px solid ${BORDER}`, cursor: page === totalPages ? 'not-allowed' : 'pointer', opacity: page === totalPages ? 0.4 : 1, display: 'flex' }}
              >
                <ChevronRight size={15} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
