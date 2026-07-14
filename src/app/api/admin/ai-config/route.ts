export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getAdminUser, unauthorizedAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import { encrypt, decrypt } from '@/lib/ads/encryption'
import { validateApiKey } from '@/lib/ads/openai-ads'

const ENC_KEY = process.env.ADS_ENCRYPTION_KEY || ''

// GET — admin's global OpenAI config
export async function GET() {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  const config = await (prisma as any).adminConfig.findUnique({ where: { id: 'global' } })

  return NextResponse.json({
    hasKey: !!(config?.openaiKeyEnc),
    apiKeyMasked: config?.openaiKeyEnc
      ? '••••••••••••' + decrypt(config.openaiKeyEnc, ENC_KEY).slice(-4)
      : null,
    updatedAt: config?.updatedAt ?? null,
  })
}

// POST — save/update admin's global OpenAI key
export async function POST(req: Request) {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  const { apiKey } = await req.json()
  if (!apiKey || typeof apiKey !== 'string') {
    return NextResponse.json({ error: 'API Key requerida' }, { status: 400 })
  }

  const isValid = await validateApiKey(apiKey.trim())
  if (!isValid) {
    return NextResponse.json({ error: 'La API Key no es válida en OpenAI' }, { status: 400 })
  }

  const openaiKeyEnc = encrypt(apiKey.trim(), ENC_KEY)

  await (prisma as any).adminConfig.upsert({
    where: { id: 'global' },
    create: { id: 'global', openaiKeyEnc },
    update: { openaiKeyEnc },
  })

  return NextResponse.json({
    success: true,
    apiKeyMasked: '••••••••••••' + apiKey.trim().slice(-4),
  })
}

// DELETE — remove admin's global OpenAI key
export async function DELETE() {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  await (prisma as any).adminConfig.update({
    where: { id: 'global' },
    data: { openaiKeyEnc: null },
  })

  return NextResponse.json({ success: true })
}
