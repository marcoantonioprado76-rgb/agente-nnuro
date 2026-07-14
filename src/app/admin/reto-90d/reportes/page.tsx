'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BarChart3, Download, Trophy, Loader2, AlertCircle, RefreshCw, Calendar, FileText,
} from 'lucide-react'

// ── Paleta de marca ───────────────────────────────────────────────────────────
const BRAND_GRADIENT = 'linear-gradient(135deg,#FF2D95,#B735B8,#233B8F)'

// ── Sub-navegación del módulo Reto 90D ────────────────────────────────────────
const NAV = [
  { href: '/admin/reto-90d', label: 'Resumen' },
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
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 24 }}>
      {NAV.map(n => {
        const active = pathname === n.href
        return (
          <Link
            key={n.href}
            href={n.href}
            style={{
              padding: '7px 14px', borderRadius: 999, fontSize: 13, fontWeight: 700, textDecoration: 'none',
              border: active ? 'none' : '1px solid #E4E9F0',
              background: active ? BRAND_GRADIENT : '#fff',
              color: active ? '#fff' : '#6B7280',
            }}
          >
            {n.label}
          </Link>
        )
      })}
    </div>
  )
}

// ── Tipos de datos del reporte ────────────────────────────────────────────────
interface RankingRow {
  phone: string
  fullName: string
  points: number
  completed: number
}

interface ReportData {
  adminReport: string
  ranking: RankingRow[]
  compliance: number
}

