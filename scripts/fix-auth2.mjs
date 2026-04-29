import { readFileSync, writeFileSync } from 'fs'
import { globSync } from 'glob'

const files = globSync('src/app/api/**/*.ts', { cwd: process.cwd() })
let fixed = 0

for (const f of files) {
  let content = readFileSync(f, 'utf8')
  const original = content

  // 1. Remove leftover supabase admin role checks
  content = content.replace(
    /\/\/ Verificar admin\s*\n\s*const \{ data: profile \} = await (?:supabase|service|db)\s*\n?\s*\.from\('profiles'\)\s*\n?\s*\.select\('role'\)\s*\n?\s*\.eq\('id', (?:session\.sub|user\.id)\)\s*\n?\s*\.single\(\)\s*\n\s*if \(profile\?\.role !== 'admin'\) \{\s*\n\s*return NextResponse\.json\(\{ error: 'Acceso denegado' \}, \{ status: 403 \}\)\s*\n\s*\}/g,
    "if (session.role !== 'admin') return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })"
  )

  // 2. Remove isAdmin helper functions
  content = content.replace(/async function isAdmin\([^)]*\)[^{]*\{[\s\S]*?\n\}\n/g, '')

  // 3. Replace isAdmin() calls
  content = content.replace(
    /const admin = await isAdmin\([^)]*\)\s*\n\s*if \(!admin\) \{\s*\n\s*return NextResponse\.json\(\{ error: [^}]+\}, \{ status: 403 \}\)\s*\n\s*\}/g,
    "if (session.role !== 'admin') return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })"
  )

  // 4. Remove createServerSupabaseClient from imports if unused
  if (!content.includes('createServerSupabaseClient(') && content.includes('createServerSupabaseClient')) {
    content = content.replace(/,\s*createServerSupabaseClient/g, '')
    content = content.replace(/createServerSupabaseClient,?\s*/g, '')
    content = content.replace(/import \{ \} from '@\/lib\/supabase\/server'\n/g, '')
  }

  if (content !== original) {
    writeFileSync(f, content, 'utf8')
    console.log('Fixed:', f)
    fixed++
  }
}
console.log('\nTotal fixed:', fixed)
