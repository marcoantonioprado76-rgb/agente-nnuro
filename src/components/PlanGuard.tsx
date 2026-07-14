'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'

// Pages where expired users are still allowed
const ALLOWED_EXPIRED = ['/dashboard/planes', '/dashboard/store/checkout']

export default function PlanGuard() {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (ALLOWED_EXPIRED.some(p => pathname.startsWith(p))) return

    fetch('/api/plan-status')
      .then(r => r.json())
      .then(data => {
        if (data.expired) router.replace('/dashboard/planes')
      })
      .catch(() => {})
  }, [pathname, router])

  return null
}
