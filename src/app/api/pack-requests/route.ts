export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { verifyBscTransaction } from '@/lib/blockchain'
import { sendAdminNewPlanRequestEmail, sendAdminPlanAutoActivatedEmail } from '@/lib/email'
import { reactivateUserAssetsAfterPlanRenewal } from '@/lib/plan-lifecycle'

/**
 * Dispara la notificación al admin (fire-and-forget) cuando se crea una solicitud PENDING.
 * No usar para auto-aprobados (CRYPTO on-chain verificado).
 */
async function notifyAdminNewPlanRequest(req: {
    id: string
    plan: string
    price: any
    paymentMethod: string
    paymentProofUrl?: string | null
    txHash?: string | null
    faseGlobalCode?: string | null
    faseGlobalNote?: string | null
    createdAt: Date
}, userId: string) {
    try {
        const u = await prisma.user.findUnique({
            where: { id: userId },
            select: { fullName: true, email: true, username: true, country: true, city: true },
        })
        if (!u) return
        await sendAdminNewPlanRequestEmail({
            requestId: req.id,
            plan: req.plan,
            price: Number(req.price),
            paymentMethod: req.paymentMethod,
            paymentProofUrl: req.paymentProofUrl,
            txHash: req.txHash,
            faseGlobalCode: req.faseGlobalCode,
            faseGlobalNote: req.faseGlobalNote,
            user: u,
            createdAt: req.createdAt,
        })
    } catch (e) {
        console.error('[pack-requests] admin notify error:', e)
    }
}

const DEFAULT_PRICES: Record<string, number> = {
  BASIC: 49,
  PRO: 99,
  ELITE: 199,
}

const TX_HASH_REGEX = /^0x[a-fA-F0-9]{64}$/

