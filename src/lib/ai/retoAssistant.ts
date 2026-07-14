// ─────────────────────────────────────────────────────────────────────────────
// Reto 90D — Asistente conversacional del bot.
// Responde a los participantes recordando el hilo: "¿qué tarea me falta?",
// "¿cómo voy?", saludos, etc. Sigue la personalidad del admin (system prompt).
// Devuelve intent: 'chat' (responder) o 'evidence' (es una entrega por texto).
// ─────────────────────────────────────────────────────────────────────────────
import type { RetoChatMessage } from '@/lib/reto90d/conversationService'

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions'

export type TaskStatusLite = { title: string; done: boolean; points: number; evidenceType: string }
export type AssistInput = {
  instructions?: string
  participantName: string
  challengeName: string
  tasksStatus: TaskStatusLite[]
  points: number
  history: RetoChatMessage[]
  userText: string
  /** Key de OpenAI resuelta (panel o entorno). Si no se pasa, usa process.env. */
  openaiKey?: string
}
export type AssistResult = { intent: 'chat' | 'evidence'; reply: string }

function pendingList(tasks: TaskStatusLite[]): string {
  if (!tasks.length) return 'Aún no hay tareas cargadas hoy.'
  const pend = tasks.filter((t) => !t.done)
  if (!pend.length) return '¡Ya completaste todas las tareas de hoy! 🎉'
  return pend.map((t) => `⬜ ${t.title} (${t.points} pts)`).join('\n')
}

/** Respuesta determinista de respaldo (sin OpenAI o ante error). */
function fallbackReply(input: AssistInput): string {
  const done = input.tasksStatus.filter((t) => t.done).length
  const total = input.tasksStatus.length
  return [
    `¡Hola ${input.participantName}! 👋`,
    `📅 Hoy: ${done}/${total} completadas · ⭐ ${input.points} pts`,
    '',
    'Te falta:',
    pendingList(input.tasksStatus),
    '',
    '📸 Envíame una foto como evidencia y la reviso.',
  ].join('\n')
}

// ── Recordatorio motivacional personalizado ─────────────────────────────────
export type ReminderKindES = 'morning' | 'midday' | 'afternoon' | 'night'
export type ReminderGenInput = {
  instructions?: string
  participantName: string
  challengeName: string
  kind: ReminderKindES
  tasksStatus: TaskStatusLite[]
  points: number
  dayNumber?: number // día del reto (1..90) si se conoce
  totalDays?: number // total de días del reto (p.ej. 90)
  streak?: number    // días consecutivos con al menos una tarea aprobada
  openaiKey?: string
}

/** "Día X de 90 · 🔥 racha de N días" (partes que existan). Se antepone a los mensajes. */
function progressBadge(dayNumber?: number, totalDays?: number, streak?: number): string {
  const parts: string[] = []
  if (dayNumber && totalDays) parts.push(`📅 Día ${dayNumber} de ${totalDays}`)
  if (streak && streak >= 2) parts.push(`🔥 Racha de ${streak} días`)
  return parts.join(' · ')
}

const KIND_CONTEXT: Record<ReminderKindES, string> = {
  morning: 'Es la MAÑANA: dale energía para arrancar el día.',
  midday: 'Es el MEDIODÍA: chequeo de avance, ánimo para seguir.',
  afternoon: 'Es la TARDE: recuérdale aprovechar lo que queda del día.',
  night: 'Es la NOCHE: última llamada para cerrar el día con sus tareas.',
}

