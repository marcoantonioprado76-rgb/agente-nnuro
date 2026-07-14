'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { PaymentGateway } from '@/components/PaymentGateway'

interface CartItem {
  itemId: string
  title: string
  price: number
  image: string | null
  quantity: number
  selectedVariants: Record<string, string>
}

interface Settings {
  PAYMENT_QR_URL?: string
  STORE_PAYMENT_CRYPTO?: string
  STORE_PAYMENT_MANUAL?: string
}

interface SuccessData {
  orderId: string
  paymentMethod: 'CRYPTO' | 'MANUAL'
  status: string
  txHash?: string
  totalPrice: number
}

const INPUT_STYLE: React.CSSProperties = {
  width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8, padding: '10px 12px', color: '#fff', fontSize: 14, outline: 'none',
}

const NAVY_CARD = 'linear-gradient(180deg, #0B1B2B 0%, #081624 60%, #050B14 100%)'

export default function CartPage() {
  const [cart, setCart] = useState<CartItem[]>([])
  const [settings, setSettings] = useState<Settings>({})
  const [payTab, setPayTab] = useState<'CRYPTO' | 'MANUAL'>('CRYPTO')
  const [proofUrl, setProofUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const proofInputRef = useRef<HTMLInputElement>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState<SuccessData | null>(null)

  // Delivery form
  const [form, setForm] = useState({ recipientName: '', phone: '', address: '', city: '', state: '', country: '', zipCode: '', deliveryNotes: '' })

  useEffect(() => {
    try {
      const c = JSON.parse(localStorage.getItem('store_cart') ?? '[]')
      setCart(c)
    } catch { setCart([]) }

    fetch('/api/settings').then(r => r.json()).then(d => setSettings(d.settings ?? {})).catch(() => {})
  }, [])

  const cryptoEnabled = settings.STORE_PAYMENT_CRYPTO === 'true'
  const manualEnabled = settings.STORE_PAYMENT_MANUAL === 'true'

  useEffect(() => {
    if (cryptoEnabled) setPayTab('CRYPTO')
    else if (manualEnabled) setPayTab('MANUAL')
  }, [cryptoEnabled, manualEnabled])

  const totalPrice = cart.reduce((s, i) => s + i.price * i.quantity, 0)

  const updateQty = (idx: number, qty: number) => {
    const c = [...cart]
    if (qty < 1) { c.splice(idx, 1) } else { c[idx] = { ...c[idx], quantity: qty } }
    setCart(c)
    localStorage.setItem('store_cart', JSON.stringify(c))
    window.dispatchEvent(new Event('cart_updated'))
  }

  const removeItem = (idx: number) => updateQty(idx, 0)

  const setField = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }))

  const validateForm = () => {
    const { recipientName, phone, address, city, state, country } = form
    if (!recipientName || !phone || !address || !city || !state || !country) {
      setError('Completa todos los datos de entrega obligatorios.')
      return false
    }
    return true
  }

  const buildBody = (extra: object) => ({
    items: cart.map(c => ({ itemId: c.itemId, quantity: c.quantity, selectedVariants: c.selectedVariants })),
    recipientName: form.recipientName.trim(),
    phone: form.phone.trim(),
    address: form.address.trim(),
    city: form.city.trim(),
    state: form.state.trim(),
    country: form.country.trim(),
    zipCode: form.zipCode.trim() || null,
    deliveryNotes: form.deliveryNotes.trim() || null,
    ...extra,
  })

  // Called by PaymentGateway after successful USDT transfer
  const handleCryptoPayment = async (txHash: string): Promise<'approved' | 'pending_verification'> => {
    if (!validateForm()) throw new Error('Datos de entrega incompletos')
    setError('')
    const res = await fetch('/api/store/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildBody({ paymentMethod: 'CRYPTO', txHash })),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? 'Error al crear pedido')

    const finalStatus = data.status === 'APPROVED' ? 'approved' : 'pending_verification'
    setSuccess({
      orderId: data.order.id,
      paymentMethod: 'CRYPTO',
      status: data.status,
      txHash,
      totalPrice: data.order.totalPrice,
    })
    localStorage.removeItem('store_cart')
    window.dispatchEvent(new Event('cart_updated'))
    return finalStatus
  }

  const uploadProof = async (file: File) => {
    setUploading(true)
    setError('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (data.url) { setProofUrl(data.url) } else { setError(data.error ?? 'Error al subir el comprobante') }
    } catch {
      setError('Error al subir el comprobante. Intenta de nuevo.')
    } finally {
      setUploading(false)
    }
  }

  const handleManualSubmit = async () => {
    if (!validateForm()) return
    if (!proofUrl) { setError('Sube el comprobante de pago antes de continuar.'); return }
    setError('')
    setSubmitting(true)
    try {
      const res = await fetch('/api/store/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildBody({ paymentMethod: 'MANUAL', proofUrl: proofUrl.trim() })),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Error al crear pedido'); return }
      setSuccess({
        orderId: data.order.id,
        paymentMethod: 'MANUAL',
        status: data.status,
        totalPrice: data.order.totalPrice,
      })
      localStorage.removeItem('store_cart')
      window.dispatchEvent(new Event('cart_updated'))
    } catch { setError('Error de conexión. Intenta de nuevo.') }
    finally { setSubmitting(false) }
  }

  // ── SUCCESS SCREEN ──
  if (success) {
    const approved = success.status === 'APPROVED'
    return (
      <div className="px-4 sm:px-6 pt-8 pb-12 max-w-lg mx-auto">
        <div style={{ background: NAVY_CARD, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: 32, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>{approved ? '✅' : '⏳'}</div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: approved ? '#00FF88' : '#F5A623', marginBottom: 8 }}>
            {approved ? 'Pago Confirmado' : 'Pago en Revisión'}
          </h2>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', marginBottom: 24 }}>
            {approved
              ? 'Tu pedido ha sido aprobado y está siendo procesado.'
              : success.paymentMethod === 'CRYPTO'
                ? 'Verificando la transacción en blockchain. Serás notificado al confirmar.'
                : 'El administrador verificará tu comprobante y aprobará el pedido.'}
          </p>

          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '14px 18px', marginBottom: 20, textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>Nº Pedido</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#fff', letterSpacing: '0.05em' }}>#{success.orderId.slice(0, 8).toUpperCase()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>Total</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#F5A623' }}>{success.totalPrice.toFixed(2)} USDT</span>
            </div>
            {success.txHash && (
              <div style={{ marginTop: 10 }}>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginBottom: 4 }}>Hash de transacción</p>
                <a href={`https://bscscan.com/tx/${success.txHash}`} target="_blank" rel="noreferrer"
                  style={{ fontSize: 11, color: '#C9A7FF', wordBreak: 'break-all', textDecoration: 'none' }}>
                  {success.txHash} ↗
                </a>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Link href="/dashboard/store/my-orders" style={{ flex: 1, padding: '11px 16px', borderRadius: 10, fontWeight: 700, fontSize: 13, textAlign: 'center', textDecoration: 'none', background: 'linear-gradient(135deg, #FF2D95 0%, #B735B8 48%, #233B8F 100%)', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              Ver mis pedidos
            </Link>
            <Link href="/dashboard/store" style={{ flex: 1, padding: '11px 16px', borderRadius: 10, fontWeight: 700, fontSize: 13, textAlign: 'center', textDecoration: 'none', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.55)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              Seguir comprando
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // ── EMPTY CART ──
  if (cart.length === 0) {
    return (
      <div className="px-4 sm:px-6 pt-8 pb-12 max-w-lg mx-auto text-center">
        <div style={{ fontSize: 48, marginBottom: 16 }}>🛒</div>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 8 }}>Tu carrito está vacío</h2>
        <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 24 }}>Agrega productos desde la tienda para continuar.</p>
        <Link href="/dashboard/store" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '11px 22px', borderRadius: 10, fontWeight: 700, fontSize: 13, textDecoration: 'none', background: 'linear-gradient(135deg, #FF2D95 0%, #B735B8 48%, #233B8F 100%)', color: '#fff' }}>
          Ir a la tienda
        </Link>
      </div>
    )
  }

  return (
  <div className="dm-page font-ui">
    <div className="px-4 sm:px-6 pt-6 pb-12 max-w-3xl mx-auto">
      <Link href="/dashboard/store" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#6B7280', textDecoration: 'none', marginBottom: 24 }}>
        ← Volver a la tienda
      </Link>

      <h1 style={{ fontSize: 20, fontWeight: 800, color: '#111827', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Carrito</h1>
      <div className="h-px w-16 mb-6 rounded-full" style={{ background: 'linear-gradient(90deg, transparent, #D203DD, #FF2DF7, transparent)' }} />

      {/* ── SECTION 1: CART ITEMS ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
        {cart.map((item, idx) => (
          <div key={idx} style={{ display: 'flex', gap: 12, padding: 14, background: NAVY_CARD, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, alignItems: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: 10, overflow: 'hidden', flexShrink: 0, background: 'rgba(255,255,255,0.05)' }}>
              {item.image ? <img src={item.image} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ height: '100%' }} />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontWeight: 700, color: '#fff', fontSize: 13, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</p>
              {Object.entries(item.selectedVariants ?? {}).map(([k, v]) => (
                <span key={k} style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>{k}: {v} · </span>
              ))}
              <p style={{ fontSize: 12, color: '#F5A623', fontWeight: 700, marginTop: 2 }}>{(item.price * item.quantity).toFixed(2)} USDT</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <button onClick={() => updateQty(idx, item.quantity - 1)} style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)', color: '#fff', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
              <span style={{ color: '#fff', fontWeight: 700, fontSize: 13, minWidth: 16, textAlign: 'center' }}>{item.quantity}</span>
              <button onClick={() => updateQty(idx, item.quantity + 1)} style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)', color: '#fff', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
              <button onClick={() => removeItem(idx)} style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.06)', color: '#ef4444', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>
          </div>
        ))}
      </div>

      {/* ── SECTION 2: DELIVERY DATA ── */}
      <div style={{ background: NAVY_CARD, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: '20px 18px', marginBottom: 24 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.08em' }}>📦 Datos de entrega</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', display: 'block', marginBottom: 5 }}>Nombre completo del destinatario *</label>
            <input style={INPUT_STYLE} value={form.recipientName} onChange={setField('recipientName')} placeholder="Ej. María García López" />
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', display: 'block', marginBottom: 5 }}>Teléfono *</label>
            <input style={INPUT_STYLE} value={form.phone} onChange={setField('phone')} placeholder="+57 300 000 0000" />
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', display: 'block', marginBottom: 5 }}>País *</label>
            <input style={INPUT_STYLE} value={form.country} onChange={setField('country')} placeholder="Colombia" />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', display: 'block', marginBottom: 5 }}>Dirección completa (calle, número, apto) *</label>
            <input style={INPUT_STYLE} value={form.address} onChange={setField('address')} placeholder="Calle 123 # 45-67, Apto 8B" />
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', display: 'block', marginBottom: 5 }}>Ciudad *</label>
            <input style={INPUT_STYLE} value={form.city} onChange={setField('city')} placeholder="Bogotá" />
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', display: 'block', marginBottom: 5 }}>Estado / Departamento *</label>
            <input style={INPUT_STYLE} value={form.state} onChange={setField('state')} placeholder="Cundinamarca" />
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', display: 'block', marginBottom: 5 }}>Código postal</label>
            <input style={INPUT_STYLE} value={form.zipCode} onChange={setField('zipCode')} placeholder="110111" />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', display: 'block', marginBottom: 5 }}>Notas de entrega</label>
            <textarea style={{ ...INPUT_STYLE, resize: 'none' }} rows={2} value={form.deliveryNotes} onChange={setField('deliveryNotes')} placeholder='Ej. "Timbre 2B", "Dejar en portería"' />
          </div>
        </div>
      </div>

      {/* ── SECTION 3: SUMMARY + PAYMENT ── */}
      <div style={{ background: NAVY_CARD, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: '20px 18px' }}>
        {/* Summary */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>Subtotal ({cart.length} producto{cart.length !== 1 ? 's' : ''})</span>
          <span style={{ fontSize: 15, fontWeight: 800, color: '#F5A623' }}>{totalPrice.toFixed(2)} USDT</span>
        </div>

        {/* Error */}
        {error && <p style={{ fontSize: 13, color: '#ef4444', marginBottom: 14, background: 'rgba(239,68,68,0.08)', borderRadius: 8, padding: '8px 12px' }}>{error}</p>}

        {!cryptoEnabled && !manualEnabled && (
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', textAlign: 'center', padding: '16px 0' }}>
            Métodos de pago temporalmente no disponibles.
          </p>
        )}

        {(cryptoEnabled || manualEnabled) && (
          <>
            {/* Payment tabs */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 18 }}>
              {cryptoEnabled && (
                <button onClick={() => setPayTab('CRYPTO')}
                  style={{ flex: 1, padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: '1px solid', background: 'transparent',
                    borderColor: payTab === 'CRYPTO' ? 'rgba(210,3,221,0.4)' : 'rgba(255,255,255,0.12)',
                    color: payTab === 'CRYPTO' ? '#FF2D95' : 'rgba(255,255,255,0.55)' }}>
                  ₮ Cripto (USDT)
                </button>
              )}
              {manualEnabled && (
                <button onClick={() => setPayTab('MANUAL')}
                  style={{ flex: 1, padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: '1px solid', background: 'transparent',
                    borderColor: payTab === 'MANUAL' ? 'rgba(245,166,35,0.4)' : 'rgba(255,255,255,0.12)',
                    color: payTab === 'MANUAL' ? '#F5A623' : 'rgba(255,255,255,0.55)' }}>
                  📎 Comprobante
                </button>
              )}
            </div>

            {/* CRYPTO */}
            {payTab === 'CRYPTO' && cryptoEnabled && (
              <PaymentGateway
                plan="store"
                price={totalPrice}
                onSubmitPayment={handleCryptoPayment}
                onSuccess={() => {}}
                onCancel={() => {}}
              />
            )}

            {/* MANUAL */}
            {payTab === 'MANUAL' && manualEnabled && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {settings.PAYMENT_QR_URL && (
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', marginBottom: 10 }}>Escanea el QR y paga <strong style={{ color: '#F5A623' }}>{totalPrice.toFixed(2)} USDT</strong></p>
                    <img src={settings.PAYMENT_QR_URL} alt="QR pago" style={{ width: 160, height: 160, borderRadius: 12, margin: '0 auto', display: 'block', border: '2px solid rgba(245,166,35,0.3)' }} />
                  </div>
                )}
                <div>
                  <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', display: 'block', marginBottom: 5 }}>Comprobante de pago *</label>
                  <input ref={proofInputRef} type="file" accept="image/*,application/pdf" style={{ display: 'none' }}
                    onChange={e => { const f = e.target.files?.[0]; if (f) uploadProof(f); e.target.value = '' }} />
                  {proofUrl ? (
                    <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(0,255,136,0.2)', background: 'rgba(0,255,136,0.04)', marginBottom: 6 }}>
                      <img src={proofUrl} alt="Comprobante" style={{ width: '100%', maxHeight: 160, objectFit: 'contain', background: 'rgba(0,0,0,0.3)' }} />
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px' }}>
                        <span style={{ fontSize: 12, color: '#00FF88', fontWeight: 600 }}>✓ Comprobante subido</span>
                        <button onClick={() => setProofUrl('')} style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', background: 'none', border: 'none', cursor: 'pointer' }}>Cambiar</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => proofInputRef.current?.click()} disabled={uploading}
                      style={{ width: '100%', padding: '20px 0', borderRadius: 10, border: '2px dashed rgba(255,255,255,0.18)', background: 'rgba(255,255,255,0.03)', color: uploading ? 'rgba(255,255,255,0.42)' : 'rgba(255,255,255,0.6)', cursor: uploading ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600 }}>
                      {uploading ? '⏳ Subiendo...' : '📎 Subir comprobante (foto/PDF)'}
                    </button>
                  )}
                </div>
                <button onClick={handleManualSubmit} disabled={submitting}
                  style={{ width: '100%', padding: '13px 0', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: submitting ? 'not-allowed' : 'pointer', border: 'none',
                    background: submitting ? 'rgba(255,255,255,0.06)' : 'linear-gradient(135deg, #FF2D95 0%, #B735B8 48%, #233B8F 100%)',
                    color: submitting ? 'rgba(255,255,255,0.42)' : '#fff' }}>
                  {submitting ? 'Enviando pedido...' : 'Confirmar pedido'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  </div>
  )
}
