-- ─── WhatsApp Bot System Migration ──────────────────────────────────────────
-- Adds multi-tenant bot tables to the existing schema.

-- CreateEnum
CREATE TYPE "BotStatus" AS ENUM ('ACTIVE', 'PAUSED');

-- CreateEnum
CREATE TYPE "MessageRole" AS ENUM ('user', 'assistant');

-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('text', 'audio', 'image', 'location');

-- CreateTable: bots
CREATE TABLE "bots" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "status" "BotStatus" NOT NULL DEFAULT 'ACTIVE',
    "webhook_token" TEXT NOT NULL,
    "system_prompt_template" TEXT,
    "max_chars_mensaje1" INTEGER,
    "max_chars_mensaje2" INTEGER,
    "max_chars_mensaje3" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bots_pkey" PRIMARY KEY ("id")
);

-- CreateTable: bot_secrets
CREATE TABLE "bot_secrets" (
    "id" UUID NOT NULL,
    "bot_id" UUID NOT NULL,
    "ycloud_api_key_enc" TEXT NOT NULL,
    "openai_api_key_enc" TEXT NOT NULL,
    "whatsapp_instance_number" TEXT NOT NULL,
    "report_phone" TEXT NOT NULL,

    CONSTRAINT "bot_secrets_pkey" PRIMARY KEY ("id")
);

-- CreateTable: products
CREATE TABLE "products" (
    "id" UUID NOT NULL,
    "bot_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "benefits" TEXT,
    "usage" TEXT,
    "warnings" TEXT,
    "price_unit" DECIMAL(10,2),
    "price_promo2" DECIMAL(10,2),
    "price_super6" DECIMAL(10,2),
    "welcome_message" TEXT,
    "hooks" JSONB NOT NULL DEFAULT '[]',
    "image_main_urls" JSONB NOT NULL DEFAULT '[]',
    "image_price_unit_url" TEXT,
    "image_price_promo_url" TEXT,
    "image_price_super_url" TEXT,
    "testimonials_video_urls" JSONB NOT NULL DEFAULT '[]',
    "shipping_info" TEXT,
    "coverage" TEXT,
    "tags" JSONB NOT NULL DEFAULT '[]',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable: conversations
CREATE TABLE "conversations" (
    "id" UUID NOT NULL,
    "bot_id" UUID NOT NULL,
    "user_phone" TEXT NOT NULL,
    "user_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable: messages
CREATE TABLE "messages" (
    "id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "role" "MessageRole" NOT NULL,
    "type" "MessageType" NOT NULL DEFAULT 'text',
    "content" TEXT NOT NULL,
    "message_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable: bot_states
CREATE TABLE "bot_states" (
    "id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "welcome_sent" BOOLEAN NOT NULL DEFAULT false,
    "welcome_sent_at" TIMESTAMP(3),
    "selected_product_id" UUID,
    "last_intent" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bot_states_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "bots_webhook_token_key" ON "bots"("webhook_token");
CREATE INDEX "bots_user_id_idx" ON "bots"("user_id");

CREATE UNIQUE INDEX "bot_secrets_bot_id_key" ON "bot_secrets"("bot_id");

CREATE INDEX "products_bot_id_active_idx" ON "products"("bot_id", "active");

CREATE UNIQUE INDEX "conversations_bot_id_user_phone_key" ON "conversations"("bot_id", "user_phone");
CREATE INDEX "conversations_bot_id_user_phone_idx" ON "conversations"("bot_id", "user_phone");

CREATE UNIQUE INDEX "messages_message_id_key" ON "messages"("message_id");
CREATE INDEX "messages_conversation_id_created_at_idx" ON "messages"("conversation_id", "created_at");

CREATE UNIQUE INDEX "bot_states_conversation_id_key" ON "bot_states"("conversation_id");

-- AddForeignKey
ALTER TABLE "bots" ADD CONSTRAINT "bots_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "bot_secrets" ADD CONSTRAINT "bot_secrets_bot_id_fkey"
    FOREIGN KEY ("bot_id") REFERENCES "bots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "products" ADD CONSTRAINT "products_bot_id_fkey"
    FOREIGN KEY ("bot_id") REFERENCES "bots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "conversations" ADD CONSTRAINT "conversations_bot_id_fkey"
    FOREIGN KEY ("bot_id") REFERENCES "bots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_fkey"
    FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "bot_states" ADD CONSTRAINT "bot_states_conversation_id_fkey"
    FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
