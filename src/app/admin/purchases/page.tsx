'use client'

import { useEffect, useState, useCallback } from 'react'
import { ShoppingBag, Check, X, Loader2, Clock, RefreshCw, ExternalLink, FileImage, Hash } from 'lucide-react'

interface PurchaseRequest {
  id: string
  plan: string
  price: number
  paymentMethod: string
  paymentProofUrl: string | null
  txHash: string | null
  faseGlobalCode: string | null
  faseGlobalNote: string | null
  status: string
  notes: string | null
  createdAt: string
  user: { username: string; fullName: string; email: string; country: string }
}

const STATUS_TABS = ['ALL', 'PENDING', 'PENDING_VERIFICATION', 'APPROVED', 'REJECTED']

const STATUS_BADGE: Record<string, string> = {
  PENDING: 'text-orange-400 bg-orange-500/10 border-orange-500/25',
  PENDING_VERIFICATION: 'text-blue-400 bg-blue-500/10 border-blue-500/25',
  APPROVED: 'text-green-400 bg-green-500/10 border-green-500/25',
  REJECTED: 'text-red-400 bg-red-500/10 border-red-500/25',
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pendiente',
  PENDING_VERIFICATION: 'Verificando on-chain',
  APPROVED: 'Aprobada',
  REJECTED: 'Rechazada',
  ALL: 'Todas',
}

const PLAN_BADGE: Record<string, string> = {
  BASIC: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/25',
  PRO: 'text-purple-400 bg-purple-500/10 border-purple-500/25',
  ELITE: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/25',
}

const PLAN_LABEL: Record<string, string> = {
  BASIC: 'Pack Básico',
  PRO: 'Pack Pro',
  ELITE: 'Pack Elite',
}

