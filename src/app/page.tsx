'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Space_Grotesk, Inter } from 'next/font/google'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ShoppingBag, Sparkles, ArrowRight, Play, MessageCircle,
  Check, Menu, X, Zap, Brain, Globe, Briefcase,
  Send, TrendingUp,
} from 'lucide-react'

const display = Space_Grotesk({ subsets: ['latin'], weight: ['300', '400', '500', '600', '700'], variable: '--font-display' })
const body = Inter({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-body' })

const AVATAR = '/nuro-3d.png'

/* ═══════════════════════════════════════════════════════════════
   PALETA OFICIAL
   #050816  base
   #0B1026  surface
   #1D2E6D  deep accent
   #6B5CFF  violet (gradient start)
   #8E44FF  purple (gradient mid)
   #D45BFF  magenta (gradient end)
   #F8FAFF  white
   ═══════════════════════════════════════════════════════════════ */

const GRAD_MAIN = 'linear-gradient(135deg, #6B5CFF 0%, #8E44FF 50%, #D45BFF 100%)'
const GRAD_BTN  = 'linear-gradient(135deg, #6B5CFF 0%, #8E44FF 55%, #D45BFF 100%)'

/* ═══════════════════════════════════════════════════════════════
   ROOT
   ═══════════════════════════════════════════════════════════════ */
export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false)
  const mouseLightRef = useRef<HTMLDivElement>(null)

  // Mouse-reactive premium light (window-wide, ref-driven, no re-renders)
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (mouseLightRef.current) {
        mouseLightRef.current.style.transform = `translate3d(${e.clientX - 320}px, ${e.clientY - 320}px, 0)`
      }
    }
    window.addEventListener('mousemove', handler)
    return () => window.removeEventListener('mousemove', handler)
  }, [])

  const navTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setMenuOpen(false)
  }

  return (
    <div
      className={`${display.variable} ${body.variable} relative min-h-screen overflow-x-hidden`}
      style={{
        // Background sólido — iOS Safari recomponía `transparent` cada vez que
        // la URL bar aparecía/desaparecía durante el scroll. La página
        // "se apagaba y prendía" porque las capas fixed se repintaban
        // todas en ese momento.
        background: '#050816',
        fontFamily: 'var(--font-body), Inter, ui-sans-serif, system-ui',
        color: '#F8FAFF',
      }}
    >
      <BackgroundLayers />

      {/* Mouse-reactive volumetric light */}
      <div
        ref={mouseLightRef}
        className="pointer-events-none fixed top-0 left-0 w-[640px] h-[640px]"
        style={{
          background:
            'radial-gradient(circle, rgba(142,68,255,0.22) 0%, rgba(212,91,255,0.10) 30%, transparent 65%)',
          filter: 'blur(50px)',
          zIndex: 1,
          willChange: 'transform',
          transform: 'translate3d(-1000px, -1000px, 0)',
        }}
        aria-hidden
      />

      <Navbar onNav={navTo} menuOpen={menuOpen} setMenuOpen={setMenuOpen} />

      <main className="relative" style={{ zIndex: 2 }}>
        <Hero onNav={navTo} />
        <VideoDemo />
        <TrustBar />
        <HowItWorks />
      </main>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   BACKGROUND — 5 capas premium + 4 animaciones + parallax mouse
   ═══════════════════════════════════════════════════════════════ */
function BackgroundLayers() {
  const rootRef = useRef<HTMLDivElement>(null)

  // Parallax mouse: actualiza CSS vars sin re-renders (max 10px desplazamiento)
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!rootRef.current) return
      const x = (e.clientX / window.innerWidth - 0.5) * 20   // -10 → 10
      const y = (e.clientY / window.innerHeight - 0.5) * 20  // -10 → 10
      rootRef.current.style.setProperty('--mx', `${x.toFixed(1)}px`)
      rootRef.current.style.setProperty('--my', `${y.toFixed(1)}px`)
    }
    window.addEventListener('mousemove', handler, { passive: true })
    return () => window.removeEventListener('mousemove', handler)
  }, [])

  // 18 partículas con posiciones pseudo-random pero estables (mix morado + cyan)
  const particles = useMemo(() => {
    const palette = ['#D45BFF', '#8E44FF', '#06B6D4', '#67E8F9']
    return Array.from({ length: 18 }).map((_, i) => ({
      left: (i * 13 + 7) % 95,
      top: 8 + ((i * 23 + 11) % 78),
      size: i % 3 === 0 ? 2.5 : 1.5,
      color: palette[i % palette.length],
      duration: 22 + ((i * 1.7) % 14),
      delay: i * 0.55,
      drift: 0.25 + (i % 4) * 0.05,
    }))
  }, [])

  return (
    <div
      ref={rootRef}
      className="pointer-events-none fixed inset-0 overflow-hidden"
      style={{
        zIndex: 0,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ['--mx' as any]: '0px',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ['--my' as any]: '0px',
      }}
    >
      {/* ── CAPA 2 · Gradiente radial profundo (base) ── */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 90% 70% at 50% 30%, #070B1F 0%, #050816 50%, #020611 100%)',
        }}
      />

      {/* ── CAPA 1a · Blueprint fino (40px) base, hairline ── */}
      <div
        className="absolute inset-0"
        style={{
          transform: 'translate3d(calc(var(--mx) * 0.5), calc(var(--my) * 0.5), 0)',
          transition: 'transform 0.6s ease-out',
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            opacity: 0.035,
            backgroundImage:
              'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
            maskImage:
              'radial-gradient(ellipse 100% 90% at 50% 45%, black 10%, transparent 85%)',
            WebkitMaskImage:
              'radial-gradient(ellipse 100% 90% at 50% 45%, black 10%, transparent 85%)',
          }}
        />
      </div>

      {/* ── CAPA 1b · Grid blueprint morado, respiración 26s + parallax mouse ── */}
      <div
        className="absolute inset-0"
        style={{
          transform: 'translate3d(var(--mx), var(--my), 0)',
          transition: 'transform 0.4s ease-out',
        }}
      >
        <motion.div
          className="absolute inset-0"
          animate={{ scale: [1, 1.03, 1] }}
          transition={{ duration: 26, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            opacity: 0.06,
            backgroundImage:
              'linear-gradient(rgba(142,68,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(142,68,255,1) 1px, transparent 1px)',
            backgroundSize: '120px 120px',
            maskImage:
              'radial-gradient(ellipse 92% 82% at 50% 40%, black 0%, transparent 78%)',
            WebkitMaskImage:
              'radial-gradient(ellipse 92% 82% at 50% 40%, black 0%, transparent 78%)',
          }}
        />
      </div>

      {/* ── CAPA 3 · Neblina tecnológica difusa, movimiento lento ── */}
      <motion.div
        className="absolute"
        style={{
          top: '15%',
          left: '50%',
          width: '120%',
          height: '60%',
          marginLeft: '-60%',
          background:
            'radial-gradient(ellipse, rgba(107,92,255,0.12) 0%, rgba(142,68,255,0.06) 40%, transparent 75%)',
          filter: 'blur(90px)',
        }}
        animate={{
          x: ['-2%', '2%', '-2%'],
          y: ['0%', '3%', '0%'],
          opacity: [0.7, 1, 0.7],
        }}
        transition={{ duration: 30, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* ── CAPA 4 · Glow radial premium dinámico (centro → izq → der → centro, 40s) ── */}
      <motion.div
        className="absolute"
        style={{
          top: '18%',
          left: '50%',
          width: 780,
          height: 780,
          marginLeft: -390,
          marginTop: -120,
          background:
            'radial-gradient(circle, rgba(142,68,255,0.34) 0%, rgba(107,92,255,0.14) 35%, transparent 65%)',
          filter: 'blur(100px)',
        }}
        animate={{
          x: ['0%', '-22%', '22%', '0%'],
          y: ['0%', '5%', '-5%', '0%'],
          opacity: [0.85, 1, 0.95, 0.85],
        }}
        transition={{ duration: 40, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* ── CAPA 4b · Glow cyan contrapuesto (top right) ── */}
      <motion.div
        className="absolute"
        style={{
          top: '8%',
          right: '-12%',
          width: 680,
          height: 680,
          background:
            'radial-gradient(circle, rgba(6,182,212,0.22) 0%, rgba(56,189,248,0.10) 35%, transparent 65%)',
          filter: 'blur(110px)',
        }}
        animate={{
          x: ['0%', '-8%', '0%'],
          opacity: [0.7, 1, 0.7],
        }}
        transition={{ duration: 36, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* ── Secondary deep accent — bottom left, estático sutil ── */}
      <div
        className="absolute"
        style={{
          bottom: '-8%',
          left: '-10%',
          width: 620,
          height: 620,
          background:
            'radial-gradient(circle, rgba(29,46,109,0.40) 0%, transparent 65%)',
          filter: 'blur(100px)',
        }}
      />

      {/* ── CAPA 4c · Cyan bottom-right (profundidad) ── */}
      <div
        className="absolute"
        style={{
          bottom: '-6%',
          right: '-6%',
          width: 520,
          height: 520,
          background:
            'radial-gradient(circle, rgba(6,182,212,0.16) 0%, transparent 70%)',
          filter: 'blur(120px)',
        }}
      />

      {/* ── CAPA · Haze depth (capa de profundidad sutil) ── */}
      <motion.div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 120% 60% at 50% 100%, rgba(11,16,38,0.55) 0%, transparent 60%)',
          mixBlendMode: 'multiply',
        }}
        animate={{ opacity: [0.7, 0.95, 0.7] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* ── CAPA 5 · Partículas mínimas con parallax + float lento ── */}
      <div
        className="absolute inset-0"
        style={{
          transform: 'translate3d(var(--mx), var(--my), 0)',
          transition: 'transform 0.5s ease-out',
        }}
      >
        {particles.map((p, i) => (
          <motion.span
            key={i}
            className="absolute rounded-full"
            style={{
              left: `${p.left}%`,
              top: `${p.top}%`,
              width: p.size,
              height: p.size,
              background: p.color,
              boxShadow: `0 0 10px ${p.color}`,
            }}
            animate={{
              y: [0, -28, 0],
              opacity: [0.22, 0.85, 0.22],
            }}
            transition={{
              duration: p.duration,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: p.delay,
            }}
          />
        ))}
      </div>

      {/* Vignette premium — cierra los bordes */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 38%, rgba(2,8,23,0.78) 100%)',
        }}
      />
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   NAVBAR
   ═══════════════════════════════════════════════════════════════ */
