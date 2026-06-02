import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('[Stripe] STRIPE_SECRET_KEY no configurada')
}

// Custom error que el caller puede identificar para devolver 503 explícito
export class StripeNotConfiguredError extends Error {
  constructor() {
    super('STRIPE_SECRET_KEY no configurada en el servidor')
    this.name = 'StripeNotConfiguredError'
  }
}

// Lazy getter: solo inicializa cuando hace falta y lanza error claro si no hay key
let _stripe: Stripe | null = null
export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) throw new StripeNotConfiguredError()
    _stripe = new Stripe(key, { typescript: true })
  }
  return _stripe
}

/**
 * `stripe` es un Proxy que delega a getStripe() en cada acceso. Esto preserva
 * la API anterior (`import { stripe } from '@/lib/stripe'`) sin riesgo de
 * obtener `null` cuando la env var no está cargada (lo que causaba TypeError
 * silenciosos del tipo "Cannot read property 'customers' of null").
 */
export const stripe: Stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    const client = getStripe() as unknown as Record<string | symbol, unknown>
    const value = client[prop]
    return typeof value === 'function' ? (value as (...args: unknown[]) => unknown).bind(client) : value
  },
})

/**
 * Verifica la firma de un webhook de Stripe.
 * Lanza error si la firma es inválida.
 */
export function verifyWebhookSignature(
  body: string | Buffer,
  signature: string
): Stripe.Event {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) {
    throw new Error('STRIPE_WEBHOOK_SECRET no configurada')
  }
  return getStripe().webhooks.constructEvent(body, signature, secret)
}

/**
 * Calcula la fecha de vencimiento a exactamente 1 mes calendario.
 * Si paga el 10 de marzo, vence el 10 de abril.
 * Si paga el 31 de enero, vence el 28/29 de febrero (último día del mes).
 */
export function calculateEndDate(startDate: Date): Date {
  return addCalendarMonths(startDate, 1)
}

/**
 * Calcula end_date según el periodo de facturación.
 * - monthly: +1 mes
 * - quarterly: +3 meses
 * - annual: +12 meses
 * - trial: +trialDays días (default 7)
 */
export type BillingPeriod = 'monthly' | 'quarterly' | 'annual' | 'trial'

export function calculateEndDateByPeriod(
  startDate: Date,
  period: BillingPeriod,
  trialDays = 7
): Date {
  if (period === 'trial') {
    const ms = trialDays * 24 * 60 * 60 * 1000
    return new Date(startDate.getTime() + ms)
  }
  const months = period === 'annual' ? 12 : period === 'quarterly' ? 3 : 1
  return addCalendarMonths(startDate, months)
}

/**
 * Suma N meses calendario respetando el día (si el mes destino no tiene el día,
 * usa el último día de ese mes). Internal helper.
 */
function addCalendarMonths(date: Date, months: number): Date {
  const year = date.getFullYear()
  const month = date.getMonth()
  const day = date.getDate()
  const targetMonth = month + months
  // Último día del mes destino
  const lastDayOfTargetMonth = new Date(year, targetMonth + 1, 0).getDate()
  const endDay = Math.min(day, lastDayOfTargetMonth)
  return new Date(
    year, targetMonth, endDay,
    date.getHours(), date.getMinutes(), date.getSeconds(), date.getMilliseconds()
  )
}
