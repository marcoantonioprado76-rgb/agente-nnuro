-- Reto 90D: memoria de conversación del bot con cada participante
CREATE TABLE IF NOT EXISTS "reto90d_messages" (
  "id" UUID NOT NULL,
  "challenge_id" UUID NOT NULL,
  "phone" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "reto90d_messages_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "reto90d_messages_challenge_id_phone_created_at_idx" ON "reto90d_messages"("challenge_id","phone","created_at");
