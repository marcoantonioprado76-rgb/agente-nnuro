export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyBscTransaction, findIncomingUsdtByAmount } from '@/lib/blockchain'
import { sendOrderConfirmedEmail, sendPlanPurchaseConfirmedEmail, sendAdminPlanAutoActivatedEmail } from '@/lib/email'
import { reactivateUserAssetsAfterPlanRenewal } from '@/lib/plan-lifecycle'
import { activatePackPurchase } from '@/lib/activate-pack'
import { isCryptoTxUsed, CRYPTO_GRACE_MINUTES } from '@/lib/crypto-pay'

const PLAN_RANK: Record<string, number> = { NONE: 0, BASIC: 1, PRO: 2, ELITE: 3 }

/**
 * GET /api/purchases/verify
 * Cron job protegido por CRON_SECRET.
 * Busca compras PENDING_VERIFICATION y las verifica on-chain.
 * Configurar en Render como cron job cada 2 minutos.
 */
export async function GET(request: NextRequest) {
  const secret = request.headers.get('x-cron-secret') ?? request.nextUrl.searchParams.get('secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  let pending: any[]
  try {
    pending = await prisma.packPurchaseRequest.findMany({
      where: { status: 'PENDING_VERIFICATION', paymentMethod: 'CRYPTO', txHash: { not: null } },
      include: { user: { select: { id: true, fullName: true, email: true, plan: true } } },
      orderBy: { createdAt: 'asc' },
      take: 20,
    })
  } catch (err) {
    console.error('[cron/verify] Error fetching pending purchases:', err)
    return NextResponse.json({ error: 'Error consultando compras pendientes' }, { status: 500 })
  }

  const results = { verified: 0, failed: 0, pending: pending.length }

  for (const req of pending) {
    const verification = await verifyBscTransaction(req.txHash!, Number(req.price))

    if (!verification.success) {
      // Si lleva más de 30 minutos sin confirmarse, rechazar
      const ageMinutes = (Date.now() - req.createdAt.getTime()) / 60000
      if (ageMinutes > 30) {
        await prisma.packPurchaseRequest.update({
          where: { id: req.id },
          data: { status: 'REJECTED', notes: `Timeout verificación: ${verification.error}` },
        })
        results.failed++
      }
      continue
    }

    // Verificado — activar plan en transacción
    try {
      const newPlan = req.plan as string
      const currentPlan = req.user.plan ?? 'NONE'
      const currentRank = PLAN_RANK[currentPlan] ?? 0
      const newRank = PLAN_RANK[newPlan] ?? 0
      const isRenewal = newPlan === currentPlan && currentRank > 0

      await prisma.$transaction(async (tx) => {
        await tx.packPurchaseRequest.update({
          where: { id: req.id },
          data: {
            status: 'APPROVED',
            blockNumber: verification.blockNumber ?? null,
            reviewedAt: new Date(),
            notes: `Auto-aprobado por cron. USDT: ${verification.amountUsdt?.toFixed(2)}`,
          },
        })

        if (isRenewal) {
          await tx.$executeRaw`
            UPDATE users
            SET is_active = true,
                plan_expires_at = GREATEST(COALESCE(plan_expires_at, NOW()), NOW()) + INTERVAL '30 days'
            WHERE id = ${req.userId}::uuid
          `
        } else if (newRank > currentRank) {
          await tx.$executeRaw`
            UPDATE users
            SET plan = ${newPlan}::\"UserPlan\",
                is_active = true,
                plan_expires_at = NOW() + INTERVAL '30 days'
            WHERE id = ${req.userId}::uuid
          `
        }

        // Reactivar stores/bots que el cron expirePlans haya pausado antes.
        await reactivateUserAssetsAfterPlanRenewal(req.userId, tx)

        await tx.auditLog.create({
          data: {
            userId: req.userId,
            actorUserId: req.userId,
            action: 'PURCHASE_CRYPTO_CRON_APPROVED',
            entityType: 'PackPurchaseRequest',
            entityId: req.id,
            payload: { plan: newPlan, txHash: req.txHash, amountUsdt: verification.amountUsdt },
          },
        })
      })

      // Enviar email de confirmación al usuario (fire-and-forget)
      sendPlanPurchaseConfirmedEmail(
        req.user.email,
        req.user.fullName,
        {
          id: req.id,
          plan: newPlan,
          price: Number(req.price),
          paymentMethod: 'CRYPTO',
          txHash: req.txHash,
          createdAt: new Date(),
        }
      ).catch(e => console.error('[email] cron plan confirmed:', e))

      // Notificar al admin que el cron auto-aprobó esta compra (fire-and-forget)
      ;(async () => {
        try {
          const u = await prisma.user.findUnique({
            where: { id: req.userId },
            select: { fullName: true, email: true, username: true, country: true, city: true },
          })
          if (!u) return
          await sendAdminPlanAutoActivatedEmail({
            requestId: req.id,
            plan: newPlan,
            price: Number(req.price),
            txHash: req.txHash!,
            amountUsdt: verification.amountUsdt ?? null,
            blockNumber: verification.blockNumber?.toString() ?? null,
            trigger: 'cron-verify',
            user: u,
            approvedAt: new Date(),
          })
        } catch (e) {
          console.error('[cron/verify] admin notify error:', e)
        }
      })()

      results.verified++
    } catch (err) {
      console.error('[cron/verify] Error activando plan:', req.id, err)
      results.failed++
    }
  }

  // ── Plan crypto-B (monto único, sin hash) — respaldo del polling ───────────
  // Solicitudes PENDING con expectedAmount: detecta el pago on-chain por monto y activa.
  const cryptoBResults = { verified: 0, expired: 0 }
  try {
    const pendingCryptoB = await prisma.packPurchaseRequest.findMany({
      where: { status: 'PENDING', paymentMethod: 'CRYPTO', expectedAmount: { not: null } },
      orderBy: { createdAt: 'asc' },
      take: 20,
    })
    for (const r of pendingCryptoB) {
      try {
        const found = await findIncomingUsdtByAmount(Number(r.expectedAmount), { notBefore: r.createdAt })
        if (found && !(await isCryptoTxUsed(found.txHash, { table: 'pack', id: r.id }))) {
          const ok = await activatePackPurchase(r.id, { txHash: found.txHash, blockNumber: BigInt(found.blockNumber), amountUsdt: found.amount, note: `Auto-detectado por cron (${found.amount} USDT)` })
          if (ok) { cryptoBResults.verified++; continue }
        }
        // Sin pago y vencido + gracia → rechazar (libera el monto único).
        if (r.expiresAt && r.expiresAt.getTime() + CRYPTO_GRACE_MINUTES * 60_000 < Date.now()) {
          await prisma.packPurchaseRequest.updateMany({ where: { id: r.id, status: 'PENDING' }, data: { status: 'REJECTED', notes: 'Pago no recibido (venció)' } })
          cryptoBResults.expired++
        }
      } catch (e) {
        console.error('[cron/verify] crypto-B plan:', r.id, e)
      }
    }
  } catch (err) {
    console.error('[cron/verify] Error fetching crypto-B plans:', err)
  }

  // ── Course enrollment crypto verification ──────────────────────────────────
  let pendingEnrollments: any[]
  try {
    pendingEnrollments = await prisma.courseEnrollment.findMany({
      where: { status: 'PENDING_VERIFICATION' as any, paymentMethod: 'CRYPTO', txHash: { not: null } },
      include: { course: { select: { id: true, price: true } } },
      orderBy: { createdAt: 'asc' },
      take: 20,
    })
  } catch (err) {
    console.error('[cron/verify] Error fetching pending enrollments:', err)
    return NextResponse.json({ success: true, ...results, enrollments: { verified: 0, failed: 0 } })
  }

  const enrollResults = { verified: 0, failed: 0 }

  for (const enr of pendingEnrollments) {
    const verification = await verifyBscTransaction(enr.txHash!, Number(enr.course.price))

    if (!verification.success) {
      const ageMinutes = (Date.now() - enr.createdAt.getTime()) / 60000
      if (ageMinutes > 30) {
        await prisma.courseEnrollment.update({
          where: { id: enr.id },
          data: { status: 'REJECTED' as any, notes: `Timeout verificación: ${verification.error}` },
        })
        enrollResults.failed++
      }
      continue
    }

    try {
      await prisma.courseEnrollment.update({
        where: { id: enr.id },
        data: {
          status: 'APPROVED' as any,
          blockNumber: verification.blockNumber ? BigInt(verification.blockNumber) : null,
          notes: `Auto-aprobado por cron. USDT: ${verification.amountUsdt?.toFixed(2)}`,
        },
      })
      enrollResults.verified++
    } catch (err) {
      console.error('[cron/verify] Error aprobando enrollment:', enr.id, err)
      enrollResults.failed++
    }
  }

  // ── Store order crypto verification ────────────────────────────────────────
  let pendingStoreOrders: any[]
  try {
    pendingStoreOrders = await prisma.storeOrder.findMany({
      where: { status: 'PENDING_VERIFICATION' as any, paymentMethod: 'CRYPTO', txHash: { not: null } },
      include: {
        items: { include: { item: { select: { title: true } } } },
        user: { select: { email: true, fullName: true } },
      },
      orderBy: { createdAt: 'asc' },
      take: 20,
    })
  } catch (err) {
    console.error('[cron/verify] Error fetching pending store orders:', err)
    return NextResponse.json({ success: true, ...results, enrollments: enrollResults, storeOrders: { verified: 0, failed: 0 } })
  }

  const storeResults = { verified: 0, failed: 0 }

  for (const so of pendingStoreOrders) {
    const verification = await verifyBscTransaction(so.txHash!, Number(so.totalPrice))

    if (!verification.success) {
      const ageMinutes = (Date.now() - so.createdAt.getTime()) / 60000
      if (ageMinutes > 30) {
        await prisma.storeOrder.update({
          where: { id: so.id },
          data: { status: 'REJECTED' as any, notes: `Timeout verificación: ${verification.error}` },
        })
        storeResults.failed++
      }
      continue
    }

    try {
      await prisma.$transaction(async (tx) => {
        // Re-check status para evitar doble aprobación si dos crons corren en paralelo
        const locked = await tx.$queryRaw<Array<{ status: string }>>`
          SELECT status FROM store_orders WHERE id = ${so.id}::uuid FOR UPDATE
        `
        if (locked[0]?.status !== 'PENDING_VERIFICATION') return

        await tx.storeOrder.update({
          where: { id: so.id },
          data: {
            status: 'APPROVED' as any,
            blockNumber: verification.blockNumber ? BigInt(verification.blockNumber) : null,
            notes: `Auto-aprobado por cron. USDT: ${verification.amountUsdt?.toFixed(2)}`,
          },
        })
        // Descontar stock
        for (const oi of so.items) {
          await tx.storeItem.update({
            where: { id: oi.itemId },
            data: { stock: { decrement: oi.quantity } },
          })
        }
      })
      // Enviar email de confirmación
      const soAny = so as any
      sendOrderConfirmedEmail(soAny.user.email, soAny.user.fullName, {
        id: so.id,
        totalPrice: Number(so.totalPrice),
        recipientName: so.recipientName,
        address: so.address,
        city: so.city,
        state: so.state,
        country: so.country,
        zipCode: so.zipCode,
        createdAt: so.createdAt,
        txHash: so.txHash,
        items: soAny.items.map((oi: any) => ({
          title: oi.item.title,
          quantity: oi.quantity,
          priceSnapshot: Number(oi.priceSnapshot),
          selectedVariants: oi.selectedVariants as Record<string, string>,
        })),
      }).catch(e => console.error('[email] cron store order confirmed:', e))

      storeResults.verified++
    } catch (err) {
      console.error('[cron/verify] Error aprobando store order:', so.id, err)
      storeResults.failed++
    }
  }

  // ── Credit purchase (saldo IA) crypto verification ─────────────────────────
  let pendingCredits: any[]
  try {
    pendingCredits = await (prisma as any).creditPurchaseRequest.findMany({
      where: { status: 'PENDING_VERIFICATION', paymentMethod: 'CRYPTO', txHash: { not: null } },
      include: { user: { select: { id: true, fullName: true, email: true, username: true, country: true, city: true } } },
      orderBy: { createdAt: 'asc' },
      take: 20,
    })
  } catch (err) {
    console.error('[cron/verify] Error fetching pending credit purchases:', err)
    return NextResponse.json({
      success: true, ...results,
      enrollments: enrollResults, storeOrders: storeResults,
      credits: { verified: 0, failed: 0 },
    })
  }

  const creditResults = { verified: 0, failed: 0 }

  for (const cpr of pendingCredits) {
    const amountUsd = Number(cpr.amountUsd)
    const verification = await verifyBscTransaction(cpr.txHash!, amountUsd)

    if (!verification.success) {
      const ageMinutes = (Date.now() - cpr.createdAt.getTime()) / 60000
      if (ageMinutes > 30) {
        await (prisma as any).creditPurchaseRequest.update({
          where: { id: cpr.id },
          data: { status: 'REJECTED', notes: `Timeout verificación: ${verification.error}` },
        })
        creditResults.failed++
      }
      continue
    }

    // Verificado on-chain → aprobar + acreditar saldo en transacción
    try {
      const fresh = await prisma.$transaction(async (tx) => {
        // Re-lock para evitar doble aprobación si dos crons corren en paralelo
        const locked = await tx.$queryRaw<Array<{ status: string }>>`
          SELECT status FROM credit_purchase_requests WHERE id = ${cpr.id}::uuid FOR UPDATE
        `
        if (locked[0]?.status !== 'PENDING_VERIFICATION') return null

        await (tx as any).creditPurchaseRequest.update({
          where: { id: cpr.id },
          data: {
            status: 'APPROVED',
            blockNumber: verification.blockNumber ?? null,
            reviewedAt: new Date(),
            notes: `Auto-aprobado por cron. USDT: ${verification.amountUsdt?.toFixed(2)}`,
          },
        })

        await tx.$queryRaw`SELECT id FROM users WHERE id = ${cpr.userId}::uuid FOR UPDATE`

        await tx.$executeRaw`
          UPDATE users
          SET ai_balance_usd = ai_balance_usd + ${amountUsd}::numeric,
              low_balance_warned_at = NULL
          WHERE id = ${cpr.userId}::uuid
        `

        await (tx as any).aIUsageLog.create({
          data: {
            userId: cpr.userId,
            model: 'credit_purchase',
            reason: 'credit_purchase',
            costUsd: -amountUsd,
            metadata: { purchaseId: cpr.id, txHash: cpr.txHash, amountUsdt: verification.amountUsdt, trigger: 'cron-verify' },
          },
        })

        await tx.auditLog.create({
          data: {
            userId: cpr.userId,
            actorUserId: cpr.userId,
            action: 'CREDIT_PURCHASE_CRYPTO_CRON_APPROVED',
            entityType: 'CreditPurchaseRequest',
            entityId: cpr.id,
            payload: { amountUsd, txHash: cpr.txHash, amountUsdt: verification.amountUsdt, blockNumber: verification.blockNumber?.toString() },
          },
        })

        return tx.user.findUnique({
          where: { id: cpr.userId },
          select: { aiBalanceUsd: true },
        })
      })

      if (fresh) {
        // Email al usuario fire-and-forget
        const { sendUserCreditPurchaseApprovedEmail, sendAdminCreditAutoActivatedEmail } = await import('@/lib/email')
        sendUserCreditPurchaseApprovedEmail({
          email: cpr.user.email,
          fullName: cpr.user.fullName,
          requestId: cpr.id,
          amountUsd,
          newBalanceUsd: Number(fresh.aiBalanceUsd ?? 0),
          paymentMethod: 'CRYPTO',
          reviewedAt: new Date(),
        }).catch(e => console.error('[email] cron credit user approved:', e))

        // Email al admin fire-and-forget
        sendAdminCreditAutoActivatedEmail({
          requestId: cpr.id,
          amountUsd,
          txHash: cpr.txHash!,
          amountUsdt: verification.amountUsdt ?? null,
          blockNumber: verification.blockNumber?.toString() ?? null,
          trigger: 'cron-verify',
          user: {
            fullName: cpr.user.fullName,
            email: cpr.user.email,
            username: cpr.user.username,
            country: cpr.user.country,
            city: cpr.user.city,
            newBalanceUsd: Number(fresh.aiBalanceUsd ?? 0),
          },
          approvedAt: new Date(),
        }).catch(e => console.error('[email] cron credit admin notify:', e))
      }

      creditResults.verified++
    } catch (err) {
      console.error('[cron/verify] Error aprobando credit purchase:', cpr.id, err)
      creditResults.failed++
    }
  }

  return NextResponse.json({
    success: true, ...results,
    cryptoBPlans: cryptoBResults,
    enrollments: enrollResults,
    storeOrders: storeResults,
    credits: creditResults,
  })
}
