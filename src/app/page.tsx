'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { Space_Grotesk, Inter } from 'next/font/google'
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion'
import {
  Bot, ShoppingBag, Sparkles, ArrowRight, Play, MessageCircle,
  Check, Menu, X, Zap, Brain, Globe, ChevronDown,
  UtensilsCrossed, Briefcase, Home, GraduationCap,
  Mail, Send, Phone,
} from 'lucide-react'

const display = Space_Grotesk({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-display' })
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
        <TrustBar />
        <VideoDemo />
        <Services />
        <UseCases />
        <HowItWorks />
        <PricingTeaser />
        <FAQ />
        <FinalCTA />
        <Footer />
      </main>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   BACKGROUND — neblina violeta + grid + glows
   ═══════════════════════════════════════════════════════════════ */
function BackgroundLayers() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Base — radial premium */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 85% 65% at 70% 0%, #0B1026 0%, #050816 60%, #050816 100%)',
        }}
      />

      {/* Blueprint grid — ultra fino violeta, mascarado */}
      <div
        className="absolute inset-0"
        style={{
          opacity: 0.06,
          backgroundImage:
            'linear-gradient(rgba(142,68,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(142,68,255,1) 1px, transparent 1px)',
          backgroundSize: '72px 72px',
          maskImage: 'radial-gradient(ellipse 90% 80% at 50% 40%, black 0%, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(ellipse 90% 80% at 50% 40%, black 0%, transparent 75%)',
        }}
      />

      {/* Hairlines tecnológicas mínimas */}
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          background:
            'repeating-linear-gradient(0deg, transparent 0px, transparent 240px, rgba(212,91,255,0.5) 240px, rgba(212,91,255,0.5) 241px)',
          maskImage: 'radial-gradient(ellipse at 50% 50%, black 0%, transparent 70%)',
          WebkitMaskImage: 'radial-gradient(ellipse at 50% 50%, black 0%, transparent 70%)',
        }}
      />

      {/* Neblina violeta principal — top right (NÜRO area) */}
      <motion.div
        className="absolute"
        style={{
          top: '0%',
          right: '-15%',
          width: '820px',
          height: '820px',
          background:
            'radial-gradient(circle, rgba(142,68,255,0.30) 0%, rgba(107,92,255,0.12) 35%, transparent 65%)',
          filter: 'blur(90px)',
        }}
        animate={{ opacity: [0.85, 1, 0.85], scale: [1, 1.04, 1] }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Neblina magenta secundaria — bottom left */}
      <motion.div
        className="absolute"
        style={{
          bottom: '-10%',
          left: '-10%',
          width: '720px',
          height: '720px',
          background:
            'radial-gradient(circle, rgba(212,91,255,0.16) 0%, rgba(29,46,109,0.18) 40%, transparent 70%)',
          filter: 'blur(90px)',
        }}
        animate={{ opacity: [0.75, 1, 0.75], scale: [1, 1.05, 1] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
      />

      {/* Neblina deep accent — center bottom */}
      <div
        className="absolute"
        style={{
          bottom: '20%',
          left: '40%',
          width: '480px',
          height: '480px',
          background:
            'radial-gradient(circle, rgba(29,46,109,0.45) 0%, transparent 65%)',
          filter: 'blur(100px)',
        }}
      />

      {/* Vignette premium */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 35%, rgba(5,8,22,0.75) 100%)',
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
   HERO — editorial premium + NÜRO protagonista
   ═══════════════════════════════════════════════════════════════ */
function Hero({ onNav }: { onNav: (id: string) => void }) {
  return (
    <section className="relative pt-32 pb-20 lg:pt-44 lg:pb-32">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 grid lg:grid-cols-[1fr_1.15fr] gap-12 lg:gap-8 items-center">
        {/* ── LEFT: copy ── */}
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

          {/* Headline */}
          <h1
            className="font-medium text-[44px] sm:text-[58px] lg:text-[72px] leading-[1.00]"
            style={{
              fontFamily: 'var(--font-display)',
              letterSpacing: '-0.05em',
              color: '#F8FAFF',
            }}
          >
            Vender con IA,<br />
            <span style={{
              background: GRAD_MAIN,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              filter: 'drop-shadow(0 0 30px rgba(142,68,255,0.35))',
            }}>
              sin pausa.
            </span>
          </h1>

          {/* Sub */}
          <p
            className="mt-7 text-[17px] lg:text-[18px] text-white/60 leading-relaxed max-w-md"
            style={{ letterSpacing: '-0.005em', fontWeight: 400 }}
          >
            La plataforma más avanzada para vender con inteligencia artificial
            en Latinoamérica. WhatsApp, Messenger y tu tienda virtual,
            operando en piloto automático.
          </p>

          {/* CTAs */}
          <div className="mt-10 flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <Link
              href="/login"
              className="relative group/cta inline-flex items-center justify-center gap-2 h-12 px-7 rounded-xl text-white font-medium text-[14px] overflow-hidden w-full sm:w-auto"
              style={{
                background: GRAD_BTN,
                boxShadow:
                  '0 18px 44px -10px rgba(142,68,255,0.75), 0 0 0 1px rgba(212,91,255,0.35), inset 0 1px 0 rgba(255,255,255,0.24)',
                letterSpacing: '-0.005em',
              }}
            >
              <span className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/22 to-transparent -translate-x-full group-hover/cta:translate-x-full transition-transform duration-900" />
              <span className="relative">Iniciar sesión</span>
              <ArrowRight className="w-4 h-4 relative" />
            </Link>

            <button
              onClick={() => onNav('video')}
              className="inline-flex items-center justify-center gap-2.5 h-12 px-5 rounded-xl text-white/80 hover:text-white font-medium text-[14px] transition-colors w-full sm:w-auto"
              style={{
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.10)',
                letterSpacing: '-0.005em',
              }}
            >
              <span className="relative w-6 h-6 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(142,68,255,0.14)' }}>
                <Play className="w-2.5 h-2.5 ml-0.5" fill="currentColor"
                  style={{ color: '#D45BFF' }} />
              </span>
              Ver demo
            </button>
          </div>

          {/* Quiet stats row */}
          <div className="mt-14 pt-8 flex items-center gap-8 sm:gap-10 flex-wrap"
            style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            {[
              { v: '24/7',   l: 'Atención continua' },
              { v: '< 30s',  l: 'Setup' },
              { v: '4',      l: 'Canales' },
            ].map((s, i) => (
              <div key={i} className="flex flex-col gap-1">
                <span className="text-[22px] font-medium text-white tabular-nums leading-none"
                  style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.03em' }}>
                  {s.v}
                </span>
                <span className="text-[11px] uppercase text-white/45 font-medium"
                  style={{ letterSpacing: '0.14em' }}>
                  {s.l}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ── RIGHT: NÜRO protagonist ── */}
        <NuroProtagonist />
      </div>
    </section>
  )
}

function NuroProtagonist() {
  // Parallax sutil basado en scroll
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollY } = useScroll()
  const y = useTransform(scrollY, [0, 600], [0, -40])
  const opacity = useTransform(scrollY, [0, 600], [1, 0.5])

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 1.3, ease: [0.22, 1, 0.36, 1] }}
      style={{ y, opacity }}
      className="relative h-[520px] sm:h-[620px] lg:h-[760px] flex items-center justify-center"
      aria-hidden
    >
      {/* Soft cinematic violet glow behind — pulse muy lento */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <motion.div
          className="rounded-full"
          style={{
            width: 'min(620px, 85%)',
            height: 'min(620px, 85%)',
            background:
              'radial-gradient(circle, rgba(142,68,255,0.45) 0%, rgba(212,91,255,0.18) 35%, transparent 70%)',
            filter: 'blur(50px)',
          }}
          animate={{ opacity: [0.75, 1, 0.75], scale: [1, 1.04, 1] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      {/* Hairline orbital ring única, ultra delgada */}
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 'min(680px, 95%)',
          height: 'min(680px, 95%)',
          border: '1px solid rgba(212,91,255,0.12)',
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 110, repeat: Infinity, ease: 'linear' }}
      >
        <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full"
          style={{ background: '#D45BFF', boxShadow: '0 0 12px rgba(212,91,255,1)' }} />
      </motion.div>

      {/* NÜRO image — protagonista con reflejos morados cinematográficos */}
      <motion.img
        src={AVATAR}
        alt="NÜRO"
        className="relative object-contain"
        style={{
          height: '112%',
          width: 'auto',
          maxWidth: '100%',
          filter:
            'drop-shadow(0 0 90px rgba(142,68,255,0.55)) drop-shadow(0 0 200px rgba(212,91,255,0.35)) drop-shadow(0 30px 80px rgba(5,8,22,0.7))',
        }}
        animate={{ y: [0, -12, 0] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Bottom reflection halo */}
      <div className="pointer-events-none absolute bottom-[12%] left-1/2 -translate-x-1/2 w-[60%] h-[40px]"
        style={{
          background: 'radial-gradient(ellipse, rgba(212,91,255,0.4), transparent 70%)',
          filter: 'blur(20px)',
        }}
      />
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   TRUST BAR
   ═══════════════════════════════════════════════════════════════ */
function TrustBar() {
  const stats = [
    { v: '+500',  l: 'Negocios activos' },
    { v: '+2M',   l: 'Mensajes procesados' },
    { v: '98%',   l: 'Tasa de respuesta' },
    { v: '24/7',  l: 'Operación' },
  ]
  const partners = ['OpenAI', 'Anthropic', 'WhatsApp Cloud', 'Meta', 'Stripe']

  return (
    <section className="relative py-20 lg:py-28">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-10 gap-x-6 pb-12"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          {stats.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.5, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col gap-1.5"
            >
              <span
                className="text-[36px] lg:text-[44px] font-medium tabular-nums leading-none"
                style={{
                  fontFamily: 'var(--font-display)',
                  letterSpacing: '-0.04em',
                  background: 'linear-gradient(180deg, #F8FAFF 0%, #D45BFF 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                {s.v}
              </span>
              <span className="text-[11px] uppercase text-white/45 font-medium"
                style={{ letterSpacing: '0.16em' }}>
                {s.l}
              </span>
            </motion.div>
          ))}
        </div>

        <div className="pt-10 flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
          <span className="text-[10.5px] uppercase font-medium text-white/35"
            style={{ letterSpacing: '0.2em' }}>
            Construido sobre
          </span>
          {partners.map((p, i) => (
            <span key={i}
              className="text-[12.5px] uppercase font-medium text-white/55 hover:text-white/85 transition-colors"
              style={{ letterSpacing: '0.14em', fontFamily: 'var(--font-display)' }}>
              {p}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════
   VIDEO DEMO
   ═══════════════════════════════════════════════════════════════ */
const VIDEO_URL = '/nuro-demo.mp4'

function VideoDemo() {
  const [playing, setPlaying] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  const handlePlay = () => {
    const v = videoRef.current
    if (!v) return
    v.play().catch(() => {})
    setPlaying(true)
  }

  return (
    <section id="video" className="relative py-24 lg:py-32">
      <div className="max-w-6xl mx-auto px-6 lg:px-8">
        <SectionHeader
          eyebrow="Demo"
          title="Mira NÜRO operando un negocio real"
          sub="Conversaciones, seguimientos y cierres — todo en automático."
        />

        <motion.div
          initial={{ opacity: 0, y: 22 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative mt-14 rounded-[28px] overflow-hidden"
          style={{
            background:
              'linear-gradient(180deg, rgba(29,46,109,0.32), rgba(11,16,38,0.7))',
            border: '1px solid rgba(142,68,255,0.20)',
            boxShadow:
              '0 30px 80px -24px rgba(142,68,255,0.45), inset 0 1px 0 rgba(255,255,255,0.04)',
          }}
        >
          <div className="relative aspect-video"
            style={{ background: '#050816' }}>
            <video
              ref={videoRef}
              src={VIDEO_URL}
              controls={playing}
              playsInline
              preload="metadata"
              className="absolute inset-0 w-full h-full object-contain"
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onEnded={() => setPlaying(false)}
            />

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
                      'radial-gradient(circle at center, rgba(142,68,255,0.22), rgba(5,8,22,0.55) 65%)',
                  }}
                  aria-label="Reproducir demo"
                >
                  <motion.span
                    whileHover={{ scale: 1.06 }}
                    whileTap={{ scale: 0.96 }}
                    animate={{ scale: [1, 1.03, 1] }}
                    transition={{ scale: { duration: 2.6, repeat: Infinity, ease: 'easeInOut' } }}
                    className="relative w-20 h-20 rounded-full flex items-center justify-center"
                    style={{
                      background: GRAD_BTN,
                      boxShadow:
                        '0 22px 60px -8px rgba(142,68,255,0.9), inset 0 2px 0 rgba(255,255,255,0.32)',
                    }}
                  >
                    <Play className="w-7 h-7 text-white ml-0.5" fill="currentColor" />
                    <motion.span
                      className="absolute inset-0 rounded-full pointer-events-none"
                      style={{ border: '1.5px solid rgba(212,91,255,0.6)' }}
                      animate={{ scale: [1, 1.8], opacity: [0.7, 0] }}
                      transition={{ duration: 2.2, repeat: Infinity, ease: 'easeOut' }}
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
   SERVICES — 2 glass cards premium
   ═══════════════════════════════════════════════════════════════ */
function Services() {
  const services = [
    {
      id: 'agentes',
      icon: Bot,
      label: 'Agentes IA',
      desc: 'Atienden clientes en tiempo real, hacen seguimiento y cierran ventas — sin guiones, sin pausas.',
      benefits: ['Atención 24/7', 'Seguimiento automático', 'Multi-canal', 'Análisis avanzado'],
    },
    {
      id: 'tiendas',
      icon: ShoppingBag,
      label: 'Tiendas Virtuales',
      desc: 'Catálogo, pedidos y pagos integrados con tu agente. Una experiencia, todo conectado.',
      benefits: ['Catálogo ilimitado', 'Pedidos en línea', 'Pagos integrados', 'Admin simple'],
    },
  ]

  return (
    <section id="producto" className="relative py-24 lg:py-32">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <SectionHeader
          eyebrow="Producto"
          title="Dos productos, un ecosistema"
          sub="Diseñados para trabajar juntos desde el primer mensaje."
        />

        <div className="grid lg:grid-cols-2 gap-5 lg:gap-6 mt-14 lg:mt-20">
          {services.map((s, idx) => {
            const Icon = s.icon
            return (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.6, delay: idx * 0.1, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ y: -4 }}
                className="group relative rounded-[28px] p-9 lg:p-12 backdrop-blur-xl overflow-hidden transition-all duration-500"
                style={{
                  background:
                    'linear-gradient(180deg, rgba(29,46,109,0.45) 0%, rgba(11,16,38,0.75) 100%)',
                  border: '1px solid rgba(142,68,255,0.18)',
                  boxShadow:
                    '0 24px 60px -20px rgba(142,68,255,0.30), inset 0 1px 0 rgba(255,255,255,0.04)',
                }}
              >
                {/* Hover border glow */}
                <div className="pointer-events-none absolute inset-0 rounded-[28px] opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{
                    boxShadow:
                      '0 0 0 1px rgba(212,91,255,0.40), 0 30px 80px -20px rgba(142,68,255,0.55)',
                  }}
                />

                {/* Top hairline */}
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px"
                  style={{
                    background:
                      'linear-gradient(90deg, transparent, rgba(212,91,255,0.55), transparent)',
                  }} />

                {/* Ambient glow corner */}
                <div className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full opacity-70"
                  style={{
                    background:
                      'radial-gradient(circle, rgba(142,68,255,0.30), transparent 65%)',
                    filter: 'blur(50px)',
                  }} />

                <div className="relative">
                  {/* Icon */}
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center mb-7"
                    style={{
                      background:
                        'linear-gradient(135deg, rgba(142,68,255,0.25), rgba(11,16,38,0.6))',
                      border: '1px solid rgba(212,91,255,0.32)',
                      boxShadow:
                        '0 0 28px -6px rgba(142,68,255,0.6), inset 0 1px 0 rgba(255,255,255,0.14)',
                    }}
                  >
                    <Icon className="w-6 h-6" strokeWidth={1.5}
                      style={{ color: '#D45BFF' }} />
                  </div>

                  <h3
                    className="text-[28px] lg:text-[32px] font-medium text-white leading-[1.1] mb-3"
                    style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.03em' }}
                  >
                    {s.label}
                  </h3>
                  <p className="text-[15px] lg:text-[16px] text-white/60 leading-relaxed mb-8 max-w-md"
                    style={{ letterSpacing: '-0.005em' }}>
                    {s.desc}
                  </p>

                  <ul className="space-y-3">
                    {s.benefits.map((b, i) => (
                      <li key={i} className="flex items-center gap-3 text-[14px] text-white/80">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full shrink-0"
                          style={{
                            background: 'rgba(142,68,255,0.18)',
                            border: '1px solid rgba(212,91,255,0.35)',
                          }}>
                          <Check className="w-3 h-3" strokeWidth={3}
                            style={{ color: '#D45BFF' }} />
                        </span>
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════
   USE CASES
   ═══════════════════════════════════════════════════════════════ */
function UseCases() {
  const cases = [
    { icon: ShoppingBag,     label: 'Tiendas de ropa',         desc: 'Catálogo, tallas y pedidos por WhatsApp.' },
    { icon: UtensilsCrossed, label: 'Restaurantes',            desc: 'Menú, reservas y pedidos a domicilio.' },
    { icon: Sparkles,        label: 'Cosmética y belleza',     desc: 'Asesoría 1:1 y venta de productos.' },
    { icon: Briefcase,       label: 'Servicios profesionales', desc: 'Agenda citas y filtra leads.' },
    { icon: Home,            label: 'Inmobiliarias',           desc: 'Califica prospectos y agenda visitas.' },
    { icon: GraduationCap,   label: 'Cursos y coaching',       desc: 'Resuelve dudas y cierra inscripciones.' },
  ]

  return (
    <section className="relative py-24 lg:py-32">
      {/* Panel oscuro sutil para diferenciar */}
      <div className="absolute inset-x-0 inset-y-12 -z-0"
        style={{
          background: 'linear-gradient(180deg, transparent, rgba(11,16,38,0.5), transparent)',
        }} />

      <div className="relative max-w-7xl mx-auto px-6 lg:px-8">
        <SectionHeader
          eyebrow="Casos de uso"
          title="Hecho para negocios que viven del chat"
          sub="Si vendes por WhatsApp, NÜRO es para ti."
        />

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-14 lg:mt-20">
          {cases.map((c, i) => {
            const Icon = c.icon
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.5, delay: (i % 3) * 0.08, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ y: -3 }}
                className="group relative rounded-2xl p-7 backdrop-blur-xl overflow-hidden transition-all duration-400"
                style={{
                  background: 'linear-gradient(180deg, rgba(29,46,109,0.32), rgba(11,16,38,0.65))',
                  border: '1px solid rgba(142,68,255,0.12)',
                }}
              >
                <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{ boxShadow: '0 0 0 1px rgba(212,91,255,0.32)' }} />

                <div className="relative w-11 h-11 rounded-xl flex items-center justify-center mb-5"
                  style={{
                    background: 'linear-gradient(135deg, rgba(142,68,255,0.22), rgba(11,16,38,0.5))',
                    border: '1px solid rgba(212,91,255,0.25)',
                  }}>
                  <Icon strokeWidth={1.6}
                    style={{ width: 18, height: 18, color: '#D45BFF' }} />
                </div>

                <h3 className="text-[17px] font-medium text-white leading-tight mb-1.5"
                  style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>
                  {c.label}
                </h3>
                <p className="text-[13.5px] text-white/55 leading-relaxed"
                  style={{ letterSpacing: '-0.005em' }}>
                  {c.desc}
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
          <div className="hidden lg:block absolute top-7 left-[16%] right-[16%] h-px"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(212,91,255,0.30), transparent)' }} />

          {steps.map((s, idx) => {
            const Icon = s.icon
            return (
              <motion.div
                key={s.n}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.55, delay: idx * 0.12, ease: [0.22, 1, 0.36, 1] }}
                className="relative text-center"
              >
                <span className="block text-[10.5px] uppercase font-medium mb-4"
                  style={{ letterSpacing: '0.22em', color: 'rgba(212,91,255,0.7)' }}>
                  {s.n}
                </span>

                <div className="relative inline-flex w-14 h-14 rounded-2xl items-center justify-center mb-6"
                  style={{
                    background: 'linear-gradient(135deg, rgba(142,68,255,0.22), rgba(11,16,38,0.6))',
                    border: '1px solid rgba(212,91,255,0.28)',
                    boxShadow: '0 0 28px -8px rgba(142,68,255,0.55), inset 0 1px 0 rgba(255,255,255,0.08)',
                  }}>
                  <Icon className="w-6 h-6" strokeWidth={1.5}
                    style={{ color: '#D45BFF' }} />
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
   PRICING
   ═══════════════════════════════════════════════════════════════ */
function PricingTeaser() {
  const plans = [
    {
      name: 'Starter',
      price: '299',
      desc: 'Para empezar.',
      features: ['1 Agente IA', 'WhatsApp Web', 'Tienda básica', '500 mensajes/mes'],
      cta: 'Comenzar',
      popular: false,
    },
    {
      name: 'Pro',
      price: '799',
      desc: 'El favorito.',
      features: ['3 Agentes IA', 'WhatsApp Cloud + Messenger', 'Tienda ilimitada', '5,000 mensajes/mes', 'Reportes avanzados'],
      cta: 'Probar Pro',
      popular: true,
    },
    {
      name: 'Premium',
      price: '1,599',
      desc: 'Para escalar.',
      features: ['Agentes ilimitados', 'Todos los canales', 'Multi-tienda', 'Mensajes ilimitados', 'Soporte prioritario'],
      cta: 'Hablar con ventas',
      popular: false,
    },
  ]

  return (
    <section id="planes" className="relative py-24 lg:py-32">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <SectionHeader
          eyebrow="Planes"
          title="Precios simples y honestos"
          sub="MXN/mes. Sin contratos. Cancela cuando quieras."
        />

        <div className="grid lg:grid-cols-3 gap-5 mt-16 lg:mt-20">
          {plans.map((p, i) => (
            <motion.div
              key={p.name}
              initial={{ opacity: 0, y: 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.55, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ y: -4 }}
              className="relative rounded-[28px] p-8 lg:p-10 backdrop-blur-xl overflow-hidden transition-all duration-500"
              style={{
                background: p.popular
                  ? 'linear-gradient(180deg, rgba(142,68,255,0.18) 0%, rgba(29,46,109,0.55) 50%, rgba(11,16,38,0.75) 100%)'
                  : 'linear-gradient(180deg, rgba(29,46,109,0.40), rgba(11,16,38,0.65))',
                border: p.popular
                  ? '1px solid rgba(212,91,255,0.50)'
                  : '1px solid rgba(142,68,255,0.14)',
                boxShadow: p.popular
                  ? '0 32px 75px -20px rgba(142,68,255,0.65), inset 0 1px 0 rgba(255,255,255,0.10)'
                  : 'inset 0 1px 0 rgba(255,255,255,0.04)',
              }}
            >
              {p.popular && (
                <>
                  <div className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 w-72 h-32"
                    style={{
                      background: 'radial-gradient(ellipse, rgba(142,68,255,0.55), transparent 70%)',
                      filter: 'blur(40px)',
                    }} />
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-3 py-1 rounded-full text-[9.5px] uppercase font-medium text-white whitespace-nowrap"
                    style={{
                      background: GRAD_BTN,
                      letterSpacing: '0.2em',
                      boxShadow: '0 10px 26px -4px rgba(142,68,255,0.85), inset 0 1px 0 rgba(255,255,255,0.28)',
                    }}>
                    Más popular
                  </div>
                </>
              )}

              <div className="pointer-events-none absolute inset-x-0 top-0 h-px"
                style={{ background: `linear-gradient(90deg, transparent, rgba(212,91,255,${p.popular ? 0.7 : 0.35}), transparent)` }} />

              <div className="relative">
                <div className="text-[11px] uppercase font-medium mb-4"
                  style={{ letterSpacing: '0.22em', color: 'rgba(212,91,255,0.85)' }}>
                  {p.name}
                </div>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-[14px] text-white/55 font-medium">$</span>
                  <span className="text-[48px] lg:text-[54px] font-medium text-white tabular-nums leading-none"
                    style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.04em' }}>
                    {p.price}
                  </span>
                  <span className="text-[12px] text-white/40 ml-1">/mes</span>
                </div>
                <p className="text-[14px] text-white/55 mb-7 leading-relaxed"
                  style={{ letterSpacing: '-0.005em' }}>
                  {p.desc}
                </p>

                <ul className="space-y-3 mb-9">
                  {p.features.map((f, k) => (
                    <li key={k} className="flex items-start gap-3 text-[13.5px] text-white/75">
                      <span className="mt-[3px] flex h-4 w-4 items-center justify-center rounded-full shrink-0"
                        style={{
                          background: 'rgba(142,68,255,0.18)',
                          border: '1px solid rgba(212,91,255,0.35)',
                        }}>
                        <Check className="w-2.5 h-2.5" strokeWidth={3.5}
                          style={{ color: '#D45BFF' }} />
                      </span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href="/pricing"
                  className={`relative group/pcta flex items-center justify-center gap-2 h-12 rounded-xl font-medium text-[13.5px] overflow-hidden transition-colors ${
                    p.popular ? 'text-white' : 'text-white/85 hover:text-white'
                  }`}
                  style={
                    p.popular
                      ? {
                          background: GRAD_BTN,
                          boxShadow:
                            '0 14px 30px -8px rgba(142,68,255,0.75), inset 0 1px 0 rgba(255,255,255,0.25)',
                          letterSpacing: '-0.005em',
                        }
                      : {
                          background: 'transparent',
                          border: '1px solid rgba(212,91,255,0.28)',
                          letterSpacing: '-0.005em',
                        }
                  }
                >
                  {p.popular && (
                    <span className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/22 to-transparent -translate-x-full group-hover/pcta:translate-x-full transition-transform duration-700" />
                  )}
                  <span className="relative">{p.cta}</span>
                  <ArrowRight className="w-3.5 h-3.5 relative" />
                </Link>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="text-center mt-12">
          <Link href="/pricing"
            className="inline-flex items-center gap-2 text-[13px] font-medium transition-colors"
            style={{ color: '#D45BFF' }}>
            Ver comparativa completa
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════
   FAQ
   ═══════════════════════════════════════════════════════════════ */
function FAQ() {
  const [openIdx, setOpenIdx] = useState<number | null>(0)
  const items = [
    { q: '¿Necesito tarjeta de crédito para empezar?',
      a: 'No. Puedes registrarte gratis y probar NÜRO sin ingresar ningún dato de pago. Solo cobramos cuando decides activar un plan.' },
    { q: '¿Cuánto tardo en activar mi agente?',
      a: 'Menos de 30 segundos. Conectas WhatsApp o Messenger, cargas la información de tu negocio y el agente empieza a atender.' },
    { q: '¿Funciona con mi número actual de WhatsApp?',
      a: 'Sí. Soportamos WhatsApp Cloud API (oficial) y WhatsApp Web. Ambos preservan tu número y tus chats.' },
    { q: '¿Puedo cancelar cuando quiera?',
      a: 'Sí. No hay contratos ni cláusulas de permanencia. Cancelas desde tu panel en un clic.' },
    { q: '¿En qué idioma habla el agente?',
      a: 'Español por defecto. También responde inglés y se adapta al tono de tu negocio.' },
    { q: '¿Mis datos están seguros?',
      a: 'Sí. Datos cifrados en tránsito y en reposo, infraestructura sobre Supabase + Vercel, sin venta de información.' },
  ]

  return (
    <section className="relative py-24 lg:py-32">
      <div className="max-w-3xl mx-auto px-6 lg:px-8">
        <SectionHeader
          eyebrow="Preguntas"
          title="Lo que más nos preguntan"
        />

        <div className="space-y-2 mt-14 lg:mt-20">
          {items.map((it, i) => {
            const isOpen = openIdx === i
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.4, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
                className="relative rounded-2xl overflow-hidden transition-all duration-300"
                style={{
                  background: isOpen
                    ? 'linear-gradient(180deg, rgba(142,68,255,0.10), rgba(11,16,38,0.65))'
                    : 'rgba(11,16,38,0.5)',
                  border: isOpen
                    ? '1px solid rgba(212,91,255,0.40)'
                    : '1px solid rgba(142,68,255,0.12)',
                  boxShadow: isOpen
                    ? '0 14px 36px -14px rgba(142,68,255,0.55)'
                    : 'inset 0 1px 0 rgba(255,255,255,0.03)',
                }}
              >
                <button
                  onClick={() => setOpenIdx(isOpen ? null : i)}
                  className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left hover:bg-white/[0.02] transition-colors"
                  aria-expanded={isOpen}
                >
                  <span className="text-[15px] font-medium text-white leading-snug"
                    style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.015em' }}>
                    {it.q}
                  </span>
                  <motion.span
                    className="shrink-0 flex h-7 w-7 items-center justify-center rounded-full"
                    style={{
                      background: 'rgba(142,68,255,0.14)',
                      border: '1px solid rgba(212,91,255,0.30)',
                    }}
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                  >
                    <ChevronDown className="w-3.5 h-3.5" style={{ color: '#D45BFF' }} />
                  </motion.span>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <p className="px-6 pb-5 text-[14px] text-white/65 leading-relaxed"
                        style={{ letterSpacing: '-0.005em' }}>
                        {it.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}
        </div>

        <div className="text-center mt-12">
          <p className="text-[13px] text-white/50">
            ¿Tienes otra pregunta?{' '}
            <a href="mailto:hola@agente-nuro.com"
              className="font-medium hover:opacity-80 transition-opacity"
              style={{ color: '#D45BFF' }}>
              Escríbenos
            </a>
          </p>
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════
   FINAL CTA
   ═══════════════════════════════════════════════════════════════ */
function FinalCTA() {
  return (
    <section className="relative py-24 lg:py-36">
      <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <h2
            className="font-medium text-[36px] sm:text-[52px] lg:text-[64px] leading-[1.04]"
            style={{
              fontFamily: 'var(--font-display)',
              letterSpacing: '-0.045em',
              background: 'linear-gradient(180deg, #F8FAFF 0%, #D45BFF 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Tu negocio puede vender<br />incluso mientras duermes.
          </h2>

          <p className="mt-8 text-[16px] lg:text-[18px] text-white/55 leading-relaxed max-w-lg mx-auto"
            style={{ letterSpacing: '-0.005em' }}>
            Activa NÜRO en 30 segundos y convierte cada conversación en una venta.
          </p>

          <div className="mt-12 flex items-center justify-center gap-3 flex-wrap">
            <Link
              href="/login"
              className="relative group/fcta inline-flex items-center justify-center gap-2 h-14 px-9 rounded-xl text-white font-medium text-[15px] overflow-hidden"
              style={{
                background: GRAD_BTN,
                boxShadow:
                  '0 24px 60px -10px rgba(142,68,255,0.8), 0 0 0 1px rgba(212,91,255,0.32), inset 0 1px 0 rgba(255,255,255,0.22)',
                letterSpacing: '-0.005em',
              }}
            >
              <span className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/22 to-transparent -translate-x-full group-hover/fcta:translate-x-full transition-transform duration-1000" />
              <span className="relative">Iniciar sesión</span>
              <ArrowRight className="w-4 h-4 relative" />
            </Link>

            <Link
              href="/register"
              className="inline-flex items-center justify-center h-14 px-7 rounded-xl text-white/85 hover:text-white font-medium text-[15px] transition-colors"
              style={{
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.12)',
                letterSpacing: '-0.005em',
              }}
            >
              Crear cuenta gratis
            </Link>
          </div>

          <p className="mt-8 text-[12px] text-white/40"
            style={{ letterSpacing: '0.06em' }}>
            Sin tarjeta. Cancelas cuando quieras.
          </p>
        </motion.div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════
   FOOTER
   ═══════════════════════════════════════════════════════════════ */
function Footer() {
  const cols = [
    {
      title: 'Producto',
      items: [
        { l: 'Agentes IA', h: '#producto' },
        { l: 'Tiendas',    h: '#producto' },
        { l: 'Precios',    h: '/pricing' },
        { l: 'Demo',       h: '#video' },
      ],
    },
    {
      title: 'Empresa',
      items: [
        { l: 'Sobre',   h: '#' },
        { l: 'Blog',    h: '#' },
        { l: 'Casos',   h: '#' },
      ],
    },
    {
      title: 'Soporte',
      items: [
        { l: 'Ayuda',    h: '#' },
        { l: 'Contacto', h: 'mailto:hola@agente-nuro.com' },
        { l: 'Estado',   h: '#' },
      ],
    },
    {
      title: 'Legal',
      items: [
        { l: 'Términos',   h: '#' },
        { l: 'Privacidad', h: '#' },
        { l: 'Cookies',    h: '#' },
      ],
    },
  ]

  const socials: { Icon: typeof MessageCircle; label: string; href: string }[] = [
    { Icon: MessageCircle, label: 'WhatsApp',  href: '#' },
    { Icon: Send,          label: 'Telegram',  href: '#' },
    { Icon: Mail,          label: 'Email',     href: 'mailto:hola@agente-nuro.com' },
    { Icon: Phone,         label: 'Llamadas',  href: '#' },
    { Icon: Globe,         label: 'Sitio web', href: '#' },
  ]

  return (
    <footer id="contacto" className="relative pt-20 pb-12"
      style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-10 lg:gap-12 mb-16">
          {/* Brand col */}
          <div className="col-span-2 sm:col-span-4 lg:col-span-2 max-w-sm">
            <div className="flex items-center gap-2.5 mb-5">
              <div
                className="relative w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, rgba(142,68,255,0.30), rgba(11,16,38,0.6))',
                  border: '1px solid rgba(212,91,255,0.30)',
                  boxShadow: '0 0 18px -6px rgba(142,68,255,0.55)',
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={AVATAR} alt="NÜRO" className="absolute w-[150%] h-[150%] object-contain" />
              </div>
              <span className="text-[15px] font-semibold tracking-tight text-white"
                style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>
                NÜRO
              </span>
            </div>
            <p className="text-[13.5px] text-white/55 leading-relaxed mb-6 max-w-xs"
              style={{ letterSpacing: '-0.005em' }}>
              La plataforma más avanzada para vender con inteligencia artificial en Latinoamérica.
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              {socials.map((s, i) => {
                const Icon = s.Icon
                return (
                  <a key={i} href={s.href} aria-label={s.label}
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-white/55 hover:text-white transition-colors"
                    style={{
                      background: 'rgba(142,68,255,0.06)',
                      border: '1px solid rgba(142,68,255,0.14)',
                    }}>
                    <Icon className="w-4 h-4" strokeWidth={1.6} />
                  </a>
                )
              })}
            </div>
          </div>

          {cols.map((c, ci) => (
            <div key={ci}>
              <h4 className="text-[10.5px] uppercase font-medium text-white/45 mb-5"
                style={{ letterSpacing: '0.2em' }}>
                {c.title}
              </h4>
              <ul className="space-y-3">
                {c.items.map((it, j) => (
                  <li key={j}>
                    <a href={it.h}
                      className="text-[13px] text-white/60 hover:text-white transition-colors">
                      {it.l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-3"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="text-[12px] text-white/35 font-medium"
            style={{ letterSpacing: '0.04em' }}>
            © {new Date().getFullYear()} NÜRO · La plataforma más avanzada para vender con IA en LATAM
          </div>
          <div className="flex items-center gap-1.5 text-[10.5px] uppercase font-medium"
            style={{ letterSpacing: '0.18em', color: 'rgba(212,91,255,0.75)' }}>
            <span className="relative flex h-1.5 w-1.5">
              <motion.span className="absolute inline-flex h-full w-full rounded-full"
                style={{ background: '#D45BFF' }}
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1.8, repeat: Infinity }} />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full"
                style={{ background: '#D45BFF', boxShadow: '0 0 6px rgba(212,91,255,0.85)' }} />
            </span>
            Sistema operativo
          </div>
        </div>
      </div>
    </footer>
  )
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
