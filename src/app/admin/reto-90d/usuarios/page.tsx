'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Users, Plus, Loader2, X, Pause, Play, UserMinus, Phone, Calendar, Link2, Copy, ExternalLink, Check, Pencil, Trash2, Mail, MapPin, Send } from 'lucide-react'

// ═══════════════════════════════════════════════════════════════════════════
// Reto 90D — Panel admin · Miembros (ADMIN-ONLY)
// ═══════════════════════════════════════════════════════════════════════════

const BRAND_GRADIENT = 'linear-gradient(135deg,#FF2D95,#B735B8,#233B8F)'

const SUBNAV = [
  { href: '/admin/reto-90d', label: 'Resumen', exact: true },
  { href: '/admin/reto-90d/tablero', label: 'Tablero' },
  { href: '/admin/reto-90d/tareas', label: 'Tareas' },
  { href: '/admin/reto-90d/usuarios', label: 'Usuarios' },
  { href: '/admin/reto-90d/evidencias', label: 'Evidencias' },
  { href: '/admin/reto-90d/reportes', label: 'Reportes' },
  { href: '/admin/reto-90d/configuracion', label: 'Configuración' },
]

type MemberStatus = 'ACTIVE' | 'PAUSED' | 'REMOVED'

const MEMBER_STATUS: Record<MemberStatus, { label: string; color: string; bg: string }> = {
  ACTIVE: { label: 'Activo', color: '#16A34A', bg: 'rgba(22,163,74,0.1)' },
  PAUSED: { label: 'Pausado', color: '#D97706', bg: 'rgba(217,119,6,0.1)' },
  REMOVED: { label: 'Removido', color: '#6B7280', bg: 'rgba(107,114,128,0.12)' },
}

interface Challenge {
  id: string
  name: string
  isActive?: boolean
}

interface Member {
  id: string
  fullName: string
  phone: string
  email?: string | null
  country?: string | null
  city?: string | null
  status: MemberStatus
  joinedAt: string
}

function extractList<T>(d: unknown, key: string): T[] {
  if (Array.isArray(d)) return d as T[]
  if (d && typeof d === 'object') {
    const obj = d as Record<string, unknown>
    if (Array.isArray(obj[key])) return obj[key] as T[]
    if (Array.isArray(obj.data)) return obj.data as T[]
  }
  return []
}

function extractActiveId(d: unknown, list: Challenge[]): string | null {
  if (d && typeof d === 'object') {
    const obj = d as Record<string, unknown>
    if (typeof obj.activeId === 'string') return obj.activeId
    const active = obj.active
    if (active && typeof active === 'object' && typeof (active as Record<string, unknown>).id === 'string') {
      return (active as Record<string, unknown>).id as string
    }
  }
  const fromList = list.find((c) => c.isActive)
  if (fromList) return fromList.id
  return list[0]?.id ?? null
}

function errMsg(e: unknown): string {
  if (e instanceof Error) return e.message
  return 'Ocurrió un error inesperado'
}

