'use client'

import { useState, useRef, useEffect } from 'react'
import { Loader2, CheckCircle2, XCircle, AlertCircle, Clock, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

type ResultType = 'idle' | 'loading' | 'valid' | 'checked_in' | 'already_used' | 'pending' | 'rejected' | 'not_found' | 'error'

interface TicketInfo {
  id?: string
  customerName?: string
  customerEmail?: string
  quantity?: number
  eventTitle?: string
  eventDate?: string | null
  checkedInAt?: string | null
  ticketTypeName?: string | null
  ticketTypeImage?: string | null
}

const BG: Record<ResultType, string> = {
  idle: '#07080F',
  loading: '#07080F',
  valid: '#052010',
  checked_in: '#052010',
  already_used: '#1a0505',
  pending: '#1a1005',
  rejected: '#1a0505',
  not_found: '#0d0d1a',
  error: '#0d0d1a',
}

const BORDER: Record<ResultType, string> = {
  idle: 'rgba(255,255,255,0.06)',
  loading: 'rgba(255,255,255,0.06)',
  valid: 'rgba(74,222,128,0.4)',
  checked_in: 'rgba(74,222,128,0.4)',
  already_used: 'rgba(248,113,113,0.4)',
  pending: 'rgba(245,166,35,0.4)',
  rejected: 'rgba(248,113,113,0.4)',
  not_found: 'rgba(248,113,113,0.3)',
  error: 'rgba(248,113,113,0.2)',
}

export default function ValidarPage() {
  const [code, setCode] = useState('')
  const [result, setResult] = useState<ResultType>('idle')
  const [ticket, setTicket] = useState<TicketInfo | null>(null)
  const [confirming, setConfirming] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const lookup = async (codeVal?: string) => {
    const c = (codeVal ?? code).trim()
    if (!c) return
    setResult('loading'); setTicket(null); setConfirming(false)
    try {
      const res = await fetch('/api/admin/entradas/validar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: c, confirm: false }),
      })
      const data = await res.json()
      setResult(data.result ?? 'error')
      setTicket(data.ticket ?? null)
    } catch {
      setResult('error')
    }
  }

  const confirmCheckin = async () => {
    if (!ticket?.id) return
    setConfirming(true)
    try {
      const res = await fetch('/api/admin/entradas/validar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim().toUpperCase(), confirm: true }),
      })
      const data = await res.json()
      setResult(data.result ?? 'error')
      setTicket(data.ticket ?? null)
    } catch {
      setResult('error')
    } finally {
      setConfirming(false)
    }
  }

  const reset = () => { setCode(''); setResult('idle'); setTicket(null); setConfirming(false); setTimeout(() => inputRef.current?.focus(), 50) }

  const formatDate = (d: string) => new Date(d).toLocaleString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  return (
  <div className="dm-page font-ui">
    <div style={{ minHeight: '100vh', background: BG[result], transition: 'background 0.3s', display: 'flex', flexDirection: 'column' }}>

      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <Link href="/admin/entradas" style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#6B7280', textDecoration: 'none', fontSize: 13 }}>
          <ArrowLeft size={16} /> Entradas
        </Link>
        <span style={{ fontSize: 15, fontWeight: 900, color: '#fff', marginLeft: 'auto', marginRight: 'auto' }}>🎟 Validar entrada</span>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 20px', maxWidth: 420, margin: '0 auto', width: '100%' }}>

        {/* Code input */}
        <div style={{ width: '100%', marginBottom: 24 }}>
          <input
            ref={inputRef}
            value={code}
            onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
            onKeyDown={e => e.key === 'Enter' && lookup()}
            placeholder="00000000"
            autoCapitalize="none"
            inputMode="numeric"
            autoComplete="off"
            style={{
              width: '100%', background: '#F0F3F7', border: `2px solid ${BORDER[result]}`,
              borderRadius: 16, padding: '18px 20px', color: '#fff', fontSize: 22, fontWeight: 900,
              fontFamily: 'Courier New, monospace', letterSpacing: 10, textAlign: 'center',
              outline: 'none', transition: 'border-color 0.3s', boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Result area */}
        {result === 'idle' && (
          <div style={{ textAlign: 'center', color: '#9CA3AF' }}>
            <p style={{ fontSize: 14 }}>Escribe el código y presiona Enter</p>
          </div>
        )}

        {result === 'loading' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#6B7280' }}>
            <Loader2 size={20} className="animate-spin" /> <span style={{ fontSize: 14 }}>Verificando...</span>
          </div>
        )}

        {result === 'valid' && ticket && (
          <div style={{ width: '100%', textAlign: 'center' }}>
            {ticket.ticketTypeImage && (
              <div style={{ marginBottom: 16, borderRadius: 14, overflow: 'hidden', maxHeight: 160 }}>
                <img src={ticket.ticketTypeImage} alt="" style={{ width: '100%', height: 160, objectFit: 'contain', background: 'rgba(255,255,255,0.04)' }} />
              </div>
            )}
            <CheckCircle2 size={64} color="#4ade80" style={{ margin: '0 auto 16px' }} />
            <p style={{ fontSize: 24, fontWeight: 900, color: '#4ade80', margin: '0 0 6px' }}>ENTRADA VÁLIDA</p>
            <p style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: '0 0 4px' }}>{ticket.customerName}</p>
            <p style={{ fontSize: 13, color: '#6B7280', margin: '0 0 4px' }}>{ticket.customerEmail}</p>
            <p style={{ fontSize: 13, color: '#6B7280', margin: '0 0 20px' }}>{ticket.ticketTypeName ?? '🎟'} · {ticket.eventTitle}</p>
            <button
              onClick={confirmCheckin}
              disabled={confirming}
              style={{ width: '100%', padding: '18px 0', borderRadius: 16, background: '#4ade80', color: '#000', fontWeight: 900, fontSize: 18, border: 'none', cursor: 'pointer', letterSpacing: 2, textTransform: 'uppercase', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              {confirming ? <><Loader2 size={18} className="animate-spin" /> Procesando...</> : '✓ Confirmar ingreso'}
            </button>
            <button onClick={reset} style={{ marginTop: 12, width: '100%', padding: '12px 0', borderRadius: 12, background: 'none', border: '1px solid #E4E9F0', color: '#6B7280', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
          </div>
        )}

        {result === 'checked_in' && ticket && (
          <div style={{ width: '100%', textAlign: 'center' }}>
            {ticket.ticketTypeImage && (
              <div style={{ marginBottom: 16, borderRadius: 14, overflow: 'hidden', maxHeight: 160 }}>
                <img src={ticket.ticketTypeImage} alt="" style={{ width: '100%', height: 160, objectFit: 'contain', background: 'rgba(255,255,255,0.04)' }} />
              </div>
            )}
            <CheckCircle2 size={64} color="#4ade80" style={{ margin: '0 auto 16px' }} />
            <p style={{ fontSize: 24, fontWeight: 900, color: '#4ade80', margin: '0 0 6px' }}>¡INGRESO REGISTRADO!</p>
            <p style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: '0 0 4px' }}>{ticket.customerName}</p>
            <p style={{ fontSize: 13, color: '#6B7280', margin: '0 0 20px' }}>{ticket.ticketTypeName ?? ''}</p>
            <button onClick={reset} style={{ width: '100%', padding: '16px 0', borderRadius: 14, background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.3)', color: '#4ade80', fontWeight: 800, fontSize: 16, cursor: 'pointer' }}>Siguiente →</button>
          </div>
        )}

        {result === 'already_used' && ticket && (
          <div style={{ width: '100%', textAlign: 'center' }}>
            <XCircle size={64} color="#f87171" style={{ margin: '0 auto 16px' }} />
            <p style={{ fontSize: 24, fontWeight: 900, color: '#f87171', margin: '0 0 6px' }}>YA UTILIZADO</p>
            <p style={{ fontSize: 14, color: '#6B7280', margin: '0 0 4px' }}>{ticket.customerName}</p>
            {ticket.checkedInAt && <p style={{ fontSize: 12, color: '#6B7280', margin: '0 0 20px' }}>Ingresó el {formatDate(ticket.checkedInAt)}</p>}
            <button onClick={reset} style={{ width: '100%', padding: '16px 0', borderRadius: 14, background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.25)', color: '#f87171', fontWeight: 800, fontSize: 16, cursor: 'pointer' }}>Siguiente →</button>
          </div>
        )}

        {result === 'pending' && (
          <div style={{ width: '100%', textAlign: 'center' }}>
            <Clock size={64} color="#F5A623" style={{ margin: '0 auto 16px' }} />
            <p style={{ fontSize: 24, fontWeight: 900, color: '#F5A623', margin: '0 0 6px' }}>PAGO PENDIENTE</p>
            <p style={{ fontSize: 14, color: '#6B7280', margin: '0 0 20px' }}>Este ticket aún no fue aprobado por el admin</p>
            <button onClick={reset} style={{ width: '100%', padding: '16px 0', borderRadius: 14, background: 'rgba(245,166,35,0.1)', border: '1px solid rgba(245,166,35,0.25)', color: '#F5A623', fontWeight: 800, fontSize: 16, cursor: 'pointer' }}>Siguiente →</button>
          </div>
        )}

        {result === 'rejected' && (
          <div style={{ width: '100%', textAlign: 'center' }}>
            <XCircle size={64} color="#f87171" style={{ margin: '0 auto 16px' }} />
            <p style={{ fontSize: 24, fontWeight: 900, color: '#f87171', margin: '0 0 6px' }}>TICKET RECHAZADO</p>
            <p style={{ fontSize: 14, color: '#6B7280', margin: '0 0 20px' }}>Este ticket fue rechazado</p>
            <button onClick={reset} style={{ width: '100%', padding: '16px 0', borderRadius: 14, background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.25)', color: '#f87171', fontWeight: 800, fontSize: 16, cursor: 'pointer' }}>Siguiente →</button>
          </div>
        )}

        {result === 'not_found' && (
          <div style={{ width: '100%', textAlign: 'center' }}>
            <AlertCircle size={64} color="#f87171" style={{ margin: '0 auto 16px' }} />
            <p style={{ fontSize: 24, fontWeight: 900, color: '#f87171', margin: '0 0 6px' }}>NO ENCONTRADO</p>
            <p style={{ fontSize: 14, color: '#6B7280', margin: '0 0 20px' }}>El código no existe en el sistema</p>
            <button onClick={reset} style={{ width: '100%', padding: '16px 0', borderRadius: 14, background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.25)', color: '#f87171', fontWeight: 800, fontSize: 16, cursor: 'pointer' }}>Siguiente →</button>
          </div>
        )}

        {result === 'error' && (
          <div style={{ width: '100%', textAlign: 'center' }}>
            <AlertCircle size={48} color="#6B7280" style={{ margin: '0 auto 12px' }} />
            <p style={{ fontSize: 16, color: '#6B7280', margin: '0 0 16px' }}>Error de conexión</p>
            <button onClick={reset} style={{ width: '100%', padding: '14px 0', borderRadius: 12, background: 'none', border: '1px solid #E4E9F0', color: '#6B7280', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Reintentar</button>
          </div>
        )}

        {result === 'idle' && (
          <button
            onClick={() => lookup()}
            disabled={!code.trim()}
            style={{ marginTop: 16, width: '100%', padding: '16px 0', borderRadius: 14, background: code.trim() ? 'linear-gradient(135deg,#D203DD,#0D1E79)' : '#F0F3F7', color: code.trim() ? '#fff' : '#9CA3AF', fontWeight: 900, fontSize: 16, border: 'none', cursor: code.trim() ? 'pointer' : 'default', letterSpacing: 2, textTransform: 'uppercase', transition: 'all 0.2s' }}
          >
            Verificar código
          </button>
        )}
      </div>
    </div>
  </div>
  )
}
