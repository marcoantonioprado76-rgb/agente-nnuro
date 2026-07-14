'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Smartphone, AlertCircle, CheckCircle, ArrowRight } from 'lucide-react'
import TurnstileWidget from '@/components/TurnstileWidget'

export default function VerifyDevicePage() {
  const router = useRouter()
  const [digits, setDigits] = useState(['', '', '', '', '', ''])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState('')
  const inputs = useRef<(HTMLInputElement | null)[]>([])
  const handleTurnstile = useCallback((token: string) => setTurnstileToken(token), [])
  const handleTurnstileExpire = useCallback(() => setTurnstileToken(''), [])

  const handleChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return
    const next = [...digits]
    next[index] = value
    setDigits(next)
    if (value && index < 5) {
      inputs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (text.length > 0) {
      const next = ['', '', '', '', '', '']
      text.split('').forEach((ch, i) => { next[i] = ch })
      setDigits(next)
      inputs.current[Math.min(text.length, 5)]?.focus()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const code = digits.join('')
    if (code.length < 6) { setError('Ingresa los 6 dígitos del código'); return }
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/verify-device', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, turnstileToken }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      setSuccess(true)
      setTimeout(() => {
        window.location.href = '/dashboard'
      }, 1200)
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">

      {/* Background glows */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-60 -left-40 w-[600px] h-[600px] rounded-full bg-amber-500/5 blur-[140px]" />
        <div className="absolute -bottom-60 -right-40 w-[600px] h-[600px] rounded-full bg-purple-600/7 blur-[140px]" />
      </div>

      <div className="w-full max-w-[380px] relative z-10">

        {/* Logo + Brand */}
        <div className="flex flex-col items-center mb-8">
          <img src="/logo-oficial-mydiamond.png" alt="MY DIAMOND" className="w-44 h-auto mb-2" />
          <p className="text-[11px] text-white/30 mt-1 tracking-widest uppercase">Network Marketing Digital</p>
        </div>

        {/* Card */}
        <div className="water-glass relative overflow-hidden" style={{ padding: '2rem' }}>

          {/* Top accent line */}
          <div className="absolute top-0 left-0 right-0 h-px"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(245,158,11,0.6) 40%, rgba(210,3,221,0.5) 60%, transparent)' }} />

          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
              <Smartphone size={15} className="text-amber-400" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/25">Verificación</p>
              <p className="text-xs font-bold text-white/70">Nuevo dispositivo detectado</p>
            </div>
          </div>

          <p className="text-[12px] text-white/40 leading-relaxed mb-6">
            Te enviamos un código de 6 dígitos a tu correo electrónico. Ingrésalo para continuar.
          </p>

          {error && (
            <div className="flex items-center gap-2.5 bg-red-500/10 border border-red-500/20 rounded-xl px-3.5 py-2.5 mb-5">
              <AlertCircle size={13} className="text-red-400 shrink-0" />
              <p className="text-[11px] text-red-400 leading-snug">{error}</p>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2.5 bg-green-500/10 border border-green-500/20 rounded-xl px-3.5 py-2.5 mb-5">
              <CheckCircle size={13} className="text-green-400 shrink-0" />
              <p className="text-[11px] text-green-400 leading-snug">Dispositivo verificado. Redirigiendo...</p>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* 6-digit inputs */}
            <div className="flex gap-2 justify-center mb-6" onPaste={handlePaste}>
              {digits.map((d, i) => (
                <input
                  key={i}
                  ref={el => { inputs.current[i] = el }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={d}
                  onChange={e => handleChange(i, e.target.value)}
                  onKeyDown={e => handleKeyDown(i, e)}
                  className="w-11 h-13 text-center text-xl font-black text-white rounded-xl transition-colors focus:outline-none"
                  style={{
                    height: '52px',
                    background: d ? 'rgba(245,158,11,0.08)' : 'rgba(255,255,255,0.04)',
                    border: d ? '1px solid rgba(245,158,11,0.4)' : '1px solid rgba(255,255,255,0.1)',
                  }}
                />
              ))}
            </div>

            <TurnstileWidget onToken={handleTurnstile} onExpire={handleTurnstileExpire} />

            <button
              type="submit"
              disabled={loading || success}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-[0.18em] transition-all active:scale-[0.98] disabled:opacity-50"
              style={{
                background: 'linear-gradient(135deg, #b45309, #D203DD)',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 6px 24px rgba(180,83,9,0.25)',
              }}
            >
              {loading
                ? <div className="w-4 h-4 border-2 border-white/25 border-t-white rounded-full animate-spin" />
                : <><span>Verificar dispositivo</span><ArrowRight size={13} /></>
              }
            </button>
          </form>

          <p className="text-center text-white/20 text-[10px] mt-4">
            El código expira en 10 minutos
          </p>
        </div>

        <p className="text-center text-white/25 text-[11px] mt-5">
          ¿Problemas?{' '}
          <a href="/login" className="text-amber-400 hover:text-amber-300 font-bold transition-colors">
            Volver al inicio de sesión
          </a>
        </p>

      </div>
    </div>
  )
}
