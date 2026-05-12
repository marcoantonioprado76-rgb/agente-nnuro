'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AdminSidebar } from '@/components/layout/admin-sidebar'
import { MobileHeader } from '@/components/layout/mobile-header'
import { AdminMobileNav } from '@/components/layout/admin-mobile-nav'
import { TechBackground } from '@/components/layout/tech-background'

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
    <div className="relative flex flex-col lg:flex-row min-h-screen">
      <TechBackground />
      <AdminSidebar />
      <MobileHeader variant="admin" />
      <main className="flex-1 lg:ml-[280px] overflow-y-auto pb-20 lg:pb-0 min-w-0">
        {children}
      </main>
      <AdminMobileNav />
    </div>
  )
}
