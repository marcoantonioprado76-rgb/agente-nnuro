import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/audit'
import { createUserNotification } from '@/lib/notifications'
import { sendWelcomeEmail } from '@/lib/email'
import crypto from 'crypto'

function hashTransactionPassword(password: string): string {
  return crypto.createHash('sha256').update(password + 'ventas_ai_salt_2026').digest('hex')
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      email,
      password,
      full_name,
      country,
      city,
      country_code,
      phone_number,
      transaction_password,
    } = body

    if (!email || !password || !full_name) {
      return NextResponse.json(
        { error: 'Email, contraseña y nombre son requeridos' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 6 caracteres' },
        { status: 400 }
      )
    }

    if (transaction_password && transaction_password.length < 4) {
      return NextResponse.json(
        { error: 'La contraseña de transaccion debe tener al menos 4 caracteres' },
        { status: 400 }
      )
    }

    const service = await createServiceRoleClient()

    // Create user with email auto-confirmed
    const { data: newUser, error: createError } = await service.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
    })

    if (createError) {
      if (createError.message.includes('already') || createError.message.includes('existe')) {
        return NextResponse.json(
          { error: 'Ya existe una cuenta con este correo electronico' },
          { status: 409 }
        )
      }
      return NextResponse.json(
        { error: createError.message },
        { status: 500 }
      )
    }

    // Wait for trigger to create profile
    if (newUser.user) {
      await new Promise(r => setTimeout(r, 500))

      // Update profile with additional fields (non-blocking - columns may not exist yet)
      try {
        const profileUpdate: Record<string, unknown> = {}
        if (country) profileUpdate.country = country
        if (city) profileUpdate.city = city
        if (phone_number) profileUpdate.phone_number = phone_number
        if (country_code) profileUpdate.country_code = country_code
        if (phone_number && country_code) {
          profileUpdate.phone_with_code = `${country_code}${phone_number}`
        }
        if (transaction_password) {
          profileUpdate.transaction_password_hash = hashTransactionPassword(transaction_password)
        }
        profileUpdate.login_provider = 'email'
        profileUpdate.status = 'active'

        if (Object.keys(profileUpdate).length > 0) {
          await service
            .from('profiles')
            .update(profileUpdate)
            .eq('id', newUser.user.id)
        }
      } catch { /* columns may not exist if migration 004 not run */ }

      // Audit and notifications (non-blocking)
      try {
        const { data: profile } = await service
          .from('profiles')
          .select('tenant_id')
          .eq('id', newUser.user.id)
          .single()

        await logAudit({
          userId: newUser.user.id,
          tenantId: profile?.tenant_id || undefined,
          action: 'usuario_registrado',
          entityType: 'usuario',
          entityId: newUser.user.id,
          details: { email, full_name, country, login_provider: 'email' },
        })
      } catch { /* ignore */ }

      try {
        await service.from('admin_notifications').insert({
          type: 'new_user',
          title: 'Nuevo usuario registrado',
          message: `${full_name} (${email}) se registro desde ${country || ''}`,
          target_user_id: newUser.user.id,
          related_entity_type: 'user',
          related_entity_id: newUser.user.id,
        })
      } catch { /* table may not exist */ }

      // Welcome notification for new user
      createUserNotification({
        userId: newUser.user.id,
        type: 'cuenta_actualizada',
        title: 'Bienvenido a Agente de Ventas',
        message: 'Tu cuenta ha sido creada exitosamente. Configura tu primer bot para empezar a vender con IA.',
        link: '/dashboard',
      }).catch(() => {})

      // Welcome email
      sendWelcomeEmail(email, full_name).catch(() => {})
    }

    return NextResponse.json(
      { message: 'Cuenta creada exitosamente', userId: newUser.user.id },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error en POST /api/auth/register:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