function reminderFallback(input: ReminderGenInput): string {
  const done = input.tasksStatus.filter((t) => t.done)
  const pend = input.tasksStatus.filter((t) => !t.done)
  const hi: Record<ReminderKindES, string> = {
    morning: `¡Buenos días, ${input.participantName}! ☀️`,
    midday: `¡${input.participantName}, mediodía! ⏳`,
    afternoon: `¡${input.participantName}, buenas tardes! 💪`,
    night: `¡${input.participantName}, cerremos el día! 🌙`,
  }
  const badge = progressBadge(input.dayNumber, input.totalDays, input.streak)
  const head = badge ? `${hi[input.kind]}\n${badge}` : hi[input.kind]
  if (!input.tasksStatus.length) return `${head}\nHoy aún no hay tareas cargadas. ¡Prepárate para mañana! 🔥`
  if (!pend.length) return `${head}\n🎉 ¡Completaste TODAS tus tareas de hoy (${done.length}/${input.tasksStatus.length}) y sumaste ${input.points} pts! Sigue así, vas increíble. 🏆`
  const lista = pend.map((t) => `⬜ ${t.title}`).join('\n')
  const logro = done.length ? `Ya llevas ${done.length}/${input.tasksStatus.length} ✅ (${input.points} pts). ` : ''
  return `${head}\n${logro}Te falta${pend.length > 1 ? 'n' : ''}:\n${lista}\n\n📸 Mándame la evidencia y sumas puntos. ¡Tú puedes! 🚀`
}

/** Mensaje de recordatorio motivacional, consciente de lo YA entregado. */
export async function generateReminder(input: ReminderGenInput): Promise<string> {
  const apiKey = input.openaiKey || process.env.OPENAI_API_KEY
  if (!apiKey || !input.tasksStatus.length) return reminderFallback(input)

  const done = input.tasksStatus.filter((t) => t.done).map((t) => t.title)
  const pend = input.tasksStatus.filter((t) => !t.done).map((t) => t.title)

  const dayLine = input.dayNumber && input.totalDays ? `Es el DÍA ${input.dayNumber} de ${input.totalDays} del reto.` : ''
  const streakLine = input.streak && input.streak >= 2
    ? `Lleva una RACHA de ${input.streak} días seguidos entregando: felicítalo por la racha y anímalo a NO romperla.`
    : (input.streak === 0 ? 'Hoy NO tiene racha activa (venía sin entregar): invítalo a empezar una racha nueva hoy.' : '')

  const system = [
    input.instructions?.trim() || 'Eres el coach del Reto 90 Días de My Diamond. Motivas con cercanía y energía.',
    '',
    `Reto "${input.challengeName}". Participante: ${input.participantName}. Puntos hoy: ${input.points}.`,
    dayLine,
    streakLine,
    KIND_CONTEXT[input.kind],
    `Tareas YA entregadas hoy: ${done.length ? done.join('; ') : 'ninguna'}.`,
    `Tareas PENDIENTES hoy: ${pend.length ? pend.join('; ') : 'ninguna'}.`,
    '',
    'Escribe UN mensaje corto de recordatorio MOTIVACIONAL (máx 4 líneas), en español, con su nombre.',
    '- Si sabes el día del reto y/o la racha, menciónalos con naturalidad al inicio.',
    '- Reconoce y felicita lo que YA entregó (si entregó algo).',
    '- Motívalo a entregar SOLO las tareas pendientes; NO le recuerdes las que ya hizo.',
    '- Si ya completó todo, felicítalo fuerte y anímalo a mantener la racha (sin pedir más).',
    '- Cierra invitando a mandar la evidencia (foto o texto). Usa 1-2 emojis, sin exagerar.',
    'Devuelve SOLO el texto del mensaje (sin comillas ni JSON).',
  ].filter(Boolean).join('\n')

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 20000)
  try {
    const res = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      signal: controller.signal,
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'system', content: system }, { role: 'user', content: 'Genera el recordatorio.' }],
        temperature: 0.7,
        max_tokens: 220,
      }),
    })
    if (!res.ok) throw new Error(`OpenAI ${res.status}`)
    const data = await res.json()
    const txt = (data.choices?.[0]?.message?.content as string)?.trim()
    return txt || reminderFallback(input)
  } catch (err) {
    console.error('[reto90d/reminder] failed:', err)
    return reminderFallback(input)
  } finally {
    clearTimeout(timeout)
  }
}

// ── Acompañamiento semanal / mensual (diagnóstico motivacional) ──────────────
export type ProgressPeriod = 'semana' | 'mes'
export type ProgressInput = {
  instructions?: string
  participantName: string
  challengeName: string
  period: ProgressPeriod
  approved: number     // tareas aprobadas en el periodo
  points: number       // puntos del periodo
  activeDays: number   // días que entregó algo
  periodDays: number   // días que tuvo el periodo (7 o ~30)
  streak?: number      // racha actual (días seguidos)
  position?: number    // posición en el ranking acumulado
  totalMembers?: number
  pointsToNext?: number
  openaiKey?: string
}

