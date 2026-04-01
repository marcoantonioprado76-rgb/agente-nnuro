'use client'

import { useState, useEffect, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Package,
  Image as ImageIcon,
  MessageSquare,
  Truck,
  Tag,
  Save,
  X,
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Power,
  Upload,
  Star,
  DollarSign,
  FileText,
  ShieldAlert,
  Sparkles,
  ArrowLeft,
  Link,
  ExternalLink,
  ZoomIn,
  Play,
  ChevronRight,
} from 'lucide-react'
import { toast } from 'sonner'
import type { Product, ProductImage, ProductTestimonial } from '@/types'

// ── Types ──────────────────────────────────────────────────────

interface ProductFormState {
  name: string
  category: string
  is_active: boolean
  description: string
  benefits: string
  usage_instructions: string
  warnings: string
  currency: string
  price_unit: number
  offer_price: number | null
  shipping_info: string
  coverage: string
  sell_zones: string
  delivery_zones: string
  hooks: string
  product_images: ImageItem[]
  offer_images: ImageItem[]
  testimonials: TestimonialItem[]
}

interface ImageItem {
  url: string
  sort_order: number
  is_primary: boolean
}

interface TestimonialItem {
  type: 'image' | 'video' | 'text'
  url: string
  content: string
  description: string
}

interface ProductsTabProps {
  botId: string
}

// ── Constants ──────────────────────────────────────────────────

const emptyForm: ProductFormState = {
  name: '',
  category: '',
  is_active: true,
  description: '',
  benefits: '',
  usage_instructions: '',
  warnings: '',
  currency: 'USD',
  price_unit: 0,
  offer_price: null,
  shipping_info: '',
  coverage: '',
  sell_zones: '',
  delivery_zones: '',
  hooks: '',
  product_images: [],
  offer_images: [],
  testimonials: [],
}

const currencyOptions = [
  { value: 'BOB', label: 'Bs. Boliviano (BOB)' },
  { value: 'USD', label: '$ Dolar (USD)' },
  { value: 'MXN', label: '$ Peso MX (MXN)' },
  { value: 'COP', label: '$ Peso CO (COP)' },
  { value: 'EUR', label: 'Euro (EUR)' },
  { value: 'PEN', label: 'S/ Sol (PEN)' },
  { value: 'ARS', label: '$ Peso AR (ARS)' },
  { value: 'CLP', label: '$ Peso CL (CLP)' },
  { value: 'BRL', label: 'R$ Real (BRL)' },
]

const categoryOptions = [
  'Salud y Bienestar',
  'Belleza y Cuidado Personal',
  'Suplementos',
  'Tecnologia',
  'Hogar',
  'Moda',
  'Alimentos',
  'Servicios',
  'Educacion',
  'Otro',
]

// ── Main Component ─────────────────────────────────────────────

