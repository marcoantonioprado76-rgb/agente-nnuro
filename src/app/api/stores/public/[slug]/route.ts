import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

// Public endpoint - no auth required
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const service = await createServiceRoleClient()

    const { data: store, error } = await service
      .from('stores')
      .select('id, name, slug, store_type, whatsapp_number, payment_qr_url, visibility, font_family, font_weight, font_spacing, font_style, background_type, background_value, font_config, bg_config, cover_image_url, favicon_url')
      .eq('slug', slug)
      .eq('visibility', 'public')
      .eq('is_active', true)
      .single()

    if (error || !store) {
      return NextResponse.json({ error: 'Tienda no encontrada' }, { status: 404 })
    }

    // If flat fields are empty but JSONB configs exist, derive them (backward compat)
    if (!store.font_family && store.font_config) {
      const fc = store.font_config as Record<string, unknown>
      store.font_family = (fc.font as string) || null
      store.font_weight = (fc.weight as string) || '700'
      store.font_spacing = (fc.letterSpacing as string) || 'normal'
      store.font_style = fc.uppercase ? 'uppercase' : null
    }
    if (!store.background_value && store.bg_config) {
      const bg = store.bg_config as Record<string, unknown>
      store.background_type = (bg.type as string) || 'solid'
      store.background_value = bg.type === 'gradient'
        ? (bg.gradient as string) || '#0F172A'
        : (bg.color as string) || '#0F172A'
    }

    // Fetch active products with images
    const { data: products } = await service
      .from('store_products')
      .select('id, name, category, currency, price, stock, description, is_active, store_product_images(id, image_url, sort_order)')
      .eq('store_id', store.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    return NextResponse.json({
      store,
      products: products || [],
    }, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    })
  } catch (error) {
    console.error('Error en GET /api/stores/public/[slug]:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
