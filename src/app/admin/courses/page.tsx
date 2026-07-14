'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { BookOpen, Plus, Edit2, Trash2, Check, X, Loader2, RefreshCw, ExternalLink, Upload } from 'lucide-react'
import OrgSelector from '@/components/OrgSelector'

//  Types 

interface LessonResource { id?: string; titulo: string; archivoUrl: string }
interface CourseVideo {
  id?: string
  title: string
  youtubeUrl: string
  videoUrl?: string | null  // video propio en Supabase (path en bucket course-videos)
  preview?: boolean         // lección de muestra (gratis sin inscribirse)
  descripcion?: string | null
  duracionSegundos?: number | null
  moduloTitulo?: string | null  // sección/módulo (las que comparten nombre se agrupan)
  recursos?: LessonResource[]
}

interface Course {
  id: string
  title: string
  description: string
  coverUrl: string | null
  price: number
  freeForPlan: boolean
  organizationId: string | null
  categoria: string | null
  nivel: string | null
  active: boolean
  createdAt: string
  videos: CourseVideo[]
  _count: { videos: number; enrollments: number }
}

interface Enrollment {
  id: string
  status: 'PENDING' | 'PENDING_VERIFICATION' | 'APPROVED' | 'REJECTED'
  paymentMethod: string
  proofUrl: string | null
  txHash: string | null
  notes: string | null
  createdAt: string
  user: { id: string; username: string; fullName: string; email: string }
  course: { id: string; title: string; price: number }
}

interface CourseModalData {
  id?: string
  title: string
  description: string
  coverUrl: string
  price: string
  freeForPlan: boolean
  organizationId: string | null
  categoria: string
  nivel: string
  videos: CourseVideo[]
}

interface CourseModalState {
  mode: 'create' | 'edit'
  data: CourseModalData
}

interface RejectModalState {
  id: string
}

//  Helpers 

const STATUS_BADGE: Record<string, string> = {
  PENDING: 'text-orange-400 bg-orange-500/10 border-orange-500/25',
  PENDING_VERIFICATION: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/25',
  APPROVED: 'text-green-400 bg-green-500/10 border-green-500/25',
  REJECTED: 'text-red-400 bg-red-500/10 border-red-500/25',
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pendiente',
  PENDING_VERIFICATION: 'Verificando cripto',
  APPROVED: 'Aprobado',
  REJECTED: 'Rechazado',
}

const EMPTY_COURSE: CourseModalData = { title: '', description: '', coverUrl: '', price: '', freeForPlan: false, organizationId: null, categoria: '', nivel: '', videos: [{ title: '', youtubeUrl: '' }] }

//  Main component 

