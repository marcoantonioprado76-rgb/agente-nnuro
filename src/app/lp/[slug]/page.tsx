import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { BlocksRenderer } from '@/components/landing-pages/Blocks'
import LeadForm from '@/components/landing-pages/LeadForm'

// Cada visita se cuenta (no se cachea la página), para métricas reales de visitas/conversión.
export const dynamic = 'force-dynamic'

export default async function PublicLandingPage({
    params,
    searchParams,
}: {
    params: { slug: string }
    searchParams: { preview?: string }
}) {
    const page = await prisma.landingPage.findUnique({
        where: { slug: params.slug },
        include: {
            user: {
                select: { fullName: true, avatarUrl: true }
            }
        }
    })

    if (!page || !page.active) {
        notFound()
    }

    // Cuenta la visita SOLO si es una visita real (no el preview en iframe del panel).
    if (searchParams?.preview !== '1') {
        prisma.landingPage
            .update({ where: { id: page.id }, data: { views: { increment: 1 } } })
            .catch(() => { /* nunca rompe la página por una métrica */ })
    }

    const sections = page.sections as any[]
    const isRawHtml = sections.length === 1 && sections[0]?.type === 'raw_html'

    // Raw HTML pages: render the HTML fully self-contained
    if (isRawHtml) {
        return (
            <div dangerouslySetInnerHTML={{ __html: sections[0]?.content?.html || '' }} />
        )
    }

    // Block-based pages: normal renderer + lead form + footer
    return (
        <main className="min-h-screen bg-[#1a262f] text-white selection:bg-[#9B00FF] selection:text-white">
            <BlocksRenderer blocks={sections} />

            {/* Lead Capture Section - Floating or at the end */}
            <section id="lead-capture" className="py-24 px-6 bg-dark-950 border-t border-white/5">
                <div className="max-w-xl mx-auto">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold mb-4">¿Te interesa saber más?</h2>
                        <p className="text-dark-400">Déjanos tus datos y nos pondremos en contacto contigo lo antes posible.</p>
                    </div>
                    <LeadForm landingPageId={page.id} />
                </div>
            </section>

            <footer className="py-12 border-t border-white/5 text-center text-dark-500 text-xs uppercase tracking-[0.3em]">
                Potenciado por Rubin Pro & NÜRO
            </footer>
        </main>
    )
}

