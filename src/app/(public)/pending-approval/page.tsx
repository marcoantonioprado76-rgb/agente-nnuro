'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Clock, Zap, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function PendingApprovalPage() {
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-gradient-dark flex items-center justify-center p-4">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-glow-purple/10 blur-[100px]" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-glow-blue/10 blur-[100px]" />
      </div>

      <div className="relative max-w-md w-full text-center space-y-6">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-yellow-500/10 mb-4">
          <Clock className="h-10 w-10 text-yellow-400" />
        </div>

        <div className="space-y-3">
          <h1 className="text-2xl font-bold text-white">
            Pago Registrado
          </h1>
          <p className="text-muted-foreground leading-relaxed">
            Tu pago fue registrado exitosamente y está pendiente de aprobación por el administrador.
            Recibirás acceso completo una vez que sea revisado y aprobado.
          </p>
        </div>

        <div className="bg-[#0c1425] border border-yellow-500/20 rounded-2xl p-5 text-left">
          <div className="flex items-center gap-3 mb-3">
            <Zap className="h-5 w-5 text-yellow-400" />
            <span className="font-semibold text-white text-sm">Estado de tu suscripción</span>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Estado del pago</span>
              <span className="text-yellow-400 font-medium">Pendiente de revisión</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tiempo estimado</span>
              <span className="text-gray-300">24-48 horas</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 pt-2">
          <Link href="/pricing">
            <Button variant="outline" className="w-full">
              Ver Planes
            </Button>
          </Link>
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Cerrar Sesión
          </Button>
        </div>
      </div>
    </div>
  )
}
