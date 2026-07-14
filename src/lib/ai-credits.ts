/**
 * AI Credits — gestión del balance USD para el uso de OpenAI con la key del admin.
 *
 * Filosofía: el saldo USD del usuario funciona como una API key prepagada de OpenAI.
 * Se cobra DESPUÉS de la llamada, por tokens reales usados, con tarifas oficiales.
 *
 * Reglas:
 *  - Si el usuario tiene preferOwnKey=true y key propia válida, se usa su key y NO se cobra.
 *  - Si no, se usa la key global del admin (AppSetting 'openai_global_key' o AdminConfig
 *    legacy) y se descuenta el costo exacto en tokens/segundos/imágenes.
 *  - Pre-check: si el balance es <= 0 Y no hay key propia, se bloquea ANTES de la llamada
 *    (bot queda mudo / endpoint devuelve NO_CREDITS).
 *  - El cobro post-llamada usa un UPDATE atómico con SELECT … FOR UPDATE para evitar
 *    race conditions. El balance puede quedar ligeramente negativo en la última llamada
 *    (porque cobramos por tokens reales después del hecho), pero la siguiente llamada
 *    queda bloqueada por el pre-check.
 *
 * API expuesta:
 *  - resolveOpenAIKey(userId)        → resuelve key (propia o admin) sin cobrar
 *  - hasBalanceOrOwnKey(userId)      → boolean rápido pre-check
 *  - chargeForChatUsage(...)         → cobro por tokens reales (chat / embedding)
 *  - chargeForWhisperSeconds(...)    → cobro por segundos de audio transcrito
 *  - chargeForImage(...)             → cobro por imagen generada (DALL-E)
 *  - refundUserForAI(...)            → devolver un cobro (uso interno por fallos)
 *  - getUserAIBalanceUsd(userId)     → lectura simple del balance
 *
 * Wrappers @deprecated (no romper endpoints HTTP no migrados):
 *  - chargeUserForAI(userId, model, reason)  → flat por llamada (legacy)
 *  - costForModel(model)                     → costo flat (legacy)
 */

import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/ads/encryption'

const ENC_KEY = process.env.ADS_ENCRYPTION_KEY || ''

// Umbral de alerta "saldo bajo": cuando queda menos de $1 USD avisamos al usuario
// UNA vez por ventana de throttle (24h).
const LOW_BALANCE_THRESHOLD_USD = 1.0
const LOW_BALANCE_THROTTLE_MS = 24 * 60 * 60 * 1000

// ─── Tarifas oficiales de OpenAI por TOKEN (USD por 1M tokens) ──────────────
//
// Markup 1:1 — cobramos exactamente lo que cobra OpenAI.
//
// Estos valores se pueden sobrescribir vía AppSetting con key
// "ai_model_token_pricing" (JSON: { "gpt-4o": { "input": 2.5, "output": 10 }, ... }).
//
// Para modelos NO listados acá, el fallback es gpt-4o-mini.
export interface TokenPricing { input: number; output: number }

// Factor de precio para los tokens de prompt servidos desde el caché de OpenAI.
// OpenAI factura los tokens cacheados más barato; usamos 0.5 (mitad de precio) de forma
// conservadora para la familia GPT-4o/GPT-5. Si el admin afina las tarifas, puede ajustarlo.
export const CACHED_INPUT_MULTIPLIER = 0.5

export const DEFAULT_TOKEN_PRICING: Record<string, TokenPricing> = {
    // Modelos GPT-4
    'gpt-4o':           { input: 2.50,  output: 10.00 },
    'gpt-4o-mini':      { input: 0.15,  output: 0.60  },
    'gpt-4-turbo':      { input: 10.00, output: 30.00 },
    'gpt-3.5-turbo':    { input: 0.50,  output: 1.50  },
    // Modelos GPT-5 — placeholder (mismas tarifas que gpt-4o; admin puede ajustar)
    'gpt-5.1':          { input: 2.50,  output: 10.00 },
    'gpt-5.2':          { input: 2.50,  output: 10.00 },
    // Embeddings
    'text-embedding-3-small': { input: 0.020, output: 0 },
    'text-embedding-3-large': { input: 0.130, output: 0 },
}

