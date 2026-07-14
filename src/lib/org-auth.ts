import { NextResponse } from 'next/server'
import { getAuthUser } from './auth'
import { prisma } from './prisma'

/**
 * Valida que el usuario autenticado sea ADMIN DE EMPRESA (orgRole === 'ORG_ADMIN')
 * y que tenga una organización asignada.
 *
 * getAuthUser() NO expone orgRole/organizationId (su SELECT es de campos fijos),
 * por eso consultamos esos dos campos aparte con prisma.
 *
 * Devuelve { user, organizationId, organization } o null si no califica.
 */
export async function getOrgAdmin() {
  const user = await getAuthUser()
  if (!user) return null

  const orgInfo = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, orgRole: true, organizationId: true },
  })
  if (!orgInfo) return null
  if (orgInfo.orgRole !== 'ORG_ADMIN') return null
  if (!orgInfo.organizationId) return null

  const organization = await prisma.organization.findUnique({
    where: { id: orgInfo.organizationId },
    select: { id: true, name: true, slug: true, maxUsers: true, active: true },
  })
  if (!organization) return null

  return {
    user,
    organizationId: orgInfo.organizationId,
    organization,
  }
}

export function unauthorizedOrg() {
  return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
}
