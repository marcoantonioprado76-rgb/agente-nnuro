export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getOrgAdmin, unauthorizedOrg } from '@/lib/org-auth'
import { prisma } from '@/lib/prisma'

const FIELDS = ['payUsdtWallet', 'payUsdtNetwork', 'payBankInfo', 'payQrUrl', 'payInstructions', 'logoUrl'] as const

const SELECT = {
  name: true, slug: true, logoUrl: true,
  payUsdtWallet: true, payUsdtNetwork: true, payBankInfo: true, payQrUrl: true, payInstructions: true,
} as const

// GET /api/empresa/settings → config de cobro/marca de SU empresa
export async function GET() {
  try {
    const auth = await getOrgAdmin()
    if (!auth) return unauthorizedOrg()
    const settings = await prisma.organization.findUnique({
      where: { id: auth.organizationId },
      select: SELECT,
    })
    return NextResponse.json({ settings })
  } catch (e) {
    console.error('[GET /api/empresa/settings]', e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// PATCH → actualiza la config de cobro/marca de SU empresa
export async function PATCH(req: Request) {
  try {
    const auth = await getOrgAdmin()
    if (!auth) return unauthorizedOrg()
    const body = await req.json().catch(() => ({}))
    const data: Record<string, string | null> = {}
    for (const k of FIELDS) {
      if (body[k] !== undefined) data[k] = body[k] ? String(body[k]).trim() : null
    }
    const settings = await prisma.organization.update({
      where: { id: auth.organizationId },
      data,
      select: SELECT,
    })
    return NextResponse.json({ settings })
  } catch (e) {
    console.error('[PATCH /api/empresa/settings]', e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
