'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import NotificationBell from './NotificationBell'

// Academy, Recursos y Shop solo se muestran a usuarios de Fase Global.
const FASE_GLOBAL_ONLY = ['/dashboard/academy', '/dashboard/recursos', '/dashboard/store']

const serviceItems = [
  { href: '/dashboard/services/ads/meta',      iconClass: 'fa-brands fa-meta',        label: 'Meta Ads',      grad: 'linear-gradient(145deg, #52707e, #3a5462)' },
  // { href: '/dashboard/services/ads/tiktok',    iconClass: 'fa-brands fa-tiktok',      label: 'TikTok Ads' }, // oculto temporalmente
  // { href: '/dashboard/services/ads/google',    iconClass: 'fa-brands fa-google',      label: 'Google Ads' }, // oculto temporalmente
  { href: '/dashboard/services/whatsapp',      iconClass: 'fa-solid fa-robot',        label: 'Agentes de AI', grad: 'linear-gradient(145deg, #52707e, #3a5462)' },
  { href: '/dashboard/services/social',        iconClass: 'fa-solid fa-share-nodes',  label: 'Social',        grad: 'linear-gradient(145deg, #52707e, #3a5462)' },
  { href: '/dashboard/services/landing-pages', iconClass: 'fa-solid fa-file-lines',   label: 'Landing',       grad: 'linear-gradient(145deg, #52707e, #3a5462)' },
  { href: '/dashboard/services/virtual-store', iconClass: 'fa-solid fa-shop',         label: 'Tienda',        grad: 'linear-gradient(145deg, #52707e, #3a5462)' },
  // { href: '/dashboard/services/clipping',      iconClass: 'fa-solid fa-newspaper',    label: 'Clipping' }, // oculto temporalmente
  { href: '/dashboard/crm',                    iconClass: 'fa-solid fa-users-gear',   label: 'CRM Broadcast', grad: 'linear-gradient(145deg, #52707e, #3a5462)' },
]

const mobileNavItems = [
  { href: '/dashboard',         iconClass: 'fa-solid fa-house',        label: 'Inicio' },
  { href: '/dashboard/services',iconClass: 'fa-solid fa-th-large',     label: 'Servicios' },
  // Academy, Recursos y Eventos ocultos del menú móvil de NÜRO (reversible).
  // { href: '/dashboard/academy', iconClass: 'fa-solid fa-graduation-cap', label: 'Academy' },
  // { href: '/dashboard/recursos',iconClass: 'fa-solid fa-wand-magic-sparkles', label: 'Recursos' },
  // { href: '/dashboard/store',   iconClass: 'fa-solid fa-ticket',       label: 'Eventos' },
  { href: '/dashboard/settings',iconClass: 'fa-solid fa-gear',         label: 'Ajustes' },
]

async function logout() {
  await fetch('/api/auth/logout', { method: 'POST' })
  window.location.href = '/login'
}

