import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';

const PUBLIC_PATHS = [
  '/',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/pending-approval',
  '/pricing',
  '/tienda',
];

const PUBLIC_API = [
  '/api/auth',
  '/api/stripe/webhook',
  '/api/stores/public',
  '/api/cron',
  '/api/og-image',
];

function isPublic(pathname: string): boolean {
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) return true;
  if (PUBLIC_API.some((p) => pathname.startsWith(p))) return true;
  return false;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow static assets
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/images') ||
    pathname.startsWith('/landing-nuro') ||
    pathname.match(/\.(ico|png|jpg|jpeg|svg|webp|gif|woff2?|css|js|html|mp4|mp3|webm|gltf|glb|json|map)$/)
  ) {
    return NextResponse.next();
  }

  // La landing "/" siempre se muestra (sin chequear sesión)
  if (pathname === '/') {
    return NextResponse.next();
  }

  // /login y /register: si ya hay sesión, redirigir al dashboard (UX estándar)
  if (pathname === '/login' || pathname === '/register') {
    const session = await getSessionFromRequest(request);
    if (session) {
      const dest = session.role === 'admin' ? '/admin/dashboard' : '/dashboard';
      return NextResponse.redirect(new URL(dest, request.url));
    }
    return NextResponse.next();
  }

  if (isPublic(pathname)) return NextResponse.next();

  const session = await getSessionFromRequest(request);

  if (!session) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Admin guard
  if (pathname.startsWith('/admin') && session.role !== 'admin') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico).*)'],
};
