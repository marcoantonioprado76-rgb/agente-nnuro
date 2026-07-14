'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard,
  Users,
  ShoppingBag,
  Wallet,
  Settings,
  ChevronRight,
  ArrowLeft,
  Shield,
  Menu,
  X,
  Play,
  Gift,
  BookOpen,
  Store,
  Mic,
  Cpu,
  Ticket,
  Package,
  BrainCircuit,
  LayoutTemplate,
  Building2,
  Target,
  Gem,
} from 'lucide-react'

const NAV = [
  { href: '/admin', label: 'Resumen', icon: LayoutDashboard, exact: true },
  { href: '/admin/users', label: 'Usuarios', icon: Users },
  { href: '/admin/organizations', label: 'Empresas', icon: Building2 },
  { href: '/admin/purchases', label: 'Compras', icon: ShoppingBag },
  { href: '/admin/withdrawals', label: 'Retiros', icon: Wallet },
  { href: '/admin/bonuses', label: 'Bonos Extra', icon: Gift },
  { href: '/admin/ai-credits', label: 'Créditos AI', icon: Cpu },
  { href: '/admin/credit-purchases', label: 'Compras Saldo IA', icon: Wallet },
  { href: '/admin/products', label: 'Productos Bots', icon: Package },
  { href: '/admin/bot-templates', label: 'Plantillas AI', icon: BrainCircuit },
  { href: '/admin/recursos', label: 'Recursos', icon: LayoutTemplate },
  { href: '/admin/clipping', label: 'Clipping', icon: Play },
  { href: '/admin/courses', label: 'Cursos', icon: BookOpen },
  { href: '/admin/podcasts', label: 'Podcasts', icon: Mic },
  { href: '/admin/store', label: 'Tienda', icon: Store },
  { href: '/admin/entradas', label: 'Entradas', icon: Ticket },
  { href: '/admin/reto-90d', label: 'Reto 90D', icon: Target },
  { href: '/admin/diamond-assistant', label: 'Diamond Assistant', icon: Gem },
  { href: '/admin/settings', label: 'Precios', icon: Settings },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [checking, setChecking] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    // Skip auth check on the verify page — it has its own flow
    if (pathname.startsWith('/admin/verify')) {
      setChecking(false)
      return
    }
    fetch('/api/admin/stats')
      .then(r => {
        if (r.status === 403 || r.status === 401) {
          router.replace('/dashboard')
        } else {
          setChecking(false)
        }
      })
      .catch(() => router.replace('/dashboard'))
  }, [router, pathname])

  if (checking) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href
    return pathname.startsWith(href)
  }

  const Sidebar = () => (
    <div className="flex flex-col h-full" style={{ background: 'radial-gradient(circle at top left, rgba(255,9,108,0.12), transparent 26%), linear-gradient(180deg, #071522 0%, #0B1B2B 55%, #050B14 100%)' }}>
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #FF2D95 0%, #B735B8 48%, #233B8F 100%)', boxShadow: '0 8px 18px rgba(255,9,108,0.30)' }}>
            <Shield size={15} className="text-white" />
          </div>
          <div>
            <p className="text-[11px] font-black uppercase tracking-widest text-white/80">Admin</p>
            <p className="text-[9px] text-white/30 uppercase tracking-widest">Panel de control</p>
          </div>
        </div>
      </div>

      {/* Nav — scrollable para que se vean todas las opciones aunque sean muchas */}
      <nav className="flex-1 min-h-0 overflow-y-auto px-3 py-4 space-y-0.5">
        {NAV.map(({ href, label, icon: Icon, exact }) => {
          const active = isActive(href, exact)
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                active
                  ? 'text-white'
                  : 'text-white/55 hover:text-white hover:bg-white/5'
              }`}
              style={active ? { background: 'linear-gradient(135deg, #FF2D95 0%, #B735B8 48%, #233B8F 100%)', boxShadow: '0 12px 28px rgba(255,9,108,0.28)' } : undefined}
            >
              <Icon size={15} className={active ? 'text-white' : 'text-white/40'} />
              {label}
              {active && <ChevronRight size={12} className="ml-auto text-white/70" />}
            </Link>
          )
        })}
      </nav>

      {/* Back to dashboard */}
      <div className="px-3 py-4 border-t border-white/5">
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs text-white/30 hover:text-white/60 hover:bg-white/5 transition-all"
        >
          <ArrowLeft size={13} />
          Volver al Dashboard
        </Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex font-ui" style={{ background: 'radial-gradient(circle at top right, rgba(255,9,108,0.08), transparent 28%), radial-gradient(circle at bottom left, rgba(35,59,143,0.08), transparent 30%), linear-gradient(135deg, #EEF2F7 0%, #F5F7FA 45%, #E9EEF5 100%)', color: '#111827' }}>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-56 shrink-0 border-r border-white/5 fixed left-0 top-0 bottom-0">
        <Sidebar />
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative w-56 border-r border-white/5 flex flex-col z-10" style={{ background: '#050B14' }}>
            <Sidebar />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 lg:pl-56 flex flex-col min-h-screen">
        {/* Mobile topbar */}
        <div className="lg:hidden sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-[#E4E9F0] px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => setMobileOpen(true)}
            className="w-8 h-8 rounded-lg bg-[#F0F3F7] border border-[#E4E9F0] flex items-center justify-center"
          >
            <Menu size={15} className="text-[#6B7280]" />
          </button>
          <div className="flex items-center gap-2">
            <Shield size={13} className="text-[#FF096C]" />
            <span className="text-xs font-bold text-[#6B7280] uppercase tracking-widest">Admin Panel</span>
          </div>
        </div>

        <main className="flex-1 p-4 md:p-6 max-w-6xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  )
}
