'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Navbar } from '@/components/layout/navbar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Store,
  Plus,
  Pencil,
  Trash2,
  Package,
  Loader2,
  Globe,
  ShoppingBag,
  Eye,
  Sparkles,
  TrendingUp,
  Lock,
  ArrowUpRight,
  Settings,
  Type,
  ChevronDown,
  Check,
  Palette,
  Pipette,
  Link2,
  MessageCircle,
  QrCode,
  EyeOff,
} from 'lucide-react'
import { toast } from 'sonner'
import { SingleImageUpload } from '@/components/shared/image-upload'

/* ============================================================
   FONT CONFIGURATION — 22 Premium Fonts
   ============================================================ */
const FONT_OPTIONS = [
  { value: 'default', label: 'Predeterminada', family: 'Inter, sans-serif', google: null, category: 'Modernas' },
  { value: 'inter', label: 'Inter', family: "'Inter', sans-serif", google: 'Inter', category: 'Modernas' },
  { value: 'sora', label: 'Sora', family: "'Sora', sans-serif", google: 'Sora', category: 'Modernas' },
  { value: 'poppins', label: 'Poppins', family: "'Poppins', sans-serif", google: 'Poppins', category: 'Modernas' },
  { value: 'outfit', label: 'Outfit', family: "'Outfit', sans-serif", google: 'Outfit', category: 'Modernas' },
  { value: 'manrope', label: 'Manrope', family: "'Manrope', sans-serif", google: 'Manrope', category: 'Modernas' },
  { value: 'plus-jakarta', label: 'Plus Jakarta Sans', family: "'Plus Jakarta Sans', sans-serif", google: 'Plus+Jakarta+Sans', category: 'Modernas' },
  { value: 'dm-sans', label: 'DM Sans', family: "'DM Sans', sans-serif", google: 'DM+Sans', category: 'Modernas' },
  { value: 'montserrat', label: 'Montserrat', family: "'Montserrat', sans-serif", google: 'Montserrat', category: 'Elegantes' },
  { value: 'raleway', label: 'Raleway', family: "'Raleway', sans-serif", google: 'Raleway', category: 'Elegantes' },
  { value: 'cormorant', label: 'Cormorant Garamond', family: "'Cormorant Garamond', serif", google: 'Cormorant+Garamond', category: 'Elegantes' },
  { value: 'playfair', label: 'Playfair Display', family: "'Playfair Display', serif", google: 'Playfair+Display', category: 'Elegantes' },
  { value: 'eb-garamond', label: 'EB Garamond', family: "'EB Garamond', serif", google: 'EB+Garamond', category: 'Elegantes' },
  { value: 'space-grotesk', label: 'Space Grotesk', family: "'Space Grotesk', sans-serif", google: 'Space+Grotesk', category: 'Impacto' },
  { value: 'bebas-neue', label: 'Bebas Neue', family: "'Bebas Neue', sans-serif", google: 'Bebas+Neue', category: 'Impacto' },
  { value: 'oswald', label: 'Oswald', family: "'Oswald', sans-serif", google: 'Oswald', category: 'Impacto' },
  { value: 'anton', label: 'Anton', family: "'Anton', sans-serif", google: 'Anton', category: 'Impacto' },
  { value: 'work-sans', label: 'Work Sans', family: "'Work Sans', sans-serif", google: 'Work+Sans', category: 'Minimalistas' },
  { value: 'karla', label: 'Karla', family: "'Karla', sans-serif", google: 'Karla', category: 'Minimalistas' },
  { value: 'nunito', label: 'Nunito', family: "'Nunito', sans-serif", google: 'Nunito', category: 'Minimalistas' },
  { value: 'orbitron', label: 'Orbitron', family: "'Orbitron', sans-serif", google: 'Orbitron', category: 'Futuristas' },
  { value: 'rajdhani', label: 'Rajdhani', family: "'Rajdhani', sans-serif", google: 'Rajdhani', category: 'Futuristas' },
] as const

const WEIGHT_OPTIONS = [
  { value: '400', label: 'Regular' },
  { value: '500', label: 'Medium' },
  { value: '600', label: 'SemiBold' },
  { value: '700', label: 'Bold' },
] as const

const SPACING_OPTIONS = [
  { value: 'normal', label: 'Normal', css: 'normal' },
  { value: 'wide', label: 'Amplio', css: '0.05em' },
  { value: 'wider', label: 'Muy Amplio', css: '0.1em' },
  { value: 'ultra', label: 'Ultra', css: '0.2em' },
] as const

/* ============================================================
   BACKGROUND PRESETS
   ============================================================ */
const COLOR_PRESETS = [
  '#0F172A', '#1E293B', '#111827', '#18181B', '#1C1917',
  '#172554', '#1E1B4B', '#2D1B69', '#4A1D96', '#312E81',
  '#0C4A6E', '#164E63', '#134E4A', '#14532D', '#1A2E05',
  '#7C2D12', '#78350F', '#713F12', '#451A03', '#3B0764',
]

