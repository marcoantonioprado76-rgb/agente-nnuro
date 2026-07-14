export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getCategory, buildUniversalImagePrompt, buildCreativeMatrix } from '@/lib/ads/ad-categories'
import { resolveAdsKey } from '@/lib/ai-credits'

/** POST → arma el prompt de imagen con el envoltorio UNIVERSAL: escena = adConcept del
 *  brief + beneficio + estilo. Sin IA. Se devuelve como { prompt }. */
export async function POST(req: Request, { params }: { params: { id: string } }) {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const resolved = await resolveAdsKey(user.id)
    if (!resolved) {
        return NextResponse.json({ error: 'Configura tu OpenAI API Key en Configuración → IA, o compra créditos de IA.' }, { status: 400 })
    }

    const campaign = await (prisma as any).adCampaignV2.findFirst({
        where: { id: params.id, userId: user.id },
        include: { brief: true, strategy: true },
    })
    if (!campaign) return NextResponse.json({ error: 'Campaña no encontrada' }, { status: 404 })

    const brief: Record<string, any> = {
        name: campaign.brief.name,
        industry: campaign.brief.industry,
        valueProposition: campaign.brief.valueProposition,
        brandColors: campaign.brief.brandColors,
        visualStyle: campaign.brief.visualStyle,
        keyMessages: campaign.brief.keyMessages,
    }

    // Leer los campos NUEVOS del brief (category + ai_data) y fusionarlos → prompt RICO.
    let categoryId: string | null = null
    try {
        const rows: any[] = await prisma.$queryRawUnsafe(
            'SELECT category, ai_data FROM business_briefs WHERE id = $1::uuid LIMIT 1', campaign.brief.id,
        )
        if (rows?.[0]) {
            categoryId = rows[0].category || null
            let ai = rows[0].ai_data
            if (typeof ai === 'string') { try { ai = JSON.parse(ai) } catch { ai = null } }
            if (ai && typeof ai === 'object' && !Array.isArray(ai)) Object.assign(brief, ai)
        }
    } catch (e) {
        console.warn('[image-prompts] no se pudo leer ai_data:', e instanceof Error ? e.message : e)
    }

    // Conceptos: los adConcepts del brief (escenas ya adaptadas al rubro+negocio) +
    // los de la librería de la categoría como respaldo.
    const cat = getCategory(categoryId || brief.category)
    const concepts = [...new Set([...(Array.isArray(brief.adConcepts) ? brief.adConcepts : []), ...cat.concepts])].slice(0, 8)

    // Body opcional: concept (forzar escena) o count (motor de diversidad → N prompts).
    let preferredConcept: string | undefined
    let count = 0
    try { const body = await req.json(); if (body?.concept) preferredConcept = String(body.concept); if (body?.count) count = Number(body.count) } catch { /* sin body */ }

    const producto = brief.categoryData?.productKind ? `${brief.name} (${brief.categoryData.productKind})` : brief.name
    const benefitsArr = Array.isArray(brief.benefits) && brief.benefits.length ? brief.benefits : (Array.isArray(brief.keyMessages) ? brief.keyMessages : [])
    const enfoque = campaign.strategy?.name || campaign.strategy?.description || ''
    const estilo = [brief.positioning, Array.isArray(brief.brandColors) ? brief.brandColors.slice(0, 3).join(', ') : '', brief.emotion].filter(Boolean).join(', ')

    // ── MOTOR DE DIVERSIDAD (Andromeda): N prompts genuinamente distintos (matriz P.D.A.) ──
    // count >= 1 → devuelve array (funciona también para campañas de 1 solo anuncio).
    if (count >= 1) {
        const prompts = buildCreativeMatrix({ producto, concepts, benefits: benefitsArr, enfoque, estilo, count })
        return NextResponse.json({ prompts, concepts })
    }

    // ── Prompt único (envoltorio universal) ──
    const prompt = buildUniversalImagePrompt({
        producto,
        escena: preferredConcept || concepts[0],
        beneficio: benefitsArr.slice(0, 2).join(', '),
        enfoque,
        estilo,
    })
    return NextResponse.json({ prompt, concepts })
}
