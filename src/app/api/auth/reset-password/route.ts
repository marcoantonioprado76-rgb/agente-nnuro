export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { token, password, confirmPassword } = await request.json()

    if (!token || !password || !confirmPassword) {
      return NextResponse.json({ error: 'Todos los campos son obligatorios' }, { status: 400 })
    }

    if (password !== confirmPassword) {
      return NextResponse.json({ error: 'Las contrasenas no coinciden' }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'La contrasena debe tener al menos 8 caracteres' }, { status: 400 })
    }

    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true }
    })

    if (!resetToken || resetToken.used || resetToken.expiresAt < new Date()) {
      return NextResponse.json({ error: 'El enlace es invalido o ha expirado' }, { status: 400 })
    }

    const passwordHash = await hashPassword(password)

    await prisma.user.update({
      where: { id: resetToken.userId },
      data: { passwordHash }
    })

    await prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { used: true }
    })

    return NextResponse.json({ message: 'Contrasena actualizada exitosamente' })
  } catch (error) {
    console.error('Reset password error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
