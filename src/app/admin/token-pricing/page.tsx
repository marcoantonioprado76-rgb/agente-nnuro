'use client'

import { useState, useEffect } from 'react'
import { Loader2, Save, RotateCcw, CheckCircle, AlertCircle, Cpu } from 'lucide-react'

interface TokenPricing { input: number; output: number }
interface PricingData {
  defaults: Record<string, TokenPricing>
  overrides: Record<string, TokenPricing>
  effective: Record<string, TokenPricing>
  updatedAt: string | null
}

export default function TokenPricingAdmin() {
  const [data, setData] = useState<PricingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [draft, setDraft] = useState<Record<string, TokenPricing>>({})
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/token-pricing')
      if (!res.ok) throw new Error('No autorizado')
      const json: PricingData = await res.json()
      setData(json)
      setDraft(JSON.parse(JSON.stringify(json.effective)))
    } catch (e: any) {
      setMsg({ type: 'err', text: e?.message || 'Error cargando tarifas' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function updateField(model: string, field: 'input' | 'output', raw: string) {
    const num = parseFloat(raw)
    setDraft(prev => ({
      ...prev,
      [model]: {
        ...prev[model],
        [field]: Number.isFinite(num) && num >= 0 ? num : 0,
      },
    }))
  }

  function resetField(model: string) {
    if (!data) return
    setDraft(prev => ({
      ...prev,
      [model]: { ...data.defaults[model] },
    }))
  }

  function isOverridden(model: string): boolean {
    if (!data) return false
    const d = data.defaults[model]
    const e = draft[model]
    if (!d || !e) return false
    return d.input !== e.input || d.output !== e.output
  }

  async function save() {
    if (!data) return
    setSaving(true)
    setMsg(null)
    try {
      // Solo mandar models que difieran del default
      const pricing: Record<string, TokenPricing> = {}
      for (const [model, p] of Object.entries(draft)) {
        const def = data.defaults[model]
        if (!def) continue
        if (p.input !== def.input || p.output !== def.output) {
          pricing[model] = p
        }
      }

      const res = await fetch('/api/admin/token-pricing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pricing }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j?.error || 'Error guardando')
      }
      setMsg({ type: 'ok', text: 'Tarifas guardadas. Cache de 60s se invalidó.' })
      await load()
    } catch (e: any) {
      setMsg({ type: 'err', text: e?.message || 'Error guardando' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="w-7 h-7 animate-spin text-[#111827]/40" />
      </div>
    )
  }

  if (!data) {
    return <div className="p-6 text-[#111827]/50">No se pudieron cargar las tarifas.</div>
  }

  const models = Object.keys(data.defaults)

  return (
  <div className="dm-page font-ui">
    <div className="px-4 sm:px-6 pt-6 max-w-3xl mx-auto pb-24 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: 'rgba(162,102,255,0.15)', border: '1px solid rgba(162,102,255,0.30)' }}>
          <Cpu className="w-5 h-5 text-violet-300" />
        </div>
        <div>
          <h1 className="text-xl font-black text-[#111827]">Tarifas por token</h1>
          <p className="text-xs text-[#111827]/40">USD por 1M tokens · markup 1:1 sobre OpenAI</p>
        </div>
      </div>

      <div className="text-[12px] leading-relaxed p-4 rounded-xl"
        style={{ background: 'rgba(125,211,252,0.06)', border: '1px solid rgba(125,211,252,0.20)', color: 'rgba(255,255,255,0.65)' }}>
        Estas tarifas se cobran del saldo USD del usuario cuando usa la <b>admin key</b>.
        Si tiene su propia OpenAI key, OpenAI le factura directo y NO se descuenta nada.
        <br />
        Los valores se mergean con los defaults: solo se persisten los que difieran.
        El cache se refresca cada 60s.
        {data.updatedAt && (
          <span className="block mt-2 text-[10px] uppercase tracking-[0.2em] text-[#111827]/30">
            Última edición: {new Date(data.updatedAt).toLocaleString()}
          </span>
        )}
      </div>

      <div className="space-y-2">
        {models.map(model => {
          const overridden = isOverridden(model)
          const cur = draft[model] || { input: 0, output: 0 }
          const def = data.defaults[model]
          return (
            <div key={model} className="rounded-xl p-4"
              style={{
                background: overridden ? 'rgba(162,102,255,0.06)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${overridden ? 'rgba(162,102,255,0.30)' : 'rgba(255,255,255,0.08)'}`,
              }}>
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-black text-[#111827] font-mono">{model}</p>
                  {overridden && (
                    <span className="text-[9px] font-black uppercase tracking-[0.15em] px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(162,102,255,0.18)', border: '1px solid rgba(162,102,255,0.35)', color: '#c4b5fd' }}>
                      Custom
                    </span>
                  )}
                </div>
                {overridden && (
                  <button onClick={() => resetField(model)}
                    className="flex items-center gap-1 text-[10px] uppercase tracking-[0.15em] text-[#111827]/50 hover:text-[#111827]/80">
                    <RotateCcw className="w-3 h-3" /> Reset
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="block text-[10px] uppercase tracking-[0.2em] text-[#111827]/40 mb-1">Input ($ / 1M tk)</span>
                  <input type="number" step="0.01" min="0" value={cur.input}
                    onChange={e => updateField(model, 'input', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#F4F6FA] border border-[#E4E9F0] text-sm font-mono text-[#111827] focus:border-[#B735B8] focus:outline-none" />
                  <span className="block text-[10px] text-[#111827]/30 mt-1 font-mono">default: ${def.input}</span>
                </label>
                <label className="block">
                  <span className="block text-[10px] uppercase tracking-[0.2em] text-[#111827]/40 mb-1">Output ($ / 1M tk)</span>
                  <input type="number" step="0.01" min="0" value={cur.output}
                    onChange={e => updateField(model, 'output', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#F4F6FA] border border-[#E4E9F0] text-sm font-mono text-[#111827] focus:border-[#B735B8] focus:outline-none" />
                  <span className="block text-[10px] text-[#111827]/30 mt-1 font-mono">default: ${def.output}</span>
                </label>
              </div>
            </div>
          )
        })}
      </div>

      <div className="sticky bottom-0 pb-2">
        <div className="flex items-center gap-3 p-3 rounded-xl"
          style={{ background: 'rgba(7,8,15,0.92)', border: '1px solid rgba(255,255,255,0.10)', backdropFilter: 'blur(10px)' }}>
          {msg && (
            <div className={`flex items-center gap-2 text-xs ${msg.type === 'ok' ? 'text-emerald-400' : 'text-red-400'}`}>
              {msg.type === 'ok' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              {msg.text}
            </div>
          )}
          <button onClick={save} disabled={saving}
            className="ml-auto flex items-center gap-2 px-5 py-2 rounded-xl font-black text-sm uppercase tracking-[0.15em] transition-all disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #a78bfa 0%, #d203dd 100%)', color: '#fff' }}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Guardar
          </button>
        </div>
      </div>
    </div>
  </div>
  )
}
