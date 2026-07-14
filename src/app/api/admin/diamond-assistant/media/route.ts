/**
 * Diamond Assistant — API: /media (FASE 2 — Biblioteca de contenidos)
 *
 * GET  -> lista de recursos multimedia (filtro opcional por `type`, orden reciente primero).
 * POST -> crea un recurso. Acepta:
 *          - multipart/form-data (archivo IMAGE|VIDEO|AUDIO|PDF) -> sube a storage y guarda url.
 *          - JSON con type=LINK  -> guarda linkUrl (http/https).
 *          - JSON con type=TEXT  -> guarda textContent.
 *
 * Subida de archivos: se reutiliza el MISMO mecanismo que el resto de la app
 * (`supabaseAdmin.storage.from('uploads').upload(...)` del shim `@/lib/supabase`,
 * que por debajo escribe en AWS S3) tal como lo hacen reto-90d/upload y courses.
 */
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { DiamondMediaType, Prisma } from '@prisma/client'
import { getAdminUser, unauthorizedAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import { supabaseAdmin } from '@/lib/supabase'

// ── Constantes de dominio ──────────────────────────────────────────
const BUCKET = 'uploads'

/** Tipos que consisten en un archivo subido a storage. */
const FILE_TYPES: DiamondMediaType[] = [
  DiamondMediaType.IMAGE,
  DiamondMediaType.VIDEO,
  DiamondMediaType.AUDIO,
  DiamondMediaType.PDF,
]

/**
 * Límite de tamaño por tipo (bytes).
 * IMPORTANTE: son los límites de ENTREGA de WhatsApp (API oficial / YCloud). Un
 * archivo más grande SÍ se sube, pero WhatsApp lo DESCARTA en silencio al enviarlo
 * (YCloud responde 200 pero el contacto nunca lo recibe). Por eso lo rechazamos
 * acá con un mensaje claro, en vez de fallar sin aviso.
 * Ref: WhatsApp Cloud API media — imagen 5MB, video 16MB, audio 16MB, documento 100MB.
 */
const MAX_BYTES: Record<string, number> = {
  IMAGE: 5 * 1024 * 1024,   // 5 MB  (límite de WhatsApp)
  AUDIO: 16 * 1024 * 1024,  // 16 MB (límite de WhatsApp)
  PDF: 100 * 1024 * 1024,   // 100 MB (documento, límite de WhatsApp)
  VIDEO: 16 * 1024 * 1024,  // 16 MB (límite de WhatsApp)
}

/** Etiqueta legible por tipo (para los mensajes de error). */
const TYPE_LABEL: Record<string, string> = {
  IMAGE: 'La imagen',
  VIDEO: 'El video',
  AUDIO: 'El audio',
  PDF: 'El PDF',
}

/** MIME -> extensión de archivo para nombrar el objeto en storage. */
const EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
  'audio/mpeg': 'mp3',
  'audio/mp4': 'm4a',
  'audio/ogg': 'ogg',
  'audio/wav': 'wav',
  'audio/webm': 'weba',
  'application/pdf': 'pdf',
}

// ── Helpers ────────────────────────────────────────────────────────
const badRequest = (msg: string) => NextResponse.json({ error: msg }, { status: 400 })

/** No filtra `err.message` al cliente; P2025 -> 404, resto -> 500 genérico. */
function fail(err: unknown, tag: string): NextResponse {
  console.error(`[${tag}]`, err)
  const code = (err as { code?: unknown })?.code
  if (code === 'P2025') {
    return NextResponse.json({ error: 'Registro no encontrado.' }, { status: 404 })
  }
  return NextResponse.json({ error: 'Ocurrió un error al procesar la solicitud.' }, { status: 500 })
}

function isMediaType(v: string): v is DiamondMediaType {
  return (Object.values(DiamondMediaType) as string[]).includes(v)
}

function isHttpUrl(v: string): boolean {
  try {
    const u = new URL(v)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

function mimeMatchesType(type: DiamondMediaType, mime: string): boolean {
  if (type === DiamondMediaType.IMAGE) return mime.startsWith('image/')
  if (type === DiamondMediaType.VIDEO) return mime.startsWith('video/')
  if (type === DiamondMediaType.AUDIO) return mime.startsWith('audio/')
  if (type === DiamondMediaType.PDF) return mime === 'application/pdf'
  return false
}

/** Normaliza `tags` desde array, JSON-string o lista separada por comas. */
function parseTags(raw: unknown): string[] {
  const clean = (arr: unknown[]) =>
    arr.map((t) => String(t).trim()).filter(Boolean).slice(0, 30)
  if (Array.isArray(raw)) return clean(raw)
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return clean(parsed)
    } catch {
      /* no era JSON: se trata como lista separada por comas */
    }
    return clean(raw.split(','))
  }
  return []
}

// ── GET: listar (filtro opcional por type) ─────────────────────────
export async function GET(req: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  try {
    const typeParam = req.nextUrl.searchParams.get('type')
    const where: Prisma.MediaAssetWhereInput =
      typeParam && isMediaType(typeParam) ? { type: typeParam } : {}

    const data = await prisma.mediaAsset.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ ok: true, data })
  } catch (err) {
    return fail(err, 'media GET')
  }
}

