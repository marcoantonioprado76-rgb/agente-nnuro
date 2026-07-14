'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface StoreItem {
  id: string
  title: string
  description: string
  category: string
  price: number
  pv: number
  images: string[]
  stock: number
  variants: { name: string; options: string[] }[]
}

export default function StoreItemPage({ params }: { params: { itemId: string } }) {
  const [item, setItem] = useState<StoreItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeImg, setActiveImg] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({})
  const [toast, setToast] = useState('')

  useEffect(() => {
    fetch(`/api/store/items/${params.itemId}`)
      .then(r => r.json())
      .then(d => { setItem(d.item ?? null); setLoading(false) })
      .catch(() => setLoading(false))
  }, [params.itemId])

  const addToCart = () => {
    if (!item) return
    // Validar variantes
    for (const v of item.variants) {
      if (!selectedVariants[v.name]) {
        setToast(`Selecciona ${v.name}`)
        setTimeout(() => setToast(''), 2500)
        return
      }
    }
    try {
      const cart = JSON.parse(localStorage.getItem('store_cart') ?? '[]')
      // Buscar item existente con mismas variantes
      const key = JSON.stringify({ id: item.id, variants: selectedVariants })
      const idx = cart.findIndex((c: any) => JSON.stringify({ id: c.itemId, variants: c.selectedVariants }) === key)
      if (idx >= 0) {
        cart[idx].quantity = Math.min(cart[idx].quantity + quantity, item.stock)
      } else {
        cart.push({
          itemId: item.id,
          title: item.title,
          price: item.price,
          image: item.images[0] ?? null,
          quantity,
          selectedVariants,
        })
      }
      localStorage.setItem('store_cart', JSON.stringify(cart))
      window.dispatchEvent(new Event('cart_updated'))
      setToast('¡Agregado al carrito!')
      setTimeout(() => setToast(''), 2500)
    } catch {
      setToast('Error al agregar')
      setTimeout(() => setToast(''), 2000)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-6 h-6 border-2 border-[#7DD3FC] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!item) {
    return (
      <div className="px-4 sm:px-6 pt-6 max-w-screen-2xl mx-auto">
        <p className="text-[#111827]/40 text-sm">Producto no encontrado.</p>
        <Link href="/dashboard/store" style={{ color: '#D203DD', fontSize: 13, textDecoration: 'none' }}>← Volver a la tienda</Link>
      </div>
    )
  }

  const images = Array.isArray(item.images) && item.images.length > 0 ? item.images : []
  const outOfStock = item.stock === 0

  return (
  <div className="dm-page font-ui">
    <div className="px-4 sm:px-6 pt-6 pb-12 max-w-7xl mx-auto">
      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, background: toast.includes('!') ? 'rgba(0,255,136,0.15)' : 'rgba(239,68,68,0.15)', border: `1px solid ${toast.includes('!') ? 'rgba(0,255,136,0.3)' : 'rgba(239,68,68,0.3)'}`, color: toast.includes('!') ? '#00FF88' : '#ef4444', borderRadius: 10, padding: '10px 18px', fontSize: 13, fontWeight: 600 }}>
          {toast}
        </div>
      )}

      {/* Back */}
      <Link href="/dashboard/store" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#6B7280', textDecoration: 'none', marginBottom: 24 }}>
        ← Volver a la tienda
      </Link>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 28 }} className="sm:grid-cols-2">
        {/* Images */}
        <div>
          <div style={{ aspectRatio: '1/1', borderRadius: 16, overflow: 'hidden', background: 'linear-gradient(180deg, #0B1B2B 0%, #081624 60%, #050B14 100%)', border: '1px solid rgba(255,255,255,0.1)', position: 'relative' }}>
            {images.length > 0 ? (
              <img src={images[activeImg]} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg className="w-16 h-16 opacity-20" viewBox="0 0 24 24" fill="none" stroke="#D203DD" strokeWidth="1"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z" /></svg>
              </div>
            )}
            {outOfStock && (
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 16, fontWeight: 800, color: '#fff', letterSpacing: '0.1em', textTransform: 'uppercase' }}>No disponible</span>
              </div>
            )}
          </div>
          {images.length > 1 && (
            <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              {images.map((src, i) => (
                <button key={i} onClick={() => setActiveImg(i)}
                  style={{ width: 56, height: 56, borderRadius: 8, overflow: 'hidden', border: `2px solid ${activeImg === i ? '#D203DD' : 'rgba(255,255,255,0.1)'}`, background: 'none', cursor: 'pointer', padding: 0 }}>
                  <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 24, borderRadius: 16, background: 'linear-gradient(180deg, #0B1B2B 0%, #081624 60%, #050B14 100%)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 18px 40px -24px rgba(8,22,36,0.6), inset 0 1px 0 rgba(255,255,255,0.05)' }}>
          <div>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#D203DD', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{item.category}</span>
            <h1 style={{ fontSize: 'clamp(18px, 5vw, 24px)', fontWeight: 800, color: '#fff', margin: '6px 0 8px', lineHeight: 1.2 }}>{item.title}</h1>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6 }}>{item.description}</p>
          </div>

          {/* Price */}
          <div>
            <span style={{ fontSize: 26, fontWeight: 900, color: '#F5A623' }}>{item.price.toFixed(2)} <span style={{ fontSize: 14, fontWeight: 600 }}>USDT</span></span>
          </div>

          {/* Stock */}
          <p style={{ fontSize: 12, color: outOfStock ? '#ef4444' : 'rgba(255,255,255,0.55)' }}>
            {outOfStock ? 'Producto no disponible' : `${item.stock} disponibles`}
          </p>

          {/* Variants */}
          {item.variants.map(v => (
            <div key={v.name}>
              <p style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.55)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{v.name}</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {v.options.map(opt => (
                  <button key={opt} onClick={() => setSelectedVariants(p => ({ ...p, [v.name]: opt }))}
                    style={{ padding: '6px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: '1px solid', background: 'transparent',
                      borderColor: selectedVariants[v.name] === opt ? '#D203DD' : 'rgba(255,255,255,0.1)',
                      color: selectedVariants[v.name] === opt ? '#D203DD' : 'rgba(255,255,255,0.55)' }}>
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* Quantity */}
          {!outOfStock && (
            <div>
              <p style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.55)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Cantidad</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button onClick={() => setQuantity(q => Math.max(1, q - 1))}
                  style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                <span style={{ fontSize: 16, fontWeight: 700, color: '#fff', minWidth: 24, textAlign: 'center' }}>{quantity}</span>
                <button onClick={() => setQuantity(q => Math.min(item.stock, q + 1))}
                  style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
              </div>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 4 }}>
            <button onClick={addToCart} disabled={outOfStock}
              style={{ flex: 1, minWidth: 140, padding: '12px 20px', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: outOfStock ? 'not-allowed' : 'pointer', border: 'none',
                background: outOfStock ? 'rgba(255,255,255,0.06)' : 'linear-gradient(90deg, #FF2D95 0%, #B735B8 50%, #233B8F 100%)',
                color: outOfStock ? 'rgba(255,255,255,0.42)' : '#fff' }}>
              {outOfStock ? 'No disponible' : '🛒 Agregar al carrito'}
            </button>
            <Link href="/dashboard/store/cart"
              style={{ flex: 1, minWidth: 120, padding: '12px 20px', borderRadius: 10, fontWeight: 700, fontSize: 14, textAlign: 'center', textDecoration: 'none', border: '1px solid rgba(255,255,255,0.1)', color: '#FF096C', background: 'rgba(255,9,108,0.1)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              Ver carrito
            </Link>
          </div>
        </div>
      </div>
    </div>
  </div>
  )
}
