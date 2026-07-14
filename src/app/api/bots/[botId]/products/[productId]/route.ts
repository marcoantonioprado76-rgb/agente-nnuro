export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

function getAuth() {
  const token = cookies().get('auth_token')?.value
  if (!token) return null
  return verifyToken(token)
}

/**
 * DELETE /api/bots/[botId]/products/[productId]
 * Unassigns a product from this bot (does NOT delete the product from the catalog)
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { botId: string; productId: string } },
) {
  const auth = getAuth()
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const bot = await prisma.bot.findFirst({ where: { id: params.botId, userId: auth.userId } })
  if (!bot) return NextResponse.json({ error: 'Bot no encontrado' }, { status: 404 })

  await prisma.botProduct.deleteMany({
    where: { botId: params.botId, productId: params.productId },
  })

  return NextResponse.json({ ok: true })
}
