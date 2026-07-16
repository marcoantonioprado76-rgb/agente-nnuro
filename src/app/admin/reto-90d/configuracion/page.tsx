'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Settings, Save, Loader2, Check, AlertCircle, Info, Bot, Clock, Globe, Sparkles,
  QrCode, Smartphone, Power, RefreshCw, Mic,
} from 'lucide-react'

// ── Paleta de marca ───────────────────────────────────────────────────────────
const BRAND_GRADIENT = 'linear-gradient(135deg,#1fb8bb,#147e95,#12303a)'

// ── Sub-navegación del módulo Reto 90D ────────────────────────────────────────
const NAV = [
  { href: '/admin/reto-90d', label: 'Resumen' },
  { href: '/admin/reto-90d/tablero', label: 'Tablero' },
  { href: '/admin/reto-90d/tareas', label: 'Tareas' },
  { href: '/admin/reto-90d/usuarios', label: 'Usuarios' },
  { href: '/admin/reto-90d/evidencias', label: 'Evidencias' },
  { href: '/admin/reto-90d/reportes', label: 'Reportes' },
  { href: '/admin/reto-90d/configuracion', label: 'Configuración' },
]

function SubNav() {
  const pathname = usePathname()
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 24 }}>
      {NAV.map(n => {
        const active = pathname === n.href
        return (
          <Link
            key={n.href}
            href={n.href}
            style={{
              padding: '7px 14px', borderRadius: 999, fontSize: 13, fontWeight: 700, textDecoration: 'none',
              border: active ? 'none' : '1px solid #E4E9F0',
              background: active ? BRAND_GRADIENT : '#fff',
              color: active ? '#fff' : '#6B7280',
            }}
          >
            {n.label}
          </Link>
        )
      })}
    </div>
  )
}

// ── Switch reutilizable ───────────────────────────────────────────────────────
function Toggle({ on, onToggle, label }: { on: boolean; onToggle: () => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={on}
      aria-label={label}
      style={{
        width: 46, height: 26, borderRadius: 99, border: 'none', cursor: 'pointer',
        background: on ? BRAND_GRADIENT : '#D9E0EA',
        position: 'relative', transition: 'background 0.2s', flexShrink: 0,
      }}
    >
      <span
        style={{
          position: 'absolute', top: 3, left: on ? 23 : 3,
          width: 20, height: 20, borderRadius: '50%', background: '#fff',
          transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        }}
      />
    </button>
  )
}

// ── Conexión del número del reto (QR dedicado, aparte de los bots) ─────────────
interface ConnStatus { status: string; qrBase64?: string; phone?: string }

