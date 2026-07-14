'use client'

import React, { useState, useEffect } from 'react'
import { ShoppingBag, Store, Search, ChevronRight } from 'lucide-react'
import { CartProvider, useCart } from './CartContext'
import { CartDrawer } from './CartDrawer'
import { LandingViewClient } from './LandingViewClient'
import { ProductCard } from './ProductCard'
import { ProductDetailModal } from './ProductDetailModal'
import { resolveStoreTheme } from '@/lib/store-themes'

export function StoreViewClient({ store, products, categories, phone, paymentQrUrl }: any) {
    const theme = resolveStoreTheme(store?.themeConfig)
    return (
        <CartProvider storeKey={store?.slug}>
            {/* Tipografía del tema (Next la sube al <head>) */}
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
            <link rel="stylesheet" href={theme.fontHref} />
            <StoreViewContent
                store={store}
                products={products}
                categories={categories}
                phone={phone}
                paymentQrUrl={paymentQrUrl}
                theme={theme}
            />
        </CartProvider>
    )
}

function StoreViewContent({ store, products, categories, phone, paymentQrUrl, theme }: any) {
    const [isCartOpen, setIsCartOpen] = useState(false)
    const { totalItems, totalPoints, totalPrice, cart } = useCart()

    return (
        <div style={{
            ...theme.vars,
            minHeight: '100vh',
            background: 'var(--st-bg)',
            color: 'var(--st-text)',
            fontFamily: 'var(--st-font)',
        }}>
            {store.type === 'LANDING' ? (
                <LandingViewClient
                    store={store}
                    product={products[0]}
                    phone={phone}
                    onOpenCart={() => setIsCartOpen(true)}
                />
            ) : (
                <CatalogView
                    store={store}
                    products={products}
                    categories={categories}
                    phone={phone}
                    onOpenCart={() => setIsCartOpen(true)}
                    totalItems={totalItems}
                    totalPoints={totalPoints}
                    totalPrice={totalPrice}
                    cart={cart}
                    isCartOpen={isCartOpen}
                />
            )}
            <CartDrawer
                isOpen={isCartOpen}
                onClose={() => setIsCartOpen(false)}
                storeWhatsapp={phone}
                paymentQrUrl={paymentQrUrl}
                isMLM={store.type === 'NETWORK_MARKETING'}
                storeName={store.name}
                storeSlug={store.slug}
            />
        </div>
    )
}

