'use client'

import { useEffect } from 'react'

/**
 * Intercepta el envío de los formularios (form[data-lead]) de una página del
 * Constructor Visual y guarda el lead vía /api/b/[slug]/lead. Muestra un
 * "gracias" en el mismo formulario al enviar.
 */
export default function BuilderFormHandler({ slug }: { slug: string }) {
  useEffect(() => {
    const forms = Array.from(document.querySelectorAll<HTMLFormElement>('form[data-lead]'))
    const handler = async (e: Event) => {
      e.preventDefault()
      const form = e.currentTarget as HTMLFormElement
      const fd = new FormData(form)
      const name = (fd.get('name') as string) || null
      const phone = (fd.get('phone') as string) || null
      const email = (fd.get('email') as string) || null
      const data: Record<string, string> = {}
      fd.forEach((v, k) => { if (!['name', 'phone', 'email'].includes(k) && typeof v === 'string' && v) data[k] = v })

      const btn = form.querySelector('button') as HTMLButtonElement | null
      const orig = btn?.textContent || ''
      if (btn) { btn.textContent = 'Enviando…'; btn.disabled = true }
      try {
        const res = await fetch(`/api/b/${slug}/lead`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, phone, email, data: Object.keys(data).length ? data : null }),
        })
        if (res.ok) {
          form.innerHTML = '<p style="text-align:center;padding:24px;color:#22c55e;font-weight:800;font-size:16px;">¡Gracias! Te contactaremos pronto ✅</p>'
        } else {
          const d = await res.json().catch(() => ({}))
          alert(d.error || 'No se pudo enviar. Intentá de nuevo.')
          if (btn) { btn.textContent = orig; btn.disabled = false }
        }
      } catch {
        alert('Error de conexión. Intentá de nuevo.')
        if (btn) { btn.textContent = orig; btn.disabled = false }
      }
    }
    forms.forEach(f => f.addEventListener('submit', handler))
    return () => forms.forEach(f => f.removeEventListener('submit', handler))
  }, [slug])

  return null
}
