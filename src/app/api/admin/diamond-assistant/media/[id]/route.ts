/**
 * Diamond Assistant — API: /media/[id] (FASE 2 — Biblioteca de contenidos)
 *
 * PATCH  -> actualiza title / tags / textContent / linkUrl de un recurso.
 * DELETE -> elimina el recurso (y su archivo en storage si aplica).
 *
 * Inexistente -> 404. try/catch genérico: NO se filtra `err.message` al cliente.
 */
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { getAdminUser, unauthorizedAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import { deleteFileByUrl } from '@/lib/supabase'

/** No filtra `err.message`; P2025 -> 404, resto -> 500 genérico. */
function fail(err: unknown, tag: string): NextResponse {
  console.error(`[${tag}]`, err)
  const code = (err as { code?: unknown })?.code
  if (code === 'P2025') {
    return NextResponse.json({ error: 'Registro no encontrado.' }, { status: 404 })
  }
  return NextResponse.json({ error: 'Ocurrió un error al procesar la solicitud.' }, { status: 500 })
}

function isHttpUrl(v: string): boolean {
  try {
    const u = new URL(v)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

const patchSchema = z.object({
  title: z.string().trim().min(1, 'El título no puede estar vacío.').optional(),
  caption: z.string().trim().optional(),
  tags: z.array(z.string()).optional(),
  textContent: z.string().optional(),
  linkUrl: z
    .string()
    .refine(isHttpUrl, 'El enlace debe empezar con http:// o https://')
    .optional(),
})

// ── PATCH: actualizar campos editables ─────────────────────────────
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  const body = await req.json().catch(() => null)
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos inválidos', details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const existing = await prisma.mediaAsset.findUnique({
    where: { id: params.id },
    select: { id: true },
  })
  if (!existing) {
    return NextResponse.json({ error: 'Contenido no encontrado.' }, { status: 404 })
  }

  // Solo se aplican los campos presentes en el cuerpo.
  const data: Prisma.MediaAssetUpdateInput = {}
  if (parsed.data.title !== undefined) data.title = parsed.data.title
  if (parsed.data.caption !== undefined) data.caption = parsed.data.caption || null
  if (parsed.data.tags !== undefined) data.tags = parsed.data.tags as Prisma.InputJsonValue
  if (parsed.data.textContent !== undefined) data.textContent = parsed.data.textContent
  if (parsed.data.linkUrl !== undefined) data.linkUrl = parsed.data.linkUrl

  try {
    const asset = await prisma.mediaAsset.update({ where: { id: params.id }, data })
    return NextResponse.json({ ok: true, data: asset })
  } catch (err) {
    return fail(err, 'media/[id] PATCH')
  }
}

// ── DELETE: eliminar recurso (+ archivo en storage) ────────────────
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  const existing = await prisma.mediaAsset.findUnique({
    where: { id: params.id },
    select: { id: true, url: true },
  })
  if (!existing) {
    return NextResponse.json({ error: 'Contenido no encontrado.' }, { status: 404 })
  }

  try {
    // Best-effort: borra el archivo de S3 si el recurso tenía uno.
    // `deleteFileByUrl` maneja sus propios errores y nunca lanza.
    if (existing.url) await deleteFileByUrl(existing.url)

    await prisma.mediaAsset.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return fail(err, 'media/[id] DELETE')
  }
}
