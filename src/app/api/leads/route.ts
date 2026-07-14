export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/** POST /api/leads – Capture lead from landing page */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { landingPageId, name, email, phone, data } = body

        if (!landingPageId) {
            return NextResponse.json({ error: 'landingPageId es requerido' }, { status: 400 })
        }

        // Verify parent page exists
        const page = await prisma.landingPage.findUnique({
            where: { id: landingPageId }
        })

        if (!page) {
            return NextResponse.json({ error: 'Landing page no encontrada' }, { status: 404 })
        }

        const lead = await prisma.lead.create({
            data: {
                landingPageId,
                name,
                email,
                phone,
                data: data || {}
            }
        })

        // Here we could trigger a notification (Email, WhatsApp via Bot, etc.)

        return NextResponse.json({ ok: true, leadId: lead.id })
    } catch (error) {
        console.error('Error capturing lead:', error)
        return NextResponse.json({ error: 'Error al capturar el lead' }, { status: 500 })
    }
}