/** "Vas #4 de 30, a 15 pts del podio de arriba." (o '' si no hay datos). */
function positionLine(position?: number, total?: number, pointsToNext?: number): string {
  if (!position || !total) return ''
  const base = `Vas en el puesto #${position} de ${total} en el ranking del reto`
  if (position > 1 && pointsToNext && pointsToNext > 0) {
    return `${base}, a ${pointsToNext} pts de subir un lugar.`
  }
  if (position === 1) return `${base}: ¡estás en la CIMA! 🥇`
  return `${base}.`
}

function progressFallback(i: ProgressInput): string {
  const p = i.period
  const pos = positionLine(i.position, i.totalMembers, i.pointsToNext)
  const racha = i.streak && i.streak >= 2 ? `🔥 Racha de ${i.streak} días. ` : ''
  if (i.approved === 0) {
    return `¡Hola ${i.participantName}! 💪 Esta ${p} no registré entregas tuyas. Es un nuevo comienzo: hoy es el mejor día para retomar. Mándame tu primera evidencia y arrancamos con todo 🚀`
  }
  return `¡${i.participantName}, resumen de tu ${p}! 🏅\n✅ ${i.approved} tareas · ⭐ ${i.points} pts · 📅 ${i.activeDays}/${i.periodDays} días activo. ${racha}\n${pos}\n¡Vas muy bien! Sigamos sumando la próxima ${p}. 🔥`.replace(/\n{2,}/g, '\n')
}

/** Mensaje de acompañamiento con diagnóstico del periodo (semana/mes). */
export async function generateProgressMessage(input: ProgressInput): Promise<string> {
  const apiKey = input.openaiKey || process.env.OPENAI_API_KEY
  if (!apiKey) return progressFallback(input)

  const pos = positionLine(input.position, input.totalMembers, input.pointsToNext)
  const streakLine = input.streak && input.streak >= 2 ? `Racha actual: ${input.streak} días seguidos.` : ''

  const system = [
    input.instructions?.trim() || 'Eres el coach del Reto 90 Días de My Diamond. Acompañas con cercanía y motivación.',
    '',
    `Reto "${input.challengeName}". Participante: ${input.participantName}.`,
    `Resumen de la ${input.period}: ${input.approved} tareas aprobadas, ${input.points} puntos, activo ${input.activeDays} de ${input.periodDays} días.`,
    streakLine,
    pos ? `Ranking: ${pos}` : '',
    '',
    `Escribe UN mensaje de acompañamiento de la ${input.period} (máx 5 líneas), en español, con su nombre.`,
    '- Dale un diagnóstico breve y motivador de cómo le fue.',
    '- Si tiene racha o una buena posición en el ranking, menciónalo para motivarlo.',
    '- Si le fue bien, felicítalo y rétalo a más; si le fue flojo, anímalo sin regañar, con foco en retomar.',
    '- Termina con una meta concreta y positiva para la próxima ' + input.period + '.',
    'Devuelve SOLO el texto (sin comillas ni JSON).',
  ].filter(Boolean).join('\n')

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 20000)
  try {
    const res = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      signal: controller.signal,
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'system', content: system }, { role: 'user', content: 'Genera el mensaje.' }],
        temperature: 0.7,
        max_tokens: 260,
      }),
    })
    if (!res.ok) throw new Error(`OpenAI ${res.status}`)
    const data = await res.json()
    const txt = (data.choices?.[0]?.message?.content as string)?.trim()
    return txt || progressFallback(input)
  } catch (err) {
    console.error('[reto90d/progress] failed:', err)
    return progressFallback(input)
  } finally {
    clearTimeout(timeout)
  }
}

// ── Reenganche de inactivos (mensaje empático, NO regaña) ────────────────────
export type ReengageInput = {
  instructions?: string
  participantName: string
  challengeName: string
  inactiveDays: number
  dayNumber?: number
  totalDays?: number
  openaiKey?: string
}

