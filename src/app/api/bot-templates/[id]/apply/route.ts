export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { botId } = await req.json()
  if (!botId) return NextResponse.json({ error: 'botId requerido' }, { status: 400 })

  const [template, bot] = await Promise.all([
    (prisma as any).botTemplate.findFirst({ where: { id: params.id, active: true } }),
    prisma.bot.findFirst({ where: { id: botId, userId: user.id } }),
  ])

  if (!template) return NextResponse.json({ error: 'Plantilla no encontrada' }, { status: 404 })
  if (!bot) return NextResponse.json({ error: 'Bot no encontrado' }, { status: 404 })

  await prisma.bot.update({
    where: { id: botId },
    data: {
      systemPromptTemplate: template.systemPromptTemplate,
      aiModel: template.aiModel,
      ...(template.maxCharsMensaje1 !== null ? { maxCharsMensaje1: template.maxCharsMensaje1 } : {}),
      ...(template.maxCharsMensaje2 !== null ? { maxCharsMensaje2: template.maxCharsMensaje2 } : {}),
      ...(template.maxCharsMensaje3 !== null ? { maxCharsMensaje3: template.maxCharsMensaje3 } : {}),
      followUp1Delay: template.followUp1Delay,
      followUp2Delay: template.followUp2Delay,
    },
  })

  return NextResponse.json({ ok: true, message: `Plantilla "${template.name}" aplicada al bot` })
}
