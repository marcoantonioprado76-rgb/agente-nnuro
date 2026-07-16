'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import {
  BrainCircuit,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  X,
  AlertTriangle,
  Tag,
  BookOpen,
  Bot,
  Sparkles,
  Save,
} from 'lucide-react'
import { PageHeader, CardGrid, cardStyle, BRAND, BORDER, MUTED, ACCENTS } from '../_ui'

// ── Tipos ──────────────────────────────────────────────────────────
interface Agent {
  id: string
  name: string
  isActive: boolean
}

interface KnowledgeItem {
  id: string
  agentId: string
  title: string
  content: string
  category: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

interface KnowledgeForm {
  title: string
  category: string
  content: string
  isActive: boolean
}

const EMPTY_FORM: KnowledgeForm = {
  title: '',
  category: '',
  content: '',
  isActive: true,
}

// ── Estilos reutilizables (on-brand, tema claro) ───────────────────
const inputStyle: CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 12,
  background: '#F8FAFC',
  border: `1px solid ${BORDER}`,
  fontSize: 13.5,
  color: '#111827',
  outline: 'none',
}
const labelStyle: CSSProperties = {
  display: 'block',
  fontSize: 10.5,
  fontWeight: 800,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: '#9CA3AF',
  marginBottom: 6,
}

// Color determinista para el chip de categoría (a partir de su texto).
function accentForCategory(category: string) {
  let hash = 0
  for (let i = 0; i < category.length; i++) hash = (hash * 31 + category.charCodeAt(i)) >>> 0
  return ACCENTS[hash % ACCENTS.length]
}

