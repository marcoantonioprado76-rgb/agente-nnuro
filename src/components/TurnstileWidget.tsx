'use client'

import { useEffect, useRef } from 'react'

interface Props {
  onToken: (token: string) => void
  onExpire?: () => void
}

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: object) => string
      reset: (widgetId?: string) => void
      remove: (widgetId: string) => void
      getResponse: (widgetId?: string) => string | undefined
    }
  }
}

export default function TurnstileWidget({ onToken, onExpire }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetId = useRef<string | null>(null)
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
  // Flag para detectar si el componente se desmontó antes de que el script cargara
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    if (!siteKey) return

    function renderWidget() {
      // Race condition: si el componente ya se desmontó no renderizar
      if (!mountedRef.current) return
      if (!containerRef.current || !window.turnstile) return
      // Evitar renderizar dos veces
      if (widgetId.current) return

      widgetId.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        callback: onToken,
        'expired-callback': () => {
          widgetId.current = null
          onExpire?.()
        },
        theme: 'dark',
        size: 'normal',
      })
    }

    if (window.turnstile) {
      renderWidget()
      return () => cleanup()
    }

    const existing = document.querySelector<HTMLScriptElement>('script[data-turnstile]')
    if (!existing) {
      const script = document.createElement('script')
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js'
      script.async = true
      script.dataset.turnstile = '1'
      script.addEventListener('load', renderWidget)
      document.head.appendChild(script)

      return () => {
        script.removeEventListener('load', renderWidget)
        cleanup()
      }
    } else {
      // Script ya existe pero aún no cargó — esperar
      existing.addEventListener('load', renderWidget)
      return () => {
        existing.removeEventListener('load', renderWidget)
        cleanup()
      }
    }
  }, [siteKey, onToken, onExpire])

  function cleanup() {
    mountedRef.current = false
    if (widgetId.current && window.turnstile?.remove) {
      window.turnstile.remove(widgetId.current)
      widgetId.current = null
    }
  }

  if (!siteKey) return null

  return <div ref={containerRef} className="mt-3" />
}
