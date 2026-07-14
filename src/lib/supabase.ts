/**
 * Adaptador de almacenamiento: expone la MISMA interfaz que usaba el cliente de
 * Supabase Storage (`supabaseAdmin.storage.from(bucket).upload/getPublicUrl/remove/list/`
 * `createSignedUrl/createSignedUploadUrl`, `.createBucket`, `.listBuckets`) pero por
 * debajo usa AWS S3.
 *
 * Gracias a esto, los ~20 archivos que suben/borran/leen archivos NO necesitan cambios:
 * siguen importando `supabaseAdmin` y llamando los mismos métodos.
 *
 * Config por variables de entorno:
 *   AWS_REGION         (ej. us-east-1)
 *   S3_BUCKET_PREFIX   (ej. "mydymond-402561607468-")  -> bucket real = PREFIX + nombre lógico
 * Credenciales: cadena estándar de AWS (rol de instancia en EC2, o variables/perfil en local).
 */
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const REGION = process.env.AWS_REGION || 'us-east-1'
const PREFIX = process.env.S3_BUCKET_PREFIX || ''

const s3 = new S3Client({ region: REGION })

/** Nombres lógicos que usa la app -> se traducen a buckets reales con el prefijo. */
const KNOWN_BUCKETS = ['uploads', 'ad-creatives', 'course-videos', 'broadcast-images', 'social-media']

function realBucket(logical: string): string {
  return `${PREFIX}${logical}`
}

function buildPublicUrl(logical: string, path: string): string {
  const bucket = realBucket(logical)
  const key = path.split('/').map(encodeURIComponent).join('/')
  return `https://${bucket}.s3.${REGION}.amazonaws.com/${key}`
}

type StorageError = { message: string } | null

async function toBytes(
  body: Buffer | Uint8Array | ArrayBuffer | Blob | string
): Promise<Buffer | Uint8Array> {
  if (typeof body === 'string') return Buffer.from(body)
  if (body instanceof Uint8Array) return body // cubre también Buffer
  if (body instanceof ArrayBuffer) return Buffer.from(body)
  if (typeof Blob !== 'undefined' && body instanceof Blob) {
    return Buffer.from(await body.arrayBuffer())
  }
  return body as Uint8Array
}

class BucketApi {
  constructor(private logical: string) {}

  async upload(
    path: string,
    body: Buffer | Uint8Array | ArrayBuffer | Blob | string,
    opts?: { contentType?: string; upsert?: boolean; cacheControl?: string }
  ): Promise<{ data: { path: string } | null; error: StorageError }> {
    try {
      const Body = await toBytes(body)
      await s3.send(
        new PutObjectCommand({
          Bucket: realBucket(this.logical),
          Key: path,
          Body,
          ContentType: opts?.contentType,
          CacheControl: opts?.cacheControl,
        })
      )
      return { data: { path }, error: null }
    } catch (e: unknown) {
      return { data: null, error: { message: (e as Error)?.message || String(e) } }
    }
  }

  getPublicUrl(path: string): { data: { publicUrl: string } } {
    return { data: { publicUrl: buildPublicUrl(this.logical, path) } }
  }

  /**
   * URL firmada de LECTURA (GET) para archivos privados (ej. videos de cursos).
   * Equivalente a supabase `createSignedUrl(path, expiresIn)`.
   */
  async createSignedUrl(
    path: string,
    expiresIn: number
  ): Promise<{ data: { signedUrl: string } | null; error: StorageError }> {
    try {
      const url = await getSignedUrl(
        s3,
        new GetObjectCommand({ Bucket: realBucket(this.logical), Key: path }),
        { expiresIn }
      )
      return { data: { signedUrl: url }, error: null }
    } catch (e: unknown) {
      return { data: null, error: { message: (e as Error)?.message || String(e) } }
    }
  }

  /**
   * URL firmada de SUBIDA (PUT) para que el navegador suba directo a S3 sin pasar por
   * el server. Equivalente a supabase `createSignedUploadUrl(path)`. El cliente hace
   * un `PUT` plano con el archivo como body (ver admin/courses/page.tsx). NO firmamos
   * el Content-Type para que cualquier content-type que mande el navegador sea válido.
   */
  async createSignedUploadUrl(
    path: string,
    opts?: { expiresIn?: number }
  ): Promise<{ data: { signedUrl: string; path: string; token: string } | null; error: StorageError }> {
    try {
      const url = await getSignedUrl(
        s3,
        new PutObjectCommand({ Bucket: realBucket(this.logical), Key: path }),
        { expiresIn: opts?.expiresIn ?? 60 * 60 } // 1h para subir
      )
      // `token` se incluye por compatibilidad de forma con supabase; el cliente solo usa signedUrl+path.
      return { data: { signedUrl: url, path, token: '' }, error: null }
    } catch (e: unknown) {
      return { data: null, error: { message: (e as Error)?.message || String(e) } }
    }
  }

