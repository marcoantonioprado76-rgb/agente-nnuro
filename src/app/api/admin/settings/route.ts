import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// Defaults en caso de que la tabla no tenga el registro
const DEFAULTS: Record<string, unknown> = {
  payment_methods: { stripe: true, transfer: true },
}

async function verifyAdmin() {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return null
  return user
}

// GET /api/admin/settings — retorna todos los settings
export async function GET() {
  try {
    const user = await verifyAdmin()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const service = await createServiceRoleClient()
    const { data, error } = await service.from('system_settings').select('key, value')

    if (error) {
      // Tabla no existe aún — retornar defaults
      return NextResponse.json(DEFAULTS)
    }

    const settings: Record<string, unknown> = { ...DEFAULTS }
    for (const row of data || []) {
      settings[row.key] = row.value
    }

    return NextResponse.json(settings)
  } catch {
    return NextResponse.json(DEFAULTS)
  }
}

// PUT /api/admin/settings — actualiza un setting específico
export async function PUT(request: NextRequest) {
  try {
    const user = await verifyAdmin()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const body = await request.json()
    const { key, value } = body

    if (!key) return NextResponse.json({ error: 'key es requerido' }, { status: 400 })

    const service = await createServiceRoleClient()
    const { error } = await service.from('system_settings').upsert({
      key,
      value,
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    }, { onConflict: 'key' })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
