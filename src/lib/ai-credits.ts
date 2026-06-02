import { prisma } from '@/lib/prisma'
import { encrypt, decrypt } from '@/lib/crypto'

export interface ResolvedKey {
  key: string
  isGlobal: boolean
  userId: string
}

export async function resolveOpenAIKey(botId: string): Promise<ResolvedKey | null> {
  const secret = await (prisma as any).botSecret.findUnique({
    where: { bot_id: botId },
    select: { openai_api_key_enc: true },
  })

  if (secret?.openai_api_key_enc) {
    try {
      const key = decrypt(secret.openai_api_key_enc)
      if (key) {
        const bot = await (prisma as any).bot.findUnique({ where: { id: botId }, select: { tenant_id: true } })
        return { key, isGlobal: false, userId: bot?.tenant_id ?? '' }
      }
    } catch { /* key corrupta */ }
  }

  const bot = await (prisma as any).bot.findUnique({ where: { id: botId }, select: { tenant_id: true } })
  if (!bot) return null

  const profile = await (prisma as any).profile.findUnique({
    where: { id: bot.tenant_id },
    select: { ai_credits_usd: true },
  })
  if (!profile || Number(profile.ai_credits_usd ?? 0) <= 0) {
    console.warn(`[AI-CREDITS] Bot ${botId}: sin key propia y sin saldo — bloqueado`)
    return null
  }

  const globalKey = await getGlobalOpenAIKey()
  if (!globalKey) return null

  return { key: globalKey, isGlobal: true, userId: bot.tenant_id }
}

const MODEL_PRICES: Record<string, { input: number; output: number }> = {
  'gpt-4o':        { input: 2.50,  output: 10.00 },
  'gpt-4o-mini':   { input: 0.15,  output: 0.60  },
  'gpt-4-turbo':   { input: 10.00, output: 30.00 },
  'gpt-3.5-turbo': { input: 0.50,  output: 1.50  },
  'gpt-5.1':       { input: 2.50,  output: 10.00 },
  'gpt-5.2':       { input: 2.50,  output: 10.00 },
  'whisper-1':     { input: 0.006, output: 0      },
}

export function calcCostUsd(model: string, promptTokens: number, completionTokens: number): number {
  const price = MODEL_PRICES[model] ?? { input: 2.50, output: 10.00 }
  return (promptTokens / 1_000_000) * price.input + (completionTokens / 1_000_000) * price.output
}

export async function getGlobalOpenAIKey(): Promise<string | null> {
  const setting = await (prisma as any).systemSettings.findUnique({
    where: { key: 'openai_global_key' },
    select: { value: true },
  })
  if (!setting?.value) return null
  try { return decrypt(setting.value) } catch { return null }
}

export async function setGlobalOpenAIKey(plainKey: string): Promise<void> {
  const encrypted = encrypt(plainKey)
  await (prisma as any).systemSettings.upsert({
    where: { key: 'openai_global_key' },
    create: { key: 'openai_global_key', value: encrypted },
    update: { value: encrypted },
  })
}

export async function logAiUsage(opts: {
  userId: string
  service: string
  model: string
  promptTokens: number
  completionTokens: number
  /** Opcional: para idempotencia y trazabilidad con la conversación */
  conversationId?: string
  agentId?: string
  /** Opcional: clave para idempotencia (si se reintenta la misma llamada, no se descontará dos veces) */
  idempotencyKey?: string
}): Promise<number> {
  const costUsd = calcCostUsd(opts.model, opts.promptTokens, opts.completionTokens)

  const usageLog = await (prisma as any).aiUsageLog.create({
    data: {
      user_id:           opts.userId,
      service:           opts.service,
      model:             opts.model,
      prompt_tokens:     opts.promptTokens,
      completion_tokens: opts.completionTokens,
      cost_usd:          costUsd,
    },
  })

  // ── Nuevo sistema: descuento del ledger (incluidos → adicionales) ──
  // Lazy imports para no romper imports circulares ni tooling estático.
  try {
    const { createServiceRoleClient } = await import('@/lib/supabase/server')
    const { consumeCredits, getUserConversionRate, usdToCredits } = await import('@/lib/credits-system')
    const service = await createServiceRoleClient()
    const rate = await getUserConversionRate(service, opts.userId)
    const creditsToCharge = usdToCredits(costUsd, rate)

    if (creditsToCharge > 0) {
      const result = await consumeCredits(service, opts.userId, creditsToCharge, {
        conversationId: opts.conversationId,
        agentId: opts.agentId,
        aiUsageLogId: usageLog?.id,
        idempotencyKey: opts.idempotencyKey ?? (usageLog?.id ? `ai_usage:${usageLog.id}` : undefined),
        description: `Consumo ${opts.model} (${opts.promptTokens}+${opts.completionTokens} tokens)`,
        source: 'ai_usage',
      })

      if (result.consumed > 0) {
        // Se descontó del nuevo sistema — NO descontamos del legacy
        return costUsd
      }
      // Si consumed=0 puede ser idempotente, exhausted, o el user no tiene saldo en el nuevo modelo
      // En todos esos casos caemos al legacy abajo (compatibilidad)
    }
  } catch (e) {
    console.warn('[logAiUsage] credits-system fallo, usando legacy:', e instanceof Error ? e.message : e)
  }

  // ── Legacy: descuento de ai_credits_usd (compatibilidad backward) ──
  const profile = await (prisma as any).profile.findUnique({
    where: { id: opts.userId },
    select: { ai_credits_usd: true },
  })
  if (profile) {
    const current = Number(profile.ai_credits_usd ?? 0)
    await (prisma as any).profile.update({
      where: { id: opts.userId },
      data: { ai_credits_usd: Math.max(0, current - costUsd) },
    })
  }

  return costUsd
}
