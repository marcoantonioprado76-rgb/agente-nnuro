export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { findIncomingUsdtByAmount } from '@/lib/blockchain'
import { activatePackPurchase } from '@/lib/activate-pack'
import { isCryptoTxUsed } from '@/lib/crypto-pay'

/** POST /api/pack-requests/crypto-cancel — cancela un pago cripto pendiente (plan). */
export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { id } = await req.json().catch(() => ({}))
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })

  const r = await prisma.packPurchaseRequest.findFirst({ where: { id, userId: user.id, status: 'PENDING' } })
  if (!r) {
    // Ya no está PENDING: pudo haberla aprobado el polling. Reportar aprobado si corresponde.
    const fresh = await prisma.packPurchaseRequest.findFirst({ where: { id, userId: user.id }, select: { status: true } })
    if (fresh && (fresh.status === 'APPROVED' || fresh.status === 'PAID')) return NextResponse.json({ ok: false, credited: true })
    return NextResponse.json({ ok: true, alreadyGone: true })
  }

  // Seguridad: si el pago YA llegó, activar en vez de cancelar (no perder plata).
  if (r.expectedAmount != null) {
    try {
      const found = await findIncomingUsdtByAmount(Number(r.expectedAmount), { notBefore: r.createdAt })
      if (found && !(await isCryptoTxUsed(found.txHash, { table: 'pack', id }))) {
        const ok = await activatePackPurchase(id, { txHash: found.txHash, blockNumber: BigInt(found.blockNumber), amountUsdt: found.amount, note: 'Detectado al cancelar' })
        if (ok) return NextResponse.json({ ok: false, credited: true })
      }
      // found === null → consulta on-chain exitosa sin pago → seguir a cancelar.
    } catch (e) {
      // RPC caído: NO cancelamos (evita rechazar un pago que podría estar confirmándose). Reintentar.
      console.error('[pack crypto-cancel] RPC:', e)
      return NextResponse.json({ ok: false, retry: true, error: 'No se pudo verificar el pago ahora. Intentá de nuevo en un momento.' })
    }
  }

  const upd = await prisma.packPurchaseRequest.updateMany({ where: { id, userId: user.id, status: 'PENDING' }, data: { status: 'REJECTED', notes: 'Cancelada por el usuario' } })
  if (upd.count === 0) {
    // Otro proceso (polling/cron) la resolvió justo ahora.
    const fresh = await prisma.packPurchaseRequest.findFirst({ where: { id, userId: user.id }, select: { status: true } })
    if (fresh && (fresh.status === 'APPROVED' || fresh.status === 'PAID')) return NextResponse.json({ ok: false, credited: true })
    return NextResponse.json({ ok: true, alreadyGone: true })
  }
  return NextResponse.json({ ok: true, cancelled: true })
}
