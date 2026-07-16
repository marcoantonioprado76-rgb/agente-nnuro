'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  MessageSquareHeart,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  X,
  AlertTriangle,
  Bot,
  Sparkles,
  Save,
  Paperclip,
  Upload,
  Eye,
  PartyPopper,
  Image as ImageIcon,
  Video,
  Music,
  FileText,
  Link as LinkIcon,
  Type,
} from 'lucide-react'
import { PageHeader, CardGrid, cardStyle, BRAND, BORDER, MUTED, ACCENTS, type Accent } from '../_ui'

// ── Tipos ──────────────────────────────────────────────────────────
interface Agent {
  id: string
  name: string
  isActive: boolean
}

type MediaType = 'IMAGE' | 'VIDEO' | 'AUDIO' | 'PDF' | 'LINK' | 'TEXT'

interface MediaAsset {
  id: string
  type: MediaType
  title: string
  url: string | null
  linkUrl: string | null
  textContent: string | null
  mimeType: string | null
}

type WelcomeKind = 'GROUP' | 'PRIVATE'

interface WelcomeTemplate {
  id: string
  agentId: string
  name: string
  body: string
  mediaAssetId: string | null
  mediaAssetIds: string[]
  kind: WelcomeKind
  isActive: boolean
  createdAt: string
  updatedAt: string
}

interface WelcomeForm {
  name: string
  body: string
  mediaAssetIds: string[]
  kind: WelcomeKind
  isActive: boolean
}

const EMPTY_FORM: WelcomeForm = {
  name: '',
  body: '',
  mediaAssetIds: [],
  kind: 'GROUP',
  isActive: true,
}

/** Une el adjunto legacy (una imagen) con la lista nueva, sin duplicar. */
function mergeAssetIds(item: { mediaAssetId: string | null; mediaAssetIds?: string[] }): string[] {
  const list = [
    ...(item.mediaAssetId ? [item.mediaAssetId] : []),
    ...(item.mediaAssetIds ?? []),
  ]
  return list.filter((v, i, arr) => v && arr.indexOf(v) === i)
}

// ── Metadatos por tipo de adjunto (ícono + etiqueta + acento) ──────
const TYPE_META: Record<MediaType, { label: string; icon: LucideIcon; accent: Accent }> = {
  IMAGE: { label: 'Imagen', icon: ImageIcon, accent: ACCENTS[0] },
  VIDEO: { label: 'Video', icon: Video, accent: ACCENTS[1] },
  AUDIO: { label: 'Audio', icon: Music, accent: ACCENTS[2] },
  PDF: { label: 'PDF', icon: FileText, accent: ACCENTS[3] },
  LINK: { label: 'Enlace', icon: LinkIcon, accent: ACCENTS[2] },
  TEXT: { label: 'Texto', icon: Type, accent: ACCENTS[1] },
}

// ── Variables disponibles + valores de ejemplo para la vista previa ─
interface WelcomeVariable {
  token: string
  label: string
  sample: string
}

function todaySample(): string {
  try {
    return new Date().toLocaleDateString('es-BO', { day: '2-digit', month: 'long', year: 'numeric' })
  } catch {
    return new Date().toISOString().slice(0, 10)
  }
}

const VARIABLES: WelcomeVariable[] = [
  { token: '{{nombre}}', label: 'Nombre', sample: 'Juan' },
  { token: '{{grupo}}', label: 'Grupo', sample: 'Equipo Diamante' },
  { token: '{{ciudad}}', label: 'Ciudad', sample: 'La Paz' },
  { token: '{{sponsor}}', label: 'Sponsor', sample: 'María' },
  { token: '{{fecha}}', label: 'Fecha', sample: todaySample() },
  { token: '{{link_reto}}', label: 'Link reto', sample: 'https://agentenuro.com/reto-90d' },
  { token: '{{nombre_lider}}', label: 'Líder', sample: 'Marco' },
]

