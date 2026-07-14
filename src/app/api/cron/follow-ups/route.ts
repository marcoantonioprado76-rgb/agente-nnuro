import { NextResponse } from 'next/server'
import { processFollowUps } from '@/lib/follow-up-worker'

export const dynamic = 'force-dynamic'

/**
 * Endpoint para disparar los seguimientos automáticos.
 * Se puede llamar cada minuto.
 */
export async function GET(req: Request) {
    try {
        // Opcional: Verificar un token secreto en el header para seguridad en producción
        const authHeader = req.headers.get('authorization')
        if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        await processFollowUps()
        return NextResponse.json({ success: true, timestamp: new Date().toISOString() })
    } catch (err: any) {
        console.error('[CRON] Error en la ejecución de seguimientos:', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
