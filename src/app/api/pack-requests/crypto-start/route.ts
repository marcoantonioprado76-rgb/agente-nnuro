export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { withUniqueCryptoAmount } from '@/lib/crypto-pay'
import { normalizeMonths, getPeriodPricing } from '@/lib/plan-pricing'

const RECEIVER = process.env.PAYMENT_RECEIVER || ''
const PLAN_RANK: Record<string, number> = { NONE: 0, BASIC: 1, PRO: 2, ELITE: 3 }
const DEFAULT_PRICES: Record<string, number> = { BASIC: 49, PRO: 99, ELITE: 199 }

async function priceOf(plan: string): Promise<number> {
  const s = await prisma.appSetting.findUnique({ where: { key: `PRICE_${plan}` } })
  return s ? parseFloat(s.value) : (DEFAULT_PRICES[plan] ?? 0)
}

/** POST /api/pack-requests/crypto-start — inicia el pago cripto de un plan con monto único (auto-detección). */
export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (!RECEIVER) return NextResponse.json({ error: 'Dirección de pago no configurada por el admin.' }, { status: 503 })

  const body = await req.json().catch(() => ({}))
  const plan = String(body?.plan || '').toUpperCase()
  const months = normalizeMonths(body?.months ?? 1)
  if (!['BASIC', 'PRO', 'ELITE'].includes(plan)) return NextResponse.json({ error: 'Plan inválido' }, { status: 400 })

  // Si ya hay una solicitud pendiente → REANUDAR la cripto no vencida (evita quedar "trabado").
  const existing = await prisma.packPurchaseRequest.findFirst({
    where: { userId: user.id, status: { in: ['PENDING', 'PENDING_VERIFICATION'] } },
    orderBy: { createdAt: 'desc' },
  })
  if (existing) {
    if (existing.status === 'PENDING' && existing.paymentMethod === 'CRYPTO' && existing.expectedAmount != null && (!existing.expiresAt || existing.expiresAt > new Date())) {
      return NextResponse.json({ id: existing.id, receiver: RECEIVER, amount: Number(existing.expectedAmount), expiresAt: existing.expiresAt?.toISOString() ?? null, plan: existing.plan, price: Number(existing.price), resumed: true })
    }
    return NextResponse.json({ error: 'Ya tienes una solicitud pendiente en revisión. Espera a que se procese.' }, { status: 400 })
  }

  // Plan actual (expirado se trata como NONE, igual que en pack-requests).
  const currentUser = await prisma.user.findUnique({ where: { id: user.id }, select: { plan: true, planExpiresAt: true } })
  const planExpired = currentUser?.planExpiresAt ? currentUser.planExpiresAt < new Date() : false
  const currentPlan = planExpired ? 'NONE' : (currentUser?.plan ?? 'NONE')
  const currentRank = PLAN_RANK[currentPlan] ?? 0
  const newRank = PLAN_RANK[plan] ?? 0
  if (newRank < currentRank) return NextResponse.json({ error: 'No puedes bajar a un plan inferior.' }, { status: 400 })
  const isRenewal = newRank === currentRank && currentRank > 0

  // Si el plan activo fue de Fase Global, bloquear renovación por otros métodos (igual que pack-requests).
  if (currentRank > 0) {
    const lastPurchase = await prisma.packPurchaseRequest.findFirst({
      where: { userId: user.id, status: 'APPROVED' },
      orderBy: { reviewedAt: 'desc' },
      select: { paymentMethod: true },
    })
    if ((lastPurchase?.paymentMethod as string) === 'FASE_GLOBAL') {
      return NextResponse.json({ error: 'Tu plan activo es de Fase Global. Cuando expire, podrás re-solicitar con tu próxima recompra.' }, { status: 400 })
    }
  }

  let effectivePrice: number
  if (isRenewal) {
    const renewalSetting = await prisma.appSetting.findUnique({ where: { key: `PRICE_${plan}_RENEWAL` } })
    effectivePrice = renewalSetting ? parseFloat(renewalSetting.value) : await priceOf(plan)
  } else {
    const basePrice = await priceOf(plan)
    const currentPrice = currentRank > 0 ? await priceOf(currentPlan) : 0
    effectivePrice = currentPrice > 0 ? Math.max(basePrice - currentPrice, 1) : basePrice
  }

  // Promoción por período (3/12 meses): el monto a pagar es el precio del período.
  if (months > 1) effectivePrice = (await getPeriodPricing(prisma, plan, months)).price

  const { request, amount, expiresAt } = await withUniqueCryptoAmount(effectivePrice, async (amount, expiresAt, tx) => {
    const request = await tx.packPurchaseRequest.create({
      data: { userId: user.id, plan: plan as any, price: effectivePrice, billingMonths: months, expectedAmount: amount, expiresAt, paymentMethod: 'CRYPTO', status: 'PENDING' },
    })
    return { request, amount, expiresAt }
  })

  return NextResponse.json({ id: request.id, receiver: RECEIVER, amount, expiresAt: expiresAt.toISOString(), plan, price: effectivePrice, isRenewal })
}
