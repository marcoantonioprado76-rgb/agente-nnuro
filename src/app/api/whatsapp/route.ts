import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getWhatsAppManager } from '@/lib/whatsapp/manager'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

// Bloquear WhatsApp en desarrollo para evitar conflicto con produccion
const isProduction = process.env.NODE_ENV === 'production'

/**
 * GET /api/whatsapp?botId=xxx
 * Returns current WhatsApp session state (status, QR, phone)
 */
export async function GET(request: NextRequest) {
  if (!isProduction) {
    return NextResponse.json({ status: 'disconnected', qr_code: null, phone_number: null, last_connected_at: null, dev_mode: true })
  }
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const botId = request.nextUrl.searchParams.get('botId')
    if (!botId) {
      return NextResponse.json({ error: 'El parametro botId es requerido' }, { status: 400 })
    }

    // Get live state from the manager (in-memory)
    const manager = getWhatsAppManager()
    const liveState = manager.getSessionState(botId)

    // Check DB for persisted state
    const { data: dbSession } = await supabase
      .from('whatsapp_sessions')
      .select('*')
      .eq('bot_id', botId)
      .single()

    // CRITICAL: If DB says 'connected' but manager has no active session,
    // the server was restarted and we lost the WebSocket. Auto-restore.
    if (
      liveState.status === 'disconnected' &&
      dbSession?.status === 'connected'
    ) {
      console.log(`[API WhatsApp GET] Bot ${botId}: DB dice connected pero manager no tiene sesion. Reconectando...`)
      // Fire-and-forget: attempt to reconnect this specific bot
      manager.connect(botId).catch(err => {
        console.error(`[API WhatsApp GET] Error reconectando bot:`, err)
      })

      // Return "connecting" to the frontend so it starts polling
      return NextResponse.json({
        status: 'connecting',
        qr_code: null,
        phone_number: dbSession.phone_number || null,
        last_connected_at: dbSession.last_connected_at || null,
      })
    }

    // If manager has an active session, use that
    if (liveState.status !== 'disconnected') {
      const qrCode = liveState.qrCode || dbSession?.qr_code || null
      const status = qrCode && liveState.status === 'connecting' ? 'qr_ready' : liveState.status

      return NextResponse.json({
        status,
        qr_code: qrCode,
        phone_number: liveState.phone || dbSession?.phone_number || null,
        last_connected_at: dbSession?.last_connected_at || null,
      })
    }

    // Fallback to DB
    if (dbSession) {
      return NextResponse.json({
        status: dbSession.status || 'disconnected',
        qr_code: dbSession.qr_code || null,
        phone_number: dbSession.phone_number || null,
        last_connected_at: dbSession.last_connected_at || null,
      })
    }

    // No session exists
    return NextResponse.json({
      status: 'disconnected',
      qr_code: null,
      phone_number: null,
      last_connected_at: null,
    })
  } catch (error) {
    console.error('Error en GET /api/whatsapp:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

/**
 * POST /api/whatsapp
 * Actions: connect, disconnect, clear_memory, send_message, debug
 */
export async function POST(request: NextRequest) {
  if (!isProduction) {
    return NextResponse.json({ error: 'WhatsApp desactivado en desarrollo. Solo funciona en produccion.' }, { status: 403 })
  }
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { botId, action } = body

    if (!botId || !action) {
      return NextResponse.json({ error: 'botId y action son requeridos' }, { status: 400 })
    }

    // Verify bot belongs to user's tenant
    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single()

    const { data: bot } = await supabase
      .from('bots')
      .select('id')
      .eq('id', botId)
      .eq('tenant_id', profile?.tenant_id || '')
      .single()

    if (!bot) {
      return NextResponse.json({ error: 'Bot no encontrado o no autorizado' }, { status: 403 })
    }

    const manager = getWhatsAppManager()

    switch (action) {
      case 'connect': {
        console.log(`[API WhatsApp POST] Iniciando conexion para bot ${botId}...`)
        const startTime = Date.now()
        try {
          const state = await manager.connect(botId)
          const elapsed = Date.now() - startTime
          const qrCode = state.qrCode || null
          const status = qrCode && state.status === 'connecting' ? 'qr_ready' : state.status
          console.log(`[API WhatsApp POST] Resultado connect: status=${status}, hasQR=${!!qrCode}, elapsed=${elapsed}ms`)
          return NextResponse.json({
            message: qrCode ? 'QR listo para escanear' : 'Conexion iniciada',
            status,
            qr_code: qrCode,
            phone_number: state.phone,
            debug: { elapsed, hasQR: !!qrCode, finalStatus: state.status },
          })
        } catch (connectError) {
          const elapsed = Date.now() - startTime
          const errMsg = connectError instanceof Error ? connectError.message : String(connectError)
          console.error(`[API WhatsApp POST] Error en connect: ${errMsg}, elapsed=${elapsed}ms`)
          return NextResponse.json({
            error: `Error al conectar WhatsApp: ${errMsg}`,
            debug: { elapsed, error: errMsg },
          }, { status: 500 })
        }
      }

      case 'disconnect': {
        await manager.disconnect(botId)
        return NextResponse.json({
          message: 'WhatsApp desconectado correctamente',
          status: 'disconnected',
        })
      }

      case 'clear_memory': {
        const { error: clearError } = await supabase
          .from('conversations')
          .update({ status: 'closed' })
          .eq('bot_id', botId)
          .eq('status', 'active')

        if (clearError) {
          return NextResponse.json({ error: 'Error al limpiar la memoria' }, { status: 500 })
        }

        return NextResponse.json({ message: 'Memoria limpiada correctamente' })
      }

      case 'send_message': {
        const { phone, text } = body
        if (!phone || !text) {
          return NextResponse.json({ error: 'phone y text son requeridos' }, { status: 400 })
        }
        const sent = await manager.sendMessage(botId, phone, text)
        if (!sent) {
          return NextResponse.json({ error: 'No se pudo enviar el mensaje. Bot no conectado.' }, { status: 400 })
        }
        return NextResponse.json({ message: 'Mensaje enviado' })
      }

      default:
        return NextResponse.json(
          { error: `Accion no valida: ${action}` },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Error en POST /api/whatsapp:', error)
    const errMsg = error instanceof Error ? error.message : 'Error interno del servidor'
    return NextResponse.json({ error: errMsg }, { status: 500 })
  }
}
