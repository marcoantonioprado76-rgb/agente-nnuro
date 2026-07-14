/**
 * Diamond Assistant — Bienvenida a grupos (FASE 5)
 *
 * `handleGroupWelcome(agentId, groupJid, participantJid)` se dispara cuando el
 * motor aislado detecta que ALGUIEN NUEVO entró a un grupo gestionado por el
 * agente. Si el grupo tiene la bienvenida habilitada y una plantilla, arma el
 * mensaje reemplazando variables y lo envía (con media opcional).
 *
 * Variables soportadas en el `body` de la plantilla:
 *   {{nombre}} {{grupo}} {{ciudad}} {{sponsor}} {{fecha}} {{link_reto}} {{nombre_lider}}
 *
 * ROBUSTEZ: TODO va dentro de try/catch. Nunca lanza hacia el handler de Baileys.
 */

import { prisma } from '@/lib/prisma'
import { sendDiamondText, sendDiamondMedia, listDiamondGroups, getDiamondContactName, resolvePhoneNumber } from './diamondBaileys'
import { isWithinAllowedHours } from './diamondInbound'

/** Reemplaza {{clave}} (con o sin espacios internos) por su valor. */
function fillTemplate(body: string, vars: Record<string, string>): string {
  let out = body
  for (const [key, value] of Object.entries(vars)) {
    const re = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'gi')
    out = out.replace(re, value)
  }
  return out
}

/**
 * Devuelve el ÍNDICE de la próxima plantilla de bienvenida a usar (TURNO), y
 * AVANZA el contador de forma atómica. Así cada bienvenida usa una plantilla
 * distinta, en orden, sin repetir hasta agotarlas (a diferencia de un hash que
 * podía repetir). El contador vive en app_settings, por agente + tipo.
 * Ante cualquier error, cae a 0 (usa la primera). Nunca lanza.
 */
async function nextWelcomeIndex(agentId: string, kind: string, count: number): Promise<number> {
  if (count <= 1) return 0
  const key = `diamond_welcome_idx:${agentId}:${kind}`
  try {
    // INSERT ... ON CONFLICT con RETURNING: incrementa y devuelve el nuevo valor de
    // forma ATÓMICA (a prueba de carreras si entran dos personas a la vez).
    const rows = await prisma.$queryRawUnsafe<Array<{ value: string }>>(
      `INSERT INTO app_settings (key, value, updated_at) VALUES ($1, '1', now())
       ON CONFLICT (key) DO UPDATE SET value = ((COALESCE(NULLIF(app_settings.value, ''), '0'))::int + 1)::text, updated_at = now()
       RETURNING value`,
      key,
    )
    const used = (parseInt(String(rows?.[0]?.value ?? '1'), 10) || 1) - 1
    return ((used % count) + count) % count
  } catch (err) {
    console.error(`[DIAMOND] nextWelcomeIndex error agentId=${agentId} kind=${kind}:`, err)
    return 0
  }
}

