'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { Space_Grotesk, Inter } from 'next/font/google'
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion'
import {
  ShoppingBag, Sparkles, ArrowRight, Play, MessageCircle,
  Check, Menu, X, Zap, Brain, Globe, ChevronDown,
  UtensilsCrossed, Briefcase, Home, GraduationCap,
  Mail, Send, Phone, Package, TrendingUp,
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
        <ActivityTicker />
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
   HERO — editorial premium · NÜRO command center
   ═══════════════════════════════════════════════════════════════ */
function Hero({ onNav }: { onNav: (id: string) => void }) {
  const heroStats: AnimatedStat[] = [
    { target: 527,  format: (n) => `+${Math.round(n).toLocaleString('en-US')}`, label: 'Negocios activos' },
    { target: 2.3,  format: (n) => `+${n.toFixed(1)}M`,                          label: 'Mensajes procesados' },
    { target: 98,   format: (n) => `${Math.round(n)}%`,                          label: 'Tasa de respuesta' },
    { target: 24,   format: (n) => `${Math.round(n)}/7`,                         label: 'Operación continua' },
  ]

  return (
    <section className="relative pt-32 pb-16 lg:pt-44 lg:pb-24">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 grid lg:grid-cols-[1fr_1.15fr] gap-12 lg:gap-10 items-center">
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
            className="font-medium text-[44px] sm:text-[58px] lg:text-[74px] leading-[0.98]"
            style={{
              fontFamily: 'var(--font-display)',
              letterSpacing: '-0.05em',
              color: '#F8FAFF',
            }}
          >
            Tu próximo<br />
            vendedor{' '}
            <span style={{
              background: GRAD_MAIN,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              filter: 'drop-shadow(0 0 32px rgba(142,68,255,0.4))',
            }}>
              no duerme.
            </span>
          </h1>

          {/* Sub */}
          <p
            className="mt-7 text-[16.5px] lg:text-[17.5px] text-white/65 leading-relaxed max-w-lg"
            style={{ letterSpacing: '-0.005em', fontWeight: 400 }}
          >
            NÜRO automatiza respuestas, seguimiento, recuperación de clientes
            y ventas mediante inteligencia artificial conectada a WhatsApp,
            Messenger, Instagram y Tiendas Virtuales.
          </p>

          {/* CTAs */}
          <div className="mt-10 flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <Link
              href="/register"
              className="relative group/cta inline-flex items-center justify-center gap-2 h-13 px-7 rounded-xl text-white font-semibold text-[13.5px] overflow-hidden w-full sm:w-auto"
              style={{
                height: 52,
                background: GRAD_BTN,
                boxShadow:
                  '0 22px 50px -10px rgba(142,68,255,0.78), 0 0 0 1px rgba(212,91,255,0.4), inset 0 1px 0 rgba(255,255,255,0.26)',
                letterSpacing: '0.16em',
              }}
            >
              <span className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/24 to-transparent -translate-x-full group-hover/cta:translate-x-full transition-transform duration-900" />
              <Sparkles className="w-4 h-4 relative" />
              <span className="relative">CREAR MI AGENTE IA</span>
              <ArrowRight className="w-4 h-4 relative" />
            </Link>

            <button
              onClick={() => onNav('video')}
              className="inline-flex items-center justify-center gap-2.5 px-6 rounded-xl text-white/85 hover:text-white font-semibold text-[13px] transition-colors w-full sm:w-auto backdrop-blur-xl"
              style={{
                height: 52,
                background: 'rgba(142,68,255,0.06)',
                border: '1px solid rgba(212,91,255,0.22)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
                letterSpacing: '0.16em',
              }}
            >
              <span className="relative w-6 h-6 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(142,68,255,0.20)', border: '1px solid rgba(212,91,255,0.45)' }}>
                <Play className="w-2.5 h-2.5 ml-0.5" fill="currentColor"
                  style={{ color: '#D45BFF' }} />
              </span>
              VER DEMOSTRACIÓN
            </button>
          </div>

          {/* Animated premium stats — quiet & elegant */}
          <div className="mt-14 pt-8 grid grid-cols-2 sm:grid-cols-4 gap-y-6 gap-x-4 lg:gap-x-8"
            style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            {heroStats.map((s, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                className="flex flex-col gap-1.5">
                <span
                  className="text-[26px] lg:text-[30px] font-medium tabular-nums leading-none"
                  style={{
                    fontFamily: 'var(--font-display)',
                    letterSpacing: '-0.035em',
                    background: 'linear-gradient(180deg, #F8FAFF 0%, #D45BFF 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    filter: 'drop-shadow(0 0 12px rgba(142,68,255,0.35))',
                  }}>
                  <AnimatedNumber target={s.target} format={s.format} />
                </span>
                <span className="text-[10px] uppercase text-white/45 font-medium"
                  style={{ letterSpacing: '0.16em' }}>
                  {s.label}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* ── RIGHT: NÜRO protagonist + floating chips ── */}
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
  const opacity = useTransform(scrollY, [0, 600], [1, 0.55])

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 1.3, ease: [0.22, 1, 0.36, 1] }}
      style={{ y, opacity }}
      className="relative h-[560px] sm:h-[660px] lg:h-[780px] flex items-center justify-center"
    >
      {/* Soft cinematic violet glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <motion.div
          className="rounded-full"
          style={{
            width: 'min(620px, 85%)',
            height: 'min(620px, 85%)',
            background:
              'radial-gradient(circle, rgba(142,68,255,0.50) 0%, rgba(212,91,255,0.20) 35%, transparent 70%)',
            filter: 'blur(55px)',
          }}
          animate={{ opacity: [0.75, 1, 0.75], scale: [1, 1.04, 1] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      {/* Hairline orbital ring */}
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 'min(680px, 95%)',
          height: 'min(680px, 95%)',
          border: '1px solid rgba(212,91,255,0.12)',
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 110, repeat: Infinity, ease: 'linear' }}
        aria-hidden
      >
        <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full"
          style={{ background: '#D45BFF', boxShadow: '0 0 12px rgba(212,91,255,1)' }} />
      </motion.div>

      {/* NÜRO image — protagonista cinematográfico */}
      <motion.img
        src={AVATAR}
        alt="NÜRO"
        className="relative object-contain pointer-events-none"
        style={{
          height: '112%',
          width: 'auto',
          maxWidth: '100%',
          filter:
            'drop-shadow(0 0 90px rgba(142,68,255,0.55)) drop-shadow(0 0 200px rgba(212,91,255,0.35)) drop-shadow(0 30px 80px rgba(5,8,22,0.7))',
        }}
        animate={{ y: [0, -12, 0] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
        aria-hidden
      />

      {/* Bottom reflection halo */}
      <div className="pointer-events-none absolute bottom-[12%] left-1/2 -translate-x-1/2 w-[60%] h-[40px]"
        style={{
          background: 'radial-gradient(ellipse, rgba(212,91,255,0.4), transparent 70%)',
          filter: 'blur(20px)',
        }}
        aria-hidden
      />

      {/* ── Floating premium chips orbiting NÜRO ── */}
      <FloatingChip
        className="left-[-2%] top-[10%] lg:left-[-6%] lg:top-[8%]"
        icon={MessageCircle}
        label="WhatsApp conectado"
        value="Cliente: ¿tienen disponibilidad?"
        delay={0.55}
        accent="#10B981"
      />
      <FloatingChip
        className="right-[-2%] top-[14%] lg:right-[-4%] lg:top-[12%]"
        icon={Package}
        label="Pedido recibido"
        value="3 productos · Listo para envío"
        delay={0.75}
        accent="#D45BFF"
      />
      <FloatingChip
        className="right-[-4%] top-[48%] lg:right-[-8%]"
        icon={TrendingUp}
        label="Venta confirmada"
        value="+$1,250"
        delay={0.95}
        accent="#8E44FF"
        highlight
      />
      <FloatingChip
        className="left-[-4%] top-[58%] lg:left-[-8%]"
        icon={Send}
        label="Seguimiento enviado"
        value="Cliente recuperado"
        delay={1.15}
        accent="#6B5CFF"
      />
      <FloatingChip
        className="left-[10%] bottom-[6%] lg:left-[8%] lg:bottom-[4%]"
        icon={Sparkles}
        label="Nueva conversación"
        value="WhatsApp activo"
        delay={1.35}
        accent="#D45BFF"
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
   SERVICES — composición cinematográfica · robot central + 2 paneles
   ═══════════════════════════════════════════════════════════════ */
function Services() {
  return (
    <section id="producto" className="relative py-24 lg:py-36 overflow-hidden">
      {/* Volumetric violet glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[58%] -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] rounded-full"
          style={{
            background:
              'radial-gradient(circle, rgba(142,68,255,0.28) 0%, rgba(212,91,255,0.10) 35%, transparent 65%)',
            filter: 'blur(80px)',
          }} />
      </div>

      {/* Hairline geometric lines */}
      <svg className="pointer-events-none absolute inset-0 w-full h-full opacity-40 hidden lg:block"
        aria-hidden>
        <defs>
          <linearGradient id="connL" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="rgba(212,91,255,0.5)" />
            <stop offset="100%" stopColor="rgba(142,68,255,0)" />
          </linearGradient>
          <linearGradient id="connR" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="rgba(142,68,255,0)" />
            <stop offset="100%" stopColor="rgba(212,91,255,0.5)" />
          </linearGradient>
        </defs>
        <line x1="32%" y1="50%" x2="48%" y2="48%" stroke="url(#connL)" strokeWidth="1" strokeDasharray="3 5" />
        <line x1="52%" y1="52%" x2="68%" y2="50%" stroke="url(#connR)" strokeWidth="1" strokeDasharray="3 5" />
        <circle cx="32%" cy="50%" r="2.5" fill="rgba(212,91,255,0.7)" />
        <circle cx="68%" cy="50%" r="2.5" fill="rgba(212,91,255,0.7)" />
      </svg>

      <div className="relative max-w-7xl mx-auto px-6 lg:px-8">
        <SectionHeader
          eyebrow="Ecosistema"
          title="Un robot. Una plataforma. Todo conectado."
          sub="NÜRO no es un chatbot — es el cerebro que une atención, productos y ventas en una sola experiencia."
        />

        {/* ── Composición cinematográfica ── */}
        <div className="relative mt-16 lg:mt-24 grid lg:grid-cols-[0.95fr_1.1fr_0.95fr] gap-10 lg:gap-6 items-center min-h-[600px] lg:min-h-[720px]">
          {/* Robot central — mobile: arriba; desktop: centro */}
          <div className="order-1 lg:order-2 relative h-[360px] sm:h-[440px] lg:h-[640px] flex items-center justify-center">
            <CentralRobot />
          </div>

          {/* Panel izq — AGENTE IA */}
          <div className="order-2 lg:order-1 lg:-translate-y-6">
            <AgentPanel />
          </div>

          {/* Panel der — TIENDA VIRTUAL */}
          <div className="order-3 lg:order-3 lg:translate-y-6">
            <StorePanel />
          </div>
        </div>
      </div>
    </section>
  )
}

/* ─── Robot central · cinematic hero ─── */
function CentralRobot() {
  return (
    <div className="relative w-full h-full flex items-center justify-center" aria-hidden>
      {/* Cinematic violet halo */}
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 'min(520px, 95%)',
          height: 'min(520px, 95%)',
          background:
            'radial-gradient(circle, rgba(142,68,255,0.55) 0%, rgba(212,91,255,0.22) 38%, transparent 70%)',
          filter: 'blur(55px)',
        }}
        animate={{ opacity: [0.75, 1, 0.75], scale: [1, 1.05, 1] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Outer orbital ring */}
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 'min(600px, 100%)',
          height: 'min(600px, 100%)',
          border: '1px solid rgba(212,91,255,0.14)',
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 100, repeat: Infinity, ease: 'linear' }}
      >
        <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full"
          style={{ background: '#D45BFF', boxShadow: '0 0 10px rgba(212,91,255,1)' }} />
        <span className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-1 h-1 rounded-full"
          style={{ background: '#6B5CFF', boxShadow: '0 0 8px rgba(107,92,255,1)' }} />
      </motion.div>

      {/* Inner counter ring */}
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 'min(420px, 75%)',
          height: 'min(420px, 75%)',
          border: '1px dashed rgba(212,91,255,0.10)',
        }}
        animate={{ rotate: -360 }}
        transition={{ duration: 70, repeat: Infinity, ease: 'linear' }}
      />

      {/* Robot image */}
      <motion.img
        src={AVATAR}
        alt="NÜRO"
        className="relative object-contain pointer-events-none"
        style={{
          height: '115%',
          width: 'auto',
          maxWidth: '100%',
          filter:
            'drop-shadow(0 0 80px rgba(142,68,255,0.6)) drop-shadow(0 0 180px rgba(212,91,255,0.35)) drop-shadow(0 30px 70px rgba(5,8,22,0.7))',
        }}
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Bottom reflection halo */}
      <div className="pointer-events-none absolute bottom-[12%] left-1/2 -translate-x-1/2 w-[55%] h-[36px]"
        style={{
          background: 'radial-gradient(ellipse, rgba(212,91,255,0.4), transparent 70%)',
          filter: 'blur(18px)',
        }}
      />
    </div>
  )
}