function RetoConnection() {
  const [status, setStatus] = useState<ConnStatus>({ status: 'loading' })
  const [connecting, setConnecting] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  async function fetchStatus(): Promise<string | undefined> {
    try {
      const r = await fetch('/api/admin/reto-90d/connection')
      const d = await r.json().catch(() => null)
      if (!r.ok || !d) throw new Error(d?.error ?? `HTTP ${r.status}`)
      const s: ConnStatus = d.status ?? { status: 'disconnected' }
      setStatus(s)
      setErr(null)
      return s.status
    } catch (e) {
      // No dejar el spinner infinito: pasamos a estado de error con opción de reintentar.
      setStatus({ status: 'error' })
      setErr(e instanceof Error ? e.message : 'No se pudo consultar el estado de la conexión.')
      return undefined
    }
  }

  function stopPolling() {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
  }
  function startPolling() {
    stopPolling()
    pollRef.current = setInterval(async () => {
      const s = await fetchStatus()
      if (s === 'connected' || s === 'disconnected') { stopPolling(); setConnecting(false) }
    }, 2500)
  }

  useEffect(() => {
    fetchStatus().then((s) => { if (s === 'connecting' || s === 'qr_ready') startPolling() })
    return () => stopPolling()
  }, [])

  async function connect() {
    setConnecting(true); setErr(null)
    try {
      const r = await fetch('/api/admin/reto-90d/connection', { method: 'POST' })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(d.error ?? `HTTP ${r.status}`)
      setStatus({ status: 'connecting' })
      startPolling()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'No se pudo conectar el número del reto.')
      setConnecting(false)
    }
  }

  async function disconnect() {
    setErr(null)
    try { await fetch('/api/admin/reto-90d/connection', { method: 'DELETE' }) } catch {}
    stopPolling(); setConnecting(false)
    await fetchStatus()
  }

  const st = status.status
  const connected = st === 'connected'
  const box: React.CSSProperties = { border: '1px solid #E4E9F0', borderRadius: 14, padding: 16, background: '#F9FAFC' }
  const primaryBtn: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 10,
    fontSize: 13, fontWeight: 800, color: '#fff', border: 'none', background: BRAND_GRADIENT,
    cursor: connecting ? 'wait' : 'pointer', opacity: connecting ? 0.75 : 1,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 10, padding: '12px 14px', borderRadius: 12, background: 'rgba(217,119,6,0.06)', border: '1px solid rgba(217,119,6,0.25)' }}>
        <AlertCircle size={15} style={{ color: '#D97706', flexShrink: 0, marginTop: 1 }} />
        <p style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.6, margin: 0 }}>
          Este número es <strong style={{ color: '#111827' }}>exclusivo del reto</strong>. Usa un número de WhatsApp
          <strong style={{ color: '#111827' }}> DIFERENTE</strong> al de tus bots de venta — se conecta aquí, aparte, y no se mezcla con ningún bot.
        </p>
      </div>

      <div style={box}>
        {st === 'loading' ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0' }}>
            <Loader2 size={18} className="animate-spin" style={{ color: '#147e95' }} />
          </div>
        ) : connected ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(22,163,74,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Smartphone size={17} style={{ color: '#16A34A' }} />
              </div>
              <div>
                <p style={{ fontSize: 13.5, fontWeight: 800, color: '#16A34A', margin: 0 }}>Número conectado ✅</p>
                <p style={{ fontSize: 12, color: '#6B7280', margin: '2px 0 0' }}>{status.phone ? `+${status.phone}` : 'Número del reto activo'}</p>
              </div>
            </div>
            <button onClick={disconnect} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, fontSize: 12.5, fontWeight: 700, background: '#fff', border: '1px solid #E4E9F0', color: '#DC2626', cursor: 'pointer' }}>
              <Power size={13} /> Desconectar
            </button>
          </div>
        ) : st === 'qr_ready' && status.qrBase64 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <p style={{ fontSize: 12.5, color: '#6B7280', margin: 0, textAlign: 'center' }}>
              Abre <strong style={{ color: '#111827' }}>WhatsApp → Dispositivos vinculados</strong> en el teléfono del reto y escanea:
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={status.qrBase64} alt="QR del número del reto" style={{ width: 200, height: 200, borderRadius: 12, border: '1px solid #E4E9F0' }} />
            <button onClick={connect} disabled={connecting} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 10, fontSize: 12.5, fontWeight: 700, background: '#fff', border: '1px solid #E4E9F0', color: '#6B7280', cursor: 'pointer' }}>
              <RefreshCw size={13} className={connecting ? 'animate-spin' : ''} /> Regenerar QR
            </button>
          </div>
        ) : st === 'connecting' ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '6px 0' }}>
            <Loader2 size={20} className="animate-spin" style={{ color: '#147e95' }} />
            <p style={{ fontSize: 12.5, color: '#6B7280', margin: 0 }}>Generando QR…</p>
          </div>
        ) : st === 'error' ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '4px 0' }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(220,38,38,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertCircle size={19} style={{ color: '#DC2626' }} />
            </div>
            <p style={{ fontSize: 12.5, color: '#6B7280', margin: 0, textAlign: 'center' }}>No se pudo consultar el estado de la conexión.</p>
            <button
              onClick={() => { fetchStatus().then((s) => { if (s === 'connecting' || s === 'qr_ready') startPolling() }) }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 10, fontSize: 12.5, fontWeight: 700, color: '#fff', border: 'none', background: BRAND_GRADIENT, cursor: 'pointer' }}
            >
              <RefreshCw size={14} /> Reintentar
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '4px 0' }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(0,229,208,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <QrCode size={19} style={{ color: '#147e95' }} />
            </div>
            <p style={{ fontSize: 12.5, color: '#6B7280', margin: 0, textAlign: 'center' }}>El número del reto no está conectado.</p>
            <button onClick={connect} disabled={connecting} style={primaryBtn}>
              <QrCode size={15} /> {connecting ? 'Conectando…' : 'Conectar número del reto'}
            </button>
          </div>
        )}
      </div>

      {err && <p style={{ fontSize: 12, color: '#DC2626', margin: 0 }}>{err}</p>}
    </div>
  )
}

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface RetoConfig {
  botId: string
  adminPhone: string
  groupId: string
  isActive: boolean
  sendGroupReports: boolean
  morningReminderTime: string
  middayReminderTime: string
  afternoonReminderTime: string
  nightReminderTime: string
  finalReportTime: string
  timezone: string
  botInstructions: string
  welcomeMessage: string
  voiceId: string
}

