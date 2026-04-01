import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // Server Component - can't set cookies
            }
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Get user profile to determine redirect
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        // Update login_provider to google
        await supabase
          .from('profiles')
          .update({ login_provider: 'google' })
          .eq('id', user.id)

        // Check role and status
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, status')
          .eq('id', user.id)
          .single()

        if (profile?.status === 'blocked') {
          await supabase.auth.signOut()
          return NextResponse.redirect(`${origin}/login?error=blocked`)
        }

        if (profile?.status === 'suspended') {
          await supabase.auth.signOut()
          return NextResponse.redirect(`${origin}/login?error=suspended`)
        }

        if (profile?.role === 'admin') {
          return NextResponse.redirect(`${origin}/admin/dashboard`)
        }
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Auth error - redirect to login with error
  return NextResponse.redirect(`${origin}/login?error=auth`)
}
