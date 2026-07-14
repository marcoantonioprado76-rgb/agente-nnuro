import { prisma } from '@/lib/prisma'
import { getPlanLimits, type UserPlan } from '@/lib/plan-limits'
import type { Prisma, PrismaClient } from '@prisma/client'

// Créditos IA (USD) incluidos al activar/renovar cada plan. Fase Global (NONE) NO recibe.
const CREDIT_DEFAULTS: Record<string, number> = { NONE: 0, BASIC: 3, PRO: 8, ELITE: 20 }

type Db = PrismaClient | Prisma.TransactionClient

async function settingNumber(db: Db, key: string): Promise<number | null> {
  const s = await db.appSetting.findUnique({ where: { key } })
  if (!s) return null
  const n = parseFloat(s.value)
  return Number.isFinite(n) ? n : null
}

/** Créditos IA (USD) incluidos al activar/renovar el plan. Editable por admin vía appSetting. */
export async function getPlanCredits(plan: string, db: Db = prisma): Promise<number> {
  const override = await settingNumber(db, `PLAN_${plan}_CREDITS`)
  return override ?? CREDIT_DEFAULTS[plan] ?? 0
}

/** Límite de bots/agentes del plan. Editable por admin vía appSetting. */
export async function getPlanBots(plan: string, db: Db = prisma): Promise<number> {
  const override = await settingNumber(db, `PLAN_${plan}_BOTS`)
  return override ?? getPlanLimits(plan as UserPlan).bots
}
