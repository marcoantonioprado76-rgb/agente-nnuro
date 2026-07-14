'use client'

import { useEffect, useState, useCallback } from 'react'
import { Wallet, Check, X, Loader2, RefreshCw, ExternalLink, Hash } from 'lucide-react'

interface CreditPurchaseRequest {
    id: string
    amountUsd: number
    paymentMethod: string
    paymentProofUrl: string | null
    txHash: string | null
    status: string
    notes: string | null
    createdAt: string
    reviewedAt: string | null
    user: {
        id: string
        username: string
        fullName: string
        email: string
        aiBalanceUsd: number
    }
}

const STATUS_TABS = ['PENDING', 'PENDING_VERIFICATION', 'APPROVED', 'REJECTED', 'ALL']

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

export default function AdminCreditPurchasesPage() {
    const [requests, setRequests] = useState<CreditPurchaseRequest[]>([])
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState('PENDING')
    const [processing, setProcessing] = useState<string | null>(null)
    const [rejectModal, setRejectModal] = useState<{ id: string } | null>(null)
    const [rejectNotes, setRejectNotes] = useState('')
    const [proofPreview, setProofPreview] = useState<string | null>(null)

    const fetchRequests = useCallback(async () => {
        setLoading(true)
        const params = activeTab !== 'ALL' ? `?status=${activeTab}` : ''
        const res = await fetch(`/api/admin/credit-purchases${params}`)
        const data = await res.json()
        setRequests(data.purchases ?? [])
        setLoading(false)
    }, [activeTab])

    useEffect(() => { fetchRequests() }, [fetchRequests])

    async function handleAction(id: string, action: 'approve' | 'reject', notes?: string) {
        setProcessing(id)
        const res = await fetch(`/api/admin/credit-purchases/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, notes }),
        })
        const data = await res.json()
        if (!res.ok) alert(data.error ?? 'Error al procesar')
        setProcessing(null)
        setRejectModal(null)
        setRejectNotes('')
        fetchRequests()
    }

    /** Re-verifica on-chain una compra CRYPTO PENDING_VERIFICATION sin esperar al cron. */
    async function handleReverify(id: string) {
        setProcessing(id)
        try {
            const res = await fetch(`/api/admin/credit-purchases/${id}/reverify`, { method: 'POST' })
            const data = await res.json()
            if (!res.ok) {
                alert(data.error ?? 'Error al re-verificar')
            } else if (data.verified) {
                alert(`✓ Transacción verificada on-chain. ${data.amountUsdt?.toFixed(2)} USDT recibidos. Saldo acreditado.\nNuevo balance: $${Number(data.newBalanceUsd ?? 0).toFixed(2)} USD.`)
            } else {
                alert(`Aún no verifica on-chain:\n\n${data.error ?? 'Sin detalle'}\n\nEs normal si el pago es reciente — esperá 1-2 min más.`)
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
                        <Wallet size={18} className="text-violet-400" /> Compras de Saldo IA
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
            <div className="flex gap-2 overflow-x-auto">
                {STATUS_TABS.map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${activeTab === tab ? 'bg-violet-500/15 border border-violet-500/35 text-violet-300' : 'bg-white/3 border border-[#E4E9F0] text-[#111827]/40 hover:text-[#111827]/70 hover:bg-white/8'}`}>
                        {STATUS_LABEL[tab]}
                    </button>
                ))}
            </div>

            {/* List */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
                </div>
            ) : requests.length === 0 ? (
                <div className="py-16 text-center rounded-2xl"
                    style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.07)' }}>
                    <p className="text-sm text-[#111827]/35">Sin solicitudes {STATUS_LABEL[activeTab].toLowerCase()}</p>
                </div>
            ) : (
                <div className="space-y-2.5">
                    {requests.map(r => (
                        <div key={r.id} className="rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-3.5"
                            style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
                            {/* Info */}
                            <div className="flex-1 min-w-0 space-y-1.5">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-sm font-bold text-[#111827] truncate">{r.user.fullName}</span>
                                    <span className="text-[10px] text-[#111827]/30">@{r.user.username}</span>
                                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${STATUS_BADGE[r.status]}`}>
                                        {STATUS_LABEL[r.status]}
                                    </span>
                                </div>
                                <div className="text-[11px] text-[#111827]/40 flex items-center gap-3 flex-wrap">
                                    <span>{r.user.email}</span>
                                    <span>·</span>
                                    <span>Saldo actual: <b className="text-[#111827]/70">${Number(r.user.aiBalanceUsd).toFixed(2)}</b></span>
                                    <span>·</span>
                                    <span>{new Date(r.createdAt).toLocaleString()}</span>
                                </div>
                                {r.txHash && (
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <a href={`https://bscscan.com/tx/${r.txHash}`} target="_blank" rel="noopener noreferrer"
                                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-yellow-500/10 border border-yellow-500/25 hover:bg-yellow-500/15 transition-colors"
                                            title="Ver transacción en BSCScan">
                                            <Hash className="w-3 h-3 text-yellow-400" />
                                            <span className="text-[10px] font-mono font-bold text-yellow-400">
                                                {r.txHash.slice(0, 8)}...{r.txHash.slice(-6)}
                                            </span>
                                            <ExternalLink className="w-2.5 h-2.5 text-yellow-400/60" />
                                        </a>
                                        <span className="text-[9px] text-[#111827]/30">BSC · USDT-BEP20</span>
                                    </div>
                                )}
                                {r.notes && (
                                    <p className="text-[11px] italic text-[#111827]/40">Nota: {r.notes}</p>
                                )}
                            </div>

                            {/* Amount + actions */}
                            <div className="flex items-center gap-3 shrink-0">
                                <div className="text-right">
                                    <p className="text-2xl font-black text-emerald-400 tabular-nums leading-none">+${Number(r.amountUsd).toFixed(2)}</p>
                                    <p className="text-[10px] text-[#111827]/30 mt-1">{r.paymentMethod === 'MANUAL' ? 'Transferencia' : r.paymentMethod}</p>
                                </div>

                                {r.paymentProofUrl && (
                                    <button onClick={() => setProofPreview(r.paymentProofUrl)}
                                        className="w-9 h-9 rounded-lg flex items-center justify-center transition-all hover:bg-white/8"
                                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)' }}
                                        title="Ver comprobante">
                                        <ExternalLink className="w-3.5 h-3.5 text-[#111827]/50" />
                                    </button>
                                )}

                                {r.status === 'PENDING_VERIFICATION' && (
                                    <div className="flex flex-col items-end gap-1.5">
                                        {processing === r.id ? (
                                            <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                                        ) : (
                                            <>
                                                <button
                                                    onClick={() => handleReverify(r.id)}
                                                    className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-blue-600/15 border border-blue-500/30 text-blue-300 hover:bg-blue-600/25 transition-colors"
                                                    title="Re-verifica la transacción on-chain. Si ya tiene 3 confirmaciones, acredita el saldo.">
                                                    <RefreshCw className="w-3.5 h-3.5" /> Verificar on-chain
                                                </button>
                                                <button
                                                    onClick={() => { setRejectModal({ id: r.id }); setRejectNotes('Pago crypto rechazado manualmente.') }}
                                                    className="flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded-lg bg-red-600/10 border border-red-500/20 text-red-400/80 hover:bg-red-600/20 transition-colors">
                                                    <X className="w-3 h-3" /> Rechazar
                                                </button>
                                            </>
                                        )}
                                    </div>
                                )}

                                {r.status === 'PENDING' && (
                                    <div className="flex gap-1.5">
                                        <button
                                            onClick={() => handleAction(r.id, 'approve')}
                                            disabled={processing === r.id}
                                            className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl transition-all active:scale-[0.97] disabled:opacity-50"
                                            style={{ background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.35)', color: '#86efac' }}>
                                            {processing === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                            Aprobar
                                        </button>
                                        <button
                                            onClick={() => setRejectModal({ id: r.id })}
                                            disabled={processing === r.id}
                                            className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl transition-all active:scale-[0.97] disabled:opacity-50"
                                            style={{ background: 'rgba(248,113,113,0.10)', border: '1px solid rgba(248,113,113,0.30)', color: '#fca5a5' }}>
                                            <X className="w-3.5 h-3.5" />
                                            Rechazar
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal Rechazo */}
            {rejectModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                    <div className="w-full max-w-md rounded-2xl p-5 space-y-4"
                        style={{ background: 'rgba(20,24,48,0.95)', border: '1px solid rgba(255,255,255,0.12)' }}>
                        <h2 className="text-base font-black text-[#111827]">Rechazar solicitud</h2>
                        <p className="text-xs text-[#111827]/50">Indicale al usuario por qué se rechaza la compra.</p>
                        <textarea
                            value={rejectNotes}
                            onChange={e => setRejectNotes(e.target.value)}
                            placeholder="Comprobante no válido, monto incorrecto, etc."
                            rows={3}
                            className="w-full px-3.5 py-2.5 rounded-xl text-sm text-[#111827] outline-none resize-none"
                            style={{ background: '#F0F3F7', border: '1px solid rgba(255,255,255,0.12)' }}
                        />
                        <div className="flex gap-2">
                            <button onClick={() => { setRejectModal(null); setRejectNotes('') }}
                                className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all"
                                style={{ background: '#F0F3F7', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.75)' }}>
                                Cancelar
                            </button>
                            <button onClick={() => handleAction(rejectModal.id, 'reject', rejectNotes)}
                                disabled={processing === rejectModal.id}
                                className="flex-1 py-2.5 rounded-xl text-sm font-black transition-all disabled:opacity-50"
                                style={{ background: 'rgba(248,113,113,0.20)', border: '1px solid rgba(248,113,113,0.45)', color: '#fca5a5' }}>
                                {processing === rejectModal.id ? <Loader2 className="w-4 h-4 animate-spin inline" /> : 'Rechazar solicitud'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Preview comprobante */}
            {proofPreview && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
                    onClick={() => setProofPreview(null)}>
                    <img src={proofPreview} alt="Comprobante" className="max-w-full max-h-[90vh] rounded-2xl shadow-2xl" />
                    <button onClick={() => setProofPreview(null)}
                        className="absolute top-4 right-4 w-10 h-10 rounded-xl flex items-center justify-center bg-black/60 backdrop-blur-md border border-[#E4E9F0]">
                        <X className="w-5 h-5 text-[#111827]" />
                    </button>
                </div>
            )}
        </div>
    </div>
    )
}
