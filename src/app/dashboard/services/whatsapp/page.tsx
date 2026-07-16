'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import AIKeySelector from '@/components/AIKeySelector'
import { DEFAULT_FOLLOWUP_PROMPT } from '@/lib/followupPrompt'
import { usePlanGuard } from '@/hooks/usePlanGuard'
import {
  ArrowLeft,
  Plus,
  Bot,
  Copy,
  Check,
  Eye,
  EyeOff,
  Trash2,
  Package,
  Settings,
  Zap,
  Bell,
  ToggleLeft,
  ToggleRight,
  AlertCircle,
  Loader2,
  CheckCircle2,
  MessageCircle,
  Key,
  FileText,
  ShoppingBag,
  Webhook,
  X,
  Edit2,
  Save,
  Smartphone,
  QrCode,
  Wifi,
  WifiOff,
  RefreshCw,
  MessageSquare,
  Share2,
  UserCheck,
  Volume2,
  Play,
  Pause,
} from 'lucide-react'
import { BOT_VOICES, DEFAULT_VOICE_ID } from '@/lib/voices'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Bot {
  id: string
  name: string
  type: 'YCLOUD' | 'BAILEYS' | 'META'
  status: 'ACTIVE' | 'PAUSED'
  webhookToken: string
  systemPromptTemplate: string | null
  maxCharsMensaje1: number | null
  maxCharsMensaje2: number | null
  maxCharsMensaje3: number | null
  baileysPhone: string | null
  followUp1Delay: number
  followUp2Delay: number
  followUpPrompt?: string | null
  aiModel: string
  voiceEnabled?: boolean
  voiceMode?: string
  voiceId?: string | null
  createdAt: string
  secret?: { whatsappInstanceNumber: string; reportPhone: string } | null
  _count?: { assignedProducts: number; conversations: number }
  salesCount?: number
}

interface Product {
  id: string
  userId?: string
  name: string
  category: string | null
  benefits: string | null
  usage: string | null
  warnings: string | null
  priceUnit: string | null
  pricePromo2: string | null
  priceSuper6: string | null
  currency: string
  welcomeMessage: string | null
  firstMessage: string | null
  hooks: string[]
  imageMainUrls: string[]
  imagePriceUnitUrl: string | null
  imagePricePromoUrl: string | null
  imagePriceSuperUrl: string | null
  // testimonialsVideoUrls may be string[] (legacy) or {url,label}[] (new)
  testimonialsVideoUrls: Array<string | { url: string; label: string }>
  followUpMediaUrl?: string | null
  followUpMediaType?: string | null
  followUpMedia?: Array<{ url: string; type: string; text?: string }>
  shippingInfo: string | null
  coverage: string | null
  tags: string[]
  active: boolean
  sharedByUsername?: string | null
  clonedFromId?: string | null
}

type Tab = 'webhook' | 'credentials' | 'prompt' | 'products' | 'qr' | 'followup' | 'chats'

// ─── Small reusable components ────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }}
      className="p-1.5 rounded-lg hover:bg-[#EEF2F7] transition-colors text-[#6B7280] hover:text-[#111827]"
      title="Copiar"
    >
      {copied ? <Check className="w-4 h-4 text-[#16A34A]" /> : <Copy className="w-4 h-4" />}
    </button>
  )
}

function Alert({ type, msg }: { type: 'error' | 'success'; msg: string }) {
  if (!msg) return null
  return (
    <div
      className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm fade-in ${type === 'error'
        ? 'bg-red-500/10 border border-red-500/20 text-red-400'
        : 'bg-[#16A34A]/10 border border-[#16A34A]/20 text-[#16A34A]'
        }`}
    >
      {type === 'error' ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
      {msg}
    </div>
  )
}

function Spinner({ color }: { color?: string }) {
  return <Loader2 className={`w-4 h-4 animate-spin ${color ?? 'text-[#16A34A]'}`} />
}

// ─── Create Bot Form ──────────────────────────────────────────────────────────

function CreateBotForm({ onCreated }: { onCreated: (bot: Bot, webhookUrl: string) => void }) {
  const [name, setName] = useState('')
  const [type, setType] = useState<'YCLOUD' | 'BAILEYS' | 'META'>('YCLOUD')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/bots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, type }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error creando bot')
      onCreated(data.bot, data.webhookUrl)
      setName('')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl p-4"
      style={{ background: 'linear-gradient(135deg, #FAF6FB 0%, #F2F0FA 45%, #E7E9F5 100%)', border: '1px solid #C9CFE0', boxShadow: '0 2px 6px rgba(17,24,39,0.05), 0 20px 40px -14px rgba(17,24,39,0.28), 0 44px 82px -34px rgba(17,24,39,0.46), 0 0 52px -16px rgba(183,53,184,0.12), inset 0 1px 0 rgba(255,255,255,0.95)' }}>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#1fb8bb,#147e95,#12303a)', boxShadow: '0 6px 14px -6px rgba(183,53,184,0.5)' }}>
          <Plus className="w-3.5 h-3.5" style={{ color: '#fff' }} />
        </div>
        <h3 className="text-sm font-bold text-[#111827]" style={{ letterSpacing: '-0.01em' }}>Crear nuevo agente</h3>
      </div>

      {/* Tipo de bot — selector compacto */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        {([
          { t: 'YCLOUD', icon: Webhook, label: 'YCloud', sub: 'WhatsApp API', c: '#7DD3FC' },
          { t: 'BAILEYS', icon: Smartphone, label: 'WA Web', sub: 'Escanear QR', c: '#C9A7FF' },
          { t: 'META', icon: MessageSquare, label: 'Messenger', sub: 'FB / IG', c: '#FF6FA8' },
        ] as const).map(o => {
          const sel = type === o.t
          return (
            <button key={o.t} type="button" onClick={() => setType(o.t)}
              className="rounded-xl px-2.5 py-2 flex items-center gap-2 transition-all duration-200"
              style={{
                background: sel ? 'linear-gradient(135deg, #1fb8bb 0%, #147e95 52%, #12303a 100%)' : 'rgba(17,24,39,0.04)',
                border: `1px solid ${sel ? 'transparent' : 'rgba(17,24,39,0.10)'}`,
                boxShadow: sel ? '0 8px 18px -8px rgba(183,53,184,0.5)' : 'none',
              }}>
              <o.icon className="w-4 h-4 shrink-0" style={{ color: sel ? '#fff' : '#6B7280' }} />
              <div className="min-w-0 text-left">
                <div className="text-[11px] font-bold leading-tight" style={{ color: sel ? '#fff' : '#374151' }}>{o.label}</div>
                <div className="text-[9px] truncate" style={{ color: sel ? 'rgba(255,255,255,0.85)' : '#9AA3AF' }}>{o.sub}</div>
              </div>
            </button>
          )
        })}
      </div>

      {error && <Alert type="error" msg={error} />}
      <div className="flex flex-col sm:flex-row gap-2 mt-3">
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Nombre del agente (ej: Agente Ventas Bolivia)"
          className="flex-1 rounded-xl px-4 py-2.5 text-sm text-[#111827] placeholder-[#9AA3AF] focus:outline-none transition-colors"
          style={{ background: 'rgba(17,24,39,0.04)', border: '1px solid rgba(17,24,39,0.10)' }}
          required
        />
        <button
          type="submit"
          disabled={loading || !name.trim()}
          className="w-full sm:w-auto px-5 py-2.5 font-bold rounded-xl text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98]"
          style={{
            background: 'linear-gradient(135deg, #1fb8bb 0%, #147e95 52%, #12303a 100%)',
            color: '#fff',
            boxShadow: '0 12px 28px -10px rgba(0,229,208,0.5), inset 0 1px 0 rgba(255,255,255,0.28)',
          }}
        >
          {loading ? <Spinner /> : <Plus className="w-4 h-4" />}
          Crear
        </button>
      </div>
    </form>
  )
}

// ─── Global Analytics Chart ───────────────────────────────────────────────────

type ChartDay = { date: string; conversations: number; sales: number }

const CHART_MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
function fmtChartDate(iso: string) {
  const d = new Date(iso + 'T00:00:00')
  return `${d.getDate()} ${CHART_MONTHS[d.getMonth()]}`
}

function smoothCurvePath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return ''
  const t = 0.25
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[Math.min(pts.length - 1, i + 2)]
    const cp1x = p1.x + (p2.x - p0.x) * t
    const cp1y = p1.y + (p2.y - p0.y) * t
    const cp2x = p2.x - (p3.x - p1.x) * t
    const cp2y = p2.y - (p3.y - p1.y) * t
    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)} ${cp2x.toFixed(1)} ${cp2y.toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`
  }
  return d
}

type RecentSale = { userName: string | null; userPhone: string; soldAt: string | null; reporte: string }

