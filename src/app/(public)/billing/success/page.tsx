'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { CheckCircle2, Loader2, ArrowRight, Zap, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function BillingSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-dark flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-emerald-400 animate-spin" />
      </div>
    }>
      <BillingSuccessContent />
    </Suspense>
  )
}

function BillingSuccessContent() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const [status, setStatus] = useState<'checking' | 'active' | 'pending' | 'error'>('checking')

  useEffect(() => {
    if (!sessionId) {
      setStatus('error')
      return
    }

    let attempts = 0
    const maxAttempts = 15

    const verify = async () => {
      try {
        // First try direct verification with Stripe
        const verifyRes = await fetch('/api/stripe/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: sessionId }),
        })

        if (verifyRes.ok) {
          const data = await verifyRes.json()
          if (data.status === 'activated' || data.status === 'already_active') {
            setStatus('active')
            return true
          }
        }

        // Fallback: check subscription status directly
        const subRes = await fetch('/api/subscriptions')
        if (subRes.ok) {
          const sub = await subRes.json()
          if (sub?.status === 'active' && sub?.approval_status === 'approved') {
            setStatus('active')
            return true
          }
        }
      } catch { /* retry */ }

      attempts++
      if (attempts >= maxAttempts) {
        setStatus('pending')
        return true
      }
      return false
    }

    verify().then((done) => {
      if (done) return
      const interval = setInterval(async () => {
        const done = await verify()
        if (done) clearInterval(interval)
      }, 2000)
      return () => clearInterval(interval)
    })
  }, [sessionId])

  const handleGoToDashboard = () => {
    window.location.href = '/dashboard'
  }

  return (
    <div className="min-h-screen bg-gradient-dark flex items-center justify-center">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-glow-purple/10 blur-[100px]" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-glow-blue/10 blur-[100px]" />
      </div>

      <div className="relative max-w-md w-full mx-auto px-6">
        <div className="rounded-2xl border border-emerald-500/20 bg-[#0B0A14] p-8 text-center space-y-6">
          {status === 'checking' ? (
            <>
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 animate-pulse">
                <Loader2 className="h-8 w-8 text-emerald-400 animate-spin" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white mb-2">Verificando tu pago...</h1>
                <p className="text-muted-foreground text-sm">
                  Estamos confirmando tu pago con Stripe. Esto solo toma unos segundos.
                </p>
              </div>
            </>
          ) : status === 'active' ? (
            <>
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15">
                <CheckCircle2 className="h-8 w-8 text-emerald-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white mb-2">Pago exitoso</h1>
                <p className="text-muted-foreground text-sm">
                  Tu suscripcion ha sido activada correctamente. Ya puedes acceder a todas las funcionalidades de tu plan.
                </p>
              </div>
              <Button
                onClick={handleGoToDashboard}
                className="w-full h-12 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-bold rounded-xl"
              >
                <Zap className="h-5 w-5 mr-2" />
                Ir a mi Panel
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </>
          ) : status === 'error' ? (
            <>
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
                <AlertCircle className="h-8 w-8 text-red-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white mb-2">Error</h1>
                <p className="text-muted-foreground text-sm">
                  No se pudo verificar la sesion de pago. Intenta de nuevo o contacta al administrador.
                </p>
              </div>
              <Button
                onClick={handleGoToDashboard}
                className="w-full h-12 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-bold rounded-xl"
              >
                Ir a mi Panel
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </>
          ) : (
            <>
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-yellow-500/10">
                <CheckCircle2 className="h-8 w-8 text-yellow-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white mb-2">Pago recibido</h1>
                <p className="text-muted-foreground text-sm">
                  Tu pago ha sido recibido pero la activacion esta tomando mas tiempo del esperado.
                  Tu suscripcion se activara automaticamente en breve.
                </p>
              </div>
              <Button
                onClick={handleGoToDashboard}
                className="w-full h-12 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-bold rounded-xl"
              >
                Ir a mi Panel
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
