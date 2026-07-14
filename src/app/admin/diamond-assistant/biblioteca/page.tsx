'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  Library,
  Plus,
  X,
  Loader2,
  AlertTriangle,
  Trash2,
  Pencil,
  Image as ImageIcon,
  Video,
  Music,
  FileText,
  Link as LinkIcon,
  Type,
  Upload,
  ExternalLink,
  FolderOpen,
  Tag,
  MessageSquareQuote,
} from 'lucide-react'
import { PageHeader, CardGrid, cardStyle, BRAND, BORDER, MUTED, ACCENTS, type Accent } from '../_ui'

// ── Tipos ──────────────────────────────────────────────────────────
type MediaType = 'IMAGE' | 'VIDEO' | 'AUDIO' | 'PDF' | 'LINK' | 'TEXT'

interface Asset {
  id: string
  type: MediaType
  title: string
  caption: string | null
  url: string | null
  linkUrl: string | null
  textContent: string | null
  mimeType: string | null
  sizeBytes: number | null
  tags: unknown
  createdAt: string
}

interface MediaForm {
  type: MediaType
  title: string
  caption: string
  tags: string
  linkUrl: string
  textContent: string
  file: File | null
}

const EMPTY_FORM: MediaForm = {
  type: 'IMAGE',
  title: '',
  caption: '',
  tags: '',
  linkUrl: '',
  textContent: '',
  file: null,
}

// ── Metadatos por tipo (ícono, etiqueta, acento) ───────────────────
const TYPE_META: Record<MediaType, { label: string; icon: LucideIcon; accent: Accent }> = {
  IMAGE: { label: 'Imagen', icon: ImageIcon, accent: ACCENTS[0] },
  VIDEO: { label: 'Video', icon: Video, accent: ACCENTS[1] },
  AUDIO: { label: 'Audio', icon: Music, accent: ACCENTS[2] },
  PDF: { label: 'PDF', icon: FileText, accent: ACCENTS[3] },
  LINK: { label: 'Enlace', icon: LinkIcon, accent: ACCENTS[2] },
  TEXT: { label: 'Texto', icon: Type, accent: ACCENTS[1] },
}

const TYPE_ORDER: MediaType[] = ['IMAGE', 'VIDEO', 'AUDIO', 'PDF', 'LINK', 'TEXT']
const FILE_TYPES: MediaType[] = ['IMAGE', 'VIDEO', 'AUDIO', 'PDF']

const ACCEPT: Record<string, string> = {
  IMAGE: 'image/*',
  VIDEO: 'video/*',
  AUDIO: 'audio/*',
  PDF: 'application/pdf',
}

// ── Helpers ────────────────────────────────────────────────────────
function toStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.map((t) => String(t)).filter(Boolean) : []
}

/** Agrega etiquetas (sin duplicar) al string separado por comas y lo devuelve. */
function addTags(current: string, add: string[]): string {
  const have = current.split(',').map((s) => s.trim()).filter(Boolean)
  for (const t of add) if (!have.some((h) => h.toLowerCase() === t.toLowerCase())) have.push(t)
  return have.join(', ')
}

function formatBytes(n: number | null): string {
  if (!n || n <= 0) return ''
  const units = ['B', 'KB', 'MB', 'GB']
  let i = 0
  let size = n
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024
    i++
  }
  return `${size.toFixed(size >= 10 || i === 0 ? 0 : 1)} ${units[i]}`
}

