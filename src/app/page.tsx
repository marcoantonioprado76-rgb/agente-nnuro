'use client'

/**
 * Landing NÜRO · narrativa comercial · estructura inspirada en referencia
 *
 *   PROTEGIDO (no se toca lógica visual):
 *   - Fondo animado completo (.bg-gradient, .bg-grid, .bg-glow, .bg-glow-warm, partículas)
 *   - Escena Three.js + GSAP ScrollTrigger (robot con rotación/escala con scroll)
 *   - Lógica de navbar scroll-aware
 *
 *   CONTENIDO editable: ver `nuroConfig` debajo.
 */

import { useEffect, useRef, useState } from 'react'
import { Manrope } from 'next/font/google'
import {
  ArrowRight, Bot, Store, MessageCircle, Smartphone,
  CheckCircle, Sparkles, Send, Boxes, ChevronUp,
} from 'lucide-react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

const manrope = Manrope({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-manrope',
})

const ROBOT_GLB_PATH = '/landing/nuro-robot.glb'
const ROBOT_IMAGE    = '/landing/robot.png'

/* ════════════════════════════════════════════════════════════════
   CONFIGURACIÓN CENTRALIZADA · edita aquí textos, imágenes y enlaces
   ════════════════════════════════════════════════════════════════ */
const nuroConfig = {
  brand: 'NÜRO',
  registerUrl: '/register',
  loginUrl: '/login',

  hero: {
    label: 'EL FUTURO DE LAS VENTAS YA COMENZÓ',
    description:
      'Con NÜRO, tus clientes pueden recibir atención, seguimiento y una experiencia comercial más organizada durante todo el día.',
    primaryCta: 'QUIERO CONOCER NÜRO',
    micro: 'Agentes IA 24/7 · Seguimiento inteligente · Tiendas virtuales',
    chipLabel: 'NÜRO ONLINE',
    chipSub: 'Activo 24/7',
  },

  ticker: [
    'AGENTES IA 24/7',
    'RESPUESTAS AUTOMÁTICAS',
    'SEGUIMIENTO INTELIGENTE',
    'TIENDAS VIRTUALES',
    'ATENCIÓN SIN PAUSAS',
    'MENOS PROSPECTOS PERDIDOS',
    'VENTAS MÁS ORGANIZADAS',
    'TU NEGOCIO SIEMPRE ACTIVO',
  ],

  numbered: {
    title: 'No pierdas ventas por responder demasiado tarde.',
    items: [
      'Un cliente pregunta por tu producto, pero nadie responde a tiempo.',
      'Llegan nuevos prospectos, pero el seguimiento se queda pendiente.',
      'Tu negocio depende de que estés conectado todo el día.',
      'Cada conversación olvidada puede convertirse en una oportunidad perdida.',
    ],
    closingTop: 'No necesitas trabajar más horas.',
    closingBottom: 'Necesitas un sistema que trabaje contigo.',
  },

  phone: {
    /** Ruta editable para sustituir la imagen interna del celular */
    image: '/landing/nuro-mobile-preview.webp',
    bubbleTitle: 'NÜRO está disponible para atender nuevas oportunidades.',
    bubbleBody:
      'Puede responder consultas, presentar información y ayudarte a mantener activa la conversación con cada prospecto.',
    title: '¿Tu negocio está preparado para responder a todos?',
    problems: [
      'Los mensajes llegan mientras estás ocupado atendiendo otras tareas.',
      'Algunos clientes esperan demasiado tiempo para recibir una respuesta.',
      'No siempre recuerdas volver a escribir a cada prospecto.',
      'Presentar tus productos manualmente consume tiempo.',
      'Muchas oportunidades se enfrían antes de llegar al cierre.',
    ],
    closing:
      'NÜRO te ayuda a construir una experiencia comercial más organizada, disponible y preparada para crecer contigo.',
  },

  invitation: {
    upper: 'No se trata solamente de responder mensajes.',
    titleTop: 'Es el momento de construir',
    titleBottom: 'una nueva forma de vender.',
    sub: 'Con NÜRO, puedes transformar la atención de tus clientes en una experiencia más rápida, organizada y preparada para crecer.',
  },

  capsules: {
    items: [
      { icon: 'bot',   text: 'Agentes IA disponibles 24/7' },
      { icon: 'send',  text: 'Seguimiento de prospectos' },
      { icon: 'box',   text: 'Presentación de productos y servicios' },
      { icon: 'check', text: 'Confirmación de información comercial' },
      { icon: 'store', text: 'Tiendas virtuales para distintos negocios' },
      { icon: 'phone', text: 'Experiencia adaptable a celular y computadora' },
    ] as Array<{ icon: keyof typeof capsuleIcons; text: string }>,
    textBefore: 'Tu negocio',
    accent: 'no necesita detenerse',
    textAfter: 'cuando termina tu jornada.',
    cta: 'QUIERO DAR EL SIGUIENTE PASO',
    micro: ['Atención continua', 'Tienda virtual profesional', 'Sistema preparado para crecer'],
  },

  banner: {
    title: 'Tu próximo cliente podría estar escribiendo ahora mismo.',
    sub: 'NÜRO te ayuda a construir una experiencia de atención y ventas disponible incluso cuando tú no estás conectado.',
    cta: 'CREAR MI CUENTA',
    altCta: 'YA TENGO UNA CUENTA · INICIAR SESIÓN',
  },

  footer: {
    desc: 'Agentes IA y tiendas virtuales para negocios que quieren avanzar.',
    links: [
      { href: '#hero',       label: 'Inicio' },
      { href: '#capsulas',   label: 'Agentes IA' },
      { href: '#solucion',   label: 'Tiendas virtuales' },
      { href: '#problemas',  label: 'Cómo funciona' },
      { href: '/login',      label: 'Iniciar sesión' },
      { href: '/register',   label: 'Registrarse' },
    ],
    copyright: '© 2026 NÜRO. Todos los derechos reservados.',
  },
}

const capsuleIcons = {
  bot:   Bot,
  send:  Send,
  box:   Boxes,
  check: CheckCircle,
  store: Store,
  phone: Smartphone,
} as const

