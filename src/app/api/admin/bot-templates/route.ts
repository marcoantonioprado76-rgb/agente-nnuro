export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser, unauthorizedAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  const templates = await (prisma as any).botTemplate.findMany({
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json({ templates })
}

export async function POST(req: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  const body = await req.json()
  const { name, description, category, systemPromptTemplate, aiModel,
    maxCharsMensaje1, maxCharsMensaje2, maxCharsMensaje3,
    followUp1Delay, followUp2Delay } = body

  if (!name?.trim()) return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 })
  if (!systemPromptTemplate?.trim()) return NextResponse.json({ error: 'El prompt es requerido' }, { status: 400 })

  const template = await (prisma as any).botTemplate.create({
    data: {
      name: name.trim(),
      description: description?.trim() || null,
      category: category?.trim() || null,
      systemPromptTemplate: systemPromptTemplate.trim(),
      aiModel: aiModel?.trim() || 'gpt-4o',
      maxCharsMensaje1: maxCharsMensaje1 ? parseInt(maxCharsMensaje1) : null,
      maxCharsMensaje2: maxCharsMensaje2 ? parseInt(maxCharsMensaje2) : null,
      maxCharsMensaje3: maxCharsMensaje3 ? parseInt(maxCharsMensaje3) : null,
      followUp1Delay: followUp1Delay ? parseInt(followUp1Delay) : 15,
      followUp2Delay: followUp2Delay ? parseInt(followUp2Delay) : 4320,
    },
  })

  return NextResponse.json({ ok: true, template }, { status: 201 })
}