const GRADIENT_PRESETS = [
  { label: 'Oceano', value: 'linear-gradient(135deg, #0F172A, #1E3A5F)' },
  { label: 'Noche', value: 'linear-gradient(135deg, #0F0F23, #1A1A2E)' },
  { label: 'Cosmos', value: 'linear-gradient(135deg, #1B1B3A, #2D1B69)' },
  { label: 'Bosque', value: 'linear-gradient(135deg, #0D1B2A, #1B2E1B)' },
  { label: 'Atardecer', value: 'linear-gradient(135deg, #1A0A2E, #2D1B3D)' },
  { label: 'Carbon', value: 'linear-gradient(135deg, #1C1C1C, #2A2A2A)' },
  { label: 'Royal', value: 'linear-gradient(135deg, #0F172A, #312E81)' },
  { label: 'Emerald', value: 'linear-gradient(135deg, #0F172A, #134E4A)' },
]

/* ============================================================
   INTERFACES
   ============================================================ */
interface FontConfig {
  font: string
  weight: string
  uppercase: boolean
  letterSpacing: string
}

interface BgConfig {
  type: 'solid' | 'gradient'
  color: string
  gradient: string
}

const defaultFontConfig: FontConfig = {
  font: 'default',
  weight: '700',
  uppercase: false,
  letterSpacing: 'normal',
}

const defaultBgConfig: BgConfig = {
  type: 'solid',
  color: '#0F172A',
  gradient: GRADIENT_PRESETS[0].value,
}

interface StoreItem {
  id: string
  name: string
  slug: string
  store_type: string
  whatsapp_number?: string
  payment_qr_url?: string
  visibility: string
  is_active: boolean
  product_count: number
  font_config?: FontConfig | null
  bg_config?: BgConfig | null
  created_at: string
}

interface StoreForm {
  name: string
  slug: string
  store_type: 'business'
  whatsapp_number: string
  payment_qr_url: string
  visibility: 'public' | 'private'
  font_config: FontConfig
  bg_config: BgConfig
}

const emptyForm: StoreForm = {
  name: '',
  slug: '',
  store_type: 'business',
  whatsapp_number: '',
  payment_qr_url: '',
  visibility: 'public',
  font_config: { ...defaultFontConfig },
  bg_config: { ...defaultBgConfig },
}

/* ============================================================
   GOOGLE FONTS LOADER
   ============================================================ */
const loadedFonts = new Set<string>()

function loadGoogleFont(googleName: string | null) {
  if (!googleName || loadedFonts.has(googleName)) return
  loadedFonts.add(googleName)
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = `https://fonts.googleapis.com/css2?family=${googleName}:wght@400;500;600;700&display=swap`
  document.head.appendChild(link)
}

function getFontFamily(fontValue: string): string {
  const opt = FONT_OPTIONS.find(f => f.value === fontValue)
  return opt?.family || 'Inter, sans-serif'
}

function getSpacingCSS(spacing: string): string {
  const opt = SPACING_OPTIONS.find(s => s.value === spacing)
  return opt?.css || 'normal'
}

function getPreviewBg(bg: BgConfig): string {
  return bg.type === 'gradient' ? bg.gradient : bg.color
}

/* ============================================================
   SECTION HEADER — reusable mini-component
   ============================================================ */
function SectionLabel({ icon: Icon, label, color }: { icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>, label: string, color: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div
        className="flex h-6 w-6 items-center justify-center rounded-md"
        style={{ background: `${color}15`, border: `1px solid ${color}25` }}
      >
        <Icon className="h-3 w-3" style={{ color }} />
      </div>
      <span className="text-[11px] text-[#94A3B8] uppercase tracking-[0.12em] font-semibold">{label}</span>
    </div>
  )
}

/* ============================================================
   MAIN COMPONENT
   ============================================================ */