function reengageFallback(i: ReengageInput): string {
  return (
    `¡Hola ${i.participantName}! 💛 Te extrañé por acá estos días. ` +
    `El reto sigue y tu lugar te está esperando — no importa cuánto tiempo pasó, hoy es un gran día para retomar. ` +
    `Mándame una sola evidencia y arrancamos de nuevo, paso a paso. ¡Cuento contigo! 🚀`
  )
}

/** Mensaje cálido para reactivar a alguien que dejó de entregar (ban-safe: solo opt-in). */
export async function generateReengagement(input: ReengageInput): Promise<string> {
  const apiKey = input.openaiKey || process.env.OPENAI_API_KEY
  if (!apiKey) return reengageFallback(input)

  const system = [
    input.instructions?.trim() || 'Eres el coach del Reto 90 Días de My Diamond. Eres cercano, cálido y motivador.',
    '',
    `Reto "${input.challengeName}". Participante: ${input.participantName}.`,
    `Lleva ${input.inactiveDays} días sin enviar evidencias.`,
    input.dayNumber && input.totalDays ? `El reto va por el día ${input.dayNumber} de ${input.totalDays}.` : '',
    '',
    'Escribe UN mensaje corto (máx 4 líneas), en español, para RECONECTAR con cariño.',
    '- NUNCA regañes ni hagas sentir culpa. Empatía total.',
    '- Hazle saber que lo extrañaste y que su lugar sigue ahí.',
    '- Baja la barrera: pídele UNA sola acción pequeña hoy (una evidencia).',
    '- Cierra con ánimo y 1-2 emojis cálidos.',
    'Devuelve SOLO el texto (sin comillas ni JSON).',
  ].filter(Boolean).join('\n')

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 20000)
  try {
    const res = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      signal: controller.signal,
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'system', content: system }, { role: 'user', content: 'Genera el mensaje de reconexión.' }],
        temperature: 0.8,
        max_tokens: 220,
      }),
    })
    if (!res.ok) throw new Error(`OpenAI ${res.status}`)
    const data = await res.json()
    const txt = (data.choices?.[0]?.message?.content as string)?.trim()
    return txt || reengageFallback(input)
  } catch (err) {
    console.error('[reto90d/reengage] failed:', err)
    return reengageFallback(input)
  } finally {
    clearTimeout(timeout)
  }
}

// ── Graduación / cierre del reto (mensaje de logro) ──────────────────────────
export type GraduationInput = {
  instructions?: string
  participantName: string
  challengeName: string
  approved: number       // tareas aprobadas en todo el reto
  points: number         // puntos totales
  activeDays: number     // días que entregó algo
  totalDays: number      // días del reto
  position?: number
  totalMembers?: number
  openaiKey?: string
}

function graduationFallback(i: GraduationInput): string {
  const pos = i.position && i.totalMembers ? ` Terminaste en el puesto #${i.position} de ${i.totalMembers}.` : ''
  return (
    `🎓 ¡Lo lograste, ${i.participantName}! Completaste el reto *${i.challengeName}*.\n` +
    `A lo largo de estos ${i.totalDays} días sumaste ${i.points} puntos con ${i.approved} evidencias, activo ${i.activeDays} días.${pos}\n` +
    `Estoy MUY orgulloso de ti. Esto es solo el comienzo. 💎🏆`
  )
}

