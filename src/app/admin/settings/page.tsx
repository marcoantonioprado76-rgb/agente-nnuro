'use client'

import { useEffect, useState, useRef } from 'react'
import {
  Settings, Save, Loader2, Check, QrCode, Upload,
  ExternalLink, Trash2, DollarSign, RefreshCw, ToggleLeft, ToggleRight,
  Info,
} from 'lucide-react'

/* ─── Plan price config ─────────────────────────────────────────── */
const PLAN_PRICES = [
  {
    key: 'PRICE_BASIC',
    renewalKey: 'PRICE_BASIC_RENEWAL',
    label: 'Pack Básico',
    color: 'text-cyan-400',
    border: 'border-cyan-500/25',
    bg: 'bg-cyan-500/5',
    dot: '#22d3ee',
  },
  {
    key: 'PRICE_PRO',
    renewalKey: 'PRICE_PRO_RENEWAL',
    label: 'Pack Pro',
    color: 'text-purple-400',
    border: 'border-purple-500/25',
    bg: 'bg-purple-500/5',
    dot: '#a78bfa',
  },
  {
    key: 'PRICE_ELITE',
    renewalKey: 'PRICE_ELITE_RENEWAL',
    label: 'Pack Elite',
    color: 'text-yellow-400',
    border: 'border-yellow-500/25',
    bg: 'bg-yellow-500/5',
    dot: '#fbbf24',
  },
]

/* ─── Plan credits & bots config ────────────────────────────────── */
const PLAN_CREDITS_BOTS = [
  {
    creditsKey: 'PLAN_BASIC_CREDITS',
    botsKey: 'PLAN_BASIC_BOTS',
    creditsDefault: '3',
    botsDefault: '2',
    label: 'Pack Básico',
    color: 'text-cyan-400',
    dot: '#22d3ee',
  },
  {
    creditsKey: 'PLAN_PRO_CREDITS',
    botsKey: 'PLAN_PRO_BOTS',
    creditsDefault: '8',
    botsDefault: '4',
    label: 'Pack Pro',
    color: 'text-purple-400',
    dot: '#a78bfa',
  },
  {
    creditsKey: 'PLAN_ELITE_CREDITS',
    botsKey: 'PLAN_ELITE_BOTS',
    creditsDefault: '20',
    botsDefault: '8',
    label: 'Pack Elite',
    color: 'text-yellow-400',
    dot: '#fbbf24',
  },
]

/* ─── Toggle config ─────────────────────────────────────────────── */
const PLAN_TOGGLES = [
  {
    key: 'PLAN_BASIC_ENABLED',
    label: 'Pack Básico',
    desc: 'Si está desactivado, el Pack Básico no aparece en la tienda.',
    dot: '#22d3ee',
  },
  {
    key: 'PLAN_PRO_ENABLED',
    label: 'Pack Pro',
    desc: 'Si está desactivado, el Pack Pro no aparece en la tienda.',
    dot: '#a78bfa',
  },
  {
    key: 'PLAN_ELITE_ENABLED',
    label: 'Pack Elite',
    desc: 'Si está desactivado, el Pack Elite no aparece en la tienda.',
    dot: '#fbbf24',
  },
]

const PAYMENT_TOGGLES = [
  {
    key: 'STORE_PAYMENT_CRYPTO',
    label: 'Pago con Cripto (USDT)',
    desc: 'WalletConnect / USDT-BEP20. Verificación automática en blockchain.',
  },
  {
    key: 'STORE_PAYMENT_MANUAL',
    label: 'Pago con Comprobante (QR)',
    desc: 'El usuario sube comprobante. El admin verifica y aprueba manualmente.',
  },
  {
    key: 'STORE_PAYMENT_FASE_GLOBAL',
    label: 'Recompra Fase Global',
    desc: 'Comprobante de recompra + código de Fase Global. Activa Pack Básico.',
  },
]

function Toggle({ on, onToggle, disabled }: { on: boolean; onToggle: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      style={{
        width: 44, height: 24, borderRadius: 99, border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
        background: on ? '#00FF88' : 'rgba(255,255,255,0.12)',
        position: 'relative', transition: 'background 0.2s', flexShrink: 0, opacity: disabled ? 0.6 : 1,
      }}>
      <span style={{
        position: 'absolute', top: 3, left: on ? 23 : 3,
        width: 18, height: 18, borderRadius: '50%', background: '#fff',
        transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
      }} />
    </button>
  )
}

