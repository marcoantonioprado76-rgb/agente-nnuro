'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Sparkles, Zap, History, ArrowRight, Loader2, Calendar } from 'lucide-react'

interface CreditsState {
  included: number
  additional: number
  total: number
  used_current_cycle: number
  last_recharge_date: string | null
  next_recharge_date: string | null
}

/**
 * CreditsCard — widget reutilizable del balance de créditos AI.
 *
 * Muestra:
 *   - Saldo total (included + additional)
 *   - Desglose included vs additional
 *   - Barra de progreso del uso del ciclo (used vs included al inicio)
 *   - Fecha próxima recarga
 *   - Botones: Comprar créditos / Mejorar plan / Ver historial
 *
 * Polling cada 30s + refetch on window focus.
 */
export function CreditsCard({ compact = false }: { compact?: boolean }) {
  const [credits, setCredits] = useState<CreditsState | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/credits/purchase')
      if (res.ok) {
        const data = await res.json()
        setCredits(data?.credits ?? null)
      }
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    fetchData()
    const id = setInterval(fetchData, 30000)
    const onFocus = () => fetchData()
    window.addEventListener('focus', onFocus)
    return () => {
      clearInterval(id)
      window.removeEventListener('focus', onFocus)
    }
  }, [fetchData])

  if (loading) {
    return (
      <div className="rounded-2xl p-6 flex items-center justify-center min-h-[180px]"
        style={{
          background: 'rgba(11,16,38,0.6)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}>
        <Loader2 className="h-6 w-6 text-purple-400 animate-spin" />
      </div>
    )
  }

  // Calcular % del ciclo usado (included)
  const includedAtStart = (credits?.included ?? 0) + (credits?.used_current_cycle ?? 0)
  const used = credits?.used_current_cycle ?? 0
  const pct = includedAtStart > 0 ? Math.min(100, (used / includedAtStart) * 100) : 0
  const pctColor = pct >= 100 ? '#EF4444' : pct >= 90 ? '#F59E0B' : pct >= 70 ? '#FBBF24' : '#10B981'

  const total = credits?.total ?? 0
  const included = credits?.included ?? 0
  const additional = credits?.additional ?? 0

  const nextRecharge = credits?.next_recharge_date
    ? new Date(credits.next_recharge_date)
    : null

  return (
    <div
      className="rounded-2xl p-6 lg:p-7 relative overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, rgba(29,46,109,0.4), rgba(11,16,38,0.78))',
        border: '1px solid rgba(142,68,255,0.22)',
        boxShadow: '0 24px 50px -18px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.02)',
      }}
    >
      {/* Ambient glow */}
      <div className="pointer-events-none absolute -top-16 -right-16 w-44 h-44 rounded-full opacity-60"
        style={{ background: 'radial-gradient(circle, rgba(142,68,255,0.35), transparent 65%)', filter: 'blur(32px)' }} />

      {/* Header */}
      <div className="relative flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ background: 'rgba(212,91,255,0.16)', border: '1px solid rgba(212,91,255,0.32)' }}>
            <Sparkles className="h-4 w-4" style={{ color: '#D45BFF' }} />
          </div>
          <div>
            <p className="text-[11px] uppercase font-semibold text-white/55" style={{ letterSpacing: '0.2em' }}>
              Créditos AI
            </p>
            <p className="text-[10.5px] text-white/40">
              Saldo del ciclo
            </p>
          </div>
        </div>
        {!compact && (
          <Link
            href="/wallet/history"
            className="text-[11px] text-white/55 hover:text-white transition-colors flex items-center gap-1"
          >
            <History className="h-3 w-3" />
            Historial
          </Link>
        )}
      </div>

      {/* Total grande */}
      <div className="relative mb-4">
        <div className="flex items-baseline gap-2">
          <span
            className="text-[40px] lg:text-[44px] font-medium tabular-nums leading-none"
            style={{
              fontFamily: 'var(--font-display)',
              letterSpacing: '-0.035em',
              background: 'linear-gradient(180deg, #F8FAFF, #D45BFF)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              filter: 'drop-shadow(0 0 14px rgba(142,68,255,0.4))',
            }}
          >
            {total.toLocaleString()}
          </span>
          <span className="text-[12px] text-white/40 font-medium">créditos</span>
        </div>
      </div>

      {/* Desglose */}
      <div className="relative grid grid-cols-2 gap-2 mb-5">
        <div className="rounded-xl p-3"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(212,91,255,0.14)' }}>
          <p className="text-[9.5px] uppercase font-semibold text-white/45 mb-1" style={{ letterSpacing: '0.16em' }}>
            Plan mensual
          </p>
          <p className="text-[18px] font-semibold text-white tabular-nums">
            {included.toLocaleString()}
          </p>
        </div>
        <div className="rounded-xl p-3"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(16,185,129,0.14)' }}>
          <p className="text-[9.5px] uppercase font-semibold text-white/45 mb-1" style={{ letterSpacing: '0.16em' }}>
            Adicionales
          </p>
          <p className="text-[18px] font-semibold text-white tabular-nums">
            {additional.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Barra de progreso del ciclo */}
      {includedAtStart > 0 && (
        <div className="relative mb-5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10.5px] uppercase font-semibold text-white/55" style={{ letterSpacing: '0.14em' }}>
              Usado este ciclo
            </span>
            <span className="text-[11px] text-white/70 font-medium tabular-nums">
              {used.toLocaleString()} / {includedAtStart.toLocaleString()}
              <span className="text-white/45 ml-1.5">({Math.round(pct)}%)</span>
            </span>
          </div>
          <div className="h-2 rounded-full overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div
              className="h-full transition-all duration-700 ease-out"
              style={{
                width: `${pct}%`,
                background: `linear-gradient(90deg, transparent, ${pctColor})`,
                boxShadow: `0 0 8px ${pctColor}`,
              }}
            />
          </div>
        </div>
      )}

      {/* Próxima recarga */}
      {nextRecharge && (
        <div className="relative flex items-center gap-2 mb-5 text-[11.5px] text-white/55">
          <Calendar className="h-3 w-3" />
          <span>
            Próxima recarga:{' '}
            <span className="text-white/85 font-medium">
              {nextRecharge.toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}
            </span>
          </span>
        </div>
      )}

      {/* Acciones */}
      <div className="relative flex flex-wrap gap-2">
        <Link
          href="/wallet"
          className="flex-1 min-w-[140px] inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl text-white text-[12.5px] font-semibold transition-colors"
          style={{
            background: 'linear-gradient(135deg, #6B5CFF, #8E44FF, #D45BFF)',
            boxShadow: '0 10px 22px -6px rgba(142,68,255,0.55)',
            letterSpacing: '0.05em',
          }}
        >
          <Zap className="h-3.5 w-3.5" /> Comprar créditos
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
        <Link
          href="/pricing"
          className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl text-white/85 hover:text-white text-[12.5px] font-medium transition-colors"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.10)',
          }}
        >
          Mejorar plan
        </Link>
      </div>
    </div>
  )
}
