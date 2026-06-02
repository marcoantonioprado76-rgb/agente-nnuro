import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'
import { getGlobalOpenAIKey, setGlobalOpenAIKey } from '@/lib/ai-credits'
import { logAudit } from '@/lib/audit'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/settings/openai-key
 * Devuelve solo metadata (existe / preview enmascarado), NUNCA la key completa.
 * Admin-only.
 */
export async function GET() {
  try {
    const session = await getServerSession()
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const key = await getGlobalOpenAIKey()
    if (!key) {
      return NextResponse.json({ configured: false })
    }

    // Preview: primeros 7 + últimos 4 chars (formato sk-xxxxxxx...XXXX)
    const preview = key.length > 13
      ? `${key.slice(0, 7)}…${key.slice(-4)}`
      : '…'

    return NextResponse.json({
      configured: true,
      preview,
      length: key.length,
    })
  } catch (err) {
    console.error('[GET /api/admin/settings/openai-key]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

/**
 * POST /api/admin/settings/openai-key
 * Body: { key: string }   // sk-...
 * Encripta y guarda la global OpenAI key.
 * Admin-only.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const key = String(body?.key ?? '').trim()

    if (!key) {
      return NextResponse.json({ error: 'La key es requerida' }, { status: 400 })
    }
    if (!key.startsWith('sk-') || key.length < 20) {
      return NextResponse.json(
        { error: 'Formato de key inválido. Debe empezar con sk- y tener al menos 20 caracteres.' },
        { status: 400 }
      )
    }

    await setGlobalOpenAIKey(key)

    await logAudit({
      userId: session.sub,
      action: 'cambiar_configuracion',
      entityType: 'configuracion',
      details: {
        setting: 'openai_global_key',
        action: 'set',
        key_length: key.length,
      },
    })

    return NextResponse.json({ ok: true, configured: true })
  } catch (err) {
    console.error('[POST /api/admin/settings/openai-key]', err)
    return NextResponse.json({ error: 'Error interno al guardar la key' }, { status: 500 })
  }
}