function Navbar({
  onNav, menuOpen, setMenuOpen,
}: { onNav: (id: string) => void; menuOpen: boolean; setMenuOpen: (v: boolean) => void }) {
  const items = [
    { id: 'producto', label: 'Producto' },
    { id: 'planes',   label: 'Planes' },
    { id: 'video',    label: 'Demo' },
    { id: 'contacto', label: 'Contacto' },
  ]

  return (
    <nav
      className="fixed top-0 inset-x-0 z-50 backdrop-blur-xl"
      style={{
        background: 'rgba(5,8,22,0.6)',
        borderBottom: '1px solid rgba(142,68,255,0.10)',
      }}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-8 h-[68px] flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <div
            className="relative w-9 h-9 rounded-lg overflow-hidden flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, rgba(142,68,255,0.30), rgba(11,16,38,0.6))',
              border: '1px solid rgba(212,91,255,0.30)',
              boxShadow: '0 0 18px -6px rgba(142,68,255,0.6)',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={AVATAR} alt="NÜRO" className="absolute w-[150%] h-[150%] object-contain" />
          </div>
          <span
            className="text-[15px] font-semibold tracking-tight text-white"
            style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}
          >
            NÜRO
          </span>
        </Link>

        {/* Desktop menu */}
        <div className="hidden lg:flex items-center gap-9">
          {items.map((it) => (
            <button
              key={it.id}
              onClick={() => onNav(it.id)}
              className="text-[13.5px] font-medium text-white/65 hover:text-white transition-colors"
            >
              {it.label}
            </button>
          ))}
        </div>

        {/* CTAs — desktop */}
        <div className="hidden sm:flex items-center gap-2">
          <Link
            href="/register"
            className="inline-flex items-center justify-center h-10 px-4 rounded-lg text-white/75 font-medium text-[13px] hover:text-white transition-colors"
          >
            Crear cuenta
          </Link>
          <Link
            href="/login"
            className="relative group/nl inline-flex items-center gap-2 h-10 px-5 rounded-lg text-white font-medium text-[13px] overflow-hidden"
            style={{
              background: GRAD_BTN,
              boxShadow:
                '0 10px 26px -6px rgba(142,68,255,0.7), 0 0 0 1px rgba(212,91,255,0.32), inset 0 1px 0 rgba(255,255,255,0.22)',
            }}
          >
            <span className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/22 to-transparent -translate-x-full group-hover/nl:translate-x-full transition-transform duration-700" />
            <span className="relative">Iniciar sesión</span>
            <ArrowRight className="w-3.5 h-3.5 relative" />
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="lg:hidden flex items-center justify-center w-10 h-10 rounded-lg text-white"
          style={{
            background: 'rgba(142,68,255,0.10)',
            border: '1px solid rgba(142,68,255,0.22)',
          }}
          aria-label="Menú"
        >
          {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="lg:hidden overflow-hidden"
            style={{ borderTop: '1px solid rgba(142,68,255,0.10)' }}
          >
            <div className="px-6 py-5 flex flex-col gap-1.5">
              {items.map((it) => (
                <button
                  key={it.id}
                  onClick={() => onNav(it.id)}
                  className="text-left py-3 px-3 rounded-lg text-[14px] font-medium text-white/75 hover:text-white hover:bg-white/5 transition-colors"
                >
                  {it.label}
                </button>
              ))}
              <Link
                href="/register"
                className="mt-3 flex items-center justify-center h-12 rounded-lg text-white/85 font-medium text-[13.5px]"
                style={{
                  background: 'rgba(142,68,255,0.10)',
                  border: '1px solid rgba(142,68,255,0.25)',
                }}
              >
                Crear cuenta
              </Link>
              <Link
                href="/login"
                className="flex items-center justify-center gap-2 h-12 rounded-lg text-white font-medium text-[13.5px]"
                style={{
                  background: GRAD_BTN,
                  boxShadow: '0 10px 26px -6px rgba(142,68,255,0.7), inset 0 1px 0 rgba(255,255,255,0.22)',
                }}
              >
                Iniciar sesión
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}

/* ═══════════════════════════════════════════════════════════════
   HERO — editorial premium · NÜRO command center
   ═══════════════════════════════════════════════════════════════ */
function Hero({ onNav }: { onNav: (id: string) => void }) {
  const heroStats: { Icon: IconComp; target: number; format: (n: number) => string; label: string }[] = [
    { Icon: Globe,         target: 527, format: (n) => `+${Math.round(n).toLocaleString('en-US')}`, label: 'Negocios' },
    { Icon: MessageCircle, target: 2.3, format: (n) => `+${n.toFixed(1)}M`,                          label: 'Mensajes' },
    { Icon: Zap,           target: 98,  format: (n) => `${Math.round(n)}%`,                          label: 'Respuesta' },
    { Icon: Sparkles,      target: 24,  format: (n) => `${Math.round(n)}/7`,                         label: 'Operación' },
  ]

  return (
    <section className="relative pt-32 pb-10 lg:pt-44 lg:pb-14">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 grid lg:grid-cols-[1fr_1.15fr] gap-12 lg:gap-10 items-center">
        {/* ── LEFT: copy editorial ── */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10"
        >
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-7"
            style={{
              background: 'rgba(142,68,255,0.08)',
              border: '1px solid rgba(212,91,255,0.22)',
              boxShadow: '0 0 14px -4px rgba(142,68,255,0.4)',
            }}
          >
            <span className="relative flex h-1.5 w-1.5">
              <motion.span className="absolute inline-flex h-full w-full rounded-full"
                style={{ background: '#D45BFF' }}
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 2, repeat: Infinity }} />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full"
                style={{ background: '#D45BFF', boxShadow: '0 0 6px rgba(212,91,255,0.95)' }} />
            </span>
            <span className="text-[11px] uppercase font-medium"
              style={{ letterSpacing: '0.18em', color: 'rgba(212,91,255,0.95)' }}>
              NÜRO · AI Sales Platform
            </span>
          </div>

          {/* Headline editorial — multi-weight */}
          <h1 className="leading-[0.95]"
            style={{
              fontFamily: 'var(--font-display)',
              letterSpacing: '-0.045em',
            }}>
            <span className="block text-[32px] sm:text-[44px] lg:text-[54px] text-white/85"
              style={{ fontWeight: 300 }}>
              La inteligencia que
            </span>
            <span className="block text-[52px] sm:text-[78px] lg:text-[92px] mt-1.5"
              style={{
                fontWeight: 700,
                letterSpacing: '-0.055em',
                background: GRAD_MAIN,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                filter: 'drop-shadow(0 0 40px rgba(142,68,255,0.45))',
              }}>
              CONVIERTE
            </span>
            <span className="block text-[32px] sm:text-[44px] lg:text-[54px] text-white/85 mt-1.5"
              style={{ fontWeight: 300 }}>
              cada chat en{' '}
              <span style={{
                fontWeight: 700,
                background: GRAD_MAIN,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                filter: 'drop-shadow(0 0 26px rgba(212,91,255,0.45))',
              }}>
                ventas.
              </span>
            </span>
          </h1>

          {/* Sub */}
          <p
            className="mt-7 text-[16.5px] lg:text-[17.5px] text-white/65 leading-relaxed max-w-lg"
            style={{ letterSpacing: '-0.005em', fontWeight: 400 }}
          >
            Automatización, seguimiento y cierre en piloto automático.
            WhatsApp, Messenger, Instagram y Tienda Virtual — un solo cerebro.
          </p>

          {/* CTAs premium */}
          <div className="mt-9 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Primary — pulse halo + shine + inner glow on hover */}
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              className="relative w-full sm:w-auto">
              {/* Outer pulsing ring */}
              <motion.span className="pointer-events-none absolute -inset-px rounded-2xl"
                style={{ background: GRAD_BTN }}
                animate={{ scale: [1, 1.06, 1], opacity: [0.42, 0, 0.42] }}
                transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
              />
              <Link
                href="/register"
                className="relative group/cta inline-flex items-center justify-center gap-2.5 px-7 rounded-2xl text-white font-semibold overflow-hidden w-full sm:w-auto"
                style={{
                  height: 56,
                  background: GRAD_BTN,
                  boxShadow:
                    '0 24px 60px -10px rgba(142,68,255,0.88), 0 0 0 1px rgba(212,91,255,0.45), 0 0 0 4px rgba(142,68,255,0.18), inset 0 1px 0 rgba(255,255,255,0.30)',
                  letterSpacing: '0.16em',
                }}
              >
                {/* Shine sweep */}
                <span className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/26 to-transparent -translate-x-full group-hover/cta:translate-x-full transition-transform duration-900" />
                {/* Hover inner radiance */}
                <span className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 group-hover/cta:opacity-100 transition-opacity duration-500"
                  style={{ background: 'radial-gradient(ellipse at 30% 50%, rgba(255,255,255,0.22), transparent 60%)' }} />
                <Sparkles className="w-4 h-4 relative" />
                <span className="relative text-[13.5px]">CREAR MI AGENTE IA</span>
                <ArrowRight className="w-4 h-4 relative" />
              </Link>
            </motion.div>

            {/* Secondary — glass premium */}
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onNav('video')}
              className="group/v relative inline-flex items-center justify-center gap-2.5 px-6 rounded-2xl text-white/85 hover:text-white font-semibold text-[13px] backdrop-blur-xl overflow-hidden w-full sm:w-auto transition-colors"
              style={{
                height: 56,
                background: 'linear-gradient(180deg, rgba(212,91,255,0.10), rgba(11,16,38,0.55))',
                border: '1px solid rgba(212,91,255,0.30)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
                letterSpacing: '0.16em',
              }}
            >
              {/* Inner hover glow */}
              <span className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 group-hover/v:opacity-100 transition-opacity duration-500"
                style={{ boxShadow: 'inset 0 0 22px rgba(212,91,255,0.25)' }} />
              <motion.span
                className="relative w-7 h-7 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(212,91,255,0.22)', border: '1px solid rgba(212,91,255,0.5)' }}
                animate={{ scale: [1, 1.06, 1] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Play className="w-2.5 h-2.5 ml-0.5" fill="currentColor" style={{ color: '#D45BFF' }} />
              </motion.span>
              VER DEMOSTRACIÓN
            </motion.button>
          </div>

          {/* Stats con micro iconos */}
          <div className="mt-12 pt-7 grid grid-cols-2 sm:grid-cols-4 gap-y-5 gap-x-4 lg:gap-x-6"
            style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            {heroStats.map((s, i) => {
              const Icon = s.Icon
              return (
                <motion.div key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.4 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                  className="flex items-start gap-2.5"
                >
                  <div className="w-7 h-7 mt-0.5 rounded-lg flex items-center justify-center shrink-0"
                    style={{
                      background: 'linear-gradient(135deg, rgba(142,68,255,0.18), rgba(6,182,212,0.10))',
                      border: '1px solid rgba(212,91,255,0.32)',
                      boxShadow: '0 0 10px -2px rgba(142,68,255,0.5), inset 0 1px 0 rgba(255,255,255,0.06)',
                    }}>
                    <Icon strokeWidth={2} style={{ color: '#D45BFF', width: 12, height: 12 }} />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span
                      className="text-[22px] lg:text-[26px] font-medium tabular-nums leading-none"
                      style={{
                        fontFamily: 'var(--font-display)',
                        letterSpacing: '-0.035em',
                        background: 'linear-gradient(180deg, #F8FAFF 0%, #D45BFF 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                        filter: 'drop-shadow(0 0 10px rgba(142,68,255,0.35))',
                      }}>
                      <AnimatedNumber target={s.target} format={s.format} />
                    </span>
                    <span className="text-[10px] uppercase text-white/45 font-medium"
                      style={{ letterSpacing: '0.16em' }}>
                      {s.label}
                    </span>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </motion.div>

        {/* ── RIGHT: NÜRO + 5 mini-apps flotantes ── */}
        <NuroProtagonist />
      </div>
    </section>
  )
}

function NuroProtagonist() {
  const containerRef = useRef<HTMLDivElement>(null)

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 1.3, ease: [0.22, 1, 0.36, 1] }}
      className="relative h-[440px] sm:h-[600px] lg:h-[780px] flex items-center justify-center"
    >
      {/* Cinematic dual halo — violet core + cyan outer */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {/* Cyan outer aura */}
        <motion.div
          className="rounded-full absolute"
          style={{
            width: 'min(740px, 94%)',
            height: 'min(740px, 94%)',
            background:
              'radial-gradient(circle, rgba(6,182,212,0.28) 0%, rgba(56,189,248,0.10) 40%, transparent 72%)',
            filter: 'blur(72px)',
          }}
          animate={{ opacity: [0.5, 0.85, 0.5], scale: [1, 1.04, 1] }}
          transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }}
        />
        {/* Violet core */}
        <motion.div
          className="rounded-full"
          style={{
            width: 'min(640px, 86%)',
            height: 'min(640px, 86%)',
            background:
              'radial-gradient(circle, rgba(142,68,255,0.55) 0%, rgba(212,91,255,0.22) 35%, transparent 70%)',
            filter: 'blur(55px)',
          }}
          animate={{ opacity: [0.75, 1, 0.75], scale: [1, 1.05, 1] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      {/* Hairline orbital ring (cyan inner + violet outer dots) */}
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 'min(700px, 96%)',
          height: 'min(700px, 96%)',
          border: '1px solid rgba(212,91,255,0.13)',
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 110, repeat: Infinity, ease: 'linear' }}
        aria-hidden
      >
        <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full"
          style={{ background: '#D45BFF', boxShadow: '0 0 12px rgba(212,91,255,1)' }} />
        <span className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-1.5 h-1.5 rounded-full"
          style={{ background: '#06B6D4', boxShadow: '0 0 12px rgba(6,182,212,1)' }} />
      </motion.div>

      {/* Inner thin orbital — reverse direction, cyan node */}
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 'min(560px, 78%)',
          height: 'min(560px, 78%)',
          border: '1px dashed rgba(6,182,212,0.18)',
        }}
        animate={{ rotate: -360 }}
        transition={{ duration: 160, repeat: Infinity, ease: 'linear' }}
        aria-hidden
      >
        <span className="absolute top-[15%] right-[12%] w-1 h-1 rounded-full"
          style={{ background: '#67E8F9', boxShadow: '0 0 10px rgba(103,232,249,1)' }} />
      </motion.div>

      {/* NÜRO image — dual glow (violet + cyan) */}
      <motion.img
        src={AVATAR}
        alt="NÜRO"
        className="relative object-contain pointer-events-none"
        style={{
          height: '114%',
          width: 'auto',
          maxWidth: '100%',
          filter:
            'drop-shadow(0 0 100px rgba(142,68,255,0.6)) drop-shadow(0 0 220px rgba(212,91,255,0.38)) drop-shadow(0 0 140px rgba(6,182,212,0.28)) drop-shadow(0 30px 80px rgba(5,8,22,0.85))',
        }}
        animate={{ y: [0, -12, 0] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
        aria-hidden
      />

      {/* Floor shadow — elliptical with soft falloff */}
      <div className="pointer-events-none absolute bottom-[8%] left-1/2 -translate-x-1/2"
        style={{
          width: '52%',
          height: 26,
          background: 'radial-gradient(ellipse, rgba(2,6,17,0.85) 0%, rgba(2,6,17,0.4) 45%, transparent 75%)',
          filter: 'blur(14px)',
        }}
        aria-hidden
      />

      {/* Bottom reflection halo — violet/cyan blend */}
      <div className="pointer-events-none absolute bottom-[12%] left-1/2 -translate-x-1/2 w-[60%] h-[40px]"
        style={{
          background: 'radial-gradient(ellipse, rgba(212,91,255,0.42), rgba(6,182,212,0.15) 60%, transparent 80%)',
          filter: 'blur(20px)',
        }}
        aria-hidden
      />

      {/* ── 5 mini-apps premium flotantes (ocultas en mobile para no tapar al NÜRO ni el texto) ── */}
      <WhatsAppPreviewCard
        className="hidden sm:block left-[-2%] top-[7%] lg:left-[-8%] lg:top-[6%]"
        delay={0.55}
      />
      <OrderReceivedCard
        className="hidden sm:block right-[-2%] top-[10%] lg:right-[-4%] lg:top-[8%]"
        delay={0.75}
      />
      <SaleConfirmedCard
        className="hidden sm:block right-[-3%] top-[46%] lg:right-[-9%] lg:top-[44%]"
        delay={0.95}
      />
      <FollowupCard
        className="hidden sm:block left-[-3%] top-[56%] lg:left-[-9%] lg:top-[54%]"
        delay={1.15}
      />
      <NewConversationCard
        className="hidden sm:block left-[16%] bottom-[4%] lg:left-[14%] lg:bottom-[3%]"
        delay={1.35}
      />
    </motion.div>
  )
}

/* ─── Mini-apps flotantes premium ─── */

function FloatingCardWrap({
  className, delay, accent, children,
}: { className?: string; delay: number; accent: string; children: React.ReactNode }) {
  const rgb = hexToRgb(accent)
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85, y: 14 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] }}
      className={`absolute rounded-2xl backdrop-blur-2xl overflow-hidden ${className ?? ''}`}
      style={{
        background: `linear-gradient(135deg, rgba(${rgb},0.14), rgba(11,16,38,0.82))`,
        border: `1px solid rgba(${rgb},0.32)`,
        boxShadow: `0 18px 44px -10px rgba(${rgb},0.55), inset 0 1px 0 rgba(255,255,255,0.07)`,
        zIndex: 5,
      }}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, rgba(${rgb},0.55), transparent)` }} />
      <motion.div
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 4 + delay, repeat: Infinity, ease: 'easeInOut' }}
      >
        {children}
      </motion.div>
    </motion.div>
  )
}

function WhatsAppPreviewCard({ className, delay }: { className?: string; delay: number }) {
  return (
    <FloatingCardWrap className={`w-[230px] sm:w-[250px] ${className ?? ''}`} delay={delay} accent="#10B981">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b"
        style={{ borderColor: 'rgba(16,185,129,0.18)', background: 'rgba(5,8,22,0.45)' }}>
        <div className="w-6 h-6 rounded-full flex items-center justify-center font-semibold text-[9px] text-white shrink-0"
          style={{
            background: 'linear-gradient(135deg, #6B5CFF, #D45BFF)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.22)',
          }}>
          C
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10.5px] font-semibold text-white leading-none">Carolina M.</div>
          <div className="flex items-center gap-1 text-[8.5px] text-emerald-300 mt-0.5">
            <span className="relative flex h-1 w-1">
              <motion.span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400"
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1.6, repeat: Infinity }} />
              <span className="relative inline-flex h-1 w-1 rounded-full bg-emerald-400" />
            </span>
            En línea
          </div>
        </div>
        <span className="text-[8px] uppercase font-mono font-semibold px-1.5 py-0.5 rounded"
          style={{
            letterSpacing: '0.14em',
            color: '#10B981',
            background: 'rgba(16,185,129,0.14)',
            border: '1px solid rgba(16,185,129,0.32)',
          }}>WA</span>
      </div>

      {/* Body */}
      <div className="px-3 py-2.5 space-y-1.5">
        <div className="max-w-[85%] rounded-xl rounded-tl-sm px-2.5 py-1.5 text-[11px] text-white/85 leading-tight"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)' }}>
          ¿Tienen disponibilidad hoy?
        </div>
        {/* Typing */}
        <div className="flex items-center gap-1.5 pt-1">
          <div className="flex items-center gap-0.5 px-1.5 py-1 rounded-full"
            style={{ background: 'rgba(255,255,255,0.04)' }}>
            {[0, 0.18, 0.36].map((d, i) => (
              <motion.span key={i} className="w-1 h-1 rounded-full bg-white/55"
                animate={{ opacity: [0.3, 1, 0.3], y: [0, -1.5, 0] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut', delay: d }}
              />
            ))}
          </div>
          <span className="text-[9px] text-white/45 font-medium">NÜRO escribiendo…</span>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-3 py-1.5 border-t"
        style={{ borderColor: 'rgba(16,185,129,0.12)' }}>
        <span className="text-[9px] uppercase font-semibold text-white/45"
          style={{ letterSpacing: '0.14em' }}>
          12:42
        </span>
        <span className="flex items-center gap-1 text-[9px] text-emerald-300/85 font-medium">
          <Check className="w-2.5 h-2.5" strokeWidth={3} /> Entregado
        </span>
      </div>
    </FloatingCardWrap>
  )
}

function OrderReceivedCard({ className, delay }: { className?: string; delay: number }) {
  return (
    <FloatingCardWrap className={`w-[210px] ${className ?? ''}`} delay={delay} accent="#D45BFF">
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        {/* Mini producto */}
        <div className="relative w-11 h-11 rounded-lg flex items-center justify-center shrink-0 overflow-hidden"
          style={{
            background: 'radial-gradient(circle at 40% 30%, rgba(212,91,255,0.40), rgba(11,16,38,0.85))',
            border: '1px solid rgba(212,91,255,0.40)',
          }}>
          <svg viewBox="0 0 24 24" width="22" height="22"
            style={{ filter: 'drop-shadow(0 2px 6px rgba(142,68,255,0.5))' }}>
            <defs>
              <linearGradient id="hpG" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#D45BFF" />
                <stop offset="100%" stopColor="#6B5CFF" />
              </linearGradient>
            </defs>
            <path d="M5 12 Q12 4 19 12" stroke="url(#hpG)" strokeWidth="1.6" fill="none" strokeLinecap="round" />
            <ellipse cx="5" cy="14" rx="2.6" ry="3.2" fill="url(#hpG)" />
            <ellipse cx="19" cy="14" rx="2.6" ry="3.2" fill="url(#hpG)" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1 mb-0.5">
            <span className="text-[8.5px] uppercase font-semibold font-mono px-1 py-0.5 rounded"
              style={{
                letterSpacing: '0.12em',
                color: '#D45BFF',
                background: 'rgba(212,91,255,0.14)',
                border: '1px solid rgba(212,91,255,0.35)',
              }}>
              PEDIDO
            </span>
            <span className="text-[8.5px] text-white/40 font-mono">#A-1287</span>
          </div>
          <div className="text-[11.5px] font-semibold text-white truncate leading-tight">
            Auriculares NÜRO Pro
          </div>
          <div className="flex items-center justify-between mt-0.5">
            <span className="text-[9px] text-white/45">3 productos</span>
            <span className="text-[10px] font-semibold text-white tabular-nums">$258</span>
          </div>
        </div>
      </div>
    </FloatingCardWrap>
  )
}

function SaleConfirmedCard({ className, delay }: { className?: string; delay: number }) {
  return (
    <FloatingCardWrap className={`w-[200px] ${className ?? ''}`} delay={delay} accent="#10B981">
      <div className="relative px-3 py-3">
        <div className="flex items-center gap-2 mb-1.5">
          <motion.div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
            style={{
              background: 'linear-gradient(135deg, #10B981, #6B5CFF)',
              boxShadow: '0 0 12px rgba(16,185,129,0.6)',
            }}
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}>
            <Check className="w-3 h-3 text-white" strokeWidth={3.5} />
          </motion.div>
          <span className="text-[9.5px] uppercase font-semibold text-emerald-200"
            style={{ letterSpacing: '0.14em' }}>
            Venta confirmada
          </span>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-[10px] text-white/50 font-medium">+</span>
          <span className="text-[26px] font-medium tabular-nums leading-none"
            style={{
              fontFamily: 'var(--font-display)',
              letterSpacing: '-0.04em',
              background: 'linear-gradient(180deg, #F8FAFF 0%, #D45BFF 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              filter: 'drop-shadow(0 0 10px rgba(142,68,255,0.4))',
            }}>
            $1,250
          </span>
        </div>
        <div className="text-[9.5px] text-white/45 mt-1.5 font-medium">
          Cliente recurrente · México
        </div>

        {/* Subtle ambient corner glow */}
        <div className="pointer-events-none absolute -top-6 -right-6 w-20 h-20 rounded-full opacity-70"
          style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.30), transparent 65%)', filter: 'blur(20px)' }} />
      </div>
    </FloatingCardWrap>
  )
}

function FollowupCard({ className, delay }: { className?: string; delay: number }) {
  return (
    <FloatingCardWrap className={`w-[200px] ${className ?? ''}`} delay={delay} accent="#6B5CFF">
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <div className="relative w-9 h-9 rounded-full flex items-center justify-center font-semibold text-[10px] text-white shrink-0"
          style={{
            background: 'linear-gradient(135deg, #6B5CFF, #8E44FF)',
            border: '1px solid rgba(255,255,255,0.18)',
            boxShadow: '0 4px 10px -2px rgba(107,92,255,0.5), inset 0 1px 0 rgba(255,255,255,0.22)',
          }}>
          JL
          <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center"
            style={{
              background: '#10B981',
              border: '1.5px solid #0B1026',
              boxShadow: '0 0 6px rgba(16,185,129,0.7)',
            }}>
            <Check className="w-2 h-2 text-white" strokeWidth={3.5} />
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <Send className="w-2.5 h-2.5" style={{ color: '#6B5CFF' }} strokeWidth={2.4} />
            <span className="text-[8.5px] uppercase font-semibold text-white/55"
              style={{ letterSpacing: '0.14em' }}>
              Seguimiento
            </span>
          </div>
          <div className="text-[11.5px] font-semibold text-white truncate mt-0.5"
            style={{ letterSpacing: '-0.01em' }}>
            Cliente recuperado
          </div>
          <div className="text-[9px] text-white/45 mt-0.5">Día 3 · Convertido</div>
        </div>
      </div>
    </FloatingCardWrap>
  )
}

function NewConversationCard({ className, delay }: { className?: string; delay: number }) {
  return (
    <FloatingCardWrap className={`w-[210px] ${className ?? ''}`} delay={delay} accent="#D45BFF">
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <div className="relative w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{
            background: 'rgba(212,91,255,0.20)',
            border: '1px solid rgba(212,91,255,0.45)',
            boxShadow: '0 0 10px rgba(212,91,255,0.45)',
          }}>
          <Sparkles className="w-3.5 h-3.5" style={{ color: '#D45BFF' }} strokeWidth={2.2} />
          <motion.span className="absolute inset-0 rounded-lg pointer-events-none"
            style={{ border: '1px solid rgba(212,91,255,0.55)' }}
            animate={{ scale: [1, 1.45], opacity: [0.7, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[8.5px] uppercase font-semibold text-white/55"
            style={{ letterSpacing: '0.14em' }}>
            Nueva conversación
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[11.5px] font-semibold text-white whitespace-nowrap"
              style={{ letterSpacing: '-0.01em' }}>
              Canal Instagram
            </span>
            <span className="text-[9.5px] text-emerald-300 font-medium">● conectado</span>
          </div>
        </div>
      </div>
    </FloatingCardWrap>
  )
}

/* ═══════════════════════════════════════════════════════════════
   OPERATIONS CENTER v2 — núcleo + canales + 4 métricas vivas + live feed
   ═══════════════════════════════════════════════════════════════ */
type IconComp = React.ComponentType<{
  className?: string
  strokeWidth?: number | string
  style?: React.CSSProperties
}>

type ChannelDef = {
  Icon: IconComp
  label: string
  angle: number
  color: string
  metrics: { label: string; value: string }[]
}

const InstagramMark: IconComp = ({ className, strokeWidth = 1.8, style }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={strokeWidth}
    strokeLinecap="round" strokeLinejoin="round"
    className={className} style={style}
    aria-hidden>
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="0.9" fill="currentColor" stroke="none" />
  </svg>
)

/* Shared gradient text style para los números grandes */
const gradNumberStyle: React.CSSProperties = {
  fontFamily: 'var(--font-display)',
  letterSpacing: '-0.04em',
  background: 'linear-gradient(180deg, #F8FAFF 0%, #D45BFF 100%)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
  filter: 'drop-shadow(0 0 12px rgba(142,68,255,0.35))',
}

function TrustBar() {
  const systems: ChannelDef[] = [
    {
      Icon: MessageCircle, label: 'WhatsApp', angle: 0, color: '#10B981',
      metrics: [
        { label: 'Conversaciones', value: '247' },
        { label: 'Oportunidades',  value: '18'  },
        { label: 'Ventas hoy',     value: '3'   },
      ],
    },
    {
      Icon: InstagramMark, label: 'Instagram', angle: 72, color: '#D45BFF',
      metrics: [
        { label: 'Mensajes',       value: '156' },
        { label: 'Leads',          value: '32'  },
        { label: 'Seguimientos',   value: '12'  },
      ],
    },
    {
      Icon: ShoppingBag, label: 'Tienda', angle: 144, color: '#8E44FF',
      metrics: [
        { label: 'Pedidos',        value: '37'      },
        { label: 'Vendido',        value: '$2,480'  },
      ],
    },
    {
      Icon: Briefcase, label: 'CRM', angle: 216, color: '#6B5CFF',
      metrics: [
        { label: 'Prospectos',     value: '84' },
        { label: 'Clientes calientes', value: '21' },
      ],
    },
    {
      Icon: Send, label: 'Messenger', angle: 288, color: '#D45BFF',
      metrics: [
        { label: 'Conversaciones', value: '89' },
        { label: 'Oportunidades',  value: '7'  },
      ],
    },
  ]

  return (
    <section className="relative pt-14 pb-16 lg:pt-20 lg:pb-24 overflow-hidden">
      <div className="relative max-w-7xl mx-auto px-6 lg:px-8">
        <SectionHeader
          eyebrow="Centro de Operaciones"
          title="La inteligencia que conecta todo tu negocio"
          sub="Un solo cerebro orquestando canales, ventas y atención en tiempo real."
        />

        {/* 4 métricas vivas */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-12 lg:mt-14">
          <BusinessMapMetric delay={0} />
          <MessagesFlowMetric delay={0.08} />
          <ResponseRingMetric delay={0.16} />
          <Clock24Metric delay={0.24} />
        </div>

        {/* Centro de operaciones · NÜRO + sistemas conectados */}
        <div className="relative w-full max-w-[920px] mx-auto mt-16 lg:mt-20">
          <div className="relative aspect-[5/4]">
            <ConnectionLines channels={systems} />
            {systems.map((s, i) => (
              <SystemPanel key={s.label} {...s} delay={0.3 + i * 0.08} />
            ))}
            <Nucleus />
          </div>
          <SystemStatus />
        </div>

        {/* Live feed con negocios reales + stats */}
        <div className="mt-12 lg:mt-14 max-w-5xl mx-auto">
          <LiveFeed />
        </div>

        {/* Logos marquee abajo */}
        <PartnerLogos />
      </div>
    </section>
  )
}

/* ─── Nucleus · NÜRO completo, sin recortar ─── */
function Nucleus() {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      {/* Halo energético violeta (capa profunda) */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: '60%',
          height: '60%',
          background:
            'radial-gradient(circle, rgba(142,68,255,0.45) 0%, rgba(212,91,255,0.16) 38%, transparent 72%)',
          filter: 'blur(60px)',
        }}
        animate={{ opacity: [0.7, 1, 0.7], scale: [1, 1.05, 1] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Anillo orbital exterior — rotación lenta */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: '76%',
          height: '76%',
          border: '1px solid rgba(212,91,255,0.10)',
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 120, repeat: Infinity, ease: 'linear' }}
      >
        <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 rounded-full"
          style={{ background: '#D45BFF', boxShadow: '0 0 8px rgba(212,91,255,1)' }} />
      </motion.div>

      {/* Anillo orbital interior — contra-rotación */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: '58%',
          height: '58%',
          border: '1px dashed rgba(212,91,255,0.14)',
        }}
        animate={{ rotate: -360 }}
        transition={{ duration: 90, repeat: Infinity, ease: 'linear' }}
      />

      {/* 2 ondas suaves (radar) muy sutiles */}
      {[0, 1.8].map((d, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full"
          style={{
            width: '52%',
            height: '52%',
            border: '1px solid rgba(212,91,255,0.18)',
          }}
          animate={{ scale: [1, 1.5], opacity: [0.4, 0] }}
          transition={{ duration: 3.6, repeat: Infinity, ease: 'easeOut', delay: d }}
        />
      ))}

      {/* NÜRO completo, libre — protagonista absoluto */}
      <motion.img
        src={AVATAR}
        alt="NÜRO"
        className="relative object-contain pointer-events-none"
        style={{
          height: '92%',
          width: 'auto',
          maxWidth: '88%',
          filter:
            'drop-shadow(0 0 80px rgba(142,68,255,0.55)) drop-shadow(0 0 160px rgba(212,91,255,0.30)) drop-shadow(0 24px 60px rgba(5,8,22,0.7))',
        }}
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Reflejo de piso suave */}
      <div className="pointer-events-none absolute bottom-[8%] left-1/2 -translate-x-1/2 w-[44%] h-[26px]"
        style={{
          background: 'radial-gradient(ellipse, rgba(212,91,255,0.35), transparent 70%)',
          filter: 'blur(18px)',
        }}
      />
    </div>
  )
}

/* ─── SystemPanel · mini panel premium con métricas ─── */
function SystemPanel({
  Icon, label, angle, color, metrics, delay,
}: ChannelDef & { delay: number }) {
  const rad = (angle - 90) * Math.PI / 180
  const rX = 47
  const rY = 42
  const x = 50 + rX * Math.cos(rad)
  const y = 50 + rY * Math.sin(rad)

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.92 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -3, scale: 1.02 }}
      className="absolute z-10 backdrop-blur-2xl"
      style={{
        top: `${y}%`,
        left: `${x}%`,
        transform: 'translate(-50%, -50%)',
        background: 'linear-gradient(180deg, rgba(11,16,38,0.86), rgba(11,16,38,0.62))',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 16,
        padding: '12px 14px',
        minWidth: 184,
        boxShadow:
          '0 24px 50px -18px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.02), inset 0 1px 0 rgba(255,255,255,0.05)',
      }}
    >
      {/* Hairline glow top — color del sistema */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background: `linear-gradient(90deg, transparent, ${color}b3, transparent)`,
          opacity: 0.7,
        }} />

      {/* Header */}
      <div className="relative flex items-center justify-between mb-3 pb-2.5 border-b"
        style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{
              background: `rgba(${hexToRgb(color)},0.14)`,
              border: `1px solid rgba(${hexToRgb(color)},0.30)`,
            }}>
            <Icon strokeWidth={1.8} style={{ color, width: 14, height: 14 }} />
          </span>
          <span className="text-[11.5px] font-semibold text-white"
            style={{ letterSpacing: '-0.005em' }}>
            {label}
          </span>
        </div>
        <span className="relative flex h-1.5 w-1.5">
          <motion.span className="absolute inline-flex h-full w-full rounded-full"
            style={{ background: color }}
            animate={{ opacity: [1, 0.35, 1] }}
            transition={{ duration: 1.8, repeat: Infinity, delay: delay * 2 }} />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full"
            style={{ background: color, boxShadow: `0 0 5px ${color}` }} />
        </span>
      </div>

      {/* Métricas */}
      <div className="relative space-y-1.5">
        {metrics.map((m, i) => (
          <div key={i} className="flex items-center justify-between gap-3">
            <span className="text-[10.5px] text-white/50 font-medium whitespace-nowrap">
              {m.label}
            </span>
            <span className="text-[12.5px] font-semibold text-white tabular-nums whitespace-nowrap"
              style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.015em' }}>
              {m.value}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

/* ─── ConnectionLines · curvas elegantes + partículas viajando ─── */
function ConnectionLines({ channels }: { channels: ChannelDef[] }) {
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <linearGradient id="connFlow" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="rgba(212,91,255,0)" />
          <stop offset="50%" stopColor="rgba(212,91,255,0.55)" />
          <stop offset="100%" stopColor="rgba(142,68,255,0)" />
        </linearGradient>
        <linearGradient id="connFlowCyan" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="rgba(6,182,212,0)" />
          <stop offset="50%" stopColor="rgba(6,182,212,0.5)" />
          <stop offset="100%" stopColor="rgba(56,189,248,0)" />
        </linearGradient>
      </defs>

      {/* Orbital ring fino exterior (pulso lento 8s) */}
      <motion.circle
        cx="50" cy="50" r="44"
        fill="none"
        stroke="rgba(212,91,255,0.18)"
        strokeWidth="0.2"
        strokeDasharray="0.5 2"
        vectorEffect="non-scaling-stroke"
        animate={{ opacity: [0.5, 1, 0.5], rotate: 360 }}
        style={{ transformOrigin: '50% 50%' }}
        transition={{
          opacity: { duration: 8, repeat: Infinity, ease: 'easeInOut' },
          rotate:  { duration: 240, repeat: Infinity, ease: 'linear' },
        }}
      />
      {/* Orbital ring fino interior — sentido contrario, cyan */}
      <motion.circle
        cx="50" cy="50" r="36"
        fill="none"
        stroke="rgba(6,182,212,0.16)"
        strokeWidth="0.18"
        strokeDasharray="0.4 1.6"
        vectorEffect="non-scaling-stroke"
        animate={{ rotate: -360 }}
        style={{ transformOrigin: '50% 50%' }}
        transition={{ duration: 320, repeat: Infinity, ease: 'linear' }}
      />

      {channels.map((c, i) => {
        const rad = (c.angle - 90) * Math.PI / 180
        const rX = 47, rY = 42
        const x2 = 50 + rX * Math.cos(rad)
        const y2 = 50 + rY * Math.sin(rad)

        // Control point para curvatura (perpendicular al vector centro→endpoint)
        const dx = x2 - 50, dy = y2 - 50
        const len = Math.sqrt(dx * dx + dy * dy) || 1
        const perpX = -dy / len, perpY = dx / len
        const mid = 0.5
        const curvature = 8 * (i % 2 === 0 ? 1 : -1)
        const cx = 50 + dx * mid + perpX * curvature
        const cy = 50 + dy * mid + perpY * curvature
        const path = `M 50 50 Q ${cx} ${cy} ${x2} ${y2}`
        const useCyan = i % 2 === 1

        return (
          <g key={c.label}>
            {/* Línea base sólida muy fina */}
            <motion.path
              d={path}
              stroke={useCyan ? 'url(#connFlowCyan)' : 'url(#connFlow)'}
              strokeWidth="0.35"
              fill="none"
              vectorEffect="non-scaling-stroke"
              initial={{ opacity: 0, pathLength: 0 }}
              whileInView={{ opacity: [0, 0.7, 0.45], pathLength: 1 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{
                opacity: { duration: 1.4, delay: 0.3 + i * 0.12 },
                pathLength: { duration: 1.6, delay: 0.3 + i * 0.12, ease: 'easeOut' },
              }}
            />
            {/* Nodo punto en el extremo (junto al panel) — pulso lento */}
            <motion.circle
              cx={x2} cy={y2} r="0.7"
              fill={c.color}
              style={{ filter: `drop-shadow(0 0 3px ${c.color})` }}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, amount: 0.2 }}
              animate={{ opacity: [0.65, 1, 0.65] }}
              transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut', delay: i * 0.3 }}
            />
            {/* Partícula viajando del centro al panel */}
            <motion.circle
              r="0.55"
              fill={c.color}
              style={{ filter: `drop-shadow(0 0 2px ${c.color})` }}
              initial={{ cx: 50, cy: 50, opacity: 0 }}
              animate={{
                cx: [50, cx, x2],
                cy: [50, cy, y2],
                opacity: [0, 1, 0],
              }}
              transition={{
                duration: 3.2,
                repeat: Infinity,
                delay: 1.8 + i * 0.4,
                ease: 'easeInOut',
              }}
            />
          </g>
        )
      })}
    </svg>
  )
}

/* ─── SystemStatus · estado debajo del nucleus ─── */
function SystemStatus() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.5, delay: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className="relative -mt-2 lg:-mt-4 text-center"
    >
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-xl"
        style={{
          background: 'rgba(11,16,38,0.6)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}>
        <span className="relative flex h-1.5 w-1.5">
          <motion.span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400"
            animate={{ opacity: [1, 0.3, 1], scale: [1, 1.8, 1] }}
            transition={{ duration: 1.8, repeat: Infinity }} />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400"
            style={{ boxShadow: '0 0 6px rgba(52,211,153,0.95)' }} />
        </span>
        <span className="text-[10.5px] uppercase font-bold text-white"
          style={{ letterSpacing: '0.22em' }}>
          NÜRO ONLINE
        </span>
      </div>
      <p className="mt-3 text-[13px] text-white/55 font-medium"
        style={{ letterSpacing: '-0.005em' }}>
        Procesando{' '}
        <span className="font-semibold tabular-nums"
          style={{
            fontFamily: 'var(--font-display)',
            background: 'linear-gradient(180deg, #F8FAFF, #D45BFF)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
          <AnimatedNumber target={2847} format={(n) => Math.round(n).toLocaleString('en-US')} />
        </span>
        {' '}conversaciones en tiempo real
      </p>
    </motion.div>
  )
}

/* ─── MetricCardWrapper · contenedor glass premium reutilizable ─── */
function MetricCardWrapper({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -4 }}
      className="group relative rounded-2xl p-5 backdrop-blur-2xl overflow-hidden transition-all duration-500 flex flex-col h-full"
      style={{
        background: 'linear-gradient(180deg, rgba(29,46,109,0.42), rgba(11,16,38,0.82))',
        border: '1px solid rgba(142,68,255,0.18)',
        boxShadow:
          '0 24px 50px -18px rgba(142,68,255,0.55), 0 18px 36px -22px rgba(6,182,212,0.30), inset 0 1px 0 rgba(255,255,255,0.05)',
        minHeight: 260,
      }}>
      {/* Hover ring */}
      <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ boxShadow: '0 0 0 1px rgba(212,91,255,0.40)' }} />
      {/* Top hairline gradient (violet→cyan) */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(212,91,255,0.55) 40%, rgba(6,182,212,0.45) 70%, transparent)' }} />
      {/* Corner ambient — violet */}
      <div className="pointer-events-none absolute -top-12 -right-12 w-32 h-32 rounded-full opacity-50"
        style={{ background: 'radial-gradient(circle, rgba(142,68,255,0.30), transparent 65%)', filter: 'blur(28px)' }} />
      {/* Bottom inner glow (the requested floor light) */}
      <div className="pointer-events-none absolute -bottom-14 -left-10 w-36 h-36 rounded-full opacity-40 group-hover:opacity-70 transition-opacity duration-500"
        style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.28), transparent 70%)', filter: 'blur(32px)' }} />
      <div className="relative flex flex-col h-full">{children}</div>
    </motion.div>
  )
}

function MetricHeader({ Icon, label }: { Icon: IconComp; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon strokeWidth={2} style={{ color: '#D45BFF', width: 14, height: 14 }} />
      <span className="text-[10px] uppercase font-semibold text-white/55" style={{ letterSpacing: '0.18em' }}>
        {label}
      </span>
    </div>
  )
}

function MetricFooter({ value, sub }: { value: React.ReactNode; sub: string }) {
  return (
    <div className="mt-auto">
      <div className="text-[26px] lg:text-[30px] font-medium tabular-nums leading-none mb-1" style={gradNumberStyle}>
        {value}
      </div>
      <div className="text-[10px] uppercase font-medium text-white/45" style={{ letterSpacing: '0.16em' }}>
        {sub}
      </div>
    </div>
  )
}

/* ─── BusinessMapMetric · mapa mundial holográfico ─── */
function BusinessMapMetric({ delay }: { delay: number }) {
  const dots = [
    { x: 18, y: 38, d: 0 },   { x: 26, y: 50, d: 0.4 },
    { x: 22, y: 65, d: 0.8 }, { x: 30, y: 72, d: 1.2 },
    { x: 48, y: 32, d: 0.2 }, { x: 52, y: 42, d: 0.6 },
    { x: 56, y: 60, d: 1.0 }, { x: 50, y: 72, d: 1.4 },
    { x: 72, y: 38, d: 0.3 }, { x: 78, y: 48, d: 0.7 },
    { x: 84, y: 58, d: 1.1 }, { x: 85, y: 72, d: 1.5 },
  ]
  return (
    <MetricCardWrapper delay={delay}>
      <MetricHeader Icon={Globe} label="Negocios activos" />
      <div className="relative flex-1 min-h-[120px] mb-3 rounded-lg overflow-hidden"
        style={{ background: 'rgba(5,8,22,0.5)', border: '1px solid rgba(142,68,255,0.10)' }}>
        <svg viewBox="0 0 100 80" className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
          <g opacity="0.6">
            <path d="M14 28 Q22 25 28 32 L30 50 Q26 62 22 72 Q18 76 16 72 Q14 60 14 28 Z"
              fill="rgba(142,68,255,0.10)" stroke="rgba(212,91,255,0.25)" strokeWidth="0.4" />
            <path d="M42 28 Q52 24 58 32 Q60 45 56 58 Q52 70 48 74 Q44 68 44 55 Q42 42 42 28 Z"
              fill="rgba(142,68,255,0.10)" stroke="rgba(212,91,255,0.25)" strokeWidth="0.4" />
            <path d="M66 26 Q78 24 86 32 Q88 42 84 50 Q78 58 72 56 Q66 50 66 38 Z"
              fill="rgba(142,68,255,0.10)" stroke="rgba(212,91,255,0.25)" strokeWidth="0.4" />
            <path d="M80 64 Q88 64 88 70 Q86 76 82 74 Q78 70 80 64 Z"
              fill="rgba(142,68,255,0.10)" stroke="rgba(212,91,255,0.25)" strokeWidth="0.4" />
          </g>

          {[0, 4, 8, 11].map((i) => (
            <motion.line key={i}
              x1={50} y1={50}
              x2={dots[i].x} y2={dots[i].y}
              stroke="rgba(212,91,255,0.5)" strokeWidth="0.3" strokeDasharray="1 2"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.2, 0.7, 0.2] }}
              transition={{ duration: 3, repeat: Infinity, delay: dots[i].d }}
            />
          ))}

          <circle cx={50} cy={50} r="1.8" fill="#D45BFF"
            style={{ filter: 'drop-shadow(0 0 3px rgba(212,91,255,1))' }} />
          <motion.circle cx={50} cy={50} r="3" fill="none" stroke="rgba(212,91,255,0.6)" strokeWidth="0.3"
            animate={{ r: [3, 7], opacity: [0.6, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeOut' }} />

          {dots.map((d, i) => (
            <motion.circle key={i}
              cx={d.x} cy={d.y} r="0.9" fill="#D45BFF"
              style={{ filter: 'drop-shadow(0 0 2px rgba(212,91,255,0.9))' }}
              animate={{ opacity: [0.3, 1, 0.3], scale: [1, 1.3, 1] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', delay: d.d }}
            />
          ))}
        </svg>
      </div>
      <MetricFooter
        value={<AnimatedNumber target={527} format={(n) => `+${Math.round(n).toLocaleString('en-US')}`} />}
        sub="negocios conectados"
      />
    </MetricCardWrapper>
  )
}

/* ─── MessagesFlowMetric · flujo de chat ─── */
function MessagesFlowMetric({ delay }: { delay: number }) {
  const samples = [
    { ch: 'WA', color: '#10B981', text: '¿Tienen el azul?' },
    { ch: 'IG', color: '#D45BFF', text: 'Cuánto cuesta?' },
    { ch: 'MS', color: '#6B5CFF', text: 'Quiero comprar' },
    { ch: 'WA', color: '#10B981', text: 'Confirmado, gracias' },
    { ch: 'IG', color: '#D45BFF', text: 'Hay envío?' },
    { ch: 'MS', color: '#6B5CFF', text: 'Hola NÜRO' },
    { ch: 'WA', color: '#10B981', text: 'Pago hecho' },
  ]
  type Msg = { id: number; ch: string; color: string; text: string }
  const [msgs, setMsgs] = useState<Msg[]>([])
  const counter = useRef(0)
  const idx = useRef(0)

  useEffect(() => {
    const seed: Msg[] = [0, 1].map(k => {
      counter.current += 1
      const m = samples[(idx.current + k) % samples.length]
      return { id: counter.current, ...m }
    })
    idx.current = 2
    setMsgs(seed)
    const interval = setInterval(() => {
      counter.current += 1
      idx.current = (idx.current + 1) % samples.length
      setMsgs(prev => [...prev, { id: counter.current, ...samples[idx.current] }].slice(-3))
    }, 1900)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <MetricCardWrapper delay={delay}>
      <MetricHeader Icon={MessageCircle} label="Mensajes procesados" />
      <div className="flex-1 flex flex-col justify-end gap-1.5 min-h-[120px] mb-3 overflow-hidden">
        <AnimatePresence initial={false}>
          {msgs.map(m => (
            <motion.div key={m.id} layout
              initial={{ opacity: 0, y: 10, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.4 }}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(212,91,255,0.10)',
              }}>
              <span className="shrink-0 text-[8.5px] font-mono uppercase font-semibold px-1.5 py-0.5 rounded"
                style={{
                  letterSpacing: '0.12em', color: m.color,
                  background: `rgba(${hexToRgb(m.color)},0.14)`,
                  border: `1px solid rgba(${hexToRgb(m.color)},0.35)`,
                }}>
                {m.ch}
              </span>
              <span className="text-[11px] text-white/75 truncate font-medium">
                {m.text}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      <MetricFooter
        value={<AnimatedNumber target={2.3} format={(n) => `+${n.toFixed(1)}M`} />}
        sub="conversaciones"
      />
    </MetricCardWrapper>
  )
}

/* ─── ResponseRingMetric · anillo de progreso ─── */
function ResponseRingMetric({ delay }: { delay: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [progress, setProgress] = useState(0)
  const started = useRef(false)

  useEffect(() => {
    if (!ref.current) return
    const node = ref.current
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true
        const start = performance.now()
        const duration = 2.4
        const target = 98
        const tick = (now: number) => {
          const elapsed = (now - start) / 1000
          const t = Math.min(elapsed / duration, 1)
          const eased = 1 - Math.pow(1 - t, 3)
          setProgress(target * eased)
          if (t < 1) requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
      }
    }, { threshold: 0.3 })
    obs.observe(node)
    return () => obs.disconnect()
  }, [])

  const circumference = 2 * Math.PI * 42
  const offset = circumference * (1 - progress / 100)

  return (
    <MetricCardWrapper delay={delay}>
      <MetricHeader Icon={Zap} label="Tasa de respuesta" />
      <div ref={ref} className="relative flex-1 flex items-center justify-center min-h-[120px] mb-3">
        <svg width="118" height="118" viewBox="0 0 100 100">
          <defs>
            <linearGradient id="ringGrad" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0%" stopColor="#6B5CFF" />
              <stop offset="50%" stopColor="#8E44FF" />
              <stop offset="100%" stopColor="#D45BFF" />
            </linearGradient>
          </defs>
          <circle cx="50" cy="50" r="42" fill="none"
            stroke="rgba(142,68,255,0.16)" strokeWidth="6" />
          <circle cx="50" cy="50" r="42" fill="none"
            stroke="url(#ringGrad)" strokeWidth="6" strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            transform="rotate(-90 50 50)"
            style={{ filter: 'drop-shadow(0 0 8px rgba(142,68,255,0.6))' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[28px] font-medium tabular-nums leading-none"
            style={{
              fontFamily: 'var(--font-display)',
              letterSpacing: '-0.04em',
              background: 'linear-gradient(180deg, #F8FAFF 0%, #D45BFF 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
            {Math.round(progress)}%
          </span>
          <span className="text-[8.5px] uppercase font-semibold text-emerald-300/95 mt-1.5"
            style={{ letterSpacing: '0.18em' }}>
            ● Óptimo
          </span>
        </div>
      </div>
      <div className="mt-auto">
        <div className="text-[10px] uppercase font-medium text-white/45" style={{ letterSpacing: '0.16em' }}>
          respuestas en &lt; 30s
        </div>
      </div>
    </MetricCardWrapper>
  )
}

/* ─── Clock24Metric · reloj holográfico ─── */
function Clock24Metric({ delay }: { delay: number }) {
  return (
    <MetricCardWrapper delay={delay}>
      <MetricHeader Icon={Globe} label="Operación continua" />
      <div className="relative flex-1 flex items-center justify-center min-h-[120px] mb-3">
        <svg viewBox="0 0 100 100" width="118" height="118">
          <circle cx="50" cy="50" r="45" fill="rgba(11,16,38,0.4)" stroke="rgba(212,91,255,0.3)" strokeWidth="0.8" />
          {Array.from({ length: 12 }).map((_, i) => {
            const angle = (i * 30 - 90) * Math.PI / 180
            const r1 = i % 3 === 0 ? 36 : 39
            const r2 = 42
            const x1 = 50 + r1 * Math.cos(angle)
            const y1 = 50 + r1 * Math.sin(angle)
            const x2 = 50 + r2 * Math.cos(angle)
            const y2 = 50 + r2 * Math.sin(angle)
            return (
              <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
                stroke={i % 3 === 0 ? '#D45BFF' : 'rgba(212,91,255,0.4)'}
                strokeWidth={i % 3 === 0 ? 1.2 : 0.6}
                strokeLinecap="round" />
            )
          })}

          <motion.line x1="50" y1="50" x2="50" y2="22"
            stroke="#F8FAFF" strokeWidth="1.4" strokeLinecap="round"
            style={{ transformOrigin: '50px 50px', filter: 'drop-shadow(0 0 4px rgba(248,250,255,0.7))' }}
            animate={{ rotate: 360 }}
            transition={{ duration: 22, repeat: Infinity, ease: 'linear' }}
          />
          <motion.line x1="50" y1="50" x2="50" y2="32"
            stroke="#D45BFF" strokeWidth="1.8" strokeLinecap="round"
            style={{ transformOrigin: '50px 50px', filter: 'drop-shadow(0 0 5px rgba(212,91,255,1))' }}
            animate={{ rotate: 360 }}
            transition={{ duration: 140, repeat: Infinity, ease: 'linear' }}
          />

          <circle cx="50" cy="50" r="2.4" fill="#D45BFF"
            style={{ filter: 'drop-shadow(0 0 6px rgba(212,91,255,1))' }} />
          <circle cx="50" cy="50" r="1.2" fill="#F8FAFF" />

          <motion.circle cx="50" cy="50" r="4" fill="none" stroke="rgba(212,91,255,0.5)" strokeWidth="0.4"
            animate={{ r: [3, 8], opacity: [0.6, 0] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeOut' }}
          />
        </svg>
      </div>
      <div className="mt-auto flex items-baseline justify-between gap-2">
        <div className="text-[26px] lg:text-[30px] font-medium tabular-nums leading-none" style={gradNumberStyle}>
          <AnimatedNumber target={24} format={(n) => `${Math.round(n)}/7`} />
        </div>
        <span className="text-[9.5px] uppercase font-semibold text-emerald-300/95"
          style={{ letterSpacing: '0.18em' }}>
          ● Activo
        </span>
      </div>
    </MetricCardWrapper>
  )
}

/* ─── LiveFeed · centro de actividad con negocios reales + stats panel ─── */
function LiveFeed() {
  const businesses = [
    { name: 'Moda Carolina',        type: 'Tienda de ropa',  img: 'https://images.unsplash.com/photo-1485518882345-15568b007407?w=120&q=75&auto=format&fit=crop' },
    { name: 'Restaurante Toscana',  type: 'Restaurante',     img: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=120&q=75&auto=format&fit=crop' },
    { name: 'Academia Digital',     type: 'Cursos online',   img: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=120&q=75&auto=format&fit=crop' },
    { name: 'Inmobiliaria Premium', type: 'Inmobiliaria',    img: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=120&q=75&auto=format&fit=crop' },
    { name: 'Cosmética Pure',       type: 'Belleza',         img: 'https://images.unsplash.com/photo-1522335789203-aaa83fe1f48b?w=120&q=75&auto=format&fit=crop' },
    { name: 'Studio Pro',           type: 'Servicios pro',   img: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=120&q=75&auto=format&fit=crop' },
  ]

  const actions = [
    { text: 'Seguimiento enviado',    status: '#8E44FF' },
    { text: 'Reserva confirmada',     status: '#10B981' },
    { text: 'Inscripción completada', status: '#10B981' },
    { text: 'Visita agendada',        status: '#6B5CFF' },
    { text: 'Venta confirmada',       status: '#10B981' },
    { text: 'Cliente recuperado',     status: '#10B981' },
    { text: 'Nuevo pedido',           status: '#D45BFF' },
    { text: 'Pago recibido',          status: '#10B981' },
  ]

  type Evt = {
    id: number
    business: typeof businesses[number]
    action: string
    status: string
    createdAt: number
  }

  const [events, setEvents] = useState<Evt[]>([])
  const [, setTick] = useState(0)
  const counter = useRef(0)
  const aIdx = useRef(0)
  const bIdx = useRef(0)

  useEffect(() => {
    const seed: Evt[] = [0, 1, 2, 3].map(k => {
      counter.current += 1
      const a = actions[(aIdx.current + k) % actions.length]
      const b = businesses[(bIdx.current + k) % businesses.length]
      return {
        id: counter.current,
        business: b,
        action: a.text,
        status: a.status,
        createdAt: Date.now() - (3 - k) * 4500,
      }
    })
    aIdx.current = 4
    bIdx.current = 4
    setEvents(seed)

    const evInt = setInterval(() => {
      counter.current += 1
      aIdx.current = (aIdx.current + 1) % actions.length
      bIdx.current = (bIdx.current + 1) % businesses.length
      const a = actions[aIdx.current]
      const b = businesses[bIdx.current]
      setEvents(prev => [...prev, {
        id: counter.current,
        business: b,
        action: a.text,
        status: a.status,
        createdAt: Date.now(),
      }].slice(-4))
    }, 2800)

    const tickInt = setInterval(() => setTick(t => t + 1), 1000)

    return () => {
      clearInterval(evInt)
      clearInterval(tickInt)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const formatAgo = (createdAt: number): string => {
    const secs = Math.max(0, Math.floor((Date.now() - createdAt) / 1000))
    if (secs < 5) return 'Justo ahora'
    if (secs < 60) return `Hace ${secs} seg`
    const mins = Math.floor(secs / 60)
    return `Hace ${mins} min`
  }

  // 12 partículas estáticas pero animadas para el fondo
  const particles = useMemo(() => Array.from({ length: 12 }).map((_, i) => ({
    left: (i * 13 + 5) % 95,
    top: 10 + ((i * 17) % 78),
    size: i % 3 === 0 ? 2 : 1.5,
    color: i % 2 === 0 ? '#D45BFF' : '#8E44FF',
    duration: 16 + (i * 1.5) % 10,
    delay: i * 0.6,
  })), [])

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
      className="relative rounded-2xl backdrop-blur-2xl overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, rgba(11,16,38,0.82), rgba(11,16,38,0.65))',
        border: '1px solid rgba(255,255,255,0.10)',
        boxShadow:
          '0 32px 70px -22px rgba(0,0,0,0.65), 0 0 60px -28px rgba(142,68,255,0.40), 0 0 0 1px rgba(212,91,255,0.06), inset 0 1px 0 rgba(255,255,255,0.05)',
      }}
    >
      {/* Grid blueprint sutil */}
      <div className="pointer-events-none absolute inset-0"
        style={{
          opacity: 0.06,
          backgroundImage:
            'linear-gradient(rgba(212,91,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(212,91,255,1) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          maskImage: 'radial-gradient(ellipse 90% 80% at 50% 50%, black 0%, transparent 78%)',
          WebkitMaskImage: 'radial-gradient(ellipse 90% 80% at 50% 50%, black 0%, transparent 78%)',
        }} />

      {/* Partículas flotando */}
      {particles.map((p, i) => (
        <motion.span
          key={i}
          className="pointer-events-none absolute rounded-full"
          style={{
            left: `${p.left}%`,
            top: `${p.top}%`,
            width: p.size,
            height: p.size,
            background: p.color,
            boxShadow: `0 0 6px ${p.color}`,
          }}
          animate={{ y: [0, -20, 0], opacity: [0.2, 0.7, 0.2] }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: p.delay,
          }}
        />
      ))}

      {/* Top hairline */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(212,91,255,0.5), transparent)' }} />

      {/* Header */}
      <div className="relative flex items-center justify-between px-5 lg:px-6 py-4 border-b"
        style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-2">
          <span className="relative flex h-1.5 w-1.5">
            <motion.span className="absolute inline-flex h-full w-full rounded-full"
              style={{ background: '#D45BFF' }}
              animate={{ opacity: [1, 0.3, 1], scale: [1, 1.7, 1] }}
              transition={{ duration: 1.8, repeat: Infinity }} />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full"
              style={{ background: '#D45BFF', boxShadow: '0 0 6px rgba(212,91,255,0.95)' }} />
          </span>
          <span className="text-[10.5px] uppercase font-semibold text-white"
            style={{ letterSpacing: '0.22em' }}>
            LIVE
          </span>
          <span className="text-[11px] text-white/55 font-medium ml-2 hidden sm:inline"
            style={{ letterSpacing: '-0.005em' }}>
            Actividad en tiempo real
          </span>
        </div>
        <span className="text-[9.5px] uppercase font-mono text-white/40"
          style={{ letterSpacing: '0.16em' }}>
          Sincronizado
        </span>
      </div>

      {/* Body — 2 columns: feed + stats panel */}
      <div className="relative grid lg:grid-cols-[1fr_280px] gap-0">
        {/* ── Feed list ── */}
        <div className="relative px-4 lg:px-5 py-4 lg:py-5 min-h-[320px]">
          <div className="space-y-2">
            <AnimatePresence initial={false}>
              {events.map(e => (
                <motion.div
                  key={e.id}
                  layout
                  initial={{ opacity: 0, x: 16, height: 0 }}
                  animate={{ opacity: 1, x: 0, height: 'auto' }}
                  exit={{ opacity: 0, x: -16, height: 0 }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className="group/row relative flex items-center gap-3 px-3 py-2.5 rounded-xl overflow-hidden transition-colors hover:bg-white/[0.04]"
                  style={{
                    background: 'rgba(255,255,255,0.025)',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  {/* LED edge indicator izquierdo */}
                  <span aria-hidden className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[60%] rounded-r-full"
                    style={{ background: e.status, boxShadow: `0 0 8px ${e.status}` }} />
                  {/* Business image */}
                  <div className="relative w-11 h-11 rounded-lg overflow-hidden shrink-0"
                    style={{
                      border: '1px solid rgba(255,255,255,0.08)',
                      boxShadow: '0 4px 10px -2px rgba(0,0,0,0.5)',
                    }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={e.business.img} alt={e.business.name}
                      loading="lazy"
                      className="absolute inset-0 w-full h-full object-cover" />
                    <div className="absolute inset-0"
                      style={{
                        background: 'linear-gradient(180deg, transparent, rgba(5,8,22,0.45))',
                      }} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-[12.5px] text-white font-semibold leading-none whitespace-nowrap"
                        style={{ letterSpacing: '-0.01em' }}>
                        {e.business.name}
                      </span>
                      <span className="text-[10px] text-white/40 font-medium whitespace-nowrap">
                        · {e.business.type}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ background: e.status, boxShadow: `0 0 4px ${e.status}` }} />
                      <span className="text-[11.5px] text-white/80 font-medium"
                        style={{ letterSpacing: '-0.005em' }}>
                        {e.action}
                      </span>
                      <span className="text-[10px] text-white/40 ml-1">
                        · {formatAgo(e.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Check verde de "completado" */}
                  <motion.div
                    initial={{ scale: 0, rotate: -30 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ duration: 0.4, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
                    className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                    style={{
                      background: 'rgba(16,185,129,0.16)',
                      border: '1px solid rgba(16,185,129,0.42)',
                      boxShadow: '0 0 8px -2px rgba(16,185,129,0.5)',
                    }}>
                    <Check className="w-3 h-3 text-emerald-300" strokeWidth={3.5} />
                  </motion.div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* ── Stats panel lateral ── */}
        <div className="relative lg:border-l border-t lg:border-t-0 px-5 py-4 lg:py-5 flex flex-col gap-3"
          style={{
            borderColor: 'rgba(255,255,255,0.06)',
            background: 'rgba(5,8,22,0.32)',
          }}>
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-3 h-3" style={{ color: '#D45BFF' }} strokeWidth={2.2} />
            <span className="text-[9.5px] uppercase font-semibold text-white/55"
              style={{ letterSpacing: '0.18em' }}>
              Actividad de hoy
            </span>
          </div>

          {[
            { label: 'Conversaciones',     target: 147, color: '#D45BFF' },
            { label: 'Seguimientos',       target: 23,  color: '#8E44FF' },
            { label: 'Ventas',             target: 8,   color: '#10B981' },
            { label: 'Clientes recuperados', target: 3, color: '#6B5CFF' },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, x: 8 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 0.45, delay: 0.3 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="relative"
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[11px] text-white/55 font-medium"
                  style={{ letterSpacing: '-0.005em' }}>
                  {s.label}
                </span>
                <span
                  className="text-[20px] font-semibold tabular-nums leading-none"
                  style={{
                    fontFamily: 'var(--font-display)',
                    letterSpacing: '-0.03em',
                    background: `linear-gradient(180deg, #F8FAFF, ${s.color})`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    filter: `drop-shadow(0 0 8px ${s.color}55)`,
                  }}>
                  <AnimatedNumber target={s.target} format={(n) => Math.round(n).toString()} />
                </span>
              </div>
              {/* Progress bar fina */}
              <div className="relative h-px mt-2 rounded-full overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.06)' }}>
                <motion.div
                  className="absolute inset-y-0 left-0"
                  initial={{ width: '0%' }}
                  whileInView={{ width: '78%' }}
                  viewport={{ once: true, amount: 0.5 }}
                  transition={{ duration: 1.8, delay: 0.5 + i * 0.1, ease: 'easeOut' }}
                  style={{
                    background: `linear-gradient(90deg, transparent, ${s.color})`,
                    boxShadow: `0 0 4px ${s.color}`,
                  }} />
              </div>
            </motion.div>
          ))}

          {/* System status footer */}
          <div className="mt-auto pt-3 flex items-center gap-1.5 text-[10px] text-emerald-300/85 font-medium"
            style={{ letterSpacing: '0.18em' }}>
            <span className="relative flex h-1 w-1">
              <motion.span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400"
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1.6, repeat: Infinity }} />
              <span className="relative inline-flex h-1 w-1 rounded-full bg-emerald-400" />
            </span>
            <span className="uppercase">Sistema activo</span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

