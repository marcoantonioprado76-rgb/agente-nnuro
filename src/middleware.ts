import { updateSession } from '@/lib/supabase/middleware';
import { type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|icon\\.png|apple-icon\\.png|opengraph-image\\.png|twitter-image\\.png|og-image\\.png|manifest\\.json|sw\\.js|images|api/auth|api/og-image|api/whatsapp/webhook|api/whatsapp/diagnose|api/stripe/webhook|api/stores/public|api/cron).*)',
  ],
};
