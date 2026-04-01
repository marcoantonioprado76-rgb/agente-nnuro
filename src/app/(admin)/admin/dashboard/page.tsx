'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Users,
  Bell,
  Bot,
  MessageSquare,
  Target,
  ShoppingCart,
  UserCircle,
  Loader2,
  CreditCard,
  Clock,
  DollarSign,
  Package,
  Store,
  UserPlus,
  CalendarDays,
  CalendarRange,
  XCircle,
  AlertTriangle,
  Activity,
  RefreshCw,
  UserCheck,
  WifiOff,
  FileText,
  Shield,
  ArrowRight,
  Ban,
} from 'lucide-react'
import type { AdminMetrics, AdminNotification } from '@/types'

const actionLabels: Record<string, string> = {
  'user.suspend': 'Suspendio usuario',
  'user.activate': 'Activo usuario',
  'user.role_change': 'Cambio rol',
  'user.create': 'Creo usuario',
  'user.delete': 'Elimino usuario',
  'subscription.approve': 'Aprobo suscripcion',
  'subscription.reject': 'Rechazo suscripcion',
  'subscription.cancel': 'Cancelo suscripcion',
  'payment.approve': 'Aprobo pago',
  'payment.reject': 'Rechazo pago',
  'pago_stripe_exitoso': 'Pago Stripe exitoso',
  'suscripcion_activada': 'Suscripcion activada',
  'checkout_expirado': 'Checkout expirado',
  'crear_suscripcion': 'Creo suscripcion',
  'bot.activate': 'Activo bot',
  'bot.deactivate': 'Desactivo bot',
  'bot.pause': 'Pauso bot',
  'bot.delete': 'Elimino bot',
  'product.delete': 'Elimino producto',
  'product.toggle': 'Cambio estado producto',
  'register': 'Se registro',
  'login': 'Inicio sesion',
}

const spanishMonths = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

function formatSpanishDate(date: Date): string {
  const day = date.getDate()
  const month = spanishMonths[date.getMonth()]
  const year = date.getFullYear()
  return `${day} de ${month} de ${year}`
}

