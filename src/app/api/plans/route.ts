import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const service = await createServiceRoleClient()
    const { data: plans, error } = await service
      .from('plans')
      .select('*')
      .eq('is_active', true)
      .order('sort_order')

    if (error) {
      return NextResponse.json({ error: 'Error al obtener planes' }, { status: 500 })
    }
    return NextResponse.json(plans || [])
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
