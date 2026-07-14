export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { sendAdminOtpEmail } from '@/lib/email'
import { randomInt } from 'crypto'

export async function POST() {
  try {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    if (!user.isAdmin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

    // Delete previous unused codes
    await prisma.adminOtpCode.deleteMany({ where: { userId: user.id, used: false } })

    const code = String(randomInt(100000, 1000000))
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 min

    await prisma.adminOtpCode.create({
      data: { userId: user.id, code, expiresAt },
    })

    await sendAdminOtpEmail(user.email, user.fullName, code)

    return NextResponse.json({ message: 'Código enviado' })
  } catch (err) {
    console.error('[ADMIN-OTP] request error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
