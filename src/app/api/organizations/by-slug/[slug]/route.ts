export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/organizations/by-slug/[slug]  (PÚBLICO, sin auth)
 * Resuelve el slug de una empresa a su nombre, para mostrarlo en el registro
 * por link de invitación. Solo devuelve empresas ACTIVAS.
 */
export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  try {
    const org = await prisma.organization.findUnique({
      where: { slug: params.slug },
      select: { name: true, slug: true, active: true, logoUrl: true },
    })
    if (!org || !org.active) {
      return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 404 })
    }
    return NextResponse.json({ name: org.name, slug: org.slug, logoUrl: org.logoUrl })
  } catch (e) {
    console.error('[GET /api/organizations/by-slug]', e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
