import type { Metadata } from 'next'
import { createServiceRoleClient } from '@/lib/supabase/server'

interface Props {
  params: Promise<{ slug: string }>
  children: React.ReactNode
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params

  try {
    const supabase = await createServiceRoleClient()
    const { data: store } = await supabase
      .from('stores')
      .select('name, favicon_url, cover_images, cover_image_url')
      .eq('slug', slug)
      .eq('visibility', 'public')
      .eq('is_active', true)
      .single()

    if (!store) return { title: 'Tienda' }

    const coverImgs = (store.cover_images as string[])?.length
      ? (store.cover_images as string[])
      : store.cover_image_url ? [store.cover_image_url] : []

    const ogImage = coverImgs[0] || store.favicon_url || undefined

    return {
      title: store.name,
      icons: store.favicon_url ? [
        { rel: 'icon', url: store.favicon_url },
        { rel: 'apple-touch-icon', url: store.favicon_url },
      ] : undefined,
      openGraph: {
        title: store.name,
        type: 'website',
        images: ogImage ? [{ url: ogImage }] : undefined,
      },
    }
  } catch {
    return { title: 'Tienda' }
  }
}

export default function TiendaLayout({ children }: Props) {
  return children
}
