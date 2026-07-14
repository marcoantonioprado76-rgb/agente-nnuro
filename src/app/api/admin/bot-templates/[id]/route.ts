export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser, unauthorizedAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  const body = await req.json()
  const { name, description, category, systemPromptTemplate, aiModel,
    maxCharsMensaje1, maxCharsMensaje2, maxCharsMensaje3,
    followUp1Delay, followUp2Delay, active } = body

  const tpl = await (prisma as any).botTemplate.findUnique({ where: { id: params.id } })
  if (!tpl) return NextResponse.json({ error: 'Plantilla no encontrada' }, { status: 404 })

  const updated = await (prisma as any).botTemplate.update({
    where: { id: params.id },
    data: {
      ...(name !== undefined ? { name: String(name).trim() } : {}),
      ...(description !== undefined ? { description: description || null } : {}),
      ...(category !== undefined ? { category: category || null } : {}),
      ...(systemPromptTemplate !== undefined ? { systemPromptTemplate: systemPromptTemplate.trim() } : {}),
      ...(aiModel !== undefined ? { aiModel: aiModel.trim() } : {}),
      ...(maxCharsMensaje1 !== undefined ? { maxCharsMensaje1: maxCharsMensaje1 ? parseInt(maxCharsMensaje1) : null } : {}),
      ...(maxCharsMensaje2 !== undefined ? { maxCharsMensaje2: maxCharsMensaje2 ? parseInt(maxCharsMensaje2) : null } : {}),
      ...(maxCharsMensaje3 !== undefined ? { maxCharsMensaje3: maxCharsMensaje3 ? parseInt(maxCharsMensaje3) : null } : {}),
      ...(followUp1Delay !== undefined ? { followUp1Delay: parseInt(followUp1Delay) } : {}),
      ...(followUp2Delay !== undefined ? { followUp2Delay: parseInt(followUp2Delay) } : {}),
      ...(active !== undefined ? { active: Boolean(active) } : {}),
    },
  })

  return NextResponse.json({ ok: true, template: updated })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getAdminUser()
  if (!admin) return unauthorizedAdmin()

  const tpl = await (prisma as any).botTemplate.findUnique({ where: { id: params.id } })
  if (!tpl) return NextResponse.json({ error: 'Plantilla no encontrada' }, { status: 404 })

  await (prisma as any).botTemplate.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
