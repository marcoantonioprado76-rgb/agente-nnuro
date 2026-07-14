#!/usr/bin/env bash
# ============================================================================
# Genera deploy/.secrets/prod.env (el .env final que va al EC2) a partir de:
#   - deploy/.secrets/prod.env.base   (valores de Render, git-ignored)
#   - deploy/.secrets/database-url     (RDS, lo escribe 02-rds.sh)
#   - config.sh                        (AWS_REGION, S3_BUCKET_PREFIX)
# NO contiene secretos: solo hace el merge. Correr DESPUÉS de 02-rds.sh.
# ============================================================================
source "$(dirname "$0")/config.sh"

BASE="$SECRETS_DIR/prod.env.base"
[ -s "$BASE" ] || { echo "Falta $BASE"; exit 1; }
[ -s "$SECRETS_DIR/database-url" ] || { echo "Falta database-url — corré 02-rds.sh primero"; exit 1; }

DBURL="$(cat "$SECRETS_DIR/database-url")"

sed -e "s#__DATABASE_URL__#${DBURL}#g" \
    -e "s#__AWS_REGION__#${AWS_REGION}#g" \
    -e "s#__S3_BUCKET_PREFIX__#${S3_PREFIX}#g" \
    "$BASE" > "$SECRETS_DIR/prod.env"

echo "[make-env] generado $SECRETS_DIR/prod.env"
echo "[make-env] DATABASE_URL -> ${DBURL%%@*}@... (RDS)"
echo "[make-env] S3_BUCKET_PREFIX -> ${S3_PREFIX}"
