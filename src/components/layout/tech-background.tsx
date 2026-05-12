/**
 * TechBackground — fondo tecnológico premium app-wide
 *
 * Capas (de atrás hacia adelante):
 *   1. Gradiente vertical oscuro azul-noche
 *   2. Halos ambientales sky / cyan / indigo (muy suaves, blur 120-140px)
 *   3. Tech grid sutil (opacidad 2.5%) con máscara radial en la parte superior
 *
 * Inspirado en Apple Vision Pro / Arc Browser / OpenAI / Tesla UI.
 * Pensado para ir como overlay fixed detrás de todo (z-index -10).
 */
export function TechBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      {/* 1 — Base gradient */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, #05070A 0%, #050810 50%, #03060d 100%)',
        }}
      />
      {/* 2a — Sky ambient halo (top-left) */}
      <div className="absolute top-0 left-1/4 -translate-x-1/2 w-[800px] h-[500px] rounded-full bg-sky-500/[0.06] blur-[140px]" />
      {/* 2b — Cyan ambient halo (mid-right) */}
      <div className="absolute top-1/3 right-0 translate-x-1/4 w-[600px] h-[500px] rounded-full bg-cyan-500/[0.04] blur-[140px]" />
      {/* 2c — Indigo ambient halo (bottom-left) */}
      <div className="absolute bottom-0 left-1/3 w-[500px] h-[400px] rounded-full bg-indigo-500/[0.03] blur-[120px]" />
      {/* 3 — Subtle futuristic tech grid */}
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
          backgroundSize: '80px 80px',
          maskImage: 'radial-gradient(ellipse at top, black 0%, transparent 70%)',
          WebkitMaskImage: 'radial-gradient(ellipse at top, black 0%, transparent 70%)',
        }}
      />
    </div>
  )
}