// Whisper-1: $0.006 por minuto de audio. Internamente cobramos por segundo.
export const WHISPER_USD_PER_SECOND = 0.006 / 60   // ≈ $0.0001/s

// DALL-E 3 (USD por imagen generada)
export const IMAGE_PRICING: Record<string, number> = {
    'dall-e-3':           0.040,  // standard 1024×1024
    'dall-e-3-hd':        0.080,  // HD 1024×1024
    'dall-e-3-wide':      0.080,  // 1792×1024 standard
    'dall-e-3-wide-hd':   0.120,  // 1792×1024 HD
    'gpt-image-1':        0.040,  // alias del nuevo image gen
}

// ─── Cache de tarifas custom (60s) ──────────────────────────────────────────

let cachedTokenPricing: Record<string, TokenPricing> | null = null
let cachedAt = 0
const CACHE_TTL_MS = 60_000

async function getEffectiveTokenPricing(): Promise<Record<string, TokenPricing>> {
    const now = Date.now()
    if (cachedTokenPricing && now - cachedAt < CACHE_TTL_MS) return cachedTokenPricing
    try {
        const setting = await (prisma as any).appSetting.findUnique({
            where: { key: 'ai_model_token_pricing' },
            select: { value: true },
        })
        if (setting?.value) {
            const parsed = JSON.parse(setting.value)
            if (parsed && typeof parsed === 'object') {
                const merged: Record<string, TokenPricing> = { ...DEFAULT_TOKEN_PRICING, ...parsed }
                cachedTokenPricing = merged
                cachedAt = now
                return merged
            }
        }
    } catch { /* fallthrough a defaults */ }
    const merged: Record<string, TokenPricing> = { ...DEFAULT_TOKEN_PRICING }
    cachedTokenPricing = merged
    cachedAt = now
    return merged
}

export function invalidateCostCache() {
    cachedTokenPricing = null
    cachedAt = 0
}

async function getTokenPricingFor(model: string): Promise<TokenPricing> {
    const all = await getEffectiveTokenPricing()
    return all[model] ?? all['gpt-4o-mini'] ?? DEFAULT_TOKEN_PRICING['gpt-4o-mini']
}

// ─── Tipos del API ──────────────────────────────────────────────────────────

export type ResolveKeyOk = {
    ok: true
    key: string
    /** 'own' = key del usuario (no cobrar); 'admin' = key global (cobrar después) */
    source: 'own' | 'admin'
}
export type ResolveKeyError = {
    ok: false
    error: 'NO_CREDITS' | 'NO_KEY' | 'INTERNAL'
    balanceUsd?: number
}

export type ChargeOk = { ok: true; chargedUsd: number; remainingUsd: number }
export type ChargeError = { ok: false; error: 'INTERNAL' }
export type ChargeResult = ChargeOk | ChargeError

// ─── Lectura privada de claves admin (2 fuentes legacy) ─────────────────────

async function readAdminApiKey(): Promise<string | null> {
    const [globalSetting, adminConfig] = await Promise.all([
        (prisma as any).appSetting.findUnique({
            where: { key: 'openai_global_key' },
            select: { value: true },
        }),
        (prisma as any).adminConfig.findUnique({
            where: { id: 'global' },
            select: { openaiKeyEnc: true },
        }),
    ])

    // Fuente 1 — AppSetting 'openai_global_key'. El panel /admin/settings lo guarda
    // en TEXTO PLANO (`String(value)`), pero versiones previas podían cifrarlo con
    // ads/encryption. Aceptamos ambos: si parece una key real (sk-...) la usamos tal
    // cual; si no, intentamos descifrarla. Sin esto, una key global en claro hacía
    // que decrypt() siempre lanzara → readAdminApiKey devolvía null → bots mudos.
    const rawGlobal = (globalSetting?.value ?? '').trim()
    if (rawGlobal) {
        if (rawGlobal.startsWith('sk-')) return rawGlobal
        try { const d = decrypt(rawGlobal, ENC_KEY); if (d) return d } catch { /* probar siguiente fuente */ }
    }

    // Fuente 2 — AdminConfig.openaiKeyEnc (cifrado con ads/encryption).
    const adminEnc = (adminConfig?.openaiKeyEnc ?? '').trim()
    if (adminEnc) {
        if (adminEnc.startsWith('sk-')) return adminEnc
        try { const d = decrypt(adminEnc, ENC_KEY); if (d) return d } catch { /* sin key admin usable */ }
    }

    return null
}

