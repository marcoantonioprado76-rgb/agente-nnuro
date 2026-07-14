'use client'

import { useState, useRef, useCallback } from 'react'
import { Search, Gift, CheckCircle, AlertCircle, X } from 'lucide-react'

interface UserResult {
  id: string
  username: string
  fullName: string
  email: string
  plan: string
}

export default function AdminBonusesPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<UserResult[]>([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState<UserResult | null>(null)
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const searchTimeout = useRef<NodeJS.Timeout | null>(null)

  const search = useCallback((q: string) => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    if (q.length < 2) { setResults([]); return }
    searchTimeout.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/admin/bonuses?q=${encodeURIComponent(q)}`)
        const data = await res.json()
        setResults(data.users ?? [])
      } catch {
        setResults([])
      } finally {
        setSearching(false)
      }
    }, 300)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selected) return
    setSubmitting(true)
    setToast(null)
    try {
      const res = await fetch('/api/admin/bonuses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selected.id, amount: parseFloat(amount), description }),
      })
      const data = await res.json()
      if (!res.ok) {
        setToast({ type: 'error', msg: data.error || 'Error al acreditar' })
      } else {
        setToast({ type: 'success', msg: data.message })
        setSelected(null)
        setAmount('')
        setDescription('')
        setQuery('')
        setResults([])
      }
    } catch {
      setToast({ type: 'error', msg: 'Error de conexión' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
  <div className="dm-page font-ui">
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-lg font-semibold text-[#111827]">Bonos Extra</h1>
        <p className="text-xs text-[#111827]/40 mt-0.5">Acredita un bono extra directamente a la billetera de un usuario</p>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm border ${
          toast.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
            : 'bg-red-500/10 border-red-500/20 text-red-400'
        }`}>
          {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          <span className="flex-1">{toast.msg}</span>
          <button onClick={() => setToast(null)}><X size={14} className="opacity-60 hover:opacity-100" /></button>
        </div>
      )}

      <div className="bg-white/3 border border-[#E4E9F0] rounded-2xl p-5 space-y-5">

        {/* User Search */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-[#111827]/50 uppercase tracking-widest">Buscar usuario</label>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#111827]/30 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={e => { setQuery(e.target.value); search(e.target.value); setSelected(null) }}
              placeholder="Nombre, usuario o email..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[#F4F6FA] border border-[#E4E9F0] text-sm text-[#111827] placeholder:text-[#111827]/25 focus:outline-none focus:border-purple-500/50"
            />
          </div>

          {/* Results dropdown */}
          {results.length > 0 && !selected && (
            <div className="rounded-xl border border-[#E4E9F0] bg-[#111] overflow-hidden divide-y divide-white/5">
              {results.map(u => (
                <button
                  key={u.id}
                  onClick={() => { setSelected(u); setResults([]); setQuery(u.fullName) }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#F4F6FA] transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-full bg-purple-600/20 border border-purple-500/20 flex items-center justify-center shrink-0">
                    <span className="text-xs font-semibold text-purple-300">{u.fullName.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-[#111827] truncate">{u.fullName}</p>
                    <p className="text-[11px] text-[#111827]/40 truncate">@{u.username} · {u.plan}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
          {searching && (
            <p className="text-xs text-[#111827]/30 pl-1">Buscando...</p>
          )}

          {/* Selected user badge */}
          {selected && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-purple-600/10 border border-purple-500/20">
              <div className="w-8 h-8 rounded-full bg-purple-600/20 border border-purple-500/20 flex items-center justify-center shrink-0">
                <span className="text-xs font-semibold text-purple-300">{selected.fullName.charAt(0).toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[#111827]">{selected.fullName}</p>
                <p className="text-[11px] text-[#111827]/40">@{selected.username} · {selected.plan}</p>
              </div>
              <button
                onClick={() => { setSelected(null); setQuery(''); setResults([]) }}
                className="text-[#111827]/30 hover:text-[#111827]/60 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          )}
        </div>

        {/* Form (only shown when user selected) */}
        {selected && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-[#111827]/50 uppercase tracking-widest">Monto (USD)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#111827]/30 text-sm">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="0.00"
                  required
                  className="w-full pl-7 pr-4 py-2.5 rounded-xl bg-[#F4F6FA] border border-[#E4E9F0] text-sm text-[#111827] placeholder:text-[#111827]/25 focus:outline-none focus:border-purple-500/50"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-[#111827]/50 uppercase tracking-widest">Descripción <span className="text-[#111827]/20 normal-case">(opcional)</span></label>
              <input
                type="text"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Motivo del bono..."
                maxLength={200}
                className="w-full px-4 py-2.5 rounded-xl bg-[#F4F6FA] border border-[#E4E9F0] text-sm text-[#111827] placeholder:text-[#111827]/25 focus:outline-none focus:border-purple-500/50"
              />
            </div>

            <button
              type="submit"
              disabled={submitting || !amount}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-purple-600/80 hover:bg-purple-600 border border-purple-500/30 text-sm font-semibold text-[#111827] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Gift size={15} />
              {submitting ? 'Acreditando...' : `Acreditar bono a ${selected.fullName.split(' ')[0]}`}
            </button>
          </form>
        )}
      </div>
    </div>
  </div>
  )
}
