'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Package,
  Sparkles,
  ShoppingBag,
  Eye,
  Tag,
  Search,
  LayoutGrid,
  List,
} from 'lucide-react'
import { toast } from 'sonner'
import { ImageUpload } from '@/components/shared/image-upload'

interface StoreProduct {
  id: string
  name: string
  category: string
  currency: string
  price: number
  stock: number
  description?: string
  is_active: boolean
  store_product_images?: Array<{ id: string; image_url: string; sort_order: number }>
}

interface StoreMeta {
  id: string
  name: string
  slug: string
}

interface ProductForm {
  name: string
  category: string
  currency: string
  price: number
  stock: number
  description: string
  images: string[]
}

const emptyForm: ProductForm = {
  name: '',
  category: 'General',
  currency: 'USD',
  price: 0,
  stock: 0,
  description: '',
  images: [],
}

const categories = [
  'General', 'Electronica y Tecnologia', 'Celulares y Accesorios', 'Computacion',
  'Hogar y Cocina', 'Decoracion', 'Muebles', 'Ropa Mujer', 'Ropa Hombre',
  'Ropa Infantil', 'Calzado', 'Belleza y Cuidado Personal', 'Salud',
  'Deportes y Fitness', 'Juguetes', 'Bebes', 'Automotriz',
  'Herramientas y Ferreteria', 'Jardin', 'Mascotas', 'Oficina y Papeleria',
  'Videojuegos', 'Libros', 'Accesorios y Joyas', 'Viajes y Maletas',
  'Ofertas Novedades', 'Mas Vendidos', 'Ofertas', 'Liquidacion', 'Otra',
]

const currencies = [
  { value: 'USD', label: 'USD ($)' },
  { value: 'PEN', label: 'PEN (S/)' },
  { value: 'COP', label: 'COP ($)' },
  { value: 'MXN', label: 'MXN ($)' },
  { value: 'ARS', label: 'ARS ($)' },
  { value: 'CLP', label: 'CLP ($)' },
  { value: 'BOB', label: 'BOB (Bs)' },
  { value: 'VES', label: 'VES (Bs.S)' },
  { value: 'EUR', label: 'EUR' },
]

const currencySymbol: Record<string, string> = {
  USD: '$', PEN: 'S/', COP: '$', MXN: '$', ARS: '$',
  CLP: '$', BOB: 'Bs', VES: 'Bs.S', EUR: '€',
}

