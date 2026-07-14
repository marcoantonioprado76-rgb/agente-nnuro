export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { resolveOpenAIKey, chargeForChatUsage } from '@/lib/ai-credits'

const OPENAI_BASE = 'https://api.openai.com/v1'

// Normaliza a array de strings (por si la IA devuelve string o cosas raras).
function toArr(v: unknown): string[] {
    if (Array.isArray(v)) return v.map(x => String(x).trim()).filter(Boolean).slice(0, 8)
    if (typeof v === 'string' && v.trim()) return v.split(/[,\n]/).map(s => s.trim()).filter(Boolean).slice(0, 8)
    return []
}

// gpt-5.2 arma el PERFIL DE CONTENIDO (no publicidad) a partir de la descripción de la página.
async function generateProfile(apiKey: string, model: string, description: string): Promise<{ profile: any; promptTokens: number; completionTokens: number }> {
    const system = `Sos un estratega de CONTENIDO para redes sociales (Instagram/Facebook). A partir de la descripción de una PÁGINA/negocio, armás su PERFIL DE CONTENIDO ORGÁNICO — para PUBLICAR CONTENIDO que engancha y construye comunidad, NO para publicidad ni vender directo.
Respondés SOLO con un JSON válido (sin markdown), con esta forma EXACTA:
{
  "pageName": "nombre de la página o negocio",
  "about": "de qué trata la página, en 1-2 frases",
  "audience": "a quién le habla (seguidores ideales), 1 frase",
  "tone": ["3-5 rasgos de tono/personalidad, ej: cercano, inspirador, educativo"],
  "contentThemes": ["4-6 pilares/temas de contenido, ej: tips, motivación, detrás de escena, testimonios, educativo, novedades"],
  "brandColors": ["1-3 colores de marca en #hex si se pueden inferir, si no dejar []"],
  "visualStyle": ["2-4 palabras de estética visual, ej: minimalista, cálido, colorido, elegante"],
  "contentGoal": "objetivo principal del contenido (crecer comunidad / engagement / educar / posicionar marca)"
}
Enfocá TODO en contenido orgánico de valor, nunca en anuncios de venta.`

    const user = `Descripción de la página/negocio:\n"${String(description).substring(0, 1500)}"\n\nArmá el perfil de contenido en JSON.`

    const isReasoning = /^gpt-5/.test(model)
    const body: any = {
        model,
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
        response_format: { type: 'json_object' },
    }
    if (!isReasoning) body.temperature = 0.7

    const res = await fetch(`${OPENAI_BASE}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify(body),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error?.message || 'OpenAI error al armar el perfil')
    const content = data.choices?.[0]?.message?.content || '{}'
    let parsed: any = {}
    try { parsed = JSON.parse(content) } catch { parsed = {} }

    const profile = {
        pageName: String(parsed.pageName || '').trim().substring(0, 120) || 'Mi página',
        about: String(parsed.about || '').trim().substring(0, 600),
        audience: String(parsed.audience || '').trim().substring(0, 400),
        tone: toArr(parsed.tone),
        contentThemes: toArr(parsed.contentThemes),
        brandColors: toArr(parsed.brandColors),
        visualStyle: toArr(parsed.visualStyle),
        contentGoal: String(parsed.contentGoal || '').trim().substring(0, 200),
    }
    return { profile, promptTokens: data.usage?.prompt_tokens ?? 0, completionTokens: data.usage?.completion_tokens ?? 0 }
}

// GET → lista los perfiles de contenido del usuario.
export async function GET() {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const profiles = await (prisma as any).socialContentProfile.findMany({
        where: { userId: user.id, isActive: true },
        orderBy: { updatedAt: 'desc' },
    })
    return NextResponse.json({ profiles })
}

// POST → con { generate:true, description } arma el perfil con IA (NO lo guarda; lo devuelve para editar).
//        con { save:true, ...campos } lo guarda (crea o actualiza si viene id).
export async function POST(req: Request) {
    try {
        const user = await getAuthUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const body = await req.json()

        // ── Generar el perfil con IA (gpt-5.2) ──
        if (body.generate) {
            const description = String(body.description || '').trim()
            if (!description) return NextResponse.json({ error: 'Describí tu página para armar el perfil.' }, { status: 400 })

            const resolved = await resolveOpenAIKey(user.id)
            if (!resolved.ok) {
                if (resolved.error === 'NO_CREDITS') {
                    return NextResponse.json({ error: 'Sin saldo de IA. Comprá saldo o configurá tu propia API Key.', code: 'NO_CREDITS' }, { status: 402 })
                }
                return NextResponse.json({ error: 'No hay API Key disponible. Configurá la tuya en Configuración → IA.', code: resolved.error }, { status: 400 })
            }
            const oaiConfig = await (prisma as any).openAIConfig.findUnique({ where: { userId: user.id } })
            const model = oaiConfig?.model || 'gpt-5.2'
            const { profile, promptTokens, completionTokens } = await generateProfile(resolved.key, model, description)
            if (resolved.source === 'admin' && (promptTokens || completionTokens)) {
                chargeForChatUsage(user.id, model, promptTokens, completionTokens, 'social.content-profile').catch(() => {})
            }
            return NextResponse.json({ profile })
        }

        // ── Guardar (crear o actualizar) ──
        const data = {
            pageName: String(body.pageName || '').trim().substring(0, 120),
            about: String(body.about || '').trim().substring(0, 600),
            audience: String(body.audience || '').trim().substring(0, 400),
            tone: toArr(body.tone),
            contentThemes: toArr(body.contentThemes),
            brandColors: toArr(body.brandColors),
            visualStyle: toArr(body.visualStyle),
            contentGoal: String(body.contentGoal || '').trim().substring(0, 200),
            language: 'es',
        }
        if (!data.pageName) return NextResponse.json({ error: 'Ponele un nombre a la página/negocio.' }, { status: 400 })

        let profile
        if (body.id) {
            // Solo actualiza si el perfil es del usuario.
            const owned = await (prisma as any).socialContentProfile.findFirst({ where: { id: body.id, userId: user.id } })
            if (!owned) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })
            profile = await (prisma as any).socialContentProfile.update({ where: { id: body.id }, data })
        } else {
            profile = await (prisma as any).socialContentProfile.create({ data: { ...data, userId: user.id } })
        }
        return NextResponse.json({ profile })
    } catch (err: any) {
        console.error('[ContentProfile]', err)
        return NextResponse.json({ error: err.message || 'Error con el perfil' }, { status: 500 })
    }
}

// DELETE ?id=... → borra (soft: isActive=false) un perfil del usuario.
export async function DELETE(req: Request) {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const id = new URL(req.url).searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 })
    const owned = await (prisma as any).socialContentProfile.findFirst({ where: { id, userId: user.id } })
    if (!owned) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })
    await (prisma as any).socialContentProfile.update({ where: { id }, data: { isActive: false } })
    return NextResponse.json({ ok: true })
}