function BannerCarousel({ banners, height = 190, overlay = null }: { banners: string[]; height?: number; overlay?: React.ReactNode }) {
    const [idx, setIdx] = useState(0)

    useEffect(() => {
        if (banners.length < 2) return
        const t = setInterval(() => setIdx(i => (i + 1) % banners.length), 4000)
        return () => clearInterval(t)
    }, [banners.length])

    const hasImg = banners.length > 0
    // Sin imagen y sin contenido superpuesto: no se muestra nada.
    if (!hasImg && !overlay) return null

    return (
        <div style={{ position: 'relative', borderRadius: 'calc(var(--st-radius) + 4px)', overflow: 'hidden', height, marginBottom: overlay ? 0 : 24, border: '1px solid var(--st-border)', boxShadow: 'var(--st-card-shadow)' }}>
            {hasImg ? banners.map((url, i) => (
                <img
                    key={url}
                    src={url}
                    alt={`banner-${i}`}
                    style={{
                        position: 'absolute', inset: 0, width: '100%', height: '100%',
                        objectFit: 'cover',
                        opacity: i === idx ? 1 : 0,
                        transition: 'opacity 0.8s ease',
                    }}
                />
            )) : (
                // Sin banner: fondo con degradado del color de la tienda.
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(var(--st-primary-rgb),0.9), rgba(var(--st-primary-rgb),0.22))' }} />
            )}
            {/* Degradado para legibilidad (más fuerte cuando hay texto encima) */}
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: overlay
                ? 'linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.30) 55%, rgba(0,0,0,0.10) 100%)'
                : 'linear-gradient(to top, rgba(0,0,0,0.35), transparent 55%)' }} />
            {/* Contenido superpuesto (identidad de la tienda) */}
            {overlay && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '20px' }}>
                    {overlay}
                </div>
            )}
            {hasImg && banners.length > 1 && (
                <div style={{ position: 'absolute', bottom: 12, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 6, zIndex: 3 }}>
                    {banners.map((_, i) => (
                        <button
                            key={i}
                            onClick={() => setIdx(i)}
                            aria-label={`Banner ${i + 1}`}
                            style={{
                                width: i === idx ? 22 : 6, height: 6,
                                borderRadius: 9999, border: 'none', cursor: 'pointer',
                                background: i === idx ? 'var(--st-primary)' : 'rgba(255,255,255,0.55)',
                                transition: 'all 0.3s ease', padding: 0,
                            }}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}

function CatalogView({ store, products, categories, phone, onOpenCart, totalItems, totalPoints, totalPrice, cart, isCartOpen }: any) {
    const isMLM = store.type === 'NETWORK_MARKETING'
    const [activeCategory, setActiveCategory] = useState('Todos')
    const [searchQuery, setSearchQuery] = useState('')
    const [detailProduct, setDetailProduct] = useState<any>(null)
    const categoryList = ['Todos', ...Object.keys(categories)]

    // Productos visibles según categoría + búsqueda
    const visibleProducts: any[] = (activeCategory === 'Todos'
        ? (Object.values(categories).flat() as any[])
        : (categories[activeCategory] || [])
    ).filter((p: any) => !searchQuery.trim() || p.name.toLowerCase().includes(searchQuery.trim().toLowerCase()))

    const currencySymbol = (currency: string) =>
        currency === 'PEN' ? 'S/' : currency === 'BOB' ? 'Bs' : currency === 'VES' ? 'Bs.S' : currency === 'EUR' ? '€' : '$'

    return (
        <div>
            {/* ── HEADER ── */}
            <header style={{
                position: 'sticky', top: 0, zIndex: 50,
                background: 'var(--st-surface)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
                borderBottom: '1px solid var(--st-border)',
            }}>
                {/* Línea de acento superior */}
                <div style={{ height: 3, background: 'linear-gradient(90deg, var(--st-primary), rgba(var(--st-primary-rgb),0.35), transparent)' }} />
                <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 20px', height: 62, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    {/* Marca */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                        {store.logoUrl
                            ? <img src={store.logoUrl} alt={store.name} style={{ width: 36, height: 36, borderRadius: 10, objectFit: 'cover', border: '1px solid var(--st-card-border)' }} />
                            : <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(var(--st-primary-rgb),0.12)', border: '1px solid var(--st-card-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Store size={16} style={{ color: 'var(--st-primary)' }} />
                            </div>
                        }
                        <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--st-text)', letterSpacing: '-0.01em' }}>{store.name}</span>
                    </div>

                    {/* Carrito */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {isMLM && totalPoints > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                <span style={{ fontSize: 8, fontWeight: 500, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--st-muted)' }}>PV</span>
                                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--st-primary)' }}>+{totalPoints}</span>
                            </div>
                        )}
                        <button onClick={onOpenCart} aria-label="Carrito" style={{
                            display: 'flex', alignItems: 'center', gap: 10, padding: '9px 15px',
                            background: 'rgba(var(--st-primary-rgb),0.12)', border: '1px solid rgba(var(--st-primary-rgb),0.32)', borderRadius: 12,
                            color: 'var(--st-text)', cursor: 'pointer', position: 'relative',
                        }}>
                            <div style={{ position: 'relative' }}>
                                <ShoppingBag size={19} style={{ color: 'var(--st-primary)' }} />
                                {totalItems > 0 && (
                                    <span style={{
                                        position: 'absolute', top: -8, right: -8,
                                        background: 'var(--st-price)', color: '#04210f', fontSize: 9, fontWeight: 800,
                                        minWidth: 18, height: 18, padding: '0 4px', borderRadius: 999,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }}>{totalItems}</span>
                                )}
                            </div>
                        </button>
                    </div>
                </div>
            </header>

            {/* ── HERO DE LA TIENDA (identidad sobre el banner) ── */}
            <div style={{ maxWidth: 1280, margin: '0 auto', padding: '18px 16px 0' }}>
                <BannerCarousel
                    banners={[store.bannerUrl, store.themeConfig?.bannerUrl2].filter(Boolean) as string[]}
                    height={250}
                    overlay={
                        <>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 13, marginBottom: store.description ? 10 : 0 }}>
                                {store.logoUrl && (
                                    <img src={store.logoUrl} alt={store.name} style={{ width: 58, height: 58, borderRadius: 16, objectFit: 'cover', border: '2px solid rgba(255,255,255,0.9)', boxShadow: '0 6px 18px rgba(0,0,0,0.45)', flexShrink: 0 }} />
                                )}
                                <h1 style={{ fontSize: 'clamp(23px, 6.5vw, 36px)', fontWeight: 800, color: '#fff', lineHeight: 1.08, letterSpacing: '-0.02em', textShadow: '0 2px 14px rgba(0,0,0,0.55)' }}>{store.name}</h1>
                            </div>
                            {store.description && (
                                <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.92)', lineHeight: 1.6, maxWidth: 580, textShadow: '0 1px 8px rgba(0,0,0,0.5)', display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2, overflow: 'hidden' } as React.CSSProperties}>{store.description}</p>
                            )}
                        </>
                    }
                />
            </div>

            {/* ── BUSCADOR + CATEGORÍAS ── */}
            <div style={{ maxWidth: 1280, margin: '0 auto', padding: '18px 20px 0' }}>

                {/* ── BUSCADOR ── */}
                <div style={{ position: 'relative', marginBottom: 14 }}>
                    <Search size={16} style={{ color: 'var(--st-primary)', position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', opacity: 0.7 }} />
                    <input
                        type="text"
                        placeholder="Buscar producto..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        style={{
                            width: '100%', boxSizing: 'border-box',
                            padding: '12px 14px 12px 40px',
                            background: 'rgba(var(--st-primary-rgb),0.06)', border: '1px solid rgba(var(--st-primary-rgb),0.20)',
                            borderRadius: 14, color: 'var(--st-text)', fontSize: 14,
                            outline: 'none', fontFamily: 'inherit',
                        }}
                    />
                </div>

                {/* ── CATEGORÍAS (chips deslizables) ── */}
                {categoryList.length > 1 && (
                    <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, marginBottom: 4, scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
                        {categoryList.map(cat => {
                            const active = activeCategory === cat
                            return (
                                <button
                                    key={cat}
                                    onClick={() => setActiveCategory(cat)}
                                    style={{
                                        flexShrink: 0, padding: '9px 17px', borderRadius: 999, cursor: 'pointer', fontFamily: 'inherit',
                                        fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', letterSpacing: '0.01em', transition: 'all 0.2s',
                                        background: active ? 'var(--st-primary)' : 'rgba(var(--st-primary-rgb),0.08)',
                                        color: active ? 'var(--st-on-primary)' : 'var(--st-muted)',
                                        border: `1px solid ${active ? 'transparent' : 'rgba(var(--st-primary-rgb),0.2)'}`,
                                        boxShadow: active ? '0 4px 14px rgba(var(--st-primary-rgb),0.35)' : 'none',
                                    }}
                                >
                                    {cat}
                                </button>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* ── GRID DE PRODUCTOS (2 columnas en móvil) ── */}
            <main style={{ maxWidth: 1280, margin: '0 auto', padding: totalItems > 0 ? '14px 20px 120px' : '14px 20px 60px' }}>
                <style>{`.st-prodcard{transition:transform .22s ease, box-shadow .22s ease}.st-prodcard:hover{transform:translateY(-5px)}`}</style>
                {products.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--st-muted)' }}>
                        <Store size={40} style={{ margin: '0 auto 16px', opacity: 0.4 }} />
                        <p style={{ fontSize: 14 }}>No hay productos disponibles aún.</p>
                    </div>
                ) : (
                    <>
                        {/* Encabezado de sección */}
                        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
                            <h2 style={{ fontSize: 17, fontWeight: 800, color: 'var(--st-text)', letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', gap: 9 }}>
                                <span style={{ width: 4, height: 18, borderRadius: 99, background: 'var(--st-primary)', display: 'inline-block' }} />
                                {activeCategory === 'Todos' ? 'Todos los productos' : activeCategory}
                            </h2>
                            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--st-muted)', whiteSpace: 'nowrap' }}>
                                {visibleProducts.length} {visibleProducts.length === 1 ? 'producto' : 'productos'}
                            </span>
                        </div>

                        {visibleProducts.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--st-muted)' }}>
                                <Search size={36} style={{ margin: '0 auto 14px', opacity: 0.4 }} />
                                <p style={{ fontSize: 14 }}>No encontramos productos para “{searchQuery}”.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                                {visibleProducts.map((p: any) => (
                                    <ProductCard key={p.id} p={p} whatsappPhone={phone} isMLM={isMLM} onOpenDetail={() => setDetailProduct(p)} />
                                ))}
                            </div>
                        )}
                    </>
                )}
            </main>

            {/* ── FOOTER ── */}
            <footer style={{ borderTop: '1px solid var(--st-border)', padding: '24px 20px', textAlign: 'center' }}>
                <p style={{ fontSize: 10.5, color: 'var(--st-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    {store.name} · Powered by MY DIAMOND © 2026
                </p>
            </footer>

            {/* ── DETALLE DE PRODUCTO ── */}
            {detailProduct && (
                <ProductDetailModal
                    product={detailProduct}
                    isMLM={isMLM}
                    onClose={() => setDetailProduct(null)}
                />
            )}

            {/* ── BARRA FLOTANTE DE PEDIDO (visible cuando hay productos y el carrito está cerrado) ── */}
            {totalItems > 0 && !isCartOpen && (
                <div style={{
                    position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 120,
                    padding: '0 12px 12px', display: 'flex', justifyContent: 'center',
                    pointerEvents: 'none',
                }}>
                    <style>{`@keyframes st-cartbar{from{transform:translateY(140%);opacity:0}to{transform:translateY(0);opacity:1}}@keyframes st-cartpulse{0%,100%{transform:scale(1)}50%{transform:scale(1.12)}}`}</style>
                    <button onClick={onOpenCart} aria-label="Ver mi pedido" style={{
                        pointerEvents: 'auto', width: '100%', maxWidth: 540,
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                        padding: '13px 16px', borderRadius: 18, border: 'none', cursor: 'pointer',
                        background: 'var(--st-primary)', color: 'var(--st-on-primary)', fontFamily: 'inherit',
                        boxShadow: '0 10px 34px rgba(0,0,0,0.32), 0 0 0 1px rgba(var(--st-primary-rgb),0.55)',
                        animation: 'st-cartbar 0.4s cubic-bezier(.22,1,.36,1)',
                    }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <span style={{ position: 'relative', display: 'flex' }}>
                                <ShoppingBag size={23} />
                                <span style={{
                                    position: 'absolute', top: -8, right: -10,
                                    background: 'var(--st-price)', color: '#04210f',
                                    fontSize: 10, fontWeight: 800, minWidth: 19, height: 19, padding: '0 4px',
                                    borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    border: '2px solid var(--st-primary)', animation: 'st-cartpulse 1.8s ease-in-out infinite',
                                }}>{totalItems}</span>
                            </span>
                            <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.15 }}>
                                <span style={{ fontSize: 14.5, fontWeight: 800, letterSpacing: '0.01em' }}>Ver mi pedido</span>
                                <span style={{ fontSize: 11, fontWeight: 600, opacity: 0.85 }}>
                                    {totalItems} {totalItems === 1 ? 'producto' : 'productos'}{isMLM && totalPoints > 0 ? ` · +${totalPoints} PV` : ''}
                                </span>
                            </span>
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                            <span style={{ fontSize: 17.5, fontWeight: 800 }}>
                                {currencySymbol(cart?.[0]?.currency || products?.[0]?.currency || 'USD')}{Number(totalPrice).toLocaleString()}
                            </span>
                            <ChevronRight size={21} />
                        </span>
                    </button>
                </div>
            )}
        </div>
    )
}
