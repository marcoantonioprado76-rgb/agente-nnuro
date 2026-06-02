'use client'

import { useCallback, useEffect, useState, useMemo } from 'react'
import { Wallet, Loader2, Plus, Pencil, Trash2, Zap, ToggleLeft, ToggleRight, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'

interface PackageRow {
  id: string
  name: string
  credits_amount: number
  price_usd: number
  expiration_days: number | null
  is_active: boolean
  sort_order: number
  description: string | null
}

interface PackageForm {
  name: string
  credits_amount: number
  price_usd: number
  expiration_days: number | null
  is_active: boolean
  sort_order: number
  description: string
}

const emptyForm: PackageForm = {
  name: '', credits_amount: 1000, price_usd: 10, expiration_days: null,
  is_active: true, sort_order: 0, description: '',
}

export default function AdminCreditPackagesPage() {
  const [rows, setRows] = useState<PackageRow[]>([])
  const [loading, setLoading] = useState(true)
  const [dialog, setDialog] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<PackageForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const fetchRows = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/credit-packages')
      if (res.ok) setRows(await res.json())
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchRows() }, [fetchRows])

  const stats = useMemo(() => ({
    total: rows.length,
    active: rows.filter(r => r.is_active).length,
  }), [rows])

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm)
    setDialog(true)
  }

  const openEdit = (p: PackageRow) => {
    setEditingId(p.id)
    setForm({
      name: p.name,
      credits_amount: Number(p.credits_amount),
      price_usd: Number(p.price_usd),
      expiration_days: p.expiration_days !== null ? Number(p.expiration_days) : null,
      is_active: !!p.is_active,
      sort_order: Number(p.sort_order ?? 0),
      description: p.description ?? '',
    })
    setDialog(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error('El nombre es requerido')
    if (form.credits_amount <= 0) return toast.error('Los créditos deben ser > 0')
    if (form.price_usd <= 0) return toast.error('El precio debe ser > 0')

    setSaving(true)
    try {
      const url = editingId ? `/api/admin/credit-packages/${editingId}` : '/api/admin/credit-packages'
      const res = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          credits_amount: form.credits_amount,
          price_usd: form.price_usd,
          expiration_days: form.expiration_days,
          is_active: form.is_active,
          sort_order: form.sort_order,
          description: form.description.trim() || null,
        }),
      })
      if (res.ok) {
        toast.success(editingId ? 'Paquete actualizado' : 'Paquete creado')
        setDialog(false)
        fetchRows()
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
      const res = await fetch(`/api/admin/credit-packages/${deleteId}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Paquete eliminado')
        fetchRows()
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

  const handleToggleActive = async (p: PackageRow) => {
    setTogglingId(p.id)
    try {
      const res = await fetch(`/api/admin/credit-packages/${p.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !p.is_active }),
      })
      if (res.ok) {
        toast.success(p.is_active ? 'Paquete desactivado' : 'Paquete activado')
        fetchRows()
      }
    } finally { setTogglingId(null) }
  }

  return (
    <div className="min-h-screen p-6 lg:p-10 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Wallet className="h-6 w-6 text-purple-400" />
          <div>
            <h1 className="text-2xl font-semibold text-white">Paquetes de créditos IA</h1>
            <p className="text-[12px] text-white/55 mt-0.5">
              Total: <span className="text-white">{stats.total}</span> · Activos:{' '}
              <span className="text-emerald-400">{stats.active}</span>
            </p>
          </div>
        </div>
        <Button onClick={openCreate}
          className="h-10 px-5 rounded-xl text-white font-semibold"
          style={{
            background: 'linear-gradient(135deg, #6B5CFF, #8E44FF, #D45BFF)',
            boxShadow: '0 12px 24px -6px rgba(142,68,255,0.55)',
          }}>
          <Plus className="h-4 w-4 mr-2" /> Nuevo paquete
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <Loader2 className="h-6 w-6 text-purple-400 animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl p-12 text-center"
          style={{ background: 'rgba(11,16,38,0.6)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <Wallet className="h-8 w-8 text-white/30 mx-auto mb-3" />
          <p className="text-sm text-white/55 mb-4">No hay paquetes aún.</p>
          <Button onClick={openCreate} variant="outline">
            <Plus className="h-4 w-4 mr-2" /> Crear primer paquete
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map((p) => {
            const ratio = p.price_usd > 0 ? p.credits_amount / p.price_usd : 0
            return (
              <div key={p.id} className="rounded-2xl p-5 relative overflow-hidden"
                style={{
                  background: 'rgba(11,16,38,0.65)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}>
                <div className="flex items-start gap-3 mb-3">
                  <div className="shrink-0 flex h-9 w-9 items-center justify-center rounded-lg"
                    style={{ background: 'rgba(142,68,255,0.16)', border: '1px solid rgba(142,68,255,0.32)' }}>
                    <Zap className="h-4 w-4 text-purple-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[15px] font-semibold text-white truncate">{p.name}</h3>
                    {p.description && (
                      <p className="text-[11.5px] text-white/55 truncate" title={p.description}>{p.description}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="rounded-lg p-3"
                    style={{ background: 'rgba(212,91,255,0.08)', border: '1px solid rgba(212,91,255,0.22)' }}>
                    <p className="text-[9.5px] uppercase text-white/55 font-semibold" style={{ letterSpacing: '0.14em' }}>
                      Créditos
                    </p>
                    <p className="text-[18px] font-semibold text-white tabular-nums">
                      {p.credits_amount.toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-lg p-3"
                    style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.22)' }}>
                    <p className="text-[9.5px] uppercase text-white/55 font-semibold" style={{ letterSpacing: '0.14em' }}>
                      Precio
                    </p>
                    <p className="text-[18px] font-semibold text-white tabular-nums">
                      ${Number(p.price_usd).toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-[11px] text-white/55 mb-3">
                  <span>Tasa: <span className="text-white/85 tabular-nums">{ratio.toFixed(0)} créd/USD</span></span>
                  {p.expiration_days && (
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Expira en {p.expiration_days}d
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 pt-3 mt-1 border-t border-white/[0.05]">
                  <button onClick={() => handleToggleActive(p)} disabled={togglingId === p.id}
                    className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg text-[11px] font-medium transition-colors"
                    style={{
                      background: p.is_active ? 'rgba(16,185,129,0.12)' : 'rgba(148,163,184,0.10)',
                      border: `1px solid ${p.is_active ? 'rgba(16,185,129,0.30)' : 'rgba(148,163,184,0.20)'}`,
                      color: p.is_active ? '#10B981' : '#94A3B8',
                    }}>
                    {togglingId === p.id ? <Loader2 className="h-3 w-3 animate-spin" />
                      : p.is_active ? <ToggleRight className="h-3 w-3" /> : <ToggleLeft className="h-3 w-3" />}
                    {p.is_active ? 'Activo' : 'Inactivo'}
                  </button>
                  <div className="flex-1" />
                  <button onClick={() => openEdit(p)}
                    className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-white/65 hover:text-white transition-colors"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                    aria-label="Editar"><Pencil className="h-3.5 w-3.5" /></button>
                  <button onClick={() => setDeleteId(p.id)}
                    className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-red-400/70 hover:text-red-400 transition-colors"
                    style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)' }}
                    aria-label="Eliminar"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar paquete' : 'Nuevo paquete'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 mt-2">
            <div>
              <Label className="text-[11.5px] text-white/65 mb-1 block">Nombre*</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Pack 1.000 créditos" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[11.5px] text-white/65 mb-1 block">Créditos</Label>
                <Input type="number" value={form.credits_amount}
                  onChange={(e) => setForm({ ...form, credits_amount: Number(e.target.value) })} />
              </div>
              <div>
                <Label className="text-[11.5px] text-white/65 mb-1 block">Precio USD</Label>
                <Input type="number" step="0.01" value={form.price_usd}
                  onChange={(e) => setForm({ ...form, price_usd: Number(e.target.value) })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[11.5px] text-white/65 mb-1 block">Expira en (días)</Label>
                <Input type="number" value={form.expiration_days ?? ''}
                  onChange={(e) => setForm({ ...form, expiration_days: e.target.value === '' ? null : Number(e.target.value) })}
                  placeholder="Vacío = no expira" />
              </div>
              <div>
                <Label className="text-[11.5px] text-white/65 mb-1 block">Orden</Label>
                <Input type="number" value={form.sort_order}
                  onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} />
              </div>
            </div>
            <div>
              <Label className="text-[11.5px] text-white/65 mb-1 block">Descripción</Label>
              <Textarea value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Ideal para campañas puntuales..." rows={2} />
            </div>
            <div className="flex items-center justify-between rounded-xl px-3 py-2"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <Label className="text-[12px] text-white/85">Paquete activo</Label>
              <Switch checked={form.is_active}
                onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-white/[0.06]">
            <Button variant="outline" onClick={() => setDialog(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}
              className="text-white font-semibold"
              style={{ background: 'linear-gradient(135deg, #6B5CFF, #8E44FF, #D45BFF)' }}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {editingId ? 'Guardar' : 'Crear'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>¿Eliminar paquete?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-white/65">
            Esta acción no se puede deshacer.
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancelar</Button>
            <Button onClick={handleDelete} className="bg-red-500 hover:bg-red-600 text-white">Eliminar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
