export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser, unauthorizedAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import { sendPlanPurchaseConfirmedEmail } from '@/lib/email'
import { reactivateUserAssetsAfterPlanRenewal } from '@/lib/plan-lifecycle'
import { getPlanCredits } from '@/lib/plan-config'

const PLAN_RANK: Record<string, number> = { NONE: 0, BASIC: 1, PRO: 2, ELITE: 3 }

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  const body = await request.json()
  const { action, notes } = body

  const purchaseRequest = await prisma.packPurchaseRequest.findUnique({
    where: { id: params.id },
    include: { user: { select: { id: true, fullName: true, email: true } } },
  })

  if (!purchaseRequest) {
    return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 })
  }

  if (purchaseRequest.status !== 'PENDING') {
    return NextResponse.json({ error: 'Esta solicitud ya fue procesada' }, { status: 400 })
  }

  if (action === 'approve') {
    try {
      await prisma.$transaction(async (tx) => {
        // 1. Re-lock la purchase request dentro de la tx para evitar doble aprobación
        const lockedRequest = await tx.$queryRaw<Array<{ status: string }>>`
          SELECT status FROM pack_purchase_requests
          WHERE id = ${params.id}::uuid
          FOR UPDATE
        `
        if (lockedRequest[0]?.status !== 'PENDING') {
          throw new Error('ALREADY_PROCESSED')
        }

        // 2. Leer plan actual con lock para evitar race condition en el rank check
        const currentUserData = await tx.$queryRaw<Array<{ plan: string }>>`
          SELECT plan::text FROM users
          WHERE id = ${purchaseRequest.userId}::uuid
          FOR UPDATE
        `
        const currentPlan = currentUserData[0]?.plan ?? 'NONE'
        const currentRank = PLAN_RANK[currentPlan] ?? 0

        const isFaseGlobal = (purchaseRequest.paymentMethod as string) === 'FASE_GLOBAL'

        // Reglas:
        // - Fase Global SIEMPRE fuerza BASIC sin importar el plan actual.
        //     · Si el usuario ya tiene BASIC → renovación (extiende +30 días sobre el mayor entre expiración actual y NOW).
        //     · Si tiene NONE/PRO/ELITE → fuerza BASIC con expiración NOW+30 (degradación intencional para PRO/ELITE).
        // - Pagos regulares (no Fase Global): no permitir degradar; renovar si es el mismo plan.
        let newPlan: string
        let isRenewal: boolean

        if (isFaseGlobal) {
          newPlan = 'BASIC'
          isRenewal = currentPlan === 'BASIC'
        } else {
          const newRank = PLAN_RANK[purchaseRequest.plan] ?? 0
          if (newRank < currentRank || newRank === 0) {
            throw new Error('PLAN_NOT_UPGRADE')
          }
          newPlan = purchaseRequest.plan as string
          isRenewal = newRank === currentRank && currentRank > 0
        }

        // 3. Marcar solicitud como aprobada
        await tx.packPurchaseRequest.update({
          where: { id: params.id },
          data: {
            status: 'APPROVED',
            notes: notes ?? null,
            reviewedBy: admin.id,
            reviewedAt: new Date(),
          },
        })

        // 4. Activar o renovar plan
        if (isRenewal) {
          // Mantiene el plan, solo extiende +30 días sobre la fecha más reciente
          await tx.$executeRaw`
            UPDATE users
            SET is_active = true,
                plan_expires_at = GREATEST(COALESCE(plan_expires_at, NOW()), NOW()) + INTERVAL '30 days'
            WHERE id = ${purchaseRequest.userId}::uuid
          `
        } else {
          // Cambia o fuerza el plan con expiración NOW+30
          await tx.$executeRaw`
            UPDATE users
            SET plan = ${newPlan}::"UserPlan",
                is_active = true,
                plan_expires_at = NOW() + INTERVAL '30 days'
            WHERE id = ${purchaseRequest.userId}::uuid
          `
        }

        // 4.4 Créditos IA incluidos en el plan (saldo USD). Fase Global NO recibe.
        //     Se otorgan en cada activación/renovación (el usuario paga el precio completo).
        if (!isFaseGlobal) {
          const credits = await getPlanCredits(newPlan, tx)
          if (credits > 0) {
            await tx.$executeRaw`
              UPDATE users SET ai_balance_usd = ai_balance_usd + ${credits}
              WHERE id = ${purchaseRequest.userId}::uuid
            `
          }
        }

        // 4.5 Reactivar tiendas/bots que el cron expirePlans haya pausado
        //     en períodos vencidos anteriores. Idempotente: si no hay nada
        //     que reactivar, no hace nada.
        await reactivateUserAssetsAfterPlanRenewal(purchaseRequest.userId, tx)

        // 5. Audit log
        await tx.auditLog.create({
          data: {
            userId: purchaseRequest.userId,
            actorUserId: admin.id,
            action: 'PURCHASE_APPROVED',
            entityType: 'PackPurchaseRequest',
            entityId: params.id,
            payload: {
              plan: newPlan,
              price: Number(purchaseRequest.price),
              adminId: admin.id,
            },
          },
        })
      })
    } catch (err: any) {
      if (err.message === 'ALREADY_PROCESSED') {
        return NextResponse.json({ error: 'Esta solicitud ya fue procesada.' }, { status: 409 })
      }
      if (err.message === 'PLAN_NOT_UPGRADE') {
        return NextResponse.json({ error: 'No se puede bajar de plan ni activar un plan inválido.' }, { status: 400 })
      }
      throw err
    }

    // Enviar email de confirmación (fire-and-forget)
    sendPlanPurchaseConfirmedEmail(
      purchaseRequest.user.email,
      purchaseRequest.user.fullName,
      {
        id: purchaseRequest.id,
        plan: purchaseRequest.plan as string,
        price: Number(purchaseRequest.price),
        paymentMethod: purchaseRequest.paymentMethod ?? 'MANUAL',
        txHash: purchaseRequest.txHash ?? null,
        createdAt: new Date(),
      }
    ).catch(e => console.error('[email] plan purchase confirmed:', e))

    return NextResponse.json({ success: true, action: 'approved' })
  }

  if (action === 'reject') {
    await prisma.$transaction(async (tx) => {
      await tx.packPurchaseRequest.update({
        where: { id: params.id },
        data: {
          status: 'REJECTED',
          notes: notes ?? null,
          reviewedBy: admin.id,
          reviewedAt: new Date(),
        },
      })
      await tx.auditLog.create({
        data: {
          userId: purchaseRequest.userId,
          actorUserId: admin.id,
          action: 'PURCHASE_REJECTED',
          entityType: 'PackPurchaseRequest',
          entityId: params.id,
          payload: { notes },
        },
      })
    })
    return NextResponse.json({ success: true, action: 'rejected' })
  }

  return NextResponse.json({ error: 'Acción inválida. Usa approve o reject.' }, { status: 400 })
}
