import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase/server'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession()
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const { id } = await params
    const service = await createServiceRoleClient()
    const { data, error } = await service.from('products').select('*, product_images(*), product_testimonials(*)').eq('id', id).single()
    if (error) return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 })
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession()
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const { id } = await params
    const service = await createServiceRoleClient()
    const body = await request.json()
    const { product_images, product_testimonials, ...fields } = body

    const SAFE = new Set(['name','category','description','benefits','usage_instructions','warnings','currency','price_unit','price_promo_x2','price_super_x6','offer_price','shipping_info','coverage','hooks','is_active','first_message','sell_zones','delivery_zones'])
    const safe: Record<string, unknown> = { updated_at: new Date().toISOString() }
    for (const k of Object.keys(fields)) { if (SAFE.has(k)) safe[k] = fields[k] }

    const { data, error } = await service.from('products').update(safe).eq('id', id).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    if (Array.isArray(product_images)) {
      await service.from('product_images').delete().eq('product_id', id)
      if (product_images.length > 0) await service.from('product_images').insert(product_images.map((img: any, i: number) => ({ product_id: id, url: img.url, sort_order: img.sort_order ?? i, is_primary: img.is_primary ?? i === 0, image_type: img.image_type ?? 'product' })))
    }
    if (Array.isArray(product_testimonials)) {
      await service.from('product_testimonials').delete().eq('product_id', id)
      if (product_testimonials.length > 0) await service.from('product_testimonials').insert(product_testimonials.map((t: any) => ({ product_id: id, type: t.type ?? 'image', url: t.url, content: t.content ?? '', description: t.description ?? '' })))
    }

    const { data: full } = await service.from('products').select('*, product_images(*), product_testimonials(*)').eq('id', id).single()
    return NextResponse.json(full ?? data)
  } catch (err) {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return PUT(request, { params })
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession()
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const { id } = await params
    const service = await createServiceRoleClient()
    await service.from('products').delete().eq('id', id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