/* ─── Wrapper premium panel ─── */
function PremiumPanel({
  badge, title, statusColor = '#10B981', delay = 0, children,
}: {
  badge: string
  title: string
  statusColor?: string
  delay?: number
  children: React.ReactNode
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -6 }}
      className="group relative rounded-[28px] backdrop-blur-2xl overflow-hidden transition-all duration-500"
      style={{
        background: 'linear-gradient(180deg, rgba(29,46,109,0.48), rgba(11,16,38,0.82))',
        border: '1px solid rgba(142,68,255,0.22)',
        boxShadow:
          '0 32px 80px -22px rgba(142,68,255,0.55), inset 0 1px 0 rgba(255,255,255,0.06)',
      }}
    >
      {/* Hover border glow */}
      <div className="pointer-events-none absolute inset-0 rounded-[28px] opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          boxShadow:
            '0 0 0 1px rgba(212,91,255,0.50), 0 40px 100px -22px rgba(142,68,255,0.7)',
        }} />

      {/* Top hairline */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(212,91,255,0.65), transparent)',
        }} />

      {/* Ambient corner glow */}
      <div className="pointer-events-none absolute -top-24 -right-20 w-64 h-64 rounded-full opacity-70"
        style={{
          background: 'radial-gradient(circle, rgba(142,68,255,0.35), transparent 65%)',
          filter: 'blur(50px)',
        }} />

      {/* Floating wrap (slow vertical) */}
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay }}
        className="relative p-5 sm:p-6"
      >
        {/* Header — badge + status dot */}
        <div className="flex items-center justify-between mb-3.5">
          <div className="text-[10.5px] uppercase font-semibold font-mono"
            style={{ letterSpacing: '0.22em', color: 'rgba(212,91,255,0.9)' }}>
            {badge}
          </div>
          <span className="relative flex h-1.5 w-1.5">
            <motion.span className="absolute inline-flex h-full w-full rounded-full"
              style={{ background: statusColor }}
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.8, repeat: Infinity }} />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full"
              style={{ background: statusColor, boxShadow: `0 0 6px ${statusColor}` }} />
          </span>
        </div>

        {/* Title */}
        <h3 className="text-[18px] lg:text-[20px] font-medium text-white leading-tight mb-5"
          style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.025em' }}>
          {title}
        </h3>

        {/* Live app surface */}
        {children}
      </motion.div>
    </motion.div>
  )
}

