export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser, unauthorizedAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  const settings = await prisma.appSetting.findMany()
  return NextResponse.json({ settings })
}

export async function PATCH(request: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  const body = await request.json()
  const { key, value } = body

  if (!key || value === undefined) {
    return NextResponse.json({ error: 'key y value son requeridos' }, { status: 400 })
  }

  await prisma.appSetting.upsert({
    where: { key },
    create: { key, value: String(value) },
    update: { value: String(value) },
  })

  return NextResponse.json({ success: true })
}
