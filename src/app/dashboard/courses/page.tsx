'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

const DG = 'linear-gradient(135deg, #FF2D95 0%, #B735B8 48%, #233B8F 100%)'

interface Enrollment {
  status: 'PENDING' | 'PENDING_VERIFICATION' | 'APPROVED' | 'REJECTED'
}

interface Course {
  id: string
  title: string
  description: string
  coverUrl: string | null
  price: number
  freeForPlan: boolean
  categoria: string | null
  nivel: string | null
  videosCount: number
  createdAt: string
  locked: boolean
  enrollment: Enrollment | null
}

const NIVEL_COLOR: Record<string, string> = {
  Principiante: '#7DD3FC',
  Intermedio: '#C9A7FF',
  Avanzado: '#FF2D95',
}

const STATUS_BADGE: Record<string, { label: string; style: React.CSSProperties }> = {
  PENDING: {
    label: 'Pago pendiente',
    style: { color: '#f97316', background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.25)' },
  },
  PENDING_VERIFICATION: {
    label: 'Verificando cripto',
    style: { color: '#C9A7FF', background: 'rgba(201,167,255,0.1)', border: '1px solid rgba(201,167,255,0.3)' },
  },
  APPROVED: {
    label: 'Acceso completo',
    style: { color: '#fff', background: DG, border: 'none' },
  },
  REJECTED: {
    label: 'Rechazado',
    style: { color: '#ef4444', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' },
  },
}

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [activeCat, setActiveCat] = useState<string>('Todos')

  useEffect(() => {
    fetch('/api/courses')
      .then(r => r.json())
      .then(data => {
        if (data.error) setError(data.error)
        else setCourses(data.courses ?? [])
        setLoading(false)
      })
      .catch(() => { setError('Error al cargar cursos'); setLoading(false) })
  }, [])

  const categorias = ['Todos', ...Array.from(new Set(courses.map(c => c.categoria).filter(Boolean) as string[]))]

  const filtered = courses.filter(c =>
    c.title.toLowerCase().includes(search.toLowerCase()) &&
    (activeCat === 'Todos' || c.categoria === activeCat)
  )

  if (loading) {
    return (
      <div className="px-4 sm:px-6 pt-6 max-w-screen-xl mx-auto min-h-[60vh] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#FF2DF7] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="px-4 sm:px-6 pt-6 max-w-screen-xl mx-auto">
        <p className="text-red-400 text-sm">{error}</p>
      </div>
    )
  }

  return (
  <div className="dm-page font-ui">
    <div className="px-4 sm:px-6 pt-6 pb-24 max-w-6xl mx-auto">

      {/* Volver a Academy */}
      <Link href="/dashboard/academy" className="academy-back" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 16, textDecoration: 'none' }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: 9,
          background: '#F0F3F7', border: '1px solid #E4E9F0', color: '#374151',
        }}>
          <i className="fa-solid fa-arrow-left" style={{ fontSize: 12 }} />
        </span>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#6B7280' }}>Volver a Academy</span>
      </Link>

      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-[#111827] uppercase tracking-widest">MY DIAMOND Academy</h1>
          <div className="h-px w-20 mt-2 rounded-full" style={{ background: 'linear-gradient(90deg, transparent, #B735B8, #FF2DF7, transparent)' }} />
          <p className="text-xs text-[#111827]/30 mt-2">Accede a cursos exclusivos de MY DIAMOND.</p>
          {courses.length > 0 && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
              <span style={{ fontSize: 11, color: '#6B7280' }}>
                <b style={{ color: '#111827' }}>{courses.length}</b> curso{courses.length !== 1 ? 's' : ''}
              </span>
              {courses.some(c => c.enrollment?.status === 'APPROVED') && (
                <span style={{ fontSize: 11, color: 'rgba(255,45,149,0.7)' }}>
                  <b style={{ background: DG, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{courses.filter(c => c.enrollment?.status === 'APPROVED').length}</b> con acceso
                </span>
              )}
              {courses.some(c => c.freeForPlan) && (
                <span style={{ fontSize: 11, color: '#6B7280' }}>
                  <b style={{ color: '#B735B8' }}>{courses.filter(c => c.freeForPlan).length}</b> gratis con tu plan
                </span>
              )}
            </div>
          )}
        </div>
        <Link
          href="/dashboard/courses/my-enrollments"
          className="shrink-0 whitespace-nowrap"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: 12, fontWeight: 600, color: '#B735B8',
            background: 'rgba(183,53,184,0.07)', border: '1px solid #E4E9F0',
            borderRadius: 8, padding: '7px 14px', textDecoration: 'none',
          }}>
          📋 Mis inscripciones
        </Link>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/35 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar curso por nombre..."
          className="placeholder-white/35"
          style={{
            width: '100%', paddingLeft: 36, paddingRight: 16, paddingTop: 10, paddingBottom: 10,
            borderRadius: 12, fontSize: 13, color: '#fff', outline: 'none',
            background: 'linear-gradient(180deg, #0B1B2B 0%, #081624 60%, #050B14 100%)', border: '1px solid rgba(255,255,255,0.1)',
            boxSizing: 'border-box',
          }}
          onFocus={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.22)')}
          onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.55)', fontSize: 16, lineHeight: 1 }}
          >✕</button>
        )}
      </div>

      {/* Filtro por categoría */}
      {categorias.length > 1 && (
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {categorias.map(cat => {
            const active = activeCat === cat
            return (
              <button
                key={cat}
                onClick={() => setActiveCat(cat)}
                className="shrink-0 whitespace-nowrap transition-colors"
                style={{
                  fontSize: 12, fontWeight: 700, padding: '7px 14px', borderRadius: 999,
                  color: active ? '#fff' : 'rgba(255,255,255,0.6)',
                  background: active ? 'linear-gradient(135deg, #B735B8, #FF2DF7)' : 'linear-gradient(180deg, #0B1B2B 0%, #081624 60%, #050B14 100%)',
                  border: `1px solid ${active ? 'transparent' : 'rgba(255,255,255,0.1)'}`,
                }}>
                {cat}
              </button>
            )
          })}
        </div>
      )}

      {courses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: 'rgba(183,53,184,0.06)', border: '1px solid #E4E9F0' }}>
            <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="#B735B8" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
            </svg>
          </div>
          <p className="text-sm text-[#111827]/40">No hay cursos disponibles aún.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-sm text-[#111827]/30">
            Sin resultados{search ? <> para <span className="text-[#111827]/60">"{search}"</span></> : activeCat !== 'Todos' ? <> en <span className="text-[#111827]/60">{activeCat}</span></> : ''}
          </p>
          <button onClick={() => { setSearch(''); setActiveCat('Todos') }} className="mt-3 text-xs text-[#FF096C] hover:underline">Limpiar filtros</button>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {filtered.map(course => {
            const badge = course.enrollment ? STATUS_BADGE[course.enrollment.status] : null
            const isLocked = course.locked

            const card = (
              <div
                key={course.id}
                style={{
                  borderRadius: 16,
                  overflow: 'hidden',
                  background: 'linear-gradient(180deg, #0B1B2B 0%, #081624 60%, #050B14 100%)',
                  border: `1px solid ${isLocked ? 'rgba(183,53,184,0.18)' : 'rgba(255,255,255,0.1)'}`,
                  opacity: isLocked ? 0.7 : 1,
                  cursor: isLocked ? 'default' : 'pointer',
                  transition: 'border-color 0.2s, transform 0.15s',
                  display: 'flex',
                  flexDirection: 'column',
                  height: '100%',
                }}
              >
                {/* Cover — fixed aspect ratio */}
                <div style={{ aspectRatio: '16/9', background: 'rgba(183,53,184,0.05)', position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
                  {course.coverUrl ? (
                    <img src={course.coverUrl} alt={course.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', filter: isLocked ? 'brightness(0.5)' : 'none' }} />
                  ) : (
                    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg className="w-10 h-10 opacity-20" viewBox="0 0 24 24" fill="none" stroke="#B735B8" strokeWidth="1">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
                      </svg>
                    </div>
                  )}

                  {/* Lock overlay */}
                  {isLocked && (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, background: 'rgba(0,0,0,0.45)' }}>
                      <span style={{ fontSize: 22 }}>🔒</span>
                      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#6B7280', textTransform: 'uppercase' }}>
                        No disponible
                      </span>
                    </div>
                  )}

                  {/* Status badge */}
                  {!isLocked && badge && (
                    <span style={{
                      position: 'absolute', top: 8, right: 8, fontSize: 10, fontWeight: 700,
                      letterSpacing: '0.06em', padding: '3px 8px', borderRadius: 6, ...badge.style,
                    }}>
                      {badge.label}
                    </span>
                  )}

                  {/* Free for plan badge */}
                  {!isLocked && course.freeForPlan && !course.enrollment && (
                    <span style={{
                      position: 'absolute', top: 8, left: 8, fontSize: 10, fontWeight: 700,
                      letterSpacing: '0.06em', padding: '3px 8px', borderRadius: 6,
                      color: '#fff', background: DG, border: 'none',
                    }}>
                      Gratis con tu plan
                    </span>
                  )}
                </div>

                {/* Content — flex grow to equalize height */}
                <div style={{ padding: '12px 14px 14px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                  {(course.categoria || course.nivel) && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 7 }}>
                      {course.categoria && (
                        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', padding: '2px 7px', borderRadius: 5, color: 'rgba(255,255,255,0.55)', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                          {course.categoria}
                        </span>
                      )}
                      {course.nivel && (
                        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', padding: '2px 7px', borderRadius: 5, color: NIVEL_COLOR[course.nivel] ?? 'rgba(255,255,255,0.55)', background: 'rgba(255,255,255,0.04)', border: `1px solid ${(NIVEL_COLOR[course.nivel] ?? '#9CA3AF')}40` }}>
                          {course.nivel}
                        </span>
                      )}
                    </div>
                  )}
                  <p style={{ fontWeight: 700, fontSize: 13, color: isLocked ? '#6B7280' : '#fff', marginBottom: 6, lineHeight: 1.35 }}>
                    {course.title}
                  </p>
                  <p style={{
                    color: 'rgba(255,255,255,0.55)', fontSize: 11, lineHeight: 1.5, marginBottom: 12, flex: 1,
                    display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                  }}>
                    {course.description}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
                    {isLocked ? (
                      <Link href="/dashboard/planes" style={{ color: '#B735B8', textDecoration: 'none', fontWeight: 600, fontSize: 12 }}>
                        Ver plan →
                      </Link>
                    ) : (
                      <span style={{ fontWeight: 800, fontSize: 13, ...(course.freeForPlan ? { color: '#fff', background: DG, padding: '3px 10px', borderRadius: 999 } : { color: '#C9A7FF' }) }}>
                        {course.freeForPlan ? 'GRATIS' : `${course.price.toFixed(2)} USDT`}
                      </span>
                    )}
                    <span style={{ color: 'rgba(255,255,255,0.42)', fontSize: 11 }}>
                      {course.videosCount} vid{course.videosCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              </div>
            )

            return isLocked ? (
              <div key={course.id} style={{ height: '100%' }}>{card}</div>
            ) : (
              <Link key={course.id} href={`/dashboard/courses/${course.id}`} style={{ textDecoration: 'none', display: 'block', height: '100%' }}
                className="hover:scale-[1.01] transition-transform">
                {card}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  </div>
  )
}
