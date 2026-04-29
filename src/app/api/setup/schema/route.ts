export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'

const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const PROJECT_REF = SUPABASE_URL.replace('https://', '').replace('.supabase.co', '')

const STATEMENTS = [
  {
    label: 'Tabla bots',
    sql: `CREATE TABLE IF NOT EXISTS bots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'YCLOUD',
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  webhook_token TEXT NOT NULL,
  system_prompt_template TEXT,
  ai_model TEXT NOT NULL DEFAULT 'gpt-4o-mini',
  max_chars_msg1 INT,
  max_chars_msg2 INT,
  max_chars_msg3 INT,
  follow_up1_delay INT DEFAULT 15,
  follow_up2_delay INT DEFAULT 4320,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
)`,
  },
  {
    label: 'Tabla bot_secrets',
    sql: `CREATE TABLE IF NOT EXISTS bot_secrets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id UUID UNIQUE NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
  ycloud_api_key_enc TEXT,
  openai_api_key_enc TEXT,
  whatsapp_instance_number TEXT DEFAULT '',
  report_phone TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
)`,
  },
  {
    label: 'Tabla conversations',
    sql: `CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id UUID NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
  user_phone TEXT NOT NULL,
  user_name TEXT,
  sold BOOLEAN DEFAULT FALSE,
  sold_at TIMESTAMPTZ,
  bot_disabled BOOLEAN DEFAULT FALSE,
  follow_up1_at TIMESTAMPTZ,
  follow_up1_sent BOOLEAN DEFAULT FALSE,
  follow_up2_at TIMESTAMPTZ,
  follow_up2_sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(bot_id, user_phone)
)`,
  },
  {
    label: 'Tabla bot_states',
    sql: `CREATE TABLE IF NOT EXISTS bot_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID UNIQUE NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  welcome_sent BOOLEAN DEFAULT FALSE,
  welcome_sent_at TIMESTAMPTZ,
  last_intent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
)`,
  },
  {
    label: 'Tabla messages',
    sql: `CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'text',
  content TEXT NOT NULL,
  buffered BOOLEAN DEFAULT FALSE,
  message_id TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
)`,
  },
  { label: 'ai_credits en profiles', sql: `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ai_credits_usd NUMERIC DEFAULT 0` },
  {
    label: 'Tabla system_settings',
    sql: `CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
)`,
  },
  {
    label: 'Tabla ai_usage_logs',
    sql: `CREATE TABLE IF NOT EXISTS ai_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  service TEXT NOT NULL,
  model TEXT NOT NULL,
  prompt_tokens INT DEFAULT 0,
  completion_tokens INT DEFAULT 0,
  cost_usd NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
)`,
  },
  { label: 'bot_id en products', sql: `ALTER TABLE products ADD COLUMN IF NOT EXISTS bot_id UUID REFERENCES bots(id) ON DELETE SET NULL` },
  { label: 'audio en products', sql: `ALTER TABLE products ADD COLUMN IF NOT EXISTS first_message_audio_url TEXT` },
  { label: 'INDEX conversations', sql: `CREATE INDEX IF NOT EXISTS idx_conversations_bot_phone ON conversations(bot_id, user_phone)` },
  { label: 'INDEX messages', sql: `CREATE INDEX IF NOT EXISTS idx_messages_conv_buffered ON messages(conversation_id, buffered)` },
  { label: 'DISABLE RLS bots', sql: `ALTER TABLE bots DISABLE ROW LEVEL SECURITY` },
  { label: 'DISABLE RLS bot_secrets', sql: `ALTER TABLE bot_secrets DISABLE ROW LEVEL SECURITY` },
  { label: 'DISABLE RLS conversations', sql: `ALTER TABLE conversations DISABLE ROW LEVEL SECURITY` },
  { label: 'DISABLE RLS bot_states', sql: `ALTER TABLE bot_states DISABLE ROW LEVEL SECURITY` },
  { label: 'DISABLE RLS messages', sql: `ALTER TABLE messages DISABLE ROW LEVEL SECURITY` },
  { label: 'DISABLE RLS system_settings', sql: `ALTER TABLE system_settings DISABLE ROW LEVEL SECURITY` },
  { label: 'DISABLE RLS ai_usage_logs', sql: `ALTER TABLE ai_usage_logs DISABLE ROW LEVEL SECURITY` },
]

async function execSql(sql: string, mgmtToken: string): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${mgmtToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  })
  if (res.ok) return { ok: true }
  const body = await res.json().catch(() => ({}))
  return { ok: false, error: (body as Record<string, string>).message || `HTTP ${res.status}` }
}

export async function POST(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({})) as Record<string, string>
  const mgmtToken = body.token

  if (!mgmtToken) {
    return NextResponse.json({ error: 'Se requiere el token de acceso de Supabase' }, { status: 400 })
  }

  const results: Array<{ label: string; ok: boolean; error?: string }> = []
  for (const stmt of STATEMENTS) {
    const result = await execSql(stmt.sql, mgmtToken)
    results.push({ label: stmt.label, ...result })
  }

  const failed = results.filter(r => !r.ok)
  return NextResponse.json({ results, ok: failed.length === 0, failed: failed.length })
}

export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  return NextResponse.json({
    message: 'Use POST con body: { "token": "sbp_..." }',
    projectRef: PROJECT_REF,
    statements: STATEMENTS.map(s => s.label),
  })
}
