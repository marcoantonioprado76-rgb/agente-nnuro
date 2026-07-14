'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import {
  Play, Youtube, TrendingUp, DollarSign, Clock, CheckCircle2,
  XCircle, Link2, Unlink, AlertCircle, Loader2, Plus, Eye,
  RefreshCw, ChevronDown, ChevronUp, Images, X,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type Platform = 'YOUTUBE' | 'TIKTOK' | 'FACEBOOK'

interface ConnectedAccount {
  id: string
  platform: Platform
  displayName: string
  providerAccountId: string
  status: string
  expiresAt: string | null
}

interface Campaign {
  id: string
  title: string
  description: string | null
  platform: Platform
  cpmUSD: string
  holdHours: number
  minViews: number
  imageUrls: string[]
  endsAt: string | null
  _count: { submissions: number }
}

interface Submission {
  id: string
  campaignId: string
  platform: Platform
  videoId: string
  videoUrl: string
  videoTitle: string | null
  baseViews: number
  currentViews: number
  deltaViews: number
  earningsUSD: string
  status: 'HOLD' | 'APPROVED' | 'REJECTED'
  holdUntil: string
  createdAt: string
  campaign: { title: string; cpmUSD: string; platform: Platform }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PLATFORM_COLOR: Record<Platform, string> = {
  YOUTUBE: '#FF0000',
  TIKTOK: '#00F2EA',
  FACEBOOK: '#1877F2',
}

const PLATFORM_LABEL: Record<Platform, string> = {
  YOUTUBE: 'YouTube',
  TIKTOK: 'TikTok',
  FACEBOOK: 'Facebook',
}

const STATUS_CONFIG = {
  HOLD: { label: 'En espera', color: '#FF8800', Icon: Clock },
  APPROVED: { label: 'Aprobado', color: '#00FF88', Icon: CheckCircle2 },
  REJECTED: { label: 'Rechazado', color: '#FF3366', Icon: XCircle },
}

function TikTokIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.34 6.34 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.78a8.18 8.18 0 004.78 1.52V6.84a4.85 4.85 0 01-1.01-.15z" />
    </svg>
  )
}

function FacebookIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

