'use client'

import { useEffect, useRef, useState } from 'react'
import { ShieldAlert, X } from 'lucide-react'

export default function ScreenshotGuard() {
  const [visible, setVisible] = useState(false)
  // Evita que keydown + keyup disparen el modal dos veces por el mismo evento
  const triggered = useRef(false)

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      const isPrintScreen = e.key === 'PrintScreen' || e.code === 'PrintScreen'

      // NOTA: Mac Cmd+Shift+3/4/5 son interceptadas por el OS ANTES de llegar al browser.
      // No es posible detectarlas desde JavaScript — removido para evitar falsa sensación de seguridad.

      if (!isPrintScreen) return

      // Deduplicar: keydown y keyup pueden ambos disparar para PrintScreen en ciertos browsers
      if (triggered.current) return
      triggered.current = true
      setTimeout(() => { triggered.current = false }, 500)

      e.preventDefault()
      setVisible(true)
    }

    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setVisible(false)
    }

    // Escuchar en AMBOS eventos: keydown (Chrome/Edge) y keyup (Firefox en algunos sistemas)
    window.addEventListener('keydown', handleKey)
    window.addEventListener('keyup', handleKey)
    window.addEventListener('keydown', handleEscape)

    return () => {
      window.removeEventListener('keydown', handleKey)
      window.removeEventListener('keyup', handleKey)
      window.removeEventListener('keydown', handleEscape)
    }
  }, [])

  if (!visible) return null

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="screenshot-title"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
    >
      <div
        className="relative w-full max-w-sm rounded-2xl overflow-hidden"
        style={{ background: '#0D0F1E', border: '1px solid rgba(239,68,68,0.3)' }}
      >
        {/* Top accent */}
        <div className="h-px w-full" style={{ background: 'linear-gradient(90deg, transparent, rgba(239,68,68,0.9) 50%, transparent)' }} />

        <div className="p-6 flex flex-col items-center text-center gap-4">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}
          >
            <ShieldAlert size={26} className="text-red-400" />
          </div>

          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-red-400/70 mb-1">
              Acción bloqueada
            </p>
            <h2 id="screenshot-title" className="text-base font-black text-white mb-2">
              Capturas no permitidas
            </h2>
            <p className="text-[12px] text-white/40 leading-relaxed">
              La captura de pantalla está restringida en esta plataforma. El contenido es{' '}
              <span className="text-red-400 font-bold">confidencial</span> y su distribución
              no autorizada puede resultar en la suspensión de tu cuenta.
            </p>
          </div>

          <button
            onClick={() => setVisible(false)}
            autoFocus
            className="w-full py-3 rounded-xl text-xs font-black uppercase tracking-[0.15em] transition-all active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, #991b1b, #7f1d1d)',
              color: '#fff',
              border: '1px solid rgba(239,68,68,0.25)',
              boxShadow: '0 6px 24px rgba(239,68,68,0.2)',
            }}
          >
            Entendido
          </button>
        </div>

        <button
          onClick={() => setVisible(false)}
          aria-label="Cerrar"
          className="absolute top-3 right-3 text-white/20 hover:text-white/60 transition-colors"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
