export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  const session = await getServerSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await request.json().catch(() => ({})) as Record<string, unknown>
  const { botId, product_images, product_testimonials, ...productFields } = body

  if (!botId || typeof botId !== 'string') return NextResponse.json({ error: 'botId requerido' }, { status: 400 })
  if (!productFields.name) return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 })

  const bot = await (prisma as any).bot.findFirst({
    where: { id: botId, tenant_id: session.sub },
    select: { id: true },
  })
  if (!bot) return NextResponse.json({ error: 'Bot no encontrado' }, { status: 404 })

  const SAFE = new Set(['name', 'category', 'benefits', 'usage_instructions', 'warnings', 'currency', 'price_unit', 'price_promo_x2', 'price_super_x6', 'shipping_info', 'coverage', 'hooks', 'is_active', 'first_message', 'first_message_audio_url'])
  const safe: Record<string, unknown> = {}
  for (const k of Object.keys(productFields)) { if (SAFE.has(k)) safe[k] = productFields[k] }

  try {
    const product = await (prisma as any).product.create({
      data: { ...safe, bot_id: botId, tenant_id: session.sub },
    })

    if (Array.isArray(product_images) && product_images.length > 0) {
      await (prisma as any).productImage.createMany({
        data: (product_images as Array<{ url: string; sort_order: number; is_primary: boolean; image_type: string }>).map(img => ({
          product_id: product.id,
          url: img.url,
          sort_order: img.sort_order ?? 0,
          is_primary: img.is_primary ?? false,
          image_type: img.image_type ?? 'product',
        })),
      })
    }
    if (Array.isArray(product_testimonials) && product_testimonials.length > 0) {
      await (prisma as any).productTestimonial.createMany({
        data: (product_testimonials as Array<{ type: string; url: string; content?: string; description?: string }>).map(t => ({
          product_id: product.id,
          type: t.type ?? 'image',
          url: t.url,
          content: t.content ?? '',
          description: t.description ?? '',
        })),
      })
    }

    const full = await (prisma as any).product.findUnique({
      where: { id: product.id },
      include: { product_images: true, product_testimonials: true },
    })
    return NextResponse.json({ product: full ?? product }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/bot-products]', err)
    return NextResponse.json({ error: 'Error al guardar producto' }, { status: 500 })
  }
}
