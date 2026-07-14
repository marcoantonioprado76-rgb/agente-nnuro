'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Mail, ArrowLeft, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react'
import '../dashboard/dashboard.css' // .dm-* utilities (no se cargan fuera de /dashboard)

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error)
        return
      }
      setSent(true)
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  const inputCls = 'dm-input text-sm'

  return (
    <div style={{background:'linear-gradient(135deg,#F8FAFC,#F5F7FA 45%,#EEF2F7)',minHeight:'100vh',color:'#111827'}} className="font-ui min-h-screen flex items-center justify-center px-4 relative overflow-hidden">

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[450px] h-[450px] rounded-full bg-[#FF096C]/8 blur-[130px]" />
        <div className="absolute -bottom-40 -right-40 w-[450px] h-[450px] rounded-full bg-purple-600/8 blur-[130px]" />
      </div>

      <div className="w-full max-w-[340px] relative z-10">

        <div className="flex flex-col items-center mb-7">
          <div style={{ padding: '14px 24px', borderRadius: 22, background: 'linear-gradient(135deg, #0B1B2B 0%, #081624 100%)', boxShadow: '0 18px 40px -14px rgba(8,22,36,0.5)' }}>
            <img src="/logo-oficial-mydiamond.png" alt="MY DIAMOND" style={{ width: 140, height: 'auto', display: 'block' }} />
          </div>
        </div>

        <div className="dm-card" style={{ padding: '1.5rem' }}>
          {sent ? (
            <div className="text-center py-2">
              <div className="w-14 h-14 rounded-2xl bg-[#FF096C]/10 border border-[#FF096C]/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={26} className="text-[#FF096C]" />
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-[#FF096C] mb-1">Correo enviado</p>
              <h2 className="text-base font-black text-[#111827] mb-2">Revisa tu bandeja</h2>
              <p className="text-xs text-[#6B7280] mb-5 leading-relaxed">
                Si el correo <span className="text-[#111827] font-bold">{email}</span> está registrado, recibirás un enlace de recuperación.
              </p>
              <Link
                href="/login"
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-[0.98]"
                style={{
                  background: 'linear-gradient(135deg, #0D1E79, #D203DD)',
                  color: '#fff',
                  border: '1px solid rgba(255,255,255,0.12)',
                  boxShadow: '0 4px 20px rgba(210,3,221,0.25)',
                }}
              >
                <ArrowLeft size={13} /> Volver al Login
              </Link>
            </div>
          ) : (
            <>
              <p className="text-[10px] font-black uppercase tracking-widest text-[#9CA3AF] mb-3">Recuperar contraseña</p>
              <p className="text-xs text-[#6B7280] mb-4 leading-relaxed">
                Ingresa tu correo y te enviaremos un enlace de recuperación.
              </p>

              {error && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5 mb-4">
                  <AlertCircle size={12} className="text-red-400 shrink-0" />
                  <p className="text-[11px] text-red-400">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-[#6B7280] uppercase tracking-widest mb-1.5">
                    Correo electrónico
                  </label>
                  <div className="relative">
                    <Mail size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF] pointer-events-none" />
                    <input
                      type="email"
                      placeholder="tu@correo.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                      className={`${inputCls} pl-9`}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-[0.98] disabled:opacity-60 mt-1"
                  style={{
                    background: 'linear-gradient(135deg, #0D1E79, #D203DD)',
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,0.12)',
                    boxShadow: '0 4px 20px rgba(210,3,221,0.25)',
                  }}
                >
                  {loading
                    ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    : <><span>Enviar enlace</span><ArrowRight size={13} /></>
                  }
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-[#9CA3AF] text-[11px] mt-5">
          ¿Recordaste tu contraseña?{' '}
          <Link href="/login" className="text-purple-400 hover:text-purple-300 font-bold transition-colors">
            Iniciar sesión
          </Link>
        </p>

      </div>
    </div>
  )
}
