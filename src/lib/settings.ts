import { createServiceRoleClient } from '@/lib/supabase/server'

interface PaymentMethods {
  stripe: boolean
  transfer: boolean
}

const DEFAULTS: PaymentMethods = { stripe: true, transfer: true }

export async function getPaymentMethodsSettings(): Promise<PaymentMethods> {
  try {
    const service = await createServiceRoleClient()
    const { data } = await service
      .from('system_settings')
      .select('value')
      .eq('key', 'payment_methods')
      .single()

    if (!data?.value) return DEFAULTS
    return { ...DEFAULTS, ...(data.value as Partial<PaymentMethods>) }
  } catch {
    return DEFAULTS
  }
}