export default function DiamondAssistantConocimiento() {
  // Agentes
  const [agents, setAgents] = useState<Agent[]>([])
  const [loadingAgents, setLoadingAgents] = useState(true)
  const [agentsError, setAgentsError] = useState<string | null>(null)
  const [selectedAgentId, setSelectedAgentId] = useState<string>('')

  // Conocimiento del agente seleccionado
  const [items, setItems] = useState<KnowledgeItem[]>([])
  const [loadingItems, setLoadingItems] = useState(false)
  const [itemsError, setItemsError] = useState<string | null>(null)

  // Modal crear/editar
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<KnowledgeForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Modal eliminar
  const [deleteTarget, setDeleteTarget] = useState<KnowledgeItem | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Toggle activo por ítem (id que se está actualizando)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const selectedAgent = useMemo(
    () => agents.find((a) => a.id === selectedAgentId) ?? null,
    [agents, selectedAgentId],
  )

  // ── Cargar agentes ───────────────────────────────────────────────
  const fetchAgents = useCallback(async () => {
    setLoadingAgents(true)
    setAgentsError(null)
    try {
      const res = await fetch('/api/admin/diamond-assistant/agents')
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.ok) {
        setAgentsError(data.error ?? 'No se pudieron cargar los agentes.')
        setAgents([])
        return
      }
      // El endpoint devuelve { ok, data: [...] } (aceptamos también { agents }).
      const list: Agent[] = data.data ?? data.agents ?? []
      setAgents(list)
      // Autoseleccionamos el primero si aún no hay ninguno elegido.
      setSelectedAgentId((prev) => prev || list[0]?.id || '')
    } catch {
      setAgentsError('Error de conexión al cargar los agentes.')
      setAgents([])
    } finally {
      setLoadingAgents(false)
    }
  }, [])

  useEffect(() => {
    fetchAgents()
  }, [fetchAgents])

  // ── Cargar conocimiento del agente seleccionado ──────────────────
  const fetchItems = useCallback(async (agentId: string) => {
    setLoadingItems(true)
    setItemsError(null)
    try {
      const res = await fetch(
        `/api/admin/diamond-assistant/knowledge?agentId=${encodeURIComponent(agentId)}`,
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.ok) {
        setItemsError(data.error ?? 'No se pudo cargar el conocimiento.')
        setItems([])
        return
      }
      setItems(data.data ?? [])
    } catch {
      setItemsError('Error de conexión al cargar el conocimiento.')
      setItems([])
    } finally {
      setLoadingItems(false)
    }
  }, [])

  useEffect(() => {
    if (selectedAgentId) fetchItems(selectedAgentId)
    else setItems([])
  }, [selectedAgentId, fetchItems])

  // ── Acciones ─────────────────────────────────────────────────────
  function openCreate() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setFormError(null)
    setModalOpen(true)
  }

  function openEdit(item: KnowledgeItem) {
    setEditingId(item.id)
    setForm({
      title: item.title,
      category: item.category ?? '',
      content: item.content,
      isActive: item.isActive,
    })
    setFormError(null)
    setModalOpen(true)
  }

  function closeModal() {
    if (saving) return
    setModalOpen(false)
  }

  async function saveItem() {
    if (!selectedAgentId) {
      setFormError('Selecciona un agente primero.')
      return
    }
    if (!form.title.trim()) {
      setFormError('El título es obligatorio.')
      return
    }
    if (!form.content.trim()) {
      setFormError('El contenido es obligatorio.')
      return
    }
    setSaving(true)
    setFormError(null)

    try {
      const url = editingId
        ? `/api/admin/diamond-assistant/knowledge/${editingId}`
        : '/api/admin/diamond-assistant/knowledge'
      // En creación mandamos agentId; el category vacío se envía null para limpiar.
      const payload: Record<string, unknown> = editingId
        ? {
            title: form.title.trim(),
            content: form.content.trim(),
            category: form.category.trim() || null,
            isActive: form.isActive,
          }
        : {
            agentId: selectedAgentId,
            title: form.title.trim(),
            content: form.content.trim(),
            isActive: form.isActive,
            ...(form.category.trim() ? { category: form.category.trim() } : {}),
          }

      const res = await fetch(url, {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.ok) {
        setFormError(data.error ?? 'No se pudo guardar el conocimiento.')
        return
      }
      setModalOpen(false)
      await fetchItems(selectedAgentId)
    } catch {
      setFormError('Error de conexión al guardar.')
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(item: KnowledgeItem) {
    setTogglingId(item.id)
    // Optimista: reflejamos el cambio y revertimos si falla.
    setItems((prev) =>
      prev.map((it) => (it.id === item.id ? { ...it, isActive: !it.isActive } : it)),
    )
    try {
      const res = await fetch(`/api/admin/diamond-assistant/knowledge/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !item.isActive }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.ok) {
        // Revertir
        setItems((prev) =>
          prev.map((it) => (it.id === item.id ? { ...it, isActive: item.isActive } : it)),
        )
      }
    } catch {
      setItems((prev) =>
        prev.map((it) => (it.id === item.id ? { ...it, isActive: item.isActive } : it)),
      )
    } finally {
      setTogglingId(null)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/diamond-assistant/knowledge/${deleteTarget.id}`, {
        method: 'DELETE',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.ok) {
        alert(data.error ?? 'No se pudo eliminar el ítem.')
        return
      }
      setDeleteTarget(null)
      if (selectedAgentId) await fetchItems(selectedAgentId)
    } catch {
      alert('Error de conexión al eliminar.')
    } finally {
      setDeleting(false)
    }
  }

  // ── Render ───────────────────────────────────────────────────────
  const hasAgents = agents.length > 0

  return (
    <div>
      <PageHeader
        icon={BrainCircuit}
        title="Conocimiento"
        description="Base de conocimiento entrenable que alimenta las respuestas del agente IA"
        action={
          hasAgents && selectedAgentId ? (
            <button
              onClick={openCreate}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                padding: '9px 16px',
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 800,
                color: '#fff',
                background: BRAND,
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 8px 20px rgba(0,229,208,0.24)',
              }}
            >
              <Plus size={15} /> Agregar conocimiento
            </button>
          ) : undefined
        }
      />

      {/* ── Carga de agentes ────────────────────────────────────────── */}
      {loadingAgents ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '64px 0' }}>
          <Loader2 size={24} className="animate-spin" style={{ color: '#147e95' }} />
        </div>
      ) : agentsError ? (
        <ErrorBox message={agentsError} />
      ) : !hasAgents ? (
        // Sin agentes: guiar a crear uno primero.
        <div style={{ ...cardStyle, textAlign: 'center', padding: '48px 24px' }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              margin: '0 auto 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(0,229,208,0.10)',
            }}
          >
            <Bot size={26} style={{ color: '#147e95' }} />
          </div>
          <p style={{ fontSize: 15, fontWeight: 800, margin: 0 }}>Aún no hay agentes</p>
          <p style={{ fontSize: 13, color: MUTED, margin: '6px 0 0', lineHeight: 1.55, maxWidth: 420, marginInline: 'auto' }}>
            El conocimiento se asocia a un agente. Crea primero un agente en la pestaña{' '}
            <strong>Agentes</strong> y luego vuelve aquí para entrenarlo.
          </p>
        </div>
      ) : (
        <>
          {/* ── Selector de agente ────────────────────────────────────── */}
          <div style={{ ...cardStyle, marginBottom: 18, padding: 16 }}>
            <label style={labelStyle}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Bot size={12} style={{ color: '#147e95' }} /> Agente a entrenar
              </span>
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <select
                value={selectedAgentId}
                onChange={(e) => setSelectedAgentId(e.target.value)}
                style={{ ...inputStyle, cursor: 'pointer', maxWidth: 360 }}
              >
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                    {a.isActive ? '' : ' (inactivo)'}
                  </option>
                ))}
              </select>
              {selectedAgent && (
                <span style={{ fontSize: 12, color: MUTED }}>
                  {items.length} {items.length === 1 ? 'ítem de conocimiento' : 'ítems de conocimiento'}
                </span>
              )}
            </div>
          </div>

          {/* ── Lista de conocimiento ─────────────────────────────────── */}
          {loadingItems ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
              <Loader2 size={22} className="animate-spin" style={{ color: '#147e95' }} />
            </div>
          ) : itemsError ? (
            <ErrorBox message={itemsError} />
          ) : items.length === 0 ? (
            <div style={{ ...cardStyle, textAlign: 'center', padding: '48px 24px' }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 16,
                  margin: '0 auto 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(35,59,143,0.10)',
                }}
              >
                <BookOpen size={26} style={{ color: '#233B8F' }} />
              </div>
              <p style={{ fontSize: 15, fontWeight: 800, margin: 0 }}>
                Este agente aún no tiene conocimiento
              </p>
              <p style={{ fontSize: 13, color: MUTED, margin: '6px 0 16px', lineHeight: 1.55 }}>
                Agrega info de Fase Global, productos, eventos, reto 90D, horarios, links y reglas de
                respuesta para que responda con datos fiables.
              </p>
              <button
                onClick={openCreate}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 7,
                  padding: '9px 18px',
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 800,
                  color: '#fff',
                  background: BRAND,
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 8px 20px rgba(0,229,208,0.24)',
                }}
              >
                <Plus size={15} /> Agregar conocimiento
              </button>
            </div>
          ) : (
            <CardGrid min={280}>
              {items.map((item) => {
                const chip = item.category ? accentForCategory(item.category) : null
                const isToggling = togglingId === item.id
                return (
                  <div key={item.id} style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: 11 }}>
                    {/* Encabezado */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <p
                          style={{
                            fontSize: 14.5,
                            fontWeight: 800,
                            margin: 0,
                            lineHeight: 1.25,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {item.title}
                        </p>
                        {item.category && chip && (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              marginTop: 7,
                              fontSize: 10.5,
                              fontWeight: 800,
                              padding: '3px 9px',
                              borderRadius: 999,
                              color: chip.color,
                              background: chip.tint,
                            }}
                          >
                            <Tag size={11} />
                            {item.category}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                        <button
                          onClick={() => openEdit(item)}
                          title="Editar"
                          style={{ padding: 7, borderRadius: 9, background: '#F4F6FA', border: `1px solid ${BORDER}`, cursor: 'pointer' }}
                        >
                          <Pencil size={13} style={{ color: '#233B8F' }} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(item)}
                          title="Eliminar"
                          style={{ padding: 7, borderRadius: 9, background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)', cursor: 'pointer' }}
                        >
                          <Trash2 size={13} style={{ color: '#DC2626' }} />
                        </button>
                      </div>
                    </div>

                    {/* Extracto del contenido */}
                    <p
                      style={{
                        fontSize: 12.5,
                        color: MUTED,
                        margin: 0,
                        lineHeight: 1.55,
                        display: '-webkit-box',
                        WebkitLineClamp: 4,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {item.content}
                    </p>

                    {/* Toggle activo */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 10,
                        marginTop: 'auto',
                        paddingTop: 10,
                        borderTop: `1px solid ${BORDER}`,
                      }}
                    >
                      <span style={{ fontSize: 12, fontWeight: 700, color: item.isActive ? '#16A34A' : '#9CA3AF' }}>
                        {item.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                      <button
                        onClick={() => toggleActive(item)}
                        disabled={isToggling}
                        aria-label="Alternar activo"
                        style={{
                          position: 'relative',
                          width: 44,
                          height: 24,
                          borderRadius: 999,
                          border: 'none',
                          cursor: isToggling ? 'default' : 'pointer',
                          flexShrink: 0,
                          opacity: isToggling ? 0.6 : 1,
                          background: item.isActive ? '#16A34A' : '#D1D5DB',
                          transition: 'background 0.15s',
                        }}
                      >
                        <span
                          style={{
                            position: 'absolute',
                            top: 3,
                            left: item.isActive ? 23 : 3,
                            width: 18,
                            height: 18,
                            borderRadius: 999,
                            background: '#fff',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                            transition: 'left 0.15s',
                          }}
                        />
                      </button>
                    </div>
                  </div>
                )
              })}
            </CardGrid>
          )}
        </>
      )}

      {/* ── Modal crear / editar ─────────────────────────────────────── */}
      {modalOpen && (
        <div style={overlayStyle}>
          <div style={backdropStyle} onClick={closeModal} />
          <div style={{ ...modalCardStyle, maxWidth: 560 }}>
            {/* Header */}
            <div style={modalHeaderStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <div style={{ width: 36, height: 36, borderRadius: 11, background: BRAND, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <BrainCircuit size={17} className="text-white" />
                </div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 800, margin: 0 }}>
                    {editingId ? 'Editar conocimiento' : 'Agregar conocimiento'}
                  </p>
                  <p style={{ fontSize: 11, color: MUTED, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {selectedAgent ? `Para ${selectedAgent.name}` : 'Base de conocimiento del agente'}
                  </p>
                </div>
              </div>
              <button onClick={closeModal} style={iconBtnStyle}>
                <X size={16} style={{ color: '#6B7280' }} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: 20, overflowY: 'auto' }}>
              {formError && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 8,
                    background: 'rgba(220,38,38,0.06)',
                    border: '1px solid rgba(220,38,38,0.2)',
                    borderRadius: 12,
                    padding: '10px 12px',
                    marginBottom: 16,
                  }}
                >
                  <AlertTriangle size={14} style={{ color: '#DC2626', flexShrink: 0, marginTop: 1 }} />
                  <p style={{ fontSize: 12, color: '#DC2626', margin: 0, lineHeight: 1.4 }}>{formError}</p>
                </div>
              )}

              {/* Título + Categoría */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={labelStyle}>Título</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                    placeholder="Ej. Horarios de atención"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>
                    Categoría{' '}
                    <span style={{ textTransform: 'none', fontWeight: 600, color: '#B0B7C3' }}>· opcional</span>
                  </label>
                  <input
                    type="text"
                    value={form.category}
                    onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                    placeholder="Ej. Productos, Eventos, Reto 90D, Links..."
                    style={inputStyle}
                  />
                </div>
              </div>

              {/* Contenido */}
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>
                  Contenido{' '}
                  <span style={{ textTransform: 'none', fontWeight: 600, color: '#B0B7C3' }}>
                    · lo que el agente aprenderá
                  </span>
                </label>
                <textarea
                  value={form.content}
                  onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))}
                  placeholder="Escribe aquí la información: datos de la Fase Global, catálogo de productos, fechas de eventos, reglas del reto 90D, horarios, links oficiales, reglas de cómo debe responder..."
                  rows={9}
                  style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.55, fontFamily: 'inherit', minHeight: 180 }}
                />
              </div>

              {/* Activo (toggle) */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  padding: '11px 14px',
                  borderRadius: 12,
                  background: '#F8FAFC',
                  border: `1px solid ${BORDER}`,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>Conocimiento activo</p>
                  <p style={{ fontSize: 11, color: MUTED, margin: 0 }}>Si está inactivo, el agente no lo usa al responder.</p>
                </div>
                <button
                  onClick={() => setForm((p) => ({ ...p, isActive: !p.isActive }))}
                  aria-label="Alternar activo"
                  style={{
                    position: 'relative',
                    width: 44,
                    height: 24,
                    borderRadius: 999,
                    border: 'none',
                    cursor: 'pointer',
                    flexShrink: 0,
                    background: form.isActive ? '#16A34A' : '#D1D5DB',
                    transition: 'background 0.15s',
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      top: 3,
                      left: form.isActive ? 23 : 3,
                      width: 18,
                      height: 18,
                      borderRadius: 999,
                      background: '#fff',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                      transition: 'left 0.15s',
                    }}
                  />
                </button>
              </div>
            </div>

            {/* Footer */}
            <div style={modalFooterStyle}>
              <button onClick={closeModal} disabled={saving} style={secondaryBtnStyle}>
                Cancelar
              </button>
              <button
                onClick={saveItem}
                disabled={saving}
                style={{
                  flex: 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '11px 16px',
                  borderRadius: 12,
                  fontSize: 13.5,
                  fontWeight: 800,
                  color: '#fff',
                  background: BRAND,
                  border: 'none',
                  cursor: saving ? 'default' : 'pointer',
                  opacity: saving ? 0.6 : 1,
                  boxShadow: '0 8px 20px rgba(0,229,208,0.24)',
                }}
              >
                {saving ? <Loader2 size={15} className="animate-spin" /> : editingId ? <Save size={14} /> : <Sparkles size={14} />}
                {editingId ? 'Guardar cambios' : 'Agregar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal eliminar ───────────────────────────────────────────── */}
      {deleteTarget && (
        <div style={overlayStyle}>
          <div style={backdropStyle} onClick={() => !deleting && setDeleteTarget(null)} />
          <div style={{ ...modalCardStyle, maxWidth: 400 }}>
            <div style={{ padding: 24, textAlign: 'center' }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 16,
                  margin: '0 auto 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(220,38,38,0.08)',
                  border: '1px solid rgba(220,38,38,0.2)',
                }}
              >
                <AlertTriangle size={26} style={{ color: '#DC2626' }} />
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 4px' }}>Eliminar conocimiento</h3>
              <p style={{ fontSize: 13, color: MUTED, margin: '0 0 2px' }}>Estás a punto de eliminar</p>
              <p
                style={{
                  fontSize: 14,
                  fontWeight: 800,
                  margin: '0 0 16px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {deleteTarget.title}
              </p>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 8,
                  textAlign: 'left',
                  background: 'rgba(220,38,38,0.05)',
                  border: '1px solid rgba(220,38,38,0.15)',
                  borderRadius: 12,
                  padding: '10px 12px',
                  marginBottom: 20,
                }}
              >
                <AlertTriangle size={13} style={{ color: '#DC2626', flexShrink: 0, marginTop: 1 }} />
                <p style={{ fontSize: 11.5, color: '#B91C1C', margin: 0, lineHeight: 1.5 }}>
                  Esta acción es <strong>irreversible</strong>. El agente dejará de contar con esta información.
                </p>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setDeleteTarget(null)} disabled={deleting} style={secondaryBtnStyle}>
                  Cancelar
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={deleting}
                  style={{
                    flex: 1,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    padding: '11px 16px',
                    borderRadius: 12,
                    fontSize: 13.5,
                    fontWeight: 800,
                    color: '#fff',
                    background: '#DC2626',
                    border: 'none',
                    cursor: deleting ? 'default' : 'pointer',
                    opacity: deleting ? 0.6 : 1,
                  }}
                >
                  {deleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={14} />}
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Bloque de error reutilizable ───────────────────────────────────
function ErrorBox({ message }: { message: string }) {
  return (
    <div
      style={{
        ...cardStyle,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        borderColor: 'rgba(220,38,38,0.25)',
        background: 'rgba(220,38,38,0.04)',
      }}
    >
      <AlertTriangle size={16} style={{ color: '#DC2626' }} />
      <p style={{ fontSize: 13, color: '#DC2626', margin: 0 }}>{message}</p>
    </div>
  )
}

// ── Estilos de modal compartidos ───────────────────────────────────
const overlayStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 80,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 16,
}
const backdropStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  background: 'rgba(17,24,39,0.55)',
  backdropFilter: 'blur(3px)',
}
const modalCardStyle: CSSProperties = {
  position: 'relative',
  zIndex: 10,
  width: '100%',
  maxHeight: '90vh',
  display: 'flex',
  flexDirection: 'column',
  background: '#fff',
  border: `1px solid ${BORDER}`,
  borderRadius: 18,
  boxShadow: '0 24px 60px rgba(17,24,39,0.24)',
  overflow: 'hidden',
}
const modalHeaderStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  padding: '16px 20px',
  borderBottom: `1px solid ${BORDER}`,
  flexShrink: 0,
}
const modalFooterStyle: CSSProperties = {
  display: 'flex',
  gap: 8,
  padding: '14px 20px',
  borderTop: `1px solid ${BORDER}`,
  flexShrink: 0,
}
const iconBtnStyle: CSSProperties = {
  padding: 7,
  borderRadius: 9,
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
}
const secondaryBtnStyle: CSSProperties = {
  flex: 1,
  padding: '11px 16px',
  borderRadius: 12,
  fontSize: 13.5,
  fontWeight: 700,
  color: '#6B7280',
  background: '#F4F6FA',
  border: `1px solid ${BORDER}`,
  cursor: 'pointer',
}
