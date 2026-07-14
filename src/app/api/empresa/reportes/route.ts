export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getOrgAdmin, unauthorizedOrg } from '@/lib/org-auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/empresa/reportes
 * Estadísticas (reportes) de la organización del admin de empresa:
 * usuarios (total/activos/inactivos/por plan), cupo, contenido y solicitudes.
 */
export async function GET() {
  try {
    const ctx = await getOrgAdmin()
    if (!ctx) return unauthorizedOrg()
    const { organizationId, organization } = ctx

    const now = new Date()

    const [
      total,
      activos,
      planBasic,
      planPro,
      planElite,
      planNone,
      cursos,
      podcasts,
      productos,
      recursos,
      flyers,
      pendientes,
      aprobadas,
    ] = await Promise.all([
      // usuarios
      prisma.user.count({ where: { organizationId } }),
      prisma.user.count({
        where: {
          organizationId,
          isActive: true,
          plan: { not: 'NONE' },
          OR: [{ planExpiresAt: null }, { planExpiresAt: { gt: now } }],
        },
      }),
      prisma.user.count({ where: { organizationId, plan: 'BASIC' } }),
      prisma.user.count({ where: { organizationId, plan: 'PRO' } }),
      prisma.user.count({ where: { organizationId, plan: 'ELITE' } }),
      prisma.user.count({ where: { organizationId, plan: 'NONE' } }),
      // contenido
      prisma.course.count({ where: { organizationId } }),
      prisma.podcast.count({ where: { organizationId } }),
      prisma.storeItem.count({ where: { organizationId } }),
      prisma.resource.count({ where: { organizationId } }),
      prisma.template.count({ where: { organizationId } }),
      // solicitudes
      prisma.packPurchaseRequest.count({ where: { organizationId, status: 'PENDING' } }),
      prisma.packPurchaseRequest.count({ where: { organizationId, status: 'APPROVED' } }),
    ])

    const totalN = Number(total)
    const activosN = Number(activos)

    return NextResponse.json({
      empresa: { name: organization.name },
      usuarios: {
        total: totalN,
        activos: activosN,
        inactivos: totalN - activosN,
        porPlan: {
          BASIC: Number(planBasic),
          PRO: Number(planPro),
          ELITE: Number(planElite),
          NONE: Number(planNone),
        },
      },
      cupo: {
        usados: totalN,
        max: Number(organization.maxUsers),
      },
      contenido: {
        cursos: Number(cursos),
        podcasts: Number(podcasts),
        productos: Number(productos),
        recursos: Number(recursos),
        flyers: Number(flyers),
      },
      solicitudes: {
        pendientes: Number(pendientes),
        aprobadas: Number(aprobadas),
      },
    })
  } catch (err) {
    console.error('[GET /api/empresa/reportes]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
