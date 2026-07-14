'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Cpu,
  Key,
  CheckCircle,
  XCircle,
  Trash2,
  Loader2,
  ShieldCheck,
  Eye,
  EyeOff,
  ToggleLeft,
  ToggleRight,
  Info,
  Plus,
  Upload,
  Clock,
  Wallet,
  X,
  Receipt,
  ArrowDownLeft,
  ArrowUpRight,
  ExternalLink,
  Settings,
  ChevronRight,
} from 'lucide-react'
import { PaymentGateway } from '@/components/PaymentGateway'

interface UsageEntry {
  id: string
  model: string
  reason: string
  costUsd: number
  createdAt: string
}

interface PurchaseEntry {
  id: string
  amountUsd: number
  paymentMethod: string
  paymentProofUrl: string | null
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  notes: string | null
  createdAt: string
  reviewedAt: string | null
}

interface CreditsData {
  aiCredits: number
  aiBalanceUsd: number
  preferOwnKey: boolean
  followupsEnabled: boolean
  adminHasKey: boolean
  ownKey: {
    model: string
    isValid: boolean
    validatedAt: string | null
    apiKeyMasked: string
  } | null
  recentUsage: UsageEntry[]
}

const QUICK_AMOUNTS = [5, 10, 15, 20, 30, 50]

