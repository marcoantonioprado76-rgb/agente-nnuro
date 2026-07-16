'use client'

import { useState, useEffect, Suspense } from 'react'
import AIKeySelector from '@/components/AIKeySelector'
import {
    Megaphone, Plus, ArrowRight, ArrowLeft, CheckCircle2,
    Sparkles, FileText, Zap, BarChart3, Settings2,
    AlertCircle, Loader2, Brain, Rocket, TrendingUp,
    Play, Pause, Clock, XCircle, RefreshCw, Target, ChevronRight,
    Flame, Activity, Trash2
} from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

const PLATFORMS = [
    { id: 'META', label: 'Meta Ads', sub: 'Facebook & Instagram', color: '#0081FB', letter: 'f', textColor: 'text-[#4C97D8]', glow: 'rgba(0,129,251,0.15)', comingSoon: false },
]

const STATUS_LABELS: Record<string, { label: string; color: string; dot: string; bg: string }> = {
    DRAFT:      { label: 'Borrador',   color: 'text-white/40',   dot: 'bg-white/25',              bg: 'bg-white/5 border-white/10' },
    READY:      { label: 'Listo',      color: 'text-[#4C97D8]',   dot: 'bg-[#4C97D8]',              bg: 'bg-[#4C97D8]/10 border-white/10' },
    PUBLISHING: { label: 'Publicando', color: 'text-[#FBBF24]', dot: 'bg-[#FBBF24] animate-pulse', bg: 'bg-[#FBBF24]/10 border-[#FBBF24]/20' },
    PUBLISHED:  { label: 'Publicado',  color: 'text-[#22C55E]',dot: 'bg-[#22C55E]',           bg: 'bg-[#22C55E]/10 border-[#22C55E]/20' },
    FAILED:     { label: 'Fallido',    color: 'text-[#F87171]',    dot: 'bg-[#F87171]',               bg: 'bg-[#F87171]/10 border-[#F87171]/20' },
    PAUSED:     { label: 'Pausado',    color: 'text-[#FB923C]', dot: 'bg-[#FB923C]',            bg: 'bg-[#FB923C]/10 border-[#FB923C]/20' },
}

export default function AdsDashboard() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen">
                <div className="w-8 h-8 border-2 border-[#E4E9F0] border-t-[#147e95] rounded-full animate-spin" />
            </div>
        }>
            <AdsDashboardInner />
        </Suspense>
    )
}

