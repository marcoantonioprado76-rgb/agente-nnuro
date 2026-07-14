export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getOrgAdmin, unauthorizedOrg } from '@/lib/org-auth'
import { prisma } from '@/lib/prisma'
import { reactivateUserAssetsAfterPlanRenewal } from '@/lib/plan-lifecycle'
import { createNotification } from '@/lib/notifications'

/**
 * PATCH /api/empresa/users/[id]
 * El admin de empresa gestiona un usuario de SU organización.
 * Body parcial: { plan?, addDays?, isActive?, remove? }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ctx = await getOrgAdmin()
    if (!ctx) return unauthorizedOrg()
    const { organizationId } = ctx

    const userId = params.id

    // REGLA DE ORO: el usuario [id] debe pertenecer a la org del caller.
    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, organizationId: true },
    })
    if (!target || target.organizationId !== organizationId) {
      return unauthorizedOrg()
    }

    const body = await request.json()
    const { plan, addDays, isActive, remove } = body ?? {}

    // remove → desasignar de la organización
    if (remove === true) {
      await prisma.$executeRaw`
        UPDATE users SET organization_id = NULL, org_role = 'NONE'::"OrgRole"
        WHERE id = ${userId}::uuid
      `
      return NextResponse.json({ success: true })
    }

    // plan (BASIC/PRO/ELITE/NONE)
    if (plan !== undefined) {
      if (plan === 'NONE') {
        await prisma.$executeRaw`
          UPDATE users
          SET plan = 'NONE'::"UserPlan",
              is_active = false,
              plan_expires_at = NULL
          WHERE id = ${userId}::uuid
        `
      } else {
        await prisma.$executeRaw`
          UPDATE users
          SET plan = ${plan}::"UserPlan",
              is_active = true,
              plan_expires_at = GREATEST(
                COALESCE(plan_expires_at, NOW()),
                NOW() + INTERVAL '30 days'
              )
          WHERE id = ${userId}::uuid
        `
        await reactivateUserAssetsAfterPlanRenewal(userId)
      }
    }

    // addDays → sumar días (clamp 1..3650)
    if (addDays !== undefined) {
      const days = Math.max(1, Math.min(3650, parseInt(addDays) || 0))
      if (days > 0) {
        await prisma.$executeRaw`
          UPDATE users
          SET plan_expires_at = GREATEST(COALESCE(plan_expires_at, NOW()), NOW()) + make_interval(days => ${days}),
              is_active = true
          WHERE id = ${userId}::uuid
        `
      }
    }

    // isActive → activar/desactivar
    if (isActive !== undefined) {
      await prisma.$executeRaw`
        UPDATE users SET is_active = ${!!isActive} WHERE id = ${userId}::uuid
      `
    }

    // Avisar al usuario si se le activó/renovó el plan.
    if ((plan && plan !== 'NONE') || (addDays && parseInt(addDays) > 0)) {
      await createNotification(
        userId,
        '¡Tu cuenta fue activada! 🎉',
        'Tu empresa activó tu acceso. Ya podés usar la plataforma.',
        '/dashboard'
      ).catch(() => {})
    }

    // Devolver usuario actualizado
    const updated = await prisma.user.findUnique({
      where: { id: userId },
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
    console.error('[PATCH /api/empresa/users/[id]]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
