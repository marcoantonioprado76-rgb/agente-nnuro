'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ShieldAlert, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function AccountSuspendedPage() {
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
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-500/10 mb-4">
          <ShieldAlert className="h-10 w-10 text-red-400" />
        </div>

        <div className="space-y-3">
          <h1 className="text-2xl font-bold text-white">
            Cuenta Suspendida
          </h1>
          <p className="text-muted-foreground leading-relaxed">
            Tu cuenta ha sido suspendida o tu suscripción fue rechazada.
            Si crees que es un error, contacta al administrador para más información.
          </p>
        </div>

        <div className="flex flex-col gap-3 pt-2">
          <Link href="/pricing">
            <Button className="w-full bg-primary hover:bg-primary/90">
              Ver Planes Disponibles
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
