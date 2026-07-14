'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Lock, Zap, Sparkles, Crown, X, Layers, MessageCircle, Store, Megaphone, FileText, Users, Video, CheckCircle2, Clock, Timer, RefreshCw, Phone, BookOpen, Play, Share2, Send, GraduationCap } from 'lucide-react'

const PACKS = [
  {
    id: 'basic',
    name: 'Pack Básico',
    tagline: 'Tu primer agente de ventas en WhatsApp',
    pitch: 'Automatiza tus ventas con un agente AI personalizado con tu marca, tu tienda, landing y Meta Ads para captar clientes.',
    price: 49,
    planId: 'BASIC',
    icon: Zap,
    accent: {
      text: 'text-[#FF096C]',
      bg: 'bg-[#FF096C]/10',
      border: 'border-[#FF096C]/25',
      btn: 'bg-[#FF096C] hover:bg-[#FF096C] active:scale-[0.98] text-black font-black',
      glow: '',
      featured: false,
    },
    highlight: null,
    locked: false,
    sections: [
      {
        icon: MessageCircle,
        title: 'Agente AI de Ventas',
        features: [
          '{bots} agentes AI personalizados con tu marca',
          'Responde y vende por WhatsApp automáticamente',
          'Mensajes ilimitados con tus clientes',
          'IA con el tono y voz de tu negocio',
          'Catálogo con hasta 2 productos en total',
        ],
      },
      {
        icon: Store,
        title: 'Tienda Virtual',
        features: [
          '1 tienda virtual con tu branding',
          'Integración con tu número de WhatsApp',
          'QR de pago y catálogo online',
        ],
      },
      {
        icon: FileText,
        title: 'Landing Pages con IA',
        features: ['1 landing page generada con IA'],
      },
      {
        icon: Megaphone,
        title: 'Meta Ads con IA',
        features: ['Hasta 5 anuncios al mes en Meta'],
      },
      {
        icon: GraduationCap,
        title: 'Academy + Recursos',
        features: [
          'Acceso a cursos y capacitaciones',
          'Flyers editables, plantillas, libros y podcasts',
        ],
      },
    ],
    notIncluded: [
      'CRM Broadcast y Social',
      'Acceso a nuevos lanzamientos exclusivos',
    ],
  },
  {
    id: 'pro',
    name: 'Pack Pro',
    tagline: 'Vende, anuncia y escala sin límites',
    pitch: 'Todo lo del Básico más {bots} agentes AI, más tiendas y landings, CRM Broadcast, Social y capacitaciones.',
    price: 99,
    planId: 'PRO',
    icon: Sparkles,
    accent: {
      text: 'text-purple-400',
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/40',
      btn: 'bg-purple-600 hover:bg-purple-500 active:scale-[0.98] text-white font-black shadow-[0_0_20px_rgba(127,86,239,0.4)]',
      glow: 'shadow-[0_0_50px_rgba(127,86,239,0.18)]',
      featured: true,
    },
    highlight: '⭐ Más Popular',
    locked: false,
    sections: [
      {
        icon: MessageCircle,
        title: 'Agentes AI de Ventas',
        features: [
          '{bots} agentes AI personalizados con tu marca',
          'Responde y vende por WhatsApp automáticamente',
          'Mensajes ilimitados con tus clientes',
          'IA con el tono y voz de tu negocio',
          'Catálogo con hasta 20 productos en total',
        ],
      },
      {
        icon: Store,
        title: 'Tiendas Virtuales',
        features: [
          '2 tiendas virtuales con tu branding completo',
          'Integración con WhatsApp para cerrar ventas',
          'QR de pago y catálogo online',
        ],
      },
      {
        icon: Megaphone,
        title: 'Meta Ads con IA',
        features: [
          'Hasta 15 anuncios al mes en Meta',
          'Copies e imágenes generados por IA',
          'Estrategias Advantage+ y Smart Segmentation',
        ],
      },
      {
        icon: FileText,
        title: 'Landing Pages con IA',
        features: [
          '3 landing pages generadas con IA',
          'Páginas de alta conversión con formularios',
          'Slugs personalizados con tu URL',
        ],
      },
      {
        icon: Send,
        title: 'CRM Broadcast',
        features: [
          'Gestión de contactos y conversaciones',
          'Difusión masiva por WhatsApp',
        ],
      },
      {
        icon: Share2,
        title: 'Social',
        features: [
          'Gestión y publicación en tus redes sociales',
        ],
      },
      {
        icon: Video,
        title: 'Academy + Capacitaciones',
        features: [
          'Cursos, recursos y podcasts',
          'Asesoramiento personalizado de 30 minutos',
        ],
      },
    ],
    notIncluded: ['Acceso a nuevos lanzamientos exclusivos'],
  },
  {
    id: 'elite',
    name: 'Pack Elite',
    tagline: 'El máximo poder para líderes de red',
    pitch: 'La experiencia completa: {bots} agentes AI, 5 tiendas, 40 productos, 6 landings, CRM + Social y acceso total a lanzamientos exclusivos.',
    price: 199,
    planId: 'ELITE',
    icon: Crown,
    accent: {
      text: 'text-pink-400',
      bg: 'bg-pink-500/10',
      border: 'border-pink-500/30',
      btn: 'bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 active:scale-[0.98] text-white font-black shadow-[0_0_20px_rgba(236,72,153,0.3)]',
      glow: 'shadow-[0_0_40px_rgba(236,72,153,0.12)]',
      featured: false,
    },
    highlight: '👑 Máximo Poder',
    locked: false,
    sections: [
      {
        icon: MessageCircle,
        title: 'Agentes AI de Ventas',
        features: [
          '{bots} agentes AI personalizados con tu marca',
          'Responde y vende por WhatsApp automáticamente',
          'Mensajes ilimitados con tus clientes',
          'Catálogo con hasta 40 productos en total',
        ],
      },
      {
        icon: Store,
        title: 'Tiendas Virtuales',
        features: [
          '5 tiendas virtuales con tu branding completo',
          'Integración con WhatsApp para cerrar ventas',
          'QR de pago y catálogo online',
        ],
      },
      {
        icon: FileText,
        title: 'Landing Pages con IA',
        features: [
          '6 landing pages generadas con IA',
          'Páginas de alta conversión personalizadas',
        ],
      },
      {
        icon: Megaphone,
        title: 'Meta Ads con IA',
        features: [
          'Hasta 30 anuncios al mes en Meta',
          'Copies e imágenes generados por IA',
        ],
      },
      {
        icon: Send,
        title: 'CRM Broadcast + Social',
        features: [
          'CRM completo + difusión masiva por WhatsApp',
          'Gestión y publicación en tus redes sociales',
        ],
      },
      {
        icon: Users,
        title: 'Acceso Total',
        features: [
          'Acceso exclusivo a nuevos lanzamientos',
          'Asesoramiento personalizado de 1 hora',
          'Manager dedicado 1:1',
          'Onboarding personalizado con el equipo',
        ],
      },
    ],
    notIncluded: [],
  },
]

