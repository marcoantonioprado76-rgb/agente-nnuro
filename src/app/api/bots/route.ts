export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateSecureToken } from '@/lib/crypto'

const DEFAULT_PROMPT = (name: string) => `# 🎯 IDENTIDAD

Eres ${name}, vendedor profesional de WhatsApp. Hombre, amable, directo y humano.

Tono: corto, cálido, cercano.

---

# 🧠 SECUENCIA PRINCIPAL

## 1. Bienvenida e identificación del producto

Primero da una bienvenida cálida. Luego identifica qué producto le interesa al cliente.

Si no está identificado: NO envíes precios ni fotos. Pregunta: "¿Qué producto te interesa?"

## 2. Primera interacción

Si el producto está identificado:
- Envía el texto del campo "Primer mensaje".
- Envía 1 foto principal en fotos_mensaje1.
- Añade gatillos: transformación, autoridad, prueba social.

## 3. Precios (solo si el cliente los pide)

- 1 unidad → precio unitario
- 2+ unidades → precio promo ×2 o súper ×6

## 4. Testimonios

Envía testimonios para reforzar confianza cuando haya dudas.

## 5. Dirección y confirmación

Pide: nombre, teléfono y dirección completa (ciudad, calle, zona).
Confirma el pedido cuando tengas todos los datos.

## 6. Reporte (solo si hubo confirmación)

"Hola *${name}*, nuevo pedido de [nombre].
Contacto: [teléfono].
Dirección: [dirección].
Descripción: [producto]."

---

# 🚨 REGLAS

- NUNCA inventar datos.
- NUNCA repetir URLs ya enviadas.
- Tono cálido, boliviano, humano.
- Mensajes cortos y directos.

---

# 📦 FORMATO DE SALIDA

Responde SIEMPRE con este JSON exacto:

\`\`\`json
{
  "mensaje1": "Texto principal",
  "mensaje2": "",
  "mensaje3": "",
  "fotos_mensaje1": [],
  "videos_mensaje1": [],
  "audio_url": "",
  "reporte": ""
}
\`\`\``

/** GET /api/bots — listar bots del usuario */
export async function GET() {
  try {
    const session = await getServerSession()
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const bots = await (prisma as any).bot.findMany({
      where: { tenant_id: session.sub },
      include: {
        bot_secrets: { select: { whatsapp_instance_number: true, report_phone: true } },
        _count: { select: { products: true, conversations: true } },
      },
      orderBy: { created_at: 'desc' },
    })

    const result = await Promise.all(bots.map(async (b: any) => {
      const salesCount = await (prisma as any).conversation.count({
        where: { bot_id: b.id, sold: true },
      })
      // Transform to camelCase matching nexor's Bot interface
      return {
        id: b.id,
        name: b.name,
        type: b.type,
        status: b.status,
        webhookToken: b.webhook_token,
        systemPromptTemplate: b.system_prompt_template,
        maxCharsMensaje1: b.max_chars_msg1,
        maxCharsMensaje2: b.max_chars_msg2,
        maxCharsMensaje3: b.max_chars_msg3,
        baileysPhone: b.baileys_phone,
        followUp1Delay: b.follow_up1_delay,
        followUp2Delay: b.follow_up2_delay,
        aiModel: b.ai_model,
        createdAt: b.created_at,
        secret: b.bot_secrets ? {
          whatsappInstanceNumber: b.bot_secrets.whatsapp_instance_number,
          reportPhone: b.bot_secrets.report_phone,
        } : null,
        _count: {
          assignedProducts: b._count.products,
          conversations: b._count.conversations,
        },
        salesCount,
      }
    }))

    return NextResponse.json({ bots: result })
  } catch (err) {
    console.error('[GET /api/bots]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

/** POST /api/bots — crear bot */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const body = await request.json().catch(() => ({}))
    const name = (body.name as string)?.trim()
    if (!name) return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 })

    const webhookToken = generateSecureToken(32)
    const typeStr = (body.type as string) ?? 'BAILEYS'
    const botType = ['YCLOUD', 'BAILEYS', 'META', 'WHATSAPP_CLOUD'].includes(typeStr) ? typeStr : 'BAILEYS'

    const bot = await (prisma as any).bot.create({
      data: {
        tenant_id: session.sub,
        name,
        type: botType,
        status: 'ACTIVE',
        webhook_token: webhookToken,
        ai_model: 'gpt-4o-mini',
        system_prompt_template: DEFAULT_PROMPT(name),
        follow_up1_delay: 15,
        follow_up2_delay: 4320,
      },
    })

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://tu-dominio.com'
    const webhookUrl = botType === 'META'
      ? `${appUrl}/api/webhooks/meta/${bot.id}`
      : botType === 'WHATSAPP_CLOUD'
        ? `${appUrl}/api/webhooks/whatsapp-cloud/${bot.id}`
        : `${appUrl}/api/webhooks/ycloud/whatsapp/${bot.id}?token=${webhookToken}`

    return NextResponse.json({ bot, webhookUrl, webhookToken }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/bots]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
