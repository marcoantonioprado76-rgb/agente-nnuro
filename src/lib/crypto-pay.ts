import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'

/** Minutos que dura un pago cripto pendiente antes de vencer (libera el monto único). */
export const CRYPTO_PENDING_MINUTES = 30
/** Ventana extra tras vencer en la que seguimos detectando el pago on-chain (por si confirma tarde). */
export const CRYPTO_GRACE_MINUTES = 20

/** Clave arbitraria para pg_advisory_xact_lock — serializa la asignación de montos únicos. */
const CRYPTO_LOCK_KEY = 918273645

type Db = Prisma.TransactionClient | typeof prisma

/**
 * Asigna un monto ÚNICO (4 decimales) para un pago cripto de PLAN, que ninguna otra
 * solicitud de plan cripto pendiente esté usando. Así, al detectar un pago entrante
 * con ese monto exacto, sabemos inequívocamente de qué compra es — todo a UNA sola dirección.
 */
export async function assignUniqueCryptoAmount(baseUsd: number, client: Db = prisma): Promise<{ amount: number; expiresAt: Date }> {
  const base = Math.round(baseUsd * 100) / 100
  const now = new Date()

  const packs = await client.packPurchaseRequest.findMany({
    where: { status: 'PENDING', paymentMethod: 'CRYPTO', expiresAt: { gt: now } },
    select: { expectedAmount: true },
  })
  const used = new Set<string>()
  for (const r of packs) if (r.expectedAmount != null) used.add(Number(r.expectedAmount).toFixed(4))

  // El monto de plan NUNCA debe ser de 2 decimales (…​.XX00): los otros flujos cripto
  // (créditos, tienda, cursos) pagan montos de 2 decimales, y como todo va a la MISMA
  // dirección, un monto de plan de 2 decimales podría "capturar" el pago de otro flujo.
  // Por eso arrancamos en k=1 (nunca el base exacto) y saltamos los múltiplos de 100
  // (que dan …​.XX00). Así el monto siempre tiene 3º/4º decimal ≠ 0 y no colisiona.
  let amount = 0
  for (let k = 1; k <= 9999; k++) {
    if (k % 100 === 0) continue // evita montos de 2 decimales
    const a = Math.round((base + k * 0.0001) * 10000) / 10000 // delta único en los decimales
    if (!used.has(a.toFixed(4))) { amount = a; break }
  }
  if (amount === 0) amount = Math.round((base + 0.0001) * 10000) / 10000 // fallback (no debería ocurrir)
  const expiresAt = new Date(now.getTime() + CRYPTO_PENDING_MINUTES * 60_000)
  return { amount, expiresAt }
}

/**
 * Asigna un monto único Y crea el registro dentro de UNA transacción con lock global
 * (pg_advisory_xact_lock). Serializa el par leer-libres → crear, de modo que dos "start"
 * concurrentes NUNCA reciban el mismo monto (evita que un solo pago matchee dos compras).
 */
export async function withUniqueCryptoAmount<T>(
  baseUsd: number,
  create: (amount: number, expiresAt: Date, tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock($1)', CRYPTO_LOCK_KEY)
    const { amount, expiresAt } = await assignUniqueCryptoAmount(baseUsd, tx)
    return create(amount, expiresAt, tx)
  })
}

/**
 * ¿Ese txHash on-chain ya fue usado por ALGUNA compra en TODA la plataforma?
 * Dedup GLOBAL cruzado entre las tablas de compra que guardan txHash (planes, créditos,
 * tienda, cursos, marketplace, entradas). Un mismo pago on-chain NUNCA debe acreditar dos
 * compras — evita que alguien reuse el txHash público de otro pago.
 */
export async function isCryptoTxUsed(txHash: string, except?: { table: 'pack'; id: string }): Promise<boolean> {
  const db = prisma as any
  const checks = await Promise.all([
    prisma.packPurchaseRequest.findFirst({ where: { txHash, ...(except?.table === 'pack' ? { NOT: { id: except.id } } : {}) }, select: { id: true } }),
    prisma.creditPurchaseRequest.findFirst({ where: { txHash }, select: { id: true } }),
    db.storeOrder.findFirst({ where: { txHash }, select: { id: true } }).catch(() => null),
    db.courseEnrollment.findFirst({ where: { txHash }, select: { id: true } }).catch(() => null),
    db.marketplacePurchase.findFirst({ where: { txHash }, select: { id: true } }).catch(() => null),
    db.ticketOrder.findFirst({ where: { txHash }, select: { id: true } }).catch(() => null),
  ])
  return checks.some(Boolean)
}

/** Alias con nombre explícito para usar en los endpoints de compra. */
export const isTxHashUsedAnywhere = isCryptoTxUsed
