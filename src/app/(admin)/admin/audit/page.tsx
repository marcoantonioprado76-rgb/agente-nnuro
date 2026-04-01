'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Loader2,
  ScrollText,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Search,
  ChevronDown,
  ChevronUp,
  Filter,
  Activity,
} from 'lucide-react'
import type { AuditLog } from '@/types'

// ---------------------------------------------------------------------------
// Action labels
// ---------------------------------------------------------------------------
const actionLabels: Record<string, string> = {
  register: 'Usuario registrado',
  login: 'Inicio de sesion',
  logout: 'Cierre de sesion',
  'user.create': 'Usuario creado',
  'user.suspend': 'Usuario suspendido',
  'user.activate': 'Usuario activado',
  'user.delete': 'Usuario eliminado',
  'user.role_change': 'Cambio de rol',
  'bot.create': 'Bot creado',
  'bot.edit': 'Bot editado',
  'bot.activate': 'Bot activado',
  'bot.deactivate': 'Bot desactivado',
  'bot.pause': 'Bot pausado',
  'bot.delete': 'Bot eliminado',
  'product.create': 'Producto creado',
  'product.edit': 'Producto editado',
  'product.delete': 'Producto eliminado',
  'product.toggle': 'Estado de producto cambiado',
  'subscription.approve': 'Suscripcion aprobada',
  'subscription.reject': 'Suscripcion rechazada',
  'subscription.cancel': 'Suscripcion cancelada',
  'subscription.suspend': 'Suscripcion suspendida',
  'payment.approve': 'Pago aprobado',
  'payment.reject': 'Pago rechazado',
  'payment.create': 'Pago registrado',
  'whatsapp.connect': 'WhatsApp conectado',
  'whatsapp.disconnect': 'WhatsApp desconectado',
  // Legacy action names
  usuario_registrado: 'Usuario registrado',
  crear_bot: 'Bot creado',
  editar_bot: 'Bot editado',
  eliminar_bot: 'Bot eliminado',
  activar_bot: 'Bot activado',
  desactivar_bot: 'Bot desactivado',
  conectar_whatsapp: 'WhatsApp conectado',
  desconectar_whatsapp: 'WhatsApp desconectado',
  cambiar_rol: 'Cambio de rol',
  suspender_usuario: 'Usuario suspendido',
  activar_usuario: 'Usuario activado',
  eliminar_usuario: 'Usuario eliminado',
  editar_usuario: 'Usuario editado',
  crear_usuario_manual: 'Usuario creado',
  limpiar_memoria: 'Memoria limpiada',
  editar_perfil: 'Perfil editado',
  editar_producto: 'Producto editado',
  eliminar_producto: 'Producto eliminado',
}

// ---------------------------------------------------------------------------
// Action color classification
// ---------------------------------------------------------------------------
type BadgeColor = 'green' | 'red' | 'blue' | 'yellow' | 'gray'

const greenActions = new Set([
  'subscription.approve', 'payment.approve', 'payment.create',
  'user.activate', 'bot.activate', 'bot.create', 'product.create',
  'user.create', 'whatsapp.connect',
  'crear_bot', 'activar_bot', 'activar_usuario', 'conectar_whatsapp', 'crear_usuario_manual',
])
const redActions = new Set([
  'user.delete', 'user.suspend', 'bot.delete', 'bot.deactivate', 'product.delete',
  'subscription.reject', 'subscription.cancel', 'subscription.suspend',
  'payment.reject', 'whatsapp.disconnect',
  'eliminar_bot', 'desactivar_bot', 'suspender_usuario', 'eliminar_usuario',
  'desconectar_whatsapp', 'eliminar_producto',
])
const blueActions = new Set([
  'register', 'login', 'logout',
  'bot.edit', 'product.edit', 'user.role_change',
  'usuario_registrado', 'editar_bot', 'cambiar_rol', 'editar_usuario', 'editar_perfil', 'editar_producto',
])
const yellowActions = new Set([
  'bot.pause', 'product.toggle', 'limpiar_memoria',
])

function getActionColor(action: string): BadgeColor {
  if (greenActions.has(action)) return 'green'
  if (redActions.has(action)) return 'red'
  if (blueActions.has(action)) return 'blue'
  if (yellowActions.has(action)) return 'yellow'
  return 'gray'
}

