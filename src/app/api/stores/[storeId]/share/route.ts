export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

function getAuth() {
  const token = cookies().get('auth_token')?.value
  if (!token) return null
  return verifyToken(token)
}

/**
 * POST /api/stores/[storeId]/share
 * Body: { identifier: string }  — @username o email del destinatario
 *
 * Crea una copia independiente de la tienda (con todos sus productos) para el destinatario.
 * Cada uno puede editar/eliminar su copia sin afectar al original.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { storeId: string } }
) {
  const auth = getAuth()
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  try {
    const body = await req.json()
    const rawIdentifier: string = body.identifier ?? ''
    const identifier = rawIdentifier.trim().replace(/^@/, '')
    if (!identifier) {
      return NextResponse.json({ error: 'username o email requerido' }, { status: 400 })
    }

    // Cargar la tienda original (debe pertenecer al usuario actual)
    const source = await prisma.store.findFirst({
      where: { id: params.storeId, userId: auth.userId },
      include: { products: true },
    })
    if (!source) {
      return NextResponse.json({ error: 'Tienda no encontrada' }, { status: 404 })
    }

    // Buscar al destinatario por username o email
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
      return NextResponse.json({ error: 'No puedes compartir una tienda contigo mismo.' }, { status: 400 })
    }

    // Evitar compartir la misma tienda dos veces al mismo usuario
    const alreadyShared = await (prisma.store as any).findFirst({
      where: { userId: recipient.id, clonedFromId: source.id },
    })
    if (alreadyShared) {
      return NextResponse.json({
        error: `Ya compartiste esta tienda con @${recipient.username ?? recipient.email}.`,
      }, { status: 409 })
    }

    // Obtener username del remitente para el badge
    const sender = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { username: true },
    })

    // Generar slug único para la copia
    const baseSlug = `${source.slug}-${(recipient.username ?? recipient.id.slice(0, 6)).toLowerCase()}`
    let slug = baseSlug
    let attempt = 0
    while (await prisma.store.findUnique({ where: { slug } })) {
      attempt++
      slug = `${baseSlug}-${attempt}`
    }

    // Crear copia independiente de la tienda
    const cloned = await (prisma.store as any).create({
      data: {
        userId: recipient.id,
        name: source.name,
        slug,
        type: source.type,
        // No heredar el WhatsApp ni el QR de pago del remitente: el receptor debe
        // configurar los suyos, si no los pedidos/pagos irían al dueño original.
        whatsappNumber: null,
        paymentQrUrl: null,
        description: source.description,
        logoUrl: source.logoUrl,
        bannerUrl: source.bannerUrl,
        themeConfig: source.themeConfig,
        active: false, // Inicia como borrador para que el dueño la configure
        clonedFromId: source.id,
        sharedByUsername: sender?.username ?? null,
      },
    })

    // Clonar también todos los productos de la tienda
    if (source.products.length > 0) {
      await prisma.storeProduct.createMany({
        data: source.products.map(p => ({
          storeId: cloned.id,
          name: p.name,
          description: p.description,
          category: p.category,
          price: p.price,
          currency: p.currency,
          points: p.points,
          stock: p.stock,
          images: p.images,
          active: p.active,
          pricePromo: (p as any).pricePromo ?? null,
        })) as any,
      })
    }

    return NextResponse.json({
      ok: true,
      message: `Tienda compartida con @${recipient.username ?? recipient.email}`,
    })
  } catch (err) {
    console.error('[SHARE_STORE]', err)
    return NextResponse.json({ error: 'Error al compartir la tienda' }, { status: 500 })
  }
}
