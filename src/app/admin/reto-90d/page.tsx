'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Trophy,
  Users,
  ListChecks,
  Camera,
  AlertTriangle,
  Loader2,
  RefreshCw,
  CalendarDays,
  Medal,
} from 'lucide-react'

// ── Paleta MY DIAMOND ──────────────────────────────────────────────
const BRAND_GRADIENT = 'linear-gradient(135deg,#FF2D95,#B735B8,#233B8F)'
const BORDER = '#E4E9F0'
const TEXT = '#111827'
const MUTED = '#6B7280'

const STATUS_META: Record<string, { label: string; color: string }> = {
  APPROVED: { label: 'Aprobado', color: '#16A34A' },
  PENDING: { label: 'Pendiente', color: '#D97706' },
  REVIEW: { label: 'En revisión', color: '#233B8F' },
  NEEDS_CLARIFICATION: { label: 'Aclaración', color: '#D97706' },
  REJECTED: { label: 'Rechazado', color: '#DC2626' },
  DUPLICATED: { label: 'Duplicado', color: '#6B7280' },
}
const STATUS_ORDER = ['APPROVED', 'PENDING', 'REVIEW', 'NEEDS_CLARIFICATION', 'REJECTED', 'DUPLICATED']

// ── Tipos (según respuesta esperada del endpoint) ──────────────────
interface ChallengeInfo {
  id: string
  name: string
  startDate?: string | null
  endDate?: string | null
  isActive?: boolean
}
interface RankRow {
  phone?: string
  fullName?: string | null
  name?: string | null
  points?: number
  approved?: number
}
interface LaggardRow {
  phone?: string
  fullName?: string | null
  name?: string | null
  pending?: number
  missing?: number
  points?: number
  inactiveDays?: number
}
interface DashboardData {
  challenge?: ChallengeInfo | null
  activeChallenge?: ChallengeInfo | null
  kpis?: {
    members?: number
    enrolled?: number
    tasksToday?: number
    tasks?: number
    submissionsToday?: number
    evidencesToday?: number
    byStatus?: Record<string, number>
  }
  byStatus?: Record<string, number>
  ranking?: RankRow[]
  laggards?: LaggardRow[]
}

// ── Sub-navegación del módulo ──────────────────────────────────────
const SUBNAV = [
  { href: '/admin/reto-90d', label: 'Resumen', exact: true },
  { href: '/admin/reto-90d/tablero', label: 'Tablero' },
  { href: '/admin/reto-90d/tareas', label: 'Tareas' },
  { href: '/admin/reto-90d/usuarios', label: 'Usuarios' },
  { href: '/admin/reto-90d/evidencias', label: 'Evidencias' },
  { href: '/admin/reto-90d/reportes', label: 'Reportes' },
  { href: '/admin/reto-90d/configuracion', label: 'Configuración' },
]

function SubNav() {
  const pathname = usePathname()
  return (
    <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, marginBottom: 20 }}>
      {SUBNAV.map(item => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            style={{
              flexShrink: 0,
              padding: '7px 16px',
              borderRadius: 999,
              fontSize: 13,
              fontWeight: 700,
              textDecoration: 'none',
              whiteSpace: 'nowrap',
              border: active ? 'none' : `1px solid ${BORDER}`,
              background: active ? BRAND_GRADIENT : '#fff',
              color: active ? '#fff' : MUTED,
              boxShadow: active ? '0 8px 20px rgba(183,53,184,0.22)' : 'none',
            }}
          >
            {item.label}
          </Link>
        )
      })}
    </div>
  )
}

function fmtDate(v?: string | null) {
  if (!v) return null
  const d = new Date(v)
  if (isNaN(d.getTime())) return null
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
}

function rowName(r: { fullName?: string | null; name?: string | null; phone?: string }) {
  return r.fullName || r.name || r.phone || 'Sin nombre'
}