// ── POST: crear (multipart archivo | JSON link/texto) ──────────────
export async function POST(req: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  const contentType = req.headers.get('content-type') || ''

  try {
    if (contentType.includes('multipart/form-data')) {
      return await createFromMultipart(req, admin.id)
    }
    return await createFromJson(req, admin.id)
  } catch (err) {
    return fail(err, 'media POST')
  }
}

// ── Multipart: archivo (IMAGE/VIDEO/AUDIO/PDF) o también LINK/TEXT ──
async function createFromMultipart(req: NextRequest, createdBy: string) {
  const form = await req.formData()

  const typeRaw = String(form.get('type') || '').trim()
  if (!isMediaType(typeRaw)) return badRequest('Tipo de contenido inválido.')
  const type = typeRaw

  const title = String(form.get('title') || '').trim()
  if (!title) return badRequest('El título es obligatorio.')

  const tags = parseTags(form.get('tags'))
  const caption = String(form.get('caption') || '').trim() || null

  // Caso archivo → subir a storage.
  if (FILE_TYPES.includes(type)) {
    const file = form.get('file')
    if (!(file instanceof File)) return badRequest('Debes adjuntar un archivo.')
    if (!mimeMatchesType(type, file.type)) {
      return badRequest(`El archivo no corresponde al tipo ${type}.`)
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const max = MAX_BYTES[type] ?? 30 * 1024 * 1024
    if (buffer.byteLength > max) {
      const mb = Math.round(max / 1024 / 1024)
      const got = (buffer.byteLength / 1024 / 1024).toFixed(1)
      const label = TYPE_LABEL[type] ?? 'El archivo'
      return badRequest(
        `${label} pesa ${got}MB y supera el límite de ${mb}MB de WhatsApp. ` +
          'WhatsApp no entrega archivos más grandes (aunque parezca que se subió, no le llega a la persona). ' +
          'Reducilo o comprimilo y volvé a subirlo.',
      )
    }

    const ext =
      EXT[file.type] ||
      (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 5) ||
      'bin'
    const path = `diamond/media/${type.toLowerCase()}/${randomUUID()}.${ext}`

    const { error } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(path, buffer, {
        contentType: file.type || 'application/octet-stream',
        cacheControl: '31536000',
        upsert: false,
      })
    if (error) {
      // No filtramos el detalle interno del proveedor de almacenamiento.
      console.error('[media POST] storage error:', error)
      return NextResponse.json({ error: 'No se pudo subir el archivo.' }, { status: 500 })
    }

    const { data } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path)
    const asset = await prisma.mediaAsset.create({
      data: {
        type,
        title,
        caption,
        tags: tags as Prisma.InputJsonValue,
        createdBy,
        url: data.publicUrl,
        mimeType: file.type || null,
        sizeBytes: buffer.byteLength,
      },
    })
    return NextResponse.json({ ok: true, data: asset }, { status: 201 })
  }

  // LINK/TEXT también aceptados por multipart (robustez).
  if (type === DiamondMediaType.LINK) {
    const linkUrl = String(form.get('linkUrl') || '').trim()
    if (!isHttpUrl(linkUrl)) return badRequest('El enlace debe empezar con http:// o https://')
    const asset = await prisma.mediaAsset.create({
      data: { type, title, tags: tags as Prisma.InputJsonValue, createdBy, linkUrl },
    })
    return NextResponse.json({ ok: true, data: asset }, { status: 201 })
  }

  const textContent = String(form.get('textContent') || '').trim()
  if (!textContent) return badRequest('El texto no puede estar vacío.')
  const asset = await prisma.mediaAsset.create({
    data: { type, title, tags: tags as Prisma.InputJsonValue, createdBy, textContent },
  })
  return NextResponse.json({ ok: true, data: asset }, { status: 201 })
}

// ── JSON: LINK o TEXT ──────────────────────────────────────────────
async function createFromJson(req: NextRequest, createdBy: string) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
  if (!body || typeof body !== 'object') return badRequest('Cuerpo de la solicitud inválido.')

  const typeRaw = String(body.type || '').trim()
  if (!isMediaType(typeRaw)) return badRequest('Tipo de contenido inválido.')
  const type = typeRaw

  if (FILE_TYPES.includes(type)) {
    return badRequest('Este tipo requiere subir un archivo (multipart/form-data).')
  }

  const title = String(body.title || '').trim()
  if (!title) return badRequest('El título es obligatorio.')

  const tags = parseTags(body.tags)

  if (type === DiamondMediaType.LINK) {
    const linkUrl = String(body.linkUrl || '').trim()
    if (!isHttpUrl(linkUrl)) return badRequest('El enlace debe empezar con http:// o https://')
    const asset = await prisma.mediaAsset.create({
      data: { type, title, tags: tags as Prisma.InputJsonValue, createdBy, linkUrl },
    })
    return NextResponse.json({ ok: true, data: asset }, { status: 201 })
  }

  // TEXT
  const textContent = String(body.textContent || '').trim()
  if (!textContent) return badRequest('El texto no puede estar vacío.')
  const asset = await prisma.mediaAsset.create({
    data: { type, title, tags: tags as Prisma.InputJsonValue, createdBy, textContent },
  })
  return NextResponse.json({ ok: true, data: asset }, { status: 201 })
}
