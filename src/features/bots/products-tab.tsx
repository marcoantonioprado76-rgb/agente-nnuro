'use client'

import { useState, useEffect, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
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
  Video,
  Camera,
} from 'lucide-react'
import { toast } from 'sonner'
import type { Product, ProductImage, ProductTestimonial } from '@/types'

// ── Types ──────────────────────────────────────────────────────

interface ProductFormState {
  name: string
  category: string
  is_active: boolean
  first_message: string
  description: string
  benefits: string
  usage_instructions: string
  warnings: string
  currency: string
  price_unit: number
  offer_price: number | null
  price_promo_x2: number | null
  price_super_x6: number | null
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
  first_message: '',
  description: '',
  benefits: '',
  usage_instructions: '',
  warnings: '',
  currency: 'USD',
  price_unit: 0,
  offer_price: null,
  price_promo_x2: null,
  price_super_x6: null,
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

// ── METO Design Tokens ────────────────────────────────────────

const inputClass = 'w-full bg-[#0B0B12]/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-violet-400/40 transition-colors'
const textareaClass = `${inputClass} resize-y`
const labelClass = 'block text-xs font-medium text-white/50 mb-1.5'
const sectionClass = 'bg-white/5 border border-white/10 p-5 rounded-2xl space-y-4'
const sectionHeaderClass = 'flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider'

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
      first_message: product.first_message || '',
      description: product.description || '',
      benefits: product.benefits || '',
      usage_instructions: product.usage_instructions || '',
      warnings: product.warnings || '',
      currency: product.currency || 'USD',
      price_unit: product.price_unit || 0,
      offer_price: product.offer_price ?? null,
      price_promo_x2: product.price_promo_x2 ?? null,
      price_super_x6: product.price_super_x6 ?? null,
      shipping_info: product.shipping_info || '',
      coverage: product.coverage || '',
      sell_zones: product.sell_zones || '',
      delivery_zones: product.delivery_zones || '',
      hooks: (product.hooks || []).join(', '),
      product_images: pImages,
      offer_images: oImages,
      testimonials: tests,
    })
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
      first_message: form.first_message.trim(),
      description: form.description.trim(),
      benefits: form.benefits.trim(),
      usage_instructions: form.usage_instructions.trim(),
      warnings: form.warnings.trim(),
      currency: form.currency,
      price_unit: form.price_unit,
      offer_price: form.offer_price || null,
      price_promo_x2: form.price_promo_x2 || null,
      price_super_x6: form.price_super_x6 || null,
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

  // ── Helper: single image upload slot ──
  const handleSingleSlotUpload = async (file: File, type: 'product' | 'offer', slotIndex: number) => {
    const key = type === 'product' ? 'product_images' : 'offer_images'
    setUploadingImage(true)
    const url = await uploadFile(file, 'product-images')
    if (url) {
      const current = [...form[key]]
      const newItem: ImageItem = { url, sort_order: slotIndex, is_primary: slotIndex === 0 && current.length === 0 }
      if (slotIndex < current.length) {
        current[slotIndex] = newItem
      } else {
        while (current.length < slotIndex) {
          current.push({ url: '', sort_order: current.length, is_primary: false })
        }
        current.push(newItem)
      }
      updateField(key, current.filter(img => img.url !== '').map((img, i) => ({ ...img, sort_order: i, is_primary: i === 0 })))
    }
    setUploadingImage(false)
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

  // ── Image slot component (METO style) ──
  const ImageSlot = ({ index, image, type, label }: { index: number; image?: ImageItem; type: 'product' | 'offer'; label: string }) => (
    <div className="space-y-1.5">
      {image?.url ? (
        <div className="relative group">
          <img
            src={image.url}
            alt={label}
            className="w-full aspect-square rounded-xl object-cover border border-white/10"
          />
          <button
            onClick={() => removeImage(type, index)}
            className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full flex items-center justify-center bg-red-500/90 text-white opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <label className="cursor-pointer block">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) handleSingleSlotUpload(e.target.files[0], type, index)
            }}
          />
          <div className="w-full aspect-square rounded-xl flex flex-col items-center justify-center gap-1.5 border-2 border-dashed border-pink-400/30 bg-white/[0.02] hover:border-pink-400/50 hover:bg-white/[0.04] transition-all">
            <Upload className="h-5 w-5 text-white/25" />
            <span className="text-[10px] text-white/25 text-center px-1">{label}</span>
          </div>
        </label>
      )}
    </div>
  )

  // ── Testimonial image slot (METO style with row layout) ──
  const TestimonialRow = ({ index }: { index: number }) => {
    const testimonial = form.testimonials[index]
    const hasImage = testimonial?.url

    return (
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_2fr] gap-2 items-start">
        <input
          type="text"
          value={testimonial?.description || ''}
          onChange={(e) => {
            const current = [...form.testimonials]
            while (current.length <= index) {
              current.push({ type: 'image', url: '', content: '', description: '' })
            }
            current[index] = { ...current[index], description: e.target.value }
            updateField('testimonials', current)
          }}
          placeholder={`Descripcion testimonio ${index + 1}`}
          className={inputClass}
        />
        <div>
          {hasImage ? (
            <div className="flex items-center gap-2">
              <img
                src={testimonial.url}
                alt={`Testimonio ${index + 1}`}
                className="h-10 w-10 rounded-lg object-cover border border-white/10"
              />
              <span className="text-xs text-emerald-400 flex-1 truncate">Subido</span>
              <button
                onClick={() => {
                  if (testimonial) updateTestimonial(index, 'url', '')
                }}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-red-400 hover:bg-red-400/10 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <label className="cursor-pointer block">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  if (e.target.files?.[0]) {
                    const current = [...form.testimonials]
                    while (current.length <= index) {
                      current.push({ type: 'image', url: '', content: '', description: '' })
                    }
                    updateField('testimonials', current)
                    setUploadingImage(true)
                    const url = await uploadFile(e.target.files[0], 'product-testimonials')
                    if (url) {
                      const updated = [...form.testimonials]
                      while (updated.length <= index) {
                        updated.push({ type: 'image', url: '', content: '', description: '' })
                      }
                      updated[index] = { ...updated[index], type: 'image', url }
                      updateField('testimonials', updated)
                    }
                    setUploadingImage(false)
                  }
                }}
              />
              <div className="flex items-center justify-center gap-2 h-10 rounded-xl border border-dashed border-white/10 bg-white/[0.02] hover:border-violet-400/30 hover:bg-white/[0.04] transition-all cursor-pointer">
                <Upload className="h-3.5 w-3.5 text-white/30" />
                <span className="text-xs text-white/30">Subir foto</span>
              </div>
            </label>
          )}
        </div>
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
          className="sm:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0 border-0 rounded-2xl"
          style={{
            background: '#0D0D14',
            border: '1px solid rgba(139, 92, 246, 0.15)',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5)',
          }}
        >
          {/* Dialog Header */}
          <DialogHeader className="px-5 md:px-6 pt-4 md:pt-5 pb-3 shrink-0 relative" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <DialogTitle className="flex items-center gap-3 pr-8">
              <div className="h-9 w-9 rounded-lg flex items-center justify-center bg-amber-400/10">
                <Package className="h-[18px] w-[18px] text-amber-400" />
              </div>
              <span className="text-[15px] font-semibold text-white">
                {editingId ? 'Editar producto' : 'Nuevo producto'}
              </span>
            </DialogTitle>
            <button
              onClick={() => setDialogOpen(false)}
              className="absolute top-4 right-4 h-8 w-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/5 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </DialogHeader>

          {/* Scrollable form content */}
          <div className="flex-1 overflow-y-auto px-5 md:px-6 py-5 space-y-5">

            {/* ── SECTION 1: INFORMACION BASICA (barra violeta) ── */}
            <div className={sectionClass}>
              <div className={sectionHeaderClass}>
                <span className="w-1 h-3.5 bg-violet-400/70 rounded-full" />
                INFORMACION BASICA
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Nombre del producto *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => updateField('name', e.target.value)}
                    placeholder="Ej: Super Detox Natural 500ml"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Categoria</label>
                  <Select value={form.category} onValueChange={(v) => { if (v) updateField('category', v) }}>
                    <SelectTrigger className="w-full bg-[#0B0B12]/50 border border-white/10 rounded-xl h-[42px] text-sm text-white focus:border-violet-400/40">
                      <SelectValue placeholder="Seleccionar categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {categoryOptions.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className={labelClass}>Primer mensaje del producto identificado</label>
                <textarea
                  value={form.first_message}
                  onChange={(e) => updateField('first_message', e.target.value)}
                  placeholder="Hola! Te presento nuestro increible producto..."
                  rows={3}
                  className={textareaClass}
                />
              </div>

              <div className="flex items-center gap-3 pt-1">
                <Switch
                  checked={form.is_active}
                  onCheckedChange={(checked) => updateField('is_active', checked)}
                />
                <span className={`text-sm font-medium ${form.is_active ? 'text-emerald-400' : 'text-white/40'}`}>
                  {form.is_active ? 'Producto activo' : 'Producto inactivo'}
                </span>
              </div>
            </div>

            {/* ── SECTION 2: DESCRIPCION (barra indigo) ── */}
            <div className={sectionClass}>
              <div className={sectionHeaderClass}>
                <span className="w-1 h-3.5 bg-indigo-400/70 rounded-full" />
                DESCRIPCION
              </div>

              <div>
                <label className={labelClass}>Descripcion del producto</label>
                <textarea
                  value={form.description}
                  onChange={(e) => updateField('description', e.target.value)}
                  placeholder="Descripcion general del producto..."
                  rows={2}
                  className={textareaClass}
                />
              </div>

              <div>
                <label className={labelClass}>Beneficios</label>
                <textarea
                  value={form.benefits}
                  onChange={(e) => updateField('benefits', e.target.value)}
                  placeholder="Lista los beneficios principales del producto..."
                  rows={3}
                  className={textareaClass}
                />
              </div>

              <div>
                <label className={labelClass}>Modo de uso</label>
                <textarea
                  value={form.usage_instructions}
                  onChange={(e) => updateField('usage_instructions', e.target.value)}
                  placeholder="Instrucciones de uso del producto..."
                  rows={2}
                  className={textareaClass}
                />
              </div>

              <div>
                <label className={labelClass}>Advertencias</label>
                <textarea
                  value={form.warnings}
                  onChange={(e) => updateField('warnings', e.target.value)}
                  placeholder="Advertencias, contraindicaciones o precauciones..."
                  rows={2}
                  className={textareaClass}
                />
              </div>
            </div>

            {/* ── SECTION 3: PRECIOS (barra violeta) ── */}
            <div className={sectionClass}>
              <div className={sectionHeaderClass}>
                <span className="w-1 h-3.5 bg-violet-400/70 rounded-full" />
                PRECIOS
              </div>

              <div>
                <label className={labelClass}>Moneda</label>
                <Select value={form.currency} onValueChange={(v) => { if (v) updateField('currency', v) }}>
                  <SelectTrigger className="w-full bg-[#0B0B12]/50 border border-white/10 rounded-xl h-[42px] text-sm text-white focus:border-violet-400/40">
                    <SelectValue placeholder="Selecciona moneda" />
                  </SelectTrigger>
                  <SelectContent>
                    {currencyOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Precio</label>
                  <input
                    type="number"
                    value={form.price_unit || ''}
                    onChange={(e) => updateField('price_unit', parseFloat(e.target.value) || 0)}
                    placeholder="25.00"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Precio de oferta</label>
                  <input
                    type="number"
                    value={form.offer_price ?? ''}
                    onChange={(e) => updateField('offer_price', e.target.value ? parseFloat(e.target.value) : null)}
                    placeholder="Opcional"
                    className={inputClass}
                  />
                </div>
              </div>
            </div>

            {/* ── SECTION 4: IMAGENES PRINCIPALES (barra ambar) ── */}
            <div className={sectionClass}>
              <div className={sectionHeaderClass}>
                <span className="w-1 h-3.5 bg-amber-400/70 rounded-full" />
                IMAGENES PRINCIPALES
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[0, 1, 2].map((i) => (
                  <ImageSlot
                    key={`main-${i}`}
                    index={i}
                    image={form.product_images[i]}
                    type="product"
                    label={`Subir foto principal`}
                  />
                ))}
              </div>
            </div>

            {/* ── SECTION 5: MAS FOTOS DEL PRODUCTO (barra ambar) ── */}
            <div className={sectionClass}>
              <div className={sectionHeaderClass}>
                <span className="w-1 h-3.5 bg-amber-400/70 rounded-full" />
                MAS FOTOS DEL PRODUCTO
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[3, 4, 5, 6, 7].map((i) => (
                  <ImageSlot
                    key={`extra-${i}`}
                    index={i}
                    image={form.product_images[i]}
                    type="product"
                    label={`Foto adicional ${i - 2}`}
                  />
                ))}
              </div>
            </div>

            {/* ── SECTION 6: VIDEOS DEL PRODUCTO (barra indigo) ── */}
            <div className={sectionClass}>
              <div className={sectionHeaderClass}>
                <span className="w-1 h-3.5 bg-indigo-400/70 rounded-full" />
                VIDEOS DEL PRODUCTO
              </div>

              <p className="text-xs text-white/40">
                El agente enviara estos videos cuando sea relevante durante la conversacion. Sube desde tu dispositivo.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[0, 1].map((i) => {
                  const urls = form.hooks.split(',').map(h => h.trim()).filter(Boolean)
                  const videoUrl = urls[i] || ''
                  return (
                    <div key={`video-${i}`}>
                      {videoUrl ? (
                        <div className="relative rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                          <video src={videoUrl} controls className="w-full max-h-32 rounded-xl" />
                          <button
                            type="button"
                            onClick={() => {
                              const newUrls = [...urls]
                              newUrls[i] = ''
                              updateField('hooks', newUrls.filter(Boolean).join(', '))
                            }}
                            className="absolute top-1.5 right-1.5 bg-black/70 hover:bg-red-500 text-white rounded-full p-1 transition-colors"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center gap-1.5 py-5 rounded-xl cursor-pointer transition-colors hover:bg-white/[0.02]" style={{ border: '2px dashed rgba(99, 102, 241, 0.3)' }}>
                          <Upload className="h-5 w-5 text-indigo-400/40" />
                          <span className="text-[11px] text-white/30">Video del producto {i + 1}</span>
                          <input type="file" accept="video/*" className="hidden" onChange={async (e) => {
                            const file = e.target.files?.[0]
                            if (!file) return
                            const url = await uploadFile(file, 'product-testimonials')
                            if (url) {
                              const newUrls = [...urls]
                              newUrls[i] = url
                              updateField('hooks', newUrls.filter(Boolean).join(', '))
                            }
                          }} />
                        </label>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* ── SECTION 7: IMAGENES DE OFERTA (barra rosa) ── */}
            <div className={sectionClass}>
              <div className={sectionHeaderClass}>
                <span className="w-1 h-3.5 bg-pink-400/70 rounded-full" />
                IMAGENES DE OFERTA
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[0, 1, 2, 3].map((i) => (
                  <ImageSlot
                    key={`offer-${i}`}
                    index={i}
                    image={form.offer_images[i]}
                    type="offer"
                    label={`Oferta ${i + 1}`}
                  />
                ))}
              </div>
            </div>

            {/* ── SECTION 8: FOTOS DE TESTIMONIOS (barra indigo) ── */}
            <div className={sectionClass}>
              <div className={sectionHeaderClass}>
                <span className="w-1 h-3.5 bg-indigo-400/70 rounded-full" />
                FOTOS DE TESTIMONIOS
              </div>
              <p className="text-xs text-white/40">(el agente las envia ante dudas)</p>

              <div className="space-y-3">
                {[0, 1, 2, 3, 4, 5, 6].map((i) => {
                  const testimonial = form.testimonials[i]
                  const hasImage = testimonial?.url
                  return (
                    <div key={`test-row-${i}`} className="grid grid-cols-1 sm:grid-cols-[1fr_2fr] gap-2 items-start">
                      <input
                        type="text"
                        value={testimonial?.description || ''}
                        onChange={(e) => {
                          const current = [...form.testimonials]
                          while (current.length <= i) {
                            current.push({ type: 'image', url: '', content: '', description: '' })
                          }
                          current[i] = { ...current[i], description: e.target.value }
                          updateField('testimonials', current)
                        }}
                        placeholder={`Descripcion testimonio ${i + 1}`}
                        className={inputClass}
                      />
                      <div>
                        {hasImage ? (
                          <div className="flex items-center gap-2">
                            <img src={testimonial.url} alt={`Testimonio ${i + 1}`} className="h-10 w-10 rounded-lg object-cover border border-white/10" />
                            <span className="text-xs text-emerald-400 flex-1 truncate">Subido</span>
                            <button type="button" onClick={() => updateTestimonial(i, 'url', '')} className="h-7 w-7 rounded-lg flex items-center justify-center text-red-400 hover:bg-red-400/10 transition-colors">
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <label className="cursor-pointer block">
                            <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                              if (e.target.files?.[0]) {
                                const current = [...form.testimonials]
                                while (current.length <= i) {
                                  current.push({ type: 'image', url: '', content: '', description: '' })
                                }
                                setUploadingImage(true)
                                const url = await uploadFile(e.target.files[0], 'product-testimonials')
                                if (url) {
                                  current[i] = { ...current[i], type: 'image', url }
                                  updateField('testimonials', current)
                                }
                                setUploadingImage(false)
                              }
                            }} />
                            <div className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl transition-colors hover:bg-white/[0.02]" style={{ border: '2px dashed rgba(99, 102, 241, 0.2)' }}>
                              <Upload className="h-4 w-4 text-indigo-400/40" />
                              <span className="text-[11px] text-white/30">Subir foto testimonio {i + 1}</span>
                            </div>
                          </label>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* ── SECTION 9: VIDEOS DE TESTIMONIOS (barra ambar, badge NUEVO) ── */}
            <div className={sectionClass}>
              <div className={sectionHeaderClass}>
                <span className="w-1 h-3.5 bg-amber-400/70 rounded-full" />
                VIDEOS DE TESTIMONIOS
                <span className="ml-1 px-1.5 py-0.5 text-[9px] font-bold bg-amber-400/20 text-amber-400 rounded">NUEVO</span>
              </div>

              <p className="text-xs text-white/40">
                Sube videos de testimonios desde tu dispositivo. El agente los enviara cuando el cliente tenga dudas.
              </p>

              <div className="space-y-3">
                {[0, 1, 2, 3, 4, 5, 6].map((i) => {
                  const videoIndex = 7 + i
                  const testimonial = form.testimonials[videoIndex]
                  const videoUrl = testimonial?.url || ''

                  return (
                    <div key={`test-video-${i}`} className="grid grid-cols-1 sm:grid-cols-[1fr_2fr] gap-2 items-start">
                      <input
                        type="text"
                        value={testimonial?.description || ''}
                        onChange={(e) => {
                          const current = [...form.testimonials]
                          while (current.length <= videoIndex) {
                            current.push({ type: 'video', url: '', content: '', description: '' })
                          }
                          current[videoIndex] = { ...current[videoIndex], type: 'video', description: e.target.value }
                          updateField('testimonials', current)
                        }}
                        placeholder={`Video testimonio ${i + 1}`}
                        className={inputClass}
                      />
                      {videoUrl ? (
                        <div className="relative rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                          <video src={videoUrl} controls className="w-full max-h-24 rounded-xl" />
                          <button
                            type="button"
                            onClick={() => {
                              const current = [...form.testimonials]
                              if (current[videoIndex]) {
                                current[videoIndex] = { ...current[videoIndex], url: '' }
                                updateField('testimonials', current)
                              }
                            }}
                            className="absolute top-1 right-1 bg-black/70 hover:bg-red-500 text-white rounded-full p-0.5 transition-colors"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <label className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl cursor-pointer transition-colors hover:bg-white/[0.02]" style={{ border: '2px dashed rgba(251, 191, 36, 0.25)' }}>
                          <Upload className="h-4 w-4 text-amber-400/40" />
                          <span className="text-[11px] text-white/30">Subir video testimonio {i + 1}</span>
                          <input type="file" accept="video/*" className="hidden" onChange={async (e) => {
                            const file = e.target.files?.[0]
                            if (!file) return
                            const url = await uploadFile(file, 'product-testimonials')
                            if (url) {
                              const current = [...form.testimonials]
                              while (current.length <= videoIndex) {
                                current.push({ type: 'video', url: '', content: '', description: '' })
                              }
                              current[videoIndex] = { ...current[videoIndex], type: 'video', url }
                              updateField('testimonials', current)
                            }
                          }} />
                        </label>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

          </div>

          {/* Footer */}
          <div className="px-5 md:px-6 py-3 md:py-4 flex items-center justify-between shrink-0" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <Button
              variant="ghost"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
              className="gap-1 text-white/50 hover:text-white rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="gap-2 text-white min-w-[140px] border-0 rounded-xl h-10 text-[13px] font-semibold"
              style={{
                background: 'linear-gradient(135deg, #A78BFA 0%, #8B5CF6 100%)',
                boxShadow: '0 4px 15px rgba(167, 139, 250, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
              }}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Guardar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
