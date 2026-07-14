'use client'

import { useEffect, useState, useRef, Fragment } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { PaymentGateway } from '@/components/PaymentGateway'

const DG = 'linear-gradient(135deg, #FF2D95 0%, #B735B8 48%, #233B8F 100%)'

interface CourseVideo {
  id: string
  title: string
  kind?: 'supabase' | 'vimeo'
  playUrl?: string | null
  youtubeUrl: string
  order: number
  unlocked: boolean
  percent: number
  completed: boolean
  posicionSegundos?: number
  isPreview?: boolean
  moduloTitulo?: string | null
  descripcion?: string | null
  duracionSegundos?: number | null
  recursos?: { id: string; titulo: string; archivoUrl: string }[]
}

interface Enrollment {
  id: string
  status: 'PENDING' | 'PENDING_VERIFICATION' | 'APPROVED' | 'REJECTED'
  proofUrl: string | null
  notes: string | null
}

interface Course {
  id: string
  title: string
  description: string
  coverUrl: string | null
  price: number
  freeForPlan: boolean
  videosCount: number
  videos: CourseVideo[]
  locked: boolean
  enrollment: Enrollment | null
  viewerName?: string
}

function getVimeoEmbedUrl(url: string): string {
  const match = url.match(/vimeo\.com\/(\d+)/)
  if (match) return `https://player.vimeo.com/video/${match[1]}?badge=0&autopause=0&player_id=0&app_id=58479`
  return url
}

function fmtTime(sec: number): string {
  const s = Math.max(0, Math.floor(sec))
  const m = Math.floor(s / 60)
  return `${m}:${String(s % 60).padStart(2, '0')}`
}

