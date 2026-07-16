# Sistema de diseño — Agente NÜRO

Referencia única para aplicar el mismo estilo en TODA la app. Todos los valores
salen del código real de la Home (`src/app/dashboard/page.tsx` +
`src/app/dashboard/dashboard.css` + `src/components/Navbar.tsx`).

Concepto: **navy oscuro + acento teal (turquesa) + tarjetas blancas con sombra
marcada + botones 3D glossy + ondas concéntricas teal**.

---

## 1. Colores

### Navy / fondos oscuros
| Uso | Valor |
|-----|-------|
| Sidebar (sólido) | `#212e38` |
| Tarjeta oscura (gradiente) | `linear-gradient(135deg, #273842 0%, #1a262f 100%)` |
| Icono cuadrado de servicio (tile) | `linear-gradient(145deg, #52707e, #3a5462)` |
| Icono cuadrado en tarjeta (estadística) | `linear-gradient(135deg, #2a3b45, #1a2730)` |
| Sombra del logo | `#222831` / `rgba(20,24,31,·)` |

### Fondo del contenido (claro)
`linear-gradient(135deg, #DDE4EC 0%, #E6ECF3 45%, #D6DEE9 100%)`
+ glows sutiles: `radial-gradient(... rgba(0,229,208,0.06) ...)` teal y `rgba(35,59,143,0.06)` azul.

### Teal (acento) — la familia
| Token / uso | Valor |
|-------------|-------|
| Acento base (`--clr-accent`) | `#00E5D0` |
| Acento claro (`--clr-accent-lt`) | `#4dfae8` |
| Teal medio (barra selector, iconos) | `#16b5c0` |
| Círculo de icono teal (gradiente) | `linear-gradient(135deg, #1fb8bb, #147e95)` |
| Botón teal (gradiente base) | `linear-gradient(180deg, #3ddad2 0%, #17a0aa 58%, #0d7688 100%)` |
| Texto teal sobre fondo CLARO (enlaces) | `#0a95a8` |
| Icono teal sobre fondo OSCURO | `#35d0c8` |
| Ondas (líneas) | `rgba(0,229,208, 0.05–0.10)` |
| Borde teal de tarjeta oscura | `rgba(0,181,192,0.20–0.22)` |

### Texto y neutros
| Uso | Valor |
|-----|-------|
| Texto principal sobre claro | `#111827` |
| Texto secundario / muted | `#6B7280` |
| Texto tenue / labels | `#9CA3AF` |
| Texto sobre oscuro | `#fff` / `rgba(255,255,255,0.6)` |
| Borde de tarjeta clara | `#D7DEE8` |
| Riel de barra de progreso | `#EAEEF3` |

---

## 2. Sombras

```css
/* Tarjeta blanca — sombra en capas (resalta sobre fondo claro) */
box-shadow:
    0 1px 2px  rgba(15,23,42,0.06),
    0 6px 14px rgba(15,23,42,0.10),
    0 20px 40px rgba(15,23,42,0.16);

/* Tarjeta blanca :hover */
box-shadow:
    0 2px 4px  rgba(15,23,42,0.08),
    0 10px 20px rgba(15,23,42,0.12),
    0 28px 52px rgba(15,23,42,0.20);
transform: translateY(-2px);

/* Botón 3D glossy (ver §4) */
box-shadow:
    0 10px 22px rgba(0,0,0,0.32),
    0 2px 5px   rgba(0,0,0,0.22),
    inset 0 1px 1px rgba(255,255,255,0.75),
    inset 0 -5px 10px rgba(0,0,0,0.26);

/* Tarjeta oscura */
box-shadow: 0 18px 42px rgba(0,0,0,0.30);

/* Círculo de icono teal */
box-shadow: 0 8px 20px rgba(0,181,192,0.35);
```

---

## 3. Radios y espaciado
| Elemento | Radio |
|----------|-------|
| Tarjetas | `22–24px` |
| Botones | `14–16px` |
| Icono cuadrado | `14px` |
| Icono circular | `50%` |
| Pills / chips | `999px` |

Padding tarjetas: `20–26px`. Gap entre bloques: `18–24px`.

---

## 4. Componentes (clases y patrones)

### Tarjeta blanca → clase `.dm-card` (+ `.dm-card--hover` si es clicable)
Blanca `#FFFFFF`, borde `#D7DEE8`, radio 22px, sombra en capas (§2).

