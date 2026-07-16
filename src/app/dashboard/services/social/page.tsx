'use client'
import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { Send, Calendar, History, BarChart2, Zap, Image, Video, Sparkles, Wand2, FileText, Trash2, Plus, Loader2, CheckCircle, XCircle, Clock, ExternalLink, Copy } from 'lucide-react'
import AIKeySelector from '@/components/AIKeySelector'
import { usePlanGuard } from '@/hooks/usePlanGuard'

const NETWORKS = [
    { id: 'FACEBOOK', label: 'Facebook', icon: '📘', color: '#1877F2', supportsText: true, supportsImage: true, supportsVideo: true, supportsStory: true },
    { id: 'INSTAGRAM', label: 'Instagram', icon: '📸', color: '#E1306C', supportsText: false, supportsImage: true, supportsVideo: true, supportsStory: true },
    { id: 'TIKTOK', label: 'TikTok', icon: '🎵', color: '#010101', supportsText: false, supportsImage: false, supportsVideo: true, supportsStory: false },
    { id: 'YOUTUBE', label: 'YouTube', icon: '▶️', color: '#FF0000', supportsText: false, supportsImage: false, supportsVideo: true, supportsStory: false },
]

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
    PUBLISHED: { label: 'Publicado', color: '#0a95a8', icon: CheckCircle },
    SCHEDULED: { label: 'Programado', color: '#00BFFF', icon: Clock },
    FAILED: { label: 'Fallido', color: '#FF4444', icon: XCircle },
    PARTIAL: { label: 'Parcial', color: '#FFA500', icon: CheckCircle },
    PUBLISHING: { label: 'Publicando...', color: '#888', icon: Loader2 },
    DRAFT: { label: 'Borrador', color: '#888', icon: FileText },
}

// Prompt de ENTREVISTA para armar el perfil de CONTENIDO en ChatGPT (no publicidad).
const CONTENT_CHATGPT_PROMPT = `Sos un experto en marketing de contenido y redes sociales. Vas a ayudarme a armar la descripción de mi página para generar CONTENIDO orgánico profesional (posts para publicar, NO publicidad).

Primero, IDENTIFICÁ de qué trata mi página/negocio según lo que te cuente. Después hacéme estas preguntas UNA POR UNA (esperá mi respuesta antes de pasar a la siguiente), de forma simple y clara:

1. ¿Cómo se llama tu página o negocio?
2. ¿De qué trata tu página? ¿Qué compartís o mostrás?
3. ¿Quién es tu audiencia ideal? (edad, género, intereses)
4. ¿Qué tipo de contenido querés publicar? (ej: tips, motivación, detrás de escena, testimonios, educativo, novedades, humor)
5. ¿Qué querés que tu seguidor sienta, aprenda o haga con tu contenido?
6. ¿Qué te hace diferente? ¿Cuál es tu sello o personalidad?
7. ¿Qué tono querés transmitir? (ej: cercano, divertido, inspirador, profesional, educativo)
8. ¿Cuál es tu objetivo con el contenido? (crecer comunidad, más engagement, educar, posicionar tu marca)
9. ¿Colores o estilo visual de tu marca? (si tenés)
10. ¿En qué redes publicás y con qué frecuencia? (opcional)

Y AGREGÁ las preguntas propias de mi rubro (por ejemplo: gastronomía → platos estrella, ambiente, detrás de la cocina; fitness → rutinas, transformaciones, tips; belleza → antes/después, cuidados, tutoriales; educación/cursos → temas, tips, resultados; etc.).

Cuando termine de responder TODO, armá un ÚNICO texto claro y completo (en español, en párrafos naturales, SIN listas ni encabezados) que describa mi página y mi estilo de contenido con todos esos datos. Tiene que ser completo y específico porque lo voy a pegar en una herramienta que genera CONTENIDO para mis redes.`

// SEGUNDO prompt (agregado) — para MARCA PERSONAL: la PERSONA es la protagonista.
const CHATGPT_PERSONAL_PROMPT = `Sos un experto en MARCA PERSONAL y contenido para redes sociales. Vas a ayudarme a armar la descripción de MI MARCA PERSONAL para generar contenido profesional donde YO soy el protagonista (posts de valor, NO publicidad).

Primero, IDENTIFICÁ mi rubro/expertise según lo que te cuente. Después hacéme estas preguntas UNA POR UNA (esperá mi respuesta antes de pasar a la siguiente):

1. ¿Cómo te llamás y a qué te dedicás?
2. ¿En qué sos experto o referente? ¿Qué te da autoridad?
3. ¿Quién es tu audiencia ideal? (a quién querés inspirar o ayudar)
4. ¿Qué tipo de contenido querés mostrar? (tips, tu historia, detrás de escena, logros, enseñanzas, motivación)
5. ¿Qué querés que la gente sienta o aprenda de vos?
6. ¿Cuál es tu historia o tu diferencial? ¿Qué te hace único?
7. ¿Qué tono/personalidad querés transmitir? (cercano, inspirador, experto, motivador)
8. ¿Cuál es tu objetivo? (crecer tu marca personal, autoridad, comunidad, oportunidades)
9. ¿Tu estilo visual? (colores, si sos más formal/moderno/elegante)
10. ¿En qué redes publicás?

Y AGREGÁ las preguntas propias de mi rubro (coach → transformaciones y clientes; negocios/liderazgo → resultados y método; fitness → tu método; educación → tu enfoque; etc.).

Cuando termine de responder TODO, armá un ÚNICO texto claro y completo (en español, en párrafos naturales, SIN listas ni encabezados) que describa mi marca personal y mi estilo de contenido. Lo voy a pegar en una herramienta que genera contenido donde YO soy el protagonista.`

function toBold(text: string): string {
    const boldMap: Record<string, string> = { 'a':'𝗮','b':'𝗯','c':'𝗰','d':'𝗱','e':'𝗲','f':'𝗳','g':'𝗴','h':'𝗵','i':'𝗶','j':'𝗷','k':'𝗸','l':'𝗹','m':'𝗺','n':'𝗻','o':'𝗼','p':'𝗽','q':'𝗾','r':'𝗿','s':'𝘀','t':'𝘁','u':'𝘂','v':'𝘃','w':'𝘄','x':'𝘅','y':'𝘆','z':'𝘇','A':'𝗔','B':'𝗕','C':'𝗖','D':'𝗗','E':'𝗘','F':'𝗙','G':'𝗚','H':'𝗛','I':'𝗜','J':'𝗝','K':'𝗞','L':'𝗟','M':'𝗠','N':'𝗡','O':'𝗢','P':'𝗣','Q':'𝗤','R':'𝗥','S':'𝗦','T':'𝗧','U':'𝗨','V':'𝗩','W':'𝗪','X':'𝗫','Y':'𝗬','Z':'𝗭' }
    return text.split('').map(c => boldMap[c] || c).join('')
}

