export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { resolveAdsKey, logAiUsage } from '@/lib/ai-credits'
import { getUserLimits } from '@/lib/user-limits'

/**
 * POST /api/builder-pages/generate — genera el HTML de una landing con IA
 * para el Constructor Visual. Devuelve HTML con estilos inline (editable en GrapesJS).
 */
export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  // Gate de plan: solo quien tiene el constructor (Pro/Elite) puede generar con IA.
  const { limits } = await getUserLimits(user.id)
  if (limits.landingPages === 0) {
    return NextResponse.json({ error: 'El constructor de páginas no está incluido en tu plan.' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const description = String(body?.description || '').trim().slice(0, 2000) // cap para acotar el costo del prompt
  const colors = String(body?.colors || '').trim().slice(0, 200)
  if (!description) return NextResponse.json({ error: 'Describe tu negocio/landing' }, { status: 400 })

  const resolved = await resolveAdsKey(user.id)
  if (!resolved) {
    return NextResponse.json({ error: 'Configura tu API Key de OpenAI o compra créditos de IA.' }, { status: 400 })
  }

  const system = `You are a world-class conversion copywriter and landing page designer.
Return ONE complete sales landing page as a SINGLE block of clean HTML with INLINE styles ONLY.
STRICT RULES:
- NO <html>, <head>, <body>, <script>, <link> or external CSS. Only <section>/<div>/<h1>/<p>/<a>/<img>/<ul>/<form>/<input>/<button> with style="..." attributes.
- Modern DARK theme, bold, high-conversion. Mobile-friendly (use flex-wrap, max-width, % widths).
- Include these sections in order: 1) HERO with gradient background + headline + subtext + CTA button, 2) BENEFITS (3 cards), 3) TESTIMONIALS with stars, 4) PRICING (3 plans, mark the middle as popular), 5) a simple FORM (nombre, WhatsApp, correo + button), 6) FINAL CTA, 7) footer.
- Spanish language. Real persuasive copy based on the business (no "lorem ipsum").
- Use the brand colors if provided.
Return ONLY the HTML, nothing else.`

  const prompt = `Negocio / landing: ${description}${colors ? `\nColores de marca: ${colors}` : ''}`

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 60000)
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${resolved.key}` },
      signal: controller.signal,
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }],
        temperature: 0.7,
        max_completion_tokens: 4000,
      }),
    })
    if (!res.ok) {
      const err = await res.text()
      console.error('[BUILDER-GEN]', err)
      return NextResponse.json({ error: 'Error de OpenAI al generar' }, { status: 500 })
    }
    const data = await res.json()
    if (resolved.isGlobal) {
      logAiUsage({ userId: resolved.userId, service: 'landing-builder', model: 'gpt-4o-mini', promptTokens: data.usage?.prompt_tokens ?? 0, completionTokens: data.usage?.completion_tokens ?? 0 }).catch(() => {})
    }
    let html = (data.choices?.[0]?.message?.content as string) || ''
    html = html.replace(/^```html\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim()
    if (!html) return NextResponse.json({ error: 'La IA no devolvió contenido' }, { status: 500 })
    return NextResponse.json({ html })
  } catch (e: any) {
    console.error('[BUILDER-GEN]', e)
    const msg = e?.name === 'AbortError' ? 'La IA tardó demasiado. Intentá de nuevo.' : 'Error al generar'
    return NextResponse.json({ error: msg }, { status: 500 })
  } finally {
    clearTimeout(timeout)
  }
}
