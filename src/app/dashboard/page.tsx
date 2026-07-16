'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import PrismLoader from '@/components/PrismLoader'
import NotificationBell from '@/components/NotificationBell'

interface DashboardData {
  user: {
    fullName: string
    username: string
    isActive: boolean
    avatarUrl?: string | null
    rank?: string
    planExpiresAt?: string | null
  }
  business?: { ingresos: number; leads: number; ventas: number }
}

const IMAGES = [
  '/cover/cover1.jpg',
  '/cover/cover2.jpg',
  '/cover/cover3.jpg',
  '/cover/cover4.jpg',
]

// Clipping queda en la lista con hidden:true — oculto visualmente del Inicio
// pero su lógica/ruta siguen intactas. Para restaurarlo: quitar `hidden: true`.
const SERVICES = [
  { href: '/dashboard/services/ads/meta',      icon: 'fa-brands fa-meta',          label: 'Meta Ads',       desc: 'Facebook & Instagram',   accent: '#0081FB' },
  { href: '/dashboard/services/ads/tiktok',    icon: 'fa-brands fa-tiktok',        label: 'TikTok Ads',     desc: 'TikTok for Business',    accent: '#EE1D52', hidden: true },
  { href: '/dashboard/services/ads/google',    icon: 'fa-brands fa-google',        label: 'Google Ads',     desc: 'Search · Display · YT',  accent: '#FBBC04', hidden: true },
  { href: '/dashboard/services/social',        icon: 'fa-solid fa-circle-nodes',   label: 'Social',         desc: 'Todas tus redes',        accent: '#9B6BFF' },
  { href: '/dashboard/services/landing-pages', icon: 'fa-solid fa-layer-group',    label: 'Landing Pages',  desc: 'Páginas que venden',     accent: '#7B5BFF' },
  { href: '/dashboard/services/whatsapp',      icon: 'fa-solid fa-robot',          label: 'Agentes de IA', desc: 'Venden 24/7',            accent: '#00E5D0' },
  { href: '/dashboard/services/virtual-store', icon: 'fa-solid fa-store',          label: 'Tienda Virtual', desc: 'Tu tienda online',       accent: '#3B82F6' },
  { href: '/dashboard/crm',                    icon: 'fa-solid fa-users-gear',     label: 'CRM Broadcast',  desc: 'Mensajes masivos',       accent: '#00E5D0' },
  { href: '/dashboard/academy',                icon: 'fa-solid fa-graduation-cap', label: 'Academy',        desc: 'Aprende y escala',       accent: '#8B5CF6', hidden: true },
  { href: '/dashboard/services/clipping',      icon: 'fa-solid fa-newspaper',      label: 'Clipping',       desc: 'Gana por vistas',        accent: '#FF2D55', hidden: true },
]