/* ─── Panel AGENTE IA · app real ─── */
function AgentPanel() {
  return (
    <PremiumPanel badge="IA / 001" title="Agente IA de Ventas" delay={0.1}>
      {/* App surface: WhatsApp-like chat */}
      <div
        className="relative rounded-2xl overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, rgba(5,8,22,0.72), rgba(11,16,38,0.55))',
          border: '1px solid rgba(142,68,255,0.16)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
        }}
      >
        {/* App top bar */}
        <div className="flex items-center gap-2.5 px-4 py-3 border-b"
          style={{ borderColor: 'rgba(212,91,255,0.10)', background: 'rgba(5,8,22,0.4)' }}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(142,68,255,0.6), rgba(11,16,38,0.7))',
              border: '1px solid rgba(212,91,255,0.5)',
              boxShadow: '0 0 12px -2px rgba(142,68,255,0.7)',
            }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={AVATAR} alt="" className="absolute w-[160%] h-[160%] object-contain" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[12px] font-semibold text-white leading-none mb-1">Agente NÜRO</div>
            <div className="flex items-center gap-1.5 text-[10px] text-emerald-300/95 font-medium">
              <span className="relative flex h-1 w-1">
                <motion.span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400"
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1.6, repeat: Infinity }} />
                <span className="relative inline-flex h-1 w-1 rounded-full bg-emerald-400" />
              </span>
              En línea ahora
            </div>
          </div>
          <div className="text-[9px] uppercase font-semibold font-mono px-1.5 py-0.5 rounded"
            style={{
              letterSpacing: '0.16em',
              color: 'rgba(212,91,255,0.85)',
              background: 'rgba(142,68,255,0.10)',
              border: '1px solid rgba(212,91,255,0.22)',
            }}>
            WA
          </div>
        </div>

        {/* Messages */}
        <div className="px-4 py-4 space-y-2.5">
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-[80%] rounded-2xl rounded-tl-md px-3.5 py-2.5 text-[12.5px] text-white/90 leading-snug"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            Hola, ¿tienen el producto disponible?
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 10 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.45, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="ml-auto max-w-[85%] rounded-2xl rounded-tr-md px-3.5 py-2.5 text-[12.5px] text-white leading-snug"
            style={{
              background: 'linear-gradient(135deg, rgba(142,68,255,0.42), rgba(107,92,255,0.30))',
              border: '1px solid rgba(212,91,255,0.45)',
              boxShadow: '0 8px 22px -10px rgba(142,68,255,0.65)',
            }}
          >
            ¡Hola! Sí, tenemos stock.<br />¿Deseas recibirlo hoy mismo?
          </motion.div>

          {/* Typing */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.4, delay: 0.9 }}
            className="flex items-center gap-2 mt-3 pl-1"
          >
            <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-full"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}>
              {[0, 0.18, 0.36].map((d, i) => (
                <motion.span key={i}
                  className="w-1.5 h-1.5 rounded-full bg-white/55"
                  animate={{ opacity: [0.3, 1, 0.3], y: [0, -2, 0] }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut', delay: d }}
                />
              ))}
            </div>
            <span className="text-[10.5px] text-white/45 font-medium">Cliente escribiendo…</span>
          </motion.div>
        </div>

        {/* Bottom metrics ribbon */}
        <div className="px-4 py-3 flex items-center justify-between border-t"
          style={{ borderColor: 'rgba(212,91,255,0.10)', background: 'rgba(5,8,22,0.45)' }}>
          <div className="flex items-center gap-2">
            <MessageCircle className="w-3.5 h-3.5" style={{ color: '#D45BFF' }} strokeWidth={2} />
            <span className="text-[10.5px] uppercase font-semibold text-white/55"
              style={{ letterSpacing: '0.14em' }}>
              Hoy
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-[15px] font-semibold text-white tabular-nums"
              style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>
              <AnimatedNumber target={1247} format={(n) => Math.round(n).toLocaleString('en-US')} />
            </span>
            <span className="text-[10.5px] text-white/45 font-medium">chats resueltos</span>
          </div>
        </div>
      </div>
    </PremiumPanel>
  )
}

