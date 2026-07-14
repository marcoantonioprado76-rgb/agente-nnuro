export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getOrgAdmin, unauthorizedOrg } from '@/lib/org-auth'

/** PATCH /api/empresa/content/podcasts/[podcastId] — edita un podcast de SU empresa */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { podcastId: string } }
) {
  try {
    const auth = await getOrgAdmin()
    if (!auth) return unauthorizedOrg()

    // Ownership: el podcast debe pertenecer a SU empresa
    const existing = await (prisma as any).podcast.findUnique({
      where: { id: params.podcastId },
      select: { organizationId: true },
    })
    if (!existing || existing.organizationId !== auth.organizationId) {
      return unauthorizedOrg()
    }

    const body = await req.json()

    const data: any = {}
    if (body.title !== undefined)       data.title       = body.title.trim()
    if (body.description !== undefined) data.description = body.description?.trim() || null
    if (body.coverUrl !== undefined)    data.coverUrl    = body.coverUrl?.trim() || null
    if (body.embedUrl !== undefined)    data.embedUrl    = body.embedUrl.trim()
    if (body.order !== undefined)       data.order       = Number(body.order)
    if (body.active !== undefined)      data.active      = Boolean(body.active)

    const podcast = await (prisma as any).podcast.update({
      where: { id: params.podcastId },
      data,
    })
    return NextResponse.json({ podcast })
  } catch (err) {
    console.error('[PATCH /api/empresa/content/podcasts/[podcastId]]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

/** DELETE /api/empresa/content/podcasts/[podcastId] — borra un podcast de SU empresa */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { podcastId: string } }
) {
  try {
    const auth = await getOrgAdmin()
    if (!auth) return unauthorizedOrg()

    // Ownership: el podcast debe pertenecer a SU empresa
    const existing = await (prisma as any).podcast.findUnique({
      where: { id: params.podcastId },
      select: { organizationId: true },
    })
    if (!existing || existing.organizationId !== auth.organizationId) {
      return unauthorizedOrg()
    }

    await (prisma as any).podcast.delete({ where: { id: params.podcastId } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[DELETE /api/empresa/content/podcasts/[podcastId]]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
