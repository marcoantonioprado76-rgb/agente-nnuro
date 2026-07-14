import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Never cache — QR and prices must always be fresh
export const dynamic = 'force-dynamic'
export const revalidate = 0

// Public endpoint — returns only non-sensitive settings users need
const PUBLIC_KEYS = [
  'PAYMENT_QR_URL',
  'PRICE_BASIC', 'PRICE_BASIC_RENEWAL',
  'PRICE_PRO', 'PRICE_PRO_RENEWAL',
  'PRICE_ELITE', 'PRICE_ELITE_RENEWAL',
  'PRICE_RENEWAL',
  'STORE_PAYMENT_CRYPTO', 'STORE_PAYMENT_MANUAL', 'STORE_PAYMENT_FASE_GLOBAL',
  'PLAN_BASIC_ENABLED', 'PLAN_PRO_ENABLED', 'PLAN_ELITE_ENABLED',
  'PLAN_BASIC_CREDITS', 'PLAN_PRO_CREDITS', 'PLAN_ELITE_CREDITS',
  'PLAN_BASIC_BOTS', 'PLAN_PRO_BOTS', 'PLAN_ELITE_BOTS',
]

export async function GET() {
  try {
    const settings = await prisma.appSetting.findMany({
      where: { key: { in: PUBLIC_KEYS } },
    })

    const map: Record<string, string> = {}
    settings.forEach(s => { map[s.key] = s.value })

    return NextResponse.json({ settings: map }, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    })
  } catch (err) {
    console.error('[GET /api/settings]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
