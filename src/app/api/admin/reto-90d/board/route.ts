export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser, unauthorizedAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import { getActiveChallenge } from '@/lib/reto90d/challengeService'
import { getActiveTasksForToday } from '@/lib/reto90d/taskService'
import { listMembers, normalizePhone } from '@/lib/reto90d/memberService'
import { isValidDateParam } from '../_shared'

// ═══════════════════════════════════════════════════════════════════════════
// GET /api/admin/reto-90d/board?challengeId=&date=YYYY-MM-DD
// Tablero (matriz) del Reto 90D: usuarios inscritos × tareas del día, con el
// estado de cada celda y los puntos por usuario. ADMIN-ONLY.
// La zona horaria del reto es America/La_Paz (UTC-4).
// ═══════════════════════════════════════════════════════════════════════════

// Prioridad de estado al elegir la MEJOR entrega de una (usuario, tarea).
const STATUS_PRIORITY: Record<string, number> = {
  APPROVED: 6,
  REVIEW: 5,
  NEEDS_CLARIFICATION: 4,
  PENDING: 3,
  DUPLICATED: 2,
  REJECTED: 1,
}

function todayInLaPaz(): string {
  // "YYYY-MM-DD" del día en curso en America/La_Paz.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/La_Paz',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

export async function GET(req: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  const { searchParams } = new URL(req.url)
  const challengeId = searchParams.get('challengeId')
  const dateParam = searchParams.get('date')
  if (dateParam && !isValidDateParam(dateParam)) {
    return NextResponse.json({ error: 'Fecha inválida (usa YYYY-MM-DD)' }, { status: 400 })
  }
  const date = dateParam || todayInLaPaz()

  // Resolver el reto.
  const challenge = challengeId
    ? await prisma.challenge.findUnique({ where: { id: challengeId } })
    : await getActiveChallenge()

  if (!challenge) {
    return NextResponse.json({ challenge: null, date, tasks: [], rows: [] })
  }

  // Tareas del día (activas) y miembros ACTIVE.
  const [taskList, members] = await Promise.all([
    getActiveTasksForToday(challenge.id),
    listMembers(challenge.id, { status: 'ACTIVE' }),
  ])

  const tasks = taskList.map((t) => ({ id: t.id, title: t.title, points: t.points }))

  // Ventana del día en America/La_Paz (UTC-4).
  const start = new Date(`${date}T00:00:00.000-04:00`)
  const end = new Date(`${date}T24:00:00.000-04:00`)

  const submissions = await prisma.taskSubmission.findMany({
    where: {
      challengeId: challenge.id,
      submittedAt: { gte: start, lt: end },
    },
    select: { phone: true, taskId: true, status: true, pointsEarned: true },
  })

  // Indexar entregas por teléfono normalizado.
  // best[phone][taskId] = mejor entrega (según STATUS_PRIORITY).
  // approvedPoints[phone] = suma de pointsEarned de entregas APPROVED del día.
  const best: Record<string, Record<string, { status: string; points: number }>> = {}
  const approvedPoints: Record<string, number> = {}

  for (const s of submissions) {
    const phone = normalizePhone(s.phone)
    if (s.status === 'APPROVED') {
      approvedPoints[phone] = (approvedPoints[phone] ?? 0) + (s.pointsEarned ?? 0)
    }
    if (!s.taskId) continue
    const perTask = (best[phone] ??= {})
    const current = perTask[s.taskId]
    const incomingRank = STATUS_PRIORITY[s.status] ?? 0
    const currentRank = current ? STATUS_PRIORITY[current.status] ?? 0 : -1
    if (incomingRank > currentRank) {
      perTask[s.taskId] = {
        status: s.status,
        points: s.status === 'APPROVED' ? s.pointsEarned ?? 0 : 0,
      }
    }
  }

  // Construir la matriz.
  const rows = members.map((m) => {
    const phone = normalizePhone(m.phone)
    const perTask = best[phone] ?? {}
    const cells: Record<string, { status: string; points: number }> = {}
    for (const t of tasks) {
      const cell = perTask[t.id]
      if (cell) cells[t.id] = cell
    }
    return {
      phone: m.phone,
      fullName: m.fullName,
      points: approvedPoints[phone] ?? 0,
      cells,
    }
  })

  rows.sort((a, b) => b.points - a.points)

  return NextResponse.json({
    challenge: { id: challenge.id, name: challenge.name },
    date,
    tasks,
    rows,
  })
}
