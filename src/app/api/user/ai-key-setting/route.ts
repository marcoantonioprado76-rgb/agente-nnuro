export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'
import { getGlobalOpenAIKey } from '@/lib/ai-credits'

export async function GET() {
  try {
    const session = await getServerSession()
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const globalKeyAvailable = !!(await getGlobalOpenAIKey())
    return NextResponse.json({ useGlobalAiKey: false, globalKeyAvailable })
  } catch (err) {
    console.error('[GET /api/user/ai-key-setting]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function PATCH(_req: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const globalKeyAvailable = !!(await getGlobalOpenAIKey())
    if (!globalKeyAvailable) {
      return NextResponse.json({ error: 'El administrador aún no ha configurado la API key global.' }, { status: 400 })
    }

    return NextResponse.json({ ok: true, useGlobalAiKey: false })
  } catch (err) {
    console.error('[PATCH /api/user/ai-key-setting]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