// ── Link de registro público (pertenece al reto activo) ─────────────────────
function RegistrationLink() {
  const [slug, setSlug] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const [noChallenge, setNoChallenge] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const r = await fetch('/api/admin/reto-90d/registration')
      const d = await r.json().catch(() => ({}))
      if (!d.challenge) { setNoChallenge(true); return }
      setNoChallenge(false); setSlug(d.slug ?? null); setOpen(!!d.open)
    } catch { /* silencioso */ } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const url = slug && typeof window !== 'undefined' ? `${window.location.origin}/reto/${slug}` : ''

  async function toggle() {
    setBusy(true)
    try {
      const r = await fetch('/api/admin/reto-90d/registration', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ open: !open }),
      })
      const d = await r.json().catch(() => ({}))
      if (r.ok) { setOpen(!!d.open); if (d.slug) setSlug(d.slug) }
    } finally { setBusy(false) }
  }
  async function copy() {
    if (!url) return
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1800) } catch { /* noop */ }
  }

  if (loading || noChallenge) return null

  const inputStyle: React.CSSProperties = { flex: 1, minWidth: 160, padding: '9px 12px', borderRadius: 10, border: '1px solid #E4E9F0', fontSize: 12.5, color: '#111827', background: '#F5F7FA' }
  const ghost: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 12px', borderRadius: 10, fontSize: 12.5, fontWeight: 700, background: '#fff', border: '1px solid #E4E9F0', cursor: 'pointer', flexShrink: 0, textDecoration: 'none', color: '#111827' }

  return (
    <div style={{ background: '#fff', border: '1px solid #E4E9F0', borderRadius: 16, padding: 18, marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <Link2 size={15} style={{ color: '#B735B8' }} />
        <p style={{ fontSize: 13, fontWeight: 800, color: '#111827', margin: 0 }}>Link de registro público</p>
        <span style={{ fontSize: 10.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: open ? '#16A34A' : '#6B7280', background: open ? 'rgba(22,163,74,0.1)' : 'rgba(107,114,128,0.12)', padding: '2px 8px', borderRadius: 999 }}>
          {open ? 'Abierto' : 'Cerrado'}
        </span>
      </div>
      <p style={{ fontSize: 12, color: '#6B7280', margin: '0 0 12px' }}>
        Comparte este enlace para que los participantes se inscriban solos en este reto (nombre, celular, correo, país y ciudad).
      </p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
        <input readOnly value={url} onFocus={(e) => e.currentTarget.select()} style={inputStyle} />
        <button onClick={copy} style={ghost}>{copied ? <Check size={13} style={{ color: '#16A34A' }} /> : <Copy size={13} />} {copied ? 'Copiado' : 'Copiar'}</button>
        <a href={url || '#'} target="_blank" rel="noopener noreferrer" style={ghost}><ExternalLink size={13} /> Abrir</a>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={toggle}
          disabled={busy}
          style={{
            width: 46, height: 26, borderRadius: 99, border: 'none', cursor: busy ? 'wait' : 'pointer',
            background: open ? BRAND_GRADIENT : '#D9E0EA', position: 'relative', transition: 'background 0.2s', flexShrink: 0,
          }}
        >
          <span style={{ position: 'absolute', top: 3, left: open ? 23 : 3, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
        </button>
        <span style={{ fontSize: 12.5, color: '#6B7280' }}>
          {open ? 'El link acepta registros. Desactívalo para cerrar las inscripciones.' : 'El link está cerrado: nadie puede registrarse. Actívalo para abrir.'}
        </span>
      </div>
    </div>
  )
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ───────────────────────────────────────────────────────────────────────────

function SubNav() {
  const pathname = usePathname()
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 22, borderBottom: '1px solid #E4E9F0', paddingBottom: 12 }}>
      {SUBNAV.map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            style={{
              padding: '7px 14px',
              borderRadius: 999,
              fontSize: 13,
              fontWeight: 700,
              textDecoration: 'none',
              transition: 'all 0.15s',
              color: active ? '#fff' : '#6B7280',
              background: active ? BRAND_GRADIENT : '#fff',
              border: active ? 'none' : '1px solid #E4E9F0',
            }}
          >
            {item.label}
          </Link>
        )
      })}
    </div>
  )
}

