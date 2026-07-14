'use client'

import { useEffect } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// CSS de la landing MY DIAMOND (integrado tal cual desde index.html)
// ─────────────────────────────────────────────────────────────────────────────
const CSS = `
  :root{
    --bg:#08060f;--bg-2:#0c0a18;--ink:#ffffff;--muted:#9498ad;--muted-2:#6f7286;
    --magenta:#ff20d6;--fuchsia:#e60ac0;--purple:#a425ff;--violet:#c026d3;--cyan:#22d3ee;--green:#1fd884;
    --card:rgba(10,8,19,.93);--card-brd:rgba(255,255,255,.085);
    --pill:linear-gradient(135deg,#ff1fd0 0%,#a425ff 100%);
    --radius:18px;--maxw:1180px;
  }
  .md-landing *{box-sizing:border-box;margin:0;padding:0}
  html{scroll-behavior:smooth}
  body{background:var(--bg);color:var(--ink);font-family:"Archivo",system-ui,sans-serif;line-height:1.55;
    overflow-x:hidden;-webkit-font-smoothing:antialiased}
  .md-landing h1,.md-landing h2,.md-landing h3,.md-landing .font-display{font-family:"Archivo",sans-serif;letter-spacing:-.02em}
  .md-landing a{color:inherit;text-decoration:none}
  .md-landing .wrap{max-width:var(--maxw);margin:0 auto;padding:0 24px}

  /* ====== FONDO ====== */
  .md-landing .bg{position:fixed;inset:0;z-index:0;pointer-events:none;
    background:
      radial-gradient(900px 600px at 80% -5%, rgba(164,37,255,.18), transparent 60%),
      radial-gradient(800px 600px at 12% 8%, rgba(255,32,214,.10), transparent 55%),
      radial-gradient(1000px 800px at 50% 110%, rgba(34,211,238,.10), transparent 60%),
      var(--bg);}
  .md-landing .bg::after{content:"";position:absolute;inset:0;opacity:.5;
    background-image:radial-gradient(rgba(255,255,255,.10) 1px, transparent 1px);background-size:46px 46px;
    -webkit-mask-image:radial-gradient(circle at 50% 30%, #000 0%, transparent 75%);
            mask-image:radial-gradient(circle at 50% 30%, #000 0%, transparent 75%);}

  /* ====== GALAXIA EN MOVIMIENTO (detrás del diamante) ====== */
  #galaxy{position:fixed;inset:0;z-index:0;pointer-events:none;display:block}

  /* ====== DIAMANTE (video) + HALO ====== */
  #diamondGlow{position:fixed;top:46%;left:50%;width:62vmax;height:62vmax;transform:translate(-50%,-50%);
    z-index:1;pointer-events:none;border-radius:50%;
    background:radial-gradient(circle, rgba(205,222,255,.40), rgba(170,90,255,.12) 38%, transparent 70%);
    filter:blur(48px);opacity:.34;will-change:opacity,transform}
  #gem{position:fixed;top:50%;left:50%;z-index:2;pointer-events:none;display:block;
    width:clamp(360px,62vmin,760px);height:auto;mix-blend-mode:screen;
    transform:translate(-50%,-50%) scale(.7);will-change:transform;
    filter:drop-shadow(0 18px 55px rgba(150,180,255,.18));
    -webkit-mask-image:radial-gradient(ellipse 92% 86% at 50% 48%, #000 72%, transparent 100%);
            mask-image:radial-gradient(ellipse 92% 86% at 50% 48%, #000 72%, transparent 100%)}

  /* ====== PROGRESO ====== */
  .md-landing .progress{position:fixed;top:0;left:0;height:3px;width:0;z-index:60;background:var(--pill);
    box-shadow:0 0 12px rgba(255,32,214,.7);transition:width .08s linear}

  /* ====== NAV ====== */
  .md-landing header.nav{position:fixed;top:0;left:0;right:0;z-index:50;transition:background .3s,backdrop-filter .3s,border-color .3s;
    border-bottom:1px solid transparent}
  .md-landing header.nav.scrolled{background:rgba(8,6,15,.72);backdrop-filter:blur(14px);border-color:rgba(255,255,255,.06)}
  .md-landing .nav-in{display:flex;align-items:center;justify-content:space-between;height:74px}
  .md-landing .brand{display:flex;align-items:center;gap:12px;font-family:"Archivo";font-weight:800;
    letter-spacing:.12em;font-size:15px;white-space:nowrap}
  .md-landing .brand .wordmark{height:48px;width:auto;display:block;
    filter:drop-shadow(0 0 10px rgba(164,37,255,.35))}
  .md-landing .foot-in .brand .wordmark{height:38px}
  .md-landing .brand .logo{width:auto;height:auto;display:grid;place-items:center;
    background:none;border:none;box-shadow:none;border-radius:0;animation:none}
  @keyframes logopulse{0%,100%{box-shadow:0 0 18px rgba(164,37,255,.35)}50%{box-shadow:0 0 30px rgba(196,38,211,.7)}}
  .md-landing .nav-actions{display:flex;align-items:center;gap:14px}
  .md-landing .btn{font-family:"Archivo";font-weight:700;letter-spacing:.12em;font-size:12.5px;text-transform:uppercase;
    border-radius:12px;padding:13px 22px;cursor:pointer;border:1px solid transparent;display:inline-flex;align-items:center;
    gap:9px;transition:transform .18s,box-shadow .25s,background .25s;white-space:nowrap}
  .md-landing .btn-ghost{background:rgba(255,255,255,.04);border-color:rgba(255,255,255,.12);color:#d8dae6}
  .md-landing .btn-ghost:hover{background:rgba(255,255,255,.08);transform:translateY(-1px)}
  .md-landing .btn-primary{background:var(--pill);color:#fff;box-shadow:0 8px 26px rgba(196,38,211,.45)}
  .md-landing .btn-primary:hover{transform:translateY(-2px);box-shadow:0 12px 34px rgba(196,38,211,.65)}
  .md-landing .btn-lg{padding:18px 30px;font-size:13.5px}

  /* ====== CONTENIDO ====== */
  .md-landing main{position:relative;z-index:3}
  .md-landing section{position:relative}
  .md-landing .eyebrow{font-family:"Archivo";font-weight:700;letter-spacing:.28em;font-size:12px;text-transform:uppercase}

  /* ====== HERO ====== */
  .md-landing .hero{padding:150px 0 90px}
  .md-landing .hero-grid{display:grid;grid-template-columns:1.05fr .95fr;gap:60px;align-items:center}
  .md-landing .badge{display:inline-flex;align-items:center;gap:9px;padding:8px 16px;border-radius:999px;
    background:rgba(164,37,255,.10);border:1px solid rgba(164,37,255,.28);
    font-family:"Archivo";font-weight:700;letter-spacing:.18em;font-size:11px;text-transform:uppercase;color:#cdb9ff}
  .md-landing .dot{width:8px;height:8px;border-radius:50%;background:var(--green);box-shadow:0 0 10px var(--green)}
  .md-landing .hero h1{font-size:clamp(40px,6vw,78px);font-weight:800;line-height:1.02;margin:26px 0 24px}
  .md-landing .g-magenta{background:linear-gradient(100deg,#ff2bd6,#b026ff);-webkit-background-clip:text;background-clip:text;color:transparent}
  .md-landing .g-cyan{background:linear-gradient(100deg,#a425ff,#22d3ee);-webkit-background-clip:text;background-clip:text;color:transparent}
  .md-landing .hero p.lead{color:var(--muted);font-size:18px;max-width:520px;margin-bottom:34px}
  .md-landing .hero-cta{display:flex;gap:16px;flex-wrap:wrap;margin-bottom:34px}
  .md-landing .trust{display:flex;gap:26px;flex-wrap:wrap;color:var(--muted-2);font-size:14px}
  .md-landing .trust span{display:inline-flex;align-items:center;gap:8px}

  /* ====== CHAT MOCKUP ====== */
  .md-landing .phone{background:#0b0f12;border:1px solid rgba(255,255,255,.09);border-radius:24px;overflow:hidden;
    box-shadow:0 40px 90px rgba(0,0,0,.55),0 0 0 1px rgba(196,38,211,.10);max-width:430px;margin-left:auto}
  .md-landing .chat-head{display:flex;align-items:center;gap:12px;padding:16px 18px;background:#11161a;border-bottom:1px solid rgba(255,255,255,.05)}
  .md-landing .avatar{width:42px;height:42px;border-radius:50%;display:grid;place-items:center;font-weight:700;font-size:13px;
    font-family:"Archivo";flex-shrink:0}
  .md-landing .av-cm{background:linear-gradient(145deg,#0f3d2e,#0b2a20);color:#3ee29a;border:1.5px solid #1fd884}
  .md-landing .av-md{background:var(--green);color:#06291c}
  .md-landing .chat-head .name{font-weight:700;font-size:15px;font-family:"Archivo"}
  .md-landing .chat-head .status{color:var(--green);font-size:12px}
  .md-landing .chat-head .meta-dots{margin-left:auto;display:flex;gap:5px}
  .md-landing .chat-head .meta-dots i{width:7px;height:7px;border-radius:50%;background:#2a3138}
  .md-landing .chat-head .meta-dots i:first-child{background:var(--green)}
  .md-landing .chat-body{padding:18px;background:#0a0e10;min-height:300px;display:flex;flex-direction:column;gap:14px}
  .md-landing .day{align-self:center;font-size:11px;color:#5d646c;background:rgba(255,255,255,.04);padding:4px 12px;border-radius:8px;letter-spacing:.1em}
  .md-landing .msg-row{display:flex;gap:9px;align-items:flex-end;max-width:88%}
  .md-landing .msg-row .avatar{width:30px;height:30px;font-size:11px}
  .md-landing .msg-row.out{align-self:flex-end;flex-direction:row-reverse}
  .md-landing .bubble{padding:10px 13px;border-radius:14px;font-size:14px;line-height:1.4;position:relative}
  .md-landing .bubble .t{display:block;font-size:10.5px;color:rgba(255,255,255,.45);margin-top:4px;text-align:right}
  .md-landing .in .bubble{background:#1b2227;border-bottom-left-radius:5px}
  .md-landing .out .bubble{background:#0c5e45;border-bottom-right-radius:5px}
  .md-landing .out .bubble .t{color:rgba(220,255,240,.6)}
  .md-landing .typing{display:inline-flex;gap:4px;padding:13px}
  .md-landing .typing i{width:7px;height:7px;border-radius:50%;background:#5d646c;animation:bounce 1.3s infinite}
  .md-landing .typing i:nth-child(2){animation-delay:.2s}.md-landing .typing i:nth-child(3){animation-delay:.4s}
  @keyframes bounce{0%,60%,100%{transform:translateY(0);opacity:.5}30%{transform:translateY(-5px);opacity:1}}
  .md-landing .chat-input{display:flex;align-items:center;gap:12px;padding:14px 16px;background:#11161a;border-top:1px solid rgba(255,255,255,.05)}
  .md-landing .chat-input .field{flex:1;background:#0a0e10;border-radius:999px;padding:12px 18px;color:#5d646c;font-size:14px}
  .md-landing .send{width:46px;height:46px;border-radius:50%;background:var(--green);display:grid;place-items:center;color:#06291c;flex-shrink:0}

  /* ====== STATS ====== */
  .md-landing .stats{border-top:1px solid rgba(255,255,255,.06);border-bottom:1px solid rgba(255,255,255,.06);padding:54px 0}
  .md-landing .stats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:30px;text-align:center}
  .md-landing .stat .ic{width:58px;height:58px;border-radius:15px;display:grid;place-items:center;margin:0 auto 16px}
  .md-landing .stat .num{font-family:"Archivo";font-weight:800;font-size:clamp(30px,3.6vw,44px);line-height:1}
  .md-landing .stat .lbl{color:var(--muted-2);font-size:12.5px;letter-spacing:.14em;text-transform:uppercase;margin-top:10px}
  .md-landing .ic-purple{background:rgba(164,37,255,.12);color:#c79bff;border:1px solid rgba(164,37,255,.3)}
  .md-landing .ic-green{background:rgba(31,216,132,.12);color:#4fe6a3;border:1px solid rgba(31,216,132,.3)}
  .md-landing .ic-cyan{background:rgba(34,211,238,.12);color:#6ee5f5;border:1px solid rgba(34,211,238,.3)}

  /* ====== TÍTULOS ====== */
  .md-landing .sec-head{text-align:center;max-width:760px;margin:0 auto 60px}
  .md-landing .sec-head .eyebrow{color:var(--magenta)}
  .md-landing .sec-head h2{font-size:clamp(34px,5vw,58px);font-weight:800;line-height:1.05;margin-top:18px}
  .md-landing .g-purple{background:linear-gradient(100deg,#c026d3,#a425ff);-webkit-background-clip:text;background-clip:text;color:transparent}
  .md-landing .g-green{background:linear-gradient(100deg,#1fd884,#22d3ee);-webkit-background-clip:text;background-clip:text;color:transparent}

  .md-landing .features{padding:100px 0}
  .md-landing .feat-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}
  .md-landing .card{background:var(--card);border:1px solid var(--card-brd);border-radius:var(--radius);padding:32px;
    backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);
    transition:transform .3s,border-color .3s,background .3s;position:relative;overflow:hidden}
  .md-landing .card .inner{position:relative;z-index:1}
  .md-landing .card::before{content:"";position:absolute;inset:0;border-radius:inherit;opacity:0;transition:opacity .35s;
    background:radial-gradient(420px 200px at 50% -20%, rgba(164,37,255,.16), transparent 70%)}
  .md-landing .card:hover{transform:translateY(-6px);border-color:rgba(196,38,211,.35);background:rgba(22,17,38,.82)}
  .md-landing .card:hover::before{opacity:1}
  .md-landing .card .ic{width:52px;height:52px;border-radius:14px;display:grid;place-items:center;margin-bottom:22px}
  .md-landing .card .ic.sm{width:38px;height:38px;border-radius:11px;margin-bottom:0}
  .md-landing .card-h{display:flex;align-items:center;gap:12px;margin-bottom:11px}
  .md-landing .card-h h3{margin:0}
  .md-landing .card h3{font-size:20px;font-weight:700;margin-bottom:12px}
  .md-landing .card p{color:var(--muted);font-size:14.5px}
  .md-landing .card-foot{display:inline-flex;align-items:center;gap:7px;margin-top:16px;font-family:"Archivo";
    font-weight:700;font-size:12.5px;letter-spacing:.03em;color:#c79bff;transition:gap .2s,color .2s}
  .md-landing .card:hover .card-foot{gap:11px;color:#e6ccff}

  /* ===== Mini-visuales dentro de las tarjetas ===== */
  .md-landing .thumb{height:132px;border-radius:14px;margin-bottom:20px;position:relative;overflow:hidden;display:flex;padding:14px;
    background:linear-gradient(155deg,rgba(255,255,255,.07),rgba(255,255,255,.012));border:1px solid rgba(255,255,255,.07)}
  .md-landing .thumb::after{content:"";position:absolute;inset:0;background:radial-gradient(240px 120px at 18% -10%,rgba(164,37,255,.20),transparent 70%);pointer-events:none}
  .md-landing .thumb .badge-sm{position:absolute;top:11px;right:11px;font-family:"Archivo";font-weight:800;font-size:10px;
    padding:4px 9px;border-radius:999px;background:rgba(31,216,132,.16);color:#5ef0ac;border:1px solid rgba(31,216,132,.35);z-index:2}
  /* chat */
  .md-landing .tb-chat{display:flex;flex-direction:column;gap:7px;justify-content:center;width:100%}
  .md-landing .tb-bub{max-width:80%;padding:8px 11px;border-radius:11px;font-size:11.5px;color:#dfe3ee;line-height:1.3}
  .md-landing .tb-bub.in{background:#1b2227;border-bottom-left-radius:4px;align-self:flex-start}
  .md-landing .tb-bub.out{background:#0c5e45;border-bottom-right-radius:4px;align-self:flex-end;color:#eafff5}
  .md-landing .tb-typing{align-self:flex-start;display:inline-flex;gap:3px;background:#1b2227;padding:9px 11px;border-radius:11px}
  .md-landing .tb-typing i{width:5px;height:5px;border-radius:50%;background:#5d646c;animation:bounce 1.3s infinite}
  .md-landing .tb-typing i:nth-child(2){animation-delay:.2s}.md-landing .tb-typing i:nth-child(3){animation-delay:.4s}
  /* ads */
  .md-landing .tb-col{display:flex;flex-direction:column;gap:10px;width:100%;justify-content:center}
  .md-landing .tb-chips{display:flex;gap:6px}
  .md-landing .tb-chip{font-family:"Archivo";font-size:10px;font-weight:700;padding:4px 9px;border-radius:999px;color:#fff}
  .md-landing .tb-bars{display:flex;align-items:flex-end;gap:8px;height:50px}
  .md-landing .tb-bars span{flex:1;border-radius:5px 5px 0 0;background:linear-gradient(180deg,#d646ea,#7a1fd6)}
  /* store */
  .md-landing .tb-store{display:flex;gap:13px;align-items:center;width:100%}
  .md-landing .tb-prod{width:72px;height:92px;border-radius:10px;flex-shrink:0;position:relative;overflow:hidden;
    background:linear-gradient(150deg,#a425ff,#22d3ee)}
  .md-landing .tb-prod::after{content:"";position:absolute;inset:0;background:radial-gradient(circle at 70% 25%,rgba(255,255,255,.5),transparent 45%)}
  .md-landing .tb-meta{display:flex;flex-direction:column;gap:8px;flex:1}
  .md-landing .tb-line{height:8px;border-radius:5px;background:rgba(255,255,255,.16)}
  .md-landing .tb-line.s{width:60%}
  .md-landing .tb-price{font-family:"Archivo";font-weight:800;color:#fff;font-size:17px}
  .md-landing .tb-add{align-self:flex-start;font-family:"Archivo";font-size:10.5px;font-weight:700;color:#06291c;
    background:#1fd884;padding:6px 12px;border-radius:8px}
  /* lecciones */
  .md-landing .tb-les{display:flex;flex-direction:column;gap:9px;width:100%;justify-content:center}
  .md-landing .tb-row{display:flex;align-items:center;gap:10px}
  .md-landing .tb-play{width:26px;height:26px;border-radius:8px;background:rgba(196,38,211,.18);display:grid;place-items:center;color:#e29bff;flex-shrink:0}
  .md-landing .tb-prog{height:7px;border-radius:5px;background:rgba(255,255,255,.1);overflow:hidden;flex:1}
  .md-landing .tb-prog i{display:block;height:100%;width:62%;background:linear-gradient(90deg,#c026d3,#a425ff)}
  /* red / chart */
  .md-landing .tb-svg{width:100%;height:100%}
  .md-landing .thumb svg{display:block}

  /* ====== TESTIMONIOS ====== */
  .md-landing .testi{padding:90px 0 110px;overflow:hidden}
  .md-landing .marquee{display:flex;gap:22px;width:max-content;animation:scrollX 46s linear infinite}
  .md-landing .marquee.rev{animation-direction:reverse;margin-top:22px}
  .md-landing .marquee-mask{-webkit-mask-image:linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent);
                        mask-image:linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent)}
  .md-landing .testi:hover .marquee{animation-play-state:paused}
  @keyframes scrollX{to{transform:translateX(-50%)}}
  .md-landing .tcard{width:360px;flex-shrink:0;background:var(--card);border:1px solid var(--card-brd);border-radius:var(--radius);padding:26px;
    backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px)}
  .md-landing .stars{color:#ffc83d;letter-spacing:2px;font-size:15px;margin-bottom:14px}
  .md-landing .tcard p{color:#c8cbda;font-size:15px;min-height:84px}
  .md-landing .tperson{display:flex;align-items:center;gap:13px;margin-top:18px;padding-top:18px;border-top:1px solid rgba(255,255,255,.06)}
  .md-landing .tperson .avatar{width:42px;height:42px}
  .md-landing .tperson .pn{font-family:"Archivo";font-weight:700;font-size:15px}
  .md-landing .tperson .pr{color:var(--muted-2);font-size:12.5px}
  .md-landing .av-1{background:linear-gradient(145deg,#3a1d52,#1e1030);color:#c79bff;border:1px solid rgba(164,37,255,.4)}
  .md-landing .av-2{background:linear-gradient(145deg,#0f3d2e,#0b2a20);color:#4fe6a3;border:1px solid rgba(31,216,132,.4)}
  .md-landing .av-3{background:linear-gradient(145deg,#0e3640,#0a2630);color:#6ee5f5;border:1px solid rgba(34,211,238,.4)}

  /* ====== CTA FINAL ====== */
  .md-landing .cta{padding:110px 0;text-align:center}
  .md-landing .cta .wrap{position:relative}
  .md-landing .cta .wrap::before{content:"";position:absolute;inset:-8% -6%;z-index:-1;pointer-events:none;
    background:radial-gradient(ellipse 60% 60% at center, rgba(6,4,12,.7), rgba(6,4,12,.32) 55%, transparent 78%);
    filter:blur(14px)}
  .md-landing .cta .ic-zap{width:74px;height:74px;border-radius:20px;display:grid;place-items:center;margin:0 auto 30px;
    background:var(--pill);box-shadow:0 16px 44px rgba(196,38,211,.5)}
  .md-landing .cta h2{font-size:clamp(36px,5.5vw,66px);font-weight:800;line-height:1.04}
  .md-landing .cta p{color:var(--muted);font-size:18px;max-width:620px;margin:22px auto 38px}
  .md-landing .cta .fine{color:var(--muted-2);font-size:13.5px;margin-top:24px;letter-spacing:.04em}

  /* ====== FOOTER ====== */
  .md-landing footer{border-top:1px solid rgba(255,255,255,.06);padding:40px 0}
  .md-landing .foot-in{display:flex;align-items:center;justify-content:space-between;gap:20px;flex-wrap:wrap}
  .md-landing .foot-in .brand .logo{width:auto;height:auto;border-radius:0;animation:none}
  .md-landing .foot-links{display:flex;gap:26px;color:var(--muted);font-size:14px}
  .md-landing .foot-links a:hover{color:#fff}
  .md-landing .copy{color:var(--muted-2);font-size:13.5px}

  /* ====== REVEAL (la info aparece al bajar) ====== */
  .md-landing .reveal{opacity:0;transform:translateY(42px);filter:blur(7px);
    transition:opacity .9s cubic-bezier(.16,.8,.3,1),transform .9s cubic-bezier(.16,.8,.3,1),filter .9s ease;
    will-change:opacity,transform,filter}
  .md-landing .reveal[data-anim="left"]{transform:translateX(-52px)}
  .md-landing .reveal[data-anim="right"]{transform:translateX(52px)}
  .md-landing .reveal[data-anim="scale"]{transform:scale(.9) translateY(26px)}
  .md-landing .reveal.in{opacity:1;transform:none;filter:none}

  /* ====== RESPONSIVE ====== */
  @media(max-width:920px){
    .md-landing .hero-grid{grid-template-columns:1fr;gap:48px}
    .md-landing .hero-grid > .reveal:first-child{position:relative}
    .md-landing .hero-grid > .reveal:first-child::before{content:"";position:absolute;inset:-12% -8%;z-index:-1;pointer-events:none;
      background:radial-gradient(ellipse 75% 65% at 38% 42%, rgba(7,5,14,.66), rgba(7,5,14,.25) 58%, transparent 80%);
      filter:blur(16px)}
    .md-landing .phone{margin:0 auto}
    .md-landing .stats-grid{grid-template-columns:repeat(2,1fr);gap:38px 20px}
    .md-landing .feat-grid{grid-template-columns:1fr 1fr}
    #diamondGlow{width:64vmax;height:64vmax}
  }
  @media(max-width:620px){
    .md-landing .hero{padding:120px 0 60px}
    .md-landing .nav-actions .btn-ghost{display:none}
    .md-landing .feat-grid{grid-template-columns:1fr}
    .md-landing .trust{gap:16px}
    .md-landing .tcard{width:300px}
    .md-landing .foot-in{flex-direction:column;text-align:center}
  }
  @media(prefers-reduced-motion:reduce){
    .md-landing .marquee{animation:none}.md-landing .logo,.md-landing .spark{animation:none}html{scroll-behavior:auto}
    .md-landing .reveal{transition-duration:.4s}
  }
`

