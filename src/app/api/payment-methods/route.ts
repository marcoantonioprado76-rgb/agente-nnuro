import { NextResponse } from 'next/server'
import { getPaymentMethodsSettings } from '@/lib/settings'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const methods = await getPaymentMethodsSettings()
    return NextResponse.json(methods)
  } catch (err) {
    console.error('[GET /api/payment-methods]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
