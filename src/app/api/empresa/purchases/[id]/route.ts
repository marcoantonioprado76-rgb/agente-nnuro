export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getOrgAdmin, unauthorizedOrg } from '@/lib/org-auth'
import { prisma } from '@/lib/prisma'
import { reactivateUserAssetsAfterPlanRenewal } from '@/lib/plan-lifecycle'
import { createNotification } from '@/lib/notifications'

/**
 * PATCH /api/empresa/purchases/[id]
 * El admin de empresa aprueba o rechaza una solicitud de comprobante de SU org.
 * Al aprobar define el plan real y los días que activa al usuario dueño.
 *
 * Body: { action: 'approve'|'reject', plan?, addDays?, notes? }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ctx = await getOrgAdmin()
    if (!ctx) return unauthorizedOrg()
    const { organizationId, user: admin } = ctx

    const reqId = params.id

    // Cargar la solicitud y verificar que sea de la org del caller.
    const purchaseRequest = await prisma.packPurchaseRequest.findUnique({
      where: { id: reqId },
      select: { id: true, userId: true, organizationId: true },
    })
    if (!purchaseRequest || purchaseRequest.organizationId !== organizationId) {
      return unauthorizedOrg()
    }

    const body = await request.json().catch(() => ({}))
    const { action, plan, addDays, notes } = body ?? {}

    if (action === 'approve') {
      const targetPlan = plan || 'BASIC'
      const days = Math.max(1, Math.min(3650, parseInt(addDays) || 30))
      const targetUserId = purchaseRequest.userId

      await prisma.$transaction(async (tx) => {
        // 1. Marcar solicitud como aprobada
        await tx.$executeRaw`
          UPDATE pack_purchase_requests
          SET status = 'APPROVED'::"RequestStatus",
              reviewed_by = ${admin.id}::uuid,
              reviewed_at = NOW(),
              notes = COALESCE(${notes ?? null}, notes)
          WHERE id = ${reqId}::uuid
        `

        // 2. Activar al usuario dueño con el plan y días definidos por el admin
        await tx.$executeRaw`
          UPDATE users
          SET plan = ${targetPlan}::"UserPlan",
              is_active = true,
              plan_expires_at = GREATEST(COALESCE(plan_expires_at, NOW()), NOW()) + make_interval(days => ${days})
          WHERE id = ${targetUserId}::uuid
        `

        // 3. Reactivar tiendas/bots que el cron expirePlans haya pausado
        await reactivateUserAssetsAfterPlanRenewal(targetUserId, tx)
      })

      // Avisar al usuario que su empresa lo activó.
      await createNotification(
        targetUserId,
        '¡Tu cuenta fue activada! 🎉',
        'Tu empresa aprobó tu pago y activó tu acceso. Ya podés usar la plataforma.',
        '/dashboard'
      ).catch(() => {})

      return NextResponse.json({ success: true })
    }

    if (action === 'reject') {
      await prisma.$executeRaw`
        UPDATE pack_purchase_requests
        SET status = 'REJECTED'::"RequestStatus",
            reviewed_by = ${admin.id}::uuid,
            reviewed_at = NOW(),
            notes = COALESCE(${notes ?? null}, notes)
        WHERE id = ${reqId}::uuid
      `
      await createNotification(
        purchaseRequest.userId,
        'Tu comprobante fue revisado',
        'Tu empresa revisó tu pago. Si hubo un problema, volvé a enviar el comprobante o contactala.',
        '/planes'
      ).catch(() => {})
      return NextResponse.json({ success: true })
    }

    return NextResponse.json(
      { error: 'Acción inválida. Usa approve o reject.' },
      { status: 400 }
    )
  } catch (err) {
    console.error('[PATCH /api/empresa/purchases/[id]]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
