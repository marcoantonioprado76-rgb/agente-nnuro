export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { getPlanLimits, PLAN_NAMES, type UserPlan } from '@/lib/plan-limits'

function getAuth() {
    const cookieStore = cookies()
    const token = cookieStore.get('auth_token')?.value
    if (!token) return null
    return verifyToken(token)
}

/** GET /api/landing-pages – list all landing pages for the user */
export async function GET() {
    const auth = getAuth()
    if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    try {
        const pages = await prisma.landingPage.findMany({
            where: { userId: auth.userId },
            orderBy: { updatedAt: 'desc' },
            include: {
                _count: { select: { leads: true } }
            }
        })
        return NextResponse.json({ pages })
    } catch (error) {
        console.error('Error fetching landing pages:', error)
        return NextResponse.json({ error: 'Error al obtener las páginas' }, { status: 500 })
    }
}

/** POST /api/landing-pages – create a new landing page */
export async function POST(request: NextRequest) {
    const auth = getAuth()
    if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    try {
        // Plan limit check (plan base + landing pages extra otorgadas por admin)
        const userPlan = await prisma.user.findUnique({ where: { id: auth.userId }, select: { plan: true, extraLandingPages: true } })
        const plan = (userPlan?.plan ?? 'NONE') as UserPlan
        const extraLandingPages = userPlan?.extraLandingPages ?? 0
        const limits = getPlanLimits(plan)

        if (limits.landingPages === 0 && extraLandingPages === 0) {
            return NextResponse.json({
                error: `Las Landing Pages no están incluidas en tu ${PLAN_NAMES[plan]}. Actualiza al Pack Pro para acceder.`,
                limitReached: true,
                plan,
            }, { status: 403 })
        }

        if (limits.landingPages !== Infinity) {
            const effectiveLimit = limits.landingPages + extraLandingPages
            const lpCount = await prisma.landingPage.count({ where: { userId: auth.userId } })
            if (lpCount >= effectiveLimit) {
                return NextResponse.json({
                    error: `Tu ${PLAN_NAMES[plan]} permite hasta ${effectiveLimit} landing page(s). Actualiza al Pack Elite para crear más.`,
                    limitReached: true,
                    plan,
                }, { status: 403 })
            }
        }

        const body = await request.json()
        const { name, slug, templateId, sections: incomingSections } = body

        if (!name || !slug) {
            return NextResponse.json({ error: 'Nombre y slug son requeridos' }, { status: 400 })
        }

        // Check if slug is unique
        const existing = await prisma.landingPage.findUnique({
            where: { slug }
        })

        if (existing) {
            return NextResponse.json({ error: 'El slug ya existe, elige otro' }, { status: 400 })
        }

        const defaultSections = [
            {
                id: 'ndt-hero',
                type: 'ndt_hero',
                content: {
                    logo: 'https://negociodigitalcomtrafego.com.br/wp-content/uploads/2023/10/logoNDT-1.png',
                    headline: 'Descubra como faturar 5 digitos todos os meses fazendo tráfego para negócios locais com o Método NDT!',
                    subheadline: 'Assista o vídeo abaixo para entender melhor',
                    videoId: 'dQw4w9WgXcQ', // Placeholder
                    bonusText: 'Essa é sua chance de ganhar mais de 30 mil reais por mês com o método que já me ajudou a faturar 500 mil reais na Internet.',
                    buttonText: 'APERTE AQUI E GARANTA A SUA VAGA'
                },
                styles: { accentColor: '#00F0FF' }
            },
            {
                id: 'ndt-results',
                type: 'ndt_results',
                content: {
                    badge: 'OS GESTORES MAIS PROCURADOS DO BRASIL',
                    title: 'Veja os Resultados dos meus alunos',
                    items: [
                        { name: 'Elielton Lourenço', role: 'Gestor de contas AAA 01', image: '' },
                        { name: 'Endrickson Kelsen', role: 'Gestor de contas AAA 01', image: '' },
                        { name: 'Alessandro Wedig', role: 'Gestor de contas AAA 01', image: '' },
                        { name: 'Lucas Marques', role: 'Gestor de contas AAA 01', image: '' }
                    ]
                },
                styles: { accentColor: '#00F0FF' }
            },
            {
                id: 'ndt-features',
                type: 'ndt_features',
                content: {
                    badge: 'PRA QUEM É',
                    title: 'Treinamento Negócios digitais com tráfego?',
                    subtitle: 'Esse treinamento é a solução definitiva para você que...',
                    items: [
                        'Quer trabalhar poucas horas por dia, de onde quiser;',
                        'Quer faturar 5 dígitos por mês como Gestor de Tráfego;',
                        'Quer sair dessa vida de CLT e ter seu próprio negócio;',
                        'Quer conseguir os melhores clientes usando as redes sociais;',
                        'Quer fechar contratos com clientes high-ticket;',
                        'Quer usar a estratégia certa pra negócios locais que gera resultados de verdade.'
                    ]
                },
                styles: { accentColor: '#00F0FF' }
            },
            {
                id: 'ndt-skin',
                type: 'ndt_skin',
                content: {
                    badge: 'SKIN IN THE GAME',
                    title: 'O Treinamento Negócios Digitais com Tráfego foi criado pra você que quer fazer tráfego pra negócios locais, faturando 30k por mês e conseguindo clientes já na primeira semana!',
                    buttonText: 'SIM! QUERO FATURAR 5 DÍGITOS',
                    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=800' // Placeholder para el experto
                },
                styles: { accentColor: '#00F0FF' }
            }
        ]

        const page = await prisma.landingPage.create({
            data: {
                userId: auth.userId,
                name,
                slug,
                templateId: templateId || 'ndt-elite',
                sections: (incomingSections && incomingSections.length > 0) ? incomingSections : defaultSections,
                globalStyles: {
                    colors: {
                        primary: '#00F0FF',
                        background: '#050505',
                        text: '#FFFFFF'
                    },
                    fonts: {
                        heading: 'Outfit',
                        body: 'Inter'
                    }
                }
            }
        })

        return NextResponse.json({ page })
    } catch (error) {
        console.error('Error creating landing page:', error)
        return NextResponse.json({ error: 'Error al crear la página' }, { status: 500 })
    }
}
