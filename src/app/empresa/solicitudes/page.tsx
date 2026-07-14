'use client'

import { useState, useEffect } from 'react'

const DG = 'linear-gradient(135deg,#FF2D95 0%,#B735B8 48%,#233B8F 100%)'

interface Req {
  id: string
  plan: string
  price: number
  paymentProofUrl: string | null
  paymentMethod: string
  status: string
  notes: string | null
  createdAt: string
  user: { username: string; fullName: string; email: string }
}

export default function SolicitudesPage() {
  const [guardOk, setGuardOk] = useState(false)
  const [loading, setLoading] = useState(true)
  const [reqs, setReqs] = useState<Req[]>([])
  const [filter, setFilter] = useState<'PENDING' | 'ALL'>('PENDING')
  const [approve, setApprove] = useState<Req | null>(null)
  const [plan, setPlan] = useState('BASIC')
  const [days, setDays] = useState('30')
  const [busy, setBusy] = useState(false)
  const [proof, setProof] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/plan-status').then(r => r.json()).then(d => {
      if (d.orgRole !== 'ORG_ADMIN') { window.location.href = '/dashboard'; return }
      setGuardOk(true); load()
    }).catch(() => { window.location.href = '/dashboard' })
  }, [])

  async function load() {
    setLoading(true)
    try { const r = await fetch('/api/empresa/purchases'); const d = await r.json(); setReqs(d.requests || []) } finally { setLoading(false) }
  }

  async function act(id: string, body: Record<string, unknown>) {
    setBusy(true)
    try { await fetch(`/api/empresa/purchases/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }) }
    finally { setBusy(false); setApprove(null); load() }
  }

  if (!guardOk) return <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#0B1B2B', color: '#fff' }}><p style={{ opacity: 0.7 }}>Cargando…</p></div>

  const shown = reqs.filter(r => filter === 'ALL' || r.status === 'PENDING')
  const pendCount = reqs.filter(r => r.status === 'PENDING').length

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg,#F5F7FB,#EEF1F8)', color: '#0B1B2B' }}>
      <header style={{ background: 'linear-gradient(135deg,#0B1B2B,#050B14)', color: '#fff', padding: '14px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src="/logo-oficial-mydiamond.png" alt="MY DIAMOND" style={{ height: 32 }} />
          <p style={{ fontWeight: 800, fontSize: 15 }}>Solicitudes de pago</p>
        </div>
        <a href="/empresa" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', padding: '8px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
          <i className="fa-solid fa-arrow-left" style={{ marginRight: 6 }} />Volver
        </a>
      </header>

      <main style={{ maxWidth: 860, margin: '0 auto', padding: '24px 18px 60px' }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button onClick={() => setFilter('PENDING')} style={tab(filter === 'PENDING')}>Pendientes {pendCount > 0 && <span style={{ background: '#ef4444', color: '#fff', borderRadius: 999, padding: '1px 7px', fontSize: 11, marginLeft: 4 }}>{pendCount}</span>}</button>
          <button onClick={() => setFilter('ALL')} style={tab(filter === 'ALL')}>Todas</button>
        </div>

        {loading ? <p style={{ color: '#9AA3B2', textAlign: 'center', padding: 30 }}>Cargando…</p>
          : shown.length === 0 ? <div style={{ background: '#fff', border: '1px dashed #D5DCE6', borderRadius: 16, padding: '40px 20px', textAlign: 'center', color: '#7A8494' }}>No hay solicitudes {filter === 'PENDING' ? 'pendientes' : ''}.</div>
          : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {shown.map(r => (
                <div key={r.id} style={{ background: '#fff', border: '1px solid #E4E9F0', borderRadius: 14, padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {r.paymentProofUrl ? <img src={r.paymentProofUrl} alt="comprobante" onClick={() => setProof(r.paymentProofUrl)} style={{ width: 46, height: 46, borderRadius: 9, objectFit: 'cover', cursor: 'pointer' }} /> : <div style={{ width: 46, height: 46, borderRadius: 9, background: '#F1F3F8', display: 'grid', placeItems: 'center', color: '#C4CCD8' }}><i className="fa-solid fa-receipt" /></div>}
                    <div>
                      <p style={{ fontWeight: 700, fontSize: 14 }}>{r.user.fullName || r.user.username}</p>
                      <p style={{ fontSize: 12, color: '#8A93A2' }}>@{r.user.username} · {new Date(r.createdAt).toLocaleDateString('es-ES')}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {r.status === 'PENDING' ? (
                      <>
                        <button onClick={() => { setApprove(r); setPlan('BASIC'); setDays('30') }} style={{ background: DG, color: '#fff', border: 'none', borderRadius: 10, padding: '8px 16px', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>Aprobar</button>
                        <button onClick={() => act(r.id, { action: 'reject' })} disabled={busy} style={{ background: '#fff', color: '#ef4444', border: '1px solid #fecaca', borderRadius: 10, padding: '8px 14px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Rechazar</button>
                      </>
                    ) : (
                      <span style={{ fontSize: 12, fontWeight: 800, padding: '4px 10px', borderRadius: 999, background: r.status === 'APPROVED' ? 'rgba(22,163,74,0.1)' : 'rgba(239,68,68,0.1)', color: r.status === 'APPROVED' ? '#16a34a' : '#ef4444' }}>{r.status === 'APPROVED' ? 'Aprobada' : 'Rechazada'}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
      </main>

      {/* Modal aprobar */}
      {approve && (
        <div onClick={() => setApprove(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(5,11,20,0.55)', display: 'grid', placeItems: 'center', padding: 16, zIndex: 50 }}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 420, background: '#fff', borderRadius: 18, overflow: 'hidden', boxShadow: '0 30px 80px -20px rgba(5,11,20,0.6)' }}>
            <div style={{ height: 4, background: DG }} />
            <div style={{ padding: '20px 22px' }}>
              <h3 style={{ fontSize: 17, fontWeight: 900, marginBottom: 4 }}>Aprobar y activar</h3>
              <p style={{ fontSize: 13, color: '#5B6472', marginBottom: 14 }}>@{approve.user.username} — elegí el plan y los días.</p>
              <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 5 }}>Plan</label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                {['BASIC', 'PRO', 'ELITE'].map(p => (
                  <button key={p} onClick={() => setPlan(p)} style={{ flex: 1, padding: '10px 0', borderRadius: 10, fontWeight: 800, fontSize: 13, cursor: 'pointer', border: plan === p ? '2px solid #B735B8' : '1px solid #E4E9F0', background: plan === p ? 'rgba(183,53,184,0.08)' : '#fff', color: plan === p ? '#B735B8' : '#5B6472' }}>{p}</button>
                ))}
              </div>
              <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 5 }}>Días</label>
              <input type="number" value={days} onChange={e => setDays(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #D5DCE6', fontSize: 13, boxSizing: 'border-box' }} />
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
                <button onClick={() => setApprove(null)} style={{ padding: '10px 16px', borderRadius: 10, border: '1px solid #E4E9F0', background: '#fff', color: '#5B6472', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>Cancelar</button>
                <button onClick={() => act(approve.id, { action: 'approve', plan, addDays: parseInt(days) || 30 })} disabled={busy} style={{ padding: '10px 18px', borderRadius: 10, border: 'none', background: DG, color: '#fff', fontWeight: 800, cursor: 'pointer', fontSize: 13, opacity: busy ? 0.6 : 1 }}>{busy ? 'Activando…' : 'Aprobar y activar'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Visor de comprobante */}
      {proof && (
        <div onClick={() => setProof(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(5,11,20,0.85)', display: 'grid', placeItems: 'center', padding: 24, zIndex: 60, cursor: 'zoom-out' }}>
          <img src={proof} alt="comprobante" style={{ maxWidth: '100%', maxHeight: '90vh', borderRadius: 12 }} />
        </div>
      )}
    </div>
  )
}

function tab(active: boolean): React.CSSProperties {
  return { padding: '9px 18px', borderRadius: 11, fontWeight: 800, fontSize: 13, cursor: 'pointer', border: active ? 'none' : '1px solid #E4E9F0', background: active ? DG : '#fff', color: active ? '#fff' : '#5B6472' }
}
