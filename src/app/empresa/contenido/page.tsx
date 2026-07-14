'use client'

import { useState, useEffect } from 'react'

const DG = 'linear-gradient(135deg,#FF2D95 0%,#B735B8 48%,#233B8F 100%)'

type Tab = 'courses' | 'podcasts' | 'store' | 'recursos' | 'flyers'

interface CourseRow { id: string; title: string; description: string; coverUrl: string | null; price: number; freeForPlan: boolean; categoria: string | null; nivel: string | null; videos?: { title: string; youtubeUrl: string }[]; _count?: { videos: number } }
interface PodcastRow { id: string; title: string; description: string | null; coverUrl: string | null; embedUrl: string; active: boolean; order?: number }
interface StoreRow { id: string; title: string; description: string; category: string; price: number; memberPrice: number | null; images: string[]; stock: number; active: boolean; variants?: { name: string; options: string[] }[] }

async function uploadFile(file: File): Promise<string | null> {
  const fd = new FormData(); fd.append('file', file)
  const r = await fetch('/api/upload', { method: 'POST', body: fd })
  const d = await r.json().catch(() => ({}))
  return d.url ?? null
}

export default function ContenidoEmpresaPage() {
  const [guardOk, setGuardOk] = useState(false)
  const [tab, setTab] = useState<Tab>('courses')

  useEffect(() => {
    fetch('/api/plan-status').then(r => r.json()).then(d => {
      if (d.orgRole !== 'ORG_ADMIN') { window.location.href = '/dashboard'; return }
      setGuardOk(true)
    }).catch(() => { window.location.href = '/dashboard' })
  }, [])

  if (!guardOk) return <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#0B1B2B', color: '#fff' }}><p style={{ opacity: 0.7 }}>Cargando…</p></div>

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg,#F5F7FB,#EEF1F8)', color: '#0B1B2B' }}>
      <header style={{ background: 'linear-gradient(135deg,#0B1B2B,#050B14)', color: '#fff', padding: '14px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src="/logo-oficial-mydiamond.png" alt="MY DIAMOND" style={{ height: 32 }} />
          <p style={{ fontWeight: 800, fontSize: 15 }}>Mi Contenido</p>
        </div>
        <a href="/empresa" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', padding: '8px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
          <i className="fa-solid fa-arrow-left" style={{ marginRight: 6 }} />Volver
        </a>
      </header>

      <main style={{ maxWidth: 980, margin: '0 auto', padding: '24px 18px 60px' }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
          {([['courses', '🎓 Cursos'], ['podcasts', '🎙️ Podcasts'], ['recursos', '📚 Recursos'], ['flyers', '🎨 Flyers'], ['store', '🛍️ Tienda']] as [Tab, string][]).map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)} style={{ padding: '9px 18px', borderRadius: 11, fontWeight: 800, fontSize: 13, cursor: 'pointer', border: tab === t ? 'none' : '1px solid #E4E9F0', background: tab === t ? DG : '#fff', color: tab === t ? '#fff' : '#5B6472' }}>{label}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 9, alignItems: 'center', background: 'rgba(35,59,143,0.06)', border: '1px solid rgba(35,59,143,0.15)', borderRadius: 12, padding: '11px 15px', marginBottom: 18, fontSize: 13, color: '#33405A' }}>
          <i className="fa-solid fa-lock" style={{ color: '#B735B8' }} />
          Todo lo que cargues acá es <strong>&nbsp;privado de tu empresa</strong>: solo tus usuarios lo verán.
        </div>

        {tab === 'courses' && <CoursesTab />}
        {tab === 'podcasts' && <PodcastsTab />}
        {tab === 'recursos' && <RecursosTab />}
        {tab === 'flyers' && <FlyersTab />}
        {tab === 'store' && <StoreTab />}
      </main>
    </div>
  )
}

