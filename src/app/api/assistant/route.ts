import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import OpenAI from 'openai'

const BASE_PROMPT = `Eres el Asistente Inteligente de la plataforma Agente de Ventas.

Tu función es ayudar a los usuarios a comprender, configurar y utilizar correctamente toda la aplicación.

Siempre responde en español, de forma clara, práctica, paso a paso, amigable y orientada a resultados.
Tu objetivo es que el usuario pueda configurar y usar su bot correctamente incluso si no tiene conocimientos técnicos.

Actúas como:
- Guía dentro de la aplicación
- Entrenador del usuario
- Soporte técnico inteligente
- Experto en automatización de ventas

Nunca respondas de forma confusa o técnica sin explicación.
Siempre explica CÓMO hacerlo dentro del panel de la aplicación.
Llama al usuario por su nombre cuando lo conozcas.

# ESTRUCTURA DE LA PLATAFORMA

## Panel (Dashboard)
Muestra el estado general: bots activos, actividad del sistema, accesos rápidos.

## Bots (Agentes)
Aquí se crean y configuran los Agentes de Ventas con IA. Cada bot tiene:

### 1. Credenciales
- API Key: La clave que conecta el bot con la IA. Se obtiene en platform.openai.com. Recomienda usar GPT 5.1.
- Número interno para reportes: El bot envía reportes de ventas confirmadas a este número.

### 2. Plantillas (System Prompt)
El prompt del vendedor es el cerebro del bot. Define cómo habla, vende, responde, maneja objeciones y guía al cliente.
Se configuran: número de mensajes por respuesta (hasta 3), caracteres máximos por mensaje.

### 3. Productos
Base de conocimiento de ventas. Cada producto incluye:
- Información básica: nombre, categoría, primer mensaje
- Descripción, beneficios, modo de uso, advertencias
- Precios: moneda, precio normal, precio de oferta
- Imágenes: principales, de oferta, testimonios con foto y descripción
- Envío: información de envío, ciudades de cobertura, zonas de entrega
- Keywords: palabras clave para identificar intención de compra

### 4. Seguimiento
Permite que el bot vuelva a escribir al cliente automáticamente cuando dejó de responder o mostró interés.

### 5. WhatsApp
Aquí se conecta el bot escaneando un código QR. Una vez conectado, el bot responde mensajes automáticamente.

## Conversaciones
Todas las conversaciones del bot: mensajes enviados, recibidos, estado del cliente, historial.

## Tienda Virtual
Página pública para mostrar productos con precios e imágenes. Se puede compartir con clientes.

## Ventas Confirmadas
Registro de ventas cerradas: cliente, producto, precio, ubicación, fecha.

## Oportunidades (Leads)
Posibles clientes interesados para seguimiento de ventas futuras.

## Suscripciones
La plataforma funciona con suscripción mensual. Al vencer se suspende el acceso, pero la configuración NO se borra. Al pagar nuevamente se reactiva todo.

# INSTRUCCIONES DE RESPUESTA
- Responde siempre en español
- Sé conciso pero completo
- Usa formato de lista cuando sea apropiado
- Indica exactamente dónde hacer clic en la plataforma
- Si el usuario es nuevo o no tiene bots, ofrece ayuda paso a paso
- IMPORTANTE: Máximo 150 caracteres por respuesta. Sé ultra breve. Respuestas cortas como en un chat de WhatsApp
- No uses markdown complejo, usa texto simple con emojis para claridad
- Cuando des instrucciones, indica la sección exacta del menú lateral`

/**
 * Construye contexto personalizado del usuario
 */