export default function CreditsPage() {
  const [data, setData] = useState<CreditsData | null>(null)
  const [loading, setLoading] = useState(true)

  // API key form
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [model, setModel] = useState('gpt-4o')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [togglingPref, setTogglingPref] = useState(false)
  const [togglingFollowups, setTogglingFollowups] = useState(false)

  // Compra de créditos
  const [purchases, setPurchases] = useState<PurchaseEntry[]>([])
  const [showBuyModal, setShowBuyModal] = useState(false)
  const [buyAmount, setBuyAmount] = useState<string>('10')
  const [buyMethod, setBuyMethod] = useState<'MANUAL' | 'CRYPTO'>('CRYPTO')
  const [buyProofUrl, setBuyProofUrl] = useState('')
  const [buyNotes, setBuyNotes] = useState('')
  const [uploadingProof, setUploadingProof] = useState(false)
  const [submittingPurchase, setSubmittingPurchase] = useState(false)
  const [buyMsg, setBuyMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [paymentQrUrl, setPaymentQrUrl] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    // Cada fetch/parse aislado: si una request rompe (rate-limit, 500 con body
    // vacío, network blip), las demás siguen poblando sus respectivos states.
    // ANTES un fallo en /api/credits arrastraba al QR a quedar "no configurado".
    const [credRes, purRes, settingsRes] = await Promise.allSettled([
      fetch('/api/credits'),
      fetch('/api/credits/purchase'),
      fetch('/api/settings'),
    ])

    if (credRes.status === 'fulfilled' && credRes.value.ok) {
      try { setData(await credRes.value.json()) } catch { /* keep prev */ }
    }
    if (purRes.status === 'fulfilled' && purRes.value.ok) {
      try {
        const p = await purRes.value.json()
        setPurchases(p.purchases ?? [])
      } catch { /* keep prev */ }
    }
    if (settingsRes.status === 'fulfilled' && settingsRes.value.ok) {
      try {
        const s = await settingsRes.value.json()
        setPaymentQrUrl(s.settings?.PAYMENT_QR_URL || null)
      } catch { /* keep prev */ }
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function uploadProofFile(file: File) {
    setUploadingProof(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const j = await res.json()
      if (!res.ok || !j.url) {
        setBuyMsg({ type: 'err', text: j.error ?? 'Error al subir comprobante' })
        return
      }
      setBuyProofUrl(j.url)
      setBuyMsg(null)
    } catch (e: any) {
      setBuyMsg({ type: 'err', text: e?.message ?? 'Error al subir' })
    } finally {
      setUploadingProof(false)
    }
  }

  /**
   * Submit del flujo MANUAL únicamente. Para CRYPTO, el componente <PaymentGateway>
   * maneja la transacción y llama directamente al endpoint a través de onSubmitPayment.
   */
  async function submitPurchase() {
    const amountUsd = parseFloat(buyAmount)
    if (!Number.isFinite(amountUsd) || amountUsd < 1) {
      setBuyMsg({ type: 'err', text: 'Monto inválido. Mínimo $1 USD.' })
      return
    }
    if (!buyProofUrl) {
      setBuyMsg({ type: 'err', text: 'Subí el comprobante de la transferencia.' })
      return
    }
    setSubmittingPurchase(true)
    try {
      const res = await fetch('/api/credits/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountUsd,
          paymentMethod: 'MANUAL',
          paymentProofUrl: buyProofUrl,
          notes: buyNotes.trim() || null,
        }),
      })
      const j = await res.json()
      if (!res.ok) {
        setBuyMsg({ type: 'err', text: j.error ?? 'Error al enviar solicitud' })
        return
      }
      setBuyMsg({ type: 'ok', text: '¡Solicitud enviada! El admin la revisará pronto.' })
      setBuyProofUrl('')
      setBuyNotes('')
      setBuyAmount('10')
      await load()
      setTimeout(() => { setShowBuyModal(false); setBuyMsg(null) }, 2000)
    } catch (e: any) {
      setBuyMsg({ type: 'err', text: e?.message ?? 'Error de conexión' })
    } finally {
      setSubmittingPurchase(false)
    }
  }

  async function saveKey() {
    if (!apiKeyInput.trim()) return
    setMsg(null)
    setSaving(true)
    const res = await fetch('/api/credits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: apiKeyInput.trim(), model }),
    })
    const d = await res.json()
    setSaving(false)
    if (res.ok) {
      setMsg({ type: 'ok', text: d.isValid ? '¡API Key guardada y validada correctamente!' : 'Key guardada pero no pudo validarse. Verifica que sea correcta.' })
      setApiKeyInput('')
      load()
    } else {
      setMsg({ type: 'err', text: d.error ?? 'Error al guardar' })
    }
  }

  async function deleteKey() {
    if (!confirm('¿Eliminar tu API Key?')) return
    setDeleting(true)
    await fetch('/api/credits', { method: 'DELETE' })
    setDeleting(false)
    load()
  }

  async function togglePreference() {
    if (!data) return
    setTogglingPref(true)
    await fetch('/api/credits', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preferOwnKey: !data.preferOwnKey }),
    })
    setTogglingPref(false)
    load()
  }

  async function toggleFollowups() {
    if (!data) return
    setTogglingFollowups(true)
    await fetch('/api/credits', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ followupsEnabled: !data.followupsEnabled }),
    })
    setTogglingFollowups(false)
    load()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-10 h-10 border-2 rounded-full animate-spin"
          style={{ borderColor: '#E4E9F0', borderTopColor: '#a78bfa' }} />
      </div>
    )
  }

  const canUseAdminKey = data?.adminHasKey
  const hasOwnKey = !!data?.ownKey
  const usingOwn = !!data?.preferOwnKey && hasOwnKey
  const usingAdmin = !usingOwn && !!canUseAdminKey

  return (
    <div className="dm-page font-ui">
    <div className="px-4 sm:px-6 lg:px-8 pt-8 max-w-2xl mx-auto pb-24 space-y-6">

      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, rgba(154,203,255,0.15), rgba(162,102,255,0.15))', border: '1px solid rgba(255,255,255,0.1)' }}>
          <Cpu className="w-5 h-5 text-violet-400" />
        </div>
        <div>
          <h1 className="text-xl font-medium text-[#111827] tracking-widest uppercase">Créditos AI</h1>
          <p className="text-xs font-light tracking-widest mt-0.5" style={{ color: '#6B7280' }}>
            Gestiona tu acceso a los servicios de inteligencia artificial
          </p>
        </div>
      </div>

      {/* Decorative line */}
      <div className="h-px w-full" style={{ background: 'linear-gradient(90deg, rgba(162,102,255,0.4), rgba(154,203,255,0.2), transparent)' }} />

      {/* Credits Balance Card — USD */}
      <div className="relative rounded-2xl p-6 overflow-hidden"
        style={{
          background: '#081624',
          border: '1px solid rgba(255,255,255,0.1)',
          backdropFilter: 'blur(16px)',
        }}>
        <div className="absolute top-0 left-0 right-0 h-px"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(162,102,255,0.5), transparent)' }} />
        <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-15"
          style={{ background: 'radial-gradient(circle, #a78bfa, transparent)' }} />

        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <Wallet className="w-4 h-4 text-violet-400" />
            <span className="text-xs font-black uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.55)' }}>
              Saldo de IA
            </span>
          </div>
          <button
            onClick={() => { setShowBuyModal(true); setBuyMsg(null) }}
            className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl transition-all active:scale-[0.97]"
            style={{
              background: 'linear-gradient(135deg, rgba(162,102,255,0.30), rgba(154,203,255,0.30))',
              border: '1px solid rgba(162,102,255,0.45)',
              color: '#fff',
              boxShadow: '0 6px 18px -10px rgba(162,102,255,0.55), inset 0 1px 0 rgba(255,255,255,0.10)',
            }}>
            <Plus className="w-3.5 h-3.5" /> Comprar saldo
          </button>
        </div>

        <div className="flex items-end gap-3 mb-4">
          <span className="text-5xl font-black text-white tabular-nums">${(data?.aiBalanceUsd ?? 0).toFixed(2)}</span>
          <span className="text-sm font-light mb-2" style={{ color: 'rgba(255,255,255,0.55)' }}>USD disponibles</span>
        </div>

        <p className="text-xs font-light" style={{ color: 'rgba(255,255,255,0.55)' }}>
          Tu saldo se descuenta automáticamente con cada uso de IA que pase por la key del administrador. Si usás tu propia API Key, no se descuenta nada.
        </p>
      </div>

      {/* Mis solicitudes de compra */}
      {purchases.length > 0 && (
        <div className="relative rounded-2xl p-5 overflow-hidden space-y-3"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid #EEF2F7',
            backdropFilter: 'blur(16px)',
          }}>
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-violet-400" />
            <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.55)' }}>
              Mis solicitudes
            </p>
          </div>
          <div className="space-y-2">
            {purchases.slice(0, 5).map(p => {
              const statusStyle =
                p.status === 'APPROVED' ? { color: '#34d399', bg: 'rgba(52,211,153,0.08)', border: 'rgba(52,211,153,0.22)', label: 'Aprobada' } :
                p.status === 'REJECTED' ? { color: '#f87171', bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.22)', label: 'Rechazada' } :
                                          { color: '#fbbf24', bg: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.22)', label: 'Pendiente' }
              return (
                <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid #EEF2F7' }}>
                  <ArrowDownLeft className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white">+${Number(p.amountUsd).toFixed(2)} USD</p>
                    <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.55)' }}>
                      {new Date(p.createdAt).toLocaleDateString()} · {p.paymentMethod === 'MANUAL' ? 'Transferencia' : p.paymentMethod}
                    </p>
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full shrink-0"
                    style={{ background: statusStyle.bg, border: `1px solid ${statusStyle.border}`, color: statusStyle.color }}>
                    {statusStyle.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Historial de uso reciente */}
      {data?.recentUsage && data.recentUsage.length > 0 && (
        <div className="relative rounded-2xl p-5 overflow-hidden space-y-3"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid #EEF2F7',
            backdropFilter: 'blur(16px)',
          }}>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-sky-400" />
            <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.55)' }}>
              Movimientos recientes
            </p>
          </div>
          <div className="space-y-1.5">
            {data.recentUsage.slice(0, 10).map(u => {
              const isRecharge = u.costUsd < 0   // negativo = recarga (entrada)
              return (
                <div key={u.id} className="flex items-center gap-3 px-3 py-2 rounded-lg"
                  style={{ background: 'rgba(255,255,255,0.05)' }}>
                  {isRecharge
                    ? <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    : <ArrowUpRight className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold truncate" style={{ color: 'rgba(8,22,36,0.96)' }}>
                      {isRecharge ? 'Recarga aprobada' : u.reason}
                    </p>
                    <p className="text-[10px] truncate" style={{ color: 'rgba(255,255,255,0.30)' }}>
                      {u.model} · {new Date(u.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold tabular-nums shrink-0"
                    style={{ color: isRecharge ? '#34d399' : '#f87171' }}>
                    {isRecharge ? '+' : '−'}${Math.abs(u.costUsd).toFixed(4)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Configuración de IA — vive en Configuración para no duplicar */}
      <Link href="/dashboard/settings"
        className="relative rounded-2xl p-5 overflow-hidden flex items-center justify-between gap-4 transition-all group"
        style={{ background: "#FFFFFF", border: "1px solid #E4E9F0", textDecoration: "none" }}>
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "rgba(210,3,221,0.12)", border: "1px solid rgba(210,3,221,0.3)" }}>
            <Settings className="w-5 h-5" style={{ color: "#D203DD" }} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-white">Configuración de IA</p>
            <p className="text-[11px] font-light" style={{ color: "#6B7280" }}>
              Elegí cómo pagás la IA (saldo o tu propia API Key), tu modelo y los seguimientos — en Configuración.
            </p>
          </div>
        </div>
        <span className="flex items-center gap-1 text-xs font-bold shrink-0 transition-all group-hover:translate-x-0.5" style={{ color: "#E879F9" }}>
          Configurar <ChevronRight className="w-4 h-4" />
        </span>
      </Link>

      {/* ── MODAL: COMPRAR SALDO ───────────────────────────────────── */}
      {showBuyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto custom-scrollbar rounded-3xl p-5 sm:p-6 space-y-5 relative"
            style={{
              background: 'linear-gradient(180deg, rgba(20,24,48,0.96) 0%, rgba(14,16,34,0.96) 100%)',
              border: '1px solid #9CA3AF',
              boxShadow: '0 30px 60px -22px rgba(0,0,0,0.82), 0 0 36px -8px rgba(162,102,255,0.30)',
            }}>
            {/* Header modal */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(162,102,255,0.18)', border: '1px solid rgba(162,102,255,0.35)', boxShadow: '0 0 14px -4px rgba(162,102,255,0.55)' }}>
                  <Wallet className="w-5 h-5 text-violet-300" />
                </div>
                <div>
                  <h2 className="text-base font-black text-white leading-tight">Comprar saldo de IA</h2>
                  <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.55)' }}>
                    {buyMethod === 'CRYPTO' ? 'USDT-BEP20 · auto-verificado on-chain' : 'Transferencia + comprobante'}
                  </p>
                </div>
              </div>
              <button onClick={() => setShowBuyModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/5 transition-colors">
                <X className="w-4 h-4 text-white/55" />
              </button>
            </div>

            {/* Quick amounts + custom input */}
            <div className="space-y-2.5">
              <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.55)' }}>
                Monto a cargar (USD)
              </label>
              <div className="grid grid-cols-3 gap-2">
                {QUICK_AMOUNTS.map(a => (
                  <button key={a} onClick={() => setBuyAmount(String(a))}
                    className="py-2.5 rounded-xl text-sm font-bold transition-all active:scale-[0.97]"
                    style={{
                      background: buyAmount === String(a)
                        ? 'linear-gradient(135deg, rgba(162,102,255,0.30), rgba(154,203,255,0.20))'
                        : '#F0F3F7',
                      border: `1px solid ${buyAmount === String(a) ? 'rgba(162,102,255,0.55)' : 'rgba(255,255,255,0.10)'}`,
                      color: buyAmount === String(a) ? '#fff' : 'rgba(255,255,255,0.65)',
                    }}>
                    ${a}
                  </button>
                ))}
              </div>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold" style={{ color: 'rgba(255,255,255,0.55)' }}>$</span>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  step="0.01"
                  value={buyAmount}
                  onChange={e => setBuyAmount(e.target.value)}
                  className="w-full pl-8 pr-3 py-3 rounded-xl text-sm font-bold text-white outline-none tabular-nums"
                  placeholder="Otro monto"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid #9CA3AF' }}
                  onFocus={e => (e.currentTarget.style.borderColor = 'rgba(162,102,255,0.50)')}
                  onBlur={e => (e.currentTarget.style.borderColor = '#9CA3AF')}
                />
              </div>
              <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.30)' }}>
                Mínimo $1 · Máximo $1000 USD por solicitud.
              </p>
            </div>

            {/* Tabs método de pago */}
            <div className="flex items-center gap-1 p-1 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid #EEF2F7' }}>
              <button
                onClick={() => { setBuyMethod('CRYPTO'); setBuyMsg(null) }}
                className="flex-1 py-2.5 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5"
                style={{
                  background: buyMethod === 'CRYPTO'
                    ? 'linear-gradient(135deg, rgba(251,191,36,0.18), rgba(251,146,60,0.12))'
                    : 'transparent',
                  color: buyMethod === 'CRYPTO' ? '#fbbf24' : '#6B7280',
                  border: buyMethod === 'CRYPTO' ? '1px solid rgba(251,191,36,0.35)' : '1px solid transparent',
                }}>
                ₮ Pagar con USDT
              </button>
              <button
                onClick={() => { setBuyMethod('MANUAL'); setBuyMsg(null) }}
                className="flex-1 py-2.5 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5"
                style={{
                  background: buyMethod === 'MANUAL'
                    ? 'rgba(255,255,255,0.10)'
                    : 'transparent',
                  color: buyMethod === 'MANUAL' ? '#fff' : '#6B7280',
                  border: buyMethod === 'MANUAL' ? '1px solid rgba(255,255,255,0.20)' : '1px solid transparent',
                }}>
                🏦 Transferencia
              </button>
            </div>

            {/* Aviso tipo de cambio — sólo si es MANUAL */}
            {buyMethod === 'MANUAL' && paymentQrUrl && (
              <div className="flex items-start gap-3 p-3.5 rounded-xl"
                style={{ background: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.22)' }}>
                <span className="text-base shrink-0" aria-hidden>⚠️</span>
                <div>
                  <p className="text-[11px] font-black" style={{ color: '#fbbf24', letterSpacing: '0.02em' }}>
                    Tipo de cambio: Dólar paralelo Binance
                  </p>
                  <p className="text-[10.5px] mt-1 leading-relaxed" style={{ color: 'rgba(251,191,36,0.72)' }}>
                    Si pagás por transferencia bancaria o QR local, el monto en bolivianos se calcula según el <strong>dólar paralelo publicado en Binance P2P</strong> al momento del pago. Te recomendamos pagar con <strong>USDT</strong> para evitar diferencias de cambio.
                  </p>
                </div>
              </div>
            )}

            {/* ═══ FLUJO USDT (CRYPTO) ═══ Componente compartido con checkout de planes */}
            {buyMethod === 'CRYPTO' && parseFloat(buyAmount || '0') >= 1 && (
              <div className="rounded-xl p-3"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid #EEF2F7' }}>
                <PaymentGateway
                  plan="CREDITS"
                  productLabel="Saldo IA"
                  price={parseFloat(buyAmount || '0')}
                  onSubmitPayment={async (txHash: string) => {
                    const res = await fetch('/api/credits/purchase', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        amountUsd: parseFloat(buyAmount || '0'),
                        paymentMethod: 'CRYPTO',
                        txHash,
                      }),
                    })
                    const d = await res.json()
                    if (!res.ok) throw new Error(d.error || 'Error al registrar el pago')
                    return d.status === 'approved' ? 'approved' : 'pending_verification'
                  }}
                  onSuccess={(status) => {
                    setBuyMsg({
                      type: 'ok',
                      text: status === 'approved'
                        ? '¡Saldo acreditado! La transacción se verificó on-chain.'
                        : 'Transacción recibida. Esperando confirmaciones on-chain (~1-2 min).',
                    })
                    load()
                    setTimeout(() => { setShowBuyModal(false); setBuyMsg(null) }, 2500)
                  }}
                />
              </div>
            )}
            {buyMethod === 'CRYPTO' && parseFloat(buyAmount || '0') < 1 && (
              <div className="flex items-start gap-3 p-3.5 rounded-xl"
                style={{ background: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.22)' }}>
                <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: '#fb923c' }} />
                <p className="text-[11px]" style={{ color: 'rgba(251,191,36,0.80)' }}>
                  Elegí un monto de al menos $1 para conectar tu wallet.
                </p>
              </div>
            )}

            {/* ═══ FLUJO MANUAL (transferencia) ═══ */}
            {buyMethod === 'MANUAL' && (
              <>
                {/* Step 1: QR de pago del admin */}
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black"
                      style={{ background: 'linear-gradient(135deg, #a78bfa, #60a5fa)', color: '#fff' }}>1</span>
                    <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.55)' }}>
                      Escanea el QR y paga
                    </label>
                  </div>

                  {paymentQrUrl ? (
                    <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-xl"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)' }}>
                      <div className="w-36 h-36 rounded-xl bg-white flex items-center justify-center shrink-0 overflow-hidden"
                        style={{ border: '1px solid rgba(255,255,255,0.20)' }}>
                        <img src={paymentQrUrl} alt="QR de pago" className="w-full h-full object-contain p-2" />
                      </div>
                      <div className="text-center sm:text-left space-y-1.5 flex-1 min-w-0">
                        <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.78)' }}>
                          Escaneá con tu billetera y transferí exactamente:
                        </p>
                        <p className="text-2xl font-black tabular-nums"
                          style={{ background: 'linear-gradient(135deg, #fbbf24, #fb923c)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                          ${parseFloat(buyAmount || '0').toFixed(2)} USD
                        </p>
                        <a href={paymentQrUrl} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-sky-400 hover:text-sky-300">
                          <ExternalLink className="w-3 h-3" /> Ver QR en pantalla completa
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3 p-3.5 rounded-xl"
                      style={{ background: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.25)' }}>
                      <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: '#fb923c' }} />
                      <div>
                        <p className="text-xs font-bold text-orange-400">QR de pago no configurado</p>
                        <p className="text-[10px] mt-0.5" style={{ color: 'rgba(251,146,60,0.65)' }}>
                          El administrador aún no subió el QR de pago.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Step 2: Upload comprobante */}
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black"
                      style={{ background: 'linear-gradient(135deg, #a78bfa, #60a5fa)', color: '#fff' }}>2</span>
                    <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.55)' }}>
                      Subí el comprobante
                    </label>
                  </div>
                  <label className="w-full flex items-center gap-3 p-3.5 rounded-xl cursor-pointer transition-all"
                    style={{
                      background: buyProofUrl ? 'rgba(52,211,153,0.06)' : '#F0F3F7',
                      border: `1px dashed ${buyProofUrl ? 'rgba(52,211,153,0.35)' : 'rgba(255,255,255,0.18)'}`,
                    }}>
                    <input type="file" accept="image/*" className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) uploadProofFile(f) }} disabled={uploadingProof || submittingPurchase} />
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: buyProofUrl ? 'rgba(52,211,153,0.10)' : '#F0F3F7', border: '1px solid rgba(255,255,255,0.10)' }}>
                      {uploadingProof
                        ? <Loader2 className="w-4 h-4 text-violet-400 animate-spin" />
                        : buyProofUrl
                          ? <CheckCircle className="w-4 h-4 text-emerald-400" />
                          : <Upload className="w-4 h-4 text-white/55" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold" style={{ color: buyProofUrl ? '#fff' : 'rgba(255,255,255,0.75)' }}>
                        {uploadingProof ? 'Subiendo...' : buyProofUrl ? 'Comprobante listo' : 'Subir foto del pago'}
                      </p>
                      <p className="text-[10px] truncate" style={{ color: 'rgba(255,255,255,0.30)' }}>
                        {buyProofUrl ? buyProofUrl.split('/').pop() : 'JPG, PNG o screenshot'}
                      </p>
                    </div>
                  </label>
                </div>
              </>
            )}

            {/* Notas opcionales */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.55)' }}>
                Notas (opcional)
              </label>
              <textarea
                value={buyNotes}
                onChange={e => setBuyNotes(e.target.value)}
                rows={2}
                maxLength={500}
                placeholder="Banco, alias, referencia..."
                className="w-full px-3.5 py-2.5 rounded-xl text-sm text-white outline-none resize-none"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid #9CA3AF' }}
              />
            </div>

            {/* Mensaje */}
            {buyMsg && (
              <div className={`flex items-start gap-2 p-3 rounded-xl text-xs ${buyMsg.type === 'ok' ? 'text-green-400' : 'text-red-400'}`}
                style={{
                  background: buyMsg.type === 'ok' ? 'rgba(0,255,136,0.08)' : 'rgba(239,68,68,0.08)',
                  border: `1px solid ${buyMsg.type === 'ok' ? 'rgba(0,255,136,0.2)' : 'rgba(239,68,68,0.2)'}`,
                }}>
                {buyMsg.type === 'ok' ? <CheckCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" /> : <XCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />}
                {buyMsg.text}
              </div>
            )}

            {/* Submit — sólo en MANUAL. En CRYPTO, <PaymentGateway> tiene su propio botón */}
            {buyMethod === 'MANUAL' && (
              <button
                onClick={submitPurchase}
                disabled={submittingPurchase || uploadingProof || !buyProofUrl}
                className="w-full py-3 rounded-xl font-black text-sm transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: 'linear-gradient(135deg, #a78bfa, #60a5fa)',
                  color: '#fff',
                  boxShadow: '0 10px 26px -10px rgba(162,102,255,0.55), inset 0 1px 0 #E4E9F0',
                  letterSpacing: '-0.01em',
                }}>
                {submittingPurchase ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Enviando solicitud...
                  </span>
                ) : (
                  `Enviar solicitud por $${parseFloat(buyAmount || '0').toFixed(2)} USD`
                )}
              </button>
            )}

            {/* Info de proceso */}
            <div className="flex items-start gap-2 p-3 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid #EEF2F7' }}>
              <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: 'rgba(255,255,255,0.55)' }} />
              <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
                {buyMethod === 'CRYPTO'
                  ? <>Enviá los <strong className="text-[#B735B8]">USDT-BEP20</strong> a la dirección, pegá el TX hash y dale verificar. Si la red ya confirmó (3 bloques) tu saldo se acredita al instante. Si todavía está confirmando, queda pendiente y se aprueba sola en 1-2 min.</>
                  : <>Realizá la transferencia, subí el comprobante y enviá la solicitud. El admin la verifica y acredita tu saldo. Generalmente toma menos de 24h.</>
                }
              </p>
            </div>
          </div>
        </div>
      )}

    </div>
    </div>
  )
}
