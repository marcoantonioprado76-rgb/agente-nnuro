export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword, generateToken } from '@/lib/auth'
import { sendWelcomeEmail } from '@/lib/email'
import { rateLimit, getClientIp, RATE_LIMITS } from '@/lib/rate-limit'
import { verifyTurnstile } from '@/lib/turnstile'

export async function POST(request: NextRequest) {
  const ip = getClientIp(request)
  const rl = rateLimit(`register:${ip}`, RATE_LIMITS.register)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Demasiados registros desde esta dirección. Intenta más tarde.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
    )
  }

  try {
    const body = await request.json()
    const {
      username, email, password, confirmPassword,
      fullName, country, city, identityDocument,
      dateOfBirth, acceptTerms, turnstileToken, empresa
    } = body

    // Turnstile anti-bot (solo en producción)
    if (process.env.NODE_ENV === 'production') {
      const turnstileOk = await verifyTurnstile(turnstileToken, ip)
      if (!turnstileOk) {
        return NextResponse.json({ error: 'Verificación de seguridad fallida. Recarga la página.' }, { status: 403 })
      }
    }

    if (!username || !email || !password || !fullName || !country || !city ||
        !identityDocument || !dateOfBirth || !acceptTerms) {
      return NextResponse.json({ error: 'Todos los campos son obligatorios' }, { status: 400 })
    }

    if (password !== confirmPassword) {
      return NextResponse.json({ error: 'Las contraseñas no coinciden' }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'La contraseña debe tener al menos 8 caracteres' }, { status: 400 })
    }

    if (!/(?=.*[A-Z])(?=.*[0-9])/.test(password)) {
      return NextResponse.json({ error: 'La contraseña debe contener al menos una mayúscula y un número' }, { status: 400 })
    }

    if (!acceptTerms) {
      return NextResponse.json({ error: 'Debe aceptar los términos y condiciones' }, { status: 400 })
    }

    const dob = new Date(dateOfBirth)
    if (isNaN(dob.getTime())) {
      return NextResponse.json({ error: 'Fecha de nacimiento inválida' }, { status: 400 })
    }
    const today = new Date()
    let age = today.getFullYear() - dob.getFullYear()
    const m = today.getMonth() - dob.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--
    if (age < 18) {
      return NextResponse.json({ error: 'Debe ser mayor de 18 años' }, { status: 400 })
    }

    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ username }, { email }, { identityDocument }] }
    })
    if (existingUser) {
      if (existingUser.username === username) {
        return NextResponse.json({ error: 'El nombre de usuario ya está registrado' }, { status: 400 })
      }
      if (existingUser.email === email) {
        return NextResponse.json({ error: 'El correo electrónico ya está registrado' }, { status: 400 })
      }
      return NextResponse.json({ error: 'La cédula/pasaporte ya está registrado' }, { status: 400 })
    }

    const passwordHash = await hashPassword(password)

    // Pack Empresarial: si viene de un link de invitación de empresa (?empresa=slug),
    // lo unimos automáticamente a esa empresa como usuario (el admin de empresa luego lo activa).
    let orgFields: { organizationId?: string; orgRole?: 'ORG_USER' } = {}
    if (empresa) {
      const org = await prisma.organization.findUnique({
        where: { slug: String(empresa) },
        select: { id: true, active: true },
      })
      if (org && org.active) orgFields = { organizationId: org.id, orgRole: 'ORG_USER' }
    }

    const newUser = await prisma.user.create({
      data: {
        username,
        email,
        passwordHash,
        fullName,
        country,
        city,
        identityDocument,
        dateOfBirth: new Date(dateOfBirth),
        ...orgFields,
      }
    })

    await sendWelcomeEmail(email, fullName)

    const token = generateToken({
      userId: newUser.id,
      username: newUser.username,
      email: newUser.email,
    })

    const response = NextResponse.json({
      message: 'Registro exitoso',
      user: {
        id: newUser.id,
        username: newUser.username,
        fullName: newUser.fullName,
      }
    }, { status: 201 })

    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
