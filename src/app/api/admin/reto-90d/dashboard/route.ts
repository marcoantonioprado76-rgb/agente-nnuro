export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser, unauthorizedAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import { getActiveChallenge, getChallenge } from '@/lib/reto90d/challengeService'
import { getDailyRanking } from '@/lib/reto90d/rankingService'
import { getLaggingDetailed } from '@/lib/reto90d/engagementService'
import { getDayRange } from '@/lib/reto90d/submissionService'

// GET /api/admin/reto-90d/dashboard?challengeId=
// Panel de control del Reto 90D: KPIs del día, ranking y rezagados.
// El "hoy" se calcula en America/La_Paz (ver getDayRange).
export async function GET(req: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  const { searchParams } = new URL(req.url)
  const challengeId = searchParams.get('challengeId')

  const challenge = challengeId
    ? await getChallenge(challengeId)
    : await getActiveChallenge()

  if (!challenge) {
    return NextResponse.json({
      challenge: null,
      kpis: { members: 0, tasks: 0, submissionsToday: 0, byStatus: {} },
      ranking: [],
      laggards: [],
    })
  }

  const now = new Date()
  const { start, end } = getDayRange(now)

  const [members, tasks, submissionsToday, grouped, ranking, laggards] =
    await Promise.all([
      prisma.challengeMember.count({ where: { challengeId: challenge.id } }),
      prisma.dailyTask.count({ where: { challengeId: challenge.id, isActive: true } }),
      prisma.taskSubmission.count({
        where: { challengeId: challenge.id, submittedAt: { gte: start, lt: end } },
      }),
      prisma.taskSubmission.groupBy({
        by: ['status'],
        where: { challengeId: challenge.id, submittedAt: { gte: start, lt: end } },
        _count: true,
      }),
      getDailyRanking(challenge.id, now),
      getLaggingDetailed(challenge.id, now),
    ])

  const byStatus: Record<string, number> = {}
  for (const g of grouped) byStatus[g.status] = g._count

  return NextResponse.json({
    challenge,
    kpis: { members, tasks, submissionsToday, byStatus },
    ranking: ranking.map((r) => ({
      phone: r.phone,
      fullName: r.fullName,
      points: r.points,
      completed: r.completed,
    })),
    // La UI lee `laggards` con `pending` e `inactiveDays`.
    laggards: laggards.map((m) => ({
      phone: m.phone,
      fullName: m.fullName,
      pending: m.pending,
      completed: m.completed,
      total: m.total,
      inactiveDays: m.inactiveDays,
    })),
  })
}
