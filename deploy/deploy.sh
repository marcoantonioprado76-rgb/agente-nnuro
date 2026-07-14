#!/usr/bin/env bash
# ============================================================================
# DEPLOY de un comando: publica lo que esté en `main` (repo) al servidor AWS.
#
#   Uso:   bash deploy/deploy.sh
#
# Hace, por SSH en el EC2: git pull (main) -> npm ci -> build -> restart.
# Requiere: deploy/.secrets/mydymond-key.pem y deploy/.secrets/eip (los trae
# el kit; en otra Mac se copian una vez, ver SETUP-OTRA-MAC.md).
# ============================================================================
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
KEY="$HERE/.secrets/mydymond-key.pem"
IP="$(cat "$HERE/.secrets/eip")"
[ -f "$KEY" ] || { echo "Falta $KEY (copiá deploy/.secrets/ desde la Mac original)"; exit 1; }

echo "==> Desplegando main a $IP ..."
ssh -i "$KEY" -o StrictHostKeyChecking=no ubuntu@"$IP" 'bash -s' <<'REMOTE'
set -e
cd /opt/mydymond
echo "  git pull..."
git fetch origin main -q && git reset --hard origin/main -q
echo "  ahora en: $(git log --oneline -1)"
echo "  npm ci..."
npm ci --no-audit --no-fund >/dev/null 2>&1
echo "  build..."
NODE_OPTIONS=--max-old-space-size=3072 npm run build > /tmp/deploy-build.log 2>&1 || { echo "  BUILD FALLÓ:"; tail -20 /tmp/deploy-build.log; exit 1; }
echo "  reiniciando servicio..."
sudo systemctl restart mydymond
sleep 6
echo -n "  estado: "; systemctl is-active mydymond
curl -s -o /dev/null -w "  /login -> HTTP %{http_code}\n" http://localhost:3000/login
REMOTE
echo "==> Deploy OK. https://mydiamondapp.com"