### Botón principal → clase `.dm-btn`
2 capas: **sheen glossy arriba** + **base teal**:
```css
background:
    linear-gradient(180deg, rgba(255,255,255,0.42) 0%, rgba(255,255,255,0.06) 44%, rgba(255,255,255,0) 55%),
    linear-gradient(180deg, #3ddad2 0%, #17a0aa 58%, #0d7688 100%);
color:#fff; border:none; border-radius:16px; padding:13px 24px;
/* sombra 3D en §2 */
```
`:hover` sube 1px + sombra más fuerte. `:active` baja 1px + sombra interna (se hunde).

### Tarjeta oscura (CTA / feature)
```css
background: linear-gradient(135deg,#273842 0%,#1a262f 100%);
border: 1px solid rgba(0,181,192,0.20);
border-radius: 24px;  color:#fff;
```
Título `#fff`, texto `rgba(255,255,255,0.6)`. Icono en círculo teal (abajo).

### Círculo de icono teal (corona, destacados)
```css
width:48px; height:48px; border-radius:50%;
background: linear-gradient(135deg,#1fb8bb,#147e95); color:#fff;
box-shadow: 0 8px 20px rgba(0,181,192,0.35);
```

### Icono cuadrado (servicios / tarjetas)
```css
width:48px; height:48px; border-radius:14px;
background: linear-gradient(135deg,#2a3b45,#1a2730); color:#fff;  /* glifo blanco */
```

### Enlace de acción ("Ver X →")
Texto `#0a95a8`, `font-weight:700`, flecha `fa-arrow-right` pequeña.

### Barra de progreso
Riel `#EAEEF3` (h 6–8px, radio 999). Relleno `linear-gradient(90deg,#1fb8bb,#147e95)`.

---

## 5. Ondas concéntricas (decoración teal)
Patrón reutilizable — se pone como **primera capa** del `background`, antes del color:
```css
background:
    repeating-radial-gradient(circle at <X>% <Y>%,
        transparent 0 <R>px, rgba(0,229,208,0.06) <R>px <R+1>px),
    <fondo base>;
```
- `<X>% <Y>%` = origen (esquina o lado). Ej: `90% 12%`, `62% 40%`, `97% 50%`.
- `<R>` = separación entre anillos (17–21px tarjetas; 12–13px selector).
- Opacidad `0.05–0.10`. **Nunca sobre el texto** → origen en un lado libre.

---

## 6. Selector del menú (ítem activo) — `.nav-item--active`
- Fondo: ondas teal (§5) + `linear-gradient(90deg, rgba(22,181,192,0.20) → 0.02)`.
- Borde: `inset 0 0 0 1px rgba(22,181,192,0.50)` + sombra `0 4px 16px rgba(0,0,0,0.22)`.
- Barra de acento izquierda (`::before`): 4px, `#16b5c0`, con glow.
- **Onda viva (ripple)** al seleccionar (`::after`): anillo teal que se expande una vez
  y se detiene (`@keyframes navRipple`, `overflow:hidden` para recortar).
- `overflow:hidden`; icono y texto con `z-index:1` (siempre por encima de la onda).

---

## 7. Checklist para estilizar CUALQUIER página nueva
1. Fondo del contenedor = gradiente claro (§1) **o** transparente si va sobre `dashboard-root`.
2. Bloques de contenido → `.dm-card` (blanca + sombra en capas).
3. CTAs / destacados → tarjeta oscura (§4) con borde teal + (opcional) ondas.
4. Botones → `.dm-btn` (teal 3D). Botón secundario → ghost con borde `#D7DEE8`.
5. Iconos → círculo teal (destacado) o cuadrado navy (neutro); glifo blanco.
6. Acentos, enlaces, métricas, activos → teal (`#0a95a8` sobre claro, `#35d0c8`/`#00E5D0` sobre oscuro).
7. Nada de rosa/magenta/verde/dorado heredado de Diamond → reemplazar por navy+teal.
8. Texto: `#111827` sobre claro, blanco/`rgba(255,255,255,·)` sobre oscuro; muted `#6B7280`.

> Nota: el rosa `#FF2D95/#B735B8/#D203DD` y el verde/dorado de Diamond siguen
> presentes en muchas vistas internas (admin, cursos, CRM, etc.). Reemplazarlos
> por esta paleta es el trabajo pendiente para unificar toda la app.
