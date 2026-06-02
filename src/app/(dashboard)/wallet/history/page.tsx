'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Loader2, ArrowLeft, ArrowDownCircle, ArrowUpCircle, Sparkles,
  PackagePlus, RefreshCw, UserCog, RotateCcw, Calendar, AlertCircle, ChevronLeft, ChevronRight,
} from 'lucide-react'

type MovementType =
  | 'recharge_included'
  | 'recharge_additional'
  | 'consumption'
  | 'adjustment_admin'
  | 'expiration'
  | 'refund'
  | 'migration'

interface Movement {
  id: string
  movement_type: MovementType
  amount: number
  balance_before: number
  balance_after: number
  source: string | null
  description: string | null
  related_subscription_id: string | null
  related_ai_usage_log_id: string | null
  related_package_id: string | null
  created_at: string
}

interface Pagination {
  total: number
  limit: number
  offset: number
  hasMore: boolean
}

const PAGE_SIZE = 25

const FILTERS: { key: '' | MovementType; label: string }[] = [
  { key: '',                     label: 'Todos' },
  { key: 'recharge_included',    label: 'Recargas plan' },
  { key: 'recharge_additional',  label: 'Paquetes' },
  { key: 'consumption',          label: 'Consumo' },
  { key: 'adjustment_admin',     label: 'Ajustes' },
  { key: 'refund',               label: 'Reembolsos' },
]

const TYPE_META: Record<MovementType, { label: string; icon: typeof Sparkles; color: string; bg: string; border: string; sign: 'positive' | 'negative' }> = {
  recharge_included:   { label: 'Recarga plan',      icon: RefreshCw,    color: '#10B981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.30)', sign: 'positive' },
  recharge_additional: { label: 'Paquete adicional', icon: PackagePlus,  color: '#D45BFF', bg: 'rgba(212,91,255,0.12)', border: 'rgba(212,91,255,0.30)', sign: 'positive' },
  consumption:         { label: 'Consumo de IA',     icon: ArrowDownCircle, color: '#FBBF24', bg: 'rgba(251,191,36,0.10)', border: 'rgba(251,191,36,0.25)', sign: 'negative' },
  adjustment_admin:    { label: 'Ajuste admin',      icon: UserCog,      color: '#94A3B8', bg: 'rgba(148,163,184,0.10)', border: 'rgba(148,163,184,0.25)', sign: 'positive' },
  expiration:          { label: 'Expiración',        icon: AlertCircle,  color: '#EF4444', bg: 'rgba(239,68,68,0.10)',  border: 'rgba(239,68,68,0.25)',  sign: 'negative' },
  refund:              { label: 'Reembolso',         icon: RotateCcw,    color: '#60A5FA', bg: 'rgba(96,165,250,0.10)', border: 'rgba(96,165,250,0.25)', sign: 'positive' },
  migration:           { label: 'Migración',         icon: ArrowUpCircle, color: '#A78BFA', bg: 'rgba(167,139,250,0.10)', border: 'rgba(167,139,250,0.25)', sign: 'positive' },
}

export default function WalletHistoryPage() {
  const [movements, setMovements] = useState<Movement[]>([])
  const [pagination, setPagination] = useState<Pagination>({ total: 0, limit: PAGE_SIZE, offset: 0, hasMore: false })
  const [filter, setFilter] = useState<'' | MovementType>('')
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)

  const fetchData = useCallback(async (p: number, t: '' | MovementType) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('limit', String(PAGE_SIZE))
      params.set('offset', String(p * PAGE_SIZE))
      if (t) params.set('type', t)
      const res = await fetch(`/api/credits/movements?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setMovements(data.movements ?? [])
        setPagination(data.pagination ?? { total: 0, limit: PAGE_SIZE, offset: 0, hasMore: false })
      }
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData(page, filter) }, [fetchData, page, filter])

  const totalPages = useMemo(() => Math.max(1, Math.ceil(pagination.total / PAGE_SIZE)), [pagination.total])

  return (
    <div className="min-h-screen p-6 lg:p-10 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Link
          href="/wallet"
          className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-white/55 hover:text-white transition-colors"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <Sparkles className="h-5 w-5 text-purple-400" />
        <h1 className="text-2xl font-semibold text-white">Historial de créditos</h1>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 mb-5">
        {FILTERS.map((f) => {
          const active = filter === f.key
          return (
            <button
              key={f.key || 'all'}
              onClick={() => { setFilter(f.key); setPage(0) }}
              className="px-3 py-1.5 rounded-full text-[11px] uppercase font-semibold transition-colors"
              style={{
                background: active ? 'rgba(212,91,255,0.16)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${active ? 'rgba(212,91,255,0.4)' : 'rgba(255,255,255,0.08)'}`,
                color: active ? '#fff' : 'rgba(255,255,255,0.6)',
                letterSpacing: '0.1em',
              }}>
              {f.label}
            </button>
          )
        })}
      </div>

      {/* Tabla / lista */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: 'rgba(11,16,38,0.6)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}>
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="h-6 w-6 text-purple-400 animate-spin mx-auto" />
          </div>
        ) : movements.length === 0 ? (
          <div className="p-12 text-center">
            <Calendar className="h-8 w-8 text-white/30 mx-auto mb-3" />
            <p className="text-sm text-white/55">Aún no hay movimientos para mostrar.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.05]">
            {movements.map((m) => {
              const meta = TYPE_META[m.movement_type]
              const Icon = meta.icon
              const signedAmount = meta.sign === 'positive' ? `+${m.amount.toLocaleString()}` : `-${m.amount.toLocaleString()}`
              return (
                <div key={m.id} className="px-5 py-4 flex items-center gap-4">
                  <div className="shrink-0 flex h-9 w-9 items-center justify-center rounded-lg"
                    style={{ background: meta.bg, border: `1px solid ${meta.border}` }}>
                    <Icon className="h-4 w-4" style={{ color: meta.color }} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[13px] font-semibold text-white">{meta.label}</span>
                      {m.source && (
                        <span className="text-[10px] uppercase font-semibold text-white/45 px-1.5 py-0.5 rounded"
                          style={{ background: 'rgba(255,255,255,0.04)', letterSpacing: '0.1em' }}>
                          {m.source}
                        </span>
                      )}
                    </div>
                    {m.description && (
                      <p className="text-[11.5px] text-white/55 truncate" title={m.description}>
                        {m.description}
                      </p>
                    )}
                    <p className="text-[10.5px] text-white/35 mt-0.5">
                      {new Date(m.created_at).toLocaleString('es-MX', {
                        day: '2-digit', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-[14px] font-semibold tabular-nums"
                      style={{ color: meta.sign === 'positive' ? '#10B981' : '#FBBF24' }}>
                      {signedAmount}
                    </div>
                    <div className="text-[10.5px] text-white/40 tabular-nums mt-0.5">
                      Saldo: {m.balance_after.toLocaleString()}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Paginación */}
        {pagination.total > PAGE_SIZE && (
          <div className="px-5 py-3 flex items-center justify-between border-t border-white/[0.05]">
            <p className="text-[11px] text-white/45">
              Mostrando {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, pagination.total)} de {pagination.total}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="h-8 w-8 inline-flex items-center justify-center rounded-lg disabled:opacity-30 transition-colors"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff' }}
                aria-label="Página anterior">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-3 text-[12px] text-white/65 tabular-nums">
                {page + 1} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={!pagination.hasMore}
                className="h-8 w-8 inline-flex items-center justify-center rounded-lg disabled:opacity-30 transition-colors"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff' }}
                aria-label="Página siguiente">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