/* ─── PartnerLogos · marquee infinito ─── */
function PartnerLogos() {
  const logos = [
    { name: 'OpenAI',    Mark: LogoOpenAI },
    { name: 'Anthropic', Mark: LogoAnthropic },
    { name: 'Meta',      Mark: LogoMeta },
    { name: 'WhatsApp',  Mark: LogoWhatsApp },
    { name: 'Stripe',    Mark: LogoStripe },
    { name: 'GPT-5',     Mark: LogoGPT5 },
  ]
  const looped = [...logos, ...logos]

  return (
    <div className="relative mt-10 pt-8 overflow-hidden">
      {/* Background strip — subtle gradient with hairline top */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(212,91,255,0.30), transparent)' }} />
      <div className="pointer-events-none absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, rgba(11,16,38,0.0), rgba(142,68,255,0.04) 50%, rgba(11,16,38,0.0))',
        }} />

      <span className="relative block text-[10px] uppercase font-medium text-white/35 text-center mb-5"
        style={{ letterSpacing: '0.22em' }}>
        Construido sobre tecnología de clase mundial
      </span>

      <div className="relative"
        style={{
          maskImage:
            'linear-gradient(90deg, transparent 0%, black 8%, black 92%, transparent 100%)',
          WebkitMaskImage:
            'linear-gradient(90deg, transparent 0%, black 8%, black 92%, transparent 100%)',
        }}>
        <motion.div
          className="flex items-center gap-12 lg:gap-16 whitespace-nowrap"
          animate={{ x: ['0%', '-50%'] }}
          transition={{ duration: 44, repeat: Infinity, ease: 'linear' }}
        >
          {looped.map((l, i) => {
            const Mark = l.Mark
            return (
              <div key={i}
                className="group shrink-0 flex items-center justify-center h-9 px-2 transition-all duration-300"
              >
                <Mark />
              </div>
            )
          })}
        </motion.div>
      </div>
    </div>
  )
}

