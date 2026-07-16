'use client'

import Link from 'next/link'
import { LayoutTemplate, Code2, Sparkles, ArrowRight } from 'lucide-react'

const BRAND = 'linear-gradient(135deg, #1fb8bb 0%, #147e95 52%, #12303a 100%)'
const C = { ink: '#111827', muted: '#6B7280', border: '#E4E9F0', card: '#FFFFFF' }

export default function NuevaLandingChooser() {
  const options = [
    {
      href: '/dashboard/services/landing-pages/builder',
      badge: 'NUEVO',
      icon: LayoutTemplate,
      title: 'Constructor Visual',
      desc: 'Arrastrá y soltá, sin tocar código. 15 plantillas listas, editor visual y también podés generar con IA.',
      bullets: ['Editor drag & drop', '15 plantillas con vista previa', 'Publicá en /b/tu-pagina'],
      cta: 'Abrir constructor',
      accent: '#147e95',
      tint: 'rgba(183,53,184,0.10)',
    },
    {
      href: '/dashboard/services/landing-pages/create?modo=html',
      badge: 'CÓDIGO',
      icon: Code2,
      title: 'Pegar mi HTML',
      desc: 'Ya tenés tu propio código HTML listo. Pegalo acá y publicalo al instante.',
      bullets: ['Pegá tu HTML directo', 'Vista previa inmediata', 'Se publica en /lp/tu-pagina'],
      cta: 'Pegar HTML',
      accent: '#233B8F',
      tint: 'rgba(35,59,143,0.10)',
    },
  ]

  return (
    <div className="dm-page font-ui">
      <div className="px-4 sm:px-6 lg:px-8 pt-8 max-w-5xl mx-auto pb-20">
        <Link href="/dashboard/services/landing-pages"
          className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold mb-4" style={{ color: C.muted }}>
          ← Mis Landing Pages
        </Link>

        <h1 className="text-xl font-bold leading-tight" style={{ color: C.ink, letterSpacing: '-0.02em' }}>
          Crear nueva Landing
        </h1>
        <p className="text-[12.5px] mt-1" style={{ color: C.muted }}>Elegí con qué herramienta querés crearla</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6">
          {options.map((o) => (
            <Link key={o.href} href={o.href}
              className="group rounded-3xl p-6 flex flex-col transition-all duration-300"
              style={{ background: C.card, border: `1px solid ${C.border}`, boxShadow: '0 16px 40px -28px rgba(17,24,39,0.30)' }}
              onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 24px 54px -26px rgba(17,24,39,0.42)'; e.currentTarget.style.transform = 'translateY(-3px)' }}
              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 16px 40px -28px rgba(17,24,39,0.30)'; e.currentTarget.style.transform = 'translateY(0)' }}>

              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: o.tint }}>
                  <o.icon className="w-6 h-6" style={{ color: o.accent }} />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-[0.12em] px-2.5 py-1 rounded-full"
                  style={{ background: o.tint, color: o.accent }}>{o.badge}</span>
              </div>

              <h2 className="text-lg font-bold" style={{ color: C.ink }}>{o.title}</h2>
              <p className="text-[13px] mt-1.5 leading-relaxed" style={{ color: C.muted }}>{o.desc}</p>

              <ul className="mt-4 flex flex-col gap-2">
                {o.bullets.map((b) => (
                  <li key={b} className="flex items-center gap-2 text-[12.5px]" style={{ color: C.ink }}>
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: o.accent }} />
                    {b}
                  </li>
                ))}
              </ul>

              <div className="mt-auto pt-5">
                <span className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white transition-transform group-active:scale-[0.98]"
                  style={{ background: BRAND, boxShadow: '0 10px 24px -12px rgba(123,91,255,0.6)' }}>
                  {o.cta} <ArrowRight className="w-4 h-4" />
                </span>
              </div>
            </Link>
          ))}
        </div>

        <p className="text-center text-[11.5px] mt-6" style={{ color: C.muted }}>
          <Sparkles className="w-3.5 h-3.5 inline -mt-0.5 mr-1" style={{ color: '#147e95' }} />
          Todo lo que publiques (de cualquier tipo) aparece junto en tu galería principal.
        </p>
      </div>
    </div>
  )
}
