export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getUserLimits } from '@/lib/user-limits'
import { PLAN_NAMES } from '@/lib/plan-limits'

function makeSlug(name: string): string {
  const base = (name || 'pagina')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'pagina'
  return `${base}-${Math.random().toString(36).slice(2, 7)}`
}

/**
 * POST /api/builder-pages/import — crea una COPIA de una página compartida en la cuenta del
 * usuario actual, a partir de su `token` de compartir. La original NO se toca (es una copia).
 */
export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const token = body?.token ? String(body.token).trim() : ''
  if (!token) return NextResponse.json({ error: 'Enlace inválido' }, { status: 400 })

  const src = await (prisma as any).builderPage.findUnique({
    where: { shareToken: token },
    select: { name: true, html: true, css: true, projectData: true },
  })
  if (!src) return NextResponse.json({ error: 'El enlace ya no es válido o fue revocado.' }, { status: 404 })

  // Mismo criterio de plan que crear (Pro/Elite)
  const { plan, limits } = await getUserLimits(user.id)
  if (limits.landingPages === 0) {
    return NextResponse.json({
      error: `El constructor de páginas no está incluido en tu ${PLAN_NAMES[plan]}. Actualiza al Pack Pro para acceder.`,
      limitReached: true, plan,
    }, { status: 403 })
  }
  // Contar contra el límite real del plan (importar una copia también consume cupo).
  if (limits.landingPages !== Infinity) {
    const count = await (prisma as any).builderPage.count({ where: { userId: user.id } })
    if (count >= limits.landingPages) {
      return NextResponse.json({
        error: `Alcanzaste el límite de tu ${PLAN_NAMES[plan]} (${limits.landingPages} página${limits.landingPages === 1 ? '' : 's'}). Actualizá tu plan o borrá una para importar otra.`,
        limitReached: true, plan,
      }, { status: 403 })
    }
  }

  const name = `${src.name || 'Página'} (copia)`.slice(0, 80)
  let page
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      page = await (prisma as any).builderPage.create({
        data: {
          userId: user.id, name, slug: makeSlug(name),
          html: src.html || '', css: src.css || '',
          projectData: src.projectData ?? undefined, published: false,
        },
        select: { id: true },
      })
      break
    } catch (e: any) {
      if (e?.code === 'P2002' && attempt < 4) continue // slug repetido → reintentar
      throw e
    }
  }
  return NextResponse.json({ page })
}
