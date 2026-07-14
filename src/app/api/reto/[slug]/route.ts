export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// PÚBLICO: info mínima del reto para el formulario de registro (nombre + si acepta registros).
export async function GET(_req: NextRequest, { params }: { params: { slug: string } }) {
  const ch = await prisma.challenge.findUnique({
    where: { publicSlug: params.slug },
    select: { name: true, registrationOpen: true, isActive: true },
  })
  if (!ch) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  return NextResponse.json({ name: ch.name, open: ch.registrationOpen && ch.isActive })
}
