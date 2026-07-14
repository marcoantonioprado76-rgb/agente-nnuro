export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser, unauthorizedAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import { verifyBscTransaction } from '@/lib/blockchain'
import { sendUserCreditPurchaseApprovedEmail, sendAdminCreditAutoActivatedEmail } from '@/lib/email'

/**
 * POST /api/admin/credit-purchases/[id]/reverify
 *
 * Re-verifica on-chain una solicitud de saldo IA CRYPTO PENDING_VERIFICATION,
 * sin esperar al cron periódico. Mismo patrón que /api/admin/purchases/[id]/reverify
 * pero para saldo IA (CreditPurchaseRequest).
 */
export async function POST(
    _request: NextRequest,
    { params }: { params: { id: string } }
) {
    const admin = await getAdminUser()
    if (!admin) return unauthorizedAdmin()

    const req = await (prisma as any).creditPurchaseRequest.findUnique({
        where: { id: params.id },
        include: { user: { select: { id: true, fullName: true, email: true, username: true, country: true, city: true, aiBalanceUsd: true } } },
    })

    if (!req) return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 })
    if (req.paymentMethod !== 'CRYPTO') {
        return NextResponse.json({ error: 'Esta solicitud no es CRYPTO. Aprobá manualmente.' }, { status: 400 })
    }
    if (!req.txHash) {
        return NextResponse.json({ error: 'No hay txHash registrado.' }, { status: 400 })
    }
    if (req.status === 'APPROVED') {
        return NextResponse.json({ error: 'Ya está aprobada.', status: 'APPROVED' }, { status: 400 })
    }
    if (req.status === 'REJECTED') {
        return NextResponse.json({ error: 'Está rechazada. No se puede re-verificar.' }, { status: 400 })
    }

    const amountUsd = Number(req.amountUsd)
    const verification = await verifyBscTransaction(req.txHash, amountUsd)

    if (!verification.success) {
        return NextResponse.json({
            success: false,
            verified: false,
            error: verification.error,
        })
    }

    // Verificado on-chain → aprobar + acreditar saldo en transacción
    try {
        const fresh = await prisma.$transaction(async (tx) => {
            const locked = await tx.$queryRaw<Array<{ status: string }>>`
                SELECT status FROM credit_purchase_requests WHERE id = ${params.id}::uuid FOR UPDATE
            `
            if (locked[0]?.status === 'APPROVED') throw new Error('ALREADY_APPROVED')
            if (locked[0]?.status === 'REJECTED') throw new Error('ALREADY_REJECTED')

            await (tx as any).creditPurchaseRequest.update({
                where: { id: params.id },
                data: {
                    status: 'APPROVED',
                    blockNumber: verification.blockNumber ?? null,
                    reviewedBy: admin.id,
                    reviewedAt: new Date(),
                    notes: `Re-verificado por admin. USDT: ${verification.amountUsdt?.toFixed(2)}`,
                },
            })

            await tx.$queryRaw`SELECT id FROM users WHERE id = ${req.userId}::uuid FOR UPDATE`

            await tx.$executeRaw`
                UPDATE users
                SET ai_balance_usd = ai_balance_usd + ${amountUsd}::numeric,
                    low_balance_warned_at = NULL
                WHERE id = ${req.userId}::uuid
            `

            await (tx as any).aIUsageLog.create({
                data: {
                    userId: req.userId,
                    model: 'credit_purchase',
                    reason: 'credit_purchase',
                    costUsd: -amountUsd,
                    metadata: { purchaseId: params.id, txHash: req.txHash, amountUsdt: verification.amountUsdt, trigger: 'admin-reverify' },
                },
            })

            await tx.auditLog.create({
                data: {
                    userId: req.userId,
                    actorUserId: admin.id,
                    action: 'CREDIT_PURCHASE_CRYPTO_REVERIFIED',
                    entityType: 'CreditPurchaseRequest',
                    entityId: req.id,
                    payload: { amountUsd, txHash: req.txHash, amountUsdt: verification.amountUsdt, adminId: admin.id },
                },
            })

            return tx.user.findUnique({
                where: { id: req.userId },
                select: { aiBalanceUsd: true },
            })
        })

        const newBalanceUsd = fresh ? Number(fresh.aiBalanceUsd ?? 0) : amountUsd

        // Email al usuario fire-and-forget
        sendUserCreditPurchaseApprovedEmail({
            email: req.user.email,
            fullName: req.user.fullName,
            requestId: req.id,
            amountUsd,
            newBalanceUsd,
            paymentMethod: 'CRYPTO',
            reviewedAt: new Date(),
        }).catch(e => console.error('[email] credit reverify user:', e))

        // Email al admin fire-and-forget
        sendAdminCreditAutoActivatedEmail({
            requestId: req.id,
            amountUsd,
            txHash: req.txHash,
            amountUsdt: verification.amountUsdt ?? null,
            blockNumber: verification.blockNumber?.toString() ?? null,
            trigger: 'admin-reverify',
            user: {
                fullName: req.user.fullName,
                email: req.user.email,
                username: req.user.username,
                country: req.user.country,
                city: req.user.city,
                newBalanceUsd,
            },
            approvedAt: new Date(),
        }).catch(e => console.error('[email] credit reverify admin:', e))

        return NextResponse.json({
            success: true,
            verified: true,
            amountUsdt: verification.amountUsdt,
            newBalanceUsd,
            blockNumber: verification.blockNumber?.toString(),
        })
    } catch (err: any) {
        if (err.message === 'ALREADY_APPROVED' || err.message === 'ALREADY_REJECTED') {
            return NextResponse.json({ error: `La solicitud ya está ${err.message === 'ALREADY_APPROVED' ? 'aprobada' : 'rechazada'}.` }, { status: 409 })
        }
        console.error('[admin credit reverify] error:', err)
        return NextResponse.json({ error: 'Error interno al acreditar saldo' }, { status: 500 })
    }
}
