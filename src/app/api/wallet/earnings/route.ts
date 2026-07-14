export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'

export async function GET() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  return NextResponse.json({ rows: [], total: 0, page: 1, pages: 0 })
}
