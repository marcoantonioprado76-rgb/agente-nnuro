'use client'

import { useEffect, useState } from 'react'
import PrismLoader from '@/components/PrismLoader'

interface Wd { id: string; amount: number; status: string; createdAt: string; walletAddress: string | null }
interface Data {
  balance: { available: number; totalPaid: number; min: number }
  withdrawals: Wd[]
}

const ESTADO: Record<string, { label: string; color: string; bg: string }> = {
  PENDING:  { label: 'En revisión', color: '#B45309', bg: 'rgba(251,191,36,0.14)' },
  APPROVED: { label: 'Aprobado',    color: '#0a95a8', bg: 'rgba(0,229,208,0.14)' },
  PAID:     { label: 'Pagado',      color: '#15803d', bg: 'rgba(34,197,94,0.14)' },
  REJECTED: { label: 'Rechazado',   color: '#B91C1C', bg: 'rgba(239,68,68,0.12)' },
}

export default function RetirosPage() {
  const [data, setData] = useState<Data | null>(null)
  const [loading, setLoading] = useState(true)
  const [amount, setAmount] = useState('')
  const [wallet, setWallet] = useState('')
  const [sending, setSending] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const load = () => fetch('/api/withdrawals')
    .then(r => { if (r.status === 401) { window.location.href = '/login'; return null } return r.json() })
    .then(d => { if (d?.balance) setData(d) })
    .catch(() => {}).finally(() => setLoading(false))

  useEffect(() => { load() }, [])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setMsg(null)
    const amt = parseFloat(amount)
    if (!data) return
    if (isNaN(amt) || amt < data.balance.min) { setMsg({ type: 'err', text: `El retiro mínimo es $${data.balance.min.toFixed(2)}` }); return }
    if (amt > data.balance.available) { setMsg({ type: 'err', text: 'No tienes saldo suficiente.' }); return }
    if (!wallet.trim()) { setMsg({ type: 'err', text: 'Ingresa tu dirección de wallet o datos de cobro.' }); return }
    setSending(true)
    try {
      const res = await fetch('/api/withdrawals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: amt, walletAddress: wallet.trim() }) })
      const j = await res.json()
      if (!res.ok) { setMsg({ type: 'err', text: j.error || 'No se pudo solicitar el retiro.' }); return }
      setMsg({ type: 'ok', text: '¡Solicitud enviada! Se descontó de tu saldo y el equipo la revisará.' })
      setAmount(''); setWallet(''); setData(null); setLoading(true); load()
    } catch { setMsg({ type: 'err', text: 'Error de conexión.' }) } finally { setSending(false) }
  }

  if (loading) return <PrismLoader />
  if (!data) return <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280' }}>No se pudo cargar tus retiros.</div>

  return (
    <main className="d-main font-ui" style={{ background: 'radial-gradient(circle at top right, rgba(0,229,208,0.06), transparent 28%), linear-gradient(135deg, #DDE4EC 0%, #E6ECF3 45%, #D6DEE9 100%)', color: '#111827', minHeight: '100vh', gap: 24 }}>

      <div>
        <h1 className="font-display" style={{ fontSize: 28, fontWeight: 600, margin: 0 }}>Retirar saldo</h1>
        <p style={{ fontSize: 13.5, color: '#6B7280', margin: '4px 0 0' }}>Retira en efectivo el saldo que ganaste con tus referidos (mínimo ${data.balance.min.toFixed(2)}).</p>
      </div>

      {/* Saldo + formulario */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 22, alignItems: 'start' }}>
        <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 24, padding: 26, background: 'repeating-radial-gradient(circle at 90% 15%, transparent 0 20px, rgba(0,229,208,0.06) 20px 21px), linear-gradient(135deg,#273842 0%,#1a262f 100%)', border: '1px solid rgba(0,181,192,0.22)' }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)' }}>Saldo disponible</p>
          <p className="font-display" style={{ margin: '8px 0 0', fontSize: 40, fontWeight: 800, color: '#fff', lineHeight: 1 }}>${data.balance.available.toFixed(2)}</p>
          <p style={{ margin: '14px 0 0', fontSize: 12.5, color: 'rgba(255,255,255,0.55)' }}>Retirado histórico: ${data.balance.totalPaid.toFixed(2)}</p>
        </div>

        <form onSubmit={submit} className="dm-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h2 className="font-display" style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>Solicitar retiro</h2>
          <label style={lbl}>Monto (USD)</label>
          <input type="number" step="0.01" min={data.balance.min} value={amount} onChange={e => setAmount(e.target.value)} placeholder={`Mín. $${data.balance.min}`} style={inp} />
          <label style={lbl}>Wallet USDT o datos de cobro (banco / QR)</label>
          <input value={wallet} onChange={e => setWallet(e.target.value)} placeholder="Dirección USDT, o cuenta/celular para el QR" style={inp} />
          {msg && <p style={{ margin: 0, fontSize: 13, color: msg.type === 'ok' ? '#15803d' : '#B91C1C' }}>{msg.text}</p>}
          <button type="submit" className="dm-btn" disabled={sending} style={{ opacity: sending ? 0.6 : 1, marginTop: 4 }}>
            {sending ? 'Enviando…' : 'Solicitar retiro'}
          </button>
          <p style={{ margin: 0, fontSize: 11.5, color: '#9CA3AF' }}>Al solicitar, el monto se reserva de tu saldo. Si el retiro se rechaza, se te devuelve.</p>
        </form>
      </div>

      {/* Historial */}
      <div className="dm-card" style={{ padding: 24 }}>
        <h2 className="font-display" style={{ fontSize: 18, fontWeight: 700, margin: '0 0 16px' }}>Historial de retiros</h2>
        {data.withdrawals.length === 0 ? (
          <p style={{ color: '#6B7280', fontSize: 14, textAlign: 'center', padding: '24px 0' }}>Aún no has solicitado retiros.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
              <thead><tr style={{ textAlign: 'left', color: '#9CA3AF', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <th style={th}>Fecha</th><th style={th}>Monto</th><th style={th}>Destino</th><th style={{ ...th, textAlign: 'right' }}>Estado</th>
              </tr></thead>
              <tbody>
                {data.withdrawals.map(w => {
                  const e = ESTADO[w.status] || ESTADO.PENDING
                  return (
                    <tr key={w.id} style={{ borderTop: '1px solid #EAEEF3' }}>
                      <td style={{ ...td, color: '#6B7280' }}>{new Date(w.createdAt).toLocaleDateString('es-BO')}</td>
                      <td style={{ ...td, fontWeight: 700 }}>${w.amount.toFixed(2)}</td>
                      <td style={{ ...td, color: '#6B7280', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.walletAddress || '—'}</td>
                      <td style={{ ...td, textAlign: 'right' }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: e.color, background: e.bg, padding: '4px 10px', borderRadius: 999 }}>{e.label}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  )
}

const lbl: React.CSSProperties = { fontSize: 12.5, fontWeight: 600, color: '#374151', marginBottom: -6 }
const inp: React.CSSProperties = { background: '#FFFFFF', border: '1px solid #D7DEE8', borderRadius: 12, padding: '11px 14px', fontSize: 14, color: '#111827', outline: 'none' }
const th: React.CSSProperties = { padding: '8px 10px', fontWeight: 700 }
const td: React.CSSProperties = { padding: '12px 10px' }
