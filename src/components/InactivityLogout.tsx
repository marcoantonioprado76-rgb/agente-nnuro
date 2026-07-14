'use client'

import { useEffect, useRef } from 'react'

const TIMEOUT_MS = 24 * 60 * 60 * 1000 // 24 horas

export default function InactivityLogout() {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const reset = () => {
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(async () => {
        await fetch('/api/auth/logout', { method: 'POST' })
        window.location.href = '/'
      }, TIMEOUT_MS)
    }

    const events = ['mousemove', 'keydown', 'pointerdown', 'scroll', 'touchstart']
    events.forEach(e => window.addEventListener(e, reset, { passive: true }))
    reset() // inicia el timer al montar

    return () => {
      if (timer.current) clearTimeout(timer.current)
      events.forEach(e => window.removeEventListener(e, reset))
    }
  }, [])

  return null
}