function AdsDashboardInner() {
    const [integrations, setIntegrations] = useState<any[]>([])
    const [campaigns, setCampaigns] = useState<any[]>([])
    const [brief, setBrief] = useState<any>(null)
    const [allBriefs, setAllBriefs] = useState<any[]>([])
    const [openaiConfig, setOpenaiConfig] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [actionLoading, setActionLoading] = useState<string | null>(null)
    // Detalle de la conexión de Meta (páginas, IG, números, cuenta, business) — auto-carga
    const [metaDetails, setMetaDetails] = useState<any>(null)
    const [loadingMetaDetails, setLoadingMetaDetails] = useState(false)
    // Negocio seleccionado → filtra las campañas mostradas (null = todas)
    const [selectedBriefId, setSelectedBriefId] = useState<string | null>(null)
    const searchParams = useSearchParams()

    useEffect(() => {
        const err = searchParams.get('error')
        if (err) setError(decodeURIComponent(err))
        fetchAll()
    }, [searchParams])

    async function fetchAll() {
        setLoading(true)
        try {
            const [intRes, campaignRes, briefRes, oaiRes] = await Promise.all([
                fetch('/api/ads/integrations/status', { signal: AbortSignal.timeout(15000) }),
                fetch('/api/ads/campaign', { signal: AbortSignal.timeout(15000) }),
                fetch('/api/ads/brief', { signal: AbortSignal.timeout(15000) }),
                fetch('/api/ads/config/openai', { signal: AbortSignal.timeout(15000) })
            ])
            const [iData, cData, bData, oData] = await Promise.all([
                intRes.json(), campaignRes.json(), briefRes.json(), oaiRes.json()
            ])
            setIntegrations(iData.integrations || [])
            setCampaigns(cData.campaigns || [])
            setBrief(bData.brief || null)
            setAllBriefs(bData.briefs || [])
            setOpenaiConfig(oData.config || null)
            // Auto-cargar detalles de Meta (páginas/IG/WhatsApp/cuenta/business) si está conectado
            const metaConn = (iData.integrations || []).some((i: any) => i.platform === 'META' && i.status === 'CONNECTED')
            if (metaConn) loadMetaDetails()
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    async function loadMetaDetails() {
        setLoadingMetaDetails(true)
        try {
            const res = await fetch('/api/ads/integrations/meta/details', { signal: AbortSignal.timeout(15000) })
            const data = await res.json().catch(() => ({}))
            if (res.ok) setMetaDetails(data)
        } catch { /* sin detalles */ }
        finally { setLoadingMetaDetails(false) }
    }

    const handleConnect = async (platformId: string) => {
        try {
            const res = await fetch(`/api/ads/integrations/${platformId.toLowerCase()}/connect/start`, { method: 'POST' })
            const { authUrl } = await res.json()
            if (authUrl) window.location.href = authUrl
        } catch { alert('Error al conectar plataforma') }
    }

    const handlePause = async (campaignId: string) => {
        setActionLoading(campaignId + '-pause')
        try {
            const res = await fetch(`/api/ads/campaign/${campaignId}/pause`, { method: 'POST' })
            const data = await res.json()
            if (!res.ok) { setError(data.error || 'Error al pausar'); return }
            setCampaigns(prev => prev.map(c => c.id === campaignId ? { ...c, status: 'PAUSED' } : c))
        } catch { setError('Error al pausar campaña') }
        finally { setActionLoading(null) }
    }

    const handleResume = async (campaignId: string) => {
        setActionLoading(campaignId + '-resume')
        try {
            const res = await fetch(`/api/ads/campaign/${campaignId}/resume`, { method: 'POST' })
            const data = await res.json()
            if (!res.ok) { setError(data.error || 'Error al reanudar'); return }
            setCampaigns(prev => prev.map(c => c.id === campaignId ? { ...c, status: 'PUBLISHED' } : c))
        } catch { setError('Error al reanudar campaña') }
        finally { setActionLoading(null) }
    }

    const handleDeleteCampaign = async (campaignId: string) => {
        if (!confirm('¿Eliminar esta campaña? Si está publicada, también se eliminará de Meta. Esta acción no se puede deshacer.')) return
        setActionLoading(campaignId + '-delete')
        try {
            const res = await fetch(`/api/ads/campaign/${campaignId}`, { method: 'DELETE' })
            const data = await res.json().catch(() => ({}))
            if (!res.ok) { setError(data.error || 'Error al eliminar'); return }
            setCampaigns(prev => prev.filter(c => c.id !== campaignId))
        } catch { setError('Error al eliminar campaña') }
        finally { setActionLoading(null) }
    }

    const hasOpenAI = openaiConfig?.isValid
    const hasBrief = !!brief
    const hasIntegration = integrations.some(i => i.status === 'CONNECTED')
    const allReady = hasOpenAI && hasBrief && hasIntegration
    const stepsCompleted = [hasOpenAI, hasBrief, hasIntegration].filter(Boolean).length

    const published = campaigns.filter(c => c.status === 'PUBLISHED').length
    const drafts = campaigns.filter(c => ['DRAFT', 'READY'].includes(c.status)).length
    const failed = campaigns.filter(c => c.status === 'FAILED').length

    // Campañas filtradas por el negocio seleccionado (null = todas)
    const selectedBriefName = allBriefs.find((b: any) => b.id === selectedBriefId)?.name
    const visibleCampaigns = selectedBriefId ? campaigns.filter((c: any) => c.briefId === selectedBriefId) : campaigns

    return (
        <div className="px-4 md:px-6 xl:px-10 pt-6 pb-28 max-w-screen-2xl mx-auto text-white">

            <div className="mb-4 flex justify-end"><AIKeySelector compact /></div>

            {/* ── HEADER ─────────────────────────────── */}
            <div className="relative rounded-3xl overflow-hidden mb-7 p-6 md:p-8"
                style={{ background: 'radial-gradient(120% 80% at 50% -10%, rgba(0,229,208,0.16), #212e38 58%), linear-gradient(180deg, #212e38 0%, #273842 60%, #1a262f 100%)', border: '1px solid rgba(255,255,255,0.08)' }}>

                {/* glow orbs */}
                <div className="pointer-events-none absolute -top-10 -left-10 w-56 h-56 rounded-full blur-[80px]" style={{ background: 'rgba(0,229,208,0.18)' }} />
                <div className="pointer-events-none absolute -bottom-10 right-20 w-40 h-40 rounded-full blur-[70px]" style={{ background: 'rgba(35,59,143,0.12)' }} />

                <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard/services/ads"
                            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 hover:bg-white/10 transition-all"
                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                            title="Volver a plataformas">
                            <ArrowLeft size={16} className="text-white/50" />
                        </Link>
                        <div className="w-13 h-13 rounded-2xl flex items-center justify-center shrink-0"
                            style={{ background: 'linear-gradient(135deg, rgba(0,129,251,0.3), rgba(35,59,143,0.2))', border: '1px solid rgba(0,129,251,0.35)', width: 52, height: 52 }}>
                            <span className="text-white font-black text-xl">f</span>
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-0.5">
                                <h1 className="text-2xl md:text-3xl font-black tracking-tight leading-none">
                                    Meta Ads
                                </h1>
                                <span className="text-2xl md:text-3xl font-black tracking-tight leading-none text-transparent bg-clip-text"
                                    style={{ backgroundImage: 'linear-gradient(90deg, #1fb8bb, #147e95)' }}>
                                    AI
                                </span>
                            </div>
                            <p className="text-xs text-white/35 font-medium">Facebook & Instagram · Impulsado por IA</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-nowrap overflow-x-auto scrollbar-hide -mx-1 px-1">
                        <Link href="/dashboard/services/ads/wizard"
                            className="shrink-0 flex items-center gap-2 text-white text-sm font-bold px-3 sm:px-5 py-2.5 rounded-xl transition-all active:scale-[0.97] shadow-[0_0_30px_rgba(0,229,208,0.35)]"
                            style={{ background: 'linear-gradient(135deg, #1fb8bb 0%, #147e95 52%, #12303a 100%)' }}>
                            <Plus size={15} />
                            <span className="hidden sm:inline">Nueva&nbsp;</span>Campaña
                        </Link>
                        <Link href="/dashboard/services/ads/brief?new=1"
                            className="group relative shrink-0 flex items-center gap-2 text-white text-sm font-black px-3 sm:px-5 py-2.5 rounded-xl transition-all active:scale-[0.97] overflow-hidden animate-pulse-glow"
                            style={{ background: 'linear-gradient(135deg, #1fb8bb 0%, #147e95 52%, #12303a 100%)' }}>
                            {/* brillo que cruza */}
                            <span className="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700"
                                style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)' }} />
                            <Sparkles size={15} className="relative animate-pulse" />
                            <span className="relative"><span className="hidden sm:inline">Crear&nbsp;</span>Negocio</span>
                            <span className="relative text-[8px] font-black px-1.5 py-0.5 rounded-full bg-white/25 leading-none">IA</span>
                        </Link>
                        <Link href="/dashboard/services/ads/analytics"
                            className="shrink-0 flex items-center gap-2 text-white/60 text-sm font-bold px-3 sm:px-4 py-2.5 rounded-xl hover:bg-white/10 transition-all"
                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <Activity size={14} />
                            <span className="hidden sm:inline">Analytics</span>
                        </Link>
                        <Link href="/dashboard/services/ads/history"
                            className="shrink-0 flex items-center gap-2 text-white/60 text-sm font-bold px-3 sm:px-4 py-2.5 rounded-xl hover:bg-white/10 transition-all"
                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <BarChart3 size={14} />
                            <span className="hidden sm:inline">Historial</span>
                        </Link>
                        <button onClick={fetchAll}
                            className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-white/40 hover:text-white transition-all"
                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <RefreshCw size={14} />
                        </button>
                    </div>
                </div>
            </div>

            {/* error */}
            {error && (
                <div className="mb-5 p-4 rounded-2xl flex items-start gap-3 text-[#F87171] text-sm"
                    style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                    <AlertCircle size={16} className="shrink-0 mt-0.5" />
                    <p className="flex-1 text-xs"><b>Error:</b> {error}</p>
                    <button onClick={() => setError(null)} className="text-xs hover:underline shrink-0">✕</button>
                </div>
            )}

            {loading ? (
                <div className="flex flex-col items-center justify-center py-36 gap-4">
                    <div className="relative">
                        <div className="w-12 h-12 rounded-full border-2 border-[#E4E9F0] border-t-[#147e95] animate-spin" />
                        <div className="absolute inset-0 rounded-full blur-md" style={{ background: 'rgba(0,229,208,0.1)' }} />
                    </div>
                    <p className="text-[#64748B] text-xs font-medium tracking-widest uppercase">Cargando</p>
                </div>
            ) : (
                <div className="space-y-6">

                    {/* ── SETUP ───────────────────────────── */}
                    {!allReady && (
                        <div className="rounded-3xl p-5 md:p-6" style={{ background: '#212e38', border: '1px solid rgba(255,255,255,0.07)' }}>
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2.5">
                                    <Rocket size={15} className="text-[#147e95]" />
                                    <span className="font-bold text-sm">Configura para empezar</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="flex gap-1">
                                        {[0,1,2].map(i => (
                                            <div key={i} className={`h-1 w-8 rounded-full transition-all duration-500 ${i < stepsCompleted ? 'bg-[#147e95]' : 'bg-white/8'}`} />
                                        ))}
                                    </div>
                                    <span className="text-[10px] text-white/30 font-bold tabular-nums">{stepsCompleted}/3</span>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                {[
                                    { label: 'API Key de OpenAI', done: hasOpenAI, href: '/dashboard/services/ads/setup', icon: Brain, desc: 'Genera copies con IA' },
                                    { label: 'Perfil de Negocio', done: hasBrief, href: '/dashboard/services/ads/brief', icon: FileText, desc: 'Info de tu negocio' },
                                    { label: 'Plataforma', done: hasIntegration, href: '/dashboard/services/ads/setup', icon: Zap, desc: 'Conecta Meta Ads' },
                                ].map((step, idx) => {
                                    const Icon = step.icon
                                    return (
                                        <Link key={idx} href={step.href}
                                            className={`group flex items-center gap-3 p-3.5 rounded-2xl border transition-all active:scale-[0.98] ${step.done
                                                ? 'bg-[#22C55E]/5 border-[#22C55E]/15'
                                                : 'bg-white/2 border-white/6 hover:border-white/10 hover:bg-[#147e95]/5'}`}>
                                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${step.done ? 'bg-[#22C55E]/15' : 'bg-white/4 group-hover:bg-[#147e95]/12'}`}>
                                                {step.done
                                                    ? <CheckCircle2 size={15} className="text-[#22C55E]" />
                                                    : <Icon size={15} className="text-white/35 group-hover:text-[#147e95] transition-colors" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-bold truncate">{step.label}</p>
                                                <p className="text-[10px] text-white/25 truncate">{step.done ? '✓ Completado' : step.desc}</p>
                                            </div>
                                            {!step.done && <ChevronRight size={12} className="text-white/15 group-hover:text-[#147e95] shrink-0 transition-colors" />}
                                        </Link>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {/* ── API KEY (acceso rápido, siempre visible) ── */}
                    <Link href="/dashboard/services/ads/setup"
                        className="flex items-center gap-3 p-3.5 rounded-2xl transition-all hover:bg-white/[0.04] active:scale-[0.995]"
                        style={{ background: '#212e38', border: `1px solid ${hasOpenAI ? 'rgba(52,211,153,0.2)' : 'rgba(251,146,60,0.28)'}` }}>
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                            style={{ background: hasOpenAI ? 'rgba(52,211,153,0.12)' : 'rgba(251,146,60,0.12)' }}>
                            <Brain size={16} className={hasOpenAI ? 'text-[#22C55E]' : 'text-[#FB923C]'} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold flex items-center gap-1.5">
                                API Key de OpenAI
                                {hasOpenAI && <CheckCircle2 size={12} className="text-[#22C55E]" />}
                            </p>
                            <p className="text-[10px] text-white/30 truncate">
                                {hasOpenAI ? '✓ Configurada — genera textos e imágenes con IA' : 'Falta configurar — necesaria para generar con IA'}
                            </p>
                        </div>
                        <span className="text-[10px] font-bold px-3 py-1.5 rounded-xl shrink-0"
                            style={{ background: 'rgba(0,229,208,0.15)', border: '1px solid rgba(255,255,255,0.08)', color: '#4dfae8' }}>
                            {hasOpenAI ? 'Reconfigurar' : 'Configurar'}
                        </span>
                    </Link>

                    {/* ── STATS ───────────────────────────── */}
                    {campaigns.length > 0 && (
                        <div className="grid grid-cols-4 gap-2 sm:gap-3">
                            {[
                                { label: 'Total', value: campaigns.length, icon: Target, color: 'text-white', accent: '#212e38', border: 'rgba(0,229,208,0.2)', iconColor: 'text-[#147e95]' },
                                { label: 'Publicadas', value: published, icon: Flame, color: 'text-[#22C55E]', accent: '#212e38', border: 'rgba(52,211,153,0.18)', iconColor: 'text-[#22C55E]' },
                                { label: 'Borradores', value: drafts, icon: Clock, color: 'text-[#4C97D8]', accent: '#212e38', border: 'rgba(35,59,143,0.18)', iconColor: 'text-[#4C97D8]' },
                                { label: 'Fallidas', value: failed, icon: XCircle, color: 'text-[#F87171]', accent: '#212e38', border: 'rgba(248,113,113,0.18)', iconColor: 'text-[#F87171]' },
                            ].map(stat => {
                                const Icon = stat.icon
                                return (
                                    <div key={stat.label} className="relative overflow-hidden rounded-2xl p-2.5 sm:p-4 flex flex-col sm:flex-row items-center gap-1 sm:gap-3 text-center sm:text-left"
                                        style={{ background: stat.accent, border: `1px solid ${stat.border}` }}>
                                        <div className="w-10 h-10 rounded-xl hidden sm:flex items-center justify-center shrink-0"
                                            style={{ background: 'rgba(255,255,255,0.04)' }}>
                                            <Icon size={17} className={stat.iconColor} />
                                        </div>
                                        <div>
                                            <p className={`text-xl sm:text-2xl font-black leading-none tabular-nums ${stat.color}`}>{stat.value}</p>
                                            <p className="text-[9px] sm:text-[10px] text-white/30 font-medium mt-0.5 leading-tight">{stat.label}</p>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}

                    {/* ── PLATAFORMAS (barra de ancho completo) ── */}
                    {/* Plataformas */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-[#64748B]">Plataformas</span>
                                <Link href="/dashboard/services/ads/setup" className="flex items-center gap-1 text-[10px] text-[#147e95] hover:underline">
                                    <Settings2 size={10} /> Configurar
                                </Link>
                            </div>
                            <div className="space-y-2">
                                {PLATFORMS.map(platform => {
                                    const integration = integrations.find(i => i.platform === platform.id)
                                    const isConnected = integration?.status === 'CONNECTED'
                                    return (
                                        <div key={platform.id}
                                            className="relative overflow-hidden rounded-2xl p-3.5"
                                            style={{
                                                background: platform.comingSoon ? '#212e38' : isConnected ? 'linear-gradient(120deg, #3A5688 0%, #294468 52%, #1E355A 100%)' : '#212e38',
                                                border: platform.comingSoon ? '1px dashed rgba(255,255,255,0.05)' : isConnected ? '1px solid rgba(255,255,255,0.14)' : '1px dashed rgba(255,255,255,0.07)',
                                                opacity: platform.comingSoon ? 0.5 : 1,
                                                boxShadow: isConnected && !platform.comingSoon ? '0 18px 44px -24px rgba(11,27,43,0.65)' : 'none',
                                            }}>
                                            <div className="pointer-events-none absolute -top-6 -right-6 w-20 h-20 rounded-full blur-[40px]"
                                                style={{ background: isConnected && !platform.comingSoon ? platform.glow : 'transparent' }} />

                                            <div className="relative flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                                                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                                <span className={`font-black text-sm ${platform.textColor}`}>{platform.letter}</span>
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-xs leading-tight">{platform.label}</p>
                                                {isConnected && !platform.comingSoon && integration?.connectedAccount
                                                    ? <p className="text-[10px] text-white/30 truncate">↳ {integration.connectedAccount.displayName}</p>
                                                    : <p className="text-[10px] text-white/20 truncate">{platform.sub}</p>
                                                }
                                            </div>

                                            {platform.comingSoon
                                                ? <span className="flex items-center gap-1 text-[9px] font-black px-2 py-1 rounded-full shrink-0"
                                                    style={{ background: 'rgba(251,146,60,0.12)', border: '1px solid rgba(251,146,60,0.25)', color: '#FB923C' }}>
                                                    PRÓXIMAMENTE
                                                  </span>
                                                : isConnected
                                                    ? <span className="flex items-center gap-1 text-[9px] font-black px-2 py-1 rounded-full shrink-0"
                                                        style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)', color: '#22C55E' }}>
                                                        <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] inline-block" />
                                                        ACTIVA
                                                      </span>
                                                    : null
                                            }

                                            {platform.comingSoon
                                                ? <span className="text-[10px] font-bold py-1.5 px-3 rounded-xl shrink-0 cursor-not-allowed"
                                                    style={{ background: '#212e38', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.2)' }}>
                                                    Próximamente
                                                  </span>
                                                : <button onClick={() => handleConnect(platform.id)}
                                                    className="text-[10px] font-bold py-1.5 px-3 rounded-xl shrink-0 transition-all active:scale-[0.97]"
                                                    style={{
                                                        background: isConnected ? 'rgba(255,255,255,0.14)' : 'rgba(0,229,208,0.15)',
                                                        border: isConnected ? '1px solid rgba(255,255,255,0.22)' : '1px solid rgba(255,255,255,0.08)',
                                                        color: isConnected ? '#fff' : '#4dfae8'
                                                    }}>
                                                    {isConnected ? 'Reconf.' : '+ Conectar'}
                                                  </button>
                                            }
                                            </div>

                                            {/* Panel de detalles SIEMPRE visible (cada categoría con su flechita) */}
                                            {isConnected && platform.id === 'META' && (loadingMetaDetails || metaDetails) && (
                                                <div className="relative mt-3 pt-3 border-t border-white/8">
                                                    {loadingMetaDetails && !metaDetails ? (
                                                        <div className="flex items-center gap-2 text-[11px] text-white/35 py-2">
                                                            <Loader2 size={12} className="animate-spin" /> Cargando datos de tu cuenta de Meta…
                                                        </div>
                                                    ) : metaDetails?.needsReconnect ? (
                                                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 p-2.5 rounded-xl"
                                                            style={{ background: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.25)' }}>
                                                            <p className="flex-1 text-[11px] text-[#FB923C]/90 font-medium">
                                                                ⚠ {metaDetails.error || 'Tu sesión de Meta expiró.'} Reconectá para ver páginas, Instagram y WhatsApp.
                                                            </p>
                                                            <button onClick={() => handleConnect('META')}
                                                                className="text-[10px] font-bold px-3 py-1.5 rounded-lg shrink-0 self-start sm:self-auto"
                                                                style={{ background: 'rgba(251,146,60,0.2)', border: '1px solid rgba(251,146,60,0.4)', color: '#FB923C' }}>
                                                                Reconectar Meta
                                                            </button>
                                                        </div>
                                                    ) : metaDetails ? (
                                                        <div className="grid grid-cols-5 gap-1.5 sm:gap-2.5">
                                                            <DetailBlock title="Cuenta publicitaria" emoji="🏢" items={
                                                                metaDetails.connectedAdAccount
                                                                    ? [`${metaDetails.connectedAdAccount.name || metaDetails.connectedAdAccount.id}${metaDetails.connectedAdAccount.currency ? ` · ${metaDetails.connectedAdAccount.currency}` : ''}`, ...(metaDetails.adAccounts || []).filter((a: any) => a.id !== metaDetails.connectedAdAccount.id).map((a: any) => `${a.name || a.id}${a.currency ? ` · ${a.currency}` : ''}`)]
                                                                    : (metaDetails.adAccounts || []).map((a: any) => `${a.name || a.id}${a.currency ? ` · ${a.currency}` : ''}`)
                                                            } />
                                                            <DetailBlock title="Páginas" emoji="📄" items={(metaDetails.pages || []).map((p: any) => p.name)} />
                                                            <DetailBlock title="Instagram" emoji="📸" items={metaDetails.instagrams || []} />
                                                            <DetailBlock title="WhatsApp" emoji="💬" items={metaDetails.whatsappNumbers || []} />
                                                            <DetailBlock title="Admin comercial" emoji="🏬" items={(metaDetails.businesses || []).map((b: any) => b.name)} />
                                                        </div>
                                                    ) : null}
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                    {/* ── NEGOCIOS | CAMPAÑAS (2 columnas) ── */}
                    <div className="grid grid-cols-2 gap-3 lg:gap-5 items-start">

                        {/* Mis Negocios */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-[#64748B]">Mis Negocios</span>
                                <Link href="/dashboard/services/ads/brief" className="flex items-center gap-1 text-[10px] text-[#147e95] hover:underline">
                                    Gestionar <ArrowRight size={10} />
                                </Link>
                            </div>

                            {allBriefs.length === 0 ? (
                                <Link href="/dashboard/services/ads/brief"
                                    className="flex flex-col items-center justify-center rounded-2xl py-10 gap-3 group transition-all"
                                    style={{ background: '#212e38', border: '1px dashed rgba(255,255,255,0.07)' }}>
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                                        style={{ background: 'rgba(0,229,208,0.1)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                        <FileText size={16} className="text-[#147e95]" />
                                    </div>
                                    <p className="text-xs text-white/30 font-medium">Crear perfil de negocio</p>
                                </Link>
                            ) : (
                                <div className="space-y-2">
                                    {selectedBriefId && (
                                        <button onClick={() => setSelectedBriefId(null)}
                                            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-[10px] font-bold text-[#4C97D8] bg-[#4C97D8]/10 border border-white/10 hover:bg-[#4C97D8]/15 transition-all">
                                            ✕ Quitar filtro · ver todas las campañas
                                        </button>
                                    )}
                                    {allBriefs.map((b: any) => {
                                        const sel = selectedBriefId === b.id
                                        return (
                                        <div key={b.id}
                                            onClick={() => setSelectedBriefId(sel ? null : b.id)}
                                            className="flex flex-wrap lg:flex-nowrap items-center gap-2 lg:gap-3 rounded-2xl px-3 py-2.5 lg:px-3.5 lg:py-3 group cursor-pointer transition-all"
                                            style={{ background: sel ? 'rgba(0,229,208,0.14)' : '#212e38', border: sel ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(255,255,255,0.07)' }}>
                                            <div className="flex items-center gap-2 min-w-0 w-full lg:w-auto lg:flex-1">
                                                <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                                                    style={{ background: sel ? 'rgba(0,229,208,0.25)' : 'rgba(0,229,208,0.12)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                                    <FileText size={13} className="text-[#147e95]" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-bold truncate">{b.name}</p>
                                                    <p className="text-[10px] text-white/25 truncate">{b.industry}</p>
                                                </div>
                                                {sel && <span className="text-[9px] font-black px-2 py-0.5 rounded-full shrink-0 bg-[#147e95]/20 text-[#147e95] border border-white/10">FILTRANDO</span>}
                                            </div>
                                            <div className="flex items-center gap-1.5 w-full lg:w-auto shrink-0">
                                                <Link href={`/dashboard/services/ads/brief?edit=${b.id}`}
                                                    onClick={e => e.stopPropagation()}
                                                    className="flex items-center justify-center gap-1 text-[10px] font-bold px-2.5 py-1.5 rounded-xl flex-1 lg:flex-none transition-all active:scale-[0.97] text-white/50 hover:text-white"
                                                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)' }}
                                                    title="Editar negocio">
                                                    <Settings2 size={10} /> Editar
                                                </Link>
                                                <Link href={`/dashboard/services/ads/wizard?briefId=${b.id}`}
                                                    onClick={e => e.stopPropagation()}
                                                    className="flex items-center justify-center gap-1 text-[10px] font-bold px-3 py-1.5 rounded-xl flex-1 lg:flex-none transition-all active:scale-[0.97]"
                                                    style={{ background: 'rgba(0,229,208,0.7)', color: '#e9d5ff', border: '1px solid rgba(255,255,255,0.08)' }}>
                                                    Campaña <ArrowRight size={9} />
                                                </Link>
                                            </div>
                                        </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>

                    {/* ── CAMPAÑAS RECIENTES (columna derecha) ── */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2 min-w-0">
                                <TrendingUp size={12} className="text-white/30 shrink-0" />
                                <span className="text-[10px] font-bold uppercase tracking-widest text-[#64748B] shrink-0">Campañas</span>
                                {selectedBriefName && (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#147e95]/15 border border-white/10 text-[#147e95] truncate">
                                        {selectedBriefName}
                                    </span>
                                )}
                            </div>
                            {selectedBriefId
                                ? <button onClick={() => setSelectedBriefId(null)} className="text-[10px] text-[#4C97D8] hover:underline shrink-0">Ver todas ✕</button>
                                : campaigns.length > 0 && <Link href="/dashboard/services/ads/history" className="text-[10px] text-[#147e95] hover:underline shrink-0">Ver todas →</Link>
                            }
                        </div>

                        {visibleCampaigns.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 gap-4 rounded-3xl text-center px-4"
                                style={{ background: '#212e38', border: '1px dashed rgba(255,255,255,0.07)' }}>
                                <div className="w-14 h-14 rounded-full flex items-center justify-center"
                                    style={{ background: 'rgba(0,229,208,0.1)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                    <Sparkles className="text-[#147e95]" size={22} />
                                </div>
                                <div>
                                    <p className="text-white/40 text-sm font-bold mb-1">{selectedBriefName ? `Sin campañas para ${selectedBriefName}` : 'Sin campañas todavía'}</p>
                                    <p className="text-white/20 text-xs">Crea tu primera campaña impulsada por IA</p>
                                </div>
                                <Link href={selectedBriefId ? `/dashboard/services/ads/wizard?briefId=${selectedBriefId}` : '/dashboard/services/ads/wizard'}
                                    className="flex items-center gap-2 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-all"
                                    style={{ background: 'linear-gradient(135deg, #1fb8bb 0%, #147e95 52%, #12303a 100%)' }}>
                                    <Plus size={14} /> Crear campaña
                                </Link>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {visibleCampaigns.slice(0, 5).map((campaign: any) => {
                                    const status = STATUS_LABELS[campaign.status] || STATUS_LABELS['DRAFT']
                                    const platform = PLATFORMS.find(p => p.id === campaign.platform)
                                    return (
                                        <div key={campaign.id}
                                            className="group rounded-2xl p-3 lg:p-4 flex flex-wrap lg:flex-nowrap items-center gap-2 lg:gap-3 transition-all"
                                            style={{ background: '#212e38', border: '1px solid rgba(255,255,255,0.07)' }}
                                            onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)')}
                                            onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)')}>

                                            <div className="flex items-center gap-2.5 min-w-0 w-full lg:w-auto lg:flex-1">
                                                {/* platform icon */}
                                                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                                                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                                    {platform && <span className={`font-black text-sm ${platform.textColor}`}>{platform.letter}</span>}
                                                </div>

                                                {/* info */}
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-bold text-sm leading-tight truncate">{campaign.name}</p>
                                                    <p className="text-[10px] text-white/25 truncate mt-0.5">{campaign.strategy?.name || campaign.brief?.name}</p>
                                                </div>
                                            </div>

                                            {/* status + action */}
                                            <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto shrink-0">
                                                <span className={`flex items-center gap-1 text-[9px] font-black uppercase px-2 py-1 rounded-full border ${status.bg} ${status.color}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                                                    {status.label}
                                                </span>
                                                {campaign.status === 'READY' && (
                                                    <Link href={`/dashboard/services/ads/preview/${campaign.id}`}
                                                        className="text-[10px] font-bold px-3 py-1.5 rounded-xl transition-all"
                                                        style={{ background: 'rgba(0,229,208,0.7)', color: '#e9d5ff', border: '1px solid rgba(255,255,255,0.08)' }}>
                                                        Publicar →
                                                    </Link>
                                                )}
                                                {campaign.status === 'DRAFT' && (
                                                    <Link href={`/dashboard/services/ads/campaign/${campaign.strategyId || campaign.id}?edit=${campaign.id}`}
                                                        className="text-[10px] font-bold px-3 py-1.5 rounded-xl transition-all"
                                                        style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                                        Continuar
                                                    </Link>
                                                )}
                                                {campaign.status === 'FAILED' && (
                                                    <Link href={`/dashboard/services/ads/preview/${campaign.id}`}
                                                        className="text-[10px] font-bold px-3 py-1.5 rounded-xl transition-all"
                                                        style={{ background: 'rgba(239,68,68,0.1)', color: '#F87171', border: '1px solid rgba(239,68,68,0.25)' }}>
                                                        Reintentar
                                                    </Link>
                                                )}
                                                {campaign.status === 'PUBLISHED' && (
                                                    <button
                                                        onClick={() => handlePause(campaign.id)}
                                                        disabled={actionLoading === campaign.id + '-pause'}
                                                        className="flex items-center gap-1 text-[10px] font-bold px-3 py-1.5 rounded-xl transition-all disabled:opacity-40"
                                                        style={{ background: 'rgba(251,146,60,0.1)', color: '#FB923C', border: '1px solid rgba(251,146,60,0.25)' }}>
                                                        {actionLoading === campaign.id + '-pause' ? <Loader2 size={10} className="animate-spin" /> : <Pause size={10} />}
                                                        Pausar
                                                    </button>
                                                )}
                                                {campaign.status === 'PAUSED' && (
                                                    <button
                                                        onClick={() => handleResume(campaign.id)}
                                                        disabled={actionLoading === campaign.id + '-resume'}
                                                        className="flex items-center gap-1 text-[10px] font-bold px-3 py-1.5 rounded-xl transition-all disabled:opacity-40"
                                                        style={{ background: 'rgba(52,211,153,0.1)', color: '#22C55E', border: '1px solid rgba(52,211,153,0.25)' }}>
                                                        {actionLoading === campaign.id + '-resume' ? <Loader2 size={10} className="animate-spin" /> : <Play size={10} />}
                                                        Reanudar
                                                    </button>
                                                )}
                                                {(campaign.status === 'PUBLISHED' || campaign.status === 'PAUSED') && (
                                                    <Link href={`/dashboard/services/ads/campaign/${campaign.strategyId || campaign.id}?edit=${campaign.id}`}
                                                        className="text-[10px] font-bold px-3 py-1.5 rounded-xl transition-all"
                                                        style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                                        Editar
                                                    </Link>
                                                )}
                                                <button
                                                    onClick={() => handleDeleteCampaign(campaign.id)}
                                                    disabled={actionLoading === campaign.id + '-delete'}
                                                    title="Eliminar campaña"
                                                    className="flex items-center gap-1 text-[10px] font-bold px-3 py-1.5 rounded-xl transition-all disabled:opacity-40"
                                                    style={{ background: 'rgba(239,68,68,0.1)', color: '#F87171', border: '1px solid rgba(239,68,68,0.25)' }}>
                                                    {actionLoading === campaign.id + '-delete' ? <Loader2 size={10} className="animate-spin" /> : <Trash2 size={10} />}
                                                    Eliminar
                                                </button>
                                            </div>
                                        </div>
                                    )
                                })}

                                <Link href="/dashboard/services/ads/history"
                                    className="flex items-center justify-center gap-2 py-3 rounded-2xl text-xs text-white/30 font-bold hover:text-white/60 transition-all"
                                    style={{ background: '#212e38', border: '1px solid rgba(255,255,255,0.06)' }}>
                                    Ver todas las campañas <ArrowRight size={11} />
                                </Link>
                            </div>
                        )}
                    </div>
                    {/* end grid */}
                </div>

                </div>
            )}
        </div>
    )
}

/** Bloque de detalle con flechita: colapsado muestra 1, expandido muestra todos. */
function DetailBlock({ title, emoji, items }: { title: string; emoji: string; items: string[] }) {
    const [open, setOpen] = useState(false)
    const list = items || []
    const multiple = list.length > 1
    return (
        <div className="rounded-lg sm:rounded-xl p-2 sm:p-3" style={{ background: '#FFFFFF', border: '1px solid #E4E9F0', boxShadow: '0 6px 14px -8px rgba(17,24,39,0.18)' }}>
            <button onClick={() => multiple && setOpen(o => !o)}
                className={`w-full flex items-center gap-1 ${multiple ? 'cursor-pointer' : 'cursor-default'}`}>
                <span className="text-[7.5px] sm:text-[9.5px] font-bold uppercase tracking-wide text-[#64748B] flex-1 text-left truncate leading-tight">{emoji} {title}</span>
                {list.length > 0 && (
                    <span className="text-[8px] sm:text-[10px] font-black tabular-nums px-1.5 py-0.5 rounded-md shrink-0" style={{ background: '#F1F4F8', color: '#64748B' }}>
                        {list.length}{multiple ? '+' : ''}
                    </span>
                )}
            </button>
            {list.length === 0 ? (
                <p className="text-[10px] sm:text-[12px] mt-1" style={{ color: '#9AA3AF' }}>—</p>
            ) : (
                <ul className="mt-1 space-y-0.5">
                    {(open ? list : list.slice(0, 1)).map((it, i) => (
                        <li key={i} className="text-[10px] sm:text-[12px] font-semibold truncate leading-tight" style={{ color: '#1F2937' }} title={it}>{it}</li>
                    ))}
                    {!open && multiple && (
                        <li onClick={() => setOpen(true)} className="text-[9px] sm:text-[11px] font-bold cursor-pointer" style={{ color: '#2563EB' }}>+{list.length - 1} más ▾</li>
                    )}
                </ul>
            )}
        </div>
    )
}
