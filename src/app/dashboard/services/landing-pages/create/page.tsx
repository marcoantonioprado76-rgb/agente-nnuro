'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AIKeySelector from '@/components/AIKeySelector'
import {
    ArrowLeft, ArrowRight, Sparkles, Loader2,
    Plus, Trash2, Eye, EyeOff, KeyRound,
    Video, ImageIcon, Check, Zap,
    Globe2, Code, Star, MessageSquare,
    ShieldCheck, Phone, Mail, Tag, Tv2
} from 'lucide-react'

// ─── Constants ────────────────────────────────────────────────────────────────

const STEPS = [
    { id: 1, label: 'Proyecto' },
    { id: 2, label: 'Negocio' },
    { id: 3, label: 'Oferta' },
    { id: 4, label: 'Medios' },
    { id: 5, label: 'Diseño' },
    { id: 6, label: 'Generar' },
]

const BUSINESS_TYPES = [
    { id: 'ecommerce', label: '🛍 E-commerce', desc: 'Tienda online / productos físicos' },
    { id: 'servicios', label: '🔧 Servicios', desc: 'Consultoría, diseño, reparación' },
    { id: 'coaching', label: '🎓 Coaching / Cursos', desc: 'Educación, mentoring, capacitación' },
    { id: 'salud', label: '💊 Salud & Bienestar', desc: 'Suplementos, cremas, clínicas' },
    { id: 'digital', label: '💻 Producto Digital', desc: 'Apps, plantillas, software, ebooks' },
    { id: 'inmobiliaria', label: '🏠 Inmobiliaria', desc: 'Propiedades, renta, construcción' },
    { id: 'restaurante', label: '🍽 Restaurante / Comida', desc: 'Delivery, catering, menú' },
    { id: 'otro', label: '📦 Otro', desc: 'Otro tipo de negocio' },
]

const AUDIENCES = [
    '👩 Mujeres adultas', '👨 Hombres adultos', '👴 Adultos mayores',
    '🧑‍💼 Emprendedores', '🏢 Empresas (B2B)', '🌎 Audiencia LATAM',
    '🇺🇸 Habla inglesa', '🎓 Estudiantes', '🏋️ Deportistas', '👶 Papás y mamás',
    '💰 Inversores', '🎨 Creativos',
]

const TRUST_BADGES = [
    '✅ Pago seguro', '🔒 SSL Certificado', '⭐ Miles de clientes',
    '🏆 Garantía incluida', '📦 Envío gratis', '💯 Satisfacción garantizada',
    '🕐 Soporte 24/7', '🎁 Bono especial', '🔄 Sin contratos',
]

const COLOR_PALETTES = [
    {
        id: '[#16A34A]',
        label: 'Neón Verde',
        desc: 'Tecnológico y moderno',
        primary: '#00FF88',
        secondary: '#00E5D0',
        bg: '#1a262f',
        preview: ['#00FF88', '#00E5D0', '#1a262f'],
    },
    {
        id: 'cyber-blue',
        label: 'Cyber Azul',
        desc: 'Futurista y elegante',
        primary: '#00E5D0',
        secondary: '#7B2FFF',
        bg: '#050515',
        preview: ['#00E5D0', '#7B2FFF', '#050515'],
    },
    {
        id: 'gold-premium',
        label: 'Oro Premium',
        desc: 'Lujoso y exclusivo',
        primary: '#FFD700',
        secondary: '#FF8C00',
        bg: '#0A0800',
        preview: ['#FFD700', '#FF8C00', '#0A0800'],
    },
    {
        id: 'red-fire',
        label: 'Rojo Fuego',
        desc: 'Urgente y agresivo',
        primary: '#FF006E',
        secondary: '#FF4500',
        bg: '#0A0005',
        preview: ['#FF006E', '#FF4500', '#0A0005'],
    },
]

const VISUAL_STYLES = [
    '⚡ Bold & Agresivo', '✨ Elegante Premium', '🎯 Minimalista',
    '💻 Tecnológico', '😊 Cercano & Cálido',
]

const FONT_STYLES = [
    '🔤 Moderna Sans', '📖 Clásica Serif', '✍️ Manuscrita', '⌨️ Técnica Monospace',
]

const LANGUAGES = ['Español', 'English', 'Português']

const LOADING_MSGS = [
    'Analizando tu negocio...',
    'Generando copy de alto impacto...',
    'Estructurando secciones...',
    'Aplicando diseño neón...',
    'Optimizando para conversión...',
    'Añadiendo testimonios y prueba social...',
    'Finalizando tu landing page...',
]

function slug(str: string) {
    return str.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').slice(0, 60)
}

// ─── Sub-components ────────────────────────────────────────────────────────────

