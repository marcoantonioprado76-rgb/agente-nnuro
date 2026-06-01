'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bot, ShoppingBag, Sparkles, ArrowRight, Play, MessageCircle,
  Check, Menu, X, Package, TrendingUp, Zap, Wifi, Brain, Shield,
} from 'lucide-react'

const AVATAR = '/nuro-3d.png'

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false)

  const navTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setMenuOpen(false)
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden" style={{ background: '#020817' }}>
      <BackgroundLayers />

      {/* ── GIANT NÜRO watermark — sized by VIEWPORT HEIGHT so the head never gets cropped ── */}
      <motion.div
        className="pointer-events-none fixed inset-0 flex items-center justify-center overflow-hidden"
        style={{ zIndex: 1 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 2, ease: 'easeOut' }}
        aria-hidden
      >
        <motion.img
          src={AVATAR}
          alt=""
          className="object-contain"
          style={{
            height: 'min(95vh, 130vw)',
            width: 'auto',
            maxWidth: '110vw',
            marginTop: '12vh',
            opacity: 0.62,
            filter: 'drop-shadow(0 0 260px rgba(59,130,246,1)) drop-shadow(0 0 440px rgba(96,165,250,0.65)) brightness(1.08) saturate(1.2)',
          }}
          animate={{
            y: [0, -20, 8, 0],
            rotate: [0, 1.6, -1.1, 0],
            scale: [1, 1.025, 0.99, 1],
          }}
          transition={{
            y: { duration: 14, repeat: Infinity, ease: 'easeInOut' },
            rotate: { duration: 26, repeat: Infinity, ease: 'easeInOut' },
            scale: { duration: 18, repeat: Infinity, ease: 'easeInOut' },
          }}
        />
      </motion.div>

      <Navbar onNav={navTo} menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
      <main className="relative" style={{ zIndex: 2 }}>
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
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
              <Link
                href="/register"
                className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl text-white/85 font-bold text-[12px] tracking-[0.14em] uppercase transition-colors hover:text-white hover:bg-blue-500/20"
                style={{
                  background: 'rgba(59,130,246,0.08)',
                  border: '1px solid rgba(96,165,250,0.28)',
                }}
              >
                Registrarse
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05, y: -1 }} whileTap={{ scale: 0.96 }}>
              <Link
                href="/login"
                className="relative group/nl inline-flex items-center gap-2 h-10 px-5 rounded-xl text-white font-bold text-[12px] tracking-[0.15em] uppercase overflow-hidden"
                style={{
                  background: 'linear-gradient(180deg, #3B82F6, #2563EB)',
                  boxShadow: '0 10px 26px -8px rgba(59,130,246,0.75), 0 0 0 1px rgba(96,165,250,0.35), inset 0 1px 0 rgba(255,255,255,0.25)',
                }}
              >
                <span className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover/nl:translate-x-full transition-transform duration-700" />
                <span className="relative">Iniciar sesión</span>
                <ArrowRight className="w-3.5 h-3.5 relative" />
              </Link>
            </motion.div>
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
                <motion.div whileTap={{ scale: 0.97 }}>
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
                </motion.div>
                <motion.div whileTap={{ scale: 0.97 }}>
                  <Link
                    href="/login"
                    className="flex items-center justify-center gap-2 h-12 rounded-xl text-white font-bold tracking-[0.15em] uppercase"
                    style={{
                      background: 'linear-gradient(180deg, #3B82F6, #2563EB)',
                      boxShadow: '0 10px 26px -8px rgba(59,130,246,0.75), inset 0 1px 0 rgba(255,255,255,0.25)',
                    }}
                  >
                    Iniciar sesión
                    <motion.span animate={{ x: [0, 3, 0] }} transition={{ duration: 1.6, repeat: Infinity }}>
                      <ArrowRight className="w-4 h-4" />
                    </motion.span>
                  </Link>
                </motion.div>
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
function NeuralBackdrop() {
  // Static node positions on a 100x100 viewBox
  const nodes = [
    { x: 8,  y: 18 }, { x: 22, y: 35 }, { x: 38, y: 12 }, { x: 52, y: 28 },
    { x: 68, y: 14 }, { x: 80, y: 32 }, { x: 92, y: 20 },
    { x: 14, y: 55 }, { x: 30, y: 68 }, { x: 46, y: 52 }, { x: 62, y: 64 },
    { x: 78, y: 56 }, { x: 90, y: 70 },
    { x: 18, y: 86 }, { x: 36, y: 90 }, { x: 56, y: 84 }, { x: 74, y: 90 },
  ]
  // Connections (pairs of node indices)
  const links: [number, number][] = [
    [0,1],[1,2],[1,3],[2,3],[3,4],[4,5],[5,6],[3,5],
    [1,7],[7,8],[8,9],[3,9],[9,10],[10,11],[11,12],[5,11],
    [7,13],[8,14],[9,14],[10,15],[11,16],[12,16],[13,14],[14,15],[15,16],
  ]
  return (
    <svg
      className="pointer-events-none absolute inset-0 w-full h-full"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden
      style={{
        maskImage: 'radial-gradient(ellipse at center, black 0%, transparent 75%)',
        WebkitMaskImage: 'radial-gradient(ellipse at center, black 0%, transparent 75%)',
        opacity: 0.5,
      }}
    >
      {/* Lines */}
      {links.map(([a, b], i) => {
        const A = nodes[a], B = nodes[b]
        return (
          <motion.line
            key={i}
            x1={A.x} y1={A.y} x2={B.x} y2={B.y}
            stroke="rgba(96,165,250,0.45)"
            strokeWidth="0.18"
            vectorEffect="non-scaling-stroke"
            initial={{ opacity: 0.15 }}
            animate={{ opacity: [0.15, 0.65, 0.15] }}
            transition={{ duration: 4 + (i % 5), repeat: Infinity, ease: 'easeInOut', delay: (i % 7) * 0.4 }}
          />
        )
      })}
      {/* Nodes */}
      {nodes.map((n, i) => (
        <motion.circle
          key={i}
          cx={n.x} cy={n.y} r="0.55"
          fill="rgba(96,165,250,0.95)"
          style={{ filter: 'drop-shadow(0 0 1.5px rgba(96,165,250,1))' }}
          animate={{ opacity: [0.3, 1, 0.3], r: [0.55, 0.85, 0.55] }}
          transition={{ duration: 3 + (i % 4), repeat: Infinity, ease: 'easeInOut', delay: (i % 6) * 0.3 }}
        />
      ))}
      {/* Traveling data pulses on a few links */}
      {[[1, 3], [3, 9], [9, 14]].map((pair, i) => {
        const A = nodes[pair[0]], B = nodes[pair[1]]
        return (
          <motion.circle
            key={`p${i}`}
            r="0.7"
            fill="rgba(96,165,250,1)"
            style={{ filter: 'drop-shadow(0 0 3px rgba(96,165,250,1))' }}
            animate={{ cx: [A.x, B.x], cy: [A.y, B.y], opacity: [0, 1, 0] }}
            transition={{ duration: 2.4 + i * 0.4, repeat: Infinity, ease: 'easeInOut', delay: i * 0.7 }}
          />
        )
      })}
    </svg>
  )
}

