'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { CSSProperties } from 'react'
import { Gem, LayoutDashboard, Bot, Brain, Users, Megaphone } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

// ── Paleta MY DIAMOND ──────────────────────────────────────────────
const BRAND = 'linear-gradient(135deg,#FF2D95,#B735B8,#233B8F)'
const BORDER = '#E4E9F0'
const TEXT = '#111827'
const MUTED = '#6B7280'
const ACCENT = '#B735B8'

// ── Sub-navegación agrupada (2 niveles): 5 grupos, cada uno con sus secciones ──
interface NavItem { href: string; label: string; exact?: boolean }
interface NavGroup { key: string; label: string; icon: LucideIcon; items: NavItem[] }

const BASE = '/admin/diamond-assistant'
const GROUPS: NavGroup[] = [
  { key: 'inicio', label: 'Inicio', icon: LayoutDashboard, items: [
    { href: BASE, label: 'Dashboard', exact: true },
    { href: `${BASE}/historial`, label: 'Historial' },
  ] },
  { key: 'agente', label: 'Agente', icon: Bot, items: [
    { href: `${BASE}/agentes`, label: 'Agentes' },
    { href: `${BASE}/playground`, label: 'Playground' },
    { href: `${BASE}/configuracion`, label: 'Configuración' },
  ] },
  { key: 'cerebro', label: 'Cerebro', icon: Brain, items: [
    { href: `${BASE}/conocimiento`, label: 'Conocimiento' },
    { href: `${BASE}/reglas`, label: 'Reglas' },
  ] },
  { key: 'audiencia', label: 'Audiencia', icon: Users, items: [
    { href: `${BASE}/contactos`, label: 'Contactos' },
    { href: `${BASE}/grupos`, label: 'Grupos' },
    { href: `${BASE}/bienvenidas`, label: 'Bienvenidas' },
  ] },
  { key: 'difusion', label: 'Difusión', icon: Megaphone, items: [
    { href: `${BASE}/campanas`, label: 'Campañas' },
    { href: `${BASE}/biblioteca`, label: 'Biblioteca' },
  ] },
]

export default function DiamondAssistantLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  const itemActive = (item: NavItem) =>
    item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`)
  const activeGroup = GROUPS.find((g) => g.items.some(itemActive)) ?? GROUPS[0]

  const rowStyle: CSSProperties = { display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }

  return (
    <div className="font-ui" style={{ color: TEXT }}>
      {/* ── Barra de contexto del módulo ──────────────────────────────── */}
      <div style={{ background: 'linear-gradient(135deg, rgba(255,45,149,0.05), rgba(35,59,143,0.05))', border: `1px solid ${BORDER}`, borderRadius: 16, padding: 16, marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: BRAND, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 10px 24px rgba(255,45,149,0.28)' }}>
            <Gem size={19} className="text-white" />
          </div>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ fontSize: 17, fontWeight: 800, margin: 0, letterSpacing: '-0.01em' }}>Diamond Assistant</h2>
            <p style={{ fontSize: 12, color: MUTED, margin: '3px 0 0' }}>Centro de comunicación WhatsApp con agentes IA</p>
          </div>
        </div>
      </div>

      {/* ── Nivel 1: grupos ───────────────────────────────────────────── */}
      <div style={{ ...rowStyle, marginBottom: 8 }}>
        {GROUPS.map((g) => {
          const on = g.key === activeGroup.key
          const Icon = g.icon
          return (
            <Link
              key={g.key}
              href={g.items[0].href}
              style={{
                flexShrink: 0,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 16px',
                borderRadius: 999,
                fontSize: 13.5,
                fontWeight: 800,
                textDecoration: 'none',
                whiteSpace: 'nowrap',
                border: on ? 'none' : `1px solid ${BORDER}`,
                background: on ? BRAND : '#fff',
                color: on ? '#fff' : TEXT,
                boxShadow: on ? '0 8px 20px rgba(183,53,184,0.22)' : 'none',
              }}
            >
              <Icon size={15} style={{ color: on ? '#fff' : ACCENT }} />
              {g.label}
            </Link>
          )
        })}
      </div>

      {/* ── Nivel 2: secciones del grupo activo ───────────────────────── */}
      <div style={{ ...rowStyle, marginBottom: 20, paddingLeft: 2 }}>
        {activeGroup.items.map((item) => {
          const on = itemActive(item)
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                flexShrink: 0,
                padding: '5px 13px',
                borderRadius: 999,
                fontSize: 12.5,
                fontWeight: 700,
                textDecoration: 'none',
                whiteSpace: 'nowrap',
                border: `1px solid ${on ? 'rgba(183,53,184,0.25)' : 'transparent'}`,
                background: on ? 'rgba(183,53,184,0.10)' : 'transparent',
                color: on ? ACCENT : MUTED,
              }}
            >
              {item.label}
            </Link>
          )
        })}
      </div>

      {children}
    </div>
  )
}
