/**
 * Diamond Assistant — Tipos del dominio (FASE 0: esqueleto)
 *
 * Interfaces TypeScript "de dominio" (NO modelos Prisma). Sirven como contrato
 * estable para el motor de agentes, el envío por WhatsApp y las rutas API.
 * En fases siguientes se mapearán a modelos Prisma reales; por ahora viven
 * de forma independiente para que el proyecto compile sin depender del schema.
 *
 * Convenciones:
 *  - Todos los IDs son `string` (cuid/uuid a futuro).
 *  - Las fechas viajan como `string` ISO-8601 (serializables en JSON de las APIs).
 *  - Los campos opcionales usan `?` cuando pueden faltar en un stub/placeholder.
 */

// ---------------------------------------------------------------------------
// Enums / uniones de tipos base
// ---------------------------------------------------------------------------

/** Tipo de recurso multimedia que un agente puede almacenar y enviar. */
export type MediaType = 'IMAGE' | 'VIDEO' | 'AUDIO' | 'PDF' | 'LINK' | 'TEXT'

/** Estado de una campaña de mensajería/seguimiento. */
export type CampaignStatus =
  | 'DRAFT'      // en edición, aún no programada
  | 'SCHEDULED'  // programada para ejecutarse
  | 'RUNNING'    // ejecutándose ahora
  | 'PAUSED'     // pausada manualmente
  | 'COMPLETED'  // finalizada con éxito
  | 'CANCELLED'  // cancelada antes de completar

/** Canal por el que viaja un mensaje. Hoy solo WhatsApp; abierto a futuro. */
export type MessageChannel = 'WHATSAPP'

/** Dirección de un mensaje registrado. */
export type MessageDirection = 'INBOUND' | 'OUTBOUND'

/** Estado de entrega de un mensaje saliente (ciclo de vida WhatsApp). */
export type MessageStatus =
  | 'PENDING'
  | 'SENT'
  | 'DELIVERED'
  | 'READ'
  | 'FAILED'
  | 'RECEIVED' // para mensajes entrantes

/** Motor de envío de WhatsApp que respalda al asistente. */
export type WhatsAppEngine = 'BAILEYS' | 'YCLOUD'

/** Severidad/acción de una regla de seguridad del agente. */
export type SafetyRuleSeverity = 'INFO' | 'WARN' | 'BLOCK'

// ---------------------------------------------------------------------------
// Entidades del dominio
// ---------------------------------------------------------------------------

/**
 * AssistantAgent — un "empleado IA" configurable.
 * Contiene su personalidad (persona/tono), el modelo IA y los vínculos a su
 * base de conocimiento, reglas de seguridad y medios disponibles.
 */
export interface AssistantAgent {
  id: string
  /** Nombre visible del agente (p. ej. "Diana - Ventas"). */
  name: string
  /** Descripción corta de su rol/función. */
  description?: string
  /**
   * Personalidad y estilo: instrucciones de alto nivel sobre cómo debe hablar,
   * su tono, valores y límites de conversación. Se inyecta en el system prompt.
   */
  persona: string
  /** Objetivo principal del agente (p. ej. "agendar demos", "cerrar ventas"). */
  goal?: string
  /** Modelo IA a usar (p. ej. "gpt-4o", "gpt-4o-mini"). */
  aiModel: string
  /** Temperatura de generación (0..2). */
  temperature?: number
  /** Idioma preferente de respuesta (ISO 639-1, p. ej. "es"). */
  language?: string
  /** Si el agente está activo y puede responder. */
  isActive: boolean
  /** IDs de grupos a los que atiende. */
  groupIds?: string[]
  /** IDs de items de conocimiento asociados. */
  knowledgeItemIds?: string[]
  /** IDs de reglas de seguridad aplicadas. */
  safetyRuleIds?: string[]
  /** IDs de recursos multimedia que puede enviar. */
  mediaAssetIds?: string[]
  createdAt: string
  updatedAt: string
}

/**
 * AssistantGroup — segmento/lista lógica de contactos.
 * Permite dirigir campañas y asignar agentes a públicos distintos.
 */
export interface AssistantGroup {
  id: string
  name: string
  description?: string
  /** ID del agente por defecto que atiende a este grupo (opcional). */
  defaultAgentId?: string
  /** Conteo denormalizado de contactos (placeholder en FASE 0). */
  contactsCount?: number
  createdAt: string
  updatedAt: string
}

/**
 * Contact — persona/lead con la que el asistente conversa.
 */
export interface Contact {
  id: string
  /** Número en formato E.164 sin "+", tal como lo maneja WhatsApp (jid base). */
  phone: string
  /** Nombre mostrado. */
  name?: string
  /** Email si se conoce. */
  email?: string
  /** IDs de grupos a los que pertenece. */
  groupIds?: string[]
  /** Etiquetas libres para segmentar (p. ej. "vip", "interesado"). */
  tags?: string[]
  /** Notas internas del CRM. */
  notes?: string
  /** Si aceptó recibir mensajes (opt-in). Clave para envíos responsables. */
  optIn?: boolean
  /** Última vez que interactuó (ISO). */
  lastContactedAt?: string
  createdAt: string
  updatedAt: string
}

