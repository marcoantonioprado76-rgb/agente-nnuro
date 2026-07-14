'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Loader2, AlertCircle, CheckCircle2, Upload, Copy } from 'lucide-react'

interface TicketType {
  isGuest?: boolean
  id: string
  name: string
  description?: string | null
  image?: string | null
  price: number
  bulkMinQty?: number | null
  bulkDiscountPct?: number | null
  capacity: number | null
  available: number | null
  soldOut: boolean
}

interface EventData {
  paymentQrUrl?: string | null
  id: string
  title: string
  description: string
  image?: string | null
  date?: string | null
  location?: string | null
  ticketTypes: TicketType[]
}

type Step = 'info' | 'form' | 'payment' | 'done'
type PayMethod = 'MANUAL' | 'CRYPTO'

const INPUT = 'w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-sm outline-none focus:border-purple-500/50 placeholder-slate-400'
const LABEL = 'block text-xs text-white/55 mb-1.5 font-bold uppercase tracking-widest'

export default function PublicTicketPage() {
  const { eventId } = useParams<{ eventId: string }>()
  const [event, setEvent] = useState<EventData | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [step, setStep] = useState<Step>('info')
  const [selectedType, setSelectedType] = useState<TicketType | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [payMethod, setPayMethod] = useState<PayMethod>('MANUAL')
  const [proofUrl, setProofUrl] = useState('')
  const [txHash, setTxHash] = useState('')
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [ticketCodes, setTicketCodes] = useState<string[]>([])
  const [isPending, setIsPending] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  const [cryptoEnabled, setCryptoEnabled] = useState(false)
  const [manualEnabled, setManualEnabled] = useState(true)
  const [qrUrl, setQrUrl] = useState('')
  const [settingsLoaded, setSettingsLoaded] = useState(false)
  // Tipo de cambio USDT→BOB (Binance P2P): para mostrar el precio en Bs si paga por QR.
  const [usdtRate, setUsdtRate] = useState<number | null>(null)

  useEffect(() => {
    fetch(`/api/entradas/${eventId}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setNotFound(true); setLoading(false); return }
        setEvent(d.event)
        // Auto-select if only one type
        if (d.event.ticketTypes?.length === 1) setSelectedType(d.event.ticketTypes[0])
        setLoading(false)
      })
      .catch(() => { setNotFound(true); setLoading(false) })

    fetch('/api/settings')
      .then(r => r.json())
      .then(d => {
        const s = d.settings ?? {}
        const crypto = s['STORE_PAYMENT_CRYPTO'] === 'true'
        const manual = s['STORE_PAYMENT_MANUAL'] !== 'false'
        setCryptoEnabled(crypto)
        setManualEnabled(manual)
        setQrUrl(s['PAYMENT_QR_URL'] ?? '')
        setPayMethod(manual ? 'MANUAL' : 'CRYPTO')
        setSettingsLoaded(true)
      })
      .catch(() => { setManualEnabled(true); setSettingsLoaded(true) })

    // Tipo de cambio real (Binance P2P). Si falla, seguimos mostrando solo USDT.
    fetch('/api/entradas/exchange-rate')
      .then(r => r.json())
      .then(d => { if (d?.rate) setUsdtRate(Number(d.rate)) })
      .catch(() => { /* sin TC: se muestra en USDT */ })
  }, [eventId])

  const uploadProof = async (file: File) => {
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (data.url) setProofUrl(data.url)
      else setError('Error al subir imagen')
    } catch { setError('Error al subir imagen') }
    finally { setUploading(false) }
  }

  const submit = async () => {
    if (!event || !selectedType) return
    setError('')
    // El INVITADO es gratis: no se le pide comprobante ni hash.
    if (!selectedType?.isGuest && payMethod === 'MANUAL' && !proofUrl) { setError('Debes subir tu comprobante de pago'); return }
    if (payMethod === 'CRYPTO') {
      if (!txHash.trim()) { setError('Debes ingresar el hash de la transacción'); return }
      if (!/^0x[a-fA-F0-9]{64}$/.test(txHash.trim())) { setError('Hash de transacción inválido (debe empezar con 0x y tener 64 caracteres hex)'); return }
    }
    setSubmitting(true)
    try {
      const res = await fetch(`/api/entradas/${eventId}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: name, customerEmail: email, customerPhone: phone,
          ticketTypeId: selectedType.id, quantity,
          paymentMethod: payMethod, proofUrl, txHash,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Error al procesar'); return }
      setTicketCodes((data.orders ?? []).map((o: any) => o.ticketCode))
      setIsPending(data.orders?.[0]?.status === 'PENDING')
      setStep('done')
    } catch { setError('Error de conexión. Intenta de nuevo.') }
    finally { setSubmitting(false) }
  }

  const maxQty = selectedType?.available != null ? selectedType.available : 99
  const hasDiscount = selectedType?.bulkMinQty && selectedType?.bulkDiscountPct && quantity >= selectedType.bulkMinQty
  const unitPrice = hasDiscount && selectedType
    ? parseFloat((selectedType.price * (1 - selectedType.bulkDiscountPct! / 100)).toFixed(2))
    : selectedType?.price ?? 0
  const totalPrice = unitPrice * quantity

  // El pago por QR/transferencia se cobra en BOLIVIANOS; el de USDT, en dólares.
  const payInBs = payMethod === 'MANUAL' && usdtRate != null
  const totalBs = usdtRate != null ? Math.round(totalPrice * usdtRate * 100) / 100 : null
  /** Precio a mostrar según el método de pago elegido. */
  const priceLabel = (usd: number) =>
    payInBs && usdtRate != null
      ? `Bs ${(Math.round(usd * usdtRate * 100) / 100).toFixed(2)}`
      : `$${usd.toFixed(2)} USDT`

  const formatDate = (d: string) => new Date(d).toLocaleString('es-ES', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  // ── ENTRADAS METÁLICAS POR NIVEL ─────────────────────────────────────────────
  // Cada tipo de entrada se ve como un ticket premium con su metal:
  //   VIP → ORO · GENERAL → PLATA/PLATINO · INVITADO → ÓNIX (negro con oro).
  // Se rellenan SOLAS con los datos del evento (fecha, lugar) y del tipo (precio, cupo).
  type Tier = {
    key: 'VIP' | 'GENERAL' | 'GUEST'
    label: string
    icon: string
    metal: string   // degradado metálico del cuerpo
    stub: string    // degradado del talón (más oscuro)
    ink: string     // color del texto principal
    inkSoft: string // texto secundario
    edge: string    // borde
    stubInk: string // texto del talón
    glow: string    // sombra al seleccionar
  }

  const tierOf = (tt: TicketType): Tier => {
    if (tt.isGuest) return {
      key: 'GUEST', label: 'INVITADO', icon: '✦',
      metal: 'linear-gradient(135deg,#1C1C1E 0%,#3A3A3C 22%,#2C2C2E 42%,#4A4A4D 58%,#232325 78%,#141416 100%)',
      stub: 'linear-gradient(135deg,#0E0E10 0%,#242426 50%,#0E0E10 100%)',
      ink: '#F5D77A', inkSoft: 'rgba(245,215,122,0.72)', edge: '#8A6D2F',
      stubInk: '#F5D77A', glow: '0 0 0 3px rgba(245,215,122,0.35), 0 16px 34px -14px rgba(0,0,0,0.6)',
    }
    if (/vip|premium|platin|diamond|gold/i.test(tt.name)) return {
      key: 'VIP', label: 'VIP', icon: '👑',
      metal: 'linear-gradient(135deg,#8A6410 0%,#D4A32B 18%,#F7DE7E 34%,#FFF6C8 46%,#EFC751 58%,#C9971F 74%,#8A6410 100%)',
      stub: 'linear-gradient(135deg,#151310 0%,#2A241A 50%,#151310 100%)',
      ink: '#2A1F05', inkSoft: 'rgba(42,31,5,0.72)', edge: '#F0D27A',
      stubInk: '#F7DE7E', glow: '0 0 0 3px rgba(247,222,126,0.5), 0 18px 38px -14px rgba(201,151,31,0.55)',
    }
    return {
      key: 'GENERAL', label: 'GENERAL', icon: '🎟️',
      metal: 'linear-gradient(135deg,#7C8288 0%,#C3C8CE 18%,#EDF0F3 34%,#FFFFFF 46%,#D3D8DE 58%,#A2A8AF 74%,#767C83 100%)',
      stub: 'linear-gradient(135deg,#22262B 0%,#3C4249 50%,#22262B 100%)',
      ink: '#1B2026', inkSoft: 'rgba(27,32,38,0.68)', edge: '#E3E7EB',
      stubInk: '#E3E7EB', glow: '0 0 0 3px rgba(160,168,176,0.45), 0 16px 34px -14px rgba(60,66,73,0.45)',
    }
  }

  /** Fecha corta para el ticket: "30 jul · 11:00" */
  const shortDate = (d: string) => {
    const dt = new Date(d)
    const day = dt.toLocaleDateString('es-BO', { day: '2-digit', month: 'short', timeZone: 'America/La_Paz' }).replace('.', '')
    const hr = dt.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/La_Paz' })
    return `${day} · ${hr}`
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#EEF2F7' }}>
      <Loader2 size={28} className="animate-spin text-purple-400" />
    </div>
  )

  if (notFound) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: '#EEF2F7' }}>
      <AlertCircle size={40} className="text-red-400" />
      <p className="text-slate-500 text-sm">Evento no encontrado o no disponible</p>
    </div>
  )

  if (!event) return null

  const allSoldOut = event.ticketTypes.every(t => t.soldOut)

  return (
    <div className="min-h-screen" style={{ background: '#EEF2F7' }}>
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-slate-200" style={{ background: 'rgba(7,8,15,0.95)', backdropFilter: 'blur(12px)' }}>
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg overflow-hidden shrink-0">
            <img src="/logo-oficial-mydiamond.png" alt="Logo" className="w-full h-full object-contain" />
          </div>
          <span className="text-slate-900 font-black text-sm tracking-widest uppercase">MY DIAMOND</span>
          <span className="ml-auto text-xs text-slate-400">Entradas</span>
        </div>
      </div>

      {/* ── TODO vive DENTRO de un TICKET: borde de marca + flyer + muescas ────── */}
      <div className="max-w-lg mx-auto px-4 py-6">
      <div style={{
        position: 'relative', borderRadius: 26, padding: 1.5,
        background: 'linear-gradient(160deg, #FF2D95 0%, #B735B8 45%, #233B8F 100%)',
        boxShadow: '0 30px 60px -26px rgba(183,53,184,0.55)',
      }}>

        {/* FLYER completo (proporción natural: no se recorta ni deja espacios) */}
        <div style={{ position: 'relative', overflow: 'hidden', borderRadius: '24.5px 24.5px 0 0', background: '#0C0619', lineHeight: 0 }}>
          {event.image
            ? <img src={event.image} alt={event.title} style={{ width: '100%', height: 'auto', display: 'block' }} />
            : <div style={{ width: '100%', aspectRatio: '4/3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 46 }}>🎟️</div>}
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 72, background: 'linear-gradient(180deg, rgba(22,9,43,0) 0%, rgba(22,9,43,0.75) 60%, #16092B 100%)', pointerEvents: 'none' }} />
          <span style={{ position: 'absolute', top: 12, right: 12, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 11px', borderRadius: 999, background: 'rgba(7,4,18,0.68)', border: '1px solid rgba(255,45,149,0.55)', backdropFilter: 'blur(6px)', color: '#FF6FB5', fontSize: 10, fontWeight: 900, letterSpacing: '0.09em' }}>
            📍 PRESENCIAL
          </span>
        </div>

        {/* CUERPO del ticket (oscuro) — acá va todo el contenido */}
        <div style={{ position: 'relative', borderRadius: '0 0 24.5px 24.5px', background: 'linear-gradient(180deg, #16092B 0%, #0C0619 58%, #070412 100%)' }}>

          {/* Muescas laterales + perforación */}
          <div style={{ position: 'absolute', top: -11, left: -12.5, width: 22, height: 22, borderRadius: '50%', background: '#EEF2F7', pointerEvents: 'none', zIndex: 2 }} />
          <div style={{ position: 'absolute', top: -11, right: -12.5, width: 22, height: 22, borderRadius: '50%', background: '#EEF2F7', pointerEvents: 'none', zIndex: 2 }} />
          <div style={{ height: 1, margin: '0 18px', background: 'repeating-linear-gradient(90deg, rgba(255,255,255,0.28) 0 6px, transparent 6px 12px)' }} />

          <div style={{ padding: '20px 18px 24px' }} className="space-y-5">

        {/* Datos del evento */}
        <div>
          <h1 className="text-2xl font-black leading-tight" style={{ color: '#fff' }}>{event.title}</h1>
          <div className="flex flex-wrap gap-3 mt-2">
            {event.date && <span className="text-xs" style={{ color: 'rgba(255,255,255,0.72)' }}>📅 {formatDate(event.date)}</span>}
            {event.location && <span className="text-xs font-bold" style={{ color: '#C99BFF', textTransform: 'capitalize' }}>📍 {event.location}</span>}
          </div>
          {event.description && <p className="text-sm mt-3 leading-relaxed" style={{ color: 'rgba(255,255,255,0.62)' }}>{event.description}</p>}
        </div>

        {allSoldOut ? (
          <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
            <AlertCircle size={18} className="text-red-400 shrink-0" />
            <p className="text-sm text-red-400 font-bold">Entradas agotadas</p>
          </div>
        ) : step === 'info' ? (
          <div className="space-y-4">
            {/* Ticket type selector */}
            <h2 className="text-xs font-black text-white/60 uppercase tracking-widest">Elige tu tipo de entrada</h2>
            <div className="space-y-3">
              {event.ticketTypes.map(tt => {
                const T = tierOf(tt)
                const isSel = selectedType?.id === tt.id
                const discounted = tt.bulkMinQty && tt.bulkDiscountPct && quantity >= tt.bulkMinQty
                const shownPrice = discounted ? tt.price * (1 - tt.bulkDiscountPct! / 100) : tt.price

                return (
                  <button
                    key={tt.id}
                    disabled={tt.soldOut}
                    onClick={() => { setSelectedType(tt); setQuantity(1) }}
                    className="w-full text-left transition-all active:scale-[0.99]"
                    style={{
                      display: 'block', padding: 0, borderRadius: 16, border: 'none',
                      opacity: tt.soldOut ? 0.45 : 1,
                      filter: tt.soldOut ? 'grayscale(0.85)' : 'none',
                      boxShadow: isSel ? T.glow : '0 8px 22px -14px rgba(15,23,42,0.35)',
                      cursor: tt.soldOut ? 'default' : 'pointer',
                    }}
                  >
                    {/* TICKET metálico: talón + cuerpo */}
                    <div style={{ display: 'flex', borderRadius: 16, overflow: 'hidden', border: `1px solid ${T.edge}` }}>

                      {/* Talón (stub) con el nivel en vertical */}
                      <div style={{
                        width: 46, flexShrink: 0, background: T.stub,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        borderRight: `2px dashed ${T.edge}`,
                      }}>
                        <span style={{
                          writingMode: 'vertical-rl', transform: 'rotate(180deg)',
                          fontSize: 10.5, fontWeight: 900, letterSpacing: '0.22em',
                          color: T.stubInk, textTransform: 'uppercase',
                        }}>
                          {T.icon} {T.label}
                        </span>
                      </div>

                      {/* Cuerpo metálico */}
                      <div style={{ flex: 1, minWidth: 0, background: T.metal, padding: '13px 15px', position: 'relative' }}>
                        {/* Brillo diagonal (efecto metal) */}
                        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(105deg, rgba(255,255,255,0) 38%, rgba(255,255,255,0.30) 47%, rgba(255,255,255,0) 56%)', pointerEvents: 'none' }} />

                        <div style={{ position: 'relative' }}>
                          {/* Estrellas + nombre + precio */}
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                            <div style={{ minWidth: 0 }}>
                              <p style={{ fontSize: 8.5, letterSpacing: '0.3em', color: T.inkSoft, margin: 0, fontWeight: 800 }}>★★★★★★★★</p>
                              <p style={{ fontSize: 17, fontWeight: 900, color: T.ink, margin: '2px 0 0', letterSpacing: '0.02em', textTransform: 'uppercase' }}>
                                {tt.name}
                              </p>
                              {tt.description && (
                                <p style={{ fontSize: 11, color: T.inkSoft, margin: '1px 0 0', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {tt.description}
                                </p>
                              )}
                            </div>
                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                              {tt.isGuest ? (
                                <p style={{ fontSize: 17, fontWeight: 900, color: T.ink, margin: 0 }}>GRATIS</p>
                              ) : (
                                <>
                                  {discounted && (
                                    <p style={{ fontSize: 10.5, color: T.inkSoft, margin: 0, textDecoration: 'line-through' }}>${tt.price.toFixed(2)}</p>
                                  )}
                                  <p style={{ fontSize: 19, fontWeight: 900, color: T.ink, margin: 0, lineHeight: 1.1 }}>
                                    ${shownPrice.toFixed(2)}
                                  </p>
                                  <p style={{ fontSize: 9.5, color: T.inkSoft, margin: 0, fontWeight: 800 }}>
                                    {usdtRate != null ? `Bs ${(shownPrice * usdtRate).toFixed(2)}` : 'USDT'}
                                  </p>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Línea + datos del EVENTO (se llenan solos) */}
                          <div style={{ height: 1, background: T.inkSoft, opacity: 0.35, margin: '9px 0 8px' }} />
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
                            {event.date && (
                              <span style={{ fontSize: 11, color: T.ink, fontWeight: 800 }}>🗓️ {shortDate(event.date)}</span>
                            )}
                            {event.location && (
                              <span style={{ fontSize: 11, color: T.ink, fontWeight: 800, textTransform: 'capitalize' }}>📍 {event.location}</span>
                            )}
                          </div>

                          {/* Estado / promos */}
                          <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            {tt.soldOut && <span style={{ fontSize: 11, fontWeight: 900, color: '#7F1D1D' }}>AGOTADO</span>}
                            {!tt.soldOut && tt.bulkMinQty && tt.bulkDiscountPct && (
                              <span style={{ fontSize: 11, fontWeight: 800, color: T.ink }}>🏷 {tt.bulkDiscountPct}% dto. desde {tt.bulkMinQty}</span>
                            )}
                            {!tt.soldOut && tt.available != null && (
                              <span style={{ fontSize: 11, fontWeight: 800, color: tt.available <= 10 ? '#9A3412' : T.inkSoft }}>
                                {tt.available <= 10 ? `🔥 ¡Solo quedan ${tt.available}!` : `Quedan ${tt.available}`}
                              </span>
                            )}
                          </div>

                          {/* Cantidad (solo el seleccionado) */}
                          {isSel && !tt.isGuest && (
                            <div style={{ marginTop: 10, paddingTop: 9, borderTop: `1px dashed ${T.inkSoft}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <span style={{ fontSize: 11.5, color: T.ink, fontWeight: 800 }}>Cantidad</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <span onClick={e => { e.stopPropagation(); setQuantity(q => Math.max(1, q - 1)) }} style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(0,0,0,0.14)', color: T.ink, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 15 }}>−</span>
                                <span style={{ color: T.ink, fontWeight: 900, width: 20, textAlign: 'center', fontSize: 15 }}>{quantity}</span>
                                <span onClick={e => { e.stopPropagation(); setQuantity(q => Math.min(maxQty, q + 1)) }} style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(0,0,0,0.14)', color: T.ink, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 15 }}>+</span>
                              </div>
                            </div>
                          )}
                          {isSel && tt.isGuest && (
                            <div style={{ marginTop: 10, paddingTop: 9, borderTop: `1px dashed ${T.inkSoft}` }}>
                              <span style={{ fontSize: 11.5, color: T.ink, fontWeight: 800 }}>✓ Seleccionada — solo registrate y recibí tu QR</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>

            {selectedType && (
              <>
                <div className="flex items-center justify-between px-1">
                  <span className="text-sm text-white/60">Total</span>
                  <span className="text-xl font-black text-white">
                    {selectedType?.isGuest
                      ? 'GRATIS'
                      : <>${totalPrice.toFixed(2)} <span className="text-xs text-white/50">USDT</span></>}
                  </span>
                </div>
                <button
                  onClick={() => setStep('form')}
                  className="w-full py-4 rounded-2xl text-sm font-black uppercase tracking-widest transition-all active:scale-[0.98]"
                  style={{ background: 'linear-gradient(135deg,#D203DD,#0D1E79)', color: '#fff', boxShadow: '0 8px 32px rgba(210,3,221,0.3)' }}
                >
                  Comprar entrada →
                </button>
              </>
            )}
          </div>

        ) : step === 'form' ? (
          <div className="space-y-4">
            {/* Resumen (el INVITADO no muestra precio: es gratis). */}
            <div className="flex items-center justify-between px-3 py-2 rounded-xl border border-slate-200" style={{ background: '#FFFFFF' }}>
              <span className="text-xs text-slate-500">{selectedType?.name} · x{quantity}</span>
              <span className="text-sm font-black text-slate-900">
                {selectedType?.isGuest ? '🎁 GRATIS' : `$${totalPrice.toFixed(2)} USDT`}
              </span>
            </div>

            <h2 className="text-xs font-black text-white/60 uppercase tracking-widest">Tus datos</h2>
            <div><label className={LABEL}>Nombre completo</label>
              <input className={INPUT} value={name} onChange={e => setName(e.target.value)} placeholder="Juan Pérez" />
            </div>
            <div><label className={LABEL}>Correo electrónico</label>
              <input className={INPUT} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="juan@correo.com" />
            </div>
            <div><label className={LABEL}>Teléfono / WhatsApp</label>
              <input className={INPUT} type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 555 000 0000" />
            </div>

            {error && <p className="text-xs text-red-400 font-bold text-center">{error}</p>}

            <div className="flex gap-3">
              <button onClick={() => { setError(''); setStep('info') }} className="flex-1 py-3 rounded-2xl text-sm font-bold text-white/70 border border-white/20 hover:text-white">← Atrás</button>
              <button
                onClick={() => {
                  if (!name.trim() || !email.trim() || !phone.trim()) { setError('Completa todos los campos'); return }
                  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError('Email inválido'); return }
                  setError(''); setStep('payment')
                }}
                className="flex-[2] py-3 rounded-2xl text-sm font-black uppercase tracking-widest transition-all active:scale-[0.98]"
                style={{ background: 'linear-gradient(135deg,#D203DD,#0D1E79)', color: '#fff' }}
              >Continuar →</button>
            </div>
          </div>

        ) : step === 'payment' ? (
          <div className="space-y-4">
            {/* Resumen: el TOTAL se muestra en la moneda del método elegido. */}
            <div className="flex items-center justify-between px-3 py-2 rounded-xl border border-slate-200" style={{ background: '#FFFFFF' }}>
              <span className="text-xs text-slate-500">{selectedType?.name} · x{quantity}</span>
              <span className="text-sm font-black text-slate-900">
                {selectedType?.isGuest ? 'GRATIS' : priceLabel(totalPrice)}
              </span>
            </div>

            {/* INVITADO (gratis): no hay pago, solo confirma su registro. */}
            {selectedType?.isGuest ? (
              <div className="p-5 rounded-2xl border text-center" style={{ background: '#ECFDF3', borderColor: '#86efac' }}>
                <p className="text-3xl mb-1">🎁</p>
                <p className="text-lg font-black" style={{ color: '#065F46' }}>Entrada de invitado — GRATIS</p>
                <p className="text-sm mt-1" style={{ color: '#15803d' }}>
                  No tenés que pagar nada. Confirmá tu registro y te mandamos tu <strong>código QR</strong> al instante por WhatsApp y correo.
                </p>
              </div>
            ) : (
            <>
            <h2 className="text-xs font-black text-white/60 uppercase tracking-widest">Método de pago</h2>

            {!settingsLoaded ? (
              <div className="flex justify-center py-4"><Loader2 size={18} className="animate-spin text-slate-400" /></div>
            ) : !cryptoEnabled && !manualEnabled ? (
              <div className="flex items-center gap-3 p-4 bg-orange-500/10 border border-orange-500/20 rounded-2xl">
                <AlertCircle size={18} className="text-orange-400 shrink-0" />
                <p className="text-sm text-orange-400 font-bold">Métodos de pago no disponibles. Contacta al organizador.</p>
              </div>
            ) : (
              <>
                {(cryptoEnabled && manualEnabled) && (
                  <div className="flex gap-2 bg-white border border-slate-200 rounded-2xl p-1.5">
                    <button onClick={() => setPayMethod('MANUAL')} className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all ${payMethod === 'MANUAL' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-600'}`}>🏦 QR / Transferencia (Bs)</button>
                    <button onClick={() => setPayMethod('CRYPTO')} className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all ${payMethod === 'CRYPTO' ? 'bg-yellow-500 text-black' : 'text-slate-500 hover:text-slate-600'}`}>₮ USDT ($)</button>
                  </div>
                )}

                {/* MONTO A PAGAR en la moneda del método elegido (destacado). */}
                <div className="p-4 rounded-2xl border text-center" style={{
                  background: payMethod === 'CRYPTO' ? '#FFFBEB' : '#F5F3FF',
                  borderColor: payMethod === 'CRYPTO' ? '#FCD34D' : '#C4B5FD',
                }}>
                  <p className="text-[11px] font-black uppercase tracking-widest" style={{ color: payMethod === 'CRYPTO' ? '#92400E' : '#5B21B6' }}>
                    Monto a pagar
                  </p>
                  {payMethod === 'MANUAL' ? (
                    usdtRate != null ? (
                      <>
                        <p className="text-3xl font-black mt-1" style={{ color: '#4C1D95' }}>
                          Bs {totalBs!.toFixed(2)}
                        </p>
                        <p className="text-[11px] mt-1 text-slate-500">
                          ≈ ${totalPrice.toFixed(2)} USDT · Tipo de cambio Binance: 1 USDT = Bs {usdtRate.toFixed(2)}
                        </p>
                      </>
                    ) : (
                      <p className="text-3xl font-black mt-1" style={{ color: '#4C1D95' }}>
                        ${totalPrice.toFixed(2)} <span className="text-sm">USDT</span>
                      </p>
                    )
                  ) : (
                    <>
                      <p className="text-3xl font-black mt-1" style={{ color: '#92400E' }}>
                        ${totalPrice.toFixed(2)} <span className="text-sm">USDT</span>
                      </p>
                      {usdtRate != null && (
                        <p className="text-[11px] mt-1 text-slate-500">≈ Bs {totalBs!.toFixed(2)} al cambio de hoy</p>
                      )}
                    </>
                  )}
                </div>

                {payMethod === 'MANUAL' && (
                  <div className="space-y-3">
                    {(event.paymentQrUrl || qrUrl) && (
                      <div className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-slate-200" style={{ background: '#FFFFFF' }}>
                        <p className="text-xs text-slate-500">Escanea el QR para pagar</p>
                        <img src={event.paymentQrUrl || qrUrl} alt="QR Pago" className="w-40 h-40 rounded-xl object-contain bg-white p-1" />
                      </div>
                    )}
                    <div>
                      <label className={LABEL}>Sube tu comprobante</label>
                      <label className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-dashed border-slate-300 cursor-pointer hover:border-purple-500/40 transition-colors text-sm text-slate-500">
                        {uploading ? <Loader2 size={16} className="animate-spin" /> : proofUrl ? <><CheckCircle2 size={16} className="text-green-400" /> Comprobante subido</> : <><Upload size={16} /> Seleccionar imagen</>}
                        <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) uploadProof(f); e.target.value = '' }} />
                      </label>
                    </div>
                  </div>
                )}

                {payMethod === 'CRYPTO' && (
                  <div>
                    <label className={LABEL}>Hash de transacción USDT (BEP-20)</label>
                    <input className={INPUT} value={txHash} onChange={e => setTxHash(e.target.value)} placeholder="0x..." />
                  </div>
                )}
              </>
            )}
            </>
            )}

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                <AlertCircle size={14} className="text-red-400 shrink-0" />
                <p className="text-xs text-red-400">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => { setError(''); setStep('form') }} className="flex-1 py-3 rounded-2xl text-sm font-bold text-white/70 border border-white/20 hover:text-white">← Atrás</button>
              {(selectedType?.isGuest || cryptoEnabled || manualEnabled) && (
                <button
                  onClick={submit}
                  disabled={submitting || uploading}
                  className="flex-[2] py-3 rounded-2xl text-sm font-black uppercase tracking-widest transition-all active:scale-[0.98] disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg,#D203DD,#0D1E79)', color: '#fff', boxShadow: '0 8px 32px rgba(210,3,221,0.3)' }}
                >
                  {submitting
                    ? <span className="flex items-center justify-center gap-2"><Loader2 size={15} className="animate-spin" /> Procesando...</span>
                    : selectedType?.isGuest ? '🎁 Confirmar registro' : 'Confirmar compra'}
                </button>
              )}
            </div>
          </div>

        ) : (
          <div className="space-y-4 py-4">
            <div className="text-center">
              <CheckCircle2 size={48} className="mx-auto text-green-400 mb-3" />
              <h2 className="text-xl font-black text-slate-900">
                {isPending ? '¡Solicitud enviada!' : ticketCodes.length > 1 ? `¡${ticketCodes.length} entradas confirmadas!` : '¡Entrada confirmada!'}
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                {isPending
                  ? 'Tu comprobante está en revisión. Al aprobarse recibirás tus códigos por correo.'
                  : `Códigos enviados a: ${email}`}
              </p>
            </div>

            {!isPending && ticketCodes.length > 0 && (
              <div className="space-y-3">
                {ticketCodes.map((code, i) => (
                  <div key={code} className="p-5 rounded-2xl border-2 text-center" style={{ borderColor: 'rgba(210,3,221,0.4)', background: 'rgba(210,3,221,0.06)' }}>
                    {ticketCodes.length > 1 && (
                      <p className="text-xs text-slate-400 mb-1 uppercase tracking-widest">Entrada {i + 1} de {ticketCodes.length}</p>
                    )}
                    <p className="text-2xl font-black tracking-[0.2em] text-slate-900" style={{ fontFamily: 'Courier New, monospace' }}>{code}</p>
                    <button
                      onClick={() => { navigator.clipboard.writeText(code); setCopied(code); setTimeout(() => setCopied(null), 2000) }}
                      className="mt-2 flex items-center gap-1.5 mx-auto text-xs text-slate-500 hover:text-slate-600 transition-colors"
                    >
                      <Copy size={12} /> {copied === code ? '¡Copiado!' : 'Copiar'}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {isPending && ticketCodes.length > 0 && (
              <div className="p-4 rounded-2xl border border-slate-200 text-center" style={{ background: '#FFFFFF' }}>
                <p className="text-xs text-slate-400 mb-2">Tus códigos (guárdalos)</p>
                {ticketCodes.map(code => (
                  <p key={code} className="text-sm font-black text-slate-600 tracking-widest" style={{ fontFamily: 'Courier New, monospace' }}>{code}</p>
                ))}
              </div>
            )}

            <p className="text-xs text-white/45 text-center">Cada código es de uso único y personal.</p>
          </div>
        )}

          </div>{/* padding del cuerpo */}
        </div>{/* cuerpo del ticket */}
      </div>{/* borde del ticket */}

      <p style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: '#94A3B8', fontWeight: 600 }}>
        🔒 Compra segura · MY DIAMOND
      </p>
      </div>{/* contenedor */}
    </div>
  )
}
