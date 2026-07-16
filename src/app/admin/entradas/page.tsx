'use client'

import { useEffect, useState, useRef } from 'react'
import { Loader2, Plus, Pencil, Trash2, Copy, Check, Search, ExternalLink, ChevronDown, ChevronUp, Upload, X } from 'lucide-react'

interface TicketType { id: string; name: string; description?: string | null; image?: string | null; price: number; isGuest?: boolean; capacity: number | null; bulkMinQty?: number | null; bulkDiscountPct?: number | null; active: boolean; sortOrder: number }
interface Event {
  id: string; title: string; description: string; image?: string | null
  paymentQrUrl?: string | null
  date?: string | null; location?: string | null; active: boolean
  ticketCount: number; createdAt: string; ticketTypes: TicketType[]
}
interface Ticket {
  id: string; customerName: string; customerEmail: string; customerPhone: string
  ticketCode: string; ticketTypeName: string; quantity: number; totalPrice: number
  unitPrice: number; paymentMethod: string; proofUrl?: string | null; txHash?: string | null
  status: 'PENDING' | 'APPROVED' | 'REJECTED'; checkedIn: boolean; checkedInAt?: string | null
  notes?: string | null; createdAt: string
}

interface EventStats {
  sold: number; revenue: number; revenueBs: number; ticketAvg: number
  pending: number; pendingRevenue: number; rejected: number; checkedIn: number
  guests: number; guestsCheckedIn: number
  byType: { name: string; sold: number; revenue: number; revenueBs: number }[]
}

const EMPTY_EVENT = { title: '', description: '', image: '', paymentQrUrl: '', date: '', location: '', active: true }
const EMPTY_TYPE = { name: '', description: '', image: '', price: '', capacity: '', bulkMinQty: '', bulkDiscountPct: '', isGuest: false }
const INPUT = 'w-full bg-[#F4F6FA] border border-[#E4E9F0] rounded-lg px-3 py-2 text-[#111827] text-sm outline-none focus:border-purple-500/40'
const LABEL = 'block text-[11px] text-[#111827]/40 mb-1'
const STATUS_COLORS: Record<string, string> = { PENDING: '#F5A623', APPROVED: '#4ade80', REJECTED: '#f87171' }
const STATUS_LABELS: Record<string, string> = { PENDING: 'Pendiente', APPROVED: 'Aprobado', REJECTED: 'Rechazado' }

