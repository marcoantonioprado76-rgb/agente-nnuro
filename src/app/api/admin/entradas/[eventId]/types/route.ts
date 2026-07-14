export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser, unauthorizedAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'

/** POST /api/admin/entradas/[eventId]/types — create a ticket type */
export async function POST(req: NextRequest, { params }: { params: { eventId: string } }) {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()
  try {
    const { name, description, image, price, capacity, active, sortOrder, bulkMinQty, bulkDiscountPct, isGuest } = await req.json()
    if (!name?.trim()) return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 })
    // INVITADO (gratis): el precio es SIEMPRE 0, no se valida ni se cobra.
    const guest = isGuest === true
    if (!guest && (!price || isNaN(Number(price)) || Number(price) < 0)) {
      return NextResponse.json({ error: 'Precio inválido' }, { status: 400 })
    }

    const parsedCapacity = capacity !== undefined && capacity !== null && capacity !== '' ? parseInt(String(capacity), 10) : null
    if (parsedCapacity !== null && (isNaN(parsedCapacity) || parsedCapacity < 1))
      return NextResponse.json({ error: 'Capacidad debe ser un número positivo' }, { status: 400 })

    const parsedBulkMin = bulkMinQty !== undefined && bulkMinQty !== null && bulkMinQty !== '' ? parseInt(String(bulkMinQty), 10) : null
    const parsedBulkPct = bulkDiscountPct !== undefined && bulkDiscountPct !== null && bulkDiscountPct !== '' ? Number(bulkDiscountPct) : null
    if (parsedBulkMin !== null && (isNaN(parsedBulkMin) || parsedBulkMin < 2))
      return NextResponse.json({ error: 'Mínimo de entradas para descuento debe ser 2 o más' }, { status: 400 })
    if (parsedBulkPct !== null && (isNaN(parsedBulkPct) || parsedBulkPct <= 0 || parsedBulkPct >= 100))
      return NextResponse.json({ error: 'Porcentaje de descuento debe estar entre 1 y 99' }, { status: 400 })
    if ((parsedBulkMin === null) !== (parsedBulkPct === null))
      return NextResponse.json({ error: 'Debes configurar tanto el mínimo como el porcentaje de descuento' }, { status: 400 })

    const tt = await prisma.ticketType.create({
      data: {
        eventId: params.eventId,
        name: name.trim(),
        description: description?.trim() || null,
        image: image?.trim() || null,
        price: guest ? 0 : Number(price),
        isGuest: guest,
        capacity: parsedCapacity,
        bulkMinQty: parsedBulkMin,
        bulkDiscountPct: parsedBulkPct,
        active: active !== false,
        sortOrder: sortOrder ?? 0,
      },
    })
    return NextResponse.json({ ticketType: { ...tt, price: Number(tt.price) } }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/admin/entradas/[eventId]/types]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
