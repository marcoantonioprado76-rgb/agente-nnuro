'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import {
  Search,
  Users,
  Crown,
  Shield,
  ShieldOff,
  UserCheck,
  UserX,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Trash2,
  AlertTriangle,
  Smartphone,
  X,
  Unlink,
  MapPin,
  Monitor,
  Globe,
  Clock,
  AlertOctagon,
  ExternalLink,
  RefreshCw,
  Eye,
  Bot,
  Store,
  Package,
  LayoutTemplate,
  Megaphone,
  LogIn,
  SlidersHorizontal,
  GraduationCap,
  CalendarPlus,
  SquarePen,
} from 'lucide-react'

interface UserRow {
  id: string
  username: string
  fullName: string
  email: string
  country: string
  plan: string
  isActive: boolean
  isAdmin: boolean
  extraBots: number
  extraStores: number
  extraProducts: number
  extraLandingPages: number
  extraAdsPerMonth: number
  accessExtras: boolean
  planExpiresAt: string | null
  createdAt: string
  locationChanged?: boolean
}

interface ServiceLimit {
  plan: number
  extra: number
  total: number
}

interface UserDetail {
  cuenta: {
    username: string
    fullName: string
    email: string
    country: string
    city: string
    plan: string
    planExpiresAt: string | null
    isActive: boolean
    createdAt: string
  }
  limites: {
    bots: ServiceLimit
    stores: ServiceLimit
    products: ServiceLimit
    landingPages: ServiceLimit
    adsPerMonth: ServiceLimit
  }
  uso: {
    bots: number
    stores: number
    products: number
    landings: number
  }
  saldoIa: number
}

interface EditForm {
  fullName: string
  email: string
  username: string
  phone: string
  identityDocument: string
  city: string
  country: string
  dateOfBirth: string
}

const EMPTY_EDIT_FORM: EditForm = {
  fullName: '', email: '', username: '', phone: '',
  identityDocument: '', city: '', country: '', dateOfBirth: '',
}

