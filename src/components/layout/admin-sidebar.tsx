'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  LayoutDashboard,
  Users,
  Bot,
  Package,
  Store,
  CreditCard,
  DollarSign,
  Activity,
  Settings,
  LogOut,
  ArrowLeft,
  Bell,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/use-auth'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { NuroSmile } from '@/components/shared/nuro-logo'

interface AdminMetrics {
  total_users: number
  active_bots: number
  pending_subscriptions: number
  pending_payments: number
}

interface NotificationData {
  unread_count: number
}

const adminNavItems = [
  { label: 'Dashboard General', href: '/admin/dashboard', icon: LayoutDashboard, description: 'Resumen de plataforma', badgeKey: null as string | null },
  { label: 'Usuarios', href: '/admin/users', icon: Users, description: 'Gestión de usuarios', badgeKey: null as string | null },
  { label: 'Bots por Usuario', href: '/admin/bots', icon: Bot, description: 'Bots de cada usuario', badgeKey: null as string | null },
  { label: 'Tiendas', href: '/admin/stores', icon: Store, description: 'Tiendas de usuarios', badgeKey: null as string | null },
  { label: 'Productos', href: '/admin/products', icon: Package, description: 'Productos globales', badgeKey: null as string | null },
  { label: 'Suscripciones', href: '/admin/subscriptions', icon: CreditCard, description: 'Planes y aprobaciones', badgeKey: 'pending_subscriptions' as string | null },
  { label: 'Pagos', href: '/admin/payments', icon: DollarSign, description: 'Pagos y comprobantes', badgeKey: 'pending_payments' as string | null },
  { label: 'Actividad / Auditoría', href: '/admin/audit', icon: Activity, description: 'Registro de actividad', badgeKey: null as string | null },
  { label: 'Configuración', href: '/admin/settings', icon: Settings, description: 'Ajustes del sistema', badgeKey: null as string | null },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const { profile, signOut } = useAuth()
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null)
  const [notifData, setNotifData] = useState<NotificationData | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const [metricsRes, notifRes] = await Promise.all([
          fetch('/api/admin/metrics'),
          fetch('/api/admin/notifications?unread=true&limit=1'),
        ])
        if (metricsRes.ok) setMetrics(await metricsRes.json())
        if (notifRes.ok) setNotifData(await notifRes.json())
      } catch {
        // silently fail
      }
    }
    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [])

  return (
    <aside
      className="fixed left-0 top-0 z-40 hidden lg:flex h-screen w-[280px] flex-col"
      style={{
        background: 'linear-gradient(180deg, #0D0C16 0%, #0E0C1A 50%, #0B0A14 100%)',
        borderRight: '1px solid rgba(139, 92, 246, 0.08)',
      }}
    >
      {/* Brand Header */}
      <div className="sidebar-brand-header">
        <div className="flex items-center gap-3.5">
          <div className="sidebar-logo-wrap">
            <NuroSmile size={38} />
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="sidebar-brand-name">
              Agente de <span className="brand-accent">Ventas</span>
            </span>
            <span className="sidebar-brand-subtitle">
              Panel Admin
            </span>
          </div>
          {/* Notification bell */}
          <Link href="/admin/dashboard" className="relative shrink-0">
            <Bell className="h-5 w-5 text-[#9189A8]/60 hover:text-white transition-colors duration-200" />
            {notifData && notifData.unread_count > 0 && (
              <span
                className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold text-white animate-pulse"
                style={{ background: '#10B981' }}
              >
                {notifData.unread_count > 9 ? '9+' : notifData.unread_count}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* Quick Stats */}
      {metrics && (
        <div className="px-4 py-4">
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Usuarios', value: metrics.total_users, color: '#10B981' },
              { label: 'Bots', value: metrics.active_bots, color: '#8B5CF6' },
              { label: 'Pendientes', value: metrics.pending_subscriptions, color: '#F59E0B' },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl px-2.5 py-2.5 text-center"
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.04)',
                }}
              >
                <div className="flex items-center justify-center gap-1 mb-1">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: stat.color }} />
                  <span className="text-[9px] font-medium text-[#9189A8]/70">{stat.label}</span>
                </div>
                <span className="text-sm font-bold text-white">{stat.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Divider */}
      <div className="mx-4 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.1), transparent)' }} />

      {/* Navigation */}
      <nav className="flex-1 flex flex-col overflow-y-auto px-3 py-4 space-y-0.5">
        <div className="mb-3 px-3">
          <span className="text-[9px] font-semibold uppercase tracking-[0.15em] text-[#9189A8]/50">
            Navegación
          </span>
        </div>

        {adminNavItems.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-250',
                isActive
                  ? 'sidebar-item-active text-white'
                  : 'text-[#9189A8] sidebar-item-hover hover:text-white'
              )}
            >
              {isActive && (
                <span
                  className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full"
                  style={{ background: '#8B5CF6' }}
                />
              )}

              <item.icon
                className={cn(
                  'h-[17px] w-[17px] shrink-0 transition-colors duration-200',
                  isActive ? 'text-[#8B5CF6]' : 'text-[#9189A8]/50 group-hover:text-[#C8C2D9]'
                )}
              />
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-[13px] font-medium leading-tight truncate">
                  {item.label}
                </span>
                <span
                  className={cn(
                    'text-[10px] leading-tight truncate transition-colors duration-200',
                    isActive ? 'text-[#8B5CF6]/50' : 'text-[#9189A8]/30 group-hover:text-[#9189A8]/50'
                  )}
                >
                  {item.description}
                </span>
              </div>

              {item.badgeKey && metrics && (metrics as unknown as Record<string, number>)[item.badgeKey] > 0 && (
                <span
                  className="flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold text-white animate-pulse"
                  style={{ background: '#F59E0B' }}
                >
                  {(metrics as unknown as Record<string, number>)[item.badgeKey]}
                </span>
              )}
            </Link>
          )
        })}

        {/* AI Assistant Orb */}
        <div className="flex justify-center mt-auto pb-2">
          <button
            onClick={() => {
              const event = new CustomEvent('toggle-ai-assistant')
              window.dispatchEvent(event)
            }}
            className="group relative cursor-pointer ai-orb-container"
            aria-label="Abrir asistente IA"
          >
            <div className="absolute -inset-2 ai-orb-ring border border-[#8B5CF6]/15 pointer-events-none" />
            <div className="relative w-12 h-12 rounded-full overflow-hidden ai-orb-core">
              <div className="absolute inset-0 ai-orb-energy opacity-50" />
              <img
                src="/images/ai-bubble.png"
                alt="Asistente IA"
                className="relative w-full h-full object-cover rounded-full z-[1]"
              />
              <div className="absolute inset-0 ai-orb-shimmer z-[2] pointer-events-none" />
            </div>
            <div className="absolute -inset-1 rounded-full bg-[#8B5CF6]/0 group-hover:bg-[#8B5CF6]/8 transition-all duration-500 pointer-events-none" />
          </button>
        </div>
      </nav>

      {/* Divider */}
      <div className="mx-4 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.1), transparent)' }} />

      {/* Back to user dashboard */}
      <div className="px-3 py-3">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-[#9189A8]/60 transition-all duration-200 sidebar-item-hover hover:text-[#C8C2D9]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Ir al Dashboard de Usuario</span>
        </Link>
      </div>

      {/* Divider */}
      <div className="mx-4 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.1), transparent)' }} />

      {/* User Profile */}
      <div className="p-3">
        <div
          className="flex items-center gap-3 rounded-xl p-3"
          style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.04)',
          }}
        >
          <Avatar className="h-9 w-9 border border-[#8B5CF6]/20 shadow-sm">
            <AvatarFallback
              className="text-xs font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)' }}
            >
              {profile?.full_name?.charAt(0)?.toUpperCase() || 'A'}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-1 flex-col min-w-0">
            <span className="truncate text-xs font-semibold text-white">
              {profile?.full_name || 'Administrador'}
            </span>
            <span className="truncate text-[10px] text-[#9189A8]/50">
              {profile?.email || ''}
            </span>
            <Badge
              variant="secondary"
              className="mt-1 w-fit text-[9px] px-1.5 py-0 h-4"
              style={{
                background: 'rgba(139, 92, 246, 0.1)',
                color: '#38BDF8',
                border: '1px solid rgba(139, 92, 246, 0.12)',
              }}
            >
              Administrador
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-[#9189A8]/50 hover:text-red-400 hover:bg-red-500/8 transition-colors duration-200"
            onClick={signOut}
            title="Cerrar sesión"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </aside>
  )
}
