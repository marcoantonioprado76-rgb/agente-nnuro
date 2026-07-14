export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getOrgAdmin, unauthorizedOrg } from '@/lib/org-auth'

/** GET /api/empresa/content/podcasts — podcasts de SU empresa */
export async function GET() {
  try {
    const auth = await getOrgAdmin()
    if (!auth) return unauthorizedOrg()

    const podcasts = await (prisma as any).podcast.findMany({
      where: { organizationId: auth.organizationId },
      orderBy: { order: 'asc' },
    })
    return NextResponse.json({ podcasts })
  } catch (err) {
    console.error('[GET /api/empresa/content/podcasts]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

/** POST /api/empresa/content/podcasts — crea un podcast etiquetado a SU empresa */
export async function POST(req: NextRequest) {
  try {
    const auth = await getOrgAdmin()
    if (!auth) return unauthorizedOrg()

    const { title, description, coverUrl, embedUrl, order } = await req.json()
    if (!title?.trim() || !embedUrl?.trim()) {
      return NextResponse.json({ error: 'Título y URL son obligatorios' }, { status: 400 })
    }

    const podcast = await (prisma as any).podcast.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        coverUrl: coverUrl?.trim() || null,
        embedUrl: embedUrl.trim(),
        order: Number(order) || 0,
        organizationId: auth.organizationId,
      },
    })
    return NextResponse.json({ podcast }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/empresa/content/podcasts]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
