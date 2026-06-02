'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Zap, Check, Loader2, Crown, CreditCard, Landmark, Upload, ImageIcon, X, Copy, QrCode, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import type { Plan, BillingPeriod } from '@/types'

const PERIOD_LABEL: Record<BillingPeriod, string> = {
  monthly:   'Mensual',
  quarterly: '3 meses',
  annual:    '1 año',
}

const PERIOD_SUFFIX: Record<BillingPeriod, string> = {
  monthly:   '/mes',
  quarterly: '/3 meses',
  annual:    '/año',
}

const PERIOD_MONTHS: Record<BillingPeriod, number> = {
  monthly: 1, quarterly: 3, annual: 12,
}

function getPlanPrice(plan: Plan, period: BillingPeriod): number {
  if (period === 'annual')    return Number(plan.annual_price ?? plan.price ?? 0)
  if (period === 'quarterly') return Number(plan.quarterly_price ?? plan.price ?? 0)
  return Number(plan.monthly_price ?? plan.price ?? 0)
}

function getPlanFullPrice(plan: Plan, period: BillingPeriod): number {
  if (period === 'annual')    return Number(plan.annual_full_price ?? 0)
  if (period === 'quarterly') return Number(plan.quarterly_full_price ?? 0)
  return 0
}

function getPlanSavings(plan: Plan, period: BillingPeriod): number {
  if (period === 'annual')    return Number(plan.annual_discount_amount ?? 0)
  if (period === 'quarterly') return Number(plan.quarterly_discount_amount ?? 0)
  return 0
}

interface TransferDetails {
  bank_name: string
  account_holder: string
  account_number: string
  account_type: string
  document_id: string
  cci: string
  qr_image_url: string
  instructions: string
}

interface PaymentMethods {
  stripe: boolean
  transfer: boolean
  transfer_details: TransferDetails
}

const emptyTransferDetails: TransferDetails = {
  bank_name: '', account_holder: '', account_number: '', account_type: '',
  document_id: '', cci: '', qr_image_url: '', instructions: '',
}

