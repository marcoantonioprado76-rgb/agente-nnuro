/**
 * Supabase service-role client — used ONLY on the server for DB queries.
 * Auth is handled separately via JWT (lib/auth.ts).
 */
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const db = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});
