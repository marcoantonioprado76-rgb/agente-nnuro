'use client'

import { useEffect, useState, useRef } from 'react'
import { Mic, Plus, Edit2, Trash2, Check, X, Loader2, Upload, Link, Music } from 'lucide-react'
import OrgSelector from '@/components/OrgSelector'

interface Podcast {
  id: string
  title: string
  description: string | null
  coverUrl: string | null
  embedUrl: string
  categoria: string | null
  active: boolean
  order: number
  organizationId: string | null
  createdAt: string
}

interface PodcastModalData {
  id?: string
  title: string
  description: string
  coverUrl: string
  embedUrl: string
  categoria: string
  order: string
  active: boolean
  organizationId: string | null
  mediaMode: 'url' | 'file'
}

const EMPTY: PodcastModalData = { title: '', description: '', coverUrl: '', embedUrl: '', categoria: '', order: '0', active: true, organizationId: null, mediaMode: 'url' }

const AUDIO_EXTS = ['.mp3', '.wav', '.ogg', '.aac', '.m4a']
function isAudioUrl(url: string) {
  return AUDIO_EXTS.some(ext => url.toLowerCase().includes(ext))
}

export default function AdminPodcastsPage() {
  const [podcasts, setPodcasts] = useState<Podcast[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<{ mode: 'create' | 'edit'; data: PodcastModalData } | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [uploadingCover, setUploadingCover] = useState(false)
  const [uploadingAudio, setUploadingAudio] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const coverInputRef = useRef<HTMLInputElement>(null)
  const audioInputRef = useRef<HTMLInputElement>(null)

  async function load() {
    setLoading(true)
    const r = await fetch('/api/admin/podcasts')
    const d = await r.json()
    setPodcasts(d.podcasts ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function uploadCover(file: File) {
    setUploadingCover(true)
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/upload', { method: 'POST', body: fd })
    const data = await res.json()
    setUploadingCover(false)
    if (data.url && modal) {
      setModal({ ...modal, data: { ...modal.data, coverUrl: data.url } })
    } else {
      setSaveError('Error al subir la imagen.')
    }
  }

  async function uploadAudio(file: File) {
    setUploadingAudio(true)
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/upload', { method: 'POST', body: fd })
    const data = await res.json()
    setUploadingAudio(false)
    if (data.url && modal) {
      setModal({ ...modal, data: { ...modal.data, embedUrl: data.url } })
    } else {
      setSaveError(data.error ?? 'Error al subir el audio.')
    }
  }

  async function handleSave() {
    if (!modal) return
    const { data, mode } = modal
    if (!data.title.trim() || !data.embedUrl.trim()) { setSaveError('Título y URL/archivo son obligatorios'); return }
    setSaving(true); setSaveError(null)
    const body = {
      title: data.title.trim(),
      description: data.description.trim() || null,
      coverUrl: data.coverUrl.trim() || null,
      embedUrl: data.embedUrl.trim(),
      categoria: data.categoria.trim() || null,
      order: Number(data.order) || 0,
      active: data.active,
      organizationId: data.organizationId ?? null,
    }
    const url = mode === 'edit' ? `/api/admin/podcasts/${data.id}` : '/api/admin/podcasts'
    const res = await fetch(url, { method: mode === 'edit' ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const json = await res.json()
    if (!res.ok) { setSaveError(json.error ?? 'Error'); setSaving(false); return }
    setSaving(false); setModal(null); load()
  }

  async function handleDelete() {
    if (!deleteId) return
    setDeleting(true)
    await fetch(`/api/admin/podcasts/${deleteId}`, { method: 'DELETE' })
    setDeleting(false); setDeleteId(null); load()
  }

  return (
  <div className="dm-page font-ui">
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 className="text-xl font-bold text-[#111827] uppercase tracking-widest">MY DIAMOND Podcasts</h1>
        <div className="h-px w-16 mt-2 rounded-full" style={{ background: 'linear-gradient(90deg, transparent, #D203DD, #FF2DF7, transparent)' }} />
      </div>

      {/* Top bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <p style={{ fontSize: 13, color: '#6B7280' }}>{podcasts.length} episodio{podcasts.length !== 1 ? 's' : ''}</p>
        <button
          onClick={() => { setSaveError(null); setModal({ mode: 'create', data: EMPTY }) }}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, fontSize: 13, fontWeight: 700,
            background: 'linear-gradient(135deg, #D203DD 0%, #00FF88 100%)', color: '#000', border: 'none', cursor: 'pointer' }}
        >
          <Plus size={14} /> Nuevo episodio
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={20} className="animate-spin text-[#111827]/30" /></div>
      ) : podcasts.length === 0 ? (
        <div className="text-center py-16 text-[#111827]/30 text-sm">No hay episodios aún.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {podcasts.map(p => (
            <div key={p.id} style={{ padding: '14px 16px', borderRadius: 14, background: '#fff', border: '1px solid #E4E9F0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {/* Cover */}
                <div style={{ width: 48, height: 48, borderRadius: 10, flexShrink: 0, overflow: 'hidden', background: 'rgba(210,3,221,0.06)', border: '1px solid rgba(210,3,221,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {p.coverUrl ? <img src={p.coverUrl} alt={p.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Mic size={16} className="text-[#111827]/20" />}
                </div>
                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</p>
                  <p style={{ fontSize: 11, color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.embedUrl} · {p.active ? 'Activo' : 'Oculto'}
                  </p>
                </div>
                {/* Actions */}
                <button onClick={() => { setSaveError(null); setModal({ mode: 'edit', data: { id: p.id, title: p.title, description: p.description ?? '', coverUrl: p.coverUrl ?? '', embedUrl: p.embedUrl, categoria: p.categoria ?? '', order: String(p.order), active: p.active, organizationId: p.organizationId ?? null, mediaMode: isAudioUrl(p.embedUrl) ? 'file' : 'url' } }) }}
                  style={{ padding: '6px 10px', borderRadius: 8, background: '#F0F3F7', border: '1px solid #E4E9F0', cursor: 'pointer' }}>
                  <Edit2 size={13} className="text-[#111827]/50" />
                </button>
                <button onClick={() => setDeleteId(p.id)}
                  style={{ padding: '6px 10px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', cursor: 'pointer' }}>
                  <Trash2 size={13} className="text-red-400/70" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}>
          <div style={{ background: '#0d0d15', border: '1px solid #E4E9F0', borderRadius: 20, padding: 24, width: '100%', maxWidth: 360 }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 8 }}>¿Eliminar episodio?</p>
            <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 20 }}>Esta acción no se puede deshacer.</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setDeleteId(null)} style={{ flex: 1, padding: '10px 0', borderRadius: 10, fontSize: 13, fontWeight: 600, background: '#F0F3F7', border: '1px solid #E4E9F0', color: '#6B7280', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={handleDelete} disabled={deleting} style={{ flex: 1, padding: '10px 0', borderRadius: 10, fontSize: 13, fontWeight: 700, background: deleting ? 'rgba(239,68,68,0.3)' : 'rgba(239,68,68,0.8)', border: 'none', color: '#fff', cursor: deleting ? 'not-allowed' : 'pointer' }}>
                {deleting ? <Loader2 size={14} className="animate-spin mx-auto" /> : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
          onClick={e => { if (e.target === e.currentTarget) setModal(null) }}>
          <div style={{ background: '#0d0d15', border: '1px solid #E4E9F0', borderRadius: 20, padding: 24, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: 0 }}>{modal.mode === 'create' ? 'Nuevo episodio' : 'Editar episodio'}</h3>
              <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer', fontSize: 18 }}><X size={18} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Cover upload */}
              <div>
                <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 6 }}>Portada</label>
                <input ref={coverInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) uploadCover(f) }} />
                {modal.data.coverUrl ? (
                  <div style={{ position: 'relative', width: 80, height: 80, borderRadius: 10, overflow: 'hidden' }}>
                    <img src={modal.data.coverUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button onClick={() => setModal({ ...modal, data: { ...modal.data, coverUrl: '' } })}
                      style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(15,23,42,0.10)', border: 'none', borderRadius: 6, cursor: 'pointer', padding: '2px 5px', color: '#fff', fontSize: 11 }}>✕</button>
                  </div>
                ) : (
                  <button onClick={() => coverInputRef.current?.click()} disabled={uploadingCover}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 10, fontSize: 12, color: '#6B7280', background: 'rgba(255,255,255,0.04)', border: '1px dashed #E4E9F0', cursor: uploadingCover ? 'wait' : 'pointer' }}>
                    {uploadingCover ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                    {uploadingCover ? 'Subiendo...' : 'Subir imagen'}
                  </button>
                )}
              </div>

              {/* Title */}
              <div>
                <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 6 }}>Título *</label>
                <input type="text" value={modal.data.title} onChange={e => setModal({ ...modal, data: { ...modal.data, title: e.target.value } })}
                  placeholder="Ep. 1 — Cómo escalar tu negocio"
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 8, fontSize: 13, color: '#fff', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', outline: 'none', boxSizing: 'border-box' }} />
              </div>

              {/* Description */}
              <div>
                <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 6 }}>Descripción</label>
                <textarea value={modal.data.description} onChange={e => setModal({ ...modal, data: { ...modal.data, description: e.target.value } })}
                  placeholder="De qué trata este episodio..." rows={3}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 8, fontSize: 13, color: '#fff', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', outline: 'none', resize: 'none', boxSizing: 'border-box' }} />
              </div>

              {/* Media — tabs: enlace externo / subir archivo */}
              <div>
                <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 6 }}>Audio del episodio *</label>
                {/* Tabs */}
                <div style={{ display: 'flex', gap: 4, marginBottom: 10, background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 4 }}>
                  {(['url', 'file'] as const).map(mode => (
                    <button key={mode} type="button"
                      onClick={() => setModal({ ...modal, data: { ...modal.data, mediaMode: mode, embedUrl: '' } })}
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '7px 0', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: 'none', transition: 'all 0.15s',
                        background: modal.data.mediaMode === mode ? 'rgba(210,3,221,0.2)' : 'transparent',
                        color: modal.data.mediaMode === mode ? '#D203DD' : '#6B7280' }}>
                      {mode === 'url' ? <><Link size={12} /> Enlace externo</> : <><Music size={12} /> Subir archivo</>}
                    </button>
                  ))}
                </div>

                {modal.data.mediaMode === 'url' ? (
                  <input type="text" value={modal.data.embedUrl}
                    onChange={e => setModal({ ...modal, data: { ...modal.data, embedUrl: e.target.value } })}
                    placeholder="https://youtube.com/watch?v=... o Spotify / Vimeo"
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 8, fontSize: 13, color: '#fff', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', outline: 'none', boxSizing: 'border-box' }} />
                ) : (
                  <>
                    <input ref={audioInputRef} type="file" accept="audio/*,.mp3,.wav,.ogg,.aac,.m4a" style={{ display: 'none' }}
                      onChange={e => { const f = e.target.files?.[0]; if (f) uploadAudio(f) }} />
                    {modal.data.embedUrl && isAudioUrl(modal.data.embedUrl) ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, background: 'rgba(0,255,136,0.06)', border: '1px solid rgba(0,255,136,0.2)' }}>
                        <Music size={15} style={{ color: '#00FF88', flexShrink: 0 }} />
                        <p style={{ fontSize: 12, color: '#00FF88', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>
                          {modal.data.embedUrl.split('/').pop()?.split('?')[0] ?? 'Audio subido'}
                        </p>
                        <button type="button" onClick={() => setModal({ ...modal, data: { ...modal.data, embedUrl: '' } })}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', padding: 0 }}>
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => audioInputRef.current?.click()} disabled={uploadingAudio}
                        style={{ width: '100%', padding: '20px 0', borderRadius: 10, border: '1.5px dashed rgba(210,3,221,0.3)', background: 'rgba(210,3,221,0.04)', cursor: uploadingAudio ? 'wait' : 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, color: '#6B7280' }}>
                        {uploadingAudio
                          ? <><Loader2 size={18} className="animate-spin" style={{ color: '#D203DD' }} /><span style={{ fontSize: 12 }}>Subiendo...</span></>
                          : <><Music size={18} style={{ color: '#D203DD' }} /><span style={{ fontSize: 13, fontWeight: 700 }}>Subir audio desde computadora</span><span style={{ fontSize: 11, color: '#9CA3AF' }}>MP3, WAV, AAC, M4A</span></>
                        }
                      </button>
                    )}
                  </>
                )}
              </div>

              {/* Categoría */}
              <div>
                <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 6 }}>Categoría (filtro que verán los usuarios)</label>
                <input type="text" list="pod-cats" value={modal.data.categoria} onChange={e => setModal({ ...modal, data: { ...modal.data, categoria: e.target.value } })}
                  placeholder="Bienestar · Negocio · Soy Diamante"
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 8, fontSize: 13, color: '#fff', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', outline: 'none', boxSizing: 'border-box' }} />
                <datalist id="pod-cats">
                  {Array.from(new Set(['Bienestar', 'Negocio', 'Soy Diamante', ...(podcasts.map(p => p.categoria).filter(Boolean) as string[])])).map(c => <option key={c} value={c} />)}
                </datalist>
                <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                  {['Bienestar', 'Negocio', 'Soy Diamante'].map(c => {
                    const on = (modal.data.categoria || '').trim().toLowerCase() === c.toLowerCase()
                    return (
                      <button key={c} type="button" onClick={() => setModal({ ...modal, data: { ...modal.data, categoria: c } })}
                        style={{ padding: '5px 12px', borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: 'pointer', color: '#fff',
                          border: on ? 'none' : '1px solid rgba(255,255,255,0.14)',
                          background: on ? 'linear-gradient(135deg,#FF2D95,#B735B8,#233B8F)' : 'rgba(255,255,255,0.05)' }}>
                        {c}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Order */}
              <div>
                <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 6 }}>Orden</label>
                <input type="number" value={modal.data.order} onChange={e => setModal({ ...modal, data: { ...modal.data, order: e.target.value } })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 8, fontSize: 13, color: '#fff', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', outline: 'none', boxSizing: 'border-box' }} />
              </div>

              {/* Active toggle */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label style={{ fontSize: 12, color: '#6B7280' }}>Visible para usuarios</label>
                <button onClick={() => setModal({ ...modal, data: { ...modal.data, active: !modal.data.active } })}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', background: modal.data.active ? 'rgba(0,255,136,0.1)' : '#F0F3F7', border: `1px solid ${modal.data.active ? 'rgba(0,255,136,0.25)' : 'rgba(255,255,255,0.08)'}`, color: modal.data.active ? '#00FF88' : '#6B7280' }}>
                  {modal.data.active ? <><Check size={12} /> Activo</> : <><X size={12} /> Oculto</>}
                </button>
              </div>

              <OrgSelector value={modal.data.organizationId} onChange={v => setModal({ ...modal, data: { ...modal.data, organizationId: v } })} />

              {saveError && <p style={{ fontSize: 12, color: '#ef4444' }}>{saveError}</p>}

              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button onClick={() => setModal(null)} style={{ flex: 1, padding: '10px 0', borderRadius: 10, fontSize: 13, fontWeight: 600, background: '#F0F3F7', border: '1px solid #E4E9F0', color: '#6B7280', cursor: 'pointer' }}>Cancelar</button>
                <button onClick={handleSave} disabled={saving}
                  style={{ flex: 2, padding: '10px 0', borderRadius: 10, fontSize: 13, fontWeight: 700, background: saving ? 'rgba(210,3,221,0.3)' : 'linear-gradient(135deg, #D203DD 0%, #00FF88 100%)', border: 'none', color: '#000', cursor: saving ? 'not-allowed' : 'pointer' }}>
                  {saving ? 'Guardando...' : modal.mode === 'create' ? 'Crear episodio' : 'Guardar cambios'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
  )
}
