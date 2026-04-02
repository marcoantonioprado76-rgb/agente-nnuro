'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Bell,
  Check,
  CheckCheck,
  Bot,
  CreditCard,
  ShoppingBag,
  UserPlus,
  AlertTriangle,
  MessageSquare,
  Store,
  Target,
  Shield,
  Smartphone,
  Loader2,
  X,
} from 'lucide-react'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  is_read: boolean
  link?: string
  created_at: string
  metadata?: Record<string, unknown>
}

const typeIcons: Record<string, { icon: typeof Bell; color: string; bg: string }> = {
  suscripcion_activada: { icon: CreditCard, color: '#10B981', bg: 'rgba(16, 185, 129, 0.1)' },
  suscripcion_vencida: { icon: AlertTriangle, color: '#EF4444', bg: 'rgba(239, 68, 68, 0.1)' },
  suscripcion_cancelada: { icon: CreditCard, color: '#94A3B8', bg: 'rgba(148, 163, 184, 0.08)' },
  suscripcion_proxima: { icon: AlertTriangle, color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.1)' },
  bot_creado: { icon: Bot, color: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.1)' },
  bot_suspendido: { icon: Bot, color: '#EF4444', bg: 'rgba(239, 68, 68, 0.1)' },
  bot_reactivado: { icon: Bot, color: '#10B981', bg: 'rgba(16, 185, 129, 0.1)' },
  tienda_creada: { icon: Store, color: '#A78BFA', bg: 'rgba(167, 139, 250, 0.1)' },
  tienda_actualizada: { icon: Store, color: '#06B6D4', bg: 'rgba(6, 182, 212, 0.1)' },
  venta_confirmada: { icon: ShoppingBag, color: '#10B981', bg: 'rgba(16, 185, 129, 0.1)' },
  whatsapp_conectado: { icon: Smartphone, color: '#10B981', bg: 'rgba(16, 185, 129, 0.1)' },
  whatsapp_desconectado: { icon: Smartphone, color: '#EF4444', bg: 'rgba(239, 68, 68, 0.1)' },
  lead_nuevo: { icon: Target, color: '#06B6D4', bg: 'rgba(6, 182, 212, 0.1)' },
  seguimiento_ejecutado: { icon: MessageSquare, color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.1)' },
  cuenta_actualizada: { icon: Shield, color: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.1)' },
  // Admin types
  usuario_registrado: { icon: UserPlus, color: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.1)' },
  pago_exitoso: { icon: CreditCard, color: '#10B981', bg: 'rgba(16, 185, 129, 0.1)' },
  pago_fallido: { icon: CreditCard, color: '#EF4444', bg: 'rgba(239, 68, 68, 0.1)' },
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'Ahora'
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d`
  return new Date(dateStr).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
}

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications?limit=30')
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.notifications || [])
        setUnreadCount(data.unread_count || 0)
      }
    } catch {
      // Silent
    }
  }, [])

  // Fetch on mount and poll every 30s
  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  const handleOpen = () => {
    setOpen(!open)
    if (!open) fetchNotifications()
  }

  const markAsRead = async (id: string) => {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notification_ids: [id] }),
    })
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    setUnreadCount(prev => Math.max(0, prev - 1))
  }

  const markAllAsRead = async () => {
    setLoading(true)
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mark_all: true }),
    })
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    setUnreadCount(0)
    setLoading(false)
  }

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) markAsRead(notification.id)
    if (notification.link) {
      setOpen(false)
      window.location.href = notification.link
    }
  }

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell Button */}
      <button
        onClick={handleOpen}
        className="relative flex h-9 w-9 items-center justify-center rounded-xl text-[#94A3B8] hover:text-white transition-colors duration-200"
        style={{ background: open ? 'rgba(255, 255, 255, 0.06)' : 'transparent' }}
      >
        <Bell className="h-[18px] w-[18px]" />
        {unreadCount > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[9px] font-bold text-white"
            style={{ background: '#8B5CF6', boxShadow: '0 0 8px rgba(139, 92, 246, 0.5)' }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Panel */}
      {open && (
        <div
          className="absolute right-0 top-12 z-50 w-[380px] max-h-[520px] rounded-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
          style={{
            background: 'linear-gradient(180deg, rgba(17, 29, 53, 0.98) 0%, rgba(13, 21, 41, 0.99) 100%)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.04)',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-5 py-3.5"
            style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}
          >
            <div className="flex items-center gap-2.5">
              <h3 className="text-[14px] font-semibold text-white">Notificaciones</h3>
              {unreadCount > 0 && (
                <span
                  className="flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold text-white"
                  style={{ background: '#8B5CF6' }}
                >
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  disabled={loading}
                  className="flex items-center gap-1.5 rounded-lg px-2.5 h-7 text-[10px] font-semibold transition-colors duration-200 hover:opacity-80 disabled:opacity-50"
                  style={{ color: '#8B5CF6', background: 'rgba(139, 92, 246, 0.08)' }}
                >
                  {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCheck className="h-3 w-3" />}
                  Leer todo
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-[#94A3B8]/50 hover:text-white hover:bg-white/5 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Notification List */}
          <div className="overflow-y-auto max-h-[420px] no-scrollbar">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-6">
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-2xl mb-3"
                  style={{ background: 'rgba(139, 92, 246, 0.08)', border: '1px solid rgba(139, 92, 246, 0.1)' }}
                >
                  <Bell className="h-5 w-5 text-[#8B5CF6]" />
                </div>
                <p className="text-[13px] font-medium text-white">Sin notificaciones</p>
                <p className="text-[11px] text-[#94A3B8]/50 mt-1">Las notificaciones aparecerán aquí</p>
              </div>
            ) : (
              <div>
                {notifications.map((notification) => {
                  const typeInfo = typeIcons[notification.type] || { icon: Bell, color: '#94A3B8', bg: 'rgba(148, 163, 184, 0.08)' }
                  const Icon = typeInfo.icon
                  return (
                    <button
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className="w-full flex items-start gap-3 px-5 py-3.5 text-left transition-colors duration-150 hover:bg-white/[0.03]"
                      style={{
                        borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
                        background: notification.is_read ? 'transparent' : 'rgba(139, 92, 246, 0.02)',
                      }}
                    >
                      {/* Icon */}
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-lg shrink-0 mt-0.5"
                        style={{ background: typeInfo.bg, border: `1px solid ${typeInfo.color}20` }}
                      >
                        <Icon className="h-3.5 w-3.5" style={{ color: typeInfo.color }} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-[12px] leading-tight ${notification.is_read ? 'text-[#CBD5E1]/80' : 'text-white font-medium'}`}>
                            {notification.title}
                          </p>
                          <span className="text-[9px] text-[#94A3B8]/40 shrink-0 mt-0.5">
                            {getTimeAgo(notification.created_at)}
                          </span>
                        </div>
                        {notification.message && (
                          <p className="text-[11px] text-[#94A3B8]/50 mt-0.5 line-clamp-2 leading-relaxed">
                            {notification.message}
                          </p>
                        )}
                      </div>

                      {/* Unread indicator */}
                      {!notification.is_read && (
                        <div className="shrink-0 mt-1.5">
                          <div
                            className="h-2 w-2 rounded-full"
                            style={{ background: '#8B5CF6', boxShadow: '0 0 6px rgba(139, 92, 246, 0.5)' }}
                          />
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