export async function GET() {
  try {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const requests = await prisma.packPurchaseRequest.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      requests: requests.map(r => ({ ...r, price: Number(r.price), blockNumber: r.blockNumber?.toString() ?? null })),
    })
  } catch (err) {
    console.error('[GET /api/pack-requests]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const body = await request.json()
    let plan = (body.plan as string)?.toUpperCase()
    const paymentMethod: 'MANUAL' | 'CRYPTO' | 'FASE_GLOBAL' =
      body.paymentMethod === 'CRYPTO' ? 'CRYPTO'
      : body.paymentMethod === 'FASE_GLOBAL' ? 'FASE_GLOBAL'
      : 'MANUAL'
    const paymentProofUrl = (body.paymentProofUrl as string) ?? null
    const txHash = (body.txHash as string) ?? null
    const faseGlobalCode = (body.faseGlobalCode as string)?.trim() ?? null
    const faseGlobalNote = (body.faseGlobalNote as string)?.trim() ?? null

    // Fase Global siempre activa BASIC
    if (paymentMethod === 'FASE_GLOBAL') {
      plan = 'BASIC'
    }

    if (!plan || !['BASIC', 'PRO', 'ELITE'].includes(plan)) {
      return NextResponse.json({ error: 'Plan inválido' }, { status: 400 })
    }

    // Validaciones según método de pago
    if (paymentMethod === 'MANUAL' && !paymentProofUrl) {
      return NextResponse.json({ error: 'Debes subir tu comprobante de pago.' }, { status: 400 })
    }

    if (paymentMethod === 'FASE_GLOBAL') {
      if (!paymentProofUrl) {
        return NextResponse.json({ error: 'Debes subir tu comprobante de Fase Global.' }, { status: 400 })
      }
      if (!faseGlobalCode || faseGlobalCode.length < 2 || faseGlobalCode.length > 100) {
        return NextResponse.json({ error: 'El código de Fase Global debe tener entre 2 y 100 caracteres.' }, { status: 400 })
      }
    }

    // Validar que paymentProofUrl sea una URL válida (cuando aplica)
    if (paymentProofUrl) {
      try {
        const u = new URL(paymentProofUrl)
        if (u.protocol !== 'https:' && u.protocol !== 'http:') throw new Error()
      } catch {
        return NextResponse.json({ error: 'URL del comprobante inválida.' }, { status: 400 })
      }
    }

    if (paymentMethod === 'CRYPTO') {
      if (!txHash || !TX_HASH_REGEX.test(txHash)) {
        return NextResponse.json({ error: 'Hash de transacción inválido.' }, { status: 400 })
      }
      // Verificar unicidad del txHash (evitar double-spend)
      const existingTx = await prisma.packPurchaseRequest.findUnique({ where: { txHash } })
      if (existingTx) {
        return NextResponse.json({ error: 'Este hash de transacción ya fue utilizado.' }, { status: 409 })
      }
    }

    // No puede haber solicitud PENDING o PENDING_VERIFICATION activa
    const existing = await prisma.packPurchaseRequest.findFirst({
      where: { userId: user.id, status: { in: ['PENDING', 'PENDING_VERIFICATION'] } },
    })
    if (existing) {
      return NextResponse.json({
        error: 'Ya tienes una solicitud pendiente. Espera que sea procesada.',
      }, { status: 400 })
    }

    // Precio del plan
    const priceSetting = await prisma.appSetting.findUnique({ where: { key: `PRICE_${plan}` } })
    const price = priceSetting ? parseFloat(priceSetting.value) : DEFAULT_PRICES[plan]

    // --- Lógica de renovación / upgrade / nueva activación ---
    const currentUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { plan: true, planExpiresAt: true },
    })
    const PLAN_RANK: Record<string, number> = { NONE: 0, BASIC: 1, PRO: 2, ELITE: 3 }
    // Si el plan está expirado se trata como NONE (independiente de lo que diga la BD)
    const planExpired = currentUser?.planExpiresAt ? currentUser.planExpiresAt < new Date() : false
    const effectivePlan = planExpired ? 'NONE' : (currentUser?.plan ?? 'NONE')
    const currentRank = PLAN_RANK[effectivePlan] ?? 0
    const newRank = PLAN_RANK[plan] ?? 0

    // Si el plan activo (y NO expirado) fue activado vía Fase Global, bloquear renovación por otros métodos
    if (paymentMethod !== 'FASE_GLOBAL' && currentRank > 0) {
      const lastPurchase = await prisma.packPurchaseRequest.findFirst({
        where: { userId: user.id, status: 'APPROVED' },
        orderBy: { reviewedAt: 'desc' },
        select: { paymentMethod: true },
      })
      if ((lastPurchase?.paymentMethod as string) === 'FASE_GLOBAL') {
        return NextResponse.json({
          error: 'Tu plan activo es de Fase Global. Cuando expire, podrás re-solicitar con tu próxima recompra.',
        }, { status: 400 })
      }
    }

    // Renovación = mismo plan activo
    const isRenewal = newRank === currentRank && currentRank > 0

    if (newRank < currentRank) {
      return NextResponse.json({ error: 'No puedes bajar a un plan inferior.' }, { status: 400 })
    }
    if (newRank === 0) {
      return NextResponse.json({ error: 'Plan inválido.' }, { status: 400 })
    }

    let effectivePrice: number
    if (isRenewal) {
      // Renovación: usa precio de renovación por plan (PRICE_X_RENEWAL), si no existe usa precio base
      const renewalKey = `PRICE_${plan}_RENEWAL`
      const renewalSetting = await prisma.appSetting.findUnique({ where: { key: renewalKey } })
      if (renewalSetting) {
        effectivePrice = parseFloat(renewalSetting.value)
      } else {
        // fallback: precio base del plan
        const baseSetting = await prisma.appSetting.findUnique({ where: { key: `PRICE_${plan}` } })
        effectivePrice = baseSetting ? parseFloat(baseSetting.value) : DEFAULT_PRICES[plan] ?? 19
      }
    } else {
      // Nueva activación o upgrade: precio diferencial
      let currentPrice = 0
      if (currentRank > 0 && currentUser?.plan) {
        const currentPriceSetting = await prisma.appSetting.findUnique({ where: { key: `PRICE_${currentUser.plan}` } })
        currentPrice = currentPriceSetting
          ? parseFloat(currentPriceSetting.value)
          : DEFAULT_PRICES[currentUser.plan] ?? 0
      }
      effectivePrice = currentPrice > 0 ? Math.max(price - currentPrice, 1) : price
    }

    // --- Para CRYPTO: verificar on-chain ---
    if (paymentMethod === 'CRYPTO' && txHash) {
      const verification = await verifyBscTransaction(txHash, effectivePrice)

      if (verification.success) {
        // Verificación inmediata exitosa → activar directamente en transacción
        const req = await prisma.$transaction(async (tx) => {
          const newReq = await tx.packPurchaseRequest.create({
            data: {
              userId: user.id,
              plan: plan as any,
              price: effectivePrice,
              paymentMethod: 'CRYPTO',
              txHash,
              blockNumber: verification.blockNumber ?? null,
              status: 'APPROVED',
              reviewedAt: new Date(),
              notes: `Auto-aprobado on-chain. USDT recibido: ${verification.amountUsdt?.toFixed(2)}`,
            },
          })

          if (isRenewal) {
            await tx.$executeRaw`
              UPDATE users
              SET is_active = true,
                  plan_expires_at = GREATEST(COALESCE(plan_expires_at, NOW()), NOW()) + INTERVAL '30 days'
              WHERE id = ${user.id}::uuid
            `
          } else {
            await tx.$executeRaw`
              UPDATE users
              SET plan = ${plan}::\"UserPlan\",
                  is_active = true,
                  plan_expires_at = NOW() + INTERVAL '30 days'
              WHERE id = ${user.id}::uuid
            `
          }

          // Reactivar stores/bots que el cron expirePlans haya pausado antes.
          await reactivateUserAssetsAfterPlanRenewal(user.id, tx)

          await tx.auditLog.create({
            data: {
              userId: user.id,
              actorUserId: user.id,
              action: 'PURCHASE_CRYPTO_AUTO_APPROVED',
              entityType: 'PackPurchaseRequest',
              entityId: newReq.id,
              payload: { plan, price: effectivePrice, txHash, amountUsdt: verification.amountUsdt, blockNumber: verification.blockNumber?.toString() },
            },
          })

          return newReq
        })

        // Notificar al admin en background (no bloquea el response)
        ;(async () => {
          try {
            const u = await prisma.user.findUnique({
              where: { id: user.id },
              select: { fullName: true, email: true, username: true, country: true, city: true },
            })
            if (!u) return
            await sendAdminPlanAutoActivatedEmail({
              requestId: req.id,
              plan: req.plan as string,
              price: Number(req.price),
              txHash: req.txHash!,
              amountUsdt: verification.amountUsdt ?? null,
              blockNumber: req.blockNumber?.toString() ?? null,
              trigger: 'auto-onchain',
              user: u,
              approvedAt: new Date(),
            })
          } catch (e) {
            console.error('[pack-requests] admin auto-activated notify error:', e)
          }
        })()

        return NextResponse.json({
          success: true,
          status: 'approved',
          message: '¡Plan activado correctamente! La transacción fue verificada on-chain.',
          request: {
            ...req,
            price: Number(req.price),
            // blockNumber es BigInt en DB → NextResponse.json no lo serializa, hay que convertir
            blockNumber: req.blockNumber?.toString() ?? null,
          },
        })
      }

      // Verificación fallida por latencia → PENDING_VERIFICATION para el cron
      const req = await prisma.packPurchaseRequest.create({
        data: {
          userId: user.id,
          plan: plan as any,
          price: effectivePrice,
          paymentMethod: 'CRYPTO',
          txHash,
          status: 'PENDING_VERIFICATION',
        },
      })

      // Notificar al admin en background
      notifyAdminNewPlanRequest(req, user.id).catch(() => {})

      return NextResponse.json({
        success: true,
        status: 'pending_verification',
        message: 'Transacción recibida. Verificando en la blockchain, puede tardar unos minutos.',
        request: {
          ...req,
          price: Number(req.price),
          blockNumber: req.blockNumber?.toString() ?? null,
        },
      })
    }

    // --- Pago FASE_GLOBAL ---
    if (paymentMethod === 'FASE_GLOBAL') {
      try {
        const req = await prisma.$transaction(async (tx) => {
          // Lock por usuario para evitar doble-submit simultáneo
          await tx.$queryRaw`SELECT id FROM users WHERE id = ${user.id}::uuid FOR UPDATE`
          const dup = await tx.packPurchaseRequest.findFirst({
            where: { userId: user.id, status: { in: ['PENDING', 'PENDING_VERIFICATION'] } },
          })
          if (dup) throw new Error('DUPLICATE_REQUEST')

          return tx.packPurchaseRequest.create({
            data: {
              userId: user.id,
              plan: 'BASIC',
              price: 0,
              paymentProofUrl,
              paymentMethod: 'FASE_GLOBAL' as any,
              faseGlobalCode,
              faseGlobalNote,
              status: 'PENDING',
            } as any,
          })
        })
        // Notificar al admin en background
        notifyAdminNewPlanRequest(req, user.id).catch(() => {})
        return NextResponse.json({
          success: true,
          status: 'pending',
          request: { ...req, price: Number(req.price), blockNumber: req.blockNumber?.toString() ?? null },
        })
      } catch (err: any) {
        if (err?.message === 'DUPLICATE_REQUEST') {
          return NextResponse.json({ error: 'Ya tienes una solicitud pendiente. Espera que sea procesada.' }, { status: 400 })
        }
        throw err
      }
    }

    // --- Pago MANUAL ---
    const req = await prisma.packPurchaseRequest.create({
      data: {
        userId: user.id,
        plan: plan as any,
        price: effectivePrice,
        paymentProofUrl,
        paymentMethod: 'MANUAL',
        status: 'PENDING',
      },
    })

    // Notificar al admin en background
    notifyAdminNewPlanRequest(req, user.id).catch(() => {})

    return NextResponse.json({
      success: true,
      status: 'pending',
      request: { ...req, price: Number(req.price), blockNumber: req.blockNumber?.toString() ?? null },
    })
  } catch (err) {
    console.error('[POST /api/pack-requests]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
