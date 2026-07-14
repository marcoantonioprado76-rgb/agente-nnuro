'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { CATEGORIAS_RECURSOS } from '@/lib/recursos'

interface ResItem {
  id: string; titulo: string; categoria: string
  portadaUrl: string | null; paginas: number | null
}

export default function PresentacionesPage() {
  const [items, setItems] = useState<ResItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cat, setCat] = useState('todas')

  useEffect(() => {
    fetch('/api/recursos/resources?tipo=presentacion')
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setItems(d.resources || []) })
      .catch(() => setError('No se pudieron cargar las presentaciones'))
      .finally(() => setLoading(false))
  }, [])

  const categorias = useMemo(() => {
    const presentes = new Set(items.map(t => t.categoria))
    const enOrden = (CATEGORIAS_RECURSOS as readonly string[]).filter(c => presentes.has(c))
    const extra = Array.from(presentes).filter(c => !(CATEGORIAS_RECURSOS as readonly string[]).includes(c))
    return ['todas', ...enOrden, ...extra]
  }, [items])

  const visibles = cat === 'todas' ? items : items.filter(t => t.categoria === cat)

  return (
  <div className="dm-page font-ui">
    <div>
      <p className="text-sm text-[#111827]/45 mb-4">Presentaciones en PDF — ábrelas para verlas y descargarlas.</p>

      {categorias.length > 1 && (
        <div className="flex gap-2 flex-wrap mb-6">
          {categorias.map(c => (
            <button key={c} onClick={() => setCat(c)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all border ${
                cat === c ? 'bg-[#B735B8]/20 border-[#B735B8]/50 text-[#111827]' : 'bg-[#F4F6FA] border-[#E4E9F0] text-[#111827]/50 hover:text-[#111827]/80'
              }`}>
              {c === 'todas' ? 'Todas' : c}
            </button>
          ))}
        </div>
      )}

      {loading && <div className="flex justify-center py-24 text-[#111827]/40"><i className="fa-solid fa-spinner fa-spin text-2xl"></i></div>}
      {error && <p className="text-red-400 text-sm py-10 text-center">{error}</p>}

      {!loading && !error && visibles.length === 0 && (
        <div className="text-center py-24 text-[#111827]/40">
          <i className="fa-solid fa-display text-4xl mb-3 block opacity-50"></i>
          <p className="text-sm">Todavía no hay presentaciones{cat !== 'todas' ? ' en esta categoría' : ''}.</p>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {visibles.map(t => (
          <Link key={t.id} href={`/dashboard/recursos/presentaciones/${t.id}`}
            className="group rounded-2xl overflow-hidden border border-white/10 hover:border-[#B735B8]/40 transition-all active:scale-[0.98]"
            style={{ background: 'linear-gradient(180deg, #0B1B2B 0%, #081624 60%, #050B14 100%)' }}>
            <div className="relative w-full bg-black/30 flex items-center justify-center" style={{ aspectRatio: '3 / 4' }}>
              {t.portadaUrl
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={t.portadaUrl} alt={t.titulo} className="w-full h-full object-cover" loading="lazy" />
                : <i className="fa-solid fa-file-pdf text-4xl text-white/20"></i>}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-3">
                <span className="text-xs font-black text-white px-3 py-1.5 rounded-full" style={{ background: 'linear-gradient(135deg,#0D1E79,#B735B8)' }}>
                  <i className="fa-solid fa-eye mr-1"></i> Ver
                </span>
              </div>
            </div>
            <div className="p-2.5">
              <p className="text-xs font-bold text-white truncate">{t.titulo}</p>
              <p className="text-[10px] text-white/40">{t.categoria}{t.paginas ? ` · ${t.paginas} pág.` : ''}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  </div>
  )
}
