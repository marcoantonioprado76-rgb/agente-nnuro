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
  Loader2, UserCircle, Banknote, CheckCircle2, XCircle, RefreshCw,
  Search, Eye, X,
} from 'lucide-react'
import { toast } from 'sonner'
import type { Payment } from '@/types'

const paymentStatusBadge: Record<string, { label: string; className: string }> = {
  pending:   { label: 'Pendiente',    className: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30' },
  completed: { label: 'Completado',   className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  failed:    { label: 'Fallido',      className: 'bg-red-500/15 text-red-400 border-red-500/30' },
  refunded:  { label: 'Reembolsado',  className: 'bg-gray-500/15 text-gray-400 border-gray-500/30' },
}

const methodLabels: Record<string, string> = {
  transfer: 'Transferencia',
  card: 'Tarjeta',
  cash: 'Efectivo',
  paypal: 'PayPal',
  stripe: 'Stripe',
  oxxo: 'OXXO',
}

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [proofViewUrl, setProofViewUrl] = useState<string | null>(null)

  // Payment action dialog with notes
  const [payActionDialog, setPayActionDialog] = useState<{ pay: Payment; action: 'approve' | 'reject' } | null>(null)
  const [payNotes, setPayNotes] = useState('')
  const [payActionSaving, setPayActionSaving] = useState(false)
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterMethod, setFilterMethod] = useState('all')

  const fetchPayments = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/payments')
      if (res.ok) setPayments(await res.json())
    } catch { /* silent */ } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchPayments() }, [fetchPayments])

  // Derive unique payment methods from data
  const methodOptions = useMemo(() => {
    const methods = new Set<string>()
    payments.forEach((p) => {
      if (p.payment_method) methods.add(p.payment_method)
    })
    return Array.from(methods).sort()
  }, [payments])

  // Client-side filtering
  const filteredPayments = useMemo(() => {
    const q = search.toLowerCase().trim()
    return payments.filter((pay) => {
      // Search filter
      if (q) {
        const name = (pay.profile?.full_name || '').toLowerCase()
        const email = (pay.profile?.email || '').toLowerCase()
        const txId = (pay.transaction_id || '').toLowerCase()
        if (!name.includes(q) && !email.includes(q) && !txId.includes(q)) return false
      }
      // Status filter
      if (filterStatus !== 'all' && pay.payment_status !== filterStatus) return false
      // Method filter
      if (filterMethod !== 'all' && pay.payment_method !== filterMethod) return false
      return true
    })
  }, [payments, search, filterStatus, filterMethod])

  const openPayAction = (pay: Payment, action: 'approve' | 'reject') => {
    setPayActionDialog({ pay, action })
    setPayNotes(pay.admin_notes || '')
  }

  const executePayAction = async () => {
    if (!payActionDialog) return
    setPayActionSaving(true)
    try {
      const res = await fetch(`/api/admin/payments/${payActionDialog.pay.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: payActionDialog.action, admin_notes: payNotes }),
      })
      if (res.ok) {
        toast.success(payActionDialog.action === 'approve' ? 'Pago aprobado correctamente' : 'Pago rechazado')
        setPayActionDialog(null)
        setPayNotes('')
        fetchPayments()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Error al procesar accion')
      }
    } catch { toast.error('Error de conexion') } finally { setPayActionSaving(false) }
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
            <Banknote className="h-5 w-5 text-green-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Pagos</h1>
            <p className="text-sm text-muted-foreground">
              Pagos y comprobantes de la plataforma &middot; {payments.length} total{payments.length !== 1 ? 'es' : ''}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchPayments}
          disabled={loading}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {/* Filters */}
      <Card className="glow-card bg-gradient-card border-border/50">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[160px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, email o ID de transacción..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v || 'all')}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="completed">Completados</SelectItem>
                <SelectItem value="pending">Pendientes</SelectItem>
                <SelectItem value="failed">Fallidos</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterMethod} onValueChange={(v) => setFilterMethod(v || 'all')}>
              <SelectTrigger className="w-[170px]">
                <SelectValue placeholder="Método" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {methodOptions.map((method) => (
                  <SelectItem key={method} value={method}>
                    {methodLabels[method] || method}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(search || filterStatus !== 'all' || filterMethod !== 'all') && (
              <span className="text-xs text-muted-foreground ml-auto">
                {filteredPayments.length} resultado{filteredPayments.length !== 1 ? 's' : ''}
              </span>
            )}
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
                    <TableHead className="text-muted-foreground">Plan / Concepto</TableHead>
                    <TableHead className="text-muted-foreground">Monto</TableHead>
                    <TableHead className="text-muted-foreground">Método de Pago</TableHead>
                    <TableHead className="text-muted-foreground">Comprobante</TableHead>
                    <TableHead className="text-muted-foreground">Estado</TableHead>
                    <TableHead className="text-muted-foreground">Fecha</TableHead>
                    <TableHead className="text-muted-foreground text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.map((pay) => {
                    const s = paymentStatusBadge[pay.payment_status] || paymentStatusBadge.pending
                    return (
                      <TableRow key={pay.id} className="border-border/50 hover:bg-secondary/30">
                        {/* Usuario */}
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                              <UserCircle className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <span className="font-medium text-foreground text-sm block">
                                {pay.profile?.full_name || 'Sin nombre'}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {pay.profile?.email || '—'}
                              </span>
                            </div>
                          </div>
                        </TableCell>

                        {/* Plan / Concepto */}
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {pay.notes || '—'}
                          </span>
                        </TableCell>

                        {/* Monto */}
                        <TableCell>
                          <span className="text-sm font-semibold text-foreground">
                            ${pay.amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })} {pay.currency?.toUpperCase()}
                          </span>
                        </TableCell>

                        {/* Método de Pago */}
                        <TableCell>
                          <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-xs">
                            {methodLabels[pay.payment_method || ''] || pay.payment_method || '—'}
                          </Badge>
                        </TableCell>

                        {/* Comprobante */}
                        <TableCell>
                          {pay.payment_proof_url ? (
                            <button
                              onClick={() => setProofViewUrl(pay.payment_proof_url || null)}
                              className="group relative rounded-lg overflow-hidden border border-border/50 hover:border-primary/50 transition-all"
                            >
                              <img
                                src={pay.payment_proof_url}
                                alt="Comprobante"
                                className="w-16 h-16 object-cover"
                              />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center">
                                <Eye className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                            </button>
                          ) : (
                            <span className="text-xs text-muted-foreground">Sin comprobante</span>
                          )}
                        </TableCell>

                        {/* Estado */}
                        <TableCell>
                          <Badge variant="outline" className={s.className}>
                            {s.label}
                          </Badge>
                        </TableCell>

                        {/* Fecha */}
                        <TableCell>
                          <span className="text-xs text-muted-foreground">
                            {new Date(pay.created_at).toLocaleDateString('es-MX', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        </TableCell>

                        {/* Acciones */}
                        <TableCell className="text-right">
                          {pay.payment_status === 'pending' && (
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openPayAction(pay, 'approve')}
                                disabled={actionLoading === pay.id}
                                className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                              >
                                {actionLoading === pay.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                )}
                                <span className="ml-1">Aprobar</span>
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openPayAction(pay, 'reject')}
                                disabled={actionLoading === pay.id}
                                className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                              >
                                <XCircle className="h-3.5 w-3.5" />
                                <span className="ml-1">Rechazar</span>
                              </Button>
                            </div>
                          )}
                          {pay.payment_status === 'completed' && (
                            <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Aprobado
                            </span>
                          )}
                          {pay.payment_status === 'failed' && (
                            <span className="inline-flex items-center gap-1.5 text-xs text-red-400 font-medium">
                              <XCircle className="h-3.5 w-3.5" />
                              Rechazado
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  {filteredPayments.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-16">
                        <div className="flex flex-col items-center gap-2">
                          <Banknote className="h-8 w-8 text-muted-foreground/50" />
                          <span>
                            {payments.length === 0
                              ? 'No hay pagos registrados'
                              : 'No se encontraron pagos con los filtros aplicados'}
                          </span>
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

      {/* Payment Action Dialog with Notes */}
      <Dialog open={!!payActionDialog} onOpenChange={() => { setPayActionDialog(null); setPayNotes('') }}>
        <DialogContent className="sm:max-w-md">
          {payActionDialog && (
            <>
              <DialogHeader>
                <DialogTitle className={payActionDialog.action === 'approve' ? 'text-emerald-400' : 'text-red-400'}>
                  {payActionDialog.action === 'approve' ? 'Aprobar Pago' : 'Rechazar Pago'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="p-3 bg-secondary/30 rounded-lg space-y-1">
                  <p className="text-sm font-medium text-foreground">{payActionDialog.pay.profile?.full_name || 'Sin nombre'}</p>
                  <p className="text-xs text-muted-foreground">{payActionDialog.pay.profile?.email}</p>
                  <p className="text-sm font-semibold text-foreground mt-1">
                    ${payActionDialog.pay.amount?.toLocaleString('es-MX', { minimumFractionDigits: 2 })} {payActionDialog.pay.currency?.toUpperCase()}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Notas administrativas (opcional)</Label>
                  <textarea
                    className="w-full min-h-[80px] rounded-md border border-border/50 bg-secondary/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="Agregar una nota sobre este pago..."
                    value={payNotes}
                    onChange={(e) => setPayNotes(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setPayActionDialog(null); setPayNotes('') }} disabled={payActionSaving}>
                  Cancelar
                </Button>
                <Button
                  onClick={executePayAction}
                  disabled={payActionSaving}
                  className={payActionDialog.action === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}
                >
                  {payActionSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {payActionDialog.action === 'approve' ? 'Aprobar Pago' : 'Rechazar Pago'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Proof Image Viewer Dialog */}
      <Dialog open={!!proofViewUrl} onOpenChange={() => setProofViewUrl(null)}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden bg-black/95 border-border/30">
          <div className="relative">
            <button
              onClick={() => setProofViewUrl(null)}
              className="absolute top-3 right-3 z-10 bg-black/70 hover:bg-red-500 text-white rounded-full p-1.5 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
            {proofViewUrl && (
              <img
                src={proofViewUrl}
                alt="Comprobante de pago"
                className="w-full max-h-[80vh] object-contain"
              />
            )}
            <div className="p-3 bg-black/80 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Comprobante de pago</span>
              <a
                href={proofViewUrl || ''}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline"
              >
                Abrir en nueva pestaña
              </a>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
