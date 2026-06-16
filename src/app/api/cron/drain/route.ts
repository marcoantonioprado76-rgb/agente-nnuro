export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { reclaimStuckBuffers } from '@/lib/buffer-reclaim'

/**
 * Endpoint del worker de rescate del buffer.
 * Recupera mensajes que quedaron en `buffered=true` si el proceso reinició
 * durante la ventana de 15s. Lo dispara el setInterval interno de server.mjs
 * (ENABLE_DRAIN_WORKER) y/o un cron externo como respaldo.
 */
export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  try {
    const result = await reclaimStuckBuffers()
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    console.error('[CRON drain]', err)
    return NextResponse.json({ error: 'Error en worker de rescate' }, { status: 500 })
  }
}
