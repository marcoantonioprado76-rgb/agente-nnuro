export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser, unauthorizedAdmin } from '@/lib/admin-auth'
import { getActiveChallenge, getChallenge } from '@/lib/reto90d/challengeService'
import { generateAdminDailyReport } from '@/lib/reto90d/reportService'
import { getDailyRanking, getComplianceRate } from '@/lib/reto90d/rankingService'
import { isValidDateParam } from '../_shared'

// GET /api/admin/reto-90d/reports?challengeId=&date=
// Reporte diario del admin + ranking + tasa de cumplimiento. El día (`date`,
// YYYY-MM-DD) se interpreta en America/La_Paz; sin `date` usa hoy.
export async function GET(req: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  const { searchParams } = new URL(req.url)
  const challengeId = searchParams.get('challengeId')
  const date = searchParams.get('date')

  if (date && !isValidDateParam(date)) {
    return NextResponse.json({ error: 'Fecha inválida (usa YYYY-MM-DD)' }, { status: 400 })
  }

  const challenge = challengeId
    ? await getChallenge(challengeId)
    : await getActiveChallenge()

  if (!challenge) {
    return NextResponse.json({ error: 'No hay reto activo' }, { status: 404 })
  }

  // Mediodía en La Paz (UTC-4) para caer siempre dentro del día pedido.
  const targetDate = date ? new Date(`${date}T12:00:00.000-04:00`) : new Date()

  const [adminReport, ranking, compliance] = await Promise.all([
    generateAdminDailyReport(challenge.id, targetDate),
    getDailyRanking(challenge.id, targetDate),
    getComplianceRate(challenge.id, targetDate),
  ])

  return NextResponse.json({ adminReport, ranking, compliance })
}
