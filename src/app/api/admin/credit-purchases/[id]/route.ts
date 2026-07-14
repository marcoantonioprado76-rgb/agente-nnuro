export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser, unauthorizedAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import { sendUserCreditPurchaseApprovedEmail, sendUserCreditPurchaseRejectedEmail } from '@/lib/email'

/**
 * PATCH /api/admin/credit-purchases/[id]
 * Aprueba o rechaza una solicitud de compra de créditos AI.
 *
 * - approve → suma `amountUsd` al `aiBalanceUsd` del usuario, marca status=APPROVED,
 *             crea audit log y un AIUsageLog positivo (reason=credit_purchase) para
 *             que aparezca en el historial del usuario como recarga.
 * - reject  → marca status=REJECTED con notas.
 *
 * Toda la operación va en transacción con FOR UPDATE para evitar doble aprobación.
 */
export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const admin = await getAdminUser()
    if (!admin) return unauthorizedAdmin()

    let body: any
    try { body = await request.json() } catch { return NextResponse.json({ error: 'Body inválido' }, { status: 400 }) }

    const action = body?.action as 'approve' | 'reject' | undefined
    const notes = typeof body?.notes === 'string' ? body.notes.slice(0, 500) : null

    if (!action || !['approve', 'reject'].includes(action)) {
        return NextResponse.json({ error: 'Acción inválida. Usa approve o reject.' }, { status: 400 })
    }

    const purchaseRequest = await (prisma as any).creditPurchaseRequest.findUnique({
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
            const result = await prisma.$transaction(async (tx) => {
                // Re-lock + recheck dentro de la tx
                const locked = await tx.$queryRaw<Array<{ status: string; amount_usd: string }>>`
                    SELECT status, amount_usd::text
                    FROM credit_purchase_requests
                    WHERE id = ${params.id}::uuid
                    FOR UPDATE
                `
                if (locked[0]?.status !== 'PENDING') {
                    throw new Error('ALREADY_PROCESSED')
                }
                const amountUsd = parseFloat(locked[0].amount_usd)

                // Lock user para evitar race en el balance
                await tx.$queryRaw`
                    SELECT id FROM users WHERE id = ${purchaseRequest.userId}::uuid FOR UPDATE
                `

                // 1) Marcar solicitud como aprobada
                await (tx as any).creditPurchaseRequest.update({
                    where: { id: params.id },
                    data: {
                        status: 'APPROVED',
                        notes: notes ?? null,
                        reviewedBy: admin.id,
                        reviewedAt: new Date(),
                    },
                })

                // 2) Sumar al balance USD del usuario + resetear low_balance_warned_at
                //    para que el aviso "saldo bajo" se vuelva a disparar si gasta el nuevo
                //    saldo más adelante (el throttle de 24h se reinicia con cada recarga).
                await tx.$executeRaw`
                    UPDATE users
                    SET ai_balance_usd = ai_balance_usd + ${amountUsd}::numeric,
                        low_balance_warned_at = NULL
                    WHERE id = ${purchaseRequest.userId}::uuid
                `

                // 3) Log positivo en historial de uso (recarga visible para el usuario)
                await (tx as any).aIUsageLog.create({
                    data: {
                        userId: purchaseRequest.userId,
                        model: 'credit_purchase',
                        reason: 'credit_purchase',
                        costUsd: -amountUsd,   // negativo = entrada de saldo
                        metadata: { purchaseId: params.id, adminId: admin.id },
                    },
                })

                // 4) Audit log estándar
                await tx.auditLog.create({
                    data: {
                        userId: purchaseRequest.userId,
                        actorUserId: admin.id,
                        action: 'CREDIT_PURCHASE_APPROVED',
                        entityType: 'CreditPurchaseRequest',
                        entityId: params.id,
                        payload: { amountUsd, adminId: admin.id },
                    },
                })

                return { amountUsd }
            })

            // Notificar al usuario fire-and-forget — no bloquea la respuesta
            ;(async () => {
                try {
                    const fresh = await prisma.user.findUnique({
                        where: { id: purchaseRequest.userId },
                        select: { aiBalanceUsd: true },
                    })
                    await sendUserCreditPurchaseApprovedEmail({
                        email: purchaseRequest.user.email,
                        fullName: purchaseRequest.user.fullName,
                        requestId: params.id,
                        amountUsd: Number(result.amountUsd),
                        newBalanceUsd: fresh ? Number(fresh.aiBalanceUsd) : Number(result.amountUsd),
                        paymentMethod: purchaseRequest.paymentMethod,
                        reviewedAt: new Date(),
                    })
                } catch (e) {
                    console.error('[credit-purchases approve] user notify error:', e)
                }
            })()

            return NextResponse.json({ success: true, action: 'approved', amountUsd: Number(result.amountUsd) })
        } catch (err: any) {
            if (err.message === 'ALREADY_PROCESSED') {
                return NextResponse.json({ error: 'Esta solicitud ya fue procesada.' }, { status: 409 })
            }
            console.error('[POST /api/admin/credit-purchases approve]', err)
            return NextResponse.json({ error: 'Error interno' }, { status: 500 })
        }
    }

    // reject
    await prisma.$transaction(async (tx) => {
        await (tx as any).creditPurchaseRequest.update({
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
                action: 'CREDIT_PURCHASE_REJECTED',
                entityType: 'CreditPurchaseRequest',
                entityId: params.id,
                payload: { notes },
            },
        })
    })

    // Notificar al usuario fire-and-forget
    ;(async () => {
        try {
            await sendUserCreditPurchaseRejectedEmail({
                email: purchaseRequest.user.email,
                fullName: purchaseRequest.user.fullName,
                requestId: params.id,
                amountUsd: Number(purchaseRequest.amountUsd),
                notes,
                reviewedAt: new Date(),
            })
        } catch (e) {
            console.error('[credit-purchases reject] user notify error:', e)
        }
    })()

    return NextResponse.json({ success: true, action: 'rejected' })
}
