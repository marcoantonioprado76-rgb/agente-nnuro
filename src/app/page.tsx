'use client'

/**
 * Landing NÜRO · cinematográfica scroll-driven
 *
 * Convertida desde el HTML autocontenido de AGENCIA DE MARKETING NURO
 * (landing-nuro/index.html) a componente React/Next nativo:
 *   - CSS inline → <style jsx global> dentro del componente
 *   - Three.js (CDN module) → dependencia npm `three`
 *   - GSAP + ScrollTrigger (CDN) → dependencia npm `gsap`
 *   - JS inline (partículas, testimonios, escena 3D) → hooks useEffect
 *
 * Para activar el robot 3D real, copia tu modelo a
 *   public/landing/nuro-robot.glb
 * (la página lo detecta automáticamente; sin él usa el PNG plano).
 */

import { useEffect, useRef, useState } from 'react'
import { Manrope } from 'next/font/google'
import { Bot, Store, Clock, Send, Sparkles, Play, ArrowRight } from 'lucide-react'
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

type Testimonio = {
  foto: string
  nombre: string
  tipo: string       // tipo de negocio (subtítulo)
  tag: 'Agente IA' | 'Tienda virtual'
  texto: string      // máximo ~2 líneas
}

const TESTIMONIOS: Testimonio[] = [
  { foto: 'https://randomuser.me/api/portraits/women/68.jpg', nombre: 'María González',   tipo: 'Boutique de moda',        tag: 'Agente IA',      texto: 'El agente atiende a toda hora. Cerré más ventas en un mes que en todo el trimestre.' },
  { foto: 'https://randomuser.me/api/portraits/men/32.jpg',   nombre: 'Carlos Méndez',    tipo: 'Distribuidora',           tag: 'Tienda virtual', texto: 'Mi tienda quedó impecable y profesional. Mis productos ahora se venden solos.' },
  { foto: 'https://randomuser.me/api/portraits/women/44.jpg', nombre: 'Lucía Fernández',  tipo: 'Centro estético',         tag: 'Agente IA',      texto: 'Respondo al instante aunque esté durmiendo. Se nota en los resultados.' },
  { foto: 'https://randomuser.me/api/portraits/men/75.jpg',   nombre: 'Andrés Rojas',     tipo: 'Inmobiliaria',            tag: 'Agente IA',      texto: 'El seguimiento automático recuperó clientes que daba por perdidos.' },
  { foto: 'https://randomuser.me/api/portraits/women/65.jpg', nombre: 'Valentina Torres', tipo: 'Pastelería artesanal',    tag: 'Agente IA',      texto: 'Pasé de responder tarde a atender 24/7. Mis clientes aman la rapidez.' },
  { foto: 'https://randomuser.me/api/portraits/men/11.jpg',   nombre: 'Diego Ramírez',    tipo: 'E-commerce',              tag: 'Tienda virtual', texto: 'Monté mi tienda online en días, no en meses. Moderna y muy fácil de usar.' },
  { foto: 'https://randomuser.me/api/portraits/women/90.jpg', nombre: 'Camila Herrera',   tipo: 'Servicios profesionales', tag: 'Agente IA',      texto: 'El agente presenta mi oferta mejor que yo. Profesional y siempre disponible.' },
  { foto: 'https://randomuser.me/api/portraits/men/4.jpg',    nombre: 'Jorge Castillo',   tipo: 'Marketing digital',       tag: 'Agente IA',      texto: 'Más prospectos atendidos y más ventas confirmadas. Transformó mi negocio.' },
  { foto: 'https://randomuser.me/api/portraits/women/12.jpg', nombre: 'Paola Núñez',      tipo: 'Spa & wellness',          tag: 'Tienda virtual', texto: 'Una imagen profesional las 24 horas. Mis clientes confían más en mi marca.' },
  { foto: 'https://randomuser.me/api/portraits/men/47.jpg',   nombre: 'Sebastián Vargas', tipo: 'Academia online',         tag: 'Agente IA',      texto: 'La IA cierra ventas mientras yo me enfoco en crecer. Resultados increíbles.' },
]

const mitad = Math.ceil(TESTIMONIOS.length / 2)
const TESTI_LEFT  = TESTIMONIOS.slice(0, mitad)
const TESTI_RIGHT = TESTIMONIOS.slice(mitad)

