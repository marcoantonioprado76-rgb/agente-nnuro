'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Activity, Loader2, RefreshCw, ArrowDownCircle, ArrowUpCircle, UserCog, PackagePlus,
  RotateCcw, AlertCircle, Calendar, ChevronLeft, ChevronRight, Search,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type MovementType =
  | 'recharge_included' | 'recharge_additional' | 'consumption'
  | 'adjustment_admin' | 'expiration' | 'refund' | 'migration'

interface Movement {
  id: string
  user_id: string
  movement_type: MovementType
  amount: number
  balance_before: number
  balance_after: number
  source: string | null
  description: string | null
  related_subscription_id: string | null
  related_ai_usage_log_id: string | null
  related_package_id: string | null
  idempotency_key: string | null
  created_at: string
  user: { email: string | null; full_name: string | null }
}

const PAGE_SIZE = 50

const FILTERS: { key: '' | MovementType; label: string }[] = [
  { key: '',                     label: 'Todos' },
  { key: 'consumption',          label: 'Consumo' },
  { key: 'recharge_included',    label: 'Recargas plan' },
  { key: 'recharge_additional',  label: 'Paquetes' },
  { key: 'adjustment_admin',     label: 'Ajustes' },
  { key: 'refund',               label: 'Reembolsos' },
  { key: 'expiration',           label: 'Expiración' },
  { key: 'migration',            label: 'Migración' },
]

const TYPE_META: Record<MovementType, { label: string; icon: typeof RefreshCw; color: string; bg: string; border: string; sign: 'positive' | 'negative' }> = {
  recharge_included:   { label: 'Recarga plan',      icon: RefreshCw,    color: '#10B981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.30)', sign: 'positive' },
  recharge_additional: { label: 'Paquete adicional', icon: PackagePlus,  color: '#D45BFF', bg: 'rgba(212,91,255,0.12)', border: 'rgba(212,91,255,0.30)', sign: 'positive' },
  consumption:         { label: 'Consumo IA',         icon: ArrowDownCircle, color: '#FBBF24', bg: 'rgba(251,191,36,0.10)', border: 'rgba(251,191,36,0.25)', sign: 'negative' },
  adjustment_admin:    { label: 'Ajuste admin',      icon: UserCog,      color: '#94A3B8', bg: 'rgba(148,163,184,0.10)', border: 'rgba(148,163,184,0.25)', sign: 'positive' },
  expiration:          { label: 'Expiración',        icon: AlertCircle,  color: '#EF4444', bg: 'rgba(239,68,68,0.10)',  border: 'rgba(239,68,68,0.25)',  sign: 'negative' },
  refund:              { label: 'Reembolso',         icon: RotateCcw,    color: '#60A5FA', bg: 'rgba(96,165,250,0.10)', border: 'rgba(96,165,250,0.25)', sign: 'positive' },
  migration:           { label: 'Migración',         icon: ArrowUpCircle, color: '#A78BFA', bg: 'rgba(167,139,250,0.10)', border: 'rgba(167,139,250,0.25)', sign: 'positive' },
}

