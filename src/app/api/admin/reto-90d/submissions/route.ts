export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { getAdminUser, unauthorizedAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import { getDayRange } from '@/lib/reto90d/submissionService'
import { normalizePhone } from '@/lib/reto90d/memberService'
import { isValidSubmissionStatus, isValidDateParam } from '../_shared'

// GET /api/admin/reto-90d/submissions?challengeId=&status=&phone=&date=
// Lista entregas con filtros opcionales. El filtro `date` (YYYY-MM-DD) acota al
// día natural en America/La_Paz. Máximo 200 filas, de la más reciente a la más
// antigua.
export async function GET(req: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  const { searchParams } = new URL(req.url)
  const challengeId = searchParams.get('challengeId')
  const status = searchParams.get('status')
  const phone = searchParams.get('phone')
  const date = searchParams.get('date')

  // Validación de query params → 400 (en vez de dejar que exploten en 500).
  if (status && !isValidSubmissionStatus(status)) {
    return NextResponse.json({ error: 'Estado inválido' }, { status: 400 })
  }
  if (date && !isValidDateParam(date)) {
    return NextResponse.json({ error: 'Fecha inválida (usa YYYY-MM-DD)' }, { status: 400 })
  }

  const where: Prisma.TaskSubmissionWhereInput = {}
  if (challengeId) where.challengeId = challengeId
  if (status) where.status = status
  // Normalizamos el teléfono igual que los miembros para que el filtro coincida.
  if (phone) where.phone = normalizePhone(phone)
  if (date) {
    // Mediodía en La Paz (UTC-4) para caer siempre dentro del día pedido.
    const { start, end } = getDayRange(new Date(`${date}T12:00:00.000-04:00`))
    where.submittedAt = { gte: start, lt: end }
  }

  const submissions = await prisma.taskSubmission.findMany({
    where,
    include: { task: { select: { title: true } } },
    orderBy: { submittedAt: 'desc' },
    take: 200,
  })

  return NextResponse.json({ submissions })
}
