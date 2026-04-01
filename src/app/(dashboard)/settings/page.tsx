'use client';

import { useState, useEffect } from 'react';
import { Navbar } from '@/components/layout/navbar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Settings, User, Bell, Loader2, Save, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';

export default function SettingsPage() {
  const { profile, refreshProfile } = useAuth();
  const [saving, setSaving] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Account settings
  const [accountName, setAccountName] = useState('');
  const [accountEmail, setAccountEmail] = useState('');

  // Notification settings (local for now)
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [newLeadNotification, setNewLeadNotification] = useState(true);
  const [conversationNotification, setConversationNotification] = useState(false);

  useEffect(() => {
    if (profile) {
      setAccountName(profile.full_name || '');
      setAccountEmail(profile.email || '');
      setLoading(false);
    }
  }, [profile]);

  const handleSaveAccount = async () => {
    setSaving('cuenta');
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: accountName }),
      });
      if (res.ok) {
        toast.success('Configuración de cuenta guardada');
        refreshProfile();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Error al guardar');
      }
    } catch {
      toast.error('Error al guardar la cuenta');
    } finally {
      setSaving(null);
    }
  };

  const handleSaveNotifications = async () => {
    setSaving('notificaciones');
    // Notifications are local preferences for now
    await new Promise((r) => setTimeout(r, 500));
    setSaving(null);
    toast.success('Preferencias de notificaciones guardadas');
  };

  if (loading) {
    return (
      <>
        <Navbar title="Configuración" />
        <div className="flex-1 flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <div className="w-12 h-12 rounded-full border-2 animate-spin" style={{ borderColor: 'rgba(79, 124, 255, 0.15)', borderTopColor: '#4F7CFF' }} />
              <Settings className="absolute inset-0 m-auto h-4 w-4 text-[#4F7CFF]" />
            </div>
            <p className="text-sm text-[#94A3B8]">Cargando configuracion...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar title="Configuración" description="Administra tu cuenta y preferencias" />

      <div className="p-4 md:p-6 space-y-4 md:space-y-6 max-w-2xl">

        {/* Account Settings */}
        <div
          className="rounded-2xl p-4 md:p-6"
          style={{
            background: 'linear-gradient(180deg, rgba(17, 29, 53, 0.9) 0%, rgba(13, 21, 41, 0.95) 100%)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-lg"
              style={{ background: 'rgba(79, 124, 255, 0.1)', border: '1px solid rgba(79, 124, 255, 0.15)' }}
            >
              <User className="h-4 w-4 text-[#4F7CFF]" />
            </div>
            <div>
              <h3 className="text-[15px] font-semibold text-white">Cuenta</h3>
              <p className="text-[11px] text-[#94A3B8]/60">Informacion de tu cuenta personal</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2.5">
              <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#94A3B8]/50">Nombre</label>
              <Input
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                className="h-11 text-white rounded-xl"
                style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
              />
            </div>
            <div className="space-y-2.5">
              <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#94A3B8]/50">Email</label>
              <Input
                type="email"
                value={accountEmail}
                readOnly
                className="h-11 text-[#94A3B8]/60 rounded-xl cursor-not-allowed"
                style={{ background: 'rgba(255, 255, 255, 0.015)', border: '1px solid rgba(255, 255, 255, 0.04)' }}
              />
              <p className="text-[10px] text-[#94A3B8]/30">El correo no se puede cambiar</p>
            </div>

            {/* Role display */}
            <div className="flex items-center gap-2 pt-2">
              <Shield className="h-3.5 w-3.5 text-[#94A3B8]/40" />
              <span className="text-[11px] text-[#94A3B8]/50">Rol:</span>
              <span
                className="inline-flex items-center gap-1 rounded-full px-2 h-5 text-[9px] font-bold uppercase"
                style={{
                  background: profile?.role === 'admin' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(79, 124, 255, 0.1)',
                  color: profile?.role === 'admin' ? '#F59E0B' : '#4F7CFF',
                }}
              >
                {profile?.role === 'admin' ? 'Administrador' : 'Usuario'}
              </span>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              onClick={handleSaveAccount}
              disabled={saving === 'cuenta'}
              className="flex items-center gap-2 rounded-xl px-5 h-10 text-white text-[13px] font-semibold transition-all duration-200 hover:opacity-90 disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #4F7CFF, #56CCF2)', boxShadow: '0 4px 16px rgba(79, 124, 255, 0.2)' }}
            >
              {saving === 'cuenta' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Guardar cuenta
            </button>
          </div>
        </div>

        {/* Notification Settings */}
        <div
          className="rounded-2xl p-4 md:p-6"
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
              <Bell className="h-4 w-4 text-[#F59E0B]" />
            </div>
            <div>
              <h3 className="text-[15px] font-semibold text-white">Notificaciones</h3>
              <p className="text-[11px] text-[#94A3B8]/60">Configura como recibir alertas</p>
            </div>
          </div>

          <div className="space-y-3">
            {[
              { label: 'Notificaciones por Email', desc: 'Recibe un resumen diario por correo', state: emailNotifications, setter: setEmailNotifications },
              { label: 'Nuevos Leads', desc: 'Alerta cuando se registra un nuevo lead', state: newLeadNotification, setter: setNewLeadNotification },
              { label: 'Conversaciones', desc: 'Alerta cuando un cliente necesita atencion', state: conversationNotification, setter: setConversationNotification },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between rounded-xl p-4 transition-colors duration-200"
                style={{ background: 'rgba(255, 255, 255, 0.025)', border: '1px solid rgba(255, 255, 255, 0.04)' }}
              >
                <div>
                  <p className="text-[13px] font-medium text-white">{item.label}</p>
                  <p className="text-[11px] text-[#94A3B8]/50 mt-0.5">{item.desc}</p>
                </div>
                <button
                  onClick={() => item.setter(!item.state)}
                  className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200"
                  style={{ background: item.state ? '#4F7CFF' : 'rgba(148, 163, 184, 0.2)' }}
                >
                  <span
                    className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200"
                    style={{ transform: item.state ? 'translateX(24px)' : 'translateX(4px)' }}
                  />
                </button>
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-4">
            <button
              onClick={handleSaveNotifications}
              disabled={saving === 'notificaciones'}
              className="flex items-center gap-2 rounded-xl px-5 h-10 text-white text-[13px] font-semibold transition-all duration-200 hover:opacity-90 disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)', boxShadow: '0 4px 16px rgba(245, 158, 11, 0.2)' }}
            >
              {saving === 'notificaciones' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Guardar notificaciones
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
