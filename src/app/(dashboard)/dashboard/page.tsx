'use client'

import { useState, useEffect } from 'react'
import { Bot, ShoppingBag, MessageSquare, TrendingUp, ArrowRight, Sparkles, CheckCircle2, Zap } from 'lucide-react'
import { Navbar } from '@/components/layout/navbar'
import { useAuth } from '@/hooks/use-auth'
import Link from 'next/link'

interface DashboardData {
  total_bots: number
  active_bots: number
  total_products: number
  total_conversations: number
  total_sales: number
  bots: Array<{ id: string; name: string; status: string }>
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const { profile } = useAuth()

  useEffect(() => {
    fetch('/api/dashboard').then(r => r.ok ? r.json() : null).then(d => { if (d) setData(d) }).finally(() => setLoading(false))
  }, [])

  const firstName = profile?.full_name?.split(' ')[0] || 'Usuario'
  const d = data ?? { total_bots: 0, active_bots: 0, total_products: 0, total_conversations: 0, total_sales: 0, bots: [] }

  const stats = [
    { label: 'Agentes AI',       value: d.total_bots,          icon: Bot,           color: '#8B5CF6' },
    { label: 'Activos ahora',    value: d.active_bots,          icon: Zap,           color: '#10B981' },
    { label: 'Conversaciones',   value: d.total_conversations,  icon: MessageSquare, color: '#06B6D4' },
    { label: 'Ventas',           value: d.total_sales,          icon: ShoppingBag,   color: '#F59E0B' },
  ]

  if (loading) {
    return (
      <div className="flex flex-col flex-1 min-h-0">
        <Navbar title="Panel Principal" />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full border-2 animate-spin" style={{ borderColor: 'rgba(139,92,246,0.12)', borderTopColor: '#8B5CF6' }} />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <Navbar title="Panel Principal" description="Centro de control" />
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 md:p-6 space-y-6">

          {/* Hero */}
          <div className="relative overflow-hidden rounded-2xl">
            <div className="absolute inset-0 bg-gradient-to-br from-[#8B5CF6]/20 via-[#EC4899]/10 to-[#06B6D4]/15" />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg,rgba(12,11,24,0.85),rgba(18,17,28,0.9))' }} />
            <div className="relative p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-1">
                <Sparkles className="h-5 w-5 text-[#8B5CF6]" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8B5CF6]/70">Dashboard</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">
                Hola, <span className="text-[#8B5CF6]">{firstName}</span> 👋
              </h1>
              <p className="text-[#94A3B8] mt-1 text-sm">Aquí tienes el resumen de tu actividad.</p>
              <div className="flex flex-wrap gap-3 mt-6">
                <Link href="/bots" className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-semibold text-white transition-all hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg,#8B5CF6,#06B6D4)', boxShadow: '0 4px 14px rgba(139,92,246,0.3)' }}>
                  <Bot className="h-4 w-4" /> Ver Agentes AI <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                <Link href="/subscription" className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-semibold text-white transition-all hover:opacity-90"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <TrendingUp className="h-4 w-4" /> Mi Suscripción
                </Link>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat) => (
              <div key={stat.label} className="relative overflow-hidden rounded-2xl p-5"
                style={{ background: 'linear-gradient(180deg,rgba(17,29,53,0.9),rgba(13,21,41,0.95))', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl"
                    style={{ background: `${stat.color}15`, border: `1px solid ${stat.color}25` }}>
                    <stat.icon className="h-5 w-5" style={{ color: stat.color }} />
                  </div>
                  <CheckCircle2 className="h-4 w-4 text-[#64748B]/30" />
                </div>
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <p className="text-[11px] text-[#94A3B8]/60 mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Quick access */}
          <div>
            <h2 className="text-sm font-semibold text-[#94A3B8]/60 uppercase tracking-wider mb-4">Accesos rápidos</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { label: 'Agentes de IA',    desc: 'Gestiona tus bots de WhatsApp', href: '/bots',         icon: Bot,           color: '#8B5CF6' },
                { label: 'Tiendas Virtuales', desc: 'Tus tiendas online',            href: '/stores',       icon: ShoppingBag,   color: '#10B981' },
                { label: 'Suscripción',       desc: 'Tu plan activo',                href: '/subscription', icon: TrendingUp,    color: '#F59E0B' },
                { label: 'Mi Perfil',         desc: 'Datos de tu cuenta',            href: '/profile',      icon: Sparkles,      color: '#06B6D4' },
              ].map((item) => (
                <Link key={item.href} href={item.href}
                  className="group flex items-center gap-4 rounded-2xl p-4 transition-all duration-200 hover:scale-[1.01]"
                  style={{ background: 'linear-gradient(180deg,rgba(17,29,53,0.9),rgba(13,21,41,0.95))', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl shrink-0"
                    style={{ background: `${item.color}15`, border: `1px solid ${item.color}25` }}>
                    <item.icon className="h-5 w-5" style={{ color: item.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold text-white">{item.label}</p>
                    <p className="text-[11px] text-[#94A3B8]/50 truncate">{item.desc}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-[#64748B]/30 group-hover:text-[#8B5CF6] transition-colors shrink-0" />
                </Link>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
