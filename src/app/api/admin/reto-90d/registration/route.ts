export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { z } from 'zod'
import { getAdminUser, unauthorizedAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import { getActiveChallenge } from '@/lib/reto90d/challengeService'
import { handleRouteError } from '../_shared'

type Ch = { id: string; name: string; publicSlug: string | null; registrationOpen: boolean }

const DIACRITICS = /[̀-ͯ]/g
function slugify(name: string): string {
  const base = (name || 'reto')
    .toLowerCase()
    .normalize('NFD')
    .replace(DIACRITICS, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24) || 'reto'
  return `${base}-${crypto.randomBytes(3).toString('hex')}`
}

/** Asegura que el reto tenga un slug público (lo genera si falta). */
async function ensureSlug(ch: Ch): Promise<Ch> {
  if (ch.publicSlug) return ch
  for (let i = 0; i < 5; i++) {
    try {
      const updated = await prisma.challenge.update({
        where: { id: ch.id },
        data: { publicSlug: slugify(ch.name) },
        select: { id: true, name: true, publicSlug: true, registrationOpen: true },
      })
      return updated
    } catch {
      // colisión de unique (muy improbable) → reintenta
    }
  }
  throw new Error('No se pudo generar el link de registro')
}

export async function GET() {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  const ch = (await getActiveChallenge()) as Ch | null
  if (!ch) return NextResponse.json({ challenge: null })

  const withSlug = await ensureSlug(ch)
  return NextResponse.json({
    challenge: { id: withSlug.id, name: withSlug.name },
    slug: withSlug.publicSlug,
    open: withSlug.registrationOpen,
  })
}

const patchSchema = z.object({ open: z.boolean() })

export async function PATCH(req: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  const parsed = patchSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })

  const ch = (await getActiveChallenge()) as Ch | null
  if (!ch) return NextResponse.json({ error: 'No hay un reto activo' }, { status: 400 })

  try {
    const withSlug = await ensureSlug(ch)
    const updated = await prisma.challenge.update({
      where: { id: withSlug.id },
      data: { registrationOpen: parsed.data.open },
      select: { publicSlug: true, registrationOpen: true },
    })
    return NextResponse.json({ slug: updated.publicSlug, open: updated.registrationOpen })
  } catch (err) {
    return handleRouteError(err, 'registration PATCH')
  }
}
