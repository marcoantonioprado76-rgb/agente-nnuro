import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/audit'
import { createUserNotification } from '@/lib/notifications'
import { sendPlanExpiredEmail } from '@/lib/email'

export const dynamic = 'force-dynamic'

/**
 * GET /api/cron/check-subscriptions
 *
 * Checks for expired subscriptions and suspends them.
 * Should be called periodically (e.g. every hour via Vercel Cron, external cron, or manual).
 *
 * Protected by CRON_SECRET to prevent unauthorized access.
 *
 * IMPORTANT: Only changes subscription status. Does NOT delete:
 * - Bots, products, templates, credentials, followup settings, WhatsApp connections
 */
export async function GET(request: NextRequest) {
  // Verify authorization — fail closed: require CRON_SECRET always
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const service = await createServiceRoleClient()
    const now = new Date().toISOString()

    // Find all active subscriptions that have expired (end_date < now)
    const { data: expiredSubs, error } = await service
      .from('subscriptions')
      .select('id, user_id, plan_id, end_date, stripe_customer_id')
      .eq('status', 'active')
      .eq('approval_status', 'approved')
      .lt('end_date', now)

    if (error) {
      console.error('[Cron] Error querying expired subscriptions:', error)
      return NextResponse.json({ error: 'Error al consultar suscripciones' }, { status: 500 })
    }

    if (!expiredSubs || expiredSubs.length === 0) {
      return NextResponse.json({
        message: 'No hay suscripciones vencidas',
        checked_at: now,
        expired_count: 0,
      })
    }

    console.log(`[Cron] Encontradas ${expiredSubs.length} suscripciones vencidas`)

    const results = []

    for (const sub of expiredSubs) {
      // Update subscription status to expired
      // DO NOT delete any user data (bots, products, templates, etc.)
      const { error: updateError } = await service
        .from('subscriptions')
        .update({
          status: 'expired',
          admin_notes: `Suscripcion vencida automaticamente el ${new Date().toLocaleDateString('es-MX')}. Configuracion del bot preservada.`,
          updated_at: now,
        })
        .eq('id', sub.id)

      if (updateError) {
        console.error(`[Cron] Error expiring subscription ${sub.id}:`, updateError)
        results.push({ id: sub.id, status: 'error', error: updateError.message })
        continue
      }

      // Create admin notification
      const { data: profile } = await service
        .from('profiles')
        .select('full_name, email, tenant_id')
        .eq('id', sub.user_id)
        .single()

      try {
        await service.from('admin_notifications').insert({
          type: 'suscripcion_vencida',
          title: 'Suscripcion vencida',
          message: `La suscripcion de ${profile?.full_name || 'Usuario'} (${profile?.email || ''}) ha vencido. El acceso fue suspendido automaticamente.`,
          target_user_id: sub.user_id,
          related_entity_type: 'subscription',
          related_entity_id: sub.id,
        })
      } catch { /* non-critical */ }

      // User notification: subscription expired
      createUserNotification({
        userId: sub.user_id,
        type: 'suscripcion_vencida',
        title: 'Tu suscripción ha vencido',
        message: 'Tu plan ha expirado. Renueva tu suscripción para seguir usando todas las funciones.',
        link: '/subscription',
      }).catch(() => {})

      // Plan expired email
      if (profile?.email) {
        const { data: plan } = await service.from('plans').select('name').eq('id', sub.plan_id).single()
        sendPlanExpiredEmail(profile.email, profile.full_name || 'Usuario', plan?.name || 'Plan').catch(() => {})
      }

      // Audit log
      await logAudit({
        userId: sub.user_id,
        tenantId: profile?.tenant_id,
        action: 'suscripcion_vencida',
        entityType: 'suscripcion',
        entityId: sub.id,
        details: {
          action_detail: 'expired_automatically',
          end_date: sub.end_date,
          expired_at: now,
          note: 'Bot configuration preserved. Only access suspended.',
        },
      })

      results.push({ id: sub.id, user_id: sub.user_id, status: 'expired' })
      console.log(`[Cron] Suscripcion ${sub.id} expirada para usuario ${sub.user_id}`)
    }

    return NextResponse.json({
      message: `${results.filter(r => r.status === 'expired').length} suscripciones expiradas`,
      checked_at: now,
      expired_count: results.filter(r => r.status === 'expired').length,
      results,
    })
  } catch (error) {
    console.error('[Cron] Error:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
