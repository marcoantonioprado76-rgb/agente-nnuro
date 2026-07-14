'use client'

import { useState, useRef, useEffect } from 'react'

const DG = 'linear-gradient(135deg,#FF2D95 0%,#B735B8 48%,#233B8F 100%)'
const CATS = ['Bienvenidos', 'Distribuidores', 'Presentación de negocios', 'Lista de precios', 'Únete a mi equipo', 'Cumpleaños', 'Rangos', 'Varios', 'Otros']
const DISPLAY_MAX = 440

interface TextZone { id: string; x: number; y: number; w: number; text: string; fontSize: number; fontFamily: string; fill: string; align: 'left' | 'center' | 'right'; fontWeight: string }
interface PhotoZone { x: number; y: number; w: number; h: number }

let counter = 0
const newId = () => `t${++counter}_${Date.now()}`

export default function NuevoFlyerPage() {
  const [guardOk, setGuardOk] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [fondoUrl, setFondoUrl] = useState('')
  const [ancho, setAncho] = useState(0)
  const [alto, setAlto] = useState(0)
  const [nombre, setNombre] = useState('')
  const [categoria, setCategoria] = useState(CATS[0])
  const [texts, setTexts] = useState<TextZone[]>([])
  const [photo, setPhoto] = useState<PhotoZone | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const previewRef = useRef<HTMLDivElement>(null)
  const drag = useRef<{ id: string; offX: number; offY: number } | null>(null)

  useEffect(() => {
    fetch('/api/plan-status').then(r => r.json()).then(d => {
      if (d.orgRole !== 'ORG_ADMIN') { window.location.href = '/dashboard'; return }
      setGuardOk(true)
      const id = new URLSearchParams(window.location.search).get('id')
      if (id) {
        setEditId(id)
        fetch(`/api/empresa/content/flyers/${id}`).then(r => r.json()).then(dd => {
          const f = dd.flyer
          if (!f) return
          setNombre(f.nombre); setCategoria(f.categoria); setFondoUrl(f.fondoUrl); setAncho(f.ancho); setAlto(f.alto)
          setTexts(Array.isArray(f.zonas?.texts) ? f.zonas.texts.map((t: any) => ({ ...t })) : [])
          setPhoto(f.zonas?.photo ?? null)
        }).catch(() => {})
      }
    }).catch(() => { window.location.href = '/dashboard' })
  }, [])

  const scale = ancho && alto ? DISPLAY_MAX / Math.max(ancho, alto) : 1
  const dispW = ancho * scale, dispH = alto * scale

  async function uploadBg(file: File) {
    setUploading(true); setErr('')
    const fd = new FormData(); fd.append('file', file)
    const r = await fetch('/api/upload', { method: 'POST', body: fd })
    const d = await r.json().catch(() => ({}))
    setUploading(false)
    if (!d.url) { setErr('No se pudo subir la imagen'); return }
    const img = new window.Image()
    img.onload = () => { setAncho(img.naturalWidth); setAlto(img.naturalHeight); setFondoUrl(d.url) }
    img.src = d.url
  }

  function addText() {
    const z: TextZone = { id: newId(), x: ancho * 0.15, y: alto * 0.4, w: ancho * 0.7, text: 'Tu texto', fontSize: Math.round(alto * 0.06) || 48, fontFamily: 'Archivo', fill: '#ffffff', align: 'center', fontWeight: '700' }
    setTexts(t => [...t, z]); setSelected(z.id)
  }
  function addPhoto() {
    setPhoto({ x: ancho * 0.3, y: ancho * 0.08, w: ancho * 0.4, h: ancho * 0.4 }); setSelected('photo')
  }
  const upd = (id: string, patch: Partial<TextZone>) => setTexts(t => t.map(z => z.id === id ? { ...z, ...patch } : z))

  function posIn(e: React.MouseEvent) {
    const rect = previewRef.current!.getBoundingClientRect()
    return { x: (e.clientX - rect.left) / scale, y: (e.clientY - rect.top) / scale }
  }
  function onDown(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    const p = posIn(e)
    const z = id === 'photo' ? photo! : texts.find(t => t.id === id)!
    drag.current = { id, offX: p.x - z.x, offY: p.y - z.y }
    setSelected(id)
  }
  function onMove(e: React.MouseEvent) {
    if (!drag.current) return
    const p = posIn(e); const d = drag.current
    const nx = Math.max(0, p.x - d.offX), ny = Math.max(0, p.y - d.offY)
    if (d.id === 'photo') setPhoto(ph => ph ? { ...ph, x: nx, y: ny } : ph)
    else setTexts(t => t.map(z => z.id === d.id ? { ...z, x: nx, y: ny } : z))
  }

  async function save() {
    if (!fondoUrl) { setErr('Subí una imagen de fondo'); return }
    if (!nombre.trim()) { setErr('Ponele un nombre al flyer'); return }
    setSaving(true); setErr('')
    const body = { nombre: nombre.trim(), categoria, ancho, alto, fondoUrl, zonas: { photo, texts } }
    const r = await fetch(editId ? `/api/empresa/content/flyers/${editId}` : '/api/empresa/content/flyers', { method: editId ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const d = await r.json().catch(() => ({}))
    setSaving(false)
    if (!r.ok) { setErr(d.error || 'No se pudo guardar'); return }
    window.location.href = '/empresa/contenido'
  }

  if (!guardOk) return <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#0B1B2B', color: '#fff' }}><p style={{ opacity: 0.7 }}>Cargando…</p></div>

  const sel = selected && selected !== 'photo' ? texts.find(t => t.id === selected) : null

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg,#F5F7FB,#EEF1F8)', color: '#0B1B2B' }}>
      <header style={{ background: 'linear-gradient(135deg,#0B1B2B,#050B14)', color: '#fff', padding: '14px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ fontWeight: 800, fontSize: 15 }}>{editId ? 'Editar flyer' : 'Nuevo flyer'}</p>
        <a href="/empresa/contenido" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', padding: '8px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}><i className="fa-solid fa-arrow-left" style={{ marginRight: 6 }} />Volver</a>
      </header>

      <main style={{ maxWidth: 920, margin: '0 auto', padding: '22px 18px 60px', display: 'flex', gap: 22, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        {/* Preview / editor */}
        <div style={{ flex: '1 1 440px' }}>
          {!fondoUrl ? (
            <label style={{ display: 'grid', placeItems: 'center', height: 320, border: '2px dashed #C9D2DE', borderRadius: 16, background: '#fff', cursor: 'pointer', color: '#7A8494', textAlign: 'center', padding: 20 }}>
              <div>
                <i className="fa-solid fa-cloud-arrow-up" style={{ fontSize: 32, color: '#B735B8' }} />
                <p style={{ marginTop: 10, fontWeight: 700 }}>{uploading ? 'Subiendo…' : 'Subí la imagen de fondo del flyer'}</p>
                <p style={{ fontSize: 12, marginTop: 4 }}>JPG o PNG · es el diseño base</p>
              </div>
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) uploadBg(f) }} />
            </label>
          ) : (
            <>
              <div
                ref={previewRef}
                onClick={() => setSelected(null)}
                onMouseMove={onMove}
                onMouseUp={() => { drag.current = null }}
                onMouseLeave={() => { drag.current = null }}
                style={{ position: 'relative', width: dispW, height: dispH, backgroundImage: `url(${fondoUrl})`, backgroundSize: 'cover', borderRadius: 10, overflow: 'hidden', boxShadow: '0 10px 30px -16px rgba(11,27,43,0.5)', userSelect: 'none', maxWidth: '100%' }}
              >
                {photo && (
                  <div onMouseDown={e => onDown(e, 'photo')} style={{ position: 'absolute', left: photo.x * scale, top: photo.y * scale, width: photo.w * scale, height: photo.h * scale, border: `2px dashed ${selected === 'photo' ? '#FF2D95' : 'rgba(255,255,255,0.8)'}`, borderRadius: 8, display: 'grid', placeItems: 'center', color: 'rgba(255,255,255,0.9)', background: 'rgba(0,0,0,0.15)', cursor: 'move' }}>
                    <i className="fa-solid fa-user" /> <span style={{ fontSize: 10, marginLeft: 4 }}>foto</span>
                  </div>
                )}
                {texts.map(t => (
                  <div key={t.id} onMouseDown={e => onDown(e, t.id)} style={{ position: 'absolute', left: t.x * scale, top: t.y * scale, width: t.w * scale, fontSize: t.fontSize * scale, color: t.fill, textAlign: t.align, fontWeight: t.fontWeight as any, lineHeight: 1.1, cursor: 'move', outline: selected === t.id ? '2px solid #FF2D95' : 'none', textShadow: '0 1px 3px rgba(0,0,0,0.35)', whiteSpace: 'pre-wrap' }}>
                    {t.text || 'Texto'}
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                <button onClick={addText} style={btnGhost}><i className="fa-solid fa-font" style={{ marginRight: 6 }} />Agregar texto</button>
                {!photo && <button onClick={addPhoto} style={btnGhost}><i className="fa-solid fa-image" style={{ marginRight: 6 }} />Hueco de foto</button>}
                <label style={{ ...btnGhost, cursor: 'pointer' }}><i className="fa-solid fa-arrows-rotate" style={{ marginRight: 6 }} />Cambiar fondo<input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) uploadBg(f) }} /></label>
              </div>
              <p style={{ fontSize: 12, color: '#9AA3B2', marginTop: 8 }}>Arrastrá los textos y el hueco de foto a su lugar. Tus usuarios editarán el texto y pondrán su foto.</p>
            </>
          )}
        </div>

        {/* Panel lateral */}
        <div style={{ flex: '1 1 280px', minWidth: 260 }}>
          <div style={{ background: '#fff', border: '1px solid #E4E9F0', borderRadius: 14, padding: '16px 18px', marginBottom: 14 }}>
            <Field label="Nombre del flyer"><input style={inp} value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej. Bienvenida equipo" /></Field>
            <Field label="Categoría">
              <select style={inp} value={categoria} onChange={e => setCategoria(e.target.value)}>{CATS.map(c => <option key={c} value={c}>{c}</option>)}</select>
            </Field>
          </div>

          {sel && (
            <div style={{ background: '#fff', border: '1px solid #E4E9F0', borderRadius: 14, padding: '16px 18px', marginBottom: 14 }}>
              <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 10 }}>Texto seleccionado</h3>
              <Field label="Contenido"><textarea style={{ ...inp, minHeight: 50 }} value={sel.text} onChange={e => upd(sel.id, { text: e.target.value })} /></Field>
              <div style={{ display: 'flex', gap: 10 }}>
                <Field label="Tamaño"><input type="number" style={inp} value={sel.fontSize} onChange={e => upd(sel.id, { fontSize: parseInt(e.target.value) || 10 })} /></Field>
                <Field label="Color"><input type="color" style={{ ...inp, padding: 4, height: 38 }} value={sel.fill} onChange={e => upd(sel.id, { fill: e.target.value })} /></Field>
              </div>
              <Field label="Alineación">
                <div style={{ display: 'flex', gap: 6 }}>
                  {(['left', 'center', 'right'] as const).map(a => (
                    <button key={a} onClick={() => upd(sel.id, { align: a })} style={{ flex: 1, padding: '8px 0', borderRadius: 8, border: sel.align === a ? '2px solid #B735B8' : '1px solid #E4E9F0', background: '#fff', cursor: 'pointer', color: '#5B6472' }}><i className={`fa-solid fa-align-${a}`} /></button>
                  ))}
                </div>
              </Field>
              <button onClick={() => { setTexts(t => t.filter(z => z.id !== sel.id)); setSelected(null) }} style={{ ...btnGhost, color: '#ef4444', width: '100%', marginTop: 6 }}><i className="fa-solid fa-trash" style={{ marginRight: 6 }} />Eliminar texto</button>
            </div>
          )}
          {selected === 'photo' && photo && (
            <div style={{ background: '#fff', border: '1px solid #E4E9F0', borderRadius: 14, padding: '16px 18px', marginBottom: 14 }}>
              <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 10 }}>Hueco de foto</h3>
              <div style={{ display: 'flex', gap: 10 }}>
                <Field label="Ancho"><input type="number" style={inp} value={Math.round(photo.w)} onChange={e => setPhoto(p => p ? { ...p, w: parseInt(e.target.value) || 10 } : p)} /></Field>
                <Field label="Alto"><input type="number" style={inp} value={Math.round(photo.h)} onChange={e => setPhoto(p => p ? { ...p, h: parseInt(e.target.value) || 10 } : p)} /></Field>
              </div>
              <button onClick={() => { setPhoto(null); setSelected(null) }} style={{ ...btnGhost, color: '#ef4444', width: '100%', marginTop: 6 }}><i className="fa-solid fa-trash" style={{ marginRight: 6 }} />Quitar hueco de foto</button>
            </div>
          )}

          {err && <p style={{ color: '#dc2626', fontSize: 13, marginBottom: 10 }}>{err}</p>}
          <button onClick={save} disabled={saving || !fondoUrl} style={{ width: '100%', background: (saving || !fondoUrl) ? '#C4CCD8' : DG, color: '#fff', border: 'none', borderRadius: 12, padding: '13px 0', fontWeight: 800, fontSize: 14, cursor: (saving || !fondoUrl) ? 'not-allowed' : 'pointer' }}>{saving ? 'Guardando…' : 'Guardar flyer'}</button>
        </div>
      </main>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div style={{ flex: 1, marginBottom: 10 }}><label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 5 }}>{label}</label>{children}</div>
}
const inp: React.CSSProperties = { width: '100%', padding: '9px 11px', borderRadius: 9, border: '1px solid #D5DCE6', fontSize: 13, outline: 'none', boxSizing: 'border-box', background: '#fff', color: '#111827', fontFamily: 'inherit' }
const btnGhost: React.CSSProperties = { padding: '9px 14px', borderRadius: 10, border: '1px solid #E4E9F0', background: '#fff', color: '#5B6472', fontWeight: 700, cursor: 'pointer', fontSize: 13 }
