# ============================================================
# Multi-stage Dockerfile for Ventas AI
# Deploys Next.js with persistent process for WhatsApp (Baileys)
# Target: Railway, Render, Fly.io, or any Docker host
# ============================================================

# ── Stage 1: Dependencies ──
FROM node:20-alpine AS deps
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install ALL dependencies (including devDependencies for build)
RUN npm ci

# ── Stage 2: Build ──
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build Next.js
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# All env vars needed at build time for Next.js static analysis
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
ARG STRIPE_SECRET_KEY
ARG STRIPE_WEBHOOK_SECRET
ARG SUPABASE_SERVICE_ROLE_KEY
ARG OPENAI_API_KEY
ARG CRON_SECRET

# Make ARGs available as ENV during build
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
ENV STRIPE_SECRET_KEY=$STRIPE_SECRET_KEY
ENV STRIPE_WEBHOOK_SECRET=$STRIPE_WEBHOOK_SECRET
ENV SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY
ENV OPENAI_API_KEY=$OPENAI_API_KEY
ENV CRON_SECRET=$CRON_SECRET

RUN npm run build

# ── Stage 3: Production ──
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy built assets
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Create persistent data directory for WhatsApp sessions
RUN mkdir -p /data/whatsapp-sessions && chown -R nextjs:nodejs /data

# Set the sessions directory env var
ENV WHATSAPP_SESSIONS_DIR=/data/whatsapp-sessions

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Use Next.js standalone server (persistent Node.js process)
CMD ["node", "server.js"]
