# JD Internacional — Documentación Completa

## Stack Técnico

| Capa | Tecnología |
|------|-----------|
| Frontend/Backend | Next.js 14 App Router + TypeScript |
| Base de datos | PostgreSQL (Supabase) + Prisma ORM |
| Autenticación | JWT en cookies HttpOnly (7 días) |
| Email | Nodemailer + Gmail |
| WhatsApp | YCloud API + Baileys (no oficial) + Meta API |
| IA | OpenAI (fetch nativo, sin SDK) |
| Deploy | Render.com |
| Seguridad | Cloudflare Turnstile + Rate Limiting + Bot Detection |
| Tema UI | Dark neon (cyan #00F5FF, green #00FF88, purple #9B00FF) |

---

## 1. Flujo de Registro

```
Usuario llega a /register
    │
    ├── Rellena formulario:
    │   - Código de referido (obligatorio, puede venir en URL ?ref=CODIGO)
    │   - Username único
    │   - Nombre completo
    │   - País + Ciudad (20 países LATAM)
    │   - Cédula/Pasaporte
    │   - Fecha de nacimiento (mínimo 18 años)
    │   - Email único
    │   - Contraseña (8+ chars, 1 mayúscula, 1 número)
    │   - Confirmar contraseña
    │   - Aceptar términos
    │   - Turnstile CAPTCHA (anti-bot)
    │
    ├── POST /api/auth/register
    │   - Valida código de referido → busca sponsor en DB
    │   - Verifica edad >= 18
    │   - Verifica username/email únicos
    │   - Hashea contraseña (bcryptjs, 12 rounds)
    │   - Genera código de referido único (8 chars, sin I/O/1)
    │   - Crea User en DB con sponsorId = usuario que refirió
    │
    └── Pantalla de éxito:
        - Muestra username, contraseña, código de referido propio
        - Botón → /dashboard o → /marketplace
```

---

## 2. Flujo de Login

```
Usuario llega a /login
    │
    ├── Rellena: username/email + contraseña + Turnstile
    │
    ├── POST /api/auth/login
    │   - Rate limit: 10 intentos / 10s por IP
    │   - Verifica credenciales (tiempo constante para no revelar si existe)
    │   - Captura IP, User-Agent, geolocalización por IP
    │
    ├── ¿Dispositivo conocido? (cookie device_id)
    │   │
    │   ├── SÍ → genera JWT (auth_token, 7 días) → /dashboard
    │   │       (actualiza lastSeen, IP, localización del dispositivo)
    │   │
    │   └── NO → genera código 6 dígitos (crypto.randomInt)
    │           → envía por email
    │           → setea cookie device_pending (10 min)
    │           → redirige a /verify-device
    │
    └── Admin → salta verificación de dispositivo
```

---

## 3. Verificación de Dispositivo (2FA)

```
/verify-device
    │
    ├── Input: 6 dígitos (auto-focus, soporte paste, Turnstile)
    │
    ├── POST /api/auth/verify-device
    │   - Lee device_pending cookie
    │   - Verifica código en DB (máx 15 min)
    │   - Marca código como usado
    │   - Transacción atómica: deleteMany + create TrustedDevice
    │     (guarda: deviceId, IP, ciudad, país, lat/lng, browser, OS)
    │   - Genera auth_token JWT (7 días)
    │   - Setea device_id cookie (1 año)
    │
    └── → /dashboard
```

---

## 4. Restablecimiento de Contraseña

```
/forgot-password
    │
    ├── Input: email
    ├── POST /api/auth/forgot-password
    │   - Genera token único
    │   - Guarda en PasswordResetToken (expiresAt: 1h)
    │   - Envía email con link /reset-password?token=XXX
    │
/reset-password?token=XXX
    │
    ├── Input: nueva contraseña + confirmación
    ├── POST /api/auth/reset-password
    │   - Verifica token válido y no expirado
    │   - Hashea nueva contraseña
    │   - Marca token como usado
    └── → /login
```

---

## 5. Dashboard Principal

```
/dashboard (requiere auth_token)
    │
    ├── GET /api/network → DashboardData {
    │   user: { id, username, email, plan, planExpiresAt, avatarUrl, referralCode }
    │   stats: {
    │     totalCommissions, todayEarnings, yesterdayEarnings, weekEarnings
    │     directReferrals, totalNetwork, totalActive
    │     byType: { DIRECT, SPONSORSHIP, EXTRA }
    │   }
    │   referrals: [{ username, plan, joinedAt }]
    │   period: 'all' | '30d' | '7d'
    │  }
    │
    ├── Vista Mobile:
    │   - Carrusel de imágenes (estrategia Meta)
    │   - Avatar con upload
    │   - Plan + botón comprar/renovar
    │   - Cards de comisiones (total, hoy, ayer, semana)
    │   - Distribución por tipo (Patrocinio/Directo/Extra)
    │   - Red: tamaño total, directos (nivel 1)
    │
    └── Vista Desktop:
        - Banner + perfil superpuesto
        - Toggle período: Todo / 30 días / 7 días
        - Countdown si el plan expira pronto
        - Grid métricas + Red de referidos
        - Botón logout + Configuración + Notificaciones
```

---

## 6. Sistema de Comisiones (MLM)

```
Estructura de árbol:
MASTER1 (raíz)
    └── Sponsor A
            ├── Usuario B (tu referido directo)
            │       └── Usuario C (nivel 2)
            └── Usuario D (nivel 2)

Tipos de comisión:
- DIRECT: Ganas cuando alguien debajo tuyo activa/renueva un plan
- SPONSORSHIP: Ganas de la actividad de tus referidos directos
- EXTRA: Bonos por hitos o incentivos especiales

Flujo de pago:
Usuario quiere plan → /dashboard/planes
    │
    ├── Selecciona plan (BASIC / PRO / ELITE)
    ├── Sube comprobante de pago (USDT o transferencia)
    ├── POST /api/payments (PackPurchaseRequest)
    │   - status: PENDING
    │
    └── Admin aprueba en /admin/purchases
        - Cambia status → APPROVED
        - Activa plan del usuario (planExpiresAt +30 días)
        - Calcula y crea comisiones para upline
```

---

## 7. Servicio: Bots de WhatsApp

```
/dashboard/services/whatsapp
    │
    ├── GET /api/bots → lista de bots del usuario
    │
    ├── Crear bot:
    │   POST /api/bots
    │   - Tipo: YCLOUD / BAILEYS / META
    │   - Nombre, prompt del sistema, límites de caracteres
    │   - Token de webhook auto-generado (UUID)
    │
    ├── Configurar bot (tabs):
    │   ├── Webhook: URL para conectar con YCloud/Meta
    │   ├── Credentials: API keys (encriptadas AES-256-GCM)
    │   ├── Prompt: Instrucciones del bot de IA
    │   ├── Productos: Asignar productos al bot
    │   ├── QR: Para conectar Baileys (WhatsApp no oficial)
    │   ├── Follow-up: Delays para mensajes de seguimiento
    │   └── Chats: Historial de conversaciones
    │
    └── Flujo de mensaje entrante:
        POST /api/webhooks/ycloud/whatsapp/[botId]?token=TOKEN
            │
            ├── Valida token de webhook
            ├── Busca/crea Conversation
            ├── Guarda Message (role: user)
            ├── Bot Engine:
            │   - Analiza intención del mensaje
            │   - Consulta productos asignados
            │   - Llama a OpenAI con system prompt + historial
            │   - Genera respuesta
            ├── Guarda Message (role: assistant)
            ├── YCloud API → envía respuesta al usuario de WhatsApp
            └── Follow-up scheduling si aplica
```

---

## 8. Servicio: Publicidad con IA (Ads)

```
/dashboard/services/ads
    │
    ├── Integraciones: Meta / Google Ads / TikTok
    │   POST /api/ads/integrations/[platform]/connect/start → OAuth
    │
    ├── Brief IA:
    │   POST /api/ads/brief/generate
    │   - Input: descripción del negocio, objetivo
    │   - OpenAI genera: copies, audiencia target, presupuesto sugerido
    │
    ├── Estrategia → Campaña:
    │   POST /api/ads/campaign
    │   - plataforma, presupuesto, fechas, audiencia
    │   - Genera creativos (imagen/video) con IA
    │
    ├── Publicar:
    │   POST /api/ads/campaign/[id]/publish
    │   - Envía a la API de la plataforma (Meta/Google/TikTok)
    │   - Crea AdJob para tracking asíncrono
    │
    └── Métricas:
        GET /api/ads/metrics → impresiones, clicks, conversiones, gasto
```

---

## 9. Servicio: Landing Pages con IA

```
/dashboard/services/landing-pages
    │
    ├── GET /api/landing-pages → lista del usuario
    │
    ├── Crear:
    │   POST /api/landing-pages
    │   - Nombre, descripción del producto/servicio
    │   - IA genera secciones, copies, CTA
    │
    ├── Editar:
    │   PATCH /api/landing-pages/[id]
    │   - Editor visual de secciones
    │
    └── Publicar:
        - URL pública generada automáticamente
        - slug único por landing
```

---

## 10. Servicio: Clipping (Monetizar Vistas)

```
/dashboard/services/clipping
    │
    ├── Campañas disponibles (creadas por admin):
    │   - Plataforma: YouTube / TikTok / Facebook
    │   - CPM: pago por cada 1,000 vistas
    │   - Vistas mínimas para cobrar
    │   - Período de hold (horas antes de aprobar)
    │
    ├── Usuario conecta cuenta:
    │   POST /api/clipping/accounts
    │   - OAuth con la plataforma
    │   - Tokens encriptados en DB
    │
    ├── Subir video:
    │   POST /api/clipping/submissions
    │   - videoUrl, campaignId
    │   - Status inicial: HOLD
    │
    ├── Sistema de snapshots:
    │   - Cada N horas: GET vistas actuales del video
    │   - Guarda ClippingSnapshot
    │   - Calcula earnings = (vistas / 1000) * CPM
    │
    └── Admin aprueba → earnings disponibles para retiro
```

---

## 11. Servicio: Marketplace de Cursos

```
/dashboard/services/marketplace
    │
    ├── Como vendedor:
    │   POST /api/marketplace/courses
    │   - Título, descripción, precio, imagen de portada
    │   - QR de pago, categoría
    │   - Status: PENDING → admin aprueba → APPROVED
    │
    ├── Como comprador:
    │   POST /api/marketplace/purchases
    │   - Sube comprobante de pago
    │   - Status: PENDING → vendedor/admin aprueba
    │
    └── Admin:
        /admin/marketplace → aprobar/rechazar cursos y compras
```

---

## 12. Servicio: Tienda Virtual

```
/dashboard/services/virtual-store
    │
    ├── Crear tienda:
    │   POST /api/stores
    │   - Nombre, slug único, tipo (CATALOG/LANDING/NETWORK_MARKETING)
    │   - Configuración de tema
    │   - Vincular a bot de WhatsApp
    │
    ├── Agregar productos:
    │   POST /api/stores/[storeId]/products
    │   - Nombre, precio, stock, variantes
    │
    └── Órdenes:
        GET /api/store/orders → pedidos recibidos vía WhatsApp
        PATCH /api/store/orders/[orderId] → marcar como procesado
```

---

## 13. Servicio: Social Publisher

```
/dashboard/services/social
    │
    ├── Conectar redes:
    │   - Facebook, Instagram, TikTok, YouTube
    │   - OAuth por plataforma
    │
    ├── Crear post:
    │   POST /api/social/posts
    │   - Contenido + imagen/video
    │   - Seleccionar redes a publicar
    │   - Publicar ahora o programar (scheduledAt)
    │
    └── Límites por plan:
        - BASIC: 15 posts/mes
        - PRO: 30 posts/mes
        - ELITE: 50 posts/mes
```

---

## 14. Retiros (Comisiones → Wallet)

```
/dashboard/commissions o /dashboard/profile
    │
    ├── Usuario solicita retiro:
    │   POST /api/withdrawals
    │   - amount, walletAddress (USDT BEP-20)
    │   - Status: PENDING
    │
    └── Admin procesa en /admin/withdrawals:
        - Revisa monto disponible vs solicitado
        - Realiza transferencia USDT
        - Actualiza: status=PAID, paidAt, txHash
```

---

## 15. Panel de Admin

```
/admin/verify → Login admin (requiere auth_token + OTP por email)
    │
    ├── POST /api/admin/auth/request-code
    │   - Genera código 6 dígitos (crypto.randomInt)
    │   - Guarda en AdminOtpCode (15 min)
    │   - Envía email con tema rojo
    │
    ├── POST /api/admin/auth/verify-code
    │   - Valida código + Turnstile
    │   - Setea admin_session JWT (4h)
    │
    └── Middleware protege /admin/* con ambas cookies

/admin (dashboard)
    ├── Métricas globales: usuarios, activos, ingresos, pendientes
    ├── Solicitudes recientes: compras + retiros pendientes
    │
    ├── /admin/users → gestión de usuarios
    │   - Lista con dispositivos confiables
    │   - IP, browser, OS, GPS address
    │   - Mapa de ubicación (Google Maps)
    │   - Auto-refresh cada 30s
    │
    ├── /admin/purchases → aprobar/rechazar planes
    ├── /admin/withdrawals → procesar retiros
    ├── /admin/bonuses → ajustar comisiones manualmente
    ├── /admin/marketplace → aprobar cursos y compras
    ├── /admin/clipping → gestionar campañas y pagos
    ├── /admin/store → productos de la tienda física
    └── /admin/settings → configuración global de la app
```

---

## 16. Seguridad (Capas)

```
Capa 1 — Cloudflare Turnstile
    Protege: /login, /register, /verify-device, /admin/verify
    Cómo: Token invisible generado por Cloudflare, validado en backend
    Bloquea: Bots automatizados sin comportamiento humano

Capa 2 — Rate Limiting (Middleware)
    Protege: Todas las rutas /api/* autenticadas
    Límite: 10 requests / 10 segundos por usuario
    Respuesta: 429 + Retry-After: 10

Capa 3 — Bot Detection (Middleware)
    Detecta: curl, wget, python-requests, selenium, puppeteer, scrapy, etc.
    Respuesta: 403 Acceso denegado

Capa 4 — Autenticación JWT
    auth_token: HttpOnly, 7 días, todas las rutas /dashboard y /api
    admin_session: HttpOnly, 4 horas, solo rutas /admin
    device_id: 1 año, identifica dispositivos conocidos

Capa 5 — Verificación de Dispositivo (2FA)
    Aplica: Cada nuevo dispositivo que hace login
    Mecanismo: Código 6 dígitos por email, expira en 15 min
    Guarda: IP, browser, OS, geolocalización del dispositivo

Capa 6 — Admin OTP
    Aplica: Acceso al panel /admin
    Mecanismo: Código 6 dígitos al email del admin, expira en 15 min
    Sesión: JWT separado (admin_session) de 4 horas

Capa 7 — Security Headers
    X-Frame-Options: DENY (no iframes)
    X-Content-Type-Options: nosniff
    X-Robots-Tag: noindex en /dashboard, /admin, /api
    Content-Security-Policy: solo recursos propios + Cloudflare
    poweredByHeader: false (oculta que es Next.js)
```

---

## 17. Modelos de Base de Datos

```
User
  id, username*, email*, passwordHash
  referralCode*, sponsorId (→ User)
  plan (NONE/BASIC/PRO/ELITE), planExpiresAt
  isAdmin, isActive, avatarUrl
  createdAt, updatedAt

Commission
  id, userId (→ User), fromUserId (→ User)
  type (DIRECT/SPONSORSHIP/EXTRA)
  amount, createdAt

TrustedDevice
  id, userId (→ User), deviceId*
  ip, city, country, lat, lng, address
  browser, os, lastSeen

AdminOtpCode / DeviceVerifyCode
  id, userId, code, expiresAt, used

Bot
  id, userId, name, type (YCLOUD/BAILEYS/META)
  status (ACTIVE/PAUSED), webhookToken*
  systemPrompt, maxChars, aiModel
  followUpDelays

Product
  id, userId, name, category
  pricing (unit/promo2/super6)
  benefits, usage, warnings, tags
  images[], videos[]

PackPurchaseRequest
  id, userId, plan, price
  paymentProof, status (PENDING/APPROVED/REJECTED)
  txHash (crypto)

WithdrawalRequest
  id, userId, amount, walletAddress
  status (PENDING/PAID/REJECTED), paidAt, txHash

ClippingCampaign / ClippingSubmission / ClippingSnapshot
MarketplaceCourse / MarketplacePurchase
AdIntegration / AdDraft / AdCampaignV2 / AdCreative
Store / StoreProduct / StoreOrder
SocialConnection / SocialPost
Notification / PushSubscription
```

---

## 18. Variables de Entorno Requeridas

```env
# Base de datos
DATABASE_URL=postgresql://...

# Auth
JWT_SECRET=...

# Email (Gmail)
GMAIL_USER=...
GMAIL_PASS=...

# Cloudflare Turnstile
NEXT_PUBLIC_TURNSTILE_SITE_KEY=0x...
TURNSTILE_SECRET_KEY=0x...

# Encriptación (bots API keys)
ENCRYPTION_KEY=... (32 bytes hex para AES-256-GCM)

# OpenAI
OPENAI_API_KEY=...

# YCloud (WhatsApp)
YCLOUD_API_KEY=...
```
