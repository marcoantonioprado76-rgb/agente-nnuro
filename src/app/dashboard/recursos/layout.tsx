'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href: '/dashboard/recursos/flyers', label: 'Flyers', icon: 'fa-wand-magic-sparkles' },
  { href: '/dashboard/recursos/presentaciones', label: 'Presentaciones', icon: 'fa-display' },
  { href: '/dashboard/recursos/libros', label: 'Libros', icon: 'fa-book-open' },
]

export default function RecursosLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  // Las pestañas se muestran en las páginas de lista; en el editor/visor ([id]) no,
  // para que tengan su propia vista enfocada con su botón "volver".
  const isList = TABS.some(t => pathname === t.href) || pathname === '/dashboard/recursos'

  if (!isList) return <>{children}</>

  return (
    <div className="max-w-6xl mx-auto px-4 pt-6">
      <h1 className="text-2xl font-black text-[#111827] flex items-center gap-2">
        <i className="fa-solid fa-folder-open text-[#B735B8]"></i> Recursos
      </h1>
      <p className="text-sm text-[#6B7280] mt-0.5 mb-4">Plantillas editables, presentaciones y libros.</p>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map(t => {
          const active = pathname.startsWith(t.href)
          return (
            <Link key={t.href} href={t.href}
              className="shrink-0 px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all active:scale-[0.98]"
              style={active
                ? { background: 'linear-gradient(135deg, #FF2D95 0%, #B735B8 48%, #233B8F 100%)', color: '#fff', boxShadow: '0 10px 24px -8px rgba(255,9,108,0.4)' }
                : { background: '#FFFFFF', color: '#6B7280', border: '1px solid #E4E9F0', boxShadow: '0 4px 14px rgba(15,23,42,0.04)' }}>
              <i className={`fa-solid ${t.icon}`}></i> {t.label}
            </Link>
          )
        })}
      </div>

      <div className="py-6">{children}</div>
    </div>
  )
}