/* ─────────────── CURSOS ─────────────── */
function CoursesTab() {
  const [items, setItems] = useState<CourseRow[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<{ mode: 'create' | 'edit'; data: any } | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [delId, setDelId] = useState<string | null>(null)

  const EMPTY = { title: '', description: '', coverUrl: '', price: '0', freeForPlan: true, categoria: '', nivel: '', videos: [{ title: '', youtubeUrl: '' }] }
  const [upVideo, setUpVideo] = useState(-1)

  async function load() { setLoading(true); try { const r = await fetch('/api/empresa/content/courses'); const d = await r.json(); setItems(d.courses || []) } finally { setLoading(false) } }
  useEffect(() => { load() }, [])

  async function save() {
    const d = modal!.data
    if (!d.title.trim() || !d.description.trim()) { setErr('Título y descripción son requeridos'); return }
    setBusy(true); setErr('')
    const body = { title: d.title, description: d.description, coverUrl: d.coverUrl || null, price: d.price || '0', freeForPlan: d.freeForPlan, categoria: d.categoria || null, nivel: d.nivel || null, videos: d.videos.filter((v: any) => v.title.trim() && ((v.youtubeUrl || '').trim() || (v.videoUrl || '').trim())).map((v: any) => ({ ...v, youtubeUrl: (v.youtubeUrl || '').trim(), videoUrl: v.videoUrl || null })) }
    const url = modal!.mode === 'edit' ? `/api/empresa/content/courses/${d.id}` : '/api/empresa/content/courses'
    const r = await fetch(url, { method: modal!.mode === 'edit' ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const j = await r.json(); setBusy(false)
    if (!r.ok) { setErr(j.error || 'Error'); return }
    setModal(null); load()
  }
  async function del(id: string) { setBusy(true); await fetch(`/api/empresa/content/courses/${id}`, { method: 'DELETE' }); setBusy(false); setDelId(null); load() }

  return (
    <>
      <ListHeader title="Tus cursos" onCreate={() => { setErr(''); setModal({ mode: 'create', data: { ...EMPTY, videos: [{ title: '', youtubeUrl: '' }] } }) }} />
      {loading ? <Loading /> : items.length === 0 ? <Empty text="Todavía no cargaste cursos." /> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.map(c => (
            <Row key={c.id} cover={c.coverUrl} title={c.title} subtitle={`${c._count?.videos ?? c.videos?.length ?? 0} videos · ${c.freeForPlan ? 'Incluido' : '$' + c.price}`}
              onEdit={() => { setErr(''); setModal({ mode: 'edit', data: { id: c.id, title: c.title, description: c.description, coverUrl: c.coverUrl || '', price: String(c.price), freeForPlan: c.freeForPlan, categoria: c.categoria || '', nivel: c.nivel || '', videos: (c.videos && c.videos.length ? c.videos.map((v: any) => ({ title: v.title, youtubeUrl: v.youtubeUrl || '', videoUrl: v.videoUrl || '', moduloTitulo: v.moduloTitulo || '', descripcion: v.descripcion || '', preview: !!v.preview })) : [{ title: '', youtubeUrl: '' }]) } }) }}
              onDelete={() => setDelId(c.id)} />
          ))}
        </div>
      )}

      {modal && (
        <Modal title={modal.mode === 'edit' ? 'Editar curso' : 'Nuevo curso'} onClose={() => setModal(null)}>
          <Field label="Título"><input style={inp} value={modal.data.title} onChange={e => setModal({ ...modal, data: { ...modal.data, title: e.target.value } })} /></Field>
          <Field label="Descripción"><textarea style={{ ...inp, minHeight: 70 }} value={modal.data.description} onChange={e => setModal({ ...modal, data: { ...modal.data, description: e.target.value } })} /></Field>
          <CoverField value={modal.data.coverUrl} onChange={(v: string) => setModal({ ...modal, data: { ...modal.data, coverUrl: v } })} />
          <div style={{ display: 'flex', gap: 10 }}>
            <Field label="Categoría"><input style={inp} value={modal.data.categoria} onChange={e => setModal({ ...modal, data: { ...modal.data, categoria: e.target.value } })} /></Field>
            <Field label="Nivel"><input style={inp} value={modal.data.nivel} onChange={e => setModal({ ...modal, data: { ...modal.data, nivel: e.target.value } })} placeholder="Principiante…" /></Field>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#5B6472', margin: '4px 0 10px' }}>
            <input type="checkbox" checked={modal.data.freeForPlan} onChange={e => setModal({ ...modal, data: { ...modal.data, freeForPlan: e.target.checked } })} />
            Incluido para mis usuarios (sin costo extra)
          </label>
          <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 6 }}>Videos / clases (YouTube)</label>
          {modal.data.videos.map((v: any, i: number) => {
            const upd = (patch: any) => { const vids = [...modal.data.videos]; vids[i] = { ...vids[i], ...patch }; setModal({ ...modal, data: { ...modal.data, videos: vids } }) }
            return (
              <div key={i} style={{ background: '#F7F9FC', border: '1px solid #E4E9F0', borderRadius: 10, padding: 10, marginBottom: 8 }}>
                <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                  <input style={{ ...inp, flex: 1 }} placeholder="Título del video" value={v.title} onChange={e => upd({ title: e.target.value })} />
                  <button onClick={() => { const vids = modal.data.videos.filter((_: any, ix: number) => ix !== i); setModal({ ...modal, data: { ...modal.data, videos: vids.length ? vids : [{ title: '', youtubeUrl: '' }] } }) }} style={{ ...iconBtn, color: '#ef4444' }}><i className="fa-solid fa-xmark" /></button>
                </div>
                <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                  <input style={{ ...inp, flex: 1 }} placeholder="https://youtube.com/… o subí un video →" value={v.youtubeUrl} onChange={e => upd({ youtubeUrl: e.target.value })} />
                  <label style={{ ...iconBtn, width: 'auto', padding: '0 12px', display: 'grid', placeItems: 'center', cursor: 'pointer', color: '#B735B8' }} title="Subir archivo de video (mp4)">
                    {upVideo === i ? <i className="fa-solid fa-spinner fa-spin" /> : <i className="fa-solid fa-film" />}
                    <input type="file" accept="video/mp4,video/quicktime,video/*" style={{ display: 'none' }} onChange={async e => { const f = e.target.files?.[0]; if (!f) return; setUpVideo(i); const u = await uploadFile(f); setUpVideo(-1); if (u) upd({ videoUrl: u }) }} />
                  </label>
                </div>
                {v.videoUrl && (
                  <p style={{ fontSize: 11.5, color: '#16a34a', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <i className="fa-solid fa-circle-check" /> Video subido
                    <button onClick={() => upd({ videoUrl: '' })} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, textDecoration: 'underline' }}>quitar</button>
                  </p>
                )}
                <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                  <input style={{ ...inp, flex: 1 }} placeholder="Módulo (opcional)" value={v.moduloTitulo || ''} onChange={e => upd({ moduloTitulo: e.target.value })} />
                  <input style={{ ...inp, flex: 1.4 }} placeholder="Descripción (opcional)" value={v.descripcion || ''} onChange={e => upd({ descripcion: e.target.value })} />
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: '#5B6472' }}>
                  <input type="checkbox" checked={!!v.preview} onChange={e => upd({ preview: e.target.checked })} /> Vista previa gratis (se ve sin inscribirse)
                </label>
              </div>
            )
          })}
          <button onClick={() => setModal({ ...modal, data: { ...modal.data, videos: [...modal.data.videos, { title: '', youtubeUrl: '' }] } })} style={{ fontSize: 12, color: '#B735B8', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>+ Agregar video</button>
          {err && <p style={errP}>{err}</p>}
          <Actions onCancel={() => setModal(null)} onSave={save} busy={busy} />
        </Modal>
      )}
      {delId && <ConfirmDelete onCancel={() => setDelId(null)} onConfirm={() => del(delId)} busy={busy} />}
    </>
  )
}

