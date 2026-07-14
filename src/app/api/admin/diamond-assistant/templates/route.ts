/**
 * Diamond Assistant — Lista las PLANTILLAS aprobadas de WhatsApp (YCloud) del
 * agente. Se usan para enviar campañas FUERA de la ventana de 24h.
 *
 * GET /api/admin/diamond-assistant/templates?agentId=...
 *   → { ok, templates: [{ name, language, category, status, body, params }] }
 *   params: nombres/posiciones de variables del cuerpo (para rellenar).
 */
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser, unauthorizedAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/crypto'

const YCLOUD_BASE = 'https://api.ycloud.com/v2'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractBody(components: any[]): { text: string; params: string[] } {
  const body = Array.isArray(components) ? components.find((c) => c?.type === 'BODY') : null
  const text: string = body?.text ?? ''
  // Variables: nombradas ({{nombre}}) o posicionales ({{1}}). Guardamos el token interno.
  const matches = text.match(/\{\{\s*([\w-]+)\s*\}\}/g) ?? []
  const params = matches.map((m) => m.replace(/[{}\s]/g, ''))
  return { text, params }
}

export async function GET(req: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  const agentId = req.nextUrl.searchParams.get('agentId')?.trim()
  if (!agentId) return NextResponse.json({ ok: false, error: 'Falta agentId.' }, { status: 400 })

  const agent = await prisma.assistantAgent.findUnique({
    where: { id: agentId },
    select: { provider: true, providerApiKeyEnc: true },
  })
  if (!agent) return NextResponse.json({ ok: false, error: 'Agente no encontrado.' }, { status: 404 })
  if (agent.provider !== 'YCLOUD' || !agent.providerApiKeyEnc) {
    // Solo YCloud tiene plantillas aprobadas. No es error: devolvemos lista vacía.
    return NextResponse.json({ ok: true, templates: [], reason: 'El agente no usa YCloud.' })
  }

  let apiKey = ''
  try { apiKey = decrypt(agent.providerApiKeyEnc) } catch { apiKey = '' }
  if (!apiKey) return NextResponse.json({ ok: false, error: 'No se pudo leer la API key del agente.' }, { status: 500 })

  try {
    const res = await fetch(`${YCLOUD_BASE}/whatsapp/templates?limit=100`, {
      headers: { 'X-API-Key': apiKey },
      cache: 'no-store',
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      return NextResponse.json({ ok: false, error: 'YCloud rechazó la consulta de plantillas.' }, { status: 502 })
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const items: any[] = data.items ?? data.data ?? []
    const templates = items
      .filter((t) => String(t?.status).toUpperCase() === 'APPROVED')
      .map((t) => {
        const { text, params } = extractBody(t.components ?? [])
        return {
          name: t.name as string,
          language: (t.language ?? 'es_ES') as string,
          category: (t.category ?? '') as string,
          body: text,
          params, // tokens de variables (para rellenar con nombre o valor fijo)
        }
      })
    return NextResponse.json({ ok: true, templates })
  } catch (err) {
    console.error('[DIAMOND templates] error:', err)
    return NextResponse.json({ ok: false, error: 'Error al consultar plantillas.' }, { status: 500 })
  }
}
