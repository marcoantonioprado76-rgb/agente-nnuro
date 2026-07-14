/**
 * Reto 90D — Constructor del prompt para el clasificador de evidencias.
 *
 * Devuelve EXACTAMENTE el prompt del sistema, rellenando los marcadores
 * {{tasks}}, {{evidence}} y {{dailyHistory}} con JSON legible.
 *
 * Las imágenes de referencia NO van en el texto: se adjuntan aparte en la
 * llamada de visión, etiquetadas por id de tarea. Aquí solo indicamos cuántas
 * referencias tiene cada tarea (`referenceImageCount`) para que el modelo sepa
 * que debe compararlas.
 */

export interface EvidencePromptTask {
  id: string
  title: string
  description: string
  evidenceType: string
  expectedKeywords: string[]
  points: number
  referenceImageCount?: number
}

export interface EvidencePromptInput {
  tasks: EvidencePromptTask[]
  evidence: { type: 'image' | 'text' | 'number' | 'link'; text?: string }
  dailyHistory: string
  /** System prompt del admin: tono, trato y contexto del plan de 90 días. */
  instructions?: string
}

export function buildEvidencePrompt(input: EvidencePromptInput): string {
  const tasksJson = JSON.stringify(input.tasks, null, 2)
  const evidenceJson = JSON.stringify(input.evidence, null, 2)
  const dailyHistory = input.dailyHistory && input.dailyHistory.trim().length > 0
    ? input.dailyHistory
    : 'Sin entregas previas registradas hoy.'

  const hasReferences = input.tasks.some((t) => (t.referenceImageCount ?? 0) > 0)

  const instructionsBlock = input.instructions && input.instructions.trim().length > 0
    ? `\nINSTRUCCIONES DEL COACH/ADMIN (contexto del plan y cómo tratar a los participantes). El campo "userMessage" que devuelvas DEBE seguir este tono y trato:\n"""\n${input.instructions.trim()}\n"""\n`
    : ''

  return `Eres un clasificador de evidencias para el sistema Reto 90D de My Diamond.${instructionsBlock}
Tu trabajo es analizar una evidencia enviada por WhatsApp y determinar a qué tarea diaria corresponde.
Reglas:
1. No puedes inventar tareas.
2. Solo puedes elegir una tarea de la lista proporcionada.
3. Si no estás seguro, debes pedir revisión o aclaración.
4. No apruebes evidencias ambiguas.
5. No apruebes capturas duplicadas.
6. Evalúa únicamente la evidencia y las reglas de la tarea.
7. Responde siempre en JSON válido.
8. No agregues explicación fuera del JSON.${hasReferences ? `
9. Algunas tareas incluyen IMÁGENES DE REFERENCIA (ejemplos de evidencia válida), adjuntas al final y etiquetadas con el id de su tarea.
10. Compara visualmente la EVIDENCIA DEL USUARIO con esas imágenes de referencia: si se parece claramente a la referencia de una tarea, sube la confianza; si no se parece a ninguna referencia disponible, baja la confianza y pide aclaración.
11. La primera imagen adjunta es SIEMPRE la evidencia del usuario; las siguientes son referencias, no las confundas con la evidencia.` : ''}
Lista de tareas activas: ${tasksJson}
Evidencia recibida: ${evidenceJson}
Historial del usuario en el día: ${dailyHistory}
Devuelve este formato:
{ "detectedTaskId": "string_or_null", "detectedTaskTitle": "string_or_null", "confidence": number, "status": "APPROVED | REJECTED | REVIEW | NEEDS_CLARIFICATION | DUPLICATED", "points": number, "explanation": "string", "needsManualReview": boolean, "userMessage": "string" }`
}
