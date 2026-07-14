/**
 * Reto 90D — Generador de recordatorios (ADMIN-ONLY, sin UI).
 *
 * Construye los mensajes de recordatorio de WhatsApp para cada franja horaria.
 * Los textos son EXACTOS según el spec del módulo.
 */

export type ReminderKind = 'morning' | 'midday' | 'afternoon' | 'night'

export interface ReminderVars {
  nombre: string
  totalTareas?: number
  completadas?: number
  pendientes?: number
}

export function buildReminderMessage(kind: ReminderKind, vars: ReminderVars): string {
  const nombre = vars.nombre
  const totalTareas = vars.totalTareas ?? 0
  const completadas = vars.completadas ?? 0
  const pendientes = vars.pendientes ?? 0

  switch (kind) {
    case 'morning':
      return (
        `🔥 Reto 90D iniciado\n` +
        `Hola ${nombre}, hoy tienes ${totalTareas} metas por cumplir.\n` +
        `Recuerda enviar tus evidencias durante el día para sumar puntos y mantener tu disciplina activa.\n` +
        `Vamos por un día productivo.`
      )
    case 'midday':
      return (
        `📌 Primer seguimiento\n` +
        `Hola ${nombre}, este es tu avance hasta ahora:\n` +
        `✅ Completadas: ${completadas}  ⏳ Pendientes: ${pendientes}\n` +
        `Todavía estás a tiempo de cumplir tus metas del día.`
      )
    case 'afternoon':
      return (
        `🚀 Seguimiento de avance\n` +
        `Hola ${nombre}, no olvides tus metas del Reto 90D.\n` +
        `Te faltan ${pendientes} tareas por entregar.\n` +
        `Envía tus capturas o reportes para que podamos registrar tu avance.`
      )
    case 'night':
      return (
        `⚡ Último empuje del día\n` +
        `Hola ${nombre}, estás en la recta final.\n` +
        `✅ Completadas: ${completadas}  ⏳ Pendientes: ${pendientes}\n` +
        `Entrega tus evidencias antes del cierre diario.`
      )
    default: {
      // Exhaustividad: si se agrega una nueva franja sin manejarla, TS lo detecta.
      const _exhaustive: never = kind
      throw new Error(`Tipo de recordatorio no soportado: ${String(_exhaustive)}`)
    }
  }
}
