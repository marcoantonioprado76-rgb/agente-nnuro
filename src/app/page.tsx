'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { Space_Grotesk, Inter } from 'next/font/google'
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion'
import {
  Bot, ShoppingBag, Sparkles, ArrowRight, Play, MessageCircle,
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
  sub: string
  angle: number
  color: string
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
  const channels: ChannelDef[] = [
    { Icon: MessageCircle,  label: 'WhatsApp',       sub: '247 chats',     angle: 0,   color: '#10B981' },
    { Icon: Send,           label: 'Messenger',      sub: '89 chats',      angle: 60,  color: '#6B5CFF' },
    { Icon: InstagramMark,  label: 'Instagram',      sub: '156 DMs',       angle: 120, color: '#D45BFF' },
    { Icon: ShoppingBag,    label: 'Tienda Virtual', sub: '12 pedidos',    angle: 180, color: '#D45BFF' },
    { Icon: Briefcase,      label: 'CRM',            sub: '34 leads',      angle: 240, color: '#8E44FF' },
    { Icon: Bot,            label: 'Agente IA',      sub: '98% precisión', angle: 300, color: '#D45BFF' },
  ]

  return (
    <section className="relative pt-14 pb-16 lg:pt-20 lg:pb-24 overflow-hidden">
      {/* Violet wash centrado al núcleo */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="w-[1000px] h-[800px] rounded-full"
          style={{
            background:
              'radial-gradient(ellipse, rgba(142,68,255,0.24) 0%, rgba(212,91,255,0.08) 35%, transparent 65%)',
            filter: 'blur(80px)',
          }} />
      </div>

      {/* Floating ambient particles */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {[...Array(10)].map((_, i) => (
          <motion.span
            key={i}
            className="absolute rounded-full"
            style={{
              left: `${(i * 11) % 95}%`,
              top: `${10 + (i * 19) % 78}%`,
              width: i % 3 === 0 ? 3 : 2,
              height: i % 3 === 0 ? 3 : 2,
              background: i % 2 === 0 ? '#D45BFF' : '#8E44FF',
              boxShadow: `0 0 8px ${i % 2 === 0 ? 'rgba(212,91,255,0.9)' : 'rgba(142,68,255,0.9)'}`,
            }}
            animate={{ y: [0, -36, 0], opacity: [0.25, 0.85, 0.25] }}
            transition={{ duration: 10 + i * 0.7, repeat: Infinity, ease: 'easeInOut', delay: i * 0.5 }}
          />
        ))}
      </div>

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

        {/* Núcleo + 6 canales orbitando */}
        <div className="relative aspect-square w-full max-w-[680px] mx-auto mt-14 lg:mt-16">
          <ConnectionLines channels={channels} />
          {channels.map((c, i) => (
            <ChannelNode key={c.label} {...c} delay={0.25 + i * 0.08} />
          ))}
          <Nucleus />
        </div>

        {/* Live feed con avatares */}
        <div className="mt-10 lg:mt-12 max-w-3xl mx-auto">
          <LiveFeed />
        </div>

        {/* Logos marquee abajo */}
        <PartnerLogos />
      </div>
    </section>
  )
}

/* ─── Nucleus · NÜRO core agrandado ─── */
function Nucleus() {
  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
      {/* Outer breathing halo */}
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          width: 380, height: 380,
          background: 'radial-gradient(circle, rgba(142,68,255,0.55) 0%, rgba(212,91,255,0.20) 35%, transparent 70%)',
          filter: 'blur(50px)',
        }}
        animate={{ opacity: [0.7, 1, 0.7], scale: [1, 1.06, 1] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Outer dashed orbital ring */}
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ width: 290, height: 290, border: '1px dashed rgba(212,91,255,0.20)' }}
        animate={{ rotate: 360 }}
        transition={{ duration: 80, repeat: Infinity, ease: 'linear' }}
      />

      {/* 3 Pulse rings staggered */}
      {[0, 1.3, 2.6].map((d, i) => (
        <motion.span
          key={i}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ width: 230, height: 230, border: '1px solid rgba(212,91,255,0.4)' }}
          animate={{ scale: [1, 1.7], opacity: [0.55, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeOut', delay: d }}
        />
      ))}

      {/* Core glass orb */}
      <motion.div
        className="relative rounded-full flex items-center justify-center backdrop-blur-xl overflow-hidden"
        style={{
          width: 220, height: 220,
          background: 'radial-gradient(circle at 35% 30%, rgba(248,250,255,0.20) 0%, rgba(142,68,255,0.38) 40%, rgba(11,16,38,0.85) 100%)',
          border: '1px solid rgba(212,91,255,0.55)',
          boxShadow:
            '0 0 80px -4px rgba(142,68,255,0.95), 0 0 0 1px rgba(212,91,255,0.32), inset 0 1px 0 rgba(255,255,255,0.22), inset 0 -10px 36px rgba(142,68,255,0.45)',
        }}
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={AVATAR} alt="NÜRO" className="w-[150%] h-[150%] object-contain"
          style={{ filter: 'drop-shadow(0 0 22px rgba(212,91,255,0.7))' }} />

        <span className="pointer-events-none absolute inset-x-4 top-0 h-px"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent)' }} />
      </motion.div>
    </div>
  )
}

