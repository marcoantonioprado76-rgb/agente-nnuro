import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'

const BASE = 'c:/Users/quisp/Desktop/MARCO TIENDA Y AGENTE DE AI/ventas-en-automatico-main/src/app/api'

const files = [
  // Admin routes
  `${BASE}/admin/users/route.ts`,
  `${BASE}/admin/users/[id]/route.ts`,
  `${BASE}/admin/audit/route.ts`,
  `${BASE}/admin/metrics/route.ts`,
  `${BASE}/admin/notifications/route.ts`,
  `${BASE}/admin/payments/route.ts`,
  `${BASE}/admin/payments/[id]/route.ts`,
  `${BASE}/admin/plans/route.ts`,
  `${BASE}/admin/plans/[id]/route.ts`,
  `${BASE}/admin/settings/route.ts`,
  `${BASE}/admin/stores/route.ts`,
  `${BASE}/admin/stores/[id]/route.ts`,
  `${BASE}/admin/subscriptions/route.ts`,
  `${BASE}/admin/subscriptions/[id]/route.ts`,
  `${BASE}/admin/subscriptions/manual/route.ts`,
  // User routes
  `${BASE}/dashboard/route.ts`,
  `${BASE}/notifications/route.ts`,
  `${BASE}/profile/route.ts`,
  `${BASE}/search/route.ts`,
  `${BASE}/subscriptions/route.ts`,
  `${BASE}/stores/route.ts`,
  `${BASE}/stores/[id]/route.ts`,
]

let fixed = 0

for (const file of files) {
  try {
    let content = readFileSync(file, 'utf8')
    const original = content

    // 1. Add getServerSession import if not present
    if (!content.includes("getServerSession") && content.includes("createServerSupabaseClient")) {
      content = content.replace(
        /import \{ NextRequest, NextResponse \} from 'next\/server'/,
        "import { NextRequest, NextResponse } from 'next/server'\nimport { getServerSession } from '@/lib/auth'"
      )
      content = content.replace(
        /import \{ NextResponse \} from 'next\/server'/,
        "import { NextResponse } from 'next/server'\nimport { getServerSession } from '@/lib/auth'"
      )
    }

    // 2. Replace ADMIN auth block (with role check)
    content = content.replace(
      /const supabase = await createServerSupabaseClient\(\)\s*\n\s*const \{ data: \{ user \}, error: authError \} = await supabase\.auth\.getUser\(\)\s*\n\s*if \(authError \|\| !user\) \{\s*\n\s*return NextResponse\.json\(\{ error: 'No autorizado' \}, \{ status: 401 \}\)\s*\n\s*\}\s*\n\s*const \{ data: profile \} = await supabase\s*\n\s*\.from\('profiles'\)\s*\n\s*\.select\('role'\)\s*\n\s*\.eq\('id', user\.id\)\s*\n\s*\.single\(\)\s*\n\s*if \(profile\?\.role !== 'admin'\) \{\s*\n\s*return NextResponse\.json\(\{ error: 'Acceso denegado' \}, \{ status: 403 \}\)\s*\n\s*\}/g,
      `const session = await getServerSession()
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    if (session.role !== 'admin') return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })`
    )

    // 3. Replace simple user auth block
    content = content.replace(
      /const supabase = await createServerSupabaseClient\(\)\s*\n\s*const \{ data: \{ user \}, error: authError \} = await supabase\.auth\.getUser\(\)\s*\n\s*if \(authError \|\| !user\) \{\s*\n\s*return NextResponse\.json\(\{ error: 'No autorizado' \}, \{ status: 401 \}\)\s*\n\s*\}/g,
      `const session = await getServerSession()
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })`
    )

    // 4. Replace user.id with session.sub
    content = content.replace(/\buser\.id\b/g, 'session.sub')

    // 5. Replace profile.tenant_id lookups after auth
    content = content.replace(
      /const \{ data: profile \} = await (?:supabase|service)\s*\n\s*\.from\('profiles'\)\s*\n\s*\.select\('tenant_id'\)\s*\n\s*\.eq\('id', session\.sub\)\s*\n\s*\.single\(\)\s*\n\s*(?:if \(!profile\) \{\s*\n\s*return NextResponse\.json\(\{ error: 'Perfil no encontrado' \}, \{ status: 404 \}\)\s*\n\s*\}\s*\n\s*)?const tenantId = profile\.tenant_id/g,
      `const tenantId = session.tenant_id ?? session.sub`
    )

    // 6. Replace remaining supabase.from with db.from (for user routes)
    // Only if supabase is the non-service client
    content = content.replace(/\bsupabase\.from\(/g, 'db.from(')

    // 7. Add db import if needed
    if (content.includes('db.from(') && !content.includes("from '@/lib/db'")) {
      content = content.replace(
        /import \{ getServerSession \} from '@\/lib\/auth'/,
        "import { getServerSession } from '@/lib/auth'\nimport { db } from '@/lib/db'"
      )
    }

    // 8. Remove createServerSupabaseClient from imports if no longer used
    if (!content.includes('createServerSupabaseClient(')) {
      content = content.replace(/,?\s*createServerSupabaseClient/g, '')
      content = content.replace(/createServerSupabaseClient,?\s*/g, '')
    }

    if (content !== original) {
      writeFileSync(file, content, 'utf8')
      console.log('✅ Fixed:', file.split('/').slice(-3).join('/'))
      fixed++
    } else {
      console.log('⏭️  Skipped (no changes):', file.split('/').slice(-3).join('/'))
    }
  } catch (e) {
    console.log('❌ Error:', file.split('/').slice(-3).join('/'), e.message)
  }
}

console.log(`\nTotal fixed: ${fixed}`)
