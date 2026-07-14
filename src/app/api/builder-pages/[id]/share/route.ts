export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { randomBytes } from 'crypto'

/**
 * POST /api/builder-pages/[id]/share — genera (o reusa) un token para compartir la página.
 * Con ese token, OTRO usuario puede importar una COPIA editable a su cuenta (ver /import).
 */
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const page = await (prisma as any).builderPage.findFirst({
    where: { id: params.id, userId: user.id }, select: { id: true, shareToken: true },
  })
  if (!page) return NextResponse.json({ error: 'Página no encontrada' }, { status: 404 })

  let token: string = page.shareToken
  if (!token) {
    token = randomBytes(12).toString('base64url')
    await (prisma as any).builderPage.update({ where: { id: params.id }, data: { shareToken: token } })
  }
  return NextResponse.json({ token })
}

/** DELETE /api/builder-pages/[id]/share — revoca el enlace de compartir (deja de funcionar). */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const page = await (prisma as any).builderPage.findFirst({
    where: { id: params.id, userId: user.id }, select: { id: true },
  })
  if (!page) return NextResponse.json({ error: 'Página no encontrada' }, { status: 404 })

  await (prisma as any).builderPage.update({ where: { id: params.id }, data: { shareToken: null } })
  return NextResponse.json({ success: true })
}
