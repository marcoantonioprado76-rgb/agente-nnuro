'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
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
  Loader2, CheckCircle2, XCircle, Ban, RefreshCw, UserCircle,
  CreditCard, Search, Filter, MoreHorizontal, ArrowRightLeft,
  CalendarPlus, FileText, Power, Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import type { Subscription } from '@/types'

const statusBadge: Record<string, { label: string; className: string }> = {
  pending:    { label: 'Pendiente',  className: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30' },
  active:     { label: 'Activa',     className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  expired:    { label: 'Expirada',   className: 'bg-orange-500/15 text-orange-400 border-orange-500/30' },
  cancelled:  { label: 'Cancelada',  className: 'bg-red-500/15 text-red-400 border-red-500/30' },
  rejected:   { label: 'Rechazada',  className: 'bg-red-500/15 text-red-400 border-red-500/30' },
  suspended:  { label: 'Suspendida', className: 'bg-orange-500/15 text-orange-400 border-orange-500/30' },
}

const approvalBadge: Record<string, { label: string; className: string }> = {
  pending_review: { label: 'Por Revisar', className: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30' },
  approved:       { label: 'Aprobada',    className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  rejected:       { label: 'Rechazada',   className: 'bg-red-500/15 text-red-400 border-red-500/30' },
  suspended:      { label: 'Suspendida',  className: 'bg-orange-500/15 text-orange-400 border-orange-500/30' },
  cancelled:      { label: 'Cancelada',   className: 'bg-gray-500/15 text-gray-400 border-gray-500/30' },
}

interface PlanOption {
  id: string
  name: string
  price: string
}

export default function AdminSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [plans, setPlans] = useState<PlanOption[]>([])

  // Filters
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [approvalFilter, setApprovalFilter] = useState('all')
  const [planFilter, setPlanFilter] = useState('all')

  // Action dialog (for approve/reject/suspend/reactivate/cancel with notes)
  const [actionDialog, setActionDialog] = useState<{ sub: Subscription; action: string } | null>(null)
  const [adminNotes, setAdminNotes] = useState('')
  const [actionSaving, setActionSaving] = useState(false)

  // Change plan dialog
  const [changePlanDialog, setChangePlanDialog] = useState<Subscription | null>(null)
  const [selectedPlanId, setSelectedPlanId] = useState('')
  const [changePlanSaving, setChangePlanSaving] = useState(false)

  // Extend dialog
  const [extendDialog, setExtendDialog] = useState<Subscription | null>(null)
  const [extendDays, setExtendDays] = useState('30')
  const [extendSaving, setExtendSaving] = useState(false)

  const fetchSubs = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/subscriptions')
      if (res.ok) setSubscriptions(await res.json())
    } catch { /* silent */ } finally {
      setLoading(false)
    }
  }, [])

  const fetchPlans = useCallback(async () => {
    try {
      const res = await fetch('/api/plans')
      if (res.ok) {
        const data = await res.json()
        setPlans(data.map((p: Record<string, string>) => ({ id: p.id, name: p.name, price: p.price })))
      }
    } catch { /* silent */ }
  }, [])

  useEffect(() => { fetchSubs(); fetchPlans() }, [fetchSubs, fetchPlans])

  // Dynamic plan options for filter
  const planFilterOptions = useMemo(() => {
    const p = new Map<string, string>()
    subscriptions.forEach((sub) => {
      if (sub.plan?.name && sub.plan_id) p.set(sub.plan_id, sub.plan.name)
    })
    return Array.from(p, ([value, label]) => ({ value, label }))
  }, [subscriptions])

  const filtered = useMemo(() => {
    return subscriptions.filter((sub) => {
      if (search) {
        const q = search.toLowerCase()
        const name = (sub.profile?.full_name || '').toLowerCase()
        const email = (sub.profile?.email || '').toLowerCase()
        if (!name.includes(q) && !email.includes(q)) return false
      }
      if (statusFilter !== 'all' && sub.status !== statusFilter) return false
      if (approvalFilter !== 'all' && sub.approval_status !== approvalFilter) return false
      if (planFilter !== 'all' && sub.plan_id !== planFilter) return false
      return true
    })
  }, [subscriptions, search, statusFilter, approvalFilter, planFilter])

  // Generic action with notes
  const openActionDialog = (sub: Subscription, action: string) => {
    setActionDialog({ sub, action })
    setAdminNotes(sub.admin_notes || '')
  }

  const executeAction = async () => {
    if (!actionDialog) return
    setActionSaving(true)
    try {
      const res = await fetch(`/api/admin/subscriptions/${actionDialog.sub.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: actionDialog.action, admin_notes: adminNotes }),
      })
      if (res.ok) {
        const labels: Record<string, string> = {
          approve: 'Suscripcion aprobada', reject: 'Suscripcion rechazada',
          suspend: 'Suscripcion suspendida', reactivate: 'Suscripcion reactivada',
          cancel: 'Suscripcion cancelada',
        }
        toast.success(labels[actionDialog.action] || 'Accion completada')
        setActionDialog(null)
        setAdminNotes('')
        fetchSubs()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Error al ejecutar accion')
      }
    } catch {
      toast.error('Error de conexion')
    } finally {
      setActionSaving(false)
    }
  }

  // Change plan
  const openChangePlan = (sub: Subscription) => {
    setChangePlanDialog(sub)
    setSelectedPlanId(sub.plan_id || '')
  }

  const executeChangePlan = async () => {
    if (!changePlanDialog || !selectedPlanId) return
    setChangePlanSaving(true)
    try {
      const res = await fetch(`/api/admin/subscriptions/${changePlanDialog.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'change_plan', new_plan_id: selectedPlanId }),
      })
      if (res.ok) {
        toast.success('Plan cambiado exitosamente')
        setChangePlanDialog(null)
        fetchSubs()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Error al cambiar plan')
      }
    } catch {
      toast.error('Error de conexion')
    } finally {
      setChangePlanSaving(false)
    }
  }

  // Extend
  const openExtend = (sub: Subscription) => {
    setExtendDialog(sub)
    setExtendDays('30')
  }

  const executeExtend = async () => {
    if (!extendDialog) return
    setExtendSaving(true)
    try {
      const res = await fetch(`/api/admin/subscriptions/${extendDialog.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'extend', extend_days: extendDays }),
      })
      if (res.ok) {
        toast.success(`Suscripcion extendida ${extendDays} dias`)
        setExtendDialog(null)
        fetchSubs()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Error al extender')
      }
    } catch {
      toast.error('Error de conexion')
    } finally {
      setExtendSaving(false)
    }
  }

  const formatDate = (date?: string) => {
    if (!date) return 'N/A'
    return new Date(date).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  const actionDialogTitles: Record<string, { title: string; desc: string; color: string }> = {
    approve:    { title: 'Aprobar Suscripcion',    desc: 'Se activara la suscripcion y se aprobara el pago asociado.',     color: 'text-emerald-400' },
    reject:     { title: 'Rechazar Suscripcion',   desc: 'La suscripcion sera rechazada y el pago marcado como fallido.',   color: 'text-red-400' },
    suspend:    { title: 'Suspender Suscripcion',  desc: 'El usuario perdera acceso a las funciones del plan.',            color: 'text-orange-400' },
    reactivate: { title: 'Reactivar Suscripcion',  desc: 'Se restaurara el acceso del usuario a su plan.',                 color: 'text-emerald-400' },
    cancel:     { title: 'Cancelar Suscripcion',   desc: 'La suscripcion sera cancelada permanentemente.',                 color: 'text-red-400' },
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/10">
            <CreditCard className="h-5 w-5 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Suscripciones</h1>
            <p className="text-sm text-muted-foreground">
              Gestion de planes y aprobaciones
              {!loading && <span className="ml-2 text-xs text-muted-foreground/70">— {filtered.length} de {subscriptions.length}</span>}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={fetchSubs} disabled={loading} className="border-border/50 hover:bg-secondary/50">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {/* Filters */}
      <Card className="glow-card bg-gradient-card border-border/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Filtros</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar por nombre o email..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-secondary/30 border-border/50" />
            </div>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v || 'all')}>
              <SelectTrigger className="bg-secondary/30 border-border/50"><SelectValue placeholder="Estado" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="active">Activas</SelectItem>
                <SelectItem value="pending">Pendientes</SelectItem>
                <SelectItem value="expired">Expiradas</SelectItem>
                <SelectItem value="cancelled">Canceladas</SelectItem>
                <SelectItem value="suspended">Suspendidas</SelectItem>
              </SelectContent>
            </Select>
            <Select value={approvalFilter} onValueChange={(v) => setApprovalFilter(v || 'all')}>
              <SelectTrigger className="bg-secondary/30 border-border/50"><SelectValue placeholder="Aprobacion" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="approved">Aprobadas</SelectItem>
                <SelectItem value="pending_review">Pendientes</SelectItem>
                <SelectItem value="rejected">Rechazadas</SelectItem>
                <SelectItem value="suspended">Suspendidas</SelectItem>
              </SelectContent>
            </Select>
            <Select value={planFilter} onValueChange={(v) => setPlanFilter(v || 'all')}>
              <SelectTrigger className="bg-secondary/30 border-border/50"><SelectValue placeholder="Plan" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los planes</SelectItem>
                {planFilterOptions.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="glow-card bg-gradient-card border-border/50">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="rounded-xl overflow-hidden overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50 hover:bg-transparent">
                    <TableHead className="text-muted-foreground">Usuario</TableHead>
                    <TableHead className="text-muted-foreground">Plan</TableHead>
                    <TableHead className="text-muted-foreground">Estado</TableHead>
                    <TableHead className="text-muted-foreground">Aprobacion</TableHead>
                    <TableHead className="text-muted-foreground">Inicio</TableHead>
                    <TableHead className="text-muted-foreground">Fin</TableHead>
                    <TableHead className="text-muted-foreground">Notas</TableHead>
                    <TableHead className="text-muted-foreground text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((sub) => {
                    const s = statusBadge[sub.status] || statusBadge.pending
                    const a = approvalBadge[sub.approval_status] || approvalBadge.pending_review
                    const isLoading = actionLoading === sub.id

                    return (
                      <TableRow key={sub.id} className="border-border/50 hover:bg-secondary/30">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                              <UserCircle className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <span className="font-medium text-foreground text-sm block">{sub.profile?.full_name || 'Sin nombre'}</span>
                              <span className="text-xs text-muted-foreground">{sub.profile?.email || '—'}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-foreground">{sub.plan?.name || '—'}</span>
                            {sub.plan?.price !== undefined && (
                              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-xs">${sub.plan.price}</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell><Badge variant="outline" className={s.className}>{s.label}</Badge></TableCell>
                        <TableCell><Badge variant="outline" className={a.className}>{a.label}</Badge></TableCell>
                        <TableCell><span className="text-xs text-muted-foreground">{formatDate(sub.start_date || sub.created_at)}</span></TableCell>
                        <TableCell><span className="text-xs text-muted-foreground">{formatDate(sub.end_date)}</span></TableCell>
                        <TableCell>
                          {sub.admin_notes ? (
                            <span className="text-xs text-muted-foreground max-w-[120px] truncate block" title={sub.admin_notes}>
                              {sub.admin_notes}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground/40">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger>
                              <button className="inline-flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors">
                                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52">
                              {/* Aprobar */}
                              {sub.approval_status === 'pending_review' && (
                                <>
                                  <DropdownMenuItem onClick={() => openActionDialog(sub, 'approve')}>
                                    <CheckCircle2 className="h-4 w-4 mr-2 text-emerald-400" />
                                    <span className="text-emerald-400">Aprobar</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => openActionDialog(sub, 'reject')}>
                                    <XCircle className="h-4 w-4 mr-2 text-red-400" />
                                    <span className="text-red-400">Rechazar</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                </>
                              )}
                              {/* Suspender */}
                              {sub.approval_status === 'approved' && sub.status === 'active' && (
                                <DropdownMenuItem onClick={() => openActionDialog(sub, 'suspend')}>
                                  <Ban className="h-4 w-4 mr-2 text-orange-400" />
                                  <span className="text-orange-400">Suspender</span>
                                </DropdownMenuItem>
                              )}
                              {/* Reactivar */}
                              {(sub.approval_status === 'suspended' || sub.approval_status === 'rejected' || sub.status === 'cancelled') && (
                                <DropdownMenuItem onClick={() => openActionDialog(sub, 'reactivate')}>
                                  <Power className="h-4 w-4 mr-2 text-emerald-400" />
                                  <span className="text-emerald-400">Reactivar</span>
                                </DropdownMenuItem>
                              )}
                              {/* Cambiar plan */}
                              <DropdownMenuItem onClick={() => openChangePlan(sub)}>
                                <ArrowRightLeft className="h-4 w-4 mr-2" />
                                Cambiar Plan
                              </DropdownMenuItem>
                              {/* Extender */}
                              {(sub.status === 'active' || sub.status === 'expired') && (
                                <DropdownMenuItem onClick={() => openExtend(sub)}>
                                  <CalendarPlus className="h-4 w-4 mr-2" />
                                  Extender
                                </DropdownMenuItem>
                              )}
                              {/* Agregar notas */}
                              <DropdownMenuItem onClick={() => openActionDialog(sub, sub.status === 'active' ? 'approve' : sub.approval_status === 'pending_review' ? 'approve' : 'reactivate')}>
                                <FileText className="h-4 w-4 mr-2" />
                                Agregar Notas
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {/* Cancelar */}
                              {sub.status !== 'cancelled' && (
                                <DropdownMenuItem onClick={() => openActionDialog(sub, 'cancel')}>
                                  <Trash2 className="h-4 w-4 mr-2 text-red-400" />
                                  <span className="text-red-400">Cancelar</span>
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-12">
                        {subscriptions.length === 0 ? 'No hay suscripciones registradas' : 'No se encontraron suscripciones con los filtros aplicados'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Dialog (approve/reject/suspend/reactivate/cancel with notes) */}
      <Dialog open={!!actionDialog} onOpenChange={() => { setActionDialog(null); setAdminNotes('') }}>
        <DialogContent className="sm:max-w-md">
          {actionDialog && (
            <>
              <DialogHeader>
                <DialogTitle className={actionDialogTitles[actionDialog.action]?.color}>
                  {actionDialogTitles[actionDialog.action]?.title}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <p className="text-sm text-muted-foreground">
                  {actionDialogTitles[actionDialog.action]?.desc}
                </p>
                <div className="p-3 bg-secondary/30 rounded-lg space-y-1">
                  <p className="text-sm font-medium text-foreground">{actionDialog.sub.profile?.full_name || 'Sin nombre'}</p>
                  <p className="text-xs text-muted-foreground">{actionDialog.sub.profile?.email}</p>
                  <p className="text-xs text-muted-foreground">Plan: {actionDialog.sub.plan?.name || '—'}</p>
                </div>
                <div className="space-y-2">
                  <Label>Notas administrativas (opcional)</Label>
                  <textarea
                    className="w-full min-h-[80px] rounded-md border border-border/50 bg-secondary/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="Agregar una nota sobre esta accion..."
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setActionDialog(null); setAdminNotes('') }} disabled={actionSaving}>
                  Cancelar
                </Button>
                <Button onClick={executeAction} disabled={actionSaving} className={
                  actionDialog.action === 'approve' || actionDialog.action === 'reactivate'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : actionDialog.action === 'reject' || actionDialog.action === 'cancel'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-orange-600 hover:bg-orange-700'
                }>
                  {actionSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Confirmar
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Change Plan Dialog */}
      <Dialog open={!!changePlanDialog} onOpenChange={() => setChangePlanDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5 text-primary" />
              Cambiar Plan
            </DialogTitle>
          </DialogHeader>
          {changePlanDialog && (
            <div className="space-y-4 py-2">
              <div className="p-3 bg-secondary/30 rounded-lg">
                <p className="text-sm font-medium text-foreground">{changePlanDialog.profile?.full_name}</p>
                <p className="text-xs text-muted-foreground">Plan actual: {changePlanDialog.plan?.name || '—'}</p>
              </div>
              <div className="space-y-2">
                <Label>Nuevo Plan</Label>
                <Select value={selectedPlanId} onValueChange={(v) => setSelectedPlanId(v || '')}>
                  <SelectTrigger><SelectValue placeholder="Selecciona un plan" /></SelectTrigger>
                  <SelectContent>
                    {plans.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} — ${p.price}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setChangePlanDialog(null)} disabled={changePlanSaving}>Cancelar</Button>
            <Button onClick={executeChangePlan} disabled={changePlanSaving || !selectedPlanId || selectedPlanId === changePlanDialog?.plan_id}>
              {changePlanSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Cambiar Plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Extend Dialog */}
      <Dialog open={!!extendDialog} onOpenChange={() => setExtendDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarPlus className="h-5 w-5 text-primary" />
              Extender Suscripcion
            </DialogTitle>
          </DialogHeader>
          {extendDialog && (
            <div className="space-y-4 py-2">
              <div className="p-3 bg-secondary/30 rounded-lg">
                <p className="text-sm font-medium text-foreground">{extendDialog.profile?.full_name}</p>
                <p className="text-xs text-muted-foreground">Vencimiento actual: {formatDate(extendDialog.end_date)}</p>
              </div>
              <div className="space-y-2">
                <Label>Dias a extender</Label>
                <Input
                  type="number"
                  min="1"
                  max="365"
                  value={extendDays}
                  onChange={(e) => setExtendDays(e.target.value)}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setExtendDialog(null)} disabled={extendSaving}>Cancelar</Button>
            <Button onClick={executeExtend} disabled={extendSaving || !extendDays}>
              {extendSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Extender {extendDays} dias
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
