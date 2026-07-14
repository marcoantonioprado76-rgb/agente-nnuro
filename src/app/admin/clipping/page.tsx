'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Play, Youtube, Plus, Pencil, Trash2, CheckCircle2, XCircle,
  Clock, RefreshCw, Loader2, Eye, DollarSign, X, Save,
  ChevronDown, TrendingUp, Users, Heart, MessageCircle, ExternalLink,
  ImagePlus, Trash,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type Platform = 'YOUTUBE' | 'TIKTOK' | 'FACEBOOK'
type SubmissionStatus = 'HOLD' | 'APPROVED' | 'REJECTED'

interface Campaign {
  id: string
  title: string
  description: string | null
  platform: Platform
  cpmUSD: string
  holdHours: number
  minViews: number
  isActive: boolean
  imageUrls: string[]
  endsAt: string | null
  createdAt: string
  _count: { submissions: number }
}

interface Submission {
  id: string
  platform: Platform
  videoId: string
  videoUrl: string
  videoTitle: string | null
  baseViews: number
  currentViews: number
  deltaViews: number
  likes: number
  comments: number
  earningsUSD: string
  status: SubmissionStatus
  holdUntil: string
  createdAt: string
  rejectionReason: string | null
  user: { username: string; fullName: string; email: string }
  campaign: { title: string; cpmUSD: string; platform: Platform }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<SubmissionStatus, { label: string; color: string; Icon: React.ElementType }> = {
  HOLD: { label: 'En espera', color: '#FF8800', Icon: Clock },
  APPROVED: { label: 'Aprobado', color: '#00FF88', Icon: CheckCircle2 },
  REJECTED: { label: 'Rechazado', color: '#FF3366', Icon: XCircle },
}

function TikTokIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.34 6.34 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.78a8.18 8.18 0 004.78 1.52V6.84a4.85 4.85 0 01-1.01-.15z" />
    </svg>
  )
}

function FacebookIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  )
}

const PLATFORM_COLOR: Record<Platform, string> = {
  YOUTUBE: '#FF0000',
  TIKTOK: '#00F2EA',
  FACEBOOK: '#1877F2',
}

function PlatformIcon({ platform, size = 16 }: { platform: Platform; size?: number }) {
  if (platform === 'YOUTUBE') return <Youtube size={size} />
  if (platform === 'TIKTOK') return <TikTokIcon size={size} />
  return <FacebookIcon size={size} />
}

