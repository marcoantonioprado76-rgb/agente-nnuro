export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/empresa/pago/solicitar
 * Un USUARIO de empresa sube su comprobante de pago. La solicitud queda PENDING
 * y la revisa/aprueba el ADMIN de SU empresa (no el super-admin).
 *
 * Body: { paymentProofUrl, paymentMethod?, notes? }  (paymentProofUrl requerido)
 *
 * plan/price son placeholders ('BASIC'/0); el admin define el plan real al aprobar.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // El usuario debe pertenecer a una empresa para solicitar.
    const me = await prisma.user.findUnique({
      where: { id: user.id },
      select: { organizationId: true },
    })
    if (!me?.organizationId) {
      return NextResponse.json(
        { error: 'No perteneces a una empresa' },
        { status: 403 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const { paymentProofUrl, paymentMethod, notes } = body ?? {}

    if (!paymentProofUrl || typeof paymentProofUrl !== 'string') {
      return NextResponse.json(
        { error: 'paymentProofUrl es requerido' },
        { status: 400 }
      )
    }

    await prisma.packPurchaseRequest.create({
      data: {
        userId: user.id,
        organizationId: me.organizationId,
        plan: 'BASIC',
        price: 0,
        paymentProofUrl,
        paymentMethod: paymentMethod || 'MANUAL',
        status: 'PENDING',
        notes: notes || null,
      },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[POST /api/empresa/pago/solicitar]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
