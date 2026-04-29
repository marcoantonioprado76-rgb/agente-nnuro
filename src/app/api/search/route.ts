import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { createServiceRoleClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

interface SearchResult {
  id: string
  type: string
  title: string
  subtitle?: string
  link: string
  icon?: string
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { data: profile } = await db
      .from('profiles')
      .select('tenant_id, role')
      .eq('id', session.sub)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const q = (searchParams.get('q') || '').trim()

    if (!q || q.length < 2) {
      return NextResponse.json({ results: [] })
    }

    const service = await createServiceRoleClient()
    const isAdmin = profile.role === 'admin'
    const pattern = `%${q}%`
    const results: SearchResult[] = []

    if (isAdmin) {
      // Admin search: search across admin-relevant data
      await Promise.all([
        // Users/Profiles
        service
          .from('profiles')
          .select('id, full_name, email, role')
          .or(`full_name.ilike.${pattern},email.ilike.${pattern}`)
          .limit(5)
          .then(({ data }) => {
            data?.forEach(p => results.push({
              id: p.id,
              type: 'Usuarios',
              title: p.full_name || p.email,
              subtitle: `${p.email} · ${p.role === 'admin' ? 'Admin' : 'Usuario'}`,
              link: '/admin/users',
              icon: 'user',
            }))
          }),

        // Bots (all)
        service
          .from('bots')
          .select('id, name, is_active')
          .ilike('name', pattern)
          .limit(5)
          .then(({ data }) => {
            data?.forEach(b => results.push({
              id: b.id,
              type: 'Bots',
              title: b.name,
              subtitle: b.is_active ? 'Activo' : 'Inactivo',
              link: '/admin/bots',
              icon: 'bot',
            }))
          }),

        // Products (all)
        service
          .from('products')
          .select('id, name, bot_id, is_active')
          .or(`name.ilike.${pattern},description.ilike.${pattern}`)
          .limit(5)
          .then(({ data }) => {
            data?.forEach(p => results.push({
              id: p.id,
              type: 'Productos',
              title: p.name,
              subtitle: p.is_active ? 'Activo' : 'Inactivo',
              link: '/admin/products',
              icon: 'product',
            }))
          }),

        // Stores (all)
        service
          .from('stores')
          .select('id, name, slug, status')
          .or(`name.ilike.${pattern},slug.ilike.${pattern}`)
          .limit(5)
          .then(({ data }) => {
            data?.forEach(s => results.push({
              id: s.id,
              type: 'Tiendas',
              title: s.name,
              subtitle: `/${s.slug} · ${s.status}`,
              link: '/admin/stores',
              icon: 'store',
            }))
          }),

        // Plans
        service
          .from('plans')
          .select('id, name, price, currency')
          .ilike('name', pattern)
          .eq('is_active', true)
          .limit(5)
          .then(({ data }) => {
            data?.forEach(p => results.push({
              id: p.id,
              type: 'Planes',
              title: p.name,
              subtitle: `$${p.price} ${p.currency}`,
              link: '/admin/plans',
              icon: 'plan',
            }))
          }),
      ])
    } else {
      // Regular user search: tenant-scoped
      const tenantId = profile.tenant_id

      await Promise.all([
        // Bots
        service
          .from('bots')
          .select('id, name, is_active, description')
          .eq('tenant_id', tenantId)
          .or(`name.ilike.${pattern},description.ilike.${pattern}`)
          .limit(5)
          .then(({ data }) => {
            data?.forEach(b => results.push({
              id: b.id,
              type: 'Agentes',
              title: b.name,
              subtitle: b.is_active ? 'Activo' : 'Inactivo',
              link: `/bots/${b.id}`,
              icon: 'bot',
            }))
          }),

        // Products
        service
          .from('products')
          .select('id, name, price_unit, currency, bot_id')
          .eq('tenant_id', tenantId)
          .or(`name.ilike.${pattern},description.ilike.${pattern}`)
          .limit(5)
          .then(({ data }) => {
            data?.forEach(p => results.push({
              id: p.id,
              type: 'Productos',
              title: p.name,
              subtitle: `$${p.price_unit} ${p.currency}`,
              link: `/bots/${p.bot_id}`,
              icon: 'product',
            }))
          }),

        // Conversations (search by contact name/phone)
        service
          .from('conversations')
          .select('id, status, last_message_at, contacts(name, push_name, phone), bots!inner(tenant_id, name)')
          .eq('bots.tenant_id', tenantId)
          .limit(5)
          .then(({ data }) => {
            data?.forEach(c => {
              const contact = c.contacts as unknown as { name?: string; push_name?: string; phone: string } | null
              const bot = c.bots as unknown as { name: string } | null
              const contactName = contact?.name || contact?.push_name || contact?.phone || ''
              if (contactName.toLowerCase().includes(q.toLowerCase()) || bot?.name?.toLowerCase().includes(q.toLowerCase())) {
                results.push({
                  id: c.id,
                  type: 'Conversaciones',
                  title: contactName || 'Desconocido',
                  subtitle: `${bot?.name || 'Bot'} · ${c.status === 'active' ? 'Activa' : c.status === 'closed' ? 'Cerrada' : 'Seguimiento'}`,
                  link: '/conversations',
                  icon: 'conversation',
                })
              }
            })
          }),

        // Leads (search by contact name)
        service
          .from('leads')
          .select('id, status, contacts(name, push_name, phone), products(name)')
          .eq('tenant_id', tenantId)
          .limit(10)
          .then(({ data }) => {
            data?.forEach(l => {
              const contact = l.contacts as unknown as { name?: string; push_name?: string; phone: string } | null
              const product = l.products as unknown as { name: string } | null
              const contactName = contact?.name || contact?.push_name || contact?.phone || ''
              if (contactName.toLowerCase().includes(q.toLowerCase()) || product?.name?.toLowerCase().includes(q.toLowerCase())) {
                results.push({
                  id: l.id,
                  type: 'Leads',
                  title: contactName || 'Desconocido',
                  subtitle: product?.name || l.status,
                  link: '/leads',
                  icon: 'lead',
                })
              }
            })
          }),

        // Stores
        service
          .from('stores')
          .select('id, name, slug, status')
          .eq('user_id', session.sub)
          .or(`name.ilike.${pattern},slug.ilike.${pattern}`)
          .limit(5)
          .then(({ data }) => {
            data?.forEach(s => results.push({
              id: s.id,
              type: 'Tiendas',
              title: s.name,
              subtitle: `/${s.slug}`,
              link: `/stores/${s.id}`,
              icon: 'store',
            }))
          }),

        // Store orders (sales)
        service
          .from('store_orders')
          .select('id, customer_name, customer_phone, amount, currency, status')
          .eq('user_id', session.sub)
          .or(`customer_name.ilike.${pattern},customer_phone.ilike.${pattern}`)
          .eq('status', 'confirmed')
          .limit(5)
          .then(({ data }) => {
            data?.forEach(o => results.push({
              id: o.id,
              type: 'Ventas',
              title: o.customer_name || o.customer_phone || 'Venta',
              subtitle: `$${o.amount} ${o.currency} · ${o.status}`,
              link: '/sales',
              icon: 'sale',
            }))
          }),

        // Subscriptions
        service
          .from('subscriptions')
          .select('id, status, plans(name)')
          .eq('user_id', session.sub)
          .limit(3)
          .then(({ data }) => {
            data?.forEach(s => {
              const plan = s.plans as unknown as { name: string } | null
              const planName = plan?.name || ''
              if (planName.toLowerCase().includes(q.toLowerCase())) {
                results.push({
                  id: s.id,
                  type: 'Suscripciones',
                  title: `Plan ${planName}`,
                  subtitle: s.status === 'active' ? 'Activa' : s.status,
                  link: '/subscription',
                  icon: 'subscription',
                })
              }
            })
          }),
      ])
    }

    // Also add static section matches
    const sections = isAdmin
      ? [
          { name: 'Dashboard', link: '/admin/dashboard', keywords: ['panel', 'dashboard', 'inicio', 'metricas'] },
          { name: 'Usuarios', link: '/admin/users', keywords: ['usuarios', 'users', 'cuentas'] },
          { name: 'Bots', link: '/admin/bots', keywords: ['bots', 'agentes'] },
          { name: 'Productos', link: '/admin/products', keywords: ['productos'] },
          { name: 'Suscripciones', link: '/admin/subscriptions', keywords: ['suscripciones', 'planes', 'pagos'] },
          { name: 'Pagos', link: '/admin/payments', keywords: ['pagos', 'cobros', 'stripe'] },
          { name: 'Auditoría', link: '/admin/audit', keywords: ['auditoria', 'logs', 'actividad'] },
          { name: 'Configuración', link: '/admin/settings', keywords: ['configuracion', 'settings', 'ajustes'] },
        ]
      : [
          { name: 'Dashboard', link: '/dashboard', keywords: ['panel', 'dashboard', 'inicio'] },
          { name: 'Mis Agentes', link: '/bots', keywords: ['bots', 'agentes', 'ia'] },
          { name: 'Conversaciones', link: '/conversations', keywords: ['conversaciones', 'chats', 'mensajes'] },
          { name: 'Leads', link: '/leads', keywords: ['leads', 'oportunidades', 'prospectos'] },
          { name: 'Tienda Virtual', link: '/stores', keywords: ['tienda', 'store', 'catalogo'] },
          { name: 'Ventas', link: '/sales', keywords: ['ventas', 'ordenes', 'pedidos'] },
          { name: 'Suscripción', link: '/subscription', keywords: ['suscripcion', 'plan', 'pago'] },
          { name: 'Perfil', link: '/profile', keywords: ['perfil', 'cuenta', 'datos'] },
          { name: 'Configuración', link: '/settings', keywords: ['configuracion', 'settings', 'ajustes', 'notificaciones'] },
        ]

    const qLower = q.toLowerCase()
    sections.forEach(s => {
      if (s.name.toLowerCase().includes(qLower) || s.keywords.some(k => k.includes(qLower))) {
        results.push({
          id: `section-${s.link}`,
          type: 'Secciones',
          title: s.name,
          subtitle: 'Ir a sección',
          link: s.link,
          icon: 'section',
        })
      }
    })

    return NextResponse.json({ results: results.slice(0, 20) })
  } catch (error) {
    console.error('Error en GET /api/search:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