const badgeStyles: Record<BadgeColor, string> = {
  green: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  red: 'bg-red-500/15 text-red-400 border-red-500/30',
  blue: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  yellow: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  gray: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30',
}

// ---------------------------------------------------------------------------
// Category filter definitions
// ---------------------------------------------------------------------------
const categoryPrefixes: Record<string, string[]> = {
  Usuarios: [
    'register', 'login', 'logout',
    'user.', 'usuario_registrado', 'cambiar_rol',
    'suspender_usuario', 'activar_usuario', 'eliminar_usuario',
    'editar_usuario', 'crear_usuario_manual', 'editar_perfil',
  ],
  Bots: [
    'bot.', 'crear_bot', 'editar_bot', 'eliminar_bot',
    'activar_bot', 'desactivar_bot', 'limpiar_memoria',
  ],
  Productos: [
    'product.', 'editar_producto', 'eliminar_producto',
  ],
  Suscripciones: ['subscription.'],
  Pagos: ['payment.'],
  WhatsApp: [
    'whatsapp.', 'conectar_whatsapp', 'desconectar_whatsapp',
  ],
}

function matchesCategory(action: string, category: string): boolean {
  if (category === 'Todos') return true
  const prefixes = categoryPrefixes[category]
  if (!prefixes) return true
  return prefixes.some((p) => action === p || action.startsWith(p))
}

// ---------------------------------------------------------------------------
// Entity type badge color
// ---------------------------------------------------------------------------
function getEntityBadge(entityType?: string) {
  if (!entityType) return null
  const map: Record<string, string> = {
    user: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    bot: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    product: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    subscription: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
    payment: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    whatsapp: 'bg-green-500/15 text-green-400 border-green-500/30',
    session: 'bg-green-500/15 text-green-400 border-green-500/30',
  }
  return map[entityType.toLowerCase()] || 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30'
}