/* ─────────────── PODCASTS ─────────────── */
function PodcastsTab() {
  const [items, setItems] = useState<PodcastRow[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<{ mode: 'create' | 'edit'; data: any } | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [delId, setDelId] = useState<string | null>(null)
  const EMPTY = { title: '', description: '', coverUrl: '', embedUrl: '', order: '0', active: true }
  const [upAudio, setUpAudio] = useState(false)

  async function load() { setLoading(true); try { const r = await fetch('/api/empresa/content/podcasts'); const d = await r.json(); setItems(d.podcasts || []) } finally { setLoading(false) } }
  useEffect(() => { load() }, [])

  async function save() {
    const d = modal!.data
    if (!d.title.trim() || !d.embedUrl.trim()) { setErr('Título y URL del audio son requeridos'); return }
    setBusy(true); setErr('')
    const body = { title: d.title, description: d.description || null, coverUrl: d.coverUrl || null, embedUrl: d.embedUrl, order: Number(d.order) || 0, active: d.active }
    const url = modal!.mode === 'edit' ? `/api/empresa/content/podcasts/${d.id}` : '/api/empresa/content/podcasts'
    const r = await fetch(url, { method: modal!.mode === 'edit' ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const j = await r.json(); setBusy(false)
    if (!r.ok) { setErr(j.error || 'Error'); return }
    setModal(null); load()
  }
  async function del(id: string) { setBusy(true); await fetch(`/api/empresa/content/podcasts/${id}`, { method: 'DELETE' }); setBusy(false); setDelId(null); load() }

  return (
    <>
      <ListHeader title="Tus podcasts" onCreate={() => { setErr(''); setModal({ mode: 'create', data: { ...EMPTY } }) }} />
      {loading ? <Loading /> : items.length === 0 ? <Empty text="Todavía no cargaste podcasts." /> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.map(p => (
            <Row key={p.id} cover={p.coverUrl} title={p.title} subtitle={p.active ? 'Activo' : 'Oculto'}
              onEdit={() => { setErr(''); setModal({ mode: 'edit', data: { id: p.id, title: p.title, description: p.description || '', coverUrl: p.coverUrl || '', embedUrl: p.embedUrl, order: String(p.order ?? 0), active: p.active } }) }}
              onDelete={() => setDelId(p.id)} />
          ))}
        </div>
      )}
      {modal && (
        <Modal title={modal.mode === 'edit' ? 'Editar podcast' : 'Nuevo podcast'} onClose={() => setModal(null)}>
          <Field label="Título"><input style={inp} value={modal.data.title} onChange={e => setModal({ ...modal, data: { ...modal.data, title: e.target.value } })} /></Field>
          <Field label="Descripción"><textarea style={{ ...inp, minHeight: 60 }} value={modal.data.description} onChange={e => setModal({ ...modal, data: { ...modal.data, description: e.target.value } })} /></Field>
          <CoverField value={modal.data.coverUrl} onChange={(v: string) => setModal({ ...modal, data: { ...modal.data, coverUrl: v } })} />
          <Field label="Audio / embed (YouTube, Spotify, o subí un mp3)">
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input style={{ ...inp, flex: 1 }} value={modal.data.embedUrl} onChange={e => setModal({ ...modal, data: { ...modal.data, embedUrl: e.target.value } })} placeholder="https://… o subí →" />
              <label style={{ ...iconBtn, width: 'auto', padding: '0 12px', display: 'grid', placeItems: 'center', cursor: 'pointer', color: '#B735B8' }}>
                {upAudio ? <i className="fa-solid fa-spinner fa-spin" /> : <i className="fa-solid fa-music" />}
                <input type="file" accept="audio/*,.mp3,.wav,.m4a" style={{ display: 'none' }} onChange={async e => { const f = e.target.files?.[0]; if (!f) return; setUpAudio(true); const u = await uploadFile(f); setUpAudio(false); if (u) setModal(m => m ? { ...m, data: { ...m.data, embedUrl: u } } : m) }} />
              </label>
            </div>
          </Field>
          <Field label="Orden (menor aparece primero)"><input type="number" style={inp} value={modal.data.order} onChange={e => setModal({ ...modal, data: { ...modal.data, order: e.target.value } })} /></Field>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#5B6472', margin: '4px 0 6px' }}>
            <input type="checkbox" checked={modal.data.active} onChange={e => setModal({ ...modal, data: { ...modal.data, active: e.target.checked } })} /> Visible para mis usuarios
          </label>
          {err && <p style={errP}>{err}</p>}
          <Actions onCancel={() => setModal(null)} onSave={save} busy={busy} />
        </Modal>
      )}
      {delId && <ConfirmDelete onCancel={() => setDelId(null)} onConfirm={() => del(delId)} busy={busy} />}
    </>
  )
}

/* ─────────────── TIENDA ─────────────── */
function StoreTab() {
  const [items, setItems] = useState<StoreRow[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<{ mode: 'create' | 'edit'; data: any } | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [delId, setDelId] = useState<string | null>(null)
  const EMPTY = { title: '', description: '', category: 'General', price: '', memberPrice: '', stock: '0', images: [''] as string[], variants: [] as { name: string; options: string }[], active: true }

  async function load() { setLoading(true); try { const r = await fetch('/api/empresa/content/store-items'); const d = await r.json(); setItems(d.items || []) } finally { setLoading(false) } }
  useEffect(() => { load() }, [])

  async function save() {
    const d = modal!.data
    if (!d.title.trim() || !d.description.trim() || !d.price) { setErr('Título, descripción y precio son requeridos'); return }
    setBusy(true); setErr('')
    const body = { title: d.title, description: d.description, category: d.category || 'General', price: parseFloat(d.price), memberPrice: d.memberPrice ? parseFloat(d.memberPrice) : parseFloat(d.price), stock: parseInt(d.stock || '0'), images: d.images.filter((x: string) => x.trim()), variants: d.variants.filter((v: any) => v.name.trim()).map((v: any) => ({ name: v.name.trim(), options: v.options.split(',').map((o: string) => o.trim()).filter(Boolean) })), active: d.active }
    const url = modal!.mode === 'edit' ? `/api/empresa/content/store-items/${d.id}` : '/api/empresa/content/store-items'
    const r = await fetch(url, { method: modal!.mode === 'edit' ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const j = await r.json(); setBusy(false)
    if (!r.ok) { setErr(j.error || 'Error'); return }
    setModal(null); load()
  }
  async function del(id: string) { setBusy(true); const r = await fetch(`/api/empresa/content/store-items/${id}`, { method: 'DELETE' }); const j = await r.json().catch(() => ({})); setBusy(false); setDelId(null); if (!r.ok) alert(j.error || 'No se pudo eliminar'); load() }

  return (
    <>
      <ListHeader title="Tus productos" onCreate={() => { setErr(''); setModal({ mode: 'create', data: { ...EMPTY } }) }} />
      {loading ? <Loading /> : items.length === 0 ? <Empty text="Todavía no cargaste productos." /> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.map(it => (
            <Row key={it.id} cover={it.images?.[0] || null} title={it.title} subtitle={`$${it.price} · stock ${it.stock} · ${it.active ? 'Activo' : 'Inactivo'}`}
              onEdit={() => { setErr(''); setModal({ mode: 'edit', data: { id: it.id, title: it.title, description: it.description, category: it.category, price: String(it.price), memberPrice: it.memberPrice != null ? String(it.memberPrice) : '', stock: String(it.stock), images: it.images?.length ? [...it.images] : [''], variants: (it.variants || []).map(v => ({ name: v.name, options: (v.options || []).join(', ') })), active: it.active } }) }}
              onDelete={() => setDelId(it.id)} />
          ))}
        </div>
      )}
      {modal && (
        <Modal title={modal.mode === 'edit' ? 'Editar producto' : 'Nuevo producto'} onClose={() => setModal(null)}>
          <Field label="Título"><input style={inp} value={modal.data.title} onChange={e => setModal({ ...modal, data: { ...modal.data, title: e.target.value } })} /></Field>
          <Field label="Descripción"><textarea style={{ ...inp, minHeight: 60 }} value={modal.data.description} onChange={e => setModal({ ...modal, data: { ...modal.data, description: e.target.value } })} /></Field>
          <ImagesField images={modal.data.images} onChange={(imgs: string[]) => setModal({ ...modal, data: { ...modal.data, images: imgs } })} />
          <div style={{ display: 'flex', gap: 10 }}>
            <Field label="Precio"><input type="number" style={inp} value={modal.data.price} onChange={e => setModal({ ...modal, data: { ...modal.data, price: e.target.value } })} /></Field>
            <Field label="Precio socio (opc.)"><input type="number" style={inp} value={modal.data.memberPrice} onChange={e => setModal({ ...modal, data: { ...modal.data, memberPrice: e.target.value } })} /></Field>
            <Field label="Stock"><input type="number" style={inp} value={modal.data.stock} onChange={e => setModal({ ...modal, data: { ...modal.data, stock: e.target.value } })} /></Field>
          </div>
          <Field label="Categoría"><input style={inp} value={modal.data.category} onChange={e => setModal({ ...modal, data: { ...modal.data, category: e.target.value } })} placeholder="Ej. Ropa, Suplementos, Cursos" /></Field>
          <VariantsField variants={modal.data.variants} onChange={(vs: { name: string; options: string }[]) => setModal({ ...modal, data: { ...modal.data, variants: vs } })} />
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#5B6472', margin: '4px 0 6px' }}>
            <input type="checkbox" checked={modal.data.active} onChange={e => setModal({ ...modal, data: { ...modal.data, active: e.target.checked } })} /> Visible en la tienda
          </label>
          {err && <p style={errP}>{err}</p>}
          <Actions onCancel={() => setModal(null)} onSave={save} busy={busy} />
        </Modal>
      )}
      {delId && <ConfirmDelete onCancel={() => setDelId(null)} onConfirm={() => del(delId)} busy={busy} />}
    </>
  )
}

/* ─────────────── RECURSOS (presentaciones / libros) ─────────────── */
function RecursosTab() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<{ mode: 'create' | 'edit'; data: any } | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [delId, setDelId] = useState<string | null>(null)
  const [upPdf, setUpPdf] = useState(false)
  const EMPTY = { tipo: 'presentacion', titulo: '', categoria: '', archivoUrl: '', portadaUrl: '', paginas: '' }

  async function load() { setLoading(true); try { const r = await fetch('/api/empresa/content/recursos'); const d = await r.json(); setItems(d.resources || []) } finally { setLoading(false) } }
  useEffect(() => { load() }, [])

  async function save() {
    const d = modal!.data
    if (!d.titulo.trim() || !d.categoria.trim() || !d.archivoUrl.trim()) { setErr('Título, categoría y archivo (PDF) son requeridos'); return }
    setBusy(true); setErr('')
    const body = { tipo: d.tipo, titulo: d.titulo, categoria: d.categoria, archivoUrl: d.archivoUrl, portadaUrl: d.portadaUrl || null, paginas: d.paginas || null }
    const url = modal!.mode === 'edit' ? `/api/empresa/content/recursos/${d.id}` : '/api/empresa/content/recursos'
    const r = await fetch(url, { method: modal!.mode === 'edit' ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const j = await r.json(); setBusy(false)
    if (!r.ok) { setErr(j.error || 'Error'); return }
    setModal(null); load()
  }
  async function del(id: string) { setBusy(true); await fetch(`/api/empresa/content/recursos/${id}`, { method: 'DELETE' }); setBusy(false); setDelId(null); load() }

  return (
    <>
      <ListHeader title="Tus presentaciones y libros" onCreate={() => { setErr(''); setModal({ mode: 'create', data: { ...EMPTY } }) }} />
      {loading ? <Loading /> : items.length === 0 ? <Empty text="Todavía no cargaste presentaciones ni libros." /> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.map(it => (
            <Row key={it.id} cover={it.portadaUrl} title={it.titulo} subtitle={`${it.tipo === 'libro' ? '📕 Libro' : '📊 Presentación'} · ${it.categoria}`}
              onEdit={() => { setErr(''); setModal({ mode: 'edit', data: { id: it.id, tipo: it.tipo, titulo: it.titulo, categoria: it.categoria, archivoUrl: it.archivoUrl, portadaUrl: it.portadaUrl || '', paginas: it.paginas != null ? String(it.paginas) : '' } }) }}
              onDelete={() => setDelId(it.id)} />
          ))}
        </div>
      )}
      {modal && (
        <Modal title={modal.mode === 'edit' ? 'Editar recurso' : 'Nuevo recurso'} onClose={() => setModal(null)}>
          <Field label="Tipo">
            <select style={inp} value={modal.data.tipo} onChange={e => setModal({ ...modal, data: { ...modal.data, tipo: e.target.value } })}>
              <option value="presentacion">📊 Presentación</option>
              <option value="libro">📕 Libro</option>
            </select>
          </Field>
          <Field label="Título"><input style={inp} value={modal.data.titulo} onChange={e => setModal({ ...modal, data: { ...modal.data, titulo: e.target.value } })} /></Field>
          <Field label="Categoría"><input style={inp} value={modal.data.categoria} onChange={e => setModal({ ...modal, data: { ...modal.data, categoria: e.target.value } })} placeholder="Ej. Ventas, Onboarding" /></Field>
          <Field label="Archivo PDF">
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input style={{ ...inp, flex: 1 }} value={modal.data.archivoUrl} onChange={e => setModal({ ...modal, data: { ...modal.data, archivoUrl: e.target.value } })} placeholder="URL del PDF o subí →" />
              <label style={{ ...iconBtn, width: 'auto', padding: '0 12px', display: 'grid', placeItems: 'center', cursor: 'pointer', color: '#B735B8' }}>
                {upPdf ? <i className="fa-solid fa-spinner fa-spin" /> : <i className="fa-solid fa-upload" />}
                <input type="file" accept="application/pdf,.pdf" style={{ display: 'none' }} onChange={async e => { const f = e.target.files?.[0]; if (!f) return; setUpPdf(true); const u = await uploadFile(f); setUpPdf(false); if (u) setModal(m => m ? { ...m, data: { ...m.data, archivoUrl: u } } : m) }} />
              </label>
            </div>
          </Field>
          <CoverField label="Portada (opcional)" value={modal.data.portadaUrl} onChange={(v: string) => setModal({ ...modal, data: { ...modal.data, portadaUrl: v } })} />
          {err && <p style={errP}>{err}</p>}
          <Actions onCancel={() => setModal(null)} onSave={save} busy={busy} />
        </Modal>
      )}
      {delId && <ConfirmDelete onCancel={() => setDelId(null)} onConfirm={() => del(delId)} busy={busy} />}
    </>
  )
}

/* ─────────────── FLYERS ─────────────── */
function FlyersTab() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [delId, setDelId] = useState<string | null>(null)
  async function load() { setLoading(true); try { const r = await fetch('/api/empresa/content/flyers'); const d = await r.json(); setItems(d.flyers || []) } finally { setLoading(false) } }
  useEffect(() => { load() }, [])
  async function del(id: string) { setBusy(true); await fetch(`/api/empresa/content/flyers/${id}`, { method: 'DELETE' }); setBusy(false); setDelId(null); load() }
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h2 style={{ fontSize: 16, fontWeight: 800 }}>Tus flyers</h2>
        <a href="/empresa/flyer/nuevo" style={{ background: DG, color: '#fff', borderRadius: 11, padding: '10px 18px', fontWeight: 800, fontSize: 13, textDecoration: 'none' }}><i className="fa-solid fa-plus" style={{ marginRight: 7 }} />Crear flyer</a>
      </div>
      {loading ? <Loading /> : items.length === 0 ? <Empty text="Todavía no creaste flyers. Tocá 'Crear flyer' para diseñar uno (subís el fondo y colocás los textos)." /> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
          {items.map(f => (
            <div key={f.id} style={{ background: '#fff', border: '1px solid #E4E9F0', borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ height: 120, background: `center/cover url(${f.thumbUrl || f.fondoUrl})` }} />
              <div style={{ padding: '10px 12px' }}>
                <p style={{ fontWeight: 700, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.nombre}</p>
                <p style={{ fontSize: 11, color: '#8A93A2', marginBottom: 8 }}>{f.categoria}</p>
                <div style={{ display: 'flex', gap: 6 }}>
                  <a href={`/empresa/flyer/nuevo?id=${f.id}`} title="Editar" style={{ ...iconBtn, flex: 1, display: 'grid', placeItems: 'center', textDecoration: 'none' }}><i className="fa-solid fa-pen" /></a>
                  <button onClick={() => setDelId(f.id)} title="Eliminar" style={{ ...iconBtn, flex: 1, color: '#ef4444' }}><i className="fa-solid fa-trash" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {delId && <ConfirmDelete onCancel={() => setDelId(null)} onConfirm={() => del(delId)} busy={busy} />}
    </>
  )
}

/* ─────────────── piezas compartidas ─────────────── */
function ListHeader({ title, onCreate }: { title: string; onCreate: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
      <h2 style={{ fontSize: 16, fontWeight: 800 }}>{title}</h2>
      <button onClick={onCreate} style={{ background: DG, color: '#fff', border: 'none', borderRadius: 11, padding: '10px 18px', fontWeight: 800, fontSize: 13, cursor: 'pointer', boxShadow: '0 8px 22px -10px rgba(183,53,184,0.7)' }}>
        <i className="fa-solid fa-plus" style={{ marginRight: 7 }} />Crear
      </button>
    </div>
  )
}
function Row({ cover, title, subtitle, onEdit, onDelete }: { cover: string | null; title: string; subtitle: string; onEdit: () => void; onDelete: () => void }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #E4E9F0', borderRadius: 14, padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
        <div style={{ width: 46, height: 46, borderRadius: 10, background: cover ? `center/cover url(${cover})` : DG, flexShrink: 0 }} />
        <div style={{ minWidth: 0 }}>
          <p style={{ fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</p>
          <p style={{ fontSize: 12, color: '#8A93A2' }}>{subtitle}</p>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        <button onClick={onEdit} style={iconBtn} title="Editar"><i className="fa-solid fa-pen" /></button>
        <button onClick={onDelete} style={{ ...iconBtn, color: '#ef4444' }} title="Eliminar"><i className="fa-solid fa-trash" /></button>
      </div>
    </div>
  )
}
function CoverField({ value, onChange, label = 'Portada' }: { value: string; onChange: (v: string) => void; label?: string }) {
  const [up, setUp] = useState(false)
  return (
    <Field label={label}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input style={{ ...inp, flex: 1 }} value={value} onChange={e => onChange(e.target.value)} placeholder="URL o subí una imagen →" />
        <label style={{ ...iconBtn, width: 'auto', padding: '0 12px', display: 'grid', placeItems: 'center', cursor: 'pointer', color: '#B735B8' }}>
          {up ? <i className="fa-solid fa-spinner fa-spin" /> : <i className="fa-solid fa-upload" />}
          <input type="file" accept="image/*" style={{ display: 'none' }} onChange={async e => { const f = e.target.files?.[0]; if (!f) return; setUp(true); const u = await uploadFile(f); setUp(false); if (u) onChange(u) }} />
        </label>
      </div>
      {value && <img src={value} alt="" style={{ marginTop: 6, height: 54, borderRadius: 8, objectFit: 'cover' }} />}
    </Field>
  )
}
function ImagesField({ images, onChange }: { images: string[]; onChange: (v: string[]) => void }) {
  const [up, setUp] = useState(-1)
  const list = images.length ? images : ['']
  const set = (i: number, v: string) => { const a = [...list]; a[i] = v; onChange(a) }
  return (
    <Field label="Imágenes del producto">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {list.map((img, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {img ? <img src={img} alt="" style={{ width: 38, height: 38, borderRadius: 8, objectFit: 'cover' }} /> : <div style={{ width: 38, height: 38, borderRadius: 8, background: '#F1F3F8', display: 'grid', placeItems: 'center', color: '#C4CCD8' }}><i className="fa-solid fa-image" /></div>}
            <input style={{ ...inp, flex: 1 }} value={img} onChange={e => set(i, e.target.value)} placeholder="URL o subí →" />
            <label style={{ ...iconBtn, width: 'auto', padding: '0 11px', display: 'grid', placeItems: 'center', cursor: 'pointer', color: '#B735B8' }}>
              {up === i ? <i className="fa-solid fa-spinner fa-spin" /> : <i className="fa-solid fa-upload" />}
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={async e => { const f = e.target.files?.[0]; if (!f) return; setUp(i); const u = await uploadFile(f); setUp(-1); if (u) set(i, u) }} />
            </label>
            <button onClick={() => { const a = list.filter((_, ix) => ix !== i); onChange(a.length ? a : ['']) }} style={{ ...iconBtn, color: '#ef4444' }}><i className="fa-solid fa-xmark" /></button>
          </div>
        ))}
        <button onClick={() => onChange([...list, ''])} style={{ fontSize: 12, color: '#B735B8', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, textAlign: 'left' }}>+ Agregar imagen</button>
      </div>
    </Field>
  )
}

function VariantsField({ variants, onChange }: { variants: { name: string; options: string }[]; onChange: (v: { name: string; options: string }[]) => void }) {
  const set = (i: number, k: 'name' | 'options', v: string) => { const a = [...variants]; a[i] = { ...a[i], [k]: v }; onChange(a) }
  return (
    <Field label="Variantes (ej. Talle: S, M, L) — opcional">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {variants.map((v, i) => (
          <div key={i} style={{ display: 'flex', gap: 6 }}>
            <input style={{ ...inp, flex: 1 }} placeholder="Nombre (ej. Talle)" value={v.name} onChange={e => set(i, 'name', e.target.value)} />
            <input style={{ ...inp, flex: 1.4 }} placeholder="Opciones separadas por coma" value={v.options} onChange={e => set(i, 'options', e.target.value)} />
            <button onClick={() => onChange(variants.filter((_, ix) => ix !== i))} style={{ ...iconBtn, color: '#ef4444' }}><i className="fa-solid fa-xmark" /></button>
          </div>
        ))}
        <button onClick={() => onChange([...variants, { name: '', options: '' }])} style={{ fontSize: 12, color: '#B735B8', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, textAlign: 'left' }}>+ Agregar variante</button>
      </div>
    </Field>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div style={{ flex: 1, marginBottom: 10 }}><label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 5 }}>{label}</label>{children}</div>
}
function Actions({ onCancel, onSave, busy }: { onCancel: () => void; onSave: () => void; busy: boolean }) {
  return (
    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 14 }}>
      <button onClick={onCancel} style={btnGhost}>Cancelar</button>
      <button onClick={onSave} disabled={busy} style={{ ...btnPrimary, opacity: busy ? 0.6 : 1 }}>{busy ? 'Guardando…' : 'Guardar'}</button>
    </div>
  )
}
function ConfirmDelete({ onCancel, onConfirm, busy }: { onCancel: () => void; onConfirm: () => void; busy: boolean }) {
  return (
    <Modal title="Eliminar" onClose={onCancel}>
      <p style={{ fontSize: 14, color: '#5B6472' }}>¿Seguro que querés eliminar esto? No se puede deshacer.</p>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
        <button onClick={onCancel} style={btnGhost}>Cancelar</button>
        <button onClick={onConfirm} disabled={busy} style={{ ...btnPrimary, background: '#ef4444', boxShadow: 'none', opacity: busy ? 0.6 : 1 }}>{busy ? 'Eliminando…' : 'Eliminar'}</button>
      </div>
    </Modal>
  )
}
function Loading() { return <p style={{ color: '#9AA3B2', padding: '30px 0', textAlign: 'center' }}>Cargando…</p> }
function Empty({ text }: { text: string }) { return <div style={{ background: '#fff', border: '1px dashed #D5DCE6', borderRadius: 16, padding: '40px 20px', textAlign: 'center', color: '#7A8494', fontSize: 14 }}>{text}</div> }
function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(5,11,20,0.55)', display: 'grid', placeItems: 'center', padding: 16, zIndex: 50, overflow: 'auto' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 480, background: '#fff', borderRadius: 18, overflow: 'hidden', boxShadow: '0 30px 80px -20px rgba(5,11,20,0.6)', maxHeight: '92vh', overflowY: 'auto' }}>
        <div style={{ height: 4, background: DG }} />
        <div style={{ padding: '20px 22px' }}><h3 style={{ fontSize: 17, fontWeight: 900, marginBottom: 14 }}>{title}</h3>{children}</div>
      </div>
    </div>
  )
}

const inp: React.CSSProperties = { width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #D5DCE6', fontSize: 13, outline: 'none', boxSizing: 'border-box', background: '#fff', color: '#111827' }
const iconBtn: React.CSSProperties = { width: 34, height: 34, borderRadius: 9, border: '1px solid #E4E9F0', background: '#fff', color: '#5B6472', cursor: 'pointer', fontSize: 13 }
const errP: React.CSSProperties = { color: '#dc2626', fontSize: 12, marginTop: 8 }
const btnGhost: React.CSSProperties = { padding: '10px 16px', borderRadius: 10, border: '1px solid #E4E9F0', background: '#fff', color: '#5B6472', fontWeight: 700, cursor: 'pointer', fontSize: 13 }
const btnPrimary: React.CSSProperties = { padding: '10px 18px', borderRadius: 10, border: 'none', background: DG, color: '#fff', fontWeight: 800, cursor: 'pointer', fontSize: 13, boxShadow: '0 8px 22px -10px rgba(183,53,184,0.7)' }
