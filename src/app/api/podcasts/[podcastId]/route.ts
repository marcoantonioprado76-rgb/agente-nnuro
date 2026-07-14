export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { viewerOrgId } from '@/lib/org-content'

export async function GET(
  _req: NextRequest,
  { params }: { params: { podcastId: string } }
) {
  try {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    if (user.plan === 'NONE') return NextResponse.json({ error: 'Necesitas un plan activo' }, { status: 403 })

    const podcast = await (prisma as any).podcast.findUnique({
      where: { id: params.podcastId },
    })

    if (!podcast || !podcast.active) {
      return NextResponse.json({ error: 'Episodio no encontrado' }, { status: 404 })
    }

    // Aislamiento por empresa: el episodio debe pertenecer a la empresa del que mira
    const oid = await viewerOrgId(user.id)
    if ((podcast.organizationId ?? null) !== oid) {
      return NextResponse.json({ error: 'Episodio no encontrado' }, { status: 404 })
    }

    return NextResponse.json({ podcast })
  } catch (err) {
    console.error('[GET /api/podcasts/[id]]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
