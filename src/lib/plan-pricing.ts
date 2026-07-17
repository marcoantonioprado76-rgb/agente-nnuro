/**
 * Precios por PERÍODO de facturación de los planes (promociones).
 *  - Mensual (1 mes): precio base del plan.
 *  - Trimestral (3 meses): base×3 con descuento (DISCOUNT_3M, def. 10%).
 *  - Anual (12 meses): base×12 con descuento (DISCOUNT_12M, def. 20%).
 *
 * Beneficios de pagar más largo: el descuento + créditos IA proporcionales
 * (créditos_del_plan × meses) al activar.
 *
 * Todo configurable desde el panel admin (appSetting).
 */
import type { Prisma, PrismaClient } from '@prisma/client'
type Db = PrismaClient | Prisma.TransactionClient

export const DEFAULT_PRICES: Record<string, number> = { BASIC: 49, PRO: 99, ELITE: 199 }

export interface BillingPeriod {
  months: number
  key: 'MENSUAL' | 'TRIMESTRAL' | 'ANUAL'
  label: string
  discountKey: string | null
  defaultDiscount: number
}

export const BILLING_PERIODS: BillingPeriod[] = [
  { months: 1,  key: 'MENSUAL',    label: 'Mensual',    discountKey: null,          defaultDiscount: 0 },
  { months: 3,  key: 'TRIMESTRAL', label: 'Trimestral', discountKey: 'DISCOUNT_3M', defaultDiscount: 10 },
  { months: 12, key: 'ANUAL',      label: 'Anual',      discountKey: 'DISCOUNT_12M', defaultDiscount: 20 },
]

/** Normaliza cualquier número de meses a un período válido (1/3/12). */
export function normalizeMonths(m: any): number {
  const n = parseInt(String(m), 10)
  return BILLING_PERIODS.some(p => p.months === n) ? n : 1
}

/** Precio base mensual del plan (config o default). */
export async function getBasePrice(db: Db, plan: string): Promise<number> {
  const s = await db.appSetting.findUnique({ where: { key: `PRICE_${plan}` } })
  return s ? parseFloat(s.value) : (DEFAULT_PRICES[plan] ?? 0)
}

/** Descuento (%) de un período, configurable. */
export async function getPeriodDiscount(db: Db, months: number): Promise<number> {
  const period = BILLING_PERIODS.find(p => p.months === months)
  if (!period || !period.discountKey) return 0
  const s = await db.appSetting.findUnique({ where: { key: period.discountKey } })
  const d = s?.value != null && s.value !== '' ? parseFloat(s.value) : period.defaultDiscount
  return isNaN(d) ? period.defaultDiscount : Math.max(0, Math.min(90, d))
}

/**
 * Precio de un plan para un período. Devuelve también el ahorro y los días.
 * @returns { price, months, days, discount, base, saved }
 */
export async function getPeriodPricing(db: Db, plan: string, months: number) {
  const m = normalizeMonths(months)
  const base = await getBasePrice(db, plan)
  if (m === 1) return { price: base, months: 1, days: 30, discount: 0, base, saved: 0 }
  const discount = await getPeriodDiscount(db, m)
  const full = base * m
  const price = Math.round(full * (1 - discount / 100) * 100) / 100
  return { price, months: m, days: m * 30, discount, base, saved: Math.round((full - price) * 100) / 100 }
}
