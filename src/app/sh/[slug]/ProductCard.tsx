'use client'

import React, { useState } from 'react'
import { Plus, Minus, ShoppingCart, Star } from 'lucide-react'
import { ProductImageGallery } from './ProductImageGallery'
import { useCart } from './CartContext'

const OFFER = '#FF8C42'

const currencySymbol = (c: string) =>
    c === 'PEN' ? 'S/' : c === 'BOB' ? 'Bs' : c === 'VES' ? 'Bs.S' : c === 'EUR' ? '€' : '$'

export function ProductCard({ p, whatsappPhone, isMLM, onOpenDetail }: any) {
    const [quantity, setQuantity] = useState(1)
    const [added, setAdded] = useState(false)
    const { addToCart } = useCart()

    const effectivePrice = p.pricePromo ? Number(p.pricePromo) : Number(p.price)

    const handleAddToCart = () => {
        addToCart({
            id: p.id,
            name: p.name,
            price: effectivePrice,
            currency: p.currency,
            quantity,
            points: Number(p.points || 0),
            image: p.images?.[0],
        })
        setAdded(true)
        setTimeout(() => setAdded(false), 2000)
    }

    return (
        <div className="st-prodcard" style={{
            display: 'flex', flexDirection: 'column',
            background: 'var(--st-card)',
            border: '1px solid var(--st-card-border)',
            borderRadius: 'var(--st-radius)',
            overflow: 'hidden',
            position: 'relative',
            boxShadow: 'var(--st-card-shadow)',
            fontFamily: 'inherit',
        }}>
            {/* Línea de acento superior */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(var(--st-primary-rgb),0.7), transparent)', zIndex: 2 }} />

            {/* Imagen (clic abre el detalle) */}
            <div style={{ position: 'relative', cursor: 'pointer' }} onClick={onOpenDetail}>
                <ProductImageGallery images={p.images} name={p.name} />
                {/* Badges sobre la imagen (pill oscura legible sobre cualquier foto) */}
                {isMLM && p.points > 0 && (
                    <div style={{
                        position: 'absolute', top: 10, right: 10,
                        background: 'var(--st-primary)', color: 'var(--st-on-primary)',
                        fontSize: 9.5, fontWeight: 800, padding: '4px 9px', borderRadius: 9999,
                        display: 'flex', alignItems: 'center', gap: 4,
                        letterSpacing: '0.05em', textTransform: 'uppercase',
                    }}>
                        <Star size={9} fill="currentColor" /> {p.points} PV
                    </div>
                )}
                {p.stock > 0 && p.stock <= 5 && (
                    <div style={{
                        position: 'absolute', top: 10, left: 10,
                        background: 'rgba(0,0,0,0.62)', color: '#fff',
                        fontSize: 9.5, fontWeight: 700, padding: '4px 9px', borderRadius: 9999,
                        backdropFilter: 'blur(4px)',
                        letterSpacing: '0.05em', textTransform: 'uppercase',
                    }}>
                        Últimos {p.stock}
                    </div>
                )}
            </div>

            {/* Contenido */}
            <div style={{ padding: '12px 13px 13px', flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>

                {/* Nombre */}
                <h3 onClick={onOpenDetail} style={{ fontSize: 'clamp(12px, 2.6vw, 15px)', fontWeight: 700, color: 'var(--st-text)', lineHeight: 1.3, margin: 0, cursor: 'pointer',
                    display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2, overflow: 'hidden' } as React.CSSProperties}>
                    {p.name}
                </h3>

                {/* Descripción (ahora visible también en móvil) */}
                {p.description && (
                    <p style={{
                        fontSize: 'clamp(11px, 2.2vw, 12.5px)', color: 'var(--st-muted)', lineHeight: 1.55, margin: 0,
                        display: '-webkit-box', WebkitBoxOrient: 'vertical',
                        WebkitLineClamp: 2, overflow: 'hidden',
                    } as React.CSSProperties}>
                        {p.description}
                    </p>
                )}

                {/* Sección inferior */}
                <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 9 }}>

                    {/* Cantidad — solo en pantallas grandes */}
                    <div className="hidden sm:flex" style={{
                        alignItems: 'center', justifyContent: 'space-between',
                        background: 'rgba(var(--st-primary-rgb),0.06)', borderRadius: 10, padding: '6px 10px',
                        border: '1px solid var(--st-border)',
                    }}>
                        <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--st-muted)' }}>Cant.</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <button onClick={() => setQuantity(Math.max(1, quantity - 1))} aria-label="Menos" style={{
                                width: 28, height: 28, borderRadius: 8, background: 'rgba(var(--st-primary-rgb),0.10)',
                                border: '1px solid var(--st-card-border)', color: 'var(--st-text)', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}><Minus size={12} /></button>
                            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--st-text)', width: 18, textAlign: 'center' }}>{quantity}</span>
                            <button onClick={() => setQuantity(quantity + 1)} aria-label="Más" style={{
                                width: 28, height: 28, borderRadius: 8, background: 'rgba(var(--st-primary-rgb),0.10)',
                                border: '1px solid var(--st-card-border)', color: 'var(--st-text)', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}><Plus size={12} /></button>
                        </div>
                    </div>

                    {/* Precio */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {p.pricePromo && (
                            <span style={{ fontSize: 'clamp(10px, 2vw, 12px)', color: 'var(--st-muted)', textDecoration: 'line-through', lineHeight: 1 }}>
                                {currencySymbol(p.currency)}{Number(p.price * quantity).toLocaleString()}
                            </span>
                        )}
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 'clamp(16px, 4vw, 22px)', fontWeight: 800, color: p.pricePromo ? OFFER : 'var(--st-price)', lineHeight: 1 }}>
                                {currencySymbol(p.currency)}{Number(effectivePrice * quantity).toLocaleString()}
                            </span>
                            {p.pricePromo && (
                                <span style={{ fontSize: 9, fontWeight: 800, color: OFFER, background: 'rgba(255,140,66,0.15)', border: '1px solid rgba(255,140,66,0.3)', borderRadius: 99, padding: '2px 6px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                                    Oferta
                                </span>
                            )}
                            {isMLM && p.points > 0 && (
                                <span className="hidden sm:flex" style={{ fontSize: 9.5, fontWeight: 600, color: 'var(--st-primary)', alignItems: 'center', gap: 3 }}>
                                    <Star size={9} fill="currentColor" /> +{p.points * quantity}PV
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Botón añadir (más grande y táctil) */}
                    <button onClick={handleAddToCart} style={{
                        width: '100%', padding: '11px 0',
                        borderRadius: 12, fontSize: 'clamp(11px, 2.4vw, 12.5px)', fontWeight: 800,
                        letterSpacing: '0.04em', textTransform: 'uppercase', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        background: added ? 'var(--st-price)' : 'var(--st-primary)',
                        color: added ? '#04210f' : 'var(--st-on-primary)', border: 'none', transition: 'all 0.2s',
                        fontFamily: 'inherit',
                    }}>
                        <ShoppingCart size={14} />
                        {added ? '¡Listo!' : 'Añadir'}
                    </button>
                </div>
            </div>
        </div>
    )
}
