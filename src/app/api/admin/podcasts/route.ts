export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { validateOrganizationId } from '@/lib/org-content'

export async function GET() {
  try {
    const user = await getAuthUser()
    if (!user?.isAdmin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

    const podcasts = await (prisma as any).podcast.findMany({
      orderBy: { order: 'asc' },
    })
    return NextResponse.json({ podcasts })
  } catch (err) {
    console.error('[GET /api/admin/podcasts]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user?.isAdmin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

    const { title, description, coverUrl, embedUrl, categoria, order, organizationId } = await req.json()
    if (!title?.trim() || !embedUrl?.trim()) {
      return NextResponse.json({ error: 'Título y URL son obligatorios' }, { status: 400 })
    }

    const org = await validateOrganizationId(organizationId)
    if (!org.ok) return NextResponse.json({ error: org.error }, { status: 400 })

    const podcast = await (prisma as any).podcast.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        coverUrl: coverUrl?.trim() || null,
        embedUrl: embedUrl.trim(),
        categoria: categoria?.trim() || null,
        order: Number(order) || 0,
        organizationId: org.skip ? null : org.value,
      },
    })
    return NextResponse.json({ podcast })
  } catch (err) {
    console.error('[POST /api/admin/podcasts]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
