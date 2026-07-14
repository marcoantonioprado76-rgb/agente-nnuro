import { prisma as defaultPrisma } from './prisma'
import type { Prisma } from '@prisma/client'

/**
 * Reactiva las tiendas y bots de un usuario que estaban inactivos/pausados.
 * Pensado para llamarse desde los endpoints que aprueban/renuevan un plan.
 *
 * Contexto del bug que esto resuelve:
 *   El cron `expirePlans` en src/instrumentation.ts pausa stores y bots cuando
 *   el plan vence. Pero NADA reactiva esos assets cuando el usuario renueva.
 *   Resultado: usuarios que renuevan después de un período expirado se quedan
 *   con stores en active=false y bots en PAUSED, y NO saben por qué su cuenta
 *   "no funciona" pese a haber pagado.
 *
 * Idempotente: si no hay nada inactivo/pausado, no hace nada.
 *
 * Trade-off conocido:
 *   No distinguimos "pausado por el cron" vs "pausado a propósito por el
 *   usuario desde el panel" (eso requeriría columna adicional + migración con
 *   lock contention en la tabla bots). Reactivamos TODO. Si el usuario pausó
 *   algo a propósito, lo verá reactivado tras renovar plan y deberá re-pausar
 *   desde su panel. Es preferible al bug actual de cuenta muerta tras renovar.
 *
 * @param tx Cliente Prisma de transacción (opcional). Si se pasa, las
 *           operaciones corren dentro de la transacción del caller.
 */
export async function reactivateUserAssetsAfterPlanRenewal(
    userId: string,
    tx?: Prisma.TransactionClient,
): Promise<{ stores: number; bots: number }> {
    const db = tx ?? defaultPrisma
    try {
        const [stores, bots] = await Promise.all([
            db.store.updateMany({
                where: { userId, active: false },
                data: { active: true },
            }),
            db.bot.updateMany({
                where: { userId, status: 'PAUSED' },
                data: { status: 'ACTIVE' },
            }),
        ])
        if (stores.count > 0 || bots.count > 0) {
            console.log(`[PLAN-RENEWAL] Reactivados para user=${userId}: ${stores.count} store(s), ${bots.count} bot(s)`)
        }
        return { stores: stores.count, bots: bots.count }
    } catch (e: any) {
        // Fire-and-forget en spirit: si esto falla, no rompemos la aprobación del plan.
        console.error('[PLAN-RENEWAL] Error reactivando assets:', e?.message ?? e)
        return { stores: 0, bots: 0 }
    }
}
