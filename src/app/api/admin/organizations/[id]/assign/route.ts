export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser, unauthorizedAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'

const VALID_ROLES = ['ORG_ADMIN', 'ORG_USER'] as const
type ValidRole = (typeof VALID_ROLES)[number]

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  try {
    // La empresa debe existir
    const org = await prisma.organization.findUnique({ where: { id: params.id } })
    if (!org) return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 404 })

    const body = await req.json()
    const { username, userId, role, remove } = body

    // Localizar al usuario por id o por username
    let user: { id: string; username: string; fullName: string } | null = null
    if (userId) {
      user = await prisma.user.findUnique({
        where: { id: String(userId) },
        select: { id: true, username: true, fullName: true },
      })
    } else if (username) {
      user = await prisma.user.findUnique({
        where: { username: String(username) },
        select: { id: true, username: true, fullName: true },
      })
    } else {
      return NextResponse.json({ error: 'Falta username o userId' }, { status: 400 })
    }

    if (!user) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })

    // Acción de des-asignar
    if (remove === true) {
      const updated = await prisma.user.update({
        where: { id: user.id },
        data: { organizationId: null, orgRole: 'NONE' },
        select: { username: true, fullName: true, orgRole: true },
      })
      return NextResponse.json({
        user: { username: updated.username, fullName: updated.fullName, orgRole: updated.orgRole },
      })
    }

    // Asignar: validar rol
    if (!role || !VALID_ROLES.includes(role as ValidRole)) {
      return NextResponse.json(
        { error: "role debe ser 'ORG_ADMIN' o 'ORG_USER'" },
        { status: 400 }
      )
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { organizationId: params.id, orgRole: role as ValidRole },
      select: { username: true, fullName: true, orgRole: true },
    })

    return NextResponse.json({
      user: { username: updated.username, fullName: updated.fullName, orgRole: updated.orgRole },
    })
  } catch (err) {
    console.error('[POST /api/admin/organizations/[id]/assign]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