// ─────────────────────────────────────────────────────────────────────────────
// Testimonios (se duplican en JSX para el marquee infinito, en vez de innerHTML)
// ─────────────────────────────────────────────────────────────────────────────
type Testi = { ini: string; av: string; name: string; flag: string; role: string; text: string }

const ROW1: Testi[] = [
  { ini: 'AP', av: 'av-1', name: 'Ana Paula Silva', flag: '🇧🇷', role: 'Empresária · Brasil', text: 'Automatizei meu negócio completo: bot, loja e anúncios. Hoje ganho enquanto viajo. MY DIAMOND mudou minha vida!' },
  { ini: 'JR', av: 'av-2', name: 'James Rivera', flag: '🇺🇸', role: 'Online Business Owner · USA', text: 'The AI bots are incredible. My store sells automatically while I sleep. Best investment I made for my business this year.' },
  { ini: 'LF', av: 'av-3', name: 'Luisa Fernández', flag: '🇻🇪', role: 'Vendedora online · Venezuela', text: 'Configuré mi tienda en una tarde. Al día siguiente ya tenía mis primeras ventas. Simple, potente y rentable.' },
  { ini: 'DS', av: 'av-1', name: 'Diego Sánchez', flag: '🇦🇷', role: 'Empresario · Argentina', text: 'Lo que más me sorprendió fue la velocidad. En 2 días tenía bot, landing y campaña activos. Resultados desde el primer mes.' },
  { ini: 'MG', av: 'av-2', name: 'María González', flag: '🇨🇴', role: 'Emprendedora digital · Colombia', text: 'Antes perdía clientes por no tener tiempo. Ahora mi bot atiende y mis ventas crecieron un 280% en pocos meses.' },
]

