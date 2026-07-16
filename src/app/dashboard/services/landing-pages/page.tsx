'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Layout, Plus, ExternalLink, PenLine, Trash2, Users, Loader2, Sparkles,
  Eye, Target, Link2, Copy, Check, MoreVertical, Clock,
} from 'lucide-react'
import Link from 'next/link'
import { usePlanGuard } from '@/hooks/usePlanGuard'

// ── Item unificado (landing clásica + página del constructor) ─────────────────
type Kind = 'classic' | 'builder'
interface Item {
  id: string
  kind: Kind
  name: string
  slug: string
  active: boolean
  views: number
  leads: number
  createdAt?: string
  updatedAt: string
}

const BRAND = 'linear-gradient(135deg, #1fb8bb 0%, #147e95 52%, #12303a 100%)'
const C = {
  card: '#FFFFFF',
  panel: '#F5F7FA',
  border: '#E4E9F0',
  borderSoft: '#EDF0F5',
  ink: '#111827',
  muted: '#6B7280',
  faint: '#9AA3AF',
  accent: '#147e95',
  greenSoft: '#E7F6EC',
  greenText: '#16A34A',
  neutralPill: '#F1F4F8',
  visualPill: '#F3E9FB',
  visualText: '#8B35C9',
}

// URLs por tipo
const publicUrl = (it: Item) => (it.kind === 'builder' ? `/b/${it.slug}` : `/lp/${it.slug}`)
const previewUrl = (it: Item) => `${publicUrl(it)}?preview=1`
const editUrl = (it: Item) =>
  it.kind === 'builder'
    ? `/dashboard/services/landing-pages/builder/${it.id}`
    : `/dashboard/services/landing-pages/${it.id}/edit`
const deleteApi = (it: Item) => (it.kind === 'builder' ? `/api/builder-pages/${it.id}` : `/api/landing-pages/${it.id}`)

function fmtDate(v?: string) {
  if (!v) return '—'
  const d = new Date(v)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
}
function isToday(v?: string) {
  if (!v) return false
  const d = new Date(v); const n = new Date()
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate()
}

// ── Preview real dentro de un mini navegador (iframe escalado, mismo origen) ──
const BASE_W = 1280
const BASE_H = 1600
function LandingPreview({ url }: { url: string }) {
  const boxRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0)
  const [loaded, setLoaded] = useState(false)
  useEffect(() => {
    const el = boxRef.current
    if (!el) return
    const update = () => setScale(el.clientWidth / BASE_W)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return (
    <div ref={boxRef} className="absolute inset-0 overflow-hidden" style={{ background: '#0c0c0e' }}>
      {!loaded && (
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(110deg, #1a262f 30%, #1d1d21 50%, #1a262f 70%)',
          backgroundSize: '200% 100%', animation: 'lpShimmer 1.4s ease-in-out infinite',
        }} />
      )}
      {scale > 0 && (
        <iframe src={url} title={url} loading="lazy" scrolling="no" tabIndex={-1} aria-hidden="true"
          sandbox="allow-same-origin" onLoad={() => setLoaded(true)}
          style={{
            width: BASE_W, height: BASE_H, border: 0,
            transform: `scale(${scale})`, transformOrigin: 'top left',
            pointerEvents: 'none', opacity: loaded ? 1 : 0, transition: 'opacity .4s ease',
          }} />
      )}
    </div>
  )
}

