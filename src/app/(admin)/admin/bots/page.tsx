'use client'

import { useState, useEffect, useCallback, useMemo, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Bot, Loader2, Search, Wifi, WifiOff, Play, Pause, Power, PowerOff,
  Trash2, UserCircle, Package, MessageSquare, Shield,
} from 'lucide-react'
import { toast } from 'sonner'

interface BotWithMeta {
  id: string
  name: string
  description: string | null
  is_active: boolean
  paused_at: string | null
  paused_by: string | null
  tenant_id: string
  created_at: string
  tenants?: { name: string; email?: string } | null
  whatsapp_status: string
  whatsapp_phone: string | null
  products?: unknown[] | null
  products_count?: number
  conversations_count?: number
}

type EstadoFilter = 'all' | 'active' | 'inactive' | 'paused'
type WhatsAppFilter = 'all' | 'connected' | 'disconnected'

function getBotStatus(bot: BotWithMeta): 'active' | 'paused' | 'inactive' {
  if (bot.is_active) return 'active'
  if (bot.paused_at) return 'paused'
  return 'inactive'
}

function AdminBotsContent() {
  const searchParams = useSearchParams()
  const userFilter = searchParams.get('user') || ''

  const [bots, setBots] = useState<BotWithMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterEstado, setFilterEstado] = useState<EstadoFilter>('all')
  const [filterWhatsApp, setFilterWhatsApp] = useState<WhatsAppFilter>('all')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchBots = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/bots')
      if (res.ok) {
        const data = await res.json()
        setBots(data)
      } else {
        toast.error('Error al cargar bots')
      }
    } catch {
      toast.error('Error de conexión')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchBots() }, [fetchBots])

  const filtered = useMemo(() => {
    let result = bots

    // Filter by user (tenant_id) from URL params
    if (userFilter) {
      result = result.filter((b) => b.tenant_id === userFilter)
    }

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter((b) =>
        b.name?.toLowerCase().includes(q) ||
        b.description?.toLowerCase().includes(q) ||
        b.tenants?.name?.toLowerCase().includes(q) ||
        b.tenants?.email?.toLowerCase().includes(q)
      )
    }

    // Estado filter
    if (filterEstado !== 'all') {
      result = result.filter((b) => getBotStatus(b) === filterEstado)
    }

    // WhatsApp filter
    if (filterWhatsApp !== 'all') {
      if (filterWhatsApp === 'connected') {
        result = result.filter((b) => b.whatsapp_status === 'connected')
      } else {
        result = result.filter((b) => b.whatsapp_status !== 'connected')
      }
    }

    return result
  }, [bots, search, filterEstado, filterWhatsApp, userFilter])

  const handleAction = async (botId: string, action: string, label: string) => {
    setActionLoading(botId)
    try {
      const res = await fetch(`/api/admin/bots/${botId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (res.ok) {
        toast.success(label)
        fetchBots()
      } else {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error || 'Error al ejecutar acción')
      }
    } catch {
      toast.error('Error de conexión')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDelete = async (bot: BotWithMeta) => {
    if (!confirm(`¿Eliminar el bot "${bot.name}"?\n\nEsta acción no se puede deshacer y se eliminarán todos los datos asociados.`)) return
    setActionLoading(bot.id)
    try {
      const res = await fetch(`/api/admin/bots/${bot.id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Bot eliminado correctamente')
        fetchBots()
      } else {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error || 'Error al eliminar bot')
      }
    } catch {
      toast.error('Error de conexión')
    } finally {
      setActionLoading(null)
    }
  }

  const statusConfig = {
    active: {
      label: 'Activo',
      classes: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    },
    paused: {
      label: 'Pausado',
      classes: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
    },
    inactive: {
      label: 'Inactivo',
      classes: 'bg-red-500/15 text-red-400 border-red-500/30',
    },
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/10 ring-1 ring-cyan-500/20">
          <Shield className="h-6 w-6 text-cyan-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Bots por Usuario</h1>
          <p className="text-sm text-muted-foreground">
            Supervisión de todos los bots de la plataforma
            {' '}&middot;{' '}
            <span className="text-cyan-400 font-medium">{bots.length}</span> bot{bots.length !== 1 ? 's' : ''} total{bots.length !== 1 ? 'es' : ''}
            {userFilter && (
              <span className="ml-2 text-yellow-400">(filtrado por usuario)</span>
            )}
          </p>
        </div>
      </div>

      {/* Filters Bar */}
      <Card className="glow-card bg-gradient-card border-border/50">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[220px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre de bot o propietario..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={filterEstado} onValueChange={(v) => setFilterEstado((v || 'all') as EstadoFilter)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="active">Activos</SelectItem>
                <SelectItem value="inactive">Inactivos</SelectItem>
                <SelectItem value="paused">Pausados</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterWhatsApp} onValueChange={(v) => setFilterWhatsApp((v || 'all') as WhatsAppFilter)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="WhatsApp" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos WhatsApp</SelectItem>
                <SelectItem value="connected">Conectado</SelectItem>
                <SelectItem value="disconnected">Desconectado</SelectItem>
              </SelectContent>
            </Select>

            {(search || filterEstado !== 'all' || filterWhatsApp !== 'all') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setSearch(''); setFilterEstado('all'); setFilterWhatsApp('all') }}
                className="text-muted-foreground hover:text-foreground"
              >
                Limpiar filtros
              </Button>
            )}
          </div>
          {filtered.length !== bots.length && (
            <p className="text-xs text-muted-foreground mt-2">
              Mostrando {filtered.length} de {bots.length} bots
            </p>
          )}
        </CardContent>
      </Card>

      {/* Bots Table */}
      <Card className="glow-card bg-gradient-card border-border/50">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Cargando bots...</p>
            </div>
          ) : (
            <div className="rounded-xl overflow-hidden overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50 hover:bg-transparent">
                    <TableHead className="text-muted-foreground">Bot</TableHead>
                    <TableHead className="text-muted-foreground">Propietario</TableHead>
                    <TableHead className="text-muted-foreground">Estado</TableHead>
                    <TableHead className="text-muted-foreground">WhatsApp</TableHead>
                    <TableHead className="text-muted-foreground text-center">Productos</TableHead>
                    <TableHead className="text-muted-foreground text-center">Conversaciones</TableHead>
                    <TableHead className="text-muted-foreground">Creado</TableHead>
                    <TableHead className="text-muted-foreground text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((bot) => {
                    const status = getBotStatus(bot)
                    const config = statusConfig[status]
                    const isLoading = actionLoading === bot.id
                    const productsCount = bot.products_count ?? bot.products?.length ?? 0

                    return (
                      <TableRow key={bot.id} className="border-border/50 hover:bg-secondary/30">
                        {/* Bot Name + Description */}
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                              <Bot className="h-4 w-4 text-primary" />
                            </div>
                            <div className="min-w-0">
                              <span className="font-medium text-foreground text-sm block truncate max-w-[200px]">
                                {bot.name}
                              </span>
                              <span className="text-xs text-muted-foreground line-clamp-1 max-w-[200px]">
                                {bot.description || 'Sin descripción'}
                              </span>
                            </div>
                          </div>
                        </TableCell>

                        {/* Owner */}
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <UserCircle className="h-4 w-4 text-muted-foreground shrink-0" />
                            <div className="min-w-0">
                              <span className="text-sm text-foreground block truncate max-w-[160px]">
                                {bot.tenants?.name || 'Sin propietario'}
                              </span>
                              {bot.tenants?.email && (
                                <span className="text-xs text-muted-foreground block truncate max-w-[160px]">
                                  {bot.tenants.email}
                                </span>
                              )}
                            </div>
                          </div>
                        </TableCell>

                        {/* Status Badge */}
                        <TableCell>
                          <Badge variant="outline" className={config.classes}>
                            {config.label}
                          </Badge>
                        </TableCell>

                        {/* WhatsApp Status */}
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {bot.whatsapp_status === 'connected' ? (
                              <>
                                <Wifi className="h-3.5 w-3.5 text-emerald-400" />
                                <span className="text-xs text-emerald-400">
                                  {bot.whatsapp_phone ? `+${bot.whatsapp_phone}` : 'Conectado'}
                                </span>
                              </>
                            ) : (
                              <>
                                <WifiOff className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">Desconectado</span>
                              </>
                            )}
                          </div>
                        </TableCell>

                        {/* Products Count */}
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <Package className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">{productsCount}</span>
                          </div>
                        </TableCell>

                        {/* Conversations Count */}
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                              {bot.conversations_count ?? '—'}
                            </span>
                          </div>
                        </TableCell>

                        {/* Created Date */}
                        <TableCell>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(bot.created_at).toLocaleDateString('es-MX', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {/* Activate button - shown when inactive or paused */}
                            {(status === 'inactive' || status === 'paused') && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleAction(bot.id, 'activate', 'Bot activado')}
                                disabled={isLoading}
                                className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                                title="Activar"
                              >
                                {isLoading ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Play className="h-3.5 w-3.5" />
                                )}
                                <span className="ml-1 hidden lg:inline">Activar</span>
                              </Button>
                            )}

                            {/* Pause button - shown when active */}
                            {status === 'active' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleAction(bot.id, 'pause', 'Bot pausado')}
                                disabled={isLoading}
                                className="text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10"
                                title="Pausar"
                              >
                                {isLoading ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Pause className="h-3.5 w-3.5" />
                                )}
                                <span className="ml-1 hidden lg:inline">Pausar</span>
                              </Button>
                            )}

                            {/* Deactivate button - shown when active or paused */}
                            {(status === 'active' || status === 'paused') && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleAction(bot.id, 'deactivate', 'Bot desactivado')}
                                disabled={isLoading}
                                className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                title="Desactivar"
                              >
                                {isLoading ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <PowerOff className="h-3.5 w-3.5" />
                                )}
                                <span className="ml-1 hidden xl:inline">Desactivar</span>
                              </Button>
                            )}

                            {/* Delete button - always shown */}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(bot)}
                              disabled={isLoading}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              title="Eliminar"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  {filtered.length === 0 && !loading && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-16">
                        <div className="flex flex-col items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted/50">
                            <Bot className="h-6 w-6 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">
                              {search || filterEstado !== 'all' || filterWhatsApp !== 'all'
                                ? 'No se encontraron bots con los filtros aplicados'
                                : 'No hay bots creados en la plataforma'}
                            </p>
                            {(search || filterEstado !== 'all' || filterWhatsApp !== 'all') && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Intenta ajustar los filtros de búsqueda
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function AdminBotsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <AdminBotsContent />
    </Suspense>
  )
}
