/**
 * Diamond Assistant — API: /groups/import-members
 * POST { agentId, groupJid? } → importa a Contactos los miembros ACTUALES del
 * grupo (o de todos los grupos si no se pasa groupJid), con su número real.
 * No envía ningún mensaje (operación pasiva): solo lee y guarda contactos.
 */
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser, unauthorizedAdmin } from '@/lib/admin-auth'
import { importGroupMembers } from '@/lib/diamond-assistant/diamondBaileys'

export async function POST(req: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  const body = await req.json().catch(() => ({}))
  const agentId = String(body?.agentId ?? '').trim()
  const groupJid = body?.groupJid ? String(body.groupJid).trim() : undefined

  if (!agentId) {
    return NextResponse.json({ ok: false, error: 'Falta el agente.' }, { status: 400 })
  }

  try {
    const result = await importGroupMembers(agentId, groupJid)
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    console.error('[diamond-assistant/groups/import-members]', err)
    return NextResponse.json(
      { ok: false, error: 'No se pudieron importar los miembros del grupo.' },
      { status: 500 },
    )
  }
}
