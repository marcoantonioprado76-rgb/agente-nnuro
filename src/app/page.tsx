'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  Bot,
  MessageSquare,
  ShoppingBag,
  Zap,
  Clock,
  Shield,
  Sparkles,
  ArrowRight,
  Check,
  Star,
  Smartphone,
  Brain,
  Send,
  TrendingUp,
  Menu,
  X,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  DollarSign,
  Users,
  AlertTriangle,
  Timer,
  Award,
  Lock,
} from 'lucide-react'
import { NuroSmile } from '@/components/shared/nuro-logo'

// ── Hooks ──────────────────────────────────────────────────

function useReveal() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { el.classList.add('revealed'); obs.unobserve(el) } },
      { threshold: 0.1, rootMargin: '0px 0px -30px 0px' }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return ref
}

// ── Neural Network Background ───────────────────────────────

interface NNode {
  x: number; y: number
  vx: number; vy: number; r: number
  layer: number; pulse: number; pulseSpd: number
  hue: number; isHub: boolean
}

interface DataPulse {
  fromIdx: number; toIdx: number; progress: number; speed: number; hue: number
}

function NeuralNetworkBG() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mouse = useRef({ x: -9999, y: -9999 })

  useEffect(() => {
    const c = canvasRef.current
    if (!c) return
    const ctx = c.getContext('2d')
    if (!ctx) return

    let raf: number, W = 0, H = 0
    const mobile = innerWidth < 768
    const PAL = [[79,124,255],[124,58,237],[86,204,242],[99,102,241],[167,139,250]]
    const N_COUNT = mobile ? 30 : 120
    const LINK_DIST = mobile ? 110 : 180
    const MOUSE_R = 240
    const nodes: NNode[] = []
    const pulses: DataPulse[] = []

    let lastW = 0, lastH = 0
    function resize(force?: boolean) {
      const dpr = Math.min(devicePixelRatio || 1, 2)
      const newW = innerWidth
      const newH = document.documentElement.scrollHeight
      // On mobile, only resize if width changed (height fluctuates from URL bar)
      if (!force && mobile && newW === lastW && Math.abs(newH - lastH) < 200) return
      // On desktop, skip if nothing changed
      if (!force && !mobile && newW === lastW && newH === lastH) return
      lastW = newW; lastH = newH
      W = newW; H = newH
      c!.width = W * dpr; c!.height = H * dpr
      c!.style.width = W + 'px'; c!.style.height = H + 'px'
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    function spawn() {
      nodes.length = 0; pulses.length = 0
      for (let i = 0; i < N_COUNT; i++) {
        const layer = i < N_COUNT * 0.25 ? 0 : i < N_COUNT * 0.65 ? 1 : 2
        const spd = [0.08, 0.16, 0.26][layer]
        const isHub = Math.random() < (layer === 2 ? 0.25 : 0.08)
        nodes.push({
          x: Math.random() * W, y: Math.random() * H,
          vx: (Math.random() - 0.5) * spd, vy: (Math.random() - 0.5) * spd,
          r: isHub ? [2.5, 4, 5.5][layer] : [1, 2, 3][layer] + Math.random(),
          layer, pulse: Math.random() * Math.PI * 2,
          pulseSpd: 0.006 + Math.random() * 0.012,
          hue: Math.floor(Math.random() * PAL.length), isHub,
        })
      }
    }

    let pTimer = 0
    function maybeSpawnPulse() {
      pTimer++
      if (pTimer % (mobile ? 120 : 35) !== 0) return
      if (pulses.length > (mobile ? 4 : 20)) return
      const a = Math.floor(Math.random() * nodes.length)
      for (let j = 0; j < nodes.length; j++) {
        if (j === a) continue
        const dx = nodes[a].x - nodes[j].x, dy = nodes[a].y - nodes[j].y
        if (Math.sqrt(dx * dx + dy * dy) < LINK_DIST) {
          pulses.push({ fromIdx: a, toIdx: j, progress: 0, speed: 0.008 + Math.random() * 0.014, hue: nodes[a].hue })
          break
        }
      }
    }

    function onMouse(e: MouseEvent) { mouse.current.x = e.clientX; mouse.current.y = e.clientY + scrollY }

    function draw() {
      ctx!.clearRect(0, 0, W, H)
      const mx = mouse.current.x, my = mouse.current.y
      const sY = scrollY, vT = sY - 200, vB = sY + innerHeight + 200
      const time = Date.now() * 0.001

      for (const n of nodes) {
        n.x += n.vx; n.y += n.vy; n.pulse += n.pulseSpd
        if (n.x < -30) n.x = W + 30; if (n.x > W + 30) n.x = -30
        if (n.y < -30) n.y = H + 30; if (n.y > H + 30) n.y = -30
        const dmx = n.x - mx, dmy = n.y - my
        const dm = Math.sqrt(dmx * dmx + dmy * dmy)
        if (dm < MOUSE_R && dm > 1) {
          const f = (1 - dm / MOUSE_R) * 0.12 * (n.isHub ? 0.5 : 1)
          n.vx += (dmx / dm) * f; n.vy += (dmy / dm) * f
        }
        const sMax = [0.12, 0.2, 0.35][n.layer]
        const s = Math.sqrt(n.vx * n.vx + n.vy * n.vy)
        if (s > sMax) { n.vx *= 0.97; n.vy *= 0.97 }
      }

      // Connections
      ctx!.lineCap = 'round'
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i]
        if (a.y < vT || a.y > vB) continue
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j]
          if (b.y < vT || b.y > vB) continue
          if (Math.abs(a.layer - b.layer) > 1) continue
          const dx = a.x - b.x, dy = a.y - b.y
          const d = Math.sqrt(dx * dx + dy * dy)
          if (d > LINK_DIST) continue
          const t2 = 1 - d / LINK_DIST
          const minL = Math.min(a.layer, b.layer)
          const bA = t2 * [0.04, 0.07, 0.12][minL]
          const mX = (a.x + b.x) / 2, mY = (a.y + b.y) / 2
          const dM = Math.sqrt((mX - mx) ** 2 + (mY - my) ** 2)
          const mB = dM < MOUSE_R ? (1 - dM / MOUSE_R) * 0.18 : 0
          const fA = Math.min(bA + mB, 0.3)
          const hub = (a.isHub || b.isHub) ? 1.5 : 1
          const col = PAL[a.hue]
          ctx!.beginPath(); ctx!.moveTo(a.x, a.y); ctx!.lineTo(b.x, b.y)
          ctx!.strokeStyle = `rgba(${col[0]},${col[1]},${col[2]},${fA * hub})`
          ctx!.lineWidth = t2 * [0.4, 0.7, 1.2][minL] * hub; ctx!.stroke()
        }
      }

      // Data pulses
      maybeSpawnPulse()
      for (let i = pulses.length - 1; i >= 0; i--) {
        const p = pulses[i]; p.progress += p.speed
        if (p.progress >= 1) { pulses.splice(i, 1); continue }
        const from = nodes[p.fromIdx], to = nodes[p.toIdx]
        if (!from || !to) { pulses.splice(i, 1); continue }
        const px = from.x + (to.x - from.x) * p.progress
        const py = from.y + (to.y - from.y) * p.progress
        if (py < vT || py > vB) continue
        const col = PAL[p.hue]
        const a = Math.sin(p.progress * Math.PI) * 0.8
        const g = ctx!.createRadialGradient(px, py, 0, px, py, 8)
        g.addColorStop(0, `rgba(${col[0]},${col[1]},${col[2]},${a * 0.5})`); g.addColorStop(1, `rgba(${col[0]},${col[1]},${col[2]},0)`)
        ctx!.beginPath(); ctx!.arc(px, py, 8, 0, Math.PI * 2); ctx!.fillStyle = g; ctx!.fill()
        ctx!.beginPath(); ctx!.arc(px, py, 1.8, 0, Math.PI * 2)
        ctx!.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},${a})`; ctx!.fill()
      }

      // Nodes
      for (const n of nodes) {
        if (n.y < vT || n.y > vB) continue
        const col = PAL[n.hue]
        const glow = (Math.sin(n.pulse) + 1) / 2
        const dm2x = n.x - mx, dm2y = n.y - my
        const dm2 = Math.sqrt(dm2x * dm2x + dm2y * dm2y)
        const mGlow = dm2 < MOUSE_R ? (1 - dm2 / MOUSE_R) : 0

        if (n.isHub || n.layer === 2) {
          const gr = n.r * (3.5 + glow * 2.5 + mGlow * 3)
          const gg = ctx!.createRadialGradient(n.x, n.y, 0, n.x, n.y, gr)
          const ga = (n.isHub ? 0.1 : 0.05) + mGlow * 0.15 + glow * 0.04
          gg.addColorStop(0, `rgba(${col[0]},${col[1]},${col[2]},${ga})`)
          gg.addColorStop(0.5, `rgba(${col[0]},${col[1]},${col[2]},${ga * 0.3})`)
          gg.addColorStop(1, `rgba(${col[0]},${col[1]},${col[2]},0)`)
          ctx!.beginPath(); ctx!.arc(n.x, n.y, gr, 0, Math.PI * 2); ctx!.fillStyle = gg; ctx!.fill()
        }

        const na = [0.1, 0.2, 0.35][n.layer] + glow * 0.15 + mGlow * 0.4
        ctx!.beginPath(); ctx!.arc(n.x, n.y, n.r, 0, Math.PI * 2)
        ctx!.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},${na * (n.isHub ? 1.5 : 1)})`; ctx!.fill()

        if (n.isHub) {
          ctx!.beginPath(); ctx!.arc(n.x, n.y, n.r * 0.4, 0, Math.PI * 2)
          ctx!.fillStyle = `rgba(255,255,255,${0.2 + glow * 0.2 + mGlow * 0.25})`; ctx!.fill()
        }
      }

      // Ambient particles
      const ambientCount = mobile ? 12 : 35
      for (let i = 0; i < ambientCount; i++) {
        const speed = 0.0002 + (i % 3) * 0.00008
        const px = ((Math.sin(time * speed * 1000 + i * 2.1) + 1) / 2) * W
        const py = ((Math.cos(time * speed * 700 + i * 1.7) + 1) / 2) * H
        if (py < vT || py > vB) continue
        const pa = 0.04 + Math.sin(time * 1.5 + i * 0.8) * 0.03
        const pr = 0.6 + (i % 3) * 0.4
        const pc = PAL[i % PAL.length]
        ctx!.beginPath(); ctx!.arc(px, py, pr, 0, Math.PI * 2)
        ctx!.fillStyle = `rgba(${pc[0]},${pc[1]},${pc[2]},${pa})`; ctx!.fill()
      }

      raf = requestAnimationFrame(draw)
    }

    resize(true); spawn(); draw()
    let resizeTimer: ReturnType<typeof setTimeout>
    const onResize = () => {
      clearTimeout(resizeTimer)
      resizeTimer = setTimeout(() => {
        const prevW = W
        resize()
        // Only regenerate nodes if width actually changed
        if (W !== prevW) spawn()
      }, mobile ? 300 : 100)
    }
    addEventListener('resize', onResize)
    addEventListener('mousemove', onMouse, { passive: true })
    // On mobile, skip ResizeObserver entirely — URL bar causes constant triggers
    let ro: ResizeObserver | null = null
    if (!mobile) {
      ro = new ResizeObserver(() => resize())
      ro.observe(document.body)
    }
    return () => { cancelAnimationFrame(raf); clearTimeout(resizeTimer); removeEventListener('resize', onResize); removeEventListener('mousemove', onMouse); ro?.disconnect() }
  }, [])

  return (
    <>
      {/* L1: Dark gradient base */}
      <div className="fixed inset-0 z-0 pointer-events-none" style={{
        background: 'linear-gradient(160deg, #0B1120 0%, #0F172A 20%, #131B2E 40%, #111827 60%, #0E1525 80%, #0B1120 100%)',
      }} />
      {/* L2: Color accent blobs — hidden on mobile for performance */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden hidden md:block">
        <div className="absolute -top-40 right-[10%] w-[900px] h-[900px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(79,124,255,0.08), transparent 60%)', filter: 'blur(60px)' }} />
        <div className="absolute top-[30%] -left-40 w-[700px] h-[700px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.07), transparent 60%)', filter: 'blur(60px)' }} />
        <div className="absolute top-[55%] right-[5%] w-[600px] h-[600px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(86,204,242,0.06), transparent 60%)', filter: 'blur(60px)' }} />
        <div className="absolute bottom-[10%] left-[20%] w-[800px] h-[800px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.06), transparent 60%)', filter: 'blur(60px)' }} />
      </div>
      {/* L3: Canvas */}
      <canvas ref={canvasRef} className="absolute top-0 left-0 z-0 pointer-events-none" />
    </>
  )
}

// ── AI Orb (Hero) ───────────────────────────────────────────

