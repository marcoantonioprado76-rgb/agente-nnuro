'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Settings, CreditCard, Bot, MessageSquare, Smartphone, Loader2,
  Plus, Pencil, Trash2, Save, X, Package, DollarSign, Hash,
  AlertCircle, Check, Landmark, Zap, FileText,
} from 'lucide-react'
import { toast } from 'sonner'
import type { Plan } from '@/types'

interface PlanForm {
  name: string
  slug: string
  price: number
  currency: string
  max_bots: number
  max_products: number
  max_conversations: number
  max_whatsapp_numbers: number
  features: string[]
  is_active: boolean
  sort_order: number
  stripe_price_id: string
}

const emptyPlan: PlanForm = {
  name: '', slug: '', price: 0, currency: 'USD',
  max_bots: 1, max_products: 5, max_conversations: 1000, max_whatsapp_numbers: 1,
  features: [], is_active: true, sort_order: 1, stripe_price_id: '',
}

interface PaymentMethodsSettings {
  stripe: boolean
  transfer: boolean
}

export default function AdminSettingsPage() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Payment methods state
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodsSettings>({ stripe: true, transfer: true })
  const [savingPayments, setSavingPayments] = useState(false)

  // Plan dialog
  const [planDialog, setPlanDialog] = useState(false)
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null)
  const [planForm, setPlanForm] = useState<PlanForm>(emptyPlan)
  const [featureInput, setFeatureInput] = useState('')

  // Delete confirmation
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Inline editing for quick toggles
  const [togglingId, setTogglingId] = useState<string | null>(null)

  // Prompt templates
  const [templates, setTemplates] = useState<Array<{ id: string; name: string; description: string; system_prompt: string; category: string; is_active: boolean; sort_order: number }>>([])
  const [templateDialog, setTemplateDialog] = useState(false)
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null)
  const [templateForm, setTemplateForm] = useState({ name: '', description: '', system_prompt: '', category: 'general', is_active: true, sort_order: 1 })
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(null)

  const fetchPlans = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/plans')
      if (res.ok) setPlans(await res.json())
    } catch { /* silent */ } finally {
      setLoading(false)
    }
  }, [])

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/settings')
      if (res.ok) {
        const data = await res.json()
        if (data.payment_methods) setPaymentMethods(data.payment_methods)
      }
    } catch { /* silent */ }
  }, [])

  const handleSavePaymentMethods = async (updated: PaymentMethodsSettings) => {
    setSavingPayments(true)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'payment_methods', value: updated }),
      })
      if (res.ok) {
        toast.success('Métodos de pago actualizados')
        setPaymentMethods(updated)
      } else {
        toast.error('Error al guardar')
      }
    } catch {
      toast.error('Error de conexión')
    } finally {
      setSavingPayments(false)
    }
  }

  const togglePaymentMethod = (method: keyof PaymentMethodsSettings) => {
    const updated = { ...paymentMethods, [method]: !paymentMethods[method] }
    handleSavePaymentMethods(updated)
  }

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/prompt-templates')
      if (res.ok) setTemplates(await res.json())
    } catch { /* silent */ }
  }, [])

  const openCreateTemplate = () => {
    setEditingTemplateId(null)
    setTemplateForm({ name: '', description: '', system_prompt: '', category: 'general', is_active: true, sort_order: 1 })
    setTemplateDialog(true)
  }

  const openEditTemplate = (t: typeof templates[0]) => {
    setEditingTemplateId(t.id)
    setTemplateForm({ name: t.name, description: t.description, system_prompt: t.system_prompt, category: t.category, is_active: t.is_active, sort_order: t.sort_order })
    setTemplateDialog(true)
  }

  const handleSaveTemplate = async () => {
    if (!templateForm.name.trim() || !templateForm.system_prompt.trim()) { toast.error('Nombre y prompt son requeridos'); return }
    setSavingTemplate(true)
    try {
      const url = editingTemplateId ? `/api/admin/prompt-templates/${editingTemplateId}` : '/api/admin/prompt-templates'
      const res = await fetch(url, {
        method: editingTemplateId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templateForm),
      })
      if (res.ok) {
        toast.success(editingTemplateId ? 'Plantilla actualizada' : 'Plantilla creada')
        setTemplateDialog(false)
        fetchTemplates()
      } else { const d = await res.json(); toast.error(d.error || 'Error') }
    } catch { toast.error('Error de conexión') } finally { setSavingTemplate(false) }
  }

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('¿Eliminar esta plantilla?')) return
    setDeletingTemplateId(id)
    try {
      const res = await fetch(`/api/admin/prompt-templates/${id}`, { method: 'DELETE' })
      if (res.ok) { toast.success('Plantilla eliminada'); fetchTemplates() }
    } catch { /* silent */ } finally { setDeletingTemplateId(null) }
  }

  const handleToggleTemplate = async (t: typeof templates[0]) => {
    try {
      await fetch(`/api/admin/prompt-templates/${t.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !t.is_active }),
      })
      fetchTemplates()
      toast.success(t.is_active ? 'Plantilla desactivada' : 'Plantilla activada')
    } catch { /* silent */ }
  }

  useEffect(() => { fetchPlans(); fetchSettings(); fetchTemplates() }, [fetchPlans, fetchSettings, fetchTemplates])

  const openCreateDialog = () => {
    setEditingPlanId(null)
    setPlanForm(emptyPlan)
    setFeatureInput('')
    setPlanDialog(true)
  }

  const openEditDialog = (plan: Plan) => {
    setEditingPlanId(plan.id)
    setPlanForm({
      name: plan.name,
      slug: plan.slug,
      price: Number(plan.price),
      currency: plan.currency,
      max_bots: plan.max_bots,
      max_products: plan.max_products,
      max_conversations: plan.max_conversations,
      max_whatsapp_numbers: plan.max_whatsapp_numbers,
      features: plan.features || [],
      is_active: plan.is_active,
      sort_order: plan.sort_order,
      stripe_price_id: plan.stripe_price_id || '',
    })
    setFeatureInput('')
    setPlanDialog(true)
  }

  const handleSavePlan = async () => {
    if (!planForm.name.trim()) return toast.error('El nombre es requerido')
    if (!planForm.slug.trim()) return toast.error('El slug es requerido')

    setSaving(true)
    try {
      const url = editingPlanId
        ? `/api/admin/plans/${editingPlanId}`
        : '/api/admin/plans'

      const res = await fetch(url, {
        method: editingPlanId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...planForm,
          price: Number(planForm.price),
          max_bots: Number(planForm.max_bots),
          max_products: Number(planForm.max_products),
          max_conversations: Number(planForm.max_conversations),
          max_whatsapp_numbers: Number(planForm.max_whatsapp_numbers),
          sort_order: Number(planForm.sort_order),
          stripe_price_id: planForm.stripe_price_id || null,
        }),
      })

      if (res.ok) {
        toast.success(editingPlanId ? 'Plan actualizado' : 'Plan creado')
        setPlanDialog(false)
        fetchPlans()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Error al guardar')
      }
    } catch {
      toast.error('Error de conexion')
    } finally {
      setSaving(false)
    }
  }

  const handleDeletePlan = async () => {
    if (!deleteId) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/plans/${deleteId}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Plan eliminado')
        setDeleteId(null)
        fetchPlans()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Error al eliminar')
      }
    } catch {
      toast.error('Error de conexion')
    } finally {
      setDeleting(false)
    }
  }

  const handleToggleActive = async (plan: Plan) => {
    setTogglingId(plan.id)
    try {
      const res = await fetch(`/api/admin/plans/${plan.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !plan.is_active }),
      })
      if (res.ok) {
        toast.success(plan.is_active ? 'Plan desactivado' : 'Plan activado')
        fetchPlans()
      }
    } catch { /* silent */ } finally {
      setTogglingId(null)
    }
  }

  const addFeature = () => {
    if (!featureInput.trim()) return
    setPlanForm(prev => ({ ...prev, features: [...prev.features, featureInput.trim()] }))
    setFeatureInput('')
  }

  const removeFeature = (index: number) => {
    setPlanForm(prev => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index),
    }))
  }

  const updateField = (field: keyof PlanForm, value: unknown) => {
    setPlanForm(prev => ({ ...prev, [field]: value }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Cargando configuracion...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-5 md:space-y-8">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 shrink-0">
            <Settings className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground tracking-tight">Configuracion General</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Administra planes, limites y configuraciones del sistema
            </p>
          </div>
        </div>
      </div>

      {/* MÉTODOS DE PAGO */}
      <Card className="glow-card bg-gradient-card border-border/50">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-foreground">
            <CreditCard className="h-5 w-5 text-primary" />
            Métodos de Pago
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Activa o desactiva los métodos de pago disponibles para los usuarios. Los cambios aplican de inmediato.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Stripe */}
          <div className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-secondary/20">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10">
                <Zap className="h-5 w-5 text-violet-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Stripe — Tarjeta de crédito/débito</p>
                <p className="text-xs text-muted-foreground">Pago automático e inmediato. No requiere aprobación del admin.</p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {savingPayments && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              <Badge variant="outline" className={paymentMethods.stripe
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                : 'bg-red-500/15 text-red-400 border-red-500/30'
              }>
                {paymentMethods.stripe ? 'Activo' : 'Inactivo'}
              </Badge>
              <Switch
                checked={paymentMethods.stripe}
                onCheckedChange={() => togglePaymentMethod('stripe')}
                disabled={savingPayments}
              />
            </div>
          </div>

          {/* Transferencia */}
          <div className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-secondary/20">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10">
                <Landmark className="h-5 w-5 text-cyan-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Transferencia / Comprobante</p>
                <p className="text-xs text-muted-foreground">Pago manual. El admin debe aprobar el comprobante antes de activar.</p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {savingPayments && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              <Badge variant="outline" className={paymentMethods.transfer
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                : 'bg-red-500/15 text-red-400 border-red-500/30'
              }>
                {paymentMethods.transfer ? 'Activo' : 'Inactivo'}
              </Badge>
              <Switch
                checked={paymentMethods.transfer}
                onCheckedChange={() => togglePaymentMethod('transfer')}
                disabled={savingPayments}
              />
            </div>
          </div>

          {/* Warning si ambos desactivados */}
          {!paymentMethods.stripe && !paymentMethods.transfer && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
              <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
              <p className="text-xs text-red-400">
                Todos los métodos de pago están desactivados. Los usuarios no podrán suscribirse.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* PLANES */}
      <Card className="glow-card bg-gradient-card border-border/50">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-foreground">
              <CreditCard className="h-5 w-5 text-primary" />
              Planes de Suscripcion
            </CardTitle>
            <Button onClick={openCreateDialog} size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              Nuevo Plan
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Los cambios en los planes se aplican a nuevas suscripciones. Los usuarios existentes mantienen los limites de su plan actual.
          </p>
        </CardHeader>
        <CardContent>
          {plans.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <CreditCard className="h-10 w-10 text-muted-foreground/50 mx-auto" />
              <p className="text-muted-foreground">No hay planes configurados</p>
              <Button onClick={openCreateDialog} variant="outline" size="sm" className="gap-1.5">
                <Plus className="h-4 w-4" /> Crear primer plan
              </Button>
            </div>
          ) : (
            <div className="rounded-xl border border-border/50 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50 hover:bg-transparent">
                    <TableHead className="text-muted-foreground">Plan</TableHead>
                    <TableHead className="text-muted-foreground">Precio</TableHead>
                    <TableHead className="text-muted-foreground text-center">
                      <div className="flex items-center justify-center gap-1"><Bot className="h-3.5 w-3.5" /> Bots</div>
                    </TableHead>
                    <TableHead className="text-muted-foreground text-center">
                      <div className="flex items-center justify-center gap-1"><Package className="h-3.5 w-3.5" /> Productos</div>
                    </TableHead>
                    <TableHead className="text-muted-foreground text-center">
                      <div className="flex items-center justify-center gap-1"><MessageSquare className="h-3.5 w-3.5" /> Conv.</div>
                    </TableHead>
                    <TableHead className="text-muted-foreground text-center">
                      <div className="flex items-center justify-center gap-1"><Smartphone className="h-3.5 w-3.5" /> WA</div>
                    </TableHead>
                    <TableHead className="text-muted-foreground text-center">Estado</TableHead>
                    <TableHead className="text-muted-foreground text-center">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plans.map((plan) => (
                    <TableRow key={plan.id} className="border-border/50 hover:bg-secondary/30">
                      <TableCell>
                        <div>
                          <span className="font-semibold text-foreground">{plan.name}</span>
                          <p className="text-[11px] text-muted-foreground font-mono">{plan.slug}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-foreground font-bold">
                          ${Number(plan.price).toLocaleString()}
                        </span>
                        <span className="text-xs text-muted-foreground ml-1">{plan.currency}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="bg-cyan-500/15 text-cyan-400 border-cyan-500/30">{plan.max_bots}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="bg-violet-500/15 text-violet-400 border-violet-500/30">{plan.max_products}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="bg-violet-500/15 text-violet-400 border-violet-500/30">
                          {plan.max_conversations === -1 ? 'Ilimitado' : plan.max_conversations}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="bg-amber-500/15 text-amber-400 border-amber-500/30">{plan.max_whatsapp_numbers}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <button
                          onClick={() => handleToggleActive(plan)}
                          disabled={togglingId === plan.id}
                          className="cursor-pointer"
                        >
                          {togglingId === plan.id ? (
                            <Loader2 className="h-4 w-4 animate-spin mx-auto text-muted-foreground" />
                          ) : (
                            <Badge
                              variant="outline"
                              className={plan.is_active
                                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                : 'bg-red-500/15 text-red-400 border-red-500/30'
                              }
                            >
                              {plan.is_active ? 'Activo' : 'Inactivo'}
                            </Badge>
                          )}
                        </button>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => openEditDialog(plan)}
                            className="p-1.5 rounded-lg hover:bg-secondary/50 text-muted-foreground hover:text-foreground transition-colors"
                            title="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeleteId(plan.id)}
                            className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* FEATURES POR PLAN */}
      {plans.filter(p => p.features && p.features.length > 0).length > 0 && (
        <Card className="glow-card bg-gradient-card border-border/50">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Check className="h-5 w-5 text-primary" />
              Caracteristicas por Plan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {plans.filter(p => p.is_active).map((plan) => (
                <div key={plan.id} className="rounded-xl border border-border/50 bg-secondary/20 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-foreground">{plan.name}</h3>
                    <span className="text-sm font-bold text-primary">${Number(plan.price).toLocaleString()}</span>
                  </div>
                  <ul className="space-y-1.5">
                    {(plan.features || []).map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <Check className="h-3.5 w-3.5 text-emerald-400 mt-0.5 shrink-0" />
                        <span className="text-muted-foreground">{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ===== DIALOG: CREAR/EDITAR PLAN ===== */}
      <Dialog open={planDialog} onOpenChange={setPlanDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingPlanId ? <Pencil className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
              {editingPlanId ? 'Editar Plan' : 'Crear Nuevo Plan'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Name & Slug */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Nombre *</Label>
                <Input
                  value={planForm.name}
                  onChange={(e) => {
                    updateField('name', e.target.value)
                    if (!editingPlanId) {
                      updateField('slug', e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''))
                    }
                  }}
                  placeholder="Pack Basico"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Slug *</Label>
                <Input
                  value={planForm.slug}
                  onChange={(e) => updateField('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  placeholder="pack-basico"
                />
              </div>
            </div>

            {/* Price & Currency */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <DollarSign className="h-3 w-3" /> Precio
                </Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={planForm.price}
                  onChange={(e) => updateField('price', parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Moneda</Label>
                <Input
                  value={planForm.currency}
                  onChange={(e) => updateField('currency', e.target.value.toUpperCase())}
                  placeholder="USD"
                  maxLength={3}
                />
              </div>
            </div>

            {/* Limits */}
            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">Limites del Plan</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-center gap-2 p-3 rounded-lg border border-border/50 bg-secondary/20">
                  <Bot className="h-4 w-4 text-cyan-400 shrink-0" />
                  <div className="flex-1">
                    <p className="text-[10px] text-muted-foreground">Bots</p>
                    <Input
                      type="number" min="1"
                      value={planForm.max_bots}
                      onChange={(e) => updateField('max_bots', parseInt(e.target.value) || 1)}
                      className="h-8 mt-0.5 text-sm"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 rounded-lg border border-border/50 bg-secondary/20">
                  <Package className="h-4 w-4 text-violet-400 shrink-0" />
                  <div className="flex-1">
                    <p className="text-[10px] text-muted-foreground">Productos</p>
                    <Input
                      type="number" min="1"
                      value={planForm.max_products}
                      onChange={(e) => updateField('max_products', parseInt(e.target.value) || 1)}
                      className="h-8 mt-0.5 text-sm"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 rounded-lg border border-border/50 bg-secondary/20">
                  <MessageSquare className="h-4 w-4 text-violet-400 shrink-0" />
                  <div className="flex-1">
                    <p className="text-[10px] text-muted-foreground">Conversaciones</p>
                    <Input
                      type="number" min="-1"
                      value={planForm.max_conversations}
                      onChange={(e) => updateField('max_conversations', parseInt(e.target.value) || 0)}
                      className="h-8 mt-0.5 text-sm"
                    />
                    <p className="text-[9px] text-muted-foreground mt-0.5">-1 = ilimitado</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 rounded-lg border border-border/50 bg-secondary/20">
                  <Smartphone className="h-4 w-4 text-amber-400 shrink-0" />
                  <div className="flex-1">
                    <p className="text-[10px] text-muted-foreground">WhatsApp</p>
                    <Input
                      type="number" min="1"
                      value={planForm.max_whatsapp_numbers}
                      onChange={(e) => updateField('max_whatsapp_numbers', parseInt(e.target.value) || 1)}
                      className="h-8 mt-0.5 text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Features */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Caracteristicas del plan</Label>
              <div className="flex gap-2">
                <Input
                  value={featureInput}
                  onChange={(e) => setFeatureInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addFeature())}
                  placeholder="Ej: Soporte prioritario"
                  className="flex-1"
                />
                <Button type="button" onClick={addFeature} size="sm" variant="outline" className="shrink-0">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {planForm.features.length > 0 && (
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {planForm.features.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary/30 text-sm">
                      <Check className="h-3 w-3 text-emerald-400 shrink-0" />
                      <span className="flex-1 text-foreground">{f}</span>
                      <button onClick={() => removeFeature(i)} className="text-muted-foreground hover:text-red-400">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sort order & Stripe */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Hash className="h-3 w-3" /> Orden
                </Label>
                <Input
                  type="number" min="1"
                  value={planForm.sort_order}
                  onChange={(e) => updateField('sort_order', parseInt(e.target.value) || 1)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Stripe Price ID</Label>
                <Input
                  value={planForm.stripe_price_id}
                  onChange={(e) => updateField('stripe_price_id', e.target.value)}
                  placeholder="price_xxx (opcional)"
                />
              </div>
            </div>

            {/* Active toggle */}
            <div className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-secondary/20">
              <div>
                <p className="text-sm font-medium text-foreground">Plan activo</p>
                <p className="text-xs text-muted-foreground">Los planes activos aparecen en la pagina de precios</p>
              </div>
              <Switch
                checked={planForm.is_active}
                onCheckedChange={(v) => updateField('is_active', v)}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => setPlanDialog(false)} className="flex-1" disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSavePlan} className="flex-1 gap-1.5" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {editingPlanId ? 'Guardar Cambios' : 'Crear Plan'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ===== PLANTILLAS DE PROMPT ===== */}
      <Card className="glow-card bg-gradient-card border-border/50">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-foreground">
              <FileText className="h-5 w-5 text-[#EC4899]" />
              Plantillas de Prompt
            </CardTitle>
            <Button onClick={openCreateTemplate} size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              Nueva Plantilla
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Los usuarios pueden seleccionar estas plantillas al configurar su bot.
          </p>
        </CardHeader>
        <CardContent>
          {templates.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <FileText className="h-10 w-10 text-muted-foreground/50 mx-auto" />
              <p className="text-muted-foreground">No hay plantillas creadas</p>
              <Button onClick={openCreateTemplate} variant="outline" size="sm" className="gap-1.5">
                <Plus className="h-4 w-4" /> Crear primera plantilla
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {templates.map((t) => (
                <div key={t.id} className="flex items-start gap-4 p-4 rounded-xl border border-border/50 bg-secondary/20">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EC4899]/10 border border-[#EC4899]/15 shrink-0">
                    <FileText className="h-5 w-5 text-[#EC4899]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-foreground text-sm">{t.name}</p>
                      <Badge variant="outline" className={t.is_active
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px]'
                        : 'bg-red-500/15 text-red-400 border-red-500/30 text-[10px]'
                      }>
                        {t.is_active ? 'Activa' : 'Inactiva'}
                      </Badge>
                      {t.category !== 'general' && (
                        <Badge variant="outline" className="text-[10px]">{t.category}</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1">{t.description || 'Sin descripcion'}</p>
                    <p className="text-[10px] text-muted-foreground/40 mt-1 font-mono">{t.system_prompt.length} caracteres</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => handleToggleTemplate(t)} className="p-1.5 rounded-lg hover:bg-secondary/50 text-muted-foreground hover:text-foreground transition-colors" title={t.is_active ? 'Desactivar' : 'Activar'}>
                      <Badge variant="outline" className={`cursor-pointer text-[10px] ${t.is_active ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-red-500/15 text-red-400 border-red-500/30'}`}>
                        {t.is_active ? 'On' : 'Off'}
                      </Badge>
                    </button>
                    <button onClick={() => openEditTemplate(t)} className="p-1.5 rounded-lg hover:bg-secondary/50 text-muted-foreground hover:text-foreground transition-colors" title="Editar">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleDeleteTemplate(t.id)} disabled={deletingTemplateId === t.id} className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors" title="Eliminar">
                      {deletingTemplateId === t.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ===== DIALOG: CREAR/EDITAR PLANTILLA ===== */}
      <Dialog open={templateDialog} onOpenChange={setTemplateDialog}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingTemplateId ? <Pencil className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
              {editingTemplateId ? 'Editar Plantilla' : 'Nueva Plantilla'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Nombre *</Label>
                <Input value={templateForm.name} onChange={(e) => setTemplateForm(f => ({ ...f, name: e.target.value }))} placeholder="Ej: Vendedor Agresivo" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Categoria</Label>
                <Input value={templateForm.category} onChange={(e) => setTemplateForm(f => ({ ...f, category: e.target.value }))} placeholder="general" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Descripcion</Label>
              <Input value={templateForm.description} onChange={(e) => setTemplateForm(f => ({ ...f, description: e.target.value }))} placeholder="Breve descripcion de la plantilla..." />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">System Prompt *</Label>
                <span className="text-[10px] text-muted-foreground/40 font-mono">{templateForm.system_prompt.length} chars</span>
              </div>
              <textarea
                value={templateForm.system_prompt}
                onChange={(e) => setTemplateForm(f => ({ ...f, system_prompt: e.target.value }))}
                placeholder="Define el comportamiento del bot..."
                rows={15}
                className="w-full rounded-xl px-4 py-3 text-[13px] leading-relaxed text-foreground bg-secondary/30 border border-border/50 focus:outline-none focus:ring-1 focus:ring-primary/30 resize-y min-h-[300px]"
              />
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-secondary/20">
              <div>
                <p className="text-sm font-medium text-foreground">Plantilla activa</p>
                <p className="text-xs text-muted-foreground">Las plantillas activas aparecen para los usuarios</p>
              </div>
              <Switch checked={templateForm.is_active} onCheckedChange={(v) => setTemplateForm(f => ({ ...f, is_active: v }))} />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => setTemplateDialog(false)} className="flex-1" disabled={savingTemplate}>Cancelar</Button>
            <Button onClick={handleSaveTemplate} className="flex-1 gap-1.5" disabled={savingTemplate}>
              {savingTemplate ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {editingTemplateId ? 'Guardar' : 'Crear'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ===== DIALOG: CONFIRMAR ELIMINACION ===== */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <AlertCircle className="h-5 w-5" />
              Eliminar Plan
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Esta accion no se puede deshacer. Si el plan tiene suscripciones activas, no podra ser eliminado.
          </p>
          <p className="text-xs text-muted-foreground">
            Considera desactivar el plan en lugar de eliminarlo.
          </p>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => setDeleteId(null)} className="flex-1" disabled={deleting}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeletePlan} className="flex-1 gap-1.5" disabled={deleting}>
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Eliminar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
