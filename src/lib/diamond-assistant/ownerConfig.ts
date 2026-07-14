/**
 * Diamond Assistant — "Modo Dueño": identificación del número dueño.
 *
 * El dueño (Marco) puede darle ÓRDENES de administración a CAMILA por WhatsApp
 * (programar, subir recursos, editar su cerebro, etc.). Solo SU número activa ese
 * modo; cualquier otro número recibe la atención normal.
 *
 * Los números autorizados se leen de la variable de entorno `DIAMOND_OWNER_PHONES`
 * (uno o varios separados por coma, en formato internacional sin '+', ej.
 * "59167534487,59171234567"). NUNCA se hardcodean en el código.
 */

/** Solo dígitos de un teléfono cualquiera. */
function digits(phone: string): string {
  return (phone ?? '').replace(/\D/g, '')
}

/** Lista de números dueños autorizados (solo dígitos). */
export function ownerPhones(): string[] {
  return (process.env.DIAMOND_OWNER_PHONES ?? '')
    .split(',')
    .map((s) => digits(s))
    .filter((s) => s.length >= 8)
}

/**
 * ¿Este teléfono es de un dueño autorizado?
 * Compara por igualdad exacta o por sufijo (tolera diferencias de código de país),
 * siempre exigiendo al menos 8 dígitos para no matchear números cortos por error.
 */
export function isOwnerPhone(phone: string): boolean {
  const d = digits(phone)
  if (d.length < 8) return false
  return ownerPhones().some(
    (o) => o === d || (o.length >= 8 && d.length >= 8 && (d.endsWith(o) || o.endsWith(d))),
  )
}
