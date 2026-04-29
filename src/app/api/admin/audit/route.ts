import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    if (session.role !== 'admin') return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })

    const service = await createServiceRoleClient()

    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '50')
    const offset = parseInt(request.nextUrl.searchParams.get('offset') || '0')

    const { data: logs, error, count } = await service
      .from('audit_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      return NextResponse.json({ error: 'Error al obtener registros' }, { status: 500 })
    }

    // Obtener nombres de usuarios para los logs
    const userIds = [...new Set((logs || []).map(l => l.user_id).filter(Boolean))]
    let profilesMap = new Map()

    if (userIds.length > 0) {
      const { data: profiles } = await service
        .from('profiles')
        .select('id, full_name, email, role')
        .in('id', userIds)

      profilesMap = new Map(
        (profiles || []).map(p => [p.id, p])
      )
    }

    const logsWithProfiles = (logs || []).map(log => ({
      ...log,
      profile: log.user_id ? profilesMap.get(log.user_id) || null : null,
    }))

    return NextResponse.json({ logs: logsWithProfiles, total: count || 0 })
  } catch (error) {
    console.error('Error en GET /api/admin/audit:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