export default function Navbar() {
  const pathname = usePathname()
  const isInAcademy  = pathname.startsWith('/dashboard/courses') || pathname.startsWith('/dashboard/podcasts') || pathname === '/dashboard/academy'
  // Academy/Recursos/Shop: visibles para Fase Global o si el admin dio acceso manual.
  const [showExtras, setShowExtras] = useState(false)
  // "Mi Empresa": acceso al panel de admin de empresa (solo orgRole ORG_ADMIN).
  const [isOrgAdmin, setIsOrgAdmin] = useState(false)
  // Solicitudes de pago pendientes (badge para el admin de empresa).
  const [orgPending, setOrgPending] = useState(0)
  // Marca de la empresa (Pack Empresarial) para los usuarios de empresa.
  const [org, setOrg] = useState<{ name: string; logoUrl: string | null } | null>(null)
  useEffect(() => {
    fetch('/api/plan-status')
      .then(r => r.json())
      .then(d => {
        setShowExtras(!!d.faseGlobal || !!d.accessExtras)
        setIsOrgAdmin(d.orgRole === 'ORG_ADMIN')
        if (d.organizationId && d.orgName) setOrg({ name: d.orgName, logoUrl: d.orgLogoUrl ?? null })
        if (d.orgRole === 'ORG_ADMIN') {
          fetch('/api/empresa/purchases').then(r => r.json()).then(p => setOrgPending((p.requests || []).filter((x: { status: string }) => x.status === 'PENDING').length)).catch(() => {})
        }
      })
      .catch(() => {})
  }, [])
  const visibleMobileItems = mobileNavItems.filter(i => showExtras || !FASE_GLOBAL_ONLY.includes(i.href))

  return (
    <>
      {/* ── SIDEBAR DESKTOP ── */}
      <aside className="sidebar hidden lg:flex" aria-label="Barra lateral">
        <Link href="/dashboard" className="sidebar__logo">
          <img src="/logo-oficial-nuro.png" alt="Agente NÜRO" className="sidebar__logo-official" />
        </Link>

        {org && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 14px 12px', padding: '7px 10px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }} title={`Empresa: ${org.name}`}>
            {org.logoUrl
              ? <img src={org.logoUrl} alt={org.name} style={{ height: 22, maxWidth: 80, objectFit: 'contain' }} />
              : <i className="fa-solid fa-building" style={{ color: '#147e95', fontSize: 14 }} />}
            <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.85)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{org.name}</span>
          </div>
        )}

        <nav className="sidebar__nav" aria-label="Menú">

          <Link href="/dashboard" className={`nav-item ${pathname === '/dashboard' ? 'nav-item--active' : ''}`}>
            <span className="nav-item__icon"><i className="fa-solid fa-house"></i></span>
            <span className="nav-item__label">Inicio</span>
            <span className="nav-item__dot"></span>
          </Link>
          {/* Servicios — encabezado de sección fijo (sin desplegable) */}
          <div className="nav-section">
            <span className="nav-section__icon"><i className="fa-solid fa-th-large"></i></span>
            <span className="nav-section__label">Servicios</span>
          </div>

          <div className="nav-sub nav-sub--static">
            {serviceItems.map(item => {
              const isActive = pathname === item.href || pathname.startsWith(item.href)
              return (
                <Link key={item.href} href={item.href} className={`nav-item nav-item--sub ${isActive ? 'nav-item--active' : ''}`}>
                  <span className="nav-item__icon" style={{
                    color: '#fff', background: item.grad,
                    boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,0.4), inset 0 -2px 4px rgba(0,0,0,0.22), 0 3px 8px rgba(0,0,0,0.4)',
                  }}><i className={item.iconClass}></i></span>
                  <span className="nav-item__label">{item.label}</span>
                  <span className="nav-item__dot"></span>
                </Link>
              )
            })}
          </div>

          {/* Academy, Recursos y Eventos ocultos del sidebar de NÜRO (reversible:
              descomentar este bloque para volver a mostrarlos a Fase Global). */}
          {false && showExtras && (
            <>
              <Link href="/dashboard/academy" className={`nav-item ${isInAcademy ? 'nav-item--active' : ''}`}>
                <span className="nav-item__icon"><i className="fa-solid fa-graduation-cap"></i></span>
                <span className="nav-item__label">Academy</span>
                <span className="nav-item__dot"></span>
              </Link>
              <Link href="/dashboard/recursos" className={`nav-item ${pathname.startsWith('/dashboard/recursos') ? 'nav-item--active' : ''}`}>
                <span className="nav-item__icon"><i className="fa-solid fa-wand-magic-sparkles"></i></span>
                <span className="nav-item__label">Recursos</span>
                <span className="nav-item__dot"></span>
              </Link>
              <Link href="/dashboard/store" className={`nav-item ${pathname.startsWith('/dashboard/store') ? 'nav-item--active' : ''}`}>
                <span className="nav-item__icon"><i className="fa-solid fa-ticket"></i></span>
                <span className="nav-item__label">Eventos</span>
                <span className="nav-item__dot"></span>
              </Link>
            </>
          )}
          {isOrgAdmin && (
            <a href="/empresa" className="nav-item">
              <span className="nav-item__icon" style={{ color: '#fff', background: 'linear-gradient(145deg,#1fb8bb,#147e95)' }}><i className="fa-solid fa-building"></i></span>
              <span className="nav-item__label">Mi Empresa</span>
              {orgPending > 0
                ? <span style={{ marginLeft: 'auto', background: '#ef4444', color: '#fff', borderRadius: 999, fontSize: 11, fontWeight: 800, minWidth: 18, height: 18, display: 'inline-grid', placeItems: 'center', padding: '0 5px' }}>{orgPending}</span>
                : <span className="nav-item__dot"></span>}
            </a>
          )}
          <Link href="/dashboard/referidos" className={`nav-item ${pathname.startsWith('/dashboard/referidos') ? 'nav-item--active' : ''}`}>
            <span className="nav-item__icon"><i className="fa-solid fa-gift"></i></span>
            <span className="nav-item__label">Referidos</span>
            <span className="nav-item__dot"></span>
          </Link>
          <Link href="/dashboard/settings" className={`nav-item ${pathname === '/dashboard/settings' ? 'nav-item--active' : ''}`}>
            <span className="nav-item__icon"><i className="fa-solid fa-gear"></i></span>
            <span className="nav-item__label">Configuración</span>
            <span className="nav-item__dot"></span>
          </Link>
          <button onClick={logout} className="nav-item" style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,120,120,0.85)' }}>
            <span className="nav-item__icon"><i className="fa-solid fa-right-from-bracket"></i></span>
            <span className="nav-item__label">Salir</span>
          </button>
        </nav>

        <div className="sidebar__user">
          <div className="sidebar__user-av" id="dAvatar"><i className="fa-solid fa-user"></i></div>
          <div className="sidebar__user-info">
            <p className="sidebar__user-name">Usuario</p>
            <p className="sidebar__user-role">
              <span className="sidebar__user-handle">@user</span>
              <span className="sidebar__user-dot" aria-hidden></span>
              <span className="sidebar__user-status">Activo</span>
            </p>
          </div>
          <NotificationBell />
        </div>
      </aside>

      {/* ── BARRA MÓVIL ── */}
      <nav className="bottom-nav lg:hidden" aria-label="Navegación principal">
        {visibleMobileItems.map(item => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
          return (
            <Link key={item.href} href={item.href} className={`bnav__item ${isActive ? 'bnav__item--active' : ''}`}>
              <i className={item.iconClass}></i>
              {item.label}
            </Link>
          )
        })}
        <button
          onClick={logout}
          className="bnav__item"
          style={{ color: 'rgba(255,100,100,0.85)', cursor: 'pointer' }}
          aria-label="Cerrar sesión"
        >
          <i className="fa-solid fa-right-from-bracket"></i>
          Salir
        </button>
      </nav>
    </>
  )
}
