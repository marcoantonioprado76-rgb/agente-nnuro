export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getOrgAdmin, unauthorizedOrg } from '@/lib/org-auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/empresa/users
 * Lista los usuarios de la organización del admin de empresa.
 */
export async function GET() {
  try {
    const ctx = await getOrgAdmin()
    if (!ctx) return unauthorizedOrg()
    const { organizationId, organization } = ctx

    const users = await prisma.user.findMany({
      where: { organizationId },
      select: {
        id: true,
        username: true,
        fullName: true,
        email: true,
        plan: true,
        isActive: true,
        planExpiresAt: true,
        orgRole: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      organization: {
        name: organization.name,
        slug: organization.slug,
        maxUsers: organization.maxUsers,
        active: organization.active,
        memberCount: users.length,
      },
      users,
    })
  } catch (err) {
    console.error('[GET /api/empresa/users]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

/**
 * POST /api/empresa/users
 * Asigna un usuario existente (por username) a la organización del admin.
 * Body: { username, role? }  (role default 'ORG_USER')
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = await getOrgAdmin()
    if (!ctx) return unauthorizedOrg()
    const { organizationId, organization } = ctx

    const body = await request.json()
    const username: string | undefined = body?.username
    const role: string = body?.role === 'ORG_ADMIN' ? 'ORG_ADMIN' : 'ORG_USER'

    if (!username || typeof username !== 'string') {
      return NextResponse.json({ error: 'username requerido' }, { status: 400 })
    }

    const target = await prisma.user.findUnique({
      where: { username },
      select: { id: true, organizationId: true },
    })
    if (!target) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    // Ya pertenece a OTRA organización
    if (target.organizationId && target.organizationId !== organizationId) {
      return NextResponse.json(
        { error: 'El usuario ya pertenece a otra organización' },
        { status: 400 }
      )
    }

    // CUPO: si ya está al máximo (y maxUsers > 0), no permitir agregar uno nuevo.
    if (target.organizationId !== organizationId) {
      const memberCount = await prisma.user.count({ where: { organizationId } })
      if (organization.maxUsers > 0 && memberCount >= organization.maxUsers) {
        return NextResponse.json({ error: 'Cupo de usuarios alcanzado' }, { status: 403 })
      }
    }

    const updated = await prisma.user.update({
      where: { id: target.id },
      data: { organizationId, orgRole: role as any },
      select: {
        id: true,
        username: true,
        fullName: true,
        email: true,
        plan: true,
        isActive: true,
        planExpiresAt: true,
        orgRole: true,
      },
    })

    return NextResponse.json({ success: true, user: updated })
  } catch (err) {
    console.error('[POST /api/empresa/users]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