export default function DashboardPage() {
  const router = useRouter()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [imgIdx, setImgIdx] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [countdown, setCountdown] = useState<{ d: number; h: number; m: number; s: number } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/network')
      if (res.status === 401) { router.push('/login'); return }
      const json = await res.json()
      if (json?.user) setData(json)
    } catch { /**/ } finally { setLoading(false) }
  }, [router])

  useEffect(() => { fetchData() }, [fetchData])
  useEffect(() => {
    const id = setInterval(() => setImgIdx(p => (p + 1) % IMAGES.length), 5000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (!data?.user.planExpiresAt) { setCountdown(null); return }
    const target = new Date(data.user.planExpiresAt).getTime()
    const tick = () => {
      const diff = target - Date.now()
      if (diff <= 0) { setCountdown({ d: 0, h: 0, m: 0, s: 0 }); return }
      setCountdown({ d: Math.floor(diff / 86400000), h: Math.floor((diff % 86400000) / 3600000), m: Math.floor((diff % 3600000) / 60000), s: Math.floor((diff % 60000) / 1000) })
    }
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id)
  }, [data?.user.planExpiresAt])

  const uploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file || !data) return
    setUploading(true)
    const fd = new FormData(); fd.append('file', file)
    try {
      const res = await fetch('/api/users/avatar', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) return
      setData(prev => prev ? { ...prev, user: { ...prev.user, avatarUrl: json.avatarUrl } } : prev)
    } catch { /**/ } finally {
      setUploading(false); if (fileRef.current) fileRef.current.value = ''
    }
  }

  useEffect(() => {
    if (!data?.user) return
    const nameEl = document.querySelector('.sidebar__user-name')
    const roleEl = document.querySelector('.sidebar__user-role')
    if (nameEl) nameEl.textContent = data.user.fullName
    if (roleEl) roleEl.innerHTML = `@${data.user.username} · <span style="color:var(--clr-accent-lt)">Activo</span>`
    if (data.user.avatarUrl) {
      const sidebarAv = document.getElementById('dAvatar')
      if (sidebarAv) sidebarAv.innerHTML = `<img src="${data.user.avatarUrl}" alt="Avatar" style="width:100%;height:100%;object-fit:cover;border-radius:50%"/>`
    }
  }, [data])

  if (loading) return <PrismLoader />
  if (!data) return (
    <div style={{ minHeight: '100vh', display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.3)' }}>
      Error al cargar datos
    </div>
  )

  return (
    <>
      {/* ═══════════════════════════════════════════════════════════
           MOBILE VIEW
      ═══════════════════════════════════════════════════════════ */}
      <div className="lg:hidden flex flex-col min-h-screen w-full font-ui" style={{ position: 'relative', background: 'radial-gradient(circle at top right, rgba(0,229,208,0.08), transparent 30%), radial-gradient(circle at bottom left, rgba(35,59,143,0.08), transparent 32%), linear-gradient(135deg, #EEF2F7 0%, #F5F7FA 45%, #E9EEF5 100%)', color: '#111827' }}>

        {/* Cover Photo */}
        <div className="cover" id="cover">
          {IMAGES.map((img, i) => (
            <div key={i} className={`cover__slide ${imgIdx === i ? 'cover__slide--active' : ''}`} style={{ backgroundImage: `url('${img}')` }}></div>
          ))}
          <div className="cover__dots">
            {IMAGES.map((_, i) => (
              <button key={i} onClick={() => setImgIdx(i)} className={`cover__dot ${imgIdx === i ? 'cover__dot--active' : ''}`} aria-label={`Slide ${i + 1}`}></button>
            ))}
          </div>
          <div className="lg:hidden" style={{ position: 'absolute', top: 8, left: 8, zIndex: 10 }}>
            <NotificationBell />
          </div>
        </div>

        {/* Profile */}
        <div className="profile">
          <div className="avatar-wrap">
            <div className="avatar-ring"></div>
            <label htmlFor="avatar-file-mobile" className="avatar" style={{ cursor: uploading ? 'not-allowed' : 'pointer' }}>
              <input id="avatar-file-mobile" type="file" accept="image/*" disabled={uploading} style={{ display: 'none' }} onChange={uploadAvatar} />
              {data.user.avatarUrl
                ? <img src={data.user.avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                : <i className="fa-solid fa-user" aria-hidden="true"></i>}
            </label>
            <div className="avatar__status" title="En línea"></div>
          </div>
          <p className="profile__name">
            {data.user.fullName}
            <span className="u-pill u-pill--accent">{data.user.rank || 'PRO'}</span>
          </p>
          <p className="profile__handle">@{data.user.username} · NÜRO</p>
          <span className="u-pill u-pill--accent" style={{ marginTop: '4px', fontSize: '.74rem', padding: '5px 14px' }}>
            <span className="u-live-dot"></span>&nbsp;{data.user.rank || 'Plan'} · {data.user.isActive ? 'Activo' : 'Inactivo'}
          </span>
        </div>

        {/* Plan CTA — mobile */}
        <div style={{ padding: '0 16px 4px' }}>
          <Link
            href="/dashboard/planes"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              width: '100%', padding: '12px 0', borderRadius: 12, textDecoration: 'none',
              fontWeight: 700, fontSize: 13, letterSpacing: '0.04em',
              background: data.user.rank && data.user.rank !== 'NONE'
                ? 'rgba(0,229,208,0.08)'
                : 'linear-gradient(135deg, #30485a 0%, #26404f 52%, #1d3240 100%)',
              border: data.user.rank && data.user.rank !== 'NONE'
                ? '1px solid rgba(0,229,208,0.20)'
                : 'none',
              boxShadow: data.user.rank && data.user.rank !== 'NONE' ? 'none' : '0 14px 30px rgba(0,229,208,0.26)',
              color: data.user.rank && data.user.rank !== 'NONE' ? '#00E5D0' : '#fff',
            }}
          >
            <i className={`fa-solid ${data.user.rank && data.user.rank !== 'NONE' ? 'fa-rotate' : 'fa-crown'}`}></i>
            {data.user.rank && data.user.rank !== 'NONE' ? 'Renovar Plan' : 'Comprar Plan'}
          </Link>
        </div>

        {/* Services Grid — mobile */}
        <main className="feed" id="feed">
          <p className="section-label" style={{ marginBottom: 4 }}><i className="fa-solid fa-th-large"></i>Servicios</p>
          <p style={{ fontSize: 11, color: '#6B7280', margin: '0 0 30px', lineHeight: 1.5 }}>
            Activa tu sistema de automatización.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 14, rowGap: 32 }}>
            {SERVICES.filter(s => !s.hidden).map((s) => (
              <Link key={s.href} href={s.href} style={{ textDecoration: 'none', display: 'block' }}>
                <div
                  className="svc-card"
                  style={{
                    position: 'relative', borderRadius: 18,
                    padding: '34px 14px 18px',
                    background: '#FFFFFF',
                    border: '1px solid #E4E9F0',
                    boxShadow: '0 16px 36px -18px rgba(15,23,42,0.18), inset 0 1px 0 rgba(255,255,255,0.9)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                  }}
                >
                  {/* línea superior 3px con gradiente diamante */}
                  <div style={{ position: 'absolute', top: 0, left: 16, right: 16, height: 3, borderRadius: 999, background: 'linear-gradient(90deg, #00E5D0, #26F5E2, #00C9B8)', pointerEvents: 'none' }} />
                  {/* halo suave detrás del icono */}
                  <div style={{ position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)', width: 90, height: 60, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(0,229,208,0.18), transparent 72%)', filter: 'blur(12px)', pointerEvents: 'none' }} />
                  {/* icono diamante sobresaliendo desde arriba */}
                  <div className="svc-float" style={{
                    position: 'absolute', top: -20, left: '50%', transform: 'translateX(-50%)',
                    width: 44, height: 44, borderRadius: 14,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'linear-gradient(135deg, #30485a 0%, #26404f 52%, #1d3240 100%)',
                    boxShadow: '0 12px 26px -8px rgba(0,229,208,0.45), inset 0 1px 0 rgba(255,255,255,0.25)',
                    fontSize: 17, color: '#fff',
                    WebkitFontSmoothing: 'antialiased',
                  }}>
                    <i className={s.icon} />
                  </div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#111827', margin: 0, lineHeight: 1.18, textAlign: 'center', letterSpacing: '-0.02em' }}>{s.label}</p>
                  <p style={{ fontSize: 9.5, fontWeight: 400, color: '#9CA3AF', margin: 0, lineHeight: 1.3, textAlign: 'center', letterSpacing: '0.02em' }}>{s.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </main>
      </div>

      {/* ═══════════════════════════════════════════════════════════
           DESKTOP VIEW — Premium light (NÜRO)
      ═══════════════════════════════════════════════════════════ */}
      <div className="hidden lg:flex w-full flex-1">
        <main className="d-main font-ui" style={{ background: 'radial-gradient(circle at top right, rgba(0,229,208,0.06), transparent 28%), radial-gradient(circle at bottom left, rgba(35,59,143,0.06), transparent 30%), linear-gradient(135deg, #DDE4EC 0%, #E6ECF3 45%, #D6DEE9 100%)', color: '#111827', minHeight: '100vh', gap: '24px' }}>

          {/* ── COVER (carrusel) + PERFIL ── */}
          <div style={{ position: 'relative', borderRadius: 28, overflow: 'hidden', minHeight: 320, border: '1px solid #E4E9F0', boxShadow: '0 18px 45px rgba(15,23,42,0.10)' }}>
            {IMAGES.map((img, i) => (
              <div key={i} style={{ position: 'absolute', inset: 0, backgroundImage: `url('${img}')`, backgroundSize: 'cover', backgroundPosition: 'center', opacity: imgIdx === i ? 1 : 0, transition: 'opacity 1s ease' }} />
            ))}
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(22,31,39,0.97) 0%, rgba(22,31,39,0.88) 26%, rgba(22,31,39,0.45) 50%, rgba(22,31,39,0) 72%)' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 68%, rgba(22,31,39,0.55) 100%)' }} />

            <div style={{ position: 'absolute', bottom: 15, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 7, zIndex: 3 }}>
              {IMAGES.map((_, i) => (
                <button key={i} onClick={() => setImgIdx(i)} aria-label={`Slide ${i + 1}`} style={{ width: imgIdx === i ? 24 : 8, height: 8, borderRadius: 999, border: 'none', cursor: 'pointer', padding: 0, background: imgIdx === i ? 'linear-gradient(90deg,#00E5D0,#26F5E2,#00C9B8)' : 'rgba(255,255,255,0.6)', transition: 'all .3s ease' }} />
              ))}
            </div>

            <div style={{ position: 'absolute', left: 34, top: '50%', transform: 'translateY(-50%)', zIndex: 3, display: 'flex', alignItems: 'center', gap: 22, maxWidth: '72%' }}>
              <label htmlFor="avatar-file-cover" style={{ cursor: uploading ? 'not-allowed' : 'pointer', position: 'relative', flexShrink: 0 }} title="Cambiar foto">
                <input id="avatar-file-cover" type="file" accept="image/*" disabled={uploading} style={{ display: 'none' }} onChange={uploadAvatar} />
                <div style={{ width: 104, height: 104, borderRadius: '50%', padding: 3, background: 'linear-gradient(135deg,#00E5D0,#26F5E2,#00C9B8)', boxShadow: '0 14px 34px rgba(0,229,208,0.40)' }}>
                  <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', background: '#0B1B2B', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid #fff' }}>
                    {data.user.avatarUrl
                      ? <img src={data.user.avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <i className="fa-solid fa-user" style={{ fontSize: 38, color: 'rgba(255,255,255,0.6)' }} />}
                  </div>
                </div>
                <span style={{ position: 'absolute', right: 6, bottom: 6, width: 17, height: 17, borderRadius: '50%', background: '#16A34A', border: '3px solid #fff' }} title="En línea" />
              </label>
              <div style={{ minWidth: 0 }}>
                <h1 style={{ margin: 0, fontSize: 'clamp(17px, 1.8vw, 24px)', fontWeight: 800, lineHeight: 1.1, color: '#fff', letterSpacing: '-0.01em', textShadow: '0 2px 18px rgba(0,0,0,0.6)' }}>{data.user.fullName}</h1>
                <p style={{ margin: '7px 0 12px', fontSize: 14.5, fontWeight: 500, color: 'rgba(255,255,255,0.88)', textShadow: '0 1px 10px rgba(0,0,0,0.55)' }}>@{data.user.username} · NÜRO</p>
                <Link href="/dashboard/planes" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '7px 15px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.38)', background: 'rgba(8,22,36,0.42)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', color: '#fff', fontSize: 12.5, fontWeight: 700, letterSpacing: '0.02em', textDecoration: 'none', width: 'fit-content' }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: data.user.isActive ? '#16A34A' : '#9CA3AF', boxShadow: data.user.isActive ? '0 0 8px rgba(22,163,74,0.9)' : 'none', flexShrink: 0 }} />
                  {data.user.rank || 'Plan'} · {data.user.isActive ? 'Activo' : 'Inactivo'}
                </Link>
              </div>
            </div>
          </div>


          {/* ── CTA Plan (countdown o comprar) ── */}
          {data.user.rank && data.user.rank !== 'NONE' && data.user.planExpiresAt ? (
            <div className="dm-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20, padding: '22px 26px' }}>
              <div>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6B7280' }}>
                  <i className="fa-solid fa-clock" style={{ color: '#00E5D0' }} />&nbsp; Plan {data.user.rank} · Vence en
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
                  {[{ v: countdown?.d, l: 'Días' }, { v: countdown?.h, l: 'Horas' }, { v: countdown?.m, l: 'Min' }, { v: countdown?.s, l: 'Seg' }].map((u, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {i > 0 && <span style={{ fontSize: 20, fontWeight: 700, color: '#00E5D0', marginBottom: 16 }}>:</span>}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                        <span className="font-display" style={{ fontSize: 30, fontWeight: 600, color: '#111827', background: '#F0F3F7', border: '1px solid #E4E9F0', borderRadius: 12, padding: '6px 14px', minWidth: 58, textAlign: 'center', lineHeight: 1 }}>{u.v !== undefined ? String(u.v).padStart(2, '0') : '00'}</span>
                        <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9CA3AF' }}>{u.l}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <Link href="/dashboard/planes" className="dm-btn" style={{ textDecoration: 'none' }}><i className="fa-solid fa-rotate" /> Renovar Plan</Link>
            </div>
          ) : (
            <div style={{ position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20, padding: 26, borderRadius: 24, background: 'repeating-radial-gradient(circle at 62% 40%, transparent 0 21px, rgba(0,229,208,0.055) 21px 22px), linear-gradient(135deg, #273842 0%, #1d2a33 100%)', border: '1px solid rgba(0,181,192,0.22)', boxShadow: '0 18px 42px rgba(0,0,0,0.30)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 52, height: 52, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #1fb8bb, #147e95)', color: '#fff', boxShadow: '0 8px 20px rgba(0,181,192,0.40)', flexShrink: 0 }}><i className="fa-solid fa-crown" style={{ fontSize: 20 }} /></div>
                <div>
                  <p className="font-display" style={{ fontSize: 22, fontWeight: 600, color: '#fff', margin: 0 }}>Lleva tu cuenta al siguiente nivel</p>
                  <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.6)', margin: '4px 0 0' }}>Desbloquea acceso completo a todos los servicios NÜRO.</p>
                </div>
              </div>
              <Link href="/dashboard/planes" style={{ display: 'inline-flex', alignItems: 'center', gap: 9, padding: '13px 24px', borderRadius: 16, background: 'linear-gradient(180deg, rgba(255,255,255,0.42) 0%, rgba(255,255,255,0.06) 44%, rgba(255,255,255,0) 55%), linear-gradient(180deg, #3ddad2 0%, #17a0aa 58%, #0d7688 100%)', color: '#fff', fontWeight: 700, fontSize: 14.5, textDecoration: 'none', whiteSpace: 'nowrap', boxShadow: '0 10px 22px rgba(0,0,0,0.32), 0 2px 5px rgba(0,0,0,0.22), inset 0 1px 1px rgba(255,255,255,0.75), inset 0 -5px 10px rgba(0,0,0,0.26)' }}><i className="fa-solid fa-gem" /> Comprar Plan</Link>
            </div>
          )}

          {/* ── PANEL RESUMEN (estadísticas + progreso + plan + servicios) ── */}
          <section style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>

            {/* Estadísticas — datos reales */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 18 }}>
              {[
                { label: 'Ingresos', value: '$' + (data.business?.ingresos ?? 0).toLocaleString('es-BO'), icon: 'fa-coins',        href: '/dashboard/services/virtual-store', link: 'Ver ingresos' },
                { label: 'Leads',    value: (data.business?.leads ?? 0).toLocaleString('es-BO'),          icon: 'fa-user-group',    href: '/dashboard/crm',                    link: 'Ver leads' },
                { label: 'Ventas',   value: (data.business?.ventas ?? 0).toLocaleString('es-BO'),         icon: 'fa-cart-shopping', href: '/dashboard/services/virtual-store', link: 'Ver ventas' },
                { label: 'Tu Nivel', value: data.user.rank || 'FREE',                                     icon: 'fa-crown',         href: '/dashboard/planes',                 link: 'Ver beneficios' },
              ].map(s => (
                <div key={s.label} className="dm-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
                    <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg,#2a3b45,#1a2730)', color: '#35d0c8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}><i className={`fa-solid ${s.icon}`} /></div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 12.5, color: '#6B7280', fontWeight: 500 }}>{s.label}</p>
                      <p className="font-display" style={{ margin: '2px 0 0', fontSize: 23, fontWeight: 700, color: '#111827', lineHeight: 1.05 }}>{s.value}</p>
                    </div>
                  </div>
                  <Link href={s.href} style={{ fontSize: 12.5, fontWeight: 700, color: '#0a95a8', display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>{s.link} <i className="fa-solid fa-arrow-right" style={{ fontSize: 10 }} /></Link>
                </div>
              ))}
            </div>

            {/* Progreso + Plan — LADO A LADO */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 22, alignItems: 'stretch' }}>

              {(() => {
                const steps = [
                  { label: 'Perfil creado',  done: true },
                  { label: 'Plan activo',    done: !!(data.user.rank && data.user.rank !== 'NONE' && data.user.rank !== 'FREE') },
                  { label: 'Primer lead',    done: (data.business?.leads ?? 0) > 0 },
                  { label: 'Primera venta',  done: (data.business?.ventas ?? 0) > 0 },
                ]
                const pct = Math.round(steps.filter(s => s.done).length / steps.length * 100)
                return (
                  <div className="dm-card" style={{ padding: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <h3 className="font-display" style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#111827' }}>Tu progreso</h3>
                      <span style={{ fontSize: 14, fontWeight: 800, color: '#0a95a8' }}>{pct}%</span>
                    </div>
                    <div style={{ height: 8, borderRadius: 999, background: '#EAEEF3', margin: '14px 0 20px', overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', borderRadius: 999, background: 'linear-gradient(90deg,#1fb8bb,#147e95)' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
                      {steps.map(st => (
                        <div key={st.label} style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                          <span style={{ width: 22, height: 22, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: st.done ? 'linear-gradient(135deg,#1fb8bb,#147e95)' : '#E4E9F0', color: st.done ? '#fff' : '#9CA3AF', fontSize: 10 }}><i className={`fa-solid ${st.done ? 'fa-check' : 'fa-minus'}`} /></span>
                          <span style={{ fontSize: 14, color: st.done ? '#111827' : '#6B7280', fontWeight: st.done ? 600 : 500 }}>{st.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })()}

              {/* Tarjeta ELITE oscura con ondas finas (como la referencia) */}
              <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 24, padding: 26, display: 'flex', flexDirection: 'column', background: 'repeating-radial-gradient(circle at 90% 12%, transparent 0 17px, rgba(0,229,208,0.06) 17px 18px), linear-gradient(135deg,#273842 0%,#1a262f 100%)', border: '1px solid rgba(0,181,192,0.20)' }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#1fb8bb,#147e95)', color: '#fff', fontSize: 19, marginBottom: 16, boxShadow: '0 8px 20px rgba(0,181,192,0.35)' }}><i className="fa-solid fa-crown" /></div>
                <h3 className="font-display" style={{ margin: 0, fontSize: 21, fontWeight: 700, color: '#fff' }}>Aprovechá tu plan {data.user.rank || 'ELITE'}</h3>
                <p style={{ margin: '8px 0 0', fontSize: 13.5, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5, maxWidth: 340 }}>Accede a todas las herramientas, soporte y funciones avanzadas de NÜRO.</p>
                <Link href="/dashboard/planes" style={{ marginTop: 'auto', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '13px 20px', borderRadius: 14, background: 'linear-gradient(180deg, rgba(255,255,255,0.42) 0%, rgba(255,255,255,0.06) 44%, rgba(255,255,255,0) 55%), linear-gradient(180deg,#3ddad2 0%,#17a0aa 58%,#0d7688 100%)', color: '#fff', fontWeight: 700, fontSize: 14.5, textDecoration: 'none', boxShadow: '0 10px 22px rgba(0,0,0,0.32), inset 0 1px 1px rgba(255,255,255,0.75), inset 0 -5px 10px rgba(0,0,0,0.26)' }}>Ver beneficios <i className="fa-solid fa-arrow-right" style={{ fontSize: 11 }} /></Link>
              </div>
            </div>

          </section>

        </main>
      </div>

    </>
  )
}
