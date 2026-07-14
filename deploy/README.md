# Migración de my-dymond a AWS — Runbook

Kit completo para migrar my-dymond (Next.js + bot WhatsApp Baileys) de Render/Supabase a **AWS**, en una **cuenta propia y aislada** (nada compartido con otros proyectos).

Destino:
- **Cómputo:** EC2 dedicada (Ubuntu 24.04) + Elastic IP + Caddy (HTTPS automático) + systemd.
- **Base de datos:** RDS PostgreSQL dedicada.
- **Storage:** S3 (5 buckets) vía el shim `src/lib/supabase.ts` (misma API que Supabase, por debajo S3).
- **Sesiones WhatsApp:** disco del EC2 en `/var/data/baileys-sessions`.

Todo el estado sensible (llaves, passwords, `.env`) vive en `deploy/.secrets/` (**git-ignored**).

---

## 0. Requisito único de tu parte: activar la cuenta AWS y darme acceso

1. Activá la cuenta AWS nueva (facturación OK).
2. Creá un usuario IAM `claude-mydymond` con `AdministratorAccess` y una **access key** (CLI).
3. En esta máquina configurá el perfil aislado:
   ```bash
   aws configure --profile mydymond      # pegás Access Key ID + Secret, región us-east-2
   ```

Todo lo demás lo corro yo. Los scripts usan **siempre** `--profile mydymond`.

---

## 1. Provisionar infraestructura

```bash
cd deploy
bash 01-buckets.sh      # 5 buckets S3 (4 públicos + course-videos privado)
bash 02-rds.sh          # RDS PostgreSQL dedicada (tarda ~5-10 min) -> guarda DATABASE_URL
bash 03-ec2.sh          # EC2 + Elastic IP + SG + IAM role S3 -> imprime la IP fija
```

Al final, **03-ec2.sh imprime la IP fija**. 👉 **Apuntá el DNS del dominio a esa IP** en tu registrador:

```
mydiamondapp.com      A   <IP>
www.mydiamondapp.com  A   <IP>
```

## 2. Migrar datos y archivos

```bash
bash make-env.sh        # arma deploy/.secrets/prod.env (Render + RDS + S3)
node ../deploy/migrate-storage.mjs   # (ver env abajo) copia archivos Supabase -> S3
```

La **base de datos** y la **reescritura de URLs** conviene correrlas **desde el EC2** (trae `psql 16` y está al lado de la RDS). Tras el deploy (paso 3), por SSH:
```bash
cd /opt/mydymond/deploy
bash 05-migrate-db.sh   # pg_dump Supabase -> RDS
bash 06-rewrite-urls.sh # URLs viejas de Supabase -> URLs de S3
```

> `migrate-storage.mjs` (local) necesita:
> ```bash
> source deploy/.secrets/source.env
> export S3_BUCKET_PREFIX="mydymond-<ACCOUNT>-" AWS_REGION="us-east-2" AWS_PROFILE=mydymond
> node deploy/migrate-storage.mjs
> ```

## 3. Desplegar la app

```bash
bash 04-deploy-app.sh   # clona repo, copia .env, npm ci + build, systemd + Caddy
```

Cuando el DNS ya propagó, Caddy saca el certificado solo → `https://mydiamondapp.com`.

---

## 4. Pasos finales (tu parte, fuera de AWS)

1. **Actualizar redirect URIs** (ya apuntan a `https://mydiamondapp.com`, así que si el dominio no cambia, **no hay que tocar nada**). Si algo cambió, revisá en:
   - Meta (Facebook/IG), Google Ads/YouTube, TikTok — sus consolas de desarrollador.
2. **Re-vincular los bots de WhatsApp por QR** (las sesiones de Render no se transfieren): entrá al panel de cada bot y escaneá el QR.
3. **Verificar**: login, subida de imagen (uploads/ads), video de curso (subida + reproducción firmada), y que un bot responda.

## 5. Después de verificar OK — seguridad

- Rotá la contraseña de la DB de Supabase vieja (ya no se usa).
- Rotá el token de GitHub que está en la URL del remoto.
- Borrá o desactivá la access key `claude-mydymond` si ya no la necesitás.

---

## Rollback

Mientras no cambies el DNS, **Render sigue siendo producción**. El corte real es el registro A.
Si algo falla en AWS, volvés el DNS a Render y listo. La RDS/S3/EC2 quedan para reintentar.

## Estructura

| Archivo | Qué hace |
|---|---|
| `config.sh` | Config central (perfil, región, nombres). Deriva la cuenta en runtime. |
| `01-buckets.sh` | Crea los 5 buckets S3 con policy/CORS. |
| `02-rds.sh` | Crea la RDS dedicada, genera password, guarda `DATABASE_URL`. |
| `03-ec2.sh` | IAM role S3, SG, key pair, EC2, Elastic IP. |
| `ec2-userdata.sh` | Bootstrap del EC2 (Node 20, Caddy, git, dirs). |
| `make-env.sh` | Arma `prod.env` (base Render + RDS + S3). |
| `04-deploy-app.sh` | Deploy por SSH (clone, build, systemd, Caddy). |
| `05-migrate-db.sh` | `pg_dump` Supabase → RDS. |
| `06-rewrite-urls.sh` | Reescribe URLs de storage en la BD. |
| `migrate-storage.mjs` | Copia archivos Supabase Storage → S3. |
| `Caddyfile`, `mydymond.service` | Reverse-proxy TLS y servicio systemd. |
| `.secrets/` | Llaves, passwords, `.env` (git-ignored). |
