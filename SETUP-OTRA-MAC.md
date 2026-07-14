# Trabajar en my-dymond desde otra Mac

Guía para clonar el proyecto, editar/probar local y **publicar mejoras a producción** (AWS) desde otra computadora.

Producción: `https://mydiamondapp.com` — servidor **AWS EC2** (Next.js + bot WhatsApp), base **RDS PostgreSQL**, archivos en **S3**. La rama **`main`** es producción.

---

## 1. Instalar lo básico (una vez)
- **Node.js 20 LTS** → https://nodejs.org (bajá la versión 20).
- **Git** → viene con Xcode Command Line Tools: en Terminal corré `xcode-select --install`.
- (Opcional) **VS Code** para editar.

## 2. Clonar el repo
```bash
cd ~/Desktop
git clone https://github.com/nuroagency1m-eng/proyectomydiamondapp.git
cd proyectomydiamondapp
npm install
```
> La primera vez, git te va a pedir usuario/contraseña de GitHub. Usá tu usuario y, como contraseña, un **token** de GitHub (Settings → Developer settings → Personal access tokens). macOS lo guarda en el Llavero y no lo vuelve a pedir.

## 3. Copiar los 2 archivos secretos (NO están en git)
Desde la **Mac original**, copiá la carpeta `deploy/.secrets/` completa a la misma ruta en la Mac nueva. Contiene:
- `mydymond-key.pem` → llave SSH del servidor (para desplegar).
- `prod.env` / `prod.env.base` → variables con los secretos.
- `eip`, `database-url`, etc. → datos del servidor.

Forma simple: comprimí `deploy/.secrets/` en la Mac original, pasala por AirDrop/USB, y descomprimila en `proyectomydiamondapp/deploy/.secrets/` en la nueva.
Después, en la Mac nueva:
```bash
chmod 600 deploy/.secrets/mydymond-key.pem
```

> ⚠️ Nunca subas `deploy/.secrets/` a git (ya está ignorado). Son las llaves del reino.

## 4. Probar local (antes de publicar)
Para desarrollo local necesitás un `.env` en la raíz. Lo más simple: copiá el de producción como base:
```bash
cp deploy/.secrets/prod.env .env
npm run dev
```
Abrí http://localhost:3000

> Ojo: ese `.env` apunta a la **base y archivos de PRODUCCIÓN**. Para pruebas de verdad conviene una base aparte; si vas a experimentar con datos, avisá y te armo un entorno de staging. Para cambios de UI/código sin tocar datos, alcanza.

## 5. Publicar una mejora a producción
El flujo es: editás → commit → push a `main` → deploy.
```bash
git add -A
git commit -m "descripción del cambio"
git push origin main

# publicar al servidor AWS (build + restart, ~3-5 min):
bash deploy/deploy.sh
```
`deploy.sh` entra al servidor, baja `main`, reinstala deps, buildea y reinicia. Al final te dice si `https://mydiamondapp.com` quedó OK.

---

## Comandos útiles del servidor
```bash
KEY=deploy/.secrets/mydymond-key.pem; IP=$(cat deploy/.secrets/eip)

# ver logs de la app en vivo
ssh -i $KEY ubuntu@$IP 'journalctl -u mydymond -f'

# reiniciar la app
ssh -i $KEY ubuntu@$IP 'sudo systemctl restart mydymond'

# entrar al servidor
ssh -i $KEY ubuntu@$IP
```

> Si el SSH da *timeout*, es porque el firewall solo deja tu IP. Tu IP puede cambiar; en ese caso avisá o (si tenés AWS CLI) reautorizá el puerto 22 para tu IP nueva.

## Estructura clave
| Ruta | Qué es |
|---|---|
| `src/` | Código de la app (Next.js) |
| `src/lib/supabase.ts` | Adaptador de storage → **S3** (misma API, sin Supabase) |
| `prisma/schema.prisma` | Modelo de la base (RDS) |
| `deploy/` | Scripts de infra y deploy + `deploy/.secrets/` (llaves, git-ignored) |
| `deploy/deploy.sh` | **Publicar a producción de un comando** |