async function buildUserContext(userId: string): Promise<string> {
  try {
    const supabase = await createServiceRoleClient()

    // Perfil del usuario
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email, role, tenant_id')
      .eq('id', userId)
      .single()

    if (!profile) return ''

    const tenantId = profile.tenant_id

    // Consultas en paralelo — todas con manejo de error individual
    const [botsRes, productsRes, subscriptionRes, storesRes] = await Promise.all([
      supabase.from('bots').select('id, name, is_active, gpt_model, openai_api_key').eq('tenant_id', tenantId),
      supabase.from('products').select('id, name, is_active').eq('tenant_id', tenantId),
      supabase.from('subscriptions').select('status, plan_name, approval_status, start_date, end_date').eq('user_id', userId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('stores').select('id, name, is_active').eq('tenant_id', tenantId),
    ])

    const bots = botsRes.data || []
    const products = productsRes.data || []
    const subscription = subscriptionRes.data
    const stores = storesRes.data || []

    // WhatsApp sessions
    const botIds = bots.map(b => b.id)
    let waSessions: Array<{ bot_id: string; status: string; phone_number: string | null }> = []
    if (botIds.length > 0) {
      const { data } = await supabase
        .from('whatsapp_sessions')
        .select('bot_id, status, phone_number')
        .in('bot_id', botIds)
      waSessions = data || []
    }

  // Construir contexto
  let ctx = `\n# CONTEXTO DEL USUARIO ACTUAL`
  ctx += `\nNombre: ${profile.full_name || 'Sin nombre'}`
  ctx += `\nEmail: ${profile.email || 'Sin email'}`
  ctx += `\nRol: ${profile.role}`

  // Bots
  if (!bots || bots.length === 0) {
    ctx += `\n\n⚠️ El usuario NO tiene bots creados. Es nuevo o aún no ha configurado nada.`
    ctx += `\nSugiérele crear su primer bot desde la sección "Bots" del menú lateral.`
  } else {
    ctx += `\n\n📦 Bots (${bots.length}):`
    for (const bot of bots) {
      const wa = waSessions.find(s => s.bot_id === bot.id)
      const hasApiKey = !!bot.openai_api_key && bot.openai_api_key !== 'your_openai_api_key'
      ctx += `\n- "${bot.name}" | Activo: ${bot.is_active ? 'Sí' : 'No'} | API Key: ${hasApiKey ? 'Configurada ✅' : 'No configurada ❌'} | Modelo: ${bot.gpt_model || 'No configurado'} | WhatsApp: ${wa ? wa.status : 'No conectado'}`
    }
  }

  // Productos
  if (!products || products.length === 0) {
    ctx += `\n\n⚠️ El usuario NO tiene productos. Sugiérele crear productos desde la sección "Productos" de su bot.`
  } else {
    ctx += `\n\n🏷️ Productos (${products.length}): ${products.map(p => `"${p.name}" (${p.is_active ? 'activo' : 'inactivo'})`).join(', ')}`
  }

  // Tiendas
  if (stores && stores.length > 0) {
    ctx += `\n\n🏪 Tiendas (${stores.length}): ${stores.map(s => `"${s.name}" (${s.is_active ? 'activa' : 'inactiva'})`).join(', ')}`
  }

  // Suscripción
  if (!subscription) {
    ctx += `\n\n💳 Sin suscripción activa. El usuario necesita adquirir un plan.`
  } else {
    ctx += `\n\n💳 Suscripción: ${subscription.plan_name || 'Plan'} | Estado: ${subscription.status} | Aprobación: ${subscription.approval_status}`
    if (subscription.end_date) {
      const endDate = new Date(subscription.end_date)
      const now = new Date()
      const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      ctx += ` | ${daysLeft > 0 ? `Vence en ${daysLeft} días` : 'VENCIDA'}`
    }
  }

  return ctx
  } catch (err) {
    console.error('[Assistant] Error construyendo contexto del usuario:', err)
    return ''
  }
}

/**
 * Obtener historial persistente del asistente (si la tabla existe)
 */
async function getPersistedHistory(userId: string): Promise<Array<{ role: string; content: string }>> {
  try {
    const supabase = await createServiceRoleClient()
    const { data, error } = await supabase
      .from('assistant_messages')
      .select('role, content')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(20)

    if (error || !data) return []
    return data
  } catch {
    return []
  }
}

/**
 * Guardar mensajes en historial persistente
 */
async function saveToHistory(userId: string, role: 'user' | 'assistant', content: string): Promise<void> {
  try {
    const supabase = await createServiceRoleClient()
    await supabase.from('assistant_messages').insert({
      user_id: userId,
      role,
      content,
    })
  } catch {
    // Si la tabla no existe, fallar silenciosamente
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { message, history: clientHistory } = await request.json()

    if (!message) {
      return NextResponse.json({ error: 'Mensaje requerido' }, { status: 400 })
    }

    // Obtener contexto del usuario y historial persistente en paralelo
    const [userContext, persistedHistory] = await Promise.all([
      buildUserContext(user.id),
      getPersistedHistory(user.id),
    ])

    // Construir system prompt con contexto del usuario
    const systemPrompt = BASE_PROMPT + userContext

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })

    const messages: OpenAI.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
    ]

    // Priorizar historial persistente, fallback al historial del cliente
    const historyToUse = persistedHistory.length > 0 ? persistedHistory : (clientHistory || [])
    const recent = Array.isArray(historyToUse) ? historyToUse.slice(-16) : []

    for (const msg of recent) {
      messages.push({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content,
      })
    }

    // Agregar mensaje actual
    messages.push({ role: 'user', content: message })

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.7,
      max_tokens: 150,
    })

    const reply = completion.choices[0]?.message?.content || 'Lo siento, no pude procesar tu pregunta.'

    // Guardar ambos mensajes en historial persistente
    await Promise.all([
      saveToHistory(user.id, 'user', message),
      saveToHistory(user.id, 'assistant', reply),
    ])

    return NextResponse.json({
      reply,
      userName: user.user_metadata?.full_name || user.email,
    })
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error)
    console.error('Error en POST /api/assistant:', errMsg, error)
    return NextResponse.json(
      { error: 'Error interno del servidor', detail: errMsg },
      { status: 500 }
    )
  }
}

/**
 * GET: Obtener historial del asistente para el usuario actual
 */
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const history = await getPersistedHistory(user.id)
    return NextResponse.json({ history })
  } catch (error) {
    console.error('Error en GET /api/assistant:', error)
    return NextResponse.json({ history: [] })
  }
}