const ROW2: Testi[] = [
  { ini: 'IC', av: 'av-3', name: 'Isabella Costa', flag: '🇧🇷', role: 'Influencer de negócios · Brasil', text: 'Em 3 meses recuperei o investimento e hoje lucro consistentemente. As ferramentas de IA são de outro nível mesmo.' },
  { ini: 'AT', av: 'av-1', name: 'Andrés Torres', flag: '🇧🇴', role: 'Comerciante · Bolivia', text: 'Tenía miedo de la tecnología pero MY DIAMOND es muy intuitivo. Ahora mi negocio opera solo mientras yo construyo mi equipo.' },
  { ini: 'SL', av: 'av-2', name: 'Sofía Lagos', flag: '🇨🇱', role: 'Emprendedora · Chile', text: 'Sin experiencia técnica armé todo en un fin de semana. El soporte siempre responde y las herramientas son realmente buenas.' },
  { ini: 'RC', av: 'av-3', name: 'Roberto Castillo', flag: '🇵🇪', role: 'Networker · Perú', text: 'Mis referidos crecen solos gracias al sistema. Los retiros llegan puntuales y el panel de comisiones es muy transparente.' },
  { ini: 'VM', av: 'av-1', name: 'Valentina Moreno', flag: '🇲🇽', role: 'Coach de negocios · México', text: 'Mi landing page convierte como nunca antes. Los textos los genera la IA y se ven profesionales desde el primer intento.' },
]

