'use client'

import { useEffect, useState, useCallback } from 'react'
import { RefreshCw, Loader2, Trash2, Edit2, X, Plus } from 'lucide-react'

interface BotTemplate {
  id: string
  name: string
  description: string | null
  category: string | null
  systemPromptTemplate: string
  aiModel: string
  maxCharsMensaje1: number | null
  maxCharsMensaje2: number | null
  maxCharsMensaje3: number | null
  followUp1Delay: number
  followUp2Delay: number
  active: boolean
  createdAt: string
}

const INPUT = 'w-full bg-[#F4F6FA] border border-[#E4E9F0] rounded-lg px-3 py-2 text-[#111827] text-sm outline-none'
const LABEL = 'block text-[11px] text-[#111827]/40 mb-1'

const AI_MODELS = ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo', 'claude-opus-4-7', 'claude-sonnet-4-6', 'claude-haiku-4-5-20251001']

const EMPTY_FORM = {
  name: '', description: '', category: '',
  systemPromptTemplate: '', aiModel: 'gpt-4o',
  maxCharsMensaje1: '', maxCharsMensaje2: '', maxCharsMensaje3: '',
  followUp1Delay: '15', followUp2Delay: '4320', active: true,
}

export default function AdminBotTemplatesPage() {
  const [templates, setTemplates] = useState<BotTemplate[]>([])
  const [loading, setLoading] = useState(true)

  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<BotTemplate | null>(null)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [deleteConfirm, setDeleteConfirm] = useState<BotTemplate | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchTemplates = useCallback(() => {
    setLoading(true)
    fetch('/api/admin/bot-templates')
      .then(r => r.json())
      .then(d => { setTemplates(d.templates ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => { fetchTemplates() }, [fetchTemplates])

  const openCreate = () => {
    setEditing(null)
    setForm({ ...EMPTY_FORM })
    setError('')
    setModal(true)
  }

  const openEdit = (t: BotTemplate) => {
    setEditing(t)
    setForm({
      name: t.name,
      description: t.description ?? '',
      category: t.category ?? '',
      systemPromptTemplate: t.systemPromptTemplate,
      aiModel: t.aiModel,
      maxCharsMensaje1: t.maxCharsMensaje1 != null ? String(t.maxCharsMensaje1) : '',
      maxCharsMensaje2: t.maxCharsMensaje2 != null ? String(t.maxCharsMensaje2) : '',
      maxCharsMensaje3: t.maxCharsMensaje3 != null ? String(t.maxCharsMensaje3) : '',
      followUp1Delay: String(t.followUp1Delay),
      followUp2Delay: String(t.followUp2Delay),
      active: t.active,
    })
    setError('')
    setModal(true)
  }

  const setF = (k: string, v: any) => setForm(prev => ({ ...prev, [k]: v }))

  const save = async () => {
    if (!form.name.trim()) { setError('El nombre es requerido'); return }
    if (!form.systemPromptTemplate.trim()) { setError('El prompt del sistema es requerido'); return }
    setSaving(true); setError('')
    try {
      const body = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        category: form.category.trim() || null,
        systemPromptTemplate: form.systemPromptTemplate,
        aiModel: form.aiModel,
        maxCharsMensaje1: form.maxCharsMensaje1 !== '' ? form.maxCharsMensaje1 : null,
        maxCharsMensaje2: form.maxCharsMensaje2 !== '' ? form.maxCharsMensaje2 : null,
        maxCharsMensaje3: form.maxCharsMensaje3 !== '' ? form.maxCharsMensaje3 : null,
        followUp1Delay: form.followUp1Delay,
        followUp2Delay: form.followUp2Delay,
        active: form.active,
      }
      const url = editing ? `/api/admin/bot-templates/${editing.id}` : '/api/admin/bot-templates'
      const method = editing ? 'PATCH' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Error al guardar'); return }
      setModal(false); fetchTemplates()
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (t: BotTemplate) => {
    try {
      await fetch(`/api/admin/bot-templates/${t.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !t.active }),
      })
      fetchTemplates()
    } catch {
      // silently ignore network errors on toggle
    }
  }

  const doDelete = async () => {
    if (!deleteConfirm) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/bot-templates/${deleteConfirm.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        alert(data.error ?? 'Error al eliminar')
        return
      }
      setDeleteConfirm(null); fetchTemplates()
    } catch {
      alert('Error de conexión. Intenta de nuevo.')
    } finally {
      setDeleting(false)
    }
  }

  return (
  <div className="dm-page font-ui">
    <div className="px-4 sm:px-6 pt-6 pb-10 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[#111827] uppercase tracking-widest">Plantillas AI</h1>
        <div className="h-px w-20 mt-2 rounded-full" style={{ background: 'linear-gradient(90deg, transparent, #D203DD, #FF2DF7, transparent)' }} />
        <p className="text-xs text-[#111827]/30 mt-1">Plantillas de prompts que los usuarios pueden aplicar a sus agentes AI</p>
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 18 }}>
        <button onClick={fetchTemplates} style={{ padding: '7px 10px', borderRadius: 9, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer' }}>
          <RefreshCw size={13} className="text-[#111827]/40" />
        </button>
        <button onClick={openCreate} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', borderRadius: 9, background: 'linear-gradient(135deg, #D203DD, #00FF88)', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13, color: '#000' }}>
          <Plus size={14} /> Nueva plantilla
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={20} className="animate-spin text-[#111827]/30" /></div>
      ) : templates.length === 0 ? (
        <div className="text-center py-16 text-[#111827]/30 text-sm">No hay plantillas. Crea la primera.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {templates.map(t => (
            <div key={t.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '14px 16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 13 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 5 }}>
                  <span style={{ fontWeight: 700, color: '#fff', fontSize: 14 }}>{t.name}</span>
                  {t.category && <span style={{ fontSize: 11, color: '#6B7280', background: '#F0F3F7', padding: '2px 8px', borderRadius: 5 }}>{t.category}</span>}
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#a78bfa', background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.2)', padding: '2px 7px', borderRadius: 5 }}>{t.aiModel}</span>
                  <button
                    onClick={() => toggleActive(t)}
                    style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 5, border: '1px solid', cursor: 'pointer', background: 'none',
                      ...(t.active ? { color: '#00FF88', borderColor: 'rgba(0,255,136,0.2)' } : { color: '#9CA3AF', borderColor: 'rgba(255,255,255,0.08)' }) }}>
                    {t.active ? 'Activa' : 'Inactiva'}
                  </button>
                </div>
                {t.description && <p style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>{t.description}</p>}
                <p style={{ fontSize: 11, color: '#9CA3AF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
                  Prompt: {t.systemPromptTemplate.slice(0, 100)}{t.systemPromptTemplate.length > 100 ? '...' : ''}
                </p>
                <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>
                  Follow-up: {t.followUp1Delay}min / {t.followUp2Delay}min
                  {(t.maxCharsMensaje1 != null || t.maxCharsMensaje2 != null || t.maxCharsMensaje3 != null) && ` · Chars: ${t.maxCharsMensaje1 ?? '–'} / ${t.maxCharsMensaje2 ?? '–'} / ${t.maxCharsMensaje3 ?? '–'}`}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button onClick={() => openEdit(t)} style={{ padding: '6px 8px', borderRadius: 7, background: 'rgba(210,3,221,0.07)', border: '1px solid rgba(210,3,221,0.15)', cursor: 'pointer', color: '#D203DD' }}>
                  <Edit2 size={13} />
                </button>
                <button onClick={() => setDeleteConfirm(t)} style={{ padding: '6px 8px', borderRadius: 7, background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', cursor: 'pointer', color: '#ef4444' }}>
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ═══ CREATE / EDIT MODAL ═══ */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.78)', zIndex: 50, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: '40px 16px' }}>
          <div style={{ background: '#0d1117', border: '1px solid #E4E9F0', borderRadius: 18, width: '100%', maxWidth: 620, padding: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{editing ? 'Editar plantilla' : 'Nueva plantilla AI'}</h2>
              <button onClick={() => setModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280' }}><X size={18} /></button>
            </div>

            {error && <p style={{ fontSize: 12, color: '#ef4444', marginBottom: 14, background: 'rgba(239,68,68,0.08)', borderRadius: 8, padding: '7px 12px' }}>{error}</p>}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div><label className={LABEL}>Nombre *</label><input className={INPUT} value={form.name} onChange={e => setF('name', e.target.value)} placeholder="Agente de ventas" /></div>
                <div><label className={LABEL}>Categoría</label><input className={INPUT} value={form.category} onChange={e => setF('category', e.target.value)} placeholder="Ventas, Soporte..." /></div>
              </div>

              <div><label className={LABEL}>Descripción</label><input className={INPUT} value={form.description} onChange={e => setF('description', e.target.value)} placeholder="Descripción breve de la plantilla..." /></div>

              <div>
                <label className={LABEL}>Modelo AI</label>
                <select className={INPUT} value={form.aiModel} onChange={e => setF('aiModel', e.target.value)} style={{ cursor: 'pointer' }}>
                  {AI_MODELS.map(m => <option key={m} value={m} style={{ background: '#0d1117' }}>{m}</option>)}
                </select>
              </div>

              <div>
                <label className={LABEL}>Prompt del sistema *</label>
                <textarea
                  className={INPUT}
                  rows={10}
                  style={{ resize: 'vertical', fontFamily: 'monospace', fontSize: 12, lineHeight: 1.5 }}
                  value={form.systemPromptTemplate}
                  onChange={e => setF('systemPromptTemplate', e.target.value)}
                  placeholder="Eres un asistente especializado en ventas de suplementos. Tu objetivo es ayudar a los clientes a elegir el producto correcto..." />
                <p style={{ fontSize: 10, color: '#9CA3AF', marginTop: 4 }}>{form.systemPromptTemplate.length} caracteres</p>
              </div>

              <div>
                <label className={LABEL} style={{ marginBottom: 8 }}>Límite de caracteres por mensaje (opcional)</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                  <div><label className={LABEL}>Mensaje 1</label><input className={INPUT} type="number" min="0" value={form.maxCharsMensaje1} onChange={e => setF('maxCharsMensaje1', e.target.value)} placeholder="300" /></div>
                  <div><label className={LABEL}>Mensaje 2</label><input className={INPUT} type="number" min="0" value={form.maxCharsMensaje2} onChange={e => setF('maxCharsMensaje2', e.target.value)} placeholder="400" /></div>
                  <div><label className={LABEL}>Mensaje 3+</label><input className={INPUT} type="number" min="0" value={form.maxCharsMensaje3} onChange={e => setF('maxCharsMensaje3', e.target.value)} placeholder="500" /></div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label className={LABEL}>Delay follow-up 1 (minutos)</label>
                  <input className={INPUT} type="number" min="0" value={form.followUp1Delay} onChange={e => setF('followUp1Delay', e.target.value)} />
                </div>
                <div>
                  <label className={LABEL}>Delay follow-up 2 (minutos)</label>
                  <input className={INPUT} type="number" min="0" value={form.followUp2Delay} onChange={e => setF('followUp2Delay', e.target.value)} />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input type="checkbox" id="tpl-active" checked={form.active} onChange={e => setF('active', e.target.checked)} style={{ width: 16, height: 16, cursor: 'pointer' }} />
                <label htmlFor="tpl-active" style={{ fontSize: 13, color: '#6B7280', cursor: 'pointer' }}>Plantilla activa (visible para usuarios)</label>
              </div>

              <button onClick={save} disabled={saving}
                style={{ padding: '12px 0', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: saving ? 'not-allowed' : 'pointer', border: 'none',
                  background: saving ? 'rgba(255,255,255,0.06)' : 'linear-gradient(135deg, #D203DD, #00FF88)', color: saving ? '#6B7280' : '#000' }}>
                {saving ? 'Guardando...' : (editing ? 'Guardar cambios' : 'Crear plantilla')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ DELETE CONFIRM ═══ */}
      {deleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#0d1117', border: '1px solid #E4E9F0', borderRadius: 16, padding: 28, maxWidth: 380, width: '100%' }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 6 }}>¿Eliminar plantilla?</p>
            <p style={{ fontSize: 13, color: '#6B7280', fontWeight: 600, marginBottom: 4 }}>{deleteConfirm.name}</p>
            <p style={{ fontSize: 12, color: '#6B7280', marginBottom: 20 }}>Esta acción no se puede deshacer.</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setDeleteConfirm(null)} style={{ flex: 1, padding: '9px 0', borderRadius: 8, border: '1px solid #E4E9F0', background: 'transparent', color: '#6B7280', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>Cancelar</button>
              <button onClick={doDelete} disabled={deleting} style={{ flex: 1, padding: '9px 0', borderRadius: 8, border: 'none', background: '#ef4444', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
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
