export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser, unauthorizedAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'

/** Genera un slug a partir de un texto: minúsculas, sin tildes, espacios→guiones, solo [a-z0-9-] */
function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // quitar tildes/diacríticos
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-') // todo lo que no sea [a-z0-9] → guion
    .replace(/^-+|-+$/g, '') // sin guiones al inicio/fin
}

export async function GET() {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  try {
    const orgs = await prisma.organization.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { members: true } } },
    })

    // Buscar el ORG_ADMIN de cada empresa
    const orgIds = orgs.map((o) => o.id)
    const orgAdmins = orgIds.length
      ? await prisma.user.findMany({
          where: { organizationId: { in: orgIds }, orgRole: 'ORG_ADMIN' },
          select: { organizationId: true, username: true, fullName: true },
        })
      : []
    const adminByOrg = new Map<string, { username: string; fullName: string | null }>()
    for (const u of orgAdmins) {
      if (u.organizationId && !adminByOrg.has(u.organizationId)) {
        adminByOrg.set(u.organizationId, { username: u.username, fullName: u.fullName })
      }
    }

    const organizations = orgs.map((o) => ({
      id: o.id,
      name: o.name,
      slug: o.slug,
      maxUsers: o.maxUsers,
      active: o.active,
      billingNote: o.billingNote,
      logoUrl: o.logoUrl,
      createdAt: o.createdAt,
      memberCount: o._count.members,
      admin: adminByOrg.get(o.id) || null,
    }))

    return NextResponse.json({ organizations })
  } catch (err) {
    console.error('[GET /api/admin/organizations]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  try {
    const body = await req.json()
    const { name } = body

    if (!name || !String(name).trim()) {
      return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 })
    }
    const cleanName = String(name).trim()

    // Slug: usar el provisto o generarlo del nombre
    let slug = body.slug ? slugify(String(body.slug)) : slugify(cleanName)
    if (!slug) {
      return NextResponse.json({ error: 'No se pudo generar un slug válido del nombre' }, { status: 400 })
    }

    // maxUsers: entero >= 0 (default 0)
    let maxUsers = 0
    if (body.maxUsers !== undefined && body.maxUsers !== null && body.maxUsers !== '') {
      const n = Number(body.maxUsers)
      if (!Number.isInteger(n) || n < 0) {
        return NextResponse.json({ error: 'maxUsers debe ser un entero mayor o igual a 0' }, { status: 400 })
      }
      maxUsers = n
    }

    // Slug único
    const existing = await prisma.organization.findUnique({ where: { slug } })
    if (existing) {
      return NextResponse.json({ error: `Ya existe una empresa con el slug "${slug}"` }, { status: 409 })
    }

    const org = await prisma.organization.create({
      data: { name: cleanName, slug, maxUsers },
      include: { _count: { select: { members: true } } },
    })

    return NextResponse.json({
      organization: {
        id: org.id,
        name: org.name,
        slug: org.slug,
        maxUsers: org.maxUsers,
        active: org.active,
        billingNote: org.billingNote,
        logoUrl: org.logoUrl,
        createdAt: org.createdAt,
        memberCount: org._count.members,
        admin: null,
      },
    })
  } catch (err) {
    console.error('[POST /api/admin/organizations]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
