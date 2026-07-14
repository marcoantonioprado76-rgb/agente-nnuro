'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

interface Podcast {
  id: string
  title: string
  description: string | null
  coverUrl: string | null
  embedUrl: string
  categoria: string | null
  order: number
  createdAt: string
}

const DG = 'linear-gradient(135deg,#FF2D95 0%,#B735B8 48%,#233B8F 100%)'
const AUDIO_EXTS = ['.mp3', '.wav', '.ogg', '.aac', '.m4a']
const isDirectAudio = (url: string) => AUDIO_EXTS.some(ext => url.toLowerCase().includes(ext))
const fmt = (t: number) => {
  if (!isFinite(t) || t <= 0) return '0:00'
  const m = Math.floor(t / 60), s = Math.floor(t % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}
const BARS = Array.from({ length: 64 }, (_, i) =>
  0.22 + 0.78 * Math.abs(Math.sin(i * 1.7) * 0.6 + Math.cos(i * 0.55) * 0.4))

export default function PodcastsPage() {
  const [podcasts, setPodcasts] = useState<Podcast[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [cat, setCat] = useState('Bienestar')
  const [selected, setSelected] = useState<Podcast | null>(null)

  const heroRef = useRef<HTMLDivElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [cur, setCur] = useState(0)
  const [dur, setDur] = useState(0)
  const [vol, setVol] = useState(1)

  useEffect(() => {
    fetch('/api/podcasts')
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error)
        else { const list: Podcast[] = d.podcasts ?? []; setPodcasts(list); setSelected(list[0] ?? null) }
        setLoading(false)
      })
      .catch(() => { setError('Error al cargar podcasts'); setLoading(false) })
  }, [])

  // 3 categorías fijas del negocio (siempre visibles como botones).
  // Si el admin asigna una de estas al episodio, manda; si no, cae en "Bienestar".
  const FIXED_CATS = ['Bienestar', 'Negocio', 'Soy Diamante']
  const podCategory = (p: Podcast): string => {
    const c = p.categoria?.trim().toLowerCase()
    return FIXED_CATS.find(fc => fc.toLowerCase() === c) ?? 'Bienestar'
  }
  const cats = FIXED_CATS
  const filtered = podcasts.filter(p =>
    p.title.toLowerCase().includes(search.toLowerCase()) &&
    podCategory(p) === cat)

  function choose(p: Podcast, play = false) {
    setSelected(p); setCur(0); setDur(0); setPlaying(false)
    if (typeof window !== 'undefined' && window.innerWidth < 900) heroRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    if (play) setTimeout(() => { audioRef.current?.play().catch(() => {}) }, 120)
  }
  const heroAudio = selected ? isDirectAudio(selected.embedUrl) : false
  const frac = dur ? cur / dur : 0
  const epNum = selected ? podcasts.findIndex(p => p.id === selected.id) + 1 : 0
  const toggle = () => { const a = audioRef.current; if (!a) return; a.paused ? a.play().catch(() => {}) : a.pause() }
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
  if (error) return <div className="px-4 sm:px-6 pt-6 max-w-screen-xl mx-auto"><p className="text-red-500 text-sm">{error}</p></div>

  return (
    <div className="dm-page font-ui">
      <div className="px-4 sm:px-6 pt-6 pb-24 max-w-6xl mx-auto">
        <Link href="/dashboard/academy" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 16, textDecoration: 'none', fontSize: 13, color: '#6B7280' }}>
          <i className="fa-solid fa-arrow-left" style={{ fontSize: 12 }} /> Volver a Academy
        </Link>

        {/* Header */}
        <div style={{ marginBottom: 22 }}>
          <h1 style={{ fontSize: 34, fontWeight: 900, letterSpacing: '-0.02em', lineHeight: 1 }}>
            <span style={{ color: '#111827' }}>MY DIAMOND </span>
            <span style={{ background: DG, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>PODCASTS</span>
          </h1>
          <div style={{ height: 4, width: 96, borderRadius: 999, background: DG, marginTop: 10 }} />
          <p style={{ fontSize: 14, color: '#6B7280', marginTop: 12, maxWidth: 460 }}>Episodios exclusivos para aprender sobre productos, bienestar y negocio.</p>
        </div>

        {/* ── Destacado (dinámico) — el card principal que reproduce ── */}
        {selected && (
          <div ref={heroRef} style={{
            position: 'relative', overflow: 'hidden', borderRadius: 26, marginBottom: 24, padding: 22,
            background: 'radial-gradient(900px 320px at 88% -25%, rgba(168,85,247,0.28), transparent 55%), linear-gradient(150deg,#171e46 0%,#0f1332 52%,#0a0e24 100%)',
            border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 44px 100px -50px rgba(10,14,36,0.95), inset 0 1px 0 rgba(255,255,255,0.05)',
            display: 'flex', gap: 26, flexWrap: 'wrap', alignItems: 'center',
          }}>
            {/* Cover + badge episodio */}
            <div style={{ flex: '0 0 auto', width: 300, maxWidth: '100%', margin: '0 auto', position: 'relative' }}>
              <div style={{ borderRadius: 18, overflow: 'hidden', aspectRatio: '1 / 1', background: '#0a0e24', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 26px 60px -28px rgba(0,0,0,0.85)' }}>
                {selected.coverUrl
                  ? <img src={selected.coverUrl} alt={selected.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  : <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', color: 'rgba(255,255,255,0.3)' }}><i className="fa-solid fa-microphone" style={{ fontSize: 42 }} /></div>}
              </div>
              {epNum > 0 && (
                <div style={{ position: 'absolute', bottom: -10, left: -10, background: 'linear-gradient(180deg,#141a3d,#0a0e24)', border: '1px solid rgba(168,85,247,0.45)', borderRadius: 14, padding: '7px 15px', textAlign: 'center', boxShadow: '0 12px 26px -12px rgba(0,0,0,0.8)' }}>
                  <p style={{ fontSize: 8.5, fontWeight: 800, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.5)', margin: 0 }}>EPISODIO</p>
                  <p style={{ fontSize: 24, fontWeight: 900, background: DG, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0, lineHeight: 1 }}>{String(epNum).padStart(2, '0')}</p>
                </div>
              )}
            </div>

            {/* Info + player */}
            <div style={{ flex: '1 1 340px', minWidth: 288, color: '#fff' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.72)' }}>
                <i className="fa-solid fa-microphone" style={{ color: '#C77DFF', fontSize: 12 }} /> EP. {epNum} · Podcast
              </span>
              <h2 style={{ fontSize: 30, fontWeight: 900, margin: '8px 0 0', lineHeight: 1.1, letterSpacing: '-0.01em' }}>{selected.title}</h2>
              {selected.description && <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.72)', lineHeight: 1.6, marginTop: 8 }}>{selected.description}</p>}

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
                <HeroChip icon="fa-headphones" label="Podcast" />
                {heroAudio && dur > 0 && <HeroChip icon="fa-clock" label={`${Math.max(1, Math.round(dur / 60))} min`} />}
              </div>
              <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.5)', marginTop: 12, display: 'flex', alignItems: 'center', gap: 7 }}>
                <i className="fa-regular fa-calendar" /> Publicado el {new Date(selected.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>

              {heroAudio ? (
                <div style={{ marginTop: 16, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 18, padding: '14px 16px' }}>
                  <audio key={selected.id} ref={audioRef} src={selected.embedUrl} preload="metadata"
                    onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)}
                    onTimeUpdate={e => setCur(e.currentTarget.currentTime)} onLoadedMetadata={e => setDur(e.currentTarget.duration)} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button onClick={toggle} aria-label={playing ? 'Pausar' : 'Reproducir'} style={{ flex: '0 0 auto', width: 54, height: 54, borderRadius: '50%', border: 'none', cursor: 'pointer', background: DG, color: '#fff', display: 'grid', placeItems: 'center', fontSize: 19, boxShadow: '0 10px 26px -8px rgba(183,53,184,0.85)' }}>
                      <i className={`fa-solid ${playing ? 'fa-pause' : 'fa-play'}`} style={{ marginLeft: playing ? 0 : 3 }} />
                    </button>
                    <button onClick={() => skip(-15)} title="-15s" style={ctrlBtn}><i className="fa-solid fa-rotate-left" /><span style={{ position: 'absolute', fontSize: 8.5, fontWeight: 800 }}>15</span></button>
                    <div onClick={seekAt} style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', gap: 2, height: 42, cursor: 'pointer', minWidth: 70 }}>
                      {BARS.map((h, i) => {
                        const on = i / BARS.length <= frac
                        return <div key={i} style={{ flex: 1, height: `${h * 100}%`, borderRadius: 2, background: on ? 'linear-gradient(180deg,#E779FF,#B735B8)' : 'rgba(255,255,255,0.16)', minWidth: 2 }} />
                      })}
                      <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${frac * 100}%`, width: 2, background: '#fff', borderRadius: 2, opacity: 0.9, pointerEvents: 'none' }} />
                    </div>
                    <button onClick={() => skip(15)} title="+15s" style={ctrlBtn}><i className="fa-solid fa-rotate-right" /><span style={{ position: 'absolute', fontSize: 8.5, fontWeight: 800 }}>15</span></button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, flex: '0 0 auto' }}>
                      <i className="fa-solid fa-volume-high" style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }} />
                      <input type="range" min={0} max={1} step={0.01} value={vol} className="dm-vol"
                        onChange={e => { const v = parseFloat(e.target.value); setVol(v); if (audioRef.current) audioRef.current.volume = v }}
                        style={{ width: 72, ['--pct' as any]: `${vol * 100}%` }} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', fontVariantNumeric: 'tabular-nums' }}>{fmt(cur)}</span>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', fontVariantNumeric: 'tabular-nums' }}>{fmt(dur)}</span>
                  </div>
                </div>
              ) : (
                <Link href={`/dashboard/podcasts/${selected.id}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 24px', borderRadius: 12, background: DG, color: '#fff', fontWeight: 800, fontSize: 14, textDecoration: 'none', marginTop: 16 }}>
                  <i className="fa-solid fa-headphones" /> Escuchar
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 14 }}>
          <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#9AA3B2', fontSize: 13 }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar episodios por tema o palabra clave..."
            style={{ width: '100%', padding: '12px 16px 12px 38px', borderRadius: 14, fontSize: 14, color: '#111827', outline: 'none', background: '#fff', border: '1px solid #E8EAF2', boxSizing: 'border-box' }} />
        </div>

        {/* Chips de categoría (Bienestar · Negocio · Soy Diamante) */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 18 }}>
          {cats.map(c => {
            const active = cat === c
            const icon = c === 'Negocio' ? 'fa-briefcase' : c === 'Soy Diamante' ? 'fa-gem' : 'fa-heart'
            return (
              <button key={c} onClick={() => setCat(c)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 22px', borderRadius: 999, fontSize: 14, fontWeight: 800, cursor: 'pointer', letterSpacing: '0.01em', transition: 'transform .15s, box-shadow .15s',
                  border: active ? 'none' : '1.5px solid #E4E9F0',
                  background: active ? DG : '#fff',
                  color: active ? '#fff' : '#374151',
                  transform: active ? 'translateY(-1px)' : 'none',
                  boxShadow: active ? '0 12px 28px -8px rgba(183,53,184,0.65)' : '0 6px 16px -10px rgba(15,23,42,0.35)' }}>
                <i className={`fa-solid ${icon}`} style={{ fontSize: 13, color: active ? '#fff' : '#B735B8' }} />
                {c}
              </button>
            )
          })}
        </div>

        {/* Lista */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px 20px', color: '#9AA3B2', background: '#fff', border: '1px dashed #D5DCE6', borderRadius: 18 }}>
            {podcasts.length === 0 ? 'No hay episodios disponibles aún.' : <>Sin resultados para &quot;{search}&quot;</>}
          </div>
        ) : (
          <div style={{ background: '#fff', border: '1px solid #E8EAF2', borderRadius: 18, overflow: 'hidden' }}>
            {filtered.map((p, i) => {
              const active = selected?.id === p.id
              return (
                <div key={p.id} onClick={() => choose(p)}
                  style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', cursor: 'pointer', borderTop: i === 0 ? 'none' : '1px solid #F0F2F7', background: active ? 'rgba(183,53,184,0.05)' : 'transparent', transition: 'background .15s' }}>
                  <div style={{ flex: '0 0 auto', width: 52, height: 52, borderRadius: 12, overflow: 'hidden', background: '#0a0e24', position: 'relative' }}>
                    {p.coverUrl ? <img src={p.coverUrl} alt={p.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', color: 'rgba(255,255,255,0.3)' }}><i className="fa-solid fa-microphone" style={{ fontSize: 16 }} /></div>}
                    {active && playing && <div style={{ position: 'absolute', inset: 0, background: 'rgba(183,53,184,0.35)', display: 'grid', placeItems: 'center', color: '#fff' }}><i className="fa-solid fa-volume-high" style={{ fontSize: 14 }} /></div>}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 800, fontSize: 14, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</p>
                    <p style={{ fontSize: 12.5, color: '#8A93A2', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>{p.description ?? 'Episodio exclusivo de MY DIAMOND.'}</p>
                  </div>
                  <button onClick={e => { e.stopPropagation(); choose(p, true) }}
                    style={{ flex: '0 0 auto', display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 14px', borderRadius: 10, border: '1px solid #E3D4F0', background: active ? DG : '#fff', color: active ? '#fff' : '#B735B8', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>
                    <i className="fa-solid fa-headphones" /> Escuchar
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function HeroChip({ icon, label }: { icon: string; label: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '6px 13px', borderRadius: 999, fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.85)', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}>
      <i className={`fa-solid ${icon}`} style={{ color: '#C77DFF', fontSize: 11 }} /> {label}
    </span>
  )
}

const ctrlBtn: React.CSSProperties = {
  position: 'relative', flex: '0 0 auto', width: 38, height: 38, borderRadius: '50%',
  border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.85)',
  cursor: 'pointer', display: 'grid', placeItems: 'center', fontSize: 14,
}