function ClippingPageInner() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const [accounts, setAccounts] = useState<ConnectedAccount[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)

  // Submit form state
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null)
  const [videoUrl, setVideoUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [imageModal, setImageModal] = useState<string | null>(null)

  const showToast = (msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [accRes, camRes, subRes] = await Promise.all([
        fetch('/api/clipping/accounts'),
        fetch('/api/clipping/campaigns'),
        fetch('/api/clipping/submissions'),
      ])
      const [accData, camData, subData] = await Promise.all([
        accRes.json(), camRes.json(), subRes.json(),
      ])
      setAccounts(accData.accounts || [])
      setCampaigns(camData.campaigns || [])
      setSubmissions(subData.submissions || [])
    } catch {
      showToast('Error al cargar datos', 'err')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  // Handle OAuth redirect results
  useEffect(() => {
    const connected = searchParams.get('connected')
    const error = searchParams.get('error')
    if (connected) {
      showToast(`✓ Cuenta de ${PLATFORM_LABEL[connected.toUpperCase() as Platform] || connected} conectada`, 'ok')
      router.replace('/dashboard/services/clipping')
      fetchAll()
    } else if (error) {
      showToast('Error al conectar la cuenta. Intenta de nuevo.', 'err')
      router.replace('/dashboard/services/clipping')
    }
  }, [searchParams, router, fetchAll])

  const connectAccount = (platform: Platform) => {
    const routes: Record<Platform, string> = {
      YOUTUBE: '/api/clipping/oauth/youtube/connect',
      TIKTOK: '/api/clipping/oauth/tiktok/connect',
      FACEBOOK: '/api/clipping/oauth/facebook/connect',
    }
    window.location.href = routes[platform]
  }

  const disconnectAccount = async (platform: Platform) => {
    try {
      await fetch('/api/clipping/accounts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform }),
      })
      setAccounts(prev => prev.filter(a => a.platform !== platform))
      showToast(`Cuenta de ${PLATFORM_LABEL[platform]} desconectada`)
    } catch {
      showToast('Error al desconectar', 'err')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCampaign || !videoUrl.trim()) return
    setSubmitting(true)
    setSubmitError('')

    try {
      const res = await fetch('/api/clipping/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId: selectedCampaign.id, videoUrl: videoUrl.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setSubmitError(data.error || 'Error al enviar')
        return
      }
      showToast('¡Video enviado! Estará en espera durante el hold period.')
      setVideoUrl('')
      setSelectedCampaign(null)
      fetchAll()
    } catch {
      setSubmitError('Error de conexión')
    } finally {
      setSubmitting(false)
    }
  }

  // Stats
  const totalEarnings = submissions
    .filter(s => s.status === 'APPROVED')
    .reduce((acc, s) => acc + parseFloat(s.earningsUSD), 0)

  const pendingEarnings = submissions
    .filter(s => s.status === 'HOLD')
    .reduce((acc, s) => acc + parseFloat(s.earningsUSD), 0)

  const totalViews = submissions.reduce((acc, s) => acc + s.deltaViews, 0)

  const getAccount = (platform: Platform) => accounts.find(a => a.platform === platform)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#FF2D55' }} />
      </div>
    )
  }

  return (
    <div className="px-4 sm:px-6 pt-6 max-w-screen-xl mx-auto pb-20 space-y-8">

      {/* Toast */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 px-4 py-3 rounded-xl text-sm font-medium shadow-2xl transition-all"
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
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #FF2D95 0%, #B735B8 50%, #233B8F 100%)' }}>
            <Play className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-medium text-[#111827] uppercase tracking-widest">Clipping</h1>
            <p className="text-xs font-light tracking-widest mt-0.5" style={{ color: '#6B7280' }}>
              Gana dinero por vistas en YouTube, TikTok y Facebook
            </p>
          </div>
        </div>
        <button onClick={fetchAll} className="p-2 rounded-lg transition-colors hover:bg-[#F4F6FA]">
          <RefreshCw className="w-4 h-4" style={{ color: '#6B7280' }} />
        </button>
      </div>

      <div className="h-px w-full" style={{ background: 'linear-gradient(90deg, rgba(255,45,85,0.3), rgba(255,107,0,0.2), transparent)' }} />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Ganado', value: `$${totalEarnings.toFixed(2)}`, Icon: DollarSign, color: '#00FF88' },
          { label: 'Pendiente', value: `$${pendingEarnings.toFixed(2)}`, Icon: Clock, color: '#FF8800' },
          { label: 'Total vistas', value: totalViews.toLocaleString(), Icon: Eye, color: '#D203DD' },
        ].map(({ label, value, Icon, color }) => (
          <div key={label} className="rounded-xl p-4"
            style={{ background: 'linear-gradient(180deg, #0B1B2B 0%, #081624 60%, #050B14 100%)', border: '1px solid rgba(255,255,255,0.10)' }}>
            <Icon className="w-4 h-4 mb-2" style={{ color }} />
            <p className="text-lg font-semibold text-white">{value}</p>
            <p className="text-[11px] text-white/55">{label}</p>
          </div>
        ))}
      </div>

      {/* Connect Accounts */}
      <div className="rounded-2xl p-6 space-y-4"
        style={{ background: 'linear-gradient(180deg, #0B1B2B 0%, #081624 60%, #050B14 100%)', border: '1px solid rgba(255,255,255,0.10)' }}>
        <h2 className="text-sm font-semibold text-white uppercase tracking-widest">Cuentas conectadas</h2>

        {(['YOUTUBE', 'TIKTOK', 'FACEBOOK'] as Platform[]).map(platform => {
          const account = getAccount(platform)
          const color = PLATFORM_COLOR[platform]
          const isYoutube = platform === 'YOUTUBE'

          const PlatformIcon = () => {
            if (platform === 'YOUTUBE') return <Youtube className="w-4 h-4" />
            if (platform === 'TIKTOK') return <TikTokIcon size={16} />
            return <FacebookIcon size={16} />
          }

          return (
            <div key={platform} className="flex items-center justify-between p-4 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${color}30` }}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: `${color}22`, color }}>
                  <PlatformIcon />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{PLATFORM_LABEL[platform]}</p>
                  {isYoutube ? (
                    <p className="text-[11px]" style={{ color: '#00FF88' }}>
                      No requiere conexión — usa URL pública
                    </p>
                  ) : account ? (
                    <p className="text-[11px] text-white/55">
                      {account.displayName}
                    </p>
                  ) : (
                    <p className="text-[11px] text-white/40">
                      No conectado
                    </p>
                  )}
                </div>
              </div>

              {isYoutube ? (
                <span className="text-[10px] px-2.5 py-1 rounded-full font-medium"
                  style={{ background: 'rgba(0,255,136,0.08)', color: '#00FF88', border: '1px solid rgba(0,255,136,0.2)' }}>
                  ✓ Listo
                </span>
              ) : account ? (
                <button onClick={() => disconnectAccount(platform)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors text-white/55 hover:bg-white/5 hover:text-white/80"
                  style={{ border: '1px solid rgba(255,255,255,0.12)' }}>
                  <Unlink className="w-3 h-3" />
                  Desconectar
                </button>
              ) : (
                <button onClick={() => connectAccount(platform)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{ background: `${color}15`, border: `1px solid ${color}30`, color }}>
                  <Link2 className="w-3 h-3" />
                  Conectar
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Campaigns + Submit */}
      <div className="rounded-2xl p-6 space-y-4"
        style={{ background: 'linear-gradient(180deg, #0B1B2B 0%, #081624 60%, #050B14 100%)', border: '1px solid rgba(255,255,255,0.10)' }}>
        <h2 className="text-sm font-semibold text-white uppercase tracking-widest">Campañas activas</h2>

        {campaigns.length === 0 ? (
          <p className="text-sm py-6 text-center text-white/40">
            No hay campañas activas en este momento
          </p>
        ) : (
          <div className="space-y-3">
            {campaigns.map(c => {
              const color = PLATFORM_COLOR[c.platform]
              const isSelected = selectedCampaign?.id === c.id
              // YouTube uses server API key — no connected account needed
              const hasAccount = c.platform === 'YOUTUBE' ? true : !!getAccount(c.platform)

              return (
                <div key={c.id}>
                  <button
                    onClick={() => setSelectedCampaign(isSelected ? null : c)}
                    className="w-full text-left p-4 rounded-xl transition-all"
                    style={{
                      background: isSelected ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${isSelected ? `${color}45` : 'rgba(255,255,255,0.10)'}`,
                    }}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                          style={{ background: `${color}22`, color }}>
                          {c.platform === 'YOUTUBE'
                            ? <Youtube className="w-3.5 h-3.5" />
                            : c.platform === 'TIKTOK'
                            ? <TikTokIcon size={14} />
                            : <FacebookIcon size={14} />
                          }
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{c.title}</p>
                          <p className="text-[11px] mt-0.5 text-white/55">
                            ${Number(c.cpmUSD).toFixed(2)} por 1,000 vistas · Hold: {c.holdHours}h
                            {c.minViews > 0 && ` · Mín. ${c.minViews.toLocaleString()} vistas`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!hasAccount && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full"
                            style={{ background: 'rgba(255,136,0,0.1)', color: '#FF8800', border: '1px solid rgba(255,136,0,0.2)' }}>
                            Conectar {PLATFORM_LABEL[c.platform]}
                          </span>
                        )}
                        {isSelected
                          ? <ChevronUp className="w-4 h-4 text-white/55" />
                          : <ChevronDown className="w-4 h-4 text-white/55" />
                        }
                      </div>
                    </div>
                    {c.description && (
                      <p className="text-xs mt-2 ml-10 text-white/55">
                        {c.description}
                      </p>
                    )}
                  </button>

                  {/* Submit form for this campaign */}
                  {isSelected && (
                    <div className="mt-2 rounded-xl space-y-0 overflow-hidden"
                      style={{ border: '1px solid rgba(255,255,255,0.10)' }}>

                      {/* Campaign images */}
                      {c.imageUrls && c.imageUrls.length > 0 && (
                        <div className="p-4 space-y-2"
                          style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.10)' }}>
                          <div className="flex items-center gap-2 mb-2">
                            <Images className="w-3.5 h-3.5" style={{ color: '#C9A7FF' }} />
                            <p className="text-[11px] font-semibold uppercase tracking-widest text-white/55">
                              Material de la campaña
                            </p>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                            {c.imageUrls.map((url, idx) => (
                              <button key={idx} type="button" onClick={() => setImageModal(url)}
                                className="relative aspect-square rounded-lg overflow-hidden transition-transform hover:scale-[1.03] active:scale-[0.98] focus:outline-none"
                                style={{ border: '1px solid rgba(255,255,255,0.10)' }}>
                                <img src={url} alt={`img-${idx + 1}`} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center"
                                  style={{ background: 'rgba(0,0,0,0.45)' }}>
                                  <Eye className="w-4 h-4 text-white" />
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                    <form onSubmit={handleSubmit} className="p-4 space-y-3"
                      style={{ background: 'rgba(255,255,255,0.03)' }}>
                      {!hasAccount && (
                        <div className="flex items-center gap-2 text-xs p-3 rounded-lg"
                          style={{ background: 'rgba(255,136,0,0.08)', border: '1px solid rgba(255,136,0,0.2)', color: '#FF8800' }}>
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          Necesitás conectar tu cuenta de {PLATFORM_LABEL[c.platform]} primero
                        </div>
                      )}
                      <div>
                        <label className="text-xs font-medium block mb-1.5 text-white/55">
                          URL del video
                        </label>
                        <input
                          type="url"
                          value={videoUrl}
                          onChange={e => { setVideoUrl(e.target.value); setSubmitError('') }}
                          placeholder={
                            c.platform === 'YOUTUBE'
                              ? 'https://youtu.be/... o https://youtube.com/watch?v=...'
                              : c.platform === 'TIKTOK'
                              ? 'https://www.tiktok.com/@usuario/video/...'
                              : 'https://www.facebook.com/video/...'
                          }
                          className="w-full px-3 py-2.5 rounded-lg text-sm text-white outline-none transition-colors placeholder:text-white/35"
                          style={{
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.10)',
                          }}
                          onFocus={e => { e.target.style.borderColor = `${color}50` }}
                          onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.10)' }}
                        />
                      </div>
                      {submitError && (
                        <p className="text-xs" style={{ color: '#FF3366' }}>{submitError}</p>
                      )}
                      <button type="submit" disabled={submitting || !videoUrl.trim() || !hasAccount}
                        className="w-full py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{ background: `${color}20`, border: `1px solid ${color}40`, color }}>
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                        {submitting ? 'Enviando...' : 'Enviar video'}
                      </button>
                    </form>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* My Submissions */}
      {submissions.length > 0 && (
        <div className="rounded-2xl p-6 space-y-4"
          style={{ background: 'linear-gradient(180deg, #0B1B2B 0%, #081624 60%, #050B14 100%)', border: '1px solid rgba(255,255,255,0.10)' }}>
          <h2 className="text-sm font-semibold text-white uppercase tracking-widest">Mis videos enviados</h2>

          <div className="space-y-3">
            {submissions.map(sub => {
              const { label, color, Icon } = STATUS_CONFIG[sub.status]
              const platformColor = PLATFORM_COLOR[sub.platform]
              const holdDate = new Date(sub.holdUntil)
              const holdExpired = new Date() >= holdDate

              return (
                <div key={sub.id} className="p-4 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.10)' }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                          style={{ background: `${platformColor}22`, color: platformColor, border: `1px solid ${platformColor}35` }}>
                          {PLATFORM_LABEL[sub.platform]}
                        </span>
                        <span className="text-xs text-white/40 truncate">{sub.campaign.title}</span>
                      </div>
                      <a href={sub.videoUrl} target="_blank" rel="noopener noreferrer"
                        className="text-sm font-medium text-white/75 hover:text-white truncate block transition-colors">
                        {sub.videoTitle || sub.videoId}
                      </a>
                      <div className="flex items-center gap-4 mt-2">
                        <span className="text-xs flex items-center gap-1 text-white/55">
                          <Eye className="w-3 h-3" />
                          {sub.deltaViews.toLocaleString()} nuevas
                        </span>
                        <span className="text-xs flex items-center gap-1 text-white/55">
                          <TrendingUp className="w-3 h-3" />
                          {sub.currentViews.toLocaleString()} totales
                        </span>
                        {sub.status === 'HOLD' && !holdExpired && (
                          <span className="text-xs" style={{ color: '#FF8800' }}>
                            Hold hasta {holdDate.toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold" style={{ color: '#00FF88' }}>
                        ${parseFloat(sub.earningsUSD).toFixed(4)}
                      </p>
                      <div className="flex items-center gap-1 justify-end mt-1">
                        <Icon className="w-3 h-3" style={{ color }} />
                        <span className="text-[10px]" style={{ color }}>{label}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {submissions.length === 0 && campaigns.length > 0 && (
        <div className="text-center py-8">
          <Play className="w-8 h-8 mx-auto mb-3 opacity-20" style={{ color: '#FF2D55' }} />
          <p className="text-sm" style={{ color: '#9CA3AF' }}>
            Todavía no enviaste ningún video. ¡Elegí una campaña y empezá a ganar!
          </p>
        </div>
      )}

      {/* Image lightbox */}
      {imageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setImageModal(null)}>
          <button className="absolute top-4 right-4 p-2 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            onClick={() => setImageModal(null)}>
            <X className="w-5 h-5" />
          </button>
          <img
            src={imageModal}
            alt="Imagen de campaña"
            className="max-w-full max-h-[85vh] rounded-xl object-contain shadow-2xl"
            style={{ border: '1px solid rgba(255,255,255,0.10)' }}
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}

export default function ClippingPage() {
  return (
  <div className="dm-page font-ui">
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#FF2D55' }} />
      </div>
    }>
      <ClippingPageInner />
    </Suspense>
  </div>
  )
}
