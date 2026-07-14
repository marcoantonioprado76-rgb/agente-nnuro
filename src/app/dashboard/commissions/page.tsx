'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Wallet, Users, Gift, ArrowUpRight } from 'lucide-react'

interface Commission {
  id: string
  type: 'DIRECT_BONUS' | 'SPONSORSHIP_BONUS'
  amount: number
  description: string | null
  createdAt: string
}

interface Summary {
  total: number
  byType: { type: string; total: number; count: number }[]
}

function CommissionsContent() {
  const [commissions, setCommissions] = useState<Commission[]>([])
  const [summary, setSummary] = useState<Summary>({ total: 0, byType: [] })
  const [loading, setLoading] = useState(true)
  const searchParams = useSearchParams()
  const filterType = searchParams.get('type')

  useEffect(() => {
    fetch('/api/commissions')
      .then(r => r.json())
      .then(d => {
        let list = d.commissions || []
        if (filterType === 'PATROCINIO') {
          list = list.filter((c: any) => c.type === 'SPONSORSHIP_BONUS')
        } else if (filterType === 'DIRECTOS' || filterType === 'DIRECTO') {
          list = list.filter((c: any) => c.type === 'DIRECT_BONUS')
        }
        setCommissions(list)
        setSummary(d.summary || { total: 0, byType: [] })
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [filterType])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-10 h-10 border-2 rounded-full animate-spin"
          style={{ borderColor: 'rgba(0,255,136,0.2)', borderTopColor: '#00FF88' }} />
      </div>
    )
  }

  const sponsorTotal = summary.byType.find(t => t.type === 'SPONSORSHIP_BONUS')?.total || 0
  const directTotal = summary.byType.find(t => t.type === 'DIRECT_BONUS')?.total || 0

  return (
    <div className="px-4 sm:px-6 pt-6 max-w-screen-xl mx-auto pb-20 space-y-6">

      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #FF2D95, #B735B8 50%, #233B8F)', border: '1px solid rgba(255,255,255,0.12)' }}>
          <Wallet className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-medium text-[#111827] uppercase tracking-widest">Wallet</h1>
          <p className="text-xs font-light tracking-widest mt-0.5" style={{ color: '#6B7280' }}>Resumen detallado de tus ganancias</p>
        </div>
      </div>

      {/* Línea decorativa */}
      <div className="h-px w-full" style={{ background: 'linear-gradient(90deg, rgba(0,255,136,0.3), #E4E9F0, transparent)' }} />

      {/* Cards resumen */}
      <div className="grid md:grid-cols-3 gap-4">

        {/* Total */}
        <div className="relative rounded-2xl p-6 overflow-hidden"
          style={{
            background: 'linear-gradient(180deg, #0B1B2B 0%, #081624 60%, #050B14 100%)',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 0 30px rgba(0,255,136,0.06)'
          }}>
          <div className="absolute top-0 left-0 right-0 h-px"
            style={{ background: 'linear-gradient(90deg, transparent, #00FF8870, transparent)' }} />
          <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full blur-2xl opacity-20"
            style={{ background: '#00FF88' }} />
          <p className="text-[9px] font-black uppercase tracking-widest mb-3 text-white/55">Total Acumulado</p>
          <div className="flex items-baseline gap-2 mb-4">
            <span className="text-3xl font-black tracking-tighter" style={{ color: '#00FF88' }}>${summary.total.toFixed(2)}</span>
            <span className="text-xs font-black flex items-center" style={{ color: '#00FF88' }}>
              <ArrowUpRight className="w-3 h-3" />100%
            </span>
          </div>
          <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <div className="h-full w-full rounded-full" style={{ background: 'linear-gradient(90deg, #00FF88, #00C2FF)' }} />
          </div>
        </div>

        {/* Bono de Patrocinio */}
        <div className="relative rounded-2xl p-6 overflow-hidden transition-all duration-300 hover:scale-[1.02]"
          style={{
            background: 'linear-gradient(180deg, #0B1B2B 0%, #081624 60%, #050B14 100%)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}>
          <div className="absolute top-0 left-0 right-0 h-px"
            style={{ background: 'linear-gradient(90deg, transparent, #C9A7FF50, transparent)' }} />
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(201,167,255,0.12)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <Gift className="w-4 h-4" style={{ color: '#C9A7FF' }} />
            </div>
            <span className="text-xs font-light text-white/75">Bono de Patrocinio</span>
          </div>
          <p className="text-2xl font-black tracking-tighter" style={{ color: '#C9A7FF' }}>${sponsorTotal.toFixed(2)}</p>
          <p className="text-[9px] font-black uppercase tracking-widest mt-1 text-white/40">20% por activación de plan</p>
        </div>

        {/* Bono Directo */}
        <div className="relative rounded-2xl p-6 overflow-hidden transition-all duration-300 hover:scale-[1.02]"
          style={{
            background: 'linear-gradient(180deg, #0B1B2B 0%, #081624 60%, #050B14 100%)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}>
          <div className="absolute top-0 left-0 right-0 h-px"
            style={{ background: 'linear-gradient(90deg, transparent, #C9A7FF50, transparent)' }} />
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(201,167,255,0.12)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <Users className="w-4 h-4" style={{ color: '#C9A7FF' }} />
            </div>
            <span className="text-xs font-light text-white/75">Bono Directo</span>
          </div>
          <p className="text-2xl font-black tracking-tighter" style={{ color: '#C9A7FF' }}>${directTotal.toFixed(2)}</p>
          <p className="text-[9px] font-black uppercase tracking-widest mt-1 text-white/40">Por referido registrado</p>
        </div>
      </div>

      {/* Historial */}
      <div className="relative rounded-2xl overflow-hidden"
        style={{ border: '1px solid rgba(255,255,255,0.1)', background: 'linear-gradient(180deg, #0B1B2B 0%, #081624 60%, #050B14 100%)' }}>
        <div className="absolute top-0 left-0 right-0 h-px"
          style={{ background: 'linear-gradient(90deg, transparent, #00FF8840, #C9A7FF30, transparent)' }} />

        <div className="p-5 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <h3 className="text-xs font-black uppercase tracking-widest text-white/55">
            Historial de Transacciones
          </h3>
        </div>

        {commissions.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <Wallet className="w-7 h-7 text-white/40" />
            </div>
            <p className="text-sm font-light text-white/40">
              Aún no tienes comisiones registradas.
            </p>
          </div>
        ) : (
          <div>
            {commissions.map((c) => {
              const isSponsor = c.type === 'SPONSORSHIP_BONUS'
              const color = '#C9A7FF'
              const label = isSponsor ? 'Bono de Patrocinio' : 'Bono Directo'
              const Icon = isSponsor ? Gift : Users
              return (
                <div key={c.id} className="p-4 flex items-center justify-between transition-colors"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ background: `${color}10`, border: `1px solid ${color}25` }}>
                      <Icon className="w-4 h-4" style={{ color }} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{label}</p>
                      <p className="text-[10px] font-light text-white/40">
                        {c.description || new Date(c.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-black font-mono" style={{ color: '#00FF88' }}>
                    +${c.amount.toFixed(2)}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

const Spinner = (
  <div className="flex items-center justify-center min-h-[50vh]">
    <div className="w-10 h-10 border-2 rounded-full animate-spin"
      style={{ borderColor: 'rgba(0,255,136,0.2)', borderTopColor: '#00FF88' }} />
  </div>
)

export default function CommissionsPage() {
  return (
  <div className="dm-page font-ui">
    <Suspense fallback={Spinner}>
      <CommissionsContent />
    </Suspense>
  </div>
  )
}