export default function LandingPagesGallery() {
  usePlanGuard()
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [menuFor, setMenuFor] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    try {
      const [rc, rb] = await Promise.all([
        fetch('/api/landing-pages').then(r => r.json()).catch(() => ({})),
        fetch('/api/builder-pages').then(r => r.json()).catch(() => ({})),
      ])
      const classic: Item[] = (rc?.pages ?? []).map((p: any) => ({
        id: p.id, kind: 'classic', name: p.name, slug: p.slug, active: !!p.active,
        views: p.views ?? 0, leads: p._count?.leads ?? 0, createdAt: p.createdAt, updatedAt: p.updatedAt,
      }))
      // Solo las páginas del constructor que YA están publicadas aparecen en la galería.
      const builder: Item[] = (rb?.pages ?? []).filter((p: any) => p.published).map((p: any) => ({
        id: p.id, kind: 'builder', name: p.name, slug: p.slug, active: true,
        views: p.views ?? 0, leads: p._count?.leads ?? 0, createdAt: p.createdAt, updatedAt: p.updatedAt,
      }))
      const all = [...classic, ...builder].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      )
      setItems(all)
    } catch (e) {
      console.error('Error cargando landings:', e)
    } finally {
      setLoading(false)
    }
  }

  const deleteItem = async (it: Item) => {
    setMenuFor(null)
    if (!confirm('¿Seguro que quieres eliminar esta página? Esta acción no se puede deshacer.')) return
    try {
      await fetch(deleteApi(it), { method: 'DELETE' })
      setItems(items.filter(x => !(x.id === it.id && x.kind === it.kind)))
    } catch (e) { console.error('Error eliminando:', e) }
  }

  const copyLink = async (it: Item) => {
    const url = `${window.location.origin}${publicUrl(it)}`
    try { await navigator.clipboard.writeText(url) } catch { /* noop */ }
    setCopied(it.id); setMenuFor(null)
    setTimeout(() => setCopied(c => (c === it.id ? null : c)), 1600)
  }

  return (
    <div className="dm-page font-ui">
      <style>{`@keyframes lpShimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
      <div className="px-4 sm:px-6 lg:px-8 pt-8 max-w-5xl mx-auto pb-20">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-7">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: BRAND, boxShadow: '0 8px 20px -8px rgba(183,53,184,0.55)' }}>
              <Layout className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold leading-tight" style={{ color: C.ink, letterSpacing: '-0.02em' }}>
                Mis Landing Pages
              </h1>
              <p className="text-[12px] mt-0.5" style={{ color: C.muted }}>
                Todas tus páginas · {items.length} {items.length === 1 ? 'proyecto' : 'proyectos'}
              </p>
            </div>
          </div>

          <Link href="/dashboard/services/landing-pages/nueva"
            className="rounded-xl px-4 py-2.5 font-bold flex items-center gap-2 text-sm transition-all active:scale-[0.98] self-start md:self-auto"
            style={{ background: BRAND, color: '#fff', boxShadow: '0 10px 26px -12px rgba(123,91,255,0.65)' }}>
            <Plus className="w-4 h-4" />
            Nueva Landing
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: C.accent }} />
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-3xl p-16 text-center"
            style={{ background: C.card, border: `1px solid ${C.border}`, boxShadow: '0 18px 44px -30px rgba(17,24,39,0.28)' }}>
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
              style={{ background: BRAND, boxShadow: '0 12px 28px -10px rgba(183,53,184,0.5)' }}>
              <Layout className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-xl font-bold mb-2" style={{ color: C.ink }}>Aún no tienes páginas</h2>
            <p className="text-sm mb-6 max-w-sm mx-auto leading-relaxed" style={{ color: C.muted }}>
              Crea tu primera página con el Constructor Visual o con IA / código.
            </p>
            <Link href="/dashboard/services/landing-pages/nueva"
              className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 font-bold text-sm transition-all active:scale-[0.98]"
              style={{ background: BRAND, color: '#fff', boxShadow: '0 10px 24px -12px rgba(123,91,255,0.6)' }}>
              <Sparkles className="w-4 h-4" />
              Crear mi primera página
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
            {items.map((it) => {
              const conv = it.views > 0 ? Math.round((it.leads / it.views) * 100) : 0
              const stats = [
                { icon: Eye, label: 'visitas', value: `${it.views}` },
                { icon: Users, label: 'leads', value: `${it.leads}` },
                { icon: Target, label: 'conversión', value: `${conv}%` },
              ]
              return (
                <article key={`${it.kind}-${it.id}`}
                  className="rounded-3xl overflow-hidden flex flex-col md:flex-row transition-all duration-300"
                  style={{ background: C.card, border: `1px solid ${C.border}`, boxShadow: '0 16px 40px -28px rgba(17,24,39,0.30)' }}
                  onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 24px 54px -26px rgba(17,24,39,0.40)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 16px 40px -28px rgba(17,24,39,0.30)'; e.currentTarget.style.transform = 'translateY(0)' }}>

                  {/* mini navegador con la página real */}
                  <div className="md:w-[55%] p-4 md:p-5 shrink-0 flex">
                    <a href={publicUrl(it)} target="_blank" rel="noopener noreferrer"
                      className="w-full flex flex-col rounded-2xl overflow-hidden group"
                      style={{ border: `1px solid ${C.border}`, boxShadow: '0 8px 22px -14px rgba(17,24,39,0.35)' }}>
                      <div className="flex items-center gap-2 px-3 h-8 shrink-0" style={{ background: '#20242E' }}>
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#F45B4B' }} />
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#F5B93E' }} />
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#4CC55A' }} />
                        <span className="ml-2 flex-1 flex items-center gap-1.5 text-[10px] font-mono px-2.5 py-1 rounded-md truncate"
                          style={{ color: 'rgba(255,255,255,0.72)', background: 'rgba(255,255,255,0.08)' }}>
                          <span className="opacity-60">🔒</span>{publicUrl(it)}
                        </span>
                      </div>
                      <div className="relative flex-1 overflow-hidden" style={{ minHeight: 220 }}>
                        <LandingPreview url={previewUrl(it)} />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                          style={{ background: 'rgba(12,12,14,0.28)' }}>
                          <span className="inline-flex items-center gap-2 text-xs font-bold text-white px-3.5 py-2 rounded-full backdrop-blur-sm"
                            style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.35)' }}>
                            <ExternalLink className="w-3.5 h-3.5" /> Ver página
                          </span>
                        </div>
                      </div>
                    </a>
                  </div>

                  {/* detalles */}
                  <div className="flex-1 p-5 md:pl-2 md:pr-6 md:py-6 flex flex-col min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="text-[20px] font-bold leading-tight truncate" style={{ color: C.ink, letterSpacing: '-0.02em' }}>
                        {it.name}
                      </h2>
                      <div className="relative shrink-0">
                        <button onClick={() => setMenuFor(menuFor === it.id ? null : it.id)}
                          className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
                          style={{ border: `1px solid ${C.border}`, color: C.muted, background: menuFor === it.id ? C.panel : 'transparent' }}
                          aria-label="Más opciones">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        {menuFor === it.id && (
                          <>
                            <div className="fixed inset-0 z-30" onClick={() => setMenuFor(null)} />
                            <div className="absolute right-0 mt-1.5 w-52 rounded-xl overflow-hidden z-40 py-1"
                              style={{ background: C.card, border: `1px solid ${C.border}`, boxShadow: '0 18px 40px -16px rgba(17,24,39,0.30)' }}>
                              <button onClick={() => copyLink(it)}
                                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] font-medium text-left transition-colors hover:bg-black/[0.03]"
                                style={{ color: C.ink }}>
                                <Copy className="w-4 h-4" style={{ color: C.muted }} /> Copiar enlace
                              </button>
                              <Link href={editUrl(it)}
                                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] font-medium text-left transition-colors hover:bg-black/[0.03]"
                                style={{ color: C.ink }}>
                                <PenLine className="w-4 h-4" style={{ color: C.muted }} /> Editar
                              </Link>
                              <div style={{ height: 1, background: C.border, margin: '4px 0' }} />
                              <button onClick={() => deleteItem(it)}
                                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] font-medium text-left transition-colors hover:bg-red-50"
                                style={{ color: '#C0392B' }}>
                                <Trash2 className="w-4 h-4" /> Eliminar permanentemente
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center flex-wrap gap-x-3 gap-y-2 mt-1.5">
                      <button onClick={() => copyLink(it)}
                        className="inline-flex items-center gap-1.5 text-[12.5px] font-mono transition-colors hover:opacity-80"
                        style={{ color: C.muted }}>
                        <Link2 className="w-3.5 h-3.5" style={{ color: C.accent }} />
                        {publicUrl(it)}
                        {copied === it.id
                          ? <Check className="w-3.5 h-3.5" style={{ color: C.greenText }} />
                          : <Copy className="w-3.5 h-3.5 opacity-60" />}
                      </button>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.1em] px-2.5 py-1 rounded-full"
                          style={{ background: C.greenSoft, color: C.greenText }}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: C.greenText }} /> Activa
                        </span>
                        <span className="text-[10.5px] font-bold uppercase tracking-[0.1em] px-2.5 py-1 rounded-full"
                          style={it.kind === 'builder'
                            ? { background: C.visualPill, color: C.visualText }
                            : { background: C.neutralPill, color: C.muted }}>
                          {it.kind === 'builder' ? 'Visual' : 'HTML'}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 mt-4 rounded-2xl overflow-hidden"
                      style={{ background: C.panel, border: `1px solid ${C.borderSoft}` }}>
                      {stats.map((s, i) => (
                        <div key={s.label} className="px-3 py-3.5"
                          style={i < 2 ? { borderRight: `1px solid ${C.borderSoft}` } : undefined}>
                          <s.icon className="w-4 h-4 mb-1.5" style={{ color: C.accent }} />
                          <div className="text-[20px] font-bold leading-none" style={{ color: C.ink }}>{s.value}</div>
                          <div className="text-[11px] mt-1" style={{ color: C.muted }}>{s.label}</div>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center gap-1.5 mt-3 text-[11px] whitespace-nowrap overflow-hidden" style={{ color: C.faint }}>
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">
                        Creada {fmtDate(it.createdAt)} · {isToday(it.updatedAt) ? 'Actualizada hoy' : `Act. ${fmtDate(it.updatedAt)}`}
                      </span>
                    </div>

                    <div className="flex items-stretch gap-2.5 mt-auto pt-4">
                      <Link href={editUrl(it)}
                        title="Editar" aria-label="Editar"
                        className="shrink-0 w-11 rounded-xl flex items-center justify-center py-2.5 transition-all active:scale-[0.98]"
                        style={{ background: 'transparent', color: C.ink, border: `1px solid ${C.border}` }}>
                        <PenLine className="w-4 h-4" style={{ color: C.muted }} />
                      </Link>
                      <a href={publicUrl(it)} target="_blank" rel="noopener noreferrer"
                        className="flex-1 rounded-xl flex items-center justify-center gap-2 py-2.5 text-sm font-bold whitespace-nowrap transition-all active:scale-[0.98]"
                        style={{ background: BRAND, color: '#fff', boxShadow: '0 10px 24px -12px rgba(123,91,255,0.6)' }}>
                        <ExternalLink className="w-4 h-4" /> Ver página
                      </a>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
