'use client'

import { useEffect, useState } from 'react'
import { Calendar, CheckCircle2, Loader2, MessageCircle } from 'lucide-react'

const BRAND = 'linear-gradient(135deg,#1fb8bb 0%,#147e95 48%,#233B8F 100%)'
const NAVY = '#1E2A4A'
const MUTED = '#8B93A7'

const COUNTRIES = [
  'Bolivia', 'Argentina', 'Chile', 'Perú', 'Colombia', 'Ecuador', 'México',
  'España', 'Estados Unidos', 'Paraguay', 'Uruguay', 'Venezuela', 'Brasil', 'Otro',
]

type State = 'loading' | 'notfound' | 'closed' | 'form' | 'success'

const label: React.CSSProperties = {
  display: 'block', fontSize: 12, fontWeight: 800, letterSpacing: '0.06em',
  textTransform: 'uppercase', color: NAVY, marginBottom: 7,
}
const input: React.CSSProperties = {
  width: '100%', padding: '14px 16px', borderRadius: 12, border: '1px solid #E3E6F0',
  background: '#EEF0F7', fontSize: 14.5, color: NAVY, outline: 'none', boxSizing: 'border-box',
}

export default function RetoRegisterPage({ params }: { params: { slug: string } }) {
  const [state, setState] = useState<State>('loading')
  const [retoName, setRetoName] = useState('Reto 90 Días')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [country, setCountry] = useState('')
  const [city, setCity] = useState('')
  const [savedName, setSavedName] = useState('')
  const [waLink, setWaLink] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    fetch(`/api/reto/${params.slug}`)
      .then(async (r) => {
        if (!r.ok) throw new Error('notfound')
        return r.json()
      })
      .then((d) => {
        if (!alive) return
        if (d?.name) setRetoName(d.name)
        setState(d?.open ? 'form' : 'closed')
      })
      .catch(() => { if (alive) setState('notfound') })
    return () => { alive = false }
  }, [params.slug])

  function resetForm() {
    setFullName(''); setPhone(''); setEmail(''); setCountry(''); setCity('')
    setError(null); setState('form')
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!fullName.trim()) { setError('Escribe tu nombre.'); return }
    if (!phone.trim()) { setError('Escribe tu número de celular.'); return }
    setSending(true); setError(null)
    try {
      const r = await fetch(`/api/reto/${params.slug}/register`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: fullName.trim(), phone: phone.trim(), email: email.trim(), country, city: city.trim() }),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok || !d?.ok) throw new Error(d?.error || 'No se pudo completar el registro.')
      setSavedName(fullName.trim().split(/\s+/)[0] || fullName.trim())
      setWaLink(typeof d?.waLink === 'string' ? d.waLink : null)
      setState('success')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo completar el registro.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', width: '100%', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: '32px 16px', boxSizing: 'border-box',
      position: 'relative', overflow: 'hidden',
      backgroundColor: '#1a262f',
      backgroundImage: 'linear-gradient(180deg, rgba(11,27,43,0.66) 0%, rgba(8,16,28,0.80) 46%, rgba(5,11,20,0.93) 100%), url(/auth-bg.jpg)',
      backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat',
    }}>
      {/* Glows suaves (igual que el login) */}
      <div style={{ pointerEvents: 'none', position: 'fixed', inset: 0, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -240, left: -160, width: 600, height: 600, borderRadius: '50%', filter: 'blur(150px)', background: 'rgba(0,229,208,0.16)' }} />
        <div style={{ position: 'absolute', bottom: -240, right: -160, width: 600, height: 600, borderRadius: '50%', filter: 'blur(150px)', background: 'rgba(106,53,217,0.18)' }} />
      </div>

      {/* Logo oficial NÜRO */}
      <div style={{ position: 'relative', zIndex: 10, marginBottom: 24, display: 'flex', justifyContent: 'center' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-oficial-nuro.png" alt="NÜRO" style={{ width: 210, height: 'auto', display: 'block', filter: 'drop-shadow(0 5px 12px rgba(0,0,0,0.85)) drop-shadow(0 22px 46px rgba(0,0,0,0.68)) drop-shadow(0 0 28px rgba(0,229,208,0.30))' }} />
      </div>

      <div style={{
        width: '100%', maxWidth: 470, position: 'relative', zIndex: 10, background: '#fff', borderRadius: 24,
        boxShadow: '0 0 0 1px rgba(255,255,255,0.10), 0 44px 100px -22px rgba(0,0,0,0.88), 0 18px 48px rgba(0,0,0,0.6)',
        padding: '34px 30px', boxSizing: 'border-box',
      }}>
        {state === 'loading' ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
            <Loader2 size={26} className="animate-spin" style={{ color: '#147e95' }} />
          </div>
        ) : state === 'notfound' ? (
          <div style={{ textAlign: 'center', padding: '30px 0' }}>
            <p style={{ fontSize: 18, fontWeight: 800, color: NAVY, margin: 0 }}>Enlace no válido</p>
            <p style={{ fontSize: 14, color: MUTED, marginTop: 8 }}>Este enlace de registro no existe o fue cambiado.</p>
          </div>
        ) : state === 'closed' ? (
          <div style={{ textAlign: 'center', padding: '30px 0' }}>
            <div style={{ position: 'relative', width: 48, height: 48, margin: '0 auto 14px' }}>
              <Calendar size={48} strokeWidth={1.6} style={{ color: '#147e95' }} />
              <span style={{ position: 'absolute', bottom: 6, left: 0, right: 0, textAlign: 'center', fontSize: 15, fontWeight: 800, color: '#147e95' }}>90</span>
            </div>
            <p style={{ fontSize: 18, fontWeight: 800, color: NAVY, margin: 0 }}>Registro cerrado</p>
            <p style={{ fontSize: 14, color: MUTED, marginTop: 8 }}>Por ahora no se aceptan nuevas inscripciones. Vuelve más tarde 🙌</p>
          </div>
        ) : state === 'success' ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <CheckCircle2 size={64} style={{ color: '#16A34A', margin: '0 auto 16px', display: 'block' }} />
            <h1 style={{ fontSize: 24, fontWeight: 800, color: NAVY, margin: 0 }}>¡Felicidades, {savedName}! 🎉</h1>
            <p style={{ fontSize: 15, color: MUTED, margin: '10px 0 20px' }}>Tu registro al reto quedó completo.</p>

            {/* Paso CLAVE: para activar el acompañamiento por WhatsApp, el participante
                debe ESCRIBIR él primero al bot (así no nos banean por iniciar nosotros). */}
            {waLink && (
              <div style={{ background: 'rgba(37,211,102,0.08)', border: '1px solid rgba(37,211,102,0.25)', borderRadius: 16, padding: '16px 16px 18px', marginBottom: 16, textAlign: 'left' }}>
                <p style={{ fontSize: 13.5, fontWeight: 800, color: NAVY, margin: '0 0 4px' }}>👉 Último paso para activar tu cuenta</p>
                <p style={{ fontSize: 13, color: MUTED, margin: '0 0 12px', lineHeight: 1.5 }}>
                  Escríbenos por WhatsApp (el mensaje ya viene listo). Ahí empieza tu acompañamiento diario. 💬
                </p>
                <a
                  href={waLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, width: '100%', padding: '15px', borderRadius: 14, border: 'none', color: '#fff', fontSize: 14.5, fontWeight: 800, letterSpacing: '0.04em', background: '#25D366', textDecoration: 'none', boxShadow: '0 12px 26px rgba(37,211,102,0.32)' }}
                >
                  <MessageCircle size={19} /> Activar por WhatsApp
                </a>
              </div>
            )}

            <button
              onClick={resetForm}
              style={{ width: '100%', padding: '14px', borderRadius: 14, border: `1px solid #E3E6F0`, color: NAVY, fontSize: 13.5, fontWeight: 800, letterSpacing: '0.04em', background: '#fff', cursor: 'pointer' }}
            >
              Registrar a otra persona
            </button>
          </div>
        ) : (
          <form onSubmit={submit}>
            {/* Encabezado */}
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ position: 'relative', width: 48, height: 48, margin: '0 auto 12px' }}>
                <Calendar size={48} strokeWidth={1.6} style={{ color: '#147e95' }} />
                <span style={{ position: 'absolute', bottom: 6, left: 0, right: 0, textAlign: 'center', fontSize: 15, fontWeight: 800, color: '#147e95' }}>90</span>
              </div>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: NAVY, margin: 0, textTransform: 'uppercase', letterSpacing: '-0.01em', lineHeight: 1.15 }}>
                Regístrate al {retoName}
              </h1>
              <p style={{ fontSize: 14.5, color: MUTED, margin: '8px 0 0' }}>Da el primer paso hacia tu transformación.</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={label}>Nombre</label>
                <input style={input} value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Escribe tu nombre completo" />
              </div>
              <div>
                <label style={label}>Celular</label>
                <input style={input} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Escribe tu número de celular" />
              </div>
              <div>
                <label style={label}>Correo</label>
                <input style={input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Escribe tu correo electrónico" />
              </div>
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 150px' }}>
                  <label style={label}>País</label>
                  <select style={{ ...input, cursor: 'pointer' }} value={country} onChange={(e) => setCountry(e.target.value)}>
                    <option value="">Selecciona tu país</option>
                    {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div style={{ flex: '1 1 150px' }}>
                  <label style={label}>Ciudad</label>
                  <input style={input} value={city} onChange={(e) => setCity(e.target.value)} placeholder="Escribe tu ciudad" />
                </div>
              </div>

              {error && (
                <div style={{ padding: '11px 14px', borderRadius: 10, background: 'rgba(220,38,38,0.07)', border: '1px solid rgba(220,38,38,0.25)', color: '#DC2626', fontSize: 13, fontWeight: 600 }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={sending}
                style={{
                  width: '100%', padding: '16px', borderRadius: 14, border: 'none', color: '#fff',
                  fontSize: 15, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase',
                  background: BRAND, cursor: sending ? 'wait' : 'pointer', opacity: sending ? 0.8 : 1,
                  boxShadow: '0 14px 30px rgba(0,229,208,0.32)', marginTop: 4,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                {sending && <Loader2 size={17} className="animate-spin" />}
                {sending ? 'Registrando…' : 'Registrarse'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
