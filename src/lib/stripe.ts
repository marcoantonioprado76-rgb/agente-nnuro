import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('[Stripe] STRIPE_SECRET_KEY no configurada')
}

// Use a lazy getter so Stripe only initializes when actually called (not at build time)
let _stripe: Stripe | null = null
export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
      typescript: true,
    })
  }
  return _stripe
}

// Keep backward compat — but guard against build-time initialization
export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { typescript: true })
  : (null as unknown as Stripe)

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
  const year = startDate.getFullYear()
  const month = startDate.getMonth()
  const day = startDate.getDate()
  // Último día del mes siguiente
  const lastDayOfNextMonth = new Date(year, month + 2, 0).getDate()
  // Usar el menor entre el día original y el último día del mes siguiente
  const endDay = Math.min(day, lastDayOfNextMonth)
  return new Date(year, month + 1, endDay, startDate.getHours(), startDate.getMinutes(), startDate.getSeconds(), startDate.getMilliseconds())
}
