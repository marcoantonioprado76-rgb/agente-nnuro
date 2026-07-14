'use client'

import { useEffect, useState } from 'react'
import { Sparkles } from 'lucide-react'

/**
 * "IA pensando" — vista de carga premium de marca (MY DIAMOND).
 * Ícono con gradiente rosa→morado→azul + glow, mensaje que rota con transición
 * suave, y barra shimmer indeterminada. variant="full" para overlays de sección;
 * variant="compact" para slots pequeños (imágenes).
 * (Antes usaba clases CSS inexistentes → salía un bloque azul plano.)
 */
const GRAD = 'linear-gradient(135deg, #FF2D95 0%, #B735B8 48%, #233B8F 100%)'

export function AiThinking({ messages, className = '', variant = 'full' }:
    { messages: string[]; className?: string; variant?: 'full' | 'compact' }) {
    const compact = variant === 'compact'
    const [idx, setIdx] = useState(0)
    const [show, setShow] = useState(true)

    useEffect(() => {
        if (messages.length <= 1) return
        const iv = setInterval(() => {
            setShow(false)
            setTimeout(() => { setIdx(i => (i + 1) % messages.length); setShow(true) }, 280)
        }, 2300)
        return () => clearInterval(iv)
    }, [messages.length])

    const Dots = ({ size = 5 }: { size?: number }) => (
        <div className="flex items-center gap-1.5">
            {[0, 1, 2].map(i => (
                <span key={i} className="ai-dot rounded-full" style={{
                    width: size, height: size, background: GRAD, animationDelay: `${i * 0.16}s`,
                }} />
            ))}
        </div>
    )

    if (compact) {
        return (
            <div className={`absolute inset-0 flex flex-col items-center justify-center gap-2.5 bg-[#050B14]/85 backdrop-blur-sm px-3 ${className}`}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: GRAD, boxShadow: '0 0 22px -2px rgba(183,53,184,0.55)' }}>
                    <Sparkles size={15} className="text-white animate-pulse" />
                </div>
                <p className="text-[10px] font-bold text-center text-white/90 transition-all duration-300 leading-snug"
                    style={{ opacity: show ? 1 : 0 }}>{messages[idx]}</p>
                <Dots size={4} />
            </div>
        )
    }

    return (
        <div className={`flex flex-col items-center justify-center gap-5 py-14 ${className}`}>
            {/* Ícono de marca con glow y anillo pulsante */}
            <div className="relative w-16 h-16 flex items-center justify-center">
                <span className="absolute inset-0 rounded-full animate-ping" style={{ background: 'rgba(183,53,184,0.18)' }} />
                <span className="absolute -inset-1 rounded-3xl blur-xl" style={{ background: 'rgba(255,45,149,0.25)' }} />
                <div className="relative w-14 h-14 rounded-3xl flex items-center justify-center"
                    style={{ background: GRAD, boxShadow: '0 12px 30px -8px rgba(183,53,184,0.7), inset 0 1px 0 rgba(255,255,255,0.25)' }}>
                    <Sparkles size={24} className="text-white animate-pulse" />
                </div>
            </div>

            {/* Mensaje que rota */}
            <p className="text-base sm:text-lg font-extrabold text-center px-6 text-white transition-all duration-300 min-h-[1.6em]"
                style={{ opacity: show ? 1 : 0, transform: show ? 'translateY(0)' : 'translateY(6px)' }}>
                {messages[idx]}
            </p>

            {/* Barra shimmer indeterminada */}
            <div className="relative w-52 max-w-[70%] h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                <div className="absolute inset-y-0 w-1/2 rounded-full ai-shimmer-bar" style={{ background: GRAD }} />
            </div>

            <Dots />
        </div>
    )
}
