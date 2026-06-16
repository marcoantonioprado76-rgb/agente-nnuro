/**
 * Arranque del worker de rescate del buffer. Vive en su propio módulo (sólo
 * Node) para que el hook de instrumentación lo importe únicamente en el runtime
 * de Node y nunca se empaquete para Edge (donde no existe `crypto`, prisma, etc.).
 *
 * Es opt-in: sólo arranca con ENABLE_DRAIN_WORKER=true.
 */
import { reclaimStuckBuffers } from './buffer-reclaim'

export function startDrainWorker(): void {
  if (process.env.ENABLE_DRAIN_WORKER !== 'true') {
    console.log('[DRAIN] Worker de rescate desactivado (set ENABLE_DRAIN_WORKER=true para activarlo)')
    return
  }

  // Evita doble arranque (register puede invocarse más de una vez en algunos setups).
  const g = globalThis as unknown as { __drainWorkerStarted?: boolean }
  if (g.__drainWorkerStarted) return
  g.__drainWorkerStarted = true

  const intervalMs = parseInt(process.env.DRAIN_INTERVAL_MS || '30000', 10) || 30000

  let running = false
  const timer = setInterval(async () => {
    if (running) return // evita solapar corridas
    running = true
    try {
      await reclaimStuckBuffers()
    } catch (err) {
      console.error('[DRAIN] worker error:', err instanceof Error ? err.message : err)
    } finally {
      running = false
    }
  }, intervalMs)
  if (typeof timer.unref === 'function') timer.unref()

  console.log(`[DRAIN] Worker de rescate ACTIVO (instrumentation) cada ${intervalMs}ms`)
}
