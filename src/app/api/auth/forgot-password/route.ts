export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendPasswordResetEmail } from '@/lib/email'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'El correo es obligatorio' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { email } })

    // Siempre respondemos con exito para no revelar si el email existe
    if (!user) {
      return NextResponse.json({
        message: 'Si el correo existe, recibiras un enlace de recuperacion'
      })
    }

    // Invalidar tokens anteriores
    await prisma.passwordResetToken.updateMany({
      where: { userId: user.id, used: false },
      data: { used: true }
    })

    // Crear nuevo token
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hora

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      }
    })

    await sendPasswordResetEmail(email, token)

    return NextResponse.json({
      message: 'Si el correo existe, recibiras un enlace de recuperacion'
    })
  } catch (error) {
    console.error('Forgot password error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
