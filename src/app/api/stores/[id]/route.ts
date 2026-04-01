import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'

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

async function verifyStoreOwner(userId: string, storeId: string) {
  const service = await createServiceRoleClient()
  const { data } = await service.from('stores').select('id').eq('id', storeId).eq('user_id', userId).single()
  return !!data
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const service = await createServiceRoleClient()
    const { data: store, error } = await service
      .from('stores')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error || !store) {
      return NextResponse.json({ error: 'Tienda no encontrada' }, { status: 404 })
    }

    return NextResponse.json(store)
  } catch (error) {
    console.error('Error en GET /api/stores/[id]:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    if (!(await verifyStoreOwner(user.id, id))) {
      return NextResponse.json({ error: 'No tienes acceso a esta tienda' }, { status: 403 })
    }

    const body = await request.json()
    const service = await createServiceRoleClient()

    if (body.slug) {
      const slugClean = body.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
      const { data: existing } = await service
        .from('stores')
        .select('id')
        .eq('slug', slugClean)
        .neq('id', id)
        .single()
      if (existing) {
        return NextResponse.json({ error: 'Este slug ya está en uso' }, { status: 409 })
      }
      body.slug = slugClean
    }

    // Sync flat visual columns from font_config/bg_config
    const visual = extractVisualFields(body.font_config || null, body.bg_config || null)
    Object.assign(body, visual)

    body.updated_at = new Date().toISOString()

    const { data: store, error } = await service
      .from('stores')
      .update(body)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating store:', error)
      return NextResponse.json({ error: 'Error al actualizar la tienda' }, { status: 500 })
    }

    return NextResponse.json(store)
  } catch (error) {
    console.error('Error en PUT /api/stores/[id]:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    if (!(await verifyStoreOwner(user.id, id))) {
      return NextResponse.json({ error: 'No tienes acceso a esta tienda' }, { status: 403 })
    }

    const service = await createServiceRoleClient()
    const { error } = await service.from('stores').delete().eq('id', id)

    if (error) {
      console.error('Error deleting store:', error)
      return NextResponse.json({ error: 'Error al eliminar la tienda' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Tienda eliminada' })
  } catch (error) {
    console.error('Error en DELETE /api/stores/[id]:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
