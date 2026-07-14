export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateToken } from '@/lib/auth'
import { parseUserAgent, getIpGeo } from '@/lib/device-utils'
import { rateLimit, getClientIp, RATE_LIMITS } from '@/lib/rate-limit'
import { verifyTurnstile } from '@/lib/turnstile'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET!

export async function POST(request: NextRequest) {
  const ip = getClientIp(request)

  // Rate limit: 8 intentos por IP en 15 minutos (se omite si IP no detectada)
  if (ip !== 'unknown') {
    const rl = rateLimit(`device-verify:${ip}`, RATE_LIMITS.deviceVerify)
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Demasiados intentos. Espera unos minutos antes de intentar de nuevo.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
      )
    }
  }

  try {
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

    // Read the pending token
    const pendingToken = request.cookies.get('device_pending')?.value
    if (!pendingToken) {
      return NextResponse.json({ error: 'Sesión de verificación expirada. Inicia sesión de nuevo.' }, { status: 401 })
    }

    let payload: { userId: string; deviceId: string }
    try {
      payload = jwt.verify(pendingToken, JWT_SECRET) as { userId: string; deviceId: string }
    } catch {
      return NextResponse.json({ error: 'Sesión de verificación expirada. Inicia sesión de nuevo.' }, { status: 401 })
    }

    const { userId, deviceId } = payload

    // Find a valid code
    const record = await prisma.deviceVerifyCode.findFirst({
      where: {
        userId,
        deviceId,
        code: code.trim(),
        used: false,
        expiresAt: { gt: new Date() },
      },
    })

    if (!record) {
      return NextResponse.json({ error: 'Código incorrecto o expirado' }, { status: 400 })
    }

    // Mark used + clean up all codes for this user (used and expired) to keep DB lean
    await prisma.$transaction([
      prisma.deviceVerifyCode.update({
        where: { id: record.id },
        data: { used: true },
      }),
      prisma.deviceVerifyCode.deleteMany({
        where: {
          userId,
          OR: [{ used: true }, { expiresAt: { lt: new Date() } }],
        },
      }),
    ])

    // Capture IP + UA at registration time (before transaction)
    const ua = request.headers.get('user-agent') || ''
    const { browser, os, deviceType } = parseUserAgent(ua)
    const geo = await getIpGeo(ip)

    // Enforce 1-device limit + register new device in a single atomic transaction
    // so if the create fails, the deleteMany is also rolled back (no data loss)
    await prisma.$transaction([
      prisma.trustedDevice.deleteMany({ where: { userId } }),
      prisma.trustedDevice.create({
        data: {
          userId,
          deviceId,
          label: 'Dispositivo principal',
          ip,
          city: geo.city,
          country: geo.country,
          lat: geo.lat,
          lng: geo.lng,
          browser,
          os,
          deviceType,
        },
      }),
    ])

    // Fetch user to generate auth token
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    const token = generateToken({ userId: user.id, username: user.username, email: user.email })

    const response = NextResponse.json({ message: 'Dispositivo verificado exitosamente' })

    // Set auth_token
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })

    // Set device_id (1 year)
    response.cookies.set('device_id', deviceId, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365,
      path: '/',
    })

    // Clear pending token
    response.cookies.set('device_pending', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Verify device error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
