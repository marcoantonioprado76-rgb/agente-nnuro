'use client'

import { useCallback, useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import {
  Contact as ContactIcon,
  UserPlus,
  Search,
  MapPin,
  Tag,
  Check,
  X,
  Pencil,
  Trash2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Filter,
} from 'lucide-react'
import { PageHeader, BRAND, BORDER, TEXT, MUTED } from '../_ui'

// ── Tipos ──────────────────────────────────────────────────────────
type ContactStatus = 'ACTIVE' | 'INACTIVE' | 'BLOCKED'

interface ContactRow {
  id: string
  name: string | null
  phone: string
  country: string | null
  city: string | null
  sponsor: string | null
  tag: string | null
  status: ContactStatus
  optIn: boolean
  optInAt: string | null
  joinedAt: string
  lastInteractionAt: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

interface ContactForm {
  name: string
  phone: string
  country: string
  city: string
  sponsor: string
  tag: string
  status: ContactStatus
  optIn: boolean
  notes: string
}

const EMPTY_FORM: ContactForm = {
  name: '', phone: '', country: '', city: '', sponsor: '', tag: '',
  status: 'ACTIVE', optIn: true, notes: '',
}

const STATUS_LABEL: Record<ContactStatus, string> = {
  ACTIVE: 'Activo',
  INACTIVE: 'Inactivo',
  BLOCKED: 'Bloqueado',
}

const STATUS_STYLE: Record<ContactStatus, { color: string; bg: string; border: string }> = {
  ACTIVE: { color: '#16A34A', bg: 'rgba(22,163,74,0.10)', border: 'rgba(22,163,74,0.25)' },
  INACTIVE: { color: '#6B7280', bg: 'rgba(107,114,128,0.10)', border: 'rgba(107,114,128,0.22)' },
  BLOCKED: { color: '#DC2626', bg: 'rgba(220,38,38,0.10)', border: 'rgba(220,38,38,0.25)' },
}

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

const thStyle: CSSProperties = {
  textAlign: 'left',
  padding: '11px 14px',
  fontSize: 10,
  fontWeight: 800,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: MUTED,
  whiteSpace: 'nowrap',
}

const tdStyle: CSSProperties = {
  padding: '11px 14px',
  fontSize: 13,
  color: TEXT,
  verticalAlign: 'middle',
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function DiamondAssistantContactos() {
  const [contacts, setContacts] = useState<ContactRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'' | ContactStatus>('')
  const [tagFilter, setTagFilter] = useState('')

  // Modal crear / editar
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<ContactForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Modal eliminar
  const [deleteTarget, setDeleteTarget] = useState<ContactRow | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchContacts = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ page: String(page) })
      if (search.trim()) params.set('q', search.trim())
      if (statusFilter) params.set('status', statusFilter)
      if (tagFilter.trim()) params.set('tag', tagFilter.trim())
      const res = await fetch(`/api/admin/diamond-assistant/contacts?${params}`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? 'No se pudieron cargar los contactos.')
        setContacts([])
        return
      }
      const data = await res.json()
      setContacts(data.contacts ?? [])
      setTotal(data.total ?? 0)
      setTotalPages(data.pages ?? 1)
    } catch {
      setError('Error de conexión al cargar los contactos.')
      setContacts([])
    } finally {
      setLoading(false)
    }
  }, [page, search, statusFilter, tagFilter])

  useEffect(() => {
    const t = setTimeout(fetchContacts, 300)
    return () => clearTimeout(t)
  }, [fetchContacts])

  function openCreate() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setFormError(null)
    setModalOpen(true)
  }

  function openEdit(row: ContactRow) {
    setEditingId(row.id)
    setForm({
      name: row.name ?? '',
      phone: row.phone,
      country: row.country ?? '',
      city: row.city ?? '',
      sponsor: row.sponsor ?? '',
      tag: row.tag ?? '',
      status: row.status,
      optIn: row.optIn,
      notes: row.notes ?? '',
    })
    setFormError(null)
    setModalOpen(true)
  }

  async function submitForm() {
    if (!form.phone.trim()) {
      setFormError('El celular es obligatorio.')
      return
    }
    setSaving(true)
    setFormError(null)
    try {
      const url = editingId
        ? `/api/admin/diamond-assistant/contacts/${editingId}`
        : '/api/admin/diamond-assistant/contacts'
      const res = await fetch(url, {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setFormError(data.error ?? 'No se pudo guardar el contacto.')
        return
      }
      setModalOpen(false)
      // Al crear, volver a la primera página para ver el nuevo contacto arriba.
      if (!editingId && page !== 1) setPage(1)
      else await fetchContacts()
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
      const res = await fetch(`/api/admin/diamond-assistant/contacts/${deleteTarget.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        alert(data.error ?? 'No se pudo eliminar el contacto.')
        return
      }
      setDeleteTarget(null)
      // Si borramos el último de la página, retroceder una página.
      if (contacts.length === 1 && page > 1) setPage(p => p - 1)
      else await fetchContacts()
    } catch {
      alert('Error de conexión al eliminar.')
    } finally {
      setDeleting(false)
    }
  }

  const hasFilters = Boolean(search.trim() || statusFilter || tagFilter.trim())
  // Etiquetas presentes en la página actual (para autocompletar el filtro).
  const tagOptions = Array.from(
    new Set(contacts.map(c => c.tag).filter((t): t is string => Boolean(t)))
  )

  return (
    <div className="font-ui" style={{ color: TEXT }}>
      <PageHeader
        icon={ContactIcon}
        title="Contactos"
        description="Base de datos de personas alcanzables por el centro de comunicación"
        action={
          <button
            onClick={openCreate}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 16px',
              borderRadius: 10, fontSize: 13, fontWeight: 800, color: '#fff', background: BRAND,
              border: 'none', cursor: 'pointer', boxShadow: '0 8px 20px rgba(183,53,184,0.22)',
            }}
          >
            <UserPlus size={15} /> Nuevo contacto
          </button>
        }
      />

      {/* ── Barra de búsqueda + filtros ─────────────────────────────── */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
        <div style={{ position: 'relative', flex: '1 1 240px', minWidth: 200 }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
          <input
            type="text"
            placeholder="Buscar por nombre o celular…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            style={{ ...inputStyle, paddingLeft: 36, height: 40 }}
          />
        </div>

        <div style={{ position: 'relative', flex: '0 1 200px', minWidth: 160 }}>
          <Tag size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
          <input
            type="text"
            list="da-tag-options"
            placeholder="Filtrar etiqueta…"
            value={tagFilter}
            onChange={e => { setTagFilter(e.target.value); setPage(1) }}
            style={{ ...inputStyle, paddingLeft: 34, height: 40 }}
          />
          <datalist id="da-tag-options">
            {tagOptions.map(t => <option key={t} value={t} />)}
          </datalist>
        </div>

        <div style={{ position: 'relative', flex: '0 1 180px', minWidth: 150 }}>
          <Filter size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', pointerEvents: 'none' }} />
          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value as '' | ContactStatus); setPage(1) }}
            style={{ ...inputStyle, paddingLeft: 34, height: 40, cursor: 'pointer', appearance: 'none' }}
          >
            <option value="">Todos los estados</option>
            <option value="ACTIVE">Activo</option>
            <option value="INACTIVE">Inactivo</option>
            <option value="BLOCKED">Bloqueado</option>
          </select>
        </div>
      </div>

      {/* ── Tabla ───────────────────────────────────────────────────── */}
      <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 3px rgba(17,24,39,0.04)' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '64px 0' }}>
            <Loader2 size={22} className="animate-spin" style={{ color: '#147e95' }} />
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '56px 16px' }}>
            <AlertTriangle size={26} style={{ color: '#DC2626', margin: '0 auto 10px' }} />
            <p style={{ fontSize: 13, color: '#DC2626', fontWeight: 700, margin: 0 }}>{error}</p>
            <button
              onClick={fetchContacts}
              style={{ marginTop: 12, padding: '7px 14px', borderRadius: 9, fontSize: 12, fontWeight: 700, color: TEXT, background: '#F4F6FA', border: `1px solid ${BORDER}`, cursor: 'pointer' }}
            >
              Reintentar
            </button>
          </div>
        ) : contacts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '56px 16px' }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(183,53,184,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <ContactIcon size={24} style={{ color: '#147e95' }} />
            </div>
            <p style={{ fontSize: 14, fontWeight: 800, margin: 0 }}>
              {hasFilters ? 'Sin resultados' : 'Aún no hay contactos'}
            </p>
            <p style={{ fontSize: 12.5, color: MUTED, margin: '4px 0 16px' }}>
              {hasFilters
                ? 'Prueba con otra búsqueda o cambia los filtros.'
                : 'Crea tu primer contacto para empezar a construir la base de datos.'}
            </p>
            {!hasFilters && (
              <button
                onClick={openCreate}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 10, fontSize: 13, fontWeight: 800, color: '#fff', background: BRAND, border: 'none', cursor: 'pointer', boxShadow: '0 8px 20px rgba(183,53,184,0.22)' }}
              >
                <UserPlus size={15} /> Nuevo contacto
              </button>
            )}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}`, background: '#FBFCFE' }}>
                  <th style={thStyle}>Nombre</th>
                  <th style={thStyle}>Celular</th>
                  <th style={thStyle}>País / Ciudad</th>
                  <th style={thStyle}>Sponsor</th>
                  <th style={thStyle}>Etiqueta</th>
                  <th style={thStyle}>Estado</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Opt-in</th>
                  <th style={thStyle}>Última interacción</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map(c => {
                  const st = STATUS_STYLE[c.status]
                  return (
                    <tr key={c.id} style={{ borderBottom: `1px solid ${BORDER}` }}>
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(183,53,184,0.12)', border: '1px solid rgba(183,53,184,0.20)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: '#147e95', flexShrink: 0 }}>
                            {(c.name?.trim()?.charAt(0) ?? '#').toUpperCase()}
                          </div>
                          <span style={{ fontWeight: 700, color: c.name ? TEXT : '#9CA3AF' }}>
                            {c.name ?? 'Sin nombre'}
                          </span>
                        </div>
                      </td>
                      <td style={{ ...tdStyle, fontFamily: 'ui-monospace, monospace', fontSize: 12.5 }}>{c.phone}</td>
                      <td style={tdStyle}>
                        {c.country || c.city ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: MUTED }}>
                            <MapPin size={12} style={{ color: '#147e95' }} />
                            {[c.country, c.city].filter(Boolean).join(' · ')}
                          </span>
                        ) : (
                          <span style={{ color: '#9CA3AF' }}>—</span>
                        )}
                      </td>
                      <td style={{ ...tdStyle, color: c.sponsor ? TEXT : '#9CA3AF' }}>{c.sponsor ?? '—'}</td>
                      <td style={tdStyle}>
                        {c.tag ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 999, color: '#147e95', background: 'rgba(183,53,184,0.10)', border: '1px solid rgba(183,53,184,0.20)' }}>
                            <Tag size={10} /> {c.tag}
                          </span>
                        ) : (
                          <span style={{ color: '#9CA3AF' }}>—</span>
                        )}
                      </td>
                      <td style={tdStyle}>
                        <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 999, color: st.color, background: st.bg, border: `1px solid ${st.border}` }}>
                          {STATUS_LABEL[c.status]}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        {c.optIn ? (
                          <Check size={16} style={{ color: '#16A34A' }} aria-label="Sí" />
                        ) : (
                          <X size={16} style={{ color: '#DC2626' }} aria-label="No" />
                        )}
                      </td>
                      <td style={{ ...tdStyle, color: c.lastInteractionAt ? MUTED : '#9CA3AF', whiteSpace: 'nowrap' }}>
                        {fmtDate(c.lastInteractionAt)}
                      </td>
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                          <button
                            onClick={() => openEdit(c)}
                            title="Editar"
                            style={{ padding: 7, borderRadius: 9, background: 'rgba(35,59,143,0.08)', border: '1px solid rgba(35,59,143,0.18)', cursor: 'pointer', display: 'flex' }}
                          >
                            <Pencil size={13} style={{ color: '#233B8F' }} />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(c)}
                            title="Eliminar"
                            style={{ padding: 7, borderRadius: 9, background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.18)', cursor: 'pointer', display: 'flex' }}
                          >
                            <Trash2 size={13} style={{ color: '#DC2626' }} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Pie: total + paginación ─────────────────────────────────── */}
      {!loading && !error && contacts.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginTop: 14 }}>
          <p style={{ fontSize: 12, color: MUTED, margin: 0 }}>
            {total} contacto{total === 1 ? '' : 's'} en total
          </p>
          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{ padding: 8, borderRadius: 9, background: '#F4F6FA', border: `1px solid ${BORDER}`, cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.4 : 1, display: 'flex' }}
              >
                <ChevronLeft size={15} />
              </button>
              <span style={{ fontSize: 12, color: MUTED }}>Página {page} de {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                style={{ padding: 8, borderRadius: 9, background: '#F4F6FA', border: `1px solid ${BORDER}`, cursor: page === totalPages ? 'not-allowed' : 'pointer', opacity: page === totalPages ? 0.4 : 1, display: 'flex' }}
              >
                <ChevronRight size={15} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Modal crear / editar ────────────────────────────────────── */}
      {modalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(2px)' }} onClick={() => !saving && setModalOpen(false)} />
          <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: 560, maxHeight: '90vh', display: 'flex', flexDirection: 'column', background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 18, overflow: 'hidden', boxShadow: '0 24px 60px rgba(17,24,39,0.28)' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '16px 20px', borderBottom: `1px solid ${BORDER}`, flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
                <div style={{ width: 38, height: 38, borderRadius: 11, background: BRAND, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 8px 18px rgba(255,45,149,0.24)' }}>
                  {editingId ? <Pencil size={17} className="text-white" /> : <UserPlus size={17} className="text-white" />}
                </div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 800, margin: 0 }}>{editingId ? 'Editar contacto' : 'Nuevo contacto'}</p>
                  <p style={{ fontSize: 11.5, color: MUTED, margin: '2px 0 0' }}>Base de datos del centro de comunicación</p>
                </div>
              </div>
              <button onClick={() => !saving && setModalOpen(false)} style={{ padding: 7, borderRadius: 9, background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex' }}>
                <X size={17} style={{ color: '#9CA3AF' }} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: 20, overflowY: 'auto' }}>
              {formError && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.20)', borderRadius: 10, padding: '9px 12px', marginBottom: 16 }}>
                  <AlertTriangle size={13} style={{ color: '#DC2626', flexShrink: 0, marginTop: 2 }} />
                  <p style={{ fontSize: 12, color: '#DC2626', margin: 0, lineHeight: 1.5 }}>{formError}</p>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Nombre</label>
                  <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Opcional" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Celular *</label>
                  <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="Ej. 573001234567" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Etiqueta</label>
                  <input type="text" value={form.tag} onChange={e => setForm(f => ({ ...f, tag: e.target.value }))} placeholder="lead, cliente, VIP…" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>País</label>
                  <input type="text" value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} placeholder="Opcional" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Ciudad</label>
                  <input type="text" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="Opcional" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Sponsor</label>
                  <input type="text" value={form.sponsor} onChange={e => setForm(f => ({ ...f, sponsor: e.target.value }))} placeholder="Opcional" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Estado</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as ContactStatus }))} style={{ ...inputStyle, cursor: 'pointer' }}>
                    <option value="ACTIVE">Activo</option>
                    <option value="INACTIVE">Inactivo</option>
                    <option value="BLOCKED">Bloqueado</option>
                  </select>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Notas</label>
                  <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Notas internas del CRM" rows={3} style={{ ...inputStyle, resize: 'vertical', minHeight: 66 }} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, optIn: !f.optIn }))}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: 12, padding: '10px 14px', borderRadius: 11, background: '#F8FAFC', border: `1px solid ${BORDER}`, cursor: 'pointer' }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                      <Check size={15} style={{ color: form.optIn ? '#16A34A' : '#9CA3AF' }} />
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: TEXT }}>Acepta recibir mensajes (opt-in)</span>
                    </span>
                    <span style={{ position: 'relative', width: 40, height: 22, borderRadius: 999, background: form.optIn ? '#16A34A' : '#E4E9F0', transition: 'background 0.15s', flexShrink: 0 }}>
                      <span style={{ position: 'absolute', top: 2, left: form.optIn ? 20 : 2, width: 18, height: 18, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,0.2)', transition: 'left 0.15s' }} />
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', gap: 10, padding: '14px 20px', borderTop: `1px solid ${BORDER}`, flexShrink: 0 }}>
              <button
                onClick={() => setModalOpen(false)}
                disabled={saving}
                style={{ flex: 1, padding: '10px 0', borderRadius: 11, background: '#F4F6FA', border: `1px solid ${BORDER}`, fontSize: 13, color: MUTED, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.5 : 1 }}
              >
                Cancelar
              </button>
              <button
                onClick={submitForm}
                disabled={saving}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '10px 0', borderRadius: 11, background: BRAND, border: 'none', fontSize: 13, fontWeight: 800, color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1, boxShadow: '0 8px 20px rgba(183,53,184,0.22)' }}
              >
                {saving ? <Loader2 size={15} className="animate-spin" /> : (editingId ? <><Pencil size={14} /> Guardar cambios</> : <><UserPlus size={14} /> Crear contacto</>)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal eliminar ──────────────────────────────────────────── */}
      {deleteTarget && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(2px)' }} onClick={() => !deleting && setDeleteTarget(null)} />
          <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: 400, background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 18, padding: 24, boxShadow: '0 24px 60px rgba(17,24,39,0.28)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <div style={{ width: 54, height: 54, borderRadius: 15, background: 'rgba(220,38,38,0.10)', border: '1px solid rgba(220,38,38,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                <Trash2 size={24} style={{ color: '#DC2626' }} />
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 4px' }}>Eliminar contacto</h3>
              <p style={{ fontSize: 12.5, color: MUTED, margin: '0 0 2px' }}>Estás a punto de eliminar a</p>
              <p style={{ fontSize: 14, fontWeight: 800, margin: '0 0 2px' }}>{deleteTarget.name ?? 'Sin nombre'}</p>
              <p style={{ fontSize: 12, color: '#9CA3AF', fontFamily: 'ui-monospace, monospace', margin: '0 0 16px' }}>{deleteTarget.phone}</p>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, width: '100%', background: 'rgba(220,38,38,0.07)', border: '1px solid rgba(220,38,38,0.16)', borderRadius: 11, padding: '10px 12px', marginBottom: 18, textAlign: 'left' }}>
                <AlertTriangle size={13} style={{ color: '#DC2626', flexShrink: 0, marginTop: 2 }} />
                <p style={{ fontSize: 11.5, color: '#DC2626', margin: 0, lineHeight: 1.5 }}>
                  Esta acción es <strong>irreversible</strong>. El contacto se eliminará de la base de datos.
                </p>
              </div>

              <div style={{ display: 'flex', gap: 10, width: '100%' }}>
                <button
                  onClick={() => setDeleteTarget(null)}
                  disabled={deleting}
                  style={{ flex: 1, padding: '10px 0', borderRadius: 11, background: '#F4F6FA', border: `1px solid ${BORDER}`, fontSize: 13, color: MUTED, cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? 0.5 : 1 }}
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={deleting}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '10px 0', borderRadius: 11, background: '#DC2626', border: 'none', fontSize: 13, fontWeight: 800, color: '#fff', cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? 0.6 : 1 }}
                >
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
