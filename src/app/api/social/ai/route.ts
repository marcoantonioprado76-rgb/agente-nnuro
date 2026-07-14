export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { resolveOpenAIKey, chargeForChatUsage } from '@/lib/ai-credits'

async function callOpenAI(apiKey: string, model: string, systemPrompt: string, userPrompt: string): Promise<{ content: string; promptTokens: number; completionTokens: number }> {
    // Los modelos gpt-5.x razonan y rechazan temperature → no la mandamos con ellos.
    const isReasoning = /^gpt-5/.test(model)
    const reqBody: any = {
        model,
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ],
    }
    if (!isReasoning) reqBody.temperature = 0.8
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify(reqBody)
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error?.message || 'OpenAI error')
    return {
        content: (data.choices[0].message.content as string).trim(),
        promptTokens: data.usage?.prompt_tokens ?? 0,
        completionTokens: data.usage?.completion_tokens ?? 0,
    }
}

export async function POST(req: Request) {
    try {
        const user = await getAuthUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { action, content, networks, topic, language = 'es', profileId, imagePrompt } = await req.json()

        // Perfil de Contenido de la página (la "estrategia" de contenido) — para escribir posts REALES.
        let profile: any = null
        if (profileId) {
            profile = await (prisma as any).socialContentProfile.findFirst({ where: { id: profileId, userId: user.id, isActive: true } })
        }
        if (!profile) {
            profile = await (prisma as any).socialContentProfile.findFirst({ where: { userId: user.id, isActive: true }, orderBy: { updatedAt: 'desc' } })
        }

        // Modelo preferido del usuario (si tiene OpenAIConfig); default gpt-4o
        const oaiConfig = await (prisma as any).openAIConfig.findUnique({ where: { userId: user.id } })
        const model = oaiConfig?.model || 'gpt-4o'

        // Resolver key (NO cobra todavía — cobro por tokens reales después)
        const resolved = await resolveOpenAIKey(user.id)
        if (!resolved.ok) {
            if (resolved.error === 'NO_CREDITS') {
                return NextResponse.json({
                    error: 'Sin saldo de IA. Comprá saldo o configurá tu propia API Key.',
                    code: 'NO_CREDITS',
                    balanceUsd: resolved.balanceUsd,
                }, { status: 402 })
            }
            return NextResponse.json({
                error: 'No hay API Key disponible. Configurá la tuya en Configuración → IA o pedile al admin que active la global.',
                code: resolved.error,
            }, { status: 400 })
        }
        const apiKey = resolved.key

        const networkList = (networks || []).join(', ') || 'redes sociales'
        const reason = `social.ai.${action ?? 'generate'}`

        let result: { content: string; promptTokens: number; completionTokens: number }

        if (action === 'generate') {
            if (profile) {
                // Post de CONTENIDO DE VALOR según la estrategia de la página (no publicidad).
                const tono = Array.isArray(profile.tone) ? profile.tone.join(', ') : ''
                const temas = Array.isArray(profile.contentThemes) ? profile.contentThemes.join(', ') : ''
                const imgHint = (typeof imagePrompt === 'string' && imagePrompt.trim())
                    ? ` El post lleva ESTA imagen: "${imagePrompt.trim().substring(0, 300)}". El texto tiene que ir ACORDE a la imagen (mismo tema/idea).`
                    : ''
                const sys = `Sos el creador de contenido de la página "${profile.pageName}". Escribís posts CORTOS de VALOR para redes (Instagram/Facebook), NO publicidad ni venta.
La página: ${String(profile.about || '').substring(0, 200)}. Audiencia: ${String(profile.audience || '').substring(0, 140)}. Tono: ${tono || 'cercano y auténtico'}.
REGLAS ESTRICTAS:
- CORTO y al grano: 3 a 5 líneas en total (un gancho + 1 o 2 ideas de valor + un cierre con pregunta). NUNCA listas largas de 4-5 puntos ni párrafos enormes.
- UNA sola idea principal, estratégica — no metas toda la información.
- Pocos emojis (2-4) y SOLO 3 hashtags al final.
- Escribís en ${language === 'es' ? 'español' : language}. Negrita con Unicode bold (𝗻𝗲𝗴𝗿𝗶𝘁𝗮). Nada de precios ni "comprá ya".${imgHint}`
                const usr = topic && topic.trim()
                    ? `Escribí el post CORTO sobre: "${topic}". Fiel a la página y su tono.`
                    : `Escribí el post CORTO eligiendo UN tema de: ${temas || 'un tema relevante para la audiencia'}. Fiel a la página y su tono.`
                result = await callOpenAI(apiKey, model, sys, usr)
            } else {
                result = await callOpenAI(apiKey, model,
                    `Eres un experto en marketing de contenido para ${networkList}. Escribes en ${language === 'es' ? 'español' : language}. Genera posts atractivos, con emojis relevantes, hashtags efectivos y llamados a la acción claros. Para negrita usa caracteres Unicode bold (𝗻𝗲𝗴𝗿𝗶𝘁𝗮) que funcionan en todas las redes.`,
                    `Crea un post de marketing para: "${topic}". Redes destino: ${networkList}. El post debe ser convincente, incluir emojis y 3-5 hashtags al final.`
                )
            }
        } else if (action === 'improve') {
            result = await callOpenAI(apiKey, model,
                `Eres un experto en copywriting para redes sociales. Mejoras textos haciéndolos más persuasivos, con mejor estructura, emojis y llamados a la acción. Redes destino: ${networkList}.`,
                `Mejora este texto para publicar en ${networkList}:\n\n${content}`
            )
        } else if (action === 'script') {
            result = await callOpenAI(apiKey, model,
                `Eres un experto en creación de guiones para videos de redes sociales (TikTok, Instagram Reels, YouTube Shorts). Creas guiones detallados con estructura: gancho inicial, desarrollo, llamado a la acción.`,
                `Crea un guión de video para: "${topic}". \nFormato: \n- Duración objetivo: 30-60 segundos\n- Incluye: [GANCHO], [DESARROLLO], [CTA]\n- Incluye indicaciones de tono y gestos donde sea relevante`
            )
        } else if (action === 'analyze') {
            result = await callOpenAI(apiKey, model,
                `Eres un analista de contenido digital experto. Analizas métricas y das recomendaciones específicas y accionables para mejorar el rendimiento del contenido.`,
                `Analiza estas métricas de redes sociales y da 5 recomendaciones concretas para mejorar el contenido:\n\n${content}`
            )
        } else {
            return NextResponse.json({ error: 'Acción no válida' }, { status: 400 })
        }

        // Cobrar tokens reales solo si admin key
        if (resolved.source === 'admin') {
            chargeForChatUsage(user.id, model, result.promptTokens, result.completionTokens, reason)
                .catch(e => console.error('[SocialAI] charge error:', e))
        }

        return NextResponse.json({ result: result.content })
    } catch (err: any) {
        console.error('[SocialAI]', err)
        return NextResponse.json({ error: err.message || 'Error de IA' }, { status: 500 })
    }
}
