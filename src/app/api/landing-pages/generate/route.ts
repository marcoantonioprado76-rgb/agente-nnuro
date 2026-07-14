export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/crypto'
import { verifyToken } from '@/lib/auth'
import { getPlanLimits, PLAN_NAMES, type UserPlan } from '@/lib/plan-limits'
import { resolveOpenAIKey, chargeForChatUsage } from '@/lib/ai-credits'

function getAuth() {
  const cookieStore = cookies()
  const token = cookieStore.get('auth_token')?.value
  if (!token) return null
  return verifyToken(token)
}

function extractYouTubeId(url: string): string {
  if (!url) return ''
  if (url.includes('youtube.com/watch?v=')) return url.split('v=')[1]?.split('&')[0] || ''
  if (url.includes('youtu.be/')) return url.split('youtu.be/')[1]?.split('?')[0] || ''
  if (url.includes('youtube.com/embed/')) return url.split('embed/')[1]?.split('?')[0] || ''
  return url
}

export async function POST(req: NextRequest) {
  const auth = getAuth()
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const userRecord = await prisma.user.findUnique({ where: { id: auth.userId }, select: { plan: true } })
  const plan = (userRecord?.plan ?? 'NONE') as UserPlan
  const limits = getPlanLimits(plan)

  if (limits.landingPages === 0) {
    return NextResponse.json({
      error: `Las Landing Pages no están incluidas en tu ${PLAN_NAMES[plan]}. Actualiza al Pack Pro para acceder.`,
      limitReached: true,
      plan,
    }, { status: 403 })
  }

  const body = await req.json()
  const {
    description,
    instructions = '',
    openaiKey: bodyKey = '',
    businessType = '',
    primaryColor = '#D203DD',
    secondaryColor = '#00FF88',
    videoUrl = '',
    imageUrls = [] as string[],
    buttonUrl = '#',
    buttonText = 'COMENZAR AHORA',
  } = body

  if (!description?.trim()) {
    return NextResponse.json({ error: 'La descripción es requerida' }, { status: 400 })
  }

  // Prioridad de resolución de key OpenAI:
  //   1. Key explícita del form (bodyKey) → usar tal cual, sin cobrar saldo.
  //   2. Key de algún bot ACTIVE del usuario → usar, sin cobrar saldo.
  //   3. Fallback: resolveOpenAIKey() → usa la propia del usuario (preferOwnKey)
  //      o la del admin global. El cobro se hace por tokens reales DESPUÉS.
  let openaiKey = bodyKey?.trim()
  let keySource: 'own' | 'admin' = 'own'  // 'own' significa no cobrar (key del usuario, bot, o body)

  if (!openaiKey) {
    const bot = await prisma.bot.findFirst({
      where: { userId: auth.userId, status: 'ACTIVE' },
      include: { secret: true },
      orderBy: { createdAt: 'desc' },
    })
    if (bot?.secret?.openaiApiKeyEnc) {
      try { openaiKey = decrypt(bot.secret.openaiApiKeyEnc) || '' } catch { openaiKey = '' }
    }
  }

  // Último recurso: key admin global con cobro de saldo USD
  if (!openaiKey) {
    const resolved = await resolveOpenAIKey(auth.userId)
    if (resolved.ok) {
      openaiKey = resolved.key
      keySource = resolved.source
    } else if (resolved.error === 'NO_CREDITS') {
      return NextResponse.json({
        error: 'Sin saldo de IA. Comprá saldo, configurá tu propia API Key o configurá una en tu bot de WhatsApp.',
        code: 'NO_CREDITS',
        balanceUsd: resolved.balanceUsd,
      }, { status: 402 })
    } else {
      return NextResponse.json({
        error: 'Se requiere una API Key de OpenAI. Ingresa tu key en el formulario, configura una en tu bot de WhatsApp, o pedile al admin que active la key global.'
      }, { status: 400 })
    }
  }

  const videoId = videoUrl ? extractYouTubeId(videoUrl) : ''
  const mainImage = imageUrls[0] || ''

  const prompt = `Eres un experto desarrollador web y copywriter especializado en landing pages de alta conversión.
Genera una landing page COMPLETA en HTML puro, moderna, oscura con colores neón.

REGLAS ABSOLUTAS:
1. Responde SOLO con el HTML. Sin explicaciones, sin markdown, sin bloques de código.
2. Documento HTML completo y autocontenido: <!DOCTYPE html>, <html>, <head>, <body>.
3. CSS SOLO inline o en <style> dentro del <head>. NUNCA uses frameworks externos.
4. Textos 100% adaptados al negocio. SIN frases genéricas como "Beneficio 1".
5. Idioma igual al de la descripción del negocio.
6. Diseño responsive (móvil y desktop).
${instructions?.trim() ? `7. INSTRUCCIONES DEL USUARIO (OBLIGATORIAS):\n${instructions}` : ''}

NEGOCIO:
Tipo: ${businessType || 'general'}
Descripción: ${description}
Botón CTA texto: ${buttonText}
Botón CTA URL: ${buttonUrl}
Color primario: ${primaryColor}
Color secundario: ${secondaryColor}
${mainImage ? `Imagen principal: ${mainImage}` : ''}
${videoId ? `Video YouTube ID: ${videoId}` : ''}

ESTILO VISUAL:
- Fondo: #07080F
- Texto: #ffffff
- Acentos/botones: ${primaryColor}
- Highlights: ${secondaryColor}
- Fuente: system-ui, -apple-system, sans-serif
- Bordes redondeados: 12-20px
- Sombras neón suaves en elementos destacados
- Botones grandes, llamativos, rellenos con color primario y texto oscuro
- Hero a pantalla completa (min-height: 100vh)
- Espaciado generoso (80px-120px entre secciones)

SECCIONES REQUERIDAS (en este orden):
1. HERO: Título en MAYÚSCULAS (máx 8 palabras impactantes), subtítulo con propuesta de valor, botón CTA grande${mainImage ? ', imagen del producto' : ''}${videoId ? `, video de YouTube (embed: https://www.youtube.com/embed/${videoId})` : ''}
2. BENEFICIOS: 3 beneficios reales con emoji de icono, título y descripción específicos al negocio
3. OFERTA: Precio o propuesta de valor clara, con botón CTA y urgencia
4. TESTIMONIOS: 2-3 testimonios creíbles y específicos al negocio (con nombre y resultado)
5. FAQ: 4 preguntas frecuentes con sus respuestas completas visibles
6. CTA FINAL: Llamada a la acción con urgencia, escasez o garantía

Genera SOLO el HTML. Nada más.`

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 8000,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('[LANDING-GEN] OpenAI error:', err)
      return NextResponse.json({ error: `Error OpenAI: ${res.status}` }, { status: 500 })
    }

    const data = await res.json()
    // Cobrar tokens reales SOLO si usamos admin key (no si bodyKey ni bot key ni propia)
    if (keySource === 'admin' && data?.usage) {
      const promptTokens = data.usage?.prompt_tokens ?? 0
      const completionTokens = data.usage?.completion_tokens ?? 0
      chargeForChatUsage(auth.userId, 'gpt-4o', promptTokens, completionTokens, 'landing.generate')
        .catch(e => console.error('[LANDING-GEN] charge error:', e))
    }
    let html = (data.choices?.[0]?.message?.content as string) || ''

    // Strip markdown code blocks if AI wrapped the HTML
    html = html.replace(/^```html\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim()

    return NextResponse.json({ html })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error generando la landing'
    console.error('[LANDING-GEN] Error:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
