#!/usr/bin/env bash
# ============================================================================
# 01 · Crea los buckets S3 de my-dymond (4 públicos + 1 privado).
# Idempotente: si el bucket ya existe, solo reaplica policy/cors.
# ============================================================================
source "$(dirname "$0")/config.sh"

cors_public='{"CORSRules":[{"AllowedHeaders":["*"],"AllowedMethods":["GET","HEAD"],"AllowedOrigins":["*"],"ExposeHeaders":["Content-Length","Content-Range","Accept-Ranges","ETag"],"MaxAgeSeconds":3000}]}'
cors_videos='{"CORSRules":[{"AllowedHeaders":["*"],"AllowedMethods":["GET","HEAD","PUT"],"AllowedOrigins":["*"],"ExposeHeaders":["Content-Length","Content-Range","Accept-Ranges","ETag"],"MaxAgeSeconds":3000}]}'

create_bucket() {
  local b="$1"
  if aws s3api head-bucket --bucket "$b" 2>/dev/null; then
    echo "  = $b ya existe"
  else
    # us-east-1 NO admite LocationConstraint; el resto SÍ.
    if [ "$AWS_REGION" = "us-east-1" ]; then
      aws s3api create-bucket --bucket "$b" >/dev/null
    else
      aws s3api create-bucket --bucket "$b" \
        --create-bucket-configuration LocationConstraint="$AWS_REGION" >/dev/null
    fi
    echo "  + $b creado"
  fi
}

echo "== Buckets PÚBLICOS =="
for name in "${PUBLIC_BUCKETS[@]}"; do
  b="${S3_PREFIX}${name}"
  create_bucket "$b"
  aws s3api put-public-access-block --bucket "$b" \
    --public-access-block-configuration \
    BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false
  aws s3api put-bucket-policy --bucket "$b" --policy \
    "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Sid\":\"PublicRead\",\"Effect\":\"Allow\",\"Principal\":\"*\",\"Action\":\"s3:GetObject\",\"Resource\":\"arn:aws:s3:::${b}/*\"}]}"
  aws s3api put-bucket-cors --bucket "$b" --cors-configuration "$cors_public"
  echo "    policy public-read + CORS aplicados"
done

echo "== Buckets PRIVADOS (videos, URL firmada) =="
for name in "${PRIVATE_BUCKETS[@]}"; do
  b="${S3_PREFIX}${name}"
  create_bucket "$b"
  # Sin bucket-policy pública. Block Public Access queda ON (default) = privado.
  aws s3api put-bucket-cors --bucket "$b" --cors-configuration "$cors_videos"
  echo "    privado + CORS (con PUT para subida directa) aplicados"
done

echo "== Buckets de my-dymond =="
aws s3 ls | grep "${S3_PREFIX}" || true
