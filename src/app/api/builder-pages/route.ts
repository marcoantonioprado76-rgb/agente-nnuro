export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getUserLimits } from '@/lib/user-limits'
import { PLAN_NAMES } from '@/lib/plan-limits'

/** GET /api/builder-pages — lista las páginas del constructor visual del usuario */
export async function GET() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const pages = await (prisma as any).builderPage.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true, name: true, slug: true, published: true, views: true,
      createdAt: true, updatedAt: true,
      _count: { select: { leads: true } },
    },
  })
  return NextResponse.json({ pages })
}

function makeSlug(name: string): string {
  const base = (name || 'pagina')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'pagina'
  return `${base}-${Math.random().toString(36).slice(2, 7)}`
}

/** Crea la página reintentando si el slug aleatorio colisiona (unique) — evita 500 por P2002. */
async function createWithUniqueSlug(base: { userId: string; name: string; html: string; css: string; published: boolean; projectData?: unknown }) {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await (prisma as any).builderPage.create({
        data: { ...base, slug: makeSlug(base.name), projectData: base.projectData ?? undefined },
        select: { id: true, name: true, slug: true },
      })
    } catch (e: any) {
      if (e?.code === 'P2002' && attempt < 4) continue // slug repetido → reintentar con otro sufijo
      throw e
    }
  }
}

/** POST /api/builder-pages — crea una página nueva del constructor visual */
export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  // Mismo criterio de plan que las landing pages (Pro/Elite)
  const { plan, limits } = await getUserLimits(user.id)
  if (limits.landingPages === 0) {
    return NextResponse.json({
      error: `El constructor de páginas no está incluido en tu ${PLAN_NAMES[plan]}. Actualiza al Pack Pro para acceder.`,
      limitReached: true, plan,
    }, { status: 403 })
  }
  // Contar contra el límite real del plan (BASIC=1, PRO=3, ELITE=6). Infinity = ilimitado.
  if (limits.landingPages !== Infinity) {
    const count = await (prisma as any).builderPage.count({ where: { userId: user.id } })
    if (count >= limits.landingPages) {
      return NextResponse.json({
        error: `Alcanzaste el límite de tu ${PLAN_NAMES[plan]} (${limits.landingPages} página${limits.landingPages === 1 ? '' : 's'}). Actualizá tu plan o borrá una para crear otra.`,
        limitReached: true, plan,
      }, { status: 403 })
    }
  }

  const body = await req.json().catch(() => ({}))
  const name = String(body?.name || 'Mi página').trim().slice(0, 80) || 'Mi página'

  const page = await createWithUniqueSlug({ userId: user.id, name, html: '', css: '', published: false })
  return NextResponse.json({ page }, { status: 201 })
}