export default function AdminCreditMovementsPage() {
  const [rows, setRows] = useState<Movement[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [filter, setFilter] = useState<'' | MovementType>('')
  const [userIdFilter, setUserIdFilter] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('limit', String(PAGE_SIZE))
      params.set('offset', String(page * PAGE_SIZE))
      if (filter) params.set('type', filter)
      if (userIdFilter.trim()) params.set('user_id', userIdFilter.trim())
      if (from) params.set('from', new Date(from).toISOString())
      if (to) params.set('to', new Date(to).toISOString())

      const res = await fetch(`/api/admin/credit-movements?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setRows(data.movements ?? [])
        setTotal(data.pagination?.total ?? 0)
      }
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [page, filter, userIdFilter, from, to])

  useEffect(() => { fetchData() }, [fetchData])

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total])
  const totals = useMemo(() => {
    let positive = 0
    let negative = 0
    for (const m of rows) {
      const meta = TYPE_META[m.movement_type]
      if (meta?.sign === 'positive') positive += m.amount
      else negative += m.amount
    }
    return { positive, negative }
  }, [rows])

  return (
    <div className="min-h-screen p-6 lg:p-10 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Activity className="h-6 w-6 text-purple-400" />
        <div>
          <h1 className="text-2xl font-semibold text-white">Auditoría de créditos</h1>
          <p className="text-[12px] text-white/55 mt-0.5">
            Movimientos del ledger · <span className="text-white">{total.toLocaleString()}</span> en total ·
            <span className="text-emerald-400 ml-1">+{totals.positive.toLocaleString()}</span> /
            <span className="text-amber-400 ml-1">-{totals.negative.toLocaleString()}</span> en esta página
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="rounded-2xl p-4 mb-4"
        style={{ background: 'rgba(11,16,38,0.6)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex flex-wrap gap-2 mb-3">
          {FILTERS.map((f) => {
            const active = filter === f.key
            return (
              <button key={f.key || 'all'}
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

        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/35" />
            <Input value={userIdFilter} onChange={(e) => setUserIdFilter(e.target.value)}
              placeholder="user_id" className="pl-9" />
          </div>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} placeholder="Desde" />
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} placeholder="Hasta" />
          <div className="md:col-span-4 flex justify-end gap-2">
            <Button variant="outline" size="sm"
              onClick={() => { setUserIdFilter(''); setFrom(''); setTo(''); setFilter(''); setPage(0) }}>
              Limpiar
            </Button>
            <Button size="sm" onClick={() => { setPage(0); fetchData() }}>
              <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refrescar
            </Button>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="rounded-2xl overflow-hidden"
        style={{ background: 'rgba(11,16,38,0.6)', border: '1px solid rgba(255,255,255,0.06)' }}>
        {loading ? (
          <div className="p-12 text-center"><Loader2 className="h-6 w-6 text-purple-400 animate-spin mx-auto" /></div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center">
            <Calendar className="h-8 w-8 text-white/30 mx-auto mb-3" />
            <p className="text-sm text-white/55">No hay movimientos con esos filtros.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.05]">
            {rows.map((m) => {
              const meta = TYPE_META[m.movement_type]
              const Icon = meta?.icon ?? Activity
              const signedAmount = meta?.sign === 'positive'
                ? `+${m.amount.toLocaleString()}`
                : `-${m.amount.toLocaleString()}`
              return (
                <div key={m.id} className="px-5 py-4 grid grid-cols-12 gap-3 items-center">
                  <div className="col-span-12 md:col-span-5 flex items-center gap-3 min-w-0">
                    <div className="shrink-0 flex h-9 w-9 items-center justify-center rounded-lg"
                      style={{ background: meta?.bg, border: `1px solid ${meta?.border}` }}>
                      <Icon className="h-4 w-4" style={{ color: meta?.color }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[13px] font-semibold text-white">{meta?.label || m.movement_type}</span>
                        {m.source && (
                          <span className="text-[9.5px] uppercase font-semibold text-white/45 px-1.5 py-0.5 rounded"
                            style={{ background: 'rgba(255,255,255,0.04)', letterSpacing: '0.1em' }}>
                            {m.source}
                          </span>
                        )}
                      </div>
                      {m.description && (
                        <p className="text-[11.5px] text-white/55 truncate" title={m.description}>{m.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="col-span-7 md:col-span-3 min-w-0">
                    <p className="text-[12px] text-white truncate">
                      {m.user?.full_name || m.user?.email || '(sin email)'}
                    </p>
                    <p className="text-[10.5px] text-white/40 font-mono truncate">{m.user_id}</p>
                  </div>

                  <div className="col-span-5 md:col-span-2 text-right">
                    <div className="text-[13px] font-semibold tabular-nums"
                      style={{ color: meta?.sign === 'positive' ? '#10B981' : '#FBBF24' }}>
                      {signedAmount}
                    </div>
                    <div className="text-[10.5px] text-white/40 tabular-nums">
                      Saldo: {m.balance_after.toLocaleString()}
                    </div>
                  </div>

                  <div className="col-span-12 md:col-span-2 text-right">
                    <p className="text-[10.5px] text-white/50">
                      {new Date(m.created_at).toLocaleString('es-MX', {
                        day: '2-digit', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {total > PAGE_SIZE && (
          <div className="px-5 py-3 flex items-center justify-between border-t border-white/[0.05]">
            <p className="text-[11px] text-white/45">
              {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} de {total}
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}
                className="h-8 w-8 inline-flex items-center justify-center rounded-lg disabled:opacity-30"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff' }}
                aria-label="Anterior"><ChevronLeft className="h-4 w-4" /></button>
              <span className="px-3 text-[12px] text-white/65 tabular-nums">{page + 1} / {totalPages}</span>
              <button onClick={() => setPage((p) => p + 1)} disabled={(page + 1) * PAGE_SIZE >= total}
                className="h-8 w-8 inline-flex items-center justify-center rounded-lg disabled:opacity-30"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff' }}
                aria-label="Siguiente"><ChevronRight className="h-4 w-4" /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
