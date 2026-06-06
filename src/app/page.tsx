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

import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

const ROBOT_GLB_PATH = '/landing/nuro-robot.glb'
const FALLBACK_IMAGE = '/landing/robot.png'

const TESTIMONIOS = [
  { foto: 'https://randomuser.me/api/portraits/women/68.jpg', nombre: 'María González',   texto: 'El agente de IA atiende a mis clientes a toda hora. Cerré más ventas en un mes que en todo el trimestre.' },
  { foto: 'https://randomuser.me/api/portraits/men/32.jpg',   nombre: 'Carlos Méndez',    texto: 'Mi tienda virtual quedó impecable y profesional. Ahora mis productos se venden solos.' },
  { foto: 'https://randomuser.me/api/portraits/women/44.jpg', nombre: 'Lucía Fernández',  texto: 'Respondo al instante aunque esté durmiendo. NÜRO no descansa y se nota en los resultados.' },
  { foto: 'https://randomuser.me/api/portraits/men/75.jpg',   nombre: 'Andrés Rojas',     texto: 'El seguimiento automático recuperó clientes que ya daba por perdidos. ¡Gracias NÜRO!' },
  { foto: 'https://randomuser.me/api/portraits/women/65.jpg', nombre: 'Valentina Torres', texto: 'Pasé de responder tarde a atender 24/7. Mis clientes aman la rapidez.' },
  { foto: 'https://randomuser.me/api/portraits/men/11.jpg',   nombre: 'Diego Ramírez',    texto: 'Monté mi tienda online en días, no en meses. Moderna y muy fácil de usar.' },
  { foto: 'https://randomuser.me/api/portraits/women/90.jpg', nombre: 'Camila Herrera',   texto: 'El agente presenta mi oferta mejor que yo. Profesional y siempre disponible.' },
  { foto: 'https://randomuser.me/api/portraits/men/4.jpg',    nombre: 'Jorge Castillo',   texto: 'Más prospectos atendidos y más ventas confirmadas. NÜRO transformó mi negocio.' },
  { foto: 'https://randomuser.me/api/portraits/women/12.jpg', nombre: 'Paola Núñez',      texto: 'Una imagen profesional las 24 horas. Mis clientes confían más en mi marca.' },
  { foto: 'https://randomuser.me/api/portraits/men/47.jpg',   nombre: 'Sebastián Vargas', texto: 'La IA cierra ventas mientras yo me enfoco en crecer. Resultados increíbles.' },
]

const mitad = Math.ceil(TESTIMONIOS.length / 2)
const TESTI_LEFT  = TESTIMONIOS.slice(0, mitad)
const TESTI_RIGHT = TESTIMONIOS.slice(mitad)

