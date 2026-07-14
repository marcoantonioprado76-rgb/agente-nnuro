export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { verifyBscTransaction } from '@/lib/blockchain'
import { viewerOrgId } from '@/lib/org-content'

/** POST /api/courses/[courseId]/enroll */
export async function POST(
  req: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    if (user.plan === 'NONE') {
      return NextResponse.json({ error: 'Necesitas un plan activo para acceder a los cursos' }, { status: 403 })
    }

    const body = await req.json()
    const paymentMethod: 'CRYPTO' | 'MANUAL' = body.paymentMethod === 'CRYPTO' ? 'CRYPTO' : 'MANUAL'
    const proofUrl: string = body.proofUrl ?? ''
    const txHash: string = body.txHash ?? ''

    const course = await prisma.course.findUnique({
      where: { id: params.courseId },
      select: { id: true, active: true, freeForPlan: true, price: true, organizationId: true },
    })

    if (!course || !course.active) {
      return NextResponse.json({ error: 'Curso no encontrado' }, { status: 404 })
    }

    // Aislamiento por empresa: no permitir inscribirse a un curso de otra empresa
    const oid = await viewerOrgId(user.id)
    if (((course as any).organizationId ?? null) !== oid) {
      return NextResponse.json({ error: 'Curso no encontrado' }, { status: 404 })
    }

    // Cursos gratis para plan → auto-aprobado sin pago
    const autoApprove = course.freeForPlan

    // Validaciones por método de pago
    if (!autoApprove) {
      if (paymentMethod === 'CRYPTO') {
        if (!txHash) return NextResponse.json({ error: 'txHash requerido para pago cripto' }, { status: 400 })
        // Prevent double-spend
        const txUsed = await prisma.courseEnrollment.findFirst({ where: { txHash } })
        if (txUsed) return NextResponse.json({ error: 'Esta transacción ya fue usada' }, { status: 409 })
      } else {
        if (!proofUrl) return NextResponse.json({ error: 'Sube el comprobante de pago' }, { status: 400 })
      }
    }

    // Verificación on-chain para CRYPTO
    let cryptoStatus: 'APPROVED' | 'PENDING_VERIFICATION' = 'PENDING_VERIFICATION'
    let blockNumber: bigint | null = null

    if (!autoApprove && paymentMethod === 'CRYPTO') {
      const verification = await verifyBscTransaction(txHash, Number(course.price))
      if (verification.success) {
        cryptoStatus = 'APPROVED'
        blockNumber = verification.blockNumber ? BigInt(verification.blockNumber) : null
      }
      // Si no verifica inmediatamente → PENDING_VERIFICATION (el cron lo aprobará)
    }

    // Determinar estado final
    const finalStatus = autoApprove
      ? 'APPROVED'
      : paymentMethod === 'CRYPTO'
        ? cryptoStatus
        : 'PENDING'

    // Upsert (permite reintentar si estaba REJECTED)
    const existing = await prisma.courseEnrollment.findUnique({
      where: { userId_courseId: { userId: user.id, courseId: params.courseId } },
    })

    if (existing) {
      if (existing.status === 'PENDING' || existing.status === 'PENDING_VERIFICATION' || existing.status === 'APPROVED') {
        return NextResponse.json({ error: 'Ya tienes una solicitud activa para este curso' }, { status: 409 })
      }
      const updated = await prisma.courseEnrollment.update({
        where: { id: existing.id },
        data: {
          status: finalStatus as any,
          paymentMethod,
          proofUrl: autoApprove ? null : (paymentMethod === 'MANUAL' ? proofUrl.trim() : null),
          txHash: paymentMethod === 'CRYPTO' ? txHash : null,
          blockNumber,
          notes: null,
        },
      })
      return NextResponse.json({ enrollment: updated, status: finalStatus })
    }

    const enrollment = await prisma.courseEnrollment.create({
      data: {
        userId: user.id,
        courseId: params.courseId,
        status: finalStatus as any,
        paymentMethod,
        proofUrl: autoApprove ? null : (paymentMethod === 'MANUAL' ? proofUrl.trim() : null),
        txHash: paymentMethod === 'CRYPTO' ? txHash : null,
        blockNumber,
      },
    })

    return NextResponse.json({ enrollment, status: finalStatus }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/courses/[courseId]/enroll]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
