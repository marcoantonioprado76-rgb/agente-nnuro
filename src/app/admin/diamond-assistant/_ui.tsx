'use client'

import type { LucideIcon } from 'lucide-react'
import type { CSSProperties, ReactNode } from 'react'

// ── Paleta MY DIAMOND ──────────────────────────────────────────────
export const BRAND = 'linear-gradient(135deg,#1fb8bb,#147e95,#12303a)'
export const BORDER = '#E4E9F0'
export const TEXT = '#111827'
export const MUTED = '#6B7280'

export const cardStyle: CSSProperties = {
  background: '#fff',
  border: `1px solid ${BORDER}`,
  borderRadius: 16,
  padding: 18,
  boxShadow: '0 1px 3px rgba(17,24,39,0.04)',
}

export interface Accent {
  tint: string
  color: string
}
export const ACCENTS: Accent[] = [
  { tint: 'rgba(255,45,149,0.10)', color: '#1fb8bb' },
  { tint: 'rgba(183,53,184,0.10)', color: '#147e95' },
  { tint: 'rgba(35,59,143,0.10)', color: '#233B8F' },
  { tint: 'rgba(22,163,74,0.10)', color: '#16A34A' },
]
export const DANGER: Accent = { tint: 'rgba(220,38,38,0.10)', color: '#DC2626' }

// ── Encabezado de página (ícono + título + descripción + acción) ───
export function PageHeader({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: BRAND, boxShadow: '0 10px 24px rgba(255,45,149,0.28)' }}>
            <Icon size={19} className="text-white" />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.01em', margin: 0 }}>{title}</h1>
            <p style={{ fontSize: 12, color: MUTED, margin: 0 }}>{description}</p>
          </div>
        </div>
        {action}
      </div>
      <div style={{ height: 1, width: '100%', background: BORDER, margin: '16px 0' }} />
    </>
  )
}

// ── Aviso "En construcción — Fase X" ───────────────────────────────
export function ConstructionBanner({ phase, children }: { phase: string; children: ReactNode }) {
  return (
    <div style={{ ...cardStyle, background: 'linear-gradient(135deg, rgba(255,45,149,0.06), rgba(35,59,143,0.06))', display: 'flex', alignItems: 'center', gap: 13, marginBottom: 18 }}>
      <div style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0, background: 'rgba(183,53,184,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🔨</div>
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: 14, fontWeight: 800, margin: 0 }}>En construcción — {phase}</p>
        <p style={{ fontSize: 12.5, color: MUTED, margin: '3px 0 0', lineHeight: 1.5 }}>{children}</p>
      </div>
    </div>
  )
}

// ── Rejilla de tarjetas ────────────────────────────────────────────
export function CardGrid({ min = 240, children }: { min?: number; children: ReactNode }) {
  return <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(${min}px, 1fr))`, gap: 14 }}>{children}</div>
}

// ── Tarjeta de placeholder (qué irá aquí) ──────────────────────────
export function PlaceholderCard({
  icon: Icon,
  title,
  description,
  accent = ACCENTS[1],
}: {
  icon: LucideIcon
  title: string
  description: string
  accent?: Accent
}) {
  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: accent.tint }}>
          <Icon size={17} style={{ color: accent.color }} />
        </div>
        <p style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>{title}</p>
        <span style={{ marginLeft: 'auto', fontSize: 9.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: MUTED, background: '#F0F3F7', padding: '3px 8px', borderRadius: 999 }}>Pronto</span>
      </div>
      <p style={{ fontSize: 13, color: MUTED, margin: 0, lineHeight: 1.55 }}>{description}</p>
    </div>
  )
}

// ── Tarjeta de métrica (valor placeholder) ─────────────────────────
export function MetricCard({
  icon: Icon,
  label,
  value = '—',
  accent = ACCENTS[1],
}: {
  icon: LucideIcon
  label: string
  value?: string | number
  accent?: Accent
}) {
  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: accent.tint }}>
          <Icon size={17} style={{ color: accent.color }} />
        </div>
        <span style={{ fontSize: 12, fontWeight: 600, color: MUTED }}>{label}</span>
      </div>
      <p style={{ fontSize: 30, fontWeight: 800, lineHeight: 1, margin: 0, color: '#9CA3AF' }}>{value}</p>
    </div>
  )
}

// ── Botón de acción (placeholder, deshabilitado) ───────────────────
export function PlaceholderButton({ icon: Icon, children }: { icon?: LucideIcon; children: ReactNode }) {
  return (
    <span
      title="Disponible pronto"
      style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 10, fontSize: 13, fontWeight: 800, color: '#fff', background: BRAND, opacity: 0.55, cursor: 'not-allowed', boxShadow: '0 8px 20px rgba(183,53,184,0.18)', userSelect: 'none' }}
    >
      {Icon ? <Icon size={15} /> : null}
      {children}
    </span>
  )
}
