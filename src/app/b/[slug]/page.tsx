import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import DOMPurify from 'isomorphic-dompurify'
import BuilderFormHandler from './FormHandler'

export const dynamic = 'force-dynamic'

/**
 * Render PÚBLICO de una página del Constructor Visual (GrapesJS).
 * Solo se muestra si está publicada. El HTML/CSS lo generó el propio dueño
 * en el builder (contenido propio) — mismo criterio que las landing por bloques.
 */
export default async function PublicBuilderPage({
  params,
  searchParams,
}: {
  params: { slug: string }
  searchParams: { preview?: string }
}) {
  const page = await (prisma as any).builderPage.findUnique({
    where: { slug: params.slug },
    select: { id: true, html: true, css: true, published: true, name: true },
  })
  if (!page || !page.published) notFound()

  // Cuenta la visita SOLO si es real (no el preview en iframe del panel).
  if (searchParams?.preview !== '1') {
    ;(prisma as any).builderPage
      .update({ where: { id: page.id }, data: { views: { increment: 1 } } })
      .catch(() => { /* nunca rompe la página por una métrica */ })
  }

  // Quitar textos de ayuda del editor que NO deben verse en la página publicada.
  let cleanHtml = (page.html || '').replace(
    /<p[^>]*>[^<]*(?:panel derecho|Doble clic en cada foto|Clic en un botón|pegá tu enlace de YouTube|Arrastrá para ver)[^<]*<\/p>/g,
    ''
  )

  // SEGURIDAD: la página se sirve en el mismo origen que el dashboard. Sanitizamos el HTML
  // del usuario para eliminar <script>, handlers on* y URLs javascript: (evita XSS almacenado
  // que afectaría a otros usuarios logueados que visiten la página), conservando el diseño
  // (estilos inline, formularios, SVG e iframes de YouTube).
  cleanHtml = DOMPurify.sanitize(cleanHtml, {
    ADD_TAGS: ['iframe'],
    ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling', 'target', 'data-lead'],
  })

  // Arreglar iframes de YouTube cuyo src quedó solo con el ID de 11 chars (sin la URL completa).
  cleanHtml = cleanHtml.replace(
    /(<iframe\b[^>]*\ssrc=")([A-Za-z0-9_-]{11})(")/g,
    '$1https://www.youtube.com/embed/$2$3'
  )

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: page.css || '' }} />
      <div dangerouslySetInnerHTML={{ __html: cleanHtml }} />
      <BuilderFormHandler slug={params.slug} />
    </>
  )
}
