export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST /api/push/subscribe — saves or updates a push subscription for the user
export async function POST(req: Request) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null) as {
    endpoint: string
    keys: { p256dh: string; auth: string }
  } | null

  if (!body?.endpoint || !body?.keys?.p256dh || !body?.keys?.auth) {
    return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 })
  }

  await prisma.pushSubscription.upsert({
    where: { endpoint: body.endpoint },
    create: {
      userId: user.id,
      endpoint: body.endpoint,
      p256dh: body.keys.p256dh,
      auth: body.keys.auth,
    },
    update: {
      userId: user.id,
      p256dh: body.keys.p256dh,
      auth: body.keys.auth,
    },
  })

  return NextResponse.json({ ok: true })
}
