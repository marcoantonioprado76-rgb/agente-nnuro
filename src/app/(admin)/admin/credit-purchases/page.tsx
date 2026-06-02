'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, CheckCircle2, Clock, XCircle, AlertCircle, Key, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

type Status = 'pending' | 'completed' | 'failed' | 'expired'

type Purchase = {
  id: string
  user_id: string
  amount_usd: number
  status: Status
  stripe_checkout_session_id: string | null
  stripe_payment_intent_id: string | null
  notes: string | null
  created_at: string
  completed_at: string | null
  user?: { id: string; email: string; full_name: string | null; role: string; ai_credits_usd: number } | null
}

type Stats = {
  pending: number
  completed: number
  total_completed_usd: number
}

type KeyInfo = { configured: boolean; preview?: string; length?: number }

export default function AdminCreditPurchasesPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [stats, setStats] = useState<Stats>({ pending: 0, completed: 0, total_completed_usd: 0 })
  const [filter, setFilter] = useState<'all' | Status>('all')
  const [loading, setLoading] = useState(true)

  const [keyInfo, setKeyInfo] = useState<KeyInfo>({ configured: false })
  const [keyInput, setKeyInput] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [savingKey, setSavingKey] = useState(false)

  const fetchPurchases = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/credit-purchases?status=${filter}`)
      if (res.ok) {
        const data = await res.json()
        setPurchases(data.purchases ?? [])
        setStats(data.stats ?? { pending: 0, completed: 0, total_completed_usd: 0 })
      } else {
        const err = await res.json().catch(() => ({}))
        toast.error(err?.error || 'Error al cargar compras')
      }
    } finally { setLoading(false) }
  }, [filter])

  const fetchKey = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/settings/openai-key')
      if (res.ok) setKeyInfo(await res.json())
    } catch { /* silent */ }
  }, [])

  useEffect(() => { fetchPurchases() }, [fetchPurchases])
  useEffect(() => { fetchKey() }, [fetchKey])

  const handleSaveKey = async () => {
    const k = keyInput.trim()
    if (!k.startsWith('sk-') || k.length < 20) {
      toast.error('Formato inválido. La key debe empezar con sk- y tener al menos 20 caracteres.')
      return
    }
    setSavingKey(true)
    try {
      const res = await fetch('/api/admin/settings/openai-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: k }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success('Key actualizada correctamente')
        setKeyInput('')
        await fetchKey()
      } else {
        toast.error(data?.error || 'Error al guardar')
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error de red')
    } finally { setSavingKey(false) }
  }

  return (
    <div className="min-h-screen p-6 lg:p-10 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white mb-1">Compras de Créditos AI</h1>
        <p className="text-sm text-white/55">Historial de todas las recargas pagadas con Stripe y configuración de la OpenAI key global.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Compras pendientes" value={String(stats.pending)} accent="#F59E0B" />
        <StatCard label="Compras completadas" value={String(stats.completed)} accent="#10B981" />
        <StatCard label="Total recargado" value={`$${stats.total_completed_usd.toFixed(2)} USD`} accent="#D45BFF" />
      </div>

      {/* Configuración OpenAI key global */}
      <div className="rounded-2xl p-6"
        style={{
          background: 'rgba(11,16,38,0.6)',
          border: '1px solid rgba(212,91,255,0.20)',
        }}>
        <div className="flex items-center gap-2 mb-1">
          <Key className="h-4 w-4 text-[#D45BFF]" />
          <h2 className="text-lg font-semibold text-white">OpenAI key global</h2>
        </div>
        <p className="text-sm text-white/55 mb-5">
          Esta key se usa para procesar el uso de IA de los usuarios que no tienen su propia key configurada.
          Se cobra contra su saldo (<code className="text-[#D45BFF] text-xs">profiles.ai_credits_usd</code>) cada vez que se hace una llamada.
        </p>

        {keyInfo.configured ? (
          <div className="flex items-center justify-between p-3 rounded-lg mb-4"
            style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
            <div className="flex items-center gap-2 text-emerald-300/95 text-sm font-medium">
              <CheckCircle2 className="h-4 w-4" />
              Configurada
            </div>
            <code className="text-xs text-white/65 font-mono">{keyInfo.preview}</code>
          </div>
        ) : (
          <div className="flex items-center gap-2 p-3 rounded-lg mb-4 text-amber-300/95 text-sm"
            style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
            <AlertCircle className="h-4 w-4" />
            No hay key configurada. Los usuarios con saldo no podrán usar IA hasta que agregues una.
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <input
              type={showKey ? 'text' : 'password'}
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder="sk-..."
              disabled={savingKey}
              autoComplete="off"
              spellCheck={false}
              className="w-full h-11 pl-4 pr-11 rounded-xl bg-[#050816] text-white text-sm font-mono focus:outline-none focus:ring-1 focus:ring-purple-400/40"
              style={{ border: '1px solid rgba(255,255,255,0.10)' }}
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/35 hover:text-white/65 transition-colors"
            >
              {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <Button
            onClick={handleSaveKey}
            disabled={savingKey || !keyInput}
            className="h-11 px-5 rounded-xl text-white font-semibold whitespace-nowrap"
            style={{
              background: 'linear-gradient(135deg, #6B5CFF, #8E44FF, #D45BFF)',
            }}
          >
            {savingKey ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Guardar key
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        {(['all', 'completed', 'pending', 'failed', 'expired'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="px-3 py-1.5 rounded-full text-[11px] uppercase font-semibold transition-all"
            style={{
              background: filter === f ? 'rgba(212,91,255,0.18)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${filter === f ? 'rgba(212,91,255,0.45)' : 'rgba(255,255,255,0.08)'}`,
              color: filter === f ? '#F8FAFF' : 'rgba(248,250,255,0.6)',
              letterSpacing: '0.14em',
            }}
          >
            {f === 'all' ? 'Todas' : f === 'completed' ? 'Completadas' : f === 'pending' ? 'Pendientes' : f === 'failed' ? 'Fallidas' : 'Expiradas'}
          </button>
        ))}
      </div>

      {/* Tabla */}
      <div className="rounded-2xl overflow-hidden"
        style={{
          background: 'rgba(11,16,38,0.6)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}>
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="h-6 w-6 text-purple-400 animate-spin mx-auto" />
          </div>
        ) : purchases.length === 0 ? (
          <div className="p-12 text-center text-sm text-white/45">No hay compras con este filtro.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead style={{ background: 'rgba(255,255,255,0.02)' }}>
                <tr>
                  <Th>Usuario</Th>
                  <Th align="right">Monto</Th>
                  <Th>Estado</Th>
                  <Th>Fecha</Th>
                  <Th>Stripe Session</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {purchases.map((p) => (
                  <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                    <Td>
                      <div className="font-semibold text-white">{p.user?.full_name || '—'}</div>
                      <div className="text-[11px] text-white/45 mt-0.5">{p.user?.email}</div>
                      {p.user && (
                        <div className="text-[10px] text-emerald-300/65 mt-0.5">
                          Saldo actual: ${Number(p.user.ai_credits_usd ?? 0).toFixed(2)}
                        </div>
                      )}
                    </Td>
                    <Td align="right">
                      <span className="text-white font-semibold tabular-nums">${Number(p.amount_usd).toFixed(2)}</span>
                    </Td>
                    <Td><StatusBadge status={p.status} /></Td>
                    <Td>
                      <div className="text-white/75 text-[12px]">
                        {new Date(p.completed_at || p.created_at).toLocaleString('es-MX', {
                          day: '2-digit', month: 'short', year: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </div>
                      {p.completed_at && p.status === 'completed' && (
                        <div className="text-[10px] text-white/35 mt-0.5">Aprobado automáticamente por Stripe</div>
                      )}
                    </Td>
                    <Td>
                      {p.stripe_checkout_session_id ? (
                        <code className="text-[10px] text-white/55 font-mono">{p.stripe_checkout_session_id.slice(0, 18)}…</code>
                      ) : (
                        <span className="text-white/35 text-xs">—</span>
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="rounded-xl p-4"
      style={{
        background: 'rgba(11,16,38,0.6)',
        border: '1px solid rgba(255,255,255,0.06)',
        boxShadow: `0 12px 28px -16px ${accent}40`,
      }}>
      <div className="text-[10px] uppercase font-semibold text-white/55 mb-1.5" style={{ letterSpacing: '0.18em' }}>{label}</div>
      <div className="text-2xl font-semibold text-white tabular-nums" style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>{value}</div>
    </div>
  )
}

function StatusBadge({ status }: { status: Status }) {
  const styles: Record<Status, { bg: string; text: string; label: string; Icon: typeof CheckCircle2 }> = {
    completed: { bg: 'rgba(16,185,129,0.14)', text: '#10B981', label: 'Completado', Icon: CheckCircle2 },
    pending:   { bg: 'rgba(245,158,11,0.14)', text: '#F59E0B', label: 'Pendiente',  Icon: Clock },
    failed:    { bg: 'rgba(239,68,68,0.14)',  text: '#EF4444', label: 'Falló',      Icon: XCircle },
    expired:   { bg: 'rgba(148,163,184,0.14)', text: '#94A3B8', label: 'Expirado',  Icon: XCircle },
  }
  const s = styles[status]
  const I = s.Icon
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] uppercase font-semibold px-2.5 py-1 rounded-full"
      style={{ background: s.bg, color: s.text, letterSpacing: '0.14em' }}>
      <I className="h-3 w-3" /> {s.label}
    </span>
  )
}

function Th({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return (
    <th className={`px-4 py-3 text-[10px] uppercase font-semibold text-white/45 ${align === 'right' ? 'text-right' : 'text-left'}`}
      style={{ letterSpacing: '0.16em' }}>
      {children}
    </th>
  )
}

function Td({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return (
    <td className={`px-4 py-3 text-[12px] ${align === 'right' ? 'text-right' : 'text-left'}`}>
      {children}
    </td>
  )
}
