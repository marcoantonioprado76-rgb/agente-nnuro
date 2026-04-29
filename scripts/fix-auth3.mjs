import { readFileSync, writeFileSync } from 'fs'

const BASE = 'c:/Users/quisp/Desktop/MARCO TIENDA Y AGENTE DE AI/ventas-en-automatico-main/src/app/api'

function fix(file, fn) {
  let c = readFileSync(file, 'utf8')
  const orig = c
  c = fn(c)
  if (c !== orig) { writeFileSync(file, c, 'utf8'); console.log('Fixed:', file.split('/').pop()) }
}

const ADMIN_CHECK = `if (session.role !== 'admin') return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })`

// ── notifications/route.ts ──────────────────────────────────────────
fix(`${BASE}/admin/notifications/route.ts`, c => c
  .replace(
    /\/\/ Verify admin\s*\n\s*const \{ data: profile \} = await supabase[\s\S]*?return NextResponse\.json\(\{ error: 'Acceso denegado' \}, \{ status: 403 \}\)\s*\n\s*\}/,
    ADMIN_CHECK
  )
)

// ── plans/route.ts ──────────────────────────────────────────────────
fix(`${BASE}/admin/plans/route.ts`, c => c
  .replace(/import \{ getServerSession \} from '@\/lib\/auth'\nimport \{ db \} from '@\/lib\/db'\nimport \{ createServerSupabaseClient, createServiceRoleClient \} from '@\/lib\/supabase\/server'/,
    `import { getServerSession } from '@/lib/auth'\nimport { createServiceRoleClient } from '@/lib/supabase/server'`)
  .replace(/const supabase = await createServerSupabaseClient\(\)\s*\n\s*if \(!\(await isAdmin\(supabase\)\)\) \{\s*\n\s*return NextResponse\.json\(\{ error: 'No autorizado' \}, \{ status: 401 \}\)\s*\n\s*\}/g,
    `const session = await getServerSession()\n    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })\n    ${ADMIN_CHECK}`)
)

// ── plans/[id]/route.ts ─────────────────────────────────────────────
fix(`${BASE}/admin/plans/[id]/route.ts`, c => c
  .replace(/import \{ getServerSession \} from '@\/lib\/auth'\nimport \{ db \} from '@\/lib\/db'\nimport \{ createServerSupabaseClient, createServiceRoleClient \} from '@\/lib\/supabase\/server'/,
    `import { getServerSession } from '@/lib/auth'\nimport { createServiceRoleClient } from '@/lib/supabase/server'`)
  .replace(/const supabase = await createServerSupabaseClient\(\)\s*\n\s*if \(!\(await isAdmin\(supabase\)\)\) \{\s*\n\s*return NextResponse\.json\(\{ error: 'No autorizado' \}, \{ status: 401 \}\)\s*\n\s*\}/g,
    `const session = await getServerSession()\n    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })\n    ${ADMIN_CHECK}`)
)

// ── settings/route.ts ───────────────────────────────────────────────
fix(`${BASE}/admin/settings/route.ts`, c => c
  .replace(/import \{ getServerSession \} from '@\/lib\/auth'\nimport \{ db \} from '@\/lib\/db'\nimport \{ createServerSupabaseClient, createServiceRoleClient \} from '@\/lib\/supabase\/server'/,
    `import { getServerSession } from '@/lib/auth'\nimport { createServiceRoleClient } from '@/lib/supabase/server'`)
  .replace(/async function verifyAdmin\(\) \{[\s\S]*?\n\}\n/,
    `async function verifyAdmin() {\n  const session = await getServerSession()\n  if (!session || session.role !== 'admin') return null\n  return { id: session.sub }\n}\n`)
  .replace(/const user = await verifyAdmin\(\)\s*\n\s*if \(!user\)/g, 'const user = await verifyAdmin()\n    if (!user)')
)

// ── stores/[id]/route.ts ────────────────────────────────────────────
fix(`${BASE}/admin/stores/[id]/route.ts`, c => c
  .replace(/import \{ getServerSession \} from '@\/lib\/auth'\nimport \{ db \} from '@\/lib\/db'\nimport \{ createServerSupabaseClient, createServiceRoleClient \} from '@\/lib\/supabase\/server'/,
    `import { getServerSession } from '@/lib/auth'\nimport { createServiceRoleClient } from '@/lib/supabase/server'`)
  .replace(/const supabase = await createServerSupabaseClient\(\)\s*\n\s*if \(!\(await isAdmin\(supabase\)\)\) return NextResponse\.json\(\{ error: 'No autorizado' \}, \{ status: 401 \}\)/g,
    `const session = await getServerSession()\n    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })\n    ${ADMIN_CHECK}`)
)

// ── subscriptions/manual/route.ts ───────────────────────────────────
fix(`${BASE}/admin/subscriptions/manual/route.ts`, c => c
  .replace(
    /const \{ data: adminProfile \} = await supabase[\s\S]*?return NextResponse\.json\(\{ error: 'Acceso denegado' \}, \{ status: 403 \}\)\s*\n\s*\}/,
    ADMIN_CHECK
  )
)

// ── users/[id]/route.ts ─────────────────────────────────────────────
fix(`${BASE}/admin/users/[id]/route.ts`, c => c
  .replace(
    /const \{ data: adminProfile \} = await supabase[\s\S]*?return NextResponse\.json\(\{ error: 'Acceso denegado' \}, \{ status: 403 \}\)\s*\n\s*\}/g,
    ADMIN_CHECK
  )
)

// ── users/route.ts ──────────────────────────────────────────────────
fix(`${BASE}/admin/users/route.ts`, c => {
  // Fix remaining supabase references in logAudit calls
  c = c.replace(/\bsupabase\b/g, 'service')
  // Fix session property access issue (if any nested function scoping)
  return c
})

// ── dashboard/route.ts ──────────────────────────────────────────────
fix(`${BASE}/dashboard/route.ts`, c => c
  .replace(/import \{ \} from '@\/lib\/supabase\/server'\n/, '')
  .replace(/await supabase\./g, 'await db.')
  .replace(/\bsupabase\./g, 'db.')
)

console.log('All done!')
