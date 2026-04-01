import { createBrowserClient } from '@supabase/ssr';

let client: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  if (!url || url === 'your_supabase_url') {
    // Return a dummy client during build/SSG
    return createBrowserClient(
      'https://placeholder.supabase.co',
      'placeholder-key'
    );
  }

  client = createBrowserClient(url, key);
  return client;
}
