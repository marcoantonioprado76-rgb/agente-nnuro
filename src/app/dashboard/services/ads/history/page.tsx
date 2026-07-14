'use client'

import { useState, useEffect } from 'react'
import {
    ArrowLeft, Loader2, ExternalLink, RefreshCw, BarChart3,
    AlertCircle, TrendingUp, Eye, MousePointerClick, DollarSign,
    Users, ChevronDown, ChevronUp, Sparkles, Plus, Trash2
} from 'lucide-react'
import Link from 'next/link'

const STATUS_LABELS: Record<string, { label: string; color: string; dot: string }> = {
    DRAFT: { label: 'Borrador', color: 'text-white/50 bg-white/5 border-white/10', dot: 'bg-white/30' },
    READY: { label: 'Listo', color: 'text-[#4C97D8] bg-[#4C97D8]/10 border-white/10', dot: 'bg-[#4C97D8]' },
    PUBLISHING: { label: 'Publicando', color: 'text-[#FBBF24] bg-[#FBBF24]/10 border-[#FBBF24]/20', dot: 'bg-[#FBBF24] animate-pulse' },
    PUBLISHED: { label: 'Publicado', color: 'text-[#22C55E] bg-[#22C55E]/10 border-[#22C55E]/20', dot: 'bg-[#22C55E]' },
    FAILED: { label: 'Error', color: 'text-[#F87171] bg-[#F87171]/10 border-[#F87171]/20', dot: 'bg-[#F87171]' },
    PAUSED: { label: 'Pausado', color: 'text-[#FB923C] bg-[#FB923C]/10 border-[#FB923C]/20', dot: 'bg-[#FB923C]' },
}

const PLATFORM_MAP: Record<string, { letter: string; color: string }> = {
    META: { letter: 'f', color: 'text-[#4C97D8]' },
    TIKTOK: { letter: 'T', color: 'text-[#F87171]' },
    GOOGLE_ADS: { letter: 'G', color: 'text-[#FBBF24]' },
}

const FILTERS = ['ALL', 'DRAFT', 'READY', 'PUBLISHED', 'PAUSED', 'FAILED']
const FILTER_LABELS: Record<string, string> = {
    ALL: 'Todas', DRAFT: 'Borrador', READY: 'Listo',
    PUBLISHED: 'Publicadas', PAUSED: 'Pausadas', FAILED: 'Fallidas'
}

interface Metric {
    impressions: number; clicks: number; spend: number; reach: number
    ctr: number; cpm: number; error?: string
}

function fmt(n: number) {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
    return String(n)
}

