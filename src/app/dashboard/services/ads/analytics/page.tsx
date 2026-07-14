'use client'

import { useState, useEffect, useRef } from 'react'
import {
    ArrowLeft, Loader2, TrendingUp, Eye, MousePointerClick,
    DollarSign, RefreshCw, BarChart3, Target, Zap, Users
} from 'lucide-react'
import Link from 'next/link'

interface DayRow {
    date: string
    campaignId: string
    campaignName: string
    spend: number
    impressions: number
    clicks: number
    linkClicks: number
    reach: number
    conversions: number
    conversations?: number
    purchases?: number
    leads?: number
    videoViews?: number
    postEngagement?: number
    landingPageViews?: number
    ctr: string
    cpc: string
    cpm: string
    cpa: string
}

interface CampaignTotal {
    campaignId: string
    campaignName: string
    spend: string
    impressions: number
    clicks: number
    linkClicks: number
    reach: number
    conversions: number
    conversations?: number
    purchases?: number
    leads?: number
    videoViews?: number
    postEngagement?: number
    landingPageViews?: number
    ctr: string
    cpc: string
    cpm: string
    cpa: string | null
}

interface DailyAgg {
    date: string
    spend: number
    impressions: number
    clicks: number
    linkClicks: number
    reach: number
    conversions: number
    conversations: number
    purchases: number
    leads: number
    videoViews: number
    postEngagement: number
    landingPageViews: number
}

const PERIODS = [
    { key: '7', label: '7 días' },
    { key: '14', label: '14 días' },
    { key: '30', label: '30 días' },
]

const METRICS = [
    { key: 'spend',         label: 'Gasto',            color: '#22C55E' },
    { key: 'linkClicks',    label: 'Clics enlace',     color: '#B735B8' },
    { key: 'impressions',   label: 'Impresiones',      color: '#4C97D8' },
    { key: 'reach',         label: 'Alcance',          color: '#FF2D95' },
    { key: 'conversations', label: 'Conversaciones WA', color: '#25D366' },
    { key: 'conversions',   label: 'Conversiones',     color: '#FBBF24' },
    { key: 'videoViews',    label: 'Vistas de video',  color: '#F87171' },
]

const MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

function fmtShort(iso: string) {
    const d = new Date(iso + 'T00:00:00')
    return `${d.getDate()} ${MONTHS[d.getMonth()]}`
}

function fmt(n: number) {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
    return String(n)
}

