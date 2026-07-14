'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Trophy,
  Plus,
  Edit2,
  Trash2,
  Loader2,
  X,
  Check,
  Clock,
  Star,
  AlertTriangle,
  Power,
  ImagePlus,
} from 'lucide-react'

// ── Paleta MY DIAMOND ──────────────────────────────────────────────
const BRAND_GRADIENT = 'linear-gradient(135deg,#FF2D95,#B735B8,#233B8F)'
const BORDER = '#E4E9F0'
const TEXT = '#111827'
const MUTED = '#6B7280'

const EVIDENCE_TYPES = ['IMAGE', 'TEXT', 'NUMBER', 'LINK', 'DOCUMENT'] as const
type EvidenceType = (typeof EVIDENCE_TYPES)[number]
const EVIDENCE_LABEL: Record<EvidenceType, string> = {
  IMAGE: 'Imagen',
  TEXT: 'Texto',
  NUMBER: 'Número',
  LINK: 'Enlace',
  DOCUMENT: 'Documento',
}

// ── Tipos ──────────────────────────────────────────────────────────
interface Task {
  id: string
  challengeId: string
  title: string
  description: string
  evidenceType: string
  expectedKeywords: string[]
  points: number
  deadlineTime: string
  autoApproveMin: number
  requiresReview: boolean
  validExamples: string[]
  isActive: boolean
}

interface TaskForm {
  id?: string
  title: string
  description: string
  evidenceType: EvidenceType
  expectedKeywords: string   // coma-separado
  points: string
  deadlineTime: string       // "HH:mm"
  autoApproveMin: string     // "0"–"1"
  requiresReview: boolean
  validExamples: string[]    // URLs públicas de imágenes de referencia
  isActive: boolean
}

const EMPTY_FORM: TaskForm = {
  title: '',
  description: '',
  evidenceType: 'IMAGE',
  expectedKeywords: '',
  points: '10',
  deadlineTime: '21:00',
  autoApproveMin: '0.85',
  requiresReview: false,
  validExamples: [],
  isActive: true,
}

// ── Sub-navegación del módulo ──────────────────────────────────────
const SUBNAV = [
  { href: '/admin/reto-90d', label: 'Resumen', exact: true },
  { href: '/admin/reto-90d/tablero', label: 'Tablero' },
  { href: '/admin/reto-90d/tareas', label: 'Tareas' },
  { href: '/admin/reto-90d/usuarios', label: 'Usuarios' },
  { href: '/admin/reto-90d/evidencias', label: 'Evidencias' },
  { href: '/admin/reto-90d/reportes', label: 'Reportes' },
  { href: '/admin/reto-90d/configuracion', label: 'Configuración' },
]

function SubNav() {
  const pathname = usePathname()
  return (
    <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, marginBottom: 20 }}>
      {SUBNAV.map(item => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            style={{
              flexShrink: 0,
              padding: '7px 16px',
              borderRadius: 999,
              fontSize: 13,
              fontWeight: 700,
              textDecoration: 'none',
              whiteSpace: 'nowrap',
              border: active ? 'none' : `1px solid ${BORDER}`,
              background: active ? BRAND_GRADIENT : '#fff',
              color: active ? '#fff' : MUTED,
              boxShadow: active ? '0 8px 20px rgba(183,53,184,0.22)' : 'none',
            }}
          >
            {item.label}
          </Link>
        )
      })}
    </div>
  )
}

// ── Estilos de input reutilizables ────────────────────────────────
const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 11px',
  borderRadius: 10,
  fontSize: 13,
  color: TEXT,
  background: '#fff',
  border: `1px solid ${BORDER}`,
  outline: 'none',
  boxSizing: 'border-box',
}
const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: MUTED, display: 'block', marginBottom: 6 }

function splitList(v: string): string[] {
  return v
    .split(/[\n,]/)
    .map(s => s.trim())
    .filter(Boolean)
}