/* ─── ChannelNode · pill con sub-actividad ─── */
function ChannelNode({ Icon, label, sub, angle, color, delay }: ChannelDef & { delay: number }) {
  const rad = (angle - 90) * Math.PI / 180
  const r = 42
  const x = 50 + r * Math.cos(rad)
  const y = 50 + r * Math.sin(rad)

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ scale: 1.06 }}
      className="absolute z-10 flex items-center gap-2.5 px-3 py-2 rounded-2xl backdrop-blur-xl"
      style={{
        top: `${y}%`,
        left: `${x}%`,
        transform: 'translate(-50%, -50%)',
        background: `linear-gradient(135deg, rgba(${hexToRgb(color)},0.16), rgba(11,16,38,0.78))`,
        border: `1px solid rgba(${hexToRgb(color)},0.40)`,
        boxShadow: `0 12px 28px -8px rgba(${hexToRgb(color)},0.55), inset 0 1px 0 rgba(255,255,255,0.06)`,
      }}
    >
      <motion.span
        className="flex h-8 w-8 items-center justify-center rounded-lg shrink-0 relative"
        style={{
          background: `rgba(${hexToRgb(color)},0.22)`,
          border: `1px solid rgba(${hexToRgb(color)},0.50)`,
          boxShadow: `0 0 10px rgba(${hexToRgb(color)},0.45)`,
        }}
        animate={{ y: [0, -2, 0] }}
        transition={{ duration: 4 + delay, repeat: Infinity, ease: 'easeInOut' }}
      >
        <Icon strokeWidth={1.9} style={{ color, width: 15, height: 15 }} />
      </motion.span>
      <div className="min-w-0">
        <div className="text-[11.5px] font-semibold text-white whitespace-nowrap leading-tight"
          style={{ letterSpacing: '-0.01em' }}>
          {label}
        </div>
        <div className="text-[9.5px] text-white/55 font-medium whitespace-nowrap leading-tight mt-0.5">
          {sub}
        </div>
      </div>
      <span className="relative flex h-1.5 w-1.5 ml-1">
        <motion.span className="absolute inline-flex h-full w-full rounded-full"
          style={{ background: color }}
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 1.8, repeat: Infinity, delay: delay * 2 }} />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full"
          style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
      </span>
    </motion.div>
  )
}