/* ─── Panel TIENDA · producto + pedido ─── */
function StorePanel() {
  return (
    <PremiumPanel badge="STORE / 002" title="Tienda Virtual Inteligente" delay={0.2}>
      <div
        className="relative rounded-2xl overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, rgba(5,8,22,0.72), rgba(11,16,38,0.55))',
          border: '1px solid rgba(142,68,255,0.16)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
        }}
      >
        {/* App top bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b"
          style={{ borderColor: 'rgba(212,91,255,0.10)', background: 'rgba(5,8,22,0.4)' }}>
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-3.5 h-3.5" style={{ color: '#D45BFF' }} strokeWidth={2} />
            <span className="text-[11px] font-semibold text-white">Mi Tienda · NÜRO</span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full"
            style={{
              background: 'rgba(16,185,129,0.14)',
              border: '1px solid rgba(16,185,129,0.4)',
            }}>
            <Check className="w-2 h-2 text-emerald-300" strokeWidth={4} />
            <span className="text-[8.5px] uppercase font-semibold text-emerald-200"
              style={{ letterSpacing: '0.14em' }}>
              Confirmado
            </span>
          </div>
        </div>

        {/* Product hero — stylized image */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="relative px-4 pt-4 pb-2"
        >
          <div className="relative h-32 rounded-xl overflow-hidden flex items-center justify-center"
            style={{
              background:
                'radial-gradient(ellipse at center, rgba(142,68,255,0.35) 0%, rgba(11,16,38,0.8) 60%)',
              border: '1px solid rgba(212,91,255,0.18)',
            }}>
            {/* Subtle blueprint behind product */}
            <div className="absolute inset-0 opacity-10"
              style={{
                backgroundImage:
                  'linear-gradient(rgba(212,91,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(212,91,255,1) 1px, transparent 1px)',
                backgroundSize: '20px 20px',
              }} />

            {/* "Product" — auriculares NÜRO Pro estilizados */}
            <motion.svg
              viewBox="0 0 120 110" width="120" height="110"
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
              style={{ filter: 'drop-shadow(0 12px 24px rgba(142,68,255,0.5))' }}
            >
              <defs>
                <linearGradient id="hp1" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#D45BFF" />
                  <stop offset="100%" stopColor="#6B5CFF" />
                </linearGradient>
                <linearGradient id="hp2" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#F8FAFF" stopOpacity="0.95" />
                  <stop offset="100%" stopColor="#8E44FF" />
                </linearGradient>
              </defs>
              {/* Headband */}
              <path d="M20 50 Q60 14 100 50" stroke="url(#hp1)" strokeWidth="6" fill="none" strokeLinecap="round" />
              {/* Earcup left */}
              <ellipse cx="20" cy="68" rx="14" ry="18" fill="url(#hp1)" />
              <ellipse cx="20" cy="68" rx="8" ry="11" fill="rgba(5,8,22,0.7)" />
              <circle cx="20" cy="68" r="3" fill="url(#hp2)" />
              {/* Earcup right */}
              <ellipse cx="100" cy="68" rx="14" ry="18" fill="url(#hp1)" />
              <ellipse cx="100" cy="68" rx="8" ry="11" fill="rgba(5,8,22,0.7)" />
              <circle cx="100" cy="68" r="3" fill="url(#hp2)" />
              {/* Highlight */}
              <path d="M22 38 Q60 6 98 38" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            </motion.svg>

            {/* Stock pill */}
            <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full"
              style={{
                background: 'rgba(5,8,22,0.7)',
                border: '1px solid rgba(212,91,255,0.25)',
              }}>
              <span className="relative flex h-1 w-1">
                <motion.span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400"
                  animate={{ opacity: [1, 0.4, 1] }}
                  transition={{ duration: 1.6, repeat: Infinity }} />
                <span className="relative inline-flex h-1 w-1 rounded-full bg-emerald-400" />
              </span>
              <span className="text-[8.5px] uppercase font-semibold text-emerald-200/90"
                style={{ letterSpacing: '0.14em' }}>
                En stock
              </span>
            </div>

            {/* Rating */}
            <div className="absolute bottom-2 right-2 flex items-center gap-0.5 px-1.5 py-0.5 rounded"
              style={{
                background: 'rgba(5,8,22,0.7)',
                border: '1px solid rgba(212,91,255,0.18)',
              }}>
              <Sparkles className="w-2 h-2" style={{ color: '#D45BFF' }} fill="currentColor" />
              <span className="text-[9px] font-semibold text-white tabular-nums">4.9</span>
            </div>
          </div>
        </motion.div>

        {/* Product details + summary */}
        <div className="px-4 pb-3">
          <div className="flex items-center justify-between mb-2">
            <div className="min-w-0">
              <div className="text-[13px] font-semibold text-white truncate"
                style={{ letterSpacing: '-0.01em' }}>
                Auriculares NÜRO Pro
              </div>
              <div className="text-[10.5px] text-white/45">Cantidad · 1</div>
            </div>
            <div className="text-[15px] font-semibold text-white tabular-nums">$129</div>
          </div>

          <div className="space-y-1 pt-2 mt-2 border-t"
            style={{ borderColor: 'rgba(212,91,255,0.08)' }}>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-white/45">Envío</span>
              <span className="text-white/80 tabular-nums">$8</span>
            </div>
            <div className="flex items-center justify-between text-[13px] pt-0.5">
              <span className="font-semibold text-white">Total</span>
              <motion.span
                className="font-bold tabular-nums"
                style={{
                  background: GRAD_MAIN,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  filter: 'drop-shadow(0 0 8px rgba(142,68,255,0.6))',
                  fontSize: 17,
                  fontFamily: 'var(--font-display)',
                  letterSpacing: '-0.02em',
                }}
                animate={{ opacity: [0.88, 1, 0.88] }}
                transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
              >
                $137
              </motion.span>
            </div>
          </div>
        </div>

        {/* Bottom metrics ribbon */}
        <div className="px-4 py-3 flex items-center justify-between border-t"
          style={{ borderColor: 'rgba(212,91,255,0.10)', background: 'rgba(5,8,22,0.45)' }}>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-3.5 h-3.5" style={{ color: '#D45BFF' }} strokeWidth={2} />
            <span className="text-[10.5px] uppercase font-semibold text-white/55"
              style={{ letterSpacing: '0.14em' }}>
              24h
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-[15px] font-semibold text-white tabular-nums"
              style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>
              +<AnimatedNumber target={32} format={(n) => Math.round(n).toString()} />
            </span>
            <span className="text-[10.5px] text-white/45 font-medium">ventas</span>
          </div>
        </div>
      </div>
    </PremiumPanel>
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
   ANIMATED COUNTER — easeOutCubic, IntersectionObserver-triggered
   ═══════════════════════════════════════════════════════════════ */
type AnimatedStat = {
  target: number
  format: (n: number) => string
  label: string
}

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

/* ═══════════════════════════════════════════════════════════════
   FLOATING CHIP — glass premium card orbiting NÜRO
   ═══════════════════════════════════════════════════════════════ */
function FloatingChip({
  className, icon: Icon, label, value, delay, accent = '#D45BFF', highlight = false,
}: {
  className?: string
  icon: typeof MessageCircle
  label: string
  value: string
  delay: number
  accent?: string
  highlight?: boolean
}) {
  // accent → rgb tuple for inline rgba math
  const accRGB = hexToRgb(accent)

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85, y: 14 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] }}
      className={`absolute flex items-center gap-3 px-3.5 py-3 rounded-2xl backdrop-blur-2xl max-w-[220px] ${className ?? ''}`}
      style={{
        background: highlight
          ? `linear-gradient(135deg, rgba(${accRGB},0.22), rgba(11,16,38,0.82))`
          : `linear-gradient(135deg, rgba(${accRGB},0.14), rgba(11,16,38,0.78))`,
        border: `1px solid rgba(${accRGB},${highlight ? 0.45 : 0.30})`,
        boxShadow: `0 14px 38px -10px rgba(${accRGB},${highlight ? 0.65 : 0.5}), inset 0 1px 0 rgba(255,255,255,0.06)`,
        zIndex: 5,
      }}
    >
      <motion.div
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 4 + delay, repeat: Infinity, ease: 'easeInOut' }}
        className="contents"
      >
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{
            background: `rgba(${accRGB},0.22)`,
            border: `1px solid rgba(${accRGB},0.5)`,
            boxShadow: `0 0 12px rgba(${accRGB},0.45)`,
          }}>
          <Icon className="w-4 h-4" style={{ color: accent }} strokeWidth={2} />
        </div>
        <div className="min-w-0">
          <div className="text-[9px] uppercase font-semibold text-white/55 mb-0.5 truncate"
            style={{ letterSpacing: '0.16em' }}>
            {label}
          </div>
          <div className="text-[12.5px] font-medium text-white leading-tight tabular-nums truncate"
            style={{ letterSpacing: '-0.01em' }}>
            {value}
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