function AIOrb() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = canvasRef.current
    if (!c) return
    const ctx = c.getContext('2d')
    if (!ctx) return
    const SIZE = 320, dpr = Math.min(devicePixelRatio || 1, 2)
    c.width = SIZE * dpr; c.height = SIZE * dpr
    c.style.width = SIZE + 'px'; c.style.height = SIZE + 'px'
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    const cx = SIZE / 2, cy = SIZE / 2, R = 90
    const PAL = [[79,124,255],[124,58,237],[86,204,242]]
    const orbitals: { a: number; s: number; d: number; r: number; h: number; p: number }[] = []
    for (let i = 0; i < 28; i++) {
      orbitals.push({ a: Math.random() * Math.PI * 2, s: (0.003 + Math.random() * 0.008) * (Math.random() > 0.5 ? 1 : -1), d: R + 18 + Math.random() * 45, r: 0.8 + Math.random() * 1.8, h: Math.floor(Math.random() * 3), p: Math.random() * Math.PI * 2 })
    }
    let raf: number

    function render() {
      ctx!.clearRect(0, 0, SIZE, SIZE)
      const t = Date.now() * 0.001, breath = (Math.sin(t * 0.8) + 1) / 2

      // Outer halo
      const hR = R + 60 + breath * 20
      const hg = ctx!.createRadialGradient(cx, cy, R * 0.3, cx, cy, hR)
      hg.addColorStop(0, `rgba(79,124,255,${0.06 + breath * 0.05})`)
      hg.addColorStop(0.35, `rgba(124,58,237,${0.04 + breath * 0.03})`)
      hg.addColorStop(0.65, `rgba(86,204,242,${0.025 + breath * 0.02})`)
      hg.addColorStop(1, 'rgba(86,204,242,0)')
      ctx!.beginPath(); ctx!.arc(cx, cy, hR, 0, Math.PI * 2); ctx!.fillStyle = hg; ctx!.fill()

      // Energy rings
      for (let i = 0; i < 3; i++) {
        const rr = R + 12 + i * 20 + Math.sin(t * 0.5 + i * 2) * 6
        ctx!.beginPath(); ctx!.arc(cx, cy, rr, 0, Math.PI * 2)
        ctx!.strokeStyle = `rgba(${PAL[i][0]},${PAL[i][1]},${PAL[i][2]},${0.06 + breath * 0.05 - i * 0.015})`
        ctx!.lineWidth = 0.6; ctx!.stroke()
      }

      // Rotating arcs
      for (let i = 0; i < 5; i++) {
        const aa = t * (0.3 + i * 0.12) + i * (Math.PI / 2.5)
        const ar = R + 10 + i * 14
        ctx!.beginPath(); ctx!.arc(cx, cy, ar, aa, aa + Math.PI * (0.3 + Math.sin(t + i) * 0.1))
        const col = PAL[i % 3]
        ctx!.strokeStyle = `rgba(${col[0]},${col[1]},${col[2]},${0.12 + breath * 0.08})`
        ctx!.lineWidth = 1.8; ctx!.lineCap = 'round'; ctx!.stroke()
      }

      // Core sphere
      const cR = R + breath * 4
      const cg = ctx!.createRadialGradient(cx - R * 0.2, cy - R * 0.2, 0, cx, cy, cR)
      cg.addColorStop(0, `rgba(150,175,255,${0.18 + breath * 0.08})`)
      cg.addColorStop(0.3, `rgba(110,140,255,${0.12 + breath * 0.05})`)
      cg.addColorStop(0.6, `rgba(124,58,237,${0.08 + breath * 0.04})`)
      cg.addColorStop(1, `rgba(79,124,255,${0.03})`)
      ctx!.beginPath(); ctx!.arc(cx, cy, cR, 0, Math.PI * 2); ctx!.fillStyle = cg; ctx!.fill()

      // Inner shimmer
      const sx = cx + Math.cos(t * 0.4) * R * 0.3, sy = cy + Math.sin(t * 0.4) * R * 0.25
      const sg = ctx!.createRadialGradient(sx, sy, 0, sx, sy, R * 0.6)
      sg.addColorStop(0, `rgba(255,255,255,${0.08 + breath * 0.06})`); sg.addColorStop(1, 'rgba(255,255,255,0)')
      ctx!.beginPath(); ctx!.arc(sx, sy, R * 0.6, 0, Math.PI * 2); ctx!.fillStyle = sg; ctx!.fill()

      // Bright center
      const bg = ctx!.createRadialGradient(cx, cy, 0, cx, cy, R * 0.35)
      bg.addColorStop(0, `rgba(210,220,255,${0.22 + breath * 0.15})`); bg.addColorStop(0.5, `rgba(150,180,255,${0.08 + breath * 0.06})`); bg.addColorStop(1, 'rgba(79,124,255,0)')
      ctx!.beginPath(); ctx!.arc(cx, cy, R * 0.35, 0, Math.PI * 2); ctx!.fillStyle = bg; ctx!.fill()

      // Orbitals
      for (const o of orbitals) {
        o.a += o.s
        const ox = cx + Math.cos(o.a) * o.d, oy = cy + Math.sin(o.a) * (o.d * 0.72)
        const oa = (Math.sin(t * 2 + o.p) + 1) / 2 * 0.6 + 0.15
        const col = PAL[o.h]
        const pg = ctx!.createRadialGradient(ox, oy, 0, ox, oy, o.r * 5)
        pg.addColorStop(0, `rgba(${col[0]},${col[1]},${col[2]},${oa * 0.35})`); pg.addColorStop(1, `rgba(${col[0]},${col[1]},${col[2]},0)`)
        ctx!.beginPath(); ctx!.arc(ox, oy, o.r * 5, 0, Math.PI * 2); ctx!.fillStyle = pg; ctx!.fill()
        ctx!.beginPath(); ctx!.arc(ox, oy, o.r, 0, Math.PI * 2)
        ctx!.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},${oa})`; ctx!.fill()
      }

      raf = requestAnimationFrame(render)
    }
    render()
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 0 }}>
      <canvas ref={canvasRef} />
    </div>
  )
}

// ── Glass card helper ────────────────────────────────────────

const glass = {
  card: { background: 'rgba(15,23,42,0.55)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)', boxShadow: '0 4px 24px rgba(0,0,0,0.2)' },
  cardLight: { background: 'rgba(15,23,42,0.35)', border: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(8px)' },
}

// ── Main ───────────────────────────────────────────────────

export default function LandingPage() {
  const [menu, setMenu] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  return (
    <div className="min-h-screen text-white overflow-x-hidden relative" style={{ background: '#0B1120' }}>
      <NeuralNetworkBG />
      <div className="relative z-10">
        <Nav scrolled={scrolled} menu={menu} setMenu={setMenu} />
        <Hero />
        <VideoSection />
        <ChatSection />
        <ProblemSolution />
        <VirtualStoreSection />
        <Testimonials />
        <FinalCTA />
        <Footer />
      </div>
    </div>
  )
}

// ── Nav ────────────────────────────────────────────────────

function Nav({ scrolled, menu, setMenu }: { scrolled: boolean; menu: boolean; setMenu: (v: boolean) => void }) {
  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-[600ms] ${scrolled ? 'nav-scrolled' : ''}`}
      style={{
        background: scrolled
          ? 'linear-gradient(180deg, rgba(8,13,26,0.88) 0%, rgba(8,13,26,0.82) 100%)'
          : 'linear-gradient(180deg, rgba(8,13,26,0.4) 0%, transparent 100%)',
        backdropFilter: scrolled ? 'blur(28px) saturate(1.5)' : 'blur(8px)',
        borderBottom: scrolled ? '1px solid rgba(91,138,255,0.06)' : '1px solid transparent',
        boxShadow: scrolled ? '0 8px 32px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.02)' : 'none',
      }}
    >
      {/* Glow line at bottom */}
      <div className="nav-glow-line" />

      <div className="max-w-6xl mx-auto px-6 h-[72px] flex items-center justify-between">
        {/* Logo + Brand */}
        <Link href="/" className="flex items-center gap-3 group">
          {/* Logo with glow */}
          <div className="nav-logo-glow">
            <NuroSmile size={38} className="rounded-xl" />
          </div>

          {/* Brand name */}
          <div className="flex flex-col">
            <div className="flex items-baseline gap-1.5">
              <span className="text-[17px] font-extrabold tracking-tight nav-brand-text">
                Agente de
              </span>
              <span className="text-[17px] font-extrabold tracking-tight nav-accent-word">
                Ventas
              </span>
            </div>
            <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[#5B8AFF]/50 mt-[-1px]">
              Automatización con IA
            </span>
          </div>
        </Link>

        {/* Desktop buttons */}
        <div className="hidden md:flex items-center gap-4">
          <Link
            href="/login"
            className="nav-link-secondary text-[13px] font-medium px-4 py-2"
          >
            Iniciar sesion
          </Link>
          <Link
            href="/register"
            className="nav-cta-primary text-[13px] font-semibold text-white rounded-xl px-6 py-2.5"
          >
            Crear cuenta gratis
          </Link>
        </div>

        {/* Mobile toggle */}
        <button onClick={() => setMenu(!menu)} className="md:hidden text-gray-300 hover:text-white transition-colors">
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Mobile menu */}
      {menu && (
        <div
          className="md:hidden px-6 pb-5 pt-3 animate-fade-in-up"
          style={{
            background: 'linear-gradient(180deg, rgba(8,13,26,0.98), rgba(10,17,34,0.98))',
            backdropFilter: 'blur(28px)',
            borderTop: '1px solid rgba(91,138,255,0.06)',
          }}
        >
          <div className="flex gap-3">
            <Link
              href="/login"
              className="flex-1 text-center text-[13px] font-medium text-gray-300 rounded-xl py-3 transition-all duration-200 hover:text-white"
              style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}
            >
              Iniciar sesion
            </Link>
            <Link
              href="/register"
              className="nav-cta-primary flex-1 text-center text-[13px] font-semibold text-white rounded-xl py-3"
            >
              Crear cuenta gratis
            </Link>
          </div>
        </div>
      )}
    </nav>
  )
}

// ── S1: Hero ───────────────────────────────────────────────

