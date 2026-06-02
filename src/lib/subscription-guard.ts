import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getServerSession } from '@/lib/auth'
import type { JwtPayload } from '@/lib/auth'

export type RequireSubscriptionResult =
  | { ok: true; session: JwtPayload }
  | { ok: false; response: NextResponse }

/**
 * Verifica que el usuario tenga una suscripción activa antes de procesar un
 * endpoint core (bots, productos, tiendas, pedidos, dashboard).
 *
 * - Admins siempre pasan (incluso sin suscripción).
 * - Devuelve `{ ok: true, session }` si todo OK.
 * - Devuelve `{ ok: false, response }` con 401/402 si falta auth o suscripción.
 *
 * Códigos en la respuesta:
 *   NO_SUBSCRIPTION       → no existe suscripción
 *   SUBSCRIPTION_PENDING  → pago hecho pero pendiente de aprobación/verificación
 *   SUBSCRIPTION_INACTIVE → cancelada, rechazada o suspendida
 *   SUBSCRIPTION_EXPIRED  → vencida por fecha
 *
 * Uso típico en route handlers:
 *
 *   export async function POST(req: NextRequest) {
 *     const guard = await requireActiveSubscription()
 *     if (!guard.ok) return guard.response
 *     const user = guard.session
 *     // ... lógica protegida
 *   }
 */
export async function requireActiveSubscription(): Promise<RequireSubscriptionResult> {
  const session = await getServerSession()
  if (!session) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'No autorizado' }, { status: 401 }),
    }
  }

  // Admins tienen acceso libre — no requieren suscripción
  if (session.role === 'admin') {
    return { ok: true, session }
  }

  const service = await createServiceRoleClient()
  const { data: sub } = await service
    .from('subscriptions')
    .select('status, approval_status, end_date')
    .eq('user_id', session.sub)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!sub) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Necesitas una suscripción activa', code: 'NO_SUBSCRIPTION' },
        { status: 402 }
      ),
    }
  }

  if (sub.approval_status === 'pending_review') {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Tu suscripción está pendiente de aprobación', code: 'SUBSCRIPTION_PENDING' },
        { status: 402 }
      ),
    }
  }

  if (sub.status !== 'active' || sub.approval_status !== 'approved') {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Suscripción no activa', code: 'SUBSCRIPTION_INACTIVE' },
        { status: 402 }
      ),
    }
  }

  if (sub.end_date && new Date(sub.end_date) < new Date()) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Tu suscripción ha expirado', code: 'SUBSCRIPTION_EXPIRED' },
        { status: 402 }
      ),
    }
  }

  return { ok: true, session }
}
