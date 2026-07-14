import { prisma } from './prisma'
import { getPlanLimits, type UserPlan } from './plan-limits'

/**
 * Trae el plan del usuario y devuelve sus límites efectivos.
 * Fuente única de verdad para los chequeos de límites (ej: anuncios/mes).
 * Nota: este proyecto no maneja overrides por usuario, así que los límites
 * salen directamente del pack del plan.
 */
export async function getUserLimits(
    userId: string,
): Promise<{ plan: UserPlan; limits: ReturnType<typeof getPlanLimits> }> {
    const u = await prisma.user.findUnique({
        where: { id: userId },
        select: { plan: true },
    })
    const plan = ((u?.plan as any) ?? 'NONE') as UserPlan
    return { plan, limits: getPlanLimits(plan) }
}
