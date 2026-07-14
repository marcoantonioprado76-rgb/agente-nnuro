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
 * GET /api/bots/[botId]/products
 * Returns { assigned: Product[], available: Product[] }
 * assigned = products linked to this bot
 * available = user's products NOT yet assigned to this bot
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { botId: string } },
) {
  const auth = getAuth()
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const bot = await prisma.bot.findFirst({ where: { id: params.botId, userId: auth.userId } })
  if (!bot) return NextResponse.json({ error: 'Bot no encontrado' }, { status: 404 })

  const [assigned, allUserProducts] = await Promise.all([
    prisma.product.findMany({
      where: { bots: { some: { botId: params.botId } } },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.product.findMany({
      where: { userId: auth.userId },
      orderBy: { createdAt: 'asc' },
    }),
  ])

  const assignedIds = new Set(assigned.map(p => p.id))
  const available = allUserProducts.filter(p => !assignedIds.has(p.id))

  return NextResponse.json({ assigned, available })
}

/**
 * POST /api/bots/[botId]/products
 * Body: { productId: string }
 * Assigns an existing catalog product to this bot
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { botId: string } },
) {
  const auth = getAuth()
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const bot = await prisma.bot.findFirst({ where: { id: params.botId, userId: auth.userId } })
  if (!bot) return NextResponse.json({ error: 'Bot no encontrado' }, { status: 404 })

  const { productId } = await request.json() as { productId: string }
  if (!productId) return NextResponse.json({ error: 'productId requerido' }, { status: 400 })

  // Verify product belongs to this user
  const product = await prisma.product.findFirst({
    where: { id: productId, userId: auth.userId },
  })
  if (!product) return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 })

  await prisma.botProduct.upsert({
    where: { botId_productId: { botId: params.botId, productId } },
    create: { botId: params.botId, productId },
    update: {},
  })

  return NextResponse.json({ ok: true })
}
