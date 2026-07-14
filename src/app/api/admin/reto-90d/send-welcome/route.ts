export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser } from '@/lib/admin-auth'
import { getActiveChallenge } from '@/lib/reto90d/challengeService'
import { listMembers } from '@/lib/reto90d/memberService'
import { sendWelcome } from '@/lib/reto90d/welcomeService'

// Envía (o reenvía) la bienvenida a los inscritos del reto activo.
// Autoriza por sesión admin O por Authorization: Bearer CRON_SECRET.
// ?scope=withEmail (por defecto) → solo los que tienen correo; ?scope=all → todos.
export async function POST(req: NextRequest) {
  const admin = await getAdminUser()
  const authHeader = req.headers.get('authorization')
  const okCron = !!process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`
  if (!admin && !okCron) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const scope = new URL(req.url).searchParams.get('scope') || 'withEmail'

  const challenge = await getActiveChallenge()
  if (!challenge) return NextResponse.json({ error: 'No hay un reto activo' }, { status: 400 })

  const members = await listMembers(challenge.id, { status: 'ACTIVE' })
  const targets = members.filter((m) =>
    scope === 'all' ? true : !!(m as any).email && String((m as any).email).trim() !== '',
  )

  let sent = 0
  const results: Array<{ phone: string; fullName: string; ok: boolean }> = []
  for (const m of targets) {
    const ok = await sendWelcome(challenge.id, challenge.name, m.phone, m.fullName, (m as any).email ?? null)
    if (ok) sent++
    results.push({ phone: m.phone, fullName: m.fullName, ok })
  }

  return NextResponse.json({ challenge: challenge.name, scope, total: targets.length, sent, results })
}
