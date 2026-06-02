'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Package, Loader2, Plus, Pencil, Trash2, X, Sparkles, Crown, CheckCircle2, Zap, Tag, ToggleLeft, ToggleRight,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'

interface PlanRow {
  id: string
  name: string
  slug: string
  description: string | null
  monthly_price: number | null
  quarterly_price: number | null
  annual_price: number | null
  quarterly_full_price: number | null
  annual_full_price: number | null
  quarterly_discount_amount: number | null
  annual_discount_amount: number | null
  included_monthly_ai_credits: number
  included_monthly_ai_budget_usd: number
  credit_usd_conversion_rate: number
  max_ai_agents: number | null
  max_virtual_stores: number
  max_monthly_contacts: number
  max_monthly_conversations: number | null
  max_team_members: number
  features: string[] | null
  is_active: boolean
  is_featured: boolean
  sort_order: number
  promotion_label: string | null
  promotion_start_date: string | null
  promotion_end_date: string | null
  is_promotion_active: boolean
  show_nuro_branding: boolean
  trial_duration_days: number | null
  stripe_price_id: string | null
  stripe_quarterly_price_id: string | null
  stripe_annual_price_id: string | null
  currency: string
}

interface PlanForm {
  name: string
  slug: string
  description: string
  monthly_price: number
  quarterly_price: number | null
  annual_price: number | null
  quarterly_full_price: number | null
  annual_full_price: number | null
  quarterly_discount_amount: number | null
  annual_discount_amount: number | null
  included_monthly_ai_credits: number
  included_monthly_ai_budget_usd: number
  credit_usd_conversion_rate: number
  max_ai_agents: number | null
  max_virtual_stores: number
  max_monthly_contacts: number
  max_monthly_conversations: number | null
  max_team_members: number
  features: string[]
  is_active: boolean
  is_featured: boolean
  sort_order: number
  promotion_label: string
  is_promotion_active: boolean
  show_nuro_branding: boolean
  trial_duration_days: number | null
  currency: string
  stripe_price_id: string
  stripe_quarterly_price_id: string
  stripe_annual_price_id: string
}

