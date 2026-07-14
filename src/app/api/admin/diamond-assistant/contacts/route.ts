/**
 * Diamond Assistant — API: /contacts (FASE 1 · CRM funcional)
 *   GET  -> lista con búsqueda (q) + filtros (tag, status) + paginación (page)
 *   POST -> crea un contacto
 *
 * Scope: por ahora global → organizationId = null.
 */
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser, unauthorizedAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import { Prisma, DiamondContactStatus } from '@prisma/client'

const PAGE_SIZE = 20

// Estados válidos (enum del schema). Sirve para validar entrada del cliente.
const VALID_STATUS = new Set<string>(Object.values(DiamondContactStatus))

/** Normaliza un opcional de texto: recorta y convierte vacío → null. */
function optText(v: unknown): string | null {
  if (v === null || v === undefined) return null
  const s = String(v).trim()
  return s === '' ? null : s
}

/** Forma serializable estable de un contacto para el cliente. */
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

export async function GET(request: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  const { searchParams } = new URL(request.url)
  const q = (searchParams.get('q') ?? '').trim()
  const tag = (searchParams.get('tag') ?? '').trim()
  const statusParam = (searchParams.get('status') ?? '').trim()
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1') || 1)
  const skip = (page - 1) * PAGE_SIZE

  // Scope global por ahora.
  const where: Prisma.ContactWhereInput = { organizationId: null }

  if (q) {
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { phone: { contains: q, mode: 'insensitive' } },
    ]
  }
  if (tag) where.tag = tag
  if (statusParam && VALID_STATUS.has(statusParam)) {
    where.status = statusParam as DiamondContactStatus
  }

  try {
    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: PAGE_SIZE,
      }),
      prisma.contact.count({ where }),
    ])

    return NextResponse.json({
      contacts: contacts.map(serialize),
      total,
      pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    })
  } catch (err) {
    console.error('[DA CONTACTS] GET error:', err)
    return NextResponse.json({ error: 'No se pudieron cargar los contactos.' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Solicitud inválida.' }, { status: 400 })
  }

  const phone = optText(body.phone)
  if (!phone) {
    return NextResponse.json({ error: 'El celular es obligatorio.' }, { status: 400 })
  }

  // Estado (opcional) — default ACTIVE.
  let status: DiamondContactStatus = DiamondContactStatus.ACTIVE
  if (body.status !== undefined && body.status !== null && String(body.status) !== '') {
    const s = String(body.status)
    if (!VALID_STATUS.has(s)) {
      return NextResponse.json({ error: 'Estado no válido.' }, { status: 400 })
    }
    status = s as DiamondContactStatus
  }

  // Opt-in (opcional) — default true.
  const optIn = body.optIn === undefined ? true : Boolean(body.optIn)

  try {
    // Chequeo explícito de duplicado por teléfono dentro del scope global.
    const existing = await prisma.contact.findFirst({
      where: { organizationId: null, phone },
      select: { id: true },
    })
    if (existing) {
      return NextResponse.json({ error: 'Ese contacto ya existe' }, { status: 409 })
    }

    const created = await prisma.contact.create({
      data: {
        organizationId: null,
        createdBy: (admin as { id?: string }).id ?? null,
        name: optText(body.name),
        phone,
        country: optText(body.country),
        city: optText(body.city),
        sponsor: optText(body.sponsor),
        tag: optText(body.tag),
        notes: optText(body.notes),
        status,
        optIn,
        optInAt: optIn ? new Date() : null,
      },
    })

    return NextResponse.json({ contact: serialize(created) }, { status: 201 })
  } catch (err) {
    // Respaldo: violación de unicidad a nivel DB → 409.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return NextResponse.json({ error: 'Ese contacto ya existe' }, { status: 409 })
    }
    console.error('[DA CONTACTS] POST error:', err)
    return NextResponse.json({ error: 'No se pudo crear el contacto.' }, { status: 500 })
  }
}
