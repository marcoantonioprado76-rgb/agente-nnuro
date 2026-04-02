'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react';
import { NuroSmile } from '@/components/shared/nuro-logo';
import { toast } from 'sonner';

const countryCodes = [
  { code: '+591', flag: '🇧🇴', country: 'Bolivia' },
  { code: '+54', flag: '🇦🇷', country: 'Argentina' },
  { code: '+56', flag: '🇨🇱', country: 'Chile' },
  { code: '+57', flag: '🇨🇴', country: 'Colombia' },
  { code: '+593', flag: '🇪🇨', country: 'Ecuador' },
  { code: '+52', flag: '🇲🇽', country: 'Mexico' },
  { code: '+595', flag: '🇵🇾', country: 'Paraguay' },
  { code: '+51', flag: '🇵🇪', country: 'Peru' },
  { code: '+598', flag: '🇺🇾', country: 'Uruguay' },
  { code: '+58', flag: '🇻🇪', country: 'Venezuela' },
  { code: '+1', flag: '🇺🇸', country: 'Estados Unidos' },
  { code: '+34', flag: '🇪🇸', country: 'España' },
  { code: '+55', flag: '🇧🇷', country: 'Brasil' },
  { code: '+506', flag: '🇨🇷', country: 'Costa Rica' },
  { code: '+507', flag: '🇵🇦', country: 'Panama' },
  { code: '+502', flag: '🇬🇹', country: 'Guatemala' },
  { code: '+503', flag: '🇸🇻', country: 'El Salvador' },
  { code: '+504', flag: '🇭🇳', country: 'Honduras' },
  { code: '+505', flag: '🇳🇮', country: 'Nicaragua' },
  { code: '+809', flag: '🇩🇴', country: 'Rep. Dominicana' },
];

const countries = countryCodes.map(c => c.country).sort();

// Particle background (shared with login)
function AuthBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let w = (canvas.width = window.innerWidth);
    let h = (canvas.height = window.innerHeight);

    const resize = () => { w = canvas.width = window.innerWidth; h = canvas.height = window.innerHeight; };
    window.addEventListener('resize', resize);

    const particles: { x: number; y: number; vx: number; vy: number; r: number; o: number; hue: number }[] = [];
    for (let i = 0; i < 65; i++) {
      particles.push({
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 2 + 0.8, o: Math.random() * 0.5 + 0.2,
        hue: Math.random() > 0.5 ? 220 : 260,
      });
    }

    function draw() {
      ctx!.clearRect(0, 0, w, h);
      for (const p of particles) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = w; if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h; if (p.y > h) p.y = 0;
        ctx!.beginPath(); ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx!.fillStyle = `hsla(${p.hue}, 80%, 78%, ${p.o})`; ctx!.fill();
      }
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x, dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 140) {
            ctx!.beginPath(); ctx!.moveTo(particles[i].x, particles[i].y); ctx!.lineTo(particles[j].x, particles[j].y);
            ctx!.strokeStyle = `rgba(120, 160, 255, ${0.12 * (1 - dist / 140)})`; ctx!.lineWidth = 0.6; ctx!.stroke();
          }
        }
      }
      animId = requestAnimationFrame(draw);
    }
    draw();
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize); };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" />;
}

