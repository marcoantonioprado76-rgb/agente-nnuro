'use client'

import { useState } from 'react'
import { CheckCircle2, XCircle, Loader2, Key, ExternalLink, Copy, Check } from 'lucide-react'

const SQL_SCRIPT = `CREATE TABLE IF NOT EXISTS bots (
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
);

CREATE TABLE IF NOT EXISTS bot_secrets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id UUID UNIQUE NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
  ycloud_api_key_enc TEXT,
  openai_api_key_enc TEXT,
  whatsapp_instance_number TEXT DEFAULT '',
  report_phone TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS conversations (
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
);

CREATE TABLE IF NOT EXISTS bot_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID UNIQUE NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  welcome_sent BOOLEAN DEFAULT FALSE,
  welcome_sent_at TIMESTAMPTZ,
  last_intent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'text',
  content TEXT NOT NULL,
  buffered BOOLEAN DEFAULT FALSE,
  message_id TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ai_credits_usd NUMERIC DEFAULT 0;

CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  service TEXT NOT NULL,
  model TEXT NOT NULL,
  prompt_tokens INT DEFAULT 0,
  completion_tokens INT DEFAULT 0,
  cost_usd NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE products ADD COLUMN IF NOT EXISTS bot_id UUID REFERENCES bots(id) ON DELETE SET NULL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS first_message_audio_url TEXT;

CREATE INDEX IF NOT EXISTS idx_conversations_bot_phone ON conversations(bot_id, user_phone);
CREATE INDEX IF NOT EXISTS idx_messages_conv_buffered ON messages(conversation_id, buffered);

ALTER TABLE bots DISABLE ROW LEVEL SECURITY;
ALTER TABLE bot_secrets DISABLE ROW LEVEL SECURITY;
ALTER TABLE conversations DISABLE ROW LEVEL SECURITY;
ALTER TABLE bot_states DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage_logs DISABLE ROW LEVEL SECURITY;`

export default function SetupPage() {
  const [token, setToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<Array<{ label: string; ok: boolean; error?: string }> | null>(null)
  const [copied, setCopied] = useState(false)

  async function runSchema() {
    if (!token.trim()) return
    setLoading(true)
    setResults(null)
    try {
      const res = await fetch('/api/setup/schema?secret=ventas-ai-cron-secret-2026', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token.trim() }),
      })
      const data = await res.json()
      setResults(data.results ?? [])
    } catch {
      setResults([{ label: 'Error de conexión', ok: false, error: 'No se pudo conectar al servidor' }])
    } finally {
      setLoading(false)
    }
  }

  function copySQL() {
    navigator.clipboard.writeText(SQL_SCRIPT)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const allOk = results && results.every(r => r.ok)

  return (
    <div className="min-h-screen p-6" style={{ background: '#000000' }}>
      <div className="max-w-3xl mx-auto space-y-6">

        <div>
          <h1 className="text-2xl font-bold text-white">Setup — Schema de Bots</h1>
          <p className="text-[#64748B] text-sm mt-1">Crea las tablas necesarias para el servicio de Agentes de IA.</p>
        </div>

        {/* Opción A: Token automático */}
        <div className="rounded-2xl p-6 space-y-4" style={{ background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.2)' }}>
          <h2 className="text-[15px] font-semibold text-white flex items-center gap-2">
            <Key className="h-4 w-4 text-[#8B5CF6]" />
            Opción A — Automático (recomendado)
          </h2>
          <p className="text-[13px] text-[#94A3B8]/70">
            1. Ve a{' '}
            <a href="https://supabase.com/dashboard/account/tokens" target="_blank" rel="noopener noreferrer"
              className="text-[#8B5CF6] hover:underline inline-flex items-center gap-1">
              supabase.com/dashboard/account/tokens <ExternalLink className="h-3 w-3" />
            </a>
            <br />
            2. Crea un nuevo Access Token (nombre: "Setup").
            <br />
            3. Pégalo aquí y haz click en Ejecutar.
          </p>

          <div className="flex gap-3">
            <input
              type="password"
              value={token}
              onChange={e => setToken(e.target.value)}
              placeholder="sbp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              className="flex-1 h-11 rounded-xl px-4 text-sm text-white placeholder:text-[#64748B]/40 font-mono"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
            />
            <button
              onClick={runSchema}
              disabled={loading || !token.trim()}
              className="flex items-center gap-2 rounded-xl px-5 h-11 text-sm font-semibold text-white disabled:opacity-50 shrink-0"
              style={{ background: 'linear-gradient(135deg,#8B5CF6,#06B6D4)' }}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : '⚡ Ejecutar'}
            </button>
          </div>

          {/* Results */}
          {results && (
            <div className="space-y-2 pt-2">
              <div className={`text-sm font-semibold ${allOk ? 'text-[#10B981]' : 'text-[#F59E0B]'}`}>
                {allOk ? '✅ Schema aplicado correctamente.' : `⚠️ ${results.filter(r => !r.ok).length} errores (probablemente ya existían).`}
              </div>
              <div className="max-h-64 overflow-y-auto space-y-1">
                {results.map((r, i) => (
                  <div key={i} className="flex items-center gap-2 text-[12px]">
                    {r.ok
                      ? <CheckCircle2 className="h-3.5 w-3.5 text-[#10B981] shrink-0" />
                      : <XCircle className="h-3.5 w-3.5 text-[#EF4444] shrink-0" />}
                    <span className={r.ok ? 'text-[#94A3B8]' : 'text-[#EF4444]'}>{r.label}</span>
                    {r.error && <span className="text-[#64748B] truncate">— {r.error}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Opción B: Manual */}
        <div className="rounded-2xl p-6 space-y-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <h2 className="text-[15px] font-semibold text-white">Opción B — Manual (SQL Editor)</h2>
          <p className="text-[13px] text-[#94A3B8]/70">
            1. Ve a{' '}
            <a href="https://supabase.com/dashboard/project/awfhjjamgdewwffxbsnh/sql/new" target="_blank" rel="noopener noreferrer"
              className="text-[#8B5CF6] hover:underline inline-flex items-center gap-1">
              Supabase SQL Editor <ExternalLink className="h-3 w-3" />
            </a>
            <br />
            2. Copia el SQL de abajo y pégalo en el editor.
            <br />
            3. Haz click en &quot;Run&quot;.
          </p>

          <div className="relative">
            <button
              onClick={copySQL}
              className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium text-white transition-all z-10"
              style={{ background: copied ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.1)' }}
            >
              {copied ? <Check className="h-3 w-3 text-[#10B981]" /> : <Copy className="h-3 w-3" />}
              {copied ? 'Copiado!' : 'Copiar'}
            </button>
            <pre
              className="text-[11px] text-[#94A3B8] font-mono p-4 rounded-xl overflow-auto max-h-72 whitespace-pre"
              style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              {SQL_SCRIPT}
            </pre>
          </div>
        </div>

      </div>
    </div>
  )
}
