import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { createUserNotification } from '@/lib/notifications'

/* ── Font option map (mirrors dashboard FONT_OPTIONS) ── */
const FONT_MAP: Record<string, string> = {
  default: 'Inter, sans-serif',
  inter: 'Inter',
  sora: 'Sora',
  poppins: 'Poppins',
  outfit: 'Outfit',
  manrope: 'Manrope',
  'plus-jakarta': 'Plus Jakarta Sans',
  'dm-sans': 'DM Sans',
  montserrat: 'Montserrat',
  raleway: 'Raleway',
  cormorant: 'Cormorant Garamond',
  playfair: 'Playfair Display',
  'eb-garamond': 'EB Garamond',
  'space-grotesk': 'Space Grotesk',
  'bebas-neue': 'Bebas Neue',
  oswald: 'Oswald',
  anton: 'Anton',
  'work-sans': 'Work Sans',
  karla: 'Karla',
  nunito: 'Nunito',
  orbitron: 'Orbitron',
  rajdhani: 'Rajdhani',
}

/* Extract flat visual fields from font_config/bg_config objects */
function extractVisualFields(fontConfig: Record<string, unknown> | null, bgConfig: Record<string, unknown> | null) {
  const visual: Record<string, string | null> = {}

  if (fontConfig) {
    const fontKey = (fontConfig.font as string) || 'default'
    visual.font_family = FONT_MAP[fontKey] || fontKey
    visual.font_weight = (fontConfig.weight as string) || '700'
    visual.font_spacing = (fontConfig.letterSpacing as string) || 'normal'
    visual.font_style = fontConfig.uppercase ? 'uppercase' : null
  }

  if (bgConfig) {
    const bgType = (bgConfig.type as string) || 'solid'
    visual.background_type = bgType
    visual.background_value = bgType === 'gradient'
      ? (bgConfig.gradient as string) || '#0F172A'
      : (bgConfig.color as string) || '#0F172A'
  }

  return visual
}

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const service = await createServiceRoleClient()
    const { data: stores, error } = await service
      .from('stores')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching stores:', error)
      return NextResponse.json({ error: 'Error al obtener tiendas' }, { status: 500 })
    }

    const storesWithCounts = await Promise.all(
      (stores || []).map(async (store) => {
        const { count } = await service
          .from('store_products')
          .select('id', { count: 'exact', head: true })
          .eq('store_id', store.id)
        return { ...store, product_count: count || 0 }
      })
    )

    return NextResponse.json(storesWithCounts)
  } catch (error) {
    console.error('Error en GET /api/stores:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })
    }

    const body = await request.json()
    const { name, slug, store_type, whatsapp_number, payment_qr_url, visibility, font_config, bg_config } = body

    if (!name || !slug) {
      return NextResponse.json({ error: 'Nombre y slug son requeridos' }, { status: 400 })
    }

    const slugClean = slug.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
    if (!slugClean || slugClean.length < 2) {
      return NextResponse.json({ error: 'El slug debe tener al menos 2 caracteres' }, { status: 400 })
    }

    const service = await createServiceRoleClient()

    const { data: existing } = await service
      .from('stores')
      .select('id')
      .eq('slug', slugClean)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'Este slug ya está en uso. Elige otro.' }, { status: 409 })
    }

    // Extract flat visual fields from config objects
    const visual = extractVisualFields(font_config, bg_config)

    const { data: store, error } = await service
      .from('stores')
      .insert({
        user_id: user.id,
        tenant_id: profile.tenant_id,
        name: name.trim(),
        slug: slugClean,
        store_type: store_type || 'business',
        whatsapp_number: whatsapp_number || null,
        payment_qr_url: payment_qr_url || null,
        visibility: visibility || 'public',
        font_config: font_config || null,
        bg_config: bg_config || null,
        ...visual,
      })
      .select()
      .single()

    if (error || !store) {
      console.error('Error creating store:', error)
      return NextResponse.json({ error: error?.message || 'Error al crear la tienda' }, { status: 500 })
    }

    createUserNotification({
      userId: user.id,
      type: 'tienda_creada',
      title: 'Tienda virtual creada',
      message: `Tu tienda "${name.trim()}" está lista. Agrega productos para empezar a vender.`,
      link: `/stores/${store.id}`,
    }).catch(() => {})

    return NextResponse.json({ ...store, product_count: 0 }, { status: 201 })
  } catch (error) {
    console.error('Error en POST /api/stores:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