const PLAN_RANK: Record<string, number> = { NONE: 0, BASIC: 1, PRO: 2, ELITE: 3 }

// Créditos IA (USD) incluidos por plan. Default; el admin los edita en Settings
// (PLAN_BASIC_CREDITS, etc.) y la vista los lee de /api/settings.
const PLAN_CREDIT_DEFAULTS: Record<string, number> = { BASIC: 3, PRO: 8, ELITE: 20 }
// Bots/agentes por plan. Default; el admin los edita (PLAN_BASIC_BOTS, etc.).
const PLAN_BOTS_DEFAULTS: Record<string, number> = { BASIC: 2, PRO: 4, ELITE: 8 }

function useCountdown(expiresAt: string | null) {
  const [remaining, setRemaining] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null)
  useEffect(() => {
    if (!expiresAt) { setRemaining(null); return }
    const target = new Date(expiresAt).getTime()
    const update = () => {
      const diff = target - Date.now()
      if (diff <= 0) { setRemaining({ days: 0, hours: 0, minutes: 0, seconds: 0 }); return }
      setRemaining({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      })
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [expiresAt])
  return remaining
}

export default function PlanesPage() {
  const router = useRouter()
  const [currentPlan, setCurrentPlan] = useState<string>('NONE')
  const [planExpiresAt, setPlanExpiresAt] = useState<string | null>(null)
  const [pendingPlan, setPendingPlan] = useState<string | null>(null)
  const [isFaseGlobal, setIsFaseGlobal] = useState(false)
  const [enabledPlans, setEnabledPlans] = useState<Record<string, boolean> | null>(null)
  const [credits, setCredits] = useState<Record<string, number>>(PLAN_CREDIT_DEFAULTS)
  const [bots, setBots] = useState<Record<string, number>>(PLAN_BOTS_DEFAULTS)
  const [prices, setPrices] = useState<Record<string, number>>({})
  // Pack Empresarial: si el usuario es de una empresa, ve cómo pagarle a SU empresa.
  const [orgPay, setOrgPay] = useState<{ name: string; logoUrl: string | null; payUsdtWallet: string | null; payUsdtNetwork: string | null; payBankInfo: string | null; payQrUrl: string | null; payInstructions: string | null } | null>(null)
  const [proofUrl, setProofUrl] = useState('')
  const [upProof, setUpProof] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const countdown = useCountdown(planExpiresAt)

  useEffect(() => {
    fetch('/api/plan-status')
      .then(r => r.json())
      .then(d => {
        if (d.plan) setCurrentPlan(d.plan)
        if (d.planExpiresAt) setPlanExpiresAt(d.planExpiresAt)
        if (d.faseGlobal) setIsFaseGlobal(true)
      })
      .catch(() => {})
    fetch('/api/pack-requests')
      .then(r => r.json())
      .then(d => {
        const pending = (d.requests ?? []).find((r: { status: string; plan: string }) => r.status === 'PENDING')
        if (pending) setPendingPlan(pending.plan)
      })
      .catch(() => {})
    // Pack Empresarial: datos de cobro de la empresa del usuario (si pertenece a una).
    fetch('/api/empresa/pago')
      .then(r => r.json())
      .then(d => { if (d.payment) setOrgPay(d.payment) })
      .catch(() => {})
    // Cargar disponibilidad de planes
    fetch('/api/settings')
      .then(r => r.json())
      .then(d => {
        const s = d.settings ?? {}
        const map = {
          BASIC: s['PLAN_BASIC_ENABLED'] !== 'false',
          PRO:   s['PLAN_PRO_ENABLED']   !== 'false',
          ELITE: s['PLAN_ELITE_ENABLED'] !== 'false',
        }
        setCredits({
          BASIC: Number(s['PLAN_BASIC_CREDITS'] ?? PLAN_CREDIT_DEFAULTS.BASIC),
          PRO:   Number(s['PLAN_PRO_CREDITS']   ?? PLAN_CREDIT_DEFAULTS.PRO),
          ELITE: Number(s['PLAN_ELITE_CREDITS'] ?? PLAN_CREDIT_DEFAULTS.ELITE),
        })
        setBots({
          BASIC: Number(s['PLAN_BASIC_BOTS'] ?? PLAN_BOTS_DEFAULTS.BASIC),
          PRO:   Number(s['PLAN_PRO_BOTS']   ?? PLAN_BOTS_DEFAULTS.PRO),
          ELITE: Number(s['PLAN_ELITE_BOTS'] ?? PLAN_BOTS_DEFAULTS.ELITE),
        })
        const pr: Record<string, number> = {}
        if (s['PRICE_BASIC']) pr.BASIC = Number(s['PRICE_BASIC'])
        if (s['PRICE_PRO'])   pr.PRO   = Number(s['PRICE_PRO'])
        if (s['PRICE_ELITE']) pr.ELITE = Number(s['PRICE_ELITE'])
        setPrices(pr)
        // Si todos están desactivados → redirigir a checkout con Fase Global
        if (!map.BASIC && !map.PRO && !map.ELITE) {
          router.replace('/dashboard/store/checkout?plan=BASIC&faseGlobalOnly=true')
          return
        }
        setEnabledPlans(map)
      })
      .catch(() => setEnabledPlans({ BASIC: true, PRO: true, ELITE: true }))
  }, [router])

  // ── Usuario de empresa: ve cómo pagarle a SU empresa (no los packs de MY DIAMOND) ──
  if (orgPay) {
    const submitProof = async () => {
      if (!proofUrl) return
      setSubmitting(true)
      const r = await fetch('/api/empresa/pago/solicitar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ paymentProofUrl: proofUrl, paymentMethod: 'MANUAL' }) })
      setSubmitting(false)
      if (r.ok) { setSubmitted(true); setProofUrl('') }
    }
    const DG = 'linear-gradient(135deg,#FF2D95 0%,#B735B8 48%,#233B8F 100%)'
    const inpS: React.CSSProperties = { width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #D5DCE6', fontSize: 13, background: '#F7F9FC', color: '#233B8F', fontWeight: 600 }
    return (
      <div className="font-ui" style={{ background: 'linear-gradient(135deg,#EEF2F7,#F5F7FA)', minHeight: '100vh' }}>
        <div className="px-4 md:px-6 pt-8 max-w-2xl mx-auto pb-24 text-[#111827]">
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            {orgPay.logoUrl ? <img src={orgPay.logoUrl} alt={orgPay.name} style={{ height: 54, objectFit: 'contain', marginBottom: 10 }} /> : null}
            <h1 style={{ fontSize: 24, fontWeight: 900 }}>{currentPlan !== 'NONE' ? 'Tu plan está activo' : 'Activá tu cuenta'}</h1>
            <p style={{ fontSize: 14, color: '#5B6472', marginTop: 4 }}>Pagás directamente a <strong>{orgPay.name}</strong>.</p>
          </div>

          {currentPlan !== 'NONE' ? (
            <div style={{ background: 'rgba(22,163,74,0.08)', border: '1px solid rgba(22,163,74,0.25)', borderRadius: 14, padding: '16px 18px', color: '#15803d', fontWeight: 700, textAlign: 'center' }}>
              <Check size={18} style={{ display: 'inline', marginRight: 6 }} /> Ya tenés acceso activo. Para renovar, contactá a tu empresa.
            </div>
          ) : (
            <>
              {(orgPay.payUsdtWallet || orgPay.payUsdtNetwork) && (
                <div style={{ background: '#fff', border: '1px solid #E4E9F0', borderRadius: 14, padding: '16px 18px', marginBottom: 12 }}>
                  <h3 style={{ fontWeight: 800, fontSize: 14, marginBottom: 10 }}>💎 USDT / Cripto</h3>
                  {orgPay.payUsdtNetwork && <p style={{ fontSize: 13, color: '#5B6472', marginBottom: 6 }}>Red: <strong>{orgPay.payUsdtNetwork}</strong></p>}
                  {orgPay.payUsdtWallet && <input readOnly value={orgPay.payUsdtWallet} onFocus={e => e.currentTarget.select()} style={inpS} />}
                </div>
              )}
              {orgPay.payBankInfo && (
                <div style={{ background: '#fff', border: '1px solid #E4E9F0', borderRadius: 14, padding: '16px 18px', marginBottom: 12 }}>
                  <h3 style={{ fontWeight: 800, fontSize: 14, marginBottom: 10 }}>🏦 Transferencia</h3>
                  <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: 13, color: '#33405A', margin: 0 }}>{orgPay.payBankInfo}</pre>
                </div>
              )}
              {orgPay.payQrUrl && (
                <div style={{ background: '#fff', border: '1px solid #E4E9F0', borderRadius: 14, padding: '16px 18px', marginBottom: 12, textAlign: 'center' }}>
                  <h3 style={{ fontWeight: 800, fontSize: 14, marginBottom: 10 }}>📱 QR de pago</h3>
                  <img src={orgPay.payQrUrl} alt="QR" style={{ maxWidth: 220, margin: '0 auto', borderRadius: 10 }} />
                </div>
              )}
              {orgPay.payInstructions && (
                <div style={{ background: 'rgba(35,59,143,0.06)', border: '1px solid rgba(35,59,143,0.15)', borderRadius: 14, padding: '14px 16px', marginBottom: 12, fontSize: 13, color: '#33405A' }}>
                  <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: 0 }}>{orgPay.payInstructions}</pre>
                </div>
              )}

              {/* Subir comprobante */}
              <div style={{ background: '#fff', border: '1px solid #E4E9F0', borderRadius: 14, padding: '16px 18px', marginTop: 16 }}>
                <h3 style={{ fontWeight: 800, fontSize: 14, marginBottom: 8 }}>✅ Ya pagué — enviar comprobante</h3>
                {submitted ? (
                  <p style={{ color: '#15803d', fontWeight: 700, fontSize: 14 }}><Check size={16} style={{ display: 'inline', marginRight: 6 }} /> ¡Comprobante enviado! Esperá que tu empresa active tu cuenta.</p>
                ) : (
                  <>
                    <p style={{ fontSize: 13, color: '#5B6472', marginBottom: 10 }}>Subí la captura/foto de tu pago y tu empresa te activará.</p>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 14px', borderRadius: 10, border: '1px solid #E4E9F0', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#B735B8' }}>
                        {upProof ? '⏳ Subiendo…' : (proofUrl ? '✓ Comprobante listo' : '📎 Elegir comprobante')}
                        <input type="file" accept="image/*" style={{ display: 'none' }} onChange={async e => { const f = e.target.files?.[0]; if (!f) return; setUpProof(true); const fd = new FormData(); fd.append('file', f); const rr = await fetch('/api/upload', { method: 'POST', body: fd }); const dd = await rr.json().catch(() => ({})); setUpProof(false); if (dd.url) setProofUrl(dd.url) }} />
                      </label>
                      <button onClick={submitProof} disabled={!proofUrl || submitting} style={{ background: (!proofUrl || submitting) ? '#C4CCD8' : DG, color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', fontWeight: 800, fontSize: 13, cursor: (!proofUrl || submitting) ? 'not-allowed' : 'pointer' }}>{submitting ? 'Enviando…' : 'Enviar comprobante'}</button>
                    </div>
                    {proofUrl && <img src={proofUrl} alt="comprobante" style={{ marginTop: 10, maxHeight: 120, borderRadius: 8 }} />}
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="font-ui" style={{ background: 'radial-gradient(circle at top right, rgba(255,9,108,0.08), transparent 28%), radial-gradient(circle at bottom left, rgba(35,59,143,0.08), transparent 30%), linear-gradient(135deg, #EEF2F7 0%, #F5F7FA 45%, #E9EEF5 100%)', minHeight: '100vh' }}>
    <div className="px-4 md:px-6 lg:px-8 pt-8 max-w-screen-xl mx-auto pb-24 text-[#111827]">

      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#F4F6FA] border border-purple-500/25 text-[10px] font-bold text-[#6B7280] uppercase tracking-widest mb-4">
          <Layers size={10} />
          MY DIAMOND · Planes oficiales
        </div>
        <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tighter mb-2">
          Elige tu Plan
        </h1>
        <p className="text-sm text-[#6B7280] max-w-sm mx-auto leading-relaxed">
          Bots de WhatsApp, tiendas y anuncios con IA — todo personalizado con tu marca.
        </p>
        {currentPlan !== 'NONE' && (
          <div className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-full bg-[#B735B8]/10 border border-[#B735B8]/30 text-[#B735B8] text-xs font-bold">
            <CheckCircle2 size={12} />
            Plan activo: {currentPlan === 'BASIC' ? 'Pack Básico' : currentPlan === 'PRO' ? 'Pack Pro' : currentPlan === 'ELITE' ? 'Pack Elite' : currentPlan}
          </div>
        )}
      </div>

      {/* Countdown if plan active */}
      {currentPlan !== 'NONE' && countdown && (
        <div className="mb-8 p-4 rounded-2xl border flex items-center gap-4"
          style={{
            background: isFaseGlobal
              ? 'linear-gradient(135deg, rgba(183,53,184,0.06), rgba(159,46,160,0.03))'
              : '#FFFFFF',
            borderColor: isFaseGlobal ? 'rgba(183,53,184,0.2)' : '#E4E9F0',
          }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: isFaseGlobal ? 'rgba(183,53,184,0.08)' : 'rgba(183,53,184,0.08)',
              border: isFaseGlobal ? '1px solid rgba(183,53,184,0.2)' : '1px solid #E4E9F0',
            }}>
            {isFaseGlobal ? <span className="text-lg">🌐</span> : <Timer size={18} style={{ color: '#B735B8' }} />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: isFaseGlobal ? 'rgba(183,53,184,0.5)' : '#6B7280' }}>
              {isFaseGlobal ? 'Pack Básico · Fase Global · Vence en' : 'Tu plan vence en'}
            </p>
            <div className="flex items-center gap-3">
              {[
                { v: countdown.days, l: 'días' },
                { v: countdown.hours, l: 'horas' },
                { v: countdown.minutes, l: 'min' },
                { v: countdown.seconds, l: 'seg' },
              ].map(({ v, l }) => (
                <div key={l} className="text-center">
                  <span className="text-xl font-black tabular-nums" style={{ color: isFaseGlobal ? '#FF096C' : '#B735B8' }}>{String(v).padStart(2, '0')}</span>
                  <p className="text-[9px] text-[#6B7280] uppercase tracking-widest">{l}</p>
                </div>
              ))}
            </div>
            {isFaseGlobal && (
              <p className="text-[10px] text-[#B735B8]/50 mt-1">Al vencer, solicita de nuevo con tu próxima recompra de Fase Global.</p>
            )}
          </div>
        </div>
      )}

      {/* Cards */}
      {enabledPlans === null ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#B735B8', borderTopColor: 'transparent' }} />
        </div>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
        {PACKS.filter(pack => enabledPlans[pack.planId]).map((pack) => {
          const Icon = pack.icon
          return (
            <div
              key={pack.id}
              className={`relative rounded-3xl border flex flex-col transition-all duration-300 ${pack.accent.border} ${pack.accent.glow} ${pack.accent.featured ? 'md:-mt-4' : ''} ${pack.locked ? 'opacity-60' : ''}`}
              style={{
                background: pack.locked
                  ? '#F8FAFC'
                  : '#FFFFFF',
                backdropFilter: 'blur(16px)',
              }}
            >
              {pack.locked && (
                <div className="absolute inset-0 rounded-3xl z-10 flex flex-col items-center justify-center gap-2 backdrop-blur-[1px]">
                  <div className="w-12 h-12 rounded-2xl bg-[#F4F6FA] border border-purple-500/25 flex items-center justify-center">
                    <Lock size={20} className="text-[#9CA3AF]" />
                  </div>
                  <p className="text-[10px] font-black text-[#9CA3AF] uppercase tracking-widest">Próximamente</p>
                </div>
              )}

              {pack.highlight && (
                <div className="absolute -top-3.5 inset-x-0 flex justify-center">
                  <span className="px-4 py-1 rounded-full bg-purple-600 text-white text-[10px] font-black uppercase tracking-widest">
                    {pack.highlight}
                  </span>
                </div>
              )}

              <div className={`p-5 md:p-6 flex flex-col flex-1 ${pack.accent.featured ? 'pt-8' : ''}`}>
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${pack.accent.bg} border ${pack.accent.border}`}>
                    <Icon size={18} className={pack.accent.text} />
                  </div>
                  <div>
                    <p className={`text-[11px] font-black uppercase tracking-widest ${pack.accent.text}`}>{pack.name}</p>
                    <p className="text-[10px] text-[#6B7280] leading-snug">{pack.tagline}</p>
                  </div>
                </div>

                <p className="text-[11px] text-[#6B7280] leading-relaxed mb-4">{pack.pitch.replace('{bots}', String(bots[pack.planId] ?? ''))}</p>

                <div className="mb-5">
                  <div className="flex items-end gap-1">
                    <span className="text-[40px] font-black leading-none">${prices[pack.planId] ?? pack.price}</span>
                    <span className="text-sm text-[#6B7280] mb-1">USD</span>
                  </div>
                  <p className="text-[10px] text-[#9CA3AF] mt-0.5">30 días de acceso · renovable</p>
                  {!pack.locked && (credits[pack.planId] ?? 0) > 0 && (
                    <div className="inline-flex items-center gap-1.5 mt-2.5 px-2.5 py-1 rounded-full" style={{ background: 'rgba(183,53,184,0.10)', border: '1px solid rgba(183,53,184,0.25)' }}>
                      <Sparkles size={11} className="text-[#B735B8]" />
                      <span className="text-[10px] font-black text-[#B735B8]">+ ${credits[pack.planId]} en créditos IA incluidos</span>
                    </div>
                  )}
                </div>

                <div className={`h-px mb-5 ${pack.accent.featured ? 'bg-purple-500/20' : 'bg-[#F4F6FA]'}`} />

                <div className="flex-1 space-y-4 mb-6">
                  {pack.sections.map((section, si) => {
                    const SIcon = section.icon
                    return (
                      <div key={si}>
                        <div className="flex items-center gap-1.5 mb-2">
                          <SIcon size={11} className={pack.locked ? 'text-[#9CA3AF]' : pack.accent.text} />
                          <p className={`text-[10px] font-black uppercase tracking-widest ${pack.locked ? 'text-[#9CA3AF]' : pack.accent.text}`}>
                            {section.title}
                          </p>
                        </div>
                        <ul className="space-y-1.5">
                          {section.features.map((feat, fi) => (
                            <li key={fi} className="flex items-start gap-2">
                              <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${pack.locked ? 'bg-[#F4F6FA]' : pack.accent.bg}`}>
                                <Check size={8} className={pack.locked ? 'text-[#9CA3AF]' : pack.accent.text} />
                              </div>
                              <span className={`text-[11px] leading-snug ${pack.locked ? 'text-[#9CA3AF]' : 'text-[#374151]'}`}>{feat.replace('{bots}', String(bots[pack.planId] ?? ''))}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )
                  })}

                  {pack.notIncluded.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 mb-2">
                        <X size={11} className="text-[#9CA3AF]" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-[#9CA3AF]">No incluido</p>
                      </div>
                      <ul className="space-y-1.5">
                        {pack.notIncluded.map((feat, fi) => (
                          <li key={fi} className="flex items-start gap-2">
                            <div className="w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 mt-0.5 bg-[#F4F6FA]">
                              <X size={7} className="text-[#9CA3AF]" />
                            </div>
                            <span className="text-[11px] leading-snug text-[#9CA3AF] line-through">{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* CTA */}
                {(() => {
                  if (pack.locked) {
                    return (
                      <button disabled className={`w-full py-3 rounded-2xl text-sm ${pack.accent.btn}`}>
                        Próximamente
                      </button>
                    )
                  }
                  const isActive = currentPlan === pack.planId
                  const isLower = PLAN_RANK[currentPlan] > PLAN_RANK[pack.planId]
                  const isPending = pendingPlan === pack.planId

                  if (isActive) {
                    // Plan activado vía Fase Global → no se puede renovar, solo re-solicitar cuando expire
                    if (isFaseGlobal) {
                      return (
                        <div className="w-full py-3 rounded-2xl text-sm font-black bg-[#B735B8]/10 border border-[#B735B8]/30 text-[#B735B8] flex flex-col items-center justify-center gap-1">
                          <span className="flex items-center gap-1.5">🌐 Activo · Fase Global</span>
                          <span className="text-[10px] font-normal text-[#B735B8]/60">Al vencer podrás re-solicitar con tu recompra</span>
                        </div>
                      )
                    }
                    return (
                      <button
                        onClick={() => router.push(`/dashboard/store/checkout?plan=${pack.planId}&renewal=true`)}
                        disabled={!!pendingPlan}
                        className="w-full py-3 rounded-2xl text-sm font-black bg-[#B735B8]/10 border border-[#B735B8]/30 text-[#B735B8] hover:bg-[#B735B8]/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <RefreshCw size={14} /> Renovar plan
                      </button>
                    )
                  }
                  if (isLower) {
                    return (
                      <button disabled className="w-full py-3 rounded-2xl text-sm font-black bg-[#F4F6FA] text-[#9CA3AF] border border-purple-500/20">
                        Plan inferior
                      </button>
                    )
                  }
                  if (isPending) {
                    return (
                      <button disabled className="w-full py-3 rounded-2xl text-sm font-black bg-orange-500/15 border border-orange-500/30 text-orange-400 flex items-center justify-center gap-2">
                        <Clock size={14} /> Solicitud pendiente
                      </button>
                    )
                  }
                  return (
                    <button
                      onClick={() => router.push(`/dashboard/store/checkout?plan=${pack.planId}`)}
                      disabled={!!pendingPlan}
                      className={`w-full py-3 rounded-2xl text-sm transition-all ${pack.accent.btn} flex items-center justify-center gap-2`}
                    >
                      {currentPlan !== 'NONE' ? 'Renovar / Actualizar' : `Adquirir ${pack.name}`}
                    </button>
                  )
                })()}
              </div>
            </div>
          )
        })}
      </div>
      )}

      {/* Empresarial card */}
      <div className="mt-6 relative rounded-3xl border border-[#B735B8]/20 overflow-hidden"
        style={{ background: 'linear-gradient(135deg, rgba(183,53,184,0.06), rgba(183,53,184,0.02))' }}>
        <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(183,53,184,0.5), transparent)' }} />
        <div className="p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center gap-6">
          <div className="flex items-center gap-4 flex-1">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 bg-[#B735B8]/10 border border-[#B735B8]/25">
              <Users size={22} className="text-[#B735B8]" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm font-black uppercase tracking-widest text-[#B735B8]">Pack Empresarial</p>
                <span className="px-2 py-0.5 rounded-full bg-[#B735B8]/10 border border-[#B735B8]/20 text-[9px] font-black text-[#B735B8] uppercase tracking-widest">A medida</span>
              </div>
              <p className="text-xs text-[#6B7280] leading-relaxed max-w-lg">
                Solución personalizada para empresas y líderes de alto rendimiento. Agentes AI ilimitados, tiendas, landings y soporte dedicado adaptados a tu volumen de negocio. Contáctanos para armar tu plan.
              </p>
            </div>
          </div>
          <a
            href="https://wa.me/59167534487"
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-sm transition-all bg-[#B735B8] hover:bg-[#B735B8] active:scale-[0.98] text-black"
          >
            <Phone size={15} />
            Contactar por WhatsApp
          </a>
        </div>
      </div>

      {/* Bottom note */}
      <div className="mt-6 p-4 bg-white border border-[#E4E9F0] rounded-2xl flex flex-col sm:flex-row items-center gap-3 text-center sm:text-left" style={{ boxShadow: '0 4px 14px rgba(15,23,42,0.04)' }}>
        <div className="w-8 h-8 rounded-xl bg-[#F4F6FA] border border-purple-500/20 flex items-center justify-center shrink-0">
          <Layers size={14} className="text-[#6B7280]" />
        </div>
        <div>
          <p className="text-xs font-bold text-[#6B7280]">Proceso manual · 30 días de acceso</p>
          <p className="text-[11px] text-[#9CA3AF]">Envía tu solicitud. Nuestro equipo la aprobará y activará tu plan en menos de 24h.</p>
        </div>
      </div>
    </div>
    </div>
  )
}