export default function CourseDetailPage() {
  const { courseId } = useParams<{ courseId: string }>()
  const [course, setCourse] = useState<Course | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [paymentQrUrl, setPaymentQrUrl] = useState<string | null>(null)
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(d => setPaymentQrUrl(d.settings?.PAYMENT_QR_URL || null)).catch(() => {})
  }, [])

  // Vimeo player refs and tracking
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const vimeoPlayer = useRef<any>(null)
  const reportedRef = useRef<Set<string>>(new Set())
  const [completedVideos, setCompletedVideos] = useState<Set<string>>(new Set())
  // Reproductor de video propio (Supabase): src fijo al seleccionar (no se reinicia en refrescos silenciosos)
  const videoElRef = useRef<HTMLVideoElement | null>(null)
  const lastSaveRef = useRef(0)
  const [player, setPlayer] = useState<{ id: string; kind: string; src: string | null; pos: number } | null>(null)

  // Payment modal state
  const [showModal, setShowModal] = useState(false)
  const [payTab, setPayTab] = useState<'CRYPTO' | 'MANUAL'>('CRYPTO')

  // Manual proof state
  const [proofUrl, setProofUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const proofInputRef = useRef<HTMLInputElement>(null)

  async function uploadProof(file: File) {
    setUploading(true)
    setSubmitError(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (data.url) setProofUrl(data.url)
      else setSubmitError('Error al subir la imagen. Inténtalo de nuevo.')
    } catch {
      setSubmitError('Error al subir la imagen. Inténtalo de nuevo.')
    } finally {
      setUploading(false)
    }
  }

  async function loadCourse(silent = false) {
    if (!silent) setLoading(true)
    const res = await fetch(`/api/courses/${courseId}`)
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Error'); if (!silent) setLoading(false); return }
    setCourse(data.course)
    const serverCompleted = new Set<string>(
      (data.course.videos as CourseVideo[]).filter(v => v.completed).map(v => v.id)
    )
    setCompletedVideos(serverCompleted)
    // Auto-select first unlocked video (only on initial load)
    if (!silent) {
      // Continuar donde quedó: el último con avance pero sin completar; si no, el primero desbloqueado
      const vids = data.course.videos as CourseVideo[]
      const resume = vids.find(v => v.unlocked && (v.percent ?? 0) > 0 && (v.percent ?? 0) < 95)
      const firstUnlocked = vids.find(v => v.unlocked)
      const target = resume || firstUnlocked
      if (target) selectVideo(target)
    }
    if (!silent) setLoading(false)
  }

  useEffect(() => { loadCourse() }, [courseId])

  // Block copy/inspect shortcuts
  useEffect(() => {
    const block = (e: Event) => e.preventDefault()
    const blockKeys = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && ['c', 'u', 's', 'a', 'p'].includes(e.key.toLowerCase())) e.preventDefault()
    }
    document.addEventListener('contextmenu', block)
    document.addEventListener('keydown', blockKeys)
    return () => {
      document.removeEventListener('contextmenu', block)
      document.removeEventListener('keydown', blockKeys)
    }
  }, [])

  // Init Vimeo player when selected video changes
  useEffect(() => {
    if (!selectedVideoId || !course || course.enrollment?.status !== 'APPROVED') return

    function initPlayer() {
      const Vimeo = (window as any).Vimeo
      if (!Vimeo || !iframeRef.current) return

      // Destroy previous player
      if (vimeoPlayer.current) {
        try { vimeoPlayer.current.destroy() } catch {}
        vimeoPlayer.current = null
      }

      const player = new Vimeo.Player(iframeRef.current)
      vimeoPlayer.current = player

      const vidId = selectedVideoId as string
      player.on('timeupdate', (data: { percent: number }) => {
        const pct = Math.round(data.percent * 100)
        if (pct >= 95 && !reportedRef.current.has(vidId)) {
          reportedRef.current.add(vidId)
          reportProgress(vidId, pct)
        }
      })
    }

    if ((window as any).Vimeo) {
      // Small delay to let iframe render
      const t = setTimeout(initPlayer, 300)
      return () => clearTimeout(t)
    } else {
      if (!document.querySelector('script[data-vimeo-sdk]')) {
        const script = document.createElement('script')
        script.src = 'https://player.vimeo.com/api/player.js'
        script.setAttribute('data-vimeo-sdk', '1')
        script.onload = () => setTimeout(initPlayer, 300)
        document.head.appendChild(script)
      } else {
        const t = setTimeout(initPlayer, 1500)
        return () => clearTimeout(t)
      }
    }
  }, [selectedVideoId, course?.enrollment?.status])

  async function reportProgress(videoId: string, percent: number, pos?: number) {
    // Solo se trackea progreso/desbloqueo para inscritos aprobados (no para vistas de preview)
    if (course?.enrollment?.status !== 'APPROVED') return
    try {
      const res = await fetch(`/api/courses/${courseId}/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId, percent, posicionSegundos: pos }),
      })
      // Solo al COMPLETAR refrescamos (desbloquea + trae la URL del siguiente). Guardar posición no recarga.
      if (res.ok && percent >= 95) {
        setCompletedVideos(prev => new Set(prev).add(videoId))
        await loadCourse(true)
      }
    } catch {}
  }

  // Selecciona un video: fija el src del reproductor (no se reinicia en refrescos silenciosos)
  function selectVideo(v: CourseVideo) {
    if (!v.unlocked) return
    setSelectedVideoId(v.id)
    setPlayer({ id: v.id, kind: v.kind ?? 'vimeo', src: v.playUrl ?? v.youtubeUrl ?? null, pos: v.posicionSegundos ?? 0 })
    reportedRef.current.delete(v.id)
  }

  // <video> propio: guarda avance (throttle 5s) y posición; marca completado al 95%
  function handleVideoTime(el: HTMLVideoElement) {
    if (!el.duration || !player) return
    const pct = Math.min(100, Math.round((el.currentTime / el.duration) * 100))
    const now = Date.now()
    if (now - lastSaveRef.current > 5000) {
      lastSaveRef.current = now
      reportProgress(player.id, pct, Math.floor(el.currentTime))
    }
    if (pct >= 95 && !reportedRef.current.has(player.id)) {
      reportedRef.current.add(player.id)
      reportProgress(player.id, pct, Math.floor(el.currentTime))
    }
  }
  function saveVideoNow(el: HTMLVideoElement | null) {
    if (!el || !el.duration || !player) return
    const pct = Math.min(100, Math.round((el.currentTime / el.duration) * 100))
    reportProgress(player.id, pct, Math.floor(el.currentTime))
  }

  // Marcar la lección actual como vista (completa y desbloquea la siguiente)
  function markWatched() {
    if (!player) return
    reportedRef.current.add(player.id)
    setCompletedVideos(prev => new Set(prev).add(player.id))
    reportProgress(player.id, 100, videoElRef.current ? Math.floor(videoElRef.current.currentTime) : undefined)
  }

  // Genera y descarga el certificado: dibuja la plantilla oficial (imagen) y
  // superpone los datos dinámicos: NOMBRE del alumno, NOMBRE del curso y la
  // FECHA de finalización. El resto del diseño viene de la imagen.
  async function downloadCertificate() {
    if (!course) return
    const tpl = new Image(); tpl.crossOrigin = 'anonymous'
    await new Promise<void>(res => { tpl.onload = () => res(); tpl.onerror = () => res(); tpl.src = '/certificado-plantilla.png' })
    const W = tpl.naturalWidth || 1698, H = tpl.naturalHeight || 1276
    const canvas = document.createElement('canvas')
    canvas.width = W; canvas.height = H
    const ctx = canvas.getContext('2d'); if (!ctx) return
    ctx.drawImage(tpl, 0, 0, W, H)
    const FONT = 'Georgia, "Times New Roman", serif'

    // 1) Nombre del alumno (centrado en x≈873, centro y≈614)
    const name = (course.viewerName || 'Alumno').trim()
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#14112A'
    let ns = 96; ctx.font = `bold ${ns}px ${FONT}`
    while (ctx.measureText(name).width > 1180 && ns > 44) { ns -= 4; ctx.font = `bold ${ns}px ${FONT}` }
    ctx.fillText(name, 873, 614)

    // 2) Nombre del curso (centrado en x≈843, centro y≈839) — gradiente morado→magenta
    const title = course.title.toUpperCase()
    let cs = 58; ctx.font = `bold ${cs}px ${FONT}`
    while (ctx.measureText(title).width > 820 && cs > 28) { cs -= 3; ctx.font = `bold ${cs}px ${FONT}` }
    const tw = ctx.measureText(title).width
    const cgrad = ctx.createLinearGradient(843 - tw / 2, 0, 843 + tw / 2, 0)
    cgrad.addColorStop(0, '#5E5096'); cgrad.addColorStop(1, '#9E478E')
    ctx.fillStyle = cgrad
    ctx.fillText(title, 843, 839)

    // 3) Fecha de finalización (línea inferior centrada en x≈838)
    const dateStr = new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })
    const p1 = 'MY DIAMOND', p2 = ` Academy · ${dateStr}`
    ctx.textAlign = 'left'; ctx.textBaseline = 'top'
    ctx.font = `bold 30px ${FONT}`; const w1 = ctx.measureText(p1).width
    ctx.font = `30px ${FONT}`; const w2 = ctx.measureText(p2).width
    const dsx = 838 - (w1 + w2) / 2
    ctx.font = `bold 30px ${FONT}`; ctx.fillStyle = '#3B2C7A'; ctx.fillText(p1, dsx, 1168)
    ctx.font = `30px ${FONT}`; ctx.fillStyle = '#555562'; ctx.fillText(p2, dsx + w1, 1168)

    const a = document.createElement('a')
    a.href = canvas.toDataURL('image/png')
    a.download = `certificado-${course.title.replace(/\s+/g, '-').toLowerCase()}.png`
    document.body.appendChild(a); a.click(); a.remove()
  }

  // Guardar la posición al ocultar la pestaña o salir de la página
  useEffect(() => {
    const onHide = () => { if (document.visibilityState === 'hidden') saveVideoNow(videoElRef.current) }
    document.addEventListener('visibilitychange', onHide)
    return () => { document.removeEventListener('visibilitychange', onHide); saveVideoNow(videoElRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player?.id])

  // Manual enroll submit
  async function handleManualEnroll() {
    if (!proofUrl.trim()) { setSubmitError('Sube el comprobante de pago primero'); return }
    setSubmitting(true)
    setSubmitError(null)
    const res = await fetch(`/api/courses/${courseId}/enroll`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentMethod: 'MANUAL', proofUrl: proofUrl.trim() }),
    })
    const data = await res.json()
    if (!res.ok) { setSubmitError(data.error ?? 'Error al enviar'); setSubmitting(false); return }
    setShowModal(false)
    setProofUrl('')
    setSubmitting(false)
    loadCourse()
  }

  async function handleCryptoPayment(txHash: string): Promise<'approved' | 'pending_verification'> {
    const res = await fetch(`/api/courses/${courseId}/enroll`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentMethod: 'CRYPTO', txHash }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Error al registrar el pago')
    return data.status === 'APPROVED' ? 'approved' : 'pending_verification'
  }

  async function handleFreeEnroll() {
    setSubmitting(true)
    setSubmitError(null)
    const res = await fetch(`/api/courses/${courseId}/enroll`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentMethod: 'MANUAL', proofUrl: '' }),
    })
    const data = await res.json()
    setSubmitting(false)
    if (!res.ok) { setSubmitError(data.error ?? 'Error'); return }
    loadCourse()
  }

  function closeModal() {
    setShowModal(false)
    setProofUrl('')
    setSubmitError(null)
    setPayTab('CRYPTO')
  }

  if (loading) {
    return (
      <div className="px-4 sm:px-6 pt-6 max-w-screen-2xl mx-auto min-h-[60vh] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#B735B8', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  if (error || !course) {
    return (
      <div className="px-4 sm:px-6 pt-6 max-w-screen-2xl mx-auto">
        <Link href="/dashboard/courses" style={{ fontSize: 13, color: '#6B7280', textDecoration: 'none' }}>← Volver a cursos</Link>
        <p className="text-red-400 text-sm mt-4">{error ?? 'Curso no encontrado'}</p>
      </div>
    )
  }

  const { enrollment } = course
  const isApproved = enrollment?.status === 'APPROVED'
  const isPending = enrollment?.status === 'PENDING'
  const isPendingVerification = enrollment?.status === 'PENDING_VERIFICATION'
  const isRejected = enrollment?.status === 'REJECTED'
  const isLocked = course.locked

  const selectedVideo = course.videos.find(v => v.id === selectedVideoId) ?? null
  const selectedIdx = course.videos.findIndex(v => v.id === selectedVideoId)
  const isVideoDone = (v: CourseVideo) => completedVideos.has(v.id) || v.completed
  const doneCount = course.videos.filter(isVideoDone).length
  const coursePct = course.videos.length ? Math.round((doneCount / course.videos.length) * 100) : 0
  const prevVideo = selectedIdx > 0 ? course.videos[selectedIdx - 1] : null
  const nextVideo = selectedIdx >= 0 && selectedIdx < course.videos.length - 1 ? course.videos[selectedIdx + 1] : null

  return (
  <div className="dm-page font-ui">
    <div className="px-4 sm:px-6 pt-6 pb-12 max-w-7xl mx-auto" style={{ userSelect: 'none', WebkitUserSelect: 'none' }}>
      <Link href="/dashboard/courses" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#6B7280', textDecoration: 'none', marginBottom: 20 }}>
        ← Volver a cursos
      </Link>

      {course.coverUrl && !isApproved && (
        <div style={{ borderRadius: 16, overflow: 'hidden', marginBottom: 24, maxHeight: 300 }}>
          <img src={course.coverUrl} alt={course.title} style={{ width: '100%', objectFit: 'cover' }} />
        </div>
      )}

      {/* Title & price */}
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#111827', marginBottom: 8 }}>{course.title}</h1>
        <p style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.6, marginBottom: 16 }}>{course.description}</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 24, fontWeight: 900, ...(course.freeForPlan ? { background: DG, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' } : { color: '#C9A7FF' }) }}>
            {course.freeForPlan ? 'GRATIS' : `${course.price.toFixed(2)} USDT`}
          </span>
          {course.freeForPlan && (
            <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', background: DG, padding: '3px 10px', borderRadius: 6 }}>
              Incluido en tu plan
            </span>
          )}
          {!course.freeForPlan && (
            <span style={{ fontSize: 11, fontWeight: 600, color: '#C9A7FF', background: 'rgba(245,166,35,0.1)', border: '1px solid rgba(245,166,35,0.2)', padding: '3px 8px', borderRadius: 6 }}>
              BEP-20 · BSC
            </span>
          )}
          <span style={{ fontSize: 12, color: '#9CA3AF' }}>{course.videosCount} video{course.videosCount !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Locked — no plan */}
      {isLocked && (
        <div style={{ padding: '16px 18px', borderRadius: 14, marginBottom: 20, background: 'linear-gradient(180deg, #0B1B2B 0%, #081624 60%, #050B14 100%)', border: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>
          <p style={{ fontSize: 22, marginBottom: 8 }}>🔒</p>
          <p style={{ fontSize: 14, color: '#fff', fontWeight: 700, marginBottom: 6 }}>Curso no disponible</p>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', marginBottom: 14 }}>Necesitas un plan activo para acceder a los cursos.</p>
          <Link href="/dashboard/planes" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 10, background: 'linear-gradient(135deg, #FF2D95 0%, #B735B8 48%, #233B8F 100%)', color: '#fff', fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>
            Ver planes
          </Link>
        </div>
      )}

      {/* Status banners */}
      {!isLocked && isPending && (
        <div style={{ padding: '12px 16px', borderRadius: 12, marginBottom: 20, background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)' }}>
          <p style={{ fontSize: 13, color: '#f97316', fontWeight: 600 }}>⏳ Comprobante en revisión</p>
          <p style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>Tu comprobante está siendo verificado. Recibirás acceso una vez aprobado.</p>
        </div>
      )}
      {!isLocked && isPendingVerification && (
        <div style={{ padding: '12px 16px', borderRadius: 12, marginBottom: 20, background: 'rgba(245,166,35,0.08)', border: '1px solid rgba(245,166,35,0.25)' }}>
          <p style={{ fontSize: 13, color: '#C9A7FF', fontWeight: 600 }}>⛓️ Verificando en blockchain...</p>
          <p style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>Tu transacción fue enviada. Estamos confirmando los bloques en la red BSC. Se activará en minutos.</p>
        </div>
      )}
      {!isLocked && isRejected && (
        <div style={{ padding: '12px 16px', borderRadius: 12, marginBottom: 20, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <p style={{ fontSize: 13, color: '#ef4444', fontWeight: 600 }}>✕ Solicitud rechazada</p>
          {enrollment.notes && <p style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>{enrollment.notes}</p>}
          <button onClick={() => setShowModal(true)} style={{ marginTop: 8, fontSize: 12, color: '#FF096C', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>
            Volver a intentar
          </button>
        </div>
      )}

      {/* CTA buttons */}
      {!isLocked && !enrollment && (
        course.freeForPlan ? (
          <button onClick={handleFreeEnroll} disabled={submitting}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 24px', borderRadius: 12, fontWeight: 700, fontSize: 14, background: submitting ? 'rgba(183,53,184,0.4)' : 'linear-gradient(90deg, #FF2D95 0%, #B735B8 50%, #233B8F 100%)', color: '#fff', border: 'none', cursor: submitting ? 'not-allowed' : 'pointer', marginBottom: 28 }}>
            {submitting ? 'Activando...' : '✓ Acceder gratis con mi plan'}
          </button>
        ) : (
          <button onClick={() => setShowModal(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 24px', borderRadius: 12, fontWeight: 700, fontSize: 14, background: 'linear-gradient(90deg, #FF2D95 0%, #B735B8 50%, #233B8F 100%)', color: '#fff', border: 'none', cursor: 'pointer', marginBottom: 28 }}>
            ₮ Comprar con USDT — {course.price.toFixed(2)} USDT
          </button>
        )
      )}
      {submitError && !showModal && <p style={{ fontSize: 12, color: '#ef4444', marginBottom: 16 }}>{submitError}</p>}

      {/* ── PLAYER + PLAYLIST ── */}
      {course.videos.length > 0 && (isApproved || course.videos.some(v => v.unlocked)) && (
        <>
          {/* Progreso del curso (solo para inscritos) */}
          {isApproved && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#6B7280' }}>Tu progreso</span>
              <span style={{ fontSize: 12, fontWeight: 800, background: DG, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{doneCount} de {course.videos.length} · {coursePct}%</span>
            </div>
            <div style={{ height: 7, borderRadius: 7, background: 'rgba(8,22,36,0.1)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${coursePct}%`, borderRadius: 7, background: 'linear-gradient(90deg,#FF2D95,#B735B8,#233B8F)', transition: 'width 0.3s' }} />
            </div>
            {coursePct === 100 && (
              <div style={{ marginTop: 12, padding: '14px 16px', borderRadius: 14, background: 'rgba(99,102,190,0.07)', border: '1px solid rgba(99,102,190,0.22)', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 22 }}>🎓</span>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <p style={{ fontSize: 14, fontWeight: 800, background: 'linear-gradient(135deg, #B735B8 0%, #233B8F 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>¡Completaste el curso!</p>
                  <p style={{ fontSize: 12, color: '#6B7280', margin: '2px 0 0' }}>Descargá tu certificado de finalización.</p>
                </div>
                <button onClick={downloadCertificate} style={{ padding: '10px 18px', borderRadius: 10, fontSize: 13, fontWeight: 700, color: '#fff', background: 'linear-gradient(90deg,#FF2D95,#B735B8,#233B8F)', border: 'none', cursor: 'pointer' }}>
                  🎓 Descargar certificado
                </button>
              </div>
            )}
          </div>
          )}

          <div className="grid lg:grid-cols-[1fr_360px] gap-4 items-start">
            {/* Columna: reproductor + navegación */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
          {/* Player activo */}
          {selectedVideo && (
            <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', background: 'linear-gradient(180deg, #0B1B2B 0%, #081624 60%, #050B14 100%)' }}>
              {/* Título del video activo */}
              <div style={{ background: 'rgba(255,255,255,0.04)', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#FF096C', background: 'rgba(255,9,108,0.12)', border: '1px solid rgba(255,9,108,0.25)', padding: '2px 8px', borderRadius: 6 }}>
                  {selectedIdx + 1} / {course.videos.length}
                </span>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#fff', margin: 0, flex: 1 }}>{selectedVideo.title}</p>
                {(completedVideos.has(selectedVideo.id) || selectedVideo.completed) && (
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', background: DG, padding: '2px 8px', borderRadius: 6, whiteSpace: 'nowrap' }}>
                    ✓ Completado
                  </span>
                )}
              </div>
              {/* Aviso "continuá donde quedaste" (video propio, con posición guardada) */}
              {player?.kind === 'supabase' && (player.pos || 0) > 3 && !(completedVideos.has(selectedVideo.id) || selectedVideo.completed) && (
                <div style={{ background: 'rgba(255,9,108,0.1)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '6px 16px', fontSize: 11, color: '#FF096C', display: 'flex', alignItems: 'center', gap: 6 }}>
                  ▶ Continuás donde quedaste — {fmtTime(player.pos)}
                </div>
              )}
              {/* Reproductor: <video> propio (Supabase) o iframe de Vimeo */}
              <div style={{ position: 'relative', paddingBottom: '56.25%', background: '#000' }}>
                {player?.kind === 'supabase' ? (
                  <video
                    key={player.id}
                    ref={el => { videoElRef.current = el }}
                    src={player.src ?? undefined}
                    controls
                    controlsList="nodownload noremoteplayback"
                    disablePictureInPicture
                    playsInline
                    onContextMenu={e => e.preventDefault()}
                    onLoadedMetadata={e => {
                      const el = e.currentTarget
                      const at = player.pos || 0
                      if (at > 3 && el.duration && at < el.duration - 5) { try { el.currentTime = at } catch {} }
                    }}
                    onTimeUpdate={e => handleVideoTime(e.currentTarget)}
                    onPause={e => saveVideoNow(e.currentTarget)}
                    onEnded={e => saveVideoNow(e.currentTarget)}
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none', background: '#000' }}
                  />
                ) : (
                  <iframe
                    key={selectedVideoId}
                    ref={el => { iframeRef.current = el }}
                    src={getVimeoEmbedUrl(selectedVideo.youtubeUrl)}
                    title={selectedVideo.title}
                    allow="autoplay; fullscreen; picture-in-picture"
                    allowFullScreen
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                  />
                )}
              </div>
            </div>
          )}

          {/* Navegación de lecciones */}
          {selectedVideo && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button onClick={() => prevVideo && selectVideo(prevVideo)} disabled={!prevVideo}
                style={{ flex: 1, padding: '10px', borderRadius: 10, fontSize: 12, fontWeight: 700, background: 'linear-gradient(180deg, #0B1B2B 0%, #050B14 100%)', border: '1px solid rgba(255,255,255,0.1)', color: prevVideo ? 'rgba(255,255,255,0.78)' : 'rgba(255,255,255,0.42)', cursor: prevVideo ? 'pointer' : 'default' }}>
                ← Anterior
              </button>
              {isApproved && !isVideoDone(selectedVideo) && (
                <button onClick={markWatched}
                  style={{ padding: '10px 14px', borderRadius: 10, fontSize: 12, fontWeight: 700, background: 'rgba(255,45,149,0.1)', border: '1px solid rgba(255,45,149,0.25)', color: '#FF2D95', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  ✓ Marcar visto
                </button>
              )}
              <button onClick={() => nextVideo && nextVideo.unlocked && selectVideo(nextVideo)} disabled={!nextVideo || !nextVideo.unlocked}
                style={{ flex: 1, padding: '10px', borderRadius: 10, fontSize: 12, fontWeight: 700, background: (nextVideo && nextVideo.unlocked) ? 'linear-gradient(90deg,#FF2D95,#B735B8,#233B8F)' : 'linear-gradient(180deg, #0B1B2B 0%, #050B14 100%)', border: (nextVideo && nextVideo.unlocked) ? 'none' : '1px solid rgba(255,255,255,0.1)', color: (nextVideo && nextVideo.unlocked) ? '#fff' : 'rgba(255,255,255,0.42)', cursor: (nextVideo && nextVideo.unlocked) ? 'pointer' : 'default' }}>
                {nextVideo && !nextVideo.unlocked ? '🔒 Siguiente' : 'Siguiente →'}
              </button>
            </div>
          )}

          {/* Notas + recursos descargables de la lección */}
          {selectedVideo && (selectedVideo.descripcion || (selectedVideo.recursos && selectedVideo.recursos.length > 0)) && (
            <div style={{ borderRadius: 14, border: '1px solid rgba(255,255,255,0.1)', padding: '14px 16px', background: 'linear-gradient(180deg, #0B1B2B 0%, #081624 60%, #050B14 100%)' }}>
              {selectedVideo.descripcion && (
                <div style={{ marginBottom: (selectedVideo.recursos && selectedVideo.recursos.length) ? 14 : 0 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 6px' }}>Notas</p>
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.78)', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>{selectedVideo.descripcion}</p>
                </div>
              )}
              {selectedVideo.recursos && selectedVideo.recursos.length > 0 && (
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px' }}>Recursos descargables</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {selectedVideo.recursos.map(r => (
                      <a key={r.id} href={r.archivoUrl} target="_blank" rel="noreferrer" download
                        style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#fff', textDecoration: 'none', background: 'rgba(255,9,108,0.1)', border: '1px solid rgba(255,9,108,0.25)', borderRadius: 10, padding: '10px 12px' }}>
                        <span>📎</span><span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.titulo}</span><span style={{ fontSize: 11, color: '#FF096C', whiteSpace: 'nowrap' }}>Descargar ↓</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
            </div>{/* cierra columna izquierda */}

          {/* Playlist (columna derecha) */}
          <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', background: 'linear-gradient(180deg, #0B1B2B 0%, #081624 60%, #050B14 100%)' }} className="lg:sticky lg:top-4">
            <div style={{ background: 'linear-gradient(135deg, rgba(255,45,149,0.16) 0%, rgba(183,53,184,0.16) 50%, rgba(35,59,143,0.16) 100%)', padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.55)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Contenido del curso
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {course.videos.map((video, idx) => {
                const isUnlocked = video.unlocked
                const isDone = completedVideos.has(video.id) || video.completed
                const isActive = video.id === selectedVideoId
                const prevMod = idx > 0 ? course.videos[idx - 1].moduloTitulo : null
                const showHeader = !!video.moduloTitulo && video.moduloTitulo !== prevMod

                return (
                  <Fragment key={video.id}>
                  {showHeader && (
                    <div style={{ padding: '11px 16px 7px', fontSize: 11, fontWeight: 800, color: '#FF096C', textTransform: 'uppercase', letterSpacing: '0.06em', background: 'rgba(255,9,108,0.06)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                      {video.moduloTitulo}
                    </div>
                  )}
                  <button
                    onClick={() => selectVideo(video)}
                    disabled={!isUnlocked}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '12px 16px',
                      background: isActive ? 'rgba(255,9,108,0.12)' : 'transparent',
                      borderLeft: isActive ? '3px solid #FF096C' : '3px solid transparent',
                      borderRight: 'none', borderTop: 'none',
                      borderBottom: idx < course.videos.length - 1 ? '1px solid rgba(255,255,255,0.07)' : 'none',
                      cursor: isUnlocked ? 'pointer' : 'default',
                      textAlign: 'left', width: '100%',
                      opacity: isUnlocked ? 1 : 0.45,
                      transition: 'background 0.15s',
                    }}
                  >
                    {/* Número / estado */}
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: isDone ? DG : isActive ? 'rgba(255,9,108,0.15)' : 'rgba(255,255,255,0.06)',
                      border: `1px solid ${isDone ? 'transparent' : isActive ? 'rgba(255,9,108,0.4)' : 'rgba(255,255,255,0.1)'}`,
                      fontSize: 11, fontWeight: 700,
                      color: isDone ? '#fff' : isActive ? '#FF096C' : 'rgba(255,255,255,0.55)',
                    }}>
                      {isDone ? '✓' : !isUnlocked ? '🔒' : idx + 1}
                    </div>

                    {/* Título + barra de avance */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: 13, fontWeight: isActive ? 700 : 500, color: isActive ? '#fff' : isUnlocked ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.4)', lineHeight: 1.4, display: 'block' }}>
                        {video.title}
                      </span>
                      {(video.isPreview || video.duracionSegundos) && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                          {video.isPreview && <span style={{ fontSize: 9, fontWeight: 800, color: '#FF2D95', letterSpacing: '0.05em' }}>GRATIS</span>}
                          {video.duracionSegundos ? <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.42)' }}>{fmtTime(video.duracionSegundos)}</span> : null}
                        </div>
                      )}
                      {isUnlocked && !isDone && (video.percent ?? 0) > 0 && (
                        <div style={{ height: 3, borderRadius: 3, background: 'rgba(255,255,255,0.1)', marginTop: 5, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${video.percent}%`, background: '#FF096C', borderRadius: 3 }} />
                        </div>
                      )}
                    </div>

                    {/* Play icon si está activo */}
                    {isActive && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="#FF096C" style={{ flexShrink: 0 }}>
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    )}
                  </button>
                  </Fragment>
                )
              })}
            </div>
          </div>
        </div>
        </>
      )}

      {!isApproved && !isPending && !isPendingVerification && !isRejected && !isLocked && (
        <div style={{ padding: '24px', borderRadius: 14, textAlign: 'center', background: 'linear-gradient(180deg, #0B1B2B 0%, #081624 60%, #050B14 100%)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>Los videos están disponibles después de verificar tu pago.</p>
        </div>
      )}

      {/* Payment modal */}
      {showModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '0 16px' }}
          onClick={e => { if (e.target === e.currentTarget) closeModal() }}
        >
          <div style={{ background: '#0d0d15', border: '1px solid #E4E9F0', borderRadius: 20, padding: 24, width: '100%', maxWidth: 460, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: 0 }}>Comprar curso</h3>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer', fontSize: 18 }}>✕</button>
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              <button onClick={() => setPayTab('CRYPTO')} style={{ flex: 1, padding: '9px 0', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', background: payTab === 'CRYPTO' ? 'rgba(245,166,35,0.15)' : 'rgba(255,255,255,0.04)', border: `1px solid ${payTab === 'CRYPTO' ? 'rgba(245,166,35,0.4)' : 'rgba(255,255,255,0.08)'}`, color: payTab === 'CRYPTO' ? '#C9A7FF' : '#6B7280' }}>
                ₮ Cripto (USDT)
              </button>
              <button onClick={() => setPayTab('MANUAL')} style={{ flex: 1, padding: '9px 0', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', background: payTab === 'MANUAL' ? 'rgba(183,53,184,0.1)' : 'rgba(255,255,255,0.04)', border: `1px solid ${payTab === 'MANUAL' ? '#E4E9F0' : 'rgba(255,255,255,0.08)'}`, color: payTab === 'MANUAL' ? '#B735B8' : '#6B7280' }}>
                📎 Comprobante
              </button>
            </div>
            {payTab === 'CRYPTO' && (
              <PaymentGateway plan={course.title} price={course.price} onSubmitPayment={handleCryptoPayment} onSuccess={() => { closeModal(); loadCourse() }} onCancel={closeModal} />
            )}
            {payTab === 'MANUAL' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <p style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.5, margin: 0 }}>
                  Escanea el QR y transfiere <strong style={{ color: '#B735B8' }}>{course.price.toFixed(2)} USDT</strong>, luego sube la captura del comprobante.
                </p>
                {paymentQrUrl && (
                  <div style={{ textAlign: 'center' }}>
                    <img src={paymentQrUrl} alt="QR de pago" style={{ width: 148, height: 148, borderRadius: 12, margin: '0 auto', display: 'block', border: '2px solid #E4E9F0', background: '#fff', padding: 4 }} />
                    <p style={{ fontSize: 10, color: '#9CA3AF', marginTop: 6 }}>QR de pago USDT</p>
                  </div>
                )}
                <div>
                  <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 6 }}>Comprobante de pago</label>
                  <input ref={proofInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) uploadProof(f) }} />
                  {proofUrl ? (
                    <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden' }}>
                      <img src={proofUrl} alt="comprobante" style={{ width: '100%', maxHeight: 160, objectFit: 'cover', borderRadius: 10 }} />
                      <button onClick={() => setProofUrl('')} style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(15,23,42,0.10)', border: 'none', borderRadius: 6, cursor: 'pointer', padding: '4px 6px', color: '#fff', fontSize: 12 }}>✕</button>
                    </div>
                  ) : (
                    <button onClick={() => proofInputRef.current?.click()} disabled={uploading}
                      style={{ width: '100%', height: 80, borderRadius: 10, border: '1.5px dashed #E4E9F0', background: 'rgba(255,255,255,0.03)', cursor: uploading ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280', fontSize: 13 }}>
                      {uploading ? '⏳ Subiendo...' : '📎 Seleccionar imagen del comprobante'}
                    </button>
                  )}
                </div>
                {submitError && <p style={{ fontSize: 12, color: '#ef4444', margin: 0 }}>{submitError}</p>}
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={closeModal} style={{ flex: 1, padding: '10px 0', borderRadius: 10, fontSize: 13, fontWeight: 600, background: '#F0F3F7', border: '1px solid #E4E9F0', color: '#6B7280', cursor: 'pointer' }}>
                    Cancelar
                  </button>
                  <button onClick={handleManualEnroll} disabled={submitting}
                    style={{ flex: 2, padding: '10px 0', borderRadius: 10, fontSize: 13, fontWeight: 700, background: submitting ? '#E4E9F0' : 'linear-gradient(135deg, #B735B8 0%, #FF2D95 100%)', border: 'none', color: '#000', cursor: submitting ? 'not-allowed' : 'pointer' }}>
                    {submitting ? 'Enviando...' : 'Enviar comprobante'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  </div>
  )
}
