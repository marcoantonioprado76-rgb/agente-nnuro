'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Lock, Eye, EyeOff, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react'
import '../dashboard/dashboard.css' // .dm-* utilities (no se cargan fuera de /dashboard)

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div style={{background:'linear-gradient(135deg,#F8FAFC,#F5F7FA 45%,#EEF2F7)',minHeight:'100vh',color:'#111827'}} className="font-ui min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#FF096C]/30 border-t-[#FF096C] rounded-full animate-spin" />
      </div>
    }>
      <ResetForm />
    </Suspense>
  )
}

function ResetForm() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token') || ''
  const [form, setForm] = useState({ password: '', confirmPassword: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (form.password !== form.confirmPassword) {
      setError('Las contraseñas no coinciden')
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, ...form }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      setSuccess(true)
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  const inputCls = 'dm-input text-sm'
  const labelCls = 'block text-[10px] font-bold text-[#6B7280] uppercase tracking-widest mb-1.5'

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-[450px] h-[450px] rounded-full bg-purple-600/8 blur-[130px]" />
        <div className="absolute -bottom-40 -left-40 w-[450px] h-[450px] rounded-full bg-[#FF096C]/8 blur-[130px]" />
      </div>

      <div className="w-full max-w-[340px] relative z-10">

        <div className="flex flex-col items-center mb-7">
          <div style={{ padding: '14px 24px', borderRadius: 22, background: 'linear-gradient(135deg, #0B1B2B 0%, #081624 100%)', boxShadow: '0 18px 40px -14px rgba(8,22,36,0.5)' }}>
            <img src="/logo-oficial-mydiamond.png" alt="MY DIAMOND" style={{ width: 140, height: 'auto', display: 'block' }} />
          </div>
        </div>

        <div className="dm-card" style={{ padding: '1.5rem' }}>
          {success ? (
            <div className="text-center py-2">
              <div className="w-14 h-14 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={26} className="text-green-400" />
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-green-400 mb-1">¡Listo!</p>
              <h2 className="text-base font-black text-[#111827] mb-2">Contraseña actualizada</h2>
              <p className="text-xs text-[#6B7280] mb-5">Tu contraseña ha sido restablecida exitosamente.</p>
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
                Iniciar sesión <ArrowRight size={13} />
              </Link>
            </div>
          ) : (
            <>
              <p className="text-[10px] font-black uppercase tracking-widest text-[#9CA3AF] mb-3">Nueva contraseña</p>
              <p className="text-xs text-[#6B7280] mb-4 leading-relaxed">
                Ingresa tu nueva contraseña para acceder a tu cuenta.
              </p>

              {error && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5 mb-4">
                  <AlertCircle size={12} className="text-red-400 shrink-0" />
                  <p className="text-[11px] text-red-400">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className={labelCls}>Nueva contraseña</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className={`${inputCls} pr-10`}
                      placeholder="Min. 8 caracteres"
                      value={form.password}
                      onChange={e => setForm({ ...form, password: e.target.value })}
                      required
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#111827]/60 transition-colors">
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className={labelCls}>Confirmar contraseña</label>
                  <div className="relative">
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      className={`${inputCls} pr-10`}
                      placeholder="Repite tu contraseña"
                      value={form.confirmPassword}
                      onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
                      required
                    />
                    <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#111827]/60 transition-colors">
                      {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
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
                    : <><span>Restablecer contraseña</span><Lock size={13} /></>
                  }
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-[#9CA3AF] text-[11px] mt-5">
          <Link href="/login" className="text-purple-400 hover:text-purple-300 font-bold transition-colors">
            ← Volver al inicio de sesión
          </Link>
        </p>

      </div>
    </div>
  )
}