export default function StoreInventoryPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: storeId } = React.use(params)
  const [store, setStore] = useState<StoreMeta | null>(null)
  const [products, setProducts] = useState<StoreProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<ProductForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  useEffect(() => {
    async function load() {
      try {
        const [storeRes, productsRes] = await Promise.all([
          fetch(`/api/stores/${storeId}`),
          fetch(`/api/stores/${storeId}/products`),
        ])
        if (storeRes.ok) setStore(await storeRes.json())
        if (productsRes.ok) setProducts(await productsRes.json())
      } catch (err) {
        console.error('Error:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [storeId])

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  const openEdit = (product: StoreProduct) => {
    setEditingId(product.id)
    const imgs = (product.store_product_images || [])
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(i => i.image_url)

    setForm({
      name: product.name,
      category: product.category,
      currency: product.currency,
      price: product.price,
      stock: product.stock,
      description: product.description || '',
      images: imgs,
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('El nombre es requerido'); return }
    setSaving(true)

    const payload = {
      name: form.name.trim(),
      category: form.category,
      currency: form.currency,
      price: form.price,
      stock: form.stock,
      description: form.description.trim() || null,
      images: form.images.filter(u => u.trim()),
    }

    try {
      if (editingId) {
        const res = await fetch(`/api/stores/${storeId}/products/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (res.ok) {
          const updated = await res.json()
          setProducts(prev => prev.map(p => p.id === editingId ? updated : p))
          setDialogOpen(false)
          toast.success('Producto actualizado')
        } else {
          const d = await res.json()
          toast.error(d.error || 'Error al actualizar')
        }
      } else {
        const res = await fetch(`/api/stores/${storeId}/products`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (res.ok) {
          const created = await res.json()
          setProducts(prev => [created, ...prev])
          setDialogOpen(false)
          toast.success('Producto creado')
        } else {
          const d = await res.json()
          toast.error(d.error || 'Error al crear')
        }
      }
    } catch {
      toast.error('Error de conexion')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (productId: string) => {
    setDeletingId(productId)
    try {
      const res = await fetch(`/api/stores/${storeId}/products/${productId}`, { method: 'DELETE' })
      if (res.ok) {
        setProducts(prev => prev.filter(p => p.id !== productId))
        toast.success('Producto eliminado')
      } else {
        toast.error('Error al eliminar')
      }
    } catch {
      toast.error('Error de conexion')
    } finally {
      setDeletingId(null)
      setDeleteConfirmId(null)
    }
  }

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.category.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Stats
  const totalProducts = products.length
  const activeProducts = products.filter(p => p.is_active).length
  const totalValue = products.reduce((sum, p) => sum + (p.price * p.stock), 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-14 h-14 rounded-full border-2 animate-spin" style={{ borderColor: 'rgba(167, 139, 250, 0.12)', borderTopColor: '#A78BFA' }} />
            <Package className="absolute inset-0 m-auto h-5 w-5 text-[#A78BFA]" />
          </div>
          <p className="text-sm text-[#94A3B8]/60 font-medium">Cargando inventario...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* Back link */}
        <Link
          href="/stores"
          className="inline-flex items-center gap-2 text-[13px] text-[#94A3B8]/50 hover:text-[#A78BFA] transition-colors duration-200"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Volver a mis tiendas
        </Link>

        {/* ═══ HEADER ═══ */}
        <div
          className="relative rounded-2xl p-6 sm:p-8 overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(17, 29, 53, 0.95) 0%, rgba(20, 15, 45, 0.95) 100%)',
            border: '1px solid rgba(167, 139, 250, 0.1)',
          }}
        >
          {/* Decorative glow */}
          <div className="absolute top-0 right-0 w-80 h-80 rounded-full opacity-20 blur-[100px] pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(167, 139, 250, 0.3), transparent 70%)' }} />
          <div className="absolute bottom-0 left-0 w-60 h-60 rounded-full opacity-15 blur-[80px] pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(91, 138, 255, 0.3), transparent 70%)' }} />

          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl"
                  style={{ background: 'linear-gradient(135deg, rgba(167, 139, 250, 0.15), rgba(139, 92, 246, 0.1))', border: '1px solid rgba(167, 139, 250, 0.15)' }}
                >
                  <ShoppingBag className="h-5 w-5 text-[#A78BFA]" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                    {store?.name || 'Tienda'}
                  </h1>
                  <p className="text-[13px] text-[#94A3B8]/50">
                    Gestiona tu catalogo de productos
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={openCreate}
              className="group relative inline-flex items-center justify-center gap-2.5 rounded-xl px-6 py-3 text-[14px] font-bold text-white transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] hover:shadow-[0_0_30px_rgba(167,139,250,0.25)]"
              style={{
                background: 'linear-gradient(135deg, #A78BFA 0%, #8B5CF6 50%, #7C3AED 100%)',
                boxShadow: '0 4px 15px rgba(139, 92, 246, 0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
              }}
            >
              <Plus className="h-4.5 w-4.5 transition-transform duration-200 group-hover:rotate-90" />
              Agregar Producto
              <Sparkles className="h-3.5 w-3.5 opacity-60" />
            </button>
          </div>

          {/* Stats row */}
          {totalProducts > 0 && (
            <div className="relative flex flex-wrap gap-6 mt-6 pt-5" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.04)' }}>
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: 'rgba(167, 139, 250, 0.08)' }}>
                  <Package className="h-3.5 w-3.5 text-[#A78BFA]" />
                </div>
                <div>
                  <p className="text-[11px] text-[#94A3B8]/40 uppercase tracking-wider font-medium">Total</p>
                  <p className="text-[15px] font-bold text-white">{totalProducts}</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: 'rgba(16, 185, 129, 0.08)' }}>
                  <Eye className="h-3.5 w-3.5 text-[#10B981]" />
                </div>
                <div>
                  <p className="text-[11px] text-[#94A3B8]/40 uppercase tracking-wider font-medium">Activos</p>
                  <p className="text-[15px] font-bold text-white">{activeProducts}</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: 'rgba(91, 138, 255, 0.08)' }}>
                  <Tag className="h-3.5 w-3.5 text-[#5B8AFF]" />
                </div>
                <div>
                  <p className="text-[11px] text-[#94A3B8]/40 uppercase tracking-wider font-medium">Valor inventario</p>
                  <p className="text-[15px] font-bold text-white">
                    {totalValue > 0 ? `${currencySymbol[products[0]?.currency] || '$'} ${totalValue.toLocaleString()}` : '-'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ═══ CONTENT ═══ */}
        {products.length === 0 ? (
          /* ═══ EMPTY STATE ═══ */
          <div
            className="relative rounded-2xl overflow-hidden"
            style={{
              background: 'linear-gradient(180deg, rgba(17, 29, 53, 0.6) 0%, rgba(13, 21, 41, 0.8) 100%)',
              border: '1px solid rgba(255, 255, 255, 0.04)',
            }}
          >
            {/* Decorative background pattern */}
            <div className="absolute inset-0 opacity-[0.02]" style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, rgba(167, 139, 250, 0.5) 1px, transparent 0)`,
              backgroundSize: '40px 40px',
            }} />

            <div className="relative flex flex-col items-center justify-center py-20 sm:py-28 px-6 text-center">
              {/* Animated illustration */}
              <div className="relative mb-8">
                <div className="absolute inset-0 animate-pulse rounded-full blur-[40px] opacity-20" style={{ background: 'radial-gradient(circle, #A78BFA, transparent 70%)' }} />
                <div
                  className="relative flex h-24 w-24 items-center justify-center rounded-3xl"
                  style={{
                    background: 'linear-gradient(135deg, rgba(167, 139, 250, 0.08), rgba(139, 92, 246, 0.04))',
                    border: '1px solid rgba(167, 139, 250, 0.12)',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
                  }}
                >
                  <ShoppingBag className="h-10 w-10 text-[#A78BFA]/60" />
                </div>
                {/* Floating particles */}
                <div className="absolute -top-2 -right-2 h-3 w-3 rounded-full bg-[#A78BFA]/20 animate-bounce" style={{ animationDelay: '0s', animationDuration: '3s' }} />
                <div className="absolute -bottom-1 -left-3 h-2 w-2 rounded-full bg-[#5B8AFF]/20 animate-bounce" style={{ animationDelay: '1s', animationDuration: '3.5s' }} />
                <div className="absolute top-1/2 -right-5 h-1.5 w-1.5 rounded-full bg-[#A78BFA]/15 animate-bounce" style={{ animationDelay: '0.5s', animationDuration: '4s' }} />
              </div>

              <h3 className="text-2xl font-bold text-white mb-2">
                Tu tienda esta lista
              </h3>
              <p className="text-[15px] text-[#94A3B8]/50 max-w-md leading-relaxed mb-2">
                Agrega tu primer producto y empieza a construir un catalogo atractivo para tus clientes.
              </p>
              <p className="text-[13px] text-[#94A3B8]/30 mb-8">
                Sube fotos, define precios y gestiona tu stock facilmente.
              </p>

              <button
                onClick={openCreate}
                className="group relative inline-flex items-center gap-2.5 rounded-xl px-8 py-3.5 text-[14px] font-bold text-white transition-all duration-300 hover:scale-[1.03] active:scale-[0.97] hover:shadow-[0_0_40px_rgba(167,139,250,0.3)]"
                style={{
                  background: 'linear-gradient(135deg, #A78BFA 0%, #8B5CF6 50%, #7C3AED 100%)',
                  boxShadow: '0 6px 20px rgba(139, 92, 246, 0.35), inset 0 1px 0 rgba(255,255,255,0.1)',
                }}
              >
                <Plus className="h-4.5 w-4.5 transition-transform duration-300 group-hover:rotate-180" />
                Agregar mi primer producto
                <Sparkles className="h-3.5 w-3.5 opacity-60" />
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* ═══ TOOLBAR ═══ */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              {/* Search */}
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#94A3B8]/30" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar producto..."
                  className="w-full h-9 rounded-xl pl-9 pr-3 text-[13px] text-white placeholder:text-[#94A3B8]/30 outline-none transition-all duration-200 focus:ring-1 focus:ring-[#A78BFA]/30"
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                  }}
                />
              </div>

              <div className="flex items-center gap-2">
                {/* View toggle */}
                <div
                  className="flex h-9 rounded-xl overflow-hidden"
                  style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.06)' }}
                >
                  <button
                    onClick={() => setViewMode('grid')}
                    className="flex items-center justify-center w-9 h-full transition-colors duration-200"
                    style={{ background: viewMode === 'grid' ? 'rgba(167, 139, 250, 0.12)' : 'transparent' }}
                  >
                    <LayoutGrid className="h-3.5 w-3.5" style={{ color: viewMode === 'grid' ? '#A78BFA' : 'rgba(148, 163, 184, 0.4)' }} />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className="flex items-center justify-center w-9 h-full transition-colors duration-200"
                    style={{ background: viewMode === 'list' ? 'rgba(167, 139, 250, 0.12)' : 'transparent' }}
                  >
                    <List className="h-3.5 w-3.5" style={{ color: viewMode === 'list' ? '#A78BFA' : 'rgba(148, 163, 184, 0.4)' }} />
                  </button>
                </div>

                <span className="text-[12px] text-[#94A3B8]/30 hidden sm:block">
                  {filteredProducts.length} producto{filteredProducts.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>

            {/* ═══ PRODUCT GRID ═══ */}
            {viewMode === 'grid' ? (
              <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredProducts.map((product, index) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    index={index}
                    onEdit={openEdit}
                    onDelete={handleDelete}
                    deletingId={deletingId}
                    deleteConfirmId={deleteConfirmId}
                    setDeleteConfirmId={setDeleteConfirmId}
                  />
                ))}
              </div>
            ) : (
              /* ═══ PRODUCT LIST ═══ */
              <div className="space-y-2">
                {filteredProducts.map((product, index) => (
                  <ProductListItem
                    key={product.id}
                    product={product}
                    index={index}
                    onEdit={openEdit}
                    onDelete={handleDelete}
                    deletingId={deletingId}
                    deleteConfirmId={deleteConfirmId}
                    setDeleteConfirmId={setDeleteConfirmId}
                  />
                ))}
              </div>
            )}

            {filteredProducts.length === 0 && searchQuery && (
              <div className="flex flex-col items-center py-16 text-center">
                <Search className="h-8 w-8 text-[#94A3B8]/20 mb-3" />
                <p className="text-[14px] text-[#94A3B8]/50">Sin resultados para &ldquo;{searchQuery}&rdquo;</p>
                <button onClick={() => setSearchQuery('')} className="text-[13px] text-[#A78BFA] mt-2 hover:underline">
                  Limpiar busqueda
                </button>
              </div>
            )}
          </>
        )}

        {/* ═══ PRODUCT DIALOG ═══ */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent
            className="sm:max-w-lg max-h-[85vh] overflow-y-auto border-0 rounded-2xl"
            style={{
              background: 'linear-gradient(180deg, rgba(17, 29, 53, 0.98) 0%, rgba(13, 21, 41, 0.99) 100%)',
              border: '1px solid rgba(167, 139, 250, 0.1)',
              boxShadow: '0 25px 80px rgba(0, 0, 0, 0.5), 0 0 40px rgba(167, 139, 250, 0.05)',
            }}
          >
            <DialogHeader>
              <DialogTitle className="text-white text-xl font-bold flex items-center gap-2.5">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-lg"
                  style={{ background: 'rgba(167, 139, 250, 0.1)', border: '1px solid rgba(167, 139, 250, 0.12)' }}
                >
                  {editingId ? <Pencil className="h-3.5 w-3.5 text-[#A78BFA]" /> : <Plus className="h-3.5 w-3.5 text-[#A78BFA]" />}
                </div>
                {editingId ? 'Editar Producto' : 'Nuevo Producto'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-5 py-2">
              {/* Name */}
              <div className="space-y-2">
                <Label className="text-[11px] text-[#94A3B8]/50 uppercase tracking-wider font-semibold">Nombre</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Nombre del producto"
                  className="text-white h-11 border-0 rounded-xl"
                  style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.06)' }}
                />
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label className="text-[11px] text-[#94A3B8]/50 uppercase tracking-wider font-semibold">Categoria</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) => { if (v) setForm(prev => ({ ...prev, category: v })) }}
                >
                  <SelectTrigger
                    className="text-white h-11 border-0 rounded-xl"
                    style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.06)' }}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Price, Currency, Stock */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label className="text-[11px] text-[#94A3B8]/50 uppercase tracking-wider font-semibold">Moneda</Label>
                  <Select
                    value={form.currency}
                    onValueChange={(v) => { if (v) setForm(prev => ({ ...prev, currency: v })) }}
                  >
                    <SelectTrigger
                      className="text-white h-11 border-0 rounded-xl"
                      style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.06)' }}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.map(c => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[11px] text-[#94A3B8]/50 uppercase tracking-wider font-semibold">Precio</Label>
                  <Input
                    type="number"
                    value={form.price || ''}
                    onChange={(e) => setForm(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                    placeholder="0.00"
                    className="text-white h-11 border-0 rounded-xl"
                    style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.06)' }}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[11px] text-[#94A3B8]/50 uppercase tracking-wider font-semibold">Stock</Label>
                  <Input
                    type="number"
                    value={form.stock || ''}
                    onChange={(e) => setForm(prev => ({ ...prev, stock: parseInt(e.target.value) || 0 }))}
                    placeholder="0"
                    className="text-white h-11 border-0 rounded-xl"
                    style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.06)' }}
                  />
                </div>
              </div>

              {/* Images */}
              <div className="space-y-2">
                <Label className="text-[11px] text-[#94A3B8]/50 uppercase tracking-wider font-semibold">Imagenes del producto</Label>
                <ImageUpload
                  value={form.images}
                  onChange={(urls) => setForm(prev => ({ ...prev, images: urls }))}
                  max={4}
                  bucket="store-products"
                  label="Sube hasta 4 imagenes de tu producto"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label className="text-[11px] text-[#94A3B8]/50 uppercase tracking-wider font-semibold">Descripcion</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe tu producto..."
                  rows={3}
                  className="text-white resize-none border-0 rounded-xl"
                  style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.06)' }}
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-2">
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={saving}
                className="text-[#CBD5E8] border-0 rounded-xl"
                style={{ border: '1px solid rgba(255, 255, 255, 0.06)' }}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="font-bold rounded-xl px-6"
                style={{
                  background: 'linear-gradient(135deg, #A78BFA, #8B5CF6)',
                  color: 'white',
                  boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)',
                }}
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {editingId ? 'Guardar Cambios' : 'Crear Producto'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}


