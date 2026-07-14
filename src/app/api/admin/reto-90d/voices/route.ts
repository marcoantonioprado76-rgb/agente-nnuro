export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getAdminUser, unauthorizedAdmin } from '@/lib/admin-auth'
import { getRetoVoice } from '@/lib/whatsapp/reto90dSender'
import { BOT_VOICES } from '@/lib/voices'

// GET → voces disponibles para el selector. Si hay key de ElevenLabs (panel o
// entorno), lista las voces de esa cuenta; si no, devuelve el catálogo interno.
export async function GET() {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  const { apiKey } = await getRetoVoice()
  const catalog = () => BOT_VOICES.map((v) => ({ id: v.id, name: v.name, desc: v.desc }))

  if (!apiKey) {
    return NextResponse.json({ source: 'catalog', voices: catalog() })
  }

  try {
    const res = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: { 'xi-api-key': apiKey },
    })
    if (!res.ok) throw new Error(`ElevenLabs ${res.status}`)
    const data = await res.json()
    const voices = (data.voices || []).map((v: any) => ({
      id: v.voice_id,
      name: v.name,
      desc: v.labels?.accent || v.labels?.description || v.category || '',
    }))
    if (!voices.length) return NextResponse.json({ source: 'catalog', voices: catalog() })
    return NextResponse.json({ source: 'elevenlabs', voices })
  } catch (e) {
    // Fallback al catálogo interno; no filtramos el detalle del error al cliente.
    console.error('[reto90d/voices] error:', e)
    return NextResponse.json({ source: 'catalog', voices: catalog(), error: 'No se pudieron cargar las voces' })
  }
}
