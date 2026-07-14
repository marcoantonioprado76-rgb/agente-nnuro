export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/empresa/pago
 * Para un USUARIO de empresa: devuelve los datos de cobro de SU empresa
 * (transferencia / USDT / QR) para que sepa cómo pagarle a su empresa.
 * Si no pertenece a ninguna empresa → { payment: null }.
 */
export async function GET() {
  try {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const u = await prisma.user.findUnique({
      where: { id: user.id },
      select: { organizationId: true },
    })
    if (!u?.organizationId) return NextResponse.json({ payment: null })
    const org = await prisma.organization.findUnique({
      where: { id: u.organizationId },
      select: {
        name: true, logoUrl: true,
        payUsdtWallet: true, payUsdtNetwork: true, payBankInfo: true,
        payQrUrl: true, payInstructions: true,
      },
    })
    return NextResponse.json({ payment: org })
  } catch (e) {
    console.error('[GET /api/empresa/pago]', e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
