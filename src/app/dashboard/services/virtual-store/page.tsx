'use client'

import { useState, useEffect } from 'react'
import { STORE_THEMES, STORE_FONTS, resolveStoreTheme } from '@/lib/store-themes'
import {
    ShoppingCart,
    Plus,
    Globe,
    Settings,
    ExternalLink,
    Store,
    Layout as LayoutIcon,
    Trash2,
    Save,
    X,
    Loader2,
    ShoppingBag,
    Package,
    ChevronRight,
    Edit3,
    ArrowLeft,
    Star,
    Share2,
    Check,
} from 'lucide-react'
import Link from 'next/link'
import { usePlanGuard } from '@/hooks/usePlanGuard'

interface Product {
    id: string
    name: string
    description: string | null
    category: string | null
    price: number
    pricePromo: number | null
    currency: string
    points: number | null
    stock: number
    images: string[]
    active: boolean
}

interface StoreRecord {
    id: string
    name: string
    slug: string
    type: 'CATALOG' | 'LANDING' | 'NETWORK_MARKETING' | 'GENERAL_BUSINESS'
    whatsappNumber: string | null
    paymentQrUrl: string | null
    bannerUrl: string | null
    themeConfig: { bannerUrl2?: string; theme?: { preset?: string; font?: string; primary?: string } } | null
    active: boolean
    description: string | null
    sharedByUsername?: string | null
    _count?: { products: number }
}

// Paleta cinematográfica para los previews de tienda (deep navy/blue/purple)
const STORE_PALETTES: Array<{ a: string; b: string; c: string; accent: string }> = [
    { a: '#0E1A38', b: '#1F3A78', c: '#3F75C4', accent: '#7FBEF0' }, // Deep Ocean
    { a: '#0B2030', b: '#114060', c: '#2575B0', accent: '#86DAEC' }, // Petroleum Glow
    { a: '#0E1228', b: '#1F2358', c: '#3D448C', accent: '#9DACEC' }, // Cosmic Navy
    { a: '#17132F', b: '#2D2070', c: '#5238A8', accent: '#A89BEC' }, // Royal Twilight
    { a: '#101536', b: '#222D78', c: '#4154B8', accent: '#B0BDEC' }, // Aurora Indigo
    { a: '#130E28', b: '#2A235E', c: '#4F3F94', accent: '#C8AEEC' }, // Smoked Violet
]
function paletteForStore(id: string) {
    let h = 0
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
    return STORE_PALETTES[h % STORE_PALETTES.length]
}
function storeTypeLabel(t: StoreRecord['type']) {
    if (t === 'NETWORK_MARKETING') return 'Network Marketing'
    if (t === 'GENERAL_BUSINESS') return 'Mi Negocio'
    if (t === 'LANDING') return 'Landing Pro'
    return 'Catálogo'
}

