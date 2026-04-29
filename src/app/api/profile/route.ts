import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase/server'
import bcrypt from 'bcryptjs'

export async function GET() {
  try {
    const session = await getServerSession()
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const service = await createServiceRoleClient()
    const { data, error } = await service.from('profiles').select('id,email,full_name,avatar_url,role,tenant_id,country,city,phone_number,country_code,phone_with_code,status,is_active,ai_credits_usd,created_at,updated_at').eq('id', session.sub).single()
    if (error || !data) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const body = await request.json()
    const { full_name, avatar_url, country, city, phone_number, current_password, new_password } = body
    const service = await createServiceRoleClient()

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (full_name !== undefined) updateData.full_name = full_name
    if (avatar_url !== undefined) updateData.avatar_url = avatar_url
    if (country !== undefined) updateData.country = country
    if (city !== undefined) updateData.city = city
    if (phone_number !== undefined) updateData.phone_number = phone_number

    if (new_password && current_password) {
      const { data: profile } = await service.from('profiles').select('password_hash').eq('id', session.sub).single()
      const valid = profile?.password_hash ? await bcrypt.compare(current_password, profile.password_hash) : false
      if (!valid) return NextResponse.json({ error: 'La contraseña actual es incorrecta' }, { status: 400 })
      updateData.password_hash = await bcrypt.hash(new_password, 12)
    }

    await service.from('profiles').update(updateData).eq('id', session.sub)
    const { data } = await service.from('profiles').select('*').eq('id', session.sub).single()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export const PATCH = PUT
