'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutGrid, Loader2, RefreshCw, AlertTriangle, Users } from 'lucide-react'

// ── Paleta MY DIAMOND ──────────────────────────────────────────────
const BRAND_GRADIENT = 'linear-gradient(135deg,#FF2D95,#B735B8,#233B8F)'
const BG = '#F5F7FA'
const BORDER = '#E4E9F0'
const TEXT = '#111827'
const MUTED = '#6B7280'

// ── Metadatos de estado (chip/ícono por celda) ─────────────────────
interface StatusMeta {
  label: string
  color: string
  icon: string
  tint: string
}
const STATUS_META: Record<string, StatusMeta> = {
  APPROVED: { label: 'Aprobado', color: '#16A34A', icon: '✅', tint: 'rgba(22,163,74,0.12)' },
  REVIEW: { label: 'En revisión', color: '#233B8F', icon: '⏳', tint: 'rgba(35,59,143,0.12)' },
  NEEDS_CLARIFICATION: { label: 'Aclaración', color: '#B735B8', icon: '✨', tint: 'rgba(183,53,184,0.12)' },
  PENDING: { label: 'Pendiente', color: '#D97706', icon: '●', tint: 'rgba(217,119,6,0.12)' },
  REJECTED: { label: 'Rechazado', color: '#DC2626', icon: '✕', tint: 'rgba(220,38,38,0.12)' },
  DUPLICATED: { label: 'Duplicado', color: '#6B7280', icon: '⧉', tint: 'rgba(107,114,128,0.12)' },
}
const EMPTY_META: StatusMeta = { label: 'Sin entrega', color: '#9CA3AF', icon: '⬜', tint: '#F0F3F7' }
const LEGEND_ORDER = ['APPROVED', 'REVIEW', 'NEEDS_CLARIFICATION', 'PENDING', 'REJECTED', 'DUPLICATED']

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

// ── Tipos (según respuesta del endpoint /board) ────────────────────
interface BoardTask {
  id: string
  title: string
  points: number
}
interface BoardCell {
  status: string
  points: number
}
interface BoardRow {
  phone: string
  fullName: string | null
  points: number
  cells: Record<string, BoardCell>
}
interface BoardData {
  challenge: { id: string; name: string } | null
  date: string
  tasks: BoardTask[]
  rows: BoardRow[]
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function StatusChip({ status }: { status?: string }) {
  const meta = (status && STATUS_META[status]) || EMPTY_META
  return (
    <span
      title={meta.label}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 30,
        height: 30,
        borderRadius: 9,
        fontSize: 15,
        lineHeight: 1,
        background: meta.tint,
        color: meta.color,
      }}
    >
      {meta.icon}
    </span>
  )
}

