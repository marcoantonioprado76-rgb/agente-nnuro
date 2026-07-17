export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendPlanExpiringEmail, sendPlanWinbackEmail } from '@/lib/email'

/**
 * POST /api/cron/plan-reminders  (protegido con CRON_SECRET)
 *
 * Correr UNA VEZ AL DÍA. Envía dos correos:
 *  1) "Vence pronto": a usuarios con plan activo cuyo vencimiento es en ≤2 días
 *     (aún no avisados en este período) → invita a renovar.
 *  2) "Win-back": a usuarios que se les venció el plan hace ~2–4 días y NO
 *     renovaron → oferta para reactivar.
 *
 * Dedup: expiryReminderSentAt / winbackSentAt en el usuario (no reenvía).
 */
export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-cron-secret') ?? request.headers.get('authorization')?.replace('Bearer ', '')
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const now = new Date()
    let reminded = 0, winbacks = 0

    // ── 1) VENCE PRONTO (≤ 2 días) ──────────────────────────────────────────
    // No avisado aún para este período: expiryReminderSentAt es null o anterior
    // a (vencimiento − 5 días) → así se reenvía en cada nuevo período/renovación.
    const expiringSoon = await prisma.$queryRaw<Array<{ id: string; email: string; full_name: string; plan: string; plan_expires_at: Date }>>`
      SELECT id::text, email, full_name, plan::text, plan_expires_at
      FROM users
      WHERE plan != 'NONE'
        AND plan_expires_at IS NOT NULL
        AND plan_expires_at > ${now}
        AND plan_expires_at <= ${now} + INTERVAL '2 days'
        AND (expiry_reminder_sent_at IS NULL OR expiry_reminder_sent_at < plan_expires_at - INTERVAL '5 days')
      LIMIT 500
    `
    for (const u of expiringSoon) {
      const daysLeft = Math.max(1, Math.ceil((new Date(u.plan_expires_at).getTime() - now.getTime()) / 86400000))
      const ok = await sendPlanExpiringEmail(u.email, u.full_name, { plan: u.plan, daysLeft })
      if (ok) {
        await prisma.user.update({ where: { id: u.id }, data: { expiryReminderSentAt: now } })
        reminded++
      }
    }

    // ── 2) WIN-BACK (venció hace ~2–4 días y sigue en NONE) ─────────────────
    // Usa el audit log PLAN_EXPIRED para saber cuándo venció y qué plan tenía.
    const winbackCandidates = await prisma.$queryRaw<Array<{ id: string; email: string; full_name: string; plan: string }>>`
      SELECT DISTINCT u.id::text, u.email, u.full_name,
             (a.payload_json->>'previousPlan') AS plan
      FROM users u
      JOIN audit_logs a ON a.user_id = u.id AND a.action = 'PLAN_EXPIRED'
      WHERE u.plan = 'NONE'
        AND a.created_at BETWEEN ${now} - INTERVAL '4 days' AND ${now} - INTERVAL '2 days'
        AND (u.winback_sent_at IS NULL OR u.winback_sent_at < ${now} - INTERVAL '30 days')
      LIMIT 500
    `
    for (const u of winbackCandidates) {
      const ok = await sendPlanWinbackEmail(u.email, u.full_name, { plan: u.plan || 'BASIC' })
      if (ok) {
        await prisma.user.update({ where: { id: u.id }, data: { winbackSentAt: now } })
        winbacks++
      }
    }

    return NextResponse.json({ ok: true, reminded, winbacks })
  } catch (err) {
    console.error('[cron/plan-reminders]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
