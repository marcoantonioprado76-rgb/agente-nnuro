'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Users, Search, Plus, MoreHorizontal, Eye, Edit, Trash2, Ban,
  Bot, Package, Store, UserCheck, UserX, Shield, Loader2, RefreshCw,
  MapPin, Phone, Mail, Globe, CreditCard, CalendarDays,
} from 'lucide-react'
import { toast } from 'sonner'

interface Plan {
  id: string
  name: string
  price: number
  currency: string
}

interface EnrichedUser {
  id: string
  email: string
  full_name: string
  role: 'admin' | 'user'
  is_active: boolean
  created_at: string
  last_login_at?: string
  tenants?: { name: string } | null
  subscription?: {
    status: string
    approval_status: string
    plan?: { name: string } | null
  } | null
  bots_count: number
  products_count: number
  stores_count: number
  country: string
  city: string
  phone_number: string
  country_code: string
  phone_with_code: string
  login_provider: string
  status: string
}

function getInitials(name: string): string {
  if (!name) return '??'
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

function relativeDate(dateStr?: string): string {
  if (!dateStr) return 'Nunca'
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'Justo ahora'
  if (diffMin < 60) return `Hace ${diffMin} min`
  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) return `Hace ${diffHours}h`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `Hace ${diffDays}d`
  if (diffDays < 30) return `Hace ${Math.floor(diffDays / 7)} sem`
  return date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function AdminUsersPage() {
  const router = useRouter()
  const [allUsers, setAllUsers] = useState<EnrichedUser[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterRole, setFilterRole] = useState('all')
  const [filterPlan, setFilterPlan] = useState('all')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Create user dialog
  const [createOpen, setCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newRole, setNewRole] = useState<'admin' | 'user'>('user')

  // Edit user dialog
  const [editOpen, setEditOpen] = useState(false)
  const [editUser, setEditUser] = useState<EnrichedUser | null>(null)
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editRole, setEditRole] = useState<'admin' | 'user'>('user')
  const [editStatus, setEditStatus] = useState<'active' | 'suspended'>('active')
  const [saving, setSaving] = useState(false)

  // Detail dialog
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailUser, setDetailUser] = useState<EnrichedUser | null>(null)

  // Manual subscription dialog
  const [manualSubOpen, setManualSubOpen] = useState(false)
  const [manualSubUser, setManualSubUser] = useState<EnrichedUser | null>(null)
  const [manualSubPlanId, setManualSubPlanId] = useState('')
  const [manualSubSaving, setManualSubSaving] = useState(false)
  const [availablePlans, setAvailablePlans] = useState<Plan[]>([])

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/users')
      if (res.ok) {
        setAllUsers(await res.json())
      } else {
        toast.error('Error al cargar usuarios')
      }
    } catch {
      toast.error('Error de conexion')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  // Dynamic plan options
  const planOptions = useMemo(() => {
    const plans = new Set<string>()
    allUsers.forEach((u) => {
      if (u.subscription?.plan?.name) plans.add(u.subscription.plan.name)
    })
    return Array.from(plans).sort()
  }, [allUsers])

  // Client-side filtered users
  const filteredUsers = useMemo(() => {
    let result = allUsers

    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase()
      result = result.filter(
        (u) =>
          (u.full_name || '').toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q)
      )
    }

    if (filterStatus !== 'all') {
      result = result.filter((u) =>
        filterStatus === 'active' ? u.is_active : !u.is_active
      )
    }

    if (filterRole !== 'all') {
      result = result.filter((u) => u.role === filterRole)
    }

    if (filterPlan !== 'all') {
      if (filterPlan === 'none') {
        result = result.filter((u) => !u.subscription?.plan?.name)
      } else {
        result = result.filter((u) => u.subscription?.plan?.name === filterPlan)
      }
    }

    return result
  }, [allUsers, debouncedSearch, filterStatus, filterRole, filterPlan])

  // --- Handlers ---

  const handleCreate = async () => {
    if (!newName.trim() || !newEmail.trim() || !newPassword.trim()) {
      toast.error('Todos los campos son obligatorios')
      return
    }
    setCreating(true)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: newName,
          email: newEmail,
          password: newPassword,
          role: newRole,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success('Usuario creado exitosamente')
        setCreateOpen(false)
        setNewName('')
        setNewEmail('')
        setNewPassword('')
        setNewRole('user')
        fetchUsers()
      } else {
        toast.error(data.error || 'Error al crear usuario')
      }
    } catch {
      toast.error('Error de conexion')
    } finally {
      setCreating(false)
    }
  }

  const openEdit = (user: EnrichedUser) => {
    setEditUser(user)
    setEditName(user.full_name || '')
    setEditEmail(user.email || '')
    setEditRole(user.role)
    setEditStatus(user.is_active ? 'active' : 'suspended')
    setEditOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!editUser) return
    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        full_name: editName,
        role: editRole,
        is_active: editStatus === 'active',
      }
      if (editEmail !== editUser.email) {
        payload.email = editEmail
      }
      const res = await fetch(`/api/admin/users/${editUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        toast.success('Usuario actualizado')
        setEditOpen(false)
        fetchUsers()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Error al actualizar')
      }
    } catch {
      toast.error('Error de conexion')
    } finally {
      setSaving(false)
    }
  }

  const handleBlock = async (user: EnrichedUser) => {
    if (!window.confirm(`¿Bloquear a ${user.full_name || user.email}? El usuario no podra acceder a la plataforma.`)) return
    setActionLoading(user.id)
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'block' }),
      })
      if (res.ok) {
        toast.success('Usuario bloqueado')
        fetchUsers()
      } else {
        toast.error('Error al bloquear usuario')
      }
    } catch {
      toast.error('Error de conexion')
    } finally {
      setActionLoading(null)
    }
  }

  const openDetail = (user: EnrichedUser) => {
    setDetailUser(user)
    setDetailOpen(true)
  }

  const handleToggleActive = async (user: EnrichedUser) => {
    const action = user.is_active ? 'suspender' : 'reactivar'
    if (!window.confirm(`¿Deseas ${action} a ${user.full_name || user.email}?`)) return
    setActionLoading(user.id)
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !user.is_active }),
      })
      if (res.ok) {
        toast.success(user.is_active ? 'Usuario suspendido' : 'Usuario reactivado')
        fetchUsers()
      } else {
        toast.error('Error al cambiar estado')
      }
    } catch {
      toast.error('Error de conexion')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDelete = async (user: EnrichedUser) => {
    if (!window.confirm(`¿Eliminar a ${user.full_name || user.email}? Esta accion no se puede deshacer.`)) return
    setActionLoading(user.id)
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Usuario eliminado')
        fetchUsers()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Error al eliminar')
      }
    } catch {
      toast.error('Error de conexion')
    } finally {
      setActionLoading(null)
    }
  }

  const openManualSub = async (user: EnrichedUser) => {
    setManualSubUser(user)
    setManualSubPlanId('')
    setManualSubOpen(true)
    // Cargar planes disponibles
    try {
      const res = await fetch('/api/plans')
      if (res.ok) {
        const plans = await res.json()
        setAvailablePlans(plans)
      }
    } catch {
      toast.error('Error al cargar planes')
    }
  }

  const handleManualSubscription = async () => {
    if (!manualSubUser || !manualSubPlanId) {
      toast.error('Selecciona un plan')
      return
    }
    const selectedPlan = availablePlans.find(p => p.id === manualSubPlanId)
    if (!window.confirm(
      `¿Activar manualmente "${selectedPlan?.name}" para ${manualSubUser.full_name || manualSubUser.email}?\n\nDuracion: 30 dias desde hoy.`
    )) return

    setManualSubSaving(true)
    try {
      const res = await fetch('/api/admin/subscriptions/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: manualSubUser.id,
          plan_id: manualSubPlanId,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(`Suscripcion activada: ${data.plan_name}`)
        setManualSubOpen(false)
        fetchUsers()
      } else {
        toast.error(data.error || 'Error al activar suscripcion')
      }
    } catch {
      toast.error('Error de conexion')
    } finally {
      setManualSubSaving(false)
    }
  }

  const getPlanBadge = (user: EnrichedUser) => {
    const planName = user.subscription?.plan?.name
    if (!planName) return { label: 'Sin plan', className: 'bg-gray-500/15 text-gray-400 border-gray-500/30' }
    return { label: planName, className: 'bg-violet-500/15 text-violet-400 border-violet-500/30' }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="p-4 md:p-6 space-y-4 md:space-y-6 max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500/20 to-violet-500/20 border border-purple-500/20 shrink-0">
              <Users className="h-5 w-5 sm:h-6 sm:w-6 text-purple-400" />
            </div>
            <div>
              <h1 className="text-lg sm:text-2xl font-bold text-foreground tracking-tight">
                Gestion de Usuarios
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {allUsers.length} usuario{allUsers.length !== 1 ? 's' : ''} registrado{allUsers.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => { setLoading(true); fetchUsers() }}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button onClick={() => setCreateOpen(true)} className="gap-2" size="sm">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Crear Usuario</span>
              <span className="sm:hidden">Crear</span>
            </Button>
          </div>
        </div>

        {/* Filters Bar */}
        <Card className="bg-gradient-card border-border/50">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[180px] sm:min-w-[220px] max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre o email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v || 'all')}>
                <SelectTrigger className="w-[130px] sm:w-[150px]">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Activos</SelectItem>
                  <SelectItem value="suspended">Suspendidos</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterRole} onValueChange={(v) => setFilterRole(v || 'all')}>
                <SelectTrigger className="w-[130px] sm:w-[150px]">
                  <SelectValue placeholder="Rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="user">Usuarios</SelectItem>
                  <SelectItem value="admin">Admins</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterPlan} onValueChange={(v) => setFilterPlan(v || 'all')}>
                <SelectTrigger className="w-[170px]">
                  <SelectValue placeholder="Plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los planes</SelectItem>
                  <SelectItem value="none">Sin plan</SelectItem>
                  {planOptions.map((plan) => (
                    <SelectItem key={plan} value={plan}>{plan}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(debouncedSearch || filterStatus !== 'all' || filterRole !== 'all' || filterPlan !== 'all') && (
                <span className="text-xs text-muted-foreground ml-auto">
                  {filteredUsers.length} resultado{filteredUsers.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card className="glow-card bg-gradient-card border-border/50">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="rounded-xl overflow-hidden overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/50 hover:bg-transparent">
                      <TableHead className="text-muted-foreground">Usuario</TableHead>
                      <TableHead className="text-muted-foreground">Rol</TableHead>
                      <TableHead className="text-muted-foreground">Estado</TableHead>
                      <TableHead className="text-muted-foreground">Plan</TableHead>
                      <TableHead className="text-muted-foreground text-center">Bots</TableHead>
                      <TableHead className="text-muted-foreground text-center">Productos</TableHead>
                      <TableHead className="text-muted-foreground">Ultimo acceso</TableHead>
                      <TableHead className="text-muted-foreground">Registro</TableHead>
                      <TableHead className="text-muted-foreground text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => {
                      const plan = getPlanBadge(user)
                      return (
                        <TableRow key={user.id} className="border-border/50 hover:bg-secondary/30">
                          {/* Usuario */}
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20 border border-primary/20 shrink-0">
                                <span className="text-xs font-bold text-primary">
                                  {getInitials(user.full_name)}
                                </span>
                              </div>
                              <div className="min-w-0">
                                <span className="font-medium text-foreground text-sm block truncate">
                                  {user.full_name || 'Sin nombre'}
                                </span>
                                <span className="text-xs text-muted-foreground truncate block">
                                  {user.email}
                                </span>
                              </div>
                            </div>
                          </TableCell>

                          {/* Rol */}
                          <TableCell>
                            <Badge variant="outline" className={
                              user.role === 'admin'
                                ? 'bg-purple-500/15 text-purple-400 border-purple-500/30'
                                : 'bg-violet-500/15 text-violet-400 border-violet-500/30'
                            }>
                              {user.role === 'admin' && <Shield className="h-3 w-3 mr-1" />}
                              {user.role === 'admin' ? 'Admin' : 'Usuario'}
                            </Badge>
                          </TableCell>

                          {/* Estado */}
                          <TableCell>
                            <Badge variant="outline" className={
                              user.status === 'blocked'
                                ? 'bg-red-500/15 text-red-400 border-red-500/30'
                                : user.status === 'suspended'
                                ? 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30'
                                : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                            }>
                              {user.status === 'blocked' ? 'Bloqueado' : user.status === 'suspended' ? 'Suspendido' : 'Activo'}
                            </Badge>
                          </TableCell>

                          {/* Plan */}
                          <TableCell>
                            <Badge variant="outline" className={plan.className}>
                              {plan.label}
                            </Badge>
                          </TableCell>

                          {/* Bots */}
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <Bot className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-sm font-medium text-foreground">{user.bots_count}</span>
                            </div>
                          </TableCell>

                          {/* Productos */}
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <Package className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-sm font-medium text-foreground">{user.products_count}</span>
                            </div>
                          </TableCell>

                          {/* Ultimo acceso */}
                          <TableCell>
                            <span className="text-xs text-muted-foreground">
                              {relativeDate(user.last_login_at)}
                            </span>
                          </TableCell>

                          {/* Registro */}
                          <TableCell>
                            <span className="text-xs text-muted-foreground">
                              {new Date(user.created_at).toLocaleDateString('es-MX', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </span>
                          </TableCell>

                          {/* Acciones */}
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger>
                                <button className="inline-flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors">
                                  {actionLoading === user.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <MoreHorizontal className="h-4 w-4" />
                                  )}
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem onClick={() => openDetail(user)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  Ver detalle
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openEdit(user)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => router.push(`/admin/bots?user=${user.id}`)}>
                                  <Bot className="h-4 w-4 mr-2" />
                                  Ver bots
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => router.push(`/admin/products?user=${user.id}`)}>
                                  <Package className="h-4 w-4 mr-2" />
                                  Ver productos
                                </DropdownMenuItem>
                                {user.role !== 'admin' && (
                                  <DropdownMenuItem onClick={() => openManualSub(user)}>
                                    <CreditCard className="h-4 w-4 mr-2 text-emerald-400" />
                                    <span className="text-emerald-400">Activar suscripcion</span>
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleToggleActive(user)}>
                                  {user.is_active ? (
                                    <>
                                      <UserX className="h-4 w-4 mr-2 text-yellow-400" />
                                      <span className="text-yellow-400">Suspender</span>
                                    </>
                                  ) : (
                                    <>
                                      <UserCheck className="h-4 w-4 mr-2 text-emerald-400" />
                                      <span className="text-emerald-400">Reactivar</span>
                                    </>
                                  )}
                                </DropdownMenuItem>
                                {user.is_active && (
                                  <DropdownMenuItem onClick={() => handleBlock(user)}>
                                    <Ban className="h-4 w-4 mr-2 text-red-400" />
                                    <span className="text-red-400">Bloquear</span>
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={() => handleDelete(user)} className="text-destructive focus:text-destructive">
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Eliminar
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                    {filteredUsers.length === 0 && !loading && (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-16">
                          <div className="flex flex-col items-center gap-3">
                            <Users className="h-10 w-10 text-muted-foreground/30" />
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">
                                {debouncedSearch || filterStatus !== 'all' || filterRole !== 'all' || filterPlan !== 'all'
                                  ? 'No se encontraron usuarios con esos filtros'
                                  : 'No hay usuarios registrados'}
                              </p>
                              <p className="text-xs text-muted-foreground/60 mt-1">
                                {debouncedSearch ? 'Intenta con otros terminos de busqueda' : 'Crea el primer usuario para comenzar'}
                              </p>
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

      {/* Create User Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              Crear Nuevo Usuario
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nombre completo</Label>
              <Input
                placeholder="Juan Perez"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="correo@ejemplo.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Contrasena</Label>
              <Input
                type="password"
                placeholder="Minimo 6 caracteres"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Rol</Label>
              <Select value={newRole} onValueChange={(v) => setNewRole((v || 'user') as 'admin' | 'user')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Usuario</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Crear Usuario
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5 text-primary" />
              Editar Usuario
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nombre completo</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Rol</Label>
              <Select value={editRole} onValueChange={(v) => setEditRole((v || 'user') as 'admin' | 'user')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Usuario</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select value={editStatus} onValueChange={(v) => setEditStatus((v || 'active') as 'active' | 'suspended')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Activo</SelectItem>
                  <SelectItem value="suspended">Suspendido</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manual Subscription Dialog */}
      <Dialog open={manualSubOpen} onOpenChange={setManualSubOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-emerald-400" />
              Activar Suscripcion Manual
            </DialogTitle>
          </DialogHeader>
          {manualSubUser && (
            <div className="space-y-4 py-2">
              {/* User info */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 border border-border/50">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20 border border-primary/20">
                  <span className="text-sm font-bold text-primary">
                    {getInitials(manualSubUser.full_name)}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-foreground text-sm">{manualSubUser.full_name || 'Sin nombre'}</p>
                  <p className="text-xs text-muted-foreground">{manualSubUser.email}</p>
                </div>
              </div>

              {/* Current subscription info */}
              {manualSubUser.subscription?.status === 'active' && (
                <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                  <p className="text-xs text-yellow-400">
                    Este usuario ya tiene una suscripcion activa ({manualSubUser.subscription.plan?.name}).
                    Se cancelara la actual y se creara una nueva.
                  </p>
                </div>
              )}

              {/* Plan selector */}
              <div className="space-y-2">
                <Label>Seleccionar Plan</Label>
                <Select value={manualSubPlanId} onValueChange={(v) => setManualSubPlanId(v || '')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Elige un plan..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availablePlans.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.name} — ${plan.price} {plan.currency}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Duration info */}
              <div className="p-3 rounded-lg bg-secondary/30 border border-border/50 space-y-2">
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  <span>Duracion: <strong>30 dias</strong></span>
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>Inicio: {new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  <p>Vencimiento: {new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                </div>
              </div>

              {/* Manual activation badge */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Shield className="h-3.5 w-3.5" />
                <span>Se registrara como activacion manual en la auditoria</span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setManualSubOpen(false)} disabled={manualSubSaving}>
              Cancelar
            </Button>
            <Button
              onClick={handleManualSubscription}
              disabled={manualSubSaving || !manualSubPlanId}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {manualSubSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Activar Suscripcion
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              Detalle del Usuario
            </DialogTitle>
          </DialogHeader>
          {detailUser && (
            <div className="space-y-5 py-2">
              {/* User identity */}
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20 border border-primary/20">
                  <span className="text-lg font-bold text-primary">
                    {getInitials(detailUser.full_name)}
                  </span>
                </div>
                <div>
                  <p className="text-lg font-semibold text-foreground">{detailUser.full_name || 'Sin nombre'}</p>
                  <p className="text-sm text-muted-foreground">{detailUser.email}</p>
                  {detailUser.phone_with_code && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Phone className="h-3 w-3" /> {detailUser.phone_with_code}
                    </p>
                  )}
                </div>
              </div>

              {/* Location & Provider */}
              {(detailUser.country || detailUser.city) && (
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  {(detailUser.city || detailUser.country) && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {[detailUser.city, detailUser.country].filter(Boolean).join(', ')}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Globe className="h-3 w-3" />
                    {detailUser.login_provider === 'google' ? 'Google' : 'Email'}
                  </span>
                </div>
              )}

              {/* Info grid */}
              <div className="grid grid-cols-2 gap-3">
                <Card className="bg-secondary/30 border-border/50">
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground mb-1">Rol</p>
                    <Badge variant="outline" className={
                      detailUser.role === 'admin'
                        ? 'bg-purple-500/15 text-purple-400 border-purple-500/30'
                        : 'bg-violet-500/15 text-violet-400 border-violet-500/30'
                    }>
                      {detailUser.role === 'admin' && <Shield className="h-3 w-3 mr-1" />}
                      {detailUser.role === 'admin' ? 'Admin' : 'Usuario'}
                    </Badge>
                  </CardContent>
                </Card>
                <Card className="bg-secondary/30 border-border/50">
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground mb-1">Estado</p>
                    <Badge variant="outline" className={
                      detailUser.status === 'blocked'
                        ? 'bg-red-500/15 text-red-400 border-red-500/30'
                        : detailUser.status === 'suspended'
                        ? 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30'
                        : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                    }>
                      {detailUser.status === 'blocked' ? 'Bloqueado' : detailUser.status === 'suspended' ? 'Suspendido' : 'Activo'}
                    </Badge>
                  </CardContent>
                </Card>
                <Card className="bg-secondary/30 border-border/50">
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground mb-1">Plan</p>
                    <Badge variant="outline" className={getPlanBadge(detailUser).className}>
                      {getPlanBadge(detailUser).label}
                    </Badge>
                  </CardContent>
                </Card>
                <Card className="bg-secondary/30 border-border/50">
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground mb-1">Suscripcion</p>
                    <span className="text-sm font-medium text-foreground">
                      {detailUser.subscription
                        ? detailUser.subscription.status === 'active' ? 'Activa' : 'Inactiva'
                        : 'Sin suscripcion'}
                    </span>
                  </CardContent>
                </Card>
                <Card className="bg-secondary/30 border-border/50">
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground mb-1">Bots</p>
                    <div className="flex items-center gap-1.5">
                      <Bot className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-semibold text-foreground">{detailUser.bots_count}</span>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-secondary/30 border-border/50">
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground mb-1">Productos</p>
                    <div className="flex items-center gap-1.5">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-semibold text-foreground">{detailUser.products_count}</span>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-secondary/30 border-border/50">
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground mb-1">Tiendas</p>
                    <div className="flex items-center gap-1.5">
                      <Store className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-semibold text-foreground">{detailUser.stores_count}</span>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-secondary/30 border-border/50">
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground mb-1">Proveedor</p>
                    <div className="flex items-center gap-1.5">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-semibold text-foreground capitalize">{detailUser.login_provider}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Dates */}
              <div className="flex items-center gap-6 text-xs text-muted-foreground">
                <span>Registro: {new Date(detailUser.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                <span>Ultimo acceso: {relativeDate(detailUser.last_login_at)}</span>
              </div>

              {/* Quick actions */}
              <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setDetailOpen(false)
                    handleToggleActive(detailUser)
                  }}
                  className={detailUser.is_active ? 'text-yellow-400 hover:text-yellow-300' : 'text-emerald-400 hover:text-emerald-300'}
                >
                  {detailUser.is_active ? <UserX className="h-4 w-4 mr-1.5" /> : <UserCheck className="h-4 w-4 mr-1.5" />}
                  {detailUser.is_active ? 'Suspender' : 'Reactivar'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setDetailOpen(false)
                    openEdit(detailUser)
                  }}
                >
                  <Edit className="h-4 w-4 mr-1.5" />
                  Editar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setDetailOpen(false)
                    router.push(`/admin/bots?user=${detailUser.id}`)
                  }}
                >
                  <Bot className="h-4 w-4 mr-1.5" />
                  Ver Bots
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