export default function HistoryPage() {
    const [campaigns, setCampaigns] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState('ALL')
    const [refreshing, setRefreshing] = useState(false)
    const [metrics, setMetrics] = useState<Record<string, Metric>>({})
    const [loadingMetrics, setLoadingMetrics] = useState(false)
    const [expandedMetrics, setExpandedMetrics] = useState<Set<string>>(new Set())
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
    const [deleting, setDeleting] = useState<string | null>(null)

    useEffect(() => { fetchCampaigns() }, [])

    async function fetchCampaigns(showRefreshing = false) {
        if (showRefreshing) setRefreshing(true)
        else setLoading(true)
        try {
            const res = await fetch('/api/ads/campaign')
            const data = await res.json()
            const list = data.campaigns || []
            setCampaigns(list)
            // Auto-fetch metrics for published campaigns
            const publishedIds = list.filter((c: any) => c.status === 'PUBLISHED' && c.providerCampaignId).map((c: any) => c.id)
            if (publishedIds.length > 0) fetchMetrics(publishedIds)
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }

    async function fetchMetrics(ids: string[]) {
        if (ids.length === 0) return
        setLoadingMetrics(true)
        try {
            const res = await fetch(`/api/ads/metrics?days=7`)
            if (!res.ok) return
            const data = await res.json()
            // API returns { totals: [{ campaignId, spend, impressions, clicks, conversions, ctr, cpc }] }
            const map: Record<string, Metric> = {}
            for (const t of (data.totals || [])) {
                if (!ids.includes(t.campaignId)) continue
                map[t.campaignId] = {
                    impressions: t.impressions || 0,
                    clicks: t.clicks || 0,
                    spend: parseFloat(t.spend) || 0,
                    reach: 0,
                    ctr: parseFloat(t.ctr) || 0,
                    cpm: t.impressions > 0 ? parseFloat(t.spend) / t.impressions * 1000 : 0,
                }
            }
            setMetrics(prev => ({ ...prev, ...map }))
        } catch { /* metrics are optional */ } finally {
            setLoadingMetrics(false)
        }
    }

    async function deleteCampaign(id: string) {
        setDeleting(id)
        try {
            await fetch(`/api/ads/campaign/${id}`, { method: 'DELETE' })
            setCampaigns(prev => prev.filter(c => c.id !== id))
            setConfirmDelete(null)
        } finally {
            setDeleting(null)
        }
    }

    const filtered = filter === 'ALL' ? campaigns : campaigns.filter(c => c.status === filter)

    // Aggregate metrics for published campaigns
    const totalPublished = campaigns.filter(c => c.status === 'PUBLISHED').length
    const metricValues = Object.values(metrics) as Metric[]
    const totalImpressions = metricValues.reduce((s, m) => s + (m.impressions || 0), 0)
    const totalClicks = metricValues.reduce((s, m) => s + (m.clicks || 0), 0)
    const totalSpend = metricValues.reduce((s, m) => s + (m.spend || 0), 0)
    const totalReach = metricValues.reduce((s, m) => s + (m.reach || 0), 0)

    return (
        <div className="px-4 md:px-6 pt-6 max-w-screen-2xl mx-auto pb-24 text-white" style={{ background: 'radial-gradient(120% 55% at 50% -5%, rgba(183,53,184,0.12), rgba(255,255,255,0) 55%), radial-gradient(90% 55% at 100% 108%, rgba(106,53,217,0.10), rgba(255,255,255,0) 60%), linear-gradient(180deg, #081624 0%, #050B14 100%)', minHeight: 'calc(100vh - 2rem)', borderRadius: 24, border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 30px 60px -30px rgba(8,22,36,0.5)' }}>

            {/* Header */}
            <div className="flex items-center gap-3 mb-7">
                <Link href="/dashboard/services/ads/meta"
                    className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all shrink-0">
                    <ArrowLeft size={15} />
                </Link>
                <div className="flex-1 min-w-0">
                    <h1 className="text-lg md:text-xl font-black uppercase tracking-tighter">Historial de Campañas</h1>
                    <p className="text-[11px] text-white/30">{campaigns.length} campañas · {totalPublished} activas</p>
                </div>
                <div className="flex items-center gap-2">
                    <Link href="/dashboard/services/ads/wizard"
                        className="hidden sm:flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-[#B735B8] text-white hover:bg-[#B735B8] transition-all">
                        <Plus size={13} /> Nueva
                    </Link>
                    <button onClick={() => fetchCampaigns(true)}
                        className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all shrink-0">
                        <RefreshCw size={14} className={refreshing ? 'animate-spin text-[#B735B8]' : ''} />
                    </button>
                </div>
            </div>

            {/* Global metrics summary — last 30 days */}
            {totalPublished > 0 && (
                <div className="mb-2">
                    <p className="text-[10px] text-white/25 font-bold uppercase tracking-widest mb-2">Últimos 30 días</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                    {[
                        { icon: <Eye size={14} />, label: 'Impresiones', value: fmt(totalImpressions), color: 'text-[#4C97D8]' },
                        { icon: <MousePointerClick size={14} />, label: 'Clics', value: fmt(totalClicks), color: 'text-[#B735B8]' },
                        { icon: <DollarSign size={14} />, label: 'Gasto', value: `$${totalSpend.toFixed(2)}`, color: 'text-[#22C55E]' },
                        { icon: <Users size={14} />, label: 'Alcance', value: fmt(totalReach), color: 'text-[#FB923C]' },
                    ].map(({ icon, label, value, color }) => (
                        <div key={label} className="bg-white/3 border border-white/8 rounded-2xl p-4">
                            <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest mb-2 ${color}`}>
                                {icon} {label}
                            </div>
                            <p className="text-lg font-black">
                                {loadingMetrics ? <span className="w-12 h-4 bg-white/5 rounded animate-pulse inline-block" /> : value}
                            </p>
                        </div>
                    ))}
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap">
                {FILTERS.map(s => {
                    const count = s === 'ALL' ? campaigns.length : campaigns.filter(c => c.status === s).length
                    return (
                        <button key={s} onClick={() => setFilter(s)}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border whitespace-nowrap shrink-0 ${filter === s
                                ? 'bg-white text-black border-white'
                                : 'bg-white/5 border-white/10 text-white/40 hover:border-white/25 hover:text-white/70'
                            }`}>
                            {FILTER_LABELS[s]}
                            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${filter === s ? 'bg-black/10' : 'bg-white/8'}`}>
                                {count}
                            </span>
                        </button>
                    )
                })}
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-24 gap-3">
                    <Loader2 className="animate-spin text-[#B735B8]" size={28} />
                    <p className="text-white/30 text-sm">Cargando campañas...</p>
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-20 bg-white/[0.015] border border-dashed border-white/8 rounded-3xl">
                    <BarChart3 size={28} className="text-white/20 mx-auto mb-3" />
                    <p className="text-white/30 text-sm font-bold">Sin campañas</p>
                    <p className="text-white/20 text-xs mt-1 mb-6">No hay campañas con este filtro</p>
                    <Link href="/dashboard/services/ads/wizard"
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#B735B8] text-white text-sm font-bold rounded-xl hover:bg-[#B735B8] transition-all">
                        <Sparkles size={14} /> Crear primera campaña
                    </Link>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map((campaign: any) => {
                        const status = STATUS_LABELS[campaign.status] || STATUS_LABELS['DRAFT']
                        const plat = PLATFORM_MAP[campaign.platform]
                        const creativesWithMedia = campaign.creatives?.filter((c: any) => c.mediaUrl).length || 0
                        const campaignMetrics: Metric | undefined = metrics[campaign.id]
                        const hasMetrics = !!campaignMetrics && !campaignMetrics.error && campaignMetrics.impressions > 0
                        const metricsExpanded = expandedMetrics.has(campaign.id)

                        return (
                            <div key={campaign.id}
                                className="bg-white/3 border border-white/8 rounded-2xl p-4 md:p-5 hover:border-white/15 transition-all">

                                {/* Top row */}
                                <div className="flex items-start gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                                        {plat && <span className={`font-black text-base ${plat.color}`}>{plat.letter}</span>}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start gap-2 justify-between">
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-bold text-sm leading-tight line-clamp-1">{campaign.name}</h4>
                                                <p className="text-[11px] text-white/30 truncate mt-0.5">
                                                    {campaign.strategy?.name}{campaign.brief?.name ? ` · ${campaign.brief.name}` : ''}
                                                </p>
                                            </div>
                                            <span className={`shrink-0 flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-1 rounded-full border ${status.color}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                                                {status.label}
                                            </span>
                                        </div>

                                        {/* Meta info chips */}
                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
                                            {campaign.dailyBudgetUSD > 0 && (
                                                <span className="text-[10px] text-white/25 font-medium">${campaign.dailyBudgetUSD}/día</span>
                                            )}
                                            <span className="text-[10px] text-white/25">{campaign.creatives?.length || 0} anuncios · {creativesWithMedia} con creativo</span>
                                            {campaign.publishedAt && (
                                                <span className="text-[10px] text-white/20">
                                                    {new Date(campaign.publishedAt).toLocaleDateString('es', { day: 'numeric', month: 'short', year: '2-digit' })}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Inline metrics for published campaigns */}
                                {campaign.status === 'PUBLISHED' && (
                                    <>
                                        {loadingMetrics && !campaignMetrics ? (
                                            <div className="mt-3 grid grid-cols-4 gap-2">
                                                {[0, 1, 2, 3].map(i => (
                                                    <div key={i} className="h-12 bg-white/3 rounded-xl animate-pulse" />
                                                ))}
                                            </div>
                                        ) : hasMetrics ? (
                                            <div className="mt-3">
                                                <div className="grid grid-cols-4 gap-2">
                                                    {[
                                                        { label: 'Impresiones', value: fmt(campaignMetrics!.impressions), color: 'text-[#4C97D8]' },
                                                        { label: 'Clics', value: fmt(campaignMetrics!.clicks), color: 'text-[#B735B8]' },
                                                        { label: 'Gasto', value: `$${campaignMetrics!.spend.toFixed(2)}`, color: 'text-[#22C55E]' },
                                                        { label: 'Alcance', value: fmt(campaignMetrics!.reach), color: 'text-[#FB923C]' },
                                                    ].map(({ label, value, color }) => (
                                                        <div key={label} className="bg-white/3 rounded-xl p-2.5 text-center">
                                                            <p className={`text-sm font-black ${color}`}>{value}</p>
                                                            <p className="text-[9px] text-white/25 mt-0.5">{label}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                                {/* CTR / CPM row */}
                                                {metricsExpanded && (
                                                    <div className="grid grid-cols-2 gap-2 mt-2">
                                                        <div className="bg-white/3 rounded-xl p-2.5 flex items-center gap-2">
                                                            <TrendingUp size={13} className="text-white/30" />
                                                            <div>
                                                                <p className="text-xs font-bold">{campaignMetrics!.ctr.toFixed(2)}%</p>
                                                                <p className="text-[9px] text-white/25">CTR</p>
                                                            </div>
                                                        </div>
                                                        <div className="bg-white/3 rounded-xl p-2.5 flex items-center gap-2">
                                                            <DollarSign size={13} className="text-white/30" />
                                                            <div>
                                                                <p className="text-xs font-bold">${campaignMetrics!.cpm.toFixed(2)}</p>
                                                                <p className="text-[9px] text-white/25">CPM</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                                <button
                                                    onClick={() => setExpandedMetrics(prev => {
                                                        const next = new Set(prev)
                                                        next.has(campaign.id) ? next.delete(campaign.id) : next.add(campaign.id)
                                                        return next
                                                    })}
                                                    className="w-full flex items-center justify-center gap-1 text-[10px] text-white/20 hover:text-white/40 mt-1.5 transition-all">
                                                    {metricsExpanded ? <><ChevronUp size={11} /> Menos métricas</> : <><ChevronDown size={11} /> CTR y CPM</>}
                                                </button>
                                            </div>
                                        ) : campaignMetrics?.error ? (
                                            <div className="mt-3 p-2.5 bg-white/3 rounded-xl flex items-center gap-2">
                                                <AlertCircle size={12} className="text-white/20 shrink-0" />
                                                <p className="text-[10px] text-white/25">{campaignMetrics.error}</p>
                                            </div>
                                        ) : null}
                                    </>
                                )}

                                {/* Failure reason */}
                                {campaign.status === 'FAILED' && campaign.failureReason && (
                                    <div className="mt-3 p-3 bg-[#F87171]/5 border border-[#F87171]/15 rounded-xl flex items-start gap-2">
                                        <AlertCircle size={13} className="text-[#F87171]/70 shrink-0 mt-0.5" />
                                        <p className="text-[11px] text-[#F87171]/70">{campaign.failureReason}</p>
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/5">
                                    {campaign.status === 'READY' && (
                                        <Link href={`/dashboard/services/ads/preview/${campaign.id}`}
                                            className="flex-1 sm:flex-none text-center text-xs font-bold px-4 py-2 rounded-xl bg-[#B735B8] text-white hover:bg-[#B735B8] transition-all">
                                            Publicar →
                                        </Link>
                                    )}
                                    {campaign.status === 'DRAFT' && (
                                        <Link href={`/dashboard/services/ads/campaign/${campaign.strategyId || campaign.id}?edit=${campaign.id}`}
                                            className="flex-1 sm:flex-none text-center text-xs font-bold px-4 py-2 rounded-xl bg-white/8 text-white/60 hover:bg-white/15 transition-all">
                                            Continuar editando →
                                        </Link>
                                    )}
                                    {campaign.status === 'FAILED' && (
                                        <Link href={`/dashboard/services/ads/preview/${campaign.id}`}
                                            className="flex-1 sm:flex-none text-center text-xs font-bold px-4 py-2 rounded-xl bg-[#F87171]/10 border border-[#F87171]/20 text-[#F87171] hover:bg-[#F87171]/20 transition-all">
                                            Reintentar
                                        </Link>
                                    )}
                                    {campaign.status === 'PUBLISHED' && campaign.providerCampaignId && (
                                        <a href="https://business.facebook.com/adsmanager" target="_blank" rel="noopener noreferrer"
                                            className="flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl bg-[#4C97D8]/10 border border-white/10 text-[#4C97D8] hover:bg-[#4C97D8]/20 transition-all">
                                            <ExternalLink size={12} /> Ads Manager
                                        </a>
                                    )}

                                    <div className="ml-auto flex items-center gap-2">
                                        {campaign.status === 'PUBLISHED' && campaign.providerCampaignId && (
                                            <button onClick={() => fetchMetrics([campaign.id])} className="text-white/20 hover:text-white/50 transition-all">
                                                <RefreshCw size={12} className={loadingMetrics ? 'animate-spin' : ''} />
                                            </button>
                                        )}

                                        {/* Delete */}
                                        {confirmDelete === campaign.id ? (
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-[10px] text-white/40">¿Eliminar?</span>
                                                <button
                                                    onClick={() => deleteCampaign(campaign.id)}
                                                    disabled={deleting === campaign.id}
                                                    className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-[#F87171]/20 border border-[#F87171]/30 text-[#F87171] hover:bg-[#F87171]/35 transition-all disabled:opacity-50"
                                                >
                                                    {deleting === campaign.id ? <Loader2 size={10} className="animate-spin" /> : 'Sí, eliminar'}
                                                </button>
                                                <button
                                                    onClick={() => setConfirmDelete(null)}
                                                    className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-white/40 hover:bg-white/10 transition-all"
                                                >
                                                    Cancelar
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => setConfirmDelete(campaign.id)}
                                                className="text-white/20 hover:text-[#F87171] transition-all"
                                                title="Eliminar campaña"
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
