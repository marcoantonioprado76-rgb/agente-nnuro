/**
 * Diamond Assistant — API: /contacts/[id] (FASE 1 · CRM funcional)
 *   PATCH  -> actualiza solo los campos presentes en el body
 *   DELETE -> elimina el contacto
 *
 * Scope: por ahora global → organizationId = null.
 */
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser, unauthorizedAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import { Prisma, DiamondContactStatus } from '@prisma/client'

const VALID_STATUS = new Set<string>(Object.values(DiamondContactStatus))

/** Normaliza un opcional de texto: recorta y convierte vacío → null. */
function optText(v: unknown): string | null {
  if (v === null || v === undefined) return null
  const s = String(v).trim()
  return s === '' ? null : s
}

function serialize(c: {
  id: string
  name: string | null
  phone: string
  country: string | null
  city: string | null
  sponsor: string | null
  tag: string | null
  status: DiamondContactStatus
  optIn: boolean
  optInAt: Date | null
  joinedAt: Date
  lastInteractionAt: Date | null
  notes: string | null
  createdAt: Date
  updatedAt: Date
}) {
  return {
    id: c.id,
    name: c.name,
    phone: c.phone,
    country: c.country,
    city: c.city,
    sponsor: c.sponsor,
    tag: c.tag,
    status: c.status,
    optIn: c.optIn,
    optInAt: c.optInAt,
    joinedAt: c.joinedAt,
    lastInteractionAt: c.lastInteractionAt,
    notes: c.notes,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Solicitud inválida.' }, { status: 400 })
  }

  try {
    const current = await prisma.contact.findUnique({ where: { id: params.id } })
    if (!current) {
      return NextResponse.json({ error: 'Contacto no encontrado.' }, { status: 404 })
    }

    const data: Prisma.ContactUpdateInput = {}

    // Teléfono (obligatorio): si viene, no puede quedar vacío.
    if ('phone' in body) {
      const phone = optText(body.phone)
      if (!phone) {
        return NextResponse.json({ error: 'El celular es obligatorio.' }, { status: 400 })
      }
      if (phone !== current.phone) {
        // Evitar duplicado en el scope global (unique organizationId+phone).
        const dup = await prisma.contact.findFirst({
          where: { organizationId: null, phone, NOT: { id: params.id } },
          select: { id: true },
        })
        if (dup) {
          return NextResponse.json({ error: 'Ese contacto ya existe' }, { status: 409 })
        }
      }
      data.phone = phone
    }

    // Opcionales de texto: presentes → recorta, vacío → null.
    if ('name' in body) data.name = optText(body.name)
    if ('country' in body) data.country = optText(body.country)
    if ('city' in body) data.city = optText(body.city)
    if ('sponsor' in body) data.sponsor = optText(body.sponsor)
    if ('tag' in body) data.tag = optText(body.tag)
    if ('notes' in body) data.notes = optText(body.notes)

    // Estado (enum).
    if ('status' in body) {
      const s = String(body.status)
      if (!VALID_STATUS.has(s)) {
        return NextResponse.json({ error: 'Estado no válido.' }, { status: 400 })
      }
      data.status = s as DiamondContactStatus
    }

    // Opt-in: al cambiar a true sella la fecha; a false la limpia; mantiene si ya estaba.
    if ('optIn' in body) {
      const optIn = Boolean(body.optIn)
      data.optIn = optIn
      if (optIn) {
        if (!current.optIn) data.optInAt = new Date()
      } else {
        data.optInAt = null
      }
    }

    const updated = await prisma.contact.update({ where: { id: params.id }, data })
    return NextResponse.json({ contact: serialize(updated) })
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === 'P2002') {
        return NextResponse.json({ error: 'Ese contacto ya existe' }, { status: 409 })
      }
      if (err.code === 'P2025') {
        return NextResponse.json({ error: 'Contacto no encontrado.' }, { status: 404 })
      }
    }
    console.error('[DA CONTACTS] PATCH error:', err)
    return NextResponse.json({ error: 'No se pudo actualizar el contacto.' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  try {
    await prisma.contact.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      return NextResponse.json({ error: 'Contacto no encontrado.' }, { status: 404 })
    }
    console.error('[DA CONTACTS] DELETE error:', err)
    return NextResponse.json({ error: 'No se pudo eliminar el contacto.' }, { status: 500 })
  }
}
