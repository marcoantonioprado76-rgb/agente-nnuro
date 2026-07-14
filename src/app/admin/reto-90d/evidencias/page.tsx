'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ClipboardCheck, Loader2, X, Check, XCircle, Eye, FileText, ImageIcon } from 'lucide-react'

// ═══════════════════════════════════════════════════════════════════════════
// Reto 90D — Panel admin · Evidencias / entregas (ADMIN-ONLY)
// ═══════════════════════════════════════════════════════════════════════════

const BRAND_GRADIENT = 'linear-gradient(135deg,#FF2D95,#B735B8,#233B8F)'

const SUBNAV = [
  { href: '/admin/reto-90d', label: 'Resumen', exact: true },
  { href: '/admin/reto-90d/tablero', label: 'Tablero' },
  { href: '/admin/reto-90d/tareas', label: 'Tareas' },
  { href: '/admin/reto-90d/usuarios', label: 'Usuarios' },
  { href: '/admin/reto-90d/evidencias', label: 'Evidencias' },
  { href: '/admin/reto-90d/reportes', label: 'Reportes' },
  { href: '/admin/reto-90d/configuracion', label: 'Configuración' },
]

type SubStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'REVIEW' | 'DUPLICATED' | 'NEEDS_CLARIFICATION'

const SUB_STATUS: Record<SubStatus, { label: string; color: string; bg: string }> = {
  APPROVED: { label: 'Aprobado', color: '#16A34A', bg: 'rgba(22,163,74,0.1)' },
  PENDING: { label: 'Pendiente', color: '#D97706', bg: 'rgba(217,119,6,0.1)' },
  REVIEW: { label: 'Revisión', color: '#233B8F', bg: 'rgba(35,59,143,0.1)' },
  REJECTED: { label: 'Rechazado', color: '#DC2626', bg: 'rgba(220,38,38,0.1)' },
  DUPLICATED: { label: 'Duplicado', color: '#6B7280', bg: 'rgba(107,114,128,0.12)' },
  NEEDS_CLARIFICATION: { label: 'Aclaración', color: '#B735B8', bg: 'rgba(183,53,184,0.1)' },
}

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Todos los estados' },
  { value: 'PENDING', label: 'Pendiente' },
  { value: 'APPROVED', label: 'Aprobado' },
  { value: 'REJECTED', label: 'Rechazado' },
  { value: 'REVIEW', label: 'Revisión' },
  { value: 'DUPLICATED', label: 'Duplicado' },
  { value: 'NEEDS_CLARIFICATION', label: 'Aclaración' },
]

interface Challenge {
  id: string
  name: string
  isActive?: boolean
}

interface SubmissionTask {
  id: string
  title: string
  points?: number
}

interface Submission {
  id: string
  fullName: string | null
  phone: string
  taskId: string | null
  task?: SubmissionTask | null
  aiTaskDetected: string | null
  mediaUrl: string | null
  textContent: string | null
  aiConfidence: number | null
  status: string
  pointsEarned: number
  submittedAt: string
}

type ActionKind = 'approve' | 'reject' | 'review'

function extractList<T>(d: unknown, key: string): T[] {
  if (Array.isArray(d)) return d as T[]
  if (d && typeof d === 'object') {
    const obj = d as Record<string, unknown>
    if (Array.isArray(obj[key])) return obj[key] as T[]
    if (Array.isArray(obj.data)) return obj.data as T[]
  }
  return []
}

function extractActiveId(d: unknown, list: Challenge[]): string | null {
  if (d && typeof d === 'object') {
    const obj = d as Record<string, unknown>
    if (typeof obj.activeId === 'string') return obj.activeId
    const active = obj.active
    if (active && typeof active === 'object' && typeof (active as Record<string, unknown>).id === 'string') {
      return (active as Record<string, unknown>).id as string
    }
  }
  const fromList = list.find((c) => c.isActive)
  if (fromList) return fromList.id
  return list[0]?.id ?? null
}

