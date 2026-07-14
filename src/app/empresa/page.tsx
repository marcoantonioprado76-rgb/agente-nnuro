'use client'

import { useState, useEffect } from 'react'

const DG = 'linear-gradient(135deg,#FF2D95 0%,#B735B8 48%,#233B8F 100%)'

interface OrgUser {
  id: string
  username: string
  fullName: string
  email: string
  plan: string
  isActive: boolean
  planExpiresAt: string | null
  orgRole: string
}
interface OrgInfo { name: string; slug: string; maxUsers: number; active: boolean; memberCount: number }

function daysLeft(exp: string | null): number | null {
  if (!exp) return null
  return Math.ceil((new Date(exp).getTime() - Date.now()) / 86400000)
}

async function logout() {
  await fetch('/api/auth/logout', { method: 'POST' })
  window.location.href = '/login'
}

export default function EmpresaPage() {
  const [guardOk, setGuardOk] = useState(false)
  const [loading, setLoading] = useState(true)
  const [org, setOrg] = useState<OrgInfo | null>(null)
  const [users, setUsers] = useState<OrgUser[]>([])
  const [error, setError] = useState('')

  // modales
  const [showAdd, setShowAdd] = useState(false)
  const [addUsername, setAddUsername] = useState('')
  const [addError, setAddError] = useState('')
  const [busy, setBusy] = useState(false)
  const [planModal, setPlanModal] = useState<OrgUser | null>(null)
  const [planChoice, setPlanChoice] = useState('PRO')
  const [daysModal, setDaysModal] = useState<OrgUser | null>(null)
  const [customDays, setCustomDays] = useState('')
  const [removeModal, setRemoveModal] = useState<OrgUser | null>(null)
  const [copied, setCopied] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)

  const inviteLink = org ? `${typeof window !== 'undefined' ? window.location.origin : ''}/registro/${org.slug}` : ''
  function copyInvite() {
    if (!inviteLink) return
    navigator.clipboard?.writeText(inviteLink).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) }).catch(() => {})
  }

  useEffect(() => {
    fetch('/api/plan-status')
      .then(r => r.json())
      .then(d => {
        if (d.orgRole !== 'ORG_ADMIN') { window.location.href = '/dashboard'; return }
        setGuardOk(true)
        loadUsers()
        fetch('/api/empresa/purchases').then(r => r.json()).then(d => setPendingCount((d.requests || []).filter((x: { status: string }) => x.status === 'PENDING').length)).catch(() => {})
      })
      .catch(() => { window.location.href = '/dashboard' })
  }, [])

  async function loadUsers() {
    setLoading(true)
    setError('')
    try {
      const r = await fetch('/api/empresa/users')
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Error al cargar')
      setOrg(d.organization)
      setUsers(d.users || [])
    } catch (e: any) {
      setError(e.message || 'Error al cargar')
    } finally {
      setLoading(false)
    }
  }

  async function addUser() {
    if (!addUsername.trim()) return
    setBusy(true); setAddError('')
    try {
      const r = await fetch('/api/empresa/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: addUsername.trim().replace(/^@/, '') }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'No se pudo agregar')
      setShowAdd(false); setAddUsername('')
      await loadUsers()
    } catch (e: any) {
      setAddError(e.message || 'No se pudo agregar')
    } finally {
      setBusy(false)
    }
  }

  async function patchUser(id: string, body: Record<string, unknown>) {
    setBusy(true)
    try {
      const r = await fetch(`/api/empresa/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Error')
      await loadUsers()
    } catch (e: any) {
      alert(e.message || 'Error')
    } finally {
      setBusy(false)
      setPlanModal(null); setDaysModal(null); setRemoveModal(null); setCustomDays('')
    }
  }

  if (!guardOk) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#0B1B2B', color: '#fff' }}>
        <p style={{ opacity: 0.7 }}>Cargando…</p>
      </div>
    )
  }

  const full = org && org.maxUsers > 0 && org.memberCount >= org.maxUsers

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg,#F5F7FB 0%,#EEF1F8 100%)', color: '#0B1B2B' }}>
      {/* Top bar — chrome propio del panel de empresa */}
      <header style={{ background: 'linear-gradient(135deg,#0B1B2B,#050B14)', color: '#fff', padding: '14px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 6px 24px rgba(5,11,20,0.35)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src="/logo-oficial-mydiamond.png" alt="MY DIAMOND" style={{ height: 34, filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.5))' }} />
          <div>
            <p style={{ fontWeight: 800, fontSize: 15, lineHeight: 1.1 }}>Panel de Empresa</p>
            <p style={{ fontSize: 12, opacity: 0.7 }}>{org?.name ?? ''}</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <a href="/empresa/contenido" style={navLink}><i className="fa-solid fa-layer-group" style={{ marginRight: 6 }} />Mi Contenido</a>
          <a href="/empresa/solicitudes" style={{ ...navLink, position: 'relative' }}>
            <i className="fa-solid fa-receipt" style={{ marginRight: 6 }} />Solicitudes
            {pendingCount > 0 && <span style={{ position: 'absolute', top: -6, right: -6, background: '#ef4444', color: '#fff', borderRadius: 999, fontSize: 11, fontWeight: 800, minWidth: 18, height: 18, display: 'grid', placeItems: 'center', padding: '0 5px' }}>{pendingCount}</span>}
          </a>
          <a href="/empresa/reportes" style={navLink}><i className="fa-solid fa-chart-simple" style={{ marginRight: 6 }} />Reportes</a>
          <a href="/empresa/cobro" style={navLink}><i className="fa-solid fa-wallet" style={{ marginRight: 6 }} />Cobro y marca</a>
          <button onClick={logout} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,180,180,0.95)', padding: '8px 14px', borderRadius: 10, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
            <i className="fa-solid fa-right-from-bracket" style={{ marginRight: 6 }} />Salir
          </button>
        </div>
      </header>

      <main style={{ maxWidth: 980, margin: '0 auto', padding: '26px 18px 60px' }}>
        {/* Tarjeta de la empresa */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center', justifyContent: 'space-between', background: '#fff', border: '1px solid #E4E9F0', borderRadius: 18, padding: '20px 22px', boxShadow: '0 10px 30px -18px rgba(11,27,43,0.4)' }}>
          <div>
            <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9AA3B2' }}>Tu empresa</p>
            <h1 style={{ fontSize: 24, fontWeight: 900, margin: '2px 0 0' }}>{org?.name}</h1>
            <p style={{ fontSize: 13, color: '#5B6472', marginTop: 4 }}>
              <i className="fa-solid fa-circle" style={{ fontSize: 8, color: org?.active ? '#22c55e' : '#ef4444', marginRight: 6 }} />
              {org?.active ? 'Empresa activa' : 'Empresa inactiva'}
            </p>
          </div>
          <div style={{ textAlign: 'center', background: 'linear-gradient(135deg,rgba(255,45,149,0.08),rgba(35,59,143,0.08))', border: '1px solid #E4E9F0', borderRadius: 14, padding: '12px 22px' }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#9AA3B2' }}>Usuarios / Cupo</p>
            <p style={{ fontSize: 26, fontWeight: 900, background: DG, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {org?.memberCount} <span style={{ color: '#C4CCD8', WebkitTextFillColor: '#C4CCD8' }}>/ {org?.maxUsers || '∞'}</span>
            </p>
          </div>
        </div>

        {/* Recordatorio de facturación */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', background: 'rgba(35,59,143,0.06)', border: '1px solid rgba(35,59,143,0.15)', borderRadius: 12, padding: '12px 16px', marginTop: 14, fontSize: 13, color: '#33405A' }}>
          <i className="fa-solid fa-file-invoice-dollar" style={{ color: '#B735B8' }} />
          Vos activás a tus usuarios y les cobrás con <strong>&nbsp;tu propia factura</strong>.
        </div>

        {/* Link de invitación de la empresa */}
        {org && (
          <div style={{ background: '#fff', border: '1px solid #E4E9F0', borderRadius: 14, padding: '14px 16px', marginTop: 14 }}>
            <p style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9AA3B2', marginBottom: 5 }}>
              <i className="fa-solid fa-link" style={{ marginRight: 6, color: '#B735B8' }} />Link de invitación
            </p>
            <p style={{ fontSize: 12.5, color: '#5B6472', marginBottom: 9 }}>Pasale este link a tu gente: quien se registre ahí queda <strong>dentro de tu empresa</strong> automáticamente (después lo activás acá abajo).</p>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <input readOnly value={inviteLink} onFocus={e => e.currentTarget.select()} style={{ flex: 1, minWidth: 220, padding: '9px 12px', borderRadius: 10, border: '1px solid #D5DCE6', fontSize: 13, background: '#F7F9FC', color: '#233B8F', fontWeight: 600 }} />
              <button onClick={copyInvite} style={{ background: copied ? '#16a34a' : DG, color: '#fff', border: 'none', borderRadius: 10, padding: '10px 18px', fontWeight: 800, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                <i className={`fa-solid ${copied ? 'fa-check' : 'fa-copy'}`} style={{ marginRight: 6 }} />{copied ? 'Copiado' : 'Copiar link'}
              </button>
            </div>
          </div>
        )}

        {/* Acciones */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '24px 0 12px' }}>
          <h2 style={{ fontSize: 16, fontWeight: 800 }}>Usuarios de tu empresa</h2>
          <button
            onClick={() => { setShowAdd(true); setAddError(''); setAddUsername('') }}
            disabled={!!full}
            title={full ? 'Cupo alcanzado' : ''}
            style={{ background: full ? '#C4CCD8' : DG, color: '#fff', border: 'none', borderRadius: 11, padding: '10px 18px', fontWeight: 800, fontSize: 13, cursor: full ? 'not-allowed' : 'pointer', boxShadow: full ? 'none' : '0 8px 22px -10px rgba(183,53,184,0.7)' }}
          >
            <i className="fa-solid fa-user-plus" style={{ marginRight: 7 }} />Agregar usuario
          </button>
        </div>
        {full && <p style={{ fontSize: 12, color: '#d97706', marginBottom: 8 }}>Alcanzaste el cupo de tu contrato ({org?.maxUsers}). Contactá a MY DIAMOND para ampliarlo.</p>}

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: 12, padding: '12px 16px', marginBottom: 12, fontSize: 13 }}>
            {error} <button onClick={loadUsers} style={{ marginLeft: 8, textDecoration: 'underline', cursor: 'pointer' }}>Reintentar</button>
          </div>
        )}

        {/* Lista */}
        {loading ? (
          <p style={{ color: '#9AA3B2', padding: '30px 0', textAlign: 'center' }}>Cargando usuarios…</p>
        ) : users.length === 0 ? (
          <div style={{ background: '#fff', border: '1px dashed #D5DCE6', borderRadius: 16, padding: '40px 20px', textAlign: 'center', color: '#7A8494' }}>
            <i className="fa-solid fa-users" style={{ fontSize: 26, opacity: 0.4 }} />
            <p style={{ marginTop: 10, fontSize: 14 }}>Todavía no tenés usuarios. Agregá el primero con su @username.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {users.map(u => {
              const d = daysLeft(u.planExpiresAt)
              const dCls = d === null ? '#9CA3AF' : d <= 0 ? '#ef4444' : d <= 7 ? '#f59e0b' : '#16a34a'
              const dTxt = d === null ? 'Sin plan' : d <= 0 ? '⚠ Vencido' : `${d} día${d === 1 ? '' : 's'} rest.`
              return (
                <div key={u.id} style={{ background: '#fff', border: '1px solid #E4E9F0', borderRadius: 14, padding: '14px 16px', display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 6px 18px -14px rgba(11,27,43,0.35)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 200 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 11, background: DG, color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 16 }}>
                      {(u.fullName || u.username || '?').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p style={{ fontWeight: 700, fontSize: 14 }}>{u.fullName || u.username}</p>
                      <p style={{ fontSize: 12, color: '#8A93A2' }}>@{u.username}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 9px', borderRadius: 999, background: u.plan === 'NONE' ? '#F1F3F8' : 'rgba(183,53,184,0.1)', color: u.plan === 'NONE' ? '#9AA3B2' : '#B735B8', border: '1px solid #E4E9F0' }}>{u.plan}</span>
                    <span style={{ fontSize: 12, fontWeight: 800, color: dCls }}>{dTxt}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: u.isActive ? '#16a34a' : '#ef4444' }}>{u.isActive ? 'Activo' : 'Inactivo'}</span>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => { setPlanModal(u); setPlanChoice(u.plan === 'NONE' ? 'PRO' : u.plan) }} title="Activar / cambiar plan" style={iconBtn}><i className="fa-solid fa-crown" /></button>
                      <button onClick={() => { setDaysModal(u); setCustomDays('') }} title="Ampliar días" style={iconBtn}><i className="fa-solid fa-calendar-plus" /></button>
                      <button onClick={() => patchUser(u.id, { isActive: !u.isActive })} title={u.isActive ? 'Desactivar' : 'Activar'} style={iconBtn}><i className={`fa-solid ${u.isActive ? 'fa-pause' : 'fa-play'}`} /></button>
                      <button onClick={() => setRemoveModal(u)} title="Quitar de la empresa" style={{ ...iconBtn, color: '#ef4444' }}><i className="fa-solid fa-user-minus" /></button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* Modal: agregar usuario */}
      {showAdd && (
        <Modal onClose={() => setShowAdd(false)} title="Agregar usuario">
          <p style={{ fontSize: 13, color: '#5B6472', marginBottom: 10 }}>Ingresá el <strong>@username</strong> de un usuario ya registrado en MY DIAMOND para sumarlo a tu empresa.</p>
          <input
            autoFocus value={addUsername}
            onChange={e => setAddUsername(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addUser()}
            placeholder="@username"
            style={inputStyle}
          />
          {addError && <p style={{ color: '#dc2626', fontSize: 12, marginTop: 8 }}>{addError}</p>}
          <div style={modalActions}>
            <button onClick={() => setShowAdd(false)} style={btnGhost}>Cancelar</button>
            <button onClick={addUser} disabled={busy} style={{ ...btnPrimary, opacity: busy ? 0.6 : 1 }}>{busy ? 'Agregando…' : 'Agregar'}</button>
          </div>
        </Modal>
      )}

      {/* Modal: activar plan */}
      {planModal && (
        <Modal onClose={() => setPlanModal(null)} title={`Activar plan — @${planModal.username}`}>
          <p style={{ fontSize: 13, color: '#5B6472', marginBottom: 12 }}>Elegí el plan a activar (30 días). Recordá cobrarle con tu factura.</p>
          <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
            {['BASIC', 'PRO', 'ELITE'].map(p => (
              <button key={p} onClick={() => setPlanChoice(p)} style={{ flex: 1, padding: '12px 0', borderRadius: 11, fontWeight: 800, fontSize: 13, cursor: 'pointer', border: planChoice === p ? '2px solid #B735B8' : '1px solid #E4E9F0', background: planChoice === p ? 'rgba(183,53,184,0.08)' : '#fff', color: planChoice === p ? '#B735B8' : '#5B6472' }}>{p}</button>
            ))}
          </div>
          <div style={modalActions}>
            <button onClick={() => patchUser(planModal.id, { plan: 'NONE' })} disabled={busy} style={{ ...btnGhost, color: '#ef4444' }}>Quitar plan</button>
            <button onClick={() => patchUser(planModal.id, { plan: planChoice })} disabled={busy} style={{ ...btnPrimary, opacity: busy ? 0.6 : 1 }}>{busy ? 'Aplicando…' : 'Activar'}</button>
          </div>
        </Modal>
      )}

      {/* Modal: ampliar días */}
      {daysModal && (
        <Modal onClose={() => setDaysModal(null)} title={`Ampliar días — @${daysModal.username}`}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            {[7, 30, 90].map(n => (
              <button key={n} onClick={() => patchUser(daysModal.id, { addDays: n })} disabled={busy} style={{ flex: 1, padding: '12px 0', borderRadius: 11, fontWeight: 800, cursor: 'pointer', border: '1px solid #E4E9F0', background: '#fff', color: '#233B8F' }}>+{n}</button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input type="number" min={1} value={customDays} onChange={e => setCustomDays(e.target.value)} placeholder="días" style={{ ...inputStyle, flex: 1, marginTop: 0 }} />
            <button onClick={() => customDays && patchUser(daysModal.id, { addDays: parseInt(customDays) })} disabled={busy || !customDays} style={{ ...btnPrimary, opacity: (busy || !customDays) ? 0.6 : 1 }}>Sumar</button>
          </div>
        </Modal>
      )}

      {/* Modal: quitar */}
      {removeModal && (
        <Modal onClose={() => setRemoveModal(null)} title="Quitar de la empresa">
          <p style={{ fontSize: 14, color: '#5B6472' }}>¿Seguro que querés quitar a <strong>@{removeModal.username}</strong> de tu empresa? Su cuenta no se elimina, solo deja de pertenecer a la empresa.</p>
          <div style={modalActions}>
            <button onClick={() => setRemoveModal(null)} style={btnGhost}>Cancelar</button>
            <button onClick={() => patchUser(removeModal.id, { remove: true })} disabled={busy} style={{ ...btnPrimary, background: '#ef4444', boxShadow: 'none', opacity: busy ? 0.6 : 1 }}>{busy ? 'Quitando…' : 'Quitar'}</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

const navLink: React.CSSProperties = { background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.18)', color: '#fff', padding: '8px 14px', borderRadius: 10, fontWeight: 700, fontSize: 13, textDecoration: 'none' }
const iconBtn: React.CSSProperties = { width: 34, height: 34, borderRadius: 9, border: '1px solid #E4E9F0', background: '#fff', color: '#5B6472', cursor: 'pointer', fontSize: 13 }
const inputStyle: React.CSSProperties = { width: '100%', padding: '11px 14px', borderRadius: 11, border: '1px solid #D5DCE6', fontSize: 14, marginTop: 4, outline: 'none' }
const modalActions: React.CSSProperties = { display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 18 }
const btnGhost: React.CSSProperties = { padding: '10px 16px', borderRadius: 10, border: '1px solid #E4E9F0', background: '#fff', color: '#5B6472', fontWeight: 700, cursor: 'pointer', fontSize: 13 }
const btnPrimary: React.CSSProperties = { padding: '10px 18px', borderRadius: 10, border: 'none', background: DG, color: '#fff', fontWeight: 800, cursor: 'pointer', fontSize: 13, boxShadow: '0 8px 22px -10px rgba(183,53,184,0.7)' }

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(5,11,20,0.55)', display: 'grid', placeItems: 'center', padding: 16, zIndex: 50 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 440, background: '#fff', borderRadius: 18, overflow: 'hidden', boxShadow: '0 30px 80px -20px rgba(5,11,20,0.6)' }}>
        <div style={{ height: 4, background: DG }} />
        <div style={{ padding: '20px 22px' }}>
          <h3 style={{ fontSize: 17, fontWeight: 900, marginBottom: 12 }}>{title}</h3>
          {children}
        </div>
      </div>
    </div>
  )
}
