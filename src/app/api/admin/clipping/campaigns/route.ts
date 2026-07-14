export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

function getAuth() {
  const cookieStore = cookies()
  const token = cookieStore.get('auth_token')?.value
  if (!token) return null
  return verifyToken(token)
}

async function requireAdmin(auth: ReturnType<typeof getAuth>) {
  if (!auth) return false
  const user = await prisma.user.findUnique({ where: { id: auth.userId }, select: { isAdmin: true } })
  return user?.isAdmin === true
}

/** GET /api/admin/clipping/campaigns — list all campaigns */
export async function GET() {
  try {
    const auth = getAuth()
    if (!await requireAdmin(auth)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const campaigns = await prisma.clippingCampaign.findMany({
      include: {
        _count: { select: { submissions: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ campaigns })
  } catch (err) {
    console.error('[GET /api/admin/clipping/campaigns]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

/** POST /api/admin/clipping/campaigns — create a campaign */
export async function POST(request: NextRequest) {
  try {
    const auth = getAuth()
    if (!await requireAdmin(auth)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const body = await request.json()
    const { title, description, platform, cpmUSD, holdHours, minViews, endsAt } = body

    if (!title || !platform || !cpmUSD) {
      return NextResponse.json({ error: 'title, platform y cpmUSD son requeridos' }, { status: 400 })
    }

    if (!['YOUTUBE', 'TIKTOK'].includes(platform)) {
      return NextResponse.json({ error: 'Platform inválida' }, { status: 400 })
    }

    const imageUrls = Array.isArray(body.imageUrls) ? body.imageUrls.filter((u: unknown) => typeof u === 'string') : []

    const campaign = await prisma.clippingCampaign.create({
      data: {
        title,
        description: description || null,
        platform,
        cpmUSD: parseFloat(cpmUSD),
        holdHours: holdHours ? parseInt(holdHours) : 48,
        minViews: minViews ? parseInt(minViews) : 0,
        endsAt: endsAt ? new Date(endsAt) : null,
        imageUrls,
        isActive: true,
      } as any,
    })

    return NextResponse.json({ campaign }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/admin/clipping/campaigns]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

/** PATCH /api/admin/clipping/campaigns — update a campaign */
export async function PATCH(request: NextRequest) {
  try {
    const auth = getAuth()
    if (!await requireAdmin(auth)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const body = await request.json()
    const { id, ...data } = body

    if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })

    const campaign = await prisma.clippingCampaign.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.cpmUSD !== undefined && { cpmUSD: parseFloat(data.cpmUSD) }),
        ...(data.holdHours !== undefined && { holdHours: parseInt(data.holdHours) }),
        ...(data.minViews !== undefined && { minViews: parseInt(data.minViews) }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.endsAt !== undefined && { endsAt: data.endsAt ? new Date(data.endsAt) : null }),
        ...(Array.isArray(data.imageUrls) && { imageUrls: data.imageUrls.filter((u: unknown) => typeof u === 'string') }),
      },
    })

    return NextResponse.json({ campaign })
  } catch (err) {
    console.error('[PATCH /api/admin/clipping/campaigns]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

/** DELETE /api/admin/clipping/campaigns — delete a campaign */
export async function DELETE(request: NextRequest) {
  try {
    const auth = getAuth()
    if (!await requireAdmin(auth)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { id } = await request.json()
    if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })

    await prisma.clippingCampaign.delete({ where: { id } })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[DELETE /api/admin/clipping/campaigns]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
