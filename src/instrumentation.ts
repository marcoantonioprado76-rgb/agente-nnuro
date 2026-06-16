/**
 * Hook de instrumentación de Next.js: `register()` corre UNA vez al arrancar el
 * servidor, en CUALQUIER modo de despliegue (next start, server.mjs custom o
 * standalone server.js). Enciende el worker de rescate del buffer (opt-in con
 * ENABLE_DRAIN_WORKER=true), sin depender de cómo arranque el host (Render…).
 *
 * El import del worker va DENTRO del bloque `NEXT_RUNTIME === 'nodejs'` para que
 * Next lo elimine del bundle de Edge (donde no existen `crypto`, prisma, etc.).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startDrainWorker } = await import('@/lib/drain-worker')
    startDrainWorker()
  }
}
