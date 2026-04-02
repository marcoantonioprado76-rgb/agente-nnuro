'use client'

import { XCircle, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

export default function BillingCancelPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gradient-dark flex items-center justify-center">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-glow-purple/10 blur-[100px]" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-glow-blue/10 blur-[100px]" />
      </div>

      <div className="relative max-w-md w-full mx-auto px-6">
        <div className="rounded-2xl border border-red-500/20 bg-[#0B0A14] p-8 text-center space-y-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
            <XCircle className="h-8 w-8 text-red-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">Pago cancelado</h1>
            <p className="text-muted-foreground text-sm">
              El proceso de pago fue cancelado. No se realizó ningún cargo. Puedes volver a intentarlo cuando quieras.
            </p>
          </div>
          <div className="space-y-3">
            <Button
              onClick={() => router.push('/pricing')}
              className="w-full h-12 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-bold rounded-xl"
            >
              Ver Planes
            </Button>
            <Button
              onClick={() => window.location.href = '/dashboard'}
              variant="outline"
              className="w-full h-11 border-border/50 text-muted-foreground hover:text-white"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver al Panel
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