function errMsg(e: unknown): string {
  if (e instanceof Error) return e.message
  return 'Ocurrió un error inesperado'
}

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleString('es', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function confidencePct(conf: number | null): number | null {
  if (conf == null || isNaN(conf)) return null
  return Math.round(conf <= 1 ? conf * 100 : conf)
}

const IMG_EXTS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.heic', '.avif']
function looksLikeImage(url: string): boolean {
  const clean = url.toLowerCase().split('?')[0]
  return IMG_EXTS.some((e) => clean.endsWith(e))
}

// ───────────────────────────────────────────────────────────────────────────

function SubNav() {
  const pathname = usePathname()
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 22, borderBottom: '1px solid #E4E9F0', paddingBottom: 12 }}>
      {SUBNAV.map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            style={{
              padding: '7px 14px',
              borderRadius: 999,
              fontSize: 13,
              fontWeight: 700,
              textDecoration: 'none',
              transition: 'all 0.15s',
              color: active ? '#fff' : '#6B7280',
              background: active ? BRAND_GRADIENT : '#fff',
              border: active ? 'none' : '1px solid #E4E9F0',
            }}
          >
            {item.label}
          </Link>
        )
      })}
    </div>
  )
}

function MediaThumb({ url }: { url: string }) {
  const [broken, setBroken] = useState(false)
  if (!looksLikeImage(url) || broken) {
    return (
      <a href={url} target="_blank" rel="noreferrer"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700, color: '#233B8F', background: 'rgba(35,59,143,0.08)', border: '1px solid rgba(35,59,143,0.18)', textDecoration: 'none' }}>
        <ImageIcon size={12} /> Ver archivo
      </a>
    )
  }
  return (
    <a href={url} target="_blank" rel="noreferrer" style={{ display: 'inline-block' }}>
      <img src={url} alt="evidencia" onError={() => setBroken(true)}
        style={{ width: 46, height: 46, borderRadius: 8, objectFit: 'cover', border: '1px solid #E4E9F0', display: 'block' }} />
    </a>
  )
}