// ---------------------------------------------------------------------------
// Format details for display
// ---------------------------------------------------------------------------
function formatDetails(details?: Record<string, unknown>): string {
  if (!details || Object.keys(details).length === 0) return ''
  const entries = Object.entries(details)
  return entries
    .slice(0, 4)
    .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`)
    .join(' | ')
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const PAGE_SIZE = 25
const CATEGORIES = ['Todos', 'Usuarios', 'Bots', 'Productos', 'Suscripciones', 'Pagos', 'WhatsApp']

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function AdminAuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Filters
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('Todos')

  // Expanded details row
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // ------- Fetch -------
  const fetchLogs = useCallback(async (showRefreshSpinner = false) => {
    if (showRefreshSpinner) setRefreshing(true)
    else setLoading(true)

    try {
      const res = await fetch(`/api/admin/audit?limit=${PAGE_SIZE}&offset=${page * PAGE_SIZE}`)
      if (res.ok) {
        const data = await res.json()
        setLogs(data.logs || [])
        setTotal(data.total || 0)
      }
    } catch {
      // silenciar
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [page])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  // ------- Client-side filtering -------
  const filtered = useMemo(() => {
    let result = logs

    // Category filter
    if (category !== 'Todos') {
      result = result.filter((l) => matchesCategory(l.action, category))
    }

    // Search by user name or email
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter((l) => {
        const name = l.profile?.full_name?.toLowerCase() || ''
        const email = l.profile?.email?.toLowerCase() || ''
        return name.includes(q) || email.includes(q)
      })
    }

    return result
  }, [logs, category, search])

  // ------- Pagination helpers -------
  const totalPages = Math.ceil(total / PAGE_SIZE)
  const rangeStart = page * PAGE_SIZE + 1
  const rangeEnd = Math.min((page + 1) * PAGE_SIZE, total)

  // ------- Render -------
  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* ---- Header ---- */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500/20 to-indigo-500/20 border border-purple-500/20">
            <ScrollText className="h-5 w-5 text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              Actividad / Auditoria
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Registro completo de actividad de la plataforma
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary/50 border border-border/50">
            <Activity className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">
              {total.toLocaleString('es-MX')} registros
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchLogs(true)}
            disabled={refreshing}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>
      </div>

      {/* ---- Filters ---- */}
      <Card className="bg-gradient-card border-border/50">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-background/50 border-border/50"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
              <Select value={category} onValueChange={(v) => setCategory(v || 'all')}>
                <SelectTrigger className="w-[200px] bg-background/50 border-border/50">
                  <SelectValue placeholder="Tipo de accion" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ---- Table ---- */}
      <Card className="bg-gradient-card border-border/50 overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Cargando registros...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <ScrollText className="h-10 w-10 text-muted-foreground/40" />
              <p className="text-muted-foreground text-sm">No se encontraron registros</p>
              {(search || category !== 'Todos') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearch('')
                    setCategory('Todos')
                  }}
                  className="text-xs"
                >
                  Limpiar filtros
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50 hover:bg-transparent bg-secondary/30">
                    <TableHead className="text-muted-foreground text-xs font-semibold uppercase tracking-wider w-[160px]">
                      Fecha / Hora
                    </TableHead>
                    <TableHead className="text-muted-foreground text-xs font-semibold uppercase tracking-wider w-[200px]">
                      Accion
                    </TableHead>
                    <TableHead className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                      Usuario
                    </TableHead>
                    <TableHead className="text-muted-foreground text-xs font-semibold uppercase tracking-wider w-[130px]">
                      Entidad
                    </TableHead>
                    <TableHead className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                      Detalles
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((log) => {
                    const color = getActionColor(log.action)
                    const label = actionLabels[log.action] || log.action
                    const entityStyle = getEntityBadge(log.entity_type)
                    const isExpanded = expandedId === log.id
                    const detailsStr = formatDetails(log.details)
                    const hasDetails = detailsStr.length > 0

                    return (
                      <TableRow
                        key={log.id}
                        className="border-border/30 hover:bg-secondary/20 transition-colors group"
                      >
                        {/* Date */}
                        <TableCell className="py-3">
                          <div className="flex flex-col">
                            <span className="text-sm text-foreground/80 font-medium">
                              {new Date(log.created_at).toLocaleDateString('es-MX', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(log.created_at).toLocaleTimeString('es-MX', {
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                              })}
                            </span>
                          </div>
                        </TableCell>

                        {/* Action */}
                        <TableCell className="py-3">
                          <Badge
                            variant="outline"
                            className={`${badgeStyles[color]} text-xs font-medium`}
                          >
                            {label}
                          </Badge>
                        </TableCell>

                        {/* User */}
                        <TableCell className="py-3">
                          {log.profile ? (
                            <div className="flex flex-col">
                              <span className="text-sm text-foreground/90 font-medium">
                                {log.profile.full_name || 'Sin nombre'}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {log.profile.email}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground/60">--</span>
                          )}
                        </TableCell>

                        {/* Entity type */}
                        <TableCell className="py-3">
                          {log.entity_type ? (
                            <Badge
                              variant="outline"
                              className={`${entityStyle} text-xs capitalize`}
                            >
                              {log.entity_type}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground/60">--</span>
                          )}
                        </TableCell>

                        {/* Details */}
                        <TableCell className="py-3">
                          {hasDetails ? (
                            <div className="flex flex-col gap-1">
                              <button
                                onClick={() =>
                                  setExpandedId(isExpanded ? null : log.id)
                                }
                                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors text-left"
                              >
                                <span className={isExpanded ? '' : 'line-clamp-1 max-w-[280px]'}>
                                  {detailsStr}
                                </span>
                                {isExpanded ? (
                                  <ChevronUp className="h-3 w-3 shrink-0 ml-1" />
                                ) : (
                                  <ChevronDown className="h-3 w-3 shrink-0 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                                )}
                              </button>
                              {isExpanded && (
                                <pre className="text-xs text-muted-foreground bg-background/60 rounded-md p-2 mt-1 overflow-x-auto max-w-[400px] border border-border/30">
                                  {JSON.stringify(log.details, null, 2)}
                                </pre>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground/60">--</span>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ---- Pagination ---- */}
      {totalPages > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-sm text-muted-foreground">
            Mostrando {rangeStart}-{rangeEnd} de {total.toLocaleString('es-MX')} registros
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                let pageNum: number
                if (totalPages <= 7) {
                  pageNum = i
                } else if (page < 3) {
                  pageNum = i
                } else if (page > totalPages - 4) {
                  pageNum = totalPages - 7 + i
                } else {
                  pageNum = page - 3 + i
                }

                return (
                  <Button
                    key={pageNum}
                    variant={pageNum === page ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setPage(pageNum)}
                    className={`h-8 w-8 p-0 text-xs ${
                      pageNum === page
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {pageNum + 1}
                  </Button>
                )
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="gap-1"
            >
              Siguiente
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
