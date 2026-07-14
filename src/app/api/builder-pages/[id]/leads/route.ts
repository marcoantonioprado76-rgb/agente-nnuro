export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/** GET /api/builder-pages/[id]/leads — leads capturados por la página (solo el dueño) */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const page = await (prisma as any).builderPage.findFirst({
    where: { id: params.id, userId: user.id }, select: { id: true },
  })
  if (!page) return NextResponse.json({ error: 'Página no encontrada' }, { status: 404 })

  const leads = await (prisma as any).builderLead.findMany({
    where: { builderPageId: params.id },
    orderBy: { createdAt: 'desc' },
    take: 500,
    select: { id: true, name: true, phone: true, email: true, data: true, createdAt: true },
  })
  return NextResponse.json({ leads })
}
