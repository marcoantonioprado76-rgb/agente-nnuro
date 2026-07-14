#!/usr/bin/env bash
# ============================================================================
# user-data: corre UNA vez al primer boot del EC2 (Ubuntu 24.04).
# Instala la base: Node 20, build tools (Baileys usa módulos nativos), Caddy
# (TLS automático) y git. NO trae secretos ni construye la app: eso lo hace
# 04-deploy-app.sh por SSH.
# ============================================================================
set -euxo pipefail
export DEBIAN_FRONTEND=noninteractive

apt-get update -y
apt-get install -y curl git build-essential ca-certificates gnupg postgresql-client-16 || \
apt-get install -y curl git build-essential ca-certificates gnupg postgresql-client

# --- Node 20 LTS (NodeSource) ----------------------------------------------
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# --- Caddy (reverse proxy con HTTPS automático via Let's Encrypt) ----------
apt-get install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' > /etc/apt/sources.list.d/caddy-stable.list
apt-get update -y
apt-get install -y caddy

# --- Directorios de la app y del disco persistente -------------------------
# /var/data/baileys-sessions = sesiones de WhatsApp (BAILEYS_SESSIONS_DIR).
# Vive en el volumen root (gp3) que sobrevive reinicios stop/start.
mkdir -p /opt/mydymond /var/data/baileys-sessions
chown -R ubuntu:ubuntu /opt/mydymond /var/data

echo "user-data OK" > /var/log/mydymond-bootstrap.done