  async remove(paths: string[]): Promise<{ data: unknown; error: StorageError }> {
    if (!paths || paths.length === 0) return { data: [], error: null }
    try {
      for (let i = 0; i < paths.length; i += 1000) {
        const chunk = paths.slice(i, i + 1000)
        await s3.send(
          new DeleteObjectsCommand({
            Bucket: realBucket(this.logical),
            Delete: { Objects: chunk.map((Key) => ({ Key })), Quiet: true },
          })
        )
      }
      return { data: paths, error: null }
    } catch (e: unknown) {
      return { data: null, error: { message: (e as Error)?.message || String(e) } }
    }
  }

  /**
   * Lista los hijos INMEDIATOS de un prefijo, imitando el comportamiento de Supabase:
   * carpetas -> { name, id: null }, archivos -> { name, id: <key> }.
   * La app pagina con offset += 1000; S3 usa tokens, así que devolvemos todos los
   * hijos en la primera página (offset 0) y [] en las siguientes para cortar el bucle.
   */
  async list(
    prefix?: string,
    opts?: { limit?: number; offset?: number }
  ): Promise<{ data: Array<{ name: string; id: string | null }> | null; error: StorageError }> {
    if (opts?.offset && opts.offset > 0) return { data: [], error: null }
    try {
      const Prefix = prefix ? (prefix.endsWith('/') ? prefix : prefix + '/') : undefined
      const items: Array<{ name: string; id: string | null }> = []
      let ContinuationToken: string | undefined = undefined
      do {
        const res = await s3.send(
          new ListObjectsV2Command({
            Bucket: realBucket(this.logical),
            Prefix,
            Delimiter: '/',
            ContinuationToken,
          })
        )
        for (const cp of res.CommonPrefixes || []) {
          const p = cp.Prefix || ''
          const name = p.replace(/\/$/, '').split('/').pop() || ''
          if (name) items.push({ name, id: null }) // carpeta
        }
        for (const c of res.Contents || []) {
          const key = c.Key || ''
          if (Prefix && key === Prefix) continue // marcador de carpeta vacía
          const name = Prefix ? key.substring(Prefix.length) : key
          if (name) items.push({ name, id: key }) // archivo
        }
        ContinuationToken = res.IsTruncated ? res.NextContinuationToken : undefined
      } while (ContinuationToken)
      return { data: items, error: null }
    } catch (e: unknown) {
      return { data: null, error: { message: (e as Error)?.message || String(e) } }
    }
  }
}

class StorageApi {
  from(logical: string): BucketApi {
    return new BucketApi(logical)
  }

  /** Los buckets ya existen en AWS (creados una sola vez). No-op de compatibilidad. */
  async createBucket(
    logical: string,
    _opts?: { public?: boolean }
  ): Promise<{ data: { name: string } | null; error: StorageError }> {
    return { data: { name: logical }, error: null }
  }

  /** Devuelve los buckets conocidos para que los chequeos de "existe" pasen. */
  async listBuckets(): Promise<{ data: Array<{ name: string }>; error: StorageError }> {
    return { data: KNOWN_BUCKETS.map((name) => ({ name })), error: null }
  }
}

const storage = new StorageApi()

// Objetos compatibles con el antiguo cliente de Supabase (solo se usaba `.storage`).
export const supabaseAdmin = { storage }
export const supabase = { storage }

/** Borra un archivo del bucket 'uploads' a partir de su URL pública. */
export async function deleteUploadByUrl(url: string | null | undefined) {
  if (!url) return
  try {
    // URL nueva de S3: https://<bucket>.s3.<region>.amazonaws.com/<key>
    const host = `${realBucket('uploads')}.s3.${REGION}.amazonaws.com`
    let key: string | null = null
    try {
      const u = new URL(url)
      if (u.hostname === host) {
        key = decodeURIComponent(u.pathname.replace(/^\//, ''))
      }
    } catch {
      /* url no parseable como URL absoluta; se intenta el formato viejo abajo */
    }
    // Compatibilidad con URLs viejas de Supabase que puedan seguir en la BD.
    if (!key) {
      const marker = '/object/public/uploads/'
      const idx = url.indexOf(marker)
      if (idx === -1) return
      key = decodeURIComponent(url.slice(idx + marker.length))
    }
    if (key) await storage.from('uploads').remove([key])
  } catch (e) {
    console.error('[deleteUploadByUrl]', e)
  }
}

/**
 * Borra un archivo de S3 a partir de su URL pública, en CUALQUIER bucket de la app.
 * Ignora URLs que no sean de nuestro S3 (ej. YouTube, enlaces externos).
 * Úsese al reemplazar/eliminar archivos (videos de cursos, portadas, etc.) para no dejar huérfanos.
 */
export async function deleteFileByUrl(url: string | null | undefined) {
  if (!url) return
  try {
    const u = new URL(url)
    const bucketFull = u.hostname.split('.s3.')[0] // p.ej. mydymond-402561607468-uploads
    if (!PREFIX || !bucketFull.startsWith(PREFIX)) return // no es de nuestro S3 → ignorar
    const logical = bucketFull.slice(PREFIX.length)
    const key = decodeURIComponent(u.pathname.replace(/^\//, ''))
    if (logical && key) await storage.from(logical).remove([key])
  } catch (e) {
    console.error('[deleteFileByUrl]', e)
  }
}
