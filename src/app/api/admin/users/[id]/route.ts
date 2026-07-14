export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser, unauthorizedAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { reactivateUserAssetsAfterPlanRenewal } from '@/lib/plan-lifecycle'

// Validación simple de formato de email (no exhaustiva, solo estructura básica).
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Si el error es una violación de unicidad (email/usuario/documento), devuelve un
// mensaje claro para el 409; si no, devuelve null.
function uniqueDupMessage(err: unknown): string | null {
  const meta = (err as { meta?: { code?: string; message?: string } })?.meta
  const msg = String(meta?.message ?? (err as { message?: string })?.message ?? '')
  const isUnique = meta?.code === '23505' || /23505|duplicate key|unique constraint/i.test(msg)
  if (!isUnique) return null
  if (/identity_document/i.test(msg)) return 'Ese documento ya está en uso por otro usuario.'
  if (/email/i.test(msg)) return 'Ese correo ya está en uso por otro usuario.'
  if (/username/i.test(msg)) return 'Ese usuario ya está en uso por otro usuario.'
  return 'Ese correo, usuario o documento ya está en uso por otro usuario.'
}

// GET /api/admin/users/[id] — perfil del usuario para llenar el formulario de edición.
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  try {
    const rows = await prisma.$queryRaw<Array<{
      id: string; username: string; email: string; full_name: string; phone: string | null
      identity_document: string; city: string; country: string; date_of_birth: string | null
      plan: string; is_active: boolean
    }>>`
      SELECT id, username, email, full_name, phone, identity_document, city, country,
             to_char(date_of_birth, 'YYYY-MM-DD') AS date_of_birth, plan::text AS plan, is_active
      FROM users WHERE id = ${params.id}::uuid LIMIT 1
    `
    const r = rows[0]
    if (!r) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })

    return NextResponse.json({
      user: {
        id: r.id,
        username: r.username,
        email: r.email,
        fullName: r.full_name,
        phone: r.phone,
        identityDocument: r.identity_document,
        city: r.city,
        country: r.country,
        dateOfBirth: r.date_of_birth,
        plan: r.plan,
        isActive: r.is_active,
      },
    })
  } catch (err) {
    console.error('[USER EDIT] GET error:', err)
    return NextResponse.json({ error: 'Error al obtener el usuario' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  const userId = params.id

  if ((admin as any).id === userId) {
    return NextResponse.json({ error: 'No puedes eliminar tu propia cuenta' }, { status: 400 })
  }

  const rows = await prisma.$queryRaw<Array<{ id: string; is_admin: boolean }>>`
    SELECT id, is_admin FROM users WHERE id = ${userId}::uuid LIMIT 1
  `
  if (!rows[0]) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
  if (rows[0].is_admin) return NextResponse.json({ error: 'No puedes eliminar a un administrador' }, { status: 400 })

  await prisma.$transaction(async (tx) => {
    // Nullify bot references in stores before deleting bots
    await tx.$executeRaw`UPDATE stores SET bot_id = NULL WHERE user_id = ${userId}::uuid`
    // Eliminar bots (cascada: BotSecret, Product, Conversation → Message, BotState)
    await tx.$executeRaw`DELETE FROM bots WHERE user_id = ${userId}::uuid`
    // Eliminar tokens de reset de contraseña
    await tx.$executeRaw`DELETE FROM password_reset_tokens WHERE user_id = ${userId}::uuid`
    // Eliminar solicitudes de compra y retiro
    await tx.$executeRaw`DELETE FROM pack_purchase_requests WHERE user_id = ${userId}::uuid`
    await tx.$executeRaw`DELETE FROM withdrawal_requests WHERE user_id = ${userId}::uuid`
    // Nullify relaciones opcionales
    await tx.$executeRaw`UPDATE ad_jobs SET user_id = NULL WHERE user_id = ${userId}::uuid`
    await tx.$executeRaw`UPDATE audit_logs SET user_id = NULL WHERE user_id = ${userId}::uuid`
    // Eliminar usuario (cascada: Store, LandingPage, AdIntegration, AdAsset, AdDraft, OpenAIConfig, BusinessBrief, AdCampaignV2)
    await tx.$executeRaw`DELETE FROM users WHERE id = ${userId}::uuid`
  })

  return NextResponse.json({ success: true })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  const body = await request.json()
  const { plan, isActive, isAdmin: makeAdmin, extraBots, extraStores, extraProducts, extraLandingPages, extraAdsPerMonth, accessExtras, addDays } = body

  // ── Editar datos de perfil (aditivo: solo toca los campos presentes en el body) ──
  const PROFILE_FIELDS = ['fullName', 'email', 'username', 'phone', 'identityDocument', 'city', 'country', 'dateOfBirth'] as const
  if (PROFILE_FIELDS.some((f) => f in body)) {
    // Campos obligatorios en la base (NOT NULL): si llegan vacíos → 400 (no se pueden null-ear).
    const REQUIRED_LABEL: Record<string, string> = {
      fullName: 'El nombre completo', email: 'El correo', username: 'El usuario',
      identityDocument: 'El documento', city: 'La ciudad', country: 'El país',
      dateOfBirth: 'La fecha de nacimiento',
    }
    // Columnas de texto simples (valor siempre parametrizado, nombre de columna literal).
    const COL_SQL: Record<string, (v: string) => Prisma.Sql> = {
      fullName: (v) => Prisma.sql`full_name = ${v}`,
      username: (v) => Prisma.sql`username = ${v}`,
      identityDocument: (v) => Prisma.sql`identity_document = ${v}`,
      city: (v) => Prisma.sql`city = ${v}`,
      country: (v) => Prisma.sql`country = ${v}`,
    }
    const sets: Prisma.Sql[] = []

    for (const f of PROFILE_FIELDS) {
      if (!(f in body)) continue
      const rawVal = (body as Record<string, unknown>)[f]
      const value = rawVal === null || rawVal === undefined ? '' : String(rawVal).trim()

      if (f === 'dateOfBirth') {
        if (!value) return NextResponse.json({ error: 'La fecha de nacimiento no puede quedar vacía' }, { status: 400 })
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(value))) {
          return NextResponse.json({ error: 'La fecha de nacimiento no es válida' }, { status: 400 })
        }
        sets.push(Prisma.sql`date_of_birth = ${value}::date`)
        continue
      }

      if (f === 'email') {
        const email = value.toLowerCase()
        if (!email) return NextResponse.json({ error: 'El correo no puede quedar vacío' }, { status: 400 })
        if (!EMAIL_RE.test(email)) return NextResponse.json({ error: 'El correo no tiene un formato válido' }, { status: 400 })
        sets.push(Prisma.sql`email = ${email}`)
        continue
      }

      if (f === 'phone') {
        // Teléfono es opcional: si llega vacío se guarda como NULL.
        sets.push(Prisma.sql`phone = ${value === '' ? null : value}`)
        continue
      }

      if (!value) {
        return NextResponse.json({ error: `${REQUIRED_LABEL[f]} no puede quedar vacío` }, { status: 400 })
      }
      sets.push(COL_SQL[f](value))
    }

    if (sets.length > 0) {
      try {
        await prisma.$executeRaw(Prisma.sql`UPDATE users SET ${Prisma.join(sets)} WHERE id = ${params.id}::uuid`)
      } catch (err) {
        const dup = uniqueDupMessage(err)
        if (dup) return NextResponse.json({ error: dup }, { status: 409 })
        console.error('[USER EDIT] PATCH profile error:', err)
        return NextResponse.json({ error: 'No se pudieron guardar los cambios.' }, { status: 500 })
      }
    }
  }

  // Use raw SQL to bypass stale Prisma client
  if (plan !== undefined) {
    if (plan === 'NONE') {
      // Quitar plan: desactivar y limpiar expiración
      await prisma.$executeRaw`
        UPDATE users
        SET plan = 'NONE'::"UserPlan",
            is_active = false,
            plan_expires_at = NULL
        WHERE id = ${params.id}::uuid
      `
    } else {
      // Asignar plan: activar + mínimo 30 días (respeta mayor fecha si ya tiene más)
      await prisma.$executeRaw`
        UPDATE users
        SET plan = ${plan}::"UserPlan",
            is_active = true,
            plan_expires_at = GREATEST(
              COALESCE(plan_expires_at, NOW()),
              NOW() + INTERVAL '30 days'
            )
        WHERE id = ${params.id}::uuid
      `
      // Reactivar stores/bots que el cron expirePlans haya pausado antes.
      await reactivateUserAssetsAfterPlanRenewal(params.id)
    }
  }
  if (isActive !== undefined) {
    await prisma.$executeRaw`
      UPDATE users SET is_active = ${isActive} WHERE id = ${params.id}::uuid
    `
  }
  if (makeAdmin !== undefined) {
    await prisma.$executeRaw`
      UPDATE users SET is_admin = ${makeAdmin} WHERE id = ${params.id}::uuid
    `
  }
  if (extraBots !== undefined) {
    const val = Math.max(0, parseInt(extraBots) || 0)
    await prisma.$executeRaw`
      UPDATE users SET extra_bots = ${val} WHERE id = ${params.id}::uuid
    `
  }
  if (extraStores !== undefined) {
    const val = Math.max(0, parseInt(extraStores) || 0)
    await prisma.$executeRaw`
      UPDATE users SET extra_stores = ${val} WHERE id = ${params.id}::uuid
    `
  }
  if (extraProducts !== undefined) {
    const val = Math.max(0, parseInt(extraProducts) || 0)
    await prisma.$executeRaw`
      UPDATE users SET extra_products = ${val} WHERE id = ${params.id}::uuid
    `
  }
  if (extraLandingPages !== undefined) {
    const val = Math.max(0, parseInt(extraLandingPages) || 0)
    await prisma.$executeRaw`
      UPDATE users SET extra_landing_pages = ${val} WHERE id = ${params.id}::uuid
    `
  }
  if (extraAdsPerMonth !== undefined) {
    const val = Math.max(0, parseInt(extraAdsPerMonth) || 0)
    await prisma.$executeRaw`
      UPDATE users SET extra_ads_per_month = ${val} WHERE id = ${params.id}::uuid
    `
  }
  // Acceso manual a Academy/Recursos/Shop (como Fase Global)
  if (accessExtras !== undefined) {
    await prisma.$executeRaw`
      UPDATE users SET access_extras = ${!!accessExtras} WHERE id = ${params.id}::uuid
    `
  }
  // Ampliar días de suscripción (suma sobre la fecha mayor entre la actual y NOW)
  if (addDays !== undefined) {
    const days = Math.max(1, Math.min(3650, parseInt(addDays) || 0))
    if (days > 0) {
      await prisma.$executeRaw`
        UPDATE users
        SET plan_expires_at = GREATEST(COALESCE(plan_expires_at, NOW()), NOW()) + (${days} * INTERVAL '1 day'),
            is_active = true
        WHERE id = ${params.id}::uuid
      `
    }
  }

  // Return updated user via raw SQL
  const rows = await prisma.$queryRaw<Array<{
    id: string; username: string; full_name: string; email: string; phone: string | null
    identity_document: string; city: string; country: string; date_of_birth: string | null
    plan: string; is_active: boolean; is_admin: boolean
    extra_bots: number; extra_stores: number; extra_products: number; extra_landing_pages: number; extra_ads_per_month: number
    access_extras: boolean; plan_expires_at: Date | null
  }>>`
    SELECT id, username, full_name, email, phone, identity_document, city, country,
           to_char(date_of_birth, 'YYYY-MM-DD') AS date_of_birth,
           plan::text AS plan, is_active, is_admin,
           extra_bots, extra_stores, extra_products, extra_landing_pages, extra_ads_per_month,
           access_extras, plan_expires_at
    FROM users WHERE id = ${params.id}::uuid LIMIT 1
  `
  const row = rows[0]
  if (!row) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })

  return NextResponse.json({
    success: true,
    user: {
      id: row.id,
      username: row.username,
      fullName: row.full_name,
      email: row.email,
      phone: row.phone,
      identityDocument: row.identity_document,
      city: row.city,
      country: row.country,
      dateOfBirth: row.date_of_birth,
      plan: row.plan,
      isActive: row.is_active,
      isAdmin: row.is_admin,
      extraBots: row.extra_bots,
      extraStores: row.extra_stores,
      extraProducts: row.extra_products,
      extraLandingPages: row.extra_landing_pages,
      extraAdsPerMonth: row.extra_ads_per_month,
      accessExtras: row.access_extras,
      planExpiresAt: row.plan_expires_at,
    },
  })
}
