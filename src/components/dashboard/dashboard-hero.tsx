'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { Crown, Zap, ArrowRight, Clock, Sparkles, AlertTriangle, ShieldCheck, XCircle } from 'lucide-react'
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
        {showCountdown ? (() => {
          // Urgency tier system
          const tier = days <= 1 ? 'critical' : days <= 3 ? 'urgent' : days <= 7 ? 'soon' : 'normal'
          const styles = {
            normal:   { label: 'Activo',            message: 'Tu plan premium está activo y funcionando.',  ring: 'ring-sky-400/20',     iconCls: 'text-sky-300',     Icon: ShieldCheck,    halo1: 'bg-sky-500/15',     halo2: 'bg-violet-500/10',  tile: 'ring-white/[0.07]',         num: 'text-white',          colon: 'text-sky-300/60',     progress: 'from-sky-400 via-cyan-400 to-violet-400',         pGlow: 'shadow-[0_0_10px_rgba(56,189,248,0.6)]',     pct: 'text-sky-200',     btnGrad: 'from-sky-400 to-sky-500',         btnHover: 'hover:from-sky-300 hover:to-sky-400',         btnShadow: 'shadow-[0_8px_24px_-6px_rgba(56,189,248,0.7),inset_0_1px_0_rgba(255,255,255,0.2)]',  badge: 'bg-sky-500/15 text-sky-200 ring-sky-400/25' },
            soon:     { label: 'Próximo a vencer',  message: 'Tu suscripción vence pronto. Considera renovar.', ring: 'ring-violet-400/25',  iconCls: 'text-violet-300',  Icon: Clock,          halo1: 'bg-violet-500/22',  halo2: 'bg-fuchsia-500/12', tile: 'ring-violet-400/15',        num: 'text-white',          colon: 'text-violet-300/70',  progress: 'from-violet-400 via-fuchsia-400 to-pink-400',     pGlow: 'shadow-[0_0_12px_rgba(167,139,250,0.6)]',    pct: 'text-violet-200',  btnGrad: 'from-violet-500 to-fuchsia-500',  btnHover: 'hover:from-violet-400 hover:to-fuchsia-400',  btnShadow: 'shadow-[0_8px_24px_-6px_rgba(167,139,250,0.7),inset_0_1px_0_rgba(255,255,255,0.2)]', badge: 'bg-violet-500/15 text-violet-200 ring-violet-400/30' },
            urgent:   { label: 'Renovación urgente', message: 'Renueva ahora para evitar interrupciones del servicio.', ring: 'ring-orange-400/30', iconCls: 'text-orange-300',  Icon: AlertTriangle,  halo1: 'bg-orange-500/22',  halo2: 'bg-amber-500/15',   tile: 'ring-orange-400/20',        num: 'text-white',          colon: 'text-orange-300/70',  progress: 'from-orange-400 via-amber-400 to-yellow-400',     pGlow: 'shadow-[0_0_14px_rgba(251,146,60,0.7)]',     pct: 'text-orange-200',  btnGrad: 'from-orange-500 to-amber-500',    btnHover: 'hover:from-orange-400 hover:to-amber-400',    btnShadow: 'shadow-[0_8px_24px_-6px_rgba(251,146,60,0.75)],inset_0_1px_0_rgba(255,255,255,0.2)]',  badge: 'bg-orange-500/15 text-orange-200 ring-orange-400/35' },
            critical: { label: 'Última oportunidad', message: 'Tu acceso premium está por expirar — renueva ya.',     ring: 'ring-red-400/35',     iconCls: 'text-red-300',     Icon: AlertTriangle,  halo1: 'bg-red-500/25',     halo2: 'bg-rose-500/15',    tile: 'ring-red-400/25 animate-pulse', num: 'text-white',          colon: 'text-red-300/80',     progress: 'from-red-400 via-rose-400 to-orange-400',         pGlow: 'shadow-[0_0_16px_rgba(239,68,68,0.8)]',      pct: 'text-red-200',     btnGrad: 'from-red-500 to-rose-500',        btnHover: 'hover:from-red-400 hover:to-rose-400',        btnShadow: 'shadow-[0_8px_28px_-4px_rgba(239,68,68,0.8),inset_0_1px_0_rgba(255,255,255,0.2)]',   badge: 'bg-red-500/15 text-red-200 ring-red-400/40' },
          }[tier]
          const TierIcon = styles.Icon
          return (
            <div className={`relative overflow-hidden rounded-2xl bg-black/45 backdrop-blur-xl ring-1 ${styles.ring} p-4 sm:p-5 transition-all duration-500`}>
              {/* Ambient halos */}
              <div className={`pointer-events-none absolute -top-24 -left-10 w-48 h-48 rounded-full ${styles.halo1} blur-3xl`} />
              <div className={`pointer-events-none absolute -bottom-24 -right-10 w-48 h-48 rounded-full ${styles.halo2} blur-3xl`} />
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />

              <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:gap-6">
                {/* Left: status + countdown + bar */}
                <div className="flex-1 min-w-0">
                  {/* Status row */}
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <TierIcon className={`w-4 h-4 shrink-0 ${styles.iconCls}`} strokeWidth={2} />
                      <div className="min-w-0">
                        <div className={`text-[10px] uppercase tracking-[0.18em] font-semibold ${styles.iconCls}`}>
                          {styles.label}
                        </div>
                        <div className="text-[12px] sm:text-[12.5px] text-white/80 mt-0.5 leading-snug truncate">
                          {styles.message}
                        </div>
                      </div>
                    </div>
                    <span className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wide ring-1 ${styles.badge} shrink-0`}>
                      <Clock className="w-3 h-3" strokeWidth={2.2} />
                      {planName}
                    </span>
                  </div>

                  {/* Clock-style countdown with separators */}
                  <div className="flex items-stretch gap-1.5 sm:gap-2">
                    {([
                      { v: days, l: 'Días' },
                      { v: hours, l: 'Horas' },
                      { v: minutes, l: 'Min' },
                      { v: seconds, l: 'Seg' },
                    ] as const).map(({ v, l }, i, arr) => (
                      <div key={l} className="flex items-stretch gap-1.5 sm:gap-2 flex-1 min-w-0">
                        <div className={`flex-1 rounded-xl bg-gradient-to-b from-white/[0.06] to-white/[0.02] ring-1 ${styles.tile} px-2 py-2 sm:px-3 sm:py-2.5 text-center min-w-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]`}>
                          <div className={`text-[22px] sm:text-[26px] font-semibold tabular-nums leading-none tracking-tight ${styles.num} drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)]`}>
                            {String(v).padStart(2, '0')}
                          </div>
                          <div className="text-[9px] sm:text-[10px] text-white/45 mt-1 uppercase tracking-[0.14em] font-medium">{l}</div>
                        </div>
                        {i < arr.length - 1 && (
                          <div className={`flex items-center text-[20px] sm:text-[24px] font-semibold leading-none ${styles.colon} pb-3 sm:pb-4`}>:</div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Usage bar */}
                  <div className="mt-3.5">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] text-white/50 uppercase tracking-[0.14em] font-medium">Consumido del periodo</span>
                      <span className={`text-[10.5px] ${styles.pct} font-semibold tabular-nums`}>{Math.round(percent)}%</span>
                    </div>
                    <div className="relative h-1.5 rounded-full bg-white/[0.05] overflow-hidden ring-1 ring-white/[0.03]">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${styles.progress} ${styles.pGlow} transition-all duration-700 ease-out`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Right: CTA */}
                <Link
                  href="/subscription"
                  className={`relative group/cta inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-[13px] font-semibold tracking-tight text-white shrink-0 overflow-hidden
                    bg-gradient-to-b ${styles.btnGrad} ${styles.btnHover}
                    ${styles.btnShadow}
                    transition-all duration-300`}
                >
                  <span className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full group-hover/cta:translate-x-full transition-transform duration-1000 ease-out" />
                  <Zap className="relative w-4 h-4" strokeWidth={2.2} />
                  <span className="relative">Renovar plan</span>
                  <ArrowRight className="relative w-3.5 h-3.5 transition-transform duration-300 group-hover/cta:translate-x-0.5" strokeWidth={2.2} />
                </Link>
              </div>
            </div>
          )
        })() : (
          <div className="relative overflow-hidden rounded-2xl bg-black/45 backdrop-blur-xl ring-1 ring-slate-500/20 p-4 sm:p-5">
            <div className="pointer-events-none absolute -top-24 -left-10 w-48 h-48 rounded-full bg-slate-500/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -right-10 w-48 h-48 rounded-full bg-sky-500/10 blur-3xl" />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />

            <div className="relative flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-slate-500/15 ring-1 ring-slate-400/25 flex items-center justify-center shrink-0">
                  <XCircle className="w-5 h-5 text-slate-300" strokeWidth={1.7} />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-slate-300 font-semibold">
                    Sin suscripción activa
                  </div>
                  <div className="text-[13px] text-white/80 mt-1 leading-snug">
                    Activa un plan para desbloquear todos los agentes y la IA premium.
                  </div>
                </div>
              </div>
              <Link
                href="/pricing"
                className="relative group/cta inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-[13px] font-semibold tracking-tight text-white shrink-0 overflow-hidden
                  bg-gradient-to-b from-sky-400 to-sky-500
                  shadow-[0_8px_24px_-6px_rgba(56,189,248,0.7),inset_0_1px_0_rgba(255,255,255,0.2)]
                  hover:from-sky-300 hover:to-sky-400 transition-all duration-300"
              >
                <span className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full group-hover/cta:translate-x-full transition-transform duration-1000 ease-out" />
                <Sparkles className="relative w-4 h-4" strokeWidth={2.2} />
                <span className="relative">Ver planes</span>
                <ArrowRight className="relative w-3.5 h-3.5" strokeWidth={2.2} />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