export default function SocialPage() {
    usePlanGuard()
    const searchParams = useSearchParams()
    const [tab, setTab] = useState<'create' | 'calendar' | 'history' | 'metrics' | 'connections'>('create')
    const [connections, setConnections] = useState<any[]>([])
    const [posts, setPosts] = useState<any[]>([])
    const [metrics, setMetrics] = useState<any>(null)
    const [usageLimits, setUsageLimits] = useState<{ limits: any; scheduledCount: number; monthlyCount: number } | null>(null)
    const [loading, setLoading] = useState(false)
    const [aiLoading, setAiLoading] = useState(false)

    // Create form state
    const [content, setContent] = useState('')
    const [mediaUrl, setMediaUrl] = useState<string | null>(null)
    const [mediaType, setMediaType] = useState<string | null>(null)
    const [postType, setPostType] = useState<'feed' | 'story'>('feed')
    const [selectedNetworks, setSelectedNetworks] = useState<string[]>([])
    const [scheduledAt, setScheduledAt] = useState('')
    const [fbPages, setFbPages] = useState<any[]>([]) // páginas FB + cuentas IG vinculadas
    const [fbPagesLoading, setFbPagesLoading] = useState(false)
    const [fbPagesError, setFbPagesError] = useState('')
    const [pageSelections, setPageSelections] = useState<Record<string, any>>({})
    // pageSelections: { FACEBOOK?: { pageId, pageAccessToken, pageName }, INSTAGRAM?: { accountId, pageAccessToken, username } }
    const [topic, setTopic] = useState('')
    // Generar imagen con IA (contenido orgánico para la página) — flujo estilo Meta Ads
    const [imgTopic, setImgTopic] = useState('')
    const [imgStyle, setImgStyle] = useState('natural')
    const [imgFormat, setImgFormat] = useState<'feed' | 'story'>('feed')
    const [imgMode, setImgMode] = useState<'natural' | 'personal'>('natural') // natural (el que gustó) | marca personal (agencia)
    const [imgQuality, setImgQuality] = useState<'alta' | 'rapida'>('alta') // alta (mejor, ~1-2min) | rápida (~30-60s)
    const [imgPrompt, setImgPrompt] = useState('')            // prompt visible/editable (gpt-5.2)
    const [imgRefUrls, setImgRefUrls] = useState<string[]>([]) // fotos de referencia (varios ángulos)
    const [imgRefUploading, setImgRefUploading] = useState(false)
    const [imgPromptLoading, setImgPromptLoading] = useState(false)
    const [imgLoading, setImgLoading] = useState(false)
    const [imgResultUrl, setImgResultUrl] = useState<string | null>(null)
    const [imgPreviewErr, setImgPreviewErr] = useState(false)
    const [showImgManual, setShowImgManual] = useState(false)
    const [imgProfileName, setImgProfileName] = useState<string | null>(null) // perfil que usó al generar
    // Perfil de Contenido de la página (equivalente del brief, pero para contenido orgánico)
    const [contentProfiles, setContentProfiles] = useState<any[]>([])
    const [selectedProfileId, setSelectedProfileId] = useState('')
    const [profileFormOpen, setProfileFormOpen] = useState(false)
    const [profileDesc, setProfileDesc] = useState('')
    const [profileGenLoading, setProfileGenLoading] = useState(false)
    const [profileSaving, setProfileSaving] = useState(false)
    const [draft, setDraft] = useState<any | null>(null) // borrador editable (campos como texto)
    const [copiedPrompt, setCopiedPrompt] = useState(false)
    const [copiedPersonal, setCopiedPersonal] = useState(false)
    const [script, setScript] = useState('')
    const [scriptTopic, setScriptTopic] = useState('')
    const [scriptModal, setScriptModal] = useState(false)
    const [scriptLoading, setScriptLoading] = useState(false)
    const [uploadingMedia, setUploadingMedia] = useState(false)
    const [publishResult, setPublishResult] = useState<any>(null)
    const [error, setError] = useState('')

    const fileRef = useRef<HTMLInputElement>(null)
    const imgRefFileRef = useRef<HTMLInputElement>(null)
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    useEffect(() => {
        loadConnections()
        loadPosts()
        loadProfiles()
        const connected = searchParams.get('connected')
        const err = searchParams.get('error')
        if (connected) { setError(''); loadConnections() }
        if (err) setError(decodeURIComponent(err))
    }, [])

    async function loadConnections() {
        const res = await fetch('/api/social/connections')
        const data = await res.json()
        setConnections(data.connections || [])
    }

    async function loadPosts(status?: string) {
        const qs = status ? `?status=${status}` : ''
        const res = await fetch(`/api/social/posts${qs}`)
        const data = await res.json()
        setPosts(data.posts || [])
        if (data.limits) setUsageLimits({ limits: data.limits, scheduledCount: data.scheduledCount, monthlyCount: data.monthlyCount })
    }

    async function loadMetrics() {
        const res = await fetch('/api/social/metrics')
        const data = await res.json()
        setMetrics(data)
    }

    useEffect(() => {
        if (tab === 'history') loadPosts()
        if (tab === 'calendar') loadPosts('SCHEDULED')
        if (tab === 'metrics') loadMetrics()
    }, [tab])

    async function toggleNetwork(networkId: string) {
        const willSelect = !selectedNetworks.includes(networkId)
        setSelectedNetworks(prev => prev.includes(networkId) ? prev.filter(x => x !== networkId) : [...prev, networkId])

        // Cargar páginas FB/IG la primera vez que se selecciona cualquiera de las dos
        if (willSelect && (networkId === 'FACEBOOK' || networkId === 'INSTAGRAM') && fbPages.length === 0 && !fbPagesLoading) {
            setFbPagesLoading(true)
            setFbPagesError('')
            try {
                const res = await fetch('/api/social/facebook/pages')
                const data = await res.json()
                if (res.ok) {
                    setFbPages(data.pages || [])
                } else {
                    setFbPagesError(data.error || 'Error al cargar páginas')
                }
            } catch (e: any) {
                setFbPagesError(e.message || 'Error de conexión')
            }
            setFbPagesLoading(false)
        }
    }

    async function handleUpload(file: File) {
        setUploadingMedia(true)
        const fd = new FormData()
        fd.append('file', file)
        const res = await fetch('/api/social/upload', { method: 'POST', body: fd })
        const data = await res.json()
        setUploadingMedia(false)
        if (!res.ok) { setError(data.error); return }
        setMediaUrl(data.mediaUrl)
        setMediaType(data.mediaType)
    }

    async function handleAI(action: string) {
        setAiLoading(true)
        setError('')
        const res = await fetch('/api/social/ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, content, topic, networks: selectedNetworks })
        })
        const data = await res.json()
        setAiLoading(false)
        if (!res.ok) { setError(data.error); return }
        if (action === 'script') setScript(data.result)
        else setContent(data.result)
    }

    // ── Perfil de Contenido ──
    async function loadProfiles() {
        try {
            const res = await fetch('/api/social/content-profile')
            const data = await res.json()
            if (res.ok) {
                const list = data.profiles || []
                setContentProfiles(list)
                setSelectedProfileId(prev => prev || (list[0]?.id ?? ''))
                if (list.length === 0) setProfileFormOpen(true) // sin perfiles → abrir crear directo
            }
        } catch { /* noop */ }
    }

    function openNewProfile() {
        setProfileFormOpen(true)
        setProfileDesc('')
        setDraft(null)
    }

    async function copyContentPrompt() {
        try {
            await navigator.clipboard.writeText(CONTENT_CHATGPT_PROMPT)
            setCopiedPrompt(true)
            setTimeout(() => setCopiedPrompt(false), 2500)
        } catch {
            setError('No se pudo copiar. Seleccioná el texto y copialo a mano.')
        }
    }

    async function copyPersonalPrompt() {
        try {
            await navigator.clipboard.writeText(CHATGPT_PERSONAL_PROMPT)
            setCopiedPersonal(true)
            setTimeout(() => setCopiedPersonal(false), 2500)
        } catch {
            setError('No se pudo copiar. Seleccioná el texto y copialo a mano.')
        }
    }

    async function handleGenerateProfile() {
        if (!profileDesc.trim()) { setError('Describí tu página para armar el perfil'); return }
        setError('')
        setProfileGenLoading(true)
        try {
            const res = await fetch('/api/social/content-profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ generate: true, description: profileDesc }),
            })
            const data = await res.json()
            if (!res.ok) { setError(data.error || 'No se pudo armar el perfil'); return }
            const p = data.profile || {}
            setDraft({
                pageName: p.pageName || '',
                about: p.about || '',
                audience: p.audience || '',
                tone: (p.tone || []).join(', '),
                contentThemes: (p.contentThemes || []).join(', '),
                brandColors: (p.brandColors || []).join(', '),
                visualStyle: (p.visualStyle || []).join(', '),
                contentGoal: p.contentGoal || '',
            })
        } catch (e: any) {
            setError(e.message || 'Error al armar el perfil')
        } finally {
            setProfileGenLoading(false)
        }
    }

    async function handleSaveProfile() {
        if (!draft?.pageName?.trim()) { setError('Ponele un nombre a la página/negocio'); return }
        setError('')
        setProfileSaving(true)
        try {
            const res = await fetch('/api/social/content-profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ save: true, ...draft }),
            })
            const data = await res.json()
            if (!res.ok) { setError(data.error || 'No se pudo guardar el perfil'); return }
            setProfileFormOpen(false)
            setDraft(null)
            setProfileDesc('')
            await loadProfiles()
            if (data.profile?.id) setSelectedProfileId(data.profile.id)
        } catch (e: any) {
            setError(e.message || 'Error al guardar el perfil')
        } finally {
            setProfileSaving(false)
        }
    }

    async function handleDeleteProfile() {
        if (!selectedProfileId) return
        try {
            await fetch(`/api/social/content-profile?id=${selectedProfileId}`, { method: 'DELETE' })
            setSelectedProfileId('')
            await loadProfiles()
        } catch { /* noop */ }
    }

    // Genera el TEXTO del post según el Perfil de Contenido (la "estrategia" de la página).
    async function handleGenerateTextAI() {
        if (!selectedProfileId && !topic.trim()) { setError('Elegí un perfil de contenido arriba, o escribí un tema'); return }
        setError('')
        setAiLoading(true)
        try {
            const res = await fetch('/api/social/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'generate', topic, networks: selectedNetworks, profileId: selectedProfileId || undefined, imagePrompt: imgPrompt || undefined }),
            })
            const data = await res.json()
            if (!res.ok) { setError(data.error || 'No se pudo generar el texto'); return }
            setContent(data.result || '')
        } catch (e: any) {
            setError(e.message || 'Error al generar el texto')
        } finally {
            setAiLoading(false)
        }
    }

    // 1) gpt-5.2 escribe el prompt y lo muestra en el cuadro editable.
    async function handleWritePrompt() {
        const t = (imgTopic || topic || content).trim()
        if (!t && !selectedProfileId) { setError('Elegí (y guardá) un perfil de contenido arriba, o escribí un tema'); return }
        setError('')
        setImgPromptLoading(true)
        try {
            const res = await fetch('/api/social/generate-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ topic: t, style: imgStyle, format: imgFormat, referenceImageUrls: imgRefUrls, promptOnly: true, profileId: selectedProfileId || undefined, mode: imgMode }),
            })
            const data = await res.json()
            if (!res.ok) { setError(data.error || 'No se pudo escribir el prompt'); return }
            setImgPrompt(data.prompt || '')
            setImgProfileName(data.profileName || null)
        } catch (e: any) {
            setError(e.message || 'Error al escribir el prompt')
        } finally {
            setImgPromptLoading(false)
        }
    }

    // 2) Sube la foto de referencia (opcional).
    async function handleUploadRef(file: File) {
        setImgRefUploading(true)
        setError('')
        try {
            const fd = new FormData()
            fd.append('file', file)
            const res = await fetch('/api/social/upload', { method: 'POST', body: fd })
            const data = await res.json()
            if (!res.ok) { setError(data.error || 'No se pudo subir la referencia'); return }
            setImgRefUrls([data.mediaUrl]) // una sola foto
        } catch (e: any) {
            setError(e.message || 'Error al subir la referencia')
        } finally {
            setImgRefUploading(false)
        }
    }

    // 3) Genera la imagen con el prompt (+ referencia si hay) y la muestra + la deja en el post.
    async function handleGenerateImage() {
        const t = (imgTopic || topic || content).trim()
        if (!imgPrompt.trim() && !t && !selectedProfileId) { setError('Elegí (y guardá) un perfil de contenido, escribí un tema, o escribí el prompt'); return }
        setError('')
        setImgPreviewErr(false)
        setImgLoading(true)
        try {
            const res = await fetch('/api/social/generate-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    topic: t,
                    style: imgStyle,
                    format: imgFormat,
                    customPrompt: imgPrompt.trim() || undefined,
                    referenceImageUrls: imgRefUrls,
                    profileId: selectedProfileId || undefined,
                    mode: imgMode,
                    quality: imgQuality,
                }),
            })
            const data = await res.json()
            if (!res.ok) { setError(data.error || 'Error al generar la imagen'); return }
            setImgResultUrl(data.mediaUrl)
            setMediaUrl(data.mediaUrl)
            setMediaType('image')
            setImgProfileName(data.profileName || null)
            if (data.prompt && !imgPrompt.trim()) setImgPrompt(data.prompt)
        } catch (e: any) {
            setError(e.message || 'Error al generar la imagen')
        } finally {
            setImgLoading(false)
        }
    }

    function insertBold() {
        const ta = textareaRef.current
        if (!ta) return
        const start = ta.selectionStart
        const end = ta.selectionEnd
        const selected = content.slice(start, end)
        if (!selected) return
        const bold = toBold(selected)
        setContent(content.slice(0, start) + bold + content.slice(end))
    }

    async function handlePublish() {
        setError('')
        setPublishResult(null)
        if (!content.trim()) { setError('Escribe el contenido del post'); return }
        if (!selectedNetworks.length) { setError('Selecciona al menos una red social'); return }
        setLoading(true)
        const res = await fetch('/api/social/posts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content, mediaUrl, mediaType, postType, scheduledAt: scheduledAt || null, networks: selectedNetworks, pageSelections })
        })
        const data = await res.json()
        setLoading(false)
        if (!res.ok) { setError(data.error); return }
        setPublishResult(data)
        setContent(''); setMediaUrl(null); setMediaType(null); setScheduledAt('')
        // Refresh usage counters
        loadPosts()
    }

    async function handleGenerateScript() {
        if (!scriptTopic.trim()) return
        setScriptLoading(true)
        const res = await fetch('/api/social/ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'script', topic: scriptTopic, content: '', networks: [] })
        })
        const data = await res.json()
        setScriptLoading(false)
        if (!res.ok) { setError(data.error); return }
        setScript(data.result)
    }

    async function handleDeletePost(id: string) {
        await fetch(`/api/social/posts/${id}`, { method: 'DELETE' })
        loadPosts()
    }

    const connectedNetworks = connections.map(c => c.network)
    const networkConnected = (id: string) => connectedNetworks.includes(id)

    // Nombre a mostrar en la vista previa (la página conectada, o el perfil de contenido).
    const previewName = pageSelections?.FACEBOOK?.pageName
        || (pageSelections?.INSTAGRAM?.username ? `@${pageSelections.INSTAGRAM.username}` : '')
        || connections?.[0]?.accountName
        || contentProfiles.find(p => p.id === selectedProfileId)?.pageName
        || 'Tu página'

    return (
        <div className="dm-page font-ui">
        <div className="p-4 md:p-6 lg:px-8 max-w-5xl mx-auto">
            {/* Header */}
            <div className="mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="min-w-0">
                    <h1 className="text-xl sm:text-2xl font-bold text-[#111827] flex items-center gap-2">
                        <Send size={22} className="text-[#0a95a8] flex-shrink-0" /> Publicador Social
                    </h1>
                    <p className="text-[#6B7280] text-xs sm:text-sm mt-1">Publica en Facebook, Instagram, TikTok y YouTube</p>
                </div>
                <div className="flex items-center gap-2 self-start flex-shrink-0 flex-wrap">
                  <AIKeySelector compact />
                  <button onClick={() => { setScript(''); setScriptTopic(''); setScriptModal(true) }}
                    className="flex items-center gap-2 px-3 py-2 sm:px-4 rounded-xl bg-[#0a95a8]/10 text-[#0a95a8] border border-[#0a95a8]/30 hover:bg-[#0a95a8]/20 transition-all text-sm font-medium whitespace-nowrap">
                    <FileText size={14} /> Guión de video
                  </button>
                </div>
            </div>

            {error && (
                <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>
            )}

            {/* Usage limits bar */}
            {usageLimits && (
                <div className="mb-5 grid grid-cols-2 gap-3">
                    <div className="dm-card-dark p-3 rounded-xl border border-white/10">
                        <div className="flex items-center justify-between mb-1.5">
                            <span className="text-white/55 text-xs">Publicaciones este mes</span>
                            <span className="text-white text-xs font-semibold">{usageLimits.monthlyCount} / {usageLimits.limits.monthlyPosts}</span>
                        </div>
                        <div className="w-full bg-white/10 rounded-full h-1.5">
                            <div className="h-1.5 rounded-full transition-all"
                                style={{
                                    width: `${Math.min(100, (usageLimits.monthlyCount / usageLimits.limits.monthlyPosts) * 100)}%`,
                                    background: usageLimits.monthlyCount >= usageLimits.limits.monthlyPosts ? '#FF4444' : '#0a95a8'
                                }} />
                        </div>
                    </div>
                    <div className="dm-card-dark p-3 rounded-xl border border-white/10">
                        <div className="flex items-center justify-between mb-1.5">
                            <span className="text-white/55 text-xs">Programadas activas</span>
                            <span className="text-white text-xs font-semibold">{usageLimits.scheduledCount} / {usageLimits.limits.scheduledSlots}</span>
                        </div>
                        <div className="w-full bg-white/10 rounded-full h-1.5">
                            <div className="h-1.5 rounded-full transition-all"
                                style={{
                                    width: `${Math.min(100, (usageLimits.scheduledCount / usageLimits.limits.scheduledSlots) * 100)}%`,
                                    background: usageLimits.scheduledCount >= usageLimits.limits.scheduledSlots ? '#FF4444' : '#00BFFF'
                                }} />
                        </div>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
                {[
                    { id: 'create', label: 'Crear', icon: Plus },
                    { id: 'calendar', label: 'Programados', icon: Calendar },
                    { id: 'history', label: 'Historial', icon: History },
                    { id: 'metrics', label: 'Métricas', icon: BarChart2 },
                    { id: 'connections', label: 'Cuentas', icon: Zap },
                ].map(t => (
                    <button key={t.id} onClick={() => setTab(t.id as any)}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${tab === t.id ? 'bg-gradient-to-r from-[#1fb8bb] via-[#147e95] to-[#233B8F] text-white hover:opacity-90' : 'bg-[#F4F6FA] text-[#6B7280] hover:bg-[#EEF2F7]'}`}>
                        <t.icon size={14} /> {t.label}
                    </button>
                ))}
            </div>

            {/* CREATE TAB */}
            {tab === 'create' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Left: editor */}
                    <div className="lg:col-span-2 space-y-4">
                        {/* Perfil de Contenido — el equivalente del brief, pero para contenido orgánico */}
                        <div className="dm-card-dark p-4 rounded-2xl border border-white/10 space-y-2">
                            <p className="text-white text-sm font-medium flex items-center gap-1"><FileText size={13} className="text-[#4dfae8]" /> Perfil de contenido de tu página</p>
                            <p className="text-white/50 text-[11px]">Para que la IA genere <b>contenido real de tu página</b> (no publicidad). Uno por página/negocio.</p>
                            {contentProfiles.length > 0 ? (
                                <div className="flex flex-wrap items-center gap-2">
                                    <select value={selectedProfileId} onChange={e => setSelectedProfileId(e.target.value)}
                                        className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#4dfae8]/50 [&>option]:bg-[#273842]">
                                        <option value="">— Elegí un perfil —</option>
                                        {contentProfiles.map(p => <option key={p.id} value={p.id}>{p.pageName}</option>)}
                                    </select>
                                    <button onClick={openNewProfile} className="px-3 py-2 rounded-xl bg-[#4dfae8]/10 text-[#4dfae8] text-xs font-semibold hover:bg-[#4dfae8]/20 flex items-center gap-1"><Plus size={12} /> Nuevo</button>
                                    {selectedProfileId && !profileFormOpen && (
                                        <button onClick={handleDeleteProfile} title="Borrar perfil" className="px-2 py-2 rounded-xl bg-white/5 text-white/50 hover:text-red-400 hover:bg-red-500/10"><Trash2 size={12} /></button>
                                    )}
                                </div>
                            ) : !profileFormOpen && (
                                <div className="rounded-xl border border-[#4dfae8]/25 bg-[#4dfae8]/5 p-2.5 flex items-center justify-between gap-2">
                                    <span className="text-[#4dfae8] text-xs">Todavía no tenés un perfil. Creá el primero 👇</span>
                                    <button onClick={openNewProfile} className="px-3 py-1.5 rounded-lg bg-[#4dfae8]/15 text-[#4dfae8] text-xs font-semibold hover:bg-[#4dfae8]/25 flex items-center gap-1 whitespace-nowrap"><Plus size={12} /> Crear</button>
                                </div>
                            )}

                            {profileFormOpen && (
                                <div className="mt-1 space-y-2 border-t border-white/10 pt-2">
                                    {!draft ? (
                                        <>
                                            {/* ¿No sabés qué escribir? Usá tu ChatGPT (entrevista para CONTENIDO) */}
                                            <div className="rounded-xl border border-[#4C97D8]/25 bg-[#4C97D8]/5 p-2.5 space-y-1.5">
                                                <p className="text-[#7FB2E5] text-xs font-semibold flex items-center gap-1">🤖 ¿No sabés qué escribir? Usá tu ChatGPT</p>
                                                <p className="text-white/50 text-[11px]">Elegí un prompt según tu página, copialo, pegalo en tu ChatGPT, respondé las preguntas y pegá el texto abajo.</p>
                                                <div className="flex flex-wrap gap-2">
                                                    <button onClick={copyContentPrompt}
                                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-bold transition-all ${copiedPrompt ? 'bg-[#22C55E]/15 border-[#22C55E]/40 text-[#22C55E]' : 'bg-[#4C97D8]/12 border-white/10 text-blue-200 hover:bg-[#4C97D8]/20'}`}>
                                                        {copiedPrompt ? <><CheckCircle size={12} /> ¡Copiado!</> : <><Copy size={12} /> Prompt: Página / Contenido</>}
                                                    </button>
                                                    <button onClick={copyPersonalPrompt}
                                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-bold transition-all ${copiedPersonal ? 'bg-[#22C55E]/15 border-[#22C55E]/40 text-[#22C55E]' : 'bg-[#147e95]/15 border-white/10 text-cyan-200 hover:bg-[#147e95]/25'}`}>
                                                        {copiedPersonal ? <><CheckCircle size={12} /> ¡Copiado!</> : <><Copy size={12} /> Prompt: Marca Personal</>}
                                                    </button>
                                                </div>
                                            </div>
                                            <textarea value={profileDesc} onChange={e => setProfileDesc(e.target.value)} rows={3}
                                                placeholder="Describí tu página: de qué trata, a quién le hablás, tu estilo… (o pegá acá lo que te dio ChatGPT)"
                                                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-white/35 resize-none focus:outline-none focus:border-[#4dfae8]/50 leading-relaxed" />
                                            <div className="flex gap-2">
                                                <button onClick={handleGenerateProfile} disabled={profileGenLoading}
                                                    className="flex-1 px-3 py-2 bg-gradient-to-r from-[#4dfae8] via-[#147e95] to-[#233B8F] text-white font-bold rounded-xl text-xs disabled:opacity-40 flex items-center justify-center gap-2">
                                                    {profileGenLoading ? <><Loader2 size={13} className="animate-spin" /> Armando…</> : <><Sparkles size={13} /> Generar perfil con IA</>}
                                                </button>
                                                {contentProfiles.length > 0 && (
                                                    <button onClick={() => { setProfileFormOpen(false); setProfileDesc('') }} className="px-3 py-2 rounded-xl bg-white/5 text-white/50 text-xs hover:text-white">Cancelar</button>
                                                )}
                                            </div>
                                        </>
                                    ) : (
                                        <div className="space-y-2">
                                            <p className="text-[#22C55E] text-[11px]">✅ ¡Perfil armado! Revisá los datos y tocá <b>Guardar perfil</b> 👇 para poder usarlo al generar imágenes.</p>
                                            {[
                                                { k: 'pageName', label: 'Nombre de la página / negocio' },
                                                { k: 'about', label: 'De qué trata', ta: true },
                                                { k: 'audience', label: 'Audiencia (a quién le hablás)' },
                                                { k: 'tone', label: 'Tono / personalidad (separá con comas)' },
                                                { k: 'contentThemes', label: 'Temas de contenido (comas)' },
                                                { k: 'brandColors', label: 'Colores de marca (comas)' },
                                                { k: 'visualStyle', label: 'Estilo visual (comas)' },
                                                { k: 'contentGoal', label: 'Objetivo del contenido' },
                                            ].map(f => (
                                                <div key={f.k}>
                                                    <label className="text-white/55 text-[10px]">{f.label}</label>
                                                    {f.ta
                                                        ? <textarea value={draft[f.k] || ''} onChange={e => setDraft({ ...draft, [f.k]: e.target.value })} rows={2}
                                                            className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white resize-none focus:outline-none focus:border-[#4dfae8]/50" />
                                                        : <input value={draft[f.k] || ''} onChange={e => setDraft({ ...draft, [f.k]: e.target.value })}
                                                            className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#4dfae8]/50" />}
                                                </div>
                                            ))}
                                            <div className="flex gap-2 pt-1">
                                                <button onClick={handleSaveProfile} disabled={profileSaving}
                                                    className="flex-1 px-3 py-2 bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30 font-bold rounded-xl text-xs disabled:opacity-40 flex items-center justify-center gap-1">
                                                    {profileSaving ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle size={13} />} Guardar perfil
                                                </button>
                                                <button onClick={() => setDraft(null)} className="px-3 py-2 rounded-xl bg-white/5 text-white/50 text-xs hover:text-white">Volver</button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Generar imagen de CONTENIDO — MISMA vista/flujo que Meta Ads, con nuestra estructura */}
                        <div className="dm-card-dark p-4 rounded-2xl border border-white/10 space-y-3">
                            {/* Header */}
                            <p className="text-white text-sm font-bold uppercase tracking-wide text-[13px]">Generar imagen de contenido con IA</p>

                            {/* Estilo: Natural (el recomendado) vs Marca Personal (agencia) */}
                            <div className="flex rounded-xl overflow-hidden border border-white/10">
                                <button type="button" onClick={() => setImgMode('natural')}
                                    className={`flex-1 px-3 py-2 text-xs font-bold transition-all ${imgMode === 'natural' ? 'bg-[#4dfae8]/20 text-white' : 'bg-white/5 text-white/45'}`}>Natural</button>
                                <button type="button" onClick={() => setImgMode('personal')}
                                    className={`flex-1 px-3 py-2 text-xs font-bold transition-all ${imgMode === 'personal' ? 'bg-[#4dfae8]/20 text-white' : 'bg-white/5 text-white/45'}`}>Marca Personal</button>
                            </div>
                            {imgMode === 'personal' && (
                                <p className="text-[10px] text-[#4dfae8]/70 -mt-1">Estilo agencia (glow, paneles flotantes). Subí tus fotos abajo para ser el protagonista. La cara sale parecida, no clon exacto. El texto se pone aparte.</p>
                            )}

                            {/* Estilo + formato */}
                            <div className="flex flex-wrap items-center gap-2">
                                <select value={imgStyle} onChange={e => setImgStyle(e.target.value)}
                                    className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#4dfae8]/50 [&>option]:bg-[#273842]">
                                    <option value="natural">Estilo: Natural</option>
                                    <option value="elegante">Estilo: Elegante</option>
                                    <option value="colorido">Estilo: Colorido</option>
                                    <option value="minimalista">Estilo: Minimalista</option>
                                    <option value="calido">Estilo: Cálido</option>
                                </select>
                                <div className="flex rounded-xl overflow-hidden border border-white/10">
                                    <button type="button" onClick={() => setImgFormat('feed')}
                                        className={`px-3 py-2 text-xs font-medium ${imgFormat === 'feed' ? 'bg-[#4dfae8]/20 text-white' : 'bg-white/5 text-white/50'}`}>Cuadrado</button>
                                    <button type="button" onClick={() => setImgFormat('story')}
                                        className={`px-3 py-2 text-xs font-medium ${imgFormat === 'story' ? 'bg-[#4dfae8]/20 text-white' : 'bg-white/5 text-white/50'}`}>Vertical</button>
                                </div>
                                <div className="flex rounded-xl overflow-hidden border border-white/10">
                                    <button type="button" onClick={() => setImgQuality('alta')}
                                        className={`px-3 py-2 text-xs font-medium ${imgQuality === 'alta' ? 'bg-[#4dfae8]/20 text-white' : 'bg-white/5 text-white/50'}`} title="Mejor calidad (~1-2 min)">Alta</button>
                                    <button type="button" onClick={() => setImgQuality('rapida')}
                                        className={`px-3 py-2 text-xs font-medium ${imgQuality === 'rapida' ? 'bg-[#4dfae8]/20 text-white' : 'bg-white/5 text-white/50'}`} title="Más rápida, sin distorsión (~30-60s)">Rápida</button>
                                </div>
                            </div>

                            {/* Foto de referencia (una sola, opcional) */}
                            <div>
                                <p className="text-[10px] font-bold uppercase mb-1.5 flex items-center gap-1.5"><span className="text-white/30">Foto de referencia</span><span className="text-white/25">· opcional</span></p>
                                {imgRefUrls[0] ? (
                                    <div className="flex flex-col gap-2 p-2.5 rounded-xl border border-[#22C55E]/25 bg-[#22C55E]/5">
                                        <img src={imgRefUrls[0]} alt="referencia" className="w-full max-h-40 rounded-lg object-contain bg-black/20 border border-white/8" />
                                        <div className="flex items-center justify-between">
                                            <div className="min-w-0">
                                                <p className="text-[10px] text-[#22C55E] font-bold">✓ Foto cargada</p>
                                                <p className="text-[9px] text-white/30">La IA la usará como base</p>
                                            </div>
                                            <button onClick={() => setImgRefUrls([])} className="text-white/20 hover:text-[#F87171] text-xs shrink-0 ml-2">✕</button>
                                        </div>
                                    </div>
                                ) : (
                                    <button onClick={() => imgRefFileRef.current?.click()} disabled={imgRefUploading}
                                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-white/15 bg-white/[0.02] hover:bg-white/5 hover:border-white/25 transition-all text-[11px] font-bold text-white/40 disabled:opacity-50">
                                        {imgRefUploading ? <><Loader2 size={12} className="animate-spin" /> Subiendo…</> : <><Image size={12} /> Subir foto de referencia</>}
                                    </button>
                                )}
                                <input ref={imgRefFileRef} type="file" accept="image/*" className="hidden"
                                    onChange={e => { if (e.target.files?.[0]) handleUploadRef(e.target.files[0]); e.currentTarget.value = '' }} />
                            </div>

                            {/* PASO 2: armar prompt + Manual (lado a lado, como Meta Ads) */}
                            <div>
                                <div className="flex items-stretch gap-2">
                                    <button onClick={handleWritePrompt} disabled={imgPromptLoading || !selectedProfileId}
                                        className="flex-1 min-w-0 flex items-center justify-center gap-2 px-3 py-3 rounded-2xl text-[12.5px] font-black text-white leading-tight text-center bg-gradient-to-r from-[#1fb8bb] via-[#147e95] to-[#233B8F] disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90">
                                        {imgPromptLoading ? <Loader2 size={15} className="shrink-0 animate-spin" /> : <Sparkles size={15} className="shrink-0" />}
                                        <span>{imgPromptLoading ? 'Armando…' : 'Armar prompt con nuestra estructura'}</span>
                                    </button>
                                    <button onClick={() => setShowImgManual(v => !v)}
                                        className={`shrink-0 flex items-center gap-1.5 px-3.5 py-3 rounded-2xl text-[12px] font-bold border transition-all ${showImgManual ? 'bg-[#147e95]/25 border-white/10 text-cyan-100' : 'bg-[#147e95]/12 border-white/10 text-cyan-200 hover:bg-[#147e95]/20'}`}>
                                        <FileText size={14} /> <span>Manual</span>
                                    </button>
                                </div>
                                <p className="text-[9px] text-white/35 mt-1.5 leading-snug">Cada post con un <b className="text-[#4dfae8]/90">ángulo de contenido</b> (tip · motivación · detrás de escena · lifestyle).</p>

                                {/* El prompt SOLO aparece (y se ilumina) cuando ya está generado, o en modo Manual */}
                                {(imgPrompt || showImgManual) && (
                                    <textarea value={imgPrompt} onChange={e => setImgPrompt(e.target.value)} rows={3}
                                        placeholder={showImgManual ? 'Escribí tu propio prompt…' : 'El prompt aparece acá…'}
                                        className={`mt-2 w-full bg-white/5 border rounded-xl px-3 py-2 text-xs text-white placeholder-white/35 resize-none focus:outline-none leading-relaxed transition-all ${imgPrompt ? 'border-[#4dfae8]/60 ring-1 ring-[#4dfae8]/25 focus:border-[#4dfae8]' : 'border-white/10 focus:border-[#4dfae8]/50'}`} />
                                )}
                            </div>

                            {/* Ayudas por paso */}
                            {!selectedProfileId && (
                                <p className="text-[10px] text-[#FBBF24]/80 text-center flex items-center justify-center gap-1.5"><FileText size={11} /> Paso 1: elegí (o creá) tu perfil de contenido arriba</p>
                            )}
                            {selectedProfileId && !imgPrompt.trim() && (
                                <p className="text-[10px] text-[#4dfae8]/80 text-center flex items-center justify-center gap-1.5"><Sparkles size={11} /> Paso 2: armá el prompt para continuar</p>
                            )}

                            {/* PASO 3: generar imagen — SOLO aparece cuando el prompt ya está listo (como Meta Ads) */}
                            {imgPrompt.trim() && (
                                <button onClick={handleGenerateImage} disabled={imgLoading}
                                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-black text-sm text-white bg-gradient-to-r from-[#1fb8bb] via-[#147e95] to-[#233B8F] disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90">
                                    {imgLoading ? <><Loader2 size={16} className="animate-spin" /> Creando tu contenido… ({imgQuality === 'alta' ? '~1-2 min' : '~30-60s'})</> : <><Wand2 size={16} /> Generar imagen</>}
                                </button>
                            )}

                            {/* Resultado */}
                            {imgResultUrl && (
                                <div className="rounded-xl border border-[#22C55E]/30 bg-[#22C55E]/5 p-2">
                                    <p className="text-[#22C55E] text-xs font-medium mb-1 flex items-center gap-1"><CheckCircle size={12} /> ¡Imagen generada! Ya quedó en tu post (abajo en Media).</p>
                                    {imgPreviewErr ? (
                                        <a href={imgResultUrl} target="_blank" rel="noreferrer" className="text-[#4dfae8] text-xs underline">No se pudo mostrar la vista previa — abrir imagen</a>
                                    ) : (
                                        <img src={imgResultUrl} onError={() => setImgPreviewErr(true)} alt="imagen generada"
                                            className="w-full rounded-lg object-contain bg-black/20 max-h-72" />
                                    )}
                                </div>
                            )}

                            <p className="text-white/40 text-[11px]">Contenido de valor para tu página. Usa tu saldo o clave de IA.</p>
                        </div>

                        {/* Vista previa del post — SOLO el post de Facebook (sin recuadro alrededor) */}
                        <div className="space-y-2">
                            <p className="text-white/60 text-[11px] font-medium px-1 flex items-center gap-1.5"><Image size={12} className="text-[#4dfae8]" /> Así se va a ver tu post</p>

                            <div className="bg-white rounded-xl overflow-hidden w-full max-w-[420px] mx-auto shadow-[0_2px_14px_rgba(0,0,0,0.28)]">
                                {/* Encabezado */}
                                <div className="flex items-center gap-2.5 px-3 pt-3 pb-1.5">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#4dfae8] to-[#147e95] flex items-center justify-center text-white font-bold text-sm shrink-0">
                                        {previewName.replace('@', '').charAt(0).toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[#1a262f] text-[13px] font-semibold leading-tight truncate">{previewName}</p>
                                        <p className="text-[#65676B] text-[11px] flex items-center gap-1">hace un momento · <span>🌐</span></p>
                                    </div>
                                </div>

                                {/* Texto del post — ÚNICO lugar: escribir, generar, mejorar, negrita, editar, borrar */}
                                <div className="px-3 pb-2.5">
                                    <textarea ref={textareaRef} value={content} onChange={e => setContent(e.target.value)}
                                        rows={content.trim() ? Math.min(16, Math.max(3, content.split('\n').length + 1)) : 3}
                                        placeholder="Escribí tu post acá, o generalo con IA 👇"
                                        className="w-full bg-transparent text-[#1a262f] text-[13px] whitespace-pre-wrap break-words leading-snug resize-none focus:outline-none placeholder:text-[#90949C] placeholder:italic" />
                                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                        <button onClick={handleGenerateTextAI} disabled={aiLoading}
                                            className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold text-white bg-gradient-to-r from-[#1fb8bb] via-[#147e95] to-[#233B8F] disabled:opacity-40 hover:opacity-90">
                                            {aiLoading ? <><Loader2 size={11} className="animate-spin" /> Generando…</> : (content.trim() ? <>🔄 Otra versión</> : <><Sparkles size={11} /> Generar texto con IA</>)}
                                        </button>
                                        {content.trim() && (
                                            <>
                                                <button onClick={() => handleAI('improve')} disabled={aiLoading} className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold text-[#147e95] bg-[#147e95]/10 hover:bg-[#147e95]/20 disabled:opacity-40"><Wand2 size={11} /> Mejorar</button>
                                                <button onClick={insertBold} title="Negrita" className="px-2 py-1 rounded-md text-[11px] font-bold text-[#65676B] bg-black/5 hover:bg-black/10">𝗕</button>
                                                <button onClick={() => setContent('')} title="Borrar" className="px-2 py-1 rounded-md text-[11px] font-semibold text-[#65676B] bg-black/5 hover:bg-black/10"><Trash2 size={11} /></button>
                                            </>
                                        )}
                                        <span className="text-[10px] text-[#90949C] ml-auto">{content.length} car.</span>
                                    </div>
                                </div>

                                {/* Imagen / video */}
                                {mediaUrl ? (
                                    <div className="relative bg-black">
                                        {mediaType === 'video'
                                            ? <video src={mediaUrl} controls className="w-full max-h-80 object-contain bg-black" />
                                            : <img src={mediaUrl} className="w-full max-h-80 object-cover" alt="" />}
                                        <button onClick={() => { setMediaUrl(null); setMediaType(null) }}
                                            className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-red-500/70"><Trash2 size={13} /></button>
                                    </div>
                                ) : (
                                    <button onClick={() => fileRef.current?.click()} disabled={uploadingMedia}
                                        className="w-full h-72 bg-[#E4E6EB] flex flex-col items-center justify-center gap-1.5 text-[#8A8D91] hover:bg-[#DADCE0] transition-colors">
                                        {uploadingMedia ? <Loader2 size={26} className="animate-spin" /> : <>
                                            <div className="flex gap-2 opacity-60"><Image size={26} /><Video size={26} /></div>
                                            <span className="text-[13px] font-semibold">Acá va tu foto</span>
                                            <span className="text-[11px]">Generala con IA arriba, o tocá para subir</span>
                                        </>}
                                    </button>
                                )}

                                {/* Barra de reacciones (decorativa, como Facebook) */}
                                <div className="px-3 pt-2">
                                    <div className="flex items-center justify-between text-[#65676B] text-[11px] pb-1.5">
                                        <span className="flex items-center gap-1"><span className="text-[13px] leading-none">👍❤️😊</span> A ti y a otros</span>
                                        <span>Comentarios · Compartir</span>
                                    </div>
                                    <div className="flex items-center justify-around border-t border-[#CED0D4] py-1 text-[#65676B] text-[12px] font-semibold">
                                        <span>👍 Me gusta</span>
                                        <span>💬 Comentar</span>
                                        <span>↪️ Compartir</span>
                                    </div>
                                </div>
                            </div>

                            <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden"
                                onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0])} />
                        </div>
                    </div>

                    {/* Right: settings */}
                    <div className="space-y-4">
                        {/* Networks */}
                        <div className="dm-card-dark p-4 rounded-2xl border border-white/10">
                            <p className="text-white text-sm font-medium mb-3">Redes sociales</p>
                            <div className="space-y-2">
                                {NETWORKS.map(n => {
                                    const isConnected = networkConnected(n.id)
                                    const isSelected = selectedNetworks.includes(n.id)
                                    const isFB = n.id === 'FACEBOOK'
                                    const isIG = n.id === 'INSTAGRAM'
                                    const igPages = fbPages.filter(p => p.instagram)

                                    return (
                                        <div key={n.id}>
                                            <button disabled={!isConnected}
                                                onClick={() => toggleNetwork(n.id)}
                                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all text-left ${isSelected ? 'border-[#0a95a8]/50 bg-[#0a95a8]/10' : 'border-white/10 bg-white/5'} ${!isConnected ? 'opacity-40 cursor-not-allowed' : 'hover:border-[#0a95a8]/40'}`}>
                                                <span className="text-lg">{n.icon}</span>
                                                <div className="flex-1 min-w-0">
                                                    <span className="text-white text-sm font-medium">{n.label}</span>
                                                    {!isConnected && <p className="text-white/40 text-xs">No conectado</p>}
                                                    {isConnected && !isSelected && <p className="text-[#16A34A] text-xs">Conectado ✓</p>}
                                                    {isConnected && isSelected && (isFB || isIG) && pageSelections[n.id] && (
                                                        <p className="text-[#0a95a8] text-xs truncate">
                                                            {isFB ? pageSelections[n.id].pageName : `@${pageSelections[n.id].username}`}
                                                        </p>
                                                    )}
                                                </div>
                                                {isSelected && <CheckCircle size={14} className="text-[#0a95a8] flex-shrink-0" />}
                                            </button>

                                            {/* Selector de página Facebook */}
                                            {isSelected && isFB && isConnected && (
                                                <div className="mt-1.5 ml-2">
                                                    {fbPagesLoading ? (
                                                        <p className="text-white/55 text-xs px-2 py-1">Cargando páginas...</p>
                                                    ) : fbPagesError ? (
                                                        <p className="text-red-400 text-xs px-2 py-1">⚠ {fbPagesError}</p>
                                                    ) : fbPages.length === 0 ? (
                                                        <p className="text-white/55 text-xs px-2 py-1">No se encontraron páginas de Facebook. Asegúrate de ser admin de alguna Página.</p>
                                                    ) : (
                                                        <select
                                                            value={pageSelections.FACEBOOK?.pageId || ''}
                                                            onChange={e => {
                                                                const page = fbPages.find(p => p.pageId === e.target.value)
                                                                if (page) setPageSelections(prev => ({ ...prev, FACEBOOK: { pageId: page.pageId, pageAccessToken: page.pageAccessToken, pageName: page.pageName } }))
                                                            }}
                                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#0a95a8]/50 [&>option]:bg-[#273842]">
                                                            <option value="">— Selecciona una página —</option>
                                                            {fbPages.map(p => (
                                                                <option key={p.pageId} value={p.pageId}>{p.pageName}</option>
                                                            ))}
                                                        </select>
                                                    )}
                                                </div>
                                            )}

                                            {/* Selector de cuenta Instagram */}
                                            {isSelected && isIG && isConnected && (
                                                <div className="mt-1.5 ml-2">
                                                    {fbPagesLoading ? (
                                                        <p className="text-white/55 text-xs px-2 py-1">Cargando cuentas...</p>
                                                    ) : fbPagesError ? (
                                                        <p className="text-red-400 text-xs px-2 py-1">⚠ {fbPagesError}</p>
                                                    ) : igPages.length === 0 ? (
                                                        <p className="text-amber-400 text-xs px-2 py-1">⚠ No hay cuentas de Instagram Business vinculadas a tus páginas de Facebook</p>
                                                    ) : (
                                                        <select
                                                            value={pageSelections.INSTAGRAM?.accountId || ''}
                                                            onChange={e => {
                                                                const page = igPages.find(p => p.instagram?.accountId === e.target.value)
                                                                if (page) setPageSelections(prev => ({ ...prev, INSTAGRAM: { accountId: page.instagram.accountId, pageAccessToken: page.pageAccessToken, username: page.instagram.username } }))
                                                            }}
                                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#0a95a8]/50 [&>option]:bg-[#273842]">
                                                            <option value="">— Selecciona una cuenta —</option>
                                                            {igPages.map(p => (
                                                                <option key={p.instagram.accountId} value={p.instagram.accountId}>@{p.instagram.username} ({p.pageName})</option>
                                                            ))}
                                                        </select>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Post type */}
                        <div className="dm-card-dark p-4 rounded-2xl border border-white/10">
                            <p className="text-white text-sm font-medium mb-3">Tipo de publicación</p>
                            <div className="grid grid-cols-2 gap-2">
                                <button onClick={() => setPostType('feed')}
                                    className={`py-2 rounded-xl text-sm font-medium border transition-all ${postType === 'feed' ? 'bg-gradient-to-r from-[#1fb8bb] via-[#147e95] to-[#233B8F] text-white border-transparent hover:opacity-90' : 'border-white/10 text-white/55 hover:border-[#0a95a8]/40'}`}>
                                    Feed
                                </button>
                                <button onClick={() => setPostType('story')}
                                    className={`py-2 rounded-xl text-sm font-medium border transition-all ${postType === 'story' ? 'bg-gradient-to-r from-[#1fb8bb] via-[#147e95] to-[#233B8F] text-white border-transparent hover:opacity-90' : 'border-white/10 text-white/55 hover:border-[#0a95a8]/40'}`}>
                                    Story
                                </button>
                            </div>
                        </div>

                        {/* Schedule */}
                        <div className="dm-card-dark p-4 rounded-2xl border border-white/10">
                            <p className="text-white text-sm font-medium mb-3 flex items-center gap-1"><Calendar size={13} /> Programar</p>
                            <input
                                type="datetime-local"
                                value={scheduledAt}
                                min={(() => {
                                    const d = new Date(Date.now() + 5 * 60 * 1000)
                                    return d.toISOString().slice(0, 16)
                                })()}
                                onChange={e => setScheduledAt(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#0a95a8]/50 [color-scheme:dark]" />
                            {scheduledAt && <p className="text-white/55 text-xs mt-1">Se publicará automáticamente</p>}
                        </div>

                        {/* Publish button */}
                        <button onClick={handlePublish} disabled={loading || !content.trim() || !selectedNetworks.length}
                            className="w-full py-3 bg-gradient-to-r from-[#1fb8bb] via-[#147e95] to-[#233B8F] text-white font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-40 hover:opacity-90 transition-all">
                            {loading ? <><Loader2 size={16} className="animate-spin" /> Publicando...</>
                                : scheduledAt ? <><Calendar size={16} /> Programar</> : <><Send size={16} /> Publicar ahora</>}
                        </button>

                        {/* Result */}
                        {publishResult && (
                            <div className="dm-card-dark p-4 rounded-2xl border border-[#0a95a8]/30">
                                <p className="text-[#0a95a8] text-sm font-medium mb-2">
                                    {publishResult.scheduled ? '✅ Programado' : '✅ Publicado'}
                                </p>
                                {publishResult.results?.map((r: any) => (
                                    <div key={r.network} className="flex items-start gap-2 text-xs text-white/55 mt-1 min-w-0">
                                        <span className="flex-shrink-0 mt-0.5">{r.success ? <CheckCircle size={11} className="text-[#0a95a8]" /> : <XCircle size={11} className="text-red-400" />}</span>
                                        <span className="break-words min-w-0">{r.network}: {r.success ? 'OK' : r.error}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* CALENDAR TAB */}
            {tab === 'calendar' && (
                <div className="space-y-3">
                    <p className="text-[#6B7280] text-sm">Posts programados pendientes</p>
                    {posts.length === 0 ? (
                        <div className="dm-card-dark p-8 rounded-2xl border border-white/10 text-center text-white/55">
                            No hay posts programados
                        </div>
                    ) : posts.map(post => (
                        <PostCard key={post.id} post={post} onDelete={handleDeletePost} />
                    ))}
                </div>
            )}

            {/* HISTORY TAB */}
            {tab === 'history' && (
                <div className="space-y-3">
                    {posts.length === 0 ? (
                        <div className="dm-card-dark p-8 rounded-2xl border border-white/10 text-center text-white/55">
                            No hay publicaciones todavía
                        </div>
                    ) : posts.map(post => (
                        <PostCard key={post.id} post={post} onDelete={handleDeletePost} />
                    ))}
                </div>
            )}

            {/* METRICS TAB */}
            {tab === 'metrics' && (
                <MetricsPanel metrics={metrics} onAiAnalyze={() => handleAI('analyze')} aiLoading={aiLoading} />
            )}

            {/* CONNECTIONS TAB */}
            {tab === 'connections' && (
                <ConnectionsPanel connections={connections} onRefresh={loadConnections} />
            )}

            {/* SCRIPT MODAL */}
            {scriptModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) setScriptModal(false) }}>
                    <div className="w-full max-w-lg dm-card-dark border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
                        {/* Modal header */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
                            <h2 className="text-white font-semibold flex items-center gap-2">
                                <FileText size={16} className="text-[#7DD3FC]" /> Guión de video
                            </h2>
                            <button onClick={() => setScriptModal(false)} className="text-white/55 hover:text-white transition-colors text-xl leading-none">&times;</button>
                        </div>
                        {/* Modal body */}
                        <div className="p-5 space-y-4">
                            <div className="flex flex-col sm:flex-row gap-2">
                                <input
                                    value={scriptTopic}
                                    onChange={e => setScriptTopic(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleGenerateScript()}
                                    placeholder="Describe el tema de tu video..."
                                    className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/35 focus:outline-none focus:border-[#0a95a8]/50"
                                />
                                <button onClick={handleGenerateScript} disabled={scriptLoading || !scriptTopic.trim()}
                                    className="px-4 py-2.5 bg-gradient-to-r from-[#1fb8bb] via-[#147e95] to-[#233B8F] text-white font-semibold rounded-xl text-sm disabled:opacity-40 hover:opacity-90 transition-colors whitespace-nowrap w-full sm:w-auto">
                                    {scriptLoading ? <Loader2 size={14} className="animate-spin" /> : 'Generar'}
                                </button>
                            </div>
                            {script ? (
                                <>
                                    <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-white/75 whitespace-pre-wrap max-h-72 overflow-y-auto leading-relaxed">
                                        {script}
                                    </div>
                                    <button
                                        onClick={() => navigator.clipboard.writeText(script)}
                                        className="w-full py-2 rounded-xl border border-white/10 text-white/55 hover:text-white hover:border-[#0a95a8]/40 text-sm transition-colors">
                                        Copiar guión
                                    </button>
                                </>
                            ) : (
                                <p className="text-white/40 text-sm text-center py-6">El guión aparecerá aquí</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
        </div>
    )
}

function PostCard({ post, onDelete }: { post: any; onDelete: (id: string) => void }) {
    const cfg = STATUS_CONFIG[post.status] || STATUS_CONFIG.DRAFT
    const Icon = cfg.icon
    return (
        <div className="dm-card-dark p-4 rounded-2xl border border-white/10">
            <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                    <p className="text-white text-sm line-clamp-2">{post.content}</p>
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                        <span className="flex items-center gap-1 text-xs" style={{ color: cfg.color }}>
                            <Icon size={11} /> {cfg.label}
                        </span>
                        {post.scheduledAt && (
                            <span className="text-white/55 text-xs flex items-center gap-1">
                                <Clock size={10} /> {new Date(post.scheduledAt).toLocaleString('es', { dateStyle: 'short', timeStyle: 'short' })}
                            </span>
                        )}
                        <div className="flex gap-1">
                            {post.networks?.map((n: any) => (
                                <span key={n.id} className={`text-xs px-1.5 py-0.5 rounded-md ${n.status === 'PUBLISHED' ? 'bg-[#0a95a8]/10 text-[#0a95a8]' : n.status === 'FAILED' ? 'bg-red-500/10 text-red-400' : 'bg-white/5 text-white/55'}`}>
                                    {n.network}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
                {post.mediaUrl && (
                    <div className="w-16 h-16 flex-shrink-0 rounded-xl overflow-hidden bg-white/5">
                        {post.mediaType === 'video'
                            ? <video src={post.mediaUrl} className="w-full h-full object-cover" />
                            : <img src={post.mediaUrl} className="w-full h-full object-cover" alt="" />}
                    </div>
                )}
            </div>
            <div className="mt-3 flex justify-end">
                <button onClick={() => onDelete(post.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/55 hover:text-red-400 transition-all">
                    <Trash2 size={13} />
                </button>
            </div>
        </div>
    )
}

function MetricsPanel({ metrics, onAiAnalyze, aiLoading }: { metrics: any; onAiAnalyze: () => void; aiLoading: boolean }) {
    if (!metrics) return (
        <div className="dm-card-dark p-8 rounded-2xl border border-white/10 text-center text-white/55">
            Cargando métricas...
        </div>
    )

    const postStats: Record<string, number> = {}
    for (const s of metrics.postStats || []) postStats[s.status] = s._count.id

    return (
        <div className="space-y-4">
            {/* Post stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                    { label: 'Publicados', value: postStats.PUBLISHED || 0, color: '#0a95a8' },
                    { label: 'Programados', value: postStats.SCHEDULED || 0, color: '#00BFFF' },
                    { label: 'Fallidos', value: postStats.FAILED || 0, color: '#FF4444' },
                    { label: 'Total', value: Object.values(postStats).reduce((a, b) => a + b, 0), color: '#888' },
                ].map(stat => (
                    <div key={stat.label} className="dm-card-dark p-4 rounded-2xl border border-white/10 text-center">
                        <p className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
                        <p className="text-white/55 text-xs mt-1">{stat.label}</p>
                    </div>
                ))}
            </div>

            {/* Platform metrics */}
            {metrics.metrics && Object.entries(metrics.metrics).map(([network, data]: [string, any]) => (
                <div key={network} className="dm-card-dark p-4 rounded-2xl border border-white/10">
                    <h3 className="text-white font-medium mb-3">{network}</h3>
                    {data.error ? (
                        <p className="text-red-400 text-sm">{data.error}</p>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {Object.entries(data).slice(0, 8).map(([k, v]: [string, any]) => (
                                <div key={k} className="bg-white/5 rounded-xl p-3">
                                    <p className="text-white font-bold">{typeof v === 'number' ? v.toLocaleString() : String(v)}</p>
                                    <p className="text-white/55 text-xs mt-0.5">{k}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ))}

            <button onClick={onAiAnalyze} disabled={aiLoading}
                className="w-full py-3 border border-[#0a95a8]/30 rounded-xl text-[#0a95a8] text-sm flex items-center justify-center gap-2 hover:bg-[#0a95a8]/10 disabled:opacity-40">
                {aiLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                Analizar con IA y obtener recomendaciones
            </button>
        </div>
    )
}

function ConnectionsPanel({ connections, onRefresh }: { connections: any[]; onRefresh: () => void }) {
    const [oaiConfig, setOaiConfig] = useState<{ apiKeyMasked: string; model: string; isValid: boolean } | null>(null)
    const [oaiKey, setOaiKey] = useState('')
    const [oaiModel, setOaiModel] = useState('gpt-4o')
    const [oaiLoading, setOaiLoading] = useState(false)
    const [oaiMsg, setOaiMsg] = useState('')

    useEffect(() => {
        fetch('/api/ads/config/openai').then(r => r.json()).then(d => {
            if (d.config) { setOaiConfig(d.config); setOaiModel(d.config.model || 'gpt-4o') }
        })
    }, [])

    async function saveOaiKey() {
        if (!oaiKey.trim()) return
        setOaiLoading(true); setOaiMsg('')
        const res = await fetch('/api/ads/config/openai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ apiKey: oaiKey.trim(), model: oaiModel })
        })
        const data = await res.json()
        setOaiLoading(false)
        if (res.ok) {
            setOaiConfig(data.config)
            setOaiKey('')
            setOaiMsg(data.isValid ? '✓ API Key válida y guardada' : '⚠ Key guardada pero no pudo validarse')
        } else {
            setOaiMsg('Error: ' + data.error)
        }
    }

    async function removeOaiKey() {
        await fetch('/api/ads/config/openai', { method: 'DELETE' })
        setOaiConfig(null); setOaiMsg('')
    }

    async function disconnect(network: string) {
        await fetch('/api/social/connections', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ network })
        })
        onRefresh()
    }

    const connectedMap: Record<string, any> = {}
    for (const c of connections) connectedMap[c.network] = c

    return (
        <div className="space-y-4">
            {/* OpenAI API Key */}
            <div className="dm-card-dark p-4 rounded-2xl border border-white/10">
                <div className="flex items-center gap-2 mb-3">
                    <Sparkles size={15} className="text-[#4dfae8]" />
                    <p className="text-white font-medium text-sm">API Key de OpenAI (IA)</p>
                    {oaiConfig?.isValid && <span className="text-xs text-[#16A34A] bg-[#16A34A]/10 px-2 py-0.5 rounded-full">Activa ✓</span>}
                </div>
                <p className="text-white/55 text-xs mb-3">Necesaria para generar texto, mejorar posts y crear guiones de video con IA.</p>
                {/* Model selector — shared between both states */}
                <div className="mb-3">
                    <label className="text-white/55 text-xs mb-1.5 block">Modelo</label>
                    <select value={oaiModel} onChange={e => setOaiModel(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#0a95a8]/50 [&>option]:bg-[#273842]">
                        <option value="gpt-5.2">GPT-5.2 ⚡ Última generación — ⚠ Mayor costo</option>
                        <option value="gpt-5.1">GPT-5.1 ⭐ Más inteligente — ⚠ Mayor costo</option>
                        <option value="gpt-4.1">GPT-4.1 — Alta calidad — ⚠ Mayor costo</option>
                        <option value="gpt-4.1-mini">GPT-4.1 Mini — Rápido y económico</option>
                        <option value="gpt-4o">GPT-4o — Equilibrado (Recomendado)</option>
                        <option value="gpt-4o-mini">GPT-4o Mini — Muy económico</option>
                    </select>
                    {(oaiModel === 'gpt-5.2' || oaiModel === 'gpt-5.1' || oaiModel === 'gpt-4.1') && (
                        <p className="text-orange-400 text-xs mt-1.5">⚠ Este modelo consume más créditos de OpenAI. Cada llamada puede costar 5–10× más que gpt-4o.</p>
                    )}
                </div>

                {oaiConfig ? (
                    <div className="flex items-center justify-between gap-2 min-w-0">
                        <span className="text-white/78 text-xs sm:text-sm font-mono truncate min-w-0">{oaiConfig.apiKeyMasked}</span>
                        <button onClick={removeOaiKey} className="flex-shrink-0 text-xs text-red-400 hover:text-red-300 px-3 py-1.5 rounded-lg border border-red-500/20 hover:bg-red-500/10">Eliminar</button>
                    </div>
                ) : (
                    <div className="flex flex-col sm:flex-row gap-2">
                        <input value={oaiKey} onChange={e => setOaiKey(e.target.value)}
                            placeholder="sk-proj-..."
                            type="password"
                            className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/35 focus:outline-none focus:border-[#0a95a8]/50" />
                        <button onClick={saveOaiKey} disabled={oaiLoading || !oaiKey.trim()}
                            className="px-3 py-2 bg-gradient-to-r from-[#1fb8bb] via-[#147e95] to-[#233B8F] text-white border border-transparent rounded-xl text-sm disabled:opacity-40 hover:opacity-90 whitespace-nowrap w-full sm:w-auto">
                            {oaiLoading ? <Loader2 size={13} className="animate-spin" /> : 'Guardar'}
                        </button>
                    </div>
                )}
                {oaiMsg && <p className={`text-xs mt-2 ${oaiMsg.startsWith('✓') ? 'text-[#16A34A]' : 'text-amber-400'}`}>{oaiMsg}</p>}
            </div>

            <p className="text-[#6B7280] text-sm">Conecta tus cuentas para publicar desde aquí</p>

            {/* Facebook + Instagram (same OAuth) */}
            <div className="dm-card-dark p-4 rounded-2xl border border-white/10">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <span className="text-2xl flex-shrink-0">📘</span>
                        <div className="min-w-0">
                            <p className="text-white font-medium">Facebook + Instagram</p>
                            {connectedMap.FACEBOOK
                                ? <p className="text-[#16A34A] text-xs truncate">✓ {connectedMap.FACEBOOK.pageName || connectedMap.FACEBOOK.accountName}</p>
                                : <p className="text-white/55 text-xs">No conectado</p>}
                        </div>
                    </div>
                    {connectedMap.FACEBOOK
                        ? <button onClick={() => disconnect('FACEBOOK')} className="flex-shrink-0 text-xs text-red-400 hover:text-red-300 px-3 py-1.5 rounded-lg border border-red-500/20 hover:bg-red-500/10">Desconectar</button>
                        : <a href="/api/social/oauth/facebook" className="flex-shrink-0 text-xs bg-[#0a95a8]/10 text-[#0a95a8] border border-[#0a95a8]/30 px-3 py-1.5 rounded-lg hover:bg-[#0a95a8]/20 flex items-center gap-1"><ExternalLink size={11} /> Conectar</a>}
                </div>
            </div>

            {/* TikTok */}
            <div className="dm-card-dark p-4 rounded-2xl border border-white/10">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <span className="text-2xl flex-shrink-0">🎵</span>
                        <div className="min-w-0">
                            <p className="text-white font-medium">TikTok</p>
                            {connectedMap.TIKTOK
                                ? <p className="text-[#16A34A] text-xs truncate">✓ {connectedMap.TIKTOK.accountName}</p>
                                : <p className="text-white/55 text-xs">No conectado</p>}
                        </div>
                    </div>
                    {connectedMap.TIKTOK
                        ? <button onClick={() => disconnect('TIKTOK')} className="flex-shrink-0 text-xs text-red-400 hover:text-red-300 px-3 py-1.5 rounded-lg border border-red-500/20 hover:bg-red-500/10">Desconectar</button>
                        : <a href="/api/social/oauth/tiktok" className="flex-shrink-0 text-xs bg-[#0a95a8]/10 text-[#0a95a8] border border-[#0a95a8]/30 px-3 py-1.5 rounded-lg hover:bg-[#0a95a8]/20 flex items-center gap-1"><ExternalLink size={11} /> Conectar</a>}
                </div>
            </div>

            {/* YouTube */}
            <div className="dm-card-dark p-4 rounded-2xl border border-white/10">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <span className="text-2xl flex-shrink-0">▶️</span>
                        <div className="min-w-0">
                            <p className="text-white font-medium">YouTube</p>
                            {connectedMap.YOUTUBE
                                ? <p className="text-[#16A34A] text-xs truncate">✓ {connectedMap.YOUTUBE.accountName}</p>
                                : <p className="text-white/55 text-xs">No conectado</p>}
                        </div>
                    </div>
                    {connectedMap.YOUTUBE
                        ? <button onClick={() => disconnect('YOUTUBE')} className="flex-shrink-0 text-xs text-red-400 hover:text-red-300 px-3 py-1.5 rounded-lg border border-red-500/20 hover:bg-red-500/10">Desconectar</button>
                        : <a href="/api/social/oauth/youtube" className="flex-shrink-0 text-xs bg-[#0a95a8]/10 text-[#0a95a8] border border-[#0a95a8]/30 px-3 py-1.5 rounded-lg hover:bg-[#0a95a8]/20 flex items-center gap-1"><ExternalLink size={11} /> Conectar</a>}
                </div>
            </div>
        </div>
    )
}
