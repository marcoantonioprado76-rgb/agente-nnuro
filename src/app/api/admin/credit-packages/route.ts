import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { getServerSession } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase/server'

/**
 * GET /api/admin/credit-packages
 * Lista todos los paquetes (activos e inactivos), ordenados por sort_order.
 */
export async function GET() {
  try {
    const session = await getServerSession()
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    if (session.role !== 'admin') return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })

    const service = await createServiceRoleClient()
    const { data, error } = await service
      .from('credit_packages')
      .select('*')
      .order('sort_order', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data || [])
  } catch (e) {
    console.error('[GET /api/admin/credit-packages] error:', e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

/**
 * POST /api/admin/credit-packages
 * Crea un paquete nuevo.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    if (session.role !== 'admin') return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })

    const body = await request.json()
    const name = String(body?.name || '').trim()
    const credits = Number(body?.credits_amount)
    const price = Number(body?.price_usd)

    if (!name) return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 })
    if (!Number.isFinite(credits) || credits <= 0) {
      return NextResponse.json({ error: 'credits_amount debe ser un entero positivo' }, { status: 400 })
    }
    if (!Number.isFinite(price) || price <= 0) {
      return NextResponse.json({ error: 'price_usd debe ser un número positivo' }, { status: 400 })
    }

    const service = await createServiceRoleClient()
    const { data, error } = await service
      .from('credit_packages')
      .insert({
        id: randomUUID(),
        name,
        credits_amount: Math.floor(credits),
        price_usd: price,
        expiration_days: body?.expiration_days !== undefined && body?.expiration_days !== null
          ? Math.floor(Number(body.expiration_days))
          : null,
        is_active: body?.is_active ?? true,
        sort_order: body?.sort_order ?? 0,
        description: body?.description?.trim() || null,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data, { status: 201 })
  } catch (e) {
    console.error('[POST /api/admin/credit-packages] error:', e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
