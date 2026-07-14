'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { LayoutTemplate, Plus, Trash2, Eye, EyeOff, Loader2, Lock } from 'lucide-react'
import RecursosTabs from './RecursosTabs'
import AreasManager from './AreasManager'

interface T {
  id: string; nombre: string; categoria: string
  ancho: number; alto: number; thumbUrl: string | null; fondoUrl: string
  activo?: boolean
}

export default function AdminRecursosPage() {
  const [items, setItems] = useState<T[]>([])
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)

  function load() {
    fetch('/api/recursos/templates?todos=1')
      .then(r => r.json())
      .then(d => { setItems(d.templates || []); setIsAdmin(!!d.isAdmin) })
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  async function toggle(t: T) {
    setBusy(t.id)
    await fetch(`/api/recursos/templates/${t.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activo: !t.activo }),
    })
    setBusy(null); load()
  }
  async function remove(t: T) {
    if (!confirm(`¿Eliminar la plantilla "${t.nombre}"? No se puede deshacer.`)) return
    setBusy(t.id)
    await fetch(`/api/recursos/templates/${t.id}`, { method: 'DELETE' })
    setBusy(null); load()
  }

  if (loading) {
    return <div className="flex items-center justify-center py-24"><Loader2 className="animate-spin text-purple-400" /></div>
  }

  if (isAdmin === false) {
    return (
      <div className="max-w-md mx-auto text-center py-20">
        <Lock className="mx-auto text-[#111827]/25 mb-3" size={28} />
        <p className="text-[#111827]/60 text-sm">Tu cuenta no gestiona Recursos. La maneja la cuenta de administración designada.</p>
      </div>
    )
  }

  return (
  <div className="dm-page font-ui">
    <div>
      <h1 className="text-xl font-black text-[#111827] flex items-center gap-2 mb-5">
        <LayoutTemplate size={20} className="text-purple-400" /> Recursos
      </h1>
      <RecursosTabs />

      <AreasManager />

      {/* Header de la pestaña Flyers */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <p className="text-xs text-[#111827]/40">{items.length} plantilla(s). Acá subís y administrás las plantillas editables (flyers).</p>
        <Link href="/admin/recursos/nuevo"
          className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90 transition-all"
          style={{ background: 'linear-gradient(135deg,#FF2D95 0%,#B735B8 48%,#233B8F 100%)' }}>
          <Plus size={15} /> Nueva plantilla
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-20 text-[#111827]/40 border border-dashed border-[#E4E9F0] rounded-2xl">
          <LayoutTemplate className="mx-auto mb-3 opacity-40" size={32} />
          <p className="text-sm">No hay plantillas todavía.</p>
          <p className="text-xs mt-1">Creá la primera con “Nueva plantilla”.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {items.map(t => (
            <div key={t.id} className="rounded-2xl overflow-hidden border border-[#E4E9F0] bg-white">
              <div className="relative w-full bg-[#F0F3F7]" style={{ aspectRatio: `${t.ancho} / ${t.alto}` }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={t.thumbUrl || t.fondoUrl} alt={t.nombre} className="w-full h-full object-cover" loading="lazy" />
                {!t.activo && <span className="absolute top-2 left-2 text-[9px] font-black px-2 py-0.5 rounded-full bg-[#0B1B2B]/80 text-white">OCULTA</span>}
              </div>
              <div className="p-2.5">
                <p className="text-xs font-bold text-[#111827] truncate">{t.nombre}</p>
                <p className="text-[10px] text-[#111827]/35 capitalize mb-2">{t.categoria}</p>
                <div className="flex gap-1.5">
                  <button onClick={() => toggle(t)} disabled={busy === t.id}
                    className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[10px] font-bold transition-all disabled:opacity-50 ${t.activo ? 'bg-amber-500/15 text-amber-600 border border-amber-500/30' : 'bg-emerald-500/15 text-emerald-600 border border-emerald-500/30'}`}>
                    {t.activo ? <><EyeOff size={11} /> Ocultar</> : <><Eye size={11} /> Activar</>}
                  </button>
                  <button onClick={() => remove(t)} disabled={busy === t.id}
                    className="px-2.5 py-1.5 rounded-lg text-red-500 bg-red-500/10 border border-red-500/20 transition-all disabled:opacity-50">
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
  )
}
