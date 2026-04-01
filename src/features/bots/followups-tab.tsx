'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Clock, Check, HelpCircle, Loader2, Timer, Bell, ArrowRight, Sparkles } from 'lucide-react'
import { toast } from 'sonner'

interface FollowupsTabProps {
  botId: string
}

export function FollowupsTab({ botId }: FollowupsTabProps) {
  const [firstFollowup, setFirstFollowup] = useState(15)
  const [secondFollowup, setSecondFollowup] = useState(1440)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch(`/api/followups?botId=${botId}`)
        if (res.ok) {
          const data = await res.json()
          setFirstFollowup(data.first_followup_minutes ?? 15)
          setSecondFollowup(data.second_followup_minutes ?? 1440)
        }
      } catch {
        // Use defaults
      } finally {
        setLoading(false)
      }
    }
    loadSettings()
  }, [botId])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/followups', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botId,
          first_followup_minutes: firstFollowup,
          second_followup_minutes: secondFollowup,
        }),
      })
      if (res.ok) {
        toast.success('Configuración de seguimientos guardada')
      } else {
        const err = await res.json()
        toast.error(err.error || 'Error al guardar')
      }
    } catch {
      toast.error('Error al guardar la configuración')
    } finally {
      setSaving(false)
    }
  }

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours < 24) return mins ? `${hours}h ${mins}m` : `${hours}h`
    const days = Math.floor(hours / 24)
    const remainHours = hours % 24
    return remainHours ? `${days}d ${remainHours}h` : `${days}d`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <div className="w-12 h-12 rounded-full border-2 animate-spin" style={{ borderColor: 'rgba(16, 185, 129, 0.15)', borderTopColor: '#10B981' }} />
            <Clock className="absolute inset-0 m-auto h-4 w-4 text-[#10B981]" />
          </div>
          <p className="text-sm text-[#94A3B8]">Cargando seguimientos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">

      {/* ── Configuración de Seguimientos ── */}
      <div
        className="rounded-2xl p-4 md:p-5"
        style={{
          background: 'linear-gradient(180deg, rgba(17, 29, 53, 0.9) 0%, rgba(13, 21, 41, 0.95) 100%)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
        }}
      >
        <div className="flex items-center gap-3 mb-2">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg shrink-0"
            style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.15)' }}
          >
            <Timer className="h-4 w-4 text-[#10B981]" />
          </div>
          <div>
            <h2 className="text-[15px] font-semibold text-white">Configuracion de seguimientos</h2>
            <p className="text-[11px] text-[#94A3B8]/60">Define los intervalos para re-interactuar con clientes</p>
          </div>
        </div>

        {/* Timeline visual - horizontal on desktop, vertical on mobile */}
        <div className="hidden md:flex items-center justify-center gap-3 my-6 px-4">
          <div
            className="flex flex-col items-center gap-1.5 rounded-xl px-4 py-3"
            style={{ background: 'rgba(86, 204, 242, 0.06)', border: '1px solid rgba(86, 204, 242, 0.1)' }}
          >
            <span className="text-[10px] text-[#94A3B8]/50 uppercase tracking-wider font-medium">Ultimo mensaje</span>
            <span className="text-[11px] font-medium text-[#56CCF2]">Bot envia</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-8 h-px bg-[#10B981]/30" />
            <span className="text-[10px] text-[#10B981] font-mono font-bold">{formatTime(firstFollowup)}</span>
            <div className="w-8 h-px bg-[#10B981]/30" />
          </div>
          <div
            className="flex flex-col items-center gap-1.5 rounded-xl px-4 py-3"
            style={{ background: 'rgba(16, 185, 129, 0.06)', border: '1px solid rgba(16, 185, 129, 0.1)' }}
          >
            <span className="text-[10px] text-[#94A3B8]/50 uppercase tracking-wider font-medium">1er seguimiento</span>
            <Bell className="h-3.5 w-3.5 text-[#10B981]" />
          </div>
          <div className="flex items-center gap-1">
            <div className="w-8 h-px bg-[#F59E0B]/30" />
            <span className="text-[10px] text-[#F59E0B] font-mono font-bold">{formatTime(secondFollowup)}</span>
            <div className="w-8 h-px bg-[#F59E0B]/30" />
          </div>
          <div
            className="flex flex-col items-center gap-1.5 rounded-xl px-4 py-3"
            style={{ background: 'rgba(245, 158, 11, 0.06)', border: '1px solid rgba(245, 158, 11, 0.1)' }}
          >
            <span className="text-[10px] text-[#94A3B8]/50 uppercase tracking-wider font-medium">2do seguimiento</span>
            <Bell className="h-3.5 w-3.5 text-[#F59E0B]" />
          </div>
        </div>

        {/* Mobile timeline - vertical steps */}
        <div className="flex md:hidden flex-col gap-2 my-4">
          {[
            { label: 'Bot envia mensaje', time: '', color: '#56CCF2', bg: 'rgba(86, 204, 242, 0.06)', border: 'rgba(86, 204, 242, 0.1)' },
            { label: '1er seguimiento', time: formatTime(firstFollowup), color: '#10B981', bg: 'rgba(16, 185, 129, 0.06)', border: 'rgba(16, 185, 129, 0.1)' },
            { label: '2do seguimiento', time: formatTime(secondFollowup), color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.06)', border: 'rgba(245, 158, 11, 0.1)' },
          ].map((step, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="flex flex-col items-center">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: step.color }} />
                {i < 2 && <div className="w-px h-6" style={{ background: `${step.color}30` }} />}
              </div>
              <div
                className="flex-1 flex items-center justify-between rounded-lg px-3 py-2"
                style={{ background: step.bg, border: `1px solid ${step.border}` }}
              >
                <span className="text-[11px] font-medium" style={{ color: step.color }}>{step.label}</span>
                {step.time && <span className="text-[10px] font-mono font-bold" style={{ color: step.color }}>{step.time}</span>}
              </div>
            </div>
          ))}
        </div>

        {/* Input fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 1er Seguimiento */}
          <div
            className="rounded-xl p-4 space-y-3"
            style={{ background: 'rgba(16, 185, 129, 0.04)', border: '1px solid rgba(16, 185, 129, 0.1)' }}
          >
            <div className="flex items-center gap-2.5">
              <div
                className="flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold"
                style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10B981' }}
              >
                1
              </div>
              <span className="text-[12px] font-medium text-[#10B981]">Primer seguimiento</span>
            </div>
            <div className="relative flex items-center">
              <Input
                type="number"
                value={firstFollowup}
                onChange={(e) => setFirstFollowup(parseInt(e.target.value) || 0)}
                min={1}
                className="h-14 text-2xl font-bold text-white text-center pr-20 rounded-lg"
                style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.06)' }}
              />
              <span className="absolute right-4 text-[10px] uppercase tracking-wider text-[#94A3B8]/40 font-semibold">
                Minutos
              </span>
            </div>
            <p className="text-[10px] text-[#94A3B8]/40">Por defecto: 15 min</p>
          </div>

          {/* 2do Seguimiento */}
          <div
            className="rounded-xl p-4 space-y-3"
            style={{ background: 'rgba(245, 158, 11, 0.04)', border: '1px solid rgba(245, 158, 11, 0.1)' }}
          >
            <div className="flex items-center gap-2.5">
              <div
                className="flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold"
                style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B' }}
              >
                2
              </div>
              <span className="text-[12px] font-medium text-[#F59E0B]">Segundo seguimiento</span>
            </div>
            <div className="relative flex items-center">
              <Input
                type="number"
                value={secondFollowup}
                onChange={(e) => setSecondFollowup(parseInt(e.target.value) || 0)}
                min={1}
                className="h-14 text-2xl font-bold text-white text-center pr-20 rounded-lg"
                style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.06)' }}
              />
              <span className="absolute right-4 text-[10px] uppercase tracking-wider text-[#94A3B8]/40 font-semibold">
                Minutos
              </span>
            </div>
            <p className="text-[10px] text-[#94A3B8]/40">Por defecto: 1,440 min / 1 dia</p>
          </div>
        </div>

        {/* Save */}
        <div className="flex justify-end mt-5">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-xl px-6 h-10 text-white text-[13px] font-semibold transition-all duration-200 hover:opacity-90 disabled:opacity-50"
            style={{
              background: 'linear-gradient(135deg, #10B981, #059669)',
              boxShadow: '0 4px 16px rgba(16, 185, 129, 0.25)',
            }}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            Guardar cambios
          </button>
        </div>
      </div>

      {/* ── Como funciona ── */}
      <div
        className="rounded-2xl p-4 md:p-5"
        style={{
          background: 'linear-gradient(180deg, rgba(17, 29, 53, 0.9) 0%, rgba(13, 21, 41, 0.95) 100%)',
          border: '1px solid rgba(16, 185, 129, 0.08)',
        }}
      >
        <div className="flex items-start gap-3">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg shrink-0 mt-0.5"
            style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.15)' }}
          >
            <Sparkles className="h-4 w-4 text-[#10B981]" />
          </div>
          <div>
            <h3 className="text-[14px] font-semibold text-white mb-2">Como funciona</h3>
            <p className="text-[12px] text-[#94A3B8]/70 leading-relaxed">
              El sistema calcula el tiempo desde el{' '}
              <span className="font-semibold text-white">ultimo mensaje enviado por el bot</span>.
              Si el cliente no responde en ese intervalo, el bot envia un mensaje automatico.
              Los seguimientos se detienen si el cliente compra o si vuelve a escribir.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