export default function AdminReto90dDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const r = await fetch('/api/admin/reto-90d/dashboard')
      if (!r.ok) {
        const j = await r.json().catch(() => ({}))
        throw new Error(j.error ?? `Error ${r.status}`)
      }
      const d: DashboardData = await r.json()
      setData(d)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar el dashboard.')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  const challenge = data?.challenge ?? data?.activeChallenge ?? null
  const kpis = data?.kpis ?? {}
  const byStatus = kpis.byStatus ?? data?.byStatus ?? {}
  const enrolled = kpis.members ?? kpis.enrolled ?? 0
  const tasksToday = kpis.tasksToday ?? kpis.tasks ?? 0
  const evidencesToday = kpis.submissionsToday ?? kpis.evidencesToday ?? 0
  const ranking = data?.ranking ?? []
  const laggards = data?.laggards ?? []

  const cardStyle: React.CSSProperties = {
    background: '#fff',
    border: `1px solid ${BORDER}`,
    borderRadius: 16,
    padding: 18,
    boxShadow: '0 1px 3px rgba(17,24,39,0.04)',
  }

  const kpiCards = [
    { label: 'Usuarios inscritos', value: enrolled, icon: Users, tint: 'rgba(35,59,143,0.10)', color: '#233B8F' },
    { label: 'Tareas del día', value: tasksToday, icon: ListChecks, tint: 'rgba(183,53,184,0.10)', color: '#B735B8' },
    { label: 'Evidencias hoy', value: evidencesToday, icon: Camera, tint: 'rgba(255,45,149,0.10)', color: '#FF2D95' },
  ]

  return (
    <div className="font-ui" style={{ color: TEXT }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: BRAND_GRADIENT, boxShadow: '0 10px 24px rgba(255,45,149,0.28)' }}>
            <Trophy size={19} className="text-white" />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.01em', margin: 0 }}>Reto 90D</h1>
            <p style={{ fontSize: 12, color: MUTED, margin: 0 }}>Panel del reto de 90 días</p>
          </div>
        </div>
        <button
          onClick={load}
          disabled={loading}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600, background: '#fff', border: `1px solid ${BORDER}`, color: MUTED, cursor: loading ? 'wait' : 'pointer' }}
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Actualizar
        </button>
      </div>
      <div className="h-px w-full my-4" style={{ background: BORDER }} />

      <SubNav />

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 size={22} className="animate-spin" style={{ color: MUTED }} /></div>
      ) : error ? (
        <div style={{ ...cardStyle, borderColor: 'rgba(220,38,38,0.3)', background: 'rgba(220,38,38,0.04)' }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#DC2626', margin: 0 }}>No se pudo cargar el dashboard</p>
          <p style={{ fontSize: 13, color: MUTED, marginTop: 6, marginBottom: 12 }}>{error}</p>
          <button onClick={load} style={{ padding: '8px 16px', borderRadius: 10, fontSize: 13, fontWeight: 700, background: BRAND_GRADIENT, border: 'none', color: '#fff', cursor: 'pointer' }}>Reintentar</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Reto activo / aviso */}
          {challenge ? (
            <div style={{ ...cardStyle, background: 'linear-gradient(135deg, rgba(255,45,149,0.06), rgba(35,59,143,0.06))' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#16A34A', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 999, background: '#16A34A', display: 'inline-block' }} /> Reto activo
                </span>
              </div>
              <h2 style={{ fontSize: 19, fontWeight: 800, margin: '8px 0 6px' }}>{challenge.name}</h2>
              {(challenge.startDate || challenge.endDate) && (
                <p style={{ fontSize: 13, color: MUTED, margin: 0, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <CalendarDays size={13} />
                  {fmtDate(challenge.startDate) ?? '—'} → {fmtDate(challenge.endDate) ?? '—'}
                </p>
              )}
            </div>
          ) : (
            <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(217,119,6,0.05)', borderColor: 'rgba(217,119,6,0.25)' }}>
              <AlertTriangle size={20} style={{ color: '#D97706', flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>No hay un reto activo</p>
                <p style={{ fontSize: 13, color: MUTED, margin: '2px 0 0' }}>Usa la barra del reto (arriba de todo) para crear o activar un reto y empezar a recibir evidencias.</p>
              </div>
            </div>
          )}

          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
            {kpiCards.map(k => (
              <div key={k.label} style={cardStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: k.tint }}>
                    <k.icon size={17} style={{ color: k.color }} />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: MUTED }}>{k.label}</span>
                </div>
                <p style={{ fontSize: 30, fontWeight: 800, lineHeight: 1, margin: 0 }}>{k.value}</p>
              </div>
            ))}
          </div>

          {/* Contadores por estado */}
          <div style={cardStyle}>
            <p style={{ fontSize: 13, fontWeight: 700, margin: '0 0 14px' }}>Evidencias por estado (hoy)</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12 }}>
              {STATUS_ORDER.map(key => {
                const meta = STATUS_META[key]
                const count = byStatus[key] ?? 0
                return (
                  <div key={key} style={{ padding: '12px 14px', borderRadius: 12, border: `1px solid ${BORDER}`, background: '#F5F7FA' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
                      <span style={{ width: 9, height: 9, borderRadius: 999, background: meta.color, display: 'inline-block' }} />
                      <span style={{ fontSize: 11.5, fontWeight: 600, color: MUTED }}>{meta.label}</span>
                    </div>
                    <p style={{ fontSize: 22, fontWeight: 800, margin: 0, color: meta.color }}>{count}</p>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Ranking + Atrasados */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18 }}>
            {/* Ranking del día */}
            <div style={cardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <Medal size={16} style={{ color: '#B735B8' }} />
                <p style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>Ranking del día</p>
              </div>
              {ranking.length === 0 ? (
                <p style={{ fontSize: 13, color: MUTED, textAlign: 'center', padding: '24px 0', margin: 0 }}>Todavía no hay puntuaciones hoy.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {ranking.slice(0, 10).map((r, i) => {
                    const medal = i === 0 ? '#F59E0B' : i === 1 ? '#94A3B8' : i === 2 ? '#B45309' : null
                    return (
                      <div key={(r.phone ?? '') + i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 10px', borderRadius: 10, background: i < 3 ? 'rgba(183,53,184,0.04)' : 'transparent', border: `1px solid ${i < 3 ? 'rgba(183,53,184,0.12)' : 'transparent'}` }}>
                        <div style={{ width: 26, height: 26, borderRadius: 999, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: medal ? '#fff' : MUTED, background: medal ?? '#F0F3F7' }}>
                          {i + 1}
                        </div>
                        <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rowName(r)}</span>
                        <span style={{ fontSize: 13, fontWeight: 800, color: '#16A34A' }}>{r.points ?? 0} pts</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Usuarios atrasados */}
            <div style={cardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <AlertTriangle size={16} style={{ color: '#D97706' }} />
                <p style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>Usuarios atrasados</p>
              </div>
              {laggards.length === 0 ? (
                <p style={{ fontSize: 13, color: MUTED, textAlign: 'center', padding: '24px 0', margin: 0 }}>Nadie está atrasado. ¡Todos al día!</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {laggards.slice(0, 10).map((r, i) => {
                    const missing = r.pending ?? r.missing ?? 0
                    const inactive = r.inactiveDays ?? 0
                    // 3+ días sin entregar → en riesgo real (se resalta en rojo).
                    const atRisk = inactive >= 3
                    return (
                      <div key={(r.phone ?? '') + i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 10, background: atRisk ? 'rgba(220,38,38,0.05)' : 'rgba(217,119,6,0.04)', border: `1px solid ${atRisk ? 'rgba(220,38,38,0.16)' : 'rgba(217,119,6,0.12)'}` }}>
                        <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rowName(r)}</span>
                        {inactive > 0 && (
                          <span style={{ fontSize: 11, fontWeight: 700, color: atRisk ? '#DC2626' : MUTED, flexShrink: 0 }}>
                            {inactive}d sin entregar
                          </span>
                        )}
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#D97706', flexShrink: 0 }}>{missing} pendiente{missing === 1 ? '' : 's'}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
