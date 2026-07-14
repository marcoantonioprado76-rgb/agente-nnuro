'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Document, Page, pdfjs } from 'react-pdf'
import HTMLFlipBook from 'react-pageflip'

// react-pageflip no exporta tipos completos de sus props → alias casteado.
const FlipBook: any = HTMLFlipBook

// Worker servido localmente desde /public (sin CDN → no choca con la CSP).
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js'

interface Resource { id: string; titulo: string; categoria: string; archivoUrl: string; paginas: number | null }

export default function FlipbookViewer({ resourceId }: { resourceId: string }) {
  const bookRef = useRef<any>(null)
  const measureRef = useRef<HTMLDivElement>(null)
  const [res, setRes] = useState<Resource | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [numPages, setNumPages] = useState(0)
  const [ratio, setRatio] = useState(0.707) // ancho / alto de la página
  const [current, setCurrent] = useState(0)
  const [availW, setAvailW] = useState(900)
  const [win, setWin] = useState({ w: 1200, h: 800 })
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    fetch(`/api/recursos/resources/${resourceId}`)
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setRes(d.resource) })
      .catch(() => setError('No se pudo cargar el libro'))
      .finally(() => setLoading(false))
  }, [resourceId])

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
  }, [res])

  useEffect(() => {
    if (!expanded) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setExpanded(false) }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [expanded])

  if (loading) return <div className="flex justify-center py-32 text-white/40"><i className="fa-solid fa-spinner fa-spin text-2xl"></i></div>
  if (error || !res) {
    return (
      <div className="max-w-md mx-auto text-center py-24">
        <p className="text-red-400 text-sm mb-4">{error || 'No encontrado'}</p>
        <Link href="/dashboard/recursos/libros" className="text-[#D203DD] underline text-sm">Volver a Libros</Link>
      </div>
    )
  }

  // Tamaño FIJO calculado del ancho disponible. SIEMPRE una sola página (portrait): el efecto de
  // pasar páginas se mantiene, pero sin la "media página vacía" del libro abierto → sin recuadro negro.
  // La página se hace lo más grande posible; en ampliado se ajusta también al alto de la pantalla.
  const portrait = true
  const avail = expanded ? win.w - 48 : Math.max(240, availW - 24)
  let pageW = Math.min(expanded ? 900 : 480, avail)
  if (expanded) pageW = Math.min(pageW, Math.floor((win.h - 150) * ratio))
  pageW = Math.max(220, pageW)
  const pageH = Math.round(pageW / ratio)
  const renderW = Math.min(1100, Math.round(pageW * 1.6))

  const book = (
    <Document file={res.archivoUrl}
      onLoadSuccess={async (pdf: any) => {
        setNumPages(pdf.numPages)
        try {
          const p = await pdf.getPage(1)
          const vp = p.getViewport({ scale: 1 })
          if (vp.width && vp.height) setRatio(vp.width / vp.height)
        } catch { /* usa ratio por defecto */ }
      }}
      onLoadError={() => setError('No se pudo abrir el PDF')}
      loading={<div className="py-20 text-white/40"><i className="fa-solid fa-spinner fa-spin text-2xl"></i></div>}
      error={<p className="py-20 text-red-400 text-sm">No se pudo abrir el PDF.</p>}>
      {numPages > 0 && (
        <FlipBook
          key={`${pageW}x${pageH}x${numPages}x${portrait}x${expanded}`}
          ref={bookRef}
          width={pageW} height={pageH}
          size="fixed" usePortrait={portrait}
          minWidth={220} maxWidth={640} minHeight={280} maxHeight={980}
          maxShadowOpacity={0.5} showCover mobileScrollSupport
          className="rec-flip"
          onFlip={(e: any) => setCurrent(e.data)}>
          {Array.from({ length: numPages }, (_, i) => (
            <div key={i} className="rec-flip-page">
              <Page pageNumber={i + 1} width={renderW} renderTextLayer={false} renderAnnotationLayer={false} loading="" />
            </div>
          ))}
        </FlipBook>
      )}
    </Document>
  )

  const nav = numPages > 0 && (
    <div className="flex items-center justify-center gap-3">
      <button onClick={() => bookRef.current?.pageFlip()?.flipPrev()}
        className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 transition-all">
        <i className="fa-solid fa-chevron-left"></i>
      </button>
      <span className="text-sm text-white/60 font-mono">{Math.min(current + 1, numPages)} / {numPages}</span>
      <button onClick={() => bookRef.current?.pageFlip()?.flipNext()}
        className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 transition-all">
        <i className="fa-solid fa-chevron-right"></i>
      </button>
    </div>
  )

  return (
    <div ref={measureRef} className="max-w-5xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-2 sm:gap-3 mb-5">
        <Link href="/dashboard/recursos/libros" className="w-9 h-9 shrink-0 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all">
          <i className="fa-solid fa-arrow-left text-white/70 text-sm"></i>
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-black text-white truncate">{res.titulo}</h1>
          <p className="text-xs text-white/40">{res.categoria}</p>
        </div>
        <button onClick={() => setExpanded(true)}
          className="shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-white/80 bg-white/5 border border-white/10 hover:bg-white/10 transition-all active:scale-95">
          <i className="fa-solid fa-up-right-and-down-left-from-center"></i><span className="hidden sm:inline">Ampliar</span>
        </button>
        <a href={res.archivoUrl} download target="_blank" rel="noreferrer"
          className="shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-white transition-all active:scale-95"
          style={{ background: 'linear-gradient(135deg,#0D1E79,#D203DD)' }}>
          <i className="fa-solid fa-download"></i><span className="hidden sm:inline">Descargar</span>
        </a>
      </div>

      {/* Flipbook en línea (el marco abraza el libro) */}
      {!expanded && (
        <>
          <div className="w-fit max-w-full mx-auto rounded-2xl border border-white/10 bg-black/30 p-3 overflow-hidden">
            {book}
          </div>
          <div className="mt-4">{nav}</div>
          <p className="text-center text-[11px] text-white/30 mt-2">Arrastra o usa las flechas para pasar las páginas</p>
        </>
      )}

      {/* Modo ampliado (pantalla completa) */}
      {expanded && (
        <div className="fixed inset-0 z-[80] bg-[#07070d]/98 backdrop-blur-sm flex flex-col">
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-white/10">
            <p className="text-sm font-bold text-white truncate">{res.titulo}</p>
            <div className="flex items-center gap-2 shrink-0">
              <a href={res.archivoUrl} download target="_blank" rel="noreferrer"
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-white transition-all active:scale-95"
                style={{ background: 'linear-gradient(135deg,#0D1E79,#D203DD)' }}>
                <i className="fa-solid fa-download"></i><span className="hidden sm:inline">Descargar</span>
              </a>
              <button onClick={() => setExpanded(false)}
                className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 text-white/80 hover:bg-white/10 transition-all flex items-center justify-center">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center overflow-auto p-3">
            {book}
          </div>
          <div className="py-3 border-t border-white/10">{nav}</div>
        </div>
      )}

      <style jsx global>{`
        .rec-flip-page { background:#fff; width:100%; height:100%; display:flex; align-items:center; justify-content:center; overflow:hidden }
        .rec-flip-page .react-pdf__Page { width:100% !important; height:100% !important }
        .rec-flip-page .react-pdf__Page__canvas { width:100% !important; height:100% !important; object-fit:contain; display:block }
      `}</style>
    </div>
  )
}
