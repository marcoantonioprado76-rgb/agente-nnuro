'use client'

import { useEffect, useState } from 'react'

/**
 * Modal de confirmación propio (reemplaza el window.confirm() nativo del navegador).
 *
 * Uso desde cualquier parte:
 *   import { confirmDialog } from '@/components/ConfirmDialog'
 *   if (!(await confirmDialog('¿Eliminar esto?'))) return
 *
 * Requiere montar <ConfirmHost /> UNA vez en el layout raíz.
 */

type ConfirmOpts = {
  title?: string
  confirmText?: string
  cancelText?: string
  danger?: boolean
}
type Pending = { message: string; opts: ConfirmOpts; resolve: (v: boolean) => void }

let _listener: ((p: Pending | null) => void) | null = null

export function confirmDialog(message: string, opts: ConfirmOpts = {}): Promise<boolean> {
  return new Promise((resolve) => {
    // Fallback: si el host no está montado, usar el confirm nativo para no romper el flujo.
    if (!_listener) {
      resolve(typeof window !== 'undefined' ? window.confirm(message) : false)
      return
    }
    _listener({ message, opts, resolve })
  })
}

export function ConfirmHost() {
  const [p, setP] = useState<Pending | null>(null)

  useEffect(() => {
    _listener = setP
    return () => { _listener = null }
  }, [])

  useEffect(() => {
    if (!p) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { p.resolve(false); setP(null) }
      if (e.key === 'Enter') { p.resolve(true); setP(null) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [p])

  if (!p) return null

  const close = (v: boolean) => { p.resolve(v); setP(null) }
  const danger = p.opts.danger ?? /elimin|borra|quitar|desconect|permanente|no se puede deshacer|olvidar/i.test(p.message)
  const title = p.opts.title ?? (danger ? 'Confirmar' : '¿Continuar?')
  const confirmText = p.opts.confirmText ?? 'Aceptar'
  const cancelText = p.opts.cancelText ?? 'Cancelar'

  const accent = danger ? '#ef4444' : '#1fb8bb'
  const accentGlow = danger ? 'rgba(239,68,68,.35)' : 'rgba(99,102,241,.35)'

  return (
    <div
      onClick={() => close(false)}
      style={{
        position: 'fixed', inset: 0, zIndex: 2147483000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16, background: 'rgba(2,4,10,.66)', backdropFilter: 'blur(4px)',
        animation: 'jadeConfirmFade .15s ease-out',
      }}
    >
      <style>{`@keyframes jadeConfirmFade{from{opacity:0}to{opacity:1}}@keyframes jadeConfirmPop{from{opacity:0;transform:translateY(8px) scale(.97)}to{opacity:1;transform:none}}`}</style>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 400, background: '#12141f',
          border: '1px solid rgba(255,255,255,.1)', borderRadius: 20,
          boxShadow: '0 24px 70px rgba(0,0,0,.55)', padding: 24,
          animation: 'jadeConfirmPop .18s cubic-bezier(.2,.8,.2,1)',
          fontFamily: "'Montserrat', system-ui, sans-serif",
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12, flexShrink: 0,
            background: `rgba(${danger ? '239,68,68' : '99,102,241'},.14)`,
            border: `1px solid ${accentGlow}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <h3 style={{ margin: 0, color: '#fff', fontSize: 17, fontWeight: 800 }}>{title}</h3>
        </div>

        <p style={{ margin: '0 0 22px', color: 'rgba(255,255,255,.72)', fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-line' }}>
          {p.message}
        </p>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <button
            onClick={() => close(false)}
            style={{
              background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.12)',
              color: '#cbd5e1', fontWeight: 700, fontSize: 14, padding: '11px 20px',
              borderRadius: 12, cursor: 'pointer',
            }}
          >{cancelText}</button>
          <button
            autoFocus
            onClick={() => close(true)}
            style={{
              background: accent, border: 'none', color: '#fff', fontWeight: 800, fontSize: 14,
              padding: '11px 22px', borderRadius: 12, cursor: 'pointer',
              boxShadow: `0 8px 24px ${accentGlow}`,
            }}
          >{confirmText}</button>
        </div>
      </div>
    </div>
  )
}
