'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Shield, Loader2, Mail, ArrowRight, RefreshCw, CheckCircle2 } from 'lucide-react'
import TurnstileWidget from '@/components/TurnstileWidget'

export default function AdminVerifyPage() {
  const router = useRouter()
  const [step, setStep] = useState<'request' | 'verify'>('request')
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [turnstileToken, setTurnstileToken] = useState('')
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  const handleTurnstile = useCallback((token: string) => setTurnstileToken(token), [])
  const handleTurnstileExpire = useCallback(() => setTurnstileToken(''), [])

  // Countdown timer for resend
  useEffect(() => {
    if (countdown <= 0) return
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  async function requestCode() {
    setLoading(true)
    setError('')
    const res = await fetch('/api/admin/auth/request-code', { method: 'POST' })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) {
      setError(data.error ?? 'Error al enviar el código')
      return
    }
    setStep('verify')
    setCountdown(60)
    setTimeout(() => inputRefs.current[0]?.focus(), 100)
  }

  async function verifyCode() {
    const full = code.join('')
    if (full.length < 6) return
    setLoading(true)
    setError('')
    const res = await fetch('/api/admin/auth/verify-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: full, turnstileToken }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) {
      setError(data.error ?? 'Código incorrecto')
      setCode(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
      return
    }
    setSuccess(true)
    setTimeout(() => { window.location.href = '/admin' }, 1200)
  }

  function handleDigit(i: number, val: string) {
    const digit = val.replace(/\D/g, '').slice(-1)
    const next = [...code]
    next[i] = digit
    setCode(next)
    if (digit && i < 5) inputRefs.current[i + 1]?.focus()
    if (next.every(d => d !== '') && digit) {
      // Auto-submit when all filled
      setTimeout(() => verifyCode(), 80)
    }
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !code[i] && i > 0) {
      inputRefs.current[i - 1]?.focus()
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault()
    const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!digits) return
    const next = [...code]
    digits.split('').forEach((d, i) => { if (i < 6) next[i] = d })
    setCode(next)
    const lastFilled = Math.min(digits.length, 5)
    inputRefs.current[lastFilled]?.focus()
    if (digits.length === 6) setTimeout(() => verifyCode(), 80)
  }

  return (
  <div className="dm-page font-ui">
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#07080F' }}>

      {/* Glows */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[250px] rounded-full bg-red-600/6 blur-[100px]" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[500px] h-[250px] rounded-full bg-purple-600/5 blur-[100px]" />
      </div>

      <div className="relative w-full max-w-sm">

        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}>
            <Shield size={22} className="text-red-400" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#111827]/25">Panel de administración</p>
          <h1 className="text-lg font-black text-[#111827] mt-1">Verificación de seguridad</h1>
        </div>

        {/* Card */}
        <div className="relative rounded-2xl overflow-hidden" style={{ background: '#0D0F1E', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="h-px w-full" style={{ background: 'linear-gradient(90deg, transparent, rgba(239,68,68,0.8) 50%, transparent)' }} />

          <div className="p-6">

            {success ? (
              <div className="flex flex-col items-center gap-3 py-4">
                <CheckCircle2 size={32} className="text-green-400" />
                <p className="text-sm font-bold text-green-400">Acceso concedido</p>
                <p className="text-[11px] text-[#111827]/30">Entrando al panel...</p>
              </div>
            ) : step === 'request' ? (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <Mail size={15} className="text-red-400" />
                  <p className="text-sm font-black text-[#111827]">Enviar código por email</p>
                </div>
                <p className="text-[12px] text-[#111827]/35 leading-relaxed mb-6">
                  Te enviaremos un código de 6 dígitos a tu correo de administrador. Válido por 15 minutos.
                </p>

                {error && (
                  <p className="text-[11px] text-red-400 bg-red-500/8 border border-red-500/15 rounded-xl px-3 py-2 mb-4">{error}</p>
                )}

                <button
                  onClick={requestCode}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-xs font-black uppercase tracking-[0.15em] transition-all active:scale-[0.98] disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg, #991b1b, #7f1d1d)', color: '#fff', border: '1px solid rgba(239,68,68,0.25)', boxShadow: '0 8px 28px rgba(239,68,68,0.2)' }}
                >
                  {loading
                    ? <><Loader2 size={14} className="animate-spin" /> Enviando...</>
                    : <><Mail size={14} /> Enviar código</>
                  }
                </button>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-1">
                  <Shield size={15} className="text-red-400" />
                  <p className="text-sm font-black text-[#111827]">Ingresa el código</p>
                </div>
                <p className="text-[12px] text-[#111827]/35 leading-relaxed mb-6">
                  Revisa tu correo e ingresa el código de 6 dígitos.
                </p>

                {/* OTP inputs */}
                <div className="flex gap-2 justify-center mb-5" onPaste={handlePaste}>
                  {code.map((d, i) => (
                    <input
                      key={i}
                      ref={el => { inputRefs.current[i] = el }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={d}
                      onChange={e => handleDigit(i, e.target.value)}
                      onKeyDown={e => handleKeyDown(i, e)}
                      className="w-11 h-13 text-center text-lg font-black rounded-xl outline-none transition-all"
                      style={{
                        background: d ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.04)',
                        border: d ? '1px solid rgba(239,68,68,0.4)' : '1px solid #E4E9F0',
                        color: d ? '#f87171' : '#fff',
                        height: '52px',
                      }}
                    />
                  ))}
                </div>

                {error && (
                  <p className="text-[11px] text-red-400 bg-red-500/8 border border-red-500/15 rounded-xl px-3 py-2 mb-4 text-center">{error}</p>
                )}

                <TurnstileWidget onToken={handleTurnstile} onExpire={handleTurnstileExpire} />

                <button
                  onClick={verifyCode}
                  disabled={loading || code.some(d => !d)}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-xs font-black uppercase tracking-[0.15em] transition-all active:scale-[0.98] disabled:opacity-60 mb-3"
                  style={{ background: 'linear-gradient(135deg, #991b1b, #7f1d1d)', color: '#fff', border: '1px solid rgba(239,68,68,0.25)', boxShadow: '0 8px 28px rgba(239,68,68,0.2)' }}
                >
                  {loading
                    ? <><Loader2 size={14} className="animate-spin" /> Verificando...</>
                    : <><ArrowRight size={14} /> Verificar código</>
                  }
                </button>

                <button
                  onClick={() => { setStep('request'); setCode(['','','','','','']); setError('') }}
                  disabled={countdown > 0}
                  className="w-full flex items-center justify-center gap-1.5 text-[11px] text-[#111827]/30 hover:text-[#111827]/60 transition-colors disabled:opacity-40"
                >
                  <RefreshCw size={11} />
                  {countdown > 0 ? `Reenviar en ${countdown}s` : 'Reenviar código'}
                </button>
              </>
            )}
          </div>
        </div>

        <p className="text-center text-[10px] text-[#111827]/15 mt-4">
          La sesión admin dura 4 horas
        </p>
      </div>
    </div>
  </div>
  )
}
