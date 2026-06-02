'use client'

import { useCallback, useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Loader2, Wallet as WalletIcon, ArrowRight, CheckCircle2, XCircle, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

type Purchase = {
  id: string
  amount_usd: number
  status: 'pending' | 'completed' | 'failed' | 'expired'
  stripe_checkout_session_id: string | null
  created_at: string
  completed_at: string | null
}

const MIN_USD = 5
const MAX_USD = 500

export default function WalletPage() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const [balance, setBalance] = useState<number | null>(null)
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [loading, setLoading] = useState(true)
  const [amountStr, setAmountStr] = useState('25')
  const [processing, setProcessing] = useState(false)
  const [verifying, setVerifying] = useState(false)

  const sessionId = searchParams.get('session_id')
  const cancelled = searchParams.get('cancelled')

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/credits/purchase')
      if (res.ok) {
        const data = await res.json()
        setBalance(Number(data.balance_usd ?? 0))
        setPurchases(Array.isArray(data.purchases) ? data.purchases : [])
      }
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // Si volvemos con ?session_id=…, intentar verificar/activar
  useEffect(() => {
    if (!sessionId) return
    let cancelled = false
    let attempts = 0
    const maxAttempts = 12

    setVerifying(true)
    const attempt = async (): Promise<boolean> => {
      try {
        const res = await fetch('/api/stripe/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: sessionId }),
        })
        if (res.ok) {
          const data = await res.json()
          if (data.status === 'activated' || data.status === 'already_active') {
            if (!cancelled) {
              toast.success('¡Créditos recargados!')
              await fetchData()
              router.replace('/wallet')
              setVerifying(false)
            }
            return true
          }
        }
      } catch { /* retry */ }

      attempts++
      if (attempts >= maxAttempts) {
        if (!cancelled) {
          toast.info('Verificación tomando más tiempo de lo esperado. El sistema lo procesará automáticamente.')
          setVerifying(false)
        }
        return true
      }
      return false
    }

    attempt().then((done) => {
      if (done || cancelled) return
      const id = setInterval(async () => {
        const finished = await attempt()
        if (finished || cancelled) clearInterval(id)
      }, 2500)
    })

    return () => { cancelled = true }
  }, [sessionId, fetchData, router])

  useEffect(() => {
    if (cancelled) {
      toast.info('Pago cancelado.')
      router.replace('/wallet')
    }
  }, [cancelled, router])

  const handlePurchase = async () => {
    const amount = Number(amountStr)
    if (!Number.isFinite(amount) || amount < MIN_USD || amount > MAX_USD) {
      toast.error(`El monto debe estar entre $${MIN_USD} y $${MAX_USD} USD`)
      return
    }
    setProcessing(true)
    try {
      const res = await fetch('/api/credits/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount_usd: amount }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data?.error || 'Error al crear sesión de pago')
        setProcessing(false)
        return
      }
      if (data.url) {
        window.location.href = data.url
      } else {
        toast.error('No se recibió URL de pago')
        setProcessing(false)
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al iniciar pago')
      setProcessing(false)
    }
  }

  return (
    <div className="min-h-screen p-6 lg:p-10 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <WalletIcon className="h-6 w-6 text-purple-400" />
        <h1 className="text-2xl font-semibold text-white">Wallet</h1>
      </div>

      {/* Balance */}
      <div
        className="rounded-2xl p-8 mb-6 relative overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, rgba(29,46,109,0.4), rgba(11,16,38,0.78))',
          border: '1px solid rgba(142,68,255,0.20)',
          boxShadow: '0 24px 50px -18px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.02)',
        }}
      >
        <div className="pointer-events-none absolute -top-12 -right-12 w-40 h-40 rounded-full opacity-60"
          style={{ background: 'radial-gradient(circle, rgba(142,68,255,0.35), transparent 65%)', filter: 'blur(32px)' }} />
        <p className="text-[11px] uppercase font-semibold text-white/55 mb-2" style={{ letterSpacing: '0.22em' }}>
          Saldo actual
        </p>
        {loading ? (
          <Loader2 className="h-7 w-7 text-purple-400 animate-spin" />
        ) : (
          <div className="text-5xl lg:text-6xl font-medium tabular-nums leading-none"
            style={{
              fontFamily: 'var(--font-display)',
              letterSpacing: '-0.04em',
              background: 'linear-gradient(180deg, #F8FAFF, #D45BFF)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              filter: 'drop-shadow(0 0 16px rgba(142,68,255,0.35))',
            }}>
            ${Number(balance ?? 0).toFixed(2)} <span className="text-base text-white/45 align-baseline">USD</span>
          </div>
        )}
        {verifying && (
          <p className="text-xs text-white/55 mt-4 flex items-center gap-2">
            <Loader2 className="h-3 w-3 animate-spin" /> Verificando pago…
          </p>
        )}
      </div>

      {/* Comprar */}
      <div
        className="rounded-2xl p-6 lg:p-7 mb-6"
        style={{
          background: 'rgba(11,16,38,0.6)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <h2 className="text-lg font-semibold text-white mb-1">Recargar créditos</h2>
        <p className="text-sm text-white/55 mb-5">
          Monto libre entre <span className="text-white/75 font-medium">${MIN_USD}</span> y{' '}
          <span className="text-white/75 font-medium">${MAX_USD}</span> USD. Pago con Stripe.
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/45 text-sm font-medium">$</span>
            <input
              type="number"
              inputMode="decimal"
              min={MIN_USD}
              max={MAX_USD}
              step="1"
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              disabled={processing}
              className="w-full h-12 pl-8 pr-4 rounded-xl bg-[#050816] text-white text-base font-medium tabular-nums focus:outline-none focus:ring-1 focus:ring-purple-400/40 transition-all"
              style={{ border: '1px solid rgba(255,255,255,0.10)' }}
              placeholder="25"
            />
          </div>
          <Button
            onClick={handlePurchase}
            disabled={processing || verifying}
            className="h-12 px-7 rounded-xl text-white font-semibold whitespace-nowrap"
            style={{
              background: 'linear-gradient(135deg, #6B5CFF, #8E44FF, #D45BFF)',
              boxShadow: '0 16px 32px -8px rgba(142,68,255,0.6), inset 0 1px 0 rgba(255,255,255,0.18)',
              letterSpacing: '0.05em',
            }}
          >
            {processing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            Pagar con Stripe
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          {[10, 25, 50, 100, 250].map((amt) => (
            <button
              key={amt}
              type="button"
              onClick={() => setAmountStr(String(amt))}
              disabled={processing}
              className="px-3 py-1.5 rounded-full text-[11px] uppercase font-semibold text-white/65 hover:text-white transition-colors"
              style={{
                background: amountStr === String(amt) ? 'rgba(212,91,255,0.16)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${amountStr === String(amt) ? 'rgba(212,91,255,0.4)' : 'rgba(255,255,255,0.08)'}`,
                letterSpacing: '0.1em',
              }}
            >
              ${amt}
            </button>
          ))}
        </div>
      </div>

      {/* Historial */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: 'rgba(11,16,38,0.6)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div className="px-6 py-4 border-b border-white/[0.06]">
          <h2 className="text-lg font-semibold text-white">Historial de compras</h2>
        </div>
        {loading ? (
          <div className="p-10 text-center">
            <Loader2 className="h-6 w-6 text-purple-400 animate-spin mx-auto" />
          </div>
        ) : purchases.length === 0 ? (
          <div className="p-10 text-center text-sm text-white/45">
            Aún no has realizado ninguna compra.
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {purchases.map((p) => (
              <div key={p.id} className="px-6 py-4 flex items-center gap-4">
                <StatusIcon status={p.status} />
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-semibold text-white tabular-nums">
                    ${Number(p.amount_usd).toFixed(2)} USD
                  </div>
                  <div className="text-[11px] text-white/45 mt-0.5">
                    {new Date(p.completed_at || p.created_at).toLocaleString('es-MX', {
                      day: '2-digit', month: 'short', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </div>
                </div>
                <StatusBadge status={p.status} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function StatusIcon({ status }: { status: Purchase['status'] }) {
  if (status === 'completed') return <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
  if (status === 'pending')   return <Clock className="h-5 w-5 text-amber-400 shrink-0" />
  return <XCircle className="h-5 w-5 text-red-400 shrink-0" />
}

function StatusBadge({ status }: { status: Purchase['status'] }) {
  const styles: Record<Purchase['status'], { bg: string; text: string; label: string }> = {
    completed: { bg: 'rgba(16,185,129,0.14)', text: '#10B981', label: 'Completado' },
    pending:   { bg: 'rgba(245,158,11,0.14)', text: '#F59E0B', label: 'Pendiente' },
    failed:    { bg: 'rgba(239,68,68,0.14)',  text: '#EF4444', label: 'Falló' },
    expired:   { bg: 'rgba(148,163,184,0.14)', text: '#94A3B8', label: 'Expirado' },
  }
  const s = styles[status]
  return (
    <span className="text-[10px] uppercase font-semibold px-2.5 py-1 rounded-full shrink-0"
      style={{ background: s.bg, color: s.text, letterSpacing: '0.14em' }}>
      {s.label}
    </span>
  )
}
