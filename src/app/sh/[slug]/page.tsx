import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { StoreViewClient } from './StoreViewClient'

interface PublicStorePageProps {
    params: { slug: string }
}

// Open Graph: al compartir el link de la tienda (WhatsApp, redes) muestra una
// tarjeta con el nombre, descripción y portada de la tienda.
export async function generateMetadata({ params }: PublicStorePageProps): Promise<Metadata> {
    const store = await (prisma as any).store.findUnique({
        where: { slug: params.slug },
        select: { name: true, description: true, logoUrl: true, bannerUrl: true, active: true },
    })
    if (!store || !store.active) return { title: 'Tienda no encontrada · MY DIAMOND' }

    const title = store.name
    const description = store.description || `Mira el catálogo de ${store.name} y haz tu pedido por WhatsApp.`
    const image: string | undefined = store.bannerUrl || store.logoUrl || undefined

    return {
        title,
        description,
        openGraph: {
            title,
            description,
            type: 'website',
            images: image ? [{ url: image }] : undefined,
        },
        twitter: {
            card: image ? 'summary_large_image' : 'summary',
            title,
            description,
            images: image ? [image] : undefined,
        },
    }
}

export default async function PublicStorePage({ params }: PublicStorePageProps) {
    const { slug } = params

    const store = await (prisma as any).store.findUnique({
        where: { slug },
        include: {
            products: {
                where: { active: true },
                orderBy: { createdAt: 'desc' }
            },
            bot: {
                include: {
                    secret: { select: { whatsappInstanceNumber: true } }
                }
            }
        }
    })

    if (!store || !store.active) return notFound()

    const products = (store.products || []).map((p: any) => ({
        ...p,
        price: Number(p.price),
        pricePromo: p.pricePromo ? Number(p.pricePromo) : null,
        points: Number(p.points ?? 0),
    })) as any[]

    // Group by category
    const categories = products.reduce((acc: any, p: any) => {
        const cat = p.category || 'General'
        if (!acc[cat]) acc[cat] = []
        acc[cat].push(p)
        return acc
    }, {})

    // Extract phones
    const botPhone = store.bot?.baileysPhone || store.bot?.secret?.whatsappInstanceNumber || ''
    const cleanPhone = botPhone.replace(/\D/g, '')
    const finalPhone = store.whatsappNumber ? store.whatsappNumber.replace(/\D/g, '') : cleanPhone

    // Solo se exponen al cliente los campos que la vitrina necesita.
    // NO se filtran userId, botId, el número de instancia del bot ni otros datos
    // internos: todo lo que se pasa a un Client Component es visible para cualquier
    // visitante anónimo.
    const safeStore = {
        name: store.name,
        slug: store.slug, // público (está en la URL); aísla el carrito por tienda
        type: store.type,
        description: store.description,
        logoUrl: store.logoUrl,
        bannerUrl: store.bannerUrl,
        themeConfig: store.themeConfig,
    }

    return (
        <StoreViewClient
            store={safeStore}
            products={products}
            categories={categories}
            phone={finalPhone}
            paymentQrUrl={store.paymentQrUrl}
        />
    )
}