function ShareStoreModal({ store, onClose }: { store: StoreRecord; onClose: () => void }) {
    const [identifier, setIdentifier] = useState('')
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)

    async function handleShare(e: React.FormEvent) {
        e.preventDefault()
        if (!identifier.trim()) return
        setLoading(true)
        setResult(null)
        try {
            const res = await fetch(`/api/stores/${store.id}/share`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identifier: identifier.trim() }),
            })
            const data = await res.json()
            setResult({ ok: res.ok, message: data.message || data.error })
            if (res.ok) setTimeout(onClose, 2000)
        } catch {
            setResult({ ok: false, message: 'Error al compartir la tienda' })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <div className="bg-[#F4F6FA] border border-[#E4E9F0] rounded-3xl w-full max-w-sm p-6">
                <div className="flex items-center justify-between mb-5">
                    <div>
                        <h2 className="text-lg font-bold">Compartir tienda</h2>
                        <p className="text-xs text-[#6B7280] mt-0.5">{store.name}</p>
                    </div>
                    <button onClick={onClose}><X size={20} className="text-[#6B7280]" /></button>
                </div>

                <form onSubmit={handleShare} className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-[#6B7280] uppercase tracking-widest block mb-2">
                            Username o email del destinatario
                        </label>
                        <input
                            value={identifier}
                            onChange={e => setIdentifier(e.target.value)}
                            placeholder="@usuario o correo@email.com"
                            className="w-full bg-white border border-purple-500/25 rounded-xl px-4 py-3 text-[#111827] placeholder-dark-500 focus:border-[#233B8F] outline-none transition-all text-sm"
                            autoFocus
                        />
                    </div>

                    {result && (
                        <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm ${result.ok ? 'bg-[#16A34A]/10 text-[#16A34A] border border-[#16A34A]/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                            {result.ok ? <Check size={14} /> : <X size={14} />}
                            {result.message}
                        </div>
                    )}

                    <p className="text-xs text-[#9CA3AF]">
                        El destinatario recibirá una copia independiente de la tienda con todos sus productos. Podrá modificarla sin afectar la tuya.
                    </p>

                    <div className="flex gap-3 pt-1">
                        <button type="button" onClick={onClose} className="flex-1 py-3 text-[#374151] font-bold rounded-xl border border-purple-500/25 hover:bg-[#F4F6FA] transition-all text-sm">
                            Cancelar
                        </button>
                        <button type="submit" disabled={loading} className="flex-1 py-3 bg-gradient-to-r from-[#FF2D95] via-[#B735B8] to-[#233B8F] text-white font-bold rounded-xl disabled:opacity-50 flex items-center justify-center gap-2 text-sm transition-all">
                            {loading ? <Loader2 size={14} className="animate-spin" /> : <Share2 size={14} />}
                            Compartir
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default function VirtualStorePage() {
    usePlanGuard()
    const [stores, setStores] = useState<StoreRecord[]>([])
    const [loading, setLoading] = useState(true)
    const [view, setView] = useState<'STORES' | 'PRODUCTS'>('STORES')
    const [selectedStore, setSelectedStore] = useState<StoreRecord | null>(null)
    const [products, setProducts] = useState<Product[]>([])
    const [productsLoading, setProductsLoading] = useState(false)

    const [showStoreModal, setShowStoreModal] = useState(false)
    const [showProductModal, setShowProductModal] = useState(false)
    const [editProduct, setEditProduct] = useState<Product | null>(null)
    const [sharingStore, setSharingStore] = useState<StoreRecord | null>(null)

    // Store Form
    const [storeName, setStoreName] = useState('')
    const [storeSlug, setStoreSlug] = useState('')
    const [storeType, setStoreType] = useState<'CATALOG' | 'LANDING' | 'NETWORK_MARKETING' | 'GENERAL_BUSINESS'>('GENERAL_BUSINESS')
    const [storeWhatsapp, setStoreWhatsapp] = useState('')
    const [storeQr, setStoreQr] = useState('')
    const [storeBanner1, setStoreBanner1] = useState('')
    const [storeBanner2, setStoreBanner2] = useState('')
    const [storeThemePreset, setStoreThemePreset] = useState('neon-dark')
    const [storeThemeFont, setStoreThemeFont] = useState('')
    const [storeThemePrimary, setStoreThemePrimary] = useState('')
    const [editStore, setEditStore] = useState<StoreRecord | null>(null)

    // Product Form
    const [prodName, setProdName] = useState('')
    const [prodPrice, setProdPrice] = useState('')
    const [prodPromo, setProdPromo] = useState('')
    const [prodCurrency, setProdCurrency] = useState('USD')
    const [prodPoints, setProdPoints] = useState('0')
    const [prodCategory, setProdCategory] = useState('General')
    const [prodStock, setProdStock] = useState('0')
    const [prodDesc, setProdDesc] = useState('')
    const [prodImages, setProdImages] = useState<string[]>([])
    const [uploading, setUploading] = useState(false)

    useEffect(() => {
        fetchStores()
    }, [])

    const fetchStores = async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/stores')
            const data = await res.json()
            setStores(data.stores || [])
        } catch (err) {
            console.error('Error fetching stores:', err)
        } finally {
            setLoading(false)
        }
    }

    const fetchProducts = async (storeId: string) => {
        setProductsLoading(true)
        try {
            const res = await fetch(`/api/stores/${storeId}/products`)
            const data = await res.json()
            setProducts(data.products || [])
        } catch (err) {
            console.error('Error fetching products:', err)
        } finally {
            setProductsLoading(false)
        }
    }

    const handleSaveStore = async (e: React.FormEvent) => {
        e.preventDefault()
        const method = editStore ? 'PATCH' : 'POST'
        const url = editStore ? `/api/stores/${editStore.id}` : '/api/stores'

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: storeName,
                    slug: storeSlug.replace(/\s+/g, '-').toLowerCase(),
                    type: storeType,
                    whatsappNumber: storeWhatsapp,
                    paymentQrUrl: storeQr,
                    bannerUrl: storeBanner1 || null,
                    themeConfig: {
                        bannerUrl2: storeBanner2 || undefined,
                        theme: {
                            preset: storeThemePreset,
                            font: storeThemeFont || undefined,
                            primary: storeThemePrimary || undefined,
                        },
                    }
                })
            })
            const data = await res.json()
            if (res.ok) {
                if (editStore) {
                    setStores(stores.map(s => s.id === data.store.id ? data.store : s))
                } else {
                    setStores([data.store, ...stores])
                }
                setShowStoreModal(false)
                resetStoreForm()
            } else {
                const msg = data.details ? `${data.error}: ${data.details}` : data.error
                alert(msg)
            }
        } catch (err) { alert('Error al guardar tienda') }
    }

    const resetStoreForm = () => {
        setEditStore(null)
        setStoreName('')
        setStoreSlug('')
        setStoreType('GENERAL_BUSINESS')
        setStoreWhatsapp('')
        setStoreQr('')
        setStoreBanner1('')
        setStoreBanner2('')
        setStoreThemePreset('neon-dark')
        setStoreThemeFont('')
        setStoreThemePrimary('')
    }

    const convertStoreType = async (store: StoreRecord) => {
        const newType = store.type === 'NETWORK_MARKETING' ? 'GENERAL_BUSINESS' : 'NETWORK_MARKETING'
        const label = newType === 'GENERAL_BUSINESS' ? 'Mi Negocio (General)' : 'Network Marketing (PV)'
        if (!confirm(
            `¿Crear una copia de "${store.name}" como ${label}?\n\n` +
            `• La tienda original NO se modificará.\n` +
            `• La copia se creará como BORRADOR (inactiva).\n` +
            `• Tendrás que activarla manualmente desde el panel cuando esté lista para publicar.`
        )) return
        try {
            const res = await fetch(`/api/stores/${store.id}/clone`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: newType }),
            })
            const data = await res.json()
            if (res.ok) {
                setStores(prev => [...prev, data.store])
            } else {
                alert(data.error || 'Error al crear copia')
            }
        } catch {
            alert('Error al crear copia de la tienda')
        }
    }

    const handleSaveProduct = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedStore) return

        const url = editProduct
            ? `/api/stores/${selectedStore.id}/products/${editProduct.id}`
            : `/api/stores/${selectedStore.id}/products`

        const method = editProduct ? 'PATCH' : 'POST'

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: prodName,
                    price: prodPrice,
                    pricePromo: prodPromo || null,
                    currency: prodCurrency,
                    points: prodPoints,
                    category: prodCategory,
                    stock: prodStock,
                    description: prodDesc,
                    images: prodImages
                })
            })
            const data = await res.json()
            if (res.ok) {
                if (editProduct) {
                    setProducts(products.map(p => p.id === data.product.id ? data.product : p))
                } else {
                    setProducts([data.product, ...products])
                }
                setShowProductModal(false)
                resetProductForm()
            } else alert(data.error)
        } catch (err) { alert('Error al guardar producto') }
    }

    const resetProductForm = () => {
        setEditProduct(null)
        setProdName('')
        setProdPrice('')
        setProdPromo('')
        setProdCurrency('USD')
        setProdPoints('0')
        setProdCategory('General')
        setProdStock('0')
        setProdDesc('')
        setProdImages([])
    }

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setUploading(true)
        const formData = new FormData()
        formData.append('file', file)

        try {
            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            })
            const data = await res.json()
            if (res.ok) {
                setProdImages([...prodImages, data.url].slice(0, 4))
            } else alert(data.error)
        } catch (err) {
            alert('Error al subir imagen')
        } finally {
            setUploading(false)
        }
    }

    const openStoreProducts = (store: StoreRecord) => {
        setSelectedStore(store)
        setView('PRODUCTS')
        fetchProducts(store.id)
    }

    const deleteStore = async (id: string) => {
        if (!confirm('¿Eliminar esta tienda y todos sus productos?')) return
        const res = await fetch(`/api/stores/${id}`, { method: 'DELETE' })
        if (res.ok) setStores(stores.filter(s => s.id !== id))
        else alert('Error al eliminar la tienda')
    }

    const deleteProduct = async (id: string) => {
        if (!confirm('¿Eliminar producto?')) return
        if (!selectedStore) return
        const res = await fetch(`/api/stores/${selectedStore.id}/products/${id}`, { method: 'DELETE' })
        if (res.ok) setProducts(products.filter(p => p.id !== id))
        else alert('Error al eliminar el producto')
    }

    if (view === 'PRODUCTS' && selectedStore) {
        return (
            <div className="px-4 sm:px-6 pt-6 max-w-screen-xl mx-auto pb-20 text-[#111827]">
                <button
                    onClick={() => setView('STORES')}
                    className="flex items-center gap-2 text-[#6B7280] hover:text-[#111827] mb-8 transition-colors"
                >
                    <ArrowLeft size={18} /> Volver a mis tiendas
                </button>

                <div className="flex items-center justify-between mb-10">
                    <div>
                        <h1 className="text-3xl font-bold">Inventario: {selectedStore.name}</h1>
                        <p className="text-[#6B7280] text-sm mt-1">Gestiona los productos exclusivos de esta tienda</p>
                    </div>
                    <button
                        onClick={() => { resetProductForm(); setShowProductModal(true); }}
                        className="bg-gradient-to-r from-[#FF2D95] via-[#B735B8] to-[#233B8F] text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-[#233B8F]/90"
                    >
                        <Plus size={20} /> Añadir Producto
                    </button>
                </div>

                {productsLoading ? (
                    <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-[#233B8F]" /></div>
                ) : products.length === 0 ? (
                    <div className="bg-white/40 border border-purple-500/15 rounded-3xl p-20 text-center">
                        <Package className="w-16 h-16 text-dark-600 mx-auto mb-4" />
                        <h3 className="text-xl font-bold mb-2">No hay productos aún</h3>
                        <p className="text-[#6B7280] mb-8">Empieza a llenar tu catálogo para que tus clientes puedan comprar.</p>
                        <button onClick={() => setShowProductModal(true)} className="text-[#233B8F] font-bold border-b border-[#233B8F]/30">Subir mi primer producto</button>
                    </div>
                ) : (
                    <div className="grid grid-cols-3 md:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-6">
                        {products.map(p => (
                            <div key={p.id} className="bg-white border border-purple-500/15 rounded-2xl overflow-hidden group">
                                <div className="aspect-square bg-[#F8FAFC] flex items-center justify-center overflow-hidden">
                                    {p.images?.[0] ? (
                                        <img src={p.images[0]} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                                    ) : (
                                        <Package size={40} className="text-dark-600" />
                                    )}
                                </div>
                                <div className="p-2 sm:p-5">
                                    <div className="flex items-start justify-between mb-1 sm:mb-2 gap-1">
                                        <h3 className="font-bold text-[10px] sm:text-lg leading-tight">{p.name}</h3>
                                        <div className="flex flex-col items-end shrink-0">
                                            {p.pricePromo ? (
                                                <>
                                                    <span className="text-[9px] sm:text-xs text-[#6B7280] line-through">{p.currency === 'USD' ? '$' : p.currency + ' '}{p.price}</span>
                                                    <span className="text-orange-400 font-black text-[10px] sm:text-base">{p.currency === 'USD' ? '$' : p.currency + ' '}{p.pricePromo}</span>
                                                </>
                                            ) : (
                                                <span className="text-[#16A34A] font-black text-[10px] sm:text-base">{p.currency === 'USD' ? '$' : p.currency + ' '}{p.price}</span>
                                            )}
                                        </div>
                                    </div>
                                    <p className="text-[#6B7280] text-[9px] sm:text-xs mb-2 sm:mb-6 line-clamp-2 hidden sm:block">{p.description || 'Sin descripción'}</p>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => {
                                                setEditProduct(p);
                                                setProdName(p.name);
                                                setProdPrice(p.price.toString());
                                                setProdPromo(p.pricePromo ? p.pricePromo.toString() : '');
                                                setProdCurrency(p.currency || 'USD');
                                                setProdPoints(p.points?.toString() || '0');
                                                setProdCategory(p.category || 'General');
                                                setProdStock(p.stock.toString());
                                                setProdDesc(p.description || '');
                                                setProdImages(p.images || []);
                                                setShowProductModal(true);
                                            }}
                                            className="flex-1 bg-[#F4F6FA] hover:bg-[#EEF2F7] py-1 sm:py-2 rounded-lg text-[9px] sm:text-xs font-bold transition-all border border-purple-500/25 flex items-center justify-center gap-1"
                                        >
                                            <Edit3 size={10} /> <span className="hidden sm:inline">Editar</span>
                                        </button>
                                        <button
                                            onClick={() => deleteProduct(p.id)}
                                            className="p-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-lg transition-all border border-red-500/20"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Product Modal */}
                {showProductModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                        <div className="bg-[#F4F6FA] border border-[#E4E9F0] rounded-3xl w-full max-w-lg p-5 sm:p-8 max-h-[90vh] overflow-y-auto custom-scrollbar">
                            <h2 className="text-xl sm:text-2xl font-bold mb-5">{editProduct ? 'Editar Producto' : 'Nuevo Producto'}</h2>
                            <form onSubmit={handleSaveProduct} className="space-y-6">
                                <div>
                                    <label className="text-xs font-bold text-[#6B7280] uppercase tracking-widest block mb-2">Nombre</label>
                                    <input required value={prodName} onChange={e => setProdName(e.target.value)} className="w-full bg-white border border-purple-500/25 rounded-xl px-4 py-3 text-[#111827] placeholder-dark-500 focus:border-[#233B8F] outline-none transition-all" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-[#6B7280] uppercase tracking-widest block mb-2">Categoría</label>
                                    <div className="flex flex-col gap-3">
                                        <select
                                            value={[
                                                'Electrónica y Tecnología', 'Celulares y Accesorios', 'Computación',
                                                'Hogar y Cocina', 'Decoración', 'Muebles',
                                                'Ropa Mujer', 'Ropa Hombre', 'Ropa Infantil', 'Calzado',
                                                'Belleza y Cuidado Personal', 'Salud', 'Deportes y Fitness',
                                                'Juguetes', 'Bebés', 'Automotriz',
                                                'Herramientas y Ferretería', 'Jardín', 'Mascotas',
                                                'Oficina y Papelería', 'Videojuegos', 'Libros',
                                                'Accesorios y Joyas', 'Viajes y Maletas',
                                                'Ofertas Novedades', 'Más Vendidos', 'Ofertas', 'Liquidación', 'General'
                                            ].includes(prodCategory) ? prodCategory : 'Otra'}
                                            onChange={e => {
                                                if (e.target.value !== 'Otra') setProdCategory(e.target.value)
                                            }}
                                            className="w-full bg-white border border-purple-500/25 rounded-xl px-4 py-3 text-[#111827] placeholder-dark-500 focus:border-[#233B8F] outline-none transition-all"
                                        >
                                            <option value="General">General</option>
                                            <option value="Electrónica y Tecnología">Electrónica y Tecnología</option>
                                            <option value="Celulares y Accesorios">Celulares y Accesorios</option>
                                            <option value="Computación">Computación</option>
                                            <option value="Hogar y Cocina">Hogar y Cocina</option>
                                            <option value="Decoración">Decoración</option>
                                            <option value="Muebles">Muebles</option>
                                            <option value="Ropa Mujer">Ropa Mujer</option>
                                            <option value="Ropa Hombre">Ropa Hombre</option>
                                            <option value="Ropa Infantil">Ropa Infantil</option>
                                            <option value="Calzado">Calzado</option>
                                            <option value="Belleza y Cuidado Personal">Belleza y Cuidado Personal</option>
                                            <option value="Salud">Salud</option>
                                            <option value="Deportes y Fitness">Deportes y Fitness</option>
                                            <option value="Juguetes">Juguetes</option>
                                            <option value="Bebés">Bebés</option>
                                            <option value="Automotriz">Automotriz</option>
                                            <option value="Herramientas y Ferretería">Herramientas y Ferretería</option>
                                            <option value="Jardín">Jardín</option>
                                            <option value="Mascotas">Mascotas</option>
                                            <option value="Oficina y Papelería">Oficina y Papelería</option>
                                            <option value="Videojuegos">Videojuegos</option>
                                            <option value="Libros">Libros</option>
                                            <option value="Accesorios y Joyas">Accesorios y Joyas</option>
                                            <option value="Viajes y Maletas">Viajes y Maletas</option>
                                            <option value="Ofertas Novedades">Ofertas Novedades</option>
                                            <option value="Más Vendidos">Más Vendidos</option>
                                            <option value="Ofertas">Ofertas</option>
                                            <option value="Liquidación">Liquidación</option>
                                            <option value="Otra">Otra (escribir...)</option>
                                        </select>
                                        {(![
                                            'Electrónica y Tecnología', 'Celulares y Accesorios', 'Computación',
                                            'Hogar y Cocina', 'Decoración', 'Muebles',
                                            'Ropa Mujer', 'Ropa Hombre', 'Ropa Infantil', 'Calzado',
                                            'Belleza y Cuidado Personal', 'Salud', 'Deportes y Fitness',
                                            'Juguetes', 'Bebés', 'Automotriz',
                                            'Herramientas y Ferretería', 'Jardín', 'Mascotas',
                                            'Oficina y Papelería', 'Videojuegos', 'Libros',
                                            'Accesorios y Joyas', 'Viajes y Maletas',
                                            'Ofertas Novedades', 'Más Vendidos', 'Ofertas', 'Liquidación', 'General'
                                        ].includes(prodCategory) || prodCategory === 'Otra') && (
                                                <input
                                                    value={prodCategory === 'Otra' ? '' : prodCategory}
                                                    onChange={e => setProdCategory(e.target.value)}
                                                    placeholder="Nombre de categoría personalizada..."
                                                    className="w-full bg-white border border-[#233B8F]/20 text-[#233B8F] rounded-xl px-4 py-3 focus:border-[#233B8F] outline-none transition-all placeholder:text-[#233B8F]/30"
                                                />
                                            )}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-[#6B7280] uppercase tracking-widest block">Moneda</label>
                                    <select
                                        value={prodCurrency}
                                        onChange={e => setProdCurrency(e.target.value)}
                                        className="w-full bg-white border border-purple-500/25 rounded-xl px-4 py-3 text-sm text-[#111827] focus:border-[#233B8F] outline-none transition-all"
                                    >
                                        <option value="USD">USD ($)</option>
                                        <option value="PEN">PEN (S/)</option>
                                        <option value="COP">COP ($)</option>
                                        <option value="MXN">MXN ($)</option>
                                        <option value="ARS">ARS ($)</option>
                                        <option value="CLP">CLP ($)</option>
                                        <option value="BOB">BOB (Bs)</option>
                                        <option value="VES">VES (Bs.S)</option>
                                        <option value="EUR">EUR (€)</option>
                                    </select>
                                </div>
                                <div className="flex flex-col sm:flex-row gap-4">
                                    <div className="flex-1 space-y-2">
                                        <label className="text-xs font-bold text-[#6B7280] uppercase tracking-widest block">Precio Normal</label>
                                        <input required type="number" step="0.01" placeholder="0.00" value={prodPrice} onChange={e => setProdPrice(e.target.value)} className="w-full bg-white border border-purple-500/25 rounded-xl px-4 py-3 focus:border-[#233B8F] outline-none transition-all" />
                                    </div>
                                    <div className="flex-1 space-y-2">
                                        <label className="text-xs font-bold text-orange-400/70 uppercase tracking-widest block flex items-center gap-1.5">
                                            <span className="text-[9px] px-1.5 py-0.5 bg-orange-500/20 border border-orange-500/30 rounded-full text-orange-400">OFERTA</span>
                                            Precio Promoción
                                        </label>
                                        <input type="number" step="0.01" placeholder="Opcional" value={prodPromo} onChange={e => setProdPromo(e.target.value)} className="w-full bg-white border border-orange-500/20 rounded-xl px-4 py-3 text-orange-300 placeholder-dark-500 focus:border-orange-400 outline-none transition-all" />
                                    </div>
                                    <div className="w-full sm:w-28 space-y-2">
                                        <label className="text-xs font-bold text-[#6B7280] uppercase tracking-widest block">Stock</label>
                                        <input required type="number" value={prodStock} onChange={e => setProdStock(e.target.value)} className="w-full bg-white border border-purple-500/25 rounded-xl px-4 py-3 text-[#111827] placeholder-dark-500 focus:border-[#233B8F] outline-none transition-all" />
                                    </div>
                                </div>
                                {selectedStore.type === 'NETWORK_MARKETING' && (
                                    <div>
                                        <label className="text-xs font-bold text-[#233B8F] uppercase tracking-widest block mb-2 flex items-center gap-2">
                                            <Star size={12} /> Puntos (PV/BV)
                                        </label>
                                        <input type="number" step="0.01" value={prodPoints} onChange={e => setProdPoints(e.target.value)} className="w-full bg-white border border-[#233B8F]/20 text-[#233B8F] rounded-xl px-4 py-3" />
                                    </div>
                                )}
                                <div>
                                    <label className="text-xs font-bold text-[#6B7280] uppercase tracking-widest block mb-2">Galería de Imágenes (Hasta 4)</label>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                                        {prodImages.map((img, idx) => (
                                            <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-purple-500/25 bg-white group">
                                                <img src={img} className="w-full h-full object-cover" />
                                                <button
                                                    type="button"
                                                    onClick={() => setProdImages(prodImages.filter((_, i) => i !== idx))}
                                                    className="absolute top-1 right-1 p-1 bg-red-500/80 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <X size={10} />
                                                </button>
                                            </div>
                                        ))}
                                        {prodImages.length < 4 && (
                                            <div className="relative aspect-square rounded-xl border border-dashed border-[#E4E9F0] flex flex-col items-center justify-center text-[8px] font-bold text-[#6B7280] hover:border-[#233B8F] hover:text-[#233B8F] transition-all cursor-pointer">
                                                <input
                                                    type="file"
                                                    onChange={handleFileUpload}
                                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                                    accept="image/*"
                                                />
                                                {uploading ? <Loader2 className="animate-spin" size={16} /> : <><Plus size={16} /> Subir</>}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex gap-2">
                                        <input
                                            id="urlInput"
                                            placeholder="Pegar URL de imagen..."
                                            className="flex-1 bg-white border border-purple-500/25 rounded-xl px-4 py-3 text-sm"
                                            onKeyDown={e => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    const val = (e.target as HTMLInputElement).value;
                                                    if (val) {
                                                        setProdImages([...prodImages, val].slice(0, 4));
                                                        (e.target as HTMLInputElement).value = '';
                                                    }
                                                }
                                            }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const el = document.getElementById('urlInput') as HTMLInputElement;
                                                if (el?.value) {
                                                    setProdImages([...prodImages, el.value].slice(0, 4));
                                                    el.value = '';
                                                }
                                            }}
                                            className="px-4 bg-[#F4F6FA] rounded-xl border border-purple-500/25 text-xs font-bold"
                                        >
                                            Añadir
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-[#6B7280] uppercase tracking-widest block mb-2">Descripción</label>
                                    <textarea value={prodDesc} onChange={e => setProdDesc(e.target.value)} rows={3} className="w-full bg-white border border-purple-500/25 rounded-xl px-4 py-3 text-[#111827] placeholder-dark-500 focus:border-[#233B8F] outline-none transition-all resize-y" />
                                </div>
                                <div className="flex gap-3 pt-4">
                                    <button type="button" onClick={() => setShowProductModal(false)} className="flex-1 py-3 sm:py-4 text-[#374151] font-bold rounded-xl border border-purple-500/25 hover:bg-[#F4F6FA] transition-all">Cancelar</button>
                                    <button type="submit" className="flex-1 py-3 sm:py-4 bg-gradient-to-r from-[#FF2D95] via-[#B735B8] to-[#233B8F] text-white font-bold rounded-xl shadow-lg shadow-[#233B8F]/20 transition-all active:scale-95">Guardar</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        )
    }

    return (
        <div className="dm-page font-ui">
        <div className="px-4 sm:px-6 lg:px-8 pt-8 max-w-4xl mx-auto pb-20 font-inter text-[#111827]">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: 'linear-gradient(135deg, #FF2D95 0%, #B735B8 48%, #233B8F 100%)', boxShadow: '0 10px 22px -8px rgba(255,9,108,0.45)' }}>
                        <Store className="w-5 h-5 text-white" />
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-xl font-bold text-[#111827] leading-tight" style={{ letterSpacing: '-0.02em' }}>Mis Tiendas Virtuales</h1>
                        <p className="text-[11px] text-[#6B7280] mt-0.5">Tu galería de escaparates digitales · {stores.length} {stores.length === 1 ? 'tienda' : 'tiendas'}</p>
                    </div>
                </div>

                <button
                    onClick={() => { resetStoreForm(); setShowStoreModal(true); }}
                    className="rounded-xl px-4 py-2.5 font-bold flex items-center gap-2 text-sm transition-all active:scale-[0.98]"
                    style={{
                        background: 'linear-gradient(135deg, #FF2D95 0%, #B735B8 48%, #233B8F 100%)',
                        color: '#fff',
                        boxShadow: '0 10px 26px -10px rgba(34,183,255,0.6), inset 0 1px 0 rgba(255,255,255,0.18)',
                    }}
                >
                    <Plus className="w-4 h-4" /> Nueva Tienda
                </button>
            </div>

            {loading ? (
                <div className="py-20 flex justify-center"><Loader2 className="animate-spin" style={{ color: '#7DD3FC' }} /></div>
            ) : stores.length === 0 ? (
                <div className="rounded-3xl p-16 text-center max-w-2xl mx-auto"
                    style={{
                        background: 'radial-gradient(120% 75% at 50% -10%, rgba(34,183,255,0.12), rgba(255,255,255,0) 60%), linear-gradient(180deg, #0B1B2B 0%, #081624 60%, #050B14 100%)',
                        border: '1px solid rgba(255,255,255,0.07)',
                        boxShadow: '0 22px 50px -22px rgba(15,23,42,0.10), inset 0 1px 0 rgba(255,255,255,0.04)',
                    }}>
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
                        style={{ background: 'rgba(34,183,255,0.12)', border: '1px solid rgba(34,183,255,0.32)', boxShadow: '0 0 28px -6px rgba(34,183,255,0.55)' }}>
                        <ShoppingBag className="w-8 h-8" style={{ color: '#7DD3FC' }} />
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2" style={{ letterSpacing: '-0.02em' }}>Tu escaparate está vacío</h2>
                    <p className="text-white/55 text-sm mb-6 max-w-sm mx-auto leading-relaxed">Crea una tienda para empezar a vender tus productos en una vitrina digital premium.</p>
                    <button onClick={() => setShowStoreModal(true)}
                        className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 font-bold text-sm transition-all active:scale-[0.98]"
                        style={{
                            background: 'linear-gradient(135deg, #FF2D95 0%, #B735B8 48%, #233B8F 100%)',
                            color: '#fff',
                            boxShadow: '0 10px 26px -10px rgba(34,183,255,0.6)',
                        }}>
                        <Plus className="w-4 h-4" /> Crear Tienda
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 lg:gap-7">
                    {stores.map(store => {
                        const p = paletteForStore(store.id)
                        const productCount = store._count?.products || 0
                        const tilesCount = Math.min(4, Math.max(3, productCount || 3))
                        return (
                            <div key={store.id}
                                className="relative rounded-2xl overflow-hidden group transition-all duration-300 hover:-translate-y-1"
                                style={{
                                    background: `radial-gradient(120% 80% at 50% -10%, ${p.accent}1c, rgba(255,255,255,0) 60%), radial-gradient(80% 80% at 100% 100%, ${p.accent}10, rgba(255,255,255,0) 62%), linear-gradient(180deg, #0B1B2B 0%, #081624 100%)`,
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    boxShadow: `0 22px 44px -22px rgba(0,0,0,0.78), 0 0 24px -14px ${p.accent}30, inset 0 1px 0 rgba(255,255,255,0.06)`,
                                }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.boxShadow = `0 30px 56px -22px rgba(0,0,0,0.84), 0 0 36px -10px ${p.accent}55, 0 0 16px -8px rgba(123,91,255,0.35), inset 0 1px 0 rgba(255,255,255,0.09)`
                                    e.currentTarget.style.borderColor = `${p.accent}55`
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.boxShadow = `0 22px 44px -22px rgba(0,0,0,0.78), 0 0 24px -14px ${p.accent}30, inset 0 1px 0 rgba(255,255,255,0.06)`
                                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
                                }}>

                                {/* Mini storefront preview panorámico */}
                                <a href={`/sh/${store.slug}`} target="_blank" rel="noopener noreferrer"
                                    className="block relative aspect-[5/2] overflow-hidden"
                                    style={{
                                        background: store.bannerUrl
                                            ? `linear-gradient(180deg, rgba(8,10,24,0.32) 0%, rgba(8,10,24,0.82) 100%), url("${store.bannerUrl}") center/cover no-repeat`
                                            : `linear-gradient(155deg, ${p.a} 0%, ${p.b} 60%, ${p.c} 100%)`,
                                    }}>
                                    {/* overlay oscuro suave */}
                                    <div className="absolute inset-0 pointer-events-none" style={{
                                        background: 'linear-gradient(180deg, rgba(0,0,0,0.12) 0%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.48) 100%)',
                                    }} />
                                    {/* halo top-left más sutil */}
                                    <div className="absolute pointer-events-none" style={{
                                        top: -28, left: -28, width: 150, height: 90, borderRadius: '50%',
                                        background: 'radial-gradient(ellipse, rgba(255,255,255,0.12), transparent 70%)',
                                        filter: 'blur(10px)',
                                    }} />
                                    {/* browser chrome compacto */}
                                    <div className="absolute top-0 left-0 right-0 px-2.5 py-1.5 flex items-center gap-1.5 pointer-events-none z-10"
                                        style={{ background: 'linear-gradient(180deg, rgba(15,23,42,0.08), rgba(0,0,0,0))' }}>
                                        <span className="w-1 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.42)' }} />
                                        <span className="w-1 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.30)' }} />
                                        <span className="w-1 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.20)' }} />
                                        <span className="ml-1.5 text-[8px] font-mono px-1.5 py-px rounded truncate max-w-[42%]"
                                            style={{ color: 'rgba(255,255,255,0.72)', background: 'rgba(0,0,0,0.32)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                            /sh/{store.slug}
                                        </span>
                                        <span className="ml-auto inline-flex items-center gap-1 text-[8px] font-bold uppercase tracking-[0.14em] px-1.5 py-px rounded-full backdrop-blur-md"
                                            style={store.active
                                                ? { background: 'rgba(34,197,94,0.18)', color: '#86EFAC', border: '1px solid rgba(34,197,94,0.40)' }
                                                : { background: 'rgba(234,179,8,0.14)', color: '#FBBF24', border: '1px solid rgba(234,179,8,0.34)' }}>
                                            {store.active && (
                                                <span className="relative flex h-1 w-1">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                                    <span className="relative inline-flex rounded-full h-1 w-1 bg-emerald-400" />
                                                </span>
                                            )}
                                            {store.active ? 'Pública' : 'Borrador'}
                                        </span>
                                    </div>
                                    {/* mini storefront: top bar + (hero | tiles en fila) */}
                                    <div className="absolute inset-x-0 top-5 bottom-0 px-3 pb-2 flex flex-col pointer-events-none">
                                        {/* top bar: marca + nav + carrito */}
                                        <div className="flex items-center gap-1 mb-1 opacity-90">
                                            <span className="w-2.5 h-2.5 rounded-full" style={{ background: 'rgba(8,22,36,0.96)' }} />
                                            <span className="text-[8px] font-bold text-white truncate max-w-[40%]" style={{ letterSpacing: '-0.01em' }}>{store.name}</span>
                                            <span className="ml-auto flex items-center gap-1.5">
                                                <span className="text-[6.5px] font-medium uppercase tracking-[0.14em] text-white/50">Shop</span>
                                                <span className="relative">
                                                    <ShoppingCart className="w-2.5 h-2.5 text-white/80" />
                                                    {productCount > 0 && (
                                                        <span className="absolute -top-1 -right-1.5 min-w-[9px] h-[9px] px-1 rounded-full flex items-center justify-center text-[6px] font-bold text-black"
                                                            style={{ background: p.accent }}>
                                                            {productCount > 9 ? '9+' : productCount}
                                                        </span>
                                                    )}
                                                </span>
                                            </span>
                                        </div>

                                        {/* layout panorámico: hero (izq) + product tiles (der) */}
                                        <div className="flex-1 flex items-center gap-2 min-h-0">
                                            {/* hero izquierda */}
                                            <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                                                <div className="text-[11px] font-bold text-white leading-tight truncate" style={{ letterSpacing: '-0.02em', textShadow: '0 2px 12px rgba(15,23,42,0.10)' }}>
                                                    {store.name}
                                                </div>
                                                <div className="text-[7.5px] uppercase tracking-[0.18em] font-bold truncate" style={{ color: p.accent }}>
                                                    {productCount} productos
                                                </div>
                                            </div>

                                            {/* mini product thumbnails — silueta minimalista */}
                                            <div className="flex gap-1 shrink-0">
                                                {Array.from({ length: tilesCount }).map((_, i) => {
                                                    const shape = i % 3 // 0 = bottle, 1 = circle, 2 = box
                                                    return (
                                                        <div key={i} className="relative w-6 h-6 rounded overflow-hidden"
                                                            style={{
                                                                background: `linear-gradient(155deg, ${p.accent}22 0%, rgba(255,255,255,0.03) 100%)`,
                                                                border: '1px solid rgba(255,255,255,0.12)',
                                                                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.07)',
                                                            }}>
                                                            <div className="absolute inset-0 flex items-center justify-center">
                                                                {shape === 0 && (
                                                                    <div className="w-1 h-3 rounded-sm" style={{ background: `linear-gradient(180deg, rgba(8,22,36,0.96), rgba(255,255,255,0.42))` }} />
                                                                )}
                                                                {shape === 1 && (
                                                                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: `radial-gradient(circle at 35% 35%, rgba(8,22,36,0.96), rgba(255,255,255,0.32) 70%)` }} />
                                                                )}
                                                                {shape === 2 && (
                                                                    <div className="w-2.5 h-2 rounded-sm" style={{ background: `linear-gradient(150deg, rgba(8,22,36,0.96), rgba(255,255,255,0.32))` }} />
                                                                )}
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    </div>

                                    {/* hover overlay open */}
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-20">
                                        <div className="w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md"
                                            style={{ background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.28)' }}>
                                            <ExternalLink className="w-3.5 h-3.5 text-white" />
                                        </div>
                                    </div>
                                </a>

                                {/* divisor cinematográfico */}
                                <div className="relative">
                                    <div className="absolute inset-x-4 -top-px h-px pointer-events-none"
                                        style={{ background: `linear-gradient(90deg, transparent, ${p.accent}55, transparent)` }} />
                                </div>

                                {/* contenido inferior */}
                                <div className="px-3.5 pt-3 pb-3.5 relative">
                                    {store.sharedByUsername && (
                                        <div className="flex items-center gap-1.5 mb-1.5 text-[9.5px]" style={{ color: p.accent }}>
                                            <Share2 size={10} />
                                            <span>de @{store.sharedByUsername}</span>
                                        </div>
                                    )}

                                    {/* row: icono + nombre/tipo + acciones */}
                                    <div className="flex items-center gap-2 mb-2.5">
                                        <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
                                            style={{ background: `${p.accent}1c`, border: `1px solid ${p.accent}3a`, boxShadow: `0 0 10px -4px ${p.accent}50` }}>
                                            {store.type === 'NETWORK_MARKETING' ? <Globe className="w-3 h-3" style={{ color: p.accent }} /> :
                                                store.type === 'GENERAL_BUSINESS' ? <Store className="w-3 h-3" style={{ color: p.accent }} /> :
                                                    <LayoutIcon className="w-3 h-3" style={{ color: p.accent }} />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-[12.5px] font-bold text-white truncate leading-tight" style={{ letterSpacing: '-0.01em' }}>{store.name}</div>
                                            <div className="text-[9.5px] mt-0.5 truncate" style={{ color: 'rgba(255,255,255,0.46)' }}>
                                                {storeTypeLabel(store.type)} · {productCount} {productCount === 1 ? 'producto' : 'productos'}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-0 shrink-0 -mr-1">
                                            <button onClick={() => setSharingStore(store)}
                                                className="p-1 rounded-md transition-colors hover:bg-white/5"
                                                title="Compartir tienda">
                                                <Share2 className="w-3 h-3 text-white/55 hover:text-white transition-colors" />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setEditStore(store);
                                                    setStoreName(store.name);
                                                    setStoreSlug(store.slug);
                                                    setStoreType(store.type);
                                                    setStoreWhatsapp(store.whatsappNumber || '');
                                                    setStoreQr(store.paymentQrUrl || '');
                                                    setStoreBanner1(store.bannerUrl || '');
                                                    setStoreBanner2(store.themeConfig?.bannerUrl2 || '');
                                                    setStoreThemePreset(store.themeConfig?.theme?.preset || 'neon-dark');
                                                    setStoreThemeFont(store.themeConfig?.theme?.font || '');
                                                    setStoreThemePrimary(store.themeConfig?.theme?.primary || '');
                                                    setShowStoreModal(true);
                                                }}
                                                className="p-1 rounded-md transition-colors hover:bg-white/5"
                                                title="Editar">
                                                <Edit3 className="w-3 h-3 text-white/55 hover:text-white transition-colors" />
                                            </button>
                                            <button onClick={() => deleteStore(store.id)}
                                                className="p-1 rounded-md transition-colors hover:bg-white/5"
                                                title="Eliminar">
                                                <Trash2 className="w-3 h-3 text-white/40 hover:text-red-400 transition-colors" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* botones premium */}
                                    <div className="flex items-stretch gap-1.5">
                                        <button
                                            onClick={() => openStoreProducts(store)}
                                            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11.5px] font-bold transition-all active:scale-[0.98] hover:opacity-90"
                                            style={{
                                                background: 'linear-gradient(135deg, #FF2D95 0%, #B735B8 48%, #233B8F 100%)',
                                                border: 'none',
                                                color: '#fff',
                                                boxShadow: '0 8px 20px -8px rgba(255,9,108,0.5), inset 0 1px 0 rgba(255,255,255,0.18)',
                                                letterSpacing: '-0.01em',
                                            }}>
                                            <Package className="w-3 h-3" />
                                            Gestionar Productos
                                        </button>
                                        <Link
                                            href={`/sh/${store.slug}`}
                                            target="_blank"
                                            className="px-2.5 rounded-lg flex items-center justify-center transition-all active:scale-[0.98] hover:bg-white/8"
                                            style={{
                                                background: 'rgba(255,255,255,0.05)',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                color: 'rgba(255,255,255,0.78)',
                                            }}
                                            title="Abrir tienda pública">
                                            <ExternalLink className="w-3 h-3" />
                                        </Link>
                                    </div>

                                    {(store.type === 'NETWORK_MARKETING' || store.type === 'GENERAL_BUSINESS') && (
                                        <button
                                            onClick={() => convertStoreType(store)}
                                            className="mt-2 w-full flex items-center justify-center gap-1.5 text-[9.5px] font-medium py-1.5 rounded-md transition-colors hover:text-white"
                                            style={{ color: 'rgba(255,255,255,0.34)' }}>
                                            Convertir a {store.type === 'NETWORK_MARKETING' ? 'Mi Negocio (General)' : 'Network Marketing (PV)'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {sharingStore && (
                <ShareStoreModal store={sharingStore} onClose={() => setSharingStore(null)} />
            )}

            {showStoreModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                    <div className="bg-white/5 border border-white/10 rounded-3xl w-full max-w-md p-5 sm:p-6 max-h-[90vh] overflow-y-auto custom-scrollbar">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold">{editStore ? 'Configurar Tienda' : 'Crear Tienda'}</h2>
                            <button onClick={() => setShowStoreModal(false)}><X size={24} className="text-white/55" /></button>
                        </div>
                        <form onSubmit={handleSaveStore} className="space-y-6">
                            <div>
                                <label className="text-xs font-bold text-white/55 uppercase tracking-widest block mb-4">Tipo de Tienda</label>
                                <div className="grid grid-cols-3 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setStoreType('GENERAL_BUSINESS')}
                                        className={`p-3 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 text-center ${storeType === 'GENERAL_BUSINESS'
                                            ? 'border-[#B735B8] bg-[#B735B8]/10 text-white shadow-[0_0_20px_rgba(var(--[#B735B8]-rgb),0.2)]'
                                            : 'border-white/10 bg-white text-white/40 hover:border-purple-500/30'
                                            }`}
                                    >
                                        <Store className={storeType === 'GENERAL_BUSINESS' ? 'text-[#B735B8]' : ''} size={20} />
                                        <div>
                                            <p className="font-bold text-[11px]">Mi Negocio</p>
                                            <p className="text-[9px] opacity-60">Venta General</p>
                                        </div>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setStoreType('NETWORK_MARKETING')}
                                        className={`p-3 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 text-center ${storeType === 'NETWORK_MARKETING'
                                            ? 'border-[#233B8F] bg-[#233B8F]/10 text-white shadow-[0_0_20px_rgba(var(--[#233B8F]-rgb),0.2)]'
                                            : 'border-white/10 bg-white text-white/40 hover:border-purple-500/30'
                                            }`}
                                    >
                                        <Globe className={storeType === 'NETWORK_MARKETING' ? 'text-[#233B8F]' : ''} size={20} />
                                        <div>
                                            <p className="font-bold text-[11px]">Network</p>
                                            <p className="text-[9px] opacity-60">Puntos PV</p>
                                        </div>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setStoreType('LANDING')}
                                        className={`p-3 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 text-center ${storeType === 'LANDING'
                                            ? 'border-[#16A34A] bg-[#16A34A]/10 text-white shadow-[0_0_20px_rgba(var(--[#16A34A]-rgb),0.2)]'
                                            : 'border-white/10 bg-white text-white/40 hover:border-purple-500/30'
                                            }`}
                                    >
                                        <LayoutIcon className={storeType === 'LANDING' ? 'text-[#16A34A]' : ''} size={20} />
                                        <div>
                                            <p className="font-bold text-[11px]">Landing Pro</p>
                                            <p className="text-[9px] opacity-60">Página Única</p>
                                        </div>
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-white/55 uppercase tracking-widest block mb-2">Nombre</label>
                                <input required value={storeName} onChange={e => setStoreName(e.target.value)} placeholder="Ej: Mi Boutique" className="w-full bg-white border border-purple-500/25 rounded-xl px-4 py-3 text-white placeholder-dark-500 focus:border-[#233B8F] outline-none transition-all" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-white/55 uppercase tracking-widest block mb-2">Slug (URL)</label>
                                <input required value={storeSlug} onChange={e => setStoreSlug(e.target.value)} placeholder="mi-boutique" className="w-full bg-white border border-purple-500/25 rounded-xl px-4 py-3 text-white placeholder-dark-500 focus:border-[#233B8F] outline-none transition-all" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-white/55 uppercase tracking-widest block mb-2">WhatsApp de Pedidos</label>
                                <input value={storeWhatsapp} onChange={e => setStoreWhatsapp(e.target.value)} placeholder="Ej: 51987654321 (con código de país)" className="w-full bg-white border border-purple-500/25 rounded-xl px-4 py-3 text-white placeholder-dark-500 focus:border-[#233B8F] outline-none transition-all" />
                                <p className="text-[10px] text-white/40 mt-2">Los pedidos de esta tienda llegarán directamente a este número.</p>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-white/55 uppercase tracking-widest block mb-2">QR de Pago (Transferencia)</label>
                                <div className="flex items-center gap-4">
                                    {storeQr ? (
                                        <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-purple-500/25 group">
                                            <img src={storeQr} className="w-full h-full object-cover" />
                                            <button
                                                type="button"
                                                onClick={() => setStoreQr('')}
                                                className="absolute inset-0 bg-red-500/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="relative w-20 h-20 rounded-xl border border-dashed border-white/10 flex flex-col items-center justify-center text-[10px] font-bold text-white/55 hover:border-[#233B8F] hover:text-[#233B8F] transition-all cursor-pointer">
                                            <input
                                                type="file"
                                                onChange={async (e) => {
                                                    const file = e.target.files?.[0]
                                                    if (!file) return
                                                    setUploading(true)
                                                    const formData = new FormData()
                                                    formData.append('file', file)
                                                    try {
                                                        const res = await fetch('/api/upload', { method: 'POST', body: formData })
                                                        const data = await res.json()
                                                        if (res.ok) setStoreQr(data.url)
                                                        else alert(data.error)
                                                    } catch (err) { alert('Error al subir QR') }
                                                    finally { setUploading(false) }
                                                }}
                                                className="absolute inset-0 opacity-0 cursor-pointer"
                                                accept="image/*"
                                            />
                                            {uploading ? <Loader2 className="animate-spin" size={16} /> : <><Plus size={16} /> QR</>}
                                        </div>
                                    )}
                                    <div className="flex-1">
                                        <p className="text-[10px] text-white/40 leading-relaxed">
                                            Este QR se mostrará a los clientes que elijan pagar por transferencia en tu tienda.
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-white/55 uppercase tracking-widest block mb-2">Fotos de Portada (Banner)</label>
                                <p className="text-[10px] text-white/40 mb-3">Sube hasta 2 fotos. Se mostrarán rotando en la parte superior de tu tienda.</p>
                                <div className="flex gap-3">
                                    {/* Banner 1 */}
                                    <div className="flex-1 relative h-24 rounded-xl overflow-hidden border border-dashed border-white/10 hover:border-[#233B8F] transition-all cursor-pointer flex items-center justify-center">
                                        {storeBanner1 ? (
                                            <>
                                                <img src={storeBanner1} className="absolute inset-0 w-full h-full object-cover opacity-70" />
                                                <button
                                                    type="button"
                                                    onClick={() => setStoreBanner1('')}
                                                    className="relative z-10 p-1 bg-red-500/80 rounded-full text-white"
                                                >
                                                    <X size={12} />
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <input
                                                    type="file"
                                                    onChange={async (e) => {
                                                        const file = e.target.files?.[0]
                                                        if (!file) return
                                                        setUploading(true)
                                                        const fd = new FormData()
                                                        fd.append('file', file)
                                                        try {
                                                            const res = await fetch('/api/upload', { method: 'POST', body: fd })
                                                            const data = await res.json()
                                                            if (res.ok) setStoreBanner1(data.url)
                                                            else alert(data.error)
                                                        } catch { alert('Error al subir imagen') }
                                                        finally { setUploading(false) }
                                                    }}
                                                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                                    accept="image/*"
                                                />
                                                <div className="text-center text-white/40 pointer-events-none">
                                                    <Plus size={20} className="mx-auto mb-1" />
                                                    <span className="text-[10px] font-bold">Foto 1</span>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                    {/* Banner 2 */}
                                    <div className="flex-1 relative h-24 rounded-xl overflow-hidden border border-dashed border-white/10 hover:border-[#233B8F] transition-all cursor-pointer flex items-center justify-center">
                                        {storeBanner2 ? (
                                            <>
                                                <img src={storeBanner2} className="absolute inset-0 w-full h-full object-cover opacity-70" />
                                                <button
                                                    type="button"
                                                    onClick={() => setStoreBanner2('')}
                                                    className="relative z-10 p-1 bg-red-500/80 rounded-full text-white"
                                                >
                                                    <X size={12} />
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <input
                                                    type="file"
                                                    onChange={async (e) => {
                                                        const file = e.target.files?.[0]
                                                        if (!file) return
                                                        setUploading(true)
                                                        const fd = new FormData()
                                                        fd.append('file', file)
                                                        try {
                                                            const res = await fetch('/api/upload', { method: 'POST', body: fd })
                                                            const data = await res.json()
                                                            if (res.ok) setStoreBanner2(data.url)
                                                            else alert(data.error)
                                                        } catch { alert('Error al subir imagen') }
                                                        finally { setUploading(false) }
                                                    }}
                                                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                                    accept="image/*"
                                                />
                                                <div className="text-center text-white/40 pointer-events-none">
                                                    <Plus size={20} className="mx-auto mb-1" />
                                                    <span className="text-[10px] font-bold">Foto 2</span>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                            {/* ── APARIENCIA (tema de la tienda) ── */}
                            <div>
                                <label className="text-xs font-bold text-white/55 uppercase tracking-widest block mb-2">Apariencia de la tienda</label>
                                <p className="text-[10px] text-white/40 mb-3">Elige un tema: cambia los colores y la tipografía de tu vitrina.</p>
                                <div className="grid grid-cols-3 gap-2">
                                    {Object.entries(STORE_THEMES).map(([id, t]) => {
                                        const sel = storeThemePreset === id
                                        return (
                                            <button key={id} type="button" onClick={() => setStoreThemePreset(id)}
                                                className={`relative rounded-xl p-2 border text-left transition-all ${sel ? 'border-[#233B8F]' : 'border-white/10 hover:border-white/25'}`}
                                                style={{ background: 'rgba(255,255,255,0.03)' }}>
                                                <div className="h-9 rounded-lg mb-1.5 flex items-center gap-1 px-2" style={{ background: t.vars['--st-bg'] }}>
                                                    <span className="w-3.5 h-3.5 rounded-full" style={{ background: t.vars['--st-primary'] }} />
                                                    <span className="w-3.5 h-3.5 rounded-full" style={{ background: t.vars['--st-price'] }} />
                                                    <span className="flex-1 h-2 rounded-full" style={{ background: t.vars['--st-card-border'] }} />
                                                </div>
                                                <span className="text-[10px] font-bold block truncate" style={{ color: sel ? '#fff' : '#6B7280' }}>{t.label}</span>
                                                {sel && <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-[#233B8F]" />}
                                            </button>
                                        )
                                    })}
                                </div>

                                <label className="text-xs font-bold text-white/55 uppercase tracking-widest block mb-2 mt-4">Tipografía</label>
                                <div className="flex flex-wrap gap-2">
                                    <button type="button" onClick={() => setStoreThemeFont('')}
                                        className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${storeThemeFont === '' ? 'border-[#233B8F] text-white' : 'border-white/10 text-white/55'}`}>Auto</button>
                                    {Object.entries(STORE_FONTS).map(([key, f]) => (
                                        <button key={key} type="button" onClick={() => setStoreThemeFont(key)}
                                            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${storeThemeFont === key ? 'border-[#233B8F] text-white' : 'border-white/10 text-white/55'}`}
                                            style={{ fontFamily: f.family }}>{f.label}</button>
                                    ))}
                                </div>

                                <label className="text-xs font-bold text-white/55 uppercase tracking-widest block mb-2 mt-4">Color principal (opcional)</label>
                                <div className="flex items-center gap-3">
                                    <input type="color" value={storeThemePrimary || '#D203DD'} onChange={e => setStoreThemePrimary(e.target.value)}
                                        className="w-11 h-9 rounded-lg bg-transparent border border-white/10 cursor-pointer p-0.5" />
                                    {storeThemePrimary
                                        ? <button type="button" onClick={() => setStoreThemePrimary('')} className="text-[10px] text-white/55 underline">usar el del tema</button>
                                        : <span className="text-[10px] text-white/40">Sobrescribe el color del tema con el tuyo.</span>}
                                </div>

                                {/* Vista previa en vivo del tema */}
                                {(() => {
                                    const pv = resolveStoreTheme({ theme: { preset: storeThemePreset, font: storeThemeFont || undefined, primary: storeThemePrimary || undefined } })
                                    return (
                                        <div className="mt-4">
                                            <label className="text-xs font-bold text-white/55 uppercase tracking-widest block mb-2">Vista previa</label>
                                            <link rel="stylesheet" href={pv.fontHref} />
                                            <div style={{ ...(pv.vars as any), background: 'var(--st-bg)', fontFamily: 'var(--st-font)', borderRadius: 16, padding: 14, border: '1px solid var(--st-border)' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                                                    <div style={{ width: 26, height: 26, borderRadius: 8, background: 'rgba(var(--st-primary-rgb),0.15)', border: '1px solid var(--st-card-border)' }} />
                                                    <span style={{ color: 'var(--st-text)', fontWeight: 800, fontSize: 13 }}>{storeName || 'Mi Tienda'}</span>
                                                    <div style={{ marginLeft: 'auto', width: 28, height: 28, borderRadius: 8, background: 'rgba(var(--st-primary-rgb),0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        <ShoppingBag size={14} style={{ color: 'var(--st-primary)' }} />
                                                    </div>
                                                </div>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                                    {[0, 1].map(i => (
                                                        <div key={i} style={{ background: 'var(--st-card)', border: '1px solid var(--st-card-border)', borderRadius: 'var(--st-radius)', boxShadow: 'var(--st-card-shadow)', overflow: 'hidden' }}>
                                                            <div style={{ height: 64, background: 'linear-gradient(135deg, rgba(var(--st-primary-rgb),0.28), rgba(var(--st-primary-rgb),0.08))' }} />
                                                            <div style={{ padding: '8px 9px' }}>
                                                                <div style={{ color: 'var(--st-text)', fontWeight: 700, fontSize: 11, marginBottom: 4 }}>Producto {i + 1}</div>
                                                                <div style={{ color: 'var(--st-price)', fontWeight: 800, fontSize: 14, marginBottom: 7 }}>$199</div>
                                                                <div style={{ background: 'var(--st-primary)', color: 'var(--st-on-primary)', borderRadius: 9, padding: '6px 0', textAlign: 'center', fontSize: 9.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Añadir</div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })()}
                            </div>

                            <button type="submit" className="w-full bg-gradient-to-r from-[#FF2D95] via-[#B735B8] to-[#233B8F] text-white font-bold py-4 rounded-xl shadow-lg active:scale-[0.98] transition-all">
                                {editStore ? 'Guardar Cambios' : 'Crear Tienda'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
        </div>
    )
}
