/**
 * Entradas — Tipo de cambio USDT → BOB (Binance P2P).
 *
 * GET /api/entradas/exchange-rate → { rate, source, updatedAt }
 *
 * Lo usa la página pública de compra: si el cliente elige pagar por QR/transferencia
 * (bolivianos), le mostramos el precio convertido con el tipo de cambio real.
 * Público (la página de compra no requiere login) y cacheado 15 min en el servidor.
 */
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getUsdtToBob } from '@/lib/exchangeRate'

export async function GET() {
  const rate = await getUsdtToBob()
  return NextResponse.json(rate, {
    headers: { 'Cache-Control': 'public, max-age=300' }, // 5 min en el navegador
  })
}