export default function AdminEntradasPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [activeEvent, setActiveEvent] = useState<Event | null>(null)

  // Event modal
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<Event | null>(null)
  const [form, setForm] = useState({ ...EMPTY_EVENT })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [uploadingImg, setUploadingImg] = useState(false)
  const imgRef = useRef<HTMLInputElement>(null)
  const [uploadingQr, setUploadingQr] = useState(false)
  const qrRef = useRef<HTMLInputElement>(null)

  // Ticket type modal
  const [typeModal, setTypeModal] = useState<{ eventId: string; editing: TicketType | null } | null>(null)
  const [typeForm, setTypeForm] = useState({ ...EMPTY_TYPE })
  const [typeSaving, setTypeSaving] = useState(false)
  const [typeError, setTypeError] = useState('')
  const [uploadingTypeImg, setUploadingTypeImg] = useState(false)

  // Delete confirm
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  // Tickets panel
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [ticketsLoading, setTicketsLoading] = useState(false)
  const [stats, setStats] = useState<EventStats | null>(null)
  const [ticketSearch, setTicketSearch] = useState('')
  const [ticketFilter, setTicketFilter] = useState('ALL')
  const [expandedTicket, setExpandedTicket] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [rejectModal, setRejectModal] = useState<{ id: string } | null>(null)
  const [rejectNotes, setRejectNotes] = useState('')
  const [copied, setCopied] = useState<string | null>(null)

  const APP_URL = typeof window !== 'undefined' ? window.location.origin : ''

  const fetchEvents = () => {
    setLoading(true)
    fetch('/api/admin/entradas').then(r => r.json()).then(d => { setEvents(d.events ?? []); setLoading(false) }).catch(() => setLoading(false))
  }

  const fetchTickets = (eventId: string, filter = ticketFilter, search = ticketSearch) => {
    setTicketsLoading(true)
    const qs = new URLSearchParams()
    if (filter !== 'ALL') qs.set('status', filter)
    if (search.trim()) qs.set('search', search.trim())
    fetch(`/api/admin/entradas/${eventId}/orders?${qs}`).then(r => r.json()).then(d => {
      setTickets(d.tickets ?? [])
      setStats(d.stats ?? null)
      setTicketsLoading(false)
    }).catch(() => setTicketsLoading(false))
  }

  useEffect(() => { fetchEvents() }, [])
  useEffect(() => { if (activeEvent) fetchTickets(activeEvent.id, ticketFilter, ticketSearch) }, [activeEvent, ticketFilter])

  const openCreate = () => { setEditing(null); setForm({ ...EMPTY_EVENT }); setFormError(''); setModal(true) }
  const openEdit = (ev: Event) => {
    setEditing(ev)
    setForm({ title: ev.title, description: ev.description, image: ev.image ?? '', paymentQrUrl: ev.paymentQrUrl ?? '', date: ev.date ? new Date(ev.date).toISOString().slice(0, 16) : '', location: ev.location ?? '', active: ev.active })
    setFormError(''); setModal(true)
  }

  const uploadImage = async (file: File) => {
    setUploadingImg(true)
    try {
      const fd = new FormData(); fd.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (data.url) setForm(f => ({ ...f, image: data.url }))
    } catch { } finally { setUploadingImg(false) }
  }

  /** QR bancario del evento (para que el comprador pague por transferencia/QR). */
  const uploadPaymentQr = async (file: File) => {
    setUploadingQr(true)
    try {
      const fd = new FormData(); fd.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (data.url) setForm(f => ({ ...f, paymentQrUrl: data.url }))
    } catch { } finally { setUploadingQr(false) }
  }

  const saveEvent = async () => {
    if (!form.title.trim()) { setFormError('Título requerido'); return }
    // Fecha: avisamos acá mismo si el año está mal (un dedazo tipo "72026" rompía el guardado).
    if (form.date) {
      const d = new Date(form.date)
      if (isNaN(d.getTime())) { setFormError('La fecha y hora no son válidas. Revisá el año (por ejemplo: 2026).'); return }
      const y = d.getFullYear()
      if (y < 2000 || y > 2100) { setFormError(`El año ${y} no parece correcto. Usá un año entre 2000 y 2100.`); return }
    }
    setSaving(true); setFormError('')
    const body = { title: form.title, description: form.description, image: form.image || null, paymentQrUrl: form.paymentQrUrl || null, date: form.date || null, location: form.location || null, active: form.active }
    const url = editing ? `/api/admin/entradas/${editing.id}` : '/api/admin/entradas'
    const method = editing ? 'PATCH' : 'POST'
    try {
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await res.json()
      if (!res.ok) { setFormError(data.error ?? 'Error'); setSaving(false); return }
      setSaving(false); setModal(false)
      // Auto-expand the new event so ticket types section is immediately visible
      if (!editing && data.event) setActiveEvent({ ...data.event, ticketTypes: data.event.ticketTypes ?? [], ticketCount: 0 })
      fetchEvents()
    } catch { setFormError('Error de conexión'); setSaving(false) }
  }

  const deleteEvent = async (id: string) => {
    await fetch(`/api/admin/entradas/${id}`, { method: 'DELETE' })
    setDeleteConfirm(null)
    if (activeEvent?.id === id) setActiveEvent(null)
    fetchEvents()
  }

  // Ticket type actions
  const openCreateType = (eventId: string) => { setTypeModal({ eventId, editing: null }); setTypeForm({ ...EMPTY_TYPE }); setTypeError('') }
  const openEditType = (eventId: string, tt: TicketType) => {
    setTypeModal({ eventId, editing: tt })
    setTypeForm({ name: tt.name, description: tt.description ?? '', image: tt.image ?? '', price: String(tt.price), capacity: tt.capacity != null ? String(tt.capacity) : '', bulkMinQty: tt.bulkMinQty != null ? String(tt.bulkMinQty) : '', bulkDiscountPct: tt.bulkDiscountPct != null ? String(tt.bulkDiscountPct) : '', isGuest: tt.isGuest === true })
    setTypeError('')
  }
  const saveType = async () => {
    if (!typeModal) return
    if (!typeForm.name.trim()) { setTypeError('Nombre requerido'); return }
    // El INVITADO es GRATIS: no se le pide precio.
    if (!typeForm.isGuest && (!typeForm.price || isNaN(Number(typeForm.price)) || Number(typeForm.price) < 0)) { setTypeError('Precio inválido'); return }
    setTypeSaving(true); setTypeError('')
    const body = { name: typeForm.name, description: typeForm.description || null, image: typeForm.image || null, price: typeForm.isGuest ? '0' : typeForm.price, isGuest: typeForm.isGuest, capacity: typeForm.capacity || null, bulkMinQty: typeForm.isGuest ? null : (typeForm.bulkMinQty || null), bulkDiscountPct: typeForm.isGuest ? null : (typeForm.bulkDiscountPct || null), active: true }
    const url = typeModal.editing
      ? `/api/admin/entradas/${typeModal.eventId}/types/${typeModal.editing.id}`
      : `/api/admin/entradas/${typeModal.eventId}/types`
    const method = typeModal.editing ? 'PATCH' : 'POST'
    try {
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await res.json()
      if (!res.ok) { setTypeError(data.error ?? 'Error'); setTypeSaving(false); return }
      setTypeSaving(false); setTypeModal(null); fetchEvents()
    } catch { setTypeError('Error de conexión'); setTypeSaving(false) }
  }
  const deleteType = async (eventId: string, typeId: string) => {
    await fetch(`/api/admin/entradas/${eventId}/types/${typeId}`, { method: 'DELETE' })
    fetchEvents()
  }

  const doTicketAction = async (ticketId: string, action: string, notes?: string) => {
    setActionLoading(ticketId)
    try {
      const res = await fetch(`/api/admin/entradas/tickets/${ticketId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, notes }) })
      const data = await res.json()
      if (!res.ok) alert(data.error ?? 'Error')
    } catch { } finally {
      setActionLoading(null); setRejectModal(null); setRejectNotes('')
      if (activeEvent) fetchTickets(activeEvent.id)
    }
  }

  const copyLink = (eventId: string) => { navigator.clipboard.writeText(`${APP_URL}/entradas/${eventId}`); setCopied(eventId); setTimeout(() => setCopied(null), 2000) }
  const formatDate = (d: string) => new Date(d).toLocaleString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  return (
  <div className="dm-page font-ui">
    <div style={{ minHeight: '100vh', background: '#07080F', color: '#fff' }}>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>🎟 Gestión de Entradas</h1>
            <p style={{ fontSize: 12, color: '#6B7280', margin: '4px 0 0' }}>Crea eventos con tipos de entrada y administra ventas</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <a href="/admin/entradas/scan" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 10, background: 'rgba(0,229,208,0.12)', border: '1px solid rgba(0,229,208,0.25)', color: '#00E5D0', fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>
              📷 Escanear QR
            </a>
            <a href="/admin/validar" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 10, background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.25)', color: '#4ade80', fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>
              ✓ Validar en puerta
            </a>
            <button onClick={openCreate} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 10, background: 'linear-gradient(135deg,#00E5D0,#0D1E79)', color: '#fff', fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer' }}>
              <Plus size={15} /> Nuevo evento
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
            <Loader2 size={24} className="animate-spin" style={{ color: '#9CA3AF' }} />
          </div>
        ) : events.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#9CA3AF' }}>
            <p style={{ fontSize: 14 }}>No hay eventos. Crea el primero.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {events.map(ev => (
              <div key={ev.id} style={{ borderRadius: 14, border: activeEvent?.id === ev.id ? '1px solid rgba(0,229,208,0.4)' : '1px solid rgba(255,255,255,0.07)', background: activeEvent?.id === ev.id ? 'rgba(0,229,208,0.05)' : 'rgba(255,255,255,0.025)', overflow: 'hidden' }}>

                {/* Event row */}
                <div style={{ display: 'flex', gap: 12, padding: '14px 16px', alignItems: 'center', cursor: 'pointer' }} onClick={() => setActiveEvent(activeEvent?.id === ev.id ? null : ev)}>
                  {ev.image && <img src={ev.image} alt="" style={{ width: 52, height: 52, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <p style={{ fontWeight: 800, fontSize: 14, margin: 0 }}>{ev.title}</p>
                      <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: ev.active ? 'rgba(74,222,128,0.15)' : 'rgba(248,113,113,0.15)', color: ev.active ? '#4ade80' : '#f87171', fontWeight: 700 }}>{ev.active ? 'Activo' : 'Inactivo'}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 10, marginTop: 3, flexWrap: 'wrap' }}>
                      {ev.date && <span style={{ fontSize: 11, color: '#6B7280' }}>📅 {formatDate(ev.date)}</span>}
                      {ev.location && <span style={{ fontSize: 11, color: '#6B7280' }}>📍 {ev.location}</span>}
                      <span style={{ fontSize: 11, color: '#00E5D0', fontWeight: 700 }}>🎟 {ev.ticketCount} vendidas</span>
                      {ev.ticketTypes.length === 0
                        ? <span style={{ fontSize: 11, color: '#F5A623', fontWeight: 700 }}>⚠ Sin tipos — clic para agregar</span>
                        : <span style={{ fontSize: 11, color: '#6B7280' }}>{ev.ticketTypes.length} tipo{ev.ticketTypes.length !== 1 ? 's' : ''}</span>
                      }
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                    <button title="Copiar enlace público" onClick={e => { e.stopPropagation(); copyLink(ev.id) }} style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {copied === ev.id ? <Check size={14} color="#4ade80" /> : <Copy size={14} color="#6B7280" />}
                    </button>
                    <a href={`/entradas/${ev.id}`} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
                      <ExternalLink size={14} color="#6B7280" />
                    </a>
                    <button onClick={e => { e.stopPropagation(); openEdit(ev) }} style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Pencil size={13} color="#6B7280" />
                    </button>
                    <button onClick={e => { e.stopPropagation(); setDeleteConfirm(ev.id) }} style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(248,113,113,0.08)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Trash2 size={13} color="#f87171" />
                    </button>
                    {activeEvent?.id === ev.id ? <ChevronUp size={16} color="#6B7280" /> : <ChevronDown size={16} color="#6B7280" />}
                  </div>
                </div>

                {/* Expanded panel */}
                {activeEvent?.id === ev.id && (
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>

                    {/* ENLACE PÚBLICO: visible para copiarlo y compartirlo. */}
                    <div style={{ padding: '14px 16px', borderBottom: '1px solid #F0F3F7' }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 1.5, margin: '0 0 8px' }}>
                        Enlace para compartir
                      </p>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                        <input
                          readOnly
                          onFocus={e => e.currentTarget.select()}
                          onClick={e => e.currentTarget.select()}
                          value={`${APP_URL}/entradas/${ev.id}`}
                          style={{
                            flex: 1, minWidth: 220, padding: '10px 12px', borderRadius: 10,
                            background: '#F0F3F7', border: '1px solid #E4E9F0', color: '#374151',
                            fontSize: 12.5, fontWeight: 600, outline: 'none', cursor: 'text',
                          }}
                        />
                        <button
                          onClick={() => copyLink(ev.id)}
                          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 12.5, fontWeight: 800, color: '#fff', background: copied === ev.id ? '#22c55e' : 'linear-gradient(135deg,#00E5D0,#0D1E79)' }}
                        >
                          {copied === ev.id ? <><Check size={14} /> ¡Copiado!</> : <><Copy size={14} /> Copiar</>}
                        </button>
                        <a
                          href={`https://wa.me/?text=${encodeURIComponent(`🎟️ ${ev.title}\n\nConseguí tu entrada acá 👇\n${APP_URL}/entradas/${ev.id}`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px', borderRadius: 10, background: 'rgba(37,211,102,0.12)', border: '1px solid rgba(37,211,102,0.3)', color: '#16a34a', fontSize: 12.5, fontWeight: 800, textDecoration: 'none' }}
                        >
                          💬 Compartir
                        </a>
                        <a
                          href={`/entradas/${ev.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px', borderRadius: 10, background: '#F0F3F7', border: '1px solid #E4E9F0', color: '#6B7280', fontSize: 12.5, fontWeight: 800, textDecoration: 'none' }}
                        >
                          <ExternalLink size={14} /> Abrir
                        </a>
                      </div>
                      <p style={{ fontSize: 11, color: '#9CA3AF', margin: '8px 0 0' }}>
                        Mandá este enlace por WhatsApp o redes: desde ahí compran la entrada.
                      </p>
                    </div>

                    {/* Ticket types section */}
                    <div style={{ padding: '14px 16px', borderBottom: '1px solid #F0F3F7' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <p style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 1.5, margin: 0 }}>Tipos de entrada</p>
                        <button onClick={() => openCreateType(ev.id)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 8, background: 'rgba(0,229,208,0.12)', border: '1px solid rgba(0,229,208,0.25)', color: '#00E5D0', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                          <Plus size={12} /> Agregar tipo
                        </button>
                      </div>
                      {ev.ticketTypes.length === 0 ? (
                        <p style={{ fontSize: 12, color: '#9CA3AF', textAlign: 'center', padding: '10px 0' }}>Sin tipos de entrada. Agrega al menos uno para activar la venta.</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {ev.ticketTypes.map(tt => (
                            <div key={tt.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                              <div style={{ flex: 1 }}>
                                <span style={{ fontWeight: 700, fontSize: 13, color: tt.active ? '#fff' : '#6B7280' }}>{tt.name}</span>
                                <span style={{ fontSize: 12, color: '#F5A623', fontWeight: 700, marginLeft: 10 }}>${tt.price.toFixed(2)} USDT</span>
                                {tt.capacity != null && <span style={{ fontSize: 11, color: '#6B7280', marginLeft: 8 }}>Cupo: {tt.capacity}</span>}
                                {!tt.active && <span style={{ fontSize: 10, color: '#f87171', marginLeft: 8 }}>Inactivo</span>}
                              </div>
                              <button onClick={() => openEditType(ev.id, tt)} style={{ width: 28, height: 28, borderRadius: 7, background: '#F0F3F7', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Pencil size={12} color="#6B7280" />
                              </button>
                              <button onClick={() => deleteType(ev.id, tt.id)} style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(248,113,113,0.08)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Trash2 size={12} color="#f87171" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Tickets/orders section */}
                    <div style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                        <p style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 1.5, margin: 0 }}>Reporte de ventas</p>
                        {/* Descarga el reporte COMPLETO (abre en Excel) */}
                        <a
                          href={`/api/admin/entradas/${ev.id}/report`}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 13px', borderRadius: 9, background: 'linear-gradient(135deg,#00E5D0,#0D1E79)', color: '#fff', fontSize: 12, fontWeight: 800, textDecoration: 'none' }}
                        >
                          ⬇ Descargar reporte
                        </a>
                      </div>

                      {/* Panel de ventas: totales REALES del evento (no dependen del filtro). */}
                      {stats && (
                        <div style={{ marginBottom: 14 }}>
                          {/* Ingresos — la métrica principal, destacada */}
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 8, marginBottom: 8 }}>
                            <div style={{ background: 'rgba(0,229,208,0.08)', border: '1px solid rgba(0,229,208,0.25)', borderRadius: 12, padding: '12px 14px' }}>
                              <p style={{ fontSize: 10, color: '#9CA3AF', margin: 0, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1 }}>Ingresos confirmados</p>
                              <p style={{ fontSize: 24, fontWeight: 900, color: '#00E5D0', margin: '3px 0 0', lineHeight: 1.1 }}>
                                ${stats.revenue.toFixed(2)} <span style={{ fontSize: 12, color: '#9CA3AF' }}>USDT</span>
                              </p>
                              {stats.revenueBs > 0 && (
                                <p style={{ fontSize: 12, color: '#6B7280', margin: '2px 0 0', fontWeight: 700 }}>≈ Bs {stats.revenueBs.toFixed(2)}</p>
                              )}
                            </div>

                            <div style={{ background: 'rgba(245,166,35,0.08)', border: '1px solid rgba(245,166,35,0.25)', borderRadius: 12, padding: '12px 14px' }}>
                              <p style={{ fontSize: 10, color: '#9CA3AF', margin: 0, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1 }}>Por aprobar</p>
                              <p style={{ fontSize: 24, fontWeight: 900, color: '#F5A623', margin: '3px 0 0', lineHeight: 1.1 }}>{stats.pending}</p>
                              {stats.pendingRevenue > 0 && (
                                <p style={{ fontSize: 12, color: '#6B7280', margin: '2px 0 0', fontWeight: 700 }}>+${stats.pendingRevenue.toFixed(2)} si aprobás</p>
                              )}
                            </div>
                          </div>

                          {/* Métricas secundarias */}
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(110px,1fr))', gap: 8 }}>
                            {[
                              { label: 'Vendidas', value: String(stats.sold), color: '#22c55e' },
                              { label: 'Ticket prom.', value: `$${(stats.ticketAvg ?? 0).toFixed(2)}`, color: '#a78bfa' },
                              { label: 'Ingresaron', value: `${stats.checkedIn}/${stats.sold}`, color: '#3b82f6' },
                              { label: '🎁 Invitados', value: `${stats.guestsCheckedIn ?? 0}/${stats.guests ?? 0}`, color: '#16a34a' },
                              { label: 'Rechazadas', value: String(stats.rejected), color: '#f87171' },
                            ].map(m => (
                              <div key={m.label} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 12px' }}>
                                <p style={{ fontSize: 10, color: '#6B7280', margin: 0, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>{m.label}</p>
                                <p style={{ fontSize: 17, fontWeight: 900, color: m.color, margin: '3px 0 0' }}>{m.value}</p>
                              </div>
                            ))}
                          </div>

                          {/* Desglose por tipo de entrada */}
                          {stats.byType.length > 0 && (
                            <div style={{ marginTop: 10, borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 10, padding: '7px 12px', background: 'rgba(255,255,255,0.04)' }}>
                                <span style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1 }}>Tipo de entrada</span>
                                <span style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, textAlign: 'right' }}>Vendidas</span>
                                <span style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, textAlign: 'right', minWidth: 90 }}>Ingresos</span>
                              </div>
                              {stats.byType.map(t => (
                                <div key={t.name} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 10, padding: '9px 12px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                  <span style={{ fontSize: 12.5, color: '#fff', fontWeight: 700 }}>{t.name}</span>
                                  <span style={{ fontSize: 12.5, color: '#fff', fontWeight: 800, textAlign: 'right' }}>{t.sold}</span>
                                  <span style={{ fontSize: 12.5, color: '#00E5D0', fontWeight: 800, textAlign: 'right', minWidth: 90 }}>${t.revenue.toFixed(2)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 180, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '6px 10px' }}>
                          <Search size={14} color="#6B7280" />
                          <input value={ticketSearch} onChange={e => setTicketSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchTickets(ev.id, ticketFilter, ticketSearch)} placeholder="Código, nombre, tipo..." style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#fff', fontSize: 12 }} />
                        </div>
                        <button onClick={() => fetchTickets(ev.id, ticketFilter, ticketSearch)} style={{ padding: '6px 12px', borderRadius: 8, background: 'rgba(0,229,208,0.15)', border: '1px solid rgba(0,229,208,0.2)', color: '#00E5D0', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Buscar</button>
                        {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map(s => (
                          <button key={s} onClick={() => setTicketFilter(s)} style={{ padding: '6px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: '1px solid', borderColor: ticketFilter === s ? (STATUS_COLORS[s] ?? '#6B7280') : 'rgba(255,255,255,0.08)', background: ticketFilter === s ? `${STATUS_COLORS[s] ?? '#fff'}22` : 'transparent', color: ticketFilter === s ? (STATUS_COLORS[s] ?? '#fff') : '#6B7280' }}>
                            {s === 'ALL' ? 'Todos' : STATUS_LABELS[s]}
                          </button>
                        ))}
                      </div>

                      {/* Las VENTAS excluyen a los invitados (van en su propia sección). */}
                      {ticketsLoading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0' }}>
                          <Loader2 size={18} className="animate-spin" style={{ color: '#9CA3AF' }} />
                        </div>
                      ) : tickets.filter(t => t.paymentMethod !== 'GUEST').length === 0 ? (
                        <p style={{ textAlign: 'center', color: '#9CA3AF', fontSize: 12, padding: '16px 0' }}>Sin ventas</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {tickets.filter(t => t.paymentMethod !== 'GUEST').map(t => (
                            <div key={t.id} style={{ borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)', overflow: 'hidden' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', cursor: 'pointer' }} onClick={() => setExpandedTicket(expandedTicket === t.id ? null : t.id)}>
                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_COLORS[t.status], flexShrink: 0 }} />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                    <span style={{ fontFamily: 'Courier New', fontSize: 12, fontWeight: 800, letterSpacing: 2 }}>{t.ticketCode}</span>
                                    <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 20, background: 'rgba(0,229,208,0.12)', color: '#00E5D0', fontWeight: 700 }}>{t.ticketTypeName}</span>
                                    {t.checkedIn && <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 20, background: 'rgba(74,222,128,0.15)', color: '#4ade80', fontWeight: 700 }}>✓ Usado</span>}
                                  </div>
                                  <p style={{ margin: '2px 0 0', fontSize: 11, color: '#6B7280' }}>{t.customerName} · {t.customerEmail} · x{t.quantity} · ${t.totalPrice.toFixed(2)} USDT</p>
                                </div>
                                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                                  {t.status === 'PENDING' && (
                                    <>
                                      <button disabled={actionLoading === t.id} onClick={e => { e.stopPropagation(); doTicketAction(t.id, 'approve') }} style={{ padding: '5px 10px', borderRadius: 7, background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.25)', color: '#4ade80', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                                        {actionLoading === t.id ? <Loader2 size={12} className="animate-spin" /> : '✓ Aprobar'}
                                      </button>
                                      <button disabled={actionLoading === t.id} onClick={e => { e.stopPropagation(); setRejectModal({ id: t.id }) }} style={{ padding: '5px 10px', borderRadius: 7, background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', color: '#f87171', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>✕ Rechazar</button>
                                    </>
                                  )}
                                  {t.status === 'APPROVED' && !t.checkedIn && (
                                    <button disabled={actionLoading === t.id} onClick={e => { e.stopPropagation(); doTicketAction(t.id, 'checkin') }} style={{ padding: '5px 12px', borderRadius: 7, background: 'rgba(0,229,208,0.15)', border: '1px solid rgba(0,229,208,0.3)', color: '#00E5D0', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                                      {actionLoading === t.id ? <Loader2 size={12} className="animate-spin" /> : '✓ Check-in'}
                                    </button>
                                  )}
                                </div>
                              </div>
                              {expandedTicket === t.id && (
                                <div style={{ borderTop: '1px solid #F0F3F7', padding: '10px 12px', display: 'flex', flexWrap: 'wrap', gap: 14 }}>
                                  <div><p style={{ fontSize: 10, color: '#9CA3AF', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: 1.5 }}>Teléfono</p><p style={{ fontSize: 12, color: '#374151', margin: 0 }}>{t.customerPhone}</p></div>
                                  <div><p style={{ fontSize: 10, color: '#9CA3AF', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: 1.5 }}>Método</p><p style={{ fontSize: 12, color: '#374151', margin: 0 }}>{t.paymentMethod === 'CRYPTO' ? '₮ Cripto' : '🏦 Transferencia'}</p></div>
                                  <div><p style={{ fontSize: 10, color: '#9CA3AF', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: 1.5 }}>Precio unitario</p><p style={{ fontSize: 12, color: '#374151', margin: 0 }}>${t.unitPrice.toFixed(2)} USDT</p></div>
                                  <div><p style={{ fontSize: 10, color: '#9CA3AF', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: 1.5 }}>Fecha</p><p style={{ fontSize: 12, color: '#374151', margin: 0 }}>{formatDate(t.createdAt)}</p></div>
                                  {t.checkedInAt && <div><p style={{ fontSize: 10, color: '#9CA3AF', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: 1.5 }}>Check-in</p><p style={{ fontSize: 12, color: '#4ade80', margin: 0 }}>{formatDate(t.checkedInAt)}</p></div>}
                                  {t.proofUrl && <div><a href={t.proofUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: '#00E5D0', textDecoration: 'none', fontWeight: 600 }}>Ver comprobante →</a></div>}
                                  {t.txHash && <div style={{ width: '100%' }}><p style={{ fontSize: 10, color: '#9CA3AF', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: 1.5 }}>TX Hash</p><p style={{ fontSize: 10, color: '#6B7280', margin: 0, fontFamily: 'Courier New', wordBreak: 'break-all' }}>{t.txHash}</p></div>}

                                  {/* QR de la entrada: el mismo que se manda por WhatsApp y se escanea en la puerta. */}
                                  <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, paddingTop: 10, borderTop: '1px solid #F0F3F7' }}>
                                    <img
                                      src={`/api/entradas/qr/${encodeURIComponent(t.ticketCode)}`}
                                      alt={`QR ${t.ticketCode}`}
                                      style={{ width: 96, height: 96, borderRadius: 8, background: '#fff', padding: 4, flexShrink: 0 }}
                                    />
                                    <div>
                                      <p style={{ fontSize: 10, color: '#9CA3AF', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: 1.5 }}>QR de la entrada</p>
                                      <p style={{ fontSize: 15, fontWeight: 900, color: '#374151', margin: '0 0 6px', letterSpacing: 2, fontFamily: 'Courier New' }}>{t.ticketCode}</p>
                                      <a
                                        href={`/api/entradas/qr/${encodeURIComponent(t.ticketCode)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ fontSize: 12, color: '#00E5D0', textDecoration: 'none', fontWeight: 700 }}
                                      >
                                        Abrir / descargar QR →
                                      </a>
                                      {t.status !== 'APPROVED' && (
                                        <p style={{ fontSize: 11, color: '#f59e0b', margin: '6px 0 0' }}>
                                          ⏳ Aprobá la compra para que se le envíe por WhatsApp y email.
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* ── INVITADOS (gratis): su propio espacio, separado de las ventas ── */}
                    <div style={{ padding: '14px 16px', borderTop: '1px solid #F0F3F7', background: 'rgba(22,163,74,0.03)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                        <p style={{ fontSize: 11, fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', letterSpacing: 1.5, margin: 0 }}>🎁 Invitados (gratis)</p>
                        {stats && (
                          <span style={{ fontSize: 11, color: '#6B7280', fontWeight: 700 }}>
                            {stats.guests ?? 0} registrado{(stats.guests ?? 0) !== 1 ? 's' : ''} · {stats.guestsCheckedIn ?? 0} ingresaron
                          </span>
                        )}
                      </div>

                      {tickets.filter(t => t.paymentMethod === 'GUEST').length === 0 ? (
                        <p style={{ textAlign: 'center', color: '#9CA3AF', fontSize: 12, padding: '12px 0' }}>
                          Todavía no hay invitados registrados.
                        </p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {tickets.filter(t => t.paymentMethod === 'GUEST').map(g => (
                            <div key={g.id} style={{ borderRadius: 10, border: '1px solid rgba(22,163,74,0.20)', background: '#fff', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 12 }}>
                              {/* QR del invitado, a la vista */}
                              <img
                                src={`/api/entradas/qr/${encodeURIComponent(g.ticketCode)}`}
                                alt={`QR ${g.ticketCode}`}
                                style={{ width: 60, height: 60, borderRadius: 8, background: '#fff', flexShrink: 0 }}
                              />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                  <span style={{ fontSize: 13, fontWeight: 800, color: '#111827', letterSpacing: 1.5, fontFamily: 'Courier New' }}>{g.ticketCode}</span>
                                  {g.checkedIn
                                    ? <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 20, background: 'rgba(59,130,246,0.12)', color: '#2563eb' }}>✓ Ingresó</span>
                                    : <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 20, background: 'rgba(22,163,74,0.12)', color: '#16a34a' }}>🎁 Invitado</span>}
                                </div>
                                <p style={{ fontSize: 12, color: '#374151', margin: '3px 0 0', fontWeight: 600 }}>{g.customerName}</p>
                                <p style={{ fontSize: 11, color: '#9CA3AF', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {g.customerPhone} · {g.customerEmail}
                                </p>
                              </div>
                              <a
                                href={`/api/entradas/qr/${encodeURIComponent(g.ticketCode)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ fontSize: 11, color: '#16a34a', fontWeight: 800, textDecoration: 'none', flexShrink: 0 }}
                              >
                                Ver QR →
                              </a>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Event modal */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(15,23,42,0.10)', backdropFilter: 'blur(8px)' }}>
          <div style={{ width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto', background: '#0D0E1A', border: '1px solid #E4E9F0', borderRadius: 20, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ fontWeight: 900, fontSize: 16, margin: 0 }}>{editing ? 'Editar evento' : 'Nuevo evento'}</h2>
              <button onClick={() => setModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div><label className={LABEL}>Título *</label><input className={INPUT} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Nombre del evento" /></div>
              <div><label className={LABEL}>Descripción</label><textarea className={INPUT} rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Descripción" style={{ resize: 'vertical' }} /></div>
              <div>
                <label className={LABEL}>Imagen</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input className={INPUT} value={form.image} onChange={e => setForm(f => ({ ...f, image: e.target.value }))} placeholder="URL o sube imagen" style={{ flex: 1 }} />
                  <button onClick={() => imgRef.current?.click()} disabled={uploadingImg} style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid #E4E9F0', color: '#6B7280', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                    {uploadingImg ? <Loader2 size={13} className="animate-spin" /> : <><Upload size={13} /> Subir</>}
                  </button>
                  <input ref={imgRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) uploadImage(f); e.target.value = '' }} />
                </div>
                {form.image && <img src={form.image} alt="" style={{ width: '100%', height: 90, objectFit: 'cover', borderRadius: 10, marginTop: 8 }} />}
              </div>
              <div><label className={LABEL}>Fecha y hora</label><input className={INPUT} type="datetime-local" min="2000-01-01T00:00" max="2100-12-31T23:59" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></div>
              <div><label className={LABEL}>Ubicación</label><input className={INPUT} value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Ciudad, lugar" /></div>

              {/* QR bancario: lo ve el comprador para pagar por transferencia. */}
              <div>
                <label className={LABEL}>QR bancario para cobrar <span style={{ color: '#6B7280', fontWeight: 400 }}>(opcional)</span></label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input className={INPUT} value={form.paymentQrUrl} onChange={e => setForm(f => ({ ...f, paymentQrUrl: e.target.value }))} placeholder="Sube el QR de tu banco" style={{ flex: 1 }} />
                  <button onClick={() => qrRef.current?.click()} disabled={uploadingQr} style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid #E4E9F0', color: '#6B7280', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                    {uploadingQr ? <Loader2 size={13} className="animate-spin" /> : <><Upload size={13} /> Subir</>}
                  </button>
                  <input ref={qrRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) uploadPaymentQr(f); e.target.value = '' }} />
                </div>
                {form.paymentQrUrl && <img src={form.paymentQrUrl} alt="QR de pago" style={{ width: 120, height: 120, objectFit: 'contain', borderRadius: 10, marginTop: 8, background: '#fff', padding: 6 }} />}
                <p style={{ fontSize: 11, color: '#6B7280', margin: '6px 0 0' }}>El comprador lo escanea para pagar y luego sube su comprobante.</p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" id="ev-active" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} style={{ width: 16, height: 16, cursor: 'pointer' }} />
                <label htmlFor="ev-active" style={{ fontSize: 13, color: '#6B7280', cursor: 'pointer' }}>Evento activo</label>
              </div>
            </div>
            {formError && <p style={{ fontSize: 12, color: '#f87171', marginTop: 10 }}>{formError}</p>}
            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
              <button onClick={() => setModal(false)} style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: '1px solid #E4E9F0', background: 'none', color: '#6B7280', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={saveEvent} disabled={saving} style={{ flex: 2, padding: '10px 0', borderRadius: 10, background: 'linear-gradient(135deg,#00E5D0,#0D1E79)', color: '#fff', fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                {saving ? <><Loader2 size={14} className="animate-spin" /> Guardando...</> : editing ? 'Guardar cambios' : 'Crear evento'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ticket type modal */}
      {typeModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(15,23,42,0.10)', backdropFilter: 'blur(8px)' }}>
          <div style={{ width: '100%', maxWidth: 380, background: '#0D0E1A', border: '1px solid #E4E9F0', borderRadius: 20, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <h2 style={{ fontWeight: 900, fontSize: 15, margin: 0 }}>{typeModal.editing ? 'Editar tipo' : 'Nuevo tipo de entrada'}</h2>
              <button onClick={() => setTypeModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

              {/* Presets rápidos: VIP · GENERAL · INVITADO (gratis) */}
              <div>
                <label className={LABEL}>Elegí el tipo</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
                  {[
                    { key: 'VIP', label: 'VIP', emoji: '💎', guest: false, color: '#00E5D0' },
                    { key: 'GENERAL', label: 'General', emoji: '🎟️', guest: false, color: '#233B8F' },
                    { key: 'INVITADO', label: 'Invitado', emoji: '🎁', guest: true, color: '#16a34a' },
                  ].map(p => {
                    const selected = typeForm.isGuest === p.guest && typeForm.name.toLowerCase() === p.label.toLowerCase()
                    return (
                      <button
                        key={p.key}
                        type="button"
                        onClick={() => setTypeForm(f => ({
                          ...f,
                          name: p.label,
                          isGuest: p.guest,
                          price: p.guest ? '0' : f.price,
                          bulkMinQty: p.guest ? '' : f.bulkMinQty,
                          bulkDiscountPct: p.guest ? '' : f.bulkDiscountPct,
                        }))}
                        style={{
                          padding: '10px 4px', borderRadius: 10, cursor: 'pointer', fontSize: 12, fontWeight: 800,
                          border: `1.5px solid ${selected ? p.color : '#E4E9F0'}`,
                          background: selected ? `${p.color}18` : '#F4F6FA',
                          color: selected ? p.color : '#6B7280',
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                        }}
                      >
                        <span style={{ fontSize: 16 }}>{p.emoji}</span>
                        {p.label}
                      </button>
                    )
                  })}
                </div>
                {typeForm.isGuest && (
                  <p style={{ fontSize: 11, color: '#16a34a', margin: '7px 0 0', fontWeight: 700 }}>
                    🎁 Entrada GRATIS: el invitado solo se registra y recibe su QR al instante (sin pago).
                  </p>
                )}
              </div>

              <div><label className={LABEL}>Nombre *</label><input className={INPUT} value={typeForm.name} onChange={e => setTypeForm(f => ({ ...f, name: e.target.value }))} placeholder="Ej: VIP, General, Invitado" /></div>
              <div><label className={LABEL}>Descripción (opcional)</label><textarea className={INPUT} rows={2} style={{ resize: 'none' }} value={typeForm.description} onChange={e => setTypeForm(f => ({ ...f, description: e.target.value }))} placeholder="Incluye acceso a área VIP, bebida de bienvenida..." /></div>
              <div>
                <label className={LABEL}>Imagen del tipo (opcional)</label>
                {typeForm.image
                  ? <div style={{ position: 'relative', marginBottom: 6 }}>
                      <img src={typeForm.image} alt="" style={{ width: '100%', height: 100, objectFit: 'cover', borderRadius: 10 }} />
                      <button onClick={() => setTypeForm(f => ({ ...f, image: '' }))} style={{ position: 'absolute', top: 6, right: 6, width: 24, height: 24, borderRadius: 6, background: 'rgba(15,23,42,0.10)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={12} color="#fff" /></button>
                    </div>
                  : <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', padding: '10px 0', borderRadius: 10, border: '1px dashed #E4E9F0', cursor: 'pointer', fontSize: 12, color: '#6B7280' }}>
                      {uploadingTypeImg ? <><Loader2 size={14} className="animate-spin" /> Subiendo...</> : <><Upload size={14} /> Subir imagen</>}
                      <input type="file" accept="image/*" className="hidden" onChange={async e => {
                        const f = e.target.files?.[0]; if (!f) return
                        setUploadingTypeImg(true)
                        try {
                          const fd = new FormData(); fd.append('file', f)
                          const res = await fetch('/api/upload', { method: 'POST', body: fd })
                          const d = await res.json()
                          if (d.url) setTypeForm(prev => ({ ...prev, image: d.url }))
                        } catch {} finally { setUploadingTypeImg(false) }
                        e.target.value = ''
                      }} />
                    </label>
                }
              </div>
              {/* El INVITADO es gratis → no se le pide precio ni descuentos. */}
              <div style={{ display: 'flex', gap: 8 }}>
                {!typeForm.isGuest && (
                  <div style={{ flex: 1 }}><label className={LABEL}>Precio (USDT) *</label><input className={INPUT} type="number" min="0" step="0.01" value={typeForm.price} onChange={e => setTypeForm(f => ({ ...f, price: e.target.value }))} placeholder="25.00" /></div>
                )}
                <div style={{ flex: 1 }}><label className={LABEL}>{typeForm.isGuest ? 'Cupo de invitados' : 'Capacidad máx.'}</label><input className={INPUT} type="number" min="1" value={typeForm.capacity} onChange={e => setTypeForm(f => ({ ...f, capacity: e.target.value }))} placeholder="Sin límite" /></div>
              </div>

              {!typeForm.isGuest && (
                <div style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(0,229,208,0.06)', border: '1px solid rgba(0,229,208,0.15)' }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(0,229,208,0.8)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Descuento por cantidad (opcional)</p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <div style={{ flex: 1 }}><label className={LABEL}>Mín. entradas</label><input className={INPUT} type="number" min="2" value={typeForm.bulkMinQty} onChange={e => setTypeForm(f => ({ ...f, bulkMinQty: e.target.value }))} placeholder="Ej: 4" /></div>
                    <div style={{ flex: 1 }}><label className={LABEL}>% descuento</label><input className={INPUT} type="number" min="1" max="99" step="0.5" value={typeForm.bulkDiscountPct} onChange={e => setTypeForm(f => ({ ...f, bulkDiscountPct: e.target.value }))} placeholder="Ej: 10" /></div>
                  </div>
                  <p style={{ fontSize: 10, color: '#9CA3AF', marginTop: 6 }}>Si compran {typeForm.bulkMinQty || 'N'} o más entradas de este tipo, se aplica {typeForm.bulkDiscountPct || '0'}% de descuento.</p>
                </div>
              )}
            </div>
            {typeError && <p style={{ fontSize: 12, color: '#f87171', marginTop: 10 }}>{typeError}</p>}
            <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
              <button onClick={() => setTypeModal(null)} style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: '1px solid #E4E9F0', background: 'none', color: '#6B7280', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={saveType} disabled={typeSaving} style={{ flex: 2, padding: '10px 0', borderRadius: 10, background: 'linear-gradient(135deg,#00E5D0,#0D1E79)', color: '#fff', fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                {typeSaving ? <><Loader2 size={14} className="animate-spin" /> Guardando...</> : typeModal.editing ? 'Guardar' : 'Crear tipo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(15,23,42,0.10)', backdropFilter: 'blur(8px)' }}>
          <div style={{ background: '#0D0E1A', border: '1px solid #E4E9F0', borderRadius: 16, padding: 24, maxWidth: 320, width: '100%', textAlign: 'center' }}>
            <p style={{ fontWeight: 800, fontSize: 15, marginBottom: 8 }}>¿Eliminar evento?</p>
            <p style={{ fontSize: 12, color: '#6B7280', marginBottom: 20 }}>Se eliminarán todos los tipos y ventas. No se puede deshacer.</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setDeleteConfirm(null)} style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: '1px solid #E4E9F0', background: 'none', color: '#6B7280', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={() => deleteEvent(deleteConfirm)} style={{ flex: 1, padding: '10px 0', borderRadius: 10, background: '#7f1d1d', border: 'none', color: '#f87171', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* Reject modal */}
      {rejectModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(15,23,42,0.10)', backdropFilter: 'blur(8px)' }}>
          <div style={{ background: '#0D0E1A', border: '1px solid #E4E9F0', borderRadius: 16, padding: 24, maxWidth: 360, width: '100%' }}>
            <p style={{ fontWeight: 800, fontSize: 15, marginBottom: 12 }}>Rechazar ticket</p>
            <textarea value={rejectNotes} onChange={e => setRejectNotes(e.target.value)} placeholder="Motivo (opcional)" rows={3} style={{ width: '100%', background: '#F0F3F7', border: '1px solid #E4E9F0', borderRadius: 10, padding: '10px 12px', color: '#fff', fontSize: 12, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <button onClick={() => setRejectModal(null)} style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: '1px solid #E4E9F0', background: 'none', color: '#6B7280', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={() => doTicketAction(rejectModal.id, 'reject', rejectNotes)} style={{ flex: 1, padding: '10px 0', borderRadius: 10, background: '#7f1d1d', border: 'none', color: '#f87171', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Rechazar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
  )
}
