'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { AlertTriangle, Zap, X, BarChart3 } from 'lucide-react'

type Level = 'none' | 'warn70' | 'warn90' | 'exhausted'

const MESSAGES: Record<Exclude<Level, 'none'>, string> = {
  warn70: 'Ya utilizaste el 70% de tus créditos de IA del mes. Tu agente continúa funcionando normalmente, pero te recomendamos revisar tu consumo.',
  warn90: 'Tu saldo de créditos de IA está por agotarse. Compra créditos adicionales o mejora tu plan para continuar atendiendo clientes sin interrupciones.',
  exhausted: 'Tus créditos de IA se agotaron temporalmente. Los mensajes de tus clientes continúan registrándose, pero tu agente necesita créditos adicionales para responder automáticamente.',
}

const STYLES: Record<Exclude<Level, 'none'>, { bg: string; border: string; icon: string; label: string }> = {
  warn70:    { bg: 'rgba(251,191,36,0.10)', border: 'rgba(251,191,36,0.32)', icon: '#FBBF24', label: 'INFORMATIVO' },
  warn90:    { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.40)', icon: '#F59E0B', label: 'PRIORITARIO' },
  exhausted: { bg: 'rgba(239,68,68,0.14)',  border: 'rgba(239,68,68,0.45)',  icon: '#EF4444', label: 'CRÍTICO' },
}

/**
 * Alerta global de créditos AI según el nivel de consumo del ciclo.
 *
 * Triggers:
 *   - 70% del included gastado → alerta informativa (dorada)
 *   - 90% del included gastado → alerta prioritaria (naranja)
 *   - 100% del included gastado y saldo total 0 → alerta crítica (roja)
 *
 * Se renderiza fija arriba del contenido. Persiste cerrado por nivel en localStorage
 * (si el user cierra el warn70, no vuelve a aparecer hasta que suba a warn90).
 *
 * Polling cada 60s.
 */
type ActiveLevel = Exclude<Level, 'none'>

export function CreditsAlert() {
  const [level, setLevel] = useState<Level>('none')
  const [dismissed, setDismissed] = useState<ActiveLevel | null>(null)

  const evaluate = useCallback(async () => {
    try {
      const res = await fetch('/api/credits/purchase')
      if (!res.ok) return
      const data = await res.json()
      const c = data?.credits
      if (!c) return

      const includedAtStart = Number(c.included ?? 0) + Number(c.used_current_cycle ?? 0)
      const used = Number(c.used_current_cycle ?? 0)
      const totalNow = Number(c.total ?? 0)

      if (includedAtStart <= 0) {
        setLevel('none')
        return
      }
      const pct = used / includedAtStart
      // 'exhausted' solo si total general (incluidos + adicionales) está en 0
      if (totalNow <= 0)         setLevel('exhausted')
      else if (pct >= 0.9)       setLevel('warn90')
      else if (pct >= 0.7)       setLevel('warn70')
      else                       setLevel('none')
    } catch { /* silent */ }
  }, [])

  useEffect(() => {
    // Leer el último dismiss
    try {
      const v = window.localStorage.getItem('credits_alert_dismissed')
      if (v === 'warn70' || v === 'warn90' || v === 'exhausted') setDismissed(v)
    } catch { /* silent */ }

    evaluate()
    const id = setInterval(evaluate, 60000)
    return () => clearInterval(id)
  }, [evaluate])

  const handleClose = () => {
    if (level === 'none') return
    setDismissed(level)
    try { window.localStorage.setItem('credits_alert_dismissed', level) } catch { /* silent */ }
  }

  if (level === 'none') return null
  const currentLevel: ActiveLevel = level

  // Si el user descartó este nivel, no mostrar (a menos que escale a un nivel superior)
  const order: Record<ActiveLevel, number> = { warn70: 1, warn90: 2, exhausted: 3 }
  if (dismissed && order[currentLevel] <= order[dismissed]) return null

  const s = STYLES[currentLevel]
  const msg = MESSAGES[currentLevel]

  return (
    <div className="sticky top-0 z-30 px-4 lg:px-6 pt-3 lg:pt-4">
      <div
        className="relative rounded-xl p-4 lg:p-5 backdrop-blur-xl"
        style={{
          background: s.bg,
          border: `1px solid ${s.border}`,
          boxShadow: `0 12px 28px -10px ${s.border}`,
        }}
      >
        <div className="flex items-start gap-3">
          <div className="shrink-0 mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ background: `${s.icon}22`, border: `1px solid ${s.icon}55` }}>
            <AlertTriangle className="h-4 w-4" style={{ color: s.icon }} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[9.5px] uppercase font-bold"
                style={{ color: s.icon, letterSpacing: '0.18em' }}>
                {s.label}
              </span>
            </div>
            <p className="text-[13px] text-white/90 leading-relaxed">{msg}</p>

            <div className="flex flex-wrap gap-2 mt-3">
              <Link
                href="/wallet"
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-white text-[11.5px] font-semibold transition-colors"
                style={{
                  background: 'linear-gradient(135deg, #6B5CFF, #8E44FF, #D45BFF)',
                  boxShadow: '0 6px 14px -4px rgba(142,68,255,0.5)',
                }}>
                <Zap className="h-3 w-3" /> Comprar créditos
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-white/85 hover:text-white text-[11.5px] font-medium transition-colors"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)' }}>
                Mejorar mi plan
              </Link>
              <Link
                href="/wallet/history"
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-white/70 hover:text-white text-[11.5px] font-medium transition-colors"
                style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.08)' }}>
                <BarChart3 className="h-3 w-3" /> Ver consumo
              </Link>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="shrink-0 text-white/45 hover:text-white/85 transition-colors"
            aria-label="Cerrar alerta"
            title="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
