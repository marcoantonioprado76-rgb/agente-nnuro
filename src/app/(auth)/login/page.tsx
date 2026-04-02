'use client'

import { useState, useEffect, Suspense, useRef } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Eye, EyeOff, Loader2, AlertCircle, ArrowRight } from 'lucide-react'
import { NuroSmile } from '@/components/shared/nuro-logo'
import { toast } from 'sonner'

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  )
}

// ── Animated background with particles ──
function AuthBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animId: number
    let w = (canvas.width = window.innerWidth)
    let h = (canvas.height = window.innerHeight)

    const resize = () => {
      w = canvas.width = window.innerWidth
      h = canvas.height = window.innerHeight
    }
    window.addEventListener('resize', resize)

    // Particles — brighter and more visible
    const particles: { x: number; y: number; vx: number; vy: number; r: number; o: number; hue: number }[] = []
    for (let i = 0; i < 70; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        r: Math.random() * 2 + 0.8,
        o: Math.random() * 0.5 + 0.2,
        hue: Math.random() > 0.5 ? 220 : 260,
      })
    }

    function draw() {
      ctx!.clearRect(0, 0, w, h)

      // Draw particles
      for (const p of particles) {
        p.x += p.vx
        p.y += p.vy

        if (p.x < 0) p.x = w
        if (p.x > w) p.x = 0
        if (p.y < 0) p.y = h
        if (p.y > h) p.y = 0

        ctx!.beginPath()
        ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx!.fillStyle = `hsla(${p.hue}, 80%, 78%, ${p.o})`
        ctx!.fill()
      }

      // Draw connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 150) {
            ctx!.beginPath()
            ctx!.moveTo(particles[i].x, particles[i].y)
            ctx!.lineTo(particles[j].x, particles[j].y)
            ctx!.strokeStyle = `rgba(120, 160, 255, ${0.12 * (1 - dist / 150)})`
            ctx!.lineWidth = 0.6
            ctx!.stroke()
          }
        }
      }

      animId = requestAnimationFrame(draw)
    }
    draw()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" />
}

