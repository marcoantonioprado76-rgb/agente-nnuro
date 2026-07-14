export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser, unauthorizedAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import { verifyBscTransaction } from '@/lib/blockchain'
import { sendPlanPurchaseConfirmedEmail, sendAdminPlanAutoActivatedEmail } from '@/lib/email'
import { reactivateUserAssetsAfterPlanRenewal } from '@/lib/plan-lifecycle'

const PLAN_RANK: Record<string, number> = { NONE: 0, BASIC: 1, PRO: 2, ELITE: 3 }

/**
 * POST /api/admin/purchases/[id]/reverify
 *
 * Re-verifica on-chain una compra CRYPTO que está PENDING_VERIFICATION.
 * El admin lo dispara desde el panel sin esperar al cron periódico.
 *
 * - Si la transacción ya tiene las confirmaciones suficientes → aprueba la compra,
 *   activa el plan del usuario, envía email de confirmación.
 * - Si todavía no se confirmó on-chain → devuelve el error específico (ej: "1/3 confirmaciones").
 * - Si la solicitud no es CRYPTO o no está PENDING_VERIFICATION → 400.
 */
export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const admin = await getAdminUser()
    if (!admin) return unauthorizedAdmin()

    const req = await prisma.packPurchaseRequest.findUnique({
        where: { id: params.id },
        include: { user: { select: { id: true, fullName: true, email: true, plan: true } } },
    })

    if (!req) return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 })
    if (req.paymentMethod !== 'CRYPTO') {
        return NextResponse.json({ error: 'Esta solicitud no es CRYPTO. Usa el endpoint de aprobación normal.' }, { status: 400 })
    }
    if (!req.txHash) {
        return NextResponse.json({ error: 'No hay txHash registrado en esta solicitud.' }, { status: 400 })
    }
    if (req.status === 'APPROVED') {
        return NextResponse.json({ error: 'Ya está aprobada.', status: 'APPROVED' }, { status: 400 })
    }
    if (req.status === 'REJECTED') {
        return NextResponse.json({ error: 'Está rechazada. No se puede re-verificar.' }, { status: 400 })
    }

    const verification = await verifyBscTransaction(req.txHash, Number(req.price))

    if (!verification.success) {
        return NextResponse.json({
            success: false,
            verified: false,
            error: verification.error,
        })
    }

    // Verificado on-chain — activar plan en transacción (mismo patrón que el cron)
    try {
        const newPlan = req.plan as string
        const currentPlan = req.user.plan ?? 'NONE'
        const currentRank = PLAN_RANK[currentPlan] ?? 0
        const newRank = PLAN_RANK[newPlan] ?? 0
        const isRenewal = newPlan === currentPlan && currentRank > 0

        await prisma.$transaction(async (tx) => {
            // Re-lock + recheck
            const locked = await tx.$queryRaw<Array<{ status: string }>>`
                SELECT status FROM pack_purchase_requests WHERE id = ${params.id}::uuid FOR UPDATE
            `
            if (locked[0]?.status === 'APPROVED') throw new Error('ALREADY_APPROVED')
            if (locked[0]?.status === 'REJECTED') throw new Error('ALREADY_REJECTED')

            await tx.packPurchaseRequest.update({
                where: { id: params.id },
                data: {
                    status: 'APPROVED',
                    blockNumber: verification.blockNumber ?? null,
                    reviewedBy: admin.id,
                    reviewedAt: new Date(),
                    notes: `Re-verificado por admin. USDT: ${verification.amountUsdt?.toFixed(2)}`,
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
                    SET plan = ${newPlan}::"UserPlan",
                        is_active = true,
                        plan_expires_at = NOW() + INTERVAL '30 days'
                    WHERE id = ${req.userId}::uuid
                `
            }
            // Si newRank <= currentRank y no es renewal: solo cierra la solicitud, no degrada

            // Reactivar stores/bots que el cron expirePlans haya pausado antes.
            await reactivateUserAssetsAfterPlanRenewal(req.userId, tx)

            await tx.auditLog.create({
                data: {
                    userId: req.userId,
                    actorUserId: admin.id,
                    action: 'PURCHASE_CRYPTO_REVERIFIED',
                    entityType: 'PackPurchaseRequest',
                    entityId: req.id,
                    payload: { plan: newPlan, txHash: req.txHash, amountUsdt: verification.amountUsdt, adminId: admin.id },
                },
            })
        })

        // Email de confirmación al usuario fire-and-forget
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
        ).catch(e => console.error('[email] reverify confirmed:', e))

        // Notificar al admin que la solicitud se aprobó vía reverify manual (fire-and-forget)
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
                    trigger: 'admin-reverify',
                    user: u,
                    approvedAt: new Date(),
                })
            } catch (e) {
                console.error('[admin reverify] admin notify error:', e)
            }
        })()

        return NextResponse.json({
            success: true,
            verified: true,
            amountUsdt: verification.amountUsdt,
            blockNumber: verification.blockNumber?.toString(),
        })
    } catch (err: any) {
        if (err.message === 'ALREADY_APPROVED' || err.message === 'ALREADY_REJECTED') {
            return NextResponse.json({ error: `La solicitud ya está ${err.message === 'ALREADY_APPROVED' ? 'aprobada' : 'rechazada'}.` }, { status: 409 })
        }
        console.error('[admin reverify] error:', err)
        return NextResponse.json({ error: 'Error interno al activar el plan' }, { status: 500 })
    }
}