function hexToRgb(hex: string): string {
  const m = hex.replace('#', '').match(/.{2}/g)
  if (!m) return '212,91,255'
  const [r, g, b] = m.map((h) => parseInt(h, 16))
  return `${r},${g},${b}`
}

/* ═══════════════════════════════════════════════════════════════
   ACTIVITY TICKER — live ribbon, premium marquee
   ═══════════════════════════════════════════════════════════════ */
function ActivityTicker() {
  const events: { dot: string; text: string }[] = [
    { dot: '#10B981', text: 'Venta confirmada hace 12 segundos' },
    { dot: '#D45BFF', text: 'Nuevo cliente conectado' },
    { dot: '#8E44FF', text: 'Pedido recibido' },
    { dot: '#10B981', text: 'Seguimiento enviado' },
    { dot: '#D45BFF', text: 'WhatsApp conectado' },
    { dot: '#8E44FF', text: 'Conversación iniciada' },
    { dot: '#10B981', text: 'Cliente recuperado' },
    { dot: '#D45BFF', text: 'Tienda sincronizada' },
  ]
  // Duplicate for seamless infinite scroll
  const looped = [...events, ...events]

  return (
    <section className="relative" aria-label="Actividad en tiempo real">
      <div className="relative w-full overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, rgba(11,16,38,0.65), rgba(11,16,38,0.4))',
          borderTop: '1px solid rgba(142,68,255,0.14)',
          borderBottom: '1px solid rgba(142,68,255,0.14)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)',
        }}>
        <div className="py-3.5 flex items-center gap-3">
          {/* Live label */}
          <div className="shrink-0 pl-6 lg:pl-8 pr-4 flex items-center gap-2"
            style={{ borderRight: '1px solid rgba(142,68,255,0.18)', paddingRight: 16 }}>
            <span className="relative flex h-1.5 w-1.5">
              <motion.span className="absolute inline-flex h-full w-full rounded-full"
                style={{ background: '#D45BFF' }}
                animate={{ opacity: [1, 0.3, 1], scale: [1, 1.6, 1] }}
                transition={{ duration: 1.8, repeat: Infinity }} />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full"
                style={{ background: '#D45BFF', boxShadow: '0 0 6px rgba(212,91,255,0.95)' }} />
            </span>
            <span className="text-[10.5px] uppercase font-semibold"
              style={{ letterSpacing: '0.22em', color: 'rgba(212,91,255,0.9)' }}>
              LIVE
            </span>
          </div>

          {/* Marquee */}
          <div className="relative flex-1 overflow-hidden">
            <motion.div
              className="flex gap-10 whitespace-nowrap"
              animate={{ x: ['0%', '-50%'] }}
              transition={{ duration: 45, repeat: Infinity, ease: 'linear' }}
            >
              {looped.map((e, i) => (
                <div key={i} className="flex items-center gap-2.5 shrink-0">
                  <motion.span className="w-1.5 h-1.5 rounded-full"
                    style={{ background: e.dot, boxShadow: `0 0 6px ${e.dot}` }}
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity, delay: (i % 4) * 0.3, ease: 'easeInOut' }}
                  />
                  <span className="text-[12.5px] text-white/65 font-medium"
                    style={{ letterSpacing: '-0.005em' }}>
                    {e.text}
                  </span>
                </div>
              ))}
            </motion.div>

            {/* Fade edges */}
            <div className="pointer-events-none absolute inset-y-0 left-0 w-24"
              style={{ background: 'linear-gradient(90deg, rgba(11,16,38,1), transparent)' }} />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-24"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(11,16,38,1))' }} />
          </div>
        </div>
      </div>
    </section>
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
