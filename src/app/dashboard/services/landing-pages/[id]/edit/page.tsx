'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
    Save,
    Plus,
    Smartphone,
    Monitor,
    Layout,
    ArrowLeft,
    Loader2,
    Globe,
    Users,
    Type,
    Activity,
    ChevronRight,
    Eye,
    ChevronUp,
    ChevronDown,
    Trash,
    Code2
} from 'lucide-react'
import { BlocksRenderer, BlockData } from '@/components/landing-pages/Blocks'
import Link from 'next/link'

// Placeholder for Glow component if not imported.
// In a real project, this would likely be a separate component file.
const Glow = ({ color, className, opacity }: { color: string, className?: string, opacity?: number }) => (
    <div
        className={`absolute w-96 h-96 rounded-full filter blur-3xl ${className}`}
        style={{ background: color, opacity: opacity || 0.1 }}
    />
);

export default function LandingEditor({ params }: { params: { id: string } }) {
    const router = useRouter()
    const [page, setPage] = useState<any>(null)
    const [blocks, setBlocks] = useState<BlockData[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop')
    const [showBlockPicker, setShowBlockPicker] = useState(false)
    const [codeMode, setCodeMode] = useState(false)
    const [rawHtml, setRawHtml] = useState('')

    useEffect(() => {
        fetchPage()
    }, [])

    const fetchPage = async () => {
        try {
            const res = await fetch(`/api/landing-pages/${params.id}`)
            const data = await res.json()
            if (data.page) {
                setPage(data.page)
                const sections = data.page.sections || []
                setBlocks(sections)
                const htmlBlock = sections.find((b: BlockData) => b.type === 'raw_html')
                if (htmlBlock) {
                    setRawHtml(htmlBlock.content?.html || '')
                    setCodeMode(true)
                }
            }
        } catch (error) {
            console.error('Error fetching page:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async () => {
        setSaving(true)
        try {
            const sectionsToSave = codeMode
                ? [{ id: 'raw-1', type: 'raw_html', content: { html: rawHtml }, styles: {} }]
                : blocks
            await fetch(`/api/landing-pages/${params.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sections: sectionsToSave })
            })
            if (codeMode) setBlocks(sectionsToSave as BlockData[])
            alert('¡Página publicada con éxito!')
        } catch (error) {
            alert('Error al guardar')
        } finally {
            setSaving(false)
        }
    }

    const getInitialContent = (type: string) => {
        switch (type) {
            case 'hero': return { badge: 'NUEVO LANZAMIENTO', title: 'ESCALE SU NEGOCIO AL NIVEL PRO', subtitle: 'La plataforma definitiva para emprendedores que buscan resultados reales sin complicaciones técnicas.', buttonText: 'COMENZAR AHORA', image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=800', videoId: '' }
            case 'logos': return { logos: [] }
            case 'features': return { title: 'Diferencial Pro', items: [{ title: 'Automatización', description: 'Sistemas inteligentes que trabajan mientras duermes.' }, { title: 'Escalabilidad', description: 'Crece sin límites con nuestra infraestructura global.' }, { title: 'Conversión', description: 'Diseños probados para capturar la máxima atención.' }] }
            case 'team': return { title: 'Nuestro Equipo de Expertos', members: [{ name: 'Luke Alexander', role: 'Founder & CEO', image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200', rev: '$510K', rating: '5.0', location: 'San Diego, USA' }] }
            case 'pricing': return { title: 'Inversión Inteligente', subtitle: 'Sin cargos ocultos. Transparencia total en cada paso.', tiers: [{ name: 'Starter', price: '49', features: ['Acceso básico', '1 Bot activo', 'Soporte email'], buttonText: 'Elegir Plan' }, { name: 'Empresa', price: '199', featured: true, features: ['Acceso total', 'Bots ilimitados', 'Soporte prioritario 24/7'], buttonText: 'Activar Pro' }] }
            case 'faq': return { title: 'Dudas Comunes', items: [{ question: '¿Cómo funciona el sistema?' }, { question: '¿Necesito conocimientos previos?' }, { question: '¿Puedo cancelar en cualquier momento?' }] }
            default: return {}
        }
    }

    const updateBlock = (id: string, field: string, value: any) => {
        if (field === 'delete') {
            setBlocks(blocks.filter(b => b.id !== id))
            return
        }

        if (field === 'moveUp') {
            const idx = blocks.findIndex(b => b.id === id)
            if (idx > 0) {
                const newBlocks = [...blocks]
                    ;[newBlocks[idx - 1], newBlocks[idx]] = [newBlocks[idx], newBlocks[idx - 1]]
                setBlocks(newBlocks)
            }
            return
        }

        if (field === 'moveDown') {
            const idx = blocks.findIndex(b => b.id === id)
            if (idx < blocks.length - 1) {
                const newBlocks = [...blocks]
                    ;[newBlocks[idx], newBlocks[idx + 1]] = [newBlocks[idx + 1], newBlocks[idx]]
                setBlocks(newBlocks)
            }
            return
        }

        if (field === 'add_after') {
            const idx = blocks.findIndex(b => b.id === id)
            setShowBlockPicker(true)
                // Guardamos temporalmente el índice para insertar el nuevo bloque después
                ; (window as any)._insertAfterIndex = idx
            return
        }

        setBlocks(blocks.map(b => b.id === id ? { ...b, content: { ...b.content, [field]: value } } : b))
    }

    // Modificamos addBlock para soportar inserción
    const addBlock = (type: string) => {
        const newBlock: BlockData = {
            id: Math.random().toString(36).substr(2, 9),
            type,
            content: getInitialContent(type),
            styles: { accentColor: '#00FF88', layout: 'center' }
        }

        const insertIdx = (window as any)._insertAfterIndex
        if (typeof insertIdx === 'number') {
            const newBlocks = [...blocks]
            newBlocks.splice(insertIdx + 1, 0, newBlock)
            setBlocks(newBlocks)
            delete (window as any)._insertAfterIndex
        } else {
            setBlocks([...blocks, newBlock])
        }

        setShowBlockPicker(false)
    }

    if (loading) return (
        <div className="h-screen w-full flex flex-col items-center justify-center bg-[#EEF2F7] text-[#111827]">
            <Loader2 className="w-12 h-12 text-[#00FF88] animate-spin mb-4" />
            <span className="font-black tracking-widest text-[#00FF88] uppercase text-xs">Cargando Software Pro...</span>
        </div>
    )

    return (
    <div className="dm-page font-ui">
        <div className="h-screen w-full flex flex-col bg-[#EEF2F7] overflow-hidden text-[#111827] font-inter">
            {/* Top Bar - Clean & Pro */}
            <nav className="h-16 sm:h-20 border-b border-[#E4E9F0] flex items-center justify-between px-3 sm:px-8 bg-black/50 backdrop-blur-2xl z-[100] fixed top-0 w-full gap-2">
                <div className="flex items-center gap-2 sm:gap-6 min-w-0">
                    <Link href="/dashboard/services/landing-pages" className="w-9 h-9 sm:w-10 sm:h-10 flex-shrink-0 rounded-full border border-purple-500/25 flex items-center justify-center hover:bg-[#EEF2F7] transition-all">
                        <ArrowLeft size={18} />
                    </Link>
                    <div className="min-w-0">
                        <h1 className="text-sm sm:text-lg font-black tracking-tighter uppercase truncate">{page?.name}</h1>
                        <p className="text-[9px] sm:text-[10px] text-[#00FF88] font-black uppercase tracking-widest hidden sm:block">Editor Visual Pro</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-6 flex-shrink-0">
                    {/* Desktop/Mobile toggle — oculto en móvil */}
                    <div className="hidden sm:flex bg-[#F4F6FA] p-1 rounded-2xl border border-purple-500/25 backdrop-blur-md">
                        <button
                            onClick={() => setPreviewMode('desktop')}
                            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 text-xs font-bold uppercase ${previewMode === 'desktop' ? 'bg-white text-black shadow-2xl scale-105' : 'text-[#111827]/40 hover:text-[#111827]'}`}
                        >
                            <Monitor size={16} /> Desktop
                        </button>
                        <button
                            onClick={() => setPreviewMode('mobile')}
                            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 text-xs font-bold uppercase ${previewMode === 'mobile' ? 'bg-white text-black shadow-2xl scale-105' : 'text-[#111827]/40 hover:text-[#111827]'}`}
                        >
                            <Smartphone size={16} /> Mobile
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setCodeMode(m => !m)}
                            title="Editar código HTML"
                            className={`p-2 sm:p-3 rounded-xl border transition-all flex-shrink-0 ${codeMode ? 'bg-[#00FF88] border-[#00FF88] text-black' : 'border-[#E4E9F0] hover:bg-[#F4F6FA] text-[#111827]'}`}
                        >
                            <Code2 size={18} />
                        </button>
                        <a href={`/lp/${page?.slug}`} target="_blank" className="p-2 sm:p-3 rounded-xl border border-purple-500/25 hover:bg-[#F4F6FA] transition-all flex-shrink-0">
                            <Eye size={18} />
                        </a>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="bg-[#00FF88] hover:bg-[#00FF88]/90 text-black px-4 sm:px-8 py-2.5 sm:py-3 rounded-full font-black text-[10px] sm:text-xs uppercase tracking-widest transition-all shadow-[0_0_40px_rgba(0,255,136,0.3)] flex items-center gap-2 disabled:opacity-50 whitespace-nowrap"
                        >
                            {saving ? <Loader2 size={14} className="animate-spin" /> : <Globe size={14} />}
                            Publicar
                        </button>
                    </div>
                </div>
            </nav>

            {/* Main Canvas Area */}
            <main className="flex-1 mt-16 sm:mt-20 overflow-y-auto bg-[#EEF2F7] flex justify-center p-4 sm:p-8 scrollbar-hide">
                <div className={`transition-all duration-700 relative ${previewMode === 'desktop' ? 'w-full max-w-[1440px]' : 'w-[375px] h-[812px] rounded-[3rem] border-[12px] border-[#E4E9F0] shadow-[0_0_100px_rgba(0,0,0,0.8)] overflow-hidden scale-90 mt-[-5%]'
                    }`}>
                    <div className={`h-full ${previewMode === 'mobile' ? 'overflow-y-auto scrollbar-hide' : ''}`}>
                        <div className="relative" style={{ minHeight: 'calc(100vh - 80px)' }}>
                            {codeMode ? (
                                <textarea
                                    value={rawHtml}
                                    onChange={e => setRawHtml(e.target.value)}
                                    spellCheck={false}
                                    className="w-full bg-[#0A0A0F] text-[#00FF88] font-mono text-sm p-6 outline-none resize-none border-none"
                                    style={{ minHeight: 'calc(100vh - 80px)', display: 'block' }}
                                    placeholder="<!-- Escribe o pega tu HTML aquí -->"
                                />
                            ) : (
                                <div className="pb-40">
                                    <BlocksRenderer blocks={blocks} isEditing={true} onEdit={updateBlock} />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            {/* Block Picker Overlay */}
            {showBlockPicker && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 animate-in fade-in duration-300">
                    <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={() => setShowBlockPicker(false)} />
                    <div className="relative w-full max-w-4xl rounded-[40px] p-12 overflow-hidden border border-white/10 shadow-[0_0_100px_rgba(0,255,136,0.1)] text-white" style={{ background: 'linear-gradient(180deg, #0B1B2B 0%, #081624 60%, #050B14 100%)' }}>
                        <Glow color="#FF2D95" className="-top-40 -left-40" opacity={0.1} />
                        <h2 className="text-3xl font-black uppercase tracking-tighter mb-12 flex items-center gap-4 text-white">
                            <div className="w-10 h-1 bg-gradient-to-r from-[#FF2D95] via-[#B735B8] to-[#233B8F] rounded-full" />
                            Biblioteca de Bloques Pro
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {[
                                { type: 'hero', icon: Layout, label: 'Hero / Cabecera', desc: 'Título masivo y video de fondo' },
                                { type: 'logos', icon: Globe, label: 'Trust / Logos', desc: 'Marcas que confían en ti' },
                                { type: 'features', icon: Activity, label: 'Beneficios', desc: 'Diseño Glassmorphism elite' },
                                { type: 'team', icon: Users, label: 'Experiencia / Team', desc: 'Muestra a tus expertos' },
                                { type: 'pricing', icon: Type, label: 'Precios / Offers', desc: 'Tablas de alta conversión' },
                                { type: 'faq', icon: ChevronRight, label: 'FAQs / Dudas', desc: 'Información clara y pro' },
                            ].map((b) => (
                                <button
                                    key={b.type}
                                    onClick={() => addBlock(b.type)}
                                    className="bg-[#F4F6FA] border border-purple-500/25 p-8 rounded-[32px] text-left hover:bg-[#00FF88] hover:text-black transition-all group hover:-translate-y-2"
                                >
                                    <b.icon className="w-10 h-10 mb-6 group-hover:scale-110 transition-transform" />
                                    <h4 className="text-lg font-black uppercase m-0">{b.label}</h4>
                                    <p className="text-xs opacity-40 group-hover:opacity-100 mt-2 font-medium">{b.desc}</p>
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={() => setShowBlockPicker(false)}
                            className="absolute top-8 right-8 text-[#111827]/20 hover:text-[#111827] transition-colors"
                        >
                            <Plus size={32} className="rotate-45" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    </div>
    )
}
