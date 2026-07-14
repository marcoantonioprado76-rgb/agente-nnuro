'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Users,
  ShoppingBag,
  Wallet,
  DollarSign,
  UserCheck,
  Clock,
  ArrowRight,
  Loader2,
} from 'lucide-react'

interface Stats {
  totalUsers: number
  activeUsers: number
  pendingPurchases: number
  pendingWithdrawals: number
  totalRevenue: number
  totalCommissions: number
}

interface PendingPurchase {
  id: string
  plan: string
  price: number
  createdAt: string
  user: { username: string; fullName: string }
}

interface PendingWithdrawal {
  id: string
  amount: number
  createdAt: string
  user: { username: string; fullName: string }
}

const PLAN_COLORS: Record<string, string> = {
  BASIC: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  PRO: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  ELITE: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
}

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [recentPurchases, setRecentPurchases] = useState<PendingPurchase[]>([])
  const [recentWithdrawals, setRecentWithdrawals] = useState<PendingWithdrawal[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/stats')
      .then(r => r.json())
      .then(d => {
        setStats(d.stats)
        setRecentPurchases(d.recentPurchases)
        setRecentWithdrawals(d.recentWithdrawals)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="animate-spin text-purple-400" size={24} />
      </div>
    )
  }

  const statCards = [
    {
      label: 'Total Usuarios',
      value: stats?.totalUsers ?? 0,
      icon: Users,
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/8 border-cyan-500/20',
    },
    {
      label: 'Usuarios Activos',
      value: stats?.activeUsers ?? 0,
      icon: UserCheck,
      color: 'text-green-400',
      bg: 'bg-green-500/8 border-green-500/20',
    },
    {
      label: 'Compras Pendientes',
      value: stats?.pendingPurchases ?? 0,
      icon: ShoppingBag,
      color: 'text-orange-400',
      bg: 'bg-orange-500/8 border-orange-500/20',
      href: '/admin/purchases',
      alert: (stats?.pendingPurchases ?? 0) > 0,
    },
    {
      label: 'Retiros Pendientes',
      value: stats?.pendingWithdrawals ?? 0,
      icon: Wallet,
      color: 'text-pink-400',
      bg: 'bg-pink-500/8 border-pink-500/20',
      href: '/admin/withdrawals',
      alert: (stats?.pendingWithdrawals ?? 0) > 0,
    },
    {
      label: 'Ingresos Aprobados',
      value: `$${(stats?.totalRevenue ?? 0).toFixed(2)}`,
      icon: DollarSign,
      color: 'text-green-400',
      bg: 'bg-green-500/8 border-green-500/20',
    },
    {
      label: 'Comisiones Pagadas',
      value: `$${(stats?.totalCommissions ?? 0).toFixed(2)}`,
      icon: DollarSign,
      color: 'text-yellow-400',
      bg: 'bg-yellow-500/8 border-yellow-500/20',
    },
  ]

  return (
  <div className="dm-page font-ui">
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black uppercase tracking-tighter">Resumen General</h1>
        <p className="text-xs text-[#111827]/30 mt-0.5">Panel de administración MY DIAMOND</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {statCards.map((s, i) => {
          const Icon = s.icon
          const card = (
            <div
              key={i}
              className={`rounded-2xl border p-4 ${s.bg} ${s.href ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''} relative`}
            >
              {s.alert && (
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
              )}
              <Icon size={15} className={`${s.color} mb-2`} />
              <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-[#111827]/30 font-bold uppercase tracking-widest mt-0.5">{s.label}</p>
            </div>
          )
          return s.href ? <Link href={s.href} key={i}>{card}</Link> : card
        })}
      </div>

      {/* Two columns */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Pending purchases */}
        <div className="bg-white/[0.025] border border-[#E4E9F0] rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#E4E9F0]">
            <div className="flex items-center gap-2">
              <ShoppingBag size={13} className="text-orange-400" />
              <p className="text-xs font-black uppercase tracking-widest text-[#111827]/50">Compras Pendientes</p>
            </div>
            <Link href="/admin/purchases" className="text-[10px] text-purple-400 hover:text-purple-300 flex items-center gap-1">
              Ver todo <ArrowRight size={10} />
            </Link>
          </div>

          {recentPurchases.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-xs text-[#111827]/20">No hay compras pendientes</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {recentPurchases.map(r => (
                <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold truncate">{r.user.fullName}</p>
                    <p className="text-[10px] text-[#111827]/30">@{r.user.username}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${PLAN_COLORS[r.plan] ?? 'text-[#111827]/40 bg-[#F4F6FA] border-[#E4E9F0]'}`}>
                    {r.plan}
                  </span>
                  <span className="text-xs font-black text-[#111827]/70">${r.price}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pending withdrawals */}
        <div className="bg-white/[0.025] border border-[#E4E9F0] rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#E4E9F0]">
            <div className="flex items-center gap-2">
              <Wallet size={13} className="text-pink-400" />
              <p className="text-xs font-black uppercase tracking-widest text-[#111827]/50">Retiros Pendientes</p>
            </div>
            <Link href="/admin/withdrawals" className="text-[10px] text-purple-400 hover:text-purple-300 flex items-center gap-1">
              Ver todo <ArrowRight size={10} />
            </Link>
          </div>

          {recentWithdrawals.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-xs text-[#111827]/20">No hay retiros pendientes</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {recentWithdrawals.map(r => (
                <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold truncate">{r.user.fullName}</p>
                    <p className="text-[10px] text-[#111827]/30">@{r.user.username}</p>
                  </div>
                  <div className="flex items-center gap-1 text-xs font-black text-yellow-400">
                    <Clock size={10} />
                    ${r.amount.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  </div>
  )
}
