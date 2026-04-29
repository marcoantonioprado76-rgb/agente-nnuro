import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';

const PUBLIC_PATHS = [
  '/login',
  '/register',
  '/forgot-password',
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
    pathname.match(/\.(ico|png|jpg|jpeg|svg|webp|woff2?|css|js)$/)
  ) {
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
