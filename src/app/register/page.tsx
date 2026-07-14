'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Eye, EyeOff, AlertCircle, CheckCircle2, ArrowRight, ChevronDown, User } from 'lucide-react'
import TurnstileWidget from '@/components/TurnstileWidget'
import '../dashboard/dashboard.css' // .dm-* utilities (no se cargan fuera de /dashboard)

const LATAM_DATA: Record<string, string[]> = {
  'Argentina': ['Buenos Aires', 'Cordoba', 'Rosario', 'Mendoza', 'La Plata', 'Tucuman', 'Mar del Plata', 'Salta', 'Santa Fe', 'San Juan'],
  'Bolivia': ['La Paz', 'Santa Cruz de la Sierra', 'Cochabamba', 'Sucre', 'Oruro', 'Potosi', 'Tarija', 'Beni', 'Trinidad', 'Cobija'],
  'Brasil': ['Sao Paulo', 'Rio de Janeiro', 'Brasilia', 'Salvador', 'Fortaleza', 'Belo Horizonte', 'Manaus', 'Curitiba', 'Recife', 'Porto Alegre'],
  'Chile': ['Santiago', 'Valparaiso', 'Concepcion', 'La Serena', 'Antofagasta', 'Temuco', 'Rancagua', 'Talca', 'Arica', 'Iquique'],
  'Colombia': ['Bogota', 'Medellin', 'Cali', 'Barranquilla', 'Cartagena', 'Cucuta', 'Bucaramanga', 'Pereira', 'Santa Marta', 'Manizales'],
  'Costa Rica': ['San Jose', 'Alajuela', 'Cartago', 'Heredia', 'Liberia', 'Puntarenas', 'Limon', 'Nicoya', 'San Carlos', 'Desamparados'],
  'Cuba': ['La Habana', 'Santiago de Cuba', 'Camaguey', 'Holguin', 'Santa Clara', 'Guantanamo', 'Bayamo', 'Las Tunas', 'Matanzas', 'Cienfuegos'],
  'Ecuador': ['Quito', 'Guayaquil', 'Cuenca', 'Ambato', 'Portoviejo', 'Machala', 'Loja', 'Riobamba', 'Esmeraldas', 'Ibarra'],
  'El Salvador': ['San Salvador', 'Santa Ana', 'San Miguel', 'Soyapango', 'Mejicanos', 'Apopa', 'Delgado', 'Sonsonate', 'Usulutan', 'Ahuachapan'],
  'Guatemala': ['Ciudad de Guatemala', 'Mixco', 'Villa Nueva', 'Quetzaltenango', 'Escuintla', 'Chinautla', 'San Juan Sacatepequez', 'Petapa', 'Amatitlan', 'Coban'],
  'Honduras': ['Tegucigalpa', 'San Pedro Sula', 'Choloma', 'La Ceiba', 'El Progreso', 'Juticalpa', 'Danli', 'Choluteca', 'Comayagua', 'Puerto Cortes'],
  'Mexico': ['Ciudad de Mexico', 'Guadalajara', 'Monterrey', 'Puebla', 'Tijuana', 'Ciudad Juarez', 'Leon', 'Zapopan', 'Ecatepec', 'Nezahualcoyotl'],
  'Nicaragua': ['Managua', 'Leon', 'Masaya', 'Granada', 'Matagalpa', 'Chinandega', 'Estelil', 'Jinotega', 'Nueva Guinea', 'Juigalpa'],
  'Panama': ['Ciudad de Panama', 'San Miguelito', 'Colon', 'David', 'La Chorrera', 'Tocumen', 'Arraijan', 'Penonome', 'Santiago', 'Chitre'],
  'Paraguay': ['Asuncion', 'Ciudad del Este', 'San Lorenzo', 'Luque', 'Capiata', 'Lambare', 'Fernando de la Mora', 'Limpio', 'Encarnacion', 'Pedro Juan Caballero'],
  'Peru': ['Lima', 'Arequipa', 'Trujillo', 'Chiclayo', 'Piura', 'Iquitos', 'Cusco', 'Chimbote', 'Huancayo', 'Tacna'],
  'Puerto Rico': ['San Juan', 'Bayamon', 'Carolina', 'Ponce', 'Caguas', 'Guaynabo', 'Arecibo', 'Toa Baja', 'Mayaguez', 'Trujillo Alto'],
  'Republica Dominicana': ['Santo Domingo', 'Santiago de los Caballeros', 'San Pedro de Macoris', 'La Romana', 'San Cristobal', 'Puerto Plata', 'Higui', 'San Francisco de Macoris', 'Moca', 'Barahona'],
  'Uruguay': ['Montevideo', 'Salto', 'Ciudad de la Costa', 'Paysandu', 'Las Piedras', 'Rivera', 'Maldonado', 'Tacuarembo', 'Melo', 'Mercedes'],
  'Venezuela': ['Caracas', 'Maracaibo', 'Valencia', 'Barquisimeto', 'Maracay', 'Ciudad Guayana', 'Barcelona', 'Maturin', 'San Cristobal', 'Cumaná'],
}
const COUNTRIES = Object.keys(LATAM_DATA).sort()