/* ─── ConnectionLines · líneas energéticas SVG entre nucleus y canales ─── */
function ConnectionLines({ channels }: { channels: ChannelDef[] }) {
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden>
      <defs>
        <linearGradient id="opsLine" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="rgba(212,91,255,0.5)" />
          <stop offset="50%" stopColor="rgba(142,68,255,0.7)" />
          <stop offset="100%" stopColor="rgba(212,91,255,0.5)" />
        </linearGradient>
      </defs>
      {channels.map((c, i) => {
        const rad = (c.angle - 90) * Math.PI / 180
        const r = 40
        const x2 = 50 + r * Math.cos(rad)
        const y2 = 50 + r * Math.sin(rad)
        return (
          <motion.line
            key={c.label}
            x1="50%" y1="50%"
            x2={`${x2}%`} y2={`${y2}%`}
            stroke="url(#opsLine)"
            strokeWidth="1"
            strokeDasharray="3 5"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.25, 0.7, 0.25] }}
            transition={{ duration: 3 + (i % 3), repeat: Infinity, ease: 'easeInOut', delay: i * 0.2 }}
          />
        )
      })}
    </svg>
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
      whileHover={{ y: -3 }}
      className="group relative rounded-2xl p-5 backdrop-blur-2xl overflow-hidden transition-all duration-500 flex flex-col h-full"
      style={{
        background: 'linear-gradient(180deg, rgba(29,46,109,0.40), rgba(11,16,38,0.78))',
        border: '1px solid rgba(142,68,255,0.18)',
        boxShadow: '0 16px 40px -16px rgba(142,68,255,0.55), inset 0 1px 0 rgba(255,255,255,0.05)',
        minHeight: 260,
      }}>
      <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ boxShadow: '0 0 0 1px rgba(212,91,255,0.40)' }} />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(212,91,255,0.55), transparent)' }} />
      <div className="pointer-events-none absolute -top-12 -right-12 w-32 h-32 rounded-full opacity-50"
        style={{ background: 'radial-gradient(circle, rgba(142,68,255,0.30), transparent 65%)', filter: 'blur(28px)' }} />
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