/** Fecha de hoy formateada en la zona del agente (es-BO). */
function todayInTz(timezone: string): string {
  try {
    return new Intl.DateTimeFormat('es-BO', {
      timeZone: timezone || 'America/La_Paz',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date())
  } catch {
    return new Date().toLocaleDateString('es-BO')
  }
}

/**
 * Envía el contenido de una bienvenida por WhatsApp (Baileys).
 *
 * Combina el TEXTO con la PRIMERA imagen/video en UN SOLO mensaje: la imagen va
 * PRIMERO y el texto de bienvenida viaja como PIE de foto ("los dos en uno").
 * Los demás recursos se mandan después, en orden. NUNCA se usa el nombre del
 * archivo como pie (solo la descripción real del recurso, si tiene). Si no hay
 * imagen/video, se manda el texto y luego los adjuntos (pdf/audio/link).
 * Cada envío está protegido: si uno falla, sigue con el resto.
 */
async function sendWelcomeContent(
  agentId: string,
  jid: string,
  body: string,
  assetIds: string[],
): Promise<void> {
  // Cargar recursos preservando el orden en que se eligieron.
  type WelcomeAsset = {
    type: string
    url: string | null
    linkUrl: string | null
    textContent: string | null
    title: string
    caption: string | null
  }
  let assets: WelcomeAsset[] = []
  if (assetIds.length > 0) {
    try {
      const rows = await prisma.mediaAsset.findMany({
        where: { id: { in: assetIds } },
        select: { id: true, type: true, url: true, linkUrl: true, textContent: true, title: true, caption: true },
      })
      const byId = new Map(rows.map((a) => [a.id, a]))
      assets = assetIds.map((id) => byId.get(id)).filter(Boolean) as WelcomeAsset[]
    } catch (err) {
      console.error(`[DIAMOND] welcome: error cargando recursos agentId=${agentId}:`, err)
    }
  }

  const sendOne = async (a: WelcomeAsset, caption: string) => {
    try {
      await sendDiamondMedia(agentId, jid, {
        type: a.type,
        url: a.url,
        linkUrl: a.linkUrl,
        textContent: a.textContent,
        title: a.title,
        caption, // '' = SIN pie (evita el nombre del archivo)
      })
    } catch (err) {
      console.error(`[DIAMOND] welcome media error agentId=${agentId}:`, err)
    }
  }

  // El primer recurso VISUAL (imagen/video) lleva el texto de bienvenida como pie.
  const carrierIdx = assets.findIndex((a) => {
    const t = (a.type || '').toUpperCase()
    return t === 'IMAGE' || t === 'VIDEO'
  })

  // Sin imagen/video: texto solo y luego adjuntos (pdf/audio/link).
  if (carrierIdx < 0) {
    if (body) await sendDiamondText(agentId, jid, body)
    for (const a of assets) await sendOne(a, (a.caption ?? '').trim())
    return
  }

  // Con imagen/video: la portadora PRIMERO, con el texto como pie (los dos en uno);
  // luego el resto de recursos en orden (nunca el nombre del archivo como pie).
  await sendOne(assets[carrierIdx], body)
  for (let i = 0; i < assets.length; i++) {
    if (i === carrierIdx) continue
    await sendOne(assets[i], (assets[i].caption ?? '').trim())
  }
}

export async function handleGroupWelcome(
  agentId: string,
  groupJid: string,
  participantJid: string,
): Promise<void> {
  try {
    if (!groupJid || !participantJid) return

    // 1) Agente + GATE isActive.
    const agent = await prisma.assistantAgent.findUnique({
      where: { id: agentId },
      select: { id: true, name: true, isActive: true, timezone: true, allowedHours: true },
    })
    if (!agent || !agent.isActive) return

    // 2) Grupo gestionado con bienvenida habilitada.
    const group = await prisma.assistantGroup.findUnique({
      where: { agentId_groupJid: { agentId, groupJid } },
      select: { name: true, welcomeEnabled: true, allowedHours: true },
    })
    if (!group || !group.welcomeEnabled) return

    // 3) Horario permitido (el del grupo si lo define; si no, el del agente).
    const hours = group.allowedHours ?? agent.allowedHours
    if (!isWithinAllowedHours(hours, agent.timezone)) return

    // 4) Plantillas de bienvenida: TODAS las activas del agente. ROTAMOS POR TURNO:
    //    cada bienvenida usa la SIGUIENTE plantilla en orden y no repite la misma
    //    hasta agotarlas (contador persistente). Así se ven todas y no parece un bot.
    const templates = await prisma.welcomeTemplate.findMany({
      where: { agentId, isActive: true, kind: 'GROUP' },
      select: { body: true, mediaAssetId: true, mediaAssetIds: true },
      orderBy: { createdAt: 'asc' },
    })
    if (templates.length === 0) return

    const template = templates[await nextWelcomeIndex(agentId, 'GROUP', templates.length)]

    // 5) Resolver el subject del grupo (reusando la API pública del motor).
    let subject = group.name ?? ''
    try {
      const groups = await listDiamondGroups(agentId)
      const found = groups.find(g => g.id === groupJid)
      if (found?.subject) subject = found.subject
    } catch { /* noop — usamos group.name */ }

    // 6) Nombre de la persona que entra. IMPORTANTE: al UNIRSE a un grupo, WhatsApp
    // NO entrega el nombre de un DESCONOCIDO (solo su número) — es privacidad de
    // WhatsApp. Solo lo sabemos si YA es un contacto conocido (agenda sincronizada)
    // o si ya nos escribió antes (pushName guardado). Si no lo sabemos, dejamos
    // {{nombre}} vacío (el saludo "¡Hola !" se limpia a "¡Hola!") y más abajo le
    // pedimos el nombre de forma natural y humana.
    const knownName = (getDiamondContactName(agentId, participantJid) ?? '').trim()

    const vars: Record<string, string> = {
      nombre: knownName,
      grupo: subject,
      ciudad: '',
      sponsor: '',
      fecha: todayInTz(agent.timezone),
      link_reto: '',
      nombre_lider: '',
    }

    const body = fillTemplate(template.body, vars)
      .replace(/\s+([!?¡.,;:])/g, '$1') // "¡Hola !" → "¡Hola!"
      .replace(/[ \t]{2,}/g, ' ')       // espacios dobles
      .trim()

    // 7) Enviar: imagen/video PRIMERO con el texto de bienvenida como pie (los dos
    //    en uno) y luego el resto de recursos. Unimos el adjunto legacy
    //    (`mediaAssetId`) con la lista nueva (`mediaAssetIds`), sin duplicar.
    const assetIds = [
      ...(template.mediaAssetId ? [template.mediaAssetId] : []),
      ...(template.mediaAssetIds ?? []),
    ].filter((v, i, arr) => v && arr.indexOf(v) === i)

    await sendWelcomeContent(agentId, groupJid, body, assetIds)
  } catch (err) {
    console.error(`[DIAMOND] handleGroupWelcome error agentId=${agentId} grupo=${groupJid}:`, err)
  }
}

/**
 * Alta automática en Contactos de quien ENTRA a un grupo. Así toda persona que se
 * agrega al grupo queda guardada en la base de contactos (alcanzable por campañas).
 *
 * Idempotente: si el teléfono ya existe (scope global, organizationId=null) NO
 * duplica; solo completa el nombre si lo conocemos y estaba vacío. Nunca lanza.
 */
export async function upsertGroupContact(
  agentId: string,
  participantJid: string,
  groupJid?: string,
  groupSubject?: string,
): Promise<void> {
  try {
    // Número REAL (resuelve LID→número por mapeo o por datos del grupo). Si aún no
    // se puede resolver, NO guardamos nada: se captura cuando la persona escriba.
    const phone = await resolvePhoneNumber(agentId, participantJid, groupJid)
    if (!phone || phone.length < 7) {
      console.log(`[DIAMOND] Contacto NO resuelto (LID) jid=${participantJid} grupo=${groupJid ?? '-'} — se guardará cuando escriba`)
      return
    }

    const name = getDiamondContactName(agentId, participantJid) || null

    const existing = await prisma.contact.findFirst({
      where: { organizationId: null, phone },
      select: { id: true, name: true },
    })
    if (existing) {
      // Ya existe: si ahora conocemos su nombre y no lo tenía, lo completamos.
      if (name && !existing.name) {
        await prisma.contact.update({ where: { id: existing.id }, data: { name } })
      }
      return
    }

    await prisma.contact.create({
      data: {
        organizationId: null,
        name,
        phone,
        status: 'ACTIVE',
        optIn: true,
        optInAt: new Date(),
        notes: groupSubject ? `Se unió al grupo: ${groupSubject}` : 'Se unió a un grupo del asistente',
      },
    })
    console.log(`[DIAMOND] Contacto agregado desde grupo: ${phone}${name ? ` (${name})` : ''}`)
  } catch (err) {
    console.error(`[DIAMOND] upsertGroupContact error agentId=${agentId}:`, err)
  }
}

/**
 * Bienvenida al PRIVADO (1:1) de quien entra a un grupo: un mensaje directo,
 * distinto al del grupo, donde el asistente se presenta. Solo se envía si el
 * grupo tiene habilitada la bienvenida privada y hay plantillas PRIVATE.
 *
 * SEGURIDAD: escribir al privado a alguien que recién entró es 1:1 no solicitado
 * (mayor riesgo). Por eso: apagado por defecto, con retraso/pausas (lo maneja el
 * llamador) y mensaje humano. Nunca lanza.
 */
export async function handlePrivateWelcome(
  agentId: string,
  participantJid: string,
  groupJid: string,
): Promise<void> {
  try {
    if (!participantJid) return

    // 1) Agente activo.
    const agent = await prisma.assistantAgent.findUnique({
      where: { id: agentId },
      select: { id: true, isActive: true, timezone: true, allowedHours: true },
    })
    if (!agent || !agent.isActive) return

    // 2) Grupo con bienvenida PRIVADA habilitada.
    const group = await prisma.assistantGroup.findUnique({
      where: { agentId_groupJid: { agentId, groupJid } },
      select: { name: true, privateWelcomeEnabled: true, allowedHours: true },
    })
    if (!group || !group.privateWelcomeEnabled) return

    // 3) Horario permitido.
    const hours = group.allowedHours ?? agent.allowedHours
    if (!isWithinAllowedHours(hours, agent.timezone)) return

    // 4) Número real de la persona (para escribirle al privado).
    const phone = await resolvePhoneNumber(agentId, participantJid, groupJid)
    if (!phone || phone.length < 7) return
    const dmJid = `${phone}@s.whatsapp.net`

    // 5) Plantillas PRIVADAS activas (rotan igual que las de grupo).
    const templates = await prisma.welcomeTemplate.findMany({
      where: { agentId, isActive: true, kind: 'PRIVATE' },
      select: { body: true, mediaAssetId: true, mediaAssetIds: true },
      orderBy: { createdAt: 'asc' },
    })
    if (templates.length === 0) return

    const knownName = (getDiamondContactName(agentId, participantJid) ?? '').trim()
    // Rotación POR TURNO (igual que en el grupo): cada bienvenida usa la siguiente.
    const template = templates[await nextWelcomeIndex(agentId, 'PRIVATE', templates.length)]

    const vars: Record<string, string> = {
      nombre: knownName,
      grupo: group.name ?? '',
      ciudad: '',
      sponsor: '',
      fecha: todayInTz(agent.timezone),
      link_reto: '',
      nombre_lider: '',
    }

    const body = fillTemplate(template.body, vars)
      .replace(/\s+([!?¡.,;:])/g, '$1')
      .replace(/[ \t]{2,}/g, ' ')
      .trim()

    // 6) Enviar: imagen/video PRIMERO con el texto como pie (los dos en uno) y
    //    luego el resto de recursos, en orden.
    const assetIds = [
      ...(template.mediaAssetId ? [template.mediaAssetId] : []),
      ...(template.mediaAssetIds ?? []),
    ].filter((v, i, arr) => v && arr.indexOf(v) === i)

    await sendWelcomeContent(agentId, dmJid, body, assetIds)

    console.log(`[DIAMOND] Bienvenida privada enviada a ${phone}`)
  } catch (err) {
    console.error(`[DIAMOND] handlePrivateWelcome error agentId=${agentId} grupo=${groupJid}:`, err)
  }
}
