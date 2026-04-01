import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getWhatsAppManager } from '@/lib/whatsapp/manager'
import { generateBotResponse } from '@/lib/whatsapp/ai-engine'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

/**
 * GET /api/cron/process-followups
 *
 * Busca conversaciones con seguimiento pendiente y envía mensajes de seguimiento.
 * Debe llamarse periódicamente (cada 5 minutos).
 *
 * Flujo:
 * 1. Busca conversations con status='pending_followup'
 * 2. Para cada una, verifica si ya pasó el tiempo configurado
 * 3. Genera mensaje de seguimiento con IA
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
        contacts(phone, name),
        bots(name, is_active)
      `)
      .eq('status', 'pending_followup')
      .not('last_bot_message_at', 'is', null)
      .order('last_bot_message_at', { ascending: true })
      .limit(50)

    if (error) {
      console.error('[Followup Cron] Error consultando conversaciones:', error)
      return NextResponse.json({ error: 'Error en consulta' }, { status: 500 })
    }

    if (!pendingConvos || pendingConvos.length === 0) {
      return NextResponse.json({ message: 'Sin seguimientos pendientes', sent: 0 })
    }

    console.log(`[Followup Cron] ${pendingConvos.length} conversaciones pendientes de seguimiento`)

    for (const convo of pendingConvos) {
      const botId = convo.bot_id
      const contact = convo.contacts as unknown as { phone: string; name: string } | null
      const bot = convo.bots as unknown as { name: string; is_active: boolean } | null

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

      let requiredMinutes: number
      if (followupCount === 0) {
        requiredMinutes = settings.first_followup_minutes
      } else if (followupCount === 1) {
        requiredMinutes = settings.second_followup_minutes
      } else {
        // Ya se enviaron 2 seguimientos — cerrar
        await service.from('conversations').update({
          status: 'active',
          followup_count: 0,
          last_followup_at: null,
        }).eq('id', convo.id)
        skipped++
        continue
      }

      // ¿Ya pasó suficiente tiempo?
      if (minutesPassed < requiredMinutes) {
        skipped++
        continue
      }

      // Generar mensaje de seguimiento con IA
      const followupNumber = followupCount + 1
      const followupPrompt = followupNumber === 1
        ? '[SEGUIMIENTO AUTOMÁTICO #1] El cliente no ha respondido. Envía un mensaje corto y natural de seguimiento, preguntando si tiene alguna duda o si le interesa continuar. NO repitas la oferta completa.'
        : '[SEGUIMIENTO AUTOMÁTICO #2 - ÚLTIMO] El cliente sigue sin responder. Envía un último mensaje breve y amigable, mencionando que estás disponible cuando quiera. Si no responde, no insistirás más.'

      try {
        const aiResponse = await generateBotResponse(
          botId,
          contact.phone,
          followupPrompt,
          convo.id,
          contact.name || ''
        )

        if (!aiResponse?.message1) {
          console.error(`[Followup Cron] Bot ${botId}: IA no generó mensaje de seguimiento`)
          errors++
          continue
        }

        // Determinar JID correcto
        const jid = contact.phone.length >= 13
          ? `${contact.phone}@lid`
          : `${contact.phone}@s.whatsapp.net`

        // Enviar mensaje
        const messageSent = await manager.sendMessage(botId, jid, aiResponse.message1)

        if (messageSent) {
          // Guardar mensaje en DB
          await service.from('messages').insert({
            conversation_id: convo.id,
            sender: 'bot',
            type: 'text',
            content: aiResponse.message1,
          })

          // Actualizar conversación
          const newFollowupCount = followupCount + 1
          await service.from('conversations').update({
            followup_count: newFollowupCount,
            last_followup_at: now.toISOString(),
            last_message_at: now.toISOString(),
            last_bot_message_at: now.toISOString(),
            // Si ya enviamos 2, devolver a active
            status: newFollowupCount >= 2 ? 'active' : 'pending_followup',
          }).eq('id', convo.id)

          console.log(`[Followup Cron] ✅ Seguimiento #${newFollowupCount} enviado a ${contact.phone} (bot: ${bot.name})`)
          sent++
        } else {
          console.error(`[Followup Cron] ❌ Error enviando seguimiento a ${contact.phone}`)
          errors++
        }
      } catch (err) {
        console.error(`[Followup Cron] Error procesando seguimiento ${convo.id}:`, err)
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
    console.error('[Followup Cron] Error:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
