'use client'

import React, { useState } from 'react'
import { X, ShoppingCart, Trash2, Minus, Plus, MessageCircle, MapPin, User, Phone, ClipboardList, Wallet, Banknote, QrCode, CheckCircle2, UploadCloud, Navigation } from 'lucide-react'
import { useCart } from './CartContext'
import { LocationPicker } from './LocationPicker'

export function CartDrawer({ isOpen, onClose, storeWhatsapp, paymentQrUrl, isMLM, storeName, storeSlug }: { isOpen: boolean, onClose: () => void, storeWhatsapp: string, paymentQrUrl?: string, isMLM?: boolean, storeName?: string, storeSlug?: string }) {
    const { cart, removeFromCart, updateQuantity, totalPrice, totalPoints, clearCart } = useCart()
    const [step, setStep] = useState<'ITEMS' | 'CHECKOUT' | 'SUCCESS'>('ITEMS')

    // Form State
    const [form, setForm] = useState({
        name: '',
        phone: '',
        city: '',
        street1: '',
        street2: '',
        houseNum: '',
        instructions: '',
        paymentMethod: 'CASH' as 'CASH' | 'QR',
        proofUrl: '',
        locationUrl: ''
    })
    const [geoStatus, setGeoStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
    const [uploadStatus, setUploadStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
    const [mapOpen, setMapOpen] = useState(false)

    // Coordenadas guardadas (para reabrir el mapa donde quedó)
    const initialCoords = (() => {
        const m = form.locationUrl.match(/q=([-\d.]+),([-\d.]+)/)
        return m ? { lat: parseFloat(m[1]), lng: parseFloat(m[2]) } : null
    })()

    // Ubicación exacta por GPS (un toque)
    const handleGetLocation = () => {
        if (typeof navigator === 'undefined' || !navigator.geolocation) { setGeoStatus('error'); return }
        setGeoStatus('loading')
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const { latitude, longitude } = pos.coords
                setForm(f => ({ ...f, locationUrl: `https://www.google.com/maps?q=${latitude},${longitude}` }))
                setGeoStatus('ok')
            },
            () => setGeoStatus('error'),
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        )
    }

    // Subir comprobante de pago (cliente anónimo → endpoint público)
    const handleUploadProof = async (file?: File | null) => {
        if (!file) return
        setUploadStatus('loading')
        try {
            const fd = new FormData()
            fd.append('file', file)
            fd.append('slug', storeSlug || '')
            const res = await fetch('/api/store-receipt', { method: 'POST', body: fd })
            const data = await res.json()
            if (!res.ok) throw new Error(data?.error || 'Error')
            setForm(f => ({ ...f, proofUrl: data.url }))
            setUploadStatus('ok')
        } catch {
            setUploadStatus('error')
        }
    }

    if (!isOpen) return null

    const handleSendOrder = () => {
        const cleanPhone = storeWhatsapp.replace(/\D/g, '')
        if (!cleanPhone) {
            alert('Esta tienda no tiene un número de WhatsApp configurado. Contacta al administrador.')
            return
        }
        const displayName = (storeName || 'Tienda').trim()
        const fullProofUrl = form.proofUrl ? (form.proofUrl.startsWith('http') ? form.proofUrl : `${window.location.origin}${form.proofUrl}`) : ''

        const cs = (c: string) => c === 'PEN' ? 'S/' : c === 'BOB' ? 'Bs' : c === 'VES' ? 'Bs.S' : c === 'EUR' ? '€' : '$'
        const cur = cart[0]?.currency || 'USD'
        const money = (n: number) => `${cs(cur)} ${Number(n).toLocaleString()}`

        // Cada producto: cantidad, nombre y SUBTOTAL de la línea (con precio c/u si hay más de 1)
        const productLines = cart.map(i => {
            const lineTotal = i.price * i.quantity
            const unit = i.quantity > 1 ? ` (${cs(i.currency)} ${Number(i.price).toLocaleString()} c/u)` : ''
            const pv = (isMLM && i.points) ? `  ✨ +${i.points * i.quantity} PV` : ''
            return `• ${i.quantity}× ${i.name} — ${cs(i.currency)} ${Number(lineTotal).toLocaleString()}${unit}${pv}`
        }).join('\n')

        // Se arma por líneas y se omite todo lo que esté vacío (más claro de leer).
        const L: string[] = []
        L.push('🛍️ *NUEVO PEDIDO*')
        L.push(`🏪 ${displayName}`)
        L.push('')
        L.push('*🧾 PEDIDO*')
        L.push(productLines)
        if (isMLM && totalPoints > 0) L.push(`✨ Puntos PV: *${totalPoints} PV*`)
        L.push(`💰 *TOTAL: ${money(totalPrice)}*`)
        L.push('')
        L.push('*👤 CLIENTE*')
        L.push(`Nombre: ${form.name}`)
        L.push(`Teléfono: ${form.phone}`)
        L.push('')
        L.push('*📍 ENTREGA*')
        L.push(`Ciudad: ${form.city}`)
        L.push(`Dirección: ${form.street1}`)
        if (form.street2) L.push(`Entre calles: ${form.street2}`)
        if (form.houseNum) L.push(`N° de casa: ${form.houseNum}`)
        if (form.locationUrl) L.push(`📍 Ubicación en mapa: ${form.locationUrl}`)
        if (form.instructions) L.push(`Indicaciones: ${form.instructions}`)
        L.push('')
        L.push('*💳 PAGO*')
        if (form.paymentMethod === 'CASH') {
            L.push('Efectivo — pago al recibir 💵')
        } else {
            L.push('Transferencia / QR 🏦')
            L.push(fullProofUrl ? `Comprobante: ${fullProofUrl}` : '⚠️ Comprobante: lo envío en este chat')
        }
        L.push('')
        L.push(`¡Hola ${displayName}! Te dejo mi pedido 🙌 ${form.paymentMethod === 'QR'
            ? (fullProofUrl ? 'Ya pagué y adjunté el comprobante.' : 'Ya realicé el pago, enseguida envío el comprobante.')
            : 'Pagaré en efectivo al recibir.'} ¿Cómo coordinamos la entrega?`)

        const message = L.join('\n')

        const link = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`
        window.open(link, '_blank')
        clearCart()
        setStep('SUCCESS')
    }

    return (
        <div className="fixed inset-0 z-[100] flex justify-end">
            <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={onClose} />

            <div className="relative w-full max-w-md bg-white h-screen shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                {/* Header */}
                <div className="px-4 py-3 sm:px-6 sm:py-4 border-b-2 border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-slate-950 text-white rounded-xl flex items-center justify-center">
                            <ShoppingCart size={18} />
                        </div>
                        <h2 className="text-lg font-black text-slate-900 tracking-tight">Mi Carrito</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-full transition-colors">
                        <X size={22} className="text-slate-400" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6 custom-scrollbar">
                    {cart.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-200">
                                <ShoppingCart size={40} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">Carrito vacío</h3>
                                <p className="text-sm text-slate-400">Aún no has añadido nada a tu pedido.</p>
                            </div>
                        </div>
                    ) : step === 'ITEMS' ? (
                        <div className="space-y-3">
                            {cart.map(item => (
                                <div key={item.id} className="flex gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-xl overflow-hidden border border-slate-200 flex-shrink-0">
                                        {item.image ? (
                                            <img src={item.image} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-slate-200"><ShoppingCart size={20} /></div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-bold text-slate-900 text-sm leading-tight mb-1 line-clamp-2">{item.name}</h4>
                                        <p className="text-xs font-black text-slate-500 mb-2">{item.currency} {item.price.toLocaleString()}</p>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-1 bg-white rounded-lg px-1 py-0.5 border border-slate-200">
                                                <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="p-1.5 text-slate-500 hover:text-slate-900 active:scale-90 transition-all"><Minus size={12} /></button>
                                                <span className="text-sm font-black text-slate-900 w-5 text-center">{item.quantity}</span>
                                                <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="p-1.5 text-slate-500 hover:text-slate-900 active:scale-90 transition-all"><Plus size={12} /></button>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {isMLM && item.points ? (
                                                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">+{item.points * item.quantity}PV</span>
                                                ) : null}
                                                <button onClick={() => removeFromCart(item.id)} className="p-1.5 text-slate-300 hover:text-red-500 transition-colors">
                                                    <Trash2 size={15} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : step === 'SUCCESS' ? (
                        <div className="h-full flex flex-col items-center justify-center text-center space-y-6 py-10 animate-in fade-in duration-500">
                            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center">
                                <CheckCircle2 size={40} className="text-green-500" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-900 mb-2">¡Pedido Enviado!</h3>
                                <p className="text-sm text-slate-400 leading-relaxed">Tu pedido fue enviado por WhatsApp. El vendedor te contactará pronto para coordinar la entrega.</p>
                            </div>
                            <button
                                onClick={() => { setStep('ITEMS'); onClose(); }}
                                className="px-6 py-3 bg-slate-950 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all"
                            >
                                Cerrar
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-5 animate-in fade-in duration-500">
                            <div className="space-y-3">
                                <h3 className="text-[11px] font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
                                    <User size={13} /> Datos de Cliente
                                </h3>
                                <input
                                    placeholder="Nombre completo *"
                                    className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-800 transition-all outline-none"
                                    value={form.name}
                                    onChange={e => setForm({ ...form, name: e.target.value })}
                                />
                                <input
                                    placeholder="Teléfono / WhatsApp *"
                                    type="tel"
                                    className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-800 transition-all outline-none"
                                    value={form.phone}
                                    onChange={e => setForm({ ...form, phone: e.target.value })}
                                />
                                <input
                                    placeholder="Ciudad / Localidad *"
                                    className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-800 transition-all outline-none"
                                    value={form.city}
                                    onChange={e => setForm({ ...form, city: e.target.value })}
                                />
                            </div>

                            <div className="space-y-3">
                                <h3 className="text-[11px] font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
                                    <MapPin size={13} /> Dirección de Envío
                                </h3>
                                <input
                                    placeholder="Calle / Dirección Principal *"
                                    className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-800 transition-all outline-none"
                                    value={form.street1}
                                    onChange={e => setForm({ ...form, street1: e.target.value })}
                                />
                                <input
                                    placeholder="Entre calles (opcional)"
                                    className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-800 transition-all outline-none"
                                    value={form.street2}
                                    onChange={e => setForm({ ...form, street2: e.target.value })}
                                />
                                <input
                                    placeholder="Nro de casa (opcional)"
                                    className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-800 transition-all outline-none"
                                    value={form.houseNum}
                                    onChange={e => setForm({ ...form, houseNum: e.target.value })}
                                />

                                {/* Ubicación: 2 opciones (GPS o elegir en el mapa) */}
                                {!form.locationUrl ? (
                                    <>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button
                                                type="button"
                                                onClick={handleGetLocation}
                                                disabled={geoStatus === 'loading'}
                                                className="flex flex-col items-center justify-center gap-1.5 py-3.5 rounded-xl border-2 border-slate-300 bg-white text-slate-700 hover:border-slate-800 transition-all disabled:opacity-60"
                                            >
                                                <Navigation size={18} className={geoStatus === 'loading' ? 'animate-pulse' : ''} />
                                                <span className="text-[10px] font-black uppercase tracking-wide text-center leading-tight">
                                                    {geoStatus === 'loading' ? 'Obteniendo...' : 'Ubicación exacta (GPS)'}
                                                </span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setMapOpen(true)}
                                                className="flex flex-col items-center justify-center gap-1.5 py-3.5 rounded-xl border-2 border-slate-300 bg-white text-slate-700 hover:border-slate-800 transition-all"
                                            >
                                                <MapPin size={18} />
                                                <span className="text-[10px] font-black uppercase tracking-wide text-center leading-tight">Seleccionar en mapa</span>
                                            </button>
                                        </div>
                                        <p className="text-[11px] text-slate-400 text-center">📍 Comparte tu ubicación para una entrega más exacta (opcional).</p>
                                        {geoStatus === 'error' && (
                                            <div className="bg-amber-50 border-2 border-amber-300 rounded-xl px-3 py-2.5 text-center">
                                                <p className="text-[11px] font-bold text-amber-700">No pudimos acceder a tu ubicación.</p>
                                                <p className="text-[11px] text-amber-600 mt-0.5">Activa el permiso de ubicación de tu navegador, o toca “Seleccionar en mapa” para marcarla a mano.</p>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="bg-green-50 border-2 border-green-500 rounded-xl p-3 space-y-2.5">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-black text-green-700 flex items-center gap-1.5"><CheckCircle2 size={16} /> Ubicación guardada</span>
                                            <button type="button" onClick={() => { setForm(f => ({ ...f, locationUrl: '' })); setGeoStatus('idle') }} className="text-[11px] text-slate-400 underline">Quitar</button>
                                        </div>
                                        <p className="text-[11px] text-green-600 break-all">
                                            {(() => { const m = form.locationUrl.match(/q=([-\d.]+),([-\d.]+)/); return m ? `Coordenadas: ${(+m[1]).toFixed(5)}, ${(+m[2]).toFixed(5)}` : 'Ubicación marcada en el mapa' })()}
                                        </p>
                                        <div className="grid grid-cols-2 gap-2">
                                            <a href={form.locationUrl} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-white border-2 border-green-500 text-green-700 text-[11px] font-black uppercase tracking-wide">
                                                <MapPin size={13} /> Ver en mapa
                                            </a>
                                            <button type="button" onClick={() => setMapOpen(true)} className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-white border-2 border-slate-200 text-slate-600 text-[11px] font-black uppercase tracking-wide">
                                                Cambiar
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-3">
                                <h3 className="text-[11px] font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
                                    <ClipboardList size={13} /> Instrucciones (opcional)
                                </h3>
                                <textarea
                                    placeholder="Ej: Tocar timbre, dejar en portería..."
                                    className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-800 transition-all outline-none h-20 resize-none"
                                    value={form.instructions}
                                    onChange={e => setForm({ ...form, instructions: e.target.value })}
                                />
                            </div>

                            {/* Payment Selection */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-black text-slate-950 uppercase tracking-widest flex items-center gap-2">
                                    <Wallet size={14} /> Método de Pago
                                </h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setForm({ ...form, paymentMethod: 'CASH' })}
                                        className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${form.paymentMethod === 'CASH'
                                            ? 'border-slate-950 bg-slate-950 text-white shadow-lg'
                                            : 'border-slate-100 bg-slate-50 text-slate-400'
                                            }`}
                                    >
                                        <Banknote size={20} />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Efectivo</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setForm({ ...form, paymentMethod: 'QR' })}
                                        className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${form.paymentMethod === 'QR'
                                            ? 'border-slate-950 bg-slate-950 text-white shadow-lg'
                                            : 'border-slate-100 bg-slate-50 text-slate-400'
                                            }`}
                                    >
                                        <QrCode size={20} />
                                        <span className="text-[10px] font-black uppercase tracking-widest">QR / Transf.</span>
                                    </button>
                                </div>

                                {form.paymentMethod === 'QR' && (
                                    <div className="p-6 bg-slate-900 rounded-[32px] text-white space-y-6 animate-in slide-in-from-bottom duration-500">
                                        {paymentQrUrl ? (
                                            <div className="space-y-4 text-center">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Escanea para pagar</p>
                                                <div className="bg-white p-4 rounded-3xl inline-block shadow-2xl">
                                                    <img src={paymentQrUrl} className="w-48 h-48 object-contain" />
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-center py-4">
                                                <p className="text-xs text-slate-400">Solicita los datos de transferencia por WhatsApp.</p>
                                            </div>
                                        )}

                                        {/* Subir comprobante de pago */}
                                        <div className="space-y-3">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">¿Ya pagaste? Sube tu comprobante</p>

                                            {form.proofUrl ? (
                                                <div className="space-y-2">
                                                    <div className="bg-white p-2 rounded-2xl">
                                                        <img src={form.proofUrl} className="w-full max-h-52 object-contain rounded-xl" />
                                                    </div>
                                                    <p className="text-[11px] text-green-400 text-center font-bold flex items-center justify-center gap-1">
                                                        <CheckCircle2 size={13} /> Comprobante adjuntado
                                                    </p>
                                                    <label className="block text-center text-[11px] font-bold text-slate-300 underline cursor-pointer">
                                                        Cambiar comprobante
                                                        <input type="file" accept="image/*" className="hidden" onChange={e => handleUploadProof(e.target.files?.[0])} />
                                                    </label>
                                                </div>
                                            ) : (
                                                <label className={`flex flex-col items-center justify-center gap-2 py-6 px-3 rounded-2xl border-2 border-dashed cursor-pointer transition-all ${uploadStatus === 'loading' ? 'border-slate-500 bg-slate-800' : 'border-slate-600 bg-slate-800/40 hover:bg-slate-800'}`}>
                                                    <UploadCloud size={26} className="text-slate-400" />
                                                    <span className="text-xs font-bold text-slate-200 text-center">
                                                        {uploadStatus === 'loading' ? 'Subiendo comprobante...' : 'Toca para subir la foto del comprobante'}
                                                    </span>
                                                    <span className="text-[10px] text-slate-500">JPG, PNG o WEBP · máx. 6 MB</span>
                                                    <input type="file" accept="image/*" className="hidden" disabled={uploadStatus === 'loading'} onChange={e => handleUploadProof(e.target.files?.[0])} />
                                                </label>
                                            )}

                                            {uploadStatus === 'error' && (
                                                <p className="text-[11px] text-red-400 text-center">No se pudo subir. Intenta otra vez o envía la captura por WhatsApp.</p>
                                            )}
                                            <p className="text-[11px] text-slate-400 leading-relaxed text-center">El comprobante se adjuntará a tu pedido en WhatsApp.</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {cart.length > 0 && step !== 'SUCCESS' && (
                    <div className="px-4 py-4 sm:p-6 bg-white border-t border-slate-100 space-y-4">
                        <div className="flex flex-col gap-1">
                            {isMLM && totalPoints > 0 && (
                                <div className="flex items-center justify-between text-blue-600 mb-2 bg-blue-50/50 p-3 rounded-2xl border border-blue-100/50">
                                    <span className="text-[10px] font-black uppercase tracking-widest">Puntos PV Totales</span>
                                    <span className="text-xl font-black">+{totalPoints} PV</span>
                                </div>
                            )}
                            <div className="flex items-center justify-between text-slate-900 px-1">
                                <span className="text-sm font-bold opacity-40 uppercase tracking-widest">Total Estimado</span>
                                <span className="text-2xl sm:text-3xl font-black tracking-tighter">
                                    {(cart[0]?.currency === 'PEN' ? 'S/' :
                                        cart[0]?.currency === 'BOB' ? 'Bs' :
                                            cart[0]?.currency === 'VES' ? 'Bs.S' :
                                                cart[0]?.currency === 'EUR' ? '€' : '$')}
                                    {totalPrice.toLocaleString()}
                                </span>
                            </div>
                        </div>

                        {step === 'ITEMS' ? (
                            <button
                                onClick={() => setStep('CHECKOUT')}
                                className="w-full bg-slate-950 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
                            >
                                Continuar con el Pedido
                            </button>
                        ) : (
                            <div className="flex flex-col gap-3">
                                <button
                                    disabled={!form.name || !form.phone || !form.city || !form.street1}
                                    onClick={handleSendOrder}
                                    className="w-full bg-[#25D366] text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-[#20ba5a] transition-all shadow-xl shadow-green-100 flex items-center justify-center gap-2 disabled:opacity-50 disabled:grayscale"
                                >
                                    <MessageCircle size={18} /> Finalizar en WhatsApp
                                </button>
                                <button
                                    onClick={() => setStep('ITEMS')}
                                    className="text-xs font-black text-slate-400 uppercase tracking-widest py-2"
                                >
                                    Volver al Carrito
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Selector de ubicación en el mapa */}
            <LocationPicker
                isOpen={mapOpen}
                onClose={() => setMapOpen(false)}
                initial={initialCoords}
                onSelect={(url) => { setForm(f => ({ ...f, locationUrl: url })); setGeoStatus('ok') }}
            />
        </div>
    )
}
