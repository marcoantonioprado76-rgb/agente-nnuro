'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'

interface TemplateItem {
  id: string
  nombre: string
  categoria: string
  ancho: number
  alto: number
  thumbUrl: string | null
  fondoUrl: string
}

export default function RecursosGaleriaPage() {
  const [templates, setTemplates] = useState<TemplateItem[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // null = mostrar el menú de áreas (en móvil). 'todas' o un área = ver sus flyers.
  const [selected, setSelected] = useState<string | null>(null)
  // Áreas visibles del menú, gestionadas por el admin (tabla flyer_areas)
  const [areas, setAreas] = useState<string[]>([])

  useEffect(() => {
    fetch('/api/recursos/templates')
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); return }
        setTemplates(d.templates || [])
        setIsAdmin(!!d.isAdmin)
      })
      .catch(() => setError('No se pudieron cargar las plantillas'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetch('/api/recursos/areas')
      .then(r => r.json())
      .then(d => setAreas((d.areas || []).map((a: { nombre: string }) => a.nombre)))
      .catch(() => { /* si falla, el menú queda solo con "Todas" */ })
  }, [])

  const counts = useMemo(() => {
    const m: Record<string, number> = {}
    for (const t of templates) m[t.categoria] = (m[t.categoria] || 0) + 1
    return m
  }, [templates])

  const activeKey = selected || 'todas'
  const gridItems = (!selected || selected === 'todas')
    ? templates
    : templates.filter(t => t.categoria === selected)
  const titulo = (!selected || selected === 'todas') ? 'Todos los flyers' : selected

  function Row({ value, label, n }: { value: string; label: string; n: number }) {
    const active = activeKey === value
    const empty = n === 0 && value !== 'todas'
    return (
      <button
        onClick={() => setSelected(value)}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
          active ? 'text-white' : 'text-white/70 hover:text-white'
        } ${empty ? 'opacity-45' : ''}`}
        style={{
          background: active
            ? 'radial-gradient(120% 80% at 50% -10%, rgba(183,53,184,0.22), rgba(255,255,255,0) 58%), linear-gradient(180deg, #0B1B2B 0%, #081624 60%, #050B14 100%)'
            : 'linear-gradient(180deg, #0B1B2B 0%, #081624 60%, #050B14 100%)',
          border: active ? '1px solid rgba(183,53,184,0.5)' : '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 14px 32px -22px rgba(8,22,36,0.6)',
        }}
      >
        {/* indicador estilo radio */}
        <span className={`w-3.5 h-3.5 rounded-full border-2 shrink-0 flex items-center justify-center ${active ? 'border-[#B735B8]' : 'border-white/30'}`}>
          {active && <span className="w-1.5 h-1.5 rounded-full bg-[#B735B8]" />}
        </span>
        <span className="flex-1 text-sm font-bold truncate">{label}</span>
        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${active ? 'bg-[#B735B8]/30 text-white' : 'bg-white/10 text-white/55'}`}>{n}</span>
        <i className="fa-solid fa-chevron-right text-[10px] text-white/30 md:hidden"></i>
      </button>
    )
  }

  return (
  <div className="dm-page font-ui">
    <div className="md:flex md:gap-6">
      {/* ── MENÚ VERTICAL DE ÁREAS ── */}
      <aside className={`${selected ? 'hidden md:block' : 'block'} md:w-60 md:shrink-0`}>
        <h2 className="text-sm font-black text-[#111827]/80 mb-3 px-1">Filtrar flyers</h2>
        <div className="space-y-1.5">
          <Row value="todas" label="Todas" n={templates.length} />
          {areas.map(a => <Row key={a} value={a} label={a} n={counts[a] || 0} />)}
        </div>
      </aside>

      {/* ── FLYERS DEL ÁREA ── */}
      <section className={`${selected ? 'block' : 'hidden md:block'} flex-1 min-w-0`}>
        {selected && (
          <button onClick={() => setSelected(null)}
            className="md:hidden flex items-center gap-2 mb-4 text-sm font-bold text-[#111827]/60 hover:text-[#111827] transition-all">
            <i className="fa-solid fa-arrow-left"></i> Áreas
          </button>
        )}

        <div className="flex items-center justify-between gap-3 mb-4">
          <h3 className="text-lg font-black text-[#111827] truncate">{titulo}</h3>
          {!loading && <span className="text-xs text-[#111827]/40 shrink-0">{gridItems.length} flyer(s)</span>}
        </div>

        {loading && (
          <div className="flex items-center justify-center py-24 text-[#111827]/40">
            <i className="fa-solid fa-spinner fa-spin text-2xl"></i>
          </div>
        )}
        {error && <p className="text-red-400 text-sm py-10 text-center">{error}</p>}

        {!loading && !error && gridItems.length === 0 && (
          <div className="text-center py-24 text-[#111827]/40">
            <i className="fa-regular fa-image text-4xl mb-3 block opacity-50"></i>
            <p className="text-sm">Todavía no hay flyers{selected && selected !== 'todas' ? ' en esta área' : ''}.</p>
            {isAdmin && <p className="text-xs mt-2">Subí el primero desde <Link href="/admin/recursos" className="underline text-[#B735B8]">Admin → Recursos</Link>.</p>}
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {gridItems.map(t => (
            <Link key={t.id} href={`/dashboard/recursos/flyers/${t.id}`}
              className="group rounded-2xl overflow-hidden hover:border-[#B735B8]/40 transition-all active:scale-[0.98]"
              style={{ background: 'radial-gradient(120% 80% at 50% -10%, rgba(183,53,184,0.18), rgba(255,255,255,0) 58%), linear-gradient(180deg, #0B1B2B 0%, #081624 55%, #050B14 100%)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 22px 50px -24px rgba(8,22,36,0.6), inset 0 1px 0 rgba(255,255,255,0.06)' }}>
              <div className="relative w-full bg-black/30" style={{ aspectRatio: `${t.ancho} / ${t.alto}` }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={t.thumbUrl || t.fondoUrl} alt={t.nombre} className="w-full h-full object-cover" loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-3">
                  <span className="text-xs font-black text-white px-3 py-1.5 rounded-full" style={{ background: 'linear-gradient(135deg, #FF2D95 0%, #B735B8 48%, #233B8F 100%)' }}>
                    <i className="fa-solid fa-pen-to-square mr-1"></i> Editar
                  </span>
                </div>
              </div>
              <div className="p-2.5">
                <p className="text-xs font-bold text-white truncate">{t.nombre}</p>
                <p className="text-[10px] text-white/55">{t.categoria}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  </div>
  )
}