function TCard({ t }: { t: Testi }) {
  return (
    <div className="tcard">
      <div className="stars">★★★★★</div>
      <p>&quot;{t.text}&quot;</p>
      <div className="tperson">
        <span className={`avatar ${t.av}`}>{t.ini}</span>
        <div>
          <div className="pn">{t.name} {t.flag}</div>
          <div className="pr">{t.role}</div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PÁGINA
// ─────────────────────────────────────────────────────────────────────────────
export default function HomePage() {
  useEffect(() => {
    // ===== Scroll / diamante / nav / contador =====
    const nav = document.getElementById('nav')
    const bar = document.getElementById('progress')
    const gemVid = document.getElementById('gem') as HTMLVideoElement | null
    const glow = document.getElementById('diamondGlow')

    const scrollProgress = () => {
      const d = document.documentElement
      const max = (d.scrollHeight - d.clientHeight) || 1
      return Math.min(1, Math.max(0, (window.scrollY || d.scrollTop) / max))
    }
    // El diamante (video) gira acoplado al scroll: mapeo LINEAL del progreso al
    // tiempo del video — al BAJAR avanza (gira hacia adelante), al SUBIR retrocede
    // (gira al revés). Un loop continuo (rAF) + suavizado lo hace fluido y direccional,
    // sin el salto que causaba TURNS=2.5 con módulo (reiniciaba el giro a media página).
    if (gemVid) { gemVid.muted = true; gemVid.pause() }
    let curT = 0
    let uiRaf = 0
    const uiTick = () => {
      uiRaf = requestAnimationFrame(uiTick)
      if (document.hidden) return
      const p = scrollProgress()
      if (bar) bar.style.width = (p * 100).toFixed(2) + '%'
      if (nav) nav.classList.toggle('scrolled', (window.scrollY || 0) > 24)
      const mob = window.innerWidth < 720
      const s = (mob ? 0.46 : 0.7) + Math.pow(p, 1.5) * (mob ? 1.05 : 1.6)
      if (gemVid) gemVid.style.transform = `translate(-50%,-50%) scale(${s.toFixed(3)})`
      if (glow) {
        glow.style.opacity = (0.16 + p * 0.40).toFixed(3)
        glow.style.transform = `translate(-50%,-50%) scale(${(0.8 + s * 0.5).toFixed(2)})`
      }
      if (gemVid && gemVid.readyState >= 2 && gemVid.duration) {
        const target = p * (gemVid.duration - 0.05) // lineal: 1 pasada del video en todo el scroll
        curT += (target - curT) * 0.2               // suavizado hacia el objetivo
        if (Math.abs(gemVid.currentTime - curT) > 0.01) { try { gemVid.currentTime = curT } catch { /* noop */ } }
      }
    }
    uiRaf = requestAnimationFrame(uiTick)

    // ===== Reveal escalonado =====
    document.querySelectorAll<HTMLElement>('[data-stagger]').forEach(g => {
      Array.from(g.children).forEach((c, i) => { (c as HTMLElement).style.transitionDelay = Math.min(i, 6) * 85 + 'ms' })
    })
    const io = new IntersectionObserver((ents) => {
      ents.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target) } })
    }, { threshold: .16, rootMargin: '0px 0px -8% 0px' })
    document.querySelectorAll('.reveal').forEach(el => io.observe(el))

    // ===== Conteo animado de stats =====
    const countUp = (el: HTMLElement) => {
      const to = +(el.dataset.to || 0), dur = 1600, start = performance.now()
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / dur)
        const e = 1 - Math.pow(1 - t, 3)
        el.textContent = Math.round(to * e).toLocaleString('en-US')
        if (t < 1) requestAnimationFrame(step)
      }
      requestAnimationFrame(step)
    }
    const cio = new IntersectionObserver((ents) => {
      ents.forEach(e => { if (e.isIntersecting) { countUp(e.target as HTMLElement); cio.unobserve(e.target) } })
    }, { threshold: .6 })
    document.querySelectorAll<HTMLElement>('.count').forEach(el => cio.observe(el))

    // ===== Galaxia (estrellas + nebulosas) =====
    let galaxyRaf = 0
    let onGalaxyResize: (() => void) | null = null
    let onGalaxyScroll: (() => void) | null = null
    const cv = document.getElementById('galaxy') as HTMLCanvasElement | null
    if (cv) {
      const ctx = cv.getContext('2d')
      if (ctx) {
        const DPR = Math.min(window.devicePixelRatio || 1, 1.5)
        const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
        let W = 0, H = 0, cx = 0, cy = 0, maxR = 0, scrollY = 0
        const N = window.innerWidth < 720 ? 240 : 520
        const PAL = ['#ffffff', '#ffffff', '#ffffff', '#cdb9ff', '#9fe9ff', '#ff9be8']
        type Star = { r: number; a: number; z: number; size: number; col: string; tw: number; tws: number }
        const stars: Star[] = []
        const nebs = [
          { a: 0.0, r: 0.22, col: 'rgba(150,40,220,0.22)', size: 0.62, sp: 0.05 },
          { a: 2.1, r: 0.36, col: 'rgba(255,40,200,0.15)', size: 0.50, sp: 0.04 },
          { a: 4.2, r: 0.30, col: 'rgba(40,150,255,0.16)', size: 0.56, sp: 0.06 },
        ]
        const resize = () => {
          W = cv.width = Math.floor(window.innerWidth * DPR)
          H = cv.height = Math.floor(window.innerHeight * DPR)
          cv.style.width = window.innerWidth + 'px'; cv.style.height = window.innerHeight + 'px'
          cx = W / 2; cy = H * 0.42; maxR = Math.hypot(W, H) * 0.62
        }
        resize(); onGalaxyResize = resize; window.addEventListener('resize', resize)
        for (let i = 0; i < N; i++) {
          stars.push({
            r: Math.pow(Math.random(), 0.7),
            a: Math.random() * Math.PI * 2,
            z: 0.3 + Math.random() * 0.7,
            size: Math.random() * 1.3 + 0.4,
            col: PAL[(Math.random() * PAL.length) | 0],
            tw: Math.random() * Math.PI * 2,
            tws: 0.5 + Math.random() * 1.6,
          })
        }
        onGalaxyScroll = () => { scrollY = window.scrollY || 0 }
        window.addEventListener('scroll', onGalaxyScroll, { passive: true })
        let t0 = performance.now()
        const frame = (now: number) => {
          galaxyRaf = requestAnimationFrame(frame)
          if (document.hidden) { t0 = now; return }
          const dt = Math.min((now - t0) / 1000, 0.05); t0 = now
          const t = now / 1000
          const par = scrollY * 0.05 * DPR
          ctx.clearRect(0, 0, W, H)
          ctx.globalCompositeOperation = 'lighter'
          for (const n of nebs) {
            if (!reduce) n.a += n.sp * dt
            const R = n.r * maxR, S = n.size * maxR
            const x = cx + Math.cos(n.a) * R, y = cy + Math.sin(n.a) * R * 0.7 + par * 0.4
            const g = ctx.createRadialGradient(x, y, 0, x, y, S)
            g.addColorStop(0, n.col); g.addColorStop(1, 'rgba(0,0,0,0)')
            ctx.fillStyle = g; ctx.fillRect(x - S, y - S, S * 2, S * 2)
          }
          for (const s of stars) {
            const rr = s.r * maxR
            if (!reduce) s.a += (0.015 + (1 - s.r) * 0.05) * dt * s.z
            const x = cx + Math.cos(s.a) * rr
            const y = cy + Math.sin(s.a) * rr * 0.6 + par * s.z
            const tw = 0.55 + 0.45 * Math.sin(t * s.tws + s.tw)
            ctx.globalAlpha = tw * s.z
            ctx.fillStyle = s.col
            ctx.beginPath(); ctx.arc(x, y, s.size * DPR, 0, 6.283); ctx.fill()
          }
          ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'
        }
        galaxyRaf = requestAnimationFrame(frame)
      }
    }

    return () => {
      if (uiRaf) cancelAnimationFrame(uiRaf)
      io.disconnect(); cio.disconnect()
      if (galaxyRaf) cancelAnimationFrame(galaxyRaf)
      if (onGalaxyResize) window.removeEventListener('resize', onGalaxyResize)
      if (onGalaxyScroll) window.removeEventListener('scroll', onGalaxyScroll)
    }
  }, [])

  return (
    <div className="md-landing" style={{ fontFamily: "'Archivo', system-ui, sans-serif" }}>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Archivo:wght@100..900&display=swap" rel="stylesheet" />
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <div className="bg" />
      <canvas id="galaxy" aria-hidden="true" />

      {/* HALO + DIAMANTE (video real que gira al bajar) */}
      <div id="diamondGlow" />
      <video id="gem" aria-hidden="true" src="/diamond-scrub.mp4" muted playsInline preload="auto" />

      <div className="progress" id="progress" />

      {/* NAV */}
      <header className="nav" id="nav">
        <div className="wrap nav-in">
          <div className="brand">
            <img className="wordmark" src="/logo-oficial-mydiamond.png" alt="MY DIAMOND" />
          </div>
          <nav className="nav-actions">
            <a className="btn btn-ghost" href="/login">Iniciar sesión</a>
            <a className="btn btn-primary" href="/register">Empezar gratis</a>
          </nav>
        </div>
      </header>

      <main>
        {/* HERO */}
        <section className="hero">
          <div className="wrap hero-grid">
            <div className="reveal" data-anim="left">
              <span className="badge"><span className="dot" /> Plataforma de negocios digitales</span>
              <h1>Tu negocio vende<br /><span className="g-magenta">mientras tú</span><br /><span className="g-cyan">descansas</span></h1>
              <p className="lead">Bots de WhatsApp con IA, tiendas virtuales, campañas publicitarias y más — todo en una sola plataforma. Automatiza, vende y escala sin límites desde cualquier parte del mundo.</p>
              <div className="hero-cta">
                <a className="btn btn-primary btn-lg" href="/register">Comenzar ahora
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg></a>
                <a className="btn btn-ghost btn-lg" href="/login">Iniciar sesión</a>
              </div>
              <div className="trust"><span>🌎 18 países</span><span>🤖 IA integrada</span><span>💳 Sin tarjeta</span></div>
            </div>

            <div className="reveal" data-anim="right">
              <div className="phone">
                <div className="chat-head">
                  <span className="avatar av-cm">CM</span>
                  <div><div className="name">Carlos M.</div><div className="status">Carlos M. escribiendo…</div></div>
                  <div className="meta-dots"><i /><i /><i /></div>
                </div>
                <div className="chat-body">
                  <span className="day">HOY</span>
                  <div className="msg-row in"><span className="avatar av-cm">CM</span><div className="bubble">Hola! me interesa el plan básico 🙌<span className="t">10:41</span></div></div>
                  <div className="msg-row out"><span className="avatar av-md">MD</span><div className="bubble">Hola Carlos! 👋 El Pack Básico es $49 USD: bot IA de ventas, tienda virtual y landing page.<span className="t">10:41 ✓✓</span></div></div>
                  <div className="msg-row in"><span className="avatar av-cm">CM</span><div className="bubble"><span className="typing"><i /><i /><i /></span></div></div>
                </div>
                <div className="chat-input">
                  <div className="field">Mensaje</div>
                  <span className="send"><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="#06291c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* STATS */}
        <section className="stats">
          <div className="wrap stats-grid" data-stagger>
            <div className="stat reveal" data-anim="scale">
              <div className="ic ic-purple"><svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg></div>
              <div className="num"><span className="count" data-to="5000">0</span>+</div><div className="lbl">Miembros activos</div>
            </div>
            <div className="stat reveal" data-anim="scale">
              <div className="ic ic-green"><svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg></div>
              <div className="num"><span className="count" data-to="2000000">0</span>+</div><div className="lbl">Mensajes enviados</div>
            </div>
            <div className="stat reveal" data-anim="scale">
              <div className="ic ic-purple"><svg width="26" height="26" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" /><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg></div>
              <div className="num"><span className="count" data-to="18">0</span> países</div><div className="lbl">Presencia global</div>
            </div>
            <div className="stat reveal" data-anim="scale">
              <div className="ic ic-cyan"><svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M18 20V10M12 20V4M6 20v-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg></div>
              <div className="num"><span className="count" data-to="3">0</span> plataformas</div><div className="lbl">Publicidad digital</div>
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section className="features">
          <div className="wrap">
            <div className="sec-head reveal">
              <span className="eyebrow">Herramientas que generan resultados</span>
              <h2>Todo lo que necesitas<br /><span className="g-purple">en un solo lugar</span></h2>
            </div>
            <div className="feat-grid" data-stagger>
              {/* 1 Bot */}
              <div className="card reveal" data-anim="scale"><div className="inner">
                <div className="thumb"><span className="badge-sm">24/7</span>
                  <div className="tb-chat">
                    <div className="tb-bub in">¿Tienen envíos a todo el país? 🚚</div>
                    <div className="tb-bub out">¡Sí! Envío gratis desde $50. ¿Te ayudo a comprar ahora? 😊</div>
                    <div className="tb-typing"><i /><i /><i /></div>
                  </div>
                </div>
                <div className="card-h"><span className="ic ic-green sm"><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="3" y="8" width="18" height="12" rx="3" stroke="currentColor" strokeWidth="2" /><path d="M12 8V4M8 2h8M9 14h.01M15 14h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg></span><h3>Bot de Ventas IA</h3></div>
                <p>Responde, asesora y cierra ventas en WhatsApp las 24 horas. Personalizado con tu marca, tono y productos. Nunca pierdas un cliente.</p>
                <a className="card-foot" href="/register">Conocer más <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg></a>
              </div></div>
              {/* 2 Campañas */}
              <div className="card reveal" data-anim="scale"><div className="inner">
                <div className="thumb"><span className="badge-sm">ROAS x4.2</span>
                  <div className="tb-col">
                    <div className="tb-chips">
                      <span className="tb-chip" style={{ background: '#2d6cf6' }}>Meta</span>
                      <span className="tb-chip" style={{ background: '#e84436' }}>Google</span>
                      <span className="tb-chip" style={{ background: '#111', border: '1px solid #2a2a2a' }}>TikTok</span>
                    </div>
                    <div className="tb-bars"><span style={{ height: '42%' }} /><span style={{ height: '66%' }} /><span style={{ height: '54%' }} /><span style={{ height: '88%' }} /><span style={{ height: '72%' }} /><span style={{ height: '100%' }} /></div>
                  </div>
                </div>
                <div className="card-h"><span className="ic ic-purple sm"><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M3 11l16-7v16L3 13v-2zM3 11v2a3 3 0 003 3" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg></span><h3>Campañas con IA</h3></div>
                <p>Crea anuncios en Meta, Google y TikTok en minutos. La IA genera los textos, imágenes y segmentación. Tú solo defines el presupuesto.</p>
                <a className="card-foot" href="/register">Conocer más <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg></a>
              </div></div>
              {/* 3 Tienda */}
              <div className="card reveal" data-anim="scale"><div className="inner">
                <div className="thumb"><span className="badge-sm" style={{ background: 'rgba(34,211,238,.16)', color: '#7eeaf7', borderColor: 'rgba(34,211,238,.35)' }}>0% comisión</span>
                  <div className="tb-store">
                    <div className="tb-prod" />
                    <div className="tb-meta">
                      <div className="tb-line" /><div className="tb-line s" />
                      <div className="tb-price">$49<span style={{ fontSize: '11px', color: '#9aa0b5' }}> USD</span></div>
                      <span className="tb-add">Agregar al carrito</span>
                    </div>
                  </div>
                </div>
                <div className="card-h"><span className="ic ic-purple sm"><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M3 9l1-5h16l1 5M4 9v11h16V9M4 9a2 2 0 004 0 2 2 0 004 0 2 2 0 004 0 2 2 0 004 0" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg></span><h3>Tienda Virtual Propia</h3></div>
                <p>Tu catálogo online con tu branding. Conectada a WhatsApp para cerrar ventas al instante. Sin comisiones, todo tuyo.</p>
                <a className="card-foot" href="/register">Conocer más <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg></a>
              </div></div>
              {/* 4 Referidos */}
              <div className="card reveal" data-anim="scale"><div className="inner">
                <div className="thumb"><span className="badge-sm">+$1,240</span>
                  <svg className="tb-svg" viewBox="0 0 240 110" preserveAspectRatio="xMidYMid meet">
                    <line x1="120" y1="30" x2="50" y2="80" stroke="#a425ff" strokeWidth="2" opacity=".5" />
                    <line x1="120" y1="30" x2="120" y2="80" stroke="#a425ff" strokeWidth="2" opacity=".5" />
                    <line x1="120" y1="30" x2="190" y2="80" stroke="#a425ff" strokeWidth="2" opacity=".5" />
                    <circle cx="120" cy="30" r="15" fill="#a425ff" /><text x="120" y="35" textAnchor="middle" fontSize="13" fill="#fff" fontFamily="Archivo" fontWeight="700">Tú</text>
                    <circle cx="50" cy="82" r="12" fill="#1e1233" stroke="#c026d3" strokeWidth="2" />
                    <circle cx="120" cy="82" r="12" fill="#1e1233" stroke="#c026d3" strokeWidth="2" />
                    <circle cx="190" cy="82" r="12" fill="#1e1233" stroke="#c026d3" strokeWidth="2" />
                  </svg>
                </div>
                <div className="card-h"><span className="ic ic-green sm"><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 2l9 5-9 5-9-5 9-5zM3 12l9 5 9-5M3 17l9 5 9-5" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg></span><h3>Sistema de Referidos</h3></div>
                <p>Haz crecer tu red y gana comisiones automáticas. Panel transparente, retiros puntuales y seguimiento de tu equipo en tiempo real.</p>
                <a className="card-foot" href="/register">Conocer más <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg></a>
              </div></div>
              {/* 5 Academia */}
              <div className="card reveal" data-anim="scale"><div className="inner">
                <div className="thumb">
                  <div className="tb-les">
                    <div className="tb-row"><span className="tb-play"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg></span><div className="tb-line" style={{ flex: 1 }} /></div>
                    <div className="tb-row"><span className="tb-play"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg></span><div className="tb-line s" style={{ flex: 1 }} /></div>
                    <div className="tb-row"><span className="tb-prog"><i /></span><span style={{ fontSize: '11px', fontWeight: 700, color: '#c79bff', fontFamily: "'Archivo'" }}>62%</span></div>
                  </div>
                </div>
                <div className="card-h"><span className="ic ic-purple sm"><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M22 10L12 5 2 10l10 5 10-5zM6 12v5c0 1 2.7 3 6 3s6-2 6-3v-5" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg></span><h3>Academia de Negocios</h3></div>
                <p>Formación paso a paso para vender más: marketing, ventas y automatización. Aprende mientras tu negocio crece contigo.</p>
                <a className="card-foot" href="/register">Conocer más <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg></a>
              </div></div>
              {/* 6 Analítica */}
              <div className="card reveal" data-anim="scale"><div className="inner">
                <div className="thumb"><span className="badge-sm">+38% ventas</span>
                  <svg className="tb-svg" viewBox="0 0 240 110" preserveAspectRatio="none">
                    <defs><linearGradient id="ar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#22d3ee" stopOpacity=".55" /><stop offset="1" stopColor="#22d3ee" stopOpacity="0" /></linearGradient></defs>
                    <path d="M8 86 L48 70 L88 76 L128 48 L168 54 L208 22 L232 30 L232 104 L8 104 Z" fill="url(#ar)" />
                    <path d="M8 86 L48 70 L88 76 L128 48 L168 54 L208 22 L232 30" fill="none" stroke="#22d3ee" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div className="card-h"><span className="ic ic-cyan sm"><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M3 17l6-6 4 4 7-7M14 7h6v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg></span><h3>Analítica en Tiempo Real</h3></div>
                <p>Mide ventas, leads y campañas en un panel claro. Toma decisiones con datos reales, no con suposiciones.</p>
                <a className="card-foot" href="/register">Conocer más <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg></a>
              </div></div>
            </div>
          </div>
        </section>

        {/* TESTIMONIOS */}
        <section className="testi">
          <div className="wrap">
            <div className="sec-head reveal">
              <span className="eyebrow" style={{ color: 'var(--green)' }}>Lo que dicen nuestros miembros</span>
              <h2>Resultados reales de <span className="g-green">personas reales</span></h2>
            </div>
          </div>
          <div className="marquee-mask">
            <div className="marquee" id="row1">
              {[...ROW1, ...ROW1].map((t, i) => <TCard key={`r1-${i}`} t={t} />)}
            </div>
            <div className="marquee rev" id="row2">
              {[...ROW2, ...ROW2].map((t, i) => <TCard key={`r2-${i}`} t={t} />)}
            </div>
          </div>
        </section>

        {/* CTA FINAL */}
        <section className="cta">
          <div className="wrap reveal" data-anim="scale">
            <div className="ic-zap"><svg width="34" height="34" viewBox="0 0 24 24" fill="none"><path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" fill="#fff" /></svg></div>
            <h2>Tu momento es <span className="g-magenta">ahora</span></h2>
            <p>Miles de emprendedores en Latinoamérica ya automatizaron sus negocios con MY DIAMOND. Únete hoy y empieza a generar ingresos desde el primer día.</p>
            <a className="btn btn-primary btn-lg" href="/register">Unirme a MY DIAMOND
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg></a>
            <div className="fine">Sin tarjeta de crédito · Acceso inmediato · Cancela cuando quieras</div>
          </div>
        </section>
      </main>

      <footer>
        <div className="wrap foot-in">
          <div className="brand"><img className="wordmark" src="/logo-oficial-mydiamond.png" alt="MY DIAMOND" /></div>
          <div className="copy">© 2026 MY DIAMOND · Todos los derechos reservados</div>
          <div className="foot-links"><a href="/login">Iniciar sesión</a><a href="/register">Registrarse</a></div>
        </div>
      </footer>
    </div>
  )
}
