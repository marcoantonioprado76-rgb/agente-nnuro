import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'

async function isAdmin(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  return profile?.role === 'admin'
}

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    if (!(await isAdmin(supabase))) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const service = await createServiceRoleClient()
    const { data } = await service.from('prompt_templates').select('*').order('sort_order')
    return NextResponse.json(data || [])
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    if (!(await isAdmin(supabase))) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const body = await request.json()
    const { name, description, system_prompt, category, is_active, sort_order } = body
    if (!name || !system_prompt) return NextResponse.json({ error: 'Nombre y prompt son requeridos' }, { status: 400 })
    const service = await createServiceRoleClient()
    const { data, error } = await service.from('prompt_templates').insert({
      name, description: description || '', system_prompt, category: category || 'general',
      is_active: is_active ?? true, sort_order: sort_order || 1,
    }).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