/** Reemplaza las variables por sus valores de ejemplo para la vista previa. */
function renderPreview(body: string): string {
  let out = body
  for (const v of VARIABLES) out = out.split(v.token).join(v.sample)
  return out
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

export default function DiamondAssistantBienvenidas() {
  // Agentes
  const [agents, setAgents] = useState<Agent[]>([])
  const [loadingAgents, setLoadingAgents] = useState(true)
  const [agentsError, setAgentsError] = useState<string | null>(null)
  const [selectedAgentId, setSelectedAgentId] = useState<string>('')

  // Biblioteca de contenidos (para el selector de adjunto)
  const [media, setMedia] = useState<MediaAsset[]>([])

  // Plantillas del agente seleccionado
  const [items, setItems] = useState<WelcomeTemplate[]>([])
  const [loadingItems, setLoadingItems] = useState(false)
  const [itemsError, setItemsError] = useState<string | null>(null)

  // Modal crear/editar
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<WelcomeForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [uploadingDevice, setUploadingDevice] = useState(false)
  const bodyRef = useRef<HTMLTextAreaElement>(null)
  const deviceFileRef = useRef<HTMLInputElement>(null)

  // Modal eliminar
  const [deleteTarget, setDeleteTarget] = useState<WelcomeTemplate | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Toggle activo por plantilla (id que se está actualizando)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  // Pestaña activa: bienvenida al grupo o al privado (1:1).
  const [activeKind, setActiveKind] = useState<WelcomeKind>('GROUP')
  const visibleItems = useMemo(
    () => items.filter((it) => (it.kind ?? 'GROUP') === activeKind),
    [items, activeKind],
  )

  const selectedAgent = useMemo(
    () => agents.find((a) => a.id === selectedAgentId) ?? null,
    [agents, selectedAgentId],
  )

  // Índice id -> asset para pintar el adjunto en tarjetas y modal.
  const mediaById = useMemo(() => {
    const map = new Map<string, MediaAsset>()
    for (const m of media) map.set(m.id, m)
    return map
  }, [media])

  // ── Cargar agentes ───────────────────────────────────────────────
  const fetchAgents = useCallback(async () => {
    setLoadingAgents(true)
    setAgentsError(null)
    try {
      const res = await fetch('/api/admin/diamond-assistant/agents')
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.ok) {
        setAgentsError(data.error ?? 'No se pudieron cargar los agentes.')
        setAgents([])
        return
      }
      const list: Agent[] = data.data ?? data.agents ?? []
      setAgents(list)
      setSelectedAgentId((prev) => prev || list[0]?.id || '')
    } catch {
      setAgentsError('Error de conexión al cargar los agentes.')
      setAgents([])
    } finally {
      setLoadingAgents(false)
    }
  }, [])

  useEffect(() => {
    fetchAgents()
  }, [fetchAgents])

  // ── Cargar la Biblioteca (recursos disponibles para adjuntar) ─────
  const fetchMedia = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/diamond-assistant/media')
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.ok) setMedia(data.data ?? [])
    } catch {
      // El adjunto es opcional: si falla la Biblioteca, la pantalla sigue usable.
    }
  }, [])

  useEffect(() => {
    fetchMedia()
  }, [fetchMedia])

  // ── Cargar plantillas del agente seleccionado ────────────────────
  const fetchItems = useCallback(async (agentId: string) => {
    setLoadingItems(true)
    setItemsError(null)
    try {
      const res = await fetch(
        `/api/admin/diamond-assistant/welcome-templates?agentId=${encodeURIComponent(agentId)}`,
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.ok) {
        setItemsError(data.error ?? 'No se pudieron cargar las plantillas.')
        setItems([])
        return
      }
      setItems(data.data ?? [])
    } catch {
      setItemsError('Error de conexión al cargar las plantillas.')
      setItems([])
    } finally {
      setLoadingItems(false)
    }
  }, [])

  useEffect(() => {
    if (selectedAgentId) fetchItems(selectedAgentId)
    else setItems([])
  }, [selectedAgentId, fetchItems])

  // ── Acciones ─────────────────────────────────────────────────────
  function openCreate() {
    setEditingId(null)
    setForm({ ...EMPTY_FORM, kind: activeKind })
    setFormError(null)
    setModalOpen(true)
  }

  function openEdit(item: WelcomeTemplate) {
    setEditingId(item.id)
    setForm({
      name: item.name,
      body: item.body,
      mediaAssetIds: mergeAssetIds(item),
      kind: item.kind ?? 'GROUP',
      isActive: item.isActive,
    })
    setFormError(null)
    setModalOpen(true)
  }

  function closeModal() {
    if (saving) return
    setModalOpen(false)
  }

  // Inserta la variable en la posición del cursor del textarea.
  function insertVariable(token: string) {
    const el = bodyRef.current
    if (!el) {
      setForm((p) => ({ ...p, body: p.body + token }))
      return
    }
    const start = el.selectionStart ?? el.value.length
    const end = el.selectionEnd ?? el.value.length
    const next = el.value.slice(0, start) + token + el.value.slice(end)
    setForm((p) => ({ ...p, body: next }))
    // Reposicionamos el cursor justo después del token insertado.
    requestAnimationFrame(() => {
      el.focus()
      const pos = start + token.length
      el.setSelectionRange(pos, pos)
    })
  }

  async function saveItem() {
    if (!selectedAgentId) {
      setFormError('Selecciona un agente primero.')
      return
    }
    if (!form.name.trim()) {
      setFormError('El nombre es obligatorio.')
      return
    }
    if (!form.body.trim()) {
      setFormError('El cuerpo del mensaje es obligatorio.')
      return
    }
    setSaving(true)
    setFormError(null)

    try {
      const url = editingId
        ? `/api/admin/diamond-assistant/welcome-templates/${editingId}`
        : '/api/admin/diamond-assistant/welcome-templates'
      const payload: Record<string, unknown> = editingId
        ? {
            name: form.name.trim(),
            body: form.body.trim(),
            // Guardamos TODO en la lista nueva y limpiamos el legacy (null) para no duplicar.
            mediaAssetIds: form.mediaAssetIds,
            mediaAssetId: null,
            kind: form.kind,
            isActive: form.isActive,
          }
        : {
            agentId: selectedAgentId,
            name: form.name.trim(),
            body: form.body.trim(),
            isActive: form.isActive,
            mediaAssetIds: form.mediaAssetIds,
            kind: form.kind,
          }

      const res = await fetch(url, {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.ok) {
        setFormError(data.error ?? 'No se pudo guardar la plantilla.')
        return
      }
      setModalOpen(false)
      await fetchItems(selectedAgentId)
    } catch {
      setFormError('Error de conexión al guardar.')
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(item: WelcomeTemplate) {
    setTogglingId(item.id)
    // Optimista: reflejamos el cambio y revertimos si falla.
    setItems((prev) =>
      prev.map((it) => (it.id === item.id ? { ...it, isActive: !it.isActive } : it)),
    )
    try {
      const res = await fetch(`/api/admin/diamond-assistant/welcome-templates/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !item.isActive }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.ok) {
        setItems((prev) =>
          prev.map((it) => (it.id === item.id ? { ...it, isActive: item.isActive } : it)),
        )
      }
    } catch {
      setItems((prev) =>
        prev.map((it) => (it.id === item.id ? { ...it, isActive: item.isActive } : it)),
      )
    } finally {
      setTogglingId(null)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/diamond-assistant/welcome-templates/${deleteTarget.id}`, {
        method: 'DELETE',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.ok) {
        alert(data.error ?? 'No se pudo eliminar la plantilla.')
        return
      }
      setDeleteTarget(null)
      if (selectedAgentId) await fetchItems(selectedAgentId)
    } catch {
      alert('Error de conexión al eliminar.')
    } finally {
      setDeleting(false)
    }
  }

  // ── Render ───────────────────────────────────────────────────────
  const hasAgents = agents.length > 0
  // Adjuntos elegidos (en orden). Cada uno resuelve a su asset (o null si se borró).
  const selectedAssets = form.mediaAssetIds.map((id) => ({ id, asset: mediaById.get(id) ?? null }))
  // Recursos aún NO elegidos (para el selector de "agregar").
  const availableMedia = media.filter((m) => !form.mediaAssetIds.includes(m.id))
  const preview = renderPreview(form.body)

  // Helpers para el selector de varias imágenes.
  const addAsset = (id: string) => {
    if (!id) return
    setForm((p) => (p.mediaAssetIds.includes(id) ? p : { ...p, mediaAssetIds: [...p.mediaAssetIds, id] }))
  }
  const removeAsset = (id: string) => {
    setForm((p) => ({ ...p, mediaAssetIds: p.mediaAssetIds.filter((x) => x !== id) }))
  }

  // Subir un archivo DESDE EL DISPOSITIVO → lo guarda en la Biblioteca y lo adjunta.
  async function uploadDeviceMedia(file: File) {
    const isVideo = file.type.startsWith('video/')
    const isImage = file.type.startsWith('image/')
    if (!isImage && !isVideo) { setFormError('Solo se pueden subir imágenes o videos.'); return }
    setUploadingDevice(true)
    setFormError(null)
    try {
      const fd = new FormData()
      fd.append('type', isVideo ? 'VIDEO' : 'IMAGE')
      fd.append('title', file.name.replace(/\.[^.]+$/, '').slice(0, 80) || 'Adjunto')
      fd.append('file', file)
      const res = await fetch('/api/admin/diamond-assistant/media', { method: 'POST', body: fd })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.ok) { setFormError(data.error ?? 'No se pudo subir el archivo.'); return }
      const asset = data.data as MediaAsset
      setMedia((prev) => [asset, ...prev])
      addAsset(asset.id)
    } catch {
      setFormError('Error al subir el archivo.')
    } finally {
      setUploadingDevice(false)
    }
  }

  return (
    <div>
      <PageHeader
        icon={MessageSquareHeart}
        title="Bienvenidas"
        description="Plantillas que el agente envía a los nuevos miembros de un grupo"
        action={
          hasAgents && selectedAgentId ? (
            <button onClick={openCreate} style={primaryBtnStyle}>
              <Plus size={15} /> Nueva plantilla
            </button>
          ) : undefined
        }
      />

      {/* ── Carga de agentes ────────────────────────────────────────── */}
      {loadingAgents ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '64px 0' }}>
          <Loader2 size={24} className="animate-spin" style={{ color: '#147e95' }} />
        </div>
      ) : agentsError ? (
        <ErrorBox message={agentsError} />
      ) : !hasAgents ? (
        // Sin agentes: guiar a crear uno primero.
        <div style={{ ...cardStyle, textAlign: 'center', padding: '48px 24px' }}>
          <div style={emptyIconWrap('rgba(0,229,208,0.10)')}>
            <Bot size={26} style={{ color: '#147e95' }} />
          </div>
          <p style={{ fontSize: 15, fontWeight: 800, margin: 0 }}>Aún no hay agentes</p>
          <p style={{ fontSize: 13, color: MUTED, margin: '6px 0 0', lineHeight: 1.55, maxWidth: 420, marginInline: 'auto' }}>
            Las plantillas de bienvenida se asocian a un agente. Crea primero un agente en la pestaña{' '}
            <strong>Agentes</strong> y luego vuelve aquí para redactar sus bienvenidas.
          </p>
        </div>
      ) : (
        <>
          {/* ── Selector de agente ────────────────────────────────────── */}
          <div style={{ ...cardStyle, marginBottom: 18, padding: 16 }}>
            <label style={labelStyle}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Bot size={12} style={{ color: '#147e95' }} /> Agente
              </span>
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <select
                value={selectedAgentId}
                onChange={(e) => setSelectedAgentId(e.target.value)}
                style={{ ...inputStyle, cursor: 'pointer', maxWidth: 360 }}
              >
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                    {a.isActive ? '' : ' (inactivo)'}
                  </option>
                ))}
              </select>
              {selectedAgent && (
                <span style={{ fontSize: 12, color: MUTED }}>
                  {visibleItems.length} {visibleItems.length === 1 ? 'plantilla' : 'plantillas'}
                </span>
              )}
            </div>
          </div>

          {/* ── Pestañas: bienvenida al grupo / al privado ────────────── */}
          {selectedAgent && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              {([
                { k: 'GROUP' as WelcomeKind, label: '👋 Al grupo' },
                { k: 'PRIVATE' as WelcomeKind, label: '💬 Al privado (1:1)' },
              ]).map((t) => {
                const on = activeKind === t.k
                return (
                  <button
                    key={t.k}
                    onClick={() => setActiveKind(t.k)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: 10,
                      fontSize: 13,
                      fontWeight: 800,
                      cursor: 'pointer',
                      color: on ? '#fff' : MUTED,
                      background: on ? BRAND : '#F4F6FA',
                      border: on ? 'none' : `1px solid ${BORDER}`,
                    }}
                  >
                    {t.label}
                  </button>
                )
              })}
            </div>
          )}
          {selectedAgent && activeKind === 'PRIVATE' && (
            <p style={{ fontSize: 12, color: MUTED, margin: '0 0 12px', lineHeight: 1.5 }}>
              Estos mensajes se envían al <strong>privado (1:1)</strong> de quien entra al grupo, presentándote.
              Actívalo por grupo en <strong>Grupos → Bienvenida al privado</strong>. Se envía con retraso y pausas
              para cuidar el número.
            </p>
          )}

          {/* ── Lista de plantillas ───────────────────────────────────── */}
          {loadingItems ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
              <Loader2 size={22} className="animate-spin" style={{ color: '#147e95' }} />
            </div>
          ) : itemsError ? (
            <ErrorBox message={itemsError} />
          ) : visibleItems.length === 0 ? (
            <div style={{ ...cardStyle, textAlign: 'center', padding: '48px 24px' }}>
              <div style={emptyIconWrap('rgba(0,229,208,0.10)')}>
                <PartyPopper size={26} style={{ color: '#1fb8bb' }} />
              </div>
              <p style={{ fontSize: 15, fontWeight: 800, margin: 0 }}>
                {activeKind === 'PRIVATE' ? 'Sin bienvenidas al privado todavía' : 'Este agente aún no tiene bienvenidas'}
              </p>
              <p style={{ fontSize: 13, color: MUTED, margin: '6px 0 16px', lineHeight: 1.55, maxWidth: 460, marginInline: 'auto' }}>
                Crea una plantilla con variables como <code style={codeChip}>{'{{nombre}}'}</code> o{' '}
                <code style={codeChip}>{'{{grupo}}'}</code> para saludar automáticamente a cada nuevo miembro.
              </p>
              <button onClick={openCreate} style={{ ...primaryBtnStyle, padding: '9px 18px' }}>
                <Plus size={15} /> Nueva plantilla
              </button>
            </div>
          ) : (
            <CardGrid min={300}>
              {visibleItems.map((item) => {
                const assetIds = mergeAssetIds(item)
                const isToggling = togglingId === item.id
                return (
                  <div key={item.id} style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: 11 }}>
                    {/* Encabezado */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <p style={cardTitleStyle}>{item.name}</p>
                      </div>
                      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                        <button onClick={() => openEdit(item)} title="Editar" style={editBtnStyle}>
                          <Pencil size={13} style={{ color: '#233B8F' }} />
                        </button>
                        <button onClick={() => setDeleteTarget(item)} title="Eliminar" style={deleteBtnStyle}>
                          <Trash2 size={13} style={{ color: '#DC2626' }} />
                        </button>
                      </div>
                    </div>

                    {/* Extracto del cuerpo */}
                    <p style={cardBodyStyle}>{item.body}</p>

                    {/* Adjuntos (si tiene) */}
                    {assetIds.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {assetIds.map((id) => (
                          <AttachmentChip key={id} asset={mediaById.get(id) ?? null} />
                        ))}
                      </div>
                    )}

                    {/* Toggle activo */}
                    <div style={cardFooterStyle}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: item.isActive ? '#16A34A' : '#9CA3AF' }}>
                        {item.isActive ? 'Activa' : 'Inactiva'}
                      </span>
                      <Toggle on={item.isActive} disabled={isToggling} onClick={() => toggleActive(item)} />
                    </div>
                  </div>
                )
              })}
            </CardGrid>
          )}
        </>
      )}

      {/* ── Modal crear / editar ─────────────────────────────────────── */}
      {modalOpen && (
        <div style={overlayStyle}>
          <div style={backdropStyle} onClick={closeModal} />
          <div style={{ ...modalCardStyle, maxWidth: 720 }}>
            {/* Header */}
            <div style={modalHeaderStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <div style={modalIconStyle}>
                  <MessageSquareHeart size={17} className="text-white" />
                </div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 800, margin: 0 }}>
                    {editingId ? 'Editar plantilla' : 'Nueva plantilla de bienvenida'}
                  </p>
                  <p style={{ fontSize: 11, color: MUTED, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {selectedAgent ? `Para ${selectedAgent.name}` : 'Mensaje para nuevos miembros'}
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
                <div style={formErrorStyle}>
                  <AlertTriangle size={14} style={{ color: '#DC2626', flexShrink: 0, marginTop: 1 }} />
                  <p style={{ fontSize: 12, color: '#DC2626', margin: 0, lineHeight: 1.4 }}>{formError}</p>
                </div>
              )}

              {/* Nombre */}
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Nombre de la plantilla</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Ej. Bienvenida cálida al grupo"
                  style={inputStyle}
                />
              </div>

              {/* Cuerpo del mensaje + chips de variables */}
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>
                  Cuerpo del mensaje{' '}
                  <span style={{ textTransform: 'none', fontWeight: 600, color: '#B0B7C3' }}>
                    · usa las variables para personalizar
                  </span>
                </label>

                {/* Chips: insertan la variable en la posición del cursor */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                  {VARIABLES.map((v) => (
                    <button
                      key={v.token}
                      type="button"
                      onClick={() => insertVariable(v.token)}
                      title={`Insertar ${v.token}`}
                      style={chipStyle}
                    >
                      <Plus size={11} style={{ opacity: 0.7 }} />
                      {v.label}
                    </button>
                  ))}
                </div>

                <textarea
                  ref={bodyRef}
                  value={form.body}
                  onChange={(e) => setForm((p) => ({ ...p, body: e.target.value }))}
                  placeholder={'¡Hola {{nombre}}! 🎉 Bienvenido/a a {{grupo}}.\nSoy {{nombre_lider}} y estoy feliz de tenerte con nosotros.\nAquí está el reto: {{link_reto}}'}
                  rows={7}
                  style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.55, fontFamily: 'inherit', minHeight: 150 }}
                />
              </div>

              {/* Vista previa en vivo */}
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <Eye size={12} style={{ color: '#147e95' }} /> Vista previa
                    <span style={{ textTransform: 'none', fontWeight: 600, color: '#B0B7C3' }}>· con datos de ejemplo</span>
                  </span>
                </label>
                <div style={previewWrapStyle}>
                  {form.body.trim() ? (
                    <div style={previewBubbleStyle}>{preview}</div>
                  ) : (
                    <p style={{ fontSize: 12.5, color: '#9CA3AF', margin: 0, fontStyle: 'italic' }}>
                      Escribe el mensaje arriba para ver cómo le llegará al nuevo miembro.
                    </p>
                  )}
                  {selectedAssets.length > 0 && (
                    <div style={{ marginTop: form.body.trim() ? 8 : 0, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {selectedAssets.map(({ id, asset }) => (
                        <AttachmentChip key={id} asset={asset} />
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Adjuntos: VARIAS imágenes/recursos de la Biblioteca */}
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <Paperclip size={12} style={{ color: '#233B8F' }} /> Adjuntos
                    <span style={{ textTransform: 'none', fontWeight: 600, color: '#B0B7C3' }}>· podés agregar varias imágenes</span>
                  </span>
                </label>

                {/* Imágenes/recursos ya elegidos (con botón para quitar) */}
                {selectedAssets.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                    {selectedAssets.map(({ id, asset }) => (
                      <span
                        key={id}
                        style={{
                          ...attachChipStyle,
                          color: asset ? TYPE_META[asset.type].accent.color : MUTED,
                          background: asset ? TYPE_META[asset.type].accent.tint : '#F0F3F7',
                          paddingRight: 4,
                        }}
                      >
                        {asset ? (
                          <>
                            {(() => { const Icon = TYPE_META[asset.type].icon; return <Icon size={11} /> })()}
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>
                              {asset.title}
                            </span>
                          </>
                        ) : (
                          <><Paperclip size={11} /> Adjunto no disponible</>
                        )}
                        <button
                          type="button"
                          onClick={() => removeAsset(id)}
                          title="Quitar"
                          style={{ border: 'none', background: 'transparent', cursor: 'pointer', display: 'inline-flex', padding: 2, color: 'inherit', opacity: 0.7 }}
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Selector para AGREGAR un recurso (se vacía tras elegir) */}
                <select
                  value=""
                  onChange={(e) => { addAsset(e.target.value); e.currentTarget.value = '' }}
                  style={{ ...inputStyle, cursor: 'pointer' }}
                  disabled={availableMedia.length === 0}
                >
                  <option value="">
                    {selectedAssets.length > 0 ? '+ Agregar otra imagen…' : 'Elegí una imagen…'}
                  </option>
                  {availableMedia.map((m) => (
                    <option key={m.id} value={m.id}>
                      {TYPE_META[m.type].label} — {m.title}
                    </option>
                  ))}
                </select>

                {/* Subir desde el dispositivo (además de elegir de la Biblioteca) */}
                <button
                  type="button"
                  onClick={() => deviceFileRef.current?.click()}
                  disabled={uploadingDevice}
                  style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 14px', borderRadius: 10, fontSize: 12.5, fontWeight: 700, color: '#233B8F', background: 'rgba(35,59,143,0.07)', border: '1px solid rgba(35,59,143,0.2)', cursor: uploadingDevice ? 'default' : 'pointer', opacity: uploadingDevice ? 0.6 : 1 }}
                >
                  {uploadingDevice ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                  {uploadingDevice ? 'Subiendo…' : 'Subir desde mi dispositivo'}
                </button>
                <input
                  ref={deviceFileRef}
                  type="file"
                  accept="image/*,video/*"
                  style={{ display: 'none' }}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadDeviceMedia(f); e.currentTarget.value = '' }}
                />

                {media.length === 0 ? (
                  <p style={{ fontSize: 11, color: MUTED, margin: '6px 0 0' }}>
                    Aún no hay recursos en la Biblioteca. Súbelos en la pestaña <strong>Biblioteca</strong> para poder adjuntarlos.
                  </p>
                ) : (
                  <p style={{ fontSize: 11, color: MUTED, margin: '6px 0 0' }}>
                    Se enviarán en el mismo orden en que las agregás, junto con el mensaje de bienvenida.
                  </p>
                )}
              </div>

              {/* Activo (toggle) */}
              <div style={activeRowStyle}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>Plantilla activa</p>
                  <p style={{ fontSize: 11, color: MUTED, margin: 0 }}>Si está inactiva, el agente no la usa para dar la bienvenida.</p>
                </div>
                <Toggle on={form.isActive} onClick={() => setForm((p) => ({ ...p, isActive: !p.isActive }))} />
              </div>
            </div>

            {/* Footer */}
            <div style={modalFooterStyle}>
              <button onClick={closeModal} disabled={saving} style={secondaryBtnStyle}>
                Cancelar
              </button>
              <button onClick={saveItem} disabled={saving} style={{ ...primaryBtnStyle, flex: 1, justifyContent: 'center', padding: '11px 16px', borderRadius: 12, fontSize: 13.5, opacity: saving ? 0.6 : 1, cursor: saving ? 'default' : 'pointer' }}>
                {saving ? <Loader2 size={15} className="animate-spin" /> : editingId ? <Save size={14} /> : <Sparkles size={14} />}
                {editingId ? 'Guardar cambios' : 'Crear plantilla'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal eliminar ───────────────────────────────────────────── */}
      {deleteTarget && (
        <div style={overlayStyle}>
          <div style={backdropStyle} onClick={() => !deleting && setDeleteTarget(null)} />
          <div style={{ ...modalCardStyle, maxWidth: 400 }}>
            <div style={{ padding: 24, textAlign: 'center' }}>
              <div style={{ ...emptyIconWrap('rgba(220,38,38,0.08)'), border: '1px solid rgba(220,38,38,0.2)' }}>
                <AlertTriangle size={26} style={{ color: '#DC2626' }} />
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 4px' }}>Eliminar plantilla</h3>
              <p style={{ fontSize: 13, color: MUTED, margin: '0 0 2px' }}>Estás a punto de eliminar</p>
              <p style={{ fontSize: 14, fontWeight: 800, margin: '0 0 16px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {deleteTarget.name}
              </p>

              <div style={dangerNoteStyle}>
                <AlertTriangle size={13} style={{ color: '#DC2626', flexShrink: 0, marginTop: 1 }} />
                <p style={{ fontSize: 11.5, color: '#B91C1C', margin: 0, lineHeight: 1.5 }}>
                  Esta acción es <strong>irreversible</strong>. El agente dejará de contar con esta bienvenida.
                </p>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setDeleteTarget(null)} disabled={deleting} style={secondaryBtnStyle}>
                  Cancelar
                </button>
                <button onClick={confirmDelete} disabled={deleting} style={dangerBtnStyle}>
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

// ── Chip de adjunto (ícono + tipo + título) ────────────────────────
function AttachmentChip({ asset }: { asset: MediaAsset | null }) {
  if (!asset) {
    // El recurso ya no está en la Biblioteca (borrado): avisamos con estilo neutro.
    return (
      <span style={{ ...attachChipStyle, color: MUTED, background: '#F0F3F7' }}>
        <Paperclip size={11} /> Adjunto no disponible
      </span>
    )
  }
  const meta = TYPE_META[asset.type]
  const Icon = meta.icon
  return (
    <span style={{ ...attachChipStyle, color: meta.accent.color, background: meta.accent.tint }}>
      <Icon size={11} />
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>
        {asset.title}
      </span>
    </span>
  )
}

// ── Interruptor on/off reutilizable ────────────────────────────────
function Toggle({ on, disabled, onClick }: { on: boolean; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label="Alternar activo"
      style={{
        position: 'relative',
        width: 44,
        height: 24,
        borderRadius: 999,
        border: 'none',
        cursor: disabled ? 'default' : 'pointer',
        flexShrink: 0,
        opacity: disabled ? 0.6 : 1,
        background: on ? '#16A34A' : '#D1D5DB',
        transition: 'background 0.15s',
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 3,
          left: on ? 23 : 3,
          width: 18,
          height: 18,
          borderRadius: 999,
          background: '#fff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          transition: 'left 0.15s',
        }}
      />
    </button>
  )
}

// ── Bloque de error reutilizable ───────────────────────────────────
function ErrorBox({ message }: { message: string }) {
  return (
    <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: 10, borderColor: 'rgba(220,38,38,0.25)', background: 'rgba(220,38,38,0.04)' }}>
      <AlertTriangle size={16} style={{ color: '#DC2626' }} />
      <p style={{ fontSize: 13, color: '#DC2626', margin: 0 }}>{message}</p>
    </div>
  )
}

// ── Estilos ────────────────────────────────────────────────────────
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
  boxShadow: '0 8px 20px rgba(0,229,208,0.24)',
}
const codeChip: CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  color: '#147e95',
  background: 'rgba(0,229,208,0.10)',
  padding: '1px 6px',
  borderRadius: 6,
}
const chipStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  padding: '5px 10px',
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 700,
  color: '#233B8F',
  background: 'rgba(35,59,143,0.07)',
  border: '1px solid rgba(35,59,143,0.15)',
  cursor: 'pointer',
}
const attachChipStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 5,
  fontSize: 11,
  fontWeight: 800,
  padding: '4px 10px',
  borderRadius: 999,
  maxWidth: '100%',
}
const cardTitleStyle: CSSProperties = {
  fontSize: 14.5,
  fontWeight: 800,
  margin: 0,
  lineHeight: 1.25,
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
}
const cardBodyStyle: CSSProperties = {
  fontSize: 12.5,
  color: MUTED,
  margin: 0,
  lineHeight: 1.55,
  display: '-webkit-box',
  WebkitLineClamp: 4,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
  whiteSpace: 'pre-wrap',
}
const cardFooterStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 10,
  marginTop: 'auto',
  paddingTop: 10,
  borderTop: `1px solid ${BORDER}`,
}
const editBtnStyle: CSSProperties = {
  padding: 7,
  borderRadius: 9,
  background: '#F4F6FA',
  border: `1px solid ${BORDER}`,
  cursor: 'pointer',
}
const deleteBtnStyle: CSSProperties = {
  padding: 7,
  borderRadius: 9,
  background: 'rgba(220,38,38,0.06)',
  border: '1px solid rgba(220,38,38,0.2)',
  cursor: 'pointer',
}
const previewWrapStyle: CSSProperties = {
  background: 'linear-gradient(135deg, rgba(0,229,208,0.05), rgba(35,59,143,0.05))',
  border: `1px solid ${BORDER}`,
  borderRadius: 12,
  padding: 14,
}
const previewBubbleStyle: CSSProperties = {
  background: '#fff',
  border: `1px solid ${BORDER}`,
  borderRadius: 12,
  borderTopLeftRadius: 4,
  padding: '10px 13px',
  fontSize: 13,
  color: '#111827',
  lineHeight: 1.55,
  whiteSpace: 'pre-wrap',
  boxShadow: '0 1px 2px rgba(17,24,39,0.05)',
}
const activeRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  padding: '11px 14px',
  borderRadius: 12,
  background: '#F8FAFC',
  border: `1px solid ${BORDER}`,
}
const formErrorStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 8,
  background: 'rgba(220,38,38,0.06)',
  border: '1px solid rgba(220,38,38,0.2)',
  borderRadius: 12,
  padding: '10px 12px',
  marginBottom: 16,
}
const dangerNoteStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 8,
  textAlign: 'left',
  background: 'rgba(220,38,38,0.05)',
  border: '1px solid rgba(220,38,38,0.15)',
  borderRadius: 12,
  padding: '10px 12px',
  marginBottom: 20,
}
const dangerBtnStyle: CSSProperties = {
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
  cursor: 'pointer',
}
function emptyIconWrap(bg: string): CSSProperties {
  return {
    width: 56,
    height: 56,
    borderRadius: 16,
    margin: '0 auto 14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: bg,
  }
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
const modalIconStyle: CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: 11,
  background: BRAND,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
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
