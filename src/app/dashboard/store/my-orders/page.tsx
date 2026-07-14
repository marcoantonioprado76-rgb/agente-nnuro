'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface OrderItem {
  id: string
  quantity: number
  priceSnapshot: number
  selectedVariants: Record<string, string>
  item: { id: string; title: string; images: any; category: string }
}

interface Order {
  id: string
  totalPrice: number
  status: string
  paymentMethod: string
  txHash: string | null
  createdAt: string
  recipientName: string
  city: string
  country: string
  items: OrderItem[]
}

const STATUS: Record<string, { label: string; color: string; bg: string; border: string; icon: string }> = {
  PENDING:              { label: 'Pendiente de revisión', color: '#f97316', bg: 'rgba(249,115,22,0.1)',  border: 'rgba(249,115,22,0.25)',  icon: '⏳' },
  PENDING_VERIFICATION: { label: 'Verificando cripto',   color: '#F5A623', bg: 'rgba(245,166,35,0.1)',  border: 'rgba(245,166,35,0.3)',   icon: '⛓️' },
  APPROVED:             { label: 'Aprobado',             color: '#00FF88', bg: 'rgba(0,255,136,0.08)',  border: 'rgba(0,255,136,0.2)',    icon: '✓' },
  REJECTED:             { label: 'Rechazado',            color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.25)',   icon: '✕' },
  SHIPPED:              { label: 'Enviado',              color: '#a78bfa', bg: 'rgba(167,139,250,0.1)', border: 'rgba(167,139,250,0.25)', icon: '🚚' },
  DELIVERED:            { label: 'Entregado',            color: '#00FF88', bg: 'rgba(0,255,136,0.1)',   border: 'rgba(0,255,136,0.25)',   icon: '📦' },
}

export default function MyOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/store/orders')
      .then(r => r.json())
      .then(d => { setOrders(d.orders ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  return (
  <div className="dm-page font-ui">
    <div className="px-4 sm:px-6 pt-6 pb-12 max-w-3xl mx-auto">
      <Link href="/dashboard/store" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#6B7280', textDecoration: 'none', marginBottom: 24 }}>
        ← Volver a la tienda
      </Link>

      <div className="mb-6">
        <h1 className="text-xl font-bold text-[#111827] uppercase tracking-widest">Mis Pedidos</h1>
        <div className="h-px w-20 mt-2 rounded-full" style={{ background: 'linear-gradient(90deg, transparent, #D203DD, #FF2DF7, transparent)' }} />
        <p className="text-xs mt-2" style={{ color: '#6B7280' }}>Historial de compras en la tienda MY DIAMOND.</p>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && orders.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div style={{ fontSize: 40, marginBottom: 12 }}>📦</div>
          <p className="text-sm" style={{ color: '#6B7280', marginBottom: 16 }}>No tienes pedidos aún.</p>
          <Link href="/dashboard/store" style={{ color: '#D203DD', fontSize: 13, textDecoration: 'none', border: '1px solid #E4E9F0', borderRadius: 8, padding: '7px 16px' }}>
            Ir a la tienda
          </Link>
        </div>
      )}

      {!loading && orders.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {orders.map(order => {
            const st = STATUS[order.status] ?? STATUS['PENDING']
            return (
              <div key={order.id} style={{ background: 'linear-gradient(180deg, #0B1B2B 0%, #081624 60%, #050B14 100%)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, overflow: 'hidden' }}>
                {/* Header */}
                <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 700, color: '#fff', letterSpacing: '0.05em' }}>#{order.id.slice(0, 8).toUpperCase()}</p>
                    <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>
                      {new Date(order.createdAt).toLocaleString('es-BO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'America/La_Paz' })}
                      {' · '}{order.city}, {order.country}
                    </p>
                  </div>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: st.color, background: st.bg, border: `1px solid ${st.border}`, borderRadius: 99, padding: '3px 9px', whiteSpace: 'nowrap' }}>
                    {st.icon} {st.label}
                  </span>
                </div>

                {/* Items */}
                <div style={{ padding: '12px 16px' }}>
                  {order.items.map((oi, i) => {
                    const images = Array.isArray(oi.item.images) ? oi.item.images : []
                    return (
                      <div key={oi.id} style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: i < order.items.length - 1 ? 10 : 0 }}>
                        <div style={{ width: 44, height: 44, borderRadius: 8, overflow: 'hidden', flexShrink: 0, background: 'rgba(255,255,255,0.04)' }}>
                          {images[0] && <img src={images[0]} alt={oi.item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{oi.item.title}</p>
                          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>
                            {Object.entries(oi.selectedVariants).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                            {Object.keys(oi.selectedVariants).length > 0 && ' · '}
                            x{oi.quantity} · {(oi.priceSnapshot * oi.quantity).toFixed(2)} USDT
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Footer */}
                <div style={{ padding: '10px 16px', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#F5A623' }}>{order.totalPrice.toFixed(2)} USDT</span>
                  </div>
                  {order.txHash && (
                    <a href={`https://bscscan.com/tx/${order.txHash}`} target="_blank" rel="noreferrer"
                      style={{ fontSize: 11, color: '#D203DD', textDecoration: 'none' }}>
                      Ver tx ↗
                    </a>
                  )}
                  {order.status === 'PENDING_VERIFICATION' && (
                    <span style={{ fontSize: 11, color: '#F5A623' }}>⛓️ Verificando en blockchain BSC...</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  </div>
  )
}
