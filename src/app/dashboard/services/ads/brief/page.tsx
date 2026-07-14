'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import {
    Mic, Type, Loader2, Sparkles, ArrowLeft, CheckCircle2,
    AlertCircle, Edit3, Save, RefreshCw, Volume2, Square, Plus,
    Trash2, Building2, ChevronRight
} from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import LocationSelector, { COUNTRIES } from '@/components/ads/LocationSelector'
import { AiThinking } from '@/components/ads/AiThinking'
import { AD_CATEGORIES, buildBriefInterviewPrompt } from '@/lib/ads/ad-categories'

interface BriefForm {
    name: string; industry: string; description: string; valueProposition: string
    painPoints: string[]; interests: string[]; brandVoice: string
    brandColors: string[]; visualStyle: string[]; primaryObjective: string
    mainCTA: string; targetLocations: string[]; keyMessages: string[]
    personalityTraits: string[]; contentThemes: string[]; engagementLevel: string
}

interface Brief extends BriefForm { id: string; createdAt: string; updatedAt: string }

const emptyBrief: BriefForm = {
    name: '', industry: '', description: '', valueProposition: '',
    painPoints: [], interests: [], brandVoice: '', brandColors: [],
    visualStyle: [], primaryObjective: 'conversion', mainCTA: 'Comprar ahora',
    targetLocations: [], keyMessages: [], personalityTraits: [],
    contentThemes: [], engagementLevel: 'medio'
}

const Loader = () => (
    <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-[#E4E9F0] border-t-[#B735B8] rounded-full animate-spin" />
    </div>
)

export default function BriefPage() {
    return <Suspense fallback={<Loader />}><BriefPageInner /></Suspense>
}

// Esta página ya no muestra la lista: solo crea (?new=1) o edita (?edit=<id>).
// Sin parámetros → redirige al dashboard (donde está el panel "Mis Negocios").
function BriefPageInner() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const isNew = searchParams.get('new') === '1'
    const editId = searchParams.get('edit')

    const [briefs, setBriefs] = useState<Brief[]>([])
    const [editingBrief, setEditingBrief] = useState<Brief | null>(null)
    const [notFound, setNotFound] = useState(false)

    useEffect(() => {
        fetch('/api/ads/brief').then(r => r.json()).then(d => setBriefs(d.briefs || [])).catch(() => setBriefs([]))
    }, [])

    // Resolver el negocio a editar cuando carguen
    useEffect(() => {
        if (!editId || editingBrief) return
        if (briefs.length === 0) return
        const b = briefs.find(x => x.id === editId)
        if (b) setEditingBrief(b)
        else setNotFound(true)
    }, [editId, briefs, editingBrief])

    // Sin parámetros, o negocio inexistente → volver al dashboard
    useEffect(() => {
        if ((!isNew && !editId) || notFound) router.replace('/dashboard/services/ads/meta')
    }, [isNew, editId, notFound, router])

    const backToDashboard = () => router.push('/dashboard/services/ads/meta')

    if (isNew) return <CreateBriefView onSaved={backToDashboard} onCancel={backToDashboard} />

    if (editId) {
        if (!editingBrief) return <Loader />
        return <EditBriefView brief={editingBrief} onSaved={backToDashboard} onCancel={backToDashboard} />
    }

    return <Loader /> // sin parámetros → redirige
}

// ─── Create Brief View ────────────────────────────────────────────────────────

