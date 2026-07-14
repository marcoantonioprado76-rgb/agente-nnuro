import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'
import { prisma } from './prisma'

const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET env variable is not set. The application cannot start without it.')
}

export interface JWTPayload {
  userId: string
  username: string
  email: string
  /** Si está presente, la sesión es una impersonación: id del admin que la inició
   *  (para poder volver al panel admin). Ausente en sesiones normales. */
  imp?: string
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET as string, { expiresIn: '7d' })
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET as string) as JWTPayload
  } catch {
    return null
  }
}

/**
 * Obtiene el usuario autenticado con UN SOLO query a la base de datos.
 * Antes eran 2 queries (findUnique + $queryRaw para el plan).
 * Ahora todo en un $queryRaw que retorna todos los campos necesarios.
 */
export async function getAuthUser() {
  try {
    const cookieStore = cookies()
    const token = cookieStore.get('auth_token')?.value
    if (!token) return null

    const payload = verifyToken(token)
    if (!payload) return null

    // Un solo query — trae todos los campos relevantes incluyendo plan/isAdmin frescos
    const rows = await prisma.$queryRaw<Array<{
      id: string
      username: string
      email: string
      full_name: string
      country: string
      city: string
      identity_document: string
      date_of_birth: Date
      avatar_url: string | null
      is_active: boolean
      is_admin: boolean
      plan: string
      plan_expires_at: Date | null
      created_at: Date
      updated_at: Date
    }>>`
      SELECT
        id::text, username, email, full_name, country, city,
        identity_document, date_of_birth,
        avatar_url, is_active, is_admin,
        plan::text, plan_expires_at, created_at, updated_at
      FROM users
      WHERE id = ${payload.userId}::uuid
      LIMIT 1
    `

    if (!rows[0]) return null

    const row = rows[0]

    return {
      id: row.id,
      username: row.username,
      email: row.email,
      fullName: row.full_name,
      country: row.country,
      city: row.city,
      identityDocument: row.identity_document,
      dateOfBirth: row.date_of_birth,
      avatarUrl: row.avatar_url,
      isActive: row.is_active,
      isAdmin: row.is_admin,
      plan: row.plan,
      planExpiresAt: row.plan_expires_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  } catch (err) {
    console.error('[AUTH] getAuthUser error:', err)
    return null
  }
}