const emptyForm = {
  title: '',
  description: '',
  platform: 'YOUTUBE' as Platform,
  cpmUSD: '',
  holdHours: '48',
  minViews: '0',
  endsAt: '',
  isActive: true,
  imageUrls: [] as string[],
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminClippingPage() {
  const [tab, setTab] = useState<'campaigns' | 'submissions'>('campaigns')
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)

  // Campaign form
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  // Submissions filter
  const [statusFilter, setStatusFilter] = useState<SubmissionStatus | 'ALL'>('ALL')
  const [rejectModal, setRejectModal] = useState<{ id: string } | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Sync
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<{ total: number; approved: number; errors: number } | null>(null)

  // Image upload
  const [uploadingImage, setUploadingImage] = useState(false)

  const showToast = (msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  const fetchCampaigns = useCallback(async () => {
    const res = await fetch('/api/admin/clipping/campaigns')
    const data = await res.json()
    setCampaigns(data.campaigns || [])
  }, [])

  const fetchSubmissions = useCallback(async () => {
    const params = statusFilter !== 'ALL' ? `?status=${statusFilter}` : ''
    const res = await fetch(`/api/admin/clipping/submissions${params}`)
    const data = await res.json()
    setSubmissions(data.submissions || [])
  }, [statusFilter])

  const fetchAll = useCallback(async () => {
    setLoading(true)
    await Promise.all([fetchCampaigns(), fetchSubmissions()])
    setLoading(false)
  }, [fetchCampaigns, fetchSubmissions])

  useEffect(() => { fetchAll() }, [fetchAll])
  useEffect(() => { fetchSubmissions() }, [fetchSubmissions])

  // Campaign form handlers
  const openCreate = () => {
    setForm(emptyForm)
    setEditingId(null)
    setShowForm(true)
  }

  const openEdit = (c: Campaign) => {
    setForm({
      title: c.title,
      description: c.description || '',
      platform: c.platform,
      cpmUSD: c.cpmUSD,
      holdHours: String(c.holdHours),
      minViews: String(c.minViews),
      endsAt: c.endsAt ? c.endsAt.slice(0, 16) : '',
      isActive: c.isActive,
      imageUrls: c.imageUrls || [],
    })
    setEditingId(c.id)
    setShowForm(true)
  }

  const saveCampaign = async () => {
    if (!form.title || !form.cpmUSD) {
      showToast('Título y CPM son requeridos', 'err')
      return
    }
    setSaving(true)
    try {
      const payload = {
        ...form,
        ...(editingId && { id: editingId }),
        endsAt: form.endsAt || null,
      }
      const res = await fetch('/api/admin/clipping/campaigns', {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const d = await res.json()
        showToast(d.error || 'Error al guardar', 'err')
        return
      }
      showToast(editingId ? 'Campaña actualizada' : 'Campaña creada')
      setShowForm(false)
      fetchCampaigns()
    } catch {
      showToast('Error de conexión', 'err')
    } finally {
      setSaving(false)
    }
  }

  const deleteCampaign = async (id: string) => {
    if (!confirm('¿Eliminar esta campaña? Los submissions existentes se mantendrán.')) return
    const res = await fetch('/api/admin/clipping/campaigns', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (res.ok) {
      showToast('Campaña eliminada')
      fetchCampaigns()
    } else {
      showToast('Error al eliminar', 'err')
    }
  }

  const toggleActive = async (c: Campaign) => {
    await fetch('/api/admin/clipping/campaigns', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: c.id, isActive: !c.isActive }),
    })
    fetchCampaigns()
  }

  const uploadImage = async (file: File) => {
    setUploadingImage(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok || !data.url) { showToast('Error al subir imagen', 'err'); return }
      setForm(f => ({ ...f, imageUrls: [...f.imageUrls, data.url] }))
    } catch {
      showToast('Error de conexión al subir imagen', 'err')
    } finally {
      setUploadingImage(false)
    }
  }

  const removeImage = (idx: number) => {
    setForm(f => ({ ...f, imageUrls: f.imageUrls.filter((_, i) => i !== idx) }))
  }

  // Submission actions
  const approveSubmission = async (id: string) => {
    setActionLoading(id)
    const res = await fetch('/api/admin/clipping/submissions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action: 'approve' }),
    })
    if (res.ok) {
      showToast('Submission aprobada y pago acreditado')
      fetchSubmissions()
    } else {
      showToast('Error al aprobar', 'err')
    }
    setActionLoading(null)
  }

  const rejectSubmission = async () => {
    if (!rejectModal) return
    setActionLoading(rejectModal.id)
    const res = await fetch('/api/admin/clipping/submissions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: rejectModal.id, action: 'reject', rejectionReason: rejectReason }),
    })
    if (res.ok) {
      showToast('Submission rechazada')
      setRejectModal(null)
      setRejectReason('')
      fetchSubmissions()
    } else {
      showToast('Error al rechazar', 'err')
    }
    setActionLoading(null)
  }

  const runSync = async () => {
    setSyncing(true)
    setSyncResult(null)
    try {
      const res = await fetch('/api/admin/clipping/sync', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setSyncResult({ total: data.total, approved: data.approved, errors: data.errors })
        showToast(`Sync completado: ${data.approved} aprobados, ${data.errors} errores`)
        fetchSubmissions()
      } else {
        showToast('Error en sync', 'err')
      }
    } catch {
      showToast('Error de conexión', 'err')
    } finally {
      setSyncing(false)
    }
  }

  const filteredSubmissions = submissions.filter(
    s => statusFilter === 'ALL' || s.status === statusFilter
  )

  // Stats
  const holdCount = submissions.filter(s => s.status === 'HOLD').length
  const approvedCount = submissions.filter(s => s.status === 'APPROVED').length
  const totalPaid = submissions
    .filter(s => s.status === 'APPROVED')
    .reduce((acc, s) => acc + parseFloat(s.earningsUSD), 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="animate-spin text-purple-400" size={24} />
      </div>
    )
  }

  return (
  <div className="dm-page font-ui">
    <div className="space-y-6">

      {/* Toast */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 px-4 py-3 rounded-xl text-sm font-medium shadow-2xl"
          style={{
            background: toast.type === 'ok' ? 'rgba(0,255,136,0.12)' : 'rgba(255,51,102,0.12)',
            border: `1px solid ${toast.type === 'ok' ? 'rgba(0,255,136,0.3)' : 'rgba(255,51,102,0.3)'}`,
            color: toast.type === 'ok' ? '#00FF88' : '#FF3366',
          }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tighter flex items-center gap-2">
            <Play size={20} className="text-pink-400" /> Clipping
          </h1>
          <p className="text-xs text-[#111827]/30 mt-0.5">Gestión de campañas y videos</p>
        </div>
        <button onClick={runSync} disabled={syncing}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
          style={{ background: 'rgba(210,3,221,0.08)', border: '1px solid rgba(210,3,221,0.2)', color: '#D203DD' }}>
          <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
          {syncing ? 'Sincronizando...' : 'Sync vistas'}
        </button>
      </div>

      {/* Sync result */}
      {syncResult && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total procesados', value: syncResult.total, color: '#D203DD' },
            { label: 'Aprobados', value: syncResult.approved, color: '#00FF88' },
            { label: 'Errores', value: syncResult.errors, color: '#FF3366' },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-xl p-3 text-center"
              style={{ background: `${color}08`, border: `1px solid ${color}18` }}>
              <p className="text-xl font-black" style={{ color }}>{value}</p>
              <p className="text-[10px] text-[#111827]/30 uppercase tracking-widest mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Campañas', value: campaigns.length, Icon: Play, color: '#FF2D55' },
          { label: 'En espera', value: holdCount, Icon: Clock, color: '#FF8800' },
          { label: 'Aprobados', value: approvedCount, Icon: CheckCircle2, color: '#00FF88' },
          { label: 'Total pagado', value: `$${totalPaid.toFixed(2)}`, Icon: DollarSign, color: '#FFD700' },
        ].map(({ label, value, Icon, color }) => (
          <div key={label} className="rounded-xl p-4"
            style={{ background: `${color}08`, border: `1px solid ${color}18` }}>
            <Icon size={14} style={{ color }} className="mb-2" />
            <p className="text-xl font-black" style={{ color }}>{value}</p>
            <p className="text-[10px] text-[#111827]/30 uppercase tracking-widest mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl w-fit"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
        {[
          { key: 'campaigns', label: 'Campañas' },
          { key: 'submissions', label: `Submissions (${submissions.length})` },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key as typeof tab)}
            className="px-4 py-2 rounded-lg text-xs font-semibold transition-all"
            style={tab === key
              ? { background: 'rgba(147,51,234,0.2)', color: '#a855f7', border: '1px solid rgba(147,51,234,0.3)' }
              : { color: '#6B7280' }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── Campaigns Tab ─────────────────────────────────────────────────────── */}
      {tab === 'campaigns' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
              style={{ background: 'rgba(147,51,234,0.15)', border: '1px solid rgba(147,51,234,0.3)', color: '#a855f7' }}>
              <Plus size={14} /> Nueva campaña
            </button>
          </div>

          {campaigns.length === 0 ? (
            <div className="text-center py-16 rounded-2xl"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid #F0F3F7' }}>
              <Play size={32} className="mx-auto mb-3 opacity-20 text-pink-400" />
              <p className="text-sm text-[#111827]/25">No hay campañas. Creá la primera.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {campaigns.map(c => {
                const color = PLATFORM_COLOR[c.platform]
                return (
                  <div key={c.id} className="flex items-center gap-4 p-4 rounded-xl"
                    style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: `${color}15`, color }}>
                      <PlatformIcon platform={c.platform} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-[#111827]">{c.title}</p>
                        <span className="text-[10px] px-2 py-0.5 rounded-full"
                          style={c.isActive
                            ? { background: 'rgba(0,255,136,0.1)', color: '#00FF88', border: '1px solid rgba(0,255,136,0.2)' }
                            : { background: 'rgba(255,255,255,0.04)', color: '#6B7280', border: '1px solid rgba(255,255,255,0.08)' }}>
                          {c.isActive ? 'Activa' : 'Pausada'}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#111827]/35 mt-0.5">
                        ${Number(c.cpmUSD).toFixed(4)} CPM · Hold {c.holdHours}h · {c.minViews.toLocaleString()} vistas mín
                        {c.endsAt && ` · Vence ${new Date(c.endsAt).toLocaleDateString()}`}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 text-xs text-[#111827]/40 shrink-0">
                      <Users size={12} />
                      {c._count.submissions}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => toggleActive(c)}
                        className="p-2 rounded-lg transition-colors hover:bg-white/8 text-[#111827]/40 hover:text-[#111827]/70"
                        title={c.isActive ? 'Pausar' : 'Activar'}>
                        {c.isActive
                          ? <XCircle size={14} />
                          : <CheckCircle2 size={14} className="text-green-400" />
                        }
                      </button>
                      <button onClick={() => openEdit(c)}
                        className="p-2 rounded-lg transition-colors hover:bg-white/8 text-[#111827]/40 hover:text-[#111827]/70">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => deleteCampaign(c.id)}
                        className="p-2 rounded-lg transition-colors hover:bg-red-500/10 text-[#9CA3AF] hover:text-red-500">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Submissions Tab ───────────────────────────────────────────────────── */}
      {tab === 'submissions' && (
        <div className="space-y-4">
          {/* Filter */}
          <div className="flex gap-2 flex-wrap">
            {(['ALL', 'HOLD', 'APPROVED', 'REJECTED'] as const).map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={statusFilter === s
                  ? { background: 'rgba(147,51,234,0.2)', color: '#a855f7', border: '1px solid rgba(147,51,234,0.3)' }
                  : { background: 'rgba(255,255,255,0.04)', color: '#6B7280', border: '1px solid rgba(255,255,255,0.06)' }}>
                {s === 'ALL' ? 'Todos' : STATUS_CONFIG[s].label}
              </button>
            ))}
          </div>

          {filteredSubmissions.length === 0 ? (
            <div className="text-center py-16 rounded-2xl"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid #F0F3F7' }}>
              <p className="text-sm text-[#111827]/25">No hay submissions en esta categoría</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredSubmissions.map(sub => {
                const { label, color, Icon } = STATUS_CONFIG[sub.status]
                const platformColor = PLATFORM_COLOR[sub.platform]
                const isLoading = actionLoading === sub.id

                return (
                  <div key={sub.id} className="p-4 rounded-xl space-y-3"
                    style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>

                    {/* Top row */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                            style={{ background: `${platformColor}15`, color: platformColor, border: `1px solid ${platformColor}25` }}>
                            {sub.platform}
                          </span>
                          <span className="text-xs font-semibold text-[#111827]/70">{sub.user.fullName}</span>
                          <span className="text-[10px] text-[#111827]/35">@{sub.user.username}</span>
                        </div>
                        <a href={sub.videoUrl} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-sm font-semibold hover:text-[#111827] truncate transition-colors group"
                          style={{ color: platformColor }}>
                          <ExternalLink size={12} className="shrink-0 opacity-60 group-hover:opacity-100" />
                          <span className="truncate">{sub.videoTitle || sub.videoId}</span>
                        </a>
                        <p className="text-[10px] text-[#111827]/30 mt-0.5">Campaña: {sub.campaign.title}</p>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="text-base font-black" style={{ color: '#00FF88' }}>
                          ${parseFloat(sub.earningsUSD).toFixed(4)}
                        </p>
                        <div className="flex items-center gap-1 justify-end mt-0.5">
                          <Icon size={11} style={{ color }} />
                          <span className="text-[10px]" style={{ color }}>{label}</span>
                        </div>
                      </div>
                    </div>

                    {/* Metrics row */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                      {[
                        { Icon: Eye, label: 'Base', value: sub.baseViews, color: '#6B7280' },
                        { Icon: TrendingUp, label: 'Actuales', value: sub.currentViews, color: '#6B7280' },
                        { Icon: Play, label: 'Nuevas', value: sub.deltaViews, color: '#D203DD' },
                        { Icon: Heart, label: 'Likes', value: sub.likes ?? 0, color: '#FF3388' },
                        { Icon: MessageCircle, label: 'Comentarios', value: sub.comments ?? 0, color: '#a855f7' },
                      ].map(({ Icon, label, value, color }) => (
                        <span key={label} className="flex items-center gap-1 text-[11px]" style={{ color }}>
                          <Icon size={11} />
                          <span className="font-semibold">{value.toLocaleString()}</span>
                          <span className="opacity-50">{label}</span>
                        </span>
                      ))}
                      <span className="flex items-center gap-1 text-[11px]" style={{ color: 'rgba(255,136,0,0.7)' }}>
                        <Clock size={11} />
                        <span className="opacity-70">Hold: {new Date(sub.holdUntil).toLocaleDateString()}</span>
                      </span>
                    </div>

                    {/* Actions for HOLD submissions */}
                    {sub.status === 'HOLD' && (
                      <div className="flex gap-2 pt-1">
                        <button onClick={() => approveSubmission(sub.id)} disabled={isLoading}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
                          style={{ background: 'rgba(0,255,136,0.1)', border: '1px solid rgba(0,255,136,0.25)', color: '#00FF88' }}>
                          {isLoading ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                          Aprobar y pagar
                        </button>
                        <button onClick={() => { setRejectModal({ id: sub.id }); setRejectReason('') }}
                          disabled={isLoading}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
                          style={{ background: 'rgba(255,51,102,0.08)', border: '1px solid rgba(255,51,102,0.2)', color: '#FF3366' }}>
                          <XCircle size={12} /> Rechazar
                        </button>
                      </div>
                    )}

                    {sub.status === 'REJECTED' && sub.rejectionReason && (
                      <p className="text-xs px-3 py-2 rounded-lg"
                        style={{ background: 'rgba(255,51,102,0.06)', color: 'rgba(255,51,102,0.7)', border: '1px solid rgba(255,51,102,0.15)' }}>
                        Motivo: {sub.rejectionReason}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Campaign Form Modal ───────────────────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto"
            style={{ background: '#0d0d15', border: '1px solid rgba(255,255,255,0.08)' }}>

            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black uppercase tracking-widest text-[#111827]/80">
                {editingId ? 'Editar campaña' : 'Nueva campaña'}
              </h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-white/8 text-[#111827]/40">
                <X size={15} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-[#111827]/40 uppercase tracking-widest block mb-1.5">
                  Título
                </label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Ej: Campaña Marzo YouTube"
                  className="w-full px-3 py-2.5 rounded-lg text-sm text-[#111827] outline-none"
                  style={{ background: '#F0F3F7', border: '1px solid #E4E9F0' }} />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#111827]/40 uppercase tracking-widest block mb-1.5">
                  Descripción (opcional)
                </label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Instrucciones para el usuario..."
                  rows={2}
                  className="w-full px-3 py-2.5 rounded-lg text-sm text-[#111827] outline-none resize-none"
                  style={{ background: '#F0F3F7', border: '1px solid #E4E9F0' }} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-[#111827]/40 uppercase tracking-widest block mb-1.5">
                    Plataforma
                  </label>
                  <select value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value as Platform }))}
                    className="w-full px-3 py-2.5 rounded-lg text-sm text-[#111827] outline-none"
                    style={{ background: '#F0F3F7', border: '1px solid #E4E9F0' }}>
                    <option value="YOUTUBE">YouTube</option>
                    <option value="TIKTOK">TikTok</option>
                    <option value="FACEBOOK">Facebook</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-[#111827]/40 uppercase tracking-widest block mb-1.5">
                    CPM (USD/1000 vistas)
                  </label>
                  <input type="number" step="0.01" min="0" value={form.cpmUSD}
                    onChange={e => setForm(f => ({ ...f, cpmUSD: e.target.value }))}
                    placeholder="1.50"
                    className="w-full px-3 py-2.5 rounded-lg text-sm text-[#111827] outline-none"
                    style={{ background: '#F0F3F7', border: '1px solid #E4E9F0' }} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-[#111827]/40 uppercase tracking-widest block mb-1.5">
                    Hold (horas)
                  </label>
                  <input type="number" min="1" value={form.holdHours}
                    onChange={e => setForm(f => ({ ...f, holdHours: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-lg text-sm text-[#111827] outline-none"
                    style={{ background: '#F0F3F7', border: '1px solid #E4E9F0' }} />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-[#111827]/40 uppercase tracking-widest block mb-1.5">
                    Vistas mínimas
                  </label>
                  <input type="number" min="0" value={form.minViews}
                    onChange={e => setForm(f => ({ ...f, minViews: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-lg text-sm text-[#111827] outline-none"
                    style={{ background: '#F0F3F7', border: '1px solid #E4E9F0' }} />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#111827]/40 uppercase tracking-widest block mb-1.5">
                  Fecha de vencimiento (opcional)
                </label>
                <input type="datetime-local" value={form.endsAt}
                  onChange={e => setForm(f => ({ ...f, endsAt: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-lg text-sm text-[#111827] outline-none"
                  style={{ background: '#F0F3F7', border: '1px solid #E4E9F0' }} />
              </div>

              {/* Images */}
              <div>
                <label className="text-[11px] font-semibold text-[#111827]/40 uppercase tracking-widest block mb-2">
                  Imágenes ({form.imageUrls.length})
                </label>

                {/* Thumbnails */}
                {form.imageUrls.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-2">
                    {form.imageUrls.map((url, idx) => (
                      <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden"
                        style={{ border: '1px solid #E4E9F0' }}>
                        <img src={url} alt={`img-${idx}`} className="w-full h-full object-cover" />
                        <button type="button" onClick={() => removeImage(idx)}
                          className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ background: 'rgba(255,51,102,0.6)' }}>
                          <Trash size={14} className="text-[#111827]" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Upload button */}
                <label className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${uploadingImage ? 'opacity-50 cursor-not-allowed' : 'hover:brightness-110'}`}
                  style={{ background: 'rgba(210,3,221,0.06)', border: '1px solid rgba(210,3,221,0.2)', color: '#D203DD' }}>
                  {uploadingImage
                    ? <Loader2 size={13} className="animate-spin" />
                    : <ImagePlus size={13} />
                  }
                  {uploadingImage ? 'Subiendo...' : 'Agregar imagen'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploadingImage}
                    onChange={e => {
                      const file = e.target.files?.[0]
                      if (file) { uploadImage(file); e.target.value = '' }
                    }}
                  />
                </label>
                <p className="text-[10px] text-[#111827]/25 mt-1">JPG, PNG, WEBP · Máx. 10 imágenes</p>
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <div onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}
                  className="w-9 h-5 rounded-full transition-colors relative"
                  style={{ background: form.isActive ? 'rgba(0,255,136,0.4)' : '#E4E9F0' }}>
                  <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
                    style={{ left: form.isActive ? '18px' : '2px' }} />
                </div>
                <span className="text-xs text-[#111827]/50">Campaña activa</span>
              </label>
            </div>

            <div className="flex gap-2 pt-2">
              <button onClick={() => setShowForm(false)}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-[#111827]/40"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                Cancelar
              </button>
              <button onClick={saveCampaign} disabled={saving}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ background: 'rgba(147,51,234,0.2)', border: '1px solid rgba(147,51,234,0.35)', color: '#a855f7' }}>
                {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Reject Modal ──────────────────────────────────────────────────────── */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl p-6 space-y-4"
            style={{ background: '#0d0d15', border: '1px solid rgba(255,51,102,0.2)' }}>
            <h2 className="text-sm font-black uppercase tracking-widest text-red-400">Rechazar submission</h2>
            <div>
              <label className="text-[11px] font-semibold text-[#111827]/40 uppercase tracking-widest block mb-1.5">
                Motivo (opcional)
              </label>
              <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                placeholder="Ej: Vistas artificiales detectadas..."
                rows={3}
                className="w-full px-3 py-2.5 rounded-lg text-sm text-[#111827] outline-none resize-none"
                style={{ background: '#F0F3F7', border: '1px solid #E4E9F0' }} />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setRejectModal(null)}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-[#111827]/40"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                Cancelar
              </button>
              <button onClick={rejectSubmission} disabled={!!actionLoading}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ background: 'rgba(255,51,102,0.1)', border: '1px solid rgba(255,51,102,0.25)', color: '#FF3366' }}>
                {actionLoading ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />}
                Confirmar rechazo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
  )
}