// ─── API pública nueva ──────────────────────────────────────────────────────

/**
 * Resuelve qué key usar (propia o admin) y verifica que haya saldo si toca admin.
 * NO descuenta nada — eso lo hace chargeForChatUsage / chargeForWhisperSeconds /
 * chargeForImage después de la llamada exitosa.
 */
export async function resolveOpenAIKey(userId: string): Promise<ResolveKeyOk | ResolveKeyError> {
    try {
        const [userRow, ownConfig] = await Promise.all([
            prisma.user.findUnique({
                where: { id: userId },
                select: { preferOwnKey: true, aiBalanceUsd: true },
            }),
            (prisma as any).openAIConfig.findUnique({
                where: { userId },
                select: { apiKeyEnc: true, isValid: true },
            }),
        ])

        if (!userRow) return { ok: false, error: 'INTERNAL' }

        // Si el usuario prefiere su propia key y la tiene válida → usarla sin descontar
        if (userRow.preferOwnKey && ownConfig?.isValid && ownConfig.apiKeyEnc) {
            try {
                const ownKey = decrypt(ownConfig.apiKeyEnc, ENC_KEY)
                if (ownKey) return { ok: true, key: ownKey, source: 'own' }
            } catch { /* cae a admin */ }
        }

        // Admin key — pero antes verificar saldo > 0
        const balance = Number(userRow.aiBalanceUsd ?? 0)
        if (balance <= 0) {
            return { ok: false, error: 'NO_CREDITS', balanceUsd: balance }
        }

        const adminKey = await readAdminApiKey()
        if (!adminKey) return { ok: false, error: 'NO_KEY' }

        return { ok: true, key: adminKey, source: 'admin' }
    } catch (e: any) {
        console.error('[ai-credits] resolveOpenAIKey error:', e?.message ?? e)
        return { ok: false, error: 'INTERNAL' }
    }
}

/**
 * Pre-check rápido: ¿puede este usuario hacer una llamada a OpenAI?
 * (Tiene key propia válida o tiene saldo > 0)
 */
export async function hasBalanceOrOwnKey(userId: string): Promise<boolean> {
    const r = await resolveOpenAIKey(userId)
    return r.ok
}

/**
 * Cobra el costo exacto de tokens de chat (input + output) al balance USD.
 * Llamar SOLO si resolveOpenAIKey devolvió source='admin'.
 */
export async function chargeForChatUsage(
    userId: string,
    model: string,
    promptTokens: number,
    completionTokens: number,
    reason: string,
    metadata?: Record<string, any>,
    cachedTokens: number = 0,
): Promise<ChargeResult> {
    const pricing = await getTokenPricingFor(model)
    // Tokens del prompt servidos desde el caché de OpenAI: se cobran a mitad de precio
    // (OpenAI los factura más barato). Reflejarlo aquí hace que el ahorro del caché llegue
    // al saldo del usuario, no solo a la factura del admin.
    const cached    = Math.min(Math.max(0, cachedTokens), promptTokens)
    const uncached  = promptTokens - cached
    const inputUsd  = ((uncached / 1_000_000) * pricing.input)
                    + ((cached   / 1_000_000) * pricing.input * CACHED_INPUT_MULTIPLIER)
    const outputUsd = (completionTokens / 1_000_000) * pricing.output
    const totalUsd  = Math.max(0, inputUsd + outputUsd)
    return chargeAtomic(userId, totalUsd, model, reason, {
        ...metadata,
        promptTokens,
        completionTokens,
        cachedTokens: cached,
    })
}

