'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, AlertCircle, ArrowRight } from 'lucide-react'
import TurnstileWidget from '@/components/TurnstileWidget'

export default function LoginPage() {
  const router = useRouter()
  const [form, setForm] = useState({ identifier: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState('')
  const handleTurnstile = useCallback((token: string) => setTurnstileToken(token), [])
  const handleTurnstileExpire = useCallback(() => setTurnstileToken(''), [])

  // dashboard.css (.dm-*) no se carga en /login → estilos inline
  const inputStyle: React.CSSProperties = {
    width: '100%', background: '#FFFFFF', border: '1px solid #E4E9F0', borderRadius: 14,
    padding: '12px 14px', fontSize: 14, color: '#111827', outline: 'none',
    boxShadow: '0 4px 14px rgba(15,23,42,0.04)',
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, turnstileToken }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      if (data.requiresVerification) {
        router.push('/verify-device')
        return
      }
      window.location.href = '/dashboard'
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="font-ui min-h-screen flex items-center justify-center px-4 relative overflow-hidden"
      style={{ backgroundColor: '#0A1320', backgroundImage: 'linear-gradient(180deg, rgba(11,27,43,0.66) 0%, rgba(8,16,28,0.80) 46%, rgba(5,11,20,0.93) 100%), url(/auth-bg.jpg)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }}>

      {/* Glows suaves */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-60 -left-40 w-[600px] h-[600px] rounded-full blur-[150px]" style={{ background: 'rgba(255,9,108,0.16)' }} />
        <div className="absolute -bottom-60 -right-40 w-[600px] h-[600px] rounded-full blur-[150px]" style={{ background: 'rgba(106,53,217,0.18)' }} />
      </div>

      <div className="w-full max-w-[380px] relative z-10">

        {/* Logo oficial */}
        <div className="flex flex-col items-center mb-8">
          <img src="/logo-oficial-mydiamond.png" alt="MY DIAMOND" style={{ width: 230, height: 'auto', display: 'block', filter: 'drop-shadow(0 5px 12px rgba(0,0,0,0.85)) drop-shadow(0 22px 46px rgba(0,0,0,0.68)) drop-shadow(0 0 28px rgba(183,53,184,0.30))' }} />
        </div>

        {/* Card */}
        <div style={{ padding: '2rem', background: '#FFFFFF', border: '1px solid #E4E9F0', borderRadius: 24, boxShadow: '0 0 0 1px rgba(255,255,255,0.10), 0 44px 100px -22px rgba(0,0,0,0.88), 0 18px 48px rgba(0,0,0,0.6)' }}>

          <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-5" style={{ color: '#9CA3AF' }}>Iniciar sesión</p>

          {error && (
            <div className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 mb-5" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.22)' }}>
              <AlertCircle size={13} className="shrink-0" style={{ color: '#dc2626' }} />
              <p className="text-[11px] leading-snug" style={{ color: '#dc2626' }}>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">

            <div>
              <label className="block text-[10px] font-black uppercase tracking-[0.15em] mb-1.5" style={{ color: '#6B7280' }}>
                Usuario o Correo
              </label>
              <input
                type="text"
                placeholder="usuario o correo@ejemplo.com"
                value={form.identifier}
                onChange={e => setForm({ ...form, identifier: e.target.value })}
                required
                autoComplete="username"
                autoFocus
                style={inputStyle}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[10px] font-black uppercase tracking-[0.15em]" style={{ color: '#6B7280' }}>
                  Contraseña
                </label>
                <Link href="/forgot-password" className="text-[10px] transition-colors" style={{ color: '#6B7280' }}>
                  ¿Olvidaste?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  required
                  autoComplete="current-password"
                  style={{ ...inputStyle, paddingRight: 44 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: '#9CA3AF' }}
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <TurnstileWidget onToken={handleTurnstile} onExpire={handleTurnstileExpire} />

            <button
              type="submit"
              disabled={loading}
              className="dm-login-btn w-full uppercase tracking-[0.18em] text-xs mt-2 flex items-center justify-center gap-2 disabled:opacity-60"
              style={{ padding: '14px 20px', borderRadius: 16, fontWeight: 800, color: '#fff', border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #FF2D95 0%, #B735B8 48%, #233B8F 100%)' }}
            >
              {loading
                ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                : <><span>Ingresar</span><ArrowRight size={13} /></>
              }
            </button>

          </form>
        </div>

        <p className="text-center text-[11px] mt-5" style={{ color: 'rgba(255,255,255,0.55)' }}>
          ¿Sin cuenta?{' '}
          <Link href="/register" className="font-bold transition-colors" style={{ color: '#FF096C' }}>
            Registrarse
          </Link>
        </p>

      </div>
    </div>
  )
}