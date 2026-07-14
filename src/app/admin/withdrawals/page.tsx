'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { Wallet, Download, Upload, Check, X, Loader2, Clock, RefreshCw, ExternalLink } from 'lucide-react'

interface WithdrawalRow {
  id: string
  amount: number
  walletQrUrl: string | null
  walletAddress: string | null
  proofUrl: string | null
  status: string
  notes: string | null
  createdAt: string
  paidAt: string | null
  user: { username: string; fullName: string; email: string }
}

const STATUS_TABS = ['ALL', 'PENDING', 'APPROVED', 'PAID', 'REJECTED']

const STATUS_BADGE: Record<string, string> = {
  PENDING: 'text-orange-400 bg-orange-500/10 border-orange-500/25',
  APPROVED: 'text-blue-400 bg-blue-500/10 border-blue-500/25',
  PAID: 'text-green-400 bg-green-500/10 border-green-500/25',
  REJECTED: 'text-red-400 bg-red-500/10 border-red-500/25',
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pendiente',
  APPROVED: 'Aprobado',
  PAID: 'Pagado',
  REJECTED: 'Rechazado',
  ALL: 'Todos',
}

export default function AdminWithdrawalsPage() {
  const [requests, setRequests] = useState<WithdrawalRow[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('PENDING')
  const [processing, setProcessing] = useState<string | null>(null)
  const [rejectModal, setRejectModal] = useState<{ id: string } | null>(null)
  const [rejectNotes, setRejectNotes] = useState('')
  const [proofModal, setProofModal] = useState<{ id: string } | null>(null)
  const [uploading, setUploading] = useState(false)
  const proofInputRef = useRef<HTMLInputElement>(null)

  const fetchRequests = useCallback(async () => {
    setLoading(true)
    const params = activeTab !== 'ALL' ? `?status=${activeTab}` : ''
    const res = await fetch(`/api/admin/withdrawals${params}`)
    const data = await res.json()
    setRequests(data.requests ?? [])
    setLoading(false)
  }, [activeTab])

  useEffect(() => { fetchRequests() }, [fetchRequests])

  async function handleAction(id: string, action: string, extra?: Record<string, string>) {
    setProcessing(id)
    const res = await fetch(`/api/admin/withdrawals/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...extra }),
    })
    const data = await res.json()
    if (!res.ok) alert(data.error ?? 'Error')
    setProcessing(null)
    setRejectModal(null)
    setRejectNotes('')
    setProofModal(null)
    fetchRequests()
  }

  async function uploadProof(file: File, withdrawalId: string) {
    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/upload', { method: 'POST', body: fd })
    const data = await res.json()
    setUploading(false)
    if (data.url) {
      await handleAction(withdrawalId, 'mark_paid', { proofUrl: data.url })
    } else {
      alert('Error al subir el comprobante')
    }
  }

  return (
  <div className="dm-page font-ui">
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black uppercase tracking-tighter flex items-center gap-2">
            <Wallet size={18} className="text-pink-400" /> Solicitudes de Retiro
          </h1>
          <p className="text-xs text-[#111827]/30 mt-0.5">{requests.length} solicitudes</p>
        </div>
        <button onClick={fetchRequests} className="p-2 rounded-xl bg-[#F4F6FA] border border-[#E4E9F0] hover:bg-[#EEF2F7] transition-colors">
          <RefreshCw size={14} className="text-[#111827]/40" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#F4F6FA] rounded-xl p-1 w-fit flex-wrap">
        {STATUS_TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all ${
              activeTab === tab ? 'bg-purple-600 text-[#111827]' : 'text-[#111827]/40 hover:text-[#111827]/70'
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
            <Wallet size={24} className="text-[#111827]/15 mx-auto mb-2" />
            <p className="text-xs text-[#111827]/20">No hay solicitudes en esta categoría</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {requests.map(r => (
              <div key={r.id} className="px-4 py-4">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="text-sm font-bold">{r.user.fullName}</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_BADGE[r.status] ?? ''}`}>
                        {STATUS_LABEL[r.status] ?? r.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#111827]/30 mb-2">@{r.user.username} · {r.user.email}</p>

                    <div className="flex items-center gap-4 flex-wrap mb-2">
                      <span className="text-xl font-black text-yellow-400">${r.amount.toFixed(2)}</span>
                      <span className="text-[10px] text-[#111827]/25 flex items-center gap-1">
                        <Clock size={9} />
                        {new Date(r.createdAt).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {r.walletAddress && (
                      <div className="flex items-center gap-2 bg-[#F4F6FA] border border-[#E4E9F0] rounded-xl px-3 py-2 mb-2 max-w-sm">
                        <span className="text-[10px] text-[#111827]/40 font-bold">WALLET:</span>
                        <span className="text-[11px] font-mono text-[#111827]/60 truncate">{r.walletAddress}</span>
                      </div>
                    )}

                    {r.walletQrUrl && (
                      <a
                        href={r.walletQrUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-[11px] text-cyan-400 hover:text-cyan-300 mb-2"
                      >
                        <Download size={11} /> Ver/Descargar QR de billetera
                      </a>
                    )}

                    {r.proofUrl && (
                      <a
                        href={r.proofUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-[11px] text-green-400 hover:text-green-300 ml-3"
                      >
                        <ExternalLink size={11} /> Ver comprobante de pago
                      </a>
                    )}

                    {r.notes && (
                      <p className="text-[11px] text-[#111827]/30 italic">Nota: {r.notes}</p>
                    )}
                  </div>

                  {/* Actions */}
                  {processing === r.id || uploading ? (
                    <Loader2 size={16} className="animate-spin text-[#111827]/40 shrink-0" />
                  ) : (
                    <div className="flex flex-col gap-2 shrink-0">
                      {r.status === 'PENDING' && (
                        <>
                          <button
                            onClick={() => handleAction(r.id, 'approve')}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400 text-xs font-bold hover:bg-blue-600/30 transition-colors"
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
                      {(r.status === 'APPROVED' || r.status === 'PENDING') && (
                        <button
                          onClick={() => setProofModal({ id: r.id })}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-600/20 border border-green-500/30 text-green-400 text-xs font-bold hover:bg-green-600/30 transition-colors"
                        >
                          <Upload size={12} /> Subir comprobante
                        </button>
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
            <h3 className="text-sm font-black mb-3 text-red-400">Rechazar retiro</h3>
            <textarea
              placeholder="Motivo del rechazo (opcional)..."
              value={rejectNotes}
              onChange={e => setRejectNotes(e.target.value)}
              rows={3}
              className="w-full bg-[#F4F6FA] border border-[#E4E9F0] rounded-xl px-3 py-2.5 text-sm text-[#111827] placeholder-white/25 outline-none resize-none mb-3"
            />
            <div className="flex gap-2">
              <button onClick={() => setRejectModal(null)} className="flex-1 py-2 rounded-xl bg-[#F4F6FA] text-sm text-[#111827]/50">Cancelar</button>
              <button
                onClick={() => handleAction(rejectModal.id, 'reject', rejectNotes ? { notes: rejectNotes } : {})}
                className="flex-1 py-2 rounded-xl bg-red-600/80 text-sm font-bold text-[#111827] hover:bg-red-600"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload proof modal */}
      {proofModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setProofModal(null)} />
          <div className="relative bg-[#13131f] border border-[#E4E9F0] rounded-2xl p-5 w-full max-w-sm z-10">
            <h3 className="text-sm font-black mb-1">Subir comprobante de pago</h3>
            <p className="text-xs text-[#111827]/30 mb-4">El retiro se marcará como PAGADO automáticamente.</p>
            <input
              ref={proofInputRef}
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={e => {
                const file = e.target.files?.[0]
                if (file) uploadProof(file, proofModal.id)
              }}
            />
            <button
              onClick={() => proofInputRef.current?.click()}
              className="w-full py-3 rounded-xl border-2 border-dashed border-[#E4E9F0] text-[#111827]/40 hover:border-purple-500/40 hover:text-purple-400 transition-colors text-sm mb-3"
            >
              {uploading ? <Loader2 size={16} className="animate-spin mx-auto" /> : '📎 Seleccionar archivo'}
            </button>
            <button onClick={() => setProofModal(null)} className="w-full py-2 rounded-xl bg-[#F4F6FA] text-sm text-[#111827]/40">Cancelar</button>
          </div>
        </div>
      )}
    </div>
  </div>
  )
}
