#!/usr/bin/env bash
# ============================================================================
# 06 · Reescribe en la RDS las URLs viejas de Supabase Storage -> URLs de S3.
# Solo aplica a buckets PÚBLICOS (guardan la URL completa). course-videos NO
# se toca: guarda solo el path y se sirve con URL firmada.
#
#   Supabase: https://<ref>.supabase.co/storage/v1/object/public/<bucket>/<key>
#   S3:       https://<prefix><bucket>.s3.<region>.amazonaws.com/<key>
#
# Recorre TODAS las columnas de texto del schema public (no hay que saber
# nombres de columnas). Idempotente.
# ============================================================================
source "$(dirname "$0")/config.sh"
source "$SECRETS_DIR/source.env"

DEST_URL="$(cat "$SECRETS_DIR/database-url")"
command -v psql >/dev/null || { echo "Falta psql (postgresql-client). Corré en el EC2."; exit 1; }

# ref del proyecto Supabase (bdhatmdhalsrwjmfcduj) desde la URL
SUPA_REF="$(echo "$SRC_SUPABASE_URL" | sed -E 's#https?://([^.]+)\..*#\1#')"

for bucket in uploads ad-creatives broadcast-images social-media; do
  OLD="https://${SUPA_REF}.supabase.co/storage/v1/object/public/${bucket}/"
  NEW="https://${S3_PREFIX}${bucket}.s3.${AWS_REGION}.amazonaws.com/"
  echo "[urls] $bucket:"
  echo "        $OLD"
  echo "     -> $NEW"
  psql "$DEST_URL" -v ON_ERROR_STOP=1 <<SQL
DO \$\$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT table_name, column_name FROM information_schema.columns
    WHERE table_schema='public' AND data_type IN ('text','character varying')
  LOOP
    EXECUTE format(
      'UPDATE public.%I SET %I = replace(%I, %L, %L) WHERE %I LIKE %L',
      r.table_name, r.column_name, r.column_name,
      '${OLD}', '${NEW}', r.column_name, '%${OLD}%'
    );
  END LOOP;
END \$\$;
SQL
done
echo "[urls] LISTO ✅  URLs reescritas a S3."
