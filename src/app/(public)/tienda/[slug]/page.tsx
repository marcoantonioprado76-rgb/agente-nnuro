'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Store, ShoppingCart, Minus, Plus, Loader2, Package,
  ArrowLeft, Check, MapPin, Phone, User, CreditCard,
  X, Navigation, Link2, ExternalLink, Star, Truck,
  Shield, Clock, Flame, Sparkles, ChevronRight,
  Zap, BadgeCheck,
} from 'lucide-react'

/* ============================================================
   CONSTANTS
   ============================================================ */
const SPACING_CSS: Record<string, string> = {
  normal: 'normal', wide: '0.05em', wider: '0.1em', ultra: '0.2em',
}

const DEFAULT_BG = '#0F172A'

const currencySymbol: Record<string, string> = {
  USD: '$', MXN: '$', COP: '$', ARS: '$', CLP: '$', PEN: 'S/',
  BOB: 'Bs', VES: 'Bs.S', EUR: '€',
}

const TRUST_BADGES = [
  { icon: Truck, label: 'Entrega Rapida', sub: 'A tu puerta' },
  { icon: Shield, label: 'Compra Segura', sub: '100% protegida' },
  { icon: BadgeCheck, label: 'Calidad Premium', sub: 'Garantizado' },
]

/* ============================================================
   INTERFACES
   ============================================================ */
interface StoreData {
  id: string
  name: string
  slug: string
  whatsapp_number?: string
  payment_qr_url?: string
  font_family?: string | null
  font_weight?: string | null
  font_spacing?: string | null
  font_style?: string | null
  background_type?: string | null
  background_value?: string | null
}

interface StoreProductPublic {
  id: string
  name: string
  category: string
  currency: string
  price: number
  stock: number
  description?: string
  store_product_images?: Array<{ id: string; image_url: string; sort_order: number }>
}

interface CartItem {
  product: StoreProductPublic
  quantity: number
}

interface CustomerForm {
  name: string
  phone: string
  city: string
  address: string
  reference: string
  payment_method: 'whatsapp' | 'transfer' | 'cash'
  latitude: number | null
  longitude: number | null
  google_maps_url: string
}

type CheckoutStep = 'cart' | 'form' | 'confirm'

const emptyCustomer: CustomerForm = {
  name: '', phone: '', city: '', address: '', reference: '', payment_method: 'whatsapp',
  latitude: null, longitude: null, google_maps_url: '',
}

/* ============================================================
   GOOGLE FONTS
   ============================================================ */
const loadedFonts = new Set<string>()
function loadGoogleFont(family: string | null | undefined) {
  if (!family || loadedFonts.has(family)) return
  loadedFonts.add(family)
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = `https://fonts.googleapis.com/css2?family=${family.replace(/\s+/g, '+')}:wght@400;500;600;700;800;900&display=swap`
  document.head.appendChild(link)
}

/* ============================================================
   COLOR UTILITIES
   ============================================================ */
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [parseInt(h.substring(0, 2), 16) || 15, parseInt(h.substring(2, 4), 16) || 23, parseInt(h.substring(4, 6), 16) || 42]
}

function adjustBrightness(hex: string, amount: number): string {
  if (!hex?.startsWith('#')) return hex || DEFAULT_BG
  const [r, g, b] = hexToRgb(hex)
  const clamp = (v: number) => Math.min(255, Math.max(0, v + amount))
  return `#${[clamp(r), clamp(g), clamp(b)].map(v => v.toString(16).padStart(2, '0')).join('')}`
}

function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255
}

/* Accent color — always high contrast against the store bg */
function getAccentColor(bgHex: string): string {
  const lum = luminance(bgHex)
  if (lum > 0.5) return '#0F172A' // dark accent for light bg
  return '#22d3ee' // cyan for dark bg
}

/* ============================================================
   MAIN COMPONENT
   ============================================================ */
