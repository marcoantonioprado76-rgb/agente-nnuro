'use client'

import { useCallback, useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import {
  Bot,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  X,
  AlertTriangle,
  KeyRound,
  Cpu,
  Zap,
  Sparkles,
  Radio,
  QrCode,
  CheckCircle2,
  Mic,
} from 'lucide-react'
import { PageHeader, CardGrid, cardStyle, BRAND, BORDER, MUTED } from '../_ui'
import { BOT_VOICES, VOICE_MODES, DEFAULT_VOICE_ID } from '@/lib/voices'

// ── Tipos ──────────────────────────────────────────────────────────
interface Agent {
  id: string
  name: string
  avatarUrl: string | null
  personalityPrompt: string
  model: string
  temperature: number
  provider: 'BAILEYS' | 'YCLOUD' | 'META'
  providerSender: string | null
  timezone: string
  isActive: boolean
  voiceEnabled: boolean
  voiceMode: 'off' | 'audio_in' | 'always'
  voiceId: string | null
  hasOpenaiKey: boolean
  hasProviderKey: boolean
  createdAt: string
  updatedAt: string
}

interface AgentForm {
  name: string
  personalityPrompt: string
  model: string
  provider: 'BAILEYS' | 'YCLOUD' | 'META'
  temperature: number
  openaiKey: string
  providerApiKey: string
  providerSender: string
  isActive: boolean
  voiceEnabled: boolean
  voiceMode: 'off' | 'audio_in' | 'always'
  voiceId: string
}

const MODEL_OPTIONS = [
  { value: 'gpt-4o', label: 'GPT-4o' },
  { value: 'gpt-4o-mini', label: 'GPT-4o mini' },
]

const PROVIDER_OPTIONS: { value: Agent['provider']; label: string }[] = [
  { value: 'BAILEYS', label: 'Baileys' },
  { value: 'YCLOUD', label: 'YCloud' },
  { value: 'META', label: 'Meta' },
]

const PROVIDER_STYLE: Record<Agent['provider'], { color: string; tint: string }> = {
  BAILEYS: { color: '#16A34A', tint: 'rgba(22,163,74,0.10)' },
  YCLOUD: { color: '#233B8F', tint: 'rgba(35,59,143,0.10)' },
  META: { color: '#147e95', tint: 'rgba(183,53,184,0.10)' },
}

// Etiquetas de los campos de credenciales por proveedor (solo API-based).
const PROVIDER_CRED_LABELS: Record<
  'YCLOUD' | 'META',
  { keyLabel: string; keyPlaceholder: string; senderLabel: string; senderPlaceholder: string }
> = {
  YCLOUD: {
    keyLabel: 'YCloud API Key',
    keyPlaceholder: 'Token de tu cuenta YCloud',
    senderLabel: 'Número de WhatsApp (sender)',
    senderPlaceholder: '+591 7XXXXXXX',
  },
  META: {
    keyLabel: 'Meta Access Token',
    keyPlaceholder: 'EAAG...',
    senderLabel: 'Phone Number ID',
    senderPlaceholder: 'Ej. 1234567890',
  },
}

const EMPTY_FORM: AgentForm = {
  name: '',
  personalityPrompt: '',
  model: 'gpt-4o',
  provider: 'BAILEYS',
  temperature: 0.4,
  openaiKey: '',
  providerApiKey: '',
  providerSender: '',
  isActive: true,
  voiceEnabled: false,
  voiceMode: 'audio_in',
  voiceId: DEFAULT_VOICE_ID,
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

export default function DiamondAssistantAgentes() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState<string | null>(null)

  // Modal crear/editar
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<AgentForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [editingHasKey, setEditingHasKey] = useState(false)
  const [editingHasProviderKey, setEditingHasProviderKey] = useState(false)

  // Modal eliminar
  const [deleteTarget, setDeleteTarget] = useState<Agent | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchAgents = useCallback(async () => {
    setLoading(true)
    setListError(null)
    try {
      const res = await fetch('/api/admin/diamond-assistant/agents')
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.ok) {
        setListError(data.error ?? 'No se pudieron cargar los agentes.')
        setAgents([])
        return
      }
      setAgents(data.data ?? [])
    } catch {
      setListError('Error de conexión al cargar los agentes.')
      setAgents([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAgents()
  }, [fetchAgents])

  function openCreate() {
    setEditingId(null)
    setEditingHasKey(false)
    setEditingHasProviderKey(false)
    setForm(EMPTY_FORM)
    setFormError(null)
    setModalOpen(true)
  }

  function openEdit(agent: Agent) {
    setEditingId(agent.id)
    setEditingHasKey(agent.hasOpenaiKey)
    setEditingHasProviderKey(agent.hasProviderKey)
    setForm({
      name: agent.name,
      personalityPrompt: agent.personalityPrompt,
      model: agent.model,
      provider: agent.provider,
      temperature: agent.temperature,
      openaiKey: '',
      providerApiKey: '',
      providerSender: agent.providerSender ?? '',
      isActive: agent.isActive,
      voiceEnabled: agent.voiceEnabled ?? false,
      voiceMode: agent.voiceMode ?? 'audio_in',
      voiceId: agent.voiceId ?? DEFAULT_VOICE_ID,
    })
    setFormError(null)
    setModalOpen(true)
  }

  function closeModal() {
    if (saving) return
    setModalOpen(false)
  }

  async function saveAgent() {
    if (!form.name.trim()) {
      setFormError('El nombre es obligatorio.')
      return
    }
    if (!form.personalityPrompt.trim()) {
      setFormError('La personalidad es obligatoria.')
      return
    }
    setSaving(true)
    setFormError(null)

    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      personalityPrompt: form.personalityPrompt.trim(),
      model: form.model,
      provider: form.provider,
      temperature: form.temperature,
      isActive: form.isActive,
      voiceEnabled: form.voiceEnabled,
      voiceMode: form.voiceMode,
      voiceId: form.voiceId || null,
    }
    // Solo enviamos la key si el admin escribió una nueva (blanco = conservar).
    if (form.openaiKey.trim()) payload.openaiKey = form.openaiKey.trim()

    // Credenciales del proveedor: solo aplican a YCloud/Meta (Baileys usa QR).
    if (form.provider === 'YCLOUD' || form.provider === 'META') {
      // Token: solo si el admin escribió uno nuevo (blanco = conservar el actual).
      if (form.providerApiKey.trim()) payload.providerApiKey = form.providerApiKey.trim()
      // Sender: se envía siempre (permite establecer, cambiar o vaciar).
      payload.providerSender = form.providerSender.trim()
    }

    try {
      const url = editingId
        ? `/api/admin/diamond-assistant/agents/${editingId}`
        : '/api/admin/diamond-assistant/agents'
      const res = await fetch(url, {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.ok) {
        setFormError(data.error ?? 'No se pudo guardar el agente.')
        return
      }
      setModalOpen(false)
      await fetchAgents()
    } catch {
      setFormError('Error de conexión al guardar.')
    } finally {
      setSaving(false)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/diamond-assistant/agents/${deleteTarget.id}`, {
        method: 'DELETE',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.ok) {
        setFormError(null)
        alert(data.error ?? 'No se pudo eliminar el agente.')
        return
      }
      setDeleteTarget(null)
      await fetchAgents()
    } catch {
      alert('Error de conexión al eliminar.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div>
      <PageHeader
        icon={Bot}
        title="Agentes IA"
        description="Agentes conversacionales con personalidad propia que atienden por WhatsApp"
        action={
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
              boxShadow: '0 8px 20px rgba(183,53,184,0.24)',
            }}
          >
            <Plus size={15} /> Nuevo agente
          </button>
        }
      />

      {/* Estado de carga / error / vacío */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '64px 0' }}>
          <Loader2 size={24} className="animate-spin" style={{ color: '#147e95' }} />
        </div>
      ) : listError ? (
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
          <p style={{ fontSize: 13, color: '#DC2626', margin: 0 }}>{listError}</p>
        </div>
      ) : agents.length === 0 ? (
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
              background: 'rgba(183,53,184,0.10)',
            }}
          >
            <Sparkles size={26} style={{ color: '#147e95' }} />
          </div>
          <p style={{ fontSize: 15, fontWeight: 800, margin: 0 }}>Aún no hay agentes</p>
          <p style={{ fontSize: 13, color: MUTED, margin: '6px 0 16px', lineHeight: 1.55 }}>
            Crea tu primer agente IA y dale una personalidad para que empiece a atender.
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
              boxShadow: '0 8px 20px rgba(183,53,184,0.24)',
            }}
          >
            <Plus size={15} /> Crear agente
          </button>
        </div>
      ) : (
        <CardGrid min={280}>
          {agents.map((agent) => {
            const prov = PROVIDER_STYLE[agent.provider]
            return (
              <div key={agent.id} style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Encabezado tarjeta */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 11 }}>
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 12,
                      flexShrink: 0,
                      background: BRAND,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 8px 18px rgba(183,53,184,0.22)',
                    }}
                  >
                    <Bot size={20} className="text-white" />
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p style={{ fontSize: 15, fontWeight: 800, margin: 0, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {agent.name}
                    </p>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        marginTop: 5,
                        fontSize: 10,
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        padding: '3px 8px',
                        borderRadius: 999,
                        color: agent.isActive ? '#16A34A' : '#9CA3AF',
                        background: agent.isActive ? 'rgba(22,163,74,0.10)' : '#F0F3F7',
                      }}
                    >
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: 999,
                          background: agent.isActive ? '#16A34A' : '#9CA3AF',
                        }}
                      />
                      {agent.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    <button
                      onClick={() => openEdit(agent)}
                      title="Editar agente"
                      style={{ padding: 7, borderRadius: 9, background: '#F4F6FA', border: `1px solid ${BORDER}`, cursor: 'pointer' }}
                    >
                      <Pencil size={13} style={{ color: '#233B8F' }} />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(agent)}
                      title="Eliminar agente"
                      style={{ padding: 7, borderRadius: 9, background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)', cursor: 'pointer' }}
                    >
                      <Trash2 size={13} style={{ color: '#DC2626' }} />
                    </button>
                  </div>
                </div>

                {/* Personalidad (preview) */}
                <p
                  style={{
                    fontSize: 12.5,
                    color: MUTED,
                    margin: 0,
                    lineHeight: 1.5,
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {agent.personalityPrompt}
                </p>

                {/* Badges de configuración */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 'auto' }}>
                  <Badge icon={Cpu} label={agent.model} color="#233B8F" tint="rgba(35,59,143,0.08)" />
                  <Badge icon={Radio} label={PROVIDER_OPTIONS.find((p) => p.value === agent.provider)?.label ?? agent.provider} color={prov.color} tint={prov.tint} />
                  <Badge icon={Zap} label={`temp ${agent.temperature}`} color="#147e95" tint="rgba(183,53,184,0.08)" />
                  {agent.hasOpenaiKey && (
                    <Badge icon={KeyRound} label="API key" color="#16A34A" tint="rgba(22,163,74,0.10)" />
                  )}
                </div>
              </div>
            )
          })}
        </CardGrid>
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
                  <Bot size={17} className="text-white" />
                </div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 800, margin: 0 }}>
                    {editingId ? 'Editar agente' : 'Nuevo agente'}
                  </p>
                  <p style={{ fontSize: 11, color: MUTED, margin: 0 }}>
                    Define su carácter, modelo y proveedor
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

              {/* Nombre */}
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Nombre</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Ej. Diana — Ventas"
                  style={inputStyle}
                />
              </div>

              {/* Personalidad (lo importante) */}
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>
                  Personalidad{' '}
                  <span style={{ textTransform: 'none', fontWeight: 600, color: '#B0B7C3' }}>
                    · el prompt que le da carácter
                  </span>
                </label>
                <textarea
                  value={form.personalityPrompt}
                  onChange={(e) => setForm((p) => ({ ...p, personalityPrompt: e.target.value }))}
                  placeholder="Eres Diana, una asesora cálida y profesional. Hablas en un tono cercano, resuelves dudas con claridad y siempre guías al cliente hacia el siguiente paso..."
                  rows={7}
                  style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.55, fontFamily: 'inherit', minHeight: 140 }}
                />
              </div>

              {/* Modelo + Proveedor */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div>
                  <label style={labelStyle}>Modelo</label>
                  <select
                    value={form.model}
                    onChange={(e) => setForm((p) => ({ ...p, model: e.target.value }))}
                    style={{ ...inputStyle, cursor: 'pointer' }}
                  >
                    {MODEL_OPTIONS.map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Proveedor</label>
                  <select
                    value={form.provider}
                    onChange={(e) => setForm((p) => ({ ...p, provider: e.target.value as Agent['provider'] }))}
                    style={{ ...inputStyle, cursor: 'pointer' }}
                  >
                    {PROVIDER_OPTIONS.map((prov) => (
                      <option key={prov.value} value={prov.value}>{prov.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Credenciales del proveedor (según selección) */}
              {form.provider === 'BAILEYS' && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    background: 'rgba(35,59,143,0.06)',
                    border: '1px solid rgba(35,59,143,0.22)',
                    borderRadius: 12,
                    padding: '12px 14px',
                    marginBottom: 16,
                  }}
                >
                  <QrCode size={16} style={{ color: '#233B8F', flexShrink: 0, marginTop: 1 }} />
                  <p style={{ fontSize: 12, color: '#233B8F', margin: 0, lineHeight: 1.55 }}>
                    🔗 Baileys se conecta escaneando un QR. Creá el agente y luego andá a la pestaña{' '}
                    <strong>Configuración</strong> para escanear el código.
                  </p>
                </div>
              )}

              {(form.provider === 'YCLOUD' || form.provider === 'META') && (
                <>
                  {/* Token del proveedor (cifrado) */}
                  <div style={{ marginBottom: 16 }}>
                    <label style={labelStyle}>
                      {PROVIDER_CRED_LABELS[form.provider].keyLabel}
                    </label>
                    <input
                      type="password"
                      value={form.providerApiKey}
                      onChange={(e) => setForm((p) => ({ ...p, providerApiKey: e.target.value }))}
                      placeholder={
                        editingHasProviderKey
                          ? '•••••••• (guardada — deja en blanco para conservar)'
                          : PROVIDER_CRED_LABELS[form.provider].keyPlaceholder
                      }
                      autoComplete="new-password"
                      style={inputStyle}
                    />
                    {editingHasProviderKey ? (
                      <p
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 5,
                          fontSize: 10.5,
                          fontWeight: 700,
                          color: '#16A34A',
                          margin: '6px 0 0',
                        }}
                      >
                        <CheckCircle2 size={12} /> Credencial configurada · escribe una nueva solo si quieres reemplazarla.
                      </p>
                    ) : (
                      <p style={{ fontSize: 10.5, color: '#9CA3AF', margin: '6px 0 0' }}>
                        Se guarda cifrada. Nunca se muestra en claro.
                      </p>
                    )}
                  </div>

                  {/* Sender del proveedor (texto plano) */}
                  <div style={{ marginBottom: 16 }}>
                    <label style={labelStyle}>
                      {PROVIDER_CRED_LABELS[form.provider].senderLabel}
                    </label>
                    <input
                      type="text"
                      value={form.providerSender}
                      onChange={(e) => setForm((p) => ({ ...p, providerSender: e.target.value }))}
                      placeholder={PROVIDER_CRED_LABELS[form.provider].senderPlaceholder}
                      style={inputStyle}
                    />
                  </div>
                </>
              )}

              {/* Temperatura */}
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>
                  Temperatura{' '}
                  <span style={{ textTransform: 'none', fontWeight: 800, color: '#147e95' }}>
                    {form.temperature.toFixed(2)}
                  </span>
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={form.temperature}
                    onChange={(e) => setForm((p) => ({ ...p, temperature: Number(e.target.value) }))}
                    style={{ flex: 1, accentColor: '#147e95' }}
                  />
                  <input
                    type="number"
                    min={0}
                    max={1}
                    step={0.05}
                    value={form.temperature}
                    onChange={(e) => {
                      const v = Number(e.target.value)
                      setForm((p) => ({ ...p, temperature: Number.isNaN(v) ? 0 : Math.min(1, Math.max(0, v)) }))
                    }}
                    style={{ ...inputStyle, width: 78, padding: '8px 10px' }}
                  />
                </div>
                <p style={{ fontSize: 10.5, color: '#9CA3AF', margin: '6px 0 0' }}>
                  0 = preciso y consistente · 1 = creativo y variado
                </p>
              </div>

              {/* OpenAI API Key */}
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>
                  OpenAI API Key{' '}
                  <span style={{ textTransform: 'none', fontWeight: 600, color: '#B0B7C3' }}>· opcional</span>
                </label>
                <input
                  type="password"
                  value={form.openaiKey}
                  onChange={(e) => setForm((p) => ({ ...p, openaiKey: e.target.value }))}
                  placeholder={editingHasKey ? '•••••••• (guardada — deja en blanco para conservar)' : 'sk-...'}
                  autoComplete="new-password"
                  style={inputStyle}
                />
                <p style={{ fontSize: 10.5, color: '#9CA3AF', margin: '6px 0 0' }}>
                  Se guarda cifrada. {editingHasKey ? 'Escribe una nueva solo si quieres reemplazarla.' : 'Si la dejas vacía, se usará la key global.'}
                </p>
              </div>

              {/* Voz (nota de voz) */}
              <div style={{ marginBottom: 16, padding: 14, borderRadius: 12, background: 'rgba(183,53,184,0.05)', border: '1px solid rgba(183,53,184,0.18)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 800, color: '#111827' }}>
                    <Mic size={15} style={{ color: '#147e95' }} /> Responder con voz
                  </span>
                  <button
                    type="button"
                    onClick={() => setForm((p) => ({
                      ...p,
                      voiceEnabled: !p.voiceEnabled,
                      // Al prender la voz, si el modo estaba en "off", lo dejamos en "audio_in".
                      voiceMode: !p.voiceEnabled && p.voiceMode === 'off' ? 'audio_in' : p.voiceMode,
                    }))}
                    aria-label="Alternar voz"
                    style={{ position: 'relative', width: 42, height: 23, borderRadius: 999, border: 'none', cursor: 'pointer', flexShrink: 0, background: form.voiceEnabled ? '#147e95' : '#D1D5DB' }}
                  >
                    <span style={{ position: 'absolute', top: 3, left: form.voiceEnabled ? 22 : 3, width: 17, height: 17, borderRadius: 999, background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'left 0.15s' }} />
                  </button>
                </div>
                <p style={{ fontSize: 10.5, color: '#9CA3AF', margin: '6px 0 0' }}>
                  Transcribe los audios que le mandan y puede contestar con nota de voz.
                </p>

                {form.voiceEnabled && (
                  <div style={{ marginTop: 12, display: 'grid', gap: 12 }}>
                    <div>
                      <label style={labelStyle}>¿Cuándo responde con voz?</label>
                      <select
                        value={form.voiceMode === 'off' ? 'audio_in' : form.voiceMode}
                        onChange={(e) => setForm((p) => ({ ...p, voiceMode: e.target.value as AgentForm['voiceMode'] }))}
                        style={inputStyle}
                      >
                        {VOICE_MODES.filter((m) => m.id !== 'off').map((m) => (
                          <option key={m.id} value={m.id}>{m.label}</option>
                        ))}
                      </select>
                      <p style={{ fontSize: 10.5, color: '#9CA3AF', margin: '5px 0 0' }}>
                        {VOICE_MODES.find((m) => m.id === form.voiceMode)?.desc}
                      </p>
                    </div>
                    <div>
                      <label style={labelStyle}>Voz</label>
                      <select value={form.voiceId} onChange={(e) => setForm((p) => ({ ...p, voiceId: e.target.value }))} style={inputStyle}>
                        {BOT_VOICES.map((v) => (
                          <option key={v.id} value={v.id}>{v.name} — {v.desc}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
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
                  <p style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>Agente activo</p>
                  <p style={{ fontSize: 11, color: MUTED, margin: 0 }}>Si está inactivo, no responde mensajes.</p>
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
                onClick={saveAgent}
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
                  boxShadow: '0 8px 20px rgba(183,53,184,0.24)',
                }}
              >
                {saving ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={14} />}
                {editingId ? 'Guardar cambios' : 'Crear agente'}
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
              <h3 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 4px' }}>Eliminar agente</h3>
              <p style={{ fontSize: 13, color: MUTED, margin: '0 0 2px' }}>Estás a punto de eliminar a</p>
              <p style={{ fontSize: 14, fontWeight: 800, margin: '0 0 16px' }}>{deleteTarget.name}</p>

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
                  Esta acción es <strong>irreversible</strong>. Se eliminarán también sus grupos, conocimiento, reglas y demás datos asociados.
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

// ── Componente Badge ───────────────────────────────────────────────
function Badge({
  icon: Icon,
  label,
  color,
  tint,
}: {
  icon: typeof Cpu
  label: string
  color: string
  tint: string
}) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        fontSize: 11,
        fontWeight: 700,
        padding: '4px 9px',
        borderRadius: 999,
        color,
        background: tint,
      }}
    >
      <Icon size={12} />
      {label}
    </span>
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
