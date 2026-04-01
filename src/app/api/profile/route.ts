import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (error || !profile) {
      return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })
    }

    return NextResponse.json(profile)
  } catch (error) {
    console.error('Error GET /api/profile:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { full_name, avatar_url, country, city, phone_number, current_password, new_password } = body

    // Update profile fields
    const updateData: Record<string, unknown> = {}
    if (full_name !== undefined) updateData.full_name = full_name
    if (avatar_url !== undefined) updateData.avatar_url = avatar_url
    if (country !== undefined) updateData.country = country
    if (city !== undefined) updateData.city = city
    if (phone_number !== undefined) updateData.phone_number = phone_number

    if (Object.keys(updateData).length > 0) {
      updateData.updated_at = new Date().toISOString()
      const { error: updateError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id)

      if (updateError) {
        console.error('Profile update error:', updateError)
        return NextResponse.json({ error: 'Error al actualizar perfil' }, { status: 500 })
      }
    }

    // Handle password change
    if (new_password && current_password) {
      // Verify current password by re-signing in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email!,
        password: current_password,
      })

      if (signInError) {
        return NextResponse.json({ error: 'La contraseña actual es incorrecta' }, { status: 400 })
      }

      const service = await createServiceRoleClient()
      const { error: pwError } = await service.auth.admin.updateUserById(user.id, {
        password: new_password,
      })

      if (pwError) {
        console.error('Password update error:', pwError)
        return NextResponse.json({ error: 'Error al cambiar contraseña' }, { status: 500 })
      }
    }

    // Return updated profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    return NextResponse.json(profile)
  } catch (error) {
    console.error('Error PUT /api/profile:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
