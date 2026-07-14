'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Cpu,
  Key,
  ShieldCheck,
  Users,
  Search,
  CheckCircle,
  XCircle,
  Loader2,
  Trash2,
  Eye,
  EyeOff,
  Plus,
  Minus,
  Hash,
} from 'lucide-react'

interface AdminAIConfig {
  hasKey: boolean
  apiKeyMasked: string | null
  updatedAt: string | null
}

interface UserRow {
  id: string
  fullName: string
  username: string
  email: string
  aiCredits: number
  aiBalanceUsd: number
  preferOwnKey: boolean
  plan: string
  isActive: boolean
}

export default function AdminAICreditsPage() {
  const [aiConfig, setAiConfig] = useState<AdminAIConfig | null>(null)
  const [users, setUsers] = useState<UserRow[]>([])
  const [loadingConfig, setLoadingConfig] = useState(true)
  const [loadingUsers, setLoadingUsers] = useState(true)

  // Admin key form
  const [keyInput, setKeyInput] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [savingKey, setSavingKey] = useState(false)
  const [deletingKey, setDeletingKey] = useState(false)
  const [keyMsg, setKeyMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  // Users search + credits
  const [search, setSearch] = useState('')
  const [editingUser, setEditingUser] = useState<string | null>(null)
  const [creditInput, setCreditInput] = useState('')
  const [creditMode, setCreditMode] = useState<'set' | 'add' | 'subtract'>('set')
  const [savingCredits, setSavingCredits] = useState(false)

  // Costos por modelo
  const [costs, setCosts] = useState<{ defaults: Record<string, number>; effective: Record<string, number> } | null>(null)
  const [costDraft, setCostDraft] = useState<Record<string, string>>({})
  const [savingCosts, setSavingCosts] = useState(false)
  const [costsMsg, setCostsMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [showCosts, setShowCosts] = useState(false)

  async function loadCosts() {
    const res = await fetch('/api/admin/ai-costs')
    if (res.ok) {
      const d = await res.json()
      setCosts({ defaults: d.defaults, effective: d.effective })
      const draft: Record<string, string> = {}
      for (const k of Object.keys(d.defaults)) draft[k] = String(d.effective[k] ?? d.defaults[k])
      setCostDraft(draft)
    }
  }
  async function saveCosts() {
    setSavingCosts(true)
    setCostsMsg(null)
    const payload: Record<string, number> = {}
    for (const [k, v] of Object.entries(costDraft)) {
      const n = parseFloat(v)
      if (Number.isFinite(n) && n >= 0) payload[k] = n
    }
    const res = await fetch('/api/admin/ai-costs', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ costs: payload }),
    })
    setSavingCosts(false)
    if (res.ok) {
      setCostsMsg({ type: 'ok', text: 'Costos actualizados.' })
      loadCosts()
    } else {
      const d = await res.json().catch(() => ({}))
      setCostsMsg({ type: 'err', text: d.error ?? 'Error al guardar costos' })
    }
  }

  async function loadConfig() {
    setLoadingConfig(true)
    const res = await fetch('/api/admin/ai-config')
    if (res.ok) setAiConfig(await res.json())
    setLoadingConfig(false)
  }

  const loadUsers = useCallback(async (q: string) => {
    setLoadingUsers(true)
    const res = await fetch(`/api/admin/credits?q=${encodeURIComponent(q)}`)
    if (res.ok) {
      const d = await res.json()
      setUsers(d.users)
    }
    setLoadingUsers(false)
  }, [])

  useEffect(() => { loadConfig() }, [])
  useEffect(() => { loadUsers(search) }, [search, loadUsers])
  useEffect(() => { loadCosts() }, [])

  async function saveAdminKey() {
    if (!keyInput.trim()) return
    setKeyMsg(null)
    setSavingKey(true)
    const res = await fetch('/api/admin/ai-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: keyInput.trim() }),
    })
    const d = await res.json()
    setSavingKey(false)
    if (res.ok) {
      setKeyMsg({ type: 'ok', text: `Key guardada: ${d.apiKeyMasked}` })
      setKeyInput('')
      loadConfig()
    } else {
      setKeyMsg({ type: 'err', text: d.error ?? 'Error al guardar' })
    }
  }

  async function deleteAdminKey() {
    if (!confirm('¿Eliminar la API Key global del admin?')) return
    setDeletingKey(true)
    await fetch('/api/admin/ai-config', { method: 'DELETE' })
    setDeletingKey(false)
    loadConfig()
  }

  async function assignCredits(userId: string) {
    const usd = parseFloat(creditInput)
    if (!Number.isFinite(usd) || usd < 0) return
    setSavingCredits(true)
    const res = await fetch('/api/admin/credits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, usd, mode: creditMode }),
    })
    setSavingCredits(false)
    if (res.ok) {
      setEditingUser(null)
      setCreditInput('')
      loadUsers(search)
    }
  }

  const PLAN_BADGE: Record<string, string> = {
    NONE: 'bg-[#F4F6FA] text-[#111827]/30 border-[#E4E9F0]',
    BASIC: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    PRO: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    ELITE: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  }

  return (
  <div className="dm-page font-ui">
    <div className="p-6 max-w-4xl mx-auto space-y-8">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, rgba(162,102,255,0.2), rgba(154,203,255,0.15))', border: '1px solid #E4E9F0' }}>
          <Cpu className="w-5 h-5 text-violet-400" />
        </div>
        <div>
          <h1 className="text-xl font-black text-[#111827] uppercase tracking-widest">Créditos AI</h1>
          <p className="text-xs text-[#111827]/30">Configura la API Key global y asigna créditos a usuarios</p>
        </div>
      </div>

      {/* Admin global API Key */}
      <div className="rounded-2xl p-6 space-y-4"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid #E4E9F0' }}>

        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck className="w-4 h-4 text-violet-400" />
          <p className="text-sm font-black text-[#111827] uppercase tracking-widest">API Key Global de OpenAI</p>
        </div>

        {loadingConfig ? (
          <div className="flex items-center gap-2 text-[#111827]/30 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Cargando...
          </div>
        ) : aiConfig?.hasKey ? (
          <div className="flex items-center gap-3 p-3.5 rounded-xl"
            style={{ background: 'rgba(0,255,136,0.06)', border: '1px solid rgba(0,255,136,0.2)' }}>
            <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-mono text-[#111827]">{aiConfig.apiKeyMasked}</p>
              <p className="text-[10px] text-[#111827]/30 mt-0.5">
                Actualizada: {aiConfig.updatedAt ? new Date(aiConfig.updatedAt).toLocaleString('es') : '—'}
              </p>
            </div>
            <button onClick={deleteAdminKey} disabled={deletingKey}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
              {deletingKey ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
              Eliminar
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3 p-3.5 rounded-xl"
            style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
            <XCircle className="w-4 h-4 text-red-400 shrink-0" />
            <p className="text-sm text-[#111827]/50">Sin key configurada — los usuarios sin key propia no podrán usar IA.</p>
          </div>
        )}

        {/* Key input */}
        <div className="space-y-3 pt-2">
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              placeholder="sk-proj-..."
              value={keyInput}
              onChange={e => setKeyInput(e.target.value)}
              className="w-full rounded-xl px-4 py-3 pr-11 text-sm font-mono text-[#111827] placeholder-[#9CA3AF] outline-none"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}
            />
            <button type="button" onClick={() => setShowKey(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#111827]/30">
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {keyMsg && (
            <p className={`text-xs px-3 py-2 rounded-xl ${keyMsg.type === 'ok' ? 'text-green-400 bg-green-500/10' : 'text-red-400 bg-red-500/10'}`}>
              {keyMsg.text}
            </p>
          )}

          <button onClick={saveAdminKey} disabled={savingKey || !keyInput.trim()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold disabled:opacity-40 transition-all"
            style={{ background: 'linear-gradient(135deg, rgba(162,102,255,0.3), rgba(154,203,255,0.2))', border: '1px solid #E4E9F0', color: '#111827' }}>
            {savingKey ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
            {aiConfig?.hasKey ? 'Actualizar Key Global' : 'Guardar Key Global'}
          </button>
        </div>
      </div>

      {/* Costos por modelo (editables) */}
      <div className="rounded-2xl overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid #E4E9F0' }}>
        <button onClick={() => setShowCosts(v => !v)}
          className="w-full p-5 flex items-center justify-between gap-4 transition-colors hover:bg-white/3">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-violet-400" />
            <p className="text-sm font-black text-[#111827] uppercase tracking-widest">Costos por Modelo (USD)</p>
          </div>
          <span className="text-[10px] text-[#111827]/30 font-bold">{showCosts ? 'OCULTAR' : 'EDITAR'}</span>
        </button>

        {showCosts && (
          <div className="p-5 pt-0 space-y-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <p className="text-[11px] text-[#111827]/40 mt-3 leading-relaxed">
              Define cuánto USD se descuenta por cada llamada a cada modelo. Los valores en blanco usan el default.
              Si dejás 0, ese modelo se cobra como gratis.
            </p>

            {!costs ? (
              <div className="flex items-center gap-2 text-[#111827]/30 text-xs py-4">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Cargando costos...
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {Object.keys(costs.defaults).map(model => {
                  const def = costs.defaults[model]
                  const eff = costs.effective[model]
                  const isCustom = Math.abs((eff ?? 0) - (def ?? 0)) > 0.00001
                  return (
                    <div key={model} className="flex items-center gap-2 p-2.5 rounded-xl"
                      style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-mono font-bold text-[#111827] truncate">{model}</p>
                        <p className="text-[9px] text-[#111827]/30">
                          default: ${def.toFixed(4)}{isCustom && <span className="ml-1.5 text-violet-400">· custom</span>}
                        </p>
                      </div>
                      <div className="relative w-24 shrink-0">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold pointer-events-none" style={{ color: '#6B7280' }}>$</span>
                        <input
                          type="number"
                          min="0"
                          step="0.0001"
                          value={costDraft[model] ?? ''}
                          onChange={e => setCostDraft(s => ({ ...s, [model]: e.target.value }))}
                          className="w-full pl-5 pr-2 py-1.5 rounded-lg text-[11px] font-mono text-[#111827] outline-none tabular-nums text-right"
                          style={{ background: '#F0F3F7', border: '1px solid rgba(255,255,255,0.10)' }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {costsMsg && (
              <p className={`text-xs px-3 py-2 rounded-xl ${costsMsg.type === 'ok' ? 'text-green-400 bg-green-500/10' : 'text-red-400 bg-red-500/10'}`}>
                {costsMsg.text}
              </p>
            )}

            <div className="flex gap-2 pt-1">
              <button onClick={saveCosts} disabled={savingCosts || !costs}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold disabled:opacity-40 transition-all"
                style={{ background: 'rgba(162,102,255,0.2)', border: '1px solid rgba(162,102,255,0.4)', color: '#a78bfa' }}>
                {savingCosts ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                Guardar costos
              </button>
              <button onClick={loadCosts}
                className="px-3 py-2 rounded-xl text-xs font-bold"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#6B7280' }}>
                Restablecer
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Users credits management */}
      <div className="rounded-2xl overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid #E4E9F0' }}>

        {/* Table header */}
        <div className="p-5 flex items-center justify-between gap-4 border-b"
          style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-sky-400" />
            <p className="text-sm font-black text-[#111827] uppercase tracking-widest">Créditos por Usuario</p>
          </div>
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#111827]/30" />
            <input
              type="text"
              placeholder="Buscar usuario..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 rounded-xl text-xs text-[#111827] placeholder-[#9CA3AF] outline-none"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid #E4E9F0' }}
            />
          </div>
        </div>

        {loadingUsers ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-5 h-5 animate-spin text-[#111827]/30" />
          </div>
        ) : users.length === 0 ? (
          <div className="py-12 text-center text-[#111827]/20 text-sm">Sin usuarios</div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            {users.map(u => (
              <div key={u.id} className="px-5 py-4">
                <div className="flex items-center gap-4">

                  {/* User info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-bold text-[#111827] truncate">{u.fullName}</p>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${PLAN_BADGE[u.plan] ?? PLAN_BADGE.NONE}`}>
                        {u.plan}
                      </span>
                      {!u.isActive && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full border bg-red-500/10 text-red-400 border-red-500/20">
                          INACTIVO
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#111827]/30">@{u.username} · {u.email}</p>
                    {u.preferOwnKey && (
                      <p className="text-[10px] text-sky-400 mt-0.5">Usa su propia key</p>
                    )}
                  </div>

                  {/* Balance USD badge */}
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl shrink-0"
                    style={{ background: 'rgba(162,102,255,0.12)', border: '1px solid rgba(162,102,255,0.25)' }}>
                    <Cpu className="w-3 h-3 text-violet-400" />
                    <span className="text-sm font-black text-[#111827] tabular-nums">${u.aiBalanceUsd.toFixed(2)}</span>
                    <span className="text-[10px] text-[#111827]/30">USD</span>
                  </div>

                  {/* Edit button */}
                  <button
                    onClick={() => {
                      setEditingUser(editingUser === u.id ? null : u.id)
                      setCreditInput(u.aiBalanceUsd.toFixed(2))
                      setCreditMode('set')
                    }}
                    className="text-xs font-bold px-3 py-1.5 rounded-xl transition-all"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid #E4E9F0', color: '#6B7280' }}>
                    Asignar
                  </button>
                </div>

                {/* Credit assignment panel */}
                {editingUser === u.id && (
                  <div className="mt-3 p-4 rounded-xl space-y-3"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid #E4E9F0' }}>

                    {/* Mode selector */}
                    <div className="flex gap-2">
                      {([
                        { value: 'set', icon: Hash, label: 'Fijar' },
                        { value: 'add', icon: Plus, label: 'Agregar' },
                        { value: 'subtract', icon: Minus, label: 'Quitar' },
                      ] as const).map(m => (
                        <button key={m.value} onClick={() => setCreditMode(m.value)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                          style={{
                            background: creditMode === m.value ? 'rgba(162,102,255,0.2)' : 'rgba(255,255,255,0.04)',
                            border: `1px solid ${creditMode === m.value ? 'rgba(162,102,255,0.4)' : '#E4E9F0'}`,
                            color: creditMode === m.value ? '#a78bfa' : '#6B7280',
                          }}>
                          <m.icon style={{ width: 11, height: 11 }} />
                          {m.label}
                        </button>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold pointer-events-none" style={{ color: '#6B7280' }}>$</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="Monto en USD"
                          value={creditInput}
                          onChange={e => setCreditInput(e.target.value)}
                          className="w-full rounded-xl pl-7 pr-3 py-2 text-sm text-[#111827] placeholder-[#9CA3AF] outline-none tabular-nums"
                          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid #E4E9F0' }}
                        />
                      </div>
                      <button onClick={() => assignCredits(u.id)} disabled={savingCredits || !creditInput}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold disabled:opacity-40"
                        style={{ background: 'rgba(162,102,255,0.2)', border: '1px solid rgba(162,102,255,0.4)', color: '#a78bfa' }}>
                        {savingCredits ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                        Guardar
                      </button>
                      <button onClick={() => setEditingUser(null)}
                        className="px-3 py-2 rounded-xl text-xs font-bold"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#6B7280' }}>
                        Cancelar
                      </button>
                    </div>

                    <p className="text-[10px] text-[#111827]/25">
                      {creditMode === 'set' && `Fijar saldo en exactamente $${parseFloat(creditInput || '0').toFixed(2)} USD`}
                      {creditMode === 'add' && `$${u.aiBalanceUsd.toFixed(2)} + $${parseFloat(creditInput || '0').toFixed(2)} = $${(u.aiBalanceUsd + (parseFloat(creditInput) || 0)).toFixed(2)} USD`}
                      {creditMode === 'subtract' && `$${u.aiBalanceUsd.toFixed(2)} − $${parseFloat(creditInput || '0').toFixed(2)} = $${Math.max(0, u.aiBalanceUsd - (parseFloat(creditInput) || 0)).toFixed(2)} USD`}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  </div>
  )
}
