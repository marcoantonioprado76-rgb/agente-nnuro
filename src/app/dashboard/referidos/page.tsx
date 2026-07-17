'use client'

import { useEffect, useState } from 'react'
import PrismLoader from '@/components/PrismLoader'

interface RefRow { nombre: string; usuario: string; fecha: string; estado: string; recompensa: number }
interface Data {
  code: string
  link: string
  percent: number
  stats: { total: number; activos: number; pendientes: number; ganadoUsd: number }
  referrals: RefRow[]
}

export default function ReferidosPage() {
  const [data, setData] = useState<Data | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState<'code' | 'link' | null>(null)

  useEffect(() => {
    fetch('/api/referrals/me')
      .then(r => r.json())
      .then(d => { if (d?.code) setData(d) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const copy = (text: string, what: 'code' | 'link') => {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(what); setTimeout(() => setCopied(null), 1600)
    }).catch(() => {})
  }

  if (loading) return <PrismLoader />
  if (!data) return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280' }}>
      No se pudo cargar tu programa de referidos.
    </div>
  )

  const stat = (label: string, value: string | number, accent = false) => (
    <div className="dm-card" style={{ padding: 20 }}>
      <p style={{ margin: 0, fontSize: 12.5, color: '#6B7280', fontWeight: 500 }}>{label}</p>
      <p className="font-display" style={{ margin: '4px 0 0', fontSize: 26, fontWeight: 700, color: accent ? '#0a95a8' : '#111827', lineHeight: 1 }}>{value}</p>
    </div>
  )

  return (
    <main className="d-main font-ui" style={{ background: 'radial-gradient(circle at top right, rgba(0,229,208,0.06), transparent 28%), linear-gradient(135deg, #DDE4EC 0%, #E6ECF3 45%, #D6DEE9 100%)', color: '#111827', minHeight: '100vh', gap: 24 }}>

      <div>
        <h1 className="font-display" style={{ fontSize: 28, fontWeight: 600, color: '#111827', margin: 0 }}>Refiere y gana</h1>
        <p style={{ fontSize: 13.5, color: '#6B7280', margin: '4px 0 0' }}>
          Invita con tu código. Cuando tu referido paga su plan, ganas el <b style={{ color: '#0a95a8' }}>{data.percent}%</b> en saldo NÜRO (para tu plan o créditos).
        </p>
      </div>

      {/* Tarjeta del código — oscura con ondas */}
      <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 24, padding: 26, background: 'repeating-radial-gradient(circle at 92% 20%, transparent 0 20px, rgba(0,229,208,0.06) 20px 21px), linear-gradient(135deg,#273842 0%,#1a262f 100%)', border: '1px solid rgba(0,181,192,0.22)', boxShadow: '0 18px 42px rgba(0,0,0,0.30)' }}>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)' }}>Tu código de referido</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginTop: 10 }}>
          <span className="font-display" style={{ fontSize: 30, fontWeight: 800, color: '#fff', letterSpacing: '0.02em' }}>{data.code}</span>
          <button onClick={() => copy(data.code, 'code')} style={btn}>
            <i className="fa-solid fa-copy" /> {copied === 'code' ? '¡Copiado!' : 'Copiar código'}
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 16 }}>
          <code style={{ flex: 1, minWidth: 220, fontSize: 13, color: 'rgba(255,255,255,0.8)', background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '11px 14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{data.link}</code>
          <button onClick={() => copy(data.link, 'link')} className="dm-btn" style={{ whiteSpace: 'nowrap' }}>
            <i className="fa-solid fa-link" /> {copied === 'link' ? '¡Copiado!' : 'Copiar link'}
          </button>
        </div>
      </div>

      {/* Estadísticas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 18 }}>
        {stat('Referidos', data.stats.total)}
        {stat('Activos (pagando)', data.stats.activos)}
        {stat('Pendientes', data.stats.pendientes)}
        {stat('Ganado', `$${data.stats.ganadoUsd.toFixed(2)}`, true)}
      </div>

      {/* Lista */}
      <div className="dm-card" style={{ padding: 24 }}>
        <h2 className="font-display" style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: '0 0 16px' }}>Mis referidos</h2>
        {data.referrals.length === 0 ? (
          <p style={{ color: '#6B7280', fontSize: 14, textAlign: 'center', padding: '28px 0' }}>
            Aún no tienes referidos. Comparte tu link y empieza a ganar. 🚀
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
              <thead>
                <tr style={{ textAlign: 'left', color: '#9CA3AF', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th style={th}>Usuario</th><th style={th}>Se registró</th><th style={th}>Estado</th><th style={{ ...th, textAlign: 'right' }}>Comisión</th>
                </tr>
              </thead>
              <tbody>
                {data.referrals.map((r, i) => {
                  const pagado = r.estado === 'COMPLETED'
                  return (
                    <tr key={i} style={{ borderTop: '1px solid #EAEEF3' }}>
                      <td style={td}><b style={{ color: '#111827' }}>{r.nombre}</b> <span style={{ color: '#9CA3AF' }}>@{r.usuario}</span></td>
                      <td style={{ ...td, color: '#6B7280' }}>{new Date(r.fecha).toLocaleDateString('es-BO')}</td>
                      <td style={td}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: pagado ? '#0a95a8' : '#9CA3AF' }}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: pagado ? '#00a884' : '#CBD5E1' }} />
                          {pagado ? 'Pagando' : 'Pendiente'}
                        </span>
                      </td>
                      <td style={{ ...td, textAlign: 'right', fontWeight: 700, color: pagado ? '#0a95a8' : '#9CA3AF' }}>
                        {pagado ? `+$${r.recompensa.toFixed(2)}` : '—'}
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

const btn: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 15px', borderRadius: 12, border: '1px solid rgba(0,229,208,0.4)', background: 'rgba(0,229,208,0.12)', color: '#35d0c8', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }
const th: React.CSSProperties = { padding: '8px 10px', fontWeight: 700 }
const td: React.CSSProperties = { padding: '12px 10px' }
