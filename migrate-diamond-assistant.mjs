/**
 * Diamond Assistant — FASE 0 (fundación).
 *
 * Crea los enums y tablas `diamond_*` del centro de comunicación WhatsApp
 * con agentes IA. Sección AISLADA: SIN FK hacia users / bots / organizations
 * (esas referencias son columnas UUID planas). Las relaciones INTERNAS entre
 * modelos diamond_* sí llevan FK con ON DELETE CASCADE.
 *
 * Ejecutar UNA sola vez:  node migrate-diamond-assistant.mjs
 * Luego:  npx prisma generate   (para que el cliente conozca los modelos nuevos)
 *
 * Idempotente y NO destructivo:
 *   - Enums:  DO $$ ... EXCEPTION WHEN duplicate_object THEN null; END $$
 *   - Tablas / índices:  CREATE TABLE / CREATE INDEX ... IF NOT EXISTS
 * No borra ni modifica datos existentes.
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Aplicando migración Diamond Assistant (FASE 0)...')

  // ── 1) ENUMS (idempotentes vía EXCEPTION duplicate_object) ──────────────────
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      CREATE TYPE "DiamondProvider" AS ENUM ('BAILEYS','YCLOUD','META');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;
  `)

  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      CREATE TYPE "DiamondMediaType" AS ENUM ('IMAGE','VIDEO','AUDIO','PDF','LINK','TEXT');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;
  `)

  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      CREATE TYPE "DiamondCampaignStatus" AS ENUM ('DRAFT','PENDING_APPROVAL','SCHEDULED','SENDING','SENT','FAILED','CANCELLED');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;
  `)

  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      CREATE TYPE "DiamondMsgStatus" AS ENUM ('PENDING','SENT','DELIVERED','FAILED','ERROR');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;
  `)

  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      CREATE TYPE "DiamondContactStatus" AS ENUM ('ACTIVE','INACTIVE','BLOCKED');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;
  `)

  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      CREATE TYPE "DiamondRuleType" AS ENUM ('FORBID','ESCALATE','REQUIRE_APPROVAL');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;
  `)

  // ── 2) TABLAS ───────────────────────────────────────────────────────────────

  // 2.1) diamond_agents (raíz de la sección; botId/created_by sin FK).
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS diamond_agents (
      id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id    UUID,
      created_by         UUID,
      name               TEXT NOT NULL,
      avatar_url         TEXT,
      personality_prompt TEXT NOT NULL,
      model              TEXT NOT NULL DEFAULT 'gpt-4o',
      temperature        DOUBLE PRECISION NOT NULL DEFAULT 0.4,
      provider           "DiamondProvider" NOT NULL DEFAULT 'BAILEYS',
      bot_id             UUID,
      openai_key_enc     TEXT,
      timezone           TEXT NOT NULL DEFAULT 'America/La_Paz',
      allowed_hours      JSONB,
      is_active          BOOLEAN NOT NULL DEFAULT true,
      created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `)

  // 2.2) diamond_groups (FK -> diamond_agents, cascade).
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS diamond_groups (
      id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      agent_id            UUID NOT NULL REFERENCES diamond_agents(id) ON DELETE CASCADE,
      group_jid           TEXT NOT NULL,
      name                TEXT,
      automation_enabled  BOOLEAN NOT NULL DEFAULT true,
      ai_enabled          BOOLEAN NOT NULL DEFAULT true,
      welcome_enabled     BOOLEAN NOT NULL DEFAULT false,
      welcome_template_id UUID,
      allowed_hours       JSONB,
      created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `)
  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS diamond_groups_agent_id_group_jid_key
      ON diamond_groups(agent_id, group_jid);
  `)

  // 2.3) diamond_welcome_templates (FK -> diamond_agents, cascade).
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS diamond_welcome_templates (
      id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      agent_id       UUID NOT NULL REFERENCES diamond_agents(id) ON DELETE CASCADE,
      name           TEXT NOT NULL,
      body           TEXT NOT NULL,
      media_asset_id UUID,
      is_active      BOOLEAN NOT NULL DEFAULT true,
      created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `)

  // 2.4) diamond_contacts (aislada; único por organización+teléfono).
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS diamond_contacts (
      id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id     UUID,
      created_by          UUID,
      name                TEXT,
      phone               TEXT NOT NULL,
      country             TEXT,
      city                TEXT,
      sponsor             TEXT,
      tag                 TEXT,
      status              "DiamondContactStatus" NOT NULL DEFAULT 'ACTIVE',
      opt_in              BOOLEAN NOT NULL DEFAULT true,
      opt_in_at           TIMESTAMPTZ,
      joined_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
      last_interaction_at TIMESTAMPTZ,
      notes               TEXT,
      created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `)
  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS diamond_contacts_organization_id_phone_key
      ON diamond_contacts(organization_id, phone);
  `)
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS diamond_contacts_organization_id_status_idx
      ON diamond_contacts(organization_id, status);
  `)

  // 2.5) diamond_media (aislada; recursos multimedia reutilizables).
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS diamond_media (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID,
      created_by      UUID,
      type            "DiamondMediaType" NOT NULL,
      title           TEXT NOT NULL,
      url             TEXT,
      link_url        TEXT,
      text_content    TEXT,
      mime_type       TEXT,
      size_bytes      INTEGER,
      tags            JSONB NOT NULL DEFAULT '[]',
      created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `)
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS diamond_media_organization_id_type_idx
      ON diamond_media(organization_id, type);
  `)

  // 2.6) diamond_knowledge (FK -> diamond_agents, cascade).
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS diamond_knowledge (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      agent_id   UUID NOT NULL REFERENCES diamond_agents(id) ON DELETE CASCADE,
      title      TEXT NOT NULL,
      content    TEXT NOT NULL,
      category   TEXT,
      is_active  BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `)
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS diamond_knowledge_agent_id_is_active_idx
      ON diamond_knowledge(agent_id, is_active);
  `)

  // 2.7) diamond_safety_rules (FK -> diamond_agents, cascade).
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS diamond_safety_rules (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      agent_id    UUID NOT NULL REFERENCES diamond_agents(id) ON DELETE CASCADE,
      description TEXT NOT NULL,
      type        "DiamondRuleType" NOT NULL DEFAULT 'FORBID',
      is_active   BOOLEAN NOT NULL DEFAULT true,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `)

  // 2.8) diamond_campaigns (FK -> diamond_agents, cascade).
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS diamond_campaigns (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      agent_id        UUID NOT NULL REFERENCES diamond_agents(id) ON DELETE CASCADE,
      organization_id UUID,
      created_by      UUID,
      name            TEXT NOT NULL,
      message_body    TEXT NOT NULL,
      media_asset_id  UUID,
      target_type     TEXT NOT NULL,
      target_json     JSONB NOT NULL,
      status          "DiamondCampaignStatus" NOT NULL DEFAULT 'DRAFT',
      scheduled_at    TIMESTAMPTZ,
      recurring       BOOLEAN NOT NULL DEFAULT false,
      recurrence_json JSONB,
      throttle_ms     INTEGER NOT NULL DEFAULT 1000,
      total_targets   INTEGER NOT NULL DEFAULT 0,
      sent_count      INTEGER NOT NULL DEFAULT 0,
      failed_count    INTEGER NOT NULL DEFAULT 0,
      approved_by     UUID,
      approved_at     TIMESTAMPTZ,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `)
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS diamond_campaigns_agent_id_status_idx
      ON diamond_campaigns(agent_id, status);
  `)

  // 2.9) diamond_message_logs (aislada; agent_id sin FK a propósito).
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS diamond_message_logs (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID,
      agent_id        UUID,
      campaign_id     UUID,
      contact_phone   TEXT NOT NULL,
      direction       TEXT NOT NULL,
      message_type    "DiamondMediaType" NOT NULL DEFAULT 'TEXT',
      content         TEXT,
      media_asset_id  UUID,
      status          "DiamondMsgStatus" NOT NULL DEFAULT 'PENDING',
      error           TEXT,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `)
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS diamond_message_logs_organization_id_created_at_idx
      ON diamond_message_logs(organization_id, created_at);
  `)
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS diamond_message_logs_campaign_id_idx
      ON diamond_message_logs(campaign_id);
  `)

  // 2.10) diamond_memory (FK -> diamond_agents, cascade).
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS diamond_memory (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      agent_id      UUID NOT NULL REFERENCES diamond_agents(id) ON DELETE CASCADE,
      contact_phone TEXT NOT NULL,
      role          TEXT NOT NULL,
      content       TEXT NOT NULL,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `)
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS diamond_memory_agent_id_contact_phone_created_at_idx
      ON diamond_memory(agent_id, contact_phone, created_at);
  `)

  console.log('✅ Migración Diamond Assistant (FASE 0) aplicada correctamente.')
  console.log('⚠️  Ahora corré: npx prisma generate')
}

main()
  .catch((e) => { console.error('❌ Migración falló:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
