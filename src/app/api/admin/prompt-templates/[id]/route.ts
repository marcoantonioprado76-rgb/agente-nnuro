import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'

async function isAdmin(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  return profile?.role === 'admin'
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createServerSupabaseClient()
    if (!(await isAdmin(supabase))) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const body = await request.json()
    const service = await createServiceRoleClient()
    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }
    for (const field of ['name', 'description', 'system_prompt', 'category', 'is_active', 'sort_order']) {
      if (body[field] !== undefined) updateData[field] = body[field]
    }
    const { data, error } = await service.from('prompt_templates').update(updateData).eq('id', id).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createServerSupabaseClient()
    if (!(await isAdmin(supabase))) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const service = await createServiceRoleClient()
    await service.from('prompt_templates').delete().eq('id', id)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
