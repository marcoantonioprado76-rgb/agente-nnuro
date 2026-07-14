export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAdminUser, unauthorizedAdmin } from '@/lib/admin-auth'
import { listMembers, enrollMember, normalizePhone } from '@/lib/reto90d/memberService'
import { getChallenge } from '@/lib/reto90d/challengeService'
import { sendWelcome } from '@/lib/reto90d/welcomeService'
import { prisma } from '@/lib/prisma'
import { handleRouteError } from '../_shared'

const enrollSchema = z.object({
  challengeId: z.string().min(1),
  fullName: z.string().min(1),
  phone: z.string().min(1),
  userId: z.string().nullable().optional(),
})

export async function GET(req: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  const { searchParams } = new URL(req.url)
  const challengeId = searchParams.get('challengeId')
  if (!challengeId) {
    return NextResponse.json({ error: 'challengeId es requerido' }, { status: 400 })
  }

  const members = await listMembers(challengeId)
  return NextResponse.json({ members })
}

export async function POST(req: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  const body = await req.json().catch(() => null)
  const parsed = enrollSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos inválidos', details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const { challengeId, fullName, phone, userId } = parsed.data

  try {
    const existing = await prisma.challengeMember.findFirst({
      where: { challengeId, phone: normalizePhone(phone) },
      select: { id: true },
    })
    const member = await enrollMember(challengeId, { fullName, phone, userId })

    // Bienvenida automática solo si es un miembro nuevo (best-effort).
    if (!existing) {
      const ch = await getChallenge(challengeId)
      if (ch) void sendWelcome(challengeId, ch.name, phone, fullName).catch(() => {})
    }

    return NextResponse.json({ member })
  } catch (err) {
    return handleRouteError(err, 'members POST')
  }
}
