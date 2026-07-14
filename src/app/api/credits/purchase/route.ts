export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { verifyBscTransaction } from '@/lib/blockchain'
import {
    sendAdminNewCreditPurchaseEmail,
    sendAdminCreditAutoActivatedEmail,
    sendUserCreditPurchaseApprovedEmail,
} from '@/lib/email'

/**
 * Endpoints de COMPRA de créditos AI (saldo USD).
 *
 * Estos endpoints están DESCOPLADOS de los toggles STORE_PAYMENT_* del checkout de planes.
 * La compra de créditos siempre está disponible.
 *
 * Métodos aceptados:
 *  - MANUAL: transferencia con comprobante (admin debe aprobar).
 *  - CRYPTO: USDT-BEP20 con verificación on-chain (auto-aprobación si pasa los 6 checks).
 */

const MIN_AMOUNT = 1     // mínimo $1
const MAX_AMOUNT = 1000  // máximo $1000 por compra
const MAX_PENDING_PER_USER = 5  // tope anti-spam de solicitudes pendientes
const TX_HASH_REGEX = /^0x[a-fA-F0-9]{64}$/

// POST — crear solicitud de compra de créditos
export async function POST(req: NextRequest) {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    let body: any
    try { body = await req.json() } catch { return NextResponse.json({ error: 'Body inválido' }, { status: 400 }) }

    const amountUsdRaw = Number(body?.amountUsd)
    const paymentMethod: 'MANUAL' | 'CRYPTO' = body?.paymentMethod === 'CRYPTO' ? 'CRYPTO' : 'MANUAL'
    const paymentProofUrl = typeof body?.paymentProofUrl === 'string' ? body.paymentProofUrl.trim() : null
    const txHash = typeof body?.txHash === 'string' ? body.txHash.trim() : null
    const notes = typeof body?.notes === 'string' ? body.notes.slice(0, 500) : null

    // ── Validación de monto ─────────────────────────────────────────────
    if (!Number.isFinite(amountUsdRaw) || amountUsdRaw < MIN_AMOUNT || amountUsdRaw > MAX_AMOUNT) {
        return NextResponse.json(
            { error: `El monto debe estar entre $${MIN_AMOUNT} y $${MAX_AMOUNT} USD.` },
            { status: 400 }
        )
    }
    const amountUsd = Math.round(amountUsdRaw * 100) / 100   // 2 decimales

    // ── Validación por método de pago ───────────────────────────────────
    if (paymentMethod === 'CRYPTO') {
        if (!txHash || !TX_HASH_REGEX.test(txHash)) {
            return NextResponse.json({ error: 'Hash de transacción inválido. Debe empezar con 0x y tener 64 caracteres hex.' }, { status: 400 })
        }
        // Verificar unicidad del txHash a través de TODA la tabla (no permite re-usar la misma tx)
        const existingTx = await (prisma as any).creditPurchaseRequest.findUnique({ where: { txHash } })
        if (existingTx) {
            return NextResponse.json({ error: 'Este hash de transacción ya fue utilizado.' }, { status: 409 })
        }
    }

    // ── Anti-spam: limitar solicitudes PENDING/PENDING_VERIFICATION por usuario ─
    const pendingCount = await (prisma as any).creditPurchaseRequest.count({
        where: { userId: user.id, status: { in: ['PENDING', 'PENDING_VERIFICATION'] } },
    })
    if (pendingCount >= MAX_PENDING_PER_USER) {
        return NextResponse.json(
            { error: `Ya tenés ${pendingCount} solicitudes pendientes. Esperá a que el admin las procese antes de enviar otra.` },
            { status: 429 }
        )
    }

    // ── Flujo CRYPTO: verificar on-chain inmediatamente ─────────────────
    if (paymentMethod === 'CRYPTO' && txHash) {
        const verification = await verifyBscTransaction(txHash, amountUsd)

        if (verification.success) {
            // Verificación inmediata exitosa → APROBAR y acreditar saldo en transacción
            const result = await prisma.$transaction(async (tx) => {
                const created = await (tx as any).creditPurchaseRequest.create({
                    data: {
                        userId: user.id,
                        amountUsd,
                        paymentMethod: 'CRYPTO',
                        txHash,
                        blockNumber: verification.blockNumber ?? null,
                        status: 'APPROVED',
                        reviewedAt: new Date(),
                        notes: `Auto-aprobado on-chain. USDT: ${verification.amountUsdt?.toFixed(2)}`,
                    },
                })

                // Lock user antes de sumar
                await tx.$queryRaw`SELECT id FROM users WHERE id = ${user.id}::uuid FOR UPDATE`

                // Sumar saldo USD + reset low_balance_warned_at (para que el aviso
                // "saldo bajo" se vuelva a disparar tras gastar este nuevo saldo).
                await tx.$executeRaw`
                    UPDATE users
                    SET ai_balance_usd = ai_balance_usd + ${amountUsd}::numeric,
                        low_balance_warned_at = NULL
                    WHERE id = ${user.id}::uuid
                `

                // Log positivo en historial (visible para el usuario)
                await (tx as any).aIUsageLog.create({
                    data: {
                        userId: user.id,
                        model: 'credit_purchase',
                        reason: 'credit_purchase',
                        costUsd: -amountUsd,
                        metadata: { purchaseId: created.id, txHash, amountUsdt: verification.amountUsdt, trigger: 'auto-onchain' },
                    },
                })

                // Audit log
                await tx.auditLog.create({
                    data: {
                        userId: user.id,
                        actorUserId: user.id,
                        action: 'CREDIT_PURCHASE_CRYPTO_AUTO_APPROVED',
                        entityType: 'CreditPurchaseRequest',
                        entityId: created.id,
                        payload: { amountUsd, txHash, amountUsdt: verification.amountUsdt, blockNumber: verification.blockNumber?.toString() },
                    },
                })

                // Leer balance actual para el email
                const fresh = await tx.user.findUnique({
                    where: { id: user.id },
                    select: { aiBalanceUsd: true, fullName: true, email: true, username: true, country: true, city: true },
                })

                return { created, freshUser: fresh }
            })

            // Notificar al admin + al usuario (fire-and-forget)
            ;(async () => {
                try {
                    if (result.freshUser) {
                        await sendAdminCreditAutoActivatedEmail({
                            requestId: result.created.id,
                            amountUsd,
                            txHash,
                            amountUsdt: verification.amountUsdt ?? null,
                            blockNumber: verification.blockNumber?.toString() ?? null,
                            trigger: 'auto-onchain',
                            user: {
                                fullName: result.freshUser.fullName,
                                email: result.freshUser.email,
                                username: result.freshUser.username,
                                country: result.freshUser.country,
                                city: result.freshUser.city,
                                newBalanceUsd: Number(result.freshUser.aiBalanceUsd ?? 0),
                            },
                            approvedAt: new Date(),
                        })
                    }
                } catch (e) {
                    console.error('[credits/purchase] admin auto-activated notify error:', e)
                }
            })()

            ;(async () => {
                try {
                    if (result.freshUser) {
                        await sendUserCreditPurchaseApprovedEmail({
                            email: result.freshUser.email,
                            fullName: result.freshUser.fullName,
                            requestId: result.created.id,
                            amountUsd,
                            newBalanceUsd: Number(result.freshUser.aiBalanceUsd ?? 0),
                            paymentMethod: 'CRYPTO',
                            reviewedAt: new Date(),
                        })
                    }
                } catch (e) {
                    console.error('[credits/purchase] user approved notify error:', e)
                }
            })()

            return NextResponse.json({
                success: true,
                status: 'approved',
                message: '¡Saldo acreditado! La transacción fue verificada on-chain.',
                purchase: {
                    id: result.created.id,
                    amountUsd: Number(result.created.amountUsd),
                    status: 'APPROVED',
                    blockNumber: result.created.blockNumber?.toString() ?? null,
                    createdAt: result.created.createdAt,
                },
            }, { status: 201 })
        }

        // Verificación NO exitosa al instante → PENDING_VERIFICATION para el cron
        const created = await (prisma as any).creditPurchaseRequest.create({
            data: {
                userId: user.id,
                amountUsd,
                paymentMethod: 'CRYPTO',
                txHash,
                status: 'PENDING_VERIFICATION',
                notes: `Esperando confirmaciones on-chain. Último error: ${verification.error}`,
            },
        })

        // Notificar al admin (fire-and-forget)
        ;(async () => {
            try {
                const u = await prisma.user.findUnique({
                    where: { id: user.id },
                    select: { fullName: true, email: true, username: true, country: true, city: true, aiBalanceUsd: true },
                })
                if (!u) return
                await sendAdminNewCreditPurchaseEmail({
                    requestId: created.id,
                    amountUsd,
                    paymentMethod: 'CRYPTO',
                    paymentProofUrl: null,
                    notes: `🪙 TX ${txHash.slice(0, 10)}...${txHash.slice(-6)} esperando confirmaciones`,
                    user: {
                        fullName: u.fullName, email: u.email, username: u.username,
                        country: u.country, city: u.city,
                        aiBalanceUsd: Number(u.aiBalanceUsd ?? 0),
                    },
                    createdAt: created.createdAt,
                })
            } catch (e) {
                console.error('[credits/purchase] admin pending notify error:', e)
            }
        })()

        return NextResponse.json({
            success: true,
            status: 'pending_verification',
            message: 'Transacción recibida. Verificando en la blockchain, puede tardar unos minutos.',
            purchase: {
                id: created.id,
                amountUsd: Number(created.amountUsd),
                status: 'PENDING_VERIFICATION',
                blockNumber: null,
                createdAt: created.createdAt,
            },
        }, { status: 201 })
    }

    // ── Flujo MANUAL: requiere comprobante, admin aprueba ───────────────
    const created = await (prisma as any).creditPurchaseRequest.create({
        data: {
            userId: user.id,
            amountUsd,
            paymentMethod: 'MANUAL',
            paymentProofUrl,
            notes,
            status: 'PENDING',
        },
        select: {
            id: true,
            amountUsd: true,
            paymentMethod: true,
            paymentProofUrl: true,
            status: true,
            createdAt: true,
        },
    })

    // Notificar al admin (fire-and-forget)
    ;(async () => {
        try {
            const userInfo = await prisma.user.findUnique({
                where: { id: user.id },
                select: { fullName: true, email: true, username: true, country: true, city: true, aiBalanceUsd: true },
            })
            if (!userInfo) return
            await sendAdminNewCreditPurchaseEmail({
                requestId: created.id,
                amountUsd,
                paymentMethod: 'MANUAL',
                paymentProofUrl,
                notes,
                user: {
                    fullName: userInfo.fullName,
                    email: userInfo.email,
                    username: userInfo.username,
                    country: userInfo.country,
                    city: userInfo.city,
                    aiBalanceUsd: Number(userInfo.aiBalanceUsd ?? 0),
                },
                createdAt: created.createdAt,
            })
        } catch (e) {
            console.error('[credits/purchase] admin notify error:', e)
        }
    })()

    return NextResponse.json({
        success: true,
        status: 'pending',
        purchase: { ...created, amountUsd: Number(created.amountUsd) },
    }, { status: 201 })
}

// GET — listar mis solicitudes de compra de créditos
export async function GET() {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const purchases = await (prisma as any).creditPurchaseRequest.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 30,
        select: {
            id: true,
            amountUsd: true,
            paymentMethod: true,
            paymentProofUrl: true,
            txHash: true,
            blockNumber: true,
            status: true,
            notes: true,
            createdAt: true,
            reviewedAt: true,
        },
    })

    // Normalizar Decimal → number y BigInt → string antes de serializar
    return NextResponse.json({
        purchases: purchases.map((p: any) => ({
            ...p,
            amountUsd: Number(p.amountUsd),
            blockNumber: p.blockNumber?.toString() ?? null,
        })),
    })
}