const DEFAULTS: RetoConfig = {
  botId: '',
  adminPhone: '',
  groupId: '',
  isActive: true,
  sendGroupReports: false,
  morningReminderTime: '09:00',
  middayReminderTime: '12:30',
  afternoonReminderTime: '17:30',
  nightReminderTime: '21:30',
  finalReportTime: '23:50',
  timezone: 'America/La_Paz',
  botInstructions: '',
  welcomeMessage: '',
  voiceId: '',
}

const labelStyle: React.CSSProperties = { fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 6, fontWeight: 600 }
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', borderRadius: 10, fontSize: 13, color: '#111827',
  background: '#F4F6FA', border: '1px solid #E4E9F0', outline: 'none', boxSizing: 'border-box',
}

export default function RetoConfiguracionPage() {
  const [form, setForm] = useState<RetoConfig>(DEFAULTS)
  const [groups, setGroups] = useState<{ id: string; subject: string; size?: number }[]>([])
  const [groupsLoading, setGroupsLoading] = useState(false)
  const [groupsMsg, setGroupsMsg] = useState<string | null>(null)
  const [keyInput, setKeyInput] = useState('')
  const [hasKey, setHasKey] = useState(false)
  const [removeKey, setRemoveKey] = useState(false)
  const [elevenInput, setElevenInput] = useState('')
  const [hasEleven, setHasEleven] = useState(false)
  const [removeEleven, setRemoveEleven] = useState(false)
  const [voices, setVoices] = useState<{ id: string; name: string; desc?: string }[]>([])
  const [voicesLoading, setVoicesLoading] = useState(false)
  const [voicesMsg, setVoicesMsg] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const r = await fetch('/api/admin/reto-90d/settings')
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        const d = await r.json()
        if (!alive) return
        const c = d.config ?? {}
        setForm({
          botId: c.botId ?? '',
          adminPhone: c.adminPhone ?? '',
          groupId: c.groupId ?? '',
          isActive: typeof c.isActive === 'boolean' ? c.isActive : DEFAULTS.isActive,
          sendGroupReports: typeof c.sendGroupReports === 'boolean' ? c.sendGroupReports : DEFAULTS.sendGroupReports,
          morningReminderTime: c.morningReminderTime ?? DEFAULTS.morningReminderTime,
          middayReminderTime: c.middayReminderTime ?? DEFAULTS.middayReminderTime,
          afternoonReminderTime: c.afternoonReminderTime ?? DEFAULTS.afternoonReminderTime,
          nightReminderTime: c.nightReminderTime ?? DEFAULTS.nightReminderTime,
          finalReportTime: c.finalReportTime ?? DEFAULTS.finalReportTime,
          timezone: c.timezone ?? DEFAULTS.timezone,
          botInstructions: c.botInstructions ?? '',
          welcomeMessage: c.welcomeMessage ?? '',
          voiceId: c.voiceId ?? '',
        })
        setHasKey(!!d.hasOpenaiKey)
        setHasEleven(!!d.hasElevenKey)
      } catch {
        if (alive) setError('No se pudo cargar la configuración.')
      } finally {
        if (alive) setLoading(false)
      }
    }
    load()
    return () => { alive = false }
  }, [])

  function set<K extends keyof RetoConfig>(key: K, value: RetoConfig[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  async function loadVoices() {
    setVoicesLoading(true)
    setVoicesMsg(null)
    try {
      const r = await fetch('/api/admin/reto-90d/voices')
      const d = await r.json().catch(() => ({}))
      const list = Array.isArray(d.voices) ? d.voices : []
      setVoices(list)
      if (!list.length) setVoicesMsg('No se encontraron voces.')
      else if (d.source === 'catalog') setVoicesMsg('Mostrando voces del catálogo (agrega tu API key de ElevenLabs para ver las tuyas).')
      else setVoicesMsg(`${list.length} voces de tu cuenta ElevenLabs.`)
    } catch {
      setVoicesMsg('No se pudieron cargar las voces.')
    } finally {
      setVoicesLoading(false)
    }
  }

  async function loadGroups() {
    setGroupsLoading(true)
    setGroupsMsg(null)
    try {
      const r = await fetch('/api/admin/reto-90d/groups')
      const d = await r.json()
      if (!d.connected) {
        setGroups([])
        setGroupsMsg('Conecta primero el número del reto (arriba) para ver tus grupos.')
      } else if (!Array.isArray(d.groups) || d.groups.length === 0) {
        setGroups([])
        setGroupsMsg('El número del reto no está en ningún grupo todavía.')
      } else {
        setGroups(d.groups)
        setGroupsMsg(null)
      }
    } catch {
      setGroupsMsg('No se pudieron cargar los grupos.')
    } finally {
      setGroupsLoading(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const body = {
        // botId lo gestiona la conexión del reto (no se toca al guardar ajustes)
        adminPhone: form.adminPhone.trim() || null,
        groupId: form.groupId.trim() || null,
        isActive: form.isActive,
        sendGroupReports: form.sendGroupReports,
        morningReminderTime: form.morningReminderTime,
        middayReminderTime: form.middayReminderTime,
        afternoonReminderTime: form.afternoonReminderTime,
        nightReminderTime: form.nightReminderTime,
        finalReportTime: form.finalReportTime,
        timezone: form.timezone.trim() || DEFAULTS.timezone,
        botInstructions: form.botInstructions.trim() || null,
        welcomeMessage: form.welcomeMessage.trim() || null,
        voiceId: form.voiceId || null,
        // Keys: si escribió una, la manda; si pidió quitarla, null; si no, no la toca.
        ...(removeKey ? { openaiApiKey: null } : keyInput.trim() ? { openaiApiKey: keyInput.trim() } : {}),
        ...(removeEleven ? { elevenLabsApiKey: null } : elevenInput.trim() ? { elevenLabsApiKey: elevenInput.trim() } : {}),
      }
      const r = await fetch('/api/admin/reto-90d/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!r.ok) {
        const j = await r.json().catch(() => ({}))
        throw new Error(j.error ?? `HTTP ${r.status}`)
      }
      if (removeKey) { setHasKey(false); setRemoveKey(false) }
      else if (keyInput.trim()) { setHasKey(true) }
      setKeyInput('')
      if (removeEleven) { setHasEleven(false); setRemoveEleven(false) }
      else if (elevenInput.trim()) { setHasEleven(true) }
      setElevenInput('')
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar la configuración.')
    } finally {
      setSaving(false)
    }
  }

  const TIMES: { key: keyof RetoConfig; label: string }[] = [
    { key: 'morningReminderTime', label: 'Recordatorio mañana' },
    { key: 'middayReminderTime', label: 'Recordatorio mediodía' },
    { key: 'afternoonReminderTime', label: 'Recordatorio tarde' },
    { key: 'nightReminderTime', label: 'Recordatorio noche' },
    { key: 'finalReportTime', label: 'Reporte final del día' },
  ]

  return (
    <div className="dm-page font-ui">
      <div style={{ maxWidth: 720 }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 className="text-xl font-bold text-[#111827] uppercase tracking-widest flex items-center gap-2">
            <Settings size={18} className="text-[#147e95]" /> Reto 90D — Configuración
          </h1>
          <div className="h-px w-16 mt-2 rounded-full" style={{ background: BRAND_GRADIENT }} />
        </div>

        <SubNav />

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 size={22} className="animate-spin text-[#147e95]" />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Aviso QR ──────────────────────────────────────────── */}
            <div
              style={{
                display: 'flex', gap: 10, padding: '14px 16px', borderRadius: 14,
                background: 'rgba(0,229,208,0.06)', border: '1px solid rgba(0,229,208,0.2)',
              }}
            >
              <Info size={16} className="text-[#147e95]" style={{ flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: 12.5, color: '#6B7280', lineHeight: 1.6, margin: 0 }}>
                El número del reto se conecta <strong style={{ color: '#111827' }}>aquí mismo</strong> por QR
                (más abajo). Es un número dedicado, aparte de tus bots de venta.
              </p>
            </div>

            {/* Card: Instrucciones del bot (system prompt) ───────── */}
            <div style={{ background: '#fff', border: '1px solid #E4E9F0', borderRadius: 16, padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Sparkles size={15} className="text-[#147e95]" />
                <p style={{ fontSize: 13, fontWeight: 800, color: '#111827', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Instrucciones del bot (personalidad)
                </p>
              </div>
              <p style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.6, margin: '0 0 12px' }}>
                Escribe el contexto del plan de 90 días y cómo debe tratar el bot a los participantes
                (tono, motivación, reglas). La IA seguirá estas instrucciones al responderles.
              </p>
              <textarea
                value={form.botInstructions}
                onChange={e => set('botInstructions', e.target.value)}
                rows={7}
                placeholder={"Ej: Eres el coach del Reto 90 Días de My Diamond. Trata a cada participante por su nombre, con energía y cercanía (tutéalos). Recuérdales el porqué del reto y felicítalos cuando cumplen. Sé claro y breve. Si una evidencia no corresponde, explícales con amabilidad qué falta."}
                style={{ ...inputStyle, resize: 'vertical', minHeight: 120, lineHeight: 1.6, fontFamily: 'inherit' }}
              />
            </div>

            {/* Card: Mensaje de bienvenida ──────────────────────── */}
            <div style={{ background: '#fff', border: '1px solid #E4E9F0', borderRadius: 16, padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Sparkles size={15} className="text-[#147e95]" />
                <p style={{ fontSize: 13, fontWeight: 800, color: '#111827', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Mensaje de bienvenida
                </p>
              </div>
              <p style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.6, margin: '0 0 12px' }}>
                Se envía por WhatsApp apenas alguien se registra. Usa <code>{'{nombre}'}</code> y <code>{'{reto}'}</code>
                {' '}y se reemplazan solos. Si lo dejas vacío, se usa un mensaje por defecto.
              </p>
              <textarea
                value={form.welcomeMessage}
                onChange={e => set('welcomeMessage', e.target.value)}
                rows={5}
                placeholder={'¡Felicidades {nombre}! 🎉 Te uniste al reto {reto}. Envíame tus evidencias (foto o texto) y te las reviso. Si me preguntas "¿qué me falta?" te digo tus pendientes. ¡Vamos! 💪'}
                style={{ ...inputStyle, resize: 'vertical', minHeight: 96, lineHeight: 1.6, fontFamily: 'inherit' }}
              />
            </div>

            {/* Card: API Key de OpenAI (motor de la IA) ──────────── */}
            <div style={{ background: '#fff', border: '1px solid #E4E9F0', borderRadius: 16, padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Sparkles size={15} className="text-[#147e95]" />
                <p style={{ fontSize: 13, fontWeight: 800, color: '#111827', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  API Key de OpenAI
                </p>
                {hasKey && !removeKey && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 800, color: '#16A34A', background: 'rgba(22,163,74,0.1)', padding: '2px 8px', borderRadius: 999 }}>
                    <Check size={11} /> Configurada
                  </span>
                )}
              </div>
              <p style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.6, margin: '0 0 12px' }}>
                Con esta key el bot clasifica las fotos y conversa. Se guarda cifrada. Si la dejas vacía, el bot
                usa la del entorno (si existe) o responde en modo básico.
              </p>
              <input
                type="password"
                value={keyInput}
                onChange={e => { setKeyInput(e.target.value); setRemoveKey(false); setSaved(false) }}
                placeholder={hasKey ? '•••••••••• (ya configurada — escribe para reemplazar)' : 'sk-...'}
                autoComplete="off"
                style={inputStyle}
              />
              {hasKey && !removeKey && (
                <button
                  type="button"
                  onClick={() => { setRemoveKey(true); setKeyInput(''); setSaved(false) }}
                  style={{ marginTop: 8, background: 'none', border: 'none', color: '#DC2626', fontSize: 12, fontWeight: 700, cursor: 'pointer', padding: 0 }}
                >
                  Quitar la key guardada
                </button>
              )}
              {removeKey && (
                <p style={{ fontSize: 12, color: '#DC2626', margin: '8px 0 0' }}>
                  Se quitará la key al guardar. <button type="button" onClick={() => setRemoveKey(false)} style={{ background: 'none', border: 'none', color: '#233B8F', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>Cancelar</button>
                </p>
              )}
            </div>

            {/* Card: Voz del bot (ElevenLabs) ────────────────────── */}
            <div style={{ background: '#fff', border: '1px solid #E4E9F0', borderRadius: 16, padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Mic size={15} className="text-[#147e95]" />
                <p style={{ fontSize: 13, fontWeight: 800, color: '#111827', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Voz del bot (ElevenLabs)
                </p>
                {hasEleven && !removeEleven && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 800, color: '#16A34A', background: 'rgba(22,163,74,0.1)', padding: '2px 8px', borderRadius: 999 }}>
                    <Check size={11} /> Conectada
                  </span>
                )}
              </div>
              <p style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.6, margin: '0 0 12px' }}>
                Cuando un participante manda un <strong>audio</strong>, el bot responde con <strong>nota de voz</strong>.
                Conecta tu API key de ElevenLabs y elige la voz. Se guarda cifrada.
              </p>

              {/* API key ElevenLabs */}
              <label htmlFor="reto-eleven-key" style={labelStyle}>API Key de ElevenLabs</label>
              <input
                id="reto-eleven-key"
                type="password"
                value={elevenInput}
                onChange={e => { setElevenInput(e.target.value); setRemoveEleven(false); setSaved(false) }}
                placeholder={hasEleven ? '•••••••••• (ya configurada — escribe para reemplazar)' : 'Tu API key de ElevenLabs'}
                autoComplete="off"
                style={inputStyle}
              />
              {hasEleven && !removeEleven && (
                <button type="button" onClick={() => { setRemoveEleven(true); setElevenInput(''); setSaved(false) }}
                  style={{ marginTop: 8, background: 'none', border: 'none', color: '#DC2626', fontSize: 12, fontWeight: 700, cursor: 'pointer', padding: 0 }}>
                  Quitar la key guardada
                </button>
              )}
              {removeEleven && (
                <p style={{ fontSize: 12, color: '#DC2626', margin: '8px 0 0' }}>
                  Se quitará al guardar. <button type="button" onClick={() => setRemoveEleven(false)} style={{ background: 'none', border: 'none', color: '#233B8F', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>Cancelar</button>
                </p>
              )}

              {/* Selector de voz */}
              <div style={{ marginTop: 16 }}>
                <label style={labelStyle}>Voz</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <button type="button" onClick={loadVoices} disabled={voicesLoading}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 10, fontSize: 12.5, fontWeight: 700, color: '#fff', border: 'none', background: BRAND_GRADIENT, cursor: voicesLoading ? 'wait' : 'pointer', flexShrink: 0 }}>
                    {voicesLoading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />} Cargar voces
                  </button>
                  <select
                    value={form.voiceId}
                    onChange={e => set('voiceId', e.target.value)}
                    style={{ ...inputStyle, flex: 1, minWidth: 180, cursor: 'pointer' }}
                  >
                    <option value="">— Voz por defecto —</option>
                    {voices.map(v => (
                      <option key={v.id} value={v.id}>{v.name}{v.desc ? ` · ${v.desc}` : ''}</option>
                    ))}
                    {/* Mantener la voz guardada aunque no esté en la lista cargada */}
                    {form.voiceId && !voices.some(v => v.id === form.voiceId) && (
                      <option value={form.voiceId}>Voz guardada ({form.voiceId.slice(0, 8)}…)</option>
                    )}
                  </select>
                </div>
                {voicesMsg && <p style={{ fontSize: 11, color: '#9CA3AF', margin: '8px 0 0' }}>{voicesMsg}</p>}
              </div>
            </div>

            {/* Card: Bot y contactos ─────────────────────────────── */}
            <div style={{ background: '#fff', border: '1px solid #E4E9F0', borderRadius: 16, padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <Bot size={15} className="text-[#147e95]" />
                <p style={{ fontSize: 13, fontWeight: 800, color: '#111827', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Bot y contactos
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Conexión dedicada del número del reto (QR aparte) */}
                <RetoConnection />

                {/* Admin phone */}
                <div>
                  <label htmlFor="reto-admin-phone" style={labelStyle}>Teléfono del admin</label>
                  <input
                    id="reto-admin-phone"
                    type="text"
                    value={form.adminPhone}
                    onChange={e => set('adminPhone', e.target.value)}
                    placeholder="591XXXXXXXX"
                    style={inputStyle}
                  />
                </div>

                {/* Group id — sugerencias automáticas de los grupos del número */}
                <div>
                  <label style={labelStyle}>Grupo de WhatsApp (reportes)</label>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <button
                      type="button"
                      onClick={loadGroups}
                      disabled={groupsLoading}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10,
                        fontSize: 12.5, fontWeight: 700, color: '#fff', border: 'none', background: BRAND_GRADIENT,
                        cursor: groupsLoading ? 'wait' : 'pointer', opacity: groupsLoading ? 0.75 : 1, flexShrink: 0,
                      }}
                    >
                      {groupsLoading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                      {groupsLoading ? 'Buscando…' : 'Sugerir mis grupos'}
                    </button>
                    {groups.length > 0 && (
                      <select
                        value={groups.some(g => g.id === form.groupId) ? form.groupId : ''}
                        onChange={e => set('groupId', e.target.value)}
                        style={{ ...inputStyle, flex: 1, minWidth: 180, cursor: 'pointer' }}
                      >
                        <option value="">— Elige un grupo —</option>
                        {groups.map(g => (
                          <option key={g.id} value={g.id}>
                            {g.subject}{g.size ? ` · ${g.size} miembros` : ''}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  {groupsMsg && (
                    <p style={{ fontSize: 11, color: '#9CA3AF', margin: '0 0 8px' }}>{groupsMsg}</p>
                  )}
                  <input
                    type="text"
                    value={form.groupId}
                    onChange={e => set('groupId', e.target.value)}
                    placeholder="1203...@g.us"
                    style={inputStyle}
                  />
                  <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 6 }}>
                    Elige uno de tus grupos (autocompleta el JID) o pégalo a mano (termina en <code>@g.us</code>).
                  </p>
                </div>
              </div>
            </div>

            {/* Card: Interruptores ───────────────────────────────── */}
            <div style={{ background: '#fff', border: '1px solid #E4E9F0', borderRadius: 16, overflow: 'hidden' }}>
              <div
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
                  padding: '16px 20px', borderBottom: '1px solid #EEF2F7',
                }}
              >
                <div>
                  <p style={{ fontSize: 13.5, fontWeight: 700, color: '#111827', margin: 0 }}>Reto activo</p>
                  <p style={{ fontSize: 11.5, color: '#9CA3AF', marginTop: 2 }}>
                    Si está apagado, el reto no envía recordatorios ni reportes.
                  </p>
                </div>
                <Toggle on={form.isActive} onToggle={() => set('isActive', !form.isActive)} label="Reto activo" />
              </div>

              <div
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
                  padding: '16px 20px',
                }}
              >
                <div>
                  <p style={{ fontSize: 13.5, fontWeight: 700, color: '#111827', margin: 0 }}>Enviar reportes al grupo</p>
                  <p style={{ fontSize: 11.5, color: '#9CA3AF', marginTop: 2 }}>
                    Publica el reporte de cierre del día en el grupo de WhatsApp.
                  </p>
                </div>
                <Toggle on={form.sendGroupReports} onToggle={() => set('sendGroupReports', !form.sendGroupReports)} label="Enviar reportes al grupo" />
              </div>
            </div>

            {/* Card: Horarios ────────────────────────────────────── */}
            <div style={{ background: '#fff', border: '1px solid #E4E9F0', borderRadius: 16, padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <Clock size={15} className="text-[#147e95]" />
                <p style={{ fontSize: 13, fontWeight: 800, color: '#111827', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Horarios
                </p>
              </div>

              <div
                style={{
                  display: 'grid', gap: 14,
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                }}
              >
                {TIMES.map(t => (
                  <div key={t.key}>
                    <label htmlFor={`reto-${t.key}`} style={labelStyle}>{t.label}</label>
                    <input
                      id={`reto-${t.key}`}
                      type="time"
                      value={String(form[t.key])}
                      onChange={e => set(t.key, e.target.value as RetoConfig[typeof t.key])}
                      style={inputStyle}
                    />
                  </div>
                ))}
              </div>

              {/* Timezone */}
              <div style={{ marginTop: 16 }}>
                <label htmlFor="reto-timezone" style={labelStyle}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <Globe size={12} /> Zona horaria
                  </span>
                </label>
                <input
                  id="reto-timezone"
                  type="text"
                  value={form.timezone}
                  onChange={e => set('timezone', e.target.value)}
                  placeholder="America/La_Paz"
                  style={{ ...inputStyle, maxWidth: 280 }}
                />
              </div>
            </div>

            {/* Error */}
            {error && (
              <div
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 12,
                  background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', color: '#b91c1c',
                }}
              >
                <AlertCircle size={16} />
                <span style={{ fontSize: 13, fontWeight: 600 }}>{error}</span>
              </div>
            )}

            {/* Guardar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '11px 22px', borderRadius: 12,
                  fontSize: 14, fontWeight: 800, color: '#fff', border: 'none',
                  background: BRAND_GRADIENT, opacity: saving ? 0.7 : 1,
                  cursor: saving ? 'wait' : 'pointer',
                }}
              >
                {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                {saving ? 'Guardando...' : 'Guardar configuración'}
              </button>
              {saved && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#059669' }}>
                  <Check size={15} /> Guardado
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
