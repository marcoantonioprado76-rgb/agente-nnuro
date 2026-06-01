'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bot, ShoppingBag, Sparkles, ArrowRight, Play, MessageCircle,
  Check, Menu, X, Package, TrendingUp, Zap, Wifi, Brain, Shield,
} from 'lucide-react'

const AVATAR = 'https://i.ibb.co/YF6smdRk/NURO-123.png'

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false)

  const navTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setMenuOpen(false)
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden" style={{ background: '#020817' }}>
      <BackgroundLayers />
      <Navbar onNav={navTo} menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
      <main className="relative">
        <Hero onNav={navTo} />
        <VideoDemo />
        <Services />
        <HowItWorks />
        <FinalCTA />
        <Footer />
      </main>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   BACKGROUND
   ═══════════════════════════════════════════════════════════════ */
function BackgroundLayers() {
  return (
    <>
      {/* Fixed wrapper */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        {/* Tech grid */}
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(96,165,250,1) 1px, transparent 1px), linear-gradient(90deg, rgba(96,165,250,1) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
            maskImage: 'radial-gradient(ellipse at center, black 0%, transparent 75%)',
            WebkitMaskImage: 'radial-gradient(ellipse at center, black 0%, transparent 75%)',
          }}
        />

        {/* Animated mesh gradient blobs — they drift slowly */}
        <motion.div
          className="absolute -top-40 -left-20 w-[640px] h-[520px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.30), transparent 60%)', filter: 'blur(80px)' }}
          animate={{ x: [0, 140, -60, 0], y: [0, 80, -40, 0] }}
          transition={{ duration: 30, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute top-[20%] right-[-10%] w-[520px] h-[480px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(34,211,238,0.18), transparent 60%)', filter: 'blur(80px)' }}
          animate={{ x: [0, -160, 80, 0], y: [0, -90, 60, 0] }}
          transition={{ duration: 38, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-0 left-[10%] w-[600px] h-[460px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.16), transparent 60%)', filter: 'blur(90px)' }}
          animate={{ x: [0, 120, -90, 0], y: [0, -60, 80, 0] }}
          transition={{ duration: 34, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute top-[60%] left-[40%] w-[400px] h-[380px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(96,165,250,0.18), transparent 60%)', filter: 'blur(70px)' }}
          animate={{ x: [0, -100, 60, 0], y: [0, 60, -80, 0] }}
          transition={{ duration: 26, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Scan line (subtle, slow vertical) */}
        <motion.div
          className="absolute inset-x-0 h-px"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(96,165,250,0.4), transparent)' }}
          animate={{ y: ['-5%', '105%'] }}
          transition={{ duration: 14, repeat: Infinity, ease: 'linear' }}
        />

        {/* Subtle vignette */}
        <div className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse at top, transparent 30%, rgba(2,8,23,0.6) 100%)' }} />
      </div>

      {/* ── GIANT NÜRO watermark — covers the whole landing as ambient background ── */}
      <motion.div
        className="pointer-events-none fixed inset-0 -z-10 flex items-start justify-center overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 2, ease: 'easeOut' }}
      >
        <motion.img
          src={AVATAR}
          alt=""
          aria-hidden
          className="w-[140vw] h-[140vw] sm:w-[110vw] sm:h-[110vw] lg:w-[95vw] lg:h-[95vw] object-contain"
          style={{
            marginTop: '-10vh',
            opacity: 0.18,
            filter: 'drop-shadow(0 0 180px rgba(59,130,246,0.55)) drop-shadow(0 0 320px rgba(96,165,250,0.3))',
          }}
          animate={{
            y: [0, -38, 0],
            rotate: [0, 2.2, -1.5, 0],
            scale: [1, 1.04, 1],
          }}
          transition={{
            y: { duration: 16, repeat: Infinity, ease: 'easeInOut' },
            rotate: { duration: 28, repeat: Infinity, ease: 'easeInOut' },
            scale: { duration: 18, repeat: Infinity, ease: 'easeInOut' },
          }}
        />
      </motion.div>

      {/* Floating particles */}
      {[...Array(22)].map((_, i) => (
        <motion.span
          key={i}
          className="pointer-events-none fixed rounded-full bg-blue-200/80"
          style={{
            left: `${(i * 7) % 96}%`,
            top: `${10 + (i * 13) % 78}%`,
            width: i % 4 === 0 ? '2px' : '1px',
            height: i % 4 === 0 ? '2px' : '1px',
            boxShadow: '0 0 10px rgba(96,165,250,0.9)',
            zIndex: -1,
          }}
          animate={{ y: [0, -45, 15, 0], opacity: [0.1, 0.95, 0.4, 0.1] }}
          transition={{ duration: 18 + i * 1.1, repeat: Infinity, ease: 'easeInOut', delay: i * 0.45 }}
        />
      ))}
    </>
  )
}

/* ═══════════════════════════════════════════════════════════════
   NAVBAR
   ═══════════════════════════════════════════════════════════════ */
function Navbar({
  onNav, menuOpen, setMenuOpen,
}: { onNav: (id: string) => void; menuOpen: boolean; setMenuOpen: (v: boolean) => void }) {
  const items = [
    { id: 'agentes',  label: 'Agentes IA' },
    { id: 'tiendas',  label: 'Tiendas Virtuales' },
    { id: 'video',    label: 'Video' },
    { id: 'contacto', label: 'Contacto' },
  ]

  return (
    <>
      <nav
        className="fixed top-0 inset-x-0 z-50 backdrop-blur-xl"
        style={{
          background: 'rgba(2,8,23,0.72)',
          borderBottom: '1px solid rgba(59,130,246,0.12)',
        }}
      >
        <div className="max-w-6xl mx-auto px-5 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <div
              className="relative w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, rgba(59,130,246,0.3), rgba(59,130,246,0.05))',
                border: '1px solid rgba(96,165,250,0.4)',
                boxShadow: '0 0 18px -4px rgba(59,130,246,0.6), inset 0 1px 0 rgba(255,255,255,0.12)',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={AVATAR} alt="NÜRO" className="absolute w-[150%] h-[150%] object-contain"
                style={{ filter: 'drop-shadow(0 0 4px rgba(96,165,250,0.7))' }} />
            </div>
            <span className="text-[15px] font-bold tracking-tight text-white" style={{ letterSpacing: '-0.01em' }}>
              AGENTE <span className="text-blue-300">NÜRO</span>
            </span>
          </Link>

          {/* Desktop menu */}
          <div className="hidden lg:flex items-center gap-7">
            {items.map((it) => (
              <button
                key={it.id}
                onClick={() => onNav(it.id)}
                className="text-[13.5px] font-medium text-white/70 hover:text-white transition-colors"
                style={{ letterSpacing: '-0.005em' }}
              >
                {it.label}
              </button>
            ))}
          </div>

          {/* CTAs — desktop */}
          <div className="hidden sm:flex items-center gap-2.5">
            <Link
              href="/register"
              className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl text-white/85 font-bold text-[12px] tracking-[0.14em] uppercase transition-all hover:text-white"
              style={{
                background: 'rgba(59,130,246,0.08)',
                border: '1px solid rgba(96,165,250,0.28)',
              }}
            >
              Registrarse
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 h-10 px-5 rounded-xl text-white font-bold text-[12px] tracking-[0.15em] uppercase transition-all"
              style={{
                background: 'linear-gradient(180deg, #3B82F6, #2563EB)',
                boxShadow: '0 10px 26px -8px rgba(59,130,246,0.75), 0 0 0 1px rgba(96,165,250,0.35), inset 0 1px 0 rgba(255,255,255,0.25)',
              }}
            >
              Iniciar sesión
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="lg:hidden flex items-center justify-center w-10 h-10 rounded-xl text-white"
            style={{
              background: 'rgba(59,130,246,0.12)',
              border: '1px solid rgba(59,130,246,0.25)',
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
              style={{ borderTop: '1px solid rgba(59,130,246,0.12)' }}
            >
              <div className="px-5 py-4 flex flex-col gap-2">
                {items.map((it) => (
                  <button
                    key={it.id}
                    onClick={() => onNav(it.id)}
                    className="text-left py-3 px-4 rounded-xl text-[14px] font-medium text-white/80 hover:text-white transition-colors"
                    style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.12)' }}
                  >
                    {it.label}
                  </button>
                ))}
                <Link
                  href="/register"
                  className="mt-2 flex items-center justify-center gap-2 h-12 rounded-xl text-white font-bold tracking-[0.15em] uppercase"
                  style={{
                    background: 'rgba(59,130,246,0.10)',
                    border: '1px solid rgba(96,165,250,0.32)',
                  }}
                >
                  Registrarse
                </Link>
                <Link
                  href="/login"
                  className="flex items-center justify-center gap-2 h-12 rounded-xl text-white font-bold tracking-[0.15em] uppercase"
                  style={{
                    background: 'linear-gradient(180deg, #3B82F6, #2563EB)',
                    boxShadow: '0 10px 26px -8px rgba(59,130,246,0.75), inset 0 1px 0 rgba(255,255,255,0.25)',
                  }}
                >
                  Iniciar sesión
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </>
  )
}

/* ═══════════════════════════════════════════════════════════════
   HERO
   ═══════════════════════════════════════════════════════════════ */
function Hero({ onNav }: { onNav: (id: string) => void }) {
  return (
    <section className="relative pt-28 pb-16 sm:pt-36 sm:pb-24 overflow-hidden">
      {/* ── Giant ghost NÜRO floating in the background (right side) ── */}
      {/* (NÜRO ghost moved to global BackgroundLayers — now covers the whole landing) */}

      {/* ── Decorative grid lines on the left ── */}
      <div className="pointer-events-none absolute -left-12 top-1/4 hidden lg:block opacity-30">
        <svg width="100" height="280" viewBox="0 0 100 280">
          {[0, 20, 40, 60, 80].map(x => (
            <line key={x} x1={x} y1="0" x2={x} y2="280" stroke="rgba(96,165,250,0.3)" strokeWidth="0.5" strokeDasharray="3 4" />
          ))}
        </svg>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-5 sm:px-6 grid lg:grid-cols-[1.1fr_1fr] gap-10 lg:gap-12 items-center">
        {/* Left — copy */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <span
            className="inline-flex items-center gap-2 text-[10.5px] uppercase font-bold text-blue-300 mb-5 px-3 py-1.5 rounded-full"
            style={{
              letterSpacing: '0.22em',
              background: 'rgba(59,130,246,0.10)',
              border: '1px solid rgba(59,130,246,0.28)',
            }}
          >
            <Sparkles className="w-3 h-3" />
            NÜRO Agent Studio
          </span>

          <h1
            className="font-bold leading-[1.02] text-[40px] sm:text-[52px] lg:text-[60px]"
            style={{
              letterSpacing: '-0.038em',
              background: 'linear-gradient(180deg, #FFFFFF 0%, #C8DBFF 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Agentes IA y Tiendas Virtuales que venden por ti{' '}
            <span
              style={{
                background: 'linear-gradient(180deg, #60A5FA, #3B82F6)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              24/7
            </span>
          </h1>

          <p
            className="mt-5 text-[16px] sm:text-[17.5px] text-white/70 leading-relaxed max-w-xl"
            style={{ letterSpacing: '-0.005em' }}
          >
            Automatiza respuestas, seguimiento y ventas con AGENTE NÜRO. Inteligencia
            artificial conectada a WhatsApp, Messenger y tu tienda virtual.
          </p>

          {/* CTAs */}
          <div className="mt-8 flex flex-col sm:flex-row gap-3 flex-wrap">
            <Link
              href="/login"
              className="relative group/cta inline-flex items-center justify-center gap-2.5 h-14 px-8 rounded-2xl text-white font-bold overflow-hidden"
              style={{
                background: 'linear-gradient(180deg, #3B82F6 0%, #2563EB 100%)',
                boxShadow: '0 14px 40px -8px rgba(59,130,246,0.8), 0 0 0 1px rgba(96,165,250,0.35), inset 0 1px 0 rgba(255,255,255,0.28)',
                fontSize: '13.5px',
                letterSpacing: '0.16em',
              }}
            >
              <span className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover/cta:translate-x-full transition-transform duration-1000" />
              <span className="relative">INICIAR SESIÓN</span>
              <ArrowRight className="w-4 h-4 relative" />
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2.5 h-14 px-7 rounded-2xl text-white font-bold transition-all"
              style={{
                background: 'rgba(59,130,246,0.10)',
                border: '1px solid rgba(96,165,250,0.4)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
                fontSize: '13.5px',
                letterSpacing: '0.16em',
              }}
            >
              <Sparkles className="w-4 h-4" />
              CREAR CUENTA
            </Link>
            <button
              onClick={() => onNav('video')}
              className="inline-flex items-center justify-center gap-2.5 h-14 px-7 rounded-2xl text-white/85 font-semibold transition-all hover:text-white"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.10)',
                fontSize: '13.5px',
                letterSpacing: '0.16em',
              }}
            >
              <Play className="w-4 h-4" />
              VER VIDEO
            </button>
          </div>

          {/* Quick stats */}
          <div className="mt-10 flex items-center gap-6 sm:gap-8 flex-wrap">
            {[
              { v: '24/7',   l: 'Atención' },
              { v: '<30s',   l: 'Despliegue' },
              { v: '4',      l: 'Canales' },
              { v: 'GPT-5',  l: 'Motor IA' },
            ].map((s, i) => (
              <div key={i} className="flex items-baseline gap-2">
                <span className="text-[20px] sm:text-[22px] font-bold text-white tabular-nums" style={{ letterSpacing: '-0.025em' }}>{s.v}</span>
                <span className="text-[11px] uppercase font-semibold text-white/45" style={{ letterSpacing: '0.14em' }}>{s.l}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Right — holographic visual */}
        <HeroVisual />
      </div>
    </section>
  )
}

function HeroVisual() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
      className="relative h-[420px] sm:h-[480px] flex items-center justify-center"
    >
      {/* Background blob */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[360px] h-[360px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.18), transparent 65%)', filter: 'blur(40px)' }} />
      </div>

      {/* Central core */}
      <div className="relative w-[240px] h-[240px] sm:w-[280px] sm:h-[280px] flex items-center justify-center">
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            background: 'conic-gradient(from 0deg, rgba(96,165,250,0.7), transparent 35%, rgba(96,165,250,0.45) 55%, transparent 90%, rgba(96,165,250,0.7))',
            maskImage: 'radial-gradient(circle, transparent 60%, black 62%, black 68%, transparent 71%)',
            WebkitMaskImage: 'radial-gradient(circle, transparent 60%, black 62%, black 68%, transparent 71%)',
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
        />
        <motion.div
          className="absolute inset-3 rounded-full"
          style={{
            background: 'conic-gradient(from 180deg, transparent, rgba(59,130,246,0.5), transparent 50%, rgba(59,130,246,0.3) 70%, transparent)',
            maskImage: 'radial-gradient(circle, transparent 68%, black 70%, black 75%, transparent 78%)',
            WebkitMaskImage: 'radial-gradient(circle, transparent 68%, black 70%, black 75%, transparent 78%)',
          }}
          animate={{ rotate: -360 }}
          transition={{ duration: 28, repeat: Infinity, ease: 'linear' }}
        />
        <motion.div
          className="absolute -inset-6 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(96,165,250,0.4), transparent 60%)', filter: 'blur(18px)' }}
          animate={{ opacity: [0.55, 0.95, 0.55], scale: [1, 1.08, 1] }}
          transition={{ duration: 3.6, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div
          className="relative w-[140px] h-[140px] sm:w-[160px] sm:h-[160px] rounded-full overflow-hidden flex items-center justify-center"
          style={{
            background: 'radial-gradient(circle at 30% 25%, rgba(96,165,250,0.5), rgba(8,15,32,0.95) 72%)',
            border: '1px solid rgba(96,165,250,0.55)',
            boxShadow: '0 0 50px rgba(59,130,246,0.6), inset 0 0 24px rgba(59,130,246,0.25), inset 0 1px 0 rgba(255,255,255,0.16)',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={AVATAR} alt="NÜRO" className="absolute w-[140%] h-[140%] object-contain"
            style={{ filter: 'drop-shadow(0 0 10px rgba(96,165,250,0.7))' }} />
          <span className="absolute inset-x-3 top-2 h-1/3 rounded-full pointer-events-none"
            style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.22), transparent)' }} />
        </div>
      </div>

      {/* Floating cards */}
      <FloatingChip
        className="absolute top-[5%] left-[-2%] sm:left-[2%]"
        icon={MessageCircle} label="Mensaje recibido" value="124 chats" acc="52,211,153"
        delay={0.4}
      />
      <FloatingChip
        className="absolute top-[42%] right-[-4%] sm:right-[0%]"
        icon={Package} label="Pedido confirmado" value="$345 USD" acc="167,139,250"
        delay={0.7}
      />
      <FloatingChip
        className="absolute bottom-[6%] left-[8%]"
        icon={TrendingUp} label="Venta cerrada" value="+$1,420" acc="34,211,238"
        delay={1.0}
      />
    </motion.div>
  )
}

function FloatingChip({
  className, icon: Icon, label, value, acc, delay,
}: { className?: string; icon: typeof MessageCircle; label: string; value: string; acc: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.85 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      className={`flex items-center gap-2.5 px-3 py-2 rounded-2xl backdrop-blur-xl ${className ?? ''}`}
      style={{
        background: `linear-gradient(135deg, rgba(${acc},0.18), rgba(10,20,42,0.78))`,
        border: `1px solid rgba(${acc},0.4)`,
        boxShadow: `0 10px 30px -10px rgba(${acc},0.55), inset 0 1px 0 rgba(255,255,255,0.08)`,
      }}
    >
      <motion.div
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 4 + delay, repeat: Infinity, ease: 'easeInOut' }}
        className="contents"
      >
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
          style={{
            background: `rgba(${acc},0.22)`,
            border: `1px solid rgba(${acc},0.5)`,
            boxShadow: `0 0 10px rgba(${acc},0.5)`,
          }}
        >
          <Icon className="w-4 h-4" style={{ color: `rgb(${acc})` }} strokeWidth={2} />
        </div>
        <div className="min-w-0">
          <div className="text-[9.5px] uppercase font-bold text-white/60" style={{ letterSpacing: '0.14em' }}>{label}</div>
          <div className="text-[12.5px] font-bold text-white leading-tight tabular-nums" style={{ letterSpacing: '-0.012em' }}>{value}</div>
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   VIDEO DEMO — real playback
   ═══════════════════════════════════════════════════════════════ */
const VIDEO_URL = 'https://files.catbox.moe/kmqx7r.mp4'

function VideoDemo() {
  const [playing, setPlaying] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  const handlePlay = () => {
    const v = videoRef.current
    if (!v) return
    v.play().catch(() => { /* ignore */ })
    setPlaying(true)
  }

  return (
    <section id="video" className="relative py-20 sm:py-24">
      <div className="max-w-5xl mx-auto px-5 sm:px-6">
        <SectionHeader
          eyebrow="VIDEO DEMO"
          title="Mira cómo AGENTE NÜRO trabaja por tu negocio"
        />

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="relative mt-10 rounded-3xl overflow-hidden backdrop-blur-2xl"
          style={{
            background: 'linear-gradient(180deg, rgba(11,21,42,0.7) 0%, rgba(8,15,32,0.85) 100%)',
            border: '1px solid rgba(59,130,246,0.3)',
            boxShadow: '0 30px 80px -20px rgba(59,130,246,0.55), inset 0 1px 0 rgba(255,255,255,0.05)',
          }}
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-400/60 to-transparent z-20" />

          {/* Aspect 16:9 wrapper */}
          <div className="relative aspect-video bg-black">
            <video
              ref={videoRef}
              src={VIDEO_URL}
              controls={playing}
              playsInline
              preload="metadata"
              className="absolute inset-0 w-full h-full object-contain bg-black"
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onEnded={() => setPlaying(false)}
            />

            {/* Click-to-play overlay */}
            <AnimatePresence>
              {!playing && (
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={handlePlay}
                  className="absolute inset-0 flex items-center justify-center group/play"
                  style={{ background: 'radial-gradient(circle at center, rgba(59,130,246,0.32), rgba(2,8,23,0.55) 60%)' }}
                  aria-label="Reproducir demo"
                >
                  <motion.span
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.95 }}
                    className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center"
                    style={{
                      background: 'linear-gradient(180deg, #3B82F6, #2563EB)',
                      boxShadow: '0 20px 50px -10px rgba(59,130,246,0.9), 0 0 0 8px rgba(59,130,246,0.18), inset 0 2px 0 rgba(255,255,255,0.32)',
                    }}
                  >
                    <Play className="w-8 h-8 sm:w-10 sm:h-10 text-white relative" style={{ marginLeft: 4 }} strokeWidth={2.2} fill="white" />
                    <motion.span
                      className="absolute inset-0 rounded-full pointer-events-none"
                      style={{ border: '2px solid rgba(96,165,250,0.6)' }}
                      animate={{ scale: [1, 1.7], opacity: [0.7, 0] }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
                    />
                  </motion.span>
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        <p className="text-center text-[14px] sm:text-[15px] text-white/65 mt-7 leading-relaxed max-w-2xl mx-auto"
          style={{ letterSpacing: '-0.005em' }}>
          Agentes IA respondiendo clientes + Tiendas Virtuales vendiendo automáticamente.
        </p>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════
   SERVICES
   ═══════════════════════════════════════════════════════════════ */
function Services() {
  const services = [
    {
      id: 'agentes',
      icon: Bot,
      label: 'Agentes IA de Venta',
      desc: 'Atienden clientes, responden preguntas, hacen seguimiento y ayudan a cerrar ventas automáticamente.',
      benefits: ['Atención 24/7', 'Seguimiento automático', 'Respuestas inteligentes', 'Más oportunidades recuperadas'],
      acc: '59,130,246', accL: '96,165,250',
    },
    {
      id: 'tiendas',
      icon: ShoppingBag,
      label: 'Tiendas Virtuales',
      desc: 'Muestra productos, recibe pedidos y conecta tus ventas con atención automática.',
      benefits: ['Catálogo digital', 'Pedidos online', 'Disponible 24/7', 'Fácil administración'],
      acc: '34,211,238', accL: '103,232,249',
    },
  ]

  return (
    <section id="agentes" className="relative py-20 sm:py-24 scroll-mt-20">
      <div id="tiendas" className="absolute -top-20" />
      <div className="max-w-6xl mx-auto px-5 sm:px-6">
        <SectionHeader
          eyebrow="DOS SOLUCIONES · UN ECOSISTEMA"
          title="Todo lo que necesitas para vender en piloto automático"
        />

        <div className="grid lg:grid-cols-2 gap-5 sm:gap-6 mt-12">
          {services.map((s, idx) => {
            const Icon = s.icon
            return (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.55, delay: idx * 0.12, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ y: -6 }}
                className="relative overflow-hidden rounded-3xl backdrop-blur-2xl p-7 sm:p-9"
                style={{
                  background: `linear-gradient(180deg, rgba(${s.acc},0.12) 0%, rgba(10,20,42,0.78) 60%, rgba(8,15,32,0.85) 100%)`,
                  border: `1px solid rgba(${s.accL},0.28)`,
                  boxShadow: `0 24px 60px -20px rgba(${s.acc},0.55), inset 0 1px 0 rgba(255,255,255,0.05)`,
                }}
              >
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px"
                  style={{ background: `linear-gradient(90deg, transparent, rgba(${s.accL},0.65), transparent)` }} />
                <div className="pointer-events-none absolute -top-24 -right-20 w-72 h-72 rounded-full"
                  style={{ background: `radial-gradient(circle, rgba(${s.acc},0.3), transparent 65%)`, filter: 'blur(60px)' }} />

                {/* Icon tile */}
                <div className="relative mb-5 inline-block">
                  <motion.span
                    className="absolute -inset-3 rounded-full pointer-events-none"
                    style={{ background: `radial-gradient(circle, rgba(${s.accL},0.5), transparent 60%)`, filter: 'blur(12px)' }}
                    animate={{ opacity: [0.55, 0.95, 0.55], scale: [1, 1.1, 1] }}
                    transition={{ duration: 3.6, repeat: Infinity, ease: 'easeInOut' }}
                  />
                  <div
                    className="relative w-16 h-16 rounded-2xl flex items-center justify-center"
                    style={{
                      background: `linear-gradient(135deg, rgba(${s.accL},0.3), rgba(${s.acc},0.1))`,
                      border: `1px solid rgba(${s.accL},0.55)`,
                      boxShadow: `0 0 28px rgba(${s.acc},0.55), inset 0 1px 0 rgba(255,255,255,0.18)`,
                    }}
                  >
                    <span className="absolute inset-x-1 top-0.5 h-1/2 rounded-t-xl pointer-events-none"
                      style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.2), transparent)' }} />
                    <Icon className="w-8 h-8 relative" style={{ color: `rgb(${s.accL})`, filter: `drop-shadow(0 0 8px rgba(${s.acc},0.7))` }} strokeWidth={1.5} />
                  </div>
                </div>

                <h3 className="relative text-[24px] sm:text-[28px] font-bold text-white leading-[1.1] mb-3"
                  style={{ letterSpacing: '-0.028em' }}>
                  {s.label}
                </h3>
                <p className="relative text-[15px] text-white/70 leading-relaxed mb-6 max-w-md"
                  style={{ letterSpacing: '-0.005em' }}>
                  {s.desc}
                </p>

                {/* Benefits */}
                <ul className="relative grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {s.benefits.map((b, i) => (
                    <li key={i} className="flex items-center gap-2.5 text-[13.5px] font-medium text-white/85">
                      <span className="flex h-4 w-4 items-center justify-center rounded-full shrink-0"
                        style={{
                          background: `rgba(${s.acc},0.22)`,
                          border: `1px solid rgba(${s.accL},0.55)`,
                          boxShadow: `0 0 6px rgba(${s.acc},0.5)`,
                        }}>
                        <Check className="w-2.5 h-2.5" style={{ color: `rgb(${s.accL})` }} strokeWidth={4} />
                      </span>
                      {b}
                    </li>
                  ))}
                </ul>
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
    { n: '01', icon: Brain,  title: 'Configura tu negocio',          desc: 'Carga tu catálogo, datos y forma de atender clientes.' },
    { n: '02', icon: Zap,    title: 'Activa tu Agente IA',           desc: 'Conecta WhatsApp, Messenger o Instagram en menos de 30 segundos.' },
    { n: '03', icon: Wifi,   title: 'Empieza a vender automáticamente', desc: 'El agente responde, hace seguimiento y cierra ventas por ti, 24/7.' },
  ]

  return (
    <section className="relative py-20 sm:py-24">
      <div className="max-w-6xl mx-auto px-5 sm:px-6">
        <SectionHeader
          eyebrow="CÓMO FUNCIONA"
          title="Activa tu Agente IA en 3 pasos"
        />

        <div className="relative mt-14">
          {/* Connection line (desktop) */}
          <div className="hidden lg:block absolute top-9 left-[16.6%] right-[16.6%] h-px"
            style={{ background: 'linear-gradient(90deg, rgba(59,130,246,0.05), rgba(59,130,246,0.45), rgba(59,130,246,0.05))' }} />

          <div className="grid lg:grid-cols-3 gap-6 lg:gap-8 relative">
            {steps.map((s, idx) => {
              const Icon = s.icon
              return (
                <motion.div
                  key={s.n}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.5, delay: idx * 0.12, ease: [0.22, 1, 0.36, 1] }}
                  className="relative text-center"
                >
                  {/* Number badge */}
                  <div className="relative inline-block mb-5">
                    <div
                      className="relative w-[72px] h-[72px] rounded-2xl flex items-center justify-center mx-auto"
                      style={{
                        background: 'linear-gradient(135deg, rgba(59,130,246,0.28), rgba(59,130,246,0.05))',
                        border: '1px solid rgba(96,165,250,0.45)',
                        boxShadow: '0 0 28px -4px rgba(59,130,246,0.55), inset 0 1px 0 rgba(255,255,255,0.14)',
                      }}
                    >
                      <Icon className="w-8 h-8 text-blue-200" strokeWidth={1.5} style={{ filter: 'drop-shadow(0 0 6px rgba(96,165,250,0.7))' }} />
                    </div>
                    <span className="absolute -top-2 -right-2 text-[10px] font-bold tracking-[0.16em] px-2 py-0.5 rounded-full text-blue-100"
                      style={{
                        background: 'rgba(59,130,246,0.35)',
                        border: '1px solid rgba(96,165,250,0.5)',
                        boxShadow: '0 0 8px rgba(59,130,246,0.45)',
                      }}>
                      {s.n}
                    </span>
                  </div>

                  <h3 className="text-[19px] sm:text-[21px] font-bold text-white leading-[1.15] mb-2.5"
                    style={{ letterSpacing: '-0.025em' }}>
                    {s.title}
                  </h3>
                  <p className="text-[14px] text-white/65 leading-relaxed max-w-xs mx-auto"
                    style={{ letterSpacing: '-0.005em' }}>
                    {s.desc}
                  </p>
                </motion.div>
              )
            })}
          </div>
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
    <section className="relative py-20 sm:py-28">
      <div className="max-w-4xl mx-auto px-5 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="relative overflow-hidden rounded-[28px] backdrop-blur-2xl text-center p-10 sm:p-14"
          style={{
            background: 'linear-gradient(180deg, rgba(59,130,246,0.18) 0%, rgba(10,20,42,0.85) 60%, rgba(8,15,32,0.9) 100%)',
            border: '1px solid rgba(59,130,246,0.4)',
            boxShadow: '0 32px 90px -20px rgba(59,130,246,0.65), inset 0 1px 0 rgba(255,255,255,0.06)',
          }}
        >
          {/* Ambient */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-400/60 to-transparent" />
          <div className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 w-[400px] h-[200px] bg-blue-500/[0.3] blur-[100px]" />
          <div className="pointer-events-none absolute -bottom-24 left-1/2 -translate-x-1/2 w-[500px] h-[260px] bg-cyan-500/[0.18] blur-[120px]" />

          <span
            className="inline-flex items-center gap-2 text-[10.5px] uppercase font-bold text-blue-300 mb-5 px-3 py-1.5 rounded-full relative"
            style={{
              letterSpacing: '0.22em',
              background: 'rgba(59,130,246,0.12)',
              border: '1px solid rgba(96,165,250,0.35)',
            }}
          >
            <Shield className="w-3 h-3" />
            Activación gratis
          </span>

          <h2
            className="relative font-bold leading-[1.04] text-[34px] sm:text-[44px] lg:text-[52px] mb-5"
            style={{
              letterSpacing: '-0.035em',
              background: 'linear-gradient(180deg, #FFFFFF 0%, #C8DBFF 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Tu negocio puede vender incluso mientras duermes
          </h2>

          <p className="relative text-[16px] sm:text-[18px] text-white/72 leading-relaxed max-w-2xl mx-auto mb-9"
            style={{ letterSpacing: '-0.005em' }}>
            Activa AGENTE NÜRO y convierte conversaciones en ventas.
          </p>

          <div className="relative flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/login"
              className="relative group/cta inline-flex items-center justify-center gap-2.5 h-16 px-10 rounded-2xl text-white font-bold overflow-hidden w-full sm:w-auto"
              style={{
                background: 'linear-gradient(180deg, #3B82F6 0%, #2563EB 100%)',
                boxShadow: '0 20px 50px -10px rgba(59,130,246,0.9), 0 0 0 1px rgba(96,165,250,0.45), inset 0 1px 0 rgba(255,255,255,0.32)',
                fontSize: '14px',
                letterSpacing: '0.18em',
              }}
            >
              <span className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover/cta:translate-x-full transition-transform duration-1000" />
              <Sparkles className="w-5 h-5 relative" strokeWidth={2.2} />
              <span className="relative">INICIAR SESIÓN</span>
              <ArrowRight className="w-4 h-4 relative" />
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2.5 h-16 px-9 rounded-2xl text-white font-bold w-full sm:w-auto"
              style={{
                background: 'rgba(59,130,246,0.10)',
                border: '1px solid rgba(96,165,250,0.4)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
                fontSize: '14px',
                letterSpacing: '0.18em',
              }}
            >
              CREAR CUENTA
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════
   FOOTER
   ═══════════════════════════════════════════════════════════════ */
function Footer() {
  return (
    <footer id="contacto" className="relative py-10 sm:py-14 mt-8"
      style={{ borderTop: '1px solid rgba(59,130,246,0.12)' }}>
      <div className="max-w-6xl mx-auto px-5 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2.5">
          <div
            className="relative w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, rgba(59,130,246,0.3), rgba(59,130,246,0.05))',
              border: '1px solid rgba(96,165,250,0.4)',
              boxShadow: '0 0 18px -4px rgba(59,130,246,0.6)',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={AVATAR} alt="NÜRO" className="absolute w-[150%] h-[150%] object-contain" />
          </div>
          <span className="text-[14px] font-bold tracking-tight text-white">
            AGENTE <span className="text-blue-300">NÜRO</span>
          </span>
        </div>

        <div className="text-[12px] text-white/45 font-medium" style={{ letterSpacing: '0.04em' }}>
          © {new Date().getFullYear()} Agente NÜRO · Hecho para emprendedores que venden con IA
        </div>
      </div>
    </footer>
  )
}

/* ═══════════════════════════════════════════════════════════════
   SHARED — Section header
   ═══════════════════════════════════════════════════════════════ */
function SectionHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.5 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="text-center"
    >
      <span
        className="inline-flex items-center text-[10.5px] uppercase font-bold text-blue-300 mb-4 px-3 py-1.5 rounded-full"
        style={{
          letterSpacing: '0.22em',
          background: 'rgba(59,130,246,0.10)',
          border: '1px solid rgba(59,130,246,0.28)',
        }}
      >
        {eyebrow}
      </span>
      <h2
        className="font-bold leading-[1.08] text-[30px] sm:text-[40px] max-w-3xl mx-auto"
        style={{
          letterSpacing: '-0.034em',
          background: 'linear-gradient(180deg, #FFFFFF 0%, #C8DBFF 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >
        {title}
      </h2>
    </motion.div>
  )
}
