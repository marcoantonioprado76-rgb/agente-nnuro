'use client'

import { useEffect, useState, useCallback } from 'react'
import { RefreshCw, Loader2, Trash2, Edit2, X, Search, ChevronLeft, ChevronRight,
  Play, Image as ImageIcon, Plus, ChevronDown, ChevronRight as ChevronRightIcon, Package } from 'lucide-react'
import { UploadField } from '@/components/UploadField'

interface Product {
  id: string
  name: string
  category: string | null
  benefits: string | null
  usage: string | null
  warnings: string | null
  priceUnit: number | null
  pricePromo2: number | null
  priceSuper6: number | null
  currency: string
  welcomeMessage: string | null
  firstMessage: string | null
  shippingInfo: string | null
  coverage: string | null
  hooks: string[]
  active: boolean
  createdAt: string
  imageMainUrls: string[]
  imagePriceUnitUrl: string | null
  imagePricePromoUrl: string | null
  imagePriceSuperUrl: string | null
  productVideoUrls: string[]
  testimonialsVideoUrls: any[]
  tags: string[]
  user: { id: string; username: string; fullName: string }
  bots: { bot: { id: string; name: string } }[]
}

interface ActiveUser {
  id: string
  username: string
  fullName: string
  plan: string
}

// ── Form state ─────────────────────────────────────────────────────────────────
const EMPTY_FORM = {
  name: '', category: '', benefits: '', usage: '', warnings: '',
  priceUnit: '', pricePromo2: '', currency: 'USD',
  welcomeMessage: '', firstMessage: '', hooks: '',
  img1: '', img2: '', img3: '', img4: '', img5: '', img6: '', img7: '', img8: '',
  vid1: '', vid2: '',
  test1Label: '', test1Url: '', test2Label: '', test2Url: '',
  test3Label: '', test3Url: '', test4Label: '', test4Url: '',
  test5Label: '', test5Url: '', test6Label: '', test6Url: '',
  test7Label: '', test7Url: '',
  test1VidLabel: '', test1VidUrl: '', test2VidLabel: '', test2VidUrl: '',
  test3VidLabel: '', test3VidUrl: '', test4VidLabel: '', test4VidUrl: '',
  test5VidLabel: '', test5VidUrl: '', test6VidLabel: '', test6VidUrl: '',
  test7VidLabel: '', test7VidUrl: '',
  shippingInfo: '', coverage: '', active: true,
}
type FormState = typeof EMPTY_FORM

function parseTestimonials(p: Product) {
  const photos: { label: string; url: string }[] = Array.from({ length: 7 }, () => ({ label: '', url: '' }))
  const videos: { label: string; url: string }[] = Array.from({ length: 7 }, () => ({ label: '', url: '' }))
  let pi = 0, vi = 0
  for (const item of p.testimonialsVideoUrls) {
    if (typeof item === 'object' && item?.url) {
      if (item.type === 'video') { if (vi < 7) { videos[vi].url = item.url; videos[vi].label = item.label ?? ''; vi++ } }
      else { if (pi < 7) { photos[pi].url = item.url; photos[pi].label = item.label ?? ''; pi++ } }
    } else if (typeof item === 'string' && item.startsWith('http')) {
      if (pi < 7) { photos[pi].url = item; pi++ }
    }
  }
  return { photos, videos }
}

