'use client'

import Link from 'next/link'
import { ArrowLeft, Clock, Sparkles, CheckCircle2, ExternalLink, Zap, BarChart3, Target, Users } from 'lucide-react'

const FEATURES = [
    { icon: Target, label: 'Campañas de Performance', desc: 'Optimización automática con IA para conversiones y ventas' },
    { icon: Users, label: 'Audiencias Lookalike', desc: 'Encontrá usuarios similares a tus mejores clientes' },
    { icon: Sparkles, label: 'Copies generados por IA', desc: 'Textos únicos y creativos para cada variante del anuncio' },
    { icon: BarChart3, label: 'Analytics en tiempo real', desc: 'Métricas de CPM, CPC, CTR y ROAS en un solo lugar' },
    { icon: Zap, label: 'Publicación automática', desc: 'Crea y publica campañas en segundos, sin tocar el panel de TikTok' },
]

export default function TikTokAdsPage() {
    return (
        <div className="px-4 md:px-6 xl:px-10 pt-6 pb-28 max-w-screen-lg mx-auto text-white" style={{ background: 'radial-gradient(120% 55% at 50% -5%, rgba(183,53,184,0.12), rgba(255,255,255,0) 55%), radial-gradient(90% 55% at 100% 108%, rgba(106,53,217,0.10), rgba(255,255,255,0) 60%), linear-gradient(180deg, #081624 0%, #050B14 100%)', minHeight: 'calc(100vh - 2rem)', borderRadius: 24, border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 30px 60px -30px rgba(8,22,36,0.5)' }}>

            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <Link href="/dashboard/services/ads"
                    className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-white/10 transition-all shrink-0"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <ArrowLeft size={16} className="text-white/50" />
                </Link>
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                        style={{ background: 'linear-gradient(135deg, rgba(238,29,82,0.25), rgba(0,0,0,0.2))', border: '1px solid rgba(238,29,82,0.3)' }}>
                        <span className="font-black text-xl text-white">T</span>
                    </div>
                    <div>
                        <h1 className="text-2xl font-black tracking-tight leading-none">TikTok Ads <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(90deg, #EE1D52, #FF2D95)' }}>AI</span></h1>
                        <p className="text-xs text-white/35 mt-0.5">TikTok for Business · Impulsado por IA</p>
                    </div>
                </div>
            </div>

            {/* Coming soon banner */}
            <div className="relative overflow-hidden rounded-3xl p-8 md:p-10 mb-8 text-center"
                style={{ background: 'linear-gradient(135deg, rgba(238,29,82,0.1) 0%, rgba(0,0,0,0) 100%)', border: '1px solid rgba(238,29,82,0.2)' }}>
                <div className="pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full blur-[80px]"
                    style={{ background: 'rgba(238,29,82,0.12)' }} />
                <div className="relative">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-5"
                        style={{ background: 'rgba(238,29,82,0.12)', border: '1px solid rgba(238,29,82,0.25)' }}>
                        <Clock size={12} className="text-[#FF2D95]" />
                        <span className="text-xs font-black text-[#FF2D95] uppercase tracking-widest">En desarrollo</span>
                    </div>
                    <h2 className="text-3xl md:text-4xl font-black mb-3 leading-tight">
                        TikTok Ads estará disponible <br className="hidden md:block" />
                        <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(90deg, #EE1D52, #FF2D95)' }}>muy pronto</span>
                    </h2>
                    <p className="text-white/40 text-sm max-w-md mx-auto leading-relaxed">
                        Estamos integrando la API de TikTok for Business para que puedas crear y gestionar campañas directamente desde MY DIAMOND.
                    </p>
                </div>
            </div>

            {/* Features preview */}
            <div className="mb-8">
                <p className="text-[10px] font-black uppercase tracking-widest text-[#64748B] mb-4">Lo que podrás hacer</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {FEATURES.map((f, i) => {
                        const Icon = f.icon
                        return (
                            <div key={i} className="flex items-start gap-3 p-4 rounded-2xl"
                                style={{ background: '#0B1B2B', border: '1px solid rgba(255,255,255,0.06)' }}>
                                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                                    style={{ background: 'rgba(238,29,82,0.1)', border: '1px solid rgba(238,29,82,0.2)' }}>
                                    <Icon size={15} className="text-[#FF2D95]" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-white/80">{f.label}</p>
                                    <p className="text-[11px] text-white/35 mt-0.5 leading-relaxed">{f.desc}</p>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Status */}
            <div className="rounded-2xl p-5"
                style={{ background: '#0B1B2B', border: '1px solid rgba(255,255,255,0.07)' }}>
                <p className="text-[10px] font-black uppercase tracking-widest text-[#64748B] mb-4">Estado de integración</p>
                <div className="space-y-3">
                    {[
                        { label: 'App de TikTok Developers creada', done: true },
                        { label: 'Login Kit configurado', done: true },
                        { label: 'Business API — aprobación pendiente de TikTok', done: false },
                        { label: 'Integración de campañas y creativos', done: false },
                        { label: 'Analytics y reportes en tiempo real', done: false },
                    ].map((step, i) => (
                        <div key={i} className="flex items-center gap-3">
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${step.done ? 'bg-[#22C55E]/15' : 'bg-white/5'}`}>
                                {step.done
                                    ? <CheckCircle2 size={12} className="text-[#22C55E]" />
                                    : <Clock size={10} className="text-white/20" />}
                            </div>
                            <p className={`text-xs ${step.done ? 'text-white/60' : 'text-white/25'}`}>{step.label}</p>
                        </div>
                    ))}
                </div>

                <div className="mt-5 pt-4 border-t border-white/6">
                    <a href="https://business-api.tiktok.com" target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-xs font-bold text-[#FF2D95] hover:underline">
                        <ExternalLink size={12} /> Ver estado de aprobación en TikTok Business API
                    </a>
                </div>
            </div>
        </div>
    )
}
