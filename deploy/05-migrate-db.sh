#!/usr/bin/env bash
# ============================================================================
# 05 · Migra la BASE DE DATOS: pg_dump del schema public de Supabase -> RDS.
# Dump de SOLO el schema `public` (tablas + los 28 enums de la app), sin los
# schemas internos de Supabase (auth, storage, etc.) que no usamos.
#
# Requiere pg_dump/psql (postgresql-client). Recomendado correrlo DESDE EL EC2
# (ya trae el cliente 16 y está cerca de la RDS):
#     scp -i .secrets/*.pem ...   # o simplemente clonar y correr allá
# También corre en local si tenés psql 16 instalado.
# ============================================================================
source "$(dirname "$0")/config.sh"
source "$SECRETS_DIR/source.env"

DEST_URL="$(cat "$SECRETS_DIR/database-url")"
DUMP="$SECRETS_DIR/supabase_public.dump"

command -v pg_dump >/dev/null || { echo "Falta pg_dump (postgresql-client-16). Corré este paso en el EC2."; exit 1; }

echo "[db] 1/2 · pg_dump del schema public de Supabase..."
# --no-owner / --no-privileges: evita roles de Supabase inexistentes en RDS.
pg_dump "$SRC_DIRECT_URL" \
  --schema=public --no-owner --no-privileges --no-comments \
  -Fc -f "$DUMP"
echo "[db]     dump OK -> $DUMP ($(du -h "$DUMP" | cut -f1))"

echo "[db] 2/2 · restaurando en RDS..."
# --clean --if-exists: idempotente (borra y recrea objetos si re-corrés).
pg_restore --no-owner --no-privileges --clean --if-exists \
  -d "$DEST_URL" "$DUMP"

echo "[db] verificación (conteo de tablas):"
psql "$DEST_URL" -c "SELECT count(*) AS tablas FROM information_schema.tables WHERE table_schema='public';"
echo "[db] LISTO ✅  datos en RDS."
