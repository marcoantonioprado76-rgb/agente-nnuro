export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser, unauthorizedAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  try {
    const org = await prisma.organization.findUnique({ where: { id: params.id } })
    if (!org) return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 404 })

    const body = await req.json()
    const { name, maxUsers, active, billingNote, logoUrl } = body

    const data: {
      name?: string
      maxUsers?: number
      active?: boolean
      billingNote?: string | null
      logoUrl?: string | null
    } = {}

    if (name !== undefined) {
      if (!String(name).trim()) {
        return NextResponse.json({ error: 'El nombre no puede estar vacío' }, { status: 400 })
      }
      data.name = String(name).trim()
    }

    if (maxUsers !== undefined) {
      const n = Number(maxUsers)
      if (!Number.isInteger(n) || n < 0) {
        return NextResponse.json({ error: 'maxUsers debe ser un entero mayor o igual a 0' }, { status: 400 })
      }
      data.maxUsers = n
    }

    if (active !== undefined) {
      data.active = Boolean(active)
    }

    if (billingNote !== undefined) {
      data.billingNote = billingNote ? String(billingNote) : null
    }

    if (logoUrl !== undefined) {
      data.logoUrl = logoUrl ? String(logoUrl) : null
    }

    const updated = await prisma.organization.update({
      where: { id: params.id },
      data,
      include: { _count: { select: { members: true } } },
    })

    return NextResponse.json({
      organization: {
        id: updated.id,
        name: updated.name,
        slug: updated.slug,
        maxUsers: updated.maxUsers,
        active: updated.active,
        billingNote: updated.billingNote,
        logoUrl: updated.logoUrl,
        createdAt: updated.createdAt,
        memberCount: updated._count.members,
      },
    })
  } catch (err) {
    console.error('[PATCH /api/admin/organizations/[id]]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  try {
    const org = await prisma.organization.findUnique({ where: { id: params.id } })
    if (!org) return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 404 })

    await prisma.$transaction([
      // Desasignar miembros antes de eliminar la empresa
      prisma.user.updateMany({
        where: { organizationId: params.id },
        data: { organizationId: null, orgRole: 'NONE' },
      }),
      // Retirar su contenido (no se nulifica el organizationId a propósito: eso lo
      // volvería global/visible para todos = fuga). Se marca inactivo → invisible.
      prisma.course.updateMany({ where: { organizationId: params.id }, data: { active: false } }),
      prisma.podcast.updateMany({ where: { organizationId: params.id }, data: { active: false } }),
      prisma.storeItem.updateMany({ where: { organizationId: params.id }, data: { active: false } }),
      (prisma as any).template.updateMany({ where: { organizationId: params.id }, data: { activo: false } }),
      (prisma as any).resource.updateMany({ where: { organizationId: params.id }, data: { activo: false } }),
      prisma.organization.delete({ where: { id: params.id } }),
    ])

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[DELETE /api/admin/organizations/[id]]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