export default function AdminReto90dTasksPage() {
  const [challengeId, setChallengeId] = useState<string | null>(null)
  const [challengeName, setChallengeName] = useState<string | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [modal, setModal] = useState<{ mode: 'create' | 'edit'; data: TaskForm } | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  // Subida de imágenes de referencia
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [uploadingCount, setUploadingCount] = useState(0)
  const [uploadError, setUploadError] = useState<string | null>(null)

  async function handleUploadFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setUploadError(null)
    const list = Array.from(files)
    setUploadingCount(c => c + list.length)
    for (const file of list) {
      try {
        if (!file.type.startsWith('image/')) throw new Error('Solo se permiten imágenes')
        const fd = new FormData()
        fd.append('file', file)
        const r = await fetch('/api/admin/reto-90d/upload', { method: 'POST', body: fd })
        const j = await r.json().catch(() => ({}))
        if (!r.ok || !j.url) throw new Error(j.error ?? `Error ${r.status} al subir la imagen`)
        setModal(prev => (prev ? { ...prev, data: { ...prev.data, validExamples: [...prev.data.validExamples, j.url as string] } } : prev))
      } catch (e) {
        setUploadError(e instanceof Error ? e.message : 'No se pudo subir la imagen.')
      } finally {
        setUploadingCount(c => Math.max(0, c - 1))
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function removeExample(url: string) {
    setModal(prev => (prev ? { ...prev, data: { ...prev.data, validExamples: prev.data.validExamples.filter(u => u !== url) } } : prev))
  }

  // 1) Obtener el reto activo
  async function resolveActiveChallenge(): Promise<string | null> {
    const r = await fetch('/api/admin/reto-90d/challenges')
    if (!r.ok) {
      const j = await r.json().catch(() => ({}))
      throw new Error(j.error ?? `Error ${r.status} al obtener el reto activo`)
    }
    const d = await r.json()
    const list: Array<{ id: string; name?: string; isActive?: boolean }> = d.challenges ?? d.items ?? []
    const activeId: string | null =
      d.activeId ?? d.activeChallengeId ?? list.find(c => c.isActive)?.id ?? list[0]?.id ?? null
    const active = list.find(c => c.id === activeId)
    if (active?.name) setChallengeName(active.name)
    else if (d.activeChallenge?.name) setChallengeName(d.activeChallenge.name)
    return activeId
  }

  // 2) Cargar tareas del reto activo
  async function load() {
    setLoading(true)
    setError(null)
    try {
      const id = await resolveActiveChallenge()
      setChallengeId(id)
      if (!id) {
        setTasks([])
        return
      }
      const r = await fetch(`/api/admin/reto-90d/tasks?challengeId=${encodeURIComponent(id)}`)
      if (!r.ok) {
        const j = await r.json().catch(() => ({}))
        throw new Error(j.error ?? `Error ${r.status} al cargar las tareas`)
      }
      const d = await r.json()
      setTasks(d.tasks ?? d.items ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar las tareas.')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  function openCreate() {
    setSaveError(null)
    setUploadError(null)
    setModal({ mode: 'create', data: { ...EMPTY_FORM, validExamples: [] } })
  }
  function openEdit(t: Task) {
    setSaveError(null)
    setUploadError(null)
    setModal({
      mode: 'edit',
      data: {
        id: t.id,
        title: t.title,
        description: t.description ?? '',
        evidenceType: (EVIDENCE_TYPES.includes(t.evidenceType as EvidenceType) ? t.evidenceType : 'IMAGE') as EvidenceType,
        expectedKeywords: (t.expectedKeywords ?? []).join(', '),
        points: String(t.points ?? 0),
        deadlineTime: t.deadlineTime ?? '21:00',
        autoApproveMin: String(t.autoApproveMin ?? 0.85),
        requiresReview: !!t.requiresReview,
        validExamples: t.validExamples ?? [],
        isActive: !!t.isActive,
      },
    })
  }

  async function handleSave() {
    if (!modal) return
    const { data, mode } = modal
    if (!data.title.trim()) { setSaveError('El título es obligatorio.'); return }
    if (!challengeId) { setSaveError('No hay un reto activo al que asociar la tarea.'); return }

    let autoApprove = Number(data.autoApproveMin)
    if (isNaN(autoApprove)) autoApprove = 0.85
    autoApprove = Math.min(1, Math.max(0, autoApprove))

    const body = {
      ...(mode === 'edit' && data.id ? { id: data.id } : {}),
      challengeId,
      title: data.title.trim(),
      description: data.description.trim(),
      evidenceType: data.evidenceType,
      expectedKeywords: splitList(data.expectedKeywords),
      points: Number(data.points) || 0,
      deadlineTime: data.deadlineTime || '21:00',
      autoApproveMin: autoApprove,
      requiresReview: data.requiresReview,
      validExamples: data.validExamples,
      isActive: data.isActive,
    }

    setSaving(true)
    setSaveError(null)
    try {
      const url = mode === 'edit' && data.id
        ? `/api/admin/reto-90d/tasks/${data.id}`
        : '/api/admin/reto-90d/tasks'
      const r = await fetch(url, {
        method: mode === 'edit' ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(j.error ?? `Error ${r.status}`)
      setModal(null)
      load()
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'No se pudo guardar la tarea.')
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(t: Task) {
    setTogglingId(t.id)
    setActionError(null)
    // Cambio optimista: reflejamos el nuevo estado de inmediato
    const next = !t.isActive
    setTasks(prev => prev.map(x => (x.id === t.id ? { ...x, isActive: next } : x)))
    try {
      const res = await fetch(`/api/admin/reto-90d/tasks/${t.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: next }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error ?? `Error ${res.status}`)
      }
    } catch (e) {
      // Revertir el cambio optimista si no se persistió
      setTasks(prev => prev.map(x => (x.id === t.id ? { ...x, isActive: t.isActive } : x)))
      setActionError(e instanceof Error ? e.message : 'No se pudo cambiar el estado de la tarea.')
    } finally {
      setTogglingId(null)
    }
  }

  async function handleDelete() {
    if (!deleteId) return
    setDeleting(true)
    setDeleteError(null)
    try {
      const res = await fetch(`/api/admin/reto-90d/tasks/${deleteId}`, { method: 'DELETE' })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error ?? `Error ${res.status}`)
      }
      setDeleteId(null)
      load()
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : 'No se pudo eliminar la tarea.')
    } finally {
      setDeleting(false)
    }
  }

  const cardStyle: React.CSSProperties = {
    background: '#fff',
    border: `1px solid ${BORDER}`,
    borderRadius: 16,
    padding: 18,
    boxShadow: '0 1px 3px rgba(17,24,39,0.04)',
  }

  return (
    <div className="font-ui" style={{ color: TEXT }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: BRAND_GRADIENT, boxShadow: '0 10px 24px rgba(255,45,149,0.28)' }}>
          <Trophy size={19} className="text-white" />
        </div>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.01em', margin: 0 }}>Reto 90D</h1>
          <p style={{ fontSize: 12, color: MUTED, margin: 0 }}>Tareas diarias{challengeName ? ` · ${challengeName}` : ''}</p>
        </div>
      </div>
      <div className="h-px w-full my-4" style={{ background: BORDER }} />

      <SubNav />

      {/* Barra superior */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <p style={{ fontSize: 13, color: MUTED, margin: 0 }}>
          {loading ? 'Cargando…' : `${tasks.length} tarea${tasks.length === 1 ? '' : 's'}`}
        </p>
        <button
          onClick={openCreate}
          disabled={loading || !challengeId}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 10, fontSize: 13, fontWeight: 700, background: BRAND_GRADIENT, color: '#fff', border: 'none', cursor: loading || !challengeId ? 'not-allowed' : 'pointer', opacity: loading || !challengeId ? 0.5 : 1, boxShadow: '0 8px 20px rgba(255,45,149,0.24)' }}
        >
          <Plus size={15} /> Nueva tarea
        </button>
      </div>

      {/* Aviso de error de acción (activar/desactivar) */}
      {actionError && (
        <div style={{ ...cardStyle, marginBottom: 12, padding: '12px 16px', borderColor: 'rgba(220,38,38,0.3)', background: 'rgba(220,38,38,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <p style={{ fontSize: 13, color: '#DC2626', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
            <AlertTriangle size={14} /> {actionError}
          </p>
          <button onClick={() => setActionError(null)} aria-label="Cerrar aviso" style={{ background: 'none', border: 'none', color: MUTED, cursor: 'pointer', display: 'flex' }}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Contenido */}
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 size={22} className="animate-spin" style={{ color: MUTED }} /></div>
      ) : error ? (
        <div style={{ ...cardStyle, borderColor: 'rgba(220,38,38,0.3)', background: 'rgba(220,38,38,0.04)' }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#DC2626', margin: 0 }}>No se pudieron cargar las tareas</p>
          <p style={{ fontSize: 13, color: MUTED, marginTop: 6, marginBottom: 12 }}>{error}</p>
          <button onClick={load} style={{ padding: '8px 16px', borderRadius: 10, fontSize: 13, fontWeight: 700, background: BRAND_GRADIENT, border: 'none', color: '#fff', cursor: 'pointer' }}>Reintentar</button>
        </div>
      ) : !challengeId ? (
        <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(217,119,6,0.05)', borderColor: 'rgba(217,119,6,0.25)' }}>
          <AlertTriangle size={20} style={{ color: '#D97706', flexShrink: 0 }} />
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>No hay un reto activo</p>
            <p style={{ fontSize: 13, color: MUTED, margin: '2px 0 0' }}>Activa un reto en Configuración para poder crear tareas.</p>
          </div>
        </div>
      ) : tasks.length === 0 ? (
        <div style={{ ...cardStyle, textAlign: 'center', padding: '48px 18px' }}>
          <p style={{ fontSize: 14, color: MUTED, margin: 0 }}>Aún no hay tareas. Crea la primera con “Nueva tarea”.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {tasks.map(t => (
            <div key={t.id} style={{ ...cardStyle, opacity: t.isActive ? 1 : 0.62 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Título + estado */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
                    <span style={{ fontSize: 15, fontWeight: 800 }}>{t.title}</span>
                    <span style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', padding: '3px 9px', borderRadius: 999, color: t.isActive ? '#16A34A' : MUTED, background: t.isActive ? 'rgba(22,163,74,0.10)' : '#F0F3F7' }}>
                      {t.isActive ? 'Activa' : 'Inactiva'}
                    </span>
                    {t.requiresReview && (
                      <span style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', padding: '3px 9px', borderRadius: 999, color: '#233B8F', background: 'rgba(35,59,143,0.10)' }}>
                        Requiere revisión
                      </span>
                    )}
                  </div>

                  {t.description && (
                    <p style={{ fontSize: 13, color: MUTED, margin: '0 0 10px', lineHeight: 1.5 }}>{t.description}</p>
                  )}

                  {/* Meta chips */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: t.expectedKeywords?.length ? 10 : 0 }}>
                    <span style={metaChip}>
                      {EVIDENCE_LABEL[(t.evidenceType as EvidenceType)] ?? t.evidenceType}
                    </span>
                    <span style={metaChip}><Star size={12} style={{ color: '#B735B8' }} /> {t.points} pts</span>
                    <span style={metaChip}><Clock size={12} style={{ color: '#233B8F' }} /> {t.deadlineTime}</span>
                    <span style={metaChip}>Auto-aprob. {Math.round((t.autoApproveMin ?? 0) * 100)}%</span>
                  </div>

                  {/* Keywords */}
                  {t.expectedKeywords?.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {t.expectedKeywords.map((k, i) => (
                        <span key={i} style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 999, color: '#B735B8', background: 'rgba(183,53,184,0.08)', border: '1px solid rgba(183,53,184,0.16)' }}>
                          {k}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Acciones */}
                <div style={{ display: 'flex', flexShrink: 0, gap: 6 }}>
                  <button
                    onClick={() => toggleActive(t)}
                    disabled={togglingId === t.id}
                    title={t.isActive ? 'Desactivar' : 'Activar'}
                    style={{ padding: '7px 9px', borderRadius: 9, background: t.isActive ? 'rgba(22,163,74,0.08)' : '#F0F3F7', border: `1px solid ${t.isActive ? 'rgba(22,163,74,0.2)' : BORDER}`, cursor: 'pointer', display: 'flex' }}
                  >
                    {togglingId === t.id
                      ? <Loader2 size={14} className="animate-spin" style={{ color: MUTED }} />
                      : <Power size={14} style={{ color: t.isActive ? '#16A34A' : MUTED }} />}
                  </button>
                  <button onClick={() => openEdit(t)} title="Editar" style={{ padding: '7px 9px', borderRadius: 9, background: '#F0F3F7', border: `1px solid ${BORDER}`, cursor: 'pointer', display: 'flex' }}>
                    <Edit2 size={14} style={{ color: MUTED }} />
                  </button>
                  <button onClick={() => { setDeleteError(null); setDeleteId(t.id) }} title="Eliminar" style={{ padding: '7px 9px', borderRadius: 9, background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)', cursor: 'pointer', display: 'flex' }}>
                    <Trash2 size={14} style={{ color: '#DC2626' }} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirmar eliminación */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(17,24,39,0.45)', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 18, padding: 24, width: '100%', maxWidth: 360, boxShadow: '0 24px 60px rgba(17,24,39,0.2)' }}>
            <p style={{ fontSize: 16, fontWeight: 800, margin: '0 0 8px' }}>¿Eliminar tarea?</p>
            <p style={{ fontSize: 13, color: MUTED, margin: '0 0 20px' }}>Esta acción no se puede deshacer.</p>
            {deleteError && (
              <p style={{ fontSize: 12.5, color: '#DC2626', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 6 }}>
                <AlertTriangle size={14} /> {deleteError}
              </p>
            )}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setDeleteId(null)} style={{ flex: 1, padding: '10px 0', borderRadius: 10, fontSize: 13, fontWeight: 600, background: '#F0F3F7', border: `1px solid ${BORDER}`, color: MUTED, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={handleDelete} disabled={deleting} style={{ flex: 1, padding: '10px 0', borderRadius: 10, fontSize: 13, fontWeight: 700, background: deleting ? 'rgba(220,38,38,0.4)' : '#DC2626', border: 'none', color: '#fff', cursor: deleting ? 'not-allowed' : 'pointer' }}>
                {deleting ? <Loader2 size={14} className="animate-spin mx-auto" /> : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal crear / editar */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(17,24,39,0.45)', backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) setModal(null) }}>
          <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 20, padding: 24, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 60px rgba(17,24,39,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ fontSize: 17, fontWeight: 800, margin: 0 }}>{modal.mode === 'create' ? 'Nueva tarea' : 'Editar tarea'}</h3>
              <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', color: MUTED, cursor: 'pointer', display: 'flex' }}><X size={19} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
              {/* Título */}
              <div>
                <label htmlFor="task-title" style={labelStyle}>Título *</label>
                <input id="task-title" type="text" value={modal.data.title} onChange={e => setModal({ ...modal, data: { ...modal.data, title: e.target.value } })}
                  placeholder="Ej. Publicar historia en Instagram" style={inputStyle} />
              </div>

              {/* Descripción */}
              <div>
                <label htmlFor="task-description" style={labelStyle}>Descripción</label>
                <textarea id="task-description" value={modal.data.description} onChange={e => setModal({ ...modal, data: { ...modal.data, description: e.target.value } })}
                  rows={3} placeholder="Explica qué debe hacer el participante…" style={{ ...inputStyle, resize: 'vertical' }} />
              </div>

              {/* Tipo de evidencia + Puntos */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label htmlFor="task-evidence-type" style={labelStyle}>Tipo de evidencia</label>
                  <select id="task-evidence-type" value={modal.data.evidenceType} onChange={e => setModal({ ...modal, data: { ...modal.data, evidenceType: e.target.value as EvidenceType } })} style={inputStyle}>
                    {EVIDENCE_TYPES.map(t => <option key={t} value={t}>{EVIDENCE_LABEL[t]}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="task-points" style={labelStyle}>Puntos</label>
                  <input id="task-points" type="number" min={0} value={modal.data.points} onChange={e => setModal({ ...modal, data: { ...modal.data, points: e.target.value } })} style={inputStyle} />
                </div>
              </div>

              {/* Hora límite + Auto-aprobación */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label htmlFor="task-deadline" style={labelStyle}>Hora límite</label>
                  <input id="task-deadline" type="time" value={modal.data.deadlineTime} onChange={e => setModal({ ...modal, data: { ...modal.data, deadlineTime: e.target.value } })} style={inputStyle} />
                </div>
                <div>
                  <label htmlFor="task-autoapprove" style={labelStyle}>Umbral auto-aprobación (0–1)</label>
                  <input id="task-autoapprove" type="number" min={0} max={1} step={0.05} value={modal.data.autoApproveMin} onChange={e => setModal({ ...modal, data: { ...modal.data, autoApproveMin: e.target.value } })} style={inputStyle} />
                </div>
              </div>

              {/* Palabras clave */}
              <div>
                <label htmlFor="task-keywords" style={labelStyle}>Palabras clave esperadas (separadas por coma)</label>
                <input id="task-keywords" type="text" value={modal.data.expectedKeywords} onChange={e => setModal({ ...modal, data: { ...modal.data, expectedKeywords: e.target.value } })}
                  placeholder="historia, instagram, producto" style={inputStyle} />
                {splitList(modal.data.expectedKeywords).length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                    {splitList(modal.data.expectedKeywords).map((k, i) => (
                      <span key={i} style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 999, color: '#B735B8', background: 'rgba(183,53,184,0.08)', border: '1px solid rgba(183,53,184,0.16)' }}>{k}</span>
                    ))}
                  </div>
                )}
              </div>

              {/* Imágenes de referencia (para la IA) */}
              <div>
                <label style={labelStyle}>Imágenes de referencia (para que la IA compare y sea precisa)</label>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  style={{ display: 'none' }}
                  onChange={e => handleUploadFiles(e.target.files)}
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingCount > 0}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 7,
                    padding: '9px 14px',
                    borderRadius: 10,
                    fontSize: 13,
                    fontWeight: 700,
                    background: uploadingCount > 0 ? '#F0F3F7' : BRAND_GRADIENT,
                    color: uploadingCount > 0 ? MUTED : '#fff',
                    border: uploadingCount > 0 ? `1px solid ${BORDER}` : 'none',
                    cursor: uploadingCount > 0 ? 'not-allowed' : 'pointer',
                    boxShadow: uploadingCount > 0 ? 'none' : '0 8px 20px rgba(255,45,149,0.20)',
                  }}
                >
                  {uploadingCount > 0
                    ? <><Loader2 size={14} className="animate-spin" /> Subiendo…</>
                    : <><ImagePlus size={15} /> Subir imagen</>}
                </button>

                {uploadError && (
                  <p style={{ fontSize: 12.5, color: '#DC2626', margin: '10px 0 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <AlertTriangle size={14} /> {uploadError}
                  </p>
                )}

                {modal.data.validExamples.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                    {modal.data.validExamples.map((url, i) => (
                      <div key={`${url}-${i}`} style={{ position: 'relative', width: 72, height: 72 }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url}
                          alt={`Referencia ${i + 1}`}
                          style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 10, border: `1px solid ${BORDER}`, display: 'block' }}
                        />
                        <button
                          type="button"
                          onClick={() => removeExample(url)}
                          title="Quitar imagen"
                          style={{
                            position: 'absolute',
                            top: -6,
                            right: -6,
                            width: 20,
                            height: 20,
                            borderRadius: 999,
                            background: '#DC2626',
                            border: '2px solid #fff',
                            color: '#fff',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 0,
                            boxShadow: '0 2px 6px rgba(17,24,39,0.25)',
                          }}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Switches */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label style={{ fontSize: 13, color: TEXT, fontWeight: 600 }}>Requiere revisión manual</label>
                  <button type="button" onClick={() => setModal({ ...modal, data: { ...modal.data, requiresReview: !modal.data.requiresReview } })}
                    aria-pressed={modal.data.requiresReview}
                    aria-label="Requiere revisión manual"
                    style={{ width: 46, height: 26, borderRadius: 999, border: 'none', cursor: 'pointer', position: 'relative', background: modal.data.requiresReview ? BRAND_GRADIENT : '#D1D9E4', transition: 'background 0.15s' }}>
                    <span style={{ position: 'absolute', top: 3, left: modal.data.requiresReview ? 23 : 3, width: 20, height: 20, borderRadius: 999, background: '#fff', transition: 'left 0.15s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                  </button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label style={{ fontSize: 13, color: TEXT, fontWeight: 600 }}>Tarea activa</label>
                  <button type="button" onClick={() => setModal({ ...modal, data: { ...modal.data, isActive: !modal.data.isActive } })}
                    aria-pressed={modal.data.isActive}
                    aria-label="Tarea activa"
                    style={{ width: 46, height: 26, borderRadius: 999, border: 'none', cursor: 'pointer', position: 'relative', background: modal.data.isActive ? BRAND_GRADIENT : '#D1D9E4', transition: 'background 0.15s' }}>
                    <span style={{ position: 'absolute', top: 3, left: modal.data.isActive ? 23 : 3, width: 20, height: 20, borderRadius: 999, background: '#fff', transition: 'left 0.15s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                  </button>
                </div>
              </div>

              {saveError && (
                <p style={{ fontSize: 12.5, color: '#DC2626', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <AlertTriangle size={14} /> {saveError}
                </p>
              )}

              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button onClick={() => setModal(null)} style={{ flex: 1, padding: '11px 0', borderRadius: 10, fontSize: 13, fontWeight: 600, background: '#F0F3F7', border: `1px solid ${BORDER}`, color: MUTED, cursor: 'pointer' }}>Cancelar</button>
                <button onClick={handleSave} disabled={saving} style={{ flex: 2, padding: '11px 0', borderRadius: 10, fontSize: 13, fontWeight: 700, background: saving ? 'rgba(183,53,184,0.4)' : BRAND_GRADIENT, border: 'none', color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                  {saving ? <><Loader2 size={14} className="animate-spin" /> Guardando…</> : <><Check size={15} /> {modal.mode === 'create' ? 'Crear tarea' : 'Guardar cambios'}</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const metaChip: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 5,
  fontSize: 11.5,
  fontWeight: 600,
  color: MUTED,
  padding: '4px 10px',
  borderRadius: 999,
  background: '#F5F7FA',
  border: `1px solid ${BORDER}`,
}
