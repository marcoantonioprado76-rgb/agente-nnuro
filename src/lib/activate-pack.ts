import { prisma } from '@/lib/prisma'
import { reactivateUserAssetsAfterPlanRenewal } from '@/lib/plan-lifecycle'
import { sendAdminPlanAutoActivatedEmail } from '@/lib/email'

const PLAN_RANK: Record<string, number> = { NONE: 0, BASIC: 1, PRO: 2, ELITE: 3 }

/**
 * Activa un plan a partir de una PackPurchaseRequest PENDING — flujo crypto-B (auto-detección
 * por monto único, sin pegar hash). Replica EXACTAMENTE la activación del pago cripto directo
 * de MY-DIAMOND (set/renovar plan + reactivar assets + audit log), pero disparada al detectar
 * el pago on-chain. Race-safe + idempotente: devuelve true solo si ESTA llamada activó.
 */
export async function activatePackPurchase(
  requestId: string,
  meta: { txHash?: string | null; blockNumber?: bigint | null; amountUsdt?: number | null; note?: string } = {},
): Promise<boolean> {
  const req = await prisma.packPurchaseRequest.findUnique({ where: { id: requestId } })
  if (!req || req.status !== 'PENDING') return false

  const plan = req.plan as string

  // Estado actual del usuario (plan expirado se trata como NONE, igual que en pack-requests).
  const cur = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { plan: true, planExpiresAt: true },
  })
  const planExpired = cur?.planExpiresAt ? cur.planExpiresAt < new Date() : false
  const effectivePlan = planExpired ? 'NONE' : (cur?.plan ?? 'NONE')
  const currentRank = PLAN_RANK[effectivePlan] ?? 0
  const newRank = PLAN_RANK[plan] ?? 0
  const isRenewal = newRank === currentRank && currentRank > 0

  let activated = false
  await prisma.$transaction(async (tx) => {
    // Idempotencia/anti-doble: solo procede si sigue PENDING (gana la carrera vs polling/cron).
    const upd = await tx.packPurchaseRequest.updateMany({
      where: { id: requestId, status: 'PENDING' },
      data: {
        status: 'APPROVED',
        ...(meta.txHash ? { txHash: meta.txHash } : {}),
        ...(meta.blockNumber != null ? { blockNumber: meta.blockNumber } : {}),
        reviewedAt: new Date(),
        notes: meta.note ?? `Auto-detectado on-chain (crypto-B)${meta.amountUsdt != null ? ` — ${meta.amountUsdt.toFixed(2)} USDT` : ''}`,
      },
    })
    if (upd.count !== 1) return // otra pasada ya lo procesó

    // Duración según el período comprado (1/3/12 meses × 30 días).
    const days = ((req as any).billingMonths ?? 1) * 30
    // Setear o renovar el plan (mismo SQL/guardas que el cron de MY-DIAMOND).
    if (isRenewal) {
      await tx.$executeRaw`
        UPDATE users
        SET is_active = true,
            plan_expires_at = GREATEST(COALESCE(plan_expires_at, NOW()), NOW()) + (${days} || ' days')::interval
        WHERE id = ${req.userId}::uuid
      `
    } else if (newRank > currentRank) {
      // Solo subir de plan; NUNCA degradar (si el usuario subió por otra vía entre el
      // inicio y la detección del pago, no lo bajamos — el pago igual queda APPROVED).
      await tx.$executeRaw`
        UPDATE users
        SET plan = ${plan}::"UserPlan",
            is_active = true,
            plan_expires_at = NOW() + (${days} || ' days')::interval
        WHERE id = ${req.userId}::uuid
      `
    }

    // Reactivar stores/bots que el cron expirePlans haya pausado antes.
    await reactivateUserAssetsAfterPlanRenewal(req.userId, tx)

    await tx.auditLog.create({
      data: {
        userId: req.userId,
        actorUserId: req.userId,
        action: 'PURCHASE_CRYPTO_AUTO_APPROVED',
        entityType: 'PackPurchaseRequest',
        entityId: requestId,
        payload: {
          plan,
          price: Number(req.price),
          txHash: meta.txHash ?? null,
          amountUsdt: meta.amountUsdt ?? null,
          blockNumber: meta.blockNumber != null ? meta.blockNumber.toString() : null,
          source: 'crypto-b',
        },
      },
    })
    activated = true
  })

  // Aviso al admin (fire-and-forget), igual que el pago cripto directo.
  if (activated) {
    ;(async () => {
      try {
        const u = await prisma.user.findUnique({
          where: { id: req.userId },
          select: { fullName: true, email: true, username: true, country: true, city: true },
        })
        if (!u) return
        await sendAdminPlanAutoActivatedEmail({
          requestId,
          plan,
          price: Number(req.price),
          txHash: meta.txHash ?? '',
          amountUsdt: meta.amountUsdt ?? null,
          blockNumber: meta.blockNumber != null ? meta.blockNumber.toString() : null,
          trigger: 'auto-onchain',
          user: u,
          approvedAt: new Date(),
        })
      } catch (e) {
        console.error('[activatePackPurchase] admin notify error:', e)
      }
    })()
  }

  return activated
}
