'use client'

import { useEffect, useRef, useState } from 'react'
import { confirmDialog } from '@/components/ConfirmDialog'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Sparkles, Plus, Loader2, ArrowLeft, ExternalLink, Trash2, Pencil, Wand2, FileText, Share2, Link2, ChevronLeft, ChevronRight } from 'lucide-react'
import AIKeySelector from '@/components/AIKeySelector'
import { TEMPLATE_META } from '@/lib/builder-templates-meta'
import { BUILDER_TEMPLATES } from '@/lib/builder-templates'

// Carrusel COVERFLOW 3D de plantillas con VISTA PREVIA REAL (mini-render en iframe).
// La plantilla activa se ve grande y nítida al centro; las de los lados, giradas,
// achicadas y atenuadas. Flechas + puntitos + botón "Usar esta" debajo.
const CARD_W = 360
const CARD_H = 450
const STEP = 230 // px por tarjeta (separación + umbral de arrastre)
function TemplateCarousel({ onPick, disabled }: { onPick: (id: string, name: string) => void; disabled?: boolean }) {
  const [active, setActive] = useState(0)
  const [drag, setDrag] = useState(0)        // desplazamiento en vivo mientras arrastrás (px)
  const [grabbing, setGrabbing] = useState(false)
  const startX = useRef(0)
  const stageRef = useRef<HTMLDivElement>(null)
  const n = BUILDER_TEMPLATES.length
  const go = (dir: number) => setActive(a => ((a + dir) % n + n) % n)
  const activeT = BUILDER_TEMPLATES[active]
  const activeDesc = TEMPLATE_META.find(m => m.id === activeT.id)?.desc || ''

  // Trackpad (swipe con 2 dedos) y rueda del mouse → navegar
  useEffect(() => {
    const el = stageRef.current
    if (!el) return
    let acc = 0, last = 0
    const onWheel = (e: WheelEvent) => {
      const horizontal = Math.abs(e.deltaX) >= Math.abs(e.deltaY)
      if (horizontal) e.preventDefault()
      acc += horizontal ? e.deltaX : e.deltaY
      const now = performance.now()
      if (Math.abs(acc) > 38 && now - last > 120) {
        setActive(a => ((a + (acc > 0 ? 1 : -1)) % n + n) % n)
        acc = 0; last = now
      }
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [n])

  // Arrastre con mouse / dedo (pointer events: sirve para mouse, trackpad-click y touch)
  const onDown = (e: React.PointerEvent) => { setGrabbing(true); startX.current = e.clientX }
  const onMove = (e: React.PointerEvent) => { if (grabbing) setDrag(e.clientX - startX.current) }
  const onUp = () => {
    if (!grabbing) return
    setGrabbing(false)
    const steps = Math.round(-drag / STEP)
    if (steps !== 0) setActive(a => ((a + steps) % n + n) % n)
    setDrag(0)
  }

  return (
    <div className="relative select-none">
      {/* Escenario coverflow */}
      <div ref={stageRef}
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerLeave={onUp} onPointerCancel={onUp}
        className="relative mx-auto overflow-hidden"
        style={{ height: CARD_H + 64, perspective: '2000px', cursor: grabbing ? 'grabbing' : 'grab', touchAction: 'pan-y' }}>
        {/* glow detrás de la tarjeta central */}
        <div className="absolute left-1/2 top-1/2 pointer-events-none" aria-hidden
          style={{ width: 640, height: 460, marginLeft: -320, marginTop: -240, borderRadius: '50%', zIndex: 0,
            background: 'radial-gradient(ellipse, rgba(0,229,208,0.16), rgba(0,229,208,0.09) 45%, transparent 70%)', filter: 'blur(24px)' }} />
        {BUILDER_TEMPLATES.map((t, i) => {
          let off = i - active
          if (off > n / 2) off -= n
          if (off < -n / 2) off += n
          const fOff = off + drag / STEP       // posición fraccionaria en vivo mientras arrastrás
          const abs = Math.abs(fOff)
          if (abs > 2.6) return null
          const centered = abs < 0.5            // la que está (casi) al centro se ve "activa"
          return (
            <div key={t.id}
              onClick={() => { if (Math.abs(drag) < 5 && off !== 0) setActive(i) }}
              className="absolute left-1/2 top-1/2"
              style={{
                width: CARD_W, height: CARD_H,
                marginLeft: -CARD_W / 2, marginTop: -CARD_H / 2,
                transform: `translateX(${fOff * STEP}px) translateZ(${-abs * 140}px) rotateY(${fOff * -30}deg) scale(${Math.max(0.7, 1 - abs * 0.12)})`,
                opacity: Math.max(0.28, 1 - abs * 0.34),
                filter: centered ? 'none' : 'saturate(0.75)',
                zIndex: 40 - Math.round(abs * 10),
                transition: grabbing ? 'none' : 'transform .55s cubic-bezier(.22,1.12,.36,1), opacity .45s ease, filter .45s ease',
                cursor: off === 0 ? 'grab' : 'pointer',
              }}>
              <div className="w-full h-full rounded-2xl overflow-hidden relative"
                style={{
                  background: '#fff',
                  border: centered ? '2px solid #147e95' : '1px solid rgba(17,24,39,0.10)',
                  boxShadow: centered ? '0 34px 64px -22px rgba(0,229,208,0.45), 0 12px 28px -14px rgba(17,24,39,0.4)' : '0 16px 34px -18px rgba(17,24,39,0.35)',
                }}>
                <div className="flex items-center gap-1.5 px-2.5 h-6 shrink-0" style={{ background: '#20242E' }}>
                  <span className="w-2 h-2 rounded-full" style={{ background: '#F45B4B' }} />
                  <span className="w-2 h-2 rounded-full" style={{ background: '#F5B93E' }} />
                  <span className="w-2 h-2 rounded-full" style={{ background: '#4CC55A' }} />
                </div>
                <div className="relative" style={{ width: '100%', height: CARD_H - 24, overflow: 'hidden', background: '#0b0f1a' }}>
                  <iframe title={t.name} scrolling="no" tabIndex={-1} aria-hidden
                    srcDoc={`<!doctype html><html><head><meta name="viewport" content="width=1040"><style>*{box-sizing:border-box}body{margin:0}</style></head><body>${t.html}</body></html>`}
                    style={{ width: 1040, height: 1360, border: 0, transform: `scale(${CARD_W / 1040})`, transformOrigin: 'top left', pointerEvents: 'none' }} />
                  {!centered && <div className="absolute inset-0" style={{ background: 'rgba(17,24,39,0.12)' }} />}
                </div>
              </div>
            </div>
          )
        })}

        {/* Flechas */}
        <button onPointerDown={e => e.stopPropagation()} onClick={() => go(-1)} aria-label="Anterior"
          className="absolute left-1 sm:left-3 top-1/2 -translate-y-1/2 z-50 w-11 h-11 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95"
          style={{ background: '#fff', border: '1px solid rgba(17,24,39,0.12)', boxShadow: '0 8px 20px -8px rgba(17,24,39,0.3)', color: '#147e95' }}>
          <ChevronLeft size={22} />
        </button>
        <button onPointerDown={e => e.stopPropagation()} onClick={() => go(1)} aria-label="Siguiente"
          className="absolute right-1 sm:right-3 top-1/2 -translate-y-1/2 z-50 w-11 h-11 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95"
          style={{ background: '#fff', border: '1px solid rgba(17,24,39,0.12)', boxShadow: '0 8px 20px -8px rgba(17,24,39,0.3)', color: '#147e95' }}>
          <ChevronRight size={22} />
        </button>
      </div>

      {/* Nombre + descripción de la plantilla activa */}
      <div className="text-center mt-4 px-4">
        <p className="text-[15px] font-black text-app"><span className="mr-1.5">{activeT.emoji}</span>{activeT.name}</p>
        {activeDesc && <p className="text-[11.5px] text-app/50 mt-1 max-w-md mx-auto leading-snug">{activeDesc}</p>}
      </div>

      {/* Botón usar + puntitos */}
      <div className="flex flex-col items-center gap-3 mt-3">
        <button onClick={() => onPick(activeT.id, activeT.name)} disabled={disabled}
          className="py-2.5 px-7 rounded-xl text-sm font-black text-white transition-all active:scale-[0.98] disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg,#1fb8bb,#147e95,#12303a)', boxShadow: '0 12px 28px -10px rgba(0,229,208,0.55)' }}>
          Usar esta plantilla
        </button>
        <div className="flex items-center gap-1.5">
          {BUILDER_TEMPLATES.map((t, i) => (
            <button key={t.id} onClick={() => setActive(i)} aria-label={`Plantilla ${i + 1}`}
              className="rounded-full transition-all"
              style={{
                width: i === active ? 20 : 7, height: 7,
                background: i === active ? 'linear-gradient(90deg,#1fb8bb,#147e95)' : 'rgba(17,24,39,0.18)',
              }} />
          ))}
        </div>
      </div>
    </div>
  )
}

interface BPage { id: string; name: string; slug: string; published: boolean; updatedAt: string }

export default function BuilderIndexPage() {
  const router = useRouter()
  const [pages, setPages] = useState<BPage[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [showChooser, setShowChooser] = useState(false)
  const [toast, setToast] = useState('')
  const [importing, setImporting] = useState(false)

  async function load() {
    try {
      const res = await fetch('/api/builder-pages')
      const data = await res.json()
      if (res.ok) setPages(data.pages || [])
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  // Si alguien abre un enlace compartido (?import=<token>), se crea una copia en su cuenta.
  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('import')
    if (!token) return
    setImporting(true)
    ;(async () => {
      try {
        const res = await fetch('/api/builder-pages/import', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }),
        })
        const data = await res.json()
        window.history.replaceState(null, '', window.location.pathname)
        if (res.ok) { router.push(`/dashboard/services/landing-pages/builder/${data.page.id}`) }
        else { setError(data.error || 'No se pudo importar la página compartida'); setImporting(false) }
      } catch { setError('Error al importar la página compartida'); setImporting(false) }
    })()
  }, [router])

  const flash = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2600) }

  async function copyText(text: string, msg: string) {
    try { await navigator.clipboard.writeText(text); flash(msg) }
    catch { flash('No se pudo copiar. Copialo manualmente.') }
  }

  // Copia el enlace PÚBLICO de la página (solo sirve si está publicada).
  function copyPublicLink(slug: string) {
    copyText(`${window.location.origin}/b/${slug}`, 'Enlace público copiado ✓')
  }

  // Genera (o reusa) el enlace para compartir → otro usuario obtiene una copia editable.
  async function shareLink(id: string) {
    try {
      const res = await fetch(`/api/builder-pages/${id}/share`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { flash(data.error || 'No se pudo generar el enlace'); return }
      await copyText(`${window.location.origin}/dashboard/services/landing-pages/builder?import=${data.token}`, '¡Enlace para compartir copiado! ✓')
    } catch { flash('Error al generar el enlace') }
  }

  // Crea la página y abre el editor. `suffix` indica qué precargar:
  //   ''          → en blanco
  //   '?ai=1'     → abre el generador con IA
  //   '?tpl=<id>' → carga esa plantilla
  async function createWith(suffix: string, name = 'Mi página') {
    setCreating(true); setError('')
    try {
      const res = await fetch('/api/builder-pages', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'No se pudo crear'); setShowChooser(false); return }
      router.push(`/dashboard/services/landing-pages/builder/${data.page.id}${suffix}`)
    } catch { setError('Error de conexión'); setShowChooser(false) }
    finally { setCreating(false) }
  }

  async function remove(id: string) {
    if (!await confirmDialog('¿Eliminar esta página?')) return
    await fetch(`/api/builder-pages/${id}`, { method: 'DELETE' })
    setPages(p => p.filter(x => x.id !== id))
  }

  return (
    <div className="px-4 sm:px-6 pt-6 max-w-screen-xl mx-auto pb-24 text-app">
      {importing && (
        <div className="fixed inset-0 z-[130] flex flex-col items-center justify-center gap-3 bg-black/75 backdrop-blur-sm">
          <Loader2 className="animate-spin text-[#147e95]" size={30} />
          <p className="text-sm text-app/70 font-bold">Importando la página compartida…</p>
        </div>
      )}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[130] bg-[#1e293b] text-white text-sm font-semibold px-4 py-2.5 rounded-xl border border-white/10 shadow-xl">{toast}</div>
      )}
      <div className="flex items-center justify-between gap-3 mb-5">
        <Link href="/dashboard/services" className="inline-flex items-center gap-2 text-xs text-app/40 hover:text-app/70"><ArrowLeft size={14} /> Servicios</Link>
        <AIKeySelector compact />
      </div>

      <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: 'rgba(0,229,208,0.12)', border: '1px solid rgba(0,229,208,0.25)' }}>
            <Sparkles size={20} className="text-[#147e95]" />
          </div>
          <div>
            <h1 className="text-xl font-black uppercase tracking-tighter">Constructor Visual <span className="text-[10px] align-top text-[#147e95] font-bold">NUEVO</span></h1>
            <p className="text-xs text-app/40">Arrastra y suelta, elige colores, sube imágenes y publica — como Elementor.</p>
          </div>
        </div>
        <button onClick={() => setShowChooser(true)} disabled={creating}
          className="flex items-center gap-2 py-2.5 px-4 rounded-xl text-sm font-black text-white transition-all active:scale-[0.98] disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg,#233B8F,#147e95,#1fb8bb)' }}>
          {creating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Crear página
        </button>
      </div>

      {error && <div className="mb-4 text-xs font-bold px-3 py-2 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20">{error}</div>}

      {/* Galería deslizable de plantillas con vista previa real — elegí una y arranca */}
      <div className="mb-8">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div>
            <h2 className="text-sm font-black text-app uppercase tracking-tight">🎨 Empezá con una plantilla</h2>
            <p className="text-[11px] text-app/40">Deslizá y tocá “Usar esta” — después la rellenás con IA.</p>
          </div>
        </div>
        <TemplateCarousel onPick={(id, name) => createWith(`?tpl=${id}`, name)} disabled={creating} />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-[#147e95]" size={24} /></div>
      ) : pages.length === 0 ? (
        <div className="rounded-2xl border border-line/8 bg-surface/[0.02] p-10 text-center">
          <Sparkles size={30} className="text-app/20 mx-auto mb-3" />
          <p className="text-app/60 font-bold">Todavía no tienes páginas</p>
          <p className="text-xs text-app/30 mt-1 mb-4">Crea tu primera página con el constructor visual.</p>
          <button onClick={() => setShowChooser(true)} disabled={creating} className="inline-flex items-center gap-2 py-2.5 px-4 rounded-xl text-sm font-bold text-white" style={{ background: 'linear-gradient(135deg,#233B8F,#147e95)' }}>
            {creating ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} Crear la primera
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {pages.map(p => (
            <div key={p.id} className="rounded-2xl border border-line/10 bg-surface/[0.04] p-4 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <p className="font-bold text-sm text-app truncate">{p.name}</p>
                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full shrink-0 ${p.published ? 'bg-green-500/15 text-green-400 border border-green-500/25' : 'bg-surface/10 text-app/40'}`}>
                  {p.published ? 'Publicada' : 'Borrador'}
                </span>
              </div>
              <p className="text-[11px] text-app/30 -mt-1">/b/{p.slug}</p>
              <div className="flex items-center gap-2 mt-auto">
                <Link href={`/dashboard/services/landing-pages/builder/${p.id}`}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold text-white" style={{ background: 'linear-gradient(135deg,#147e95,#7c3aed)' }}>
                  <Pencil size={12} /> Editar
                </Link>
                <button onClick={() => shareLink(p.id)} title="Compartir (crea una copia editable a otro usuario)" className="p-2 rounded-lg bg-surface/5 border border-line/10 text-app/50 hover:text-purple-400"><Share2 size={14} /></button>
                {p.published && (
                  <button onClick={() => copyPublicLink(p.slug)} title="Copiar enlace público" className="p-2 rounded-lg bg-surface/5 border border-line/10 text-app/50 hover:text-emerald-400"><Link2 size={14} /></button>
                )}
                {p.published && (
                  <a href={`/b/${p.slug}`} target="_blank" rel="noreferrer" title="Ver publicada" className="p-2 rounded-lg bg-surface/5 border border-line/10 text-app/50 hover:text-[#147e95]"><ExternalLink size={14} /></a>
                )}
                <button onClick={() => remove(p.id)} title="Eliminar" className="p-2 rounded-lg bg-surface/5 border border-line/10 text-app/40 hover:text-red-400"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Selector: cómo crear la página (IA · en blanco · plantillas) */}
      {showChooser && (
        <div className="fixed inset-0 z-[120] flex items-start sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto" onClick={() => !creating && setShowChooser(false)}>
          <div className="w-full max-w-2xl my-8 rounded-3xl border border-line/12 bg-[#111426] p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-lg font-black text-app">¿Cómo querés crear tu página?</h3>
              <button onClick={() => !creating && setShowChooser(false)} className="text-app/40 hover:text-app text-xl leading-none">×</button>
            </div>
            <p className="text-xs text-app/45 mb-5">Elegí una plantilla lista, generá con IA, o empezá desde cero.</p>

            {creating ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 className="animate-spin text-[#147e95]" size={28} />
                <p className="text-sm text-app/60 font-bold">Creando tu página…</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                  <button onClick={() => createWith('?ai=1')}
                    className="text-left rounded-2xl p-4 border border-purple-400/30 transition-all hover:border-purple-400/60"
                    style={{ background: 'linear-gradient(135deg,rgba(35,59,143,.1),rgba(192,38,211,.12))' }}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-2.5" style={{ background: 'linear-gradient(135deg,#233B8F,#147e95,#1fb8bb)' }}><Wand2 size={18} className="text-white" /></div>
                    <p className="font-black text-sm text-app">Generar con IA</p>
                    <p className="text-[11px] text-app/50 mt-0.5">Describí tu negocio y la IA arma la landing.</p>
                  </button>
                  <button onClick={() => createWith('')}
                    className="text-left rounded-2xl p-4 border border-line/12 bg-surface/[0.03] transition-all hover:border-line/25">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-2.5 bg-surface/10 border border-line/10"><FileText size={18} className="text-app/70" /></div>
                    <p className="font-black text-sm text-app">Página en blanco</p>
                    <p className="text-[11px] text-app/50 mt-0.5">Empezá desde cero y arrastrá secciones.</p>
                  </button>
                </div>

                <p className="text-[11px] font-black uppercase tracking-widest text-app/35 mb-2.5">O elegí una plantilla</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {TEMPLATE_META.map(t => (
                    <button key={t.id} onClick={() => createWith(`?tpl=${t.id}`, t.name)}
                      className="text-left rounded-2xl p-3.5 border border-line/10 bg-surface/[0.03] transition-all hover:border-[#147e95]/40 hover:bg-[#147e95]/[0.04]">
                      <div className="text-2xl mb-1.5">{t.emoji}</div>
                      <p className="font-bold text-[13px] text-app leading-tight">{t.name}</p>
                      <p className="text-[10px] text-app/45 mt-1 leading-snug">{t.desc}</p>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
