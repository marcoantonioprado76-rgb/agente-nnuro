'use client'

import { useState, useEffect } from 'react'

const DG = 'linear-gradient(135deg,#FF2D95 0%,#B735B8 48%,#233B8F 100%)'

interface Settings {
  name?: string
  slug?: string
  logoUrl?: string | null
  payUsdtWallet?: string | null
  payUsdtNetwork?: string | null
  payBankInfo?: string | null
  payQrUrl?: string | null
  payInstructions?: string | null
}

async function uploadFile(file: File): Promise<string | null> {
  const fd = new FormData(); fd.append('file', file)
  const r = await fetch('/api/upload', { method: 'POST', body: fd })
  const d = await r.json().catch(() => ({}))
  return d.url ?? null
}

export default function CobroEmpresaPage() {
  const [guardOk, setGuardOk] = useState(false)
  const [loading, setLoading] = useState(true)
  const [s, setS] = useState<Settings>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [upQr, setUpQr] = useState(false)
  const [upLogo, setUpLogo] = useState(false)

  useEffect(() => {
    fetch('/api/plan-status').then(r => r.json()).then(d => {
      if (d.orgRole !== 'ORG_ADMIN') { window.location.href = '/dashboard'; return }
      setGuardOk(true)
      fetch('/api/empresa/settings').then(r => r.json()).then(d => { setS(d.settings || {}); setLoading(false) }).catch(() => setLoading(false))
    }).catch(() => { window.location.href = '/dashboard' })
  }, [])

  const set = (k: keyof Settings, v: string) => { setS(p => ({ ...p, [k]: v })); setSaved(false) }

  async function save() {
    setSaving(true); setSaved(false)
    const r = await fetch('/api/empresa/settings', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        payUsdtWallet: s.payUsdtWallet ?? '', payUsdtNetwork: s.payUsdtNetwork ?? '',
        payBankInfo: s.payBankInfo ?? '', payQrUrl: s.payQrUrl ?? '',
        payInstructions: s.payInstructions ?? '', logoUrl: s.logoUrl ?? '',
      }),
    })
    setSaving(false)
    if (r.ok) { setSaved(true); setTimeout(() => setSaved(false), 2500) }
  }

  if (!guardOk) return <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#0B1B2B', color: '#fff' }}><p style={{ opacity: 0.7 }}>Cargando…</p></div>

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg,#F5F7FB,#EEF1F8)', color: '#0B1B2B' }}>
      <header style={{ background: 'linear-gradient(135deg,#0B1B2B,#050B14)', color: '#fff', padding: '14px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src="/logo-oficial-mydiamond.png" alt="MY DIAMOND" style={{ height: 32 }} />
          <p style={{ fontWeight: 800, fontSize: 15 }}>Cobro y marca</p>
        </div>
        <a href="/empresa" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', padding: '8px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
          <i className="fa-solid fa-arrow-left" style={{ marginRight: 6 }} />Volver
        </a>
      </header>

      <main style={{ maxWidth: 720, margin: '0 auto', padding: '24px 18px 60px' }}>
        {loading ? <p style={{ color: '#9AA3B2', textAlign: 'center', padding: 30 }}>Cargando…</p> : (
          <>
            <div style={{ display: 'flex', gap: 9, alignItems: 'center', background: 'rgba(35,59,143,0.06)', border: '1px solid rgba(35,59,143,0.15)', borderRadius: 12, padding: '11px 15px', marginBottom: 18, fontSize: 13, color: '#33405A' }}>
              <i className="fa-solid fa-circle-info" style={{ color: '#B735B8' }} />
              Estos datos los verán <strong>&nbsp;tus usuarios</strong> para pagarte a vos (transferencia / USDT). MY DIAMOND no interviene en el cobro.
            </div>

            {/* USDT */}
            <Card title="USDT (Binance / cripto)" icon="fa-brands fa-bitcoin">
              <Field label="Wallet / dirección USDT"><input style={inp} value={s.payUsdtWallet ?? ''} onChange={e => set('payUsdtWallet', e.target.value)} placeholder="0x... o tu dirección de Binance" /></Field>
              <Field label="Red"><input style={inp} value={s.payUsdtNetwork ?? ''} onChange={e => set('payUsdtNetwork', e.target.value)} placeholder="BEP20 / TRC20 / etc." /></Field>
            </Card>

            {/* Transferencia */}
            <Card title="Transferencia bancaria" icon="fa-solid fa-building-columns">
              <Field label="Datos bancarios (banco, titular, cuenta/CBU/alias…)">
                <textarea style={{ ...inp, minHeight: 80 }} value={s.payBankInfo ?? ''} onChange={e => set('payBankInfo', e.target.value)} placeholder={'Banco: ...\nTitular: ...\nCuenta / CBU / Alias: ...'} />
              </Field>
            </Card>

            {/* QR */}
            <Card title="QR de pago (opcional)" icon="fa-solid fa-qrcode">
              <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                {s.payQrUrl ? <img src={s.payQrUrl} alt="QR" style={{ width: 96, height: 96, objectFit: 'contain', borderRadius: 10, border: '1px solid #E4E9F0', background: '#fff' }} /> : <div style={{ width: 96, height: 96, borderRadius: 10, border: '1px dashed #D5DCE6', display: 'grid', placeItems: 'center', color: '#C4CCD8' }}><i className="fa-solid fa-qrcode" style={{ fontSize: 28 }} /></div>}
                <div style={{ flex: 1 }}>
                  <label style={{ ...btnGhost, display: 'inline-flex', alignItems: 'center', gap: 7, cursor: 'pointer' }}>
                    {upQr ? <i className="fa-solid fa-spinner fa-spin" /> : <i className="fa-solid fa-upload" />} Subir QR
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={async e => { const f = e.target.files?.[0]; if (!f) return; setUpQr(true); const u = await uploadFile(f); setUpQr(false); if (u) set('payQrUrl', u) }} />
                  </label>
                  {s.payQrUrl && <button onClick={() => set('payQrUrl', '')} style={{ ...btnGhost, marginLeft: 8, color: '#ef4444' }}>Quitar</button>}
                </div>
              </div>
            </Card>

            {/* Instrucciones */}
            <Card title="Instrucciones para tus usuarios" icon="fa-solid fa-list-check">
              <Field label="Texto libre (cómo pagar, a quién avisar, etc.)">
                <textarea style={{ ...inp, minHeight: 70 }} value={s.payInstructions ?? ''} onChange={e => set('payInstructions', e.target.value)} placeholder="Ej: Hacé la transferencia y mandame el comprobante por WhatsApp al ..." />
              </Field>
            </Card>

            {/* Marca */}
            <Card title="Marca — logo de tu empresa" icon="fa-solid fa-image">
              <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                {s.logoUrl ? <img src={s.logoUrl} alt="logo" style={{ height: 48, borderRadius: 8, objectFit: 'contain' }} /> : <div style={{ width: 90, height: 48, borderRadius: 8, border: '1px dashed #D5DCE6', display: 'grid', placeItems: 'center', color: '#C4CCD8', fontSize: 11 }}>Sin logo</div>}
                <label style={{ ...btnGhost, display: 'inline-flex', alignItems: 'center', gap: 7, cursor: 'pointer' }}>
                  {upLogo ? <i className="fa-solid fa-spinner fa-spin" /> : <i className="fa-solid fa-upload" />} Subir logo
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={async e => { const f = e.target.files?.[0]; if (!f) return; setUpLogo(true); const u = await uploadFile(f); setUpLogo(false); if (u) set('logoUrl', u) }} />
                </label>
                {s.logoUrl && <button onClick={() => set('logoUrl', '')} style={{ ...btnGhost, color: '#ef4444' }}>Quitar</button>}
              </div>
            </Card>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18, alignItems: 'center' }}>
              {saved && <span style={{ color: '#16a34a', fontSize: 13, fontWeight: 700 }}><i className="fa-solid fa-check" /> Guardado</span>}
              <button onClick={save} disabled={saving} style={{ background: DG, color: '#fff', border: 'none', borderRadius: 11, padding: '12px 26px', fontWeight: 800, fontSize: 14, cursor: 'pointer', opacity: saving ? 0.6 : 1, boxShadow: '0 8px 22px -10px rgba(183,53,184,0.7)' }}>
                {saving ? 'Guardando…' : 'Guardar cambios'}
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  )
}

function Card({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #E4E9F0', borderRadius: 16, padding: '18px 20px', marginBottom: 14, boxShadow: '0 6px 18px -14px rgba(11,27,43,0.35)' }}>
      <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}><i className={icon} style={{ color: '#B735B8' }} />{title}</h3>
      {children}
    </div>
  )
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div style={{ marginBottom: 10 }}><label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 5 }}>{label}</label>{children}</div>
}

const inp: React.CSSProperties = { width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #D5DCE6', fontSize: 13, outline: 'none', boxSizing: 'border-box', background: '#fff', color: '#111827', fontFamily: 'inherit' }
const btnGhost: React.CSSProperties = { padding: '9px 14px', borderRadius: 10, border: '1px solid #E4E9F0', background: '#fff', color: '#5B6472', fontWeight: 700, cursor: 'pointer', fontSize: 13 }
