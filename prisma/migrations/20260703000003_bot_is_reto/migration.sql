-- Bot dedicado del Reto 90D: número aparte, excluido del panel/límites de bots de venta.
ALTER TABLE "bots" ADD COLUMN IF NOT EXISTS "is_reto" BOOLEAN NOT NULL DEFAULT false;
