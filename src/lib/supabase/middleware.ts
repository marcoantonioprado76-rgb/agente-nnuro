import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl || supabaseUrl === 'your_supabase_url') {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // Paginas publicas que no necesitan auth ni suscripcion
  const isPublicPage =
    pathname === '/' ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/forgot-password') ||
    pathname.startsWith('/reset-password') ||
    pathname.startsWith('/pricing') ||
    pathname.startsWith('/pending-approval') ||
    pathname.startsWith('/account-suspended') ||
    pathname.startsWith('/account-blocked') ||
    pathname.startsWith('/billing/') ||
    pathname.startsWith('/tienda/')

  const isAdminRoute = pathname.startsWith('/admin')
  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/register')

  // No autenticado -> redirigir a login (excepto paginas publicas)
  if (!user && !isPublicPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Si el usuario esta autenticado, verificar status
  if (user && !isAuthPage && !isPublicPage) {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, status')
      .eq('id', user.id)
      .single()

    // Si no se puede consultar el perfil, redirigir a login por seguridad
    if (profileError || !profile) {
      console.error('[Middleware] Error consultando perfil:', profileError?.message)
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('error', 'profile_error')
      return NextResponse.redirect(url)
    }

    // Bloqueado -> cerrar sesion y redirigir
    if (profile?.status === 'blocked') {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('error', 'blocked')
      return NextResponse.redirect(url)
    }

    // Suspendido -> cerrar sesion y redirigir
    if (profile?.status === 'suspended') {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('error', 'suspended')
      return NextResponse.redirect(url)
    }

    // Admin en rutas de usuario -> redirigir al admin dashboard
    const isUserDashboard = pathname.startsWith('/dashboard') ||
      pathname === '/bots' || pathname === '/products' || pathname === '/leads' ||
      pathname === '/conversations' || pathname === '/settings' || pathname === '/subscription' ||
      pathname === '/users' || pathname.startsWith('/stores') || pathname === '/sales' ||
      pathname === '/profile'

    if (profile?.role === 'admin' && isUserDashboard && !isAdminRoute) {
      const url = request.nextUrl.clone()
      url.pathname = '/admin/dashboard'
      return NextResponse.redirect(url)
    }

    // Proteger rutas admin: solo admins pueden acceder
    if (isAdminRoute && profile?.role !== 'admin') {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
  }

  // Autenticado en pagina de auth -> redirigir segun rol
  if (user && isAuthPage) {
    const { data: profile, error: profileError2 } = await supabase
      .from('profiles')
      .select('role, status')
      .eq('id', user.id)
      .single()

    if (profileError2 || !profile) {
      return supabaseResponse
    }

    // Si esta bloqueado/suspendido, dejarlo en login
    if (profile?.status === 'blocked' || profile?.status === 'suspended') {
      return supabaseResponse
    }

    if (profile?.role === 'admin') {
      const url = request.nextUrl.clone()
      url.pathname = '/admin/dashboard'
      return NextResponse.redirect(url)
    }

    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
