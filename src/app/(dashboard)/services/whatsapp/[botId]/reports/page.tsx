'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

interface DayData {
  date: string
  conversations: number
  sales: number
}

interface RecentSale {
  userName: string | null
  userPhone: string
  soldAt: string | null
  reporte: string
}

interface Analytics {
  botName: string
  stats: {
    totalConversations: number
    totalSales: number
    salesToday: number
    salesThisWeek: number
    conversionRate: number
  }
  days: DayData[]
  recentSales: RecentSale[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

function fmtShort(iso: string) {
  const d = new Date(iso + 'T00:00:00')
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`
}

function smoothCurve(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return ''
  const t = 0.25
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[Math.min(pts.length - 1, i + 2)]
    const cp1x = p1.x + (p2.x - p0.x) * t
    const cp1y = p1.y + (p2.y - p0.y) * t
    const cp2x = p2.x - (p3.x - p1.x) * t
    const cp2y = p2.y - (p3.y - p1.y) * t
    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)} ${cp2x.toFixed(1)} ${cp2y.toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`
  }
  return d
}

// ── Gráfica SVG — dos curvas ──────────────────────────────────────────────────
function LineChart({ days }: { days: DayData[] }) {
  const W = 620, H = 200, padL = 36, padR = 16, padT = 36, padB = 36

  const convVals  = days.map(d => d.conversations)
  const salesVals = days.map(d => d.sales)
  // Escala compartida: ambas curvas en el mismo eje Y
  const maxVal = Math.max(...convVals, ...salesVals, 1)

  const xOf = (i: number) => padL + (days.length > 1 ? i / (days.length - 1) : 0.5) * (W - padL - padR)
  const yOf = (v: number) => padT + (1 - v / maxVal) * (H - padT - padB)

  const convPts  = days.map((d, i) => ({ x: xOf(i), y: yOf(d.conversations), val: d.conversations }))
  const salesPts = days.map((d, i) => ({ x: xOf(i), y: yOf(d.sales), val: d.sales, date: d.date }))

  const convLine  = smoothCurve(convPts)
  const salesLine = smoothCurve(salesPts)

  const convArea  = convLine  ? `${convLine}  L ${convPts[convPts.length-1].x.toFixed(1)} ${(H-padB).toFixed(1)} L ${convPts[0].x.toFixed(1)} ${(H-padB).toFixed(1)} Z`  : ''
  const salesArea = salesLine ? `${salesLine} L ${salesPts[salesPts.length-1].x.toFixed(1)} ${(H-padB).toFixed(1)} L ${salesPts[0].x.toFixed(1)} ${(H-padB).toFixed(1)} Z` : ''

  const xIdx = Array.from({ length: days.length }, (_, i) => i).filter(i => i % 7 === 0 || i === days.length - 1)
  const yVals = [0, Math.round(maxVal / 2), maxVal]

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}>
      <defs>
        {/* Conversations — cyan */}
        <linearGradient id="lc-conv-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#38BDF8" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#38BDF8" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="lc-conv-line" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="#7DD3FC" />
          <stop offset="100%" stopColor="#38BDF8" />
        </linearGradient>
        {/* Sales — green */}
        <linearGradient id="lc-sales-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#00FF88" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#00FF88" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="lc-sales-line" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="#6EE7B7" />
          <stop offset="100%" stopColor="#00FF88" />
        </linearGradient>
        {/* Glow filters */}
        <filter id="lc-glow-conv" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="lc-glow-sales" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="lc-dot-glow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      {/* Grid */}
      {yVals.map((v, i) => {
        const y = yOf(v)
        return (
          <g key={i}>
            <line x1={padL} y1={y} x2={W - padR} y2={y}
              stroke="rgba(255,255,255,0.06)" strokeWidth="1"
              strokeDasharray={i === 0 ? 'none' : '4 6'} />
            <text x={padL - 6} y={y + 4} textAnchor="end" fontSize="8"
              fill="rgba(255,255,255,0.2)" fontFamily="monospace">{v}</text>
          </g>
        )
      })}
      <line x1={padL} y1={H - padB} x2={W - padR} y2={H - padB}
        stroke="rgba(255,255,255,0.08)" strokeWidth="1" />