/**
 * MediaAsset — recurso que el agente puede enviar (imagen, video, audio, pdf,
 * link o texto guardado). Es lo que consumen las tools `send_*`.
 */
export interface MediaAsset {
  id: string
  /** Nombre/etiqueta interna para que el agente lo referencie. */
  name: string
  type: MediaType
  /**
   * URL del recurso (S3/almacenamiento) o, para type='TEXT', puede quedar vacío
   * y usarse `content`.
   */
  url?: string
  /** Contenido textual embebido (usado por type='TEXT' o como caption). */
  content?: string
  /** Texto/caption opcional que acompaña al envío del medio. */
  caption?: string
  /** MIME type real del archivo (p. ej. "application/pdf", "video/mp4"). */
  mimeType?: string
  /** Tamaño en bytes (si aplica). */
  sizeBytes?: number
  /** Etiquetas para búsqueda/organización. */
  tags?: string[]
  createdAt: string
  updatedAt: string
}

/**
 * KnowledgeItem — pieza de la base de conocimiento del agente (RAG a futuro).
 * En FASE 0 es texto plano; luego se podrá vectorizar/embeder.
 */
export interface KnowledgeItem {
  id: string
  /** Título corto del item. */
  title: string
  /** Cuerpo del conocimiento (FAQ, política, guion, info de producto...). */
  content: string
  /** Categoría/tema para organizar (p. ej. "precios", "objeciones"). */
  category?: string
  /** Prioridad de inclusión en el prompt (mayor = más relevante). */
  priority?: number
  /** Etiquetas para recuperación. */
  tags?: string[]
  /** Si está activo y debe considerarse. */
  isActive?: boolean
  createdAt: string
  updatedAt: string
}

/**
 * SafetyRule — barrera de seguridad/compliance del agente.
 * Define qué NO puede decir/hacer y cómo reaccionar (avisar o bloquear).
 */
export interface SafetyRule {
  id: string
  /** Nombre corto (p. ej. "No dar consejo médico"). */
  name: string
  /** Instrucción/regla en lenguaje natural que se inyecta al prompt. */
  instruction: string
  severity: SafetyRuleSeverity
  /** Patrones/keywords que disparan la regla (opcional, para chequeos rápidos). */
  keywords?: string[]
  /** Si está activa. */
  isActive?: boolean
  createdAt: string
  updatedAt: string
}

/**
 * AssistantCampaign — envío programado/masivo (broadcast o secuencia) a un
 * público, ejecutado por un agente.
 */
export interface AssistantCampaign {
  id: string
  name: string
  description?: string
  status: CampaignStatus
  /** Agente responsable de conversar dentro de la campaña. */
  agentId?: string
  /** Grupos/segmentos destino. */
  targetGroupIds?: string[]
  /** Mensaje/plantilla inicial a enviar (texto). */
  messageTemplate?: string
  /** Recursos multimedia adjuntos por defecto. */
  mediaAssetIds?: string[]
  /** Fecha/hora programada de inicio (ISO). */
  scheduledAt?: string
  /** Canal de envío. */
  channel: MessageChannel
  // Métricas denormalizadas (placeholder en 0 durante FASE 0)
  totalRecipients?: number
  sentCount?: number
  deliveredCount?: number
  readCount?: number
  failedCount?: number
  createdAt: string
  updatedAt: string
}

/**
 * MessageLog — registro de un mensaje individual (entrante o saliente).
 * Base para auditoría, métricas del dashboard y trazabilidad de campañas.
 */
export interface MessageLog {
  id: string
  channel: MessageChannel
  direction: MessageDirection
  status: MessageStatus
  /** Contacto involucrado. */
  contactId?: string
  /** Agente que originó/atendió el mensaje. */
  agentId?: string
  /** Campaña asociada (si viene de una). */
  campaignId?: string
  /** Tipo de contenido del mensaje. */
  mediaType: MediaType
  /** Texto del mensaje o caption. */
  text?: string
  /** URL del medio, si aplica. */
  mediaUrl?: string
  /** Motor por el que se envió/recibió. */
  engine?: WhatsAppEngine
  /** ID del proveedor externo (WhatsApp/YCloud) para conciliación. */
  externalId?: string
  /** Detalle de error si status='FAILED'. */
  error?: string
  createdAt: string
}

// ---------------------------------------------------------------------------
// Tipos auxiliares para dashboard / respuestas de API
// ---------------------------------------------------------------------------

/** Métricas placeholder del dashboard (todo en 0 durante FASE 0). */
export interface DashboardMetrics {
  totalAgents: number
  activeAgents: number
  totalContacts: number
  totalGroups: number
  totalCampaigns: number
  runningCampaigns: number
  messagesSent: number
  messagesDelivered: number
  messagesRead: number
  messagesFailed: number
  escalationsToHuman: number
}

/** Envoltura estándar de respuesta para las APIs del asistente. */
export interface ApiResponse<T> {
  ok: boolean
  data: T
  error?: string
}
