'use client'

import { useState, useEffect } from 'react'

const DG = 'linear-gradient(135deg,#FF2D95 0%,#B735B8 48%,#233B8F 100%)'

interface Reporte {
  empresa: { name: string }
  usuarios: { total: number; activos: number; inactivos: number; porPlan: { BASIC: number; PRO: number; ELITE: number; NONE: number } }
  cupo: { usados: number; max: number }
  contenido: { cursos: number; podcasts: number; productos: number; recursos: number; flyers: number }
  solicitudes: { pendientes: number; aprobadas: number }
}

export default function ReportesPage() {
  const [guardOk, setGuardOk] = useState(false)
  const [loading, setLoading] = useState(true)
  const [r, setR] = useState<Reporte | null>(null)

  useEffect(() => {
    fetch('/api/plan-status').then(rr => rr.json()).then(d => {
      if (d.orgRole !== 'ORG_ADMIN') { window.location.href = '/dashboard'; return }
      setGuardOk(true)
      fetch('/api/empresa/reportes').then(rr => rr.json()).then(d => { setR(d); setLoading(false) }).catch(() => setLoading(false))
    }).catch(() => { window.location.href = '/dashboard' })
  }, [])

  if (!guardOk) return <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#0B1B2B', color: '#fff' }}><p style={{ opacity: 0.7 }}>Cargando…</p></div>

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg,#F5F7FB,#EEF1F8)', color: '#0B1B2B' }}>
      <header style={{ background: 'linear-gradient(135deg,#0B1B2B,#050B14)', color: '#fff', padding: '14px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src="/logo-oficial-mydiamond.png" alt="MY DIAMOND" style={{ height: 32 }} />
          <p style={{ fontWeight: 800, fontSize: 15 }}>Reportes</p>
        </div>
        <a href="/empresa" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', padding: '8px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
          <i className="fa-solid fa-arrow-left" style={{ marginRight: 6 }} />Volver
        </a>
      </header>

      <main style={{ maxWidth: 900, margin: '0 auto', padding: '24px 18px 60px' }}>
        {loading || !r ? <p style={{ color: '#9AA3B2', textAlign: 'center', padding: 30 }}>Cargando…</p> : (
          <>
            {/* Usuarios */}
            <h2 style={{ fontSize: 16, fontWeight: 800, marginBottom: 10 }}>Usuarios</h2>
            <div style={grid}>
              <Stat label="Total" value={r.usuarios.total} icon="fa-users" />
              <Stat label="Activos" value={r.usuarios.activos} icon="fa-circle-check" color="#16a34a" />
              <Stat label="Inactivos" value={r.usuarios.inactivos} icon="fa-circle-pause" color="#9AA3B2" />
              <Stat label="Cupo" value={`${r.cupo.usados} / ${r.cupo.max || '∞'}`} icon="fa-gauge" gradient />
            </div>

            {/* Por plan */}
            <h2 style={{ fontSize: 16, fontWeight: 800, margin: '22px 0 10px' }}>Por plan</h2>
            <div style={grid}>
              <Stat label="Básico" value={r.usuarios.porPlan.BASIC} icon="fa-bolt" />
              <Stat label="Pro" value={r.usuarios.porPlan.PRO} icon="fa-star" />
              <Stat label="Elite" value={r.usuarios.porPlan.ELITE} icon="fa-crown" />
              <Stat label="Sin plan" value={r.usuarios.porPlan.NONE} icon="fa-minus" color="#9AA3B2" />
            </div>

            {/* Contenido */}
            <h2 style={{ fontSize: 16, fontWeight: 800, margin: '22px 0 10px' }}>Tu contenido</h2>
            <div style={grid}>
              <Stat label="Cursos" value={r.contenido.cursos} icon="fa-graduation-cap" />
              <Stat label="Podcasts" value={r.contenido.podcasts} icon="fa-microphone" />
              <Stat label="Productos" value={r.contenido.productos} icon="fa-bag-shopping" />
              <Stat label="Recursos" value={r.contenido.recursos} icon="fa-book" />
            </div>

            {/* Solicitudes */}
            <h2 style={{ fontSize: 16, fontWeight: 800, margin: '22px 0 10px' }}>Solicitudes de pago</h2>
            <div style={grid}>
              <Stat label="Pendientes" value={r.solicitudes.pendientes} icon="fa-clock" color={r.solicitudes.pendientes > 0 ? '#f59e0b' : '#9AA3B2'} />
              <Stat label="Aprobadas" value={r.solicitudes.aprobadas} icon="fa-check-double" color="#16a34a" />
            </div>
          </>
        )}
      </main>
    </div>
  )
}

const grid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }

function Stat({ label, value, icon, color, gradient }: { label: string; value: number | string; icon: string; color?: string; gradient?: boolean }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #E4E9F0', borderRadius: 14, padding: '16px 18px', boxShadow: '0 6px 18px -14px rgba(11,27,43,0.35)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <i className={`fa-solid ${icon}`} style={{ color: color || '#B735B8', fontSize: 14 }} />
        <span style={{ fontSize: 12, fontWeight: 700, color: '#9AA3B2', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
      </div>
      <p style={{ fontSize: 26, fontWeight: 900, ...(gradient ? { background: DG, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' } : { color: color || '#0B1B2B' }) }}>{value}</p>
    </div>
  )
}