const PLAN_BADGE: Record<string, string> = {
  NONE: 'text-[#111827]/30 bg-[#F4F6FA] border-[#E4E9F0]',
  BASIC: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/25',
  PRO: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/25',
  ELITE: 'text-teal-300 bg-teal-500/10 border-teal-500/25',
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [updating, setUpdating] = useState<string | null>(null)
  const [deleteModal, setDeleteModal] = useState<{ id: string; username: string; fullName: string } | null>(null)
  const [deleting, setDeleting] = useState(false)
  // Modal de servicios extra (agrupa los 5 controles +/- bajo un solo ícono)
  const [extrasModalId, setExtrasModalId] = useState<string | null>(null)
  // Modal para ampliar días de suscripción
  const [daysModalId, setDaysModalId] = useState<string | null>(null)
  const [customDays, setCustomDays] = useState('')
  const [devicesModal, setDevicesModal] = useState<{ id: string; username: string; fullName: string } | null>(null)
  const [devices, setDevices] = useState<{
    id: string; deviceId: string; label: string | null; lastSeen: string; createdAt: string
    ip: string | null; city: string | null; country: string | null
    lat: number | null; lng: number | null; address: string | null
    browser: string | null; os: string | null; deviceType: string | null
    prevIp: string | null; prevCity: string | null; locationChanged: boolean
  }[]>([])
  const [devicesLoading, setDevicesLoading] = useState(false)
  const [unlinking, setUnlinking] = useState<string | null>(null)
  const devicesRequestIdRef = useRef(0) // tracks latest request to avoid stale state
  const [infoModal, setInfoModal] = useState<{ id: string; username: string; fullName: string } | null>(null)
  const [detail, setDetail] = useState<UserDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [impersonating, setImpersonating] = useState(false)
  // Modal "Editar datos del usuario"
  const [editModal, setEditModal] = useState<{ id: string; username: string; fullName: string } | null>(null)
  const [editForm, setEditForm] = useState<EditForm>(EMPTY_EDIT_FORM)
  const [editLoading, setEditLoading] = useState(false)
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page) })
    if (search) params.set('q', search)
    const res = await fetch(`/api/admin/users?${params}`)
    if (!res.ok) {
      setLoading(false)
      return
    }
    const data = await res.json()
    setUsers(data.users ?? [])
    setTotalPages(data.pages ?? 1)
    setTotal(data.total ?? 0)
    setLoading(false)
  }, [page, search])

  useEffect(() => {
    const t = setTimeout(fetchUsers, 300)
    return () => clearTimeout(t)
  }, [fetchUsers])

  // Auto-refresh devices every 30s while modal is open (picks up GPS updates)
  useEffect(() => {
    if (!devicesModal) return
    const interval = setInterval(() => loadDevices(devicesModal.id), 30000)
    return () => clearInterval(interval)
  }, [devicesModal])

  async function updateUser(id: string, patch: Record<string, unknown>) {
    setUpdating(id)
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        alert(data.error ?? 'No se pudo actualizar. Intenta de nuevo.')
        return
      }
      await fetchUsers()
    } catch {
      alert('Error de conexión al actualizar.')
    } finally {
      setUpdating(null)
    }
  }

  async function confirmDelete() {
    if (!deleteModal) return
    setDeleting(true)
    const res = await fetch(`/api/admin/users/${deleteModal.id}`, { method: 'DELETE' })
    const data = await res.json()
    setDeleting(false)
    if (!res.ok) {
      alert(data.error ?? 'Error al eliminar el usuario')
      return
    }
    setDeleteModal(null)
    fetchUsers()
  }

  async function loadDevices(userId: string) {
    const requestId = ++devicesRequestIdRef.current
    const res = await fetch(`/api/admin/users/${userId}/devices`)
    // Ignore stale responses if a newer request was made
    if (requestId !== devicesRequestIdRef.current) return
    if (res.ok) {
      const data = await res.json()
      setDevices(data.devices ?? [])
    }
  }

  async function openDevicesModal(user: { id: string; username: string; fullName: string }) {
    setDevicesModal(user)
    setDevices([])
    setDevicesLoading(true)
    try {
      await loadDevices(user.id)
    } finally {
      setDevicesLoading(false)
    }
  }

  async function unlinkDevice(userId: string, deviceId: string) {
    setUnlinking(deviceId)
    const res = await fetch(`/api/admin/users/${userId}/devices`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId }),
    })
    if (res.ok) {
      setDevices(prev => prev.filter(d => d.deviceId !== deviceId))
      // Refresh user list to clear location badge
      fetchUsers()
    }
    setUnlinking(null)
  }

  async function openInfoModal(user: { id: string; username: string; fullName: string }) {
    setInfoModal(user)
    setDetail(null)
    setDetailLoading(true)
    try {
      const res = await fetch(`/api/admin/users/${user.id}/detail`)
      if (res.ok) {
        setDetail(await res.json())
      }
    } finally {
      setDetailLoading(false)
    }
  }

  async function impersonate(userId: string) {
    setImpersonating(true)
    try {
      const res = await fetch(`/api/admin/users/${userId}/impersonate`, { method: 'POST' })
      if (res.ok) {
        window.location.href = '/dashboard'
        return
      }
      const data = await res.json().catch(() => ({}))
      alert(data.error ?? 'No se pudo entrar como usuario')
    } catch {
      alert('No se pudo entrar como usuario')
    } finally {
      setImpersonating(false)
    }
  }

  async function openEditModal(user: { id: string; username: string; fullName: string }) {
    setEditModal(user)
    setEditForm(EMPTY_EDIT_FORM)
    setEditError(null)
    setEditLoading(true)
    try {
      const res = await fetch(`/api/admin/users/${user.id}`)
      if (res.ok) {
        const data = await res.json()
        const u = data.user ?? {}
        setEditForm({
          fullName: u.fullName ?? '',
          email: u.email ?? '',
          username: u.username ?? '',
          phone: u.phone ?? '',
          identityDocument: u.identityDocument ?? '',
          city: u.city ?? '',
          country: u.country ?? '',
          dateOfBirth: u.dateOfBirth ?? '',
        })
      } else {
        const data = await res.json().catch(() => ({}))
        setEditError(data.error ?? 'No se pudieron cargar los datos del usuario.')
      }
    } catch {
      setEditError('Error de conexión al cargar los datos.')
    } finally {
      setEditLoading(false)
    }
  }

  async function saveEdit() {
    if (!editModal) return
    setEditSaving(true)
    setEditError(null)
    try {
      const res = await fetch(`/api/admin/users/${editModal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        // 400 (validación) / 409 (dato duplicado) → mostrar el mensaje de la API
        setEditError(data.error ?? 'No se pudieron guardar los cambios.')
        return
      }
      setEditModal(null)
      await fetchUsers()
    } catch {
      setEditError('Error de conexión al guardar.')
    } finally {
      setEditSaving(false)
    }
  }

  return (
  <div className="dm-page font-ui">
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black uppercase tracking-tighter flex items-center gap-2">
            <Users size={18} className="text-cyan-400" /> Usuarios
          </h1>
          <p className="text-xs text-[#111827]/30 mt-0.5">{total} usuarios registrados</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#111827]/25" />
        <input
          type="text"
          placeholder="Buscar por nombre, usuario o email..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
          className="w-full bg-[#F4F6FA] border border-[#E4E9F0] rounded-xl pl-9 pr-4 py-2.5 text-sm text-[#111827] placeholder-white/25 outline-none focus:border-cyan-500/50"
        />
      </div>

      {/* Table */}
      <div className="bg-white/[0.025] border border-[#E4E9F0] rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="animate-spin text-cyan-400" size={22} />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-xs text-[#111827]/20">No se encontraron usuarios</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E4E9F0]">
                  <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-[#111827]/30">Usuario</th>
                  <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-[#111827]/30">Plan</th>
                  <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-[#111827]/30">Estado</th>
                  <th className="text-right px-4 py-3 text-[10px] font-black uppercase tracking-widest text-[#111827]/30">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-cyan-500/15 border border-cyan-500/20 flex items-center justify-center text-[11px] font-black text-cyan-400 shrink-0">
                          {u.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-xs font-bold truncate max-w-[120px]">{u.fullName}</p>
                            {u.isAdmin && <Crown size={10} className="text-yellow-400 shrink-0" />}
                            {u.locationChanged && (
                              <span className="flex items-center gap-0.5 text-[9px] font-black px-1.5 py-0.5 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-400 animate-pulse">
                                <AlertOctagon size={8} /> Ubicación
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-[#111827]/30 truncate max-w-[120px]">@{u.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${PLAN_BADGE[u.plan] ?? PLAN_BADGE.NONE}`}>
                        {u.plan}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col items-start gap-1">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${u.isActive ? 'text-green-400 bg-green-500/10 border-green-500/20' : 'text-red-400 bg-red-500/10 border-red-500/20'}`}>
                          {u.isActive ? 'Activo' : 'Inactivo'}
                        </span>
                        {(() => {
                          const exp = u.planExpiresAt ? new Date(u.planExpiresAt) : null
                          if (!exp) return <span className="text-[10px] text-[#9CA3AF]">Sin plan</span>
                          const d = Math.ceil((exp.getTime() - Date.now()) / 86400000)
                          const cls = d <= 0 ? 'text-red-500' : d <= 7 ? 'text-amber-500' : 'text-emerald-600'
                          return (
                            <span className={`text-[10px] font-black ${cls}`} title={`Vence: ${exp.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}`}>
                              {d <= 0 ? '⚠ Vencido' : `${d} día${d === 1 ? '' : 's'} rest.`}
                            </span>
                          )
                        })()}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        {updating === u.id ? (
                          <Loader2 size={14} className="animate-spin text-[#111827]/40" />
                        ) : (
                          <>
                            <button
                              onClick={() => updateUser(u.id, { isActive: !u.isActive })}
                              title={u.isActive ? 'Desactivar' : 'Activar'}
                              className="p-1.5 rounded-lg bg-[#F4F6FA] hover:bg-[#EEF2F7] transition-colors"
                            >
                              {u.isActive
                                ? <UserX size={13} className="text-red-400" />
                                : <UserCheck size={13} className="text-green-400" />
                              }
                            </button>
                            <button
                              onClick={() => updateUser(u.id, { isAdmin: !u.isAdmin })}
                              title={u.isAdmin ? 'Quitar admin' : 'Hacer admin'}
                              className="p-1.5 rounded-lg bg-[#F4F6FA] hover:bg-[#EEF2F7] transition-colors"
                            >
                              {u.isAdmin
                                ? <ShieldOff size={13} className="text-yellow-400" />
                                : <Shield size={13} className="text-[#111827]/30" />
                              }
                            </button>
                            <select
                              value={u.plan}
                              onChange={e => updateUser(u.id, { plan: e.target.value })}
                              className="text-[10px] bg-white border border-[#E4E9F0] rounded-lg px-1.5 py-1 text-[#111827] outline-none cursor-pointer hover:border-[#E4E9F0] [&>option]:bg-white [&>option]:text-[#111827]"
                            >
                              <option value="NONE">NONE</option>
                              <option value="BASIC">BASIC</option>
                              <option value="PRO">PRO</option>
                              <option value="ELITE">ELITE</option>
                            </select>
                            <button
                              onClick={() => setExtrasModalId(u.id)}
                              title="Servicios extra (manual)"
                              className="p-1.5 rounded-lg bg-[#147e95]/8 border border-[#147e95]/20 hover:bg-[#147e95]/20 transition-colors"
                            >
                              <SlidersHorizontal size={13} className="text-[#147e95]" />
                            </button>
                            <button
                              onClick={() => { setCustomDays(''); setDaysModalId(u.id) }}
                              title="Ampliar días de suscripción"
                              className="p-1.5 rounded-lg bg-emerald-500/8 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
                            >
                              <CalendarPlus size={13} className="text-emerald-600" />
                            </button>
                            <button
                              onClick={() => openInfoModal({ id: u.id, username: u.username, fullName: u.fullName })}
                              title="Ver información del usuario"
                              className="p-1.5 rounded-lg bg-[#147e95]/8 border border-[#147e95]/20 hover:bg-[#147e95]/20 transition-colors"
                            >
                              <Eye size={13} className="text-[#147e95]" />
                            </button>
                            <button
                              onClick={() => openEditModal({ id: u.id, username: u.username, fullName: u.fullName })}
                              title="Editar datos del usuario"
                              className="p-1.5 rounded-lg bg-blue-500/8 border border-blue-500/20 hover:bg-blue-500/20 transition-colors"
                            >
                              <SquarePen size={13} className="text-blue-500" />
                            </button>
                            <button
                              onClick={() => openDevicesModal({ id: u.id, username: u.username, fullName: u.fullName })}
                              title="Ver dispositivos"
                              className="p-1.5 rounded-lg bg-amber-500/8 border border-amber-500/20 hover:bg-amber-500/20 transition-colors"
                            >
                              <Smartphone size={13} className="text-amber-400" />
                            </button>
                            {!u.isAdmin && (
                              <button
                                onClick={() => setDeleteModal({ id: u.id, username: u.username, fullName: u.fullName })}
                                title="Eliminar usuario"
                                className="p-1.5 rounded-lg bg-red-500/8 border border-red-500/20 hover:bg-red-500/20 transition-colors"
                              >
                                <Trash2 size={13} className="text-red-400" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-2 rounded-lg bg-[#F4F6FA] border border-[#E4E9F0] disabled:opacity-30 hover:bg-[#EEF2F7] transition-colors"
          >
            <ChevronLeft size={14} />
          </button>
          <span className="text-xs text-[#111827]/40">
            Página {page} de {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="p-2 rounded-lg bg-[#F4F6FA] border border-[#E4E9F0] disabled:opacity-30 hover:bg-[#EEF2F7] transition-colors"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      )}

      {/* Devices modal */}
      {devicesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={() => setDevicesModal(null)} />
          <div className="relative bg-[#1a262f] border border-amber-500/20 rounded-2xl p-6 w-full max-w-sm z-10 shadow-2xl shadow-black/60">

            <div className="absolute top-0 left-0 right-0 h-px rounded-t-2xl"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(245,158,11,0.7), transparent)' }} />

            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                  <Smartphone size={15} className="text-amber-400" />
                </div>
                <div>
                  <p className="text-xs font-black text-[#111827]">{devicesModal.fullName}</p>
                  <p className="text-[10px] text-[#111827]/30">@{devicesModal.username}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="flex items-center gap-1 text-[9px] font-black px-1.5 py-0.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  En vivo
                </span>
                <button
                  onClick={() => loadDevices(devicesModal.id)}
                  title="Actualizar ahora"
                  className="p-1.5 rounded-lg hover:bg-[#EEF2F7] transition-colors"
                >
                  <RefreshCw size={13} className="text-[#111827]/30 hover:text-[#111827]/60" />
                </button>
                <button onClick={() => setDevicesModal(null)} className="p-1.5 rounded-lg hover:bg-[#EEF2F7] transition-colors">
                  <X size={14} className="text-[#111827]/40" />
                </button>
              </div>
            </div>

            <p className="text-[10px] font-black uppercase tracking-widest text-[#111827]/25 mb-3">Dispositivos de confianza</p>

            {devicesLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 size={18} className="animate-spin text-amber-400" />
              </div>
            ) : devices.length === 0 ? (
              <div className="text-center py-8">
                <Smartphone size={28} className="text-[#111827]/10 mx-auto mb-2" />
                <p className="text-xs text-[#111827]/25">Sin dispositivos registrados</p>
                <p className="text-[10px] text-[#111827]/15 mt-1">El usuario deberá verificar en su próximo inicio de sesión</p>
              </div>
            ) : (
              <div className="space-y-3">
                {devices.map(d => (
                  <div key={d.id} className="bg-white border border-[#E4E9F0] rounded-2xl overflow-hidden">

                    {/* Location changed banner */}
                    {d.locationChanged && (
                      <div className="flex items-center gap-2 px-3 py-2 bg-orange-500/10 border-b border-orange-500/20">
                        <AlertOctagon size={12} className="text-orange-400 shrink-0" />
                        <p className="text-[10px] font-bold text-orange-400">Cambio de ubicación detectado</p>
                        {d.prevCity && d.prevIp && (
                          <p className="text-[10px] text-orange-400/60 ml-auto">Antes: {d.prevCity} · {d.prevIp}</p>
                        )}
                      </div>
                    )}

                    <div className="p-3 space-y-2.5">
                      {/* Header row */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                            <Smartphone size={13} className="text-amber-400" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-[#111827]/80">{d.label ?? 'Dispositivo'}</p>
                            <p className="text-[10px] text-[#111827]/25 font-mono">{d.deviceId.slice(0, 14)}…</p>
                          </div>
                        </div>
                        <button
                          onClick={() => unlinkDevice(devicesModal.id, d.deviceId)}
                          disabled={unlinking === d.deviceId}
                          title="Desvincular"
                          className="p-1.5 rounded-lg bg-red-500/8 border border-red-500/20 hover:bg-red-500/20 transition-colors disabled:opacity-40"
                        >
                          {unlinking === d.deviceId
                            ? <Loader2 size={12} className="animate-spin text-red-400" />
                            : <Unlink size={12} className="text-red-400" />
                          }
                        </button>
                      </div>

                      {/* Info grid */}
                      <div className="grid grid-cols-2 gap-1.5">
                        {/* IP */}
                        <div className="flex items-start gap-1.5 bg-white/[0.025] rounded-lg px-2 py-1.5">
                          <Globe size={10} className="text-cyan-400 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-[9px] text-[#111827]/25 uppercase font-bold">IP</p>
                            <p className="text-[10px] text-cyan-300 font-mono">{d.ip ?? '—'}</p>
                          </div>
                        </div>

                        {/* Location */}
                        <div className="flex items-start gap-1.5 bg-white/[0.025] rounded-lg px-2 py-1.5">
                          <MapPin size={10} className="text-green-400 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-[9px] text-[#111827]/25 uppercase font-bold">Ubicación</p>
                            <p className="text-[10px] text-[#111827]/70">{d.city ?? '—'}{d.country ? `, ${d.country}` : ''}</p>
                          </div>
                        </div>

                        {/* Device */}
                        <div className="flex items-start gap-1.5 bg-white/[0.025] rounded-lg px-2 py-1.5">
                          <Monitor size={10} className="text-cyan-400 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-[9px] text-[#111827]/25 uppercase font-bold">Dispositivo</p>
                            <p className="text-[10px] text-[#111827]/70">{d.deviceType ?? '—'} · {d.os ?? '—'}</p>
                          </div>
                        </div>

                        {/* Browser */}
                        <div className="flex items-start gap-1.5 bg-white/[0.025] rounded-lg px-2 py-1.5">
                          <Smartphone size={10} className="text-blue-400 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-[9px] text-[#111827]/25 uppercase font-bold">Navegador</p>
                            <p className="text-[10px] text-[#111827]/70">{d.browser ?? '—'}</p>
                          </div>
                        </div>

                        {/* Last seen */}
                        <div className="col-span-2 flex items-start gap-1.5 bg-white/[0.025] rounded-lg px-2 py-1.5">
                          <Clock size={10} className="text-amber-400 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-[9px] text-[#111827]/25 uppercase font-bold">Último acceso</p>
                            <p className="text-[10px] text-[#111827]/70">
                              {new Date(d.lastSeen).toLocaleString('es', { dateStyle: 'medium', timeStyle: 'short' })}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* GPS address + Ver en mapa */}
                      {(d.address || (d.lat && d.lng)) && (
                        <div className="space-y-1.5">
                          {d.address && (
                            <div className="flex items-start gap-1.5 bg-green-500/5 border border-green-500/15 rounded-lg px-2 py-1.5">
                              <MapPin size={10} className="text-green-400 mt-0.5 shrink-0" />
                              <p className="text-[10px] text-green-400/80 leading-snug">{d.address}</p>
                            </div>
                          )}
                          {d.lat && d.lng && (
                            <a
                              href={`https://www.google.com/maps?q=${d.lat},${d.lng}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-center gap-1.5 w-full py-2 rounded-lg text-[10px] font-bold transition-all hover:opacity-90 active:scale-[0.98]"
                              style={{ background: 'linear-gradient(135deg, #166534, #14532d)', border: '1px solid rgba(74,222,128,0.2)', color: '#4ade80' }}
                            >
                              <MapPin size={11} />
                              Ver ubicación en Google Maps
                              <ExternalLink size={9} />
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <p className="text-[10px] text-[#111827]/20 text-center mt-4">
              Al desvincular, el usuario tendrá que verificar de nuevo su dispositivo
            </p>
          </div>
        </div>
      )}

      {/* Info modal (read-only) */}
      {infoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={() => setInfoModal(null)} />
          <div className="relative bg-[#1a262f] border border-[#147e95]/20 rounded-2xl p-6 w-full max-w-lg z-10 shadow-2xl shadow-black/60 max-h-[85vh] overflow-y-auto">

            <div className="absolute top-0 left-0 right-0 h-px rounded-t-2xl"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(0,229,208,0.7), transparent)' }} />

            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#147e95]/10 border border-[#147e95]/20 flex items-center justify-center">
                  <Eye size={15} className="text-[#147e95]" />
                </div>
                <div>
                  <p className="text-xs font-black text-[#111827]">{infoModal.fullName}</p>
                  <p className="text-[10px] text-[#111827]/30">@{infoModal.username}</p>
                </div>
              </div>
              <button onClick={() => setInfoModal(null)} className="p-1.5 rounded-lg hover:bg-[#EEF2F7] transition-colors">
                <X size={14} className="text-[#111827]/40" />
              </button>
            </div>

            {detailLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 size={20} className="animate-spin text-[#147e95]" />
              </div>
            ) : !detail ? (
              <div className="text-center py-10">
                <p className="text-xs text-[#111827]/25">No se pudo cargar la información</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Cuenta */}
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#111827]/25 mb-2">Cuenta</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      ['Usuario', `@${detail.cuenta.username}`],
                      ['Nombre', detail.cuenta.fullName],
                      ['Email', detail.cuenta.email],
                      ['País', detail.cuenta.country],
                      ['Ciudad', detail.cuenta.city],
                      ['Registro', new Date(detail.cuenta.createdAt).toLocaleDateString('es', { dateStyle: 'medium' })],
                    ].map(([k, val]) => (
                      <div key={k} className="bg-white/[0.025] rounded-lg px-2 py-1.5">
                        <p className="text-[9px] text-[#111827]/25 uppercase font-bold">{k}</p>
                        <p className="text-[11px] text-[#111827]/80 truncate" title={val}>{val}</p>
                      </div>
                    ))}
                    <div className="bg-white/[0.025] rounded-lg px-2 py-1.5">
                      <p className="text-[9px] text-[#111827]/25 uppercase font-bold">Estado</p>
                      <p className={`text-[11px] font-bold ${detail.cuenta.isActive ? 'text-green-400' : 'text-red-400'}`}>
                        {detail.cuenta.isActive ? 'Activo' : 'Inactivo'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Plan */}
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#111827]/25 mb-2">Plan</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    <div className="bg-white/[0.025] rounded-lg px-2 py-1.5">
                      <p className="text-[9px] text-[#111827]/25 uppercase font-bold">Plan</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border inline-block mt-0.5 ${PLAN_BADGE[detail.cuenta.plan] ?? PLAN_BADGE.NONE}`}>
                        {detail.cuenta.plan}
                      </span>
                    </div>
                    <div className="bg-white/[0.025] rounded-lg px-2 py-1.5">
                      <p className="text-[9px] text-[#111827]/25 uppercase font-bold">Vence</p>
                      <p className="text-[11px] text-[#111827]/80">
                        {detail.cuenta.planExpiresAt
                          ? new Date(detail.cuenta.planExpiresAt).toLocaleDateString('es', { dateStyle: 'medium' })
                          : '—'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Límites efectivos */}
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#111827]/25 mb-2">
                    Límites efectivos <span className="text-[#111827]/15 normal-case font-normal">(plan + extra = total)</span>
                  </p>
                  <div className="space-y-1.5">
                    {([
                      { label: 'Bots', icon: Bot, lim: detail.limites.bots },
                      { label: 'Tiendas', icon: Store, lim: detail.limites.stores },
                      { label: 'Productos', icon: Package, lim: detail.limites.products },
                      { label: 'Landings', icon: LayoutTemplate, lim: detail.limites.landingPages },
                      { label: 'Anuncios/mes', icon: Megaphone, lim: detail.limites.adsPerMonth },
                    ] as const).map(svc => {
                      const Icon = svc.icon
                      const fmt = (n: number) => (n === Infinity ? '∞' : String(n))
                      return (
                        <div key={svc.label} className="flex items-center gap-2 bg-white/[0.025] rounded-lg px-2.5 py-1.5">
                          <Icon size={12} className="text-[#147e95] shrink-0" />
                          <span className="text-[11px] text-[#111827]/70 flex-1">{svc.label}</span>
                          <span className="text-[11px] text-[#111827]/50 font-mono">
                            {fmt(svc.lim.plan)} + {fmt(svc.lim.extra)} =
                          </span>
                          <span className="text-[11px] font-black text-[#147e95] font-mono min-w-[1.5rem] text-right">
                            {fmt(svc.lim.total)}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Uso actual */}
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#111827]/25 mb-2">Uso actual</p>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      ['Bots', detail.uso.bots],
                      ['Tiendas', detail.uso.stores],
                      ['Productos', detail.uso.products],
                      ['Landings', detail.uso.landings],
                    ].map(([k, val]) => (
                      <div key={k as string} className="bg-white/[0.025] rounded-lg px-2 py-1.5 text-center">
                        <p className="text-base font-black text-[#111827]/80 leading-none">{val as number}</p>
                        <p className="text-[9px] text-[#111827]/25 uppercase font-bold mt-1">{k as string}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Saldo IA */}
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#111827]/25 mb-2">Saldo IA</p>
                  <div className="bg-[#147e95]/8 border border-[#147e95]/20 rounded-lg px-3 py-2">
                    <p className="text-sm font-black text-[#147e95]">
                      ${detail.saldoIa.toFixed(4)} <span className="text-[10px] text-[#147e95]/60 font-bold">USD</span>
                    </p>
                  </div>
                </div>

                {/* Entrar como usuario */}
                <button
                  onClick={() => impersonate(infoModal.id)}
                  disabled={impersonating}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#147e95]/15 border border-[#147e95]/30 text-sm font-black text-[#147e95] hover:bg-[#147e95]/25 transition-colors disabled:opacity-50"
                >
                  {impersonating
                    ? <Loader2 size={14} className="animate-spin" />
                    : <><LogIn size={14} /> Entrar como usuario</>
                  }
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={() => !deleting && setDeleteModal(null)} />
          <div className="relative bg-[#1a262f] border border-red-500/20 rounded-2xl p-6 w-full max-w-sm z-10 shadow-2xl shadow-black/60">

            {/* Top red line */}
            <div className="absolute top-0 left-0 right-0 h-px rounded-t-2xl"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(239,68,68,0.7), transparent)' }} />

            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/25 flex items-center justify-center mb-4">
                <AlertTriangle size={26} className="text-red-400" />
              </div>
              <h3 className="text-base font-black text-[#111827] mb-1">Eliminar usuario</h3>
              <p className="text-xs text-[#111827]/40 mb-1">
                Estás a punto de eliminar a
              </p>
              <p className="text-sm font-black text-[#111827] mb-0.5">{deleteModal.fullName}</p>
              <p className="text-xs text-[#111827]/30 mb-4">@{deleteModal.username}</p>

              <div className="w-full flex items-start gap-2 bg-red-500/8 border border-red-500/15 rounded-xl px-3 py-2.5 mb-5 text-left">
                <AlertTriangle size={12} className="text-red-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-red-400/80 leading-relaxed">
                  Esta acción es <strong>irreversible</strong>. Se eliminarán todos sus datos, bots, solicitudes y comisiones.
                </p>
              </div>

              <div className="flex gap-2 w-full">
                <button
                  onClick={() => setDeleteModal(null)}
                  disabled={deleting}
                  className="flex-1 py-2.5 rounded-xl bg-[#F4F6FA] border border-[#E4E9F0] text-sm text-[#111827]/50 hover:bg-[#EEF2F7] transition-colors disabled:opacity-40"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={deleting}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-600/80 border border-red-500/30 text-sm font-black text-[#111827] hover:bg-red-600 transition-colors disabled:opacity-50"
                >
                  {deleting
                    ? <Loader2 size={14} className="animate-spin" />
                    : <><Trash2 size={13} /> Eliminar</>
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de servicios extra (agrupa los 5 controles bajo un ícono) */}
      {extrasModalId && (() => {
        const eu = users.find(u => u.id === extrasModalId)
        if (!eu) return null
        const SERVICES = [
          { key: 'extraBots', label: 'Bots / Agentes', icon: Bot, value: eu.extraBots },
          { key: 'extraStores', label: 'Tiendas virtuales', icon: Store, value: eu.extraStores },
          { key: 'extraProducts', label: 'Productos', icon: Package, value: eu.extraProducts },
          { key: 'extraLandingPages', label: 'Landing pages', icon: LayoutTemplate, value: eu.extraLandingPages },
          { key: 'extraAdsPerMonth', label: 'Anuncios / mes', icon: Megaphone, value: eu.extraAdsPerMonth },
        ] as const
        return (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={() => setExtrasModalId(null)} />
            <div className="relative w-full max-w-sm rounded-2xl border border-[#E4E9F0] bg-white shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-[#E4E9F0]">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-[#147e95]/10 border border-[#147e95]/20 flex items-center justify-center shrink-0">
                    <SlidersHorizontal size={16} className="text-[#147e95]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-black text-[#111827] truncate">Servicios extra · {eu.fullName}</p>
                    <p className="text-[10px] text-[#111827]/40 truncate">@{eu.username} · se suman al límite del plan</p>
                  </div>
                </div>
                <button onClick={() => setExtrasModalId(null)} className="p-1.5 rounded-lg hover:bg-[#EEF2F7] transition-colors shrink-0">
                  <X size={15} className="text-[#111827]/50" />
                </button>
              </div>
              <div className="p-4 space-y-2">
                {/* Acceso manual a Academy / Recursos / Shop (lo que se oculta a usuarios de pago) */}
                <div className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-[#147e95]/8 border border-[#147e95]/20">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <GraduationCap size={15} className="text-[#147e95] shrink-0" />
                    <span className="text-xs font-bold text-[#374151]">Acceso a Academy / Recursos / Shop</span>
                  </div>
                  <button
                    onClick={() => updateUser(eu.id, { accessExtras: !eu.accessExtras })}
                    title={eu.accessExtras ? 'Quitar acceso' : 'Dar acceso'}
                    className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${eu.accessExtras ? 'bg-[#147e95]' : 'bg-[#E4E9F0]'}`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${eu.accessExtras ? 'left-[1.375rem]' : 'left-0.5'}`} />
                  </button>
                </div>
                <div className="h-px bg-[#E4E9F0] my-1" />
                {SERVICES.map(svc => {
                  const Icon = svc.icon
                  const v = svc.value ?? 0
                  return (
                    <div key={svc.key} className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-[#F8FAFC] border border-[#E4E9F0]">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon size={15} className="text-[#147e95] shrink-0" />
                        <span className="text-xs font-bold text-[#374151] truncate">{svc.label}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button onClick={() => updateUser(eu.id, { [svc.key]: Math.max(0, v - 1) })} className="w-7 h-7 rounded-lg bg-white border border-[#E4E9F0] hover:bg-[#EEF2F7] text-[#111827]/60 hover:text-[#111827] transition-colors flex items-center justify-center text-sm font-black">−</button>
                        <span className="text-sm font-black text-[#147e95] min-w-[2.5rem] text-center">+{v}</span>
                        <button onClick={() => updateUser(eu.id, { [svc.key]: v + 1 })} className="w-7 h-7 rounded-lg bg-white border border-[#E4E9F0] hover:bg-[#147e95]/15 text-[#111827]/60 hover:text-[#147e95] transition-colors flex items-center justify-center text-sm font-black">+</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )
      })()}

      {/* Modal para ampliar días de suscripción */}
      {daysModalId && (() => {
        const du = users.find(u => u.id === daysModalId)
        if (!du) return null
        const exp = du.planExpiresAt ? new Date(du.planExpiresAt) : null
        const expStr = exp ? exp.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Sin vencimiento'
        const addAndClose = async (n: number) => { await updateUser(du.id, { addDays: n }); setDaysModalId(null) }
        return (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={() => setDaysModalId(null)} />
            <div className="relative w-full max-w-sm rounded-2xl border border-[#E4E9F0] bg-white shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-[#E4E9F0]">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                    <CalendarPlus size={16} className="text-emerald-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-black text-[#111827] truncate">Ampliar suscripción · {du.fullName}</p>
                    <p className="text-[10px] text-[#111827]/40 truncate">Vence: {expStr}</p>
                  </div>
                </div>
                <button onClick={() => setDaysModalId(null)} className="p-1.5 rounded-lg hover:bg-[#EEF2F7] transition-colors shrink-0">
                  <X size={15} className="text-[#111827]/50" />
                </button>
              </div>
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  {[7, 30, 90].map(n => (
                    <button key={n} onClick={() => addAndClose(n)} disabled={updating === du.id}
                      className="py-2.5 rounded-xl bg-[#F8FAFC] border border-[#E4E9F0] hover:bg-emerald-500/10 hover:border-emerald-500/30 text-[#374151] hover:text-emerald-700 text-xs font-black transition-all disabled:opacity-50">
                      +{n} días
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <input type="number" min={1} max={3650} value={customDays} onChange={e => setCustomDays(e.target.value)}
                    placeholder="Días personalizados" className="flex-1 px-3 py-2.5 rounded-xl bg-[#F8FAFC] border border-[#E4E9F0] text-sm text-[#111827] outline-none focus:border-emerald-500/40" />
                  <button onClick={() => { const n = parseInt(customDays); if (n > 0) addAndClose(n) }} disabled={!parseInt(customDays) || updating === du.id}
                    className="px-4 py-2.5 rounded-xl text-xs font-black text-white transition-all active:scale-95 disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}>
                    Aplicar
                  </button>
                </div>
                <p className="text-[10px] text-[#9CA3AF] text-center">Se suma sobre la fecha de vencimiento actual.</p>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Modal: Editar datos del usuario */}
      {editModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={() => !editSaving && setEditModal(null)} />
          <div className="relative w-full max-w-lg rounded-2xl border border-[#E4E9F0] bg-white shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-[#E4E9F0] shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                  <SquarePen size={16} className="text-blue-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-black text-[#111827] truncate">Editar datos del usuario</p>
                  <p className="text-[10px] text-[#111827]/40 truncate">@{editModal.username} · {editModal.fullName}</p>
                </div>
              </div>
              <button onClick={() => !editSaving && setEditModal(null)} className="p-1.5 rounded-lg hover:bg-[#EEF2F7] transition-colors shrink-0">
                <X size={15} className="text-[#111827]/50" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 overflow-y-auto">
              {editLoading ? (
                <div className="flex justify-center py-10">
                  <Loader2 size={20} className="animate-spin text-blue-500" />
                </div>
              ) : (
                <>
                  {editError && (
                    <div className="flex items-start gap-2 bg-red-500/8 border border-red-500/20 rounded-xl px-3 py-2.5 mb-4">
                      <AlertTriangle size={13} className="text-red-500 shrink-0 mt-0.5" />
                      <p className="text-[11px] text-red-500 leading-relaxed">{editError}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {([
                      { key: 'fullName', label: 'Nombre completo', type: 'text' },
                      { key: 'email', label: 'Correo electrónico', type: 'email' },
                      { key: 'username', label: 'Usuario', type: 'text' },
                      { key: 'phone', label: 'Teléfono', type: 'tel' },
                      { key: 'identityDocument', label: 'Carnet / Documento', type: 'text' },
                      { key: 'city', label: 'Ciudad', type: 'text' },
                      { key: 'country', label: 'País', type: 'text' },
                      { key: 'dateOfBirth', label: 'Fecha de nacimiento', type: 'date' },
                    ] as const).map((field) => (
                      <div key={field.key} className={field.key === 'fullName' ? 'sm:col-span-2' : ''}>
                        <label className="block text-[10px] font-bold uppercase tracking-wide text-[#9CA3AF] mb-1">{field.label}</label>
                        <input
                          type={field.type}
                          value={editForm[field.key]}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
                          className="w-full px-3 py-2.5 rounded-xl bg-[#F8FAFC] border border-[#E4E9F0] text-sm text-[#111827] outline-none focus:border-blue-500/40 transition-colors"
                        />
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-2 px-5 py-4 border-t border-[#E4E9F0] shrink-0">
              <button
                onClick={() => setEditModal(null)}
                disabled={editSaving}
                className="flex-1 py-2.5 rounded-xl bg-[#F4F6FA] border border-[#E4E9F0] text-sm text-[#111827]/60 hover:bg-[#EEF2F7] transition-colors disabled:opacity-40"
              >
                Cancelar
              </button>
              <button
                onClick={saveEdit}
                disabled={editSaving || editLoading}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-black text-white transition-all active:scale-[0.98] disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)' }}
              >
                {editSaving ? <Loader2 size={14} className="animate-spin" /> : <><SquarePen size={13} /> Guardar cambios</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
  )
}
