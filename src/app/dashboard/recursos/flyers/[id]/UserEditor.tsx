'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

interface TextZone {
  id: string
  x: number; y: number; w: number
  text?: string
  fontSize?: number
  fontFamily?: string
  fill?: string
  align?: 'left' | 'center' | 'right'
  fontWeight?: string | number
}
interface Template {
  id: string
  nombre: string
  categoria: string
  ancho: number
  alto: number
  fondoUrl: string
  zonas: { photo?: { x: number; y: number; w: number; h: number } | null; texts: TextZone[] }
}

export default function UserEditor({ templateId }: { templateId: string }) {
  const canvasElRef = useRef<HTMLCanvasElement>(null)
  const fcanvasRef = useRef<any>(null)
  const overlayRef = useRef<any>(null) // imagen del flyer (encima)
  const photoRef = useRef<any>(null)   // foto del usuario (al fondo)
  const fileRef = useRef<HTMLInputElement>(null)
  const measureRef = useRef<HTMLDivElement>(null)

  const [template, setTemplate] = useState<Template | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [hasPhoto, setHasPhoto] = useState(false)
  const [availW, setAvailW] = useState(360)
  const [win, setWin] = useState({ w: 1200, h: 800 })
  const [expanded, setExpanded] = useState(false)
  // Texto seleccionado en el lienzo → muestra la barra de color/tamaño/fuente
  const [textSel, setTextSel] = useState<{ fill: string; fontSize: number; fontFamily: string } | null>(null)
  const [fontMenuOpen, setFontMenuOpen] = useState(false)

  // 1) Cargar la plantilla
  useEffect(() => {
    fetch(`/api/recursos/templates/${templateId}`)
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setTemplate(d.template) })
      .catch(() => setError('No se pudo cargar la plantilla'))
      .finally(() => setLoading(false))
  }, [templateId])

  // 2) Inicializar Fabric cuando hay plantilla
  useEffect(() => {
    if (!template || !canvasElRef.current) return
    let disposed = false
    let fcanvas: any
    let onResize = () => {}

    ;(async () => {
      const mod: any = await import('fabric')
      const fabric = mod.fabric || mod.default || mod
      if (disposed || !canvasElRef.current) return

      const W = template.ancho, H = template.alto
      fcanvas = new fabric.Canvas(canvasElRef.current, {
        width: W, height: H, backgroundColor: '#0b0b16', preserveObjectStacking: true,
      })
      fcanvasRef.current = fcanvas

      // Mostrar la barra de texto cuando se selecciona un texto (Textbox)
      const syncSel = () => {
        const o = fcanvas.getActiveObject()
        if (o && o.type === 'textbox') {
          setTextSel({ fill: (o.fill as string) || '#ffffff', fontSize: Math.round((o.fontSize as number) || 48), fontFamily: (o.fontFamily as string) || 'Archivo' })
        } else {
          setTextSel(null)
        }
      }
      fcanvas.on('selection:created', syncSel)
      fcanvas.on('selection:updated', syncSel)
      fcanvas.on('selection:cleared', () => setTextSel(null))

      // El tamaño visual lo controla el CSS (.rec-canvas-wrap → proporcional y compacto).
      // Solo recalculamos el offset para que el puntero mapee bien sobre el lienzo escalado.
      onResize = () => { try { fcanvas.calcOffset() } catch {} }
      setTimeout(onResize, 120)
      window.addEventListener('resize', onResize)

      // FLYER (diseño) — va ENCIMA y bloqueado. evented:false → los clics atraviesan
      // hacia la foto del fondo para poder seleccionarla. La zona transparente del PNG
      // deja ver la foto del usuario.
      const addFlyer = (img: any) => {
        if (disposed || !img) return
        img.set({ left: 0, top: 0, selectable: false, evented: false })
        img.scaleToWidth(W)
        overlayRef.current = img
        fcanvas.add(img)
        // textos encima del flyer
        for (const tz of (template.zonas?.texts || [])) {
          const it = new fabric.Textbox(tz.text || 'Tu texto', {
            left: tz.x, top: tz.y,
            width: tz.w || Math.round(W * 0.8),
            fontSize: tz.fontSize || 48,
            fontFamily: tz.fontFamily || 'Archivo',
            fill: tz.fill || '#ffffff',
            textAlign: tz.align || 'left',
            fontWeight: (tz.fontWeight as any) || '700',
            editable: true,
          })
          fcanvas.add(it)
        }
        fcanvas.renderAll()
        setReady(true)
      }

      // Cargamos el diseño como BLOB y lo pasamos a Fabric por object URL (mismo
      // origen). Esto evita el bug de "lienzo negro": la miniatura de la lista se
      // cachea SIN permiso CORS y, al pedir la misma URL con crossOrigin en el
      // editor, el navegador reusaba esa copia y la carga fallaba. Con el blob no
      // hay CORS de por medio y además la exportación (JPG/PNG) no se contamina.
      try {
        const res = await fetch(template.fondoUrl, { cache: 'no-store', mode: 'cors' })
        if (!res.ok) throw new Error(`fetch ${res.status}`)
        const blob = await res.blob()
        if (disposed) return
        const objUrl = URL.createObjectURL(blob)
        fabric.Image.fromURL(objUrl, (img: any) => { URL.revokeObjectURL(objUrl); addFlyer(img) })
      } catch {
        // Fallback: intento directo con crossOrigin por si el fetch fallara.
        fabric.Image.fromURL(template.fondoUrl, addFlyer, { crossOrigin: 'anonymous' })
      }
    })()

    return () => {
      disposed = true
      window.removeEventListener('resize', onResize)
      try { fcanvas?.dispose() } catch {}
      fcanvasRef.current = null
      photoRef.current = null
      overlayRef.current = null
    }
  }, [template])

  // Medir ancho disponible + tamaño de ventana (para el lienzo y el modo ampliado)
  useEffect(() => {
    const measure = () => {
      if (measureRef.current) setAvailW(measureRef.current.clientWidth)
      setWin({ w: window.innerWidth, h: window.innerHeight })
    }
    measure()
    const ro = typeof ResizeObserver !== 'undefined' && measureRef.current ? new ResizeObserver(measure) : null
    if (ro && measureRef.current) ro.observe(measureRef.current)
    window.addEventListener('resize', measure)
    return () => { window.removeEventListener('resize', measure); ro?.disconnect() }
  }, [template])

  // Al ampliar/cambiar tamaño: bloquear scroll, Escape para cerrar, y recalcular el offset de Fabric
  useEffect(() => {
    const t = setTimeout(() => { try { fcanvasRef.current?.calcOffset() } catch {} }, 140)
    if (!expanded) return () => clearTimeout(t)
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setExpanded(false) }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { clearTimeout(t); window.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [expanded, availW, win])

  // Cargar fuentes (Google Fonts) para el selector de tipografías — se ven igual en todos los
  // dispositivos y al descargar el flyer. Se inyecta una sola vez.
  useEffect(() => {
    const id = 'flyer-google-fonts'
    if (document.getElementById(id)) return
    const link = document.createElement('link')
    link.id = id
    link.rel = 'stylesheet'
    link.href = 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700;900&family=Poppins:wght@400;700;900&family=Oswald:wght@400;700&family=Bebas+Neue&family=Anton&family=Playfair+Display:wght@400;700;900&family=Merriweather:wght@400;700&family=Lobster&family=Pacifico&family=Dancing+Script:wght@400;700&family=Caveat:wght@400;700&family=Righteous&family=Permanent+Marker&family=Roboto+Mono:wght@400;700&display=swap'
    document.head.appendChild(link)
  }, [])

  // 3) Subir foto del usuario → va AL FONDO (detrás del flyer), seleccionable/movible/escalable.
  //    Se procesa en el navegador, NO se sube al servidor.
  function onPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !template) return
    const reader = new FileReader()
    reader.onload = async () => {
      const mod: any = await import('fabric')
      const fabric = mod.fabric || mod.default || mod
      const fcanvas = fcanvasRef.current
      if (!fcanvas) return
      fabric.Image.fromURL(reader.result as string, (img: any) => {
        if (photoRef.current) { fcanvas.remove(photoRef.current); photoRef.current = null }
        // posición/escala inicial: cubrir la zona marcada por el admin (o todo el lienzo)
        const zone = template.zonas?.photo || { x: 0, y: 0, w: template.ancho, h: template.alto }
        const scale = Math.max(zone.w / img.width, zone.h / img.height)
        img.set({
          left: zone.x + zone.w / 2, top: zone.y + zone.h / 2,
          originX: 'center', originY: 'center', scaleX: scale, scaleY: scale,
          selectable: true, hasControls: true,
        })
        photoRef.current = img
        fcanvas.add(img)
        img.sendToBack()              // ← AL FONDO: el flyer queda encima
        fcanvas.setActiveObject(img)  // seleccionada para moverla de una
        fcanvas.renderAll()
        setHasPhoto(true)
      })
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  // 4) Descargar al tamaño real del flyer en JPG o PNG
  function download(format: 'jpeg' | 'png') {
    const fcanvas = fcanvasRef.current
    if (!fcanvas || !template) return
    fcanvas.discardActiveObject()
    fcanvas.renderAll()
    const dataUrl = fcanvas.toDataURL({ format, quality: 0.95, multiplier: 1 })
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = `${template.nombre.replace(/\s+/g, '-').toLowerCase()}.${format === 'jpeg' ? 'jpg' : 'png'}`
    document.body.appendChild(a); a.click(); a.remove()
  }

  // Aplica color / tamaño / fuente al texto seleccionado
  function applyText(props: Partial<{ fill: string; fontSize: number; fontFamily: string }>) {
    const fc = fcanvasRef.current
    const o = fc?.getActiveObject()
    if (!fc || !o || o.type !== 'textbox') return
    o.set(props as any)
    fc.renderAll()
    setTextSel(s => (s ? { ...s, ...props } : s))
  }

  // Elegir fuente: asegura que esté cargada antes de aplicarla (si no, Fabric usa una de respaldo).
  async function pickFont(font: string) {
    setFontMenuOpen(false)
    try { await (document as any).fonts?.load(`24px "${font}"`); await (document as any).fonts?.load(`bold 24px "${font}"`) } catch {}
    applyText({ fontFamily: font })
    try { fcanvasRef.current?.renderAll() } catch {}
  }

  // Barra de color/tamaño/fuente (se muestra al seleccionar un texto). Función → JSX nuevo en cada lugar.
  const FONTS = [
    'Archivo', 'Montserrat', 'Poppins', 'Oswald', 'Bebas Neue', 'Anton',
    'Playfair Display', 'Merriweather', 'Georgia', 'Lobster', 'Pacifico',
    'Dancing Script', 'Caveat', 'Righteous', 'Permanent Marker', 'Roboto Mono',
  ]
  const SWATCHES = ['#ffffff', '#000000', '#147e95', '#0D1E79', '#00FF9D', '#FFD500', '#FF2D55']
  const renderTextToolbar = () => {
    if (!textSel) return null
    return (
      <div className="w-full rounded-xl bg-[#F4F6FA] border border-[#147e95]/30 p-3 space-y-2.5">
        <p className="text-[11px] font-black text-[#374151] flex items-center gap-1.5"><i className="fa-solid fa-font text-[#147e95]"></i> Texto seleccionado</p>
        <div className="flex items-center gap-1.5 flex-wrap">
          {SWATCHES.map(c => (
            <button key={c} type="button" onClick={() => applyText({ fill: c })}
              className={`w-6 h-6 rounded-full border-2 transition-all ${textSel.fill?.toLowerCase() === c ? 'border-white scale-110' : 'border-white/25'}`}
              style={{ background: c }} aria-label={`color ${c}`} />
          ))}
          <label className="w-6 h-6 rounded-full border-2 border-white/25 relative cursor-pointer flex items-center justify-center" title="Color personalizado">
            <input type="color" value={textSel.fill} onChange={e => applyText({ fill: e.target.value })}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
            <i className="fa-solid fa-eye-dropper text-[9px] text-[#374151]"></i>
          </label>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[#9CA3AF] w-12 shrink-0">Tamaño</span>
          <button type="button" onClick={() => applyText({ fontSize: Math.max(8, textSel.fontSize - 4) })}
            className="w-7 h-7 rounded-lg bg-[#EEF2F7] text-[#111827] font-black hover:bg-[#E4E9F0] transition-all">−</button>
          <span className="text-xs font-bold text-[#111827] w-9 text-center">{textSel.fontSize}</span>
          <button type="button" onClick={() => applyText({ fontSize: Math.min(400, textSel.fontSize + 4) })}
            className="w-7 h-7 rounded-lg bg-[#EEF2F7] text-[#111827] font-black hover:bg-[#E4E9F0] transition-all">+</button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[#9CA3AF] w-12 shrink-0">Fuente</span>
          <div className="relative flex-1 min-w-0">
            <button type="button" onClick={() => setFontMenuOpen(o => !o)}
              style={{ fontFamily: textSel.fontFamily }}
              className="w-full flex items-center justify-between gap-2 bg-white border border-[#E4E9F0] rounded-lg px-2.5 py-1.5 text-sm text-[#111827] outline-none hover:border-[#147e95]/50">
              <span className="truncate">{textSel.fontFamily}</span>
              <i className="fa-solid fa-chevron-down text-[10px] text-[#9CA3AF] shrink-0"></i>
            </button>
            {fontMenuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setFontMenuOpen(false)} />
                <div className="absolute z-20 left-0 right-0 bottom-full mb-1 max-h-60 overflow-auto rounded-lg bg-[#0b0b14] border border-[#E4E9F0] shadow-2xl">
                  {FONTS.map(f => (
                    <button key={f} type="button" onClick={() => pickFont(f)}
                      style={{ fontFamily: f }}
                      className={`w-full text-left px-3 py-2 text-[15px] leading-tight hover:bg-[#EEF2F7] transition-colors ${textSel.fontFamily === f ? 'text-[#147e95] bg-[#F4F6FA]' : 'text-[#111827]'}`}>
                      {f}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return <div className="flex items-center justify-center py-32 text-[#9CA3AF]"><i className="fa-solid fa-spinner fa-spin text-2xl"></i></div>
  }
  if (error) {
    return (
      <div className="max-w-md mx-auto text-center py-24">
        <p className="text-red-400 text-sm mb-4">{error}</p>
        <Link href="/dashboard/recursos/flyers" className="text-[#147e95] underline text-sm">Volver a Recursos</Link>
      </div>
    )
  }

  // Tamaño visible del lienzo. Inline: compacto (como pediste). Ampliado: lo más grande que entre en pantalla.
  const ratio = template ? template.ancho / template.alto : 0.8
  const inlineW = Math.min(340, Math.max(220, availW - 24))
  // Reserva vertical para la barra superior, botones y (si hay) la barra de texto, así nada queda cortado.
  const expandedW = Math.min(win.w - 32, Math.round((win.h - (textSel ? 330 : 200)) * ratio), 1200)
  const canvasW = expanded ? Math.max(260, expandedW) : inlineW

  return (
    <div ref={measureRef} className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center gap-2 sm:gap-3 mb-5">
        <Link href="/dashboard/recursos/flyers" className="w-9 h-9 shrink-0 rounded-xl bg-[#F4F6FA] border border-[#E4E9F0] flex items-center justify-center hover:bg-[#EEF2F7] transition-all">
          <i className="fa-solid fa-arrow-left text-[#374151] text-sm"></i>
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-black text-[#111827] truncate">{template?.nombre}</h1>
          <p className="text-xs text-[#9CA3AF] capitalize">{template?.categoria}</p>
        </div>
        <button onClick={() => setExpanded(true)} disabled={!ready}
          className="shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-[#374151] bg-[#F4F6FA] border border-[#E4E9F0] hover:bg-[#EEF2F7] transition-all active:scale-95 disabled:opacity-50">
          <i className="fa-solid fa-up-right-and-down-left-from-center"></i><span className="hidden sm:inline">Ampliar</span>
        </button>
      </div>

      <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={onPhotoChange} className="hidden" />

      <div className="flex flex-col md:flex-row md:items-start gap-6">
        {/* Lienzo — el marco abraza el lienzo (sin recuadro negro). Al ampliar pasa a pantalla completa. */}
        <div className={expanded
          ? 'fixed inset-0 z-[80] bg-[#07070d]/98 backdrop-blur-sm flex flex-col items-center justify-center gap-3 p-3 overflow-y-auto'
          : 'rounded-2xl border border-[#E4E9F0] bg-white p-3 w-fit max-w-full mx-auto md:mx-0'}>
          {expanded && (
            <div className="w-full max-w-3xl flex items-center justify-between gap-3 shrink-0">
              <p className="text-sm font-bold text-[#111827] truncate">{template?.nombre}</p>
              <button onClick={() => setExpanded(false)}
                className="w-9 h-9 rounded-xl bg-[#F4F6FA] border border-[#E4E9F0] text-[#374151] hover:bg-[#EEF2F7] transition-all flex items-center justify-center shrink-0">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
          )}
          <div className="rec-canvas-wrap" style={{ width: canvasW, maxWidth: '100%', aspectRatio: `${template?.ancho} / ${template?.alto}` }}>
            <canvas ref={canvasElRef} className="rounded-lg" style={{ touchAction: 'none' }} />
          </div>
          {expanded && textSel && (
            <div className="w-full max-w-sm shrink-0">{renderTextToolbar()}</div>
          )}
          {expanded && (
            <div className="flex items-center gap-2 flex-wrap justify-center shrink-0">
              <button onClick={() => fileRef.current?.click()} disabled={!ready}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-[#111827] transition-all active:scale-95 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #1fb8bb 0%, #147e95 52%, #12303a 100%)' }}>
                <i className="fa-solid fa-image"></i> {hasPhoto ? 'Cambiar foto' : 'Subir foto'}
              </button>
              <button onClick={() => download('jpeg')} disabled={!ready}
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-black text-[#111827] transition-all active:scale-95 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #1fb8bb 0%, #147e95 52%, #12303a 100%)' }}>
                <i className="fa-solid fa-download"></i> JPG
              </button>
              <button onClick={() => download('png')} disabled={!ready}
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-black text-[#111827] border border-[#E4E9F0] bg-[#F4F6FA] transition-all active:scale-95 disabled:opacity-50">
                <i className="fa-solid fa-download"></i> PNG
              </button>
            </div>
          )}
        </div>

        {/* Controles (modo en línea) */}
        <div className={`w-full md:w-64 md:shrink-0 space-y-3 ${expanded ? 'hidden' : ''}`}>
          <button onClick={() => fileRef.current?.click()} disabled={!ready}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-[#111827] transition-all active:scale-95 disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #1fb8bb 0%, #147e95 52%, #12303a 100%)' }}>
            <i className="fa-solid fa-image"></i> {hasPhoto ? 'Cambiar foto' : 'Subir foto'}
          </button>

          {renderTextToolbar()}

          <div className="rounded-xl bg-white/[0.03] border border-[#E4E9F0] p-3 text-[11px] text-[#111827]/45 leading-relaxed">
            <p className="font-bold text-[#374151] mb-1.5"><i className="fa-solid fa-lightbulb text-amber-400 mr-1"></i> Cómo editar</p>
            <p>• Tu foto va <b>detrás</b> del diseño: arrastrala y escalala para acomodarla.</p>
            <p>• <b>Doble clic</b> en un texto para escribir el tuyo.</p>
            <p>• <b>Tocá un texto</b> para cambiar su color, tamaño y fuente.</p>
            <p>• Usa <b>Ampliar</b> para editar más grande.</p>
            <p>• Tu foto se procesa en tu navegador (no se sube).</p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => download('jpeg')} disabled={!ready}
              className="flex items-center justify-center gap-1.5 py-3 rounded-xl text-xs font-black text-[#111827] transition-all active:scale-95 disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #1fb8bb 0%, #147e95 52%, #12303a 100%)' }}>
              <i className="fa-solid fa-download"></i> JPG
            </button>
            <button onClick={() => download('png')} disabled={!ready}
              className="flex items-center justify-center gap-1.5 py-3 rounded-xl text-xs font-black text-[#111827] border border-[#E4E9F0] bg-[#F4F6FA] transition-all active:scale-95 disabled:opacity-50">
              <i className="fa-solid fa-download"></i> PNG
            </button>
          </div>
          <p className="text-[10px] text-[#9CA3AF] text-center">Descarga en {template?.ancho}×{template?.alto}px</p>
        </div>
      </div>
    </div>
  )
}
