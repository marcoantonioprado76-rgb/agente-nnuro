export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { BILLING_PERIODS, getPeriodPricing } from '@/lib/plan-pricing'

/**
 * Matriz de precios por plan y período (mensual/trimestral/anual) con su
 * descuento y ahorro. Para el selector de período en la página de planes.
 */
export async function GET() {
  try {
    const plans = ['BASIC', 'PRO', 'ELITE']
    const out: Record<string, Record<number, { price: number; discount: number; saved: number; months: number }>> = {}
    for (const plan of plans) {
      out[plan] = {}
      for (const p of BILLING_PERIODS) {
        const pr = await getPeriodPricing(prisma, plan, p.months)
        out[plan][p.months] = { price: pr.price, discount: pr.discount, saved: pr.saved, months: p.months }
      }
    }
    return NextResponse.json({
      periods: BILLING_PERIODS.map(p => ({ months: p.months, key: p.key, label: p.label })),
      pricing: out,
    })
  } catch (err) {
    console.error('[GET /api/plan/pricing]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