const Input = ({ label, icon: Icon, ...props }: any) => (
    <div className="space-y-1.5">
        {label && <label className="text-xs font-bold uppercase tracking-widest text-white/55 flex items-center gap-1.5">{Icon && <Icon size={12} />}{label}</label>}
        <input
            {...props}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/35 focus:outline-none focus:border-[#0a95a8]/50 transition-colors text-sm"
        />
    </div>
)

const TextArea = ({ label, icon: Icon, rows = 3, ...props }: any) => (
    <div className="space-y-1.5">
        {label && <label className="text-xs font-bold uppercase tracking-widest text-white/55 flex items-center gap-1.5">{Icon && <Icon size={12} />}{label}</label>}
        <textarea
            rows={rows}
            {...props}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/35 focus:outline-none focus:border-[#0a95a8]/50 transition-colors text-sm resize-none"
        />
    </div>
)

const Chip = ({ label, active, onClick, color = '#00FF88' }: any) => (
    <button
        type="button"
        onClick={onClick}
        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${active ? 'text-black border-transparent' : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:border-white/30'}`}
        style={active ? { background: color, borderColor: color } : {}}
    >
        {label}
    </button>
)

const SectionTitle = ({ icon: Icon, title, color = '#00FF88' }: any) => (
    <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}20`, color }}>
            <Icon size={16} />
        </div>
        <h3 className="text-base font-black uppercase tracking-tight text-white">{title}</h3>
    </div>
)

// ─── Main Component ────────────────────────────────────────────────────────────

export default function CreateLandingPage() {
    const router = useRouter()
    const [step, setStep] = useState(1)
    const [loading, setLoading] = useState(false)
    const [loadingIdx, setLoadingIdx] = useState(0)
    const [error, setError] = useState('')
    const [showKey, setShowKey] = useState(false)
    const [mode, setMode] = useState<'select' | 'ai' | 'html'>('select')
    const [htmlCode, setHtmlCode] = useState('')
    const [savingHtml, setSavingHtml] = useState(false)

    // Si se llega con ?modo=html (desde "Nueva Landing" → Pegar mi HTML), abrir directo ese modo.
    useEffect(() => {
        const m = new URLSearchParams(window.location.search).get('modo')
        if (m === 'html') setMode('html')
        else if (m === 'ia' || m === 'ai') setMode('ai')
    }, [])

    const [form, setForm] = useState({
        openaiKey: '',
        name: '',
        slug: '',
        language: 'Español',
        businessType: '',
        brandName: '',
        description: '',
        valueProposition: '',
        painPoint: '',
        audience: [] as string[],
        regularPrice: '',
        salePrice: '',
        buttonText: 'COMENZAR AHORA',
        buttonUrl: '',
        secondaryButtonText: '',
        secondaryButtonUrl: '',
        whatsapp: '',
        email: '',
        guarantee: '',
        urgency: '',
        benefits: [{ title: '', desc: '' }, { title: '', desc: '' }, { title: '', desc: '' }] as { title: string; desc: string }[],
        testimonials: [{ name: '', text: '' }, { name: '', text: '' }] as { name: string; text: string }[],
        faqs: [{ q: '', a: '' }, { q: '', a: '' }, { q: '', a: '' }] as { q: string; a: string }[],
        trustBadges: [] as string[],
        logoUrl: '',
        mainImageUrl: '',
        additionalImages: [''] as string[],
        mainVideoUrl: '',
        additionalVideos: [''] as string[],
        colorPalette: '[#16A34A]',
        primaryColor: '#00FF88',
        secondaryColor: '#00E5D0',
        visualStyle: '',
        fontStyle: '',
        seoTitle: '',
        seoDescription: '',
        vision: '',
    })

    const set = (key: string, val: any) => setForm(f => ({ ...f, [key]: val }))

    const toggleArr = (key: string, val: string) => {
        const arr = (form as any)[key] as string[]
        set(key, arr.includes(val) ? arr.filter((v: string) => v !== val) : [...arr, val])
    }

    const buildInstructions = () => {
        const parts: string[] = []
        if (form.language !== 'Español') parts.push(`IDIOMA: Genera TODO el contenido en ${form.language}.`)
        if (form.brandName) parts.push(`Nombre de marca/empresa: ${form.brandName}`)
        if (form.valueProposition) parts.push(`Propuesta de valor única: ${form.valueProposition}`)
        if (form.painPoint) parts.push(`Problema que resuelves: ${form.painPoint}`)
        if (form.audience.length) parts.push(`Público objetivo: ${form.audience.join(', ')}`)
        if (form.regularPrice) parts.push(`Precio regular: ${form.regularPrice}`)
        if (form.salePrice) parts.push(`Precio de oferta (mostrar tachado el regular): ${form.salePrice}`)
        if (form.secondaryButtonText) parts.push(`Botón secundario: "${form.secondaryButtonText}" → ${form.secondaryButtonUrl || '#'}`)
        if (form.whatsapp) parts.push(`Incluir botón flotante de WhatsApp con número: ${form.whatsapp}`)
        if (form.email) parts.push(`Email de contacto: ${form.email}`)
        if (form.guarantee) parts.push(`Garantía: ${form.guarantee}`)
        if (form.urgency) parts.push(`Urgencia/escasez: ${form.urgency}`)
        if (form.logoUrl) parts.push(`Logo URL: ${form.logoUrl} (colocarlo en el header)`)
        if (form.trustBadges.length) parts.push(`Badges de confianza: ${form.trustBadges.join(', ')}`)
        if (form.visualStyle) parts.push(`Estilo visual: ${form.visualStyle}`)
        if (form.fontStyle) parts.push(`Tipografía: ${form.fontStyle}`)
        if (form.seoTitle) parts.push(`SEO title tag: "${form.seoTitle}"`)
        if (form.seoDescription) parts.push(`SEO meta description: "${form.seoDescription}"`)

        const goodBenefits = form.benefits.filter(b => b.title.trim())
        if (goodBenefits.length) {
            parts.push(`Beneficios clave (USAR EXACTAMENTE ESTOS):\n${goodBenefits.map((b, i) => `${i + 1}. ${b.title}${b.desc ? ': ' + b.desc : ''}`).join('\n')}`)
        }
        const goodTestimonials = form.testimonials.filter(t => t.name.trim())
        if (goodTestimonials.length) {
            parts.push(`Testimonios (USAR EXACTAMENTE ESTOS):\n${goodTestimonials.map(t => `- ${t.name}: "${t.text}"`).join('\n')}`)
        }
        const goodFaqs = form.faqs.filter(f => f.q.trim())
        if (goodFaqs.length) {
            parts.push(`FAQ (USAR EXACTAMENTE ESTAS):\n${goodFaqs.map(f => `Q: ${f.q}\nA: ${f.a}`).join('\n\n')}`)
        }
        if (form.vision) parts.push(`INSTRUCCIONES ESPECIALES DEL USUARIO:\n${form.vision}`)
        return parts.join('\n\n')
    }

    const handleGenerate = async () => {
        setError('')
        setLoading(true)
        setLoadingIdx(0)
        const interval = setInterval(() => setLoadingIdx(i => (i + 1) % LOADING_MSGS.length), 2200)
        try {
            const genRes = await fetch('/api/landing-pages/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    description: form.description,
                    instructions: buildInstructions(),
                    openaiKey: form.openaiKey.trim(),
                    businessType: form.businessType,
                    primaryColor: form.primaryColor,
                    secondaryColor: form.secondaryColor,
                    videoUrl: form.mainVideoUrl.trim(),
                    imageUrls: [form.mainImageUrl, ...form.additionalImages].filter(u => u.trim()),
                    buttonUrl: form.buttonUrl.trim() || '#',
                    buttonText: form.buttonText || 'COMENZAR AHORA',
                }),
            })
            const genData = await genRes.json()
            if (!genRes.ok) { setError(genData.error || 'Error generando'); return }

            const createRes = await fetch('/api/landing-pages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: form.name,
                    slug: form.slug || slug(form.name),
                    templateId: 'raw-html',
                    sections: [{ id: 'raw-1', type: 'raw_html', content: { html: genData.html }, styles: {} }],
                }),
            })
            const createData = await createRes.json()
            if (!createRes.ok) { setError(createData.error || 'Error al crear'); return }
            router.push(`/dashboard/services/landing-pages/${createData.page.id}/edit`)
        } catch { setError('Error de conexión. Intenta de nuevo.') }
        finally { clearInterval(interval); setLoading(false) }
    }

    const handleSaveHtml = async () => {
        if (!htmlCode.trim()) { setError('Pega tu código HTML primero'); return }
        setSavingHtml(true)
        setError('')
        try {
            const res = await fetch('/api/landing-pages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: form.name || 'Mi Landing Page',
                    slug: form.slug || slug(form.name || 'landing'),
                    templateId: 'raw-html',
                    sections: [{ id: 'raw-1', type: 'raw_html', content: { html: htmlCode }, styles: {} }],
                }),
            })
            const data = await res.json()
            if (!res.ok) { setError(data.error || 'Error al crear'); return }
            router.push(`/dashboard/services/landing-pages/${data.page.id}/edit`)
        } catch { setError('Error de conexión.') }
        finally { setSavingHtml(false) }
    }

    const palette = COLOR_PALETTES.find(p => p.id === form.colorPalette) || COLOR_PALETTES[0]

    // ─── Loading screen ──────────────────────────────────────────────────────
    if (loading) return (
        <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: 'linear-gradient(180deg, #212e38 0%, #273842 60%, #1a262f 100%)' }}>
            <div className="w-20 h-20 rounded-full border-4 border-[#00FF88]/20 border-t-[#00FF88] animate-spin mb-8" />
            <p className="text-[#00FF88] font-black text-lg tracking-widest uppercase text-center">{LOADING_MSGS[loadingIdx]}</p>
            <p className="text-white/40 text-sm mt-3">Esto puede tardar 30-60 segundos</p>
        </div>
    )

    // ─── Mode selector ────────────────────────────────────────────────────────
    if (mode === 'select') return (
        <div className="dm-page font-ui min-h-screen text-[#111827] flex flex-col">
            <nav className="h-16 border-b border-[#E4E9F0] flex items-center px-4 sm:px-8 bg-white/80 backdrop-blur-xl fixed top-0 left-0 w-full z-50 lg:left-[240px] lg:w-[calc(100%-240px)]">
                <Link href="/dashboard/services/landing-pages" className="w-9 h-9 rounded-full border border-[#E4E9F0] flex items-center justify-center hover:bg-[#EEF2F7] transition-all">
                    <ArrowLeft size={16} />
                </Link>
                <span className="ml-3 font-black text-sm uppercase tracking-widest">Nueva Landing Page</span>
            </nav>
            <main className="pt-24 pb-20 px-4 sm:px-8 max-w-2xl mx-auto w-full flex flex-col items-center">
                <div className="text-center mb-10">
                    <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-[#111827] mb-2">¿Cómo quieres crear tu landing?</h1>
                    <p className="text-[#6B7280] text-sm">Elige el método que mejor se adapte a tu caso</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full">
                    {/* Opción 1: Pegar HTML */}
                    <button
                        onClick={() => setMode('html')}
                        className="group border border-white/10 hover:border-white/20 rounded-3xl p-8 text-left transition-all hover:shadow-[0_0_40px_rgba(8,22,36,0.4)]"
                        style={{ background: 'linear-gradient(180deg, #212e38 0%, #273842 60%, #1a262f 100%)' }}
                    >
                        <div className="w-12 h-12 rounded-2xl bg-[#C9A7FF]/10 border border-[#C9A7FF]/20 flex items-center justify-center mb-5 group-hover:bg-[#C9A7FF]/20 transition-colors">
                            <Code size={22} className="text-[#C9A7FF]" />
                        </div>
                        <h2 className="text-lg font-black text-white mb-2">Pegar mi HTML</h2>
                        <p className="text-white/55 text-sm leading-relaxed">Tienes tu propio código HTML listo. Pégalo aquí y publícalo al instante.</p>
                        <div className="mt-5 text-xs font-bold uppercase tracking-widest text-[#C9A7FF]/80 flex items-center gap-1.5">
                            Usar → <ArrowRight size={12} />
                        </div>
                    </button>
                    {/* Opción 2: Builder con IA */}
                    <button
                        onClick={() => setMode('ai')}
                        className="group border border-white/10 hover:border-[#00FF88]/50 rounded-3xl p-8 text-left transition-all hover:shadow-[0_0_40px_rgba(0,255,136,0.12)]"
                        style={{ background: 'linear-gradient(180deg, #212e38 0%, #273842 60%, #1a262f 100%)' }}
                    >
                        <div className="w-12 h-12 rounded-2xl bg-[#00FF88]/10 border border-[#00FF88]/20 flex items-center justify-center mb-5 group-hover:bg-[#00FF88]/20 transition-colors">
                            <Sparkles size={22} className="text-[#00FF88]" />
                        </div>
                        <h2 className="text-lg font-black text-white mb-2">Crear con IA</h2>
                        <p className="text-white/55 text-sm leading-relaxed">Dinos de tu negocio y la IA genera una landing de alta conversión lista para publicar.</p>
                        <div className="mt-5 text-xs font-bold uppercase tracking-widest text-[#00FF88]/80 flex items-center gap-1.5">
                            Empezar → <ArrowRight size={12} />
                        </div>
                    </button>
                </div>
            </main>
        </div>
    )

    if (mode === 'html') return (
        <div className="dm-page font-ui min-h-screen flex flex-col">
            {/* Top bar — title + back only (no save button, avoids clash with dashboard Navbar) */}
            <div className="h-12 border-b border-[#E4E9F0] flex items-center gap-3 px-4 sm:px-8 bg-white/80 backdrop-blur-xl sticky top-0 z-40 text-[#111827]">
                <button onClick={() => setMode('select')} className="w-8 h-8 rounded-full border border-[#E4E9F0] flex items-center justify-center hover:bg-[#EEF2F7] transition-all">
                    <ArrowLeft size={15} />
                </button>
                <span className="font-black text-sm uppercase tracking-widest">Pegar HTML</span>
            </div>

            {/* Name + slug bar */}
            <div className="px-4 sm:px-8 py-3 border-b border-[#E4E9F0] bg-white/60 flex items-center gap-3">
                <input
                    type="text"
                    value={form.name}
                    onChange={e => { set('name', e.target.value); set('slug', slug(e.target.value)) }}
                    placeholder="Nombre de tu landing page"
                    className="flex-1 bg-[#F4F6FA] border border-[#E4E9F0] rounded-lg px-3 py-2 text-sm text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:border-[#0a95a8]/50 transition-colors"
                />
                <span className="text-[#9CA3AF] text-xs hidden sm:block">{form.slug || 'slug-auto'}</span>
            </div>

            {error && <p className="text-red-500 text-xs text-center py-2 bg-red-500/10">{error}</p>}

            {/* Code editor — superficie de código oscura (apropiada para un editor) */}
            <textarea
                value={htmlCode}
                onChange={e => setHtmlCode(e.target.value)}
                className="flex-1 bg-[#1a262f] text-[#7DD3FC] font-mono text-sm p-6 outline-none resize-none border-none"
                placeholder="<!-- Pega aquí tu código HTML completo -->"
                spellCheck={false}
                style={{ minHeight: 'calc(100vh - 200px)' }}
            />

            {/* Bottom save bar — always visible */}
            <div className="fixed bottom-[65px] left-0 w-full bg-white/85 backdrop-blur-xl border-t border-[#E4E9F0] px-4 sm:px-8 py-4 flex items-center justify-between z-50 lg:bottom-0 lg:left-[240px] lg:w-[calc(100%-240px)]">
                <div>
                    <p className="text-xs font-bold text-[#6B7280]">Pegar HTML</p>
                    <p className="text-[10px] text-[#9CA3AF]">{form.name || 'Sin nombre aún'}</p>
                </div>
                <button
                    onClick={handleSaveHtml}
                    disabled={savingHtml || !htmlCode.trim()}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-sm uppercase tracking-widest bg-gradient-to-r from-[#1fb8bb] via-[#147e95] to-[#233B8F] text-white hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    {savingHtml ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                    {savingHtml ? 'Guardando...' : 'Crear Landing'}
                </button>
            </div>
        </div>
    )

    // ─── Step content ────────────────────────────────────────────────────────
    const renderStep = () => {
        switch (step) {

            // ── STEP 1: Proyecto ──────────────────────────────────────────────
            case 1: return (
                <div className="space-y-8">
                    <SectionTitle icon={KeyRound} title="API Key de OpenAI" color="#00FF88" />
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase tracking-widest text-white/55 flex items-center gap-1.5"><KeyRound size={12} />OpenAI API Key</label>
                        <div className="relative">
                            <input
                                type={showKey ? 'text' : 'password'}
                                value={form.openaiKey}
                                onChange={e => set('openaiKey', e.target.value)}
                                placeholder="sk-..."
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-12 text-white placeholder-white/35 focus:outline-none focus:border-[#0a95a8]/50 transition-colors text-sm font-mono"
                            />
                            <button type="button" onClick={() => setShowKey(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors">
                                {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                        <p className="text-white/40 text-xs mt-1">Necesaria para generar con AI. La encontrarás en platform.openai.com</p>
                    </div>

                    <SectionTitle icon={Globe2} title="Datos del Proyecto" color="#00E5D0" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input label="Nombre del proyecto" icon={Globe2} placeholder="Ej: Curso de Marketing Digital" value={form.name} onChange={(e: any) => { set('name', e.target.value); set('slug', slug(e.target.value)) }} />
                        <Input label="URL slug" placeholder="mi-landing-page" value={form.slug} onChange={(e: any) => set('slug', slug(e.target.value))} />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase tracking-widest text-white/55">Idioma de la Landing</label>
                        <div className="flex gap-3 flex-wrap">
                            {LANGUAGES.map(lang => (
                                <Chip key={lang} label={lang} active={form.language === lang} onClick={() => set('language', lang)} color="#00E5D0" />
                            ))}
                        </div>
                    </div>
                </div>
            )

            // ── STEP 2: Negocio ───────────────────────────────────────────────
            case 2: return (
                <div className="space-y-8">
                    <SectionTitle icon={Zap} title="Tipo de Negocio" color="#00FF88" />
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {BUSINESS_TYPES.map(b => (
                            <button key={b.id} type="button" onClick={() => set('businessType', b.id)}
                                className={`p-4 rounded-xl border text-left transition-all ${form.businessType === b.id ? 'border-[#00FF88] bg-[#00FF88]/10' : 'border-white/10 bg-white/5 hover:border-white/30'}`}>
                                <div className="text-xl mb-1">{b.label.split(' ')[0]}</div>
                                <div className="text-xs font-bold text-white">{b.label.split(' ').slice(1).join(' ')}</div>
                                <div className="text-[10px] text-white/40 mt-1 leading-tight">{b.desc}</div>
                            </button>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input label="Nombre de tu marca/empresa" placeholder="Ej: MY DIAMOND" value={form.brandName} onChange={(e: any) => set('brandName', e.target.value)} />
                    </div>

                    <TextArea label="Descripción de tu negocio / producto" rows={3} placeholder="Describe qué vendes, qué hace tu producto o servicio, y por qué es especial..." value={form.description} onChange={(e: any) => set('description', e.target.value)} />
                    <TextArea label="¿Qué te diferencia de la competencia?" rows={2} placeholder="Ej: Somos los únicos que garantizamos resultados en 30 días con acompañamiento personalizado..." value={form.valueProposition} onChange={(e: any) => set('valueProposition', e.target.value)} />
                    <TextArea label="¿Qué problema resuelves a tu cliente?" rows={2} placeholder="Ej: Mis clientes no saben cómo conseguir ventas por internet y pierden dinero en publicidad sin resultados..." value={form.painPoint} onChange={(e: any) => set('painPoint', e.target.value)} />

                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-white/55">Público Objetivo (selecciona todos los que apliquen)</label>
                        <div className="flex flex-wrap gap-2">
                            {AUDIENCES.map(a => <Chip key={a} label={a} active={form.audience.includes(a)} onClick={() => toggleArr('audience', a)} />)}
                        </div>
                    </div>
                </div>
            )

            // ── STEP 3: Oferta & Ventas ───────────────────────────────────────
            case 3: return (
                <div className="space-y-8">
                    <SectionTitle icon={Tag} title="Precios & CTA" color="#FFD700" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Input label="Precio regular" placeholder="$297" value={form.regularPrice} onChange={(e: any) => set('regularPrice', e.target.value)} />
                        <Input label="Precio de oferta" placeholder="$97" value={form.salePrice} onChange={(e: any) => set('salePrice', e.target.value)} />
                        <Input label="Texto botón principal" placeholder="COMENZAR AHORA" value={form.buttonText} onChange={(e: any) => set('buttonText', e.target.value)} />
                        <Input label="URL botón principal" placeholder="https://..." value={form.buttonUrl} onChange={(e: any) => set('buttonUrl', e.target.value)} />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input label="Texto botón secundario (opcional)" placeholder="Ver demo gratis" value={form.secondaryButtonText} onChange={(e: any) => set('secondaryButtonText', e.target.value)} />
                        <Input label="URL botón secundario" placeholder="https://..." value={form.secondaryButtonUrl} onChange={(e: any) => set('secondaryButtonUrl', e.target.value)} />
                        <Input icon={Phone} label="WhatsApp (botón flotante)" placeholder="+1 234 567 8900" value={form.whatsapp} onChange={(e: any) => set('whatsapp', e.target.value)} />
                        <Input icon={Mail} label="Email de contacto" placeholder="hola@tunegocio.com" value={form.email} onChange={(e: any) => set('email', e.target.value)} />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input icon={ShieldCheck} label="Garantía" placeholder="30 días de garantía o te devolvemos el dinero" value={form.guarantee} onChange={(e: any) => set('guarantee', e.target.value)} />
                        <Input icon={Zap} label="Urgencia / Escasez" placeholder="Solo quedan 5 cupos disponibles" value={form.urgency} onChange={(e: any) => set('urgency', e.target.value)} />
                    </div>

                    <SectionTitle icon={Star} title="Beneficios Clave" color="#00FF88" />
                    <div className="space-y-3">
                        {form.benefits.map((b, i) => (
                            <div key={i} className="flex gap-3 items-start">
                                <div className="w-6 h-6 rounded-full bg-[#00FF88]/20 text-[#00FF88] text-xs font-black flex items-center justify-center flex-shrink-0 mt-3">{i + 1}</div>
                                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <input value={b.title} onChange={e => { const arr = [...form.benefits]; arr[i].title = e.target.value; set('benefits', arr) }} placeholder={`Beneficio ${i + 1} (ej: Resultados en 7 días)`} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/35 focus:outline-none focus:border-[#00FF88]/50 text-sm" />
                                    <input value={b.desc} onChange={e => { const arr = [...form.benefits]; arr[i].desc = e.target.value; set('benefits', arr) }} placeholder="Descripción (opcional)" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/35 focus:outline-none focus:border-[#00FF88]/50 text-sm" />
                                </div>
                                {form.benefits.length > 1 && <button type="button" onClick={() => set('benefits', form.benefits.filter((_, j) => j !== i))} className="text-white/40 hover:text-red-400 transition-colors mt-2.5"><Trash2 size={16} /></button>}
                            </div>
                        ))}
                        {form.benefits.length < 6 && <button type="button" onClick={() => set('benefits', [...form.benefits, { title: '', desc: '' }])} className="flex items-center gap-2 text-[#00FF88] text-xs font-bold hover:opacity-80 transition-opacity"><Plus size={14} />Agregar beneficio</button>}
                    </div>

                    <SectionTitle icon={MessageSquare} title="Testimonios" color="#00E5D0" />
                    <div className="space-y-3">
                        {form.testimonials.map((t, i) => (
                            <div key={i} className="flex gap-3 items-start">
                                <div className="w-6 h-6 rounded-full bg-[#00E5D0]/20 text-[#00E5D0] text-xs font-black flex items-center justify-center flex-shrink-0 mt-3">{i + 1}</div>
                                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2">
                                    <input value={t.name} onChange={e => { const arr = [...form.testimonials]; arr[i].name = e.target.value; set('testimonials', arr) }} placeholder="Nombre del cliente" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/35 focus:outline-none focus:border-[#00E5D0]/50 text-sm" />
                                    <input value={t.text} onChange={e => { const arr = [...form.testimonials]; arr[i].text = e.target.value; set('testimonials', arr) }} placeholder="Resultado / testimonio..." className="md:col-span-2 w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/35 focus:outline-none focus:border-[#00E5D0]/50 text-sm" />
                                </div>
                                {form.testimonials.length > 1 && <button type="button" onClick={() => set('testimonials', form.testimonials.filter((_, j) => j !== i))} className="text-white/40 hover:text-red-400 transition-colors mt-2.5"><Trash2 size={16} /></button>}
                            </div>
                        ))}
                        {form.testimonials.length < 5 && <button type="button" onClick={() => set('testimonials', [...form.testimonials, { name: '', text: '' }])} className="flex items-center gap-2 text-[#00E5D0] text-xs font-bold hover:opacity-80 transition-opacity"><Plus size={14} />Agregar testimonio</button>}
                    </div>

                    <SectionTitle icon={MessageSquare} title="Preguntas Frecuentes (FAQ)" color="#FF006E" />
                    <div className="space-y-3">
                        {form.faqs.map((f, i) => (
                            <div key={i} className="flex gap-3 items-start">
                                <div className="w-6 h-6 rounded-full bg-[#FF006E]/20 text-[#FF006E] text-xs font-black flex items-center justify-center flex-shrink-0 mt-3">{i + 1}</div>
                                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <input value={f.q} onChange={e => { const arr = [...form.faqs]; arr[i].q = e.target.value; set('faqs', arr) }} placeholder="Pregunta frecuente..." className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/35 focus:outline-none focus:border-[#FF006E]/50 text-sm" />
                                    <input value={f.a} onChange={e => { const arr = [...form.faqs]; arr[i].a = e.target.value; set('faqs', arr) }} placeholder="Respuesta..." className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/35 focus:outline-none focus:border-[#FF006E]/50 text-sm" />
                                </div>
                                {form.faqs.length > 1 && <button type="button" onClick={() => set('faqs', form.faqs.filter((_, j) => j !== i))} className="text-white/40 hover:text-red-400 transition-colors mt-2.5"><Trash2 size={16} /></button>}
                            </div>
                        ))}
                        {form.faqs.length < 6 && <button type="button" onClick={() => set('faqs', [...form.faqs, { q: '', a: '' }])} className="flex items-center gap-2 text-[#FF006E] text-xs font-bold hover:opacity-80 transition-opacity"><Plus size={14} />Agregar pregunta</button>}
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-white/55">Badges de Confianza</label>
                        <div className="flex flex-wrap gap-2">
                            {TRUST_BADGES.map(b => <Chip key={b} label={b} active={form.trustBadges.includes(b)} onClick={() => toggleArr('trustBadges', b)} color="#FFD700" />)}
                        </div>
                    </div>
                </div>
            )

            // ── STEP 4: Medios ────────────────────────────────────────────────
            case 4: return (
                <div className="space-y-8">
                    <SectionTitle icon={ImageIcon} title="Logo & Imágenes" color="#00FF88" />
                    <Input icon={ImageIcon} label="URL del Logo" placeholder="https://tu-sitio.com/logo.png" value={form.logoUrl} onChange={(e: any) => set('logoUrl', e.target.value)} />
                    <Input icon={ImageIcon} label="Imagen Principal (Hero)" placeholder="https://tu-sitio.com/imagen-hero.jpg" value={form.mainImageUrl} onChange={(e: any) => set('mainImageUrl', e.target.value)} />

                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-white/55 flex items-center gap-1.5"><ImageIcon size={12} />Imágenes Adicionales (hasta 5)</label>
                        <div className="space-y-2">
                            {form.additionalImages.map((img, i) => (
                                <div key={i} className="flex gap-2">
                                    <input value={img} onChange={e => { const arr = [...form.additionalImages]; arr[i] = e.target.value; set('additionalImages', arr) }} placeholder={`Imagen ${i + 2} URL`} className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/35 focus:outline-none focus:border-[#00FF88]/50 text-sm" />
                                    {form.additionalImages.length > 1 && <button type="button" onClick={() => set('additionalImages', form.additionalImages.filter((_, j) => j !== i))} className="text-white/40 hover:text-red-400 transition-colors"><Trash2 size={16} /></button>}
                                </div>
                            ))}
                            {form.additionalImages.length < 5 && <button type="button" onClick={() => set('additionalImages', [...form.additionalImages, ''])} className="flex items-center gap-2 text-[#00FF88] text-xs font-bold hover:opacity-80 transition-opacity"><Plus size={14} />Agregar imagen</button>}
                        </div>
                    </div>

                    <SectionTitle icon={Video} title="Videos" color="#00E5D0" />
                    <Input icon={Tv2} label="Video Principal (YouTube URL)" placeholder="https://youtube.com/watch?v=..." value={form.mainVideoUrl} onChange={(e: any) => set('mainVideoUrl', e.target.value)} />

                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-white/55 flex items-center gap-1.5"><Video size={12} />Videos Adicionales (hasta 2)</label>
                        <div className="space-y-2">
                            {form.additionalVideos.map((v, i) => (
                                <div key={i} className="flex gap-2">
                                    <input value={v} onChange={e => { const arr = [...form.additionalVideos]; arr[i] = e.target.value; set('additionalVideos', arr) }} placeholder={`Video ${i + 2} URL`} className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/35 focus:outline-none focus:border-[#00E5D0]/50 text-sm" />
                                    {form.additionalVideos.length > 1 && <button type="button" onClick={() => set('additionalVideos', form.additionalVideos.filter((_, j) => j !== i))} className="text-white/40 hover:text-red-400 transition-colors"><Trash2 size={16} /></button>}
                                </div>
                            ))}
                            {form.additionalVideos.length < 2 && <button type="button" onClick={() => set('additionalVideos', [...form.additionalVideos, ''])} className="flex items-center gap-2 text-[#00E5D0] text-xs font-bold hover:opacity-80 transition-opacity"><Plus size={14} />Agregar video</button>}
                        </div>
                    </div>
                </div>
            )

            // ── STEP 5: Diseño ────────────────────────────────────────────────
            case 5: return (
                <div className="space-y-8">
                    <SectionTitle icon={Zap} title="Paleta de Colores" color="#00FF88" />
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {COLOR_PALETTES.map(p => (
                            <button key={p.id} type="button" onClick={() => { set('colorPalette', p.id); set('primaryColor', p.primary); set('secondaryColor', p.secondary) }}
                                className={`p-5 rounded-2xl border text-left transition-all ${form.colorPalette === p.id ? 'border-white/40 scale-105 shadow-lg' : 'border-white/10 bg-white/5 hover:border-white/20'}`}
                                style={form.colorPalette === p.id ? { background: `${p.primary}15`, borderColor: p.primary } : {}}>
                                <div className="flex gap-2 mb-3">
                                    {p.preview.map((c, i) => <div key={i} className="w-6 h-6 rounded-full border border-white/10" style={{ background: c }} />)}
                                </div>
                                <div className="text-sm font-black text-white">{p.label}</div>
                                <div className="text-[10px] text-white/40 mt-1">{p.desc}</div>
                                {form.colorPalette === p.id && <div className="mt-2 text-[10px] font-black uppercase tracking-widest" style={{ color: p.primary }}>✓ Seleccionado</div>}
                            </button>
                        ))}
                    </div>

                    <SectionTitle icon={Sparkles} title="Estilo Visual" color={palette.primary} />
                    <div className="flex flex-wrap gap-2">
                        {VISUAL_STYLES.map(s => <Chip key={s} label={s} active={form.visualStyle === s} onClick={() => set('visualStyle', form.visualStyle === s ? '' : s)} color={palette.primary} />)}
                    </div>

                    <SectionTitle icon={Globe2} title="Tipografía" color={palette.secondary} />
                    <div className="flex flex-wrap gap-2">
                        {FONT_STYLES.map(f => <Chip key={f} label={f} active={form.fontStyle === f} onClick={() => set('fontStyle', form.fontStyle === f ? '' : f)} color={palette.secondary} />)}
                    </div>

                    <SectionTitle icon={Globe2} title="SEO (opcional)" color="#7B2FFF" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input label="Título SEO" placeholder="Curso de Marketing Digital | MY DIAMOND" value={form.seoTitle} onChange={(e: any) => set('seoTitle', e.target.value)} />
                        <Input label="Meta descripción" placeholder="Aprende a vender en línea con nuestro curso..." value={form.seoDescription} onChange={(e: any) => set('seoDescription', e.target.value)} />
                    </div>
                </div>
            )

            // ── STEP 6: Generar ───────────────────────────────────────────────
            case 6: return (
                <div className="space-y-8">
                    <SectionTitle icon={Sparkles} title="Tu Visión de la Landing" color="#00FF88" />
                    <TextArea
                        label="Describe exactamente cómo quieres tu landing page"
                        rows={7}
                        placeholder={`Ejemplos:\n- "Quiero que sea muy agresiva en ventas, con muchas estrellas y emojis de fuego"\n- "El hero debe tener el video como fondo y el texto encima"\n- "Quiero una sección de contador regresivo con 24 horas"\n- "El botón de WhatsApp debe estar en la parte inferior derecha siempre visible"\n- "Quiero 3 planes de precios: Básico, Pro y Elite"`}
                        value={form.vision}
                        onChange={(e: any) => set('vision', e.target.value)}
                    />

                    {/* Summary */}
                    <div className="border border-white/10 rounded-2xl p-6 space-y-3" style={{ background: 'rgba(8,22,36,0.96)' }}>
                        <h4 className="text-xs font-black uppercase tracking-widest text-white/55 mb-4">Resumen de tu Landing</h4>
                        {[
                            { label: 'Proyecto', value: form.name || '—' },
                            { label: 'Negocio', value: form.businessType || '—' },
                            { label: 'Descripción', value: form.description ? form.description.slice(0, 80) + (form.description.length > 80 ? '...' : '') : '—' },
                            { label: 'Oferta', value: form.salePrice ? `${form.regularPrice} → ${form.salePrice}` : form.regularPrice || '—' },
                            { label: 'Paleta', value: COLOR_PALETTES.find(p => p.id === form.colorPalette)?.label || '—' },
                            { label: 'Idioma', value: form.language },
                            { label: 'Beneficios', value: `${form.benefits.filter(b => b.title).length} definidos` },
                            { label: 'Testimonios', value: `${form.testimonials.filter(t => t.name).length} definidos` },
                        ].map(({ label, value }) => (
                            <div key={label} className="flex justify-between text-sm">
                                <span className="text-white/55 font-bold">{label}</span>
                                <span className="text-white text-right max-w-[60%]">{value}</span>
                            </div>
                        ))}
                    </div>

                    {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-3">{error}</div>}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <button
                            type="button"
                            onClick={handleGenerate}
                            disabled={!form.name || !form.description}
                            className="w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_40px_rgba(0,255,136,0.3)] hover:shadow-[0_0_60px_rgba(0,255,136,0.5)]"
                            style={{ background: `linear-gradient(135deg, ${palette.primary}, ${palette.secondary})`, color: '#000' }}
                        >
                            <Sparkles size={18} />
                            Generar con AI
                        </button>
                        <button
                            type="button"
                            onClick={() => setMode('html')}
                            className="w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all"
                        >
                            <Code size={18} />
                            Usar mi HTML
                        </button>
                    </div>
                    {(!form.name || !form.description) && <p className="text-white/40 text-xs text-center">Completa al menos el nombre y la descripción del negocio para generar</p>}
                </div>
            )

            default: return null
        }
    }

    // ─── Layout ───────────────────────────────────────────────────────────────
    return (
    <div className="dm-page font-ui">
        <div className="min-h-screen text-[#111827]">
            {/* Top Nav */}
            <nav className="h-16 border-b border-[#E4E9F0] flex items-center justify-between px-4 sm:px-8 bg-white/80 backdrop-blur-xl fixed top-0 left-0 w-full z-50 lg:left-[240px] lg:w-[calc(100%-240px)]">
                <div className="flex items-center gap-3">
                    <button onClick={() => setMode('select')} className="w-9 h-9 rounded-full border border-[#E4E9F0] flex items-center justify-center hover:bg-[#EEF2F7] transition-all">
                        <ArrowLeft size={16} />
                    </button>
                    <div>
                        <h1 className="text-sm font-black uppercase tracking-tight">Nueva Landing Page</h1>
                        <p className="text-[10px] text-[#0a95a8] font-bold uppercase tracking-widest hidden sm:block">Paso {step} de {STEPS.length} — {STEPS[step - 1].label}</p>
                    </div>
                    <AIKeySelector compact />
                </div>
                {/* Step dots — mobile */}
                <div className="flex items-center gap-1.5 sm:hidden">
                    {STEPS.map(s => (
                        <div key={s.id} className={`h-1.5 rounded-full transition-all ${s.id === step ? 'w-6 bg-[#0a95a8]' : s.id < step ? 'w-1.5 bg-[#0a95a8]/40' : 'w-1.5 bg-[#E4E9F0]'}`} />
                    ))}
                </div>
            </nav>

            {/* Step indicator — desktop */}
            <div className="fixed top-16 left-0 w-full z-40 bg-white/80 backdrop-blur-xl border-b border-[#E4E9F0] hidden sm:flex items-center justify-center py-4 px-8 gap-2 lg:left-[240px] lg:w-[calc(100%-240px)]">
                {STEPS.map((s, i) => (
                    <div key={s.id} className="flex items-center gap-2">
                        <button type="button" onClick={() => s.id < step && setStep(s.id)} className={`flex items-center gap-2 transition-all ${s.id === step ? 'text-[#111827]' : s.id < step ? 'text-[#0a95a8]/80 hover:text-[#0a95a8]' : 'text-[#111827]/20'}`}>
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black border transition-all ${s.id === step ? 'border-transparent bg-gradient-to-r from-[#1fb8bb] via-[#147e95] to-[#233B8F] text-white' : s.id < step ? 'border-[#0a95a8]/40 bg-[#0a95a8]/10 text-[#0a95a8]' : 'border-[#E4E9F0]'}`}>
                                {s.id < step ? <Check size={12} /> : s.id}
                            </div>
                            <span className="text-xs font-bold uppercase tracking-widest">{s.label}</span>
                        </button>
                        {i < STEPS.length - 1 && <div className={`w-8 h-px ${s.id < step ? 'bg-[#0a95a8]/30' : 'bg-[#E4E9F0]'}`} />}
                    </div>
                ))}
            </div>

            {/* Content */}
            <main className="pt-28 sm:pt-36 pb-32 px-4 sm:px-8 max-w-4xl mx-auto">
                <div className="border border-white/10 rounded-3xl p-6 sm:p-10 shadow-[0_24px_56px_rgba(8,22,36,0.30)]" style={{ background: 'linear-gradient(180deg, #212e38 0%, #273842 60%, #1a262f 100%)' }}>
                    {renderStep()}
                </div>
            </main>

            {/* Bottom Nav */}
            <div className="fixed bottom-[65px] left-0 w-full bg-white/85 backdrop-blur-xl border-t border-[#E4E9F0] px-4 sm:px-8 py-4 flex items-center justify-between z-50 lg:bottom-0 lg:left-[240px] lg:w-[calc(100%-240px)]">
                <button
                    type="button"
                    onClick={() => setStep(s => s - 1)}
                    disabled={step === 1}
                    className="flex items-center gap-2 text-[#6B7280] hover:text-[#111827] transition-colors disabled:opacity-20 font-bold text-sm"
                >
                    <ArrowLeft size={16} /> Anterior
                </button>
                <span className="text-[#9CA3AF] text-xs font-bold">{step} / {STEPS.length}</span>
                {step < STEPS.length ? (
                    <button
                        type="button"
                        onClick={() => setStep(s => s + 1)}
                        className="flex items-center gap-2 font-black text-sm uppercase tracking-widest px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#1fb8bb] via-[#147e95] to-[#233B8F] text-white hover:opacity-90 transition-all"
                    >
                        Siguiente <ArrowRight size={16} />
                    </button>
                ) : null}
            </div>
        </div>
    </div>
    )
}
