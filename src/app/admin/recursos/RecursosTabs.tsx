'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href: '/admin/recursos', label: 'Flyers', icon: 'fa-wand-magic-sparkles' },
  { href: '/admin/recursos/presentaciones', label: 'Presentaciones', icon: 'fa-display' },
  { href: '/admin/recursos/libros', label: 'Libros', icon: 'fa-book-open' },
]

export default function RecursosTabs() {
  const pathname = usePathname()
  return (
    <div className="flex gap-1 mb-6 border-b border-[#E4E9F0]">
      {TABS.map(t => {
        const active = pathname === t.href
        return (
          <Link key={t.href} href={t.href}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold border-b-2 -mb-px transition-all ${
              active ? 'border-[#B735B8] text-[#111827]' : 'border-transparent text-[#9CA3AF] hover:text-[#6B7280]'
            }`}>
            <i className={`fa-solid ${t.icon} text-xs`}></i> {t.label}
          </Link>
        )
      })}
    </div>
  )
}