/* ─── premium logo marks (text-wordmarks · grayscale, hover violeta) ─── */
const logoBase: React.CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontWeight: 600,
  letterSpacing: '-0.02em',
  color: 'rgba(248,250,255,0.42)',
  transition: 'color 300ms ease, filter 300ms ease, transform 300ms ease',
}

const logoHover = 'group-hover:!text-[#D45BFF] group-hover:[filter:drop-shadow(0_0_12px_rgba(212,91,255,0.55))] group-hover:scale-[1.04]'

function LogoOpenAI() {
  return (
    <div className={`flex items-center gap-2 ${logoHover}`} style={logoBase}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M22.28 10.07a5.78 5.78 0 0 0-.5-4.74 5.84 5.84 0 0 0-6.3-2.8A5.78 5.78 0 0 0 11.01.66a5.84 5.84 0 0 0-5.57 4.05 5.78 5.78 0 0 0-3.86 2.8 5.84 5.84 0 0 0 .72 6.84 5.78 5.78 0 0 0 .5 4.74 5.84 5.84 0 0 0 6.3 2.8 5.78 5.78 0 0 0 4.36 1.95 5.84 5.84 0 0 0 5.57-4.04 5.78 5.78 0 0 0 3.85-2.8 5.84 5.84 0 0 0-.71-6.85zM13.03 22.07a4.33 4.33 0 0 1-2.78-1.01l.14-.08 4.62-2.67c.24-.13.38-.38.38-.65v-6.51l1.95 1.13a.07.07 0 0 1 .04.05v5.4a4.34 4.34 0 0 1-4.35 4.34zM3.68 18.08a4.33 4.33 0 0 1-.52-2.91l.14.09 4.62 2.66c.23.14.52.14.75 0l5.64-3.26v2.25c.01.03 0 .06-.03.07L9.62 19.69a4.34 4.34 0 0 1-5.94-1.61zm-1.22-10.1a4.33 4.33 0 0 1 2.26-1.9V11.59c0 .27.14.52.38.65l5.64 3.25-1.95 1.13a.07.07 0 0 1-.07 0l-4.67-2.7a4.34 4.34 0 0 1-1.59-5.93zm16.04 3.73-5.64-3.27 1.95-1.12a.07.07 0 0 1 .07 0l4.67 2.69a4.34 4.34 0 0 1-.65 7.83v-5.48a.76.76 0 0 0-.4-.65zm1.94-2.93-.14-.08-4.61-2.69a.75.75 0 0 0-.76 0L9.29 9.27V7.02a.07.07 0 0 1 .04-.07l4.67-2.69a4.34 4.34 0 0 1 6.44 4.49zM8.23 12.5l-1.95-1.13a.07.07 0 0 1-.04-.06v-5.4a4.34 4.34 0 0 1 7.11-3.33l-.14.08L8.6 5.32c-.23.14-.38.38-.38.65zm1.06-2.29 2.51-1.45 2.51 1.45v2.9l-2.51 1.45-2.51-1.45z" />
      </svg>
      <span style={{ fontSize: 15, color: 'inherit' }}>OpenAI</span>
    </div>
  )
}

