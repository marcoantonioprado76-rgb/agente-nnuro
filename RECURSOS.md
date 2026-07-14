# Sección "Recursos"

Sección **aislada** dentro del dashboard, con **3 pestañas** (`/dashboard/recursos`):

1. **Flyers** — plantillas editables (el usuario pone su foto + textos y descarga JPG/PNG). **Fabric.js**.
2. **Presentaciones** — PDFs que el usuario **ve** (visor página a página) y **descarga**. **react-pdf**.
3. **Libros** — PDFs que el usuario **lee con efecto "pasar páginas"** (flipbook, libro abierto a doble
   página en desktop / una sola en móvil) y descarga. **react-pageflip** + react-pdf.

En las 3: el **admin sube** el contenido (`/admin/recursos`, con sub-pestañas Flyers · Presentaciones ·
Libros) y el **usuario lo consume**. Presentaciones y libros son fijos (ver/descargar, no editables).

## Flyers (plantillas editables)
- **Admin:** sube el flyer (PNG con la zona de la foto **transparente**), marca el hueco de la foto
  y las cajas de texto.
- **Usuario:** elige una plantilla, sube su foto (que va **al fondo**, detrás del diseño, y se ve por la
  zona transparente del flyer — movible/escalable), edita los textos y **descarga en JPG/PNG** al
  tamaño nativo de cada flyer. **La foto del usuario se procesa en el navegador, nunca se sube al servidor.**

## Presentaciones y Libros (PDF)
- **Admin** (`/admin/recursos/presentaciones` y `/admin/recursos/libros`): sube **solo el PDF**. La
  **portada y el nº de páginas se generan solos** (se renderiza la página 1 con pdfjs en el navegador y
  se sube como portada JPG); opcionalmente puede subir su propia portada. Puede ocultar/activar/borrar.
- **Usuario** (`/dashboard/recursos/presentaciones` y `/libros`): ve la lista con portadas + filtro por
  categoría, abre el visor (react-pdf con navegación, o flipbook react-pageflip) y descarga el PDF.
- Ambos tipos viven en la **misma tabla `resources`** (campo `tipo` = `presentacion` | `libro`).
- Los PDFs y portadas se guardan en el **mismo bucket `uploads`**, subcarpeta `recursos/`.
- El **worker de PDF.js** se sirve local desde `public/pdf.worker.min.js` (sin CDN → no choca con la CSP).

## Qué reutiliza (no agrega nada nuevo de base)
- **Auth:** la sesión por cookies existente (`getAuthUser`). Las páginas viven bajo `/dashboard/recursos`,
  así que el **middleware actual** ya las protege. No se tocó el middleware, el layout raíz ni el WalletProvider.
- **Admin:** el flag `users.is_admin` que ya existía + el helper `src/lib/admin-auth.ts` (`getAdminUser`).
- **Storage:** Supabase Storage, **bucket `uploads`** (el mismo de toda la app), en la subcarpeta `recursos/`.
- **DB:** Prisma + PostgreSQL (Supabase). Se agregaron **2 tablas** (`templates`, `resources`).
- **Estilo:** Tailwind + tokens de la app (dark morado/azul neón, gradientes, fuente Archivo).

## Archivos nuevos
```
prisma/schema.prisma                                  (modelos Template y Resource — aditivos)
prisma/migrations/20260621000001_add_recursos_templates/migration.sql
prisma/migrations/20260621000002_add_recursos_resources/migration.sql
public/pdf.worker.min.js                              worker de PDF.js (servido local)

# API
src/app/api/recursos/templates/route.ts               GET (lista) · POST (crear, admin)
src/app/api/recursos/templates/[id]/route.ts          GET · PATCH · DELETE (admin)
src/app/api/recursos/resources/route.ts               GET (lista presentaciones/libros) · POST (admin)
src/app/api/recursos/resources/[id]/route.ts          GET · PATCH · DELETE (admin)
src/app/api/recursos/upload/route.ts                  POST subir imagen base o PDF (admin)

# Usuario (dashboard) — layout de 3 pestañas
src/app/dashboard/recursos/layout.tsx                 Barra de pestañas Flyers · Presentaciones · Libros
src/app/dashboard/recursos/page.tsx                   Redirige a /flyers
src/app/dashboard/recursos/flyers/page.tsx + [id]/{page,UserEditor}.tsx   Galería + editor Fabric
src/app/dashboard/recursos/presentaciones/page.tsx + [id]/{page,PdfViewer}.tsx     Lista + visor react-pdf
src/app/dashboard/recursos/libros/page.tsx + [id]/{page,FlipbookViewer}.tsx        Lista + flipbook

# Admin (/admin/recursos) — sub-pestañas
src/app/admin/recursos/RecursosTabs.tsx               Sub-nav Flyers · Presentaciones · Libros
src/app/admin/recursos/page.tsx                       Flyers: lista + activar/ocultar/borrar
src/app/admin/recursos/nuevo/page.tsx + AdminEditor.tsx       Editor admin (Fabric): subir + marcar zonas
src/app/admin/recursos/ResourcesAdmin.tsx             Gestor genérico de presentaciones/libros (subir PDF)
src/app/admin/recursos/presentaciones/page.tsx        usa ResourcesAdmin tipo="presentacion"
src/app/admin/recursos/libros/page.tsx                usa ResourcesAdmin tipo="libro"
```
La **gestión vive en el Panel de Admin** (`/admin/recursos`, con sub-pestañas). Los usuarios solo
consumen desde el dashboard.
Archivos existentes modificados (aditivo): `src/components/Navbar.tsx` (item "Recursos" en el dashboard),
`src/app/admin/layout.tsx` (pestaña "Recursos" en el panel admin) y `next.config.js` (alias
`canvas: false` en webpack — pdfjs-dist referencia el paquete Node opcional `canvas`, que no usamos).

