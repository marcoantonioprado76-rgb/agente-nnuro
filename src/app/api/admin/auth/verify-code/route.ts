export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { rateLimit, getClientIp, RATE_LIMITS } from '@/lib/rate-limit'
import { verifyTurnstile } from '@/lib/turnstile'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET!

export async function POST(request: NextRequest) {
  const ip = getClientIp(request)

  // Rate limit: 5 intentos por IP en 15 minutos
  const rl = rateLimit(`admin-otp:${ip}`, RATE_LIMITS.adminOtp)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Demasiados intentos. Espera unos minutos.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
    )
  }

  try {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    if (!user.isAdmin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

    const body = await request.json()
    const { code, turnstileToken } = body

    // Turnstile validation
    const turnstileOk = await verifyTurnstile(turnstileToken, ip)
    if (!turnstileOk) {
      return NextResponse.json({ error: 'Verificación de seguridad fallida. Recarga la página.' }, { status: 403 })
    }
    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'Código requerido' }, { status: 400 })
    }

    const record = await prisma.adminOtpCode.findFirst({
      where: {
        userId: user.id,
        code: code.trim(),
        used: false,
        expiresAt: { gt: new Date() },
      },
    })

    if (!record) {
      return NextResponse.json({ error: 'Código incorrecto o expirado' }, { status: 400 })
    }

    // Mark used + clean expired
    await prisma.$transaction([
      prisma.adminOtpCode.update({ where: { id: record.id }, data: { used: true } }),
      prisma.adminOtpCode.deleteMany({
        where: { userId: user.id, OR: [{ used: true }, { expiresAt: { lt: new Date() } }] },
      }),
    ])

    // Issue admin_session cookie (4 hours)
    const sessionToken = jwt.sign({ userId: user.id, adminSession: true }, JWT_SECRET, { expiresIn: '4h' })

    const response = NextResponse.json({ message: 'Acceso concedido' })
    response.cookies.set('admin_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 4,
      path: '/',
    })

    return response
  } catch (err) {
    console.error('[ADMIN-OTP] verify error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