function LogoAnthropic() {
  return (
    <div className={`flex items-center gap-2 ${logoHover}`} style={logoBase}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M7.3 5h3.4l5.1 14h-3.4l-1-3H6.6l-1 3H2.3L7.3 5zm.6 8.1h3.2L9.5 8 7.9 13.1zM17.4 5h3.3v14h-3.3V5z" />
      </svg>
      <span style={{ fontSize: 15, color: 'inherit' }}>Anthropic</span>
    </div>
  )
}

function LogoMeta() {
  return (
    <div className={`flex items-center gap-2 ${logoHover}`} style={logoBase}>
      <svg width="22" height="20" viewBox="0 0 32 24" fill="none" aria-hidden>
        <path d="M3 18c0-7 4-12 9-12 3 0 5 2 7 6 2-4 4-6 7-6 5 0 9 5 9 12 0 3-2 5-5 5-2 0-3-1-5-4l-3-5c-1 2-2 4-3 5-2 3-3 4-5 4-3 0-5-2-5-5h-1c0 3-2 5-5 5-3 0-5-2-5-5z"
          stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span style={{ fontSize: 15, color: 'inherit' }}>Meta</span>
    </div>
  )
}

function LogoWhatsApp() {
  return (
    <div className={`flex items-center gap-2 ${logoHover}`} style={logoBase}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M17.5 14.4c-.3-.1-1.7-.8-1.9-.9-.3-.1-.4-.1-.6.1-.2.3-.7.9-.8 1-.2.2-.3.2-.6.1-.3-.1-1.2-.4-2.3-1.4-.8-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6.1-.1.3-.3.4-.5.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5 0-.1-.6-1.4-.8-2-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.2.3-.9.9-.9 2.2 0 1.3.9 2.6 1 2.7.1.2 1.8 2.8 4.4 3.9.6.3 1.1.4 1.5.5.6.2 1.2.2 1.7.1.5-.1 1.7-.7 1.9-1.3.2-.7.2-1.2.2-1.3-.1-.1-.3-.2-.5-.3zM12 2C6.5 2 2 6.5 2 12c0 1.8.5 3.6 1.4 5.1L2 22l5.1-1.3c1.5.8 3.2 1.3 5 1.3 5.5 0 10-4.5 10-10S17.5 2 12 2z" />
      </svg>
      <span style={{ fontSize: 15, color: 'inherit' }}>WhatsApp</span>
    </div>
  )
}