export default function AdminSettingsPage() {
  const [prices, setPrices] = useState<Record<string, string>>({})
  const [paymentQr, setPaymentQr] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)
  const [toggles, setToggles] = useState<Record<string, boolean>>({})
  const [savingToggle, setSavingToggle] = useState<string | null>(null)
  const [uploadingQr, setUploadingQr] = useState(false)
  const qrInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/admin/settings')
      .then(r => r.json())
      .then(d => {
        const map: Record<string, string> = {}
        d.settings?.forEach((s: { key: string; value: string }) => { map[s.key] = s.value })
        setPrices(map)
        setPaymentQr(map['PAYMENT_QR_URL'] ?? '')
        setToggles({
          // Métodos de pago — default false salvo que esté explícitamente en 'true'
          STORE_PAYMENT_CRYPTO:     map['STORE_PAYMENT_CRYPTO'] === 'true',
          STORE_PAYMENT_MANUAL:     map['STORE_PAYMENT_MANUAL'] === 'true',
          STORE_PAYMENT_FASE_GLOBAL: map['STORE_PAYMENT_FASE_GLOBAL'] === 'true',
          // Planes — default true (activos) salvo que esté explícitamente en 'false'
          PLAN_BASIC_ENABLED: map['PLAN_BASIC_ENABLED'] !== 'false',
          PLAN_PRO_ENABLED:   map['PLAN_PRO_ENABLED']   !== 'false',
          PLAN_ELITE_ENABLED: map['PLAN_ELITE_ENABLED']  !== 'false',
        })
        setLoading(false)
      })
  }, [])

  async function saveKey(key: string, value?: string) {
    const val = value ?? prices[key]
    if (!val || isNaN(Number(val)) || Number(val) <= 0) {
      alert('Ingresa un precio válido mayor a 0')
      return
    }
    setSaving(key)
    const res = await fetch('/api/admin/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value: val }),
    })
    setSaving(null)
    if (res.ok) { setSaved(key); setTimeout(() => setSaved(null), 2500) }
  }

  // Guarda créditos/bots por plan. Permite 0 (un plan sin créditos o sin bots).
  async function saveNumberKey(key: string, fallback: string) {
    const raw = prices[key]
    const val = (raw === undefined || raw === '') ? fallback : raw
    if (isNaN(Number(val)) || Number(val) < 0) {
      alert('Ingresa un número válido (0 o mayor)')
      return
    }
    setSaving(key)
    const res = await fetch('/api/admin/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value: val }),
    })
    setSaving(null)
    if (res.ok) { setSaved(key); setTimeout(() => setSaved(null), 2500) }
  }

  async function saveToggle(key: string, next: boolean) {
    setSavingToggle(key)
    setToggles(prev => ({ ...prev, [key]: next }))
    await fetch('/api/admin/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value: next ? 'true' : 'false' }),
    })
    setSavingToggle(null)
    setSaved(key)
    setTimeout(() => setSaved(null), 2000)
  }

  async function uploadQr(file: File) {
    setUploadingQr(true)
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/upload', { method: 'POST', body: fd })
    const data = await res.json()
    setUploadingQr(false)
    if (!res.ok || !data.url) { alert(data.error ?? 'Error al subir la imagen'); return }
    setPaymentQr(data.url)
    await fetch('/api/admin/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'PAYMENT_QR_URL', value: data.url }),
    })
    setSaved('PAYMENT_QR_URL')
    setTimeout(() => setSaved(null), 2000)
  }

  async function removeQr() {
    setPaymentQr('')
    await fetch('/api/admin/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'PAYMENT_QR_URL', value: '' }),
    })
  }

  const PriceInput = ({ settingKey, placeholder = '0' }: { settingKey: string; placeholder?: string }) => (
    <div className="flex items-center gap-2">
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#111827]/40 text-sm font-bold">$</span>
        <input
          type="number"
          min="1"
          step="0.01"
          placeholder={placeholder}
          value={prices[settingKey] ?? ''}
          onChange={e => setPrices(prev => ({ ...prev, [settingKey]: e.target.value }))}
          className="w-28 bg-[#F4F6FA] border border-[#E4E9F0] rounded-xl pl-6 pr-3 py-2 text-sm font-bold text-[#111827] outline-none focus:border-[#B735B8]/50 text-right"
        />
      </div>
      <button
        onClick={() => saveKey(settingKey)}
        disabled={saving === settingKey}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#EEF2F7] hover:bg-[#E4E9F0] border border-[#E4E9F0] text-xs font-bold transition-colors disabled:opacity-50 whitespace-nowrap"
      >
        {saving === settingKey
          ? <Loader2 size={12} className="animate-spin" />
          : saved === settingKey
          ? <><Check size={12} className="text-green-400" /> Guardado</>
          : <><Save size={12} /> Guardar</>
        }
      </button>
    </div>
  )

  const PlanNumberInput = ({ settingKey, fallback, prefix, placeholder }: { settingKey: string; fallback: string; prefix?: string; placeholder?: string }) => (
    <div className="flex items-center gap-2">
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#111827]/40 text-sm font-bold">{prefix}</span>
        )}
        <input
          type="number"
          min="0"
          step={prefix ? '0.01' : '1'}
          placeholder={placeholder ?? fallback}
          value={prices[settingKey] ?? ''}
          onChange={e => setPrices(prev => ({ ...prev, [settingKey]: e.target.value }))}
          className={`w-28 bg-[#F4F6FA] border border-[#E4E9F0] rounded-xl ${prefix ? 'pl-6' : 'pl-3'} pr-3 py-2 text-sm font-bold text-[#111827] outline-none focus:border-[#B735B8]/50 text-right`}
        />
      </div>
      <button
        onClick={() => saveNumberKey(settingKey, fallback)}
        disabled={saving === settingKey}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#EEF2F7] hover:bg-[#E4E9F0] border border-[#E4E9F0] text-xs font-bold transition-colors disabled:opacity-50 whitespace-nowrap"
      >
        {saving === settingKey
          ? <Loader2 size={12} className="animate-spin" />
          : saved === settingKey
          ? <><Check size={12} className="text-green-400" /> Guardado</>
          : <><Save size={12} /> Guardar</>
        }
      </button>
    </div>
  )

  return (
  <div className="dm-page font-ui">
    <div className="space-y-8 max-w-2xl">

      {/* Header */}
      <div>
        <h1 className="text-xl font-black uppercase tracking-tighter flex items-center gap-2">
          <Settings size={18} className="text-[#111827]/50" /> Configuración
        </h1>
        <p className="text-xs text-[#111827]/30 mt-0.5">Precios de planes, renovaciones y métodos de pago.</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="animate-spin text-purple-400" size={22} />
        </div>
      ) : (
        <>
          {/* ── Plan Prices ─────────────────────────────── */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign size={13} className="text-[#111827]/40" />
              <p className="text-[10px] font-black uppercase tracking-widest text-[#111827]/40">Precios de Planes</p>
            </div>

            <div className="rounded-2xl overflow-hidden border border-[#E4E9F0]">
              {/* Column headers */}
              <div className="grid grid-cols-3 px-5 py-2.5 border-b border-[#E4E9F0]"
                style={{ background: 'rgba(255,255,255,0.03)' }}>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#111827]/25">Plan</span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#111827]/25 flex items-center gap-1">
                  <DollarSign size={9} /> Precio inicial
                </span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#111827]/25 flex items-center gap-1">
                  <RefreshCw size={9} /> Renovación
                </span>
              </div>

              {PLAN_PRICES.map(plan => (
                <div key={plan.key}
                  className="grid grid-cols-3 items-center px-5 py-4 border-b border-[#E4E9F0] last:border-0"
                  style={{ background: 'rgba(255,255,255,0.015)' }}>

                  {/* Plan name */}
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: plan.dot }} />
                    <span className={`text-sm font-black ${plan.color}`}>{plan.label}</span>
                  </div>

                  {/* Initial price */}
                  <PriceInput settingKey={plan.key} placeholder="49" />

                  {/* Renewal price */}
                  <PriceInput settingKey={plan.renewalKey} placeholder="19" />
                </div>
              ))}
            </div>

            <div className="flex items-start gap-2 p-3 rounded-xl bg-[#F7F9FC] border border-[#E4E9F0]">
              <Info size={12} className="text-[#111827]/25 mt-0.5 shrink-0" />
              <p className="text-[11px] text-[#111827]/30 leading-relaxed">
                El <strong className="text-[#111827]/45">precio inicial</strong> se cobra cuando el usuario activa el plan por primera vez.
                La <strong className="text-[#111827]/45">renovación</strong> se cobra cuando el plan vence y el usuario quiere extenderlo.
                Si dejas la renovación vacía, se usará el precio inicial.
              </p>
            </div>
          </section>

          {/* ── Plan Credits & Bots ─────────────────────── */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign size={13} className="text-[#111827]/40" />
              <p className="text-[10px] font-black uppercase tracking-widest text-[#111827]/40">Créditos IA y Bots por plan</p>
            </div>

            <div className="rounded-2xl overflow-hidden border border-[#E4E9F0]">
              {/* Column headers */}
              <div className="grid grid-cols-3 px-5 py-2.5 border-b border-[#E4E9F0]"
                style={{ background: 'rgba(255,255,255,0.03)' }}>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#111827]/25">Plan</span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#111827]/25 flex items-center gap-1">
                  <DollarSign size={9} /> Créditos IA (USD)
                </span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#111827]/25">Bots / agentes</span>
              </div>

              {PLAN_CREDITS_BOTS.map(plan => (
                <div key={plan.creditsKey}
                  className="grid grid-cols-3 items-center px-5 py-4 border-b border-[#E4E9F0] last:border-0"
                  style={{ background: 'rgba(255,255,255,0.015)' }}>

                  {/* Plan name */}
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: plan.dot }} />
                    <span className={`text-sm font-black ${plan.color}`}>{plan.label}</span>
                  </div>

                  {/* Credits (USD) */}
                  <PlanNumberInput settingKey={plan.creditsKey} fallback={plan.creditsDefault} prefix="$" />

                  {/* Bots */}
                  <PlanNumberInput settingKey={plan.botsKey} fallback={plan.botsDefault} />
                </div>
              ))}
            </div>

            <div className="flex items-start gap-2 p-3 rounded-xl bg-[#F7F9FC] border border-[#E4E9F0]">
              <Info size={12} className="text-[#111827]/25 mt-0.5 shrink-0" />
              <p className="text-[11px] text-[#111827]/30 leading-relaxed">
                Los <strong className="text-[#111827]/45">créditos IA incluidos</strong> (en USD) y la cantidad de <strong className="text-[#111827]/45">bots / agentes</strong> que cada plan otorga al usuario.
                Si dejas un campo vacío, se usará el valor por defecto.
              </p>
            </div>
          </section>

          {/* ── Payment QR ──────────────────────────────── */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <QrCode size={13} className="text-[#111827]/40" />
              <p className="text-[10px] font-black uppercase tracking-widest text-[#111827]/40">QR de Pago Global</p>
            </div>

            <div className="bg-white/[0.025] border border-[#E4E9F0] rounded-2xl p-5">
              <p className="text-xs text-[#111827]/40 mb-4">
                Este QR se muestra en el checkout para pagos manuales. Sube el QR de tu billetera USDT u otro método.
              </p>

              {paymentQr ? (
                <div className="flex items-start gap-4">
                  <div className="w-24 h-24 rounded-xl border border-[#E4E9F0] overflow-hidden bg-white flex items-center justify-center shrink-0">
                    <img src={paymentQr} alt="QR de pago" className="w-full h-full object-contain" />
                  </div>
                  <div className="flex-1 space-y-2">
                    {saved === 'PAYMENT_QR_URL' && (
                      <span className="text-[10px] text-green-400 flex items-center gap-1">
                        <Check size={10} /> Guardado
                      </span>
                    )}
                    <a href={paymentQr} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300">
                      <ExternalLink size={11} /> Ver QR completo
                    </a>
                    <div className="flex gap-2 flex-wrap">
                      <button onClick={() => qrInputRef.current?.click()}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600/20 border border-purple-500/30 text-purple-400 text-xs font-bold hover:bg-purple-600/30 transition-colors">
                        <Upload size={11} /> Cambiar QR
                      </button>
                      <button onClick={removeQr}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600/15 border border-red-500/25 text-red-400 text-xs font-bold hover:bg-red-600/25 transition-colors">
                        <Trash2 size={11} /> Quitar
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <button onClick={() => qrInputRef.current?.click()} disabled={uploadingQr}
                  className="w-full flex flex-col items-center justify-center gap-2 py-8 border-2 border-dashed border-[#E4E9F0] rounded-xl text-[#111827]/30 hover:border-purple-500/40 hover:text-purple-400 transition-colors">
                  {uploadingQr
                    ? <Loader2 size={20} className="animate-spin" />
                    : <>
                        <QrCode size={24} className="text-[#111827]/20" />
                        <span className="text-xs font-bold">Subir imagen del QR de pago</span>
                        <span className="text-[10px] text-[#111827]/20">PNG, JPG · USDT, Binance Pay, etc.</span>
                      </>
                  }
                </button>
              )}

              <input ref={qrInputRef} type="file" accept="image/*" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) uploadQr(f) }} />
            </div>
          </section>

          {/* ── Plan Availability ────────────────────────── */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <ToggleLeft size={13} className="text-[#111827]/40" />
              <p className="text-[10px] font-black uppercase tracking-widest text-[#111827]/40">Disponibilidad de Planes</p>
            </div>

            <div className="bg-white/[0.025] border border-[#E4E9F0] rounded-2xl divide-y divide-white/6 overflow-hidden">
              {PLAN_TOGGLES.map(t => (
                <div key={t.key} className="flex items-center justify-between gap-4 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: t.dot }} />
                    <div>
                      <p className="text-sm font-bold text-[#111827]">{t.label}</p>
                      <p className="text-[11px] text-[#111827]/35 mt-0.5">{t.desc}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {saved === t.key && <Check size={11} className="text-green-400" />}
                    {savingToggle === t.key && <Loader2 size={11} className="text-[#111827]/40 animate-spin" />}
                    <Toggle
                      on={toggles[t.key] ?? true}
                      onToggle={() => saveToggle(t.key, !toggles[t.key])}
                      disabled={savingToggle === t.key}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-start gap-2 p-3 rounded-xl bg-[#F7F9FC] border border-[#E4E9F0]">
              <Info size={12} className="text-[#111827]/25 mt-0.5 shrink-0" />
              <p className="text-[11px] text-[#111827]/30 leading-relaxed">
                Si <strong className="text-[#111827]/45">todos los planes están desactivados</strong>, al hacer clic en "Comprar plan" desde el dashboard, el usuario verá únicamente la opción de <strong className="text-[#111827]/45">Fase Global</strong>.
              </p>
            </div>
          </section>

          {/* ── Payment Methods (Store) ──────────────────── */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <ToggleLeft size={13} className="text-[#111827]/40" />
              <p className="text-[10px] font-black uppercase tracking-widest text-[#111827]/40">Métodos de Pago — Tienda</p>
            </div>

            <div className="bg-white/[0.025] border border-[#E4E9F0] rounded-2xl divide-y divide-white/6 overflow-hidden">
              {PAYMENT_TOGGLES.map(t => (
                <div key={t.key} className="flex items-center justify-between gap-4 px-5 py-4">
                  <div>
                    <p className="text-sm font-bold text-[#111827]">{t.label}</p>
                    <p className="text-[11px] text-[#111827]/35 mt-0.5">{t.desc}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {saved === t.key && <Check size={11} className="text-green-400" />}
                    {savingToggle === t.key && <Loader2 size={11} className="text-[#111827]/40 animate-spin" />}
                    <Toggle
                      on={toggles[t.key] ?? false}
                      onToggle={() => saveToggle(t.key, !toggles[t.key])}
                      disabled={savingToggle === t.key}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Flow info */}
          <div className="bg-[#F7F9FC] border border-[#E4E9F0] rounded-2xl p-4">
            <p className="text-[11px] text-[#111827]/30 leading-relaxed">
              <strong className="text-[#111827]/50">Flujo de compra:</strong> El usuario selecciona un plan → ve el precio y QR de pago → realiza el pago → sube su comprobante → tú revisas y apruebas desde <em>Compras</em>.
            </p>
          </div>
        </>
      )}
    </div>
  </div>
  )
}
