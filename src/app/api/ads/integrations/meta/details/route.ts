export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/ads/encryption'

const ENCRYPTION_KEY = process.env.ADS_ENCRYPTION_KEY || ''
const META_API = 'https://graph.facebook.com/v21.0'

async function metaGet(path: string, token: string, params: Record<string, string> = {}) {
    const url = new URL(`${META_API}${path}`)
    url.searchParams.set('access_token', token)
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
    const res = await fetch(url.toString())
    return res.json()
}

function isAuthError(j: any): boolean {
    return j?.error?.code === 190 || j?.error?.type === 'OAuthException'
}

/**
 * GET /api/ads/integrations/meta/details
 * Muestra SOLO lo atado a la conexión del usuario (no todo su Meta):
 *  - Cuenta publicitaria: la conectada (guardada en DB).
 *  - Páginas: las que administra.
 *  - Instagram: el vinculado a esas páginas.
 *  - WhatsApp: los números de los WABA del/los business de esas páginas.
 *  - Admin comercial: solo el/los business dueños de esas páginas.
 * Si el token expiró → { needsReconnect: true }.
 */
export async function GET() {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const integration = await prisma.adIntegration.findUnique({
        where: { userId_platform: { userId: user.id, platform: 'META' } },
        include: { token: true, connectedAccount: true },
    })
    if (!integration?.token) return NextResponse.json({ error: 'Meta no conectado' }, { status: 400 })

    let token: string
    try { token = decrypt(integration.token.accessTokenEncrypted, ENCRYPTION_KEY) }
    catch { return NextResponse.json({ error: 'Token inválido — reconecta Meta', needsReconnect: true }, { status: 200 }) }

    const connectedAdAccount = integration.connectedAccount ? {
        id: integration.connectedAccount.providerAccountId,
        name: integration.connectedAccount.displayName,
        currency: integration.connectedAccount.currency,
    } : null

    // ── Páginas (+ su business + Instagram, los dos tipos de vínculo) ──
    const pagesRes = await metaGet('/me/accounts', token, {
        fields: 'id,name,business{id,name},instagram_business_account{username},connected_instagram_account{username}',
        limit: '50',
    })
    if (isAuthError(pagesRes)) {
        return NextResponse.json({
            needsReconnect: true,
            error: 'Tu sesión de Meta expiró. Reconectá Meta para ver páginas, Instagram y WhatsApp.',
            connectedAdAccount,
            adAccounts: [], pages: [], whatsappNumbers: [], instagrams: [], businesses: [],
        })
    }

    const pagesData: any[] = pagesRes?.data || []
    const pages = pagesData.map(p => ({
        id: p.id,
        name: p.name,
        instagram: p.instagram_business_account?.username || p.connected_instagram_account?.username || null,
    }))
    const instagrams = Array.from(new Set(
        pagesData
            .map(p => p.instagram_business_account?.username || p.connected_instagram_account?.username)
            .filter(Boolean)
            .map((u: string) => `@${u}`)
    ))

    // ── Admin comercial: SOLO los business dueños de las páginas del usuario (no todos) ──
    const bizMap = new Map<string, string>()
    for (const p of pagesData) {
        if (p.business?.id) bizMap.set(String(p.business.id), String(p.business.name || p.business.id))
    }
    const businesses = Array.from(bizMap, ([id, name]) => ({ id, name }))

    // ── WhatsApp: por cada business (de las páginas) → owned/client WABAs → phone_numbers ──
    const whatsappSet = new Set<string>()
    for (const b of businesses) {
        for (const edge of ['owned_whatsapp_business_accounts', 'client_whatsapp_business_accounts']) {
            try {
                const wabas = await metaGet(`/${b.id}/${edge}`, token, { fields: 'id,name', limit: '50' })
                for (const w of (wabas?.data || [])) {
                    const ph = await metaGet(`/${w.id}/phone_numbers`, token, { fields: 'display_phone_number,verified_name' })
                    for (const phone of (ph?.data || [])) {
                        if (phone.display_phone_number) whatsappSet.add(phone.display_phone_number)
                    }
                }
            } catch { /* este business no da acceso → seguir */ }
        }
    }
    const whatsappNumbers = Array.from(whatsappSet)

    return NextResponse.json({
        needsReconnect: false,
        connectedAdAccount,
        adAccounts: [],   // solo mostramos la cuenta conectada (no todas las del usuario)
        pages,
        whatsappNumbers,
        instagrams,
        businesses,
    })
}