export default function AdminReto90dTablero() {
  const [date, setDate] = useState(todayStr())
  const [data, setData] = useState<BoardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load(d: string) {
    setLoading(true)
    setError(null)
    try {
      const r = await fetch(`/api/admin/reto-90d/board?date=${d}`)
      if (!r.ok) {
        const j = await r.json().catch(() => ({}))
        throw new Error(j.error ?? `Error ${r.status}`)
      }
      const j: BoardData = await r.json()
      setData(j)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar el tablero.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load(date) }, [date])

  const cardStyle: React.CSSProperties = {
    background: '#fff',
    border: `1px solid ${BORDER}`,
    borderRadius: 16,
    padding: 18,
    boxShadow: '0 1px 3px rgba(17,24,39,0.04)',
  }

  const challenge = data?.challenge ?? null
  const tasks = data?.tasks ?? []
  const rows = data?.rows ?? []

  return (
    <div className="font-ui" style={{ color: TEXT }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: BRAND_GRADIENT, boxShadow: '0 10px 24px rgba(255,45,149,0.28)' }}>
            <LayoutGrid size={19} className="text-white" />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.01em', margin: 0 }}>Tablero del día</h1>
            <p style={{ fontSize: 12, color: MUTED, margin: 0 }}>Matriz de usuarios × tareas, estado y puntos</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="date"
            value={date}
            max={todayStr()}
            onChange={(e) => setDate(e.target.value || todayStr())}
            style={{ padding: '8px 12px', borderRadius: 10, border: `1px solid ${BORDER}`, fontSize: 13, color: TEXT, background: '#fff' }}
          />
          <button
            onClick={() => load(date)}
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600, background: '#fff', border: `1px solid ${BORDER}`, color: MUTED, cursor: loading ? 'wait' : 'pointer' }}
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Actualizar
          </button>
        </div>
      </div>
      <div className="h-px w-full my-4" style={{ background: BORDER }} />

      <SubNav />

      {/* Leyenda de estados */}
      <div style={{ ...cardStyle, marginBottom: 18, padding: '12px 16px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: MUTED }}>Leyenda:</span>
          {LEGEND_ORDER.map(key => {
            const meta = STATUS_META[key]
            return (
              <span key={key} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: MUTED }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: 7, fontSize: 12, background: meta.tint, color: meta.color }}>{meta.icon}</span>
                {meta.label}
              </span>
            )
          })}
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: MUTED }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: 7, fontSize: 12, background: EMPTY_META.tint, color: EMPTY_META.color }}>{EMPTY_META.icon}</span>
            {EMPTY_META.label}
          </span>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 size={22} className="animate-spin" style={{ color: MUTED }} /></div>
      ) : error ? (
        <div style={{ ...cardStyle, borderColor: 'rgba(220,38,38,0.3)', background: 'rgba(220,38,38,0.04)' }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#DC2626', margin: 0 }}>No se pudo cargar el tablero</p>
          <p style={{ fontSize: 13, color: MUTED, marginTop: 6, marginBottom: 12 }}>{error}</p>
          <button onClick={() => load(date)} style={{ padding: '8px 16px', borderRadius: 10, fontSize: 13, fontWeight: 700, background: BRAND_GRADIENT, border: 'none', color: '#fff', cursor: 'pointer' }}>Reintentar</button>
        </div>
      ) : !challenge ? (
        <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(217,119,6,0.05)', borderColor: 'rgba(217,119,6,0.25)' }}>
          <AlertTriangle size={20} style={{ color: '#D97706', flexShrink: 0 }} />
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>No hay un reto activo</p>
            <p style={{ fontSize: 13, color: MUTED, margin: '2px 0 0' }}>Crea o activa un reto desde «Resumen» para ver el tablero.</p>
          </div>
        </div>
      ) : rows.length === 0 ? (
        <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: 12 }}>
          <Users size={20} style={{ color: MUTED, flexShrink: 0 }} />
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>Sin usuarios inscritos</p>
            <p style={{ fontSize: 13, color: MUTED, margin: '2px 0 0' }}>Inscribe usuarios en «Usuarios» para que aparezcan en el tablero.</p>
          </div>
        </div>
      ) : (
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
            <p style={{ fontSize: 14, fontWeight: 800, margin: 0 }}>{challenge.name}</p>
            <span style={{ fontSize: 12, color: MUTED }}>· {rows.length} usuario{rows.length === 1 ? '' : 's'} · {tasks.length} tarea{tasks.length === 1 ? '' : 's'}</span>
          </div>

          {tasks.length === 0 && (
            <p style={{ fontSize: 13, color: MUTED, margin: '0 0 14px' }}>No hay tareas activas para este día. Se muestran los usuarios y sus puntos.</p>
          )}

          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'separate', borderSpacing: 0, width: '100%', minWidth: 480 }}>
              <thead>
                <tr>
                  <th
                    style={{
                      position: 'sticky',
                      left: 0,
                      zIndex: 2,
                      background: '#fff',
                      textAlign: 'left',
                      padding: '10px 14px',
                      fontSize: 12,
                      fontWeight: 700,
                      color: MUTED,
                      borderBottom: `1px solid ${BORDER}`,
                      minWidth: 180,
                      boxShadow: `1px 0 0 ${BORDER}`,
                    }}
                  >
                    Usuario
                  </th>
                  {tasks.map(t => (
                    <th
                      key={t.id}
                      title={`${t.points} pts`}
                      style={{ padding: '10px 10px', fontSize: 12, fontWeight: 700, color: MUTED, borderBottom: `1px solid ${BORDER}`, textAlign: 'center', minWidth: 92, maxWidth: 160 }}
                    >
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 150, margin: '0 auto' }}>{t.title}</div>
                      <div style={{ fontSize: 10.5, fontWeight: 600, color: '#9CA3AF', marginTop: 2 }}>{t.points} pts</div>
                    </th>
                  ))}
                  <th style={{ padding: '10px 14px', fontSize: 12, fontWeight: 700, color: MUTED, borderBottom: `1px solid ${BORDER}`, textAlign: 'center', minWidth: 84 }}>
                    Puntos
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={row.phone + i} style={{ background: i % 2 === 0 ? '#fff' : BG }}>
                    <td
                      style={{
                        position: 'sticky',
                        left: 0,
                        zIndex: 1,
                        background: i % 2 === 0 ? '#fff' : BG,
                        padding: '10px 14px',
                        borderBottom: `1px solid ${BORDER}`,
                        minWidth: 180,
                        boxShadow: `1px 0 0 ${BORDER}`,
                      }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>
                        {row.fullName || 'Sin nombre'}
                      </div>
                      <div style={{ fontSize: 11, color: MUTED }}>{row.phone}</div>
                    </td>
                    {tasks.map(t => (
                      <td key={t.id} style={{ padding: '8px 10px', borderBottom: `1px solid ${BORDER}`, textAlign: 'center' }}>
                        <StatusChip status={row.cells[t.id]?.status} />
                      </td>
                    ))}
                    <td style={{ padding: '8px 14px', borderBottom: `1px solid ${BORDER}`, textAlign: 'center' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          minWidth: 42,
                          padding: '5px 10px',
                          borderRadius: 999,
                          fontSize: 13,
                          fontWeight: 800,
                          color: '#fff',
                          background: BRAND_GRADIENT,
                        }}
                      >
                        {row.points}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
