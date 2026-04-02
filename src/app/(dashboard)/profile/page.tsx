'use client'

import { useState, useEffect, useRef } from 'react'
import { Navbar } from '@/components/layout/navbar'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  User,
  Mail,
  MapPin,
  Phone,
  Camera,
  Trash2,
  Save,
  Loader2,
  Lock,
  Eye,
  EyeOff,
  Shield,
  CheckCircle2,
  Sparkles,
  Globe,
  KeyRound,
  ImagePlus,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/use-auth'
import type { Profile } from '@/types'

export default function ProfilePage() {
  const { profile: authProfile, refreshProfile } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Form state
  const [fullName, setFullName] = useState('')
  const [country, setCountry] = useState('')
  const [city, setCity] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')

  // Password state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPw, setShowCurrentPw] = useState(false)
  const [showNewPw, setShowNewPw] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/profile')
        if (res.ok) {
          const data = await res.json()
          setProfile(data)
          setFullName(data.full_name || '')
          setCountry(data.country || '')
          setCity(data.city || '')
          setPhoneNumber(data.phone_number || '')
          setAvatarUrl(data.avatar_url || '')
        }
      } catch {
        toast.error('Error al cargar perfil')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Solo se permiten imagenes')
      return
    }

    setUploadingAvatar(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('bucket', 'avatars')

      const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData })
      if (!uploadRes.ok) {
        toast.error('Error al subir imagen')
        return
      }

      const { url } = await uploadRes.json()
      setAvatarUrl(url)

      // Save immediately
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar_url: url }),
      })

      if (res.ok) {
        toast.success('Foto de perfil actualizada')
        refreshProfile()
      }
    } catch {
      toast.error('Error al subir la imagen')
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleRemoveAvatar = async () => {
    setAvatarUrl('')
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar_url: null }),
      })
      if (res.ok) {
        toast.success('Foto de perfil eliminada')
        refreshProfile()
      }
    } catch {
      toast.error('Error al eliminar la foto')
    }
  }

  const handleSaveProfile = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName,
          country,
          city,
          phone_number: phoneNumber,
        }),
      })

      if (res.ok) {
        toast.success('Perfil actualizado correctamente')
        refreshProfile()
      } else {
        const err = await res.json()
        toast.error(err.error || 'Error al guardar')
      }
    } catch {
      toast.error('Error al guardar los cambios')
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error('Las contraseñas no coinciden')
      return
    }
    if (newPassword.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres')
      return
    }

    setChangingPassword(true)
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      })

      if (res.ok) {
        toast.success('Contraseña actualizada correctamente')
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      } else {
        const err = await res.json()
        toast.error(err.error || 'Error al cambiar contraseña')
      }
    } catch {
      toast.error('Error al cambiar la contraseña')
    } finally {
      setChangingPassword(false)
    }
  }

  const initials = fullName
    ? fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : profile?.email?.charAt(0)?.toUpperCase() || 'U'

  if (loading) {
    return (
      <>
        <Navbar title="Mi Perfil" />
        <div className="flex-1 flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <div className="w-14 h-14 rounded-full border-2 animate-spin" style={{ borderColor: 'rgba(167, 139, 250, 0.15)', borderTopColor: '#A78BFA' }} />
              <User className="absolute inset-0 m-auto h-5 w-5 text-[#A78BFA]" />
            </div>
            <p className="text-sm text-[#94A3B8]">Cargando perfil...</p>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Navbar title="Mi Perfil" description="Gestiona tu informacion personal" />

      <div className="p-4 md:p-6 space-y-4 md:space-y-6 max-w-4xl">

        {/* ── Hero Header ── */}
        <div
          className="relative overflow-hidden rounded-2xl p-6 animate-fade-in-up"
          style={{
            background: 'linear-gradient(135deg, rgba(17, 29, 53, 0.9), rgba(22, 32, 51, 0.7))',
            border: '1px solid rgba(167, 139, 250, 0.08)',
          }}
        >
          <div className="absolute top-0 right-0 w-96 h-96 rounded-full blur-[120px] opacity-20 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(167, 139, 250, 0.3), transparent)' }} />
          <div className="absolute -bottom-20 -left-20 w-72 h-72 rounded-full blur-[100px] opacity-15 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(139, 92, 246, 0.25), transparent)' }} />

          <div className="relative flex flex-col sm:flex-row items-center sm:items-center gap-4 sm:gap-6">
            {/* Avatar */}
            <div className="relative group">
              <Avatar className="h-20 w-20 sm:h-24 sm:w-24 border-2 shadow-lg" style={{ borderColor: 'rgba(167, 139, 250, 0.3)' }}>
                {avatarUrl && <AvatarImage src={avatarUrl} alt={fullName} />}
                <AvatarFallback
                  className="text-2xl font-bold text-white"
                  style={{ background: 'linear-gradient(135deg, #A78BFA, #8B5CF6)' }}
                >
                  {initials}
                </AvatarFallback>
              </Avatar>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer"
              >
                {uploadingAvatar ? (
                  <Loader2 className="h-6 w-6 text-white animate-spin" />
                ) : (
                  <Camera className="h-6 w-6 text-white" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
              {/* Online indicator */}
              <div className="absolute -bottom-0.5 -right-0.5 h-6 w-6 rounded-full flex items-center justify-center" style={{ background: '#0B1020', border: '2px solid #0B1020' }}>
                <div className="h-3.5 w-3.5 rounded-full bg-[#10B981] animate-pulse" />
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-xl sm:text-2xl font-bold text-white">{fullName || 'Usuario'}</h1>
              <p className="text-[12px] sm:text-[13px] text-[#94A3B8] mt-0.5">{profile?.email}</p>
              <div className="flex items-center justify-center sm:justify-start gap-2 mt-2.5">
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 h-6 text-[10px] font-semibold"
                  style={{
                    background: profile?.role === 'admin' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(139, 92, 246, 0.1)',
                    color: profile?.role === 'admin' ? '#F59E0B' : '#8B5CF6',
                    border: `1px solid ${profile?.role === 'admin' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(139, 92, 246, 0.2)'}`,
                  }}
                >
                  <Shield className="h-2.5 w-2.5" />
                  {profile?.role === 'admin' ? 'Administrador' : 'Usuario'}
                </span>
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 h-6 text-[10px] font-semibold"
                  style={{
                    background: 'rgba(16, 185, 129, 0.1)',
                    color: '#10B981',
                    border: '1px solid rgba(16, 185, 129, 0.2)',
                  }}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-[#10B981] animate-pulse" />
                  Activo
                </span>
              </div>
            </div>

            {/* Quick actions */}
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 rounded-lg px-3.5 h-8 text-[11px] font-medium transition-all duration-200 hover:opacity-80"
                style={{ background: 'rgba(167, 139, 250, 0.08)', color: '#A78BFA', border: '1px solid rgba(167, 139, 250, 0.12)' }}
              >
                <ImagePlus className="h-3.5 w-3.5" />
                Cambiar foto
              </button>
              {avatarUrl && (
                <button
                  onClick={handleRemoveAvatar}
                  className="flex items-center gap-2 rounded-lg px-3.5 h-8 text-[11px] font-medium transition-all duration-200 hover:opacity-80"
                  style={{ background: 'rgba(239, 68, 68, 0.08)', color: '#EF4444', border: '1px solid rgba(239, 68, 68, 0.12)' }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Eliminar
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Personal Info ── */}
        <div
          className="rounded-2xl p-4 sm:p-6 animate-fade-in-up-delay-1"
          style={{
            background: 'linear-gradient(180deg, rgba(17, 29, 53, 0.9) 0%, rgba(13, 21, 41, 0.95) 100%)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-lg"
              style={{ background: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.15)' }}
            >
              <User className="h-4 w-4 text-[#8B5CF6]" />
            </div>
            <div>
              <h2 className="text-[15px] font-semibold text-white">Informacion personal</h2>
              <p className="text-[11px] text-[#94A3B8]/60">Actualiza tus datos de contacto</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Full Name */}
            <div className="space-y-2.5">
              <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#94A3B8]/50">
                Nombre completo
              </label>
              <div className="relative">
                <div className="absolute left-0 top-0 bottom-0 flex items-center pl-3.5 pointer-events-none">
                  <User className="h-4 w-4 text-[#94A3B8]/30" />
                </div>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Tu nombre completo"
                  className="h-11 pl-10 text-white rounded-xl placeholder:text-[#94A3B8]/25"
                  style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
                />
              </div>
            </div>

            {/* Email (read-only) */}
            <div className="space-y-2.5">
              <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#94A3B8]/50">
                Correo electronico
              </label>
              <div className="relative">
                <div className="absolute left-0 top-0 bottom-0 flex items-center pl-3.5 pointer-events-none">
                  <Mail className="h-4 w-4 text-[#94A3B8]/30" />
                </div>
                <Input
                  value={profile?.email || ''}
                  readOnly
                  className="h-11 pl-10 text-[#94A3B8]/60 rounded-xl cursor-not-allowed"
                  style={{ background: 'rgba(255, 255, 255, 0.015)', border: '1px solid rgba(255, 255, 255, 0.04)' }}
                />
              </div>
              <p className="text-[10px] text-[#94A3B8]/30">El correo no se puede cambiar</p>
            </div>

            {/* Phone */}
            <div className="space-y-2.5">
              <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#94A3B8]/50">
                Telefono
              </label>
              <div className="relative">
                <div className="absolute left-0 top-0 bottom-0 flex items-center pl-3.5 pointer-events-none">
                  <Phone className="h-4 w-4 text-[#94A3B8]/30" />
                </div>
                <Input
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+52 55 1234 5678"
                  className="h-11 pl-10 text-white rounded-xl placeholder:text-[#94A3B8]/25"
                  style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
                />
              </div>
            </div>

            {/* Country */}
            <div className="space-y-2.5">
              <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#94A3B8]/50">
                Pais
              </label>
              <div className="relative">
                <div className="absolute left-0 top-0 bottom-0 flex items-center pl-3.5 pointer-events-none">
                  <Globe className="h-4 w-4 text-[#94A3B8]/30" />
                </div>
                <Input
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="Mexico"
                  className="h-11 pl-10 text-white rounded-xl placeholder:text-[#94A3B8]/25"
                  style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
                />
              </div>
            </div>

            {/* City */}
            <div className="space-y-2.5 md:col-span-2">
              <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#94A3B8]/50">
                Ciudad
              </label>
              <div className="relative">
                <div className="absolute left-0 top-0 bottom-0 flex items-center pl-3.5 pointer-events-none">
                  <MapPin className="h-4 w-4 text-[#94A3B8]/30" />
                </div>
                <Input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Ciudad de Mexico"
                  className="h-11 pl-10 text-white rounded-xl placeholder:text-[#94A3B8]/25"
                  style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
                />
              </div>
            </div>
          </div>

          {/* Save */}
          <div className="flex justify-end mt-6">
            <button
              onClick={handleSaveProfile}
              disabled={saving}
              className="flex items-center gap-2.5 rounded-xl px-6 h-11 text-white text-[13px] font-semibold transition-all duration-200 hover:opacity-90 disabled:opacity-50"
              style={{
                background: 'linear-gradient(135deg, #8B5CF6, #06B6D4)',
                boxShadow: '0 4px 16px rgba(139, 92, 246, 0.25)',
              }}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Guardar cambios
            </button>
          </div>
        </div>

        {/* ── Change Password ── */}
        <div
          className="rounded-2xl p-4 sm:p-6 animate-fade-in-up-delay-1"
          style={{
            background: 'linear-gradient(180deg, rgba(17, 29, 53, 0.9) 0%, rgba(13, 21, 41, 0.95) 100%)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-lg"
              style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.15)' }}
            >
              <KeyRound className="h-4 w-4 text-[#F59E0B]" />
            </div>
            <div>
              <h2 className="text-[15px] font-semibold text-white">Cambiar contraseña</h2>
              <p className="text-[11px] text-[#94A3B8]/60">Actualiza tu contraseña de acceso</p>
            </div>
          </div>

          <div className="space-y-4 max-w-md">
            {/* Current Password */}
            <div className="space-y-2.5">
              <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#94A3B8]/50">
                Contraseña actual
              </label>
              <div className="relative">
                <div className="absolute left-0 top-0 bottom-0 flex items-center pl-3.5 pointer-events-none">
                  <Lock className="h-4 w-4 text-[#94A3B8]/30" />
                </div>
                <Input
                  type={showCurrentPw ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Tu contraseña actual"
                  className="h-11 pl-10 pr-10 text-white rounded-xl placeholder:text-[#94A3B8]/25"
                  style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPw(!showCurrentPw)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]/40 hover:text-white transition-colors"
                >
                  {showCurrentPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Divider */}
            <div className="h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent)' }} />

            {/* New Password */}
            <div className="space-y-2.5">
              <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#94A3B8]/50">
                Nueva contraseña
              </label>
              <div className="relative">
                <div className="absolute left-0 top-0 bottom-0 flex items-center pl-3.5 pointer-events-none">
                  <Lock className="h-4 w-4 text-[#94A3B8]/30" />
                </div>
                <Input
                  type={showNewPw ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimo 6 caracteres"
                  className="h-11 pl-10 pr-10 text-white rounded-xl placeholder:text-[#94A3B8]/25"
                  style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPw(!showNewPw)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]/40 hover:text-white transition-colors"
                >
                  {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-2.5">
              <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#94A3B8]/50">
                Confirmar contraseña
              </label>
              <div className="relative">
                <div className="absolute left-0 top-0 bottom-0 flex items-center pl-3.5 pointer-events-none">
                  <Lock className="h-4 w-4 text-[#94A3B8]/30" />
                </div>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repite tu nueva contraseña"
                  className="h-11 pl-10 text-white rounded-xl placeholder:text-[#94A3B8]/25"
                  style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
                />
              </div>
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-[10px] text-[#EF4444]">Las contraseñas no coinciden</p>
              )}
            </div>

            {/* Change Button */}
            <button
              onClick={handleChangePassword}
              disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword}
              className="flex items-center gap-2.5 rounded-xl px-6 h-11 text-white text-[13px] font-semibold transition-all duration-200 hover:opacity-90 disabled:opacity-40"
              style={{
                background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                boxShadow: '0 4px 16px rgba(245, 158, 11, 0.2)',
              }}
            >
              {changingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
              Cambiar contraseña
            </button>
          </div>
        </div>

        {/* ── Account Info ── */}
        <div
          className="rounded-2xl p-4 sm:p-6 animate-fade-in-up-delay-1"
          style={{
            background: 'linear-gradient(180deg, rgba(17, 29, 53, 0.9) 0%, rgba(13, 21, 41, 0.95) 100%)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          <div className="flex items-center gap-3 mb-5">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-lg"
              style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.15)' }}
            >
              <Sparkles className="h-4 w-4 text-[#10B981]" />
            </div>
            <div>
              <h2 className="text-[15px] font-semibold text-white">Informacion de cuenta</h2>
              <p className="text-[11px] text-[#94A3B8]/60">Detalles de tu cuenta</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Rol', value: profile?.role === 'admin' ? 'Administrador' : 'Usuario', color: '#8B5CF6' },
              { label: 'Estado', value: profile?.is_active ? 'Activo' : 'Inactivo', color: '#10B981' },
              { label: 'Proveedor', value: profile?.login_provider === 'google' ? 'Google' : 'Email', color: '#F59E0B' },
              { label: 'Miembro desde', value: profile?.created_at ? new Date(profile.created_at).toLocaleDateString('es-MX', { month: 'short', year: 'numeric' }) : '-', color: '#A78BFA' },
            ].map((item) => (
              <div
                key={item.label}
                className="flex flex-col gap-1.5 rounded-xl px-4 py-3"
                style={{ background: 'rgba(255, 255, 255, 0.025)', border: '1px solid rgba(255, 255, 255, 0.04)' }}
              >
                <span className="text-[10px] text-[#94A3B8]/40 uppercase tracking-wider font-medium">{item.label}</span>
                <span className="text-[13px] font-semibold" style={{ color: item.color }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </>
  )
}
