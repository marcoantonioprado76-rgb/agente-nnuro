import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase/server'

const EDITABLE_FIELDS = [
  'name', 'credits_amount', 'price_usd', 'expiration_days',
  'is_active', 'sort_order', 'description',
] as const

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession()
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    if (session.role !== 'admin') return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })

    const body = await request.json()
    const updateData: Record<string, unknown> = {}
    for (const f of EDITABLE_FIELDS) {
      if (body[f] !== undefined) updateData[f] = body[f]
    }

    if (updateData.credits_amount !== undefined) {
      const v = Number(updateData.credits_amount)
      if (!Number.isFinite(v) || v <= 0) return NextResponse.json({ error: 'credits_amount inválido' }, { status: 400 })
      updateData.credits_amount = Math.floor(v)
    }
    if (updateData.price_usd !== undefined) {
      const v = Number(updateData.price_usd)
      if (!Number.isFinite(v) || v <= 0) return NextResponse.json({ error: 'price_usd inválido' }, { status: 400 })
    }
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No hay campos para actualizar' }, { status: 400 })
    }

    const service = await createServiceRoleClient()
    const { data, error } = await service
      .from('credit_packages')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (e) {
    console.error('[PUT /api/admin/credit-packages/:id] error:', e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession()
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    if (session.role !== 'admin') return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })

    const service = await createServiceRoleClient()
    const { error } = await service.from('credit_packages').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[DELETE /api/admin/credit-packages/:id] error:', e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
