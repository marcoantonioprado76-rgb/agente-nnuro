export default function PrismLoader({ small }: { small?: boolean }) {
  if (small) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '40vh', gap: 18 }}>
        {/* mix-blend-mode: screen → el negro del GIF desaparece y solo se ve el neón */}
        <img src="/loader.gif?v=2" alt="" width={150} height={150}
          style={{ mixBlendMode: 'screen', pointerEvents: 'none', userSelect: 'none' }} draggable={false} />
        <span className="prism-text__main">Cargando</span>
      </div>
    )
  }

  return (
    <div className="prism-loader">
      <img src="/loader.gif?v=2" alt="" width={320} height={320}
        style={{ mixBlendMode: 'screen', pointerEvents: 'none', userSelect: 'none' }} draggable={false} />
      <div className="prism-text">
        <span className="prism-text__main">Cargando</span>
        <span className="prism-text__sub">Procesando Datos</span>
      </div>
    </div>
  )
}
