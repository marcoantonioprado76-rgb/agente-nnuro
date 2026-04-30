import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

// Supabase pooler (port 6543) uses PgBouncer in transaction mode which
// does not support prepared statements — append ?pgbouncer=true if missing.
function buildDatabaseUrl(): string | undefined {
  const url = process.env.DATABASE_URL;
  if (!url) return url;
  if (url.includes('pgbouncer=true')) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}pgbouncer=true`;
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error'] : [],
    datasources: { db: { url: buildDatabaseUrl() } },
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