      {/* ── Conversaciones (cyan) — área + línea + puntos ── */}
      {convArea  && <path d={convArea}  fill="url(#lc-conv-area)" />}
      {convLine  && <path d={convLine}  fill="none" stroke="url(#lc-conv-line)"  strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" filter="url(#lc-glow-conv)" />}
      {convPts.map((p, i) => p.val === 0 ? null : (
        <circle key={i} cx={p.x} cy={p.y} r="2.5" fill="#38BDF8" stroke="rgba(0,0,0,0.6)" strokeWidth="1.5" />
      ))}

      {/* ── Ventas (green) — área + línea + puntos con badges ── */}
      {salesArea && <path d={salesArea} fill="url(#lc-sales-area)" />}
      {salesLine && <path d={salesLine} fill="none" stroke="url(#lc-sales-line)" strokeWidth="2"   strokeLinejoin="round" strokeLinecap="round" filter="url(#lc-glow-sales)" />}
      {salesPts.map((p, i) => {
        if (p.val === 0) return null
        return (
          <g key={i} filter="url(#lc-dot-glow)">
            <circle cx={p.x} cy={p.y} r="10" fill="#00FF88" opacity="0.07" />
            <rect x={p.x - 10} y={p.y - 30} width="20" height="14" rx="4" fill="#00FF88" opacity="0.9" />
            <text x={p.x} y={p.y - 20} textAnchor="middle" fontSize="8" fontWeight="800" fill="#000">{p.val}</text>
            <line x1={p.x} y1={p.y - 16} x2={p.x} y2={p.y - 6} stroke="#00FF88" strokeWidth="1" opacity="0.5" />
            <circle cx={p.x} cy={p.y} r="4" fill="#00FF88" stroke="rgba(0,0,0,0.6)" strokeWidth="1.5" />
            <circle cx={p.x} cy={p.y} r="2" fill="#fff" opacity="0.6" />
          </g>
        )
      })}

      {/* Etiquetas X */}
      {xIdx.map(i => (
        <text key={i} x={convPts[i].x} y={H - 6} textAnchor="middle"
          fontSize="8.5" fill="rgba(255,255,255,0.28)" fontFamily="system-ui">
          {fmtShort(days[i].date)}
        </text>
      ))}
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

export default function BotReportsPage() {
  const { botId } = useParams<{ botId: string }>()
  const [data, setData] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/bots/${botId}/analytics`)
      .then(r => r.json())
      .then(d => { if (d.error) { setError(d.error) } else { setData(d) }; setLoading(false) })
      .catch(() => { setError('Error al cargar los datos'); setLoading(false) })
  }, [botId])

  function fmtDate(iso: string | null) {
    if (!iso) return '—'
    const d = new Date(iso)
    return d.toLocaleDateString('es', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="px-4 sm:px-6 pt-6 max-w-screen-2xl mx-auto">
        <Link href="/dashboard/services/whatsapp" style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>← Volver</Link>
        <p className="text-red-400 text-sm mt-4">{error || 'Error al cargar'}</p>
      </div>
    )
  }

  const { stats, days, recentSales, botName } = data

  return (
    <div className="px-4 sm:px-6 pt-6 pb-12 max-w-7xl mx-auto">
      {/* Back */}
      <Link href="/dashboard/services/whatsapp" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'rgba(255,255,255,0.4)', textDecoration: 'none', marginBottom: 20 }}>
        ← Volver a bots
      </Link>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          📊 Reportes
        </h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', marginTop: 4 }}>{botName}</p>
        <div style={{ height: 2, width: 60, marginTop: 10, borderRadius: 99, background: 'linear-gradient(90deg, #FFD700, #00FF88)' }} />
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 24 }} className="sm:grid-cols-4 sm:gap-3">
        {[
          { label: 'Total personas', value: stats.totalConversations, color: '#FFD700' },
          { label: 'Total ventas', value: stats.totalSales, color: '#00FF88' },
          { label: 'Ventas hoy', value: stats.salesToday, color: '#F5A623' },
          { label: 'Conversión', value: `${stats.conversionRate}%`, color: '#FF2DF7' },
        ].map(s => (
          <div key={s.label} style={{ borderRadius: 14, padding: '14px 16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>{s.label}</p>
            <p style={{ fontSize: 26, fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Chart section */}
      <div style={{ borderRadius: 16, padding: '20px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Últimos 30 días</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>
              <span style={{ display: 'inline-block', width: 10, height: 3, borderRadius: 99, background: '#38BDF8' }} />
              Personas
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>
              <span style={{ display: 'inline-block', width: 10, height: 3, borderRadius: 99, background: '#00FF88' }} />
              Ventas
            </span>
          </div>
        </div>
        <LineChart days={days} />
        <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', textAlign: 'center', marginTop: 8 }}>
          Conversaciones iniciadas y ventas confirmadas por día
        </p>
      </div>

      {/* Recent sales */}
      <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ padding: '14px 18px', background: 'rgba(0,255,136,0.04)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#fff', margin: 0 }}>
            Ventas recientes
            <span style={{ marginLeft: 8, fontSize: 11, color: 'rgba(255,255,255,0.3)', fontWeight: 500 }}>últimas {recentSales.length}</span>
          </p>
        </div>

        {recentSales.length === 0 ? (
          <div style={{ padding: '32px 18px', textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.25)' }}>Aún no hay ventas registradas.</p>
          </div>
        ) : (
          <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {recentSales.map((sale, i) => (
              <div key={i} style={{ borderRadius: 12, padding: '12px 14px', background: 'rgba(0,255,136,0.03)', border: '1px solid rgba(0,255,136,0.08)' }}>
                {/* Header row: avatar + name/phone + date */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(0,255,136,0.08)', border: '1px solid rgba(0,255,136,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 15 }}>
                    ✓
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: '#fff', margin: 0, wordBreak: 'break-word' }}>
                        {sale.userName || 'Sin nombre'}
                      </p>
                      <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', margin: 0, flexShrink: 0 }}>{fmtDate(sale.soldAt)}</p>
                    </div>
                    <span style={{ display: 'inline-block', marginTop: 4, fontSize: 11, color: '#38BDF8', background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.18)', borderRadius: 5, padding: '2px 8px', fontWeight: 600, wordBreak: 'break-all' }}>
                      📞 {sale.userPhone}
                    </span>
                  </div>
                </div>
                {/* Reporte — full width, no margin left */}
                {sale.reporte && (
                  <div style={{ marginTop: 10, padding: '9px 12px', borderRadius: 8, background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.07)', fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {sale.reporte}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
