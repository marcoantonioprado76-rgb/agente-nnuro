import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/audit'

export const dynamic = 'force-dynamic'

// GET: Obtener todos los usuarios con datos enriquecidos (admin global)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    // Parse query params
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')?.trim() || ''
    const status = searchParams.get('status') // 'active' | 'suspended'
    const role = searchParams.get('role') // 'admin' | 'user'

    const service = await createServiceRoleClient()

    // 1. Fetch profiles with tenant info
    let profilesQuery = service
      .from('profiles')
      .select('*, tenants:tenant_id(id, name, slug)')
      .order('created_at', { ascending: false })

    // Apply filters
    if (search) {
      profilesQuery = profilesQuery.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`)
    }
    if (status === 'active') {
      profilesQuery = profilesQuery.eq('is_active', true)
    } else if (status === 'suspended') {
      profilesQuery = profilesQuery.eq('is_active', false)
    }
    if (role === 'admin' || role === 'user') {
      profilesQuery = profilesQuery.eq('role', role)
    }

    const { data: users, error: usersError } = await profilesQuery

    if (usersError) {
      console.error('Error fetching profiles:', usersError)
      return NextResponse.json({ error: 'Error al obtener usuarios' }, { status: 500 })
    }

    if (!users || users.length === 0) {
      return NextResponse.json([])
    }

    // Collect all user IDs and tenant IDs for batch queries
    const userIds = users.map(u => u.id)
    const tenantIds = [...new Set(users.map(u => u.tenant_id).filter(Boolean))] as string[]

    // 2. Batch fetch subscriptions with plan info for all users
    const { data: subscriptions } = await service
      .from('subscriptions')
      .select('id, user_id, status, approval_status, plan:plan_id(name)')
      .in('user_id', userIds)
      .order('created_at', { ascending: false })

    // Build a map: user_id -> latest subscription
    const subscriptionMap = new Map<string, {
      plan_name: string | null
      status: string
      approval_status: string
    }>()
    if (subscriptions) {
      for (const sub of subscriptions) {
        // Only keep the first (most recent) subscription per user
        if (!subscriptionMap.has(sub.user_id)) {
          subscriptionMap.set(sub.user_id, {
            plan_name: (sub.plan as unknown as { name: string })?.name ?? null,
            status: sub.status,
            approval_status: sub.approval_status,
          })
        }
      }
    }

    // 3. Batch count bots per tenant
    const botCountMap = new Map<string, number>()
    if (tenantIds.length > 0) {
      const { data: botCounts } = await service
        .from('bots')
        .select('tenant_id')
        .in('tenant_id', tenantIds)

      if (botCounts) {
        for (const row of botCounts) {
          botCountMap.set(row.tenant_id, (botCountMap.get(row.tenant_id) || 0) + 1)
        }
      }
    }

    // 4. Batch count products per tenant
    const productCountMap = new Map<string, number>()
    if (tenantIds.length > 0) {
      const { data: productCounts } = await service
        .from('products')
        .select('tenant_id')
        .in('tenant_id', tenantIds)

      if (productCounts) {
        for (const row of productCounts) {
          productCountMap.set(row.tenant_id, (productCountMap.get(row.tenant_id) || 0) + 1)
        }
      }
    }

    // 5. Batch count stores per user
    const storeCountMap = new Map<string, number>()
    const { data: storeCounts } = await service
      .from('stores')
      .select('user_id')

    if (storeCounts) {
      for (const row of storeCounts) {
        storeCountMap.set(row.user_id, (storeCountMap.get(row.user_id) || 0) + 1)
      }
    }

    // 6. Assemble enriched response
    const enrichedUsers = users.map(u => ({
      // All profile fields
      id: u.id,
      email: u.email,
      full_name: u.full_name,
      avatar_url: u.avatar_url,
      role: u.role,
      tenant_id: u.tenant_id,
      is_active: u.is_active,
      created_at: u.created_at,
      updated_at: u.updated_at,
      tenants: u.tenants,

      // New profile fields
      country: u.country || '',
      city: u.city || '',
      phone_number: u.phone_number || '',
      country_code: u.country_code || '',
      phone_with_code: u.phone_with_code || '',
      login_provider: u.login_provider || 'email',
      status: u.status || 'active',

      // Subscription info
      subscription: subscriptionMap.get(u.id) ?? null,

      // Counts
      bots_count: u.tenant_id ? (botCountMap.get(u.tenant_id) || 0) : 0,
      products_count: u.tenant_id ? (productCountMap.get(u.tenant_id) || 0) : 0,
      stores_count: storeCountMap.get(u.id) || 0,

    }))

    return NextResponse.json(enrichedUsers)
  } catch (error) {
    console.error('Error en GET /api/admin/users:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// POST: Crear usuario manual (admin)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('role, tenant_id')
      .eq('id', user.id)
      .single()

    if (adminProfile?.role !== 'admin') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    const body = await request.json()
    const { email, password, full_name, role } = body

    if (!email || !password || !full_name) {
      return NextResponse.json({ error: 'Email, contrasena y nombre son requeridos' }, { status: 400 })
    }

    const service = await createServiceRoleClient()

    const { data: newAuth, error: createError } = await service.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
    })

    if (createError) {
      return NextResponse.json({ error: 'Error al crear usuario: ' + createError.message }, { status: 500 })
    }

    // El trigger handle_new_user crea el perfil automaticamente.
    // Actualizamos el rol si es diferente a 'user'
    if (role && role !== 'user') {
      await service
        .from('profiles')
        .update({ role })
        .eq('id', newAuth.user.id)
    }

    await logAudit({
      userId: user.id,
      tenantId: adminProfile.tenant_id,
      action: 'crear_usuario_manual',
      entityType: 'usuario',
      entityId: newAuth.user.id,
      details: { email, role: role || 'user' },
    })

    return NextResponse.json({ message: 'Usuario creado exitosamente', id: newAuth.user.id }, { status: 201 })
  } catch (error) {
    console.error('Error en POST /api/admin/users:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