export default function RegisterPage() {
  const [form, setForm] = useState({
    fullName: '', email: '', password: '', confirmPassword: '',
    country: '', countryCode: '+591', phoneNumber: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const supabase = createClient();

  const updateField = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/api/auth/callback` },
      });
      if (error) { toast.error('Error al conectar con Google'); setGoogleLoading(false); }
    } catch { toast.error('Error de conexion'); setGoogleLoading(false); }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!form.fullName.trim()) { toast.error('El nombre es requerido'); setLoading(false); return; }
    if (!form.email.trim()) { toast.error('El correo es requerido'); setLoading(false); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) { toast.error('Correo electronico invalido'); setLoading(false); return; }
    if (form.password.length < 6) { toast.error('La contraseña debe tener al menos 6 caracteres'); setLoading(false); return; }
    if (form.password !== form.confirmPassword) { toast.error('Las contraseñas no coinciden'); setLoading(false); return; }
    if (!form.country) { toast.error('Selecciona tu pais'); setLoading(false); return; }
    if (!form.phoneNumber.trim()) { toast.error('El numero de celular es requerido'); setLoading(false); return; }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email, password: form.password, full_name: form.fullName.trim(),
          country: form.country, country_code: form.countryCode, phone_number: form.phoneNumber.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Error al crear la cuenta'); setLoading(false); return; }

      const { error: loginError } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password });
      if (loginError) { toast.error('Cuenta creada. Por favor inicia sesion manualmente.'); window.location.href = '/login'; return; }

      toast.success('Cuenta creada exitosamente');
      window.location.href = '/dashboard';
    } catch { toast.error('Error de conexion'); } finally { setLoading(false); }
  };

  const selectedCountry = countryCodes.find(c => c.code === form.countryCode);

  return (
    <div className="relative flex min-h-screen items-center justify-center p-4 overflow-hidden" style={{
      background: 'linear-gradient(135deg, #0C0B18 0%, #110F22 35%, #13102A 55%, #16112E 75%, #0D0C16 100%)',
    }}>
      <AuthBackground />

      {/* Ambient glows — intensified */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-[1]">
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full blur-[160px]" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.25), transparent 70%)' }} />
        <div className="absolute bottom-[-15%] left-[-10%] w-[600px] h-[600px] rounded-full blur-[140px]" style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.18), transparent 70%)' }} />
        <div className="absolute top-[25%] right-[-5%] w-[500px] h-[500px] rounded-full blur-[120px]" style={{ background: 'radial-gradient(circle, rgba(56,189,248,0.14), transparent 70%)' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full blur-[180px]" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.18), rgba(124,58,237,0.06) 50%, transparent 70%)' }} />
        <div className="absolute top-[40%] left-1/2 -translate-x-1/2 w-[500px] h-[400px] rounded-full blur-[120px]" style={{ background: 'radial-gradient(ellipse, rgba(139,92,246,0.12), transparent 70%)' }} />
      </div>

      <div className="relative z-10 w-full max-w-[480px] auth-card-enter">
        <div
          className="auth-card-float rounded-3xl p-8 sm:p-10 relative overflow-hidden"
          style={{
            background: 'linear-gradient(180deg, rgba(22, 38, 68, 0.72) 0%, rgba(16, 28, 52, 0.8) 100%)',
            border: '1px solid rgba(139, 92, 246, 0.18)',
            boxShadow: '0 32px 80px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(255,255,255,0.06), 0 0 100px rgba(139, 92, 246, 0.1), 0 0 40px rgba(124, 58, 237, 0.05), inset 0 1px 0 rgba(255,255,255,0.08)',
            backdropFilter: 'blur(40px) saturate(1.4)',
          }}
        >
          {/* Top glow line */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[350px] h-[1.5px]" style={{
            background: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.4), rgba(167,139,250,0.3), rgba(139,92,246,0.4), transparent)',
          }} />

          {/* Header */}
          <div className="text-center mb-8 auth-stagger-1">
            <div className="mx-auto relative w-fit mb-6">
              <div className="absolute -inset-4 rounded-3xl auth-logo-breathe" />
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
            <h1 className="text-[32px] font-extrabold text-white tracking-tight leading-none" style={{ textShadow: '0 0 30px rgba(139, 92, 246, 0.15)' }}>Crear Cuenta</h1>
            <p className="mt-2.5 text-[14px] text-[#A8B8D0] font-medium">Comienza a automatizar tus ventas</p>
          </div>

          {/* Google */}
          <div className="auth-stagger-2">
            <Button type="button" variant="outline" onClick={handleGoogleSignIn} disabled={googleLoading}
              className="auth-btn-google w-full h-12 gap-3 rounded-xl text-[13px] font-medium text-white/90">
              {googleLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                <svg viewBox="0 0 24 24" className="h-5 w-5">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              )}
              Continuar con Google
            </Button>
          </div>

          {/* Divider */}
          <div className="relative my-7 auth-stagger-3">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full" style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.2), rgba(167,139,250,0.12), rgba(139,92,246,0.2), transparent)' }} />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="px-4 text-[#B0A5C8]/60 text-[10px] font-semibold tracking-[0.15em]" style={{ background: 'linear-gradient(180deg, rgba(22, 38, 68, 0.72), rgba(16, 28, 52, 0.8))' }}>
                O registrate con email
              </span>
            </div>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2 auth-stagger-3">
              <Label className="text-[11px] font-semibold text-[#B0A5C8] uppercase tracking-[0.15em]">Nombre completo</Label>
              <Input type="text" placeholder="Tu nombre completo" value={form.fullName}
                onChange={(e) => updateField('fullName', e.target.value)} required
                className="h-12 rounded-xl auth-input text-white placeholder:text-[#9189A8]/45 text-[14px]" />
            </div>

            <div className="space-y-2 auth-stagger-4">
              <Label className="text-[11px] font-semibold text-[#B0A5C8] uppercase tracking-[0.15em]">Correo electronico</Label>
              <Input type="email" placeholder="tu@email.com" value={form.email}
                onChange={(e) => updateField('email', e.target.value)} required
                className="h-12 rounded-xl auth-input text-white placeholder:text-[#9189A8]/45 text-[14px]" />
            </div>

            <div className="grid grid-cols-2 gap-3 auth-stagger-4">
              <div className="space-y-2">
                <Label className="text-[11px] font-semibold text-[#B0A5C8] uppercase tracking-[0.15em]">Contraseña</Label>
                <div className="relative">
                  <Input type={showPassword ? 'text' : 'password'} placeholder="Min. 6 caracteres" value={form.password}
                    onChange={(e) => updateField('password', e.target.value)} required minLength={6}
                    className="h-12 rounded-xl auth-input pr-10 text-white placeholder:text-[#9189A8]/45 text-[14px]" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9189A8]/60 hover:text-white transition-colors duration-200">
                    {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[11px] font-semibold text-[#B0A5C8] uppercase tracking-[0.15em]">Confirmar</Label>
                <Input type={showPassword ? 'text' : 'password'} placeholder="Repetir" value={form.confirmPassword}
                  onChange={(e) => updateField('confirmPassword', e.target.value)} required
                  className="h-12 rounded-xl auth-input text-white placeholder:text-[#9189A8]/45 text-[14px]" />
              </div>
            </div>

            <div className="space-y-2 auth-stagger-5">
              <Label className="text-[11px] font-semibold text-[#B0A5C8] uppercase tracking-[0.15em]">Pais</Label>
              <Select value={form.country} onValueChange={(v) => {
                if (v) { updateField('country', v); const m = countryCodes.find(c => c.country === v); if (m) updateField('countryCode', m.code); }
              }}>
                <SelectTrigger className="h-12 rounded-xl auth-input text-white">
                  <SelectValue placeholder="Seleccionar pais" />
                </SelectTrigger>
                <SelectContent>{countries.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div className="space-y-2 auth-stagger-5">
              <Label className="text-[11px] font-semibold text-[#B0A5C8] uppercase tracking-[0.15em]">Numero de celular</Label>
              <div className="flex gap-2">
                <Select value={form.countryCode} onValueChange={(v) => { if (v) updateField('countryCode', v) }}>
                  <SelectTrigger className="w-[130px] h-12 rounded-xl auth-input text-white">
                    <SelectValue>{selectedCountry ? `${selectedCountry.flag} ${selectedCountry.code}` : form.countryCode}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>{countryCodes.map(c => <SelectItem key={c.code} value={c.code}>{c.flag} {c.code} {c.country}</SelectItem>)}</SelectContent>
                </Select>
                <Input type="tel" placeholder="67534487" value={form.phoneNumber}
                  onChange={(e) => updateField('phoneNumber', e.target.value.replace(/[^0-9]/g, ''))} required
                  className="flex-1 h-12 rounded-xl auth-input text-white placeholder:text-[#9189A8]/45 text-[14px]" />
              </div>
            </div>

            <div className="auth-stagger-6 pt-1">
              <Button type="submit" disabled={loading}
                className="auth-btn-primary w-full h-12 rounded-xl text-[14px] font-semibold text-white gap-2">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                  <>Crear Cuenta<ArrowRight className="h-4 w-4" /></>
                )}
              </Button>
            </div>
          </form>

          <p className="text-center text-[13px] text-[#B0A5C8]/70 mt-7 auth-stagger-6">
            ¿Ya tienes cuenta?{' '}
            <Link href="/login" className="font-semibold text-[#8B5CF6] hover:text-[#7CA0FF] transition-all duration-300 hover:drop-shadow-[0_0_8px_rgba(139,92,246,0.3)]">
              Inicia sesion
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