/* ═══════════════════════════════════════════════
   PRODUCT CARD COMPONENT (Grid View)
   ═══════════════════════════════════════════════ */
function ProductCard({
  product,
  index,
  onEdit,
  onDelete,
  deletingId,
  deleteConfirmId,
  setDeleteConfirmId,
}: {
  product: StoreProduct
  index: number
  onEdit: (p: StoreProduct) => void
  onDelete: (id: string) => void
  deletingId: string | null
  deleteConfirmId: string | null
  setDeleteConfirmId: (id: string | null) => void
}) {
  const mainImage = (product.store_product_images || [])
    .sort((a, b) => a.sort_order - b.sort_order)[0]?.image_url
  const imageCount = (product.store_product_images || []).length
  const sym = currencySymbol[product.currency] || '$'

  return (
    <div
      className="group relative rounded-2xl overflow-hidden transition-all duration-300 hover:translate-y-[-2px] hover:shadow-[0_8px_40px_rgba(167,139,250,0.12)]"
      style={{
        background: 'linear-gradient(180deg, rgba(17, 29, 53, 0.9) 0%, rgba(13, 21, 41, 0.95) 100%)',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        animationDelay: `${index * 50}ms`,
      }}
    >
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden" style={{ background: 'rgba(255, 255, 255, 0.02)' }}>
        {mainImage ? (
          <img
            src={mainImage}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2">
            <Package className="h-10 w-10 text-[#94A3B8]/20" />
            <span className="text-[11px] text-[#94A3B8]/20">Sin imagen</span>
          </div>
        )}

        {/* Image overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Image count badge */}
        {imageCount > 1 && (
          <div className="absolute top-3 left-3 flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold text-white/80 backdrop-blur-sm" style={{ background: 'rgba(0, 0, 0, 0.4)' }}>
            <Eye className="h-2.5 w-2.5" />
            {imageCount}
          </div>
        )}

        {/* Stock badge */}
        {product.stock <= 5 && product.stock > 0 && (
          <div className="absolute top-3 right-3 rounded-lg px-2 py-1 text-[10px] font-bold text-amber-300 backdrop-blur-sm" style={{ background: 'rgba(245, 158, 11, 0.15)' }}>
            Quedan {product.stock}
          </div>
        )}
        {product.stock === 0 && (
          <div className="absolute top-3 right-3 rounded-lg px-2 py-1 text-[10px] font-bold text-red-300 backdrop-blur-sm" style={{ background: 'rgba(239, 68, 68, 0.15)' }}>
            Agotado
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Category */}
        <span
          className="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
          style={{ background: 'rgba(167, 139, 250, 0.06)', color: 'rgba(167, 139, 250, 0.6)', border: '1px solid rgba(167, 139, 250, 0.08)' }}
        >
          {product.category}
        </span>

        {/* Name */}
        <h3 className="text-[15px] font-bold text-white leading-snug line-clamp-2 group-hover:text-[#E2D5FF] transition-colors duration-200">
          {product.name}
        </h3>

        {/* Description */}
        {product.description && (
          <p className="text-[12px] text-[#94A3B8]/40 line-clamp-2 leading-relaxed">
            {product.description}
          </p>
        )}

        {/* Price */}
        <div className="flex items-baseline gap-1.5">
          <span className="text-[20px] font-extrabold tracking-tight" style={{ color: '#A78BFA' }}>
            {sym} {product.price?.toLocaleString()}
          </span>
          <span className="text-[11px] text-[#94A3B8]/30 font-medium">{product.currency}</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={() => onEdit(product)}
            className="flex-1 flex items-center justify-center gap-2 h-9 rounded-xl text-[12px] font-semibold text-[#CBD5E8] transition-all duration-200 hover:text-white hover:bg-white/[0.06]"
            style={{ border: '1px solid rgba(255, 255, 255, 0.06)' }}
          >
            <Pencil className="h-3 w-3" />
            Editar
          </button>

          {deleteConfirmId === product.id ? (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => onDelete(product.id)}
                disabled={deletingId === product.id}
                className="flex items-center justify-center gap-1.5 h-9 rounded-xl px-3 text-[11px] font-bold text-red-300 transition-all duration-200 hover:bg-red-500/10"
                style={{ border: '1px solid rgba(239, 68, 68, 0.15)' }}
              >
                {deletingId === product.id ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  'Eliminar'
                )}
              </button>
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex items-center justify-center h-9 w-9 rounded-xl text-[#94A3B8]/50 hover:text-white transition-colors"
                style={{ border: '1px solid rgba(255, 255, 255, 0.04)' }}
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              onClick={() => setDeleteConfirmId(product.id)}
              className="flex items-center justify-center h-9 w-9 rounded-xl text-[#94A3B8]/25 transition-all duration-200 hover:text-red-400 hover:bg-red-500/5"
              style={{ border: '1px solid rgba(255, 255, 255, 0.04)' }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}


/* ═══════════════════════════════════════════════
   PRODUCT LIST ITEM COMPONENT (List View)
   ═══════════════════════════════════════════════ */
function ProductListItem({
  product,
  index,
  onEdit,
  onDelete,
  deletingId,
  deleteConfirmId,
  setDeleteConfirmId,
}: {
  product: StoreProduct
  index: number
  onEdit: (p: StoreProduct) => void
  onDelete: (id: string) => void
  deletingId: string | null
  deleteConfirmId: string | null
  setDeleteConfirmId: (id: string | null) => void
}) {
  const mainImage = (product.store_product_images || [])
    .sort((a, b) => a.sort_order - b.sort_order)[0]?.image_url
  const sym = currencySymbol[product.currency] || '$'

  return (
    <div
      className="group flex items-center gap-4 rounded-xl p-3 transition-all duration-200 hover:bg-white/[0.02]"
      style={{
        border: '1px solid rgba(255, 255, 255, 0.04)',
        animationDelay: `${index * 30}ms`,
      }}
    >
      {/* Thumbnail */}
      <div className="relative h-16 w-16 rounded-xl overflow-hidden shrink-0" style={{ background: 'rgba(255, 255, 255, 0.02)' }}>
        {mainImage ? (
          <img src={mainImage} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="h-5 w-5 text-[#94A3B8]/20" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="text-[14px] font-bold text-white truncate">{product.name}</h3>
          <span className="text-[10px] text-[#94A3B8]/30 font-medium shrink-0">{product.category}</span>
        </div>
        {product.description && (
          <p className="text-[12px] text-[#94A3B8]/35 truncate mt-0.5">{product.description}</p>
        )}
      </div>

      {/* Stock */}
      <div className="hidden sm:block text-right shrink-0">
        <p className="text-[11px] text-[#94A3B8]/30">Stock</p>
        <p className={`text-[13px] font-bold ${product.stock === 0 ? 'text-red-400' : product.stock <= 5 ? 'text-amber-400' : 'text-white'}`}>
          {product.stock}
        </p>
      </div>

      {/* Price */}
      <div className="text-right shrink-0 min-w-[80px]">
        <span className="text-[16px] font-extrabold text-[#A78BFA]">
          {sym} {product.price?.toLocaleString()}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={() => onEdit(product)}
          className="flex items-center justify-center h-8 w-8 rounded-lg text-[#94A3B8]/40 transition-colors hover:text-[#A78BFA] hover:bg-[#A78BFA]/5"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>

        {deleteConfirmId === product.id ? (
          <div className="flex items-center gap-1">
            <button
              onClick={() => onDelete(product.id)}
              disabled={deletingId === product.id}
              className="h-8 px-2.5 rounded-lg text-[11px] font-bold text-red-300 hover:bg-red-500/10 transition-colors"
            >
              {deletingId === product.id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Si'}
            </button>
            <button
              onClick={() => setDeleteConfirmId(null)}
              className="h-8 px-2 rounded-lg text-[11px] text-[#94A3B8]/40 hover:text-white transition-colors"
            >
              No
            </button>
          </div>
        ) : (
          <button
            onClick={() => setDeleteConfirmId(product.id)}
            className="flex items-center justify-center h-8 w-8 rounded-lg text-[#94A3B8]/20 transition-colors hover:text-red-400 hover:bg-red-500/5"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}
