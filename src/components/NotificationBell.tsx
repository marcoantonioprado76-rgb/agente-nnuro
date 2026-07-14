'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'

interface AppNotification {
  id: string
  title: string
  body: string
  link: string | null
  read: boolean
  createdAt: string
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'ahora'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

export default function NotificationBell() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [unread, setUnread] = useState(0)
  const [isDesktop, setIsDesktop] = useState(false)
  const [dropdownPos, setDropdownPos] = useState<{ top?: number; bottom?: number; left: number }>({ left: 0 })
  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  // Track screen size
  useEffect(() => {
    const update = () => setIsDesktop(window.innerWidth >= 1024)
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  // Recalcular posición si la ventana cambia de tamaño mientras está abierto
  useEffect(() => {
    if (!open) return
    const recalc = () => calcDropdownPos()
    window.addEventListener('resize', recalc)
    return () => window.removeEventListener('resize', recalc)
  }, [open])

  function calcDropdownPos() {
    if (!buttonRef.current) return
    const rect = buttonRef.current.getBoundingClientRect()
    const dropW = Math.min(300, window.innerWidth - 24)
    // Centrar horizontalmente sobre el botón, pero sin salirse de la pantalla
    let left = rect.left + rect.width / 2 - dropW / 2
    left = Math.max(12, Math.min(left, window.innerWidth - dropW - 12))

    if (window.innerWidth >= 1024) {
      // Desktop: abre hacia arriba
      setDropdownPos({ bottom: window.innerHeight - rect.top + 8, left })
    } else {
      // Móvil: abre hacia abajo
      setDropdownPos({ top: rect.bottom + 8, left })
    }
  }

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications')
      if (!res.ok) return
      const data = await res.json() as { notifications: AppNotification[]; unreadCount: number }
      setNotifications(data.notifications)
      setUnread(data.unreadCount)
    } catch {}
  }, [])

  // Poll every 30s when tab is visible
  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(() => {
      if (!document.hidden) fetchNotifications()
    }, 30_000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      const t = e.target as Node
      // No cerrar si el click fue en la campana o dentro del panel (que va en un portal aparte).
      if (dropdownRef.current?.contains(t) || panelRef.current?.contains(t)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Register service worker + subscribe to Web Push (asks permission once)
  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return

    navigator.serviceWorker.register('/sw.js').then(async reg => {
      if (Notification.permission === 'denied') return

      let sub = await reg.pushManager.getSubscription()
      if (sub) {
        // Already subscribed — sync with server
        await syncSubscription(sub)
        return
      }

      // Ask permission only if not yet decided
      if (Notification.permission === 'default') {
        const perm = await Notification.requestPermission()
        if (perm !== 'granted') return
      }

      const keyRes = await fetch('/api/push/vapid-public-key')
      if (!keyRes.ok) return
      const { publicKey } = await keyRes.json() as { publicKey?: string }
      if (!publicKey) return

      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as unknown as ArrayBuffer,
      })
      await syncSubscription(sub)
    }).catch(() => {})
  }, [])

  async function syncSubscription(sub: PushSubscription) {
    const json = sub.toJSON()
    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
    }).catch(() => {})
  }

  async function handleOpen() {
    if (!open) calcDropdownPos()
    setOpen(prev => !prev)
    if (!open && unread > 0) {
      // Mark all as read when opening
      await fetch('/api/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      setUnread(0)
    }
  }

  async function handleClickNotification(n: AppNotification) {
    setOpen(false)
    if (n.link) router.push(n.link)
  }

  return (
    <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-flex' }}>
      {/* Bell button */}
      <button
        ref={buttonRef}
        onClick={handleOpen}
        title="Notificaciones"
        style={{
          position: 'relative',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '6px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'rgba(255,255,255,0.55)',
          borderRadius: '8px',
          transition: 'color 0.2s',
        }}
        onMouseEnter={e => (e.currentTarget.style.color = '#D203DD')}
        onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.55)')}
      >
        <i className="fa-solid fa-bell" style={{ fontSize: '16px' }}></i>
        {unread > 0 && (
          <span style={{
            position: 'absolute',
            top: '2px',
            right: '2px',
            background: '#FF3B5C',
            color: '#fff',
            fontSize: '9px',
            fontWeight: 800,
            lineHeight: 1,
            padding: '2px 4px',
            borderRadius: '99px',
            minWidth: '14px',
            textAlign: 'center',
          }}>
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {/* Dropdown — en un PORTAL a document.body para que NO lo recorte el sidebar (transform/overflow) */}
      {open && typeof document !== 'undefined' && createPortal(
        <div ref={panelRef} style={{
          position: 'fixed',
          ...(dropdownPos.top !== undefined ? { top: dropdownPos.top } : { bottom: dropdownPos.bottom }),
          left: dropdownPos.left,
          width: Math.min(300, window.innerWidth - 24),
          background: '#0D0F1E',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '14px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          zIndex: 9999,
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            padding: '12px 16px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.5px' }}>
              NOTIFICACIONES
            </span>
          </div>

          {/* List */}
          <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '24px 16px', textAlign: 'center', color: 'rgba(255,255,255,0.25)', fontSize: '12px' }}>
                Sin notificaciones
              </div>
            ) : (
              notifications.map(n => (
                <button
                  key={n.id}
                  onClick={() => handleClickNotification(n)}
                  style={{
                    width: '100%',
                    background: n.read ? 'transparent' : 'rgba(210,3,221,0.04)',
                    border: 'none',
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    cursor: 'pointer',
                    padding: '12px 16px',
                    textAlign: 'left',
                    display: 'flex',
                    gap: '10px',
                    alignItems: 'flex-start',
                  }}
                >
                  {/* Dot */}
                  <span style={{
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    background: n.read ? 'rgba(255,255,255,0.15)' : '#D203DD',
                    flexShrink: 0,
                    marginTop: '4px',
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '12px', fontWeight: 600, margin: '0 0 2px', lineHeight: 1.4 }}>
                      {n.title}
                    </p>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', margin: 0, lineHeight: 1.5, wordBreak: 'break-word' }}>
                      {n.body}
                    </p>
                  </div>
                  <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '10px', flexShrink: 0, paddingTop: '2px' }}>
                    {timeAgo(n.createdAt)}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

// Converts VAPID public key from base64url to Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  return Uint8Array.from(Array.from(raw).map(c => c.charCodeAt(0)))
}