function LogoStripe() {
  return (
    <div className={`flex items-center ${logoHover}`} style={logoBase}>
      <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.04em', color: 'inherit' }}>
        stripe
      </span>
    </div>
  )
}

function LogoGPT5() {
  return (
    <div className={`flex items-center gap-2 ${logoHover}`} style={logoBase}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M12 2 14 7l5 1-4 4 1 5-5-3-5 3 1-5-4-4 5-1z" opacity="0.9" />
      </svg>
      <span style={{ fontSize: 15, color: 'inherit' }}>GPT-5</span>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   VIDEO DEMO — Vimeo embed on-demand
   El iframe sólo se carga cuando el usuario clickea play. Antes de
   eso el peso de red es 0 (sólo el cover oscuro + botón).
   ═══════════════════════════════════════════════════════════════ */
const VIMEO_ID = '1197763990'
const VIMEO_EMBED_URL =
  `https://player.vimeo.com/video/${VIMEO_ID}?autoplay=1&title=0&byline=0&portrait=0&badge=0&dnt=1&playsinline=1`

function VideoDemo() {
  const [playing, setPlaying] = useState(false)
  const handlePlay = () => setPlaying(true)

  return (
    <section id="video" className="relative pt-8 pb-16 lg:pt-12 lg:pb-20">
      <div className="max-w-6xl mx-auto px-6 lg:px-8">
        {/* Title + sub */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="text-center max-w-2xl mx-auto mb-10 lg:mb-12"
        >
          <h2 className="leading-[1.02]"
            style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.04em' }}>
            <span className="block text-[32px] sm:text-[42px] lg:text-[52px] text-white/85"
              style={{ fontWeight: 300 }}>
              La inteligencia detrás
            </span>
            <span className="block text-[36px] sm:text-[48px] lg:text-[60px] mt-1"
              style={{
                fontWeight: 700,
                letterSpacing: '-0.05em',
              }}>
              <span className="text-white">de cada </span>
              <span style={{
                background: GRAD_MAIN,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
                venta.
              </span>
            </span>
          </h2>
          <p className="mt-6 text-[15px] lg:text-[16.5px] text-white/55 leading-relaxed max-w-xl mx-auto"
            style={{ letterSpacing: '-0.005em' }}>
            Descubre cómo NÜRO automatiza conversaciones, seguimiento y ventas
            desde una única plataforma.
          </p>
        </motion.div>

        {/* Video frame — minimal premium */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative rounded-[24px] overflow-hidden"
          style={{
            background: 'rgba(11,16,38,0.55)',
            border: '1px solid rgba(255,255,255,0.10)',
            boxShadow:
              '0 40px 80px -24px rgba(0,0,0,0.7), 0 0 60px -20px rgba(142,68,255,0.45), 0 0 80px -30px rgba(6,182,212,0.3), 0 0 0 1px rgba(212,91,255,0.10), inset 0 1px 0 rgba(255,255,255,0.04)',
          }}
        >
          {/* Outer ambient glow ring */}
          <span aria-hidden className="pointer-events-none absolute -inset-px rounded-[24px]"
            style={{
              background:
                'linear-gradient(135deg, rgba(142,68,255,0.22), transparent 40%, rgba(6,182,212,0.18))',
              mask: 'linear-gradient(#000, #000) content-box, linear-gradient(#000, #000)',
              WebkitMask: 'linear-gradient(#000, #000) content-box, linear-gradient(#000, #000)',
              maskComposite: 'exclude',
              WebkitMaskComposite: 'xor',
              padding: 1,
            }}
          />

          {/* Top bar — minimal single line */}
          <div className="relative flex items-center justify-between gap-4 px-5 sm:px-6 py-3.5 backdrop-blur-xl"
            style={{
              background: 'rgba(11,16,38,0.65)',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}>
            <div className="flex items-center gap-2 shrink-0">
              <span className="relative flex h-1.5 w-1.5">
                <motion.span className="absolute inline-flex h-full w-full rounded-full"
                  style={{ background: '#D45BFF' }}
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 2, repeat: Infinity }} />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full"
                  style={{ background: '#D45BFF' }} />
              </span>
              <span className="text-[10.5px] uppercase font-semibold text-white/85"
                style={{ letterSpacing: '0.22em' }}>
                Demo en vivo
              </span>
            </div>
            <div className="text-[11px] font-medium text-white/45 truncate"
              style={{ letterSpacing: '-0.005em' }}>
              WhatsApp <span className="text-white/25">•</span> Messenger{' '}
              <span className="text-white/25">•</span> Instagram{' '}
              <span className="text-white/25">•</span> Tienda Virtual
            </div>
          </div>

          {/* Video frame · Vimeo iframe carga sólo on-demand (peso 0 al inicio) */}
          <div className="relative aspect-video"
            style={{ background: '#050816' }}>
            {playing && (
              <iframe
                src={VIMEO_EMBED_URL}
                title="NÜRO · Demo en vivo"
                className="absolute inset-0 w-full h-full"
                style={{ border: 0 }}
                allow="autoplay; fullscreen; picture-in-picture; clipboard-write"
                allowFullScreen
              />
            )}

            <AnimatePresence>
              {!playing && (
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={handlePlay}
                  className="absolute inset-0 flex items-center justify-center"
                  style={{
                    background:
                      'radial-gradient(ellipse at center, rgba(5,8,22,0.0) 0%, rgba(5,8,22,0.55) 60%, rgba(5,8,22,0.78) 100%)',
                  }}
                  aria-label="Reproducir demo"
                >
                  {/* Outer pulse ring */}
                  <motion.span aria-hidden className="absolute w-[120px] h-[120px] rounded-full"
                    style={{ border: '1px solid rgba(212,91,255,0.45)' }}
                    animate={{ scale: [1, 1.35, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ duration: 2.4, repeat: Infinity, ease: 'easeOut' }}
                  />
                  <motion.span
                    whileHover={{ scale: 1.06 }}
                    whileTap={{ scale: 0.97 }}
                    className="relative w-[96px] h-[96px] rounded-full flex items-center justify-center"
                    style={{
                      background: 'rgba(11,16,38,0.45)',
                      border: '1px solid rgba(212,91,255,0.55)',
                      backdropFilter: 'blur(14px)',
                      boxShadow:
                        '0 18px 50px -10px rgba(142,68,255,0.55), 0 0 0 4px rgba(142,68,255,0.10), inset 0 1px 0 rgba(255,255,255,0.18)',
                    }}
                  >
                    <Play className="w-7 h-7 text-white ml-1" fill="currentColor"
                      strokeWidth={0}
                      style={{ filter: 'drop-shadow(0 0 8px rgba(212,91,255,0.7))' }}
                    />
                  </motion.span>
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </section>
  )
}


/* ═══════════════════════════════════════════════════════════════
   HOW IT WORKS
   ═══════════════════════════════════════════════════════════════ */
function HowItWorks() {
  const steps = [
    { n: '01', icon: Brain, title: 'Configura',  desc: 'Carga tu catálogo, datos y forma de atender clientes.' },
    { n: '02', icon: Zap,   title: 'Activa',     desc: 'Conecta WhatsApp o Messenger en menos de 30 segundos.' },
    { n: '03', icon: Globe, title: 'Vende',      desc: 'NÜRO responde, hace seguimiento y cierra ventas, 24/7.' },
  ]

  return (
    <section className="relative py-24 lg:py-32">
      <div className="max-w-6xl mx-auto px-6 lg:px-8">
        <SectionHeader
          eyebrow="Cómo funciona"
          title="Tres pasos. Una integración."
        />

        <div className="grid lg:grid-cols-3 gap-10 lg:gap-12 mt-16 lg:mt-20 relative">
          {/* SVG connection line con flujo */}
          <svg
            aria-hidden
            className="hidden lg:block absolute top-[100px] left-[10%] right-[10%] pointer-events-none"
            style={{ height: 24, width: '80%' }}
            viewBox="0 0 100 4"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="howFlow" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="rgba(212,91,255,0)" />
                <stop offset="25%" stopColor="rgba(212,91,255,0.45)" />
                <stop offset="50%" stopColor="rgba(6,182,212,0.55)" />
                <stop offset="75%" stopColor="rgba(212,91,255,0.45)" />
                <stop offset="100%" stopColor="rgba(212,91,255,0)" />
              </linearGradient>
            </defs>
            <line x1="0" y1="2" x2="100" y2="2"
              stroke="url(#howFlow)" strokeWidth="0.4"
              vectorEffect="non-scaling-stroke" />
            {/* Partícula viajando por la línea */}
            <motion.circle r="0.7" cy="2" fill="#D45BFF"
              style={{ filter: 'drop-shadow(0 0 3px rgba(212,91,255,1))' }}
              animate={{ cx: [0, 100], opacity: [0, 1, 1, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', times: [0, 0.1, 0.9, 1] }}
            />
          </svg>

          {steps.map((s, idx) => {
            const Icon = s.icon
            return (
              <motion.div
                key={s.n}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.6, delay: idx * 0.15, ease: [0.22, 1, 0.36, 1] }}
                className="relative text-center"
              >
                <span className="block text-[10.5px] uppercase font-medium mb-4"
                  style={{ letterSpacing: '0.22em', color: 'rgba(212,91,255,0.7)' }}>
                  {s.n}
                </span>

                {/* Glass circle con doble glow violet/cyan */}
                <div className="relative inline-flex w-16 h-16 rounded-full items-center justify-center mb-6"
                  style={{
                    background: 'radial-gradient(circle at 35% 30%, rgba(142,68,255,0.32), rgba(11,16,38,0.85) 70%)',
                    border: '1px solid rgba(212,91,255,0.38)',
                    backdropFilter: 'blur(20px)',
                    boxShadow:
                      '0 0 32px -6px rgba(142,68,255,0.55), 0 0 22px -8px rgba(6,182,212,0.35), inset 0 1px 0 rgba(255,255,255,0.10), inset 0 -10px 24px -10px rgba(212,91,255,0.20)',
                  }}>
                  {/* Hairline ring inner */}
                  <span aria-hidden className="absolute inset-1.5 rounded-full pointer-events-none"
                    style={{ border: '1px solid rgba(255,255,255,0.06)' }} />
                  <Icon className="w-6 h-6 relative" strokeWidth={1.5}
                    style={{ color: '#D45BFF', filter: 'drop-shadow(0 0 6px rgba(212,91,255,0.6))' }} />
                </div>

                <h3 className="text-[22px] lg:text-[24px] font-medium text-white leading-tight mb-3"
                  style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.025em' }}>
                  {s.title}
                </h3>
                <p className="text-[14.5px] text-white/55 leading-relaxed max-w-xs mx-auto"
                  style={{ letterSpacing: '-0.005em' }}>
                  {s.desc}
                </p>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}


/* ═══════════════════════════════════════════════════════════════
   ANIMATED COUNTER — easeOutCubic, IntersectionObserver-triggered
   ═══════════════════════════════════════════════════════════════ */
function AnimatedNumber({
  target, format, duration = 2.4,
}: { target: number; format: (n: number) => string; duration?: number }) {
  const [display, setDisplay] = useState(() => format(0))
  const ref = useRef<HTMLSpanElement>(null)
  const started = useRef(false)

  useEffect(() => {
    if (!ref.current) return
    const node = ref.current
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true
          const startTime = performance.now()
          const tick = (now: number) => {
            const elapsed = (now - startTime) / 1000
            const progress = Math.min(elapsed / duration, 1)
            const eased = 1 - Math.pow(1 - progress, 3) // easeOutCubic
            setDisplay(format(target * eased))
            if (progress < 1) requestAnimationFrame(tick)
          }
          requestAnimationFrame(tick)
        }
      },
      { threshold: 0.3 }
    )
    obs.observe(node)
    return () => obs.disconnect()
  }, [target, format, duration])

  return <span ref={ref}>{display}</span>
}

function hexToRgb(hex: string): string {
  const m = hex.replace('#', '').match(/.{2}/g)
  if (!m) return '212,91,255'
  const [r, g, b] = m.map((h) => parseInt(h, 16))
  return `${r},${g},${b}`
}

/* ═══════════════════════════════════════════════════════════════
   SHARED — Section header
   ═══════════════════════════════════════════════════════════════ */
function SectionHeader({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.5 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className="text-center"
    >
      <span className="inline-block text-[11px] uppercase font-medium mb-5"
        style={{ letterSpacing: '0.22em', color: 'rgba(212,91,255,0.85)' }}>
        {eyebrow}
      </span>
      <h2
        className="font-medium text-[32px] sm:text-[44px] lg:text-[54px] leading-[1.04] max-w-3xl mx-auto"
        style={{
          fontFamily: 'var(--font-display)',
          letterSpacing: '-0.04em',
          background: 'linear-gradient(180deg, #F8FAFF 0%, #D45BFF 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
      >
        {title}
      </h2>
      {sub && (
        <p className="mt-5 text-[15px] lg:text-[16px] text-white/55 leading-relaxed max-w-xl mx-auto"
          style={{ letterSpacing: '-0.005em' }}>
          {sub}
        </p>
      )}
    </motion.div>
  )
}
