import { NextResponse } from 'next/server'
import { getAuthUser } from './auth'

/** Validates auth_token and checks isAdmin flag */
export async function getAdminUser() {
  const user = await getAuthUser()
  if (!user) return null
  if (!(user as any).isAdmin) return null
  return user
}

export function unauthorizedAdmin() {
  return NextResponse.json({ error: 'Acceso denegado. Solo administradores.' }, { status: 403 })
}
