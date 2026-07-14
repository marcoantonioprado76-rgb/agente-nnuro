export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { encrypt, decrypt } from '@/lib/ads/encryption'
import { validateApiKey } from '@/lib/ads/openai-ads'

const ENC_KEY = process.env.ADS_ENCRYPTION_KEY || ''

export async function GET() {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const config = await (prisma as any).openAIConfig.findUnique({
        where: { userId: user.id }
    })

    if (!config) return NextResponse.json({ config: null })

    let apiKeyMasked = '••••••••••••????'
    try {
        apiKeyMasked = '••••••••••••' + decrypt(config.apiKeyEnc, ENC_KEY).slice(-4)
    } catch (e) {
        console.error('[OpenAI Config GET] Failed to decrypt API key:', e)
    }

    return NextResponse.json({
        config: {
            id: config.id,
            model: config.model,
            isValid: config.isValid,
            validatedAt: config.validatedAt,
            apiKeyMasked,
        }
    })
}

export async function POST(req: Request) {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { apiKey, model = 'gpt-4o' } = await req.json()
    if (!apiKey || typeof apiKey !== 'string') {
        return NextResponse.json({ error: 'API Key requerida' }, { status: 400 })
    }

    // Validate the key first
    const isValid = await validateApiKey(apiKey.trim())

    const apiKeyEnc = encrypt(apiKey.trim(), ENC_KEY)

    const config = await (prisma as any).openAIConfig.upsert({
        where: { userId: user.id },
        create: {
            userId: user.id,
            apiKeyEnc,
            model,
            isValid,
            validatedAt: isValid ? new Date() : null
        },
        update: {
            apiKeyEnc,
            model,
            isValid,
            validatedAt: isValid ? new Date() : null
        }
    })

    return NextResponse.json({
        success: true,
        isValid,
        config: {
            id: config.id,
            model: config.model,
            isValid: config.isValid,
            apiKeyMasked: '••••••••••••' + apiKey.trim().slice(-4)
        }
    })
}

export async function DELETE() {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await (prisma as any).openAIConfig.deleteMany({ where: { userId: user.id } })
    return NextResponse.json({ success: true })
}
