'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CATEGORIAS_RECURSOS } from '@/lib/recursos'

export default function AdminEditor() {
  const router = useRouter()
  const canvasElRef = useRef<HTMLCanvasElement>(null)
  const fcanvasRef = useRef<any>(null)
  const fabricRef = useRef<any>(null)
  const baseFileRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<'upload' | 'edit'>('upload')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [fondoUrl, setFondoUrl] = useState('')
  const [ancho, setAncho] = useState(1080)
  const [alto, setAlto] = useState(1350)
  const [nombre, setNombre] = useState('')
  const [categoria, setCategoria] = useState('')
  const [areas, setAreas] = useState<string[]>([])
  const [hasPhoto, setHasPhoto] = useState(false)
  const [sel, setSel] = useState<any>(null) // objeto seleccionado (para panel de texto)

  // Áreas gestionadas por el admin (tabla flyer_areas). Si falla, se usa la lista fija.
  useEffect(() => {
    fetch('/api/recursos/areas')
      .then(r => r.json())
      .then(d => setAreas((d.areas || []).map((a: { nombre: string }) => a.nombre)))
      .catch(() => { /* respaldo: CATEGORIAS_RECURSOS */ })
  }, [])

  // 1) Subir imagen base
  async function onBaseFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true); setError(null)
    try {
      const dims = await new Promise<{ w: number; h: number }>((res, rej) => {
        const img = new Image()
        img.onload = () => res({ w: img.naturalWidth, h: img.naturalHeight })
        img.onerror = rej
        img.src = URL.createObjectURL(file)
      })
      const fd = new FormData(); fd.append('file', file)
      const r = await fetch('/api/recursos/upload', { method: 'POST', body: fd })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Error al subir')
      setFondoUrl(d.url); setAncho(dims.w); setAlto(dims.h)
      setStep('edit')
    } catch (err: any) {
      setError(err?.message || 'No se pudo subir la imagen')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  // 2) Init Fabric cuando hay imagen base
  useEffect(() => {
    if (step !== 'edit' || !fondoUrl || !canvasElRef.current) return
    let disposed = false
    let fcanvas: any
    let onResize = () => {}
    ;(async () => {
      const mod: any = await import('fabric')
      const fabric = mod.fabric || mod.default || mod
      fabricRef.current = fabric
      if (disposed || !canvasElRef.current) return

      fcanvas = new fabric.Canvas(canvasElRef.current, {
        width: ancho, height: alto, backgroundColor: '#0b0b16', preserveObjectStacking: true,
      })
      fcanvasRef.current = fcanvas

      // El tamaño visual lo controla el CSS (.rec-canvas-wrap). Solo recalculamos el offset.
      onResize = () => { try { fcanvas.calcOffset() } catch {} }
      setTimeout(onResize, 120); window.addEventListener('resize', onResize)

      // Cargar el diseño como blob (mismo origen vía object URL) para evitar el
      // "lienzo negro" por caché/CORS. Fallback: directo con crossOrigin.
      const addBase = (img: any) => {
        if (disposed || !img) return
        img.set({ left: 0, top: 0, selectable: false, evented: false })
        img.scaleToWidth(ancho)
        fcanvas.add(img); img.sendToBack(); fcanvas.renderAll()
      }
      try {
        const res = await fetch(fondoUrl, { cache: 'no-store', mode: 'cors' })
        if (!res.ok) throw new Error(`fetch ${res.status}`)
        const blob = await res.blob()
        if (disposed) return
        const objUrl = URL.createObjectURL(blob)
        fabric.Image.fromURL(objUrl, (img: any) => { URL.revokeObjectURL(objUrl); addBase(img) })
      } catch {
        fabric.Image.fromURL(fondoUrl, addBase, { crossOrigin: 'anonymous' })
      }

      fcanvas.on('selection:created', (e: any) => setSel(e.selected?.[0] || null))
      fcanvas.on('selection:updated', (e: any) => setSel(e.selected?.[0] || null))
      fcanvas.on('selection:cleared', () => setSel(null))
    })()
    return () => {
      disposed = true; window.removeEventListener('resize', onResize)
      try { fcanvas?.dispose() } catch {}
      fcanvasRef.current = null
    }
  }, [step, fondoUrl, ancho, alto])

  function addPhotoHole() {
    const fc = fcanvasRef.current, fabric = fabricRef.current
    if (!fc || !fabric || hasPhoto) return
    const w = Math.round(ancho * 0.6), h = Math.round(alto * 0.4)
    const rect = new fabric.Rect({
      left: (ancho - w) / 2, top: (alto - h) / 2, width: w, height: h,
      fill: 'rgba(0,229,208,0.12)', stroke: '#00E5D0', strokeDashArray: [12, 9], strokeWidth: 4,
      rx: 10, ry: 10, cornerColor: '#00E5D0', transparentCorners: false,
    })
    ;(rect as any)._isPhoto = true
    fc.add(rect); fc.setActiveObject(rect); fc.renderAll(); setHasPhoto(true)
  }

  function addText() {
    const fc = fcanvasRef.current, fabric = fabricRef.current
    if (!fc || !fabric) return
    const tb = new fabric.Textbox('Tu texto', {
      left: ancho * 0.1, top: alto * 0.1, width: Math.round(ancho * 0.8),
      fontSize: Math.round(alto * 0.05), fontFamily: 'Archivo', fontWeight: '800',
      fill: '#ffffff', textAlign: 'center', cornerColor: '#00B4FF', transparentCorners: false,
    })
    ;(tb as any)._isText = true
    fc.add(tb); fc.setActiveObject(tb); fc.renderAll(); setSel(tb)
  }

  function delSelected() {
    const fc = fcanvasRef.current; const o = fc?.getActiveObject()
    if (!o) return
    if ((o as any)._isPhoto) setHasPhoto(false)
    fc.remove(o); fc.discardActiveObject(); fc.renderAll(); setSel(null)
  }

  function updSel(props: Record<string, any>) {
    const fc = fcanvasRef.current, o = sel
    if (!fc || !o) return
    o.set(props); fc.renderAll(); setSel({ ...o, set: o.set.bind(o) })
  }

  async function save() {
    const fc = fcanvasRef.current
    if (!fc) return
    if (!nombre.trim() || !categoria.trim()) { setError('Poné nombre y categoría.'); return }
    setSaving(true); setError(null)

    let photo: any = null
    const texts: any[] = []
    for (const o of fc.getObjects()) {
      if ((o as any)._isPhoto) {
        photo = {
          x: Math.round(o.left), y: Math.round(o.top),
          w: Math.round(o.width * o.scaleX), h: Math.round(o.height * o.scaleY),
        }
      } else if ((o as any)._isText) {
        texts.push({
          id: Math.random().toString(36).slice(2, 9),
          x: Math.round(o.left), y: Math.round(o.top),
          w: Math.round((o.width || 0) * o.scaleX),
          text: o.text || '',
          fontSize: Math.round((o.fontSize || 48) * o.scaleY),
          fontFamily: o.fontFamily || 'Archivo',
          fill: o.fill || '#ffffff',
          align: o.textAlign || 'left',
          fontWeight: String(o.fontWeight || '700'),
        })
      }
    }

    try {
      const r = await fetch('/api/recursos/templates', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: nombre.trim(), categoria: categoria.trim(),
          ancho, alto, fondoUrl, thumbUrl: fondoUrl,
          zonas: { photo, texts },
        }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'No se pudo guardar')
      router.push('/admin/recursos')
    } catch (err: any) {
      setError(err?.message || 'No se pudo guardar'); setSaving(false)
    }
  }

  // ── UI ──
  if (step === 'upload') {
    return (
      <div className="max-w-xl mx-auto py-6">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/admin/recursos" className="w-9 h-9 rounded-xl bg-white border border-[#E4E9F0] flex items-center justify-center hover:bg-[#F0F3F7]">
            <i className="fa-solid fa-arrow-left text-[#6B7280] text-sm"></i>
          </Link>
          <h1 className="text-xl font-black text-[#111827]">Nueva plantilla</h1>
        </div>
        <input ref={baseFileRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={onBaseFile} className="hidden" />
        <button onClick={() => baseFileRef.current?.click()} disabled={uploading}
          className="w-full rounded-2xl border-2 border-dashed border-[#E4E9F0] bg-white py-16 flex flex-col items-center gap-3 text-[#6B7280] hover:border-[#147e95]/40 hover:text-[#111827] transition-all disabled:opacity-60">
          {uploading
            ? <><i className="fa-solid fa-spinner fa-spin text-3xl"></i><span className="text-sm">Subiendo…</span></>
            : <><i className="fa-solid fa-cloud-arrow-up text-3xl"></i><span className="text-sm font-bold">Subir el flyer (PNG recomendado)</span><span className="text-xs">El lienzo toma el tamaño real de la imagen</span></>}
        </button>
        <div className="mt-4 rounded-xl bg-white border border-[#E4E9F0] p-3 text-[11px] text-[#9CA3AF] leading-relaxed">
          <p><i className="fa-solid fa-circle-info text-[#00B4FF] mr-1"></i> Subí el flyer en <b>PNG con la zona de la foto transparente</b>: ahí se verá la foto que ponga el usuario (la foto va <b>detrás</b> del diseño).</p>
        </div>
        {error && <p className="text-red-400 text-sm mt-4 text-center">{error}</p>}
      </div>
    )
  }

  const isTextSel = sel && (sel as any)._isText

  return (
    <div className="py-2">
      <div className="flex items-center gap-3 mb-5">
        <Link href="/admin/recursos" className="w-9 h-9 rounded-xl bg-white border border-[#E4E9F0] flex items-center justify-center hover:bg-[#F0F3F7]">
          <i className="fa-solid fa-arrow-left text-[#6B7280] text-sm"></i>
        </Link>
        <h1 className="text-lg font-black text-[#111827]">Definir plantilla</h1>
      </div>

      <div className="grid md:grid-cols-[1fr_300px] gap-6 items-start">
        {/* Lienzo */}
        <div className="rounded-2xl border border-[#E4E9F0] bg-[#F0F3F7] p-3 flex justify-center overflow-hidden">
          <div className="rec-canvas-wrap" style={{ maxWidth: 420, aspectRatio: `${ancho} / ${alto}` }}>
            <canvas ref={canvasElRef} className="rounded-lg" style={{ touchAction: 'none' }} />
          </div>
        </div>

        {/* Panel */}
        <div className="w-full space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Nombre"
              className="col-span-2 bg-white border border-[#E4E9F0] rounded-xl px-3 py-2.5 text-sm text-[#111827] placeholder-[#9CA3AF] outline-none focus:border-[#147e95]/40" />
            <select value={categoria} onChange={e => setCategoria(e.target.value)}
              className="col-span-2 bg-white border border-[#E4E9F0] rounded-xl px-3 py-2.5 text-sm text-[#111827] outline-none focus:border-[#147e95]/40">
              <option value="" className="bg-[#0d0d15] text-white">Elegí un área…</option>
              {(areas.length ? areas : (CATEGORIAS_RECURSOS as readonly string[])).map(c => <option key={c} value={c} className="bg-[#0d0d15] text-white">{c}</option>)}
            </select>
          </div>

          <div className="flex gap-2">
            <button onClick={addPhotoHole} disabled={hasPhoto}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold text-[#147e95] bg-[#147e95]/15 border border-[#147e95]/30 transition-all active:scale-95 disabled:opacity-40">
              <i className="fa-solid fa-crop-simple mr-1"></i> Hueco de foto
            </button>
            <button onClick={addText}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold text-[#0097D6] bg-[#00B4FF]/15 border border-[#00B4FF]/30 transition-all active:scale-95">
              <i className="fa-solid fa-font mr-1"></i> Texto
            </button>
          </div>

          {sel && (
            <button onClick={delSelected} className="w-full py-2 rounded-xl text-xs font-bold text-red-300 bg-red-500/10 border border-red-500/25 transition-all active:scale-95">
              <i className="fa-solid fa-trash mr-1"></i> Quitar lo seleccionado
            </button>
          )}

          {isTextSel && (
            <div className="rounded-xl bg-white border border-[#E4E9F0] p-3 space-y-2.5">
              <p className="text-[10px] font-black uppercase tracking-wider text-[#9CA3AF]">Texto seleccionado</p>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-[#6B7280] w-12">Tamaño</span>
                <button onClick={() => updSel({ fontSize: Math.max(10, (sel.fontSize || 48) - 4) })} className="w-7 h-7 rounded-lg bg-[#F0F3F7] text-[#111827] text-sm">−</button>
                <span className="text-xs text-[#111827] w-9 text-center">{Math.round(sel.fontSize || 48)}</span>
                <button onClick={() => updSel({ fontSize: (sel.fontSize || 48) + 4 })} className="w-7 h-7 rounded-lg bg-[#F0F3F7] text-[#111827] text-sm">+</button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-[#6B7280] w-12">Alinear</span>
                {(['left', 'center', 'right'] as const).map(a => (
                  <button key={a} onClick={() => updSel({ textAlign: a })}
                    className={`w-7 h-7 rounded-lg text-xs ${sel.textAlign === a ? 'bg-[#00B4FF]/20 text-[#0097D6]' : 'bg-[#F0F3F7] text-[#6B7280]'}`}>
                    <i className={`fa-solid fa-align-${a}`}></i>
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-[#6B7280] w-12">Color</span>
                <input type="color" value={(sel.fill as string) || '#ffffff'} onChange={e => updSel({ fill: e.target.value })}
                  className="w-7 h-7 rounded-lg bg-transparent border border-[#E4E9F0] cursor-pointer" />
                <button onClick={() => updSel({ fontWeight: sel.fontWeight === '800' ? '400' : '800' })}
                  className={`px-2.5 h-7 rounded-lg text-xs font-black ${sel.fontWeight === '800' ? 'bg-[#F0F3F7] text-[#111827]' : 'bg-[#F0F3F7] text-[#6B7280]'}`}>B</button>
              </div>
            </div>
          )}

          <div className="rounded-xl bg-white border border-[#E4E9F0] p-3 text-[11px] text-[#9CA3AF] leading-relaxed">
            <p>• El <b>hueco de foto</b> marca dónde aparecerá (al fondo) la foto del usuario.</p>
            <p>• Agregá los <b>textos</b> que quieras y ubicalos sobre el diseño.</p>
            <p>• Arrastrá/redimensioná cada uno. Doble clic en un texto para el texto por defecto.</p>
          </div>

          <button onClick={save} disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black text-white hover:opacity-90 transition-all active:scale-95 disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg,#1fb8bb 0%,#147e95 48%,#233B8F 100%)' }}>
            {saving ? <><i className="fa-solid fa-spinner fa-spin"></i> Guardando…</> : <><i className="fa-solid fa-check"></i> Guardar plantilla</>}
          </button>
          {error && <p className="text-red-400 text-xs text-center">{error}</p>}
        </div>
      </div>
    </div>
  )
}
