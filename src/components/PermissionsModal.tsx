'use client'

import { useState, useEffect, useCallback } from 'react'
import { Bell, CheckCircle2, Loader2, X } from 'lucide-react'

const STORAGE_KEY = 'jd_permissions_granted'

type PermState = 'idle' | 'loading' | 'granted' | 'denied'

export default function PermissionsModal() {
  const [visible, setVisible] = useState(false)
  const [notifState, setNotifState] = useState<PermState>('idle')
  const [requesting, setRequesting] = useState(false)

  useEffect(() => {
    const alreadyDismissed = localStorage.getItem(STORAGE_KEY) === '1'
    if (!alreadyDismissed) setVisible(true)
  }, [])

  const granted = notifState === 'granted'
  const denied = notifState === 'denied'

  useEffect(() => {
    if (!granted) return
    localStorage.setItem(STORAGE_KEY, '1')
    setTimeout(() => setVisible(false), 800)
  }, [granted])

  const dismiss = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, '1')
    setVisible(false)
  }, [])

  const requestNotifications = useCallback(async () => {
    setRequesting(true)
    setNotifState('loading')

    let ok = false
    try {
      if (typeof Notification === 'undefined') {
        ok = true // iOS Safari — not supported, skip
      } else if (Notification.permission === 'granted') {
        ok = true
      } else if (Notification.permission === 'denied') {
        ok = false
      } else {
        const p = await Notification.requestPermission()
        ok = p === 'granted'
      }
    } catch { ok = false }

    setNotifState(ok ? 'granted' : 'denied')
    setRequesting(false)
  }, [])

  if (!visible) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ background: 'rgba(7,8,15,0.85)', backdropFilter: 'blur(12px)' }}>

      {/* Glows */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full bg-purple-600/8 blur-[100px]" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full bg-cyan-500/6 blur-[100px]" />
      </div>

      <div className="relative w-full max-w-xs flex flex-col items-center text-center gap-5">

        {/* Close button */}
        <button
          onClick={dismiss}
          className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          title="Cerrar"
        >
          <X size={14} className="text-white/60" />
        </button>

        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <img src="/logo-oficial-mydiamond.png" alt="MY DIAMOND" className="w-40 h-auto" />
        </div>

        {/* Message */}
        {granted ? (
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-green-400" />
            <p className="text-sm font-bold text-green-400">¡Notificaciones activadas!</p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <p className="text-sm font-black text-white">Activa las notificaciones</p>
              <p className="text-[12px] text-white/40 leading-relaxed">
                {denied
                  ? 'Puedes activarlas más tarde desde la configuración de tu navegador (🔒 → Notificaciones → Permitir).'
                  : 'Recibe alertas de tus campañas, mensajes y actividad importante. Es opcional.'}
              </p>
            </div>

            <div className="w-full flex flex-col gap-2">
              <button
                onClick={requestNotifications}
                disabled={requesting}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-black uppercase tracking-[0.12em] transition-all active:scale-[0.98] disabled:opacity-60"
                style={{
                  background: 'linear-gradient(135deg, #D203DD, #0D1E79)',
                  color: '#fff',
                  border: '1px solid rgba(255,255,255,0.1)',
                  boxShadow: '0 8px 32px rgba(210,3,221,0.25)',
                }}
              >
                {requesting
                  ? <><Loader2 size={16} className="animate-spin" /> Solicitando...</>
                  : <><Bell size={15} /> Activar notificaciones</>
                }
              </button>

              <button
                onClick={dismiss}
                className="w-full py-2.5 rounded-2xl text-xs font-bold text-white/30 hover:text-white/60 transition-colors uppercase tracking-widest"
              >
                Ahora no
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
