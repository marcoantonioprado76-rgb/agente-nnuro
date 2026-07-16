'use client'

import { useEffect, useRef, useState } from 'react'
import { confirmDialog } from '@/components/ConfirmDialog'
import { useParams, useRouter } from 'next/navigation'
import 'grapesjs/dist/css/grapes.min.css'
import { BUILDER_TEMPLATES as TEMPLATES, IC_WA } from '@/lib/builder-templates'

/** Registra SECCIONES prediseñadas (look Elementor): se arrastran ya armadas y se editan. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function registerBlocks(editor: any) {
  const bm = editor.BlockManager
  const F = 'font-family:Inter,system-ui,sans-serif;'
  const add = (id: string, label: string, content: string) =>
    bm.add(id, { label, category: '✨ Secciones', content, activate: true })

  add('sec-hero', '🚀 Portada (Hero)', `<section style="padding:90px 24px;text-align:center;background:linear-gradient(135deg,#147e95,#1fb8bb);color:#fff;${F}">
    <h1 style="font-size:46px;font-weight:900;margin:0 0 16px;line-height:1.1;">Transforma tu negocio hoy</h1>
    <p style="font-size:19px;opacity:.92;max-width:620px;margin:0 auto 30px;">Escribe aquí una frase potente que explique tu oferta y enganche al cliente en segundos.</p>
    <a href="#" style="display:inline-block;background:#fff;color:#147e95;font-weight:800;padding:16px 42px;border-radius:14px;text-decoration:none;font-size:16px;">QUIERO EMPEZAR</a>
  </section>`)

  add('sec-features', '⭐ Beneficios (3)', `<section style="padding:70px 24px;background:#0b0f1a;color:#fff;${F}">
    <h2 style="text-align:center;font-size:34px;font-weight:900;margin:0 0 44px;">¿Por qué elegirnos?</h2>
    <div style="display:flex;flex-wrap:wrap;gap:20px;max-width:1040px;margin:0 auto;justify-content:center;">
      ${[['🤖','Automático 24/7','Tu IA atiende y vende sola, sin descanso.'],['💬','Respuesta instantánea','Nunca dejes a un cliente esperando.'],['📈','Más ventas','Convierte más con menos esfuerzo.']].map(([e,t,d])=>`<div style="flex:1;min-width:250px;background:#141a2e;border:1px solid rgba(255,255,255,.08);border-radius:18px;padding:30px;text-align:center;"><div style="font-size:42px;margin-bottom:12px;">${e}</div><h3 style="font-size:20px;font-weight:800;margin:0 0 8px;">${t}</h3><p style="opacity:.7;font-size:14px;margin:0;line-height:1.5;">${d}</p></div>`).join('')}
    </div>
  </section>`)

  add('sec-pricing', '💳 Precios', `<section style="padding:70px 24px;background:#0f1220;color:#fff;${F}">
    <h2 style="text-align:center;font-size:34px;font-weight:900;margin:0 0 44px;">Elige tu plan</h2>
    <div style="display:flex;flex-wrap:wrap;gap:20px;max-width:1000px;margin:0 auto;justify-content:center;">
      ${[['Básico','$49',['1 función','Soporte']],['Pro','$99',['Todo Básico','+ Extras','Prioridad']],['Elite','$199',['Todo Pro','+ Premium','1 a 1']]].map(([n,p,fs],i)=>`<div style="flex:1;min-width:250px;background:${i===1?'linear-gradient(160deg,#4c1d95,#1e1b4b)':'#161b30'};border:1px solid ${i===1?'#a855f7':'rgba(255,255,255,.1)'};border-radius:20px;padding:32px;text-align:center;">${i===1?'<div style=\"font-size:11px;font-weight:800;color:#c084fc;margin-bottom:8px;\">⭐ MÁS POPULAR</div>':''}<h3 style="font-size:20px;font-weight:800;margin:0 0 8px;">${n}</h3><div style="font-size:40px;font-weight:900;margin:0 0 16px;">${p}</div><ul style="list-style:none;padding:0;margin:0 0 22px;text-align:left;">${(fs as string[]).map(f=>`<li style=\"padding:6px 0;opacity:.85;font-size:14px;\">✓ ${f}</li>`).join('')}</ul><a href="#" style="display:block;background:#7c3aed;color:#fff;font-weight:800;padding:13px;border-radius:12px;text-decoration:none;">Elegir</a></div>`).join('')}
    </div>
  </section>`)

  add('sec-testi', '💬 Testimonios', `<section style="padding:70px 24px;background:#0b0f1a;color:#fff;${F}">
    <h2 style="text-align:center;font-size:34px;font-weight:900;margin:0 0 44px;">Lo que dicen nuestros clientes</h2>
    <div style="display:flex;flex-wrap:wrap;gap:20px;max-width:980px;margin:0 auto;justify-content:center;">
      ${[['María','Cambió mi negocio por completo. Ahora vendo mientras duermo.'],['Carlos','Increíble. Mis ventas subieron 40% en un mes.']].map(([n,t])=>`<div style="flex:1;min-width:280px;background:#141a2e;border:1px solid rgba(255,255,255,.08);border-radius:18px;padding:28px;"><div style="color:#fbbf24;font-size:16px;margin-bottom:10px;">★★★★★</div><p style="font-size:15px;line-height:1.6;margin:0 0 14px;">"${t}"</p><p style="font-weight:800;font-size:14px;margin:0;">— ${n}</p></div>`).join('')}
    </div>
  </section>`)

  add('sec-cta', '📢 Llamado a la acción', `<section style="padding:70px 24px;text-align:center;background:linear-gradient(135deg,#233B8F,#147e95);color:#fff;${F}">
    <h2 style="font-size:36px;font-weight:900;margin:0 0 14px;">¿Listo para empezar?</h2>
    <p style="font-size:18px;opacity:.92;margin:0 0 26px;">Únete hoy y transforma tu forma de vender.</p>
    <a href="#" style="display:inline-block;background:#04210f;color:#fff;font-weight:800;padding:16px 44px;border-radius:14px;text-decoration:none;font-size:16px;">EMPEZAR AHORA</a>
  </section>`)

  add('sec-form', '📋 Formulario', `<section style="padding:70px 24px;background:#0f1220;color:#fff;${F}">
    <form data-lead style="max-width:460px;margin:0 auto;background:#161b30;border:1px solid rgba(255,255,255,.1);border-radius:20px;padding:34px;">
      <h2 style="font-size:26px;font-weight:900;margin:0 0 6px;text-align:center;">Déjanos tus datos</h2>
      <p style="opacity:.7;font-size:14px;text-align:center;margin:0 0 22px;">Te contactamos por WhatsApp.</p>
      <input name="name" placeholder="Nombre" style="width:100%;box-sizing:border-box;background:#0b0f1a;border:1px solid rgba(255,255,255,.12);border-radius:12px;padding:13px;color:#fff;margin-bottom:12px;"/>
      <input name="phone" placeholder="WhatsApp" style="width:100%;box-sizing:border-box;background:#0b0f1a;border:1px solid rgba(255,255,255,.12);border-radius:12px;padding:13px;color:#fff;margin-bottom:12px;"/>
      <input name="email" placeholder="Correo" style="width:100%;box-sizing:border-box;background:#0b0f1a;border:1px solid rgba(255,255,255,.12);border-radius:12px;padding:13px;color:#fff;margin-bottom:18px;"/>
      <button type="submit" style="width:100%;background:linear-gradient(135deg,#22c55e,#16a34a);color:#04210f;font-weight:800;padding:15px;border:none;border-radius:12px;font-size:15px;cursor:pointer;">QUIERO INFORMACIÓN</button>
    </form>
  </section>`)

  add('form-full', '📝 Formulario completo', `<section style="padding:70px 24px;background:#0f1220;color:#fff;${F}">
    <form data-lead style="max-width:480px;margin:0 auto;background:#161b30;border:1px solid rgba(255,255,255,.1);border-radius:20px;padding:34px;">
      <h2 style="font-size:26px;font-weight:900;margin:0 0 6px;text-align:center;">Solicita tu información</h2>
      <p style="opacity:.7;font-size:14px;text-align:center;margin:0 0 22px;">Completá el formulario y te contactamos.</p>
      <input name="name" placeholder="Nombre completo" style="${FLD}"/>
      <input name="phone" type="tel" placeholder="WhatsApp" style="${FLD}"/>
      <input name="email" type="email" placeholder="Correo electrónico" style="${FLD}"/>
      <textarea name="message" placeholder="¿En qué te podemos ayudar?" rows="4" style="${FLD}resize:vertical;"></textarea>
      <button type="submit" style="width:100%;box-sizing:border-box;background:linear-gradient(135deg,#22c55e,#16a34a);color:#04210f;font-weight:800;padding:15px;border:none;border-radius:12px;font-size:15px;cursor:pointer;margin-top:6px;">ENVIAR</button>
    </form>
  </section>`)

  add('form-news', '✉️ Suscripción (email)', `<section style="padding:60px 24px;text-align:center;background:#0b0f1a;color:#fff;${F}">
    <h2 style="font-size:28px;font-weight:900;margin:0 0 10px;">Recibí novedades y ofertas</h2>
    <p style="opacity:.7;font-size:15px;margin:0 0 22px;">Dejanos tu correo y no te pierdas nada.</p>
    <form data-lead style="max-width:460px;margin:0 auto;display:flex;gap:10px;flex-wrap:wrap;justify-content:center;">
      <input name="email" type="email" placeholder="Tu correo" style="flex:1;min-width:200px;box-sizing:border-box;background:#0b0f1a;border:1px solid rgba(255,255,255,.14);border-radius:12px;padding:14px;color:#fff;font-size:14px;"/>
      <button type="submit" style="background:linear-gradient(135deg,#147e95,#8b5cf6);color:#fff;font-weight:800;padding:14px 26px;border:none;border-radius:12px;font-size:14px;cursor:pointer;">Suscribirme</button>
    </form>
  </section>`)

  add('sec-imgtext', '🖼️ Imagen + Texto', `<section style="padding:60px 24px;background:#0b0f1a;color:#fff;${F}">
    <div style="max-width:1000px;margin:0 auto;display:flex;flex-wrap:wrap;gap:36px;align-items:center;">
      <div style="flex:1;min-width:280px;"><img src="https://placehold.co/560x360/1e293b/64748b?text=Tu+imagen" style="width:100%;border-radius:18px;display:block;"/></div>
      <div style="flex:1;min-width:280px;"><h2 style="font-size:30px;font-weight:900;margin:0 0 14px;">Un titular que vende</h2><p style="opacity:.75;font-size:16px;line-height:1.6;margin:0 0 20px;">Explica aquí tu propuesta de valor con detalle. Sube tu propia imagen a la izquierda.</p><a href="#" style="display:inline-block;background:#147e95;color:#fff;font-weight:800;padding:13px 30px;border-radius:12px;text-decoration:none;">Saber más</a></div>
    </div>
  </section>`)

  add('sec-whatsapp', '🟢 WhatsApp flotante', `<a href="https://wa.me/000000000" style="position:fixed;bottom:20px;right:20px;background:#25D366;color:#fff;width:60px;height:60px;border-radius:50%;display:flex;align-items:center;justify-content:center;text-decoration:none;box-shadow:0 6px 20px rgba(0,0,0,.3);z-index:999;${F}"><span style="font-size:30px;">💬</span></a>`)

  add('sec-footer', '⬛ Pie de página', `<footer style="padding:40px 24px;text-align:center;background:#080a12;color:rgba(255,255,255,.5);font-size:13px;${F}">
    <p style="margin:0 0 6px;font-weight:800;color:#fff;">Tu Marca</p>
    <p style="margin:0;">© 2026 · Todos los derechos reservados</p>
  </footer>`)

  // ── MÁS ESTILOS DE HERO ──
  add('hero-img', '🖼️ Hero con imagen', `<section style="position:relative;padding:120px 24px;text-align:center;color:#fff;${F}background:linear-gradient(rgba(5,8,16,.65),rgba(5,8,16,.75)),url('https://placehold.co/1200x600/0f172a/334155?text=Fondo') center/cover;">
    <h1 style="font-size:48px;font-weight:900;margin:0 0 16px;">Tu titular impactante</h1>
    <p style="font-size:19px;opacity:.9;max-width:600px;margin:0 auto 28px;">Subtítulo que refuerza tu promesa.</p>
    <a href="#" style="display:inline-block;background:#22c55e;color:#04210f;font-weight:800;padding:16px 42px;border-radius:14px;text-decoration:none;">COMENZAR</a>
  </section>`)

  add('hero-split', '↔️ Hero dividido', `<section style="padding:70px 24px;background:#0b0f1a;color:#fff;${F}">
    <div style="max-width:1050px;margin:0 auto;display:flex;flex-wrap:wrap;gap:36px;align-items:center;">
      <div style="flex:1;min-width:300px;"><h1 style="font-size:42px;font-weight:900;margin:0 0 16px;line-height:1.1;">Vende más con IA</h1><p style="opacity:.8;font-size:17px;line-height:1.6;margin:0 0 24px;">Tu asistente inteligente atiende y cierra ventas por ti, 24/7.</p><a href="#" style="display:inline-block;background:linear-gradient(135deg,#147e95,#1fb8bb);color:#fff;font-weight:800;padding:15px 38px;border-radius:14px;text-decoration:none;">Quiero probarlo</a></div>
      <div style="flex:1;min-width:300px;"><img src="https://placehold.co/560x420/1e293b/64748b?text=Imagen" style="width:100%;border-radius:20px;display:block;"/></div>
    </div>
  </section>`)

  add('hero-video', '🎬 Hero con video', `<section style="padding:70px 24px;text-align:center;background:#0f1220;color:#fff;${F}">
    <h1 style="font-size:40px;font-weight:900;margin:0 0 12px;">Mira cómo funciona</h1>
    <p style="opacity:.8;margin:0 0 28px;">Un video vale más que mil palabras.</p>
    <div style="max-width:760px;margin:0 auto;aspect-ratio:16/9;border-radius:18px;overflow:hidden;"><iframe width="100%" height="100%" src="https://www.youtube.com/embed/dQw4w9WgXcQ" frameborder="0" allowfullscreen style="border:0;"></iframe></div>
  </section>`)

  // ── VIDEO DE YOUTUBE (componente nativo: seleccionalo y pegá el enlace en el panel) ──
  bm.add('yt-video', {
    label: '▶️ Video YouTube', category: '✨ Secciones', activate: true,
    content: {
      tagName: 'section',
      attributes: { style: 'padding:56px 24px;background:#0b0f1a;' + F },
      components: [{
        tagName: 'div',
        attributes: { style: 'max-width:760px;margin:0 auto;border-radius:18px;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,.4);' },
        components: [{ type: 'video', provider: 'yt', src: 'dQw4w9WgXcQ', style: { width: '100%', height: '430px' } }],
      }],
    },
  })

  // ── MÁS PRECIOS ──
  add('price-single', '💲 Precio único', `<section style="padding:70px 24px;background:#0f1220;color:#fff;${F}">
    <div style="max-width:420px;margin:0 auto;background:linear-gradient(160deg,#4c1d95,#1e1b4b);border:1px solid #a855f7;border-radius:22px;padding:40px;text-align:center;">
      <h3 style="font-size:22px;font-weight:800;margin:0 0 6px;">Oferta especial</h3>
      <div style="margin:14px 0;"><span style="font-size:18px;opacity:.6;text-decoration:line-through;">$99</span> <span style="font-size:48px;font-weight:900;">$49</span></div>
      <ul style="list-style:none;padding:0;margin:0 0 24px;text-align:left;display:inline-block;">${['Acceso completo','Soporte prioritario','Actualizaciones gratis'].map(f=>`<li style=\"padding:6px 0;font-size:15px;\">✅ ${f}</li>`).join('')}</ul>
      <a href="#" style="display:block;background:#22c55e;color:#04210f;font-weight:800;padding:15px;border-radius:12px;text-decoration:none;">COMPRAR AHORA</a>
    </div>
  </section>`)

  // ── STATS / NÚMEROS ──
  add('sec-stats', '📊 Números', `<section style="padding:56px 24px;background:linear-gradient(135deg,#147e95,#1fb8bb);color:#fff;${F}">
    <div style="max-width:900px;margin:0 auto;display:flex;flex-wrap:wrap;gap:24px;text-align:center;justify-content:center;">
      ${[['+5.000','Clientes'],['98%','Satisfacción'],['24/7','Soporte'],['+40%','Más ventas']].map(([n,l])=>`<div style=\"flex:1;min-width:150px;\"><div style=\"font-size:42px;font-weight:900;\">${n}</div><div style=\"opacity:.85;font-size:14px;\">${l}</div></div>`).join('')}
    </div>
  </section>`)

  // ── FAQ ──
  add('sec-faq', '❓ Preguntas', `<section style="padding:64px 24px;background:#0b0f1a;color:#fff;${F}">
    <h2 style="text-align:center;font-size:32px;font-weight:900;margin:0 0 34px;">Preguntas frecuentes</h2>
    <div style="max-width:680px;margin:0 auto;">${[['¿Cómo funciona?','Es simple: te registras, configuras y empiezas a vender.'],['¿Necesito conocimientos técnicos?','No. Todo es visual y guiado paso a paso.'],['¿Puedo cancelar cuando quiera?','Sí, sin ataduras ni permanencia.']].map(([q,a])=>`<div style=\"background:#141a2e;border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:20px;margin-bottom:12px;\"><p style=\"font-weight:800;margin:0 0 6px;\">${q}</p><p style=\"opacity:.7;font-size:14px;margin:0;line-height:1.5;\">${a}</p></div>`).join('')}</div>
  </section>`)

  // ── GARANTÍA ──
  add('sec-guarantee', '🛡️ Garantía', `<section style="padding:56px 24px;text-align:center;background:#0f1220;color:#fff;${F}">
    <div style="max-width:560px;margin:0 auto;background:#161b30;border:2px solid #22c55e;border-radius:22px;padding:36px;">
      <div style="font-size:52px;margin-bottom:10px;">🛡️</div>
      <h2 style="font-size:26px;font-weight:900;margin:0 0 10px;">Garantía de 30 días</h2>
      <p style="opacity:.75;font-size:15px;margin:0;">Si no estás satisfecho, te devolvemos tu dinero. Sin preguntas.</p>
    </div>
  </section>`)

  // ── LOGOS / CONFIANZA ──
  add('sec-logos', '🏷️ Logos', `<section style="padding:40px 24px;background:#0b0f1a;border-top:1px solid rgba(255,255,255,.06);border-bottom:1px solid rgba(255,255,255,.06);${F}">
    <p style="text-align:center;color:rgba(255,255,255,.4);font-size:12px;text-transform:uppercase;letter-spacing:2px;margin:0 0 18px;">Confían en nosotros</p>
    <div style="display:flex;flex-wrap:wrap;gap:30px;justify-content:center;align-items:center;opacity:.6;">${['Marca 1','Marca 2','Marca 3','Marca 4'].map(m=>`<span style=\"color:#fff;font-weight:800;font-size:18px;\">${m}</span>`).join('')}</div>
  </section>`)

  // ── GALERÍA ──
  add('sec-gallery', '🖼️ Galería', `<section style="padding:60px 24px;background:#0f1220;${F}">
    <div style="max-width:1000px;margin:0 auto;display:grid;grid-template-columns:repeat(3,1fr);gap:14px;">${[1,2,3,4,5,6].map(()=>`<img src=\"https://placehold.co/300x300/1e293b/475569?text=Foto\" style=\"width:100%;border-radius:14px;display:block;aspect-ratio:1;object-fit:cover;\"/>`).join('')}</div>
  </section>`)

  // ── RIEL DE FOTOS (girando/auto-scroll, imágenes completas sin recortar) ──
  add('sec-reel', '🎞️ Riel de fotos', `<section style="padding:56px 16px;background:#0b0f1a;overflow:hidden;${F}"><style>@keyframes reelspin{from{transform:translateX(0)}to{transform:translateX(-50%)}}.reelwrap{max-width:1100px;margin:0 auto;overflow:hidden;-webkit-mask-image:linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent);mask-image:linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent);}.reeltrack{display:flex;align-items:center;gap:16px;width:max-content;animation:reelspin 30s linear infinite;}.reeltrack:hover{animation-play-state:paused;}.reeltrack img{height:300px;width:auto;border-radius:16px;flex-shrink:0;display:block;border:1px solid rgba(255,255,255,.1);}@media(max-width:768px){.reeltrack img{height:200px;border-radius:12px;}.reeltrack{gap:12px;animation-duration:22s;}}</style><div class="reelwrap"><div class="reeltrack">${[0,1,2,3,0,1,2,3].map(()=>`<img src="https://placehold.co/280x360/141420/6d5cf5?text=Foto"/>`).join('')}</div></div></section>`)

  // ── BOTONES DE ACCIÓN (enlaces editables en el panel) ──
  add('sec-buttons', '🔘 Botones de acción', `<section style="padding:44px 24px;text-align:center;background:#0b0f1a;${F}">
    <div style="display:flex;gap:14px;justify-content:center;flex-wrap:wrap;"><a href="#" style="background:#6d5cf5;color:#fff;font-weight:700;padding:14px 32px;border-radius:24px;text-decoration:none;box-shadow:0 8px 24px rgba(109,92,245,.4);">Comprar ahora</a><a href="https://wa.me/000000000" style="background:#25D366;color:#fff;font-weight:700;padding:14px 32px;border-radius:24px;text-decoration:none;">${IC_WA}WhatsApp</a><a href="#" style="background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.15);color:#fff;font-weight:700;padding:14px 32px;border-radius:24px;text-decoration:none;">Más info</a></div>
      </section>`)

  // ── CTA + WHATSAPP ──
  add('cta-wa', '🟢 CTA WhatsApp', `<section style="padding:60px 24px;text-align:center;background:linear-gradient(135deg,#25D366,#128C7E);color:#fff;${F}">
    <h2 style="font-size:32px;font-weight:900;margin:0 0 12px;">Escríbenos por WhatsApp</h2>
    <p style="opacity:.92;margin:0 0 24px;">Te respondemos al instante.</p>
    <a href="https://wa.me/000000000" style="display:inline-flex;align-items:center;gap:8px;background:#fff;color:#128C7E;font-weight:800;padding:15px 36px;border-radius:14px;text-decoration:none;">💬 Chatear ahora</a>
  </section>`)

  // ── ESTRUCTURA: filas de columnas (tocá una columna y agregale elementos con ➕) ──
  const colRow = (n: number) => `<section style="padding:44px 20px;background:#0b0f1a;${F}"><div style="max-width:1080px;margin:0 auto;display:flex;flex-wrap:wrap;gap:20px;">${Array.from({ length: n }).map(() => `<div style="flex:1;min-width:200px;background:#141a2e;border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:24px;color:#fff;"><h3 style="margin:0 0 8px;font-size:18px;font-weight:800;">Columna</h3><p style="margin:0;opacity:.7;font-size:14px;line-height:1.5;">Tocá esta columna y agregale elementos con ➕.</p></div>`).join('')}</div></section>`
  add('row-2', '⬛⬛ 2 columnas', colRow(2))
  add('row-3', '⬛⬛⬛ 3 columnas', colRow(3))
  add('row-4', '▦ 4 columnas', colRow(4))

  // ── WIDGETS ──
  add('w-accordion', '🔽 Acordeón', `<section style="padding:56px 20px;background:#0b0f1a;${F}"><div style="max-width:680px;margin:0 auto;">${[['¿Pregunta 1?', 'Respuesta a la primera pregunta. Editá este texto.'], ['¿Pregunta 2?', 'Respuesta a la segunda pregunta.'], ['¿Pregunta 3?', 'Respuesta a la tercera pregunta.']].map(([q, a]) => `<details style="background:#141a2e;border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:16px 18px;margin-bottom:10px;color:#fff;"><summary style="cursor:pointer;font-weight:800;font-size:15px;">${q}</summary><p style="margin:10px 0 0;opacity:.7;font-size:14px;line-height:1.5;">${a}</p></details>`).join('')}</div></section>`)

  add('w-progress', '📊 Barras de progreso', `<section style="padding:56px 20px;background:#0f1220;color:#fff;${F}"><div style="max-width:640px;margin:0 auto;">${[['Diseño', '90'], ['Marketing', '75'], ['Ventas', '85']].map(([l, v]) => `<div style="margin-bottom:18px;"><div style="display:flex;justify-content:space-between;font-size:14px;font-weight:700;margin-bottom:6px;"><span>${l}</span><span>${v}%</span></div><div style="height:10px;background:rgba(255,255,255,.1);border-radius:6px;overflow:hidden;"><div style="width:${v}%;height:100%;background:linear-gradient(90deg,#147e95,#8b5cf6);border-radius:6px;"></div></div></div>`).join('')}</div></section>`)

  add('w-iconlist', '✅ Lista con íconos', `<section style="padding:56px 20px;background:#0b0f1a;color:#fff;${F}"><div style="max-width:560px;margin:0 auto;">${['Beneficio uno incluido', 'Beneficio dos incluido', 'Beneficio tres incluido', 'Beneficio cuatro incluido'].map(t => `<div style="display:flex;align-items:center;gap:12px;padding:11px 0;border-bottom:1px solid rgba(255,255,255,.06);"><span style="width:26px;height:26px;border-radius:50%;background:rgba(34,197,94,.2);color:#4ade80;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0;">✓</span><span style="font-size:15px;">${t}</span></div>`).join('')}</div></section>`)

  add('w-map', '📍 Mapa', `<section style="padding:0;${F}"><iframe src="https://www.google.com/maps?q=Buenos+Aires&output=embed" style="width:100%;height:360px;border:0;display:block;" loading="lazy"></iframe></section>`)
}


// Animaciones reutilizables que el usuario aplica por clase desde la barra flotante (botones e imágenes).
// Se inyectan al CSS del editor con editor.addStyle(FX_CSS) → persisten en getCss() → se ven en la página publicada.
const FX_CLASSES = ['fx-pulse', 'fx-shine', 'fx-bounce', 'fx-float', 'fx-zoom', 'fx-reveal']
const FX_CSS = [
  '@keyframes fxpulse{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}',
  '.fx-pulse{animation:fxpulse 1.8s ease-in-out infinite;}',
  '@keyframes fxshine{0%{left:-60%}55%,100%{left:135%}}',
  '.fx-shine{position:relative;overflow:hidden;}',
  ".fx-shine::after{content:'';position:absolute;top:0;left:-60%;width:45%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.55),transparent);transform:skewX(-20deg);animation:fxshine 3s ease-in-out infinite;pointer-events:none;}",
  '@keyframes fxbounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}',
  '.fx-bounce{animation:fxbounce 1.4s ease-in-out infinite;}',
  '@keyframes fxfloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}',
  '.fx-float{animation:fxfloat 4s ease-in-out infinite;}',
  '@keyframes fxzoom{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}',
  '.fx-zoom{animation:fxzoom 5s ease-in-out infinite;}',
  '@keyframes fxreveal{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:none}}',
  '.fx-reveal{animation:fxreveal .7s cubic-bezier(.2,.8,.2,1) both;}',
  '@supports (animation-timeline:view()){.fx-reveal{animation:fxreveal linear both;animation-timeline:view();animation-range:entry 3% cover 22%;}}',
].join('')

// Elementos sueltos que el usuario puede agregar dentro de una sección con un toque.
const NEW_TEXT = '<p style="color:#e5e7eb;font-size:16px;line-height:1.6;margin:12px 0;">Texto nuevo — tocá para editar ✏️</p>'
const NEW_BTN = '<a href="#" style="display:inline-block;background:linear-gradient(135deg,#147e95,#8b5cf6);color:#fff;font-weight:800;padding:14px 26px;border-radius:10px;text-decoration:none;margin:10px 0;">Botón nuevo</a>'
const NEW_IMG = '<img src="https://placehold.co/600x360/141420/6d5cf5/png?text=Foto" style="width:100%;border-radius:14px;display:block;margin:12px 0;"/>'
const NEW_ICON = '<span style="font-size:44px;display:inline-block;line-height:1;margin:10px 0;">⭐</span>'

// Campos de formulario para agregar dentro de un <form> con un toque.
const FLD = 'width:100%;box-sizing:border-box;background:#0b0f1a;border:1px solid rgba(255,255,255,.12);border-radius:12px;padding:13px;color:#fff;margin-bottom:12px;font-size:14px;'
const NEW_FLD_TEXT = `<input name="campo" placeholder="Escribe aquí" style="${FLD}"/>`
const NEW_FLD_EMAIL = `<input name="email" type="email" placeholder="Correo electrónico" style="${FLD}"/>`
const NEW_FLD_PHONE = `<input name="phone" type="tel" placeholder="WhatsApp" style="${FLD}"/>`
const NEW_FLD_MSG = `<textarea name="message" placeholder="Tu mensaje" rows="4" style="${FLD}resize:vertical;"></textarea>`
const NEW_FLD_SUBMIT = '<button type="submit" style="width:100%;box-sizing:border-box;background:linear-gradient(135deg,#22c55e,#16a34a);color:#04210f;font-weight:800;padding:15px;border:none;border-radius:12px;font-size:15px;cursor:pointer;">ENVIAR</button>'

// Categorías del panel de elementos (estilo Elementor). Mapea id de bloque → categoría.
const BLOCK_CAT: Record<string, string> = {
  'row-2': 'Estructura', 'row-3': 'Estructura', 'row-4': 'Estructura',
  'sec-hero': 'Portadas', 'hero-img': 'Portadas', 'hero-split': 'Portadas', 'hero-video': 'Portadas',
  'sec-features': 'Contenido', 'sec-imgtext': 'Contenido', 'sec-stats': 'Contenido', 'sec-faq': 'Contenido', 'sec-guarantee': 'Contenido', 'sec-logos': 'Contenido',
  'w-accordion': 'Widgets', 'w-progress': 'Widgets', 'w-iconlist': 'Widgets', 'w-map': 'Widgets',
  'sec-pricing': 'Precios', 'price-single': 'Precios',
  'sec-testi': 'Testimonios',
  'sec-gallery': 'Medios', 'sec-reel': 'Medios', 'yt-video': 'Medios',
  'sec-form': 'Formularios', 'form-full': 'Formularios', 'form-news': 'Formularios',
  'sec-cta': 'Botones y CTA', 'sec-buttons': 'Botones y CTA', 'cta-wa': 'Botones y CTA', 'sec-whatsapp': 'Botones y CTA',
  'sec-footer': 'Pie',
}
const CAT_ORDER = ['Estructura', 'Portadas', 'Contenido', 'Widgets', 'Formularios', 'Precios', 'Testimonios', 'Medios', 'Botones y CTA', 'Pie', 'Otros']
const CAT_EMOJI: Record<string, string> = { 'Estructura': '🧱', 'Portadas': '🚀', 'Contenido': '⭐', 'Widgets': '🧩', 'Formularios': '📋', 'Precios': '💳', 'Testimonios': '💬', 'Medios': '🖼️', 'Botones y CTA': '🔘', 'Pie': '⬛', 'Otros': '🧩' }


// Propiedades de "apariencia" comunes a las barras flotantes (esquinas, sombra, borde, margen, opacidad).
type Appear = { radius: number; shadow: boolean; border: boolean; marginY: number; opacity: number }
type TextTools = { size: number; bold: boolean; italic: boolean; align: string; color: string; btnLike: boolean; bg: string; bgHex: string; anim: string } & Appear
type BoxTools = { padY: number; gap: number; flex: boolean; bg: string; bgHex: string; hasBgImg: boolean; darken: boolean; isForm: boolean } & Appear
type ImgTools = { widthPct: number; anim: string } & Appear

export default function BuilderEditorPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const editorRef = useRef<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [page, setPage] = useState<{ name: string; slug: string; published: boolean } | null>(null)
  const [toast, setToast] = useState('')
  const [showTemplates, setShowTemplates] = useState(false)
  const [showBlocks, setShowBlocks] = useState(false)
  const [blockSearch, setBlockSearch] = useState('')
  const [device, setDevice] = useState('Escritorio')
  const [mySections, setMySections] = useState<{ id: string; label: string; html: string }[]>([])
  const copiedStyleRef = useRef<Record<string, string> | null>(null)
  const [showAI, setShowAI] = useState(false)
  const [aiDesc, setAiDesc] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [showFill, setShowFill] = useState(false)
  const [fillDesc, setFillDesc] = useState('')
  const [fillLoading, setFillLoading] = useState(false)
  const [showLeads, setShowLeads] = useState(false)
  const [showColors, setShowColors] = useState(false)
  const [themeColor, setThemeColor] = useState('#147e95')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [leads, setLeads] = useState<any[]>([])
  const [leadsLoading, setLeadsLoading] = useState(false)
  // Editor de enlace/video inline (aparece al seleccionar un botón o video)
  const [linkEditor, setLinkEditor] = useState<{ type: 'link' | 'video'; url: string } | null>(null)
  // Barra de texto inline (aparece al tocar un título/párrafo/botón): tamaño, negrita, cursiva, alineación, color
  const [textTools, setTextTools] = useState<TextTools | null>(null)
  // Barra de espaciado (aparece al tocar una sección/cuadro): relleno vertical y separación entre elementos
  const [boxTools, setBoxTools] = useState<BoxTools | null>(null)
  // Barra de imagen (aparece al tocar una imagen): ancho, esquinas, sombra, borde
  const [imgTools, setImgTools] = useState<ImgTools | null>(null)
  // "⋯ Más": muestra los controles avanzados (esquinas, sombra, borde, margen, opacidad) en cualquiera de las barras
  const [expandTools, setExpandTools] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const selectedCompRef = useRef<any>(null)
  const fxAddedRef = useRef(false)
  const autosaveRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [previewMode, setPreviewMode] = useState(false)

  useEffect(() => {
    let destroyed = false
    ;(async () => {
      try {
        // Cargar la página guardada
        const res = await fetch(`/api/builder-pages/${id}`)
        const data = await res.json()
        if (!res.ok) { setToast(data.error || 'No se pudo cargar'); setLoading(false); return }
        if (destroyed) return
        setPage({ name: data.page.name, slug: data.page.slug, published: data.page.published })

        // Cargar GrapesJS (solo en el navegador)
        const grapesjs = (await import('grapesjs')).default
        const presetWebpage = (await import('grapesjs-preset-webpage')).default
        if (destroyed || !containerRef.current) return

        const editor = grapesjs.init({
          container: containerRef.current,
          height: '100%',
          width: '100%',
          storageManager: { type: 'none' },
          plugins: [presetWebpage],
          pluginsOpts: {
            [presetWebpage as any]: {
              modalImportTitle: 'Importar',
              showStylesOnChange: true,
            },
          },
          // Reset del lienzo → sin márgenes blancos feos; fondo oscuro coherente con las secciones.
          protectedCss: '* { box-sizing: border-box; } *::before, *::after { box-sizing: border-box; } body { margin: 0; padding: 0; font-family: Inter, system-ui, sans-serif; background: #0b0f1a; color: #fff; } img { max-width: 100%; }',
          // Panel de estilos completo (en español) para que TODO sea ajustable.
          styleManager: {
            sectors: [
              { name: 'Fondo', open: true, properties: ['background-color', 'background', 'opacity'] },
              { name: 'Texto', open: true, properties: ['color', 'font-size', 'font-weight', 'text-align', 'line-height', 'letter-spacing'] },
              { name: 'Espaciado', open: false, properties: ['padding', 'margin'] },
              { name: 'Tamaño', open: false, properties: ['width', 'max-width', 'height', 'min-height'] },
              { name: 'Bordes', open: false, properties: ['border-radius', 'border'] },
              { name: 'Sombra', open: false, properties: ['box-shadow'] },
            ],
          },
          deviceManager: {
            devices: [
              { name: 'Escritorio', width: '' },
              { name: 'Móvil', width: '375px', widthMedia: '480px' },
            ],
          },
          assetManager: {
            // Subida de imágenes con TU endpoint actual (S3 + cuota por plan)
            uploadFile: async (e: any) => {
              const files = e.dataTransfer ? e.dataTransfer.files : e.target?.files
              if (!files) return
              for (const file of Array.from(files) as File[]) {
                try {
                  const fd = new FormData()
                  fd.append('file', file)
                  fd.append('folder', 'landing') // storage separado por servicio
                  const up = await fetch('/api/upload', { method: 'POST', body: fd })
                  const ud = await up.json()
                  if (up.ok && ud.url) editor.AssetManager.add(ud.url)
                  else setToast(ud.error || 'No se pudo subir la imagen')
                } catch { setToast('Error al subir la imagen') }
              }
            },
          },
        })

        editorRef.current = editor
        registerBlocks(editor)

        // Al seleccionar un BOTÓN (a) o VIDEO → mostrar el campo de enlace inline.
        editor.on('component:selected', () => {
          const c = editor.getSelected()
          selectedCompRef.current = c
          if (!c) { setLinkEditor(null); return }
          const tag = String(c.get('tagName') || '').toLowerCase()
          const type = c.get('type')
          const TEXT_TAGS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'span', 'li', 'button', 'label', 'strong', 'em', 'blockquote']
          const BOX_TAGS = ['section', 'div', 'footer', 'header', 'nav', 'form', 'article', 'aside', 'ul']
          // Reset de todas las barras; abajo se abre solo la que corresponde.
          setLinkEditor(null); setTextTools(null); setBoxTools(null); setImgTools(null); setExpandTools(false)
          if (type === 'video' || tag === 'iframe') {
            setLinkEditor({ type: 'video', url: type === 'video' ? (c.get('src') || '') : (c.getAttributes().src || '') })
          } else if (tag === 'a' || type === 'link') {
            setLinkEditor({ type: 'link', url: c.getAttributes().href || '' })
            setTextTools(readTextTools(c))
          } else if (tag === 'img' || type === 'image') {
            setImgTools(readImgTools(c))
          } else if (TEXT_TAGS.includes(tag)) {
            setTextTools(readTextTools(c))
          } else if (BOX_TAGS.includes(tag)) {
            setBoxTools(readBoxTools(c))
          }
        })
        editor.on('component:deselected', () => { setLinkEditor(null); setTextTools(null); setBoxTools(null); setImgTools(null); setExpandTools(false); selectedCompRef.current = null })

        // Autoguardado: 4s después del último cambio, guarda en silencio (no perder trabajo).
        editor.on('update', () => {
          if (autosaveRef.current) clearTimeout(autosaveRef.current)
          autosaveRef.current = setTimeout(async () => {
            try {
              const ed = editorRef.current
              if (!ed) return
              await fetch(`/api/builder-pages/${id}`, {
                method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ html: ed.getHtml(), css: ed.getCss(), projectData: ed.getProjectData() }),
              })
            } catch { /* silencioso */ }
          }, 4000)
        })

        // Cargar contenido previo
        if (data.page.projectData) {
          try { editor.loadProjectData(data.page.projectData) } catch { /* fallback abajo */ }
        } else if (data.page.html) {
          editor.setComponents(data.page.html)
          editor.setStyle(data.page.css || '')
        }

        // Precarga según cómo se creó desde el índice: ?tpl=<id> (plantilla) o ?ai=1 (generar con IA).
        try {
          const sp = new URLSearchParams(window.location.search)
          const tpl = sp.get('tpl')
          const wantAI = sp.get('ai')
          if (tpl) {
            const t = TEMPLATES.find(x => x.id === tpl)
            if (t) { editor.setComponents(t.html); setToast('Plantilla cargada ✓ — contanos tu negocio y la IA la rellena'); setTimeout(() => setShowFill(true), 600) }
          }
          if (wantAI) setShowAI(true)
          if (tpl || wantAI) window.history.replaceState(null, '', window.location.pathname)
        } catch { /* */ }

        setLoading(false)
      } catch (err) {
        console.error('[BUILDER]', err)
        setToast('No se pudo iniciar el constructor')
        setLoading(false)
      }
    })()

    return () => {
      destroyed = true
      try { editorRef.current?.destroy() } catch { /* noop */ }
    }
  }, [id])

  // Carga "Mis secciones" guardadas (localStorage) al abrir el editor.
  useEffect(() => {
    try { const raw = window.localStorage.getItem('bld-my-sections'); if (raw) setMySections(JSON.parse(raw)) } catch { /* */ }
  }, [])

  async function save(publish?: boolean): Promise<boolean> {
    const editor = editorRef.current
    if (!editor) return false
    setSaving(true)
    try {
      const body: Record<string, unknown> = {
        html: editor.getHtml(),
        css: editor.getCss(),
        projectData: editor.getProjectData(),
      }
      if (publish !== undefined) body.published = publish
      const res = await fetch(`/api/builder-pages/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) { setToast(data.error || 'No se pudo guardar'); return false }
      if (publish !== undefined && page) setPage({ ...page, published: publish })
      setToast(publish === true ? '¡Publicada! 🚀' : publish === false ? 'Despublicada' : 'Guardado ✓')
      return true
    } catch { setToast('Error al guardar'); return false }
    finally { setSaving(false) }
  }

  function applyHtml(html: string) {
    const editor = editorRef.current
    if (!editor) return
    editor.setComponents(html)
  }

  async function generateAI() {
    if (!aiDesc.trim()) return
    setAiLoading(true)
    try {
      const res = await fetch('/api/builder-pages/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ description: aiDesc.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { setToast(data.error || 'No se pudo generar'); return }
      applyHtml(data.html)
      setShowAI(false); setAiDesc('')
      setToast('¡Generado con IA! Editá lo que quieras ✨')
    } catch { setToast('Error al generar') }
    finally { setAiLoading(false) }
  }

  // Rellena la plantilla ACTUAL con IA: extrae los textos, la IA los reescribe según el negocio
  // del usuario, y los vuelve a colocar en su lugar — sin tocar diseño, colores ni imágenes.
  async function fillWithAI() {
    const ed = editorRef.current
    if (!ed || !fillDesc.trim()) return
    setFillLoading(true)
    try {
      const html = ed.getHtml()
      const doc = new DOMParser().parseFromString(`<div id="__fillroot">${html}</div>`, 'text/html')
      const root = doc.getElementById('__fillroot')
      if (!root) { setToast('No se pudo leer la página'); return }
      // Recolectar nodos de texto con contenido real (con letras, 3+ caracteres).
      const textNodes: Text[] = []
      const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT)
      let node: Node | null
      while ((node = walker.nextNode())) {
        const parentTag = (node.parentElement?.tagName || '').toLowerCase()
        if (parentTag === 'script' || parentTag === 'style') continue
        const core = (node.nodeValue || '').trim()
        if (core.length < 3) continue
        if (!/[a-zA-ZáéíóúñüÁÉÍÓÚÑÜ]/.test(core)) continue
        textNodes.push(node as Text)
      }
      const phEls = Array.from(root.querySelectorAll('input[placeholder],textarea[placeholder]')) as (HTMLInputElement | HTMLTextAreaElement)[]
      const base = textNodes.length
      const items: { i: number; t: string }[] = []
      textNodes.forEach((n, idx) => items.push({ i: idx, t: (n.nodeValue || '').trim() }))
      phEls.forEach((el, idx) => items.push({ i: base + idx, t: el.getAttribute('placeholder') || '' }))
      if (!items.length) { setToast('No hay textos para rellenar en esta plantilla'); return }

      const res = await fetch('/api/builder-pages/fill', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: fillDesc.trim(), items }),
      })
      const data = await res.json()
      if (!res.ok) { setToast(data.error || 'No se pudo rellenar'); return }
      const map = new Map<number, string>()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(data.items || []).forEach((it: any) => {
        const idx = typeof it?.i === 'number' ? it.i : parseInt(String(it?.i), 10)
        if (Number.isFinite(idx) && typeof it?.t === 'string' && it.t.trim()) map.set(idx, it.t)
      })
      if (!map.size) { setToast('La IA no devolvió textos'); return }
      // Aplicar conservando los espacios de alrededor (para no pegar palabras).
      textNodes.forEach((n, idx) => {
        const rw = map.get(idx); if (rw === undefined) return
        const orig = n.nodeValue || ''
        const lead = (orig.match(/^\s*/) || [''])[0]
        const trail = (orig.match(/\s*$/) || [''])[0]
        n.nodeValue = lead + rw.trim() + trail
      })
      phEls.forEach((el, idx) => { const rw = map.get(base + idx); if (rw) el.setAttribute('placeholder', rw.trim()) })

      ed.setComponents(root.innerHTML)
      try { ed.select(null) } catch { /* */ }
      selectedCompRef.current = null
      setLinkEditor(null); setTextTools(null); setBoxTools(null); setImgTools(null); setExpandTools(false)
      setShowFill(false); setFillDesc('')
      setToast('¡Contenido rellenado con IA! ✨ Revisá y ajustá lo que quieras')
    } catch { setToast('Error al rellenar') }
    finally { setFillLoading(false) }
  }

  // Convierte cualquier color (#rgb, #rrggbb, rgb(), rgba()) a hex #rrggbb; '' si no se puede.
  function toHex(v: string): string {
    if (!v) return ''
    const s = String(v).trim()
    if (/^#[0-9a-f]{6}$/i.test(s)) return s.toLowerCase()
    if (/^#[0-9a-f]{3}$/i.test(s)) { const m = s.slice(1); return ('#' + m[0] + m[0] + m[1] + m[1] + m[2] + m[2]).toLowerCase() }
    const m = s.match(/rgba?\(([^)]+)\)/i)
    if (m) { const p = m[1].split(',').map(x => parseFloat(x)); const h = (n: number) => ('0' + Math.max(0, Math.min(255, Math.round(n || 0))).toString(16)).slice(-2); return '#' + h(p[0]) + h(p[1]) + h(p[2]) }
    return ''
  }

  // Lee el color de fondo actual (para el selector) desde estilo o computado.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function readBg(st: Record<string, any>, cs: any) {
    const raw = String(st['background'] || st['background-color'] || (cs ? cs.backgroundColor : '') || '')
    const hex = toHex(String(st['background-color'] || (cs ? cs.backgroundColor : ''))) || toHex(raw) || '#111426'
    return { bg: raw || hex, bgHex: hex }
  }

  // Lee las propiedades de apariencia (esquinas, sombra, borde, margen, opacidad).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function readAppearance(st: Record<string, any>, cs: any): Appear {
    let radius = parseFloat(st['border-radius'])
    if (isNaN(radius) && cs) radius = parseFloat(cs.borderTopLeftRadius)
    if (isNaN(radius)) radius = 0
    const shRaw = String(st['box-shadow'] || (cs ? cs.boxShadow : '') || 'none')
    const shadow = shRaw !== 'none' && shRaw.trim() !== ''
    let border = false
    if (cs) border = String(cs.borderTopStyle || 'none') !== 'none' && parseFloat(cs.borderTopWidth) > 0
    else border = /[1-9]/.test(String(st['border'] || st['border-width'] || ''))
    let marginY = parseFloat(st['margin-top'])
    if (isNaN(marginY) && st['margin']) marginY = parseFloat(String(st['margin']).split(' ')[0])
    if (isNaN(marginY) && cs) marginY = parseFloat(cs.marginTop)
    if (isNaN(marginY)) marginY = 0
    let opacity = parseFloat(st['opacity'])
    if (isNaN(opacity) && cs) opacity = parseFloat(cs.opacity)
    if (isNaN(opacity)) opacity = 1
    return { radius: Math.round(radius), shadow, border, marginY: Math.round(marginY), opacity }
  }

  // Lee el estilo de una imagen (ancho en % + apariencia).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function readImgTools(c: any): ImgTools {
    let st: Record<string, any> = {}
    try { st = c.getStyle() || {} } catch { /* */ }
    let cs: any = null
    try { const el = c.getEl?.(); const win = el?.ownerDocument?.defaultView; if (el && win) cs = win.getComputedStyle(el) } catch { /* */ }
    let widthPct = NaN
    const wRaw = String(st['width'] || '')
    if (wRaw.includes('%')) widthPct = parseFloat(wRaw)
    if (isNaN(widthPct)) widthPct = 100
    return { widthPct: Math.round(widthPct), anim: readAnim(c), ...readAppearance(st, cs) }
  }

  // Aplica un estilo a la imagen seleccionada (según el dispositivo activo 💻/📱).
  function applyImgStyle(props: Record<string, string>) {
    const c = selectedCompRef.current
    if (!c) return
    try { c.addStyle(props) } catch { /* */ }
    try { setImgTools(readImgTools(c)) } catch { /* */ }
  }

  // Lee qué animación tiene aplicada un componente (clase fx-*), para marcar el botón activo.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function readAnim(c: any): string {
    try { const cls: string[] = c.getClasses ? c.getClasses() : []; return FX_CLASSES.find(k => (cls || []).includes(k)) || '' } catch { return '' }
  }

  // Asegura que el CSS de animaciones esté inyectado (una sola vez) para que persista en getCss().
  function ensureFx() {
    const ed = editorRef.current
    if (!ed || fxAddedRef.current) return
    try { ed.addStyle(FX_CSS); fxAddedRef.current = true } catch { /* */ }
  }

  // Aplica/quita una animación al elemento seleccionado (botón o imagen). cls='' = sin animación.
  function applyAnim(cls: string) {
    const c = selectedCompRef.current
    if (!c) return
    ensureFx()
    FX_CLASSES.forEach(k => { try { c.removeClass(k) } catch { /* */ } })
    if (cls) { try { c.addClass(cls) } catch { /* */ } }
    try {
      const tag = String(c.get('tagName') || '').toLowerCase()
      if (tag === 'img' || c.get('type') === 'image') setImgTools(readImgTools(c))
      else setTextTools(readTextTools(c))
    } catch { /* */ }
  }

  // Abre el gestor de imágenes (con subida) para cambiar la foto seleccionada.
  function pickImage() {
    const ed = editorRef.current, c = selectedCompRef.current
    if (!ed || !c) return
    try {
      ed.AssetManager.open({
        types: ['image'],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        select: (asset: any, complete: boolean) => {
          const src = typeof asset === 'string' ? asset : (asset?.get ? asset.get('src') : asset?.src)
          if (src) { try { c.set('src', src) } catch { /* */ } try { c.addAttributes({ src }) } catch { /* */ } }
          if (complete) ed.AssetManager.close()
        },
      })
    } catch { /* */ }
  }

  // Duplica la imagen seleccionada justo al lado (para llenar un riel/galería con varias fotos).
  function dupImage() {
    const c = selectedCompRef.current
    if (!c) return
    try { const p = c.parent(); if (!p) return; const i = c.index(); p.append(c.clone(), { at: i + 1 }) } catch { /* */ }
  }

  // ── Acciones universales (funcionan en cualquier elemento seleccionado) ──
  // Duplica el elemento seleccionado y selecciona la copia.
  function dupComp() {
    const c = selectedCompRef.current
    if (!c) return
    try { const p = c.parent(); if (!p) return; const cl = c.clone(); p.append(cl, { at: c.index() + 1 }); editorRef.current?.select(cl) } catch { /* */ }
  }
  // Elimina el elemento seleccionado y cierra las barras.
  function delComp() {
    const c = selectedCompRef.current
    if (!c) return
    try { c.remove() } catch { /* */ }
    setLinkEditor(null); setTextTools(null); setBoxTools(null); setImgTools(null); setExpandTools(false)
    selectedCompRef.current = null
  }
  // Reordena el elemento entre sus hermanos (dir<0 = subir, dir>0 = bajar).
  function moveComp(dir: number) {
    const c = selectedCompRef.current
    if (!c) return
    try {
      const p = c.parent(); if (!p) return
      const coll = p.components(); const i = c.index(); const n = coll.length
      const at = dir < 0 ? i - 1 : i + 1
      if (at < 0 || at >= n) return
      coll.remove(c); coll.add(c, { at })
      editorRef.current?.select(c)
    } catch { /* */ }
  }
  // Agrega un elemento nuevo DENTRO de la sección/cuadro seleccionado y lo selecciona.
  function addInside(html: string) {
    const c = selectedCompRef.current
    if (!c) return
    try { const added = c.append(html); const comp = Array.isArray(added) ? added[0] : added; if (comp) editorRef.current?.select(comp) } catch { /* */ }
  }

  // Cambia el dispositivo de edición (Escritorio / Móvil).
  function switchDevice(d: string) {
    const ed = editorRef.current
    if (!ed) return
    try { ed.setDevice(d); setDevice(d) } catch { /* */ }
  }

  // Copia el estilo del elemento seleccionado para pegarlo en otro.
  function copyStyle() {
    const c = selectedCompRef.current
    if (!c) return
    try { copiedStyleRef.current = { ...(c.getStyle() || {}) }; showToast('Estilo copiado ✓') } catch { /* */ }
  }
  function pasteStyle() {
    const c = selectedCompRef.current
    if (!c || !copiedStyleRef.current) return
    try {
      c.addStyle(copiedStyleRef.current)
      const tag = String(c.get('tagName') || '').toLowerCase()
      if (tag === 'img' || c.get('type') === 'image') setImgTools(readImgTools(c))
      else if (['section', 'div', 'footer', 'header', 'nav', 'form', 'article', 'aside', 'ul'].includes(tag)) setBoxTools(readBoxTools(c))
      else setTextTools(readTextTools(c))
      showToast('Estilo pegado ✓')
    } catch { /* */ }
  }

  // Guarda la sección seleccionada (el bloque de nivel superior) para reutilizarla — "Mis secciones".
  function saveSection() {
    const ed = editorRef.current, sel = selectedCompRef.current
    if (!ed || !sel) return
    try {
      const wrapper = ed.getWrapper()
      let node = sel
      for (let i = 0; i < 50 && node?.parent && node.parent() && node.parent() !== wrapper; i++) node = node.parent()
      const html = node.toHTML()
      const id = 'my-' + String(node.getId ? node.getId() : Math.round(node.index?.() || 0)) + '-' + html.length
      const next = [...mySections.filter(s => s.id !== id), { id, label: '💾 Mi sección', html }]
      setMySections(next)
      try { window.localStorage.setItem('bld-my-sections', JSON.stringify(next)) } catch { /* */ }
      showToast('Sección guardada ✓ — mirala en “Mis secciones”')
    } catch { /* */ }
  }
  function delMySection(id: string) {
    const next = mySections.filter(s => s.id !== id)
    setMySections(next)
    try { window.localStorage.setItem('bld-my-sections', JSON.stringify(next)) } catch { /* */ }
  }

  // Overlay oscuro reutilizable (para que el texto se lea sobre una foto de fondo).
  const DARK_OVERLAY = 'linear-gradient(rgba(0,0,0,.5),rgba(0,0,0,.5))'

  // Pone una imagen de fondo (cubriendo) en la sección/cuadro seleccionado.
  function pickBg() {
    const ed = editorRef.current, c = selectedCompRef.current
    if (!ed || !c) return
    const keepDark = (() => { try { return String((c.getStyle() || {})['background-image'] || '').includes('linear-gradient') } catch { return false } })()
    try {
      ed.AssetManager.open({
        types: ['image'],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        select: (asset: any, complete: boolean) => {
          const src = typeof asset === 'string' ? asset : (asset?.get ? asset.get('src') : asset?.src)
          if (src) {
            const img = (keepDark ? DARK_OVERLAY + ', ' : '') + `url(${src})`
            try { c.addStyle({ 'background-image': img, 'background-size': 'cover', 'background-position': 'center', 'background-repeat': 'no-repeat' }) } catch { /* */ }
            try { setBoxTools(readBoxTools(c)) } catch { /* */ }
          }
          if (complete) ed.AssetManager.close()
        },
      })
    } catch { /* */ }
  }

  // Activa/desactiva el oscurecido sobre la imagen de fondo.
  function toggleDarken() {
    const c = selectedCompRef.current
    if (!c) return
    try {
      const bi = String((c.getStyle() || {})['background-image'] || '')
      const m = bi.match(/url\((['"]?)(.*?)\1\)/)
      if (!m) return
      const url = `url(${m[2]})`
      const has = bi.includes('linear-gradient')
      c.addStyle({ 'background-image': has ? url : DARK_OVERLAY + ', ' + url })
      setBoxTools(readBoxTools(c))
    } catch { /* */ }
  }

  // Color al pasar el mouse (hover) sobre un botón. Inyecta una regla .hov-ID:hover que persiste.
  function applyHover(color: string) {
    const ed = editorRef.current, c = selectedCompRef.current
    if (!ed || !c) return
    try {
      const cls = 'hov-' + String(c.getId()).replace(/[^a-z0-9]/gi, '')
      if (!(c.getClasses() || []).includes(cls)) c.addClass(cls)
      ed.addStyle(`.${cls}:hover{background:${color} !important;background-color:${color} !important;}`)
      setTextTools(readTextTools(c))
    } catch { /* */ }
  }

  // Recolorea TODA la página: reemplaza los acentos conocidos por el color de marca elegido.
  function applyTheme(to: string) {
    const ed = editorRef.current
    if (!ed) return
    const ACCENTS = ['#147e95', '#4dfae8', '#8b5cf6', '#a855f7', '#7c3aed', '#1fb8bb', '#35d0c8', '#4dfae8', '#f59e0b', '#f97316', '#fb923c', '#fbbf24', '#22c55e', '#10b981', '#4ade80', '#147e95', '#4dfae8', '#ec4899', '#f43f5e']
    try {
      let html = ed.getHtml(); let css = ed.getCss() || ''
      ACCENTS.forEach(a => { const re = new RegExp(a, 'gi'); html = html.replace(re, to); css = css.replace(re, to) })
      ed.setComponents(html); ed.setStyle(css)
      // La página se reconstruyó: limpiamos la selección/barras para no dejar referencias viejas.
      try { ed.select(null) } catch { /* */ }
      selectedCompRef.current = null
      setLinkEditor(null); setTextTools(null); setBoxTools(null); setImgTools(null); setExpandTools(false)
    } catch { /* */ }
    setShowColors(false)
    setToast('Colores actualizados ✓')
  }

  // Lee el estilo actual de un componente de texto para precargar la barra.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function readTextTools(c: any) {
    let st: Record<string, any> = {}
    try { st = c.getStyle() || {} } catch { /* */ }
    let cs: any = null
    try { const el = c.getEl?.(); const win = el?.ownerDocument?.defaultView; if (el && win) cs = win.getComputedStyle(el) } catch { /* */ }
    let size = parseFloat(st['font-size'])
    if (isNaN(size) && cs) size = parseFloat(cs.fontSize)
    if (isNaN(size)) size = 18
    const w = String(st['font-weight'] || '')
    const bold = w === 'bold' || (parseInt(w) || 0) >= 600
    const italic = String(st['font-style'] || '') === 'italic'
    const align = String(st['text-align'] || 'left')
    let color = toHex(String(st['color'] || (cs ? cs.color : '')))
    if (!color) color = '#ffffff'
    const tag = String(c.get('tagName') || '').toLowerCase()
    const btnLike = tag === 'a' || tag === 'button'
    const { bg, bgHex } = readBg(st, cs)
    return { size: Math.round(size), bold, italic, align, color, btnLike, bg, bgHex, anim: readAnim(c), ...readAppearance(st, cs) }
  }

  // Aplica un estilo al texto seleccionado. GrapesJS lo guarda según el dispositivo
  // activo (💻 Escritorio / 📱 Móvil), así el tamaño puede ser distinto en cada modo.
  function applyTextStyle(props: Record<string, string>) {
    const c = selectedCompRef.current
    if (!c) return
    try { c.addStyle(props) } catch { /* */ }
    try { setTextTools(readTextTools(c)) } catch { /* */ }
  }

  // Lee el espaciado actual de una sección/cuadro (relleno vertical y separación entre hijos).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function readBoxTools(c: any) {
    let st: Record<string, any> = {}
    try { st = c.getStyle() || {} } catch { /* */ }
    let cs: any = null
    try {
      const el = c.getEl?.()
      const win = el?.ownerDocument?.defaultView
      if (el && win) cs = win.getComputedStyle(el)
    } catch { /* */ }
    let padY = parseFloat(st['padding-top'])
    if (isNaN(padY) && st['padding']) padY = parseFloat(String(st['padding']).split(' ')[0])
    if (isNaN(padY) && cs) padY = parseFloat(cs.paddingTop)
    if (isNaN(padY)) padY = 0
    let gap = parseFloat(st['gap'])
    if (isNaN(gap) && cs) gap = parseFloat(cs.columnGap || cs.gap)
    if (isNaN(gap)) gap = 0
    const disp = cs ? String(cs.display) : ''
    const flex = disp === 'flex' || disp === 'grid' || disp === 'inline-flex'
    const { bg, bgHex } = readBg(st, cs)
    const bgImg = String(st['background-image'] || '')
    const hasBgImg = bgImg.includes('url(')
    const darken = hasBgImg && bgImg.includes('linear-gradient')
    const isForm = String(c.get('tagName') || '').toLowerCase() === 'form'
    return { padY: Math.round(padY), gap: Math.round(gap), flex, bg, bgHex, hasBgImg, darken, isForm, ...readAppearance(st, cs) }
  }

  // Aplica espaciado a la sección/cuadro seleccionado (según el dispositivo activo 💻/📱).
  function applyBoxStyle(props: Record<string, string>) {
    const c = selectedCompRef.current
    if (!c) return
    try { c.addStyle(props) } catch { /* */ }
    try { setBoxTools(readBoxTools(c)) } catch { /* */ }
  }

  function ytId(url: string): string | null {
    const s = url.trim()
    const m = s.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/))([A-Za-z0-9_-]{6,})/)
    if (m) return m[1]
    return /^[A-Za-z0-9_-]{6,}$/.test(s) ? s : null
  }

  // Aplica la URL al componente seleccionado (botón → href, video → embed de YouTube).
  function applyToComp(url: string) {
    const c = selectedCompRef.current
    if (!c || !linkEditor) return
    if (linkEditor.type === 'video') {
      const id = ytId(url)
      if (!id) { setToast('Pegá un enlace de YouTube válido (ej: youtube.com/watch?v=...)'); return }
      const ed = editorRef.current
      // REEMPLAZAR el componente por un video de YouTube NUEVO (igual que el que funciona por
      // defecto). El componente 'video' de GrapesJS espera SOLO el ID con provider 'yt'; así se
      // renderiza y reproduce bien en el editor y se exporta correcto.
      const parent = c.parent && c.parent()
      if (parent && ed) {
        const at = typeof c.index === 'function' ? c.index() : undefined
        c.remove()
        const added = parent.append(
          { type: 'video', provider: 'yt', src: id, style: { width: '100%', height: '100%', border: '0', display: 'block' } },
          at != null ? { at } : {}
        )
        const nc = Array.isArray(added) ? added[0] : added
        if (nc) { try { ed.select(nc) } catch { /* */ } selectedCompRef.current = nc }
      } else {
        c.set('provider', 'yt'); c.set('src', id)
      }
      setToast('Video actualizado ✓ — tocá 👁️ Vista previa para reproducirlo')
    } else {
      c.addAttributes({ href: url.trim() })
      setToast('Enlace guardado ✓')
    }
  }

  function togglePreview() {
    const ed = editorRef.current
    if (!ed) return
    if (previewMode) { try { ed.stopCommand('preview') } catch { /* */ } setPreviewMode(false); setToast('Modo edición') }
    else { setLinkEditor(null); setTextTools(null); setBoxTools(null); setImgTools(null); try { ed.runCommand('preview') } catch { /* */ } setPreviewMode(true); setToast('Vista previa — el video se reproduce. Tocá "Editar" para volver.') }
  }

  async function openLeads() {
    setShowLeads(true); setLeadsLoading(true)
    try {
      const res = await fetch(`/api/builder-pages/${id}/leads`)
      const data = await res.json()
      if (res.ok) setLeads(data.leads || [])
    } catch { /* ignore */ }
    finally { setLeadsLoading(false) }
  }

  const showToast = (t: string) => { setToast(t); setTimeout(() => setToast(''), 2500) }
  useEffect(() => { if (toast) { const id = setTimeout(() => setToast(''), 2500); return () => clearTimeout(id) } }, [toast])

  // Inserta una sección (bloque) al final de la página — reemplaza el arrastrar en el teléfono.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function insertBlock(content: any) {
    const ed = editorRef.current
    if (!ed) return
    try {
      const wrapper = ed.getWrapper()
      let at: number | undefined
      const sel = selectedCompRef.current
      if (sel) {
        // Subir hasta el hijo directo del lienzo para insertar justo debajo.
        let node = sel
        for (let i = 0; i < 50 && node?.parent && node.parent() && node.parent() !== wrapper; i++) node = node.parent()
        if (node?.parent && node.parent() === wrapper) at = node.index() + 1
      }
      wrapper.append(content, at !== undefined ? { at } : {})
    } catch { try { ed.addComponents(content) } catch { /* */ } }
    showToast('Agregado ✓ — está en tu página')
  }

  // ¿Hay alguna barra de edición activa? (para mostrar la franja bajo la barra superior)
  const anyBar = !previewMode && !!(linkEditor || textTools || imgTools || boxTools)

  // CSS responsivo: en el teléfono oculta la barra lateral de GrapesJS y ensancha el lienzo.
  const RESPONSIVE_CSS = `
    .bld-topbar{ overflow-x:auto; }
    .bld-topbar::-webkit-scrollbar{ height:0; }
    .bld-topbar > *{ flex-shrink:0; }
    /* Usamos nuestro propio panel de elementos (izquierda) → ocultamos el panel nativo de GrapesJS siempre. */
    .gjs-pn-views, .gjs-pn-views-container{ display:none !important; }
    .gjs-cv-canvas{ width:100% !important; right:0 !important; }
    @media (max-width:820px){
      .bld-hint{ display:none !important; }
      .bld-topbar{ gap:6px !important; padding:8px 10px !important; }
      .bld-topbar button, .bld-topbar a{ padding:6px 9px !important; font-size:12px !important; }
      .bld-title{ font-size:13px !important; }
    }
  `

  // ── Helpers de UI para las barras flotantes ──
  const SHADOW_ON = '0 14px 34px rgba(0,0,0,.38)'
  const BORDER_ON = '1px solid rgba(255,255,255,.28)'
  const stepGroup: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 4, background: '#0b0f1a', border: '1px solid rgba(255,255,255,.12)', borderRadius: 9, padding: '2px 4px' }
  const stepBtn: React.CSSProperties = { background: 'none', border: 'none', color: '#cbd5e1', fontWeight: 800, cursor: 'pointer', lineHeight: 1, width: 24, fontSize: 17 }
  const stepInput: React.CSSProperties = { width: 38, background: 'transparent', border: 'none', color: '#fff', fontSize: 13, fontWeight: 700, textAlign: 'center', outline: 'none' }
  const stepLbl: React.CSSProperties = { color: '#94a3b8', fontSize: 11, fontWeight: 700, padding: '0 2px', whiteSpace: 'nowrap' }

  const Stepper = (label: string, value: number, min: number, max: number, step: number, onSet: (n: number) => void) => (
    <div style={stepGroup}>
      <span style={stepLbl}>{label}</span>
      <button onClick={() => onSet(Math.max(min, value - step))} style={stepBtn}>−</button>
      <input type="number" value={value} onChange={e => { const n = parseInt(e.target.value); if (!isNaN(n) && n >= min && n <= max) onSet(n) }} style={stepInput} />
      <button onClick={() => onSet(Math.min(max, value + step))} style={{ ...stepBtn, fontSize: 16 }}>+</button>
    </div>
  )

  const Toggle = (label: string, active: boolean, onClick: () => void) => (
    <button onClick={onClick} style={{ background: active ? 'rgba(183,53,184,.35)' : '#0b0f1a', border: '1px solid rgba(255,255,255,.12)', color: '#fff', fontWeight: 700, fontSize: 12, padding: '8px 12px', borderRadius: 9, cursor: 'pointer', whiteSpace: 'nowrap' }}>{label}</button>
  )

  const MoreBtn = (
    <button onClick={() => setExpandTools(v => !v)} title="Más opciones"
      style={{ background: expandTools ? 'rgba(255,255,255,.14)' : '#0b0f1a', border: '1px solid rgba(255,255,255,.15)', color: '#cbd5e1', fontWeight: 800, fontSize: 13, padding: '8px 11px', borderRadius: 9, cursor: 'pointer', whiteSpace: 'nowrap' }}>{expandTools ? '⋯ Menos' : '⋯ Más'}</button>
  )

  // Fila de animaciones: cada opción es una clase fx-*. La activa se resalta. ✖ = quitar.
  const AnimRow = (current: string, opts: [string, string, string][]) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#0b0f1a', border: '1px solid rgba(255,255,255,.12)', borderRadius: 9, padding: '3px 5px' }}>
      <span style={{ color: '#4dfae8', fontSize: 12, fontWeight: 800, padding: '0 3px' }}>✨</span>
      {opts.map(([cls, ic, tip]) => (
        <button key={cls} title={tip} onClick={() => applyAnim(current === cls ? '' : cls)}
          style={{ background: current === cls ? 'rgba(139,92,246,.4)' : 'transparent', border: '1px solid ' + (current === cls ? 'rgba(139,92,246,.6)' : 'transparent'), color: '#fff', fontSize: 14, width: 30, height: 28, borderRadius: 7, cursor: 'pointer' }}>{ic}</button>
      ))}
      <button title="Sin animación" onClick={() => applyAnim('')}
        style={{ background: !current ? 'rgba(255,255,255,.14)' : 'transparent', border: 'none', color: '#94a3b8', fontSize: 13, width: 26, height: 28, borderRadius: 7, cursor: 'pointer' }}>✖</button>
    </div>
  )

  // Acciones universales: duplicar, subir, bajar, eliminar (aparecen en todas las barras).
  const actBtn = { background: 'transparent', border: 'none', color: '#e5e7eb', fontSize: 14, width: 28, height: 28, borderRadius: 7, cursor: 'pointer' } as const
  const ActionRow = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2, background: '#0b0f1a', border: '1px solid rgba(255,255,255,.12)', borderRadius: 9, padding: '3px 4px' }}>
      <button title="Duplicar" onClick={dupComp} style={actBtn}>⧉</button>
      <button title="Subir" onClick={() => moveComp(-1)} style={actBtn}>⬆</button>
      <button title="Bajar" onClick={() => moveComp(1)} style={actBtn}>⬇</button>
      <button title="Copiar estilo" onClick={copyStyle} style={actBtn}>🎨</button>
      <button title="Pegar estilo" onClick={pasteStyle} style={{ ...actBtn, opacity: copiedStyleRef.current ? 1 : 0.4 }}>📋</button>
      <button title="Guardar como “Mi sección”" onClick={saveSection} style={actBtn}>💾</button>
      <button title="Eliminar" onClick={delComp} style={{ ...actBtn, color: '#fca5a5' }}>🗑</button>
    </div>
  )

  // Agregar elementos dentro de una sección (solo barra de sección/cuadro).
  const AddInsideRow = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 3, background: '#0b0f1a', border: '1px solid rgba(255,255,255,.12)', borderRadius: 9, padding: '3px 5px' }}>
      <span style={{ color: '#86efac', fontSize: 12, fontWeight: 800, padding: '0 3px' }}>➕</span>
      {([['Texto', NEW_TEXT], ['Botón', NEW_BTN], ['Imagen', NEW_IMG], ['Ícono', NEW_ICON]] as [string, string][]).map(([lbl, html]) => (
        <button key={lbl} title={`Agregar ${lbl}`} onClick={() => addInside(html)}
          style={{ background: 'transparent', border: 'none', color: '#cbd5e1', fontSize: 12, fontWeight: 700, padding: '5px 7px', borderRadius: 7, cursor: 'pointer', whiteSpace: 'nowrap' }}>{lbl}</button>
      ))}
    </div>
  )

  // Fila de apariencia avanzada: esquinas, sombra, borde, margen, opacidad.
  const AppearanceRow = (t: Appear, apply: (p: Record<string, string>) => void) => (
    <div style={{ width: '100%', display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,.1)' }}>
      {Stepper('Esquinas', t.radius, 0, 100, 4, n => apply({ 'border-radius': n + 'px' }))}
      {Toggle(t.shadow ? '✓ Sombra' : 'Sombra', t.shadow, () => apply({ 'box-shadow': t.shadow ? 'none' : SHADOW_ON }))}
      {Toggle(t.border ? '✓ Borde' : 'Borde', t.border, () => apply({ border: t.border ? 'none' : BORDER_ON }))}
      {Stepper('Margen', t.marginY, 0, 200, 8, n => apply({ 'margin-top': n + 'px', 'margin-bottom': n + 'px' }))}
      <div style={stepGroup}>
        <span style={stepLbl}>Opacidad</span>
        <input type="range" min={0} max={100} value={Math.round(t.opacity * 100)}
          onChange={e => apply({ opacity: (parseInt(e.target.value) / 100).toString() })}
          style={{ width: 72, accentColor: '#147e95' }} />
      </div>
    </div>
  )

  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', background: '#0d0f1a', zIndex: 40 }}>
      <style>{RESPONSIVE_CSS}</style>
      {/* Barra superior */}
      <div className="bld-topbar" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', background: '#111426', flexShrink: 0 }}>
        <button onClick={() => router.push('/dashboard/services/landing-pages/builder')}
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#cbd5e1', borderRadius: 10, padding: '7px 12px', fontSize: 13, cursor: 'pointer' }}>← Salir</button>
        <button onClick={() => editorRef.current?.runCommand('core:undo')} title="Deshacer" disabled={loading}
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#cbd5e1', borderRadius: 10, padding: '7px 11px', fontSize: 15, cursor: 'pointer' }}>↶</button>
        <button onClick={() => editorRef.current?.runCommand('core:redo')} title="Rehacer" disabled={loading}
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#cbd5e1', borderRadius: 10, padding: '7px 11px', fontSize: 15, cursor: 'pointer' }}>↷</button>
        <button onClick={togglePreview} disabled={loading} title="Vista previa (reproduce el video)"
          style={{ background: previewMode ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.06)', border: `1px solid ${previewMode ? 'rgba(34,197,94,0.4)' : 'rgba(255,255,255,0.1)'}`, color: previewMode ? '#4ade80' : '#cbd5e1', borderRadius: 10, padding: '7px 12px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>{previewMode ? '✏️ Editar' : '👁️ Vista previa'}</button>
        {/* Cambiar dispositivo de edición */}
        <div style={{ display: 'flex', gap: 2, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: 2 }}>
          {([['Escritorio', '💻'], ['Móvil', '📱']] as [string, string][]).map(([d, ic]) => (
            <button key={d} onClick={() => switchDevice(d)} title={d} disabled={loading}
              style={{ background: device === d ? 'rgba(183,53,184,0.35)' : 'transparent', border: 'none', color: '#fff', borderRadius: 8, padding: '5px 9px', fontSize: 14, cursor: 'pointer' }}>{ic}</button>
          ))}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p className="bld-title" style={{ color: '#fff', fontWeight: 700, fontSize: 14, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{page?.name || 'Constructor Visual'}</p>
          <p className="bld-hint" style={{ color: '#64748b', fontSize: 11, margin: 0 }}>Tocá un texto para cambiar tamaño/estilo · doble clic para escribir · 📱/💻 arriba a la derecha</p>
        </div>
        <button onClick={() => setShowBlocks(v => !v)} disabled={loading}
          style={{ background: showBlocks ? 'rgba(183,53,184,0.35)' : 'rgba(183,53,184,0.15)', border: '1px solid rgba(183,53,184,0.4)', color: '#4dfae8', borderRadius: 10, padding: '8px 14px', fontSize: 13, fontWeight: 800, cursor: 'pointer', opacity: loading ? 0.5 : 1 }}>➕ Elementos</button>
        <button onClick={() => setShowFill(true)} disabled={loading} title="Rellenar esta plantilla con tu negocio"
          style={{ background: 'linear-gradient(135deg,#f59e0b,#ec4899,#8b5cf6)', border: 'none', color: '#fff', borderRadius: 10, padding: '8px 14px', fontSize: 13, fontWeight: 800, cursor: 'pointer', opacity: loading ? 0.5 : 1 }}>🪄 Rellenar IA</button>
        <button onClick={() => setShowAI(true)} disabled={loading} title="Generar una landing nueva desde cero"
          style={{ background: 'linear-gradient(135deg,#233B8F,#147e95,#1fb8bb)', border: 'none', color: '#fff', borderRadius: 10, padding: '8px 14px', fontSize: 13, fontWeight: 800, cursor: 'pointer', opacity: loading ? 0.5 : 1 }}>✨ IA</button>
        <button onClick={() => setShowTemplates(true)} disabled={loading}
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#cbd5e1', borderRadius: 10, padding: '8px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: loading ? 0.5 : 1 }}>📄 Plantillas</button>
        <button onClick={() => setShowColors(true)} disabled={loading}
          style={{ background: 'rgba(139,92,246,0.14)', border: '1px solid rgba(139,92,246,0.35)', color: '#4dfae8', borderRadius: 10, padding: '8px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: loading ? 0.5 : 1 }}>🎨 Color</button>
        <button onClick={openLeads} disabled={loading}
          style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', color: '#4ade80', borderRadius: 10, padding: '8px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: loading ? 0.5 : 1 }}>📥 Leads</button>
        {page?.published && (
          <a href={`/b/${page.slug}`} target="_blank" rel="noreferrer"
            style={{ color: '#147e95', fontSize: 13, textDecoration: 'none', padding: '7px 10px' }}>Ver publicada ↗</a>
        )}
        <button onClick={() => save()} disabled={saving || loading}
          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', borderRadius: 10, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: saving || loading ? 0.5 : 1 }}>
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
        <button onClick={async () => { const ok = await save(!page?.published); if (!ok) showToast('No se pudo') }} disabled={saving || loading}
          style={{ background: page?.published ? 'rgba(239,68,68,0.15)' : 'linear-gradient(135deg,#22c55e,#16a34a)', border: page?.published ? '1px solid rgba(239,68,68,0.4)' : 'none', color: page?.published ? '#fca5a5' : '#04210f', borderRadius: 10, padding: '8px 16px', fontSize: 13, fontWeight: 800, cursor: 'pointer', opacity: saving || loading ? 0.5 : 1 }}>
          {page?.published ? 'Despublicar' : '🚀 Publicar'}
        </button>
      </div>

      {/* Franja de edición inline: bajo la barra superior, en el flujo (no se encima con el lienzo) */}
      {anyBar && (
      <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '8px 10px', background: '#0d0f1a', borderBottom: '1px solid rgba(255,255,255,0.08)', maxHeight: '42vh', overflowY: 'auto' }}>
      {/* Campo de ENLACE (aparece al seleccionar un botón o video) */}
      {linkEditor && (
        <div style={{ position: 'relative', zIndex: 55, maxWidth: '100%',background: '#111426', border: '1px solid rgba(183,53,184,.6)', borderRadius: 12, padding: '9px 12px', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 10px 30px rgba(0,0,0,.5)', flexWrap: 'wrap' }}>
          <span style={{ color: '#fff', fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap' }}>{linkEditor.type === 'video' ? '▶️ Enlace del video (YouTube):' : '🔗 Enlace del botón:'}</span>
          <input autoFocus value={linkEditor.url}
            onChange={e => { const v = e.target.value; setLinkEditor({ ...linkEditor, url: v }); if (linkEditor.type === 'link') applyToComp(v) }}
            onKeyDown={e => { if (e.key === 'Enter') applyToComp(linkEditor.url) }}
            placeholder={linkEditor.type === 'video' ? 'Pegá el enlace de YouTube y dale Aplicar' : 'https://...  o  https://wa.me/59171234567'}
            style={{ background: '#0b0f1a', border: '1px solid rgba(255,255,255,.15)', borderRadius: 8, padding: '8px 10px', color: '#fff', fontSize: 13, width: 320, maxWidth: '72vw', outline: 'none' }} />
          <button onClick={() => applyToComp(linkEditor.url)}
            style={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)', border: 'none', color: '#04210f', fontWeight: 800, fontSize: 13, padding: '8px 16px', borderRadius: 8, cursor: 'pointer', whiteSpace: 'nowrap' }}>Aplicar ✓</button>
        </div>
      )}

      {/* Barra de TEXTO (aparece al tocar un título/párrafo/botón): tamaño, estilo, color */}
      {textTools && !previewMode && (
        <div style={{ position: 'relative', zIndex: 55, maxWidth: '100%',background: '#111426', border: '1px solid rgba(183,53,184,.6)', borderRadius: 12, padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 10px 30px rgba(0,0,0,.5)', flexWrap: 'wrap', justifyContent: 'center' }}>
          <span style={{ color: '#4dfae8', fontSize: 13, fontWeight: 800, whiteSpace: 'nowrap' }}>Aa Texto</span>
          {/* Tamaño */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#0b0f1a', border: '1px solid rgba(255,255,255,.12)', borderRadius: 9, padding: '2px 4px' }}>
            <button title="Más chico" onClick={() => applyTextStyle({ 'font-size': Math.max(8, textTools.size - 2) + 'px' })}
              style={{ background: 'none', border: 'none', color: '#cbd5e1', fontSize: 18, fontWeight: 800, cursor: 'pointer', width: 26, lineHeight: 1 }}>−</button>
            <input type="number" value={textTools.size}
              onChange={e => { const n = parseInt(e.target.value); if (!isNaN(n) && n >= 8 && n <= 200) applyTextStyle({ 'font-size': n + 'px' }) }}
              style={{ width: 42, background: 'transparent', border: 'none', color: '#fff', fontSize: 13, fontWeight: 700, textAlign: 'center', outline: 'none' }} />
            <span style={{ color: '#64748b', fontSize: 11 }}>px</span>
            <button title="Más grande" onClick={() => applyTextStyle({ 'font-size': Math.min(200, textTools.size + 2) + 'px' })}
              style={{ background: 'none', border: 'none', color: '#cbd5e1', fontSize: 17, fontWeight: 800, cursor: 'pointer', width: 26, lineHeight: 1 }}>+</button>
          </div>
          {/* Negrita / Cursiva */}
          <button title="Negrita" onClick={() => applyTextStyle({ 'font-weight': textTools.bold ? '400' : '800' })}
            style={{ background: textTools.bold ? 'rgba(183,53,184,.35)' : '#0b0f1a', border: '1px solid rgba(255,255,255,.12)', color: '#fff', fontWeight: 900, fontSize: 15, width: 34, height: 34, borderRadius: 9, cursor: 'pointer' }}>B</button>
          <button title="Cursiva" onClick={() => applyTextStyle({ 'font-style': textTools.italic ? 'normal' : 'italic' })}
            style={{ background: textTools.italic ? 'rgba(183,53,184,.35)' : '#0b0f1a', border: '1px solid rgba(255,255,255,.12)', color: '#fff', fontStyle: 'italic', fontSize: 15, width: 34, height: 34, borderRadius: 9, cursor: 'pointer', fontFamily: 'Georgia,serif' }}>i</button>
          {/* Alineación */}
          <div style={{ display: 'flex', gap: 2, background: '#0b0f1a', border: '1px solid rgba(255,255,255,.12)', borderRadius: 9, padding: 2 }}>
            {([['left', '⬅'], ['center', '⬌'], ['right', '➡']] as const).map(([al, ic]) => (
              <button key={al} title={`Alinear ${al}`} onClick={() => applyTextStyle({ 'text-align': al })}
                style={{ background: textTools.align === al ? 'rgba(183,53,184,.35)' : 'transparent', border: 'none', color: '#fff', fontSize: 13, width: 30, height: 28, borderRadius: 7, cursor: 'pointer' }}>{ic}</button>
            ))}
          </div>
          {/* Color */}
          <label title="Color del texto" style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#0b0f1a', border: '1px solid rgba(255,255,255,.12)', borderRadius: 9, padding: '4px 8px', cursor: 'pointer' }}>
            <span style={{ width: 18, height: 18, borderRadius: 5, background: textTools.color, border: '1px solid rgba(255,255,255,.3)', display: 'inline-block' }} />
            <span style={{ color: '#cbd5e1', fontSize: 12, fontWeight: 700 }}>Texto</span>
            <input type="color" value={textTools.color} onChange={e => applyTextStyle({ color: e.target.value })}
              style={{ width: 0, height: 0, padding: 0, border: 'none', opacity: 0, position: 'absolute' }} />
          </label>
          {/* Color del botón (fondo) — solo para botones/enlaces */}
          {textTools.btnLike && (
            <label title="Color del botón" style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#0b0f1a', border: '1px solid rgba(255,255,255,.12)', borderRadius: 9, padding: '4px 8px', cursor: 'pointer' }}>
              <span style={{ width: 18, height: 18, borderRadius: 5, background: textTools.bg, border: '1px solid rgba(255,255,255,.3)', display: 'inline-block' }} />
              <span style={{ color: '#cbd5e1', fontSize: 12, fontWeight: 700 }}>Botón</span>
              <input type="color" value={textTools.bgHex} onChange={e => applyTextStyle({ background: e.target.value, 'background-color': e.target.value })}
                style={{ width: 0, height: 0, padding: 0, border: 'none', opacity: 0, position: 'absolute' }} />
            </label>
          )}
          {/* Animar botón — solo para botones/enlaces */}
          {textTools.btnLike && AnimRow(textTools.anim, [['fx-pulse', '🫧', 'Pulso'], ['fx-shine', '✨', 'Brillo'], ['fx-bounce', '⤴️', 'Rebote']])}
          {ActionRow}
          {MoreBtn}
          {expandTools && (
            <div style={{ width: '100%', display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,.1)' }}>
              {/* Tipografía */}
              <select title="Tipografía" onChange={e => applyTextStyle({ 'font-family': e.target.value })}
                style={{ background: '#0b0f1a', border: '1px solid rgba(255,255,255,.12)', color: '#fff', fontSize: 12, fontWeight: 700, padding: '7px 9px', borderRadius: 9, cursor: 'pointer' }}>
                <option value="">Tipografía…</option>
                <option value="Inter, system-ui, sans-serif">Moderna</option>
                <option value="'Trebuchet MS', system-ui, sans-serif">Redonda</option>
                <option value="Georgia, 'Times New Roman', serif">Elegante</option>
                <option value="Impact, 'Arial Black', sans-serif">Impacto</option>
                <option value="'Courier New', monospace">Máquina</option>
              </select>
              {/* Presets de texto */}
              {([['Título', { 'font-size': '32px', 'font-weight': '800', 'line-height': '1.15' }], ['Subtítulo', { 'font-size': '22px', 'font-weight': '700', 'line-height': '1.3' }], ['Párrafo', { 'font-size': '16px', 'font-weight': '400', 'line-height': '1.6' }]] as [string, Record<string, string>][]).map(([lbl, st]) => (
                <button key={lbl} onClick={() => applyTextStyle(st)}
                  style={{ background: '#0b0f1a', border: '1px solid rgba(255,255,255,.12)', color: '#cbd5e1', fontSize: 12, fontWeight: 700, padding: '7px 11px', borderRadius: 9, cursor: 'pointer', whiteSpace: 'nowrap' }}>{lbl}</button>
              ))}
              {/* Botón avanzado */}
              {textTools.btnLike && (
                <>
                  {Toggle('↔ Ancho', false, () => applyTextStyle({ display: 'block', width: '100%', 'text-align': 'center', 'box-sizing': 'border-box' }))}
                  {Toggle('⬤ Píldora', false, () => applyTextStyle({ 'border-radius': '999px' }))}
                  <label title="Color al pasar el mouse" style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#0b0f1a', border: '1px solid rgba(255,255,255,.12)', borderRadius: 9, padding: '4px 8px', cursor: 'pointer' }}>
                    <span style={{ color: '#cbd5e1', fontSize: 12, fontWeight: 700 }}>Hover</span>
                    <input type="color" defaultValue={textTools.bgHex} onChange={e => applyHover(e.target.value)}
                      style={{ width: 22, height: 20, padding: 0, border: 'none', background: 'transparent', cursor: 'pointer' }} />
                  </label>
                </>
              )}
              {AppearanceRow(textTools, applyTextStyle)}
            </div>
          )}
        </div>
      )}

      {/* Barra de IMAGEN (aparece al tocar una foto): ancho, esquinas, sombra, borde */}
      {imgTools && !previewMode && (
        <div style={{ position: 'relative', zIndex: 55, maxWidth: '100%',background: '#111426', border: '1px solid rgba(183,53,184,.5)', borderRadius: 12, padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 10px 30px rgba(0,0,0,.5)', flexWrap: 'wrap', justifyContent: 'center' }}>
          <span style={{ color: '#4dfae8', fontSize: 13, fontWeight: 800, whiteSpace: 'nowrap' }}>🖼️ Imagen</span>
          <button title="Cambiar / subir foto" onClick={pickImage}
            style={{ background: 'rgba(183,53,184,.15)', border: '1px solid rgba(183,53,184,.4)', color: '#4dfae8', fontWeight: 800, fontSize: 12, padding: '8px 12px', borderRadius: 9, cursor: 'pointer', whiteSpace: 'nowrap' }}>🖼️ Cambiar</button>
          <button title="Duplicar (añadir otra foto al riel)" onClick={dupImage}
            style={{ background: '#0b0f1a', border: '1px solid rgba(255,255,255,.12)', color: '#cbd5e1', fontWeight: 700, fontSize: 12, padding: '8px 12px', borderRadius: 9, cursor: 'pointer', whiteSpace: 'nowrap' }}>➕ Foto</button>
          {Stepper('Ancho %', imgTools.widthPct, 10, 100, 5, n => applyImgStyle({ width: n + '%', height: 'auto' }))}
          <button title="Ancho completo" onClick={() => applyImgStyle({ width: '100%', height: 'auto' })}
            style={{ background: '#0b0f1a', border: '1px solid rgba(255,255,255,.12)', color: '#cbd5e1', fontWeight: 700, fontSize: 12, padding: '8px 12px', borderRadius: 9, cursor: 'pointer', whiteSpace: 'nowrap' }}>↔ Completo</button>
          {Stepper('Esquinas', imgTools.radius, 0, 100, 4, n => applyImgStyle({ 'border-radius': n + 'px' }))}
          {AnimRow(imgTools.anim, [['fx-float', '🎈', 'Flotar'], ['fx-zoom', '🔍', 'Zoom'], ['fx-pulse', '🫧', 'Pulso'], ['fx-reveal', '📥', 'Aparecer']])}
          {ActionRow}
          {MoreBtn}
          {expandTools && AppearanceRow(imgTools, applyImgStyle)}
        </div>
      )}

      {/* Barra de ESPACIADO (aparece al tocar una sección/cuadro): relleno y separación */}
      {boxTools && !previewMode && (
        <div style={{ position: 'relative', zIndex: 55, maxWidth: '100%',background: '#111426', border: '1px solid rgba(34,197,94,.5)', borderRadius: 12, padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 10px 30px rgba(0,0,0,.5)', flexWrap: 'wrap', justifyContent: 'center' }}>
          <span style={{ color: '#86efac', fontSize: 13, fontWeight: 800, whiteSpace: 'nowrap' }}>↕ Espaciado</span>
          {/* Relleno vertical (arriba/abajo) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#0b0f1a', border: '1px solid rgba(255,255,255,.12)', borderRadius: 9, padding: '2px 4px' }}>
            <span style={{ color: '#94a3b8', fontSize: 11, fontWeight: 700, padding: '0 2px' }}>Alto</span>
            <button title="Menos alto" onClick={() => { const v = Math.max(0, boxTools.padY - 8); applyBoxStyle({ 'padding-top': v + 'px', 'padding-bottom': v + 'px' }) }}
              style={{ background: 'none', border: 'none', color: '#cbd5e1', fontSize: 18, fontWeight: 800, cursor: 'pointer', width: 26, lineHeight: 1 }}>−</button>
            <input type="number" value={boxTools.padY}
              onChange={e => { const n = parseInt(e.target.value); if (!isNaN(n) && n >= 0 && n <= 300) applyBoxStyle({ 'padding-top': n + 'px', 'padding-bottom': n + 'px' }) }}
              style={{ width: 40, background: 'transparent', border: 'none', color: '#fff', fontSize: 13, fontWeight: 700, textAlign: 'center', outline: 'none' }} />
            <button title="Más alto" onClick={() => { const v = Math.min(300, boxTools.padY + 8); applyBoxStyle({ 'padding-top': v + 'px', 'padding-bottom': v + 'px' }) }}
              style={{ background: 'none', border: 'none', color: '#cbd5e1', fontSize: 17, fontWeight: 800, cursor: 'pointer', width: 26, lineHeight: 1 }}>+</button>
          </div>
          {/* Separación entre elementos (gap) — solo si es un cuadro con varios elementos en fila/grilla */}
          {boxTools.flex && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#0b0f1a', border: '1px solid rgba(255,255,255,.12)', borderRadius: 9, padding: '2px 4px' }}>
              <span style={{ color: '#94a3b8', fontSize: 11, fontWeight: 700, padding: '0 2px' }}>Separación</span>
              <button title="Más juntos" onClick={() => { const v = Math.max(0, boxTools.gap - 4); applyBoxStyle({ gap: v + 'px' }) }}
                style={{ background: 'none', border: 'none', color: '#cbd5e1', fontSize: 18, fontWeight: 800, cursor: 'pointer', width: 26, lineHeight: 1 }}>−</button>
              <input type="number" value={boxTools.gap}
                onChange={e => { const n = parseInt(e.target.value); if (!isNaN(n) && n >= 0 && n <= 120) applyBoxStyle({ gap: n + 'px' }) }}
                style={{ width: 40, background: 'transparent', border: 'none', color: '#fff', fontSize: 13, fontWeight: 700, textAlign: 'center', outline: 'none' }} />
              <button title="Más separados" onClick={() => { const v = Math.min(120, boxTools.gap + 4); applyBoxStyle({ gap: v + 'px' }) }}
                style={{ background: 'none', border: 'none', color: '#cbd5e1', fontSize: 17, fontWeight: 800, cursor: 'pointer', width: 26, lineHeight: 1 }}>+</button>
            </div>
          )}
          {/* Color de fondo de la sección/cuadro */}
          <label title="Color de fondo" style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#0b0f1a', border: '1px solid rgba(255,255,255,.12)', borderRadius: 9, padding: '4px 8px', cursor: 'pointer' }}>
            <span style={{ width: 18, height: 18, borderRadius: 5, background: boxTools.bg, border: '1px solid rgba(255,255,255,.3)', display: 'inline-block' }} />
            <span style={{ color: '#cbd5e1', fontSize: 12, fontWeight: 700 }}>Fondo</span>
            <input type="color" value={boxTools.bgHex} onChange={e => applyBoxStyle({ background: e.target.value, 'background-color': e.target.value })}
              style={{ width: 0, height: 0, padding: 0, border: 'none', opacity: 0, position: 'absolute' }} />
          </label>
          {/* Imagen de fondo + oscurecer */}
          <button title="Imagen de fondo" onClick={pickBg}
            style={{ background: 'rgba(34,197,94,.15)', border: '1px solid rgba(34,197,94,.4)', color: '#86efac', fontWeight: 800, fontSize: 12, padding: '8px 12px', borderRadius: 9, cursor: 'pointer', whiteSpace: 'nowrap' }}>🖼️ Fondo</button>
          {boxTools.hasBgImg && (
            <button title="Oscurecer el fondo (para que se lea el texto)" onClick={toggleDarken}
              style={{ background: boxTools.darken ? 'rgba(139,92,246,.4)' : '#0b0f1a', border: '1px solid ' + (boxTools.darken ? 'rgba(139,92,246,.6)' : 'rgba(255,255,255,.12)'), color: '#fff', fontWeight: 700, fontSize: 12, padding: '8px 12px', borderRadius: 9, cursor: 'pointer', whiteSpace: 'nowrap' }}>🌑 {boxTools.darken ? 'Oscuro ✓' : 'Oscurecer'}</button>
          )}
          {/* Degradados rápidos */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 3, background: '#0b0f1a', border: '1px solid rgba(255,255,255,.12)', borderRadius: 9, padding: '3px 5px' }}>
            {['linear-gradient(135deg,#147e95,#8b5cf6)', 'linear-gradient(135deg,#f97316,#fb923c)', 'linear-gradient(135deg,#10b981,#22c55e)', 'linear-gradient(135deg,#ec4899,#f43f5e)', 'linear-gradient(160deg,#0f172a,#1e293b)'].map((g, i) => (
              <button key={i} title="Degradado" onClick={() => applyBoxStyle({ background: g, 'background-image': g })}
                style={{ width: 22, height: 22, borderRadius: 6, border: '1px solid rgba(255,255,255,.25)', background: g, cursor: 'pointer', padding: 0 }} />
            ))}
          </div>
          {/* Compactar de un toque */}
          <button title="Compactar" onClick={() => applyBoxStyle({ 'padding-top': '20px', 'padding-bottom': '20px', ...(boxTools.flex ? { gap: '10px' } : {}) })}
            style={{ background: 'rgba(34,197,94,.18)', border: '1px solid rgba(34,197,94,.4)', color: '#86efac', fontWeight: 800, fontSize: 12, padding: '8px 12px', borderRadius: 9, cursor: 'pointer', whiteSpace: 'nowrap' }}>⬍ Compactar</button>
          {/* Campos de formulario — solo cuando la sección seleccionada ES un <form> */}
          {boxTools.isForm && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 3, background: '#0b0f1a', border: '1px solid rgba(183,53,184,.4)', borderRadius: 9, padding: '3px 5px' }}>
              <span style={{ color: '#4dfae8', fontSize: 12, fontWeight: 800, padding: '0 3px' }}>📋</span>
              {([['Campo', NEW_FLD_TEXT], ['Email', NEW_FLD_EMAIL], ['WhatsApp', NEW_FLD_PHONE], ['Mensaje', NEW_FLD_MSG], ['Enviar', NEW_FLD_SUBMIT]] as [string, string][]).map(([lbl, html]) => (
                <button key={lbl} title={`Agregar ${lbl}`} onClick={() => addInside(html)}
                  style={{ background: 'transparent', border: 'none', color: '#cbd5e1', fontSize: 12, fontWeight: 700, padding: '5px 7px', borderRadius: 7, cursor: 'pointer', whiteSpace: 'nowrap' }}>{lbl}</button>
              ))}
            </div>
          )}
          {AddInsideRow}
          {ActionRow}
          {MoreBtn}
          {expandTools && AppearanceRow(boxTools, applyBoxStyle)}
        </div>
      )}

      </div>
      )}

      {/* Editor */}
      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        {loading && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 14, zIndex: 5, background: '#0d0f1a' }}>
            Cargando el constructor…
          </div>
        )}
        <div ref={containerRef} style={{ height: '100%' }} />
      </div>

      {toast && (
        <div style={{ position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', background: '#1e293b', color: '#fff', padding: '10px 18px', borderRadius: 12, fontSize: 13, fontWeight: 600, zIndex: 60, border: '1px solid rgba(255,255,255,0.1)' }}>
          {toast}
        </div>
      )}

      {/* Panel de ELEMENTOS (lateral izquierdo, estilo Elementor). Se queda abierto para agregar varios. */}
      {showBlocks && !previewMode && (() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const all: any[] = editorRef.current?.BlockManager?.getAll?.()?.models || editorRef.current?.BlockManager?.getAll?.() || []
        const q = blockSearch.trim().toLowerCase()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const grouped: Record<string, any[]> = {}
        all.forEach(b => {
          const label = String(b.get('label') || '')
          if (q && !label.toLowerCase().includes(q)) return
          const cat = BLOCK_CAT[b.id] || 'Otros'
          ;(grouped[cat] = grouped[cat] || []).push(b)
        })
        const cats = CAT_ORDER.filter(c => grouped[c]?.length)
        return (
          <>
            {/* Fondo (solo para cerrar tocando afuera; no bloquea el lienzo en escritorio) */}
            <div onClick={() => setShowBlocks(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.35)', zIndex: 68 }} />
            <aside style={{ position: 'fixed', top: 0, left: 0, bottom: 0, width: 288, maxWidth: '86vw', background: '#0f1220', borderRight: '1px solid rgba(255,255,255,.1)', zIndex: 69, display: 'flex', flexDirection: 'column', boxShadow: '4px 0 30px rgba(0,0,0,.5)' }}>
              <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid rgba(255,255,255,.08)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <p style={{ color: '#fff', fontWeight: 900, fontSize: 16, margin: 0 }}>🧩 Elementos</p>
                  <button onClick={() => setShowBlocks(false)} style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', color: '#cbd5e1', width: 30, height: 30, borderRadius: 8, cursor: 'pointer', fontSize: 16 }}>×</button>
                </div>
                <input value={blockSearch} onChange={e => setBlockSearch(e.target.value)} placeholder="Buscar elemento…"
                  style={{ width: '100%', boxSizing: 'border-box', background: '#0b0f1a', border: '1px solid rgba(255,255,255,.12)', borderRadius: 10, padding: '9px 12px', color: '#fff', fontSize: 13, outline: 'none' }} />
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px 24px' }}>
                {cats.length === 0 && mySections.length === 0 && <p style={{ color: '#64748b', fontSize: 13, textAlign: 'center', padding: 20 }}>Sin resultados</p>}
                {/* Mis secciones guardadas */}
                {mySections.length > 0 && !q && (
                  <div style={{ marginBottom: 16 }}>
                    <p style={{ color: '#94a3b8', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 8px' }}>💾 Mis secciones</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      {mySections.map(s => (
                        <div key={s.id} style={{ position: 'relative' }}>
                          <button onClick={() => insertBlock(s.html)} title="Agregar mi sección"
                            style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, background: 'rgba(34,197,94,.08)', border: '1px solid rgba(34,197,94,.25)', borderRadius: 12, padding: '14px 8px', color: '#e5e7eb', cursor: 'pointer', textAlign: 'center' }}>
                            <span style={{ fontSize: 24, lineHeight: 1 }}>💾</span>
                            <span style={{ fontSize: 11, fontWeight: 700 }}>Mi sección</span>
                          </button>
                          <button onClick={() => delMySection(s.id)} title="Borrar"
                            style={{ position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: 6, background: 'rgba(0,0,0,.5)', border: 'none', color: '#fca5a5', fontSize: 12, cursor: 'pointer', lineHeight: 1 }}>×</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {cats.map(cat => (
                  <div key={cat} style={{ marginBottom: 16 }}>
                    <p style={{ color: '#94a3b8', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 8px' }}>{CAT_EMOJI[cat] || '🧩'} {cat}</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      {grouped[cat].map(b => {
                        const label = String(b.get('label') || '')
                        const sp = label.indexOf(' ')
                        const emoji = sp > 0 ? label.slice(0, sp) : '🧩'
                        const text = sp > 0 ? label.slice(sp + 1) : label
                        return (
                          <button key={b.id} onClick={() => insertBlock(b.get('content'))} title={`Agregar ${text}`}
                            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 12, padding: '14px 8px', color: '#e5e7eb', cursor: 'pointer', textAlign: 'center', transition: 'all .15s' }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(183,53,184,.18)'; e.currentTarget.style.borderColor = 'rgba(183,53,184,.5)' }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,.1)' }}>
                            <span style={{ fontSize: 26, lineHeight: 1 }}>{emoji}</span>
                            <span style={{ fontSize: 11, fontWeight: 700, lineHeight: 1.25 }}>{text}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ padding: '10px 14px', borderTop: '1px solid rgba(255,255,255,.08)' }}>
                <p style={{ color: '#64748b', fontSize: 11, margin: 0, lineHeight: 1.4 }}>Tocá un elemento y se agrega debajo de lo seleccionado. Reordená con ⬆⬇.</p>
              </div>
            </aside>
          </>
        )
      })()}

      {/* Modal Plantillas */}
      {showTemplates && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', zIndex: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={() => setShowTemplates(false)}>
          <div style={{ background: '#111426', border: '1px solid rgba(255,255,255,.12)', borderRadius: 20, width: '100%', maxWidth: 640, padding: 24 }} onClick={e => e.stopPropagation()}>
            <p style={{ color: '#fff', fontWeight: 900, fontSize: 18, margin: '0 0 4px' }}>📄 Plantillas</p>
            <p style={{ color: '#64748b', fontSize: 13, margin: '0 0 18px' }}>Elegí una y se carga la landing completa. Después la editás.</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {TEMPLATES.map(t => (
                <button key={t.id} onClick={async () => { if (await confirmDialog('Esto reemplaza el contenido actual. ¿Continuar?')) { applyHtml(t.html); setShowTemplates(false); setFillDesc(''); setTimeout(() => setShowFill(true), 400) } }}
                  style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 14, padding: '20px 14px', color: '#fff', cursor: 'pointer', textAlign: 'left' }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>{t.emoji}</div>
                  <div style={{ fontWeight: 800, fontSize: 14 }}>{t.name}</div>
                </button>
              ))}
            </div>
            <button onClick={() => setShowTemplates(false)} style={{ marginTop: 16, width: '100%', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', color: '#94a3b8', borderRadius: 12, padding: 10, cursor: 'pointer' }}>Cerrar</button>
          </div>
        </div>
      )}

      {/* Modal Generar con IA */}
      {showAI && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', zIndex: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={() => !aiLoading && setShowAI(false)}>
          <div style={{ background: '#111426', border: '1px solid rgba(183,53,184,.4)', borderRadius: 20, width: '100%', maxWidth: 520, padding: 24 }} onClick={e => e.stopPropagation()}>
            <p style={{ color: '#fff', fontWeight: 900, fontSize: 18, margin: '0 0 4px' }}>✨ Generar con IA</p>
            <p style={{ color: '#64748b', fontSize: 13, margin: '0 0 16px' }}>Describí tu negocio y la IA arma la landing. Después la editás acá.</p>
            <textarea value={aiDesc} onChange={e => setAiDesc(e.target.value)} rows={4}
              placeholder="Ej: Vendo suplementos naturales por WhatsApp. Público: personas 30-50 con poca energía. Colores: verde y negro."
              style={{ width: '100%', boxSizing: 'border-box', background: '#0b0f1a', border: '1px solid rgba(255,255,255,.12)', borderRadius: 12, padding: 12, color: '#fff', fontSize: 14, resize: 'vertical', marginBottom: 14 }} />
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowAI(false)} disabled={aiLoading} style={{ flex: 1, background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', color: '#94a3b8', borderRadius: 12, padding: 12, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={generateAI} disabled={aiLoading || !aiDesc.trim()} style={{ flex: 2, background: 'linear-gradient(135deg,#233B8F,#147e95,#1fb8bb)', border: 'none', color: '#fff', fontWeight: 800, borderRadius: 12, padding: 12, cursor: 'pointer', opacity: aiLoading || !aiDesc.trim() ? .5 : 1 }}>{aiLoading ? 'Generando…' : '✨ Generar'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal RELLENAR con IA — reescribe los textos de la plantilla actual según el negocio */}
      {showFill && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', zIndex: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={() => !fillLoading && setShowFill(false)}>
          <div style={{ background: '#111426', border: '1px solid rgba(236,72,153,.4)', borderRadius: 20, width: '100%', maxWidth: 520, padding: 24 }} onClick={e => e.stopPropagation()}>
            <p style={{ color: '#fff', fontWeight: 900, fontSize: 18, margin: '0 0 4px' }}>🪄 Rellenar con IA</p>
            <p style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.5, margin: '0 0 16px' }}>Contanos de tu negocio y la IA reescribe <b style={{ color: '#e5e7eb' }}>los textos de esta plantilla</b> para vos. El diseño, los colores y las imágenes <b style={{ color: '#e5e7eb' }}>no se tocan</b>.</p>
            <textarea value={fillDesc} onChange={e => setFillDesc(e.target.value)} rows={5}
              placeholder="Ej: Soy barbería “El Corte” en Córdoba. Cortes, barba y diseños. Turnos por WhatsApp. Precio desde $4000. Tono cercano y canchero. Público hombres 18-40."
              style={{ width: '100%', boxSizing: 'border-box', background: '#0b0f1a', border: '1px solid rgba(255,255,255,.12)', borderRadius: 12, padding: 12, color: '#fff', fontSize: 14, resize: 'vertical', marginBottom: 14 }} />
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowFill(false)} disabled={fillLoading} style={{ flex: 1, background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', color: '#94a3b8', borderRadius: 12, padding: 12, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={fillWithAI} disabled={fillLoading || !fillDesc.trim()} style={{ flex: 2, background: 'linear-gradient(135deg,#f59e0b,#ec4899,#8b5cf6)', border: 'none', color: '#fff', fontWeight: 800, borderRadius: 12, padding: 12, cursor: 'pointer', opacity: fillLoading || !fillDesc.trim() ? .5 : 1 }}>{fillLoading ? 'Rellenando…' : '🪄 Rellenar contenido'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Color de marca */}
      {showColors && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', zIndex: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={() => setShowColors(false)}>
          <div style={{ background: '#111426', border: '1px solid rgba(255,255,255,.12)', borderRadius: 20, width: '100%', maxWidth: 420, padding: 24 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <p style={{ color: '#fff', fontWeight: 900, fontSize: 18, margin: 0 }}>🎨 Color de marca</p>
              <button onClick={() => setShowColors(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 20, cursor: 'pointer' }}>×</button>
            </div>
            <p style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.5, margin: '0 0 16px' }}>Elegí un color y recoloreamos <b style={{ color: '#e5e7eb' }}>todos los botones y acentos</b> de la página de una vez. Las fotos y los fondos oscuros no se tocan.</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <input type="color" value={themeColor} onChange={e => setThemeColor(e.target.value)}
                style={{ width: 54, height: 44, padding: 0, border: '1px solid rgba(255,255,255,.2)', borderRadius: 10, background: 'transparent', cursor: 'pointer' }} />
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {['#147e95', '#f97316', '#22c55e', '#ec4899', '#147e95', '#eab308', '#ef4444', '#14b8a6'].map(c => (
                  <button key={c} onClick={() => setThemeColor(c)} title={c}
                    style={{ width: 26, height: 26, borderRadius: 7, border: themeColor === c ? '2px solid #fff' : '1px solid rgba(255,255,255,.25)', background: c, cursor: 'pointer', padding: 0 }} />
                ))}
              </div>
            </div>
            <button onClick={() => applyTheme(themeColor)}
              style={{ width: '100%', background: 'linear-gradient(135deg,#7c3aed,#1fb8bb)', border: 'none', color: '#fff', fontWeight: 900, fontSize: 14, padding: '12px', borderRadius: 12, cursor: 'pointer' }}>Aplicar a toda la página</button>
          </div>
        </div>
      )}

      {/* Modal Leads */}
      {showLeads && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', zIndex: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={() => setShowLeads(false)}>
          <div style={{ background: '#111426', border: '1px solid rgba(255,255,255,.12)', borderRadius: 20, width: '100%', maxWidth: 620, maxHeight: '80vh', display: 'flex', flexDirection: 'column', padding: 24 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <p style={{ color: '#fff', fontWeight: 900, fontSize: 18, margin: 0 }}>📥 Leads capturados <span style={{ color: '#4ade80' }}>({leads.length})</span></p>
              <button onClick={() => setShowLeads(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 20, cursor: 'pointer' }}>×</button>
            </div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {leadsLoading ? (
                <p style={{ color: '#64748b', textAlign: 'center', padding: 30 }}>Cargando…</p>
              ) : leads.length === 0 ? (
                <p style={{ color: '#64748b', textAlign: 'center', padding: 30, fontSize: 14 }}>Todavía no hay leads. Cuando alguien complete el formulario de tu página, aparecerá aquí.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {leads.map(l => (
                    <div key={l.id} style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 12, padding: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ color: '#fff', fontWeight: 700, fontSize: 14, margin: 0 }}>{l.name || 'Sin nombre'}</p>
                        <p style={{ color: '#94a3b8', fontSize: 12, margin: '2px 0 0' }}>{[l.phone, l.email].filter(Boolean).join(' · ') || '—'}</p>
                      </div>
                      {l.phone && (
                        <a href={`https://wa.me/${String(l.phone).replace(/\D/g, '')}`} target="_blank" rel="noreferrer"
                          style={{ background: '#25D366', color: '#fff', fontWeight: 700, fontSize: 12, padding: '7px 12px', borderRadius: 10, textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}>💬 WhatsApp</a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
