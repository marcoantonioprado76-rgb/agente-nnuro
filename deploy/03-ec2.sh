#!/usr/bin/env bash
# ============================================================================
# 03 · Provisiona el EC2 de my-dymond: IAM role (acceso S3), security group,
#      key pair, instancia Ubuntu 24.04 + Elastic IP, y abre RDS al EC2.
# El bootstrap base (Node/Caddy/git) va como user-data; el deploy de la app
# (env + build + arranque) lo hace 04-deploy-app.sh por SSH.
# Idempotente.
# ============================================================================
source "$(dirname "$0")/config.sh"

VPC_ID="$(aws ec2 describe-vpcs --filters Name=isDefault,Values=true --query 'Vpcs[0].VpcId' --output text)"

# --- IAM role + instance profile (para que el EC2 acceda a S3 sin llaves) ----
if ! aws iam get-role --role-name "$IAM_ROLE" >/dev/null 2>&1; then
  aws iam create-role --role-name "$IAM_ROLE" --assume-role-policy-document \
    '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"ec2.amazonaws.com"},"Action":"sts:AssumeRole"}]}' >/dev/null
  echo "[ec2] + IAM role $IAM_ROLE"
fi
aws iam put-role-policy --role-name "$IAM_ROLE" --policy-name s3-mydymond --policy-document \
  "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Action\":[\"s3:GetObject\",\"s3:PutObject\",\"s3:DeleteObject\",\"s3:ListBucket\"],\"Resource\":[\"arn:aws:s3:::${S3_PREFIX}*\",\"arn:aws:s3:::${S3_PREFIX}*/*\"]}]}"
if ! aws iam get-instance-profile --instance-profile-name "$IAM_PROFILE" >/dev/null 2>&1; then
  aws iam create-instance-profile --instance-profile-name "$IAM_PROFILE" >/dev/null
  aws iam add-role-to-instance-profile --instance-profile-name "$IAM_PROFILE" --role-name "$IAM_ROLE"
  echo "[ec2] + instance profile $IAM_PROFILE"
  sleep 10  # el profile tarda unos segundos en propagarse
fi

# --- Security group de la app ----------------------------------------------
if ! SG_APP_ID="$(aws ec2 describe-security-groups \
      --filters Name=group-name,Values="$SG_APP" Name=vpc-id,Values="$VPC_ID" \
      --query 'SecurityGroups[0].GroupId' --output text 2>/dev/null)" || [ "$SG_APP_ID" = "None" ]; then
  SG_APP_ID="$(aws ec2 create-security-group --group-name "$SG_APP" \
    --description "my-dymond app" --vpc-id "$VPC_ID" --query GroupId --output text)"
  echo "[ec2] + SG $SG_APP ($SG_APP_ID)"
fi
echo "$SG_APP_ID" > "$SECRETS_DIR/sg-app-id"
MYIP="$(curl -s https://checkip.amazonaws.com | tr -d '\n')"
aws ec2 authorize-security-group-ingress --group-id "$SG_APP_ID" --protocol tcp --port 22  --cidr "${MYIP}/32" 2>/dev/null || true
aws ec2 authorize-security-group-ingress --group-id "$SG_APP_ID" --protocol tcp --port 80  --cidr 0.0.0.0/0 2>/dev/null || true
aws ec2 authorize-security-group-ingress --group-id "$SG_APP_ID" --protocol tcp --port 443 --cidr 0.0.0.0/0 2>/dev/null || true

# --- Abrir RDS al SG del EC2 ------------------------------------------------
if [ -s "$SECRETS_DIR/sg-rds-id" ]; then
  SG_RDS_ID="$(cat "$SECRETS_DIR/sg-rds-id")"
  aws ec2 authorize-security-group-ingress --group-id "$SG_RDS_ID" \
    --protocol tcp --port 5432 --source-group "$SG_APP_ID" 2>/dev/null \
    && echo "[ec2] RDS abierta al EC2" || echo "[ec2] RDS->EC2 ya estaba"
fi

# --- Key pair (se guarda la clave privada en .secrets) ----------------------
KEY_FILE="$SECRETS_DIR/${EC2_KEY_NAME}.pem"
if ! aws ec2 describe-key-pairs --key-names "$EC2_KEY_NAME" >/dev/null 2>&1; then
  aws ec2 create-key-pair --key-name "$EC2_KEY_NAME" --query KeyMaterial --output text > "$KEY_FILE"
  chmod 600 "$KEY_FILE"
  echo "[ec2] + key pair -> $KEY_FILE"
fi

# --- AMI Ubuntu 24.04 (Canonical, arquitectura x86_64) ----------------------
AMI="$(aws ec2 describe-images --owners 099720109477 \
  --filters "Name=name,Values=ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-amd64-server-*" \
            "Name=state,Values=available" \
  --query 'sort_by(Images,&CreationDate)[-1].ImageId' --output text)"
echo "[ec2] AMI=$AMI"

# --- Lanzar instancia (si no existe una con este Name) ----------------------
IID="$(aws ec2 describe-instances \
  --filters "Name=tag:Name,Values=$EC2_NAME" "Name=instance-state-name,Values=pending,running,stopped" \
  --query 'Reservations[0].Instances[0].InstanceId' --output text 2>/dev/null || echo None)"

if [ "$IID" = "None" ] || [ -z "$IID" ]; then
  IID="$(aws ec2 run-instances --image-id "$AMI" --instance-type "$EC2_TYPE" \
    --key-name "$EC2_KEY_NAME" --security-group-ids "$SG_APP_ID" \
    --iam-instance-profile Name="$IAM_PROFILE" \
    --block-device-mappings "[{\"DeviceName\":\"/dev/sda1\",\"Ebs\":{\"VolumeSize\":${EC2_VOLUME_GB},\"VolumeType\":\"gp3\"}}]" \
    --user-data "file://$DEPLOY_DIR/ec2-userdata.sh" \
    --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=$EC2_NAME}]" \
    --query 'Instances[0].InstanceId' --output text)"
  echo "[ec2] + instancia $IID lanzándose..."
else
  echo "[ec2] instancia $IID ya existe"
fi
echo "$IID" > "$SECRETS_DIR/ec2-id"
aws ec2 wait instance-running --instance-ids "$IID"

# --- Elastic IP ------------------------------------------------------------
if [ ! -s "$SECRETS_DIR/eip-alloc" ]; then
  ALLOC="$(aws ec2 allocate-address --domain vpc --query AllocationId --output text)"
  echo "$ALLOC" > "$SECRETS_DIR/eip-alloc"
else
  ALLOC="$(cat "$SECRETS_DIR/eip-alloc")"
fi
aws ec2 associate-address --instance-id "$IID" --allocation-id "$ALLOC" >/dev/null
EIP="$(aws ec2 describe-addresses --allocation-ids "$ALLOC" --query 'Addresses[0].PublicIp' --output text)"
echo "$EIP" > "$SECRETS_DIR/eip"

echo ""
echo "==================================================================="
echo "  EC2 LISTA ✅"
echo "  IP fija (Elastic IP):  $EIP"
echo "  SSH:  ssh -i $KEY_FILE ubuntu@$EIP"
echo ""
echo "  >>> APUNTÁ EL DNS DEL DOMINIO A ESTA IP:"
echo "      $DOMAIN        A   $EIP"
echo "      www.$DOMAIN    A   $EIP"
echo "==================================================================="