export default function AdminReto90dUsuariosPage() {
  const [challengeId, setChallengeId] = useState<string | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actioningId, setActioningId] = useState<string | null>(null)

  // Add member modal
  const [showAdd, setShowAdd] = useState(false)
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Edit member modal
  const [editM, setEditM] = useState<Member | null>(null)
  const [eName, setEName] = useState('')
  const [ePhone, setEPhone] = useState('')
  const [eEmail, setEEmail] = useState('')
  const [eCountry, setECountry] = useState('')
  const [eCity, setECity] = useState('')
  const [editSaving, setEditSaving] = useState(false)
  const [editErr, setEditErr] = useState<string | null>(null)

  // Enviar bienvenida
  const [welcoming, setWelcoming] = useState(false)
  const [welcomeMsg, setWelcomeMsg] = useState<string | null>(null)

  async function loadMembers(cid: string) {
    const r = await fetch(`/api/admin/reto-90d/members?challengeId=${encodeURIComponent(cid)}`)
    if (!r.ok) throw new Error('No se pudieron cargar los miembros')
    const d: unknown = await r.json()
    setMembers(extractList<Member>(d, 'members'))
  }

  async function init() {
    setLoading(true)
    setError(null)
    try {
      const r = await fetch('/api/admin/reto-90d/challenges')
      if (!r.ok) throw new Error('No se pudieron cargar los retos')
      const d: unknown = await r.json()
      const list = extractList<Challenge>(d, 'challenges')
      const activeId = extractActiveId(d, list)
      setChallengeId(activeId)
      if (activeId) await loadMembers(activeId)
      else setMembers([])
    } catch (e) {
      setError(errMsg(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleAdd() {
    if (!challengeId) return
    if (!fullName.trim() || !phone.trim()) {
      setSaveError('Nombre y WhatsApp son obligatorios')
      return
    }
    setSaving(true)
    setSaveError(null)
    try {
      const r = await fetch('/api/admin/reto-90d/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeId, fullName: fullName.trim(), phone: phone.trim() }),
      })
      const j: unknown = await r.json().catch(() => ({}))
      if (!r.ok) {
        const m = (j && typeof j === 'object' && 'error' in j) ? String((j as Record<string, unknown>).error) : 'No se pudo agregar el usuario'
        throw new Error(m)
      }
      setShowAdd(false)
      setFullName('')
      setPhone('')
      await loadMembers(challengeId)
    } catch (e) {
      setSaveError(errMsg(e))
    } finally {
      setSaving(false)
    }
  }

  async function changeStatus(id: string, status: MemberStatus) {
    if (!challengeId) return
    setActioningId(id)
    try {
      const r = await fetch(`/api/admin/reto-90d/members/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!r.ok) throw new Error('No se pudo actualizar el miembro')
      await loadMembers(challengeId)
    } catch (e) {
      setError(errMsg(e))
    } finally {
      setActioningId(null)
    }
  }

  function openEdit(m: Member) {
    setEditM(m)
    setEName(m.fullName || ''); setEPhone(m.phone || ''); setEEmail(m.email || '')
    setECountry(m.country || ''); setECity(m.city || ''); setEditErr(null)
  }

  async function saveEdit() {
    if (!editM || !challengeId) return
    if (!eName.trim() || !ePhone.trim()) { setEditErr('Nombre y celular son obligatorios'); return }
    setEditSaving(true); setEditErr(null)
    try {
      const r = await fetch(`/api/admin/reto-90d/members/${editM.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: eName.trim(), phone: ePhone.trim(), email: eEmail.trim() || null, country: eCountry.trim() || null, city: eCity.trim() || null }),
      })
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'No se pudo guardar')
      setEditM(null); await loadMembers(challengeId)
    } catch (e) { setEditErr(errMsg(e)) } finally { setEditSaving(false) }
  }

  async function hardDelete(m: Member) {
    if (!challengeId) return
    if (!window.confirm(`¿Eliminar definitivamente a ${m.fullName || 'este inscrito'}? No se puede deshacer.`)) return
    setActioningId(m.id)
    try {
      const r = await fetch(`/api/admin/reto-90d/members/${m.id}`, { method: 'DELETE' })
      if (!r.ok) throw new Error('No se pudo eliminar')
      await loadMembers(challengeId)
    } catch (e) { setError(errMsg(e)) } finally { setActioningId(null) }
  }

  async function sendWelcomeBulk() {
    setWelcoming(true); setWelcomeMsg(null)
    try {
      const r = await fetch('/api/admin/reto-90d/send-welcome?scope=withEmail', { method: 'POST' })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(d.error || 'No se pudo enviar')
      setWelcomeMsg(`Bienvenida enviada a ${d.sent}/${d.total} inscritos con correo.`)
    } catch (e) { setWelcomeMsg(errMsg(e)) } finally { setWelcoming(false) }
  }

  return (
    <div className="font-ui">
      {/* Header */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: BRAND_GRADIENT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={16} className="text-white" />
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: '#111827', margin: 0 }}>Reto 90D · Miembros</h1>
        </div>
        <p style={{ fontSize: 13, color: '#6B7280', margin: 0 }}>Personas inscritas en el reto activo.</p>
      </div>

      <SubNav />

      <RegistrationLink />

      {/* Top bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <p style={{ fontSize: 13, color: '#6B7280', margin: 0 }}>
          {loading ? 'Cargando…' : `${members.length} miembro${members.length !== 1 ? 's' : ''}`}
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            onClick={sendWelcomeBulk}
            disabled={welcoming || !challengeId}
            title="Enviar la bienvenida por WhatsApp a los inscritos que tienen correo"
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 10, fontSize: 13, fontWeight: 700,
              background: '#fff', color: '#233B8F', border: '1px solid #E4E9F0', cursor: welcoming ? 'wait' : 'pointer',
            }}
          >
            {welcoming ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} Enviar bienvenida
          </button>
          <button
            onClick={() => { setSaveError(null); setFullName(''); setPhone(''); setShowAdd(true) }}
            disabled={!challengeId}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 10, fontSize: 13, fontWeight: 700,
              background: challengeId ? BRAND_GRADIENT : '#E4E9F0', color: challengeId ? '#fff' : '#9CA3AF',
              border: 'none', cursor: challengeId ? 'pointer' : 'not-allowed',
            }}
          >
            <Plus size={15} /> Agregar usuario
          </button>
        </div>
      </div>

      {welcomeMsg && (
        <div style={{ padding: '10px 14px', borderRadius: 12, background: 'rgba(35,59,143,0.06)', border: '1px solid rgba(35,59,143,0.2)', color: '#233B8F', fontSize: 13, marginBottom: 16 }}>
          {welcomeMsg}
        </div>
      )}

      {error && (
        <div style={{ padding: '12px 14px', borderRadius: 12, background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)', color: '#DC2626', fontSize: 13, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '64px 0' }}>
          <Loader2 size={22} className="animate-spin" style={{ color: '#B735B8' }} />
        </div>
      ) : !challengeId ? (
        <div style={{ textAlign: 'center', padding: '56px 16px', color: '#6B7280', fontSize: 14, background: '#fff', borderRadius: 16, border: '1px solid #E4E9F0' }}>
          No hay un reto activo. Crea o activa un reto para inscribir miembros.
        </div>
      ) : members.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '56px 16px', color: '#6B7280', fontSize: 14, background: '#fff', borderRadius: 16, border: '1px solid #E4E9F0' }}>
          Aún no hay miembros inscritos.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {members.map((m) => {
            const st = MEMBER_STATUS[m.status] ?? MEMBER_STATUS.REMOVED
            const busy = actioningId === m.id
            return (
              <div key={m.id} style={{ padding: '14px 16px', borderRadius: 16, background: '#fff', border: '1px solid #E4E9F0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: '0 0 4px 0' }}>{m.fullName || 'Sin nombre'}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', fontSize: 12, color: '#6B7280' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Phone size={12} /> {m.phone || '—'}</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Calendar size={12} /> {formatDate(m.joinedAt)}</span>
                    </div>
                    {(m.email || m.city || m.country) && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', fontSize: 12, color: '#6B7280', marginTop: 4 }}>
                        {m.email && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Mail size={12} /> {m.email}</span>}
                        {(m.city || m.country) && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><MapPin size={12} /> {[m.city, m.country].filter(Boolean).join(', ')}</span>}
                      </div>
                    )}
                  </div>

                  {/* Status chip */}
                  <span style={{ padding: '4px 12px', borderRadius: 999, fontSize: 11, fontWeight: 800, color: st.color, background: st.bg }}>
                    {st.label}
                  </span>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button onClick={() => openEdit(m)} disabled={busy} title="Editar datos"
                      style={actionBtn('#233B8F', 'rgba(35,59,143,0.08)', 'rgba(35,59,143,0.2)', busy)}>
                      <Pencil size={13} /> Editar
                    </button>
                    {m.status === 'ACTIVE' && (
                      <button onClick={() => changeStatus(m.id, 'PAUSED')} disabled={busy} title="Pausar"
                        style={actionBtn('#D97706', 'rgba(217,119,6,0.08)', 'rgba(217,119,6,0.2)', busy)}>
                        {busy ? <Loader2 size={13} className="animate-spin" /> : <Pause size={13} />} Pausar
                      </button>
                    )}
                    {(m.status === 'PAUSED' || m.status === 'REMOVED') && (
                      <button onClick={() => changeStatus(m.id, 'ACTIVE')} disabled={busy} title="Reactivar"
                        style={actionBtn('#16A34A', 'rgba(22,163,74,0.08)', 'rgba(22,163,74,0.2)', busy)}>
                        {busy ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />} Reactivar
                      </button>
                    )}
                    {m.status !== 'REMOVED' && (
                      <button onClick={() => changeStatus(m.id, 'REMOVED')} disabled={busy} title="Quitar (pausa sin borrar)"
                        style={actionBtn('#D97706', 'rgba(217,119,6,0.08)', 'rgba(217,119,6,0.2)', busy)}>
                        {busy ? <Loader2 size={13} className="animate-spin" /> : <UserMinus size={13} />} Quitar
                      </button>
                    )}
                    <button onClick={() => hardDelete(m)} disabled={busy} title="Eliminar definitivamente"
                      style={actionBtn('#DC2626', 'rgba(220,38,38,0.08)', 'rgba(220,38,38,0.2)', busy)}>
                      {busy ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />} Eliminar
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add member modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(17,24,39,0.45)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => { if (e.target === e.currentTarget && !saving) setShowAdd(false) }}>
          <div style={{ background: '#fff', border: '1px solid #E4E9F0', borderRadius: 20, padding: 24, width: '100%', maxWidth: 420 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: '#111827', margin: 0 }}>Agregar usuario</h3>
              <button onClick={() => { if (!saving) setShowAdd(false) }} style={{ background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 6 }}>Nombre completo *</label>
                <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="María Pérez"
                  style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 6 }}>WhatsApp *</label>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+591 700 00000"
                  style={inputStyle} />
              </div>

              {saveError && <p style={{ fontSize: 12, color: '#DC2626', margin: 0 }}>{saveError}</p>}

              <div style={{ display: 'flex', gap: 10, marginTop: 2 }}>
                <button onClick={() => { if (!saving) setShowAdd(false) }} disabled={saving}
                  style={{ flex: 1, padding: '10px 0', borderRadius: 10, fontSize: 13, fontWeight: 600, background: '#F0F3F7', border: '1px solid #E4E9F0', color: '#6B7280', cursor: saving ? 'not-allowed' : 'pointer' }}>
                  Cancelar
                </button>
                <button onClick={handleAdd} disabled={saving}
                  style={{ flex: 2, padding: '10px 0', borderRadius: 10, fontSize: 13, fontWeight: 700, background: BRAND_GRADIENT, border: 'none', color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                  {saving ? <Loader2 size={14} className="animate-spin mx-auto" /> : 'Agregar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit member modal */}
      {editM && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(17,24,39,0.45)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => { if (e.target === e.currentTarget && !editSaving) setEditM(null) }}>
          <div style={{ background: '#fff', border: '1px solid #E4E9F0', borderRadius: 20, padding: 24, width: '100%', maxWidth: 440 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: '#111827', margin: 0 }}>Editar inscrito</h3>
              <button onClick={() => { if (!editSaving) setEditM(null) }} style={{ background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 6 }}>Nombre completo *</label>
                <input type="text" value={eName} onChange={(e) => setEName(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 6 }}>WhatsApp *</label>
                <input type="tel" value={ePhone} onChange={(e) => setEPhone(e.target.value)} placeholder="591700..." style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 6 }}>Correo</label>
                <input type="email" value={eEmail} onChange={(e) => setEEmail(e.target.value)} style={inputStyle} />
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 140px' }}>
                  <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 6 }}>País</label>
                  <input type="text" value={eCountry} onChange={(e) => setECountry(e.target.value)} style={inputStyle} />
                </div>
                <div style={{ flex: '1 1 140px' }}>
                  <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 6 }}>Ciudad</label>
                  <input type="text" value={eCity} onChange={(e) => setECity(e.target.value)} style={inputStyle} />
                </div>
              </div>
              {editErr && <p style={{ fontSize: 12, color: '#DC2626', margin: 0 }}>{editErr}</p>}
              <div style={{ display: 'flex', gap: 10, marginTop: 2 }}>
                <button onClick={() => { if (!editSaving) setEditM(null) }} disabled={editSaving}
                  style={{ flex: 1, padding: '10px 0', borderRadius: 10, fontSize: 13, fontWeight: 600, background: '#F0F3F7', border: '1px solid #E4E9F0', color: '#6B7280', cursor: editSaving ? 'not-allowed' : 'pointer' }}>
                  Cancelar
                </button>
                <button onClick={saveEdit} disabled={editSaving}
                  style={{ flex: 2, padding: '10px 0', borderRadius: 10, fontSize: 13, fontWeight: 700, background: BRAND_GRADIENT, border: 'none', color: '#fff', cursor: editSaving ? 'not-allowed' : 'pointer', opacity: editSaving ? 0.7 : 1 }}>
                  {editSaving ? <Loader2 size={14} className="animate-spin mx-auto" /> : 'Guardar cambios'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 11px', borderRadius: 10, fontSize: 13, color: '#111827',
  background: '#F9FAFC', border: '1px solid #E4E9F0', outline: 'none', boxSizing: 'border-box',
}

function actionBtn(color: string, bg: string, border: string, busy: boolean): React.CSSProperties {
  return {
    display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 11px', borderRadius: 9,
    fontSize: 12, fontWeight: 700, color, background: bg, border: `1px solid ${border}`,
    cursor: busy ? 'wait' : 'pointer',
  }
}
