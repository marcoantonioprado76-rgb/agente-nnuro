-- CreateEnum
CREATE TYPE "Position" AS ENUM ('LEFT', 'RIGHT');

-- CreateEnum
CREATE TYPE "CommissionType" AS ENUM ('BINARY_BONUS', 'DIRECT_BONUS');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "identity_document" TEXT NOT NULL,
    "date_of_birth" DATE NOT NULL,
    "referral_code" TEXT NOT NULL,
    "sponsor_id" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "binary_positions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "parent_id" UUID,
    "position" "Position",
    "left_volume" INTEGER NOT NULL DEFAULT 0,
    "right_volume" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "binary_positions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commissions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" "CommissionType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_referral_code_key" ON "users"("referral_code");

-- CreateIndex
CREATE UNIQUE INDEX "binary_positions_user_id_key" ON "binary_positions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_key" ON "password_reset_tokens"("token");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_sponsor_id_fkey" FOREIGN KEY ("sponsor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "binary_positions" ADD CONSTRAINT "binary_positions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "binary_positions" ADD CONSTRAINT "binary_positions_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "binary_positions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