export default function LandingPage() {
  const sceneRef     = useRef<HTMLDivElement>(null)
  const particlesRef = useRef<HTMLDivElement>(null)
  const [scrolled, setScrolled] = useState(false)

  // ──────────────────────────────────────────────
  // ▼  PROTEGIDO · navbar scroll-aware  ▼
  // ──────────────────────────────────────────────
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // ──────────────────────────────────────────────
  // ▼  PROTEGIDO · partículas flotantes  ▼
  // ──────────────────────────────────────────────
  useEffect(() => {
    const box = particlesRef.current
    if (!box) return
    const n = window.innerWidth < 820 ? 16 : 34
    const els: HTMLSpanElement[] = []
    for (let i = 0; i < n; i++) {
      const p = document.createElement('span')
      p.className = 'particle'
      const size = 1 + Math.random() * 3
      p.style.width = p.style.height = size + 'px'
      p.style.left = Math.random() * 100 + 'vw'
      p.style.top  = (100 + Math.random() * 20) + 'vh'
      p.style.animationDuration = (10 + Math.random() * 16) + 's'
      p.style.animationDelay = (-Math.random() * 20) + 's'
      box.appendChild(p)
      els.push(p)
    }
    return () => { els.forEach((e) => e.remove()) }
  }, [])

  // ──────────────────────────────────────────────
  // ▼  PROTEGIDO · ESCENA THREE.JS + GSAP  ▼
  // ──────────────────────────────────────────────
  useEffect(() => {
    const container = sceneRef.current
    if (!container) return

    gsap.registerPlugin(ScrollTrigger)
    const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches

    const scene  = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, 0.1, 100)
    camera.position.set(0, 0.9, 2.3)

    const isPhone = innerWidth < 820
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: !isPhone })
    renderer.setSize(innerWidth, innerHeight)
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5))
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.1
    container.appendChild(renderer.domElement)

    // Luces
    scene.add(new THREE.AmbientLight(0x3a2a66, 0.6))
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.2)
    keyLight.position.set(2, 4, 3)
    scene.add(keyLight)
    const neonFront = new THREE.PointLight(0x9b5cff, 14, 18)
    neonFront.position.set(-2.4, 1.2, 2.2)
    scene.add(neonFront)
    const backLight = new THREE.PointLight(0xc850ff, 10, 18)
    backLight.position.set(0, 1.6, -3)
    scene.add(backLight)
    const warm = new THREE.PointLight(0xe0219a, 5, 14)
    warm.position.set(2.6, -0.6, 1.8)
    scene.add(warm)

    const robot = new THREE.Group()
    scene.add(robot)

    // Plataforma circular
    const cv = document.createElement('canvas')
    cv.width = cv.height = 256
    const ctx = cv.getContext('2d')!
    const g = ctx.createRadialGradient(128, 128, 8, 128, 128, 128)
    g.addColorStop(0,    'rgba(190,150,255,0.95)')
    g.addColorStop(0.35, 'rgba(155,92,255,0.45)')
    g.addColorStop(1,    'rgba(155,92,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 256, 256)
    const tex = new THREE.CanvasTexture(cv)
    const platform = new THREE.Mesh(
      new THREE.CircleGeometry(1.7, 64),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })
    )
    platform.rotation.x = -Math.PI / 2
    platform.position.y = -1.28
    robot.add(platform)

    // Anillos
    const ringsGroup = new THREE.Group()
    for (let i = 0; i < 3; i++) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(1.5 + i * 0.28, 0.006, 12, 120),
        new THREE.MeshBasicMaterial({ color: 0x9b5cff, transparent: true, opacity: 0.22 - i * 0.05 })
      )
      ring.position.z = -1.4
      ring.rotation.x = Math.PI / 2.2
      ringsGroup.add(ring)
    }
    robot.add(ringsGroup)

    // Modelo robot · GLB con fallback PNG
    let model: THREE.Object3D | null = null
    let usingFallback = false

    function centerAndScale(obj: THREE.Object3D, targetHeight: number) {
      const box = new THREE.Box3().setFromObject(obj)
      const size = new THREE.Vector3()
      box.getSize(size)
      const center = new THREE.Vector3()
      box.getCenter(center)
      const s = targetHeight / (size.y || 1)
      obj.scale.setScalar(s)
      obj.position.sub(center.multiplyScalar(s))
    }

    function buildFallback() {
      usingFallback = true
      new THREE.TextureLoader().load(ROBOT_IMAGE, (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace
        const ar = (tex.image.width || 408) / (tex.image.height || 612)
        const h = 2.5, w = h * ar
        const plane = new THREE.Mesh(
          new THREE.PlaneGeometry(w, h),
          new THREE.MeshBasicMaterial({ map: tex, transparent: true })
        )
        model = plane
        robot.add(model)
      })
    }

    function loadRobot() {
      const gltfLoader = new GLTFLoader()
      gltfLoader.load(
        ROBOT_GLB_PATH,
        (gltf) => {
          model = gltf.scene
          model.traverse((o) => {
            if ((o as THREE.Mesh).isMesh) {
              o.castShadow = true
              o.receiveShadow = true
            }
          })
          centerAndScale(model, 2.5)
          robot.add(model)
        },
        undefined,
        () => {
          console.info('[NÜRO] No hay GLB · usando imagen plana del robot.')
          buildFallback()
        }
      )
    }

    // Estado animado + ScrollTrigger
    const target  = { rotY: 0, camZ: 2.3, camY: 0.9, lookY: 0.95, posY: 0 }
    const current = { ...target }
    let isMobile = innerWidth < 820

    function applyProgress(p: number) {
      const ease = gsap.parseEase('power2.inOut')(p)
      const nearZ   = isMobile ? 2.50 : 1.90
      const farZ    = isMobile ? 6.30 : 4.85
      const endPosY = isMobile ? 0.85 : 0.30

      target.camZ  = THREE.MathUtils.lerp(nearZ, farZ, ease)
      target.camY  = THREE.MathUtils.lerp(0.60, 0.06, ease)
      target.lookY = THREE.MathUtils.lerp(0.60, 0.00, ease)
      target.posY  = p > 0.85 ? THREE.MathUtils.lerp(0, endPosY, (p - 0.85) / 0.15) : 0
      target.rotY  = usingFallback
        ? THREE.MathUtils.degToRad(15) * Math.sin(p * Math.PI * 2)
        : p * Math.PI * 2
    }

    const scrollTrigger = ScrollTrigger.create({
      trigger: '.content',
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.4,
      onUpdate: (self) => applyProgress(self.progress),
    })

    const clock = new THREE.Clock()
    let visible = true
    const onVisibility = () => { visible = !document.hidden }
    document.addEventListener('visibilitychange', onVisibility)

    let rafId = 0
    function animate() {
      rafId = requestAnimationFrame(animate)
      if (!visible) return
      const t = clock.getElapsedTime()
      const k = reduceMotion ? 1 : 0.07

      current.rotY  += (target.rotY  - current.rotY)  * k
      current.camZ  += (target.camZ  - current.camZ)  * k
      current.camY  += (target.camY  - current.camY)  * k
      current.lookY += (target.lookY - current.lookY) * k
      current.posY  += (target.posY  - current.posY)  * k

      robot.rotation.y = current.rotY
      robot.position.y = current.posY + (reduceMotion ? 0 : Math.sin(t * 1.1) * 0.05)

      if (usingFallback && model) (model as THREE.Mesh).rotation.y = 0

      ringsGroup.rotation.z = t * 0.15
      ;(platform.material as THREE.MeshBasicMaterial).opacity = 0.75 + Math.sin(t * 1.6) * 0.18

      camera.position.z = current.camZ
      camera.position.y = current.camY
      camera.lookAt(0, current.lookY, 0)
      renderer.render(scene, camera)
    }

    function onResize() {
      isMobile = innerWidth < 820
      camera.aspect = innerWidth / innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(innerWidth, innerHeight)
      ScrollTrigger.refresh()
    }
    window.addEventListener('resize', onResize)

    applyProgress(0)
    animate()

    type IdleWin = Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout?: number }) => number
    }
    const w = window as IdleWin
    if (typeof w.requestIdleCallback === 'function') {
      w.requestIdleCallback(loadRobot, { timeout: 600 })
    } else {
      setTimeout(loadRobot, 100)
    }

    return () => {
      cancelAnimationFrame(rafId)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('resize', onResize)
      scrollTrigger.kill()
      renderer.dispose()
      tex.dispose()
      platform.geometry.dispose()
      ;(platform.material as THREE.MeshBasicMaterial).dispose()
      ringsGroup.children.forEach((m) => {
        const mesh = m as THREE.Mesh
        mesh.geometry?.dispose()
        ;(mesh.material as THREE.Material)?.dispose()
      })
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
    }
  }, [])
  // ──────────────────────────────────────────────
  // ▲  FIN ZONA PROTEGIDA  ▲
  // ──────────────────────────────────────────────

  const handleScrollTop = () => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  return (
    <div className={manrope.variable}>
      {/* ▼ CAPAS DE FONDO INTOCABLES ▼ */}
      <div className="bg-gradient" />
      <div className="bg-grid" />
      <div className="bg-glow" />
      <div className="bg-glow-warm" />
      <div id="particles" ref={particlesRef} />
      <div id="scene" ref={sceneRef} />
      {/* ▲ FIN CAPAS DE FONDO ▲ */}

      {/* ─── NAVBAR ─── */}
      <header className={`topbar ${scrolled ? 'is-scrolled' : ''}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/landing/logo-blanco.png" className="logo-nuro" alt="NÜRO" />
        <nav className="menu">
          <a href="#problemas">Problema</a>
          <a href="#solucion">Solución</a>
          <a href="#capsulas">Funciones</a>
          <a href="#banner">Empezar</a>
        </nav>
        <div className="auth-btns">
          <a href={nuroConfig.loginUrl}    className="btn btn-ghost btn-nav">Iniciar sesión</a>
          <a href={nuroConfig.registerUrl} className="btn btn-primary btn-nav">Registrarse</a>
        </div>
      </header>

      <main className="content">
        {/* ═══════════════════════════════════════════════════
            1 · HERO PRINCIPAL · texto izquierda · chip discreto
            ═══════════════════════════════════════════════════ */}
        <section id="hero">
          <div className="hero-grid">
            <div className="hero-text">
              <span className="eyebrow">
                <span className="eyebrow-dot" /> {nuroConfig.hero.label}
              </span>
              <h1 className="hero-title">
                <span className="hero-line">Tu negocio puede seguir</span>
                <span className="hero-line hero-accent">vendiendo 24/7</span>
                <span className="hero-line">incluso cuando tú no estás conectado.</span>
              </h1>
              <p className="lead">{nuroConfig.hero.description}</p>
              <div className="cta-row">
                <a href={nuroConfig.registerUrl} className="btn btn-primary btn-lg">
                  {nuroConfig.hero.primaryCta} <ArrowRight size={16} strokeWidth={2.4} />
                </a>
              </div>
              <p className="micro-text">{nuroConfig.hero.micro}</p>
            </div>

            {/* Chip discreto · "NÜRO ONLINE" · no compite con el robot del fondo */}
            <div className="online-chip" aria-hidden="false">
              <span className="online-pulse" />
              <div>
                <div className="online-label">{nuroConfig.hero.chipLabel}</div>
                <div className="online-sub">{nuroConfig.hero.chipSub}</div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════
            2 · TICKER FRANJA INFINITA · 2 filas en sentidos opuestos
            ═══════════════════════════════════════════════════ */}
        <section id="ticker" aria-label="Características NÜRO">
          <div className="ticker-row">
            <div className="ticker-track ticker-left">
              {[...nuroConfig.ticker, ...nuroConfig.ticker].map((t, i) => (
                <span key={`t1-${i}`} className="ticker-item">
                  <span className="ticker-dot" /> {t}
                </span>
              ))}
            </div>
          </div>
          <div className="ticker-row ticker-row-soft">
            <div className="ticker-track ticker-right">
              {[...nuroConfig.ticker, ...nuroConfig.ticker].map((t, i) => (
                <span key={`t2-${i}`} className="ticker-item">
                  <span className="ticker-dot" /> {t}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════
            3 · TARJETA NUMERADA · 4 problemas (01–04)
            ═══════════════════════════════════════════════════ */}
        <section id="problemas">
          <div className="numbered-card">
            <h2 className="numbered-title">{nuroConfig.numbered.title}</h2>
            <ol className="numbered-list">
              {nuroConfig.numbered.items.map((t, i) => (
                <li key={i} className="numbered-row">
                  <span className="num">{String(i + 1).padStart(2, '0')}</span>
                  <span className="num-text">{t}</span>
                </li>
              ))}
            </ol>
          </div>
          <p className="numbered-closing">
            <span>{nuroConfig.numbered.closingTop}</span>
            <strong className="accent-soft">{nuroConfig.numbered.closingBottom}</strong>
          </p>
        </section>

        {/* ═══════════════════════════════════════════════════
            4 · CELULAR + LISTA DE PROBLEMAS
            ═══════════════════════════════════════════════════ */}
        <section id="solucion">
          <div className="phone-grid">
            {/* Mockup · imagen editable en /landing/nuro-mobile-preview.webp */}
            <figure className="phone-mockup">
              <div className="phone-shadow" aria-hidden />
              <div className="phone-frame">
                <div className="phone-notch" aria-hidden />
                <div className="phone-screen">
                  {/* Si existe la imagen real, se muestra; si no, queda el SVG mockup */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={nuroConfig.phone.image}
                    alt="Vista móvil del ecosistema NÜRO"
                    className="phone-img"
                    loading="lazy"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = 'none'
                    }}
                  />
                  {/* Mockup fallback (siempre visible debajo) · tarjeta tipo mensaje */}
                  <div className="phone-fallback">
                    <div className="phone-status">
                      <span>9:41</span>
                      <span className="phone-status-dots">●●●●</span>
                    </div>
                    <div className="phone-msg-card">
                      <div className="phone-msg-head">
                        <div className="phone-avatar">
                          <Bot size={16} strokeWidth={1.8} />
                        </div>
                        <div className="phone-msg-meta">
                          <div className="phone-msg-name">NÜRO</div>
                          <div className="phone-msg-time">ahora</div>
                        </div>
                      </div>
                      <p className="phone-msg-title">{nuroConfig.phone.bubbleTitle}</p>
                      <p className="phone-msg-body">{nuroConfig.phone.bubbleBody}</p>
                    </div>
                    <div className="phone-input">
                      <MessageCircle size={14} strokeWidth={1.8} />
                      <span>Responder…</span>
                    </div>
                  </div>
                </div>
              </div>
            </figure>

            <div className="phone-text">
              <span className="eyebrow">
                <span className="eyebrow-dot" /> Una experiencia comercial activa
              </span>
              <h2 className="h-2">{nuroConfig.phone.title}</h2>
              <ul className="problems-list">
                {nuroConfig.phone.problems.map((p, i) => (
                  <li key={i}>
                    <Sparkles size={14} strokeWidth={1.8} />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
              <p className="lead lead-sm">{nuroConfig.phone.closing}</p>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════
            5 · DIVISOR DECORATIVO
            ═══════════════════════════════════════════════════ */}
        <div className="divider" role="presentation" aria-hidden>
          <svg viewBox="0 0 320 36" width="320" height="36" preserveAspectRatio="xMidYMid meet">
            <defs>
              <linearGradient id="divLine" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="rgba(168,85,247,0)" />
                <stop offset="50%" stopColor="rgba(168,85,247,.55)" />
                <stop offset="100%" stopColor="rgba(168,85,247,0)" />
              </linearGradient>
            </defs>
            <line x1="0" y1="18" x2="135" y2="18" stroke="url(#divLine)" strokeWidth="1" />
            <line x1="185" y1="18" x2="320" y2="18" stroke="url(#divLine)" strokeWidth="1" />
            <circle cx="160" cy="18" r="11" fill="none" stroke="rgba(168,85,247,.35)" strokeWidth="1" />
            <circle cx="160" cy="18" r="5"  fill="#A855F7" />
            <circle cx="160" cy="18" r="2.4" fill="#F5F3FF" />
          </svg>
        </div>

        {/* ═══════════════════════════════════════════════════
            6 · INVITACIÓN AL CAMBIO
            ═══════════════════════════════════════════════════ */}
        <section id="invitacion">
          <div className="invitation-wrap">
            <span className="upper-line">{nuroConfig.invitation.upper}</span>
            <h2 className="h-display">
              {nuroConfig.invitation.titleTop}<br />
              <span className="accent">{nuroConfig.invitation.titleBottom}</span>
            </h2>
            <p className="lead">{nuroConfig.invitation.sub}</p>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════
            7 · CÁPSULAS INFORMATIVAS
            ═══════════════════════════════════════════════════ */}
        <section id="capsulas">
          <ul className="caps-grid">
            {nuroConfig.capsules.items.map((c, i) => {
              const Icon = capsuleIcons[c.icon]
              return (
                <li key={i} className="cap">
                  <Icon size={15} strokeWidth={1.8} />
                  <span>{c.text}</span>
                </li>
              )
            })}
          </ul>

          <p className="caps-text">
            {nuroConfig.capsules.textBefore}{' '}
            <span className="accent">{nuroConfig.capsules.accent}</span>{' '}
            {nuroConfig.capsules.textAfter}
          </p>

          <div className="cta-row">
            <a href={nuroConfig.registerUrl} className="btn btn-primary btn-lg">
              {nuroConfig.capsules.cta} <ArrowRight size={18} strokeWidth={2.4} />
            </a>
          </div>

          <ul className="micro-list">
            {nuroConfig.capsules.micro.map((m, i) => (
              <li key={i}>
                <CheckCircle size={12} strokeWidth={2.4} />
                {m}
              </li>
            ))}
          </ul>
        </section>

        {/* ═══════════════════════════════════════════════════
            8 · BANNER FINAL DE CONVERSIÓN
            ═══════════════════════════════════════════════════ */}
        <section id="banner">
          <div className="banner-card">
            <h2 className="h-2">{nuroConfig.banner.title}</h2>
            <p className="lead">{nuroConfig.banner.sub}</p>
            <a href={nuroConfig.registerUrl} className="btn btn-primary btn-lg">
              {nuroConfig.banner.cta} <ArrowRight size={18} strokeWidth={2.4} />
            </a>
            <a href={nuroConfig.loginUrl} className="alt-link">
              {nuroConfig.banner.altCta}
            </a>
          </div>
        </section>
      </main>

      {/* ═══════════════════════════════════════════════════
          9 · FOOTER MINIMALISTA
          ═══════════════════════════════════════════════════ */}
      <footer className="footer">
        <div className="footer-grid">
          <div className="footer-brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/landing/logo-blanco.png" className="logo-nuro" alt="NÜRO" />
            <p>{nuroConfig.footer.desc}</p>
          </div>
          <ul className="footer-links">
            {nuroConfig.footer.links.map((l) => (
              <li key={`${l.href}-${l.label}`}>
                <a href={l.href}>{l.label}</a>
              </li>
            ))}
          </ul>
        </div>
        <div className="footer-line" />
        <div className="footer-bottom">
          <span>{nuroConfig.footer.copyright}</span>
          <button type="button" className="back-top" onClick={handleScrollTop} aria-label="Volver arriba">
            <ChevronUp size={14} strokeWidth={2.4} />
          </button>
        </div>
      </footer>

      <style jsx global>{`
        /* ═══════════════════════════════════════════════════════════════
           TOKENS · paleta
           ═══════════════════════════════════════════════════════════════ */
        :root {
          --naranja:#e0219a;
          --naranja-claro:#b16cff;
          --azul-neon:#9b5cff;
          --azul-glow:rgba(155,92,255,.55);
          --negro:#0a0714;
          --azul-oscuro:#150f2c;
          --text-1:#F5F3FF;
          --text-2:#B8B2C8;
          --text-3:#8E879F;
          --acc-violet:#A855F7;
          --acc-fuchsia:#D946EF;
        }
        html { scroll-behavior: smooth; }
        body {
          font-family: var(--font-manrope), 'Plus Jakarta Sans', 'Inter', system-ui, -apple-system, sans-serif;
          color: var(--text-1);
          background: var(--negro);
          overflow-x: hidden;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }

        /* ▼▼▼ INTOCABLE · fondo animado y escena 3D ▼▼▼ */
        .bg-gradient {
          position: fixed; inset: 0; z-index: 0; pointer-events: none;
          background: radial-gradient(120% 90% at 50% 8%, #241a45 0%, var(--azul-oscuro) 38%, var(--negro) 72%);
        }
        .bg-grid {
          position: fixed; inset: 0; z-index: 1; pointer-events: none;
          background-image:
            linear-gradient(rgba(155,92,255,.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(155,92,255,.06) 1px, transparent 1px);
          background-size: 60px 60px;
          mask-image: radial-gradient(75% 70% at 50% 45%, #000 0%, transparent 85%);
          -webkit-mask-image: radial-gradient(75% 70% at 50% 45%, #000 0%, transparent 85%);
        }
        .bg-glow {
          position: fixed; top: 42%; left: 50%; z-index: 2; pointer-events: none;
          width: min(820px, 90vw); height: min(820px, 90vw);
          transform: translate(-50%, -50%);
          background: radial-gradient(circle, var(--azul-glow) 0%, rgba(155,92,255,.12) 38%, transparent 68%);
          filter: blur(10px);
          animation: glowPulse 6s ease-in-out infinite;
        }
        @keyframes glowPulse {
          0%, 100% { opacity: .8; transform: translate(-50%, -50%) scale(1); }
          50%      { opacity: 1;  transform: translate(-50%, -50%) scale(1.07); }
        }
        .bg-glow-warm {
          position: fixed; bottom: -10%; left: 50%; z-index: 2; pointer-events: none;
          width: min(700px, 80vw); height: min(420px, 50vw);
          transform: translateX(-50%);
          background: radial-gradient(ellipse at center, rgba(224,33,154,.14) 0%, transparent 70%);
          filter: blur(20px);
        }
        #particles { position: fixed; inset: 0; z-index: 3; pointer-events: none; overflow: hidden; }
        .particle {
          position: absolute; border-radius: 50%;
          background: var(--azul-neon);
          box-shadow: 0 0 6px var(--azul-glow);
          opacity: .5;
          animation: floatUp linear infinite;
        }
        @keyframes floatUp {
          0%   { transform: translateY(0)    scale(1);   opacity: 0; }
          10%  { opacity: .6; }
          90%  { opacity: .5; }
          100% { transform: translateY(-110vh) scale(1.3); opacity: 0; }
        }
        #scene { position: fixed; inset: 0; z-index: 1; pointer-events: none; }
        #scene canvas { display: block; width: 100%; height: 100%; }
        /* ▲▲▲ FIN INTOCABLE ▲▲▲ */

        /* ═══════════════════════════════════════════════════════════════
           LAYOUT GLOBAL
           ═══════════════════════════════════════════════════════════════ */
        .content { position: relative; z-index: 3; }
        section {
          display: flex; flex-direction: column;
          padding-block: clamp(72px, 9vw, 132px);
          padding-inline: 6vw;
          position: relative;
          overflow-x: clip;
        }

        /* ─── NAVBAR ─── */
        .topbar {
          position: fixed; top: 0; left: 0; width: 100%; z-index: 10;
          display: flex; align-items: center; justify-content: space-between;
          padding: 18px 6vw;
          background: transparent;
          border-bottom: 1px solid transparent;
          transition: background .35s ease, border-color .35s ease, backdrop-filter .35s ease, padding .25s ease;
          will-change: background, backdrop-filter;
        }
        .topbar.is-scrolled {
          background: rgba(10,7,20,.62);
          border-bottom-color: rgba(168,85,247,.10);
          backdrop-filter: blur(14px) saturate(140%);
          -webkit-backdrop-filter: blur(14px) saturate(140%);
          padding: 14px 6vw;
        }
        .topbar .logo-nuro { height: 28px; filter: drop-shadow(0 2px 10px rgba(168,85,247,.32)); }
        .topbar .menu { display: flex; gap: 28px; align-items: center; }
        .topbar .menu a {
          color: #B8B2C8; text-decoration: none;
          font-size: 14px; font-weight: 600;
          transition: color .2s;
        }
        .topbar .menu a:hover { color: #F5F3FF; }
        .topbar .auth-btns { display: flex; gap: 10px; align-items: center; }

        /* ─── BOTONES ─── */
        .btn {
          display: inline-flex; align-items: center; gap: 8px;
          border: 0; cursor: pointer;
          font-size: 15px; font-weight: 650;
          padding: 14px 26px; border-radius: 12px;
          transition: transform .22s ease, box-shadow .22s ease, background .22s ease, border-color .22s ease;
          text-decoration: none; white-space: nowrap;
          letter-spacing: -.005em;
        }
        .btn-primary {
          background: linear-gradient(95deg, #A855F7 0%, #D946EF 100%);
          color: #fff;
          box-shadow:
            0 14px 32px -12px rgba(168,85,247,.55),
            0 4px 12px -2px rgba(0,0,0,.4),
            inset 0 1px 0 rgba(255,255,255,.18);
        }
        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow:
            0 20px 42px -12px rgba(168,85,247,.65),
            0 6px 16px -2px rgba(0,0,0,.45),
            inset 0 1px 0 rgba(255,255,255,.22);
        }
        .btn-ghost {
          background: rgba(12,7,31,.55); color: #F5F3FF;
          border: 1px solid rgba(168,85,247,.32);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
        }
        .btn-ghost:hover {
          background: rgba(168,85,247,.12);
          border-color: rgba(168,85,247,.55);
        }
        .btn-nav { font-size: 13.5px; padding: 10px 18px; border-radius: 999px; }
        .btn-lg  { font-size: 16px; padding: 16px 30px; border-radius: 14px; font-weight: 700; }

        /* ─── EYEBROW + TIPOGRAFÍA ─── */
        .eyebrow {
          display: inline-flex; align-items: center; gap: 9px;
          font-size: 11.5px; font-weight: 700;
          color: #C8C2D8;
          letter-spacing: .22em; text-transform: uppercase;
          padding: 8px 14px; border-radius: 999px;
          background: rgba(168,85,247,.08);
          border: 1px solid rgba(168,85,247,.22);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          align-self: flex-start;
        }
        .eyebrow-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: #A855F7; box-shadow: 0 0 8px rgba(168,85,247,.7);
        }
        h1, h2, h3 {
          color: #F5F3FF; font-weight: 800;
          letter-spacing: -.03em; line-height: 1.06;
          text-shadow:
            0 3px 12px rgba(0,0,0,.75),
            0 8px 30px rgba(0,0,0,.45);
        }
        .h-display {
          font-size: clamp(2.3rem, 5vw, 4.8rem);
          font-weight: 800;
          letter-spacing: -.055em; line-height: 1.02;
          max-width: 18ch;
        }
        .h-2 {
          font-size: clamp(2rem, 4vw, 3.6rem);
          font-weight: 800;
          letter-spacing: -.045em; line-height: 1.05;
          max-width: 22ch;
        }
        .accent {
          background: linear-gradient(95deg, #A855F7 0%, #D946EF 100%);
          -webkit-background-clip: text; background-clip: text;
          color: transparent;
          filter: drop-shadow(0 3px 12px rgba(0,0,0,.55));
        }
        .accent-soft {
          color: #C084FC; font-weight: 700;
          text-shadow: 0 2px 10px rgba(0,0,0,.80);
        }
        .lead {
          color: #C0BAD0;
          font-size: clamp(1rem, 1.4vw, 1.2rem);
          font-weight: 500; line-height: 1.7;
          letter-spacing: -.005em;
          max-width: 680px;
          text-shadow: 0 2px 8px rgba(0,0,0,.70);
        }
        .lead-sm { font-size: clamp(.95rem, 1.2vw, 1.05rem); max-width: 56ch; }

        .cta-row { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; }
        .micro-text {
          color: #8E879F; font-size: 12px; font-weight: 500;
          letter-spacing: .04em; margin: 0;
          text-shadow: 0 1px 6px rgba(0,0,0,.6);
        }

        /* ═══════════════════════════════════════════════════════════════
           1 · HERO · premium editorial · texto izquierda · chip lateral
           ═══════════════════════════════════════════════════════════════ */
        #hero {
          min-height: 100vh;
          justify-content: center;
          padding-top: 120px;
          padding-bottom: 80px;
        }
        .hero-grid {
          position: relative;
          display: grid;
          grid-template-columns: minmax(0, 1fr) min(380px, 36%);
          gap: 48px;
          align-items: center;
          max-width: 1200px; width: 100%;
          margin: 0 auto;
        }
        .hero-text {
          position: relative;
          display: flex; flex-direction: column;
          gap: 26px;             /* aire entre etiqueta · título · lead · CTA */
          max-width: 640px;
        }
        /* Capa oscura local detrás del bloque de texto (no global) */
        .hero-text::before {
          content: '';
          position: absolute;
          inset: -48px -80px -32px -48px;
          z-index: -1;
          pointer-events: none;
          background: linear-gradient(
            90deg,
            rgba(5,3,18,.82) 0%,
            rgba(5,3,18,.55) 55%,
            rgba(5,3,18,.10) 92%,
            rgba(5,3,18,0)  100%
          );
          filter: blur(14px);
        }

        /* ─── Etiqueta superior · compacta · spacing reducido ─── */
        .hero-text .eyebrow {
          font-size: 11px;
          letter-spacing: .18em;  /* menor que el .22 global · más compacta */
          padding: 7px 13px;
          color: #DCD3F0;
          background: rgba(168,85,247,.10);
          border-color: rgba(168,85,247,.24);
        }

        /* ─── Título principal · 3 líneas con jerarquía clara ─── */
        .hero-title {
          margin: 0;
          display: flex; flex-direction: column;
          font-family: var(--font-manrope), 'Plus Jakarta Sans', 'Inter', system-ui, sans-serif;
          font-weight: 800;
          font-size: clamp(3.3rem, 5vw, 5.4rem);
          line-height: 0.98;
          letter-spacing: -.055em;
          max-width: 630px;
        }
        .hero-line {
          display: block;
          color: #FFFFFF;
          /* Sombra discreta (NO fuerte) — mejora lectura sobre el robot */
          text-shadow:
            0 2px 8px rgba(0,0,0,.55),
            0 6px 22px rgba(0,0,0,.38);
        }

        /* ─── Frase destacada "vendiendo 24/7" · lila luminoso ─── */
        .hero-accent {
          background: linear-gradient(90deg, #C084FC 0%, #A855F7 45%, #E879F9 100%);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          -webkit-text-fill-color: transparent;
          /* Glow controlado para legibilidad sin exagerar */
          text-shadow:
            0 0 18px rgba(168,85,247,.28),
            0 4px 14px rgba(0,0,0,.22);
        }

        /* ─── Párrafo descriptivo · más contraste ─── */
        .hero-text .lead {
          margin: 0;
          max-width: 620px;
          font-size: clamp(1.05rem, 1.25vw, 1.20rem);   /* 17–20px desktop */
          font-weight: 500;
          line-height: 1.65;
          color: rgba(255,255,255,.82);
          text-shadow: 0 2px 8px rgba(0,0,0,.55);
        }

        /* ─── Botón principal del hero · degradado premium · flecha hover ─── */
        #hero .btn-primary {
          background: linear-gradient(90deg, #A855F7 0%, #D946EF 100%);
          box-shadow:
            0 10px 28px rgba(168,85,247,.25),
            0 0 18px rgba(217,70,239,.18),
            inset 0 1px 0 rgba(255,255,255,.20);
          transition:
            transform .35s cubic-bezier(.2,.7,.2,1),
            box-shadow .35s cubic-bezier(.2,.7,.2,1);
        }
        #hero .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow:
            0 14px 36px rgba(168,85,247,.32),
            0 0 24px rgba(217,70,239,.24),
            inset 0 1px 0 rgba(255,255,255,.24);
        }
        /* Flecha lucide se desliza ligeramente a la derecha en hover */
        #hero .btn-primary :global(svg) {
          transition: transform .35s cubic-bezier(.2,.7,.2,1);
        }
        #hero .btn-primary:hover :global(svg) {
          transform: translateX(4px);
        }

        /* ─── Microtexto debajo del botón ─── */
        .hero-text .micro-text {
          margin: 0;
          font-size: 13px;
          font-weight: 500;
          color: rgba(255,255,255,.58);
          letter-spacing: .04em;
          text-shadow: 0 1px 4px rgba(0,0,0,.45);
        }

        /* ─── Microtarjeta "NÜRO ONLINE" · compacta, no tapa al robot ─── */
        .online-chip {
          position: relative;
          z-index: 3;
          align-self: end;
          justify-self: end;
          display: inline-flex; align-items: center; gap: 12px;
          padding: 13px 16px;
          background: rgba(12,7,31,.78);
          border: 1px solid rgba(168,85,247,.26);
          border-radius: 14px;
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          box-shadow: 0 18px 48px rgba(0,0,0,.34);
          max-width: 200px;
        }
        .online-pulse {
          width: 10px; height: 10px; border-radius: 50%;
          background: #10B981;
          box-shadow: 0 0 12px rgba(16,185,129,.85);
          flex-shrink: 0;
          animation: pulseDot 2.4s ease-in-out infinite;
        }
        @keyframes pulseDot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%      { opacity: .55; transform: scale(.85); }
        }
        .online-label {
          font-size: 11px; font-weight: 700;
          letter-spacing: .22em; color: #F5F3FF;
          text-transform: uppercase;
        }
        .online-sub {
          font-size: 11.5px; font-weight: 500;
          color: #B8B2C8; margin-top: 2px;
        }

        /* ═══════════════════════════════════════════════════════════════
           2 · TICKER
           ═══════════════════════════════════════════════════════════════ */
        #ticker {
          padding-block: clamp(28px, 4vw, 56px);
          padding-inline: 0;
          gap: 12px;
        }
        .ticker-row {
          position: relative;
          width: 100%;
          overflow: hidden;
          -webkit-mask-image: linear-gradient(90deg, transparent, #000 7%, #000 93%, transparent);
                  mask-image: linear-gradient(90deg, transparent, #000 7%, #000 93%, transparent);
        }
        .ticker-row-soft { opacity: .5; filter: blur(.3px); }
        .ticker-track {
          display: flex; gap: 28px;
          width: max-content;
          will-change: transform;
          padding: 6px 0;
        }
        .ticker-left  { animation: tkLeft  56s linear infinite; }
        .ticker-right { animation: tkRight 70s linear infinite; }
        @keyframes tkLeft  { from { transform: translateX(0); }     to { transform: translateX(-50%); } }
        @keyframes tkRight { from { transform: translateX(-50%); }  to { transform: translateX(0); } }
        .ticker-item {
          display: inline-flex; align-items: center; gap: 10px;
          flex-shrink: 0;
          font-size: 12.5px; font-weight: 700;
          letter-spacing: .26em; text-transform: uppercase;
          color: #C0BAD0;
          padding: 10px 18px; border-radius: 999px;
          background: rgba(12,7,31,.55);
          border: 1px solid rgba(168,85,247,.20);
        }
        .ticker-dot {
          width: 5px; height: 5px; border-radius: 50%;
          background: #A855F7; flex-shrink: 0;
          box-shadow: 0 0 6px rgba(168,85,247,.7);
        }

        /* ═══════════════════════════════════════════════════════════════
           3 · TARJETA NUMERADA
           ═══════════════════════════════════════════════════════════════ */
        #problemas {
          align-items: center; text-align: center;
          gap: 32px;
        }
        .numbered-card {
          width: 100%; max-width: 720px;
          background: rgba(20,14,42,.85);
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
          border: 1px solid rgba(168,85,247,.22);
          border-radius: 18px;
          padding: 38px 32px;
          display: flex; flex-direction: column; gap: 20px;
          box-shadow: 0 24px 60px rgba(0,0,0,.36);
        }
        .numbered-title {
          color: #F5F3FF; text-align: center;
          font-size: clamp(1.4rem, 2.4vw, 1.85rem);
          font-weight: 700; letter-spacing: -.025em; line-height: 1.2;
          margin: 0 auto;
          max-width: 28ch;
          text-shadow: 0 2px 10px rgba(0,0,0,.65);
        }
        .numbered-list {
          list-style: none; padding: 0; margin: 0;
          display: flex; flex-direction: column; gap: 10px;
        }
        .numbered-row {
          display: flex; align-items: center; gap: 16px;
          padding: 14px 18px;
          background: rgba(5,3,18,.78);
          border: 1px solid rgba(168,85,247,.18);
          border-radius: 12px;
          text-align: left;
        }
        .numbered-row .num {
          color: #C084FC; font-weight: 800;
          font-size: 16px; letter-spacing: -.02em;
          font-style: italic; min-width: 28px;
          flex-shrink: 0;
        }
        .numbered-row .num-text {
          color: #C0BAD0; font-size: 14.5px; line-height: 1.55;
        }
        .numbered-closing {
          text-align: center;
          color: #C0BAD0; font-size: 15px;
          font-weight: 500; line-height: 1.55;
          max-width: 36ch; margin: 0 auto;
          display: flex; flex-direction: column; gap: 6px;
          text-shadow: 0 2px 8px rgba(0,0,0,.7);
        }
        .numbered-closing strong {
          font-size: 17px;
          font-weight: 700;
          font-style: normal;
        }

        /* ═══════════════════════════════════════════════════════════════
           4 · CELULAR + LISTA
           ═══════════════════════════════════════════════════════════════ */
        #solucion { justify-content: center; }
        .phone-grid {
          display: grid;
          grid-template-columns: minmax(260px, 320px) 1fr;
          gap: 60px;
          align-items: center;
          max-width: 1100px;
          width: 100%;
          margin: 0 auto;
        }
        .phone-mockup {
          position: relative;
          width: 100%;
          max-width: 280px;
          margin: 0 auto;
          transform: rotate(-3deg);
          animation: phoneFloat 6s ease-in-out infinite;
        }
        @keyframes phoneFloat {
          0%, 100% { transform: rotate(-3deg) translateY(0); }
          50%      { transform: rotate(-3deg) translateY(-8px); }
        }
        .phone-shadow {
          position: absolute;
          left: 8%; right: 8%; bottom: -28px;
          height: 28px;
          background: radial-gradient(ellipse at center, rgba(168,85,247,.32) 0%, rgba(0,0,0,0) 70%);
          filter: blur(14px);
          z-index: -1;
        }
        .phone-frame {
          position: relative;
          aspect-ratio: 9 / 19.5;
          border-radius: 38px;
          background: linear-gradient(180deg, #1a1133, #0a0714);
          border: 2px solid rgba(168,85,247,.30);
          padding: 8px;
          box-shadow:
            0 24px 60px rgba(0,0,0,.55),
            inset 0 1px 0 rgba(255,255,255,.06);
        }
        .phone-notch {
          position: absolute; top: 14px; left: 50%;
          transform: translateX(-50%);
          width: 90px; height: 22px;
          background: #050316;
          border-radius: 12px;
          z-index: 2;
        }
        .phone-screen {
          position: relative;
          width: 100%; height: 100%;
          border-radius: 32px;
          background: linear-gradient(180deg, #1a1033 0%, #050316 100%);
          overflow: hidden;
        }
        .phone-img {
          position: absolute; inset: 0;
          width: 100%; height: 100%;
          object-fit: cover;
          z-index: 1;
        }
        .phone-fallback {
          position: absolute; inset: 0;
          display: flex; flex-direction: column;
          padding: 48px 16px 18px;
          gap: 14px;
        }
        .phone-status {
          display: flex; justify-content: space-between;
          font-size: 10.5px; font-weight: 600;
          color: #B8B2C8;
          margin-top: 4px;
        }
        .phone-status-dots { letter-spacing: 1px; }
        .phone-msg-card {
          background: rgba(168,85,247,.10);
          border: 1px solid rgba(168,85,247,.30);
          border-radius: 14px;
          padding: 14px;
          display: flex; flex-direction: column; gap: 8px;
          backdrop-filter: blur(6px);
        }
        .phone-msg-head {
          display: flex; align-items: center; gap: 10px;
        }
        .phone-avatar {
          width: 32px; height: 32px;
          border-radius: 50%;
          background: linear-gradient(135deg, #A855F7, #D946EF);
          display: grid; place-items: center;
          color: #fff;
        }
        .phone-msg-meta { display: flex; flex-direction: column; gap: 2px; }
        .phone-msg-name { font-size: 12px; font-weight: 700; color: #F5F3FF; }
        .phone-msg-time { font-size: 10px; color: #8E879F; }
        .phone-msg-title {
          font-size: 11.5px; font-weight: 700;
          color: #F5F3FF; line-height: 1.4;
          margin: 0;
        }
        .phone-msg-body {
          font-size: 10.5px; color: #B8B2C8; line-height: 1.5;
          margin: 0;
        }
        .phone-input {
          margin-top: auto;
          display: flex; align-items: center; gap: 8px;
          padding: 9px 12px;
          background: rgba(255,255,255,.05);
          border: 1px solid rgba(168,85,247,.18);
          border-radius: 999px;
          color: #8E879F; font-size: 10.5px;
        }

        .phone-text {
          position: relative;
          display: flex; flex-direction: column; gap: 20px;
          max-width: 540px;
        }
        .phone-text::before {
          content: '';
          position: absolute;
          inset: -40px -60px;
          z-index: -1;
          pointer-events: none;
          background: radial-gradient(
            ellipse at center,
            rgba(5,3,18,.72) 0%,
            rgba(5,3,18,.40) 48%,
            rgba(5,3,18,0)  78%
          );
          filter: blur(12px);
        }
        .problems-list {
          list-style: none; padding: 0; margin: 0;
          display: flex; flex-direction: column; gap: 12px;
        }
        .problems-list li {
          display: flex; align-items: flex-start; gap: 12px;
          color: #C0BAD0; font-size: 14.5px;
          line-height: 1.55;
          text-shadow: 0 1px 6px rgba(0,0,0,.55);
        }
        .problems-list :global(svg) {
          color: #C084FC; flex-shrink: 0;
          margin-top: 4px;
          filter: drop-shadow(0 0 4px rgba(168,85,247,.4));
        }

        /* ═══════════════════════════════════════════════════════════════
           5 · DIVISOR
           ═══════════════════════════════════════════════════════════════ */
        .divider {
          padding-block: clamp(48px, 6vw, 84px);
          display: flex; justify-content: center;
          position: relative; z-index: 3;
        }
        .divider svg { filter: drop-shadow(0 0 12px rgba(168,85,247,.4)); }

        /* ═══════════════════════════════════════════════════════════════
           6 · INVITACIÓN
           ═══════════════════════════════════════════════════════════════ */
        #invitacion {
          align-items: center; text-align: center;
        }
        .invitation-wrap {
          position: relative;
          max-width: 880px;
          display: flex; flex-direction: column; align-items: center; gap: 20px;
        }
        .invitation-wrap::before {
          content: '';
          position: absolute;
          inset: -50px -100px;
          z-index: -1;
          pointer-events: none;
          background: radial-gradient(
            ellipse at center,
            rgba(5,3,18,.82) 0%,
            rgba(5,3,18,.50) 48%,
            rgba(5,3,18,0)  78%
          );
          filter: blur(14px);
        }
        .upper-line {
          color: #B8B2C8; font-size: 14px;
          font-weight: 500; letter-spacing: -.005em;
          font-style: italic;
          text-shadow: 0 2px 8px rgba(0,0,0,.7);
        }
        .invitation-wrap .h-display {
          text-align: center; margin: 0;
          max-width: 22ch;
        }
        .invitation-wrap .lead {
          text-align: center; margin: 0 auto;
          max-width: 56ch;
        }

        /* ═══════════════════════════════════════════════════════════════
           7 · CÁPSULAS
           ═══════════════════════════════════════════════════════════════ */
        #capsulas {
          align-items: center; text-align: center;
          gap: 32px;
        }
        .caps-grid {
          list-style: none; padding: 0; margin: 0;
          display: flex; flex-wrap: wrap; justify-content: center;
          gap: 10px;
          max-width: 840px;
        }
        .cap {
          display: inline-flex; align-items: center; gap: 8px;
          font-size: 13px; font-weight: 600;
          color: #C0BAD0;
          padding: 10px 16px; border-radius: 999px;
          background: rgba(12,7,31,.55);
          border: 1px solid rgba(168,85,247,.20);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          text-shadow: 0 1px 4px rgba(0,0,0,.5);
        }
        .cap :global(svg) {
          color: #A855F7; flex-shrink: 0;
        }
        .caps-text {
          color: #F5F3FF; font-size: clamp(1.05rem, 1.8vw, 1.35rem);
          font-weight: 600; line-height: 1.4;
          letter-spacing: -.01em;
          max-width: 36ch; margin: 0;
          text-shadow: 0 2px 10px rgba(0,0,0,.7);
        }
        .micro-list {
          list-style: none; padding: 0; margin: 0;
          display: flex; flex-wrap: wrap; justify-content: center;
          gap: 16px 22px;
        }
        .micro-list li {
          display: inline-flex; align-items: center; gap: 6px;
          color: #8E879F; font-size: 12px; font-weight: 500;
          letter-spacing: .02em;
          text-shadow: 0 1px 6px rgba(0,0,0,.55);
        }
        .micro-list :global(svg) { color: #A855F7; }

        /* ═══════════════════════════════════════════════════════════════
           8 · BANNER FINAL
           ═══════════════════════════════════════════════════════════════ */
        #banner { align-items: center; }
        .banner-card {
          width: 100%; max-width: 760px;
          margin: 0 auto;
          padding: 40px 36px;
          border-radius: 22px;
          background:
            linear-gradient(135deg, rgba(168,85,247,.10) 0%, rgba(217,70,239,.06) 100%),
            rgba(12,7,31,.78);
          border: 1px solid rgba(168,85,247,.28);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          box-shadow:
            0 30px 70px -28px rgba(0,0,0,.65),
            0 0 60px -28px rgba(168,85,247,.45);
          display: flex; flex-direction: column; align-items: center;
          text-align: center; gap: 22px;
        }
        .banner-card .h-2 {
          font-size: clamp(1.6rem, 3.4vw, 2.4rem);
          max-width: 20ch;
        }
        .banner-card .lead {
          margin: 0 auto; max-width: 52ch;
        }
        .alt-link {
          color: #B8B2C8; text-decoration: none;
          font-size: 12.5px; font-weight: 600;
          letter-spacing: .14em; text-transform: uppercase;
          padding: 6px 12px; border-radius: 8px;
          transition: color .2s;
          text-shadow: 0 1px 6px rgba(0,0,0,.6);
        }
        .alt-link:hover { color: #F5F3FF; }

        /* ═══════════════════════════════════════════════════════════════
           9 · FOOTER
           ═══════════════════════════════════════════════════════════════ */
        .footer {
          position: relative;
          z-index: 3;
          padding: 56px 6vw 32px;
          background: rgba(5,3,18,.55);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
        }
        .footer-grid {
          max-width: 1100px; margin: 0 auto;
          display: grid;
          grid-template-columns: minmax(220px, 1fr) auto;
          gap: 40px; align-items: start;
        }
        .footer-brand {
          display: flex; flex-direction: column; gap: 14px;
          max-width: 360px;
        }
        .footer-brand .logo-nuro { height: 26px; align-self: flex-start; }
        .footer-brand p {
          color: #8E879F; font-size: 13px;
          line-height: 1.6; margin: 0;
        }
        .footer-links {
          list-style: none; padding: 0; margin: 0;
          display: grid;
          grid-template-columns: repeat(2, auto);
          gap: 12px 36px;
        }
        .footer-links a {
          color: #B8B2C8; text-decoration: none;
          font-size: 13.5px; font-weight: 500;
          transition: color .2s;
        }
        .footer-links a:hover { color: #F5F3FF; }
        .footer-line {
          max-width: 1100px; margin: 32px auto 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(168,85,247,.22), transparent);
        }
        .footer-bottom {
          max-width: 1100px; margin: 18px auto 0;
          display: flex; align-items: center; justify-content: space-between;
          color: #8E879F; font-size: 11.5px; font-weight: 500;
          letter-spacing: .04em;
        }
        .back-top {
          width: 32px; height: 32px;
          border-radius: 50%;
          background: rgba(168,85,247,.08);
          border: 1px solid rgba(168,85,247,.22);
          color: #B8B2C8;
          cursor: pointer;
          display: grid; place-items: center;
          transition: background .2s, color .2s;
        }
        .back-top:hover { background: rgba(168,85,247,.16); color: #F5F3FF; }

        /* ═══════════════════════════════════════════════════════════════
           RESPONSIVE
           ═══════════════════════════════════════════════════════════════ */
        @media (max-width: 1024px) {
          section { padding-block: 72px; padding-inline: 5vw; }
          .topbar { padding: 16px 5vw; }
          .topbar.is-scrolled { padding: 12px 5vw; }
          .hero-grid { grid-template-columns: 1fr; gap: 36px; }
          .online-chip { justify-self: start; }
          .phone-grid { grid-template-columns: 1fr; gap: 40px; }
          .phone-mockup { order: 2; }
          .phone-text { order: 1; }
          .footer-grid { grid-template-columns: 1fr; gap: 28px; }
        }

        @media (max-width: 820px) {
          .topbar .menu { display: none; }
          .topbar { padding: 14px 20px; }
          .topbar.is-scrolled { padding: 12px 20px; }
          .topbar .logo-nuro { height: 24px; }
          .topbar .auth-btns { gap: 8px; }
          .topbar .auth-btns .btn { padding: 8px 12px; font-size: 12.5px; border-radius: 9px; }

          section { padding-block: 56px; padding-inline: 20px; }

          #hero { min-height: 100vh; padding-top: 96px; padding-bottom: 40px; }
          .hero-text { gap: 22px; max-width: 100%; }
          .hero-text::before { inset: -28px -28px -20px -20px; }
          .hero-title {
            font-size: clamp(2.4rem, 11vw, 3.6rem);
            line-height: 1;
            max-width: 100%;
          }
          .hero-text .lead {
            font-size: 14.5px;
            line-height: 1.6;
            max-width: 100%;
          }
          .hero-text .micro-text { font-size: 12px; }
          .online-chip { padding: 12px 14px; max-width: 100%; }

          .ticker-item { font-size: 11px; padding: 8px 14px; }
          .ticker-track { gap: 20px; }

          .numbered-card { padding: 28px 22px; border-radius: 16px; }
          .numbered-title { font-size: 1.25rem; }
          .numbered-row { padding: 12px 14px; gap: 12px; }
          .numbered-row .num-text { font-size: 13.5px; }

          .phone-grid { gap: 32px; }
          .phone-text::before { inset: -28px -28px; }
          .problems-list li { font-size: 13.5px; }

          .invitation-wrap::before { inset: -32px -40px; }
          .invitation-wrap .h-display { font-size: clamp(2rem, 9vw, 2.6rem); }
          .invitation-wrap .lead { font-size: 14px; }

          .caps-text { font-size: 17px; }
          .cap { font-size: 12.5px; padding: 9px 14px; }

          .banner-card { padding: 28px 22px; border-radius: 18px; }
          .banner-card .h-2 { font-size: clamp(1.4rem, 6.5vw, 1.85rem); }
          .banner-card .lead { font-size: 13.5px; }
          .btn-lg { font-size: 14px; padding: 13px 22px; }

          .footer { padding: 40px 20px 24px; }
          .footer-links { grid-template-columns: 1fr 1fr; gap: 10px 28px; }
          .footer-bottom { flex-direction: column; gap: 16px; }
        }

        @media (prefers-reduced-motion: reduce) {
          .particle, .bg-glow, .ticker-left, .ticker-right, .online-pulse, .phone-mockup {
            animation: none !important;
          }
          .topbar { transition: none; }
        }
      `}</style>
    </div>
  )
}
