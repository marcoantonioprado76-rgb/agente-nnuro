'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import {
  Settings, User, Camera, Pencil, Check, X, Loader2, Trash2, UserCircle,
  Mail, AtSign, Gem, Plus, History, BarChart3, Activity, Calendar, Info,
  KeyRound, ShieldCheck, Key, CheckCircle, XCircle, Eye, EyeOff,
} from 'lucide-react'

interface ProfileData {
  fullName: string
  username: string
  email: string
  avatarUrl: string | null
}

interface CreditsInfo {
  aiBalanceUsd: number
  spent30dUsd: number
  lastRecharge: { amountUsd: number; date: string } | null
  preferOwnKey: boolean
  followupsEnabled: boolean
  adminHasKey: boolean
  ownKey: { model: string; isValid: boolean; apiKeyMasked: string } | null
  purchases: Array<{ amountUsd: number; createdAt: string; paymentMethod: string; status: string }>
  movements: Array<{ reason: string; model: string; costUsd: number; createdAt: string }>
}

const CARD_BG = 'linear-gradient(180deg, #0B1B2B 0%, #081624 60%, #050B14 100%)'

export default function SettingsPage() {
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [credits, setCredits] = useState<CreditsInfo | null>(null)
  const [togglingPref, setTogglingPref] = useState(false)
  const [modal, setModal] = useState<null | 'history' | 'movements'>(null)

  // Edit nombre
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [savingName, setSavingName] = useState(false)

  // Upload avatar
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  // API Key propia (formulario)
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [model, setModel] = useState('gpt-4o')
  const [savingKey, setSavingKey] = useState(false)
  const [deletingKey, setDeletingKey] = useState(false)

  // Feedback global
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  function flashMsg(type: 'ok' | 'err', text: string) {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 3200)
  }

  async function loadCredits() {
    const [c, p] = await Promise.all([
      fetch('/api/credits').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/credits/purchase').then(r => r.ok ? r.json() : null).catch(() => null),
    ])
    if (!c) return
    const list: any[] = Array.isArray(p) ? p : (Array.isArray(p?.purchases) ? p.purchases : [])
    const lastApproved = list.find(x => x?.status === 'APPROVED') ?? null
    setCredits({
      aiBalanceUsd: Number(c.aiBalanceUsd ?? 0),
      spent30dUsd: Number(c.spent30dUsd ?? 0),
      lastRecharge: lastApproved
        ? { amountUsd: Number(lastApproved.amountUsd ?? 0), date: lastApproved.reviewedAt || lastApproved.createdAt }
        : null,
      preferOwnKey: !!c.preferOwnKey,
      followupsEnabled: c.followupsEnabled !== false,
      adminHasKey: !!c.adminHasKey,
      ownKey: c.ownKey ? { model: c.ownKey.model, isValid: !!c.ownKey.isValid, apiKeyMasked: c.ownKey.apiKeyMasked } : null,
      purchases: list.map((x: any) => ({ amountUsd: Number(x.amountUsd ?? 0), createdAt: x.createdAt, paymentMethod: x.paymentMethod, status: x.status })),
      movements: Array.isArray(c.recentUsage)
        ? c.recentUsage.map((u: any) => ({ reason: u.reason, model: u.model, costUsd: Number(u.costUsd ?? 0), createdAt: u.createdAt }))
        : [],
    })
    if (c.ownKey?.model) setModel(c.ownKey.model)
  }

  useEffect(() => {
    fetch('/api/profile')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.user) setProfile(d.user) })
      .catch(() => {})
      .finally(() => setLoadingProfile(false))
    loadCredits().catch(() => {})
  }, [])

  function startEditName() {
    if (!profile) return
    setNameInput(profile.fullName)
    setEditingName(true)
    setMsg(null)
  }
  function cancelEditName() {
    setEditingName(false)
    setMsg(null)
  }
  async function saveName() {
    if (!profile) return
    const trimmed = nameInput.trim()
    if (trimmed.length < 3) {
      flashMsg('err', 'El nombre debe tener al menos 3 caracteres')
      return
    }
    setSavingName(true)
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: trimmed }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) {
        flashMsg('err', d.error || 'Error al guardar')
      } else {
        setProfile(p => p ? { ...p, fullName: trimmed } : p)
        setEditingName(false)
        flashMsg('ok', 'Nombre actualizado ✓')
      }
    } catch {
      flashMsg('err', 'Error de red')
    } finally {
      setSavingName(false)
    }
  }

  async function uploadAvatar(file: File) {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      flashMsg('err', 'Subí una imagen (JPG, PNG, WEBP)')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      flashMsg('err', 'La imagen no puede pesar más de 5 MB')
      return
    }
    setUploadingAvatar(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const up = await fetch('/api/upload', { method: 'POST', body: fd })
      const upData = await up.json().catch(() => ({}))
      if (!up.ok || !upData.url) {
        flashMsg('err', upData.error || 'Error al subir la imagen')
        return
      }
      const save = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatarUrl: upData.url }),
      })
      const saveData = await save.json().catch(() => ({}))
      if (!save.ok) {
        flashMsg('err', saveData.error || 'No se pudo guardar el avatar')
        return
      }
      setProfile(p => p ? { ...p, avatarUrl: upData.url } : p)
      flashMsg('ok', 'Foto de perfil actualizada ✓')
    } catch {
      flashMsg('err', 'Error de red')
    } finally {
      setUploadingAvatar(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function removeAvatar() {
    if (!profile?.avatarUrl) return
    if (!confirm('¿Quitar tu foto de perfil?')) return
    setUploadingAvatar(true)
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatarUrl: null }),
      })
      if (res.ok) {
        setProfile(p => p ? { ...p, avatarUrl: null } : p)
        flashMsg('ok', 'Foto removida')
      } else {
        flashMsg('err', 'Error al quitar la foto')
      }
    } finally {
      setUploadingAvatar(false)
    }
  }

  // ── Configuración de IA ──
  /** Cambia la fuente de IA (admin key ↔ propia key). next = preferOwnKey deseado */
  async function setPreferOwnKey(next: boolean) {
    if (!credits || togglingPref || credits.preferOwnKey === next) return
    setTogglingPref(true)
    try {
      const res = await fetch('/api/credits', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferOwnKey: next }),
      })
      if (res.ok) await loadCredits()
      else flashMsg('err', 'No se pudo cambiar')
    } catch { flashMsg('err', 'Error de red') } finally { setTogglingPref(false) }
  }

  async function saveKey() {
    if (!apiKeyInput.trim() || savingKey) return
    setSavingKey(true)
    try {
      const res = await fetch('/api/credits', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: apiKeyInput.trim(), model }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) {
        flashMsg('err', d.error || 'Error al guardar la key')
      } else {
        flashMsg('ok', d.isValid ? '¡API Key guardada y validada! ✓' : 'Key guardada pero no se pudo validar. Verificá que sea correcta.')
        setApiKeyInput('')
        await loadCredits()
      }
    } catch {
      flashMsg('err', 'Error de red')
    } finally { setSavingKey(false) }
  }

  async function deleteKey() {
    if (!confirm('¿Eliminar tu API Key de OpenAI?')) return
    setDeletingKey(true)
    try {
      const res = await fetch('/api/credits', { method: 'DELETE' })
      if (res.ok) { flashMsg('ok', 'API Key eliminada'); await loadCredits() }
      else flashMsg('err', 'No se pudo eliminar')
    } catch { flashMsg('err', 'Error de red') } finally { setDeletingKey(false) }
  }

  const fmtDate = (d: string) => {
    try {
      return new Date(d).toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric' })
    } catch { return '—' }
  }

  // Derivados de la fuente de IA
  const hasOwnKey = !!credits?.ownKey
  const usingAdmin = !credits?.preferOwnKey
  const canUseAdminKey = !!credits?.adminHasKey

  return (
    <div className="dm-page font-ui">
    <div className="px-4 sm:px-6 lg:px-8 pt-8 max-w-4xl mx-auto pb-20 space-y-6">

      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #FF2D95 0%, #B735B8 48%, #233B8F 100%)', boxShadow: '0 4px 16px rgba(155,0,255,0.3)' }}>
          <Settings className="w-5 h-5 text-white animate-spin" style={{ animationDuration: '8s' }} />
        </div>
        <div>
          <h1 className="text-xl font-medium text-[#111827] uppercase tracking-widest">Configuración</h1>
          <p className="text-xs font-light tracking-widest mt-0.5" style={{ color: '#6B7280' }}>
            Personaliza tu experiencia en MY DIAMOND
          </p>
        </div>
      </div>

      <div className="h-px w-full" style={{ background: 'linear-gradient(90deg, #E4E9F0, #E4E9F0, transparent)' }} />

      {/* ── MI INFORMACIÓN ────────────────────────────────────────────── */}
      <div className="relative rounded-2xl p-5 sm:p-7 overflow-hidden"
        style={{ background: CARD_BG, border: '1px solid rgba(255,255,255,0.1)' }}>
        <div className="absolute top-0 left-0 right-0 h-px"
          style={{ background: 'linear-gradient(90deg, transparent, #D203DD60, #FF2DF740, transparent)' }} />

        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(210,3,221,0.14)', border: '1px solid rgba(210,3,221,0.3)' }}>
              <User className="w-3.5 h-3.5" style={{ color: '#D203DD' }} />
            </div>
            <h3 className="text-[10px] font-black uppercase tracking-[0.35em]" style={{ color: 'rgba(255,255,255,0.78)' }}>
              Mi Información
            </h3>
          </div>
          {profile && !editingName && (
            <button onClick={startEditName}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all active:scale-[0.97] hover:brightness-110"
              style={{ background: 'linear-gradient(135deg, #FF2D95 0%, #B735B8 48%, #233B8F 100%)', boxShadow: '0 4px 16px rgba(155,0,255,0.3)' }}>
              <User className="w-3.5 h-3.5" /> Editar perfil
            </button>
          )}
        </div>

        {loadingProfile ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'rgba(255,255,255,0.55)' }} />
          </div>
        ) : !profile ? (
          <p className="text-sm text-center py-4" style={{ color: 'rgba(255,255,255,0.55)' }}>No se pudieron cargar los datos</p>
        ) : (
          <>
            <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-center">

              {/* Avatar */}
              <div className="relative shrink-0">
                <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden flex items-center justify-center"
                  style={{ background: 'rgba(8,22,36,0.96)', border: '3px solid rgba(210,3,221,0.5)', boxShadow: '0 0 30px rgba(210,3,221,0.35), inset 0 0 20px rgba(0,0,0,0.5)' }}>
                  {profile.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={profile.avatarUrl} alt={profile.fullName} className="w-full h-full object-cover" />
                  ) : (
                    <UserCircle className="w-20 h-20" style={{ color: 'rgba(255,255,255,0.42)' }} />
                  )}
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="absolute bottom-0 right-0 w-11 h-11 rounded-full flex items-center justify-center transition-all disabled:opacity-50 active:scale-95"
                  style={{ background: 'linear-gradient(135deg, #FF2D95 0%, #B735B8 48%, #233B8F 100%)', border: '3px solid #fff', boxShadow: '0 0 14px rgba(210,3,221,0.5)' }}
                  title="Cambiar foto de perfil">
                  {uploadingAvatar
                    ? <Loader2 className="w-4 h-4 text-white animate-spin" />
                    : <Camera className="w-4 h-4 text-white" />}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/heic"
                  className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) uploadAvatar(f) }}
                  disabled={uploadingAvatar}
                />
              </div>

              {/* Datos */}
              <div className="flex-1 min-w-0 w-full text-center sm:text-left">
                <p className="text-[9px] font-black uppercase tracking-[0.3em] mb-2" style={{ color: 'rgba(255,255,255,0.55)' }}>
                  Nombre completo
                </p>

                {editingName ? (
                  <div className="space-y-2.5">
                    <input
                      type="text"
                      value={nameInput}
                      onChange={e => setNameInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') cancelEditName() }}
                      autoFocus
                      disabled={savingName}
                      maxLength={80}
                      className="w-full text-2xl font-bold text-white px-3 py-2 rounded-lg outline-none transition-all"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(210,3,221,0.5)', boxShadow: '0 0 12px rgba(210,3,221,0.18)' }}
                    />
                    <div className="flex gap-2 justify-center sm:justify-start">
                      <button onClick={saveName} disabled={savingName}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest text-white transition-all disabled:opacity-50 hover:opacity-90"
                        style={{ background: 'linear-gradient(to right, #FF2D95, #B735B8, #233B8F)', border: '1px solid rgba(255,255,255,0.12)' }}>
                        {savingName ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Guardar
                      </button>
                      <button onClick={cancelEditName} disabled={savingName}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all disabled:opacity-50"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}>
                        <X size={12} /> Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center sm:justify-start gap-2.5 flex-wrap">
                    <p className="text-2xl sm:text-3xl font-bold text-white tracking-tight">{profile.fullName}</p>
                    <button onClick={startEditName}
                      className="flex items-center justify-center w-8 h-8 rounded-lg transition-all hover:bg-white/10"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                      title="Editar nombre">
                      <Pencil className="w-3.5 h-3.5" style={{ color: '#D203DD' }} />
                    </button>
                  </div>
                )}

                {!editingName && (
                  <div className="flex items-center justify-center sm:justify-start gap-x-5 gap-y-1.5 flex-wrap mt-3">
                    <span className="inline-flex items-center gap-1.5 text-sm" style={{ color: 'rgba(255,255,255,0.78)' }}>
                      <AtSign className="w-3.5 h-3.5" style={{ color: '#D203DD' }} />
                      {profile.username}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-sm" style={{ color: 'rgba(255,255,255,0.78)' }}>
                      <Mail className="w-3.5 h-3.5" style={{ color: '#D203DD' }} />
                      {profile.email}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {!editingName && (
              <>
                <div className="h-px w-full my-5" style={{ background: 'rgba(255,255,255,0.1)' }} />
                <div className="flex flex-wrap gap-3 justify-center sm:justify-start">
                  <button onClick={() => fileInputRef.current?.click()} disabled={uploadingAvatar}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-[0.97] disabled:opacity-50 hover:bg-white/[0.04]"
                    style={{ background: 'rgba(210,3,221,0.10)', border: '1px solid rgba(210,3,221,0.35)', color: '#E879F9' }}>
                    <Camera className="w-3.5 h-3.5" /> Cambiar foto
                  </button>
                  {profile.avatarUrl && (
                    <button onClick={removeAvatar} disabled={uploadingAvatar}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-[0.97] disabled:opacity-50 hover:bg-white/[0.04]"
                      style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}>
                      <Trash2 className="w-3.5 h-3.5" /> Quitar foto
                    </button>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* ── CRÉDITOS IA ─────────────────────────────────────────────── */}
      <div className="relative rounded-2xl p-5 sm:p-7 overflow-hidden"
        style={{ background: CARD_BG, border: '1px solid rgba(255,255,255,0.1)' }}>
        <div className="absolute top-0 left-0 right-0 h-px"
          style={{ background: 'linear-gradient(90deg, transparent, #D203DD60, #FF2DF740, transparent)' }} />

        {/* Cabecera */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'rgba(210,3,221,0.12)', border: '1px solid rgba(210,3,221,0.3)' }}>
            <Gem className="w-5 h-5" style={{ color: '#D203DD' }} />
          </div>
          <div>
            <p className="text-sm font-bold text-white">Créditos IA</p>
            <p className="text-[11px] font-light" style={{ color: 'rgba(255,255,255,0.55)' }}>
              Consulta tu saldo, recarga y configura cómo paga la IA
            </p>
          </div>
        </div>

        {/* Saldo + acciones */}
        <div className="rounded-2xl p-5 mb-4"
          style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
                style={{ background: 'linear-gradient(135deg, rgba(210,3,221,0.2), rgba(155,0,255,0.15))', border: '1px solid rgba(210,3,221,0.35)' }}>
                <Gem className="w-7 h-7" style={{ color: '#E879F9' }} />
              </div>
              <div>
                <p className="text-3xl sm:text-4xl font-black text-white leading-none">
                  {credits ? `$${credits.aiBalanceUsd.toFixed(2)}` : <span style={{ color: 'rgba(255,255,255,0.55)' }}>—</span>}
                </p>
                <p className="text-[10px] font-black uppercase tracking-[0.25em] mt-1.5" style={{ color: 'rgba(255,255,255,0.55)' }}>
                  Saldo disponible
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <Link href="/dashboard/wallet"
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-white transition-all active:scale-[0.97] hover:brightness-110"
                style={{ background: 'linear-gradient(135deg, #FF2D95 0%, #B735B8 48%, #233B8F 100%)', boxShadow: '0 4px 16px rgba(155,0,255,0.3)', textDecoration: 'none' }}>
                <Plus className="w-4 h-4" /> Recargar
              </Link>
              <button type="button" onClick={() => setModal('history')}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-[0.97] hover:bg-white/[0.08]"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.75)' }}>
                <History className="w-3.5 h-3.5" /> Ver historial
              </button>
              <button type="button" onClick={() => setModal('movements')}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-[0.97] hover:bg-white/[0.08]"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.75)' }}>
                <BarChart3 className="w-3.5 h-3.5" /> Movimientos
              </button>
            </div>
          </div>
        </div>

        {/* Fila inferior: última recarga · uso 30 días · info */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <Calendar className="w-4 h-4 shrink-0" style={{ color: 'rgba(255,255,255,0.55)' }} />
            <div className="min-w-0">
              <p className="text-[8px] font-black uppercase tracking-[0.2em]" style={{ color: 'rgba(255,255,255,0.55)' }}>Última recarga</p>
              <p className="text-xs font-bold text-white truncate">
                {credits?.lastRecharge
                  ? <>{fmtDate(credits.lastRecharge.date)} <span style={{ color: '#FF096C' }}>+${credits.lastRecharge.amountUsd.toFixed(0)}</span></>
                  : 'Sin recargas'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <Activity className="w-4 h-4 shrink-0" style={{ color: '#D203DD' }} />
            <div className="min-w-0">
              <p className="text-[8px] font-black uppercase tracking-[0.2em]" style={{ color: 'rgba(255,255,255,0.55)' }}>Uso últimos 30 días</p>
              <p className="text-xs font-bold text-white">
                {credits ? `$${credits.spent30dUsd.toFixed(2)}` : '—'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <Info className="w-4 h-4 shrink-0" style={{ color: 'rgba(255,255,255,0.55)' }} />
            <p className="text-[10px] leading-snug" style={{ color: 'rgba(255,255,255,0.55)' }}>
              Los créditos IA se usan para generar respuestas, contenido y análisis.
            </p>
          </div>
        </div>

        {/* ── CONFIGURACIÓN DE IA: fuente de pago ── */}
        <div className="mt-6 pt-5" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <p className="text-[10px] font-black uppercase tracking-[0.25em] mb-1" style={{ color: 'rgba(255,255,255,0.55)' }}>
            ¿Cómo querés pagar la IA?
          </p>
          <p className="text-[11px] mb-3 leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
            Elegí la fuente. La opción activa se usa en todos tus servicios (Bots, Ads, Broadcast).
          </p>

          <div className="space-y-2.5">
            {/* Key del Administrador — paga con saldo */}
            <button
              onClick={() => setPreferOwnKey(false)}
              disabled={!canUseAdminKey || togglingPref}
              className="w-full flex items-center gap-3.5 p-4 rounded-xl transition-all text-left"
              style={{
                background: usingAdmin && canUseAdminKey ? 'rgba(183,53,184,0.18)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${usingAdmin && canUseAdminKey ? 'rgba(183,53,184,0.50)' : 'rgba(255,255,255,0.10)'}`,
                opacity: !canUseAdminKey ? 0.5 : 1,
                cursor: !canUseAdminKey ? 'not-allowed' : 'pointer',
                boxShadow: usingAdmin && canUseAdminKey ? '0 0 18px -6px rgba(183,53,184,0.45)' : 'none',
              }}>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: 'rgba(183,53,184,0.18)', border: '1px solid rgba(183,53,184,0.35)' }}>
                <ShieldCheck className="w-4 h-4 text-[#B735B8]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-black text-white">Key del Administrador</p>
                  <span className="text-[8.5px] font-black uppercase tracking-[0.14em] px-1.5 py-0.5 rounded-full"
                    style={{ background: 'rgba(183,53,184,0.18)', border: '1px solid rgba(183,53,184,0.30)', color: '#D9A4FF' }}>
                    Pagás con saldo
                  </span>
                </div>
                <p className="text-[11px] mt-1 leading-relaxed" style={{ color: 'rgba(255,255,255,0.50)' }}>
                  {canUseAdminKey
                    ? <>Cada uso descuenta del saldo USD. <b className="text-white/75">Tenés ${(credits?.aiBalanceUsd ?? 0).toFixed(2)} disponibles</b>.</>
                    : 'El administrador aún no configuró una key global.'}
                </p>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center ${usingAdmin && canUseAdminKey ? 'border-[#B735B8] bg-[#B735B8]' : 'border-white/20'}`}>
                {usingAdmin && canUseAdminKey && <CheckCircle className="w-3 h-3 text-white" />}
              </div>
            </button>

            {/* Mi Propia API Key — OpenAI factura directo */}
            <button
              onClick={() => setPreferOwnKey(true)}
              disabled={!hasOwnKey || togglingPref}
              className="w-full flex items-center gap-3.5 p-4 rounded-xl transition-all text-left"
              style={{
                background: !usingAdmin && hasOwnKey ? 'rgba(255,9,108,0.15)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${!usingAdmin && hasOwnKey ? 'rgba(255,9,108,0.45)' : 'rgba(255,255,255,0.10)'}`,
                opacity: !hasOwnKey ? 0.5 : 1,
                cursor: !hasOwnKey ? 'not-allowed' : 'pointer',
                boxShadow: !usingAdmin && hasOwnKey ? '0 0 18px -6px rgba(255,9,108,0.45)' : 'none',
              }}>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: 'rgba(255,9,108,0.15)', border: '1px solid rgba(255,9,108,0.35)' }}>
                <Key className="w-4 h-4 text-[#FF096C]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-black text-white">Mi Propia API Key</p>
                  <span className="text-[8.5px] font-black uppercase tracking-[0.14em] px-1.5 py-0.5 rounded-full"
                    style={{ background: 'rgba(255,9,108,0.15)', border: '1px solid rgba(255,9,108,0.30)', color: '#FF096C' }}>
                    No usa saldo
                  </span>
                </div>
                <p className="text-[11px] mt-1 leading-relaxed" style={{ color: 'rgba(255,255,255,0.50)' }}>
                  {hasOwnKey
                    ? <>OpenAI te factura directo. <b className="text-white/75">{credits?.ownKey?.apiKeyMasked}</b> · {credits?.ownKey?.model}</>
                    : 'Configurá tu key de OpenAI abajo (cifrada AES-256). Los costos van a tu cuenta de OpenAI.'}
                </p>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center ${!usingAdmin && hasOwnKey ? 'border-[#FF096C] bg-[#FF096C]' : 'border-white/20'}`}>
                {!usingAdmin && hasOwnKey && <CheckCircle className="w-3 h-3 text-white" />}
              </div>
            </button>
          </div>
          {togglingPref && (
            <div className="flex items-center gap-2 mt-2.5 text-xs" style={{ color: 'rgba(255,255,255,0.55)' }}>
              <Loader2 className="w-3 h-3 animate-spin" /> Guardando preferencia...
            </div>
          )}
        </div>

        {/* Mi API Key de OpenAI — formulario */}
        <div className="mt-3 rounded-xl p-4 space-y-3.5"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-[#FF096C]" />
            <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.55)' }}>
              Mi API Key de OpenAI
            </p>
          </div>

          {/* Estado de la key actual */}
          {credits?.ownKey && (
            <div className="flex items-center gap-3 p-3 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{
                  background: credits.ownKey.isValid ? 'rgba(0,255,136,0.1)' : 'rgba(239,68,68,0.1)',
                  border: `1px solid ${credits.ownKey.isValid ? 'rgba(0,255,136,0.3)' : 'rgba(239,68,68,0.3)'}`,
                }}>
                {credits.ownKey.isValid
                  ? <CheckCircle className="w-4 h-4 text-green-400" />
                  : <XCircle className="w-4 h-4 text-red-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-mono text-white truncate">{credits.ownKey.apiKeyMasked}</p>
                <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.55)' }}>
                  {credits.ownKey.isValid ? `Válida · ${credits.ownKey.model}` : 'No válida — actualizá la key'}
                </p>
              </div>
              <button onClick={deleteKey} disabled={deletingKey}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors shrink-0"
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}
                title="Eliminar key">
                {deletingKey ? <Loader2 className="w-3.5 h-3.5 text-red-400 animate-spin" /> : <Trash2 className="w-3.5 h-3.5 text-red-400" />}
              </button>
            </div>
          )}

          {/* Form agregar/actualizar */}
          <div className="space-y-3">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest mb-1.5 block" style={{ color: 'rgba(255,255,255,0.55)' }}>
                {credits?.ownKey ? 'Actualizar API Key' : 'Agregar API Key de OpenAI'}
              </label>
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  placeholder="sk-proj-..."
                  value={apiKeyInput}
                  onChange={e => setApiKeyInput(e.target.value)}
                  className="w-full rounded-xl px-4 py-3 pr-11 text-sm font-mono text-white placeholder-white/35 outline-none transition-all"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                  onFocus={e => (e.currentTarget.style.borderColor = 'rgba(125,211,252,0.45)')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
                />
                <button type="button" onClick={() => setShowKey(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.55)' }}>
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest mb-1.5 block" style={{ color: 'rgba(255,255,255,0.55)' }}>Modelo</label>
              <select value={model} onChange={e => setModel(e.target.value)}
                className="w-full rounded-xl px-4 py-2.5 text-sm text-white outline-none"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <option value="gpt-4o">GPT-4o (Recomendado)</option>
                <option value="gpt-4o-mini">GPT-4o Mini (Económico)</option>
                <option value="gpt-4-turbo">GPT-4 Turbo</option>
                <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
              </select>
            </div>

            <button onClick={saveKey} disabled={savingKey || !apiKeyInput.trim()}
              className="w-full py-3 rounded-xl font-bold text-sm transition-all active:scale-[0.98] disabled:opacity-40 hover:opacity-90"
              style={{ background: 'linear-gradient(to right, #FF2D95, #B735B8, #233B8F)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff' }}>
              {savingKey
                ? <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Validando y guardando...</span>
                : (credits?.ownKey ? 'Actualizar API Key' : 'Guardar API Key')}
            </button>
          </div>

          {/* Nota */}
          <div className="flex items-start gap-2 p-3 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: 'rgba(255,255,255,0.55)' }} />
            <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
              Tu API Key se guarda cifrada con AES-256. Conseguila en{' '}
              <span className="text-[#FF096C]">platform.openai.com/api-keys</span>. Al usar tu propia key, los costos van directo a tu cuenta de OpenAI.
            </p>
          </div>
        </div>
      </div>

      {/* ── MODAL: Historial de recargas / Movimientos ── */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md" onClick={() => setModal(null)}>
          <div className="w-full max-w-md max-h-[85vh] overflow-y-auto rounded-3xl p-5 sm:p-6 space-y-4 relative"
            style={{ background: 'linear-gradient(180deg, #0B1B2B 0%, #081624 60%, #050B14 100%)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 30px 60px -22px rgba(0,0,0,0.82)' }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(210,3,221,0.15)', border: '1px solid rgba(210,3,221,0.35)' }}>
                  {modal === 'history' ? <History className="w-5 h-5" style={{ color: '#E879F9' }} /> : <BarChart3 className="w-5 h-5" style={{ color: '#E879F9' }} />}
                </div>
                <div>
                  <h2 className="text-base font-black text-white leading-tight">{modal === 'history' ? 'Historial de recargas' : 'Movimientos recientes'}</h2>
                  <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.55)' }}>{modal === 'history' ? 'Tus solicitudes de recarga de saldo' : 'Consumos y recargas de tu saldo IA'}</p>
                </div>
              </div>
              <button onClick={() => setModal(null)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors">
                <X className="w-4 h-4 text-white/55" />
              </button>
            </div>

            {modal === 'history' ? (
              (credits?.purchases?.length ?? 0) === 0
                ? <p className="text-center text-sm py-8" style={{ color: 'rgba(255,255,255,0.55)' }}>Sin solicitudes de recarga todavía.</p>
                : <div className="space-y-2">
                    {credits!.purchases.map((p, i) => {
                      const st = p.status === 'APPROVED' ? { c: '#34d399', bg: 'rgba(52,211,153,0.1)', b: 'rgba(52,211,153,0.25)', l: 'Aprobada' }
                        : p.status === 'REJECTED' ? { c: '#f87171', bg: 'rgba(248,113,113,0.1)', b: 'rgba(248,113,113,0.25)', l: 'Rechazada' }
                        : { c: '#fbbf24', bg: 'rgba(251,191,36,0.1)', b: 'rgba(251,191,36,0.25)', l: 'Pendiente' }
                      return (
                        <div key={i} className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl"
                          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-white">+${p.amountUsd.toFixed(2)} USD</p>
                            <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.55)' }}>
                              {new Date(p.createdAt).toLocaleDateString('es-BO')} · {p.paymentMethod === 'MANUAL' ? 'Transferencia' : p.paymentMethod}
                            </p>
                          </div>
                          <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full shrink-0"
                            style={{ color: st.c, background: st.bg, border: `1px solid ${st.b}` }}>{st.l}</span>
                        </div>
                      )
                    })}
                  </div>
            ) : (
              (credits?.movements?.length ?? 0) === 0
                ? <p className="text-center text-sm py-8" style={{ color: 'rgba(255,255,255,0.55)' }}>Sin movimientos todavía.</p>
                : <div className="space-y-1.5">
                    {credits!.movements.map((u, i) => {
                      const isRecharge = u.costUsd < 0
                      return (
                        <div key={i} className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl"
                          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-white truncate">{isRecharge ? 'Recarga aprobada' : u.reason}</p>
                            <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.55)' }}>
                              {u.model ? u.model + ' · ' : ''}{new Date(u.createdAt).toLocaleString('es-BO')}
                            </p>
                          </div>
                          <span className="text-xs font-black shrink-0" style={{ color: isRecharge ? '#34d399' : '#f87171' }}>
                            {isRecharge ? '+' : '−'}${Math.abs(u.costUsd).toFixed(4)}
                          </span>
                        </div>
                      )
                    })}
                  </div>
            )}

            <button onClick={() => setModal(null)}
              className="w-full py-2.5 rounded-xl text-xs font-bold transition-all active:scale-[0.98]"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}>
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Feedback global */}
      {msg && (
        <div className="py-2.5 px-4 rounded-xl text-xs font-medium text-center"
          style={{
            background: msg.type === 'ok' ? 'rgba(0,255,136,0.10)' : 'rgba(239,68,68,0.10)',
            border: `1px solid ${msg.type === 'ok' ? 'rgba(0,255,136,0.30)' : 'rgba(239,68,68,0.30)'}`,
            color: msg.type === 'ok' ? '#FF096C' : '#fca5a5',
          }}>
          {msg.text}
        </div>
      )}

      <p className="text-center text-[10px] font-light" style={{ color: '#9CA3AF' }}>
        MY DIAMOND © 2026 &bull; Build 20260217
      </p>
    </div>
    </div>
  )
}
