'use client'

import { useEffect, useState } from 'react'

/** Banner visible cuando el admin está "viendo como" un usuario (impersonación).
 *  Lee la cookie legible `imp_active` (seteada por el endpoint de impersonate). */
export default function ImpersonationBanner() {
  const [name, setName] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const m = document.cookie.match(/(?:^|;\s*)imp_active=([^;]+)/)
    if (m) setName(decodeURIComponent(m[1]))
  }, [])

  if (!name) return null

  async function back() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/stop-impersonating', { method: 'POST' })
      if (res.ok) { window.location.href = '/admin/users'; return }
    } catch { /* noop */ }
    setLoading(false)
  }

  return (
    <div
      className="sticky top-0 z-[60] flex items-center justify-center gap-3 px-4 py-2 text-white text-xs font-bold"
      style={{ background: 'linear-gradient(90deg, #B735B8 0%, #233B8F 100%)', boxShadow: '0 6px 18px rgba(8,22,36,0.35)' }}
    >
      <span>👁️ Estás viendo como <b>@{name}</b> — modo admin</span>
      <button
        onClick={back}
        disabled={loading}
        className="px-3 py-1 rounded-full bg-white/15 hover:bg-white/25 border border-white/30 transition-all active:scale-95 disabled:opacity-60"
      >
        {loading ? 'Volviendo…' : '← Volver al admin'}
      </button>
    </div>
  )
}