export default function StoresPage() {
  const [stores, setStores] = useState<StoreItem[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<StoreForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [fontDropdownOpen, setFontDropdownOpen] = useState(false)
  const colorInputRef = useRef<HTMLInputElement>(null)

  const fetchStores = async () => {
    try {
      const res = await fetch('/api/stores')
      if (res.ok) setStores(await res.json())
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchStores() }, [])

  useEffect(() => {
    if (dialogOpen) FONT_OPTIONS.forEach(f => loadGoogleFont(f.google))
  }, [dialogOpen])

  useEffect(() => {
    const opt = FONT_OPTIONS.find(f => f.value === form.font_config.font)
    if (opt?.google) loadGoogleFont(opt.google)
  }, [form.font_config.font])

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  const openEdit = (store: StoreItem) => {
    setEditingId(store.id)
    setForm({
      name: store.name,
      slug: store.slug,
      store_type: 'business',
      whatsapp_number: store.whatsapp_number || '',
      payment_qr_url: store.payment_qr_url || '',
      visibility: store.visibility as 'public' | 'private',
      font_config: store.font_config || { ...defaultFontConfig },
      bg_config: store.bg_config || { ...defaultBgConfig },
    })
    setDialogOpen(true)
  }

  const handleNameChange = (val: string) => {
    setForm(prev => ({
      ...prev,
      name: val,
      ...(editingId ? {} : { slug: val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') }),
    }))
  }

  const updateFontConfig = useCallback((updates: Partial<FontConfig>) => {
    setForm(prev => ({ ...prev, font_config: { ...prev.font_config, ...updates } }))
  }, [])

  const updateBgConfig = useCallback((updates: Partial<BgConfig>) => {
    setForm(prev => ({ ...prev, bg_config: { ...prev.bg_config, ...updates } }))
  }, [])

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('El nombre es requerido'); return }
    if (!form.slug.trim()) { toast.error('El slug es requerido'); return }
    setSaving(true)
    try {
      if (editingId) {
        const res = await fetch(`/api/stores/${editingId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
        const data = await res.json()
        if (res.ok) { setStores(prev => prev.map(s => s.id === editingId ? { ...s, ...data } : s)); setDialogOpen(false); toast.success('Tienda actualizada') }
        else toast.error(data.error || 'Error al actualizar')
      } else {
        const res = await fetch('/api/stores', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
        const data = await res.json()
        if (res.ok) { setStores(prev => [data, ...prev]); setDialogOpen(false); toast.success('Tienda creada exitosamente') }
        else toast.error(data.error || 'Error al crear tienda')
      }
    } catch { toast.error('Error de conexion') }
    finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta tienda? Esta acción no se puede deshacer.')) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/stores/${id}`, { method: 'DELETE' })
      if (res.ok) { setStores(prev => prev.filter(s => s.id !== id)); toast.success('Tienda eliminada') }
      else toast.error('Error al eliminar')
    } catch { toast.error('Error de conexion') }
    finally { setDeletingId(null) }
  }

  const appUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const publicStores = stores.filter(s => s.visibility === 'public').length
  const totalProducts = stores.reduce((sum, s) => sum + s.product_count, 0)

  const previewText = form.name.trim() || 'Mi Tienda'
  const fc = form.font_config
  const bg = form.bg_config
  const fontCategories = Array.from(new Set(FONT_OPTIONS.map(f => f.category)))

  if (loading) {
    return (
      <>
        <Navbar title="Tiendas Virtuales" />
        <div className="flex-1 flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <div className="w-14 h-14 rounded-full border-2 animate-spin" style={{ borderColor: 'rgba(86, 204, 242, 0.15)', borderTopColor: '#56CCF2' }} />
              <Store className="absolute inset-0 m-auto h-5 w-5 text-[#56CCF2]" />
            </div>
            <p className="text-sm text-[#94A3B8]">Cargando tiendas...</p>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Navbar title="Tiendas Virtuales" description="Escaparates digitales premium" />

      <div className="p-4 md:p-6 space-y-4 md:space-y-6">

        {/* ── HERO HEADER ── */}
        <div
          className="relative overflow-hidden rounded-2xl p-6 animate-fade-in-up"
          style={{ background: 'linear-gradient(135deg, rgba(17, 29, 53, 0.9), rgba(22, 32, 51, 0.7))', border: '1px solid rgba(86, 204, 242, 0.08)' }}
        >
          <div className="absolute top-0 right-0 w-96 h-96 rounded-full blur-[120px] opacity-20 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(86, 204, 242, 0.3), transparent)' }} />
          <div className="absolute -bottom-20 -left-20 w-72 h-72 rounded-full blur-[100px] opacity-15 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(79, 124, 255, 0.25), transparent)' }} />

          <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl shrink-0" style={{ background: 'linear-gradient(135deg, #56CCF2, #4F7CFF)', boxShadow: '0 6px 24px rgba(86, 204, 242, 0.3)' }}>
                <Store className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                  Mis Tiendas Virtuales
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full" style={{ background: 'rgba(86, 204, 242, 0.12)', color: '#56CCF2', border: '1px solid rgba(86, 204, 242, 0.15)' }}>{stores.length}</span>
                </h1>
                <p className="text-sm text-[#94A3B8] mt-0.5">Tu galeria de escaparates digitales para vender en la web</p>
              </div>
            </div>
            <Button onClick={openCreate} className="h-11 px-6 text-sm font-semibold text-white rounded-xl shrink-0" style={{ background: 'linear-gradient(135deg, #56CCF2, #4F7CFF)', boxShadow: '0 4px 16px rgba(86, 204, 242, 0.3)' }}>
              <Plus className="mr-2 h-4 w-4" />Nueva Tienda<Sparkles className="ml-2 h-3.5 w-3.5 opacity-70" />
            </Button>
          </div>

          <div className="relative grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
            {[
              { label: 'Total Tiendas', value: stores.length, icon: Store, color: '#56CCF2' },
              { label: 'Tiendas Publicas', value: publicStores, icon: Globe, color: '#10B981' },
              { label: 'Total Productos', value: totalProducts, icon: Package, color: '#A78BFA' },
              { label: 'Activas', value: stores.filter(s => s.is_active).length, icon: TrendingUp, color: '#F59E0B' },
            ].map((stat) => (
              <div key={stat.label} className="flex items-center gap-3 rounded-xl px-3.5 py-3" style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.04)' }}>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg shrink-0" style={{ background: `${stat.color}15`, border: `1px solid ${stat.color}20` }}>
                  <stat.icon className="h-4 w-4" style={{ color: stat.color }} />
                </div>
                <div>
                  <p className="text-lg font-bold text-white leading-none">{stat.value}</p>
                  <p className="text-[10px] text-[#94A3B8]/70 mt-0.5">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── STORE CARDS OR EMPTY STATE ── */}
        {stores.length === 0 ? (
          <div className="relative overflow-hidden rounded-2xl p-14 text-center animate-fade-in-up-delay-1" style={{ background: 'linear-gradient(135deg, rgba(17, 29, 53, 0.8), rgba(22, 32, 51, 0.6))', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <div className="absolute top-0 right-0 w-80 h-80 rounded-full blur-[100px] opacity-20 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(86, 204, 242, 0.2), transparent)' }} />
            <div className="absolute bottom-0 left-0 w-60 h-60 rounded-full blur-[80px] opacity-15 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(167, 139, 250, 0.15), transparent)' }} />
            <div className="relative space-y-6">
              <div className="mx-auto w-28 h-28 relative">
                <div className="absolute inset-0 rounded-3xl" style={{ background: 'linear-gradient(135deg, rgba(86, 204, 242, 0.1), rgba(79, 124, 255, 0.06))', border: '1px solid rgba(86, 204, 242, 0.1)', boxShadow: '0 0 40px rgba(86, 204, 242, 0.08)' }} />
                <div className="absolute inset-0 flex items-center justify-center"><Store className="h-12 w-12 text-[#56CCF2]" /></div>
                <div className="absolute -top-2 -right-2 flex h-8 w-8 items-center justify-center rounded-xl" style={{ background: 'rgba(167, 139, 250, 0.15)', border: '1px solid rgba(167, 139, 250, 0.15)' }}><ShoppingBag className="h-3.5 w-3.5 text-[#A78BFA]" /></div>
                <div className="absolute -bottom-1 -left-2 flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.15)' }}><Globe className="h-3 w-3 text-[#10B981]" /></div>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Tu galeria de escaparates esta vacia</h3>
                <p className="text-[#94A3B8] max-w-lg mx-auto mt-2 text-sm leading-relaxed">Crea tu primera tienda virtual y empieza a vender tus productos en la web.</p>
              </div>
              <Button onClick={openCreate} className="h-12 px-8 text-sm font-semibold text-white rounded-xl" style={{ background: 'linear-gradient(135deg, #56CCF2, #4F7CFF)', boxShadow: '0 4px 20px rgba(86, 204, 242, 0.3)' }}>
                <Store className="mr-2 h-5 w-5" />Crear mi primera tienda<Sparkles className="ml-2 h-4 w-4 opacity-70" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 animate-fade-in-up-delay-1">
            {stores.map((store) => {
              const isPublic = store.visibility === 'public'
              const accentColor = '#56CCF2'
              const storeBg = store.bg_config
              const bannerBg = storeBg
                ? (storeBg.type === 'gradient' ? storeBg.gradient : storeBg.color)
                : 'linear-gradient(160deg, rgba(86, 204, 242, 0.1) 0%, rgba(79, 124, 255, 0.06) 50%, rgba(22, 32, 51, 0.9) 100%)'
              return (
                <div key={store.id} className="group relative overflow-hidden rounded-2xl transition-all duration-300 glass-panel-hover" style={{ background: 'linear-gradient(180deg, rgba(17, 29, 53, 0.9) 0%, rgba(13, 21, 41, 0.95) 100%)', border: '1px solid rgba(255, 255, 255, 0.06)', boxShadow: '0 4px 24px rgba(0, 0, 0, 0.2)' }}>
                  <div className="relative h-44 overflow-hidden" style={{ background: bannerBg }}>
                    <div className="absolute -top-8 -right-8 w-36 h-36 rounded-full blur-[70px] opacity-25 pointer-events-none" style={{ background: accentColor }} />
                    <div className="absolute -bottom-12 -left-12 w-28 h-28 rounded-full blur-[50px] opacity-15 pointer-events-none" style={{ background: '#4F7CFF' }} />
                    <div className="absolute inset-0 opacity-[0.03]"><div className="grid grid-cols-5 gap-1.5 p-3 h-full">{Array.from({ length: 10 }).map((_, i) => (<div key={i} className="rounded bg-white" />))}</div></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="relative">
                        <div className="absolute -inset-8 rounded-full opacity-25 blur-[28px] pointer-events-none" style={{ background: `radial-gradient(circle, ${accentColor}, transparent)` }} />
                        <div className="relative flex h-[96px] w-[96px] items-center justify-center rounded-3xl transition-transform duration-300 group-hover:scale-105" style={{ background: `linear-gradient(145deg, ${accentColor}18, ${accentColor}08)`, border: `1.5px solid ${accentColor}30`, boxShadow: `0 0 40px ${accentColor}18, inset 0 1px 0 rgba(255,255,255,0.06)`, backdropFilter: 'blur(12px)' }}>
                          <Store className="h-11 w-11 transition-all duration-300 group-hover:drop-shadow-[0_0_10px_rgba(86,204,242,0.4)]" style={{ color: accentColor }} />
                        </div>
                        <div className="absolute -top-3 -right-4 flex h-8 w-8 items-center justify-center rounded-xl transition-transform duration-300 group-hover:-translate-y-0.5" style={{ background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.18)', backdropFilter: 'blur(8px)' }}><ShoppingBag className="h-3.5 w-3.5 text-[#10B981]" /></div>
                        <div className="absolute -bottom-2 -left-4 flex h-7 w-7 items-center justify-center rounded-xl transition-transform duration-300 group-hover:translate-y-0.5" style={{ background: 'rgba(79, 124, 255, 0.12)', border: '1px solid rgba(79, 124, 255, 0.18)', backdropFilter: 'blur(8px)' }}><Package className="h-3 w-3 text-[#4F7CFF]" /></div>
                      </div>
                    </div>
                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 h-6 text-[10px] font-semibold backdrop-blur-md leading-none" style={{ background: isPublic ? 'rgba(16, 185, 129, 0.18)' : 'rgba(148, 163, 184, 0.12)', color: isPublic ? '#10B981' : '#94A3B8', border: `1px solid ${isPublic ? 'rgba(16, 185, 129, 0.2)' : 'rgba(148, 163, 184, 0.1)'}` }}>
                        {isPublic ? <Globe className="h-2.5 w-2.5" /> : <Lock className="h-2.5 w-2.5" />}
                        {isPublic ? 'Publica' : 'Privada'}
                      </span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <button onClick={() => openEdit(store)} className="flex h-6 w-6 items-center justify-center rounded-lg backdrop-blur-md transition-colors hover:bg-white/10" style={{ background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.08)' }}><Pencil className="h-2.5 w-2.5 text-white" /></button>
                        <button onClick={() => handleDelete(store.id)} disabled={deletingId === store.id} className="flex h-6 w-6 items-center justify-center rounded-lg backdrop-blur-md transition-colors hover:bg-red-500/20" style={{ background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                          {deletingId === store.id ? <Loader2 className="h-2.5 w-2.5 text-white animate-spin" /> : <Trash2 className="h-2.5 w-2.5 text-white" />}
                        </button>
                      </div>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-8" style={{ background: 'linear-gradient(to top, rgba(13, 21, 41, 0.95), transparent)' }} />
                  </div>
                  <div className="p-5 pt-4 space-y-3.5">
                    <div>
                      <h3 className="text-[15px] font-semibold text-white leading-snug truncate">{store.name}</h3>
                      <p className="text-[11px] text-[#56CCF2]/60 mt-0.5 flex items-center gap-1"><Globe className="h-3 w-3 shrink-0" /><span className="truncate">/tienda/{store.slug}</span></p>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {[
                        { icon: Package, value: store.product_count, label: 'Productos', color: '#A78BFA' },
                        { icon: Eye, value: '-', label: 'Visitas', color: '#56CCF2' },
                        { icon: ShoppingBag, value: '-', label: 'Ventas', color: '#10B981' },
                      ].map((s) => (
                        <div key={s.label} className="rounded-xl px-2 py-2 text-center" style={{ background: 'rgba(255, 255, 255, 0.025)', border: '1px solid rgba(255, 255, 255, 0.04)' }}>
                          <s.icon className="h-3 w-3 mx-auto mb-1" style={{ color: s.color }} />
                          <p className="text-sm font-bold text-white leading-none">{s.value}</p>
                          <p className="text-[9px] text-[#94A3B8]/50 mt-0.5">{s.label}</p>
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-[#94A3B8]/40">Creada {new Date(store.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    <div className="flex gap-2 pt-2" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.04)' }}>
                      <Button onClick={() => window.location.href = `/stores/${store.id}`} className="flex-1 h-10 text-[13px] font-semibold text-white rounded-xl gap-2" style={{ background: 'linear-gradient(135deg, rgba(86, 204, 242, 0.15), rgba(79, 124, 255, 0.1))', border: '1px solid rgba(86, 204, 242, 0.15)' }}><Package className="h-4 w-4" />Gestionar</Button>
                      <button onClick={() => window.location.href = `/stores/${store.id}`} className="flex h-10 w-10 items-center justify-center rounded-xl transition-colors duration-200 hover:bg-white/5 shrink-0" style={{ border: '1px solid rgba(255, 255, 255, 0.06)' }} title="Configurar"><Settings className="h-4 w-4 text-[#94A3B8]" /></button>
                      <button onClick={() => window.open(`${appUrl}/tienda/${store.slug}`, '_blank')} className="flex h-10 w-10 items-center justify-center rounded-xl transition-colors duration-200 hover:bg-white/5 shrink-0" style={{ border: '1px solid rgba(255, 255, 255, 0.06)' }} title="Vista previa"><ArrowUpRight className="h-4 w-4 text-[#56CCF2]" /></button>
                    </div>
                  </div>
                </div>
              )
            })}

            {/* ── Add New ── */}
            <button onClick={openCreate} className="group flex flex-col items-center justify-center rounded-2xl p-8 transition-all duration-300 cursor-pointer min-h-[440px]" style={{ background: 'rgba(255, 255, 255, 0.012)', border: '2px dashed rgba(86, 204, 242, 0.1)' }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(86, 204, 242, 0.3)'; e.currentTarget.style.background = 'rgba(86, 204, 242, 0.025)' }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(86, 204, 242, 0.1)'; e.currentTarget.style.background = 'rgba(255, 255, 255, 0.012)' }}
            >
              <div className="relative mb-5">
                <div className="absolute -inset-4 rounded-full opacity-20 blur-[16px] pointer-events-none" style={{ background: 'radial-gradient(circle, #56CCF2, transparent)' }} />
                <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl transition-all duration-300 group-hover:scale-110" style={{ background: 'rgba(86, 204, 242, 0.08)', border: '1.5px solid rgba(86, 204, 242, 0.12)', boxShadow: '0 0 24px rgba(86, 204, 242, 0.06)' }}>
                  <Plus className="h-7 w-7 text-[#56CCF2]" />
                </div>
              </div>
              <p className="text-sm font-semibold text-[#56CCF2]">Nueva Tienda</p>
              <p className="text-[11px] text-[#94A3B8]/50 mt-1">Crea un nuevo escaparate digital</p>
            </button>
          </div>
        )}
      </div>

      {/* ============================================================
          CREATE / EDIT DIALOG — Single continuous flow
          ============================================================ */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setFontDropdownOpen(false) }}>
        <DialogContent
          className="sm:max-w-2xl !gap-0 !p-0 flex flex-col"
          style={{ background: '#0D1526', border: '1px solid rgba(86, 204, 242, 0.08)', maxHeight: '85vh' }}
        >
          {/* ── HEADER ── */}
          <DialogHeader className="px-6 pt-5 pb-3 shrink-0">
            <DialogTitle className="text-white text-lg font-bold flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: 'linear-gradient(135deg, #56CCF2, #4F7CFF)' }}>
                <Store className="h-4 w-4 text-white" />
              </div>
              {editingId ? 'Editar Tienda' : 'Crear Nueva Tienda'}
            </DialogTitle>
          </DialogHeader>

          {/* ── SCROLLABLE CONTENT ── */}
          <div className="overflow-y-auto flex-1 min-h-0 px-6 pb-4">

            {/* ━━━ LIVE PREVIEW — Top, always visible as you scroll ━━━ */}
            <div className="sticky top-0 z-10 -mx-6 px-6 pb-4 pt-1" style={{ background: 'linear-gradient(to bottom, #0D1526 85%, transparent)' }}>
              <div
                className="relative overflow-hidden rounded-xl transition-all duration-500"
                style={{ background: getPreviewBg(bg) }}
              >
                {/* Dot pattern */}
                <div className="absolute inset-0 opacity-[0.035]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.2) 1px, transparent 0)', backgroundSize: '16px 16px' }} />
                {/* Glow */}
                <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full blur-[60px] opacity-20 pointer-events-none" style={{ background: '#56CCF2' }} />

                <div className="relative px-5 py-6 text-center">
                  <div className="flex items-center justify-center gap-1.5 mb-3">
                    <div className="w-2 h-2 rounded-full" style={{ background: '#EF4444' }} />
                    <div className="w-2 h-2 rounded-full" style={{ background: '#F59E0B' }} />
                    <div className="w-2 h-2 rounded-full" style={{ background: '#10B981' }} />
                    <span className="text-[9px] text-white/20 ml-2 font-mono">{form.slug ? `ventasai.com/tienda/${form.slug}` : 'ventasai.com/tienda/...'}</span>
                  </div>
                  <p
                    className="text-white transition-all duration-300 leading-tight"
                    style={{
                      fontFamily: getFontFamily(fc.font),
                      fontWeight: fc.weight,
                      fontSize: 'clamp(1.4rem, 4vw, 2rem)',
                      textTransform: fc.uppercase ? 'uppercase' : 'none',
                      letterSpacing: getSpacingCSS(fc.letterSpacing),
                    }}
                  >
                    {previewText}
                  </p>
                  <p className="text-[10px] text-white/25 mt-2 font-medium">
                    {FONT_OPTIONS.find(f => f.value === fc.font)?.label || 'Predeterminada'} · {WEIGHT_OPTIONS.find(w => w.value === fc.weight)?.label}
                    {fc.uppercase ? ' · MAYUSCULAS' : ''}
                    {fc.letterSpacing !== 'normal' ? ` · ${SPACING_OPTIONS.find(s => s.value === fc.letterSpacing)?.label}` : ''}
                  </p>
                </div>
              </div>
            </div>

            {/* ━━━ SECTION 1: DATOS PRINCIPALES ━━━ */}
            <div className="space-y-4 mb-6">
              <SectionLabel icon={Store} label="Datos principales" color="#56CCF2" />

              {/* Name + Slug — side by side on desktop */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-[11px] text-[#94A3B8]/80 font-medium">Nombre</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="Mi Tienda Premium"
                    className="h-10 rounded-xl text-sm"
                    style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] text-[#94A3B8]/80 font-medium flex items-center gap-1.5">
                    <Link2 className="h-3 w-3" />Slug (URL)
                  </Label>
                  <Input
                    value={form.slug}
                    onChange={(e) => setForm(prev => ({ ...prev, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') }))}
                    placeholder="mi-tienda"
                    className="h-10 rounded-xl text-sm font-mono"
                    style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
                  />
                  {form.slug && <p className="text-[10px] text-[#56CCF2]/60 truncate">{appUrl}/tienda/{form.slug}</p>}
                </div>
              </div>

              {/* WhatsApp + Visibility — side by side */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-[11px] text-[#94A3B8]/80 font-medium flex items-center gap-1.5">
                    <MessageCircle className="h-3 w-3" />WhatsApp de pedidos
                  </Label>
                  <Input
                    value={form.whatsapp_number}
                    onChange={(e) => setForm(prev => ({ ...prev, whatsapp_number: e.target.value }))}
                    placeholder="591 67534487"
                    className="h-10 rounded-xl text-sm"
                    style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] text-[#94A3B8]/80 font-medium flex items-center gap-1.5">
                    <EyeOff className="h-3 w-3" />Visibilidad
                  </Label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { value: 'public' as const, label: 'Publica', icon: Globe, color: '#10B981' },
                      { value: 'private' as const, label: 'Privada', icon: Lock, color: '#94A3B8' },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setForm(prev => ({ ...prev, visibility: opt.value }))}
                        className="flex items-center justify-center gap-1.5 rounded-xl h-10 text-xs font-semibold transition-all duration-200"
                        style={{
                          background: form.visibility === opt.value ? `${opt.color}15` : 'rgba(255, 255, 255, 0.03)',
                          color: form.visibility === opt.value ? opt.color : '#64748B',
                          border: `1px solid ${form.visibility === opt.value ? `${opt.color}30` : 'rgba(255, 255, 255, 0.06)'}`,
                        }}
                      >
                        <opt.icon className="h-3 w-3" />{opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* QR Upload */}
              <div className="space-y-1.5">
                <Label className="text-[11px] text-[#94A3B8]/80 font-medium flex items-center gap-1.5">
                  <QrCode className="h-3 w-3" />QR de pago (opcional)
                </Label>
                <SingleImageUpload
                  value={form.payment_qr_url}
                  onChange={(url) => setForm(prev => ({ ...prev, payment_qr_url: url }))}
                  bucket="store-qr"
                  placeholder="Sube tu QR de pago"
                />
              </div>
            </div>

            {/* ━━━ DIVIDER ━━━ */}
            <div className="h-px mb-6" style={{ background: 'linear-gradient(to right, transparent, rgba(167, 139, 250, 0.15), transparent)' }} />

            {/* ━━━ SECTION 2: PERSONALIZACIÓN ━━━ */}
            <div className="space-y-4 mb-6">
              <SectionLabel icon={Type} label="Tipografia" color="#A78BFA" />

              {/* Font Selector */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setFontDropdownOpen(!fontDropdownOpen)}
                  className="flex w-full items-center justify-between rounded-xl h-10 px-3.5 text-sm text-white transition-all duration-200"
                  style={{
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: `1px solid ${fontDropdownOpen ? 'rgba(167, 139, 250, 0.3)' : 'rgba(255, 255, 255, 0.08)'}`,
                  }}
                >
                  <span style={{ fontFamily: getFontFamily(fc.font) }}>
                    {FONT_OPTIONS.find(f => f.value === fc.font)?.label || 'Predeterminada'}
                  </span>
                  <ChevronDown className={`h-4 w-4 text-[#94A3B8] transition-transform duration-200 ${fontDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {fontDropdownOpen && (
                  <div
                    className="absolute z-50 mt-1 w-full rounded-xl overflow-hidden py-1 max-h-[240px] overflow-y-auto"
                    style={{ background: '#141E33', border: '1px solid rgba(167, 139, 250, 0.15)', boxShadow: '0 12px 40px rgba(0, 0, 0, 0.5)' }}
                  >
                    {fontCategories.map((cat) => (
                      <div key={cat}>
                        <p className="px-3.5 pt-2.5 pb-1 text-[9px] uppercase tracking-[0.15em] font-bold text-[#94A3B8]/40">{cat}</p>
                        {FONT_OPTIONS.filter(f => f.category === cat).map((font) => (
                          <button
                            key={font.value}
                            type="button"
                            onClick={() => { updateFontConfig({ font: font.value }); setFontDropdownOpen(false) }}
                            className="flex w-full items-center justify-between px-3.5 py-2 text-sm transition-colors duration-150 hover:bg-white/5"
                            style={{ fontFamily: font.family, color: fc.font === font.value ? '#A78BFA' : '#CBD5E8' }}
                          >
                            <span className="font-medium">{font.label}</span>
                            {fc.font === font.value && <Check className="h-4 w-4 text-[#A78BFA]" />}
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Weight · Spacing · Uppercase — compact 3-col */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <div className="space-y-1.5">
                  <p className="text-[9px] text-[#94A3B8]/50 uppercase tracking-wider font-semibold text-center">Grosor</p>
                  <div className="flex flex-col gap-1">
                    {WEIGHT_OPTIONS.map((w) => (
                      <button key={w.value} type="button" onClick={() => updateFontConfig({ weight: w.value })}
                        className="rounded-lg px-2 py-1.5 text-[11px] font-medium transition-all duration-150 text-center"
                        style={{
                          background: fc.weight === w.value ? 'rgba(167, 139, 250, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                          color: fc.weight === w.value ? '#A78BFA' : '#64748B',
                          border: `1px solid ${fc.weight === w.value ? 'rgba(167, 139, 250, 0.2)' : 'rgba(255, 255, 255, 0.04)'}`,
                          fontWeight: w.value,
                        }}
                      >{w.label}</button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <p className="text-[9px] text-[#94A3B8]/50 uppercase tracking-wider font-semibold text-center">Espaciado</p>
                  <div className="flex flex-col gap-1">
                    {SPACING_OPTIONS.map((s) => (
                      <button key={s.value} type="button" onClick={() => updateFontConfig({ letterSpacing: s.value })}
                        className="rounded-lg px-2 py-1.5 text-[11px] font-medium transition-all duration-150 text-center"
                        style={{
                          background: fc.letterSpacing === s.value ? 'rgba(86, 204, 242, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                          color: fc.letterSpacing === s.value ? '#56CCF2' : '#64748B',
                          border: `1px solid ${fc.letterSpacing === s.value ? 'rgba(86, 204, 242, 0.2)' : 'rgba(255, 255, 255, 0.04)'}`,
                          letterSpacing: s.css,
                        }}
                      >{s.label}</button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <p className="text-[9px] text-[#94A3B8]/50 uppercase tracking-wider font-semibold text-center">Estilo</p>
                  <button type="button" onClick={() => updateFontConfig({ uppercase: !fc.uppercase })}
                    className="w-full rounded-lg px-2 py-3 text-[11px] font-bold transition-all duration-150 text-center"
                    style={{
                      background: fc.uppercase ? 'rgba(245, 158, 11, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                      color: fc.uppercase ? '#F59E0B' : '#64748B',
                      border: `1px solid ${fc.uppercase ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255, 255, 255, 0.04)'}`,
                      letterSpacing: '0.15em',
                    }}
                  >ABC</button>
                  <p className="text-[9px] text-[#94A3B8]/30 text-center">{fc.uppercase ? 'Activado' : 'Mayusculas'}</p>
                </div>
              </div>
            </div>

            {/* ━━━ DIVIDER ━━━ */}
            <div className="h-px mb-6" style={{ background: 'linear-gradient(to right, transparent, rgba(86, 204, 242, 0.15), transparent)' }} />

            {/* ━━━ SECTION 3: FONDO ━━━ */}
            <div className="space-y-4 mb-2">
              <SectionLabel icon={Palette} label="Color de fondo" color="#56CCF2" />

              {/* Solid / Gradient toggle */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { type: 'solid' as const, label: 'Solido', icon: Pipette },
                  { type: 'gradient' as const, label: 'Degradado', icon: Palette },
                ].map((opt) => (
                  <button key={opt.type} type="button" onClick={() => updateBgConfig({ type: opt.type })}
                    className="flex items-center justify-center gap-2 rounded-xl h-9 text-xs font-semibold transition-all duration-200"
                    style={{
                      background: bg.type === opt.type ? 'rgba(86, 204, 242, 0.1)' : 'rgba(255, 255, 255, 0.02)',
                      color: bg.type === opt.type ? '#56CCF2' : '#64748B',
                      border: `1px solid ${bg.type === opt.type ? 'rgba(86, 204, 242, 0.2)' : 'rgba(255, 255, 255, 0.06)'}`,
                    }}
                  ><opt.icon className="h-3 w-3" />{opt.label}</button>
                ))}
              </div>

              {/* Solid presets */}
              {bg.type === 'solid' && (
                <div className="space-y-2.5">
                  <div className="grid grid-cols-10 gap-1.5">
                    {COLOR_PRESETS.map((color) => (
                      <button key={color} type="button" onClick={() => updateBgConfig({ color })}
                        className="relative w-full aspect-square rounded-lg transition-all duration-150 hover:scale-110"
                        style={{
                          background: color,
                          border: bg.color === color ? '2px solid #56CCF2' : '1px solid rgba(255, 255, 255, 0.1)',
                          boxShadow: bg.color === color ? '0 0 8px rgba(86, 204, 242, 0.3)' : 'none',
                        }}
                      >
                        {bg.color === color && <Check className="absolute inset-0 m-auto h-3 w-3 text-[#56CCF2]" />}
                      </button>
                    ))}
                  </div>
                  <button type="button" onClick={() => colorInputRef.current?.click()}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-[#94A3B8] transition-all hover:bg-white/5"
                    style={{ border: '1px solid rgba(255, 255, 255, 0.08)' }}
                  >
                    <div className="w-4 h-4 rounded" style={{ background: bg.color, border: '1px solid rgba(255,255,255,0.15)' }} />
                    <span>Personalizado</span>
                    <span className="text-[#56CCF2] font-mono text-[10px]">{bg.color}</span>
                  </button>
                  <input ref={colorInputRef} type="color" value={bg.color} onChange={(e) => updateBgConfig({ color: e.target.value })} className="sr-only" />
                </div>
              )}

              {/* Gradient presets */}
              {bg.type === 'gradient' && (
                <div className="grid grid-cols-4 gap-2">
                  {GRADIENT_PRESETS.map((grad) => (
                    <button key={grad.label} type="button" onClick={() => updateBgConfig({ gradient: grad.value })}
                      className="relative rounded-xl overflow-hidden transition-all duration-150 hover:scale-105"
                      style={{
                        border: bg.gradient === grad.value ? '2px solid #56CCF2' : '1px solid rgba(255, 255, 255, 0.08)',
                        boxShadow: bg.gradient === grad.value ? '0 0 10px rgba(86, 204, 242, 0.25)' : 'none',
                      }}
                    >
                      <div className="h-10 w-full" style={{ background: grad.value }} />
                      <p className="text-[9px] text-center py-1 text-[#94A3B8]/60 font-medium" style={{ background: 'rgba(0,0,0,0.3)' }}>{grad.label}</p>
                      {bg.gradient === grad.value && <Check className="absolute top-1 right-1 h-3 w-3 text-[#56CCF2]" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── FOOTER — always visible ── */}
          <div
            className="flex items-center justify-between px-6 py-4 shrink-0"
            style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)', background: '#0D1526' }}
          >
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
              className="rounded-xl text-xs h-9"
              style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="group/btn text-white rounded-xl text-sm font-semibold h-10 px-6 transition-all duration-300 hover:scale-[1.04] hover:shadow-[0_6px_28px_rgba(86,204,242,0.45)] active:scale-[0.97]"
              style={{ background: 'linear-gradient(135deg, #56CCF2, #4F7CFF)', boxShadow: '0 4px 16px rgba(86, 204, 242, 0.3)' }}
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              <Sparkles className="h-3.5 w-3.5 mr-1.5 transition-transform duration-300 group-hover/btn:rotate-12 group-hover/btn:scale-110" />
              {editingId ? 'Actualizar Tienda' : 'Crear Tienda'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