export default function AdminReto90dEvidenciasPage() {
  const [challengeId, setChallengeId] = useState<string | null>(null)
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [actioningId, setActioningId] = useState<string | null>(null)

  // Filters
  const [statusFilter, setStatusFilter] = useState('')
  const [dateFilter, setDateFilter] = useState('')

  // Reason modal (for reject / review)
  const [reasonModal, setReasonModal] = useState<{ id: string; action: Exclude<ActionKind, 'approve'> } | null>(null)
  const [reason, setReason] = useState('')

  async function loadSubmissions(cid: string, status: string, date: string) {
    const params = new URLSearchParams({ challengeId: cid })
    if (status) params.set('status', status)
    if (date) params.set('date', date)
    const r = await fetch(`/api/admin/reto-90d/submissions?${params.toString()}`)
    if (!r.ok) throw new Error('No se pudieron cargar las evidencias')
    const d: unknown = await r.json()
    setSubmissions(extractList<Submission>(d, 'submissions'))
  }

  async function init() {
    setLoading(true)
    setError(null)
    try {
      const r = await fetch('/api/admin/reto-90d/challenges')
      if (!r.ok) throw new Error('No se pudieron cargar los retos')
      const d: unknown = await r.json()
      const list = extractList<Challenge>(d, 'challenges')
      const activeId = extractActiveId(d, list)
      setChallengeId(activeId)
      if (activeId) await loadSubmissions(activeId, statusFilter, dateFilter)
      else setSubmissions([])
    } catch (e) {
      setError(errMsg(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Re-fetch when filters change (once we know the challenge)
  useEffect(() => {
    if (!challengeId) return
    let cancelled = false
    ;(async () => {
      setRefreshing(true)
      setError(null)
      try {
        await loadSubmissions(challengeId, statusFilter, dateFilter)
      } catch (e) {
        if (!cancelled) setError(errMsg(e))
      } finally {
        if (!cancelled) setRefreshing(false)
      }
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, dateFilter])

  async function runAction(id: string, action: ActionKind, actionReason?: string) {
    if (!challengeId) return
    setActioningId(id)
    setError(null)
    try {
      const body: Record<string, unknown> = { action }
      if (actionReason && actionReason.trim()) body.reason = actionReason.trim()
      const r = await fetch(`/api/admin/reto-90d/submissions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!r.ok) throw new Error('No se pudo actualizar la evidencia')
      await loadSubmissions(challengeId, statusFilter, dateFilter)
    } catch (e) {
      setError(errMsg(e))
    } finally {
      setActioningId(null)
    }
  }

  function openReason(id: string, action: Exclude<ActionKind, 'approve'>) {
    setReason('')
    setReasonModal({ id, action })
  }

  async function confirmReason() {
    if (!reasonModal) return
    const { id, action } = reasonModal
    setReasonModal(null)
    await runAction(id, action, reason)
  }

  return (
    <div className="font-ui">
      {/* Header */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: BRAND_GRADIENT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ClipboardCheck size={16} className="text-white" />
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: '#111827', margin: 0 }}>Reto 90D · Evidencias</h1>
        </div>
        <p style={{ fontSize: 13, color: '#6B7280', margin: 0 }}>Revisa, aprueba o rechaza las entregas de los participantes.</p>
      </div>

      <SubNav />

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          style={{ padding: '9px 12px', borderRadius: 10, fontSize: 13, color: '#111827', background: '#fff', border: '1px solid #E4E9F0', outline: 'none', cursor: 'pointer' }}>
          {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 10, fontSize: 13, color: '#111827', background: '#fff', border: '1px solid #E4E9F0', outline: 'none' }} />
        {(statusFilter || dateFilter) && (
          <button onClick={() => { setStatusFilter(''); setDateFilter('') }}
            style={{ padding: '8px 12px', borderRadius: 10, fontSize: 12, fontWeight: 700, color: '#6B7280', background: '#F0F3F7', border: '1px solid #E4E9F0', cursor: 'pointer' }}>
            Limpiar
          </button>
        )}
        {refreshing && <Loader2 size={16} className="animate-spin" style={{ color: '#B735B8' }} />}
        <span style={{ fontSize: 13, color: '#6B7280', marginLeft: 'auto' }}>
          {loading ? '' : `${submissions.length} evidencia${submissions.length !== 1 ? 's' : ''}`}
        </span>
      </div>

      {error && (
        <div style={{ padding: '12px 14px', borderRadius: 12, background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)', color: '#DC2626', fontSize: 13, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '64px 0' }}>
          <Loader2 size={22} className="animate-spin" style={{ color: '#B735B8' }} />
        </div>
      ) : !challengeId ? (
        <div style={{ textAlign: 'center', padding: '56px 16px', color: '#6B7280', fontSize: 14, background: '#fff', borderRadius: 16, border: '1px solid #E4E9F0' }}>
          No hay un reto activo.
        </div>
      ) : submissions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '56px 16px', color: '#6B7280', fontSize: 14, background: '#fff', borderRadius: 16, border: '1px solid #E4E9F0' }}>
          No hay evidencias con estos filtros.
        </div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid #E4E9F0', borderRadius: 16, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 880 }}>
            <thead>
              <tr style={{ textAlign: 'left', color: '#6B7280', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <th style={thStyle}>Usuario</th>
                <th style={thStyle}>Tarea detectada</th>
                <th style={thStyle}>Evidencia</th>
                <th style={{ ...thStyle, width: 140 }}>Confianza IA</th>
                <th style={thStyle}>Estado</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>Puntos</th>
                <th style={thStyle}>Fecha</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((s) => {
                const st = SUB_STATUS[(s.status as SubStatus)] ?? SUB_STATUS.PENDING
                const pct = confidencePct(s.aiConfidence)
                const busy = actioningId === s.id
                const taskTitle = s.task?.title ?? s.aiTaskDetected ?? '—'
                return (
                  <tr key={s.id} style={{ borderTop: '1px solid #EEF1F6', verticalAlign: 'middle' }}>
                    {/* Usuario */}
                    <td style={tdStyle}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: '#111827', margin: '0 0 2px 0' }}>{s.fullName || 'Sin nombre'}</p>
                      <p style={{ fontSize: 11, color: '#6B7280', margin: 0 }}>{s.phone}</p>
                    </td>
                    {/* Tarea */}
                    <td style={tdStyle}>
                      <span style={{ fontSize: 13, color: '#111827' }}>{taskTitle}</span>
                    </td>
                    {/* Evidencia */}
                    <td style={tdStyle}>
                      {s.mediaUrl ? (
                        <MediaThumb url={s.mediaUrl} />
                      ) : s.textContent ? (
                        <span style={{ display: 'inline-flex', alignItems: 'flex-start', gap: 5, fontSize: 12, color: '#6B7280', maxWidth: 200 }}>
                          <FileText size={12} style={{ flexShrink: 0, marginTop: 2 }} />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                            {s.textContent}
                          </span>
                        </span>
                      ) : (
                        <span style={{ fontSize: 12, color: '#9CA3AF' }}>—</span>
                      )}
                    </td>
                    {/* Confianza IA */}
                    <td style={tdStyle}>
                      {pct == null ? (
                        <span style={{ fontSize: 12, color: '#9CA3AF' }}>—</span>
                      ) : (
                        <div style={{ minWidth: 110 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#111827' }}>{pct}%</span>
                          </div>
                          <div style={{ height: 6, borderRadius: 999, background: '#EEF1F6', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${pct}%`, borderRadius: 999, background: BRAND_GRADIENT }} />
                          </div>
                        </div>
                      )}
                    </td>
                    {/* Estado */}
                    <td style={tdStyle}>
                      <span style={{ padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 800, color: st.color, background: st.bg, whiteSpace: 'nowrap' }}>
                        {st.label}
                      </span>
                    </td>
                    {/* Puntos */}
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{s.pointsEarned ?? 0}</span>
                    </td>
                    {/* Fecha */}
                    <td style={tdStyle}>
                      <span style={{ fontSize: 12, color: '#6B7280', whiteSpace: 'nowrap' }}>{formatDateTime(s.submittedAt)}</span>
                    </td>
                    {/* Acciones */}
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button onClick={() => runAction(s.id, 'approve')} disabled={busy} title="Aprobar"
                          style={iconBtn('#16A34A', 'rgba(22,163,74,0.08)', 'rgba(22,163,74,0.2)', busy)}>
                          {busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                        </button>
                        <button onClick={() => openReason(s.id, 'reject')} disabled={busy} title="Rechazar"
                          style={iconBtn('#DC2626', 'rgba(220,38,38,0.08)', 'rgba(220,38,38,0.2)', busy)}>
                          <XCircle size={14} />
                        </button>
                        <button onClick={() => openReason(s.id, 'review')} disabled={busy} title="Enviar a revisión"
                          style={iconBtn('#233B8F', 'rgba(35,59,143,0.08)', 'rgba(35,59,143,0.2)', busy)}>
                          <Eye size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Reason modal */}
      {reasonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(17,24,39,0.45)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setReasonModal(null) }}>
          <div style={{ background: '#fff', border: '1px solid #E4E9F0', borderRadius: 20, padding: 24, width: '100%', maxWidth: 420 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: '#111827', margin: 0 }}>
                {reasonModal.action === 'reject' ? 'Rechazar evidencia' : 'Enviar a revisión'}
              </h3>
              <button onClick={() => setReasonModal(null)} style={{ background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 6 }}>Motivo (opcional)</label>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3}
              placeholder="Explica por qué…"
              style={{ width: '100%', padding: '9px 11px', borderRadius: 10, fontSize: 13, color: '#111827', background: '#F9FAFC', border: '1px solid #E4E9F0', outline: 'none', resize: 'none', boxSizing: 'border-box' }} />
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button onClick={() => setReasonModal(null)}
                style={{ flex: 1, padding: '10px 0', borderRadius: 10, fontSize: 13, fontWeight: 600, background: '#F0F3F7', border: '1px solid #E4E9F0', color: '#6B7280', cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={confirmReason}
                style={{
                  flex: 2, padding: '10px 0', borderRadius: 10, fontSize: 13, fontWeight: 700, border: 'none', color: '#fff', cursor: 'pointer',
                  background: reasonModal.action === 'reject' ? '#DC2626' : '#233B8F',
                }}>
                {reasonModal.action === 'reject' ? 'Rechazar' : 'Enviar a revisión'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const thStyle: React.CSSProperties = { padding: '12px 14px', fontWeight: 700 }
const tdStyle: React.CSSProperties = { padding: '12px 14px' }

function iconBtn(color: string, bg: string, border: string, busy: boolean): React.CSSProperties {
  return {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 9,
    color, background: bg, border: `1px solid ${border}`, cursor: busy ? 'wait' : 'pointer',
  }
}