function LoginContent() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const supabase = createClient()
  const searchParams = useSearchParams()

  useEffect(() => {
    const error = searchParams.get('error')
    if (error === 'blocked') {
      setErrorMsg('Tu cuenta ha sido bloqueada. Contacta al administrador.')
    } else if (error === 'suspended') {
      setErrorMsg('Tu cuenta esta suspendida. Contacta al administrador.')
    } else if (error === 'auth') {
      setErrorMsg('Error de autenticacion. Intenta de nuevo.')
    }
  }, [searchParams])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')

    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setErrorMsg('Credenciales incorrectas')
      setLoading(false)
      return
    }

    if (authData.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, status')
        .eq('id', authData.user.id)
        .single()

      if (profile?.status === 'blocked') {
        await supabase.auth.signOut()
        setErrorMsg('Tu cuenta ha sido bloqueada. Contacta al administrador.')
        setLoading(false)
        return
      }

      if (profile?.status === 'suspended') {
        await supabase.auth.signOut()
        setErrorMsg('Tu cuenta esta suspendida. Contacta al administrador.')
        setLoading(false)
        return
      }

      toast.success('Bienvenido')

      if (profile?.role === 'admin') {
        window.location.href = '/admin/dashboard'
      } else {
        window.location.href = '/dashboard'
      }
      return
    }

    setLoading(false)
  }

  const handleGoogleLogin = async () => {
    setGoogleLoading(true)
    setErrorMsg('')

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback`,
      },
    })

    if (error) {
      setErrorMsg('Error al iniciar sesion con Google')
      setGoogleLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center p-4 overflow-hidden" style={{
      background: 'linear-gradient(135deg, #000000 0%, #060610 35%, #0A0A14 55%, #0F0F1A 75%, #000000 100%)',
    }}>
      {/* Particle canvas */}
      <AuthBackground />

      {/* Ambient glow orbs — intensified for illumination */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-[1]">
        {/* Primary blue glow — top center */}
        <div
          className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full blur-[160px]"
          style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.25), transparent 70%)' }}
        />
        {/* Purple glow — bottom left */}
        <div
          className="absolute bottom-[-15%] left-[-10%] w-[600px] h-[600px] rounded-full blur-[140px]"
          style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.18), transparent 70%)' }}
        />
        {/* Cyan glow — right */}
        <div
          className="absolute top-[25%] right-[-5%] w-[500px] h-[500px] rounded-full blur-[120px]"
          style={{ background: 'radial-gradient(circle, rgba(56,189,248,0.14), transparent 70%)' }}
        />
        {/* Center spotlight behind card — key illumination */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full blur-[180px]"
          style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.18), rgba(124,58,237,0.06) 50%, transparent 70%)' }}
        />
        {/* Extra warm glow — behind card for depth */}
        <div
          className="absolute top-[40%] left-1/2 -translate-x-1/2 w-[500px] h-[400px] rounded-full blur-[120px]"
          style={{ background: 'radial-gradient(ellipse, rgba(139,92,246,0.12), transparent 70%)' }}
        />
      </div>

      {/* Main card */}
      <div className="relative z-10 w-full max-w-[440px] auth-card-enter">
        <div
          className="auth-card-float rounded-3xl p-8 sm:p-10 relative overflow-hidden"
          style={{
            background: 'linear-gradient(180deg, rgba(22, 38, 68, 0.72) 0%, rgba(16, 28, 52, 0.8) 100%)',
            border: '1px solid rgba(139, 92, 246, 0.18)',
            boxShadow: `
              0 32px 80px rgba(0, 0, 0, 0.35),
              0 0 0 1px rgba(255,255,255,0.06),
              0 0 100px rgba(139, 92, 246, 0.1),
              0 0 40px rgba(124, 58, 237, 0.05),
              inset 0 1px 0 rgba(255,255,255,0.08)
            `,
            backdropFilter: 'blur(40px) saturate(1.4)',
          }}
        >
          {/* Card inner glow line */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[350px] h-[1.5px]" style={{
            background: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.4), rgba(167,139,250,0.3), rgba(139,92,246,0.4), transparent)',
          }} />

          {/* Logo */}
          <div className="text-center mb-8 auth-stagger-1">
            <div className="mx-auto relative w-fit mb-6">
              {/* Outer glow ring */}
              <div className="absolute -inset-4 rounded-3xl auth-logo-breathe" />
              {/* Logo container */}
              <div
                className="relative flex h-16 w-16 items-center justify-center rounded-2xl auth-logo-float"
                style={{
                  background: 'linear-gradient(145deg, rgba(139,92,246,0.28), rgba(124,58,237,0.16))',
                  border: '1px solid rgba(139,92,246,0.35)',
                  boxShadow: '0 8px 40px rgba(139,92,246,0.25), 0 0 60px rgba(139,92,246,0.1), inset 0 1px 0 rgba(255,255,255,0.12)',
                }}
              >
                <NuroSmile size={38} />
              </div>
            </div>
            <h1 className="text-[32px] font-extrabold text-white tracking-tight leading-none" style={{
              textShadow: '0 0 30px rgba(139, 92, 246, 0.15)',
            }}>
              Bienvenido
            </h1>
            <p className="mt-2.5 text-[14px] text-[#A8B8D0] font-medium">
              Inicia sesion en tu cuenta
            </p>
          </div>

          {/* Error Alert */}
          {errorMsg && (
            <div className="flex items-center gap-2.5 rounded-xl px-4 py-3 mb-6" style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              backdropFilter: 'blur(8px)',
            }}>
              <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
              <p className="text-[13px] text-red-400">{errorMsg}</p>
            </div>
          )}

          {/* Google Login */}
          <div className="auth-stagger-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleGoogleLogin}
              disabled={googleLoading || loading}
              className="auth-btn-google w-full h-12 gap-3 rounded-xl text-[13px] font-medium text-white/90"
            >
              {googleLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
              )}
              Continuar con Google
            </Button>
          </div>

          {/* Divider */}
          <div className="relative my-7 auth-stagger-3">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full" style={{
                height: '1px',
                background: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.2), rgba(167,139,250,0.12), rgba(139,92,246,0.2), transparent)',
              }} />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span
                className="px-4 text-[#94A3B8]/60 text-[10px] font-semibold tracking-[0.15em]"
                style={{ background: 'linear-gradient(180deg, rgba(22, 38, 68, 0.72), rgba(16, 28, 52, 0.8))' }}
              >
                O con email
              </span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2 auth-stagger-4">
              <Label htmlFor="email" className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-[0.15em]">
                Correo electronico
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12 rounded-xl auth-input text-white placeholder:text-[#64748B]/45 text-[14px]"
              />
            </div>

            <div className="space-y-2 auth-stagger-5">
              <Label htmlFor="password" className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-[0.15em]">
                Contrasena
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-12 rounded-xl auth-input pr-11 text-white placeholder:text-[#64748B]/45 text-[14px]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#64748B]/60 hover:text-white transition-colors duration-200"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex justify-end -mt-1 auth-stagger-6">
              <Link
                href="/forgot-password"
                className="text-[12px] text-[#8B5CF6] hover:text-[#7CA0FF] transition-colors duration-200"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>

            <div className="auth-stagger-6">
              <Button
                type="submit"
                disabled={loading || googleLoading}
                className="auth-btn-primary w-full h-12 rounded-xl text-[14px] font-semibold text-white gap-2 mt-1"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Iniciar Sesion
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </form>

          {/* Footer link */}
          <p className="text-center text-[13px] text-[#94A3B8]/70 mt-7 auth-stagger-6">
            ¿No tienes cuenta?{' '}
            <Link
              href="/register"
              className="font-semibold text-[#8B5CF6] hover:text-[#7CA0FF] transition-all duration-300 hover:drop-shadow-[0_0_8px_rgba(139,92,246,0.3)]"
            >
              Registrate
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
