export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

type Ctx = { params: { id: string } }

async function getOwnedProduct(productId: string, tenantId: string) {
  return (prisma as any).product.findFirst({
    where: { id: productId, tenant_id: tenantId },
    select: { id: true },
  })
}

export async function PATCH(request: NextRequest, { params }: Ctx) {
  const session = await getServerSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const product = await getOwnedProduct(params.id, session.sub)
  if (!product) return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 })

  const body = await request.json().catch(() => ({})) as Record<string, unknown>
  const { product_images, product_testimonials, ...productFields } = body

  const SAFE = new Set(['name', 'category', 'benefits', 'usage_instructions', 'warnings', 'currency', 'price_unit', 'price_promo_x2', 'price_super_x6', 'shipping_info', 'coverage', 'hooks', 'is_active', 'first_message', 'first_message_audio_url'])
  const safe: Record<string, unknown> = {}
  for (const k of Object.keys(productFields)) { if (SAFE.has(k)) safe[k] = productFields[k] }

  await (prisma as any).product.update({ where: { id: params.id }, data: safe })

  if (Array.isArray(product_images)) {
    await (prisma as any).productImage.deleteMany({ where: { product_id: params.id } })
    if (product_images.length > 0) {
      await (prisma as any).productImage.createMany({
        data: (product_images as Array<{ url: string; sort_order: number; is_primary: boolean; image_type: string }>).map(img => ({
          product_id: params.id,
          url: img.url,
          sort_order: img.sort_order ?? 0,
          is_primary: img.is_primary ?? false,
          image_type: img.image_type ?? 'product',
        })),
      })
    }
  }
  if (Array.isArray(product_testimonials)) {
    await (prisma as any).productTestimonial.deleteMany({ where: { product_id: params.id } })
    if (product_testimonials.length > 0) {
      await (prisma as any).productTestimonial.createMany({
        data: (product_testimonials as Array<{ type: string; url: string; content?: string; description?: string }>).map(t => ({
          product_id: params.id,
          type: t.type ?? 'image',
          url: t.url,
          content: t.content ?? '',
          description: t.description ?? '',
        })),
      })
    }
  }

  const full = await (prisma as any).product.findUnique({
    where: { id: params.id },
    include: { product_images: true, product_testimonials: true },
  })
  return NextResponse.json({ product: full })
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const session = await getServerSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const product = await getOwnedProduct(params.id, session.sub)
  if (!product) return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 })

  await (prisma as any).product.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
