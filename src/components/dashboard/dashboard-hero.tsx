'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { Crown, Zap, ArrowRight, Clock, Sparkles } from 'lucide-react'
import type { Profile } from '@/types'

const SLIDES = [
  'https://i.ibb.co/wFFk5bPt/APP-1.webp',
  'https://i.ibb.co/0pvDw6sJ/APP-2.jpg',
  'https://i.ibb.co/TMMTrd6b/APP3.avif',
  'https://i.ibb.co/BHfrx3Y7/APP-4.webp',
]

interface Subscription {
  status?: string
  approval_status?: string
  start_date?: string
  end_date?: string
  plan?: { name?: string; slug?: string }
}

interface Props {
  profile: Profile | null
}

export function DashboardHero({ profile }: Props) {
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const touchStartX = useRef<number | null>(null)

  // Auto-rotate every 5s, pause on hover
  useEffect(() => {
    if (paused) return
    const id = setInterval(() => setActive(i => (i + 1) % SLIDES.length), 5000)
    return () => clearInterval(id)
  }, [paused])

  // Tick every second for countdown
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  // Fetch subscription once
  useEffect(() => {
    fetch('/api/subscriptions')
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (d && typeof d === 'object') setSubscription(d) })
      .catch(() => { /* silent */ })
  }, [])

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null
  }, [])
  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    const start = touchStartX.current
    if (start == null) return
    const dx = (e.changedTouches[0]?.clientX ?? start) - start
    if (Math.abs(dx) > 40) {
      setActive(i => (dx < 0 ? (i + 1) % SLIDES.length : (i - 1 + SLIDES.length) % SLIDES.length))
    }
    touchStartX.current = null
  }, [])

  // User
  const firstName = profile?.full_name?.split(' ')[0] || 'Usuario'
  const fullName  = profile?.full_name?.toUpperCase() || 'AGENTE NURO'
  const handle    = profile?.email?.split('@')[0]?.toLowerCase() || ''
  const initials  = firstName.slice(0, 2).toUpperCase()

  // Subscription
  const isActiveSub = subscription?.status === 'active' && subscription?.approval_status === 'approved'
  const planName   = subscription?.plan?.name || 'Sin plan'
  const endMs   = subscription?.end_date ? new Date(subscription.end_date).getTime() : 0
  const startMs = subscription?.start_date ? new Date(subscription.start_date).getTime() : 0
  const diff    = Math.max(0, endMs - now)
  const days    = Math.floor(diff / 86_400_000)
  const hours   = Math.floor((diff / 3_600_000) % 24)
  const minutes = Math.floor((diff / 60_000) % 60)
  const seconds = Math.floor((diff / 1000) % 60)

  let percent = 0
  if (startMs && endMs && endMs > startMs) {
    const total = endMs - startMs
    const elapsed = Math.max(0, now - startMs)
    percent = Math.max(0, Math.min(100, (elapsed / total) * 100))
  }
  const showCountdown = isActiveSub && endMs > 0

  return (
    <div
      className="group relative overflow-hidden rounded-3xl ring-1 ring-white/[0.06] shadow-[0_20px_60px_-20px_rgba(56,189,248,0.35)]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Slides */}
      <div className="relative w-full min-h-[420px] sm:min-h-[460px] lg:min-h-[440px]">
        {SLIDES.map((src, i) => (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            key={src}
            src={src}
            alt=""
            aria-hidden="true"
            className={`absolute inset-0 w-full h-full object-cover transition-all duration-[1200ms] ease-out
              ${i === active ? 'opacity-100 scale-100' : 'opacity-0 scale-[1.04]'}`}
            loading={i === 0 ? 'eager' : 'lazy'}
          />
        ))}

        {/* Cinematic overlays */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-[#05070A]/95 via-[#05070A]/55 to-[#05070A]/15" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#05070A]/35 via-transparent to-[#05070A]/85" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_75%_15%,rgba(56,189,248,0.20),transparent_55%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_85%,rgba(139,92,246,0.14),transparent_55%)]" />
        {/* Top sheen */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      </div>

      {/* TOP — slide indicators */}
      <div className="absolute top-5 left-5 right-5 sm:top-6 sm:left-6 sm:right-6 flex items-center justify-between">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md ring-1 ring-white/10">
          <Sparkles className="w-3.5 h-3.5 text-sky-300" strokeWidth={1.8} />
          <span className="text-[10.5px] uppercase tracking-[0.18em] text-sky-200 font-semibold">Panel IA</span>
        </div>
        <div className="flex items-center gap-1.5">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              aria-label={`Slide ${i + 1}`}
              className={`h-1.5 rounded-full transition-all duration-500 ${
                i === active
                  ? 'w-7 bg-sky-300 shadow-[0_0_8px_rgba(56,189,248,0.7)]'
                  : 'w-1.5 bg-white/25 hover:bg-white/40'
              }`}
            />
          ))}
        </div>
      </div>

      {/* CENTER — user identity */}
      <div className="absolute inset-x-5 top-[28%] sm:top-[24%] sm:left-8 sm:right-auto">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-14 h-14 sm:w-[68px] sm:h-[68px] rounded-full bg-gradient-to-br from-sky-400 via-cyan-400 to-violet-500 p-[2px] shadow-[0_0_25px_-4px_rgba(56,189,248,0.6)]">
              <div className="w-full h-full rounded-full overflow-hidden bg-[#05070A] flex items-center justify-center">
                {profile?.avatar_url ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={profile.avatar_url} alt={firstName} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[17px] sm:text-lg font-semibold text-white tracking-tight">{initials}</span>
                )}
              </div>
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#05070A] flex items-center justify-center">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
              </span>
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <div className="text-[10px] uppercase tracking-[0.18em] text-sky-300/80 font-semibold mb-1">
              Bienvenido de vuelta
            </div>
            <div className="text-[19px] sm:text-[24px] font-semibold text-white tracking-tight leading-none truncate drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)]">
              {fullName}
            </div>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {handle && (
                <span className="text-[12px] text-white/55 font-medium">@{handle}</span>
              )}
              <span className="text-white/20">·</span>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-gradient-to-r from-violet-500/25 to-sky-500/25 ring-1 ring-violet-400/30 backdrop-blur-sm">
                <Crown className="w-3 h-3 text-amber-300" strokeWidth={2} />
                <span className="text-[10.5px] font-semibold text-white tracking-tight uppercase">
                  {planName} {isActiveSub ? '· Activo' : ''}
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM — subscription countdown panel */}
      <div className="absolute inset-x-5 bottom-5 sm:inset-x-6 sm:bottom-6">
        {showCountdown ? (
          <div className="relative overflow-hidden rounded-2xl bg-black/40 backdrop-blur-xl ring-1 ring-white/[0.08] p-4 sm:p-5">
            {/* Subtle inner glow */}
            <div className="pointer-events-none absolute -top-20 -left-10 w-40 h-40 rounded-full bg-sky-500/15 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -right-10 w-40 h-40 rounded-full bg-violet-500/10 blur-3xl" />

            <div className="relative flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5">
              {/* Countdown */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-2.5">
                  <Clock className="w-3.5 h-3.5 text-sky-300" strokeWidth={2} />
                  <span className="text-[10.5px] uppercase tracking-[0.18em] text-white/60 font-semibold">
                    Tu plan renueva en
                  </span>
                </div>
                <div className="flex items-stretch gap-2">
                  {[
                    { v: days,    l: 'Días' },
                    { v: hours,   l: 'Horas' },
                    { v: minutes, l: 'Min' },
                    { v: seconds, l: 'Seg' },
                  ].map(({ v, l }, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-xl bg-white/[0.04] ring-1 ring-white/[0.06] px-2.5 py-2 sm:px-3 sm:py-2.5 text-center min-w-0"
                    >
                      <div className="text-[20px] sm:text-[24px] font-semibold text-white tabular-nums leading-none tracking-tight">
                        {String(v).padStart(2, '0')}
                      </div>
                      <div className="text-[9.5px] sm:text-[10px] text-white/45 mt-1 uppercase tracking-[0.12em] font-medium">{l}</div>
                    </div>
                  ))}
                </div>

                {/* Usage bar */}
                <div className="mt-3.5">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] text-white/45 uppercase tracking-wider">Consumido</span>
                    <span className="text-[10.5px] text-sky-200 font-semibold tabular-nums">{Math.round(percent)}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-sky-400 via-cyan-400 to-violet-400 transition-all duration-1000 ease-out shadow-[0_0_8px_rgba(56,189,248,0.5)]"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* CTA */}
              <Link
                href="/subscription"
                className="relative group/cta inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-[13px] font-semibold tracking-tight text-white shrink-0 overflow-hidden
                  bg-gradient-to-b from-sky-400 to-sky-500
                  shadow-[0_8px_24px_-6px_rgba(56,189,248,0.7),inset_0_1px_0_rgba(255,255,255,0.2)]
                  hover:from-sky-300 hover:to-sky-400 transition-all duration-300"
              >
                <span className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full group-hover/cta:translate-x-full transition-transform duration-1000" />
                <Zap className="relative w-4 h-4" strokeWidth={2.2} />
                <span className="relative">Renovar plan</span>
                <ArrowRight className="relative w-3.5 h-3.5" strokeWidth={2.2} />
              </Link>
            </div>
          </div>
        ) : (
          <div className="relative overflow-hidden rounded-2xl bg-black/40 backdrop-blur-xl ring-1 ring-white/[0.08] p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
              <div className="flex-1 min-w-0">
                <div className="text-[10.5px] uppercase tracking-[0.18em] text-sky-300/80 font-semibold mb-1.5">
                  Sin suscripción activa
                </div>
                <div className="text-[14px] text-white/85 leading-snug">
                  Activa un plan para liberar todos los agentes y la IA premium.
                </div>
              </div>
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-[13px] font-semibold tracking-tight text-white shrink-0
                  bg-gradient-to-b from-sky-400 to-sky-500
                  shadow-[0_8px_24px_-6px_rgba(56,189,248,0.7),inset_0_1px_0_rgba(255,255,255,0.2)]
                  hover:from-sky-300 hover:to-sky-400 transition-all"
              >
                <Sparkles className="w-4 h-4" strokeWidth={2.2} />
                Ver planes
                <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.2} />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
