/**
 * Diamond Assistant — "Modo Dueño": el CEREBRO ADMIN.
 *
 * Cuando el DUEÑO (Marco) le escribe a CAMILA, en vez del cerebro normal de
 * atención se usa ESTE motor: entiende órdenes de administración en lenguaje
 * natural y las ejecuta con herramientas (function-calling de OpenAI).
 *
 * Reglas de oro:
 *   - Acciones de BAJO riesgo (guardar recurso, listar, editar descripción) → se
 *     ejecutan al toque y se confirma.
 *   - Acciones DELICADAS (borrar, programar, campañas) → NO se ejecutan solas:
 *     se guardan como PENDIENTES (ownerActions) y CAMILA pide "aprobado" primero.
 *
 * Este archivo crece por fase: cada fase agrega tools + su ejecutor. Fase 1 =
 * Biblioteca. `runOwnerTurn` nunca lanza: ante error devuelve un texto claro.
 */

import { openaiChat, type AssistantMessage, type ChatMessage, type ChatCompletionTool } from './openaiChat'
import type { OwnerInboundMedia } from './ownerActions'
import {
  saveResourceFromMedia,
  saveLinkResource,
  saveTextResource,
  listLibrary,
  updateLibraryAsset,
  findAsset,
  createPendingAction,
  addKnowledge,
  updateKnowledge,
  listKnowledge,
  findKnowledge,
  resolveGroup,
  resolveMediaRefs,
  wallClockToUtc,
  formatLocal,
  nowLocalText,
  getAgentTimezone,
  listGroups,
  listScheduledPosts,
  findScheduledPost,
  findAnyScheduledPost,
  listCampaigns,
  findCampaign,
  countCampaignAudience,
  pauseCampaign,
  campaignStatusEs,
  adjustTone,
  setVoiceMode,
  toggleWelcome,
  activityReport,
} from './ownerActions'

const TURN_TIMEOUT_MS = 60000 // 60s: los modelos gpt-5.x razonan y tardan un poco más

export type OwnerTurnInput = {
  agent: { id: string; name: string; model: string; openaiKey: string }
  ownerPhone: string
  /** Archivos que el dueño mandó en este turno (para guardarlos si lo pide). */
  attachedMedia: OwnerInboundMedia[]
  history: { role: 'user' | 'bot'; content: string }[]
  userMessage: string
  /** Id admin para `createdBy` de los recursos (opcional). */
  createdBy?: string | null
}

export type OwnerTurnResult = { text: string }

// ── Herramientas (Fase 1: Biblioteca) ────────────────────────────────────────────

