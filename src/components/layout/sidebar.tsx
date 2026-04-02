'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Bot,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  CreditCard,
  ShoppingBag,
  Store,
  UserCircle,
  Shield,
  ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { NuroSmile } from '@/components/shared/nuro-logo';

const navItems = [
  { label: 'Panel', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Bots', href: '/bots', icon: Bot },
{ label: 'Tiendas Virtuales', href: '/stores', icon: Store },
  { label: 'Ventas Confirmadas', href: '/sales', icon: ShoppingBag },
  { label: 'Suscripción', href: '/subscription', icon: CreditCard },
  { label: 'Perfil', href: '/profile', icon: UserCircle },
];

const adminItems = [
  { label: 'Panel Admin', href: '/admin/dashboard', icon: ShieldCheck },
  { label: 'Configuración', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { profile, signOut, isAdmin } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : profile?.email?.charAt(0)?.toUpperCase() || 'U';

  const renderNavItem = (item: typeof navItems[0]) => {
    const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
    return (
      <Link
        key={item.href}
        href={item.href}
        className={cn(
          'group relative flex items-center rounded-xl overflow-hidden',
          'transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)]',
          collapsed ? 'justify-center px-2 py-3' : 'gap-3.5 px-3.5 py-2.5',
          isActive
            ? 'sidebar-item-active text-white'
            : 'text-[#8899B4] sidebar-item-hover hover:text-white'
        )}
      >
        <item.icon
          className={cn(
            'shrink-0 transition-all duration-[250ms]',
            collapsed ? 'h-5 w-5' : 'h-[18px] w-[18px]',
            isActive
              ? 'text-[#8B5CF6] drop-shadow-[0_0_6px_rgba(139,92,246,0.35)]'
              : 'text-[#8899B4]/50 group-hover:text-[#CBD5E8] group-hover:drop-shadow-[0_0_4px_rgba(139,92,246,0.12)]'
          )}
        />
        {!collapsed && (
          <span
            className={cn(
              'text-[13px] font-medium transition-all duration-[250ms]',
              isActive ? 'font-semibold' : ''
            )}
          >
            {item.label}
          </span>
        )}
      </Link>
    );
  };

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 flex h-screen flex-col border-r transition-all duration-300',
        'hidden lg:flex',
        collapsed ? 'w-[72px]' : 'w-[260px]'
      )}
      style={{
        background: 'linear-gradient(180deg, #0E1830 0%, #0C152A 50%, #0A1224 100%)',
        borderColor: 'rgba(139, 92, 246, 0.08)',
      }}
    >
      {/* Brand Header */}
      <div className={cn('sidebar-brand-header', collapsed && '!px-3 !py-4 flex justify-center')}>
        <div className={cn('flex items-center', collapsed ? 'justify-center' : 'gap-3.5')}>
          <div className={cn('sidebar-logo-wrap', collapsed && 'sidebar-logo-wrap-sm')}>
            <NuroSmile size={collapsed ? 26 : 38} />
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="sidebar-brand-name">
                Agente de <span className="brand-accent">Ventas</span>
              </span>
              <span className="sidebar-brand-subtitle">
                Automatización IA
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col px-3 py-4 overflow-y-auto">
        {/* Section label */}
        <div className={cn('mb-3 px-3.5', collapsed && 'hidden')}>
          <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#8899B4]/40">
            Principal
          </span>
        </div>

        {/* Nav items */}
        <div className="space-y-1">
          {navItems.map(renderNavItem)}
        </div>

        {/* Admin section */}
        {isAdmin && (
          <>
            <div className={cn('px-3.5 mt-7 mb-3', collapsed && 'hidden')}>
              <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#8899B4]/40">
                Admin
              </span>
            </div>
            {!collapsed && (
              <div className="mx-3.5 mb-3 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.03), transparent)' }} />
            )}
            <div className="space-y-1">
              {adminItems.map(renderNavItem)}
            </div>
          </>
        )}

        {/* AI Assistant Orb */}
        <div className={cn('flex justify-center mt-auto pb-12')}>
          <button
            onClick={() => {
              const event = new CustomEvent('toggle-ai-assistant')
              window.dispatchEvent(event)
            }}
            className="group relative cursor-pointer ai-orb-container"
            aria-label="Abrir asistente IA"
          >
            <div className="absolute -inset-4 ai-orb-ring border border-[#8B5CF6]/15 pointer-events-none" />
            <div className="relative w-16 h-16 rounded-full overflow-hidden ai-orb-core">
              <div className="absolute inset-0 ai-orb-energy opacity-50" />
              <img
                src="/images/ai-bubble.png"
                alt="Asistente IA"
                className="relative w-full h-full object-cover rounded-full z-[1]"
              />
              <div className="absolute inset-0 ai-orb-shimmer z-[2] pointer-events-none" />
            </div>
            <div className="absolute -inset-2 rounded-full bg-[#8B5CF6]/0 group-hover:bg-[#8B5CF6]/8 transition-all duration-500 pointer-events-none" />
          </button>
        </div>
      </nav>

      {/* Divider */}
      <div className="mx-4 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.1), transparent)' }} />

      {/* User Identity Panel */}
      <div className="p-3 relative">
        {/* Expanded menu */}
        {userMenuOpen && !collapsed && (
          <div
            className="absolute bottom-full left-3 right-3 mb-1 rounded-xl p-1.5 z-50 animate-fade-in-up"
            style={{
              background: 'linear-gradient(180deg, rgba(18, 32, 58, 0.98), rgba(14, 24, 48, 0.98))',
              border: '1px solid rgba(139, 92, 246, 0.12)',
              boxShadow: '0 -8px 32px rgba(0, 0, 0, 0.3), 0 0 30px rgba(139, 92, 246, 0.04)',
              backdropFilter: 'blur(24px)',
            }}
          >
            <Link
              href="/profile"
              onClick={() => setUserMenuOpen(false)}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[12px] font-medium text-[#8899B4] transition-all duration-200 hover:text-white hover:bg-white/[0.04]"
            >
              <UserCircle className="h-4 w-4 text-[#8B5CF6]" />
              Ver perfil
            </Link>
            <Link
              href="/subscription"
              onClick={() => setUserMenuOpen(false)}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[12px] font-medium text-[#8899B4] transition-all duration-200 hover:text-white hover:bg-white/[0.04]"
            >
              <CreditCard className="h-4 w-4 text-[#A78BFA]" />
              Suscripcion
            </Link>
            <div className="my-1 h-px mx-2" style={{ background: 'rgba(255, 255, 255, 0.04)' }} />
            <button
              onClick={() => { setUserMenuOpen(false); signOut(); }}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-[12px] font-medium text-[#EF4444]/70 transition-all duration-200 hover:text-[#EF4444] hover:bg-[#EF4444]/5"
            >
              <LogOut className="h-4 w-4" />
              Cerrar sesion
            </button>
          </div>
        )}

        {/* User card */}
        <button
          onClick={() => !collapsed ? setUserMenuOpen(!userMenuOpen) : undefined}
          className={cn(
            'w-full flex items-center rounded-xl transition-all duration-300 group',
            collapsed ? 'justify-center p-2.5' : 'gap-3 p-3',
          )}
          style={{
            background: userMenuOpen
              ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.06), rgba(167, 139, 250, 0.04))'
              : 'rgba(255, 255, 255, 0.02)',
            border: `1px solid ${userMenuOpen ? 'rgba(139, 92, 246, 0.12)' : 'rgba(255, 255, 255, 0.03)'}`,
          }}
        >
          {/* Avatar */}
          <div className="relative shrink-0">
            <Avatar
              className="h-9 w-9 shadow-md transition-transform duration-200 group-hover:scale-105"
              style={{ border: '2px solid rgba(139, 92, 246, 0.2)' }}
            >
              {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt={profile?.full_name || ''} />}
              <AvatarFallback
                className="text-xs font-bold text-white"
                style={{ background: 'linear-gradient(135deg, #8B5CF6, #A78BFA)' }}
              >
                {initials}
              </AvatarFallback>
            </Avatar>
            <div
              className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full flex items-center justify-center"
              style={{ background: '#0C152A', border: '2px solid #0C152A' }}
            >
              <div className="h-1.5 w-1.5 rounded-full bg-[#10B981] animate-pulse" />
            </div>
          </div>

          {!collapsed && (
            <>
              <div className="flex flex-1 flex-col items-start overflow-hidden">
                <span className="truncate text-[13px] font-semibold text-white w-full text-left">
                  {profile?.full_name || profile?.email || 'Usuario'}
                </span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className="inline-flex items-center gap-1 rounded-full px-1.5 h-4 text-[8px] font-bold uppercase tracking-wider"
                    style={{
                      background: profile?.role === 'admin' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(139, 92, 246, 0.08)',
                      color: profile?.role === 'admin' ? '#F59E0B' : '#8B5CF6',
                    }}
                  >
                    <Shield className="h-2 w-2" />
                    {profile?.role === 'admin' ? 'Admin' : 'Usuario'}
                  </span>
                </div>
              </div>

              <ChevronUp
                className={cn(
                  'h-3.5 w-3.5 text-[#8899B4]/30 shrink-0 transition-transform duration-200',
                  userMenuOpen ? 'rotate-0' : 'rotate-180'
                )}
              />
            </>
          )}
        </button>
      </div>

      {/* Collapse Button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 flex h-6 w-6 items-center justify-center rounded-full text-[#8899B4] hover:text-white transition-all duration-200 hover:scale-110"
        style={{
          background: '#142240',
          border: '1px solid rgba(139, 92, 246, 0.15)',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2), 0 0 12px rgba(139, 92, 246, 0.05)',
        }}
      >
        {collapsed ? (
          <ChevronRight className="h-3 w-3" />
        ) : (
          <ChevronLeft className="h-3 w-3" />
        )}
      </button>
    </aside>
  );
}
