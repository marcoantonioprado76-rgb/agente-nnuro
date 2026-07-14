export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { Prisma } from '@prisma/client'

function getAuth() {
  const token = cookies().get('auth_token')?.value
  if (!token) return null
  return verifyToken(token)
}

/**
 * POST /api/products/[productId]/share
 * Body: { identifier: string }  — @username o email del destinatario
 *
 * Crea una copia independiente del producto para el usuario destinatario.
 * El destinatario puede editar/eliminar su copia libremente sin afectar al original.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { productId: string } }
) {
  const auth = getAuth()
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  try {
    const body = await req.json()
    const rawIdentifier: string = body.identifier ?? ''
    // Strip leading @ so "@juan" and "juan" both work
    const identifier = rawIdentifier.trim().replace(/^@/, '')
    if (!identifier) {
      return NextResponse.json({ error: 'username o email requerido' }, { status: 400 })
    }

    // Cargar el producto original (debe pertenecer al usuario actual)
    const source = await prisma.product.findFirst({
      where: { id: params.productId, userId: auth.userId },
    })
    if (!source) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 })
    }

    // Buscar al destinatario por username o email (case-insensitive email)
    const recipient = await prisma.user.findFirst({
      where: {
        OR: [
          { username: identifier },
          { email: identifier.toLowerCase() },
        ],
      },
      select: { id: true, username: true, email: true },
    })
    if (!recipient) {
      return NextResponse.json({ error: 'Usuario no encontrado. Verifica el username o email.' }, { status: 404 })
    }
    if (recipient.id === auth.userId) {
      return NextResponse.json({ error: 'No puedes compartir un producto contigo mismo.' }, { status: 400 })
    }

    // Evitar compartir el mismo producto dos veces al mismo usuario
    const alreadyShared = await prisma.product.findFirst({
      where: {
        userId: recipient.id,
        clonedFromId: source.id,
      } as any,
    })
    if (alreadyShared) {
      return NextResponse.json({
        error: `Ya compartiste este producto con @${recipient.username ?? recipient.email}.`,
      }, { status: 409 })
    }

    // Obtener el username del remitente para el badge
    const sender = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { username: true },
    })

    // Crear copia independiente para el destinatario
    await (prisma.product as any).create({
      data: {
        userId: recipient.id,
        name: source.name,
        category: source.category,
        benefits: source.benefits,
        usage: source.usage,
        warnings: source.warnings,
        priceUnit: source.priceUnit,
        pricePromo2: source.pricePromo2,
        priceSuper6: source.priceSuper6,
        currency: source.currency,
        welcomeMessage: source.welcomeMessage,
        firstMessage: source.firstMessage,
        hooks: source.hooks as Prisma.InputJsonValue,
        imageMainUrls: source.imageMainUrls as Prisma.InputJsonValue,
        imagePriceUnitUrl: source.imagePriceUnitUrl,
        imagePricePromoUrl: source.imagePricePromoUrl,
        imagePriceSuperUrl: source.imagePriceSuperUrl,
        productVideoUrls: source.productVideoUrls as Prisma.InputJsonValue,
        testimonialsVideoUrls: source.testimonialsVideoUrls as Prisma.InputJsonValue,
        shippingInfo: source.shippingInfo,
        coverage: source.coverage,
        tags: source.tags as Prisma.InputJsonValue,
        active: source.active,
        clonedFromId: source.id,
        sharedByUsername: sender?.username ?? null,
      },
    })

    return NextResponse.json({
      ok: true,
      message: `Producto compartido con @${recipient.username ?? recipient.email}`,
    })
  } catch (err) {
    console.error('[SHARE_PRODUCT]', err)
    return NextResponse.json({ error: 'Error al compartir el producto' }, { status: 500 })
  }
}
