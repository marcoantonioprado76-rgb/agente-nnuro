export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

type Ctx = { params: { botId: string } }

const PRODUCT_INCLUDE = {
  product_images: true,
  product_testimonials: true,
}

export async function GET(_req: NextRequest, { params }: Ctx) {
  const session = await getServerSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const bot = await (prisma as any).bot.findFirst({
    where: { id: params.botId, tenant_id: session.sub },
    select: { id: true },
  })
  if (!bot) return NextResponse.json({ error: 'Bot no encontrado' }, { status: 404 })

  const [assigned, all] = await Promise.all([
    (prisma as any).product.findMany({
      where: { bot_id: params.botId, tenant_id: session.sub },
      include: PRODUCT_INCLUDE,
      orderBy: { created_at: 'asc' },
    }),
    (prisma as any).product.findMany({
      where: { tenant_id: session.sub },
      include: PRODUCT_INCLUDE,
      orderBy: { created_at: 'asc' },
    }),
  ])

  const assignedIds = new Set((assigned ?? []).map((p: any) => p.id))
  const available   = (all ?? []).filter((p: any) => !assignedIds.has(p.id))

  return NextResponse.json({ assigned: assigned ?? [], available })
}

export async function POST(request: NextRequest, { params }: Ctx) {
  const session = await getServerSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const bot = await (prisma as any).bot.findFirst({
    where: { id: params.botId, tenant_id: session.sub },
    select: { id: true },
  })
  if (!bot) return NextResponse.json({ error: 'Bot no encontrado' }, { status: 404 })

  const body = await request.json().catch(() => ({})) as { productId?: string }
  if (!body.productId) return NextResponse.json({ error: 'productId requerido' }, { status: 400 })

  const product = await (prisma as any).product.findFirst({
    where: { id: body.productId, tenant_id: session.sub },
    select: { id: true },
  })
  if (!product) return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 })

  await (prisma as any).product.update({
    where: { id: body.productId },
    data: { bot_id: params.botId },
  })
  return NextResponse.json({ ok: true })
}
