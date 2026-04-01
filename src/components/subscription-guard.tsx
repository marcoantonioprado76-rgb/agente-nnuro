'use client'

import { useEffect, useState, useCallback } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { CreditCard, Lock, Zap, ArrowRight, Loader2, RefreshCw, Clock, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Subscription } from '@/types'

export function SubscriptionGuard({ children }: { children: React.ReactNode }) {
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [checking, setChecking] = useState(false)
  const { isAdmin } = useAuth()
  const pathname = usePathname()
  const router = useRouter()

  const checkSubscription = useCallback(async (showLoading = false) => {
    if (showLoading) setChecking(true)
    try {
      const res = await fetch('/api/subscriptions')
      if (res.ok) {
        const data = await res.json()
        setSubscription(data)

        // If active, check if it's expired by date (client-side check)
        if (data?.status === 'active' && data?.approval_status === 'approved') {
          if (data.end_date && new Date(data.end_date) < new Date()) {
            // Expired — marcar como expirado localmente y re-fetch
            // El cron job se encarga de actualizar la DB periódicamente
            setSubscription({ ...data, status: 'expired' })
            setLoading(false)
            setChecking(false)
            return
          }
          // Active and not expired
          setLoading(false)
          setChecking(false)
          return
        }

        // If pending Stripe payment, try to verify and activate directly
        if (data?.payment_provider === 'stripe' && data?.approval_status === 'pending_review' && data?.payment_id) {
          try {
            const verifyRes = await fetch('/api/stripe/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ session_id: data.payment_id }),
            })
            if (verifyRes.ok) {
              const result = await verifyRes.json()
              if (result.status === 'activated' || result.status === 'already_active') {
                setSubscription(result.subscription || { ...data, status: 'active', approval_status: 'approved' })
              }
            }
          } catch { /* silent */ }
        }
      }
    } catch { /* silent */ } finally {
      setLoading(false)
      setChecking(false)
    }
  }, [])

  useEffect(() => {
    checkSubscription()
    const interval = setInterval(() => checkSubscription(), 15000)
    return () => clearInterval(interval)
  }, [checkSubscription])

  // Admins siempre tienen acceso
  if (isAdmin) return <>{children}</>

  // La página /subscription siempre es accesible
  if (pathname === '/subscription') return <>{children}</>

  // Mientras carga, mostrar spinner (no el contenido protegido)
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
    </div>
  )

  // Check if active AND not expired
  const isActive = subscription?.status === 'active'
    && subscription?.approval_status === 'approved'
    && (!subscription.end_date || new Date(subscription.end_date) >= new Date())

  if (isActive) return <>{children}</>

  // Determine the state for the overlay
  const isPending = subscription?.approval_status === 'pending_review'
  const isExpired = subscription?.status === 'expired'
    || (subscription?.status === 'active' && subscription?.end_date && new Date(subscription.end_date) < new Date())

  return (
    <div className="relative">
      {/* Contenido bloqueado con blur */}
      <div className="pointer-events-none select-none filter blur-[3px] opacity-40">
        {children}
      </div>

      {/* Overlay de bloqueo */}
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm ml-[260px]">
        <div className="max-w-md w-full mx-4 text-center space-y-6">
          {/* Icon */}
          <div className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full border ${
            isExpired
              ? 'bg-gradient-to-br from-amber-500/20 to-orange-500/20 border-amber-500/30'
              : 'bg-gradient-to-br from-purple-500/20 to-cyan-500/20 border-purple-500/30'
          }`}>
            {isExpired ? (
              <Clock className="h-10 w-10 text-amber-400" />
            ) : (
              <Lock className="h-10 w-10 text-purple-400" />
            )}
          </div>

          {/* Title */}
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white">
              {isPending
                ? 'Pendiente de Aprobacion'
                : isExpired
                  ? 'Suscripcion Vencida'
                  : 'Acceso Bloqueado'
              }
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              {!subscription
                ? 'Necesitas una suscripcion activa para acceder a las funcionalidades de la plataforma.'
                : isPending
                  ? 'Tu suscripcion esta pendiente de aprobacion. Se verificara automaticamente cada 15 segundos.'
                  : isExpired
                    ? 'Tu suscripcion ha vencido. Tu configuracion de bots, productos y plantillas esta guardada. Renueva tu plan para seguir usando el sistema.'
                    : 'Tu suscripcion esta suspendida o fue rechazada. Contacta al administrador o adquiere un nuevo plan.'
              }
            </p>
          </div>

          {/* Expiry info */}
          {isExpired && subscription?.end_date && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-left">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                <span className="text-sm font-medium text-amber-400">Informacion importante</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Tu suscripcion vencio el {new Date(subscription.end_date).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}.
                Toda tu configuracion (bots, productos, plantillas, conexiones) esta intacta y se reactivara automaticamente al renovar.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-3">
            {isPending && (
              <Button
                onClick={() => checkSubscription(true)}
                disabled={checking}
                className="w-full bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white h-12 text-base font-semibold"
              >
                {checking ? (
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-5 w-5 mr-2" />
                )}
                Verificar Estado
              </Button>
            )}

            {isExpired && (
              <Button
                onClick={() => router.push('/pricing')}
                className="w-full bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white h-12 text-base font-semibold"
              >
                <Zap className="h-5 w-5 mr-2" />
                Renovar Suscripcion
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}

            <Button
              onClick={() => router.push('/subscription')}
              variant={isPending || isExpired ? 'outline' : 'default'}
              className={isPending || isExpired
                ? 'w-full border-purple-500/30 text-purple-400 hover:bg-purple-500/10 h-11'
                : 'w-full bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white h-12 text-base font-semibold'
              }
            >
              <CreditCard className="h-5 w-5 mr-2" />
              Ver Mi Suscripcion
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>

            {!subscription && (
              <Button
                onClick={() => router.push('/pricing')}
                variant="outline"
                className="w-full border-purple-500/30 text-purple-400 hover:bg-purple-500/10 h-11"
              >
                <Zap className="h-4 w-4 mr-2" />
                Ver Planes Disponibles
              </Button>
            )}
          </div>

          {isPending && (
            <p className="text-xs text-muted-foreground/50 animate-pulse">
              Verificando automaticamente...
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
