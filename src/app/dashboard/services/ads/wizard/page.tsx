'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
    ArrowLeft, ArrowRight, Building2, Sparkles, Loader2,
    CheckCircle2, AlertCircle, Plus, Target, Globe,
    MessageCircle, Eye, ShoppingCart, DollarSign,
    Brain, RefreshCw, Pencil, X, Save, Bookmark, Trash2,
    Smartphone, Heart, BookMarked, Clock, Image as ImageIcon, Video
} from 'lucide-react'
import { AiThinking } from '@/components/ads/AiThinking'
import Link from 'next/link'

interface Brief { id: string; name: string; industry: string; description: string }
interface Strategy {
    id: string; name: string; description: string; reason?: string; platform: string
    objective: string; destination: string; mediaType: string; mediaCount: number
    minBudgetUSD: number; advantageType: string; savedByUser?: boolean
}

const PLATFORM_LABELS: Record<string, { label: string; letter: string; color: string; bg: string }> = {
    META: { label: 'Meta Ads', letter: 'f', color: 'text-[#4C97D8]', bg: 'bg-[#4C97D8]/15 border-white/10' },
    TIKTOK: { label: 'TikTok Ads', letter: 'T', color: 'text-[#FF2D95]', bg: 'bg-[#FF2D95]/15 border-white/10' },
    GOOGLE_ADS: { label: 'Google Ads', letter: 'G', color: 'text-[#FBBF24]', bg: 'bg-[#FBBF24]/15 border-[#FBBF24]/25' },
}

const OBJECTIVE_ICONS: Record<string, React.ReactNode> = {
    conversions: <ShoppingCart size={11} />,
    leads: <MessageCircle size={11} />,
    traffic: <Globe size={11} />,
    awareness: <Eye size={11} />,
    engagement: <Heart size={11} />,
    app_promotion: <Smartphone size={11} />,
}

const OBJECTIVE_LABELS: Record<string, string> = {
    conversions: 'Ventas',
    leads: 'Clientes potenciales',
    traffic: 'Tráfico',
    awareness: 'Reconocimiento',
    engagement: 'Interacción',
    app_promotion: 'Promoción de app',
}

const OBJECTIVE_COLORS: Record<string, string> = {
    conversions: 'text-[#22C55E]',
    leads: 'text-[#4C97D8]',
    traffic: 'text-[#4C97D8]',
    awareness: 'text-[#B735B8]',
    engagement: 'text-[#FF2D95]',
    app_promotion: 'text-[#FB923C]',
}

const DESTINATION_LABELS: Record<string, string> = {
    whatsapp: 'WhatsApp',
    instagram: 'Instagram',
    website: 'Sitio web',
    messenger: 'Messenger',
    tiktok: 'TikTok',
}

function WizardContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const initialBriefId = searchParams.get('briefId')

    const [step, setStep] = useState<1 | 2>(initialBriefId ? 2 : 1)
    const [briefs, setBriefs] = useState<Brief[]>([])
    const [aiStrategies, setAiStrategies] = useState<Strategy[]>([])
    const [savedStrategies, setSavedStrategies] = useState<Strategy[]>([])
    const [activeTab, setActiveTab] = useState<'ai' | 'saved'>('ai')
    const [selectedBrief, setSelectedBrief] = useState<Brief | null>(null)
    const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(null)
    const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null)
    const [showPlatformPicker, setShowPlatformPicker] = useState(false)
    const [showAdTypePicker, setShowAdTypePicker] = useState(false)
    const [selectedObjective, setSelectedObjective] = useState<string | null>(null)
    const [selectedDestination, setSelectedDestination] = useState<string | null>(null)
    const [selectedMediaPref, setSelectedMediaPref] = useState<string | null>(null)
    const [loadingBriefs, setLoadingBriefs] = useState(true)
    const [loadingAI, setLoadingAI] = useState(false)
    const [loadingSaved, setLoadingSaved] = useState(false)
    const [creating, setCreating] = useState(false)
    const [creatingId, setCreatingId] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [aiError, setAiError] = useState<string | null>(null)

    // Strategy editing
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editForm, setEditForm] = useState<Partial<Strategy>>({})
    const [saving, setSaving] = useState(false)
    const [savingStrategyId, setSavingStrategyId] = useState<string | null>(null)
    const [deletingId, setDeletingId] = useState<string | null>(null)

    const strategies = activeTab === 'ai' ? aiStrategies : savedStrategies

    useEffect(() => {
        fetch('/api/ads/brief').then(r => r.json()).then(data => {
            const allBriefs: Brief[] = data.briefs || []
            setBriefs(allBriefs)
            // Flujo unificado: si hay al menos un negocio, entrar DIRECTO a estrategias
            // (con selector de negocio arriba). El paso 1 solo aparece si NO hay negocios.
            if (initialBriefId) {
                const found = allBriefs.find(b => b.id === initialBriefId)
                enterStrategies(found || allBriefs[0])
            } else if (allBriefs.length >= 1) {
                enterStrategies(allBriefs[0])
            }
            setLoadingBriefs(false)
        }).catch(() => setLoadingBriefs(false))
    }, [initialBriefId])

    // Como solo existe Meta Ads, saltamos el selector de plataforma y vamos directo
    // a las estrategias del negocio (con la opción de generar con IA).
    function enterStrategies(brief: Brief) {
        setStep(2)
        setSelectedBrief(brief)
        setSelectedPlatform('META')
        setShowPlatformPicker(false)
        setShowAdTypePicker(false)
        setSelectedStrategy(null)
        setSelectedObjective(null)
        setSelectedDestination(null)
        setSelectedMediaPref(null)
        setAiStrategies([])
        setAiError(null)
        setEditingId(null)
        loadSavedStrategies(brief, 'META')
    }

    function pickPlatform(platform: string) {
        setSelectedPlatform(platform)
        setShowPlatformPicker(false)
        setShowAdTypePicker(true)
        setSelectedObjective(null)
        setSelectedDestination(null)
        setSelectedMediaPref(null)
        setSelectedStrategy(null)
        setAiStrategies([])
        setSavedStrategies([])
        setAiError(null)
    }

    // Carga las estrategias guardadas del negocio (filtradas por negocio + plataforma).
    function loadSavedStrategies(brief: Brief | null, platform: string, objective?: string | null, destination?: string | null) {
        setShowAdTypePicker(false)
        setSelectedStrategy(null)
        setAiStrategies([])
        setSavedStrategies([])
        setAiError(null)
        setLoadingSaved(true)
        const params = new URLSearchParams({ savedOnly: 'true', platform })
        if (brief) params.set('briefId', brief.id)
        if (objective) params.set('objective', objective)
        if (destination) params.set('destination', destination)
        fetch(`/api/ads/strategies?${params}`)
            .then(r => r.json())
            .then(data => {
                const saved = (data.strategies || []).map((s: any) => ({
                    ...s,
                    description: s.description?.includes('||REASON:') ? s.description.split('||REASON:')[0] : s.description,
                    reason: s.description?.includes('||REASON:') ? s.description.split('||REASON:')[1] : undefined,
                    savedByUser: true,
                }))
                setSavedStrategies(saved)
                setActiveTab(saved.length > 0 ? 'saved' : 'ai')
            })
            .catch(() => { setSavedStrategies([]); setActiveTab('ai') })
            .finally(() => setLoadingSaved(false))
    }

    // Genera con IA usando las opciones elegidas (objetivo/destino/creativo) y muestra el resultado
    async function confirmAdType() {
        if (!selectedPlatform) return
        setShowAdTypePicker(false)
        setActiveTab('ai')
        await retryAI()
    }

    async function retryAI() {
        if (!selectedBrief || !selectedPlatform) return
        setLoadingAI(true)
        setAiError(null)
        setAiStrategies([])
        try {
            const res = await fetch('/api/ads/strategies/suggest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    briefId: selectedBrief.id,
                    platform: selectedPlatform,
                    objective: selectedObjective || undefined,
                    destination: selectedDestination || undefined,
                    mediaType: selectedMediaPref || undefined,
                })
            })
            let data: any = {}
            try { data = await res.json() } catch { }
            if (!res.ok) setAiError(data.error || 'Error al generar estrategias')
            else setAiStrategies(data.strategies || [])
        } catch (e: any) {
            setAiError(e?.message || 'Error de conexión')
        } finally {
            setLoadingAI(false)
        }
    }

    function startEdit(strategy: Strategy) {
        setEditingId(strategy.id)
        setEditForm({
            name: strategy.name,
            description: strategy.description,
            platform: strategy.platform,
            objective: strategy.objective,
            destination: strategy.destination,
            mediaType: strategy.mediaType,
            mediaCount: strategy.mediaCount,
            minBudgetUSD: strategy.minBudgetUSD,
        })
    }

    async function saveEdit(strategyId: string) {
        setSaving(true)
        try {
            const res = await fetch(`/api/ads/strategies/${strategyId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editForm)
            })
            const data = await res.json()
            if (!res.ok) { setError(data.error || 'Error al guardar'); return }
            const update = (list: Strategy[]) => list.map(s => s.id === strategyId ? { ...s, ...editForm } : s)
            setAiStrategies(update)
            setSavedStrategies(update)
            if (selectedStrategy?.id === strategyId) setSelectedStrategy(prev => prev ? { ...prev, ...editForm } : prev)
            setEditingId(null)
        } catch { setError('Error de conexión') }
        finally { setSaving(false) }
    }

    async function toggleSaveStrategy(strategy: Strategy) {
        setSavingStrategyId(strategy.id)
        const newSaved = !strategy.savedByUser
        try {
            const res = await fetch(`/api/ads/strategies/${strategy.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ savedByUser: newSaved })
            })
            if (res.ok) {
                const update = (list: Strategy[]) => list.map(s => s.id === strategy.id ? { ...s, savedByUser: newSaved } : s)
                setAiStrategies(update)
                setSavedStrategies(update)
            }
        } catch { }
        finally { setSavingStrategyId(null) }
    }

    async function deleteStrategy(strategyId: string) {
        setDeletingId(strategyId)
        try {
            const res = await fetch(`/api/ads/strategies/${strategyId}`, { method: 'DELETE' })
            const data = await res.json()
            if (!res.ok) { setError(data.error || 'Error al eliminar'); return }
            const remove = (list: Strategy[]) => list.filter(s => s.id !== strategyId)
            setAiStrategies(remove)
            setSavedStrategies(remove)
            if (selectedStrategy?.id === strategyId) setSelectedStrategy(null)
        } catch { setError('Error de conexión') }
        finally { setDeletingId(null) }
    }

    // Crea la campaña directo desde una estrategia (sin paso de "seleccionar")
    async function createCampaign(strategyArg?: Strategy) {
        const strat = strategyArg || selectedStrategy
        if (!selectedBrief || !strat) return
        setCreating(true); setCreatingId(strat.id); setError(null)
        try {
            const name = `${selectedBrief.name} · ${strat.name}`
            const res = await fetch('/api/ads/campaign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    briefId: selectedBrief.id,
                    strategyId: strat.id,
                    name,
                    dailyBudgetUSD: strat.minBudgetUSD || 5,
                })
            })
            const data = await res.json()
            if (!res.ok) { setError(data.error || 'Error al crear campaña'); setCreating(false); setCreatingId(null); return }
            router.push(`/dashboard/services/ads/campaign/${strat.id}?edit=${data.campaign.id}`)
        } catch {
            setError('Error de conexión'); setCreating(false); setCreatingId(null)
        }
    }

    const isLoadingStrategies = activeTab === 'ai' ? loadingAI : loadingSaved
    const plat = selectedPlatform ? PLATFORM_LABELS[selectedPlatform] : null

    return (
        <div className="px-4 md:px-6 xl:px-8 pt-6 max-w-3xl xl:max-w-4xl mx-auto pb-24 text-white" style={{ background: 'radial-gradient(120% 55% at 50% -5%, rgba(183,53,184,0.12), rgba(255,255,255,0) 55%), radial-gradient(90% 55% at 100% 108%, rgba(106,53,217,0.10), rgba(255,255,255,0) 60%), linear-gradient(180deg, #081624 0%, #050B14 100%)', minHeight: 'calc(100vh - 2rem)', borderRadius: 24, border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 30px 60px -30px rgba(8,22,36,0.5)' }}>

            {/* Overlay animado al crear el anuncio (antes de ir al editor) */}
            {creating && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#050B14]/90 backdrop-blur-sm">
                    <AiThinking messages={[
                        'Creando tu anuncio…',
                        'Preparando los creativos…',
                        'Configurando la campaña…',
                        'Aplicando tu estrategia…',
                        'Casi listo…',
                    ]} />
                </div>
            )}

            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <Link href="/dashboard/services/ads/meta" className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all">
                    <ArrowLeft size={16} />
                </Link>
                <div className="flex-1">
                    <h1 className="text-xl font-black uppercase tracking-tighter">Nueva Campaña</h1>
                    <p className="text-xs text-white/30">Negocio → Estrategia → Publicar</p>
                </div>
            </div>

            {error && (
                <div className="mb-5 p-4 bg-[#F87171]/10 border border-[#F87171]/20 rounded-2xl flex gap-3 text-[#F87171] text-sm">
                    <AlertCircle size={16} className="shrink-0 mt-0.5" />
                    <p className="flex-1">{error}</p>
                    <button onClick={() => setError(null)} className="font-bold text-xs">✕</button>
                </div>
            )}

            {/* ── Step 1: Select Brief ── */}
            {step === 1 && (
                <div>
                    <div className="mb-6">
                        <h2 className="text-lg font-black">¿Para qué negocio?</h2>
                        <p className="text-xs text-white/30 mt-1">La IA analizará tu negocio y sugerirá las mejores estrategias</p>
                    </div>

                    {loadingBriefs ? (
                        <div className="flex items-center justify-center py-16"><Loader2 className="animate-spin text-[#B735B8]" size={24} /></div>
                    ) : briefs.length === 0 ? (
                        <div className="text-center py-16 bg-white/[0.015] border border-dashed border-white/10 rounded-3xl">
                            <Building2 size={28} className="text-white/20 mx-auto mb-3" />
                            <p className="text-white/40 font-bold mb-1">Sin negocios</p>
                            <p className="text-white/20 text-xs mb-5">Crea primero el perfil de tu negocio</p>
                            <Link href="/dashboard/services/ads/brief" className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#B735B8] text-white text-sm font-bold rounded-xl hover:bg-[#B735B8] transition-all">
                                <Plus size={14} /> Crear negocio
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {briefs.map(brief => (
                                <button key={brief.id} onClick={() => enterStrategies(brief)}
                                    className="w-full text-left bg-white/3 border border-white/8 rounded-2xl p-4 hover:border-white/10 hover:bg-[#B735B8]/5 transition-all group">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-[#B735B8]/15 border border-white/10 flex items-center justify-center shrink-0">
                                            <Building2 size={18} className="text-[#B735B8]" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-sm">{brief.name}</p>
                                            <p className="text-xs text-white/40">{brief.industry}</p>
                                        </div>
                                        <ArrowRight size={16} className="text-white/20 group-hover:text-[#B735B8] transition-all" />
                                    </div>
                                </button>
                            ))}
                            <Link href="/dashboard/services/ads/brief"
                                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-dashed border-white/10 text-white/30 hover:border-white/25 hover:text-white/50 text-sm font-bold transition-all">
                                <Plus size={15} /> Agregar otro negocio
                            </Link>
                        </div>
                    )}
                </div>
            )}

            {/* ── Step 2: Platform + Strategy ── */}
            {step === 2 && (
                <div>
                    <div className="flex items-center gap-3 mb-6">
                        <button onClick={() => router.push('/dashboard/services/ads/meta')} className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all" title="Volver">
                            <ArrowLeft size={14} />
                        </button>
                        <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h2 className="text-lg font-black">
                                    {showAdTypePicker ? 'Configura tu anuncio' : 'Estrategias'}
                                </h2>
                                {plat && !showAdTypePicker && (
                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${plat.bg} ${plat.color}`}>
                                        {plat.label}
                                    </span>
                                )}
                            </div>
                            {selectedBrief && <p className="text-xs text-white/30 mt-0.5">Para: <span className="text-[#B735B8]">{selectedBrief.name}</span></p>}
                        </div>
                        {/* Selector de negocio integrado (merge del paso 1): cambiar de negocio sin salir */}
                        {!showAdTypePicker && briefs.length > 1 && (
                            <select
                                value={selectedBrief?.id || ''}
                                onChange={e => { const b = briefs.find(x => x.id === e.target.value); if (b) { setSelectedStrategy(null); enterStrategies(b) } }}
                                className="shrink-0 max-w-[40%] bg-white/5 border border-white/10 text-xs text-white/70 rounded-xl px-3 py-2 hover:bg-white/10 focus:outline-none focus:border-white/10 transition-all cursor-pointer"
                                title="Cambiar de negocio">
                                {briefs.map(b => <option key={b.id} value={b.id} className="bg-[#0b0e1a]">{b.name}</option>)}
                            </select>
                        )}
                    </div>

                    {/* ── Platform picker ── */}
                    {showPlatformPicker && (
                        <div>
                            <p className="text-xs text-white/30 mb-5 text-center">Selecciona la plataforma</p>
                            <div className="grid grid-cols-1 gap-3">
                                {[
                                    {
                                        id: 'META', label: 'Meta Ads', sub: 'Facebook & Instagram', letter: 'f',
                                        desc: 'Ideal para ventas directas por WhatsApp, leads, branding y audiencias amplias.',
                                        color: 'text-[#4C97D8]', border: 'border-white/10 hover:border-white/10',
                                        bg: 'bg-[#4C97D8]/5 hover:bg-[#4C97D8]/10', iconBg: 'bg-[#4C97D8]/15 border-white/10',
                                        comingSoon: false,
                                    },
                                ].map(p => p.comingSoon ? (
                                    <div key={p.id}
                                        className={`w-full flex items-center gap-4 p-5 rounded-2xl border text-left opacity-50 cursor-not-allowed ${p.border} ${p.bg}`}>
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${p.iconBg}`}>
                                            <span className={`font-black text-xl ${p.color}`}>{p.letter}</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <p className="font-black text-sm text-white">{p.label}</p>
                                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-white/5 border border-white/10 ${p.color}`}>{p.sub}</span>
                                                <span className="text-[9px] font-black px-2 py-0.5 rounded-full"
                                                    style={{ background: 'rgba(251,146,60,0.15)', border: '1px solid rgba(251,146,60,0.3)', color: '#FB923C' }}>
                                                    PRÓXIMAMENTE
                                                </span>
                                            </div>
                                            <p className="text-xs text-white/35 leading-relaxed">{p.desc}</p>
                                        </div>
                                        <Clock size={16} className="text-white/20 shrink-0" />
                                    </div>
                                ) : (
                                    <button key={p.id} onClick={() => pickPlatform(p.id)}
                                        className={`w-full flex items-center gap-4 p-5 rounded-2xl border text-left transition-all active:scale-[0.98] group ${p.border} ${p.bg}`}>
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${p.iconBg}`}>
                                            <span className={`font-black text-xl ${p.color}`}>{p.letter}</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <p className="font-black text-sm text-white">{p.label}</p>
                                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-white/5 border border-white/10 ${p.color}`}>{p.sub}</span>
                                                <span className="text-[9px] font-black px-2 py-0.5 rounded-full"
                                                    style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)', color: '#22C55E' }}>
                                                    DISPONIBLE
                                                </span>
                                            </div>
                                            <p className="text-xs text-white/35 leading-relaxed">{p.desc}</p>
                                        </div>
                                        <ArrowRight size={16} className={`${p.color} opacity-40 group-hover:opacity-100 shrink-0 transition-all`} />
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── Ad Type Picker ── */}
                    {showAdTypePicker && (
                        <div className="space-y-4">

                            {/* Business context */}
                            {selectedBrief && (
                                <div className="flex items-center gap-3 p-3.5 rounded-2xl border border-white/10"
                                    style={{ background: 'linear-gradient(135deg,rgba(183,53,184,0.12),rgba(37,99,235,0.05))' }}>
                                    <div className="w-9 h-9 rounded-xl bg-[#B735B8]/15 border border-white/10 flex items-center justify-center shrink-0">
                                        <Building2 size={16} className="text-[#B735B8]" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-[#B735B8]/60">Negocio</p>
                                        <p className="text-sm font-bold text-white truncate">{selectedBrief.name}</p>
                                    </div>
                                </div>
                            )}

                            <div className="text-center pt-1">
                                <h2 className="text-base font-black text-white">Configura tu anuncio</h2>
                                <p className="text-xs text-white/35 mt-1">Elige el enfoque y la IA generará estrategias a medida. <span className="text-white/25">Todo es opcional.</span></p>
                            </div>

                            {/* Step 1 · Objective */}
                            <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="w-5 h-5 rounded-full bg-[#B735B8] text-white text-[10px] font-black flex items-center justify-center shrink-0">1</span>
                                    <p className="text-xs font-bold text-white/80">¿Cuál es tu objetivo?</p>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {[
                                        { id: 'conversions', label: 'Ventas', desc: 'Compras directas', icon: ShoppingCart, color: 'text-[#22C55E]', bg: 'bg-[#22C55E]/10 border-[#22C55E]/25' },
                                        { id: 'leads', label: 'Clientes potenciales', desc: 'Captación de contactos', icon: MessageCircle, color: 'text-[#4C97D8]', bg: 'bg-[#4C97D8]/10 border-white/10' },
                                        { id: 'traffic', label: 'Tráfico', desc: 'Visitas a tu sitio', icon: Globe, color: 'text-[#4C97D8]', bg: 'bg-[#4C97D8]/10 border-white/10' },
                                        { id: 'awareness', label: 'Reconocimiento', desc: 'Dar a conocer tu marca', icon: Eye, color: 'text-[#B735B8]', bg: 'bg-[#B735B8]/10 border-white/10' },
                                        { id: 'engagement', label: 'Interacción', desc: 'Likes, mensajes, chat', icon: Heart, color: 'text-[#FF2D95]', bg: 'bg-[#FF2D95]/10 border-white/10' },
                                    ].map(obj => (
                                        <button key={obj.id} onClick={() => setSelectedObjective(selectedObjective === obj.id ? null : obj.id)}
                                            className={`flex flex-col items-start gap-1.5 p-3 rounded-xl border text-left transition-all ${selectedObjective === obj.id ? `${obj.bg} border-opacity-60` : 'bg-white/3 border-white/8 hover:border-white/20'}`}>
                                            <obj.icon size={14} className={selectedObjective === obj.id ? obj.color : 'text-white/30'} />
                                            <span className={`text-xs font-bold leading-tight ${selectedObjective === obj.id ? 'text-white' : 'text-white/50'}`}>{obj.label}</span>
                                            <span className="text-[9px] text-white/25 leading-tight">{obj.desc}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Step 2 · Destination — only for META */}
                            {selectedPlatform === 'META' && (
                                <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className="w-5 h-5 rounded-full bg-[#B735B8] text-white text-[10px] font-black flex items-center justify-center shrink-0">2</span>
                                        <p className="text-xs font-bold text-white/80">¿A dónde llevas al cliente?</p>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                        {[
                                            { id: 'whatsapp', label: 'WhatsApp', icon: '💬', color: 'text-[#22C55E]', bg: 'bg-[#22C55E]/10 border-[#22C55E]/25', hidden: selectedObjective === 'traffic' || selectedObjective === 'awareness' },
                                            { id: 'website', label: 'Sitio Web', icon: '🌐', color: 'text-[#4C97D8]', bg: 'bg-[#4C97D8]/10 border-white/10', hidden: selectedObjective === 'engagement' },
                                            { id: 'instagram', label: 'Instagram', icon: '📷', color: 'text-[#FF2D95]', bg: 'bg-[#FF2D95]/10 border-white/10', hidden: false },
                                            { id: 'messenger', label: 'Messenger', icon: '💬', color: 'text-[#B735B8]', bg: 'bg-[#B735B8]/10 border-white/10', hidden: selectedObjective === 'traffic' || selectedObjective === 'awareness' },
                                        ].filter(d => !d.hidden).map(dest => (
                                            <button key={dest.id} onClick={() => setSelectedDestination(selectedDestination === dest.id ? null : dest.id)}
                                                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left transition-all ${selectedDestination === dest.id ? `${dest.bg}` : 'bg-white/3 border-white/8 hover:border-white/20'}`}>
                                                <span className="text-base leading-none">{dest.icon}</span>
                                                <span className={`text-xs font-bold ${selectedDestination === dest.id ? 'text-white' : 'text-white/50'}`}>{dest.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Step 3 · Media type */}
                            <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="w-5 h-5 rounded-full bg-[#B735B8] text-white text-[10px] font-black flex items-center justify-center shrink-0">{selectedPlatform === 'META' ? '3' : '2'}</span>
                                    <p className="text-xs font-bold text-white/80">¿Tipo de creativo?</p>
                                </div>
                                <div className="flex gap-2">
                                    {[
                                        { id: 'image', label: 'Imagen', icon: ImageIcon },
                                        { id: 'video', label: 'Video', icon: Video },
                                    ].map(m => (
                                        <button key={m.id} onClick={() => setSelectedMediaPref(selectedMediaPref === m.id ? null : m.id)}
                                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-bold transition-all ${selectedMediaPref === m.id ? 'bg-[#B735B8]/15 border-white/10 text-[#B735B8]' : 'bg-white/3 border-white/8 text-white/40 hover:border-white/20'}`}>
                                            <m.icon size={14} /> {m.label}
                                        </button>
                                    ))}
                                    <button onClick={() => setSelectedMediaPref(null)}
                                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-bold transition-all ${!selectedMediaPref ? 'bg-white/10 border-white/25 text-white/70' : 'bg-white/3 border-white/8 text-white/30 hover:border-white/20'}`}>
                                        Ambos
                                    </button>
                                </div>
                            </div>

                            {/* Selected summary */}
                            {(selectedObjective || selectedDestination || selectedMediaPref) && (
                                <div className="flex flex-wrap gap-2 p-3 bg-[#B735B8]/5 border border-white/10 rounded-xl">
                                    <span className="text-[10px] text-[#B735B8]/60 font-bold uppercase tracking-widest w-full mb-0.5">La IA generará estrategias para:</span>
                                    {selectedObjective && <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#B735B8]/15 border border-white/10 text-[#B735B8]">{OBJECTIVE_LABELS[selectedObjective]}</span>}
                                    {selectedDestination && <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-white/8 border border-white/15 text-white/60">{DESTINATION_LABELS[selectedDestination] || selectedDestination}</span>}
                                    {selectedMediaPref && <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-white/8 border border-white/15 text-white/60">{selectedMediaPref === 'image' ? 'Imagen' : 'Video'}</span>}
                                </div>
                            )}

                            <button onClick={confirmAdType}
                                className="btn-ai-glass w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-sm text-white transition-all active:scale-[0.99]">
                                <Brain size={16} /> Generar estrategias con IA
                            </button>
                            <p className="text-center text-[10px] text-white/20">Puedes continuar sin elegir nada — la IA sugerirá lo mejor para tu negocio.</p>
                        </div>
                    )}

                    {/* ── Strategies view ── */}
                    {!showPlatformPicker && !showAdTypePicker && (
                        <>
                            {/* Acción principal: generar con IA */}
                            <button onClick={() => { setShowAdTypePicker(true); setSelectedStrategy(null) }}
                                className="btn-ai-glass w-full flex items-center justify-center gap-2 mb-4 py-3.5 rounded-2xl font-black text-sm text-white transition-all active:scale-[0.99]">
                                <Sparkles size={16} /> Generar estrategias con IA
                            </button>

                            {/* Chip: con qué opciones se generó */}
                            {activeTab === 'ai' && aiStrategies.length > 0 && (selectedObjective || selectedDestination || selectedMediaPref) && (
                                <div className="flex flex-wrap items-center gap-1.5 mb-4">
                                    <span className="text-[10px] text-white/30 font-bold uppercase tracking-widest">Generado para:</span>
                                    {selectedObjective && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#B735B8]/15 border border-white/10 text-[#B735B8]">{OBJECTIVE_LABELS[selectedObjective] || selectedObjective}</span>}
                                    {selectedDestination && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/8 border border-white/15 text-white/60">{DESTINATION_LABELS[selectedDestination] || selectedDestination}</span>}
                                    {selectedMediaPref && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/8 border border-white/15 text-white/60">{selectedMediaPref === 'image' ? 'Imagen' : 'Video'}</span>}
                                </div>
                            )}

                            {/* Encabezado de la vista actual + acceso a Guardadas */}
                            <div className="flex items-center justify-between mb-4">
                                <p className="text-xs font-black uppercase tracking-widest text-white/40 flex items-center gap-1.5">
                                    {activeTab === 'ai'
                                        ? <><Brain size={12} className="text-[#B735B8]" /> Sugerencias{aiStrategies.length > 0 ? ` (${aiStrategies.length})` : ''}</>
                                        : <><BookMarked size={12} className="text-[#22C55E]" /> Guardadas{savedStrategies.length > 0 ? ` (${savedStrategies.length})` : ''}</>
                                    }
                                </p>
                                <button
                                    onClick={() => setActiveTab(activeTab === 'ai' ? 'saved' : 'ai')}
                                    className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:border-white/20 transition-all shrink-0"
                                >
                                    {activeTab === 'ai'
                                        ? <><BookMarked size={12} /> Guardadas{savedStrategies.length > 0 ? ` (${savedStrategies.length})` : ''}</>
                                        : <><Brain size={12} /> Sugerencias{aiStrategies.length > 0 ? ` (${aiStrategies.length})` : ''}</>
                                    }
                                </button>
                            </div>

                            {/* Loading */}
                            {isLoadingStrategies && activeTab === 'ai' && (
                                <AiThinking messages={[
                                    'Analizando tu negocio…',
                                    'Diseñando estrategias a medida…',
                                    'Eligiendo objetivos y audiencias…',
                                    'Aplicando las mejores prácticas (Andromeda)…',
                                    'Definiendo presupuesto y formato…',
                                    'Casi listo…',
                                ]} className="py-16" />
                            )}
                            {isLoadingStrategies && activeTab === 'saved' && (
                                <div className="flex flex-col items-center justify-center py-20 gap-4">
                                    <div className="relative">
                                        <div className="w-14 h-14 border-2 rounded-full animate-spin border-[#22C55E]/20 border-t-[#22C55E]" />
                                        <BookMarked size={20} className="text-[#22C55E] absolute inset-0 m-auto" />
                                    </div>
                                    <p className="text-white/60 font-bold text-sm">Cargando estrategias guardadas...</p>
                                </div>
                            )}

                            {/* AI Error */}
                            {!isLoadingStrategies && activeTab === 'ai' && aiError && (
                                <div className="py-12 text-center">
                                    <AlertCircle size={28} className="text-[#F87171] mx-auto mb-3" />
                                    <p className="text-[#F87171] font-bold text-sm mb-1">Error al generar estrategias</p>
                                    <p className="text-xs text-white/30 mb-5">{aiError}</p>
                                    <button onClick={retryAI}
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-[#B735B8] rounded-xl text-sm font-bold hover:bg-[#B735B8] transition-all">
                                        <RefreshCw size={14} /> Reintentar
                                    </button>
                                </div>
                            )}

                            {/* AI empty — opción de generar con IA */}
                            {!isLoadingStrategies && activeTab === 'ai' && !aiError && aiStrategies.length === 0 && (
                                <div className="py-12 text-center">
                                    <div className="w-12 h-12 rounded-2xl bg-[#B735B8]/10 border border-white/10 flex items-center justify-center mx-auto mb-3">
                                        <Brain size={22} className="text-[#B735B8]" />
                                    </div>
                                    <p className="text-white/70 font-bold text-sm mb-1">Genera estrategias con IA</p>
                                    <p className="text-xs text-white/30 mb-5">La IA analizará tu negocio y creará estrategias de anuncios a medida.</p>
                                    <button onClick={() => setShowAdTypePicker(true)}
                                        className="btn-ai-glass inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black text-white transition-all active:scale-[0.98]">
                                        <Brain size={14} /> Generar estrategias con IA
                                    </button>
                                </div>
                            )}

                            {/* Saved empty */}
                            {!isLoadingStrategies && activeTab === 'saved' && savedStrategies.length === 0 && (
                                <div className="py-12 text-center">
                                    <BookMarked size={28} className="text-white/15 mx-auto mb-3" />
                                    <p className="text-white/40 font-bold text-sm mb-1">Sin estrategias guardadas</p>
                                    <p className="text-xs text-white/25 mb-4">Guarda una estrategia de IA para reutilizarla aquí</p>
                                    <button onClick={() => setShowAdTypePicker(true)}
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-[#B735B8]/80 rounded-xl text-sm font-bold hover:bg-[#B735B8] transition-all">
                                        <Brain size={14} /> Generar con IA
                                    </button>
                                </div>
                            )}

                            {/* Strategy cards */}
                            {!isLoadingStrategies && strategies.length > 0 && (
                                <>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 mb-6 items-start">
                                        {strategies.map(strategy => {
                                            const isSelected = selectedStrategy?.id === strategy.id
                                            const isEditing = editingId === strategy.id
                                            const stratPlat = PLATFORM_LABELS[strategy.platform]
                                            return (
                                                <div key={strategy.id}
                                                    className={`rounded-2xl border transition-all ${isSelected ? 'border-white/10 shadow-[0_0_24px_rgba(183,53,184,0.22)]' : 'border-white/12 hover:border-white/10'}`}
                                                    style={{ background: isSelected ? 'linear-gradient(160deg, rgba(183,53,184,0.16), rgba(37,99,235,0.06))' : 'linear-gradient(160deg, rgba(255,255,255,0.055), #0B1B2B)' }}>

                                                    <div className="p-4">
                                                        <div className="flex items-start gap-3">
                                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${stratPlat?.bg || 'bg-white/5 border-white/10'}`}>
                                                                <span className={`font-black text-base ${stratPlat?.color}`}>{stratPlat?.letter}</span>
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-start gap-2">
                                                                    <p className="font-bold text-sm flex-1 leading-snug">{strategy.name}</p>
                                                                    {isSelected && !isEditing && <CheckCircle2 size={16} className="text-[#B735B8] shrink-0 mt-0.5" />}
                                                                </div>
                                                                {!isEditing && (
                                                                    <>
                                                                        <p className="text-xs text-white/70 mt-1.5 leading-relaxed">{strategy.description}</p>
                                                                        {strategy.reason && (
                                                                            <div className="mt-2.5 flex items-start gap-1.5 px-3 py-2 rounded-lg"
                                                                                style={{ background: 'rgba(183,53,184,0.12)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                                                                <Sparkles size={11} className="text-[#B735B8] shrink-0 mt-0.5" />
                                                                                <p className="text-[11px] text-purple-100/90 leading-relaxed">{strategy.reason}</p>
                                                                            </div>
                                                                        )}
                                                                        <div className="flex flex-wrap items-center gap-1.5 mt-3">
                                                                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full bg-white/8 border border-white/10 ${OBJECTIVE_COLORS[strategy.objective] || 'text-white/55'}`}>
                                                                                {OBJECTIVE_ICONS[strategy.objective] || <Target size={10} />}
                                                                                {OBJECTIVE_LABELS[strategy.objective] || strategy.objective}
                                                                            </span>
                                                                            <span className="inline-flex items-center text-[10px] font-semibold px-2 py-1 rounded-full bg-white/6 border border-white/10 text-white/60">{DESTINATION_LABELS[strategy.destination] || strategy.destination}</span>
                                                                            <span className="inline-flex items-center text-[10px] font-semibold px-2 py-1 rounded-full bg-white/6 border border-white/10 text-white/60">{strategy.mediaCount} {strategy.mediaType === 'video' ? 'videos' : 'imágenes'}</span>
                                                                            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-2 py-1 rounded-full bg-[#22C55E]/12 border border-[#22C55E]/25 text-[#22C55E]">
                                                                                <DollarSign size={9} /> desde ${strategy.minBudgetUSD}/día
                                                                            </span>
                                                                        </div>
                                                                    </>
                                                                )}
                                                            </div>
                                                            <button
                                                                onClick={e => { e.stopPropagation(); isEditing ? setEditingId(null) : startEdit(strategy) }}
                                                                className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center bg-white/5 border border-white/10 hover:bg-white/15 transition-all"
                                                                title={isEditing ? 'Cancelar edición' : 'Editar estrategia'}
                                                            >
                                                                {isEditing ? <X size={12} className="text-white/50" /> : <Pencil size={12} className="text-white/40" />}
                                                            </button>
                                                        </div>

                                                        {/* Inline edit form */}
                                                        {isEditing && (
                                                            <div className="mt-4 space-y-3 border-t border-white/8 pt-4">
                                                                <div>
                                                                    <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest block mb-1">Nombre</label>
                                                                    <input
                                                                        value={editForm.name || ''}
                                                                        onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                                                                        className="w-full bg-[#0B1B2B] border border-white/20 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-white/10"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest block mb-1">Descripción</label>
                                                                    <textarea
                                                                        value={editForm.description || ''}
                                                                        onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                                                                        rows={2}
                                                                        className="w-full bg-[#0B1B2B] border border-white/20 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-white/10 resize-none"
                                                                    />
                                                                </div>
                                                                <div className="grid grid-cols-2 gap-3">
                                                                    <div>
                                                                        <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest block mb-1">Objetivo</label>
                                                                        <select value={editForm.objective || ''} onChange={e => setEditForm(f => ({ ...f, objective: e.target.value }))}
                                                                            className="w-full bg-[#0B1B2B] border border-white/20 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-white/10 [&>option]:bg-[#0B1B2B]">
                                                                            <option value="conversions">Ventas</option>
                                                                            <option value="leads">Clientes potenciales</option>
                                                                            <option value="traffic">Tráfico</option>
                                                                            <option value="awareness">Reconocimiento</option>
                                                                            <option value="engagement">Interacción</option>
                                                                            <option value="app_promotion">Promoción de app</option>
                                                                        </select>
                                                                    </div>
                                                                    <div>
                                                                        <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest block mb-1">Destino</label>
                                                                        <select value={editForm.destination || ''} onChange={e => setEditForm(f => ({ ...f, destination: e.target.value }))}
                                                                            className="w-full bg-[#0B1B2B] border border-white/20 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-white/10 [&>option]:bg-[#0B1B2B]">
                                                                            <option value="whatsapp">WhatsApp</option>
                                                                            <option value="instagram">Instagram</option>
                                                                            <option value="website">Sitio web</option>
                                                                            <option value="messenger">Messenger</option>
                                                                        </select>
                                                                    </div>
                                                                    <div>
                                                                        <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest block mb-1">Tipo media</label>
                                                                        <select value={editForm.mediaType || ''} onChange={e => setEditForm(f => ({ ...f, mediaType: e.target.value }))}
                                                                            className="w-full bg-[#0B1B2B] border border-white/20 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-white/10 [&>option]:bg-[#0B1B2B]">
                                                                            <option value="image">Imagen</option>
                                                                            <option value="video">Video</option>
                                                                            <option value="carousel">Carrusel</option>
                                                                        </select>
                                                                    </div>
                                                                    <div>
                                                                        <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest block mb-1">Cantidad creativos</label>
                                                                        <input type="number" min={1} max={20}
                                                                            value={editForm.mediaCount || 5}
                                                                            onChange={e => setEditForm(f => ({ ...f, mediaCount: parseInt(e.target.value) || 5 }))}
                                                                            className="w-full bg-[#0B1B2B] border border-white/20 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-white/10"
                                                                        />
                                                                    </div>
                                                                    <div className="col-span-2">
                                                                        <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest block mb-1">Presupuesto mín (USD/día)</label>
                                                                        <input type="number" min={1}
                                                                            value={editForm.minBudgetUSD || 5}
                                                                            onChange={e => setEditForm(f => ({ ...f, minBudgetUSD: parseFloat(e.target.value) || 5 }))}
                                                                            className="w-full bg-[#0B1B2B] border border-white/20 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-white/10"
                                                                        />
                                                                    </div>
                                                                </div>
                                                                <button onClick={() => saveEdit(strategy.id)} disabled={saving}
                                                                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#B735B8] hover:bg-[#B735B8] disabled:opacity-50 text-white text-sm font-bold transition-all">
                                                                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                                                    Guardar cambios
                                                                </button>
                                                            </div>
                                                        )}

                                                        {/* Select + Save/Delete — only when not editing */}
                                                        {!isEditing && (
                                                            <div className="mt-3 space-y-2">
                                                                <button
                                                                    onClick={() => createCampaign(strategy)}
                                                                    disabled={creating}
                                                                    className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#FF2D95] via-[#B735B8] to-[#233B8F] hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-[0_0_18px_rgba(183,53,184,0.18)]"
                                                                >
                                                                    {creatingId === strategy.id
                                                                        ? <><Loader2 size={13} className="animate-spin" /> Creando anuncio…</>
                                                                        : <><Sparkles size={13} /> Crear anuncio</>
                                                                    }
                                                                </button>
                                                                <div className="flex gap-2">
                                                                    <button
                                                                        onClick={e => { e.stopPropagation(); toggleSaveStrategy(strategy) }}
                                                                        disabled={savingStrategyId === strategy.id}
                                                                        className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-[11px] font-bold transition-all ${strategy.savedByUser
                                                                            ? 'bg-[#22C55E]/15 border border-[#22C55E]/30 text-[#22C55E] hover:bg-[#F87171]/10 hover:border-[#F87171]/25 hover:text-[#F87171]'
                                                                            : 'bg-white/4 border border-white/10 text-white/35 hover:bg-[#22C55E]/10 hover:border-[#22C55E]/25 hover:text-[#22C55E]'
                                                                        } disabled:opacity-40`}
                                                                    >
                                                                        {savingStrategyId === strategy.id
                                                                            ? <Loader2 size={11} className="animate-spin" />
                                                                            : strategy.savedByUser
                                                                                ? <><Bookmark size={11} className="fill-current" /> Guardada</>
                                                                                : <><Bookmark size={11} /> Guardar</>
                                                                        }
                                                                    </button>
                                                                    <button
                                                                        onClick={e => { e.stopPropagation(); deleteStrategy(strategy.id) }}
                                                                        disabled={deletingId === strategy.id}
                                                                        className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold bg-[#F87171]/8 border border-[#F87171]/20 text-[#F87171]/60 hover:bg-[#F87171]/15 hover:text-[#F87171] transition-all disabled:opacity-40"
                                                                    >
                                                                        {deletingId === strategy.id
                                                                            ? <Loader2 size={11} className="animate-spin" />
                                                                            : <Trash2 size={11} />
                                                                        }
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    )
}

export default function WizardPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="animate-spin text-[#B735B8]" size={28} />
            </div>
        }>
            <WizardContent />
        </Suspense>
    )
}
