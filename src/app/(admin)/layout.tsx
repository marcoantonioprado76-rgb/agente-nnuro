'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AdminSidebar } from '@/components/layout/admin-sidebar'
import { MobileHeader } from '@/components/layout/mobile-header'
import { AdminMobileNav } from '@/components/layout/admin-mobile-nav'
import { AIAssistantBubble } from '@/components/ai-assistant-bubble'
import { useAuth } from '@/hooks/use-auth'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isAdmin, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !isAdmin) {
      router.replace('/dashboard')
    }
  }, [isAdmin, loading, router])

  if (loading || !isAdmin) return null

  return (
    <div className="flex flex-col lg:flex-row min-h-screen" style={{
      background: 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(91, 138, 255, 0.12), transparent), radial-gradient(ellipse 60% 40% at 80% 80%, rgba(124, 58, 237, 0.06), transparent), linear-gradient(180deg, #0C1529 0%, #10203E 50%, #0E1830 100%)',
    }}>
      <AdminSidebar />
      <MobileHeader variant="admin" />
      <main className="flex-1 lg:ml-[280px] overflow-y-auto pb-20 lg:pb-0 min-w-0">
        {children}
      </main>
      <AdminMobileNav />
      <AIAssistantBubble />
    </div>
  )
}
