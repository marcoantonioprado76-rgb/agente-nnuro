'use client'

import { useEffect, useState } from 'react'
import { Trophy, Pencil, Trash2, Plus, Check, X, CalendarDays, Loader2, Power } from 'lucide-react'

const BRAND = 'linear-gradient(135deg,#1fb8bb,#147e95,#12303a)'
const BORDER = '#E4E9F0'
const TEXT = '#111827'
const MUTED = '#6B7280'

interface Ch {
  id: string
  name: string
  startDate?: string | null
  endDate?: string | null
  isActive?: boolean
}

function fmt(v?: string | null) {
  if (!v) return '—'
  const d = new Date(v)
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
}
function todayStr() { return new Date().toISOString().slice(0, 10) }
function plusDaysStr(n: number) { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10) }
function toDateInput(v?: string | null) {
  if (!v) return todayStr()
  const d = new Date(v)
  return isNaN(d.getTime()) ? todayStr() : d.toISOString().slice(0, 10)
}

const input: React.CSSProperties = { width: '100%', padding: '9px 12px', borderRadius: 10, border: `1px solid ${BORDER}`, fontSize: 13, color: TEXT, background: '#fff' }
const label: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: MUTED, marginBottom: 5, display: 'block' }

export default function RetoLayout({ children }: { children: React.ReactNode }) {
  const [challenges, setChallenges] = useState<Ch[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const [editing, setEditing] = useState<Ch | null>(null)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [start, setStart] = useState(todayStr())
  const [end, setEnd] = useState(plusDaysStr(89))

  async function load() {
    setLoading(true); setErr(null)
    try {
      const r = await fetch('/api/admin/reto-90d/challenges')
      const j = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(j.error ?? `Error ${r.status}`)
      const list: Ch[] = j.challenges ?? j.data ?? (Array.isArray(j) ? j : [])
      setChallenges(list)
      setActiveId(j.activeId ?? list.find((c) => c.isActive)?.id ?? null)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'No se pudieron cargar los retos.')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  const active = challenges.find((c) => c.id === activeId) ?? challenges.find((c) => c.isActive) ?? null

  function openCreate() {
    setName(''); setStart(todayStr()); setEnd(plusDaysStr(89)); setCreating(true); setErr(null)
  }
  function openEdit(c: Ch) {
    setEditing(c); setName(c.name); setStart(toDateInput(c.startDate)); setEnd(toDateInput(c.endDate)); setErr(null)
  }

  async function submitCreate() {
    if (!name.trim()) { setErr('Ponle un nombre al reto.'); return }
    setBusy('create'); setErr(null)
    try {
      const r = await fetch('/api/admin/reto-90d/challenges', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), startDate: `${start}T00:00:00`, endDate: `${end}T23:59:59`, isActive: true }),
      })
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? `Error ${r.status}`)
      window.location.reload()
    } catch (e) { setErr(e instanceof Error ? e.message : 'No se pudo crear el reto.'); setBusy(null) }
  }

  async function submitEdit() {
    if (!editing) return
    if (!name.trim()) { setErr('El nombre no puede quedar vacío.'); return }
    setBusy('edit'); setErr(null)
    try {
      const r = await fetch(`/api/admin/reto-90d/challenges/${editing.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), startDate: `${start}T00:00:00`, endDate: `${end}T23:59:59` }),
      })
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? `Error ${r.status}`)
      window.location.reload()
    } catch (e) { setErr(e instanceof Error ? e.message : 'No se pudo guardar.'); setBusy(null) }
  }

  async function activate(id: string) {
    setBusy(id); setErr(null)
    try {
      const r = await fetch(`/api/admin/reto-90d/challenges/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isActive: true }),
      })
      if (!r.ok) throw new Error(`Error ${r.status}`)
      window.location.reload()
    } catch (e) { setErr(e instanceof Error ? e.message : 'No se pudo activar.'); setBusy(null) }
  }

  async function remove(c: Ch) {
    if (!window.confirm(`¿Eliminar el reto "${c.name}"? Se borrarán sus tareas, usuarios y evidencias. Esta acción no se puede deshacer.`)) return
    setBusy('del'); setErr(null)
    try {
      // El usuario YA confirmó en el diálogo → mandamos confirm=1 (el backend lo exige
      // para borrar un reto ACTIVO). Sin esto el borrado del reto activo siempre fallaba.
      const r = await fetch(`/api/admin/reto-90d/challenges/${c.id}?confirm=1`, { method: 'DELETE' })
      if (!r.ok) {
        const j = await r.json().catch(() => ({}))
        throw new Error(j.error ?? `Error ${r.status}`)
      }
      window.location.reload()
    } catch (e) { setErr(e instanceof Error ? e.message : 'No se pudo eliminar.'); setBusy(null) }
  }

  const btnGhost: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 9, fontSize: 12.5, fontWeight: 700, background: '#fff', border: `1px solid ${BORDER}`, cursor: 'pointer' }
  const btnBrand: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 10, fontSize: 13, fontWeight: 800, color: '#fff', border: 'none', background: BRAND, cursor: 'pointer' }

  return (
    <div className="font-ui" style={{ color: TEXT }}>
      {/* ── Barra de contexto del reto (dueño de todo) ─────────────────────── */}
      <div style={{ background: 'linear-gradient(135deg, rgba(255,45,149,0.05), rgba(35,59,143,0.05))', border: `1px solid ${BORDER}`, borderRadius: 16, padding: 16, marginBottom: 18 }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0' }}><Loader2 size={18} className="animate-spin" style={{ color: MUTED }} /></div>
        ) : active ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: BRAND, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Trophy size={19} className="text-white" />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <h2 style={{ fontSize: 17, fontWeight: 800, margin: 0, letterSpacing: '-0.01em' }}>{active.name}</h2>
                  <span style={{ fontSize: 10.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#16A34A', background: 'rgba(22,163,74,0.1)', padding: '2px 8px', borderRadius: 999 }}>Activo</span>
                </div>
                <p style={{ fontSize: 12, color: MUTED, margin: '3px 0 0', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <CalendarDays size={12} /> {fmt(active.startDate)} → {fmt(active.endDate)} · Todo lo que configures pertenece a este reto
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              {challenges.length > 1 && (
                <select value={active.id} onChange={(e) => activate(e.target.value)} style={{ ...btnGhost, cursor: 'pointer', paddingRight: 8 }}>
                  {challenges.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              )}
              <button onClick={() => openEdit(active)} style={btnGhost}><Pencil size={13} /> Editar</button>
              <button onClick={() => remove(active)} disabled={busy === 'del'} style={{ ...btnGhost, color: '#DC2626' }}><Trash2 size={13} /> Eliminar</button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <p style={{ fontSize: 14, fontWeight: 800, margin: 0 }}>No hay un reto activo</p>
                <p style={{ fontSize: 12.5, color: MUTED, margin: '2px 0 0' }}>Crea tu reto: dentro de él configurarás tareas, usuarios y ajustes.</p>
              </div>
              <button onClick={openCreate} style={btnBrand}><Plus size={15} /> Crear reto</button>
            </div>
            {challenges.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {challenges.map((c) => (
                  <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 10, border: `1px solid ${BORDER}`, background: '#fff' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>{c.name}</p>
                      <p style={{ fontSize: 11.5, color: MUTED, margin: '2px 0 0' }}>{fmt(c.startDate)} → {fmt(c.endDate)}</p>
                    </div>
                    <button onClick={() => activate(c.id)} disabled={busy === c.id} style={{ ...btnGhost, color: '#233B8F' }}>
                      <Power size={12} /> {busy === c.id ? 'Activando…' : 'Activar'}
                    </button>
                    <button onClick={() => remove(c)} style={{ ...btnGhost, color: '#DC2626' }}><Trash2 size={12} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {err && <p style={{ fontSize: 12, color: '#DC2626', margin: '10px 0 0' }}>{err}</p>}
      </div>

      {children}

      {/* ── Modal crear / editar reto ──────────────────────────────────────── */}
      {(creating || editing) && (
        <div onClick={() => { setCreating(false); setEditing(null) }} style={{ position: 'fixed', inset: 0, background: 'rgba(17,24,39,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 60 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 18, padding: 22, width: '100%', maxWidth: 440, boxShadow: '0 20px 60px rgba(17,24,39,0.25)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>{editing ? 'Editar reto' : 'Crear reto'}</h3>
              <button onClick={() => { setCreating(false); setEditing(null) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: MUTED }}><X size={18} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={label}>Nombre del reto</label>
                <input style={input} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Reto 90 Días — Julio" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label style={label}>Inicio</label><input type="date" style={input} value={start} onChange={(e) => setStart(e.target.value)} /></div>
                <div><label style={label}>Fin</label><input type="date" style={input} value={end} onChange={(e) => setEnd(e.target.value)} /></div>
              </div>
              {err && <p style={{ fontSize: 12.5, color: '#DC2626', margin: 0 }}>{err}</p>}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
                <button onClick={() => { setCreating(false); setEditing(null) }} style={btnGhost}>Cancelar</button>
                <button onClick={editing ? submitEdit : submitCreate} disabled={busy === 'create' || busy === 'edit'} style={btnBrand}>
                  {busy === 'create' || busy === 'edit' ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  {editing ? 'Guardar' : 'Crear y activar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
