export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'
import fs from 'fs'
import path from 'path'

const SESSIONS_DIR = process.env.WHATSAPP_SESSIONS_DIR || process.env.BAILEYS_SESSIONS_DIR || path.join(process.cwd(), 'baileys-sessions')

export async function GET(_req: NextRequest, { params }: { params: { botId: string } }) {
  const session = await getServerSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { botId } = params
  const results: Record<string, unknown> = {}

  // Check session dirs
  const candidates = [
    path.join(SESSIONS_DIR, botId),
    path.join(process.cwd(), 'baileys-sessions', botId),
    path.join('/tmp', 'baileys-sessions', botId),
  ]
  results.sessionDirCandidates = candidates.map(dir => {
    try {
      fs.mkdirSync(dir, { recursive: true })
      const files = fs.readdirSync(dir)
      return { dir, writable: true, files }
    } catch (e) {
      return { dir, writable: false, error: (e as Error).message }
    }
  })

  // Check pino
  try {
    require('pino')
    results.pino = 'available'
  } catch (e) {
    results.pino = `missing: ${(e as Error).message}`
  }

  // Check fetchLatestBaileysVersion
  try {
    const { fetchLatestBaileysVersion } = await import('@whiskeysockets/baileys')
    const { version } = await fetchLatestBaileysVersion()
    results.baileysVersion = version
  } catch (e) {
    results.baileysVersion = `error: ${(e as Error).message}`
  }

  // Env vars
  results.env = {
    WHATSAPP_SESSIONS_DIR: process.env.WHATSAPP_SESSIONS_DIR || 'not set',
    BAILEYS_SESSIONS_DIR: process.env.BAILEYS_SESSIONS_DIR || 'not set',
    NODE_ENV: process.env.NODE_ENV,
    cwd: process.cwd(),
  }

  return NextResponse.json(results)
}
