export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/plan-status
 *
 * SOLO LECTURA — no hace escrituras en DB.
 *
 * La desactivación de planes expirados se hace en el cron:
 *   POST /api/cron/expire-plans  (llamado por Vercel Cron / pg_cron)
 *
 * PlanGuard llama este endpoint en cada navegación.
 */
export async function GET() {
  try {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const plan = user.plan ?? 'NONE'
    const planExpiresAt: Date | null = user.planExpiresAt ?? null
    const now = new Date()
    const expired = plan !== 'NONE' && planExpiresAt !== null && planExpiresAt < now

    // Si el plan está activo, verificar si fue activado vía Fase Global
    let faseGlobal = false
    if (plan !== 'NONE' && !expired) {
      const lastPurchase = await prisma.packPurchaseRequest.findFirst({
        where: { userId: user.id, status: 'APPROVED' },
        orderBy: { reviewedAt: 'desc' },
        select: { paymentMethod: true },
      })
      faseGlobal = (lastPurchase?.paymentMethod as string) === 'FASE_GLOBAL'
    }

    // Acceso manual a Academy/Recursos/Shop otorgado por el admin
    // + datos de Pack Empresarial (orgRole/organizationId) para el acceso al panel de empresa
    const ux = await prisma.user.findUnique({
      where: { id: user.id },
      select: { accessExtras: true, orgRole: true, organizationId: true },
    })
    const accessExtras = !!ux?.accessExtras

    // Marca de la empresa (Pack Empresarial): nombre + logo para mostrar a sus usuarios.
    let orgName: string | null = null
    let orgLogoUrl: string | null = null
    if (ux?.organizationId) {
      const org = await prisma.organization.findUnique({
        where: { id: ux.organizationId },
        select: { name: true, logoUrl: true },
      })
      orgName = org?.name ?? null
      orgLogoUrl = org?.logoUrl ?? null
    }

    return NextResponse.json({
      plan: expired ? 'NONE' : plan,
      planExpiresAt: planExpiresAt?.toISOString() ?? null,
      expired,
      faseGlobal,
      accessExtras,
      orgRole: ux?.orgRole ?? 'NONE',
      organizationId: ux?.organizationId ?? null,
      orgName,
      orgLogoUrl,
    })
  } catch (err) {
    console.error('[GET /api/plan-status]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
