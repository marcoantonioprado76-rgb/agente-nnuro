'use client'

import { useCallback, useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Loader2, Wallet as WalletIcon, ArrowRight, CheckCircle2, XCircle, Clock, Zap, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { CreditsCard } from '@/components/credits/credits-card'

type Purchase = {
  id: string
  amount_usd: number
  status: 'pending' | 'completed' | 'failed' | 'expired'
  stripe_checkout_session_id: string | null
  created_at: string
  completed_at: string | null
}

type CreditPackage = {
  id: string
  name: string
  credits_amount: number
  price_usd: number
  expiration_days: number | null
  description: string | null
  sort_order: number
}

const MIN_USD = 5
const MAX_USD = 500

export default function WalletPage() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const [balance, setBalance] = useState<number | null>(null)
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [packages, setPackages] = useState<CreditPackage[]>([])
  const [loading, setLoading] = useState(true)
  const [amountStr, setAmountStr] = useState('25')
  const [processing, setProcessing] = useState(false)
  const [packageProcessingId, setPackageProcessingId] = useState<string | null>(null)
  const [verifying, setVerifying] = useState(false)

  const sessionId = searchParams.get('session_id')
  const cancelled = searchParams.get('cancelled')

  const fetchData = useCallback(async () => {
    try {
      const [resPurchase, resPackages] = await Promise.all([
        fetch('/api/credits/purchase'),
        fetch('/api/credits/packages'),
      ])
      if (resPurchase.ok) {
        const data = await resPurchase.json()
        setBalance(Number(data.balance_usd ?? 0))
        setPurchases(Array.isArray(data.purchases) ? data.purchases : [])
      }
      if (resPackages.ok) {
        const data = await resPackages.json()
        setPackages(Array.isArray(data) ? data : [])
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

  const handlePackagePurchase = async (pkg: CreditPackage) => {
    setPackageProcessingId(pkg.id)
    try {
      const res = await fetch('/api/credits/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ package_id: pkg.id }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data?.error || 'Error al crear sesión de pago')
        setPackageProcessingId(null)
        return
      }
      if (data.url) {
        window.location.href = data.url
      } else {
        toast.error('No se recibió URL de pago')
        setPackageProcessingId(null)
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al iniciar pago')
      setPackageProcessingId(null)
    }
  }

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

      {/* Card de créditos AI (nuevo modelo) */}
      <div className="mb-6">
        <CreditsCard />
      </div>

      {verifying && (
        <div className="mb-4 px-4 py-2 rounded-lg flex items-center gap-2 text-sm text-white/65"
          style={{ background: 'rgba(212,91,255,0.08)', border: '1px solid rgba(212,91,255,0.18)' }}>
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Verificando pago…
        </div>
      )}

      {/* Paquetes destacados */}
      {packages.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Package className="h-4 w-4 text-purple-400" />
            <h2 className="text-[15px] font-semibold text-white">Paquetes de créditos</h2>
            <span className="text-[11px] text-white/45">Compra rápida con descuento</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {packages.map((pkg) => {
              const ratio = pkg.price_usd > 0 ? pkg.credits_amount / pkg.price_usd : 0
              const isProcessing = packageProcessingId === pkg.id
              const disabled = processing || verifying || isProcessing
              return (
                <button
                  key={pkg.id}
                  onClick={() => !disabled && handlePackagePurchase(pkg)}
                  disabled={disabled}
                  className="text-left relative rounded-2xl p-4 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:translate-y-[-2px]"
                  style={{
                    background: 'rgba(11,16,38,0.65)',
                    border: '1px solid rgba(212,91,255,0.20)',
                    boxShadow: '0 12px 28px -10px rgba(142,68,255,0.35)',
                  }}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="shrink-0 flex h-8 w-8 items-center justify-center rounded-lg"
                      style={{ background: 'rgba(212,91,255,0.16)', border: '1px solid rgba(212,91,255,0.30)' }}>
                      <Zap className="h-4 w-4 text-purple-400" />
                    </div>
                    <p className="text-[12.5px] font-semibold text-white truncate">{pkg.name}</p>
                  </div>

                  <p className="text-[24px] font-medium text-white tabular-nums leading-none"
                    style={{
                      fontFamily: 'var(--font-display)',
                      letterSpacing: '-0.035em',
                      background: 'linear-gradient(180deg, #F8FAFF, #D45BFF)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}>
                    {pkg.credits_amount.toLocaleString()}
                  </p>
                  <p className="text-[10.5px] text-white/45 mb-3">créditos</p>

                  <div className="flex items-baseline justify-between mb-3">
                    <span className="text-[16px] font-semibold text-white tabular-nums">
                      ${Number(pkg.price_usd).toFixed(2)}
                    </span>
                    <span className="text-[10.5px] text-emerald-400 tabular-nums">
                      {ratio.toFixed(0)} créd/USD
                    </span>
                  </div>

                  {pkg.description && (
                    <p className="text-[11px] text-white/55 mb-3 line-clamp-2">{pkg.description}</p>
                  )}

                  <div className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-white text-[11.5px] font-semibold"
                    style={{
                      background: 'linear-gradient(135deg, #6B5CFF, #8E44FF, #D45BFF)',
                      boxShadow: '0 6px 14px -4px rgba(142,68,255,0.55)',
                    }}>
                    {isProcessing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
                    Comprar
                    <ArrowRight className="h-3 w-3" />
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

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
