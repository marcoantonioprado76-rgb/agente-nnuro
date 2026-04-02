'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Loader2, Mail, CheckCircle2 } from 'lucide-react'
import { NuroSmile } from '@/components/shared/nuro-logo'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Error al enviar el correo')
        return
      }

      setSent(true)
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#09090F] px-4">
      <div className="w-full max-w-[420px]">
        <div className="bg-[#12111C] border border-[#1A1726] rounded-2xl p-8 shadow-2xl">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <NuroSmile size={36} />
            <span className="text-white font-bold text-xl tracking-tight">Ventas AI</span>
          </div>

          {sent ? (
            <div className="text-center py-4">
              <CheckCircle2 className="h-12 w-12 text-green-400 mx-auto mb-4" />
              <h2 className="text-white text-xl font-bold mb-2">Correo enviado</h2>
              <p className="text-[#B0A5C8] text-sm leading-relaxed mb-6">
                Si <strong className="text-white">{email}</strong> está registrado, recibirás un enlace para restablecer tu contraseña en los próximos minutos.
              </p>
              <Link
                href="/login"
                className="text-[#8B5CF6] hover:text-[#7CA0FF] text-sm font-semibold transition-colors flex items-center justify-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Volver al inicio de sesión
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-white text-2xl font-bold mb-2">¿Olvidaste tu contraseña?</h1>
              <p className="text-[#B0A5C8] text-sm mb-6 leading-relaxed">
                Ingresa tu correo y te enviaremos un enlace para restablecerla.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-[11px] font-semibold text-[#B0A5C8] uppercase tracking-[0.15em]">
                    Correo electrónico
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9189A8]/60" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="tu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="h-12 rounded-xl pl-10 bg-[#1A1726] border-[#2A2540] text-white placeholder:text-[#9189A8]/45 text-[14px] focus:border-[#8B5CF6]"
                    />
                  </div>
                </div>

                {error && (
                  <p className="text-red-400 text-sm bg-red-400/10 rounded-lg px-3 py-2">{error}</p>
                )}

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 rounded-xl text-[14px] font-semibold text-white bg-gradient-to-r from-[#6c47ff] to-[#00d4ff] hover:opacity-90 transition-opacity"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Enviar enlace de recuperación'}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <Link
                  href="/login"
                  className="text-[#8B5CF6] hover:text-[#7CA0FF] text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Volver al inicio de sesión
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
