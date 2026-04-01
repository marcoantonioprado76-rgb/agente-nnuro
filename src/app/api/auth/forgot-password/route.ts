import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { sendPasswordRecoveryEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'El email es requerido' }, { status: 400 })
    }

    const service = await createServiceRoleClient()

    // Get user profile to personalize the email
    const { data: profile } = await service
      .from('profiles')
      .select('full_name, email')
      .eq('email', email)
      .single()

    // Generate password reset link via Supabase admin
    const { data, error } = await service.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`,
      },
    })

    if (error || !data?.properties?.action_link) {
      // Return success anyway to avoid email enumeration
      return NextResponse.json({ message: 'Si el correo existe, recibirás un enlace de recuperación.' })
    }

    // Send branded email via Resend
    await sendPasswordRecoveryEmail(
      email,
      profile?.full_name || 'Usuario',
      data.properties.action_link
    )

    return NextResponse.json({ message: 'Si el correo existe, recibirás un enlace de recuperación.' })
  } catch (error) {
    console.error('[ForgotPassword] Error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
