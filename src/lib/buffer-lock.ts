/**
 * Lock en memoria por conversación para serializar el procesamiento del buffer.
 *
 * Lo comparten el "camino feliz" de cada engine (YCloud / WhatsApp Cloud / Meta)
 * y el worker de rescate (buffer-reclaim), de modo que una misma conversación
 * nunca se procese dos veces a la vez (evita respuestas duplicadas al cliente).
 *
 * Es válido porque el despliegue corre con numReplicas=1 (un solo proceso).
 * Se guarda en global para sobrevivir al hot-reload en desarrollo.
 */

declare global {
  // eslint-disable-next-line no-var
  var __buffer_locks: Set<string> | undefined
}

const locks: Set<string> = global.__buffer_locks ?? (global.__buffer_locks = new Set())

/** Intenta tomar el lock de una conversación. Devuelve false si ya está tomado. */
export function acquireBufferLock(conversationId: string): boolean {
  if (locks.has(conversationId)) return false
  locks.add(conversationId)
  return true
}

/** Libera el lock de una conversación. Llamar siempre en un `finally`. */
export function releaseBufferLock(conversationId: string): void {
  locks.delete(conversationId)
}
