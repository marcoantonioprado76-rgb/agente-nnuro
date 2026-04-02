'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Bot,
  Store,
  ShoppingBag,
  UserCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const mobileNavItems = [
  { label: 'Inicio', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Bots', href: '/bots', icon: Bot },
  { label: 'Tiendas', href: '/stores', icon: Store },
  { label: 'Ventas', href: '/sales', icon: ShoppingBag },
  { label: 'Perfil', href: '/profile', icon: UserCircle },
]

export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 lg:hidden"
      style={{
        background: 'linear-gradient(180deg, rgba(10, 17, 34, 0.98), rgba(8, 13, 26, 0.99))',
        borderTop: '1px solid rgba(139, 92, 246, 0.08)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.3)',
      }}
    >
      <div className="flex items-stretch justify-around h-[56px]">
        {mobileNavItems.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'relative flex flex-col items-center justify-center flex-1 gap-1 transition-colors duration-200',
                isActive
                  ? 'text-[#8B5CF6]'
                  : 'text-[#9189A8]/50 active:text-[#9189A8]/80'
              )}
            >
              {isActive && (
                <div
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-[2.5px] rounded-b-full"
                  style={{ background: 'linear-gradient(90deg, rgba(139,92,246,0.3), #8B5CF6, rgba(139,92,246,0.3))' }}
                />
              )}
              <item.icon
                className={cn(
                  'h-[22px] w-[22px] transition-all duration-200',
                  isActive && 'drop-shadow-[0_0_8px_rgba(139,92,246,0.5)]'
                )}
                strokeWidth={isActive ? 2.2 : 1.8}
              />
              <span className={cn(
                'text-[10px] leading-none tracking-wide',
                isActive ? 'font-bold' : 'font-medium'
              )}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
