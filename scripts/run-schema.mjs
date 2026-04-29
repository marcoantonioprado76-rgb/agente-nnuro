import pg from 'pg'

const { Client } = pg

// Intentar con la URL exacta del .env.local (transaction mode, port 6543)
const DATABASE_URL = 'postgresql://postgres.awfhjjamgdewwffxbsnh:marconuroguyerfgu@aws-0-us-west-1.pooler.supabase.com:6543/postgres'

const client = new Client({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

const statements = [
  `CREATE TABLE IF NOT EXISTS bots (
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
  `CREATE TABLE IF NOT EXISTS bot_secrets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bot_id UUID UNIQUE NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
    ycloud_api_key_enc TEXT,
    openai_api_key_enc TEXT,
    whatsapp_instance_number TEXT DEFAULT '',
    report_phone TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS conversations (
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
  `CREATE TABLE IF NOT EXISTS bot_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID UNIQUE NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    welcome_sent BOOLEAN DEFAULT FALSE,
    welcome_sent_at TIMESTAMPTZ,
    last_intent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'text',
    content TEXT NOT NULL,
    buffered BOOLEAN DEFAULT FALSE,
    message_id TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ai_credits_usd NUMERIC DEFAULT 0`,
  `CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS ai_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    service TEXT NOT NULL,
    model TEXT NOT NULL,
    prompt_tokens INT DEFAULT 0,
    completion_tokens INT DEFAULT 0,
    cost_usd NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `ALTER TABLE products ADD COLUMN IF NOT EXISTS bot_id UUID REFERENCES bots(id) ON DELETE SET NULL`,
  `ALTER TABLE products ADD COLUMN IF NOT EXISTS first_message_audio_url TEXT`,
  `CREATE INDEX IF NOT EXISTS idx_conversations_bot_phone ON conversations(bot_id, user_phone)`,
  `CREATE INDEX IF NOT EXISTS idx_messages_conv_buffered ON messages(conversation_id, buffered)`,
  `ALTER TABLE bots DISABLE ROW LEVEL SECURITY`,
  `ALTER TABLE bot_secrets DISABLE ROW LEVEL SECURITY`,
  `ALTER TABLE conversations DISABLE ROW LEVEL SECURITY`,
  `ALTER TABLE bot_states DISABLE ROW LEVEL SECURITY`,
  `ALTER TABLE messages DISABLE ROW LEVEL SECURITY`,
  `ALTER TABLE system_settings DISABLE ROW LEVEL SECURITY`,
  `ALTER TABLE ai_usage_logs DISABLE ROW LEVEL SECURITY`,
]

async function run() {
  console.log('Conectando...')
  try {
    await client.connect()
    console.log('✓ Conectado\n')
  } catch (e) {
    console.error('Error de conexión:', e.message)
    process.exit(1)
  }

  for (const sql of statements) {
    const label = sql.trim().split('\n')[0].trim().slice(0, 70)
    try {
      await client.query(sql)
      console.log(`✓ ${label}`)
    } catch (err) {
      if (err.message.includes('already exists') || err.message.includes('duplicate')) {
        console.log(`~ ${label} (ya existe)`)
      } else {
        console.error(`✗ ${label}\n  ${err.message}`)
      }
    }
  }

  await client.end()
  console.log('\n✅ Listo.')
}

run()
