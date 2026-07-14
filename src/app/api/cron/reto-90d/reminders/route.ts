export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { runReminders } from '@/lib/reto90d/scheduler'
import type { ReminderKind } from '@/lib/reto90d/reminderService'
import { assertCronAuthorized } from '../_auth'

// Respaldo manual de los recordatorios del Reto 90D (protegido por CRON_SECRET).
// El disparo automático lo hace el worker in-process de instrumentation.ts cada 60s;
// este endpoint permite forzar/probar: ?kind=morning|midday|afternoon|night.
export async function GET(req: Request) {
  const denied = assertCronAuthorized(req)
  if (denied) return denied

  const kind = new URL(req.url).searchParams.get('kind') as ReminderKind | null
  const result = await runReminders(kind ? { kind } : undefined)
  return NextResponse.json(result)
}
