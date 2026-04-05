'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Eye, EyeOff, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { NuroSmile } from '@/components/shared/nuro-logo'

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordContent />
    </Suspense>
  )
}

function ResetPasswordContent() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [sessionReady, setSessionReady] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  // Supabase sends tokens in the URL hash (#access_token=...&refresh_token=...).
  // @supabase/ssr defaults to PKCE flow and does NOT auto-process implicit-style
  // hash tokens — we must extract them manually and call setSession() ourselves
  // so that updateUser() later has an active session.
  useEffect(() => {
    if (typeof window === 'undefined') return

    const hash = window.location.hash.startsWith('#')
      ? window.location.hash.substring(1)
      : window.location.hash
    const params = new URLSearchParams(hash)
    const access_token = params.get('access_token')
    const refresh_token = params.get('refresh_token')

    if (access_token && refresh_token) {
      supabase.auth
        .setSession({ access_token, refresh_token })
        .then((result: { error: unknown }) => {
          if (!result.error) {
            setSessionReady(true)
            // Clean the hash so a page refresh doesn't re-trigger
            window.history.replaceState(null, '', window.location.pathname)
          } else {
            setError('El enlace de recuperación es inválido o ha expirado.')
          }
        })
      return
    }

    // Fallback: if there's already a session (e.g. user came back), unlock
    supabase.auth.getSession().then((result: { data: { session: unknown } }) => {
      if (result.data.session) setSessionReady(true)
    })
  }, [supabase])

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }

    if (password !== confirm) {
      setError('Las contraseñas no coinciden')
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.auth.updateUser({ password })

      if (error) {
        setError(error.message)
        return
      }

      setDone(true)
      setTimeout(() => router.push('/login'), 3000)
    } catch {
      setError('Error al actualizar la contraseña')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#000000] px-4">
      <div className="w-full max-w-[420px]">
        <div className="bg-[#0A0A0F] border border-[#0F0F17] rounded-2xl p-8 shadow-2xl">
          <div className="flex items-center gap-3 mb-8">
            <NuroSmile size={36} />
            <span className="text-white font-bold text-xl tracking-tight">Ventas AI</span>
          </div>

          {done ? (
            <div className="text-center py-4">
              <CheckCircle2 className="h-12 w-12 text-green-400 mx-auto mb-4" />
              <h2 className="text-white text-xl font-bold mb-2">¡Contraseña actualizada!</h2>
              <p className="text-[#94A3B8] text-sm">Redirigiendo al inicio de sesión...</p>
            </div>
          ) : (
            <>
              <h1 className="text-white text-2xl font-bold mb-2">Nueva contraseña</h1>
              <p className="text-[#94A3B8] text-sm mb-6">Elige una contraseña segura para tu cuenta.</p>

              {!sessionReady && (
                <div className="flex items-center gap-2 bg-yellow-400/10 text-yellow-400 text-sm rounded-lg px-3 py-2 mb-4">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  Verificando enlace de recuperación...
                </div>
              )}

              <form onSubmit={handleReset} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-[0.15em]">
                    Nueva contraseña
                  </Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Mínimo 6 caracteres"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="h-12 rounded-xl pr-11 bg-[#0F0F17] border-[#1A1A25] text-white placeholder:text-[#64748B]/45 text-[14px] focus:border-[#8B5CF6]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#64748B]/60 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-[0.15em]">
                    Confirmar contraseña
                  </Label>
                  <Input
                    type="password"
                    placeholder="Repite la contraseña"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    className="h-12 rounded-xl bg-[#0F0F17] border-[#1A1A25] text-white placeholder:text-[#64748B]/45 text-[14px] focus:border-[#8B5CF6]"
                  />
                </div>

                {error && (
                  <div className="flex items-center gap-2 bg-red-400/10 text-red-400 text-sm rounded-lg px-3 py-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={loading || !sessionReady}
                  className="w-full h-12 rounded-xl text-[14px] font-semibold text-white bg-gradient-to-r from-[#6c47ff] to-[#00d4ff] hover:opacity-90 transition-opacity"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Guardar nueva contraseña'}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