function formatCurrency(value: number): string {
  return `$${Number(value).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function AdminDashboardPage() {
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null)
  const [notifications, setNotifications] = useState<AdminNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const router = useRouter()

  const fetchMetrics = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    try {
      const [metricsRes, notifRes] = await Promise.all([
        fetch('/api/admin/metrics'),
        fetch('/api/admin/notifications?limit=5'),
      ])
      if (metricsRes.ok) {
        setMetrics(await metricsRes.json())
      }
      if (notifRes.ok) {
        const notifData = await notifRes.json()
        setNotifications(notifData.notifications || [])
      }
    } catch {
      // silenciar
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchMetrics()
  }, [fetchMetrics])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Cargando metricas...</p>
        </div>
      </div>
    )
  }

  const m = metrics as unknown as Record<string, number> | null
  const val = (key: string) => (m ? m[key] || 0 : 0)
  const disconnectedBots = val('total_bots') - val('active_bots')

  const keyMetrics = [
    { key: 'total_users', label: 'Total Usuarios', icon: Users, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
    { key: 'active_bots', label: 'Bots Activos', icon: Bot, color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
    { key: 'active_subscriptions', label: 'Suscripciones Activas', icon: CreditCard, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
    { key: 'total_revenue', label: 'Ingresos Totales', icon: DollarSign, color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20', isCurrency: true },
  ]

  const detailedMetrics = [
    { key: 'active_users', label: 'Usuarios Activos', icon: UserCheck, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { key: 'suspended_users', label: 'Usuarios Suspendidos', icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10' },
    { key: 'users_today', label: 'Nuevos Hoy', icon: UserPlus, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
    { key: 'users_this_week', label: 'Nuevos esta Semana', icon: CalendarDays, color: 'text-orange-400', bg: 'bg-orange-500/10' },
    { key: 'users_this_month', label: 'Nuevos este Mes', icon: CalendarRange, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    { key: 'total_bots', label: 'Total Bots', icon: Bot, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
    { key: '_disconnected_bots', label: 'Bots Desconectados', icon: WifiOff, color: 'text-red-400', bg: 'bg-red-500/10', computed: disconnectedBots },
    { key: 'total_products', label: 'Total Productos', icon: Package, color: 'text-violet-400', bg: 'bg-violet-500/10' },
    { key: 'total_conversations', label: 'Total Conversaciones', icon: MessageSquare, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { key: 'total_leads', label: 'Oportunidades', icon: Target, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
    { key: 'total_stores', label: 'Tiendas', icon: Store, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
    { key: 'total_store_orders', label: 'Pedidos Tiendas', icon: ShoppingCart, color: 'text-pink-400', bg: 'bg-pink-500/10' },
    { key: 'total_orders', label: 'Pedidos Bot', icon: ShoppingCart, color: 'text-rose-400', bg: 'bg-rose-500/10' },
    { key: 'pending_subscriptions', label: 'Suscripciones Pendientes', icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
    { key: 'expired_subscriptions', label: 'Suscripciones Expiradas', icon: AlertTriangle, color: 'text-orange-400', bg: 'bg-orange-500/10' },
    { key: 'pending_payments', label: 'Pagos Pendientes', icon: DollarSign, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
    { key: 'rejected_subscriptions', label: 'Suscripciones Rechazadas', icon: Ban, color: 'text-red-400', bg: 'bg-red-500/10' },
  ]

  const quickActions = [
    { label: 'Ver Usuarios', href: '/admin/users', icon: Users, color: 'text-purple-400', bg: 'bg-purple-500/10' },
    { label: 'Ver Tiendas', href: '/admin/stores', icon: Store, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
    { label: 'Ver Suscripciones', href: '/admin/subscriptions', icon: CreditCard, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { label: 'Ver Pagos Pendientes', href: '/admin/payments', icon: DollarSign, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
    { label: 'Ver Auditoria', href: '/admin/audit', icon: Shield, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  ]

  return (
    <div className="p-4 md:p-6 space-y-5 md:space-y-8">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Dashboard General</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Resumen global de la plataforma
          </p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground hidden sm:inline">
            {formatSpanishDate(new Date())}
          </span>
          <button
            onClick={() => fetchMetrics(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-sm font-medium disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        </div>
      </div>

      {/* PENDING ALERTS */}
      {(val('pending_subscriptions') > 0 || val('pending_payments') > 0) && (
        <div className="space-y-3">
          {val('pending_subscriptions') > 0 && (
            <div
              className="flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/10 px-5 py-4 cursor-pointer hover:bg-amber-500/15 transition-colors"
              onClick={() => router.push('/admin/subscriptions')}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/20 animate-pulse">
                  <CreditCard className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-amber-300">
                    {val('pending_subscriptions')} suscripcion{val('pending_subscriptions') > 1 ? 'es' : ''} pendiente{val('pending_subscriptions') > 1 ? 's' : ''} de aprobacion
                  </p>
                  <p className="text-xs text-amber-400/70">Haz clic para revisar y aprobar</p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-amber-400" />
            </div>
          )}
          {val('pending_payments') > 0 && (
            <div
              className="flex items-center justify-between rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-5 py-4 cursor-pointer hover:bg-yellow-500/15 transition-colors"
              onClick={() => router.push('/admin/payments')}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-500/20 animate-pulse">
                  <DollarSign className="h-5 w-5 text-yellow-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-yellow-300">
                    {val('pending_payments')} pago{val('pending_payments') > 1 ? 's' : ''} pendiente{val('pending_payments') > 1 ? 's' : ''} de revision
                  </p>
                  <p className="text-xs text-yellow-400/70">Haz clic para revisar comprobantes</p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-yellow-400" />
            </div>
          )}
        </div>
      )}

      {/* SECTION 1 - KEY METRICS */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {keyMetrics.map((card) => {
          const value = card.isCurrency ? formatCurrency(val(card.key)) : val(card.key)
          return (
            <Card key={card.key} className={`glow-card bg-gradient-card ${card.border} border`}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-3xl font-bold text-foreground">
                      {value}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">{card.label}</p>
                  </div>
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${card.bg} shrink-0`}>
                    <card.icon className={`h-6 w-6 ${card.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* SECTION 2 - DETAILED METRICS */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">Metricas Detalladas</h2>
        <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {detailedMetrics.map((card) => {
            const value = card.computed !== undefined ? card.computed : val(card.key)
            return (
              <Card key={card.key} className="glow-card bg-gradient-card border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${card.bg} shrink-0`}>
                      <card.icon className={`h-4 w-4 ${card.color}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xl font-bold text-foreground truncate">
                        {value}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{card.label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* SECTION 3 - TWO COLUMN LAYOUT */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Users */}
        <Card className="glow-card bg-gradient-card border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <UserCircle className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-foreground">Ultimos Usuarios Registrados</h3>
            </div>
            <div className="rounded-xl border border-border/50 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50 hover:bg-transparent">
                    <TableHead className="text-muted-foreground">Usuario</TableHead>
                    <TableHead className="text-muted-foreground">Rol</TableHead>
                    <TableHead className="text-muted-foreground">Estado</TableHead>
                    <TableHead className="text-muted-foreground text-right">Fecha</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(metrics?.recent_users || []).map((user) => (
                    <TableRow key={user.id} className="border-border/50 hover:bg-secondary/30">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 shrink-0">
                            <UserCircle className="h-4 w-4 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-foreground text-sm truncate">
                              {user.full_name || 'Sin nombre'}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            user.role === 'admin'
                              ? 'bg-purple-500/15 text-purple-400 border-purple-500/30'
                              : 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                          }
                        >
                          {user.role === 'admin' ? 'Admin' : 'Usuario'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            user.is_active
                              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                              : 'bg-red-500/15 text-red-400 border-red-500/30'
                          }
                        >
                          {user.is_active ? 'Activo' : 'Suspendido'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-xs text-muted-foreground">
                          {new Date(user.created_at).toLocaleDateString('es-MX')}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!metrics?.recent_users || metrics.recent_users.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        No hay usuarios registrados aun
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="glow-card bg-gradient-card border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-foreground">Actividad Reciente</h3>
            </div>
            <div className="rounded-xl border border-border/50 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50 hover:bg-transparent">
                    <TableHead className="text-muted-foreground">Accion</TableHead>
                    <TableHead className="text-muted-foreground">Administrador</TableHead>
                    <TableHead className="text-muted-foreground text-right">Fecha/Hora</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(metrics?.recent_activity || []).map((activity) => (
                    <TableRow key={activity.id} className="border-border/50 hover:bg-secondary/30">
                      <TableCell>
                        <span className="text-sm text-foreground">
                          {actionLabels[activity.action] || activity.action}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {activity.profile?.full_name || activity.profile?.email || 'Sistema'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-xs text-muted-foreground">
                          {new Date(activity.created_at).toLocaleString('es-MX', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!metrics?.recent_activity || metrics.recent_activity.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                        No hay actividad reciente
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* SECTION 4 - RECENT NOTIFICATIONS */}
      {notifications.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              Notificaciones Recientes
            </h2>
          </div>
          <div className="space-y-3">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                className={`rounded-xl border px-5 py-4 transition-colors ${
                  notif.is_read
                    ? 'border-border/30 bg-secondary/10'
                    : 'border-emerald-500/30 bg-emerald-500/5'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-full shrink-0 mt-0.5 ${
                    notif.type === 'pago_exitoso'
                      ? 'bg-emerald-500/15'
                      : notif.type === 'pago_fallido'
                      ? 'bg-red-500/15'
                      : 'bg-blue-500/15'
                  }`}>
                    <DollarSign className={`h-4 w-4 ${
                      notif.type === 'pago_exitoso'
                        ? 'text-emerald-400'
                        : notif.type === 'pago_fallido'
                        ? 'text-red-400'
                        : 'text-blue-400'
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">{notif.title}</p>
                      {!notif.is_read && (
                        <span className="h-2 w-2 rounded-full bg-emerald-400 shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{notif.message}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1">
                      {new Date(notif.created_at).toLocaleString('es-MX', {
                        day: '2-digit', month: '2-digit', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 5 - QUICK ACTIONS */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">Acciones Rapidas</h2>
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {quickActions.map((action) => (
            <Card
              key={action.href}
              className="glow-card bg-gradient-card border-border/50 cursor-pointer hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all duration-200 group"
              onClick={() => router.push(action.href)}
            >
              <CardContent className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${action.bg} shrink-0`}>
                    <action.icon className={`h-5 w-5 ${action.color}`} />
                  </div>
                  <span className="text-sm font-medium text-foreground">{action.label}</span>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
