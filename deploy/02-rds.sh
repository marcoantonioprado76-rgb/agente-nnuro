#!/usr/bin/env bash
# ============================================================================
# 02 · Crea la RDS PostgreSQL DEDICADA de my-dymond.
# - Instancia propia (no compartida con nada).
# - SG que permite 5432 desde tu IP pública (para el pg_dump/restore) y luego
#   desde el SG del EC2 (lo agrega 03-ec2.sh).
# - Genera y guarda el password en deploy/.secrets/ (git-ignored).
# Idempotente: si la instancia ya existe, no la recrea.
# ============================================================================
source "$(dirname "$0")/config.sh"

# --- VPC/subnets por defecto ------------------------------------------------
VPC_ID="$(aws ec2 describe-vpcs --filters Name=isDefault,Values=true \
  --query 'Vpcs[0].VpcId' --output text)"
[ "$VPC_ID" = "None" ] && { echo "No hay VPC por defecto. Avisá y la creo."; exit 1; }
echo "[rds] VPC=$VPC_ID"

# --- Security group de la RDS ----------------------------------------------
if ! SG_RDS_ID="$(aws ec2 describe-security-groups \
      --filters Name=group-name,Values="$SG_RDS" Name=vpc-id,Values="$VPC_ID" \
      --query 'SecurityGroups[0].GroupId' --output text 2>/dev/null)" || [ "$SG_RDS_ID" = "None" ]; then
  SG_RDS_ID="$(aws ec2 create-security-group --group-name "$SG_RDS" \
    --description "my-dymond RDS" --vpc-id "$VPC_ID" --query GroupId --output text)"
  echo "[rds] + SG $SG_RDS ($SG_RDS_ID)"
fi
echo "$SG_RDS_ID" > "$SECRETS_DIR/sg-rds-id"

# Permitir mi IP pública (para migrar datos desde local)
MYIP="$(curl -s https://checkip.amazonaws.com | tr -d '\n')"
aws ec2 authorize-security-group-ingress --group-id "$SG_RDS_ID" \
  --protocol tcp --port 5432 --cidr "${MYIP}/32" 2>/dev/null \
  && echo "[rds] ingress 5432 desde ${MYIP}/32" || echo "[rds] ingress mi IP ya existía"

# --- DB subnet group --------------------------------------------------------
SUBNETS=$(aws ec2 describe-subnets --filters Name=vpc-id,Values="$VPC_ID" \
  --query 'Subnets[].SubnetId' --output text)
aws rds create-db-subnet-group --db-subnet-group-name "${PROJECT}-subnets" \
  --db-subnet-group-description "my-dymond" --subnet-ids $SUBNETS 2>/dev/null \
  && echo "[rds] + subnet group" || echo "[rds] subnet group ya existía"

# --- Password (generado una vez, persistido) --------------------------------
PW_FILE="$SECRETS_DIR/rds-password"
if [ ! -s "$PW_FILE" ]; then
  # 32 chars hex (alfanuméricos, sin símbolos que rompan URLs/psql).
  # openssl no usa pipe -> evita el SIGPIPE de `tr | head` con pipefail.
  openssl rand -hex 16 > "$PW_FILE"
  echo "[rds] password generado -> $PW_FILE"
fi
RDS_PW="$(cat "$PW_FILE")"

# --- Crear instancia --------------------------------------------------------
if aws rds describe-db-instances --db-instance-identifier "$RDS_ID" >/dev/null 2>&1; then
  echo "[rds] instancia $RDS_ID ya existe"
else
  aws rds create-db-instance \
    --db-instance-identifier "$RDS_ID" \
    --db-instance-class "$RDS_CLASS" \
    --engine postgres --engine-version "$RDS_ENGINE_VERSION" \
    --allocated-storage "$RDS_STORAGE_GB" --storage-type gp3 \
    --master-username "$RDS_MASTER_USER" --master-user-password "$RDS_PW" \
    --db-name "$RDS_DBNAME" \
    --vpc-security-group-ids "$SG_RDS_ID" \
    --db-subnet-group-name "${PROJECT}-subnets" \
    --publicly-accessible --backup-retention-period 7 \
    --no-multi-az >/dev/null
  echo "[rds] + creando $RDS_ID (tarda ~5-10 min)..."
fi

echo "[rds] esperando a que esté disponible..."
aws rds wait db-instance-available --db-instance-identifier "$RDS_ID"

ENDPOINT="$(aws rds describe-db-instances --db-instance-identifier "$RDS_ID" \
  --query 'DBInstances[0].Endpoint.Address' --output text)"
echo "$ENDPOINT" > "$SECRETS_DIR/rds-endpoint"

# URL para Prisma (misma para DATABASE_URL y DIRECT_URL: RDS no usa pgbouncer)
DBURL="postgresql://${RDS_MASTER_USER}:${RDS_PW}@${ENDPOINT}:5432/${RDS_DBNAME}?sslmode=require"
echo "$DBURL" > "$SECRETS_DIR/database-url"

echo "[rds] LISTA ✅  endpoint=$ENDPOINT"
echo "[rds] DATABASE_URL guardada en $SECRETS_DIR/database-url"
