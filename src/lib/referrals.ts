/**
 * Programa de referidos de NÜRO — 1 nivel + recompensa en SALDO interno (USD).
 *
 * Modelo (ver docs/REFERIDOS-NURO.md):
 *  - Cada usuario tiene un `referralCode` (por defecto = su username).
 *  - Al registrarse con el código de otro, se crea un `Referral` en estado PENDING.
 *  - Cuando el referido PAGA su plan, se acredita al referidor una comisión
 *    (% del pago) a `ai_balance_usd`, y el Referral pasa a COMPLETED. Idempotente:
 *    solo se paga si el Referral está PENDING (una sola vez por referido).
 *
 * A prueba de fallos: nada de esto debe romper el registro ni la aprobación de
 * pago; los errores se tragan y se loguean.
 */
import type { Prisma, PrismaClient } from '@prisma/client'

/** Cliente Prisma o cliente de transacción — ambos sirven. */
type Db = PrismaClient | Prisma.TransactionClient

/** % del pago del referido que gana el referidor (configurable por env). */
export const REFERRAL_PERCENT = Math.max(0, Math.min(100, Number(process.env.REFERRAL_COMMISSION_PERCENT ?? 20)))

/** Busca al referidor por su código (o username), sin distinguir mayúsculas. */
export async function resolveReferrer(db: Db, code: string) {
  const norm = String(code || '').trim()
  if (!norm) return null
  return db.user.findFirst({
    where: {
      OR: [
        { referralCode: { equals: norm, mode: 'insensitive' } },
        { username: { equals: norm, mode: 'insensitive' } },
      ],
    },
    select: { id: true, username: true },
  })
}

/**
 * Al registrarse un usuario con un código de referido: valida, evita el
 * auto-referido y crea el registro PENDING. Nunca lanza.
 */
export async function attachReferralOnSignup(db: Db, newUserId: string, code?: string | null) {
  try {
    if (!code) return
    const referrer = await resolveReferrer(db, code)
    if (!referrer || referrer.id === newUserId) return // no existe o se refirió a sí mismo
    // referredId es @unique → si por alguna razón ya existe, no duplica.
    await db.referral.create({ data: { referrerId: referrer.id, referredId: newUserId } }).catch(() => {})
    await db.user.update({ where: { id: referrer.id }, data: { referralCount: { increment: 1 } } }).catch(() => {})
  } catch (e) {
    console.error('[referrals] attachReferralOnSignup:', e instanceof Error ? e.message : e)
  }
}

/**
 * Cuando un usuario paga su plan: si fue referido y el Referral sigue PENDING,
 * acredita la comisión al referidor (% del pago) en su saldo USD y marca
 * COMPLETED. Debe llamarse DENTRO de la transacción de aprobación de pago.
 * @returns { referrerId, reward } si pagó comisión, o null.
 */
export async function payReferralCommission(db: Db, payingUserId: string, amountUsd: number) {
  const ref = await db.referral.findFirst({
    where: { referredId: payingUserId, status: 'PENDING' },
    select: { id: true, referrerId: true },
  })
  if (!ref) return null

  const reward = Math.round((Number(amountUsd) || 0) * REFERRAL_PERCENT) / 100
  if (reward <= 0) {
    // Igual cerramos el referido para no re-evaluarlo, pero sin acreditar.
    await db.referral.update({ where: { id: ref.id }, data: { status: 'COMPLETED', completedAt: new Date() } })
    return null
  }

  await db.$executeRaw`UPDATE users SET ai_balance_usd = ai_balance_usd + ${reward} WHERE id = ${ref.referrerId}::uuid`
  await db.referral.update({
    where: { id: ref.id },
    data: { status: 'COMPLETED', rewardUsd: reward, completedAt: new Date() },
  })
  return { referrerId: ref.referrerId, reward }
}
