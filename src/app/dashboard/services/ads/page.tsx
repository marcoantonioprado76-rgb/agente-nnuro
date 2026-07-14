'use client'

import Link from 'next/link'
import { ArrowRight, CheckCircle2, Clock, Sparkles } from 'lucide-react'

const PLATFORMS = [
    {
        href: '/dashboard/services/ads/meta',
        letter: 'f',
        label: 'Meta Ads',
        sublabel: 'Facebook & Instagram',
        desc: 'Crea campañas en Facebook e Instagram con IA. Copies únicos, audiencias lookalike y reportes de ROAS en tiempo real.',
        active: true,
        gradient: 'linear-gradient(135deg, rgba(0,129,251,0.18) 0%, rgba(0,0,0,0) 100%)',
        border: 'rgba(0,129,251,0.3)',
        glow: 'rgba(0,129,251,0.15)',
        letterColor: '#0081FB',
        badgeBg: 'rgba(0,129,251,0.12)',
        badgeBorder: 'rgba(0,129,251,0.25)',
        badgeText: '#0081FB',
        arrowColor: '#0081FB',
        features: ['Campañas de conversión', 'Audiencias personalizadas', 'A/B testing con IA'],
    },
    {
        href: '/dashboard/services/ads/tiktok',
        letter: 'T',
        label: 'TikTok Ads',
        sublabel: 'TikTok for Business',
        desc: 'Próximamente: campañas de performance en TikTok con creativos generados por IA y publicación automática.',
        active: false,
        gradient: 'linear-gradient(135deg, rgba(238,29,82,0.12) 0%, rgba(0,0,0,0) 100%)',
        border: 'rgba(238,29,82,0.2)',
        glow: 'rgba(238,29,82,0.1)',
        letterColor: '#EE1D52',
        badgeBg: 'rgba(238,29,82,0.1)',
        badgeBorder: 'rgba(238,29,82,0.2)',
        badgeText: '#EE1D52',
        arrowColor: '#EE1D52',
        features: ['Campañas de performance', 'Audiencias lookalike', 'Analytics en tiempo real'],
    },
    {
        href: '/dashboard/services/ads/google',
        letter: 'G',
        label: 'Google Ads',
        sublabel: 'Search · Display · YouTube',
        desc: 'Próximamente: campañas de Search, Display y YouTube con Smart Bidding automático impulsado por IA.',
        active: false,
        gradient: 'linear-gradient(135deg, rgba(66,133,244,0.12) 0%, rgba(0,0,0,0) 100%)',
        border: 'rgba(66,133,244,0.2)',
        glow: 'rgba(66,133,244,0.1)',
        letterColor: '#4285F4',
        badgeBg: 'rgba(66,133,244,0.1)',
        badgeBorder: 'rgba(66,133,244,0.2)',
        badgeText: '#4285F4',
        arrowColor: '#4285F4',
        features: ['Search & Display Ads', 'YouTube Ads', 'Smart Bidding IA'],
    },
]

export default function AdsHubPage() {
    return (
        <div className="px-4 md:px-6 xl:px-10 pt-6 pb-28 max-w-screen-lg mx-auto text-white" style={{ background: 'radial-gradient(120% 55% at 50% -5%, rgba(183,53,184,0.12), rgba(255,255,255,0) 55%), radial-gradient(90% 55% at 100% 108%, rgba(106,53,217,0.10), rgba(255,255,255,0) 60%), linear-gradient(180deg, #081624 0%, #050B14 100%)', minHeight: 'calc(100vh - 2rem)', borderRadius: 24, border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 30px 60px -30px rgba(8,22,36,0.5)' }}>

            {/* Header */}
            <div className="mb-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-4"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <Sparkles size={11} className="text-white/40" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Servicios de Publicidad</span>
                </div>
                <h1 className="text-3xl md:text-4xl font-black tracking-tight leading-tight mb-2">
                    Ads <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(90deg, #0081FB, #EE1D52, #4285F4)' }}>AI</span>
                </h1>
                <p className="text-sm text-white/35 max-w-md leading-relaxed">
                    Gestioná tus campañas publicitarias en todas las plataformas desde un solo lugar, impulsado por inteligencia artificial.
                </p>
            </div>

            {/* Platform cards */}
            <div className="grid grid-cols-1 gap-4">
                {PLATFORMS.map((p) => (
                    <Link key={p.href} href={p.href}
                        className="group relative overflow-hidden rounded-3xl p-6 md:p-8 transition-all hover:scale-[1.01]"
                        style={{ background: p.gradient, border: `1px solid ${p.border}` }}>

                        {/* Glow */}
                        <div className="pointer-events-none absolute -top-12 -right-12 w-48 h-48 rounded-full blur-[60px] opacity-60 group-hover:opacity-100 transition-opacity"
                            style={{ background: p.glow }} />

                        <div className="relative flex items-start gap-5">
                            {/* Logo */}
                            <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
                                style={{ background: p.badgeBg, border: `1px solid ${p.badgeBorder}` }}>
                                <span className="font-black text-2xl" style={{ color: p.letterColor }}>{p.letter}</span>
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3 flex-wrap mb-1">
                                    <h2 className="text-xl font-black">{p.label}</h2>
                                    <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full"
                                        style={{ background: p.badgeBg, border: `1px solid ${p.badgeBorder}`, color: p.badgeText }}>
                                        {p.active
                                            ? <><CheckCircle2 size={9} />Disponible</>
                                            : <><Clock size={9} />Próximamente</>}
                                    </span>
                                </div>
                                <p className="text-xs text-white/35 mb-3">{p.sublabel}</p>
                                <p className="text-sm text-white/50 leading-relaxed mb-4 max-w-xl">{p.desc}</p>

                                {/* Feature pills */}
                                <div className="flex flex-wrap gap-2">
                                    {p.features.map((f) => (
                                        <span key={f} className="text-[10px] font-semibold px-2.5 py-1 rounded-full text-white/40"
                                            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                            {f}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Arrow */}
                            <div className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center self-center transition-transform group-hover:translate-x-1"
                                style={{ background: p.badgeBg, border: `1px solid ${p.badgeBorder}` }}>
                                <ArrowRight size={16} style={{ color: p.arrowColor }} />
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    )
}
