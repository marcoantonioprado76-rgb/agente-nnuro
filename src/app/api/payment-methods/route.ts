import { NextResponse } from 'next/server'
import { getPaymentMethodsSettings } from '@/lib/settings'

export const dynamic = 'force-dynamic'

// GET /api/payment-methods — public, returns enabled payment methods
export async function GET() {
  const methods = await getPaymentMethodsSettings()
  return NextResponse.json(methods)
}
