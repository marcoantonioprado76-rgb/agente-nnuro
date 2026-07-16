'use client'

/**
 * Diamond Assistant — Campañas (FASE 4)
 * Envíos programados con aprobación previa. Toda campaña nace PENDIENTE DE
 * APROBACIÓN; solo tras aprobarla puede ejecutarse. El envío es SIMULADO: llama
 * al stub de WhatsApp y deja cada mensaje registrado en el Historial. El envío
 * real por WhatsApp se activa en la fase de integración (Fase 5).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import {
  Megaphone,
  Plus,
  Send,
  X,
  Pencil,
  Trash2,
  Loader2,
  AlertTriangle,
  ShieldCheck,
  Users,
  Filter as FilterIcon,
  Paperclip,
  Search,
  Check,
  CalendarClock,
  Info,
  Gauge,
  Sparkles,
} from 'lucide-react'
import { PageHeader, BRAND, BORDER, TEXT, MUTED } from '../_ui'

// ── Tipos ──────────────────────────────────────────────────────────
type CampaignStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'SCHEDULED'
  | 'SENDING'
  | 'SENT'
  | 'FAILED'
  | 'CANCELLED'

type TargetType = 'CONTACT' | 'SEGMENT' | 'MANUAL'
type MediaKind = 'IMAGE' | 'VIDEO' | 'AUDIO' | 'PDF' | 'LINK' | 'TEXT'
type ContactStatus = 'ACTIVE' | 'INACTIVE' | 'BLOCKED'

interface CampaignRow {
  id: string
  agentId: string
  name: string
  messageBody: string
  mediaAssetId: string | null
  targetType: TargetType
  targetJson: unknown
  status: CampaignStatus
  scheduledAt: string | null
  recurring: boolean
  recurrenceJson: unknown
  throttleMs: number
  totalTargets: number
  sentCount: number
  failedCount: number
  approvedBy: string | null
  approvedAt: string | null
  createdAt: string
  updatedAt: string
  agent?: { name: string } | null
  mediaTitle?: string | null
  mediaType?: MediaKind | null
}

interface AgentOption {
  id: string
  name: string
  isActive?: boolean
}

interface MediaOption {
  id: string
  title: string
  type: MediaKind
}

interface ContactOption {
  id: string
  name: string | null
  phone: string
  tag: string | null
  status: ContactStatus
}

interface BuilderForm {
  agentId: string
  name: string
  messageBody: string
  mediaAssetId: string
  targetType: TargetType
  segTag: string
  segStatus: '' | ContactStatus
  manualPhones: string
  scheduledAt: string
  recurring: boolean
  repeat: 'DAILY' | 'WEEKLY' | 'WEEKDAYS'
  weekdays: number[]
  repeatUntil: string
  throttleMs: number
  useTemplate: boolean   // enviar con plantilla aprobada (para fuera de 24h)
  templateName: string   // nombre de la plantilla YCloud elegida
}

const EMPTY_FORM: BuilderForm = {
  agentId: '',
  name: '',
  messageBody: '',
  mediaAssetId: '',
  targetType: 'SEGMENT',
  segTag: '',
  segStatus: '',
  manualPhones: '',
  scheduledAt: '',
  recurring: false,
  repeat: 'WEEKLY',
  weekdays: [],
  repeatUntil: '',
  throttleMs: 1000,
  useTemplate: false,
  templateName: '',
}

// Plantilla aprobada de YCloud (para el selector).
interface TemplateOption {
  name: string
  language: string
  category: string
  body: string
  params: string[]
}

// Días de la semana: índice 0=Dom … 6=Sáb. Chips en orden Lun→Dom.
const DAY_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0]

// ── Metadatos de estado / destino / media ──────────────────────────
const STATUS_META: Record<
  CampaignStatus,
  { label: string; color: string; bg: string; border: string }
> = {
  DRAFT: { label: 'Borrador', color: '#6B7280', bg: 'rgba(107,114,128,0.10)', border: 'rgba(107,114,128,0.22)' },
  PENDING_APPROVAL: { label: 'Pendiente de aprobación', color: '#B45309', bg: 'rgba(245,158,11,0.13)', border: 'rgba(245,158,11,0.32)' },
  SCHEDULED: { label: 'Aprobada · lista para enviar', color: '#233B8F', bg: 'rgba(35,59,143,0.10)', border: 'rgba(35,59,143,0.24)' },
  SENDING: { label: 'Enviando…', color: '#147e95', bg: 'rgba(183,53,184,0.10)', border: 'rgba(183,53,184,0.24)' },
  SENT: { label: 'Enviada', color: '#16A34A', bg: 'rgba(22,163,74,0.10)', border: 'rgba(22,163,74,0.25)' },
  FAILED: { label: 'Fallida', color: '#DC2626', bg: 'rgba(220,38,38,0.10)', border: 'rgba(220,38,38,0.25)' },
  CANCELLED: { label: 'Cancelada', color: '#6B7280', bg: 'rgba(107,114,128,0.10)', border: 'rgba(107,114,128,0.22)' },
}

const TARGET_LABEL: Record<TargetType, string> = {
  CONTACT: 'Contactos elegidos',
  SEGMENT: 'Segmento',
  MANUAL: 'Números manuales',
}

const MEDIA_LABEL: Record<MediaKind, string> = {
  IMAGE: 'Imagen',
  VIDEO: 'Video',
  AUDIO: 'Audio',
  PDF: 'PDF',
  LINK: 'Enlace',
  TEXT: 'Texto',
}

// ── Estilos base ───────────────────────────────────────────────────
const inputStyle: CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  borderRadius: 10,
  background: '#F8FAFC',
  border: `1px solid ${BORDER}`,
  fontSize: 13,
  color: TEXT,
  outline: 'none',
}
const labelStyle: CSSProperties = {
  display: 'block',
  fontSize: 10,
  fontWeight: 800,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: '#9CA3AF',
  marginBottom: 5,
}
const primaryBtn: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 7,
  padding: '9px 16px',
  borderRadius: 10,
  fontSize: 13,
  fontWeight: 800,
  color: '#fff',
  background: BRAND,
  border: 'none',
  cursor: 'pointer',
  boxShadow: '0 8px 20px rgba(183,53,184,0.22)',
}

// ── Utilidades ─────────────────────────────────────────────────────
function fmtDateTime(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('es', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function parsePhones(raw: string): string[] {
  return Array.from(
    new Set(
      raw
        .split(/[\n,;]+/)
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  )
}

// ── Componente ─────────────────────────────────────────────────────
export default function DiamondAssistantCampanas() {
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<'' | CampaignStatus>('')

  const [agents, setAgents] = useState<AgentOption[]>([])
  const [media, setMedia] = useState<MediaOption[]>([])

  // Aviso superior (resultado de acciones).
  const [notice, setNotice] = useState<string | null>(null)

  // Builder (crear / editar)
  const [builderOpen, setBuilderOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<BuilderForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Plantillas aprobadas del agente elegido (para enviar fuera de 24h).
  const [templates, setTemplates] = useState<TemplateOption[]>([])
  const [templatesLoading, setTemplatesLoading] = useState(false)

  // Subida directa de imagen/video para adjuntar a la campaña.
  const campaignFileRef = useRef<HTMLInputElement>(null)
  const [uploadingMedia, setUploadingMedia] = useState(false)

  async function uploadCampaignMedia(file: File) {
    const isVideo = file.type.startsWith('video/')
    const isImage = file.type.startsWith('image/')
    if (!isImage && !isVideo) { setFormError('Solo se puede subir imagen o video.'); return }
    setUploadingMedia(true)
    setFormError(null)
    try {
      const fd = new FormData()
      fd.append('type', isVideo ? 'VIDEO' : 'IMAGE')
      fd.append('title', (file.name.replace(/\.[^.]+$/, '') || (isVideo ? 'Video' : 'Imagen')).slice(0, 60))
      fd.append('tags', JSON.stringify([]))
      fd.append('file', file)
      const res = await fetch('/api/admin/diamond-assistant/media', { method: 'POST', body: fd })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.ok) { setFormError(data.error ?? 'No se pudo subir el archivo.'); return }
      const asset = data.data as { id: string; title: string; type: MediaKind }
      setMedia((prev) => [{ id: asset.id, title: asset.title, type: asset.type }, ...prev])
      setForm((f) => ({ ...f, mediaAssetId: asset.id }))
    } catch {
      setFormError('Error de conexión al subir el archivo.')
    } finally {
      setUploadingMedia(false)
      if (campaignFileRef.current) campaignFileRef.current.value = ''
    }
  }

  useEffect(() => {
    if (!builderOpen || !form.agentId) { setTemplates([]); return }
    let cancelled = false
    setTemplatesLoading(true)
    fetch(`/api/admin/diamond-assistant/templates?agentId=${form.agentId}`)
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setTemplates(d.ok ? (d.templates ?? []) : []) })
      .catch(() => { if (!cancelled) setTemplates([]) })
      .finally(() => { if (!cancelled) setTemplatesLoading(false) })
    return () => { cancelled = true }
  }, [builderOpen, form.agentId])

  // Selector de contactos (targetType CONTACT)
  const [contactQuery, setContactQuery] = useState('')
  const [contactResults, setContactResults] = useState<ContactOption[]>([])
  const [contactLoading, setContactLoading] = useState(false)
  const [selectedContacts, setSelectedContacts] = useState<ContactOption[]>([])
  const [totalContacts, setTotalContacts] = useState<number | null>(null)
  const [selectingAll, setSelectingAll] = useState(false)

  // Selecciona TODOS los contactos (los que matcheen la búsqueda actual, o todos si no hay).
  async function selectAllContacts() {
    setSelectingAll(true)
    try {
      const all: ContactOption[] = []
      let page = 1
      let total = Infinity
      while (all.length < total && page <= 300) {
        const params = new URLSearchParams({ page: String(page) })
        if (contactQuery.trim()) params.set('q', contactQuery.trim())
        const res = await fetch(`/api/admin/diamond-assistant/contacts?${params}`)
        const data = await res.json().catch(() => ({}))
        if (!res.ok) break
        const batch: ContactOption[] = data.contacts ?? []
        total = typeof data.total === 'number' ? data.total : all.length + batch.length
        all.push(...batch)
        if (batch.length === 0) break
        page++
      }
      setSelectedContacts(all)
    } catch {
      /* noop */
    } finally {
      setSelectingAll(false)
    }
  }

  // Acciones por campaña
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [runTarget, setRunTarget] = useState<CampaignRow | null>(null)
  const [running, setRunning] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<CampaignRow | null>(null)
  const [deleting, setDeleting] = useState(false)

  // ── Carga de datos ───────────────────────────────────────────────
  const fetchCampaigns = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (statusFilter) params.set('status', statusFilter)
      const res = await fetch(`/api/admin/diamond-assistant/campaigns?${params}`)
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error ?? 'No se pudieron cargar las campañas.')
        setCampaigns([])
        return
      }
      setCampaigns(data.data ?? [])
    } catch {
      setError('Error de conexión al cargar las campañas.')
      setCampaigns([])
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  const fetchRefs = useCallback(async () => {
    try {
      const [aRes, mRes] = await Promise.all([
        fetch('/api/admin/diamond-assistant/agents'),
        fetch('/api/admin/diamond-assistant/media'),
      ])
      const aData = await aRes.json().catch(() => ({}))
      const mData = await mRes.json().catch(() => ({}))
      if (aRes.ok) setAgents(aData.data ?? [])
      if (mRes.ok) setMedia(mData.data ?? [])
    } catch {
      /* refs no críticas: el builder mostrará listas vacías */
    }
  }, [])

  useEffect(() => {
    fetchCampaigns()
  }, [fetchCampaigns])

  useEffect(() => {
    fetchRefs()
  }, [fetchRefs])

  // Búsqueda de contactos (con debounce) mientras el builder está en CONTACT.
  useEffect(() => {
    if (!builderOpen || form.targetType !== 'CONTACT') return
    let active = true
    setContactLoading(true)
    const t = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ page: '1' })
        if (contactQuery.trim()) params.set('q', contactQuery.trim())
        const res = await fetch(`/api/admin/diamond-assistant/contacts?${params}`)
        const data = await res.json().catch(() => ({}))
        if (active && res.ok) {
          setContactResults(data.contacts ?? [])
          setTotalContacts(typeof data.total === 'number' ? data.total : (data.contacts?.length ?? 0))
        }
      } catch {
        /* búsqueda no crítica */
      } finally {
        if (active) setContactLoading(false)
      }
    }, 300)
    return () => {
      active = false
      clearTimeout(t)
    }
  }, [builderOpen, form.targetType, contactQuery])

  const agentName = useMemo(() => {
    const map = new Map(agents.map((a) => [a.id, a.name]))
    return (id: string, fallback?: string | null) => fallback ?? map.get(id) ?? '—'
  }, [agents])

  // ── Builder: abrir / cerrar ──────────────────────────────────────
  function openCreate() {
    setEditingId(null)
    setForm({ ...EMPTY_FORM, agentId: agents[0]?.id ?? '' })
    setSelectedContacts([])
    setContactQuery('')
    setContactResults([])
    setFormError(null)
    setBuilderOpen(true)
  }

  function openEdit(row: CampaignRow) {
    const tj = (row.targetJson ?? {}) as Record<string, unknown>
    const rj = (row.recurrenceJson ?? {}) as Record<string, unknown>
    const phones = Array.isArray(tj.phones) ? (tj.phones as unknown[]).map(String) : []
    setEditingId(row.id)
    setForm({
      agentId: row.agentId,
      name: row.name,
      messageBody: row.messageBody,
      mediaAssetId: row.mediaAssetId ?? '',
      targetType: row.targetType,
      segTag: typeof tj.tag === 'string' ? tj.tag : '',
      segStatus: (typeof tj.status === 'string' ? tj.status : '') as '' | ContactStatus,
      manualPhones: phones.join('\n'),
      scheduledAt: toDatetimeLocal(row.scheduledAt),
      recurring: row.recurring,
      repeat: (typeof rj.repeat === 'string' ? rj.repeat : typeof rj.frequency === 'string' ? rj.frequency : 'WEEKLY') as BuilderForm['repeat'],
      weekdays: Array.isArray(rj.weekdays) ? (rj.weekdays as unknown[]).map(Number).filter((n) => n >= 0 && n <= 6) : [],
      repeatUntil: typeof rj.repeatUntil === 'string' ? toDatetimeLocal(rj.repeatUntil) : '',
      throttleMs: row.throttleMs,
      useTemplate: !!(row as { templateJson?: unknown }).templateJson,
      templateName: (() => {
        const t = (row as { templateJson?: { name?: string } }).templateJson
        return t && typeof t.name === 'string' ? t.name : ''
      })(),
    })
    // Precargar contactos elegidos (si venían por contactIds, los reconstruimos).
    setSelectedContacts([])
    setContactQuery('')
    setContactResults([])
    if (row.targetType === 'CONTACT' && Array.isArray(tj.contactIds) && tj.contactIds.length > 0) {
      void preloadSelectedContacts((tj.contactIds as unknown[]).map(String))
    }
    setFormError(null)
    setBuilderOpen(true)
  }

  // Reconstruye los contactos seleccionados desde sus IDs (para editar).
  async function preloadSelectedContacts(ids: string[]) {
    try {
      const res = await fetch(`/api/admin/diamond-assistant/contacts?page=1`)
      const data = await res.json().catch(() => ({}))
      const all: ContactOption[] = res.ok ? (data.contacts ?? []) : []
      const found = all.filter((c) => ids.includes(c.id))
      // Los que no aparecieron en la primera página se muestran como placeholder.
      const missing = ids.filter((id) => !found.some((c) => c.id === id))
      const placeholders: ContactOption[] = missing.map((id) => ({
        id,
        name: 'Contacto seleccionado',
        phone: '—',
        tag: null,
        status: 'ACTIVE',
      }))
      setSelectedContacts([...found, ...placeholders])
    } catch {
      setSelectedContacts([])
    }
  }

  function toggleContact(c: ContactOption) {
    setSelectedContacts((prev) =>
      prev.some((x) => x.id === c.id) ? prev.filter((x) => x.id !== c.id) : [...prev, c],
    )
  }

  // ── Estimación de destinatarios en el builder ────────────────────
  const estimatedTargets = useMemo(() => {
    if (form.targetType === 'CONTACT') return selectedContacts.length
    if (form.targetType === 'MANUAL') return parsePhones(form.manualPhones).length
    return null // SEGMENT: se calcula en el servidor al guardar
  }, [form.targetType, form.manualPhones, selectedContacts])

  const selectedMedia = useMemo(
    () => media.find((m) => m.id === form.mediaAssetId) ?? null,
    [media, form.mediaAssetId],
  )

  // ── Guardar (crear / editar) ─────────────────────────────────────
  function buildPayload(): Record<string, unknown> | { error: string } {
    if (!form.agentId) return { error: 'Elige un agente.' }
    if (!form.name.trim()) return { error: 'El nombre es obligatorio.' }

    // Si se envía por PLANTILLA aprobada (fuera de 24h): armamos templateJson y el
    // "mensaje" es el cuerpo de la plantilla (para el registro).
    let templateJson: Record<string, unknown> | null = null
    let effectiveMessage = form.messageBody.trim()
    if (form.useTemplate) {
      const tpl = templates.find((t) => t.name === form.templateName)
      if (!tpl) return { error: 'Elegí una plantilla aprobada.' }
      templateJson = {
        name: tpl.name,
        language: tpl.language,
        params: tpl.params.map((tok) => ({
          ...(/^\d+$/.test(tok) ? {} : { name: tok }),
          source: 'name', // se rellena con el nombre de cada contacto
        })),
      }
      effectiveMessage = tpl.body || `[Plantilla: ${tpl.name}]`
    }
    if (!effectiveMessage) return { error: 'El mensaje es obligatorio.' }

    let targetJson: Record<string, unknown>
    if (form.targetType === 'CONTACT') {
      if (selectedContacts.length === 0) return { error: 'Selecciona al menos un contacto.' }
      targetJson = { contactIds: selectedContacts.map((c) => c.id) }
    } else if (form.targetType === 'MANUAL') {
      const phones = parsePhones(form.manualPhones)
      if (phones.length === 0) return { error: 'Pega al menos un número de teléfono.' }
      targetJson = { phones }
    } else {
      if (!form.segTag.trim() && !form.segStatus) {
        return { error: 'Indica una etiqueta o un estado para el segmento.' }
      }
      targetJson = {}
      if (form.segTag.trim()) targetJson.tag = form.segTag.trim()
      if (form.segStatus) targetJson.status = form.segStatus
    }

    if (form.recurring) {
      if (!form.scheduledAt) {
        return { error: 'Para envío recurrente, elegí la fecha y hora de inicio.' }
      }
      if (form.repeat === 'WEEKDAYS' && form.weekdays.length === 0) {
        return { error: 'Elegí al menos un día de la semana.' }
      }
      if (form.repeatUntil && new Date(form.repeatUntil).getTime() <= new Date(form.scheduledAt).getTime()) {
        return { error: 'La fecha de fin debe ser posterior a la de inicio.' }
      }
    }

    const recurrenceJson = form.recurring
      ? {
          repeat: form.repeat,
          weekdays: form.repeat === 'WEEKDAYS' ? form.weekdays : [],
          repeatUntil: form.repeatUntil ? new Date(form.repeatUntil).toISOString() : null,
        }
      : null

    return {
      agentId: form.agentId,
      name: form.name.trim(),
      messageBody: effectiveMessage,
      mediaAssetId: form.useTemplate ? null : (form.mediaAssetId || null),
      targetType: form.targetType,
      targetJson,
      scheduledAt: form.scheduledAt ? new Date(form.scheduledAt).toISOString() : null,
      recurring: form.recurring,
      recurrenceJson,
      throttleMs: form.throttleMs,
      templateJson,
    }
  }

  async function submitForm() {
    const payload = buildPayload()
    if ('error' in payload) {
      setFormError(payload.error as string)
      return
    }
    setSaving(true)
    setFormError(null)
    try {
      const url = editingId
        ? `/api/admin/diamond-assistant/campaigns/${editingId}`
        : '/api/admin/diamond-assistant/campaigns'
      const res = await fetch(url, {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setFormError(data.error ?? 'No se pudo guardar la campaña.')
        return
      }
      setBuilderOpen(false)
      setNotice(
        editingId
          ? 'Campaña actualizada.'
          : 'Campaña creada. Queda PENDIENTE DE APROBACIÓN: apruébala antes de poder ejecutarla.',
      )
      await fetchCampaigns()
    } catch {
      setFormError('Error de conexión al guardar.')
    } finally {
      setSaving(false)
    }
  }

  // ── Aprobar ──────────────────────────────────────────────────────
  async function approve(row: CampaignRow) {
    setApprovingId(row.id)
    setNotice(null)
    try {
      const res = await fetch(`/api/admin/diamond-assistant/campaigns/${row.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setNotice(data.error ?? 'No se pudo aprobar la campaña.')
        return
      }
      setNotice('Campaña aprobada. Ya puedes ejecutarla (envío simulado que quedará en el Historial).')
      await fetchCampaigns()
    } catch {
      setNotice('Error de conexión al aprobar.')
    } finally {
      setApprovingId(null)
    }
  }

  // ── Ejecutar (envío simulado) ────────────────────────────────────
  async function confirmRun() {
    if (!runTarget) return
    setRunning(true)
    setNotice(null)
    try {
      const res = await fetch(`/api/admin/diamond-assistant/campaigns/${runTarget.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'run' }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setNotice(data.error ?? 'No se pudo ejecutar la campaña.')
        return
      }
      const s = data.summary ?? {}
      setNotice(
        `Envío simulado completado: ${s.sent ?? 0} registrados, ${s.failed ?? 0} con error (de ${s.total ?? 0}). ` +
          'Revisa el detalle en el Historial. El envío real por WhatsApp se activa en la fase de integración.',
      )
      setRunTarget(null)
      await fetchCampaigns()
    } catch {
      setNotice('Error de conexión al ejecutar.')
    } finally {
      setRunning(false)
    }
  }

  // ── Eliminar ─────────────────────────────────────────────────────
  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/diamond-assistant/campaigns/${deleteTarget.id}`, {
        method: 'DELETE',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setNotice(data.error ?? 'No se pudo eliminar la campaña.')
        return
      }
      setDeleteTarget(null)
      setNotice('Campaña eliminada.')
      await fetchCampaigns()
    } catch {
      setNotice('Error de conexión al eliminar.')
    } finally {
      setDeleting(false)
    }
  }

  const noAgents = agents.length === 0

  // ── Render ───────────────────────────────────────────────────────
  return (
    <div className="font-ui" style={{ color: TEXT }}>
      <PageHeader
        icon={Megaphone}
        title="Campañas"
        description="Envíos programados a contactos y segmentos, con aprobación previa"
        action={
          <button onClick={openCreate} style={primaryBtn} disabled={noAgents} title={noAgents ? 'Crea un agente primero' : undefined}>
            <Plus size={15} /> Nueva campaña
          </button>
        }
      />

      {/* Aviso de seguridad / fase */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 11,
          background: 'linear-gradient(135deg, rgba(255,45,149,0.06), rgba(35,59,143,0.06))',
          border: `1px solid ${BORDER}`,
          borderRadius: 14,
          padding: '12px 14px',
          marginBottom: 14,
        }}
      >
        <ShieldCheck size={18} style={{ color: '#147e95', flexShrink: 0, marginTop: 1 }} />
        <p style={{ fontSize: 12.5, color: MUTED, margin: 0, lineHeight: 1.55 }}>
          Toda campaña nace <strong style={{ color: '#B45309' }}>pendiente de aprobación</strong> y no se envía hasta que la apruebes.
          Al ejecutar, se hace un <strong>envío simulado</strong> que queda registrado en el Historial:{' '}
          <strong>el envío real por WhatsApp se activa en la fase de integración</strong>.
        </p>
      </div>

      {/* Notice de acciones */}
      {notice && (
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 9,
            background: 'rgba(22,163,74,0.07)',
            border: '1px solid rgba(22,163,74,0.20)',
            borderRadius: 12,
            padding: '10px 12px',
            marginBottom: 14,
          }}
        >
          <Info size={15} style={{ color: '#16A34A', flexShrink: 0, marginTop: 2 }} />
          <p style={{ fontSize: 12.5, color: '#15803D', margin: 0, lineHeight: 1.5, flex: 1 }}>{notice}</p>
          <button onClick={() => setNotice(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 2, display: 'flex' }}>
            <X size={14} style={{ color: '#15803D' }} />
          </button>
        </div>
      )}

      {/* Filtro de estado */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
        <div style={{ position: 'relative', flex: '0 1 240px', minWidth: 180 }}>
          <FilterIcon size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', pointerEvents: 'none' }} />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as '' | CampaignStatus)}
            style={{ ...inputStyle, paddingLeft: 34, height: 40, cursor: 'pointer', appearance: 'none' }}
          >
            <option value="">Todos los estados</option>
            <option value="PENDING_APPROVAL">Pendientes de aprobación</option>
            <option value="SCHEDULED">Aprobadas</option>
            <option value="SENT">Enviadas</option>
            <option value="FAILED">Fallidas</option>
            <option value="DRAFT">Borradores</option>
            <option value="CANCELLED">Canceladas</option>
          </select>
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '64px 0' }}>
          <Loader2 size={22} className="animate-spin" style={{ color: '#147e95' }} />
        </div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: '56px 16px', background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 16 }}>
          <AlertTriangle size={26} style={{ color: '#DC2626', margin: '0 auto 10px' }} />
          <p style={{ fontSize: 13, color: '#DC2626', fontWeight: 700, margin: 0 }}>{error}</p>
          <button onClick={fetchCampaigns} style={{ marginTop: 12, padding: '7px 14px', borderRadius: 9, fontSize: 12, fontWeight: 700, color: TEXT, background: '#F4F6FA', border: `1px solid ${BORDER}`, cursor: 'pointer' }}>
            Reintentar
          </button>
        </div>
      ) : campaigns.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '56px 16px', background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 16 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(183,53,184,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
            <Megaphone size={24} style={{ color: '#147e95' }} />
          </div>
          <p style={{ fontSize: 14, fontWeight: 800, margin: 0 }}>{statusFilter ? 'Sin campañas en este estado' : 'Aún no hay campañas'}</p>
          <p style={{ fontSize: 12.5, color: MUTED, margin: '4px 0 16px' }}>
            {statusFilter ? 'Cambia el filtro para ver otras campañas.' : 'Crea tu primera campaña para planificar un envío con aprobación.'}
          </p>
          {!statusFilter && (
            <button onClick={openCreate} style={primaryBtn} disabled={noAgents}>
              <Plus size={15} /> Nueva campaña
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {campaigns.map((c) => {
            const meta = STATUS_META[c.status]
            const canEdit = c.status === 'DRAFT' || c.status === 'PENDING_APPROVAL' || c.status === 'SCHEDULED'
            const canApprove = c.status === 'PENDING_APPROVAL'
            const canRun = c.status === 'SCHEDULED'
            const busy = c.status === 'SENDING'
            return (
              <div key={c.id} style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 16, padding: 16, boxShadow: '0 1px 3px rgba(17,24,39,0.04)' }}>
                {/* Cabecera de la tarjeta */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ minWidth: 0, flex: '1 1 260px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 15, fontWeight: 800, color: TEXT }}>{c.name}</span>
                      <span style={{ fontSize: 10.5, fontWeight: 800, padding: '3px 10px', borderRadius: 999, color: meta.color, background: meta.bg, border: `1px solid ${meta.border}` }}>
                        {meta.label}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginTop: 6, fontSize: 11.5, color: MUTED }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <Sparkles size={12} style={{ color: '#147e95' }} /> {agentName(c.agentId, c.agent?.name)}
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <Users size={12} style={{ color: '#233B8F' }} /> {TARGET_LABEL[c.targetType]}
                      </span>
                      {c.mediaAssetId && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <Paperclip size={12} style={{ color: '#1fb8bb' }} />
                          {c.mediaTitle ?? 'Adjunto'}{c.mediaType ? ` · ${MEDIA_LABEL[c.mediaType]}` : ''}
                        </span>
                      )}
                      {c.scheduledAt && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <CalendarClock size={12} style={{ color: '#16A34A' }} /> {fmtDateTime(c.scheduledAt)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Acciones */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                    {canApprove && (
                      <button
                        onClick={() => approve(c)}
                        disabled={approvingId === c.id}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 13px', borderRadius: 9, fontSize: 12, fontWeight: 800, color: '#B45309', background: 'rgba(245,158,11,0.13)', border: '1px solid rgba(245,158,11,0.32)', cursor: approvingId === c.id ? 'not-allowed' : 'pointer' }}
                      >
                        {approvingId === c.id ? <Loader2 size={13} className="animate-spin" /> : <ShieldCheck size={13} />} Aprobar
                      </button>
                    )}
                    {canRun && (
                      <button
                        onClick={() => setRunTarget(c)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 13px', borderRadius: 9, fontSize: 12, fontWeight: 800, color: '#fff', background: BRAND, border: 'none', cursor: 'pointer', boxShadow: '0 6px 16px rgba(183,53,184,0.22)' }}
                      >
                        <Send size={13} /> Ejecutar
                      </button>
                    )}
                    {busy && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 13px', borderRadius: 9, fontSize: 12, fontWeight: 800, color: '#147e95', background: 'rgba(183,53,184,0.10)', border: '1px solid rgba(183,53,184,0.24)' }}>
                        <Loader2 size={13} className="animate-spin" /> Enviando…
                      </span>
                    )}
                    {canEdit && (
                      <button onClick={() => openEdit(c)} title="Editar" style={{ padding: 8, borderRadius: 9, background: 'rgba(35,59,143,0.08)', border: '1px solid rgba(35,59,143,0.18)', cursor: 'pointer', display: 'flex' }}>
                        <Pencil size={13} style={{ color: '#233B8F' }} />
                      </button>
                    )}
                    <button onClick={() => setDeleteTarget(c)} title="Eliminar" style={{ padding: 8, borderRadius: 9, background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.18)', cursor: 'pointer', display: 'flex' }}>
                      <Trash2 size={13} style={{ color: '#DC2626' }} />
                    </button>
                  </div>
                </div>

                {/* Mensaje (recorte) */}
                <p style={{ fontSize: 12.5, color: MUTED, margin: '11px 0 0', lineHeight: 1.5, whiteSpace: 'pre-wrap', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {c.messageBody}
                </p>

                {/* Métricas */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap', marginTop: 12, paddingTop: 12, borderTop: `1px solid ${BORDER}` }}>
                  <Metric label="Destinatarios" value={c.totalTargets} />
                  <Metric label="Enviados" value={c.sentCount} color="#16A34A" />
                  <Metric label="Errores" value={c.failedCount} color={c.failedCount > 0 ? '#DC2626' : MUTED} />
                  <Metric label="Ritmo" value={`${c.throttleMs} ms`} />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Builder ─────────────────────────────────────────────────── */}
      {builderOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(2px)' }} onClick={() => !saving && setBuilderOpen(false)} />
          <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: 860, maxHeight: '92vh', display: 'flex', flexDirection: 'column', background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 18, overflow: 'hidden', boxShadow: '0 24px 60px rgba(17,24,39,0.28)' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '16px 20px', borderBottom: `1px solid ${BORDER}`, flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
                <div style={{ width: 38, height: 38, borderRadius: 11, background: BRAND, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 8px 18px rgba(255,45,149,0.24)' }}>
                  {editingId ? <Pencil size={17} className="text-white" /> : <Megaphone size={17} className="text-white" />}
                </div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 800, margin: 0 }}>{editingId ? 'Editar campaña' : 'Nueva campaña'}</p>
                  <p style={{ fontSize: 11.5, color: MUTED, margin: '2px 0 0' }}>Al guardar, quedará pendiente de aprobación.</p>
                </div>
              </div>
              <button onClick={() => !saving && setBuilderOpen(false)} style={{ padding: 7, borderRadius: 9, background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex' }}>
                <X size={17} style={{ color: '#9CA3AF' }} />
              </button>
            </div>

            {/* Body: dos columnas (config + vista previa) */}
            <div style={{ padding: 20, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'minmax(0,1.35fr) minmax(0,1fr)', gap: 18 }}>
              {/* Columna configuración */}
              <div style={{ minWidth: 0 }}>
                {formError && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.20)', borderRadius: 10, padding: '9px 12px', marginBottom: 14 }}>
                    <AlertTriangle size={13} style={{ color: '#DC2626', flexShrink: 0, marginTop: 2 }} />
                    <p style={{ fontSize: 12, color: '#DC2626', margin: 0, lineHeight: 1.5 }}>{formError}</p>
                  </div>
                )}

                <div style={{ marginBottom: 12 }}>
                  <label style={labelStyle}>Agente *</label>
                  <select value={form.agentId} onChange={(e) => setForm((f) => ({ ...f, agentId: e.target.value }))} style={{ ...inputStyle, cursor: 'pointer' }}>
                    <option value="">Elige un agente…</option>
                    {agents.map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <label style={labelStyle}>Nombre de la campaña *</label>
                  <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Ej. Bienvenida reto 90 días" style={inputStyle} />
                </div>

                {/* ── Enviar con PLANTILLA aprobada (para escribir FUERA de 24h) ── */}
                <div style={{ marginBottom: 12, border: `1px solid rgba(22,163,74,0.30)`, background: 'rgba(22,163,74,0.05)', borderRadius: 12, padding: 12 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, fontWeight: 800, color: '#111827' }}>
                    <input
                      type="checkbox"
                      checked={form.useTemplate}
                      onChange={(e) => setForm((f) => ({ ...f, useTemplate: e.target.checked, templateName: '' }))}
                    />
                    📩 Enviar con plantilla aprobada (para escribir fuera de las 24h)
                  </label>
                  {form.useTemplate && (
                    <div style={{ marginTop: 10 }}>
                      <label style={labelStyle}>Plantilla aprobada</label>
                      <select
                        value={form.templateName}
                        onChange={(e) => setForm((f) => ({ ...f, templateName: e.target.value }))}
                        style={{ ...inputStyle, cursor: 'pointer' }}
                      >
                        <option value="">
                          {templatesLoading ? 'Cargando plantillas…' : templates.length ? 'Elegí una plantilla…' : 'No hay plantillas aprobadas'}
                        </option>
                        {templates.map((t) => (
                          <option key={t.name} value={t.name}>{t.name}{t.category ? ` · ${t.category.toLowerCase()}` : ''}</option>
                        ))}
                      </select>
                      {form.templateName && (() => {
                        const t = templates.find((x) => x.name === form.templateName)
                        if (!t) return null
                        return (
                          <div style={{ marginTop: 8, fontSize: 12.5, color: MUTED, lineHeight: 1.5, background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '8px 10px' }}>
                            <div style={{ whiteSpace: 'pre-wrap', color: '#374151' }}>{t.body}</div>
                            {t.params.length > 0 && (
                              <div style={{ marginTop: 6, color: '#16A34A', fontWeight: 700 }}>
                                ✓ La variable se rellena sola con el nombre de cada contacto.
                              </div>
                            )}
                          </div>
                        )
                      })()}
                      <p style={{ fontSize: 11.5, color: MUTED, margin: '8px 0 0' }}>
                        El texto de la plantilla está aprobado por Meta y no se puede editar aquí (solo se rellenan variables).
                      </p>
                    </div>
                  )}
                </div>

                {!form.useTemplate && (
                <div style={{ marginBottom: 12 }}>
                  <label style={labelStyle}>Mensaje *</label>
                  <textarea value={form.messageBody} onChange={(e) => setForm((f) => ({ ...f, messageBody: e.target.value }))} placeholder="Escribe el mensaje que recibirán los destinatarios…" rows={5} style={{ ...inputStyle, resize: 'vertical', minHeight: 96, lineHeight: 1.5 }} />
                </div>
                )}

                {/* Adjunto: subir directo o elegir de la Biblioteca */}
                {!form.useTemplate && (
                <div style={{ marginBottom: 12 }}>
                  <label style={labelStyle}>Adjuntar imagen o video</label>
                  <input
                    ref={campaignFileRef}
                    type="file"
                    accept="image/*,video/*"
                    style={{ display: 'none' }}
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadCampaignMedia(f) }}
                  />
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
                    <button
                      type="button"
                      onClick={() => campaignFileRef.current?.click()}
                      disabled={uploadingMedia}
                      style={{ fontSize: 13, fontWeight: 800, padding: '9px 14px', borderRadius: 10, border: `1px solid ${BRAND}`, background: 'rgba(183,53,184,0.08)', color: BRAND, cursor: uploadingMedia ? 'default' : 'pointer', opacity: uploadingMedia ? 0.6 : 1 }}
                    >
                      {uploadingMedia ? '⏳ Subiendo…' : '📎 Subir imagen o video'}
                    </button>
                    <span style={{ fontSize: 12, color: MUTED }}>o elegí uno ya cargado ↓</span>
                  </div>
                  <select value={form.mediaAssetId} onChange={(e) => setForm((f) => ({ ...f, mediaAssetId: e.target.value }))} style={{ ...inputStyle, cursor: 'pointer' }}>
                    <option value="">Sin adjunto (solo texto)</option>
                    {media.map((m) => (
                      <option key={m.id} value={m.id}>{MEDIA_LABEL[m.type]} · {m.title}</option>
                    ))}
                  </select>
                </div>
                )}

                {/* Destino */}
                <div style={{ marginBottom: 12 }}>
                  <label style={labelStyle}>Destino</label>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                    {(['SEGMENT', 'CONTACT', 'MANUAL'] as TargetType[]).map((t) => {
                      const active = form.targetType === t
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setForm((f) => ({ ...f, targetType: t }))}
                          style={{ flex: 1, padding: '8px 6px', borderRadius: 9, fontSize: 12, fontWeight: 800, cursor: 'pointer', color: active ? '#fff' : MUTED, background: active ? BRAND : '#F4F6FA', border: active ? 'none' : `1px solid ${BORDER}` }}
                        >
                          {t === 'SEGMENT' ? 'Segmento' : t === 'CONTACT' ? 'Contactos' : 'Manual'}
                        </button>
                      )
                    })}
                  </div>

                  {form.targetType === 'SEGMENT' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <div>
                        <label style={labelStyle}>Etiqueta</label>
                        <input type="text" value={form.segTag} onChange={(e) => setForm((f) => ({ ...f, segTag: e.target.value }))} placeholder="lead, cliente, VIP…" style={inputStyle} />
                      </div>
                      <div>
                        <label style={labelStyle}>Estado</label>
                        <select value={form.segStatus} onChange={(e) => setForm((f) => ({ ...f, segStatus: e.target.value as '' | ContactStatus }))} style={{ ...inputStyle, cursor: 'pointer' }}>
                          <option value="">Cualquiera</option>
                          <option value="ACTIVE">Activo</option>
                          <option value="INACTIVE">Inactivo</option>
                          <option value="BLOCKED">Bloqueado</option>
                        </select>
                      </div>
                      <p style={{ gridColumn: '1 / -1', fontSize: 11, color: MUTED, margin: 0 }}>
                        Se resolverá contra tu base de contactos al guardar. El total exacto se calcula en ese momento.
                      </p>
                    </div>
                  )}

                  {form.targetType === 'CONTACT' && (
                    <div>
                      <div style={{ position: 'relative', marginBottom: 8 }}>
                        <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
                        <input type="text" value={contactQuery} onChange={(e) => setContactQuery(e.target.value)} placeholder="Buscar contacto por nombre o celular…" style={{ ...inputStyle, paddingLeft: 33 }} />
                      </div>
                      {/* Seleccionar todos + contador */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button type="button" onClick={selectAllContacts} disabled={selectingAll} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 800, padding: '6px 12px', borderRadius: 9, color: '#fff', background: BRAND, border: 'none', cursor: selectingAll ? 'default' : 'pointer', opacity: selectingAll ? 0.6 : 1 }}>
                            {selectingAll ? <Loader2 size={13} className="animate-spin" /> : <Users size={13} />}
                            Seleccionar todos{totalContacts != null ? ` (${totalContacts})` : ''}
                          </button>
                          {selectedContacts.length > 0 && (
                            <button type="button" onClick={() => setSelectedContacts([])} style={{ fontSize: 12, fontWeight: 700, padding: '6px 12px', borderRadius: 9, color: MUTED, background: '#F0F3F7', border: 'none', cursor: 'pointer' }}>
                              Limpiar
                            </button>
                          )}
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 800, color: selectedContacts.length > 0 ? '#16A34A' : MUTED }}>
                          {selectedContacts.length > 0 ? `✓ Se enviará a ${selectedContacts.length}` : 'Ninguno seleccionado'}
                        </span>
                      </div>
                      {selectedContacts.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                          {selectedContacts.map((c) => (
                            <span key={c.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 999, color: '#147e95', background: 'rgba(183,53,184,0.10)', border: '1px solid rgba(183,53,184,0.20)' }}>
                              {c.name || c.phone}
                              <button type="button" onClick={() => toggleContact(c)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', padding: 0 }}>
                                <X size={11} style={{ color: '#147e95' }} />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                      <div style={{ maxHeight: 168, overflowY: 'auto', border: `1px solid ${BORDER}`, borderRadius: 10 }}>
                        {contactLoading ? (
                          <div style={{ padding: 18, textAlign: 'center' }}>
                            <Loader2 size={16} className="animate-spin" style={{ color: '#147e95' }} />
                          </div>
                        ) : contactResults.length === 0 ? (
                          <p style={{ fontSize: 12, color: MUTED, textAlign: 'center', padding: 16, margin: 0 }}>Sin contactos.</p>
                        ) : (
                          contactResults.map((c) => {
                            const on = selectedContacts.some((x) => x.id === c.id)
                            return (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => toggleContact(c)}
                                style={{ display: 'flex', alignItems: 'center', gap: 9, width: '100%', textAlign: 'left', padding: '8px 11px', background: on ? 'rgba(183,53,184,0.06)' : 'transparent', border: 'none', borderBottom: `1px solid ${BORDER}`, cursor: 'pointer' }}
                              >
                                <span style={{ width: 18, height: 18, borderRadius: 5, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: on ? BRAND : '#fff', border: on ? 'none' : `1px solid ${BORDER}` }}>
                                  {on && <Check size={12} style={{ color: '#fff' }} />}
                                </span>
                                <span style={{ minWidth: 0, flex: 1 }}>
                                  <span style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: TEXT, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name || 'Sin nombre'}</span>
                                  <span style={{ display: 'block', fontSize: 11, color: MUTED, fontFamily: 'ui-monospace, monospace' }}>{c.phone}</span>
                                </span>
                                {c.tag && <span style={{ fontSize: 10, color: MUTED }}>{c.tag}</span>}
                              </button>
                            )
                          })
                        )}
                      </div>
                    </div>
                  )}

                  {form.targetType === 'MANUAL' && (
                    <div>
                      <textarea value={form.manualPhones} onChange={(e) => setForm((f) => ({ ...f, manualPhones: e.target.value }))} placeholder="Pega los números, uno por línea o separados por comas. Ej. 573001234567" rows={4} style={{ ...inputStyle, resize: 'vertical', minHeight: 84, fontFamily: 'ui-monospace, monospace', fontSize: 12.5 }} />
                    </div>
                  )}
                </div>

                {/* Programación + ritmo */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 4 }}>
                  <div>
                    <label style={labelStyle}>Inicia · fecha y hora</label>
                    <input type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm((f) => ({ ...f, scheduledAt: e.target.value }))} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Ritmo entre envíos (ms)</label>
                    <input type="number" min={0} max={60000} step={100} value={form.throttleMs} onChange={(e) => setForm((f) => ({ ...f, throttleMs: Math.max(0, Number(e.target.value) || 0) }))} style={inputStyle} />
                  </div>
                </div>

                <div style={{ marginTop: 10 }}>
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, recurring: !f.recurring }))}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: 12, padding: '9px 13px', borderRadius: 11, background: '#F8FAFC', border: `1px solid ${BORDER}`, cursor: 'pointer' }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <CalendarClock size={14} style={{ color: form.recurring ? '#16A34A' : '#9CA3AF' }} />
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: TEXT }}>Envío recurrente</span>
                    </span>
                    <span style={{ position: 'relative', width: 40, height: 22, borderRadius: 999, background: form.recurring ? '#16A34A' : '#E4E9F0', flexShrink: 0 }}>
                      <span style={{ position: 'absolute', top: 2, left: form.recurring ? 20 : 2, width: 18, height: 18, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,0.2)', transition: 'left 0.15s' }} />
                    </span>
                  </button>
                  {form.recurring && (
                    <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div>
                        <label style={labelStyle}>Repetir</label>
                        <select value={form.repeat} onChange={(e) => setForm((f) => ({ ...f, repeat: e.target.value as BuilderForm['repeat'] }))} style={{ ...inputStyle, cursor: 'pointer' }}>
                          <option value="DAILY">Cada día (a esa hora)</option>
                          <option value="WEEKDAYS">Días específicos (elegís cuáles)</option>
                          <option value="WEEKLY">Cada semana (ese día y hora)</option>
                        </select>
                      </div>

                      {form.repeat === 'WEEKDAYS' && (
                        <div>
                          <label style={labelStyle}>¿Qué días?</label>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {WEEKDAY_ORDER.map((d) => {
                              const on = form.weekdays.includes(d)
                              return (
                                <button
                                  key={d}
                                  type="button"
                                  onClick={() =>
                                    setForm((f) => ({
                                      ...f,
                                      weekdays: f.weekdays.includes(d) ? f.weekdays.filter((x) => x !== d) : [...f.weekdays, d],
                                    }))
                                  }
                                  style={{
                                    minWidth: 44,
                                    padding: '7px 9px',
                                    borderRadius: 9,
                                    fontSize: 12,
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    color: on ? '#fff' : TEXT,
                                    background: on ? BRAND : '#F8FAFC',
                                    border: `1px solid ${on ? 'transparent' : BORDER}`,
                                  }}
                                >
                                  {DAY_SHORT[d]}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      <div>
                        <label style={labelStyle}>
                          Termina el <span style={{ textTransform: 'none', fontWeight: 600, color: '#B0B7C3' }}>· opcional (vacío = sin fin)</span>
                        </label>
                        <input
                          type="datetime-local"
                          value={form.repeatUntil}
                          min={form.scheduledAt || undefined}
                          onChange={(e) => setForm((f) => ({ ...f, repeatUntil: e.target.value }))}
                          style={inputStyle}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Columna vista previa */}
              <div style={{ minWidth: 0 }}>
                <label style={labelStyle}>Vista previa</label>
                <div style={{ background: '#EFE7DE', borderRadius: 14, padding: 14, minHeight: 180, border: `1px solid ${BORDER}` }}>
                  <div style={{ maxWidth: '92%', marginLeft: 'auto', background: '#DCF8C6', borderRadius: 12, borderTopRightRadius: 4, padding: '9px 11px', boxShadow: '0 1px 1px rgba(0,0,0,0.08)' }}>
                    {selectedMedia && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'rgba(0,0,0,0.05)', borderRadius: 8, padding: '7px 9px', marginBottom: 7 }}>
                        <Paperclip size={13} style={{ color: '#233B8F' }} />
                        <span style={{ fontSize: 11.5, fontWeight: 700, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {MEDIA_LABEL[selectedMedia.type]} · {selectedMedia.title}
                        </span>
                      </div>
                    )}
                    <p style={{ fontSize: 12.5, color: '#111827', margin: 0, lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {form.useTemplate
                        ? ((templates.find((t) => t.name === form.templateName)?.body || 'Elegí una plantilla aprobada para ver el mensaje…').replace(/\{\{[^}]*\}\}/g, 'Marco'))
                        : (form.messageBody.trim() || 'Tu mensaje aparecerá aquí…')}
                    </p>
                    <p style={{ fontSize: 9.5, color: '#667781', margin: '6px 0 0', textAlign: 'right' }}>
                      {new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>

                {/* Resumen destinatarios */}
                <div style={{ marginTop: 12, background: '#F8FAFC', border: `1px solid ${BORDER}`, borderRadius: 12, padding: '11px 13px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
                    <Users size={14} style={{ color: '#233B8F' }} />
                    <span style={{ fontSize: 12, fontWeight: 800, color: TEXT }}>Destinatarios</span>
                  </div>
                  <p style={{ fontSize: 12, color: MUTED, margin: 0, lineHeight: 1.5 }}>
                    {estimatedTargets === null
                      ? 'Se calculará al guardar (segmento).'
                      : `${estimatedTargets} destinatario${estimatedTargets === 1 ? '' : 's'} seleccionado${estimatedTargets === 1 ? '' : 's'}.`}
                  </p>
                </div>

                <div style={{ marginTop: 10, display: 'flex', alignItems: 'flex-start', gap: 7, fontSize: 11, color: MUTED, lineHeight: 1.5 }}>
                  <Gauge size={13} style={{ color: '#147e95', flexShrink: 0, marginTop: 1 }} />
                  <span>La campaña quedará pendiente de aprobación. El envío real por WhatsApp se activa en la fase de integración.</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', gap: 10, padding: '14px 20px', borderTop: `1px solid ${BORDER}`, flexShrink: 0 }}>
              <button onClick={() => setBuilderOpen(false)} disabled={saving} style={{ flex: 1, padding: '10px 0', borderRadius: 11, background: '#F4F6FA', border: `1px solid ${BORDER}`, fontSize: 13, color: MUTED, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.5 : 1 }}>
                Cancelar
              </button>
              <button onClick={submitForm} disabled={saving} style={{ ...primaryBtn, flex: 1, opacity: saving ? 0.6 : 1, cursor: saving ? 'not-allowed' : 'pointer' }}>
                {saving ? <Loader2 size={15} className="animate-spin" /> : editingId ? <><Pencil size={14} /> Guardar cambios</> : <><Megaphone size={14} /> Crear campaña</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirmación de ejecución ───────────────────────────────── */}
      {runTarget && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(2px)' }} onClick={() => !running && setRunTarget(null)} />
          <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: 440, background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 18, padding: 24, boxShadow: '0 24px 60px rgba(17,24,39,0.28)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <div style={{ width: 54, height: 54, borderRadius: 15, background: BRAND, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14, boxShadow: '0 10px 24px rgba(183,53,184,0.28)' }}>
                <Send size={22} className="text-white" />
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 4px' }}>Ejecutar campaña</h3>
              <p style={{ fontSize: 13, fontWeight: 800, margin: '0 0 2px' }}>{runTarget.name}</p>
              <p style={{ fontSize: 12.5, color: MUTED, margin: '0 0 14px' }}>{runTarget.totalTargets} destinatario{runTarget.totalTargets === 1 ? '' : 's'}</p>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, width: '100%', background: 'rgba(35,59,143,0.06)', border: '1px solid rgba(35,59,143,0.18)', borderRadius: 11, padding: '10px 12px', marginBottom: 18, textAlign: 'left' }}>
                <Info size={14} style={{ color: '#233B8F', flexShrink: 0, marginTop: 2 }} />
                <p style={{ fontSize: 11.5, color: '#233B8F', margin: 0, lineHeight: 1.5 }}>
                  Este es un <strong>envío simulado</strong>: cada mensaje quedará registrado en el <strong>Historial</strong>, pero{' '}
                  <strong>el envío real por WhatsApp se activa en la fase de integración</strong>. No se contactará a nadie todavía.
                </p>
              </div>

              <div style={{ display: 'flex', gap: 10, width: '100%' }}>
                <button onClick={() => setRunTarget(null)} disabled={running} style={{ flex: 1, padding: '10px 0', borderRadius: 11, background: '#F4F6FA', border: `1px solid ${BORDER}`, fontSize: 13, color: MUTED, cursor: running ? 'not-allowed' : 'pointer', opacity: running ? 0.5 : 1 }}>
                  Cancelar
                </button>
                <button onClick={confirmRun} disabled={running} style={{ ...primaryBtn, flex: 1, opacity: running ? 0.6 : 1, cursor: running ? 'not-allowed' : 'pointer' }}>
                  {running ? <><Loader2 size={15} className="animate-spin" /> Enviando…</> : <><Send size={14} /> Ejecutar (simulado)</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirmación de eliminación ─────────────────────────────── */}
      {deleteTarget && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(2px)' }} onClick={() => !deleting && setDeleteTarget(null)} />
          <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: 400, background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 18, padding: 24, boxShadow: '0 24px 60px rgba(17,24,39,0.28)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <div style={{ width: 54, height: 54, borderRadius: 15, background: 'rgba(220,38,38,0.10)', border: '1px solid rgba(220,38,38,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                <Trash2 size={24} style={{ color: '#DC2626' }} />
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 4px' }}>Eliminar campaña</h3>
              <p style={{ fontSize: 14, fontWeight: 800, margin: '0 0 2px' }}>{deleteTarget.name}</p>
              <p style={{ fontSize: 12.5, color: MUTED, margin: '0 0 16px' }}>Esta acción es irreversible.</p>
              <div style={{ display: 'flex', gap: 10, width: '100%' }}>
                <button onClick={() => setDeleteTarget(null)} disabled={deleting} style={{ flex: 1, padding: '10px 0', borderRadius: 11, background: '#F4F6FA', border: `1px solid ${BORDER}`, fontSize: 13, color: MUTED, cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? 0.5 : 1 }}>
                  Cancelar
                </button>
                <button onClick={confirmDelete} disabled={deleting} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '10px 0', borderRadius: 11, background: '#DC2626', border: 'none', fontSize: 13, fontWeight: 800, color: '#fff', cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? 0.6 : 1 }}>
                  {deleting ? <Loader2 size={15} className="animate-spin" /> : <><Trash2 size={14} /> Eliminar</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Métrica compacta de tarjeta ────────────────────────────────────
function Metric({ label, value, color = TEXT }: { label: string; value: string | number; color?: string }) {
  return (
    <div>
      <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9CA3AF', margin: 0 }}>{label}</p>
      <p style={{ fontSize: 16, fontWeight: 800, margin: '2px 0 0', color }}>{value}</p>
    </div>
  )
}
