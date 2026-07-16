'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  ShieldCheck,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  X,
  AlertTriangle,
  Ban,
  ArrowUpRight,
  Sparkles,
  Bot,
  ShieldPlus,
} from 'lucide-react'
import Link from 'next/link'
import { PageHeader, cardStyle, BRAND, BORDER, MUTED } from '../_ui'

// ── Tipos ──────────────────────────────────────────────────────────
type RuleType = 'FORBID' | 'ESCALATE' | 'REQUIRE_APPROVAL'

interface Rule {
  id: string
  agentId: string
  description: string
  type: RuleType
  isActive: boolean
  createdAt: string
  updatedAt: string
}

interface Agent {
  id: string
  name: string
  isActive: boolean
}

interface RuleForm {
  description: string
  type: RuleType
}

// ── Meta visual por tipo de regla ──────────────────────────────────
const TYPE_META: Record<RuleType, { label: string; color: string; tint: string; icon: LucideIcon }> = {
  FORBID: { label: 'Prohibido', color: '#DC2626', tint: 'rgba(220,38,38,0.10)', icon: Ban },
  ESCALATE: { label: 'Escalar', color: '#D97706', tint: 'rgba(217,119,6,0.12)', icon: ArrowUpRight },
  REQUIRE_APPROVAL: { label: 'Requiere aprobación', color: '#147e95', tint: 'rgba(0,229,208,0.12)', icon: ShieldCheck },
}

const TYPE_OPTIONS: { value: RuleType; label: string; hint: string }[] = [
  { value: 'FORBID', label: 'Prohibido', hint: 'El agente nunca debe hacerlo' },
  { value: 'ESCALATE', label: 'Escalar', hint: 'Derivar el caso a una persona' },
  { value: 'REQUIRE_APPROVAL', label: 'Requiere aprobación', hint: 'Pedir permiso antes de actuar' },
]

const EMPTY_FORM: RuleForm = { description: '', type: 'FORBID' }

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