export default function AdminCoursesPage() {
  const [activeTab, setActiveTab] = useState<'courses' | 'enrollments'>('courses')

  // Courses state
  const [courses, setCourses] = useState<Course[]>([])
  const [coursesLoading, setCoursesLoading] = useState(true)

  // Enrollments state
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [enrollmentsLoading, setEnrollmentsLoading] = useState(false)
  const [enrollmentTab, setEnrollmentTab] = useState<'ALL' | 'PENDING' | 'PENDING_VERIFICATION' | 'APPROVED' | 'REJECTED'>('PENDING')
  const [processing, setProcessing] = useState<string | null>(null)
  const [rejectModal, setRejectModal] = useState<RejectModalState | null>(null)
  const [rejectNotes, setRejectNotes] = useState('')

  // Course modal state
  const [courseModal, setCourseModal] = useState<CourseModalState | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  // Subida de video a Supabase: { índice del video, % subido } | null
  const [vidUpload, setVidUpload] = useState<{ idx: number; pct: number } | null>(null)
  const [uploadingCover, setUploadingCover] = useState(false)
  const coverInputRef = useRef<HTMLInputElement>(null)

  // Delete confirm
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  //  Fetch courses 
  const fetchCourses = useCallback(async () => {
    setCoursesLoading(true)
    const res = await fetch('/api/admin/courses')
    const data = await res.json()
    setCourses(data.courses ?? [])
    setCoursesLoading(false)
  }, [])

  //  Fetch enrollments 
  const fetchEnrollments = useCallback(async () => {
    setEnrollmentsLoading(true)
    const params = enrollmentTab !== 'ALL' ? `?status=${enrollmentTab}` : ''
    const res = await fetch(`/api/admin/courses/enrollments${params}`)
    const data = await res.json()
    setEnrollments(data.enrollments ?? [])
    setEnrollmentsLoading(false)
  }, [enrollmentTab])

  useEffect(() => { fetchCourses() }, [fetchCourses])
  useEffect(() => { if (activeTab === 'enrollments') fetchEnrollments() }, [activeTab, fetchEnrollments])

  //  Upload cover image 
  async function uploadCover(file: File) {
    setUploadingCover(true)
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/upload', { method: 'POST', body: fd })
    const data = await res.json()
    setUploadingCover(false)
    if (data.url && courseModal) {
      setCourseModal({ ...courseModal, data: { ...courseModal.data, coverUrl: data.url } })
    } else {
      setSaveError('Error al subir la imagen. Inténtalo de nuevo.')
    }
  }

  //  Save course (create / edit) 
  async function saveCourse() {
    if (!courseModal) return
    const { mode, data } = courseModal
    if (!data.title.trim() || !data.description.trim() || !data.price) {
      setSaveError('Título, descripción y precio son requeridos')
      return
    }
    setSaving(true)
    setSaveError(null)

    const videos = data.videos
      .filter(v => v.title.trim() && (v.youtubeUrl.trim() || v.videoUrl))
      .map(v => ({ ...v, youtubeUrl: v.youtubeUrl.trim(), videoUrl: v.videoUrl || null }))
    const body = { title: data.title, description: data.description, coverUrl: data.coverUrl || null, price: data.price, freeForPlan: data.freeForPlan, organizationId: data.organizationId ?? null, categoria: data.categoria || null, nivel: data.nivel || null, videos }

    const res = mode === 'create'
      ? await fetch('/api/admin/courses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      : await fetch(`/api/admin/courses/${data.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

    const json = await res.json()
    if (!res.ok) { setSaveError(json.error ?? 'Error'); setSaving(false); return }
    setSaving(false)
    setCourseModal(null)
    fetchCourses()
  }

  //  Delete course 
  async function deleteCourse() {
    if (!deleteId) return
    setDeleting(true)
    await fetch(`/api/admin/courses/${deleteId}`, { method: 'DELETE' })
    setDeleting(false)
    setDeleteId(null)
    fetchCourses()
  }

  //  Enrollment action 
  async function handleEnrollmentAction(id: string, action: 'approve' | 'reject', notes?: string) {
    setProcessing(id)
    await fetch(`/api/admin/courses/enrollments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, notes }),
    })
    setProcessing(null)
    setRejectModal(null)
    setRejectNotes('')
    fetchEnrollments()
  }

  //  Video helpers in modal 
  function setVideo(idx: number, field: keyof CourseVideo, value: any) {
    if (!courseModal) return
    const videos = [...courseModal.data.videos]
    videos[idx] = { ...videos[idx], [field]: value }
    setCourseModal({ ...courseModal, data: { ...courseModal.data, videos } })
  }

  function addVideo() {
    if (!courseModal) return
    setCourseModal({ ...courseModal, data: { ...courseModal.data, videos: [...courseModal.data.videos, { title: '', youtubeUrl: '' }] } })
  }

  function removeVideo(idx: number) {
    if (!courseModal) return
    const videos = courseModal.data.videos.filter((_, i) => i !== idx)
    setCourseModal({ ...courseModal, data: { ...courseModal.data, videos: videos.length ? videos : [{ title: '', youtubeUrl: '' }] } })
  }

  // Lee la duración (segundos) de un archivo de video local
  function readVideoDuration(file: File): Promise<number> {
    return new Promise(resolve => {
      const url = URL.createObjectURL(file)
      const v = document.createElement('video')
      v.preload = 'metadata'
      v.onloadedmetadata = () => { URL.revokeObjectURL(url); resolve(Math.round(v.duration) || 0) }
      v.onerror = () => { URL.revokeObjectURL(url); resolve(0) }
      v.src = url
    })
  }

  // Subir un video directo a Supabase (URL firmada → PUT con progreso). Guarda el path en videoUrl.
  async function uploadVideo(idx: number, file: File) {
    setSaveError(null)
    const dur = await readVideoDuration(file).catch(() => 0)
    try {
      const r = await fetch('/api/admin/courses/video-upload-url', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'No se pudo preparar la subida')

      setVidUpload({ idx, pct: 0 })
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('PUT', d.signedUrl)
        xhr.setRequestHeader('content-type', file.type || 'video/mp4')
        xhr.upload.onprogress = e => { if (e.lengthComputable) setVidUpload({ idx, pct: Math.round((e.loaded / e.total) * 100) }) }
        xhr.onload = () => (xhr.status >= 200 && xhr.status < 300) ? resolve() : reject(new Error(`Error ${xhr.status} al subir (¿el video supera el límite de Supabase?)`))
        xhr.onerror = () => reject(new Error('Error de red al subir el video'))
        xhr.send(file)
      })
      setCourseModal(prev => prev ? { ...prev, data: { ...prev.data, videos: prev.data.videos.map((vv, i) => i === idx ? { ...vv, videoUrl: d.path, duracionSegundos: dur || vv.duracionSegundos } : vv) } } : prev)
    } catch (e: any) {
      setSaveError(e?.message || 'Error al subir el video')
    } finally {
      setVidUpload(null)
    }
  }

  // Subir un archivo de recurso (PDF, etc.) y agregarlo a la lección
  async function uploadResource(idx: number, file: File) {
    setSaveError(null)
    try {
      const fd = new FormData(); fd.append('file', file)
      const r = await fetch('/api/admin/courses/resource-upload', { method: 'POST', body: fd })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'No se pudo subir el recurso')
      const nuevo: LessonResource = { titulo: file.name.replace(/\.[^.]+$/, ''), archivoUrl: d.url }
      setCourseModal(prev => prev ? { ...prev, data: { ...prev.data, videos: prev.data.videos.map((vv, i) => i === idx ? { ...vv, recursos: [...(vv.recursos || []), nuevo] } : vv) } } : prev)
    } catch (e: any) {
      setSaveError(e?.message || 'Error al subir el recurso')
    }
  }
  function removeResource(vidIdx: number, resIdx: number) {
    setCourseModal(prev => prev ? { ...prev, data: { ...prev.data, videos: prev.data.videos.map((vv, i) => i === vidIdx ? { ...vv, recursos: (vv.recursos || []).filter((_, j) => j !== resIdx) } : vv) } } : prev)
  }

  // 
  return (
  <div className="dm-page font-ui">
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 className="text-xl font-bold text-[#111827] uppercase tracking-widest">JD Academy</h1>
        <div className="h-px w-16 mt-2 rounded-full" style={{ background: 'linear-gradient(90deg, transparent, #D203DD, #FF2DF7, transparent)' }} />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid #E4E9F0', paddingBottom: 0 }}>
        {(['courses', 'enrollments'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            style={{
              padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none',
              background: 'none', borderBottom: activeTab === tab ? '2px solid #B735B8' : '2px solid transparent',
              color: activeTab === tab ? '#B735B8' : '#6B7280',
              marginBottom: -1,
            }}>
            {tab === 'courses' ? 'Cursos' : 'Inscripciones'}
          </button>
        ))}
      </div>

      {/*  COURSES TAB  */}
      {activeTab === 'courses' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <p style={{ fontSize: 13, color: '#6B7280' }}>{courses.length} curso{courses.length !== 1 ? 's' : ''}</p>
            <button
              onClick={() => { setSaveError(null); setCourseModal({ mode: 'create', data: { ...EMPTY_COURSE, videos: [{ title: '', youtubeUrl: '' }] } }) }}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, fontSize: 13, fontWeight: 700,
                background: 'linear-gradient(135deg, #D203DD 0%, #00FF88 100%)', color: '#000', border: 'none', cursor: 'pointer' }}
            >
              <Plus size={14} /> Nuevo curso
            </button>
          </div>

          {coursesLoading ? (
            <div className="flex justify-center py-16"><Loader2 size={20} className="animate-spin text-[#111827]/30" /></div>
          ) : courses.length === 0 ? (
            <div className="text-center py-16 text-[#111827]/30 text-sm">No hay cursos aún.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {courses.map(c => (
                <div key={c.id} style={{ padding: '14px 16px', borderRadius: 14,
                  background: 'rgba(255,255,255,0.03)', border: '1px solid #E4E9F0' }}>
                  {/* Top row: cover + info + actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {/* Cover thumb */}
                  <div style={{ width: 48, height: 48, borderRadius: 10, flexShrink: 0, overflow: 'hidden',
                    background: 'rgba(210,3,221,0.06)', border: '1px solid rgba(210,3,221,0.1)' }}>
                    {c.coverUrl ? (
                      <img src={c.coverUrl} alt={c.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <BookOpen size={16} className="text-[#111827]/20" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</p>
                    <p style={{ fontSize: 11, color: '#6B7280' }}>
                      {Number(c.price).toFixed(2)} USDT · {c._count.videos} vid · {c._count.enrollments} inscritos
                    </p>
                  </div>

                  {/* Actions */}
                  <button onClick={() => {
                    setSaveError(null)
                    setCourseModal({
                      mode: 'edit',
                      data: {
                        id: c.id,
                        title: c.title,
                        description: c.description,
                        coverUrl: c.coverUrl ?? '',
                        price: String(Number(c.price)),
                        freeForPlan: c.freeForPlan,
                        organizationId: c.organizationId ?? null,
                        categoria: c.categoria ?? '',
                        nivel: c.nivel ?? '',
                        videos: c.videos.length > 0
                          ? c.videos.map(v => ({ id: v.id, title: v.title, youtubeUrl: v.youtubeUrl, videoUrl: v.videoUrl, preview: v.preview, descripcion: v.descripcion, duracionSegundos: v.duracionSegundos, moduloTitulo: v.moduloTitulo, recursos: v.recursos || [] }))
                          : [{ title: '', youtubeUrl: '' }],
                      }
                    })
                  }}
                    style={{ padding: '6px 10px', borderRadius: 8, background: '#F0F3F7', border: '1px solid #E4E9F0', cursor: 'pointer' }}>
                    <Edit2 size={13} className="text-[#111827]/50" />
                  </button>
                  <button onClick={() => setDeleteId(c.id)}
                    style={{ padding: '6px 10px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', cursor: 'pointer' }}>
                    <Trash2 size={13} className="text-red-400" />
                  </button>
                  </div>{/* end top row */}

                  {/* Badges row */}
                  <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', padding: '3px 8px', borderRadius: 6,
                      color: c.active ? '#00FF88' : '#6B7280',
                      background: c.active ? 'rgba(0,255,136,0.08)' : '#F0F3F7',
                      border: `1px solid ${c.active ? 'rgba(0,255,136,0.2)' : '#E4E9F0'}` }}>
                      {c.active ? 'Activo' : 'Inactivo'}
                    </span>
                    {c.freeForPlan && (
                      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', padding: '3px 8px', borderRadius: 6,
                        color: '#B735B8', background: 'rgba(210,3,221,0.08)', border: '1px solid rgba(210,3,221,0.2)' }}>
                        Gratis / Plan
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/*  ENROLLMENTS TAB  */}
      {activeTab === 'enrollments' && (
        <div>
          {/* Sub-tabs */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 18, flexWrap: 'wrap' }}>
            {(['ALL', 'PENDING', 'PENDING_VERIFICATION', 'APPROVED', 'REJECTED'] as const).map(s => (
              <button key={s} onClick={() => setEnrollmentTab(s)}
                style={{ padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1px solid',
                  borderColor: enrollmentTab === s ? 'rgba(210,3,221,0.4)' : '#E4E9F0',
                  background: enrollmentTab === s ? 'rgba(210,3,221,0.08)' : 'transparent',
                  color: enrollmentTab === s ? '#B735B8' : '#6B7280' }}>
                {s === 'ALL' ? 'Todas' : STATUS_LABEL[s]}
              </button>
            ))}
            <button onClick={fetchEnrollments} style={{ marginLeft: 'auto', padding: '5px 10px', borderRadius: 8, background: '#F0F3F7', border: '1px solid #E4E9F0', cursor: 'pointer' }}>
              <RefreshCw size={12} className="text-[#111827]/40" />
            </button>
          </div>

          {enrollmentsLoading ? (
            <div className="flex justify-center py-16"><Loader2 size={20} className="animate-spin text-[#111827]/30" /></div>
          ) : enrollments.length === 0 ? (
            <div className="text-center py-16 text-[#111827]/30 text-sm">No hay inscripciones.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {enrollments.map(e => (
                <div key={e.id} style={{ padding: '14px 16px', borderRadius: 14,
                  background: 'rgba(255,255,255,0.03)', border: '1px solid #E4E9F0' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <p style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{e.user.fullName}</p>
                      <p style={{ fontSize: 12, color: '#6B7280' }}>{e.user.username} · {e.user.email}</p>
                      <p style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
                        Curso: <span style={{ color: '#B735B8' }}>{e.course.title}</span>
                        <span style={{ color: '#6B7280' }}> — {Number(e.course.price).toFixed(2)} USDT</span>
                      </p>
                      <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>
                        {new Date(e.createdAt).toLocaleString('es-CO')}
                      </p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span className={`text-[10px] font-bold tracking-widest px-2 py-1 rounded-md border ${STATUS_BADGE[e.status]}`}>
                        {STATUS_LABEL[e.status]}
                      </span>

                      {e.proofUrl && (
                        <a href={e.proofUrl} target="_blank" rel="noopener noreferrer"
                          style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#B735B8',
                            padding: '5px 10px', borderRadius: 8, background: 'rgba(210,3,221,0.08)', border: '1px solid rgba(210,3,221,0.2)', textDecoration: 'none' }}>
                          <ExternalLink size={11} /> Comprobante
                        </a>
                      )}
                      {e.txHash && (
                        <a href={`https://bscscan.com/tx/${e.txHash}`} target="_blank" rel="noopener noreferrer"
                          style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#F5A623',
                            padding: '5px 10px', borderRadius: 8, background: 'rgba(245,166,35,0.08)', border: '1px solid rgba(245,166,35,0.25)', textDecoration: 'none' }}>
                          <ExternalLink size={11} /> BSCScan
                        </a>
                      )}

                      {e.status === 'PENDING' && (
                        <>
                          <button
                            onClick={() => handleEnrollmentAction(e.id, 'approve')}
                            disabled={processing === e.id}
                            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                              background: 'rgba(0,255,136,0.1)', border: '1px solid rgba(0,255,136,0.25)', color: '#00FF88', cursor: 'pointer' }}>
                            {processing === e.id ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                            Aprobar
                          </button>
                          <button
                            onClick={() => { setRejectModal({ id: e.id }); setRejectNotes('') }}
                            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', cursor: 'pointer' }}>
                            <X size={11} /> Rechazar
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  {e.notes && (
                    <p style={{ fontSize: 11, color: '#6B7280', marginTop: 8 }}>Nota: {e.notes}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/*  COURSE MODAL  */}
      {courseModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 50, padding: '24px 16px', overflowY: 'auto' }}
          onClick={e => { if (e.target === e.currentTarget) setCourseModal(null) }}>
          <div style={{ background: '#0d0d15', border: '1px solid #E4E9F0', borderRadius: 20,
            padding: 'clamp(16px, 5vw, 28px)', width: '100%', maxWidth: 540, boxSizing: 'border-box' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 20 }}>
              {courseModal.mode === 'create' ? 'Nuevo curso' : 'Editar curso'}
            </h3>

            {/* Fields */}
            {[
              { label: 'Título', key: 'title', placeholder: 'Nombre del curso' },
              { label: 'Descripción', key: 'description', placeholder: 'Descripción detallada', multiline: true },
              { label: 'Precio (USDT)', key: 'price', placeholder: '0.00' },
            ].map(({ label, key, placeholder, multiline }) => (
              <div key={key} style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 5 }}>{label}</label>
                {multiline ? (
                  <textarea
                    value={(courseModal.data as any)[key]}
                    onChange={e => setCourseModal({ ...courseModal, data: { ...courseModal.data, [key]: e.target.value } })}
                    placeholder={placeholder}
                    rows={3}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 10, fontSize: 13, color: '#111827',
                      background: '#F0F3F7', border: '1px solid #E4E9F0', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
                  />
                ) : (
                  <input
                    type={key === 'price' ? 'number' : 'text'}
                    value={(courseModal.data as any)[key]}
                    onChange={e => setCourseModal({ ...courseModal, data: { ...courseModal.data, [key]: e.target.value } })}
                    placeholder={placeholder}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 10, fontSize: 13, color: '#111827',
                      background: '#F0F3F7', border: '1px solid #E4E9F0', outline: 'none', boxSizing: 'border-box' }}
                  />
                )}
              </div>
            ))}

            {/* Cover image upload */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 5 }}>Portada del curso</label>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={e => { const f = e.target.files?.[0]; if (f) uploadCover(f) }}
              />
              {courseModal.data.coverUrl ? (
                <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', height: 120 }}>
                  <img src={courseModal.data.coverUrl} alt="portada" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button
                    onClick={() => setCourseModal({ ...courseModal, data: { ...courseModal.data, coverUrl: '' } })}
                    style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(15,23,42,0.10)', border: 'none', borderRadius: 6, cursor: 'pointer', padding: '4px 6px' }}>
                    <X size={12} className="text-[#111827]" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => coverInputRef.current?.click()}
                  disabled={uploadingCover}
                  style={{ width: '100%', height: 90, borderRadius: 10, border: '1.5px dashed #E4E9F0',
                    background: 'rgba(255,255,255,0.03)', cursor: uploadingCover ? 'wait' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#6B7280', fontSize: 13 }}>
                  {uploadingCover
                    ? <><Loader2 size={15} className="animate-spin" /> Subiendo...</>
                    : <><Upload size={15} /> Subir imagen desde computadora</>}
                </button>
              )}
            </div>

            {/* Categoría + Nivel */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 5 }}>Categoría</label>
                <input
                  type="text"
                  list="course-categorias"
                  value={courseModal.data.categoria}
                  onChange={e => setCourseModal({ ...courseModal, data: { ...courseModal.data, categoria: e.target.value } })}
                  placeholder="Ej. Ventas, Mindset, Producto"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 10, fontSize: 13, color: '#111827',
                    background: '#F0F3F7', border: '1px solid #E4E9F0', outline: 'none', boxSizing: 'border-box' }}
                />
                <datalist id="course-categorias">
                  {Array.from(new Set(courses.map(c => c.categoria).filter(Boolean))).map(cat => <option key={cat as string} value={cat as string} />)}
                </datalist>
              </div>
              <div style={{ width: 150 }}>
                <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 5 }}>Nivel</label>
                <select
                  value={courseModal.data.nivel}
                  onChange={e => setCourseModal({ ...courseModal, data: { ...courseModal.data, nivel: e.target.value } })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 10, fontSize: 13, color: '#111827',
                    background: '#F0F3F7', border: '1px solid #E4E9F0', outline: 'none', boxSizing: 'border-box' }}>
                  <option value="" style={{ background: '#fff', color: '#111827' }}>—</option>
                  <option value="Principiante" style={{ background: '#fff', color: '#111827' }}>Principiante</option>
                  <option value="Intermedio" style={{ background: '#fff', color: '#111827' }}>Intermedio</option>
                  <option value="Avanzado" style={{ background: '#fff', color: '#111827' }}>Avanzado</option>
                </select>
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <OrgSelector value={courseModal.data.organizationId} onChange={v => setCourseModal({ ...courseModal, data: { ...courseModal.data, organizationId: v } })} />
            </div>

            {/* Free for plan toggle */}
            <div style={{ marginBottom: 16 }}>
              <button
                type="button"
                onClick={() => setCourseModal({ ...courseModal, data: { ...courseModal.data, freeForPlan: !courseModal.data.freeForPlan } })}
                style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '12px 14px', borderRadius: 12,
                  background: courseModal.data.freeForPlan ? 'rgba(0,255,136,0.08)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${courseModal.data.freeForPlan ? 'rgba(0,255,136,0.25)' : 'rgba(255,255,255,0.08)'}`,
                  cursor: 'pointer', textAlign: 'left' }}>
                {/* Switch */}
                <div style={{ width: 36, height: 20, borderRadius: 10, flexShrink: 0, position: 'relative', transition: 'background 0.2s',
                  background: courseModal.data.freeForPlan ? '#00FF88' : '#E4E9F0' }}>
                  <div style={{ position: 'absolute', top: 3, left: courseModal.data.freeForPlan ? 19 : 3, width: 14, height: 14,
                    borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: courseModal.data.freeForPlan ? '#00FF88' : '#fff', marginBottom: 1 }}>
                    Gratis para usuarios con plan
                  </p>
                  <p style={{ fontSize: 11, color: '#6B7280' }}>
                    {courseModal.data.freeForPlan
                      ? 'El acceso se aprueba automáticamente para usuarios con cualquier plan activo'
                      : 'Los usuarios pagan con USDT (cripto, auto-verificado) o comprobante manual'}
                  </p>
                </div>
              </button>
            </div>

            {/* Videos */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <label style={{ fontSize: 12, color: '#6B7280' }}>Videos del curso</label>
                <button onClick={addVideo}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#D203DD', background: 'none', border: 'none', cursor: 'pointer' }}>
                  <Plus size={12} /> Agregar
                </button>
              </div>
              {courseModal.data.videos.map((v, idx) => {
                const up = vidUpload?.idx === idx ? vidUpload.pct : null
                const hasVideo = !!v.videoUrl
                return (
                  <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 10, alignItems: 'flex-start', padding: 8, borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <input type="text" value={v.title} onChange={e => setVideo(idx, 'title', e.target.value)}
                        placeholder="Título del video"
                        style={{ width: '100%', padding: '8px 10px', borderRadius: 8, fontSize: 12, color: '#fff',
                          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', outline: 'none', marginBottom: 6, boxSizing: 'border-box' }} />
                      <input type="text" value={v.moduloTitulo || ''} onChange={e => setVideo(idx, 'moduloTitulo', e.target.value)}
                        placeholder="Sección / Módulo (opcional, ej. Introducción)"
                        style={{ width: '100%', padding: '7px 10px', borderRadius: 8, fontSize: 11, color: 'rgba(255,255,255,0.85)', marginBottom: 6,
                          background: 'rgba(210,3,221,0.05)', border: '1px solid rgba(210,3,221,0.2)', outline: 'none', boxSizing: 'border-box' }} />
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: v.preview ? '#00FF88' : '#6B7280', cursor: 'pointer', marginBottom: 6 }}>
                        <input type="checkbox" checked={!!v.preview} onChange={e => setVideo(idx, 'preview', e.target.checked)} />
                        🎁 Gratis (preview) — se puede ver sin inscribirse
                      </label>

                      {/* Subir video propio a Supabase */}
                      {hasVideo ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#00FF88', background: 'rgba(0,255,136,0.08)', border: '1px solid rgba(0,255,136,0.2)', borderRadius: 8, padding: '8px 10px' }}>
                          <Check size={13} /> <span style={{ flex: 1 }}>Video subido</span>
                          <button onClick={() => setVideo(idx, 'videoUrl', '')} style={{ fontSize: 11, color: '#6B7280', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>cambiar</button>
                        </div>
                      ) : up !== null ? (
                        <div style={{ fontSize: 11, color: '#6B7280', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '8px 10px' }}>
                          Subiendo… {up}%
                          <div style={{ height: 4, borderRadius: 4, background: '#E4E9F0', marginTop: 6, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${up}%`, background: 'linear-gradient(90deg,#D203DD,#00FF88)', transition: 'width 0.2s' }} />
                          </div>
                        </div>
                      ) : (
                        <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#D203DD', background: 'rgba(210,3,221,0.06)', border: '1px dashed rgba(210,3,221,0.35)', borderRadius: 8, padding: '9px 10px', cursor: 'pointer' }}>
                          <Upload size={14} /> Subir video
                          <input type="file" accept="video/*" style={{ display: 'none' }}
                            onChange={e => { const f = e.target.files?.[0]; if (f) uploadVideo(idx, f); e.target.value = '' }} />
                        </label>
                      )}

                      {/* Alternativa: link de Vimeo (solo si no subió video propio) */}
                      {!hasVideo && (
                        <input type="text" value={v.youtubeUrl} onChange={e => setVideo(idx, 'youtubeUrl', e.target.value)}
                          placeholder="o pegá un link de Vimeo (opcional)"
                          style={{ width: '100%', padding: '8px 10px', borderRadius: 8, fontSize: 12, color: '#fff', marginTop: 6,
                            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', outline: 'none', boxSizing: 'border-box' }} />
                      )}

                      {/* Notas de la lección */}
                      <textarea value={v.descripcion || ''} onChange={e => setVideo(idx, 'descripcion', e.target.value)}
                        placeholder="Notas de la lección (opcional)" rows={2}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: 8, fontSize: 12, color: '#fff', marginTop: 6,
                          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', outline: 'none', boxSizing: 'border-box', resize: 'vertical' }} />

                      {/* Recursos descargables */}
                      <div style={{ marginTop: 6 }}>
                        {(v.recursos || []).map((r, j) => (
                          <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'rgba(255,255,255,0.82)', background: 'rgba(255,255,255,0.04)', borderRadius: 6, padding: '5px 8px', marginBottom: 4 }}>
                            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📎 {r.titulo}</span>
                            <button onClick={() => removeResource(idx, j)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 12 }}>✕</button>
                          </div>
                        ))}
                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#D203DD', cursor: 'pointer' }}>
                          <Plus size={11} /> Agregar recurso (PDF, etc.)
                          <input type="file" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) uploadResource(idx, f); e.target.value = '' }} />
                        </label>
                      </div>
                    </div>
                    <button onClick={() => removeVideo(idx)}
                      style={{ padding: '6px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', cursor: 'pointer', marginTop: 2 }}>
                      <X size={13} className="text-red-400" />
                    </button>
                  </div>
                )
              })}
              <p style={{ fontSize: 10.5, color: '#6B7280', marginTop: 2 }}>Subí el video (queda en tu Supabase) o pegá un Vimeo. Si el video es muy pesado, comprimilo a 1080p.</p>
            </div>

            {saveError && <p style={{ fontSize: 12, color: '#ef4444', marginBottom: 10 }}>{saveError}</p>}

            <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
              <button onClick={() => setCourseModal(null)}
                style={{ flex: 1, padding: '10px 0', borderRadius: 10, fontSize: 13, fontWeight: 600,
                  background: '#F0F3F7', border: '1px solid #E4E9F0', color: '#6B7280', cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={saveCourse} disabled={saving}
                style={{ flex: 2, padding: '10px 0', borderRadius: 10, fontSize: 13, fontWeight: 700,
                  background: saving ? 'rgba(210,3,221,0.3)' : 'linear-gradient(135deg, #D203DD 0%, #00FF88 100%)',
                  border: 'none', color: '#000', cursor: saving ? 'not-allowed' : 'pointer' }}>
                {saving ? 'Guardando...' : courseModal.mode === 'create' ? 'Crear curso' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/*  REJECT MODAL  */}
      {rejectModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '0 16px' }}
          onClick={e => { if (e.target === e.currentTarget) setRejectModal(null) }}>
          <div style={{ background: '#0d0d15', border: '1px solid #E4E9F0', borderRadius: 18, padding: 24, width: '100%', maxWidth: 400 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 12 }}>Rechazar inscripción</h3>
            <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 6 }}>Motivo (opcional)</label>
            <textarea value={rejectNotes} onChange={e => setRejectNotes(e.target.value)} rows={3} placeholder="Ej: Comprobante no válido"
              style={{ width: '100%', padding: '9px 12px', borderRadius: 10, fontSize: 13, color: '#111827',
                background: '#F0F3F7', border: '1px solid #E4E9F0', outline: 'none', resize: 'none', boxSizing: 'border-box' }} />
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button onClick={() => setRejectModal(null)}
                style={{ flex: 1, padding: '9px 0', borderRadius: 10, fontSize: 13, fontWeight: 600,
                  background: '#F0F3F7', border: '1px solid #E4E9F0', color: '#6B7280', cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={() => handleEnrollmentAction(rejectModal.id, 'reject', rejectNotes)}
                disabled={!!processing}
                style={{ flex: 2, padding: '9px 0', borderRadius: 10, fontSize: 13, fontWeight: 700,
                  background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', cursor: 'pointer' }}>
                Rechazar
              </button>
            </div>
          </div>
        </div>
      )}

      {/*  DELETE CONFIRM  */}
      {deleteId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '0 16px' }}
          onClick={e => { if (e.target === e.currentTarget) setDeleteId(null) }}>
          <div style={{ background: '#0d0d15', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 18, padding: 24, width: '100%', maxWidth: 360, textAlign: 'center' }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 8 }}>¿Eliminar curso?</p>
            <p style={{ fontSize: 12, color: '#6B7280', marginBottom: 20 }}>
              Se eliminarán todos sus videos e inscripciones. Esta acción no se puede deshacer.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setDeleteId(null)}
                style={{ flex: 1, padding: '9px 0', borderRadius: 10, fontSize: 13, fontWeight: 600,
                  background: '#F0F3F7', border: '1px solid #E4E9F0', color: '#6B7280', cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={deleteCourse} disabled={deleting}
                style={{ flex: 1, padding: '9px 0', borderRadius: 10, fontSize: 13, fontWeight: 700,
                  background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', cursor: deleting ? 'not-allowed' : 'pointer' }}>
                {deleting ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
  )
}
