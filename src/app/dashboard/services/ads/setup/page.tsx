'use client'

import { useState, useEffect } from 'react'
import { Brain, Zap, CheckCircle2, AlertCircle, Loader2, Eye, EyeOff, ArrowLeft, Settings2, Link2, Key, Sparkles } from 'lucide-react'
import Link from 'next/link'

const PLATFORMS = [
    { id: 'META', label: 'Meta Ads', sub: 'Facebook & Instagram', color: '#0081FB', letter: 'f', textColor: 'text-[#4C97D8]' },
]

export default function SetupPage() {
    const [tab, setTab] = useState<'openai' | 'platforms'>('openai')
    const [apiKey, setApiKey] = useState('')
    const [model, setModel] = useState('gpt-5.1')
    const [showKey, setShowKey] = useState(false)
    const [saving, setSaving] = useState(false)
    const [config, setConfig] = useState<any>(null)
    const [integrations, setIntegrations] = useState<any[]>([])
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const [credits, setCredits] = useState<{ enabled: boolean; balance: number }>({ enabled: false, balance: 0 })

    useEffect(() => { fetchData() }, [])

    async function fetchData() {
        const [oaiRes, intRes, credRes] = await Promise.all([
            fetch('/api/ads/config/openai'),
            fetch('/api/ads/integrations/status'),
            fetch('/api/ai-credits'),
        ])
        const [oaiData, intData, credData] = await Promise.all([oaiRes.json(), intRes.json(), credRes.json()])
        setConfig(oaiData.config)
        if (oaiData.config?.model) setModel(oaiData.config.model)
        setIntegrations(intData.integrations || [])
        setCredits({ enabled: !!credData.enabled, balance: Number(credData.balance ?? 0) })
    }

    async function handleSaveOpenAI(e: React.FormEvent) {
        e.preventDefault()
        if (!apiKey.trim()) return setError('Ingresa tu API Key')
        if (!apiKey.trim().startsWith('sk-')) return setError('La API Key debe empezar con sk-')
        setSaving(true)
        setError(null)
        setSuccess(null)
        try {
            const res = await fetch('/api/ads/config/openai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ apiKey: apiKey.trim(), model })
            })
            const data = await res.json()
            if (!res.ok) return setError(data.error || 'Error al guardar')
            setConfig(data.config)
            setApiKey('')
            setSuccess(data.isValid ? '✓ API Key guardada y validada correctamente' : 'API Key guardada pero no validada. Verifica que sea correcta.')
        } catch { setError('Error de conexión') }
        finally { setSaving(false) }
    }

    async function handleDeleteOpenAI() {
        if (!confirm('¿Eliminar la API Key de OpenAI?')) return
        await fetch('/api/ads/config/openai', { method: 'DELETE' })
        setConfig(null)
        setSuccess('API Key eliminada')
    }

    async function handleConnectPlatform(platformId: string) {
        try {
            const res = await fetch(`/api/ads/integrations/${platformId.toLowerCase()}/connect/start`, { method: 'POST' })
            const { authUrl, error: err } = await res.json()
            if (err) return setError(err)
            if (authUrl) window.location.href = authUrl
        } catch { setError('Error al iniciar conexión') }
    }

    return (
        <div className="px-4 md:px-6 pt-6 max-w-3xl mx-auto pb-24 text-white" style={{ background: 'radial-gradient(120% 55% at 50% -5%, rgba(183,53,184,0.12), rgba(255,255,255,0) 55%), radial-gradient(90% 55% at 100% 108%, rgba(106,53,217,0.10), rgba(255,255,255,0) 60%), linear-gradient(180deg, #081624 0%, #050B14 100%)', minHeight: 'calc(100vh - 2rem)', borderRadius: 24, border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 30px 60px -30px rgba(8,22,36,0.5)' }}>

            {/* Header */}
            <div className="flex items-center gap-3 mb-7">
                <Link href="/dashboard/services/ads/meta"
                    className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all shrink-0">
                    <ArrowLeft size={15} />
                </Link>
                <div>
                    <h1 className="text-lg md:text-xl font-black uppercase tracking-tighter">Configuración</h1>
                    <p className="text-[11px] text-white/30">API Key de OpenAI y plataformas</p>
                </div>
            </div>

            {/* Alerts */}
            {error && (
                <div className="mb-5 p-4 bg-[#F87171]/10 border border-[#F87171]/20 rounded-2xl flex items-start gap-3 text-[#F87171] text-sm">
                    <AlertCircle size={15} className="shrink-0 mt-0.5" />
                    <p className="flex-1 text-xs md:text-sm">{error}</p>
                    <button onClick={() => setError(null)} className="font-bold text-xs shrink-0">✕</button>
                </div>
            )}
            {success && (
                <div className="mb-5 p-4 bg-[#22C55E]/10 border border-[#22C55E]/20 rounded-2xl flex items-start gap-3 text-[#22C55E] text-sm">
                    <CheckCircle2 size={15} className="shrink-0 mt-0.5" />
                    <p className="flex-1 text-xs md:text-sm">{success}</p>
                    <button onClick={() => setSuccess(null)} className="font-bold text-xs shrink-0">✕</button>
                </div>
            )}

            {/* Tab switcher */}
            <div className="flex gap-1.5 mb-7 bg-white/4 p-1.5 rounded-2xl border border-white/8">
                {[
                    { id: 'openai' as const, label: 'OpenAI', icon: Brain },
                    { id: 'platforms' as const, label: 'Plataformas', icon: Zap }
                ].map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${tab === t.id
                            ? 'bg-white text-black shadow-sm'
                            : 'text-white/40 hover:text-white/70'
                        }`}>
                        <t.icon size={14} />
                        {t.label}
                    </button>
                ))}
            </div>

            {/* OpenAI Tab */}
            {tab === 'openai' && (
                <div className="space-y-5">

                    {/* Current config */}
                    {config && (
                        <div className={`p-4 rounded-2xl border flex items-center gap-3 ${config.isValid
                            ? 'bg-[#22C55E]/5 border-[#22C55E]/20'
                            : 'bg-[#FBBF24]/5 border-[#FBBF24]/20'
                        }`}>
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${config.isValid ? 'bg-[#22C55E]/15' : 'bg-[#FBBF24]/15'}`}>
                                {config.isValid
                                    ? <CheckCircle2 size={17} className="text-[#22C55E]" />
                                    : <AlertCircle size={17} className="text-[#FBBF24]" />
                                }
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-sm">{config.isValid ? 'API Key activa' : 'API Key no validada'}</p>
                                <p className="text-[11px] text-white/40 font-mono truncate">{config.apiKeyMasked} · {config.model}</p>
                            </div>
                            <button onClick={handleDeleteOpenAI} className="text-xs text-[#F87171] hover:text-[#F87171] font-bold shrink-0">Eliminar</button>
                        </div>
                    )}

                    {/* Alternativa: comprar créditos de IA (usar la clave del sistema) */}
                    {credits.enabled && (
                        <Link href="/dashboard/ai-credits"
                            className="flex items-center gap-3 p-4 rounded-2xl transition-all hover:brightness-110"
                            style={{ background: 'linear-gradient(135deg,rgba(183,53,184,0.14),rgba(37,99,235,0.06))', border: '1px solid rgba(255,255,255,0.08)' }}>
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(183,53,184,0.18)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                <Sparkles size={18} className="text-[#B735B8]" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-black text-white">¿No querés usar tu propia API Key?</p>
                                <p className="text-[11px] text-white/45">Comprá créditos de IA y usá nuestra clave. Saldo: <b className="text-[#B735B8]">${credits.balance.toFixed(2)}</b></p>
                            </div>
                            <span className="shrink-0 text-xs font-black px-3 py-1.5 rounded-xl" style={{ background: 'rgba(183,53,184,0.22)', border: '1px solid rgba(255,255,255,0.08)', color: '#d6c8ff' }}>
                                Comprar
                            </span>
                        </Link>
                    )}

                    {/* Info */}
                    <div className="bg-[#4C97D8]/5 border border-white/10 rounded-2xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Sparkles size={13} className="text-[#4C97D8]" />
                            <p className="text-xs font-bold text-[#4C97D8] uppercase tracking-widest">¿Por qué tu propia API Key?</p>
                        </div>
                        <ul className="text-xs text-white/45 space-y-1">
                            <li>• Control total de costos — pagas directamente a OpenAI</li>
                            <li>• Sin intermediarios — mayor seguridad y privacidad</li>
                            <li>• Usa el modelo que prefieras (GPT-5.1, GPT-5.2, etc.)</li>
                            <li>• Tu clave se guarda cifrada con AES-256-GCM</li>
                        </ul>
                        <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 mt-3 text-xs text-[#4C97D8] font-bold hover:underline">
                            Obtener API Key en OpenAI →
                        </a>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSaveOpenAI} className="bg-white/3 border border-white/8 rounded-2xl p-5 space-y-4">
                        <div className="flex items-center gap-2 mb-1">
                            <Key size={14} className="text-white/40" />
                            <h3 className="font-bold text-sm">{config ? 'Actualizar API Key' : 'Configurar API Key'}</h3>
                        </div>

                        <div>
                            <label className="text-[11px] font-bold text-white/40 uppercase tracking-widest block mb-2">
                                OpenAI API Key
                            </label>
                            <div className="relative">
                                <input
                                    type={showKey ? 'text' : 'password'}
                                    value={apiKey}
                                    onChange={e => setApiKey(e.target.value)}
                                    placeholder="sk-proj-..."
                                    className="w-full bg-[#0B1B2B] border border-white/20 rounded-xl px-4 py-3 text-sm font-mono text-white pr-12 focus:outline-none focus:border-white/10 placeholder:text-white/30 transition-colors"
                                />
                                <button type="button" onClick={() => setShowKey(!showKey)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                                    {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="text-[11px] font-bold text-white/40 uppercase tracking-widest block mb-2">Modelo de IA</label>
                            <select value={model} onChange={e => setModel(e.target.value)}
                                className="w-full bg-[#0B1B2B] border border-white/20 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-white/10 transition-colors [&>option]:bg-[#0B1B2B]">
                                <option value="gpt-5.2">GPT-5.2 ⚡ Última generación — ⚠ Mayor costo</option>
                                <option value="gpt-5.1">GPT-5.1 ⚡ Más inteligente — ⚠ Mayor costo</option>
                                <option value="gpt-4.1">GPT-4.1 — Alta calidad</option>
                                <option value="gpt-4.1-mini">GPT-4.1 Mini — Rápido y económico</option>
                                <option value="gpt-4o">GPT-4o — Equilibrado</option>
                                <option value="gpt-4o-mini">GPT-4o Mini — Muy económico</option>
                            </select>
                        </div>

                        <button type="submit" disabled={saving || !apiKey.trim()}
                            className="w-full bg-gradient-to-r from-[#FF2D95] via-[#B735B8] to-[#233B8F] hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 active:scale-[0.98]">
                            {saving ? <><Loader2 size={15} className="animate-spin" /> Validando...</> : 'Guardar y validar API Key'}
                        </button>
                    </form>
                </div>
            )}

            {/* Platforms Tab */}
            {tab === 'platforms' && (
                <div className="space-y-3">
                    <p className="text-xs text-white/30 mb-4">Conecta las plataformas donde quieres publicar tus anuncios.</p>
                    {PLATFORMS.map(platform => {
                        const integration = integrations.find(i => i.platform === platform.id)
                        const isConnected = integration?.status === 'CONNECTED'
                        return (
                            <div key={platform.id} className="bg-white/3 border border-white/8 rounded-2xl p-4 md:p-5 hover:border-white/12 transition-all">
                                <div className="flex items-center gap-3">
                                    <div className="relative">
                                        <div className="w-11 h-11 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                                            <span className={`font-black text-xl ${platform.textColor}`}>{platform.letter}</span>
                                        </div>
                                        {isConnected && (
                                            <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#22C55E] border-2 border-black" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-sm">{platform.label}</h3>
                                        <p className="text-[11px] text-white/30">{platform.sub}</p>
                                        {isConnected && integration?.connectedAccount && (
                                            <p className="text-[11px] text-[#22C55E] mt-0.5 truncate">✓ {integration.connectedAccount.displayName}</p>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => handleConnectPlatform(platform.id)}
                                        className="shrink-0 flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white hover:text-black transition-all active:scale-[0.97]">
                                        {isConnected ? <><Settings2 size={12} /> Reconfigurar</> : <><Link2 size={12} /> Conectar</>}
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
