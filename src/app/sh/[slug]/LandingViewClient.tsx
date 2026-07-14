'use client'

import { useState } from 'react'
import { ShoppingCart, Star, Plus, Minus, ChevronDown, ChevronUp, ShoppingBag } from 'lucide-react'
import { ProductImageGallery } from './ProductImageGallery'
import { useCart } from './CartContext'

export function LandingViewClient({ store, product, phone, onOpenCart }: any) {
    const [quantity, setQuantity] = useState(1)
    const [showFullDesc, setShowFullDesc] = useState(false)
    const [added, setAdded] = useState(false)
    const { addToCart, totalItems } = useCart()
    const isMLM = store.type === 'NETWORK_MARKETING'

    const handleAddToCart = () => {
        addToCart({
            id: product.id,
            name: product.name,
            price: Number(product.price),
            currency: product.currency,
            quantity: quantity,
            image: product.images?.[0]
        })
        setAdded(true)
        setTimeout(() => setAdded(false), 2000)
    }

    return (
        <div className="bg-white min-h-screen">
            {/* Header Flotante para Landing */}
            <header className="fixed top-0 left-0 right-0 z-50 px-6 py-6 pointer-events-none">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div className="bg-white/80 backdrop-blur-md px-4 py-2 rounded-2xl border border-slate-100 shadow-xl pointer-events-auto">
                        <h1 className="text-lg font-black tracking-tighter text-slate-900 uppercase italic">
                            {store.name}
                        </h1>
                    </div>
                    <button
                        onClick={onOpenCart}
                        className="relative p-3 bg-slate-950 text-white rounded-2xl shadow-2xl cursor-pointer hover:scale-110 transition-transform group pointer-events-auto"
                    >
                        <ShoppingBag size={22} />
                        {totalItems > 0 && (
                            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-black w-6 h-6 rounded-full border-2 border-white flex items-center justify-center animate-bounce">
                                {totalItems}
                            </span>
                        )}
                    </button>
                </div>
            </header>

            <div className="max-w-6xl mx-auto px-6 py-20 lg:py-32">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center mt-10 sm:mt-0">
                    <div className="order-2 lg:order-1 space-y-10">
                        <div>
                            <span className="bg-slate-950 text-white px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.3em] mb-8 inline-block shadow-2xl">
                                {isMLM ? 'Producto Estrella' : 'Producto Destacado'}
                            </span>
                            <h1 className="text-6xl lg:text-8xl font-black text-slate-950 leading-[0.9] tracking-tighter mb-8 italic">
                                {product.name}
                            </h1>
                            {isMLM && product.points > 0 && (
                                <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-600 px-4 py-2 rounded-xl font-black text-xs uppercase tracking-widest mb-6 border border-blue-100">
                                    <Star size={14} /> VALOR: {product.points} PV
                                </div>
                            )}

                            <div className="max-w-xl">
                                <p className={`text-slate-500 text-xl lg:text-2xl font-medium leading-relaxed transition-all duration-500 ${showFullDesc ? '' : 'line-clamp-3'}`}>
                                    {product.description || 'La pieza maestra que tu estilo de vida necesita. Calidad superior con entrega inmediata.'}
                                </p>
                                {product.description?.length > 100 && (
                                    <button
                                        onClick={() => setShowFullDesc(!showFullDesc)}
                                        className="text-xs font-black text-slate-900 mt-4 flex items-center gap-2 uppercase tracking-widest hover:text-blue-600 outline-none"
                                    >
                                        {showFullDesc ? 'Cerrar detalles' : 'Ver descripción completa'}
                                        {showFullDesc ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-col gap-6">
                            <div className="p-10 rounded-[50px] bg-slate-50 border border-slate-100 shadow-inner">
                                <div className="flex items-center justify-between mb-8 pb-8 border-b border-slate-200/50">
                                    <span className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Elegir Cantidad</span>
                                    <div className="flex items-center gap-4">
                                        <button
                                            onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                            className="w-12 h-12 flex items-center justify-center bg-white rounded-2xl border border-slate-200 text-slate-900 hover:bg-slate-100 transition-all shadow-sm active:scale-90"
                                        >
                                            <Minus size={20} />
                                        </button>
                                        <span className="text-3xl font-black text-slate-950 w-10 text-center">{quantity}</span>
                                        <button
                                            onClick={() => setQuantity(quantity + 1)}
                                            className="w-12 h-12 flex items-center justify-center bg-white rounded-2xl border border-slate-200 text-slate-900 hover:bg-slate-100 transition-all shadow-sm active:scale-90"
                                        >
                                            <Plus size={20} />
                                        </button>
                                    </div>
                                </div>

                                <div className="text-7xl font-black text-slate-950 text-center tracking-tighter mb-10 flex flex-col items-center">
                                    <span className="text-2xl text-slate-300 line-through mb-2 font-black">
                                        {product.currency === 'PEN' ? 'S/' :
                                            product.currency === 'BOB' ? 'Bs' :
                                                product.currency === 'VES' ? 'Bs.S' :
                                                    product.currency === 'EUR' ? '€' : '$'}
                                        {((product.price * quantity) * 1.5).toFixed(0)}
                                    </span>
                                    <p className="flex items-center">
                                        {product.currency === 'PEN' ? 'S/' :
                                            product.currency === 'BOB' ? 'Bs' :
                                                product.currency === 'VES' ? 'Bs.S' :
                                                    product.currency === 'EUR' ? '€' : '$'}
                                        {(product.price * quantity).toLocaleString()}
                                    </p>
                                </div>
                                <button
                                    onClick={handleAddToCart}
                                    className={`w-full py-8 rounded-[35px] font-bold text-2xl transition-all shadow-2xl flex items-center justify-center gap-4 group active:scale-[0.97] ${added ? 'bg-green-500 text-white' : 'bg-slate-950 text-white hover:bg-slate-800'
                                        }`}
                                >
                                    <ShoppingCart size={28} className={added ? 'animate-bounce' : 'group-hover:rotate-12 transition-transform'} />
                                    {added ? '¡PRODUCTO AÑADIDO!' : 'AÑADIR AL CARRITO'}
                                </button>
                                <p className="text-center text-slate-400 text-xs font-bold uppercase tracking-widest mt-6">✓ Pago seguro contra entrega</p>
                            </div>
                        </div>
                    </div>

                    <div className="order-1 lg:order-2">
                        <div className="relative rounded-[60px] overflow-hidden shadow-[0_80px_100px_-30px_rgba(0,0,0,0.2)] group">
                            <ProductImageGallery images={product.images} name={product.name} />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
