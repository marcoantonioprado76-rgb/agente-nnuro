'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Building2,
  Loader2,
  Plus,
  Trash2,
  AlertTriangle,
  X,
  Users,
  UserCog,
  SlidersHorizontal,
  Check,
} from 'lucide-react'

interface Organization {
  id: string
  name: string
  slug: string
  maxUsers: number
  active: boolean
  billingNote: string | null
  logoUrl: string | null
  createdAt: string
  memberCount: number
  admin: { username: string; fullName: string } | null
}

export default function AdminOrganizationsPage() {
  const [orgs, setOrgs] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updating, setUpdating] = useState<string | null>(null)

  // Create modal
  const [createOpen, setCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createErr, setCreateErr] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', maxUsers: '10', adminUsername: '' })

  // Edit quota modal
  const [quotaModal, setQuotaModal] = useState<Organization | null>(null)
  const [quotaValue, setQuotaValue] = useState('')

  // Assign admin modal
  const [assignModal, setAssignModal] = useState<Organization | null>(null)
  const [assignUsername, setAssignUsername] = useState('')
  const [assigning, setAssigning] = useState(false)
  const [assignErr, setAssignErr] = useState<string | null>(null)

  // Delete modal
  const [deleteModal, setDeleteModal] = useState<Organization | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchOrgs = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/organizations')
      if (!res.ok) {
        setError('No se pudieron cargar las empresas')
        setLoading(false)
        return
      }
      const data = await res.json()
      setOrgs(data.organizations ?? [])
    } catch {
      setError('No se pudieron cargar las empresas')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchOrgs()
  }, [fetchOrgs])

  async function patchOrg(id: string, patch: Record<string, unknown>) {
    setUpdating(id)
    try {
      const res = await fetch(`/api/admin/organizations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        alert(data.error ?? 'No se pudo actualizar la empresa')
        return false
      }
      await fetchOrgs()
      return true
    } catch {
      alert('No se pudo actualizar la empresa')
      return false
    } finally {
      setUpdating(null)
    }
  }

  async function createOrg() {
    if (!form.name.trim()) {
      setCreateErr('El nombre es obligatorio')
      return
    }
    setCreating(true)
    setCreateErr(null)
    try {
      const max = parseInt(form.maxUsers)
      const res = await fetch('/api/admin/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          ...(Number.isFinite(max) && max > 0 ? { maxUsers: max } : {}),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setCreateErr(
          res.status === 409
            ? 'Ya existe una empresa con ese identificador (slug)'
            : data.error ?? 'No se pudo crear la empresa',
        )
        return
      }
      // Optionally assign the admin in one shot
      const adminUser = form.adminUsername.trim()
      const newOrg = data.organization ?? data
      if (adminUser && newOrg?.id) {
        const assignRes = await fetch(`/api/admin/organizations/${newOrg.id}/assign`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: adminUser, role: 'ORG_ADMIN' }),
        })
        if (!assignRes.ok) {
          const aData = await assignRes.json().catch(() => ({}))
          // Org was created; just surface the assign error and refresh.
          alert(aData.error ?? `No se pudo asignar a @${adminUser} como admin. La empresa fue creada.`)
        }
      }
      setCreateOpen(false)
      setForm({ name: '', maxUsers: '10', adminUsername: '' })
      await fetchOrgs()
    } catch {
      setCreateErr('No se pudo crear la empresa')
    } finally {
      setCreating(false)
    }
  }

  async function saveQuota() {
    if (!quotaModal) return
    const n = parseInt(quotaValue)
    if (!Number.isFinite(n) || n <= 0) {
      alert('Ingresa un cupo válido mayor a 0')
      return
    }
    const ok = await patchOrg(quotaModal.id, { maxUsers: n })
    if (ok) setQuotaModal(null)
  }

  async function assignAdmin() {
    if (!assignModal) return
    const username = assignUsername.trim()
    if (!username) {
      setAssignErr('Ingresa un nombre de usuario')
      return
    }
    setAssigning(true)
    setAssignErr(null)
    try {
      const res = await fetch(`/api/admin/organizations/${assignModal.id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, role: 'ORG_ADMIN' }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setAssignErr(data.error ?? 'No se pudo asignar el admin (¿usuario no encontrado?)')
        return
      }
      setAssignModal(null)
      setAssignUsername('')
      await fetchOrgs()
    } catch {
      setAssignErr('No se pudo asignar el admin')
    } finally {
      setAssigning(false)
    }
  }

  async function confirmDelete() {
    if (!deleteModal) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/organizations/${deleteModal.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        alert(data.error ?? 'No se pudo eliminar la empresa')
        return
      }
      setDeleteModal(null)
      await fetchOrgs()
    } catch {
      alert('No se pudo eliminar la empresa')
    } finally {
      setDeleting(false)
    }
  }

  return (
  <div className="dm-page font-ui">
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black uppercase tracking-tighter flex items-center gap-2">
            <Building2 size={18} className="text-[#B735B8]" /> Empresas
          </h1>
          <p className="text-xs text-[#111827]/30 mt-0.5">{orgs.length} organizaciones registradas</p>
        </div>
        <button
          onClick={() => { setCreateErr(null); setForm({ name: '', maxUsers: '10', adminUsername: '' }); setCreateOpen(true) }}
          className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-sm font-black text-white transition-all active:scale-95 shrink-0"
          style={{ background: 'linear-gradient(135deg, #FF2D95 0%, #B735B8 48%, #233B8F 100%)', boxShadow: '0 8px 18px rgba(183,53,184,0.28)' }}
        >
          <Plus size={15} /> Crear empresa
        </button>
      </div>

      {/* List */}
      <div className="bg-white/[0.025] border border-[#E4E9F0] rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="animate-spin text-[#B735B8]" size={22} />
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <p className="text-xs text-red-500">{error}</p>
            <button onClick={fetchOrgs} className="mt-3 text-[11px] font-bold text-[#B735B8] hover:underline">Reintentar</button>
          </div>
        ) : orgs.length === 0 ? (
          <div className="text-center py-16">
            <Building2 size={28} className="text-[#111827]/10 mx-auto mb-2" />
            <p className="text-xs text-[#111827]/25">Aún no hay empresas. Crea la primera.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E4E9F0]">
                  <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-[#111827]/30">Empresa</th>
                  <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-[#111827]/30">Miembros</th>
                  <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-[#111827]/30">Admin</th>
                  <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-[#111827]/30">Estado</th>
                  <th className="text-right px-4 py-3 text-[10px] font-black uppercase tracking-widest text-[#111827]/30">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E4E9F0]">
                {orgs.map(o => {
                  const full = o.memberCount >= o.maxUsers
                  return (
                  <tr key={o.id} className="hover:bg-white/[0.02]">
                    {/* Empresa */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        {o.logoUrl ? (
                          <img src={o.logoUrl} alt={o.name} className="w-7 h-7 rounded-lg object-cover border border-[#E4E9F0] shrink-0" />
                        ) : (
                          <div className="w-7 h-7 rounded-lg bg-[#B735B8]/15 border border-[#B735B8]/20 flex items-center justify-center text-[11px] font-black text-[#B735B8] shrink-0">
                            {o.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-bold truncate max-w-[160px]">{o.name}</p>
                          <p className="text-[10px] text-[#111827]/30 font-mono truncate max-w-[160px]">/{o.slug}</p>
                        </div>
                      </div>
                    </td>

                    {/* Miembros / cupo */}
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-[11px] font-black px-2 py-0.5 rounded-full border ${full ? 'text-amber-600 bg-amber-500/10 border-amber-500/25' : 'text-[#B735B8] bg-[#B735B8]/10 border-[#B735B8]/20'}`}>
                        <Users size={10} /> {o.memberCount} / {o.maxUsers}
                      </span>
                    </td>

                    {/* Admin */}
                    <td className="px-4 py-3">
                      {o.admin ? (
                        <div className="min-w-0">
                          <p className="text-xs font-bold truncate max-w-[140px]">{o.admin.fullName}</p>
                          <p className="text-[10px] text-[#111827]/30 truncate max-w-[140px]">@{o.admin.username}</p>
                        </div>
                      ) : (
                        <span className="text-[11px] text-[#111827]/30 italic">sin admin</span>
                      )}
                    </td>

                    {/* Estado (toggle) */}
                    <td className="px-4 py-3">
                      <button
                        onClick={() => patchOrg(o.id, { active: !o.active })}
                        disabled={updating === o.id}
                        title={o.active ? 'Desactivar empresa' : 'Activar empresa'}
                        className={`relative w-10 h-5 rounded-full transition-colors shrink-0 disabled:opacity-50 ${o.active ? 'bg-[#B735B8]' : 'bg-[#E4E9F0]'}`}
                      >
                        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${o.active ? 'left-[1.375rem]' : 'left-0.5'}`} />
                      </button>
                    </td>

                    {/* Acciones */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        {updating === o.id ? (
                          <Loader2 size={14} className="animate-spin text-[#111827]/40" />
                        ) : (
                          <>
                            <button
                              onClick={() => { setQuotaValue(String(o.maxUsers)); setQuotaModal(o) }}
                              title="Editar cupo de usuarios"
                              className="p-1.5 rounded-lg bg-[#B735B8]/8 border border-[#B735B8]/20 hover:bg-[#B735B8]/20 transition-colors"
                            >
                              <SlidersHorizontal size={13} className="text-[#B735B8]" />
                            </button>
                            <button
                              onClick={() => { setAssignErr(null); setAssignUsername(''); setAssignModal(o) }}
                              title="Asignar admin"
                              className="p-1.5 rounded-lg bg-cyan-500/8 border border-cyan-500/20 hover:bg-cyan-500/20 transition-colors"
                            >
                              <UserCog size={13} className="text-cyan-500" />
                            </button>
                            <button
                              onClick={() => setDeleteModal(o)}
                              title="Eliminar empresa"
                              className="p-1.5 rounded-lg bg-red-500/8 border border-red-500/20 hover:bg-red-500/20 transition-colors"
                            >
                              <Trash2 size={13} className="text-red-400" />
                            </button>
                          </>
                        )}
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

      {/* Create modal */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={() => !creating && setCreateOpen(false)} />
          <div className="relative bg-[#13131f] border border-[#B735B8]/20 rounded-2xl p-6 w-full max-w-sm z-10 shadow-2xl shadow-black/60">
            <div className="absolute top-0 left-0 right-0 h-px rounded-t-2xl"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(183,53,184,0.7), transparent)' }} />

            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#B735B8]/10 border border-[#B735B8]/20 flex items-center justify-center">
                  <Building2 size={15} className="text-[#B735B8]" />
                </div>
                <p className="text-sm font-black text-white">Crear empresa</p>
              </div>
              <button onClick={() => !creating && setCreateOpen(false)} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
                <X size={14} className="text-white/40" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-1.5 block">Nombre</label>
                <input
                  type="text"
                  autoFocus
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Acme Corp"
                  className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/25 outline-none focus:border-[#B735B8]/50"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-1.5 block">Cupo de usuarios</label>
                <input
                  type="number"
                  min={1}
                  value={form.maxUsers}
                  onChange={e => setForm(f => ({ ...f, maxUsers: e.target.value }))}
                  placeholder="10"
                  className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/25 outline-none focus:border-[#B735B8]/50"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-1.5 block">
                  Admin <span className="text-white/15 normal-case font-normal">(opcional · username)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-sm">@</span>
                  <input
                    type="text"
                    value={form.adminUsername}
                    onChange={e => setForm(f => ({ ...f, adminUsername: e.target.value }))}
                    placeholder="usuario_existente"
                    className="w-full bg-black/30 border border-white/10 rounded-xl pl-7 pr-3 py-2.5 text-sm text-white placeholder-white/25 outline-none focus:border-[#B735B8]/50"
                  />
                </div>
                <p className="text-[10px] text-white/20 mt-1">Si lo completas, se asignará como ORG_ADMIN de la empresa.</p>
              </div>

              {createErr && (
                <div className="flex items-start gap-2 bg-red-500/8 border border-red-500/15 rounded-xl px-3 py-2">
                  <AlertTriangle size={12} className="text-red-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-red-400/90">{createErr}</p>
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setCreateOpen(false)}
                  disabled={creating}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white/50 hover:bg-white/10 transition-colors disabled:opacity-40"
                >
                  Cancelar
                </button>
                <button
                  onClick={createOrg}
                  disabled={creating}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-black text-white transition-all active:scale-95 disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #FF2D95 0%, #B735B8 48%, #233B8F 100%)' }}
                >
                  {creating ? <Loader2 size={14} className="animate-spin" /> : <><Plus size={13} /> Crear</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit quota modal */}
      {quotaModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={() => updating !== quotaModal.id && setQuotaModal(null)} />
          <div className="relative bg-[#13131f] border border-[#B735B8]/20 rounded-2xl p-6 w-full max-w-xs z-10 shadow-2xl shadow-black/60">
            <div className="absolute top-0 left-0 right-0 h-px rounded-t-2xl"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(183,53,184,0.7), transparent)' }} />

            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-[#B735B8]/10 border border-[#B735B8]/20 flex items-center justify-center shrink-0">
                  <SlidersHorizontal size={15} className="text-[#B735B8]" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-black text-white truncate">Cupo de usuarios</p>
                  <p className="text-[10px] text-white/30 truncate">{quotaModal.name}</p>
                </div>
              </div>
              <button onClick={() => setQuotaModal(null)} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors shrink-0">
                <X size={14} className="text-white/40" />
              </button>
            </div>

            <p className="text-[10px] text-white/30 mb-2">Miembros actuales: <strong className="text-white/60">{quotaModal.memberCount}</strong></p>
            <input
              type="number"
              min={1}
              autoFocus
              value={quotaValue}
              onChange={e => setQuotaValue(e.target.value)}
              className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-[#B735B8]/50 mb-4 text-right font-bold"
            />

            <div className="flex gap-2">
              <button
                onClick={() => setQuotaModal(null)}
                disabled={updating === quotaModal.id}
                className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white/50 hover:bg-white/10 transition-colors disabled:opacity-40"
              >
                Cancelar
              </button>
              <button
                onClick={saveQuota}
                disabled={updating === quotaModal.id}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-black text-white transition-all active:scale-95 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #FF2D95 0%, #B735B8 48%, #233B8F 100%)' }}
              >
                {updating === quotaModal.id ? <Loader2 size={14} className="animate-spin" /> : <><Check size={13} /> Guardar</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign admin modal */}
      {assignModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={() => !assigning && setAssignModal(null)} />
          <div className="relative bg-[#13131f] border border-cyan-500/20 rounded-2xl p-6 w-full max-w-sm z-10 shadow-2xl shadow-black/60">
            <div className="absolute top-0 left-0 right-0 h-px rounded-t-2xl"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(34,211,238,0.7), transparent)' }} />

            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
                  <UserCog size={15} className="text-cyan-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-black text-white truncate">Asignar admin</p>
                  <p className="text-[10px] text-white/30 truncate">{assignModal.name}</p>
                </div>
              </div>
              <button onClick={() => !assigning && setAssignModal(null)} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors shrink-0">
                <X size={14} className="text-white/40" />
              </button>
            </div>

            <label className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-1.5 block">Usuario existente</label>
            <div className="relative mb-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-sm">@</span>
              <input
                type="text"
                autoFocus
                value={assignUsername}
                onChange={e => setAssignUsername(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') assignAdmin() }}
                placeholder="usuario"
                className="w-full bg-black/30 border border-white/10 rounded-xl pl-7 pr-3 py-2.5 text-sm text-white placeholder-white/25 outline-none focus:border-cyan-500/50"
              />
            </div>
            <p className="text-[10px] text-white/20 mb-4">Se asignará con el rol <strong className="text-white/45">ORG_ADMIN</strong>.</p>

            {assignErr && (
              <div className="flex items-start gap-2 bg-red-500/8 border border-red-500/15 rounded-xl px-3 py-2 mb-4">
                <AlertTriangle size={12} className="text-red-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-red-400/90">{assignErr}</p>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setAssignModal(null)}
                disabled={assigning}
                className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white/50 hover:bg-white/10 transition-colors disabled:opacity-40"
              >
                Cancelar
              </button>
              <button
                onClick={assignAdmin}
                disabled={assigning}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-cyan-600/80 border border-cyan-500/30 text-sm font-black text-white hover:bg-cyan-600 transition-colors disabled:opacity-50"
              >
                {assigning ? <Loader2 size={14} className="animate-spin" /> : <><UserCog size={13} /> Asignar</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={() => !deleting && setDeleteModal(null)} />
          <div className="relative bg-[#13131f] border border-red-500/20 rounded-2xl p-6 w-full max-w-sm z-10 shadow-2xl shadow-black/60">
            <div className="absolute top-0 left-0 right-0 h-px rounded-t-2xl"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(239,68,68,0.7), transparent)' }} />

            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/25 flex items-center justify-center mb-4">
                <AlertTriangle size={26} className="text-red-400" />
              </div>
              <h3 className="text-base font-black text-white mb-1">Eliminar empresa</h3>
              <p className="text-xs text-white/40 mb-1">Estás a punto de eliminar a</p>
              <p className="text-sm font-black text-white mb-0.5">{deleteModal.name}</p>
              <p className="text-xs text-white/30 mb-4 font-mono">/{deleteModal.slug}</p>

              <div className="w-full flex items-start gap-2 bg-red-500/8 border border-red-500/15 rounded-xl px-3 py-2.5 mb-5 text-left">
                <AlertTriangle size={12} className="text-red-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-red-400/80 leading-relaxed">
                  Esta acción es <strong>irreversible</strong>. Se desasignarán los {deleteModal.memberCount} miembro{deleteModal.memberCount === 1 ? '' : 's'} de esta empresa.
                </p>
              </div>

              <div className="flex gap-2 w-full">
                <button
                  onClick={() => setDeleteModal(null)}
                  disabled={deleting}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white/50 hover:bg-white/10 transition-colors disabled:opacity-40"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={deleting}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-600/80 border border-red-500/30 text-sm font-black text-white hover:bg-red-600 transition-colors disabled:opacity-50"
                >
                  {deleting ? <Loader2 size={14} className="animate-spin" /> : <><Trash2 size={13} /> Eliminar</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
  )
}