function productToForm(p: Product): FormState {
  const { photos, videos } = parseTestimonials(p)
  const imgs = [...(p.imageMainUrls ?? []), '', '', '', '', '', '', '', ''].slice(0, 8)
  return {
    name: p.name, category: p.category ?? '', benefits: p.benefits ?? '',
    usage: p.usage ?? '', warnings: p.warnings ?? '',
    priceUnit: p.priceUnit != null ? String(p.priceUnit) : '',
    pricePromo2: p.pricePromo2 != null ? String(p.pricePromo2) : '',
    currency: p.currency ?? 'USD',
    welcomeMessage: p.welcomeMessage ?? '', firstMessage: p.firstMessage ?? '',
    hooks: (p.hooks ?? []).join('\n'),
    img1: imgs[0], img2: imgs[1], img3: imgs[2], img4: imgs[3],
    img5: imgs[4], img6: imgs[5], img7: imgs[6], img8: imgs[7],
    vid1: (p.productVideoUrls?.[0] as string) || '',
    vid2: (p.productVideoUrls?.[1] as string) || '',
    test1Label: photos[0].label, test1Url: photos[0].url,
    test2Label: photos[1].label, test2Url: photos[1].url,
    test3Label: photos[2].label, test3Url: photos[2].url,
    test4Label: photos[3].label, test4Url: photos[3].url,
    test5Label: photos[4].label, test5Url: photos[4].url,
    test6Label: photos[5].label, test6Url: photos[5].url,
    test7Label: photos[6].label, test7Url: photos[6].url,
    test1VidLabel: videos[0].label, test1VidUrl: videos[0].url,
    test2VidLabel: videos[1].label, test2VidUrl: videos[1].url,
    test3VidLabel: videos[2].label, test3VidUrl: videos[2].url,
    test4VidLabel: videos[3].label, test4VidUrl: videos[3].url,
    test5VidLabel: videos[4].label, test5VidUrl: videos[4].url,
    test6VidLabel: videos[5].label, test6VidUrl: videos[5].url,
    test7VidLabel: videos[6].label, test7VidUrl: videos[6].url,
    shippingInfo: p.shippingInfo ?? '', coverage: p.coverage ?? '', active: p.active,
  }
}

function formToPayload(f: FormState, existing?: Product | null) {
  const testimonialsVideoUrls: any[] = []
  for (let i = 1; i <= 7; i++) {
    const url = (f as any)[`test${i}Url`] as string
    const lbl = (f as any)[`test${i}Label`] as string
    const vid = (f as any)[`test${i}VidUrl`] as string
    const vidLbl = (f as any)[`test${i}VidLabel`] as string
    if (url.trim()) testimonialsVideoUrls.push({ label: lbl.trim(), url: url.trim() })
    if (vid.trim()) testimonialsVideoUrls.push({ label: vidLbl.trim(), url: vid.trim(), type: 'video' })
  }
  return {
    name: f.name.trim(), category: f.category.trim() || null,
    benefits: f.benefits.trim() || null, usage: f.usage.trim() || null, warnings: f.warnings.trim() || null,
    priceUnit: f.priceUnit ? parseFloat(f.priceUnit) : null,
    pricePromo2: f.pricePromo2 ? parseFloat(f.pricePromo2) : null,
    priceSuper6: null, currency: f.currency || 'USD',
    welcomeMessage: f.welcomeMessage.trim() || null,
    firstMessage: f.firstMessage.trim() || null,
    hooks: f.hooks.split('\n').map((s: string) => s.trim()).filter(Boolean),
    imageMainUrls: [f.img1, f.img2, f.img3, f.img4, f.img5, f.img6, f.img7, f.img8].map(s => s.trim()).filter(Boolean),
    productVideoUrls: [f.vid1, f.vid2].map(s => s.trim()).filter(Boolean),
    imagePriceUnitUrl: existing?.imagePriceUnitUrl || null,
    imagePricePromoUrl: existing?.imagePricePromoUrl || null,
    imagePriceSuperUrl: existing?.imagePriceSuperUrl || null,
    testimonialsVideoUrls,
    shippingInfo: f.shippingInfo.trim() || null,
    coverage: f.coverage.trim() || null,
    tags: existing?.tags || [],
    active: f.active,
  }
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const INPUT: React.CSSProperties = { width: '100%', background: '#F0F3F7', border: '1px solid #E4E9F0', borderRadius: 10, padding: '10px 14px', color: '#fff', fontSize: 13, outline: 'none' }
const LABEL: React.CSSProperties = { display: 'block', fontSize: 11, color: '#6B7280', marginBottom: 5 }
const SECTION: React.CSSProperties = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '18px 18px', marginBottom: 14 }
const SEC_TITLE: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 7 }

const CURRENCIES = ['USD','EUR','BOB','PEN','COP','ARS','MXN','CLP','GTQ','HNL','NIO','CRC','PAB','DOP','UYU','PYG','BRL','VES','CUP']
const CATEGORIES = ['Salud y Bienestar','Belleza y Cuidado Personal','Electrónica y Gadgets','Hogar y Cocina','Deportes y Fitness','Moda y Accesorios','Juguetes y Bebés','Mascotas','Herramientas y Automotriz','Otros']