function Hero({ onNav }: { onNav: (id: string) => void }) {
  return (
    <section className="relative pt-24 pb-12 sm:pt-32 sm:pb-20 overflow-hidden">
      {/* ── Neural network backdrop (subtle, layered above the global NÜRO watermark) ── */}
      <NeuralBackdrop />

      {/* ── Orbital rings anchored to the right column ── */}
      <div className="pointer-events-none absolute right-[-10%] top-[10%] hidden lg:block w-[560px] h-[560px]">
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{ border: '1px solid rgba(96,165,250,0.16)' }}
          animate={{ rotate: 360 }}
          transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
        >
          <span className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-blue-300"
            style={{ boxShadow: '0 0 12px rgba(96,165,250,1), 0 0 24px rgba(59,130,246,0.6)' }} />
        </motion.div>
        <motion.div
          className="absolute inset-[12%] rounded-full"
          style={{ border: '1px dashed rgba(96,165,250,0.22)' }}
          animate={{ rotate: -360 }}
          transition={{ duration: 80, repeat: Infinity, ease: 'linear' }}
        >
          <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-cyan-300"
            style={{ boxShadow: '0 0 10px rgba(103,232,249,0.9)' }} />
        </motion.div>
        <motion.div
          className="absolute inset-[24%] rounded-full"
          style={{ border: '1px solid rgba(96,165,250,0.12)' }}
          animate={{ rotate: 360 }}
          transition={{ duration: 45, repeat: Infinity, ease: 'linear' }}
        />
      </div>
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
            Agentes IA y Tiendas Virtuales que venden por ti
          </h1>

          {/* 24/7 — protagonist badge */}
          <div className="relative mt-3 flex items-center gap-3 flex-wrap">
            <motion.span
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="relative inline-flex items-baseline px-4 sm:px-5 py-1 rounded-2xl"
              style={{
                background: 'linear-gradient(180deg, rgba(96,165,250,0.18), rgba(59,130,246,0.08))',
                border: '1px solid rgba(96,165,250,0.45)',
                boxShadow: '0 14px 50px -10px rgba(59,130,246,0.7), 0 0 0 1px rgba(96,165,250,0.2), inset 0 1px 0 rgba(255,255,255,0.12)',
              }}
            >
              <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-300/80 to-transparent" />
              <motion.span
                className="font-black tabular-nums text-[60px] sm:text-[80px] lg:text-[96px] leading-none"
                style={{
                  letterSpacing: '-0.06em',
                  background: 'linear-gradient(180deg, #93C5FD 0%, #3B82F6 60%, #1D4ED8 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  filter: 'drop-shadow(0 0 24px rgba(59,130,246,0.6))',
                }}
                animate={{ filter: ['drop-shadow(0 0 24px rgba(59,130,246,0.6))', 'drop-shadow(0 0 36px rgba(96,165,250,0.85))', 'drop-shadow(0 0 24px rgba(59,130,246,0.6))'] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              >
                24/7
              </motion.span>
            </motion.span>
            <div className="flex flex-col">
              <span className="text-[11px] uppercase font-bold text-blue-300/85" style={{ letterSpacing: '0.22em' }}>
                Sin pausas
              </span>
              <span className="text-[11px] uppercase font-bold text-white/40" style={{ letterSpacing: '0.22em' }}>
                Sin fines de semana
              </span>
            </div>
          </div>

          <p
            className="mt-5 text-[16px] sm:text-[17.5px] text-white/70 leading-relaxed max-w-xl"
            style={{ letterSpacing: '-0.005em' }}
          >
            Automatiza respuestas, seguimiento y ventas con AGENTE NÜRO. Inteligencia
            artificial conectada a WhatsApp, Messenger y tu tienda virtual.
          </p>

          {/* CTAs */}
          <div className="mt-8 flex flex-col sm:flex-row gap-3 flex-wrap">
            <motion.div whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.96 }}>
              <Link
                href="/login"
                className="relative group/cta inline-flex items-center justify-center gap-2.5 h-14 px-8 rounded-2xl text-white font-bold overflow-hidden w-full sm:w-auto"
                style={{
                  background: 'linear-gradient(180deg, #60A5FA 0%, #3B82F6 50%, #2563EB 100%)',
                  boxShadow: '0 14px 40px -8px rgba(59,130,246,0.85), 0 0 0 1px rgba(96,165,250,0.4), 0 0 0 6px rgba(59,130,246,0.12), inset 0 1px 0 rgba(255,255,255,0.32)',
                  fontSize: '13.5px',
                  letterSpacing: '0.16em',
                }}
              >
                <span className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/35 to-transparent -translate-x-full group-hover/cta:translate-x-full transition-transform duration-1000" />
                <motion.span
                  className="relative inline-flex items-center gap-2.5"
                  animate={{ x: [0, 1, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                >
                  INICIAR SESIÓN
                  <ArrowRight className="w-4 h-4" />
                </motion.span>
              </Link>
            </motion.div>

            <motion.div whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.96 }}>
              <Link
                href="/register"
                className="relative group/reg inline-flex items-center justify-center gap-2.5 h-14 px-7 rounded-2xl text-white font-bold overflow-hidden w-full sm:w-auto transition-colors hover:bg-blue-500/15"
                style={{
                  background: 'rgba(59,130,246,0.10)',
                  border: '1px solid rgba(96,165,250,0.45)',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 6px 20px -8px rgba(59,130,246,0.4)',
                  fontSize: '13.5px',
                  letterSpacing: '0.16em',
                }}
              >
                <span className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-blue-300/20 to-transparent -translate-x-full group-hover/reg:translate-x-full transition-transform duration-700" />
                <motion.span
                  animate={{ rotate: [0, 12, 0, -12, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                  className="relative inline-flex"
                >
                  <Sparkles className="w-4 h-4" />
                </motion.span>
                <span className="relative">CREAR CUENTA</span>
              </Link>
            </motion.div>

            <motion.button
              whileHover={{ scale: 1.04, y: -2 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => onNav('video')}
              className="relative group/v inline-flex items-center justify-center gap-2.5 h-14 px-7 rounded-2xl text-white/85 font-bold hover:text-white transition-colors w-full sm:w-auto"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.12)',
                fontSize: '13.5px',
                letterSpacing: '0.16em',
              }}
            >
              <span className="relative w-7 h-7 rounded-full flex items-center justify-center"
                style={{
                  background: 'rgba(96,165,250,0.18)',
                  border: '1px solid rgba(96,165,250,0.45)',
                }}>
                <Play className="w-3 h-3 text-blue-200 ml-0.5" fill="currentColor" />
                <motion.span
                  className="absolute inset-0 rounded-full pointer-events-none"
                  style={{ border: '1px solid rgba(96,165,250,0.7)' }}
                  animate={{ scale: [1, 1.6], opacity: [0.7, 0] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
                />
              </span>
              VER VIDEO
            </motion.button>
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
const VIDEO_URL = '/nuro-demo.mp4'

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

        {/* Floating live indicators above the screen */}
        <div className="relative mt-10 flex justify-center gap-2 sm:gap-3 mb-4 flex-wrap z-20">
          {[
            { label: 'IA respondiendo',    color: '52,211,153',  delay: 0 },
            { label: 'Seguimiento activo', color: '96,165,250',  delay: 0.15 },
            { label: 'Venta detectada',    color: '167,139,250', delay: 0.3 },
          ].map(({ label, color, delay }) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-md"
              style={{
                background: `rgba(${color},0.10)`,
                border: `1px solid rgba(${color},0.35)`,
                boxShadow: `0 6px 20px -8px rgba(${color},0.55)`,
              }}
            >
              <span className="relative flex h-1.5 w-1.5">
                <motion.span
                  className="absolute inline-flex h-full w-full rounded-full"
                  style={{ background: `rgb(${color})` }}
                  animate={{ scale: [1, 2.5, 1], opacity: [0.7, 0, 0.7] }}
                  transition={{ duration: 1.8, repeat: Infinity, delay }}
                />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full"
                  style={{ background: `rgb(${color})`, boxShadow: `0 0 6px rgba(${color},0.9)` }} />
              </span>
              <span className="text-[10.5px] uppercase font-bold" style={{ color: `rgba(${color},0.95)`, letterSpacing: '0.14em' }}>
                {label}
              </span>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="relative rounded-3xl overflow-hidden backdrop-blur-2xl"
          style={{
            background: 'linear-gradient(180deg, rgba(11,21,42,0.7) 0%, rgba(8,15,32,0.85) 100%)',
            border: '1px solid rgba(59,130,246,0.3)',
            boxShadow: '0 30px 80px -20px rgba(59,130,246,0.55), inset 0 1px 0 rgba(255,255,255,0.05)',
          }}
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-400/60 to-transparent z-20" />

          {/* Futuristic corner brackets */}
          {[
            { pos: 'top-2 left-2',     rot: 0 },
            { pos: 'top-2 right-2',    rot: 90 },
            { pos: 'bottom-2 right-2', rot: 180 },
            { pos: 'bottom-2 left-2',  rot: 270 },
          ].map((c, i) => (
            <div key={i} className={`pointer-events-none absolute ${c.pos} z-20`}
              style={{ transform: `rotate(${c.rot}deg)` }}>
              <svg width="28" height="28" viewBox="0 0 28 28">
                <path d="M 2 14 L 2 2 L 14 2" fill="none" stroke="rgba(96,165,250,0.9)" strokeWidth="1.5" strokeLinecap="round"
                  style={{ filter: 'drop-shadow(0 0 4px rgba(96,165,250,0.85))' }} />
              </svg>
            </div>
          ))}

          {/* Animated border accent (light bar that glides along top) */}
          <motion.div
            className="pointer-events-none absolute top-0 h-[2px] z-20"
            style={{
              width: '30%',
              background: 'linear-gradient(90deg, transparent, rgba(96,165,250,1), transparent)',
              boxShadow: '0 0 10px rgba(96,165,250,0.8)',
            }}
            animate={{ x: ['-30%', '430%'] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
          />

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
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.94 }}
                    animate={{ scale: [1, 1.04, 1] }}
                    transition={{ scale: { duration: 1.8, repeat: Infinity, ease: 'easeInOut' } }}
                    className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center"
                    style={{
                      background: 'linear-gradient(180deg, #60A5FA 0%, #3B82F6 50%, #2563EB 100%)',
                      boxShadow: '0 22px 60px -10px rgba(59,130,246,1), 0 0 0 10px rgba(59,130,246,0.18), 0 0 0 1px rgba(96,165,250,0.5), inset 0 2px 0 rgba(255,255,255,0.4)',
                    }}
                  >
                    <Play className="w-8 h-8 sm:w-10 sm:h-10 text-white relative" style={{ marginLeft: 4, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }} strokeWidth={2.2} fill="white" />
                    {/* Outer ripples (3 staggered) */}
                    {[0, 0.6, 1.2].map((delay, i) => (
                      <motion.span
                        key={i}
                        className="absolute inset-0 rounded-full pointer-events-none"
                        style={{ border: '2px solid rgba(96,165,250,0.7)' }}
                        animate={{ scale: [1, 1.9], opacity: [0.85, 0] }}
                        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut', delay }}
                      />
                    ))}
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
/* — Mini mockups inside service cards — */
function ChatMockup({ acc, accL }: { acc: string; accL: string }) {
  return (
    <div
      className="relative rounded-2xl overflow-hidden p-4"
      style={{
        background: 'linear-gradient(180deg, rgba(2,8,23,0.85), rgba(8,15,32,0.7))',
        border: `1px solid rgba(${acc},0.22)`,
        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.04), 0 6px 20px -10px rgba(${acc},0.4)`,
      }}
    >
      {/* Top bar */}
      <div className="flex items-center gap-2 pb-3 mb-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="w-6 h-6 rounded-full flex items-center justify-center"
          style={{ background: `linear-gradient(135deg, rgba(${accL},0.5), rgba(${acc},0.2))`, border: `1px solid rgba(${accL},0.5)` }}>
          <span className="text-[8px] font-bold text-white">N</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-bold text-white">Agente NÜRO</div>
          <div className="flex items-center gap-1 text-[8.5px] text-emerald-300">
            <span className="relative flex h-1 w-1">
              <motion.span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400"
                animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.6, repeat: Infinity }} />
              <span className="relative inline-flex h-1 w-1 rounded-full bg-emerald-400" />
            </span>
            En línea
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="space-y-2">
        <motion.div
          initial={{ opacity: 0, x: -8 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="max-w-[75%] rounded-xl rounded-tl-sm px-3 py-2 text-[11px] text-white/90"
          style={{ background: 'rgba(255,255,255,0.06)' }}
        >
          Hola, ¿tienen el producto disponible?
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 8 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="ml-auto max-w-[80%] rounded-xl rounded-tr-sm px-3 py-2 text-[11px] text-white"
          style={{ background: `linear-gradient(135deg, rgba(${accL},0.35), rgba(${acc},0.2))`, border: `1px solid rgba(${accL},0.4)` }}
        >
          ¡Hola! Sí, tenemos stock. ¿Lo quieres con envío hoy mismo?
        </motion.div>
        <div className="flex items-center gap-1.5 mt-1">
          <motion.span className="w-1.5 h-1.5 rounded-full bg-white/40"
            animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.2, repeat: Infinity, delay: 0 }} />
          <motion.span className="w-1.5 h-1.5 rounded-full bg-white/40"
            animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.2, repeat: Infinity, delay: 0.2 }} />
          <motion.span className="w-1.5 h-1.5 rounded-full bg-white/40"
            animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.2, repeat: Infinity, delay: 0.4 }} />
          <span className="text-[9px] text-white/40 ml-1">cliente escribiendo</span>
        </div>
      </div>
    </div>
  )
}

function OrderMockup({ acc, accL }: { acc: string; accL: string }) {
  return (
    <div
      className="relative rounded-2xl overflow-hidden p-4"
      style={{
        background: 'linear-gradient(180deg, rgba(2,8,23,0.85), rgba(8,15,32,0.7))',
        border: `1px solid rgba(${acc},0.22)`,
        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.04), 0 6px 20px -10px rgba(${acc},0.4)`,
      }}
    >
      {/* Header pill */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full"
          style={{ background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.4)' }}>
          <Check className="w-2.5 h-2.5 text-emerald-300" strokeWidth={3.5} />
          <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-emerald-200">Pedido confirmado</span>
        </div>
        <span className="text-[9.5px] text-white/40 font-mono">#A-1287</span>
      </div>

      {/* Product row */}
      <div className="flex items-center gap-3 mb-3 pb-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="w-11 h-11 rounded-lg flex items-center justify-center shrink-0"
          style={{
            background: `linear-gradient(135deg, rgba(${accL},0.4), rgba(${acc},0.15))`,
            border: `1px solid rgba(${accL},0.45)`,
          }}>
          <ShoppingBag className="w-5 h-5" style={{ color: `rgb(${accL})` }} strokeWidth={1.7} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11.5px] font-semibold text-white truncate">Auriculares NÜRO Pro</div>
          <div className="text-[10px] text-white/50 mt-0.5">Cantidad · 1 unidad</div>
        </div>
        <div className="text-[13px] font-bold text-white tabular-nums">$129</div>
      </div>

      {/* Summary */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-white/50">Envío</span>
          <span className="text-white/80 tabular-nums">$8</span>
        </div>
        <div className="flex items-center justify-between text-[11.5px] pt-1">
          <span className="font-bold text-white/90">Total</span>
          <motion.span
            className="font-bold tabular-nums"
            style={{ color: `rgb(${accL})`, filter: `drop-shadow(0 0 6px rgba(${acc},0.55))` }}
            animate={{ opacity: [0.85, 1, 0.85] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            $137
          </motion.span>
        </div>
      </div>
    </div>
  )
}

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

                {/* Mini mockup at the bottom of each card */}
                <div className="relative mt-7">
                  {s.id === 'agentes' ? <ChatMockup acc={s.acc} accL={s.accL} /> : <OrderMockup acc={s.acc} accL={s.accL} />}
                </div>

                {/* Animated bottom accent line */}
                <motion.div
                  className="pointer-events-none absolute inset-x-7 bottom-0 h-px"
                  style={{ background: `linear-gradient(90deg, transparent, rgba(${s.accL},0.7), transparent)` }}
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: idx * 0.5 }}
                />
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
    <section className="relative py-14 sm:py-18">
      <div className="max-w-6xl mx-auto px-5 sm:px-6">
        <SectionHeader
          eyebrow="CÓMO FUNCIONA"
          title="Activa tu Agente IA en 3 pasos"
        />

        <div className="relative mt-10">
          {/* Energy connection line (desktop only) — pulse traveling left to right */}
          <div className="hidden lg:block absolute top-[42px] left-[16%] right-[16%] h-[2px] overflow-hidden rounded-full"
            style={{ background: 'linear-gradient(90deg, rgba(59,130,246,0.08), rgba(96,165,250,0.32), rgba(59,130,246,0.08))' }}>
            <motion.span
              className="absolute top-0 left-0 h-full w-[35%] rounded-full"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(96,165,250,1), rgba(34,211,238,1), transparent)',
                boxShadow: '0 0 14px rgba(96,165,250,0.95), 0 0 22px rgba(96,165,250,0.55)',
              }}
              animate={{ x: ['-35%', '300%'] }}
              transition={{ duration: 3.6, repeat: Infinity, ease: 'linear' }}
            />
          </div>

          <div className="grid lg:grid-cols-3 gap-5 lg:gap-8 relative">
            {steps.map((s, idx) => {
              const Icon = s.icon
              return (
                <motion.div
                  key={s.n}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.5, delay: idx * 0.12, ease: [0.22, 1, 0.36, 1] }}
                  className="relative text-center px-2"
                >
                  {/* Icon + number badge with orbital ring */}
                  <div className="relative inline-block mb-5">
                    {/* Outer rotating ring */}
                    <motion.div
                      className="absolute -inset-2 rounded-full pointer-events-none"
                      style={{ border: '1px dashed rgba(96,165,250,0.3)' }}
                      animate={{ rotate: 360 }}
                      transition={{ duration: 24 + idx * 4, repeat: Infinity, ease: 'linear' }}
                    >
                      <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-blue-300"
                        style={{ boxShadow: '0 0 8px rgba(96,165,250,1)' }} />
                    </motion.div>
                    {/* Breathing halo */}
                    <motion.span
                      className="absolute -inset-4 rounded-full pointer-events-none"
                      style={{ background: 'radial-gradient(circle, rgba(96,165,250,0.45), transparent 60%)', filter: 'blur(12px)' }}
                      animate={{ opacity: [0.55, 0.95, 0.55], scale: [1, 1.1, 1] }}
                      transition={{ duration: 3.6, repeat: Infinity, ease: 'easeInOut', delay: idx * 0.4 }}
                    />
                    <div
                      className="relative w-[72px] h-[72px] rounded-2xl flex items-center justify-center mx-auto"
                      style={{
                        background: 'linear-gradient(135deg, rgba(96,165,250,0.32), rgba(59,130,246,0.08))',
                        border: '1px solid rgba(96,165,250,0.5)',
                        boxShadow: '0 0 32px -4px rgba(59,130,246,0.65), inset 0 1px 0 rgba(255,255,255,0.16), inset 0 -1px 0 rgba(59,130,246,0.3)',
                      }}
                    >
                      <span className="absolute inset-x-1 top-0.5 h-1/2 rounded-t-xl pointer-events-none"
                        style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.2), transparent)' }} />
                      <Icon className="relative w-8 h-8 text-blue-100" strokeWidth={1.6}
                        style={{ filter: 'drop-shadow(0 0 8px rgba(96,165,250,0.85))' }} />
                    </div>
                    <span className="absolute -top-1 -right-1 text-[10px] font-bold tracking-[0.14em] px-2 py-0.5 rounded-full text-blue-100 z-10"
                      style={{
                        background: 'linear-gradient(135deg, rgba(96,165,250,0.4), rgba(59,130,246,0.2))',
                        border: '1px solid rgba(96,165,250,0.6)',
                        boxShadow: '0 0 10px rgba(59,130,246,0.55)',
                      }}>
                      {s.n}
                    </span>
                  </div>

                  <h3 className="text-[18px] sm:text-[20px] font-bold text-white leading-[1.15] mb-2"
                    style={{ letterSpacing: '-0.025em' }}>
                    {s.title}
                  </h3>
                  <p className="text-[13.5px] text-white/65 leading-relaxed max-w-xs mx-auto"
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
    <section className="relative py-16 sm:py-22">
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
            boxShadow: '0 32px 90px -20px rgba(59,130,246,0.7), inset 0 1px 0 rgba(255,255,255,0.06)',
          }}
        >
          {/* Cinematic ambient layers */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-400/70 to-transparent" />
          <div className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 w-[420px] h-[220px] bg-blue-500/[0.32] blur-[100px]" />
          <div className="pointer-events-none absolute -bottom-24 left-1/2 -translate-x-1/2 w-[520px] h-[260px] bg-cyan-500/[0.2] blur-[120px]" />

          {/* Inner neural network */}
          <div className="pointer-events-none absolute inset-0 opacity-60">
            <NeuralBackdrop />
          </div>

          {/* Drifting energy particles inside the CTA */}
          {[...Array(10)].map((_, i) => (
            <motion.span
              key={i}
              className="pointer-events-none absolute rounded-full"
              style={{
                left: `${10 + (i * 9) % 80}%`,
                top: `${15 + (i * 13) % 70}%`,
                width: i % 3 === 0 ? '3px' : '2px',
                height: i % 3 === 0 ? '3px' : '2px',
                background: 'rgba(96,165,250,1)',
                boxShadow: '0 0 8px rgba(96,165,250,1)',
              }}
              animate={{ y: [0, -28, 8, 0], opacity: [0.2, 0.95, 0.4, 0.2] }}
              transition={{ duration: 6 + i * 0.7, repeat: Infinity, ease: 'easeInOut', delay: i * 0.3 }}
            />
          ))}

          <span
            className="inline-flex items-center gap-2 text-[10.5px] uppercase font-bold text-blue-200 mb-5 px-3 py-1.5 rounded-full relative"
            style={{
              letterSpacing: '0.22em',
              background: 'rgba(59,130,246,0.16)',
              border: '1px solid rgba(96,165,250,0.45)',
              boxShadow: '0 0 14px rgba(59,130,246,0.4)',
            }}
          >
            <Shield className="w-3 h-3" />
            Activación gratis
          </span>

          <h2
            className="relative font-bold leading-[1.04] text-[32px] sm:text-[42px] lg:text-[50px] mb-5"
            style={{
              letterSpacing: '-0.035em',
              background: 'linear-gradient(180deg, #FFFFFF 0%, #C8DBFF 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Tu negocio puede vender incluso mientras{' '}
            <span style={{
              background: 'linear-gradient(180deg, #60A5FA, #2563EB)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>duermes</span>
          </h2>

          <p className="relative text-[15px] sm:text-[17px] text-white/70 leading-relaxed max-w-xl mx-auto mb-8"
            style={{ letterSpacing: '-0.005em' }}>
            Activa AGENTE NÜRO y convierte conversaciones en ventas.
          </p>

          <div className="relative flex items-center justify-center">
            <motion.div
              whileHover={{ scale: 1.05, y: -3 }}
              whileTap={{ scale: 0.96 }}
              animate={{ y: [0, -3, 0] }}
              transition={{ y: { duration: 3.2, repeat: Infinity, ease: 'easeInOut' } }}
            >
              <Link
                href="/login"
                className="relative group/cta inline-flex items-center justify-center gap-3 h-16 px-12 rounded-2xl text-white font-bold overflow-hidden"
                style={{
                  background: 'linear-gradient(180deg, #60A5FA 0%, #3B82F6 50%, #2563EB 100%)',
                  boxShadow: '0 26px 60px -8px rgba(59,130,246,1), 0 0 0 1px rgba(96,165,250,0.55), 0 0 0 10px rgba(59,130,246,0.18), inset 0 2px 0 rgba(255,255,255,0.35)',
                  fontSize: '14px',
                  letterSpacing: '0.2em',
                }}
              >
                <span className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/35 to-transparent -translate-x-full group-hover/cta:translate-x-full transition-transform duration-1000" />
                <motion.span
                  animate={{ rotate: [0, 12, -12, 0], scale: [1, 1.15, 1] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  className="relative"
                >
                  <Sparkles className="w-5 h-5" strokeWidth={2.2} />
                </motion.span>
                <span className="relative">INICIAR SESIÓN</span>
                <motion.span
                  animate={{ x: [0, 4, 0] }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                  className="relative inline-flex"
                >
                  <ArrowRight className="w-4 h-4" />
                </motion.span>
              </Link>
            </motion.div>
          </div>

          <p className="relative text-[11px] text-white/45 mt-5"
            style={{ letterSpacing: '0.1em' }}>
            ¿Sin cuenta?{' '}
            <Link href="/register" className="text-blue-300 font-semibold hover:text-blue-200 transition-colors">
              Regístrate gratis
            </Link>
            {' '}en 30 segundos.
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
