'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Zap, Check, Loader2, Crown, CreditCard, Landmark, Upload, ImageIcon, X } from 'lucide-react'
import { toast } from 'sonner'
import type { Plan } from '@/types'

interface PaymentMethods {
  stripe: boolean
  transfer: boolean
}

export default function PricingPage() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [subscribing, setSubscribing] = useState<string | null>(null)
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethods>({ stripe: true, transfer: true })

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
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const [plansRes, methodsRes] = await Promise.all([
        fetch('/api/plans'),
        fetch('/api/payment-methods'),
      ])
      if (plansRes.ok) setPlans(await plansRes.json())
      if (methodsRes.ok) setPaymentMethods(await methodsRes.json())
      setLoading(false)
    }
    load()
  }, [])

  const handleStripeCheckout = async (plan: Plan) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    setSubscribing(plan.id)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_id: plan.id }),
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
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
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

  const isPro = (plan: Plan) => plan.slug === 'pro'
  const hasAnyMethod = paymentMethods.stripe || paymentMethods.transfer

  return (
    <div className="min-h-screen bg-gradient-dark">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-glow-purple/10 blur-[100px]" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-glow-blue/10 blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 h-60 w-60 -translate-x-1/2 -translate-y-1/2 rounded-full bg-glow-cyan/5 blur-[80px]" />
      </div>

      <div className="relative max-w-4xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="text-center mb-12">
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

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`relative rounded-2xl border p-[1px] transition-all ${
                  isPro(plan)
                    ? 'bg-gradient-to-b from-purple-500/50 via-cyan-500/30 to-transparent'
                    : 'bg-gradient-to-b from-emerald-500/40 via-cyan-500/20 to-transparent'
                }`}
              >
                {/* Badge */}
                {isPro(plan) && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                    <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0 px-4 py-1 text-xs font-bold uppercase tracking-wider shadow-lg">
                      <Crown className="h-3 w-3 mr-1" />
                      Premium
                    </Badge>
                  </div>
                )}

                <div className={`rounded-2xl p-8 h-full flex flex-col ${
                  isPro(plan) ? 'bg-[#0a0f1e]' : 'bg-[#0c1425]'
                }`}>
                  {/* Plan header */}
                  <div className="mb-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                        isPro(plan) ? 'bg-purple-500/20' : 'bg-emerald-500/20'
                      }`}>
                        <Zap className={`h-5 w-5 ${
                          isPro(plan) ? 'text-purple-400' : 'text-emerald-400'
                        }`} />
                      </div>
                      <h2 className="text-xl font-bold text-white">{plan.name}</h2>
                    </div>

                    <div className="flex items-baseline gap-1 mb-2">
                      <span className="text-4xl font-bold text-white">${plan.price}</span>
                      <span className="text-muted-foreground text-sm">/{plan.currency}/mes</span>
                    </div>

                    <p className="text-sm text-muted-foreground">
                      {isPro(plan)
                        ? 'Acceso completo con todas las funciones premium.'
                        : 'Tu primer bot de ventas en WhatsApp. Ideal para empezar.'}
                    </p>
                  </div>

                  {/* Features */}
                  <div className="flex-1 space-y-3 mb-8">
                    {(plan.features || []).map((feature, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className={`flex h-5 w-5 items-center justify-center rounded-full mt-0.5 shrink-0 ${
                          isPro(plan) ? 'bg-purple-500/20' : 'bg-emerald-500/20'
                        }`}>
                          <Check className={`h-3 w-3 ${
                            isPro(plan) ? 'text-purple-400' : 'text-emerald-400'
                          }`} />
                        </div>
                        <span className="text-sm text-gray-300">{feature}</span>
                      </div>
                    ))}
                  </div>

                  {/* Limits summary */}
                  <div className="grid grid-cols-2 gap-2 mb-6">
                    <div className="bg-secondary/30 rounded-lg px-3 py-2 text-center">
                      <p className="text-lg font-bold text-foreground">{plan.max_bots}</p>
                      <p className="text-[10px] text-muted-foreground uppercase">Bots</p>
                    </div>
                    <div className="bg-secondary/30 rounded-lg px-3 py-2 text-center">
                      <p className="text-lg font-bold text-foreground">{plan.max_products}</p>
                      <p className="text-[10px] text-muted-foreground uppercase">Productos</p>
                    </div>
                    <div className="bg-secondary/30 rounded-lg px-3 py-2 text-center">
                      <p className="text-lg font-bold text-foreground">
                        {plan.max_conversations === -1 ? '∞' : plan.max_conversations.toLocaleString()}
                      </p>
                      <p className="text-[10px] text-muted-foreground uppercase">Conversaciones</p>
                    </div>
                    <div className="bg-secondary/30 rounded-lg px-3 py-2 text-center">
                      <p className="text-lg font-bold text-foreground">{plan.max_whatsapp_numbers}</p>
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