function Hero() {
  const mockupRef = useRef<HTMLDivElement>(null)
  const [liveCount, setLiveCount] = useState(0)

  // Parallax tilt on mouse move
  useEffect(() => {
    const el = mockupRef.current
    if (!el || innerWidth < 1024) return
    function handleMove(e: MouseEvent) {
      const rect = el!.getBoundingClientRect()
      const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2
      const dx = (e.clientX - cx) / rect.width, dy = (e.clientY - cy) / rect.height
      el!.style.transform = `perspective(1200px) rotateY(${dx * 6}deg) rotateX(${-dy * 4}deg) scale(1.01)`
    }
    function handleLeave() { el!.style.transform = 'perspective(1200px) rotateY(0deg) rotateX(0deg) scale(1)' }
    addEventListener('mousemove', handleMove, { passive: true })
    el.addEventListener('mouseleave', handleLeave)
    return () => { removeEventListener('mousemove', handleMove); el.removeEventListener('mouseleave', handleLeave) }
  }, [])

  // Animated counter
  useEffect(() => {
    let n = 0; const target = 527
    const step = () => { n = Math.min(n + Math.ceil((target - n) / 12), target); setLiveCount(n); if (n < target) requestAnimationFrame(step) }
    const t = setTimeout(step, 800)
    return () => clearTimeout(t)
  }, [])

  return (
    <section className="relative pt-20 pb-8 md:pt-36 md:pb-28 overflow-hidden">
      {/* Hero-specific enhanced background layers — hidden on mobile */}
      <div className="absolute inset-0 pointer-events-none hidden md:block">
        <div className="absolute top-[25%] left-[20%] w-[700px] h-[700px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(79,124,255,0.15), rgba(124,58,237,0.08) 50%, transparent 70%)', filter: 'blur(40px)' }} />
        <div className="absolute top-[15%] right-[15%] w-[500px] h-[500px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.12), transparent 65%)', filter: 'blur(50px)' }} />
        <div className="absolute top-[40%] left-1/2 -translate-x-1/2 w-[400px] h-[400px] rounded-full hero-center-pulse" style={{ background: 'radial-gradient(circle, rgba(79,124,255,0.1), transparent 70%)' }} />
      </div>

      <div className="relative max-w-6xl mx-auto px-5 md:px-6">
        <div className="grid lg:grid-cols-2 gap-6 lg:gap-8 items-center">
          {/* Text */}
          <div className="hero-text-enter">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 rounded-full px-3 md:px-4 py-1.5 md:py-2 mb-3 md:mb-7" style={{ background: 'rgba(79,124,255,0.1)', border: '1px solid rgba(79,124,255,0.25)', boxShadow: '0 0 20px rgba(79,124,255,0.08)' }}>
              <div className="relative flex items-center justify-center">
                <div className="h-2 w-2 rounded-full bg-green-400" />
                <div className="absolute h-2 w-2 rounded-full bg-green-400 animate-ping" />
              </div>
              <span className="text-[11px] md:text-[12px] font-semibold text-[#6B9AFF]">Inteligencia Artificial para ventas</span>
              <Sparkles className="h-3 w-3 text-[#5B8AFF]" />
            </div>

            {/* Title */}
            <h1 className="text-[26px] sm:text-5xl lg:text-[56px] font-extrabold leading-[1.08] tracking-tight text-white mb-3 md:mb-6">
              Automatiza tus ventas con{' '}
              <span className="hero-gradient-text relative">
                inteligencia artificial
                <span className="hero-text-shine" />
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-[14px] md:text-[18px] text-gray-300 max-w-lg mb-5 md:mb-9 leading-relaxed">
              Responde, convence y vende <strong className="text-white font-semibold">automaticamente 24/7</strong> sin esfuerzo.
            </p>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row gap-2.5 md:gap-3 mb-5 md:mb-10">
              <Link href="/register" className="group hero-btn-primary relative flex items-center justify-center gap-2.5 rounded-2xl px-8 h-12 md:h-14 text-[14px] md:text-[15px] font-bold text-white overflow-hidden" style={{ background: 'linear-gradient(135deg, #5B8AFF, #7C3AED)' }}>
                <span className="relative z-10 flex items-center gap-2.5">
                  Crear cuenta gratis <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1.5" />
                </span>
                <div className="absolute inset-0 hero-btn-shimmer" />
              </Link>
              <Link href="/login" className="group flex items-center justify-center gap-2.5 rounded-2xl px-7 h-12 md:h-14 text-[14px] md:text-[15px] font-medium text-gray-300 transition-all duration-300 hover:text-white hover:border-white/25 hover:bg-white/[0.06]" style={{ border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.03)' }}>
                <div className="h-8 w-8 rounded-full flex items-center justify-center bg-white/[0.08] group-hover:bg-white/[0.12] transition-colors">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5 text-white ml-0.5"><polygon points="5,3 19,12 5,21" /></svg>
                </div>
                Ver demo en vivo
              </Link>
            </div>

            {/* Social proof */}
            <div className="flex items-center gap-5">
              <div className="flex -space-x-2.5">
                {[
                  { img: '/images/testimonials/t1.jpg', color: '#5B8AFF' },
                  { img: '/images/testimonials/t2.jpg', color: '#7C3AED' },
                  { img: '/images/testimonials/t4.jpg', color: '#10B981' },
                  { img: '/images/testimonials/t6.jpg', color: '#F59E0B' },
                  { img: '/images/testimonials/t7.jpg', color: '#EF4444' },
                ].map((a, i) => (
                  <div key={i} className="relative h-9 w-9 rounded-full" style={{ border: `2px solid ${a.color}`, boxShadow: `0 0 10px ${a.color}40`, zIndex: 5 - i }}>
                    <Image src={a.img} alt="" width={36} height={36} className="h-full w-full rounded-full object-cover" />
                  </div>
                ))}
              </div>
              <div>
                <div className="flex items-center gap-1 mb-0.5">
                  {[1,2,3,4,5].map(i => (
                    <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" style={{ animationDelay: `${i * 0.1}s` }} />
                  ))}
                  <span className="text-[11px] font-bold text-amber-400 ml-1">4.9</span>
                </div>
                <p className="text-[12px] text-gray-400">
                  <span className="text-white font-bold count-glow">+{liveCount}</span> negocios vendiendo con IA
                </p>
              </div>
            </div>
          </div>

          {/* Mockup + AI Orb */}
          <div className="relative hidden lg:block">
            {/* AI Orb behind mockup */}
            <AIOrb />
            <div ref={mockupRef} className="relative transition-transform duration-200 ease-out" style={{ transformStyle: 'preserve-3d' }}>
              <HeroMockup />
            </div>
          </div>
        </div>
      </div>

      {/* Section transition glow */}
      <div className="absolute bottom-0 left-0 right-0 h-16 md:h-32 pointer-events-none" style={{ background: 'linear-gradient(180deg, transparent, rgba(11,17,32,0.5))' }} />
      <div className="absolute -bottom-px left-0 right-0 section-divider" />
    </section>
  )
}

function HeroMockup() {
  const [metrics, setMetrics] = useState([
    { v: 0, target: 12450, l: 'Ingresos', c: '#10B981', ch: '+23%', bg: '#ECFDF5', prefix: '$' },
    { v: 0, target: 1247, l: 'Conversaciones', c: '#5B8AFF', ch: '+18%', bg: '#EFF6FF', prefix: '' },
    { v: 0, target: 342, l: 'Ventas', c: '#7C3AED', ch: '+34%', bg: '#F5F3FF', prefix: '' },
  ])
  const [chartAnim, setChartAnim] = useState(false)
  const [notifIdx, setNotifIdx] = useState(0)
  const [notifShow, setNotifShow] = useState(true)

  // Animate metrics counting up
  useEffect(() => {
    const timer = setTimeout(() => {
      let frame = 0
      const maxFrames = 40
      const anim = () => {
        frame++
        const progress = Math.min(frame / maxFrames, 1)
        const ease = 1 - Math.pow(1 - progress, 3) // easeOutCubic
        setMetrics(prev => prev.map(m => ({ ...m, v: Math.round(m.target * ease) })))
        if (frame < maxFrames) requestAnimationFrame(anim)
      }
      anim()
    }, 600)
    return () => clearTimeout(timer)
  }, [])

  // Animate chart bars
  useEffect(() => { const t = setTimeout(() => setChartAnim(true), 400); return () => clearTimeout(t) }, [])

  // Cycling floating notifications
  const notifs = [
    { icon: '💬', text: 'Nuevo cliente', sub: 'Maria pregunto por precios', color: '#5B8AFF', border: 'border-blue-200' },
    { icon: '💰', text: 'Venta confirmada', sub: '$149 USD — Pack Pro', color: '#10B981', border: 'border-green-200' },
    { icon: '🤖', text: 'Bot respondio en 2s', sub: 'Atencion automatica', color: '#7C3AED', border: 'border-violet-200' },
    { icon: '📈', text: '+12% conversiones', sub: 'vs semana anterior', color: '#F59E0B', border: 'border-amber-200' },
  ]

  useEffect(() => {
    const interval = setInterval(() => {
      setNotifShow(false)
      setTimeout(() => { setNotifIdx(p => (p + 1) % notifs.length); setNotifShow(true) }, 350)
    }, 3000)
    return () => clearInterval(interval)
  }, [notifs.length])

  const chartBars = [30, 50, 40, 65, 55, 80, 60, 90, 70, 85, 95, 75]

  return (
    <div className="relative">
      {/* Glow behind the card */}
      <div className="absolute -inset-8 rounded-3xl pointer-events-none" style={{ background: 'radial-gradient(ellipse at center, rgba(79,124,255,0.12), rgba(124,58,237,0.06) 50%, transparent 75%)', filter: 'blur(20px)' }} />

      {/* Main card — white/light */}
      <div className="relative rounded-2xl overflow-hidden bg-white border border-gray-200" style={{ boxShadow: '0 25px 80px rgba(0,0,0,0.3), 0 8px 20px rgba(79,124,255,0.08), 0 1px 3px rgba(0,0,0,0.08)' }}>
        <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-100">
          <div className="flex gap-1.5"><div className="h-2.5 w-2.5 rounded-full bg-red-400" /><div className="h-2.5 w-2.5 rounded-full bg-amber-400" /><div className="h-2.5 w-2.5 rounded-full bg-green-400" /></div>
          <div className="flex-1 flex justify-center">
            <div className="flex items-center gap-1.5 rounded-full px-2.5 py-0.5 bg-white border border-gray-100">
              <div className="h-1.5 w-1.5 rounded-full bg-green-400" />
              <span className="text-[9px] text-gray-400 font-medium">app.agentedeventas.com</span>
            </div>
          </div>
        </div>
        <div className="p-5 bg-white">
          {/* Animated Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
            {metrics.map(s => (
              <div key={s.l} className="rounded-xl p-3 transition-all duration-500" style={{ background: s.bg, border: '1px solid rgba(0,0,0,0.04)' }}>
                <p className="text-[9px] text-gray-400 font-medium">{s.l}</p>
                <p className="text-[15px] font-bold text-gray-900 mt-0.5 tabular-nums">{s.prefix}{s.v.toLocaleString()}</p>
                <p className="text-[9px] font-bold mt-0.5" style={{ color: s.c }}>{s.ch}</p>
              </div>
            ))}
          </div>
          {/* Animated Chart */}
          <div className="flex items-end gap-1.5 h-16 mb-4 px-1">
            {chartBars.map((h, i) => (
              <div key={i} className="flex-1 rounded-t-sm transition-all duration-700 ease-out" style={{
                height: chartAnim ? `${h}%` : '4%',
                transitionDelay: `${i * 60}ms`,
                background: i >= 10 ? 'linear-gradient(180deg, #5B8AFF, #7C3AED)' : `linear-gradient(180deg, rgba(79,124,255,${0.2 + i * 0.06}), rgba(124,58,237,${0.1 + i * 0.03}))`,
              }} />
            ))}
          </div>
          {/* Live activity */}
          <div className="space-y-2">
            {[
              { n: 'Maria Garcia', m: 'Compro Pack Premium', t: '2m', c: '#10B981' },
              { n: 'Juan Rodriguez', m: 'Pregunto por precios', t: '5m', c: '#5B8AFF' },
            ].map(r => (
              <div key={r.n} className="flex items-center gap-3 rounded-xl p-2.5 bg-gray-50 border border-gray-100">
                <div className="h-8 w-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ background: `linear-gradient(135deg, ${r.c}, ${r.c}dd)` }}>{r.n[0]}</div>
                <div className="flex-1"><p className="text-[11px] font-semibold text-gray-800">{r.n}</p><p className="text-[9px] text-gray-400">{r.m}</p></div>
                <span className="text-[9px] text-gray-300 font-medium">{r.t}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Floating notification — top right (cycles) */}
      <div
        className={`absolute -right-8 top-6 rounded-xl p-3 bg-white ${notifs[notifIdx].border} animate-float-slow`}
        style={{
          boxShadow: `0 8px 28px ${notifs[notifIdx].color}20, 0 2px 8px rgba(0,0,0,0.08)`,
          opacity: notifShow ? 1 : 0,
          transform: notifShow ? 'translateX(0) scale(1)' : 'translateX(20px) scale(0.95)',
          transition: 'all 0.35s cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        <div className="flex items-center gap-2.5">
          <span className="text-[16px]">{notifs[notifIdx].icon}</span>
          <div>
            <p className="text-[10px] font-semibold text-gray-800">{notifs[notifIdx].text}</p>
            <p className="text-[8px] text-gray-400">{notifs[notifIdx].sub}</p>
          </div>
        </div>
      </div>

      {/* Floating notification — bottom left */}
      <div className="absolute -left-8 bottom-10 rounded-xl p-3 bg-white border border-blue-200 animate-float-delayed" style={{ boxShadow: '0 8px 28px rgba(79,124,255,0.15), 0 2px 6px rgba(0,0,0,0.06)' }}>
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #5B8AFF, #7C3AED)' }}>
            <Bot className="h-3.5 w-3.5 text-white" />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-gray-800">Bot respondio 24 clientes</p>
            <p className="text-[8px] text-gray-400">Automaticamente — ahora</p>
          </div>
        </div>
      </div>

      {/* Mini live badge — bottom right */}
      <div className="absolute -right-4 bottom-28 rounded-full px-3 py-1.5 bg-white border border-green-200 animate-float-gentle" style={{ boxShadow: '0 4px 16px rgba(16,185,129,0.15)' }}>
        <div className="flex items-center gap-1.5">
          <div className="relative">
            <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
            <div className="absolute inset-0 h-1.5 w-1.5 rounded-full bg-green-500 animate-ping" />
          </div>
          <span className="text-[9px] font-bold text-green-600">En vivo</span>
        </div>
      </div>
    </div>
  )
}

// ── S2: Video Section (animated flow) ──────────────────────

function VideoSection() {
  const rev = useReveal()
  const steps = [
    { icon: MessageSquare, label: 'Cliente escribe', color: '#5B8AFF' },
    { icon: Bot, label: 'Bot responde', color: '#7C3AED' },
    { icon: ImageIcon, label: 'Muestra producto', color: '#F59E0B' },
    { icon: ShoppingBag, label: 'Cliente compra', color: '#10B981' },
    { icon: CheckCircle2, label: 'Venta cerrada', color: '#10B981' },
  ]

  return (
    <section className="py-4 md:py-20">
      <div ref={rev} className="scroll-reveal max-w-4xl mx-auto px-5 md:px-6 text-center">
        <span className="inline-flex items-center gap-2 rounded-full px-3.5 py-1 text-[11px] font-semibold uppercase tracking-wider mb-2 md:mb-4" style={{ background: 'rgba(124,58,237,0.1)', color: '#A78BFA', border: '1px solid rgba(124,58,237,0.2)' }}>
          Asi funciona
        </span>
        <h2 className="text-lg md:text-3xl font-bold text-white mb-1.5 md:mb-3">Tu bot vende en segundos</h2>
        <p className="text-[12px] md:text-[15px] text-gray-400 mb-4 md:mb-10 max-w-lg mx-auto">Todo el proceso de venta, automatizado por inteligencia artificial.</p>

        <div className="flex items-center justify-center gap-1.5 md:gap-4 flex-wrap">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center gap-1.5 md:gap-4">
              <div className={`landing-card flex flex-col items-center gap-1 md:gap-2 rounded-lg md:rounded-2xl px-2.5 py-2 md:px-6 md:py-5 scroll-reveal scroll-reveal-delay-${i + 1}`} style={{ ...glass.card }}>
                <div className="h-7 w-7 md:h-10 md:w-10 rounded-lg md:rounded-xl flex items-center justify-center" style={{ background: `${s.color}15`, border: `1px solid ${s.color}25` }}>
                  <s.icon className="h-3.5 w-3.5 md:h-5 md:w-5" style={{ color: s.color }} />
                </div>
                <p className="text-[8px] md:text-[11px] font-semibold text-gray-200">{s.label}</p>
              </div>
              {i < steps.length - 1 && <ArrowRight className="h-4 w-4 text-gray-600 shrink-0 hidden md:block" />}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── S3: Chat Simulation — iPhone Ultra-Realistic ────────────

function ChatSection() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const chatRef = useRef<HTMLDivElement>(null)
  const phoneRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  const conversation: { from: string; text?: string; type?: string }[] = [
    { from: 'c', text: 'Hola, precio del Pack Premium?' },
    { from: 'b', text: 'Hola 👋 te explico 👇' },
    { from: 'b', text: 'Incluye bots ilimitados, productos y seguimiento automatico. Todo por $99/mes.' },
    { from: 'b', text: 'Hoy tienes 20% de descuento 🔥' },
    { from: 'b', type: 'product' },
    { from: 'c', text: 'Lo quiero!' },
    { from: 'b', text: 'Perfecto 🙌 te envio el link de pago' },
  ]

  const [count, setCount] = useState(0)
  const [typing, setTyping] = useState(false)

  // Scroll reveal
  useEffect(() => {
    const el = sectionRef.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.unobserve(el) } }, { threshold: 0.1 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  // Chat animation
  useEffect(() => {
    if (!visible) return
    if (count >= conversation.length) {
      const t = setTimeout(() => setCount(0), 3500)
      return () => clearTimeout(t)
    }
    setTyping(true)
    const delay = conversation[count].from === 'b' ? 1400 : 900
    const t = setTimeout(() => { setTyping(false); setCount(c => c + 1) }, delay)
    return () => clearTimeout(t)
  }, [count, conversation.length, visible])

  // Auto scroll chat
  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight
  }, [count, typing])

  // Parallax tilt on phone
  useEffect(() => {
    const el = phoneRef.current
    if (!el || innerWidth < 768) return
    function handleMove(e: MouseEvent) {
      const rect = el!.getBoundingClientRect()
      const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2
      const dx = (e.clientX - cx) / rect.width, dy = (e.clientY - cy) / rect.height
      el!.style.transform = `perspective(1200px) rotateY(${dx * 5}deg) rotateX(${-dy * 3}deg)`
    }
    function handleLeave() { el!.style.transform = 'perspective(1200px) rotateY(0deg) rotateX(0deg)' }
    addEventListener('mousemove', handleMove, { passive: true })
    el.addEventListener('mouseleave', handleLeave)
    return () => { removeEventListener('mousemove', handleMove); el.removeEventListener('mouseleave', handleLeave) }
  }, [])

  // Floating notifications
  const notifs = [
    { icon: '💰', text: 'Venta realizada', color: '#10B981' },
    { icon: '👤', text: 'Cliente activo', color: '#5B8AFF' },
    { icon: '💬', text: 'Nuevo mensaje', color: '#7C3AED' },
  ]
  const [notifIdx, setNotifIdx] = useState(0)
  const [notifShow, setNotifShow] = useState(false)
  useEffect(() => {
    if (!visible) return
    const t1 = setTimeout(() => setNotifShow(true), 2000)
    const interval = setInterval(() => {
      setNotifShow(false)
      setTimeout(() => { setNotifIdx(p => (p + 1) % notifs.length); setNotifShow(true) }, 400)
    }, 3500)
    return () => { clearTimeout(t1); clearInterval(interval) }
  }, [visible, notifs.length])

  // Benefits with stagger
  const benefits = [
    { icon: Zap, text: 'Respuesta inmediata', desc: 'Atiende en menos de 2 segundos', color: '#F59E0B' },
    { icon: ShoppingBag, text: 'Muestra productos automaticamente', desc: 'Con imagen, precio y descuento', color: '#A78BFA' },
    { icon: DollarSign, text: 'Cierra ventas sin intervencion', desc: 'Registra pedido y envia link de pago', color: '#10B981' },
    { icon: MessageSquare, text: 'Atiende 100+ clientes a la vez', desc: 'Sin esperas, sin errores', color: '#5B8AFF' },
  ]

  const times = ['10:30', '10:30', '10:30', '10:31', '10:31', '10:32', '10:32']

  return (
    <section ref={sectionRef} className="relative py-5 md:py-28 overflow-hidden">
      {/* Section background glows - hidden on mobile for performance */}
      <div className="absolute inset-0 pointer-events-none hidden md:block">
        <div className="absolute top-[20%] right-[10%] w-[600px] h-[600px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(79,124,255,0.1), transparent 65%)', filter: 'blur(40px)' }} />
        <div className="absolute bottom-[20%] left-[10%] w-[500px] h-[500px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.08), transparent 65%)', filter: 'blur(40px)' }} />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-5 md:px-6">
        <div className="grid lg:grid-cols-2 gap-6 md:gap-14 items-center">

          {/* Left: Text + Benefits */}
          <div style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(30px)', transition: 'all 0.8s cubic-bezier(0.16,1,0.3,1)' }}>
            <div className="inline-flex items-center gap-2 rounded-full px-3 md:px-4 py-1.5 md:py-2 mb-3 md:mb-6" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', boxShadow: '0 0 20px rgba(16,185,129,0.06)' }}>
              <div className="relative">
                <div className="h-2 w-2 rounded-full bg-green-400" />
                <div className="absolute inset-0 h-2 w-2 rounded-full bg-green-400 animate-ping" />
              </div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-green-400">Demo en vivo</span>
            </div>

            <h2 className="text-[22px] sm:text-4xl md:text-[42px] font-extrabold leading-[1.1] tracking-tight text-white mb-1.5 md:mb-4">
              Tu bot vende mientras{' '}
              <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(135deg, #10B981, #34D399)' }}>tu descansas</span>
            </h2>
            <p className="text-[13px] md:text-[16px] text-gray-400 max-w-lg mb-3 md:mb-10 leading-relaxed">
              Responde, persuade y cierra ventas <strong className="text-gray-200">automaticamente en segundos</strong>. Mira como funciona en tiempo real.
            </p>

            {/* Animated benefits */}
            <div className="space-y-2.5 md:space-y-4">
              {benefits.map((b, i) => (
                <div
                  key={i}
                  className="group flex items-start gap-3 md:gap-4 rounded-xl md:rounded-2xl p-3 md:p-4 transition-all duration-300 hover:bg-white/[0.04]"
                  style={{
                    border: '1px solid rgba(255,255,255,0.04)',
                    opacity: visible ? 1 : 0,
                    transform: visible ? 'translateX(0)' : 'translateX(-30px)',
                    transition: `all 0.7s cubic-bezier(0.16,1,0.3,1) ${0.3 + i * 0.12}s`,
                  }}
                >
                  <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 transition-shadow duration-300 group-hover:shadow-lg" style={{ background: `${b.color}15`, border: `1px solid ${b.color}30`, boxShadow: `0 0 0 0 ${b.color}00` }}>
                    <b.icon className="h-5 w-5" style={{ color: b.color }} />
                  </div>
                  <div>
                    <p className="text-[14px] font-semibold text-white mb-0.5">{b.text}</p>
                    <p className="text-[12px] text-gray-400 leading-snug">{b.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: iPhone Mockup */}
          <div className="flex justify-center" style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0) scale(1)' : 'translateY(40px) scale(0.95)', transition: 'all 1s cubic-bezier(0.16,1,0.3,1) 0.2s' }}>
            <div className="relative">
              {/* Phone glow */}
              <div className="absolute -inset-12 rounded-full pointer-events-none" style={{ background: 'radial-gradient(ellipse at center, rgba(79,124,255,0.12), rgba(124,58,237,0.06) 50%, transparent 70%)', filter: 'blur(30px)' }} />

              {/* iPhone frame */}
              <div
                ref={phoneRef}
                className="relative w-[270px] md:w-[340px] iphone-float"
                style={{ transformStyle: 'preserve-3d', transition: 'transform 0.15s ease-out' }}
              >
                {/* Phone body */}
                <div className="relative rounded-[3rem] overflow-hidden" style={{
                  background: '#1A1A1A',
                  boxShadow: '0 30px 80px rgba(0,0,0,0.5), 0 10px 30px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1), inset 0 -1px 0 rgba(255,255,255,0.05)',
                  border: '3px solid #2A2A2A',
                }}>
                  {/* Screen bezel */}
                  <div className="m-[3px] rounded-[2.7rem] overflow-hidden relative" style={{ background: '#000' }}>

                    {/* Status bar + Dynamic Island */}
                    <div className="relative h-12 flex items-start justify-center pt-2 px-6" style={{ background: '#075E54' }}>
                      {/* Dynamic Island */}
                      <div className="absolute top-2 left-1/2 -translate-x-1/2 w-[100px] h-[28px] rounded-full bg-black z-20 flex items-center justify-center">
                        <div className="w-[10px] h-[10px] rounded-full bg-[#1a1a2e] border border-gray-800" />
                      </div>
                      {/* Status bar content */}
                      <div className="absolute top-2.5 left-7 text-[10px] font-semibold text-white/90">9:41</div>
                      <div className="absolute top-2.5 right-7 flex items-center gap-1">
                        <div className="flex gap-[1px]">{[1,2,3,4].map(i => <div key={i} className="w-[3px] rounded-sm bg-white/90" style={{ height: `${6 + i * 2}px` }} />)}</div>
                        <span className="text-[10px] font-semibold text-white/90 ml-1">5G</span>
                        <div className="w-[22px] h-[10px] rounded-sm border border-white/90 relative ml-1">
                          <div className="absolute inset-[1.5px] rounded-[1px] bg-white/90" style={{ width: '70%' }} />
                        </div>
                      </div>
                    </div>

                    {/* WhatsApp header */}
                    <div className="flex items-center gap-3 px-4 py-2.5" style={{ background: '#075E54' }}>
                      <svg viewBox="0 0 24 24" fill="white" className="h-4 w-4 opacity-90"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
                      <div className="h-9 w-9 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #25D366, #128C7E)' }}>
                        <Bot className="h-4 w-4 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[13px] font-semibold text-white">Agente de Ventas Bot</p>
                        <p className="text-[10px] text-green-200/80">{typing && count < conversation.length && conversation[count].from === 'b' ? 'escribiendo...' : 'en linea'}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <svg viewBox="0 0 24 24" fill="white" className="h-4 w-4 opacity-70"><path d="M20 15.5c-1.25 0-2.45-.2-3.57-.57a1.02 1.02 0 00-1.02.24l-2.2 2.2a15.045 15.045 0 01-6.59-6.59l2.2-2.21a.96.96 0 00.25-1A11.36 11.36 0 018.5 4c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1 0 9.39 7.61 17 17 17 .55 0 1-.45 1-1v-3.5c0-.55-.45-1-1-1z"/></svg>
                        <svg viewBox="0 0 24 24" fill="white" className="h-4 w-4 opacity-70"><path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm-6 4c0-3.31 2.69-6 6-6s6 2.69 6 6-2.69 6-6 6-6-2.69-6-6z"/><circle cx="12" cy="12" r="3"/></svg>
                      </div>
                    </div>

                    {/* Chat area */}
                    <div
                      ref={chatRef}
                      className="px-3 py-3 space-y-1.5 overflow-y-auto no-scrollbar"
                      style={{
                        minHeight: '300px',
                        maxHeight: '350px',
                        background: '#ECE5DD',
                        backgroundImage: `url("data:image/svg+xml,%3Csvg width='400' height='400' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cpattern id='p' width='60' height='60' patternUnits='userSpaceOnUse'%3E%3Cpath d='M30 5c1 0 2 1 2 2s-1 2-2 2-2-1-2-2 1-2 2-2z' fill='rgba(0,0,0,0.025)'/%3E%3Cpath d='M10 30c1 0 2 1 2 2s-1 2-2 2-2-1-2-2 1-2 2-2z' fill='rgba(0,0,0,0.02)'/%3E%3Cpath d='M50 45c1 0 2 1 2 2s-1 2-2 2-2-1-2-2 1-2 2-2z' fill='rgba(0,0,0,0.015)'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='400' height='400' fill='url(%23p)'/%3E%3C/svg%3E")`,
                      }}
                    >
                      {/* Date chip */}
                      <div className="flex justify-center mb-2">
                        <div className="rounded-lg px-3 py-1 bg-white/80 shadow-sm">
                          <span className="text-[10px] text-gray-500 font-medium">Hoy</span>
                        </div>
                      </div>

                      {conversation.slice(0, count).map((m, i) => (
                        <div key={i} className={`flex ${m.from === 'b' ? 'justify-start' : 'justify-end'}`} style={{ animation: 'wa-msg-in 0.3s cubic-bezier(0.16,1,0.3,1)' }}>
                          {m.type === 'product' ? (
                            <div className="rounded-lg overflow-hidden bg-white max-w-[78%] relative" style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
                              {/* WA tail */}
                              <div className="absolute -left-2 top-0 w-3 h-3" style={{ background: 'white', clipPath: 'polygon(100% 0, 100% 100%, 0 0)' }} />
                              <div className="h-32 bg-gradient-to-br from-blue-50 via-violet-50 to-blue-100 flex items-center justify-center relative overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/30 to-transparent" />
                                <ShoppingBag className="h-10 w-10 text-[#7C3AED]/30" />
                              </div>
                              <div className="p-3">
                                <p className="text-[12px] font-semibold text-gray-800">Pack Premium</p>
                                <p className="text-[10px] text-gray-500 mt-0.5">Bots ilimitados + productos + seguimiento</p>
                                <div className="flex items-center gap-2 mt-1.5">
                                  <p className="text-[15px] font-bold text-[#075E54]">$79</p>
                                  <p className="text-[11px] line-through text-gray-400">$99</p>
                                  <span className="text-[8px] font-bold text-white px-1.5 py-0.5 rounded-full bg-red-500">-20%</span>
                                </div>
                                <button className="w-full mt-2 rounded-lg py-2 text-[11px] font-bold text-white" style={{ background: '#25D366' }}>Comprar ahora</button>
                              </div>
                              <div className="flex justify-end px-3 pb-1.5"><span className="text-[8px] text-gray-400">{times[i]}</span></div>
                            </div>
                          ) : (
                            <div className="relative max-w-[80%]">
                              {/* WA message tail */}
                              {i === 0 || conversation[i - 1]?.from !== m.from ? (
                                <div className={`absolute -${m.from === 'b' ? 'left' : 'right'}-2 top-0 w-3 h-3`} style={{ background: m.from === 'b' ? 'white' : '#DCF8C6', clipPath: m.from === 'b' ? 'polygon(100% 0, 100% 100%, 0 0)' : 'polygon(0 0, 100% 0, 0 100%)' }} />
                              ) : null}
                              <div className={`rounded-lg px-3 py-[7px] ${m.from === 'b' ? 'bg-white' : 'bg-[#DCF8C6]'}`} style={{ boxShadow: '0 1px 1px rgba(0,0,0,0.06)' }}>
                                <p className="text-[12px] text-gray-800 leading-relaxed">{m.text}</p>
                                <div className="flex items-center justify-end gap-1 mt-0.5">
                                  <span className="text-[8px] text-gray-400">{times[i]}</span>
                                  {m.from === 'c' && (
                                    <svg viewBox="0 0 16 11" className="h-[10px] w-[14px] text-[#53bdeb]" fill="currentColor"><path d="M11.07.66L5.4 7.17 2.85 4.21a.44.44 0 00-.7.02l-.52.72a.55.55 0 00.06.69l3.54 3.7c.2.21.56.2.75-.02L12.33 1.4a.55.55 0 00-.06-.7l-.52-.43a.44.44 0 00-.68.39z"/><path d="M15.07.66L9.4 7.17 8.5 6.13l1.75-2.28a.55.55 0 00-.06-.7l-.52-.43a.44.44 0 00-.68.39L5.23 8.3l.8.84c.2.21.56.2.75-.02l6.93-7.93a.55.55 0 00-.06-.7l-.52-.43a.44.44 0 00-.06.6z"/></svg>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}

                      {/* Typing indicator */}
                      {typing && count < conversation.length && (
                        <div className={`flex ${conversation[count].from === 'b' ? 'justify-start' : 'justify-end'}`} style={{ animation: 'wa-msg-in 0.2s ease-out' }}>
                          <div className={`flex items-center gap-1 px-3 py-2.5 rounded-lg ${conversation[count].from === 'b' ? 'bg-white' : 'bg-[#DCF8C6]'}`} style={{ boxShadow: '0 1px 1px rgba(0,0,0,0.06)' }}>
                            <div className="h-[6px] w-[6px] rounded-full bg-gray-400 typing-dot" />
                            <div className="h-[6px] w-[6px] rounded-full bg-gray-400 typing-dot" />
                            <div className="h-[6px] w-[6px] rounded-full bg-gray-400 typing-dot" />
                          </div>
                        </div>
                      )}

                      {/* Sale confirmed */}
                      {count >= conversation.length && (
                        <div className="flex justify-center pt-2" style={{ animation: 'wa-msg-in 0.4s cubic-bezier(0.16,1,0.3,1)' }}>
                          <div className="flex items-center gap-2 rounded-full px-4 py-1.5 bg-green-100 border border-green-200 shadow-sm">
                            <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                            <span className="text-[10px] font-bold text-green-700">Venta cerrada — $79 USD</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* WhatsApp input bar */}
                    <div className="flex items-center gap-2 px-2 py-2" style={{ background: '#F0F0F0' }}>
                      <div className="flex-1 flex items-center gap-2 rounded-full px-3 py-2 bg-white">
                        <svg viewBox="0 0 24 24" className="h-4 w-4 text-gray-400" fill="currentColor"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"/></svg>
                        <span className="text-[12px] text-gray-400 flex-1">Mensaje</span>
                        <svg viewBox="0 0 24 24" className="h-4 w-4 text-gray-400" fill="currentColor"><path d="M1.5 1.5l6.14 6.14L1.5 13.78V1.5m10.28 0h10.72L16.36 7.64l6.14 6.14H12L5.86 7.64 12 1.5z" opacity="0"/><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                        <svg viewBox="0 0 24 24" className="h-4 w-4 text-gray-400" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10h5v-2h-5c-4.34 0-8-3.66-8-8s3.66-8 8-8 8 3.66 8 8v1.43c0 .79-.71 1.57-1.5 1.57s-1.5-.78-1.5-1.57V12c0-2.76-2.24-5-5-5s-5 2.24-5 5 2.24 5 5 5c1.38 0 2.64-.56 3.54-1.47.65.89 1.77 1.47 2.96 1.47 1.97 0 3.5-1.6 3.5-3.57V12c0-5.52-4.48-10-10-10z" opacity="0"/></svg>
                      </div>
                      <div className="h-9 w-9 rounded-full flex items-center justify-center" style={{ background: '#25D366' }}>
                        <svg viewBox="0 0 24 24" fill="white" className="h-4 w-4"><path d="M12 2a10 10 0 00-3.16 19.5l-1.28 3.84a.5.5 0 00.7.58l4.06-1.83A10 10 0 0012 2z" opacity="0"/><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                      </div>
                    </div>

                    {/* Home indicator */}
                    <div className="h-5 flex items-center justify-center" style={{ background: '#F0F0F0' }}>
                      <div className="w-[120px] h-[4px] rounded-full bg-gray-800/20" />
                    </div>
                  </div>
                </div>

                {/* Glass reflection overlay */}
                <div className="absolute inset-0 rounded-[3rem] pointer-events-none overflow-hidden">
                  <div className="absolute -top-[50%] -left-[20%] w-[140%] h-[100%] rotate-[25deg]" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 40%, transparent 60%)' }} />
                </div>

                {/* Side buttons */}
                <div className="absolute -left-[5px] top-[120px] w-[4px] h-[28px] rounded-l-sm bg-[#2A2A2A]" />
                <div className="absolute -left-[5px] top-[165px] w-[4px] h-[50px] rounded-l-sm bg-[#2A2A2A]" />
                <div className="absolute -left-[5px] top-[225px] w-[4px] h-[50px] rounded-l-sm bg-[#2A2A2A]" />
                <div className="absolute -right-[5px] top-[180px] w-[4px] h-[70px] rounded-r-sm bg-[#2A2A2A]" />
              </div>

              {/* Floating notifications */}
              <div
                className="absolute -right-10 top-20 rounded-xl px-3.5 py-2.5 z-20"
                style={{
                  background: 'rgba(15,23,42,0.85)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  backdropFilter: 'blur(12px)',
                  boxShadow: `0 8px 24px rgba(0,0,0,0.3), 0 0 15px ${notifs[notifIdx].color}15`,
                  opacity: notifShow ? 0.9 : 0,
                  transform: notifShow ? 'translateX(0) scale(1)' : 'translateX(15px) scale(0.9)',
                  transition: 'all 0.35s cubic-bezier(0.16,1,0.3,1)',
                }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-[14px]">{notifs[notifIdx].icon}</span>
                  <span className="text-[10px] font-semibold text-white/80">{notifs[notifIdx].text}</span>
                </div>
              </div>

              <div
                className="absolute -left-8 bottom-32 rounded-xl px-3.5 py-2.5 z-20"
                style={{
                  background: 'rgba(15,23,42,0.85)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  backdropFilter: 'blur(12px)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                  opacity: notifShow ? 0.85 : 0,
                  transform: notifShow ? 'translateX(0)' : 'translateX(-15px)',
                  transition: 'all 0.4s cubic-bezier(0.16,1,0.3,1) 0.15s',
                }}
              >
                <div className="flex items-center gap-2">
                  <div className="relative"><div className="h-1.5 w-1.5 rounded-full bg-green-400" /><div className="absolute inset-0 h-1.5 w-1.5 rounded-full bg-green-400 animate-ping" /></div>
                  <span className="text-[10px] font-semibold text-green-400/80">En vivo</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section transition */}
      <div className="absolute -bottom-px left-0 right-0 section-divider" />
    </section>
  )
}

// ── S4+S5: Persuasion — VS Comparison + Triggers ───────────

function ProblemSolution() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = sectionRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.unobserve(el) } },
      { threshold: 0.05 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <section ref={sectionRef} className="relative py-8 md:py-28 overflow-hidden">
      {/* ── Section background ── hidden on mobile */}
      <div className="absolute inset-0 pointer-events-none hidden md:block">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[700px] rounded-full" style={{ background: 'radial-gradient(ellipse, rgba(79,124,255,0.12), rgba(124,58,237,0.06) 50%, transparent 70%)' }} />
        <div className="absolute top-[30%] left-[5%] w-[400px] h-[400px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(239,68,68,0.08), transparent 70%)' }} />
        <div className="absolute top-[30%] right-[5%] w-[400px] h-[400px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.08), transparent 70%)' }} />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-5 md:px-6">
        {/* ── Header ── */}
        <div className="text-center mb-6 md:mb-14" style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(30px)', transition: 'all 0.8s cubic-bezier(0.16,1,0.3,1)' }}>
          <span className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider mb-3 md:mb-5" style={{ background: 'rgba(79,124,255,0.15)', color: '#6B9AFF', border: '1px solid rgba(79,124,255,0.3)' }}>
            La diferencia es clara
          </span>
          <h2 className="text-[22px] sm:text-4xl md:text-[44px] font-extrabold leading-[1.1] tracking-tight text-white mb-2 md:mb-4">
            Convierte cada mensaje en{' '}
            <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(135deg, #5B8AFF, #A78BFA)' }}>una venta</span>
          </h2>
          <p className="text-[13px] md:text-[16px] text-gray-300 max-w-xl mx-auto leading-relaxed">
            Mientras otros responden tarde... tu ya estas vendiendo automaticamente.
          </p>
          <div className="flex items-center justify-center gap-2 mt-3 md:mt-5">
            <div className="flex -space-x-1.5">
              {['#5B8AFF','#7C3AED','#10B981'].map((c,i) => (
                <div key={i} className="h-5 w-5 rounded-full border-2 border-[#0F172A]" style={{ background: c }} />
              ))}
            </div>
            <span className="text-[12px] text-gray-400">Mas de <strong className="text-white">500+ negocios</strong> ya automatizaron sus ventas</span>
          </div>
        </div>

        {/* ── VS Comparison ── */}
        <div className="grid md:grid-cols-[1fr,auto,1fr] gap-3 md:gap-0 mb-6 md:mb-16 items-stretch">

          {/* PROBLEM CARD */}
          <div
            className="rounded-2xl p-5 md:p-8 relative overflow-hidden landing-card"
            style={{
              background: 'linear-gradient(145deg, rgba(239,68,68,0.14), rgba(180,40,40,0.06))',
              border: '1px solid rgba(239,68,68,0.25)',
              boxShadow: '0 4px 30px rgba(239,68,68,0.08)',
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateX(0)' : 'translateX(-40px)',
              transition: 'all 0.8s cubic-bezier(0.16,1,0.3,1) 0.2s',
            }}
          >
            {/* Corner glow */}
            <div className="absolute -top-10 -left-10 w-48 h-48 rounded-full" style={{ background: 'radial-gradient(circle, rgba(239,68,68,0.2), transparent 70%)' }} />

            <div className="relative">
              <div className="flex items-center gap-3 mb-5 md:mb-7">
                <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.35)' }}>
                  <AlertTriangle className="h-5 w-5 md:h-6 md:w-6 text-red-400" />
                </div>
                <div>
                  <h3 className="text-[18px] font-bold text-red-300">Sin automatizacion</h3>
                  <p className="text-[10px] text-red-400/70 uppercase tracking-wider font-bold">Estas perdiendo dinero</p>
                </div>
              </div>
              <div className="space-y-3 md:space-y-4">
                {[
                  'Estas perdiendo clientes ahora mismo',
                  'Respondes tarde y pierdes la venta',
                  'Gastas 5+ horas en mensajes repetitivos',
                  'Dejas dinero en la mesa cada dia',
                  'Sin seguimiento, leads se olvidan de ti',
                ].map((text, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="h-7 w-7 md:h-8 md:w-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.2)' }}>
                      <X className="h-3.5 w-3.5 md:h-4 md:w-4 text-red-400" />
                    </div>
                    <p className="text-[13px] md:text-[14px] text-red-100/90 leading-snug">{text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* VS DIVIDER — desktop */}
          <div className="hidden md:flex items-center justify-center px-4">
            <div className="relative">
              <div className="h-[70px] w-[70px] rounded-full flex items-center justify-center z-10 relative" style={{
                background: 'linear-gradient(135deg, #1a2a55, #1f1a45)',
                border: '2px solid rgba(79,124,255,0.4)',
                boxShadow: '0 0 40px rgba(79,124,255,0.25), inset 0 0 20px rgba(79,124,255,0.1)',
              }}>
                <span className="text-[16px] font-black text-white tracking-widest">VS</span>
              </div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 h-[250%] w-px -translate-y-1/2" style={{ background: 'linear-gradient(180deg, transparent, rgba(79,124,255,0.25), transparent)' }} />
            </div>
          </div>
          {/* VS DIVIDER — mobile */}
          <div className="md:hidden flex justify-center py-2">
            <div className="h-14 w-14 rounded-full flex items-center justify-center" style={{
              background: 'linear-gradient(135deg, #1a2a55, #1f1a45)',
              border: '2px solid rgba(79,124,255,0.4)',
              boxShadow: '0 0 30px rgba(79,124,255,0.2)',
            }}>
              <span className="text-[14px] font-black text-white tracking-widest">VS</span>
            </div>
          </div>

          {/* SOLUTION CARD */}
          <div
            className="rounded-2xl p-5 md:p-8 relative overflow-hidden landing-card"
            style={{
              background: 'linear-gradient(145deg, rgba(16,185,129,0.14), rgba(79,124,255,0.06))',
              border: '1px solid rgba(16,185,129,0.25)',
              boxShadow: '0 4px 30px rgba(16,185,129,0.08)',
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateX(0)' : 'translateX(40px)',
              transition: 'all 0.8s cubic-bezier(0.16,1,0.3,1) 0.35s',
            }}
          >
            <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full" style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.2), transparent 70%)' }} />

            <div className="relative">
              <div className="flex items-center gap-3 mb-5 md:mb-7">
                <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.35)' }}>
                  <Zap className="h-5 w-5 md:h-6 md:w-6 text-green-400" />
                </div>
                <div>
                  <h3 className="text-[18px] font-bold text-green-300">Con Agente de Ventas</h3>
                  <p className="text-[10px] text-green-400/70 uppercase tracking-wider font-bold">Vendes en automatico</p>
                </div>
              </div>
              <div className="space-y-3 md:space-y-4">
                {[
                  'Respuesta automatica en segundos',
                  'Ventas 24/7 sin esfuerzo humano',
                  'Atencion a 100+ clientes simultaneos',
                  'Cada lead recibe seguimiento inteligente',
                  'Ingresos creciendo mientras duermes',
                ].map((text, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="h-7 w-7 md:h-8 md:w-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.25)' }}>
                      <Check className="h-3.5 w-3.5 md:h-4 md:w-4 text-green-400" />
                    </div>
                    <p className="text-[13px] md:text-[14px] text-green-100/90 leading-snug">{text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Premium Trigger Badges ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-5">
          {[
            { icon: Timer, title: 'Cupos limitados', desc: 'Solo 50 cuentas disponibles este mes', color: '#EF4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)' },
            { icon: Brain, title: 'IA avanzada', desc: 'Aprende y mejora cada conversacion', color: '#5B8AFF', bg: 'rgba(79,124,255,0.12)', border: 'rgba(79,124,255,0.3)' },
            { icon: Zap, title: 'Activacion inmediata', desc: 'Tu bot listo en menos de 5 minutos', color: '#10B981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)' },
          ].map((t, i) => (
            <div
              key={i}
              className="landing-card group rounded-xl md:rounded-2xl p-4 md:p-5 relative overflow-hidden"
              style={{
                background: t.bg,
                border: `1px solid ${t.border}`,
                backdropFilter: 'blur(8px)',
                boxShadow: `0 4px 20px rgba(0,0,0,0.15)`,
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(20px)',
                transition: `all 0.7s cubic-bezier(0.16,1,0.3,1) ${0.5 + i * 0.1}s`,
              }}
            >
              {/* Hover glow overlay */}
              <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" style={{ background: `radial-gradient(circle at center, ${t.color}15, transparent 70%)` }} />
              <div className="relative flex items-center gap-4">
                <div className="h-13 w-13 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${t.color}20`, border: `1px solid ${t.color}40` }}>
                  <t.icon className="h-6 w-6" style={{ color: t.color }} />
                </div>
                <div>
                  <p className="text-[15px] font-bold text-white mb-0.5">{t.title}</p>
                  <p className="text-[12px] text-gray-300 leading-snug">{t.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Benefits() { return null }

// ── S5.5: Virtual Store — Immersive Sales Experience ────────

function VirtualStoreSection() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const [step, setStep] = useState(0) // 0=idle, 1-6=chat steps, 7=sold
  const [typing, setTyping] = useState(false)
  const [liveEvents, setLiveEvents] = useState<number[]>([])

  useEffect(() => {
    const el = sectionRef.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.unobserve(el) } }, { threshold: 0.08 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  // Animate chat messages sequentially
  useEffect(() => {
    if (!visible) return
    const delays = [800, 1800, 2400, 3600, 4200, 5400, 6800]
    const typingBefore = [false, true, false, true, false, true, false]
    const timers: ReturnType<typeof setTimeout>[] = []
    delays.forEach((d, i) => {
      if (typingBefore[i]) {
        timers.push(setTimeout(() => setTyping(true), d - 600))
      }
      timers.push(setTimeout(() => { setTyping(false); setStep(i + 1) }, d))
    })
    return () => timers.forEach(clearTimeout)
  }, [visible])

  // Live event notifications
  useEffect(() => {
    if (!visible) return
    const t1 = setTimeout(() => setLiveEvents(p => [...p, 0]), 3000)
    const t2 = setTimeout(() => setLiveEvents(p => [...p, 1]), 5500)
    const t3 = setTimeout(() => setLiveEvents(p => [...p, 2]), 7500)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [visible])

  const products = [
    { name: 'Auriculares Pro Max', price: '$149.99', oldPrice: '$199.99', emoji: '🎧', badge: 'TOP', badgeColor: '#10B981', rating: '4.9', reviews: 284, highlight: true },
    { name: 'Smartwatch Elite S3', price: '$299.99', emoji: '⌚', badge: 'NUEVO', badgeColor: '#5B8AFF', rating: '4.8', reviews: 156, highlight: false },
    { name: 'Cámara 4K Ultra HD', price: '$449.99', oldPrice: '$599.99', emoji: '📷', badge: '-25%', badgeColor: '#EF4444', rating: '4.7', reviews: 412, highlight: false },
    { name: 'Teclado Mecánico RGB', price: '$89.99', emoji: '⌨️', badge: 'HOT 🔥', badgeColor: '#F59E0B', rating: '4.6', reviews: 89, highlight: false },
    { name: 'Altavoz Bluetooth Pro', price: '$79.99', oldPrice: '$129.99', emoji: '🔊', badge: '-38%', badgeColor: '#EF4444', rating: '4.5', reviews: 203, highlight: false },
    { name: 'Mouse Ergonómico', price: '$59.99', emoji: '🖱️', badge: null, badgeColor: '', rating: '4.4', reviews: 67, highlight: false },
  ]

  const chatFlow = [
    { from: 'user', text: 'Hola, quiero unos auriculares buenos' },
    { from: 'bot', text: '¡Hola! 👋 Te recomiendo los más vendidos:' },
    { from: 'bot', type: 'product-card' as const, text: '' },
    { from: 'user', text: '¡Me encantan! Los quiero 🙌' },
    { from: 'bot', text: '¡Excelente elección! 🎉\nTe envío el link de pago seguro:' },
    { from: 'bot', type: 'payment' as const, text: '' },
    { from: 'system', type: 'confirmed' as const, text: '' },
  ]

  const liveNotifications = [
    { icon: '🟢', text: 'María G. está viendo tu tienda', color: '#10B981' },
    { icon: '🛒', text: 'Carlos R. agregó 2 productos', color: '#5B8AFF' },
    { icon: '✅', text: '¡Venta confirmada! +$299.99', color: '#10B981' },
  ]

  return (
    <section ref={sectionRef} className="relative py-8 md:py-32 overflow-hidden">
      {/* Background — hidden on mobile for performance */}
      <div className="absolute inset-0 pointer-events-none hidden md:block" style={{
        background: 'radial-gradient(ellipse 100% 60% at 50% 40%, rgba(16, 185, 129, 0.06), transparent 70%)',
      }}>
        <div className="absolute top-[5%] left-[10%] w-[600px] h-[600px] rounded-full blur-[180px]" style={{ background: 'radial-gradient(circle, rgba(91,138,255,0.12), transparent 70%)' }} />
        <div className="absolute bottom-[5%] right-[10%] w-[500px] h-[500px] rounded-full blur-[160px]" style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.1), transparent 70%)' }} />
        <div className="absolute top-[30%] right-[20%] w-[400px] h-[400px] rounded-full blur-[150px]" style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.08), transparent 70%)' }} />
      </div>

      <div className="relative max-w-7xl mx-auto px-5">

        {/* Header */}
        <div className="text-center mb-5 md:mb-14" style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(30px)', transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)' }}>
          <div className="inline-flex items-center gap-2 rounded-full px-4 md:px-5 py-1.5 md:py-2 mb-3 md:mb-6" style={{
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(91, 138, 255, 0.06))',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            boxShadow: '0 4px 20px rgba(16, 185, 129, 0.08)',
          }}>
            <span className="relative flex h-2.5 w-2.5"><span className="animate-ping absolute inset-0 rounded-full bg-[#10B981] opacity-50" /><span className="relative rounded-full h-2.5 w-2.5 bg-[#10B981]" /></span>
            <span className="text-[12px] font-bold text-[#10B981] tracking-wide uppercase">3 tiendas vendiendo ahora mismo</span>
          </div>

          <h2 className="text-[22px] sm:text-4xl md:text-[52px] font-extrabold tracking-tight leading-[1.08] mb-2 md:mb-5">
            <span className="text-white">Así se ve cuando tu negocio </span>
            <br className="hidden sm:block" />
            <span className="hero-gradient-text">vende solo</span>
          </h2>
          <p className="text-[13px] sm:text-[18px] text-[#A0B0C8] max-w-2xl mx-auto leading-relaxed">
            Tu tienda + WhatsApp + IA trabajando juntos. Mientras tú descansas,
            tu negocio muestra, responde, convence y cobra.
          </p>
        </div>

        {/* === MAIN SCENE: 3-layer sales experience === */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 md:gap-5 mb-5 md:mb-14">

          {/* ── LAYER 1: Store catalog — 7 cols ── */}
          <div
            className="lg:col-span-7 rounded-2xl overflow-hidden"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(30px)',
              transition: 'all 0.9s cubic-bezier(0.16, 1, 0.3, 1) 0.15s',
              background: 'linear-gradient(180deg, rgba(20, 35, 65, 0.75) 0%, rgba(14, 26, 50, 0.85) 100%)',
              border: '1px solid rgba(91, 138, 255, 0.15)',
              boxShadow: '0 30px 80px rgba(0, 0, 0, 0.3), 0 0 80px rgba(91, 138, 255, 0.06), inset 0 1px 0 rgba(255,255,255,0.05)',
              backdropFilter: 'blur(24px)',
            }}
          >
            {/* Store top bar */}
            <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: '1px solid rgba(91, 138, 255, 0.1)' }}>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{
                  background: 'linear-gradient(135deg, #10B981, #059669)',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
                }}>
                  <span className="text-base">🏪</span>
                </div>
                <div>
                  <p className="text-[14px] font-bold text-white">Tech Store Pro</p>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-[#A0B0C8]">6 productos</span>
                    <span className="text-[10px] text-[#A0B0C8]">•</span>
                    <span className="flex items-center gap-1 text-[10px] text-[#F59E0B]">⭐ 4.8</span>
                    <span className="text-[10px] text-[#A0B0C8]">•</span>
                    <span className="text-[10px] text-[#10B981] font-semibold">Verificada ✓</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                }}>
                  <span className="relative flex h-2 w-2"><span className="animate-ping absolute inset-0 rounded-full bg-[#10B981] opacity-60" /><span className="relative rounded-full h-2 w-2 bg-[#10B981]" /></span>
                  <span className="text-[10px] font-bold text-[#10B981]">LIVE</span>
                </div>
              </div>
            </div>

            {/* Product grid — 3x2 */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 md:gap-3 p-3 md:p-4">
              {products.map((p, i) => (
                <div
                  key={p.name}
                  className={`group relative rounded-xl overflow-hidden cursor-pointer transition-all duration-300 hover:translate-y-[-4px] ${p.highlight ? 'ring-1 ring-[#10B981]/30' : ''}`}
                  style={{
                    opacity: visible ? 1 : 0,
                    transform: visible ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.95)',
                    transition: `all 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${0.3 + i * 0.08}s`,
                    background: p.highlight
                      ? 'linear-gradient(180deg, rgba(16, 185, 129, 0.06), rgba(255, 255, 255, 0.03))'
                      : 'rgba(255, 255, 255, 0.03)',
                    border: `1px solid ${p.highlight ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.06)'}`,
                  }}
                >
                  {/* Image area */}
                  <div className="relative h-18 md:h-24 flex items-center justify-center overflow-hidden" style={{
                    background: 'linear-gradient(180deg, rgba(91, 138, 255, 0.03), transparent)',
                  }}>
                    <span className="text-3xl sm:text-4xl transition-all duration-300 group-hover:scale-115 group-hover:drop-shadow-[0_0_12px_rgba(91,138,255,0.2)]">{p.emoji}</span>
                    {p.badge && (
                      <span className="absolute top-1.5 left-1.5 text-[8px] font-black text-white px-2 py-0.5 rounded-md tracking-wide" style={{
                        background: p.badgeColor,
                        boxShadow: `0 2px 10px ${p.badgeColor}50`,
                      }}>
                        {p.badge}
                      </span>
                    )}
                    {p.highlight && (
                      <div className="absolute top-1.5 right-1.5 flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[8px] font-bold text-[#F59E0B]" style={{
                        background: 'rgba(245, 158, 11, 0.1)',
                        border: '1px solid rgba(245, 158, 11, 0.2)',
                      }}>⭐ {p.rating}</div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-2.5">
                    <p className="text-[11px] font-semibold text-white truncate mb-0.5">{p.name}</p>
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-[10px] text-[#F59E0B]">{'★'.repeat(Math.round(Number(p.rating)))}</span>
                      <span className="text-[9px] text-[#8899B4]/50">({p.reviews})</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[15px] font-extrabold text-[#10B981]">{p.price}</span>
                      {p.oldPrice && <span className="text-[10px] text-[#8899B4]/40 line-through">{p.oldPrice}</span>}
                    </div>
                    <button className="w-full mt-2 h-7 rounded-lg text-[10px] font-bold text-white transition-all duration-300 group-hover:shadow-[0_4px_20px_rgba(91,138,255,0.35)]" style={{
                      background: 'linear-gradient(135deg, #5B8AFF, #7C3AED)',
                      boxShadow: '0 2px 8px rgba(91, 138, 255, 0.2)',
                    }}>
                      Comprar
                    </button>
                  </div>

                  {/* Hover glow overlay */}
                  <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" style={{
                    boxShadow: '0 12px 40px rgba(91, 138, 255, 0.12)',
                    border: '1px solid rgba(91, 138, 255, 0.2)',
                  }} />
                </div>
              ))}
            </div>

            {/* Live activity bar */}
            <div className="px-4 pb-3">
              <div className="flex items-center gap-3 rounded-xl px-4 py-2.5 overflow-hidden" style={{
                background: 'rgba(16, 185, 129, 0.04)',
                border: '1px solid rgba(16, 185, 129, 0.1)',
              }}>
                <span className="text-xs">👀</span>
                <span className="text-[11px] text-[#A0B0C8]"><strong className="text-white">12 personas</strong> viendo tu tienda ahora</span>
                <span className="ml-auto text-[10px] font-bold text-[#10B981] tabular-nums">+$1,247 hoy</span>
              </div>
            </div>
          </div>

          {/* ── LAYER 2: WhatsApp Chat — 5 cols ── */}
          <div
            className="lg:col-span-5 rounded-2xl overflow-hidden flex flex-col"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(30px)',
              transition: 'all 0.9s cubic-bezier(0.16, 1, 0.3, 1) 0.3s',
              background: 'linear-gradient(180deg, rgba(20, 35, 65, 0.75) 0%, rgba(14, 26, 50, 0.85) 100%)',
              border: '1px solid rgba(91, 138, 255, 0.15)',
              boxShadow: '0 30px 80px rgba(0, 0, 0, 0.3), 0 0 80px rgba(91, 138, 255, 0.06), inset 0 1px 0 rgba(255,255,255,0.05)',
              backdropFilter: 'blur(24px)',
              minHeight: '400px',
            }}
          >
            {/* Chat header */}
            <div className="flex items-center justify-between px-4 py-3" style={{
              borderBottom: '1px solid rgba(91, 138, 255, 0.1)',
              background: 'linear-gradient(180deg, rgba(37, 211, 102, 0.06), transparent)',
            }}>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="h-10 w-10 rounded-full flex items-center justify-center" style={{
                    background: 'linear-gradient(135deg, #25D366, #128C7E)',
                    boxShadow: '0 4px 12px rgba(37, 211, 102, 0.25)',
                  }}>
                    <span className="text-lg">🤖</span>
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-[#10B981] border-2" style={{ borderColor: 'rgba(20, 35, 65, 0.85)' }} />
                </div>
                <div>
                  <p className="text-[14px] font-bold text-white">Agente de Ventas IA</p>
                  <p className="text-[11px] text-[#10B981] font-medium">En línea • Respuesta instantánea</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-7 w-7 rounded-full flex items-center justify-center text-[#8899B4]/50 hover:text-white transition-colors"><svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M12 12h.01" /></svg></div>
                <div className="h-7 w-7 rounded-full flex items-center justify-center text-[#8899B4]/50 hover:text-white transition-colors"><svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M12 5v.01M12 12v.01M12 19v.01" /></svg></div>
              </div>
            </div>

            {/* Chat body */}
            <div className="flex-1 px-4 py-4 space-y-2.5 overflow-hidden relative">
              {/* Time stamp */}
              <div className="flex justify-center mb-2">
                <span className="text-[10px] text-[#8899B4]/40 px-3 py-1 rounded-full" style={{ background: 'rgba(255,255,255,0.03)' }}>Hoy, 10:31 AM</span>
              </div>

              {chatFlow.map((msg, i) => {
                if (i >= step) return null

                // System confirmed message
                if (msg.type === 'confirmed') return (
                  <div key={i} className="flex justify-center animate-fade-in-up">
                    <div className="flex items-center gap-2.5 rounded-2xl px-5 py-3" style={{
                      background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(16, 185, 129, 0.06))',
                      border: '1px solid rgba(16, 185, 129, 0.25)',
                      boxShadow: '0 8px 32px rgba(16, 185, 129, 0.15)',
                    }}>
                      <span className="text-lg">✅</span>
                      <div>
                        <p className="text-[13px] font-bold text-[#10B981]">¡Venta confirmada!</p>
                        <p className="text-[11px] text-[#10B981]/70">Auriculares Pro Max • $149.99</p>
                      </div>
                    </div>
                  </div>
                )

                // Product card embed
                if (msg.type === 'product-card') return (
                  <div key={i} className="flex justify-start animate-fade-in-up">
                    <div className="max-w-[88%] rounded-2xl overflow-hidden" style={{
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(16, 185, 129, 0.15)',
                    }}>
                      <div className="flex items-center gap-3 p-3">
                        <div className="h-14 w-14 rounded-xl flex items-center justify-center shrink-0" style={{
                          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(91, 138, 255, 0.06))',
                        }}>
                          <span className="text-2xl">🎧</span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-[12px] font-bold text-white">Auriculares Pro Max</p>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-[#F59E0B]">⭐⭐⭐⭐⭐</span>
                            <span className="text-[9px] text-[#8899B4]/50">(284)</span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[14px] font-extrabold text-[#10B981]">$149.99</span>
                            <span className="text-[10px] text-[#8899B4]/40 line-through">$199.99</span>
                            <span className="text-[9px] font-bold text-[#EF4444] px-1.5 py-0.5 rounded" style={{ background: 'rgba(239, 68, 68, 0.1)' }}>-25%</span>
                          </div>
                        </div>
                      </div>
                      <div className="px-3 pb-3">
                        <div className="flex gap-2">
                          <button className="flex-1 h-8 rounded-lg text-[11px] font-bold text-white" style={{
                            background: 'linear-gradient(135deg, #25D366, #128C7E)',
                            boxShadow: '0 3px 12px rgba(37, 211, 102, 0.2)',
                          }}>Comprar ahora</button>
                          <button className="h-8 px-3 rounded-lg text-[11px] font-semibold text-[#8899B4]" style={{
                            background: 'rgba(255,255,255,0.04)',
                            border: '1px solid rgba(255,255,255,0.08)',
                          }}>Ver más</button>
                        </div>
                      </div>
                    </div>
                  </div>
                )

                // Payment link
                if (msg.type === 'payment') return (
                  <div key={i} className="flex justify-start animate-fade-in-up">
                    <div className="max-w-[88%] rounded-2xl px-4 py-3" style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      borderBottomLeftRadius: '6px',
                    }}>
                      <p className="text-[12px] text-white/90 mb-2">🔒 Link de pago seguro:</p>
                      <div className="flex items-center gap-2 rounded-xl px-3 py-2.5" style={{
                        background: 'linear-gradient(135deg, rgba(91, 138, 255, 0.08), rgba(124, 58, 237, 0.05))',
                        border: '1px solid rgba(91, 138, 255, 0.15)',
                      }}>
                        <span className="text-sm">💳</span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-semibold text-white truncate">pay.agente.com/order/38f7k</p>
                          <p className="text-[9px] text-[#5B8AFF]">Pago 100% seguro • SSL</p>
                        </div>
                        <span className="text-[10px] font-extrabold text-[#10B981]">$149.99</span>
                      </div>
                      <p className="text-[9px] text-[#8899B4]/40 mt-1.5">10:32 AM</p>
                    </div>
                  </div>
                )

                // Regular messages
                return (
                  <div key={i} className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in-up`}>
                    <div className="max-w-[80%] rounded-2xl px-3.5 py-2.5" style={{
                      background: msg.from === 'user'
                        ? 'linear-gradient(135deg, rgba(91, 138, 255, 0.2), rgba(124, 58, 237, 0.12))'
                        : 'rgba(255, 255, 255, 0.05)',
                      border: `1px solid ${msg.from === 'user' ? 'rgba(91, 138, 255, 0.18)' : 'rgba(255, 255, 255, 0.06)'}`,
                      borderBottomRightRadius: msg.from === 'user' ? '6px' : undefined,
                      borderBottomLeftRadius: msg.from === 'bot' ? '6px' : undefined,
                    }}>
                      <p className="text-[12px] text-white/90 leading-relaxed">{msg.text}</p>
                      <p className={`text-[9px] mt-1 ${msg.from === 'user' ? 'text-right text-[#5B8AFF]/50' : 'text-[#8899B4]/40'}`}>
                        {msg.from === 'user' ? '10:31' : '10:31'} {msg.from === 'bot' && '✓✓'}
                      </p>
                    </div>
                  </div>
                )
              })}

              {/* Typing indicator */}
              {typing && (
                <div className="flex justify-start animate-fade-in-up">
                  <div className="rounded-2xl px-4 py-3" style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    borderBottomLeftRadius: '6px',
                  }}>
                    <div className="flex items-center gap-1">
                      <span className="typing-dot h-2 w-2 rounded-full bg-[#8899B4]/60" />
                      <span className="typing-dot h-2 w-2 rounded-full bg-[#8899B4]/60" />
                      <span className="typing-dot h-2 w-2 rounded-full bg-[#8899B4]/60" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Chat input bar */}
            <div className="px-3 pb-3">
              <div className="flex items-center gap-2 rounded-xl px-4 py-2.5" style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
              }}>
                <span className="text-[#8899B4]/30 text-[13px]">Escribe un mensaje...</span>
                <div className="ml-auto flex items-center gap-2 text-[#8899B4]/30">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M15.172 7l-6.586 6.586a2 2 0 002.828 2.828L18 9.828a4 4 0 00-5.656-5.656L5.757 10.757a6 6 0 008.486 8.486L20.5 13" /></svg>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── LAYER 3: Live event notifications floating ── */}
        <div className="absolute top-[12%] right-[3%] hidden xl:block space-y-3 z-20" style={{ width: '240px' }}>
          {liveNotifications.map((n, i) => (
            <div
              key={i}
              className="rounded-xl px-4 py-3"
              style={{
                opacity: liveEvents.includes(i) ? 1 : 0,
                transform: liveEvents.includes(i) ? 'translateX(0) scale(1)' : 'translateX(30px) scale(0.9)',
                transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
                background: 'linear-gradient(135deg, rgba(20, 35, 65, 0.9), rgba(14, 26, 50, 0.95))',
                border: `1px solid ${n.color}25`,
                boxShadow: `0 8px 24px rgba(0,0,0,0.2), 0 0 20px ${n.color}10`,
                backdropFilter: 'blur(16px)',
              }}
            >
              <div className="flex items-center gap-2.5">
                <span className="text-sm">{n.icon}</span>
                <span className="text-[11px] text-white/80 leading-snug">{n.text}</span>
              </div>
              <p className="text-[9px] text-[#8899B4]/40 mt-1">Hace un momento</p>
            </div>
          ))}
        </div>

        {/* Benefits row — compact, powerful */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 md:gap-3 mb-8 md:mb-12" style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(20px)',
          transition: 'all 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.6s',
        }}>
          {[
            { icon: '🛍️', text: 'Muestra productos automáticamente', stat: '24/7' },
            { icon: '💬', text: 'Responde preguntas al instante', stat: '<2s' },
            { icon: '💰', text: 'Envía precios y cierra ventas', stat: '100%' },
            { icon: '📦', text: 'Confirma y rastrea pedidos', stat: 'Auto' },
          ].map((b, i) => (
            <div key={i} className="group rounded-xl p-4 transition-all duration-300 hover:translate-y-[-3px]" style={{
              background: 'linear-gradient(180deg, rgba(20, 35, 65, 0.6), rgba(14, 26, 50, 0.7))',
              border: '1px solid rgba(91, 138, 255, 0.1)',
              backdropFilter: 'blur(12px)',
            }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xl">{b.icon}</span>
                <span className="text-[11px] font-extrabold text-[#10B981] px-2 py-0.5 rounded-md" style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.15)' }}>{b.stat}</span>
              </div>
              <p className="text-[12px] font-semibold text-white leading-snug">{b.text}</p>
            </div>
          ))}
        </div>

        {/* CTA — impossible to ignore */}
        <div className="text-center" style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(20px)',
          transition: 'all 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.8s',
        }}>
          <button
            onClick={() => window.location.href = '/register'}
            className="group relative inline-flex items-center gap-2.5 md:gap-3 h-13 md:h-16 px-7 md:px-10 rounded-2xl text-[14px] md:text-[16px] font-extrabold text-white transition-all duration-300 hover:translate-y-[-3px] hover:scale-[1.03]"
            style={{
              background: 'linear-gradient(135deg, #10B981, #059669, #10B981)',
              backgroundSize: '200% 100%',
              animation: 'auth-btn-gradient 4s ease-in-out infinite',
              boxShadow: '0 8px 36px rgba(16, 185, 129, 0.4), 0 0 0 1px rgba(16, 185, 129, 0.2), 0 0 60px rgba(16, 185, 129, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
            }}
          >
            <span className="text-xl">🚀</span>
            Crear mi tienda ahora
            <svg className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
            {/* Shimmer */}
            <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none"><div className="absolute top-0 left-[-100%] w-full h-full" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)', animation: 'auth-btn-shimmer 3s ease-in-out infinite 1s' }} /></div>
          </button>
          <p className="text-[13px] text-[#A0B0C8]/60 mt-4">Gratis para empezar • Sin tarjeta • Listo en 5 minutos</p>
        </div>
      </div>

      <div className="absolute -bottom-px left-0 right-0 section-divider" />
    </section>
  )
}

// ── S6: Testimonials Carousel — Premium Netflix-style ──────

function Testimonials() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const [liveNotif, setLiveNotif] = useState(0)
  const [notifShow, setNotifShow] = useState(false)

  useEffect(() => {
    const el = sectionRef.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.unobserve(el) } }, { threshold: 0.05 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  // Live activity notifications
  const liveActivities = [
    { icon: '💰', text: '+1 venta hace 30s', color: '#10B981' },
    { icon: '⭐', text: 'Nuevo testimonio agregado', color: '#F59E0B' },
    { icon: '👤', text: '12 usuarios activos ahora', color: '#5B8AFF' },
    { icon: '🔥', text: '+3 negocios se unieron hoy', color: '#EF4444' },
  ]
  useEffect(() => {
    if (!visible) return
    const t1 = setTimeout(() => setNotifShow(true), 1500)
    const interval = setInterval(() => {
      setNotifShow(false)
      setTimeout(() => { setLiveNotif(p => (p + 1) % liveActivities.length); setNotifShow(true) }, 400)
    }, 4000)
    return () => { clearTimeout(t1); clearInterval(interval) }
  }, [visible, liveActivities.length])

  const all = [
    { n: 'Carlos M.', r: 'Tienda online', t: 'Mis ventas subieron 280% en el primer mes. El bot responde mejor que cualquier vendedor.', m: '+280% ventas', e: '💰', img: '/images/testimonials/t1.jpg' },
    { n: 'Maria L.', r: 'Emprendedora', t: 'Ahorro 5 horas diarias. Mi bot atiende todo mientras yo crezco el negocio.', m: '5 hrs ahorradas', e: '⏰', img: '/images/testimonials/t2.jpg' },
    { n: 'Pedro S.', r: 'Vendedor', t: 'La tienda virtual + WhatsApp es increible. Mis clientes compran solos.', m: '+150 ventas/mes', e: '🛍️', img: '/images/testimonials/t3.jpg' },
    { n: 'Ana R.', r: 'E-commerce', t: 'Antes perdia el 70% de los mensajes. Ahora respondo al 100% automaticamente.', m: '100% respuesta', e: '📱', img: '/images/testimonials/t4.jpg' },
    { n: 'Luis G.', r: 'Servicios', t: 'Configure mi bot en 10 minutos. Esa misma noche tuve mi primera venta automatica.', m: 'Venta en 10 min', e: '⚡', img: '/images/testimonials/t5.jpg' },
    { n: 'Sofia T.', r: 'Cosmeticos', t: 'El seguimiento automatico recupero clientes que ya daba por perdidos.', m: '+45% recuperados', e: '📈', img: '/images/testimonials/t6.jpg' },
    { n: 'Diego M.', r: 'Tecnologia', t: 'Escale de 20 a 200 ventas mensuales sin contratar a nadie mas.', m: '10x mas ventas', e: '🚀', img: '/images/testimonials/t7.jpg' },
    { n: 'Laura P.', r: 'Moda', t: 'Mis clientas reciben respuesta inmediata a las 3am. Imposible sin el bot.', m: '24/7 activo', e: '🌙', img: '/images/testimonials/t8.jpg' },
    { n: 'Roberto C.', r: 'Alimentos', t: 'El bot maneja pedidos, confirma pagos y da seguimiento. Es mi mejor empleado.', m: 'Automatizacion total', e: '🤖', img: '/images/testimonials/t9.jpg' },
    { n: 'Carmen V.', r: 'Joyeria', t: 'Duplique mi facturacion en 2 meses. La IA sabe vender mis productos.', m: '2x facturacion', e: '💎', img: '/images/testimonials/t10.jpg' },
    { n: 'Fernando H.', r: 'Fitness', t: 'Mis clientes reservan clases y compran planes directo por WhatsApp.', m: '+300 reservas', e: '💪', img: '/images/testimonials/t11.jpg' },
    { n: 'Patricia N.', r: 'Educacion', t: 'Vendo cursos online mientras duermo. El bot cierra ventas a cualquier hora.', m: 'Ventas 24/7', e: '📚', img: '/images/testimonials/t12.jpg' },
    { n: 'Miguel A.', r: 'Inmobiliaria', t: 'El bot filtra leads calificados. Solo hablo con los que realmente van a comprar.', m: '3x leads', e: '🏠', img: '/images/testimonials/t13.jpg' },
    { n: 'Isabel D.', r: 'Salud', t: 'Automatice citas y consultas. Mi agenda siempre llena sin esfuerzo.', m: 'Agenda llena', e: '🏥', img: '/images/testimonials/t14.jpg' },
    { n: 'Jorge R.', r: 'Automotriz', t: 'Cada consulta de precio se convierte en una cotizacion automatica. Genial.', m: '+60% cotizaciones', e: '🚗', img: '/images/testimonials/t15.jpg' },
    { n: 'Elena M.', r: 'Decoracion', t: 'El catalogo virtual con WhatsApp fue un game changer para mi negocio.', m: '+$5K/mes', e: '🎨', img: '/images/testimonials/t16.jpg' },
    { n: 'Andres F.', r: 'Consultoria', t: 'Vendo servicios de alto ticket. El bot precalifica y agenda llamadas.', m: '$15K en 30 dias', e: '💼', img: '/images/testimonials/t17.jpg' },
    { n: 'Valentina S.', r: 'Reposteria', t: 'Recibo pedidos automaticos con detalles, fecha y ubicacion. Perfecto.', m: '+200 pedidos/mes', e: '🎂', img: '/images/testimonials/t18.jpg' },
    { n: 'Ricardo L.', r: 'Electronica', t: 'El soporte automatico redujo mis quejas un 80%. Clientes mas felices.', m: '-80% quejas', e: '🔧', img: '/images/testimonials/t19.jpg' },
    { n: 'Daniela O.', r: 'Marketing', t: 'Les instalo Agente de Ventas a mis clientes. Todos ven resultados en la primera semana.', m: '100% satisfaccion', e: '🎯', img: '/images/testimonials/t20.jpg' },
  ]

  const colors = ['#5B8AFF', '#7C3AED', '#10B981', '#F59E0B', '#EF4444', '#06B6D4', '#8B5CF6', '#EC4899']

  return (
    <section ref={sectionRef} className="relative py-8 md:py-28 overflow-hidden">
      {/* Section background — hidden on mobile */}
      <div className="absolute inset-0 pointer-events-none hidden md:block">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1100px] h-[700px] rounded-full" style={{ background: 'radial-gradient(ellipse, rgba(79,124,255,0.1), rgba(124,58,237,0.05) 40%, transparent 70%)' }} />
        <div className="absolute top-[30%] right-[10%] w-[500px] h-[500px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.06), transparent 65%)', filter: 'blur(40px)' }} />
        <div className="absolute bottom-[20%] left-[5%] w-[400px] h-[400px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.06), transparent 65%)', filter: 'blur(40px)' }} />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <div className="text-center mb-5 md:mb-12 px-5 md:px-6" style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(30px)', transition: 'all 0.8s cubic-bezier(0.16,1,0.3,1)' }}>
          <div className="inline-flex items-center gap-2 rounded-full px-3 md:px-4 py-1.5 md:py-2 mb-4 md:mb-6" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', boxShadow: '0 0 20px rgba(245,158,11,0.06)' }}>
            <div className="relative">
              <div className="h-2 w-2 rounded-full bg-amber-400" />
              <div className="absolute inset-0 h-2 w-2 rounded-full bg-amber-400 animate-ping" />
            </div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-400">Resultados reales</span>
          </div>
          <h2 className="text-[22px] sm:text-4xl md:text-[44px] font-extrabold leading-[1.1] tracking-tight text-white mb-2 md:mb-4">
            Miles de ventas automatizadas{' '}
            <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(135deg, #F59E0B, #FBBF24)' }}>todos los dias</span>
          </h2>
          <p className="text-[13px] md:text-[16px] text-gray-400 max-w-xl mx-auto leading-relaxed">
            Resultados reales de negocios que ya estan creciendo con IA
          </p>

          {/* Stats row */}
          <div className="flex items-center justify-center gap-5 md:gap-8 mt-4 md:mt-8">
            {[
              { v: '500+', l: 'Negocios activos', c: '#5B8AFF' },
              { v: '4.9', l: 'Calificacion', c: '#F59E0B' },
              { v: '24/7', l: 'Ventas automaticas', c: '#10B981' },
            ].map((s, i) => (
              <div key={i} className="text-center" style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(15px)', transition: `all 0.6s cubic-bezier(0.16,1,0.3,1) ${0.3 + i * 0.1}s` }}>
                <p className="text-[20px] md:text-[26px] font-extrabold" style={{ color: s.c }}>{s.v}</p>
                <p className="text-[10px] md:text-[11px] text-gray-500 font-medium">{s.l}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Carousel row 1 — left */}
        <div className="relative mb-3 md:mb-5">
          {/* Fade edges */}
          <div className="absolute left-0 top-0 bottom-0 w-24 md:w-40 z-10 pointer-events-none" style={{ background: 'linear-gradient(90deg, #0B1120, transparent)' }} />
          <div className="absolute right-0 top-0 bottom-0 w-24 md:w-40 z-10 pointer-events-none" style={{ background: 'linear-gradient(270deg, #0B1120, transparent)' }} />

          <div className="flex gap-3 md:gap-5 testimonial-marquee-left" style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.8s ease 0.4s' }}>
            {[...all.slice(0, 10), ...all.slice(0, 10)].map((t, i) => (
              <TestimonialCard key={i} t={t} color={colors[i % colors.length]} />
            ))}
          </div>
        </div>

        {/* Carousel row 2 — right */}
        <div className="relative">
          <div className="absolute left-0 top-0 bottom-0 w-24 md:w-40 z-10 pointer-events-none" style={{ background: 'linear-gradient(90deg, #0B1120, transparent)' }} />
          <div className="absolute right-0 top-0 bottom-0 w-24 md:w-40 z-10 pointer-events-none" style={{ background: 'linear-gradient(270deg, #0B1120, transparent)' }} />

          <div className="flex gap-3 md:gap-5 testimonial-marquee-right" style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.8s ease 0.6s' }}>
            {[...all.slice(10, 20), ...all.slice(10, 20)].map((t, i) => (
              <TestimonialCard key={i} t={t} color={colors[(i + 3) % colors.length]} />
            ))}
          </div>
        </div>

        {/* Live activity notification */}
        <div className="flex justify-center mt-5 md:mt-10">
          <div
            className="inline-flex items-center gap-2.5 rounded-full px-5 py-2.5"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              backdropFilter: 'blur(8px)',
              opacity: notifShow ? 1 : 0,
              transform: notifShow ? 'translateY(0) scale(1)' : 'translateY(8px) scale(0.95)',
              transition: 'all 0.4s cubic-bezier(0.16,1,0.3,1)',
            }}
          >
            <span className="text-[14px]">{liveActivities[liveNotif].icon}</span>
            <span className="text-[12px] font-semibold" style={{ color: liveActivities[liveNotif].color }}>{liveActivities[liveNotif].text}</span>
            <div className="flex items-center gap-1 ml-1">
              <div className="relative"><div className="h-1.5 w-1.5 rounded-full bg-green-400" /><div className="absolute inset-0 h-1.5 w-1.5 rounded-full bg-green-400 animate-ping" /></div>
              <span className="text-[9px] text-green-400/70 font-medium">En vivo</span>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute -bottom-px left-0 right-0 section-divider" />
    </section>
  )
}

function TestimonialCard({ t, color }: { t: { n: string; r: string; t: string; m: string; e: string; img: string }; color: string }) {
  return (
    <div
      className="group shrink-0 w-[200px] md:w-[320px] rounded-xl md:rounded-2xl p-3 md:p-5 relative overflow-hidden transition-all duration-300 hover:-translate-y-2 hover:scale-[1.03] cursor-default"
      style={{
        background: 'linear-gradient(145deg, rgba(255,255,255,0.08), rgba(255,255,255,0.04))',
        border: '1px solid rgba(255,255,255,0.12)',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.25), 0 2px 8px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.1)',
      }}
    >
      {/* Hover glow — stronger */}
      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-all duration-500 pointer-events-none" style={{ background: `linear-gradient(145deg, ${color}08, transparent)`, boxShadow: `0 12px 48px rgba(0,0,0,0.3), 0 0 30px ${color}12, inset 0 1px 0 rgba(255,255,255,0.15)`, border: `1px solid ${color}30` }} />
      {/* Top light reflection */}
      <div className="absolute top-0 left-0 right-0 h-[1px] rounded-t-2xl opacity-60 group-hover:opacity-80 transition-opacity" style={{ background: `linear-gradient(90deg, transparent, rgba(255,255,255,0.2) 30%, rgba(255,255,255,0.3) 50%, rgba(255,255,255,0.2) 70%, transparent)` }} />
      {/* Corner accent glow */}
      <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full opacity-25 group-hover:opacity-50 transition-opacity duration-500" style={{ background: `radial-gradient(circle, ${color}, transparent 70%)` }} />

      <div className="relative">
        {/* Result badge — vivid background */}
        <div className="inline-flex items-center gap-1.5 md:gap-2 rounded-xl px-2 md:px-3 py-1 md:py-1.5 mb-2 md:mb-4" style={{ background: `${color}15`, border: `1px solid ${color}25`, boxShadow: `0 0 12px ${color}10` }}>
          <span className="text-[12px] md:text-[15px]">{t.e}</span>
          <span className="text-[11px] md:text-[13px] font-bold" style={{ color }}>{t.m}</span>
        </div>

        {/* Stars with shimmer */}
        <div className="flex gap-0.5 mb-2 md:mb-3">
          {[1,2,3,4,5].map(s => (
            <div key={s} className="relative">
              <Star className="h-3 w-3 md:h-3.5 md:w-3.5 fill-amber-400 text-amber-400" />
              <Star className="absolute inset-0 h-3 w-3 md:h-3.5 md:w-3.5 fill-amber-300 text-amber-300 testimonial-star-shimmer" style={{ animationDelay: `${s * 0.15}s` }} />
            </div>
          ))}
        </div>

        {/* Testimonial text — white for readability */}
        <p className="text-[11px] md:text-[13px] text-[#CBD5E1] leading-relaxed mb-3 md:mb-5 line-clamp-3 md:line-clamp-none">&ldquo;{t.t}&rdquo;</p>

        {/* Author */}
        <div className="flex items-center gap-2 md:gap-3">
          <div className="relative">
            <Image src={t.img} alt={t.n} width={40} height={40} loading="lazy" className="h-8 w-8 md:h-10 md:w-10 rounded-full object-cover" style={{ border: `2px solid ${color}60`, boxShadow: `0 0 10px ${color}20` }} />
            <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 md:h-3.5 md:w-3.5 rounded-full border-2 flex items-center justify-center" style={{ borderColor: '#0B1120', background: '#10B981' }}>
              <Check className="h-1.5 w-1.5 md:h-2 md:w-2 text-white" />
            </div>
          </div>
          <div>
            <p className="text-[11px] md:text-[13px] font-semibold text-white">{t.n}</p>
            <p className="text-[10px] md:text-[11px] text-[#8899B4]">{t.r}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── S7: Final CTA — Immersive Close ────────────────────────

function FinalCTA() {
  const rev = useReveal()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Mini particles for CTA background
  useEffect(() => {
    const c = canvasRef.current
    if (!c) return
    const ctx = c.getContext('2d')
    if (!ctx) return
    let raf: number, W = 0, H = 0
    const PAL = [[79,124,255],[124,58,237],[86,204,242]]
    const dots: { x: number; y: number; vx: number; vy: number; r: number; h: number; p: number }[] = []
    const N = innerWidth < 768 ? 15 : 50

    function resize() {
      const dpr = Math.min(devicePixelRatio || 1, 2)
      const rect = c!.parentElement!.getBoundingClientRect()
      W = rect.width; H = rect.height
      c!.width = W * dpr; c!.height = H * dpr
      c!.style.width = W + 'px'; c!.style.height = H + 'px'
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    function init() {
      resize(); dots.length = 0
      for (let i = 0; i < N; i++) dots.push({
        x: Math.random() * W, y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.2, vy: (Math.random() - 0.5) * 0.2,
        r: 0.6 + Math.random() * 1.2, h: Math.floor(Math.random() * 3),
        p: Math.random() * Math.PI * 2,
      })
    }

    function draw() {
      ctx!.clearRect(0, 0, W, H)
      const t = Date.now() * 0.001
      for (const d of dots) {
        d.x += d.vx; d.y += d.vy; d.p += 0.01
        if (d.x < 0 || d.x > W) d.vx *= -1
        if (d.y < 0 || d.y > H) d.vy *= -1
        const a = 0.15 + Math.sin(d.p) * 0.1
        const col = PAL[d.h]
        // Glow
        const g = ctx!.createRadialGradient(d.x, d.y, 0, d.x, d.y, d.r * 4)
        g.addColorStop(0, `rgba(${col[0]},${col[1]},${col[2]},${a * 0.3})`)
        g.addColorStop(1, `rgba(${col[0]},${col[1]},${col[2]},0)`)
        ctx!.beginPath(); ctx!.arc(d.x, d.y, d.r * 4, 0, Math.PI * 2)
        ctx!.fillStyle = g; ctx!.fill()
        // Dot
        ctx!.beginPath(); ctx!.arc(d.x, d.y, d.r, 0, Math.PI * 2)
        ctx!.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},${a})`; ctx!.fill()
      }
      // Connections
      for (let i = 0; i < dots.length; i++) {
        for (let j = i + 1; j < dots.length; j++) {
          const dx = dots[i].x - dots[j].x, dy = dots[i].y - dots[j].y
          const d = Math.sqrt(dx * dx + dy * dy)
          if (d < 100) {
            const col = PAL[dots[i].h]
            ctx!.beginPath(); ctx!.moveTo(dots[i].x, dots[i].y); ctx!.lineTo(dots[j].x, dots[j].y)
            ctx!.strokeStyle = `rgba(${col[0]},${col[1]},${col[2]},${0.06 * (1 - d / 100)})`
            ctx!.lineWidth = 0.4; ctx!.stroke()
          }
        }
      }
      raf = requestAnimationFrame(draw)
    }

    init(); draw()
    addEventListener('resize', init)
    return () => { cancelAnimationFrame(raf); removeEventListener('resize', init) }
  }, [])

  // Live activity notifications
  const activities = [
    { icon: '💰', text: '+1 venta hace 2 min', color: '#10B981' },
    { icon: '👤', text: 'Cliente activo ahora', color: '#5B8AFF' },
    { icon: '🛒', text: '3 usuarios comprando', color: '#F59E0B' },
    { icon: '🤖', text: 'Bot respondio 8 clientes', color: '#7C3AED' },
    { icon: '✅', text: 'Pedido confirmado $149', color: '#10B981' },
    { icon: '📈', text: '+23% ventas esta semana', color: '#5B8AFF' },
  ]

  const [actIdx, setActIdx] = useState(0)
  const [actVisible, setActVisible] = useState(true)

  useEffect(() => {
    const interval = setInterval(() => {
      setActVisible(false)
      setTimeout(() => {
        setActIdx(p => (p + 1) % activities.length)
        setActVisible(true)
      }, 400)
    }, 2800)
    return () => clearInterval(interval)
  }, [activities.length])

  // Live chat simulation
  const chatMsgs = [
    { from: 'c', text: 'Hola, cuanto cuesta?' },
    { from: 'b', text: 'El Pack Pro esta a $99/mes con 20% OFF' },
    { from: 'c', text: 'Lo quiero!' },
    { from: 'b', text: 'Listo! Pedido registrado' },
  ]
  const [chatStep, setChatStep] = useState(0)
  const [chatTyping, setChatTyping] = useState(false)

  useEffect(() => {
    if (chatStep >= chatMsgs.length) {
      const t = setTimeout(() => setChatStep(0), 2500)
      return () => clearTimeout(t)
    }
    setChatTyping(true)
    const delay = chatMsgs[chatStep].from === 'b' ? 900 : 600
    const t = setTimeout(() => { setChatTyping(false); setChatStep(s => s + 1) }, delay)
    return () => clearTimeout(t)
  }, [chatStep, chatMsgs.length])

  return (
    <section className="relative py-8 md:py-28 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0" style={{
        background: 'linear-gradient(160deg, #0c1a3a 0%, #14204a 30%, #1a1545 60%, #0f1832 100%)',
      }} />
      {/* Radial glow center */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(79,124,255,0.12), rgba(124,58,237,0.06) 50%, transparent 70%)' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full cta-pulse-glow" style={{ background: 'radial-gradient(circle, rgba(79,124,255,0.08), transparent 70%)' }} />
      </div>
      {/* Particles canvas */}
      <div className="absolute inset-0 pointer-events-none">
        <canvas ref={canvasRef} className="w-full h-full" />
      </div>
      {/* Energy wave rings — hidden on mobile */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none hidden md:block">
        <div className="w-[400px] h-[400px] rounded-full border border-white/[0.03] cta-ring-1" />
      </div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none hidden md:block">
        <div className="w-[600px] h-[600px] rounded-full border border-white/[0.02] cta-ring-2" />
      </div>

      {/* Content */}
      <div ref={rev} className="scroll-reveal relative z-10 max-w-6xl mx-auto px-5 md:px-6">
        <div className="grid lg:grid-cols-2 gap-6 md:gap-12 items-center">

          {/* Left: Text + CTA */}
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-3 md:mb-6" style={{ background: 'rgba(79,124,255,0.12)', border: '1px solid rgba(79,124,255,0.25)' }}>
              <div className="h-2 w-2 rounded-full bg-green-400 cta-live-dot" />
              <span className="text-[11px] font-semibold text-[#5B8AFF]">Sistema activo ahora</span>
            </div>

            <h2 className="text-[22px] sm:text-4xl md:text-[44px] font-extrabold leading-[1.1] tracking-tight text-white mb-2 md:mb-4">
              Empieza a vender mientras <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(135deg, #5B8AFF, #A78BFA, #38BDF8)' }}>otros duermen</span>
            </h2>
            <p className="text-[13px] md:text-[16px] text-gray-400 max-w-lg mb-4 md:mb-8 leading-relaxed mx-auto lg:mx-0">
              Tu agente trabaja 24/7, responde clientes y cierra ventas automaticamente. Sin descanso, sin errores, sin limites.
            </p>

            {/* Checkmarks */}
            <div className="flex flex-wrap gap-x-4 md:gap-x-6 gap-y-2 mb-4 md:mb-8 justify-center lg:justify-start">
              {['Configuracion en 5 min', 'Sin tarjeta de credito', 'Cancela cuando quieras'].map((t, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-400/80" />
                  <span className="text-[12px] text-gray-400">{t}</span>
                </div>
              ))}
            </div>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row gap-2.5 justify-center lg:justify-start mb-4 md:mb-6">
              <Link href="/register" className="group cta-btn-primary flex items-center justify-center gap-2.5 rounded-2xl px-7 md:px-8 h-12 md:h-14 text-[14px] md:text-[16px] font-bold text-white" style={{ background: 'linear-gradient(135deg, #5B8AFF, #7C3AED)' }}>
                Crear mi agente ahora <ArrowRight className="h-4.5 w-4.5 transition-transform group-hover:translate-x-1.5" />
              </Link>
              <Link href="#como-funciona" className="flex items-center justify-center gap-2 rounded-2xl px-7 h-12 md:h-14 text-[14px] md:text-[15px] font-medium text-gray-300 transition-all duration-300 hover:text-white" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                Ver como funciona
              </Link>
            </div>

            {/* Live activity notification */}
            <div className="flex justify-center lg:justify-start">
              <div
                className="inline-flex items-center gap-2.5 rounded-full px-4 py-2 transition-all duration-400"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  opacity: actVisible ? 1 : 0,
                  transform: actVisible ? 'translateY(0)' : 'translateY(6px)',
                }}
              >
                <span className="text-[13px]">{activities[actIdx].icon}</span>
                <span className="text-[12px] font-medium" style={{ color: activities[actIdx].color }}>{activities[actIdx].text}</span>
              </div>
            </div>
          </div>

          {/* Right: Live simulation */}
          <div className="flex flex-col items-center gap-4">
            {/* Mini chat */}
            <div className="w-full max-w-[320px] rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(12px)', boxShadow: '0 8px 40px rgba(0,0,0,0.3)' }}>
              <div className="flex items-center gap-2.5 px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="h-7 w-7 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #5B8AFF, #7C3AED)' }}>
                  <Bot className="h-3.5 w-3.5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-[11px] font-semibold text-white">Agente de Ventas Bot</p>
                  <div className="flex items-center gap-1"><div className="h-1.5 w-1.5 rounded-full bg-green-400 cta-live-dot" /><p className="text-[8px] text-green-400">En vivo</p></div>
                </div>
              </div>
              <div className="p-3 space-y-2 min-h-[160px]">
                {chatMsgs.slice(0, chatStep).map((m, i) => (
                  <div key={i} className={`flex ${m.from === 'b' ? 'justify-start' : 'justify-end'}`} style={{ animation: 'fade-in-up 0.25s ease-out' }}>
                    <div className={`rounded-xl px-3 py-2 max-w-[80%] ${m.from === 'b' ? '' : ''}`} style={{
                      background: m.from === 'b' ? 'rgba(79,124,255,0.12)' : 'rgba(255,255,255,0.08)',
                      border: `1px solid ${m.from === 'b' ? 'rgba(79,124,255,0.2)' : 'rgba(255,255,255,0.08)'}`,
                    }}>
                      <p className="text-[11px] text-gray-200 leading-relaxed">{m.text}</p>
                    </div>
                  </div>
                ))}
                {chatTyping && chatStep < chatMsgs.length && (
                  <div className={`flex ${chatMsgs[chatStep].from === 'b' ? 'justify-start' : 'justify-end'}`}>
                    <div className="flex gap-1 px-3 py-2.5 rounded-xl" style={{ background: 'rgba(79,124,255,0.1)' }}>
                      <div className="h-1.5 w-1.5 rounded-full bg-blue-400/60 typing-dot" />
                      <div className="h-1.5 w-1.5 rounded-full bg-blue-400/60 typing-dot" />
                      <div className="h-1.5 w-1.5 rounded-full bg-blue-400/60 typing-dot" />
                    </div>
                  </div>
                )}
                {chatStep >= chatMsgs.length && (
                  <div className="flex justify-center pt-1" style={{ animation: 'fade-in-up 0.3s ease-out' }}>
                    <div className="flex items-center gap-1.5 rounded-full px-3 py-1" style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.25)' }}>
                      <CheckCircle2 className="h-3 w-3 text-green-400" /><span className="text-[9px] font-semibold text-green-400">Venta cerrada</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Status cards */}
            <div className="grid grid-cols-2 gap-3 w-full max-w-[320px]">
              {[
                { icon: CheckCircle2, label: 'Pedido registrado', color: '#10B981' },
                { icon: Users, label: 'Cliente satisfecho', color: '#5B8AFF' },
              ].map((s, i) => (
                <div key={i} className="flex items-center gap-2 rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <s.icon className="h-4 w-4 shrink-0" style={{ color: s.color }} />
                  <p className="text-[10px] font-medium text-gray-300">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Live counter */}
            <div className="flex items-center gap-3 rounded-xl px-5 py-3 w-full max-w-[320px]" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="h-2.5 w-2.5 rounded-full bg-green-400 cta-live-dot" />
              <div className="flex-1">
                <p className="text-[10px] text-gray-500">Ventas cerradas hoy</p>
                <p className="text-[18px] font-bold text-white">+247</p>
              </div>
              <TrendingUp className="h-5 w-5 text-green-400" />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ── Footer ─────────────────────────────────────────────────

function Footer() {
  return (
    <footer style={{ borderTop: '1px solid rgba(91,138,255,0.06)' }}>
      <div className="max-w-5xl mx-auto px-5 md:px-6 py-6 md:py-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <NuroSmile size={30} className="rounded-lg" />
            <div className="flex items-baseline gap-1.5">
              <span className="text-[14px] font-extrabold text-white/90 tracking-tight">Agente de</span>
              <span className="text-[14px] font-extrabold tracking-tight nav-accent-word">Ventas</span>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/login" className="text-[13px] text-[#8899B4]/50 hover:text-white transition-colors duration-300">Iniciar sesion</Link>
            <Link href="/register" className="text-[13px] text-[#8899B4]/50 hover:text-white transition-colors duration-300">Crear cuenta</Link>
          </div>
          <p className="text-[11px] text-[#8899B4]/30">© {new Date().getFullYear()} Agente de Ventas</p>
        </div>
      </div>
    </footer>
  )
}