function isHttpUrl(v: string): boolean {
  try {
    const u = new URL(v)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

export default function DiamondAssistantBiblioteca() {
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState<string | null>(null)
  const [filter, setFilter] = useState<MediaType | 'ALL' | 'TESTIMONIO'>('ALL')

  // Modal crear / editar
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<MediaForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Modal eliminar
  const [deleteTarget, setDeleteTarget] = useState<Asset | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchAssets = useCallback(async (type: MediaType | 'ALL' | 'TESTIMONIO') => {
    setLoading(true)
    setListError(null)
    try {
      // 'TESTIMONIO' no es un tipo: traemos todo y filtramos por etiqueta abajo.
      const qs = (type === 'ALL' || type === 'TESTIMONIO') ? '' : `?type=${type}`
      const res = await fetch(`/api/admin/diamond-assistant/media${qs}`)
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.ok) {
        setListError(data.error ?? 'No se pudieron cargar los contenidos.')
        setAssets([])
        return
      }
      setAssets(data.data ?? [])
    } catch {
      setListError('Error de conexión al cargar la biblioteca.')
      setAssets([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAssets(filter)
  }, [fetchAssets, filter])

  // Cuando el filtro es 'TESTIMONIO' mostramos solo los recursos etiquetados
  // como testimonio (la etiqueta contiene "testimonio").
  const displayedAssets = useMemo(
    () => (filter === 'TESTIMONIO'
      ? assets.filter((a) => toStringArray(a.tags).some((t) => t.toLowerCase().includes('testimonio')))
      : assets),
    [assets, filter],
  )

  const totalLabel = useMemo(() => displayedAssets.length, [displayedAssets])

  function openCreate() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setFormError(null)
    setModalOpen(true)
  }

  function openEdit(a: Asset) {
    setEditingId(a.id)
    setForm({
      type: a.type,
      title: a.title ?? '',
      caption: a.caption ?? '',
      tags: toStringArray(a.tags).join(', '),
      linkUrl: a.linkUrl ?? '',
      textContent: a.textContent ?? '',
      file: null,
    })
    setFormError(null)
    setModalOpen(true)
  }

  function closeModal() {
    if (saving) return
    setModalOpen(false)
    setEditingId(null)
  }

  function selectType(type: MediaType) {
    // Al cambiar de tipo limpiamos los campos específicos (conservamos título y etiquetas).
    setForm((p) => ({ ...p, type, file: null, linkUrl: '', textContent: '' }))
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function saveAsset() {
    const title = form.title.trim()
    if (!title) {
      setFormError('El título es obligatorio.')
      return
    }

    const tagsArray = form.tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
    const caption = form.caption.trim()

    // ── Editar (existente): solo título / descripción / etiquetas (no el archivo) ──
    if (editingId) {
      setSaving(true)
      setFormError(null)
      try {
        const res = await fetch(`/api/admin/diamond-assistant/media/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, caption, tags: tagsArray }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok || !data.ok) { setFormError(data.error ?? 'No se pudieron guardar los cambios.'); return }
        setModalOpen(false)
        setEditingId(null)
        setForm(EMPTY_FORM)
        await fetchAssets(filter)
      } catch {
        setFormError('Error de conexión al guardar.')
      } finally {
        setSaving(false)
      }
      return
    }

    let body: BodyInit
    const headers: Record<string, string> = {}

    if (FILE_TYPES.includes(form.type)) {
      if (!form.file) {
        setFormError('Debes seleccionar un archivo para subir.')
        return
      }
      const fd = new FormData()
      fd.append('type', form.type)
      fd.append('title', title)
      if (caption) fd.append('caption', caption)
      fd.append('tags', JSON.stringify(tagsArray))
      fd.append('file', form.file)
      body = fd
      // No fijamos Content-Type: el navegador añade el boundary de multipart.
    } else if (form.type === 'LINK') {
      const linkUrl = form.linkUrl.trim()
      if (!isHttpUrl(linkUrl)) {
        setFormError('El enlace debe empezar con http:// o https://')
        return
      }
      headers['Content-Type'] = 'application/json'
      body = JSON.stringify({ type: 'LINK', title, tags: tagsArray, linkUrl })
    } else {
      const textContent = form.textContent.trim()
      if (!textContent) {
        setFormError('El texto no puede estar vacío.')
        return
      }
      headers['Content-Type'] = 'application/json'
      body = JSON.stringify({ type: 'TEXT', title, tags: tagsArray, textContent })
    }

    setSaving(true)
    setFormError(null)
    try {
      const res = await fetch('/api/admin/diamond-assistant/media', { method: 'POST', headers, body })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.ok) {
        setFormError(data.error ?? 'No se pudo guardar el contenido.')
        return
      }
      setModalOpen(false)
      await fetchAssets(filter)
    } catch {
      setFormError('Error de conexión al guardar.')
    } finally {
      setSaving(false)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/diamond-assistant/media/${deleteTarget.id}`, {
        method: 'DELETE',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.ok) {
        alert(data.error ?? 'No se pudo eliminar el contenido.')
        return
      }
      setDeleteTarget(null)
      await fetchAssets(filter)
    } catch {
      alert('Error de conexión al eliminar.')
    } finally {
      setDeleting(false)
    }
  }

  const isFileType = FILE_TYPES.includes(form.type)

  return (
    <div>
      <PageHeader
        icon={Library}
        title="Biblioteca"
        description="Contenido multimedia reutilizable que tus agentes pueden enviar"
        action={
          <button onClick={openCreate} style={primaryBtnStyle}>
            <Plus size={15} /> Agregar contenido
          </button>
        }
      />

      {/* ── Chips de filtro por tipo ──────────────────────────────── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
        <FilterChip active={filter === 'ALL'} onClick={() => setFilter('ALL')} label="Todo" />
        {TYPE_ORDER.map((t) => {
          const meta = TYPE_META[t]
          return (
            <FilterChip
              key={t}
              active={filter === t}
              onClick={() => setFilter(t)}
              label={meta.label}
              icon={meta.icon}
              color={meta.accent.color}
            />
          )
        })}
        <FilterChip
          active={filter === 'TESTIMONIO'}
          onClick={() => setFilter('TESTIMONIO')}
          label="Testimonios"
          icon={MessageSquareQuote}
          color="#16A34A"
        />
      </div>

      {/* ── Estados: carga / error / vacío / grilla ───────────────── */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '64px 0' }}>
          <Loader2 size={24} className="animate-spin" style={{ color: '#B735B8' }} />
        </div>
      ) : listError ? (
        <div
          style={{
            ...cardStyle,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            borderColor: 'rgba(220,38,38,0.25)',
            background: 'rgba(220,38,38,0.04)',
          }}
        >
          <AlertTriangle size={16} style={{ color: '#DC2626' }} />
          <p style={{ fontSize: 13, color: '#DC2626', margin: 0 }}>{listError}</p>
        </div>
      ) : displayedAssets.length === 0 ? (
        <div style={{ ...cardStyle, textAlign: 'center', padding: '48px 24px' }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              margin: '0 auto 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(183,53,184,0.10)',
            }}
          >
            <FolderOpen size={26} style={{ color: '#B735B8' }} />
          </div>
          <p style={{ fontSize: 15, fontWeight: 800, margin: 0 }}>
            {filter === 'ALL'
              ? 'La biblioteca está vacía'
              : filter === 'TESTIMONIO'
                ? 'No hay testimonios cargados'
                : `No hay contenido de tipo ${TYPE_META[filter].label}`}
          </p>
          <p style={{ fontSize: 13, color: MUTED, margin: '6px 0 16px', lineHeight: 1.55 }}>
            Sube flyers, videos, audios, PDFs, enlaces o textos para reutilizarlos en tus mensajes.
          </p>
          <button onClick={openCreate} style={{ ...primaryBtnStyle, margin: '0 auto' }}>
            <Plus size={15} /> Agregar contenido
          </button>
        </div>
      ) : (
        <>
          <p style={{ fontSize: 12, color: MUTED, margin: '0 0 12px' }}>
            {totalLabel} {totalLabel === 1 ? 'contenido' : 'contenidos'}
          </p>
          <CardGrid min={260}>
            {displayedAssets.map((asset) => (
              <AssetCard key={asset.id} asset={asset} onEdit={() => openEdit(asset)} onDelete={() => setDeleteTarget(asset)} />
            ))}
          </CardGrid>
        </>
      )}

      {/* ── Modal agregar contenido ───────────────────────────────── */}
      {modalOpen && (
        <div style={overlayStyle}>
          <div style={backdropStyle} onClick={closeModal} />
          <div style={{ ...modalCardStyle, maxWidth: 540 }}>
            {/* Header */}
            <div style={modalHeaderStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 11,
                    background: BRAND,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Plus size={17} className="text-white" />
                </div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 800, margin: 0 }}>{editingId ? 'Editar contenido' : 'Agregar contenido'}</p>
                  <p style={{ fontSize: 11, color: MUTED, margin: 0 }}>
                    {editingId ? 'Cambiá el título, la descripción y las etiquetas' : 'Súbelo a la biblioteca para reutilizarlo'}
                  </p>
                </div>
              </div>
              <button onClick={closeModal} style={iconBtnStyle}>
                <X size={16} style={{ color: '#6B7280' }} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: 20, overflowY: 'auto' }}>
              {formError && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 8,
                    background: 'rgba(220,38,38,0.06)',
                    border: '1px solid rgba(220,38,38,0.2)',
                    borderRadius: 12,
                    padding: '10px 12px',
                    marginBottom: 16,
                  }}
                >
                  <AlertTriangle size={14} style={{ color: '#DC2626', flexShrink: 0, marginTop: 1 }} />
                  <p style={{ fontSize: 12, color: '#DC2626', margin: 0, lineHeight: 1.4 }}>{formError}</p>
                </div>
              )}

              {editingId && (
                <div style={{ background: 'rgba(35,59,143,0.06)', border: '1px solid rgba(35,59,143,0.18)', borderRadius: 12, padding: '10px 12px', marginBottom: 16 }}>
                  <p style={{ fontSize: 11.5, color: '#233B8F', margin: 0, lineHeight: 1.4 }}>✏️ Estás editando. Cambiás el <b>título</b>, la <b>descripción</b> y las <b>etiquetas</b> (el archivo no se cambia).</p>
                </div>
              )}

              {/* Selector de tipo */}
              <label style={labelStyle}>Tipo de contenido</label>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 8,
                  marginBottom: 18,
                }}
              >
                {TYPE_ORDER.map((t) => {
                  const meta = TYPE_META[t]
                  const active = form.type === t
                  const Icon = meta.icon
                  return (
                    <button
                      key={t}
                      onClick={() => selectType(t)}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 6,
                        padding: '12px 6px',
                        borderRadius: 12,
                        cursor: 'pointer',
                        background: active ? meta.accent.tint : '#F8FAFC',
                        border: active ? `1.5px solid ${meta.accent.color}` : `1px solid ${BORDER}`,
                        transition: 'all 0.12s',
                      }}
                    >
                      <Icon size={18} style={{ color: active ? meta.accent.color : '#9CA3AF' }} />
                      <span
                        style={{
                          fontSize: 11.5,
                          fontWeight: 700,
                          color: active ? meta.accent.color : '#6B7280',
                        }}
                      >
                        {meta.label}
                      </span>
                    </button>
                  )
                })}
              </div>

              {/* Campo dinámico según tipo */}
              {isFileType ? (
                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>Archivo</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={ACCEPT[form.type]}
                    onChange={(e) => setForm((p) => ({ ...p, file: e.target.files?.[0] ?? null }))}
                    style={{ display: 'none' }}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 10,
                      padding: form.file ? '14px 16px' : '26px 16px',
                      borderRadius: 12,
                      background: '#F8FAFC',
                      border: `1.5px dashed ${form.file ? TYPE_META[form.type].accent.color : BORDER}`,
                      cursor: 'pointer',
                      textAlign: 'center',
                    }}
                  >
                    <Upload size={18} style={{ color: form.file ? TYPE_META[form.type].accent.color : '#9CA3AF', flexShrink: 0 }} />
                    <div style={{ minWidth: 0, textAlign: 'left' }}>
                      {form.file ? (
                        <>
                          <p style={{ fontSize: 13, fontWeight: 700, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {form.file.name}
                          </p>
                          <p style={{ fontSize: 11, color: MUTED, margin: 0 }}>
                            {formatBytes(form.file.size)} · toca para cambiar
                          </p>
                        </>
                      ) : (
                        <p style={{ fontSize: 13, fontWeight: 700, color: '#6B7280', margin: 0 }}>
                          Selecciona un {TYPE_META[form.type].label.toLowerCase()}
                        </p>
                      )}
                    </div>
                  </button>
                </div>
              ) : form.type === 'LINK' ? (
                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>Enlace (URL)</label>
                  <input
                    type="url"
                    value={form.linkUrl}
                    onChange={(e) => setForm((p) => ({ ...p, linkUrl: e.target.value }))}
                    placeholder="https://..."
                    style={inputStyle}
                  />
                </div>
              ) : (
                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>Texto</label>
                  <textarea
                    value={form.textContent}
                    onChange={(e) => setForm((p) => ({ ...p, textContent: e.target.value }))}
                    placeholder="Escribe el texto reutilizable (mensaje de bienvenida, promoción, instrucciones...)"
                    rows={6}
                    style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.55, fontFamily: 'inherit', minHeight: 120 }}
                  />
                </div>
              )}

              {/* Título (INTERNO — no se manda) */}
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Título <span style={{ fontWeight: 500, color: '#9CA3AF', textTransform: 'none', letterSpacing: 0 }}>· solo para vos (no se manda)</span></label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder="Ej. Flyer promoción septiembre"
                  style={inputStyle}
                />
              </div>

              {/* Descripción (SE MANDA junto con la imagen/video) */}
              {(FILE_TYPES.includes(form.type) || form.type === 'LINK') && (
                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>Descripción <span style={{ fontWeight: 700, color: '#16A34A', textTransform: 'none', letterSpacing: 0 }}>· se manda con la imagen 💬</span></label>
                  <textarea
                    value={form.caption}
                    onChange={(e) => setForm((p) => ({ ...p, caption: e.target.value }))}
                    placeholder="Ej. Conocé FASE DETOX 🌿 Ideal para tu bienestar. ¿Querés más info?"
                    rows={3}
                    style={{ ...inputStyle, resize: 'vertical', minHeight: 70 }}
                  />
                  <p style={{ fontSize: 11, color: '#6B7280', margin: '5px 0 0', lineHeight: 1.4 }}>
                    CAMILA envía la imagen <b>con este texto</b> como mensaje. El título de arriba es solo para que lo encuentres vos.
                  </p>
                </div>
              )}

              {/* Etiquetas */}
              <div>
                <label style={labelStyle}>
                  Etiquetas{' '}
                  <span style={{ textTransform: 'none', fontWeight: 600, color: '#B0B7C3' }}>
                    · separadas por comas
                  </span>
                </label>
                {/* Marcar rápido como testimonio (setea las etiquetas correctas) */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                  <button
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, tags: addTags(p.tags, ['testimonio', 'producto']) }))}
                    style={{ fontSize: 12, fontWeight: 700, padding: '6px 10px', borderRadius: 8, border: `1px solid rgba(22,163,74,0.35)`, background: 'rgba(22,163,74,0.08)', color: '#16A34A', cursor: 'pointer' }}
                  >
                    🗣️ Testimonio de producto
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, tags: addTags(p.tags, ['testimonio', 'negocio']) }))}
                    style={{ fontSize: 12, fontWeight: 700, padding: '6px 10px', borderRadius: 8, border: `1px solid rgba(183,53,184,0.35)`, background: 'rgba(183,53,184,0.08)', color: '#B735B8', cursor: 'pointer' }}
                  >
                    💼 Testimonio de negocio
                  </button>
                </div>
                <input
                  type="text"
                  value={form.tags}
                  onChange={(e) => setForm((p) => ({ ...p, tags: e.target.value }))}
                  placeholder="promo, ventas, bienvenida"
                  style={inputStyle}
                />
              </div>
            </div>

            {/* Footer */}
            <div style={modalFooterStyle}>
              <button onClick={closeModal} disabled={saving} style={secondaryBtnStyle}>
                Cancelar
              </button>
              <button
                onClick={saveAsset}
                disabled={saving}
                style={{
                  flex: 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '11px 16px',
                  borderRadius: 12,
                  fontSize: 13.5,
                  fontWeight: 800,
                  color: '#fff',
                  background: BRAND,
                  border: 'none',
                  cursor: saving ? 'default' : 'pointer',
                  opacity: saving ? 0.6 : 1,
                  boxShadow: '0 8px 20px rgba(183,53,184,0.24)',
                }}
              >
                {saving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={14} />}
                {saving ? 'Guardando…' : editingId ? 'Guardar cambios' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal eliminar ────────────────────────────────────────── */}
      {deleteTarget && (
        <div style={overlayStyle}>
          <div style={backdropStyle} onClick={() => !deleting && setDeleteTarget(null)} />
          <div style={{ ...modalCardStyle, maxWidth: 400 }}>
            <div style={{ padding: 24, textAlign: 'center' }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 16,
                  margin: '0 auto 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(220,38,38,0.08)',
                  border: '1px solid rgba(220,38,38,0.2)',
                }}
              >
                <Trash2 size={24} style={{ color: '#DC2626' }} />
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 4px' }}>Eliminar contenido</h3>
              <p style={{ fontSize: 13, color: MUTED, margin: '0 0 2px' }}>Estás a punto de eliminar</p>
              <p style={{ fontSize: 14, fontWeight: 800, margin: '0 0 16px' }}>{deleteTarget.title}</p>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 8,
                  textAlign: 'left',
                  background: 'rgba(220,38,38,0.05)',
                  border: '1px solid rgba(220,38,38,0.15)',
                  borderRadius: 12,
                  padding: '10px 12px',
                  marginBottom: 20,
                }}
              >
                <AlertTriangle size={13} style={{ color: '#DC2626', flexShrink: 0, marginTop: 1 }} />
                <p style={{ fontSize: 11.5, color: '#B91C1C', margin: 0, lineHeight: 1.5 }}>
                  Esta acción es <strong>irreversible</strong>. Se eliminará el contenido
                  {deleteTarget.url ? ' y su archivo' : ''} de la biblioteca.
                </p>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setDeleteTarget(null)} disabled={deleting} style={secondaryBtnStyle}>
                  Cancelar
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={deleting}
                  style={{
                    flex: 1,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    padding: '11px 16px',
                    borderRadius: 12,
                    fontSize: 13.5,
                    fontWeight: 800,
                    color: '#fff',
                    background: '#DC2626',
                    border: 'none',
                    cursor: deleting ? 'default' : 'pointer',
                    opacity: deleting ? 0.6 : 1,
                  }}
                >
                  {deleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={14} />}
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Tarjeta de contenido ───────────────────────────────────────────
function AssetCard({ asset, onEdit, onDelete }: { asset: Asset; onEdit: () => void; onDelete: () => void }) {
  const meta = TYPE_META[asset.type]
  const Icon = meta.icon
  const tags = toStringArray(asset.tags)

  return (
    <div style={{ ...cardStyle, padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* Preview según tipo */}
      <div style={{ position: 'relative' }}>
        {asset.type === 'IMAGE' && asset.url ? (
          <img
            src={asset.url}
            alt={asset.title}
            style={{ display: 'block', width: '100%', height: 150, objectFit: 'cover', background: '#F0F3F7' }}
          />
        ) : asset.type === 'VIDEO' && asset.url ? (
          <video
            src={asset.url}
            controls
            preload="metadata"
            style={{ display: 'block', width: '100%', height: 150, objectFit: 'cover', background: '#000' }}
          />
        ) : (
          <div
            style={{
              height: 96,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: meta.accent.tint,
            }}
          >
            <Icon size={34} style={{ color: meta.accent.color }} />
          </div>
        )}

        {/* Botón editar flotante */}
        <button
          onClick={onEdit}
          title="Editar contenido"
          style={{
            position: 'absolute',
            top: 8,
            right: 46,
            padding: 7,
            borderRadius: 9,
            background: 'rgba(255,255,255,0.92)',
            border: '1px solid rgba(35,59,143,0.2)',
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(17,24,39,0.12)',
          }}
        >
          <Pencil size={13} style={{ color: '#233B8F' }} />
        </button>

        {/* Botón eliminar flotante */}
        <button
          onClick={onDelete}
          title="Eliminar contenido"
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            padding: 7,
            borderRadius: 9,
            background: 'rgba(255,255,255,0.92)',
            border: '1px solid rgba(220,38,38,0.2)',
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(17,24,39,0.12)',
          }}
        >
          <Trash2 size={13} style={{ color: '#DC2626' }} />
        </button>
      </div>

      {/* Cuerpo */}
      <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              fontSize: 10,
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              padding: '3px 8px',
              borderRadius: 999,
              color: meta.accent.color,
              background: meta.accent.tint,
            }}
          >
            <Icon size={11} />
            {meta.label}
          </span>
          {asset.sizeBytes ? (
            <span style={{ fontSize: 10.5, color: '#9CA3AF', fontWeight: 600 }}>{formatBytes(asset.sizeBytes)}</span>
          ) : null}
        </div>

        <p
          style={{
            fontSize: 14,
            fontWeight: 800,
            margin: 0,
            lineHeight: 1.3,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {asset.title}
        </p>

        {/* Contenido específico */}
        {asset.type === 'TEXT' && asset.textContent ? (
          <p
            style={{
              fontSize: 12.5,
              color: MUTED,
              margin: 0,
              lineHeight: 1.5,
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              background: '#F8FAFC',
              borderRadius: 10,
              padding: '8px 10px',
              borderLeft: `3px solid ${meta.accent.color}`,
            }}
          >
            {asset.textContent}
          </p>
        ) : null}

        {asset.type === 'LINK' && asset.linkUrl ? (
          <a
            href={asset.linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12.5,
              fontWeight: 700,
              color: '#233B8F',
              textDecoration: 'none',
              overflow: 'hidden',
            }}
          >
            <ExternalLink size={13} style={{ flexShrink: 0 }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{asset.linkUrl}</span>
          </a>
        ) : null}

        {(asset.type === 'PDF' || asset.type === 'AUDIO') && asset.url ? (
          asset.type === 'AUDIO' ? (
            <audio src={asset.url} controls style={{ width: '100%', height: 34 }} />
          ) : (
            <a
              href={asset.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 12.5,
                fontWeight: 700,
                color: meta.accent.color,
                textDecoration: 'none',
              }}
            >
              <ExternalLink size={13} /> Abrir PDF
            </a>
          )
        ) : null}

        {/* Etiquetas */}
        {tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 'auto', paddingTop: 4 }}>
            {tags.map((tag, i) => (
              <span
                key={`${tag}-${i}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 3,
                  fontSize: 10.5,
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: 999,
                  color: '#6B7280',
                  background: '#F0F3F7',
                }}
              >
                <Tag size={9} />
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Chip de filtro ─────────────────────────────────────────────────
function FilterChip({
  active,
  onClick,
  label,
  icon: Icon,
  color,
}: {
  active: boolean
  onClick: () => void
  label: string
  icon?: LucideIcon
  color?: string
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '7px 13px',
        borderRadius: 999,
        fontSize: 12.5,
        fontWeight: 700,
        cursor: 'pointer',
        color: active ? '#fff' : '#6B7280',
        background: active ? BRAND : '#F4F6FA',
        border: active ? 'none' : `1px solid ${BORDER}`,
        boxShadow: active ? '0 6px 16px rgba(183,53,184,0.22)' : 'none',
        transition: 'all 0.12s',
      }}
    >
      {Icon ? <Icon size={13} style={{ color: active ? '#fff' : color }} /> : null}
      {label}
    </button>
  )
}

// ── Estilos reutilizables (on-brand, tema claro) ───────────────────
const inputStyle: CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 12,
  background: '#F8FAFC',
  border: `1px solid ${BORDER}`,
  fontSize: 13.5,
  color: '#111827',
  outline: 'none',
}
const labelStyle: CSSProperties = {
  display: 'block',
  fontSize: 10.5,
  fontWeight: 800,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: '#9CA3AF',
  marginBottom: 6,
}
const primaryBtnStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 7,
  padding: '9px 16px',
  borderRadius: 10,
  fontSize: 13,
  fontWeight: 800,
  color: '#fff',
  background: BRAND,
  border: 'none',
  cursor: 'pointer',
  boxShadow: '0 8px 20px rgba(183,53,184,0.24)',
}

// ── Estilos de modal compartidos ───────────────────────────────────
const overlayStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 80,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 16,
}
const backdropStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  background: 'rgba(17,24,39,0.55)',
  backdropFilter: 'blur(3px)',
}
const modalCardStyle: CSSProperties = {
  position: 'relative',
  zIndex: 10,
  width: '100%',
  maxHeight: '90vh',
  display: 'flex',
  flexDirection: 'column',
  background: '#fff',
  border: `1px solid ${BORDER}`,
  borderRadius: 18,
  boxShadow: '0 24px 60px rgba(17,24,39,0.24)',
  overflow: 'hidden',
}
const modalHeaderStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  padding: '16px 20px',
  borderBottom: `1px solid ${BORDER}`,
  flexShrink: 0,
}
const modalFooterStyle: CSSProperties = {
  display: 'flex',
  gap: 8,
  padding: '14px 20px',
  borderTop: `1px solid ${BORDER}`,
  flexShrink: 0,
}
const iconBtnStyle: CSSProperties = {
  padding: 7,
  borderRadius: 9,
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
}
const secondaryBtnStyle: CSSProperties = {
  flex: 1,
  padding: '11px 16px',
  borderRadius: 12,
  fontSize: 13.5,
  fontWeight: 700,
  color: '#6B7280',
  background: '#F4F6FA',
  border: `1px solid ${BORDER}`,
  cursor: 'pointer',
}