// ── Product Form Component ─────────────────────────────────────────────────────
function ProductFormModal({
  editing,
  users,
  onSaved,
  onClose,
}: {
  editing: Product | null
  users: ActiveUser[]
  onSaved: () => void
  onClose: () => void
}) {
  const isNew = !editing
  const [form, setForm] = useState<FormState>(editing ? productToForm(editing) : { ...EMPTY_FORM })
  const [userId, setUserId] = useState(editing?.user.id ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showTestPhotos, setShowTestPhotos] = useState(false)
  const [showTestVideos, setShowTestVideos] = useState(false)

  const setF = (k: keyof FormState, v: any) => setForm(p => ({ ...p, [k]: v }))

  async function handleSave() {
    if (!form.name.trim()) { setError('El nombre es requerido'); return }
    if (isNew && !userId) { setError('Seleccioná un usuario'); return }
    setSaving(true); setError('')
    try {
      const payload = formToPayload(form, editing)
      let res: Response
      if (isNew) {
        res = await fetch('/api/admin/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, userId }),
        })
      } else {
        res = await fetch(`/api/admin/products/${editing!.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Error al guardar'); return }
      onSaved()
    } catch { setError('Error de conexión. Intenta de nuevo.') }
    finally { setSaving(false) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.82)', zIndex: 50, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: '32px 16px 60px' }}>
      <div style={{ background: '#0d1117', border: '1px solid #E4E9F0', borderRadius: 20, width: '100%', maxWidth: 660 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Package size={18} style={{ color: '#D203DD' }} />
            <span style={{ fontWeight: 700, color: '#fff', fontSize: 16 }}>{isNew ? 'Nuevo producto' : 'Editar producto'}</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', padding: 4 }}><X size={18} /></button>
        </div>

        <div style={{ padding: '20px 24px' }}>
          {error && <div style={{ marginBottom: 14, padding: '10px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, color: '#ef4444', fontSize: 13 }}>{error}</div>}

          {/* User selector (create only) */}
          {isNew && (
            <div style={{ ...SECTION }}>
              <div style={{ ...SEC_TITLE }}><span style={{ width: 3, height: 14, background: '#D203DD', borderRadius: 2, display: 'inline-block' }} />Asignar a usuario</div>
              <div>
                <label style={LABEL}>Usuario con plan activo *</label>
                <select
                  value={userId}
                  onChange={e => setUserId(e.target.value)}
                  style={{ ...INPUT, appearance: 'none' as any }}
                >
                  <option value="">Seleccionar usuario...</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.fullName} (@{u.username}) — {u.plan}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
          {!isNew && (
            <div style={{ marginBottom: 14, padding: '8px 14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, fontSize: 12, color: '#6B7280' }}>
              Usuario: <span style={{ color: '#374151', fontWeight: 600 }}>{editing!.user.fullName} (@{editing!.user.username})</span>
            </div>
          )}

          {/* Basic info */}
          <div style={SECTION}>
            <div style={SEC_TITLE}><span style={{ width: 3, height: 14, background: '#00FF88', borderRadius: 2, display: 'inline-block' }} />Información básica</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={LABEL}>Nombre del producto *</label>
                <input style={INPUT} value={form.name} onChange={e => setF('name', e.target.value)} placeholder="ej: Gel de Aloe Vera" />
              </div>
              <div>
                <label style={LABEL}>Categoría</label>
                <select style={{ ...INPUT, appearance: 'none' as any }} value={form.category} onChange={e => setF('category', e.target.value)}>
                  <option value="">Sin categoría</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={LABEL}>Primer mensaje del producto</label>
              <textarea style={{ ...INPUT, resize: 'vertical' as any }} rows={3} value={form.firstMessage} onChange={e => setF('firstMessage', e.target.value)} placeholder="Hola {nombre}! Te presento nuestro producto..." />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={LABEL}>Mensaje de bienvenida</label>
              <textarea style={{ ...INPUT, resize: 'vertical' as any }} rows={2} value={form.welcomeMessage} onChange={e => setF('welcomeMessage', e.target.value)} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button type="button" onClick={() => setF('active', !form.active)}
                style={{ width: 40, height: 22, borderRadius: 11, border: 'none', cursor: 'pointer', position: 'relative', background: form.active ? '#00FF88' : '#E4E9F0', transition: 'background 0.2s', flexShrink: 0 }}>
                <span style={{ position: 'absolute', top: 3, left: form.active ? 21 : 3, width: 16, height: 16, borderRadius: '50%', background: form.active ? '#000' : '#fff', transition: 'left 0.2s' }} />
              </button>
              <span style={{ fontSize: 13, color: form.active ? '#00FF88' : '#6B7280' }}>{form.active ? 'Producto activo' : 'Producto inactivo'}</span>
            </div>
          </div>

          {/* Description */}
          <div style={SECTION}>
            <div style={SEC_TITLE}><span style={{ width: 3, height: 14, background: '#00C2FF', borderRadius: 2, display: 'inline-block' }} />Descripción</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div><label style={LABEL}>Beneficios</label><textarea style={{ ...INPUT, resize: 'vertical' as any }} rows={3} value={form.benefits} onChange={e => setF('benefits', e.target.value)} placeholder="te ayuda en..." /></div>
              <div><label style={LABEL}>Modo de uso</label><textarea style={{ ...INPUT, resize: 'vertical' as any }} rows={2} value={form.usage} onChange={e => setF('usage', e.target.value)} /></div>
              <div><label style={LABEL}>Advertencias</label><textarea style={{ ...INPUT, resize: 'vertical' as any }} rows={2} value={form.warnings} onChange={e => setF('warnings', e.target.value)} /></div>
            </div>
          </div>

          {/* Prices */}
          <div style={SECTION}>
            <div style={SEC_TITLE}><span style={{ width: 3, height: 14, background: '#9B00FF', borderRadius: 2, display: 'inline-block' }} />Precios</div>
            <div style={{ marginBottom: 12 }}>
              <label style={LABEL}>Moneda</label>
              <select style={{ ...INPUT, appearance: 'none' as any }} value={form.currency} onChange={e => setF('currency', e.target.value)}>
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div><label style={LABEL}>Precio</label><input style={INPUT} type="number" step="0.01" value={form.priceUnit} onChange={e => setF('priceUnit', e.target.value)} placeholder="25.00" /></div>
              <div><label style={LABEL}>Precio de oferta</label><input style={INPUT} type="number" step="0.01" value={form.pricePromo2} onChange={e => setF('pricePromo2', e.target.value)} placeholder="45.00" /></div>
            </div>
          </div>

          {/* Shipping */}
          <div style={SECTION}>
            <div style={SEC_TITLE}><span style={{ width: 3, height: 14, background: '#FF8800', borderRadius: 2, display: 'inline-block' }} />Envío y cobertura</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div><label style={LABEL}>Info de envío</label><textarea style={{ ...INPUT, resize: 'vertical' as any }} rows={2} value={form.shippingInfo} onChange={e => setF('shippingInfo', e.target.value)} /></div>
              <div><label style={LABEL}>Cobertura</label><input style={INPUT} value={form.coverage} onChange={e => setF('coverage', e.target.value)} /></div>
            </div>
          </div>

          {/* Images */}
          <div style={SECTION}>
            <div style={SEC_TITLE}><span style={{ width: 3, height: 14, background: '#00FF88', borderRadius: 2, display: 'inline-block' }} />Imágenes principales</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
              {(['img1','img2','img3'] as const).map(k => (
                <UploadField key={k} type="image" value={form[k]} onChange={v => setF(k, v)} placeholder="Subir foto" />
              ))}
            </div>
            <div style={SEC_TITLE}><span style={{ width: 3, height: 14, background: '#00FF88', borderRadius: 2, display: 'inline-block' }} />Más fotos del producto</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
              {(['img4','img5','img6','img7','img8'] as const).map((k,i) => (
                <UploadField key={k} type="image" value={form[k]} onChange={v => setF(k, v)} placeholder={`Foto ${i+4}`} />
              ))}
            </div>
            <div style={{ ...SEC_TITLE, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <span style={{ width: 3, height: 14, background: '#00C2FF', borderRadius: 2, display: 'inline-block' }} />Videos del producto
            </div>
            <p style={{ fontSize: 11, color: '#6B7280', marginBottom: 10 }}>El agente enviará estos videos si el cliente quiere ver el producto en acción. Máx 90s.</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {(['vid1','vid2'] as const).map((k,i) => (
                <UploadField key={k} type="video" value={form[k]} onChange={v => setF(k, v)} placeholder={`Video ${i+1}`} />
              ))}
            </div>
          </div>

          {/* Testimonial photos (collapsible) */}
          <div style={SECTION}>
            <button type="button" onClick={() => setShowTestPhotos(v => !v)}
              style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={SEC_TITLE}>
                <span style={{ width: 3, height: 14, background: '#00C2FF', borderRadius: 2, display: 'inline-block' }} />
                Fotos de testimonios <span style={{ fontSize: 10, color: '#6B7280', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(el agente las envía ante dudas)</span>
              </div>
              {showTestPhotos ? <ChevronDown size={14} style={{ color: '#6B7280' }} /> : <ChevronRightIcon size={14} style={{ color: '#6B7280' }} />}
            </button>
            {showTestPhotos && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 10 }}>
                {[1,2,3,4,5,6,7].map(n => (
                  <div key={n} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 8, alignItems: 'start' }}>
                    <input style={INPUT} value={(form as any)[`test${n}Label`]} onChange={e => setF(`test${n}Label` as any, e.target.value)} placeholder={`Ej: Testimonio ${n}`} />
                    <UploadField type="image" value={(form as any)[`test${n}Url`]} onChange={v => setF(`test${n}Url` as any, v)} placeholder="Subir foto" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Testimonial videos (collapsible) */}
          <div style={SECTION}>
            <button type="button" onClick={() => setShowTestVideos(v => !v)}
              style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={SEC_TITLE}>
                <span style={{ width: 3, height: 14, background: '#9B00FF', borderRadius: 2, display: 'inline-block' }} />Videos de testimonios
              </div>
              {showTestVideos ? <ChevronDown size={14} style={{ color: '#6B7280' }} /> : <ChevronRightIcon size={14} style={{ color: '#6B7280' }} />}
            </button>
            {showTestVideos && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 10 }}>
                <p style={{ fontSize: 11, color: '#6B7280', marginBottom: 4 }}>El agente los envía para mayor confianza. Máx 90s.</p>
                {[1,2,3,4,5,6,7].map(n => (
                  <div key={n} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 8, alignItems: 'start' }}>
                    <input style={INPUT} value={(form as any)[`test${n}VidLabel`]} onChange={e => setF(`test${n}VidLabel` as any, e.target.value)} placeholder={`Video testimonio ${n}`} />
                    <UploadField type="video" value={(form as any)[`test${n}VidUrl`]} onChange={v => setF(`test${n}VidUrl` as any, v)} placeholder="Subir video" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onClose} style={{ flex: 1, padding: '12px 0', borderRadius: 12, border: '1px solid #E4E9F0', background: 'transparent', color: '#6B7280', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
              Cancelar
            </button>
            <button onClick={handleSave} disabled={saving}
              style={{ flex: 2, padding: '12px 0', borderRadius: 12, border: 'none', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 14,
                background: saving ? 'rgba(255,255,255,0.06)' : 'linear-gradient(135deg, #D203DD, #00FF88)',
                color: saving ? '#6B7280' : '#000' }}>
              {saving ? 'Guardando...' : isNew ? 'Crear producto' : 'Guardar cambios'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  const [modal, setModal] = useState<'create' | 'edit' | null>(null)
  const [editing, setEditing] = useState<Product | null>(null)

  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([])
  const [deleteConfirm, setDeleteConfirm] = useState<Product | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchProducts = useCallback(() => {
    setLoading(true)
    const qs = new URLSearchParams()
    if (search) qs.set('q', search)
    qs.set('page', String(page))
    fetch(`/api/admin/products?${qs}`)
      .then(r => r.json())
      .then(d => { setProducts(d.products ?? []); setTotal(d.total ?? 0); setTotalPages(d.totalPages ?? 1) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [search, page])

  useEffect(() => { fetchProducts() }, [fetchProducts])

  useEffect(() => {
    fetch('/api/admin/users?page=1')
      .then(r => r.json())
      .then(d => {
        const users = (d.users ?? []).filter((u: any) => u.plan && u.plan !== 'NONE')
        setActiveUsers(users.map((u: any) => ({ id: u.id, username: u.username, fullName: u.full_name ?? u.fullName, plan: u.plan })))
      })
      .catch(() => {})
  }, [])

  const handleSearch = () => { setSearch(searchInput); setPage(1) }

  const openCreate = () => { setEditing(null); setModal('create') }
  const openEdit = (p: Product) => { setEditing(p); setModal('edit') }
  const closeModal = () => { setModal(null); setEditing(null) }
  const onSaved = () => { closeModal(); fetchProducts() }

  const doDelete = async () => {
    if (!deleteConfirm) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/products/${deleteConfirm.id}`, { method: 'DELETE' })
      if (!res.ok) { const d = await res.json(); alert(d.error ?? 'Error al eliminar'); return }
      setDeleteConfirm(null); fetchProducts()
    } catch { alert('Error de conexión.') }
    finally { setDeleting(false) }
  }

  return (
  <div className="dm-page font-ui">
    <div className="px-4 sm:px-6 pt-6 pb-10 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[#111827] uppercase tracking-widest">Productos de Bots</h1>
        <div className="h-px w-20 mt-2 rounded-full" style={{ background: 'linear-gradient(90deg, transparent, #D203DD, #FF2DF7, transparent)' }} />
        <p className="text-xs text-[#111827]/30 mt-1">Todos los productos añadidos por usuarios para sus agentes AI</p>
      </div>

      {/* Search + actions */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
        <div style={{ flex: 1, display: 'flex', gap: 6 }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#6B7280' }} />
            <input value={searchInput} onChange={e => setSearchInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="Buscar por nombre, categoría, usuario..."
              style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 9, padding: '8px 10px 8px 32px', color: '#fff', fontSize: 13, outline: 'none' }} />
          </div>
          <button onClick={handleSearch} style={{ padding: '0 14px', borderRadius: 9, background: 'rgba(210,3,221,0.12)', border: '1px solid rgba(210,3,221,0.25)', color: '#D203DD', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
            Buscar
          </button>
        </div>
        <button onClick={fetchProducts} style={{ padding: '0 10px', borderRadius: 9, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer' }}>
          <RefreshCw size={13} className="text-[#111827]/40" />
        </button>
        <button onClick={openCreate}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 14px', borderRadius: 9, border: 'none', background: 'linear-gradient(135deg, #D203DD, #00FF88)', color: '#000', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
          <Plus size={14} /> Nuevo producto
        </button>
      </div>

      <p style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 12 }}>{total} producto{total !== 1 ? 's' : ''} en total</p>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={20} className="animate-spin text-[#111827]/30" /></div>
      ) : products.length === 0 ? (
        <div className="text-center py-16 text-[#111827]/30 text-sm">No se encontraron productos.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {products.map(p => {
            const allImages = [
              ...(p.imageMainUrls ?? []),
              ...(p.imagePriceUnitUrl ? [p.imagePriceUnitUrl] : []),
              ...(p.imagePricePromoUrl ? [p.imagePricePromoUrl] : []),
              ...(p.imagePriceSuperUrl ? [p.imagePriceSuperUrl] : []),
            ]
            const allVideos = [...(p.productVideoUrls ?? []), ...(p.testimonialsVideoUrls?.filter((v: any) => v?.type === 'video' || typeof v === 'string').map((v: any) => typeof v === 'string' ? v : v.url) ?? [])]

            return (
              <div key={p.id} style={{ padding: '14px 16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 13 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  {/* First image as thumbnail */}
                  {allImages[0] ? (
                    <img src={allImages[0]} alt="" style={{ width: 56, height: 56, borderRadius: 10, objectFit: 'cover', flexShrink: 0, border: '1px solid #E4E9F0' }} />
                  ) : (
                    <div style={{ width: 56, height: 56, borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Package size={20} style={{ color: '#9CA3AF' }} />
                    </div>
                  )}

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, color: '#fff', fontSize: 14 }}>{p.name}</span>
                      {p.category && <span style={{ fontSize: 11, color: '#6B7280', background: '#F0F3F7', padding: '2px 7px', borderRadius: 5 }}>{p.category}</span>}
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 5, border: '1px solid', ...(p.active ? { color: '#00FF88', borderColor: 'rgba(0,255,136,0.2)', background: 'rgba(0,255,136,0.06)' } : { color: '#9CA3AF', borderColor: 'rgba(255,255,255,0.08)', background: 'transparent' }) }}>
                        {p.active ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                    <p style={{ fontSize: 12, color: '#6B7280', marginBottom: 3 }}>
                      <span style={{ color: 'rgba(255,255,255,0.65)', fontWeight: 600 }}>{p.user.fullName}</span>
                      <span style={{ color: '#9CA3AF' }}> · @{p.user.username}</span>
                    </p>
                    {p.bots.length > 0 && (
                      <p style={{ fontSize: 11, color: '#9CA3AF' }}>Bots: {p.bots.map(b => b.bot.name).join(', ')}</p>
                    )}
                    {(p.priceUnit != null || p.pricePromo2 != null) && (
                      <p style={{ fontSize: 11, color: '#6B7280', marginTop: 3 }}>
                        {[p.priceUnit != null && `${p.priceUnit} ${p.currency}`, p.pricePromo2 != null && `Oferta: ${p.pricePromo2} ${p.currency}`].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button onClick={() => openEdit(p)} style={{ padding: '6px 8px', borderRadius: 7, background: 'rgba(210,3,221,0.07)', border: '1px solid rgba(210,3,221,0.15)', cursor: 'pointer', color: '#D203DD' }}>
                      <Edit2 size={13} />
                    </button>
                    <button onClick={() => setDeleteConfirm(p)} style={{ padding: '6px 8px', borderRadius: 7, background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', cursor: 'pointer', color: '#ef4444' }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Media grid */}
                {(allImages.length > 1 || allVideos.length > 0) && (
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 10 }}>
                    {allImages.slice(1, 7).map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noreferrer"
                        style={{ width: 46, height: 46, borderRadius: 7, overflow: 'hidden', border: '1px solid #E4E9F0', display: 'block', flexShrink: 0 }}>
                        <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </a>
                    ))}
                    {allImages.length > 7 && (
                      <div style={{ width: 46, height: 46, borderRadius: 7, background: '#F0F3F7', border: '1px solid #E4E9F0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                        <ImageIcon size={12} style={{ color: '#6B7280' }} />
                        <span style={{ fontSize: 9, color: '#6B7280', fontWeight: 700 }}>+{allImages.length - 7}</span>
                      </div>
                    )}
                    {allVideos.slice(0, 3).map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noreferrer"
                        style={{ width: 46, height: 46, borderRadius: 7, overflow: 'hidden', border: '1px solid rgba(0,194,255,0.25)', display: 'block', flexShrink: 0, position: 'relative', background: '#111' }}>
                        <video src={url} muted style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.6 }} />
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Play size={14} style={{ color: '#fff', filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.9))' }} />
                        </div>
                      </a>
                    ))}
                    {allVideos.length > 3 && (
                      <div style={{ width: 46, height: 46, borderRadius: 7, background: 'rgba(0,194,255,0.05)', border: '1px solid rgba(0,194,255,0.15)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                        <Play size={12} style={{ color: 'rgba(0,194,255,0.6)' }} />
                        <span style={{ fontSize: 9, color: 'rgba(0,194,255,0.5)', fontWeight: 700 }}>+{allVideos.length - 3}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 20 }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            style={{ padding: '6px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.4 : 1 }}>
            <ChevronLeft size={14} className="text-[#111827]/50" />
          </button>
          <span style={{ fontSize: 12, color: '#6B7280' }}>Página {page} de {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            style={{ padding: '6px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', cursor: page === totalPages ? 'not-allowed' : 'pointer', opacity: page === totalPages ? 0.4 : 1 }}>
            <ChevronRight size={14} className="text-[#111827]/50" />
          </button>
        </div>
      )}

      {/* Create / Edit Modal */}
      {modal && (
        <ProductFormModal
          editing={modal === 'edit' ? editing : null}
          users={activeUsers}
          onSaved={onSaved}
          onClose={closeModal}
        />
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#0d1117', border: '1px solid #E4E9F0', borderRadius: 16, padding: 28, maxWidth: 380, width: '100%' }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 6 }}>¿Eliminar producto?</p>
            <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 4 }}>
              <span style={{ color: '#fff', fontWeight: 600 }}>{deleteConfirm.name}</span>
            </p>
            <p style={{ fontSize: 12, color: '#6B7280', marginBottom: 20 }}>Esta acción no se puede deshacer.</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setDeleteConfirm(null)} style={{ flex: 1, padding: '9px 0', borderRadius: 8, border: '1px solid #E4E9F0', background: 'transparent', color: '#6B7280', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>Cancelar</button>
              <button onClick={doDelete} disabled={deleting} style={{ flex: 1, padding: '9px 0', borderRadius: 8, border: 'none', background: '#ef4444', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
                {deleting ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
  )
}
