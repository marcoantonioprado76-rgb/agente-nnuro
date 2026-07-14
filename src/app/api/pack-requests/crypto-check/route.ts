export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { findIncomingUsdtByAmount } from '@/lib/blockchain'
import { activatePackPurchase } from '@/lib/activate-pack'
import { isCryptoTxUsed, CRYPTO_GRACE_MINUTES } from '@/lib/crypto-pay'

/** GET /api/pack-requests/crypto-check?id= — polling: detecta el pago por monto y activa el plan. */
export async function GET(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })

  const request = await prisma.packPurchaseRequest.findFirst({ where: { id, userId: user.id } })
  if (!request) return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 })

  if (request.status === 'APPROVED' || request.status === 'PAID') return NextResponse.json({ status: 'approved' })
  if (request.status !== 'PENDING' || request.expectedAmount == null) return NextResponse.json({ status: request.status.toLowerCase() })

  // Detectar el pago SIEMPRE primero (aunque haya vencido, por si confirmó tarde).
  // Si el RPC falla, findIncomingUsdtByAmount LANZA → no rechazamos (devolvemos pending
  // y reintenta el próximo poll/cron). Solo se rechaza tras una consulta on-chain EXITOSA.
  let found: Awaited<ReturnType<typeof findIncomingUsdtByAmount>>
  try {
    found = await findIncomingUsdtByAmount(Number(request.expectedAmount), { notBefore: request.createdAt })
  } catch (e) {
    console.error('[pack crypto-check] RPC:', e)
    return NextResponse.json({ status: 'pending' })
  }
  if (found) {
    const used = await isCryptoTxUsed(found.txHash, { table: 'pack', id })
    if (!used) {
      try {
        const ok = await activatePackPurchase(id, { txHash: found.txHash, blockNumber: BigInt(found.blockNumber), amountUsdt: found.amount, note: `Auto-detectado on-chain (${found.amount} USDT)` })
        if (ok) return NextResponse.json({ status: 'approved' })
      } catch (e) { console.error('[pack crypto-check] activar:', e) }
    }
  }

  // Sin pago (consulta on-chain exitosa): vencer recién tras la ventana de gracia.
  if (request.expiresAt && request.expiresAt.getTime() + CRYPTO_GRACE_MINUTES * 60_000 < Date.now()) {
    await prisma.packPurchaseRequest.updateMany({ where: { id, status: 'PENDING' }, data: { status: 'REJECTED', notes: 'Pago no recibido (venció)' } })
    return NextResponse.json({ status: 'expired' })
  }
  return NextResponse.json({ status: 'pending' })
}