export default function AdminPurchasesPage() {
  const [requests, setRequests] = useState<PurchaseRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('PENDING')
  const [processing, setProcessing] = useState<string | null>(null)
  const [rejectModal, setRejectModal] = useState<{ id: string } | null>(null)
  const [rejectNotes, setRejectNotes] = useState('')
  const [proofPreview, setProofPreview] = useState<string | null>(null)

  const fetchRequests = useCallback(async () => {
    setLoading(true)
    const params = activeTab !== 'ALL' ? `?status=${activeTab}` : ''
    const res = await fetch(`/api/admin/purchases${params}`)
    const data = await res.json()
    setRequests(data.requests ?? [])
    setLoading(false)
  }, [activeTab])

  useEffect(() => { fetchRequests() }, [fetchRequests])

  async function handleAction(id: string, action: 'approve' | 'reject', notes?: string) {
    setProcessing(id)
    const res = await fetch(`/api/admin/purchases/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, notes }),
    })
    const data = await res.json()
    if (!res.ok) {
      alert(data.error ?? 'Error al procesar')
    }
    setProcessing(null)
    setRejectModal(null)
    setRejectNotes('')
    fetchRequests()
  }

  /** Re-verifica on-chain una compra CRYPTO PENDING_VERIFICATION sin esperar al cron. */
  async function handleReverify(id: string) {
    setProcessing(id)
    try {
      const res = await fetch(`/api/admin/purchases/${id}/reverify`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error ?? 'Error al re-verificar')
      } else if (data.verified) {
        alert(`✓ Transacción verificada on-chain. ${data.amountUsdt?.toFixed(2)} USDT recibidos. Plan activado.`)
      } else {
        alert(`Aún no verifica on-chain:\n\n${data.error ?? 'Sin detalle'}\n\nEs normal si tu pago es reciente — esperá 1-2 min más y volvé a intentar.`)
      }
    } catch (e: any) {
      alert(e?.message ?? 'Error de conexión')
    }
    setProcessing(null)
    fetchRequests()
  }

  return (
  <div className="dm-page font-ui">
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black uppercase tracking-tighter flex items-center gap-2">
            <ShoppingBag size={18} className="text-orange-400" /> Solicitudes de Compra
          </h1>
          <p className="text-xs text-[#111827]/30 mt-0.5">{requests.length} solicitudes</p>
        </div>
        <button
          onClick={fetchRequests}
          className="p-2 rounded-xl bg-[#F4F6FA] border border-[#E4E9F0] hover:bg-[#EEF2F7] transition-colors"
        >
          <RefreshCw size={14} className="text-[#111827]/40" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 bg-[#F4F6FA] rounded-xl p-1">
        {STATUS_TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all ${
              activeTab === tab
                ? 'bg-purple-600 text-[#111827]'
                : 'text-[#111827]/40 hover:text-[#111827]/70'
            }`}
          >
            {STATUS_LABEL[tab]}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="bg-white/[0.025] border border-[#E4E9F0] rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="animate-spin text-purple-400" size={22} />
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-16">
            <ShoppingBag size={24} className="text-[#111827]/15 mx-auto mb-2" />
            <p className="text-xs text-[#111827]/20">No hay solicitudes en esta categoría</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {requests.map(r => (
              <div key={r.id} className="px-4 py-4">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    {/* User + status */}
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="text-sm font-bold">{r.user.fullName}</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_BADGE[r.status] ?? ''}`}>
                        {STATUS_LABEL[r.status] ?? r.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#111827]/30 mb-2">@{r.user.username} · {r.user.email} · {r.user.country}</p>

                    {/* Plan + price + date */}
                    <div className="flex items-center gap-3 flex-wrap mb-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${PLAN_BADGE[r.plan] ?? ''}`}>
                        {PLAN_LABEL[r.plan] ?? r.plan}
                      </span>
                      <span className="text-sm font-black text-[#111827]/80">${r.price.toFixed(2)} USD</span>
                      <span className="text-[10px] text-[#111827]/25 flex items-center gap-1">
                        <Clock size={9} />
                        {new Date(r.createdAt).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {/* Payment method badge */}
                    {r.paymentMethod === 'FASE_GLOBAL' && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border border-green-500/30 bg-green-500/10 text-green-400 mb-2">
                        🌐 Fase Global · Pack Básico forzado
                      </span>
                    )}

                    {/* Payment proof / TX hash */}
                    {r.txHash ? (
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <a
                          href={`https://bscscan.com/tx/${r.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-3 py-2 bg-yellow-500/8 border border-yellow-500/25 rounded-xl hover:bg-yellow-500/15 transition-colors"
                          title="Ver transacción en BSCScan"
                        >
                          <Hash size={13} className="text-yellow-400" />
                          <span className="text-xs font-bold text-yellow-400 font-mono">
                            {r.txHash.slice(0, 8)}...{r.txHash.slice(-6)}
                          </span>
                          <ExternalLink size={11} className="text-yellow-400/60" />
                        </a>
                        <span className="text-[10px] text-[#111827]/30">BSC · USDT-BEP20</span>
                      </div>
                    ) : r.paymentProofUrl ? (
                      <div className="flex items-center gap-2 mb-2">
                        <div
                          onClick={() => setProofPreview(r.paymentProofUrl)}
                          className="flex items-center gap-2 px-3 py-2 bg-green-500/8 border border-green-500/20 rounded-xl cursor-pointer hover:bg-green-500/15 transition-colors"
                        >
                          <FileImage size={13} className="text-green-400" />
                          <span className="text-xs font-bold text-green-400">Comprobante de pago</span>
                          <ExternalLink size={11} className="text-green-400/60" />
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] text-red-400/70 bg-red-500/8 border border-red-500/15 px-2 py-1 rounded-lg">
                          Sin comprobante adjunto
                        </span>
                      </div>
                    )}

                    {/* Fase Global fields */}
                    {r.faseGlobalCode && (
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] text-[#111827]/40">Código Fase Global:</span>
                        <span className="text-[10px] font-black text-green-400 font-mono">{r.faseGlobalCode}</span>
                      </div>
                    )}
                    {r.faseGlobalNote && (
                      <p className="text-[11px] text-[#111827]/30 italic mb-1">Mensaje: {r.faseGlobalNote}</p>
                    )}

                    {r.notes && (
                      <p className="text-[11px] text-[#111827]/30 italic">Nota: {r.notes}</p>
                    )}
                  </div>

                  {/* Actions */}
                  {r.status === 'PENDING' && (
                    <div className="flex items-center gap-2 shrink-0">
                      {processing === r.id ? (
                        <Loader2 size={16} className="animate-spin text-[#111827]/40" />
                      ) : (
                        <>
                          <button
                            onClick={() => handleAction(r.id, 'approve')}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-600/20 border border-green-500/30 text-green-400 text-xs font-bold hover:bg-green-600/30 transition-colors"
                          >
                            <Check size={12} /> Aprobar
                          </button>
                          <button
                            onClick={() => { setRejectModal({ id: r.id }); setRejectNotes('') }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600/15 border border-red-500/25 text-red-400 text-xs font-bold hover:bg-red-600/25 transition-colors"
                          >
                            <X size={12} /> Rechazar
                          </button>
                        </>
                      )}
                    </div>
                  )}

                  {/* Actions — PENDING_VERIFICATION (CRYPTO esperando confirmaciones) */}
                  {r.status === 'PENDING_VERIFICATION' && (
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      {processing === r.id ? (
                        <Loader2 size={16} className="animate-spin text-blue-400" />
                      ) : (
                        <>
                          <button
                            onClick={() => handleReverify(r.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600/15 border border-blue-500/30 text-blue-300 text-xs font-bold hover:bg-blue-600/25 transition-colors"
                            title="Re-verifica la transacción on-chain. Si ya tiene 3 confirmaciones, aprueba la compra."
                          >
                            <RefreshCw size={12} /> Verificar on-chain
                          </button>
                          <button
                            onClick={() => { setRejectModal({ id: r.id }); setRejectNotes('Pago crypto rechazado manualmente.') }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600/10 border border-red-500/20 text-red-400/80 text-[10px] font-bold hover:bg-red-600/20 transition-colors"
                          >
                            <X size={11} /> Rechazar
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reject modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setRejectModal(null)} />
          <div className="relative bg-[#13131f] border border-[#E4E9F0] rounded-2xl p-5 w-full max-w-sm z-10">
            <h3 className="text-sm font-black mb-3 text-red-400">Rechazar solicitud</h3>
            <textarea
              placeholder="Motivo del rechazo (el usuario lo verá)..."
              value={rejectNotes}
              onChange={e => setRejectNotes(e.target.value)}
              rows={3}
              className="w-full bg-[#F4F6FA] border border-[#E4E9F0] rounded-xl px-3 py-2.5 text-sm text-[#111827] placeholder-white/25 outline-none resize-none mb-3"
            />
            <div className="flex gap-2">
              <button onClick={() => setRejectModal(null)} className="flex-1 py-2 rounded-xl bg-[#F4F6FA] text-sm text-[#111827]/50">Cancelar</button>
              <button
                onClick={() => handleAction(rejectModal.id, 'reject', rejectNotes)}
                className="flex-1 py-2 rounded-xl bg-red-600/80 text-sm font-bold text-[#111827] hover:bg-red-600"
              >
                Confirmar rechazo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Proof preview modal */}
      {proofPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setProofPreview(null)}>
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
          <div className="relative z-10 max-w-lg w-full">
            <img
              src={proofPreview}
              alt="Comprobante de pago"
              className="w-full rounded-2xl border border-[#E4E9F0] shadow-2xl"
              onClick={e => e.stopPropagation()}
            />
            <div className="flex gap-3 mt-3">
              <a
                href={proofPreview}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-[#EEF2F7] text-sm font-bold text-[#111827] hover:bg-white/15"
                onClick={e => e.stopPropagation()}
              >
                <ExternalLink size={13} /> Abrir en nueva pestaña
              </a>
              <button onClick={() => setProofPreview(null)} className="px-4 py-2 rounded-xl bg-[#F4F6FA] text-sm text-[#111827]/50">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
  )
}
