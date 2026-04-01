import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getWhatsAppManager } from '@/lib/whatsapp/manager'

export const dynamic = 'force-dynamic'

/** Verify the caller is an authenticated admin */
async function requireAdmin() {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  return profile?.role === 'admin' ? user : null
}

export async function GET() {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const manager = getWhatsAppManager()
  const report = manager.diagnose()
  return NextResponse.json({
    timestamp: new Date().toISOString(),
    sessions: report,
    totalSessions: report.length,
  })
}

/**
 * POST /api/whatsapp/diagnose
 * Send a test message to verify the socket works
 * Body: { "phone": "1234567890", "text": "test", "botId": "uuid" }
 */
export async function POST(request: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const { phone, text, botId } = await request.json()
    if (!phone || !text || !botId) {
      return NextResponse.json({ error: 'phone, text, and botId are required' }, { status: 400 })
    }

    const manager = getWhatsAppManager()
    const sent = await manager.sendMessage(botId, phone, text)

    return NextResponse.json({ sent, botId, phone, text })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
