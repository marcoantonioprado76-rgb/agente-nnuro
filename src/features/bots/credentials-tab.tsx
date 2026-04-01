'use client'

import { useState, useEffect } from 'react'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Eye, EyeOff, Lock, Save, Loader2, Cpu, Power, Phone, Key, Zap, Brain, Shield, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import type { Bot, GptModel } from '@/types'

interface CredentialsTabProps {
  botId: string
}

const GPT_MODELS: { value: GptModel; label: string; description: string; tier: string }[] = [
  { value: 'gpt-5.1', label: 'GPT-5.1', description: 'Ultimo modelo, maxima inteligencia', tier: 'Ultra' },
  { value: 'gpt-4.1', label: 'GPT-4.1', description: 'Mas avanzado y preciso', tier: 'Premium' },
  { value: 'gpt-4.1-mini', label: 'GPT-4.1 Mini', description: 'Rapido y eficiente', tier: 'Standard' },
  { value: 'gpt-4.1-nano', label: 'GPT-4.1 Nano', description: 'Ultra rapido, menor costo', tier: 'Basic' },
  { value: 'gpt-4o', label: 'GPT-4o', description: 'Multimodal avanzado', tier: 'Pro' },
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini', description: 'Economico y rapido', tier: 'Standard' },
]

export function CredentialsTab({ botId }: CredentialsTabProps) {
  const [loading, setLoading] = useState(true)
  const [isActive, setIsActive] = useState(true)
  const [apiKey, setApiKey] = useState('')
  const [reportPhone, setReportPhone] = useState('')
  const [gptModel, setGptModel] = useState<GptModel>('gpt-5.1')
  const [showKey, setShowKey] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function loadBot() {
      try {
        const res = await fetch(`/api/bots/${botId}`)
        if (res.ok) {
          const bot: Bot = await res.json()
          setIsActive(bot.is_active)
          setApiKey(bot.openai_api_key || '')
          setReportPhone(bot.report_phone || '')
          setGptModel((bot.gpt_model as GptModel) || 'gpt-5.1')
        }
      } catch {
        toast.error('Error al cargar datos del bot')
      } finally {
        setLoading(false)
      }
    }
    loadBot()
  }, [botId])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/bots/${botId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_active: isActive,
          openai_api_key: apiKey || null,
          report_phone: reportPhone || null,
          gpt_model: gptModel,
        }),
      })
      if (res.ok) {
        toast.success('Credenciales guardadas correctamente')
      } else {
        const err = await res.json()
        toast.error(err.error || 'Error al guardar')
      }
    } catch {
      toast.error('Error al guardar las credenciales')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <div className="w-12 h-12 rounded-full border-2 animate-spin" style={{ borderColor: 'rgba(245, 158, 11, 0.15)', borderTopColor: '#F59E0B' }} />
            <Key className="absolute inset-0 m-auto h-4 w-4 text-[#F59E0B]" />
          </div>
          <p className="text-sm text-[#94A3B8]">Cargando credenciales...</p>
        </div>
      </div>
    )
  }

  const selectedModel = GPT_MODELS.find(m => m.value === gptModel)

  return (
    <div className="space-y-5">

      {/* ── Estado del bot ── */}
      <div
        className="relative overflow-hidden rounded-2xl p-5"
        style={{
          background: 'linear-gradient(180deg, rgba(17, 29, 53, 0.9) 0%, rgba(13, 21, 41, 0.95) 100%)',
          border: `1px solid ${isActive ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255, 255, 255, 0.06)'}`,
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-xl shrink-0"
              style={{
                background: isActive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(148, 163, 184, 0.08)',
                border: `1px solid ${isActive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(148, 163, 184, 0.08)'}`,
              }}
            >
              <Power className="h-5 w-5" style={{ color: isActive ? '#10B981' : '#94A3B8' }} />
            </div>
            <div>
              <h2 className="text-[15px] font-semibold text-white">Estado del agente</h2>
              <p className="text-[12px] text-[#94A3B8]/70 mt-0.5">
                {isActive ? 'El agente esta respondiendo mensajes automaticamente' : 'El agente esta pausado y no responde mensajes'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 h-6 text-[10px] font-semibold"
              style={{
                background: isActive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                color: isActive ? '#10B981' : '#EF4444',
                border: `1px solid ${isActive ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
              }}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-[#10B981] animate-pulse' : 'bg-[#EF4444]'}`} />
              {isActive ? 'Activo' : 'Inactivo'}
            </span>
            <Switch
              checked={isActive}
              onCheckedChange={setIsActive}
              className="data-[state=checked]:bg-[#10B981]"
            />
          </div>
        </div>
      </div>

      {/* ── Modelo de IA ── */}
      <div
        className="rounded-2xl p-5"
        style={{
          background: 'linear-gradient(180deg, rgba(17, 29, 53, 0.9) 0%, rgba(13, 21, 41, 0.95) 100%)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
        }}
      >
        <div className="flex items-center gap-3 mb-5">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg"
            style={{ background: 'rgba(167, 139, 250, 0.1)', border: '1px solid rgba(167, 139, 250, 0.15)' }}
          >
            <Brain className="h-4 w-4 text-[#A78BFA]" />
          </div>
          <div>
            <h2 className="text-[15px] font-semibold text-white">Modelo de IA</h2>
            <p className="text-[11px] text-[#94A3B8]/60">Selecciona el cerebro de tu agente</p>
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#94A3B8]/50">Modelo GPT</label>
          <Select value={gptModel} onValueChange={(v) => setGptModel(v as GptModel)}>
            <SelectTrigger
              className="h-12 text-white rounded-xl"
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <SelectValue placeholder="Selecciona un modelo" />
            </SelectTrigger>
            <SelectContent
              className="rounded-xl"
              style={{
                background: 'linear-gradient(180deg, #111D35, #0D1529)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              {GPT_MODELS.map((model) => (
                <SelectItem
                  key={model.value}
                  value={model.value}
                  className="text-white focus:bg-[#A78BFA]/15 focus:text-white rounded-lg py-2.5"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-[13px]">{model.label}</span>
                    <span className="text-[11px] text-[#94A3B8]/50">{model.description}</span>
                    <span
                      className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded"
                      style={{
                        background: model.tier === 'Premium' ? 'rgba(245, 158, 11, 0.12)' : 'rgba(255, 255, 255, 0.04)',
                        color: model.tier === 'Premium' ? '#F59E0B' : '#94A3B8',
                      }}
                    >
                      {model.tier}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Current model indicator */}
          {selectedModel && (
            <div
              className="flex items-center gap-2.5 rounded-lg px-3 py-2"
              style={{ background: 'rgba(167, 139, 250, 0.06)', border: '1px solid rgba(167, 139, 250, 0.08)' }}
            >
              <Sparkles className="h-3 w-3 text-[#A78BFA]" />
              <span className="text-[11px] text-[#94A3B8]">
                Usando <span className="text-white font-medium">{selectedModel.label}</span> — {selectedModel.description}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Claves de API ── */}
      <div
        className="rounded-2xl p-5"
        style={{
          background: 'linear-gradient(180deg, rgba(17, 29, 53, 0.9) 0%, rgba(13, 21, 41, 0.95) 100%)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
        }}
      >
        <div className="flex items-center gap-3 mb-5">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg"
            style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.15)' }}
          >
            <Shield className="h-4 w-4 text-[#F59E0B]" />
          </div>
          <div>
            <h2 className="text-[15px] font-semibold text-white">Claves de API</h2>
            <p className="text-[11px] text-[#94A3B8]/60">Credenciales de acceso seguro</p>
          </div>
        </div>

        <div className="space-y-5">
          {/* OpenAI API Key */}
          <div className="space-y-2.5">
            <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#94A3B8]/50">
              OpenAI API Key
            </label>
            <div className="relative">
              <div
                className="absolute left-0 top-0 bottom-0 flex items-center pl-3.5 pointer-events-none"
              >
                <Lock className="h-4 w-4 text-[#94A3B8]/30" />
              </div>
              <Input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-proj-..."
                className="h-12 pl-10 pr-12 text-white rounded-xl placeholder:text-[#94A3B8]/25"
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]/40 transition-colors hover:text-white"
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-[11px] text-[#94A3B8]/40">
              Si no configuras una API Key, se usara la del sistema.
            </p>
          </div>

          {/* Divider */}
          <div className="h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent)' }} />

          {/* Report Phone */}
          <div className="space-y-2.5">
            <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#94A3B8]/50">
              Numero interno para reportes
            </label>
            <div className="relative">
              <div className="absolute left-0 top-0 bottom-0 flex items-center pl-3.5 pointer-events-none">
                <Phone className="h-4 w-4 text-[#94A3B8]/30" />
              </div>
              <Input
                value={reportPhone}
                onChange={(e) => setReportPhone(e.target.value)}
                placeholder="1955967654"
                className="h-12 pl-10 text-white rounded-xl placeholder:text-[#94A3B8]/25"
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              />
            </div>
            <p className="text-[11px] text-[#94A3B8]/40">
              Cuando un cliente confirme su pedido, el bot enviara un reporte a este numero.
            </p>
          </div>
        </div>
      </div>

      {/* ── Save Button ── */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="flex w-full items-center justify-center gap-2.5 rounded-xl h-12 text-white font-semibold text-[14px] transition-all duration-200 hover:opacity-90 disabled:opacity-50"
        style={{
          background: 'linear-gradient(135deg, #F59E0B, #D97706)',
          boxShadow: '0 4px 16px rgba(245, 158, 11, 0.25)',
        }}
      >
        {saving ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Save className="h-5 w-5" />
        )}
        Guardar credenciales
      </button>
    </div>
  )
}
