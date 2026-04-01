'use client'

import { useEffect, useState, useCallback } from 'react'
import type { Subscription } from '@/types'

export function useSubscription() {
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchSubscription = useCallback(async () => {
    try {
      const res = await fetch('/api/subscriptions')
      if (res.ok) {
        const data = await res.json()
        setSubscription(data)
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSubscription()
  }, [fetchSubscription])

  const isActive = subscription?.status === 'active' && subscription?.approval_status === 'approved'
  const isPending = subscription?.approval_status === 'pending_review'
  const isSuspended = subscription?.approval_status === 'suspended'
  const isRejected = subscription?.approval_status === 'rejected'
  const hasSubscription = !!subscription

  return {
    subscription,
    loading,
    isActive,
    isPending,
    isSuspended,
    isRejected,
    hasSubscription,
    refetch: fetchSubscription,
  }
}
