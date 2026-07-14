export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { decrypt } from '@/lib/crypto'
import { BaileysManager } from '@/lib/baileys-manager'

function getAuth() {
    const token = cookies().get('auth_token')?.value
    if (!token) return null
    return verifyToken(token)
}

/**
 * POST /api/bots/[botId]/baileys/connect — inicia la conexión Baileys y genera QR.
 *
 * Soporta dos modos para la API key de OpenAI:
 *  1. Bot con key propia configurada (BotSecret.openaiApiKeyEnc): se usa la suya.
 *  2. Bot sin key propia: usa la key admin global (con cobro de saldo USD por
 *     mensaje vía chargeUserForAI desde baileys-manager).
 *
 * Todo el cuerpo va en try/catch para garantizar que SIEMPRE se devuelva JSON
 * (sin esto, una excepción al hacer decrypt('') lanzaba HTML 500 y el frontend
 * crasheaba con 'Failed to execute json on Response: Unexpected end of JSON input').
 */
export async function POST(
    _req: NextRequest,
    { params }: { params: { botId: string } },
) {
    try {
        const auth = getAuth()
        if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

        const bot = await prisma.bot.findFirst({
            where: { id: params.botId, userId: auth.userId, type: 'BAILEYS' },
            include: { secret: true },
        })
        if (!bot) return NextResponse.json({ error: 'Bot no encontrado' }, { status: 404 })
        if (!bot.secret) return NextResponse.json({ error: 'Configurá las credenciales primero (al menos el teléfono de reporte).' }, { status: 400 })

        // Resolver la key de OpenAI: si el bot tiene su propia, la usamos;
        // si no, verificamos que el sistema tenga key admin disponible.
        let openaiKey = ''
        if (bot.secret.openaiApiKeyEnc) {
            try {
                openaiKey = decrypt(bot.secret.openaiApiKeyEnc)
            } catch {
                openaiKey = ''
            }
        }

        // Si el bot no tiene su key propia, validamos que el admin tenga una
        // global configurada. No cobramos saldo acá — el cobro se hace por
        // cada mensaje entrante en baileys-manager con chargeUserForAI.
        if (!openaiKey) {
            const [globalKey, adminCfg] = await Promise.all([
                (prisma as any).appSetting.findUnique({ where: { key: 'openai_global_key' } }),
                (prisma as any).adminConfig.findUnique({ where: { id: 'global' } }),
            ])
            const hasAdminFallback = !!(globalKey?.value) || !!(adminCfg?.openaiKeyEnc)
            if (!hasAdminFallback) {
                return NextResponse.json({
                    error: 'No hay API Key de OpenAI disponible. Configurá la tuya en la tab Credenciales o pedile al admin que active la key global del sistema.',
                }, { status: 400 })
            }
            // Si el usuario está usando la key admin, validamos saldo > 0 (informativo)
            const u = await prisma.user.findUnique({
                where: { id: auth.userId },
                select: { aiBalanceUsd: true },
            })
            const balance = u?.aiBalanceUsd ? Number(u.aiBalanceUsd) : 0
            if (balance <= 0) {
                console.warn(`[BAILEYS connect] Bot ${bot.id} se conecta sin key propia y sin saldo USD (${balance}). Los mensajes entrantes no se procesarán hasta que el usuario recargue saldo.`)
            }
        }

        // Iniciar conexión en background (no bloquea el response).
        // forceFresh: el usuario pulsó "Conectar" en el panel → siempre arrancar sesión
        // nueva (borra la sesión vieja/corrupta en disco) para GARANTIZAR que salga el QR.
        // Si el bot ya está realmente conectado, connect() retorna sin hacer nada.
        BaileysManager.connect(
            bot.id,
            bot.name,
            openaiKey,                       // puede ser '' — baileys-manager hará fallback dinámico
            bot.secret.reportPhone ?? '',
            { forceFresh: true },
        ).catch(err => console.error('[BAILEYS] connect error:', err))

        return NextResponse.json({ ok: true })
    } catch (err: any) {
        console.error('[POST /api/bots/[botId]/baileys/connect]', err)
        return NextResponse.json({
            error: err?.message || 'Error interno al iniciar la conexión Baileys',
        }, { status: 500 })
    }
}
