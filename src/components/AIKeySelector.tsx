'use client'

import { useState, useEffect } from 'react'
import { ShieldCheck, Key, Cpu, ChevronDown, Loader2, ExternalLink } from 'lucide-react'
import Link from 'next/link'

interface AIConfig {
  aiCredits: number
  aiBalanceUsd: number
  preferOwnKey: boolean
  adminHasKey: boolean
  ownKey: { model: string; isValid: boolean; apiKeyMasked: string } | null
}

interface Props {
  /** Called when config changes (parent can re-fetch after toggle) */
  onChange?: (preferOwnKey: boolean) => void
  /** Compact mode — no description text, smaller */
  compact?: boolean
}

export default function AIKeySelector({ onChange, compact = false }: Props) {
  const [config, setConfig] = useState<AIConfig | null>(null)
  const [open, setOpen] = useState(false)
  const [toggling, setToggling] = useState(false)

  async function load() {
    const res = await fetch('/api/credits')
    if (res.ok) setConfig(await res.json())
  }

  useEffect(() => { load() }, [])

  async function toggle(preferOwn: boolean) {
    setToggling(true)
    await fetch('/api/credits', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preferOwnKey: preferOwn }),
    })
    setToggling(false)
    setOpen(false)
    await load()
    onChange?.(preferOwn)
  }

  if (!config) return null

  const usingOwn = config.preferOwnKey && !!config.ownKey
  const usingAdmin = !usingOwn && config.adminHasKey
  const noSource = !usingOwn && !usingAdmin

  const lowBalance = usingAdmin && config.aiBalanceUsd < 0.10

  const label = usingOwn
    ? `Mi Key · ${config.ownKey?.model}`
    : usingAdmin
    ? `Admin AI · $${config.aiBalanceUsd.toFixed(2)}`
    : 'Sin key configurada'

  const dotColor = usingOwn ? '#60a5fa' : lowBalance ? '#f59e0b' : usingAdmin ? '#a78bfa' : '#ef4444'

  return (
    <div className="relative inline-block shrink-0 max-w-full">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 rounded-xl transition-all max-w-full"
        style={{
          padding: compact ? '5px 10px' : '7px 14px',
          background: 'linear-gradient(135deg, #0B1B2B 0%, #081624 100%)',
          border: '1px solid rgba(255,255,255,0.12)',
          color: 'rgba(255,255,255,0.88)',
          boxShadow: '0 8px 20px -10px rgba(8,22,36,0.6)',
          fontSize: compact ? 11 : 12,
          fontWeight: 600,
        }}>
        <Cpu className="shrink-0" style={{ width: compact ? 12 : 14, height: compact ? 12 : 14 }} />
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ background: dotColor, boxShadow: `0 0 6px ${dotColor}` }}
        />
        <span className="truncate whitespace-nowrap" style={{ maxWidth: compact ? 160 : 200 }}>
          {label}
        </span>
        {toggling
          ? <Loader2 style={{ width: 12, height: 12 }} className="animate-spin shrink-0" />
          : <ChevronDown className="shrink-0" style={{ width: 12, height: 12, opacity: 0.5 }} />
        }
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          {/* Dropdown — en móvil se ancla a la derecha pero respeta el viewport */}
          <div className="absolute right-0 mt-1.5 z-50 rounded-2xl overflow-hidden shadow-2xl"
            style={{
              width: 240,
              maxWidth: 'calc(100vw - 24px)',
              background: 'rgba(28,25,44,0.97)',
              border: '1px solid rgba(255,255,255,0.15)',
              backdropFilter: 'blur(20px)',
            }}>
            <div className="p-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
              <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>
                Fuente de IA
              </p>
            </div>

            {/* Admin key option */}
            <button
              onClick={() => config.adminHasKey && toggle(false)}
              disabled={!config.adminHasKey || toggling}
              className="w-full flex items-center gap-3 p-3 transition-colors text-left"
              style={{
                background: usingAdmin ? 'rgba(162,102,255,0.12)' : 'transparent',
                opacity: !config.adminHasKey ? 0.4 : 1,
                cursor: !config.adminHasKey ? 'not-allowed' : 'pointer',
              }}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: 'rgba(162,102,255,0.15)', border: '1px solid rgba(162,102,255,0.3)' }}>
                <ShieldCheck style={{ width: 13, height: 13, color: '#a78bfa' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white">Key del Admin</p>
                <p className="text-[10px]" style={{ color: lowBalance ? '#fbbf24' : 'rgba(255,255,255,0.35)' }}>
                  {config.adminHasKey
                    ? lowBalance
                      ? `$${config.aiBalanceUsd.toFixed(2)} USD · saldo bajo`
                      : `$${config.aiBalanceUsd.toFixed(2)} USD disponibles`
                    : 'No configurada'}
                </p>
              </div>
              {usingAdmin && <div className="w-3 h-3 rounded-full bg-violet-400" />}
            </button>

            {/* CTA de compra cuando saldo bajo y usa key del admin */}
            {usingAdmin && lowBalance && (
              <div className="px-3 py-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                <Link href="/dashboard/wallet"
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-center gap-1.5 w-full py-2 rounded-xl text-[11px] font-black"
                  style={{
                    background: 'linear-gradient(135deg, rgba(251,191,36,0.20), rgba(251,146,60,0.15))',
                    border: '1px solid rgba(251,191,36,0.40)',
                    color: '#fbbf24',
                  }}>
                  + Comprar saldo
                </Link>
              </div>
            )}

            {/* Own key option */}
            <button
              onClick={() => config.ownKey?.isValid && toggle(true)}
              disabled={!config.ownKey?.isValid || toggling}
              className="w-full flex items-center gap-3 p-3 transition-colors text-left"
              style={{
                background: usingOwn ? 'rgba(154,203,255,0.1)' : 'transparent',
                opacity: !config.ownKey?.isValid ? 0.4 : 1,
                cursor: !config.ownKey?.isValid ? 'not-allowed' : 'pointer',
              }}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: 'rgba(154,203,255,0.12)', border: '1px solid rgba(154,203,255,0.3)' }}>
                <Key style={{ width: 13, height: 13, color: '#7dd3fc' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white">Mi API Key</p>
                <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  {config.ownKey?.isValid ? config.ownKey.apiKeyMasked : 'No configurada'}
                </p>
              </div>
              {usingOwn && <div className="w-3 h-3 rounded-full bg-sky-400" />}
            </button>

            {noSource && (
              <div className="px-3 pb-3">
                <Link href="/dashboard/wallet"
                  className="flex items-center justify-center gap-1.5 w-full py-2 rounded-xl text-xs font-bold"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}
                  onClick={() => setOpen(false)}>
                  <ExternalLink style={{ width: 11, height: 11 }} />
                  Configurar key
                </Link>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