export default function PricingPage() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [subscribing, setSubscribing] = useState<string | null>(null)
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly')
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethods>({ stripe: true, transfer: true, transfer_details: emptyTransferDetails })

  // Transfer dialog state
  const [transferDialog, setTransferDialog] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
  const [transactionId, setTransactionId] = useState('')
  const [proofUrl, setProofUrl] = useState('')
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [proofPreview, setProofPreview] = useState<string | null>(null)
  const [uploadingProof, setUploadingProof] = useState(false)
  const [sendingTransfer, setSendingTransfer] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const router = useRouter()
  

  useEffect(() => {
    async function load() {
      const [plansRes, methodsRes] = await Promise.all([
        fetch('/api/plans'),
        fetch('/api/payment-methods'),
      ])
      if (plansRes.ok) setPlans(await plansRes.json())
      if (methodsRes.ok) {
        const data = await methodsRes.json()
        setPaymentMethods({
          stripe: data.stripe ?? true,
          transfer: data.transfer ?? true,
          transfer_details: { ...emptyTransferDetails, ...(data.transfer_details ?? {}) },
        })
      }
      setLoading(false)
    }
    load()
  }, [])

  const copyToClipboard = (value: string, label: string) => {
    if (!value) return
    navigator.clipboard.writeText(value).then(() => {
      toast.success(`${label} copiado`)
    }).catch(() => {
      toast.error('No se pudo copiar')
    })
  }

  const handleStripeCheckout = async (plan: Plan) => {
    const meRes = await fetch('/api/auth/me')
    if (!meRes.ok) { router.push('/login'); return }

    setSubscribing(plan.id)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_id: plan.id, billing_period: billingPeriod }),
      })
      const data = await res.json()
      if (res.ok && data.url) {
        window.location.href = data.url
      } else if (res.status === 409) {
        toast.error('Ya tienes una suscripción activa o pendiente')
      } else {
        toast.error(data.error || 'Error al iniciar el pago')
      }
    } catch {
      toast.error('Error de conexión')
    } finally {
      setSubscribing(null)
    }
  }

  const openTransferDialog = async (plan: Plan) => {
    const meRes2 = await fetch('/api/auth/me')
    if (!meRes2.ok) { router.push('/login'); return }
    setSelectedPlan(plan)
    setTransactionId('')
    setProofUrl('')
    setProofFile(null)
    setProofPreview(null)
    setTransferDialog(true)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Solo se permiten imágenes')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('La imagen no debe superar 10MB')
      return
    }
    setProofFile(file)
    setProofPreview(URL.createObjectURL(file))
  }

  const removeFile = () => {
    setProofFile(null)
    if (proofPreview) URL.revokeObjectURL(proofPreview)
    setProofPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleTransferSubmit = async () => {
    if (!selectedPlan) return
    if (!transactionId.trim() && !proofFile) {
      toast.error('Sube el comprobante o ingresa el número de transacción')
      return
    }

    setSendingTransfer(true)
    try {
      let finalProofUrl = proofUrl.trim() || null

      // Upload proof image if selected
      if (proofFile) {
        setUploadingProof(true)
        const formData = new FormData()
        formData.append('file', proofFile)
        formData.append('bucket', 'payment-proofs')

        const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData })
        const uploadData = await uploadRes.json()

        if (!uploadRes.ok) {
          toast.error(uploadData.error || 'Error al subir comprobante')
          setSendingTransfer(false)
          setUploadingProof(false)
          return
        }
        finalProofUrl = uploadData.url
        setUploadingProof(false)
      }

      const res = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan_id: selectedPlan.id,
          payment_method: 'transfer',
          transaction_id: transactionId.trim() || null,
          payment_proof_url: finalProofUrl,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success('Comprobante enviado. Tu suscripción será activada cuando el admin lo apruebe.')
        setTransferDialog(false)
        router.push('/subscription')
      } else if (res.status === 409) {
        toast.error('Ya tienes una suscripción activa o pendiente')
      } else {
        toast.error(data.error || 'Error al registrar el pago')
      }
    } catch {
      toast.error('Error de conexión')
    } finally {
      setSendingTransfer(false)
      setUploadingProof(false)
    }
  }

  const isFeatured = (plan: Plan) =>
    Boolean(plan.is_featured) || plan.slug === 'profesional' || plan.slug === 'pro'
  const isPro = isFeatured  // back-compat con código abajo
  const hasAnyMethod = paymentMethods.stripe || paymentMethods.transfer

  // Filtrar trial fuera del grid principal (se muestra como CTA aparte si existe)
  const paidPlans = plans.filter((p) => p.slug !== 'trial' && Number(p.monthly_price ?? p.price ?? 0) > 0)

  return (
    <div className="min-h-screen bg-gradient-dark">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-glow-purple/10 blur-[100px]" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-glow-blue/10 blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 h-60 w-60 -translate-x-1/2 -translate-y-1/2 rounded-full bg-glow-cyan/5 blur-[80px]" />
      </div>

      <div className="relative max-w-6xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/20 shadow-lg shadow-primary/10 mb-6">
            <Zap className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
            Elige tu Plan
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Automatiza tus ventas por WhatsApp con inteligencia artificial.
            Selecciona el plan que mejor se adapte a tu negocio.
          </p>
        </div>

        {/* Selector de periodo de facturación */}
        <div className="flex justify-center mb-10">
          <div
            role="tablist"
            className="inline-flex items-center gap-1 rounded-full p-1 backdrop-blur-xl"
            style={{
              background: 'rgba(11,16,38,0.65)',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 12px 30px -16px rgba(0,0,0,0.6)',
            }}
          >
            {(['monthly', 'quarterly', 'annual'] as const).map((p) => {
              const active = billingPeriod === p
              return (
                <button
                  key={p}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setBillingPeriod(p)}
                  className="relative px-5 py-2 rounded-full text-[12.5px] font-semibold transition-all duration-300 whitespace-nowrap"
                  style={{
                    background: active
                      ? 'linear-gradient(135deg, #6B5CFF, #8E44FF, #D45BFF)'
                      : 'transparent',
                    color: active ? '#fff' : 'rgba(248,250,255,0.6)',
                    letterSpacing: '0.08em',
                    boxShadow: active ? '0 6px 16px -4px rgba(142,68,255,0.5)' : 'none',
                  }}
                >
                  {PERIOD_LABEL[p]}
                  {p === 'annual' && (
                    <span className="ml-1.5 text-[9px] uppercase font-bold opacity-90"
                      style={{ color: active ? '#F8FAFF' : '#D45BFF', letterSpacing: '0.16em' }}>
                      · MEJOR AHORRO
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className={`grid gap-6 mx-auto ${paidPlans.length === 3 ? 'md:grid-cols-3 max-w-5xl' : 'md:grid-cols-2 max-w-3xl'}`}>
            {paidPlans.map((plan) => (
              <div
                key={plan.id}
                className={`relative rounded-2xl border p-[1px] transition-all ${
                  isPro(plan)
                    ? 'bg-gradient-to-b from-purple-500/50 via-cyan-500/30 to-transparent'
                    : 'bg-gradient-to-b from-emerald-500/40 via-cyan-500/20 to-transparent'
                }`}
              >
                {/* Badge "MÁS RECOMENDADO" */}
                {isFeatured(plan) && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                    <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0 px-4 py-1 text-[10px] font-bold uppercase tracking-wider shadow-lg">
                      <Crown className="h-3 w-3 mr-1" />
                      {plan.promotion_label || 'MÁS RECOMENDADO'}
                    </Badge>
                  </div>
                )}

                <div className={`rounded-2xl p-7 h-full flex flex-col ${
                  isFeatured(plan) ? 'bg-[#050508]' : 'bg-[#000000]'
                }`}>
                  {/* Plan header */}
                  <div className="mb-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                        isFeatured(plan) ? 'bg-purple-500/20' : 'bg-emerald-500/20'
                      }`}>
                        <Zap className={`h-5 w-5 ${
                          isFeatured(plan) ? 'text-purple-400' : 'text-emerald-400'
                        }`} />
                      </div>
                      <h2 className="text-xl font-bold text-white">{plan.name}</h2>
                    </div>

                    {/* Precio dinámico según billingPeriod */}
                    <div className="flex items-baseline gap-1.5 mb-1">
                      <span className="text-4xl font-bold text-white tabular-nums">
                        ${getPlanPrice(plan, billingPeriod).toFixed(0)}
                      </span>
                      <span className="text-muted-foreground text-sm">
                        {PERIOD_SUFFIX[billingPeriod]}
                      </span>
                    </div>

                    {/* Equivalente mensual + ahorro (solo para 3m y 1y) */}
                    {billingPeriod !== 'monthly' && (
                      <div className="flex items-center gap-2 flex-wrap text-[12px] mt-1.5">
                        <span className="text-muted-foreground tabular-nums">
                          ≈ ${(getPlanPrice(plan, billingPeriod) / PERIOD_MONTHS[billingPeriod]).toFixed(0)}/mes
                        </span>
                        {getPlanFullPrice(plan, billingPeriod) > 0 && (
                          <span className="text-white/40 line-through tabular-nums">
                            ${getPlanFullPrice(plan, billingPeriod).toFixed(0)}
                          </span>
                        )}
                        {getPlanSavings(plan, billingPeriod) > 0 && (
                          <span className="font-semibold tabular-nums"
                            style={{ color: '#10B981' }}>
                            Ahorras ${getPlanSavings(plan, billingPeriod).toFixed(0)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Línea de créditos AI incluidos */}
                  {Number(plan.included_monthly_ai_credits ?? 0) > 0 && (
                    <div
                      className="flex items-center gap-2 px-3 py-2 mb-5 rounded-lg"
                      style={{
                        background: 'rgba(212,91,255,0.10)',
                        border: '1px solid rgba(212,91,255,0.28)',
                      }}
                      title="Los créditos permiten que tu agente responda automáticamente a tus clientes"
                    >
                      <Sparkles className="h-3.5 w-3.5 shrink-0" style={{ color: '#D45BFF' }} />
                      <span className="text-[12px] font-semibold text-white">
                        Incluye{' '}
                        <span className="tabular-nums" style={{ color: '#D45BFF' }}>
                          {Number(plan.included_monthly_ai_credits).toLocaleString()}
                        </span>{' '}
                        créditos mensuales de IA
                      </span>
                    </div>
                  )}

                  {/* Features */}
                  <div className="flex-1 space-y-2.5 mb-6">
                    {(plan.features || []).map((feature, i) => (
                      <div key={i} className="flex items-start gap-2.5">
                        <div className={`flex h-4 w-4 items-center justify-center rounded-full mt-0.5 shrink-0 ${
                          isFeatured(plan) ? 'bg-purple-500/20' : 'bg-emerald-500/20'
                        }`}>
                          <Check className={`h-2.5 w-2.5 ${
                            isFeatured(plan) ? 'text-purple-400' : 'text-emerald-400'
                          }`} />
                        </div>
                        <span className="text-[12.5px] text-gray-300 leading-snug">{feature}</span>
                      </div>
                    ))}
                  </div>

                  {/* Limits summary */}
                  <div className="grid grid-cols-2 gap-2 mb-5">
                    <div className="bg-secondary/30 rounded-lg px-3 py-2 text-center">
                      <p className="text-base font-bold text-foreground tabular-nums">
                        {plan.max_ai_agents ?? plan.max_bots}
                      </p>
                      <p className="text-[10px] text-muted-foreground uppercase">Agentes IA</p>
                    </div>
                    <div className="bg-secondary/30 rounded-lg px-3 py-2 text-center">
                      <p className="text-base font-bold text-foreground tabular-nums">
                        {(plan.max_products ?? 0).toLocaleString()}
                      </p>
                      <p className="text-[10px] text-muted-foreground uppercase">Productos</p>
                    </div>
                    <div className="bg-secondary/30 rounded-lg px-3 py-2 text-center">
                      <p className="text-base font-bold text-foreground tabular-nums">
                        {Number(plan.max_monthly_contacts ?? 0).toLocaleString()}
                      </p>
                      <p className="text-[10px] text-muted-foreground uppercase">Contactos/mes</p>
                    </div>
                    <div className="bg-secondary/30 rounded-lg px-3 py-2 text-center">
                      <p className="text-base font-bold text-foreground tabular-nums">
                        {plan.max_whatsapp_numbers}
                      </p>
                      <p className="text-[10px] text-muted-foreground uppercase">WhatsApp</p>
                    </div>
                  </div>

                  {/* Payment Buttons */}
                  <div className="space-y-3">
                    {paymentMethods.stripe && (
                      <Button
                        onClick={() => handleStripeCheckout(plan)}
                        disabled={subscribing === plan.id}
                        className={`w-full h-12 text-base font-bold rounded-xl transition-all ${
                          isPro(plan)
                            ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-lg shadow-purple-500/25'
                            : 'bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white shadow-lg shadow-emerald-500/20'
                        }`}
                      >
                        {subscribing === plan.id ? (
                          <Loader2 className="h-5 w-5 animate-spin mr-2" />
                        ) : (
                          <CreditCard className="h-5 w-5 mr-2" />
                        )}
                        Pagar con Tarjeta
                      </Button>
                    )}

                    {paymentMethods.transfer && (
                      <Button
                        onClick={() => openTransferDialog(plan)}
                        variant={paymentMethods.stripe ? 'outline' : 'default'}
                        className={paymentMethods.stripe
                          ? 'w-full h-12 text-base font-semibold rounded-xl border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10'
                          : `w-full h-12 text-base font-bold rounded-xl transition-all ${
                              isPro(plan)
                                ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white'
                                : 'bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white'
                            }`
                        }
                      >
                        <Landmark className="h-5 w-5 mr-2" />
                        Pagar por Transferencia
                      </Button>
                    )}

                    {!hasAnyMethod && (
                      <div className="text-center py-3">
                        <p className="text-sm text-muted-foreground">
                          No hay métodos de pago disponibles en este momento.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer note */}
        <div className="text-center mt-10 space-y-2">
          <p className="text-xs text-muted-foreground/60">
            {paymentMethods.stripe && 'Pago seguro procesado por Stripe. '}
            {paymentMethods.transfer && 'Puedes pagar por transferencia bancaria. '}
            Tu suscripción dura 1 mes calendario.
          </p>
          <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground/40">
            {paymentMethods.stripe && (
              <>
                <span>🔒 PCI Compliant</span>
                <span>•</span>
                <span>💳 Tarjeta de crédito/débito</span>
              </>
            )}
            {paymentMethods.stripe && paymentMethods.transfer && <span>•</span>}
            {paymentMethods.transfer && (
              <span>🏦 Transferencia bancaria</span>
            )}
            <span>•</span>
            <span>✓ 1 mes de acceso</span>
          </div>
        </div>
      </div>

      {/* ===== DIALOG: PAGO POR TRANSFERENCIA ===== */}
      <Dialog open={transferDialog} onOpenChange={setTransferDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Landmark className="h-5 w-5 text-cyan-400" />
              Pago por Transferencia
            </DialogTitle>
          </DialogHeader>

          {selectedPlan && (
            <div className="space-y-4 py-2">
              {/* Plan info */}
              <div className="bg-secondary/30 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-foreground">{selectedPlan.name}</p>
                  <p className="text-xs text-muted-foreground">Suscripción mensual</p>
                </div>
                <p className="text-xl font-bold text-primary">${selectedPlan.price} {selectedPlan.currency}</p>
              </div>

              {/* Instructions */}
              <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-xl p-4 space-y-2">
                <p className="text-sm font-semibold text-cyan-400">Instrucciones:</p>
                <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Realiza la transferencia por el monto indicado</li>
                  <li>Ingresa el número de transacción o sube el comprobante</li>
                  <li>El admin revisará y activará tu plan</li>
                </ol>
              </div>

              {/* QR de pago */}
              {paymentMethods.transfer_details.qr_image_url && (
                <div className="bg-white rounded-xl p-4 flex flex-col items-center gap-2">
                  <div className="flex items-center gap-2 text-xs text-gray-700 font-medium">
                    <QrCode className="h-4 w-4" /> Escanea el QR para pagar
                  </div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={paymentMethods.transfer_details.qr_image_url}
                    alt="QR de pago"
                    className="w-48 h-48 object-contain"
                  />
                </div>
              )}

              {/* Datos bancarios */}
              {(paymentMethods.transfer_details.bank_name
                || paymentMethods.transfer_details.account_holder
                || paymentMethods.transfer_details.account_number
                || paymentMethods.transfer_details.cci) && (
                <div className="rounded-xl border border-border/50 bg-secondary/20 p-4 space-y-2">
                  <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                    <Landmark className="h-4 w-4 text-cyan-400" /> Datos para la transferencia
                  </p>
                  <div className="space-y-1.5">
                    {paymentMethods.transfer_details.bank_name && (
                      <DetailRow label="Banco" value={paymentMethods.transfer_details.bank_name} onCopy={copyToClipboard} />
                    )}
                    {paymentMethods.transfer_details.account_holder && (
                      <DetailRow label="Titular" value={paymentMethods.transfer_details.account_holder} onCopy={copyToClipboard} />
                    )}
                    {paymentMethods.transfer_details.account_number && (
                      <DetailRow label="Cuenta" value={paymentMethods.transfer_details.account_number} onCopy={copyToClipboard} mono />
                    )}
                    {paymentMethods.transfer_details.account_type && (
                      <DetailRow label="Tipo" value={paymentMethods.transfer_details.account_type} onCopy={copyToClipboard} />
                    )}
                    {paymentMethods.transfer_details.cci && (
                      <DetailRow label="CCI" value={paymentMethods.transfer_details.cci} onCopy={copyToClipboard} mono />
                    )}
                    {paymentMethods.transfer_details.document_id && (
                      <DetailRow label="DNI/RUC" value={paymentMethods.transfer_details.document_id} onCopy={copyToClipboard} mono />
                    )}
                  </div>
                  {paymentMethods.transfer_details.instructions && (
                    <p className="text-[11px] text-muted-foreground pt-2 border-t border-border/30 leading-relaxed">
                      {paymentMethods.transfer_details.instructions}
                    </p>
                  )}
                </div>
              )}

              {/* Form */}
              <div className="space-y-3">
                {/* Upload comprobante */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Comprobante de pago *</Label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />

                  {proofPreview ? (
                    <div className="relative rounded-xl border border-border/50 overflow-hidden bg-secondary/20">
                      <img
                        src={proofPreview}
                        alt="Comprobante"
                        className="w-full max-h-48 object-contain"
                      />
                      <button
                        onClick={removeFile}
                        className="absolute top-2 right-2 bg-black/70 hover:bg-red-500 text-white rounded-full p-1 transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                      <div className="px-3 py-2 bg-secondary/50 text-xs text-muted-foreground flex items-center gap-1.5">
                        <ImageIcon className="h-3.5 w-3.5 text-emerald-400" />
                        {proofFile?.name}
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full rounded-xl border-2 border-dashed border-border/50 hover:border-cyan-500/50 bg-secondary/10 hover:bg-cyan-500/5 transition-colors py-8 flex flex-col items-center gap-2"
                    >
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-cyan-500/10">
                        <Upload className="h-6 w-6 text-cyan-400" />
                      </div>
                      <p className="text-sm font-medium text-foreground">Subir comprobante</p>
                      <p className="text-xs text-muted-foreground">Toca para seleccionar una foto o captura de pantalla</p>
                    </button>
                  )}
                </div>

                {/* Número de transacción */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Número de transacción (opcional)</Label>
                  <Input
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    placeholder="Ej: TRX-123456789"
                    className="bg-secondary/30 border-border/50"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => setTransferDialog(false)} className="flex-1" disabled={sendingTransfer}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleTransferSubmit}
                  disabled={sendingTransfer || uploadingProof}
                  className="flex-1 bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white gap-1.5"
                >
                  {sendingTransfer ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {uploadingProof ? 'Subiendo...' : 'Enviando...'}
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Enviar Comprobante
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function DetailRow({ label, value, onCopy, mono }: {
  label: string
  value: string
  onCopy: (value: string, label: string) => void
  mono?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-2 text-xs">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <div className="flex items-center gap-1.5 min-w-0 flex-1 justify-end">
        <span className={`text-foreground truncate ${mono ? 'font-mono' : 'font-medium'}`}>{value}</span>
        <button
          type="button"
          onClick={() => onCopy(value, label)}
          className="text-muted-foreground hover:text-cyan-400 transition-colors shrink-0 p-1 rounded hover:bg-cyan-500/10"
          title={`Copiar ${label}`}
        >
          <Copy className="h-3 w-3" />
        </button>
      </div>
    </div>
  )
}