export default function PublicStorePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = React.use(params)
  const [store, setStore] = useState<StoreData | null>(null)
  const [products, setProducts] = useState<StoreProductPublic[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [activeCategory, setActiveCategory] = useState('TODOS')
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [cart, setCart] = useState<CartItem[]>([])
  const [showCart, setShowCart] = useState(false)
  const [checkoutStep, setCheckoutStep] = useState<CheckoutStep>('cart')
  const [customer, setCustomer] = useState<CustomerForm>(emptyCustomer)
  const [submitting, setSubmitting] = useState(false)
  const [orderId, setOrderId] = useState<string | null>(null)
  const [geoLoading, setGeoLoading] = useState(false)
  const [geoError, setGeoError] = useState('')
  const [locationMode, setLocationMode] = useState<'auto' | 'manual' | null>(null)
  const [addedProductId, setAddedProductId] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const fontLoaded = useRef(false)
  const productsRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/stores/public/${slug}`, { cache: 'no-store' })
        if (res.ok) {
          const data = await res.json()
          setStore(data.store)
          setProducts(data.products)
        } else setNotFound(true)
      } catch { setNotFound(true) }
      finally { setLoading(false) }
    }
    load()
  }, [slug])

  useEffect(() => {
    if (store?.font_family && !fontLoaded.current) {
      loadGoogleFont(store.font_family)
      fontLoaded.current = true
    }
  }, [store?.font_family])

  /* ── Theme ── */
  const bgValue = store?.background_value || DEFAULT_BG
  const bgType = store?.background_type || 'solid'
  const isGradient = bgType === 'gradient'
  const bgStyle = isGradient ? { background: bgValue } : { backgroundColor: bgValue }
  const baseBgHex = isGradient ? DEFAULT_BG : bgValue
  const accent = getAccentColor(baseBgHex)
  const isDark = luminance(baseBgHex) < 0.5

  const fontFamily = store?.font_family ? `'${store.font_family}', sans-serif` : 'Inter, system-ui, sans-serif'
  const fontWeight = Number(store?.font_weight || '700')
  const letterSpacing = SPACING_CSS[store?.font_spacing || 'normal'] || 'normal'
  const textTransform = (store?.font_style === 'uppercase' ? 'uppercase' : 'none') as React.CSSProperties['textTransform']

  const surface = isGradient ? 'rgba(255,255,255,0.06)' : adjustBrightness(baseBgHex, isDark ? 12 : -8)
  const surfaceDeep = isGradient ? 'rgba(0,0,0,0.3)' : adjustBrightness(baseBgHex, isDark ? -5 : 5)
  const border = isGradient ? 'rgba(255,255,255,0.08)' : adjustBrightness(baseBgHex, isDark ? 22 : -15)
  const textPrimary = isDark ? '#ffffff' : '#0F172A'
  const textSecondary = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(15,23,42,0.6)'
  const textMuted = isDark ? 'rgba(255,255,255,0.35)' : 'rgba(15,23,42,0.4)'
  const glowColor = isDark ? `${accent}22` : `${accent}15`

  /* ── Cart logic ── */
  const categories = ['TODOS', ...Array.from(new Set(products.map(p => p.category.toUpperCase())))]
  const filtered = activeCategory === 'TODOS' ? products : products.filter(p => p.category.toUpperCase() === activeCategory)
  const getQty = (id: string) => quantities[id] || 1
  const setQty = (id: string, val: number) => { if (val < 1) val = 1; setQuantities(prev => ({ ...prev, [id]: val })) }

  const addToCart = useCallback((product: StoreProductPublic) => {
    const qty = quantities[product.id] || 1
    setCart(prev => {
      const existing = prev.find(c => c.product.id === product.id)
      if (existing) return prev.map(c => c.product.id === product.id ? { ...c, quantity: c.quantity + qty } : c)
      return [...prev, { product, quantity: qty }]
    })
    setQuantities(prev => ({ ...prev, [product.id]: 1 }))
    setAddedProductId(product.id)
    toast.success('Agregado al carrito', { duration: 1500 })
    setTimeout(() => setAddedProductId(null), 800)
  }, [quantities])

  const updateCartQty = (productId: string, qty: number) => {
    if (qty < 1) setCart(prev => prev.filter(c => c.product.id !== productId))
    else setCart(prev => prev.map(c => c.product.id === productId ? { ...c, quantity: qty } : c))
  }

  const cartTotal = cart.reduce((s, c) => s + c.product.price * c.quantity, 0)
  const cartCount = cart.reduce((s, c) => s + c.quantity, 0)
  const mainCurrency = cart[0]?.product.currency || products[0]?.currency || 'USD'
  const sym = currencySymbol[mainCurrency] || '$'

  const scrollToProducts = () => productsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  /* ── Checkout handlers ── */
  const handleSubmitOrder = async () => {
    if (!customer.name.trim()) return toast.error('Ingresa tu nombre')
    if (!customer.phone.trim()) return toast.error('Ingresa tu telefono')
    if (!customer.city.trim()) return toast.error('Ingresa tu ciudad')
    if (!customer.address.trim()) return toast.error('Ingresa tu direccion')
    setSubmitting(true)
    try {
      const res = await fetch(`/api/stores/public/${slug}/orders`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          products: cart.map(c => ({ id: c.product.id, name: c.product.name, quantity: c.quantity, price: c.product.price })),
          total: cartTotal, currency: mainCurrency,
          customer_name: customer.name.trim(), customer_phone: customer.phone.trim(),
          city: customer.city.trim(), address: customer.address.trim(), reference: customer.reference.trim(),
          payment_method: customer.payment_method, latitude: customer.latitude, longitude: customer.longitude,
          google_maps_url: customer.google_maps_url || undefined,
        }),
      })
      if (res.ok) { const data = await res.json(); setOrderId(data.order?.id); setCheckoutStep('confirm') }
      else toast.error('Error al registrar el pedido')
    } catch { toast.error('Error de conexion') }
    finally { setSubmitting(false) }
  }

  const sendWhatsApp = () => {
    if (!store?.whatsapp_number || cart.length === 0) return
    const lines = cart.map(i => `- ${i.product.name} x${i.quantity} = ${currencySymbol[i.product.currency] || '$'}${(i.product.price * i.quantity).toLocaleString()} ${i.product.currency}`)
    const payLabels: Record<string, string> = { whatsapp: 'WhatsApp', transfer: 'Transferencia', cash: 'Contra entrega' }
    const msg = encodeURIComponent(
      `Hola, quiero realizar el siguiente pedido:\n\n*Tienda: ${store.name}*\n\n*Productos:*\n${lines.join('\n')}\n\n*Total: ${sym}${cartTotal.toLocaleString()} ${mainCurrency}*\n\n*Datos:*\nNombre: ${customer.name}\nTelefono: ${customer.phone}\nCiudad: ${customer.city}\nDireccion: ${customer.address}\n${customer.reference ? `Referencia: ${customer.reference}\n` : ''}${customer.google_maps_url ? `\nUbicacion:\n${customer.google_maps_url}\n` : ''}\nPago: ${payLabels[customer.payment_method] || customer.payment_method}${orderId ? `\n\nPedido #${orderId.substring(0, 8)}` : ''}`
    )
    window.open(`https://wa.me/${store.whatsapp_number.replace(/[^0-9]/g, '')}?text=${msg}`, '_blank')
    setCart([]); setCustomer(emptyCustomer); setCheckoutStep('cart'); setShowCart(false); setOrderId(null)
  }

  const closeCheckout = () => {
    if (checkoutStep === 'confirm') { setCart([]); setCustomer(emptyCustomer); setOrderId(null) }
    setCheckoutStep('cart'); setShowCart(false)
  }

  const handleGetLocation = () => {
    if (!navigator.geolocation) { setGeoError('Tu navegador no soporta geolocalizacion'); return }
    setGeoLoading(true); setGeoError('')
    navigator.geolocation.getCurrentPosition(
      (pos) => { const { latitude, longitude } = pos.coords; setCustomer(prev => ({ ...prev, latitude, longitude, google_maps_url: `https://www.google.com/maps?q=${latitude},${longitude}` })); setLocationMode('auto'); setGeoLoading(false) },
      (err) => { setGeoError({ 1: 'Permiso denegado', 2: 'No disponible', 3: 'Tiempo agotado' }[err.code] || 'Error'); setGeoLoading(false) },
      { enableHighAccuracy: true, timeout: 15000 }
    )
  }

  /* ── CSS injection for animations ── */
  useEffect(() => {
    if (typeof document === 'undefined') return
    if (document.getElementById('store-premium-css')) return
    const style = document.createElement('style')
    style.id = 'store-premium-css'
    style.textContent = `
      @keyframes fadeInUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      @keyframes slideUp { from { opacity: 0; transform: translateY(40px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
      @keyframes pulse-glow { 0%, 100% { box-shadow: 0 0 20px rgba(34,211,238,0.15); } 50% { box-shadow: 0 0 35px rgba(34,211,238,0.3); } }
      @keyframes cart-bounce { 0% { transform: scale(1); } 50% { transform: scale(1.25); } 100% { transform: scale(1); } }
      @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
      .anim-fade-up { animation: fadeInUp 0.6s ease-out both; }
      .anim-fade { animation: fadeIn 0.5s ease-out both; }
      .anim-slide-up { animation: slideUp 0.5s cubic-bezier(0.22, 1, 0.36, 1) both; }
      .anim-bounce { animation: cart-bounce 0.4s ease; }
      .anim-float { animation: float 3s ease-in-out infinite; }
      .product-card { transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.3s ease; }
      .product-card:hover { transform: translateY(-4px); }
      .scrollbar-hide::-webkit-scrollbar { display: none; }
      .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
    `
    document.head.appendChild(style)
  }, [])

  /* ── LOADING ── */
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={bgStyle}>
      <div className="flex flex-col items-center gap-4 anim-fade">
        <div className="relative"><div className="w-14 h-14 rounded-full border-2 animate-spin" style={{ borderColor: `${accent}30`, borderTopColor: accent }} /><Store className="absolute inset-0 m-auto h-5 w-5" style={{ color: accent }} /></div>
        <p className="text-sm" style={{ color: textSecondary }}>Cargando tienda...</p>
      </div>
    </div>
  )

  /* ── NOT FOUND ── */
  if (notFound || !store) return (
    <div className="min-h-screen flex items-center justify-center text-center px-4" style={{ backgroundColor: DEFAULT_BG }}>
      <div className="space-y-4 anim-fade-up">
        <Store className="h-14 w-14 text-gray-600 mx-auto" />
        <h1 className="text-2xl font-bold text-white">Tienda no encontrada</h1>
        <p className="text-gray-400 text-sm">Esta tienda no existe o no esta disponible.</p>
      </div>
    </div>
  )

  const productCount = products.length

  /* ============================================================
     RENDER
     ============================================================ */
  return (
    <div className="min-h-screen" style={bgStyle}>

      {/* ═══════════════ FLOATING NAVBAR ═══════════════ */}
      <nav
        className="sticky top-0 z-50 backdrop-blur-xl"
        style={{ backgroundColor: isGradient ? 'rgba(0,0,0,0.55)' : `${baseBgHex}dd`, borderBottom: `1px solid ${border}` }}
      >
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${accent}20` }}>
              <Store className="h-4 w-4" style={{ color: accent }} />
            </div>
            <span className="text-sm font-semibold" style={{ color: textPrimary, fontFamily }}>{store.name}</span>
          </div>
          <button
            onClick={() => { setCheckoutStep('cart'); setShowCart(true) }}
            className={`relative flex h-10 w-10 items-center justify-center rounded-xl transition-all active:scale-90 ${cartCount > 0 ? 'anim-bounce' : ''}`}
            style={{ backgroundColor: cartCount > 0 ? `${accent}20` : 'transparent' }}
            key={cartCount}
          >
            <ShoppingCart className="h-[18px] w-[18px]" style={{ color: cartCount > 0 ? accent : textSecondary }} />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full text-[10px] font-bold flex items-center justify-center text-black" style={{ backgroundColor: accent }}>
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </nav>

      {/* ═══════════════ HERO SECTION ═══════════════ */}
      {/* Mobile: compact hero to show products faster */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full opacity-20 blur-3xl" style={{ backgroundColor: accent }} />
        </div>

        <div className="relative max-w-5xl mx-auto px-4 pt-6 pb-4 sm:pt-16 sm:pb-14">
          {/* Badge + Title row on mobile */}
          <div
            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full text-[10px] sm:text-[11px] font-semibold tracking-wide uppercase mb-2 sm:mb-5 anim-fade-up"
            style={{ backgroundColor: `${accent}15`, color: accent, animationDelay: '0.1s' }}
          >
            <Sparkles className="h-3 w-3" />
            Tienda Oficial
          </div>

          <h1
            className="text-2xl sm:text-4xl md:text-5xl leading-tight mb-1.5 sm:mb-3 anim-fade-up"
            style={{ fontFamily, fontWeight, letterSpacing, textTransform, color: textPrimary, animationDelay: '0.2s' }}
          >
            {store.name}
          </h1>

          {/* Mobile: inline stats + subtitle compact */}
          <div className="flex items-center gap-3 mb-3 sm:mb-7 anim-fade-up" style={{ animationDelay: '0.3s' }}>
            {productCount > 0 && (
              <>
                <div className="flex items-center gap-1">
                  <div className="flex -space-x-0.5">
                    {[0,1,2,3,4].map(i => <Star key={i} className="h-3 w-3 sm:h-3.5 sm:w-3.5 fill-current" style={{ color: '#facc15' }} />)}
                  </div>
                  <span className="text-[11px] sm:text-xs font-semibold" style={{ color: textPrimary }}>4.9</span>
                </div>
                <span className="text-[11px] sm:text-xs" style={{ color: textMuted }}>{productCount} productos</span>
                <span className="text-[11px] sm:text-xs flex items-center gap-1" style={{ color: textSecondary }}>
                  <Zap className="h-3 w-3" style={{ color: '#22c55e' }} /> Envio
                </span>
              </>
            )}
            {!productCount && <p className="text-sm" style={{ color: textSecondary }}>Proximamente nuevos productos</p>}
          </div>

          {/* CTA - hidden on mobile (products are right below) */}
          {productCount > 0 && (
            <div className="hidden sm:flex flex-wrap gap-3 anim-fade-up" style={{ animationDelay: '0.4s' }}>
              <button
                onClick={scrollToProducts}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all active:scale-95 hover:scale-[1.02]"
                style={{ backgroundColor: accent, color: isDark ? '#000' : '#fff', boxShadow: `0 4px 20px ${glowColor}` }}
              >
                <Flame className="h-4 w-4" />
                Ver Productos
                <ChevronRight className="h-4 w-4" />
              </button>
              {store.whatsapp_number && (
                <a
                  href={`https://wa.me/${store.whatsapp_number.replace(/[^0-9]/g, '')}`}
                  target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-all active:scale-95 border"
                  style={{ borderColor: border, color: textPrimary, backgroundColor: surface }}
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  Consultar
                </a>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ═══════════════ TRUST BADGES ═══════════════ */}
      {/* Mobile: compact horizontal strip. Desktop: grid cards */}
      {productCount > 0 && (
        <section className="anim-fade" style={{ animationDelay: '0.4s' }}>
          {/* Mobile: single row strip */}
          <div className="sm:hidden max-w-5xl mx-auto px-4 pb-3">
            <div className="flex items-center justify-between gap-2 rounded-xl px-3 py-2.5" style={{ backgroundColor: surface, border: `1px solid ${border}` }}>
              {TRUST_BADGES.map((badge, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <badge.icon className="h-3.5 w-3.5 shrink-0" style={{ color: accent }} />
                  <span className="text-[10px] font-semibold" style={{ color: textPrimary }}>{badge.label}</span>
                </div>
              ))}
            </div>
          </div>
          {/* Desktop: card grid */}
          <div className="hidden sm:block py-6">
            <div className="max-w-5xl mx-auto px-4">
              <div className="grid grid-cols-3 gap-3">
                {TRUST_BADGES.map((badge, i) => (
                  <div
                    key={i}
                    className="flex flex-col items-center text-center gap-2 px-3 py-4 rounded-2xl transition-colors"
                    style={{ backgroundColor: surface, border: `1px solid ${border}` }}
                  >
                    <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${accent}15` }}>
                      <badge.icon className="h-5 w-5" style={{ color: accent }} />
                    </div>
                    <div>
                      <p className="text-xs font-bold" style={{ color: textPrimary }}>{badge.label}</p>
                      <p className="text-[10px] mt-0.5" style={{ color: textMuted }}>{badge.sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════ CATEGORIES ═══════════════ */}
      {categories.length > 2 && (
        <div className="max-w-5xl mx-auto px-4 mb-4">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className="px-4 py-2 rounded-full text-xs font-bold uppercase whitespace-nowrap transition-all active:scale-95"
                style={activeCategory === cat
                  ? { backgroundColor: accent, color: isDark ? '#000' : '#fff' }
                  : { backgroundColor: surface, color: textSecondary, border: `1px solid ${border}` }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════════ PRODUCTS ═══════════════ */}
      <section ref={productsRef} className="max-w-5xl mx-auto px-4 pb-8" style={{ scrollMarginTop: '70px' }}>
        {/* Section title */}
        <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-5 anim-fade-up" style={{ animationDelay: '0.5s' }}>
          <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${accent}15` }}>
            <Package className="h-3.5 w-3.5 sm:h-4 sm:w-4" style={{ color: accent }} />
          </div>
          <h2 className="text-base sm:text-lg font-bold" style={{ color: textPrimary, fontFamily }}>
            {activeCategory === 'TODOS' ? 'Productos' : activeCategory}
          </h2>
          <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: surface, color: textSecondary }}>
            {filtered.length}
          </span>
        </div>

        {filtered.length === 0 ? (
          <div className="py-20 text-center anim-fade">
            <Package className="h-14 w-14 mx-auto mb-4 anim-float" style={{ color: textMuted }} />
            <p style={{ color: textSecondary }}>No hay productos disponibles.</p>
          </div>
        ) : (
          <div className="grid gap-2.5 sm:gap-4 grid-cols-2 lg:grid-cols-3">
            {filtered.map((product, idx) => {
              const mainImage = (product.store_product_images || []).sort((a, b) => a.sort_order - b.sort_order)[0]?.image_url
              const pSym = currencySymbol[product.currency] || '$'
              const qty = getQty(product.id)
              const isAdded = addedProductId === product.id
              const isFirst = idx === 0

              return (
                <div
                  key={product.id}
                  className="product-card rounded-xl sm:rounded-2xl overflow-hidden anim-fade-up"
                  style={{
                    backgroundColor: surface,
                    border: `1px solid ${border}`,
                    boxShadow: `0 2px 20px ${isGradient ? 'rgba(0,0,0,0.2)' : `${baseBgHex}40`}`,
                    animationDelay: `${0.05 * idx}s`,
                  }}
                >
                  {/* Image */}
                  <div className="relative aspect-square sm:aspect-[4/3] overflow-hidden" style={{ backgroundColor: surfaceDeep }}>
                    {mainImage ? (
                      <img src={mainImage} alt={product.name} className="w-full h-full object-cover transition-transform duration-500 hover:scale-105" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><Package className="h-10 w-10 sm:h-12 sm:w-12" style={{ color: textMuted }} /></div>
                    )}

                    {/* Badges */}
                    <div className="absolute top-1.5 left-1.5 sm:top-3 sm:left-3 flex gap-1">
                      {isFirst && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[8px] sm:text-[10px] font-bold uppercase backdrop-blur-md" style={{ backgroundColor: 'rgba(239,68,68,0.9)', color: '#fff' }}>
                          <Flame className="h-2.5 w-2.5 sm:h-3 sm:w-3" /> Top
                        </span>
                      )}
                      {product.stock <= 5 && product.stock > 0 && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[8px] sm:text-[10px] font-bold uppercase backdrop-blur-md" style={{ backgroundColor: 'rgba(245,158,11,0.9)', color: '#fff' }}>
                          <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3" /> {product.stock}
                        </span>
                      )}
                    </div>

                    {/* Rating overlay */}
                    <div className="absolute bottom-1.5 left-1.5 sm:bottom-3 sm:left-3 flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md sm:rounded-lg backdrop-blur-md text-[10px] sm:text-xs font-semibold" style={{ backgroundColor: 'rgba(0,0,0,0.6)', color: '#fff' }}>
                      <Star className="h-2.5 w-2.5 sm:h-3 sm:w-3 fill-current" style={{ color: '#facc15' }} />
                      {(4.5 + Math.random() * 0.5).toFixed(1)}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-2.5 sm:p-4 space-y-1.5 sm:space-y-3">
                    {/* Name */}
                    <h3 className="text-[13px] sm:text-base font-bold leading-tight line-clamp-2" style={{ color: textPrimary, fontFamily }}>
                      {product.name}
                    </h3>

                    {/* Description - desktop only */}
                    {product.description && (
                      <p className="text-xs line-clamp-2 leading-relaxed hidden sm:block" style={{ color: textSecondary }}>
                        {product.description}
                      </p>
                    )}

                    {/* Price - prominent */}
                    <div className="flex items-baseline gap-1 sm:gap-2">
                      <span className="text-[17px] sm:text-2xl font-extrabold leading-none" style={{ color: accent }}>
                        {pSym}{product.price.toLocaleString()}
                      </span>
                      <span className="text-[9px] sm:text-xs font-medium" style={{ color: textMuted }}>{product.currency}</span>
                    </div>

                    {/* Quantity controls */}
                    <div className="flex items-center justify-center rounded-lg sm:rounded-xl overflow-hidden" style={{ border: `1px solid ${border}` }}>
                      <button onClick={() => setQty(product.id, qty - 1)} className="h-9 flex-1 sm:h-10 sm:w-10 sm:flex-none flex items-center justify-center transition-colors active:scale-90" style={{ backgroundColor: surfaceDeep, color: textPrimary }}>
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-10 sm:w-12 text-center text-sm font-bold" style={{ color: textPrimary }}>{qty}</span>
                      <button onClick={() => setQty(product.id, qty + 1)} className="h-9 flex-1 sm:h-10 sm:w-10 sm:flex-none flex items-center justify-center transition-colors active:scale-90" style={{ backgroundColor: surfaceDeep, color: textPrimary }}>
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Buy button - full width, prominent */}
                    <button
                      onClick={() => addToCart(product)}
                      className="w-full h-11 sm:h-10 rounded-lg sm:rounded-xl text-[13px] sm:text-sm font-bold flex items-center justify-center gap-1.5 sm:gap-2 transition-all active:scale-95"
                      style={{
                        backgroundColor: isAdded ? '#22c55e' : accent,
                        color: isDark ? '#000' : '#fff',
                        boxShadow: `0 3px 16px ${isAdded ? 'rgba(34,197,94,0.3)' : glowColor}`,
                      }}
                    >
                      {isAdded ? <><Check className="h-4 w-4" /> Agregado</> : <><ShoppingCart className="h-4 w-4" /> Comprar</>}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>


      {/* ═══════════════ FOOTER ═══════════════ */}
      <footer className="py-5 sm:py-8 text-center" style={{ borderTop: `1px solid ${border}` }}>
        <p className="text-xs" style={{ color: textMuted }}>
          {store.name} &middot; Todos los derechos reservados
        </p>
      </footer>

      {/* ═══════════════ FLOATING CART BAR ═══════════════ */}
      {cart.length > 0 && !showCart && (
        <div className="fixed bottom-0 left-0 right-0 z-40 px-4 pb-4 pt-2 anim-slide-up" style={{ background: `linear-gradient(to top, ${isGradient ? 'rgba(0,0,0,0.85)' : baseBgHex} 60%, transparent)` }}>
          <div className="max-w-5xl mx-auto">
            <button
              onClick={() => { setCheckoutStep('cart'); setShowCart(true) }}
              className="w-full flex items-center justify-between gap-3 h-14 px-5 rounded-2xl font-bold text-sm transition-all active:scale-[0.98]"
              style={{ backgroundColor: accent, color: isDark ? '#000' : '#fff', boxShadow: `0 4px 30px ${glowColor}` }}
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <ShoppingCart className="h-5 w-5" />
                  <span className="absolute -top-2 -right-2 h-4 w-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">{cartCount}</span>
                </div>
                <span>Ver Carrito</span>
              </div>
              <span className="text-base font-extrabold">{sym}{cartTotal.toLocaleString()}</span>
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════ CHECKOUT OVERLAY ═══════════════ */}
      {showCart && (
        <div className="fixed inset-0 z-50" onClick={closeCheckout}>
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm anim-fade" />

          {/* Panel */}
          <div
            className="absolute bottom-0 left-0 right-0 max-h-[92vh] overflow-y-auto rounded-t-3xl anim-slide-up scrollbar-hide"
            style={{ backgroundColor: isGradient ? '#000000' : adjustBrightness(baseBgHex, isDark ? 5 : -3), borderTop: `1px solid ${border}` }}
            onClick={e => e.stopPropagation()}
          >
            <div className="p-5 sm:p-6 pb-8">
              <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ backgroundColor: textMuted }} />

              {/* ── CART ── */}
              {checkoutStep === 'cart' && (
                <>
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="text-xl font-bold" style={{ color: textPrimary, fontFamily }}>Tu Pedido</h2>
                    <button onClick={closeCheckout} className="p-2 rounded-xl transition-colors" style={{ color: textSecondary }}><X className="h-5 w-5" /></button>
                  </div>

                  {cart.length === 0 ? (
                    <div className="py-12 text-center">
                      <ShoppingCart className="h-12 w-12 mx-auto mb-3 anim-float" style={{ color: textMuted }} />
                      <p style={{ color: textSecondary }}>Tu carrito esta vacio</p>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2 mb-5">
                        {cart.map(item => {
                          const iSym = currencySymbol[item.product.currency] || '$'
                          const thumb = (item.product.store_product_images || []).sort((a, b) => a.sort_order - b.sort_order)[0]?.image_url
                          return (
                            <div key={item.product.id} className="flex items-center gap-3 rounded-2xl p-3" style={{ backgroundColor: surfaceDeep }}>
                              <div className="h-14 w-14 rounded-xl overflow-hidden shrink-0" style={{ backgroundColor: surface }}>
                                {thumb ? <img src={thumb} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Package className="h-5 w-5" style={{ color: textMuted }} /></div>}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold truncate" style={{ color: textPrimary }}>{item.product.name}</p>
                                <p className="text-xs" style={{ color: textMuted }}>{iSym}{item.product.price.toLocaleString()} c/u</p>
                              </div>
                              <div className="flex items-center gap-1">
                                <button onClick={() => updateCartQty(item.product.id, item.quantity - 1)} className="h-8 w-8 rounded-lg flex items-center justify-center active:scale-90" style={{ backgroundColor: surface, color: textPrimary }}><Minus className="h-3 w-3" /></button>
                                <span className="w-6 text-center text-sm font-bold" style={{ color: textPrimary }}>{item.quantity}</span>
                                <button onClick={() => updateCartQty(item.product.id, item.quantity + 1)} className="h-8 w-8 rounded-lg flex items-center justify-center active:scale-90" style={{ backgroundColor: surface, color: textPrimary }}><Plus className="h-3 w-3" /></button>
                              </div>
                              <p className="text-sm font-bold min-w-[65px] text-right" style={{ color: accent }}>{iSym}{(item.product.price * item.quantity).toLocaleString()}</p>
                            </div>
                          )
                        })}
                      </div>

                      <div className="pt-4 mb-5" style={{ borderTop: `1px solid ${border}` }}>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold" style={{ color: textPrimary }}>Total</span>
                          <span className="text-xl font-extrabold" style={{ color: accent }}>{sym}{cartTotal.toLocaleString()} {mainCurrency}</span>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <button onClick={() => { setCart([]); setShowCart(false) }} className="flex-1 h-12 rounded-xl text-sm font-semibold border transition-all active:scale-95" style={{ borderColor: border, color: textSecondary }}>Vaciar</button>
                        <button onClick={() => setCheckoutStep('form')} className="flex-1 h-12 rounded-xl text-sm font-bold transition-all active:scale-95 hover:scale-[1.01]" style={{ backgroundColor: accent, color: isDark ? '#000' : '#fff', boxShadow: `0 2px 16px ${glowColor}` }}>
                          Finalizar Compra
                        </button>
                      </div>
                    </>
                  )}
                </>
              )}

              {/* ── FORM ── */}
              {checkoutStep === 'form' && (
                <>
                  <div className="flex items-center gap-3 mb-6">
                    <button onClick={() => setCheckoutStep('cart')} className="p-1" style={{ color: textSecondary }}><ArrowLeft className="h-5 w-5" /></button>
                    <h2 className="text-xl font-bold" style={{ color: textPrimary, fontFamily }}>Datos de Envio</h2>
                  </div>

                  <div className="space-y-4 mb-5">
                    {[
                      { icon: User, label: 'Nombre completo', key: 'name' as const, placeholder: 'Juan Perez', required: true },
                      { icon: Phone, label: 'Telefono', key: 'phone' as const, placeholder: '77777777', required: true, type: 'tel' },
                      { icon: MapPin, label: 'Ciudad', key: 'city' as const, placeholder: 'Cochabamba', required: true },
                    ].map(field => (
                      <div key={field.key} className="space-y-1.5">
                        <Label className="text-xs uppercase tracking-wider flex items-center gap-1.5" style={{ color: textMuted }}>
                          <field.icon className="h-3 w-3" /> {field.label} {field.required && '*'}
                        </Label>
                        <Input
                          value={customer[field.key]}
                          onChange={e => setCustomer(prev => ({ ...prev, [field.key]: e.target.value }))}
                          placeholder={field.placeholder}
                          type={field.type || 'text'}
                          className="h-12 rounded-xl text-base"
                          style={{ backgroundColor: surfaceDeep, borderColor: border, color: textPrimary }}
                        />
                      </div>
                    ))}

                    <div className="space-y-1.5">
                      <Label className="text-xs uppercase tracking-wider flex items-center gap-1.5" style={{ color: textMuted }}><MapPin className="h-3 w-3" /> Direccion *</Label>
                      <Textarea value={customer.address} onChange={e => setCustomer(prev => ({ ...prev, address: e.target.value }))} placeholder="Av. America #123" rows={2} className="rounded-xl text-base resize-none" style={{ backgroundColor: surfaceDeep, borderColor: border, color: textPrimary }} />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs uppercase tracking-wider" style={{ color: textMuted }}>Referencia (opcional)</Label>
                      <Input value={customer.reference} onChange={e => setCustomer(prev => ({ ...prev, reference: e.target.value }))} placeholder="Cerca del mercado central" className="h-12 rounded-xl text-base" style={{ backgroundColor: surfaceDeep, borderColor: border, color: textPrimary }} />
                    </div>

                    {/* Location */}
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wider flex items-center gap-1.5" style={{ color: textMuted }}><Navigation className="h-3 w-3" /> Ubicacion (opcional)</Label>
                      {!customer.google_maps_url ? (
                        <div className="space-y-2">
                          <Button type="button" onClick={handleGetLocation} disabled={geoLoading} className="w-full bg-violet-600 hover:bg-violet-700 text-white font-semibold gap-2 h-12 rounded-xl text-sm active:scale-[0.98]">
                            {geoLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4" />}
                            {geoLoading ? 'Obteniendo...' : 'Obtener mi ubicacion'}
                          </Button>
                          {geoError && <p className="text-xs text-red-400 text-center">{geoError}</p>}
                          <div className="flex gap-2">
                            <Input placeholder="O pega enlace de Google Maps" onChange={e => { setCustomer(prev => ({ ...prev, google_maps_url: e.target.value, latitude: null, longitude: null })); setLocationMode('manual') }} className="h-11 rounded-xl text-sm flex-1" style={{ backgroundColor: surfaceDeep, borderColor: border, color: textPrimary }} />
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-xl p-3" style={{ backgroundColor: surfaceDeep }}>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-emerald-400 shrink-0" />
                            <span className="text-xs text-emerald-400 font-semibold flex-1">{locationMode === 'auto' ? 'Ubicacion detectada' : 'Enlace guardado'}</span>
                            <button onClick={() => { setCustomer(prev => ({ ...prev, google_maps_url: '', latitude: null, longitude: null })); setLocationMode(null) }} style={{ color: textMuted }}><X className="h-3.5 w-3.5" /></button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Payment */}
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wider flex items-center gap-1.5" style={{ color: textMuted }}><CreditCard className="h-3 w-3" /> Metodo de pago</Label>
                      <div className="space-y-2">
                        {([
                          { value: 'whatsapp' as const, label: 'Coordinar por WhatsApp', icon: '💬' },
                          { value: 'transfer' as const, label: 'Transferencia / QR', icon: '🏦' },
                          { value: 'cash' as const, label: 'Contra entrega', icon: '💵' },
                        ]).map(opt => (
                          <button
                            key={opt.value} type="button"
                            onClick={() => setCustomer(prev => ({ ...prev, payment_method: opt.value }))}
                            className="w-full flex items-center gap-3 rounded-xl border-2 p-3.5 transition-all text-left active:scale-[0.98]"
                            style={{ borderColor: customer.payment_method === opt.value ? accent : border, backgroundColor: customer.payment_method === opt.value ? `${accent}10` : surfaceDeep }}
                          >
                            <span className="text-lg">{opt.icon}</span>
                            <span className="text-sm font-semibold" style={{ color: customer.payment_method === opt.value ? textPrimary : textSecondary }}>{opt.label}</span>
                            {customer.payment_method === opt.value && <Check className="h-4 w-4 ml-auto" style={{ color: accent }} />}
                          </button>
                        ))}
                      </div>
                      {customer.payment_method === 'transfer' && store.payment_qr_url && (
                        <div className="mt-3 rounded-xl p-4 text-center" style={{ backgroundColor: surfaceDeep }}>
                          <p className="text-xs mb-3" style={{ color: textMuted }}>Escanea el QR para pagar</p>
                          <img src={store.payment_qr_url} alt="QR" className="w-48 h-48 mx-auto rounded-lg object-contain bg-white p-2" />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl p-3 mb-4" style={{ backgroundColor: surfaceDeep }}>
                    <div className="flex justify-between text-sm">
                      <span style={{ color: textSecondary }}>{cartCount} producto{cartCount > 1 ? 's' : ''}</span>
                      <span className="font-bold" style={{ color: accent }}>{sym}{cartTotal.toLocaleString()} {mainCurrency}</span>
                    </div>
                  </div>

                  <button onClick={handleSubmitOrder} disabled={submitting} className="w-full h-14 rounded-xl text-base font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98]" style={{ backgroundColor: '#22c55e', color: '#fff' }}>
                    {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
                    Confirmar Pedido
                  </button>
                </>
              )}

              {/* ── CONFIRM ── */}
              {checkoutStep === 'confirm' && (
                <>
                  <div className="text-center py-6">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 mb-4"><Check className="h-8 w-8 text-emerald-400" /></div>
                    <h2 className="text-2xl font-bold mb-2" style={{ color: textPrimary, fontFamily }}>Pedido Registrado</h2>
                    <p className="text-sm" style={{ color: textSecondary }}>
                      Tu pedido ha sido registrado exitosamente.
                      {orderId && <span className="block mt-1 font-mono" style={{ color: accent }}>#{orderId.substring(0, 8)}</span>}
                    </p>
                  </div>

                  <div className="rounded-xl p-4 mb-5 space-y-2" style={{ backgroundColor: surfaceDeep }}>
                    <h3 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: textMuted }}>Resumen</h3>
                    {cart.map(item => (
                      <div key={item.product.id} className="flex justify-between text-sm">
                        <span style={{ color: textSecondary }}>{item.product.name} x{item.quantity}</span>
                        <span className="font-medium" style={{ color: textPrimary }}>{sym}{(item.product.price * item.quantity).toLocaleString()}</span>
                      </div>
                    ))}
                    <div className="pt-2 flex justify-between" style={{ borderTop: `1px solid ${border}` }}>
                      <span className="font-bold" style={{ color: textPrimary }}>Total</span>
                      <span className="text-lg font-extrabold" style={{ color: accent }}>{sym}{cartTotal.toLocaleString()}</span>
                    </div>
                  </div>

                  <button onClick={sendWhatsApp} className="w-full h-14 rounded-xl text-base font-bold flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white transition-all active:scale-[0.98]">
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    Enviar Pedido por WhatsApp
                  </button>
                  <button onClick={closeCheckout} className="w-full mt-3 text-sm py-2" style={{ color: textSecondary }}>Cerrar y seguir comprando</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Spacer for bottom bar */}
      {cart.length > 0 && !showCart && <div className="h-24" />}
    </div>
  )
}