/**
 * Cobra el costo de transcripción Whisper proporcional a la duración del audio.
 * Si no se conoce la duración exacta, pasar una estimación (ej: 30 segundos).
 */
export async function chargeForWhisperSeconds(
    userId: string,
    seconds: number,
    reason: string,
    metadata?: Record<string, any>,
): Promise<ChargeResult> {
    const safeSeconds = Math.max(1, Math.ceil(seconds || 30))  // mínimo 1s, default 30s
    const totalUsd = safeSeconds * WHISPER_USD_PER_SECOND
    return chargeAtomic(userId, totalUsd, 'whisper-1', reason, {
        ...metadata,
        seconds: safeSeconds,
    })
}

/**
 * Cobra el costo de N imágenes generadas con DALL-E.
 */
export async function chargeForImage(
    userId: string,
    model: string,
    n: number,
    reason: string,
    metadata?: Record<string, any>,
): Promise<ChargeResult> {
    const perImage = IMAGE_PRICING[model] ?? IMAGE_PRICING['dall-e-3']
    const count = Math.max(1, n || 1)
    const totalUsd = perImage * count
    return chargeAtomic(userId, totalUsd, model, reason, {
        ...metadata,
        count,
    })
}

/**
 * Descuento atómico común a todos los charge*. NO bloquea por saldo —
 * deja que el balance vaya hasta 0 (la próxima llamada queda bloqueada
 * por resolveOpenAIKey()).
 */
async function chargeAtomic(
    userId: string,
    costUsd: number,
    model: string,
    reason: string,
    metadata?: Record<string, any>,
): Promise<ChargeResult> {
    if (costUsd <= 0) {
        // Costo cero (puede pasar con embeddings vacíos) — registrar pero no tocar balance
        try {
            await (prisma as any).aIUsageLog.create({
                data: { userId, model, reason, costUsd: 0, metadata: metadata ?? undefined },
            })
        } catch { /* no fatal */ }
        return { ok: true, chargedUsd: 0, remainingUsd: await getUserAIBalanceUsd(userId) }
    }

    try {
        const result = await prisma.$transaction(async (tx) => {
            // Lock row del usuario
            const locked = await tx.$queryRaw<Array<{ ai_balance_usd: string }>>`
                SELECT ai_balance_usd::text
                FROM users
                WHERE id = ${userId}::uuid
                FOR UPDATE
            `
            const before = parseFloat(locked[0]?.ai_balance_usd ?? '0')

            // GREATEST(0, …): nunca vamos a negativo. Si costUsd > before, queda en 0.
            await tx.$executeRaw`
                UPDATE users
                SET ai_balance_usd = GREATEST(0::numeric, ai_balance_usd - ${costUsd}::numeric)
                WHERE id = ${userId}::uuid
            `

            await (tx as any).aIUsageLog.create({
                data: {
                    userId,
                    model,
                    reason,
                    costUsd,
                    metadata: metadata ?? undefined,
                },
            })

            return { charged: costUsd, remaining: Math.max(0, before - costUsd) }
        })

        // Disparar email de "saldo bajo" si quedamos por debajo del umbral.
        // Fire-and-forget, throttled a 24h por usuario para no spamear.
        if (result.remaining > 0 && result.remaining < LOW_BALANCE_THRESHOLD_USD) {
            maybeSendLowBalanceWarning(userId, result.remaining).catch(() => {})
        }

        return { ok: true, chargedUsd: result.charged, remainingUsd: result.remaining }
    } catch (e: any) {
        console.error('[ai-credits] chargeAtomic error:', e?.message ?? e)
        return { ok: false, error: 'INTERNAL' }
    }
}

