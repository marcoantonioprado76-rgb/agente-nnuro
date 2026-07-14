'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

interface Podcast {
  id: string
  title: string
  description: string | null
  coverUrl: string | null
  embedUrl: string
}

const DG = 'linear-gradient(135deg,#FF2D95 0%,#B735B8 48%,#233B8F 100%)'
const AUDIO_EXTS = ['.mp3', '.wav', '.ogg', '.aac', '.m4a']
const isDirectAudio = (url: string) => AUDIO_EXTS.some(ext => url.toLowerCase().includes(ext))

function getEmbedUrl(url: string): string {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?/]+)/)
  if (yt) return `https://www.youtube.com/embed/${yt[1]}?rel=0`
  const vm = url.match(/vimeo\.com\/(\d+)/)
  if (vm) return `https://player.vimeo.com/video/${vm[1]}?badge=0&autopause=0`
  if (url.includes('open.spotify.com')) return url.replace('open.spotify.com/', 'open.spotify.com/embed/')
  return url
}

const fmt = (t: number) => {
  if (!isFinite(t)) return '0:00'
  const m = Math.floor(t / 60), s = Math.floor(t % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}
// Alturas de barras deterministas (look de onda de audio, estable entre renders).
const BARS = Array.from({ length: 60 }, (_, i) =>
  0.22 + 0.78 * Math.abs(Math.sin(i * 1.7) * 0.6 + Math.cos(i * 0.55) * 0.4))

export default function PodcastDetailPage() {
  const { podcastId } = useParams<{ podcastId: string }>()
  const [podcast, setPodcast] = useState<Podcast | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [cur, setCur] = useState(0)
  const [dur, setDur] = useState(0)
  const [vol, setVol] = useState(1)

  useEffect(() => {
    fetch(`/api/podcasts/${podcastId}`)
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setPodcast(d.podcast); setLoading(false) })
      .catch(() => { setError('Error al cargar el episodio'); setLoading(false) })
  }, [podcastId])

  const frac = dur ? cur / dur : 0
  const toggle = () => { const a = audioRef.current; if (!a) return; a.paused ? a.play() : a.pause() }
  const skip = (s: number) => { const a = audioRef.current; if (!a) return; a.currentTime = Math.max(0, Math.min(dur || a.duration || 0, a.currentTime + s)) }
  const seekAt = (e: React.MouseEvent<HTMLDivElement>) => {
    const a = audioRef.current; if (!a || !dur) return
    const r = e.currentTarget.getBoundingClientRect()
    a.currentTime = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * dur
  }

  if (loading) return (
    <div className="px-4 sm:px-6 pt-6 max-w-screen-xl mx-auto min-h-[60vh] flex items-center justify-center">
      <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: '#B735B8', borderTopColor: 'transparent' }} />
    </div>
  )

  if (error || !podcast) return (
    <div className="px-4 sm:px-6 pt-6 max-w-screen-xl mx-auto">
      <Link href="/dashboard/podcasts" style={{ fontSize: 13, color: '#6B7280', textDecoration: 'none' }}>← Volver a Podcasts</Link>
      <p className="text-red-500 text-sm mt-4">{error ?? 'Episodio no encontrado'}</p>
    </div>
  )

  const audio = isDirectAudio(podcast.embedUrl)

  return (
    <div className="dm-page font-ui">
      <div className="px-4 sm:px-6 pt-6 pb-14 max-w-5xl mx-auto">
        <Link href="/dashboard/podcasts" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#6B7280', textDecoration: 'none', marginBottom: 18 }}>
          ← Volver a Podcasts
        </Link>

        {/* Card premium */}
        <div style={{
          position: 'relative', borderRadius: 26, overflow: 'hidden',
          background: 'radial-gradient(1200px 400px at 85% -10%, rgba(168,85,247,0.22), transparent 55%), linear-gradient(150deg,#161d42 0%,#0f1332 52%,#0a0e24 100%)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 40px 90px -40px rgba(10,14,36,0.9), inset 0 1px 0 rgba(255,255,255,0.06)',
        }}>
          {/* glow decorativo */}
          <div style={{ position: 'absolute', top: -80, right: -60, width: 260, height: 260, borderRadius: '50%', background: 'radial-gradient(circle, rgba(183,53,184,0.35), transparent 70%)', filter: 'blur(20px)', pointerEvents: 'none' }} />

          <div style={{ position: 'relative', display: 'flex', flexWrap: 'wrap', gap: 26, padding: 26, alignItems: 'center' }}>
            {/* Portada */}
            <div style={{ flex: '0 0 auto', width: 260, maxWidth: '100%', margin: '0 auto' }}>
              <div style={{ borderRadius: 20, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 24px 60px -24px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.04)', aspectRatio: '1 / 1', background: '#0a0e24' }}>
                {podcast.coverUrl
                  ? <img src={podcast.coverUrl} alt={podcast.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', color: 'rgba(255,255,255,0.25)' }}><i className="fa-solid fa-microphone" style={{ fontSize: 44 }} /></div>}
              </div>
            </div>

            {/* Info + player */}
            <div style={{ flex: '1 1 340px', minWidth: 280, color: '#fff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <i className="fa-solid fa-microphone" style={{ color: '#C77DFF', fontSize: 13 }} />
                <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.65)' }}>Podcast</span>
              </div>
              <h1 style={{ fontSize: 30, fontWeight: 900, lineHeight: 1.1, margin: 0, letterSpacing: '-0.01em' }}>{podcast.title}</h1>
              {podcast.description && (
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.72)', lineHeight: 1.6, marginTop: 10, marginBottom: 0 }}>{podcast.description}</p>
              )}

              {/* Chips */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16 }}>
                <Chip icon="fa-headphones" label="Podcast" />
                {audio && dur > 0 && <Chip icon="fa-clock" label={`${Math.max(1, Math.round(dur / 60))} min`} />}
              </div>

              {/* Reproductor */}
              {audio ? (
                <div style={{ marginTop: 20, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 18, padding: '16px 18px' }}>
                  <audio ref={audioRef} src={podcast.embedUrl} preload="metadata"
                    onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)}
                    onTimeUpdate={e => setCur(e.currentTarget.currentTime)}
                    onLoadedMetadata={e => setDur(e.currentTarget.duration)} />

                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    {/* Play */}
                    <button onClick={toggle} aria-label={playing ? 'Pausar' : 'Reproducir'} style={{ flex: '0 0 auto', width: 56, height: 56, borderRadius: '50%', border: 'none', cursor: 'pointer', background: DG, color: '#fff', display: 'grid', placeItems: 'center', fontSize: 20, boxShadow: '0 10px 26px -8px rgba(183,53,184,0.8)' }}>
                      <i className={`fa-solid ${playing ? 'fa-pause' : 'fa-play'}`} style={{ marginLeft: playing ? 0 : 3 }} />
                    </button>
                    {/* Saltos */}
                    <button onClick={() => skip(-15)} title="-15s" style={ctrlBtn}><i className="fa-solid fa-rotate-left" /><span style={{ fontSize: 9, position: 'absolute', fontWeight: 800 }}>15</span></button>

                    {/* Onda */}
                    <div onClick={seekAt} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 2, height: 44, cursor: 'pointer', minWidth: 80 }}>
                      {BARS.map((h, i) => {
                        const on = i / BARS.length <= frac
                        return <div key={i} style={{ flex: 1, height: `${h * 100}%`, borderRadius: 2, background: on ? 'linear-gradient(180deg,#E779FF,#B735B8)' : 'rgba(255,255,255,0.16)', transition: 'background .12s', minWidth: 2 }} />
                      })}
                    </div>

                    <button onClick={() => skip(15)} title="+15s" style={ctrlBtn}><i className="fa-solid fa-rotate-right" /><span style={{ fontSize: 9, position: 'absolute', fontWeight: 800 }}>15</span></button>
                  </div>

                  {/* Tiempo + volumen */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 12, maxWidth: '100%' }}>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', fontVariantNumeric: 'tabular-nums' }}>{fmt(cur)} / {fmt(dur)}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '0 0 auto' }}>
                      <i className="fa-solid fa-volume-high" style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }} />
                      <input type="range" min={0} max={1} step={0.01} value={vol} className="dm-vol"
                        onChange={e => { const v = parseFloat(e.target.value); setVol(v); if (audioRef.current) audioRef.current.volume = v }}
                        style={{ width: 84, ['--pct' as any]: `${vol * 100}%` }} />
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ marginTop: 20, borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', position: 'relative', paddingBottom: '56.25%', background: '#000' }}>
                  <iframe src={getEmbedUrl(podcast.embedUrl)} title={podcast.title} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Chip({ icon, label }: { icon: string; label: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '6px 13px', borderRadius: 999, fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.85)', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}>
      <i className={`fa-solid ${icon}`} style={{ color: '#C77DFF', fontSize: 11 }} /> {label}
    </span>
  )
}

const ctrlBtn: React.CSSProperties = {
  position: 'relative', flex: '0 0 auto', width: 40, height: 40, borderRadius: '50%',
  border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.85)',
  cursor: 'pointer', display: 'grid', placeItems: 'center', fontSize: 15,
}