## Variables / permisos necesarios
**Ya existen en el proyecto, no hay que crear nada nuevo:**
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (en `.env` / Render).
- Bucket de Storage **`uploads`** debe ser **público de lectura** (ya lo es; se usa en toda la app).
  Para que el editor pueda **exportar** la imagen, el bucket debe servir con CORS (`Access-Control-Allow-Origin: *`),
  que es el comportamiento por defecto de los buckets públicos de Supabase.
- Dependencias nuevas (ya en `package.json`): **`fabric` 5.3.0** (+ `@types/fabric`) para flyers;
  **`react-pdf` 7.7.3** (incluye `pdfjs-dist` 3.11.174) para el visor; **`react-pageflip` 2.0.3** para el flipbook.
- **`RECURSOS_ADMIN_EMAILS`** (opcional, lista de correos separada por comas) — restringe quién puede
  **gestionar** plantillas. Si NO se define → cualquier `is_admin` puede gestionar. Si se define →
  solo esos correos (que además sean `is_admin`). Ej. para que solo la cuenta dedicada gestione y otras
  cuentas admin queden como usuarios normales:
  ```
  RECURSOS_ADMIN_EMAILS=admin@marcoproyectos.com
  ```
  > ⚠️ Esta variable hay que setearla también en **Render** (producción). Sin ella, todos los `is_admin`
  > ven el panel de gestión.

## Base de datos
La tabla `templates` se crea con la migración `20260621000001_add_recursos_templates`.
SQL (solo crea la tabla, no toca nada existente):
```sql
CREATE TABLE "templates" (
  "id" UUID NOT NULL,
  "nombre" TEXT NOT NULL,
  "categoria" TEXT NOT NULL,
  "ancho" INTEGER NOT NULL,
  "alto" INTEGER NOT NULL,
  "fondo_url" TEXT NOT NULL,
  "thumb_url" TEXT,
  "zonas" JSONB NOT NULL,
  "activo" BOOLEAN NOT NULL DEFAULT true,
  "creado_por" UUID NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "templates_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "templates_activo_categoria_idx" ON "templates"("activo","categoria");
```
La tabla `resources` (presentaciones y libros) se crea con la migración `20260621000002_add_recursos_resources`:
```sql
CREATE TABLE "resources" (
  "id" UUID NOT NULL,
  "tipo" TEXT NOT NULL,                 -- 'presentacion' | 'libro'
  "titulo" TEXT NOT NULL,
  "categoria" TEXT NOT NULL,
  "archivo_url" TEXT NOT NULL,          -- PDF en el bucket uploads
  "portada_url" TEXT,                   -- imagen de portada (auto desde la pág. 1)
  "paginas" INTEGER,
  "activo" BOOLEAN NOT NULL DEFAULT true,
  "creado_por" UUID NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "resources_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "resources_tipo_activo_categoria_idx" ON "resources"("tipo","activo","categoria");
```
> Nota: el deploy (Render) NO corre migraciones automáticamente (`build = prisma generate && next build`),
> por eso estas tablas se aplican directo a la base. Para entornos nuevos, correr este SQL o `prisma migrate deploy`.

## Cómo marcar a un usuario como ADMIN
El rol usa el campo `is_admin` de la tabla `users` (ya existente):
```sql
UPDATE users SET is_admin = true WHERE email = 'tu-correo@ejemplo.com';
```
Solo los admin pueden **subir contenido** y entrar al panel `/admin/recursos` (Flyers · Presentaciones · Libros).

## Estructura de `templates.zonas` (JSONB)
```json
{
  "photo": { "x": 120, "y": 300, "w": 840, "h": 600 },
  "texts": [
    { "id": "abc123", "x": 100, "y": 80, "w": 880, "text": "Tu título",
      "fontSize": 64, "fontFamily": "Archivo", "fill": "#ffffff",
      "align": "center", "fontWeight": "800" }
  ]
}
```
- `photo`: hueco donde el usuario coloca su foto (recortada con `clipPath`). Puede ser `null`.
- `texts`: cajas de texto editables (Fabric `Textbox`).

## Aislamiento / seguridad
- Todo lo nuevo está bajo `/dashboard/recursos` y `/api/recursos` → protegido por el auth existente.
- Escritura (crear/editar/borrar plantillas y recursos, subir imágenes/PDFs) requiere `is_admin`
  (+ allowlist `RECURSOS_ADMIN_EMAILS` si está definida).
- Fabric.js, react-pdf y react-pageflip se cargan **solo** en las rutas de Recursos vía `next/dynamic`
  con `ssr:false` (los visores PDF/flipbook son client-only).
- No se tocó Web3/wallet/pagos, ni el sistema de login, ni el middleware, ni el layout raíz/WalletProvider.
