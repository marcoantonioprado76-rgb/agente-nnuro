'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface EventTicketType { id: string; name: string; price: number; isGuest?: boolean; available: number | null; soldOut: boolean }
interface EventItem { id: string; title: string; description: string; image?: string | null; date?: string | null; location?: string | null; ticketTypes: EventTicketType[] }

interface StoreItem {
  id: string
  title: string
  description: string
  category: string
  price: number
  images: string[]
  stock: number
  variants: { name: string; options: string[] }[]
}

function useCartCount() {
  const [count, setCount] = useState(0)
  useEffect(() => {
    const update = () => {
      try {
        const c = JSON.parse(localStorage.getItem('store_cart') ?? '[]')
        setCount(c.reduce((s: number, i: any) => s + (i.quantity ?? 1), 0))
      } catch { setCount(0) }
    }
    update()
    window.addEventListener('storage', update)
    window.addEventListener('cart_updated', update)
    return () => { window.removeEventListener('storage', update); window.removeEventListener('cart_updated', update) }
  }, [])
  return count
}

export default function StorePage() {
  const [items, setItems] = useState<StoreItem[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [activeCategory, setActiveCategory] = useState('Todas')
  const [loading, setLoading] = useState(true)
  const cartCount = useCartCount()

  // Events/tickets
  const [events, setEvents] = useState<EventItem[]>([])
  const [eventsLoading, setEventsLoading] = useState(true)

  // Quick-add modal
  const [quickItem, setQuickItem] = useState<StoreItem | null>(null)
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({})
  const [toast, setToast] = useState('')

  useEffect(() => {
    fetch('/api/store/items')
      .then(r => r.json())
      .then(d => { setItems(d.items ?? []); setCategories(d.categories ?? []); setLoading(false) })
      .catch(() => setLoading(false))

    fetch('/api/entradas/list')
      .then(r => r.json())
      .then(d => { setEvents(d.events ?? []); setEventsLoading(false) })
      .catch(() => setEventsLoading(false))
  }, [])

  const handleCategory = (cat: string) => {
    setActiveCategory(cat)
    const url = cat === 'Todas' ? '/api/store/items' : `/api/store/items?category=${encodeURIComponent(cat)}`
    fetch(url).then(r => r.json()).then(d => setItems(d.items ?? [])).catch(() => {})
  }

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  const addToCart = (item: StoreItem, variants: Record<string, string>) => {
    try {
      const cart = JSON.parse(localStorage.getItem('store_cart') ?? '[]')
      const key = JSON.stringify({ id: item.id, variants })
      const idx = cart.findIndex((c: any) => JSON.stringify({ id: c.itemId, variants: c.selectedVariants }) === key)
      if (idx >= 0) {
        cart[idx].quantity = Math.min(cart[idx].quantity + 1, item.stock)
      } else {
        cart.push({ itemId: item.id, title: item.title, price: item.price, image: item.images[0] ?? null, quantity: 1, selectedVariants: variants })
      }
      localStorage.setItem('store_cart', JSON.stringify(cart))
      window.dispatchEvent(new Event('cart_updated'))
      showToast('¡Agregado al carrito!')
    } catch {
      showToast('Error al agregar')
    }
  }

  const handleQuickAdd = (e: React.MouseEvent, item: StoreItem) => {
    e.preventDefault()
    e.stopPropagation()
    if (item.variants.length === 0) {
      addToCart(item, {})
    } else {
      setSelectedVariants({})
      setQuickItem(item)
    }
  }

  const confirmQuickAdd = () => {
    if (!quickItem) return
    for (const v of quickItem.variants) {
      if (!selectedVariants[v.name]) { showToast(`Selecciona ${v.name}`); return }
    }
    addToCart(quickItem, selectedVariants)
    setQuickItem(null)
  }

  return (
    <div className="dm-page font-ui">
    <div className="px-4 sm:px-6 lg:px-8 pt-8 pb-10 max-w-screen-xl mx-auto">
      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, background: toast.startsWith('¡') ? 'rgba(0,255,136,0.15)' : 'rgba(239,68,68,0.15)', border: `1px solid ${toast.startsWith('¡') ? 'rgba(0,255,136,0.3)' : 'rgba(239,68,68,0.3)'}`, color: toast.startsWith('¡') ? '#0a95a8' : '#ef4444', borderRadius: 10, padding: '10px 18px', fontSize: 13, fontWeight: 600 }}>
          {toast}
        </div>
      )}

      {/* ── Encabezado: EVENTOS es lo principal de esta sección ─────────────── */}
      <div className="mb-6 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-[#111827] uppercase tracking-widest">🎟 Eventos</h1>
          <div className="h-px w-24 mt-2 rounded-full" style={{ background: 'linear-gradient(90deg, #1fb8bb, #147e95, #233B8F, transparent)' }} />
          <p className="text-xs text-[#6B7280] mt-2">Conseguí tu entrada para los eventos presenciales de NÜRO.</p>
        </div>
        {/* El carrito/pedidos son de la TIENDA: solo se muestran si hay productos. */}
        {!loading && items.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Link href="/dashboard/store/my-orders" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#0a95a8', background: 'rgba(0,229,208,0.1)', border: '1px solid #E4E9F0', borderRadius: 8, padding: '7px 14px', textDecoration: 'none' }}>
              📦 Mis pedidos
            </Link>
            <Link href="/dashboard/store/cart" style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#111827', background: '#F0F3F7', border: '1px solid #E4E9F0', borderRadius: 8, padding: '7px 14px', textDecoration: 'none' }}>
              🛒 Carrito
              {cartCount > 0 && (
                <span style={{ position: 'absolute', top: -7, right: -7, background: '#0a95a8', color: '#fff', fontSize: 10, fontWeight: 800, borderRadius: 99, minWidth: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>
                  {cartCount}
                </span>
              )}
            </Link>
          </div>
        )}
      </div>

      {/* ── TIENDA (secundaria): solo si REALMENTE hay productos ───────────── */}
      {!loading && items.length > 0 && categories.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
          {['Todas', ...categories].map(cat => (
            <button key={cat} onClick={() => handleCategory(cat)}
              style={{ padding: '5px 14px', borderRadius: 99, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1px solid', background: 'transparent',
                borderColor: activeCategory === cat ? 'rgba(0,229,208,0.5)' : '#E4E9F0',
                color: activeCategory === cat ? '#00E5D0' : '#6B7280' }}>
              {cat}
            </button>
          ))}
        </div>
      )}

      {!loading && items.length > 0 && (
        <>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0 14px' }}>
          <h2 style={{ fontSize: 13, fontWeight: 900, color: '#111827', margin: 0, textTransform: 'uppercase', letterSpacing: '0.12em' }}>🛍 Tienda</h2>
          <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, rgba(0,229,208,0.35), transparent)' }} />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map(item => {
            const img = Array.isArray(item.images) && item.images.length > 0 ? item.images[0] : null
            const outOfStock = item.stock === 0
            return (
              <div key={item.id} style={{ borderRadius: 14, overflow: 'hidden', background: 'radial-gradient(120% 75% at 50% -10%, rgba(0,229,208,0.16), rgba(255,255,255,0) 60%), linear-gradient(180deg, #212e38 0%, #273842 60%, #1a262f 100%)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 18px 40px -24px rgba(8,22,36,0.6), inset 0 1px 0 rgba(255,255,255,0.05)', opacity: outOfStock ? 0.6 : 1, transition: 'border-color 0.2s', display: 'flex', flexDirection: 'column' }}>
                {/* Image — click goes to detail */}
                <Link href={`/dashboard/store/${item.id}`} style={{ textDecoration: 'none', display: 'block' }}>
                  <div style={{ aspectRatio: '1/1', background: 'rgba(0,229,208,0.04)', position: 'relative', overflow: 'hidden' }}>
                    {img ? (
                      <img src={img} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    ) : (
                      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg className="w-10 h-10 opacity-20" viewBox="0 0 24 24" fill="none" stroke="#00E5D0" strokeWidth="1"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z" /></svg>
                      </div>
                    )}
                    {outOfStock && (
                      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.78)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>No disponible</span>
                      </div>
                    )}
                    <span style={{ position: 'absolute', top: 8, left: 8, fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.78)', background: 'rgba(0,0,0,0.4)', borderRadius: 6, padding: '2px 7px' }}>
                      {item.category}
                    </span>
                  </div>
                </Link>

                {/* Info + buttons */}
                <div style={{ padding: '8px 10px 10px', display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                  <div>
                    <p style={{ fontWeight: 700, color: '#fff', marginBottom: 2, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} className="text-[11px] sm:text-sm">{item.title}</p>
                    <span style={{ fontWeight: 800, color: '#35d0c8' }} className="text-[11px] sm:text-sm">{item.price.toFixed(2)} USDT</span>
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: 'flex', gap: 5, marginTop: 'auto' }}>
                    <Link href={`/dashboard/store/${item.id}`}
                      style={{ flex: 1, padding: '5px 0', borderRadius: 7, fontSize: 11, fontWeight: 600, textAlign: 'center', textDecoration: 'none', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.55)', background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      Ver
                    </Link>
                    <button
                      onClick={e => handleQuickAdd(e, item)}
                      disabled={outOfStock}
                      style={{ flex: 2, padding: '5px 0', borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: outOfStock ? 'not-allowed' : 'pointer', border: 'none', background: outOfStock ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, #1fb8bb 0%, #147e95 52%, #12303a 100%)', color: outOfStock ? 'rgba(255,255,255,0.42)' : '#fff' }}>
                      {outOfStock ? 'Agotado' : '🛒 Agregar'}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        </>
      )}

      {/* ── EVENTOS: el contenido principal de esta pantalla ─────────────── */}
      <div style={{ marginTop: (!loading && items.length > 0) ? 34 : 0 }}>
        {(!loading && items.length > 0) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <h2 style={{ fontSize: 13, fontWeight: 900, color: '#111827', margin: 0, textTransform: 'uppercase', letterSpacing: '0.12em' }}>🎟 Entradas</h2>
            <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, rgba(0,229,208,0.4), transparent)' }} />
          </div>
        )}
        <div>
          {eventsLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
              <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#00E5D0', borderTopColor: 'transparent' }} />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.map(ev => {
                // ── Datos reales del evento ──────────────────────────────────
                const allSoldOut = ev.ticketTypes.every(t => t.soldOut)
                // "Desde" = la entrada PAGA más barata disponible. Las de INVITADO son
                // gratis ($0) y no deben marcar el precio del evento (decía "Desde $0.00").
                const paid = ev.ticketTypes.filter(t => !t.isGuest && t.price > 0)
                const paidOnSale = paid.filter(t => !t.soldOut)
                const priceable = paidOnSale.length ? paidOnSale : paid
                const minPrice = priceable.length
                  ? priceable.reduce((min, t) => Math.min(min, t.price), Number.POSITIVE_INFINITY)
                  : 0 // el evento es 100% de invitados → es gratis
                const isFreeEvent = priceable.length === 0
                const hasGuest = ev.ticketTypes.some(t => t.isGuest)
                const multiType = priceable.length > 1
                // Cupos: solo si al menos un tipo tiene capacidad definida.
                const hasCapacity = ev.ticketTypes.some(t => t.available != null)
                const left = ev.ticketTypes.reduce((n, t) => n + (t.available ?? 0), 0)

                // "jue 30 jul · 11:00" (hora de Bolivia)
                const fmt = (d: string) => {
                  const dt = new Date(d)
                  const day = dt.toLocaleDateString('es-BO', { weekday: 'short', day: '2-digit', month: 'short', timeZone: 'America/La_Paz' })
                  const hour = dt.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/La_Paz' })
                  return `${day.replace('.', '')} · ${hour}`
                }

                const NOTCH = 22
                const PAD = 1.5

                return (
                  <Link key={ev.id} href={`/entradas/${ev.id}`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                    {/* Borde con degradado de marca + glow */}
                    <div
                      className="group"
                      style={{
                        position: 'relative', borderRadius: 24, padding: PAD,
                        background: 'linear-gradient(160deg, #1fb8bb 0%, #147e95 45%, #233B8F 100%)',
                        boxShadow: allSoldOut ? '0 10px 24px -16px rgba(8,22,36,0.5)' : '0 26px 50px -22px rgba(0,229,208,0.55)',
                        opacity: allSoldOut ? 0.55 : 1,
                        transition: 'transform .22s ease, box-shadow .22s ease',
                      }}
                      onMouseEnter={e => { if (!allSoldOut) { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.boxShadow = '0 34px 60px -20px rgba(0,229,208,0.7)' } }}
                      onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = allSoldOut ? '0 10px 24px -16px rgba(8,22,36,0.5)' : '0 26px 50px -22px rgba(0,229,208,0.55)' }}
                    >
                      {/* ── FLYER: en su PROPORCIÓN NATURAL ───────────────────────
                          El alto es automático (height:auto), así el flyer llena el
                          ancho exacto: no se recorta NADA y no queda ningún espacio
                          sobrante alrededor. La tarjeta toma la altura del flyer.
                          Abajo se funde con un degradado hacia el cuerpo del ticket. */}
                      <div style={{ position: 'relative', overflow: 'hidden', borderRadius: '22.5px 22.5px 0 0', background: '#1a262f', lineHeight: 0 }}>
                        {ev.image ? (
                          <img
                            src={ev.image}
                            alt={ev.title}
                            style={{ width: '100%', height: 'auto', display: 'block' }}
                          />
                        ) : (
                          <div style={{ width: '100%', aspectRatio: '4/3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 46 }}>🎟️</div>
                        )}

                        {/* Degradado inferior: funde el flyer con el cuerpo del ticket */}
                        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 72, background: 'linear-gradient(180deg, rgba(26,38,47,0) 0%, rgba(26,38,47,0.75) 60%, #1a262f 100%)', pointerEvents: 'none' }} />

                        {/* Chip PRESENCIAL (NO es virtual) */}
                        <span style={{ position: 'absolute', top: 12, right: 12, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 11px', borderRadius: 999, background: 'rgba(9,15,22,0.68)', border: '1px solid rgba(0,229,208,0.55)', backdropFilter: 'blur(6px)', color: '#35d0c8', fontSize: 10, fontWeight: 900, letterSpacing: '0.09em' }}>
                          📍 PRESENCIAL
                        </span>

                        {allSoldOut && (
                          <span style={{ position: 'absolute', top: 12, left: 12, padding: '6px 11px', borderRadius: 999, background: 'rgba(9,15,22,0.78)', border: '1px solid rgba(248,113,113,0.6)', color: '#fca5a5', fontSize: 10, fontWeight: 900, letterSpacing: '0.09em' }}>
                            AGOTADO
                          </span>
                        )}
                      </div>

                      {/* ── Cuerpo del ticket (debajo del flyer) ────────────────── */}
                      <div style={{ position: 'relative', borderRadius: '0 0 22.5px 22.5px', background: 'linear-gradient(180deg, #1a262f 0%, #1a262f 58%, #0f1720 100%)' }}>

                        {/* Muescas laterales: se ubican solas en la unión flyer/cuerpo */}
                        <div style={{ position: 'absolute', top: -NOTCH / 2, left: -NOTCH / 2 - PAD, width: NOTCH, height: NOTCH, borderRadius: '50%', background: '#EEF2F7', pointerEvents: 'none', zIndex: 2 }} />
                        <div style={{ position: 'absolute', top: -NOTCH / 2, right: -NOTCH / 2 - PAD, width: NOTCH, height: NOTCH, borderRadius: '50%', background: '#EEF2F7', pointerEvents: 'none', zIndex: 2 }} />

                        {/* Perforación del ticket */}
                        <div style={{ height: 1, margin: '0 18px', background: 'repeating-linear-gradient(90deg, rgba(255,255,255,0.28) 0 6px, transparent 6px 12px)' }} />

                        {/* Contenido */}
                        <div style={{ padding: '18px 18px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                          <div>
                            <p style={{ fontWeight: 900, color: '#fff', fontSize: 20, margin: 0, lineHeight: 1.2, letterSpacing: '-0.01em' }}>{ev.title}</p>
                            {ev.location && (
                              <p style={{ fontSize: 12.5, color: '#35d0c8', fontWeight: 700, margin: '4px 0 0', textTransform: 'capitalize' }}>{ev.location}</p>
                            )}
                          </div>

                          {/* Fecha */}
                          {ev.date && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.10)' }}>
                              <span style={{ fontSize: 15 }}>🗓️</span>
                              <span style={{ fontSize: 13.5, color: '#fff', fontWeight: 700, textTransform: 'capitalize' }}>{fmt(ev.date)}</span>
                            </div>
                          )}

                          {/* Precio */}
                          <div style={{ borderRadius: 14, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)', padding: '12px 14px' }}>
                            <p style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.55)', margin: 0, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                              {isFreeEvent ? 'Entrada' : multiType ? 'Desde' : 'Precio'}
                            </p>
                            <p style={{ fontSize: 26, fontWeight: 900, color: '#fff', margin: '2px 0 0', lineHeight: 1.1 }}>
                              {isFreeEvent
                                ? <>GRATIS</>
                                : <>${minPrice.toFixed(2)} <span style={{ fontSize: 12, fontWeight: 800, color: 'rgba(255,255,255,0.55)' }}>USDT</span></>}
                            </p>
                            {/* Si además hay entradas de invitado, lo avisamos. */}
                            {!isFreeEvent && hasGuest && (
                              <p style={{ fontSize: 11, margin: '4px 0 0', fontWeight: 800, color: '#35d0c8' }}>✦ También hay entradas de invitado (gratis)</p>
                            )}
                            {!allSoldOut && hasCapacity && left > 0 && (
                              <p style={{ fontSize: 11.5, margin: '6px 0 0', fontWeight: 800, color: left <= 10 ? '#FDBA74' : 'rgba(255,255,255,0.55)' }}>
                                {left <= 10 ? `🔥 ¡Solo quedan ${left}!` : `Quedan ${left} entradas`}
                              </p>
                            )}
                          </div>

                          {/* Botón */}
                          <div style={{
                            padding: '14px 0', borderRadius: 999, textAlign: 'center', fontSize: 14.5, fontWeight: 900, letterSpacing: '0.01em',
                            background: allSoldOut ? 'rgba(255,255,255,0.07)' : 'linear-gradient(135deg, #1fb8bb 0%, #147e95 52%, #12303a 100%)',
                            color: allSoldOut ? 'rgba(255,255,255,0.45)' : '#fff',
                            boxShadow: allSoldOut ? 'none' : '0 12px 28px -10px rgba(0,229,208,0.55)',
                          }}>
                            {allSoldOut ? 'Agotado' : '🎟️  Comprar entrada'}
                          </div>

                          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.40)', margin: 0, textAlign: 'center', fontWeight: 600 }}>
                            🔒 Compra segura
                          </p>
                        </div>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}

          {/* Sin eventos: estado vacío claro (nada de "no hay productos") */}
          {!eventsLoading && events.length === 0 && (
            <div style={{ textAlign: 'center', padding: '56px 20px', borderRadius: 16, border: '1px dashed #E4E9F0', background: '#fff' }}>
              <p style={{ fontSize: 40, margin: 0 }}>🎟️</p>
              <p style={{ fontSize: 15, fontWeight: 800, color: '#111827', margin: '10px 0 4px' }}>Todavía no hay eventos</p>
              <p style={{ fontSize: 13, color: '#6B7280', margin: 0 }}>Cuando publiquemos un evento, vas a poder comprar tu entrada acá.</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick-add variant modal */}
      {quickItem && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(5,11,20,0.55)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => setQuickItem(null)}>
          <div style={{ background: 'radial-gradient(120% 80% at 50% -10%, rgba(0,229,208,0.16), rgba(255,255,255,0) 58%), linear-gradient(180deg, #212e38 0%, #273842 60%, #1a262f 100%)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 30px 60px -24px rgba(8,22,36,0.7), inset 0 1px 0 rgba(255,255,255,0.05)', borderRadius: 18, width: '100%', maxWidth: 360, padding: 24 }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', gap: 14, marginBottom: 18 }}>
              {quickItem.images[0] && (
                <div style={{ width: 64, height: 64, borderRadius: 10, overflow: 'hidden', flexShrink: 0 }}>
                  <img src={quickItem.images[0]} alt={quickItem.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              )}
              <div>
                <p style={{ fontWeight: 700, color: '#fff', fontSize: 14, lineHeight: 1.3 }}>{quickItem.title}</p>
                <p style={{ fontWeight: 800, color: '#35d0c8', fontSize: 15, marginTop: 4 }}>{quickItem.price.toFixed(2)} USDT</p>
              </div>
            </div>

            {quickItem.variants.map(v => (
              <div key={v.name} style={{ marginBottom: 14 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{v.name}</p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {v.options.map(opt => (
                    <button key={opt} onClick={() => setSelectedVariants(p => ({ ...p, [v.name]: opt }))}
                      style={{ padding: '6px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: '1px solid', background: 'transparent',
                        borderColor: selectedVariants[v.name] === opt ? '#00E5D0' : 'rgba(255,255,255,0.1)',
                        color: selectedVariants[v.name] === opt ? '#00E5D0' : 'rgba(255,255,255,0.55)' }}>
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
              <button onClick={() => setQuickItem(null)}
                style={{ flex: 1, padding: '10px 0', borderRadius: 9, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'rgba(255,255,255,0.55)', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                Cancelar
              </button>
              <button onClick={confirmQuickAdd}
                style={{ flex: 2, padding: '10px 0', borderRadius: 9, border: 'none', background: 'linear-gradient(135deg, #1fb8bb 0%, #147e95 52%, #12303a 100%)', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
                🛒 Agregar al carrito
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  )
}