/**
 * Envía email "saldo bajo" si:
 *   - El usuario tiene email registrado.
 *   - No se envió aviso en las últimas 24h (throttle).
 * Marca `users.low_balance_warned_at` para evitar el siguiente envío.
 */
async function maybeSendLowBalanceWarning(userId: string, remainingUsd: number): Promise<void> {
    const u = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, fullName: true, lowBalanceWarnedAt: true },
    })
    if (!u?.email) return
    const lastWarned = u.lowBalanceWarnedAt ? u.lowBalanceWarnedAt.getTime() : 0
    if (Date.now() - lastWarned < LOW_BALANCE_THROTTLE_MS) return  // throttle 24h

    // Marcar PRIMERO para evitar carrera donde dos cobros concurrentes manden 2 emails
    await prisma.user.update({
        where: { id: userId },
        data: { lowBalanceWarnedAt: new Date() },
    }).catch(() => {})

    try {
        const { sendLowBalanceWarningEmail } = await import('./email')
        await sendLowBalanceWarningEmail(u.email, u.fullName ?? '', remainingUsd)
    } catch (e) {
        console.error('[ai-credits] maybeSendLowBalanceWarning email failed:', e)
    }
}

/**
 * Refund: devuelve un cobro al balance USD del usuario.
 * Usar cuando una llamada se cobró pero después falló (ej: envío Baileys roto).
 */
export async function refundUserForAI(
    userId: string,
    amountUsd: number,
    reason: string,
): Promise<void> {
    if (amountUsd <= 0) return
    try {
        await prisma.$transaction(async (tx) => {
            await tx.$executeRaw`
                UPDATE users
                SET ai_balance_usd = ai_balance_usd + ${amountUsd}::numeric
                WHERE id = ${userId}::uuid
            `
            await (tx as any).aIUsageLog.create({
                data: {
                    userId,
                    model: 'refund',
                    reason: `refund:${reason}`,
                    costUsd: -amountUsd,
                },
            })
        })
    } catch (e: any) {
        console.error('[ai-credits] refundUserForAI error:', e?.message ?? e)
    }
}

/**
 * Lectura simple del balance USD.
 */
export async function getUserAIBalanceUsd(userId: string): Promise<number> {
    const u = await prisma.user.findUnique({
        where: { id: userId },
        select: { aiBalanceUsd: true },
    })
    return u?.aiBalanceUsd ? Number(u.aiBalanceUsd) : 0
}

// ─── Wrappers legacy @deprecated (compatibilidad con endpoints HTTP no migrados) ──

// Tabla flat por llamada — se mantiene para que chargeUserForAI() siga funcionando
// hasta que se migren todos los endpoints HTTP en Fase 1B.
export const DEFAULT_MODEL_COST_USD: Record<string, number> = {
    'gpt-4o':         0.05,
    'gpt-4o-mini':    0.01,
    'gpt-4-turbo':    0.05,
    'gpt-3.5-turbo':  0.01,
    'whisper-1':      0.02,
    'dall-e-3':       0.10,
    'dall-e-3-hd':    0.20,
    'gpt-image-1':    0.10,
    'text-embedding-3-small': 0.001,
    'text-embedding-3-large': 0.005,
}
export const MODEL_COST_USD = DEFAULT_MODEL_COST_USD

/** @deprecated usar getTokenPricingFor / chargeForChatUsage en su lugar */
export async function costForModel(model: string): Promise<number> {
    return DEFAULT_MODEL_COST_USD[model] ?? DEFAULT_MODEL_COST_USD['gpt-4o-mini'] ?? 0.01
}

export type AIChargeOk = {
    ok: true
    key: string
    source: 'own' | 'admin'
    remainingUsd?: number
    chargedUsd?: number
}
export type AIChargeError = {
    ok: false
    error: 'NO_CREDITS' | 'NO_KEY' | 'INTERNAL'
    balanceUsd?: number
    requiredUsd?: number
}

/**
 * @deprecated Sistema flat por llamada. Usar resolveOpenAIKey() + chargeForChatUsage()
 * para cobro por tokens reales. Se mantiene para endpoints HTTP no migrados aún.
 */
