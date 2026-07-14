#!/usr/bin/env bash
# ============================================================================
# 04 · Despliega la app en el EC2 (por SSH): clona el repo, copia el .env de
#      producción, instala deps, buildea, y arranca systemd + Caddy (HTTPS).
# Requiere: 03-ec2.sh ya corrido, y deploy/.secrets/prod.env ya generado
#           (con make-env.sh).
# Re-ejecutable: hace git pull + rebuild + restart.
# ============================================================================
source "$(dirname "$0")/config.sh"

EIP="$(cat "$SECRETS_DIR/eip")"
KEY_FILE="$SECRETS_DIR/${EC2_KEY_NAME}.pem"
SSH="ssh -i $KEY_FILE -o StrictHostKeyChecking=no ubuntu@$EIP"

[ -s "$SECRETS_DIR/prod.env" ] || { echo "Falta deploy/.secrets/prod.env — corré make-env.sh primero"; exit 1; }

echo "[deploy] esperando a que el bootstrap (user-data) termine..."
for i in $(seq 1 40); do
  if $SSH "test -f /var/log/mydymond-bootstrap.done" 2>/dev/null; then echo "  bootstrap OK"; break; fi
  sleep 15
done

echo "[deploy] clonando/actualizando repo en /opt/mydymond ..."
$SSH "bash -s" <<EOF
set -e
if [ ! -d /opt/mydymond/.git ]; then
  git clone --branch "$GIT_BRANCH" "$GIT_REPO" /opt/mydymond
else
  cd /opt/mydymond && git fetch origin "$GIT_BRANCH" && git checkout "$GIT_BRANCH" && git reset --hard origin/"$GIT_BRANCH"
fi
EOF

echo "[deploy] copiando .env de producción..."
scp -i "$KEY_FILE" -o StrictHostKeyChecking=no "$SECRETS_DIR/prod.env" ubuntu@"$EIP":/opt/mydymond/.env

echo "[deploy] instalando deps + build (puede tardar varios minutos)..."
$SSH "bash -s" <<'EOF'
set -e
cd /opt/mydymond
npm ci
npm run build   # prisma generate && next build
EOF

echo "[deploy] instalando systemd + Caddy..."
scp -i "$KEY_FILE" -o StrictHostKeyChecking=no "$DEPLOY_DIR/mydymond.service" ubuntu@"$EIP":/tmp/mydymond.service
scp -i "$KEY_FILE" -o StrictHostKeyChecking=no "$DEPLOY_DIR/Caddyfile"        ubuntu@"$EIP":/tmp/Caddyfile
$SSH "bash -s" <<'EOF'
set -e
sudo mv /tmp/mydymond.service /etc/systemd/system/mydymond.service
sudo mv /tmp/Caddyfile /etc/caddy/Caddyfile
sudo mkdir -p /var/log/caddy
sudo systemctl daemon-reload
sudo systemctl enable mydymond
sudo systemctl restart mydymond
sudo systemctl restart caddy
sleep 3
sudo systemctl --no-pager status mydymond | head -5
EOF

echo ""
echo "[deploy] LISTO ✅  App corriendo en el EC2."
echo "  - Local (sin dominio):  curl http://$EIP  (puede dar 404 hasta que Next levante)"
echo "  - Con dominio + DNS apuntado:  https://$DOMAIN"
echo "  - Logs de la app:  ssh -i $KEY_FILE ubuntu@$EIP 'journalctl -u mydymond -f'"
