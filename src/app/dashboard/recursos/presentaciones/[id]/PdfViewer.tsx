'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Document, Page, pdfjs } from 'react-pdf'

// Worker servido localmente desde /public (sin CDN → no choca con la CSP).
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js'

interface Resource { id: string; titulo: string; categoria: string; archivoUrl: string; paginas: number | null }

export default function PdfViewer({ resourceId }: { resourceId: string }) {
  const measureRef = useRef<HTMLDivElement>(null)
  const [res, setRes] = useState<Resource | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [numPages, setNumPages] = useState(0)
  const [page, setPage] = useState(1)
  const [ratio, setRatio] = useState(0.707) // ancho / alto
  const [availW, setAvailW] = useState(800)
  const [win, setWin] = useState({ w: 1200, h: 800 })
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    fetch(`/api/recursos/resources/${resourceId}`)
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setRes(d.resource) })
      .catch(() => setError('No se pudo cargar la presentación'))
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
        <p className="text-red-400 text-sm mb-4">{error || 'No encontrada'}</p>
        <Link href="/dashboard/recursos/presentaciones" className="text-[#D203DD] underline text-sm">Volver a Presentaciones</Link>
      </div>
    )
  }

  const inlineW = Math.min(820, Math.max(260, availW - 24))
  const expandedW = Math.min(win.w - 32, Math.round((win.h - 150) * ratio), 1500)
  const pageW = expanded ? Math.max(280, expandedW) : inlineW

  const onDocLoad = async (pdf: any) => {
    setNumPages(pdf.numPages)
    try { const p = await pdf.getPage(1); const v = p.getViewport({ scale: 1 }); if (v.width && v.height) setRatio(v.width / v.height) } catch { /* ratio por defecto */ }
  }

  const pdfDoc = (
    <Document file={res.archivoUrl} onLoadSuccess={onDocLoad} onLoadError={() => setError('No se pudo abrir el PDF')}
      loading={<div className="py-20 text-white/40"><i className="fa-solid fa-spinner fa-spin text-2xl"></i></div>}
      error={<p className="py-20 text-red-400 text-sm">No se pudo abrir el PDF.</p>}>
      <Page pageNumber={page} width={pageW} renderTextLayer={false} renderAnnotationLayer={false}
        className="rounded-lg overflow-hidden shadow-xl" />
    </Document>
  )

  const nav = numPages > 0 && (
    <div className="flex items-center justify-center gap-3">
      <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
        className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 text-white/70 disabled:opacity-30 hover:bg-white/10 transition-all">
        <i className="fa-solid fa-chevron-left"></i>
      </button>
      <span className="text-sm text-white/60 font-mono">{page} / {numPages}</span>
      <button onClick={() => setPage(p => Math.min(numPages, p + 1))} disabled={page >= numPages}
        className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 text-white/70 disabled:opacity-30 hover:bg-white/10 transition-all">
        <i className="fa-solid fa-chevron-right"></i>
      </button>
    </div>
  )

  return (
    <div ref={measureRef} className="max-w-5xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-2 sm:gap-3 mb-5">
        <Link href="/dashboard/recursos/presentaciones" className="w-9 h-9 shrink-0 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all">
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

      {/* Visor en línea (el marco abraza el contenido) */}
      {!expanded && (
        <>
          <div className="w-fit max-w-full mx-auto rounded-2xl border border-white/10 bg-black/30 p-2 overflow-auto">
            {pdfDoc}
          </div>
          <div className="mt-4">{nav}</div>
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
            {pdfDoc}
          </div>
          <div className="py-3 border-t border-white/10">{nav}</div>
        </div>
      )}
    </div>
  )
}
