'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Menu, X, CreditCard, Settings, LogOut, ShieldCheck, ArrowLeft,
  Bot, Store, Package, Activity, Bell,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/use-auth'
import { NuroSmile } from '@/components/shared/nuro-logo'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

const userDrawerItems = [
  { label: 'Suscripcion', href: '/subscription', icon: CreditCard },
  { label: 'Configuracion', href: '/settings', icon: Settings },
]

const adminDrawerItems = [
  { label: 'Bots', href: '/admin/bots', icon: Bot },
  { label: 'Tiendas', href: '/admin/stores', icon: Store },
  { label: 'Productos', href: '/admin/products', icon: Package },
  { label: 'Auditoria', href: '/admin/audit', icon: Activity },
]

interface MobileHeaderProps {
  variant?: 'user' | 'admin'
}

export function MobileHeader({ variant = 'user' }: MobileHeaderProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const pathname = usePathname()
  const { profile, signOut, isAdmin } = useAuth()

  // Close drawer on route change
  useEffect(() => {
    setDrawerOpen(false)
  }, [pathname])

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [drawerOpen])

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : profile?.email?.charAt(0)?.toUpperCase() || 'U'

  const drawerItems = variant === 'admin' ? adminDrawerItems : userDrawerItems

  return (
    <>
      {/* ── MOBILE HEADER ── */}
      <header
        className="sticky top-0 z-40 lg:hidden"
        style={{
          background: 'rgba(10, 17, 34, 0.92)',
          borderBottom: '1px solid rgba(139, 92, 246, 0.06)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        <div className="flex items-center justify-between h-[52px] px-4">
          {/* Left: Logo + Brand */}
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg shrink-0"
              style={{
                background: 'linear-gradient(135deg, rgba(139,92,246,0.12), rgba(56,189,248,0.08))',
                border: '1px solid rgba(139,92,246,0.1)',
              }}
            >
              <NuroSmile size={20} />
            </div>
            <div className="flex flex-col">
              <span className="text-[13px] font-bold text-white leading-tight tracking-tight">
                {variant === 'admin' ? 'Admin' : 'Agente'}
              </span>
              <span className="text-[9px] font-medium text-[#8B5CF6]/60 leading-none tracking-wider uppercase">
                {variant === 'admin' ? 'Panel de control' : 'de Ventas'}
              </span>
            </div>
          </div>

          {/* Right: Notification + Menu */}
          <div className="flex items-center gap-1">
            <Link
              href={variant === 'admin' ? '/admin/dashboard' : '/dashboard'}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-[#64748B]/50 active:bg-white/5 transition-colors"
            >
              <Bell className="h-[18px] w-[18px]" />
            </Link>
            <button
              onClick={() => setDrawerOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-[#64748B]/70 active:bg-white/5 transition-colors"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* ── DRAWER OVERLAY ── */}
      <div
        className={cn(
          'fixed inset-0 z-[60] lg:hidden transition-opacity duration-300',
          drawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        onClick={() => setDrawerOpen(false)}
      >
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      </div>

      {/* ── DRAWER PANEL ── */}
      <aside
        className={cn(
          'fixed top-0 right-0 z-[70] h-full w-[min(300px,85vw)] lg:hidden flex flex-col transition-transform duration-300 ease-out will-change-transform',
          drawerOpen ? 'translate-x-0' : 'translate-x-full'
        )}
        style={{
          background: 'linear-gradient(180deg, #0B1424 0%, #091120 100%)',
          borderLeft: '1px solid rgba(139, 92, 246, 0.08)',
          boxShadow: drawerOpen ? '-20px 0 60px rgba(0,0,0,0.5)' : 'none',
        }}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-5 h-[52px] shrink-0"
          style={{ borderBottom: '1px solid rgba(139, 92, 246, 0.06)' }}
        >
          <span className="text-[13px] font-semibold text-white/80">Menu</span>
          <button
            onClick={() => setDrawerOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#64748B]/60 active:bg-white/5 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* User card */}
        <div className="px-4 pt-4 pb-3">
          <div
            className="flex items-center gap-3 rounded-2xl p-3.5"
            style={{
              background: 'linear-gradient(135deg, rgba(139,92,246,0.06), rgba(167,139,250,0.03))',
              border: '1px solid rgba(139, 92, 246, 0.08)',
            }}
          >
            <Avatar
              className="h-11 w-11 shrink-0"
              style={{ border: '2px solid rgba(139, 92, 246, 0.15)' }}
            >
              {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt={profile?.full_name || ''} />}
              <AvatarFallback
                className="text-sm font-bold text-white"
                style={{ background: 'linear-gradient(135deg, #8B5CF6, #A78BFA)' }}
              >
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-white truncate leading-tight">
                {profile?.full_name || 'Usuario'}
              </p>
              <p className="text-[11px] text-[#64748B]/50 truncate mt-0.5">
                {profile?.email}
              </p>
              <div
                className="inline-flex items-center mt-1.5 rounded-full px-2 h-[18px] text-[9px] font-bold uppercase tracking-wider"
                style={{
                  background: profile?.role === 'admin' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(139, 92, 246, 0.08)',
                  color: profile?.role === 'admin' ? '#F59E0B' : '#8B5CF6',
                }}
              >
                {profile?.role === 'admin' ? 'Admin' : 'Usuario'}
              </div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="mx-5 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.08), transparent)' }} />

        {/* Nav items */}
        <nav className="flex-1 px-3 pt-3 pb-2 space-y-0.5 overflow-y-auto">
          {drawerItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setDrawerOpen(false)}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-4 py-3 text-[13px] font-medium transition-all duration-200 active:scale-[0.98]',
                  isActive
                    ? 'bg-[#8B5CF6]/8 text-white'
                    : 'text-[#64748B]/70 active:bg-white/[0.03]'
                )}
              >
                <item.icon className={cn('h-[18px] w-[18px] shrink-0', isActive ? 'text-[#8B5CF6]' : 'text-[#64748B]/40')} />
                {item.label}
              </Link>
            )
          })}

          {/* Admin link (user variant) */}
          {variant === 'user' && isAdmin && (
            <>
              <div className="my-2.5 mx-3 h-px" style={{ background: 'rgba(255,255,255,0.03)' }} />
              <Link
                href="/admin/dashboard"
                onClick={() => setDrawerOpen(false)}
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-[13px] font-medium text-[#F59E0B]/70 active:bg-[#F59E0B]/5 transition-all active:scale-[0.98]"
              >
                <ShieldCheck className="h-[18px] w-[18px] shrink-0" />
                Panel Admin
              </Link>
            </>
          )}

          {/* Back to user dashboard (admin variant) */}
          {variant === 'admin' && (
            <>
              <div className="my-2.5 mx-3 h-px" style={{ background: 'rgba(255,255,255,0.03)' }} />
              <Link
                href="/dashboard"
                onClick={() => setDrawerOpen(false)}
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-[13px] font-medium text-[#64748B]/60 active:bg-white/[0.03] transition-all active:scale-[0.98]"
              >
                <ArrowLeft className="h-[18px] w-[18px] shrink-0" />
                Dashboard Usuario
              </Link>
            </>
          )}
        </nav>

        {/* Logout */}
        <div className="px-3 py-3 shrink-0" style={{ borderTop: '1px solid rgba(139, 92, 246, 0.06)' }}>
          <button
            onClick={() => { setDrawerOpen(false); signOut() }}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-[13px] font-medium text-red-400/60 active:text-red-400 active:bg-red-500/5 transition-all active:scale-[0.98]"
          >
            <LogOut className="h-[18px] w-[18px] shrink-0" />
            Cerrar sesion
          </button>
        </div>
      </aside>
    </>
  )
}