interface FormData {
  username: string
  fullName: string
  country: string
  city: string
  identityDocument: string
  dateOfBirth: string
  email: string
  password: string
  confirmPassword: string
  acceptTerms: boolean
}
interface SuccessData { fullName: string; username: string; password: string }

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div style={{background:'linear-gradient(140deg, #0B1B2B 0%, #0A1320 52%, #050B14 100%)',minHeight:'100vh',color:'#111827'}} className="font-ui min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#FF096C]/30 border-t-[#FF096C] rounded-full animate-spin" />
      </div>
    }>
      <RegisterForm />
    </Suspense>
  )
}

function RegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [cities, setCities] = useState<string[]>([])
  const [success, setSuccess] = useState<SuccessData | null>(null)
  const [turnstileToken, setTurnstileToken] = useState('')
  const handleTurnstile = useCallback((token: string) => setTurnstileToken(token), [])
  const handleTurnstileExpire = useCallback(() => setTurnstileToken(''), [])
  const [form, setForm] = useState<FormData>({
    username: '', fullName: '', country: '', city: '',
    identityDocument: '', dateOfBirth: '', email: '', password: '', confirmPassword: '', acceptTerms: false,
  })

  // Pack Empresarial: registro por link de invitación (?empresa=slug)
  const empresaSlug = searchParams.get('empresa') || ''
  const [empresaName, setEmpresaName] = useState<string | null>(null)
  useEffect(() => {
    if (!empresaSlug) return
    fetch(`/api/organizations/by-slug/${empresaSlug}`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (d?.name) setEmpresaName(d.name) })
      .catch(() => {})
  }, [empresaSlug])

  const update = (field: keyof FormData, value: string | boolean) => {
    if (field === 'country') {
      setCities(LATAM_DATA[value as string] || [])
      setForm(f => ({ ...f, country: value as string, city: '' }))
    } else {
      setForm(f => ({ ...f, [field]: value }))
    }
    setError('')
  }

  const validate = (): boolean => {
    if (!form.username || !form.fullName || !form.country || !form.city || !form.identityDocument || !form.dateOfBirth) {
      setError('Completa todos los campos'); return false
    }
    const dob = new Date(form.dateOfBirth)
    const today = new Date()
    let age = today.getFullYear() - dob.getFullYear()
    const m = today.getMonth() - dob.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--
    if (age < 18) { setError('Debes ser mayor de 18 años'); return false }
    if (!form.email || !form.password || !form.confirmPassword) { setError('Completa todos los campos'); return false }
    if (form.password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres'); return false }
    if (!/(?=.*[A-Z])(?=.*[0-9])/.test(form.password)) { setError('La contraseña debe tener una mayúscula y un número'); return false }
    if (form.password !== form.confirmPassword) { setError('Las contraseñas no coinciden'); return false }
    if (!form.acceptTerms) { setError('Debes aceptar los términos y condiciones'); return false }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, turnstileToken, empresa: empresaSlug || undefined }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      setSuccess({ fullName: form.fullName, username: form.username, password: form.password })
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  const inputCls = 'dm-input text-sm'
  const selectCls = 'dm-input text-sm appearance-none cursor-pointer'
  const labelCls = 'block text-[10px] font-bold text-[#6B7280] uppercase tracking-widest mb-1.5'

  // ── Pantalla de éxito ──
  if (success) {
    return (
      <div style={{background:'linear-gradient(135deg,#F8FAFC,#F5F7FA 45%,#EEF2F7)',minHeight:'100vh',color:'#111827'}} className="font-ui min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
        {/* Background glows */}
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-green-500/5 blur-[140px]" />
          <div className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full bg-purple-600/6 blur-[130px]" />
        </div>

        <div className="w-full max-w-[380px] relative z-10">
          <div className="dm-card relative overflow-hidden" style={{ padding: '2rem' }}>

            {/* Top neon line */}
            <div className="absolute top-0 left-0 right-0 h-px"
              style={{ background: 'linear-gradient(90deg, transparent, #FF096C 40%, #D203DD 60%, transparent)' }} />

            {/* Icon + header */}
            <div className="flex flex-col items-center text-center mb-6">
              <div className="relative mb-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                  style={{ background: 'rgba(0,255,157,0.08)', border: '1px solid rgba(0,255,157,0.25)', boxShadow: '0 0 40px rgba(0,255,157,0.1)' }}>
                  <CheckCircle2 size={26} style={{ color: '#FF096C' }} />
                </div>
              </div>
              <p className="text-[9px] font-black uppercase tracking-[0.22em] mb-1" style={{ color: '#FF096C' }}>
                ¡Cuenta creada!
              </p>
              <h1 className="text-lg font-black text-[#111827]">Bienvenido,</h1>
              <p className="text-base font-black text-[#374151] -mt-0.5">{success.fullName}</p>
            </div>

            {/* Warning */}
            <div className="flex items-start gap-2.5 px-3.5 py-2.5 rounded-xl mb-5"
              style={{ background: 'rgba(255,184,0,0.05)', border: '1px solid rgba(255,184,0,0.15)' }}>
              <span className="text-xs shrink-0 mt-px">⚠️</span>
              <p className="text-[10px] text-[#6B7280] leading-relaxed">
                Guarda estas credenciales. No podrás recuperar tu contraseña si la olvidas.
              </p>
            </div>

            {/* Credentials block */}
            <div className="rounded-xl overflow-hidden mb-5"
              style={{ border: '1px solid rgba(255,255,255,0.08)' }}>

              {/* Username row */}
              <div className="px-4 py-3.5 border-b border-[#E4E9F0]"
                style={{ background: 'rgba(255,255,255,0.03)' }}>
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#6B7280] mb-1">Usuario</p>
                <p className="text-sm font-black text-[#111827] tracking-wide">{success.username}</p>
              </div>

              {/* Password row */}
              <div className="px-4 py-3.5 border-b border-[#E4E9F0]"
                style={{ background: 'rgba(255,255,255,0.02)' }}>
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#6B7280] mb-1">Contraseña</p>
                <p className="text-sm font-black text-[#111827] font-mono tracking-widest">{success.password}</p>
              </div>

            </div>

            {/* CTA */}
            <button
              onClick={() => { router.refresh(); router.push('/dashboard') }}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-[0.18em] transition-all active:scale-[0.97] hover:brightness-110"
              style={{
                background: 'linear-gradient(135deg, #0D1E79, #D203DD)',
                color: '#fff',
                border: '1px solid #E4E9F0',
                boxShadow: '0 6px 24px rgba(210,3,221,0.30)',
              }}
            >
              Ir a mi panel <ArrowRight size={12} />
            </button>

          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{backgroundImage:'linear-gradient(180deg, rgba(11,27,43,0.66) 0%, rgba(8,16,28,0.80) 46%, rgba(5,11,20,0.93) 100%), url(/auth-bg.jpg)',backgroundColor:'#0A1320',backgroundSize:'cover',backgroundPosition:'center',backgroundRepeat:'no-repeat',minHeight:'100vh',color:'#111827'}} className="font-ui min-h-screen flex items-center justify-center px-4 py-10 relative overflow-hidden">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full bg-purple-600/20 blur-[120px]" />
        <div className="absolute -bottom-32 -left-32 w-[500px] h-[500px] rounded-full bg-[#FF096C]/16 blur-[120px]" />
      </div>

      <div className="w-full max-w-sm relative z-10">

        {/* Logo oficial */}
        <div className="flex flex-col items-center mb-6">
          <img src="/logo-oficial-mydiamond.png" alt="MY DIAMOND" style={{ width: 200, height: 'auto', display: 'block', filter: 'drop-shadow(0 5px 12px rgba(0,0,0,0.85)) drop-shadow(0 22px 46px rgba(0,0,0,0.68)) drop-shadow(0 0 28px rgba(183,53,184,0.30))' }} />
          <p className="text-xs text-[#6B7280] mt-3">Crea tu cuenta gratuita</p>
        </div>

        {/* Card */}
        <div className="dm-card p-6" style={{ boxShadow: '0 0 0 1px rgba(255,255,255,0.10), 0 44px 100px -22px rgba(0,0,0,0.88), 0 18px 48px rgba(0,0,0,0.6)' }}>

          <h2 className="text-sm font-black text-[#111827] mb-0.5">Registro</h2>
          <p className="text-[11px] text-[#6B7280] mb-5">Completa los datos para unirte a la plataforma.</p>

          {empresaName && (
            <div className="flex items-center gap-2 rounded-xl px-3 py-2.5 mb-4" style={{ background: 'rgba(183,53,184,0.08)', border: '1px solid rgba(183,53,184,0.25)' }}>
              <User size={14} style={{ color: '#B735B8' }} className="shrink-0" />
              <p className="text-xs" style={{ color: '#7A2E8A' }}>Te estás uniendo a <strong>{empresaName}</strong>. Al registrarte quedarás dentro de esta empresa.</p>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5 mb-4">
              <AlertCircle size={13} className="text-red-400 shrink-0" />
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">

            {/* Usuario */}
            <div>
              <label className={labelCls}>Usuario</label>
              <input
                type="text"
                className={inputCls}
                placeholder="nombre_usuario"
                value={form.username}
                onChange={e => update('username', e.target.value)}
              />
            </div>

            {/* Nombre completo */}
            <div>
              <label className={labelCls}>Nombre completo</label>
              <input
                type="text"
                className={inputCls}
                placeholder="Juan Pérez"
                value={form.fullName}
                onChange={e => update('fullName', e.target.value)}
              />
            </div>

            {/* País / Ciudad */}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className={labelCls}>País</label>
                <div className="relative">
                  <select
                    className={selectCls}
                    value={form.country}
                    onChange={e => update('country', e.target.value)}
                    style={{ color: form.country ? '#fff' : '#6B7280' }}
                  >
                    <option value="" disabled className="bg-white text-[#9CA3AF]">País</option>
                    {COUNTRIES.map(c => <option key={c} value={c} className="bg-white text-[#111827]">{c}</option>)}
                  </select>
                  <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280] pointer-events-none" />
                </div>
              </div>
              <div>
                <label className={labelCls}>Ciudad</label>
                <div className="relative">
                  {form.country ? (
                    <>
                      <select
                        className={selectCls}
                        value={form.city}
                        onChange={e => update('city', e.target.value)}
                        style={{ color: form.city ? '#fff' : '#6B7280' }}
                      >
                        <option value="" disabled className="bg-white text-[#9CA3AF]">Ciudad</option>
                        {cities.map(c => <option key={c} value={c} className="bg-white text-[#111827]">{c}</option>)}
                      </select>
                      <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280] pointer-events-none" />
                    </>
                  ) : (
                    <div className="w-full bg-[#F8FAFC] border border-[#E4E9F0] rounded-xl px-3.5 py-2.5 text-xs text-[#9CA3AF] cursor-not-allowed opacity-50">Ciudad</div>
                  )}
                </div>
              </div>
            </div>

            {/* CI / Documento */}
            <div>
              <label className={labelCls}>C.I. / Documento</label>
              <input
                type="text"
                className={inputCls}
                placeholder="12345678"
                value={form.identityDocument}
                onChange={e => update('identityDocument', e.target.value)}
              />
            </div>

            {/* Fecha de nacimiento */}
            <div>
              <label className={labelCls}>Fecha de nacimiento</label>
              <input
                type="date"
                className={inputCls}
                value={form.dateOfBirth}
                onChange={e => update('dateOfBirth', e.target.value)}
                max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
              />
            </div>

            {/* Separador */}
            <div className="border-t border-[#E4E9F0] pt-1" />

            {/* Email */}
            <div>
              <label className={labelCls}>Correo electrónico</label>
              <input
                type="email"
                className={inputCls}
                placeholder="tu@correo.com"
                value={form.email}
                onChange={e => update('email', e.target.value)}
                autoComplete="email"
              />
            </div>

            {/* Contraseña */}
            <div>
              <label className={labelCls}>Contraseña</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className={`${inputCls} pr-11`}
                  placeholder="Min. 8 chars, 1 mayúscula, 1 número"
                  value={form.password}
                  onChange={e => update('password', e.target.value)}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#111827]/60 transition-colors"
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              {form.password && (
                <div className="flex gap-3 mt-1.5">
                  <span className={`text-[10px] font-bold ${form.password.length >= 8 ? 'text-green-400' : 'text-[#9CA3AF]'}`}>8+ chars</span>
                  <span className={`text-[10px] font-bold ${/[A-Z]/.test(form.password) ? 'text-green-400' : 'text-[#9CA3AF]'}`}>Mayúscula</span>
                  <span className={`text-[10px] font-bold ${/[0-9]/.test(form.password) ? 'text-green-400' : 'text-[#9CA3AF]'}`}>Número</span>
                </div>
              )}
            </div>

            {/* Confirmar contraseña */}
            <div>
              <label className={labelCls}>Confirmar contraseña</label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  className={`${inputCls} pr-11`}
                  placeholder="Repite tu contraseña"
                  value={form.confirmPassword}
                  onChange={e => update('confirmPassword', e.target.value)}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#111827]/60 transition-colors"
                >
                  {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {/* Términos */}
            <label className="flex items-start gap-2.5 cursor-pointer pt-0.5">
              <input
                type="checkbox"
                checked={form.acceptTerms}
                onChange={e => update('acceptTerms', e.target.checked)}
                className="mt-0.5 w-3.5 h-3.5 accent-purple-500 rounded shrink-0"
              />
              <span className="text-[11px] text-[#6B7280] leading-relaxed">
                Acepto los{' '}
                <Link href="/terms" className="text-[#FF096C] hover:text-cyan-300 transition-colors">Términos</Link>
                {' '}y la{' '}
                <Link href="/privacy" className="text-[#FF096C] hover:text-cyan-300 transition-colors">Política de Privacidad</Link>
              </span>
            </label>

            {/* Turnstile anti-bot */}
            <TurnstileWidget onToken={handleTurnstile} onExpire={handleTurnstileExpire} />

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="dm-login-btn w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest disabled:opacity-60 mt-1"
              style={{
                background: 'linear-gradient(135deg, #FF2D95 0%, #B735B8 48%, #233B8F 100%)',
                color: '#fff',
                border: 'none',
              }}
            >
              {loading
                ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                : <><span>Crear cuenta</span><ArrowRight size={13} /></>
              }
            </button>

          </form>
        </div>

        <p className="text-center text-white/55 text-xs mt-5">
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" className="text-purple-400 hover:text-purple-300 font-bold transition-colors">
            Iniciar sesión
          </Link>
        </p>

      </div>
    </div>
  )
}
