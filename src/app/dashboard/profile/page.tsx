'use client'

import { useState, useEffect } from 'react'
import { User, Mail, MapPin, Calendar, FileText, UserCircle, Pencil, Check, X, Loader2 } from 'lucide-react'

interface UserProfile {
  fullName: string
  username: string
  email: string
  country: string
  city: string
  identityDocument: string
  dateOfBirth: string
  isActive: boolean
  createdAt: string
}

export default function ProfilePage() {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  useEffect(() => {
    fetch('/api/network')
      .then(r => r.json())
      .then(d => {
        if (d.user) setUser(d.user)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  function startEdit() {
    if (!user) return
    setNameInput(user.fullName)
    setEditing(true)
    setMsg(null)
  }

  function cancelEdit() {
    setEditing(false)
    setMsg(null)
  }

  async function saveName() {
    if (!user) return
    const trimmed = nameInput.trim()
    if (trimmed.length < 3) {
      setMsg({ type: 'err', text: 'El nombre debe tener al menos 3 caracteres' })
      return
    }
    setSaving(true)
    setMsg(null)
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: trimmed }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMsg({ type: 'err', text: d.error || 'Error al guardar' })
      } else {
        setUser({ ...user, fullName: trimmed })
        setEditing(false)
        setMsg({ type: 'ok', text: 'Nombre actualizado ✓' })
        setTimeout(() => setMsg(null), 2500)
      }
    } catch {
      setMsg({ type: 'err', text: 'Error de red. Probá de nuevo.' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: 'linear-gradient(135deg,#F8FAFC,#F5F7FA 45%,#EEF2F7)' }}>
        <Loader2 className="w-9 h-9 animate-spin" style={{ color: '#FF096C' }} />
      </div>
    )
  }

  if (!user) return null

  const fields = [
    { icon: User,     label: 'Usuario',            value: `@${user.username}`,         color: '#FF096C' },
    { icon: Mail,     label: 'Correo Electrónico',  value: user.email,                  color: '#B735B8' },
    { icon: MapPin,   label: 'Ubicación',           value: user.city && user.country ? `${user.city}, ${user.country}` : 'No especificada', color: '#233B8F' },
    { icon: Calendar, label: 'Miembro desde',       value: user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-', color: '#16A34A' },
  ]

  return (
    <div className="font-ui" style={{ background: 'radial-gradient(circle at top right, rgba(255,9,108,0.08), transparent 28%), radial-gradient(circle at bottom left, rgba(35,59,143,0.08), transparent 30%), linear-gradient(135deg, #EEF2F7 0%, #F5F7FA 45%, #E9EEF5 100%)', minHeight: '100vh' }}>
    <div className="px-4 sm:px-6 lg:px-8 pt-8 max-w-screen-xl mx-auto pb-20 space-y-6">

      {/* Header */}
      <header>
        <h1 className="font-display" style={{ fontSize: 34, fontWeight: 600, color: '#111827', margin: 0, lineHeight: 1.1 }}>Mi Perfil</h1>
        <p style={{ fontSize: 14, color: '#6B7280', margin: '6px 0 0' }}>Gestiona tu información personal.</p>
      </header>

      <div className="grid md:grid-cols-3 gap-6">

        {/* Card de perfil */}
        <div className="dm-card-dark md:col-span-1" style={{ padding: 28, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <div className="relative mb-4">
            <div style={{ width: 84, height: 84, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--dm-grad)', color: '#fff', boxShadow: '0 14px 32px rgba(255,9,108,0.26)' }}>
              <UserCircle className="w-12 h-12" />
            </div>
            <div style={{ position: 'absolute', bottom: 4, right: 4, width: 16, height: 16, borderRadius: '50%', border: '2px solid #fff', background: user.isActive ? '#16A34A' : '#ef4444' }} />
          </div>

          {editing ? (
            <div className="w-full mb-1 space-y-2">
              <input
                type="text"
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') cancelEdit() }}
                autoFocus
                disabled={saving}
                maxLength={80}
                className="dm-input"
                style={{ textAlign: 'center', fontWeight: 600 }}
              />
              <div className="flex gap-2 justify-center">
                <button onClick={saveName} disabled={saving} className="dm-btn" style={{ padding: '8px 14px', fontSize: 12 }}>
                  {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Guardar
                </button>
                <button onClick={cancelEdit} disabled={saving} className="dm-btn-ghost" style={{ padding: '8px 14px', fontSize: 12 }}>
                  <X size={13} /> Cancelar
                </button>
              </div>
            </div>
          ) : (
            <div className="group relative flex items-center justify-center gap-2 mb-1">
              <h2 className="font-display" style={{ fontSize: 22, fontWeight: 600, color: '#fff', margin: 0 }}>{user.fullName}</h2>
              <button onClick={startEdit} title="Editar nombre"
                style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Pencil className="w-3 h-3" style={{ color: '#FF096C' }} />
              </button>
            </div>
          )}

          <p style={{ fontSize: 12, letterSpacing: '0.08em', color: '#FF096C', fontWeight: 600, margin: '2px 0 14px' }}>@{user.username}</p>

          {msg && (
            <div style={{ width: '100%', marginBottom: 12, padding: '8px 12px', borderRadius: 10, fontSize: 12, fontWeight: 600,
              background: msg.type === 'ok' ? 'rgba(34,197,94,0.10)' : 'rgba(239,68,68,0.10)',
              border: `1px solid ${msg.type === 'ok' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
              color: msg.type === 'ok' ? '#16A34A' : '#dc2626' }}>
              {msg.text}
            </div>
          )}

          <div style={{ width: '100%', padding: '12px 16px', borderRadius: 14, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.42)', margin: 0 }}>Estado de Cuenta</p>
            <p style={{ fontSize: 15, fontWeight: 700, color: user.isActive ? '#16A34A' : '#ef4444', margin: '3px 0 0' }}>{user.isActive ? 'Activo' : 'Inactivo'}</p>
          </div>
        </div>

        {/* Detalles */}
        <div className="dm-card-dark md:col-span-2" style={{ padding: 28 }}>
          <div className="flex items-center gap-2 mb-6">
            <FileText className="w-4 h-4" style={{ color: '#B735B8' }} />
            <h3 style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#fff', margin: 0 }}>Detalles de la Cuenta</h3>
          </div>
          <div className="grid gap-3">
            {fields.map((field, i) => (
              <div key={i} className="flex items-center gap-4 p-3.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${field.color}14`, border: `1px solid ${field.color}28` }}>
                  <field.icon className="w-4 h-4" style={{ color: field.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(255,255,255,0.42)', margin: 0 }}>{field.label}</p>
                  <p style={{ fontSize: 14, color: '#fff', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{field.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
    </div>
  )
}
