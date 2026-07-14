'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Course {
  id: string
  title: string
  description: string
  coverUrl: string | null
  price: number
  freeForPlan: boolean
  _count: { videos: number }
}

interface Enrollment {
  id: string
  status: 'PENDING' | 'PENDING_VERIFICATION' | 'APPROVED' | 'REJECTED'
  proofUrl: string | null
  notes: string | null
  createdAt: string
  course: Course
}

const STATUS: Record<string, { label: string; color: string; bg: string; border: string; icon: string }> = {
  PENDING:              { label: 'Comprobante en revisión', color: '#f97316', bg: 'rgba(249,115,22,0.1)',  border: 'rgba(249,115,22,0.25)',  icon: '⏳' },
  PENDING_VERIFICATION: { label: 'Verificando en blockchain', color: '#C9A7FF', bg: 'rgba(245,166,35,0.1)', border: 'rgba(245,166,35,0.3)',  icon: '⛓️' },
  APPROVED:             { label: 'Acceso completo',  color: '#FF2D95', bg: 'rgba(255,45,149,0.08)', border: 'rgba(255,45,149,0.2)',   icon: '✓' },
  REJECTED:             { label: 'Rechazado',        color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.25)',  icon: '✕' },
}

export default function MyEnrollmentsPage() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/courses/my-enrollments')
      .then(r => r.json())
      .then(d => { setEnrollments(d.enrollments ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  return (
  <div className="dm-page font-ui">
    <div className="px-4 sm:px-6 pt-6 pb-12 max-w-5xl mx-auto">

      {/* Back */}
      <Link href="/dashboard/courses"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#6B7280', textDecoration: 'none', marginBottom: 24 }}>
        ← Volver a cursos
      </Link>

      {/* Title */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[#111827] uppercase tracking-widest"
          style={{ fontSize: 'clamp(16px, 5vw, 20px)' }}>
          Mis Inscripciones
        </h1>
        <div className="h-px w-20 mt-2 rounded-full"
          style={{ background: 'linear-gradient(90deg, transparent, #B735B8, #FF2DF7, transparent)' }} />
        <p className="text-xs mt-2" style={{ color: '#6B7280' }}>
          Cursos en los que te has inscrito o tienes acceso.
        </p>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-[#B735B8] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Empty */}
      {!loading && enrollments.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: 'rgba(183,53,184,0.06)', border: '1px solid #E4E9F0' }}>
            <svg className="w-7 h-7 opacity-50" viewBox="0 0 24 24" fill="none" stroke="#B735B8" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <p className="text-sm" style={{ color: '#6B7280' }}>No te has inscrito en ningún curso aún.</p>
          <Link href="/dashboard/courses"
            className="mt-4 text-xs font-semibold"
            style={{ color: '#B735B8', textDecoration: 'none', border: '1px solid #E4E9F0', borderRadius: 8, padding: '7px 16px', display: 'inline-block' }}>
            Ver catálogo de cursos
          </Link>
        </div>
      )}

      {/* List */}
      {!loading && enrollments.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {enrollments.map(e => {
            const st = STATUS[e.status]
            const course = e.course
            return (
              <div key={e.id}
                style={{ background: 'linear-gradient(180deg, #0B1B2B 0%, #081624 60%, #050B14 100%)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, overflow: 'hidden' }}>

                <div style={{ display: 'flex', gap: 14, padding: 16 }}>
                  {/* Cover */}
                  {course.coverUrl ? (
                    <img src={course.coverUrl} alt={course.title}
                      style={{ width: 76, height: 76, objectFit: 'cover', borderRadius: 10, flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 76, height: 76, borderRadius: 10, flexShrink: 0, background: 'rgba(183,53,184,0.06)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg style={{ width: 28, height: 28, opacity: 0.3 }} viewBox="0 0 24 24" fill="none" stroke="#B735B8" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814" />
                      </svg>
                    </div>
                  )}

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                      <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#fff', wordBreak: 'break-word', flex: 1, minWidth: 0 }}>
                        {course.title}
                      </h3>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0,
                        fontSize: 11, fontWeight: 700, color: st.color,
                        background: st.bg, border: `1px solid ${st.border}`,
                        borderRadius: 99, padding: '3px 9px', whiteSpace: 'nowrap',
                      }}>
                        {st.icon} {st.label}
                      </span>
                    </div>

                    <p style={{ margin: '4px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.55)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {course.freeForPlan ? 'Gratis con plan' : `${course.price.toFixed(2)} USDT`}
                      {' · '}
                      {course._count.videos} video{course._count.videos !== 1 ? 's' : ''}
                    </p>

                    <p style={{ margin: '3px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.42)' }}>
                      Inscrito el {new Date(e.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>

                    {e.status === 'REJECTED' && e.notes && (
                      <p style={{ margin: '6px 0 0', fontSize: 12, color: '#ef4444', background: 'rgba(239,68,68,0.08)', borderRadius: 6, padding: '5px 10px', wordBreak: 'break-word' }}>
                        Motivo: {e.notes}
                      </p>
                    )}
                  </div>
                </div>

                {/* Footer actions */}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', padding: '10px 16px', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                  {e.status === 'APPROVED' && (
                    <Link href={`/dashboard/courses/${course.id}`}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#fff', textDecoration: 'none', background: 'linear-gradient(90deg, #FF2D95 0%, #B735B8 50%, #233B8F 100%)', borderRadius: 8, padding: '7px 14px', whiteSpace: 'nowrap' }}>
                      ▶ Ver videos
                    </Link>
                  )}
                  {e.status === 'REJECTED' && (
                    <Link href={`/dashboard/courses/${course.id}`}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#f97316', textDecoration: 'none', background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)', borderRadius: 8, padding: '7px 14px', whiteSpace: 'nowrap' }}>
                      Reintentar compra
                    </Link>
                  )}
                  {e.status === 'PENDING' && (
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>
                      Comprobante en revisión por el administrador
                    </span>
                  )}
                  {e.status === 'PENDING_VERIFICATION' && (
                    <span style={{ fontSize: 12, color: '#C9A7FF' }}>
                      ⛓️ Verificando transacción en blockchain BSC...
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  </div>
  )
}