const emptyForm: PlanForm = {
  name: '', slug: '', description: '',
  monthly_price: 0, quarterly_price: null, annual_price: null,
  quarterly_full_price: null, annual_full_price: null,
  quarterly_discount_amount: null, annual_discount_amount: null,
  included_monthly_ai_credits: 0, included_monthly_ai_budget_usd: 0, credit_usd_conversion_rate: 100,
  max_ai_agents: 1, max_virtual_stores: 1, max_monthly_contacts: 0, max_monthly_conversations: 1000, max_team_members: 1,
  features: [], is_active: true, is_featured: false, sort_order: 1,
  promotion_label: '', is_promotion_active: false,
  show_nuro_branding: true, trial_duration_days: null,
  currency: 'USD',
  stripe_price_id: '', stripe_quarterly_price_id: '', stripe_annual_price_id: '',
}

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<PlanRow[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<PlanForm>(emptyForm)
  const [featureInput, setFeatureInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const fetchPlans = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/plans')
      if (res.ok) setPlans(await res.json())
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchPlans() }, [fetchPlans])

  const totals = useMemo(() => ({
    total: plans.length,
    active: plans.filter(p => p.is_active).length,
    promo: plans.filter(p => p.is_promotion_active).length,
  }), [plans])

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm)
    setFeatureInput('')
    setDialogOpen(true)
  }

  const openEdit = (p: PlanRow) => {
    setEditingId(p.id)
    setForm({
      name: p.name,
      slug: p.slug,
      description: p.description ?? '',
      monthly_price: Number(p.monthly_price ?? 0),
      quarterly_price: p.quarterly_price !== null ? Number(p.quarterly_price) : null,
      annual_price: p.annual_price !== null ? Number(p.annual_price) : null,
      quarterly_full_price: p.quarterly_full_price !== null ? Number(p.quarterly_full_price) : null,
      annual_full_price: p.annual_full_price !== null ? Number(p.annual_full_price) : null,
      quarterly_discount_amount: p.quarterly_discount_amount !== null ? Number(p.quarterly_discount_amount) : null,
      annual_discount_amount: p.annual_discount_amount !== null ? Number(p.annual_discount_amount) : null,
      included_monthly_ai_credits: Number(p.included_monthly_ai_credits ?? 0),
      included_monthly_ai_budget_usd: Number(p.included_monthly_ai_budget_usd ?? 0),
      credit_usd_conversion_rate: Number(p.credit_usd_conversion_rate ?? 100),
      max_ai_agents: p.max_ai_agents !== null ? Number(p.max_ai_agents) : null,
      max_virtual_stores: Number(p.max_virtual_stores ?? 1),
      max_monthly_contacts: Number(p.max_monthly_contacts ?? 0),
      max_monthly_conversations: p.max_monthly_conversations !== null ? Number(p.max_monthly_conversations) : null,
      max_team_members: Number(p.max_team_members ?? 1),
      features: p.features ?? [],
      is_active: !!p.is_active,
      is_featured: !!p.is_featured,
      sort_order: Number(p.sort_order ?? 1),
      promotion_label: p.promotion_label ?? '',
      is_promotion_active: !!p.is_promotion_active,
      show_nuro_branding: p.show_nuro_branding !== false,
      trial_duration_days: p.trial_duration_days !== null ? Number(p.trial_duration_days) : null,
      currency: p.currency || 'USD',
      stripe_price_id: p.stripe_price_id ?? '',
      stripe_quarterly_price_id: p.stripe_quarterly_price_id ?? '',
      stripe_annual_price_id: p.stripe_annual_price_id ?? '',
    })
    setFeatureInput('')
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error('El nombre es requerido')
    if (!form.slug.trim()) return toast.error('El slug es requerido')

    setSaving(true)
    try {
      const url = editingId ? `/api/admin/plans/${editingId}` : '/api/admin/plans'
      const payload = {
        ...form,
        // Strings vacíos → null para Stripe IDs
        stripe_price_id: form.stripe_price_id.trim() || null,
        stripe_quarterly_price_id: form.stripe_quarterly_price_id.trim() || null,
        stripe_annual_price_id: form.stripe_annual_price_id.trim() || null,
        promotion_label: form.promotion_label.trim() || null,
        description: form.description.trim() || null,
      }
      const res = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        toast.success(editingId ? 'Plan actualizado' : 'Plan creado')
        setDialogOpen(false)
        fetchPlans()
      } else {
        const data = await res.json().catch(() => ({}))
        toast.error(data?.error || 'Error al guardar')
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error de conexión')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      const res = await fetch(`/api/admin/plans/${deleteId}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Plan eliminado')
        fetchPlans()
      } else {
        const data = await res.json().catch(() => ({}))
        toast.error(data?.error || 'Error al eliminar')
      }
    } catch {
      toast.error('Error de conexión')
    } finally {
      setDeleteId(null)
    }
  }

  const handleToggleActive = async (p: PlanRow) => {
    setTogglingId(p.id)
    try {
      const res = await fetch(`/api/admin/plans/${p.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !p.is_active }),
      })
      if (res.ok) {
        toast.success(p.is_active ? 'Plan desactivado' : 'Plan activado')
        fetchPlans()
      }
    } finally { setTogglingId(null) }
  }

  const addFeature = () => {
    if (!featureInput.trim()) return
    setForm(prev => ({ ...prev, features: [...prev.features, featureInput.trim()] }))
    setFeatureInput('')
  }

  const removeFeature = (i: number) => {
    setForm(prev => ({ ...prev, features: prev.features.filter((_, idx) => idx !== i) }))
  }

  return (
    <div className="min-h-screen p-6 lg:p-10 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Package className="h-6 w-6 text-purple-400" />
          <div>
            <h1 className="text-2xl font-semibold text-white">Planes de suscripción</h1>
            <p className="text-[12px] text-white/55 mt-0.5">
              Total: <span className="text-white">{totals.total}</span> · Activos:{' '}
              <span className="text-emerald-400">{totals.active}</span> · En promoción:{' '}
              <span className="text-amber-400">{totals.promo}</span>
            </p>
          </div>
        </div>
        <Button onClick={openCreate}
          className="h-10 px-5 rounded-xl text-white font-semibold"
          style={{
            background: 'linear-gradient(135deg, #6B5CFF, #8E44FF, #D45BFF)',
            boxShadow: '0 12px 24px -6px rgba(142,68,255,0.55)',
          }}>
          <Plus className="h-4 w-4 mr-2" /> Nuevo plan
        </Button>
      </div>

      {/* Tabla / cards */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <Loader2 className="h-6 w-6 text-purple-400 animate-spin" />
        </div>
      ) : plans.length === 0 ? (
        <div className="rounded-2xl p-12 text-center"
          style={{ background: 'rgba(11,16,38,0.6)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <Package className="h-8 w-8 text-white/30 mx-auto mb-3" />
          <p className="text-sm text-white/55 mb-4">Aún no hay planes definidos.</p>
          <Button onClick={openCreate} variant="outline">
            <Plus className="h-4 w-4 mr-2" /> Crear primer plan
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {plans.map((p) => {
            const monthly = Number(p.monthly_price ?? 0)
            const credits = Number(p.included_monthly_ai_credits ?? 0)
            return (
              <div key={p.id}
                className="relative rounded-2xl p-5 overflow-hidden"
                style={{
                  background: 'rgba(11,16,38,0.65)',
                  border: `1px solid ${p.is_featured ? 'rgba(212,91,255,0.4)' : 'rgba(255,255,255,0.06)'}`,
                  boxShadow: p.is_featured ? '0 24px 40px -16px rgba(142,68,255,0.4)' : undefined,
                }}>
                {p.is_featured && (
                  <span className="absolute top-3 right-3 inline-flex items-center gap-1 px-2 py-1 rounded-full text-[9.5px] uppercase font-bold"
                    style={{ background: 'rgba(212,91,255,0.18)', border: '1px solid rgba(212,91,255,0.4)', color: '#D45BFF', letterSpacing: '0.14em' }}>
                    <Crown className="h-3 w-3" /> Destacado
                  </span>
                )}

                <div className="flex items-start gap-3 mb-3">
                  <div className="shrink-0 flex h-9 w-9 items-center justify-center rounded-lg"
                    style={{ background: 'rgba(142,68,255,0.16)', border: '1px solid rgba(142,68,255,0.32)' }}>
                    <Sparkles className="h-4 w-4 text-purple-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[15px] font-semibold text-white truncate">{p.name}</h3>
                    <p className="text-[11px] text-white/45 font-mono">{p.slug}</p>
                  </div>
                </div>

                {/* Precios */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <PriceCell label="Mensual" value={monthly} />
                  <PriceCell label="Trimestral" value={p.quarterly_price} />
                  <PriceCell label="Anual" value={p.annual_price} />
                </div>

                {/* Créditos */}
                <div className="flex items-center gap-2 rounded-xl p-3 mb-3"
                  style={{ background: 'rgba(212,91,255,0.06)', border: '1px solid rgba(212,91,255,0.18)' }}>
                  <Zap className="h-3.5 w-3.5 text-purple-400" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10.5px] uppercase text-white/55 font-semibold" style={{ letterSpacing: '0.14em' }}>
                      Créditos mensuales
                    </p>
                    <p className="text-[14px] font-semibold text-white tabular-nums">{credits.toLocaleString()}</p>
                  </div>
                </div>

                {/* Límites */}
                <div className="grid grid-cols-2 gap-1.5 text-[11px] mb-3 text-white/65">
                  <LimitRow label="Agentes IA" value={p.max_ai_agents} />
                  <LimitRow label="Tiendas" value={p.max_virtual_stores} />
                  <LimitRow label="Contactos/mes" value={p.max_monthly_contacts} />
                  <LimitRow label="Equipo" value={p.max_team_members} />
                </div>

                {/* Promoción */}
                {p.is_promotion_active && p.promotion_label && (
                  <div className="flex items-center gap-1.5 mb-3 text-[11px]"
                    style={{ color: '#FBBF24' }}>
                    <Tag className="h-3 w-3" /> {p.promotion_label}
                  </div>
                )}

                {/* Acciones */}
                <div className="flex items-center gap-1.5 pt-3 mt-1 border-t border-white/[0.05]">
                  <button
                    onClick={() => handleToggleActive(p)}
                    disabled={togglingId === p.id}
                    className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg text-[11px] font-medium transition-colors"
                    style={{
                      background: p.is_active ? 'rgba(16,185,129,0.12)' : 'rgba(148,163,184,0.10)',
                      border: `1px solid ${p.is_active ? 'rgba(16,185,129,0.30)' : 'rgba(148,163,184,0.20)'}`,
                      color: p.is_active ? '#10B981' : '#94A3B8',
                    }}>
                    {togglingId === p.id
                      ? <Loader2 className="h-3 w-3 animate-spin" />
                      : p.is_active
                        ? <ToggleRight className="h-3 w-3" />
                        : <ToggleLeft className="h-3 w-3" />}
                    {p.is_active ? 'Activo' : 'Inactivo'}
                  </button>
                  <div className="flex-1" />
                  <button
                    onClick={() => openEdit(p)}
                    className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-white/65 hover:text-white transition-colors"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                    aria-label="Editar">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteId(p.id)}
                    className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-red-400/70 hover:text-red-400 transition-colors"
                    style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)' }}
                    aria-label="Eliminar">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Dialog form */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-4 w-4 text-purple-400" />
              {editingId ? 'Editar plan' : 'Nuevo plan'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 mt-2">
            {/* Identificación */}
            <Section title="Identificación">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Nombre*" required>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Profesional" />
                </Field>
                <Field label="Slug*" required>
                  <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="profesional" />
                </Field>
                <Field label="Descripción" className="md:col-span-2">
                  <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Para negocios en crecimiento" />
                </Field>
                <Field label="Orden">
                  <Input type="number" value={form.sort_order}
                    onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} />
                </Field>
                <Field label="Días de trial (si aplica)">
                  <Input type="number" value={form.trial_duration_days ?? ''}
                    onChange={(e) => setForm({ ...form, trial_duration_days: e.target.value === '' ? null : Number(e.target.value) })} />
                </Field>
              </div>
            </Section>

            {/* Precios */}
            <Section title="Precios por periodo (USD)">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Field label="Mensual">
                  <Input type="number" step="0.01" value={form.monthly_price}
                    onChange={(e) => setForm({ ...form, monthly_price: Number(e.target.value) })} />
                </Field>
                <Field label="Trimestral">
                  <Input type="number" step="0.01" value={form.quarterly_price ?? ''}
                    onChange={(e) => setForm({ ...form, quarterly_price: e.target.value === '' ? null : Number(e.target.value) })} />
                </Field>
                <Field label="Anual">
                  <Input type="number" step="0.01" value={form.annual_price ?? ''}
                    onChange={(e) => setForm({ ...form, annual_price: e.target.value === '' ? null : Number(e.target.value) })} />
                </Field>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                <Field label="Trimestral full price (tachado)">
                  <Input type="number" step="0.01" value={form.quarterly_full_price ?? ''}
                    onChange={(e) => setForm({ ...form, quarterly_full_price: e.target.value === '' ? null : Number(e.target.value) })} />
                </Field>
                <Field label="Anual full price (tachado)">
                  <Input type="number" step="0.01" value={form.annual_full_price ?? ''}
                    onChange={(e) => setForm({ ...form, annual_full_price: e.target.value === '' ? null : Number(e.target.value) })} />
                </Field>
                <Field label="Descuento trimestral ($)">
                  <Input type="number" step="0.01" value={form.quarterly_discount_amount ?? ''}
                    onChange={(e) => setForm({ ...form, quarterly_discount_amount: e.target.value === '' ? null : Number(e.target.value) })} />
                </Field>
                <Field label="Descuento anual ($)">
                  <Input type="number" step="0.01" value={form.annual_discount_amount ?? ''}
                    onChange={(e) => setForm({ ...form, annual_discount_amount: e.target.value === '' ? null : Number(e.target.value) })} />
                </Field>
              </div>
            </Section>

            {/* Créditos */}
            <Section title="Créditos de IA mensuales">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Field label="Créditos incluidos">
                  <Input type="number" value={form.included_monthly_ai_credits}
                    onChange={(e) => setForm({ ...form, included_monthly_ai_credits: Number(e.target.value) })} />
                </Field>
                <Field label="Presupuesto IA (USD)">
                  <Input type="number" step="0.01" value={form.included_monthly_ai_budget_usd}
                    onChange={(e) => setForm({ ...form, included_monthly_ai_budget_usd: Number(e.target.value) })} />
                </Field>
                <Field label="Tasa créditos por USD">
                  <Input type="number" step="0.01" value={form.credit_usd_conversion_rate}
                    onChange={(e) => setForm({ ...form, credit_usd_conversion_rate: Number(e.target.value) })} />
                </Field>
              </div>
            </Section>

            {/* Límites */}
            <Section title="Límites">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Field label="Agentes IA">
                  <Input type="number" value={form.max_ai_agents ?? ''}
                    onChange={(e) => setForm({ ...form, max_ai_agents: e.target.value === '' ? null : Number(e.target.value) })} />
                </Field>
                <Field label="Tiendas virtuales">
                  <Input type="number" value={form.max_virtual_stores}
                    onChange={(e) => setForm({ ...form, max_virtual_stores: Number(e.target.value) })} />
                </Field>
                <Field label="Contactos/mes">
                  <Input type="number" value={form.max_monthly_contacts}
                    onChange={(e) => setForm({ ...form, max_monthly_contacts: Number(e.target.value) })} />
                </Field>
                <Field label="Conversaciones/mes">
                  <Input type="number" value={form.max_monthly_conversations ?? ''}
                    onChange={(e) => setForm({ ...form, max_monthly_conversations: e.target.value === '' ? null : Number(e.target.value) })} />
                </Field>
                <Field label="Miembros equipo">
                  <Input type="number" value={form.max_team_members}
                    onChange={(e) => setForm({ ...form, max_team_members: Number(e.target.value) })} />
                </Field>
              </div>
            </Section>

            {/* Promoción */}
            <Section title="Promoción">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Etiqueta de promoción">
                  <Input value={form.promotion_label}
                    onChange={(e) => setForm({ ...form, promotion_label: e.target.value })}
                    placeholder="MÁS RECOMENDADO" />
                </Field>
                <div className="flex items-center justify-between rounded-xl px-3 py-2"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <Label className="text-[12px] text-white/85">Promoción activa</Label>
                  <Switch checked={form.is_promotion_active}
                    onCheckedChange={(v) => setForm({ ...form, is_promotion_active: v })} />
                </div>
              </div>
            </Section>

            {/* Features */}
            <Section title="Features">
              <div className="flex gap-2 mb-2">
                <Input value={featureInput} onChange={(e) => setFeatureInput(e.target.value)}
                  placeholder="WhatsApp Business API"
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addFeature() } }} />
                <Button type="button" variant="outline" onClick={addFeature}>Agregar</Button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {form.features.map((f, i) => (
                  <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] text-white/85"
                    style={{ background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.25)' }}>
                    <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                    {f}
                    <button onClick={() => removeFeature(i)} className="ml-1 text-white/45 hover:text-white">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </Section>

            {/* Flags */}
            <Section title="Flags">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <FlagSwitch label="Plan activo" checked={form.is_active}
                  onChange={(v) => setForm({ ...form, is_active: v })} />
                <FlagSwitch label="Destacado (MÁS RECOMENDADO)" checked={form.is_featured}
                  onChange={(v) => setForm({ ...form, is_featured: v })} />
                <FlagSwitch label="Mostrar NÜRO branding" checked={form.show_nuro_branding}
                  onChange={(v) => setForm({ ...form, show_nuro_branding: v })} />
              </div>
            </Section>

            {/* Stripe IDs */}
            <Section title="IDs de Stripe (opcional)">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Field label="Stripe price ID (mensual)">
                  <Input value={form.stripe_price_id}
                    onChange={(e) => setForm({ ...form, stripe_price_id: e.target.value })}
                    placeholder="price_..." />
                </Field>
                <Field label="Stripe price ID (trimestral)">
                  <Input value={form.stripe_quarterly_price_id}
                    onChange={(e) => setForm({ ...form, stripe_quarterly_price_id: e.target.value })}
                    placeholder="price_..." />
                </Field>
                <Field label="Stripe price ID (anual)">
                  <Input value={form.stripe_annual_price_id}
                    onChange={(e) => setForm({ ...form, stripe_annual_price_id: e.target.value })}
                    placeholder="price_..." />
                </Field>
              </div>
            </Section>
          </div>

          <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-white/[0.06]">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}
              className="text-white font-semibold"
              style={{
                background: 'linear-gradient(135deg, #6B5CFF, #8E44FF, #D45BFF)',
                boxShadow: '0 12px 24px -6px rgba(142,68,255,0.55)',
              }}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {editingId ? 'Guardar cambios' : 'Crear plan'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmación delete */}
      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>¿Eliminar plan?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-white/65">
            Esta acción no se puede deshacer. Si el plan tiene suscripciones activas, no podrás eliminarlo.
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancelar</Button>
            <Button onClick={handleDelete}
              className="bg-red-500 hover:bg-red-600 text-white">
              Eliminar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-[10.5px] uppercase font-semibold text-white/55 mb-2.5"
        style={{ letterSpacing: '0.18em' }}>
        {title}
      </h3>
      {children}
    </div>
  )
}

function Field({ label, children, className, required }: { label: string; children: React.ReactNode; className?: string; required?: boolean }) {
  return (
    <div className={className}>
      <Label className="text-[11.5px] text-white/65 mb-1 block">
        {label}{required && <span className="text-red-400"> *</span>}
      </Label>
      {children}
    </div>
  )
}

function FlagSwitch({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between rounded-xl px-3 py-2"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <Label className="text-[12px] text-white/85">{label}</Label>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  )
}

function PriceCell({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="rounded-lg p-2"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <p className="text-[9px] uppercase text-white/45 font-semibold" style={{ letterSpacing: '0.14em' }}>
        {label}
      </p>
      <p className="text-[13px] text-white font-semibold tabular-nums">
        {value !== null && value !== undefined ? `$${Number(value).toFixed(2)}` : '—'}
      </p>
    </div>
  )
}

function LimitRow({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-white/55">{label}</span>
      <span className="text-white tabular-nums font-medium">
        {value === null || value === undefined ? '—' : value === 0 ? 'Ilim.' : value.toLocaleString()}
      </span>
    </div>
  )
}