// Fecha de hoy en formato YYYY-MM-DD (para el <input type="date">).
function todayStr(): string {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

// Escapa una celda para CSV (comillas, comas, saltos de línea).
function csvCell(value: string): string {
  const s = value ?? ''
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export default function RetoReportesPage() {
  const [date, setDate] = useState(todayStr())
  const [challengeId, setChallengeId] = useState('')
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // El id del reto puede llegar por query (?challengeId=). Si no viene, el
  // backend usa el reto activo por defecto.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setChallengeId(params.get('challengeId') ?? '')
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const qs = new URLSearchParams()
      if (challengeId) qs.set('challengeId', challengeId)
      qs.set('date', date)
      const r = await fetch(`/api/admin/reto-90d/reports?${qs.toString()}`)
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const d = await r.json()
      setData({
        adminReport: typeof d.adminReport === 'string' ? d.adminReport : '',
        ranking: Array.isArray(d.ranking) ? (d.ranking as RankingRow[]) : [],
        compliance: typeof d.compliance === 'number' ? d.compliance : 0,
      })
    } catch {
      setError('No se pudo cargar el reporte. Intenta de nuevo.')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [challengeId, date])

  useEffect(() => { load() }, [load])

  // Genera y descarga el ranking como CSV, sin librerías (Blob en cliente).
  function exportCsv() {
    if (!data || data.ranking.length === 0) return
    const header = ['Posición', 'Nombre', 'Teléfono', 'Puntos', 'Completadas']
    const rows = data.ranking.map((row, i) => [
      String(i + 1),
      row.fullName ?? '',
      row.phone ?? '',
      String(row.points ?? 0),
      String(row.completed ?? 0),
    ])
    const csv = [header, ...rows].map(r => r.map(csvCell).join(',')).join('\r\n')
    // BOM (﻿) para que Excel respete los acentos.
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ranking-reto90d-${date}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const rankMedal = (i: number) => (i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`)

  return (
    <div className="dm-page font-ui">
      <div>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 className="text-xl font-bold text-[#111827] uppercase tracking-widest flex items-center gap-2">
            <BarChart3 size={18} className="text-[#B735B8]" /> Reto 90D — Reportes
          </h1>
          <div className="h-px w-16 mt-2 rounded-full" style={{ background: BRAND_GRADIENT }} />
        </div>

        <SubNav />

        {/* Controles: fecha + acciones */}
        <div
          style={{
            display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: 12,
            justifyContent: 'space-between', marginBottom: 20,
          }}
        >
          <div>
            <label style={{ fontSize: 12, color: '#6B7280', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <Calendar size={13} /> Fecha del reporte
            </label>
            <input
              type="date"
              value={date}
              max={todayStr()}
              onChange={e => setDate(e.target.value)}
              style={{
                padding: '8px 12px', borderRadius: 10, fontSize: 13, color: '#111827',
                background: '#fff', border: '1px solid #E4E9F0', outline: 'none',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={load}
              disabled={loading}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 10,
                fontSize: 13, fontWeight: 700, color: '#6B7280', background: '#fff',
                border: '1px solid #E4E9F0', cursor: loading ? 'wait' : 'pointer',
              }}
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Actualizar
            </button>
            <button
              onClick={exportCsv}
              disabled={!data || data.ranking.length === 0}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 10,
                fontSize: 13, fontWeight: 700, color: '#fff', border: 'none',
                background: BRAND_GRADIENT,
                opacity: !data || data.ranking.length === 0 ? 0.5 : 1,
                cursor: !data || data.ranking.length === 0 ? 'not-allowed' : 'pointer',
              }}
            >
              <Download size={14} /> Exportar CSV
            </button>
          </div>
        </div>

        {/* Estados */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 size={22} className="animate-spin text-[#B735B8]" />
          </div>
        ) : error ? (
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '16px 18px', borderRadius: 16,
              background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', color: '#b91c1c',
            }}
          >
            <AlertCircle size={18} />
            <span style={{ fontSize: 13, fontWeight: 600 }}>{error}</span>
          </div>
        ) : data ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Cumplimiento general */}
            <div
              style={{
                background: '#fff', border: '1px solid #E4E9F0', borderRadius: 16, padding: '28px 24px',
                textAlign: 'center',
              }}
            >
              <p style={{ fontSize: 12, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                Cumplimiento general
              </p>
              <div
                style={{
                  fontSize: 56, fontWeight: 900, lineHeight: 1,
                  background: BRAND_GRADIENT, WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                }}
              >
                {data.compliance}%
              </div>
              {/* Barra de progreso */}
              <div style={{ marginTop: 16, height: 8, borderRadius: 999, background: '#EEF2F7', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%', borderRadius: 999,
                    width: `${Math.max(0, Math.min(100, data.compliance))}%`,
                    background: BRAND_GRADIENT, transition: 'width 0.4s ease',
                  }}
                />
              </div>
            </div>

            {/* Ranking */}
            <div style={{ background: '#fff', border: '1px solid #E4E9F0', borderRadius: 16, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '16px 20px', borderBottom: '1px solid #E4E9F0' }}>
                <Trophy size={15} className="text-[#B735B8]" />
                <p style={{ fontSize: 14, fontWeight: 800, color: '#111827', margin: 0 }}>Ranking del día</p>
                <span style={{ marginLeft: 'auto', fontSize: 12, color: '#6B7280' }}>
                  {data.ranking.length} participante{data.ranking.length !== 1 ? 's' : ''}
                </span>
              </div>

              {data.ranking.length === 0 ? (
                <div style={{ padding: '32px 20px', textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>
                  Sin actividad registrada para esta fecha.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: '#F7F9FC', color: '#6B7280', textAlign: 'left' }}>
                        <th style={{ padding: '10px 16px', fontWeight: 700, width: 60 }}>#</th>
                        <th style={{ padding: '10px 16px', fontWeight: 700 }}>Participante</th>
                        <th style={{ padding: '10px 16px', fontWeight: 700, textAlign: 'right' }}>Completadas</th>
                        <th style={{ padding: '10px 16px', fontWeight: 700, textAlign: 'right' }}>Puntos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.ranking.map((row, i) => (
                        <tr key={`${row.phone}-${i}`} style={{ borderTop: '1px solid #EEF2F7' }}>
                          <td style={{ padding: '11px 16px', fontWeight: 800, color: '#111827' }}>{rankMedal(i)}</td>
                          <td style={{ padding: '11px 16px' }}>
                            <div style={{ fontWeight: 700, color: '#111827' }}>{row.fullName || 'Sin nombre'}</div>
                            <div style={{ fontSize: 11, color: '#9CA3AF' }}>{row.phone}</div>
                          </td>
                          <td style={{ padding: '11px 16px', textAlign: 'right', color: '#111827' }}>{row.completed}</td>
                          <td style={{ padding: '11px 16px', textAlign: 'right', fontWeight: 800, color: '#B735B8' }}>{row.points}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Texto del reporte admin */}
            <div style={{ background: '#fff', border: '1px solid #E4E9F0', borderRadius: 16, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '16px 20px', borderBottom: '1px solid #E4E9F0' }}>
                <FileText size={15} className="text-[#6B7280]" />
                <p style={{ fontSize: 14, fontWeight: 800, color: '#111827', margin: 0 }}>Reporte general del admin</p>
              </div>
              <pre
                style={{
                  margin: 0, padding: '18px 20px', fontSize: 12.5, lineHeight: 1.7, color: '#111827',
                  background: '#F7F9FC', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                }}
              >
                {data.adminReport || 'Sin reporte disponible para esta fecha.'}
              </pre>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
