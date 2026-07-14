# Plan técnico — Pack Empresarial (multi-empresa / white-label)

> Cada Pack Empresarial = una **Organización** con su propio mini-panel, sus propios
> usuarios y su contenido **privado**. Decisiones tomadas con Marco:
> - **Cobro:** la empresa cobra a sus usuarios (con su factura). MY DIAMOND le cobra el Pack a la empresa.
> - **Contenido:** aislamiento total — los usuarios de una empresa ven **solo** el material de su empresa.

## 1. Los 3 roles
| Rol | Alcance |
|---|---|
| **Super-admin (Marco)** | Crea empresas, asigna su admin, define el contrato (cupo de usuarios, qué incluye), activa/desactiva. Ve TODO. |
| **Admin de Empresa** | Panel propio separado. Ve/activa **solo SUS usuarios** (hasta su cupo). Sube **su propio** contenido (Academy/Recursos/Shop). Cobra a sus usuarios con su factura. |
| **Usuario de Empresa** | Dashboard normal. Academy/Recursos/Shop muestran **solo** el contenido de su empresa. |

## 2. Modelo de datos (Prisma)
- **Nuevo `Organization`**: `id, name, slug, ownerAdminId, maxUsers (cupo), active, billingNote, logoUrl?, createdAt`.
- **`User`** (campos nuevos): `organizationId String?` (null = usuario de plataforma / MY DIAMOND directo) + `orgRole` enum `NONE | ORG_ADMIN | ORG_USER`.
- **Contenido** (campo nuevo `organizationId String?`, null = global de MY DIAMOND): en `Course`, `Podcast`, `Template` (recursos) y `StoreItem` (shop). Set = privado de esa empresa.
- (Las tiendas/productos propios del usuario `Store`/`Product` ya son por-usuario; no cambian.)

## 3. La regla de oro — aislamiento
**Toda** consulta de contenido se filtra por organización:
- Usuario de empresa → contenido donde `organizationId = su empresa`.
- Usuario de plataforma → contenido donde `organizationId IS NULL` (global).
- Admin de empresa → solo CRUD de usuarios/contenido donde `organizationId = su empresa`.
- Super-admin → todo.
- **Riesgo clave:** si una consulta se olvida del filtro, una empresa vería contenido de otra (fuga de privacidad). Hay que filtrar en cada endpoint de contenido/usuarios y **probar el aislamiento** con 2 empresas.

## 4. Pantallas
- **Super-admin** → nueva sección **"Empresas"**: crear empresa, asignar admin, fijar cupo/contrato, activar/desactivar, ver uso.
- **Admin de Empresa** → panel scoped (ej. `/empresa`): Usuarios (ver/activar solo los suyos, con su factura) + Contenido (subir sus cursos/recursos/shop). Middleware que verifica `orgRole = ORG_ADMIN` y restringe a su `organizationId`.
- **Usuario de empresa** → dashboard normal; Academy/Recursos/Shop filtrados a su empresa.

## 5. Alta y activación de un usuario de empresa
1. El admin de empresa crea/invita un usuario → queda con `organizationId = su empresa`, `orgRole = ORG_USER`.
2. El admin de empresa **activa su plan** (reusa el flujo de activación, scoped + marcado como "activación de empresa", sin pasar por el cobro de MY DIAMOND).
3. El usuario obtiene todos los servicios + el Academy/Recursos/Shop de su empresa.
4. Tope: el admin de empresa solo activa hasta `maxUsers` del contrato.

## 6. Roadmap por fases
- **Fase 1 — Base:** modelo `Organization` + migración + `User.organizationId/orgRole` + sección "Empresas" del super-admin (crear empresa, asignar admin, cupo).
- **Fase 2 — Panel del admin de empresa:** versión scoped del panel de usuarios (ver/activar solo los suyos) + auth/permisos de org-admin.
- **Fase 3 — Contenido aislado:** `organizationId` en Course/Podcast/Template/StoreItem + filtros en todas las consultas + pantallas para que el admin de empresa suba su contenido.
- **Fase 4 — Pulido:** branding de la empresa, enforcement del cupo, notas de facturación, reportes.

## 7. Notas
- Es la feature más grande del proyecto (multi-tenancy). Se hace por fases; cada fase es un hito sólido y testeable.
- Reusamos casi todo lo existente (admin, activación, Academy/Recursos/Shop) agregándoles "a qué empresa pertenece".
- Cada fase necesita su migración de BD (aplicada con el método session-pooler ya documentado).
