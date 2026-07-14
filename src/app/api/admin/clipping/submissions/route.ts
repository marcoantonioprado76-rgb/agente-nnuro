export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

function getAuth() {
  const cookieStore = cookies()
  const token = cookieStore.get('auth_token')?.value
  if (!token) return null
  return verifyToken(token)
}

async function requireAdmin(auth: ReturnType<typeof getAuth>) {
  if (!auth) return false
  const user = await prisma.user.findUnique({ where: { id: auth.userId }, select: { isAdmin: true } })
  return user?.isAdmin === true
}

/** GET /api/admin/clipping/submissions — list all submissions */
export async function GET(request: NextRequest) {
  try {
    const auth = getAuth()
    if (!await requireAdmin(auth)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const campaignId = searchParams.get('campaignId')

    const submissions = await prisma.clippingSubmission.findMany({
      where: {
        ...(status && { status: status as 'HOLD' | 'APPROVED' | 'REJECTED' }),
        ...(campaignId && { campaignId }),
      },
      include: {
        user: { select: { username: true, fullName: true, email: true } },
        campaign: { select: { title: true, cpmUSD: true, platform: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    })

    return NextResponse.json({ submissions })
  } catch (err) {
    console.error('[GET /api/admin/clipping/submissions]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

/** PATCH /api/admin/clipping/submissions — manually approve or reject */
export async function PATCH(request: NextRequest) {
  try {
    const auth = getAuth()
    if (!await requireAdmin(auth)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const body = await request.json()
    const { id, action, rejectionReason } = body

    if (!id || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'id y action (approve|reject) requeridos' }, { status: 400 })
    }

    const submission = await prisma.clippingSubmission.findUnique({
      where: { id },
      include: { campaign: true },
    })

    if (!submission) {
      return NextResponse.json({ error: 'Submission no encontrada' }, { status: 404 })
    }

    const now = new Date()

    if (action === 'approve') {
      if (submission.status !== 'HOLD') {
        return NextResponse.json({ error: 'Solo se pueden aprobar submissions en estado HOLD' }, { status: 409 })
      }

      const earningsUSD = (submission.deltaViews / 1000) * Number(submission.campaign.cpmUSD)

      await prisma.$transaction(async (tx) => {
        // Lock optimista: solo actualiza si sigue en HOLD
        const result = await tx.clippingSubmission.updateMany({
          where: { id, status: 'HOLD' },
          data: { status: 'APPROVED', approvedAt: now, earningsUSD },
        })
        if (result.count === 0) throw new Error('ALREADY_PROCESSED')

        await tx.clippingPayout.create({
          data: {
            userId: submission.userId,
            submissionId: submission.id,
            amountUSD: earningsUSD,
            description: `${submission.deltaViews.toLocaleString()} vistas × $${submission.campaign.cpmUSD}/1000`,
          },
        })
      })
    } else {
      await prisma.clippingSubmission.update({
        where: { id },
        data: { status: 'REJECTED', rejectedAt: now, rejectionReason: rejectionReason || null },
      })
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    if (err?.message === 'ALREADY_PROCESSED') {
      return NextResponse.json({ error: 'Esta submission ya fue procesada por otro proceso' }, { status: 409 })
    }
    console.error('[PATCH /api/admin/clipping/submissions]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
