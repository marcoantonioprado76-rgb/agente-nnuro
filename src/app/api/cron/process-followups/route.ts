import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getWhatsAppManager } from '@/lib/whatsapp/manager'
import { chat, FOLLOWUP_MODEL } from '@/lib/openai'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms))

/**
 * GET /api/cron/process-followups
 *
 * Procesa los seguimientos automáticos pendientes.
 * Basado en la lógica de METO APP follow-up-worker.ts, adaptado a Supabase.
 *
 * Flujo:
 * 1. Busca conversations con status='pending_followup'
 * 2. Para cada una, verifica si ya pasó el tiempo configurado
 * 3. Genera mensaje de seguimiento con IA (chat() + FOLLOWUP_MODEL)
 * 4. Envía por WhatsApp
 * 5. Actualiza el contador de seguimientos
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const service = await createServiceRoleClient()
    const manager = getWhatsAppManager()
    const now = new Date()
    let sent = 0
    let skipped = 0
    let errors = 0

    // Buscar conversaciones pendientes de seguimiento
    const { data: pendingConvos, error } = await service
      .from('conversations')
      .select(`
        id, bot_id, contact_id, followup_count, last_bot_message_at, last_followup_at,
        contacts(phone, name, push_name),
        bots(id, name, is_active, openai_api_key, report_phone, tenant_id)
      `)
      .eq('status', 'pending_followup')
      .not('last_bot_message_at', 'is', null)
      .order('last_bot_message_at', { ascending: true })
      .limit(50)

    if (error) {
      console.error('[WORKER] Error consultando conversaciones:', error)
      return NextResponse.json({ error: 'Error en consulta' }, { status: 500 })
    }

    if (!pendingConvos || pendingConvos.length === 0) {
      return NextResponse.json({ message: 'Sin seguimientos pendientes', sent: 0 })
    }

    console.log(`[WORKER] Iniciando proceso de seguimientos. Pendientes: ${pendingConvos.length}`)

    for (const convo of pendingConvos) {
      const botId = convo.bot_id
      const contact = convo.contacts as unknown as { phone: string; name: string; push_name: string } | null
      const bot = convo.bots as unknown as { id: string; name: string; is_active: boolean; openai_api_key: string | null; report_phone: string | null; tenant_id: string } | null

      if (!contact?.phone || !bot?.is_active) {
        skipped++
        continue
      }

      // Verificar que el bot está conectado a WhatsApp
      const sessionState = manager.getSessionState(botId)
      if (sessionState.status !== 'connected') {
        skipped++
        continue
      }

      // Obtener configuración de seguimiento
      const { data: settings } = await service
        .from('followup_settings')
        .select('is_active, first_followup_minutes, second_followup_minutes')
        .eq('bot_id', botId)
        .single()

      if (!settings?.is_active) {
        // Seguimiento desactivado — devolver a activo
        await service.from('conversations').update({ status: 'active' }).eq('id', convo.id)
        skipped++
        continue
      }

      // Determinar qué seguimiento toca
      const followupCount = convo.followup_count || 0
      const referenceTime = convo.last_followup_at || convo.last_bot_message_at
      const refDate = new Date(referenceTime!)
      const minutesPassed = (now.getTime() - refDate.getTime()) / 60_000

      // METO: tipo 1 = único (15m), tipo 2 = recurrente (cada N días)
      let requiredMinutes: number
      if (followupCount === 0) {
        requiredMinutes = settings.first_followup_minutes
      } else {
        // Segundo seguimiento y sucesivos → recurrente (como METO followUp2)
        requiredMinutes = settings.second_followup_minutes
      }

      // ¿Ya pasó suficiente tiempo?
      if (minutesPassed < requiredMinutes) {
        skipped++
        continue
      }

      // API key de OpenAI
      const openaiKey = bot.openai_api_key || process.env.OPENAI_API_KEY
      if (!openaiKey) {
        console.warn(`[WORKER] Bot ${botId} sin API key de OpenAI, omitiendo`)
        skipped++
        continue
      }

      const userPhone = contact.phone
      const userName = contact.name || contact.push_name || 'interesado'
      const followupNumber = followupCount + 1

      console.log(`[WORKER] Ejecutando seguimiento ${followupNumber} para ${userPhone} (${userName})`)

      try {
        // Cargar historial reciente
        const { data: recentMsgs } = await service
          .from('messages')
          .select('sender, content')
          .eq('conversation_id', convo.id)
          .order('created_at', { ascending: false })
          .limit(10)

        const history = (recentMsgs || []).reverse().map((m: { sender: string; content: string }) => {
          if (m.sender === 'bot') {
            try {
              const parsed = JSON.parse(m.content)
              const text = [parsed.mensaje1, parsed.mensaje2, parsed.mensaje3].filter(Boolean).join('\n')
              return { role: 'assistant' as const, content: text || m.content }
            } catch {
              return { role: 'assistant' as const, content: m.content }
            }
          }
          return { role: 'user' as const, content: m.content }
        })

        const delayMinutes = followupNumber === 1 ? settings.first_followup_minutes : settings.second_followup_minutes
        const delayText = delayMinutes >= 1440 ? `${Math.floor(delayMinutes / 1440)} días` : `${delayMinutes} minutos`

        const prompt = `Actúa como el asistente de ventas de "${bot.name}".
El cliente ${userName} (${userPhone}) escribió hace ${delayText}, pero la conversación quedó inconclusa y no se concretó el pedido.

Historial reciente:
${history.map((h: { role: string; content: string }) => `${h.role}: ${h.content.slice(0, 100)}`).join('\n')}

Genera un mensaje breve, cercano, cálido y muy humano en español para retomar la conversación de manera natural.

OBJETIVO:
Reconectar de forma amable, generar confianza y abrir espacio para que el cliente responda.

REGLAS IMPORTANTES:
1. Usa un tono natural, como si escribieras a alguien conocido.
2. Evita lenguaje robótico, formal o corporativo.
3. No repitas saludos si ya fueron usados en el historial.
4. No menciones que es un seguimiento ni que eres una IA.
5. Máximo 2 frases.
6. El mensaje debe tener mínimo 40 y máximo 80 caracteres.
7. Debe sentirse genuino, cálido y amigable.

IMPORTANTE: Responde únicamente en formato JSON con este schema exacto:
{
  "mensaje1": "mensaje aquí"
}`

        const aiResponse = await chat(prompt, [], openaiKey, FOLLOWUP_MODEL)
        const messageText = aiResponse.mensaje1 || "¿Hola? ¿Sigues ahí? Queríamos saber si tienes alguna duda con tu pedido."

        // Enviar por WhatsApp (solo Baileys) — JID siempre con @s.whatsapp.net
        const jid = `${userPhone.replace(/\D/g, '')}@s.whatsapp.net`

        const messageSent = await manager.sendMessage(botId, jid, messageText)

        if (messageSent) {
          // Guardar mensaje en historial como JSON (igual que METO)
          await service.from('messages').insert({
            conversation_id: convo.id,
            sender: 'bot',
            type: 'text',
            content: JSON.stringify({ mensaje1: messageText, mensaje2: '', mensaje3: '', fotos_mensaje1: [], videos_mensaje1: [], reporte: '' }),
          })

          // Actualizar conversación
          const newFollowupCount = followupCount + 1

          if (followupNumber === 1) {
            // Primer seguimiento (único) — mantener como pending_followup para el segundo
            await service.from('conversations').update({
              followup_count: newFollowupCount,
              last_followup_at: now.toISOString(),
              last_message_at: now.toISOString(),
              last_bot_message_at: now.toISOString(),
              status: 'pending_followup',
            }).eq('id', convo.id)
          } else {
            // Segundo seguimiento y sucesivos — RECURRENTE como METO followUp2
            // Resetear count a 1 y last_followup_at a AHORA para que el cron lo
            // vuelva a encontrar cuando pasen second_followup_minutes desde ahora.
            await service.from('conversations').update({
              followup_count: 1, // Mantener en 1 para que siempre use second_followup_minutes
              last_followup_at: now.toISOString(),
              last_message_at: now.toISOString(),
              last_bot_message_at: now.toISOString(),
              status: 'pending_followup',
            }).eq('id', convo.id)
            console.log(`[WORKER] Seguimiento recurrente reprogramado (${settings.second_followup_minutes}m) para ${userPhone}`)
          }

          console.log(`[WORKER] ✅ Seguimiento ${followupNumber} enviado a ${userPhone} (bot: ${bot.name})`)
          sent++
        } else {
          console.warn(`[WORKER] No se pudo enviar seguimiento a ${userPhone} (Bot desconectado o error)`)
          errors++
        }
      } catch (err) {
        console.error(`[WORKER] Error en seguimiento ${followupNumber} para ${userPhone}:`, err)
        errors++
      }
    }

    return NextResponse.json({
      message: `Seguimientos procesados`,
      total: pendingConvos.length,
      sent,
      skipped,
      errors,
      processed_at: now.toISOString(),
    })
  } catch (error) {
    console.error('[WORKER] Error:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
