import { createBrowserClient } from '@supabase/ssr';

let client: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  // Detección de entorno server-side durante build (SSG)
  const isServer = typeof window === 'undefined'
  const isBuildPhase = isServer && (process.env.NEXT_PHASE === 'phase-production-build')

  // Durante el build estático de Next.js, devolver cliente placeholder
  // (las páginas se renderizan como HTML y no ejecutan código de auth)
  if (isBuildPhase && (!url || url === 'your_supabase_url')) {
    return createBrowserClient('https://placeholder.supabase.co', 'placeholder-key')
  }

  // En runtime (navegador o server), fallar con error claro si faltan variables.
  // Esto evita el bug silencioso donde el navegador hace fetch a placeholder.supabase.co
  // y se queda cargando 60+ segundos hasta timeout DNS.
  if (!url || url === 'your_supabase_url') {
    const msg = '[Supabase] FALTA NEXT_PUBLIC_SUPABASE_URL. En Render, asegúrate de pasar esta variable como BUILD ARG del Dockerfile (Environment → Advanced → add to build). Las variables NEXT_PUBLIC_* se inyectan en build time, no en runtime.'
    console.error(msg)
    if (!isServer) {
      // En el navegador, mostrar alerta para que el usuario vea el error
      alert('Error de configuración: ' + msg)
    }
    throw new Error(msg)
  }

  if (!key) {
    const msg = '[Supabase] FALTA NEXT_PUBLIC_SUPABASE_ANON_KEY. Configurar en Render como build arg.'
    console.error(msg)
    if (!isServer) alert('Error de configuración: ' + msg)
    throw new Error(msg)
  }

  client = createBrowserClient(url, key);
  return client;
}
