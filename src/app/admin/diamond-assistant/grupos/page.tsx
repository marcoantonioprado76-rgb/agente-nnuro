'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import Link from 'next/link'
import {
  Users2,
  RefreshCw,
  Loader2,
  AlertTriangle,
  Zap,
  Bot,
  Sparkles,
  Users,
  PlugZap,
  MailPlus,
  CalendarClock,
  CalendarPlus,
  UserPlus,
  Trash2,
  Pause,
  Play,
  Pencil,
  X,
  Repeat,
  Image as ImageIcon,
  Video,
  Music,
  FileText,
  Link as LinkIcon,
  Type,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { PageHeader, cardStyle, BRAND, BORDER, MUTED } from '../_ui'

// ── Tipos ──────────────────────────────────────────────────────────
interface Agent {
  id: string
  name: string
  isActive: boolean
  provider: string
}

interface GroupConfig {
  id: string
  automationEnabled: boolean
  aiEnabled: boolean
  welcomeEnabled: boolean
  welcomeTemplateId: string | null
  privateWelcomeEnabled: boolean
}

interface WaGroup {
  groupJid: string
  subject: string
  size: number | null
  config: GroupConfig | null
}

interface WelcomeTemplate {
  id: string
  name: string
  isActive: boolean
}

interface GroupsResponse {
  connected: boolean
  status: string
  groups: WaGroup[]
  welcomeTemplates: WelcomeTemplate[]
}

type MediaType = 'IMAGE' | 'VIDEO' | 'AUDIO' | 'PDF' | 'LINK' | 'TEXT'

interface MediaAsset {
  id: string
  type: MediaType
  title: string
}

interface ScheduledPost {
  id: string
  groupJid: string
  groupName: string | null
  body: string | null
  mediaAssetIds: string[]
  scheduledAt: string
  repeat: 'NONE' | 'INTERVAL' | 'DAILY' | 'WEEKLY' | 'WEEKDAYS'
  intervalMinutes: number | null
  weekdays: number[]
  repeatUntil: string | null
  alsoToPrivate: boolean
  status: 'PENDING' | 'SENT' | 'CANCELLED' | 'FAILED'
  sentCount: number
}

// Días de la semana: índice 0=Dom … 6=Sáb. Chips en orden Lun→Dom.
const DAY_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0]

// Ícono por tipo de recurso (para los chips de adjuntos).
const MEDIA_ICON: Record<MediaType, LucideIcon> = {
  IMAGE: ImageIcon,
  VIDEO: Video,
  AUDIO: Music,
  PDF: FileText,
  LINK: LinkIcon,
  TEXT: Type,
}
const MEDIA_LABEL: Record<MediaType, string> = {
  IMAGE: 'Imagen',
  VIDEO: 'Video',
  AUDIO: 'Audio',
  PDF: 'PDF',
  LINK: 'Enlace',
  TEXT: 'Texto',
}
const REPEAT_LABEL: Record<ScheduledPost['repeat'], string> = {
  NONE: 'Una vez',
  INTERVAL: 'Cada cierto tiempo',
  DAILY: 'Cada día',
  WEEKLY: 'Cada semana',
  WEEKDAYS: 'Días específicos',
}

/** Texto corto de la recurrencia para la lista (ej. "cada 2 h", "Lun, Mié, Vie"). */
function repeatText(p: ScheduledPost): string {
  if (p.repeat === 'INTERVAL' && p.intervalMinutes) {
    const m = p.intervalMinutes
    return m % 60 === 0 ? `cada ${m / 60} h` : `cada ${m} min`
  }
  if (p.repeat === 'WEEKDAYS') {
    const days = p.weekdays ?? []
    if (days.length === 7) return 'todos los días'
    return WEEKDAY_ORDER.filter((d) => days.includes(d)).map((d) => DAY_SHORT[d]).join(', ') || 'días'
  }
  return REPEAT_LABEL[p.repeat].toLowerCase()
}

const inputStyle: CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 12,
  background: '#F8FAFC',
  border: `1px solid ${BORDER}`,
  fontSize: 13.5,
  color: '#111827',
  outline: 'none',
  cursor: 'pointer',
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
const scheduleBtnStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 7,
  padding: '8px 14px',
  borderRadius: 10,
  fontSize: 12.5,
  fontWeight: 800,
  color: '#233B8F',
  background: 'rgba(35,59,143,0.08)',
  border: '1px solid rgba(35,59,143,0.22)',
  cursor: 'pointer',
}

/** Valores efectivos de un grupo (config guardada o defaults del modelo). */
function eff(g: WaGroup) {
  return {
    automationEnabled: g.config?.automationEnabled ?? true,
    aiEnabled: g.config?.aiEnabled ?? true,
    welcomeEnabled: g.config?.welcomeEnabled ?? false,
    welcomeTemplateId: g.config?.welcomeTemplateId ?? null,
    privateWelcomeEnabled: g.config?.privateWelcomeEnabled ?? false,
  }
}