export default function LandingPage() {
  const sceneRef    = useRef<HTMLDivElement>(null)
  const loaderRef   = useRef<HTMLDivElement>(null)
  const particlesRef = useRef<HTMLDivElement>(null)

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

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    renderer.setSize(innerWidth, innerHeight)
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.1
    container.appendChild(renderer.domElement)

    const pmrem = new THREE.PMREMGenerator(renderer)
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture

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

    // ── Carga del modelo / fallback ──
    let model: THREE.Object3D | null = null
    let usingFallback = false

    const hideLoader = () => loaderRef.current?.classList.add('hide')

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
      new THREE.TextureLoader().load(FALLBACK_IMAGE, (tex) => {
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
          hideLoader()
        },
        undefined,
        () => {
          console.warn('[NÜRO] No se encontró', ROBOT_GLB_PATH, '→ usando PNG fallback.')
          buildFallback()
          hideLoader()
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
      target.rotY  = usingFallback
        ? THREE.MathUtils.degToRad(15) * Math.sin(p * Math.PI * 2)
        : p * Math.PI * 2
    }

    const scrollTrigger = ScrollTrigger.create({
      trigger: '.content',
      start: 'top top',
      end: 'bottom bottom',
      scrub: 1,
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
    requestAnimationFrame(() => setTimeout(loadRobot, 60))
    const safety = setTimeout(hideLoader, 6000)

    // Cleanup
    return () => {
      cancelAnimationFrame(rafId)
      clearTimeout(safety)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('resize', onResize)
      scrollTrigger.kill()
      renderer.dispose()
      pmrem.dispose()
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
    <>
      <div className="bg-gradient" />
      <div className="bg-grid" />
      <div className="bg-glow" />
      <div className="bg-glow-warm" />
      <div id="particles" ref={particlesRef} />
      <div id="scene" ref={sceneRef} />
      <div id="loader" ref={loaderRef}><div className="loader-ring" /></div>

      <div className="topbar">
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
      </div>

      <main className="content">
        <section id="hero">
          <div className="scrim" />
          <div className="hero-text">
            <span className="badge"><span className="dot" /> Inteligencia Artificial para tu negocio</span>
            <h1 className="grad">NÜRO</h1>
            <div className="sub">Tecnología que trabaja contigo.</div>
            <p>Un ecosistema inteligente diseñado para transformar la manera en la que tu negocio
              atrae prospectos, atiende clientes y convierte oportunidades en ventas.</p>
            <div className="cta-row">
              <a href="#vision" className="btn btn-primary">Descubrir NÜRO →</a>
              <a href="#cta"    className="btn btn-ghost">Solicitar demostración</a>
            </div>
            <div className="scroll-hint"><i />DESLIZA</div>
          </div>
        </section>

        <section id="demo">
          <div className="demo-scrim" />
          <div className="demo-wrap">
            <span className="badge"><span className="dot" /> Demo en video</span>
            <h2>Mira <span className="grad">NÜRO</span> en acción</h2>
            <div className="demo-sub">En un minuto entiendes cómo trabaja por tu negocio.</div>
            <div className="video-frame">
              <iframe
                src="https://player.vimeo.com/video/1197763990?title=0&byline=0&portrait=0&dnt=1"
                allow="autoplay; fullscreen; picture-in-picture; clipboard-write"
                allowFullScreen
                loading="lazy"
                title="NÜRO en acción"
              />
            </div>
            <a className="video-link" href="https://vimeo.com/1197763990" target="_blank" rel="noopener noreferrer">Ver en Vimeo ↗</a>
          </div>
        </section>

        <section id="vision">
          <div className="side-card">
            <h2>Tu negocio activo <span className="grad-azul">incluso cuando no estás conectado.</span></h2>
            <p>NÜRO combina <strong>agentes de inteligencia artificial</strong> y <strong>tiendas
              virtuales profesionales</strong> para que tu negocio atienda, presente tu oferta y
              venda las 24 horas — con una presencia impecable, incluso cuando tú no estás conectado.</p>
          </div>
        </section>

        <section id="servicios">
          <div className="serv-wrap">
            <span className="badge"><span className="dot" /> Nuestros servicios</span>
            <h2>Dos formas en que <span className="grad">NÜRO</span> hace crecer tu negocio</h2>
            <div className="serv-grid">
              <article className="serv-card">
                <div className="serv-ic">🤖</div>
                <h3>Agentes de IA · 24/7</h3>
                <p>Agentes de inteligencia artificial que trabajan las 24 horas, los 7 días de la
                  semana. Atienden a tus prospectos, presentan tu oferta, hacen seguimiento, te
                  ayudan en el cierre y confirman las ventas — sin descanso.</p>
              </article>
              <article className="serv-card">
                <div className="serv-ic">🛍️</div>
                <h3>Tiendas virtuales profesionales</h3>
                <p>Tiendas virtuales para todo tipo de negocio, diseñadas para mostrar tus productos
                  y servicios de forma organizada, moderna y atractiva — listas para vender y dar
                  una imagen profesional.</p>
              </article>
            </div>
          </div>
        </section>

        <section id="testimonios">
          <div className="testi-scrim" />
          <div className="testi-head">
            <span className="badge"><span className="dot" /> Prueba social</span>
            <h2>Negocios que ya crecen con <span className="grad">NÜRO</span></h2>
          </div>
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
        </section>

        <section id="cta">
          <div className="cta-inner">
            <h2>Lleva tu negocio hacia una <span className="grad">nueva generación digital.</span></h2>
            <a href="/register" className="btn btn-primary" style={{ fontSize: 18, padding: '18px 38px' }}>Agendar una demostración →</a>
            <div className="footer-note">© NÜRO · Tecnología que trabaja contigo.</div>
          </div>
        </section>
      </main>

      <style jsx global>{`
        :root {
          --naranja:#e0219a;
          --naranja-claro:#b16cff;
          --azul-neon:#9b5cff;
          --azul-glow:rgba(155,92,255,.55);
          --negro:#0a0714;
          --azul-oscuro:#150f2c;
          --texto:#ECE8F7;
          --texto-suave:#A99FC4;
        }
        html { scroll-behavior: smooth; }
        body {
          font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
          color: var(--texto);
          background: var(--negro);
          overflow-x: hidden;
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

        #scene { position: fixed; inset: 0; z-index: 4; pointer-events: none; }
        #scene canvas { display: block; width: 100%; height: 100%; }

        #loader {
          position: fixed; inset: 0; z-index: 30; display: grid; place-items: center;
          background: var(--negro); transition: opacity .8s ease;
        }
        #loader.hide { opacity: 0; pointer-events: none; }
        .loader-ring {
          width: 54px; height: 54px; border-radius: 50%;
          border: 3px solid rgba(155,92,255,.18); border-top-color: var(--azul-neon);
          animation: spin 1s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .content { position: relative; z-index: 10; }
        section {
          min-height: 100vh;
          display: flex; flex-direction: column;
          padding: 7vh 6vw;
          position: relative;
        }

        .topbar {
          position: fixed; top: 0; left: 0; width: 100%; z-index: 20;
          display: flex; align-items: center; justify-content: space-between;
          padding: 22px 6vw;
          background: linear-gradient(to bottom, rgba(10,7,20,.7), transparent);
        }
        .topbar .logo-nuro { height: 30px; filter: drop-shadow(0 2px 12px rgba(155,92,255,.45)); }
        .topbar .menu { display: flex; gap: 28px; align-items: center; }
        .topbar .menu a {
          color: var(--texto-suave); text-decoration: none;
          font-size: 15px; font-weight: 500; transition: .2s;
        }
        .topbar .menu a:hover { color: #fff; }
        .topbar .auth-btns { display: flex; gap: 12px; align-items: center; }

        .btn {
          display: inline-flex; align-items: center; gap: 8px;
          border: none; cursor: pointer;
          font-size: 16px; font-weight: 700; padding: 15px 30px;
          border-radius: 13px; transition: transform .2s, box-shadow .2s; text-decoration: none;
        }
        .btn-primary {
          background: linear-gradient(95deg, #7c3aed 0%, #e0219a 52%, #b16cff 100%); color: #fff;
          box-shadow: 0 14px 38px -8px rgba(224,33,154,.6), 0 0 24px -6px rgba(155,92,255,.5);
        }
        .btn-primary:hover {
          transform: translateY(-3px);
          box-shadow: 0 22px 48px -8px rgba(224,33,154,.7), 0 0 34px -4px rgba(155,92,255,.6);
        }
        .btn-ghost {
          background: rgba(255,255,255,.05); color: #fff;
          border: 1px solid rgba(155,92,255,.35);
          box-shadow: 0 0 0 0 var(--azul-glow);
        }
        .btn-ghost:hover { background: rgba(155,92,255,.12); box-shadow: 0 0 26px -4px var(--azul-glow); }
        .btn-nav { font-size: 14px; padding: 11px 22px; border-radius: 999px; }

        .badge {
          display: inline-flex; align-items: center; gap: 8px;
          background: rgba(155,92,255,.1); border: 1px solid rgba(155,92,255,.3);
          color: var(--azul-neon); font-size: 13px; font-weight: 600;
          padding: 7px 15px; border-radius: 999px;
        }
        .badge .dot {
          width: 8px; height: 8px; border-radius: 50%;
          background: var(--azul-neon);
          box-shadow: 0 0 10px var(--azul-neon);
          animation: pulse 1.8s infinite;
        }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .3; } }

        h1, h2 { letter-spacing: -1px; line-height: 1.05; font-weight: 800; }
        .grad {
          background: linear-gradient(110deg, var(--naranja), var(--naranja-claro) 55%, #d8c7ff);
          -webkit-background-clip: text; background-clip: text; color: transparent;
        }
        .grad-azul {
          background: linear-gradient(110deg, #d8c7ff, var(--azul-neon));
          -webkit-background-clip: text; background-clip: text; color: transparent;
        }

        #hero { justify-content: flex-end; text-align: center; align-items: center; padding-bottom: 5vh; }
        #hero .scrim {
          position: absolute; left: 0; right: 0; bottom: 0; height: 62%; pointer-events: none;
          background: linear-gradient(to top, rgba(10,7,20,.94) 16%, rgba(10,7,20,.55) 52%, transparent 100%);
        }
        #hero .hero-text { position: relative; max-width: 680px; margin: 0 auto; }
        #hero .badge { margin-bottom: 10px; }
        #hero h1 {
          font-size: clamp(54px, 9vw, 112px); font-weight: 900;
          letter-spacing: -3px; line-height: .95;
          text-shadow: 0 6px 40px rgba(224,33,154,.35);
        }
        #hero .sub {
          font-size: clamp(17px, 2.2vw, 24px);
          color: var(--azul-neon); font-weight: 600; margin-top: 4px;
        }
        #hero .hero-text p {
          color: var(--texto-suave); font-size: 16px; line-height: 1.55;
          margin: 14px auto 20px; max-width: 540px;
        }
        #hero .cta-row { display: flex; gap: 16px; justify-content: center; flex-wrap: wrap; }
        .scroll-hint {
          margin-top: 30px; color: var(--texto-suave);
          font-size: 13px; letter-spacing: 2px;
          display: flex; flex-direction: column; align-items: center; gap: 8px;
          animation: bob 2s ease-in-out infinite;
        }
        .scroll-hint i {
          width: 22px; height: 36px;
          border: 2px solid rgba(154,166,189,.5);
          border-radius: 12px; position: relative;
        }
        .scroll-hint i::after {
          content: ''; position: absolute; top: 6px; left: 50%;
          width: 3px; height: 7px; border-radius: 2px;
          background: var(--azul-neon); transform: translateX(-50%);
          animation: wheel 1.6s infinite;
        }
        @keyframes wheel { 0% { opacity: 1; top: 6px; } 100% { opacity: 0; top: 18px; } }
        @keyframes bob   { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(8px); } }

        #vision { justify-content: center; }
        .side-card {
          max-width: 430px;
          background: rgba(22,16,42,.55); backdrop-filter: blur(12px);
          border: 1px solid rgba(155,92,255,.18); border-radius: 20px;
          padding: 36px 34px;
        }
        #vision .side-card { margin-left: auto; }
        .side-card h2 { font-size: clamp(26px, 3.4vw, 40px); margin-bottom: 18px; }
        .side-card p { color: var(--texto-suave); font-size: 17px; line-height: 1.65; }

        #ecosistema { justify-content: center; }
        .eco-wrap { max-width: 460px; }
        .eco-wrap h2 { font-size: clamp(26px, 3.4vw, 40px); margin-bottom: 24px; }
        .eco-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .eco-item {
          background: rgba(22,16,42,.6); backdrop-filter: blur(10px);
          border: 1px solid rgba(155,92,255,.16); border-radius: 14px;
          padding: 16px 16px; display: flex; align-items: center; gap: 11px;
          font-size: 15px; font-weight: 600; transition: .25s;
        }
        .eco-item:hover {
          border-color: rgba(224,33,154,.5); transform: translateY(-3px);
          box-shadow: 0 14px 30px -12px rgba(224,33,154,.4);
        }
        .eco-item .ic {
          min-width: 34px; height: 34px; border-radius: 10px;
          display: grid; place-items: center; font-size: 17px;
          background: linear-gradient(135deg, rgba(155,92,255,.25), rgba(155,92,255,.05));
          border: 1px solid rgba(155,92,255,.3);
        }

        #demo { justify-content: center; align-items: center; text-align: center; }
        #demo .demo-scrim {
          position: absolute; inset: 0; pointer-events: none;
          background: radial-gradient(60% 60% at 50% 55%, rgba(10,7,20,.82) 0%, rgba(10,7,20,.35) 60%, transparent 100%);
        }
        #demo .demo-wrap { position: relative; width: 100%; max-width: 920px; margin: 0 auto; }
        #demo h2 { font-size: clamp(28px, 4vw, 46px); margin: 14px 0 6px; }
        #demo .demo-sub { color: var(--texto-suave); font-size: 17px; margin-bottom: 22px; }
        .video-frame {
          position: relative; width: 100%; aspect-ratio: 16/9; margin: 0 auto;
          border-radius: 22px; overflow: hidden; background: #0a0714;
          border: 1px solid rgba(155,92,255,.4);
          box-shadow:
            0 40px 90px -24px rgba(155,92,255,.55),
            0 0 0 1px rgba(255,255,255,.05) inset,
            0 0 60px -10px rgba(224,33,154,.35);
        }
        .video-frame iframe {
          position: absolute; inset: 0; width: 100%; height: 100%;
          border: 0; display: block;
        }
        .video-link {
          display: inline-block; margin-top: 18px;
          color: var(--azul-neon); text-decoration: none;
          font-weight: 600; font-size: 15px; transition: .2s;
        }
        .video-link:hover { color: #fff; }

        #servicios { justify-content: center; }
        .serv-wrap { max-width: 560px; }
        .serv-wrap h2 { font-size: clamp(26px, 3.4vw, 40px); margin: 14px 0 22px; max-width: 520px; }
        .serv-grid { display: grid; grid-template-columns: 1fr; gap: 14px; }
        .serv-card {
          background: rgba(22,16,42,.62); backdrop-filter: blur(10px);
          border: 1px solid rgba(155,92,255,.18); border-radius: 16px;
          padding: 20px 22px; transition: .25s;
        }
        .serv-card:hover {
          border-color: rgba(224,33,154,.5); transform: translateY(-3px);
          box-shadow: 0 18px 36px -14px rgba(224,33,154,.4);
        }
        .serv-ic {
          width: 48px; height: 48px; border-radius: 13px;
          display: grid; place-items: center; font-size: 24px; margin-bottom: 12px;
          background: linear-gradient(135deg, rgba(155,92,255,.28), rgba(224,33,154,.18));
          border: 1px solid rgba(155,92,255,.3);
        }
        .serv-card h3 { font-size: 20px; font-weight: 800; margin-bottom: 8px; }
        .serv-card p { color: var(--texto-suave); font-size: 15px; line-height: 1.6; }

        #testimonios { justify-content: center; align-items: center; text-align: center; gap: 18px; }
        #testimonios .testi-scrim {
          position: absolute; inset: 0; pointer-events: none;
          background: radial-gradient(82% 72% at 50% 50%, rgba(10,7,20,.78) 0%, rgba(10,7,20,.30) 65%, transparent 100%);
        }
        .testi-head { position: relative; margin-bottom: 6px; }
        .testi-head h2 { font-size: clamp(26px, 3.6vw, 42px); margin-top: 12px; }
        .marquee {
          position: relative; width: 100%; overflow: hidden;
          -webkit-mask-image: linear-gradient(90deg, transparent, #000 7%, #000 93%, transparent);
                  mask-image: linear-gradient(90deg, transparent, #000 7%, #000 93%, transparent);
        }
        .mtrack { display: flex; gap: 16px; width: max-content; will-change: transform; }
        .mtrack.to-left  { animation: marqueeLeft  42s linear infinite; }
        .mtrack.to-right { animation: marqueeRight 42s linear infinite; }
        @keyframes marqueeLeft  { from { transform: translateX(0); }     to { transform: translateX(-50%); } }
        @keyframes marqueeRight { from { transform: translateX(-50%); }  to { transform: translateX(0); } }
        .marquee:hover .mtrack { animation-play-state: paused; }
        .tcard {
          display: flex; align-items: center; gap: 12px; flex: 0 0 auto;
          width: 320px;
          background: rgba(22,16,42,.72); backdrop-filter: blur(8px);
          border: 1px solid rgba(155,92,255,.2); border-radius: 14px;
          padding: 12px 15px; text-align: left;
        }
        .tcard img {
          width: 46px; height: 46px; border-radius: 50%; object-fit: cover; flex: 0 0 auto;
          border: 2px solid rgba(155,92,255,.45); background: #1a1330;
        }
        .tcard .tn { font-weight: 700; font-size: 14px; margin-bottom: 2px; }
        .tcard .tt { font-size: 12.5px; color: var(--texto-suave); line-height: 1.4; }

        #cta { justify-content: flex-end; align-items: center; text-align: center; padding-bottom: 9vh; }
        #cta .cta-inner {
          max-width: 720px;
          background: radial-gradient(120% 120% at 50% 0%, rgba(14,9,28,.82) 0%, rgba(14,9,28,.55) 60%, transparent 100%);
          backdrop-filter: blur(6px); border-radius: 26px;
          padding: 34px 40px 30px;
        }
        #cta h2 { font-size: clamp(32px, 5vw, 60px); margin-bottom: 28px; }
        #cta .footer-note { margin-top: 40px; color: var(--texto-suave); font-size: 13px; }

        @media (max-width: 820px) {
          .topbar .menu { display: none; }
          .topbar { padding: 16px 5vw; }
          .topbar .logo-nuro { height: 25px; }
          .topbar .auth-btns { gap: 8px; }
          .topbar .auth-btns .btn { padding: 9px 13px; font-size: 12.5px; border-radius: 10px; }
          .side-card, #vision .side-card { margin: 0 auto; }
          .serv-wrap { margin: 0 auto; }
          section { padding: 9vh 7vw; }
          #hero { padding-bottom: 4vh; }
          #hero .scrim { height: 70%; }
          #hero h1 { font-size: clamp(46px, 15vw, 72px); }
          #hero .sub { font-size: 16px; }
          #hero .hero-text p { font-size: 14px; margin: 12px auto 18px; max-width: 340px; }
          #hero .scroll-hint { display: none; }
          #hero .btn { padding: 13px 24px; font-size: 15px; }
          #vision, #servicios { justify-content: flex-end; padding-bottom: 8vh; }
          .side-card p { font-size: 14px; }
          .serv-card p { font-size: 14px; }
          .tcard { width: 250px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .particle, .bg-glow, .scroll-hint { animation: none; }
        }
      `}</style>
    </>
  )
}

function Tcard({ t }: { t: { foto: string; nombre: string; texto: string } }) {
  return (
    <div className="tcard">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={t.foto} alt={t.nombre} loading="lazy"
        onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/landing/robot.png' }} />
      <div>
        <div className="tn">{t.nombre}</div>
        <div className="tt">{t.texto}</div>
      </div>
    </div>
  )
}
