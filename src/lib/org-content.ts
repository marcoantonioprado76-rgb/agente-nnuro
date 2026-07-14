import { prisma } from '@/lib/prisma'

/**
 * Aislamiento de contenido por empresa (Pack Empresarial — Fase 3).
 *
 * Regla de oro: un usuario de empresa ve SOLO el contenido de su empresa;
 * un usuario de plataforma (organizationId NULL) ve SOLO el contenido global (NULL).
 * Nadie ve el contenido de otra empresa.
 *
 * Uso en cualquier consulta de contenido (Course/Podcast/Template/Resource/StoreItem):
 *   const orgWhere = await contentOrgWhere(user.id)
 *   prisma.course.findMany({ where: { ...orgWhere, active: true } })
 */

/** organizationId del usuario que mira (null = usuario de plataforma). */
export async function viewerOrgId(userId: string): Promise<string | null> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { organizationId: true },
  })
  return u?.organizationId ?? null
}

/** Fragmento `where` de Prisma para filtrar contenido por la empresa del que mira. */
export async function contentOrgWhere(userId: string): Promise<{ organizationId: string | null }> {
  return { organizationId: await viewerOrgId(userId) }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Valida el `organizationId` que el SUPER-ADMIN asigna a un contenido
 * (Course/Podcast/StoreItem) al crear o editar — Pack Empresarial Fase 3.
 *
 * Resultado:
 *   { ok: true, skip: true }            -> el campo no vino en el body: no tocar
 *   { ok: true, value: null }           -> contenido global de MY DIAMOND
 *   { ok: true, value: '<uuid>' }       -> privado de una empresa existente
 *   { ok: false, error }                -> empresa inválida (responder 400)
 */
export async function validateOrganizationId(
  raw: unknown
): Promise<
  | { ok: true; skip: true }
  | { ok: true; skip?: false; value: string | null }
  | { ok: false; error: string }
> {
  // No vino en el body -> no tocar (en create queda el default null).
  if (raw === undefined) return { ok: true, skip: true }

  // null / '' -> contenido global.
  if (raw === null || raw === '') return { ok: true, value: null }

  if (typeof raw !== 'string' || !UUID_RE.test(raw)) {
    return { ok: false, error: 'Empresa inválida' }
  }

  const org = await prisma.organization.findUnique({ where: { id: raw }, select: { id: true } })
  if (!org) return { ok: false, error: 'Empresa inválida' }

  return { ok: true, value: raw }
}