export default function DiamondAssistantGrupos() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [agentId, setAgentId] = useState<string>('')
  const [loadingAgents, setLoadingAgents] = useState(true)
  const [agentsError, setAgentsError] = useState<string | null>(null)

  const [data, setData] = useState<GroupsResponse | null>(null)
  const [loadingGroups, setLoadingGroups] = useState(false)
  const [groupsError, setGroupsError] = useState<string | null>(null)
  const [savingJids, setSavingJids] = useState<Record<string, boolean>>({})

  // Biblioteca de medios (para adjuntar en publicaciones programadas).
  const [media, setMedia] = useState<MediaAsset[]>([])
  // Grupo cuyo modal de "Programar" está abierto (o null).
  const [schedulerGroup, setSchedulerGroup] = useState<WaGroup | null>(null)
  // Publicación que se está editando (o null = crear nueva).
  const [editPost, setEditPost] = useState<ScheduledPost | null>(null)
  // Grupo del que se están importando miembros (o null).
  const [importingJid, setImportingJid] = useState<string | null>(null)
  // Publicaciones programadas por grupo (para verlas en la tarjeta, no solo en el modal).
  const [postsByGroup, setPostsByGroup] = useState<Record<string, ScheduledPost[]>>({})
  const [postBusyId, setPostBusyId] = useState<string | null>(null)

  const refreshPosts = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/admin/diamond-assistant/scheduled-posts?agentId=${encodeURIComponent(id)}`)
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json.ok) return
      const map: Record<string, ScheduledPost[]> = {}
      for (const p of json.data as ScheduledPost[]) {
        ;(map[p.groupJid] ??= []).push(p)
      }
      setPostsByGroup(map)
    } catch { /* noop */ }
  }, [])

  // Pausar/reactivar o eliminar desde la tarjeta.
  const cardTogglePause = useCallback(async (p: ScheduledPost) => {
    const newStatus = p.status === 'CANCELLED' ? 'PENDING' : 'CANCELLED'
    setPostBusyId(p.id)
    try {
      const res = await fetch(`/api/admin/diamond-assistant/scheduled-posts/${p.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) setPostsByGroup((m) => ({ ...m, [p.groupJid]: (m[p.groupJid] ?? []).map((x) => x.id === p.id ? { ...x, status: newStatus } : x) }))
    } catch { /* noop */ } finally { setPostBusyId(null) }
  }, [])

  const cardRemovePost = useCallback(async (p: ScheduledPost) => {
    setPostBusyId(p.id)
    try {
      const res = await fetch(`/api/admin/diamond-assistant/scheduled-posts/${p.id}`, { method: 'DELETE' })
      if (res.ok) setPostsByGroup((m) => ({ ...m, [p.groupJid]: (m[p.groupJid] ?? []).filter((x) => x.id !== p.id) }))
    } catch { /* noop */ } finally { setPostBusyId(null) }
  }, [])

  const importMembers = useCallback(async (g: WaGroup) => {
    if (!agentId) return
    setImportingJid(g.groupJid)
    try {
      const res = await fetch('/api/admin/diamond-assistant/groups/import-members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId, groupJid: g.groupJid }),
      })
      const json = await res.json().catch(() => ({}))
      if (res.ok && json.ok) {
        alert(
          `✅ Importados ${json.added} contacto(s) nuevo(s) de "${g.subject}".` +
            (json.skipped ? `\n(${json.skipped} ya estaban o sin número visible)` : ''),
        )
      } else {
        alert(json.error ?? 'No se pudieron importar los miembros.')
      }
    } catch {
      alert('Error de conexión al importar.')
    } finally {
      setImportingJid(null)
    }
  }, [agentId])

  const selectedAgent = agents.find((a) => a.id === agentId) ?? null
  // Los grupos van SIEMPRE por una conexión Baileys (por QR), sin importar el
  // proveedor de 1:1 del agente. Un agente YCloud puede conectar Baileys SOLO
  // para grupos (sus 1:1 siguen por YCloud). Por eso NO bloqueamos por proveedor:
  // mostramos los grupos si hay conexión Baileys, o guiamos a conectarla.

  // ── Cargar agentes ───────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoadingAgents(true)
      setAgentsError(null)
      try {
        const res = await fetch('/api/admin/diamond-assistant/agents')
        const json = await res.json().catch(() => ({}))
        if (!res.ok || !json.ok) {
          if (!cancelled) setAgentsError(json.error ?? 'No se pudieron cargar los agentes.')
          return
        }
        if (cancelled) return
        const list: Agent[] = (json.data ?? []).map((a: Partial<Agent>) => ({
          id: a.id as string,
          name: a.name as string,
          isActive: !!a.isActive,
          provider: a.provider ?? 'BAILEYS',
        }))
        setAgents(list)
        setAgentId((prev) => prev || list[0]?.id || '')
      } catch {
        if (!cancelled) setAgentsError('Error de conexión al cargar los agentes.')
      } finally {
        if (!cancelled) setLoadingAgents(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // ── Cargar grupos del agente ─────────────────────────────────────
  const fetchGroups = useCallback(async (id: string) => {
    setLoadingGroups(true)
    setGroupsError(null)
    try {
      const res = await fetch(`/api/admin/diamond-assistant/groups?agentId=${encodeURIComponent(id)}`)
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json.ok) {
        setGroupsError(json.error ?? 'No se pudieron cargar los grupos.')
        setData(null)
        return
      }
      setData(json.data as GroupsResponse)
    } catch {
      setGroupsError('Error de conexión al cargar los grupos.')
      setData(null)
    } finally {
      setLoadingGroups(false)
    }
  }, [])

  useEffect(() => {
    if (agentId) { fetchGroups(agentId); refreshPosts(agentId) }
    else { setData(null); setPostsByGroup({}) }
  }, [agentId, fetchGroups, refreshPosts])

  // ── Cargar biblioteca de medios (una vez) ────────────────────────
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/admin/diamond-assistant/media')
        const json = await res.json().catch(() => ({}))
        if (cancelled || !res.ok || !json.ok) return
        setMedia((json.data ?? []) as MediaAsset[])
      } catch {
        /* silencioso: el modal muestra "sin recursos" */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // ── Guardar config de un grupo (POST upsert o PATCH si ya existe) ──
  const saveGroup = useCallback(
    async (group: WaGroup, patch: Partial<Omit<GroupConfig, 'id'>>) => {
      if (!agentId) return
      setSavingJids((p) => ({ ...p, [group.groupJid]: true }))
      try {
        const hasConfig = !!group.config?.id
        const res = await fetch(
          hasConfig
            ? `/api/admin/diamond-assistant/groups/${group.config!.id}`
            : '/api/admin/diamond-assistant/groups',
          {
            method: hasConfig ? 'PATCH' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(
              hasConfig
                ? patch
                : { agentId, groupJid: group.groupJid, name: group.subject, ...patch },
            ),
          },
        )
        const json = await res.json().catch(() => ({}))
        if (!res.ok || !json.ok) {
          alert(json.error ?? 'No se pudo guardar la configuración del grupo.')
          return
        }
        const saved = json.data as GroupConfig
        setData((prev) =>
          prev
            ? {
                ...prev,
                groups: prev.groups.map((g) =>
                  g.groupJid === group.groupJid ? { ...g, config: saved } : g,
                ),
              }
            : prev,
        )
      } catch {
        alert('Error de conexión al guardar.')
      } finally {
        setSavingJids((p) => ({ ...p, [group.groupJid]: false }))
      }
    },
    [agentId],
  )

  const templates = data?.welcomeTemplates ?? []

  return (
    <div>
      <PageHeader
        icon={Users2}
        title="Grupos"
        description="Activa la automatización, la IA y la bienvenida en cada grupo de WhatsApp"
        action={
          agentId ? (
            <button
              onClick={() => fetchGroups(agentId)}
              disabled={loadingGroups}
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
                cursor: loadingGroups ? 'default' : 'pointer',
                opacity: loadingGroups ? 0.6 : 1,
                boxShadow: '0 8px 20px rgba(0,229,208,0.24)',
              }}
            >
              {loadingGroups ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
              Sincronizar
            </button>
          ) : undefined
        }
      />

      {/* Selector de agente */}
      <div style={{ ...cardStyle, marginBottom: 16 }}>
        <label style={labelStyle}>Agente</label>
        {loadingAgents ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: MUTED, fontSize: 13 }}>
            <Loader2 size={15} className="animate-spin" /> Cargando agentes…
          </div>
        ) : agentsError ? (
          <ErrorBox message={agentsError} />
        ) : agents.length === 0 ? (
          <p style={{ fontSize: 13, color: MUTED, margin: 0 }}>
            Aún no hay agentes. Crea uno en la sección <strong>Agentes IA</strong>.
          </p>
        ) : (
          <select value={agentId} onChange={(e) => setAgentId(e.target.value)} style={inputStyle}>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
                {a.isActive ? ' · activo' : ' · inactivo'}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Contenido */}
      {!agentId ? null : loadingGroups ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '64px 0' }}>
          <Loader2 size={24} className="animate-spin" style={{ color: '#147e95' }} />
        </div>
      ) : groupsError ? (
        <ErrorBox message={groupsError} />
      ) : data && !data.connected ? (
        <NotConnected provider={selectedAgent?.provider ?? 'BAILEYS'} />
      ) : data && data.groups.length === 0 ? (
        <EmptyGroups />
      ) : data ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {data.groups.map((g) => {
            const v = eff(g)
            const saving = !!savingJids[g.groupJid]
            return (
              <div key={g.groupJid} style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Cabecera del grupo */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      flexShrink: 0,
                      background: 'rgba(35,59,143,0.10)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Users2 size={19} style={{ color: '#233B8F' }} />
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p style={{ fontSize: 14.5, fontWeight: 800, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {g.subject}
                    </p>
                    <p style={{ fontSize: 11.5, color: MUTED, margin: '2px 0 0', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Users size={12} />
                      {g.size != null ? `${g.size} miembros` : 'Grupo de WhatsApp'}
                    </p>
                  </div>
                  {saving && <Loader2 size={16} className="animate-spin" style={{ color: '#147e95', flexShrink: 0 }} />}
                </div>

                {/* Toggles */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
                  <ToggleRow
                    icon={Zap}
                    color="#147e95"
                    tint="rgba(0,229,208,0.10)"
                    title="Automatización"
                    desc="El agente actúa en este grupo"
                    checked={v.automationEnabled}
                    disabled={saving}
                    onChange={(next) => saveGroup(g, { automationEnabled: next })}
                  />
                  <ToggleRow
                    icon={Bot}
                    color="#233B8F"
                    tint="rgba(35,59,143,0.10)"
                    title="IA"
                    desc="Responde con inteligencia"
                    checked={v.aiEnabled}
                    disabled={saving}
                    onChange={(next) => saveGroup(g, { aiEnabled: next })}
                  />
                  <ToggleRow
                    icon={Sparkles}
                    color="#16A34A"
                    tint="rgba(22,163,74,0.10)"
                    title="Bienvenida al grupo"
                    desc="Saluda a los nuevos en el grupo"
                    checked={v.welcomeEnabled}
                    disabled={saving}
                    onChange={(next) => saveGroup(g, { welcomeEnabled: next })}
                  />
                  <ToggleRow
                    icon={UserPlus}
                    color="#147e95"
                    tint="rgba(0,229,208,0.10)"
                    title="Bienvenida al privado"
                    desc="Le escribe presentándose (1:1)"
                    checked={v.privateWelcomeEnabled}
                    disabled={saving}
                    onChange={(next) => saveGroup(g, { privateWelcomeEnabled: next })}
                  />
                </div>

                {/* Selector de plantilla de bienvenida (solo si bienvenida ON) */}
                {v.welcomeEnabled && (
                  <div>
                    <label style={labelStyle}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <MailPlus size={12} /> Plantilla de bienvenida
                      </span>
                    </label>
                    {templates.length === 0 ? (
                      <p style={{ fontSize: 12, color: MUTED, margin: 0, lineHeight: 1.5 }}>
                        Este agente no tiene plantillas de bienvenida. Créalas en <strong>Audiencia → Bienvenidas</strong> para
                        elegir una aquí.
                      </p>
                    ) : (
                      <select
                        value={v.welcomeTemplateId ?? ''}
                        disabled={saving}
                        onChange={(e) => saveGroup(g, { welcomeTemplateId: e.target.value || null })}
                        style={{ ...inputStyle, opacity: saving ? 0.6 : 1 }}
                      >
                        <option value="">— Sin plantilla —</option>
                        {templates.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                            {t.isActive ? '' : ' (inactiva)'}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                )}

                {/* Programado + Enviado en este grupo (visible directo en la tarjeta) */}
                {(() => {
                  const all = postsByGroup[g.groupJid] ?? []
                  const prog = all.filter((p) => p.status === 'PENDING' || p.status === 'CANCELLED')
                  const sent = all.filter((p) => p.status === 'SENT' || p.status === 'FAILED')
                  if (prog.length === 0 && sent.length === 0) return null
                  const itemRow = (p: ScheduledPost, editable: boolean) => {
                    const sm = statusMeta(p.status)
                    const when = new Date(p.scheduledAt)
                    const whenStr = isNaN(when.getTime()) ? '—' : when.toLocaleString('es-BO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                    const isMotiv = !!p.body && p.body.trim().startsWith('[MOTIVACIÓN DIARIA')
                    return (
                      <div key={p.id} style={{ border: `1px solid ${BORDER}`, borderRadius: 10, padding: '8px 10px', display: 'flex', gap: 8, alignItems: 'center' }}>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 2 }}>
                            <span style={{ fontSize: 10.5, fontWeight: 800, color: sm.color, background: sm.bg, padding: '1px 7px', borderRadius: 999 }}>{sm.label}</span>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11.5, fontWeight: 700, color: '#374151' }}><CalendarClock size={11} /> {whenStr}</span>
                            {p.repeat !== 'NONE' && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10.5, fontWeight: 700, color: '#147e95' }}><Repeat size={10} /> {repeatText(p)}</span>}
                            {p.alsoToPrivate && <span style={{ fontSize: 10.5, fontWeight: 700, color: '#16A34A' }}>💬 privado</span>}
                          </div>
                          <p style={{ fontSize: 11.5, color: isMotiv ? '#147e95' : '#4B5563', margin: 0, lineHeight: 1.35, fontWeight: isMotiv ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {isMotiv ? '🔄 Frase motivacional (rota, nunca repite)' : (p.body || '—')}
                          </p>
                        </div>
                        {editable && (
                          <>
                            <button onClick={() => { setEditPost(p); setSchedulerGroup(g) }} disabled={postBusyId === p.id} title="Editar" style={{ border: 'none', background: 'rgba(35,59,143,0.09)', width: 28, height: 28, borderRadius: 7, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <Pencil size={12} style={{ color: '#233B8F' }} />
                            </button>
                            <button onClick={() => cardTogglePause(p)} disabled={postBusyId === p.id} title={p.status === 'CANCELLED' ? 'Reactivar' : 'Pausar'} style={{ border: 'none', background: 'rgba(0,229,208,0.09)', width: 28, height: 28, borderRadius: 7, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              {postBusyId === p.id ? <Loader2 size={12} className="animate-spin" style={{ color: '#147e95' }} /> : (p.status === 'CANCELLED' ? <Play size={12} style={{ color: '#147e95' }} /> : <Pause size={12} style={{ color: '#147e95' }} />)}
                            </button>
                          </>
                        )}
                        <button onClick={() => cardRemovePost(p)} disabled={postBusyId === p.id} title="Eliminar" style={{ border: 'none', background: 'rgba(220,38,38,0.08)', width: 28, height: 28, borderRadius: 7, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Trash2 size={12} style={{ color: '#DC2626' }} />
                        </button>
                      </div>
                    )
                  }
                  return (
                    <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {prog.length > 0 && (
                        <>
                          <p style={{ fontSize: 11, fontWeight: 800, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.4, margin: 0 }}>Programado en este grupo</p>
                          {prog.map((p) => itemRow(p, true))}
                        </>
                      )}
                      {sent.length > 0 && (
                        <>
                          <p style={{ fontSize: 11, fontWeight: 800, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.4, margin: prog.length > 0 ? '6px 0 0' : 0 }}>Enviadas</p>
                          {sent.slice(0, 5).map((p) => itemRow(p, false))}
                        </>
                      )}
                    </div>
                  )
                })()}

                {/* Acciones del grupo: importar miembros + programar publicación */}
                <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 12, display: 'flex', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 8 }}>
                  <button
                    onClick={() => importMembers(g)}
                    disabled={importingJid === g.groupJid}
                    style={{ ...scheduleBtnStyle, color: '#16A34A', background: 'rgba(22,163,74,0.08)', border: '1px solid rgba(22,163,74,0.22)', opacity: importingJid === g.groupJid ? 0.6 : 1 }}
                    title="Guardar en Contactos a todos los miembros actuales del grupo"
                  >
                    {importingJid === g.groupJid ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
                    Importar miembros
                  </button>
                  <button onClick={() => setSchedulerGroup(g)} style={scheduleBtnStyle}>
                    <CalendarClock size={14} /> Programar publicación
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      ) : null}

      {/* ── Modal: programar publicaciones a un grupo ─────────────────── */}
      {schedulerGroup && agentId && (
        <SchedulerModal
          key={editPost?.id ?? 'new'}
          agentId={agentId}
          group={schedulerGroup}
          media={media}
          editPost={editPost}
          onClose={() => { setSchedulerGroup(null); setEditPost(null); refreshPosts(agentId) }}
        />
      )}
    </div>
  )
}

// ── Fila de toggle ─────────────────────────────────────────────────
function ToggleRow({
  icon: Icon,
  color,
  tint,
  title,
  desc,
  checked,
  disabled,
  onChange,
}: {
  icon: typeof Zap
  color: string
  tint: string
  title: string
  desc: string
  checked: boolean
  disabled: boolean
  onChange: (next: boolean) => void
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        padding: '11px 12px',
        borderRadius: 12,
        background: checked ? tint : '#F8FAFC',
        border: `1px solid ${checked ? color + '33' : BORDER}`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
        <div style={{ width: 30, height: 30, borderRadius: 9, flexShrink: 0, background: checked ? tint : '#F0F3F7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={15} style={{ color: checked ? color : '#9CA3AF' }} />
        </div>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: 12.5, fontWeight: 800, margin: 0 }}>{title}</p>
          <p style={{ fontSize: 10.5, color: MUTED, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{desc}</p>
        </div>
      </div>
      <button
        onClick={() => onChange(!checked)}
        disabled={disabled}
        aria-label={`Alternar ${title}`}
        style={{
          position: 'relative',
          width: 42,
          height: 23,
          borderRadius: 999,
          border: 'none',
          cursor: disabled ? 'default' : 'pointer',
          flexShrink: 0,
          background: checked ? color : '#D1D5DB',
          transition: 'background 0.15s',
          opacity: disabled ? 0.7 : 1,
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 3,
            left: checked ? 22 : 3,
            width: 17,
            height: 17,
            borderRadius: 999,
            background: '#fff',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            transition: 'left 0.15s',
          }}
        />
      </button>
    </div>
  )
}

// ── Estados auxiliares ─────────────────────────────────────────────
function NotConnected({ provider }: { provider: string }) {
  const isOfficial = provider === 'YCLOUD' || provider === 'META'
  return (
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
          background: 'rgba(217,119,6,0.10)',
        }}
      >
        <PlugZap size={26} style={{ color: '#D97706' }} />
      </div>
      <p style={{ fontSize: 15, fontWeight: 800, margin: 0 }}>Conectá un WhatsApp para los grupos</p>
      <p style={{ fontSize: 13, color: MUTED, margin: '6px auto 16px', lineHeight: 1.6, maxWidth: 440 }}>
        Los grupos funcionan por una conexión de <strong>WhatsApp por QR</strong>. Vinculá un número en{' '}
        <strong>Configuración</strong> y volvé aquí.
        {isOfficial ? (
          <> Tu número de <strong>YCloud sigue para los mensajes 1:1</strong>; para grupos conectá un WhatsApp{' '}
            <strong>dedicado aparte</strong> por QR.</>
        ) : null}
      </p>
      <Link
        href="/admin/diamond-assistant/configuracion"
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
        <PlugZap size={15} /> Ir a Configuración
      </Link>
    </div>
  )
}

function EmptyGroups() {
  return (
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
        <Users2 size={26} style={{ color: '#233B8F' }} />
      </div>
      <p style={{ fontSize: 15, fontWeight: 800, margin: 0 }}>Sin grupos todavía</p>
      <p style={{ fontSize: 13, color: MUTED, margin: '6px 0 0', lineHeight: 1.55, maxWidth: 380, marginInline: 'auto' }}>
        Este número está conectado pero aún no pertenece a ningún grupo de WhatsApp. Agrégalo a tus grupos y pulsa
        Sincronizar.
      </p>
    </div>
  )
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 8,
        background: 'rgba(220,38,38,0.06)',
        border: '1px solid rgba(220,38,38,0.2)',
        borderRadius: 12,
        padding: '10px 12px',
      }}
    >
      <AlertTriangle size={14} style={{ color: '#DC2626', flexShrink: 0, marginTop: 1 }} />
      <p style={{ fontSize: 12, color: '#DC2626', margin: 0, lineHeight: 1.4 }}>{message}</p>
    </div>
  )
}

// ── Modal: programar publicaciones a un grupo ──────────────────────
function statusMeta(s: ScheduledPost['status']): { label: string; color: string; bg: string } {
  switch (s) {
    case 'PENDING': return { label: 'Programada', color: '#B45309', bg: 'rgba(217,119,6,0.12)' }
    case 'SENT': return { label: 'Enviada', color: '#15803D', bg: 'rgba(22,163,74,0.12)' }
    case 'FAILED': return { label: 'Falló', color: '#B91C1C', bg: 'rgba(220,38,38,0.10)' }
    default: return { label: 'Pausada', color: '#6B7280', bg: '#F0F3F7' }
  }
}

// Convierte una fecha ISO (UTC) al formato del input datetime-local (hora local).
function toLocalInput(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function SchedulerModal({
  agentId,
  group,
  media,
  editPost,
  onClose,
}: {
  agentId: string
  group: WaGroup
  media: MediaAsset[]
  editPost?: ScheduledPost | null
  onClose: () => void
}) {
  const isEditing = !!editPost
  const [posts, setPosts] = useState<ScheduledPost[]>([])
  const [loading, setLoading] = useState(true)
  const [body, setBody] = useState(editPost?.body ?? '')
  const [assetIds, setAssetIds] = useState<string[]>(editPost?.mediaAssetIds ?? [])
  const [scheduledAt, setScheduledAt] = useState(editPost ? toLocalInput(editPost.scheduledAt) : '')
  const [repeat, setRepeat] = useState<ScheduledPost['repeat']>(editPost?.repeat ?? 'NONE')
  const [intervalValue, setIntervalValue] = useState(
    editPost?.intervalMinutes ? (editPost.intervalMinutes % 60 === 0 ? editPost.intervalMinutes / 60 : editPost.intervalMinutes) : 2,
  )
  const [intervalUnit, setIntervalUnit] = useState<'MINUTES' | 'HOURS'>(
    editPost?.intervalMinutes && editPost.intervalMinutes % 60 !== 0 ? 'MINUTES' : 'HOURS',
  )
  const [weekdays, setWeekdays] = useState<number[]>(editPost?.weekdays ?? [])
  const [repeatUntil, setRepeatUntil] = useState(editPost?.repeatUntil ? toLocalInput(editPost.repeatUntil) : '')
  const [alsoToPrivate, setAlsoToPrivate] = useState(editPost?.alsoToPrivate ?? false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [pausingId, setPausingId] = useState<string | null>(null)

  // Media subida directo desde este modal (se suma a la de la Biblioteca).
  const [uploadedMedia, setUploadedMedia] = useState<MediaAsset[]>([])
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const allMedia = useMemo(() => [...uploadedMedia, ...media], [uploadedMedia, media])

  const mediaById = useMemo(() => {
    const m = new Map<string, MediaAsset>()
    for (const a of allMedia) m.set(a.id, a)
    return m
  }, [allMedia])

  async function uploadPostMedia(file: File) {
    const isVideo = file.type.startsWith('video/')
    const isImage = file.type.startsWith('image/')
    if (!isImage && !isVideo) { setError('Solo se puede subir imagen o video.'); return }
    setUploading(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.append('type', isVideo ? 'VIDEO' : 'IMAGE')
      fd.append('title', (file.name.replace(/\.[^.]+$/, '') || (isVideo ? 'Video' : 'Imagen')).slice(0, 60))
      fd.append('tags', JSON.stringify([]))
      fd.append('file', file)
      const res = await fetch('/api/admin/diamond-assistant/media', { method: 'POST', body: fd })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.ok) { setError(data.error ?? 'No se pudo subir el archivo.'); return }
      const a = data.data as MediaAsset
      setUploadedMedia((prev) => [a, ...prev])
      setAssetIds((prev) => (prev.includes(a.id) ? prev : [...prev, a.id]))
    } catch {
      setError('Error de conexión al subir el archivo.')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const loadPosts = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(
        `/api/admin/diamond-assistant/scheduled-posts?agentId=${encodeURIComponent(agentId)}&groupJid=${encodeURIComponent(group.groupJid)}`,
      )
      const json = await res.json().catch(() => ({}))
      if (res.ok && json.ok) setPosts(json.data as ScheduledPost[])
    } catch {
      /* noop */
    } finally {
      setLoading(false)
    }
  }, [agentId, group.groupJid])

  useEffect(() => {
    loadPosts()
  }, [loadPosts])

  const availableMedia = allMedia.filter((m) => !assetIds.includes(m.id))

  // Mínimo del selector de fecha/hora = ahora (en hora local del navegador).
  const minLocal = (() => {
    const now = new Date()
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
  })()

  async function submit() {
    setError(null)
    if (!body.trim() && assetIds.length === 0) {
      setError('Agregá un mensaje o al menos una imagen/archivo.')
      return
    }
    if (!scheduledAt) {
      setError('Elegí la fecha y la hora.')
      return
    }
    const when = new Date(scheduledAt)
    if (isNaN(when.getTime())) {
      setError('Fecha y hora inválidas.')
      return
    }
    if (when.getTime() < Date.now() - 30_000) {
      setError('Esa hora ya pasó. Elegí un horario futuro.')
      return
    }

    // Intervalo ("de cada rato"): mínimo 15 minutos (anti-baneo).
    const intervalMinutes =
      repeat === 'INTERVAL' ? (intervalUnit === 'HOURS' ? intervalValue * 60 : intervalValue) : undefined
    if (repeat === 'INTERVAL' && (!intervalMinutes || intervalMinutes < 15)) {
      setError('El intervalo mínimo es de 15 minutos.')
      return
    }
    if (repeat === 'WEEKDAYS' && weekdays.length === 0) {
      setError('Elegí al menos un día de la semana.')
      return
    }

    // Fecha de fin opcional (solo si se repite): debe ser posterior al inicio.
    let repeatUntilISO: string | undefined
    if (repeat !== 'NONE' && repeatUntil) {
      const end = new Date(repeatUntil)
      if (isNaN(end.getTime())) {
        setError('La fecha de fin es inválida.')
        return
      }
      if (end.getTime() <= when.getTime()) {
        setError('La fecha de fin debe ser posterior a la de inicio.')
        return
      }
      repeatUntilISO = end.toISOString()
    }

    setSaving(true)
    try {
      const res = await fetch(
        isEditing ? `/api/admin/diamond-assistant/scheduled-posts/${editPost!.id}` : '/api/admin/diamond-assistant/scheduled-posts',
        {
          method: isEditing ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...(isEditing ? { status: 'PENDING' } : { agentId, groupJid: group.groupJid, groupName: group.subject }),
            body: body.trim() || undefined,
            mediaAssetIds: assetIds,
            scheduledAt: when.toISOString(),
            repeat,
            alsoToPrivate,
            ...(intervalMinutes ? { intervalMinutes } : {}),
            ...(repeat === 'WEEKDAYS' ? { weekdays } : {}),
            ...(repeatUntilISO ? { repeatUntil: repeatUntilISO } : {}),
          }),
        },
      )
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json.ok) {
        setError(json.error ?? (isEditing ? 'No se pudieron guardar los cambios.' : 'No se pudo programar la publicación.'))
        return
      }
      if (isEditing) { onClose(); return } // al guardar edición, cierra (la tarjeta se refresca sola)
      setBody('')
      setAssetIds([])
      setScheduledAt('')
      setRepeat('NONE')
      setWeekdays([])
      setRepeatUntil('')
      setAlsoToPrivate(false)
      await loadPosts()
    } catch {
      setError('Error de conexión al programar.')
    } finally {
      setSaving(false)
    }
  }

  async function remove(id: string) {
    setDeletingId(id)
    try {
      const res = await fetch(`/api/admin/diamond-assistant/scheduled-posts/${id}`, { method: 'DELETE' })
      const json = await res.json().catch(() => ({}))
      if (res.ok && json.ok) setPosts((p) => p.filter((x) => x.id !== id))
    } catch {
      /* noop */
    } finally {
      setDeletingId(null)
    }
  }

  // Pausar (status CANCELLED) o reactivar (PENDING) una publicación programada.
  async function togglePause(p: ScheduledPost) {
    const newStatus = p.status === 'CANCELLED' ? 'PENDING' : 'CANCELLED'
    setPausingId(p.id)
    try {
      const res = await fetch(`/api/admin/diamond-assistant/scheduled-posts/${p.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      const json = await res.json().catch(() => ({}))
      if (res.ok && json.ok) setPosts((list) => list.map((x) => (x.id === p.id ? { ...x, status: newStatus } : x)))
    } catch {
      /* noop */
    } finally {
      setPausingId(null)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(17,24,39,0.45)', backdropFilter: 'blur(2px)' }} onClick={saving ? undefined : onClose} />
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 640,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          background: '#fff',
          borderRadius: 18,
          overflow: 'hidden',
          boxShadow: '0 24px 60px rgba(0,0,0,0.28)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '16px 18px', borderBottom: `1px solid ${BORDER}` }}>
          <div style={{ width: 36, height: 36, borderRadius: 11, flexShrink: 0, background: 'rgba(35,59,143,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CalendarClock size={18} style={{ color: '#233B8F' }} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{ fontSize: 14.5, fontWeight: 800, margin: 0 }}>{isEditing ? 'Editar publicación' : 'Programar publicación'}</p>
            <p style={{ fontSize: 11.5, color: MUTED, margin: '1px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {group.subject}
            </p>
          </div>
          <button onClick={onClose} disabled={saving} style={{ border: 'none', background: '#F0F3F7', width: 32, height: 32, borderRadius: 9, cursor: saving ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <X size={16} style={{ color: '#6B7280' }} />
          </button>
        </div>

        {/* Body scrollable */}
        <div style={{ padding: 18, overflowY: 'auto' }}>
          {error && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 12, padding: '10px 12px', marginBottom: 14 }}>
              <AlertTriangle size={14} style={{ color: '#DC2626', flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: 12, color: '#DC2626', margin: 0, lineHeight: 1.4 }}>{error}</p>
            </div>
          )}

          {/* Mensaje */}
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Mensaje <span style={{ textTransform: 'none', fontWeight: 600, color: '#B0B7C3' }}>· opcional si adjuntás imagen</span></label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={'Escribí el mensaje que se enviará al grupo…'}
              rows={4}
              style={{ ...inputStyle, cursor: 'text', resize: 'vertical', lineHeight: 1.5, minHeight: 90, fontFamily: 'inherit' }}
            />
          </div>

          {/* Adjuntos (varias imágenes/videos/flyer/pdf) */}
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Adjuntos <span style={{ textTransform: 'none', fontWeight: 600, color: '#B0B7C3' }}>· imágenes, flyer, videos, PDF</span></label>
            {assetIds.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                {assetIds.map((id) => {
                  const a = mediaById.get(id)
                  const Icon = a ? MEDIA_ICON[a.type] : FileText
                  return (
                    <span key={id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 6px 5px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700, color: '#233B8F', background: 'rgba(35,59,143,0.09)' }}>
                      <Icon size={12} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>{a ? a.title : 'Recurso'}</span>
                      <button type="button" onClick={() => setAssetIds((p) => p.filter((x) => x !== id))} title="Quitar" style={{ border: 'none', background: 'transparent', cursor: 'pointer', display: 'inline-flex', padding: 2, color: 'inherit', opacity: 0.7 }}>
                        <X size={12} />
                      </button>
                    </span>
                  )
                })}
              </div>
            )}
            {/* Subir directo imagen/video (además de elegir de la Biblioteca) */}
            <input
              ref={fileRef}
              type="file"
              accept="image/*,video/*"
              style={{ display: 'none' }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadPostMedia(f) }}
            />
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                style={{ fontSize: 13, fontWeight: 800, padding: '9px 14px', borderRadius: 10, border: `1px solid ${BRAND}`, background: 'rgba(0,229,208,0.08)', color: BRAND, cursor: uploading ? 'default' : 'pointer', opacity: uploading ? 0.6 : 1 }}
              >
                {uploading ? '⏳ Subiendo…' : '📎 Subir imagen o video'}
              </button>
              <span style={{ fontSize: 12, color: MUTED }}>o elegí uno de la Biblioteca ↓</span>
            </div>
            <select
              value=""
              onChange={(e) => {
                const id = e.target.value
                if (id) setAssetIds((p) => (p.includes(id) ? p : [...p, id]))
                e.currentTarget.value = ''
              }}
              disabled={availableMedia.length === 0}
              style={inputStyle}
            >
              <option value="">{assetIds.length > 0 ? '+ Agregar otro…' : 'Elegí una imagen/archivo…'}</option>
              {availableMedia.map((m) => (
                <option key={m.id} value={m.id}>
                  {MEDIA_LABEL[m.type]} — {m.title}
                </option>
              ))}
            </select>
          </div>

          {/* Empieza (fecha y hora) + repetir */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={labelStyle}>Empieza · fecha y hora</label>
              <input
                type="datetime-local"
                value={scheduledAt}
                min={minLocal}
                onChange={(e) => setScheduledAt(e.target.value)}
                style={{ ...inputStyle, cursor: 'text' }}
              />
            </div>
            <div>
              <label style={labelStyle}>Repetir</label>
              <select value={repeat} onChange={(e) => setRepeat(e.target.value as ScheduledPost['repeat'])} style={inputStyle}>
                <option value="NONE">Una sola vez</option>
                <option value="INTERVAL">Cada cierto tiempo</option>
                <option value="DAILY">Cada día (a esa hora)</option>
                <option value="WEEKDAYS">Días específicos (elegís cuáles)</option>
                <option value="WEEKLY">Cada semana (ese día y hora)</option>
              </select>
            </div>
          </div>

          {/* Intervalo "de cada rato" (solo si repite cada cierto tiempo) */}
          {repeat === 'INTERVAL' && (
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Cada cuánto</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="number"
                  min={1}
                  value={intervalValue}
                  onChange={(e) => setIntervalValue(Math.max(1, parseInt(e.target.value || '1', 10)))}
                  style={{ ...inputStyle, cursor: 'text', width: 100, flexShrink: 0 }}
                />
                <select
                  value={intervalUnit}
                  onChange={(e) => setIntervalUnit(e.target.value as 'MINUTES' | 'HOURS')}
                  style={inputStyle}
                >
                  <option value="HOURS">horas</option>
                  <option value="MINUTES">minutos</option>
                </select>
              </div>
              <p style={{ fontSize: 11, color: MUTED, margin: '6px 0 0' }}>
                Mínimo 15 minutos entre envíos (para no arriesgar el número).
              </p>
            </div>
          )}

          {/* Días específicos de la semana (solo si repite por días) */}
          {repeat === 'WEEKDAYS' && (
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>¿Qué días?</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {WEEKDAY_ORDER.map((d) => {
                  const on = weekdays.includes(d)
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() =>
                        setWeekdays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]))
                      }
                      style={{
                        minWidth: 46,
                        padding: '8px 10px',
                        borderRadius: 10,
                        fontSize: 12.5,
                        fontWeight: 800,
                        cursor: 'pointer',
                        color: on ? '#fff' : '#374151',
                        background: on ? BRAND : '#F8FAFC',
                        border: `1px solid ${on ? 'transparent' : BORDER}`,
                      }}
                    >
                      {DAY_SHORT[d]}
                    </button>
                  )
                })}
              </div>
              <p style={{ fontSize: 11, color: MUTED, margin: '6px 0 0' }}>
                Se enviará esos días, a la hora que elegiste arriba.
              </p>
            </div>
          )}

          {/* Fecha de fin (solo si se repite) */}
          {repeat !== 'NONE' && (
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>
                Termina el <span style={{ textTransform: 'none', fontWeight: 600, color: '#B0B7C3' }}>· opcional (si lo dejás vacío, sigue indefinidamente)</span>
              </label>
              <input
                type="datetime-local"
                value={repeatUntil}
                min={scheduledAt || minLocal}
                onChange={(e) => setRepeatUntil(e.target.value)}
                style={{ ...inputStyle, cursor: 'text' }}
              />
            </div>
          )}

          {/* Reenviar al privado de contactos tibios */}
          <button
            type="button"
            onClick={() => setAlsoToPrivate((v) => !v)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: 12,
              padding: '11px 13px', borderRadius: 11, cursor: 'pointer', marginBottom: 12,
              background: alsoToPrivate ? 'rgba(22,163,74,0.07)' : '#F8FAFC',
              border: `1px solid ${alsoToPrivate ? 'rgba(22,163,74,0.3)' : BORDER}`,
            }}
          >
            <span style={{ display: 'flex', flexDirection: 'column', gap: 2, textAlign: 'left', minWidth: 0 }}>
              <span style={{ fontSize: 12.5, fontWeight: 800, color: '#111827' }}>También enviar al privado 💬</span>
              <span style={{ fontSize: 10.5, color: MUTED, lineHeight: 1.4 }}>
                Manda lo mismo al 1:1 de quienes YA te escribieron (seguro — no a desconocidos).
              </span>
            </span>
            <span style={{ position: 'relative', width: 42, height: 23, borderRadius: 999, flexShrink: 0, background: alsoToPrivate ? '#16A34A' : '#D1D5DB' }}>
              <span style={{ position: 'absolute', top: 3, left: alsoToPrivate ? 22 : 3, width: 17, height: 17, borderRadius: 999, background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'left 0.15s' }} />
            </span>
          </button>

          <button
            onClick={submit}
            disabled={saving}
            style={{ width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 16px', borderRadius: 12, fontSize: 13.5, fontWeight: 800, color: '#fff', background: BRAND, border: 'none', cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.6 : 1, boxShadow: '0 8px 20px rgba(0,229,208,0.24)' }}
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <CalendarPlus size={15} />}
            {saving ? 'Guardando…' : isEditing ? 'Guardar cambios' : 'Programar publicación'}
          </button>

          {/* Lista de programadas */}
          <div style={{ marginTop: 20 }}>
            <p style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9CA3AF', margin: '0 0 10px' }}>
              Publicaciones programadas
            </p>
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0' }}>
                <Loader2 size={20} className="animate-spin" style={{ color: '#147e95' }} />
              </div>
            ) : posts.length === 0 ? (
              <p style={{ fontSize: 12.5, color: MUTED, margin: 0, lineHeight: 1.5 }}>
                Todavía no hay publicaciones programadas para este grupo.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {posts.map((p) => {
                  const sm = statusMeta(p.status)
                  const when = new Date(p.scheduledAt)
                  const whenStr = isNaN(when.getTime())
                    ? '—'
                    : when.toLocaleString('es-BO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                  return (
                    <div key={p.id} style={{ border: `1px solid ${BORDER}`, borderRadius: 12, padding: '10px 12px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', marginBottom: 4 }}>
                          <span style={{ fontSize: 11, fontWeight: 800, color: sm.color, background: sm.bg, padding: '2px 8px', borderRadius: 999 }}>{sm.label}</span>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 700, color: '#374151' }}>
                            <CalendarClock size={12} /> {whenStr}
                          </span>
                          {p.repeat !== 'NONE' && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: '#147e95' }}>
                              <Repeat size={11} /> {repeatText(p)}
                            </span>
                          )}
                          {p.repeatUntil && (() => {
                            const end = new Date(p.repeatUntil)
                            if (isNaN(end.getTime())) return null
                            return (
                              <span style={{ fontSize: 11, fontWeight: 700, color: '#6B7280' }}>
                                hasta {end.toLocaleString('es-BO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )
                          })()}
                          {p.mediaAssetIds.length > 0 && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: '#233B8F' }}>
                              <ImageIcon size={11} /> {p.mediaAssetIds.length}
                            </span>
                          )}
                          {p.alsoToPrivate && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: '#16A34A' }}>
                              💬 también al privado
                            </span>
                          )}
                        </div>
                        {p.body && (
                          p.body.trim().startsWith('[MOTIVACIÓN DIARIA') ? (
                            <p style={{ fontSize: 12.5, color: '#147e95', margin: 0, lineHeight: 1.45, fontWeight: 600 }}>
                              🔄 Frase motivacional del día — rota una frase distinta cada vez (nunca repite la misma).
                            </p>
                          ) : (
                            <p style={{ fontSize: 12.5, color: '#4B5563', margin: 0, lineHeight: 1.45, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                              {p.body}
                            </p>
                          )
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                        {(p.status === 'PENDING' || p.status === 'CANCELLED') && (
                          <button onClick={() => togglePause(p)} disabled={pausingId === p.id} title={p.status === 'CANCELLED' ? 'Reactivar' : 'Pausar'} style={{ border: 'none', background: 'rgba(0,229,208,0.09)', width: 30, height: 30, borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {pausingId === p.id ? <Loader2 size={13} className="animate-spin" style={{ color: '#147e95' }} /> : (p.status === 'CANCELLED' ? <Play size={13} style={{ color: '#147e95' }} /> : <Pause size={13} style={{ color: '#147e95' }} />)}
                          </button>
                        )}
                        <button onClick={() => remove(p.id)} disabled={deletingId === p.id} title="Eliminar" style={{ border: 'none', background: 'rgba(220,38,38,0.08)', width: 30, height: 30, borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {deletingId === p.id ? <Loader2 size={13} className="animate-spin" style={{ color: '#DC2626' }} /> : <Trash2 size={13} style={{ color: '#DC2626' }} />}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
