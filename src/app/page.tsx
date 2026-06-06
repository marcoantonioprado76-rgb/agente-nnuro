'use client'

import Link from 'next/link'
import { Space_Grotesk, Inter } from 'next/font/google'
import { ArrowRight, Sparkles } from 'lucide-react'

const display = Space_Grotesk({ subsets: ['latin'], weight: ['300', '400', '500', '600', '700'], variable: '--font-display' })
const body = Inter({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-body' })

const AVATAR = '/nuro-3d.png'
const GRAD_BTN = 'linear-gradient(135deg, #6B5CFF 0%, #8E44FF 55%, #D45BFF 100%)'

export default function LandingPage() {
  return (
    <div
      className={`${display.variable} ${body.variable} relative min-h-screen overflow-x-hidden flex items-center justify-center`}
      style={{
        background: '#050816',
        fontFamily: 'var(--font-body), Inter, ui-sans-serif, system-ui',
        color: '#F8FAFF',
      }}
    >
      {/* Halo de fondo único, estático */}
      <div
        aria-hidden
        className="pointer-events-none absolute"
        style={{
          top: '20%',
          left: '50%',
          width: 600,
          height: 600,
          marginLeft: -300,
          background:
            'radial-gradient(circle, rgba(142,68,255,0.32) 0%, rgba(212,91,255,0.12) 38%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute"
        style={{
          bottom: '-10%',
          right: '-10%',
          width: 500,
          height: 500,
          background:
            'radial-gradient(circle, rgba(6,182,212,0.18) 0%, transparent 70%)',
          filter: 'blur(80px)',
        }}
      />

      {/* Contenido centrado */}
      <main className="relative z-10 px-6 text-center max-w-xl mx-auto">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <div
            className="relative w-12 h-12 rounded-xl overflow-hidden flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, rgba(142,68,255,0.30), rgba(11,16,38,0.6))',
              border: '1px solid rgba(212,91,255,0.32)',
              boxShadow: '0 0 24px -6px rgba(142,68,255,0.6)',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={AVATAR} alt="NÜRO" className="absolute w-[150%] h-[150%] object-contain" />
          </div>
          <span
            className="text-[22px] font-semibold text-white"
            style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.03em' }}
          >
            NÜRO
          </span>
        </div>

        {/* Eyebrow */}
        <div
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6"
          style={{
            background: 'rgba(142,68,255,0.08)',
            border: '1px solid rgba(212,91,255,0.22)',
          }}
        >
          <Sparkles className="w-3 h-3" style={{ color: '#D45BFF' }} />
          <span
            className="text-[10.5px] uppercase font-medium"
            style={{ letterSpacing: '0.2em', color: 'rgba(212,91,255,0.95)' }}
          >
            Próximamente
          </span>
        </div>

        {/* Título */}
        <h1
          className="leading-[1.05] mb-5"
          style={{
            fontFamily: 'var(--font-display)',
            letterSpacing: '-0.045em',
            fontSize: 'clamp(38px, 8vw, 64px)',
            fontWeight: 600,
          }}
        >
          <span className="text-white/90">Estamos preparando </span>
          <span
            style={{
              background: 'linear-gradient(135deg, #6B5CFF, #8E44FF, #D45BFF)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            algo grande.
          </span>
        </h1>

        {/* Sub */}
        <p
          className="text-[15px] lg:text-[16px] text-white/55 leading-relaxed mb-10 max-w-md mx-auto"
          style={{ letterSpacing: '-0.005em' }}
        >
          Nuestra nueva experiencia está en camino. Si ya tienes cuenta, puedes
          entrar mientras tanto.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
          <Link
            href="/login"
            className="group/cta inline-flex items-center justify-center gap-2 h-12 px-7 rounded-xl text-white font-semibold text-[13px]"
            style={{
              background: GRAD_BTN,
              boxShadow:
                '0 20px 40px -10px rgba(142,68,255,0.7), 0 0 0 1px rgba(212,91,255,0.32), inset 0 1px 0 rgba(255,255,255,0.22)',
              letterSpacing: '0.12em',
            }}
          >
            INICIAR SESIÓN
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover/cta:translate-x-0.5" />
          </Link>
          <Link
            href="/register"
            className="inline-flex items-center justify-center h-12 px-7 rounded-xl text-white/85 hover:text-white font-medium text-[13px] transition-colors"
            style={{
              background: 'rgba(142,68,255,0.08)',
              border: '1px solid rgba(212,91,255,0.28)',
              letterSpacing: '0.12em',
            }}
          >
            CREAR CUENTA
          </Link>
        </div>
      </main>

      {/* Footer minimal */}
      <p
        className="absolute bottom-6 left-1/2 -translate-x-1/2 text-[10.5px] uppercase text-white/30 font-medium"
        style={{ letterSpacing: '0.22em' }}
      >
        © {new Date().getFullYear()} NÜRO
      </p>
    </div>
  )
}
