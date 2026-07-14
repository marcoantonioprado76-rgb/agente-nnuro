export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Campos nuevos del brief (categoría + datos de IA). Se guardan en las columnas
// `category` + `ai_data` (JSON) con SQL crudo y GUARDA: si las columnas todavía no
// existen en la DB, no rompe nada (el brief igual se guarda con los campos viejos).
const AI_KEYS = ['offerType', 'benefits', 'transformation', 'targetCustomer', 'targetAgeMin', 'targetAgeMax', 'targetGender', 'positioning', 'emotion', 'adConcepts', 'restrictions', 'categoryData'] as const

async function persistAiData(id: string, body: Record<string, any>) {
    const hasAny = body.category != null || body.aiData != null || AI_KEYS.some(k => body[k] != null)
    if (!hasAny) return
    const aiData = body.aiData ?? Object.fromEntries(AI_KEYS.filter(k => body[k] != null).map(k => [k, body[k]]))
    try {
        await prisma.$executeRawUnsafe(
            'UPDATE business_briefs SET category = $1, ai_data = $2::jsonb WHERE id = $3::uuid',
            body.category ?? null,
            aiData && Object.keys(aiData).length ? JSON.stringify(aiData) : null,
            id,
        )
    } catch (e) {
        console.warn('[brief persistAiData] columnas category/ai_data aún no existen — se omite:', e instanceof Error ? e.message : e)
    }
}

export async function GET() {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const briefs = await (prisma as any).businessBrief.findMany({
        where: { userId: user.id, isActive: true },
        orderBy: { updatedAt: 'desc' }
    })

    // Fusionar los campos nuevos (category + ai_data) leídos con SQL crudo, así el form
    // de edición los muestra. Con guarda: si las columnas no existen, sigue igual.
    try {
        const ids = briefs.map((b: any) => b.id)
        if (ids.length) {
            const rows: any[] = await prisma.$queryRawUnsafe(
                'SELECT id, category, ai_data FROM business_briefs WHERE id = ANY($1::uuid[])', ids,
            )
            const byId = new Map(rows.map(r => [r.id, r]))
            for (const b of briefs) {
                const r = byId.get(b.id)
                if (!r) continue
                if (r.category) b.category = r.category
                let ai = r.ai_data
                if (typeof ai === 'string') { try { ai = JSON.parse(ai) } catch { ai = null } }
                if (ai && typeof ai === 'object' && !Array.isArray(ai)) Object.assign(b, ai)
            }
        }
    } catch (e) {
        console.warn('[brief GET] no se pudo leer ai_data:', e instanceof Error ? e.message : e)
    }

    // Return all briefs + first one as `brief` for backwards compatibility
    return NextResponse.json({ briefs, brief: briefs[0] || null })
}

export async function POST(req: Request) {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const {
        name, industry, description, valueProposition,
        painPoints, interests, brandVoice, brandColors,
        visualStyle, primaryObjective, mainCTA, targetLocations,
        keyMessages, personalityTraits, contentThemes, engagementLevel
    } = body

    if (!name || !industry || !description) {
        return NextResponse.json({ error: 'Nombre, industria y descripción son requeridos' }, { status: 400 })
    }

    const brief = await (prisma as any).businessBrief.create({
        data: {
            userId: user.id,
            name: name.trim(),
            industry: industry.trim(),
            description: description.trim(),
            valueProposition: (valueProposition || '').trim(),
            painPoints: painPoints || [],
            interests: interests || [],
            brandVoice: (brandVoice || 'casual').trim(),
            brandColors: brandColors || [],
            visualStyle: visualStyle || [],
            primaryObjective: primaryObjective || 'conversion',
            mainCTA: (mainCTA || 'Comprar ahora').trim(),
            targetLocations: targetLocations || [],
            keyMessages: keyMessages || [],
            personalityTraits: personalityTraits || [],
            contentThemes: contentThemes || [],
            engagementLevel: engagementLevel || 'medio',
            isActive: true
        }
    })

    await persistAiData(brief.id, body)
    return NextResponse.json({ brief }, { status: 201 })
}

export async function PUT(req: Request) {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    // Saco los campos nuevos (no son columnas Prisma) → se persisten aparte con SQL crudo.
    const { id, category, aiData, offerType, benefits, transformation, targetCustomer, targetAgeMin, targetAgeMax, targetGender, positioning, emotion, adConcepts, restrictions, categoryData, targetCountries, targetCities, ...updates } = body
    void targetCountries; void targetCities // transitorios del generado: no son columnas, se descartan

    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

    const brief = await (prisma as any).businessBrief.findFirst({
        where: { id, userId: user.id }
    })
    if (!brief) return NextResponse.json({ error: 'Brief no encontrado' }, { status: 404 })

    const updated = await (prisma as any).businessBrief.update({
        where: { id },
        data: { ...updates, updatedAt: new Date() }
    })

    await persistAiData(id, { category, aiData, offerType, benefits, transformation, targetCustomer, targetAgeMin, targetAgeMax, targetGender, positioning, emotion, adConcepts, restrictions, categoryData })
    return NextResponse.json({ brief: updated })
}

export async function DELETE(req: Request) {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

    const brief = await (prisma as any).businessBrief.findFirst({
        where: { id, userId: user.id }
    })
    if (!brief) return NextResponse.json({ error: 'Brief no encontrado' }, { status: 404 })

    // Check if any campaigns use this brief
    const campaignCount = await (prisma as any).adCampaignV2.count({ where: { briefId: id } })
    if (campaignCount > 0) {
        return NextResponse.json({
            error: `No puedes eliminar este negocio porque tiene ${campaignCount} campaña(s) asociada(s).`
        }, { status: 409 })
    }

    await (prisma as any).businessBrief.delete({ where: { id } })
    return NextResponse.json({ success: true })
}
