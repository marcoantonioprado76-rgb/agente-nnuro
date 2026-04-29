import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession()
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const { id } = await params

    const { data: messages } = await db
      .from('messages')
      .select('id, role, type, content, created_at')
      .eq('conversation_id', id)
      .eq('buffered', false)
      .order('created_at', { ascending: true })

    const mapped = (messages || []).map((m: any) => ({
      id: m.id,
      sender: m.role === 'assistant' ? 'bot' : 'client',
      type: m.type,
      content: m.content,
      created_at: m.created_at,
    }))

    return NextResponse.json({ messages: mapped })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
