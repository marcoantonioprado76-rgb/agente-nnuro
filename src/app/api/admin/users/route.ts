export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser, unauthorizedAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  const { searchParams } = new URL(request.url)
  const search = searchParams.get('q') ?? ''
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const take = 20
  const offset = (page - 1) * take

  // Un solo query con LEFT JOIN y SUM en DB.
  // Antes cargaba TODAS las comisiones de cada usuario en JS (puede ser miles de filas).
  // Ahora la suma la hace Postgres — N filas → 1 número por usuario.
  const searchPattern = `%${search}%`

  const [rows, [countRow]] = await Promise.all([
    prisma.$queryRaw<Array<{
      id: string
      username: string
      full_name: string
      email: string
      country: string
      plan: string
      is_active: boolean
      is_admin: boolean
      extra_bots: number
      extra_stores: number
      extra_products: number
      extra_landing_pages: number
      extra_ads_per_month: number
      access_extras: boolean
      plan_expires_at: Date | null
      created_at: Date
      location_changed: boolean
    }>>`
      SELECT
        u.id::text,
        u.username,
        u.full_name,
        u.email,
        u.country,
        u.plan::text,
        u.is_active,
        u.is_admin,
        u.extra_bots,
        u.extra_stores,
        u.extra_products,
        u.extra_landing_pages,
        u.extra_ads_per_month,
        u.access_extras,
        u.plan_expires_at,
        u.created_at,
        (SELECT COALESCE(bool_or(td.location_changed), false) FROM trusted_devices td WHERE td.user_id = u.id) AS location_changed
      FROM users u
      WHERE (
        ${search} = ''
        OR u.username ILIKE ${searchPattern}
        OR u.full_name ILIKE ${searchPattern}
        OR u.email    ILIKE ${searchPattern}
      )
      ORDER BY u.created_at DESC
      LIMIT ${take} OFFSET ${offset}
    `,
    prisma.$queryRaw<Array<{ total: bigint }>>`
      SELECT COUNT(*)::bigint AS total FROM users
      WHERE (
        ${search} = ''
        OR username ILIKE ${searchPattern}
        OR full_name ILIKE ${searchPattern}
        OR email     ILIKE ${searchPattern}
      )
    `,
  ])

  const total = Number(countRow?.total ?? 0)

  return NextResponse.json({
    users: rows.map(u => ({
      id: u.id,
      username: u.username,
      fullName: u.full_name,
      email: u.email,
      country: u.country,
      plan: u.plan,
      isActive: u.is_active,
      isAdmin: u.is_admin,
      extraBots: u.extra_bots ?? 0,
      extraStores: u.extra_stores ?? 0,
      extraProducts: u.extra_products ?? 0,
      extraLandingPages: u.extra_landing_pages ?? 0,
      extraAdsPerMonth: u.extra_ads_per_month ?? 0,
      accessExtras: u.access_extras ?? false,
      planExpiresAt: u.plan_expires_at,
      createdAt: u.created_at,
      locationChanged: u.location_changed,
    })),
    total,
    pages: Math.ceil(total / take),
    page,
  })
}
