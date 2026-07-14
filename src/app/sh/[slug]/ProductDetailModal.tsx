'use client'

import React, { useState } from 'react'
import { X, Plus, Minus, ShoppingCart, Star } from 'lucide-react'
import { ProductImageGallery } from './ProductImageGallery'
import { useCart } from './CartContext'

const OFFER = '#FF8C42'

const currencySymbol = (c: string) =>
    c === 'PEN' ? 'S/' : c === 'BOB' ? 'Bs' : c === 'VES' ? 'Bs.S' : c === 'EUR' ? '€' : '$'

export function ProductDetailModal({ product, isMLM, onClose }: any) {
    const [quantity, setQuantity] = useState(1)
    const [added, setAdded] = useState(false)
    const { addToCart } = useCart()

    if (!product) return null
    const p = product
    const cs = currencySymbol(p.currency)
    const effectivePrice = p.pricePromo ? Number(p.pricePromo) : Number(p.price)

    const handleAdd = () => {
        addToCart({
            id: p.id, name: p.name, price: effectivePrice, currency: p.currency,
            quantity, points: Number(p.points || 0), image: p.images?.[0],
        })
        setAdded(true)
        setTimeout(() => setAdded(false), 1600)
    }

    const qBtn: React.CSSProperties = {
        width: 36, height: 36, borderRadius: 10, background: 'rgba(var(--st-primary-rgb),0.10)',
        border: '1px solid var(--st-card-border)', color: 'var(--st-text)', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
    }

    return (
        <div onClick={onClose} style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            animation: 'st-fade 0.2s ease',
        }}>
            <style>{`@keyframes st-fade{from{opacity:0}to{opacity:1}}@keyframes st-up{from{transform:translateY(24px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
            <div onClick={e => e.stopPropagation()} style={{
                background: 'var(--st-bg)', color: 'var(--st-text)', fontFamily: 'var(--st-font)',
                width: '100%', maxWidth: 540, maxHeight: '94vh', overflowY: 'auto',
                borderRadius: '26px 26px 0 0', border: '1px solid var(--st-border)', borderBottom: 'none',
                animation: 'st-up 0.28s cubic-bezier(.22,1,.36,1)', scrollbarWidth: 'none',
            }}>
                {/* Cerrar */}
                <div style={{ position: 'sticky', top: 0, display: 'flex', justifyContent: 'flex-end', padding: '12px 12px 0', zIndex: 3 }}>
                    <button onClick={onClose} aria-label="Cerrar" style={{
                        width: 38, height: 38, borderRadius: '50%', background: 'rgba(var(--st-primary-rgb),0.12)',
                        border: '1px solid var(--st-card-border)', color: 'var(--st-text)', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}><X size={19} /></button>
                </div>

                <div style={{ padding: '4px 18px 18px' }}>
                    {/* Galería grande */}
                    <div style={{ position: 'relative', borderRadius: 'var(--st-radius)', overflow: 'hidden', border: '1px solid var(--st-card-border)', marginBottom: 16 }}>
                        <ProductImageGallery images={p.images} name={p.name} />
                        {isMLM && p.points > 0 && (
                            <div style={{
                                position: 'absolute', top: 12, right: 12, zIndex: 5,
                                background: 'var(--st-primary)', color: 'var(--st-on-primary)',
                                fontSize: 11, fontWeight: 800, padding: '5px 11px', borderRadius: 9999,
                                display: 'flex', alignItems: 'center', gap: 5, textTransform: 'uppercase', letterSpacing: '0.05em',
                            }}>
                                <Star size={11} fill="currentColor" /> {p.points} PV
                            </div>
                        )}
                    </div>

                    {/* Nombre */}
                    <h2 style={{ fontSize: 'clamp(20px, 5vw, 25px)', fontWeight: 800, color: 'var(--st-text)', lineHeight: 1.25, marginBottom: 10 }}>{p.name}</h2>

                    {/* Precio */}
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 9, flexWrap: 'wrap', marginBottom: 16 }}>
                        {p.pricePromo && (
                            <span style={{ color: 'var(--st-muted)', textDecoration: 'line-through', fontSize: 16 }}>{cs}{Number(p.price).toLocaleString()}</span>
                        )}
                        <span style={{ fontSize: 'clamp(26px, 7vw, 32px)', fontWeight: 800, color: p.pricePromo ? OFFER : 'var(--st-price)', lineHeight: 1 }}>
                            {cs}{effectivePrice.toLocaleString()}
                        </span>
                        {p.pricePromo && (
                            <span style={{ fontSize: 11, fontWeight: 800, color: OFFER, background: 'rgba(255,140,66,0.15)', border: '1px solid rgba(255,140,66,0.3)', borderRadius: 99, padding: '3px 9px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Oferta</span>
                        )}
                    </div>

                    {/* Descripción completa */}
                    {p.description && (
                        <p style={{ color: 'var(--st-muted)', fontSize: 14.5, lineHeight: 1.75, marginBottom: 18, whiteSpace: 'pre-line' }}>{p.description}</p>
                    )}

                    {/* Cantidad */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(var(--st-primary-rgb),0.06)', borderRadius: 14, padding: '11px 16px', border: '1px solid var(--st-border)' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--st-muted)' }}>Cantidad</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                            <button onClick={() => setQuantity(Math.max(1, quantity - 1))} aria-label="Menos" style={qBtn}><Minus size={16} /></button>
                            <span style={{ fontSize: 18, fontWeight: 800, width: 26, textAlign: 'center', color: 'var(--st-text)' }}>{quantity}</span>
                            <button onClick={() => setQuantity(quantity + 1)} aria-label="Más" style={qBtn}><Plus size={16} /></button>
                        </div>
                    </div>
                </div>

                {/* Barra inferior fija: añadir */}
                <div style={{ position: 'sticky', bottom: 0, padding: '14px 18px', background: 'var(--st-bg)', borderTop: '1px solid var(--st-border)' }}>
                    <button onClick={handleAdd} style={{
                        width: '100%', padding: '15px 0', borderRadius: 14,
                        background: added ? 'var(--st-price)' : 'var(--st-primary)',
                        color: added ? '#04210f' : 'var(--st-on-primary)',
                        fontWeight: 800, fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.04em',
                        border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    }}>
                        <ShoppingCart size={17} />
                        {added ? '¡Agregado!' : `Añadir · ${cs}${(effectivePrice * quantity).toLocaleString()}`}
                    </button>
                </div>
            </div>
        </div>
    )
}
