import { createServiceRoleClient } from '@/lib/supabase/server'

export interface TransferDetails {
  bank_name: string
  account_holder: string
  account_number: string
  account_type: string
  document_id: string
  cci: string
  qr_image_url: string
  instructions: string
}

export interface PaymentMethods {
  stripe: boolean
  transfer: boolean
  transfer_details: TransferDetails
}

const TRANSFER_DEFAULTS: TransferDetails = {
  bank_name: '',
  account_holder: '',
  account_number: '',
  account_type: '',
  document_id: '',
  cci: '',
  qr_image_url: '',
  instructions: '',
}

const DEFAULTS: PaymentMethods = {
  stripe: true,
  transfer: true,
  transfer_details: TRANSFER_DEFAULTS,
}

export async function getPaymentMethodsSettings(): Promise<PaymentMethods> {
  try {
    const service = await createServiceRoleClient()
    const { data } = await service
      .from('system_settings')
      .select('key, value')
      .in('key', ['payment_methods', 'payment_transfer_details'])

    let methods: Partial<PaymentMethods> = {}
    let details: Partial<TransferDetails> = {}

    for (const row of data || []) {
      if (row.key === 'payment_methods') methods = row.value as Partial<PaymentMethods>
      if (row.key === 'payment_transfer_details') details = row.value as Partial<TransferDetails>
    }

    return {
      stripe: methods.stripe ?? DEFAULTS.stripe,
      transfer: methods.transfer ?? DEFAULTS.transfer,
      transfer_details: { ...TRANSFER_DEFAULTS, ...details },
    }
  } catch {
    return DEFAULTS
  }
}