export function ProductsTab({ botId }: ProductsTabProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<ProductFormState>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('basic')
  const [uploadingImage, setUploadingImage] = useState(false)

  const fetchProducts = async () => {
    try {
      const res = await fetch(`/api/products?botId=${botId}`)
      if (res.ok) {
        setProducts(await res.json())
      } else {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error || 'Error al cargar productos')
      }
    } catch (err) {
      console.error('Error fetching products:', err)
      toast.error('Error de conexion al cargar productos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchProducts() }, [botId])

  const updateField = <K extends keyof ProductFormState>(field: K, value: ProductFormState[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm)
    setActiveTab('basic')
    setDialogOpen(true)
  }

  const openEdit = (product: Product) => {
    setEditingId(product.id)
    const pImages = (product.product_images || [])
      .filter((img) => img.image_type === 'product')
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((img) => ({ url: img.url, sort_order: img.sort_order, is_primary: img.is_primary }))

    const oImages = (product.product_images || [])
      .filter((img) => img.image_type === 'offer')
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((img) => ({ url: img.url, sort_order: img.sort_order, is_primary: img.is_primary }))

    const tests = (product.product_testimonials || []).map((t) => ({
      type: t.type,
      url: t.url || '',
      content: t.content || '',
      description: t.description || '',
    }))

    setForm({
      name: product.name || '',
      category: product.category || '',
      is_active: product.is_active,
      description: product.description || '',
      benefits: product.benefits || '',
      usage_instructions: product.usage_instructions || '',
      warnings: product.warnings || '',
      currency: product.currency || 'USD',
      price_unit: product.price_unit || 0,
      offer_price: product.offer_price ?? null,
      shipping_info: product.shipping_info || '',
      coverage: product.coverage || '',
      sell_zones: product.sell_zones || '',
      delivery_zones: product.delivery_zones || '',
      hooks: (product.hooks || []).join(', '),
      product_images: pImages,
      offer_images: oImages,
      testimonials: tests,
    })
    setActiveTab('basic')
    setDialogOpen(true)
  }

  // ── Upload helper ──

  const uploadFile = async (file: File, bucket: string): Promise<string | null> => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('bucket', bucket)
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (res.ok) {
        return data.url
      }
      toast.error(data.error || 'Error al subir imagen')
      console.error('Upload error:', data)
      return null
    } catch (err) {
      console.error('Upload fetch error:', err)
      toast.error('Error de conexion al subir imagen')
      return null
    }
  }

  // ── Image handlers ──

  const handleImageUpload = async (files: FileList, type: 'product' | 'offer') => {
    const key = type === 'product' ? 'product_images' : 'offer_images'
    const current = [...form[key]]
    if (current.length + files.length > 10) {
      toast.error('Maximo 10 archivos permitidos')
      return
    }
    setUploadingImage(true)
    const bucket = 'product-images'
    const newItems: ImageItem[] = []
    for (let i = 0; i < files.length; i++) {
      const url = await uploadFile(files[i], bucket)
      if (url) {
        newItems.push({
          url,
          sort_order: current.length + newItems.length,
          is_primary: current.length === 0 && newItems.length === 0,
        })
      }
    }
    if (newItems.length > 0) {
      updateField(key, [...current, ...newItems])
    }
    setUploadingImage(false)
  }

  const addUrlToImages = (url: string, type: 'product' | 'offer') => {
    const key = type === 'product' ? 'product_images' : 'offer_images'
    const current = form[key]
    if (current.length >= 10) {
      toast.error('Maximo 10 archivos permitidos')
      return
    }
    updateField(key, [...current, {
      url,
      sort_order: current.length,
      is_primary: current.length === 0,
    }])
    toast.success('URL agregada')
  }

  const removeImage = (type: 'product' | 'offer', index: number) => {
    const key = type === 'product' ? 'product_images' : 'offer_images'
    const updated = form[key].filter((_, i) => i !== index).map((img, i) => ({ ...img, sort_order: i }))
    if (updated.length > 0 && !updated.some(img => img.is_primary)) {
      updated[0].is_primary = true
    }
    updateField(key, updated)
  }

  const setPrimaryImage = (type: 'product' | 'offer', index: number) => {
    const key = type === 'product' ? 'product_images' : 'offer_images'
    const updated = form[key].map((img, i) => ({ ...img, is_primary: i === index }))
    updateField(key, updated)
  }

  const moveImage = (type: 'product' | 'offer', from: number, to: number) => {
    const key = type === 'product' ? 'product_images' : 'offer_images'
    const arr = [...form[key]]
    const [item] = arr.splice(from, 1)
    arr.splice(to, 0, item)
    updateField(key, arr.map((img, i) => ({ ...img, sort_order: i })))
  }

  // ── Testimonial handlers ──

  const addTestimonial = () => {
    updateField('testimonials', [...form.testimonials, { type: 'image', url: '', content: '', description: '' }])
  }

  const updateTestimonial = (index: number, field: keyof TestimonialItem, value: string) => {
    const updated = [...form.testimonials]
    updated[index] = { ...updated[index], [field]: value }
    updateField('testimonials', updated)
  }

  const removeTestimonial = (index: number) => {
    updateField('testimonials', form.testimonials.filter((_, i) => i !== index))
  }

  const uploadTestimonialImage = async (file: File, index: number) => {
    setUploadingImage(true)
    const url = await uploadFile(file, 'product-testimonials')
    if (url) {
      updateTestimonial(index, 'url', url)
    }
    setUploadingImage(false)
  }

  // ── Save ──

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('El nombre del producto es requerido')
      setActiveTab('basic')
      return
    }
    setSaving(true)

    const allImages = [
      ...form.product_images.map((img) => ({ ...img, image_type: 'product' as const })),
      ...form.offer_images.map((img) => ({ ...img, image_type: 'offer' as const })),
    ]

    const payload = {
      name: form.name.trim(),
      category: form.category.trim(),
      is_active: form.is_active,
      description: form.description.trim(),
      benefits: form.benefits.trim(),
      usage_instructions: form.usage_instructions.trim(),
      warnings: form.warnings.trim(),
      currency: form.currency,
      price_unit: form.price_unit,
      offer_price: form.offer_price || null,
      shipping_info: form.shipping_info.trim(),
      coverage: form.coverage.trim(),
      sell_zones: form.sell_zones.trim(),
      delivery_zones: form.delivery_zones.trim(),
      hooks: form.hooks.split(',').map(h => h.trim()).filter(Boolean),
      product_images: allImages,
      product_testimonials: form.testimonials.filter(t => t.url || t.content),
    }

    try {
      if (editingId) {
        const res = await fetch(`/api/products/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (res.ok) {
          const updated = await res.json()
          setProducts(prev => prev.map(p => p.id === editingId ? updated : p))
          toast.success('Producto actualizado')
          setDialogOpen(false)
        } else {
          const data = await res.json()
          toast.error(data.error || 'Error al actualizar')
        }
      } else {
        const res = await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ botId, ...payload }),
        })
        if (res.ok) {
          const created = await res.json()
          setProducts(prev => [created, ...prev])
          toast.success('Producto creado exitosamente')
          setDialogOpen(false)
        } else {
          const data = await res.json()
          toast.error(data.error || 'Error al crear producto')
        }
      }
    } catch {
      toast.error('Error de conexion')
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (id: string) => {
    setTogglingId(id)
    const product = products.find(p => p.id === id)
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !product?.is_active }),
      })
      if (res.ok) {
        setProducts(prev => prev.map(p => p.id === id ? { ...p, is_active: !p.is_active } : p))
        toast.success('Estado actualizado')
      } else {
        toast.error('Error al actualizar estado')
      }
    } catch {
      toast.error('Error de conexion')
    } finally {
      setTogglingId(null)
    }
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setProducts(prev => prev.filter(p => p.id !== id))
        toast.success('Producto eliminado')
      } else {
        toast.error('Error al eliminar producto')
      }
    } catch {
      toast.error('Error de conexion')
    } finally {
      setDeletingId(null)
    }
  }

  // ── Loading ──

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="relative">
          <div className="h-12 w-12 rounded-full border-[3px] border-[#A78BFA]/20 border-t-[#A78BFA] animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Package className="h-5 w-5 text-[#A78BFA]/60" />
          </div>
        </div>
        <p className="text-[13px] text-[#94A3B8]/50 font-medium">Cargando productos...</p>
      </div>
    )
  }

  // ── Render ──

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg flex items-center justify-center" style={{ background: 'rgba(167, 139, 250, 0.12)' }}>
            <Package className="h-[18px] w-[18px] text-[#A78BFA]" />
          </div>
          <div>
            <h2 className="text-[15px] font-semibold text-white">Productos del bot</h2>
            <p className="text-[11px] text-[#94A3B8]/60">Gestiona los productos de venta</p>
          </div>
          <Badge className="inline-flex items-center gap-1.5 rounded-full px-2.5 h-6 text-[10px] font-semibold border-0" style={{ background: 'rgba(167, 139, 250, 0.12)', color: '#A78BFA' }}>
            {products.length}
          </Badge>
        </div>
        <Button
          onClick={openCreate}
          className="gap-2 text-white border-0 rounded-xl h-10 px-5 text-[13px] font-semibold"
          style={{
            background: 'linear-gradient(135deg, #A78BFA 0%, #8B5CF6 100%)',
            boxShadow: '0 4px 15px rgba(167, 139, 250, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
          }}
        >
          <Plus className="h-4 w-4" />
          Agregar producto
        </Button>
      </div>

      {/* Product List or Empty State */}
      {products.length === 0 ? (
        <div
          className="rounded-2xl p-6 md:p-10 text-center space-y-4"
          style={{
            background: 'linear-gradient(180deg, rgba(17, 29, 53, 0.9) 0%, rgba(13, 21, 41, 0.95) 100%)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: 'rgba(167, 139, 250, 0.12)' }}>
            <Package className="h-7 w-7 text-[#A78BFA]" />
          </div>
          <h3 className="text-lg font-semibold text-white">No has agregado productos a este bot.</h3>
          <p className="text-sm text-[#94A3B8]/60 max-w-md mx-auto">
            Agrega los productos o servicios que quieres que este bot venda automaticamente por WhatsApp.
          </p>
          <Button
            onClick={openCreate}
            className="gap-2 text-white mt-2 border-0 rounded-xl h-10 px-5 text-[13px] font-semibold"
            style={{
              background: 'linear-gradient(135deg, #A78BFA 0%, #8B5CF6 100%)',
              boxShadow: '0 4px 15px rgba(167, 139, 250, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
            }}
          >
            <Plus className="h-4 w-4" />
            Agregar producto
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {products.map((product) => (
            <Card
              key={product.id}
              className="border-0 rounded-xl transition-all hover:translate-y-[-1px]"
              style={{
                background: 'linear-gradient(180deg, rgba(17, 29, 53, 0.9) 0%, rgba(13, 21, 41, 0.95) 100%)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
              }}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    {/* Thumbnail */}
                    {product.product_images && product.product_images.length > 0 ? (
                      <img
                        src={product.product_images.find(i => i.is_primary)?.url || product.product_images[0].url}
                        alt={product.name}
                        className="h-12 w-12 rounded-lg object-cover shrink-0"
                        style={{ border: '1px solid rgba(255, 255, 255, 0.08)' }}
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg shrink-0" style={{ background: 'rgba(167, 139, 250, 0.12)' }}>
                        <Package className="h-6 w-6 text-[#A78BFA]" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-semibold text-white truncate">{product.name}</h3>
                        {product.category && (
                          <Badge className="inline-flex items-center gap-1.5 rounded-full px-2.5 h-6 text-[10px] font-semibold border-0" style={{ background: 'rgba(167, 139, 250, 0.12)', color: '#A78BFA' }}>
                            {product.category}
                          </Badge>
                        )}
                        <Badge
                          className="inline-flex items-center gap-1.5 rounded-full px-2.5 h-6 text-[10px] font-semibold border-0"
                          style={product.is_active
                            ? { background: 'rgba(16, 185, 129, 0.12)', color: '#10B981' }
                            : { background: 'rgba(239, 68, 68, 0.12)', color: '#EF4444' }
                          }
                        >
                          {product.is_active ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </div>
                      {product.description && (
                        <p className="text-sm text-[#94A3B8]/60 line-clamp-1">{product.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1">
                        <p className="text-sm font-bold text-[#A78BFA]">
                          {product.currency} {product.price_unit?.toLocaleString()}
                        </p>
                        {product.offer_price && (
                          <p className="text-sm font-bold text-amber-400">
                            Oferta: {product.currency} {product.offer_price.toLocaleString()}
                          </p>
                        )}
                        {product.product_images && product.product_images.length > 0 && (
                          <span className="text-xs text-[#94A3B8]/40">{product.product_images.length} img</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggle(product.id)}
                      disabled={togglingId === product.id}
                      className="text-[#94A3B8]/70 hover:text-white h-8 w-8 p-0"
                    >
                      {togglingId === product.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Power className="h-3.5 w-3.5" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(product)}
                      className="text-[#94A3B8]/70 hover:text-white h-8 w-8 p-0"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(product.id)}
                      disabled={deletingId === product.id}
                      className="text-red-400 hover:text-red-300 h-8 w-8 p-0"
                    >
                      {deletingId === product.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── Create/Edit Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          className="sm:max-w-3xl max-h-[85vh] sm:max-h-[90vh] overflow-hidden flex flex-col p-0 border-0 rounded-2xl"
          style={{
            background: 'linear-gradient(180deg, rgba(17, 29, 53, 0.98) 0%, rgba(13, 21, 41, 1) 100%)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5)',
          }}
        >
          <DialogHeader className="px-4 md:px-6 pt-4 md:pt-5 pb-3 shrink-0" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <DialogTitle className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg flex items-center justify-center" style={{ background: 'rgba(167, 139, 250, 0.12)' }}>
                <Package className="h-[18px] w-[18px] text-[#A78BFA]" />
              </div>
              <span className="text-[15px] font-semibold text-white">
                {editingId ? 'Editar Producto' : 'Nuevo Producto'}
              </span>
            </DialogTitle>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            {/* Desktop tabs - hidden on mobile */}
            <TabsList
              className="hidden sm:flex w-full justify-start gap-1 bg-transparent rounded-none px-4 md:px-6 py-2 shrink-0 overflow-x-auto h-auto"
              style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}
            >
              {[
                { value: 'basic', label: 'Basico', icon: FileText },
                { value: 'info', label: 'Info', icon: MessageSquare },
                { value: 'prices', label: 'Precios', icon: DollarSign },
                { value: 'images', label: 'Imagenes', icon: ImageIcon },
                { value: 'offer-images', label: 'Oferta', icon: Sparkles },
                { value: 'testimonials', label: 'Testimonios', icon: Star },
                { value: 'shipping', label: 'Envio', icon: Truck },
                { value: 'hooks', label: 'Keywords', icon: Tag },
              ].map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="data-[state=active]:bg-[#A78BFA]/15 data-[state=active]:text-[#A78BFA] data-[state=active]:shadow-none text-[#94A3B8]/60 text-xs gap-1.5 rounded-lg px-3 h-8 border-0 transition-all"
                >
                  <tab.icon className="h-3 w-3" /> {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* Mobile section selector - visible only on small screens */}
            <MobileProductSections activeTab={activeTab} onSelect={setActiveTab} />

            <div className={`flex-1 overflow-y-auto px-4 md:px-6 py-4 ${activeTab === '__menu__' ? 'hidden' : ''}`}>
              {/* ── TAB: Basico ── */}
              <TabsContent value="basic" className="mt-0 space-y-5">
                <SectionHeader icon={<FileText className="h-4 w-4 text-[#A78BFA]" />} title="Informacion basica" subtitle="Datos principales del producto" />

                <div className="space-y-2">
                  <Label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#94A3B8]/50">Nombre del producto *</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => updateField('name', e.target.value)}
                    placeholder="Ej: Super Detox Natural 500ml"
                    className="h-11 text-white rounded-xl"
                    style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-2">
                    <Label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#94A3B8]/50">Categoria</Label>
                    <Select value={form.category} onValueChange={(v) => { if (v) updateField('category', v) }}>
                      <SelectTrigger className="h-11 text-white rounded-xl" style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                        <SelectValue placeholder="Seleccionar categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        {categoryOptions.map((cat) => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 flex flex-col justify-end">
                    <Label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#94A3B8]/50">Estado</Label>
                    <div className="flex items-center gap-3 h-9">
                      <Switch
                        checked={form.is_active}
                        onCheckedChange={(checked) => updateField('is_active', checked)}
                      />
                      <span className={`text-sm font-medium ${form.is_active ? 'text-[#10B981]' : 'text-red-400'}`}>
                        {form.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                  </div>
                </div>

              </TabsContent>

              {/* ── TAB: Info ── */}
              <TabsContent value="info" className="mt-0 space-y-5">
                <SectionHeader icon={<MessageSquare className="h-4 w-4 text-[#A78BFA]" />} title="Informacion del producto" subtitle="Detalles y beneficios" />

                <div className="space-y-2">
                  <Label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#94A3B8]/50">Descripcion</Label>
                  <Textarea
                    value={form.description}
                    onChange={(e) => updateField('description', e.target.value)}
                    placeholder="Descripcion detallada del producto..."
                    rows={4}
                    className="text-white rounded-xl"
                    style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#94A3B8]/50">Beneficios</Label>
                  <Textarea
                    value={form.benefits}
                    onChange={(e) => updateField('benefits', e.target.value)}
                    placeholder="Lista los beneficios principales..."
                    rows={4}
                    className="text-white rounded-xl"
                    style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#94A3B8]/50">Modo de uso</Label>
                  <Textarea
                    value={form.usage_instructions}
                    onChange={(e) => updateField('usage_instructions', e.target.value)}
                    placeholder="Instrucciones de uso del producto..."
                    rows={3}
                    className="text-white rounded-xl"
                    style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#94A3B8]/50 flex items-center gap-2">
                    <ShieldAlert className="h-3.5 w-3.5 text-amber-400" />
                    Advertencias
                  </Label>
                  <Textarea
                    value={form.warnings}
                    onChange={(e) => updateField('warnings', e.target.value)}
                    placeholder="Advertencias, contraindicaciones o precauciones..."
                    rows={2}
                    className="text-white rounded-xl"
                    style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
                  />
                </div>
              </TabsContent>

              {/* ── TAB: Precios ── */}
              <TabsContent value="prices" className="mt-0 space-y-5">
                <SectionHeader icon={<DollarSign className="h-4 w-4 text-[#10B981]" />} title="Precios" subtitle="Configuracion de precios y ofertas" />

                <div className="space-y-2">
                  <Label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#94A3B8]/50">Moneda</Label>
                  <Select value={form.currency} onValueChange={(v) => { if (v) updateField('currency', v) }}>
                    <SelectTrigger className="h-11 text-white rounded-xl" style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                      <SelectValue placeholder="Selecciona moneda" />
                    </SelectTrigger>
                    <SelectContent>
                      {currencyOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-2">
                    <Label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#94A3B8]/50">Precio unitario</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]/40" />
                      <Input
                        type="number"
                        value={form.price_unit || ''}
                        onChange={(e) => updateField('price_unit', parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        className="pl-9 h-11 text-white rounded-xl"
                        style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#94A3B8]/50 flex items-center gap-1">
                      <Sparkles className="h-3 w-3 text-amber-400" /> Precio oferta
                    </Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-500" />
                      <Input
                        type="number"
                        value={form.offer_price ?? ''}
                        onChange={(e) => updateField('offer_price', e.target.value ? parseFloat(e.target.value) : null)}
                        placeholder="Opcional"
                        className="pl-9 h-11 text-white rounded-xl"
                        style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(251, 191, 36, 0.2)' }}
                      />
                    </div>
                    <p className="text-xs text-[#94A3B8]/40">Precio especial de oferta (opcional).</p>
                  </div>
                </div>

                {form.price_unit > 0 && (
                  <div
                    className="rounded-xl p-4 space-y-2"
                    style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.06)' }}
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#94A3B8]/50">Vista previa</p>
                    <div className="flex items-center gap-4">
                      <div>
                        <p className={`text-lg font-bold ${form.offer_price ? 'text-[#94A3B8]/40 line-through' : 'text-white'}`}>
                          {form.currency} {form.price_unit.toLocaleString()}
                        </p>
                      </div>
                      {form.offer_price && (
                        <div>
                          <p className="text-lg font-bold text-amber-400">
                            {form.currency} {form.offer_price.toLocaleString()}
                          </p>
                          <p className="text-xs text-[#10B981]">
                            Ahorra {Math.round(((form.price_unit - form.offer_price) / form.price_unit) * 100)}%
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* ── TAB: Imagenes del producto ── */}
              <TabsContent value="images" className="mt-0 space-y-5">
                <ImageSection
                  title="Imagenes del producto"
                  description="Imagenes principales que el bot enviara al cliente."
                  images={form.product_images}
                  type="product"
                  uploading={uploadingImage}
                  onUpload={handleImageUpload}
                  onRemove={removeImage}
                  onSetPrimary={setPrimaryImage}
                  onMove={moveImage}
                  onAddUrl={addUrlToImages}
                />
              </TabsContent>

              {/* ── TAB: Imagenes de oferta ── */}
              <TabsContent value="offer-images" className="mt-0 space-y-5">
                <ImageSection
                  title="Imagenes de oferta"
                  description="Imagenes especiales de oferta/promocion que el bot usara al negociar precios."
                  images={form.offer_images}
                  type="offer"
                  uploading={uploadingImage}
                  onUpload={handleImageUpload}
                  onRemove={removeImage}
                  onSetPrimary={setPrimaryImage}
                  onMove={moveImage}
                  onAddUrl={addUrlToImages}
                />
              </TabsContent>

              {/* ── TAB: Testimonios ── */}
              <TabsContent value="testimonials" className="mt-0 space-y-5">
                <SectionHeader icon={<Star className="h-4 w-4 text-amber-400" />} title="Testimonios" subtitle="Prueba social para generar confianza" />
                <p className="text-sm text-[#94A3B8]/60">
                  Agrega testimonios de clientes que el bot puede enviar para generar confianza.
                </p>

                {form.testimonials.map((t, i) => (
                  <Card
                    key={i}
                    className="border-0 rounded-xl"
                    style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.06)' }}
                  >
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <Badge className="inline-flex items-center gap-1.5 rounded-full px-2.5 h-6 text-[10px] font-semibold border-0" style={{ background: 'rgba(251, 191, 36, 0.12)', color: '#FBBF24' }}>
                          Testimonio {i + 1}
                        </Badge>
                        <Button
                          variant="ghost" size="sm"
                          onClick={() => removeTestimonial(i)}
                          className="text-red-400 hover:text-red-300 h-7 w-7 p-0"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#94A3B8]/50">Tipo</Label>
                          <Select value={t.type} onValueChange={(v) => { if (v) updateTestimonial(i, 'type', v) }}>
                            <SelectTrigger className="h-9 text-white rounded-xl" style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="image">Imagen</SelectItem>
                              <SelectItem value="video">Video</SelectItem>
                              <SelectItem value="text">Texto</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#94A3B8]/50">Descripcion</Label>
                          <Input
                            value={t.description}
                            onChange={(e) => updateTestimonial(i, 'description', e.target.value)}
                            placeholder="Ej: Resultado despues de 30 dias"
                            className="h-9 text-white rounded-xl"
                            style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
                          />
                        </div>
                      </div>

                      {t.type === 'text' ? (
                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#94A3B8]/50">Contenido del testimonio</Label>
                          <Textarea
                            value={t.content}
                            onChange={(e) => updateTestimonial(i, 'content', e.target.value)}
                            placeholder="Texto del testimonio del cliente..."
                            rows={2}
                            className="text-white rounded-xl"
                            style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
                          />
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {t.url ? (
                            <div className="space-y-2">
                              <div className="flex items-start gap-3">
                                {t.type === 'image' ? (
                                  <img src={t.url} alt="Testimonio" className="h-20 w-20 rounded-lg object-cover shrink-0" style={{ border: '1px solid rgba(255, 255, 255, 0.08)' }} />
                                ) : (
                                  <video
                                    src={t.url}
                                    controls
                                    className="w-full max-w-xs rounded-lg"
                                    style={{ maxHeight: '180px', border: '1px solid rgba(255, 255, 255, 0.08)' }}
                                  />
                                )}
                                <div className="flex-1 min-w-0 pt-1">
                                  <p className="text-xs text-[#94A3B8]/50 truncate">{t.url}</p>
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => updateTestimonial(i, 'url', '')} className="text-red-400 h-7 w-7 p-0 shrink-0">
                                  <X className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex gap-2">
                              <Input
                                value={t.url}
                                onChange={(e) => updateTestimonial(i, 'url', e.target.value)}
                                placeholder="URL de la imagen o video..."
                                className="flex-1 h-9 text-white rounded-xl"
                                style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
                              />
                              {(t.type === 'image' || t.type === 'video') && (
                                <label
                                  className="cursor-pointer inline-flex items-center gap-1.5 h-9 px-3 rounded-xl text-sm text-[#94A3B8]/70 hover:text-white transition-colors"
                                  style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
                                >
                                  <input
                                    type="file"
                                    accept={t.type === 'video' ? 'video/*' : 'image/*'}
                                    className="hidden"
                                    onChange={(e) => {
                                      if (e.target.files?.[0]) uploadTestimonialImage(e.target.files[0], i)
                                    }}
                                  />
                                  <Upload className="h-3 w-3" /> Subir
                                </label>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}

                <Button
                  onClick={addTestimonial}
                  variant="outline"
                  className="w-full gap-2 border-dashed text-amber-400 hover:text-amber-300 rounded-xl h-11"
                  style={{ borderColor: 'rgba(251, 191, 36, 0.2)', background: 'rgba(251, 191, 36, 0.05)' }}
                >
                  <Plus className="h-4 w-4" />
                  Agregar testimonio
                </Button>
              </TabsContent>

              {/* ── TAB: Envio ── */}
              <TabsContent value="shipping" className="mt-0 space-y-5">
                <SectionHeader icon={<Truck className="h-4 w-4 text-[#56CCF2]" />} title="Envio y cobertura" subtitle="Zonas de envio y entrega" />

                <div className="space-y-2">
                  <Label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#94A3B8]/50">Informacion de envio</Label>
                  <Textarea
                    value={form.shipping_info}
                    onChange={(e) => updateField('shipping_info', e.target.value)}
                    placeholder="Ej: Envio gratis a todo el pais, llega en 3-5 dias habiles..."
                    rows={3}
                    className="text-white rounded-xl"
                    style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#94A3B8]/50">Cobertura</Label>
                  <Textarea
                    value={form.coverage}
                    onChange={(e) => updateField('coverage', e.target.value)}
                    placeholder="Ej: Cobertura nacional, envios a todo Mexico, Bolivia, Peru..."
                    rows={2}
                    className="text-white rounded-xl"
                    style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-2">
                    <Label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#94A3B8]/50">Zonas de venta</Label>
                    <Textarea
                      value={form.sell_zones}
                      onChange={(e) => updateField('sell_zones', e.target.value)}
                      placeholder="Zonas donde se vende el producto..."
                      rows={3}
                      className="text-white rounded-xl"
                      style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
                    />
                    <p className="text-xs text-[#94A3B8]/40">Ciudades o regiones donde el bot puede ofrecer este producto.</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#94A3B8]/50">Zonas de entrega</Label>
                    <Textarea
                      value={form.delivery_zones}
                      onChange={(e) => updateField('delivery_zones', e.target.value)}
                      placeholder="Zonas de entrega directa..."
                      rows={3}
                      className="text-white rounded-xl"
                      style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
                    />
                    <p className="text-xs text-[#94A3B8]/40">Zonas donde se realiza entrega directa o express.</p>
                  </div>
                </div>
              </TabsContent>

              {/* ── TAB: Hooks ── */}
              <TabsContent value="hooks" className="mt-0 space-y-5">
                <SectionHeader icon={<Tag className="h-4 w-4 text-[#A78BFA]" />} title="Keywords / Hooks" subtitle="Palabras clave de activacion" />

                <div className="space-y-2">
                  <Label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#94A3B8]/50">Palabras clave</Label>
                  <Textarea
                    value={form.hooks}
                    onChange={(e) => updateField('hooks', e.target.value)}
                    placeholder="detox, limpieza, bajar de peso, natural, salud (separados por coma)"
                    rows={3}
                    className="text-white rounded-xl"
                    style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
                  />
                  <p className="text-xs text-[#94A3B8]/40">
                    Palabras clave separadas por coma. Cuando un cliente mencione alguna de estas palabras, el bot activara este producto en la conversacion.
                  </p>
                </div>

                {form.hooks && (
                  <div
                    className="rounded-xl p-4"
                    style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.06)' }}
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#94A3B8]/50 mb-3">Vista previa de keywords</p>
                    <div className="flex flex-wrap gap-2">
                      {form.hooks.split(',').map(h => h.trim()).filter(Boolean).map((keyword, i) => (
                        <Badge key={i} className="inline-flex items-center gap-1.5 rounded-full px-2.5 h-6 text-[10px] font-semibold border-0" style={{ background: 'rgba(167, 139, 250, 0.12)', color: '#A78BFA' }}>
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>
            </div>
          </Tabs>

          {/* Footer */}
          <div className={`px-4 md:px-6 py-3 md:py-4 flex items-center justify-between shrink-0 ${activeTab === '__menu__' ? 'hidden' : ''}`} style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <Button
              variant="ghost"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
              className="gap-1 text-[#94A3B8]/70 hover:text-white rounded-xl"
            >
              <X className="h-4 w-4" />
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="gap-2 text-white min-w-[160px] border-0 rounded-xl h-10 text-[13px] font-semibold"
              style={{
                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
              }}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {editingId ? 'Actualizar producto' : 'Crear producto'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ── Reusable sub-components ────────────────────────────────────

function SectionHeader({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-3 pb-3" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
      <div className="h-9 w-9 rounded-lg flex items-center justify-center" style={{ background: 'rgba(167, 139, 250, 0.1)' }}>
        {icon}
      </div>
      <div>
        <h3 className="text-[15px] font-semibold text-white">{title}</h3>
        {subtitle && <p className="text-[11px] text-[#94A3B8]/60">{subtitle}</p>}
      </div>
    </div>
  )
}

function ImageSection({
  title,
  description,
  images,
  type,
  uploading,
  onUpload,
  onRemove,
  onSetPrimary,
  onMove,
  onAddUrl,
}: {
  title: string
  description: string
  images: ImageItem[]
  type: 'product' | 'offer'
  uploading: boolean
  onUpload: (files: FileList, type: 'product' | 'offer') => void
  onRemove: (type: 'product' | 'offer', index: number) => void
  onSetPrimary: (type: 'product' | 'offer', index: number) => void
  onMove: (type: 'product' | 'offer', from: number, to: number) => void
  onAddUrl: (url: string, type: 'product' | 'offer') => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [urlInput, setUrlInput] = useState('')
  const [addingUrl, setAddingUrl] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const handleAddUrl = () => {
    const url = urlInput.trim()
    if (!url) return
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      toast.error('La URL debe empezar con http:// o https://')
      return
    }
    onAddUrl(url, type)
    setUrlInput('')
    setAddingUrl(false)
  }

  const isVideoUrl = (url: string) => /\.(mp4|mov|webm|avi|mkv)(\?|$)/i.test(url)
  const previewIsVideo = previewUrl ? isVideoUrl(previewUrl) : false

  return (
    <div className="space-y-4">
      <SectionHeader
        icon={type === 'product' ? <ImageIcon className="h-4 w-4 text-[#A78BFA]" /> : <Sparkles className="h-4 w-4 text-amber-400" />}
        title={title}
        subtitle={description}
      />
      <p className="text-sm text-[#94A3B8]/60">{description}</p>

      {/* Media grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 sm:gap-3">
          {images.map((img, i) => {
            const isVideo = isVideoUrl(img.url)
            return (
            <div key={i} className="relative group">
              {isVideo ? (
                <div
                  className="w-full aspect-square rounded-lg flex items-center justify-center relative overflow-hidden"
                  style={{
                    background: 'rgba(0,0,0,0.4)',
                    border: img.is_primary ? '2px solid #A78BFA' : '2px solid rgba(255, 255, 255, 0.06)',
                  }}
                >
                  <video src={img.url} className="w-full h-full object-cover absolute inset-0" muted playsInline />
                  <Play className="h-6 w-6 text-white/80 relative z-10 drop-shadow-lg" />
                </div>
              ) : (
                <img
                  src={img.url}
                  alt={`Imagen ${i + 1}`}
                  className="w-full aspect-square rounded-lg object-cover transition-all"
                  style={{
                    border: img.is_primary ? '2px solid #A78BFA' : '2px solid rgba(255, 255, 255, 0.06)',
                  }}
                />
              )}
              {img.is_primary && (
                <div
                  className="absolute top-1 left-1 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold"
                  style={{ background: 'linear-gradient(135deg, #A78BFA 0%, #8B5CF6 100%)' }}
                >
                  Principal
                </div>
              )}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-1">
                <Button
                  variant="ghost" size="sm"
                  onClick={() => setPreviewUrl(img.url)}
                  className="h-7 w-7 p-0 text-white hover:text-[#56CCF2]"
                  title="Ampliar"
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost" size="sm"
                  onClick={() => window.open(img.url, '_blank')}
                  className="h-7 w-7 p-0 text-white hover:text-[#56CCF2]"
                  title="Abrir en nueva pestaña"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
                {!img.is_primary && (
                  <Button
                    variant="ghost" size="sm"
                    onClick={() => onSetPrimary(type, i)}
                    className="h-7 w-7 p-0 text-[#A78BFA] hover:text-[#C4B5FD]"
                    title="Hacer principal"
                  >
                    <Star className="h-3.5 w-3.5" />
                  </Button>
                )}
                {i > 0 && (
                  <Button
                    variant="ghost" size="sm"
                    onClick={() => onMove(type, i, i - 1)}
                    className="h-7 w-7 p-0 text-white hover:text-[#94A3B8]"
                    title="Mover izquierda"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                  </Button>
                )}
                <Button
                  variant="ghost" size="sm"
                  onClick={() => onRemove(type, i)}
                  className="h-7 w-7 p-0 text-red-400 hover:text-red-300"
                  title="Eliminar"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )})}
        </div>
      )}

      {/* Upload + URL area */}
      {images.length < 10 && (
        <div className="space-y-3">
          <label className="cursor-pointer block">
            <input
              ref={fileRef}
              type="file"
              accept="image/*,video/mp4,video/quicktime,video/webm"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  onUpload(e.target.files, type)
                  e.target.value = ''
                }
              }}
            />
            <div
              className="border-2 border-dashed rounded-xl p-5 text-center transition-all hover:border-[#A78BFA]/40"
              style={{ borderColor: 'rgba(255, 255, 255, 0.08)' }}
            >
              {uploading ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="h-8 w-8 rounded-full border-[3px] border-[#A78BFA]/20 border-t-[#A78BFA] animate-spin" />
                  <p className="text-sm text-[#94A3B8]/50">Optimizando y subiendo...</p>
                </div>
              ) : (
                <>
                  <Upload className="h-7 w-7 text-[#94A3B8]/30 mx-auto mb-1.5" />
                  <p className="text-sm text-[#94A3B8]/60">Click para subir imagenes o videos</p>
                  <p className="text-xs text-[#94A3B8]/40 mt-1">Se optimizan automaticamente. {images.length}/10 archivos</p>
                </>
              )}
            </div>
          </label>

          {/* URL paste */}
          {addingUrl ? (
            <div className="flex gap-2">
              <Input
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddUrl()}
                placeholder="https://ejemplo.com/imagen.jpg"
                className="flex-1 h-9 text-white rounded-xl text-sm"
                style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
                autoFocus
              />
              <Button onClick={handleAddUrl} size="sm" className="h-9 px-3 rounded-xl bg-[#A78BFA] hover:bg-[#8B5CF6] text-white">
                <Plus className="h-3.5 w-3.5" />
              </Button>
              <Button onClick={() => { setAddingUrl(false); setUrlInput('') }} variant="ghost" size="sm" className="h-9 w-9 p-0 text-[#94A3B8]">
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <button
              onClick={() => setAddingUrl(true)}
              className="flex items-center gap-2 text-[12px] text-[#94A3B8]/50 hover:text-[#A78BFA] transition-colors"
            >
              <Link className="h-3.5 w-3.5" />
              O pegar URL de imagen/video
            </button>
          )}
        </div>
      )}

      {/* Lightbox preview */}
      {previewUrl && (
        <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
          <DialogContent className="max-w-3xl p-2 bg-black/95 border-white/10">
            <div className="flex justify-end gap-2 mb-1">
              <Button
                variant="ghost" size="sm"
                onClick={() => window.open(previewUrl, '_blank')}
                className="h-8 px-3 text-xs text-[#94A3B8] hover:text-white"
              >
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Abrir original
              </Button>
            </div>
            {previewIsVideo ? (
              <video src={previewUrl} controls autoPlay className="w-full max-h-[70vh] rounded-lg" />
            ) : (
              <img src={previewUrl} alt="Preview" className="w-full max-h-[70vh] object-contain rounded-lg" />
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

// ── Mobile section selector for product dialog ──
const PRODUCT_SECTIONS = [
  { value: 'basic', label: 'Basico', desc: 'Nombre, categoria, estado', icon: FileText, color: '#A78BFA' },
  { value: 'info', label: 'Informacion', desc: 'Descripcion y beneficios', icon: MessageSquare, color: '#56CCF2' },
  { value: 'prices', label: 'Precios', desc: 'Precios y ofertas', icon: DollarSign, color: '#10B981' },
  { value: 'images', label: 'Imagenes', desc: 'Fotos del producto', icon: ImageIcon, color: '#A78BFA' },
  { value: 'offer-images', label: 'Imgs. Oferta', desc: 'Fotos de promocion', icon: Sparkles, color: '#F59E0B' },
  { value: 'testimonials', label: 'Testimonios', desc: 'Prueba social', icon: Star, color: '#FBBF24' },
  { value: 'shipping', label: 'Envio', desc: 'Zonas y cobertura', icon: Truck, color: '#56CCF2' },
  { value: 'hooks', label: 'Keywords', desc: 'Palabras de activacion', icon: Tag, color: '#A78BFA' },
]

function MobileProductSections({ activeTab, onSelect }: { activeTab: string; onSelect: (v: string) => void }) {
  const current = PRODUCT_SECTIONS.find((s) => s.value === activeTab)

  return (
    <div className="sm:hidden shrink-0" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
      {/* Current section indicator + dropdown */}
      <div className="px-4 py-2.5">
        <button
          onClick={() => onSelect('__menu__')}
          className="w-full flex items-center gap-2.5 rounded-xl p-2.5 transition-all"
          style={{
            background: current ? `${current.color}10` : 'rgba(255,255,255,0.03)',
            border: `1px solid ${current ? `${current.color}20` : 'rgba(255,255,255,0.06)'}`,
          }}
        >
          {current && (
            <>
              <div
                className="flex h-8 w-8 items-center justify-center rounded-lg shrink-0"
                style={{ background: `${current.color}18` }}
              >
                <current.icon className="h-4 w-4" style={{ color: current.color }} />
              </div>
              <div className="flex-1 text-left">
                <p className="text-[13px] font-semibold text-white">{current.label}</p>
                <p className="text-[10px] text-[#94A3B8]/50">{current.desc}</p>
              </div>
              <span className="text-[10px] text-[#94A3B8]/40 font-medium">Cambiar seccion</span>
              <ChevronRight className="h-3.5 w-3.5 text-[#94A3B8]/30 rotate-90" />
            </>
          )}
        </button>
      </div>

      {/* Expanded menu */}
      {activeTab === '__menu__' && (
        <div className="px-4 pb-3 space-y-1.5 max-h-[50vh] overflow-y-auto">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]/40 px-1 pb-1">Selecciona una seccion</p>
          {PRODUCT_SECTIONS.map((section) => (
            <button
              key={section.value}
              onClick={() => onSelect(section.value)}
              className="w-full flex items-center gap-2.5 rounded-xl p-2.5 transition-all active:scale-[0.98]"
              style={{
                background: 'rgba(255, 255, 255, 0.025)',
                border: '1px solid rgba(255, 255, 255, 0.04)',
              }}
            >
              <div
                className="flex h-8 w-8 items-center justify-center rounded-lg shrink-0"
                style={{ background: `${section.color}15`, border: `1px solid ${section.color}20` }}
              >
                <section.icon className="h-4 w-4" style={{ color: section.color }} />
              </div>
              <div className="flex-1 text-left">
                <p className="text-[13px] font-medium text-white">{section.label}</p>
                <p className="text-[10px] text-[#94A3B8]/50">{section.desc}</p>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-[#94A3B8]/25 shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
