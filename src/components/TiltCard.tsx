'use client'

import React, { useEffect, useRef, useCallback, useMemo } from 'react'
import './TiltCard.css'

const clamp = (v: number, min = 0, max = 100) => Math.min(Math.max(v, min), max)
const round = (v: number, p = 3) => parseFloat(v.toFixed(p))
const adjust = (v: number, fMin: number, fMax: number, tMin: number, tMax: number) =>
  round(tMin + ((tMax - tMin) * (v - fMin)) / (fMax - fMin))

interface TiltCardProps {
  children: React.ReactNode
  glowColor?: string
  shineOpacity?: number
  className?: string
  style?: React.CSSProperties
  cardStyle?: React.CSSProperties
}

export default function TiltCard({
  children,
  glowColor = 'rgba(210, 3, 221, 0.55)',
  shineOpacity = 0.35,
  className = '',
  style,
  cardStyle,
}: TiltCardProps) {
  const wrapRef    = useRef<HTMLDivElement>(null)
  const shellRef   = useRef<HTMLDivElement>(null)
  const enterTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const leaveRaf   = useRef<number | null>(null)
  // true while a pointer is actively inside this card
  const pointerIn  = useRef(false)

  // ── Tilt engine ───────────────────────────────────────────────────────────
  const engine = useMemo(() => {
    let raf: number | null = null, running = false, lastTs = 0
    let cx = 0, cy = 0, tx = 0, ty = 0
    let initialUntil = 0

    const setVars = (x: number, y: number) => {
      const wrap  = wrapRef.current
      const shell = shellRef.current
      if (!wrap || !shell) return
      const w = shell.clientWidth  || 1
      const h = shell.clientHeight || 1
      const px = clamp((100 / w) * x)
      const py = clamp((100 / h) * y)
      const cpx = px - 50, cpy = py - 50
      const vars: [string, string][] = [
        ['--pointer-x',           `${px}%`],
        ['--pointer-y',           `${py}%`],
        ['--background-x',        `${adjust(px, 0, 100, 35, 65)}%`],
        ['--background-y',        `${adjust(py, 0, 100, 35, 65)}%`],
        ['--pointer-from-center', `${clamp(Math.hypot(py - 50, px - 50) / 50, 0, 1)}`],
        ['--pointer-from-top',    `${py / 100}`],
        ['--pointer-from-left',   `${px / 100}`],
        ['--rotate-x',            `${round(-(cpx / 7))}deg`],
        ['--rotate-y',            `${round(cpy   / 6)}deg`],
      ]
      for (const [k, v] of vars) wrap.style.setProperty(k, v)
    }

    const step = (ts: number) => {
      if (!running) return
      if (lastTs === 0) lastTs = ts
      const dt = (ts - lastTs) / 1000; lastTs = ts
      const tau = ts < initialUntil ? 0.6 : 0.14
      const k = 1 - Math.exp(-dt / tau)
      cx += (tx - cx) * k; cy += (ty - cy) * k
      setVars(cx, cy)
      const far = Math.abs(tx - cx) > 0.05 || Math.abs(ty - cy) > 0.05
      if (far || document.hasFocus()) raf = requestAnimationFrame(step)
      else { running = false; lastTs = 0; if (raf) { cancelAnimationFrame(raf); raf = null } }
    }

    const start = () => { if (running) return; running = true; lastTs = 0; raf = requestAnimationFrame(step) }

    return {
      immediate(x: number, y: number) { cx = x; cy = y; setVars(cx, cy) },
      target(x: number, y: number)    { tx = x; ty = y; start() },
      center() {
        const s = shellRef.current; if (!s) return
        this.target(s.clientWidth / 2, s.clientHeight / 2)
      },
      init(ms: number) { initialUntil = performance.now() + ms; start() },
      pos()   { return { x: cx, y: cy, tx, ty } },
      cancel(){ if (raf) cancelAnimationFrame(raf); raf = null; running = false; lastTs = 0 },
    }
  }, [])

  const offset = (e: PointerEvent, el: HTMLElement) => {
    const r = el.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }

  const onEnter = useCallback((e: PointerEvent) => {
    const shell = shellRef.current; if (!shell) return
    pointerIn.current = true
    shell.classList.add('tc-active', 'tc-entering')
    wrapRef.current?.style.setProperty('--card-opacity', '1')
    if (enterTimer.current) clearTimeout(enterTimer.current)
    enterTimer.current = setTimeout(() => shell.classList.remove('tc-entering'), 180)
    const { x, y } = offset(e, shell)
    engine.target(x, y)
  }, [engine])

  const onMove = useCallback((e: PointerEvent) => {
    const shell = shellRef.current; if (!shell) return
    const { x, y } = offset(e, shell)
    engine.target(x, y)
  }, [engine])

  const onLeave = useCallback(() => {
    const shell = shellRef.current; if (!shell) return
    pointerIn.current = false
    engine.center()
    const check = () => {
      const { x, y, tx, ty } = engine.pos()
      if (Math.hypot(tx - x, ty - y) < 0.6) {
        shell.classList.remove('tc-active')
        wrapRef.current?.style.setProperty('--card-opacity', '0')
        leaveRaf.current = null
      } else leaveRaf.current = requestAnimationFrame(check)
    }
    if (leaveRaf.current) cancelAnimationFrame(leaveRaf.current)
    leaveRaf.current = requestAnimationFrame(check)
  }, [engine])

  useEffect(() => {
    const shell = shellRef.current; if (!shell) return
    shell.addEventListener('pointerenter', onEnter as EventListener)
    shell.addEventListener('pointermove',  onMove  as EventListener)
    shell.addEventListener('pointerleave', onLeave as EventListener)

    // Subtle intro animation
    const iX = (shell.clientWidth  || 0) - 60
    engine.immediate(iX, 50)
    engine.center()
    engine.init(1000)

    // ── Device orientation (gyroscope) ─────────────────────────────────────
    // gamma = left/right tilt (-90..90), beta = front/back (-180..180 clamped to -45..45)
    const onOrientation = (e: DeviceOrientationEvent) => {
      if (pointerIn.current) return          // pointer wins over gyro
      const shell2 = shellRef.current; if (!shell2) return
      const gamma = clamp((e.gamma ?? 0), -45, 45)   // -45..45 → left/right
      const beta  = clamp((e.beta  ?? 0) - 20, -35, 35) // offset by 20° (natural hold)

      // Map tilt angles to card coordinates
      const w = shell2.clientWidth  || 1
      const h = shell2.clientHeight || 1
      const x = ((gamma + 45) / 90) * w
      const y = ((beta  + 35) / 70) * h

      shell2.classList.add('tc-active')
      wrapRef.current?.style.setProperty('--card-opacity', '1')
      engine.target(x, y)
    }

    window.addEventListener('deviceorientation', onOrientation)

    return () => {
      shell.removeEventListener('pointerenter', onEnter as EventListener)
      shell.removeEventListener('pointermove',  onMove  as EventListener)
      shell.removeEventListener('pointerleave', onLeave as EventListener)
      window.removeEventListener('deviceorientation', onOrientation)
      if (enterTimer.current) clearTimeout(enterTimer.current)
      if (leaveRaf.current)   cancelAnimationFrame(leaveRaf.current)
      engine.cancel()
      shell.classList.remove('tc-active', 'tc-entering')
    }
  }, [engine, onEnter, onMove, onLeave])

  return (
    <div
      ref={wrapRef}
      className={`tc-wrapper ${className}`.trim()}
      style={{
        '--behind-glow-color': glowColor,
        '--shine-opacity': shineOpacity,
        '--card-opacity': '0',
        ...style,
      } as React.CSSProperties}
    >
      <div className="tc-behind" />
      <div ref={shellRef} className="tc-shell">
        <div className="tc-card" style={cardStyle}>
          <div className="tc-shine" />
          <div className="tc-glare" />
          <div className="tc-content">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