export default function LandingPage() {
  const sceneRef     = useRef<HTMLDivElement>(null)
  const particlesRef = useRef<HTMLDivElement>(null)
  const [scrolled, setScrolled] = useState(false)

  // Navbar scroll-aware: añade fondo blur al pasar 24px de scroll
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // ──────────────  PARTÍCULAS FLOTANTES  ──────────────
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

  // ──────────────  ESCENA THREE.JS + GSAP SCROLLTRIGGER  ──────────────
  useEffect(() => {
    const container = sceneRef.current
    if (!container) return

    gsap.registerPlugin(ScrollTrigger)
    const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches

    // ── Setup Three.js ──
    const scene  = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, 0.1, 100)
    camera.position.set(0, 0.9, 2.3)

    // Antialias solo en desktop · pixelRatio máx 1.5 en lugar de 2 (ahorra GPU brutal en retina mobile)
    const isPhone = innerWidth < 820
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: !isPhone })
    renderer.setSize(innerWidth, innerHeight)
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5))
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.1
    container.appendChild(renderer.domElement)

    // PMREMGenerator + RoomEnvironment eliminados — costaban ~200ms de GPU
    // en la primera carga y no aportan nada cuando el robot es un PNG plano.
    // Si en el futuro se carga un GLB con materiales metálicos, se puede
    // reactivar puntualmente dentro del callback onLoad de GLTFLoader.

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

    // Grupo robot
    const robot = new THREE.Group()
    scene.add(robot)

    // Plataforma circular luminosa
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

    // Anillos tecnológicos
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

    // ── Modelo del robot ──
    let model: THREE.Object3D | null = null
    let usingFallback = false   // true cuando se usa el PNG plano del robot original

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

    /* ─────────────────────────────────────────────────────────────
     *  ROBOT FALLBACK · usa la imagen PNG original (robot.png) sobre
     *  un plano transparente. Como es 2D, no rota 360°: hace un
     *  vaivén lateral de ±15° para dar sensación de presencia sin
     *  enseñar el "lado delgado" del plano.
     *
     *  Para activar el 3D real con rotación 360° completa, copiá
     *  tu modelo .glb a public/landing/nuro-robot.glb — la página
     *  lo detecta sola al recargar.
     * ───────────────────────────────────────────────────────────── */
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
          // ✅ Modelo real cargado → rotación 360° completa
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
          // ⚠️ Sin GLB → usar el PNG plano del robot original
          console.info('[NÜRO] No hay GLB en', ROBOT_GLB_PATH, '· usando imagen plana del robot.')
          buildFallback()
        }
      )
    }

    // ── Estado animado ──
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
      // PNG plano → vaivén suave de ±15° (no se vería bien al rotar 360°).
      // GLB real (cuando exista) → vuelta completa ligada al scroll.
      target.rotY  = usingFallback
        ? THREE.MathUtils.degToRad(15) * Math.sin(p * Math.PI * 2)
        : p * Math.PI * 2
    }

    const scrollTrigger = ScrollTrigger.create({
      trigger: '.content',
      start: 'top top',
      end: 'bottom bottom',
      // 1s de smoothing extra hacía sentir el scroll perezoso. 0.4s = respuesta
      // casi inmediata pero sin saltos (la cámara aún ease entre frames).
      scrub: 0.4,
      onUpdate: (self) => applyProgress(self.progress),
    })

    // ── Render loop ──
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

      // Si es el PNG plano, que el mesh interno NO rote (el grupo ya hace ±15°).
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

    // Arranque
    applyProgress(0)
    animate()
    // Carga del modelo diferida: si el browser soporta requestIdleCallback,
    // espera a que el main thread esté libre (mejor first paint). Fallback: timeout 100ms.
    type IdleWin = Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout?: number }) => number
    }
    const w = window as IdleWin
    if (typeof w.requestIdleCallback === 'function') {
      w.requestIdleCallback(loadRobot, { timeout: 600 })
    } else {
      setTimeout(loadRobot, 100)
    }

    // Cleanup
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

  return (
    <div className={manrope.variable}>
      <div className="bg-gradient" />
      <div className="bg-grid" />
      <div className="bg-glow" />
      <div className="bg-glow-warm" />
      <div id="particles" ref={particlesRef} />
      <div id="scene" ref={sceneRef} />

      <header className={`topbar ${scrolled ? 'is-scrolled' : ''}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/landing/logo-blanco.png" className="logo-nuro" alt="NÜRO" />
        <nav className="menu">
          <a href="#demo">Demo</a>
          <a href="#vision">Visión</a>
          <a href="#servicios">Servicios</a>
          <a href="#testimonios">Testimonios</a>
        </nav>
        <div className="auth-btns">
          <a href="/login"    className="btn btn-ghost btn-nav">Iniciar sesión</a>
          <a href="/register" className="btn btn-primary btn-nav">Registrarse</a>
        </div>
      </header>

      <main className="content">
        {/* ─── HERO ─── */}
        <section id="hero">
          <div className="hero-bg" aria-hidden />
          <div className="hero-text">
            <span className="eyebrow">
              <span className="eyebrow-dot" /> Agentes de inteligencia artificial para negocios
            </span>
            <h1 className="h-display">
              Tu negocio sigue trabajando, <span className="accent">incluso cuando tú no estás.</span>
            </h1>
            <p className="lead">
              NÜRO combina agentes de ventas con inteligencia artificial y tiendas virtuales
              profesionales para atender, hacer seguimiento y convertir oportunidades durante
              todo el día.
            </p>
            <div className="cta-row">
              <a href="#demo" className="btn btn-primary">
                Ver cómo funciona <ArrowRight size={16} strokeWidth={2.4} />
              </a>
              <a href="#cta" className="btn btn-ghost">Solicitar demostración</a>
            </div>
            <div className="scroll-hint" aria-hidden><i />DESLIZA</div>
          </div>
        </section>

        {/* ─── TRANSICIÓN ─── */}
        <section id="transicion">
          <div className="trans-wrap">
            <span className="eyebrow">
              <span className="eyebrow-dot" /> Plataforma comercial inteligente
            </span>
            <h2 className="h-2">Una nueva forma de hacer crecer tu negocio.</h2>
            <p className="lead lead-sm">
              Automatiza la atención comercial sin perder cercanía con tus clientes.
            </p>
            <ul className="pillar-row">
              <li><Clock    size={15} strokeWidth={1.8} /> Atención 24/7</li>
              <li><Send     size={15} strokeWidth={1.8} /> Seguimiento automático</li>
              <li><Sparkles size={15} strokeWidth={1.8} /> Presencia digital profesional</li>
            </ul>
          </div>
        </section>

        {/* ─── DEMO VIDEO ─── */}
        <section id="demo">
          <div className="demo-wrap">
            {/* Encabezado independiente · 38px de separación al reproductor */}
            <div className="demo-head">
              <span className="eyebrow">
                <span className="eyebrow-dot" /> Demo en video
              </span>
              <h2 className="h-2">Descubre cómo trabaja NÜRO por tu negocio.</h2>
              <p className="lead lead-sm">
                Mira en menos de dos minutos cómo una experiencia automatizada puede ayudarte a
                atender mejor.
              </p>
            </div>
            <div className="video-frame">
              <iframe
                src="https://player.vimeo.com/video/1197763990?title=0&byline=0&portrait=0&dnt=1"
                allow="autoplay; fullscreen; picture-in-picture; clipboard-write"
                allowFullScreen
                loading="lazy"
                title="NÜRO en acción"
              />
            </div>
            <a className="video-link" href="https://vimeo.com/1197763990" target="_blank" rel="noopener noreferrer">
              <Play size={12} strokeWidth={2.4} /> Ver en Vimeo
            </a>
          </div>
        </section>

        {/* ─── VISIÓN ─── */}
        <section id="vision">
          <div className="side-card">
            <span className="eyebrow">
              <span className="eyebrow-dot" /> Visión
            </span>
            <h2 className="h-2">
              Tu negocio activo, <span className="accent">incluso cuando no estás conectado.</span>
            </h2>
            <p className="lead lead-sm">
              Mientras tú te enfocas en crecer, NÜRO mantiene tu atención comercial en
              movimiento: responde, organiza conversaciones y muestra tu oferta con una imagen
              profesional.
            </p>
          </div>
        </section>

        {/* ─── SERVICIOS ─── */}
        <section id="servicios">
          <div className="serv-wrap">
            <span className="eyebrow">
              <span className="eyebrow-dot" /> Servicios
            </span>
            <h2 className="h-2">Dos formas en que NÜRO hace crecer tu negocio.</h2>
            <div className="serv-grid">
              <article className="serv-card">
                <div className="serv-ic"><Bot size={22} strokeWidth={1.6} /></div>
                <h3>Agentes IA de ventas</h3>
                <p>Atienden consultas, presentan tu oferta, realizan seguimiento y ayudan a
                  confirmar ventas durante las 24 horas.</p>
              </article>
              <article className="serv-card">
                <div className="serv-ic"><Store size={22} strokeWidth={1.6} /></div>
                <h3>Tiendas virtuales profesionales</h3>
                <p>Presenta tus productos o servicios con una experiencia digital clara,
                  moderna y preparada para convertir visitas en oportunidades.</p>
              </article>
            </div>
          </div>
        </section>

        {/* ─── TESTIMONIOS ─── */}
        {/* Estructura en 2 capas independientes:
             - .testi-head (z 5): encabezado con capa oscura LOCAL (::before)
             - .testi-carousel (z 4): carrusel infinito, separado del header
            El robot global (#scene z 1) queda detrás de TODO el contenido. */}
        <section id="testimonios">
          <div className="testi-content">
            <div className="testi-head">
              <span className="eyebrow">
                <span className="eyebrow-dot" /> Prueba social
              </span>
              <h2 className="h-2">Negocios que ya crecen con <span className="testi-accent">NÜRO</span>.</h2>
            </div>

            <div className="testi-carousel">
              <div className="marquee"><div className="mtrack to-right">
                {[...TESTI_LEFT, ...TESTI_LEFT].map((t, i) => (
                  <Tcard key={`L${i}`} t={t} />
                ))}
              </div></div>
              <div className="marquee"><div className="mtrack to-left">
                {[...TESTI_RIGHT, ...TESTI_RIGHT].map((t, i) => (
                  <Tcard key={`R${i}`} t={t} />
                ))}
              </div></div>
            </div>
          </div>
        </section>

        {/* ─── CTA FINAL ─── */}
        <section id="cta">
          <div className="cta-inner">
            <h2 className="h-2">Lleva tu negocio a una nueva generación digital.</h2>
            <a href="/register" className="btn btn-primary btn-lg">
              Solicitar demostración <ArrowRight size={18} strokeWidth={2.4} />
            </a>
            <div className="footer-note">© NÜRO · Tecnología que trabaja contigo.</div>
          </div>
        </section>
      </main>

      <style jsx global>{`
        :root {
          /* Paleta original (usada por la animación de fondo · NO TOCAR) */
          --naranja:#e0219a;
          --naranja-claro:#b16cff;
          --azul-neon:#9b5cff;
          --azul-glow:rgba(155,92,255,.55);
          --negro:#0a0714;
          --azul-oscuro:#150f2c;
          /* Paleta editorial nueva (rediseño 2026) */
          --text-1:#F5F3FF;   /* texto principal */
          --text-2:#B8B2C8;   /* texto secundario */
          --text-3:#8E879F;   /* texto auxiliar */
          --acc-violet:#A855F7;
          --acc-fuchsia:#D946EF;
        }
        html { scroll-behavior: smooth; }
        body {
          font-family: var(--font-manrope), 'Plus Jakarta Sans', 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif;
          color: var(--text-1);
          background: var(--negro);
          overflow-x: hidden;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }

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

        /* z-index: scene/particles → 1 (robot y partículas detrás de TODO el contenido) */
        #scene { position: fixed; inset: 0; z-index: 1; pointer-events: none; }
        #scene canvas { display: block; width: 100%; height: 100%; }

        /* ═══════════════════════════════════════════════════════════
           CONTENIDO · paleta editorial premium
           Texto:    #F5F3FF principal · #B8B2C8 secundario · #8E879F auxiliar
           Acento:   #A855F7 violeta · #D946EF fucsia (puntual)
           Cards:    negro violeta translúcido oscuro, blur, borde fino
           Z-INDEX: bg 0 · robot/partículas 1 · scrims 2 · contenido 3 · nav 10
           ═══════════════════════════════════════════════════════════ */
        .content { position: relative; z-index: 3; }
        section {
          /* Quitamos min-height: 100vh global — solo el hero lo necesita.
             Cada sección crece según contenido. padding-block fluido. */
          display: flex; flex-direction: column;
          padding-block: clamp(72px, 9vw, 132px);
          padding-inline: 6vw;
          position: relative;
        }

        /* Estructura interna estándar por sección: etiqueta → título → texto → cta/indicadores */
        .stack { display: flex; flex-direction: column; }

        /* ── Capa decorativa local del hero · z-index 2 ──
           El resto de secciones usa ::before localizados detrás de su
           encabezado (no scrims globales con inset:0 que oscurezcan
           todo el contenido). */
        .hero-bg {
          position: absolute;
          pointer-events: none;
          z-index: 2;
        }

        /* ── NAVBAR (scroll-aware) · z-index 10 ── */
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
        .topbar .menu { display: flex; gap: 30px; align-items: center; }
        .topbar .menu a {
          color: #B8B2C8; text-decoration: none;
          font-size: 14px; font-weight: 600; letter-spacing: -.005em;
          transition: color .2s;
        }
        .topbar .menu a:hover { color: #F5F3FF; }
        .topbar .auth-btns { display: flex; gap: 10px; align-items: center; }

        /* ── BOTONES ── */
        .btn {
          display: inline-flex; align-items: center; gap: 8px;
          border: 0; cursor: pointer;
          font-size: 15px; font-weight: 600; letter-spacing: -.01em;
          padding: 14px 26px; border-radius: 12px;
          transition: transform .22s ease, box-shadow .22s ease, background .22s ease, color .22s ease, border-color .22s ease;
          text-decoration: none; white-space: nowrap;
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
        .btn-lg  { font-size: 16.5px; padding: 16px 32px; border-radius: 14px; }

        /* ── EYEBROW (etiqueta sutil de sección) ── */
        .eyebrow {
          display: inline-flex; align-items: center; gap: 9px;
          font-size: 11.5px; font-weight: 600;
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
          background: #A855F7;
          box-shadow: 0 0 8px rgba(168,85,247,.7);
        }

        /* ── TIPOGRAFÍA · clamps exactos del brief + text-shadow elegante ── */
        h1, h2, h3 {
          color: #F5F3FF;
          letter-spacing: -.03em; line-height: 1.06; font-weight: 700;
          text-shadow:
            0 3px 12px rgba(0,0,0,.75),
            0 8px 30px rgba(0,0,0,.45);
        }
        .h-display {
          font-size: clamp(2.3rem, 5vw, 4.8rem);
          font-weight: 800;
          letter-spacing: -.055em;
          line-height: 1.02;
          max-width: 18ch;
        }
        .h-2 {
          font-size: clamp(2rem, 4vw, 3.8rem);
          font-weight: 800;
          letter-spacing: -.045em;
          line-height: 1.05;
          max-width: 22ch;
        }
        .accent {
          background: linear-gradient(95deg, #A855F7 0%, #D946EF 100%);
          -webkit-background-clip: text; background-clip: text;
          color: transparent;
          /* El text-shadow de h1/h2 funciona vía text-shadow del padre porque
             el span hereda — pero al ser texto en gradient, no se ve la sombra.
             Le añadimos un drop-shadow filter para preservar legibilidad. */
          filter: drop-shadow(0 3px 12px rgba(0,0,0,.55));
        }
        .lead {
          color: #C0BAD0;
          font-size: clamp(1rem, 1.4vw, 1.2rem);
          font-weight: 500;
          line-height: 1.7;
          letter-spacing: -.005em;
          max-width: 680px;
          text-shadow: 0 2px 8px rgba(0,0,0,.70);
        }
        .lead-sm { font-size: clamp(.95rem, 1.2vw, 1.05rem); max-width: 56ch; }

        /* ─────────────────────────────────────────────────────────
           HERO · única sección con min-height: 100vh
           Estructura flujo normal: eyebrow → título → lead → CTAs → hint
           ───────────────────────────────────────────────────────── */
        #hero {
          min-height: 100vh;
          justify-content: flex-end;
          align-items: center; text-align: center;
          padding-bottom: clamp(48px, 6vh, 80px);
          padding-top: 120px;
        }
        #hero .hero-bg {
          left: 50%; bottom: 0;
          width: min(880px, 92%); height: 60%;
          transform: translateX(-50%);
          background:
            radial-gradient(ellipse at center,
              rgba(4,3,16,.78) 0%,
              rgba(4,3,16,.44) 48%,
              rgba(4,3,16,0) 78%);
        }
        #hero .hero-text {
          position: relative;
          max-width: 760px; margin: 0 auto;
          display: flex; flex-direction: column; align-items: center;
          gap: 18px;
        }
        #hero .cta-row { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; margin-top: 8px; }

        .scroll-hint {
          margin-top: 26px; color: #B8B2C8;
          font-size: 11px; font-weight: 600; letter-spacing: .26em;
          display: flex; flex-direction: column; align-items: center; gap: 8px;
          animation: bob 2.4s ease-in-out infinite;
          text-shadow: 0 2px 8px rgba(0,0,0,.70);
        }
        .scroll-hint i {
          width: 20px; height: 32px;
          border: 1.5px solid rgba(184,178,200,.55);
          border-radius: 12px; position: relative;
        }
        .scroll-hint i::after {
          content: ''; position: absolute; top: 5px; left: 50%;
          width: 2.5px; height: 6px; border-radius: 2px;
          background: #A855F7; transform: translateX(-50%);
          animation: wheel 1.8s infinite;
        }
        @keyframes wheel { 0% { opacity: 1; top: 5px; } 100% { opacity: 0; top: 17px; } }
        @keyframes bob   { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(6px); } }

        /* ─────────────────────────────────────────────────────────
           TRANSICIÓN · contenedor centrado max 980 · capa radial LOCAL
           detrás del encabezado (no cubre toda la sección)
           ───────────────────────────────────────────────────────── */
        #transicion {
          justify-content: center; align-items: center; text-align: center;
        }
        .trans-wrap {
          position: relative;
          z-index: 3;
          max-width: 980px; width: 100%; margin: 0 auto;
          display: flex; flex-direction: column; align-items: center;
          gap: 22px;
        }
        /* Capa oscura LOCAL detrás del bloque de texto · z-index -1
           NUNCA encima del contenido ni de los indicadores */
        .trans-wrap::before {
          content: '';
          position: absolute;
          inset: -40px -80px;
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
        .trans-wrap .eyebrow { align-self: center; }
        .trans-wrap .h-2 { text-align: center; }
        .trans-wrap .lead { text-align: center; margin: 0 auto; }
        .pillar-row {
          margin-top: 8px;
          display: flex; gap: 12px; flex-wrap: wrap; justify-content: center;
          list-style: none; padding: 0;
        }
        .pillar-row li {
          display: inline-flex; align-items: center; gap: 8px;
          font-size: 13.5px; font-weight: 600; color: #F5F3FF;
          padding: 10px 18px; border-radius: 999px;
          background: rgba(12,7,31,.82);
          border: 1px solid rgba(168,85,247,.28);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          box-shadow: 0 12px 28px -16px rgba(0,0,0,.55);
        }
        .pillar-row li :global(svg) { color: #A855F7; }

        /* ─────────────────────────────────────────────────────────
           DEMO VIDEO · header independiente con capa LOCAL detrás
           del título (no cubre el reproductor)
           ───────────────────────────────────────────────────────── */
        #demo {
          justify-content: center; align-items: center; text-align: center;
        }
        #demo .demo-wrap {
          position: relative;
          z-index: 3;
          width: 100%; max-width: 960px; margin: 0 auto;
          display: flex; flex-direction: column; align-items: center;
        }
        .demo-head {
          position: relative;
          display: flex; flex-direction: column; align-items: center;
          gap: 18px;             /* eyebrow ↔ título ↔ párrafo */
          margin-bottom: 38px;   /* separación mínima del reproductor */
          max-width: 720px;
          padding-inline: 24px;
        }
        /* Capa oscura LOCAL detrás del encabezado · z-index -1 */
        .demo-head::before {
          content: '';
          position: absolute;
          inset: -50px -90px;
          z-index: -1;
          pointer-events: none;
          background: radial-gradient(
            ellipse at center,
            rgba(5,3,18,.74) 0%,
            rgba(5,3,18,.42) 48%,
            rgba(5,3,18,0)  78%
          );
          filter: blur(12px);
        }
        .demo-head .h-2 { text-align: center; }
        .demo-head .lead { text-align: center; margin: 0; }
        .video-frame {
          position: relative; width: 100%; aspect-ratio: 16/9; margin: 0 auto;
          border-radius: 18px; overflow: hidden; background: #0a0714;
          border: 1px solid rgba(168,85,247,.22);
          box-shadow:
            0 30px 70px -28px rgba(0,0,0,.75),
            0 0 0 1px rgba(255,255,255,.04) inset;
        }
        .video-frame iframe {
          position: absolute; inset: 0; width: 100%; height: 100%;
          border: 0; display: block;
        }
        .video-link {
          display: inline-flex; align-items: center; gap: 7px;
          margin-top: 20px;
          color: #B8B2C8; text-decoration: none;
          font-weight: 600; font-size: 13.5px; letter-spacing: -.005em;
          transition: color .2s;
          text-shadow: 0 2px 8px rgba(0,0,0,.70);
        }
        .video-link :global(svg) { color: #A855F7; }
        .video-link:hover { color: #F5F3FF; }

        /* ─────────────────────────────────────────────────────────
           VISIÓN · la card ya tiene background sólido y bordes con
           contraste; NO necesita scrim global encima de la sección.
           ───────────────────────────────────────────────────────── */
        #vision {
          justify-content: center;
        }
        .side-card {
          position: relative;
          max-width: 460px;
          width: 100%;
          margin-left: auto;
          background: rgba(12,7,31,.82);
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
          border: 1px solid rgba(168,85,247,.28);
          border-radius: 18px;
          padding: 32px 34px;
          display: flex; flex-direction: column; gap: 18px;
          box-shadow: 0 20px 55px rgba(0,0,0,.32);
        }
        .side-card .h-2 { font-size: clamp(1.6rem, 2.6vw, 2.2rem); max-width: 100%; }
        .side-card .lead { font-size: clamp(.95rem, 1.2vw, 1.05rem); max-width: 100%; }

        /* ─────────────────────────────────────────────────────────
           SERVICIOS · 2 cards verticales con orden interno consistente
           ───────────────────────────────────────────────────────── */
        #servicios { justify-content: center; }
        .serv-wrap {
          max-width: 580px; width: 100%;
          display: flex; flex-direction: column; gap: 22px;
        }
        .serv-wrap .h-2 { font-size: clamp(1.6rem, 2.8vw, 2.4rem); max-width: 18ch; }
        .serv-grid { display: grid; grid-template-columns: 1fr; gap: 18px; }
        .serv-card {
          background: rgba(12,7,31,.82);
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
          border: 1px solid rgba(168,85,247,.28);
          border-radius: 14px;
          padding: 22px 24px;
          transition: transform .25s, border-color .25s, box-shadow .25s;
          display: flex; flex-direction: column; gap: 10px;
          box-shadow: 0 20px 55px rgba(0,0,0,.32);
        }
        .serv-card:hover {
          border-color: rgba(168,85,247,.52);
          transform: translateY(-2px);
          box-shadow: 0 26px 64px -16px rgba(168,85,247,.35);
        }
        .serv-ic {
          width: 44px; height: 44px; border-radius: 12px;
          display: grid; place-items: center;
          color: #A855F7;
          background: rgba(168,85,247,.12);
          border: 1px solid rgba(168,85,247,.28);
        }
        .serv-card h3 {
          font-size: clamp(1.05rem, 1.4vw, 1.2rem);
          font-weight: 700; letter-spacing: -.018em;
        }
        .serv-card p {
          color: #C0BAD0;
          font-size: clamp(.9rem, 1.05vw, 1rem);
          font-weight: 500;
          line-height: 1.65;
          max-width: 48ch;
        }

        /* ─────────────────────────────────────────────────────────
           TESTIMONIOS · 2 capas independientes: head + carrusel
           El overlay oscuro VIVE solo detrás del título (::before),
           NUNCA encima del contenido. Robot global queda detrás (z 1).
           ───────────────────────────────────────────────────────── */
        #testimonios {
          padding-block: clamp(90px, 10vw, 150px);
          padding-inline: 6vw;
          overflow: hidden;
          display: block; /* sin flex global · cada bloque maneja su propio layout */
        }
        .testi-content {
          position: relative;
          z-index: 3;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        /* ── Encabezado independiente (z 5) ── */
        .testi-head {
          position: relative;
          z-index: 5;
          display: flex; flex-direction: column; align-items: center;
          justify-content: center;
          gap: 18px;
          text-align: center;
          max-width: 900px;
          margin: 0 auto 54px; /* separación mínima del carrusel */
          padding-inline: 24px;
        }
        /* Capa oscura LOCAL · radial suave SOLO detrás del título */
        .testi-head::before {
          content: '';
          position: absolute;
          inset: -60px -100px;
          z-index: -1; /* atrás del título y la etiqueta, nunca encima */
          pointer-events: none;
          background: radial-gradient(
            ellipse at center,
            rgba(5,3,18,.78) 0%,
            rgba(5,3,18,.44) 45%,
            rgba(5,3,18,0)  76%
          );
          filter: blur(12px);
        }
        .testi-head .eyebrow { align-self: center; }
        .testi-head .h-2 {
          margin: 0;
          max-width: 860px;
          color: #F7F5FF;
          font-family: var(--font-manrope), 'Plus Jakarta Sans', 'Inter', sans-serif;
          font-size: clamp(2rem, 3.6vw, 3.4rem);
          font-weight: 800;
          line-height: 1.04;
          letter-spacing: -.055em;
          text-align: center;
          text-shadow:
            0 4px 10px rgba(0,0,0,.92),
            0 10px 34px rgba(0,0,0,.76);
        }
        .testi-head .testi-accent {
          color: #C084FC;
          background: none;
          -webkit-text-fill-color: #C084FC;
          filter: none;
          text-shadow:
            0 4px 10px rgba(0,0,0,.92),
            0 10px 34px rgba(0,0,0,.72);
        }

        /* ── Carrusel separado del encabezado (z 4) ── */
        .testi-carousel {
          position: relative;
          z-index: 4;
          width: 100%;
          margin-top: 12px; /* 54 + 12 = 66px desde el header (≥ 48px exigido) */
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .marquee {
          position: relative;
          width: 100%;
          overflow: hidden;
          -webkit-mask-image: linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent);
                  mask-image: linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent);
        }
        .mtrack { display: flex; gap: 14px; width: max-content; will-change: transform; padding: 6px 0; }
        .mtrack.to-left  { animation: marqueeLeft  60s linear infinite; }
        .mtrack.to-right { animation: marqueeRight 60s linear infinite; }
        @keyframes marqueeLeft  { from { transform: translateX(0); }     to { transform: translateX(-50%); } }
        @keyframes marqueeRight { from { transform: translateX(-50%); }  to { transform: translateX(0); } }
        .marquee:hover .mtrack { animation-play-state: paused; }

        /* ── Tarjetas con MÁS contraste (sin oscurecer la sección) ── */
        .tcard {
          position: relative;
          z-index: 4;
          display: flex; align-items: flex-start; gap: 14px; flex: 0 0 auto;
          width: 320px;
          background: rgba(14,8,34,.86);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(168,85,247,.26);
          border-radius: 18px;
          padding: 22px; text-align: left;
          box-shadow:
            0 18px 46px rgba(0,0,0,.34),
            inset 0 1px 0 rgba(255,255,255,.03);
        }
        .tcard img {
          width: 42px; height: 42px; border-radius: 50%; object-fit: cover; flex: 0 0 auto;
          border: 1.5px solid rgba(168,85,247,.32); background: #1a1330;
        }
        .tcard-body { min-width: 0; flex: 1; display: flex; flex-direction: column; gap: 4px; }
        .tcard-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
        .tcard .tn  {
          font-weight: 700; font-size: 1rem; color: #F5F2FF;
          letter-spacing: -.01em;
        }
        .tcard-tag {
          display: inline-block;
          font-size: 9.5px; font-weight: 600;
          letter-spacing: .12em; text-transform: uppercase;
          padding: 3px 9px; border-radius: 999px;
          color: #C0BAD0;
          background: rgba(168,85,247,.12);
          border: 1px solid rgba(168,85,247,.26);
          white-space: nowrap;
        }
        .tcard-tag.is-tienda { color: #D946EF; border-color: rgba(217,70,239,.34); background: rgba(217,70,239,.10); }
        .tcard-tipo { font-size: 11.5px; color: #9892AB; }
        .tcard .tt  {
          font-size: .94rem; color: #B8B2C8; line-height: 1.55; margin-top: 8px;
          display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical;
          overflow: hidden;
        }

        /* ─────────────────────────────────────────────────────────
           CTA FINAL
           ───────────────────────────────────────────────────────── */
        #cta {
          justify-content: center; align-items: center; text-align: center;
        }
        #cta .cta-inner {
          max-width: 720px; width: 100%;
          background: radial-gradient(120% 120% at 50% 0%, rgba(12,7,31,.85) 0%, rgba(12,7,31,.55) 60%, transparent 100%);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(168,85,247,.22);
          border-radius: 22px;
          padding: 36px 40px 32px;
          display: flex; flex-direction: column; align-items: center; gap: 22px;
          box-shadow: 0 24px 60px rgba(0,0,0,.36);
        }
        #cta .h-2 { font-size: clamp(2rem, 4.4vw, 3.4rem); max-width: 18ch; text-align: center; }
        #cta .footer-note {
          margin-top: 14px; color: #8E879F; font-size: 12px; font-weight: 500;
          letter-spacing: .04em;
        }

        /* ═══════════════════════════════════════════════════════════
           RESPONSIVE
           ═══════════════════════════════════════════════════════════ */
        @media (max-width: 1024px) {
          section { padding-block: 72px; padding-inline: 5vw; }
          .topbar { padding: 16px 5vw; }
          .topbar.is-scrolled { padding: 12px 5vw; }
        }

        @media (max-width: 820px) {
          .topbar .menu { display: none; }
          .topbar { padding: 14px 20px; }
          .topbar.is-scrolled { padding: 12px 20px; }
          .topbar .logo-nuro { height: 24px; }
          .topbar .auth-btns { gap: 8px; }
          .topbar .auth-btns .btn { padding: 8px 12px; font-size: 12.5px; border-radius: 9px; }

          /* padding lateral 20px en mobile · sin scroll horizontal */
          section { padding-block: 56px; padding-inline: 20px; }

          /* Hero más compacto */
          #hero { min-height: 100vh; padding-bottom: 40px; padding-top: 96px; }
          #hero .hero-bg { width: 96%; height: 58%; }
          #hero .h-display { max-width: 100%; }
          #hero .cta-row { gap: 10px; }
          #hero .btn { padding: 11px 20px; font-size: 14px; }
          #hero .scroll-hint { display: none; }

          /* Transición */
          .trans-wrap { gap: 18px; }
          .trans-scrim { width: 100%; height: 90%; }
          .pillar-row { gap: 10px; }
          .pillar-row li { font-size: 12.5px; padding: 8px 14px; }

          /* Demo · separación 30px del reproductor en mobile */
          .demo-head { margin-bottom: 30px; gap: 14px; padding-inline: 20px; }
          .demo-head::before { inset: -30px -50px; }

          /* Visión · panel centrado a 1 columna, casi todo ancho */
          .side-card { padding: 24px 22px; max-width: 100%; margin: 0 auto; }

          /* Servicios · 1 columna */
          .serv-wrap { max-width: 100%; margin: 0 auto; gap: 18px; }
          .serv-grid { grid-template-columns: 1fr; gap: 14px; }
          .serv-card { padding: 20px 20px; }

          /* Testimonios mobile · header reducido y separado del carrusel */
          #testimonios { padding-block: 72px; padding-inline: 20px; }
          .testi-head {
            gap: 14px;
            margin: 0 auto 38px;
            padding-inline: 20px;
            max-width: 100%;
          }
          .testi-head::before {
            inset: -40px -60px;
          }
          .testi-head .h-2 {
            font-size: clamp(1.8rem, 9vw, 2.6rem);
            line-height: 1.05;
          }
          .testi-carousel { gap: 16px; margin-top: 0; }
          .tcard {
            width: min(300px, 86vw);
            padding: 18px;
            border-radius: 16px;
          }
          .tcard .tt { -webkit-line-clamp: 3; }

          /* CTA */
          #cta .cta-inner { padding: 28px 22px 24px; }
          .btn-lg { font-size: 14.5px; padding: 14px 22px; }
        }

        /* Sin scroll horizontal en ninguna sección */
        section { overflow-x: clip; }

        @media (prefers-reduced-motion: reduce) {
          .particle, .bg-glow, .scroll-hint, .mtrack { animation: none !important; }
          .topbar { transition: none; }
        }
      `}</style>
    </div>
  )
}

function Tcard({ t }: { t: Testimonio }) {
  return (
    <div className="tcard">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={t.foto} alt={t.nombre} loading="lazy"
        onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/landing/robot.png' }} />
      <div className="tcard-body">
        <div className="tcard-head">
          <div className="tn">{t.nombre}</div>
          <span className={`tcard-tag ${t.tag === 'Tienda virtual' ? 'is-tienda' : 'is-agente'}`}>
            {t.tag}
          </span>
        </div>
        <div className="tcard-tipo">{t.tipo}</div>
        <div className="tt">{t.texto}</div>
      </div>
    </div>
  )
}