/* ─── LiveFeed · feed con avatares + timestamps relativos ─── */
function LiveFeed() {
  const profiles = [
    { initials: 'MR', grad: 'linear-gradient(135deg, #6B5CFF, #D45BFF)' },
    { initials: 'JL', grad: 'linear-gradient(135deg, #D45BFF, #8E44FF)' },
    { initials: 'AV', grad: 'linear-gradient(135deg, #10B981, #6B5CFF)' },
    { initials: 'SC', grad: 'linear-gradient(135deg, #8E44FF, #D45BFF)' },
    { initials: 'PR', grad: 'linear-gradient(135deg, #6B5CFF, #8E44FF)' },
    { initials: 'KG', grad: 'linear-gradient(135deg, #D45BFF, #6B5CFF)' },
    { initials: 'NM', grad: 'linear-gradient(135deg, #8E44FF, #10B981)' },
  ]
  const actions = [
    { text: 'Venta confirmada',       status: '#10B981' },
    { text: 'Cliente recuperado',      status: '#10B981' },
    { text: 'Nuevo pedido recibido',   status: '#D45BFF' },
    { text: 'Seguimiento enviado',     status: '#8E44FF' },
    { text: 'Nuevo cliente conectado', status: '#6B5CFF' },
    { text: 'Conversación iniciada',   status: '#D45BFF' },
    { text: 'Tienda sincronizada',     status: '#10B981' },
  ]

  type Evt = { id: number; initials: string; grad: string; action: string; status: string; createdAt: number }
  const [events, setEvents] = useState<Evt[]>([])
  const [, setTick] = useState(0)
  const counter = useRef(0)
  const idx = useRef(0)
  const pidx = useRef(0)

  useEffect(() => {
    const seed: Evt[] = [0, 1, 2, 3].map(k => {
      counter.current += 1
      const a = actions[(idx.current + k) % actions.length]
      const p = profiles[(pidx.current + k) % profiles.length]
      return {
        id: counter.current,
        initials: p.initials,
        grad: p.grad,
        action: a.text,
        status: a.status,
        createdAt: Date.now() - (3 - k) * 4000,
      }
    })
    idx.current = 4
    pidx.current = 4
    setEvents(seed)

    const evInt = setInterval(() => {
      counter.current += 1
      idx.current = (idx.current + 1) % actions.length
      pidx.current = (pidx.current + 1) % profiles.length
      const a = actions[idx.current]
      const p = profiles[pidx.current]
      setEvents(prev => [...prev, {
        id: counter.current,
        initials: p.initials,
        grad: p.grad,
        action: a.text,
        status: a.status,
        createdAt: Date.now(),
      }].slice(-4))
    }, 2400)

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

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.55, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
      className="relative rounded-2xl p-5 backdrop-blur-2xl overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, rgba(29,46,109,0.40), rgba(11,16,38,0.78))',
        border: '1px solid rgba(142,68,255,0.18)',
        boxShadow: '0 18px 44px -16px rgba(142,68,255,0.55), inset 0 1px 0 rgba(255,255,255,0.05)',
      }}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(212,91,255,0.55), transparent)' }} />

      {/* Header */}
      <div className="relative flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="relative flex h-1.5 w-1.5">
            <motion.span className="absolute inline-flex h-full w-full rounded-full"
              style={{ background: '#D45BFF' }}
              animate={{ opacity: [1, 0.3, 1], scale: [1, 1.6, 1] }}
              transition={{ duration: 1.8, repeat: Infinity }} />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full"
              style={{ background: '#D45BFF', boxShadow: '0 0 6px rgba(212,91,255,0.95)' }} />
          </span>
          <span className="text-[10.5px] uppercase font-semibold"
            style={{ letterSpacing: '0.22em', color: 'rgba(212,91,255,0.95)' }}>
            LIVE
          </span>
          <span className="text-[10.5px] text-white/45 font-medium ml-2 hidden sm:inline">
            Actividad en tiempo real
          </span>
        </div>
        <span className="text-[9.5px] uppercase font-mono text-white/40"
          style={{ letterSpacing: '0.16em' }}>
          Sincronizado
        </span>
      </div>

      <div className="relative space-y-2 min-h-[260px]">
        <AnimatePresence initial={false}>
          {events.map(e => (
            <motion.div key={e.id} layout
              initial={{ opacity: 0, x: 16, height: 0 }}
              animate={{ opacity: 1, x: 0, height: 'auto' }}
              exit={{ opacity: 0, x: -16, height: 0 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl overflow-hidden"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(212,91,255,0.10)',
              }}>
              {/* Avatar */}
              <div className="w-8 h-8 rounded-full flex items-center justify-center font-semibold text-[10.5px] text-white shrink-0"
                style={{
                  background: e.grad,
                  border: '1px solid rgba(255,255,255,0.18)',
                  boxShadow: '0 4px 12px -2px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.22)',
                }}>
                {e.initials}
              </div>
              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: e.status, boxShadow: `0 0 5px ${e.status}` }} />
                  <span className="text-[12.5px] text-white font-semibold leading-none"
                    style={{ letterSpacing: '-0.005em' }}>
                    {e.action}
                  </span>
                </div>
                <div className="text-[10.5px] text-white/45 mt-1 font-medium">
                  {formatAgo(e.createdAt)}
                </div>
              </div>
              <Check className="w-3.5 h-3.5 text-emerald-300/90 shrink-0" strokeWidth={3} />
            </motion.div>
          ))}
        </AnimatePresence>
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
    <div className="relative mt-8 pt-8 overflow-hidden">
      <span className="block text-[10px] uppercase font-medium text-white/35 text-center mb-5"
        style={{ letterSpacing: '0.22em' }}>
        Construido sobre tecnología de clase mundial
      </span>

      <motion.div
        className="flex items-center gap-12 lg:gap-16 whitespace-nowrap"
        animate={{ x: ['0%', '-50%'] }}
        transition={{ duration: 38, repeat: Infinity, ease: 'linear' }}
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

      {/* Fade edges */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-24"
        style={{ background: 'linear-gradient(90deg, #050816, transparent)' }} />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-24"
        style={{ background: 'linear-gradient(90deg, transparent, #050816)' }} />
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
    <section id="video" className="relative pt-14 pb-20 lg:pt-16 lg:pb-24">
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
          className="relative mt-10 rounded-[28px] overflow-hidden"
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