const TOOLS: ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'save_resource',
      description:
        'Guarda en la biblioteca el ARCHIVO (imagen/video/audio/documento) que el dueño acaba de enviar en este chat. ' +
        'Úsala cuando el dueño manda un archivo y pide guardarlo. La descripción es lo que se MANDA junto al recurso; ' +
        'el título es interno (para encontrarlo). Si el dueño no dio título/descripción claros, igual podés guardarlo con lo que haya.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Título interno para identificar el recurso (no se manda).' },
          description: { type: 'string', description: 'Descripción/pie que SE MANDA junto al recurso (opcional).' },
          tags: { type: 'array', items: { type: 'string' }, description: 'Etiquetas, ej. ["testimonio","producto"] (opcional).' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'save_link',
      description: 'Guarda un ENLACE (URL) en la biblioteca.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          linkUrl: { type: 'string', description: 'La URL, empieza con http:// o https://' },
          tags: { type: 'array', items: { type: 'string' } },
        },
        required: ['linkUrl'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'save_text',
      description: 'Guarda un TEXTO (mensaje reutilizable) en la biblioteca.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          content: { type: 'string', description: 'El texto a guardar.' },
          tags: { type: 'array', items: { type: 'string' } },
        },
        required: ['content'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_library',
      description: 'Lista o busca recursos de la biblioteca (para consultarle al dueño qué hay).',
      parameters: {
        type: 'object',
        properties: { query: { type: 'string', description: 'Texto a buscar en título/descripción (opcional).' } },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_resource',
      description: 'Edita el título, la descripción o las etiquetas de un recurso YA existente en la biblioteca.',
      parameters: {
        type: 'object',
        properties: {
          ref: { type: 'string', description: 'Título (o id) del recurso a editar.' },
          title: { type: 'string' },
          description: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' } },
        },
        required: ['ref'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_resource',
      description: 'Borra un recurso de la biblioteca. OJO: requiere aprobación del dueño (no se borra al toque).',
      parameters: {
        type: 'object',
        properties: { ref: { type: 'string', description: 'Título (o id) del recurso a borrar.' } },
        required: ['ref'],
      },
    },
  },
  // ── Fase 2: Cerebro / conocimiento ──
  {
    type: 'function',
    function: {
      name: 'add_knowledge',
      description: 'Agrega un dato a TU conocimiento (lo que sabés para responderle a la gente). Ej: precios, requisitos, info del negocio.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Título corto del dato (ej. "Precio kit básico").' },
          content: { type: 'string', description: 'El dato/conocimiento completo.' },
          category: { type: 'string', description: 'Categoría opcional (ej. "precios", "producto").' },
        },
        required: ['content'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_knowledge',
      description: 'Corrige/edita un dato que YA sabés (ej. cambiar un precio).',
      parameters: {
        type: 'object',
        properties: {
          ref: { type: 'string', description: 'Título o parte del dato a corregir.' },
          title: { type: 'string' },
          content: { type: 'string', description: 'El nuevo contenido.' },
          category: { type: 'string' },
        },
        required: ['ref'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'query_knowledge',
      description: 'Consulta/lista lo que sabés (para decirle al dueño qué tenés en tu cerebro).',
      parameters: {
        type: 'object',
        properties: { query: { type: 'string', description: 'Tema a buscar (opcional).' } },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_knowledge',
      description: 'Borra un dato de tu conocimiento. OJO: requiere aprobación del dueño.',
      parameters: {
        type: 'object',
        properties: { ref: { type: 'string', description: 'Título o parte del dato a borrar.' } },
        required: ['ref'],
      },
    },
  },
  // ── Fase 3: Publicaciones a grupos ──
  {
    type: 'function',
    function: {
      name: 'schedule_group_post',
      description:
        'PROGRAMA una publicación a un grupo para una fecha/hora futura. Requiere aprobación del dueño. ' +
        'Si el dueño mandó un archivo en este chat, se adjunta automáticamente.',
      parameters: {
        type: 'object',
        properties: {
          group: { type: 'string', description: 'Nombre del grupo (ej. "My Diamond").' },
          body: { type: 'string', description: 'Texto de la publicación (puede ir vacío si solo manda un recurso).' },
          when_local: { type: 'string', description: 'Fecha y hora LOCAL de Bolivia en formato "YYYY-MM-DD HH:MM" (24h). Calculala desde "hoy".' },
          repeat: { type: 'string', enum: ['NONE', 'DAILY', 'WEEKLY', 'WEEKDAYS'], description: 'Repetición. NONE = una sola vez.' },
          weekdays: { type: 'array', items: { type: 'integer' }, description: 'Si repeat=WEEKDAYS: días (0=domingo … 6=sábado).' },
          media_refs: { type: 'array', items: { type: 'string' }, description: 'Títulos de recursos de la biblioteca a adjuntar (opcional).' },
          also_to_private: { type: 'boolean', description: 'Además del grupo, reenviar al privado de los contactos activos (opcional).' },
        },
        required: ['group', 'when_local'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'send_group_now',
      description: 'Envía un mensaje a un grupo AHORA mismo (no programado). Requiere aprobación del dueño.',
      parameters: {
        type: 'object',
        properties: {
          group: { type: 'string', description: 'Nombre del grupo.' },
          body: { type: 'string', description: 'Texto a enviar.' },
          media_refs: { type: 'array', items: { type: 'string' }, description: 'Títulos de recursos a adjuntar (opcional).' },
        },
        required: ['group'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_scheduled',
      description:
        'Muestra las publicaciones programadas. IMPORTANTE: si el dueño pide un día específico (ej. "las de HOY", ' +
        '"las de mañana", "las del 15"), pasá ESE día en date_local para filtrar y darle SOLO esas. Para un rango ' +
        'de días usá from_local/to_local. Sin filtro devuelve todas.',
      parameters: {
        type: 'object',
        properties: {
          date_local: { type: 'string', description: 'Un día específico en formato "YYYY-MM-DD" (hora de Bolivia). Calculalo desde "hoy".' },
          from_local: { type: 'string', description: 'Inicio de rango "YYYY-MM-DD" (opcional).' },
          to_local: { type: 'string', description: 'Fin de rango "YYYY-MM-DD" (opcional).' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'cancel_scheduled',
      description: 'Cancela una publicación programada. Requiere aprobación del dueño.',
      parameters: {
        type: 'object',
        properties: { ref: { type: 'string', description: 'Nombre del grupo o parte del texto de la publicación a cancelar.' } },
        required: [],
      },
    },
  },
  // ── Fase 4: Campañas / difusión ──
  {
    type: 'function',
    function: {
      name: 'list_campaigns',
      description: 'Muestra las campañas de difusión y su estado (borrador, programada, enviando, enviada, etc.).',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'launch_campaign',
      description: 'Lanza (envía) una campaña de difusión YA existente. Requiere aprobación del dueño porque son mensajes masivos.',
      parameters: {
        type: 'object',
        properties: { ref: { type: 'string', description: 'Nombre de la campaña a lanzar.' } },
        required: ['ref'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'pause_campaign',
      description: 'Pausa/cancela una campaña que todavía no terminó de enviarse.',
      parameters: {
        type: 'object',
        properties: { ref: { type: 'string', description: 'Nombre de la campaña a pausar.' } },
        required: ['ref'],
      },
    },
  },
  // ── Fase 5: Configurar a CAMILA ──
  {
    type: 'function',
    function: {
      name: 'adjust_tone',
      description: 'Ajusta TU tono/personalidad para hablarle a la gente (ej. "más formal", "más cálida", "más directa").',
      parameters: {
        type: 'object',
        properties: { instruction: { type: 'string', description: 'Cómo debe ser el nuevo tono.' } },
        required: ['instruction'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'set_voice_mode',
      description: 'Cambia si respondés con notas de voz. mode: "off" (solo texto), "audio_in" (audio solo si te mandan audio), "always" (siempre audio).',
      parameters: {
        type: 'object',
        properties: { mode: { type: 'string', enum: ['off', 'audio_in', 'always'] } },
        required: ['mode'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'toggle_welcome',
      description: 'Activa o desactiva la bienvenida automática de un grupo.',
      parameters: {
        type: 'object',
        properties: {
          group: { type: 'string', description: 'Nombre del grupo.' },
          on: { type: 'boolean', description: 'true = activar, false = desactivar.' },
        },
        required: ['group', 'on'],
      },
    },
  },
  // ── Fase 6: Reportes ──
  {
    type: 'function',
    function: {
      name: 'activity_report',
      description: 'Da un resumen de la actividad de hoy: mensajes recibidos/enviados, contactos nuevos, programaciones pendientes y campañas.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
]

/** Tools que NO se ejecutan solas: piden aprobación del dueño. */
const NEEDS_APPROVAL = new Set([
  'delete_resource',
  'delete_knowledge',
  'schedule_group_post',
  'send_group_now',
  'cancel_scheduled',
  'launch_campaign',
])

// ── System prompt ─────────────────────────────────────────────────────────────────

type OwnerContext = { nowLocal: string; groups: string[] }

function buildOwnerSystemPrompt(input: OwnerTurnInput, ctx: OwnerContext): string {
  const parts: string[] = []
  parts.push('# QUIÉN SOS')
  parts.push(
    `Sos "${input.agent.name}", la asistente del NEGOCIO, hablando con el DUEÑO (tu jefe) por WhatsApp. ` +
      'Estás en MODO DUEÑO: acá NO atendés clientes, sino que AYUDÁS AL DUEÑO a administrar todo. ' +
      'Tratalo con confianza y calidez, pero al grano. ' +
      'SIEMPRE dirigite a él con respeto y cariño como "Señor Prado" o "Marco" (nunca de otra forma).',
  )
  parts.push(`# FECHA Y HORA AHORA (Bolivia)\n${ctx.nowLocal}\nUsá esto para calcular fechas relativas ("mañana", "el martes", "en 2 horas").`)

  parts.push(
    '# CÓMO TRABAJÁS\n' +
      '- DALE EXACTAMENTE LO QUE PIDE, ni más ni menos. Si pide "solo las de hoy", filtrá por hoy (usá date_local); ' +
      'si pide "de este grupo", filtrá por ese grupo. No le mandes la lista completa cuando pidió una parte.\n' +
      '- USÁ LA MEMORIA de esta charla: recordá lo que el dueño te viene pidiendo. Si dice "lo que programaste recién", ' +
      '"el último", "esa", "el de ese grupo", referíte a lo que hablaron antes en este chat.\n' +
      '- Cuando el dueño te pide algo que podés hacer con una herramienta, USALA (no digas que lo harás sin hacerlo).\n' +
      '- Al cancelar/borrar, pasá a la herramienta la mejor referencia que tengas (nombre del grupo Y la hora si la sabés) ' +
      'para no confundir una publicación con otra.\n' +
      '- Si te manda un archivo y te pide guardarlo, usá save_resource con el título/descripción que te dé.\n' +
      '- Para PROGRAMAR a un grupo usá schedule_group_post con when_local en formato "YYYY-MM-DD HH:MM" (hora de Bolivia).\n' +
      '- Si algo no te queda claro (qué título, qué grupo, qué fecha/hora), PREGUNTÁ en vez de inventar.\n' +
      '- Respondé CORTO y claro, como en un chat. Confirmá lo que hiciste en una línea.\n' +
      '- Nunca inventes que hiciste algo: si una herramienta falla, decí qué pasó.',
  )

  if (ctx.groups.length > 0) {
    parts.push(`# GRUPOS DONDE PODÉS PUBLICAR\n${ctx.groups.map((g) => `- ${g}`).join('\n')}`)
  }

  // Contexto: archivos adjuntos en este turno.
  if (input.attachedMedia.length > 0) {
    const desc = input.attachedMedia
      .map((m) => `${m.kind}${m.filename ? ` (${m.filename})` : ''}${m.caption ? ` — "${m.caption}"` : ''}`)
      .join(', ')
    parts.push(`# ARCHIVO(S) QUE EL DUEÑO ACABA DE ENVIAR\n${desc}\nSi te pide guardarlo, usá save_resource. Si pide programarlo/mandarlo a un grupo, se adjunta solo.`)
  }

  parts.push(
    '# CAPACIDADES DISPONIBLES\n' +
      '1) Biblioteca: guardar recursos (archivo/enlace/texto), listar/buscar, editar y borrar (con tu aprobación).\n' +
      '2) Tu CONOCIMIENTO: agregar, corregir, consultar y borrar (con tu aprobación).\n' +
      '3) Grupos: PROGRAMAR publicaciones, MANDAR ahora, VER lo programado y CANCELAR (con tu aprobación).\n' +
      '4) Campañas: VER campañas y su estado, LANZAR una campaña existente (con tu aprobación) y PAUSAR.\n' +
      '5) Configurarte: ajustar tu TONO, tu modo de VOZ (audios sí/no) y la BIENVENIDA de un grupo.\n' +
      '6) Reportes: dar un resumen de la actividad del día.\n' +
      'Para CREAR una campaña nueva desde cero (elegir plantilla y audiencia), pedile al dueño que la arme en el ' +
      'panel; vos podés lanzarla cuando esté lista.',
  )

  return parts.join('\n\n')
}

// ── Ejecución de tools INMEDIATAS (bajo riesgo) ──────────────────────────────────

async function runImmediateTool(
  name: string,
  args: Record<string, unknown>,
  input: OwnerTurnInput,
): Promise<string> {
  const str = (k: string): string => (typeof args[k] === 'string' ? (args[k] as string).trim() : '')
  const arr = (k: string): string[] => (Array.isArray(args[k]) ? (args[k] as unknown[]).map((x) => String(x)) : [])

  switch (name) {
    case 'save_resource': {
      const media = input.attachedMedia[0]
      if (!media) return 'No veo ningún archivo en este mensaje. Mandámelo de nuevo y lo guardo.'
      const r = await saveResourceFromMedia(media, { title: str('title'), description: str('description'), tags: arr('tags'), createdBy: input.createdBy })
      return r.text
    }
    case 'save_link': {
      const r = await saveLinkResource({ title: str('title') || 'Enlace', linkUrl: str('linkUrl'), tags: arr('tags'), createdBy: input.createdBy })
      return r.text
    }
    case 'save_text': {
      const r = await saveTextResource({ title: str('title') || 'Texto', content: str('content'), tags: arr('tags'), createdBy: input.createdBy })
      return r.text
    }
    case 'list_library': {
      const rows = await listLibrary(str('query'))
      if (rows.length === 0) return 'La biblioteca está vacía (o no encontré nada con ese criterio).'
      const lines = rows.slice(0, 25).map((r) => `• (${r.type}) ${r.title}${r.caption ? ` — ${r.caption}` : ''}`)
      return `Esto es lo que hay en la biblioteca:\n${lines.join('\n')}`
    }
    case 'update_resource': {
      const patch: { title?: string; description?: string; tags?: string[] } = {}
      if (str('title')) patch.title = str('title')
      if (args.description !== undefined) patch.description = str('description')
      if (args.tags !== undefined) patch.tags = arr('tags')
      const r = await updateLibraryAsset(str('ref'), patch)
      return r.text
    }
    // ── Fase 2: conocimiento ──
    case 'add_knowledge': {
      const r = await addKnowledge(input.agent.id, { title: str('title'), content: str('content'), category: str('category') })
      return r.text
    }
    case 'update_knowledge': {
      const patch: { title?: string; content?: string; category?: string } = {}
      if (str('title')) patch.title = str('title')
      if (args.content !== undefined) patch.content = str('content')
      if (args.category !== undefined) patch.category = str('category')
      const r = await updateKnowledge(input.agent.id, str('ref'), patch)
      return r.text
    }
    case 'query_knowledge': {
      const rows = await listKnowledge(input.agent.id, str('query'))
      if (rows.length === 0) return 'Por ahora no tengo nada guardado en mi conocimiento (o no encontré eso).'
      const lines = rows.slice(0, 20).map((r) => `• ${r.title}: ${r.content.slice(0, 120)}${r.content.length > 120 ? '…' : ''}`)
      return `Esto es lo que sé:\n${lines.join('\n')}`
    }
    // ── Fase 3: ver programado (con filtro por día/rango) ──
    case 'list_scheduled': {
      const tz = await getAgentTimezone(input.agent.id)
      const dayLocal = str('date_local')
      const posts = await listScheduledPosts(input.agent.id, {
        tz,
        dayLocal: dayLocal || undefined,
        fromLocal: str('from_local') || undefined,
        toLocal: str('to_local') || undefined,
      })
      const scope = dayLocal ? ` para el ${dayLocal}` : ''
      if (posts.length === 0) return `No tenés publicaciones programadas${scope}.`
      const lines = posts.slice(0, 30).map((p) => {
        const rep = p.repeat && p.repeat !== 'NONE' ? ` (repite: ${p.repeat})` : ''
        const txt = (p.body ?? '').slice(0, 50)
        return `• ${p.groupName ?? 'grupo'} — ${formatLocal(p.scheduledAt, tz)}${rep}${txt ? `: ${txt}${(p.body ?? '').length > 50 ? '…' : ''}` : ''}`
      })
      return `Publicaciones programadas${scope}:\n${lines.join('\n')}`
    }
    // ── Fase 4: campañas ──
    case 'list_campaigns': {
      const camps = await listCampaigns(input.agent.id)
      if (camps.length === 0) return 'No tenés campañas creadas todavía.'
      const lines = camps.slice(0, 20).map((c) => `• ${c.name} — ${campaignStatusEs(c.status)}${c.sentCount ? ` (enviados: ${c.sentCount})` : ''}`)
      return `Campañas:\n${lines.join('\n')}`
    }
    case 'pause_campaign': {
      const r = await pauseCampaign(input.agent.id, str('ref'))
      return r.text
    }
    // ── Fase 5: configurar ──
    case 'adjust_tone': {
      const r = await adjustTone(input.agent.id, str('instruction'))
      return r.text
    }
    case 'set_voice_mode': {
      const r = await setVoiceMode(input.agent.id, str('mode'))
      return r.text
    }
    case 'toggle_welcome': {
      const r = await toggleWelcome(input.agent.id, str('group'), args.on === true)
      return r.text
    }
    // ── Fase 6: reportes ──
    case 'activity_report': {
      return await activityReport(input.agent.id)
    }
    default:
      return `Herramienta no reconocida: ${name}`
  }
}

// ── Creación de PENDIENTE (acciones delicadas que piden aprobación) ──────────────

/**
 * Junta los ids de recursos a adjuntar: primero guarda en la biblioteca los
 * archivos que el dueño mandó en este turno, luego resuelve las referencias por
 * título. Así una publicación puede llevar el archivo recién enviado y/o recursos
 * ya guardados.
 */
async function collectAttachmentIds(input: OwnerTurnInput, refs: string[]): Promise<string[]> {
  const ids: string[] = []
  for (const media of input.attachedMedia) {
    const r = await saveResourceFromMedia(media, { createdBy: input.createdBy })
    if (r.ok && r.assetId) ids.push(r.assetId)
  }
  if (refs.length) ids.push(...(await resolveMediaRefs(refs)))
  return Array.from(new Set(ids))
}

async function stagePendingTool(
  name: string,
  args: Record<string, unknown>,
  input: OwnerTurnInput,
): Promise<string> {
  const str = (k: string): string => (typeof args[k] === 'string' ? (args[k] as string).trim() : '')
  const arr = (k: string): string[] => (Array.isArray(args[k]) ? (args[k] as unknown[]).map((x) => String(x)) : [])
  const numArr = (k: string): number[] => (Array.isArray(args[k]) ? (args[k] as unknown[]).map((x) => Number(x)).filter((n) => Number.isInteger(n)) : [])

  switch (name) {
    case 'delete_resource': {
      const asset = await findAsset(str('ref'))
      if (!asset) return `No encontré ningún recurso que se llame «${str('ref')}» en la biblioteca.`
      const summary = `Borrar de la biblioteca el recurso «${asset.title}» (${asset.type}).`
      await createPendingAction(input.agent.id, input.ownerPhone, 'DELETE_MEDIA', { id: asset.id, title: asset.title }, summary)
      return `¿Confirmás que borro el recurso «${asset.title}»? Respondé *aprobado* para hacerlo, o *no* para cancelar.`
    }
    case 'delete_knowledge': {
      const item = await findKnowledge(input.agent.id, str('ref'))
      if (!item) return `No encontré nada en mi conocimiento sobre «${str('ref')}».`
      const summary = `Borrar del conocimiento: «${item.title}».`
      await createPendingAction(input.agent.id, input.ownerPhone, 'DELETE_KNOWLEDGE', { id: item.id, title: item.title }, summary)
      return `¿Confirmás que borro de mi conocimiento «${item.title}»? (${item.content.slice(0, 80)}${item.content.length > 80 ? '…' : ''})\nRespondé *aprobado* o *no*.`
    }
    // ── Fase 3 ──
    case 'schedule_group_post': {
      const group = await resolveGroup(input.agent.id, str('group'))
      if (!group) return `No encontré el grupo «${str('group')}». Decime bien el nombre (o mandame "¿qué grupos tenés?").`
      const tz = await getAgentTimezone(input.agent.id)
      const when = wallClockToUtc(str('when_local'), tz)
      if (!when) return 'No entendí bien la fecha/hora. Decímela así: "el 15 de julio a las 8am" o "mañana a las 20:00".'
      if (when.getTime() < Date.now() - 60_000) return `Esa fecha (${formatLocal(when, tz)}) ya pasó. Decime una fecha futura.`
      const body = str('body')
      const mediaAssetIds = await collectAttachmentIds(input, arr('media_refs'))
      if (!body && mediaAssetIds.length === 0) return 'Falta el contenido: mandame el texto o un archivo para la publicación.'
      const repeat = ['NONE', 'DAILY', 'WEEKLY', 'WEEKDAYS'].includes(str('repeat')) ? str('repeat') : 'NONE'
      const weekdays = numArr('weekdays')
      const alsoToPrivate = args.also_to_private === true
      const summary = `Programar en «${group.subject}» para ${formatLocal(when, tz)}${repeat !== 'NONE' ? ` (repite: ${repeat})` : ''}.`
      await createPendingAction(input.agent.id, input.ownerPhone, 'SCHEDULE_POST', {
        agentId: input.agent.id, groupJid: group.jid, groupName: group.subject,
        body, mediaAssetIds, scheduledAtISO: when.toISOString(), repeat, weekdays, alsoToPrivate, createdBy: input.createdBy ?? null,
      }, summary)
      const bodyPrev = body ? `\n📝 "${body.slice(0, 120)}${body.length > 120 ? '…' : ''}"` : ''
      const mediaPrev = mediaAssetIds.length ? `\n📎 ${mediaAssetIds.length} adjunto(s)` : ''
      return `Voy a programar esto:\n📅 *${group.subject}* — ${formatLocal(when, tz)}${repeat !== 'NONE' ? ` (repite: ${repeat})` : ''}${bodyPrev}${mediaPrev}\n\n¿Lo *apruebo*?`
    }
    case 'send_group_now': {
      const group = await resolveGroup(input.agent.id, str('group'))
      if (!group) return `No encontré el grupo «${str('group')}». Decime bien el nombre.`
      const body = str('body')
      const mediaAssetIds = await collectAttachmentIds(input, arr('media_refs'))
      if (!body && mediaAssetIds.length === 0) return 'Falta el contenido: mandame el texto o un archivo para enviar.'
      const summary = `Enviar AHORA a «${group.subject}».`
      await createPendingAction(input.agent.id, input.ownerPhone, 'SEND_NOW', {
        agentId: input.agent.id, groupJid: group.jid, groupName: group.subject, body, mediaAssetIds,
      }, summary)
      const bodyPrev = body ? `\n📝 "${body.slice(0, 120)}${body.length > 120 ? '…' : ''}"` : ''
      const mediaPrev = mediaAssetIds.length ? `\n📎 ${mediaAssetIds.length} adjunto(s)` : ''
      return `Voy a enviar AHORA a *${group.subject}*:${bodyPrev}${mediaPrev}\n\n¿Lo *apruebo*?`
    }
    case 'cancel_scheduled': {
      const tz = await getAgentTimezone(input.agent.id)
      const post = await findScheduledPost(input.agent.id, str('ref'), tz)
      if (post) {
        const summary = `Cancelar la publicación de «${post.groupName ?? 'grupo'}» del ${formatLocal(post.scheduledAt, tz)}.`
        await createPendingAction(input.agent.id, input.ownerPhone, 'CANCEL_SCHEDULED', { id: post.id }, summary)
        return `¿Cancelo la publicación de *${post.groupName ?? 'ese grupo'}* del ${formatLocal(post.scheduledAt, tz)}? Respondé *aprobado* o *no*.`
      }
      // No hay una PENDIENTE que coincida: avisamos si ya se envió / ya se canceló,
      // o listamos las que hay para que el dueño elija (NUNCA cancelamos al azar).
      const any = await findAnyScheduledPost(input.agent.id, str('ref'), tz)
      if (any && any.status === 'SENT') return `Esa publicación (*${any.groupName ?? 'grupo'}* — ${formatLocal(any.scheduledAt, tz)}) ya se envió, así que no hay nada que cancelar.`
      if (any && any.status === 'CANCELLED') return `Esa publicación de *${any.groupName ?? 'grupo'}* ya estaba cancelada.`
      const pend = await listScheduledPosts(input.agent.id)
      if (pend.length === 0) return 'No tenés ninguna publicación programada por ahora.'
      const lines = pend.slice(0, 15).map((p, i) => `${i + 1}. ${p.groupName ?? 'grupo'} — ${formatLocal(p.scheduledAt, tz)}`)
      return `No encontré exactamente esa. Estas son las que tenés programadas:\n${lines.join('\n')}\n\nDecime cuál cancelo (nombre del grupo y hora).`
    }
    // ── Fase 4 ──
    case 'launch_campaign': {
      const camp = await findCampaign(input.agent.id, str('ref'))
      if (!camp) return `No encontré ninguna campaña que se llame «${str('ref')}».`
      const audience = await countCampaignAudience(camp.targetType, camp.targetJson)
      const summary = `Lanzar la campaña «${camp.name}» a ${audience} contacto(s).`
      await createPendingAction(input.agent.id, input.ownerPhone, 'LAUNCH_CAMPAIGN', { id: camp.id, name: camp.name, approvedBy: input.createdBy ?? null }, summary)
      const bodyPrev = camp.messageBody ? `\n📝 "${camp.messageBody.slice(0, 120)}${camp.messageBody.length > 120 ? '…' : ''}"` : ''
      return `Voy a lanzar la campaña *${camp.name}* a *${audience} contacto(s)*.${bodyPrev}\n\n¿La *apruebo*? (una vez lanzada no se puede deshacer)`
    }
    default:
      return `Acción no reconocida: ${name}`
  }
}

// ── Turno completo del cerebro admin ──────────────────────────────────────────────

/** Parsea de forma segura los args JSON de un tool_call. */
function parseArgs(raw: string | undefined): Record<string, unknown> {
  if (!raw) return {}
  try {
    const p: unknown = JSON.parse(raw)
    return p && typeof p === 'object' && !Array.isArray(p) ? (p as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

/**
 * Ejecuta un turno del cerebro admin. Devuelve el texto que hay que enviarle al
 * dueño. NUNCA lanza. Si una tool delicada se invoca, deja la acción PENDIENTE y
 * pide aprobación (no la ejecuta).
 */
export async function runOwnerTurn(input: OwnerTurnInput): Promise<OwnerTurnResult> {
  try {
    // Contexto para el prompt: fecha/hora local + grupos disponibles (para programar).
    const tz = await getAgentTimezone(input.agent.id)
    const groups = await listGroups(input.agent.id)
    const ctx: OwnerContext = {
      nowLocal: nowLocalText(tz),
      groups: groups.map((g) => g.subject).filter(Boolean),
    }
    const system = buildOwnerSystemPrompt(input, ctx)
    const messages: ChatMessage[] = [
      { role: 'system', content: system },
      ...input.history.map((h): ChatMessage => (h.role === 'bot' ? { role: 'assistant', content: h.content } : { role: 'user', content: h.content })),
      { role: 'user', content: input.userMessage },
    ]

    const model = input.agent.model?.trim() || 'gpt-4o'
    const first: AssistantMessage = await openaiChat({
      apiKey: input.agent.openaiKey,
      model,
      messages,
      temperature: 0.3,
      tools: TOOLS,
      toolChoice: 'auto',
      timeoutMs: TURN_TIMEOUT_MS,
    })

    const toolCalls = first.tool_calls ?? []
    if (toolCalls.length === 0) {
      return { text: (first.content ?? '').trim() || 'Decime qué necesitás y lo hago.' }
    }

    // Si hay alguna tool que requiere aprobación → dejarla pendiente y pedir "aprobado".
    const approvalCall = toolCalls.find((c) => NEEDS_APPROVAL.has(c.function.name))
    if (approvalCall) {
      const text = await stagePendingTool(approvalCall.function.name, parseArgs(approvalCall.function.arguments), input)
      return { text }
    }

    // Tools inmediatas: ejecutar todas y armar una respuesta.
    const results: string[] = []
    for (const call of toolCalls) {
      const out = await runImmediateTool(call.function.name, parseArgs(call.function.arguments), input)
      results.push(out)
    }
    return { text: results.join('\n\n').trim() || 'Listo.' }
  } catch (err) {
    console.error('[OWNER] runOwnerTurn error:', err)
    return { text: 'Uy, tuve un problema procesando tu pedido. Probá de nuevo en un momento.' }
  }
}
