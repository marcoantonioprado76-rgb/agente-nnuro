export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET: search users by name or username
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user || !(user as any).isAdmin) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const q = request.nextUrl.searchParams.get('q')?.trim()
    if (!q || q.length < 2) {
      return NextResponse.json({ users: [] })
    }

    const users = await prisma.user.findMany({
      where: {
        OR: [
          { username: { contains: q, mode: 'insensitive' } },
          { fullName: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: { id: true, username: true, fullName: true, email: true, plan: true },
      take: 10,
      orderBy: { fullName: 'asc' },
    })

    return NextResponse.json({ users })
  } catch (err) {
    console.error('[GET /api/admin/bonuses]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// POST: assign extra bonus to a user
export async function POST(request: NextRequest) {
  try {
    const admin = await getAuthUser()
    if (!admin || !(admin as any).isAdmin) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const body = await request.json()
    const { userId, amount, description } = body

    if (!userId) {
      return NextResponse.json({ error: 'Usuario requerido' }, { status: 400 })
    }

    const parsedAmount = parseFloat(amount)
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json({ error: 'Monto inválido' }, { status: 400 })
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, fullName: true, username: true },
    })
    if (!targetUser) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    // El sistema de comisiones fue eliminado. Se usa ClippingPayout para bonos manuales.
    const payout = await prisma.clippingPayout.create({
      data: {
        userId,
        amountUSD: parsedAmount,
        description: description?.trim() || `Bono extra asignado por administrador`,
      },
    })

    return NextResponse.json({
      success: true,
      payout: { ...payout, amountUSD: Number(payout.amountUSD) },
      message: `Bono de $${parsedAmount.toFixed(2)} acreditado a ${targetUser.fullName}`,
    })
  } catch (err) {
    console.error('[POST /api/admin/bonuses]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
