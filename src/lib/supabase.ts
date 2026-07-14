/**
 * Almacenamiento de archivos — Supabase Storage.
 *
 * `supabaseAdmin.storage.from(bucket).upload/getPublicUrl/remove/list/createSignedUrl/
 * createSignedUploadUrl` y `.createBucket/.listBuckets` son la API nativa del cliente
 * de Supabase, así que los ~20 archivos que suben/borran/leen archivos la usan tal cual.
 *
 * Config por variables de entorno:
 *   SUPABASE_URL (o NEXT_PUBLIC_SUPABASE_URL)
 *   SUPABASE_SERVICE_ROLE_KEY   — solo servidor; nunca exponer al navegador.
 */
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.warn(
    '[storage] Falta SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY — las subidas de archivos fallarán.'
  )
}

/** Buckets que usa la app. Se crean solos la primera vez (ver ensureBucket). */
const KNOWN_BUCKETS = ['uploads', 'ad-creatives', 'course-videos', 'broadcast-images', 'social-media']

export const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

export const supabase = supabaseAdmin

/** Borra un archivo del bucket 'uploads' a partir de su URL pública. */
export async function deleteUploadByUrl(url: string | null | undefined) {
  if (!url) return
  try {
    const key = keyFromUrl(url, 'uploads')
    if (key) await supabaseAdmin.storage.from('uploads').remove([key])
  } catch (e) {
    console.error('[deleteUploadByUrl]', e)
  }
}

/**
 * Borra un archivo a partir de su URL pública, en CUALQUIER bucket de la app.
 * Ignora URLs que no sean nuestras (ej. YouTube, enlaces externos).
 * Úsese al reemplazar/eliminar archivos (videos de cursos, portadas, etc.) para no
 * dejar huérfanos.
 */
export async function deleteFileByUrl(url: string | null | undefined) {
  if (!url) return
  try {
    const parsed = parseStorageUrl(url)
    if (!parsed) return
    await supabaseAdmin.storage.from(parsed.bucket).remove([parsed.key])
  } catch (e) {
    console.error('[deleteFileByUrl]', e)
  }
}

/**
 * Extrae bucket y ruta de una URL de Supabase Storage, en sus dos formas:
 *   .../storage/v1/object/public/<bucket>/<ruta>
 *   .../storage/v1/object/sign/<bucket>/<ruta>?token=...
 * Devuelve null si la URL no es de nuestro storage.
 */
function parseStorageUrl(url: string): { bucket: string; key: string } | null {
  const m = url.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+?)(?:\?|$)/)
  if (!m) return null
  return { bucket: decodeURIComponent(m[1]), key: decodeURIComponent(m[2]) }
}

/** Igual que parseStorageUrl pero exigiendo un bucket concreto. */
function keyFromUrl(url: string, bucket: string): string | null {
  const parsed = parseStorageUrl(url)
  return parsed && parsed.bucket === bucket ? parsed.key : null
}

/** Crea el bucket si no existe (público). Idempotente. */
export async function ensureBucket(name: string, isPublic = true) {
  const { data } = await supabaseAdmin.storage.listBuckets()
  if (data?.some(b => b.name === name)) return
  await supabaseAdmin.storage.createBucket(name, { public: isPublic })
}

export { KNOWN_BUCKETS }