/** Mensaje de graduación al terminar el reto (día final). */
export async function generateGraduation(input: GraduationInput): Promise<string> {
  const apiKey = input.openaiKey || process.env.OPENAI_API_KEY
  if (!apiKey) return graduationFallback(input)

  const system = [
    input.instructions?.trim() || 'Eres el coach del Reto 90 Días de My Diamond. Celebras los logros con emoción sincera.',
    '',
    `Reto "${input.challengeName}". Participante: ${input.participantName}.`,
    `Cerró el reto de ${input.totalDays} días con ${input.approved} evidencias aprobadas, ${input.points} puntos, activo ${input.activeDays} días.`,
    input.position && input.totalMembers ? `Terminó en el puesto #${input.position} de ${input.totalMembers}.` : '',
    '',
    'Escribe UN mensaje de GRADUACIÓN (máx 5 líneas), en español, con su nombre.',
    '- Celébralo con emoción genuina por haber llegado al final.',
    '- Reconoce sus números (puntos, días activos, posición si la hay).',
    '- Cierra con una frase inspiradora de que esto es el comienzo de una nueva etapa.',
    'Devuelve SOLO el texto (sin comillas ni JSON).',
  ].filter(Boolean).join('\n')

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 20000)
  try {
    const res = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      signal: controller.signal,
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'system', content: system }, { role: 'user', content: 'Genera el mensaje de graduación.' }],
        temperature: 0.7,
        max_tokens: 260,
      }),
    })
    if (!res.ok) throw new Error(`OpenAI ${res.status}`)
    const data = await res.json()
    const txt = (data.choices?.[0]?.message?.content as string)?.trim()
    return txt || graduationFallback(input)
  } catch (err) {
    console.error('[reto90d/graduation] failed:', err)
    return graduationFallback(input)
  } finally {
    clearTimeout(timeout)
  }
}

export async function assistParticipant(input: AssistInput): Promise<AssistResult> {
  const apiKey = input.openaiKey || process.env.OPENAI_API_KEY
  if (!apiKey) return { intent: 'chat', reply: fallbackReply(input) }

  const statusText = input.tasksStatus.length
    ? input.tasksStatus
        .map((t) => `${t.done ? '✅' : '⬜'} ${t.title} — ${t.points} pts (${t.evidenceType})`)
        .join('\n')
    : 'Sin tareas cargadas hoy.'

  const system = [
    input.instructions?.trim()
      ? input.instructions.trim()
      : 'Eres el coach del Reto 90 Días de My Diamond. Trata a los participantes con motivación y cercanía.',
    '',
    `Contexto: reto "${input.challengeName}". Participante: ${input.participantName}. Puntos de hoy: ${input.points}.`,
    'Estado de las tareas de HOY de este participante:',
    statusText,
    '',
    'Responde el mensaje del participante en tono cercano y BREVE (máx ~4 líneas), en español.',
    '- Si pregunta qué le falta / cómo va / sus puntos: dile EXACTAMENTE las tareas pendientes (las ⬜) y sus puntos.',
    '- Si saluda o charla: salúdalo y recuérdale amablemente qué le falta hoy.',
    '- Recuerda el hilo (te doy los últimos mensajes).',
    '- Nunca inventes tareas ni marques nada como aprobado; la evidencia se aprueba solo con fotos.',
    'Devuelve SOLO JSON: {"intent":"chat"|"evidence","reply":"..."}.',
    'Usa intent="evidence" SOLO si el participante está entregando claramente la prueba de una tarea por texto/número/enlace (no una foto). En cualquier otro caso usa "chat".',
  ].join('\n')

  const messages: Array<{ role: string; content: string }> = [{ role: 'system', content: system }]
  for (const m of input.history.slice(-10)) {
    messages.push({ role: m.role === 'bot' ? 'assistant' : 'user', content: m.content })
  }
  messages.push({ role: 'user', content: input.userText })

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 20000)
  try {
    const res = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      signal: controller.signal,
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        response_format: { type: 'json_object' },
        temperature: 0.4,
        max_tokens: 400,
      }),
    })
    if (!res.ok) throw new Error(`OpenAI ${res.status}`)
    const data = await res.json()
    const raw = (data.choices?.[0]?.message?.content as string) ?? '{}'
    const parsed = JSON.parse(raw) as { intent?: string; reply?: string }
    const intent: 'chat' | 'evidence' = parsed.intent === 'evidence' ? 'evidence' : 'chat'
    const reply =
      typeof parsed.reply === 'string' && parsed.reply.trim() ? parsed.reply.trim() : fallbackReply(input)
    return { intent, reply }
  } catch (err) {
    console.error('[reto90d/assistant] failed:', err)
    return { intent: 'chat', reply: fallbackReply(input) }
  } finally {
    clearTimeout(timeout)
  }
}