export default function DiamondAssistantReglas() {
  // Agentes (selector)
  const [agents, setAgents] = useState<Agent[]>([])
  const [agentsLoading, setAgentsLoading] = useState(true)
  const [agentsError, setAgentsError] = useState<string | null>(null)
  const [selectedAgentId, setSelectedAgentId] = useState<string>('')

  // Reglas del agente seleccionado
  const [rules, setRules] = useState<Rule[]>([])
  const [rulesLoading, setRulesLoading] = useState(false)
  const [rulesError, setRulesError] = useState<string | null>(null)

  // Modal crear/editar
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<RuleForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Modal eliminar
  const [deleteTarget, setDeleteTarget] = useState<Rule | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Cargar reglas recomendadas
  const [presetLoading, setPresetLoading] = useState(false)

  const selectedAgent = useMemo(
    () => agents.find((a) => a.id === selectedAgentId) ?? null,
    [agents, selectedAgentId],
  )

  // ── Cargar agentes ───────────────────────────────────────────────
  const fetchAgents = useCallback(async () => {
    setAgentsLoading(true)
    setAgentsError(null)
    try {
      const res = await fetch('/api/admin/diamond-assistant/agents')
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.ok) {
        setAgentsError(data.error ?? 'No se pudieron cargar los agentes.')
        setAgents([])
        return
      }
      const list: Agent[] = data.data ?? []
      setAgents(list)
      // Auto-selecciona el primero si aún no hay selección.
      setSelectedAgentId((prev) => (prev && list.some((a) => a.id === prev) ? prev : list[0]?.id ?? ''))
    } catch {
      setAgentsError('Error de conexión al cargar los agentes.')
      setAgents([])
    } finally {
      setAgentsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAgents()
  }, [fetchAgents])

  // ── Cargar reglas del agente ─────────────────────────────────────
  const fetchRules = useCallback(async (agentId: string) => {
    if (!agentId) {
      setRules([])
      return
    }
    setRulesLoading(true)
    setRulesError(null)
    try {
      const res = await fetch(`/api/admin/diamond-assistant/rules?agentId=${encodeURIComponent(agentId)}`)
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.ok) {
        setRulesError(data.error ?? 'No se pudieron cargar las reglas.')
        setRules([])
        return
      }
      setRules(data.data ?? [])
    } catch {
      setRulesError('Error de conexión al cargar las reglas.')
      setRules([])
    } finally {
      setRulesLoading(false)
    }
  }, [])

  useEffect(() => {
    if (selectedAgentId) fetchRules(selectedAgentId)
    else setRules([])
  }, [selectedAgentId, fetchRules])

  // ── Crear / editar regla ─────────────────────────────────────────
  function openCreate() {
    if (!selectedAgentId) return
    setEditingId(null)
    setForm(EMPTY_FORM)
    setFormError(null)
    setModalOpen(true)
  }

  function openEdit(rule: Rule) {
    setEditingId(rule.id)
    setForm({ description: rule.description, type: rule.type })
    setFormError(null)
    setModalOpen(true)
  }

  function closeModal() {
    if (saving) return
    setModalOpen(false)
  }

  async function saveRule() {
    if (!form.description.trim()) {
      setFormError('La descripción es obligatoria.')
      return
    }
    if (!selectedAgentId) {
      setFormError('Selecciona un agente primero.')
      return
    }
    setSaving(true)
    setFormError(null)

    try {
      const url = editingId
        ? `/api/admin/diamond-assistant/rules/${editingId}`
        : '/api/admin/diamond-assistant/rules'
      const payload = editingId
        ? { description: form.description.trim(), type: form.type }
        : { agentId: selectedAgentId, description: form.description.trim(), type: form.type }
      const res = await fetch(url, {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.ok) {
        setFormError(data.error ?? 'No se pudo guardar la regla.')
        return
      }
      setModalOpen(false)
      await fetchRules(selectedAgentId)
    } catch {
      setFormError('Error de conexión al guardar.')
    } finally {
      setSaving(false)
    }
  }

  // ── Alternar activo (optimista) ──────────────────────────────────
  async function toggleActive(rule: Rule) {
    const next = !rule.isActive
    setRules((prev) => prev.map((r) => (r.id === rule.id ? { ...r, isActive: next } : r)))
    try {
      const res = await fetch(`/api/admin/diamond-assistant/rules/${rule.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: next }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.ok) throw new Error(data.error ?? 'error')
    } catch {
      // Revertir en caso de fallo.
      setRules((prev) => prev.map((r) => (r.id === rule.id ? { ...r, isActive: rule.isActive } : r)))
      alert('No se pudo actualizar el estado de la regla.')
    }
  }

  // ── Eliminar regla ───────────────────────────────────────────────
  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/diamond-assistant/rules/${deleteTarget.id}`, {
        method: 'DELETE',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.ok) {
        alert(data.error ?? 'No se pudo eliminar la regla.')
        return
      }
      setDeleteTarget(null)
      await fetchRules(selectedAgentId)
    } catch {
      alert('Error de conexión al eliminar.')
    } finally {
      setDeleting(false)
    }
  }

  // ── Cargar reglas recomendadas (preset) ──────────────────────────
  async function loadPreset() {
    if (!selectedAgentId) return
    setPresetLoading(true)
    try {
      const res = await fetch('/api/admin/diamond-assistant/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: selectedAgentId, preset: true }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.ok) {
        alert(data.error ?? 'No se pudieron cargar las reglas recomendadas.')
        return
      }
      setRules(data.data ?? [])
    } catch {
      alert('Error de conexión al cargar las reglas recomendadas.')
    } finally {
      setPresetLoading(false)
    }
  }

  const hasAgents = agents.length > 0

  return (
    <div>
      <PageHeader
        icon={ShieldCheck}
        title="Reglas de seguridad"
        description="Límites del agente: no prometer curas ni ganancias, no spam, respetar horarios, derivar a Marco y aprobar envíos masivos"
        action={
          <button
            onClick={openCreate}
            disabled={!selectedAgentId}
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
              cursor: selectedAgentId ? 'pointer' : 'not-allowed',
              opacity: selectedAgentId ? 1 : 0.5,
              boxShadow: '0 8px 20px rgba(0,229,208,0.24)',
            }}
          >
            <Plus size={15} /> Agregar regla
          </button>
        }
      />

      {/* ── Estado global de agentes ──────────────────────────────── */}
      {agentsLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '64px 0' }}>
          <Loader2 size={24} className="animate-spin" style={{ color: '#147e95' }} />
        </div>
      ) : agentsError ? (
        <ErrorBox message={agentsError} />
      ) : !hasAgents ? (
        // Guía: crear un agente primero.
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
          <p style={{ fontSize: 15, fontWeight: 800, margin: 0 }}>Primero crea un agente</p>
          <p style={{ fontSize: 13, color: MUTED, margin: '6px auto 16px', lineHeight: 1.55, maxWidth: 360 }}>
            Las reglas de seguridad se aplican a un agente. Crea uno para poder definir sus límites.
          </p>
          <Link
            href="/admin/diamond-assistant/agentes"
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
              textDecoration: 'none',
              boxShadow: '0 8px 20px rgba(0,229,208,0.24)',
            }}
          >
            <Plus size={15} /> Ir a crear un agente
          </Link>
        </div>
      ) : (
        <>
          {/* ── Barra: selector de agente + acción recomendadas ────── */}
          <div
            style={{
              ...cardStyle,
              display: 'flex',
              alignItems: 'flex-end',
              gap: 12,
              flexWrap: 'wrap',
              marginBottom: 16,
            }}
          >
            <div style={{ flex: 1, minWidth: 220 }}>
              <label style={labelStyle}>Agente</label>
              <select
                value={selectedAgentId}
                onChange={(e) => setSelectedAgentId(e.target.value)}
                style={{ ...inputStyle, cursor: 'pointer' }}
              >
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                    {a.isActive ? '' : ' (inactivo)'}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={loadPreset}
              disabled={presetLoading || !selectedAgentId}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                padding: '10px 16px',
                borderRadius: 12,
                fontSize: 13,
                fontWeight: 800,
                color: '#233B8F',
                background: 'rgba(35,59,143,0.08)',
                border: '1px solid rgba(35,59,143,0.20)',
                cursor: presetLoading || !selectedAgentId ? 'default' : 'pointer',
                opacity: presetLoading || !selectedAgentId ? 0.6 : 1,
              }}
            >
              {presetLoading ? <Loader2 size={15} className="animate-spin" /> : <ShieldPlus size={15} />}
              Cargar reglas recomendadas
            </button>
          </div>

          {/* ── Lista de reglas ─────────────────────────────────────── */}
          {rulesLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
              <Loader2 size={22} className="animate-spin" style={{ color: '#147e95' }} />
            </div>
          ) : rulesError ? (
            <ErrorBox message={rulesError} />
          ) : rules.length === 0 ? (
            <div style={{ ...cardStyle, textAlign: 'center', padding: '44px 24px' }}>
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
                <ShieldCheck size={26} style={{ color: '#147e95' }} />
              </div>
              <p style={{ fontSize: 15, fontWeight: 800, margin: 0 }}>
                {selectedAgent ? `${selectedAgent.name} aún no tiene reglas` : 'Aún no hay reglas'}
              </p>
              <p style={{ fontSize: 13, color: MUTED, margin: '6px auto 16px', lineHeight: 1.55, maxWidth: 380 }}>
                Define los límites de seguridad de este agente, o carga el set recomendado y ajústalo a tu gusto.
              </p>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                  onClick={loadPreset}
                  disabled={presetLoading}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 7,
                    padding: '9px 16px',
                    borderRadius: 10,
                    fontSize: 13,
                    fontWeight: 800,
                    color: '#233B8F',
                    background: 'rgba(35,59,143,0.08)',
                    border: '1px solid rgba(35,59,143,0.20)',
                    cursor: presetLoading ? 'default' : 'pointer',
                    opacity: presetLoading ? 0.6 : 1,
                  }}
                >
                  {presetLoading ? <Loader2 size={15} className="animate-spin" /> : <ShieldPlus size={15} />}
                  Cargar recomendadas
                </button>
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
                  <Plus size={15} /> Agregar regla
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {rules.map((rule) => {
                const meta = TYPE_META[rule.type]
                const Icon = meta.icon
                return (
                  <div
                    key={rule.id}
                    style={{
                      ...cardStyle,
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 12,
                      opacity: rule.isActive ? 1 : 0.62,
                    }}
                  >
                    {/* Icono de tipo */}
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 11,
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: meta.tint,
                      }}
                    >
                      <Icon size={18} style={{ color: meta.color }} />
                    </div>

                    {/* Contenido */}
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 5 }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            fontSize: 10,
                            fontWeight: 800,
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                            padding: '3px 9px',
                            borderRadius: 999,
                            color: meta.color,
                            background: meta.tint,
                          }}
                        >
                          <Icon size={11} />
                          {meta.label}
                        </span>
                        {!rule.isActive && (
                          <span
                            style={{
                              fontSize: 9.5,
                              fontWeight: 800,
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                              color: '#9CA3AF',
                              background: '#F0F3F7',
                              padding: '3px 8px',
                              borderRadius: 999,
                            }}
                          >
                            Pausada
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: 13.5, color: '#111827', margin: 0, lineHeight: 1.5 }}>
                        {rule.description}
                      </p>
                    </div>

                    {/* Acciones */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      <button
                        onClick={() => toggleActive(rule)}
                        aria-label="Alternar activa"
                        title={rule.isActive ? 'Desactivar regla' : 'Activar regla'}
                        style={{
                          position: 'relative',
                          width: 44,
                          height: 24,
                          borderRadius: 999,
                          border: 'none',
                          cursor: 'pointer',
                          flexShrink: 0,
                          background: rule.isActive ? '#16A34A' : '#D1D5DB',
                          transition: 'background 0.15s',
                        }}
                      >
                        <span
                          style={{
                            position: 'absolute',
                            top: 3,
                            left: rule.isActive ? 23 : 3,
                            width: 18,
                            height: 18,
                            borderRadius: 999,
                            background: '#fff',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                            transition: 'left 0.15s',
                          }}
                        />
                      </button>
                      <button
                        onClick={() => openEdit(rule)}
                        title="Editar regla"
                        style={{ padding: 7, borderRadius: 9, background: '#F4F6FA', border: `1px solid ${BORDER}`, cursor: 'pointer' }}
                      >
                        <Pencil size={13} style={{ color: '#233B8F' }} />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(rule)}
                        title="Eliminar regla"
                        style={{ padding: 7, borderRadius: 9, background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)', cursor: 'pointer' }}
                      >
                        <Trash2 size={13} style={{ color: '#DC2626' }} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* ── Modal crear / editar ─────────────────────────────────────── */}
      {modalOpen && (
        <div style={overlayStyle}>
          <div style={backdropStyle} onClick={closeModal} />
          <div style={{ ...modalCardStyle, maxWidth: 520 }}>
            <div style={modalHeaderStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <div style={{ width: 36, height: 36, borderRadius: 11, background: BRAND, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <ShieldCheck size={17} className="text-white" />
                </div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 800, margin: 0 }}>
                    {editingId ? 'Editar regla' : 'Nueva regla'}
                  </p>
                  <p style={{ fontSize: 11, color: MUTED, margin: 0 }}>
                    {selectedAgent ? selectedAgent.name : 'Límite de seguridad del agente'}
                  </p>
                </div>
              </div>
              <button onClick={closeModal} style={iconBtnStyle}>
                <X size={16} style={{ color: '#6B7280' }} />
              </button>
            </div>

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

              {/* Descripción */}
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Descripción de la regla</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Ej. No prometer curas ni resultados médicos."
                  rows={4}
                  style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.55, fontFamily: 'inherit', minHeight: 96 }}
                />
              </div>

              {/* Tipo */}
              <div>
                <label style={labelStyle}>Tipo de regla</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {TYPE_OPTIONS.map((opt) => {
                    const meta = TYPE_META[opt.value]
                    const OptIcon = meta.icon
                    const active = form.type === opt.value
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setForm((p) => ({ ...p, type: opt.value }))}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          textAlign: 'left',
                          padding: '10px 12px',
                          borderRadius: 12,
                          background: active ? meta.tint : '#F8FAFC',
                          border: `1.5px solid ${active ? meta.color : BORDER}`,
                          cursor: 'pointer',
                        }}
                      >
                        <div
                          style={{
                            width: 30,
                            height: 30,
                            borderRadius: 9,
                            flexShrink: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: meta.tint,
                          }}
                        >
                          <OptIcon size={15} style={{ color: meta.color }} />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 800, margin: 0, color: active ? meta.color : '#111827' }}>
                            {opt.label}
                          </p>
                          <p style={{ fontSize: 11, color: MUTED, margin: 0 }}>{opt.hint}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            <div style={modalFooterStyle}>
              <button onClick={closeModal} disabled={saving} style={secondaryBtnStyle}>
                Cancelar
              </button>
              <button
                onClick={saveRule}
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
                {saving ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={14} />}
                {editingId ? 'Guardar cambios' : 'Crear regla'}
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
              <h3 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 4px' }}>Eliminar regla</h3>
              <p style={{ fontSize: 13, color: MUTED, margin: '0 0 10px' }}>Estás a punto de eliminar esta regla:</p>
              <p
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  margin: '0 0 18px',
                  color: '#111827',
                  background: '#F8FAFC',
                  border: `1px solid ${BORDER}`,
                  borderRadius: 12,
                  padding: '10px 12px',
                  lineHeight: 1.5,
                }}
              >
                {deleteTarget.description}
              </p>

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

// ── Caja de error reutilizable ─────────────────────────────────────
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
