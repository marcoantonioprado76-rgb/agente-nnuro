export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser, unauthorizedAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/admin/db-cleanup
 * Body: { confirm: "LIMPIAR_BASE_DE_DATOS" }
 *
 * Deletes ALL data except users and app_settings.
 * Requires admin auth + explicit confirmation string.
 */
export async function POST(request: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  const body = await request.json().catch(() => ({}))
  if (body.confirm !== 'LIMPIAR_BASE_DE_DATOS') {
    return NextResponse.json(
      { error: 'Se requiere confirmación: { "confirm": "LIMPIAR_BASE_DE_DATOS" }' },
      { status: 400 },
    )
  }

  await prisma.$transaction(async (tx) => {
    // ── 1. Bot conversation data ──────────────────────────────
    await tx.$executeRaw`DELETE FROM messages`
    await tx.$executeRaw`DELETE FROM bot_states`
    await tx.$executeRaw`DELETE FROM conversations`

    // ── 2. Bot sub-records ───────────────────────────────────
    await tx.$executeRaw`DELETE FROM bot_secrets`
    await tx.$executeRaw`DELETE FROM products`

    // ── 3. Stores (nullify bot FK first, then delete) ────────
    await tx.$executeRaw`DELETE FROM store_products`
    await tx.$executeRaw`UPDATE stores SET bot_id = NULL`
    await tx.$executeRaw`DELETE FROM stores`

    // ── 4. Bots (after stores cleared) ──────────────────────
    await tx.$executeRaw`DELETE FROM bots`

    // ── 5. Landing pages & leads ─────────────────────────────
    await tx.$executeRaw`DELETE FROM leads`
    await tx.$executeRaw`DELETE FROM landing_pages`

    // ── 6. Ads system ────────────────────────────────────────
    await tx.$executeRaw`DELETE FROM ad_creatives`
    await tx.$executeRaw`DELETE FROM ad_remote_mappings`
    await tx.$executeRaw`UPDATE ad_drafts SET connected_account_id = NULL`
    await tx.$executeRaw`DELETE FROM ad_drafts`
    await tx.$executeRaw`DELETE FROM ad_campaigns_v2`
    await tx.$executeRaw`DELETE FROM ad_connected_accounts`
    await tx.$executeRaw`DELETE FROM ad_oauth_tokens`
    await tx.$executeRaw`DELETE FROM ad_integrations`
    await tx.$executeRaw`DELETE FROM ad_assets`
    await tx.$executeRaw`DELETE FROM ad_jobs`
    await tx.$executeRaw`DELETE FROM ad_metrics_daily`

    // ── 7. AI / Ads configs ──────────────────────────────────
    await tx.$executeRaw`DELETE FROM openai_configs`
    await tx.$executeRaw`DELETE FROM business_briefs`

    // ── 8. MLM commerce data ─────────────────────────────────
    await tx.$executeRaw`DELETE FROM commissions`
    await tx.$executeRaw`DELETE FROM pack_purchase_requests`
    await tx.$executeRaw`DELETE FROM withdrawal_requests`
    await tx.$executeRaw`DELETE FROM password_reset_tokens`
    await tx.$executeRaw`DELETE FROM audit_logs`

    // ── Kept: users, app_settings, ad_strategies ─────────────
  }, { timeout: 30000 })

  return NextResponse.json({ ok: true, message: 'Base de datos limpiada correctamente' })
}
