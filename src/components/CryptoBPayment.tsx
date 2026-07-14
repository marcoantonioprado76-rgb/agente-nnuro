'use client'

import { useState, useEffect } from 'react'
import { Loader2, Copy, Check } from 'lucide-react'

/**
 * Pago cripto a UNA sola dirección con auto-detección por monto único (crypto-B).
 * Sin conectar wallet, sin pegar hash: muestra dirección + monto exacto y hace polling
 * hasta que se detecta el pago. Reutilizable para planes y créditos.
 */
export function CryptoBPayment({ startUrl, startBody, checkUrlBase, cancelUrl, onApproved, onCancel }: {
  startUrl: string
  startBody: Record<string, unknown>
  checkUrlBase: string
  cancelUrl?: string
  onApproved: () => void
  onCancel?: () => void
}) {
  const [pay, setPay] = useState<{ id: string; receiver: string; amount: number } | null>(null)
  const [error, setError] = useState('')
  const [starting, setStarting] = useState(true)
  const [copied, setCopied] = useState<'addr' | 'amt' | null>(null)

  async function handleCancel() {
    const id = pay?.id
    if (id && cancelUrl) {
      try {
        const r = await fetch(cancelUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) }).then(x => x.json())
        if (r.credited) { onApproved(); return }
        // No se pudo verificar el pago (RPC caído): no cambiamos de método para no perder un pago en curso.
        if (r.retry) { setError(r.error || 'No se pudo verificar el pago ahora. Intentá de nuevo.'); return }
      } catch { /* igual cancelamos en la UI */ }
    }
    onCancel?.()
  }

  useEffect(() => {
    let alive = true
    fetch(startUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(startBody) })
      .then(r => r.json())
      .then(d => { if (!alive) return; if (d.error) setError(d.error); else setPay({ id: d.id, receiver: d.receiver, amount: d.amount }) })
      .catch(() => { if (alive) setError('No se pudo iniciar el pago.') })
      .finally(() => { if (alive) setStarting(false) })
    return () => { alive = false }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!pay) return
    const iv = setInterval(async () => {
      try {
        const r = await fetch(`${checkUrlBase}?id=${pay.id}`).then(x => x.json())
        if (r.status === 'approved') { clearInterval(iv); onApproved() }
        else if (r.status === 'expired' || r.status === 'rejected') { clearInterval(iv); setPay(null); setError('El pago venció sin recibirse. Reiniciá la compra.') }
      } catch { /* reintenta */ }
    }, 8000)
    return () => clearInterval(iv)
  }, [pay]) // eslint-disable-line react-hooks/exhaustive-deps

  const copy = (text: string, which: 'addr' | 'amt') => { navigator.clipboard.writeText(text); setCopied(which); setTimeout(() => setCopied(null), 1500) }

  if (starting) return <div className="flex items-center justify-center py-8 text-white/50"><Loader2 className="animate-spin" size={20} /></div>
  if (error) return (
    <div className="text-center py-4">
      <p className="text-sm text-red-400">{error}</p>
      {onCancel && <button onClick={handleCancel} className="mt-2 text-xs text-white/50 underline">Volver</button>}
    </div>
  )
  if (!pay) return null

  return (
    <div className="space-y-3">
      <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-3">
        <p className="text-[10px] text-amber-300/80 uppercase font-bold mb-1">⚠️ Envía EXACTAMENTE este monto (con los decimales)</p>
        <div className="flex items-center gap-2">
          <code className="flex-1 text-lg text-amber-300 font-mono font-black break-all">{pay.amount.toFixed(4)} USDT</code>
          <button onClick={() => copy(pay.amount.toFixed(4), 'amt')} className="shrink-0 p-1.5 rounded-lg bg-white/5 hover:bg-white/10">{copied === 'amt' ? <Check size={14} className="text-green-400" /> : <Copy size={14} className="text-white/50" />}</button>
        </div>
        <p className="text-[9px] text-amber-400/60 mt-1">Si envías otro monto, no se detecta automáticamente.</p>
      </div>
      <div className="rounded-xl bg-black/30 border border-white/10 p-3">
        <p className="text-[10px] text-white/30 uppercase font-bold mb-1">A esta dirección (USDT · BSC / BEP-20)</p>
        <div className="flex items-center gap-2">
          <code className="flex-1 text-[11px] text-cyan-300 font-mono break-all">{pay.receiver}</code>
          <button onClick={() => copy(pay.receiver, 'addr')} className="shrink-0 p-1.5 rounded-lg bg-white/5 hover:bg-white/10">{copied === 'addr' ? <Check size={12} className="text-green-400" /> : <Copy size={12} className="text-white/50" />}</button>
        </div>
      </div>
      <div className="flex items-center justify-center gap-2 text-xs text-cyan-300 font-bold py-1">
        <Loader2 size={14} className="animate-spin" /> Esperando tu pago… se activa solo
      </div>
      {onCancel && <button onClick={handleCancel} className="w-full py-2 rounded-xl text-[11px] text-white/40 hover:text-white/70 border border-white/10">Cambiar método</button>}
    </div>
  )
}
