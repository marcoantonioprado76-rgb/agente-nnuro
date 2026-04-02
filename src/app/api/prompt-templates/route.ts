import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// Public endpoint: returns active prompt templates for users
export async function GET() {
  try {
    const service = await createServiceRoleClient()
    const { data } = await service
      .from('prompt_templates')
      .select('id, name, description, system_prompt, category')
      .eq('is_active', true)
      .order('sort_order')
    return NextResponse.json(data || [])
  } catch {
    return NextResponse.json([])
  }
}