export async function chargeUserForAI(
    userId: string,
    model: string,
    reason: string,
    metadata?: Record<string, any>,
): Promise<AIChargeOk | AIChargeError> {
    const resolved = await resolveOpenAIKey(userId)
    if (!resolved.ok) {
        if (resolved.error === 'NO_CREDITS') {
            return {
                ok: false,
                error: 'NO_CREDITS',
                balanceUsd: resolved.balanceUsd,
                requiredUsd: await costForModel(model),
            }
        }
        return { ok: false, error: resolved.error }
    }
    if (resolved.source === 'own') {
        return { ok: true, key: resolved.key, source: 'own' }
    }
    // Admin key: cobrar flat (legacy)
    const cost = await costForModel(model)
    const chargeRes = await chargeAtomic(userId, cost, model, reason, metadata)
    if (!chargeRes.ok) return { ok: false, error: 'INTERNAL' }
    return {
        ok: true,
        key: resolved.key,
        source: 'admin',
        chargedUsd: chargeRes.chargedUsd,
        remainingUsd: chargeRes.remainingUsd,
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPAT — API de facturación del módulo de Anuncios (portado desde JD).
// El código de Ads llama a resolveAdsKey/logAiUsage/logImageUsage/logWhisperUsage.
// Aquí se mapean al modelo de créditos de ESTE proyecto (resolveOpenAIKey +
// chargeFor…). El código de Ads ya guarda cada cobro con `if (resolvedKey.isGlobal)`,
// así que estos log* SOLO se invocan cuando se usa la key global (admin) — igual
// que la semántica nativa (key propia = gratis; global = se cobra al saldo USD).
// ─────────────────────────────────────────────────────────────────────────────

/** Forma que espera el módulo de Ads (compat con JD). */
export interface ResolvedAdsKey {
    key: string
    isGlobal: boolean
    userId: string
}

/**
 * Resuelve la key de OpenAI para Anuncios/Landing/Social.
 * Delega en resolveOpenAIKey(userId) y adapta la forma de retorno:
 *   source 'own'   → isGlobal false (no se cobra)
 *   source 'admin' → isGlobal true  (se cobra vía log*Usage)
 * Devuelve null si no hay key/saldo (compat: el módulo de Ads espera `| null`).
 */
export async function resolveAdsKey(userId: string): Promise<ResolvedAdsKey | null> {
    const r = await resolveOpenAIKey(userId)
    if (!r.ok) return null
    return { key: r.key, isGlobal: r.source === 'admin', userId }
}

/** Registra+cobra uso de chat (tokens). Solo se llama con key global. */
export async function logAiUsage(opts: {
    userId: string
    service: string
    model: string
    promptTokens: number
    completionTokens: number
}): Promise<number> {
    const res = await chargeForChatUsage(
        opts.userId, opts.model, opts.promptTokens, opts.completionTokens, opts.service,
    )
    return res.ok ? res.chargedUsd : 0
}

/** Registra+cobra generación de imágenes. Solo se llama con key global. */
export async function logImageUsage(opts: {
    userId: string
    service: string
    count: number
    quality: string
    size: string
}): Promise<number> {
    // Mapear quality/size al modelo de precios de este proyecto.
    const isWide = opts.size === '1792x1024' || opts.size === '1536x1024'
    const isHd = opts.quality === 'premium' || opts.quality === 'hd'
    const model = `dall-e-3${isWide ? '-wide' : ''}${isHd ? '-hd' : ''}`
    const res = await chargeForImage(opts.userId, model, opts.count, opts.service)
    return res.ok ? res.chargedUsd : 0
}

/** Registra+cobra transcripción Whisper. Solo se llama con key global. */
export async function logWhisperUsage(opts: {
    userId: string
    service: string
    durationSec: number
}): Promise<number> {
    const res = await chargeForWhisperSeconds(opts.userId, opts.durationSec, opts.service)
    return res.ok ? res.chargedUsd : 0
}