function CreateBriefView({ onSaved, onCancel }: { onSaved: (b: Brief) => void; onCancel: () => void }) {
    const [inputMode, setInputMode] = useState<'text' | 'audio'>('text')
    const [text, setText] = useState('')
    const [recording, setRecording] = useState(false)
    const [recordingTime, setRecordingTime] = useState(0)
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
    const [transcribing, setTranscribing] = useState(false)
    const [generating, setGenerating] = useState(false)
    const [saving, setSaving] = useState(false)
    const [brief, setBrief] = useState<BriefForm | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [copiedPrompt, setCopiedPrompt] = useState(false)
    // Gate: Meta debe estar conectado (para resolver departamentos por su API de geo)
    const [metaConnected, setMetaConnected] = useState<boolean | null>(null) // null = chequeando
    useEffect(() => {
        fetch('/api/ads/integrations/status')
            .then(r => r.json())
            .then(d => setMetaConnected((d.integrations || []).some((i: any) => i.platform === 'META' && i.status === 'CONNECTED')))
            .catch(() => setMetaConnected(false))
    }, [])

    // Resuelve país (nombre→ISO) + ciudades/departamentos (nombre→key de Meta, filtrado por país).
    // Nunca falla: el país siempre entra; los departamentos que no resuelvan se omiten.
    async function resolveLocations(countries: string[], cities: string[]): Promise<string[]> {
        const locs: string[] = []
        const isoSet: string[] = []
        for (const name of countries || []) {
            const n = name.trim().toLowerCase()
            const c = COUNTRIES.find(c => c.name.toLowerCase() === n || c.code.toLowerCase() === n)
                || COUNTRIES.find(c => c.name.toLowerCase().includes(n) || n.includes(c.name.toLowerCase()))
            if (c && !isoSet.includes(c.code)) { isoSet.push(c.code); locs.push(c.code) }
        }
        for (const city of cities || []) {
            if (!city?.trim()) continue
            try {
                const r = await fetch(`/api/ads/integrations/meta/locations?q=${encodeURIComponent(city.trim())}`)
                const d = await r.json()
                if (!r.ok || !Array.isArray(d.locations) || !d.locations.length) continue
                let matches = d.locations
                if (isoSet.length) {
                    const inCountry = matches.filter((l: any) => isoSet.includes((l.countryCode || '').toUpperCase()))
                    if (inCountry.length) matches = inCountry
                }
                const best = matches.find((l: any) => l.type === 'region') || matches[0]
                if (best?.key) {
                    const val = best.type === 'region' ? `region:${best.key}:${best.name}` : `city:${best.key}:${best.name}`
                    if (!locs.includes(val)) locs.push(val)
                }
            } catch { /* se omite — el país queda */ }
        }
        return locs
    }

    async function copyChatGptPrompt() {
        try {
            await navigator.clipboard.writeText(buildBriefInterviewPrompt())
            setCopiedPrompt(true)
            setTimeout(() => setCopiedPrompt(false), 2500)
        } catch { setError('No se pudo copiar. Copiá el texto manualmente.') }
    }
    // Ubicación elegida por el usuario (formato válido de Meta) — manda sobre lo que invente la IA
    const [selectedLocations, setSelectedLocations] = useState<string[]>([])
    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const chunksRef = useRef<Blob[]>([])
    const timerRef = useRef<NodeJS.Timeout | null>(null)

    useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current) }, [])

    async function startRecording() {
        setError(null)
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            chunksRef.current = []
            const mr = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4' })
            mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
            mr.onstop = () => { setAudioBlob(new Blob(chunksRef.current, { type: mr.mimeType })); stream.getTracks().forEach(t => t.stop()) }
            mr.start(250)
            mediaRecorderRef.current = mr
            setRecording(true); setRecordingTime(0)
            timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000)
        } catch { setError('No se pudo acceder al micrófono.') }
    }

    function stopRecording() {
        if (mediaRecorderRef.current?.state !== 'inactive') mediaRecorderRef.current?.stop()
        if (timerRef.current) clearInterval(timerRef.current)
        setRecording(false)
    }

    async function transcribeAudio() {
        if (!audioBlob) return
        setTranscribing(true); setError(null)
        try {
            const fd = new FormData()
            fd.append('audio', audioBlob, 'recording.webm')
            const res = await fetch('/api/ads/brief/transcribe', { method: 'POST', body: fd })
            const data = await res.json()
            if (!res.ok) return setError(data.error || 'Error al transcribir')
            setText(data.text); setInputMode('text')
        } catch { setError('Error de conexión') } finally { setTranscribing(false) }
    }

    async function generateBrief() {
        if (metaConnected === false) return setError('Conectá tu cuenta de Meta antes de generar el negocio (se usa para detectar tus ciudades/departamentos).')
        if (text.trim().length < 80) return setError('Escribe al menos 80 caracteres. Cubrí los 5 puntos de la guía para un mejor resultado.')
        setGenerating(true); setError(null)
        try {
            // La IA detecta la categoría sola — no se manda category.
            const res = await fetch('/api/ads/brief/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: text.trim() }) })
            const data = await res.json()
            if (!res.ok) return setError(data.error || 'Error al generar brief')
            // Resolver ubicaciones detectadas por la IA: país (ISO, siempre) + departamentos
            // (key de Meta, best-effort). Se combinan con lo que el usuario haya elegido a mano.
            const detected = await resolveLocations(data.brief.targetCountries || [], data.brief.targetCities || [])
            const locs = Array.from(new Set([...selectedLocations, ...detected]))
            setSelectedLocations(locs)
            setBrief({ ...emptyBrief, ...data.brief, targetLocations: locs })
        } catch { setError('Error de conexión') } finally { setGenerating(false) }
    }

    async function saveBrief() {
        if (!brief) return
        setSaving(true); setError(null)
        try {
            const res = await fetch('/api/ads/brief', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(brief) })
            const data = await res.json()
            if (!res.ok) return setError(data.error || 'Error al guardar')
            onSaved(data.brief)
        } catch { setError('Error de conexión') } finally { setSaving(false) }
    }

    const fmtTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`

    return (
        <div className="px-4 md:px-6 xl:px-10 pt-6 max-w-screen-xl 2xl:max-w-screen-2xl mx-auto pb-24 text-white" style={{ background: 'radial-gradient(120% 55% at 50% -5%, rgba(183,53,184,0.12), rgba(255,255,255,0) 55%), radial-gradient(90% 55% at 100% 108%, rgba(106,53,217,0.10), rgba(255,255,255,0) 60%), linear-gradient(180deg, #081624 0%, #050B14 100%)', minHeight: 'calc(100vh - 2rem)', borderRadius: 24, border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 30px 60px -30px rgba(8,22,36,0.5)' }}>
            <div className="flex items-center gap-4 mb-8">
                <button onClick={onCancel} className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all">
                    <ArrowLeft size={16} />
                </button>
                <div>
                    <h1 className="text-xl font-black uppercase tracking-tighter">Nuevo Negocio</h1>
                    <p className="text-xs text-white/30">Describe tu negocio y la IA generará el perfil</p>
                </div>
            </div>

            {error && (
                <div className="mb-5 p-4 bg-[#F87171]/10 border border-[#F87171]/20 rounded-2xl flex gap-3 text-[#F87171] text-sm">
                    <AlertCircle size={16} className="shrink-0 mt-0.5" /><p className="flex-1">{error}</p>
                    <button onClick={() => setError(null)} className="font-bold text-xs">✕</button>
                </div>
            )}

            {!brief ? (
                <>
                    {/* PASO 1 — Categoría del negocio (arriba de todo, obligatoria) */}
                    <p className="text-[11px] font-bold text-[#B735B8] mb-2.5 flex items-center gap-1.5">
                        <Sparkles size={12} /> Describí tu negocio
                        <span className="text-white/25 font-normal">— la IA detecta el rubro automáticamente</span>
                    </p>

                    {/* Ayuda: prompt para ChatGPT (adaptado a la categoría elegida) */}
                    <div className="mb-5 p-3.5 rounded-2xl" style={{ background: 'rgba(35,59,143,0.06)', border: '1px solid rgba(35,59,143,0.18)' }}>
                        <p className="text-[11px] font-bold text-[#4C97D8] mb-1 flex items-center gap-1.5">
                            🤖 ¿No sabés qué escribir? Usá tu ChatGPT
                        </p>
                        <p className="text-[10px] text-white/45 leading-relaxed mb-2.5">
                            Copiá este prompt, pegalo en tu ChatGPT y respondé las preguntas (ChatGPT detecta tu rubro y pregunta lo relevante). Al final te dará un texto completo — pegalo abajo y generá el brief.
                        </p>
                        <button onClick={copyChatGptPrompt}
                            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-[11px] font-bold transition-all ${copiedPrompt ? 'bg-[#22C55E]/15 border-[#22C55E]/40 text-[#22C55E]' : 'bg-[#4C97D8]/12 border-white/10 text-blue-200 hover:bg-[#4C97D8]/20'}`}>
                            {copiedPrompt ? <><CheckCircle2 size={13} /> ¡Copiado! Pegalo en ChatGPT</> : <><Type size={13} /> Copiar prompt para ChatGPT</>}
                        </button>
                    </div>

                    <div className="flex gap-2 mb-6 bg-white/5 p-1 rounded-2xl border border-white/8">
                        {(['text', 'audio'] as const).map(mode => (
                            <button key={mode} onClick={() => setInputMode(mode)}
                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${inputMode === mode ? 'bg-white text-black' : 'text-white/40 hover:text-white/70'}`}>
                                {mode === 'text' ? <><Type size={15} /> Escribir</> : <><Mic size={15} /> Grabar</>}
                            </button>
                        ))}
                    </div>

                    {inputMode === 'text' && (
                        <div className="space-y-4">
                            <textarea value={text} onChange={e => setText(e.target.value)} rows={9}
                                placeholder="Pegá acá la descripción de tu negocio. ¿No sabés qué escribir? Copiá el prompt de ChatGPT (botón de arriba), respondé sus preguntas y pegá el resultado. Cuanto más completo, mejor el brief (incluí: qué vendés, a quién, qué problema resolvés, beneficios, diferencial, objetivo, país y ciudades)."
                                className="w-full bg-[#0B1B2B] border border-white/20 rounded-2xl px-4 py-3 text-sm text-white resize-none focus:outline-none focus:border-white/10 placeholder:text-white/25 leading-relaxed" />
                            <div className="flex items-center justify-between -mt-1">
                                <span className={`text-[11px] font-bold ${text.trim().length >= 80 ? 'text-[#22C55E]' : 'text-white/30'}`}>
                                    {text.trim().length >= 80 ? '✓ Buen detalle' : `${text.trim().length}/80 — agregá más detalle`}
                                </span>
                            </div>

                            {/* La ubicación la DETECTA la IA de tu descripción y la podés ajustar en el resultado. */}

                            {/* Gate: Meta debe estar conectado */}
                            {metaConnected === false && (
                                <div className="p-3.5 rounded-2xl flex items-center gap-3" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}>
                                    <AlertCircle size={16} className="text-[#FBBF24] shrink-0" />
                                    <p className="flex-1 text-[11px] text-amber-200/90">Conectá tu cuenta de <b>Meta</b> para generar el negocio (se usa para detectar tus ciudades/departamentos).</p>
                                    <Link href="/dashboard/services/ads/meta" className="text-[11px] font-bold text-[#FBBF24] hover:text-amber-200 whitespace-nowrap">Conectar →</Link>
                                </div>
                            )}

                            {generating ? (
                                <AiThinking messages={[
                                    'Detectando tu rubro…',
                                    'Analizando tu negocio…',
                                    'Buscando tus ciudades y departamentos…',
                                    'Armando tu perfil de marca…',
                                    'Definiendo tu audiencia ideal…',
                                    'Casi listo…',
                                ]} />
                            ) : (
                                <button onClick={generateBrief} disabled={text.trim().length < 80 || metaConnected === false}
                                    className="btn-ai-glass w-full flex items-center justify-center gap-2 text-white font-black py-4 rounded-2xl disabled:opacity-50 transition-all">
                                    <Sparkles size={18} /> Generar Brief con IA
                                </button>
                            )}
                        </div>
                    )}

                    {inputMode === 'audio' && (
                        <div className="text-center py-8">
                            {!audioBlob ? (
                                <div className="flex flex-col items-center gap-6">
                                    <button onClick={recording ? stopRecording : startRecording}
                                        className={`relative w-28 h-28 rounded-full flex items-center justify-center transition-all ${recording ? 'bg-[#F87171] shadow-[0_0_60px_rgba(239,68,68,0.5)]' : 'bg-[#B735B8] shadow-[0_0_60px_rgba(183,53,184,0.4)]'}`}>
                                        {recording && <span className="absolute inset-0 rounded-full bg-[#F87171] animate-ping opacity-25" />}
                                        {recording ? <Square size={32} className="text-white" /> : <Mic size={32} className="text-white" />}
                                    </button>
                                    {recording && <p className="text-4xl font-black font-mono text-[#F87171]">{fmtTime(recordingTime)}</p>}
                                    {!recording && <p className="text-sm text-white/40">Toca para grabar</p>}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-4">
                                    <div className="w-20 h-20 rounded-full bg-[#22C55E]/20 border-2 border-[#22C55E]/40 flex items-center justify-center">
                                        <Volume2 size={32} className="text-[#22C55E]" />
                                    </div>
                                    <p className="text-sm text-white/60">Audio ({fmtTime(recordingTime)})</p>
                                    <div className="flex gap-3">
                                        <button onClick={() => { setAudioBlob(null); setRecordingTime(0) }} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm font-bold hover:bg-white/10 transition-all flex items-center gap-2">
                                            <RefreshCw size={14} /> Volver a grabar
                                        </button>
                                        <button onClick={transcribeAudio} disabled={transcribing} className="px-6 py-2 rounded-xl bg-[#B735B8] text-white text-sm font-bold hover:bg-[#B735B8] disabled:opacity-50 transition-all flex items-center gap-2">
                                            {transcribing ? <><Loader2 size={14} className="animate-spin" /> Transcribiendo...</> : <><Sparkles size={14} /> Transcribir</>}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </>
            ) : (
                <div className="space-y-4">
                    <div className="p-4 bg-[#22C55E]/10 border border-[#22C55E]/20 rounded-2xl flex items-center gap-3">
                        <CheckCircle2 size={18} className="text-[#22C55E] shrink-0" />
                        <div>
                            <p className="text-sm font-bold text-[#22C55E]">{brief.name} · {brief.industry}</p>
                            <p className="text-xs text-[#22C55E]/60 mt-0.5">Brief generado. Puedes editarlo antes de guardar.</p>
                        </div>
                        <button onClick={() => setBrief(null)} className="ml-auto text-xs font-bold text-white/30 hover:text-white/60 transition-all">Descartar</button>
                    </div>

                    {/* Lo nuevo que generó la IA según la categoría (orientado a los anuncios) */}
                    {(() => { const b = brief as any; const cat = AD_CATEGORIES.find(c => c.id === b.category); return (
                        <div className="p-4 rounded-2xl space-y-3" style={{ background: 'rgba(183,53,184,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
                            <p className="text-[11px] font-bold text-[#B735B8] flex items-center gap-1.5">
                                <Sparkles size={12} /> Enfoque del anuncio {cat && <span className="text-white/30 font-normal">· {cat.emoji} {cat.label}</span>}
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                                {Array.isArray(b.benefits) && b.benefits.length > 0 && (
                                    <div><p className="text-white/30 font-bold uppercase mb-1">Beneficios</p><ul className="space-y-0.5">{b.benefits.map((x: string, i: number) => <li key={i} className="text-white/60 flex gap-1.5"><span className="text-[#B735B8]">✓</span>{x}</li>)}</ul></div>
                                )}
                                {Array.isArray(b.adConcepts) && b.adConcepts.length > 0 && (
                                    <div><p className="text-white/30 font-bold uppercase mb-1">Conceptos visuales</p><ul className="space-y-0.5">{b.adConcepts.map((x: string, i: number) => <li key={i} className="text-white/60 flex gap-1.5"><span className="text-[#4C97D8]">▸</span>{x}</li>)}</ul></div>
                                )}
                                {b.transformation && <div className="sm:col-span-2"><p className="text-white/30 font-bold uppercase mb-1">Transformación (antes→después)</p><p className="text-white/60">{b.transformation}</p></div>}
                                {b.targetCustomer && <div><p className="text-white/30 font-bold uppercase mb-1">Cliente ideal</p><p className="text-white/60">{b.targetCustomer}</p></div>}
                                <div className="flex gap-4">
                                    {b.positioning && <div><p className="text-white/30 font-bold uppercase mb-1">Posicionamiento</p><p className="text-white/60 capitalize">{b.positioning}</p></div>}
                                    {b.emotion && <div><p className="text-white/30 font-bold uppercase mb-1">Emoción</p><p className="text-white/60">{b.emotion}</p></div>}
                                </div>
                                {b.categoryData && Object.keys(b.categoryData).length > 0 && (
                                    <div className="sm:col-span-2"><p className="text-white/30 font-bold uppercase mb-1">Datos del rubro</p><div className="flex flex-wrap gap-1.5">{Object.entries(b.categoryData).map(([k, v]) => v ? <span key={k} className="px-2 py-0.5 rounded-lg bg-white/5 border border-white/8 text-white/55">{String(v)}</span> : null)}</div></div>
                                )}
                            </div>
                        </div>
                    )})()}

                    <EditBriefForm brief={brief} onChange={setBrief} />

                    <div className="flex gap-3 pt-2">
                        <button onClick={onCancel} className="flex-1 py-3 rounded-2xl bg-white/5 border border-white/10 text-sm font-bold hover:bg-white/10 transition-all">
                            Cancelar
                        </button>
                        <button onClick={saveBrief} disabled={saving} className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-[#FF2D95] via-[#B735B8] to-[#233B8F] text-white text-sm font-bold hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                            {saving ? <><Loader2 size={16} className="animate-spin" /> Guardando...</> : <><Save size={16} /> Guardar Negocio</>}
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

// ─── Edit Brief View ──────────────────────────────────────────────────────────

function EditBriefView({ brief, onSaved, onCancel }: { brief: Brief; onSaved: (b: Brief) => void; onCancel: () => void }) {
    const [form, setForm] = useState<BriefForm>(brief)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    async function save() {
        setSaving(true); setError(null)
        try {
            const res = await fetch('/api/ads/brief', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: brief.id, ...form }) })
            const data = await res.json()
            if (!res.ok) return setError(data.error || 'Error al guardar')
            onSaved(data.brief)
        } catch { setError('Error de conexión') } finally { setSaving(false) }
    }

    return (
        <div className="px-4 md:px-6 xl:px-10 pt-6 max-w-screen-xl 2xl:max-w-screen-2xl mx-auto pb-24 text-white">
            <div className="flex items-center gap-4 mb-8">
                <button onClick={onCancel} className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all">
                    <ArrowLeft size={16} />
                </button>
                <div>
                    <h1 className="text-xl font-black uppercase tracking-tighter">Editar Negocio</h1>
                    <p className="text-xs text-white/30">{brief.name}</p>
                </div>
            </div>
            {error && (
                <div className="mb-5 p-4 bg-[#F87171]/10 border border-[#F87171]/20 rounded-2xl flex gap-3 text-[#F87171] text-sm">
                    <AlertCircle size={16} className="shrink-0 mt-0.5" /><p className="flex-1">{error}</p>
                    <button onClick={() => setError(null)} className="font-bold text-xs">✕</button>
                </div>
            )}
            <EditBriefForm brief={form} onChange={setForm} />
            <div className="flex gap-3 mt-6">
                <button onClick={onCancel} className="flex-1 py-3 rounded-2xl bg-white/5 border border-white/10 text-sm font-bold hover:bg-white/10 transition-all">Cancelar</button>
                <button onClick={save} disabled={saving} className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-[#FF2D95] via-[#B735B8] to-[#233B8F] text-white text-sm font-bold hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                    {saving ? <><Loader2 size={16} className="animate-spin" /> Guardando...</> : <><Save size={16} /> Guardar Cambios</>}
                </button>
            </div>
        </div>
    )
}

// ─── Shared form component ────────────────────────────────────────────────────

function EditBriefForm({ brief, onChange }: { brief: BriefForm; onChange: (b: BriefForm) => void }) {
    const field = (key: keyof BriefForm) => ({
        value: brief[key] as string,
        onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
            onChange({ ...brief, [key]: e.target.value })
    })

    return (
        <div className="space-y-5">
            <Section title="Información del Negocio">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InputField label="Nombre" {...field('name')} />
                    <InputField label="Industria" {...field('industry')} />
                    <div className="md:col-span-2"><TextareaField label="Descripción" {...field('description')} /></div>
                    <div className="md:col-span-2"><TextareaField label="Propuesta de Valor" {...field('valueProposition')} /></div>
                </div>
            </Section>

            <Section title="Audiencia">
                <TagList label="Puntos de Dolor" items={brief.painPoints} onChange={v => onChange({ ...brief, painPoints: v })} placeholder="Ej: Dificultad para bajar de peso..." />
                <TagList label="Intereses" items={brief.interests} onChange={v => onChange({ ...brief, interests: v })} placeholder="Ej: Salud y bienestar..." />
                <div>
                    <label className="text-xs font-bold text-white/40 uppercase tracking-widest block mb-2">Ubicaciones <span className="text-[#B735B8]/60 font-normal lowercase">· detectadas por IA, podés ajustarlas</span></label>
                    <LocationSelector selected={brief.targetLocations || []} onChange={v => onChange({ ...brief, targetLocations: v })} platform="meta" />
                </div>
            </Section>

            <Section title="Identidad de Marca">
                <InputField label="Voz de Marca" {...field('brandVoice')} />
                <TagList label="Estilo Visual" items={brief.visualStyle} onChange={v => onChange({ ...brief, visualStyle: v })} placeholder="Ej: minimalista, moderno..." />
                <TagList label="Rasgos de Personalidad" items={brief.personalityTraits} onChange={v => onChange({ ...brief, personalityTraits: v })} placeholder="Ej: Confiable, Cercano..." />
                <TagList label="Mensajes Clave" items={brief.keyMessages} onChange={v => onChange({ ...brief, keyMessages: v })} placeholder="Ej: Recupera tu bienestar..." />
            </Section>

            {((brief as any).category || (brief as any).benefits || (brief as any).adConcepts) && (
                <Section title="Enfoque del Anuncio (IA)">
                    <div>
                        <label className="text-xs font-bold text-white/40 uppercase tracking-widest block mb-2">Categoría <span className="text-[#B735B8]/60 font-normal lowercase">· detectada por IA, podés cambiarla</span></label>
                        <select value={(brief as any).category || 'otro'} onChange={e => onChange({ ...brief, category: e.target.value } as any)} className="w-full bg-[#0B1B2B] border border-white/20 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-white/10 [&>option]:bg-[#0B1B2B]">
                            {AD_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
                        </select>
                    </div>
                    <TagList label="Beneficios" items={(brief as any).benefits || []} onChange={v => onChange({ ...brief, benefits: v } as any)} placeholder="Ej: Alivio inmediato de ojos secos..." />
                    <TagList label="Conceptos de Anuncio" items={(brief as any).adConcepts || []} onChange={v => onChange({ ...brief, adConcepts: v } as any)} placeholder="Ej: Antes/después, persona usando..." />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2"><TextareaField label="Transformación (antes → después)" value={(brief as any).transformation || ''} onChange={(e: any) => onChange({ ...brief, transformation: e.target.value } as any)} /></div>
                        <div className="md:col-span-2"><TextareaField label="Cliente Ideal" value={(brief as any).targetCustomer || ''} onChange={(e: any) => onChange({ ...brief, targetCustomer: e.target.value } as any)} /></div>
                        <div className="md:col-span-2 grid grid-cols-3 gap-3">
                            <div>
                                <label className="text-xs font-bold text-white/40 uppercase tracking-widest block mb-2">Edad mín.</label>
                                <input type="number" min={18} max={65} value={(brief as any).targetAgeMin ?? ''} onChange={e => onChange({ ...brief, targetAgeMin: e.target.value ? Number(e.target.value) : undefined } as any)}
                                    placeholder="18" className="w-full bg-[#0B1B2B] border border-white/20 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-white/10" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-white/40 uppercase tracking-widest block mb-2">Edad máx.</label>
                                <input type="number" min={18} max={65} value={(brief as any).targetAgeMax ?? ''} onChange={e => onChange({ ...brief, targetAgeMax: e.target.value ? Number(e.target.value) : undefined } as any)}
                                    placeholder="65" className="w-full bg-[#0B1B2B] border border-white/20 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-white/10" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-white/40 uppercase tracking-widest block mb-2">Género</label>
                                <select value={(brief as any).targetGender || 'all'} onChange={e => onChange({ ...brief, targetGender: e.target.value } as any)} className="w-full bg-[#0B1B2B] border border-white/20 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-white/10 [&>option]:bg-[#0B1B2B]">
                                    <option value="all">Todos</option>
                                    <option value="male">Hombres</option>
                                    <option value="female">Mujeres</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-white/40 uppercase tracking-widest block mb-2">Posicionamiento</label>
                            <select value={(brief as any).positioning || ''} onChange={e => onChange({ ...brief, positioning: e.target.value } as any)} className="w-full bg-[#0B1B2B] border border-white/20 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-white/10 [&>option]:bg-[#0B1B2B]">
                                <option value="">—</option>
                                <option value="premium">Premium</option>
                                <option value="medio">Medio</option>
                                <option value="económico">Económico</option>
                            </select>
                        </div>
                        <div className="md:col-span-2"><InputField label="Emoción" value={(brief as any).emotion || ''} onChange={(e: any) => onChange({ ...brief, emotion: e.target.value } as any)} placeholder="Ej: alivio, confianza" /></div>
                    </div>
                    {(brief as any).categoryData && Object.keys((brief as any).categoryData).length > 0 && (
                        <div>
                            <label className="text-xs font-bold text-white/40 uppercase tracking-widest block mb-2">Datos del Rubro</label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {Object.entries((brief as any).categoryData).map(([k, v]) => (
                                    <InputField key={k} label={k} value={(v as string) || ''} onChange={(e: any) => onChange({ ...brief, categoryData: { ...(brief as any).categoryData, [k]: e.target.value } } as any)} />
                                ))}
                            </div>
                        </div>
                    )}
                </Section>
            )}

            <Section title="Estrategia">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs font-bold text-white/40 uppercase tracking-widest block mb-2">Objetivo Principal</label>
                        <select {...field('primaryObjective')} className="w-full bg-[#0B1B2B] border border-white/20 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-white/10 [&>option]:bg-[#0B1B2B]">
                            <option value="conversion">Conversión / Ventas</option>
                            <option value="leads">Generación de Leads</option>
                            <option value="traffic">Tráfico al sitio</option>
                            <option value="awareness">Conciencia de marca</option>
                        </select>
                    </div>
                    <InputField label="CTA Principal" {...field('mainCTA')} placeholder="Ej: Comprar ahora" />
                </div>
            </Section>
        </div>
    )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="bg-dark-900/40 border border-white/8 rounded-2xl p-5 space-y-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">{title}</p>
            {children}
        </div>
    )
}

function TagList({ label, items, onChange, placeholder }: { label: string; items: string[]; onChange: (v: string[]) => void; placeholder: string }) {
    const [input, setInput] = useState('')
    const add = () => { const v = input.trim(); if (v && !items.includes(v)) onChange([...items, v]); setInput('') }
    return (
        <div>
            <label className="text-xs font-bold text-white/40 uppercase tracking-widest block mb-2">{label}</label>
            <div className="flex flex-wrap gap-2 mb-2">
                {items.map((item, i) => (
                    <span key={i} className="flex items-center gap-1.5 text-xs bg-[#B735B8]/10 border border-white/10 text-[#B735B8] px-3 py-1.5 rounded-full font-medium">
                        {item}
                        <button onClick={() => onChange(items.filter((_, j) => j !== i))} className="text-[#B735B8] hover:text-[#F87171]">×</button>
                    </span>
                ))}
            </div>
            <div className="flex gap-2">
                <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), add())}
                    placeholder={placeholder} className="flex-1 bg-[#0B1B2B] border border-white/20 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-white/10 placeholder:text-white/30" />
                <button onClick={add} className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-bold hover:bg-[#B735B8]/20 transition-all">+ Agregar</button>
            </div>
        </div>
    )
}

function InputField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: any; placeholder?: string }) {
    return (
        <div>
            <label className="text-xs font-bold text-white/40 uppercase tracking-widest block mb-2">{label}</label>
            <input value={value} onChange={onChange} placeholder={placeholder} className="w-full bg-[#0B1B2B] border border-white/20 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-white/10 placeholder:text-white/30" />
        </div>
    )
}

function TextareaField({ label, value, onChange }: { label: string; value: string; onChange: any }) {
    return (
        <div>
            <label className="text-xs font-bold text-white/40 uppercase tracking-widest block mb-2">{label}</label>
            <textarea value={value} onChange={onChange} rows={3} className="w-full bg-[#0B1B2B] border border-white/20 rounded-xl px-3 py-2.5 text-sm text-white resize-none focus:outline-none focus:border-white/10 leading-relaxed" />
        </div>
    )
}
