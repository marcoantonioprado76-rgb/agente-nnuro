export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'
import { getGlobalOpenAIKey } from '@/lib/ai-credits'

export async function GET() {
  const session = await getServerSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const globalKeyAvailable = !!(await getGlobalOpenAIKey())
  return NextResponse.json({ useGlobalAiKey: false, globalKeyAvailable })
}

export async function PATCH(_req: NextRequest) {
  const session = await getServerSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const globalKeyAvailable = !!(await getGlobalOpenAIKey())
  if (!globalKeyAvailable) {
    return NextResponse.json({ error: 'El administrador aún no ha configurado la API key global.' }, { status: 400 })
  }

  return NextResponse.json({ ok: true, useGlobalAiKey: false })
}
