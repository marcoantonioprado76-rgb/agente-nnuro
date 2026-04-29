import { readFileSync, writeFileSync } from 'fs'
import { globSync } from 'glob'

const files = globSync('src/app/api/**/*.ts', { cwd: process.cwd() })
let fixed = 0

for (const f of files) {
  let c = readFileSync(f, 'utf8')
  const orig = c

  // Fix any remaining 'supabase' references -> 'db'
  if (c.includes('\bsupabase\b') || /\bsupabase\.from\b/.test(c)) {
    c = c.replace(/\bsupabase\.from\(/g, 'db.from(')
    c = c.replace(/\bsupabase\.storage\b/g, 'service.storage')
  }

  // Fix 'service used before declaration' - find functions that use service but don't declare it
  // Pattern: export async function X... { ... service.from( ...  without 'const service = await createServiceRoleClient()'
  const fnPattern = /(export async function \w+[^{]*\{)([\s\S]*?)(^})/gm
  c = c.replace(/(export async function \w+[^{]*\{)([\s\S]*?)(?=\nexport|\n\/\/|$)/g, (match, head, body) => {
    if (body.includes('service.from(') || body.includes('service.storage') || body.includes('service.auth')) {
      if (!body.includes('const service = await createServiceRoleClient()') && !body.includes('createServiceRoleClient()')) {
        body = body.replace(/(\s*try \{)/, '$1\n    const service = await createServiceRoleClient()')
        return head + body
      }
    }
    return match
  })

  if (c !== orig) {
    writeFileSync(f, c, 'utf8')
    console.log('Fixed:', f.replace(/.*src\/app\/api\//, ''))
    fixed++
  }
}
console.log('\nTotal:', fixed)
