import { createBrowserClient } from '@supabase/ssr';

let client: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  // Durante build time de Next.js sin vars, devolver placeholder
  // (evita crashes durante la generación estática de páginas)
  if (!url || url === 'your_supabase_url') {
    if (typeof window !== 'undefined') {
      console.error('[Supabase] NEXT_PUBLIC_SUPABASE_URL no está definida en el navegador. Revisa las variables de entorno en Render y haz "Clear build cache & deploy".')
    }
    return createBrowserClient('https://placeholder.supabase.co', 'placeholder-key')
  }

  client = createBrowserClient(url, key);
  return client;
}
