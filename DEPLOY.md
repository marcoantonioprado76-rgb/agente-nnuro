# Guia de Despliegue - Ventas AI

## IMPORTANTE: WhatsApp necesita servidor persistente

WhatsApp (Baileys) usa WebSockets que deben estar abiertos 24/7.
**Vercel NO funciona** para WhatsApp (mata los procesos despues de cada request).

Opciones que SI funcionan:
- **Railway** (recomendado, facil, $5/mes)
- **Render** (tier gratuito disponible)
- **VPS** (Hostinger, DigitalOcean, etc.)
- **Fly.io**

---

## 1. Variables de Entorno

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
OPENAI_API_KEY=sk-...
NEXT_PUBLIC_APP_URL=https://tu-dominio.com
```

---

## 2. Despliegue en Railway (Recomendado)

### Paso 1: Crear cuenta y proyecto
1. Ir a https://railway.app y crear cuenta (con GitHub)
2. Click **"New Project"** > **"Deploy from GitHub repo"**
3. Seleccionar el repositorio de Ventas AI

### Paso 2: Configurar variables de entorno
1. En el dashboard de Railway, click en tu servicio
2. Ir a la tab **"Variables"**
3. Agregar TODAS las variables de entorno listadas arriba
4. Railway detectara automaticamente el `railway.toml` y usara Docker

### Paso 3: Agregar volumen persistente (IMPORTANTE)
1. En Railway, click **"+ New"** > **"Volume"**
2. Mount path: `/data`
3. Esto mantiene las sesiones de WhatsApp entre deploys
4. Agregar variable: `WHATSAPP_SESSIONS_DIR=/data/whatsapp-sessions`

### Paso 4: Deploy
Railway hace deploy automatico al hacer push a GitHub.
El servidor se inicia con `node server.mjs` (configurado en railway.toml).

### Paso 5: Dominio
1. En Railway, ir a **Settings** > **Networking** > **Generate Domain**
2. O configurar un dominio propio

### Verificar
- Tu app estara en `https://tu-app.up.railway.app`
- WhatsApp mantendra las conexiones abiertas 24/7
- Si el servidor se reinicia, las sesiones se restauran automaticamente del volumen

---

## 3. Despliegue en VPS (Hostinger/DigitalOcean)

### Instalar en el servidor

```bash
# Clonar repo
git clone <tu-repo> /var/www/ventas-ai
cd /var/www/ventas-ai

# Instalar dependencias
npm install

# Configurar variables
cp .env.example .env.local
nano .env.local  # Configurar valores reales

# Build
npm run build

# Ejecutar con PM2 (mantiene el proceso vivo 24/7)
npm install -g pm2
pm2 start server.mjs --name "ventas-ai"
pm2 save
pm2 startup
```

### Nginx reverse proxy

```nginx
server {
    listen 80;
    server_name tu-dominio.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### SSL

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d tu-dominio.com
```

---

## 4. Despliegue en Render

1. Ir a https://render.com
2. New > Web Service > Connect GitHub repo
3. Environment: Docker
4. Agregar variables de entorno
5. Agregar disco persistente: mount path `/data`
6. Agregar variable: `WHATSAPP_SESSIONS_DIR=/data/whatsapp-sessions`

---

## 5. Desarrollo Local

```bash
npm install
npm run dev
# Abrir http://localhost:3000
```

En desarrollo local, `npm run dev` funciona perfectamente porque el proceso
de Node.js no se mata entre requests.

---

## 6. Probar produccion localmente

```bash
npm run build
npm run start:server
# Abrir http://localhost:3000
```

---

## Arquitectura WhatsApp

```
Cliente WhatsApp <--WebSocket--> Baileys (en Node.js server)
                                    |
                                    +--> Supabase (DB)
                                    +--> OpenAI (AI responses)
                                    |
Dashboard (Next.js) <--HTTP API--+
```

El servidor mantiene:
- WebSocket abierto con WhatsApp 24/7
- Health check cada 30 segundos (detecta y reconecta si se cae)
- Auto-restauracion de sesiones al reiniciar
- Sesiones persistidas en volumen (sobreviven redeploys)