function smoothCurve(pts: { x: number; y: number }[]): string {
    if (pts.length === 0) return ''
    if (pts.length === 1) return `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`
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

function MultiLineChart({ days, activeMetrics }: { days: DailyAgg[]; activeMetrics: Set<string> }) {
    const svgRef = useRef<SVGSVGElement>(null)
    const [hoverIdx, setHoverIdx] = useState<number | null>(null)
    const W = 620, H = 220, padL = 8, padR = 8, padT = 20, padB = 32
    const xOf = (i: number) => padL + (days.length > 1 ? i / (days.length - 1) : 0.5) * (W - padL - padR)
    const yOf = (v: number, max: number) => padT + (1 - (max > 0 ? v / max : 0)) * (H - padT - padB)
    const activeList = METRICS.filter(m => activeMetrics.has(m.key))
    const lines = activeList.map(m => {
        const vals = days.map(d => (d as any)[m.key] as number)
        const max = Math.max(...vals, 1)
        const pts = days.map((_, i) => ({ x: xOf(i), y: yOf(vals[i], max), val: vals[i] }))
        const path = smoothCurve(pts)
        const area = path ? `${path} L ${pts[pts.length - 1].x.toFixed(1)} ${(H - padB).toFixed(1)} L ${pts[0].x.toFixed(1)} ${(H - padB).toFixed(1)} Z` : ''
        return { ...m, pts, path, area }
    })
    const step = Math.max(1, Math.floor(days.length / 6))
    const xIdx = days.map((_, i) => i).filter(i => i % step === 0 || i === days.length - 1)
    function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
        if (!svgRef.current || days.length < 2) return
        const rect = svgRef.current.getBoundingClientRect()
        const mx = ((e.clientX - rect.left) / rect.width) * W
        const frac = Math.max(0, Math.min(1, (mx - padL) / (W - padL - padR)))
        setHoverIdx(Math.round(frac * (days.length - 1)))
    }
    const hoverX = hoverIdx !== null ? xOf(hoverIdx) : null
    return (
        <div style={{ position: 'relative' }}>
            <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`}
                style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible', cursor: 'crosshair' }}
                onMouseMove={handleMouseMove} onMouseLeave={() => setHoverIdx(null)}>
                <defs>
                    {activeList.map(m => (
                        <linearGradient key={m.key} id={`g-${m.key}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={m.color} stopOpacity="0.2" />
                            <stop offset="100%" stopColor={m.color} stopOpacity="0" />
                        </linearGradient>
                    ))}
                    {activeList.map(m => (
                        <filter key={m.key} id={`gf-${m.key}`} x="-20%" y="-20%" width="140%" height="140%">
                            <feGaussianBlur stdDeviation="2" result="b" />
                            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
                        </filter>
                    ))}
                </defs>
                {[0, 0.5, 1].map((f, i) => {
                    const y = padT + f * (H - padT - padB)
                    return <line key={i} x1={padL} y1={y} x2={W - padR} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="1" strokeDasharray={i === 0 ? 'none' : '4 6'} />
                })}
                <line x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} stroke="rgba(255,255,255,0.07)" strokeWidth="1" />
                {lines.map(l => (
                    <g key={l.key}>
                        {days.length === 1 ? (
                            <>
                                <line x1={padL} y1={l.pts[0].y} x2={W - padR} y2={l.pts[0].y} stroke={l.color} strokeWidth="1.5" strokeDasharray="4 4" opacity={0.5} />
                                <circle cx={l.pts[0].x} cy={l.pts[0].y} r="5" fill={l.color} stroke="rgba(0,0,0,0.5)" strokeWidth="1.5" filter={`url(#gf-${l.key})`} />
                            </>
                        ) : (
                            <>
                                {l.area && <path d={l.area} fill={`url(#g-${l.key})`} />}
                                {l.path && <path d={l.path} fill="none" stroke={l.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" filter={`url(#gf-${l.key})`} />}
                            </>
                        )}
                    </g>
                ))}
                {hoverIdx !== null && hoverX !== null && (
                    <>
                        <line x1={hoverX} y1={padT} x2={hoverX} y2={H - padB} stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeDasharray="4 3" />
                        {lines.map(l => <circle key={l.key} cx={l.pts[hoverIdx]?.x} cy={l.pts[hoverIdx]?.y} r="4" fill={l.color} stroke="rgba(0,0,0,0.6)" strokeWidth="1.5" />)}
                    </>
                )}
                {xIdx.map(i => (
                    <text key={i} x={xOf(i)} y={H - 8} textAnchor="middle" fontSize="8.5" fill="rgba(255,255,255,0.25)" fontFamily="system-ui">
                        {fmtShort(days[i].date)}
                    </text>
                ))}
            </svg>
            {hoverIdx !== null && (
                <div style={{
                    position: 'absolute', top: 0,
                    left: `clamp(8px, calc(${(hoverIdx / Math.max(days.length - 1, 1)) * 100}% - 80px), calc(100% - 168px))`,
                    background: '#0D0F1E', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '10px', padding: '8px 12px', pointerEvents: 'none', zIndex: 10, minWidth: '160px',
                }}>
                    <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '10px', fontWeight: 700, marginBottom: '6px' }}>
                        {fmtShort(days[hoverIdx].date)}
                    </p>
                    {lines.map(l => (
                        <div key={l.key} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                            <span style={{ width: 7, height: 7, borderRadius: '50%', background: l.color, flexShrink: 0 }} />
                            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px' }}>{l.label}:</span>
                            <span style={{ color: '#fff', fontSize: '10px', fontWeight: 700 }}>
                                {l.key === 'spend' ? `$${Number(l.pts[hoverIdx]?.val ?? 0).toFixed(2)}` : fmt(l.pts[hoverIdx]?.val ?? 0)}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

export default function AnalyticsPage() {
    const [rows, setRows] = useState<DayRow[]>([])
    const [totals, setTotals] = useState<CampaignTotal[]>([])
    const [campaigns, setCampaigns] = useState<{ id: string; name: string }[]>([])
    const [period, setPeriod] = useState('7')
    const [selectedCampaign, setSelectedCampaign] = useState('ALL')
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [fetchError, setFetchError] = useState<string | null>(null)
    const [activeMetrics, setActiveMetrics] = useState<Set<string>>(new Set(['spend', 'clicks', 'impressions']))

    useEffect(() => { fetchData(false) }, [period, selectedCampaign])

    async function fetchData(manual: boolean) {
        if (manual) setRefreshing(true)
        else setLoading(true)
        setFetchError(null)
        try {
            const params = new URLSearchParams({ days: period })
            if (selectedCampaign !== 'ALL') params.set('campaignId', selectedCampaign)
            const res = await fetch(`/api/ads/metrics?${params}`)
            const data = await res.json()
            if (!res.ok) {
                setFetchError(data.error || 'Error al cargar métricas')
                return
            }
            setRows(data.rows || [])
            setTotals(data.totals || [])
            setCampaigns(data.campaigns || [])
        } catch (e: any) {
            setFetchError('Error de conexión al cargar métricas')
        }
        finally { setLoading(false); setRefreshing(false) }
    }

    // Aggregate rows by date for the chart
    const dailyMap = new Map<string, DailyAgg>()
    for (const row of rows) {
        const existing = dailyMap.get(row.date)
        const base: DailyAgg = {
            date: row.date, spend: row.spend, impressions: row.impressions,
            clicks: row.clicks, linkClicks: row.linkClicks ?? 0, reach: row.reach ?? 0,
            conversions: row.conversions ?? 0, conversations: row.conversations ?? 0,
            purchases: row.purchases ?? 0, leads: row.leads ?? 0,
            videoViews: row.videoViews ?? 0, postEngagement: row.postEngagement ?? 0,
            landingPageViews: row.landingPageViews ?? 0,
        }
        if (!existing) {
            dailyMap.set(row.date, base)
        } else {
            existing.spend           += row.spend
            existing.impressions     += row.impressions
            existing.clicks          += row.clicks
            existing.linkClicks      += (row.linkClicks ?? 0)
            existing.reach           += (row.reach ?? 0)
            existing.conversions     += (row.conversions ?? 0)
            existing.conversations   += (row.conversations ?? 0)
            existing.purchases       += (row.purchases ?? 0)
            existing.leads           += (row.leads ?? 0)
            existing.videoViews      += (row.videoViews ?? 0)
            existing.postEngagement  += (row.postEngagement ?? 0)
            existing.landingPageViews += (row.landingPageViews ?? 0)
        }
    }
    const daily = Array.from(dailyMap.values()).sort((a, b) => a.date > b.date ? 1 : -1)

    // Grand totals
    const grand = totals.reduce((acc, t) => ({
        spend:           acc.spend           + parseFloat(t.spend),
        impressions:     acc.impressions     + t.impressions,
        clicks:          acc.clicks          + t.clicks,
        linkClicks:      acc.linkClicks      + (t.linkClicks      ?? t.clicks),
        reach:           acc.reach           + (t.reach           ?? 0),
        conversions:     acc.conversions     + (t.conversions     ?? 0),
        purchases:       acc.purchases       + (t.purchases       ?? 0),
        leads:           acc.leads           + (t.leads           ?? 0),
        conversations:   acc.conversations   + (t.conversations   ?? 0),
        videoViews:      acc.videoViews      + (t.videoViews      ?? 0),
        postEngagement:  acc.postEngagement  + (t.postEngagement  ?? 0),
        landingPageViews: acc.landingPageViews + (t.landingPageViews ?? 0),
    }), { spend: 0, impressions: 0, clicks: 0, linkClicks: 0, reach: 0, conversions: 0, purchases: 0, leads: 0, conversations: 0, videoViews: 0, postEngagement: 0, landingPageViews: 0 })

    const ctr  = grand.impressions   > 0 ? ((grand.linkClicks    / grand.impressions)   * 100).toFixed(2) : '0.00'
    const cpc  = grand.linkClicks    > 0 ? (grand.spend          / grand.linkClicks).toFixed(2)           : '0.00'
    const cpm  = grand.impressions   > 0 ? ((grand.spend         / grand.impressions)   * 1000).toFixed(2): '0.00'
    const cpa  = grand.conversions   > 0 ? (grand.spend          / grand.conversions).toFixed(2)          : null
    const cpConv = grand.conversations > 0 ? (grand.spend        / grand.conversations).toFixed(2)        : null

    function toggleMetric(key: string) {
        setActiveMetrics(prev => {
            const next = new Set(prev)
            if (next.has(key)) { if (next.size === 1) return prev; next.delete(key) } else { next.add(key) }
            return next
        })
    }

    const summaryCards = [
        { label: 'Gasto',              value: `$${grand.spend.toFixed(2)}`, color: '#22C55E', icon: DollarSign },
        { label: 'Clics enlace',       value: fmt(grand.linkClicks),        color: '#B735B8', icon: MousePointerClick },
        { label: 'Impresiones',        value: fmt(grand.impressions),       color: '#4C97D8', icon: Eye },
        { label: 'Alcance',            value: fmt(grand.reach),             color: '#FF2D95', icon: Users },
        { label: 'CTR',                value: `${ctr}%`,                   color: '#22C55E', icon: TrendingUp },
        { label: 'CPC',                value: `$${cpc}`,                   color: '#B735B8', icon: Zap },
        { label: 'CPM',                value: `$${cpm}`,                   color: '#4C97D8', icon: BarChart3 },
        ...(grand.conversations > 0 ? [{ label: 'Conv. WhatsApp', value: fmt(grand.conversations), color: '#25D366', icon: Target }] : []),
        ...(grand.conversations > 0 && cpConv ? [{ label: 'Costo/Conv. WA', value: `$${cpConv}`, color: '#22C55E', icon: DollarSign }] : []),
        ...(grand.conversions > 0 ? [{ label: 'Conversiones',  value: fmt(grand.conversions),  color: '#FBBF24', icon: Target }] : []),
        ...(grand.conversions > 0 && cpa ? [{ label: 'CPA', value: `$${cpa}`, color: '#FB923C', icon: DollarSign }] : []),
        ...(grand.purchases > 0 ? [{ label: 'Compras', value: fmt(grand.purchases), color: '#FBBF24', icon: Target }] : []),
        ...(grand.leads > 0 ? [{ label: 'Leads', value: fmt(grand.leads), color: '#B735B8', icon: Users }] : []),
        ...(grand.videoViews > 0 ? [{ label: 'Vistas video', value: fmt(grand.videoViews), color: '#F87171', icon: BarChart3 }] : []),
        ...(grand.landingPageViews > 0 ? [{ label: 'Vistas landing', value: fmt(grand.landingPageViews), color: '#22C55E', icon: Eye }] : []),
    ]

    return (
        <div className="px-4 md:px-6 pt-6 max-w-5xl mx-auto pb-24 text-white" style={{ background: 'radial-gradient(120% 55% at 50% -5%, rgba(183,53,184,0.12), rgba(255,255,255,0) 55%), radial-gradient(90% 55% at 100% 108%, rgba(106,53,217,0.10), rgba(255,255,255,0) 60%), linear-gradient(180deg, #081624 0%, #050B14 100%)', minHeight: 'calc(100vh - 2rem)', borderRadius: 24, border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 30px 60px -30px rgba(8,22,36,0.5)' }}>

            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <Link href="/dashboard/services/ads/meta"
                    className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all shrink-0">
                    <ArrowLeft size={15} />
                </Link>
                <div className="flex-1 min-w-0">
                    <h1 className="text-lg md:text-xl font-black uppercase tracking-tighter">Analytics de Campañas</h1>
                    <p className="text-[11px] text-white/30">Métricas de tus campañas publicadas en Meta Ads</p>
                </div>
                <button onClick={() => fetchData(true)}
                    className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all">
                    <RefreshCw size={14} className={refreshing ? 'animate-spin text-[#B735B8]' : ''} />
                </button>
            </div>

            {/* Error banner */}
            {fetchError && (
                <div className="mb-5 flex items-center gap-3 p-3.5 rounded-2xl text-[#F87171] text-xs"
                    style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                    <span className="flex-1">{fetchError}</span>
                    <button onClick={() => setFetchError(null)} className="text-[#F87171]/50 hover:text-[#F87171]">✕</button>
                </div>
            )}

            {/* Filters */}
            <div className="flex flex-wrap gap-2 mb-6">
                <div className="flex gap-1 bg-white/5 border border-white/10 rounded-xl p-1">
                    {PERIODS.map(p => (
                        <button key={p.key} onClick={() => setPeriod(p.key)}
                            className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${period === p.key ? 'bg-[#B735B8] text-white' : 'text-white/40 hover:text-white/70'}`}>
                            {p.label}
                        </button>
                    ))}
                </div>
                {campaigns.length > 1 && (
                    <select value={selectedCampaign} onChange={e => setSelectedCampaign(e.target.value)}
                        className="bg-[#0B1B2B] border border-white/20 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-white/10 [&>option]:bg-[#0B1B2B]">
                        <option value="ALL">Todas las campañas</option>
                        {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                )}
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-32 gap-3">
                    <Loader2 size={28} className="animate-spin text-[#B735B8]" />
                    <p className="text-white/30 text-sm">Cargando métricas desde Meta Ads...</p>
                </div>
            ) : daily.length === 0 ? (
                <div className="text-center py-24 bg-white/[0.015] border border-dashed border-white/8 rounded-3xl">
                    <BarChart3 size={32} className="text-white/20 mx-auto mb-3" />
                    <p className="text-white/40 font-bold text-sm">Sin datos para este período</p>
                    <p className="text-white/20 text-xs mt-1">Las campañas publicadas aparecerán aquí</p>
                    <Link href="/dashboard/services/ads/meta" className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-[#B735B8] hover:underline">
                        ← Volver a Campañas
                    </Link>
                </div>
            ) : (
                <>
                    {/* Summary cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-5">
                        {summaryCards.map(({ label, value, color, icon: Icon }) => (
                            <div key={label} className="bg-white/3 border border-white/8 rounded-2xl p-3.5">
                                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color }}>
                                    <Icon size={10} /> {label}
                                </div>
                                <p className="text-lg font-black tabular-nums">{value}</p>
                            </div>
                        ))}
                    </div>

                    {/* Chart */}
                    <div className="bg-white/3 border border-white/8 rounded-2xl p-4 md:p-5 mb-4">
                        <div className="flex flex-wrap gap-2 mb-5">
                            {METRICS.map(m => {
                                const on = activeMetrics.has(m.key)
                                return (
                                    <button key={m.key} onClick={() => toggleMetric(m.key)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all"
                                        style={on
                                            ? { background: m.color + '20', borderColor: m.color + '50', color: m.color }
                                            : { background: '#0B1B2B', borderColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.3)' }}>
                                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: on ? m.color : 'rgba(255,255,255,0.2)', display: 'inline-block', flexShrink: 0 }} />
                                        {m.label}
                                    </button>
                                )
                            })}
                        </div>
                        <MultiLineChart days={daily} activeMetrics={activeMetrics} />
                    </div>

                    {/* Per-campaign totals */}
                    {totals.length > 1 && (
                        <div className="bg-white/3 border border-white/8 rounded-2xl overflow-hidden mb-4">
                            <div className="px-4 py-3 border-b border-white/6">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">Por campaña</p>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="border-b border-white/5">
                                            {['Campaña', 'Gasto', 'Clics enlace', 'Impresiones', 'Alcance', 'Conv. WA', 'Conversiones', 'CTR', 'CPC', 'CPM'].map(h => (
                                                <th key={h} className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-[#64748B]">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {totals.map(t => (
                                            <tr key={t.campaignId} className="border-b border-white/4 hover:bg-white/[0.02] transition-colors">
                                                <td className="px-4 py-2.5 font-bold text-white/80 max-w-[180px] truncate">{t.campaignName}</td>
                                                <td className="px-4 py-2.5 font-bold" style={{ color: '#22C55E' }}>${t.spend}</td>
                                                <td className="px-4 py-2.5 font-bold" style={{ color: '#B735B8' }}>{fmt(t.linkClicks ?? t.clicks)}</td>
                                                <td className="px-4 py-2.5" style={{ color: '#4C97D8' }}>{fmt(t.impressions)}</td>
                                                <td className="px-4 py-2.5" style={{ color: '#FF2D95' }}>{fmt(t.reach ?? 0)}</td>
                                                <td className="px-4 py-2.5 font-bold" style={{ color: '#25D366' }}>{fmt(t.conversations ?? 0)}</td>
                                                <td className="px-4 py-2.5" style={{ color: '#FBBF24' }}>{fmt(t.conversions ?? 0)}</td>
                                                <td className="px-4 py-2.5" style={{ color: '#22C55E' }}>{t.ctr}%</td>
                                                <td className="px-4 py-2.5" style={{ color: '#B735B8' }}>${t.cpc}</td>
                                                <td className="px-4 py-2.5" style={{ color: '#4C97D8' }}>${t.cpm ?? '0.00'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Daily breakdown */}
                    <div className="bg-white/3 border border-white/8 rounded-2xl overflow-hidden">
                        <div className="px-4 py-3 border-b border-white/6">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">Detalle diario</p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="border-b border-white/5">
                                        {['Fecha', 'Gasto', 'Clics enlace', 'Impresiones', 'Alcance', 'Conv. WA', 'Conversiones', 'CTR', 'CPC', 'CPM'].map(h => (
                                            <th key={h} className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest text-[#64748B]">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {[...daily].reverse().map(d => {
                                        const lc = d.linkClicks ?? 0
                                        const dayCtr = d.impressions > 0 ? ((lc / d.impressions) * 100).toFixed(2) : '0.00'
                                        const dayCpc = lc > 0 ? (d.spend / lc).toFixed(2) : '0.00'
                                        const dayCpm = d.impressions > 0 ? ((d.spend / d.impressions) * 1000).toFixed(2) : '0.00'
                                        return (
                                            <tr key={d.date} className="border-b border-white/4 hover:bg-white/[0.02] transition-colors">
                                                <td className="px-4 py-2.5 text-white/60 font-medium">{fmtShort(d.date)}</td>
                                                <td className="px-4 py-2.5 font-bold" style={{ color: '#22C55E' }}>${d.spend.toFixed(2)}</td>
                                                <td className="px-4 py-2.5 font-bold" style={{ color: '#B735B8' }}>{fmt(lc)}</td>
                                                <td className="px-4 py-2.5" style={{ color: '#4C97D8' }}>{fmt(d.impressions)}</td>
                                                <td className="px-4 py-2.5" style={{ color: '#FF2D95' }}>{fmt(d.reach ?? 0)}</td>
                                                <td className="px-4 py-2.5 font-bold" style={{ color: '#25D366' }}>{fmt(d.conversations ?? 0)}</td>
                                                <td className="px-4 py-2.5" style={{ color: '#FBBF24' }}>{fmt(d.conversions ?? 0)}</td>
                                                <td className="px-4 py-2.5" style={{ color: '#22C55E' }}>{dayCtr}%</td>
                                                <td className="px-4 py-2.5" style={{ color: '#B735B8' }}>${dayCpc}</td>
                                                <td className="px-4 py-2.5" style={{ color: '#4C97D8' }}>${dayCpm}</td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}
