export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getAdminUser, unauthorizedAdmin } from '@/lib/admin-auth'

/**
 * GET /api/admin/debug/payment-config
 *
 * Devuelve los valores REALES de las env vars de pago que ve el server en producción.
 * Sólo admin. Útil para diagnosticar desajustes entre el QR y la wallet que verifica el backend.
 */
export async function GET() {
    const admin = await getAdminUser()
    if (!admin) return unauthorizedAdmin()

    const serverWallet = process.env.PAYMENT_RECEIVER ?? ''
    const publicWallet = process.env.NEXT_PUBLIC_PAYMENT_RECEIVER ?? ''
    const bscRpc = process.env.BSC_RPC_URL ?? '(default: bsc-dataseed1.binance.org)'

    return NextResponse.json({
        // La que el backend usa para verificar on-chain (CRÍTICA — debe ser donde llega la plata)
        PAYMENT_RECEIVER: serverWallet,
        PAYMENT_RECEIVER_lowercase: serverWallet.toLowerCase(),
        PAYMENT_RECEIVER_length: serverWallet.length,
        PAYMENT_RECEIVER_isEmpty: !serverWallet,

        // La que el frontend muestra en el QR/UI
        NEXT_PUBLIC_PAYMENT_RECEIVER: publicWallet,

        // Coinciden ambas?
        sameValue: serverWallet.toLowerCase() === publicWallet.toLowerCase(),

        // BSC RPC en uso
        BSC_RPC_URL: bscRpc,

        // Para comparar con el destinatario real de la TX
        comparedWith_TX_destinatario: '0x2b92b1d6c8c5827a701431e59a803ebecc765206',
        wouldMatch: serverWallet.toLowerCase() === '0x2b92b1d6c8c5827a701431e59a803ebecc765206',
    })
}