function GlobalBotChart({ bots }: { bots: Bot[] }) {
  const [days, setDays] = useState<ChartDay[]>([])
  const [loadingChart, setLoadingChart] = useState(false)
  const [selectedBotId, setSelectedBotId] = useState<string>('')
  const [recentSales, setRecentSales] = useState<RecentSale[]>([])
  const [showSalesModal, setShowSalesModal] = useState(false)
  const [salesSeen, setSalesSeen] = useState(false)
  const [deletingHistory, setDeletingHistory] = useState(false)
  const [windowEnd, setWindowEnd] = useState(0)
  const [WINDOW, setWINDOW] = useState(7)
  const windowRef = useRef(7)
  const dragStartX = useRef<number | null>(null)

  useEffect(() => {
    const update = () => {
      const val = window.innerWidth >= 1024 ? 15 : 7
      setWINDOW(val)
      windowRef.current = val
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  useEffect(() => {
    if (bots.length > 0 && !selectedBotId) setSelectedBotId(bots[0].id)
  }, [bots, selectedBotId])

  useEffect(() => {
    setSalesSeen(false)
    setWindowEnd(0)
  }, [selectedBotId])

  useEffect(() => {
    if (!selectedBotId) return
    setLoadingChart(true)
    fetch(`/api/bots/${selectedBotId}/analytics`)
      .then(r => r.json())
      .then(d => {
        if (d.days) {
          setDays(d.days)
          setRecentSales(d.recentSales ?? [])
        }
        setLoadingChart(false)
      })
      .catch(() => setLoadingChart(false))
  }, [selectedBotId])

  if (bots.length === 0) return null

  // Ventana de días según pantalla
  const endIdx = days.length - windowEnd
  const startIdx = Math.max(0, endIdx - WINDOW)
  const visibleDays = days.slice(startIdx, endIdx)
  const W = 620, H = 94, padL = 34, padR = 16, padT = 14, padB = 20
  const maxVal = Math.max(...visibleDays.map(d => d.conversations), ...visibleDays.map(d => d.sales), 1)

  const xOf = (i: number) => padL + (visibleDays.length > 1 ? i / (visibleDays.length - 1) : 0.5) * (W - padL - padR)
  const yOf = (v: number) => padT + (1 - v / maxVal) * (H - padT - padB)

  const convPoints  = visibleDays.map((d, i) => ({ x: xOf(i), y: yOf(d.conversations), val: d.conversations, date: d.date }))
  const salesPoints = visibleDays.map((d, i) => ({ x: xOf(i), y: yOf(d.sales),          val: d.sales,          date: d.date }))

  const convLine   = smoothCurvePath(convPoints)
  const salesLine  = smoothCurvePath(salesPoints)
  const convArea   = convLine  ? `${convLine}  L ${convPoints[convPoints.length-1].x.toFixed(1)}  ${(H-padB).toFixed(1)} L ${convPoints[0].x.toFixed(1)}  ${(H-padB).toFixed(1)} Z`  : ''
  const salesArea  = salesLine ? `${salesLine} L ${salesPoints[salesPoints.length-1].x.toFixed(1)} ${(H-padB).toFixed(1)} L ${salesPoints[0].x.toFixed(1)} ${(H-padB).toFixed(1)} Z` : ''

  const yVals = [0, Math.round(maxVal / 2), maxVal]

  return (
    <div className="rounded-2xl" style={{ padding: '14px 16px 10px', background: 'linear-gradient(135deg, #FAF6FB 0%, #F2F0FA 45%, #E7E9F5 100%)', border: '1px solid #C9CFE0', boxShadow: '0 2px 6px rgba(17,24,39,0.05), 0 20px 40px -14px rgba(17,24,39,0.28), 0 44px 82px -34px rgba(17,24,39,0.46), 0 0 52px -16px rgba(183,53,184,0.12), inset 0 1px 0 rgba(255,255,255,0.95)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#111827', margin: 0, letterSpacing: '0.02em' }}>
            {visibleDays.length > 0
              ? `${fmtChartDate(visibleDays[0].date)} — ${fmtChartDate(visibleDays[visibleDays.length - 1].date)}`
              : 'Últimos 7 días'}
          </p>
          <p style={{ fontSize: 11, color: '#6B7280', margin: '4px 0 0' }}>
            <span style={{ color: '#1D4ED8', fontWeight: 700 }}>{visibleDays.reduce((s, d) => s + d.conversations, 0)}</span> personas ·{' '}
            <span style={{ color: '#7C3AED', fontWeight: 700 }}>{visibleDays.reduce((s, d) => s + d.sales, 0)}</span> ventas
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#6B7280' }}>
            <span style={{ display: 'inline-block', width: 10, height: 3, borderRadius: 99, background: '#2563EB' }} />
            ● Personas
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#6B7280' }}>
            <span style={{ display: 'inline-block', width: 10, height: 3, borderRadius: 99, background: '#7C3AED' }} />
            ✦ Ventas
          </span>
        </div>
      </div>

      {/* Bot selector */}
      {bots.length > 1 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
          {bots.map(b => (
            <button key={b.id} onClick={() => setSelectedBotId(b.id)}
              style={{ padding: '5px 13px', borderRadius: 99, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: '1px solid', transition: 'all 0.15s',
                background: selectedBotId === b.id ? 'linear-gradient(135deg,#1fb8bb,#147e95,#12303a)' : 'rgba(17,24,39,0.04)',
                borderColor: selectedBotId === b.id ? 'transparent' : 'rgba(17,24,39,0.12)',
                color: selectedBotId === b.id ? '#fff' : '#6B7280',
                boxShadow: selectedBotId === b.id ? '0 8px 18px -8px rgba(183,53,184,0.55)' : 'none',
              }}>
              🤖 {b.name}
              {(b.salesCount ?? 0) > 0 && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  minWidth: 16, height: 16, borderRadius: 99,
                  background: 'linear-gradient(135deg, #1fb8bb, #147e95, #233B8F)', color: '#fff',
                  fontSize: 9, fontWeight: 800, padding: '0 4px', marginLeft: 4,
                }}>
                  {b.salesCount}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Chart */}
      {loadingChart ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 60 }}>
          <Loader2 className="w-5 h-5 animate-spin text-[#6B7280]" />
        </div>
      ) : (
        <div
          style={{ touchAction: 'pan-y', cursor: 'grab', userSelect: 'none' }}
          onPointerDown={e => { dragStartX.current = e.clientX }}
          onPointerUp={e => {
            if (dragStartX.current === null) return
            const delta = dragStartX.current - e.clientX
            const PX_PER_DAY = 28
            const daysMoved = Math.round(Math.abs(delta) / PX_PER_DAY)
            if (daysMoved === 0) { dragStartX.current = null; return }
            if (delta > 0) setWindowEnd(w => Math.min(w + daysMoved, Math.max(0, days.length - windowRef.current)))
            else setWindowEnd(w => Math.max(0, w - daysMoved))
            dragStartX.current = null
          }}
          onPointerLeave={() => { dragStartX.current = null }}
        >
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible', pointerEvents: 'none' }}>
          <defs>
            {/* Conversations — cyan */}
            <linearGradient id="gc-conv-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#0D1E79" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#0D1E79" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="gc-conv-line" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%"   stopColor="#3B82F6" />
              <stop offset="100%" stopColor="#0D1E79" />
            </linearGradient>
            {/* Sales — purple */}
            <linearGradient id="gc-sales-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#6A35D9" stopOpacity="0.20" />
              <stop offset="100%" stopColor="#6A35D9" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="gc-sales-line" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%"   stopColor="#A78BFA" />
              <stop offset="100%" stopColor="#6A35D9" />
            </linearGradient>
            <filter id="gc-glow-conv" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="2" result="blur"/>
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
            <filter id="gc-glow-sales" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="2.5" result="blur"/>
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
            <filter id="gc-dot-glow" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="3" result="blur"/>
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>

          {/* Grid */}
          {yVals.map((v, i) => {
            const y = yOf(v)
            return (
              <g key={i}>
                <line x1={padL} y1={y} x2={W - padR} y2={y}
                  stroke="rgba(17,24,39,0.08)" strokeWidth="1"
                  strokeDasharray={i === 0 ? undefined : '3 7'} />
                <text x={padL - 6} y={y + 4} textAnchor="end"
                  fontSize="8" fill="rgba(17,24,39,0.30)" fontFamily="monospace">{v}</text>
              </g>
            )
          })}
          <line x1={padL} y1={H - padB} x2={W - padR} y2={H - padB}
            stroke="rgba(17,24,39,0.08)" strokeWidth="1" />

          {/* ── Conversaciones (cyan) ── */}
          {convArea  && <path d={convArea}  fill="url(#gc-conv-area)" />}
          {convLine  && <path d={convLine}  fill="none" stroke="url(#gc-conv-line)"  strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round" filter="url(#gc-glow-conv)" />}
          {convPoints.map((p, i) => p.val === 0 ? null : (
            <circle key={i} cx={p.x} cy={p.y} r="2.5" fill="#0D1E79" stroke="rgba(15,23,42,0.10)" strokeWidth="1.5" />
          ))}

          {/* ── Ventas (green) con badges ── */}
          {salesArea && <path d={salesArea} fill="url(#gc-sales-area)" />}
          {salesLine && <path d={salesLine} fill="none" stroke="url(#gc-sales-line)" strokeWidth="2"   strokeLinejoin="round" strokeLinecap="round" filter="url(#gc-glow-sales)" />}
          {salesPoints.map((p, i) => {
            if (p.val === 0) return null
            return (
              <g key={i} filter="url(#gc-dot-glow)">
                <circle cx={p.x} cy={p.y} r="10" fill="#6A35D9" opacity="0.07" />
                <rect x={p.x - 11} y={p.y - 30} width="22" height="15" rx="5" fill="#6A35D9" opacity="0.92" />
                <text x={p.x} y={p.y - 19} textAnchor="middle" fontSize="8" fontWeight="800" fill="#fff">{p.val}</text>
                <line x1={p.x} y1={p.y - 15} x2={p.x} y2={p.y - 5} stroke="#6A35D9" strokeWidth="1" opacity="0.4" />
                <circle cx={p.x} cy={p.y} r="4" fill="#6A35D9" stroke="rgba(15,23,42,0.10)" strokeWidth="1.5" />
                <circle cx={p.x} cy={p.y} r="2" fill="#fff" opacity="0.5" />
              </g>
            )
          })}

          {/* Fechas */}
          {convPoints.map((p, i) => (
            <text key={i} x={p.x} y={H - 8} textAnchor="middle"
              fontSize="8.5" fill="rgba(17,24,39,0.35)" fontFamily="system-ui">
              {fmtChartDate(p.date)}
            </text>
          ))}
        </svg>
        </div>
      )}

      {/* Footer: open modal */}
      {selectedBotId && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
          <button
            onClick={() => { setShowSalesModal(true); setSalesSeen(true) }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12,
              fontWeight: 700, color: '#fff',
              background: 'linear-gradient(135deg,#1fb8bb,#147e95,#12303a)',
              border: '1px solid transparent',
              boxShadow: '0 8px 20px -10px rgba(183,53,184,0.6)',
              borderRadius: 10, padding: '7px 16px',
              cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            📋 Ver ventas recientes
            {recentSales.length > 0 && !salesSeen && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                minWidth: 18, height: 18, borderRadius: 99,
                background: 'linear-gradient(135deg, #1fb8bb, #147e95, #233B8F)', color: '#fff',
                fontSize: 10, fontWeight: 800, padding: '0 5px',
              }}>
                {recentSales.length}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Modal ventas recientes — portal para escapar del stacking context */}
      {showSalesModal && typeof document !== 'undefined' && createPortal(
        <div
          onClick={() => setShowSalesModal(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 999,
            background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#0F1117', border: '1px solid rgba(13,30,121,0.2)',
              borderRadius: 18, padding: 24, width: '100%', maxWidth: 520,
              maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 0 40px rgba(13,30,121,0.1)',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#0D1E79' }}>📋 Ventas recientes</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {recentSales.length > 0 && (
                  <button
                    onClick={() => {
                      if (!confirm('¿Eliminar todo el historial de conversaciones de este bot? Esta acción no se puede deshacer.')) return
                      setDeletingHistory(true)
                      fetch(`/api/bots/${selectedBotId}/analytics`, { method: 'DELETE' })
                        .then(() => {
                          setRecentSales([])
                          setDays(days.map(d => ({ ...d, conversations: 0, sales: 0 })))
                          setSalesSeen(true)
                        })
                        .catch(() => {})
                        .finally(() => setDeletingHistory(false))
                    }}
                    disabled={deletingHistory}
                    style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '3px 10px', color: 'rgba(239,68,68,0.7)', cursor: deletingHistory ? 'default' : 'pointer', fontSize: 10, fontWeight: 600 }}
                  >
                    {deletingHistory ? '...' : '🗑 Eliminar historial'}
                  </button>
                )}
                <button
                  onClick={() => setShowSalesModal(false)}
                  style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 8, padding: '3px 8px', color: '#6B7280', cursor: 'pointer', fontSize: 11 }}
                >✕</button>
              </div>
            </div>

            {recentSales.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#6B7280', fontSize: 11, padding: '28px 0' }}>
                No hay ventas registradas aún
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {recentSales.map((s, i) => (
                  <div key={i} style={{
                    background: 'rgba(106,53,217,0.04)', border: '1px solid rgba(106,53,217,0.10)',
                    borderRadius: 12, padding: '10px 12px',
                  }}>
                    {/* Nombre + fecha */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginBottom: 3 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#fff', wordBreak: 'break-word' }}>
                        {s.userName || 'Sin nombre'}
                      </span>
                      <span style={{ fontSize: 9, color: '#6B7280', flexShrink: 0 }}>
                        {s.soldAt ? new Date(s.soldAt).toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'America/La_Paz' }) : '—'}
                      </span>
                    </div>
                    {/* Teléfono — línea propia para que no desborde */}
                    <div style={{
                      display: 'inline-block', marginBottom: s.reporte ? 8 : 0,
                      fontSize: 10, fontWeight: 600, color: '#0D1E79',
                      background: 'rgba(13,30,121,0.08)', border: '1px solid rgba(13,30,121,0.2)',
                      borderRadius: 5, padding: '2px 7px',
                      wordBreak: 'break-all',
                    }}>
                      📞 {s.userPhone}
                    </div>
                    {/* Reporte — ancho completo */}
                    {s.reporte && (
                      <div style={{
                        fontSize: 11, color: '#6B7280',
                        background: 'rgba(0,0,0,0.25)', borderRadius: 8,
                        padding: '7px 10px', lineHeight: 1.6,
                        borderLeft: '2px solid rgba(106,53,217,0.3)',
                        whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                      }}>
                        {s.reporte}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}

// ─── Bot List ─────────────────────────────────────────────────────────────────

function BotCard({ bot, onSelect }: { bot: Bot; onSelect: (bot: Bot) => void }) {
  const isActive = bot.status === 'ACTIVE'
  const accent = isActive ? '#147e95' : '#7C82A8'
  const channel = bot.type === 'YCLOUD' ? 'YCloud' : bot.type === 'BAILEYS' ? 'WhatsApp Web' : 'Messenger'
  const stats = [
    { icon: ShoppingBag, label: 'Productos', value: bot._count?.assignedProducts ?? 0 },
    { icon: MessageCircle, label: 'Chats', value: bot._count?.conversations ?? 0 },
    { icon: Zap, label: 'Ventas', value: bot.salesCount ?? 0 },
  ]
  return (
    <button
      onClick={() => onSelect(bot)}
      className="relative w-full text-left group transition-all duration-300 hover:-translate-y-0.5"
      style={{
        marginTop: 30,
        borderRadius: 18,
        background: isActive
          ? `radial-gradient(120% 80% at 50% -6%, ${accent}2a, rgba(255,255,255,0) 56%), radial-gradient(95% 75% at 100% 108%, rgba(106,53,217,0.22), rgba(255,255,255,0) 60%), linear-gradient(180deg, #0B1B2B 0%, #050B14 100%)`
          : 'linear-gradient(180deg, #0B1726 0%, #070D17 100%)',
        border: `1px solid ${isActive ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.07)'}`,
        boxShadow: isActive ? '0 18px 38px -22px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.045)' : 'none',
        opacity: isActive ? 1 : 0.62,
      }}
      onMouseEnter={e => {
        if (!isActive) return
        e.currentTarget.style.boxShadow = `0 24px 48px -22px rgba(0,0,0,0.86), 0 0 24px -8px ${accent}3a, inset 0 1px 0 rgba(255,255,255,0.07)`
        e.currentTarget.style.borderColor = `${accent}4d`
      }}
      onMouseLeave={e => {
        if (!isActive) return
        e.currentTarget.style.boxShadow = '0 18px 38px -22px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.045)'
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)'
      }}
    >
      {/* capa decorativa recortada a la card (presencia IA holográfica grande + grid + reflejo) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ borderRadius: 18 }}>
        <img
          src="https://i.ibb.co/gxR9G7X/envato-labs-image-edit-73.png"
          alt=""
          aria-hidden
          className="absolute object-cover select-none"
          style={{
            right: -40, bottom: -50, width: 220, height: 220,
            opacity: isActive ? 0.13 : 0.05,
            filter: 'blur(2px) saturate(1.15)',
            maskImage: 'radial-gradient(circle at 55% 55%, #000 38%, transparent 74%)',
            WebkitMaskImage: 'radial-gradient(circle at 55% 55%, #000 38%, transparent 74%)',
          }}
        />
        {/* grid tecnológico fino */}
        <div className="absolute inset-0" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px)',
          backgroundSize: '30px 30px', maskImage: 'radial-gradient(ellipse at 50% 0%, #000 28%, transparent 74%)', WebkitMaskImage: 'radial-gradient(ellipse at 50% 0%, #000 28%, transparent 74%)',
        }} />
        {/* reflejo glass diagonal */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(152deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0) 34%)' }} />
        {/* línea superior premium */}
        <div className="absolute top-0 left-5 right-5 h-px" style={{ background: `linear-gradient(90deg, transparent, ${isActive ? accent + '99' : 'rgba(255,255,255,0.10)'}, transparent)` }} />
      </div>

      {/* halo ambiental detrás del avatar */}
      {isActive && (
        <div className="svc-glow-pulse absolute left-1/2 -translate-x-1/2 rounded-full pointer-events-none" style={{ top: -34, width: 130, height: 80, background: `radial-gradient(ellipse, ${accent}33, transparent 72%)`, filter: 'blur(16px)' }} />
      )}

      {/* avatar IA protagonista, sobresaliendo desde el centro superior */}
      <div className="absolute left-1/2 -translate-x-1/2 z-20" style={{ top: -30 }}>
        <div className="relative">
          <div className="svc-glow-pulse absolute inset-0 rounded-full pointer-events-none" style={{ background: `radial-gradient(circle, ${accent}40, transparent 70%)`, filter: 'blur(9px)' }} />
          <div className="relative w-[60px] h-[60px] rounded-full overflow-hidden flex items-center justify-center"
            style={{
              background: `linear-gradient(155deg, rgba(255,255,255,0.14), rgba(255,255,255,0.02)), rgba(255,255,255,0.72)`,
              border: `1px solid ${accent}66`,
              boxShadow: `0 16px 32px -10px rgba(0,0,0,0.75), 0 0 18px -3px ${accent}55, inset 0 1px 0 rgba(255,255,255,0.14)`,
            }}>
            <img
              src="https://i.ibb.co/gxR9G7X/envato-labs-image-edit-73.png"
              alt={bot.name}
              className="w-full h-full object-cover"
              style={{ filter: isActive ? 'none' : 'grayscale(0.7) opacity(0.7)' }}
            />
          </div>
          {isActive && (
            <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center"
              style={{ background: '#22C55E', borderColor: '#0b0c1a', boxShadow: '0 0 8px #22C55E' }}>
              <Wifi className="w-2 h-2 text-black" />
            </span>
          )}
        </div>
      </div>

      <div className="relative z-10 px-5 pb-5" style={{ paddingTop: 42 }}>
        {/* nombre centrado */}
        <div className="text-center font-bold text-white text-[15px] leading-tight truncate px-2"
          style={{ letterSpacing: '-0.02em', textShadow: '0 1px 14px rgba(0,0,0,0.45)' }}>
          {bot.name}
        </div>

        {/* badge EN LÍNEA (verde) + canal, centrado */}
        <div className="flex items-center justify-center gap-2 mt-2">
          {(() => {
            const sc = isActive ? '#22C55E' : '#7C82A8'
            return (
              <span className="inline-flex items-center gap-1 text-[8.5px] font-bold uppercase tracking-[0.14em] px-2 py-0.5 rounded-full"
                style={{ background: `${sc}1c`, color: sc, border: `1px solid ${sc}40`, boxShadow: isActive ? `0 0 12px -4px ${sc}66` : 'none' }}>
                {isActive && (
                  <span className="relative flex h-1 w-1">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: sc }} />
                    <span className="relative inline-flex rounded-full h-1 w-1" style={{ background: sc }} />
                  </span>
                )}
                {isActive ? 'En línea' : 'Pausado'}
              </span>
            )
          })()}
          <span className="text-[8.5px] font-medium uppercase tracking-[0.1em] truncate" style={{ color: 'rgba(255,255,255,0.5)' }}>{channel}</span>
        </div>

        {/* mini stats — strip alineado abajo */}
        <div className="flex items-stretch mt-4 rounded-xl overflow-hidden"
          style={{
            background: isActive ? `linear-gradient(180deg, ${accent}0f, rgba(255,255,255,0.025))` : 'rgba(255,255,255,0.03)',
            border: `1px solid ${isActive ? accent + '22' : 'rgba(255,255,255,0.06)'}`,
            boxShadow: isActive ? `inset 0 0 18px -10px ${accent}55` : 'none',
          }}>
          {stats.map((st, idx) => (
            <div key={st.label} className="flex-1 flex flex-col items-center justify-center gap-1 py-2.5"
              style={idx < stats.length - 1 ? { borderRight: '1px solid rgba(255,255,255,0.06)' } : undefined}>
              <div className="flex items-center gap-1.5">
                <st.icon className="w-3 h-3 shrink-0" style={{ color: isActive ? accent : 'rgba(255,255,255,0.28)' }} />
                <span className="text-sm font-bold text-white leading-none" style={{ letterSpacing: '-0.02em' }}>{st.value}</span>
              </div>
              <span className="text-[8px] uppercase tracking-[0.1em]" style={{ color: 'rgba(255,255,255,0.34)' }}>{st.label}</span>
            </div>
          ))}
        </div>
      </div>
    </button>
  )
}

// ─── Webhook Tab ──────────────────────────────────────────────────────────────

function WebhookTab({ bot }: { bot: Bot }) {
  const appUrl = typeof window !== 'undefined' ? window.location.origin : 'https://tu-dominio.com'
  const isMeta = bot.type === 'META'
  const webhookUrl = isMeta
    ? `${appUrl}/api/webhooks/meta/${bot.id}`
    : `${appUrl}/api/webhooks/ycloud/whatsapp/${bot.id}?token=${bot.webhookToken}`
  const [clearing, setClearing] = useState(false)
  const [clearMsg, setClearMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(null)

  async function handleClearMemory() {
    if (!confirm('⚠️ Esto eliminará TODAS las conversaciones y mensajes de este bot.\n\n¿Estás seguro? Esta acción no se puede deshacer.')) return
    setClearing(true)
    setClearMsg(null)
    try {
      const res = await fetch(`/api/bots/${bot.id}/clear-memory`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al limpiar')
      setClearMsg({ type: 'success', text: `Memoria limpiada correctamente (${data.conversationsDeleted} conversaciones eliminadas)` })
    } catch (err: unknown) {
      setClearMsg({ type: 'error', text: err instanceof Error ? err.message : 'Error desconocido' })
    } finally {
      setClearing(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="dm-card-dark p-6 rounded-2xl border border-[#233B8F]/20">
        <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
          <Webhook className="w-4 h-4 text-[#7DD3FC]" />
          URL del Webhook
        </h3>
        <p className="text-xs text-white/50 mb-4">
          {isMeta
            ? 'Configura esta URL en developers.facebook.com → tu App → Messenger → Webhooks. El Verify Token es el de abajo.'
            : 'Configura esta URL en tu panel de YCloud como Webhook URL para mensajes entrantes.'}
        </p>
        <div className="bg-white/70 border border-white/10 rounded-xl p-3 flex items-center gap-2">
          <code className="flex-1 text-xs text-[#7DD3FC] break-all font-mono">{webhookUrl}</code>
          <CopyButton text={webhookUrl} />
        </div>
        {isMeta && (
          <div className="mt-3">
            <p className="text-xs text-white/50 mb-2">Verify Token (pégalo en Meta al configurar el webhook):</p>
            <div className="bg-white/70 border border-white/10 rounded-xl p-3 flex items-center gap-2">
              <code className="flex-1 text-xs text-purple-400 break-all font-mono">{bot.webhookToken}</code>
              <CopyButton text={bot.webhookToken} />
            </div>
          </div>
        )}
      </div>

      {!isMeta && (
        <div className="dm-card-dark p-6 rounded-2xl">
          <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
            <Key className="w-4 h-4 text-[#147e95]" />
            Webhook Token (secreto)
          </h3>
          <p className="text-xs text-white/50 mb-4">
            Este token valida que el webhook viene de YCloud. Ya está incluido en la URL anterior como{' '}
            <code className="text-[#147e95]">?token=...</code>
          </p>
          <div className="bg-white/70 border border-white/10 rounded-xl p-3 flex items-center gap-2">
            <code className="flex-1 text-xs text-white/75 font-mono truncate">
              {bot.webhookToken.slice(0, 8)}{'*'.repeat(20)}{bot.webhookToken.slice(-4)}
            </code>
            <CopyButton text={bot.webhookToken} />
          </div>
        </div>
      )}

      <div className="dm-card-dark p-6 rounded-2xl border border-white/10">
        {isMeta ? (
          <>
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <span className="text-base">💬</span> Pasos de configuración en Meta (Facebook Messenger)
            </h3>
            <ol className="space-y-3">
              {[
                'Ve a developers.facebook.com e inicia sesión con tu cuenta de Facebook',
                'Crea o selecciona tu App → en el panel izquierdo ve a Messenger → Configuración',
                'En la sección "Webhooks" haz clic en "Agregar URL de devolución de llamada"',
                'Pega la URL del webhook de arriba en el campo "URL de devolución de llamada"',
                'Pega el Verify Token de arriba en el campo "Token de verificación"',
                'Haz clic en "Verificar y guardar" — Meta enviará el challenge y el bot responderá',
                'En "Suscripciones de campos" activa: messages, messaging_postbacks',
                'En "Tokens de acceso" genera el token para tu Página y guárdalo en Credenciales',
                'Envía un mensaje de prueba a tu Página de Facebook',
              ].map((step, i) => (
                <li key={i} className="flex gap-3 text-sm text-white/75">
                  <span className="w-5 h-5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </>
        ) : (
          <>
            <h3 className="text-sm font-bold text-white mb-3">Pasos de configuración en YCloud</h3>
            <ol className="space-y-3">
              {[
                'Inicia sesión en https://app.ycloud.com',
                'Ve a WhatsApp → Webhooks',
                'Agrega la URL del webhook copiada arriba',
                'Selecciona el evento: inbound_message.received',
                'Guarda la configuración',
                'Envía un mensaje de prueba al número configurado',
              ].map((step, i) => (
                <li key={i} className="flex gap-3 text-sm text-white/75">
                  <span className="w-5 h-5 rounded-full bg-[#233B8F]/10 border border-[#233B8F]/20 text-[#7DD3FC] text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </>
        )}
      </div>

      {/* ── Zona de riesgo ── */}
      <div className="dm-card-dark p-6 rounded-2xl border border-red-500/20">
        <h3 className="text-sm font-bold text-red-400 flex items-center gap-2 mb-1">
          <Trash2 className="w-4 h-4" />
          Zona de riesgo
        </h3>
        <p className="text-xs text-white/50 mb-4">
          Elimina permanentemente todo el historial de conversaciones y mensajes de este bot.
          Los productos y la configuración no se verán afectados.
        </p>

        {clearMsg && <div className="mb-4"><Alert type={clearMsg.type} msg={clearMsg.text} /></div>}

        <button
          type="button"
          onClick={handleClearMemory}
          disabled={clearing}
          className="flex items-center gap-2 px-4 py-2.5 bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 hover:border-red-500/50 font-medium rounded-xl text-sm transition-colors disabled:opacity-50"
        >
          {clearing ? <Spinner /> : <Trash2 className="w-4 h-4" />}
          {clearing ? 'Limpiando...' : 'Limpiar memoria del bot'}
        </button>
      </div>
    </div>
  )
}


// ─── Credentials Tab ──────────────────────────────────────────────────────────

function CredentialsTab({ bot, onStatusChange }: { bot: Bot; onStatusChange: (status: 'ACTIVE' | 'PAUSED') => void }) {
  const isBaileys = bot.type === 'BAILEYS'
  const isMeta    = bot.type === 'META'
  const [form, setForm] = useState({
    ycloudApiKey: '',
    openaiApiKey: '',
    whatsappInstanceNumber: '',
    reportPhone: '',
    metaPageToken: '',
  })
  const [selectedModel, setSelectedModel] = useState(bot.aiModel || 'gpt-5.1')
  const [savingModel, setSavingModel] = useState(false)
  const [showYcloud, setShowYcloud] = useState(false)
  const [showOpenai, setShowOpenai] = useState(false)
  const [showMeta, setShowMeta] = useState(false)
  const [creds, setCreds] = useState<{ hasYcloudKey: boolean; hasOpenAIKey: boolean; hasMetaToken: boolean; metaPageTokenHint: string; whatsappInstanceNumber: string; reportPhone: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [savingStatus, setSavingStatus] = useState(false)
  const [msg, setMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(null)

  const loadCreds = useCallback(async () => {
    const res = await fetch(`/api/bots/${bot.id}/credentials`)
    if (res.ok) {
      const data = await res.json()
      setCreds(data)
      setForm(f => ({
        ...f,
        whatsappInstanceNumber: data.whatsappInstanceNumber,
        reportPhone: data.reportPhone,
      }))
    }
  }, [bot.id])

  useEffect(() => { loadCreds() }, [loadCreds])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMsg(null)
    try {
      const res = await fetch(`/api/bots/${bot.id}/credentials`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setMsg({ type: 'success', text: 'Credenciales guardadas correctamente' })
      loadCreds()
    } catch (err: unknown) {
      setMsg({ type: 'error', text: err instanceof Error ? err.message : 'Error guardando' })
    } finally {
      setLoading(false)
    }
  }

  async function toggleStatus() {
    setSavingStatus(true)
    const newStatus = bot.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE'
    try {
      const res = await fetch(`/api/bots/${bot.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) onStatusChange(newStatus)
    } finally {
      setSavingStatus(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Status toggle */}
      <div className="dm-card-dark p-5 rounded-2xl flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-bold text-white">Estado del Agente</div>
          <div className="text-xs text-white/50 mt-0.5 truncate">
            {bot.status === 'ACTIVE' ? 'El bot está respondiendo mensajes' : 'El bot está pausado'}
          </div>
        </div>
        <button
          onClick={toggleStatus}
          disabled={savingStatus}
          className="flex items-center gap-1.5 text-sm font-medium transition-colors disabled:opacity-50 shrink-0"
        >
          {savingStatus ? (
            <Spinner />
          ) : bot.status === 'ACTIVE' ? (
            <ToggleRight className="w-8 h-8 text-[#16A34A]" />
          ) : (
            <ToggleLeft className="w-8 h-8 text-white/40" />
          )}
          <span className={bot.status === 'ACTIVE' ? 'text-[#16A34A]' : 'text-white/50'}>
            {bot.status === 'ACTIVE' ? 'Activo' : 'Pausado'}
          </span>
        </button>
      </div>

      {/* Credentials form */}
      <form onSubmit={handleSave} className="dm-card-dark p-6 rounded-2xl space-y-5">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Key className="w-4 h-4 text-[#147e95]" />
          Claves de API
        </h3>

        {msg && <Alert type={msg.type} msg={msg.text} />}

        {/* YCloud API Key — solo para bots YCloud */}
        {!isBaileys && !isMeta && (
          <div>
            <label className="block text-xs font-medium text-white/75 mb-1.5">
              YCloud API Key{' '}
              {creds?.hasYcloudKey && (
                <span className="text-[#16A34A] ml-1">✓ configurada</span>
              )}
            </label>
            <div className="relative">
              <input
                type={showYcloud ? 'text' : 'password'}
                value={form.ycloudApiKey}
                onChange={e => setForm(f => ({ ...f, ycloudApiKey: e.target.value }))}
                placeholder={creds?.hasYcloudKey ? '(dejar vacío para mantener)' : 'yk_live_...'}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 pr-10 text-sm text-white placeholder-dark-500 focus:outline-none focus:border-[#147e95]/40"
              />
              <button
                type="button"
                onClick={() => setShowYcloud(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
              >
                {showYcloud ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        )}

        {/* Meta Page Access Token — solo para bots META */}
        {isMeta && (
          <div>
            <label className="block text-xs font-medium text-white/75 mb-1.5">
              Meta Page Access Token{' '}
              {creds?.hasMetaToken && (
                <span className="text-[#16A34A] ml-1">✓ configurado ({creds.metaPageTokenHint})</span>
              )}
            </label>
            <div className="relative">
              <input
                type={showMeta ? 'text' : 'password'}
                value={form.metaPageToken}
                onChange={e => setForm(f => ({ ...f, metaPageToken: e.target.value }))}
                placeholder={creds?.hasMetaToken ? '(dejar vacío para mantener)' : 'EAAxxxxxxx...'}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 pr-10 text-sm text-white placeholder-dark-500 focus:outline-none focus:border-purple-400/40"
              />
              <button
                type="button"
                onClick={() => setShowMeta(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
              >
                {showMeta ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-white/40 mt-1">Obtén el token permanente desde developers.facebook.com → tu App → Messenger → Tokens de acceso.</p>
          </div>
        )}

        {/* OpenAI API Key */}
        <div>
          <label className="block text-xs font-medium text-white/75 mb-1.5">
            OpenAI API Key{' '}
            {creds?.hasOpenAIKey && (
              <span className="text-[#16A34A] ml-1">✓ configurada</span>
            )}
          </label>
          <div className="relative">
            <input
              type={showOpenai ? 'text' : 'password'}
              value={form.openaiApiKey}
              onChange={e => setForm(f => ({ ...f, openaiApiKey: e.target.value }))}
              placeholder={creds?.hasOpenAIKey ? '(dejar vacío para mantener)' : 'sk-proj-...'}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 pr-10 text-sm text-white placeholder-dark-500 focus:outline-none focus:border-[#147e95]/40"
            />
            <button
              type="button"
              onClick={() => setShowOpenai(s => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
            >
              {showOpenai ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* WhatsApp number — solo para bots YCloud */}
        {!isBaileys && !isMeta && (
          <div>
            <label className="block text-xs font-medium text-white/75 mb-1.5">
              Número WhatsApp Business (from)
            </label>
            <input
              value={form.whatsappInstanceNumber}
              onChange={e => setForm(f => ({ ...f, whatsappInstanceNumber: e.target.value }))}
              placeholder="15551234567 (sin + ni espacios)"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-dark-500 focus:outline-none focus:border-[#147e95]/40"
            />
          </div>
        )}

        {/* Report phone — solo para bots WhatsApp (YCLOUD y BAILEYS) */}
        {!isMeta && (
          <div>
            <label className="block text-xs font-medium text-white/75 mb-1.5">
              Número interno para reportes
            </label>
            <input
              value={form.reportPhone}
              onChange={e => setForm(f => ({ ...f, reportPhone: e.target.value }))}
              placeholder="15559876543"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-dark-500 focus:outline-none focus:border-[#147e95]/40"
              required
            />
            <p className="text-xs text-white/40 mt-1">
              Cuando un cliente confirme su pedido, el agente enviará un reporte a este número por WhatsApp.
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-gradient-to-r from-[#1fb8bb] via-[#147e95] to-[#233B8F] text-white font-bold rounded-xl hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
        >
          {loading ? <Spinner /> : <Save className="w-4 h-4" />}
          Guardar credenciales
        </button>
      </form>

      {/* Model selector */}
      <div className="dm-card-dark p-6 rounded-2xl space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Zap className="w-4 h-4 text-[#147e95]" />
          Modelo de IA
          <span className="text-xs font-normal text-white/50 ml-1">— para respuestas al cliente</span>
        </h3>
        <p className="text-xs text-white/40">Los seguimientos automáticos siempre usan GPT-4o Mini (más económico).</p>

        <div className="space-y-2">
          {[
            { id: 'gpt-5.2',     label: 'GPT-5.2',     desc: 'Último modelo · Máxima capacidad', color: 'text-[#147e95]' },
            { id: 'gpt-5.1',     label: 'GPT-5.1',     desc: 'Más inteligente · Mayor costo',    color: 'text-[#147e95]' },
            { id: 'gpt-4o',      label: 'GPT-4o',       desc: 'Equilibrado · Costo moderado',     color: 'text-[#7DD3FC]' },
            { id: 'gpt-4o-mini', label: 'GPT-4o Mini',  desc: 'Más económico · Muy capaz',        color: 'text-[#16A34A]' },
          ].map(m => (
            <button
              key={m.id}
              type="button"
              onClick={() => setSelectedModel(m.id)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all text-left ${
                selectedModel === m.id
                  ? 'border-[#147e95]/60 bg-[#147e95]/10'
                  : 'border-white/10 bg-white/30 hover:border-white/10'
              }`}
            >
              <div>
                <span className={`text-sm font-semibold ${selectedModel === m.id ? m.color : 'text-white'}`}>{m.label}</span>
                <p className="text-xs text-white/50 mt-0.5">{m.desc}</p>
              </div>
              {selectedModel === m.id && <CheckCircle2 className="w-4 h-4 text-[#147e95] shrink-0" />}
            </button>
          ))}
        </div>
        <button
          type="button"
          disabled={savingModel}
          onClick={async () => {
            setSavingModel(true)
            try {
              await fetch(`/api/bots/${bot.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ aiModel: selectedModel }),
              })
            } finally {
              setSavingModel(false)
            }
          }}
          className="w-full py-2.5 bg-white/5 border border-white/10 text-white text-sm font-semibold rounded-xl hover:border-[#16A34A]/40 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
        >
          {savingModel ? <Spinner /> : <Save className="w-4 h-4" />}
          Guardar modelo
        </button>
      </div>
    </div>
  )
}

// ─── Voz del agente (nota de voz / TTS) ─────────────────────────────────────────

function VoiceCard({ bot }: { bot: Bot }) {
  const [voiceEnabled, setVoiceEnabled] = useState(bot.voiceEnabled ?? false)
  const [voiceId, setVoiceId] = useState(bot.voiceId || DEFAULT_VOICE_ID)
  const [voiceMode, setVoiceMode] = useState(bot.voiceMode && bot.voiceMode !== 'off' ? bot.voiceMode : 'audio_in')
  const [savingVoice, setSavingVoice] = useState(false)
  const [loadingVoice, setLoadingVoice] = useState<string | null>(null)   // generando la muestra
  const [playingVoice, setPlayingVoice] = useState<string | null>(null)   // sonando ahora
  const previewAudioRef = useRef<HTMLAudioElement | null>(null)
  const [msg, setMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(null)

  const stopPreview = () => {
    if (previewAudioRef.current) { previewAudioRef.current.pause(); previewAudioRef.current = null }
    setLoadingVoice(null)
    setPlayingVoice(null)
  }

  const playPreview = (id: string) => {
    // Tocar de nuevo la misma voz (cargando o sonando) → detener.
    if (loadingVoice === id || playingVoice === id) { stopPreview(); return }
    stopPreview()
    setMsg(null)
    setLoadingVoice(id)
    try {
      const a = new Audio(`/api/tts/preview?voice=${id}`)
      previewAudioRef.current = a
      a.onplaying = () => { setLoadingVoice(null); setPlayingVoice(id) }   // ya suena → quitar spinner
      a.onended = () => { setLoadingVoice(null); setPlayingVoice(null) }
      a.onerror = () => { setLoadingVoice(null); setPlayingVoice(null); setMsg({ type: 'error', text: 'No se pudo reproducir (¿voz configurada en el servidor?)' }) }
      a.play().catch(() => { setLoadingVoice(null); setPlayingVoice(null) })
    } catch { stopPreview() }
  }

  return (
    <div className="dm-card-dark p-6 rounded-2xl space-y-4">
      {msg && (
        <div className={`text-xs px-3 py-2 rounded-lg border ${msg.type === 'success' ? 'border-[#16A34A]/40 bg-[#16A34A]/10 text-[#16A34A]' : 'border-red-500/40 bg-red-500/10 text-red-300'}`}>
          {msg.text}
        </div>
      )}
      <h3 className="text-sm font-bold text-white flex items-center gap-2">
        <Volume2 className="w-4 h-4 text-[#7DD3FC]" />
        Voz del agente
        <span className="text-xs font-normal text-white/50 ml-1">— responde con notas de voz</span>
      </h3>

      <button
        type="button"
        onClick={() => setVoiceEnabled(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-white/10 bg-white/30 text-left"
      >
        <div>
          <span className="text-sm font-semibold text-white">Activar voz</span>
          <p className="text-xs text-white/50 mt-0.5">Notas de voz reales con IA (voces en español).</p>
        </div>
        {voiceEnabled
          ? <ToggleRight className="w-7 h-7 text-[#7DD3FC] shrink-0" />
          : <ToggleLeft className="w-7 h-7 text-white/50 shrink-0" />}
      </button>

      {voiceEnabled && (
        <>
          <div className="space-y-2">
            <p className="text-xs font-semibold text-white/50">¿Cuándo responde con voz?</p>
            {[
              { id: 'audio_in', label: 'Solo si el cliente manda audio', desc: 'Recomendado · natural y ahorra costo' },
              { id: 'always',   label: 'Siempre con voz',                 desc: 'Cada respuesta también en nota de voz' },
            ].map(m => (
              <button
                key={m.id}
                type="button"
                onClick={() => setVoiceMode(m.id)}
                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl border text-left transition-all ${
                  voiceMode === m.id ? 'border-[#233B8F]/60 bg-[#233B8F]/10' : 'border-white/10 bg-white/30 hover:border-white/10'
                }`}
              >
                <div>
                  <span className={`text-sm font-semibold ${voiceMode === m.id ? 'text-[#7DD3FC]' : 'text-white'}`}>{m.label}</span>
                  <p className="text-xs text-white/50 mt-0.5">{m.desc}</p>
                </div>
                {voiceMode === m.id && <CheckCircle2 className="w-4 h-4 text-[#7DD3FC] shrink-0" />}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-white/50">Elige la voz <span className="text-white/40">(▶ escuchar · ⏸ tocá de nuevo para detener)</span></p>
            {BOT_VOICES.map(v => (
              <div
                key={v.id}
                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl border transition-all ${
                  voiceId === v.id ? 'border-[#233B8F]/60 bg-[#233B8F]/10' : 'border-white/10 bg-white/30'
                } ${playingVoice === v.id ? 'ring-1 ring-[#233B8F]/50' : ''}`}
              >
                <button type="button" onClick={() => setVoiceId(v.id)} className="flex items-center gap-3 text-left flex-1 min-w-0">
                  {voiceId === v.id
                    ? <CheckCircle2 className="w-4 h-4 text-[#7DD3FC] shrink-0" />
                    : <span className="w-4 h-4 rounded-full border border-white/10 shrink-0" />}
                  <span className="min-w-0">
                    <span className={`text-sm font-semibold ${voiceId === v.id ? 'text-[#7DD3FC]' : 'text-white'}`}>{v.name}</span>
                    <span className="block text-xs text-white/50 truncate">{v.desc}</span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => playPreview(v.id)}
                  title={playingVoice === v.id ? 'Detener' : loadingVoice === v.id ? 'Cargando…' : 'Escuchar'}
                  className={`ml-2 shrink-0 w-8 h-8 rounded-lg border flex items-center justify-center transition-colors ${
                    playingVoice === v.id
                      ? 'bg-[#233B8F]/25 border-[#233B8F]/60'
                      : 'bg-white/5 border-white/10 hover:border-[#233B8F]/40'
                  }`}
                >
                  {loadingVoice === v.id
                    ? <Loader2 className="w-3.5 h-3.5 text-[#7DD3FC] animate-spin" />
                    : playingVoice === v.id
                      ? <Pause className="w-3.5 h-3.5 text-[#7DD3FC]" />
                      : <Play className="w-3.5 h-3.5 text-white/50" />}
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      <button
        type="button"
        disabled={savingVoice}
        onClick={async () => {
          setSavingVoice(true)
          setMsg(null)
          try {
            const res = await fetch(`/api/bots/${bot.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ voiceEnabled, voiceId, voiceMode }),
            })
            setMsg(res.ok ? { type: 'success', text: 'Voz guardada' } : { type: 'error', text: 'No se pudo guardar la voz' })
          } catch {
            setMsg({ type: 'error', text: 'No se pudo guardar la voz' })
          } finally {
            setSavingVoice(false)
          }
        }}
        className="w-full py-2.5 bg-white/5 border border-white/10 text-white text-sm font-semibold rounded-xl hover:border-[#233B8F]/40 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
      >
        {savingVoice ? <Spinner /> : <Save className="w-4 h-4" />}
        Guardar voz
      </button>
    </div>
  )
}

// ─── Prompt Tab ───────────────────────────────────────────────────────────────

// ─── Plantilla de prompt de ejemplo ─────────────────────────────────────────

const EXAMPLE_PROMPT = `# 🎯 IDENTIDAD

Eres RUBEN, vendedor de WhatsApp. Hablas de forma cálida, directa, humana y natural. Nunca suenas robótico.

Trato:
- Mujeres: señorita / casera / [nombre]
- Hombres: estimado / amigo / [nombre]

Solo usas información del catálogo. Nunca inventas productos, precios, beneficios ni promociones.

# 🧠 FLUJO

**1. Bienvenida**
Saluda de forma cálida.
Si el cliente no dice qué producto quiere, pregunta cuál le interesa.
No avances hasta identificar el producto.

**2. Producto identificado**
Si el estado dice **AÚN NO enviado**:
- envía exactamente el texto de “Primer mensaje del producto”
- adjunta 1 video de “Videos del producto” o foto de “Imágenes principales”
- no envíes precios
- cierra con una pregunta sobre su necesidad

Si el estado dice **YA FUE ENVIADO**, pasa al siguiente paso.

**3. Necesidad y prueba social**
Pregunta qué problema o necesidad tiene.
Luego envía de 1 a 3 testimonios relacionados.
Prioriza video; si no hay, usa foto.
Acompaña con una frase corta de prueba social.

**4. Intención**
Detecta la intención principal del cliente:
Compra > Precio > Entrega > Duda > Comparación > Interés

Responde solo a la intención principal.
Máximo 2 mensajes por turno.

**5. Precio**
Solo dar precios si el cliente los pide.
- Precio normal = precio del producto
- Si hay precio de oferta, mencionarlo como promoción especial

Usa gatillos de ahorro, urgencia y beneficio real.

**6. Extras**
Solo si el cliente lo pide:
- Fotos → “Más fotos”
- Videos → “Videos producto”

**7. Cierre**
Guía con suavidad hacia la compra.
- Resaltar beneficios del producto.
- Mostrar resultados potenciales o transformación (sin inventar).
- Los mensajes deben avanzar hacia:
    - Confirmación de compra
    - Datos de entrega
    - Selección de variante

Siempre con amabilidad y claridad.

# 📦 ENVÍO

BOLIVIA
Ciudades donde hacemos entregas a domicilio (la paz, cochabamba, sucre, potosi, tarija, santa cruz, beni, pando, oruro y a provincias hacemos envios.)

Usa tiempos aproximados, no prometas de más.
Ejemplo:
- Ciudades principales: 8 a 24 horas aprox.
- Provincias: envío por línea de transporte según destino

# 📍 DATOS DE ENTREGA

Pedir siempre:
- nombre completo
- teléfono

Dirección válida:
Ciudad + Zona + Calle + Nº
o ubicación GPS / link de Google Maps

Si falta algo, pide solo lo que falta.
Si es provincia, pregunta qué línea de transporte prefiere.

# 🏢 OFICINA

Solo dar dirección de oficina si el cliente quiere recoger, visitar o insiste en ubicación física.

(Escribe aquí la dirección de tu oficina)

# ✅ CONFIRMACIÓN

Solo confirmar si ya hay dirección completa o coordenadas válidas.

Mensaje:

¡Gracias por tu confianza, [nombre]! 🚚💚

Recibí tu dirección:
📍 [dirección o coordenadas]

[Tiempo estimado de entrega]

Un encargado te llamará para coordinar ⭐

# 📝 REPORTE

Solo si hubo confirmación completa:

Hola [Ruben], nuevo pedido de [nombre].
📞 Contacto: [teléfono]
📍 Dirección: [dirección]
🛍️ Descripción: [producto y cantidad]

Si no hubo confirmación:
“reporte”: “”

# 📏 REGLAS DE MENSAJES

- Mensaje 1: máx. 150 caracteres; Mensaje 2: máx. 100; Mensaje 3: máx. 60; solo el primer mensaje del producto identificado puede ser más largo.
- Usa *negritas* en palabras clave o frases o nombre.
- Usar 2 saltos de línea para separar frases o bloques de texto.
- Poner emojis para que se vea elegante y profesional.

Debes respetar estas reglas.

# 🧩 REGLAS FINALES

- Mensajes cortos, claros y humanos
- No repitas preguntas ni datos ya dados
- No inventes nada
- Si el producto no está claro, pide aclaración
- Si hay objeción, responde con empatía + beneficio real + prueba social
- Si el input llega vacío, responde con el historial`.trim()

// ─── Plantilla de prompt "Completa" (RUBEN Pro) ─────────────────────────────
const EXAMPLE_PROMPT_PRO = `# 🎯 IDENTIDAD

Eres RUBEN, vendedor de WhatsApp. Hablas de forma cálida, directa, humana y natural. Nunca suenas robótico.

· Te adaptas a cualquier categoría (salud, negocios u otras) con profesionalismo.
Transmites energía positiva, seguridad y confianza.

· Siempre respondes con oraciones muy cortas breves y precisas y con saltos de 2 linias.

Trato:
- Mujeres: señorita / casera / [nombre]
- Hombres: estimado / amigo / [nombre]
- no repitas mucho estas palabras ni su nombre

- Solo usas información del catálogo. Nunca inventas productos, precios, beneficios ni promociones.

- Siempre presionas de forma ética hacia la compra del producto.

---

# REGLA #1 (POR ENCIMA DE TODO): RESPONDÉ SOLO LO QUE PREGUNTÓ

- Contestá EXACTAMENTE lo último que escribió el cliente. Una pregunta = una respuesta entendible y sin repitir lo que ya dijiste.

# REGLA ESTRICTA — VIDEOS y IMAGENES
Cada video o imagen se envía UNA sola vez. Si ya lo mandaste en este chat, NO lo vuelvas a enviar nunca.

# REGLAS DE MENSAJES (BURBUJAS DE WHATSAPP)

- Respondé como una persona real: en varios mensajitos cortos, NO en un párrafo largo.
- Cada campo (mensaje1, mensaje2, mensaje3, mensaje4) es UNA burbuja de WhatsApp: 1 sola idea, corta y directa.
- mensaje1: la idea principal, extremadamente corta (1 frase). SIEMPRE va.
- mensaje2, mensaje3, mensaje4: OPCIONALES. Usalos solo si aportan algo real (una pregunta, un dato clave). Si no, dejalos en "".
- La mayoría de las veces alcanza con mensaje1 (y a veces mensaje2 con una pregunta corta).
- Cada mensaje: máximo 1–2 líneas. Nada de párrafos.
- Usá negritas en palabras clave (un asterisco por lado).
- Máximo 1 emoji por mensaje, para que se vea cálido (sin exagerar).
- Poner emojis para que se vea elegante y profesional.

---

# 🧠 FLUJO

*1. Bienvenida*
Saluda de forma cálida.
Si el cliente no dice qué producto quiere, pregunta cuál le interesa.
No avances hasta identificar el producto.
- Si el cliente menciona el producto:
No confirmes. Pasa directo al paso 2.

*2. Producto identificado*
Si el estado dice *AÚN NO enviado*:
- envía exactamente el texto de “Primer mensaje del producto”
- adjunta 1 video de “Videos del producto” o foto de  “Imágenes principales” la foto es opcional
- envia mas un audio desde “Audios de voz del producto”  el audio de voz 1
- no envíes precios
- cierra con una pregunta sobre su necesidad (esta pregunta debe salir por mensaje2)
Una vez enviado el primer mensaje y el primer video o foto → no repetirlo en ningún turno posterior.

Si el estado dice *YA FUE ENVIADO*, pasa al siguiente paso.

*3. Necesidad y prueba social*
Pregunta qué problema o necesidad tiene.
Luego envía de 1 a 3 testimonios relacionados con el problema que tiene (OBLIGATORIO).
Prioriza video; si no hay, usa foto.
Acompaña con una frase corta de prueba social.

*4. Intención*
Detecta la intención principal del cliente:
Compra > Precio > Entrega > Duda > Comparación > Interés

Responde solo a la intención principal.
Máximo 2 mensajes por turno.

*5. Precio*
Solo dar precios si el cliente los pide.
- 1 unidad = precio unitario
- 2 o más = promo correspondiente del catálogo

Usa gatillos de ahorro, urgencia y beneficio real.

*6. Extras*
Solo si el cliente lo pide:
- Fotos → “Más fotos”
- Videos → “Videos producto”

*7. Cierre*
Guía con suavidad hacia la compra.
- Resaltar beneficios del producto.
- Mostrar resultados potenciales o transformación (sin inventar).
- Los mensajes deben avanzar hacia:
    - Confirmación de compra
    - Datos de entrega
    - Selección de variante

Siempre con amabilidad y claridad.

---

# 📦 ENVÍO

BOLIVIA
Ciudades donde hacemos entregas a domicilio sin nigun costo  (la paz, cochabamba, sucre, potosi, tarija, santa cruz, beni, pando, oruro y a provincias hacemos envios.)
- Pero antes deves identificar de que ciudad o provincia es.

Usa tiempos aproximados, no prometas de más.
Ejemplo:
- Ciudades principales: 8 a 24 horas aprox.
- Provincias: envío por línea de transporte según destino

---

# 📍 DATOS DE ENTREGA

Pedir siempre:
- nombre (opcional)
- teléfono de referencia (obligatorio)

Dirección válida:
Ciudad + Zona + Calle + Nº
o ubicación GPS / link de Google Maps

Si falta algo, pide solo lo que falta.
Si es provincia, pregunta qué línea de transporte prefiere.

---
# 📍 ENTREGA EN PUNTO DE ENCUENTRO

Si el cliente coordina en plaza, correos o lugar específico:

Pedir:

Lugar exacto
Hora exacta
Teléfono

Si es muy general, pedir más detalle.

---

# 🏢 OFICINA

Solo dar dirección de oficina si el cliente quiere recoger, visitar o insiste en ubicación física.

(Escribe aquí la dirección de tu oficina)

---

# ✅ CONFIRMACIÓN

Solo confirmar si ya hay dirección completa o coordenadas válidas.

Mensaje:

¡Gracias por tu confianza, [nombre]! 🚚💚

Recibí tu dirección:
📍 [dirección o coordenadas]

[Tiempo estimado de entrega]

Un encargado te llamará para coordinar ⭐

# 📝 REPORTE

Solo si hubo confirmación completa:

Hola [Ruben], nuevo pedido de [nombre].
📞 Contacto: [teléfono]
📍 Dirección: [dirección]
🛍️ Descripción: [producto y cantidad]

Si no hubo confirmación:
"reporte": ""

---

# 🧩 REGLAS FINALES
- Explica bien en modo de uso
- Mensajes cortos, claros amigables y humanos
- No inventes nada
- Si el producto no está claro, pide aclaración
- Si hay objeción, responde con empatía + beneficio real + prueba social.`.trim()

function PromptTab({ bot, onSaved }: { bot: Bot; onSaved: (updated: Partial<Bot>) => void }) {
  const [form, setForm] = useState({
    systemPromptTemplate: bot.systemPromptTemplate ?? '',
    maxCharsMensaje1: bot.maxCharsMensaje1?.toString() ?? '',
    maxCharsMensaje2: bot.maxCharsMensaje2?.toString() ?? '',
    maxCharsMensaje3: bot.maxCharsMensaje3?.toString() ?? '',
  })
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(null)

  // Al cargar una plantilla, reemplazamos el nombre de ejemplo "RUBEN" (o "[Ruben]")
  // por el nombre real de ESTE agente, para que quede lista y personalizada.
  const fillBotName = (text: string) =>
    text.replace(/\[?ruben\]?/gi, () => bot.name || 'tu asistente')

  // Carga una plantilla en el cuadro (pidiendo confirmación si ya hay texto).
  const loadTemplate = (text: string) => {
    if (!form.systemPromptTemplate.trim() || confirm('Esto reemplazará tu prompt actual. ¿Continuar?')) {
      setForm(f => ({ ...f, systemPromptTemplate: fillBotName(text) }))
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMsg(null)
    try {
      const res = await fetch(`/api/bots/${bot.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemPromptTemplate: form.systemPromptTemplate,
          maxCharsMensaje1: form.maxCharsMensaje1 ? parseInt(form.maxCharsMensaje1) : null,
          maxCharsMensaje2: form.maxCharsMensaje2 ? parseInt(form.maxCharsMensaje2) : null,
          maxCharsMensaje3: form.maxCharsMensaje3 ? parseInt(form.maxCharsMensaje3) : null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setMsg({ type: 'success', text: 'Plantilla guardada correctamente' })
      onSaved(data.bot)
    } catch (err: unknown) {
      setMsg({ type: 'error', text: err instanceof Error ? err.message : 'Error guardando' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
    <form onSubmit={handleSave} className="space-y-6">
      <div className="dm-card-dark p-6 rounded-2xl space-y-5">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <FileText className="w-4 h-4 text-[#7DD3FC]" />
          Prompt del vendedor
        </h3>

        {msg && <Alert type={msg.type} msg={msg.text} />}

        <div>
          <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
            <label className="block text-xs font-medium text-white/75">
              Instrucciones del vendedor (system prompt)
            </label>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-white/40 hidden sm:inline">Cargar plantilla:</span>
              <button
                type="button"
                onClick={() => loadTemplate(EXAMPLE_PROMPT)}
                className="text-[10px] px-2.5 py-1 rounded-lg bg-[#233B8F]/15 border border-[#233B8F]/35 text-[#9DB4FF] hover:bg-[#233B8F]/25 transition-colors font-medium"
              >
                Básica
              </button>
              <button
                type="button"
                onClick={() => loadTemplate(EXAMPLE_PROMPT_PRO)}
                className="text-[10px] px-2.5 py-1 rounded-lg bg-[#147e95]/15 border border-[#147e95]/35 text-[#C9A7FF] hover:bg-[#147e95]/25 transition-colors font-medium"
              >
                Completa (Pro)
              </button>
            </div>
          </div>
          <textarea
            value={form.systemPromptTemplate}
            onChange={e => setForm(f => ({ ...f, systemPromptTemplate: e.target.value }))}
            rows={12}
            placeholder={`Escribe aquí las instrucciones de tu vendedor.\n\nEjemplo:\n- Su nombre, estilo de comunicación y tono\n- Cómo identificar el problema del cliente\n- Cómo presentar y cerrar la venta\n- Reglas de negocio especiales\n\nUsa el botón "Cargar plantilla de ejemplo" para ver una plantilla lista.`}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-dark-500 focus:outline-none focus:border-[#233B8F]/40 font-mono resize-y min-h-[200px]"
          />
          <p className="text-xs text-white/40 mt-1">
            Estas instrucciones se combinan con las reglas del bot y la base de conocimiento de productos.
          </p>
        </div>

        {/* Char limits */}
        <div>
          <label className="block text-xs font-medium text-white/75 mb-3">
            Límite de caracteres por mensaje (opcional)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(['maxCharsMensaje1', 'maxCharsMensaje2', 'maxCharsMensaje3'] as const).map((field, i) => (
              <div key={field}>
                <label className="block text-[10px] text-white/50 mb-1">Mensaje {i + 1}</label>
                <input
                  type="number"
                  value={form[field]}
                  onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                  placeholder="Sin límite"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-dark-500 focus:outline-none focus:border-[#233B8F]/40"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Strict JSON badge */}
        <div className="flex items-center gap-3 bg-[#16A34A]/5 border border-[#16A34A]/20 rounded-xl px-4 py-3">
          <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0" />
          <div>
            <div className="text-xs font-bold text-[#16A34A]">strictJsonOutput: ACTIVO</div>
            <div className="text-xs text-white/50">
              El bot siempre devuelve JSON válido con el schema requerido.
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-gradient-to-r from-[#1fb8bb] via-[#147e95] to-[#233B8F] text-white font-bold rounded-xl hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
        >
          {loading ? <Spinner /> : <Save className="w-4 h-4" />}
          Guardar plantilla
        </button>
      </div>
    </form>

      {/* Nota de voz (TTS) — vive en la pestaña Plantilla */}
      <VoiceCard bot={bot} />
    </div>
  )
}

// ─── Product Form ─────────────────────────────────────────────────────────────

const EMPTY_PRODUCT = {
  name: '',
  category: '',
  benefits: '',
  usage: '',
  warnings: '',
  priceUnit: '',
  pricePromo2: '',
  currency: 'USD',
  welcomeMessage: '',
  firstMessage: '',
  hooks: '',
  // Imágenes del producto (galería dinámica; la primera es la portada)
  images: [] as string[],
  // Videos del producto (galería dinámica)
  videos: [] as string[],
  // Media de seguimiento — imágenes y videos, cada uno con su texto opcional:
  fuImages: [] as Array<{ url: string; text: string }>,   // imágenes de seguimiento (+ texto)
  fuVideos: [] as Array<{ url: string; text: string }>,   // videos de seguimiento (+ texto)
  // Testimonios: fotos y videos (galerías dinámicas con etiqueta por ítem)
  testimonialPhotos: [] as Array<{ label: string; url: string }>,
  testimonialVideos: [] as Array<{ label: string; url: string }>,
  shippingInfo: '',
  coverage: '',
  active: true,
}

type ProductFormState = typeof EMPTY_PRODUCT

/** Normaliza testimonialsVideoUrls en dos arrays independientes: fotos y videos (7 cada uno). */
function parseProductTestimonials(p: Product): {
  photos: Array<{ label: string; url: string }>
  videos: Array<{ label: string; url: string }>
} {
  const photos: Array<{ label: string; url: string }> = []
  const videos: Array<{ label: string; url: string }> = []

  for (const item of (Array.isArray(p.testimonialsVideoUrls) ? p.testimonialsVideoUrls : [])) {
    if (typeof item === 'object' && item !== null && (item as { url?: string }).url) {
      const obj = item as { url: string; label?: string; type?: string }
      if (obj.type === 'video') videos.push({ url: obj.url, label: obj.label ?? '' })
      else photos.push({ url: obj.url, label: obj.label ?? '' })
    } else if (typeof item === 'string' && item.startsWith('http')) {
      photos.push({ url: item, label: '' })
    }
  }

  return { photos, videos }
}

function productToForm(p: Product): ProductFormState {
  const { photos, videos } = parseProductTestimonials(p)
  return {
    name: p.name,
    category: p.category ?? '',
    benefits: p.benefits ?? '',
    usage: p.usage ?? '',
    warnings: p.warnings ?? '',
    priceUnit: p.priceUnit ?? '',
    pricePromo2: p.pricePromo2 ?? '',
    currency: p.currency ?? 'USD',
    welcomeMessage: p.welcomeMessage ?? '',
    firstMessage: p.firstMessage ?? '',
    hooks: Array.isArray(p.hooks) ? p.hooks.join('\n') : '',
    images: Array.isArray(p.imageMainUrls) ? p.imageMainUrls.filter(Boolean) : [],
    videos: Array.isArray((p as any).productVideoUrls) ? ((p as any).productVideoUrls as string[]).filter(Boolean) : [],
    // Media de seguimiento: separamos la lista guardada en los 3 espacios.
    ...(() => {
      let all = Array.isArray((p as any).followUpMedia)
        ? ((p as any).followUpMedia as Array<{ url?: string; type?: string; text?: string }>)
            .filter(m => m && typeof m.url === 'string' && m.url)
        : []
      if (all.length === 0 && p.followUpMediaUrl) {
        all = [{ url: p.followUpMediaUrl, type: p.followUpMediaType || 'image' }]
      }
      return {
        fuImages: all.filter(m => m.type !== 'video').map(m => ({ url: m.url as string, text: m.text || '' })),
        fuVideos: all.filter(m => m.type === 'video').map(m => ({ url: m.url as string, text: m.text || '' })),
      }
    })(),
    testimonialPhotos: photos,
    testimonialVideos: videos,
    shippingInfo: p.shippingInfo ?? '',
    coverage: p.coverage ?? '',
    active: p.active,
  }
}

function formToPayload(f: ProductFormState, existingProduct?: Product | null) {
  // Aplanar fotos y videos de testimonios en el array final (fotos primero).
  const testimonialsVideoUrls: Array<{ label: string, url: string, type?: string }> = []
  for (const t of f.testimonialPhotos) {
    if (t.url.trim()) testimonialsVideoUrls.push({ label: (t.label || '').trim(), url: t.url.trim() })
  }
  for (const t of f.testimonialVideos) {
    if (t.url.trim()) testimonialsVideoUrls.push({ label: (t.label || '').trim(), url: t.url.trim(), type: 'video' })
  }

  const productVideoUrls = f.videos.map(s => s.trim()).filter(Boolean)

  return {
    name: f.name.trim(),
    category: f.category.trim() || null,
    benefits: f.benefits.trim() || null,
    usage: f.usage.trim() || null,
    warnings: f.warnings.trim() || null,
    priceUnit: f.priceUnit ? parseFloat(f.priceUnit) : null,
    pricePromo2: f.pricePromo2 ? parseFloat(f.pricePromo2) : null,
    priceSuper6: null,
    currency: f.currency || 'USD',
    welcomeMessage: f.welcomeMessage.trim() || null,
    firstMessage: f.firstMessage.trim() || null,
    hooks: f.hooks.split('\n').map((s: string) => s.trim()).filter(Boolean),
    imageMainUrls: f.images.map((s: string) => s.trim()).filter(Boolean),
    productVideoUrls, // Added productVideoUrls explicitly back in
    // Media de seguimiento: unimos imágenes y videos (cada uno con su texto) en
    // una sola lista [{url,type,text?}].
    followUpMedia: [
      ...f.fuImages.filter(m => m.url).map(m => ({ url: m.url, type: 'image', ...((m.text || '').trim() ? { text: m.text.trim() } : {}) })),
      ...f.fuVideos.filter(m => m.url).map(m => ({ url: m.url, type: 'video', ...((m.text || '').trim() ? { text: m.text.trim() } : {}) })),
    ],
    // Compat legacy: primera media.
    followUpMediaUrl: (f.fuImages[0]?.url || f.fuVideos[0]?.url) || null,
    followUpMediaType: f.fuImages[0] ? 'image' : (f.fuVideos[0] ? 'video' : null),
    // Preservar URLs de precios si ya existían para evitar pérdida de datos heredados
    imagePriceUnitUrl: existingProduct?.imagePriceUnitUrl || null,
    imagePricePromoUrl: existingProduct?.imagePricePromoUrl || null,
    imagePriceSuperUrl: existingProduct?.imagePriceSuperUrl || null,
    testimonialsVideoUrls,
    shippingInfo: f.shippingInfo.trim() || null,
    coverage: f.coverage.trim() || null,
    tags: existingProduct?.tags || [],
    active: f.active,
  }
}

type MediaItem = { url: string; label?: string; type?: string }

/**
 * Galería compacta y reutilizable para TODOS los espacios de media del producto
 * (imágenes, videos, fotos/videos de testimonio y seguimiento). Miniaturas
 * chicas en grilla; se AGREGA con el botón + (admite varias a la vez) y se
 * QUITA con la ✕ al pasar el mouse, con reordenamiento automático.
 *  - type: 'image' | 'video'  (define el selector de archivo y la miniatura)
 *  - labeled: muestra un input de etiqueta debajo de cada miniatura (testimonios)
 *  - showCover: marca la primera como "Portada" (imágenes principales)
 */
function MediaGallery({
  items,
  onChange,
  type,
  max = 12,
  labeled = false,
  labelPlaceholder = 'Etiqueta',
  showCover = false,
  addText = 'Agregar',
  accent = '#147e95',
  mixed = false,
}: {
  items: MediaItem[]
  onChange: (next: MediaItem[]) => void
  type: 'image' | 'video'
  max?: number
  labeled?: boolean
  labelPlaceholder?: string
  showCover?: boolean
  addText?: string
  accent?: string
  mixed?: boolean   // permite mezclar imágenes y videos; muestra un toggle para elegir qué agregar
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [addType, setAddType] = useState<'image' | 'video'>('image')  // solo en modo mixed
  const [playingIdx, setPlayingIdx] = useState<number | null>(null)  // video que se reproduce en su lugar

  const canAdd = items.length < max
  const curType = mixed ? addType : type
  const accept = curType === 'image'
    ? 'image/jpeg,image/png,image/webp,image/heic'
    : 'video/mp4,video/quicktime,video/3gpp'
  const itemType = (it: MediaItem): 'image' | 'video' =>
    mixed ? (it.type === 'video' ? 'video' : 'image') : type

  async function handleFiles(files: FileList) {
    setError('')
    setUploading(true)
    try {
      const free = Math.max(0, max - items.length)
      const picked = Array.from(files).slice(0, free)
      const added: MediaItem[] = []
      for (const file of picked) {
        const fd = new FormData()
        fd.append('file', file)
        const res = await fetch('/api/upload', { method: 'POST', body: fd })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Error al subir')
        added.push({ url: data.url, label: '', ...(mixed ? { type: addType } : {}) })
      }
      if (added.length) onChange([...items, ...added])
    } catch (e: any) {
      setError(e?.message || 'Error al subir')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const remove = (idx: number) => onChange(items.filter((_, i) => i !== idx))
  const setLabel = (idx: number, label: string) =>
    onChange(items.map((it, i) => (i === idx ? { ...it, label } : it)))

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple
        className="hidden"
        onChange={e => e.target.files?.length && handleFiles(e.target.files)}
      />
      {mixed && (
        <div className="inline-flex gap-1 p-1 rounded-xl bg-white/5 border border-white/10 mb-3">
          {(['image', 'video'] as const).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setAddType(t)}
              className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors ${addType === t ? 'bg-[#147e95] text-white' : 'text-white/60 hover:text-white'}`}
            >
              {t === 'image' ? '📷 Imagen' : '🎬 Video'}
            </button>
          ))}
        </div>
      )}
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2.5 items-start">
        {items.map((it, idx) => (
          <div key={`${it.url}-${idx}`} className="flex flex-col gap-1.5">
            <div
              className={`relative group aspect-square rounded-xl overflow-hidden border border-white/10 bg-white/5 ${itemType(it) === 'video' && playingIdx !== idx ? 'cursor-pointer' : ''}`}
              onClick={() => { if (itemType(it) === 'video' && playingIdx !== idx) setPlayingIdx(idx) }}
              title={itemType(it) === 'video' && playingIdx !== idx ? 'Reproducir' : undefined}
            >
              {itemType(it) === 'image' ? (
                <img src={it.url} alt="" className="w-full h-full object-cover" />
              ) : playingIdx === idx ? (
                // Reproduce EN SU LUGAR (mismo cuadrito), con controles.
                <video src={it.url} controls autoPlay playsInline className="w-full h-full object-contain bg-black" />
              ) : (
                <>
                  <video src={`${it.url}#t=0.1`} muted playsInline preload="metadata" className="w-full h-full object-cover pointer-events-none" />
                  <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="w-9 h-9 rounded-full bg-black/55 group-hover:bg-black/70 flex items-center justify-center transition-colors">
                      <svg viewBox="0 0 24 24" className="w-4 h-4 text-white ml-0.5" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                    </span>
                  </span>
                </>
              )}
              {showCover && idx === 0 && (
                <span className="absolute top-1 left-1 text-[8px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-md bg-black/55 text-white backdrop-blur-sm">
                  Portada
                </span>
              )}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); remove(idx) }}
                title="Quitar"
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/55 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 z-10"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            {labeled && (
              <input
                value={it.label ?? ''}
                onChange={e => setLabel(idx, e.target.value)}
                placeholder={labelPlaceholder}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-[11px] text-white outline-none focus:border-white/25 placeholder:text-white/30"
              />
            )}
          </div>
        ))}
        {canAdd && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="aspect-square rounded-xl border border-dashed flex flex-col items-center justify-center gap-1 transition-colors disabled:opacity-50 hover:brightness-125"
            style={{ borderColor: `${accent}66`, color: accent }}
          >
            {uploading ? <Spinner /> : <><Plus className="w-5 h-5" /><span className="text-[10px] font-semibold">{addText}</span></>}
          </button>
        )}
      </div>
      {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
    </div>
  )
}

function ProductForm({
  botId,
  product,
  onSaved,
  onCancel,
}: {
  botId: string
  product: Product | null
  onSaved: () => void
  onCancel: () => void
}) {
  const [form, setForm] = useState<ProductFormState>(
    product ? productToForm(product) : EMPTY_PRODUCT,
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const setField = (key: keyof ProductFormState, value: string | boolean) =>
    setForm(f => ({ ...f, [key]: value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const payload = formToPayload(form, product)
      const url = product
        ? `/api/products/${product.id}`
        : `/api/products`
      const method = product ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const raw = await res.text()
      let data: { error?: string; product?: { id?: string } } = {}
      try { data = raw ? JSON.parse(raw) : {} } catch { /* el servidor devolvió HTML/no-JSON (500/502/504) */ }
      if (!res.ok) throw new Error(data.error || `Error del servidor (${res.status}). Reintenta en unos segundos.`)
      // If creating a new product, also assign it to this bot
      if (!product && data.product?.id && botId) {
        await fetch(`/api/bots/${botId}/products`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId: data.product.id }),
        })
      }
      onSaved()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  const inputClass =
    'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-dark-500 focus:outline-none focus:border-[#16A34A]/40 transition-colors'
  const textareaClass = `${inputClass} resize-y`
  const labelClass = 'block text-xs font-medium text-white/75 mb-1.5'
  const sectionClass = 'dm-card-dark p-5 rounded-2xl space-y-4'
  const sectionHeaderClass = 'flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider'

  return (
    <form
      onSubmit={handleSubmit}
      className="dm-card-dark p-5 rounded-2xl space-y-5"
      // Fondo del card GRANDE más suave (menos oscuro y con glow tenue). Los
      // sub-cards internos siguen usando dm-card-dark, así se despegan del fondo.
      style={{ background: 'linear-gradient(135deg, #333F58 0%, #38455F 100%)' }}
    >
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-white flex items-center gap-2">
          <Package className="w-4 h-4 text-[#147e95]" />
          {product ? 'Editar producto' : 'Nuevo producto'}
        </h3>
        <button type="button" onClick={onCancel} className="text-white/50 hover:text-white transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      {error && <Alert type="error" msg={error} />}

      {/* Basic info */}
      <div className={sectionClass}>
        <div className={sectionHeaderClass}><span className="w-1 h-3.5 bg-[#147e95]/70 rounded-full" />Información básica</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Nombre del producto *</label>
            <input
              required
              value={form.name}
              onChange={e => setField('name', e.target.value)}
              placeholder="ej: Gel de Aloe Vera"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Categoría</label>
            <select
              value={form.category}
              onChange={e => setField('category', e.target.value)}
              className={`${inputClass} appearance-none bg-white/5`}
            >
              <option value="">Selecciona una categoría...</option>
              <option value="Salud y Bienestar">Salud y Bienestar</option>
              <option value="Belleza y Cuidado Personal">Belleza y Cuidado Personal</option>
              <option value="Electrónica y Gadgets">Electrónica y Gadgets</option>
              <option value="Hogar y Cocina">Hogar y Cocina</option>
              <option value="Deportes y Fitness">Deportes y Fitness</option>
              <option value="Moda y Accesorios">Moda y Accesorios</option>
              <option value="Juguetes y Bebés">Juguetes y Bebés</option>
              <option value="Mascotas">Mascotas</option>
              <option value="Herramientas y Automotriz">Herramientas y Automotriz</option>
              <option value="Otros">Otros</option>
            </select>
          </div>
        </div>
        <div>
          <label className={labelClass}>Primer mensaje del producto identificado</label>
          <textarea
            rows={3}
            value={form.firstMessage}
            onChange={e => setField('firstMessage', e.target.value)}
            placeholder="Hola {nombre}! Te presento nuestro increíble producto..."
            className={textareaClass}
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setField('active', !form.active)}
            className="flex items-center gap-2 text-sm"
          >
            {form.active ? (
              <ToggleRight className="w-7 h-7 text-[#16A34A]" />
            ) : (
              <ToggleLeft className="w-7 h-7 text-white/40" />
            )}
            <span className={form.active ? 'text-[#16A34A] font-medium' : 'text-white/50'}>
              {form.active ? 'Producto activo' : 'Producto inactivo'}
            </span>
          </button>
        </div>
      </div>

      {/* Details */}
      <div className={sectionClass}>
        <div className={sectionHeaderClass}><span className="w-1 h-3.5 bg-[#233B8F]/70 rounded-full" />Descripción</div>
        <div>
          <label className={labelClass}>Beneficios</label>
          <textarea
            rows={3}
            value={form.benefits}
            onChange={e => setField('benefits', e.target.value)}
            placeholder="te ayuda en..."
            className={textareaClass}
          />
        </div>
        <div>
          <label className={labelClass}>Modo de uso</label>
          <textarea
            rows={2}
            value={form.usage}
            onChange={e => setField('usage', e.target.value)}
            placeholder="Aplicar 1 veces al día en área limpia..."
            className={textareaClass}
          />
        </div>
        <div>
          <label className={labelClass}>Advertencias / contraindicaciones</label>
          <textarea
            rows={2}
            value={form.warnings}
            onChange={e => setField('warnings', e.target.value)}
            placeholder="No aplicar en heridas abiertas..."
            className={textareaClass}
          />
        </div>
      </div>

      {/* Prices */}
      <div className={sectionClass}>
        <div className={sectionHeaderClass}><span className="w-1 h-3.5 bg-[#147e95]/70 rounded-full" />Precios</div>
        <div>
          <label className={labelClass}>Moneda</label>
          <select
            value={form.currency}
            onChange={e => setField('currency', e.target.value)}
            className={inputClass}
          >
            <option value="USD">$ Dólar estadounidense (USD)</option>
            <option value="EUR">€ Euro (EUR)</option>
            <option value="BOB">Bs. Boliviano boliviano (BOB)</option>
            <option value="PEN">S/ Sol peruano (PEN)</option>
            <option value="COP">$ Peso colombiano (COP)</option>
            <option value="ARS">$ Peso argentino (ARS)</option>
            <option value="MXN">$ Peso mexicano (MXN)</option>
            <option value="CLP">$ Peso chileno (CLP)</option>
            <option value="GTQ">Q Quetzal guatemalteco (GTQ)</option>
            <option value="HNL">L Lempira hondureño (HNL)</option>
            <option value="NIO">C$ Córdoba nicaragüense (NIO)</option>
            <option value="CRC">₡ Colón costarricense (CRC)</option>
            <option value="PAB">B/. Balboa panameño (PAB)</option>
            <option value="DOP">RD$ Peso dominicano (DOP)</option>
            <option value="UYU">$ Peso uruguayo (UYU)</option>
            <option value="PYG">₲ Guaraní paraguayo (PYG)</option>
            <option value="BRL">R$ Real brasileño (BRL)</option>
            <option value="VES">Bs.S Bolívar venezolano (VES)</option>
            <option value="CUP">$ Peso cubano (CUP)</option>
          </select>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Precio</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.priceUnit}
              onChange={e => setField('priceUnit', e.target.value)}
              placeholder="25.00"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Precio de oferta</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.pricePromo2}
              onChange={e => setField('pricePromo2', e.target.value)}
              placeholder="45.00"
              className={inputClass}
            />
          </div>
        </div>
      </div>

      {/* Images Section */}
      <div className={sectionClass}>
        <div>
          <div className={`${sectionHeaderClass} mb-1`}><span className="w-1 h-3.5 bg-[#147e95]/70 rounded-full" />Imágenes del producto</div>
          <p className="text-xs text-white/40 mb-3">Subí las fotos del producto. La primera es la portada. Podés agregar o quitar las que quieras.</p>
          <MediaGallery
            type="image"
            showCover
            max={12}
            addText="Agregar"
            items={form.images.map(url => ({ url }))}
            onChange={next => setForm(f => ({ ...f, images: next.map(i => i.url) }))}
          />
        </div>

        <div className="pt-4 border-t border-white/10">
          <div className={`${sectionHeaderClass} mb-1`}><span className="w-1 h-3.5 bg-[#233B8F]/70 rounded-full" />Videos del producto</div>
          <p className="text-xs text-white/40 mb-3">El agente enviará estos videos si el cliente quiere ver el producto en acción. Máximo 90 segundos.</p>
          <MediaGallery
            type="video"
            max={6}
            addText="Agregar"
            accent="#233B8F"
            items={form.videos.map(url => ({ url }))}
            onChange={next => setForm(f => ({ ...f, videos: next.map(i => i.url) }))}
          />
        </div>
      </div>

      {/* Media de seguimiento — 3 espacios separados */}
      <div className={sectionClass}>
        <div className={`${sectionHeaderClass} mb-1`}>
          <span className="w-1 h-3.5 bg-[#147e95]/70 rounded-full" />
          Media de seguimiento
          <span className="text-[10px] bg-[#147e95]/20 text-[#147e95] px-2 py-0.5 rounded border border-[#147e95]/30 normal-case font-normal">NUEVO</span>
        </div>
        <p className="text-xs text-white/40 mb-4">
          Opcional. Si el cliente consultó este producto y no concretó la compra, el agente adjuntará esto en el mensaje de seguimiento automático.
        </p>

        {/* Espacio 1: imágenes de seguimiento (cada una con su texto) */}
        <div className="pt-1">
          <div className="text-[11px] font-bold text-white/80 uppercase tracking-wide mb-1 flex items-center gap-1.5">📷 Imágenes de seguimiento</div>
          <p className="text-[11px] text-white/40 mb-2">El agente envía cada imagen junto con el texto que escribas debajo (opcional).</p>
          <MediaGallery
            type="image"
            labeled
            max={6}
            addText="Agregar"
            labelPlaceholder="Texto que acompaña…"
            items={form.fuImages.map(m => ({ url: m.url, label: m.text }))}
            onChange={next => setForm(f => ({ ...f, fuImages: next.map(i => ({ url: i.url, text: i.label ?? '' })) }))}
          />
        </div>

        {/* Espacio 2: videos de seguimiento (cada uno con su texto) */}
        <div className="pt-4 border-t border-white/10">
          <div className="text-[11px] font-bold text-white/80 uppercase tracking-wide mb-1 flex items-center gap-1.5">🎬 Videos de seguimiento</div>
          <p className="text-[11px] text-white/40 mb-2">El agente envía cada video junto con el texto que escribas debajo (opcional).</p>
          <MediaGallery
            type="video"
            labeled
            max={6}
            addText="Agregar"
            accent="#233B8F"
            labelPlaceholder="Texto que acompaña…"
            items={form.fuVideos.map(m => ({ url: m.url, label: m.text }))}
            onChange={next => setForm(f => ({ ...f, fuVideos: next.map(i => ({ url: i.url, text: i.label ?? '' })) }))}
          />
        </div>
      </div>

      {/* Testimonial Images */}
      <div className={sectionClass}>
        <div className={`${sectionHeaderClass} mb-1`}>
          <span className="w-1 h-3.5 bg-[#233B8F]/70 rounded-full" />
          Fotos de testimonios
          <span className="text-[10px] normal-case font-normal text-white/50">(el agente las envía ante dudas)</span>
        </div>
        <p className="text-xs text-white/40 mb-3">Fotos de resultados o reseñas. Poné una etiqueta a cada una para que el agente sepa cuándo usarla.</p>
        <MediaGallery
          type="image"
          max={12}
          addText="Agregar"
          accent="#233B8F"
          labeled
          labelPlaceholder="Etiqueta (ej: manchas)"
          items={form.testimonialPhotos}
          onChange={next => setForm(f => ({ ...f, testimonialPhotos: next.map(i => ({ label: i.label ?? '', url: i.url })) }))}
        />
      </div>

      {/* Testimonial Videos */}
      <div className={sectionClass}>
        <div className={`${sectionHeaderClass} mb-1`}>
          <span className="w-1 h-3.5 bg-[#147e95]/70 rounded-full" />
          Videos de testimonios
          <span className="text-[10px] bg-[#147e95]/20 text-[#147e95] px-2 py-0.5 rounded border border-[#147e95]/30 normal-case font-normal">NUEVO</span>
        </div>
        <p className="text-xs text-white/40 mb-3">El agente enviará estos videos cuando el cliente necesite mayor confianza. Máximo 90 segundos por video.</p>
        <MediaGallery
          type="video"
          max={12}
          addText="Agregar"
          labeled
          labelPlaceholder="Etiqueta (ej: resultado)"
          items={form.testimonialVideos}
          onChange={next => setForm(f => ({ ...f, testimonialVideos: next.map(i => ({ label: i.label ?? '', url: i.url })) }))}
        />
      </div>


      {/* Buttons */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-3 bg-white/5 border border-white/10 text-white/75 font-medium rounded-xl hover:bg-dark-700 transition-colors text-sm"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 py-3 bg-gradient-to-r from-[#1fb8bb] via-[#147e95] to-[#233B8F] text-white font-bold rounded-xl hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors text-sm"
        >
          {loading ? <Spinner /> : <Save className="w-4 h-4" />}
          {product ? 'Actualizar' : 'Crear producto'}
        </button>
      </div>
    </form>
  )
}

// ─── Products Tab ─────────────────────────────────────────────────────────────

// ─── Share Product Modal ──────────────────────────────────────────────────────

function ShareProductModal({ product, onClose }: { product: Product; onClose: () => void }) {
  const [identifier, setIdentifier] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)

  async function handleShare(e: React.FormEvent) {
    e.preventDefault()
    if (!identifier.trim()) return
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch(`/api/products/${product.id}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifier.trim() }),
      })
      const data = await res.json()
      setResult({ ok: res.ok, message: data.message || data.error || 'Error desconocido' })
      if (res.ok) setIdentifier('')
    } catch {
      setResult({ ok: false, message: 'Error de conexión' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(15,23,42,0.10)' }}>
      <div className="dm-card-dark rounded-2xl border border-white/10 p-6 w-full max-w-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Share2 className="w-4 h-4 text-[#7DD3FC]" />
            <h3 className="font-bold text-white text-sm">Compartir producto</h3>
          </div>
          <button onClick={onClose} className="text-white/50 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="text-xs text-white/50 bg-white/5 rounded-xl p-3 border border-white/10">
          <p className="font-semibold text-white mb-1">📋 {product.name}</p>
          El destinatario recibirá una <span className="text-[#16A34A]">copia independiente</span> del producto.
          Podrá editarla libremente sin afectar el tuyo.
        </div>

        <form onSubmit={handleShare} className="space-y-3">
          <div>
            <label className="text-xs text-white/50 mb-1 block">Username o email del destinatario</label>
            <input
              type="text"
              value={identifier}
              onChange={e => setIdentifier(e.target.value)}
              placeholder="@usuario o correo@email.com"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-[#233B8F]/40"
              disabled={loading}
            />
          </div>

          {result && (
            <div className={`text-xs rounded-lg px-3 py-2 ${result.ok ? 'bg-[#16A34A]/10 text-[#16A34A] border border-[#16A34A]/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
              {result.ok ? '✓ ' : '✕ '}{result.message}
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-xl border border-white/10 text-white/50 hover:text-white text-sm transition-colors"
            >
              Cerrar
            </button>
            <button
              type="submit"
              disabled={loading || !identifier.trim()}
              className="flex-1 py-2 rounded-xl bg-[#233B8F]/20 text-[#7DD3FC] border border-[#233B8F]/30 hover:bg-[#233B8F]/30 text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserCheck className="w-3.5 h-3.5" />}
              Compartir
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ProductsTab({ bot }: { bot: Bot }) {
  const [assigned, setAssigned] = useState<Product[]>([])
  const [available, setAvailable] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [actioning, setActioning] = useState<string | null>(null)
  const [sharingProduct, setSharingProduct] = useState<Product | null>(null)

  const loadProducts = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/bots/${bot.id}/products`)
      if (res.ok) {
        const data = await res.json()
        setAssigned(data.assigned ?? [])
        setAvailable(data.available ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [bot.id])

  useEffect(() => { loadProducts() }, [loadProducts])

  async function handleDeleteProduct(productId: string) {
    if (!confirm('¿Eliminar este producto permanentemente? Se quitará de todos los agentes y no se puede deshacer.')) return
    setActioning(productId)
    try {
      await fetch(`/api/products/${productId}`, { method: 'DELETE' })
      setAssigned(ps => ps.filter(p => p.id !== productId))
      setAvailable(ps => ps.filter(p => p.id !== productId))
    } finally {
      setActioning(null)
    }
  }

  async function handleUnassign(productId: string) {
    if (!confirm('¿Quitar este producto del bot?')) return
    setActioning(productId)
    try {
      await fetch(`/api/bots/${bot.id}/products/${productId}`, { method: 'DELETE' })
      setAssigned(ps => ps.filter(p => p.id !== productId))
      setAvailable(prev => {
        const removed = assigned.find(p => p.id === productId)
        return removed ? [...prev, removed] : prev
      })
    } finally {
      setActioning(null)
    }
  }

  async function handleAssign(product: Product) {
    setActioning(product.id)
    try {
      const res = await fetch(`/api/bots/${bot.id}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.id }),
      })
      if (res.ok) {
        setAvailable(ps => ps.filter(p => p.id !== product.id))
        setAssigned(prev => [...prev, product])
      }
    } finally {
      setActioning(null)
    }
  }

  function handleEdit(product: Product) {
    setEditingProduct(product)
    setShowForm(true)
  }

  function handleFormClose() {
    setShowForm(false)
    setEditingProduct(null)
  }

  function handleFormSaved() {
    handleFormClose()
    loadProducts()
  }

  if (showForm) {
    return (
      <ProductForm
        botId={bot.id}
        product={editingProduct}
        onSaved={handleFormSaved}
        onCancel={handleFormClose}
      />
    )
  }

  return (
    <div className="space-y-5">
      {sharingProduct && (
        <ShareProductModal product={sharingProduct} onClose={() => setSharingProduct(null)} />
      )}
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-[#6B7280]">
          {assigned.length} asignado{assigned.length !== 1 ? 's' : ''} · {available.length} disponible{available.length !== 1 ? 's' : ''} en catálogo
        </div>
        <button
          onClick={() => { setEditingProduct(null); setShowForm(true) }}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#1fb8bb] via-[#147e95] to-[#233B8F] text-white font-bold rounded-xl text-sm hover:opacity-90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nuevo producto
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-[#9CA3AF]" />
        </div>
      ) : (
        <>
          {/* Assigned products */}
          <div>
            <div className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-2">
              Asignados a este bot
            </div>
            {assigned.length === 0 ? (
              <div className="dm-card-dark p-8 rounded-2xl text-center">
                <ShoppingBag className="w-8 h-8 text-dark-600 mx-auto mb-2" />
                <div className="text-white/50 text-sm">Sin productos asignados</div>
                <div className="text-white/40 text-xs mt-1">Crea un nuevo producto o asigna uno del catálogo.</div>
              </div>
            ) : (
              <div className="space-y-2">
                {assigned.map(product => (
                  <div
                    key={product.id}
                    className="dm-card-dark p-4 rounded-xl flex items-center gap-4 group hover:bg-white/5 transition-colors"
                  >
                    <div className={`w-2 h-2 rounded-full shrink-0 ${product.active ? 'bg-[#16A34A] shadow-[0_0_6px_rgba(0,255,157,0.5)]' : 'bg-dark-600'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-white text-sm truncate">{product.name}</div>
                      <div className="text-xs text-white/50 mt-0.5 flex items-center gap-2 flex-wrap">
                        {product.category && <span>{product.category}</span>}
                        {product.priceUnit && <span>{product.currency ?? 'USD'} {product.priceUnit}</span>}
                        {product.pricePromo2 && <span className="text-orange-400">{product.currency ?? 'USD'} {product.pricePromo2} <span className="text-[10px] text-orange-400/60">oferta</span></span>}
                        {Array.isArray(product.imageMainUrls) && product.imageMainUrls.length > 0 && <span>{product.imageMainUrls.length} img</span>}
                        {!product.active && <span className="text-dark-600 italic">inactivo</span>}
                        {product.sharedByUsername && (
                          <span className="flex items-center gap-1 text-[#7DD3FC]/70">
                            <Share2 className="w-2.5 h-2.5" />
                            de @{product.sharedByUsername}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setSharingProduct(product)}
                        className="p-2 hover:bg-[#233B8F]/10 rounded-lg transition-colors text-white/50 hover:text-[#7DD3FC]"
                        title="Compartir con otro usuario"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleEdit(product)}
                        className="p-2 hover:bg-white/5 rounded-lg transition-colors text-white/50 hover:text-white"
                        title="Editar"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleUnassign(product.id)}
                        disabled={actioning === product.id}
                        className="p-2 hover:bg-yellow-500/10 rounded-lg transition-colors text-white/50 hover:text-yellow-400 disabled:opacity-50"
                        title="Quitar del agente"
                      >
                        {actioning === product.id ? <Spinner /> : <X className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(product.id)}
                        disabled={actioning === product.id}
                        className="p-2 hover:bg-red-500/10 rounded-lg transition-colors text-white/50 hover:text-red-400 disabled:opacity-50"
                        title="Eliminar producto permanentemente"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Available catalog products */}
          {available.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-2">
                Del catálogo — agregar a este bot
              </div>
              <div className="space-y-2">
                {available.map(product => (
                  <div
                    key={product.id}
                    className="dm-card-dark p-4 rounded-xl flex items-center gap-4 group hover:bg-white/5 transition-colors opacity-60 hover:opacity-100"
                  >
                    <div className={`w-2 h-2 rounded-full shrink-0 ${product.active ? 'bg-[#16A34A]/50' : 'bg-dark-600'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-white text-sm truncate">{product.name}</div>
                      <div className="text-xs text-white/50 mt-0.5 flex items-center gap-2 flex-wrap">
                        {product.category && <span>{product.category}</span>}
                        {product.priceUnit && <span>{product.currency ?? 'USD'} {product.priceUnit}</span>}
                        {product.pricePromo2 && <span className="text-orange-400">{product.currency ?? 'USD'} {product.pricePromo2} <span className="text-[10px] text-orange-400/60">oferta</span></span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleAssign(product)}
                        disabled={actioning === product.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#0a95a8]/10 text-[#0a95a8] hover:bg-[#0a95a8]/20 transition-colors disabled:opacity-50"
                      >
                        {actioning === product.id ? <Spinner /> : <Plus className="w-3 h-3" />}
                        Asignar
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(product.id)}
                        disabled={actioning === product.id}
                        className="p-2 hover:bg-red-500/10 rounded-lg transition-colors text-white/50 hover:text-red-400 disabled:opacity-50"
                        title="Eliminar producto permanentemente"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─── QR Tab (solo para bots BAILEYS) ─────────────────────────────────────────

type BaileysStatus = 'disconnected' | 'connecting' | 'qr_ready' | 'connected'

// ─── Follow-up Tab ────────────────────────────────────────────────────────────

function FollowUpTab({
  bot,
  onSaved,
}: {
  bot: Bot
  onSaved: (updated: Partial<Bot>) => void
}) {
  const [f1, setF1] = useState(bot.followUp1Delay)
  const [f2, setF2] = useState(bot.followUp2Delay)
  // Si el bot aún no tiene prompt de seguimiento propio, mostramos el de por
  // defecto ya cargado en el campo (así "aparece" y se guarda tal cual).
  const [fp, setFp] = useState(bot.followUpPrompt ?? DEFAULT_FOLLOWUP_PROMPT)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(false)
    try {
      const res = await fetch(`/api/bots/${bot.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          followUp1Delay: Number(f1),
          followUp2Delay: Number(f2),
          followUpPrompt: fp.trim() || null,
        }),
      })
      if (!res.ok) throw new Error('Error al guardar configuración')
      const data = await res.json()
      onSaved(data.bot)
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 transition-all">
      <div className="dm-card-dark p-6 rounded-2xl border border-white/10 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#147e95]/12 border border-[#147e95]/25 flex items-center justify-center">
            <Bell className="w-5 h-5 text-[#147e95]" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Configuración de Seguimientos</h3>
            <p className="text-sm text-white/50 mt-0.5">Define los intervalos para re-interactuar con clientes.</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-2">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-white/75 uppercase tracking-widest pl-1">
              1er Seguimiento
            </label>
            <div className="relative group">
              <input
                type="number"
                min="1"
                value={f1}
                onChange={e => setF1(Number(e.target.value))}
                className="w-full bg-white/5 border border-white/10 group-hover:border-white/10 focus:border-[#16A34A]/40 rounded-xl px-4 py-3 text-sm text-white transition-all outline-none"
                placeholder="Ej: 15"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] text-white/40 font-bold uppercase tracking-tighter">Minutos</span>
            </div>
            <p className="text-[10px] text-white/40 italic pl-1">Por defecto: 15 min.</p>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-white/75 uppercase tracking-widest pl-1">
              2do Seguimiento
            </label>
            <div className="relative group">
              <input
                type="number"
                min="1"
                value={f2}
                onChange={e => setF2(Number(e.target.value))}
                className="w-full bg-white/5 border border-white/10 group-hover:border-white/10 focus:border-[#16A34A]/40 rounded-xl px-4 py-3 text-sm text-white transition-all outline-none"
                placeholder="Ej: 4320"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] text-white/40 font-bold uppercase tracking-tighter">Minutos</span>
            </div>
            <p className="text-[10px] text-white/40 italic pl-1">Por defecto: 4320 min (3 días).</p>
          </div>

          <div className="md:col-span-2 space-y-2 pt-2 border-t border-white/10">
            <label className="text-[10px] font-bold text-white/75 uppercase tracking-widest pl-1 flex items-center gap-2">
              Prompt de seguimiento
              <span className="text-[9px] bg-[#147e95]/20 text-[#147e95] px-1.5 py-0.5 rounded border border-[#147e95]/30 normal-case font-normal tracking-normal">Opcional</span>
            </label>
            <textarea
              value={fp}
              onChange={e => setFp(e.target.value)}
              rows={4}
              className="w-full bg-white/5 border border-white/10 focus:border-[#147e95]/40 rounded-xl px-4 py-3 text-sm text-white transition-all outline-none resize-y placeholder:text-white/30"
              placeholder="Ej: Escribe con tono cercano y amable. Recuérdale que tenemos envío gratis esta semana y ofrécele resolver cualquier duda antes de decidir."
            />
            <p className="text-[10px] text-white/40 italic pl-1">
              Instrucciones para el agente sobre cómo redactar los mensajes de seguimiento. Si lo dejas vacío, usa el estilo cálido por defecto.
            </p>
          </div>

          <div className="md:col-span-2 flex items-center justify-between gap-4 pt-2">
            <div className="flex-1">
              {error && <Alert type="error" msg={error} />}
              {success && <Alert type="success" msg="¡Configuración guardada!" />}
            </div>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#1fb8bb] via-[#147e95] to-[#233B8F] text-white rounded-xl text-sm font-bold hover:opacity-90 transition-all disabled:opacity-50 shrink-0 shadow-lg shadow-[#16A34A]/10"
            >
              {saving ? <Spinner /> : <Check className="w-4 h-4" />}
              Guardar Cambios
            </button>
          </div>
        </form>
      </div>

      <div className="bg-[#147e95]/8 border border-[#147e95]/25 rounded-2xl p-4 flex gap-4">
        <div className="w-10 h-10 rounded-full bg-[#147e95]/15 flex items-center justify-center shrink-0">
          <Zap className="w-5 h-5 text-[#147e95]" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-[#111827]">¿Cómo funciona?</h4>
          <p className="text-xs text-[#4B5563] mt-1 leading-relaxed">
            El sistema calculará el tiempo desde el <strong className="text-[#111827]">último mensaje enviado por el bot</strong>.
            Si el cliente no responde en ese intervalo, el agente enviará un mensaje automático.
            Los seguimientos se detienen si el cliente compra o si vuelve a escribir.
          </p>
        </div>
      </div>
    </div>
  )
}

function QRTab({ bot }: { bot: Bot }) {
  const [status, setStatus] = useState<BaileysStatus>('disconnected')
  const [qrBase64, setQrBase64] = useState<string | undefined>()
  const [phone, setPhone] = useState<string | undefined>(bot.baileysPhone ?? undefined)
  const [connecting, setConnecting] = useState(false)
  const [clearingMemory, setClearingMemory] = useState(false)
  const [msg, setMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(null)

  // Polling: actualizar estado cada 3 segundos cuando no está 'connected'
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>
    async function poll() {
      try {
        const res = await fetch(`/api/bots/${bot.id}/baileys/status`)
        if (!res.ok) return
        const data = await res.json()
        setStatus(data.status)
        setQrBase64(data.qrBase64)
        if (data.phone) setPhone(data.phone)
      } catch { /* ignore */ }
    }
    poll()
    if (status !== 'connected') {
      interval = setInterval(poll, 3000)
    }
    return () => clearInterval(interval)
  }, [bot.id, status])

  async function handleConnect() {
    setConnecting(true)
    setMsg(null)
    try {
      const res = await fetch(`/api/bots/${bot.id}/baileys/connect`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al conectar')
      setStatus('connecting')
    } catch (err: unknown) {
      setMsg({ type: 'error', text: err instanceof Error ? err.message : 'Error desconocido' })
    } finally {
      setConnecting(false)
    }
  }

  async function handleDisconnect() {
    if (!confirm('¿Desconectar y borrar sesión? Deberás escanear el QR de nuevo.')) return
    await fetch(`/api/bots/${bot.id}/baileys/status`, { method: 'DELETE' })
    setStatus('disconnected')
    setQrBase64(undefined)
    setPhone(undefined)
    setMsg({ type: 'success', text: 'Sesión borrada correctamente.' })
  }

  // Reinicio forzado: borra la sesión atascada (estado 'connecting' que nunca
  // emite QR porque reusa una sesión vencida) y genera un QR nuevo desde cero.
  async function handleReset() {
    setConnecting(true)
    setMsg(null)
    try {
      await fetch(`/api/bots/${bot.id}/baileys/status`, { method: 'DELETE' }).catch(() => {})
      setQrBase64(undefined)
      const res = await fetch(`/api/bots/${bot.id}/baileys/connect`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al reiniciar la conexión')
      setStatus('connecting')
    } catch (err: unknown) {
      setMsg({ type: 'error', text: err instanceof Error ? err.message : 'Error desconocido' })
    } finally {
      setConnecting(false)
    }
  }

  async function handleClearMemory() {
    if (!confirm('¿Eliminar todas las conversaciones de este bot? El bot olvidará el historial de todos los clientes. Esta acción no se puede deshacer.')) return
    setClearingMemory(true)
    setMsg(null)
    try {
      const res = await fetch(`/api/bots/${bot.id}/clear-memory`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al limpiar')
      setMsg({ type: 'success', text: `Memoria limpiada — ${data.conversationsDeleted} conversación(es) eliminada(s).` })
    } catch (err: unknown) {
      setMsg({ type: 'error', text: err instanceof Error ? err.message : 'Error desconocido' })
    } finally {
      setClearingMemory(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Estado */}
      <div className="dm-card-dark p-5 rounded-2xl flex items-center justify-between">
        <div>
          <div className="text-sm font-bold text-white flex items-center gap-2">
            {status === 'connected'
              ? <Wifi className="w-4 h-4 text-[#16A34A]" />
              : <WifiOff className="w-4 h-4 text-white/50" />}
            {status === 'connected' ? 'Conectado' : status === 'qr_ready' ? 'Esperando escaneo' : status === 'connecting' ? 'Conectando...' : 'Desconectado'}
          </div>
          {phone && <div className="text-xs text-white/50 mt-0.5">📱 +{phone}</div>}
        </div>
        <div className="flex gap-2">
          {status === 'connected' ? (
            <button
              onClick={handleDisconnect}
              className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 rounded-xl text-xs font-medium transition-colors"
            >
              <WifiOff className="w-3.5 h-3.5" /> Desconectar
            </button>
          ) : (
            <>
              <button
                onClick={handleConnect}
                disabled={connecting || status === 'connecting' || status === 'qr_ready'}
                className="flex items-center gap-2 px-3 py-2 bg-[#0a95a8]/10 border border-[#0a95a8]/30 text-[#0a95a8] hover:bg-[#0a95a8]/20 rounded-xl text-xs font-medium transition-colors disabled:opacity-50"
              >
                {connecting || status === 'connecting' ? <Spinner /> : <RefreshCw className="w-3.5 h-3.5" />}
                {status === 'qr_ready' ? 'Escanea el QR' : 'Conectar'}
              </button>
              {(status === 'connecting' || status === 'qr_ready') && (
                <button
                  onClick={handleReset}
                  disabled={connecting}
                  title="¿No aparece el QR? Borra la sesión atascada y genera un código nuevo."
                  className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 rounded-xl text-xs font-medium transition-colors disabled:opacity-50"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Reiniciar
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {msg && <Alert type={msg.type} msg={msg.text} />}

      {/* QR */}
      {status === 'qr_ready' && qrBase64 && (
        <div className="dm-card-dark p-6 rounded-2xl text-center space-y-4">
          <div className="flex items-center gap-2 justify-center text-sm font-bold text-white">
            <QrCode className="w-4 h-4 text-[#147e95]" />
            Escanea con WhatsApp
          </div>
          <p className="text-xs text-white/50">
            Abre WhatsApp → Dispositivos vinculados → Vincular dispositivo
          </p>
          <div className="flex justify-center">
            <img
              src={qrBase64}
              alt="QR WhatsApp"
              className="w-56 h-56 rounded-2xl border-4 border-[#16A34A]/30 bg-white p-2"
            />
          </div>
          <p className="text-[11px] text-white/40">El QR se actualiza automáticamente cada 20 segundos.</p>
        </div>
      )}

      {/* Conectado */}
      {status === 'connected' && (
        <div className="dm-card-dark p-6 rounded-2xl border border-[#16A34A]/20 text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-[#147e95]/12 border border-[#147e95]/25 flex items-center justify-center mx-auto">
            <Wifi className="w-6 h-6 text-[#16A34A]" />
          </div>
          <div className="text-sm font-bold text-white">¡Agente conectado correctamente!</div>
          <div className="text-xs text-white/50">El agente está activo y respondiendo mensajes en WhatsApp.</div>
        </div>
      )}

      {/* Desconectado - instrucciones */}
      {status === 'disconnected' && (
        <div className="dm-card-dark p-6 rounded-2xl border border-white/10">
          <h3 className="text-sm font-bold text-white mb-3">Pasos para conectar</h3>
          <ol className="space-y-3">
            {['Presiona "Conectar" arriba', 'Espera a que aparezca el código QR', 'Abre WhatsApp en tu teléfono', 'Ve a Dispositivos vinculados → Vincular dispositivo', 'Escanea el QR con tu cámara'].map((step, i) => (
              <li key={i} className="flex gap-3 text-sm text-white/75">
                <span className="w-5 h-5 rounded-full bg-[#16A34A]/10 border border-[#16A34A]/20 text-[#16A34A] text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                {step}
              </li>
            ))}
          </ol>
        </div>
      )}
      {/* Zona peligrosa: limpiar memoria */}
      <div className="dm-card-dark p-4 rounded-2xl border border-red-500/10">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-bold text-white flex items-center gap-2">
              <Trash2 className="w-3.5 h-3.5 text-red-400" />
              Limpiar memoria
            </div>
            <p className="text-xs text-white/50 mt-0.5">
              Elimina el historial de conversaciones de todos los clientes.
            </p>
          </div>
          <button
            onClick={handleClearMemory}
            disabled={clearingMemory}
            className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 rounded-xl text-xs font-medium transition-colors disabled:opacity-50 shrink-0"
          >
            {clearingMemory ? <Spinner /> : <Trash2 className="w-3.5 h-3.5" />}
            Limpiar
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Chats Tab ────────────────────────────────────────────────────────────────

interface ConvSummary {
  id: string
  userPhone: string
  userName: string | null
  sold: boolean
  botDisabled: boolean
  updatedAt: string
  messages: { role: string; content: string; type: string; createdAt: string }[]
  _count: { messages: number }
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  type: string
  content: string
  createdAt: string
}

function parseAssistantContent(content: string): string {
  try {
    const p = JSON.parse(content) as Record<string, unknown>
    return [p.mensaje1, p.mensaje2, p.mensaje3].filter(Boolean).join('\n\n')
  } catch {
    return content
  }
}

function ChatsTab({ bot }: { bot: Bot }) {
  const [convs, setConvs] = useState<ConvSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loadingMsgs, setLoadingMsgs] = useState(false)
  const [deletingChat, setDeletingChat] = useState(false)
  const [togglingBot, setTogglingBot] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState('')
  const [markSoldModal, setMarkSoldModal] = useState(false)
  const [markSoldReport, setMarkSoldReport] = useState('')
  const [markingSold, setMarkingSold] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  async function loadConvs() {
    setLoading(true)
    try {
      const res = await fetch(`/api/bots/${bot.id}/conversations`)
      if (res.ok) {
        const data = await res.json()
        setConvs(data.conversations ?? [])
      }
    } finally {
      setLoading(false)
    }
  }

  async function loadMessages(phone: string) {
    setMessages([])
    setLoadingMsgs(true)
    try {
      const res = await fetch(`/api/bots/${bot.id}/conversations/${encodeURIComponent(phone)}`)
      if (res.ok) {
        const data = await res.json()
        setMessages(data.messages ?? [])
      }
    } finally {
      setLoadingMsgs(false)
    }
  }

  async function deleteChat(phone: string) {
    if (!confirm('¿Borrar el historial de mensajes de este contacto?')) return
    setDeletingChat(true)
    try {
      await fetch(`/api/bots/${bot.id}/conversations/${encodeURIComponent(phone)}`, { method: 'DELETE' })
      setMessages([])
      setSelectedPhone(null)
      await loadConvs()
    } finally {
      setDeletingChat(false)
    }
  }

  async function toggleBot(phone: string, currentDisabled: boolean) {
    setTogglingBot(true)
    try {
      const res = await fetch(`/api/bots/${bot.id}/conversations/${encodeURIComponent(phone)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botDisabled: !currentDisabled }),
      })
      if (res.ok) {
        setConvs(prev => prev.map(c => c.userPhone === phone ? { ...c, botDisabled: !currentDisabled } : c))
      }
    } finally {
      setTogglingBot(false)
    }
  }

  async function handleMarkAsSold() {
    if (!selectedPhone) return
    setMarkingSold(true)
    try {
      const res = await fetch(`/api/bots/${bot.id}/conversations/${encodeURIComponent(selectedPhone)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAsSold: true, orderReport: markSoldReport }),
      })
      if (res.ok) {
        setConvs(prev => prev.map(c => c.userPhone === selectedPhone ? { ...c, sold: true, botDisabled: true } : c))
        setMarkSoldModal(false)
        setMarkSoldReport('')
      }
    } finally {
      setMarkingSold(false)
    }
  }

  async function sendReply() {
    if (!selectedPhone || !replyText.trim() || sending) return
    setSendError('')
    setSending(true)
    try {
      const res = await fetch(`/api/bots/${bot.id}/conversations/${encodeURIComponent(selectedPhone)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: replyText.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setSendError(data.error ?? 'Error al enviar')
        return
      }
      setMessages(prev => [...prev, data.message as ChatMessage])
      setReplyText('')
    } catch {
      setSendError('Error de conexión')
    } finally {
      setSending(false)
    }
  }

  useEffect(() => { loadConvs() }, [bot.id])

  useEffect(() => {
    if (selectedPhone) {
      setReplyText('')
      setSendError('')
      loadMessages(selectedPhone)
    }
  }, [selectedPhone])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const selectedConv = convs.find(c => c.userPhone === selectedPhone)
  const isMeta = bot.type === 'META'

  // Colores según el tipo de bot
  const theme = isMeta
    ? { panelBg: '#18191a', headerBg: '#242526', chatBg: '#0e0e0e', itemHover: '#2f3031', itemSelected: '#3a3b3c', avatarBg: '#0084ff', avatarText: '#fff', outBubble: '#0084ff', outText: '#fff', inBubble: '#3a3b3c', inText: '#e4e6ea', inputBg: '#3a3b3c', inputBorder: '#4a4b4c', sendBtn: '#0084ff', accent: '#0084ff', accentText: '#fff' }
    : { panelBg: '#111b21', headerBg: '#202c33', chatBg: '#0b141a', itemHover: '#2a3942', itemSelected: '#2a3942', avatarBg: '#00a884', avatarText: '#fff', outBubble: '#005c4b', outText: '#e9edef', inBubble: '#202c33', inText: '#e9edef', inputBg: '#2a3942', inputBorder: '#374045', sendBtn: '#00a884', accent: '#00a884', accentText: '#fff' }

  function initials(name: string | null, phone: string) {
    if (name) return name.slice(0, 2).toUpperCase()
    return phone.slice(-2)
  }

  // En móvil mostramos un panel a la vez
  const showList = !selectedPhone
  const showChat = !!selectedPhone

  return (
    <>
    <div className="rounded-2xl overflow-hidden h-[480px] sm:h-[620px]" style={{ background: theme.panelBg }}>
      <div className="flex h-full">

        {/* ── Panel izquierdo: lista de contactos ── */}
        <div
          className={`flex-col border-r shrink-0 h-full ${showList ? 'flex w-full' : 'hidden'} sm:flex sm:w-64`}
          style={{ borderColor: 'rgba(255,255,255,0.06)', background: theme.panelBg }}
        >
          {/* Header lista */}
          <div className="flex items-center justify-between px-4 py-3 shrink-0" style={{ background: theme.headerBg }}>
            <span className="text-sm font-bold text-white">{isMeta ? '💬 Messenger' : '💬 WhatsApp'}</span>
            <button onClick={loadConvs} className="p-1.5 rounded-full hover:bg-white/5 transition-colors" title="Refrescar">
              <RefreshCw className="w-4 h-4 text-white/60" />
            </button>
          </div>

          {/* Lista */}
          <div className="flex-1 overflow-y-auto">
            {loading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-5 h-5 animate-spin" style={{ color: theme.accent }} />
              </div>
            )}
            {!loading && convs.length === 0 && (
              <div className="px-4 py-8 text-center text-xs text-white/30">Sin conversaciones aún</div>
            )}
            {!loading && convs.map(c => {
              const lastMsg = c.messages[0]
              const isSelected = selectedPhone === c.userPhone
              const displayName = c.userName || c.userPhone
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedPhone(c.userPhone)}
                  className="w-full text-left flex items-center gap-2 sm:gap-3 px-3 py-2.5 border-b transition-colors"
                  style={{
                    borderColor: 'rgba(255,255,255,0.04)',
                    background: isSelected ? theme.itemSelected : 'transparent',
                  }}
                  onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = theme.itemHover }}
                  onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                >
                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: c.botDisabled ? '#374045' : theme.avatarBg, color: theme.avatarText }}>
                    {initials(c.userName, c.userPhone)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span className="text-sm font-medium truncate" style={{ color: '#e9edef' }}>{displayName}</span>
                      <span className="text-[10px] shrink-0" style={{ color: '#8696a0' }}>
                        {new Date(c.updatedAt).toLocaleDateString('es-BO', { day: '2-digit', month: 'short', timeZone: 'America/La_Paz' })}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <p className="text-xs truncate flex-1" style={{ color: '#8696a0' }}>
                        {lastMsg ? (lastMsg.role === 'assistant' ? '🤖 ' : '') + parseAssistantContent(lastMsg.content).slice(0, 30) : 'Sin mensajes'}
                      </p>
                      {c.sold && <span className="text-[9px] font-bold shrink-0 px-1 py-0.5 rounded" style={{ background: 'rgba(0,168,132,0.2)', color: '#00a884' }}>VENTA</span>}
                      {c.botDisabled && <span className="text-[9px] font-bold shrink-0 px-1 py-0.5 rounded" style={{ background: 'rgba(239,68,68,0.2)', color: '#f87171' }}>OFF</span>}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Panel derecho: chat ── */}
        <div className={`flex-col min-w-0 flex-1 h-full ${showChat ? 'flex' : 'hidden'} sm:flex`}>
          {!selectedPhone ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3" style={{ background: theme.chatBg }}>
              <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: '#F0F3F7' }}>
                <MessageSquare className="w-8 h-8" style={{ color: '#9CA3AF' }} />
              </div>
              <p className="text-sm font-medium" style={{ color: '#8696a0' }}>Selecciona un chat</p>
              <p className="text-xs" style={{ color: '#8696a0' }}>para ver el historial de mensajes</p>
            </div>
          ) : (
            <>
              {/* ── Cabecera del chat ── */}
              <div className="px-2 sm:px-3 py-2 flex items-center gap-2 shrink-0" style={{ background: theme.headerBg }}>
                {/* Volver — solo móvil */}
                <button onClick={() => setSelectedPhone(null)} className="sm:hidden p-1.5 rounded-full hover:bg-white/5 transition-colors shrink-0">
                  <ArrowLeft className="w-4 h-4 text-white/70" />
                </button>

                {/* Avatar */}
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: selectedConv?.botDisabled ? '#374045' : theme.avatarBg, color: theme.avatarText }}>
                  {initials(selectedConv?.userName ?? null, selectedPhone)}
                </div>

                {/* Nombre */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-semibold truncate text-white">{selectedConv?.userName || selectedPhone}</p>
                  <p className="text-[9px] sm:text-[10px] truncate" style={{ color: '#8696a0' }}>{selectedPhone}</p>
                </div>

                {/* ── Botón Toggle bot ── */}
                <button
                  onClick={() => selectedConv && toggleBot(selectedPhone, selectedConv.botDisabled)}
                  disabled={togglingBot}
                  className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-full text-xs font-bold transition-all disabled:opacity-50 shrink-0"
                  style={selectedConv?.botDisabled
                    ? { background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.4)' }
                    : { background: `rgba(${isMeta ? '0,132,255' : '0,168,132'},0.15)`, color: theme.accent, border: `1px solid rgba(${isMeta ? '0,132,255' : '0,168,132'},0.4)` }}
                >
                  {togglingBot
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : selectedConv?.botDisabled
                      ? <ToggleLeft className="w-4 h-4" />
                      : <ToggleRight className="w-4 h-4" />}
                  <span className="hidden sm:inline">{selectedConv?.botDisabled ? 'Bot OFF' : 'Bot ON'}</span>
                </button>

                {/* ── Botón Marcar Venta ── */}
                {!selectedConv?.sold && (
                  <button
                    onClick={() => {
                      setMarkSoldReport(`Hola *${bot.name}*, nuevo pedido de [nombre].\nContacto: ${selectedPhone}.\nDirección: [dirección].\nDescripción: [producto].`)
                      setMarkSoldModal(true)
                    }}
                    className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0"
                    style={{ background: 'rgba(22,163,74,0.12)', color: '#16A34A', border: '1px solid rgba(22,163,74,0.35)' }}
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Marcar Venta</span>
                  </button>
                )}

                {/* ── Botón Borrar chat ── */}
                <button
                  onClick={() => deleteChat(selectedPhone)}
                  disabled={deletingChat}
                  className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-full text-xs font-bold transition-all disabled:opacity-50 shrink-0"
                  style={{ background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.35)' }}
                >
                  {deletingChat ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  <span className="hidden sm:inline">Borrar</span>
                </button>
              </div>

              {/* ── Área de mensajes ── */}
              <div
                className="flex-1 overflow-y-auto px-4 py-3 space-y-1"
                style={{
                  minHeight: 0,
                  background: theme.chatBg,
                  backgroundImage: isMeta
                    ? 'none'
                    : 'radial-gradient(circle, rgba(255,255,255,0.015) 1px, transparent 1px)',
                  backgroundSize: '24px 24px',
                }}
              >
                {loadingMsgs && (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="w-5 h-5 animate-spin" style={{ color: theme.accent }} />
                  </div>
                )}
                {!loadingMsgs && messages.length === 0 && (
                  <div className="flex items-center justify-center py-10 text-xs" style={{ color: '#8696a0' }}>Sin mensajes</div>
                )}
                {!loadingMsgs && messages.map(msg => {
                  const isBot = msg.role === 'assistant'
                  const text = isBot ? parseAssistantContent(msg.content) : msg.content
                  const time = new Date(msg.createdAt).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', timeZone: 'America/La_Paz' })
                  return (
                    <div key={msg.id} className={`flex mb-1 ${isBot ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className="max-w-[80%] sm:max-w-[65%] rounded-2xl px-3 py-2 text-sm leading-relaxed relative"
                        style={{
                          background: isBot ? theme.outBubble : theme.inBubble,
                          color: isBot ? theme.outText : theme.inText,
                          borderRadius: isBot ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                        }}
                      >
                        <div className="whitespace-pre-wrap break-words">{text}</div>
                        <div className="flex items-center justify-end gap-1 mt-1">
                          <span className="text-[10px]" style={{ color: isBot ? '#6B7280' : '#8696a0' }}>
                            {msg.type !== 'text' ? `📎 ${msg.type} · ` : ''}{time}
                          </span>
                          {isBot && <span className="text-[10px]" style={{ color: '#6B7280' }}>✓✓</span>}
                        </div>
                      </div>
                    </div>
                  )
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* ── Input de respuesta ── */}
              {bot.type !== 'YCLOUD' ? (
                <div className="px-4 py-3 flex items-center justify-center shrink-0" style={{ background: theme.headerBg }}>
                  <span className="text-xs rounded-full px-3 py-1.5" style={{ background: '#F0F3F7', color: '#8696a0' }}>
                    Envío manual solo disponible para bots YCloud
                  </span>
                </div>
              ) : (
                <div className="px-3 py-2 flex flex-col gap-1 shrink-0" style={{ background: theme.headerBg }}>
                  {sendError && (
                    <p className="text-[10px] text-red-400 px-2 pb-1">{sendError}</p>
                  )}
                  <div className="flex items-end gap-2">
                    <textarea
                      value={replyText}
                      onChange={e => { setReplyText(e.target.value); if (sendError) setSendError('') }}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply() } }}
                      placeholder="Escribe un mensaje…"
                      rows={1}
                      className="flex-1 rounded-2xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none resize-none"
                      style={{ background: theme.inputBg, border: `1px solid ${theme.inputBorder}`, maxHeight: 100 }}
                    />
                    <button
                      onClick={sendReply}
                      disabled={sending || !replyText.trim()}
                      className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all disabled:opacity-40"
                      style={{ background: theme.sendBtn }}
                      title="Enviar"
                    >
                      {sending
                        ? <Loader2 className="w-4 h-4 animate-spin text-white" />
                        : <svg viewBox="0 0 24 24" className="w-5 h-5 text-white fill-current" style={{ transform: 'rotate(45deg)', marginLeft: '-2px' }}><path d="M2 21L23 12 2 3v7l15 2-15 2z"/></svg>}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>

    {/* ── Modal: Marcar Venta Manual ── */}
    {markSoldModal && (
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.10)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
        onClick={e => { if (e.target === e.currentTarget) setMarkSoldModal(false) }}
      >
        <div style={{ background: '#0D0F1E', border: '1px solid rgba(22,163,74,0.2)', borderRadius: 16, padding: 24, width: '100%', maxWidth: 480 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShoppingBag size={18} color="#16A34A" />
              <span style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>Registrar venta por llamada</span>
            </div>
            <button onClick={() => setMarkSoldModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280' }}>
              <X size={18} />
            </button>
          </div>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginBottom: 12 }}>
            Edita el reporte con los datos del pedido. El bot dejará de responder a este contacto.
          </p>
          <textarea
            value={markSoldReport}
            onChange={e => setMarkSoldReport(e.target.value)}
            rows={6}
            style={{
              width: '100%', borderRadius: 10, padding: '10px 12px', fontSize: 13,
              background: '#F0F3F7', border: '1px solid rgba(255,255,255,0.12)',
              color: '#fff', resize: 'vertical', outline: 'none', fontFamily: 'inherit',
            }}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 14, justifyContent: 'flex-end' }}>
            <button
              onClick={() => setMarkSoldModal(false)}
              style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', background: 'transparent', color: '#6B7280', cursor: 'pointer', fontSize: 13 }}
            >
              Cancelar
            </button>
            <button
              onClick={handleMarkAsSold}
              disabled={markingSold}
              style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #1fb8bb 0%, #147e95 52%, #12303a 100%)', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, opacity: markingSold ? 0.6 : 1 }}
            >
              {markingSold ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              Confirmar Venta
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  )
}

// ─── Bot Detail View ──────────────────────────────────────────────────────────

function BotDetailView({
  bot: initialBot,
  onBack,
  onBotUpdated,
  onDeleted,
}: {
  bot: Bot
  onBack: () => void
  onBotUpdated: (updated: Bot) => void
  onDeleted: (botId: string) => void
}) {
  const [bot, setBot] = useState<Bot>(initialBot)
  const isBaileys = bot.type === 'BAILEYS'
  const [tab, setTab] = useState<Tab>(isBaileys ? 'qr' : 'webhook')
  const [tabRestored, setTabRestored] = useState(false)

  const [editingName, setEditingName] = useState(false)
  const [newName, setNewName] = useState(bot.name)
  const [savingName, setSavingName] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [savingStatus, setSavingStatus] = useState(false)

  async function toggleStatus() {
    setSavingStatus(true)
    const newStatus = bot.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE'
    try {
      const res = await fetch(`/api/bots/${bot.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) handleBotPatch({ status: newStatus })
    } finally {
      setSavingStatus(false)
    }
  }

  function handleBotPatch(updated: Partial<Bot>) {
    const merged = { ...bot, ...updated }
    setBot(merged)
    onBotUpdated(merged)
  }

  async function saveName() {
    if (!newName.trim() || newName === bot.name) { setEditingName(false); return }
    setSavingName(true)
    try {
      const res = await fetch(`/api/bots/${bot.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() }),
      })
      const data = await res.json()
      if (res.ok) handleBotPatch(data.bot)
    } finally {
      setSavingName(false)
      setEditingName(false)
    }
  }

  async function handleDelete() {
    if (!confirm(`¿Eliminar el bot "${bot.name}" permanentemente?\n\nSe borrarán todas sus conversaciones, mensajes y productos. Esta acción no se puede deshacer.`)) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/bots/${bot.id}`, { method: 'DELETE' })
      if (res.ok) onDeleted(bot.id)
    } finally {
      setDeleting(false)
    }
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    ...(!isBaileys ? [{ id: 'webhook' as Tab, label: 'Webhook', icon: <Webhook className="w-3.5 h-3.5" /> }] : []),
    { id: 'credentials', label: 'Credenciales', icon: <Key className="w-3.5 h-3.5" /> },
    { id: 'prompt', label: 'Plantilla', icon: <FileText className="w-3.5 h-3.5" /> },
    { id: 'products', label: 'Productos', icon: <Package className="w-3.5 h-3.5" /> },
    { id: 'followup', label: 'Seguimientos', icon: <Bell className="w-3.5 h-3.5" /> },
    { id: 'chats' as Tab, label: 'Chats', icon: <MessageSquare className="w-3.5 h-3.5" /> },
    ...(isBaileys ? [{ id: 'qr' as Tab, label: 'WhatsApp QR', icon: <QrCode className="w-3.5 h-3.5" /> }] : []),
  ]

  // Al abrir/recargar, restaurar la pestaña desde ?tab= (si existe y es válida
  // para este bot). Se hace UNA vez, antes de empezar a sincronizar la URL.
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('tab')
    if (t && tabs.some(x => x.id === t)) setTab(t as Tab)
    setTabRestored(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Mantener ?tab= en la URL para que la recarga conserve la pestaña actual.
  useEffect(() => {
    if (!tabRestored) return
    const params = new URLSearchParams(window.location.search)
    params.set('tab', tab)
    window.history.replaceState(null, '', window.location.pathname + `?${params.toString()}`)
  }, [tab, tabRestored])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2 hover:bg-[#F4F6FA] rounded-lg transition-colors text-[#6B7280] hover:text-[#111827]"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #1fb8bb 0%, #147e95 52%, #12303a 100%)', boxShadow: '0 10px 22px -8px rgba(0,229,208,0.45)' }}>
            <Bot className="w-5 h-5 text-white" />
          </div>
          {editingName ? (
            <div className="flex items-center gap-2 flex-1">
              <input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && saveName()}
                autoFocus
                className="bg-[#F4F6FA] border border-[#E4E9F0] rounded-lg px-3 py-1.5 text-sm text-[#111827] focus:outline-none focus:border-[#16A34A]/40 flex-1 max-w-xs"
              />
              <button onClick={saveName} disabled={savingName} className="text-[#16A34A] hover:text-[#16A34A]/80">
                {savingName ? <Spinner /> : <Check className="w-4 h-4" />}
              </button>
              <button onClick={() => setEditingName(false)} className="text-[#6B7280] hover:text-[#111827]">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-[#111827]">{bot.name}</h2>
              <button
                onClick={() => { setNewName(bot.name); setEditingName(true) }}
                className="text-[#9CA3AF] hover:text-[#111827] transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
        <button
          onClick={toggleStatus}
          disabled={savingStatus}
          title={bot.status === 'ACTIVE' ? 'Pausar agente' : 'Activar agente'}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold transition-all disabled:opacity-50 ${bot.status === 'ACTIVE'
            ? 'bg-[#16A34A]/10 text-[#16A34A] border-[#16A34A]/20 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30'
            : 'bg-dark-700/50 text-[#6B7280] border-[#E4E9F0] hover:bg-[#16A34A]/10 hover:text-[#16A34A] hover:border-[#16A34A]/20'
            }`}
        >
          {savingStatus ? (
            <Spinner />
          ) : bot.status === 'ACTIVE' ? (
            <ToggleRight className="w-3.5 h-3.5" />
          ) : (
            <ToggleLeft className="w-3.5 h-3.5" />
          )}
          {bot.status === 'ACTIVE' ? 'ACTIVO' : 'PAUSADO'}
        </button>
        <button
          onClick={handleDelete}
          disabled={deleting}
          title="Eliminar agente"
          className="p-2 hover:bg-red-500/10 rounded-lg transition-colors text-[#9CA3AF] hover:text-red-400 disabled:opacity-50"
        >
          {deleting ? <Spinner /> : <Trash2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white p-1 rounded-xl border border-[#E4E9F0] overflow-x-auto scrollbar-hide" style={{ boxShadow: '0 8px 24px rgba(15,23,42,0.05)' }}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${tab === t.id
              ? 'text-white'
              : 'text-[#6B7280] hover:text-[#111827] hover:bg-[#F4F6FA]'
              }`}
            style={tab === t.id ? { background: 'linear-gradient(135deg, #1fb8bb 0%, #147e95 52%, #12303a 100%)', boxShadow: '0 8px 20px rgba(0,229,208,0.28)' } : undefined}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'webhook' && (bot.type === 'YCLOUD' || bot.type === 'META') && <WebhookTab bot={bot} />}
      {tab === 'credentials' && (
        <CredentialsTab
          bot={bot}
          onStatusChange={status => handleBotPatch({ status })}
        />
      )}
      {tab === 'prompt' && (
        <PromptTab bot={bot} onSaved={handleBotPatch} />
      )}
      {tab === 'products' && <ProductsTab bot={bot} />}
      {tab === 'followup' && (
        <FollowUpTab bot={bot} onSaved={handleBotPatch} />
      )}
      {tab === 'qr' && isBaileys && <QRTab bot={bot} />}
      {tab === 'chats' && <ChatsTab bot={bot} />}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function WhatsAppPage() {
  usePlanGuard()
  const [bots, setBots] = useState<Bot[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedBot, setSelectedBot] = useState<Bot | null>(null)
  const [justCreatedWebhook, setJustCreatedWebhook] = useState<string | null>(null)
  const [navRestored, setNavRestored] = useState(false)

  async function loadBots() {
    setLoading(true)
    try {
      // Reintenta ante fallos transitorios (429 del rate-limit, BD lenta, 500).
      // CLAVE: nunca vaciamos la lista si falla — conservamos la anterior, así los
      // bots no "desaparecen" del panel por un parpadeo de red/servidor.
      const delays = [600, 1200, 2400, 4000]
      for (let attempt = 0; attempt <= delays.length; attempt++) {
        try {
          const res = await fetch('/api/bots', { cache: 'no-store' })
          if (res.ok) {
            const data = await res.json()
            if (Array.isArray(data.bots)) {
              setBots(data.bots)
              return
            }
          }
          // 429 / 500 / forma inesperada → caer al backoff y reintentar
        } catch {
          // error de red → reintentar
        }
        if (attempt < delays.length) {
          await new Promise(r => setTimeout(r, delays[attempt]))
        }
      }
      // Si tras todos los reintentos no se pudo: NO tocar `bots` (se mantiene lo previo).
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadBots() }, [])

  // Si la pestaña vuelve a tener foco y la lista quedó vacía por un fallo previo,
  // reintentamos cargar (recupera el caso "se vació y no volvió solo").
  useEffect(() => {
    const onFocus = () => { if (bots.length === 0) loadBots() }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bots.length])

  // Al recargar (F5), reabrir el bot que estaba abierto según ?bot= en la URL,
  // así el usuario no es devuelto a la lista de bots. Se hace UNA vez, cuando
  // los bots ya cargaron.
  useEffect(() => {
    if (navRestored || loading) return
    const botId = new URLSearchParams(window.location.search).get('bot')
    if (botId) {
      const b = bots.find(x => x.id === botId)
      if (b) setSelectedBot(b)
    }
    setNavRestored(true)
  }, [loading, bots, navRestored])

  // Mantener ?bot= sincronizado con el bot abierto (o limpiarlo al volver a la
  // lista), para que una recarga conserve la pantalla actual.
  useEffect(() => {
    if (!navRestored) return
    const params = new URLSearchParams(window.location.search)
    if (selectedBot) params.set('bot', selectedBot.id)
    else { params.delete('bot'); params.delete('tab') }
    const qs = params.toString()
    window.history.replaceState(null, '', window.location.pathname + (qs ? `?${qs}` : ''))
  }, [selectedBot, navRestored])

  function handleBotCreated(bot: Bot, webhookUrl: string) {
    setBots(prev => [bot, ...prev])
    setJustCreatedWebhook(webhookUrl)
    setSelectedBot(bot)
  }

  function handleSelectBot(bot: Bot) {
    setJustCreatedWebhook(null)
    setSelectedBot(bot)
  }

  function handleBack() {
    setSelectedBot(null)
    setJustCreatedWebhook(null)
  }

  function handleBotUpdated(updated: Bot) {
    setBots(prev => prev.map(b => (b.id === updated.id ? updated : b)))
    setSelectedBot(updated)
  }

  function handleBotDeleted(botId: string) {
    setBots(prev => prev.filter(b => b.id !== botId))
    setSelectedBot(null)
    setJustCreatedWebhook(null)
  }

  const activeBots = bots.filter(b => b.status === 'ACTIVE').length

  return (
    <div className="dm-page font-ui">
    <div className="px-4 sm:px-6 lg:px-8 pt-8 max-w-screen-2xl mx-auto pb-20 fade-in">
      {/* Page Header */}
      <div className="flex items-center gap-3 mb-5">
        <Link
          href="/dashboard/services"
          className="p-1.5 hover:bg-[#F4F6FA] rounded-lg transition-colors group shrink-0"
        >
          <ArrowLeft className="w-4.5 h-4.5 text-[#6B7280] group-hover:text-[#111827] transition-colors" />
        </Link>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #1fb8bb 0%, #147e95 52%, #12303a 100%)', boxShadow: '0 10px 22px -8px rgba(0,229,208,0.45)' }}>
            <MessageCircle className="w-4.5 h-4.5 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-[#111827] flex items-center gap-2 leading-tight" style={{ letterSpacing: '-0.02em' }}>
              <span className="truncate">WhatsApp Bots</span>
              <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-md shrink-0" style={{ background: 'rgba(183,53,184,0.12)', color: '#147e95', border: '1px solid rgba(183,53,184,0.28)' }}>
                Multi-Tenant
              </span>
            </h1>
            <p className="text-[11px] text-[#6B7280] truncate">Configura y gestiona tus agentes AI de ventas.</p>
          </div>
        </div>
        <AIKeySelector compact />
      </div>

      {selectedBot ? (
        <BotDetailView
          bot={selectedBot}
          onBack={handleBack}
          onBotUpdated={handleBotUpdated}
          onDeleted={handleBotDeleted}
        />
      ) : (
        <div className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="px-3 py-2.5 rounded-xl flex items-center gap-2.5" style={{ background: 'linear-gradient(180deg, #0B1B2B 0%, #081624 60%, #050B14 100%)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 14px 32px -22px rgba(8,22,36,0.6)' }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)' }}>
                <Bot className="w-4 h-4 text-white/70" />
              </div>
              <div className="min-w-0">
                <div className="text-lg font-bold text-white leading-none">{bots.length}</div>
                <div className="text-[10px] text-white/50 mt-0.5 truncate">Total agentes</div>
              </div>
            </div>
            <div className="px-3 py-2.5 rounded-xl flex items-center gap-2.5" style={{ background: 'linear-gradient(180deg, #0B1B2B 0%, #081624 60%, #050B14 100%)', border: '1px solid rgba(183,53,184,0.28)', boxShadow: '0 14px 32px -22px rgba(8,22,36,0.6)' }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(183,53,184,0.18)', border: '1px solid rgba(183,53,184,0.4)' }}>
                <Zap className="w-4 h-4" style={{ color: '#C9A7FF' }} />
              </div>
              <div className="min-w-0">
                <div className="text-lg font-bold leading-none" style={{ color: '#C9A7FF' }}>{activeBots}</div>
                <div className="text-[10px] text-white/50 mt-0.5 truncate">Activos ahora</div>
              </div>
            </div>
            <div className="px-3 py-2.5 rounded-xl flex items-center gap-2.5" style={{ background: 'linear-gradient(180deg, #0B1B2B 0%, #081624 60%, #050B14 100%)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 14px 32px -22px rgba(8,22,36,0.6)' }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(125,211,252,0.14)', border: '1px solid rgba(125,211,252,0.32)' }}>
                <ShoppingBag className="w-4 h-4" style={{ color: '#7DD3FC' }} />
              </div>
              <div className="min-w-0">
                <div className="text-lg font-bold leading-none" style={{ color: '#7DD3FC' }}>
                  {bots.reduce((acc, b) => acc + (b._count?.assignedProducts ?? 0), 0)}
                </div>
                <div className="text-[10px] text-white/50 mt-0.5 truncate">Productos totales</div>
              </div>
            </div>
          </div>

          {/* Global chart */}
          <GlobalBotChart bots={bots} />

          {/* Create bot form */}
          <CreateBotForm onCreated={handleBotCreated} />

          {/* Bot list */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-[#6B7280]" />
            </div>
          ) : bots.length === 0 ? (
            <div className="dm-card p-12 rounded-2xl text-center border border-[#E4E9F0]">
              <div className="w-16 h-16 rounded-2xl bg-[#16A34A]/5 border border-[#16A34A]/10 flex items-center justify-center mx-auto mb-4 shadow-[0_0_20px_rgba(0,255,157,0.08)]">
                <Bot className="w-8 h-8 text-[#9CA3AF]" />
              </div>
              <div className="text-[#111827] font-semibold mb-1">Sin agentes configurados</div>
              <div className="text-[#6B7280] text-sm max-w-xs mx-auto">
                Crea tu primer agente AI de ventas usando el formulario de arriba.
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {bots.map(bot => (
                <BotCard key={bot.id} bot={bot} onSelect={handleSelectBot} />
              ))}
            </div>
          )}

          {/* How it works — compact onboarding strip */}
          <div className="rounded-2xl px-4 py-3.5"
            style={{
              background: 'radial-gradient(120% 80% at 50% -10%, rgba(183,53,184,0.16), rgba(255,255,255,0) 58%), linear-gradient(180deg, #0B1B2B 0%, #081624 60%, #050B14 100%)',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 18px 40px -24px rgba(8,22,36,0.6), inset 0 1px 0 rgba(255,255,255,0.05)',
            }}>
            <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] mb-3 flex items-center gap-2" style={{ color: 'rgba(255,255,255,0.6)' }}>
              <Zap className="w-3 h-3" style={{ color: '#C9A7FF' }} />
              ¿Cómo funciona?
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {([
                { Icon: Plus,        title: 'Crea el agente',         desc: 'Nombre + URL webhook.',  c: '#C9A7FF' },
                { Icon: Key,         title: 'Configura credenciales', desc: 'API keys YCloud / OpenAI.', c: '#A78BFA' },
                { Icon: ShoppingBag, title: 'Agrega productos',       desc: 'Base de conocimiento.',  c: '#7DD3FC' },
                { Icon: Webhook,     title: 'Conecta YCloud',         desc: 'Apunta el webhook.',     c: '#A78BFA' },
              ] as const).map((step, i) => (
                <div key={i} className="flex items-center gap-2.5 rounded-xl px-3 py-2 transition-colors"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div className="relative shrink-0">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ background: `${step.c}24`, border: `1px solid ${step.c}55`, boxShadow: `0 0 12px -4px ${step.c}66` }}>
                      <step.Icon className="w-3.5 h-3.5" style={{ color: step.c }} />
                    </div>
                    <span className="absolute -top-1 -right-1 text-[8px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center"
                      style={{ background: '#0b0c1a', color: step.c, border: `1px solid ${step.c}55` }}>{i + 1}</span>
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] font-bold text-white leading-tight truncate" style={{ letterSpacing: '-0.01em' }}>{step.title}</div>
                    <div className="text-[10px] truncate" style={{ color: 'rgba(255,255,255,0.5)' }}>{step.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  )
}
