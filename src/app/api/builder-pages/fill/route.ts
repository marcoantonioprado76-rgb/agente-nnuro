export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { resolveAdsKey, logAiUsage } from '@/lib/ai-credits'
import { getUserLimits } from '@/lib/user-limits'

/**
 * POST /api/builder-pages/fill — rellena/reescribe SOLO los textos de una landing
 * (plantilla) para que hablen del negocio del usuario, sin tocar el diseño ni las imágenes.
 * Entrada: { description, items: [{ i, t }] }  →  Salida: { items: [{ i, t }] }
 */
export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  // Gate de plan: solo Pro/Elite (quien tiene el constructor) puede usar la IA.
  const { limits } = await getUserLimits(user.id)
  if (limits.landingPages === 0) {
    return NextResponse.json({ error: 'El constructor de páginas no está incluido en tu plan.' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const description = String(body?.description || '').trim().slice(0, 2000) // cap de costo del prompt
  const rawItems = Array.isArray(body?.items) ? body.items : []
  if (!description) return NextResponse.json({ error: 'Describe tu negocio' }, { status: 400 })
  if (!rawItems.length) return NextResponse.json({ error: 'No hay textos para rellenar' }, { status: 400 })

  // Sanitizamos y limitamos por seguridad/costo.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items = rawItems.slice(0, 220).map((it: any) => ({ i: Number(it?.i), t: String(it?.t ?? '').slice(0, 400) })).filter((it: { i: number; t: string }) => Number.isFinite(it.i) && it.t.trim())
  if (!items.length) return NextResponse.json({ error: 'No hay textos válidos' }, { status: 400 })

  const resolved = await resolveAdsKey(user.id)
  if (!resolved) {
    return NextResponse.json({ error: 'Configura tu API Key de OpenAI o compra créditos de IA.' }, { status: 400 })
  }

  const system = `Sos un copywriter experto en páginas de venta de alta conversión.
Te paso los textos actuales de una landing (son de relleno/plantilla) y la descripción de un negocio.
Reescribí CADA texto para que hable de ESE negocio: persuasivo, concreto y real (nada de "lorem ipsum", nada genérico).
REGLAS ESTRICTAS:
- Mantené el MISMO idioma de cada texto.
- Mantené una longitud PARECIDA a la original (si es un botón/título corto, devolvé algo corto; si es un párrafo, un párrafo).
- Devolvé EXACTAMENTE la misma cantidad de items, con los MISMOS índices "i". No agregues ni quites items.
- No incluyas HTML, comillas raras ni explicaciones.
Respondé SOLO un JSON con esta forma: {"items":[{"i":0,"t":"texto nuevo"}]}.`

  const prompt = `Negocio del cliente: ${description}\n\nTextos actuales a reescribir (JSON):\n${JSON.stringify(items)}`

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
        max_completion_tokens: 8000,
        response_format: { type: 'json_object' },
      }),
    })
    if (!res.ok) {
      const err = await res.text()
      console.error('[BUILDER-FILL]', err)
      return NextResponse.json({ error: 'Error de OpenAI al rellenar' }, { status: 500 })
    }
    const data = await res.json()
    if (resolved.isGlobal) {
      logAiUsage({ userId: resolved.userId, service: 'landing-fill', model: 'gpt-4o-mini', promptTokens: data.usage?.prompt_tokens ?? 0, completionTokens: data.usage?.completion_tokens ?? 0 }).catch(() => {})
    }
    const content = (data.choices?.[0]?.message?.content as string) || ''
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let parsed: any = {}
    try { parsed = JSON.parse(content) } catch { return NextResponse.json({ error: 'La IA no devolvió un JSON válido' }, { status: 500 }) }
    const out = Array.isArray(parsed?.items) ? parsed.items : []
    if (!out.length) return NextResponse.json({ error: 'La IA no devolvió textos' }, { status: 500 })
    return NextResponse.json({ items: out })
  } catch (e: any) {
    console.error('[BUILDER-FILL]', e)
    const msg = e?.name === 'AbortError' ? 'La IA tardó demasiado. Intentá de nuevo.' : 'Error al rellenar'
    return NextResponse.json({ error: msg }, { status: 500 })
  } finally {
    clearTimeout(timeout)
  }
}
