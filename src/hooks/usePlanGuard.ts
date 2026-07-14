'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export function usePlanGuard() {
  const router = useRouter()

  useEffect(() => {
    fetch('/api/plan-status')
      .then(async r => {
        // Solo procesar si es 200 OK. Errores (401/429/500) NO deben disparar redirect:
        // un 429 por rate-limit o un 500 transitorio dejaría 'plan' undefined y mandaría
        // al usuario a /dashboard/services aunque tenga un plan activo.
        if (!r.ok) return null
        return r.json()
      })
      .then(d => {
        if (!d) return
        // Redirigir SOLO si la API confirma explícitamente plan inactivo o vencido
        const planIsNone = d.plan === 'NONE'
        const planIsExpired = d.expired === true
        if (planIsNone || planIsExpired) {
          router.replace('/dashboard/services')
        }
      })
      .catch(() => {})
  }, [router])
}
