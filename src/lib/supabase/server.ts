import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const url  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const svcKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

/** Cookie-based Supabase client for server components / route handlers (user auth context). */
export async function createServerSupabaseClient() {
  const cookieStore = await cookies()
  return createServerClient(url, anon, {
    cookies: {
      getAll()  { return cookieStore.getAll() },
      setAll(cs) {
        try { cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) }
        catch { /* read-only context */ }
      },
    },
  })
}

/** Service-role Supabase client — bypasses RLS, server-only. */
export async function createServiceRoleClient() {
  return createClient(url, svcKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export { getServerSession } from '@/lib/auth'
